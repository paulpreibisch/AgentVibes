> 🌐 [English version](../../RELEASE_NOTES.md)

## 🚀 v5.0.0 — Supporto Multi-Provider: Claude Code + Copilot + Codex

**Data di rilascio:** Aprile 2026

### Nuove Funzionalita

- **Supporto GitHub Copilot in VS Code** — Installa e configura AgentVibes per GitHub Copilot direttamente dalla TUI. Crea `.vscode/mcp.json` e `.github/copilot-instructions.md`.

- **Supporto OpenAI Codex in VS Code** — Integrazione completa di Codex con `.codex/config.toml`, protocollo TTS in `AGENTS.md` e hook di inizializzazione.

- **Scheda di Configurazione Unificata** — La vecchia procedura guidata di installazione a 5 schermate e la scheda separata Provider LLM sono state unite in un'unica scheda Configurazione. Il primo avvio mostra una procedura guidata in 4 passaggi (Lingua → Dipendenze → Motore TTS → Provider); gli utenti abituali passano direttamente alla schermata Provider.

- **Configurazione Audio per Provider** — Ogni provider LLM (Claude Code, Copilot, Codex) ottiene il proprio Motore TTS, Voce, Riverbero, Musica di Sottofondo e Pretext tramite un modale di Configurazione.

- **Schermata di Selezione Motore TTS** — Un nuovo passaggio della procedura guidata mostra un elenco di motori adattato al sistema operativo (Piper, Soprano, Windows SAPI, macOS Say) con pulsanti Installa per i motori mancanti.

- **Scheda Impostazioni Riprogettata** — Il layout a 5 sotto-schede e stato sostituito con un elenco piatto e pulito: Lingua dell'Interfaccia, Motore TTS Predefinito, Voce Predefinita, Verbosita, Destinazione Audio, Archiviazione Configurazione e Riesegui Procedura Guidata di Configurazione.

### Miglioramenti

- **Selettore vocale migliorato ovunque** — Visualizzazione a 3 colonne (Nome, Genere, Provider), anteprima con barra spaziatrice tramite sintesi e riproduzione, posizione di scorrimento preservata durante l'anteprima.

- **Artefatti del testo suggerimento corretti** — Spostarsi tra le righe nelle schede Agenti e Musica non lascia piu testo fantasma sulle righe precedenti.

- **Instradamento vocale di Codex corretto** — `AGENTS.md` ora istruisce Codex a usare `play-tts` per il parlato normale e `bmad-speak` solo durante la modalita festa BMAD.

### Impatto per l'Utente

- AgentVibes ora funziona con Claude Code, GitHub Copilot E OpenAI Codex
- Esperienza di configurazione semplificata — una sola scheda per tutta la gestione dei provider
- Personalizzazione vocale per provider senza modificare file di configurazione
- La pagina delle impostazioni e drasticamente piu semplice e veloce da navigare

---

## 🐛 v4.6.8 — Correzione Crash su Installazione Pulita

**Data di rilascio:** Aprile 2026

### Correzioni di Bug

- **La scheda Impostazioni non si blocca più su un'installazione pulita** — `parseMultiSpeaker()` chiamava `.includes()` su un ID voce null quando nessuna voce era ancora configurata. Aggiunto un controllo null che restituisce un oggetto predefinito sicuro. Segnalato da un utente che ha riscontrato il problema subito dopo il completamento della procedura guidata di installazione.

- **Symlink macOS /var nel test di replay** — Corretta l'asserzione del test che falliva su macOS dove `/var` è un symlink a `/private/var`, causando il fallimento dei confronti dei percorsi di replay.

- **Parsing pretext delle voci BMAD** — Le righe pretext di `bmad-voices.md` vengono ora analizzate correttamente e il markdown viene rimosso in modo più accurato prima della sintesi TTS.

### Impatto sugli Utenti

- I nuovi utenti non subiscono più crash navigando nelle Impostazioni dopo un'installazione pulita
- La suite di test passa in modo affidabile su macOS

---

## 🌍 v4.5.0 — Release "Parla Ogni Lingua"

**Data di rilascio:** Aprile 2026

Supporto TUI multilingue completo in tutte e 9 le lingue, rafforzamento completo della sicurezza Windows e zero test falliti.

### 🌍 TUI Multilingue — 9 Lingue

Ogni schermata, tab, pulsante ed etichetta nella TUI di `npx agentvibes` è ora completamente tradotto:

- **Inglese, Spagnolo, Francese, Tedesco, Portoghese, Giapponese, Coreano, Cinese (Semplificato), Italiano**
- Selezione della lingua al primo avvio (Schermata 0 della procedura guidata di installazione)
- Sottoscheda lingua nelle Impostazioni — cambia la lingua in tempo reale senza riavvio
- Tutte le etichette della barra dei tab, il testo dei pulsanti, i suggerimenti del piè di pagina e i messaggi di stato tradotti
- Tab BMAD e tab SSH Receiver completamente localizzati
- File i18n per lingua con fallback all'inglese

### 🪟 Sicurezza e Correzioni di Bug Windows

- **Nomi di file temporanei** — Tutti i nomi di file temporanei con `Date.now()` sostituiti da `randomUUID()` (imprevedibile, previene il dirottamento di file temporanei)
- **Iniezione shell** — `execSync('which ...', { shell: true })` sostituito da `spawnSync`
- **Lettore musicale** — `ffplay` codificato su Windows sostituito da `detectMp3Player()`
- **Coercizione booleana** — `isWindowsTerminal` restituisce correttamente `true/false` invece di far trapelare la stringa UUID di `WT_SESSION`

### 🎙️ BMAD Speak Multipiattaforma

- `bin/bmad-speak.js` — punto di ingresso multipiattaforma per il parlato degli agenti BMAD
- `.claude/hooks-windows/bmad-speak.ps1` — BMAD speak Windows nativo con routing della personalità per agente

### 🧪 Suite di Test

- 600 test, 0 fallimenti

---

## 🐛 v4.5.1 — Rilascio Patch

**Data di rilascio:** Aprile 2026

### Correzione di Bug

- **Anteprima del tab Musica** — Premere Spazio su una traccia nel tab Musica ora riproduce correttamente
  quando si esegue `npx agentvibes` da una directory vuota. In precedenza, se `.claude/audio/tracks/`
  non esisteva nella directory di lavoro corrente, l'elenco delle tracce mostrava le tracce integrate ma
  Spazio non faceva nulla (il player veniva avviato contro un percorso inesistente). Ora ricade
  automaticamente sulla directory delle tracce inclusa nel pacchetto.
