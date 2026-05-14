> 🌐 [English version](../../RELEASE_NOTES.md)

## 🖥️ v5.7.5 — Contrasto Pulsanti TUI + Correzioni Routing BMAD

**Rilascio:** 2026-05-13

### 🐛 Focus Pulsanti TUI: Testo Grigio Eliminato su Tutti i Terminali

I pulsanti focalizzati e selezionati nella TUI (schede voci, musica, impostazioni, configurazione) mostravano testo grigio chiaro su sfondo azzurro in molti terminali. Causa principale: `bold: true` combinato con un colore del testo scuro attiva la "modalità luminosa" del terminale, rendendo il colore grigio indipendentemente dall'esatto tono.

**Correzione:** Tutti gli stati di focus dei pulsanti usano ora **testo bianco su sfondo verde scuro (`#2e7d32`)** — lo stesso schema ad alto contrasto già usato dalla scheda Agenti. Gestori espliciti `focus`/`blur` sono stati aggiunti ai pulsanti modali di setup-tab per evitare che `attachBtnBlink` interferisca con l'applicazione passiva dei colori `style.focus` di blessed.

### 🐛 Indicatore ♪ del Selettore Voci nella Scheda BMAD Non Appariva

L'indicatore ♪ di anteprima nell'elenco voci della scheda BMAD non appariva durante l'anteprima. Nella scheda Agenti mancavano le chiamate `_refreshVP()` che la scheda Impostazioni aveva già. Un timer di visualizzazione minimo di 2 secondi mantiene ora l'indicatore visibile quando SSH-remote termina immediatamente (modalità fire-and-forget).

### 🐛 Installazione Non Interattiva: Pretest Generico Invece del Nome del Progetto

Eseguire `agentvibes install` in modo non interattivo impostava sempre il pretest come `"Claude Code here"` indipendentemente dal progetto. L'installer deriva ora un pretest consapevole del progetto da `path.basename(process.cwd())` con capitalizzazione (es., `"MyProject here"`), con un fallback sicuro per i percorsi root Docker.

### 🐛 Pretest Globale che Sovrascrive la Configurazione per Progetto

`seedAllLlmDefaultsSync` seminava le righe LLM a livello di progetto con la stringa di pretest globale, causando la sovrascrittura dei valori `tts-pretext.txt` per progetto con il globale `"Claude Code here"`. Le righe a livello di progetto ora vengono seminate con pretest vuoti in modo che il file per progetto abbia la precedenza.

### 🐛 Variante TERM `screen`/`tmux` Causava Errore di Capacità `plab_norm`

Quando `TERM` era impostato su una variante `screen-*` o `tmux-*`, blessed lanciava un errore di capacità terminale `plab_norm` all'avvio. L'app sovrascrive ora `TERM` a `xterm-256color` prima di creare lo schermo blessed quando viene rilevata tale variante.

### 🐛 Musica/Riverbero per Agente BMAD Non Raggiungeva il Ricevitore SSH

`play-tts.sh` non inoltrava `AGENT_PROFILE_FILE` al trasporto remoto SSH, quindi le sovrascritture di musica di sottofondo e riverbero per agente nella scheda BMAD venivano ignorate silenziosamente per l'audio remoto. Il percorso del file di profilo viene ora passato come argomento 4 a `play-tts-ssh-remote.sh`.

### 🐛 Compatibilità Node 18: `import.meta.dirname` Sostituito

Un file di test usava `import.meta.dirname`, disponibile solo in Node 21+. Sostituito con il pattern `fileURLToPath(import.meta.url)` affinché i test vengano eseguiti correttamente su Node 18 e 20.

---

## 🎭 v5.7.0 — Supporto BMAD v6.6 + Riavvio Automatico del Watcher Windows

**Rilascio:** 2026-05-11

### 🆕 Compatibilità con BMAD v6.6.0

BMAD v6.6 ha ristrutturato la posizione degli agenti — spostati da `_bmad/bmm/agents/` a `.claude/skills/*/agents/`. AgentVibes ora rileva e analizza correttamente questi nuovi percorsi.

**L'iniezione TTS** salta elegantemente gli agenti v6.6+ (che usano Markdown semplice senza sezioni di attivazione XML/YAML) invece di generare errori. Il riepilogo di installazione ora indica chiaramente quanti agenti sono stati saltati vs. modificati.

