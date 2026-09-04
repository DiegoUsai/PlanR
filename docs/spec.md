# Resource Plan — specifiche applicazione web

|  |  |
| :---- | :---- |
| **Autore** | Diego Usai — BU Manager |
| **Versione** | Draft v2.6 |
| **Data** | 3 settembre 2026 |
| **Stato** | Bozza di lavoro |
| **Documento di riferimento** | [[BU_Documentale_SAP_Demand_Resource_Management_Draft]] (Draft v3, 6 luglio 2026) |

---

## Indice

1. [Contesto e obiettivi](#1-contesto-e-obiettivi)
2. [Utenti e permessi](#2-utenti-e-permessi)
3. [Modello dati](#3-modello-dati)
4. [Integrazione Jira (sola lettura)](#4-integrazione-jira-sola-lettura)
5. [Import assenze da Factorial](#5-import-assenze-da-factorial)
6. [Consuntivo e accuratezza delle stime](#6-consuntivo-e-accuratezza-delle-stime)
7. [Funzionalità core](#7-funzionalità-core)
8. [Regole di business automatiche](#8-regole-di-business-automatiche)
9. [Dashboard — vista Demand & Resource Manager](#9-dashboard--vista-demand--resource-manager)
10. [Dashboard — vista BU Manager](#10-dashboard--vista-bu-manager)
11. [Interfaccia utente e navigazione](#11-interfaccia-utente-e-navigazione)
12. [Requisiti non funzionali](#12-requisiti-non-funzionali)
13. [Stack tecnologico](#13-stack-tecnologico)
14. [Change log](#14-change-log)

---

## 1. Contesto e obiettivi

### 1.1 Il problema

La BU Documentale & SAP opera con circa sessanta persone distribuite su quindici progetti attivi. Il documento [[BU_Documentale_SAP_Demand_Resource_Management_Draft]] definisce un processo strutturato di **Demand & Resource Management** che risolve la mancanza di visibilità sulla capacità delle risorse e sulla pipeline delle richieste.

Il processo prevede che il **Resource Plan** venga gestito su **Google Sheet** o **Microsoft Excel** (sezione 8 del documento di riferimento). Questa scelta è adeguata per la fase di avvio del processo (pilota luglio-settembre 2026), ma presenta limiti strutturali al crescere del volume e della complessità:

- **nessuna automazione** — il calcolo della saturazione, i tre orizzonti temporali e gli alert di sovra-allocazione richiedono formule manuali fragili e manutenzione costante
- **nessuna visibilità in tempo reale** — il file riflette lo stato dell'ultimo aggiornamento del mercoledì pomeriggio, non lo stato corrente
- **nessuna integrazione nativa** — i dati di **Jira** (epiche, stati, **worklog**) e di **Factorial** (ferie, assenze) vengono trasferiti manualmente
- **rischio di errore** — le allocazioni parziali con percentuali, le sovrapposizioni e il **soft lock** gestiti su righe di un foglio di calcolo generano errori di transcoding difficili da individuare
- **mancanza di dashboard** — le metriche operative e strategiche definite nella sezione 14 del documento di riferimento richiedono elaborazioni che il foglio di calcolo non può fornire con la frequenza e la granularità necessarie

### 1.2 L'obiettivo

Realizzare un'applicazione web che sostituisca il **Google Sheet** del Resource Plan con uno strumento dedicato, mantenendo piena coerenza con il processo definito nel documento di riferimento. L'applicazione non modifica il processo: lo strumentalizza.

### 1.3 Il perimetro

L'applicazione copre il **Resource Planning**, ovvero le funzionalità descritte nella sezione 8 del documento di riferimento e le metriche delle sezioni 14.1, 14.2 e 14.3. Non copre il **Demand Management** (gestione della pipeline delle richieste, sessione del mercoledì, sistema di classificazione) che rimane gestito su **Jira**.

L'applicazione legge dati da **Jira** per alimentare il Resource Plan (epiche classificate **Proceed**, sizing, team composition, worklog) ma non scrive su Jira: **Jira resta il sistema master** per il tracciamento delle richieste.

---

## 2. Utenti e permessi

L'applicazione ha due profili utente con viste e permessi distinti. Entrambi i profili possono effettuare il **logout** dall'applicazione tramite un'opzione nella barra di navigazione (icona utente o menu profilo).

### 2.1 Demand & Resource Manager

È l'utente operativo principale. Utilizza l'applicazione quotidianamente per:

- creare e aggiornare le allocazioni nel Resource Plan
- monitorare la saturazione delle risorse per persona e per settimana
- gestire il **soft lock** delle risorse in attesa di approvazione contrattuale
- importare i dati di assenza da **Factorial**
- visualizzare le **dashboard** operative settimanali
- ricevere gli **alert** automatici (sovra-allocazione, scadenza soft lock, iniziative in "Pending Resources" da più di due settimane)

**Permessi:** lettura e scrittura su tutti i dati del Resource Plan. Configurazione degli alert. Import dati.

### 2.2 BU Manager

Utilizza l'applicazione con cadenza settimanale o mensile per:

- visualizzare la saturazione complessiva della BU e le dashboard strategiche
- identificare i **colli di bottiglia** di capacity per profilo
- monitorare la **pipeline value** in attesa di approvazione
- verificare l'accuratezza delle stime nel tempo
- prendere decisioni di escalation su conflitti di allocazione

**Permessi:** lettura su tutti i dati del Resource Plan e delle dashboard. Non modifica direttamente le allocazioni — le decisioni vengono comunicate al Demand & Resource Manager che le traduce nel piano.

---

## 3. Modello dati

Il modello dati è organizzato attorno a cinque entità principali e due entità di supporto. La registrazione base del Resource Plan resta la **tripletta iniziativa – risorsa – allocazione** (coerente con la sezione 8.1 del documento di riferimento), ma il contesto dell'iniziativa è ora agganciato a un **applicativo** e a un **contratto** che ne determinano il perimetro e i vincoli temporali ed economici.

### 3.1 Entità principali

#### Applicativo

Rappresenta una soluzione software gestita dalla BU.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **nome** | Stringa | Nome dell'applicativo |
| **descrizione** | Testo | Descrizione della soluzione |
| **pm_assegnati** | Relazione N:N → Risorsa | Uno o più PM responsabili dell'applicativo |
| **contratti** | Relazione N:N | Contratti che coprono questo applicativo |
| **moduli** | Relazione 1:N | Moduli dell'applicativo (entità tracciata, non sviluppata nella prima versione) |

#### Modulo

Componente logico di un applicativo. Entità tracciata nella prima versione ma **non sviluppata funzionalmente** — serve come anagrafica per future evoluzioni.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **applicativo** | FK → Applicativo | |
| **nome** | Stringa | Nome del modulo |
| **descrizione** | Testo | Descrizione del modulo |

#### Cliente

Anagrafica controllata dei clienti della BU. La gestione come entità separata (anziché campo testuale libero) garantisce uniformità nei nomi e nelle aggregazioni per cliente nelle dashboard.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **slug** | Stringa | **Chiave primaria.** Identificativo univoco generato automaticamente dal nome del cliente (es. "Comune di Roma" → `comune-di-roma`). Usato come riferimento stabile nelle relazioni |
| **nome** | Stringa | Ragione sociale o denominazione del cliente |
| **note** | Testo | Note libere |

> **Inserimento inline:** il cliente può essere creato direttamente dalla schermata di inserimento del contratto, senza navigare altrove. Se il nome digitato non corrisponde a nessun cliente esistente, l'applicazione propone la creazione al volo con generazione automatica dello slug.

#### Contratto

Rappresenta un contratto attivo con un cliente, legato a uno o più applicativi.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **identificativo** | Stringa | Codice identificativo del contratto (riferimento amministrativo) |
| **id_contratto_jira** | Stringa (nullable) | Identificativo del contratto usato su Jira (campo "Contratti BU DOC"). Chiave di match per l'import CSV delle iniziative. Se un'iniziativa importata ha un valore di "Contratti BU DOC" che non corrisponde a nessun `id_contratto_jira` censito, il sistema genera un alert |
| **tipo** | Enum | Subappalto, Appalto |
| **cliente** | FK → Cliente | Cliente di riferimento del contratto. Selezionabile da elenco controllato con possibilità di creazione inline |
| **importo** | Decimale | Importo complessivo del contratto in euro |
| **data_inizio** | Data | Data di inizio del contratto |
| **data_fine** | Data | Data di fine del contratto |
| **percentuale_effort_pm** | Decimale | Percentuale di effort PM generata automaticamente per ogni iniziativa afferente a questo contratto (es. 5%). Vedi sezione "Allocazione automatica PM" |
| **applicativi** | Relazione N:N | Applicativi coperti dal contratto |
| **note** | Testo | Note libere |

> **Rilevanza per la pianificazione:** la data di fine del contratto è un vincolo di pianificazione per le iniziative che vi afferiscono — l'applicazione segnala le iniziative la cui data di consegna desiderata supera la scadenza del contratto di riferimento.

#### Iniziativa

Rappresenta un intervento (MEV, MAD o altro) su un applicativo, nel perimetro di un contratto. Corrisponde all'**epica Jira** nel processo di Demand Management. Le iniziative vengono importate esclusivamente tramite **import CSV** da Jira (sezione 13.8): i dati **non sono modificabili** dall'utente nell'applicazione e le iniziative **non possono essere cancellate**.

| Campo | Tipo | Origine | Note |
| :---- | :---- | :---- | :---- |
| **id** | UUID | Sistema | Identificativo univoco interno |
| **issue_key** | Stringa | CSV: Issue key | Chiave dell'epica Jira (es. `DBD-29`). Chiave di match per il re-import |
| **issue_id** | Intero | CSV: Issue id | Identificativo numerico Jira |
| **applicativo** | FK → Applicativo | CSV: Progetto BU DOC | Match per nome con l'anagrafica applicativi (es. SIBARDOC, SardegnaCAT, MIT, SIBARDEC) |
| **contratto** | FK → Contratto (nullable) | CSV: Contratti BU DOC | Match per `id_contratto_jira` sull'entità Contratto. Se il valore non corrisponde a nessun contratto censito, viene generato un alert (sezione 8.1) |
| **componenti** | Stringa (nullable) | CSV: Components | Componente Jira (es. "Sibar DOC - Conservazione", "Modulo MIT"). Valore testuale importato così com'è |
| **titolo** | Stringa | CSV: Summary | Titolo dell'iniziativa |
| **descrizione** | Testo (nullable) | CSV: Description | Descrizione dell'intervento (può essere multilinea) |
| **tipologia** | Stringa (nullable) | CSV: Service Type | Tipologia di intervento così come estratta da Jira (es. "Consumo/Misura -> MEV"). Può essere vuota |
| **priorita** | Enum | CSV: Priority | Highest, High, Medium, Low, Lowest (valori Jira) |
| **data_fine_desiderata** | Data (nullable) | CSV: Due date | Data di consegna desiderata. Formato Jira: `DD/Mon/YY HH:MM AM/PM` (es. "31/Jul/26 12:00 AM"), convertita in data |
| **data_inizio_pianificata** | Data | Sistema | Data di inizio calcolata dall'applicazione |
| **data_fine_pianificata** | Data | Sistema | Data di fine calcolata |
| **stima_gg** | Decimale (nullable) | CSV: Original estimate | Stima in giorni/uomo, calcolata da Jira Original Estimate (in secondi) ÷ 28800 (8 ore/giorno). Può essere vuota se Jira non ha una stima |
| **valore_economico** | Stringa (nullable) | CSV: Valore economico stimato | Valore così come estratto da Jira (es. "30k - 40k", "> 40k", "5k - 10k"). Può essere vuoto |
| **richiedente** | Stringa (nullable) | CSV: Richiedente | Persona o ente che ha richiesto l'intervento |
| **data_richiesta** | Data (nullable) | CSV: Data richiesta | Data in cui la richiesta è stata formalizzata |
| **tenant** | Stringa (nullable) | CSV: Tenant | Tenant di riferimento (es. "Tutti", "RAS", "ASPAL", "FORESTAS") |
| **corsia_urgenza** | Stringa (nullable) | CSV: Corsia d'urgenza | Motivazione dell'urgenza (es. "Scadenza normativa", "Integrazione sistema terzo"). "No" equivale a nessuna urgenza |
| **engineering_excellence** | Stringa (nullable) | CSV: Engineering Excellence (.1, .2) | Coinvolgimenti EE, concatenati con virgola se multipli (es. "AI, DevEx, UI/UX"). "No" equivale a nessun coinvolgimento |
| **sizing_sviluppo** | Stringa (nullable) | CSV: Sizing Sviluppo | Taglia di sizing sviluppo (es. "M (15 - 50 gg)", "L (50 - 150 gg)") |
| **polarita_sizing_sviluppo** | Stringa (nullable) | CSV: Polarità Sizing Sviluppo | Polarità del sizing sviluppo |
| **sizing_analisi** | Stringa (nullable) | CSV: Sizing Analisi | Taglia di sizing analisi |
| **polarita_sizing_analisi** | Stringa (nullable) | CSV: Polarità Sizing Analisi | Polarità del sizing analisi |
| **affidabilita_stima** | Stringa (nullable) | CSV: Affidabilità della stima | Indicatore di affidabilità della stima |
| **analisi_ptf** | Stringa (nullable) | CSV: Analisi PTF | Risultato dell'analisi PTF |
| **figure_necessarie** | Testo (nullable) | CSV: Figure necessarie | Fabbisogno di figure professionali |
| **vincoli_criticita** | Testo (nullable) | CSV: Vincoli e/o criticità | Note su vincoli e criticità |
| **in_riuso_da** | Stringa (nullable) | CSV: In riuso da | Progetto da cui l'iniziativa è in riuso |
| **stato_jira** | Stringa | CSV: Status | Stato originale dell'epica Jira (es. "Stimato", "Approvato", "Rejected", "To Do", "Studio fattibilità", "Pronta per la stima") |
| **status** | Enum | Sistema | Stato interno calcolato dalla macchina a stati (sezione successiva) |
| **note** | Testo (nullable) | Sistema | Unico campo modificabile dall'utente: note libere del D&R Manager |

> **Dati non modificabili:** tutti i campi importati da CSV sono **di sola lettura** nell'interfaccia utente. L'unico campo editabile dall'utente è `note`. Gli aggiornamenti ai dati dell'iniziativa avvengono esclusivamente tramite re-import CSV.

##### Macchina a stati dell'iniziativa

Le iniziative entrano nel sistema tramite **import CSV** (sezione 13.8). Lo `stato_jira` determina lo stato interno. Le transizioni avvengono in parte da import e in parte su azione del D&R Manager (allocazioni).

**Mapping stato Jira → stato interno:**

| Stato Jira | Stato interno | Descrizione |
| :---- | :---- | :---- |
| To Do | **To Do** | L'iniziativa è stata registrata ma non è ancora in lavorazione. Non pianificabile |
| Studio fattibilità | **Studio Fattibilità** | L'iniziativa è in fase di analisi di fattibilità. Non pianificabile |
| Pronta per la stima | **Pronta per la Stima** | L'iniziativa è pronta per essere stimata. Non pianificabile |
| Stimato | **Attesa di Allocazione** | L'iniziativa è stata stimata ed è pronta per essere pianificata. Il D&R Manager può creare allocazioni con **soft lock** |
| Approvato | **Confermato Hard Lock** | L'approvazione contrattuale è arrivata. Le allocazioni soft devono essere convertite in **hard lock** |
| Rejected | **Rejected** | L'iniziativa è stata rifiutata. Il sistema segnala le allocazioni attive da rilasciare con **conferma manuale** del D&R Manager |

**Stati interni calcolati (non derivati da Jira):**

| Stato interno | Condizione |
| :---- | :---- |
| **Allocato Soft Lock** | Almeno un'allocazione soft lock copre l'intero `stima_gg` |
| **Pending Resources** | Le allocazioni (soft o hard) non coprono l'intero `stima_gg` |
| **Completato** | Raggiunta la `data_fine` dell'ultima allocazione attiva |

> **Stati non pianificabili:** le iniziative in stato To Do, Studio Fattibilità e Pronta per la Stima sono visibili nel sistema ma il D&R Manager **non può creare allocazioni** su di esse. Diventano pianificabili solo quando lo stato Jira passa a "Stimato" (o superiore) tramite re-import CSV.

**Transizioni:**

```
To Do / Studio Fattibilità / Pronta per la Stima
    → Attesa di Allocazione              (re-import CSV con stato Jira "Stimato")
    → Confermato Hard Lock               (re-import CSV con stato Jira "Approvato")
    → Rejected                           (re-import CSV con stato Jira "Rejected")

Attesa di Allocazione
    → Allocato Soft Lock                 (allocazioni soft coprono stima_gg)
    → Pending Resources                  (allocazioni soft non coprono stima_gg)

Allocato Soft Lock
    → Confermato Hard Lock               (re-import CSV con stato Jira "Approvato")
    → Pending Resources                  (allocazione rimossa/ridotta)
    → Rejected                           (re-import CSV con stato Jira "Rejected")

Confermato Hard Lock
    → Completato                         (data_fine ultima allocazione raggiunta)
    → Pending Resources                  (allocazione rimossa/ridotta)

Pending Resources
    → Allocato Soft Lock                 (allocazioni soft coprono stima_gg)
    → Confermato Hard Lock               (allocazioni hard coprono stima_gg)

Qualsiasi stato → Rejected              (re-import CSV con stato Jira "Rejected")
```

> **Re-import:** quando un'iniziativa già presente nel sistema (match per `issue_key`) viene re-importata tramite CSV, i dati vengono aggiornati. Se l'aggiornamento introduce **anomalie** (variazione della stima, cambio delle date, cambio di priorità o tipologia), l'aggiornamento viene **bloccato** e richiede la **conferma del D&R Manager** prima di essere applicato. Il sistema evidenzia le differenze tra i dati esistenti e quelli importati (sezione 13.8).

> **Rejected con allocazioni attive:** quando un'iniziativa passa a Rejected e ha allocazioni attive (soft o hard lock), il sistema non le rilascia automaticamente. Viene generato un alert che elenca le allocazioni da rilasciare e il D&R Manager le rilascia manualmente, una per una o in blocco, dopo aver verificato l'impatto sulla pianificazione.

#### Risorsa

Rappresenta una persona della BU.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **id_dipendente** | Stringa | Identificativo del dipendente nel sistema HR aziendale. Chiave di raccordo con l'anagrafica HR |
| **nome** | Stringa | Nome della persona |
| **cognome** | Stringa | Cognome della persona |
| **tipologia** | Enum | Interna, Esterna |
| **appartenenza** | Enum | BU Documentale, Engineering Excellence |
| **is_ptf** | Booleano | Indica se la risorsa è membro del **PTF** (**Presidio Tecnico Funzionale**) |
| **attivo** | Booleano | Indica se la risorsa è attualmente attiva nella BU. Calcolato automaticamente: `false` se la `data_fine_validita` del Parametro risorsa vigente è passata e non esiste un record successivo, `true` altrimenti. Può essere forzato manualmente dal D&R Manager (es. per disattivare una risorsa anticipatamente). Le risorse non attive non compaiono nelle viste operative ma restano consultabili nello storico. L'applicazione genera un alert quando allocazioni esistenti superano la `data_fine_validita` del parametro vigente e impedisce nuove allocazioni oltre tale data |
| **data_ingresso_bu** | Data | Data di ingresso nella BU |
| **note** | Testo | Note libere (competenze particolari, vincoli) |

> **Nominativo:** il campo `nominativo` (cognome + nome) non è memorizzato ma costruito dall'applicazione come `cognome + " " + nome` dove necessario (viste, export, match con CSV). Nelle viste compatte (pivot, tabelle) la risorsa è rappresentata da un **badge** con le iniziali e tooltip con il nome completo.

> **Risorse esterne:** le risorse esterne (consulenti, fornitori) sono trattate come qualsiasi altra risorsa ai fini della pianificazione e della saturazione. La distinzione interna/esterna alimenta le dashboard per permettere analisi sul mix di risorse e sul costo (le risorse esterne hanno tipicamente un costo giornata diverso).

> **Risorse di Engineering Excellence:** le risorse che appartengono a **Engineering Excellence** (sezione 9 del Draft) vengono allocate sulle iniziative della BU Documentale quando il PTF rileva la necessità di un coinvolgimento architetturale o trasversale (flag "Coinvolgimento EE" nell'epica). La loro capacità allocabile è gestita dall'applicazione con gli stessi vincoli delle risorse della BU, ma il D&R Manager deve tenere conto che queste risorse hanno anche impegni fuori dal perimetro della BU Documentale, non visibili nell'applicazione. La percentuale di allocazione massima effettiva va concordata con il responsabile di Engineering Excellence.

Gli attributi **ruolo**, **livello**, **ore settimanali**, **costo giornata** e **coefficiente di produttività** sono temporalizzati: possono variare nel tempo senza incidere sul passato. Vengono gestiti tramite l'entità **Parametro risorsa**.

#### Parametro risorsa

Storico temporalizzato degli attributi variabili di una risorsa. Una variazione di ruolo, livello, ore settimanali, costo giornata o coefficiente di produttività crea un nuovo record con la data di inizio validità; il record precedente viene chiuso con la data di fine. Le allocazioni passate e presenti continuano a fare riferimento ai valori vigenti nel loro periodo, non ai valori aggiornati.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **risorsa** | FK → Risorsa | |
| **ruolo** | Enum | Analista Funzionale, Analista HD1, SAP HD1, Tech Leader, Analista HD2, Senior Dev, Developer, SAP Consultant, Resp. BU, UI/UX, DevOps, Project Manager, Architect. Ruolo della risorsa nel periodo di validità |
| **livello** | Enum | Junior, Mid, Senior. Livello di seniority nel periodo di validità |
| **ore_settimanali** | Decimale | Ore teoriche settimanali della risorsa nel periodo di validità |
| **costo_giornata** | Decimale | Costo giornaliero della risorsa in euro nel periodo di validità |
| **coefficiente_produttivita** | Decimale | Fattore moltiplicativo rispetto al baseline mid-level (default: 1.0). Un junior potrebbe avere 1.3 (impiega il 30% in più di giorni), un senior 0.85 (impiega il 15% in meno). Impatta la pianificazione temporale, non il costo giornata |
| **buffer_ore_settimanali** | Decimale (nullable) | Override del buffer globale BU per questa specifica risorsa nel periodo di validità. Se `null`, si applica il valore globale dalla Configurazione BU. Esempio: una risorsa PTF con 40 ore teoriche e buffer override di 16 ore ha solo 24 ore allocabili (contro le 32 di una risorsa standard con buffer globale di 8 ore) |
| **data_inizio_validita** | Data | Inizio della validità di questi parametri |
| **data_fine_validita** | Data (nullable) | Fine della validità di questi parametri (null = valido correntemente). Viene chiusa automaticamente dal sistema quando si inserisce un nuovo record di parametri per la stessa risorsa |

> **Regola di non retroattività:** quando il D&R Manager inserisce un nuovo parametro con data di inizio futura o odierna, il sistema chiude automaticamente il record precedente alla data precedente. I calcoli storici (costo consuntivato di un'iniziativa completata in passato) restano ancorati ai parametri vigenti in quel periodo. Solo i calcoli dal giorno di validità del nuovo parametro in poi riflettono i nuovi valori.

> **Esempio:** una risorsa passa da 40 ore settimanali a 36 ore dal 1° settembre 2026. Il record vigente (40h, dal 1° gennaio 2026) viene chiuso al 31 agosto 2026. Un nuovo record (36h, dal 1° settembre 2026, fine = null) diventa il riferimento corrente. Le allocazioni di agosto restano calcolate su 40h; quelle di settembre in poi su 36h.

> **Il coefficiente di produttività ("handicap"):** le stime del PTF sono calibrate su un profilo **mid-level** (coefficiente 1.0). Quando il D&R Manager assegna una risorsa con coefficiente diverso da 1.0, l'applicazione ricalcola automaticamente l'effort effettivo dell'allocazione:
>
> ```
> Effort Effettivo (Allocazione A) = Effort Allocato GG (A) × Coefficiente Produttività (Risorsa)
> ```
>
> **Esempio:** un'iniziativa stimata 20 giorni/uomo per 1 FE mid-level. Se il D&R Manager assegna un FE junior con coefficiente 1.3, l'effort effettivo diventa 26 giorni. La **data di fine** dell'allocazione si sposta di conseguenza, perché la stessa percentuale di allocazione richiede più settimane per completare il lavoro. Il costo complessivo cambia solo se il costo giornata del junior è diverso da quello del mid.
>
> Questo meccanismo consente al D&R Manager di vedere immediatamente l'impatto sulla pianificazione temporale quando non dispone del profilo ideale, e di prendere decisioni informate: accettare il ritardo, assegnare una percentuale di allocazione maggiore, oppure aggiungere una seconda risorsa.
>
> Il coefficiente è temporalizzato come le ore settimanali e il costo giornata: un junior che nel tempo acquisisce competenze può vedere il suo coefficiente scendere da 1.3 a 1.1 senza che le allocazioni passate vengano ricalcolate.

#### Allocazione

Assegnazione di una **Risorsa** a un'**Iniziativa** per un periodo specifico. È il record che alimenta la vista pivot e il calcolo della saturazione. Corrisponde al concetto di prenotazione (soft lock) o assegnazione confermata (hard lock) descritto nella sezione 13 del documento di riferimento.

> **Nota:** l'iniziativa esprime il fabbisogno generico ("servono 2 FE"); l'allocazione è l'atto con cui il Demand & Resource Manager assegna una persona specifica a quell'iniziativa per una finestra temporale e una percentuale di impegno.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **iniziativa** | FK → Iniziativa | |
| **risorsa** | FK → Risorsa | |
| **tipo_lock** | Enum | Soft, Hard |
| **soft_lock_scadenza** | Data (nullable) | Data di scadenza del soft lock. Obbligatoria se `tipo_lock = Soft`, null se Hard. Alla scadenza l'applicazione genera un alert al D&R Manager |
| **percentuale_allocazione** | Intero (1-100) | Percentuale di tempo della risorsa dedicata a questa iniziativa. **Input del D&R Manager** |
| **data_inizio** | Data | Data di inizio dell'allocazione. **Input del D&R Manager** |
| **data_fine** | Data | Data di fine dell'allocazione. **Input del D&R Manager** |
| **effort_allocato_gg** | Decimale | Giorni/uomo allocati per questa risorsa su questa iniziativa. **Calcolato automaticamente:** `giorni_lavorativi(data_inizio, data_fine) × percentuale_allocazione / 100`. Non inserito manualmente |
| **ruolo_nell_iniziativa** | Enum | Stessa enum del campo `ruolo` dell'entità Parametro risorsa (Analista Funzionale, Analista HD1, SAP HD1, Tech Leader, Analista HD2, Senior Dev, Developer, SAP Consultant, Resp. BU, UI/UX, DevOps, Project Manager, Architect). Indica quale ruolo ricopre la risorsa in questa specifica iniziativa (può coincidere con il ruolo principale o differire) |
| **affiancamento** | Booleano | Se true, questa allocazione è una leva di crescita (sezione 8.2 del Draft): la risorsa lavora sull'iniziativa in affiancamento con un senior o viceversa |
| **is_senior_affiancamento** | Booleano | Se true e `affiancamento = true`, questa allocazione è il senior che affianca (la risorsa affianca un junior sulla stessa iniziativa) |
| **note** | Testo | Note libere |

> **Modello di input:** il D&R Manager inserisce **percentuale di allocazione** e **date** (inizio e fine); l'applicazione calcola automaticamente l'**effort in giorni/uomo**. Questo riflette il modo naturale di pianificare: "questa risorsa lavora al 50% su questa iniziativa da settembre a ottobre" → l'app calcola che sono 22 giorni/uomo. Se la percentuale o le date cambiano, l'effort si ricalcola in tempo reale.

> **Soft lock vs hard lock:** un'allocazione di tipo **soft** indica una prenotazione temporanea di quella specifica risorsa per quell'iniziativa, in attesa di conferma contrattuale (sezione 13 del Draft). Ogni allocazione soft ha la propria **data di scadenza** (`soft_lock_scadenza`): alla scadenza l'applicazione genera un alert. Il D&R Manager può convertire l'allocazione in **hard** quando l'approvazione arriva, estendere la scadenza, oppure rimuoverla liberando la risorsa. Nella vista pivot, le allocazioni soft sono visualizzate con codifica visiva distinta (tratteggio) rispetto alle hard.

> **Affiancamento:** quando un'allocazione ha il flag **affiancamento** attivo, l'applicazione consente di creare una seconda allocazione sulla stessa iniziativa con `is_senior_affiancamento = true` per il senior che affianca. Le due allocazioni sono collegate visivamente nella pivot. Il soft lock e la scadenza sono gestiti a livello di singola allocazione, così risorse diverse sulla stessa iniziativa possono avere lock di tipo diverso (es. il senior è già confermato in hard, il junior è ancora in soft lock in attesa di contratto).

#### Profilo di competenza (vista calcolata)

Il **profilo di competenza** di una risorsa è una vista calcolata automaticamente dallo storico delle allocazioni completate. Non è un'entità persistente, ma un aggregato derivato in tempo reale.

Per ogni risorsa, l'applicazione calcola:

```
Competenza (Risorsa R, Applicativo A, Modulo M) =
    Σ effort_allocato_gg delle Allocazioni di R
    su Iniziative completate con applicativo = A e modulo = M
```

La competenza si esprime come **distribuzione percentuale** dell'effort totale completato dalla risorsa, raggruppato a due livelli:

- **Livello applicativo:** percentuale di effort su ciascun applicativo rispetto al totale (es. SibarDoc 60%, Protocollo 40%)
- **Livello modulo:** se le iniziative hanno il modulo valorizzato, il dettaglio si spinge al modulo all'interno dell'applicativo (es. SibarDoc: Firma 70%, Conservazione 30%)

> **Drill-down sullo storico:** dal profilo di competenza di una risorsa, il D&R Manager può espandere ogni riga applicativo/modulo per visualizzare l'**elenco delle iniziative completate** che hanno contribuito a quella competenza. Per ogni iniziativa vengono mostrati: titolo, tipologia (MEV/MAD), effort allocato in giorni, periodo dell'allocazione e **link diretto all'epica Jira** (costruito dall'`id_jira_epica` dell'iniziativa). Questo consente di verificare nel dettaglio la natura e la complessità del lavoro svolto prima di decidere l'assegnazione.

> **Suggerimento risorse:** quando il D&R Manager crea una nuova allocazione per un'iniziativa, l'applicazione mostra un **ranking delle risorse disponibili** ordinato per:
>
> 1. **Competenza** — percentuale di effort storico sull'applicativo+modulo dell'iniziativa (match più specifico prevale: modulo > applicativo)
> 2. **Disponibilità** — capacità allocabile residua nel periodo dell'iniziativa
> 3. **Ruolo compatibile** — corrispondenza tra il ruolo della risorsa e le figure necessarie dell'iniziativa
>
> Il ranking è un **suggerimento**, non un vincolo: il D&R Manager può sempre scegliere una risorsa diversa da quella suggerita (ad esempio per favorire la crescita di competenze tramite affiancamento).

> **Nota:** il profilo di competenza si costruisce nel tempo con l'utilizzo dell'applicazione. All'avvio del sistema, lo storico è vuoto e il suggerimento si basa solo su disponibilità e ruolo. Il D&R Manager può accelerare la costruzione del profilo inserendo iniziative storiche pregresse con le relative allocazioni, ma non è un requisito.

---

#### Vincolo di capacità settimanale

L'applicazione impedisce che la somma delle allocazioni di una risorsa in una settimana superi la sua **capacità allocabile settimanale**, calcolata con la formula seguente:

```
Capacità Allocabile (settimana S, risorsa R) =
    Ore Settimanali (R, alla data S)
    − Buffer Effettivo (R, alla data S)
    − Ore Assenza Pianificate (R, settimana S)
```

Dove:

- **Ore Settimanali** è il valore vigente dal Parametro risorsa alla data della settimana S
- **Buffer Effettivo** è determinato con la regola: se il Parametro risorsa vigente alla data S ha un `buffer_ore_settimanali` valorizzato, si usa quello (override per risorsa); altrimenti si usa il `buffer_ore_settimanali` dalla Configurazione BU (default globale). Il buffer assorbe riunioni non pianificate, **context switching** e imprevisti (coerente con la fascia residua del 15-25% descritta nella sezione 8.4 del Draft). L'override consente di differenziare risorse con impegni strutturali diversi — ad esempio le risorse PTF, il cui tempo dedicato alle sessioni settimanali, alla review e alle attività trasversali riduce significativamente la capacità allocabile
- **Ore Assenza Pianificate** è la somma delle ore di assenza della risorsa nella settimana S, derivata dall'import Factorial

La **percentuale di saturazione** della risorsa nella settimana S è:

```
Saturazione % = (Somma Ore Allocate nella settimana S / Capacità Allocabile) × 100
```

Dove le ore allocate si calcolano come:

```
Ore Allocate (allocazione A, settimana S) =
    Ore Settimanali (R, alla data S) × Percentuale Allocazione (A) / 100
```

Quando il D&R Manager crea o modifica un'allocazione, l'applicazione:

- **calcola in tempo reale** la saturazione risultante per ogni settimana del periodo dell'allocazione
- **segnala** (**warning**) se la saturazione supera il 100% in una o più settimane, indicando le settimane interessate e la percentuale di sforamento
- se il D&R Manager conferma, l'allocazione viene salvata comunque — l'applicazione **non blocca** la sovra-allocazione, ma la registra e la evidenzia nella vista pivot con codifica visiva specifica (es. 🔴 rosso). La sovra-allocazione consapevole è ammessa per gestire picchi temporanei, risorse in fase di ramp-up su attività a basso impegno effettivo, o stime conservative che lasciano margine reale

#### Vincolo di durata contrattuale

L'applicazione verifica che la data di fine di un'allocazione non superi la data di fine del contratto a cui afferisce l'iniziativa. Questo vincolo è un **warning con conferma**, non un blocco: un'attività già approvata e pagata potrebbe legittimamente proseguire oltre la scadenza formale del contratto.

Quando il D&R Manager crea o modifica un'allocazione, l'applicazione:

- **verifica** che `data_fine (allocazione) ≤ data_fine (contratto dell'iniziativa)`
- **segnala** (**warning**) se il vincolo non è rispettato, mostrando la data di fine del contratto e la differenza in giorni di sforamento
- se il D&R Manager conferma, l'allocazione viene salvata comunque — lo sforamento è registrato e evidenziato nella vista pivot
- **segnala in anticipo** (warning) se la data di fine dell'allocazione cade negli ultimi 30 giorni del contratto, per dare visibilità sulla prossimità alla scadenza

Il vincolo si applica anche in cascata: se il coefficiente di produttività di una risorsa fa aumentare l'effort effettivo e di conseguenza la data di fine dell'allocazione supera la scadenza del contratto, l'applicazione segnala e suggerisce le alternative (aumentare la percentuale di allocazione, aggiungere una seconda risorsa, rinegoziare i termini).

> **Rinnovi contrattuali:** quando un contratto viene rinnovato (nuovo record con date estese), le iniziative possono essere riassegnate al nuovo contratto e il vincolo si ricalcola sulle nuove date. Il D&R Manager esegue questa operazione manualmente per mantenere la tracciabilità.

#### Calcolo del costo previsto dell'iniziativa

L'applicazione calcola automaticamente il **costo previsto** di un'iniziativa sommando il costo di tutte le sue allocazioni:

```
Costo Previsto (Iniziativa I) =
    Σ per ogni Allocazione A di I:
        Effort Allocato GG (A) × Costo Giornata (Risorsa di A, vigente nel periodo di A)
```

Questo valore è confrontabile con l'importo del contratto di riferimento e con il valore economico stimato dell'iniziativa. Se il costo previsto supera il valore economico stimato, l'applicazione genera un alert.

### 3.2 Entità di supporto

#### Assenza

Record di ferie o assenza importato da **Factorial**. Ogni record rappresenta un singolo giorno di assenza (o mezza giornata), coerentemente con il formato del CSV di import (sezione 5).

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **risorsa** | FK → Risorsa | Match per nominativo costruito come `cognome + " " + nome` dal campo `nominativo` del CSV |
| **giorno** | Data | Data dell'assenza (singolo giorno) |
| **ore_assenza** | Decimale | Ore di assenza nella giornata (8 = giornata intera, 4 = mezza giornata) |
| **tipo** | Enum | Ferie, Malattia, Permesso, Altro |
| **fonte** | Enum | Factorial, Jira | Indica se il record proviene dall'import Factorial o dal filtro assenze dell'import consuntivo Jira (sezione 6.3) |
| **note** | Testo | |

#### Configurazione BU

Parametri globali dell'applicazione.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **budget_annuale** | Decimale | Budget annuale della BU in euro — usato come riferimento per l'alert Pipeline Value > 20% (sezione 14.2 del Draft) |
| **buffer_ore_settimanali** | Decimale | Valore di default del buffer settimanale (in ore) sottratto dalla capacità teorica di ogni risorsa per assorbire riunioni, **context switching** e imprevisti (coerente con la fascia residua del 15-25% della sezione 8.4 del Draft). Si applica a tutte le risorse che non hanno un override specifico nel proprio Parametro risorsa. Esempio: 8 ore su 40 teoriche = 20% di buffer |
| **saturazione_min** | Intero | Soglia minima della fascia ottimale in percentuale (default: 75%). Sotto questa soglia la risorsa è in sotto-utilizzo |
| **saturazione_max** | Intero | Soglia massima della fascia ottimale in percentuale (default: 100%). Il buffer settimanale assorbe già il margine operativo, quindi la fascia ottimale copre tutta la capacità allocabile |
| **saturazione_allarme** | Intero | Soglia di sovra-allocazione critica in percentuale (default: 110%). Oltre questa soglia l'applicazione genera un alert |

#### Snapshot settimanale

Fotografia dei dati aggregati per alimentare i grafici di trend nelle dashboard.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **data_snapshot** | Data | Data dello snapshot (generato automaticamente ogni lunedì) |
| **saturazione_media_bu** | Decimale | Saturazione media della BU alla data |
| **risorse_per_fascia** | JSON | Distribuzione risorse per fascia di saturazione |
| **pipeline_value_soft_lock** | Decimale | Valore totale in soft lock alla data |
| **richieste_pending_resources** | Intero | Numero di iniziative in stato "Pending Resources" |

#### Audit log *(post-MVP)*

> **Scope:** questa funzionalità è prevista per una fase successiva al MVP. L'entità e la logica sono specificate qui per completezza ma non saranno implementate nella prima versione.

Registro di tutte le operazioni di modifica effettuate nell'applicazione. Ogni azione che crea, modifica o cancella un'entità genera automaticamente un record di audit. L'audit log è consultabile dalla sezione **Impostazioni** (sezione 11.2).

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **timestamp** | Datetime | Data e ora dell'operazione |
| **utente** | Stringa | Email dell'utente che ha eseguito l'operazione (dall'autenticazione Google) |
| **azione** | Enum | Creazione, Modifica, Cancellazione, Import |
| **entita** | Stringa | Nome dell'entità coinvolta (es. "Risorsa", "Allocazione", "Parametro risorsa") |
| **id_entita** | UUID | Identificativo del record coinvolto |
| **descrizione_entita** | Stringa | Descrizione leggibile del record (es. "Rossi Mario", "Iniziativa AIC-2234") per facilitare la consultazione senza dover risalire al record originale |
| **valore_pre** | JSON (nullable) | Stato dei campi prima della modifica (null per le operazioni di creazione) |
| **valore_post** | JSON (nullable) | Stato dei campi dopo la modifica (null per le operazioni di cancellazione) |

> **Granularità:** per le operazioni di import massivo (risorse, parametri risorsa, assenze, consuntivo), viene generato un record di audit per ogni riga importata, con `azione = Import`. Il `valore_pre` contiene il valore precedente (se il record esisteva), il `valore_post` il valore importato.

> **Retention:** i record di audit non vengono mai cancellati automaticamente. La policy di retention è definita dall'amministratore e può essere implementata in una fase successiva.

### 3.3 Relazioni principali

```
erDiagram
    CLIENTE ||--o{ CONTRATTO : "ha"
    APPLICATIVO }o--o{ CONTRATTO : "coperto da"
    APPLICATIVO }o--o{ RISORSA : "ha PM"
    APPLICATIVO ||--o{ MODULO : "composto da"
    APPLICATIVO ||--o{ INIZIATIVA : "ha"
    MODULO |o--o{ INIZIATIVA : "riguarda (opz.)"
    CONTRATTO ||--o{ INIZIATIVA : "finanzia"
    INIZIATIVA ||--o{ ALLOCAZIONE : "assegnata tramite"
    RISORSA ||--o{ ALLOCAZIONE : "lavora su"
    RISORSA ||--o{ PARAMETRO_RISORSA : "ha parametri"
    RISORSA ||--o{ ASSENZA : "ha"
    RISORSA ||--o{ CONSUNTIVO : "consuntiva"
    INIZIATIVA ||--o{ CONSUNTIVO : "consuntivata da"
```

> **Lettura delle relazioni:** un **Applicativo** è coperto da uno o più **Contratti** (e un contratto può coprire più applicativi) e ha uno o più **PM** assegnati (relazione N:N con Risorsa). Ogni **Iniziativa** afferisce a un applicativo e a un contratto, e può opzionalmente essere collegata a un **Modulo** dell'applicativo per il tracciamento delle competenze. L'**Allocazione** è il ponte tra Iniziativa e Risorsa: una stessa iniziativa può avere più allocazioni (più persone ci lavorano), e una stessa risorsa può avere più allocazioni contemporanee (lavora su più iniziative con percentuali diverse), purché la somma non superi la capacità allocabile settimanale. I **Parametri risorsa** sono temporalizzati: ore settimanali, costo giornata, coefficiente di produttività e buffer individuale possono variare senza incidere sui calcoli passati. Il **profilo di competenza** di ogni risorsa si costruisce automaticamente dallo storico delle allocazioni completate, espresso come distribuzione percentuale per applicativo e modulo.

---

## 4. Integrazione Jira (sola lettura)

### 4.1 Principio

**Jira è il sistema master.** L'applicazione legge dati da Jira tramite **REST API** per alimentare il Resource Plan con informazioni aggiornate sulle epiche e sul consuntivo. L'applicazione non scrive mai su Jira.

### 4.2 Dati importati

| Dato Jira | Campo destinazione | Canale di import |
| :---- | :---- | :---- |
| **Epiche stimate/approvate/rejected** | Iniziativa (creazione o aggiornamento) | Import CSV iniziative (sezione 13.8) |
| **Stato dell'epica** (Stimato, Approvato, Rejected) | Iniziativa.status (secondo macchina a stati sezione 3.1) | Import CSV iniziative |
| **Worklog** (stimato e consuntivato per epica) | Dati per il calcolo dell'accuratezza delle stime | Import CSV consuntivo |
| **Priorità dell'epica** | Iniziativa.priorita | Import CSV iniziative |
| **Data di consegna desiderata** (Due Date) | Iniziativa.data_fine_desiderata | Import CSV iniziative |
| **Taglia sizing** | Iniziativa.taglia_sizing | Import CSV iniziative |
| **Valore economico stimato** | Iniziativa.valore_economico | Import CSV iniziative |

### 4.3 Mapping dei campi Jira

Il mapping esatto dipende dalla configurazione dei campi custom su Jira (sezione 17.2 del Draft). I campi da mappare includono:

- **Service Type** → Tipologia intervento (MAD/MEV)
- **Componente Progetto** e **Componenti Modulo** → Contesto di progetto
- **Priorità** → Iniziativa.priorita
- **Due Date** → Iniziativa.data_fine_desiderata
- Campo custom **Valore Economico** → Iniziativa.valore_economico
- Campo custom **Corsia d'urgenza** → Flag informativo
- Campo custom **Coinvolgimento EE** → Flag informativo

### 4.4 Regole di sincronizzazione

- La sincronizzazione è **giornaliera automatica** (schedulata) con possibilità di **sincronizzazione manuale** su richiesta del Demand & Resource Manager.
- In caso di conflitto tra il dato Jira e il dato presente nell'applicazione, il dato Jira prevale per i campi che Jira governa (stato epica, worklog, priorità). I campi che l'applicazione governa (allocazione risorsa puntuale, percentuale di allocazione, date pianificate) non vengono sovrascritti dalla sincronizzazione.
- La sincronizzazione registra un **log** con timestamp, numero di record aggiornati e eventuali errori, accessibile al Demand & Resource Manager.

---

## 5. Import assenze da Factorial

### 5.1 Modalità

Il Demand & Resource Manager estrae settimanalmente un file CSV da **Factorial** contenente le assenze pianificate di tutte le persone della BU. Il formato del file è:

```
nominativo;giorno;ore_assenza
Rossi Mario;2026-09-01;8
Bianchi Anna;2026-09-15;4
```

Dove **nominativo** è cognome e nome, **giorno** è la data in formato `YYYY-MM-DD` e **ore_assenza** sono le ore di assenza nella giornata (8 = intera, 4 = mezza giornata).

L'applicazione offre una funzione di **import da file** che:

- legge il CSV e mappa i record alle risorse presenti nel sistema tramite **match per nominativo** (costruito come `cognome + " " + nome`)
- segnala eventuali **risorse non trovate** (nominativo non corrispondente a nessuna risorsa in anagrafica) per correzione manuale
- aggiorna o crea i record di assenza senza duplicare quelli già importati in precedenza (deduplicazione per risorsa + data: se già presente, aggiorna il valore ore_assenza)
- mostra un **riepilogo dell'import** prima della conferma: record nuovi, record aggiornati, record ignorati, errori

### 5.2 Impatto sulla pianificazione

Le assenze importate riducono automaticamente la **capacità disponibile** della risorsa nelle settimane interessate. Il calcolo della saturazione tiene conto delle assenze: una risorsa con cinque giorni di ferie in una settimana ha zero giorni disponibili, non cinque giorni da sottrarre alla saturazione.

---

## 6. Consuntivo e accuratezza delle stime

### 6.1 Principio

Il **flusso di ritorno** chiude il ciclo di pianificazione: le ore effettivamente spese dalle risorse sulle iniziative vengono caricate periodicamente nell'applicazione e confrontate con le macro-stime iniziali. Lo scostamento — positivo (sottostima) o negativo (sovrastima) — misura l'accuratezza del processo di stima e alimenta la dashboard dedicata (sezione 9.2).

### 6.2 Entità: consuntivo

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **iniziativa** | FK → Iniziativa | Iniziativa su cui sono state consuntivate le ore (derivata dal mapping issue → epica) |
| **risorsa** | FK → Risorsa | Risorsa che ha lavorato sull'iniziativa (match per nominativo costruito da `cognome + " " + nome`, dal campo `User` del CSV) |
| **periodo** | Stringa | Periodo di riferimento del consuntivo, derivato dal range date del file (es. `2026-08` per agosto 2026) |
| **ore_consuntivate** | Decimale | Ore effettivamente lavorate dalla risorsa sull'iniziativa nel periodo, aggregate dalla somma dei singoli worklog |
| **data_caricamento** | Data | Data in cui il record è stato importato nel sistema |
| **note** | Testo | Note libere |

### 6.3 Import del consuntivo

Il D&R Manager carica periodicamente un file **CSV** estratto dal worklog di Jira. Il file ha il seguente formato (separatore `;`):

```
User;Issue key;Time spent (hours);Issues;Timestamp
Alberto Galli;SAM-133;8;SAM-133: Organizzazione e coordinamento - Alberto Galli;2026-08-01
Alberto Galli;SAM-133;8;SAM-133: Organizzazione e coordinamento - Alberto Galli;2026-08-04
Alberto Galli;AIC-2234;8;AIC-2234: Alberto Galli - Assenza;2026-08-12
```

Dove:

- **User** — nome e cognome della risorsa (match per nominativo costruito come `cognome + " " + nome` dall'anagrafica risorse)
- **Issue key** — chiave della issue Jira (task, story o sub-task, **non necessariamente l'epica**)
- **Time spent (hours)** — ore consuntivate in quel singolo worklog
- **Issues** — campo descrittivo (chiave + titolo), usato solo per log e debugging
- **Timestamp** — data del worklog, consente l'aggregazione per settimana o mese

#### Regole di elaborazione

L'applicazione, in fase di import:

1. **Mapping issue → epica:** la `Issue key` è tipicamente un task o una story, non un'epica. L'applicazione risale alla **epica padre** tramite i dati della sincronizzazione Jira (sezione 4) e mappa le ore sull'iniziativa corrispondente (match per `id_jira_epica`). Se la issue non è riconducibile a nessuna epica nota, il record viene segnalato come "issue non mappata"
2. **Filtro assenze:** i record il cui campo `Issues` contiene la parola "**Assenza**" vengono separati e trattati come ore di assenza, non come consuntivo lavorativo. Possono opzionalmente alimentare l'entità Assenza come integrazione/verifica dell'import Factorial
3. **Aggregazione:** i singoli worklog vengono aggregati per **risorsa + iniziativa + periodo** per produrre i record dell'entità Consuntivo
4. **Deduplicazione:** se un consuntivo per la stessa combinazione risorsa + iniziativa + periodo è già presente, viene aggiornato (somma cumulativa o sostituzione, a scelta del D&R Manager)
5. **Match risorse:** il match è per nominativo (`User` confrontato con `cognome + " " + nome` dall'anagrafica). I nominativi non trovati vengono segnalati per correzione
6. **Riepilogo pre-conferma:** prima del salvataggio, l'applicazione mostra il riepilogo: ore totali per risorsa, ore totali per iniziativa, record non mappati, assenze filtrate

> **Aggregazione temporale:** grazie al campo `Timestamp`, l'applicazione può aggregare i worklog per **settimana** o per **mese** a scelta del D&R Manager, producendo record di consuntivo con granularità diversa. L'aggregazione settimanale consente il confronto diretto con la pianificazione nella vista pivot; quella mensile è più adatta alle dashboard di accuratezza.

### 6.4 Calcolo dello scostamento

Per ogni iniziativa con almeno un record di consuntivo, l'applicazione calcola:

```
Ore Consuntivate Totali (Iniziativa I) =
    Σ ore_consuntivate di tutti i record con iniziativa = I

Stima Pianificata (Iniziativa I) =
    stima_gg (I) × ore_giornata_standard (default: 8h)

Scostamento Assoluto = Ore Consuntivate Totali − Stima Pianificata
Scostamento Percentuale = Scostamento Assoluto / Stima Pianificata × 100
```

- **Scostamento positivo** → sottostima (si è lavorato più del previsto)
- **Scostamento negativo** → sovrastima (si è lavorato meno del previsto)
- **Scostamento zero** → stima perfetta

Il calcolo è disponibile anche a livello di singola risorsa per iniziativa, confrontando le ore consuntivate dalla risorsa con l'effort allocato nell'allocazione corrispondente.

> **Progressivo vs finale:** lo scostamento è significativo a due livelli. Per le iniziative **in lavorazione**, il consuntivo parziale consente di intercettare derive in anticipo (se a metà del lavoro pianificato ho già consumato il 70% delle ore, è un segnale di sottostima). Per le iniziative **completate**, il consuntivo finale è il dato di accuratezza storica che alimenta il miglioramento continuo del processo di stima.

---

## 7. Funzionalità core

### 7.0 Operazioni CRUD e regole di cancellazione

Le entità anagrafiche (Cliente, Applicativo, Modulo, Contratto, Risorsa) e operative (Allocazione, Parametro risorsa, Assenza, Consuntivo) sono **modificabili** e **cancellabili** dal D&R Manager (o dal BU Manager per le entità di sua competenza). Le **Iniziative** sono l'eccezione: vengono importate esclusivamente da CSV Jira (sezione 13.8), i loro dati **non sono modificabili** dall'utente (unico campo editabile: `note`) e **non possono essere cancellate**.

La cancellazione delle entità cancellabili segue una regola uniforme: **nessuna cancellazione a cascata**. Se un'entità ha record collegati, l'applicazione **blocca la cancellazione** e mostra l'elenco delle dipendenze.

| Entità | Modificabile | Cancellabile | Bloccata se esistono... |
| :---- | :---- | :---- | :---- |
| **Cliente** | Sì | Sì | Contratti collegati |
| **Applicativo** | Sì | Sì | Iniziative, Moduli o Contratti collegati |
| **Modulo** | Sì | Sì | Iniziative che lo referenziano |
| **Contratto** | Sì | Sì | Iniziative che lo referenziano |
| **Iniziativa** | Solo campo `note` | **No** | — (non cancellabile; dati aggiornabili solo via re-import CSV) |
| **Risorsa** | Sì | Sì | Allocazioni, Parametri risorsa, Assenze o record di Consuntivo collegati |
| **Allocazione** | Sì | Sì | Nessuna dipendenza — cancellabile liberamente |
| **Parametro risorsa** | Sì | Sì | Nessuna dipendenza — cancellabile liberamente (il sistema ricalcola sulla base dei parametri restanti) |
| **Assenza** | Sì | Sì | Nessuna dipendenza — cancellabile liberamente |
| **Consuntivo** | Sì | Sì | Nessuna dipendenza — cancellabile liberamente |

Per rimuovere un'entità con dipendenze, il D&R Manager deve prima eliminare o riassegnare i record collegati. L'applicazione suggerisce le azioni necessarie nel messaggio di blocco (es. "Impossibile cancellare l'applicativo SibarDoc: esistono 12 iniziative collegate. Rimuovere o riassegnare le iniziative prima di procedere").

> **Modifica:** la modifica di qualsiasi campo è sempre consentita (eccetto le Iniziative, i cui dati provengono da Jira). Per le entità temporalizzate (Parametro risorsa), la modifica segue la regola di non retroattività descritta nella sezione 3.1: i calcoli storici restano ancorati ai valori vigenti nel periodo originale.

### 7.1 I tre orizzonti temporali

L'applicazione implementa i tre orizzonti di pianificazione definiti nella sezione 8.1 del documento di riferimento.

| Orizzonte | Finestra | Livello di dettaglio | Comportamento nell'applicazione |
| :---- | :---- | :---- | :---- |
| **Corto** | 4 settimane | Risorsa individuale, alta precisione | Allocazioni nominative con percentuale. Alert su sovra-allocazione. |
| **Medio** | 8 settimane | Profilo/ruolo, media precisione | Allocazioni possono essere a livello di profilo ("1 Developer Mid") senza risorsa nominativa assegnata. |
| **Lungo** | 12 settimane | Previsionale, bassa precisione | Vista aggregata per progetto e profilo. Utilizzata per anticipare colli di bottiglia di capacity. |

La transizione tra orizzonti è **scorrevole**: man mano che il tempo avanza, le allocazioni dell'orizzonte medio entrano nell'orizzonte corto e richiedono l'assegnazione di una risorsa nominativa. L'applicazione segnala le allocazioni nell'orizzonte medio che stanno per entrare nell'orizzonte corto senza una risorsa assegnata.

### 7.2 Vista pivot per persona e settimana

La vista principale del Resource Plan è la **pivot per persona e settimana** descritta nella sezione 8.1 del Draft. Per ogni risorsa e ogni settimana del periodo visualizzato, la cella della pivot è composta da blocchi visivi distinti:

- **Blocco assenze** — porzione della cella con colore/pattern dedicato (es. grigio tratteggiato) che rappresenta le ore di assenza nella settimana. Questo blocco è sempre visibile e non si sovrappone alle allocazioni: rende immediatamente evidente quanta capacità è sottratta da ferie, permessi o malattia
- **Blocchi allocazioni** — ciascuna allocazione attiva nella settimana è un blocco con il proprio colore (associato all'applicativo o all'iniziativa), con il dettaglio visibile (applicativo, iniziativa, percentuale)
- **Spazio libero** — la porzione rimanente rappresenta la capacità non allocata

La **percentuale di saturazione** è calcolata sulla **capacità disponibile** (al netto delle assenze), non sulla capacità teorica:

```
Capacità Disponibile (settimana S) = Capacità Allocabile − Ore Assenza
Saturazione % = (Ore Allocate / Capacità Disponibile) × 100
```

**Esempio:** una risorsa con 8 ore/giorno ha 2 ore di permesso in un giorno della settimana. La capacità disponibile nella settimana scende da 32 ore (40 − 8 di buffer) a 30 ore. Se vengono allocate 30 ore di lavoro, la saturazione è 100%. Se vengono allocate 0 ore, la saturazione è 0%. Nella cella della pivot si vedono: un blocco grigio per le 2 ore di permesso, i blocchi colorati per le allocazioni e lo spazio vuoto per la capacità libera.

La **codifica colore della saturazione** (soglie configurabili nella Configurazione BU). Il buffer settimanale assorbe già il margine per riunioni, context switching e imprevisti; le stime delle iniziative includono la propria contingency operativa. La soglia ottimale copre quindi quasi tutta la capacità allocabile:

- 🔵 Blu: 0% – 74% (sotto-utilizzo)
- 🟢 Verde: 75% – 100% (fascia ottimale — il buffer ha già assorbito il margine operativo)
- 🟡 Giallo: 101% – 110% (sovra-allocazione lieve, attenzione)
- 🔴 Rosso: >110% (sovra-allocazione critica, alert)

La pivot è **filtrabile** per applicativo, contratto, ruolo, livello, tipologia (interna / esterna) e appartenenza (BU Documentale / Engineering Excellence).

### 7.3 Gestione delle iniziative e delle allocazioni

L'operatività del Resource Plan si svolge su due livelli: l'**iniziativa** (cosa va fatto) e l'**allocazione** (chi lo fa e quando).

**Operazioni sulle iniziative:**

- **Import da CSV** — unico canale di ingresso delle iniziative nel sistema. L'importazione avviene tramite file CSV esportato da Jira (sezione 13.8). Tutti i campi dell'iniziativa (sizing, priorità, date, valore economico, stato, descrizione, ecc.) vengono importati dal file e **non sono modificabili** dall'utente nell'interfaccia. L'unico campo editabile dall'utente è `note`. Il re-import aggiorna le iniziative esistenti con blocco e conferma in caso di anomalie
- **Nessuna creazione manuale** — le iniziative non possono essere create manualmente né cancellate dall'interfaccia. Per inserire una nuova iniziativa è necessario censirla su Jira e procedere con un nuovo import CSV
- **Cambio stato** — le transizioni seguono la macchina a stati definita nella sezione 3.1: Attesa di Allocazione → Allocato Soft Lock → Confermato Hard Lock → Completato; Pending Resources quando l'effort non è coperto; Rejected da import CSV con rilascio allocazioni su conferma del D&R Manager

**Pannello riepilogativo dell'iniziativa:** quando il D&R Manager opera sulle allocazioni di un'iniziativa, l'applicazione mostra in modo permanente un **pannello riepilogativo** con tutti i dati fondamentali dell'iniziativa, così da non dover navigare altrove per recuperare le informazioni necessarie alla pianificazione:

| Dato | Descrizione |
| :---- | :---- |
| **Titolo e applicativo** | Nome dell'iniziativa e applicativo di riferimento |
| **Date** | Data inizio desiderata, data fine desiderata, data inizio pianificata, data fine pianificata |
| **Stima** | Giorni/uomo totali stimati (stima_gg) |
| **Figure necessarie** | Fabbisogno di profili professionali (es. "2 Developer, 1 Senior Dev, 1 Analista Funzionale") |
| **Giorni residui da allocare** | `stima_gg − Σ effort_allocato_gg di tutte le allocazioni attive`. Indica quanti giorni/uomo restano da assegnare. Se il valore è negativo, l'iniziativa è **sovra-allocata** e il pannello lo segnala visivamente (rosso) |
| **Risorse già allocate** | Elenco delle risorse assegnate con ruolo, percentuale, periodo e tipo lock |
| **Contratto** | Identificativo, cliente, data fine contratto |
| **Affidabilità stima** | Valore del campo + eventuali vincoli/criticità |
| **Stato e priorità** | Stato corrente dell'iniziativa e priorità |

Il conteggio dei **giorni residui** è il dato chiave per evitare sovra-allocazione sull'iniziativa: se il D&R Manager ha un'iniziativa da 30 giorni e ha già allocato 20 giorni su due risorse, il pannello mostra "10 gg residui" e quando crea la terza allocazione può calibrare l'effort di conseguenza.

**Operazioni sulle allocazioni:**

- **Assegnazione risorsa** — il D&R Manager crea un'allocazione collegando una risorsa a un'iniziativa, specificando percentuale, date e ruolo
- **Modifica** — aggiornamento di percentuale, date o risorsa assegnata
- **Split** — un'iniziativa può avere più allocazioni su risorse diverse (esempio: un'iniziativa M da 30 giorni divisa su due developer al 50%)
- **Estensione/riduzione** — modifica delle date con ricalcolo automatico dell'effort allocato
- **Scambio risorse** — il **Tech Lead** del team può proporre uno scambio di attività tra le proprie risorse per competenza o continuità (sezione 8.6 del Draft), purché le date di consegna pianificate restino rispettate. L'operazione è tracciata nel log
- **Rimozione** — cancellazione dell'allocazione (la risorsa viene liberata, l'iniziativa torna senza quella risorsa assegnata)

### 7.4 Soft lock e hard lock

Il meccanismo di prenotazione (sezione 13 del Draft) è implementato come attributo dell'**allocazione** (`tipo_lock`):

- **Soft lock** — prenotazione temporanea in attesa di conferma contrattuale. Si attiva quando un'iniziativa in stato "Attesa di Allocazione" (corrispondente allo stato Jira "Stimato") riceve allocazioni dal D&R Manager. Le allocazioni soft **occupano capacità** nella vista pivot (la risorsa risulta impegnata) ma con codifica visiva distinta (tratteggio) per segnalare la provvisorietà. L'iniziativa passa a stato "Allocato Soft Lock" quando le allocazioni coprono l'intero effort stimato.
- **Hard lock** — allocazione confermata. Quando l'approvazione contrattuale arriva (stato Jira "Approvato" nel re-import CSV), l'iniziativa passa a "Confermato Hard Lock" e il D&R Manager converte le allocazioni da soft a hard. Se l'iniziativa viene rifiutata (stato Jira "Rejected"), le allocazioni vengono rilasciate su conferma del D&R Manager.

Ogni allocazione soft ha la propria **data di scadenza** (`soft_lock_scadenza` nell'entità Allocazione). Alla scadenza, l'applicazione genera un alert. Il D&R Manager può estendere la scadenza, convertire in hard o rilasciare l'allocazione liberando la risorsa. Allocazioni diverse sulla stessa iniziativa possono avere scadenze e tipi di lock differenti.

> **Impatto sulla capacità:** sia le allocazioni soft che hard contano nel calcolo della saturazione e nel vincolo di capacità settimanale. Una risorsa con una soft al 50% e una hard al 40% ha il 90% di capacità impegnata. Questo è coerente con il principio del Draft: il soft lock prenota effettivamente la risorsa.

### 7.5 Affiancamento

Quando un'allocazione ha il flag **affiancamento** attivo (sezione 8.2 del Draft), l'applicazione:

- consente di creare una seconda allocazione sulla stessa iniziativa con `is_senior_affiancamento = true` per il **senior che affianca**
- traccia l'effort del senior come **allocazione parziale** sulla stessa iniziativa
- visualizza le due allocazioni come collegate nella pivot (due righe collegate visivamente)

L'affiancamento è una proprietà della singola allocazione (relazione risorsa–iniziativa), non dell'iniziativa: la stessa iniziativa può avere allocazioni con e senza affiancamento su risorse diverse.

### 7.6 Allocazione automatica PM

Ogni applicativo ha uno o più **PM assegnati**. Quando il D&R Manager crea un'allocazione su un'iniziativa, l'applicazione genera automaticamente una o più **allocazioni PM** sugli stessi PM dell'applicativo, con le seguenti regole:

```
Effort PM (Iniziativa I) = Stima GG (I) × Percentuale Effort PM (Contratto di I) / 100
```

La distribuzione tra i PM segue la regola della **ripartizione equa**:

- **1 PM** → riceve il 100% dell'effort PM
- **2 PM** → ciascuno riceve il 50% dell'effort PM
- **N PM** → ciascuno riceve 1/N dell'effort PM

**Esempio:** un'iniziativa stimata 100 giorni, contratto con percentuale effort PM del 5%. L'effort PM è 5 giorni. Se l'applicativo ha 2 PM, ciascuno riceve un'allocazione automatica di 2,5 giorni sulla durata dell'iniziativa.

Le allocazioni PM automatiche:

- vengono create con `ruolo_nell_iniziativa = PM` e lo stesso `tipo_lock` (soft/hard) delle allocazioni operative dell'iniziativa
- hanno la stessa finestra temporale dell'iniziativa (da data_inizio a data_fine)
- **contano nella saturazione** del PM come qualsiasi altra allocazione — questo rende visibile il carico reale dei PM, che spesso è sottostimato
- possono essere modificate manualmente dal D&R Manager dopo la generazione (per ridistribuire il carico tra i PM in modo non equo, se necessario)
- vengono rigenerate automaticamente se la stima dell'iniziativa cambia (con conferma del D&R Manager prima della sovrascrittura)

> **Nota:** la percentuale di effort PM è configurata sul **contratto**, non sull'applicativo, perché contratti diversi hanno complessità amministrativa diversa. Un subappalto PA con rendicontazione pesante può richiedere un 8% di effort PM, mentre un appalto diretto più snello può stare al 3%.

### 7.7 Tracciamento del PTF nel Resource Plan

Come stabilito nella sezione 8.4 del documento di riferimento, l'impegno dei tre membri del **Presidio Tecnico Funzionale** (sessione del mercoledì, validazioni in corso d'opera, task di approfondimento) viene tracciato nel Resource Plan come quello di qualsiasi altro profilo, con la stessa fascia di saturazione ottimale del 75-100%. L'applicazione tratta le risorse con flag `is_ptf = true` come risorse normali ai fini della saturazione, senza eccezioni.

---

## 8. Regole di business automatiche

L'applicazione implementa un sistema di alert che segnala le situazioni che richiedono l'attenzione del Demand & Resource Manager o del BU Manager.

### 8.1 Alert operativi (Demand & Resource Manager)

| Alert | Condizione | Azione suggerita |
| :---- | :---- | :---- |
| **Sovra-allocazione** | Saturazione di una risorsa > soglia di allarme (default 110%, configurabile) per più di due settimane consecutive (sezione 8.4 del Draft) | Ribilanciare le allocazioni o segnalare al BU Manager |
| **Sotto-utilizzo** | Saturazione di una risorsa < 50% per più di due settimane consecutive | Verificare se la risorsa può essere allocata su altre attività |
| **Scadenza soft lock** | Data di scadenza del soft lock superata | Contattare il PM per aggiornamento; estendere o rilasciare |
| **Pending Resources** | Iniziativa in stato "Pending Resources" da più di 2 settimane | Segnalare al BU Manager come problema strutturale di capacity |
| **Iniziativa senza allocazioni** | Iniziativa nell'orizzonte corto (4 settimane) senza alcuna allocazione a risorse nominative | Assegnare le risorse o segnalare il gap |
| **Prossimità scadenza contratto** | Un'allocazione ha data di fine negli ultimi 30 giorni del contratto di riferimento | Verificare con il PM se è previsto un rinnovo o se la pianificazione va compressa |
| **Slittamento per coefficiente** | L'effort effettivo di un'allocazione (ricalcolato con il coefficiente di produttività) fa superare la data di consegna desiderata dell'iniziativa | Valutare: aumentare la percentuale di allocazione, aggiungere una seconda risorsa, o accettare il ritardo |
| **Costo previsto > valore economico** | Il costo previsto dell'iniziativa (somma effort × costo giornata di tutte le allocazioni) supera il valore economico stimato | Verificare la sostenibilità economica con il BU Manager |
| **Iniziativa Rejected con allocazioni** | Un'iniziativa è passata a stato "Rejected" (da import CSV) e ha allocazioni attive (soft o hard lock) | Verificare e rilasciare manualmente le allocazioni coinvolte |
| **Anomalie re-import iniziativa** | Un re-import CSV ha rilevato variazioni sui dati di un'iniziativa esistente (stima_gg, date, priorità, tipologia) | Verificare le anomalie e confermare o rifiutare l'aggiornamento |
| **Contratto non censito** | Un import CSV contiene un valore nel campo "Contratti BU DOC" che non corrisponde ad alcun `id_contratto_jira` tra i contratti censiti nel sistema | Censire il nuovo contratto nell'anagrafica contratti e compilare il campo `id_contratto_jira`, quindi ripetere l'import |

### 8.2 Alert strategici (BU Manager)

| Alert | Condizione | Azione suggerita |
| :---- | :---- | :---- |
| **Profilo saturo** | Tutte le risorse di un profilo specifico (es. "Analista Funzionale") sono sopra il 100% per le prossime 4 settimane | Valutare assunzione, formazione interna o rifiuto di nuove richieste su quel profilo |
| **Pipeline value elevata** | Somma del valore stimato delle iniziative con soft lock attivo supera il 20% del budget annuale configurato (sezione 14.2 del Draft) | Valutare il rischio di capacity se tutte le approvazioni arrivano contemporaneamente |
| **Accumulo Pending Resources** | Più di 3 iniziative in stato "Pending Resources" il cui fabbisogno insiste sullo stesso profilo | Decisione strutturale di capacity |

### 8.3 Modalità di notifica

Gli alert vengono visualizzati nell'applicazione sotto forma di **badge** nella barra di navigazione e di **pannello alert** con la lista delle situazioni attive. Ogni alert può essere:

- **preso in carico** — l'utente conferma di aver visto la situazione e sta agendo
- **silenziato** — l'alert non viene più mostrato per quel caso specifico (con motivazione obbligatoria)
- **risolto automaticamente** — quando la condizione che lo ha generato non sussiste più

---

## 9. Dashboard — vista Demand & Resource Manager

Le dashboard operative replicano le metriche della sezione 14.1 del documento di riferimento con cadenza **settimanale**.

### 9.1 Dashboard "saturazione risorse"

Metrica di riferimento: **Saturazione delle Risorse** (sezione 14.1 del Draft).

**Contenuto:**

- **Heatmap risorse × settimane** — matrice colorata che mostra la saturazione di ogni risorsa per ogni settimana dell'orizzonte di 12 settimane. Codifica colore: 🔵 blu (sotto-utilizzo, 0-74%), 🟢 verde (fascia ottimale, 75-100%), 🟡 giallo (attenzione, 101-110%), 🔴 rosso (sovra-allocazione critica, >110%).
- **Distribuzione per fascia** — grafico a barre che mostra quante risorse cadono in ciascuna fascia di saturazione nella settimana corrente e nelle prossime 4 settimane.
- **Trend settimanale** — grafico a linea che mostra l'evoluzione della saturazione media della BU nelle ultime 12 settimane, con banda di riferimento 75-100%.
- **Filtri:** per applicativo, contratto, ruolo, livello, tipologia (interna/esterna), appartenenza (BU Documentale/Engineering Excellence).
- **Target:** saturazione media della BU tra 75% e 100% (sezione 8.4 del Draft).
- **Segnale di allarme:** qualsiasi profilo sopra il 110% per più di due settimane consecutive.

### 9.2 Dashboard "tempo di ciclo"

Metrica di riferimento: **Tempo di Ciclo della Richiesta** (sezione 14.1 del Draft).

**Contenuto:**

- **Distribuzione tempi di ciclo** — istogramma dei tempi di ciclo (data sizing completato − data creazione epica) delle richieste chiuse nella settimana corrente e nel mese corrente, segmentato per priorità (Alta / Media / Bassa).
- **Rispetto dei target** — percentuale di richieste entro il target (≤ 5 giorni per Alta, ≤ 10 giorni per Media) nella settimana e nel mese.
- **Trend** — evoluzione settimanale della mediana del tempo di ciclo per priorità.
- **Segnale di allarme:** più del 30% delle richieste supera il target nella settimana (sezione 14.1 del Draft).

> **Nota:** questa metrica si alimenta dai dati Jira (date di creazione e di completamento del sizing). L'applicazione la calcola, non la produce.

### 9.3 Dashboard "tasso di completamento PTF"

Metrica di riferimento: **Tasso di Completamento PTF** (sezione 14.1 del Draft).

**Contenuto:**

- **Tasso settimanale** — richieste chiuse nella sessione / richieste in agenda × 100. Visualizzato come gauge con target ≥ 80%.
- **Trend** — evoluzione settimanale nelle ultime 12 settimane.
- **Dettaglio per esito** — distribuzione delle richieste per decisione (Proceed / Needs More Analysis / Blocked / Richiede EE) nella settimana.
- **Segnale di allarme:** tasso < 80% per due settimane consecutive.

> **Nota:** anche questa metrica richiede i dati Jira (stati delle epiche nella sessione del mercoledì). Il D&R Manager potrebbe dover registrare manualmente l'agenda della sessione se Jira non traccia questo dato in modo strutturato.

### 9.4 Dashboard "soft lock attivi"

Metrica derivata dalla gestione del soft lock (sezione 13 del Draft).

**Contenuto:**

- **Lista dei soft lock attivi** — ordinata per data di scadenza (più vicina in alto), con applicativo, iniziativa, contratto, risorse bloccate, giorni alla scadenza.
- **Valore totale in soft lock** — somma del valore economico stimato delle iniziative con soft lock attivo.
- **Risorse impegnate in soft lock** — numero e percentuale di risorse della BU con almeno un soft lock attivo, per profilo.

---

## 10. Dashboard — vista BU Manager

Le dashboard strategiche replicano le metriche della sezione 14.2 del documento di riferimento con cadenza **mensile**, con la possibilità di drill-down.

### 10.1 Dashboard "panoramica BU"

Vista di sintesi riservata al BU Manager.

**Contenuto:**

- **Saturazione media BU** — gauge con valore corrente e trend a 12 settimane. Banda di riferimento 75-100%.
- **Risorse per fascia** — donut chart con distribuzione risorse per fascia di saturazione (sotto-utilizzo / ottimale / attenzione / sovra-allocazione).
- **Top 3 profili critici** — i tre profili con saturazione più alta, con previsione a 4 e 8 settimane.
- **Pipeline value** — somma del valore stimato delle iniziative con soft lock attivo, confrontata con il budget annuale della BU (parametro configurabile).
- **Iniziative Pending Resources** — conteggio per profilo delle iniziative in stato "Pending Resources".

### 10.2 Dashboard "accuratezza delle stime"

Metrica di riferimento: **Accuratezza delle Stime** (sezione 14.2 del Draft).

**Contenuto:**

- **Scostamento medio** — (consuntivo − stima pianificata) / stima pianificata × 100, segmentato per taglia (XS/S, M, L/XL). Visualizzato come barre con target per taglia (errore medio < 20% su XS/S, < 30% su M, < 40% su L/XL — sezione 14.2 del Draft).
- **Distribuzione degli scostamenti** — scatter plot con stima pianificata sull'asse X e consuntivo sull'asse Y. La diagonale è la stima perfetta; i punti sopra la diagonale indicano sottostima, quelli sotto indicano sovrastima.
- **Trend mensile** — evoluzione dello scostamento medio per taglia negli ultimi 6 mesi.
- **Segnale di allarme:** errore sistematico in una sola direzione — sempre sottostima o sempre sovrastima (sezione 14.2 del Draft).

> **Nota:** il consuntivo si alimenta dal **worklog Jira** (sezione 14.2 del Draft). La qualità di questa metrica dipende dalla qualità del dato caricato dalle persone su Jira.

### 10.3 Dashboard "richieste bloccate e zombie"

Metrica di riferimento: **Tasso di Richieste Bloccate o Zombie** (sezione 14.2 del Draft).

**Contenuto:**

- **Tasso mensile** — richieste bloccate o scadute / totale richieste nel periodo × 100. Gauge con target < 10%.
- **Distribuzione per causa** — barre con le due cause di blocco (informazioni mancanti dal cliente / mancanza risorse — sezione 11.1 del Draft).
- **Aging delle richieste bloccate** — lista delle richieste bloccate ordinate per anzianità, con indicazione del tempo trascorso dall'ultimo aggiornamento.
- **Segnale di allarme:** tasso > 10% per due mesi consecutivi.

### 10.4 Dashboard "pipeline value"

Metrica di riferimento: **Pipeline Value in Attesa di Approvazione** (sezione 14.2 del Draft).

**Contenuto:**

- **Valore totale in attesa** — somma del valore economico stimato di tutte le iniziative con soft lock attivo. Confronto con il budget annuale della BU (parametro configurabile).
- **Distribuzione per applicativo** — barre orizzontali con il valore in soft lock per ogni applicativo.
- **Distribuzione per fascia temporale** — quanta pipeline scade nel prossimo mese, nei prossimi 2 mesi, oltre.
- **Segnale di allarme:** pipeline bloccata > 20% del budget annuale della BU.

---

## 11. Interfaccia utente e navigazione

### 11.1 Principi generali di UX

L'interfaccia segue principi di **semplicità e contestualità**: l'utente non deve mai dover navigare altrove per recuperare informazioni necessarie all'operazione corrente.

- **Tooltip su ogni azione:** ogni bottone, icona e controllo interattivo ha un **tooltip** che descrive l'azione associata. Nessun elemento cliccabile è privo di descrizione testuale al passaggio del mouse
- **Badge per le persone:** nelle viste compatte (pivot, tabelle, elenchi) le risorse sono rappresentate da **badge con le iniziali** (es. "MR" per Mario Rossi) con il nominativo completo nel tooltip. Il nome esteso è visibile solo nelle schermate di dettaglio
- **Tabelle snelle:** le tabelle mostrano solo le informazioni rilevanti per il contesto. I campi con valore quasi sempre costante (es. `appartenenza = BU Documentale` per la maggior parte delle risorse) non sono colonne ma **filtri rapidi** sopra la tabella
- **Filtri rapidi per valori binari/enum:** i campi con pochi valori distinti (appartenenza, tipologia, is_ptf, attivo) sono presentati come **chip selezionabili** sopra la tabella, non come colonne. Un click attiva/disattiva il filtro

### 11.2 Impostazioni globali

I parametri globali della BU (entità **Configurazione BU**: buffer ore settimanali, soglie di saturazione, budget annuale) sono accessibili da un'**icona impostazioni** posizionata in basso nella barra di navigazione laterale (sidebar). La schermata delle impostazioni include:

- parametri della Configurazione BU (sezione 3.2)
- gestione dell'anagrafica **Clienti** (elenco controllato)
- configurazione della sincronizzazione Jira (credenziali, frequenza, mapping campi)
- log di sistema (sincronizzazioni, import)
- **Audit log** *(post-MVP)* — registro consultabile di tutte le operazioni effettuate nell'applicazione (entità Audit log, sezione 3.2). La vista audit è una tabella filtrabile per utente, entità, tipo di azione e intervallo temporale. Per ogni record è possibile espandere il dettaglio con i valori pre e post modifica, evidenziando visivamente i campi che sono cambiati. Accessibile a entrambi i profili (D&R Manager e BU Manager)
- **Logout** — pulsante di disconnessione dalla sessione corrente. Dopo il logout l'utente viene reindirizzato alla pagina di login Google

### 11.3 Navigazione del Resource Plan (vista pivot)

La vista pivot è il cuore dell'applicazione. Oltre ai filtri già definiti nella sezione 7.2, supporta:

- **Filtro per ruolo** — seleziona solo le risorse con un ruolo specifico (Analista Funzionale, Senior Dev, Tech Leader, ecc.)
- **Filtro per percentuale di allocazione** — range slider per mostrare solo le risorse con saturazione entro un intervallo (es. "mostra solo risorse con saturazione < 50%" per trovare disponibilità)
- **Filtro per date** — restringe la finestra temporale visualizzata
- **Zoom temporale** — tre livelli di aggregazione (MVP) più uno in backlog:
  - **Giorni** — massimo dettaglio, una colonna per giorno lavorativo, finestra fissa di 2 settimane (10 giorni). Permette di vedere esattamente quali giorni sono occupati, quali hanno assenze e quali sono liberi. Utile per la micro-pianificazione e per risolvere conflitti puntuali
  - **Settimane** — vista di default, una colonna per settimana
  - **Mesi** — aggregazione mensile della saturazione media, visione a medio termine
  - **Quarter** *(backlog)* — aggregazione trimestrale, visione strategica per il BU Manager. Non inclusa nel MVP
- **Totali ore** — per ogni risorsa e per ogni periodo visualizzato, la pivot mostra il totale delle **ore allocate in lavoro** e delle **ore in ferie/assenza**, distinti visivamente

### 11.4 Navigazione bidirezionale: risorse ↔ iniziative

L'applicazione supporta la navigazione delle informazioni da entrambe le prospettive:

- **Vista per risorsa → iniziative:** dalla scheda di una risorsa è possibile visualizzare l'elenco di tutte le iniziative su cui è allocata, con codice, titolo, percentuale, periodo e tipo lock. Da qui si può navigare al dettaglio di ciascuna iniziativa
- **Vista per iniziativa → risorse:** dalla scheda di un'iniziativa è possibile visualizzare l'elenco di tutte le risorse allocate (lo staff), con badge, ruolo, percentuale, periodo e giorni effort. Da qui si può navigare al dettaglio di ciascuna risorsa
- **Iniziative parzialmente coperte:** l'applicazione evidenzia con un **indicatore visivo** (es. icona di warning o barra di progresso) le iniziative il cui effort allocato totale è inferiore alla stima, ovvero che hanno ancora **giorni residui da assegnare**. Questa informazione è visibile sia nell'elenco iniziative sia nella scheda di dettaglio

### 11.5 Creazione allocazioni inline

La creazione di un'allocazione **non apre una modale** ma avviene in un pannello contestuale che mantiene visibili i dati dell'iniziativa (pannello riepilogativo descritto nella sezione 7.3). Il D&R Manager non perde mai il contesto dell'iniziativa durante l'operazione di staffing: codice, titolo, date, giornate stimate, giornate residue e risorse già allocate restano sempre visibili.

### 11.6 Ricerca e filtri globali

Ogni lista/tabella di entità nell'applicazione supporta:

- **Ricerca testuale** — campo di ricerca che filtra su tutti i campi testuali dell'entità (es. nella lista iniziative: issue_key, titolo, descrizione, applicativo, contratto)
- **Filtri per campo** — ogni campo dell'entità è filtrabile. I campi enum (status, priorità, tipologia) sono filtri a selezione multipla; i campi data sono filtri a range; i campi numerici sono filtri a range slider
- **Filtri rapidi** — i campi binari e gli enum con pochi valori sono sempre visibili come chip sopra la tabella per attivazione/disattivazione immediata senza aprire un pannello filtri

### 11.7 Lista iniziative

La lista iniziative è la vista principale per consultare tutte le iniziative importate da Jira. I dati sono **in sola lettura** (unica eccezione: il campo `note` è editabile inline con click sulla cella).

**Colonne della tabella lista:**

| Colonna | Campo | Ordinabile |
| :---- | :---- | :---- |
| Issue key | `issue_key` | Sì |
| Titolo | `titolo` | Sì |
| Stato | `stato` (calcolato dalla macchina a stati) | Sì |
| Stato Jira | `stato_jira` (valore originale importato) | Sì |
| Priorità | `priorita` | Sì |
| Applicativo | `applicativo.nome` | Sì |
| Contratto | `contratto.nome` | Sì |
| Stima (gg) | `stima_gg` | Sì |
| Data inizio desiderata | `data_inizio_desiderata` | Sì |
| Data fine desiderata | `data_fine_desiderata` | Sì |
| Richiedente | `richiedente` | Sì |
| Note | `note` | No |

**Filtri multi-selezione dedicati:** la lista iniziative dispone di quattro filtri prominenti posizionati sopra la tabella come componenti **multi-select** (dropdown con checkbox, selezione multipla con chip attivi):

| Filtro | Tipo | Valori |
| :---- | :---- | :---- |
| **Stato** | Multi-select | Tutti gli stati della macchina a stati (sezione 3.1): To Do, Studio Fattibilità, Pronta per la Stima, Attesa di Allocazione, Allocato Soft Lock, Confermato Hard Lock, Completato, Pending Resources, Rejected |
| **Contratto** | Multi-select | Elenco dinamico dei contratti censiti nel sistema + valore "(senza contratto)" per le iniziative senza contratto associato |
| **Applicativo** | Multi-select | Elenco dinamico degli applicativi censiti nel sistema |
| **Priorità** | Multi-select | Highest, High, Medium, Low, Lowest |

I filtri multi-select sono **combinabili in AND**: selezionando ad esempio stato "Attesa di Allocazione" + "Allocato Soft Lock" e priorità "Highest" + "High", la lista mostra solo le iniziative che hanno uno degli stati selezionati **e** una delle priorità selezionate. All'interno dello stesso filtro i valori sono combinati in **OR** (es. stato = "Attesa di Allocazione" OR "Allocato Soft Lock").

Ogni filtro mostra il **conteggio** dei risultati attivi accanto al nome del filtro (es. "Stato (2)"). Un pulsante **"Azzera filtri"** riporta tutti i filtri allo stato iniziale.

**Dettaglio iniziativa:** il click su una riga apre un pannello laterale (**drawer**) in sola lettura con tutti i campi dell'iniziativa organizzati in sezioni:

- **Intestazione**: issue_key, titolo, stato (badge colorato), priorità (badge)
- **Dati Jira**: richiedente, data_richiesta, tenant, tipologia, valore_economico, corsia_urgenza, engineering_excellence
- **Sizing**: sizing_sviluppo + polarita_sizing_sviluppo, sizing_analisi + polarita_sizing_analisi, stima_gg, affidabilita_stima, analisi_ptf
- **Classificazione**: applicativo, contratto, componenti, in_riuso_da
- **Date**: data_inizio_desiderata, data_fine_desiderata, data_inizio_pianificata, data_fine_pianificata
- **Allocazioni**: tabella riepilogativa delle allocazioni collegate (risorsa, ruolo, ore, periodo) con totale giorni allocati vs stima_gg
- **Note**: campo `note` editabile (unico campo modificabile dall'utente)
- **Descrizione**: testo completo della descrizione (può essere multilinea con formattazione Jira convertita in testo semplice)

---

## 12. Requisiti non funzionali

### 12.1 Performance

- Il caricamento della vista pivot per persona e settimana deve completarsi in meno di **3 secondi** con 60 risorse e 12 settimane di orizzonte.
- L'import CSV deve completarsi in meno di **5 minuti** per un volume di 200 iniziative.
- Le dashboard devono aggiornarsi in meno di **5 secondi**.

### 12.2 Sicurezza

- Autenticazione tramite **Google Workspace** aziendale (OAuth 2.0 via Auth.js Google Provider). L'accesso è limitato agli account del dominio aziendale.
- Autorizzazione basata su ruoli (BU Manager, Demand & Resource Manager).
- I dati del Resource Plan sono riservati alla BU: nessun accesso da parte di utenti esterni ai due profili definiti.
- Le credenziali di accesso a Jira (API token) sono memorizzate in modo sicuro e non visibili nell'interfaccia.
- **Audit log completo** *(post-MVP)* per tutte le operazioni di creazione, modifica, cancellazione e import su ogni entità, con tracciamento dell'utente, dei valori pre e post modifica (sezione 3.2, entità Audit log). Consultabile dalla sezione Impostazioni.

### 12.3 Disponibilità

- L'applicazione deve essere disponibile in orario lavorativo (lunedì-venerdì, 8:00-19:00).
- Non è richiesta alta disponibilità: un'indisponibilità temporanea non blocca il processo (il fallback è il Google Sheet).

### 12.4 Compatibilità

- Browser: Chrome (ultima versione) come browser primario.
- Responsive: non richiesto — l'applicazione è utilizzata esclusivamente da desktop.

### 12.5 Accessibilità

- Conformità minima **WCAG 2.1 livello AA** per le codifiche colore (contrasto sufficiente, non affidarsi al solo colore per comunicare informazioni).

---

## 13. Stack tecnologico

### 13.1 Architettura

L'applicazione è una **web app full-stack** basata su **Next.js** con **App Router**, deployata su **Vercel**. L'architettura segue il pattern **server-first** di Next.js: le pagine sono **Server Components** di default, con **Client Components** solo dove serve interattività (form, tabelle interattive, grafici). Le **API Routes** (Route Handlers) gestiscono le operazioni CRUD e le integrazioni esterne (Jira, import Factorial).

### 13.2 Componenti dello stack

| Livello | Tecnologia | Note |
| :---- | :---- | :---- |
| **Framework** | **Next.js** 15+ (App Router) | Server Components, Server Actions, middleware per auth. TypeScript obbligatorio su tutto il progetto |
| **Runtime** | **Node.js** 20+ | Runtime di Vercel |
| **Hosting** | **Vercel** | Deploy automatico da repository Git, preview per ogni branch, edge functions dove necessario |
| **Database** | **Vercel Postgres** (**Neon**) | PostgreSQL serverless integrato in Vercel. Scaling automatico, connection pooling nativo, branching del database per ambienti di preview |
| **ORM** | **Prisma** 6+ | Schema type-safe, migrazioni automatiche (`prisma migrate`), client generato con autocompletamento. Lo schema Prisma è la singola fonte di verità per il modello dati |
| **Autenticazione** | **Auth.js** (NextAuth.js v5) con **Google Provider** | Autenticazione tramite account **Google Workspace** aziendale. Due ruoli applicativi: `DEMAND_RESOURCE_MANAGER` (lettura/scrittura) e `BU_MANAGER` (sola lettura), mappati sugli indirizzi email autorizzati. Sessioni gestite via JWT |
| **UI Components** | **MUI** (Material UI) v6+ | Component library enterprise con **DataGrid** per la vista pivot, **DatePicker** per le date, **Charts** (MUI X Charts) per le dashboard. Tema personalizzato con i colori della codifica saturazione |
| **Styling** | **Emotion** (integrato in MUI) | CSS-in-JS come da default MUI. Tema centralizzato con design tokens derivati dalla brand identity SiMaggioli (vedi 12.6) |
| **Validazione** | **Zod** | Validazione type-safe degli input su Server Actions e API Routes. Schema Zod derivati dallo schema Prisma dove possibile |
| **Grafici dashboard** | **MUI X Charts** oppure **Recharts** | Per i grafici delle dashboard (saturazione trend, pipeline value, tempo di ciclo). MUI X Charts se sufficiente, Recharts come alternativa più flessibile |
| **Gestione stato client** | **React Server Components** + `useState`/`useReducer` | Nessun state manager globale (Redux, Zustand): lo stato vive nel server, i componenti client gestiscono solo lo stato locale di UI |

### 13.3 Integrazioni

| Integrazione | Modalità | Tecnologia |
| :---- | :---- | :---- |
| **Jira** | Sync giornaliera (sezione 4) | **Jira REST API v3** via Route Handler schedulato con **Vercel Cron Jobs** (`vercel.json`). Le credenziali (API token) sono memorizzate come **environment variables** su Vercel |
| **Factorial** | Import settimanale file (sezione 5) | Upload manuale di file CSV/Excel tramite form nell'applicazione. Parsing lato server con **Papa Parse** (CSV) o **SheetJS** (Excel) |

### 13.4 Ambienti

| Ambiente | Database | Scopo |
| :---- | :---- | :---- |
| **Sviluppo locale** | PostgreSQL locale o Neon branch di dev | Sviluppo e debug |
| **Preview** | Neon branch dedicato (creato automaticamente per ogni PR) | Review e validazione con dati di test |
| **Produzione** | Vercel Postgres (Neon) principale | Ambiente operativo |

### 13.5 Struttura del progetto

```
resource-plan-app/
├── prisma/
│   ├── schema.prisma          # Modello dati completo
│   ├── migrations/            # Migrazioni automatiche
│   └── seed.ts                # Dati di seed per sviluppo
├── src/
│   ├── app/                   # App Router (pagine e layout)
│   │   ├── (auth)/            # Gruppo route autenticazione
│   │   ├── dashboard/         # Dashboard BU Manager e D&R Manager
│   │   ├── risorse/           # Gestione risorse e parametri
│   │   ├── iniziative/        # Gestione iniziative
│   │   ├── applicativi/       # Gestione applicativi e contratti
│   │   ├── resource-plan/     # Vista pivot (cuore dell'app)
│   │   ├── import/            # Import assenze Factorial
│   │   └── api/               # Route Handlers (Jira sync, CRUD)
│   ├── components/            # Componenti React riutilizzabili
│   │   ├── ui/                # Componenti UI base (wrapper MUI)
│   │   ├── resource-plan/     # Componenti della vista pivot
│   │   └── dashboard/         # Widget dashboard
│   ├── lib/                   # Utility e logica di business
│   │   ├── prisma.ts          # Client Prisma singleton
│   │   ├── auth.ts            # Configurazione Auth.js
│   │   ├── validators/        # Schema Zod
│   │   ├── business-rules/    # Vincoli e calcoli automatici
│   │   └── jira/              # Client Jira e mapping
│   ├── theme/                 # Tema MUI personalizzato
│   └── types/                 # Tipi TypeScript condivisi
├── vercel.json                # Configurazione Vercel (cron jobs)
├── .env.local                 # Variabili d'ambiente locali
└── package.json
```

> **Nota per lo sviluppo:** lo schema Prisma è la **singola fonte di verità** per il modello dati. Ogni modifica al modello dati parte dallo schema Prisma, si propaga tramite migrazione al database e tramite il client generato al codice TypeScript. Le regole di business (vincoli di capacità, calcolo coefficiente, allocazione automatica PM) sono implementate nella cartella `lib/business-rules/` come funzioni pure testabili unitariamente.

### 13.6 Palette colori SiMaggioli

Il tema MUI dell'applicazione utilizza i colori della **brand identity** di SiMaggioli, estratti da [simaggioli.it](https://simaggioli.it).

| Token | Colore | Hex | Utilizzo |
| :---- | :---- | :---- | :---- |
| **primary.main** | Blu SiMaggioli | `#00379E` | Colore primario: header, titoli, azioni principali, sidebar |
| **primary.dark** | Blu scuro | `#002A78` | Hover su elementi primari, stati attivi |
| **primary.light** | Blu teal | `#0C538E` | Elementi secondari, badge, chip |
| **secondary.main** | Cyan SiMaggioli | `#00B7EC` | Accenti, link, indicatori di progresso |
| **secondary.dark** | Cyan scuro | `#0095C0` | Hover su elementi secondari |
| **gradient.cta** | Gradiente brand | `linear-gradient(90deg, #00379E 0%, #00B7EC 100%)` | Pulsanti CTA principali, barra di navigazione |
| **text.primary** | Grigio scuro | `#404142` | Testo del corpo |
| **text.secondary** | Grigio medio | `#85898C` | Testo secondario, didascalie, etichette |
| **background.default** | Bianco | `#FFFFFF` | Sfondo principale |
| **background.paper** | Grigio chiaro | `#FCFCFC` | Card, pannelli, aree elevate |
| **divider** | Grigio bordi | `#D9D9D9` | Separatori, bordi tabelle |

> **Codifica saturazione:** i colori della codifica di saturazione nella vista pivot restano indipendenti dalla palette brand per garantire leggibilità immediata: 🔵 blu (sotto-utilizzo), 🟢 verde (fascia ottimale), 🟡 giallo (attenzione), 🔴 rosso (sovra-allocazione).

### 13.7 Import dati da file

#### Import risorse (CSV)

L'anagrafica delle risorse può essere importata tramite upload di un file **CSV** con i campi dell'entità Risorsa. Il D&R Manager carica il file dall'interfaccia; l'applicazione valida i dati, segnala eventuali errori riga per riga e importa le risorse valide.

**Modalità di import (toggle nell'interfaccia):**

- **Append** *(default, toggle "Override" disattivato)* — vengono importate **solo le risorse nuove** (non presenti nel sistema). Le risorse già esistenti (match su `id_dipendente` oppure su nominativo costruito come `cognome + " " + nome`) vengono **ignorate**: i loro dati anagrafici non vengono modificati. Il riepilogo pre-conferma mostra quante risorse sono state skippate perché già presenti
- **Override** *(toggle "Override" attivato)* — all'attivazione del toggle il sistema mostra un **messaggio informativo**: *"Attenzione: procedendo in questa modalità, i dati anagrafici delle risorse esistenti verranno sovrascritti con i valori del file CSV."* Le risorse già presenti vengono **aggiornate** con i dati del CSV (tipologia, appartenenza, is_ptf, note), le nuove vengono create

**Gestione risorse assenti dal CSV (solo in override):** il riepilogo pre-conferma evidenzia le risorse presenti nel sistema ma **assenti dal file CSV** con un warning dedicato. Per ciascuna risorsa assente l'utente può scegliere di **disattivarla** (flag `attivo` = false) tramite azione esplicita (checkbox nel riepilogo). La disattivazione **non è automatica**: di default le risorse assenti restano attive e invariate.

Se l'utente sceglie di disattivare una risorsa che ha **allocazioni future** (data_fine nel futuro), il sistema mostra l'elenco delle allocazioni impattate (iniziativa, periodo, ore allocate) e richiede una **conferma esplicita**. Alla conferma:

1. La risorsa viene disattivata (`attivo` = false)
2. Le allocazioni future vengono **rilasciate** (cancellate)
3. Le iniziative coinvolte vengono rivalutate dalla macchina a stati: se l'effort non è più coperto, passano a stato **Pending Resources**
4. Le allocazioni passate (già consuntivate o con data_fine nel passato) **restano invariate**

Il formato atteso:

```
id_dipendente;cognome;nome;tipologia;appartenenza;is_ptf;note
HR001;Rossi;Mario;Interna;BU Documentale;false;
HR002;Bianchi;Anna;Interna;BU Documentale;true;Referente modulo Firma
HR003;Verdi;Luca;Esterna;BU Documentale;false;Consulente XYZ
```

#### Import parametri risorsa (CSV)

I parametri temporalizzati delle risorse possono essere importati in blocco tramite upload di un file **CSV**, utile per aggiornamenti massivi (es. adeguamento tariffe annuali, promozioni di livello, variazioni contrattuali). Il formato atteso:

```
id_dipendente;ruolo;livello;ore_settimanali;costo_giornata;coefficiente_produttivita;buffer_ore_settimanali;data_inizio_validita;data_fine_validita
HR001;Senior Dev;Senior;40;350;0.85;;2026-09-01;
HR002;Developer;Mid;36;300;1.0;12;2026-09-01;2026-12-31
HR003;Analista Funzionale;Junior;40;200;1.3;;2026-09-01;
```

Dove:

- **id_dipendente** — identificativo della risorsa nel sistema HR (chiave di match con l'anagrafica risorse)
- **ruolo** — ruolo della risorsa nel periodo (Analista Funzionale, Analista HD1, SAP HD1, Tech Leader, Analista HD2, Senior Dev, Developer, SAP Consultant, Resp. BU, UI/UX, DevOps, Project Manager, Architect)
- **livello** — livello di seniority (Junior, Mid, Senior)
- **ore_settimanali** — ore teoriche settimanali
- **costo_giornata** — costo giornaliero in euro
- **coefficiente_produttivita** — fattore moltiplicativo rispetto al baseline mid-level (default: 1.0)
- **buffer_ore_settimanali** — override del buffer globale BU (vuoto = si applica il valore globale)
- **data_inizio_validita** — data da cui i parametri sono validi (obbligatoria)
- **data_fine_validita** — data di fine validità dei parametri (opzionale: vuoto = valido correntemente, `null`)

**Modalità di import (toggle nell'interfaccia):**

- **Append** *(default, toggle "Override" disattivato)* — i record del CSV vengono **aggiunti** come nuovi parametri temporalizzati. I record vigenti vengono chiusi automaticamente (vedi sotto). Nessun record esistente viene cancellato o modificato
- **Override** *(toggle "Override" attivato)* — all'attivazione del toggle il sistema mostra un **messaggio informativo**: *"Attenzione: procedendo in questa modalità, per ogni risorsa presente nel file tutti i record di parametro esistenti verranno cancellati e ricreati con i valori del CSV."* Per ogni risorsa presente nel CSV, **tutti i record di parametro esistenti vengono cancellati** e sostituiti con i record del file (full replace per risorsa). Le risorse non presenti nel CSV mantengono i propri parametri invariati

L'applicazione, in fase di import:

1. **Match risorse:** il match è per `id_dipendente`. I record con `id_dipendente` non trovato in anagrafica vengono segnalati come errore
2. **Logica append** — chiusura automatica: per ogni risorsa, il record di Parametro risorsa vigente viene chiuso alla data precedente a `data_inizio_validita` del nuovo record
3. **Logica override** — cancellazione e ricostruzione: per ogni risorsa nel CSV, tutti i record di parametro esistenti vengono rimossi e sostituiti con quelli del file
4. **Validazione copertura periodi (solo in override):** prima di procedere, l'applicazione verifica che i nuovi record del CSV coprano tutti i periodi in cui la risorsa ha **allocazioni attive**. Se esistono periodi con allocazioni non coperti dai nuovi parametri, l'import viene **bloccato** con un messaggio che elenca i periodi scoperti e le allocazioni impattate. L'utente deve correggere il CSV per coprire quei periodi prima di ripetere l'import
5. **Validazione non retroattività (solo in append):** l'applicazione verifica che `data_inizio_validita` non sia anteriore alla `data_inizio_validita` dell'ultimo record esistente (non si possono inserire parametri retroattivi che sovrascrivono periodi già chiusi). In modalità override questa validazione non si applica perché i record preesistenti vengono eliminati
6. **Riepilogo pre-conferma:** prima del salvataggio, l'applicazione mostra il riepilogo: record nuovi, record che chiudono/sostituiscono parametri precedenti, errori di validazione

> **Regola di non retroattività:** come per l'inserimento manuale, l'import massivo in modalità append non modifica i calcoli storici. Le allocazioni passate restano agganciate ai parametri vigenti nel loro periodo.

#### Import assenze (CSV da Factorial)

Come definito nella sezione 5, le assenze vengono importate da un file estratto settimanalmente da **Factorial**. Il formato atteso del CSV:

```
nominativo;giorno;ore_assenza
Rossi Mario;2026-09-01;8
Rossi Mario;2026-09-02;4
Bianchi Anna;2026-09-15;8
```

Dove:

- **nominativo** — cognome e nome della risorsa (usato per il match con l'anagrafica risorse nell'applicazione)
- **giorno** — data dell'assenza in formato `YYYY-MM-DD`
- **ore_assenza** — ore di assenza nella giornata (8 = giornata intera, 4 = mezza giornata, ecc.)

**Modalità di import: sempre override (full replace del periodo).** Prima di procedere il sistema mostra un **messaggio informativo**: *"Attenzione: tutte le assenze registrate nel periodo coperto dal file (dalla data minima alla data massima presenti nel CSV) verranno cancellate e ricostruite con i dati del file."*

L'import assenze opera in modalità **full replace**: il sistema determina il **range di date** coperto dal CSV (dalla data minima alla data massima presenti nel file) e **cancella tutte le assenze esistenti** in quel range per tutte le risorse, quindi inserisce i record del CSV. Questo significa che se un'assenza precedentemente registrata non è più presente nel nuovo file, viene rimossa dal sistema. Questa logica garantisce che il CSV Factorial sia sempre la **fonte di verità** (single source of truth) per le assenze.

**Match risorse:** l'applicazione effettua il match per **nominativo** (costruito come `cognome + " " + nome`) con le risorse in anagrafica.

**Warning generati durante l'import:**

| Warning | Condizione | Dettaglio |
| :---- | :---- | :---- |
| **Risorsa non censita** | Il nominativo nel CSV non corrisponde a nessuna risorsa in anagrafica | L'assenza non viene importata; il warning elenca i nominativi non riconosciuti per consentire la correzione dell'anagrafica |
| **Impatto su allocazioni esistenti** | L'assenza (nuova o modificata) riduce la capacità disponibile in una settimana dove la risorsa è già allocata, causando sovra-allocazione (saturazione > 100%) | Il warning indica la risorsa, la settimana e la nuova percentuale di saturazione risultante. L'import prosegue comunque: il warning è informativo, non bloccante |

> **Nota:** le modifiche ad assenze in date passate (variazione ore o rimozione) **non generano warning** perché non hanno impatto sulla pianificazione futura.

### 13.8 Import iniziative (CSV da Jira)

Le iniziative vengono importate nel sistema tramite upload di un file **CSV** estratto da Jira. Questo è l'**unico canale di ingresso** per le iniziative: non possono essere create manualmente e i dati importati **non sono modificabili** dall'utente nell'applicazione. Il separatore è **punto e virgola** (`;`).

#### Formato CSV

Il file CSV ha la seguente struttura di header (nomi colonne Jira):

```
Issue key;Issue id;Summary;Description;Status;Priority;Custom field (Service Type);Custom field (Contratti BU DOC);Due date;Custom field (Valore economico stimato);Original estimate;Custom field (Progetto BU DOC);Custom field (Richiedente);Custom field (Data richiesta);Custom field (Tenant);Components;Custom field (Corsia d'urgenza);Custom field (Engineering Excellence);Custom field (Engineering Excellence).1;Custom field (Engineering Excellence).2;Custom field (Sizing Sviluppo);Custom field (Polarità Sizing Sviluppo);Custom field (Sizing Analisi);Custom field (Polarità Sizing Analisi);Custom field (Affidabilità della stima);Custom field (Analisi PTF);Custom field (Figure necessarie);Custom field (Vincoli e/o criticità);Custom field (In riuso da)
```

#### Mapping colonne CSV → campi entità Iniziativa

| Colonna CSV | Campo entità | Trasformazione |
| :---- | :---- | :---- |
| Issue key | `issue_key` | Valore diretto (es. "DBD-29"). **Chiave di match** per il re-import |
| Issue id | `issue_id` | Valore numerico diretto |
| Summary | `titolo` | Valore diretto |
| Description | `descrizione` | Valore diretto (può essere multilinea con markup Jira) |
| Status | `stato_jira` / `status` | Valore diretto in `stato_jira`; lo stato interno `status` è calcolato dalla macchina a stati (sezione 3.1) |
| Priority | `priorita` | Valore diretto (Highest, High, Medium, Low, Lowest) |
| Service Type | `tipologia` | Valore diretto (es. "Consumo/Misura -> MEV") |
| Contratti BU DOC | `contratto` | Match per `id_contratto_jira` sull'entità Contratto. Se non trovato → **alert** (sezione 8.1) |
| Due date | `data_fine_desiderata` | Conversione dal formato Jira `DD/Mon/YY HH:MM AM/PM` (es. "31/Jul/26 12:00 AM") a data |
| Valore economico stimato | `valore_economico` | Valore diretto (es. "30k - 40k", "> 40k") |
| Original estimate | `stima_gg` | Conversione secondi → giorni: valore ÷ 28800 (8 ore/giorno). Es. 576000 = 20 gg, 1440000 = 50 gg. Se vuoto → null |
| Progetto BU DOC | `applicativo` | Match per nome con l'anagrafica applicativi. Se non trovato → errore |
| Richiedente | `richiedente` | Valore diretto |
| Data richiesta | `data_richiesta` | Conversione dal formato Jira a data |
| Tenant | `tenant` | Valore diretto |
| Components | `componenti` | Valore diretto |
| Corsia d'urgenza | `corsia_urgenza` | Valore diretto ("No" → null) |
| Engineering Excellence (.1, .2) | `engineering_excellence` | Concatenazione con virgola dei campi non vuoti e diversi da "No" (es. "AI, DevEx, UI/UX"). Se tutti "No" o vuoti → null |
| Sizing Sviluppo | `sizing_sviluppo` | Valore diretto (es. "M (15 - 50 gg)") |
| Polarità Sizing Sviluppo | `polarita_sizing_sviluppo` | Valore diretto |
| Sizing Analisi | `sizing_analisi` | Valore diretto |
| Polarità Sizing Analisi | `polarita_sizing_analisi` | Valore diretto |
| Affidabilità della stima | `affidabilita_stima` | Valore diretto |
| Analisi PTF | `analisi_ptf` | Valore diretto |
| Figure necessarie | `figure_necessarie` | Valore diretto |
| Vincoli e/o criticità | `vincoli_criticita` | Valore diretto |
| In riuso da | `in_riuso_da` | Valore diretto |

> **Convenzione sui nomi colonna:** per i campi Jira con intestazione `Custom field (Valore)`, il sistema utilizza il valore tra parentesi tonde come riferimento interno.

#### Logica di import

L'applicazione, in fase di import:

1. **Parsing CSV:** il file viene letto con separatore `;`. Le descrizioni multilinea (contenenti virgolette Jira) vengono gestite correttamente
2. **Match iniziative:** il match è per `issue_key` (colonna "Issue key"). Se l'issue_key non esiste nel sistema, viene creata una nuova iniziativa
3. **Match applicativo:** il valore di "Progetto BU DOC" viene cercato per nome nell'anagrafica applicativi. Se non trovato, il record viene segnalato come **errore** e non importato
4. **Match contratto:** il valore di "Contratti BU DOC" viene cercato per `id_contratto_jira` nell'anagrafica contratti. Se non trovato e il campo non è vuoto, il record viene importato ma il sistema genera un **alert** "Contratto non censito" (sezione 8.1). Il campo `contratto` resta null
5. **Mapping stato:** lo `stato_jira` determina lo stato interno dell'iniziativa secondo la macchina a stati (sezione 3.1). Gli stati non pianificabili (To Do, Studio fattibilità, Pronta per la stima) vengono importati ma le iniziative non sono allocabili
6. **Conversione stima:** il campo "Original estimate" (in secondi Jira) viene convertito in giorni lavorativi dividendo per 28800
7. **Riepilogo pre-conferma:** prima del salvataggio, l'applicazione mostra il riepilogo: nuove iniziative, iniziative aggiornate, anomalie rilevate, errori di validazione

#### Logica di re-import (aggiornamento iniziative esistenti)

Quando un'iniziativa con lo stesso `issue_key` è già presente nel sistema, l'applicazione confronta i dati importati con quelli esistenti. Se vengono rilevate **anomalie**, l'aggiornamento viene **bloccato** e il D&R Manager deve confermare prima che le modifiche siano applicate.

**Anomalie rilevate:**

| Anomalia | Descrizione |
| :---- | :---- |
| **Variazione giorni stimati** | Il valore di `stima_gg` (da Original estimate) è cambiato rispetto al dato esistente. Il sistema mostra la variazione assoluta e percentuale |
| **Cambio data fine desiderata** | Il Due date è diverso da quello registrato |
| **Cambio priorità** | La Priority è cambiata |
| **Cambio tipologia** | Il Service Type è cambiato |
| **Cambio stato Jira** | Lo Status è cambiato (in particolare: transizione verso Rejected o da uno stato pianificabile a uno non pianificabile) |
| **Transizione a Rejected con allocazioni** | Lo Status è "Rejected" e l'iniziativa ha allocazioni attive (soft o hard lock) |

**Interfaccia di conferma:**

Il sistema presenta un riepilogo delle anomalie per ogni iniziativa coinvolta, evidenziando per ogni campo il **valore corrente** e il **nuovo valore**. Il D&R Manager può:

- **Confermare** l'aggiornamento — i dati vengono sovrascritti e, se lo stato cambia, la macchina a stati esegue la transizione
- **Rifiutare** l'aggiornamento — i dati dell'iniziativa restano invariati
- **Confermare parzialmente** — accettare i cambi sui dati ma gestire separatamente il rilascio delle allocazioni (nel caso di Rejected)

> **Rejected con allocazioni:** se lo stato passa a Rejected e l'iniziativa ha allocazioni attive, il sistema presenta l'elenco delle allocazioni con dettaglio risorsa, percentuale, periodo e tipo lock. Il D&R Manager rilascia le allocazioni manualmente (singolarmente o in blocco) dopo aver valutato l'impatto sulla pianificazione delle risorse coinvolte.

---

## 14. Change log

| Data | Versione | Modifiche |
| :---- | :---- | :---- |
| 27/08/2026 | Draft v1 | Stesura iniziale del documento con sezioni 1-10: contesto e obiettivi, utenti e permessi, modello dati (Applicativo, Modulo, Contratto, Iniziativa, Risorsa, Parametro risorsa, Allocazione, Profilo di competenza), integrazione Jira, import assenze Factorial, funzionalità core (orizzonti temporali, vista pivot, gestione iniziative/allocazioni, pool risorse, soft/hard lock, affiancamento, allocazione PM, PTF, finestre rilascio), regole di business automatiche, dashboard D&R Manager e BU Manager, requisiti non funzionali |
| 28/08/2026 | Draft v1.1 | **Modello dati:** aggiunto campo `modulo` (FK nullable) su Iniziativa per tracciamento competenze a livello modulo. Spostati `soft_lock_scadenza` e `affiancamento` da Iniziativa ad Allocazione (la granularità è sulla singola assegnazione risorsa-iniziativa, non sull'iniziativa). Unificati `flag_rischio_tecnico` e `flag_rischio_stima` nel campo `affidabilita_stima` (enum Alta/Media/Bassa) + `vincoli_criticita` (testo libero PTF). Allineato `ruolo_nell_iniziativa` su Allocazione alla stessa enum di `ruolo` su Risorsa. Aggiunto flag `attivo` su Risorsa (auto-calcolato da `data_fine_contratto`). Aggiunto `data_fine_contratto` e `buffer_ore_settimanali` (override per risorsa) su Parametro risorsa. **Vincoli:** sovra-allocazione >100% cambiata da blocco a warning con conferma. Vincolo durata contrattuale cambiato da blocco a warning con conferma. **Nuove sezioni:** sezione 6 (Consuntivo e accuratezza delle stime) con entità Consuntivo e import CSV da worklog Jira. Sezione 12 (Stack tecnologico) con scelte architetturali: Next.js 15+, Vercel, Neon Postgres, Prisma 6+, Auth.js con Google Provider, MUI v6+, palette colori SiMaggioli. **Import:** aggiunto formato CSV assenze Factorial (nominativo;giorno;ore_assenza) e import risorse da CSV |
| 31/08/2026 | Draft v2 | **Review commenti Giulia Pau e Sonia Brundu (28/08).** Invertita codifica colori saturazione: blu per sotto-utilizzo, verde per fascia ottimale (era il contrario). Risorse di manutenzione: ammessa allocazione a percentuale variabile, non più vincolate al 100%. Rimossa entità Finestra di rilascio e relativa sezione 7.9, campo su Applicativo e alert "Conflitto con finestra di rilascio" (non necessaria per la prima versione). Aggiunta sezione 7.0 (Operazioni CRUD e regole di cancellazione): tutte le entità modificabili e cancellabili, cancellazione bloccata (non a cascata) se esistono dipendenze. **Modello dati:** aggiunta entità Cliente (slug PK auto-generato da nome, inline creation da form Contratto); campo `cliente` su Contratto cambiato da Stringa a FK → Cliente; Risorsa: `nominativo` sostituito da campi distinti `nome` + `cognome`, aggiunto `id_dipendente` (dal sistema HR), `is_ptf` rinominato in "PTF (Presidio Tecnico Funzionale)"; Iniziativa: aggiunto campo `codice` per riferimento rapido; Allocazione: `effort_allocato_gg` ora calcolato automaticamente da `giorni_lavorativi(data_inizio, data_fine) × percentuale_allocazione / 100`, il D&R Manager inserisce solo percentuale e date. **UX e navigazione (nuova sezione 11):** principi generali (informazione minima, tooltip, badge iniziali risorse con tooltip nominativo completo); pagina impostazioni globali (parametri BU); navigazione pivot con zoom a 3 livelli (settimane, mesi, quarter) e filtri per ruolo/percentuale/date; navigazione bidirezionale risorse ↔ iniziative; creazione allocazioni inline con panel riepilogativo iniziativa e giorni residui; filtri rapidi come chip per campi binari/enum e ricerca full-text su tutte le entità. **Fuori scope (rimandati):** skill matrix / mappatura tecnologie per risorsa, tracciamento formazione con board Jira |
| 04/09/2026 | Draft v2.6 | **Warning informativi e gestione cascata sugli importer.** Aggiunto messaggio informativo all'attivazione del toggle override per risorse, parametri risorsa e assenze. Import risorse override: aggiunta gestione risorse assenti dal CSV con warning + disattivazione opzionale (checkbox nel riepilogo, non automatica); se la risorsa disattivata ha allocazioni future, warning con elenco impatti → conferma esplicita → rilascio allocazioni e rivalutazione stato iniziative (Pending Resources). Import parametri override: aggiunto warning **bloccante** se i nuovi record non coprono periodi con allocazioni attive; l'utente deve correggere il CSV. Import assenze: aggiunto messaggio informativo pre-import sul full replace del periodo |
| 04/09/2026 | Draft v2.5 | **Logiche override/append per tutti gli importer.** Import risorse: aggiunta modalità append (default) vs override (toggle esplicito); in append le risorse esistenti vengono ignorate, in override i dati anagrafici vengono aggiornati; nessuna cancellazione in entrambe le modalità. Import parametri risorsa: aggiunta modalità append (default, con chiusura automatica record vigente) vs override (full replace per risorsa: cancella tutti i record esistenti della risorsa e ricostruisce dal CSV); in override warning se l'operazione impatta periodi con allocazioni consuntivate. Import assenze: riscritta logica come **full replace del periodo** (il range di date del CSV diventa la fonte di verità; tutte le assenze nel range vengono cancellate e ricostruite); aggiunti warning per risorsa non censita e impatto su allocazioni esistenti (sovra-allocazione); le modifiche ad assenze passate non generano warning. Import iniziative: logiche invariate (sezione 13.8) |
| 03/09/2026 | Draft v2.4 | **UI iniziative read-only e filtri multi-selezione.** Aggiornata sezione 7.0 CRUD: tabella ampliata con colonne "Modificabile" e "Cancellabile"; Iniziativa marcata come non modificabile (solo campo `note` editabile) e non cancellabile. Sezione 7.3: rimossa creazione manuale iniziative, esplicitato che l'import CSV è l'unico canale di ingresso. Nuova sezione 11.7 (Lista iniziative): tabella con 12 colonne ordinabili, 4 filtri multi-select prominenti (Stato, Contratto, Applicativo, Priorità) combinabili in AND tra filtri / OR all'interno; dettaglio iniziativa in drawer laterale read-only con sezioni organizzate e campo `note` editabile inline. Aggiunto alert operativo "Contratto non censito" (sezione 8.1) per valori CSV non corrispondenti ad alcun `id_contratto_jira`. Aggiornato NFR 12.1: "sincronizzazione Jira" → "import CSV" |
| 03/09/2026 | Draft v2.3 | **Macchina a stati iniziativa e import CSV.** Ridefinita enum `status` dell'Iniziativa: rimossi In Lavorazione, In Attesa di Copertura Contrattuale, Fuori Scope; aggiunti Allocato Soft Lock, Confermato Hard Lock, Rejected; rinominati Ready — Pending Resources → Pending Resources, In Attesa di Allocazione → Attesa di Allocazione. Aggiunta macchina a stati formale (sezione 3.1) con mapping stati Jira (Stimato → Attesa di Allocazione, Approvato → Confermato Hard Lock, Rejected → Rejected). Completato auto-calcolato su data_fine ultima allocazione. **Import CSV iniziative (nuova sezione 13.8):** formato CSV completo con campo `stato_jira`; logica di re-import con **blocco e conferma** del D&R Manager per anomalie (variazione stima_gg, date, priorità, tipologia); rilascio allocazioni su Rejected con **conferma manuale**. Aggiornata sezione 7.3 (creazione → import da CSV), sezione 7.4 (soft/hard lock allineati alla macchina a stati), sezione 4.2 (dati importati via CSV, rimossa sincronizzazione giornaliera). Aggiunti alert operativi: "Iniziativa Rejected con allocazioni" e "Anomalie re-import iniziativa" (sezione 8.1). Allineati tutti i riferimenti a "Ready — Pending Resources" al nuovo nome "Pending Resources" |
| 02/09/2026 | Draft v2.2 | **Allineamento spec a code review.** Soglie saturazione allineate in tutte le sezioni (8.1, 8.2, 9.1, 10.1, 7.7) ai valori canonici della sezione 7.2: 🔵 0-74% sotto-utilizzo, 🟢 75-100% ottimale, 🟡 101-110% attenzione, 🔴 >110% sovra-allocazione critica. **Enum ruoli aggiornata** da 8 a 13 valori (Analista Funzionale, Analista HD1, SAP HD1, Tech Leader, Analista HD2, Senior Dev, Developer, SAP Consultant, Resp. BU, UI/UX, DevOps, Project Manager, Architect) in sezioni 3.1, 7.3, 11.3 e CSV esempio parametri. **Audit log marcato post-MVP** (entità, vista UI e NFR). **Vista Quarter marcata backlog** nella sezione 11.3; zoom MVP confermato a 3 livelli (Giorni, Settimane, Mesi) |
| 31/08/2026 | Draft v2.1 | **Storicizzazione parametri risorsa:** `ruolo` e `livello` spostati da Risorsa a Parametro risorsa (temporalizzati con `data_inizio_validita` / `data_fine_validita` come ore, costo, coefficiente). `data_fine_contratto` rimosso da Parametro risorsa: il flag `attivo` sulla Risorsa ora dipende dalla `data_fine_validita` del Parametro risorsa vigente. **Campo `pool` eliminato** dall'entità Risorsa; rimossa sezione 7.4 (I due pool di risorse); sottosezioni 7.5-7.8 rinumerate a 7.4-7.7. **Entità Assenza allineata al CSV:** `data_inizio`/`data_fine` sostituiti da `giorno` (singola data) + `ore_assenza`; aggiunto campo `fonte` (Factorial/Jira). **Import:** aggiornato CSV risorse con campi separati `id_dipendente`, `cognome`, `nome` (rimossi `ruolo`, `livello`, `pool`); aggiunto nuovo import massivo Parametro risorsa da CSV con `data_fine_validita` opzionale; esplicitato match per nominativo costruito (`cognome + " " + nome`) su tutti gli importer (risorse, assenze, consuntivo). **Audit e logout:** aggiunta entità Audit log (sezione 3.2) con tracciamento completo di ogni operazione (azione, utente, entità, valore pre/post modifica); consultazione audit nella sezione Impostazioni con filtri per utente/entità/azione/periodo; aggiunta funzionalità di logout. **Vista pivot — assenze visibili:** riscritta sezione 7.2 con rappresentazione grafica a blocchi distinti (blocco assenze in grigio tratteggiato + blocchi allocazioni + spazio libero); saturazione calcolata sulla capacità disponibile (al netto delle assenze), non sulla teorica. **Soglie saturazione ricalibrate:** il buffer settimanale assorbe già il margine operativo e le stime hanno la propria contingency, quindi la fascia ottimale sale a 75-100% (era 75-85%), attenzione 101-110% (era 86-90%), sovra-allocazione critica >110% (era >90%). Default Configurazione BU aggiornati di conseguenza. **Creazione iniziativa — filtro incrociato applicativo/contratto:** nessun vincolo formale tra applicativo e contratto, ma filtro incrociato bidirezionale nel form di creazione (selezionando l'applicativo si filtrano i contratti associati e viceversa, con possibilità di rimuovere il filtro). **Vista pivot giornaliera:** aggiunto quarto livello di zoom "Giorni" con dettaglio giornaliero e finestra fissa di 2 settimane (10 giorni lavorativi) per micro-pianificazione |