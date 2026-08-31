# CLAUDE.md — PlanR

---

## Panoramica del progetto

**PlanR** — applicazione web per il Resource Planning della BU Documentale & SAP. Sostituisce il Google Sheet del Resource Plan con uno strumento dedicato che automatizza il calcolo della saturazione, integra dati da Jira e Factorial, e offre dashboard operative e strategiche per il Demand & Resource Manager e il BU Manager.

**Stato:** POC / MVP (pilota luglio-settembre 2026).

**Documento di riferimento:** [[BU_Documentale_SAP_Demand_Resource_Management_Draft]] (Draft v3, 6 luglio 2026).

## Stack tecnologico

| Livello | Tecnologia |
|---|---|
| Framework | Next.js 15+ (App Router) |
| Linguaggio | TypeScript (strict mode) |
| ORM | Prisma 6+ |
| Database | PostgreSQL serverless (Vercel Postgres / Neon) |
| Auth | Auth.js v5 (Google OAuth — dominio aziendale) |
| Hosting | Vercel |
| UI Components | MUI (Material UI) v6+ con MUI X DataGrid e MUI X Charts |
| Styling | Emotion (integrato MUI) — tema centralizzato con design tokens SiMaggioli |
| Validazione | Zod |
| Integrazioni | Jira REST API v3, Import CSV Factorial (Papa Parse) |
| Analytics | PostHog |
| Repository | GitHub |

## Modello di dominio

Il glossario completo del dominio e in `CONTEXT.md`. Qui i vincoli che impattano le decisioni di codice:

### Relazioni N:N
- **Applicativo <-> Contratto** — un applicativo puo essere coperto da piu contratti e viceversa
- **Applicativo <-> Risorsa (PM)** — un applicativo ha uno o piu PM assegnati

### Campi calcolati / derivati
- **Capacita allocabile settimanale** = Ore settimanali - Buffer effettivo - Ore assenza
- **Saturazione %** = (Ore allocate / Capacita allocabile) x 100
- **Effort effettivo** = Effort allocato GG x Coefficiente produttivita risorsa
- **Costo previsto iniziativa** = somma(Effort allocato x Costo giornata) per ogni allocazione
- **Data inizio pianificata** = Data fine desiderata - Effort pianificato (con buffer per taglia)
- **Profilo di competenza** = distribuzione % effort completato per applicativo/modulo (vista calcolata, non persistente)
- **Effort PM automatico** = Stima GG x % effort PM del contratto, ripartito equamente tra i PM dell'applicativo

### Regole di integrita oltre il DB
- Eliminazione con integrita referenziale: bloccare con 409 se dipendenze attive
- Soft lock e hard lock occupano entrambi capacita nella saturazione
- Parametri risorsa temporalizzati: non retroattivi, i calcoli storici restano ancorati ai valori vigenti nel periodo
- Buffer ore settimanali: override per risorsa prevale sul default globale (Configurazione BU)
- Vincolo durata contrattuale: allocazione.data_fine <= contratto.data_fine (blocco, non warning)
- Sovra-allocazione: warning ma non blocco — il D&R Manager puo confermare

### Enum con significato di business
- **Iniziativa.status:** In Attesa di Allocazione, Allocato, In Lavorazione, Completato, Ready - Pending Resources, In Attesa di Copertura Contrattuale, Fuori Scope
- **Iniziativa.tipologia:** MEV, MAD
- **Iniziativa.priorita:** Alta, Media, Bassa
- **Iniziativa.taglia_sizing:** XS, S, M, L, XL
- **Iniziativa.valore_economico:** <5K, 5-10K, 10-15K, 15-20K, 20-30K, 30-40K, >40K
- **Risorsa.ruolo:** FE, BE, Analista, Tech Lead, Architetto, PM, BA Senior, Altro
- **Risorsa.livello:** Junior, Mid, Senior
- **Risorsa.tipologia:** Interna, Esterna
- **Risorsa.appartenenza:** BU Documentale, Engineering Excellence
- **Risorsa.pool:** Manutenzione, Evolutiva/Adeguativa
- **Contratto.tipo:** Subappalto, Appalto
- **Allocazione.tipo_lock:** Soft, Hard
- **Assenza.tipo:** Ferie, Malattia, Permesso, Altro

## Struttura del repository

