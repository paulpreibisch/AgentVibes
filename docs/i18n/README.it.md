> 🌐 [English version](../../README.md)

**Autore**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Versione**: v5.4.0

---

**🎛️ NOVITÀ IN v5.4.0 — Installatore TUI e Correzioni:**
- 🖥️ **Installatore TUI** - Interfaccia terminal interattiva: sfoglia voci, configura provider, abilita la modalità party BMAD
- 🔧 **Correzione dello Spinner** - Risolto il crash `spinner.info is not a function` su WSL/Linux
- 🐛 **Correzione della Dipendenza Circolare** - Rimossa la dipendenza auto-referenziale `agentvibes@^3.5.9` che rompeva silenziosamente le installazioni
- 🎵 **Correzione del Volume della Musica di Sottofondo** - Ripristinato il fallback `bg_volume="0.20"` in `audio-processor.sh`
- 📂 **Correzione di PROJECT_ROOT** - `play-tts.sh` ora risolve correttamente la radice del progetto per la configurazione per progetto

## 🎯 NOVITÀ IN v5.3.0 — Prendi il Controllo delle Voci Remote

- **Personalizza ogni annuncio remoto individualmente** — passa `--voice`, `--pretext`, `--music`, `--volume`, `--effects`, `--speed`, `--provider` sulla riga di comando solo per quel singolo messaggio. Niente più modifiche ai file di configurazione per poi riportarli com'erano.
- **Salta la frase introduttiva a richiesta** — `--pretext ""` sopprime il pretext per un singolo messaggio.
- **Messaggi lunghi e caratteri speciali funzionano correttamente su Windows** — testi con virgolette, apostrofi, emoji o contenuto multi-riga non vengono più troncati lungo il percorso verso il motore vocale.
- **La riproduzione vocale funziona sui server Windows senza monitor** — un helper in background gira nella tua sessione utente e preleva gli annunci da una coda, così l'audio suona anche quando fai SSH su un sistema headless.
- **L'anteprima vocale sui server remoti viene trasmessa al dispositivo giusto** — l'anteprima TUI non ripiega più sull'audio locale su macchine senza altoparlanti.
- **Niente più doppie frasi introduttive** quando sia il mittente che il destinatario hanno il pretext configurato.
- **55 nuovi test** per l'assegnazione vocale della modalità party BMAD e l'isolamento degli agenti.

## 🎯 v5.2.1 — Identità Multi-LLM e Rifinitura dell'Installazione

- **Copilot ottiene la propria voce + pretext + musica** — "Copilot here" al ritmo della bossa nova, completamente distinto da Claude Code e Codex.
- **Config MCP per ogni strumento con identità esplicita** — `.vscode/mcp.json`, `.codex/config.toml`, `~/.copilot/mcp-config.json` ciascuno imposta il proprio `AGENTVIBES_LLM`.
- **Lo strumento MCP `get_config` restituisce il LLM rilevato** — gli assistenti possono confermare il proprio routing e rispondere con la voce giusta.
- **Navigazione Setup: Installa → Installa → Installa → Configura → Configura → Configura** — il flusso da tastiera percorre tutte e tre le Configurazioni prima di atterrare su Predefinito.
- **Musica di sottofondo predefinita di Claude Code** impostata su Chillwave.
- **Rifiniture di compatibilità Linux** — CRLF, permessi, override del provider di trasporto.

## 🎯 NOVITÀ IN v5.2.0 — Anteprima Voce Remota + Modalità Caveman + Valutazioni Vocali

- **Modalità verbosità caveman** — Frammenti TTS ultra-sintetici. Impostabile tramite `/agent-vibes:verbosity caveman`.
- **👍/👎 valutazioni vocali** — Premi `+` per pollice su, `-` per pollice giù in qualsiasi elenco voci. Sostituisce i preferiti a stelle.
- **Anteprima voce remota** — L'anteprima vocale TUI funziona su server headless tramite ricevitore SSH. Nessun audio locale necessario.
- **Routing ricevitore SSH** — `ssh-remote` e `agentvibes-receiver` sono ora provider di prima classe.
- **Validazione vocale rafforzata** — Formato multi-speaker `::`, base64 cross-platform, nessuna iniezione da barra rovesciata.

