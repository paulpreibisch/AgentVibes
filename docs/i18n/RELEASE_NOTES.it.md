> 🌐 [English version](../../RELEASE_NOTES.md)

## v5.15.0 — Controllo multi-sessione su Windows

**Rilasciato il:** 2026-07-20 · `npm install agentvibes@latest`

Se esegui più sessioni di agente contemporaneamente, questa release porta su Windows lo stesso controllo che macOS e Linux hanno ottenuto nella 5.13.0: le sessioni restano silenziose finché non le attivi e ognuna può indicarti quale finestra sta parlando.

### Le sessioni non parlano più tutte insieme

Eseguire AgentVibes su più progetti significava in precedenza che ogni sessione aperta si annunciava, senza un modo semplice per lasciarne parlare una sola. Su macOS e Linux questo è stato risolto nella 5.13.0. **Su Windows no** — l'hook di sessione di Windows abilitava il parlato in ogni sessione indipendentemente dalle tue impostazioni.

Windows segue ora la stessa regola: una sessione parla solo in un progetto che hai esplicitamente abilitato. I progetti che non hai abilitato non contribuiscono con **nulla** — non audio silenzioso, ma nessuna istruzione aggiuntiva e nessun costo in token.

### Il muto ora funziona su Windows

`/agent-vibes:mute` non aveva alcun effetto sull'audio di Windows. Silenziava solo macOS e Linux, perché il player di Windows leggeva un'impostazione diversa da quella scritta dal comando.

Sia il muto del progetto sia l'interruttore globale sono ora rispettati su Windows:

- `/agent-vibes:mute` — silenzia questo progetto
- `/agent-vibes:unmute` — riattiva questo progetto, anche mentre tutto il resto è silenziato a livello globale

Questo rende "spento ovunque, acceso nell'unico progetto su cui sto lavorando" una singola coppia di comandi su ogni piattaforma.

### Le sessioni possono identificarsi su Windows

Includi `{{session}}` nel tuo pretext e una sessione si presenta una volta:

```
Claude on my-app in Windows Terminal
```

Indica il nome del progetto e rileva il terminale — Windows Terminal, VS Code, Ghostty, iTerm, Terminal, WezTerm, tmux e altri. Annunciato una volta per sessione anziché prima di ogni riga. In precedenza questo funzionava solo su macOS e Linux.

### Una correzione correlata per ogni piattaforma

Lo script che produce quella presentazione era assente dal processo di aggiornamento, quindi su un'installazione globale non veniva mai distribuito e la funzione non faceva silenziosamente nulla. Ora è incluso allo stesso modo su macOS, Linux e Windows.

### Aggiornamento

Le tue scelte esistenti vengono preservate — se hai già silenziato, riattivato o abilitato un progetto, l'aggiornamento lascia intatta quell'impostazione.

**Una modifica da tenere presente per gli utenti Windows con un'installazione globale:** poiché le sessioni sono ora spente finché non vengono abilitate, un'installazione globale su Windows sarà silenziosa dopo l'aggiornamento. Attiva i progetti che desideri con `/agent-vibes:unmute`. Le installazioni per progetto sono abilitate automaticamente e non sono interessate.

### Qualità

Nuovi test di regressione verificano che il gate di sessione, le regole del muto e l'auto-identificazione si comportino in modo identico su entrambi i runtime, così le piattaforme non possono più divergere senza far fallire la build.

---

## v5.14.0 — Installazione affidabile e anteprime audio complete

**Rilasciato il:** 2026-07-19 · `npm install agentvibes@latest`

Questa release si concentra su due aspetti: installare AgentVibes correttamente su ogni piattaforma e fare in modo che il pulsante Anteprima rappresenti fedelmente come suonerà davvero il tuo agente. Include inoltre tutto il contenuto della 5.13.2, che era stata etichettata ma mai pubblicata su npm.

### La configurazione si completa correttamente su macOS e Linux

