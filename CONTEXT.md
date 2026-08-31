# CONTEXT.md — Glossario del dominio PlanR

Questo documento definisce i concetti del dominio dell'applicazione PlanR. E' la fonte di verita per la terminologia e le regole di business. Ogni modifica al modello dati deve essere verificata contro questo glossario.

**Documento di riferimento:** [[BU_Documentale_SAP_Demand_Resource_Management_Draft]] (Draft v3, 6 luglio 2026).
**Specifiche applicazione:** docs/spec.md (Draft v2, 31 agosto 2026).

---

## Contesto

La **BU Documentale & SAP** opera con circa 60 persone su 15 progetti attivi. PlanR gestisce il **Resource Planning** (sezione 8 del Draft): la pianificazione delle allocazioni di risorse su iniziative, il monitoraggio della saturazione e le dashboard operative e strategiche per il Demand & Resource Manager e il BU Manager.

PlanR **non copre** il Demand Management (pipeline richieste, sessione del mercoledi, classificazione) che resta su **Jira**. Il flusso prevede che il PTF fornisca le stime nella sessione del mercoledi, dopodiche viene fatta un'estrazione CSV da Jira per alimentare il resource planning.

---

## Entita principali

### Applicativo (Application)

Soluzione software gestita dalla BU. E' il contenitore di primo livello: ogni iniziativa afferisce a un applicativo.

| Termine IT | Termine EN (codice) | Definizione |
|---|---|---|
| Applicativo | Application | Soluzione software gestita dalla BU |
| PM assegnati | assignedPMs | Uno o piu Project Manager responsabili (relazione N:N con Risorsa) |
| Moduli | modules | Componenti logici dell'applicativo (1:N) |
| Contratti | contracts | Contratti che coprono questo applicativo (N:N) |

### Modulo (Module)

Componente logico di un applicativo. Nella prima versione e **solo anagrafica** — non sviluppato funzionalmente. Serve per il tracciamento delle competenze a livello piu granulare dell'applicativo.

### Cliente (Client)

Soggetto con cui la BU ha rapporti contrattuali. Chiave primaria: slug auto-generato dal nome (kebab-case, senza accenti). Creabile inline dal form Contratto (Autocomplete freeSolo).

| Campo | Note |
|---|---|
| slug | PK, auto-generato da nome via slugify |
| nome | Nome del cliente |
| note | Annotazioni facoltative |

### Contratto (Contract)

Contratto attivo con un cliente, legato a uno o piu applicativi. Determina il perimetro temporale ed economico delle iniziative.

| Campo chiave | Significato di business |
|---|---|
| cliente | FK -> Cliente (slug). Creabile inline dal form contratto |
| tipo | **Subappalto** (PA, rendicontazione pesante) o **Appalto** (diretto, piu snello) |
| data_fine | Vincolo di pianificazione: warning con conferma (non blocco) se allocazioni la superano |
| percentuale_effort_pm | % di effort PM generata per ogni iniziativa (es. 5%). Varia per contratto perche contratti diversi hanno complessita amministrativa diversa |

### Iniziativa (Initiative)

Intervento (MEV o MAD) su un applicativo nel perimetro di un contratto. Corrisponde all'**epica Jira** nel processo di Demand Management.

