> 🌐 [English version](../../RELEASE_NOTES.md)

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
