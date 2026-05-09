> 🌐 [English version](../../RELEASE_NOTES.md)

## 🐧 v5.6.8 — WSL-Stimmen-Routing repariert + Zuverlässigkeit des Sitzungslebenszyklus

**Veröffentlicht:** 2026-05-09

### 🐛 WSL: Konfigurierte Stimme wird jetzt abgespielt (kein Lessac-Fallback mehr)

In WSL-Sitzungen spielte AgentVibes `en_US-lessac-medium` ab, unabhängig davon, welche Stimme konfiguriert war. Grundursache: `pipx` installiert Piper in `~/.local/bin/`, was interaktive Shells über `.bashrc`/`.zshrc` erhalten, aber die Bash-Tool-Aufrufe von Claude Code werden nicht-interaktiv ausgeführt und überspringen das Laden von Profilen — `command -v piper` schlug fehl und fiel auf die Standardstimme zurück.

**Behebung:** `play-tts-piper.sh` stellt nun `~/.local/bin` und das pipx-Piper-venv-Bin dem `PATH` vor die Binärprüfung, sodass Piper unabhängig vom Shell-Modus gefunden wird.

### 🐛 Pro-Projekt-Stimme/-Musik verloren, wenn `CLAUDE_PROJECT_DIR` nicht in der Bash-Umgebung ist

Wenn Claude Code einen Bash-Tool-Aufruf ausführt, wird `CLAUDE_PROJECT_DIR` nicht in der Umgebung übergeben. Die TTS-Hooks konnten die Pro-Projekt-Konfiguration nicht finden und fielen auf globale Standardwerte zurück — falsche Stimme, falsche Musik, kein Pretext.

**Behebung:** `session-start-tts.sh` (und `.ps1`) bäckt das Projektverzeichnis nun als `--project-dir` in den injizierten Hook-Befehl ein. `play-tts.sh` liest dieses Flag vor jeder Konfigurationssuche, sodass das Pro-Projekt-Routing bei jedem Bash-Tool-Aufruf zuverlässig ist.

### 🐛 `play-tts-piper.sh` und `play-tts-piper.ps1` werden von `agentvibes install` nicht bereitgestellt

Diese Hooks fehlten in `CRITICAL_HOOKS` / `CRITICAL_HOOKS_WINDOWS`, sodass `agentvibes install` niemals aktualisierte Versionen nach `~/.claude/hooks/` propagierte.

**Behebung:** Beide sind jetzt in der kritischen Hooks-Liste und werden bei Installation/Update immer bereitgestellt.

### 🐛 Fehler beim Anzeigenamen der Stimme

- `uniquifyVoiceName("Mary-1")` gab `"Mary-1 Bell"` statt `"Mary Bell"` zurück.
- 16Speakers-Namen wie `Rose_Ibex` bekamen fälschlicherweise einen Nachnamen angehängt (`"Rose Ibex Bell"`).
- Die Zeile `🎤 Voice used:` fehlte in der WSL-Bash-Ausgabe.

Alle drei behoben. Eine neue Testdatei (`test/unit/voice-names.test.js`, 16 Tests) deckt diese Fälle ab.

---

## 🪟 v5.6.7 — Windows-Vorschau repariert

**Veröffentlicht:** 2026-05-08

### 🐛 Vorschau-Schaltfläche funktioniert jetzt korrekt unter Windows

Beim Konfigurieren von Audio pro LLM unter Windows spielte ein Klick auf **Vorschau** die falsche Stimme (Standard: Windows SAPI) ohne Hintergrundmusik oder Hall ab. Jetzt spielt es genau die Stimme, den Hall und den Hintergrundtrack ab, den du konfiguriert hast.

### 🧪 Regressionstests hinzugefügt

Zwei neue Windows-CI-Tests überprüfen die Vorschau-Konfigurationssuche — damit kann dies in einer zukünftigen Version nicht lautlos regressieren.

---

## 🔇→🎵 v5.6.6 — Hintergrundmusik-Vorschau für npm link und globale Installationen repariert

**Veröffentlicht:** 2026-05-08

### 🐛 Hintergrundmusik fehlte lautlos in der Vorschau (npm link / globale Installation)

Wenn du im LLM-Konfigurationsmodal auf **Vorschau** geklickt hast und ein Hintergrundtrack eingestellt war, hörtest du nur die Stimme — keine Musik —, es sei denn, AgentVibes war als lokale Abhängigkeit installiert. Jetzt behoben, unabhängig davon, wie du AgentVibes installierst.