---

## 🛡️ v5.1.4 — Revisione della Resilienza TTS + Provider LLM Predefinito

- **Provider LLM Predefinito** — Nuova voce di fallback in fondo a Configurazione → Provider. Solo configurazione; apre il modale Configura standard. Utilizzato quando uno strumento chiama TTS senza identificare il suo LLM.
- **La musica di sottofondo per LLM si attiva automaticamente** — Impostare una traccia di sottofondo nel modale Configura per LLM ora la riproduce effettivamente (senza bisogno di attivare anche la musica globale).
- **Supporto Copilot CLI** — `installCopilotMcp` ora scrive sia `.vscode/mcp.json` (Copilot Chat) SIA `~/.copilot/mcp-config.json` (Copilot CLI — prodotto diverso, percorso di configurazione diverso).
- **Architettura di routing per client** — `.mcp.json` non imposta più `AGENTVIBES_LLM`. Claude Code viene rilevato automaticamente tramite la variabile `CLAUDECODE=1`. Copilot CLI legge la propria configurazione globale. Niente più conflitti di configurazione tra client.
- **Mutex TTS auto-riparante** — Quando un processo `play-tts.ps1` bloccato congela la coda di riproduzione, il chiamante successivo lo termina automaticamente (nessun `taskkill` manuale). Watchdog di 25 secondi garantisce il progresso.
- **Niente più riproduzione di audio stantio** — `play-tts.ps1` cattura il nome esatto del file di output dal stdout del provider invece di indovinare "il `tts-*.wav` più recente". Fine della riproduzione silenziosa di audio vecchio.
- **La voce per LLM vince sul `VoiceOverride` esplicito** — Gli LLM restituiscono i risultati di `get_config` ad ogni chiamata, che sovrascriveva il routing per LLM. Corretto.
- **`lessac-medium` → `lessac-high`** predefinito per codex — Aggiramento del fallimento silenzioso di sintesi.
- **Rinomina dei file scratch + codifica solo ASCII** — Elimina file audio composti accumulati ed errori di parsing CP1252 su Windows.
- **Conferma Configurazione → Installa** ora avanza il focus alla riga del provider successiva (flusso Installa → Installa → Installa).

---

## 🎙️ NOVITÀ IN v5.1.0 — Revisione del Selettore Vocale + Salvataggio Automatico del Modale Agente

- **Salvataggio automatico nel modale agente** — Le modifiche a voce/personalità/musica/riverbero/pretesto si salvano automaticamente mentre le modifichi. Un breve avviso "✓ Salvato!" conferma ogni modifica.
- **Nomi univoci per LibriTTS** — 904 speaker ricevono cognomi deterministici: **Anna Bell**, **Anna Carter**, …, **Anna Quinn**. Niente più duplicati "Anna-2", "Anna-3".
- **Simboli di genere rosa ♀ / azzurro ♂** — Indicatori di genere colorati nella scheda Voci e in tutti i modali del selettore vocale.
- **Salto rapido per prima lettera** — Premi `a`–`z` in qualsiasi selettore vocale per saltare a quella lettera. `q`, `j`, `k`, `g`, `h`, `l` sono riservati per navigazione/annulla.
- **PgUp / PgDn / Home / End** nei selettori vocali
- **3 nuove tracce di musica di sottofondo** — Late Night Hip Hop Groove, Drifting Down the Hall, Midnight Charleston Stomp
- **Barra di ricerca rimossa dai selettori vocali** — sostituita dal salto per prima lettera (più veloce, senza problemi di focus)
- **Correzione corruzione nella scheda Voci** — le righe non installate non perdono più la colonna Provider durante la navigazione
- **Artefatti di lampeggiamento eliminati nelle schede Musica + Voci**

---

## 🚀 v5.0.0 — Supporto Multi-Provider: Claude Code + Copilot + Codex

