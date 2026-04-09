> 🌐 [English version](../../RELEASE_NOTES.md)

## 🚀 v5.0.0 — Multi-Anbieter-Unterstutzung: Claude Code + Copilot + Codex

**Veroffentlichungsdatum:** April 2026

### Neue Funktionen

- **GitHub Copilot-Unterstutzung in VS Code** — AgentVibes fur GitHub Copilot direkt uber die TUI installieren und konfigurieren. Erstellt `.vscode/mcp.json` und `.github/copilot-instructions.md`.

- **OpenAI Codex-Unterstutzung in VS Code** — Vollstandige Codex-Integration mit `.codex/config.toml`, TTS-Protokoll in `AGENTS.md` und Init-Hooks.

- **Vereinheitlichter Einrichtungs-Tab** — Der alte 5-Bildschirm-Installationsassistent und der separate LLM-Anbieter-Tab wurden zu einem einzigen Einrichtungs-Tab zusammengefuhrt. Beim ersten Start wird ein 4-Schritte-Assistent angezeigt (Sprache → Abhangigkeiten → TTS-Engine → Anbieter); wiederkehrende Benutzer springen direkt zum Anbieter-Bildschirm.

- **Audio-Konfiguration pro Anbieter** — Jeder LLM-Anbieter (Claude Code, Copilot, Codex) erhalt seine eigene TTS-Engine, Stimme, Reverb, Hintergrundmusik und Pretext uber ein Konfigurations-Modal.

- **TTS-Engine-Auswahlbildschirm** — Ein neuer Assistentenschritt zeigt eine betriebssystemspezifische Engine-Liste (Piper, Soprano, Windows SAPI, macOS Say) mit Installieren-Schaltflachen fur fehlende Engines.

- **Einstellungen-Tab neu gestaltet** — Das 5-Unter-Tab-Layout wurde durch eine ubersichtliche flache Liste ersetzt: Oberflachensprache, Standard-TTS-Engine, Standardstimme, Ausfuhrlichkeit, Audio-Ziel, Konfigurationsspeicher und Einrichtungsassistent erneut ausfuhren.

### Verbesserungen

- **Stimmauswahl uberall verbessert** — 3-Spalten-Anzeige (Name, Geschlecht, Anbieter), Leertaste-Vorschau mit Synthese und Wiedergabe, Scroll-Position bleibt wahrend der Vorschau erhalten.

- **Hinweistext-Artefakte behoben** — Das Wechseln zwischen Zeilen in den Agenten- und Musik-Tabs hinterlasst keine Geistertexte mehr in vorherigen Zeilen.

- **Codex-Stimmweiterleitung korrigiert** — `AGENTS.md` weist Codex jetzt an, `play-tts` fur normale Sprache und `bmad-speak` nur wahrend des BMAD-Party-Modus zu verwenden.

### Auswirkungen fur Benutzer

- AgentVibes funktioniert jetzt mit Claude Code, GitHub Copilot UND OpenAI Codex
- Optimierte Einrichtungserfahrung — ein Tab fur die gesamte Anbieterverwaltung
- Stimmanpassung pro Anbieter ohne Konfigurationsdateien zu bearbeiten
- Die Einstellungsseite ist deutlich einfacher und schneller zu navigieren

---

## 🐛 v4.6.8 — Absturzfix bei Neuinstallation

**Veröffentlichungsdatum:** April 2026

### Fehlerbehebungen

- **Der Einstellungen-Tab stürzt bei einer Neuinstallation nicht mehr ab** — `parseMultiSpeaker()` rief `.includes()` auf einer null Voice-ID auf, wenn noch keine Stimme konfiguriert war. Ein Null-Guard wurde hinzugefügt, der ein sicheres Standardobjekt zurückgibt. Gemeldet von einem Benutzer, der diesen Fehler unmittelbar nach Abschluss des Installationsassistenten erlebte.

- **macOS /var-Symlink im Wiedergabetest** — Eine Test-Assertion wurde korrigiert, die unter macOS fehlschlug, wo `/var` ein Symlink zu `/private/var` ist, was dazu führte, dass Pfadvergleiche bei der Wiedergabe fehlschlugen.

- **BMAD voices Pretext-Analyse** — Pretext-Zeilen in `bmad-voices.md` werden jetzt korrekt geparst und Markdown wird vor der TTS-Synthese gründlicher entfernt.

### Auswirkung auf Benutzer

- Neue Benutzer erleben keinen Absturz mehr, wenn sie nach einer Neuinstallation zu den Einstellungen navigieren
- Die Testsuite läuft zuverlässig unter macOS

---

## 🌍 v4.5.0 — Release "Sprich Jede Sprache"

**Veröffentlichungsdatum:** April 2026

Vollständige mehrsprachige TUI-Unterstützung in allen 9 Sprachen, vollständige Windows-Sicherheitshärtung und null fehlgeschlagene Tests.

### 🌍 Mehrsprachige TUI — 9 Sprachen

Jeder Bildschirm, Tab, Schaltfläche und Beschriftung in der `npx agentvibes` TUI ist jetzt vollständig übersetzt:

- **Englisch, Spanisch, Französisch, Deutsch, Portugiesisch, Japanisch, Koreanisch, Chinesisch (Vereinfacht), Italienisch**
- Sprachauswahl beim ersten Start (Bildschirm 0 des Installationsassistenten)
- Sprach-Unterreiter in den Einstellungen — Sprache live wechseln ohne Neustart
- Alle Tab-Leisten-Beschriftungen, Schaltflächentext, Fußzeilen-Hinweise und Statusmeldungen übersetzt
- BMAD-Tab und SSH-Receiver-Tab vollständig lokalisiert
- Sprachspezifische i18n-Dateien mit englischem Fallback

### 🪟 Windows-Sicherheit und Fehlerbehebungen

- **Temporäre Dateinamen** — Alle `Date.now()`-Dateinamen durch `randomUUID()` ersetzt (unvorhersehbar, verhindert das Kapern temporärer Dateien)
- **Shell-Injection** — `execSync('which ...', { shell: true })` durch `spawnSync` ersetzt
- **Musik-Player** — Hartcodiertes `ffplay` unter Windows durch `detectMp3Player()` ersetzt
- **Boolean-Umwandlung** — `isWindowsTerminal` gibt jetzt korrekt `true/false` zurück, statt den `WT_SESSION` UUID-String preiszugeben

### 🎙️ Plattformübergreifendes BMAD Speak

- `bin/bmad-speak.js` — plattformübergreifender Einstiegspunkt für BMAD-Agenten-Sprache
- `.claude/hooks-windows/bmad-speak.ps1` — natives Windows BMAD Speak mit agentspezifischem Persönlichkeits-Routing

### 🧪 Test-Suite

- 600 Tests, 0 Fehler

---

## 🐛 v4.5.1 — Patch-Release

**Veröffentlichungsdatum:** April 2026

### Fehlerbehebung

- **Vorschau im Musik-Tab** — Das Drücken der Leertaste auf einem Track im Musik-Tab funktioniert jetzt korrekt,
  wenn `npx agentvibes` aus einem leeren Verzeichnis gestartet wird. Bisher wurden die eingebauten Tracks
  in der Trackliste angezeigt, wenn `.claude/audio/tracks/` im aktuellen Arbeitsverzeichnis nicht vorhanden war,
  aber die Leertaste hatte keine Wirkung (der Player wurde gegen einen nicht existierenden Pfad gestartet).
  Jetzt wird automatisch auf das im Paket enthaltene Tracks-Verzeichnis zurückgegriffen.