**Grundursache:** Bei `npm link`- und globalen Installationen löschte ein Sync-Skript mit `rsync --delete` regelmäßig `background-music-enabled.txt` aus dem Paketverzeichnis, da die Datei gitignoriert ist. Nach der Löschung fiel `audio-processor.sh` auf eine globale Konfiguration zurück, bei der Musik deaktiviert war — Stille.

**Behebung:** `audio-processor.sh` prüft nun **zuerst** `CLAUDE_PROJECT_DIR/.claude/config/background-music-enabled.txt`. Die TUI-Vorschau schreibt das Flag ebenfalls in das Projektverzeichnis (nicht in das Paketverzeichnis), damit es jede Paketsynchronisierung übersteht.

### 🐛 Pro-LLM-Konfiguration bei npm link / globalen Installationen nicht gefunden

Bei denselben Setups konnte `audio-processor.sh` die Pro-LLM-Audiokonfiguration (Stimme, Reverb, Hintergrundtrack) nicht finden, wenn dein Projekt nicht das AgentVibes-Paket selbst war.

**Behebung:** Das Skript sucht nun zuerst in `CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg`, bevor es auf die Paketkonfiguration zurückfällt.

### 🐛 Hintergrundtrack „Nicht gefunden" nach korrekter Konfiguration

Wenn ein Hintergrundtrack konfiguriert war, AgentVibes aber global oder via `npm link` installiert wurde, konnte die Trackdatei nicht gefunden werden — nur das Paketverzeichnis wurde durchsucht.

**Behebung:** `audio-processor.sh` durchsucht nun auch `CLAUDE_PROJECT_DIR/.claude/audio/tracks/`, wenn der Track nicht im Paketverzeichnis vorhanden ist.

### 🐛 LLM-Konfigurationszeilen-Parser — Lautstärke saugt zusätzliche Spalten auf

Bei einer vollständigen 7-Spalten-LLM-Zeile (das Format, das die TUI schreibt) absorbierte das Lautstärkefeld alle nachfolgenden Spalten. ffmpeg erhielt einen fehlerhaften Lautstärke-String und fiel still auf reines Sprachaudio zurück.

**Behebung:** Der Parser erfasst nun nur das numerische Lautstärkefeld und lässt zusätzliche Spalten in `_rest`.

### 🧪 Windows-CI-Testsuite

Windows-native Tests laufen nun in CI zusammen mit der Linux-BATS-Suite und blockieren die Veröffentlichung, damit Windows-spezifische Pfade nicht lautlos regressieren können.

---

## 🛡️ v5.6.4 — Kritische Sicherheitskorrektur bei der Deinstallation

**Veröffentlicht:** 2026-05-08

### 🐛 `--global`-Deinstallation löscht ~/.claude/ nicht mehr

Mit `--global` hat das Deinstallationsprogramm `~/.claude/` rekursiv entfernt, anstatt nur die darin enthaltenen AgentVibes-eigenen Pfade. Dies führte zu vollständigem Datenverlust — Einstellungen, CLAUDE.md, Skills, Plugins, MCP-Konfigurationen, benutzerdefinierte Tools, alles. Bestätigt echt, bestätigt behoben.

**v5.6.4 führt eine chirurgische Entfernung durch — nur Pfade, die AgentVibes installiert hat:**

- `~/.claude/hooks/`, `hooks-windows/`, `commands/agent-vibes/`, `personalities/`, `audio/`
- `~/.agentvibes/` — vollständig im Besitz von AgentVibes, wird komplett entfernt
- `settings.json`, `CLAUDE.md`, Skills, Plugins, MCP-Konfigurationen — **unberührt**

Ein Regressionstest erzwingt dies nun in CI. Wenn jemand eine umfangreiche Löschung wieder einführt, schlägt der Build fehl:

```js
// issue #182 regression guard
assert: settings.json and CLAUDE.md survived --global uninstall
```

Das kann nicht still regressieren — der Build schlägt zuerst fehl.

---

## 🌟 v5.6.3 — AgentVibes kommt zu Hermes + Einfachere Remote-Einrichtung

**Veröffentlicht:** 2026-05-07

### 🎉 AgentVibes funktioniert jetzt mit Hermes

