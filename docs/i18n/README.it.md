> 🌐 [English version](../../README.md)

**Autore**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Versione**: v5.1.0

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
