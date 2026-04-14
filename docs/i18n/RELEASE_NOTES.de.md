> 🌐 [English version](../../RELEASE_NOTES.md)

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