**Il rilevamento nella scheda BMAD** trova ora BMAD installato globalmente in `~/_bmad` (installazione nella home directory) oltre alle installazioni locali del progetto. In precedenza, la scheda BMAD mostrava "Non rilevato" anche quando BMAD era installato globalmente.

**Sicurezza:** La validazione dei percorsi dell'installatore ora permette correttamente i percorsi BMAD sotto la home directory dell'utente, correggendo un falso positivo "Percorso BMAD non valido" per le installazioni globali.

### 🆕 Watcher TTS Windows — File Autonomo + Riavvio Automatico

`tts-watcher.ps1` viene ora estratto come file autonomo in `~/.agentvibes/tts-watcher.ps1`. L'esecuzione di `npx agentvibes update` ora copia l'ultimo watcher **e** lo riavvia automaticamente — sia il file che il processo vengono aggiornati in un unico passaggio, senza riavvio manuale.

### 🐛 Override del Provider Windows Rispettato sul Laptop

`play-tts.ps1` ora legge l'impostazione `ProviderOverride` dalla configurazione lato Linux quando riceve audio via SSH. In precedenza, il laptop usava sempre il suo provider configurato localmente anche se il server ne specificava uno diverso.

### 🐛 Comando Sample Aggiunto al Gestore Vocale

`voice-manager.sh sample` mancava del suo gestore — chiamarlo cadeva silenziosamente nel percorso di utilizzo/uscita. Corretto.

### 🐛 Il Routing SSH di Anteprima Rileva l'Endpoint Corretto

`provider-manager.sh` ora include `detect_routing_llm()` che controlla `AGENTVIBES_LLM_KEY` e poi `transport-config.json` per la prima voce `mode=remote`, in modo che l'audio di anteprima raggiunga l'host SSH corretto.

---

## 🔇 v5.6.9 — Riverbero e Musica di Sfondo Silenziosi nelle Installazioni NPX

**Rilascio:** 2026-05-09

### 🐛 Riverbero e Musica di Sfondo Silenziosamente Rotti per Tutti gli Utenti NPX

Quando AgentVibes viene installato tramite `npx`, i file hook vengono estratti dal pacchetto con permessi 644 — senza bit di esecuzione. `play-tts-piper.sh` chiamava `audio-processor.sh` direttamente, che termina immediatamente con codice 126 (Permesso negato) su un file non eseguibile. Tutti gli utenti installati via `npx` ricevevano TTS solo voce — nessun riverbero, nessuna musica di sfondo, silenziosamente.

**Correzione 1:** `play-tts-piper.sh` ora chiama `audio-processor.sh` tramite `bash "$SCRIPT_DIR/audio-processor.sh"`, bypassando il controllo del bit di esecuzione.
**Correzione 2:** `install-deps.js` (postinstall) ora esegue `ensureHookPermissions()` per applicare `chmod 755` a tutti i file `.sh` dopo npm install.

### 🐛 L'Anteprima del Browser Vocale Ignorava Riverbero e Musica di Sfondo

Il pulsante **Anteprima** nel Browser Vocale riproduceva l'output grezzo di piper senza riverbero né musica di sfondo, bypassando completamente `audio-processor.sh`.

**Correzione:** L'audio di anteprima ora passa attraverso la stessa pipeline `audio-processor.sh` del TTS reale.

### 🐛 Il MCP `text_to_speech` Restituiva Percorso File Corrotto e Informazioni Vocali Mancanti

Lo strumento estraeva il percorso del file audio in modo errato (inclusi caratteri di dimensione/emoji finali) e non riportava mai il nome della voce nella sua risposta.

**Correzione:** I codici ANSI vengono rimossi prima dell'analisi, il percorso `.wav` viene estratto correttamente, e la riga `🎤 Voce utilizzata:` è inclusa nella risposta dello strumento.

### 🐛 Il Toggle Musica di Sfondo nella TUI Non Aveva Effetto

Abilitare la musica di sfondo nella scheda **Musica** scriveva in `config.json` ma non in `background-music-enabled.txt` (letto dagli hook bash). La musica rimaneva disabilitata dopo il toggle. Salvare una traccia ora implica anche l'abilitazione della musica.

---

## 🐧 v5.6.8 — Routing Vocale WSL Corretto + Affidabilità del Ciclo di Vita della Sessione

**Rilascio:** 2026-05-09

### 🐛 WSL: Ora Viene Riprodotta la Voce Configurata (Non il Fallback su lessac)

