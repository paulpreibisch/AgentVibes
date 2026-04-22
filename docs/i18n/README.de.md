> 🌐 [English version](../../README.md)

**Autor**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Version**: v5.3.0

---

## 🎯 NEU IN v5.3.0 — Volle Kontrolle über Remote-Stimmen

- **Jede Remote-Ansage individuell anpassen** — `--voice`, `--pretext`, `--music`, `--volume`, `--effects`, `--speed`, `--provider` direkt auf der Kommandozeile übergeben, nur für diese eine Nachricht. Kein Bearbeiten von Config-Dateien und Zurücksetzen mehr.
- **Intro-Phrase bei Bedarf überspringen** — `--pretext ""` unterdrückt das Pretext für eine einzelne Nachricht.
- **Lange Nachrichten und Sonderzeichen funktionieren unter Windows korrekt** — Text mit Anführungszeichen, Apostrophen, Emoji oder mehrzeiligem Inhalt wird auf dem Weg zur Voice-Engine nicht mehr abgeschnitten.
- **Sprachwiedergabe funktioniert auf Windows-Servern ohne Monitor** — ein Hintergrund-Helper läuft in deiner User-Session und nimmt Ansagen aus einer Queue auf, sodass Audio auch bei Headless-SSH-Zugriff abgespielt wird.
- **Stimmvorschau auf Remote-Servern streamt zum richtigen Gerät** — die TUI-Vorschau fällt auf Maschinen ohne Lautsprecher nicht mehr auf lokales Audio zurück.
- **Keine doppelten Intro-Phrasen mehr**, wenn sowohl Sender als auch Empfänger ein Pretext konfiguriert haben.
- **55 neue Tests** für BMAD-Party-Mode-Stimmzuweisung und Agenten-Isolation.

## 🎯 v5.2.1 — Multi-LLM-Identität & Installations-Feinschliff

- **Copilot erhält eigene Stimme + Pretext + Musik** — "Copilot here" mit Bossa Nova, völlig unterscheidbar von Claude Code und Codex.
- **Pro-Tool-MCP-Configs mit expliziter Identität** — `.vscode/mcp.json`, `.codex/config.toml`, `~/.copilot/mcp-config.json` setzen jeweils ihr eigenes `AGENTVIBES_LLM`.
- **Das MCP-Tool `get_config` gibt das erkannte LLM zurück** — Assistenten können ihr Routing bestätigen und mit der richtigen Stimme antworten.
- **Setup-Navigation: Installieren → Installieren → Installieren → Konfigurieren → Konfigurieren → Konfigurieren** — der Tastaturfluss geht alle drei Konfigurationen durch, bevor er bei Standard landet.
- **Claude Codes Standard-Hintergrundmusik** auf Chillwave gesetzt.
- **Linux-Kompatibilitätsverfeinerungen** — CRLF, Berechtigungen, Transport-Provider-Override.

## 🎯 NEU IN v5.2.0 — Remote-Stimmvorschau + Höhlenmensch-Modus + Stimmbewertungen

- **Höhlenmensch-Verbositätsmodus** — Ultra-knappe TTS-Fragmente. Konfigurieren mit `/agent-vibes:verbosity caveman`.
- **👍/👎 Stimmbewertungen** — Drücken Sie `+` für Daumen hoch, `-` für Daumen runter in jeder Stimmliste. Ersetzt Stern-Favoriten.
- **Remote-Stimmvorschau** — TUI-Stimmvorschau funktioniert auf Headless-Servern über SSH-Empfänger. Kein lokales Audio benötigt.
- **SSH-Empfänger-Routing** — `ssh-remote` und `agentvibes-receiver` sind jetzt erstklassige Anbieter.
- **Stimm-Validierung gehärtet** — Multi-Sprecher-Format `::`, plattformübergreifendes base64, keine Backslash-Injection.

---

## 🛡️ v5.1.4 — TTS-Resilienz-Uberholung + Standard-LLM-Anbieter

