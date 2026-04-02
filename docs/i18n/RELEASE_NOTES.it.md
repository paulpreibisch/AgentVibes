> 🌐 [English version](../../RELEASE_NOTES.md)

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