Nelle sessioni WSL, AgentVibes riproduceva `en_US-lessac-medium` indipendentemente dalla voce configurata. La causa principale: `pipx` installa Piper in `~/.local/bin/`, che le shell interattive ottengono tramite `.bashrc`/`.zshrc`, ma le chiamate Bash di Claude Code vengono eseguite in modo non interattivo e saltano il caricamento dei profili — `command -v piper` falliva, tornando alla voce predefinita.

**Correzione:** `play-tts-piper.sh` ora antepone `~/.local/bin` e il bin del venv Piper di pipx al `PATH` prima del controllo del binario, così Piper viene trovato indipendentemente dalla modalità della shell.

### 🐛 Voce/Musica Per-Progetto Persa Quando `CLAUDE_PROJECT_DIR` Non È nell'Ambiente Bash

Quando Claude Code esegue una chiamata allo strumento Bash, `CLAUDE_PROJECT_DIR` non viene passato nell'ambiente. I hook TTS non riuscivano a trovare la configurazione per-progetto e tornavano ai valori globali predefiniti — voce errata, musica errata, nessun pretext.

**Correzione:** `session-start-tts.sh` (e `.ps1`) ora incorpora la directory del progetto nel comando hook iniettato come `--project-dir`. `play-tts.sh` legge questo flag prima di qualsiasi ricerca di configurazione, così il routing per-progetto è affidabile in ogni chiamata allo strumento Bash.

### 🐛 `play-tts-piper.sh` e `play-tts-piper.ps1` Non Distribuiti da `agentvibes install`

Questi hook erano assenti da `CRITICAL_HOOKS` / `CRITICAL_HOOKS_WINDOWS`, quindi `agentvibes install` non propagava mai le versioni aggiornate a `~/.claude/hooks/`.

**Correzione:** Entrambi sono ora nell'elenco degli hook critici e vengono sempre distribuiti all'installazione/aggiornamento.

### 🐛 Bug nei Nomi Visualizzati delle Voci

- `uniquifyVoiceName("Mary-1")` restituiva `"Mary-1 Bell"` invece di `"Mary Bell"`.
- I nomi 16Speakers come `Rose_Ibex` ricevevano erroneamente un cognome aggiunto (`"Rose Ibex Bell"`).
- La riga `🎤 Voice used:` era assente dall'output bash di WSL.

Tutti e tre risolti. Un nuovo file di test (`test/unit/voice-names.test.js`, 16 test) copre questi casi.

---

## 🪟 v5.6.7 — Il Pulsante Anteprima Funziona Correttamente su Windows

**Rilascio:** 2026-05-08

### 🐛 Il Pulsante Anteprima Ora Funziona Correttamente su Windows

Quando si configurava l'audio per LLM su Windows, cliccando **Anteprima** veniva riprodotta la voce sbagliata (con Windows SAPI come predefinito) senza musica di sottofondo né riverbero. Ora riproduce esattamente la voce, il riverbero e la traccia di sottofondo che hai configurato.

### 🧪 Test di Regressione Aggiunti

Due nuovi test CI per Windows verificano la ricerca della configurazione di anteprima — così questo problema non potrà regredire silenziosamente in un rilascio futuro.

---

## 🔇→🎵 v5.6.6 — Anteprima Musica di Sottofondo Corretta per npm link e Installazioni Globali

**Rilascio:** 2026-05-08

### 🐛 Musica di Sottofondo Silenziosamente Assente dall'Anteprima (npm link / Installazione Globale)

Quando cliccavi **Anteprima** nel modale di configurazione LLM con una traccia di sottofondo impostata, sentivi solo la voce — nessuna musica — a meno che AgentVibes non fosse installato come dipendenza locale. Corretto indipendentemente da come installi AgentVibes.

**Causa principale:** Nelle installazioni tramite `npm link` e globali, uno script di sincronizzazione che usa `rsync --delete` cancellava periodicamente `background-music-enabled.txt` dalla directory del pacchetto perché il file è gitignored. Dopo la cancellazione, `audio-processor.sh` tornava a una configurazione globale con la musica disabilitata — silenzio.

**Correzione:** `audio-processor.sh` ora controlla **prima** `CLAUDE_PROJECT_DIR/.claude/config/background-music-enabled.txt`. L'anteprima TUI scrive anch'essa il flag nella directory del progetto (non nella directory del pacchetto), così sopravvive a qualsiasi sincronizzazione della directory del pacchetto.