| Campo chiave | Significato di business |
|---|---|
| codice | Codice epica Jira (es. "DOC-142"). Campo univoco, obbligatorio. Identifica l'iniziativa nel sistema Jira |
| tipologia | **MEV** (Manutenzione Evolutiva) o **MAD** (Manutenzione Adeguativa) |
| status | Ciclo di vita: In Attesa di Allocazione -> Allocato -> In Lavorazione -> Completato. Stati laterali: Ready - Pending Resources, In Attesa di Copertura Contrattuale, Fuori Scope |
| affidabilita_stima | Alta, Media, Bassa — indicatore sintetico di quanto la stima e affidabile (unifica rischio tecnico e rischio stima) |
| vincoli_criticita | Note testuali su vincoli e criticita identificati dal PTF (dipendenze, complessita, debito tecnico) |
| taglia_sizing | XS/S/M/L/XL — importata da Jira (sezione 6.1 Draft) |
| polarita | Prima meta / Seconda meta — impatta il buffer di stima (sezione 6.2 Draft) |
| stima_gg | Stima complessiva in giorni/uomo (sviluppo + analisi/test) |
| figure_necessarie | Fabbisogno generico ("2 FE, 1 BE, 1 Analista") — campo testuale |
| valore_economico | Fascia di valore stimato (<5K, 5-10K, ... >40K) — importato da Jira |
| data_fine_desiderata | Data di consegna indicata dal PM nell'epica Jira |
| data_inizio_pianificata | Calcolata: data_fine_desiderata - effort_pianificato (con buffer per taglia) |

**Buffer per taglia e polarita (sezione 7.2 Draft):**
- XS/S/M: buffer 20%
- L/XL: buffer 30%

### Risorsa (Resource)

Persona della BU. Identificata da cognome + nome (campi separati: `lastName`, `firstName`). Campo facoltativo `employeeId` per matching con sistemi esterni (Factorial).

| Campo chiave | Significato di business |
|---|---|
| cognome + nome | Campi separati. Visualizzato come "Cognome Nome" (convenzione italiana) |
| id_dipendente | Codice identificativo nel sistema HR (facoltativo) |
| tipologia | Interna o Esterna (consulenti/fornitori) — distinzione per analisi costi e mix |
| appartenenza | BU Documentale o Engineering Excellence (sezione 9 Draft) |
| pool | **Manutenzione** (allocate su manutenzione con percentuale configurabile) o **Evolutiva/Adeguativa** (allocate dinamicamente) |
| is_ptf | Membro del Presidio Tecnico Funzionale — ha impegni strutturali (sessioni, review) che riducono la capacita allocabile |
| attivo | Se la risorsa e attualmente attiva nella BU. Auto-calcolato da data_fine_contratto del Parametro risorsa; forzabile manualmente. Risorse non attive non compaiono nelle viste operative ma restano nello storico |

**Risorse di manutenzione:** allocate con una **percentuale configurabile** (non necessariamente 100%), visualizzata come blocco fisso nella pivot. La capacita residua e disponibile per evolutiva.

**Risorse Engineering Excellence:** allocate sulle iniziative della BU quando il PTF rileva necessita architetturali. La loro capacita allocabile va concordata con il responsabile EE perche hanno impegni fuori perimetro non visibili nell'app.

**Risorse esterne:** trattate identicamente per pianificazione e saturazione. La distinzione alimenta le dashboard per analisi mix/costo.

### Parametro risorsa (ResourceParameter)

Storico temporalizzato degli attributi variabili di una risorsa. Un cambio crea un nuovo record; il precedente viene chiuso. I calcoli passati restano ancorati ai valori vigenti nel periodo.

| Campo | Significato |
|---|---|
| ruolo | FE, BE, Analista, Tech Lead, Architetto, PM, BA Senior, Altro. Temporalizzato — una promozione crea un nuovo record |
| livello | Junior, Mid, Senior. Temporalizzato — un avanzamento crea un nuovo record |
| ore_settimanali | Ore teoriche settimanali nel periodo di validita |
| costo_giornata | Costo giornaliero in euro nel periodo |
| coefficiente_produttivita | Fattore rispetto al baseline mid-level (default 1.0). Junior: 1.3, Senior: 0.85. Impatta la pianificazione temporale, non il costo |
| buffer_ore_settimanali | Override del buffer globale BU per questa risorsa. Se null, si usa il default dalla Configurazione BU |
| data_fine_contratto | Data fine contratto della risorsa. Quando superata, il flag `attivo` sulla Risorsa passa a false. L'app genera alert se allocazioni superano questa data |

**Regola di non retroattivita:** un nuovo parametro con data odierna o futura chiude automaticamente il record precedente. I calcoli storici restano invariati.

