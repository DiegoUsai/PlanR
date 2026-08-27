# CONTEXT.md — Glossario del dominio PlanR

Questo documento definisce i concetti del dominio dell'applicazione PlanR. E' la fonte di verita per la terminologia e le regole di business. Ogni modifica al modello dati deve essere verificata contro questo glossario.

**Documento di riferimento:** [[BU_Documentale_SAP_Demand_Resource_Management_Draft]] (Draft v3, 6 luglio 2026).

---

## Contesto

La **BU Documentale & SAP** opera con circa 60 persone su 15 progetti attivi. PlanR gestisce il **Resource Planning** (sezione 8 del Draft): la pianificazione delle allocazioni di risorse su iniziative, il monitoraggio della saturazione e le dashboard operative/strategiche.

PlanR **non copre** il Demand Management (pipeline richieste, sessione del mercoledi, classificazione) che resta su **Jira**.

---

## Entita principali

### Applicativo (Application)

Soluzione software gestita dalla BU. E' il contenitore di primo livello: ogni iniziativa afferisce a un applicativo.

| Termine IT | Termine EN (codice) | Definizione |
|---|---|---|
| Applicativo | Application | Soluzione software gestita dalla BU |
| PM assegnati | assignedPMs | Uno o piu Project Manager responsabili (relazione N:N con Risorsa) |
| Moduli | modules | Componenti logici dell'applicativo (1:N) |
| Finestre di rilascio | releaseWindows | Periodi di blocco rilascio imposti dal cliente (1:N) |
| Contratti | contracts | Contratti che coprono questo applicativo (N:N) |

### Modulo (Module)

Componente logico di un applicativo. Nella prima versione e **solo anagrafica** — non sviluppato funzionalmente. Serve per il tracciamento delle competenze a livello piu granulare dell'applicativo.

### Contratto (Contract)

Contratto attivo con un cliente, legato a uno o piu applicativi. Determina il perimetro temporale ed economico delle iniziative.

| Campo chiave | Significato di business |
|---|---|
| tipo | **Subappalto** (PA, rendicontazione pesante) o **Appalto** (diretto, piu snello) |
| data_fine | Vincolo di pianificazione: le allocazioni non possono superarla |
| percentuale_effort_pm | % di effort PM generata per ogni iniziativa (es. 5%). Varia per contratto perche contratti diversi hanno complessita amministrativa diversa |

### Iniziativa (Initiative)

Intervento (MEV o MAD) su un applicativo nel perimetro di un contratto. Corrisponde all'**epica Jira** nel processo di Demand Management.

| Campo chiave | Significato di business |
|---|---|
| tipologia | **MEV** (Manutenzione Evolutiva) o **MAD** (Manutenzione Adeguativa) |
| status | Ciclo di vita: In Attesa di Allocazione -> Allocato -> In Lavorazione -> Completato. Stati laterali: Ready - Pending Resources, In Attesa di Copertura Contrattuale, Fuori Scope |
| soft_lock | Risorse prenotate temporaneamente in attesa di conferma contrattuale (sezione 13 Draft) |
| soft_lock_scadenza | Data limite del soft lock — condivisa da tutte le allocazioni soft dell'iniziativa |
| affiancamento | Flag: l'iniziativa e leva di crescita, prevede affiancamento senior-junior |
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

Persona della BU.

| Campo chiave | Significato di business |
|---|---|
| ruolo | FE, BE, Analista, Tech Lead, Architetto, PM, BA Senior, Altro |
| livello | Junior, Mid, Senior |
| tipologia | Interna o Esterna (consulenti/fornitori) — distinzione per analisi costi e mix |
| appartenenza | BU Documentale o Engineering Excellence (sezione 9 Draft) |
| pool | **Manutenzione** (allocate al 100% su manutenzione, non disponibili per evolutiva) o **Evolutiva/Adeguativa** (allocate dinamicamente) |
| is_ptf | Membro del Presidio Tecnico Funzionale — ha impegni strutturali (sessioni, review) che riducono la capacita allocabile |

**Risorse Engineering Excellence:** allocate sulle iniziative della BU quando il PTF rileva necessita architetturali. La loro capacita allocabile va concordata con il responsabile EE perche hanno impegni fuori perimetro non visibili nell'app.

**Risorse esterne:** trattate identicamente per pianificazione e saturazione. La distinzione alimenta le dashboard per analisi mix/costo.

### Parametro risorsa (ResourceParameter)

Storico temporalizzato degli attributi variabili di una risorsa. Un cambio crea un nuovo record; il precedente viene chiuso. I calcoli passati restano ancorati ai valori vigenti nel periodo.

| Campo | Significato |
|---|---|
| ore_settimanali | Ore teoriche settimanali nel periodo di validita |
| costo_giornata | Costo giornaliero in euro nel periodo |
| coefficiente_produttivita | Fattore rispetto al baseline mid-level (default 1.0). Junior: 1.3, Senior: 0.85. Impatta la pianificazione temporale, non il costo |
| buffer_ore_settimanali | Override del buffer globale BU per questa risorsa. Se null, si usa il default dalla Configurazione BU |

**Regola di non retroattivita:** un nuovo parametro con data odierna o futura chiude automaticamente il record precedente. I calcoli storici restano invariati.