### 🐛 Configurazione Per-LLM Non Trovata in npm link / Installazioni Globali

Nelle stesse installazioni, `audio-processor.sh` non riusciva a trovare la configurazione audio per-LLM (voce, riverbero, traccia di sottofondo) quando il tuo progetto non era il pacchetto AgentVibes stesso.

**Correzione:** Lo script ora cerca `CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg` prima di tornare alla configurazione del pacchetto.

### 🐛 Traccia di Sottofondo "Non Trovata" Dopo Configurazione Corretta

Quando una traccia di sottofondo era configurata ma AgentVibes era installato globalmente o tramite `npm link`, il file della traccia non veniva trovato — veniva cercata solo la directory del pacchetto.

**Correzione:** `audio-processor.sh` ora cerca anche in `CLAUDE_PROJECT_DIR/.claude/audio/tracks/` quando la traccia non si trova nella directory del pacchetto.

### 🐛 Parsing delle Righe di Configurazione LLM — Volume che Assorbe Colonne Extra

Con una riga LLM completa a 7 colonne (il formato scritto dalla TUI), il campo del volume assorbiva tutte le colonne finali. ffmpeg riceveva una stringa del volume malformata e tornava silenziosamente all'audio solo voce.

**Correzione:** Il parser cattura ora solo il campo del volume numerico, lasciando le colonne extra in `_rest`.

### 🧪 Suite di Test CI per Windows

I test nativi per Windows ora girano in CI insieme alla suite BATS per Linux, bloccando la pubblicazione in modo che i percorsi specifici di Windows non possano regredire silenziosamente.

---

## 🛡️ v5.6.4 — Correzione Critica di Sicurezza della Disinstallazione

**Rilascio:** 2026-05-08

### 🐛 La disinstallazione con `--global` non cancella più ~/.claude/

Con `--global`, il programma di disinstallazione rimuoveva `~/.claude/` in modo ricorsivo invece di eliminare solo i percorsi di proprietà di AgentVibes al suo interno. Questo causava la perdita totale dei dati — impostazioni, CLAUDE.md, skill, plugin, configurazioni MCP, strumenti personalizzati, tutto. Confermato come reale, confermato come corretto.

**v5.6.4 esegue una rimozione chirurgica — solo i percorsi installati da AgentVibes:**

- `~/.claude/hooks/`, `hooks-windows/`, `commands/agent-vibes/`, `personalities/`, `audio/`
- `~/.agentvibes/` — interamente di proprietà di AgentVibes, rimosso completamente
- `settings.json`, `CLAUDE.md`, skill, plugin, configurazioni MCP — **intatti**

Un test di regressione ora impone questo vincolo in CI. Se qualcuno reintroduce una cancellazione ampia, il build fallisce:

```js
// issue #182 regression guard
assert: settings.json and CLAUDE.md survived --global uninstall
```

Non può regredire silenziosamente — il build si romperà prima.

---

## 🌟 v5.6.3 — AgentVibes arriva su Hermes + Configurazione remota più semplice

**Rilascio:** 2026-05-07

### 🎉 AgentVibes ora funziona con Hermes