- **GitHub Copilot + OpenAI Codex in VS Code** — AgentVibes ora supporta tutti e tre i principali assistenti di codifica AI. Installa e configura ciascuno dalla TUI.
- **Una sola scheda di Configurazione** — procedura guidata in 4 passaggi (Lingua → Dipendenze → Motore TTS → Provider) sostituisce le vecchie schede installatore + LLM. Gli utenti esistenti saltano direttamente ai Provider.
- **Configurazione audio per provider** — ogni LLM ha la propria Voce, Motore TTS, Riverbero, Musica e Pretesto tramite il modale Configura.
- **Impostazioni ridisegnate** — lista piatta e pulita: Lingua, Motore TTS, Voce, Verbosità, Destinazione Audio, Archiviazione Configurazione, Riesegui Procedura Guidata.
- **Selettore vocale migliorato** — visualizzazione a 3 colonne, anteprima con barra spaziatrice, lo scorrimento resta in posizione.

---

## 🎙️ v4.6.7 — Correzioni TTS Modalità Party

- **I pretext degli agenti ora vengono pronunciati in modalità party** — "John, Product Manager here" veniva silenziosamente ignorato a causa di un bug di temporizzazione nella pre-sintesi. Risolto.
- **Niente più asterischi letti ad alta voce** — markdown rimosso prima del TTS in modalità party
- **TTS all'avvio sessione Windows corretto** — l'hook ora produce JSON valido così il TTS si attiva in modo affidabile all'avvio della sessione
- **L'hook PreToolUse non genera più errori** sui comandi grep/regex

---

## 🧭 v4.6.6 — Navigazione TUI Naturale

La TUI delle Impostazioni ora scorre come ci si aspetta. Giù si muove dall'alto verso il basso attraverso intestazione → sotto-schede → contenuto → piè di pagina. Sinistra/Destra cambia le sotto-schede e si sposta tra i pulsanti del piè di pagina. Su dal contenuto ritorna alla sotto-scheda attiva — non sempre Voice. La scheda Lingua ha un elenco scorrevole. Readme usa il README del pacchetto AgentVibes quando non esiste un file locale. Escape dall'installer non si blocca più.

---

## 🌟 NOVITÀ IN v4.5 — Release "Parla Ogni Lingua"

### 🌍 TUI Multilingue — 9 Lingue

Ogni schermata, pulsante ed etichetta in `npx agentvibes` è ora completamente tradotto:

- **Inglese, Spagnolo, Francese, Tedesco, Portoghese, Giapponese, Coreano, Cinese (Semplificato), Italiano**
- Selezione della lingua al primo avvio — scegli la tua lingua prima di qualsiasi altra cosa
- Sottoscheda lingua nelle Impostazioni — cambia in tempo reale, senza necessità di riavvio
- Tutte le etichette dei tab, i pulsanti, i suggerimenti del piè di pagina, i messaggi di stato e i tab BMAD/Receiver tradotti
- File i18n per lingua (`src/i18n/en.js`, `es.js`, `fr.js`, ...) con fallback all'inglese

### 🪟 Rafforzamento della Sicurezza su Windows

- **File temporanei imprevedibili** — `randomUUID()` sostituisce `Date.now()` in tutti i nomi di file temporanei (JS + PowerShell)
- **Nessuna iniezione shell** — `spawnSync` sostituisce `execSync(..., { shell: true })` per le ricerche `which`
- **Rilevamento intelligente del lettore musicale** — `detectMp3Player()` sostituisce l'`ffplay` codificato su Windows
- **Correzione booleana** — `isWindowsTerminal` ora restituisce `true/false`, non la stringa UUID di `WT_SESSION`

### 🎙️ BMAD Speak Multipiattaforma

- `bmad-speak.js` — punto di ingresso multipiattaforma; instrada automaticamente a PowerShell su Windows o bash su Mac/Linux
- `bmad-speak.ps1` — BMAD speak Windows nativo con routing della personalità per agente

### 🧪 600 Test, Zero Fallimenti
