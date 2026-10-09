> 🌐 [English version](../../README.md)

**Autor**: Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Version**: v5.6.9

---

## 🆕 Wisse, wo deine Vorschau abgespielt wird (v5.15.1)

- **Jede Vorschau zeigt, wo sie abgespielt wird** — Stimm- und Musikvorschauen zeigen jetzt **(locally)** oder **(remotely via SSH)** direkt in der Zeile an, die du gerade anhörst, sodass du nie rätseln musst (oder auf einem Rechner ohne Bildschirm nur Stille hörst).
- **Vorschau in der gesamten App vereinheitlicht** — die Stimmenauswahl (Kokoro, Piper, ElevenLabs, BMAD pro Agent) und die Musikseite zeigen alle denselben Hinweis; Musikvorschauen folgen jetzt auch dem Remote-Empfänger eines Projekts.
- **Aufgeräumterer Agents-Tab** — er listet deine echten BMAD-Agenten auf (nicht die internen Helfer eines Skills) und prüft sich beim Fokussieren erneut; **Reset** wurde von `X` (das zum Receiver-Tab sprang) auf **`Del`** verschoben.

### v5.15.0 — Steuerung mehrerer Sitzungen unter Windows

- **Sitzungen bleiben stumm, sofern du sie nicht aktivierst** — eine Sitzung spricht nur in einem Projekt, das du eingeschaltet hast; andere fügen keine Anweisungen und keine Token-Kosten hinzu.
- **`/agent-vibes:mute` funktioniert jetzt unter Windows** — bisher hatte es dort keine Wirkung. Sowohl die projektbezogene als auch die globale Stummschaltung werden auf jeder Plattform beachtet.
- **Sitzungen können sich unter Windows selbst vorstellen** — `{{session}}` kündigt „Claude on my-app in Windows Terminal" an, einmal pro Sitzung.
- **Selbstvorstellungen erreichen jetzt auch globale Installationen** — das dahinterstehende Skript wurde vom Updater auf keiner Plattform jemals ausgeliefert.
- **Hinweis für globale Windows-Installationen:** Sitzungen sind nach diesem Update standardmäßig aus — aktiviere sie mit `/agent-vibes:unmute`.

### v5.14.0 — Zuverlässige Einrichtung und vollständige Audio-Vorschauen

Enthält alle Änderungen aus 5.13.2, das nicht auf npm veröffentlicht wurde.

- **Die Einrichtung wird unter macOS und Linux abgeschlossen** — die Installation von Piper und der Download der Stimmen laufen auf einem frischen System jetzt korrekt durch und beheben ein seit Langem bestehendes Problem bei Erstinstallationen.
- **Die Vorschau spielt deine vollständige Mischung** — Stimme, Hall/Effekte und Hintergrundmusik zusammen, sodass Vorschauen widerspiegeln, wie dein Agent tatsächlich klingen wird.
- **Updates bewahren deine Anpassungen** — bearbeitete Hook-Skripte werden vor dem Ersetzen einer Datei mit Zeitstempel gesichert.
- **Klareres Audioziel** — die Einstellungen zeigen **Local** in Grün und **Remote** in Rot.
- **Richtige Vorschau-Engine** — Vorschauen nutzen die eigene Engine der gewählten Stimme und benennen sie; Windows- und macOS-Stimmen funktionieren über Remote-Vorschauen.

### v5.13.0 — Deine Stimmen überall

Wähle die in **Windows** oder **Mac** eingebauten Stimmen und höre sie, wo immer du zuhörst — selbst wenn deine Agenten auf einem anderen Computer laufen. Dazu ein freundlicher Ankündigungston, sodass du immer weißt, dass Klang unterwegs ist.

- **🖥️ Die eigenen Stimmen deines Computers, von überall** — wähle Windows- oder Mac-Stimmen und höre sie auf deiner Maschine; jede Stimme wird angezeigt, nicht verfügbare klar markiert.
- **🗂️ Alle Stimmen in einer Liste** — Piper, Kokoro, ElevenLabs, Windows, Mac und Soprano an einem Ort, sodass das, was du siehst, auch das ist, was du nutzen kannst.
- **🔔 Ankündigungston** — ein kurzer Ton spielt kurz vor einer Stimm- oder Musikvorschau, sodass du weißt, dass Audio unterwegs ist.
- **🆔 Agenten, die sich selbst vorstellen** — optionale Selbstvorstellungen, sodass du weißt, wer in einem Team spricht.

### v5.12.0 — Ein stärkerer Kern

Während einer Woche mit frühem Zugang zu Anthropics neuem **Fable**-Modell haben wir das Herz von AgentVibes zu **einem gemeinsamen Kern** neu aufgebaut. Die Logik für Stimme / Engine / Routing / Lautstärke / Stummschaltung, die früher über vier Skripte hinweg kopiert war (und auseinanderdriftete), lebt jetzt an einer einzigen Stelle — einfacher, konsistenter und stabiler.