**[Hermes](https://github.com/NousResearch/hermes-agent)** ist einer der beliebtesten Open-Source-KI-Agenten auf GitHub — über 21.000 Sterne und wachsend. AgentVibes integriert sich jetzt direkt damit: Wenn Hermes eine Antwort abschließt, spricht AgentVibes sie automatisch über deine Lautsprecher. Keine zusätzliche Einrichtung außer der Installation des mitgelieferten Hooks.

### 🎉 Audio-Ziel pro LLM — wähle, wo die Stimme herkommt

Wenn du einen LLM in AgentVibes konfigurierst (Claude Code, Copilot, Codex oder Hermes), konntest du bereits eine einzigartige **Stimme, einen Reverb-Stil, Hintergrundmusik und ein Intro-Präfix** für jeden festlegen. Jetzt kannst du auch das **Audio-Ziel** pro LLM festlegen:

- **Lokal** — über die Lautsprecher des Computers abspielen, an dem du arbeitest
- **Remote** — Audio an eine andere Maschine senden (z. B. dein Laptop), während du auf einem Remote-Server arbeitest oder Hermes in der Cloud ausführst

### 🎉 SSH-Alias-Auswahl — kein manuelles Tippen von Pfaden mehr

Das Einrichten von Remote-Audio erforderte früher das manuelle Eintippen eines SSH-Pfads. Jetzt gibt es ein **Dropdown direkt in der AgentVibes-TUI**, das die SSH-Aliase liest, die bereits auf deiner Maschine vorhanden sind. Wähle den aus, der auf deine Lautsprecher zeigt — fertig. Deine Stimme folgt dir, egal ob du lokal oder remote bist.

### 🐛 Fehlerbehebungen

- **Gar kein Audio** — manche Setups erzeugten vollständige Stille ohne jede Fehlermeldung. Behoben.
- **Falsche Stimme wird abgespielt** — in manchen Konfigurationen ignorierte AgentVibes deine Pro-KI-Stimmeinstellungen und fiel auf den Standard zurück. Behoben.
- **Audio-Einstellungen lecken zwischen Nachrichten** — Musik oder Reverb, die für eine Nachricht gesetzt wurden, konnten versehentlich auf die nächste übertragen werden. Behoben.
- **Verlorene Nachrichten nach einem Absturz** — wenn AgentVibes mitten in einer Nachricht abstürzte, war diese Nachricht verloren. Es stellt sie jetzt wieder her und spielt sie beim Neustart ab.

---

## 🎛️ v5.6.2 — Per-Message Audio Control for Remote Providers

> See [English release notes](../../RELEASE_NOTES.md) for full details.

---


## 🤖 v5.6.1 — Hermes Agent Integration & Windows PS5.1-Korrekturen

**Veröffentlicht:** 2026-05-01

### 🎉 Hermes Agent Integration (Neu!)

AgentVibes unterstützt jetzt offiziell **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — den selbst gehosteten, selbst verbessernden KI-Assistenten. Zwei produktionsreife Hermes-Skills sind in `docs/hermes/skills/` enthalten:

**`hermes-agentvibes-hook`** — Spricht jede Hermes-Antwort automatisch über AgentVibes
- Wird bei jedem `agent:end`-Ereignis ausgelöst (Telegram, Discord, CLI usw.)
- Entfernt Markdown, Code-Blöcke und Emojis vor dem Sprechen
- Kürzt an Wortgrenzen, begrenzt die Rate zur Vermeidung von Warteschlangen-Überlastung
- MITM-sicheres SSH mit `StrictHostKeyChecking=accept-new` + persistentem `known_hosts`
- Vollständiges Logging in `tts-hook.log` zur Fehlersuche

**`agentvibes-target`** — Bringt Hermes bei, beliebigen Text auf Abruf an deine Lautsprecher zu senden
- Base64-JSON-Payload über SSH (gleiche ForceCommand-Architektur wie der Windows-Empfänger)
- Unterstützt Windows- und Android-Ziele
- Detaillierte Fehlerbehebungsanleitung enthalten

**Installation:** Skill ins Hermes-Home-Verzeichnis kopieren und Gateway neu starten:
```bash
cp -r docs/hermes/skills/tts/hermes-agentvibes-hook ~/.hermes/skills/tts/
hermes gateway restart
```

### 🐛 Windows PS5.1-Korrekturen

- **play-tts.ps1 PS5.1-Kompatibilität** — Drei Regressionen aus dem v5.6.0-Rebase behoben:
  PS7-Null-Conditional-Operator (`?.`) durch PS5.1-kompatibles if/else ersetzt, UTF-8-BOM hinzugefügt
  damit Em-Dashes nicht durch CP1252 korrumpiert werden, Piper-Provider-Alias und
  `AGENTVIBES_TEXT_FILE`-Sentinel nach Merge-Verlust wiederhergestellt
- **Modal- & Hotkey-Korrekturen** — Modal-Escape-Taste, Navigations-Hotkeys, Q+Feststelltaste
  und Fehlerbehandlung der Sprachvorschau repariert
- **BMAD-Tab** — Zeigt jetzt alle Agenten unabhängig vom Modul

---

## 🎵 v5.5.0 — LLM-spezifisches Audio-Routing & Windows-Installer-Resilienz

**Veröffentlicht:** 2026-04-27

### 🆕 LLM-spezifisches Audio-Routing
Jeder LLM (Claude Code, Copilot, Codex) kann nun eine eigene Stimme, ein eigenes Pretext, eigenen Reverb und eigene
Hintergrundmusik-Einstellungen haben. Der MCP-Server übergibt `--llm <key>` sowohl an `play-tts.sh`
(Linux/macOS) als auch an `play-tts.ps1` (Windows), und die Scripts suchen in `audio-effects.cfg` nach
`llm:<key>`-Zeilen. Standardzeilen für `claude-code`, `copilot` und `codex` sind bereits enthalten;
konfiguriere sie über **Setup → Standard → Konfigurieren** in der TUI.

### 🐛 Windows-Installer-Absturz behoben
Behobener `spinner.info is not a function`-Fehler, der AgentVibes-**Neuinstallationen** unter Windows zum Absturz
brachte, wenn Nutzer eine ältere globale Installation hatten. Alle 10 Dateikopierfunktionen im Installer umschließen
ihren Spinner nun mit `createRobustSpinner()`, damit veraltete Aufrufer unabhängig von den von ihnen exponierten
Methoden keinen Absturz verursachen können.

### 🎶 Windows-Hintergrundmusik-Parität
Die Windows-TTS-Wiedergabe bevorzugt nun `ffplay` (Sinc-Resampling, keine Artefakte) gegenüber dem
qualitativ minderwertigen WinMM-`SoundPlayer`-Resampler. Der neue `Invoke-AudioPlay`-Helper übernimmt den
Fallback transparent — ist `ffplay` nicht verfügbar, wird `SoundPlayer` wie zuvor verwendet.

### 🎉 Plattformübergreifender Einstiegspunkt für den Party-Modus
BMAD-Party-Modus-Schritt-Dateien und die Copilot-Skill referenzieren nun einheitlich
`node bin/bmad-speak.js` — den einzigen plattformübergreifenden Einstiegspunkt, der auf Windows an
`bmad-speak.ps1` und andernorts an `bmad-speak.sh` delegiert.

### 🔧 Weitere Korrekturen
- `play-tts.sh` akzeptiert nun zusätzlich zur `LLM_PROVIDER`-Umgebungsvariable ein benanntes `--llm <key>`-Flag
- `mcp-server/server.py` verarbeitet die Prioritätskette `AGENTVIBES_LLM` → `CLAUDECODE=1` → `AGENTVIBES_MCP_FALLBACK`
  und leitet den aufgelösten Schlüssel als `-llm`/`--llm` an TTS-Scripts weiter
- `audio-effects.cfg`-Zeilen für `llm:claude-code`, `llm:copilot`, `llm:codex` hinzugefügt
- `command-routing.test.js` und `ConfigService`-Unit-Tests hinzugefügt
- Der npm-pack-Inhalts-Guard erkennt nun nicht verfolgte veröffentlichbare Dateien

### 📊 Technisches
- 231 Tests bestehen (0 Fehler)

---

## 🎛️ v5.4.0 — TUI-Installer, Spinner-Fix & Abhängigkeitsbereinigung

**Veröffentlicht:** 2026-04-22

### ✨ Neu
- **TUI-Installer**: Interaktive Terminal-Oberfläche für die geführte Installation — Stimmen durchsuchen, Anbieter konfigurieren, BMAD-Party-Modus aktivieren, alles über eine elegante Terminal-Oberfläche
- **Plattformübergreifender Spinner-Fix**: Behobener `spinner.info is not a function`-Absturz auf WSL/Linux, der die Installation blockierte

### 🐛 Fehlerbehebungen
- **Zirkuläre Selbstabhängigkeit entfernt**: `package.json` hing von `agentvibes@^3.5.9` (sich selbst) ab, wodurch npm die fehlerhafte alte Version über die korrigierte schattete — der stille Auslöser des Spinner-Absturzes bei wiederholten Installationen
- **Lautstärke-Fallback für Hintergrundmusik wiederhergestellt**: Der `bg_volume="0.20"`-Fallback in `audio-processor.sh`, der bei einem Merge verloren ging, wurde wiederhergestellt
- **PROJECT_ROOT-Erkennung in `play-tts.sh` korrigiert**: Die Aufwärts-Logik ging 2 Ebenen zu weit, wodurch TTS die globale `~/.agentvibes`-Konfiguration statt der Projektkonfiguration verwendete

### 🔧 Technisches
- 706/738 Tests bestehen

---

## 🎯 v5.3.0 — Volle Kontrolle über Remote-Stimmen

**Veröffentlichungsdatum:** April 2026

Wenn du AgentVibes nutzt, um Sprachansagen von einem Server an dein
Handy, Laptop oder eine andere Maschine zu senden, setzt dich diese
Version ans Steuer. Jeder Aufruf kann jetzt seine eigene Stimme,
Hintergrundmusik, Intro-Phrase, seinen eigenen Reverb, seine Lautstärke
und Geschwindigkeit wählen — direkt von der Kommandozeile, nur für
diese eine Nachricht.

### ✨ Was ist neu

#### Du kannst jetzt jede Ansage individuell anpassen

Bisher musstest du, wenn du für eine bestimmte Nachricht eine andere
Stimme oder Musik wolltest, eine Config-Datei ändern (und daran denken,
sie wieder zurückzusetzen). Jetzt fügst du dem Befehl einfach ein Flag
hinzu.

Willst du, dass Winston mit seinem britischen Akzent und Jazz im
Hintergrund diese eine Deploy-Benachrichtigung spricht? Ganz einfach:

```bash
bash .claude/hooks/play-tts-ssh-remote.sh \
  --text "Deploy complete" \
  --voice "en_US-ryan-high" \
  --pretext "Winston here" \
  --music "Late Night Hip Hop Groove.mp3" \
  --volume 0.25
```

Alles, was du nicht angibst, fällt auf deine normalen Einstellungen
zurück. Willst du die Intro-Phrase nur dieses eine Mal überspringen?
Übergib `--pretext ""` und vor der Nachricht bleibt es still.

**Verfügbare Flags:**
- `--voice` — welche Piper-Stimme verwendet werden soll
- `--pretext` — die Intro-Phrase vor der Nachricht (`""` übergeben, um sie zu überspringen)
- `--music` — Hintergrundmusik-Track (Dateinamen mit Leerzeichen funktionieren jetzt!)
- `--volume` — wie laut die Hintergrundmusik ist (0.0 bis 1.0)
- `--effects` — Soundeffekt-Kette wie Reverb
- `--speed` — wie schnell die Stimme spricht
- `--provider` — welche TTS-Engine verwendet werden soll
- `--agent` — welche Agent-Persönlichkeit verwendet werden soll

Der alte Weg, das Script aufzurufen, funktioniert weiterhin, sodass
nichts, was du bereits eingerichtet hast, kaputtgeht.

### 🛠 Zuverlässigkeits-Fixes

- **Lange Nachrichten und Sonderzeichen werden nicht mehr abgeschnitten.**
  Unter Windows wurden lange Ansagen oder Texte mit Anführungszeichen,
  Apostrophen oder Emoji verstümmelt, bevor sie die Voice-Engine
  erreichten. Behoben — deine Nachricht kommt jetzt genau so an, wie du
  sie gesendet hast, egal wie lang oder ungewöhnlich.

- **Sprachansagen funktionieren jetzt auf Windows-Servern ohne Monitor.**
  Windows weigert sich, Audio in der "Service"-Session abzuspielen, die
  SSH normalerweise verwendet. Ein kleiner Hintergrund-Helper läuft
  jetzt in deiner regulären User-Session und nimmt Ansagen aus einer
  Queue auf, sodass Audio auch auf Headless-Servern korrekt abgespielt
  wird.

- **Stimmvorschau in der TUI funktioniert auf Remote-Servern.** Wenn du
  vorher eine Stimme von einem Server ohne Lautsprecher vorgehört hast,
  versuchte sie lokal abzuspielen (und scheiterte). Jetzt streamt sie
  korrekt auf das Remote-Gerät, das du konfiguriert hast.

- **Keine doppelten Intro-Phrasen mehr.** Wenn du ein Pretext sowohl
  auf dem sendenden Server als auch auf der Empfänger-Maschine gesetzt
  hattest, hörtest du es zweimal. Die Version des Senders gewinnt
  jetzt — der Empfänger fügt seine eigene nicht mehr obendrauf hinzu.

- **Remote-Streaming-Einstellungen bleiben jetzt tatsächlich bestehen.**
  Eine kürzliche Änderung hatte versehentlich dazu geführt, dass
  Remote-Streaming-Setups (`ssh-remote`, `agentvibes-receiver`)
  überschrieben wurden und auf lokale Wiedergabe zurückfielen. Behoben.

- **Lange Ansagen werden nicht mitten im Satz abgebrochen.** Das
  Sicherheits-Timeout, das festgefahrenes Audio stoppt, war für lange
  Nachrichten zu aggressiv. Es ist jetzt großzügig genug, um
  Ansagen in Absatzlänge zu verarbeiten.

- **Saubererer Installer-Zustand** — wenn du AgentVibes für Claude Code
  installierst, schreibt es seine TTS-Provider-Datei jetzt explizit,
  statt sich auf impliziten Zustand zu verlassen.

### 🧪 Tests

55 neue Tests stellen sicher, dass der BMAD-Party-Mode weiterhin
funktioniert: jeder Agent erhält seine eindeutige Stimme und Musik,
Agenten teilen sich nicht versehentlich dieselbe Piper-Sprecher-ID,
und der Installer verweist Party-Mode immer auf den
plattformübergreifenden Einstiegspunkt.

---

## 🎯 v5.2.1 — Multi-LLM-Identität & Installations-Feinschliff

**Veröffentlichungsdatum:** April 2026

Verfeinertes LLM-Routing für Copilot/Codex und eine aufpolierte Setup-Erfahrung.

### ✨ Was ist neu

#### Multi-LLM-Identitäts-Routing

- **GitHub Copilot hat jetzt eine eigene Stimme, eigenes Pretext und eigene Hintergrundmusik** — vollständig unterscheidbar von Claude Code und Codex. Sag Hallo zu "Copilot here" mit Bossa Nova im Gepäck.

- **Pro-Tool-MCP-Configs mit expliziter Identität** — jedes KI-Tool (`.vscode/mcp.json`, `.codex/config.toml`, `~/.copilot/mcp-config.json`) setzt sein eigenes `AGENTVIBES_LLM`, damit das Routing deterministisch ist.

- **Das MCP-Tool `get_config` gibt jetzt das erkannte LLM zurück** — so kann der aufrufende Assistent sein Routing bestätigen und von Anfang an mit der richtigen Stimme antworten.

- **Linux-Kompatibilitätsverfeinerungen** — CRLF-Zeilenenden, Berechtigungen und Transport-Provider-Override-Behandlung.

#### Setup-Flow-Verbesserungen

- **Tastaturnavigationsfluss** — beim Drücken von Enter durch die Installations-Buttons (Claude → Copilot → Codex) springt der Fokus jetzt zu **Claude konfigurieren**, sodass du alle drei Konfigurationen durchläufst, bevor du bei Standard landest.

- **Pfeiltaste nach unten überspringt die Standard-Zeile** aus den Installieren/Entfernen-Spalten.

- **Teilweise Install-Erfolgsmeldungen** — wenn Dateikopien gelingen, aber die MCP-Config einen Schubs braucht, siehst du eine klare Warnung statt eines generischen Fehlers.

#### Standardwerte

- **Claude Codes Standard-Hintergrundmusik** auf Chillwave gesetzt (`agent_vibes_chillwave_v2_loop.mp3`).

#### Unter der Haube

- LLM-Schlüsselvalidierung verschärft für sicheres Env-Var-Handling.
- Verbesserte Fehlerprotokollierung für Edge Cases bei Copilot-CLI-Config-Schreibvorgängen.
- Bekannte Einschränkung dokumentiert: wenn du VS Code aus einem Claude-Code-gestarteten Terminal startest, kann `CLAUDECODE=1` durchsickern — Workaround ist zuerst `unset CLAUDECODE`.

---

## 🎯 v5.2.0 — Remote-Stimmvorschau + Höhlenmensch-Modus + Stimmbewertungen

**Veröffentlichungsdatum:** April 2026

Diese Version fügt Unterstützung für Remote-TTS-Vorschau, einen neuen ultra-knappen Verbositätsmodus und Daumen-hoch/runter-Bewertungen für Stimmen in der gesamten TUI hinzu.

### Neue Funktionen

- **Höhlenmensch-Verbositätsmodus** — Neues `caveman`-Verbositätsniveau für ultra-knappe TTS-Ausgabe. Fragmente statt Sätze. Konfigurierbar über `/agent-vibes:verbosity caveman` oder das MCP-Tool `set_verbosity`. Lädt bei einer Erstinstallation automatisch eine Stimme herunter, wenn keine vorhanden ist.

- **Daumen-hoch/runter-Stimmbewertungen** — Ersetzt die alten Stern-Favoriten durch 👍/👎-Bewertungen. Drücken Sie `+` für Daumen hoch, `-` für Daumen runter, sowohl im Stimmen-Tab als auch im Stimmwähler (Setup-Tab). Bewertungen bleiben sitzungsübergreifend erhalten und werden zwischen allen Stimm-Auswahlschnittstellen geteilt.

- **Remote-Stimmvorschau** — Die Stimmvorschau im TUI-Stimmen-Tab, Stimmwähler und Stimmenbrowser funktioniert jetzt auch auf Headless-Servern. Wenn der aktive Anbieter `ssh-remote` oder `agentvibes-receiver` ist, wird die Vorschau über `play-tts.sh` geleitet, um Audio auf dem Remote-Empfänger abzuspielen, anstatt lokales Piper + Audio-Player zu benötigen. Plattformbewusst: verwendet PowerShell unter Windows, bash unter Linux.

- **SSH-Empfänger-Anbieter-Routing** — `ssh-remote` und `agentvibes-receiver` sind jetzt erstklassige Anbieter in `play-tts.sh`. Sowohl die `speak_text()`-Funktion als auch die Haupt-Routing-Case-Anweisung unterstützen sie und eliminieren "Unknown provider"-Fehler.

### Fehlerbehebungen

- **Automatisches Patchen von LibriTTS-Sprechernamen** — Der Stimm-Download patcht jetzt automatisch LibriTTS-Sprechernamen, damit Multi-Sprecher-Stimmen direkt nach der Installation korrekt funktionieren.
- **Stimm-Validierungs-Regex gehärtet** — Der VOICE-Parameter-Regex erlaubt jetzt `::` (Multi-Sprecher), `.` (Locale) und Leerzeichen (Sprechernamen), ohne Backslash (Injection-Risiko) zuzulassen. Linux- und Windows-Empfänger-Templates entsprechend aktualisiert.
- **Plattformübergreifende `base64`-Kompatibilität** — Prüft auf GNU `base64 -w 0`, fällt auf BSD `-b 0` zurück, dann auf `tr -d '\n'`. Behebt den Script-Abbruch auf macOS/BSD-Systemen.
- **Audio-Effekte Doppelverarbeitungs-Fix** — `play-tts-piper.ps1` überspringt seinen eigenen Audio-Prozessor-Aufruf, wenn `AGENTVIBES_NO_PLAY` gesetzt ist.
- **Exit-Code-Leck-Fix** — `play-tts.ps1` beendet sich jetzt explizit mit Code 0.
- **Windows-Empfänger-Tab-Plattformunterstützung** — Tailscale-IP-Erkennung, lokale IP über PowerShell, sshd_config-Lesen und Zwischenablage-Kopieren funktionieren jetzt nativ unter Windows.
- **`llm:default` Audio-Effekte-Zeile** — Eine neue Standardzeile stellt sicher, dass Remote-Empfänger Reverb, Musik und Pretext erhalten.
- **Vorschau-Beispieltext** — Geändert, um einen Piper-Aussprache-Fehler zu vermeiden.
