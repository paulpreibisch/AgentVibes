> 🌐 [English version](../../RELEASE_NOTES.md)

## 🎙️ v5.1.0 — Revisione del Selettore Vocale + Salvataggio Automatico del Modale Agente

**Data di rilascio:** Aprile 2026

### Nuove Funzionalità

- **Salvataggio automatico nel modale di modifica agente** — Le modifiche per agente di voce/personalità/musica/riverbero/pretesto si salvano ora automaticamente mentre le modifichi. Il pulsante Salva esplicito è scomparso; un breve avviso "✓ Salvato!" conferma ogni modifica. Annulla e Ripristina Predefiniti continuano a comportarsi come prima.

- **Nomi univoci per gli speaker LibriTTS** — I 904 speaker LibriTTS non vengono più mostrati come "Anna", "Anna-2", "Anna-3", … "Anna-16". Ognuno riceve un cognome deterministico da un pool di 16 nomi: **Anna Bell**, **Anna Carter**, **Anna Davis**, …, **Anna Quinn**. Gli ID vocali sottostanti non cambiano, quindi le configurazioni utente esistenti continuano a risolversi.

- **Simboli di genere rosa/azzurro** — Le voci femminili mostrano **♀** in rosa (magenta), le voci maschili mostrano **♂** in azzurro chiaro (bright-cyan), sconosciuto mostra `—`. La colonna `Gender` dell'intestazione viene sostituita con `♀/♂` colorato (10 → 4 caratteri di larghezza), liberando spazio per nomi più lunghi. Applicato alla scheda Voci principale E a tutti e 3 i modali del selettore vocale (Setup, Agenti, Impostazioni).

- **Salto rapido per prima lettera nei selettori vocali** — Premi qualsiasi lettera `a`–`z` per saltare alla prima voce che inizia con quella lettera. I tasti riservati (`q`, `j`, `k`, `g`, `h`, `l`) sono bloccati per mantenere il loro significato di annulla / navigazione vi.

- **Navigazione di pagina nei selettori vocali** — `PgUp`, `PgDn`, `Home`, `End` ora funzionano in tutti i modali del selettore vocale.

- **3 nuove tracce di musica di sottofondo** — `Late Night Hip Hop Groove`, `Drifting Down the Hall` (vibes anni '90), e `Midnight Charleston Stomp` (swing). Il numero di tracce passa da 15 a 18.

### Miglioramenti

- **Barra di ricerca del selettore vocale rimossa** — Sostituita dal salto per prima lettera. La vecchia casella di ricerca aveva problemi di focus che ingoiavano i tasti di navigazione. Il salto è più veloce per il caso tipico "trova voce X".

- **Ordinamento della lista tracce corretto** — Le tracce con prefissi emoji (es. `🎤 Late Night Hip Hop Groove`) sono ora ordinate in base alla parte alfabetica del nome, non al codepoint dell'emoji. L'ordine è coerente tra le versioni di Node/ICU.

- **Tasto di scelta rapida preferiti ora è solo `*`** — Rimosso il binding duplicato `f` per contrassegnare i preferiti nei selettori vocali e nella scheda Voci principale. `f` è ora libero per il salto per prima lettera (es. saltare a Frank o Felix). Il marcatore `*` rimane il modo canonico per attivare/disattivare i preferiti.

### Correzioni di Bug

- **Le righe non installate della scheda Voci non si corrompono più** — Selezionare una voce non installata stava cancellando visivamente la sua colonna Provider a causa di una regex strip che corrispondeva troppo ampiamente al wrapper `bright-black-fg` della riga. Sostituita con un ancoraggio hint preciso che rimuove solo il testo hint esatto.

- **Artefatti di lampeggiamento eliminati nelle schede Musica + Voci** — I cursori `█` non lasciano più blocchi residui quando si scorre rapidamente nell'elenco. Entrambe le schede ora utilizzano un helper preciso per la rimozione del lampeggiamento invece del fragile slicer basato sulla posizione.

- **La scheda Setup non fallisce più silenziosamente** — `_renderScreen3` avvolgeva l'intero blocco di scrittura `setupCompleted` in un singolo `try/catch {}` vuoto. I file di configurazione locali corrotti ora vengono salvati come backup in `config.json.bak` e riscritti, con gli errori loggati su stderr — non più "bloccato a ripetere il setup" senza spiegazione.

- **L'annullamento `q` del selettore vocale ora funziona** — Il nuovo salto per prima lettera ingoiava `q` (e altri tasti di navigazione vi). Aggiunta la blocklist dei tasti riservati.

- **Ordinamento case-insensitive del selettore di tracce** — Le nuove tracce con nomi in Title Case (`Late Night Hip Hop Groove.mp3`) non saltano più in cima alla lista sopra le tracce minuscole `agent_vibes_*`.

### Impatto sull'Utente

- Modificare la voce o le impostazioni di un agente è ora più veloce — non c'è bisogno di ricordarsi di cliccare Salva
- Il selettore vocale è notevolmente meno affollato con tutti i 904 speaker LibriTTS che hanno nomi unici e amichevoli
- Genere a colpo d'occhio tramite simboli colorati
- Tre nuove tracce musicali per varietà
- Artefatti di lampeggiamento/scorrimento eliminati nelle schede Voci e Musica

---

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