- **🔊 Vorschauen spielen am richtigen Ort** — mit konfiguriertem SSH-Remote spielen Stimm- und **Musikvorschauen** auf deinem Empfänger; andernfalls spielen sie lokal.
- **🧠 Ein gemeinsamer Kern** — die Stummheit von Kokoro unter Linux und die Pro-Stimme-Drift an der Quelle behoben, mit einem sicheren Fallback bei Bedarf.
- **🧹 Überflüssigen Voices-Tab entfernt** — wähle eine Stimme für jeden Provider in Setup.

### v5.11.0 — Neuronale Stimmen

- **🧠 Kokoro** — lokale neuronale TTS auf deiner **CPU, keine GPU erforderlich** (Chinesisch, Japanisch, Koreanisch integriert).
- **☁️ ElevenLabs** — erstklassige neuronale Cloud-Stimmen.
- Kombinierbare Audioeffekte: staple **Reverb**, **Echo** und **Chorus** auf jeder Stimme.

## v5.7.7 — Party-Mode-Stimmen Wiederhergestellt + Verbesserungen

**Party-Mode-Agenten sprechen wieder:** BMAD `/party-mode` ruft jetzt zuverlässig den richtigen AgentVibes-Skill auf, und jede Agentenantwort wird mit der einzigartigen Stimme des Agenten mit agentspezifischer Musik, Prätext und Reverb vorgelesen — automatisch aus `~/.agentvibes/bmad-voice-map.json` geladen.

**Neuer enthaltener Track:** 🌌 CelestialVelvet zum integrierten Musikkatalog hinzugefügt.

**TUI-Kontrastkorrektur:** Ausgewählte Zeilen in den Tabs Stimmen und Agenten zeigen keinen unlesbaren grauen Text mehr.

**SSH-Remote:** Fehler "wait: pid is not a child of this shell" in `play-tts-ssh-remote.sh` behoben.

## v5.7.6 — SSH-Remote-Payload-Integrität + Receiver-Neuschreibung

**SSH-Remote-Musik/Stimmen-Korrektur:** Die richtige Musiktitel und Stimme des Projekts erreichen jetzt den Remote-Empfänger — zuvor wurde die globale Konfiguration statt der Einstellungen des aktiven Projekts verwendet.

**Bash-Receiver-Neuschreibung:** Der `agentvibes-receiver.sh` für Linux/Termux wurde vollständig neu geschrieben, um das aktuelle base64-JSON-Payload-Format zu dekodieren. Das alte Positionsargument-Format aus der Zeit vor v5.5 ist verschwunden.

**Kein doppeltes Intro mehr:** Der Persönlichkeits-Prätext (z.B. "Bcs latin dance here") wird über SSH-Remote nicht mehr zweimal gesprochen. `play-tts.sh` stellt ihn dem Text voran; der Receiver erhält kein separates Prätext-Feld mehr zum erneuten Voranstellen.

**SSH-Host in TUI sichtbar:** Die Tabs Einstellungen und Stimmen zeigen jetzt den konfigurierten SSH-Remote-Host-Alias an.

**Sicherheitskorrekturen** und 24 neue BATS-Tests, die den vollständigen Sender → Receiver-Roundtrip abdecken.

## v5.7.5 — TUI-Schaltflächenkontrast + BMAD-Routing-Korrekturen

## v5.7.0 — BMAD v6.6 Unterstützung + Automatischer Neustart des Windows Watchers

**BMAD v6.6.0:** AgentVibes erkennt jetzt die neue Agentenstruktur `.claude/skills/*/agents/`, verarbeitet global installiertes BMAD in `~/_bmad` korrekt, und überspringt v6.6+ Plain-Markdown-Agenten bei der TTS-Injektion statt Fehler zu werfen. Der BMAD-Tab zeigt die Erkennung jetzt korrekt für globale Installationen an.

**Windows Watcher:** `tts-watcher.ps1` ist jetzt eine eigenständige Datei unter `~/.agentvibes/tts-watcher.ps1`. Das Ausführen von `npx agentvibes update` kopiert jetzt den neuesten Watcher **und** startet ihn automatisch neu — Datei und Prozess werden in einem Schritt aktualisiert, kein manueller Neustart erforderlich.

**Windows Provider:** `play-tts.ps1` respektiert jetzt den `ProviderOverride` aus der Linux-Server-Konfiguration beim Empfang von Remote-Audio.

## v5.6.9 — Hall und Hintergrundmusik in NPX-Installationen Stumm

**WSL-Nutzer:** AgentVibes spielte `en_US-lessac-medium` ab, unabhängig von der konfigurierten Stimme. Behoben — Piper wird jetzt in nicht-interaktiven Shells gefunden, indem `~/.local/bin` explizit dem `PATH` vor der Binärprüfung vorangestellt wird.

