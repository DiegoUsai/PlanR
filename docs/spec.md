# Resource Plan — specifiche applicazione web

|  |  |
| :---- | :---- |
| **Autore** | Diego Usai — BU Manager |
| **Versione** | Draft v1 |
| **Data** | 27 agosto 2026 |
| **Stato** | Bozza di lavoro |
| **Documento di riferimento** | [[BU_Documentale_SAP_Demand_Resource_Management_Draft]] (Draft v3, 6 luglio 2026) |

---

## Indice

1. [Contesto e obiettivi](#1-contesto-e-obiettivi)
2. [Utenti e permessi](#2-utenti-e-permessi)
3. [Modello dati](#3-modello-dati)
4. [Integrazione Jira (sola lettura)](#4-integrazione-jira-sola-lettura)
5. [Import assenze da Factorial](#5-import-assenze-da-factorial)
6. [Funzionalità core](#6-funzionalità-core)
7. [Regole di business automatiche](#7-regole-di-business-automatiche)
8. [Dashboard — vista Demand & Resource Manager](#8-dashboard--vista-demand--resource-manager)
9. [Dashboard — vista BU Manager](#9-dashboard--vista-bu-manager)
10. [Requisiti non funzionali](#10-requisiti-non-funzionali)

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

L'applicazione ha due profili utente con viste e permessi distinti.

### 2.1 Demand & Resource Manager

È l'utente operativo principale. Utilizza l'applicazione quotidianamente per:

- creare e aggiornare le allocazioni nel Resource Plan
- monitorare la saturazione delle risorse per persona e per settimana
- gestire il **soft lock** delle risorse in attesa di approvazione contrattuale
- importare i dati di assenza da **Factorial**
- visualizzare le **dashboard** operative settimanali
- ricevere gli **alert** automatici (sovra-allocazione, scadenza soft lock, richieste in "Ready — Pending Resources" da più di due settimane)

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
| **finestre_rilascio** | Relazione 1:N | Periodi di blocco rilascio imposti dal cliente |

#### Modulo

Componente logico di un applicativo. Entità tracciata nella prima versione ma **non sviluppata funzionalmente** — serve come anagrafica per future evoluzioni.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **applicativo** | FK → Applicativo | |
| **nome** | Stringa | Nome del modulo |
| **descrizione** | Testo | Descrizione del modulo |

#### Contratto

Rappresenta un contratto attivo con un cliente, legato a uno o più applicativi.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **identificativo** | Stringa | Codice identificativo del contratto (riferimento amministrativo) |
| **tipo** | Enum | Subappalto, Appalto |
| **cliente** | Stringa | Nome del cliente |
| **importo** | Decimale | Importo complessivo del contratto in euro |
| **data_inizio** | Data | Data di inizio del contratto |
| **data_fine** | Data | Data di fine del contratto |
| **percentuale_effort_pm** | Decimale | Percentuale di effort PM generata automaticamente per ogni iniziativa afferente a questo contratto (es. 5%). Vedi sezione "Allocazione automatica PM" |
| **applicativi** | Relazione N:N | Applicativi coperti dal contratto |
| **note** | Testo | Note libere |

> **Rilevanza per la pianificazione:** la data di fine del contratto è un vincolo di pianificazione per le iniziative che vi afferiscono — l'applicazione segnala le iniziative la cui data di consegna desiderata supera la scadenza del contratto di riferimento.

#### Iniziativa

Rappresenta un intervento (MEV, MAD o altro) su un applicativo, nel perimetro di un contratto. Corrisponde all'**epica Jira** nel processo di Demand Management.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **applicativo** | FK → Applicativo | |
| **modulo** | FK → Modulo (nullable) | Modulo dell'applicativo interessato dall'iniziativa. Se valorizzato, consente il tracciamento delle competenze a livello di modulo; se non valorizzato, la competenza viene tracciata a livello di applicativo |
| **contratto** | FK → Contratto | Contratto di riferimento |
| **id_jira_epica** | Stringa | Chiave dell'epica Jira collegata |
| **titolo** | Stringa | Titolo dell'iniziativa |
| **descrizione** | Testo | Descrizione dell'intervento |
| **tipologia** | Enum | MEV, MAD |
| **priorita** | Enum | Alta, Media, Bassa |
| **data_inizio_desiderata** | Data | Data di inizio desiderata |
| **data_fine_desiderata** | Data | Data di consegna desiderata (indicata dal PM nell'epica — sezione 17.2 del Draft) |
| **data_inizio_pianificata** | Data | Data di inizio calcolata dall'applicazione (formula sezione 7 del Draft) |
| **data_fine_pianificata** | Data | Data di fine calcolata |
| **stima_gg** | Decimale | Stima complessiva in giorni/uomo (sviluppo + analisi/test) |
| **figure_necessarie** | Testo | Descrizione del fabbisogno di figure professionali (es. "2 FE, 1 BE, 1 Analista"). Campo testuale, strutturabile in futuro |
| **status** | Enum | In Attesa di Allocazione, Allocato, In Lavorazione, Completato, Ready — Pending Resources, In Attesa di Copertura Contrattuale, Fuori Scope |
| **soft_lock** | Booleano | Risorse in prenotazione temporanea (sezione 13 del Draft) |
| **soft_lock_scadenza** | Data | Data di scadenza del soft lock |
| **affiancamento** | Booleano | L'iniziativa è leva di crescita (sezione 8.2 del Draft) |
| **taglia_sizing** | Enum | XS, S, M, L, XL (importata da Jira — sezione 6.1 del Draft) |
| **polarita** | Enum | Prima metà, Seconda metà (importata da Jira — sezione 6.2 del Draft) |
| **taglia_analisi_test** | Enum | A-XS, A-S, A-M, A-L (importata da Jira — sezione 6.4 del Draft) |
| **flag_rischio_tecnico** | Enum | Alto, Medio, Basso (importato da Jira — sezione 5.3 del Draft) |
| **flag_rischio_stima** | Enum | Alto, Medio, Basso (importato da Jira) |
| **flag_riuso** | Booleano | Opportunità di riuso da altro progetto (importato da Jira) |
| **valore_economico** | Enum | <5K, 5-10K, 10-15K, 15-20K, 20-30K, 30-40K, >40K (importato da Jira — sezione 17.2 del Draft) |
| **note** | Testo | Note libere |

> **Calcolo automatico della data di inizio pianificata:** l'applicazione calcola `data_inizio_pianificata = data_fine_desiderata − effort_pianificato`, dove l'**effort pianificato** è derivato dalla stima in giorni applicando il buffer differenziato per taglia e polarità definito nella sezione 7.2 del Draft (20% per XS/S/M, 30% per L/XL), con il tetto di range e la regola di ri-tag.

#### Risorsa

Rappresenta una persona della BU.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **nominativo** | Stringa | Nome e cognome |
| **ruolo** | Enum | FE (Frontend), BE (Backend), Analista, Tech Lead, Architetto, PM, BA Senior, Altro |
| **livello** | Enum | Junior, Mid, Senior |
| **tipologia** | Enum | Interna, Esterna |
| **appartenenza** | Enum | BU Documentale, Engineering Excellence |
| **pool** | Enum | Manutenzione, Evolutiva/Adeguativa |
| **is_ptf** | Booleano | Indica se la risorsa è membro del **Presidio Tecnico Funzionale** |
| **data_ingresso_bu** | Data | Data di ingresso nella BU |
| **note** | Testo | Note libere (competenze particolari, vincoli) |

> **Risorse esterne:** le risorse esterne (consulenti, fornitori) sono trattate come qualsiasi altra risorsa ai fini della pianificazione e della saturazione. La distinzione interna/esterna alimenta le dashboard per permettere analisi sul mix di risorse e sul costo (le risorse esterne hanno tipicamente un costo giornata diverso).

> **Risorse di Engineering Excellence:** le risorse che appartengono a **Engineering Excellence** (sezione 9 del Draft) vengono allocate sulle iniziative della BU Documentale quando il PTF rileva la necessità di un coinvolgimento architetturale o trasversale (flag "Coinvolgimento EE" nell'epica). La loro capacità allocabile è gestita dall'applicazione con gli stessi vincoli delle risorse della BU, ma il D&R Manager deve tenere conto che queste risorse hanno anche impegni fuori dal perimetro della BU Documentale, non visibili nell'applicazione. La percentuale di allocazione massima effettiva va concordata con il responsabile di Engineering Excellence.

Gli attributi **ore settimanali** e **costo giornata** sono temporalizzati: possono variare nel tempo senza incidere sul passato. Vengono gestiti tramite l'entità **Parametro risorsa**.

#### Parametro risorsa

Storico temporalizzato degli attributi variabili di una risorsa. Una variazione di ore settimanali o costo giornata crea un nuovo record con la data di inizio validità; il record precedente viene chiuso con la data di fine. Le allocazioni passate e presenti continuano a fare riferimento ai valori vigenti nel loro periodo, non ai valori aggiornati.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **risorsa** | FK → Risorsa | |
| **ore_settimanali** | Decimale | Ore teoriche settimanali della risorsa nel periodo di validità |
| **costo_giornata** | Decimale | Costo giornaliero della risorsa in euro nel periodo di validità |
| **coefficiente_produttivita** | Decimale | Fattore moltiplicativo rispetto al baseline mid-level (default: 1.0). Un junior potrebbe avere 1.3 (impiega il 30% in più di giorni), un senior 0.85 (impiega il 15% in meno). Impatta la pianificazione temporale, non il costo giornata |
| **buffer_ore_settimanali** | Decimale (nullable) | Override del buffer globale BU per questa specifica risorsa nel periodo di validità. Se `null`, si applica il valore globale dalla Configurazione BU. Esempio: una risorsa PTF con 40 ore teoriche e buffer override di 16 ore ha solo 24 ore allocabili (contro le 32 di una risorsa standard con buffer globale di 8 ore) |
| **data_inizio_validita** | Data | Inizio della validità di questi parametri |
| **data_fine_validita** | Data | Fine della validità (null = valido correntemente) |

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
| **percentuale_allocazione** | Intero (1-100) | Percentuale di tempo della risorsa dedicata a questa iniziativa |
| **data_inizio** | Data | Data di inizio dell'allocazione |
| **data_fine** | Data | Data di fine dell'allocazione |
| **effort_allocato_gg** | Decimale | Giorni/uomo allocati per questa risorsa su questa iniziativa |
| **ruolo_nell_iniziativa** | Enum | FE, BE, Analista, Tech Lead, Altro — quale ruolo ricopre la risorsa in questa iniziativa |
| **is_senior_affiancamento** | Booleano | Se true, questa allocazione è l'affiancamento senior (la risorsa affianca un junior sulla stessa iniziativa) |
| **note** | Testo | Note libere |

> **Soft lock vs hard lock:** un'allocazione di tipo **soft** indica una prenotazione temporanea in attesa di conferma contrattuale (sezione 13 del Draft). Il D&R Manager può convertirla in **hard** quando l'approvazione arriva, oppure rimuoverla se il contratto non si concretizza. La scadenza del soft lock è gestita a livello di iniziativa (campo `soft_lock_scadenza`). Nella vista pivot, le allocazioni soft sono visualizzate con codifica visiva distinta (tratteggio) rispetto alle hard.

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

La data di fine di un'allocazione non può superare la data di fine del contratto a cui afferisce l'iniziativa. Questo vincolo è un **blocco**, non un warning: l'applicazione impedisce il salvataggio di un'allocazione che sfora il contratto.

Quando il D&R Manager crea o modifica un'allocazione, l'applicazione:

- **verifica** che `data_fine (allocazione) ≤ data_fine (contratto dell'iniziativa)`
- **blocca** il salvataggio se il vincolo non è rispettato, mostrando la data di fine del contratto e la differenza in giorni
- **segnala in anticipo** (warning) se la data di fine dell'allocazione cade negli ultimi 30 giorni del contratto, per dare visibilità sulla prossimità alla scadenza

Il vincolo si applica anche in cascata: se il coefficiente di produttività di una risorsa fa aumentare l'effort effettivo e di conseguenza la data di fine dell'allocazione supera la scadenza del contratto, l'applicazione blocca e suggerisce le alternative (aumentare la percentuale di allocazione, aggiungere una seconda risorsa, rinegoziare i termini).

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

Record di ferie o assenza importato da **Factorial**.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **risorsa** | FK → Risorsa | |
| **data_inizio** | Data | |
| **data_fine** | Data | |
| **tipo** | Enum | Ferie, Malattia, Permesso, Altro |
| **note** | Testo | |

#### Finestra di rilascio

Periodi in cui il cliente non accetta rilasci (sezione 8.1 del Draft).

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **applicativo** | FK → Applicativo | |
| **data_inizio** | Data | Inizio del blocco |
| **data_fine** | Data | Fine del blocco |
| **motivo** | Testo | Motivazione del blocco |

#### Configurazione BU

Parametri globali dell'applicazione.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **budget_annuale** | Decimale | Budget annuale della BU in euro — usato come riferimento per l'alert Pipeline Value > 20% (sezione 14.2 del Draft) |
| **buffer_ore_settimanali** | Decimale | Valore di default del buffer settimanale (in ore) sottratto dalla capacità teorica di ogni risorsa per assorbire riunioni, **context switching** e imprevisti (coerente con la fascia residua del 15-25% della sezione 8.4 del Draft). Si applica a tutte le risorse che non hanno un override specifico nel proprio Parametro risorsa. Esempio: 8 ore su 40 teoriche = 20% di buffer |
| **saturazione_min** | Intero | Soglia minima della fascia ottimale in percentuale (default: 75%) |
| **saturazione_max** | Intero | Soglia massima della fascia ottimale in percentuale (default: 85%) |
| **saturazione_allarme** | Intero | Soglia di sovra-allocazione in percentuale (default: 90%) |

#### Snapshot settimanale

Fotografia dei dati aggregati per alimentare i grafici di trend nelle dashboard.

| Campo | Tipo | Note |
| :---- | :---- | :---- |
| **id** | UUID | Identificativo univoco |
| **data_snapshot** | Data | Data dello snapshot (generato automaticamente ogni lunedì) |
| **saturazione_media_bu** | Decimale | Saturazione media della BU alla data |
| **risorse_per_fascia** | JSON | Distribuzione risorse per fascia di saturazione |
| **pipeline_value_soft_lock** | Decimale | Valore totale in soft lock alla data |
| **richieste_pending_resources** | Intero | Numero di iniziative in stato "Ready — Pending Resources" |

### 3.3 Relazioni principali

```
erDiagram
    APPLICATIVO }o--o{ CONTRATTO : "coperto da"
    APPLICATIVO }o--o{ RISORSA : "ha PM"
    APPLICATIVO ||--o{ MODULO : "composto da"
    APPLICATIVO ||--o{ FINESTRA_RILASCIO : "ha"
    APPLICATIVO ||--o{ INIZIATIVA : "ha"
    MODULO |o--o{ INIZIATIVA : "riguarda (opz.)"
    CONTRATTO ||--o{ INIZIATIVA : "finanzia"
    INIZIATIVA ||--o{ ALLOCAZIONE : "assegnata tramite"
    RISORSA ||--o{ ALLOCAZIONE : "lavora su"
    RISORSA ||--o{ PARAMETRO_RISORSA : "ha parametri"
    RISORSA ||--o{ ASSENZA : "ha"
```

> **Lettura delle relazioni:** un **Applicativo** è coperto da uno o più **Contratti** (e un contratto può coprire più applicativi) e ha uno o più **PM** assegnati (relazione N:N con Risorsa). Ogni **Iniziativa** afferisce a un applicativo e a un contratto, e può opzionalmente essere collegata a un **Modulo** dell'applicativo per il tracciamento delle competenze. L'**Allocazione** è il ponte tra Iniziativa e Risorsa: una stessa iniziativa può avere più allocazioni (più persone ci lavorano), e una stessa risorsa può avere più allocazioni contemporanee (lavora su più iniziative con percentuali diverse), purché la somma non superi la capacità allocabile settimanale. I **Parametri risorsa** sono temporalizzati: ore settimanali, costo giornata, coefficiente di produttività e buffer individuale possono variare senza incidere sui calcoli passati. Il **profilo di competenza** di ogni risorsa si costruisce automaticamente dallo storico delle allocazioni completate, espresso come distribuzione percentuale per applicativo e modulo.

---

## 4. Integrazione Jira (sola lettura)

### 4.1 Principio

**Jira è il sistema master.** L'applicazione legge dati da Jira tramite **REST API** per alimentare il Resource Plan con informazioni aggiornate sulle epiche e sul consuntivo. L'applicazione non scrive mai su Jira.

### 4.2 Dati importati

| Dato Jira | Campo destinazione | Frequenza di sincronizzazione |
| :---- | :---- | :---- |
| **Epiche con stato "Proceed"** | Iniziativa (creazione o aggiornamento) | Giornaliera o su richiesta |
| **Stato dell'epica** | Iniziativa.status | Giornaliera |
| **Worklog** (stimato e consuntivato per epica) | Dati per il calcolo dell'accuratezza delle stime | Giornaliera |
| **Priorità dell'epica** | Iniziativa.priorita | Giornaliera |
| **Data di consegna desiderata** (Due Date) | Iniziativa.data_fine_desiderata | Giornaliera |
| **Taglia sizing** | Iniziativa.taglia_sizing | Al momento della sincronizzazione iniziale |
| **Valore economico stimato** | Iniziativa.valore_economico | Giornaliera |
| **Stato "Preventivo Inviato"** | Trigger per attivazione soft lock sull'iniziativa | Giornaliera |

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

- legge il CSV e mappa i record alle risorse presenti nel sistema tramite **match per nominativo**
- segnala eventuali **risorse non trovate** (nominativo non corrispondente) per correzione manuale
- aggiorna o crea i record di assenza senza duplicare quelli già importati in precedenza (deduplicazione per risorsa + data: se già presente, aggiorna il valore ore_assenza)
- mostra un **riepilogo dell'import** prima della conferma: record nuovi, record aggiornati, record ignorati, errori

### 5.2 Impatto sulla pianificazione

Le assenze importate riducono automaticamente la **capacità disponibile** della risorsa nelle settimane interessate. Il calcolo della saturazione tiene conto delle assenze: una risorsa con cinque giorni di ferie in una settimana ha zero giorni disponibili, non cinque giorni da sottrarre alla saturazione.

---

## 6. Funzionalità core

### 6.1 I tre orizzonti temporali

L'applicazione implementa i tre orizzonti di pianificazione definiti nella sezione 8.1 del documento di riferimento.

| Orizzonte | Finestra | Livello di dettaglio | Comportamento nell'applicazione |
| :---- | :---- | :---- | :---- |
| **Corto** | 4 settimane | Risorsa individuale, alta precisione | Allocazioni nominative con percentuale. Alert su sovra-allocazione. |
| **Medio** | 8 settimane | Profilo/ruolo, media precisione | Allocazioni possono essere a livello di profilo ("1 Developer Mid") senza risorsa nominativa assegnata. |
| **Lungo** | 12 settimane | Previsionale, bassa precisione | Vista aggregata per progetto e profilo. Utilizzata per anticipare colli di bottiglia di capacity. |

La transizione tra orizzonti è **scorrevole**: man mano che il tempo avanza, le allocazioni dell'orizzonte medio entrano nell'orizzonte corto e richiedono l'assegnazione di una risorsa nominativa. L'applicazione segnala le allocazioni nell'orizzonte medio che stanno per entrare nell'orizzonte corto senza una risorsa assegnata.

### 6.2 Vista pivot per persona e settimana

La vista principale del Resource Plan è la **pivot per persona e settimana** descritta nella sezione 8.1 del Draft. Per ogni risorsa e ogni settimana del periodo visualizzato, la pivot mostra:

- la **percentuale di saturazione totale** (somma delle allocazioni + assenze)
- il dettaglio delle singole allocazioni (applicativo, iniziativa, percentuale)
- una **codifica colore** per fascia di saturazione (soglie configurabili nella Configurazione BU):
  - 🟢 Verde: 0% – 74% (sotto-utilizzo)
  - 🔵 Blu: 75% – 85% (fascia ottimale, sezione 8.4 del Draft)
  - 🟡 Giallo: 86% – 90% (attenzione)
  - 🔴 Rosso: >90% (sovra-allocazione, alert)
- le **assenze** visualizzate come blocco distinto (non sommabili alle allocazioni lavorative)

La pivot è **filtrabile** per applicativo, contratto, ruolo, livello, pool (manutenzione / evolutiva), tipologia (interna / esterna) e appartenenza (BU Documentale / Engineering Excellence).

> **Formula di saturazione:** la saturazione settimanale di una risorsa è calcolata come somma delle percentuali di allocazione di tutte le allocazioni attive in quella settimana. Una risorsa con un'allocazione al 60% su un'iniziativa e una al 30% su un'altra ha saturazione 90%. Le assenze riducono i giorni disponibili: se una risorsa ha 2 giorni di ferie in una settimana, la sua capacità è 3/5 = 60% e le allocazioni vengono rapportate a questa capacità ridotta.

### 6.3 Gestione delle iniziative e delle allocazioni

L'operatività del Resource Plan si svolge su due livelli: l'**iniziativa** (cosa va fatto) e l'**allocazione** (chi lo fa e quando).

**Operazioni sulle iniziative:**

- **Creazione da Jira** — importazione di un'epica classificata "Proceed"; i campi sizing, priorità, date, valore economico e figure necessarie vengono pre-compilati
- **Creazione manuale** — inserimento diretto per iniziative non tracciate su Jira
- **Cambio stato** — transizione di stato (In Attesa di Allocazione → Allocato → In Lavorazione → Completato). Gli stati "In attesa di copertura contrattuale" e "Fuori scope" sono impostabili in qualsiasi momento
- **Chiusura** — completamento con registrazione della data effettiva di fine

**Operazioni sulle allocazioni:**

- **Assegnazione risorsa** — il D&R Manager crea un'allocazione collegando una risorsa a un'iniziativa, specificando percentuale, date e ruolo
- **Modifica** — aggiornamento di percentuale, date o risorsa assegnata
- **Split** — un'iniziativa può avere più allocazioni su risorse diverse (esempio: un'iniziativa M da 30 giorni divisa su due developer al 50%)
- **Estensione/riduzione** — modifica delle date con ricalcolo automatico dell'effort allocato
- **Scambio risorse** — il **Tech Lead** del team può proporre uno scambio di attività tra le proprie risorse per competenza o continuità (sezione 8.6 del Draft), purché le date di consegna pianificate restino rispettate. L'operazione è tracciata nel log
- **Rimozione** — cancellazione dell'allocazione (la risorsa viene liberata, l'iniziativa torna senza quella risorsa assegnata)

### 6.4 I due pool di risorse

Come definito nella sezione 8.3 del Draft, le risorse appartengono a due pool distinti:

- **Risorse di manutenzione** — allocate al 100% sul progetto di manutenzione, visualizzate come blocco fisso nella pivot. Non sono disponibili per le allocazioni di evolutiva/adeguativa.
- **Risorse di evolutiva/adeguativa** — allocate dinamicamente per richiesta attraverso il processo di demand.

L'applicazione impedisce l'allocazione di una risorsa di manutenzione su attività di evolutiva (e viceversa) a meno che il Demand & Resource Manager non esegua un **cambio di pool** esplicito della risorsa, operazione tracciata nel log.

### 6.5 Soft lock e hard lock

Il meccanismo di prenotazione (sezione 13 del Draft) è implementato come attributo dell'**allocazione** (`tipo_lock`):

- **Soft lock** — prenotazione temporanea in attesa di conferma contrattuale. Si attiva quando lo stato dell'epica su Jira passa a **"Preventivo Inviato"** (rilevato dalla sincronizzazione giornaliera) oppure manualmente dal D&R Manager. Le allocazioni soft **occupano capacità** nella vista pivot (la risorsa risulta impegnata) ma con codifica visiva distinta (tratteggio) per segnalare la provvisorietà.
- **Hard lock** — allocazione confermata. Quando l'approvazione contrattuale arriva, il D&R Manager converte le allocazioni da soft a hard.

La **data di scadenza** del soft lock è gestita a livello di iniziativa (campo `soft_lock_scadenza`), perché tutte le allocazioni soft di un'iniziativa condividono la stessa scadenza contrattuale. Alla scadenza, l'applicazione genera un alert. Il D&R Manager può estendere la scadenza o rilasciare tutte le allocazioni soft dell'iniziativa, liberando le risorse.

> **Impatto sulla capacità:** sia le allocazioni soft che hard contano nel calcolo della saturazione e nel vincolo di capacità settimanale. Una risorsa con una soft al 50% e una hard al 40% ha il 90% di capacità impegnata. Questo è coerente con il principio del Draft: il soft lock prenota effettivamente la risorsa.

### 6.6 Affiancamento

Quando un'iniziativa ha il flag **affiancamento** attivo (sezione 8.2 del Draft), l'applicazione:

- consente di creare due allocazioni sulla stessa iniziativa: una per la **risorsa junior** e una per il **senior che affianca** (con `is_senior_affiancamento = true`)
- traccia l'effort del senior come **allocazione parziale** sulla stessa iniziativa
- visualizza l'affiancamento come due allocazioni collegate nella pivot (due righe collegate visivamente)

### 6.7 Allocazione automatica PM

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

### 6.8 Tracciamento del PTF nel Resource Plan

Come stabilito nella sezione 8.4 del documento di riferimento, l'impegno dei tre membri del **Presidio Tecnico Funzionale** (sessione del mercoledì, validazioni in corso d'opera, task di approfondimento) viene tracciato nel Resource Plan come quello di qualsiasi altro profilo, con la stessa fascia di saturazione ottimale del 75-85%. L'applicazione tratta le risorse con flag `is_ptf = true` come risorse normali ai fini della saturazione, senza eccezioni.

### 6.9 Finestre di rilascio del cliente

Le finestre di rilascio (sezione 8.1 del Draft) sono configurate a livello di **applicativo** e visualizzate come **bande verticali** sulla pivot, indicando i periodi in cui il cliente non accetta rilasci. Sono un vincolo informativo per il Demand & Resource Manager: l'applicazione non impedisce di pianificare consegne in quei periodi, ma le segnala visivamente e genera un alert se la data di fine di un'iniziativa ricade in una finestra di blocco.

---

## 7. Regole di business automatiche

L'applicazione implementa un sistema di alert che segnala le situazioni che richiedono l'attenzione del Demand & Resource Manager o del BU Manager.

### 7.1 Alert operativi (Demand & Resource Manager)

| Alert | Condizione | Azione suggerita |
| :---- | :---- | :---- |
| **Sovra-allocazione** | Saturazione di una risorsa > soglia di allarme (default 90%, configurabile) per più di due settimane consecutive (sezione 8.4 del Draft) | Ribilanciare le allocazioni o segnalare al BU Manager |
| **Sotto-utilizzo** | Saturazione di una risorsa < 50% per più di due settimane consecutive | Verificare se la risorsa può essere allocata su altre attività |
| **Scadenza soft lock** | Data di scadenza del soft lock superata | Contattare il PM per aggiornamento; estendere o rilasciare |
| **Ready — Pending Resources** | Iniziativa in stato "Ready — Pending Resources" da più di 2 settimane (sezione 11.4 del Draft) | Segnalare al BU Manager come problema strutturale di capacity |
| **Iniziativa senza allocazioni** | Iniziativa nell'orizzonte corto (4 settimane) senza alcuna allocazione a risorse nominative | Assegnare le risorse o segnalare il gap |
| **Conflitto con finestra di rilascio** | Data di fine di un'iniziativa ricade in una finestra di rilascio dell'applicativo | Verificare con il PM se la data è corretta |
| **Prossimità scadenza contratto** | Un'allocazione ha data di fine negli ultimi 30 giorni del contratto di riferimento | Verificare con il PM se è previsto un rinnovo o se la pianificazione va compressa |
| **Slittamento per coefficiente** | L'effort effettivo di un'allocazione (ricalcolato con il coefficiente di produttività) fa superare la data di consegna desiderata dell'iniziativa | Valutare: aumentare la percentuale di allocazione, aggiungere una seconda risorsa, o accettare il ritardo |
| **Costo previsto > valore economico** | Il costo previsto dell'iniziativa (somma effort × costo giornata di tutte le allocazioni) supera il valore economico stimato | Verificare la sostenibilità economica con il BU Manager |

### 7.2 Alert strategici (BU Manager)

| Alert | Condizione | Azione suggerita |
| :---- | :---- | :---- |
| **Profilo saturo** | Tutte le risorse di un profilo specifico (es. "BA Senior") sono sopra l'85% per le prossime 4 settimane | Valutare assunzione, formazione interna o rifiuto di nuove richieste su quel profilo |
| **Pipeline value elevata** | Somma del valore stimato delle iniziative con soft lock attivo supera il 20% del budget annuale configurato (sezione 14.2 del Draft) | Valutare il rischio di capacity se tutte le approvazioni arrivano contemporaneamente |
| **Accumulo Pending Resources** | Più di 3 iniziative in stato "Ready — Pending Resources" il cui fabbisogno insiste sullo stesso profilo | Decisione strutturale di capacity |

### 7.3 Modalità di notifica

Gli alert vengono visualizzati nell'applicazione sotto forma di **badge** nella barra di navigazione e di **pannello alert** con la lista delle situazioni attive. Ogni alert può essere:

- **preso in carico** — l'utente conferma di aver visto la situazione e sta agendo
- **silenziato** — l'alert non viene più mostrato per quel caso specifico (con motivazione obbligatoria)
- **risolto automaticamente** — quando la condizione che lo ha generato non sussiste più

---

## 8. Dashboard — vista Demand & Resource Manager

Le dashboard operative replicano le metriche della sezione 14.1 del documento di riferimento con cadenza **settimanale**.

### 8.1 Dashboard "saturazione risorse"

Metrica di riferimento: **Saturazione delle Risorse** (sezione 14.1 del Draft).

**Contenuto:**

- **Heatmap risorse × settimane** — matrice colorata che mostra la saturazione di ogni risorsa per ogni settimana dell'orizzonte di 12 settimane. Codifica colore: verde (sotto-utilizzo), blu (fascia ottimale 75-85%), giallo (attenzione 86-90%), rosso (sovra-allocazione >90%).
- **Distribuzione per fascia** — grafico a barre che mostra quante risorse cadono in ciascuna fascia di saturazione nella settimana corrente e nelle prossime 4 settimane.
- **Trend settimanale** — grafico a linea che mostra l'evoluzione della saturazione media della BU nelle ultime 12 settimane, con banda di riferimento 75-85%.
- **Filtri:** per applicativo, contratto, ruolo, livello, pool, tipologia (interna/esterna), appartenenza (BU Documentale/Engineering Excellence).
- **Target:** saturazione media della BU tra 75% e 85% (sezione 8.4 del Draft).
- **Segnale di allarme:** qualsiasi profilo sopra 90% per più di due settimane consecutive.

### 8.2 Dashboard "tempo di ciclo"

Metrica di riferimento: **Tempo di Ciclo della Richiesta** (sezione 14.1 del Draft).

**Contenuto:**

- **Distribuzione tempi di ciclo** — istogramma dei tempi di ciclo (data sizing completato − data creazione epica) delle richieste chiuse nella settimana corrente e nel mese corrente, segmentato per priorità (Alta / Media / Bassa).
- **Rispetto dei target** — percentuale di richieste entro il target (≤ 5 giorni per Alta, ≤ 10 giorni per Media) nella settimana e nel mese.
- **Trend** — evoluzione settimanale della mediana del tempo di ciclo per priorità.
- **Segnale di allarme:** più del 30% delle richieste supera il target nella settimana (sezione 14.1 del Draft).

> **Nota:** questa metrica si alimenta dai dati Jira (date di creazione e di completamento del sizing). L'applicazione la calcola, non la produce.

### 8.3 Dashboard "tasso di completamento PTF"

Metrica di riferimento: **Tasso di Completamento PTF** (sezione 14.1 del Draft).

**Contenuto:**

- **Tasso settimanale** — richieste chiuse nella sessione / richieste in agenda × 100. Visualizzato come gauge con target ≥ 80%.
- **Trend** — evoluzione settimanale nelle ultime 12 settimane.
- **Dettaglio per esito** — distribuzione delle richieste per decisione (Proceed / Needs More Analysis / Blocked / Richiede EE) nella settimana.
- **Segnale di allarme:** tasso < 80% per due settimane consecutive.

> **Nota:** anche questa metrica richiede i dati Jira (stati delle epiche nella sessione del mercoledì). Il D&R Manager potrebbe dover registrare manualmente l'agenda della sessione se Jira non traccia questo dato in modo strutturato.

### 8.4 Dashboard "soft lock attivi"

Metrica derivata dalla gestione del soft lock (sezione 13 del Draft).

**Contenuto:**

- **Lista dei soft lock attivi** — ordinata per data di scadenza (più vicina in alto), con applicativo, iniziativa, contratto, risorse bloccate, giorni alla scadenza.
- **Valore totale in soft lock** — somma del valore economico stimato delle iniziative con soft lock attivo.
- **Risorse impegnate in soft lock** — numero e percentuale di risorse della BU con almeno un soft lock attivo, per profilo.

---

## 9. Dashboard — vista BU Manager

Le dashboard strategiche replicano le metriche della sezione 14.2 del documento di riferimento con cadenza **mensile**, con la possibilità di drill-down.

### 9.1 Dashboard "panoramica BU"

Vista di sintesi riservata al BU Manager.

**Contenuto:**

- **Saturazione media BU** — gauge con valore corrente e trend a 12 settimane. Banda di riferimento 75-85%.
- **Risorse per fascia** — donut chart con distribuzione risorse per fascia di saturazione (sotto-utilizzo / ottimale / attenzione / sovra-allocazione).
- **Top 3 profili critici** — i tre profili con saturazione più alta, con previsione a 4 e 8 settimane.
- **Pipeline value** — somma del valore stimato delle iniziative con soft lock attivo, confrontata con il budget annuale della BU (parametro configurabile).
- **Iniziative Pending Resources** — conteggio per profilo delle iniziative in stato "Ready — Pending Resources".

### 9.2 Dashboard "accuratezza delle stime"

Metrica di riferimento: **Accuratezza delle Stime** (sezione 14.2 del Draft).

**Contenuto:**

- **Scostamento medio** — (consuntivo − stima pianificata) / stima pianificata × 100, segmentato per taglia (XS/S, M, L/XL). Visualizzato come barre con target per taglia (errore medio < 20% su XS/S, < 30% su M, < 40% su L/XL — sezione 14.2 del Draft).
- **Distribuzione degli scostamenti** — scatter plot con stima pianificata sull'asse X e consuntivo sull'asse Y. La diagonale è la stima perfetta; i punti sopra la diagonale indicano sottostima, quelli sotto indicano sovrastima.
- **Trend mensile** — evoluzione dello scostamento medio per taglia negli ultimi 6 mesi.
- **Segnale di allarme:** errore sistematico in una sola direzione — sempre sottostima o sempre sovrastima (sezione 14.2 del Draft).

> **Nota:** il consuntivo si alimenta dal **worklog Jira** (sezione 14.2 del Draft). La qualità di questa metrica dipende dalla qualità del dato caricato dalle persone su Jira.

### 9.3 Dashboard "richieste bloccate e zombie"

Metrica di riferimento: **Tasso di Richieste Bloccate o Zombie** (sezione 14.2 del Draft).

**Contenuto:**

- **Tasso mensile** — richieste bloccate o scadute / totale richieste nel periodo × 100. Gauge con target < 10%.
- **Distribuzione per causa** — barre con le due cause di blocco (informazioni mancanti dal cliente / mancanza risorse — sezione 11.1 del Draft).
- **Aging delle richieste bloccate** — lista delle richieste bloccate ordinate per anzianità, con indicazione del tempo trascorso dall'ultimo aggiornamento.
- **Segnale di allarme:** tasso > 10% per due mesi consecutivi.

### 9.4 Dashboard "pipeline value"

Metrica di riferimento: **Pipeline Value in Attesa di Approvazione** (sezione 14.2 del Draft).

**Contenuto:**

- **Valore totale in attesa** — somma del valore economico stimato di tutte le iniziative con soft lock attivo. Confronto con il budget annuale della BU (parametro configurabile).
- **Distribuzione per applicativo** — barre orizzontali con il valore in soft lock per ogni applicativo.
- **Distribuzione per fascia temporale** — quanta pipeline scade nel prossimo mese, nei prossimi 2 mesi, oltre.
- **Segnale di allarme:** pipeline bloccata > 20% del budget annuale della BU.

---

## 10. Requisiti non funzionali

### 10.1 Performance

- Il caricamento della vista pivot per persona e settimana deve completarsi in meno di **3 secondi** con 60 risorse e 12 settimane di orizzonte.
- La sincronizzazione con Jira deve completarsi in meno di **5 minuti** per un volume di 200 epiche attive.
- Le dashboard devono aggiornarsi in meno di **5 secondi**.

### 10.2 Sicurezza

- Autenticazione tramite **Google Workspace** aziendale (OAuth 2.0 via Auth.js Google Provider). L'accesso è limitato agli account del dominio aziendale.
- Autorizzazione basata su ruoli (BU Manager, Demand & Resource Manager).
- I dati del Resource Plan sono riservati alla BU: nessun accesso da parte di utenti esterni ai due profili definiti.
- Le credenziali di accesso a Jira (API token) sono memorizzate in modo sicuro e non visibili nell'interfaccia.
- Log di audit per le operazioni di modifica delle allocazioni.

### 10.3 Disponibilità

- L'applicazione deve essere disponibile in orario lavorativo (lunedì-venerdì, 8:00-19:00).
- Non è richiesta alta disponibilità: un'indisponibilità temporanea non blocca il processo (il fallback è il Google Sheet).

### 10.4 Compatibilità

- Browser: Chrome (ultima versione) come browser primario.
- Responsive: non richiesto — l'applicazione è utilizzata esclusivamente da desktop.

### 10.5 Accessibilità

- Conformità minima **WCAG 2.1 livello AA** per le codifiche colore (contrasto sufficiente, non affidarsi al solo colore per comunicare informazioni).

---

## 11. Stack tecnologico

### 11.1 Architettura

L'applicazione è una **web app full-stack** basata su **Next.js** con **App Router**, deployata su **Vercel**. L'architettura segue il pattern **server-first** di Next.js: le pagine sono **Server Components** di default, con **Client Components** solo dove serve interattività (form, tabelle interattive, grafici). Le **API Routes** (Route Handlers) gestiscono le operazioni CRUD e le integrazioni esterne (Jira, import Factorial).

### 11.2 Componenti dello stack

| Livello | Tecnologia | Note |
| :---- | :---- | :---- |
| **Framework** | **Next.js** 15+ (App Router) | Server Components, Server Actions, middleware per auth. TypeScript obbligatorio su tutto il progetto |
| **Runtime** | **Node.js** 20+ | Runtime di Vercel |
| **Hosting** | **Vercel** | Deploy automatico da repository Git, preview per ogni branch, edge functions dove necessario |
| **Database** | **Vercel Postgres** (**Neon**) | PostgreSQL serverless integrato in Vercel. Scaling automatico, connection pooling nativo, branching del database per ambienti di preview |
| **ORM** | **Prisma** 6+ | Schema type-safe, migrazioni automatiche (`prisma migrate`), client generato con autocompletamento. Lo schema Prisma è la singola fonte di verità per il modello dati |
| **Autenticazione** | **Auth.js** (NextAuth.js v5) con **Google Provider** | Autenticazione tramite account **Google Workspace** aziendale. Due ruoli applicativi: `DEMAND_RESOURCE_MANAGER` (lettura/scrittura) e `BU_MANAGER` (sola lettura), mappati sugli indirizzi email autorizzati. Sessioni gestite via JWT |
| **UI Components** | **MUI** (Material UI) v6+ | Component library enterprise con **DataGrid** per la vista pivot, **DatePicker** per le date, **Charts** (MUI X Charts) per le dashboard. Tema personalizzato con i colori della codifica saturazione |
| **Styling** | **Emotion** (integrato in MUI) | CSS-in-JS come da default MUI. Tema centralizzato con design tokens derivati dalla brand identity SiMaggioli (vedi 11.6) |
| **Validazione** | **Zod** | Validazione type-safe degli input su Server Actions e API Routes. Schema Zod derivati dallo schema Prisma dove possibile |
| **Grafici dashboard** | **MUI X Charts** oppure **Recharts** | Per i grafici delle dashboard (saturazione trend, pipeline value, tempo di ciclo). MUI X Charts se sufficiente, Recharts come alternativa più flessibile |
| **Gestione stato client** | **React Server Components** + `useState`/`useReducer` | Nessun state manager globale (Redux, Zustand): lo stato vive nel server, i componenti client gestiscono solo lo stato locale di UI |

### 11.3 Integrazioni

| Integrazione | Modalità | Tecnologia |
| :---- | :---- | :---- |
| **Jira** | Sync giornaliera (sezione 4) | **Jira REST API v3** via Route Handler schedulato con **Vercel Cron Jobs** (`vercel.json`). Le credenziali (API token) sono memorizzate come **environment variables** su Vercel |
| **Factorial** | Import settimanale file (sezione 5) | Upload manuale di file CSV/Excel tramite form nell'applicazione. Parsing lato server con **Papa Parse** (CSV) o **SheetJS** (Excel) |

### 11.4 Ambienti

| Ambiente | Database | Scopo |
| :---- | :---- | :---- |
| **Sviluppo locale** | PostgreSQL locale o Neon branch di dev | Sviluppo e debug |
| **Preview** | Neon branch dedicato (creato automaticamente per ogni PR) | Review e validazione con dati di test |
| **Produzione** | Vercel Postgres (Neon) principale | Ambiente operativo |

### 11.5 Struttura del progetto

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

### 11.6 Palette colori SiMaggioli

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

> **Codifica saturazione:** i colori della codifica di saturazione nella vista pivot restano indipendenti dalla palette brand per garantire leggibilità immediata: 🟢 verde (sotto-utilizzo), 🔵 blu (fascia ottimale), 🟡 giallo (attenzione), 🔴 rosso (sovra-allocazione).

### 11.7 Import dati da file

#### Import risorse (CSV)

L'anagrafica delle risorse può essere importata tramite upload di un file **CSV** con i campi dell'entità Risorsa. Il D&R Manager carica il file dall'interfaccia; l'applicazione valida i dati, segnala eventuali errori riga per riga e importa le risorse valide. Le risorse già presenti (match su nominativo) vengono aggiornate, le nuove vengono create. Il formato atteso:

```
nominativo;ruolo;livello;tipologia;appartenenza;pool;is_ptf;note
Rossi Mario;BE;Mid;Interna;BU Documentale;Evolutiva;false;
Bianchi Anna;FE;Senior;Interna;BU Documentale;Evolutiva;true;Referente modulo Firma
Verdi Luca;Analista;Junior;Esterna;BU Documentale;Manutenzione;false;Consulente XYZ
```

> **Nota:** i parametri temporalizzati (ore settimanali, costo giornata, coefficiente di produttività, buffer individuale) non sono inclusi nell'import CSV — vengono gestiti manualmente nell'applicazione tramite l'entità Parametro risorsa, poiché richiedono date di validità e storicizzazione.

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

L'applicazione effettua il **match per nominativo** con le risorse in anagrafica, segnala i nominativi non riconosciuti e applica la **deduplicazione**: se un'assenza per la stessa risorsa e lo stesso giorno è già presente, non viene duplicata ma aggiornata con il valore più recente.