L'installazione di Piper e il download delle voci vengono ora eseguiti correttamente su una macchina macOS o Linux appena predisposta. In precedenza questi passaggi potevano segnalare un errore senza essere mai stati eseguiti, lasciando i nuovi utenti senza un motore vocale funzionante e senza indicazioni su come procedere. Si trattava di un problema di lunga data che riguardava nello specifico le prime installazioni: se in passato avevi rinunciato alla configurazione, vale la pena riprovare.

Correlato: diversi script di configurazione sono ora salvati con il formato di fine riga corretto, così vengono eseguiti correttamente su macOS e Linux.

### L'Anteprima riproduce il mix audio completo

Il pulsante Anteprima riproduce ora esattamente come suonerà il tuo agente: la **voce** selezionata, l'eventuale **riverbero o gli effetti audio** e la tua **musica di sottofondo**, mixati insieme.

In due casi il mix riprodotto risultava incompleto. Le anteprime degli agenti Hermes omettevano del tutto la musica di sottofondo e, su Windows, la traccia musicale veniva scartata ogni volta che ffmpeg — il componente che mixa la musica con il parlato — non era disponibile. Entrambi i casi sono risolti e, se ffmpeg manca, ricevi ora un messaggio chiaro che lo segnala, invece di un audio silenziosamente ridotto.

### Le tue personalizzazioni sopravvivono agli aggiornamenti

Se hai modificato uno degli script hook installati da AgentVibes, l'aggiornamento preserva ora il tuo lavoro. La tua versione viene copiata in un backup con marca temporale prima che qualsiasi file venga sostituito:

```
play-tts.ps1.user.bak.20260719-143052
```

Ogni aggiornamento crea il proprio backup, quindi le versioni precedenti restano recuperabili. Su Windows la copertura dell'aggiornamento è passata da 8 script a tutti e 25.

### La destinazione dell'audio è più chiara a colpo d'occhio

Le impostazioni indicano ora con un colore dove viene riprodotto l'audio: **Local** in verde, **Remote** in rosso. In questo modo è immediatamente evidente quando l'audio viene indirizzato a un'altra macchina.

### Le anteprime vocali usano il motore corretto

L'anteprima di una voce usa ora il motore proprio di quella voce anziché l'impostazione globale, e indica quale motore stai ascoltando. Le voci di sistema di Windows e macOS funzionano correttamente nelle anteprime remote e l'elenco delle voci di Windows mostra ora soltanto le voci effettivamente selezionabili.

### Audio remoto su Windows

L'invio di audio da una macchina Windows a un altro computer non altera più i percorsi dei file durante il trasferimento: era proprio questo a impedire alla musica di sottofondo di raggiungere il ricevitore.

### Pacchetto e qualità

Il pacchetto pubblicato non include più file superflui e tutto ciò a cui l'applicazione fa riferimento è ora presente. L'intera suite di test passa su Windows, macOS e Linux partendo da un checkout pulito, con nuovi test di regressione che coprono i comportamenti dell'anteprima descritti sopra.

---

## 🔧 v5.13.2 — Installazioni più pulite, configurazione più semplice

**Rilasciato il:** 2026-07-17 · su `latest` — `npm install agentvibes@latest`

### 🎛️ Parti dalle impostazioni predefinite, pronte per essere tue

Le nuove installazioni ora partono pulite, con i valori predefiniti integrati per voce, musica di sottofondo e personalità — quindi è la tua configurazione fin dal primissimo avvio.

### 🐧 La configurazione su Mac e Linux funziona correttamente

Alcuni degli script che preparano tutto erano salvati in un formato Windows che Mac e Linux non riescono a leggere, quindi si fermavano prima di fare qualsiasi cosa. Ora sono nel formato giusto. Installare Piper e scaricare le voci funziona di nuovo su una macchina Mac o Linux appena configurata.

### 🔊 La tua scelta di voce resta quella che hai fatto