**Pro-Projekt-Routing:** Der Sitzungsstart-Hook bäckt jetzt `--project-dir` in jeden injizierten TTS-Befehl ein, sodass deine konfigurierte Stimme und Musik in Bash-Tool-Aufrufen korrekt abgespielt werden, auch wenn `CLAUDE_PROJECT_DIR` nicht in der Umgebung vorhanden ist.

`play-tts-piper.sh` und `play-tts-piper.ps1` sind jetzt in der kritischen Hooks-Bereitstellung von `agentvibes install` enthalten — aktualisierte Versionen werden automatisch propagiert.

## v5.6.7 — Windows-Vorschau repariert

Die Vorschau-Schaltfläche in der LLM-Audiokonfiguration funktioniert jetzt korrekt unter Windows.

## 🌟 NEU IN v5.6.6 — Vorschau-Schaltfläche funktioniert in WSL + Umfassende Windows-Testsuite

**Die Vorschau-Schaltfläche in der LLM-Audiokonfiguration funktioniert jetzt korrekt in WSL.** Wenn du Stimme, Hall und Hintergrundtrack für jedes LLM konfigurierst, spielt ein Klick auf Vorschau nun dein vollständiges Audio-Setup ab — Stimme, Musik und Effekte — genau so, wie es während einer echten Sitzung klingt. Zuvor wurde die Hintergrundmusik bei `npm link`- und globalen Installationen lautlos weggelassen.

Eine **umfassende Windows-Testsuite** wurde zur CI hinzugefügt und läuft parallel zur bestehenden Linux-BATS-Suite. Windows-spezifische Audiopfade werden nun bei jedem Push überprüft — Regressionen können nicht mehr lautlos durchrutschen.

## v5.6.4 — Kritische Sicherheitskorrektur bei der Deinstallation

`uninstall --global` hat dein gesamtes `~/.claude/`-Verzeichnis gelöscht — Einstellungen, CLAUDE.md, Skills, MCP-Konfigurationen, alles. Behoben: AgentVibes führt jetzt eine chirurgische Entfernung durch und berührt nur die Dateien, die es selbst erstellt hat. Ein Regressionstest in CI erzwingt dies ab sofort — wenn das Problem jemals zurückkehrt, schlägt der Build fehl, bevor er veröffentlicht wird.

## v5.6.3 — Hermes + Einfachere Remote-Einrichtung

AgentVibes spricht jetzt für **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — den selbst gehosteten, selbst verbessernden KI-Assistenten. Zwei produktionsreife Skills sind in `docs/hermes/skills/` enthalten:

- **`hermes-agentvibes-hook`** — Spricht jede Hermes-Antwort automatisch über AgentVibes TTS. Wird bei `agent:end` ausgelöst, entfernt Markdown, begrenzt die Rate und bietet vollständigen SSH-MITM-Schutz
- **`agentvibes-target`** — Bringt Hermes bei, beliebigen Text auf Abruf an deine Lautsprecher zu senden, mit Windows- und Android-Unterstützung

Außerdem in diesem Release: PS5.1-Kompatibilitätskorrekturen für `play-tts.ps1`, Modal/Hotkey-Reparaturen und der BMAD-Tab zeigt jetzt alle Agenten.

## v5.5 — LLM-spezifisches Audio-Routing

Gib **jedem LLM eine eigene Stimme, ein eigenes Pretext und eigene Musik** — Claude Code, Copilot und Codex können unterschiedlich klingen, ohne die globalen Einstellungen anzufassen.

- Füge `llm:<name>|...|voice|pretext|engine`-Zeilen in `audio-effects.cfg` hinzu
- Der MCP-Server erkennt automatisch, welcher LLM anruft, und übergibt `--llm <key>`
- Konfiguriere über **Setup → Standard → Konfigurieren** in der TUI

Außerdem behoben: Windows-Installer-Absturz (`spinner.info is not a function`) bei der **Neuinstallation** mit einer älteren globalen AgentVibes-Installation.

---

**🎛️ NEU IN v5.4.0 — TUI-Installer & Fehlerbehebungen:**
- 🖥️ **TUI-Installer** - Interaktive Terminal-Oberfläche: Stimmen durchsuchen, Anbieter konfigurieren, BMAD-Party-Modus aktivieren
- 🔧 **Spinner-Fix** - Behobener `spinner.info is not a function`-Absturz auf WSL/Linux
- 🐛 **Zirkuläre Abhängigkeit behoben** - Selbstreferentielle `agentvibes@^3.5.9`-Abhängigkeit entfernt, die Installationen stillschweigend kaputt machte
- 🎵 **Lautstärke der Hintergrundmusik korrigiert** - `bg_volume="0.20"`-Fallback in `audio-processor.sh` wiederhergestellt
- 📂 **PROJECT_ROOT-Fix** - `play-tts.sh` löst das Projektstammverzeichnis für projektspezifische Konfigurationen jetzt korrekt auf

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