```
/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Gruppo route autenticazione
│   │   ├── dashboard/             # Dashboard BU Manager e D&R Manager
│   │   ├── risorse/               # Gestione risorse e parametri
│   │   ├── iniziative/            # Gestione iniziative
│   │   ├── applicativi/           # Gestione applicativi e contratti
│   │   ├── resource-plan/         # Vista pivot (cuore dell'app)
│   │   ├── import/                # Import assenze Factorial
│   │   ├── api/                   # Route Handlers (Jira sync, CRUD)
│   │   ├── layout.tsx             # Layout root
│   │   ├── page.tsx               # Pagina principale
│   │   └── providers.tsx          # Client providers (SessionProvider, MUI ThemeProvider)
│   ├── components/                # Componenti React riutilizzabili
│   │   ├── ui/                    # Componenti UI base (wrapper MUI)
│   │   ├── resource-plan/         # Componenti vista pivot
│   │   └── dashboard/             # Widget dashboard
│   ├── lib/                       # Utility e logica di business
│   │   ├── prisma.ts              # Client Prisma singleton
│   │   ├── auth.ts                # Configurazione Auth.js
│   │   ├── validators/            # Schema Zod
│   │   ├── business-rules/        # Vincoli e calcoli automatici
│   │   └── jira/                  # Client Jira e mapping
│   ├── theme/                     # Tema MUI personalizzato (palette SiMaggioli)
│   └── types/                     # Tipi TypeScript condivisi
├── prisma/
│   ├── schema.prisma              # Modello dati (singola fonte di verita)
│   ├── migrations/                # Migrazioni automatiche
│   └── seed.ts                    # Dati di seed per sviluppo
├── agents/                        # Agenti specializzati Claude Code
├── docs/                          # Specifiche e documentazione tecnica
│   └── spec.md                    # Specifiche funzionali complete
├── vercel.json                    # Configurazione Vercel (cron jobs Jira sync)
├── CLAUDE.md                      # Questo file
├── CONTEXT.md                     # Glossario del dominio
├── .env.example                   # Template variabili d'ambiente
└── package.json
```

