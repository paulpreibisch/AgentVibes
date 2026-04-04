> 🌐 [English version](../../README.md)

**Autore**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Versione**: v4.6.8

---

## 🐛 NEW IN v4.6.8 — Correzione Crash su Installazione Pulita

- **Crash scheda Impostazioni risolto** — non crasha più quando si naviga nelle Impostazioni su un'installazione pulita senza voce configurata
- **Correzione test macOS** — l'asserzione del percorso di riproduzione gestisce il symlink `/var` → `/private/var`
- **Parsing BMAD pretext migliorato** — il pretext delle voci viene estratto correttamente da `bmad-voices.md`

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