Il file di impostazioni che ricorda quale voce va con quale motore poteva essere letto in modo leggermente sbagliato, così la tua scelta del motore veniva ignorata silenziosamente. Risolto — quello che scegli è quello che ottieni.

### 📦 Un download più piccolo e più ordinato

Il pacchetto non porta più con sé file di cui non ha mai avuto bisogno. Tutto ciò che l'app ti dice di eseguire è ora davvero incluso.

---

## 🔧 v5.13.1 — Aggiornamenti Windows Che Aggiornano Davvero

**Rilasciato il:** 2026-07-16 · su `latest` — `npm install agentvibes@latest`

### 🪟 I tuoi script Windows adesso si aggiornano per davvero

Su Windows, i piccoli script che fanno parlare i tuoi agenti vivono nella cartella `.claude/hooks`. L'aggiornamento diceva di averli rinfrescati — ma su Windows, di nascosto, non lo faceva, così potevano restare fermi alla versione che avevi installato la prima volta, anche per mesi.

Ora si aggiornano per davvero. Esegui `npx agentvibes update` e riceverai tutte le correzioni che ti sei perso. Qualsiasi cosa tu avessi personalizzato resta comunque al sicuro accanto ad essa, come file `.user.bak`, esattamente come prima.

Se usi macOS o Linux, non cambia nulla — per te gli aggiornamenti funzionavano già.

### 🔒 Una messa a punto della sicurezza dietro le quinte

Abbiamo aggiornato uno dei componenti che AgentVibes usa per leggere i file di configurazione. Un file di configurazione costruito ad arte avrebbe potuto bloccarlo completamente. Non è mai stato possibile rubare o spiare nulla — ma ora non può nemmeno più bloccarsi. Non devi fare nulla; è già attivo.

---

## 🎉 v5.13.0 — Le Tue Voci Ovunque, Con un Preavviso

**Rilasciato il:** 2026-07-16 · su `latest` — `npm install agentvibes`

Novità:

### 🖥️ Usa le voci integrate del tuo computer, da qualunque posto
Esegui i tuoi agenti su una macchina e ascolti su un'altra? Ora puoi scegliere le voci integrate in **Windows** (David, Zira, Mark) o **Mac**, e ascoltarle proprio lì dove sei seduto. AgentVibes ti mostra ogni voce e contrassegna chiaramente quelle che il tuo dispositivo di ascolto può riprodurre.

### 🗂️ Tutte le tue voci in un unico elenco ordinato
Piper, Kokoro, ElevenLabs, Windows, Mac, Soprano — ogni voce proviene ora da un unico elenco, così ciò che vedi è sempre ciò che puoi usare.

### 🔔 Un tono di "preavviso" prima che parta il suono
Poco prima che inizi una battuta vocale o un'anteprima musicale, sentirai un breve tono — così sai sempre che l'audio sta per arrivare, anche se ci vuole un momento.

### 🎵 Le anteprime musicali seguono il tuo audio
Fai l'anteprima di una traccia e viene riprodotta ovunque sia configurato il tuo audio — anche su un altro computer.

### 🆔 Agenti che si presentano
Attiva le auto-presentazioni e ogni agente dice chi è quando parte — comodo quando parla un intero team.

### 🛟 Le tue modifiche personali restano al sicuro quando aggiorni

Hai armeggiato con uno dei file di AgentVibes nella tua cartella `.claude/hooks`? Da questa versione in poi, aggiornare non butta mai via il tuo lavoro. Se dobbiamo aggiornare un file che avevi modificato, mettiamo la tua copia accanto ad esso con `.user.bak` alla fine — tipo `play-tts.sh.user.bak`.

**Quel file è creato da AgentVibes — non c'è nulla di rotto e non è stato messo lì da nient'altro.** È semplicemente la tua vecchia versione, salvata così puoi darci un'occhiata o copiare le tue modifiche in quella nuova. Cancellalo quando hai finito.

Se hai personalizzato dei file in una versione precedente, vale la pena dare un'occhiata veloce in `.claude/hooks` per qualcosa che vorresti rimettere a posto.