**[Hermes](https://github.com/NousResearch/hermes-agent)** è uno degli agenti AI open source più popolari su GitHub — oltre 21.000 stelle e in crescita. AgentVibes si integra ora con esso immediatamente: quando Hermes termina una risposta, AgentVibes la legge ad alta voce attraverso i tuoi altoparlanti automaticamente. Nessuna configurazione aggiuntiva oltre all'installazione del hook incluso.

### 🎉 Destinazione audio per LLM — scegli da dove esce la voce

Quando configuri un LLM in AgentVibes (Claude Code, Copilot, Codex o Hermes), potevi già impostare una **voce, uno stile di riverbero, una musica di sottofondo e un prefisso introduttivo** unici per ciascuno. Ora puoi anche impostare la **destinazione audio** per LLM:

- **Locale** — riproduzione tramite gli altoparlanti del computer su cui stai lavorando
- **Remoto** — inviare l'audio a una macchina diversa (il tuo laptop, ad esempio) mentre lavori su un server remoto o esegui Hermes nel cloud

### 🎉 Selettore di alias SSH — niente più digitazione di percorsi a mano

Configurare l'audio remoto richiedeva in precedenza di digitare manualmente un percorso SSH. Ora c'è un **menu a tendina direttamente nella TUI di AgentVibes** che legge gli alias SSH già presenti sulla tua macchina. Scegli quello che punta ai tuoi altoparlanti — fatto. La tua voce ti segue sia in locale che in remoto.

### 🐛 Correzioni

- **Nessun audio del tutto** — alcune configurazioni producevano silenzio completo senza alcun messaggio di errore. Risolto.
- **Voce sbagliata in riproduzione** — in alcune configurazioni, AgentVibes ignorava le impostazioni vocali per IA e tornava al valore predefinito. Risolto.
- **Impostazioni audio che si propagano tra i messaggi** — la musica o il riverbero impostati per un messaggio potevano trasmettersi accidentalmente al successivo. Risolto.
- **Messaggi persi dopo un crash** — se AgentVibes crashava nel mezzo di un messaggio, quel messaggio veniva perso. Ora lo recupera e lo riproduce al riavvio.

---

## 🎛️ v5.6.2 — Per-Message Audio Control for Remote Providers

> See [English release notes](../../RELEASE_NOTES.md) for full details.

---


## 🤖 v5.6.1 — Integrazione Hermes Agent & Correzioni PS5.1 Windows

**Rilascio:** 2026-05-01

### 🎉 Integrazione Hermes Agent (Nuovo!)

AgentVibes supporta ora ufficialmente **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — l'assistente AI self-hosted e auto-migliorante. Due skill Hermes pronte per la produzione sono incluse in `docs/hermes/skills/`:

**`hermes-agentvibes-hook`** — Vocalizza automaticamente ogni risposta Hermes tramite AgentVibes
- Si attiva a ogni evento `agent:end` (Telegram, Discord, CLI, ecc.)
- Rimuove markdown, blocchi di codice ed emoji prima di parlare
- Tronca ai confini delle parole, limita la frequenza per evitare sovraccarico della coda
- SSH sicuro contro MITM con `StrictHostKeyChecking=accept-new` + `known_hosts` persistente
- Log completo in `tts-hook.log` per il debug

**`agentvibes-target`** — Insegna a Hermes a inviare qualsiasi testo agli altoparlanti su richiesta
- Payload JSON in base64 via SSH (stessa architettura ForceCommand del ricevitore Windows)
- Supporta target Windows e Android
- Guida dettagliata alla risoluzione dei problemi inclusa

**Installazione:** Copia la skill nella home Hermes e riavvia il gateway:
```bash
cp -r docs/hermes/skills/tts/hermes-agentvibes-hook ~/.hermes/skills/tts/
hermes gateway restart
```

### 🐛 Correzioni PS5.1 Windows

- **Compatibilità PS5.1 di play-tts.ps1** — Corrette tre regressioni dal rebase v5.6.0:
  sostituito l'operatore null-condizionale PS7 (`?.`) con if/else compatibile PS5.1, aggiunto BOM UTF-8
  per evitare la corruzione dei trattini em con CP1252, ripristinato l'alias del provider piper e
  il sentinel `AGENTVIBES_TEXT_FILE` persi nel merge
- **Correzioni modal & hotkey** — Tasto Esc del modal, hotkey di navigazione, Q+Bloc Maiusc
  e gestione degli errori di anteprima vocale tutti riparati
- **Tab BMAD** — Ora mostra tutti gli agenti indipendentemente dal modulo

---

## 🎵 v5.5.0 — Routing Audio per LLM e Resilienza dell'Installatore Windows

**Rilascio:** 2026-04-27

### 🆕 Routing Audio per LLM
Ogni LLM (Claude Code, Copilot, Codex) può ora avere la propria voce, pretext, riverbero e impostazioni di
musica di sottofondo. Il server MCP passa `--llm <key>` sia a `play-tts.sh`
(Linux/macOS) che a `play-tts.ps1` (Windows), e gli script cercano le righe `llm:<key>` in
`audio-effects.cfg`. Le righe predefinite per `claude-code`, `copilot` e `codex` sono incluse
fin da subito; configurale tramite **Setup → Predefinito → Configura** nel TUI.

### 🐛 Correzione del Crash dell'Installatore Windows
Corretto l'errore `spinner.info is not a function` che mandava in crash le **reinstallazioni** di AgentVibes su Windows
quando gli utenti avevano una vecchia installazione globale. Tutte le 10 funzioni di copia file dell'installatore ora
avvolgono il proprio spinner con `createRobustSpinner()` in modo che i chiamanti obsoleti non possano mai causare
un crash indipendentemente dai metodi che espongono.

### 🎶 Parità della Musica di Sottofondo su Windows
La riproduzione TTS su Windows ora preferisce `ffplay` (resampling sinc, nessun artefatto) rispetto al
resampler `SoundPlayer` di WinMM di bassa qualità. Il nuovo helper `Invoke-AudioPlay` gestisce il fallback
in modo trasparente — se `ffplay` non è disponibile, viene usato `SoundPlayer` come prima.

### 🎉 Punto di Ingresso Multipiattaforma della Modalità Party
I file dei passi della modalità party BMAD e la skill di Copilot ora fanno riferimento in modo coerente a
`node bin/bmad-speak.js` — l'unico punto di ingresso multipiattaforma che delega a
`bmad-speak.ps1` su Windows e `bmad-speak.sh` altrove.

### 🔧 Altre Correzioni
- `play-tts.sh` ora accetta un flag nominato `--llm <key>` oltre alla variabile d'ambiente `LLM_PROVIDER`
- `mcp-server/server.py` gestisce la catena di priorità `AGENTVIBES_LLM` → `CLAUDECODE=1` → `AGENTVIBES_MCP_FALLBACK`
  e inoltra la chiave risolta come `-llm`/`--llm` agli script TTS
- Aggiunte righe in `audio-effects.cfg` per `llm:claude-code`, `llm:copilot`, `llm:codex`
- Aggiunti `command-routing.test.js` e test unitari di `ConfigService`
- Il guardiano del contenuto npm pack rileva ora i file pubblicabili non tracciati

### 📊 Tecnico
- 231 test superati (0 fallimenti)

---

## 🎛️ v5.4.0 — Installatore TUI, Correzione dello Spinner e Pulizia delle Dipendenze

**Rilascio:** 2026-04-22

### ✨ Novità
- **Installatore TUI**: Interfaccia terminal interattiva per l'installazione guidata — sfoglia voci, configura provider, abilita la modalità party BMAD, il tutto da una bellissima interfaccia terminal
- **Correzione dello Spinner Multipiattaforma**: Risolto il crash `spinner.info is not a function` su WSL/Linux che bloccava l'installazione

### 🐛 Correzioni di Bug
- **Rimossa la dipendenza circolare da se stesso**: `package.json` dipendeva da `agentvibes@^3.5.9` (se stesso), facendo sì che npm coprisse il binario corretto con quello vecchio e difettoso — la causa silenziosa del crash dello spinner nelle reinstallazioni
- **Ripristinato il fallback del volume della musica di sottofondo**: Il fallback `bg_volume="0.20"` di `audio-processor.sh` perso in un merge è stato ripristinato
- **Corretta la rilevazione di PROJECT_ROOT in `play-tts.sh`**: La logica di risalita andava 2 livelli in più, causando l'uso della config globale `~/.agentvibes` invece di quella del progetto

### 🔧 Tecnico
- 706/738 test superati

---

## 🎯 v5.3.0 — Prendi il Controllo delle Voci Remote

**Data di rilascio:** Aprile 2026

Se stai usando AgentVibes per inviare annunci vocali da un server al tuo
telefono, laptop o un'altra macchina, questa versione ti mette al posto
di comando. Ogni chiamata può ora scegliere la propria voce, musica di
sottofondo, frase introduttiva, riverbero, volume e velocità — direttamente
dalla riga di comando, solo per quel singolo messaggio.

### ✨ Novità

#### Ora puoi personalizzare ogni annuncio individualmente

Prima, se volevi una voce o una musica diversa per un messaggio
specifico, dovevi modificare un file di configurazione (e ricordarti di
rimetterlo com'era). Ora basta aggiungere un flag al comando.

Vuoi che Winston parli con il suo accento britannico mentre suona del
jazz per questa specifica notifica di deploy? Facile:

```bash
bash .claude/hooks/play-tts-ssh-remote.sh \
  --text "Deploy complete" \
  --voice "en_US-ryan-high" \
  --pretext "Winston here" \
  --music "Late Night Hip Hop Groove.mp3" \
  --volume 0.25
```

Tutto ciò che non specifichi ricade sulle tue impostazioni normali. Vuoi
saltare la frase introduttiva solo per questa volta? Passa `--pretext ""`
e resterà in silenzio prima del messaggio.

**Flag disponibili:**
- `--voice` — quale voce Piper usare
- `--pretext` — la frase introduttiva prima del messaggio (passa `""` per saltarla)
- `--music` — traccia di musica di sottofondo (i nomi di file con spazi ora funzionano!)
- `--volume` — quanto forte è la musica di sottofondo (0.0 a 1.0)
- `--effects` — catena di effetti sonori come il riverbero
- `--speed` — quanto velocemente parla la voce
- `--provider` — quale motore TTS usare
- `--agent` — quale personalità di agente usare

Il vecchio modo di chiamare lo script continua a funzionare, quindi nulla
di ciò che hai già configurato si romperà.

### 🛠 Correzioni di Affidabilità

- **Messaggi lunghi e caratteri speciali non vengono più tagliati.** Su
  Windows, annunci lunghi o testi con virgolette, apostrofi o emoji
  venivano rovinati prima di raggiungere il motore vocale. Risolto —
  il tuo messaggio ora arriva esattamente come l'hai inviato, per quanto
  lungo o strano possa essere.

- **Gli annunci vocali ora funzionano sui server Windows senza monitor.**
  Windows si rifiuta di riprodurre audio nella sessione "service" che
  SSH normalmente usa. Un piccolo helper in background ora gira nella
  tua normale sessione utente e preleva gli annunci da una coda, così
  l'audio viene riprodotto correttamente anche sui server headless.

- **L'anteprima vocale nella TUI funziona sui server remoti.** Prima,
  se facevi l'anteprima di una voce da un server senza altoparlanti,
  provava a riprodurla localmente (e falliva). Ora viene correttamente
  trasmessa al dispositivo remoto che hai configurato.

- **Niente più doppie frasi introduttive.** Se avevi impostato un pretext
  sia sul server mittente che sulla macchina destinataria, prima lo
  sentivi due volte. Ora vince la versione del mittente — il destinatario
  non ne aggiungerà una propria sopra.

- **Le impostazioni di streaming remoto ora si mantengono davvero.** Una
  modifica recente faceva sì che le configurazioni di streaming remoto
  (`ssh-remote`, `agentvibes-receiver`) venissero accidentalmente
  sovrascritte e ripiegassero sulla riproduzione locale. Risolto.

- **Gli annunci lunghi non vengono interrotti a metà frase.** Il timeout
  di sicurezza che ferma l'audio bloccato era troppo aggressivo per i
  messaggi lunghi. Ora è abbastanza generoso da gestire annunci della
  lunghezza di un paragrafo.

- **Stato dell'installer più pulito** — quando installi AgentVibes per
  Claude Code, ora scrive il proprio file del provider TTS in modo
  esplicito invece di affidarsi a stato implicito.

### 🧪 Testing

55 nuovi test assicurano che la modalità party BMAD continui a
funzionare: ogni agente ottiene la propria voce e musica univoche, gli
agenti non condividono accidentalmente lo stesso speaker ID Piper, e
l'installer punta sempre la modalità party al punto di ingresso
cross-platform.

---

## 🎯 v5.2.1 — Identità Multi-LLM e Rifinitura dell'Installazione

**Data di rilascio:** Aprile 2026

Routing LLM rifinito per Copilot/Codex ed esperienza di configurazione migliorata.

### ✨ Novità

#### Routing Identità Multi-LLM

- **GitHub Copilot ora ha la propria voce, pretext e musica di sottofondo** — completamente distinto da Claude Code e Codex. Saluta con "Copilot here" al ritmo della bossa nova.

- **Config MCP per ogni strumento con identità esplicita** — ogni strumento AI (`.vscode/mcp.json`, `.codex/config.toml`, `~/.copilot/mcp-config.json`) imposta il proprio `AGENTVIBES_LLM` per un routing deterministico.

- **Lo strumento MCP `get_config` ora restituisce il LLM rilevato** — così l'assistente chiamante può confermare il proprio routing e rispondere con la voce giusta fin dall'inizio.

- **Rifiniture di compatibilità Linux** — fine riga CRLF, permessi e gestione dell'override del provider di trasporto.

#### Miglioramenti al Flusso di Setup

- **Flusso di navigazione da tastiera** — premendo Invio sui pulsanti Installa (Claude → Copilot → Codex), ora salta a **Configura Claude**, permettendoti di percorrere tutte e tre le Configurazioni prima di atterrare su Predefinito.

- **La freccia giù salta la riga Predefinito** dalle colonne Installa/Rimuovi.

- **Messaggi di successo parziale dell'installazione** — se le copie dei file hanno successo ma la config MCP ha bisogno di una spinta, vedrai un chiaro avviso invece di un fallimento generico.

#### Predefiniti

- **Musica di sottofondo predefinita di Claude Code** impostata su Chillwave (`agent_vibes_chillwave_v2_loop.mp3`).

#### Sotto il Cofano

- Validazione chiave LLM rafforzata per una gestione più sicura delle variabili d'ambiente.
- Logging errori migliorato per casi limite nelle scritture di config Copilot CLI.
- Limitazione nota documentata: se lanci VS Code da un terminale avviato da Claude Code, `CLAUDECODE=1` può trapelare — la soluzione è `unset CLAUDECODE` prima.

---

## 🎯 v5.2.0 — Anteprima Voce Remota + Modalità Caveman + Valutazioni Vocali

**Data di rilascio:** Aprile 2026

Questa versione aggiunge il supporto all'anteprima TTS remota, una nuova modalità di verbosità ultra-sintetica e valutazioni pollice su/giù per le voci in tutta la TUI.

### Nuove Funzionalità

- **Modalità verbosità caveman** — Nuovo livello di verbosità `caveman` per output TTS ultra-sintetico. Frammenti invece di frasi complete. Impostabile tramite `/agent-vibes:verbosity caveman` o lo strumento MCP `set_verbosity`. Scarica automaticamente una voce alla prima installazione se non ne sono presenti.

- **Valutazioni vocali pollice su/giù** — Sostituisce i vecchi preferiti a stelle con valutazioni 👍/👎. Premi `+` per pollice su, `-` per pollice giù sia nella scheda Voci che nel selettore vocale (scheda Configurazione). Le valutazioni persistono tra le sessioni e sono condivise tra tutte le interfacce di selezione vocale.

- **Anteprima voce remota** — L'anteprima vocale nella scheda TUI Voci, nel selettore vocale e nel browser voci funziona ora su server headless. Quando il provider attivo è `ssh-remote` o `agentvibes-receiver`, l'anteprima viene instradata tramite `play-tts.sh` per riprodurre l'audio sul ricevitore remoto, senza richiedere Piper locale + lettore audio. Consapevole della piattaforma: usa PowerShell su Windows, bash su Linux.

- **Routing del provider ricevitore SSH** — `ssh-remote` e `agentvibes-receiver` sono ora provider di prima classe in `play-tts.sh`. Sia la funzione `speak_text()` che l'istruzione case del routing principale li supportano, eliminando gli errori "Unknown provider".

### Correzioni

- **Patch automatica dei nomi speaker LibriTTS** — Il download delle voci ora applica automaticamente la patch ai nomi degli speaker LibriTTS in modo che le voci multi-speaker funzionino correttamente fin da subito.
- **Regex di validazione vocale rafforzata** — La regex del parametro VOICE in `play-tts-ssh-remote.sh` e `play-tts-agentvibes-receiver.sh` ora consente `::` (multi-speaker), `.` (locale) e spazi (nomi speaker) senza accettare la barra rovesciata (rischio di iniezione). I template dei ricevitori Linux e Windows sono stati aggiornati di conseguenza.
- **Compatibilità cross-platform `base64`** — `play-tts-agentvibes-receiver.sh` ora testa GNU `base64 -w 0`, ricade su BSD `-b 0`, poi su `tr -d '\n'`. Risolve l'interruzione dello script su sistemi macOS/BSD.
- **Correzione doppia elaborazione effetti audio** — `play-tts-piper.ps1` salta la propria chiamata al processore audio quando `AGENTVIBES_NO_PLAY` è impostato, impedendo che riverbero/musica vengano applicati due volte.
- **Correzione perdita codice di uscita** — `play-tts.ps1` ora esce esplicitamente con codice 0, impedendo che i codici di uscita dei comandi nativi (piper, ffmpeg, sox) trapelino causando falsi rapporti di errore TTS.
- **Supporto piattaforma Windows nella scheda ricevitore** — Il rilevamento dell'IP Tailscale, l'IP locale tramite PowerShell, la lettura di sshd_config e la copia negli appunti funzionano ora nativamente su Windows.
- **Riga effetti audio `llm:default`** — La nuova riga predefinita in `audio-effects.cfg` garantisce che i ricevitori remoti ottengano riverbero, musica e pretesto anche senza una voce di configurazione per LLM.
- **Testo di esempio anteprima** — Modificato per evitare il difetto di pronuncia di Piper sulla parola "preview".
