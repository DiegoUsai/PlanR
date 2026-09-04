# Nota correzioni spec v2.8

**Data:** 4 settembre 2026
**Da:** Sessione grilling Claude Code
**Per:** Agente revisione spec / Diego Usai

---

## Correzioni proposte alla specifica funzionale (Draft v2.8)

### 1. Tabella mapping — riga "Stimato + Allocazioni soft coprono stima_gg"

**Sezione:** 3.1, tabella "Mapping stato Jira → stato interno"

**Testo attuale:**
> | Stimato | Allocazioni soft coprono `stima_gg` | **Allocato Soft Lock** |

**Problema:** la spec specifica "allocazioni soft" ma il sistema non impone un vincolo di tipo lock per iniziative Stimato. Il D&R Manager potrebbe pre-configurare un hard lock prima dell'approvazione Jira (motivi operativi). La macchina a stati tratta qualsiasi allocazione come "soft" ai fini dello status quando Jira = Stimato.

**Correzione proposta:**
> | Stimato | Allocazioni (qualsiasi tipo lock) coprono `stima_gg` | **Allocato Soft Lock** |

Aggiungere nota: "Un'iniziativa con stato Jira 'Stimato' non può raggiungere lo stato 'Confermato Hard Lock' indipendentemente dal tipo di lock delle allocazioni. Lo stato interno riflette la fase contrattuale (Stimato = non ancora approvato)."

---

### 2. Definizione "Completato" — manca precondizione

**Sezione:** 3.1, tabella "Stati interni calcolati"

**Testo attuale:**
> | **Completato** | Raggiunta la `data_fine` dell'ultima allocazione attiva |

**Problema:** la definizione standalone non chiarisce che Completato è raggiungibile solo da Confermato Hard Lock (Jira = Approvato + effort coperto). Dalla tabella transizioni è chiaro, ma la definizione isolata potrebbe essere fraintesa.

**Correzione proposta:**
> | **Completato** | Iniziativa in stato Confermato Hard Lock la cui `data_fine` dell'ultima allocazione attiva è stata superata. Rilevato automaticamente dal sistema (cron giornaliero + verifica al caricamento pagina) |

---

### 3. Meccanismo di rilevamento Completato — non documentato

**Sezione:** 3.1 o 8 (regole di business)

**Problema:** la spec definisce la condizione per Completato ma non il meccanismo di rilevamento. Trattandosi di un evento temporale (non un'azione utente), servono due meccanismi complementari:

**Testo da aggiungere:**
> **Rilevamento stato Completato:** il sistema rileva automaticamente il passaggio a Completato tramite:
> 1. **Cron giornaliero** — un job pianificato scansiona ogni mattina le iniziative in stato Confermato Hard Lock e aggiorna a Completato quelle la cui data fine dell'ultima allocazione è stata superata.
> 2. **Verifica al caricamento** — le API che restituiscono iniziative verificano in tempo reale se iniziative in Confermato Hard Lock dovrebbero essere Completato, garantendo immediatezza anche se il cron non ha ancora eseguito.

---

### 4. Rivalutazione stato su CRUD allocazioni — non esplicitata

**Sezione:** 7.5 o 3.1

**Problema:** le transizioni della macchina a stati implicano che lo stato cambia quando allocazioni vengono create/modificate/eliminate ("allocazione creata ma non copre stima_gg → Pending Resources", "allocazione rimossa/ridotta → Pending Resources"), ma non è esplicitato che il sistema deve rivalutare automaticamente lo stato dell'iniziativa dopo ogni operazione CRUD sulle allocazioni.

**Testo da aggiungere:**
> **Rivalutazione automatica:** ogni operazione di creazione, modifica o eliminazione di un'allocazione innesca automaticamente la rivalutazione dello stato interno dell'iniziativa collegata, secondo la macchina a stati della sezione 3.1. La rivalutazione avviene anche in caso di disattivazione risorsa con rilascio allocazioni future.

---

## Nota: non sono correzioni

Le seguenti decisioni dalla sessione grilling sono **coerenti con la spec attuale** e non richiedono modifiche:

- Override #1 (stati non pianificabili scartati): implementato, spec corretta
- Override #2 (moduli N:N con jiraComponent): implementato, spec corretta
- Simplification #3 (no conferma parziale): implementato, spec corretta
- Correction #4 (data_inizio_desiderata rimossa): implementato, spec corretta
- Simplification #8 (Stato Jira solo nel drawer): implementato, spec corretta