### ✨ Più voci, esperienza più fluida
- Voci **ElevenLabs** pienamente supportate
- Più voci **Kokoro**, funzionanti alla grande su Windows
- Configurazione più veloce e affidabile su Windows
- **3.261 test automatizzati superati** — stabile e affidabile

---

## 🎉 v5.12.0 — La Revisione della Settimana Fable (Stabile)

**Rilasciato il:** 2026-07-05 · ora su `latest` — `npm install agentvibes`

Questo trasforma la versione alpha della "Settimana Fable" in un rilascio stabile. Durante una settimana di accesso anticipato al nuovo modello **Fable** di Anthropic, lo abbiamo puntato sull'intera codebase di AgentVibes e abbiamo ricostruito il nucleo come si deve.

### Un nucleo condiviso più solido

Ogni volta che AgentVibes parla prende molte decisioni — quale voce, quale motore, se riprodurre qui o inviare l'audio a un'altra macchina, musica di sottofondo, volume, silenziamento. Quella logica era stata copiata in diversi script separati (Mac/Linux, Windows, remoto e il server vocale), e le copie si sono lentamente **allontanate tra loro** — una correzione in uno veniva dimenticata negli altri, ed è per questo che certi malfunzionamenti continuavano a ripresentarsi.

Abbiamo sostituito tutto questo con **un unico nucleo condiviso** che ogni parte di AgentVibes ora segue — un solo posto da correggere, un solo posto di cui fidarsi. Cosa noterai:

- **Le voci Kokoro che erano silenziose su Linux ora funzionano ovunque.**
- **Le tue scelte vocali rimangono** — le impostazioni non vengono più silenziosamente sovrascritte.
- **Volume, silenziamento e riproduzione remota si comportano allo stesso modo** su Mac, Linux e Windows.
- **Sicuro per impostazione predefinita** — se il nuovo nucleo non è disponibile sulla tua macchina, AgentVibes ricade sul comportamento precedente, così non smette mai semplicemente di parlare.

### Le anteprime ora si riproducono nel posto giusto

L'anteprima di una voce o di una traccia era solita riprodursi su qualunque macchina davanti a cui ti trovavi — il che risultava silenzioso se avevi configurato AgentVibes per inviare l'audio altrove. Ora:

- **Se hai configurato SSH remoto, le anteprime si riproducono sul tuo ricevitore; altrimenti si riproducono localmente, come prima.**
- Questo copre le **anteprime vocali** (Piper e Kokoro) dalle schermate di Setup, Agent e Settings, e le **anteprime di musica/tracce** — premi Spazio per riprodurre, di nuovo Spazio per fermare.

### Un menu voci più semplice

- Abbiamo **rimosso la scheda Voci ridondante.** Elencava soltanto le voci Piper e confondeva le persone, dato che la scelta di una voce per qualsiasi provider risiede già in **Setup**.

### Le basi per ciò che verrà

- Il ricevitore ora riceve anche il **percorso completo della cartella del progetto** da cui proviene un messaggio (un nuovo campo `projectPath`, insieme al nome del progetto che già riceveva) — gettando le basi per i miglioramenti in arrivo.

### Revisionato prima del rilascio

Abbiamo eseguito tre revisioni indipendenti sulle modifiche — sicurezza, correttezza e regressioni — e corretto ogni problema reale prima del rilascio.

## 🎸 v5.8.0 — Soprano Ora Funziona + Selettore Voci Corretto per Tutti i Motori

**Rilasciato il:** 2026-05-18

### 🐛 Soprano TTS Era Rotto — Ora Corretto

Soprano (il nostro motore TTS neurale da 80M di parametri, introdotto nella v5.6) falliva silenziosamente su Windows. Diversi problemi combinati lo rompevano dall'inizio alla fine:

- Il selettore voci di Windows mostrava Soprano come opzione ma lo avviava con il nome binario sbagliato (`soprano-tts` invece di `soprano`)
- `play-tts-soprano.ps1` veniva chiamato da Node.js con un PATH ridotto, quindi i file eseguibili `soprano` e `soprano-webui` non potevano essere trovati anche se installati
- Il percorso del file wav veniva scritto nel flusso Information di PowerShell (`Write-Host`) invece di stdout, quindi il processore di reverb/musica di sottofondo non riusciva a trovarlo
- Il Gradio WebUI non si avviava mai automaticamente — era necessario eseguire manualmente `soprano-webui` prima di ogni sessione

Tutti questi problemi sono ora risolti. AgentVibes rileva automaticamente se il server WebUI di Soprano è in esecuzione sulla porta 7860, lo avvia se non lo è, e attende fino a quando è pronto (fino a 90 secondi). Tre modalità funzionano in ordine di priorità: WebUI (più veloce — il modello rimane caricato) → API compatibile OpenAI → CLI `soprano` diretto.

### 🐛 Il Selettore Voci Ignorava Windows SAPI e macOS Say

Aprendo il selettore voci per un LLM configurato per usare **Windows SAPI** o **macOS Say**, il selettore mostrava l'elenco completo delle voci Piper invece della voce integrata del motore. Era confuso — selezionare una voce Piper mentre si usa SAPI o macOS Say non aveva alcun effetto, e l'anteprima con la barra spaziatrice suonava attraverso il motore sbagliato.

Il selettore ora si adatta al motore selezionato:

- **Windows SAPI / macOS Say / Soprano:** mostra esattamente un elemento (la voce integrata del motore), lo seleziona automaticamente, e l'anteprima con barra spaziatrice parla attraverso il binario corretto del motore
- **Piper:** mostra il catalogo completo delle voci installate come prima

Inoltre, salvare la configurazione non sovrascrive più silenziosamente il campo `ttsEngine` con `piper` quando un motore nativo è in uso.

### 🔒 Affidabilità di Soprano (9 Correzioni dalla Revisione Avversariale)

- **Correzione crash:** `destroy()` sul socket poteva emettere un evento `error` tardivo senza listener, causando il crash del processo Node.js — ora è presente un handler assorbitore
- **Cancellazione loop:** il loop di polling WebUI di 90 secondi ora si ferma immediatamente quando la finestra modale o il selettore voci viene chiuso (tramite AbortController)
- **Nessun rifiuto non gestito:** handler `.catch()` aggiunti a tutte le chiamate async di verifica WebUI
- **Nessun processo duplicato:** un cooldown di 10 secondi evita di avviare due istanze di `soprano-webui` cliccando rapidamente su Anteprima
- **Miglior feedback errori:** errori di spawn e codici di uscita non nulli ora mostrano un'etichetta di errore visibile nel selettore voci
- **PATH preservato:** l'aggiornamento del PATH in PowerShell ora aggiunge le voci del registro invece di sostituire l'intero PATH, in modo che gli shim di nvm, conda e pyenv continuino a funzionare

---

## 🎭 v5.7.7 — Ripristino Voci Modalità Party + Miglioramenti

**Rilasciato il:** 2026-05-17

### 🐛 Agenti in Modalità Party Silenziosi (Nessun TTS per Agente)

Gli agenti della modalità party mostravano le risposte in testo ma non le leggevano con le loro voci uniche. Due cause principali:

**Disambiguazione dello skill:** `/party-mode` corrispondeva al comando BMAD `_bmad/core/workflows/party-mode` (che tenta di caricare un percorso inesistente in questo progetto) invece dello skill di AgentVibes. Una sostituzione del comando `/party-mode` locale al progetto ora instrada allo skill corretto.

**Passaggio TTS obbligatorio:** Il passaggio di chiamata `bmad-speak.js` dell'orchestratore era poco specificato e a volte veniva saltato. Il Passaggio 4 nello skill della modalità party BMAD è ora chiaramente contrassegnato come OBBLIGATORIO, con documentazione esplicita di ciò che `bmad-speak.js` applica per agente: voce, pretext, reverb, personalità e musica di sottofondo — tutto caricato automaticamente da `~/.agentvibes/bmad-voice-map.json`.