**Coefficiente di produttivita ("handicap"):** le stime PTF sono calibrate su mid-level (1.0). Effort effettivo = Effort allocato x Coefficiente. Un junior con 1.3 su un'iniziativa da 20 GG produce 26 GG effettivi, spostando la data di fine.

### Allocazione (Allocation)

Assegnazione di una Risorsa a un'Iniziativa per un periodo e una percentuale di impegno. E' il record che alimenta la vista pivot e il calcolo della saturazione.

| Campo chiave | Significato |
|---|---|
| tipo_lock | **Soft** (prenotazione temporanea) o **Hard** (confermata) |
| soft_lock_scadenza | Data scadenza del soft lock. Obbligatoria se tipo_lock = Soft. Alla scadenza l'app genera alert. Ogni allocazione ha la propria scadenza indipendente |
| percentuale_allocazione | 1-100%, quota di tempo della risorsa su questa iniziativa |
| effort_allocato_gg | Giorni/uomo allocati. Auto-calcolato se non specificato: `giorniLavorativi(inizio, fine) x percentuale / 100` (solo lun-ven) |
| ruolo_nell_iniziativa | Ruolo specifico in questa iniziativa (stessa enum del ruolo Risorsa: FE, BE, Analista, Tech Lead, Architetto, PM, BA Senior, Altro) |
| affiancamento | Se true, questa allocazione e una leva di crescita (sezione 8.2 Draft) |
| is_senior_affiancamento | Se true e affiancamento = true, questa e l'allocazione del senior che affianca |

**Vincoli all'allocazione:**
- **Vincolo contrattuale:** data fine allocazione > data fine contratto genera warning con richiesta di conferma (409 + `requiresConfirmation`), non blocco. Il D&R Manager puo confermare.
- **Sovra-allocazione:** saturazione > soglia genera warning con conferma, non blocco.

**Soft lock vs hard lock:**
- **Soft:** prenotazione temporanea in attesa di conferma contrattuale. Codifica visiva a tratteggio. Si attiva manualmente dal D&R Manager.
- **Hard:** allocazione confermata.
- Entrambi occupano capacita e contano nella saturazione.
- Allocazioni diverse sulla stessa iniziativa possono avere scadenze e tipi di lock differenti.

**Affiancamento:** quando un'allocazione ha il flag affiancamento attivo, l'app consente una seconda allocazione sulla stessa iniziativa con is_senior_affiancamento = true. Le due allocazioni sono collegate visivamente nella pivot.

---

## Entita di supporto

### Assenza (Absence)

Record di singolo giorno di assenza, importato da Factorial (CSV) o filtrato dall'import consuntivo Jira. Riduce la capacita allocabile nelle settimane interessate.

| Campo | Note |
|---|---|
| giorno (date) | Singola data di assenza |
| ore_assenza (hours) | Ore di assenza nella giornata (8 = intera, 4 = mezza) |
| tipo | Ferie, Malattia, Permesso, Altro |
| fonte (source) | Factorial o Jira — indica la provenienza del record |
| Deduplicazione per risorsa + data (unique constraint) |

### Consuntivo (Consuntivo) — predisposizione

Record di ore effettivamente lavorate, importato da worklog Jira CSV. Chiude il ciclo di pianificazione confrontando consuntivo con stima.

| Campo | Note |
|---|---|
| iniziativa | FK -> Iniziativa |
| risorsa | FK -> Risorsa |
| periodo | Periodo di riferimento (es. "2026-08") |
| ore_consuntivate | Ore lavorate nel periodo |

**Nota:** entita predisposta nello schema, funzionalita completa post-pilota.

### Alert (Alert)

Segnalazione persistente di situazioni che richiedono attenzione.

| Campo | Note |
|---|---|
| tipo | Uno degli 11 alert definiti (8 operativi + 3 strategici) |
| severita | Operativo o Strategico |
| stato | Attivo, Preso in carico, Silenziato, Risolto |
| motivazione_silenziamento | Obbligatoria quando silenziato |