- **Standard-LLM-Anbieter** — Neuer Fallback-Eintrag am unteren Rand von Setup → Anbieter. Nur-Konfiguration; offnet den Standard-Konfigurations-Modal.
- **Pro-LLM-Hintergrundmusik aktiviert sich automatisch** — Das Setzen eines Hintergrundtracks im Pro-LLM Konfigurations-Modal spielt ihn jetzt tatsachlich ab.
- **Copilot-CLI-Unterstutzung** — `installCopilotMcp` schreibt jetzt sowohl `.vscode/mcp.json` (Copilot Chat) ALS AUCH `~/.copilot/mcp-config.json` (Copilot CLI).
- **Pro-Client-Routing-Architektur** — `.mcp.json` setzt `AGENTVIBES_LLM` nicht mehr. Claude Code wird via `CLAUDECODE=1` Umgebungsvariable automatisch erkannt.
- **Selbstheilender TTS-Mutex** — Festgefahrene `play-tts.ps1`-Prozesse werden vom nachsten Aufrufer automatisch getotet. 25-Sekunden-Watchdog garantiert Fortschritt.
- **Keine abgestandene Audiowiedergabe mehr** — `play-tts.ps1` erfasst den exakten Dateinamen aus dem Provider-stdout.
- **Pro-LLM-Stimme gewinnt uber explizites `VoiceOverride`** — Behoben.
- **`lessac-medium` → `lessac-high`** Standard fur codex.
- **Scratch-Datei-Umbenennung + Nur-ASCII-Kodierung**.
- **Setup → Installieren-Bestatigung** schiebt Fokus jetzt zur nachsten Anbieterzeile vor.

---

## 🎙️ NEU IN v5.1.0 — Überarbeiteter Stimmwähler + Automatisches Speichern im Agent-Modal

- **Automatisches Speichern im Agent-Modal** — Änderungen an Stimme/Persönlichkeit/Musik/Reverb/Pretext werden automatisch gespeichert, während Sie sie bearbeiten. Ein kurzer "✓ Gespeichert!"-Hinweis bestätigt jede Änderung.
- **Eindeutige LibriTTS-Namen** — 904 Sprecher erhalten deterministische Nachnamen: **Anna Bell**, **Anna Carter**, …, **Anna Quinn**. Keine "Anna-2"-, "Anna-3"-Duplikate mehr.
- **Rosa ♀ / blaue ♂ Gendersymbole** — Farbige Genderanzeigen im Haupt-Stimmen-Tab und in allen Stimmwähler-Modalen.
- **Schnellsprung nach erstem Buchstaben** — Drücken Sie `a`–`z` in jedem Stimmwähler, um zu diesem Buchstaben zu springen. `q`, `j`, `k`, `g`, `h`, `l` sind für Navigation/Abbruch reserviert.
- **PgUp / PgDn / Home / End** in Stimmwählern
- **3 neue Hintergrundmusik-Tracks** — Late Night Hip Hop Groove, Drifting Down the Hall, Midnight Charleston Stomp
- **Suchleiste aus Stimmwählern entfernt** — ersetzt durch Schnellsprung (schneller, keine Fokus-Probleme)
- **Korruptionsfehler im Stimmen-Tab behoben** — nicht installierte Zeilen verlieren ihre Anbieter-Spalte beim Navigieren nicht mehr
- **Blink-Artefakte in Musik + Stimmen-Tabs beseitigt**

---

## 🚀 v5.0.0 — Multi-Anbieter-Unterstützung: Claude Code + Copilot + Codex