**Coefficiente di produttivita ("handicap"):** le stime PTF sono calibrate su mid-level (1.0). Effort effettivo = Effort allocato x Coefficiente. Un junior con 1.3 su un'iniziativa da 20 GG produce 26 GG effettivi, spostando la data di fine.

### Allocazione (Allocation)

Assegnazione di una Risorsa a un'Iniziativa per un periodo e una percentuale di impegno. E' il record che alimenta la vista pivot e il calcolo della saturazione.

| Campo chiave | Significato |
|---|---|
| tipo_lock | **Soft** (prenotazione temporanea) o **Hard** (confermata) |
| percentuale_allocazione | 1-100%, quota di tempo della risorsa su questa iniziativa |
| effort_allocato_gg | Giorni/uomo allocati |
| ruolo_nell_iniziativa | Ruolo specifico in questa iniziativa (puo differire dal ruolo anagrafico) |
| is_senior_affiancamento | Se true, questa e l'allocazione del senior che affianca un junior |

**Soft lock vs hard lock:**
- **Soft:** prenotazione temporanea in attesa di conferma contrattuale. Codifica visiva a tratteggio. Si attiva quando Jira segnala "Preventivo Inviato" o manualmente.
- **Hard:** allocazione confermata.
- Entrambi occupano capacita e contano nella saturazione.

---

## Entita di supporto

### Assenza (Absence)

Record di ferie/assenza importato da Factorial (CSV settimanale). Riduce la capacita allocabile nelle settimane interessate.

| Campo | Note |
|---|---|
| tipo | Ferie, Malattia, Permesso, Altro |
| Match per nominativo con l'anagrafica risorse |
| Deduplicazione per risorsa + data |

### Finestra di rilascio (ReleaseWindow)

Periodo in cui il cliente non accetta rilasci, configurato a livello di applicativo. Vincolo **informativo** (non bloccante): l'app segnala visivamente e genera alert se una data di fine iniziativa ricade nel blocco.

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

## I tre orizzonti temporali

| Orizzonte | Finestra | Dettaglio | Comportamento |
|---|---|---|---|
| **Corto** | 4 settimane | Risorsa nominativa, alta precisione | Allocazioni con risorsa assegnata. Alert su sovra-allocazione |
| **Medio** | 8 settimane | Profilo/ruolo, media precisione | Allocazioni possono essere a livello di profilo senza risorsa nominativa |
| **Lungo** | 12 settimane | Previsionale, bassa precisione | Vista aggregata per progetto e profilo. Per anticipare colli di bottiglia |

La transizione e scorrevole: allocazioni dell'orizzonte medio che entrano nel corto senza risorsa nominativa generano un alert.

---

## I due pool di risorse

- **Pool Manutenzione:** risorse allocate al 100% su manutenzione, visualizzate come blocco fisso nella pivot. Non disponibili per evolutiva.
- **Pool Evolutiva/Adeguativa:** allocate dinamicamente per richiesta tramite il processo di demand.

Il cambio di pool e un'operazione esplicita del D&R Manager, tracciata nel log.

---

## Profilo di competenza (vista calcolata)

Non e un'entita persistente. E' un aggregato derivato in tempo reale dallo storico delle allocazioni completate.

```
Competenza (Risorsa R, Applicativo A, Modulo M) =
    Somma effort_allocato_gg delle Allocazioni completate di R
    su Iniziative con applicativo = A e modulo = M
```

Espresso come distribuzione percentuale a due livelli:
- **Applicativo:** es. SibarDoc 60%, Protocollo 40%
- **Modulo:** es. SibarDoc: Firma 70%, Conservazione 30%

Alimenta il **suggerimento risorse** nell'allocazione: ranking per competenza > disponibilita > ruolo compatibile.

---

## Sistema di alert

### Alert operativi (D&R Manager)

| Alert | Condizione |
|---|---|
| Sovra-allocazione | Saturazione > soglia allarme per > 2 settimane consecutive |
| Sotto-utilizzo | Saturazione < 50% per > 2 settimane consecutive |
| Scadenza soft lock | Data scadenza superata |
| Ready - Pending Resources | Iniziativa in questo stato da > 2 settimane |
| Iniziativa senza allocazioni | Nell'orizzonte corto senza allocazioni nominative |
| Conflitto finestra rilascio | Data fine iniziativa in finestra di blocco |
| Prossimita scadenza contratto | Allocazione negli ultimi 30 giorni del contratto |
| Slittamento per coefficiente | Effort effettivo fa superare la data consegna desiderata |
| Costo > valore economico | Costo previsto supera il valore economico stimato |

### Alert strategici (BU Manager)

| Alert | Condizione |
|---|---|
| Profilo saturo | Tutte le risorse di un profilo > 85% per 4 settimane |
| Pipeline value elevata | Soft lock value > 20% budget annuale |
| Accumulo Pending Resources | > 3 iniziative Pending Resources sullo stesso profilo |

Gli alert possono essere: presi in carico, silenziati (con motivazione), risolti automaticamente.

---

## Integrazioni esterne

### Jira (sola lettura)

Jira e il **sistema master**. L'app legge via REST API v3, sync giornaliera o manuale.

**Dati importati:** epiche Proceed, stato epica, worklog, priorita, due date, taglia sizing, valore economico, stato "Preventivo Inviato" (trigger soft lock).

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