### ImportLog (ImportLog)

Log persistente delle operazioni di import dati.

| Campo | Note |
|---|---|
| tipo | Risorse, Assenze, Iniziative Jira, Consuntivo |
| righe_totali, righe_importate, righe_errore | Contatori |
| errori | JSON con dettaglio riga per riga |

### Configurazione BU (BUConfiguration)

Parametri globali dell'applicazione (singleton).

| Parametro | Default | Significato |
|---|---|---|
| budget_annuale | - | Budget annuale BU in euro, riferimento per alert Pipeline Value |
| buffer_ore_settimanali | 8 ore | Buffer globale sottratto dalla capacita teorica (riunioni, context switching). Override possibile per risorsa |
| saturazione_min | 75% | Soglia inferiore fascia ottimale |
| saturazione_max | 85% | Soglia superiore fascia ottimale |
| saturazione_allarme | 90% | Soglia sovra-allocazione |

### Snapshot settimanale (WeeklySnapshot)

Fotografia dei dati aggregati per i grafici di trend. Generato automaticamente ogni lunedi.

---

## Formule chiave

### Capacita allocabile settimanale

```
Capacita Allocabile (settimana S, risorsa R) =
    Ore Settimanali (R, alla data S)
    - Buffer Effettivo (R, alla data S)
    - Ore Assenza Pianificate (R, settimana S)

Buffer Effettivo = ParametroRisorsa.buffer_ore_settimanali ?? ConfigurazioneBU.buffer_ore_settimanali
```

### Saturazione settimanale

```
Ore Allocate (allocazione A, settimana S) =
    Ore Settimanali (R) x Percentuale Allocazione (A) / 100

Saturazione % = (Somma Ore Allocate nella settimana / Capacita Allocabile) x 100
```

### Effort effettivo

```
Effort Effettivo (allocazione A) =
    Effort Allocato GG (A) x Coefficiente Produttivita (Risorsa)
```

### Costo previsto iniziativa

```
Costo Previsto (iniziativa I) =
    Somma per ogni Allocazione A di I:
        Effort Allocato GG (A) x Costo Giornata (Risorsa, vigente nel periodo di A)
```

### Effort PM automatico

```
Effort PM (iniziativa I) =
    Stima GG (I) x Percentuale Effort PM (Contratto di I) / 100

Per N PM dell'applicativo: ciascuno riceve 1/N dell'effort PM
```

### Data inizio pianificata

```
Data Inizio Pianificata =
    Data Fine Desiderata - Effort Pianificato

Effort Pianificato = Stima GG x (1 + Buffer%)
    dove Buffer% = 20% per XS/S/M, 30% per L/XL
```

---

## Orizzonte temporale

Per il MVP: **solo orizzonte corto** (12 settimane scorrevoli).

| Orizzonte | Finestra | Dettaglio | Comportamento |
|---|---|---|---|
| **Corto** | 12 settimane | Risorsa nominativa, alta precisione | Allocazioni con risorsa assegnata. Alert su sovra-allocazione |

**Zoom pivot:** la vista pivot supporta due livelli di zoom:
- **Settimane** (default): una colonna per settimana, 12 colonne
- **Mesi**: aggregazione client-side delle settimane per mese (saturazione media, ore sommate)

Orizzonti medio e lungo rimandati a fase successiva.

---

## I due pool di risorse

- **Pool Manutenzione:** risorse allocate su manutenzione con **percentuale configurabile** (tipicamente 100%, ma puo essere inferiore). La percentuale di allocazione sulla manutenzione e visualizzata come blocco fisso nella pivot; la capacita residua e disponibile per allocazioni di evolutiva/adeguativa.
- **Pool Evolutiva/Adeguativa:** allocate dinamicamente per richiesta tramite il processo di demand.

Il cambio di pool e un'operazione esplicita del D&R Manager, tracciata nel log.

---

## Profilo di competenza (vista calcolata)

