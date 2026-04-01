> 🌐 [English version](../../README.md)

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