- **GitHub Copilot + OpenAI Codex in VS Code** — AgentVibes unterstützt jetzt alle drei großen KI-Programmierassistenten. Installation und Konfiguration jeweils direkt über die TUI.
- **Ein Einrichtungs-Tab** — 4-Schritte-Assistent (Sprache → Abhängigkeiten → TTS-Engine → Anbieter) ersetzt die alten Installer- + LLM-Tabs. Bestehende Nutzer springen direkt zu Anbieter.
- **Audio-Konfiguration pro Anbieter** — jeder LLM erhält eigene Stimme, TTS-Engine, Reverb, Musik und Pretext über das Konfigurieren-Modal.
- **Einstellungen neu gestaltet** — übersichtliche flache Liste: Sprache, TTS-Engine, Stimme, Ausführlichkeit, Audio-Ziel, Konfigurationsspeicher, Assistenten erneut ausführen.
- **Stimmwähler verbessert** — 3-Spalten-Anzeige, Vorschau mit Leertaste, Scroll-Position bleibt erhalten.

---

## 🎙️ v4.6.7 — Party-Modus TTS-Korrekturen

- **Agenten-Pretexte werden jetzt im Party-Modus gesprochen** — "John, Product Manager here" wurde wegen eines Pre-Synthese-Timing-Bugs stillschweigend verworfen. Behoben.
- **Keine gesprochenen Sternchen mehr** — Markdown wird vor dem TTS im Party-Modus entfernt
- **Windows-Sitzungsstart-TTS behoben** — der Hook gibt jetzt korrektes JSON aus, damit TTS beim Sitzungsstart zuverlässig aktiviert wird
- **PreToolUse-Hook erzeugt keinen Fehler mehr** bei grep/regex-Befehlen

---

## 🧭 v4.6.6 — Natürliche TUI-Navigation

Die Einstellungen-TUI funktioniert jetzt wie erwartet. Runter bewegt sich von oben nach unten durch Kopfzeile → Unter-Tabs → Inhalt → Fußzeile. Links/Rechts wechselt Unter-Tabs und bewegt sich zwischen Fußzeilen-Buttons. Hoch vom Inhalt kehrt zum aktiven Unter-Tab zurück — nicht immer zu Stimme. Der Sprach-Tab hat eine ordentliche scrollbare Liste. Das Readme greift auf das AgentVibes-Paket-README zurück, wenn kein lokales existiert. Escape vom Installer bleibt nicht mehr hängen.

---

## 🌟 v4.5 — Release "Sprich Jede Sprache"

### 🌍 Mehrsprachige TUI — 9 Sprachen

Jeder Bildschirm, Schaltfläche und Beschriftung in `npx agentvibes` ist jetzt vollständig übersetzt:

- **Englisch, Spanisch, Französisch, Deutsch, Portugiesisch, Japanisch, Koreanisch, Chinesisch (Vereinfacht), Italienisch**
- Sprachauswahl beim ersten Start — wählen Sie Ihre Sprache vor allem anderen
- Sprach-Unterreiter in den Einstellungen — live wechseln, kein Neustart erforderlich
- Alle Tab-Beschriftungen, Schaltflächen, Fußzeilen-Hinweise, Statusmeldungen und BMAD/Receiver-Tabs übersetzt
- Sprachspezifische i18n-Dateien (`src/i18n/en.js`, `es.js`, `fr.js`, ...) mit englischem Fallback

### 🪟 Windows-Sicherheitshärtung

- **Unvorhersehbare temporäre Dateien** — `randomUUID()` ersetzt `Date.now()` in allen temporären Dateinamen (JS + PowerShell)
- **Keine Shell-Injection** — `spawnSync` ersetzt `execSync(..., { shell: true })` für `which`-Suchen
- **Intelligente Musik-Player-Erkennung** — `detectMp3Player()` ersetzt das hartcodierte `ffplay` unter Windows
- **Boolean-Korrektur** — `isWindowsTerminal` gibt jetzt `true/false` zurück, nicht den `WT_SESSION` UUID-String

### 🎙️ Plattformübergreifendes BMAD Speak

- `bmad-speak.js` — plattformübergreifender Einstiegspunkt; leitet automatisch zu PowerShell unter Windows oder bash unter Mac/Linux weiter
- `bmad-speak.ps1` — natives Windows BMAD Speak mit agentspezifischem Persönlichkeits-Routing

### 🧪 600 Tests, Null Fehler