Non e un'entita persistente. E' un aggregato derivato in tempo reale dallo storico delle allocazioni completate. **Post-pilota.**

---

## Sistema di alert

### Alert operativi (D&R Manager)

| Alert | Condizione |
|---|---|
| Sovra-allocazione | Saturazione > soglia allarme per > 2 settimane consecutive |
| Sotto-utilizzo | Saturazione < 50% per > 2 settimane consecutive |
| Scadenza soft lock | Data scadenza soft lock su allocazione superata |
| Ready - Pending Resources | Iniziativa in questo stato da > 2 settimane |
| Iniziativa senza allocazioni | Nell'orizzonte corto senza allocazioni nominative |
| Prossimita scadenza contratto | Allocazione negli ultimi 30 giorni del contratto |
| Slittamento per coefficiente | Effort effettivo fa superare la data consegna desiderata |
| Costo > valore economico | Costo previsto supera il valore economico stimato |

### Alert strategici (BU Manager)

| Alert | Condizione |
|---|---|
| Profilo saturo | Tutte le risorse di un profilo > 85% per 4 settimane |
| Pipeline value elevata | Soft lock value > 20% budget annuale |
| Accumulo Pending Resources | > 3 iniziative Pending Resources sullo stesso profilo |

Gli alert possono essere: presi in carico, silenziati (con motivazione obbligatoria), risolti automaticamente. Persistiti in DB.

---

## Codifica colori saturazione

| Fascia | Colore | Range |
|---|---|---|
| Sotto-utilizzo | Blu (#2196F3) | 0-74% |
| Fascia ottimale | Verde (#4CAF50) | 75-85% |
| Attenzione | Giallo (#FFC107) | 86-90% |
| Sovra-allocazione | Rosso (#F44336) | >90% |

---

## Integrazioni esterne

### Jira (sola lettura, import CSV)

Jira e il **sistema master** per il demand. L'app importa dati via CSV (no sync automatico per MVP).

**Dati importati:** epiche Proceed, stato epica, worklog, priorita, due date, taglia sizing, valore economico. Formato CSV: da definire (in attesa del tracciato Jira).

**Regola:** in caso di conflitto, Jira prevale per i campi che governa (stato, worklog, priorita). L'app governa allocazioni, percentuali, date pianificate.

### Factorial (import CSV)

Import settimanale manuale di assenze (CSV: nominativo;giorno;ore_assenza). Match per nominativo, deduplicazione per risorsa+data.

---

## Utenti

| Profilo | Accesso | Utilizzo |
|---|---|---|
| **Demand & Resource Manager** | Lettura/scrittura | Quotidiano — gestione allocazioni, saturazione, soft lock, import, alert |
| **BU Manager** | Sola lettura | Settimanale/mensile — dashboard strategiche, decisioni escalation |

Autenticazione: Google Workspace aziendale (OAuth 2.0). Ruoli mappati su email autorizzate.

---

## Dashboard MVP

| Dashboard | Tipo | Contenuto principale |
|---|---|---|
| 9.1 Saturazione risorse | Operativa | Heatmap, distribuzione per fascia, trend |
| 9.4 Soft lock attivi | Operativa | Lista soft lock, valore totale, risorse impegnate |
| 10.1 Panoramica BU | Strategica | Gauge saturazione, donut fascia, top profili critici, pipeline |
| 10.2 Accuratezza stime | Strategica | **Placeholder** (richiede Consuntivo) |
| 10.4 Pipeline value | Strategica | Valore in attesa, distribuzione per applicativo/fascia temporale |

**Escluse dal MVP:** 9.2 Tempo di ciclo, 9.3 Tasso completamento PTF, 10.3 Richieste bloccate/zombie (processi gestiti su Jira).

---

## Funzionalita post-pilota

- Consuntivo e accuratezza stime (dashboard 10.2 completa)
- Profilo di competenza e suggerimento risorse
- Allocazione automatica PM
- Orizzonti medio e lungo
- Import automatico da Jira (sync API vs CSV)