Principi di organizzazione:
- **Componenti per dominio funzionale**, non per tipo tecnico
- **Un file per entita** nelle API route (`src/app/api/[entita]/route.ts`)
- **Server Components come default**; `"use client"` solo dove serve interattivita
- **lib/** per codice condiviso tra API e frontend
- **lib/business-rules/** per regole di business come funzioni pure testabili

## Convenzioni di codice

- TypeScript strict mode attivo: evitare `any`, preferire tipi espliciti sulle entita di dominio
- Nomi nel codice in inglese (`Application`, `Contract`, `Initiative`, `Resource`, `Allocation`), italiano nella UI e documentazione
- Validazione dati in ingresso con schema Zod coerente con i modelli Prisma
- Server Components come default; `"use client"` solo dove serve interattivita
- Pattern di eliminazione con integrita referenziale: bloccare con 409 se l'entita ha dipendenze (non eliminare a cascata)
- Import/export dati: supportare fin dall'inizio per facilitare il popolamento durante POC/MVP
- Nessun state manager globale (Redux, Zustand): lo stato vive nel server, i componenti client gestiscono solo stato locale di UI
- MUI DataGrid per tutte le tabelle dati; MUI X Charts o Recharts per i grafici dashboard

## Build e deploy

```bash
npm install
npm run dev          # sviluppo locale
npm run build        # build di produzione (include prisma generate)
npm run lint         # controllo lint
```

- Deploy automatico su Vercel al push su `main`
- Variabili d'ambiente: documentare in `.env.example` con placeholder — **mai committare valori reali**
- Database: URL pooler per l'app, URL diretta (unpooled) per migrazioni/schema push
- Per schema push in produzione: usare l'URL unpooled e `npx prisma db push`
- Jira sync: cron job configurato in `vercel.json` (giornaliero)

## Test

- Framework: Vitest per unit test, Playwright per e2e (se configurati)
- Coverage target: 70-80% sulla logica di dominio (lib/business-rules/)
- Scrivere o aggiornare i test **in corrispondenza di ogni modifica funzionale**
- Le regole di business (vincoli capacita, calcolo coefficiente, allocazione PM) devono avere copertura unitaria

---

# Configurazione Claude Code

## Agenti specializzati

La cartella `agents/` contiene agenti per lo stack Next.js + Prisma + MUI.

| Agente | Quando si attiva |
|---|---|
| `react-expert` | Refactoring componenti, hooks, performance, gestione stato. Si attiva automaticamente (PROACTIVELY). |
| `typescript-expert` | Tipi complessi, generics, strict mode. Si attiva automaticamente. |
| `prisma-expert` | Modifiche schema, query Prisma Client, migration |
| `postgres-expert` | Query SQL dirette, tuning, indicizzazione |
| `sql-expert` | Query SQL complesse, CTEs, window functions |
| `rest-expert` | Progettazione API route (endpoint, status code, versioning) |
| `mui-expert` | Componenti MUI, tema, DataGrid, Charts |

Regola di instradamento:
- Schema/ORM -> `prisma-expert`
- SQL diretto/performance DB -> `postgres-expert` o `sql-expert`
- API design -> `rest-expert`
- UI/componenti/tema -> `mui-expert`

## Skill consigliati

### Installati globalmente (`~/.claude/skills/`)

| Skill | Comando | Quando usarlo |
|---|---|---|
| **caveman** | `/caveman` | Inizio sessione per risposte rapide |
| **impeccable** | `/impeccable` | Prima di toccare CSS/layout |
| **graphify** | `/graphify` | Esplorare codebase, documentazione visiva |
| **grilling** | `/grilling` | Prima di feature complesse |
| **domain-modeling** | `/domain-modeling` | Modellare dominio, aggiungere entita |

## File di configurazione Claude Code

### `.claude/launch.json` — Dev server per preview

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000
    }
  ]
}
```

### `.claude/settings.local.json` — Permessi locali

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npx prisma *)",
      "Bash(npx next *)",
      "Bash(git add *)",
      "Bash(git commit -m *)",
      "Bash(git push *)",
      "Bash(git status *)",
      "Bash(git fetch *)",
      "Bash(gh pr *)"
    ]
  }
}
```

## Documenti di progetto

| File | Scopo | Stato |
|---|---|---|
| `CLAUDE.md` | Istruzioni per Claude Code | Creato |
| `CONTEXT.md` | Glossario del dominio | Creato |
| `docs/spec.md` | Specifiche funzionali complete | Creato |
| `.env.example` | Template variabili d'ambiente | Creato |

## Vincoli e decisioni architetturali

- **MUI come component library**: MUI v6+ con DataGrid per la vista pivot e Charts per le dashboard. Tema personalizzato con palette SiMaggioli. Niente Tailwind. 2026-08-27.
- **Approccio modale**: tutte le entita si creano/modificano in modali, non in pagine dedicate. Riduce la complessita di routing. 2026-08-27.
- **Eliminazione con integrita**: bloccare con 409 se dipendenze attive, non eliminare a cascata. Evita perdita dati accidentale. 2026-08-27.
- **Import/export CSV**: disponibile dall'interfaccia per risorse e assenze, per facilitare il popolamento durante POC. 2026-08-27.
- **Jira sola lettura**: l'app legge da Jira (epiche Proceed, worklog, stati) ma non scrive. Jira resta il sistema master per il demand. 2026-08-27.
- **Parametri risorsa temporalizzati**: ore settimanali, costo giornata, coefficiente produttivita possono variare nel tempo senza incidere sul passato. 2026-08-27.
- **Sovra-allocazione non bloccante**: warning ma l'utente puo confermare. Il vincolo contrattuale invece blocca. 2026-08-27.
- **Due profili utente**: Demand & Resource Manager (lettura/scrittura), BU Manager (sola lettura). Auth via Google Workspace. 2026-08-27.
- **Server-first**: Server Components di default, Client Components solo per interattivita (form, DataGrid, grafici). Nessun state manager globale. 2026-08-27.

## Palette colori SiMaggioli

| Token | Hex | Utilizzo |
|---|---|---|
| primary.main | `#00379E` | Header, titoli, azioni principali, sidebar |
| primary.dark | `#002A78` | Hover su elementi primari |
| primary.light | `#0C538E` | Elementi secondari, badge, chip |
| secondary.main | `#00B7EC` | Accenti, link, indicatori di progresso |
| secondary.dark | `#0095C0` | Hover su elementi secondari |
| gradient.cta | `linear-gradient(90deg, #00379E 0%, #00B7EC 100%)` | Pulsanti CTA, barra di navigazione |
| text.primary | `#404142` | Testo del corpo |
| text.secondary | `#85898C` | Testo secondario, didascalie |
| background.default | `#FFFFFF` | Sfondo principale |
| background.paper | `#FCFCFC` | Card, pannelli |
| divider | `#D9D9D9` | Separatori, bordi tabelle |

**Codifica saturazione** (indipendente dalla palette brand):
- Blu: 0-74% (sotto-utilizzo)
- Verde: 75-85% (fascia ottimale)
- Giallo: 86-90% (attenzione)
- Rosso: >90% (sovra-allocazione)

## Workflow consigliato per una nuova feature

1. **Definire** — se la feature e complessa, usare `/grilling` per allineare requisiti
2. **Modellare** — aggiornare `CONTEXT.md` se introduce nuove entita
3. **Schema** — modificare `prisma/schema.prisma`, creare migration
4. **API** — creare/aggiornare route in `src/app/api/`
5. **UI** — componenti React con MUI, usando il tema SiMaggioli
6. **Test** — scrivere test con la modifica, non dopo
7. **Verifica** — build + dev server + test nel browser
8. **Import/Export** — aggiornare se il modello dati e cambiato
9. **Commit** — messaggio che spiega il perche, non il cosa

## Analytics (PostHog)

Integrazione via `instrumentation-client.js` (Next.js 15.3+):
- Auto-capture: pageview, click, pageleave abilitati di default
- Identificazione utente: componente `PostHogIdentify` in providers
- Custom events: `posthog.capture("object verb", { property: value })`
- Naming convention: `[object]_[verb]` in snake_case (es. `allocation_created`)

## Errori comuni e soluzioni

### Deploy Vercel

**Prisma: "The column X does not exist in the current database"**
Lo schema Prisma e stato aggiornato e pushato su GitHub, ma il database di produzione non e stato aggiornato. Vercel esegue `prisma generate` al build, ma NON esegue migration o schema push automaticamente.
- Soluzione: dopo ogni modifica allo schema, eseguire `npx prisma db push` puntando all'URL di produzione (unpooled). Su PowerShell:
  ```powershell
  $env:DATABASE_URL = "postgresql://...URL_UNPOOLED..."
  $env:DIRECT_URL = "postgresql://...URL_UNPOOLED..."
  npx prisma db push
  ```

**Neon PostgreSQL: URL pooler vs unpooled**
- URL con `-pooler` nel hostname: per l'app (via PgBouncer)
- URL senza `-pooler`: per DDL/schema operations (migration, db push)
- Nello schema Prisma, usare `directUrl = env("DIRECT_URL")` con l'URL unpooled

**OneDrive + Next.js: EPERM su `.next/`**
Su Windows con OneDrive, la build puo fallire con `EPERM` su file dentro `.next/`.
- Soluzione: `Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue` prima della build

### Prisma e npm

**"prisma non e riconosciuto come comando"**
- Soluzione: `npm install-scripts approve prisma` e `npm install-scripts approve @prisma/engines`, poi `npx prisma generate`
- Usare sempre `npx prisma` nei comandi manuali

**Prisma schema validation P1012 — DIRECT_URL missing**
- Soluzione: settare entrambe `DATABASE_URL` e `DIRECT_URL` quando si eseguono comandi Prisma fuori dal contesto dell'app

### Generale

**Variabili d'ambiente dimenticate su Vercel**
- Checklist: `.env` locale -> `.env.example` (placeholder) -> Vercel dashboard -> commit

**PowerShell: sintassi diversa da Bash**
- Variabili d'ambiente: `$env:VAR = "value"` (non `export VAR=value`)
- Concatenare comandi: `cmd1; if ($?) { cmd2 }` (non `cmd1 && cmd2`)
- Eliminare cartelle: `Remove-Item -Recurse -Force path` (non `rm -rf`)

## Note per Claude Code

- Verificare sempre la coerenza con `CONTEXT.md` prima di modificare il modello dati
- Ogni nuova variabile d'ambiente va aggiunta anche a `.env.example` con placeholder
- Mai committare `.env` con valori reali
- Preferire `npx` per comandi CLI (prisma, next) su Windows
- Lo schema Prisma e la singola fonte di verita per il modello dati
- Le regole di business vanno in `src/lib/business-rules/` come funzioni pure testabili
