> 🌐 [English version](../../RELEASE_NOTES.md)

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