### 🔍 Registrazione Diagnostica per la Modalità Party

`bmad-party-speak.sh` (hook PostToolUse) ora scrive voci di diagnostica strutturate in `/tmp/agentvibes-party-debug.log` — `fired`, `fingerprint HIT/MISS`, `invoking` ed errori — per diagnosticare i problemi vocali senza indovinare.

### 🎵 Nuova Traccia Inclusa: CelestialVelvet

Una nuova traccia di musica ambient **CelestialVelvet** (🌌) è stata aggiunta al catalogo integrato. Disponibile immediatamente nel selettore musicale TUI e nella mappa voci BMAD — nessun download richiesto.

### 🐛 TUI: Testo Grigio nelle Righe Selezionate Corretto

Il testo bianco ora viene visualizzato correttamente nelle righe selezionate nelle schede Voci e Agenti. In precedenza, il primo piano `bright-black` combinato con lo sfondo verde produceva testo grigio illeggibile in molti terminali.

### 🐛 SSH Remoto: Errore "wait: pid is not a child of this shell"

`play-tts-ssh-remote.sh` emetteva `wait: pid X is not a child of this shell` in certi shell. Corretto avviando `ssh` direttamente all'interno del sottoshell in background in modo che `$?` catturi il codice di uscita senza una chiamata `wait` tra shell.

---

## 🔧 v5.7.6 — Integrità del Payload SSH Remoto + Riscrittura del Ricevitore

**Rilasciato il:** 2026-05-16

### 🐛 SSH Remoto Riproduce Musica e Voce Errate

Quando si utilizza la funzione TTS SSH remoto, venivano applicate la traccia musicale e la voce del progetto sbagliato. Causa principale: `CLAUDE_PROJECT_DIR` non veniva inoltrato al mittente, causando il ricorso alla configurazione globale invece del `audio-effects.cfg` del progetto attivo.

### 🐛 Ricevitore Bash Incompatibile con il Formato Payload JSON

Il ricevitore bash Linux/Termux (`agentvibes-receiver.sh`) utilizzava un formato di argomenti posizionali precedente alla v5.5 e non riusciva affatto a decodificare il payload base64 JSON attuale. Il ricevitore è stato completamente riscritto per corrispondere alla logica del ricevitore PowerShell: decodifica base64, analizza JSON, applica voce/musica/effetti/volume e valida tutti i campi.

### 🐛 Introduzione della Personalità Sentita Due Volte in Remoto

Il pretext della personalità (es., "Bcs latin dance here") veniva pronunciato due volte quando si utilizzava TTS SSH remoto. Causa principale: `play-tts.sh` già antepone il pretext al testo del parlato prima di chiamare il mittente; il mittente lo impacchettava anche nel campo JSON `pretext`, causando che il ricevitore lo anteponesse di nuovo. Il campo JSON `pretext` è ora intenzionalmente lasciato vuoto — la personalità viene consegnata solo tramite il campo `text`.

### 🆕 Alias Host SSH Visibile nella Scheda Impostazioni

L'alias host SSH remoto configurato viene ora visualizzato nelle schede Impostazioni e Voci in modo che gli utenti possano confermare quale macchina remota è il target del TTS senza aprire file di configurazione.

### 🔒 Correzioni di Sicurezza

Miglioramenti alla validazione degli input nel mittente e nel ricevitore SSH remoto.

### 🧪 24 Nuovi Test BATS

- 15 test del payload SSH remoto: verificano voce, traccia musicale, volume, reverb/effetti, gestione del pretext, identificatore LLM, precedenza della configurazione del progetto e validità JSON
- 9 test di andata e ritorno end-to-end: il mittente costruisce il payload → il ricevitore decodifica e applica tutti i campi simultaneamente, rilevando regressioni su entrambe le estremità

---

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
