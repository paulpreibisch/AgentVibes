> 🌐 [English version](../../RELEASE_NOTES.md)

## 🎙️ v5.1.0 — Überarbeiteter Stimmwähler + Automatisches Speichern im Agent-Modal

**Veröffentlichungsdatum:** April 2026

### Neue Funktionen

- **Automatisches Speichern im Agent-Bearbeitungs-Modal** — Änderungen pro Agent an Stimme/Persönlichkeit/Musik/Reverb/Pretext werden jetzt automatisch gespeichert, während Sie sie bearbeiten. Die explizite Speichern-Schaltfläche ist verschwunden; ein kurzer "✓ Gespeichert!"-Hinweis bestätigt jede Änderung. Abbrechen und Auf Standard zurücksetzen verhalten sich weiterhin wie zuvor.

- **Eindeutige LibriTTS-Sprechernamen** — Die 904 LibriTTS-Sprecher werden nicht mehr als "Anna", "Anna-2", "Anna-3", … "Anna-16" angezeigt. Jeder erhält einen deterministischen Nachnamen aus einem Pool von 16 Namen: **Anna Bell**, **Anna Carter**, **Anna Davis**, …, **Anna Quinn**. Die zugrunde liegenden Stimm-IDs sind unverändert, sodass bestehende Benutzerkonfigurationen weiterhin funktionieren.

- **Rosa/blaue Gendersymbole** — Weibliche Stimmen zeigen **♀** in Rosa (Magenta), männliche Stimmen zeigen **♂** in Hellblau (bright-cyan), unbekannt zeigt `—`. Die `Gender`-Spalte im Header wird durch farbiges `♀/♂` ersetzt (10 → 4 Zeichen breit), was Platz für längere Namen schafft. Angewandt auf den Haupt-Stimmen-Tab UND alle 3 Stimmwähler-Modale (Setup, Agenten, Einstellungen).

- **Schnellsprung nach erstem Buchstaben in Stimmwählern** — Drücken Sie einen beliebigen Buchstaben `a`–`z`, um zur ersten Stimme zu springen, die mit diesem Buchstaben beginnt. Reservierte Tasten (`q`, `j`, `k`, `g`, `h`, `l`) sind blockiert, damit sie ihre Abbruch-/Vi-Navigationsbedeutung behalten.

- **Seitennavigation in Stimmwählern** — `PgUp`, `PgDn`, `Home`, `End` funktionieren jetzt in allen Stimmwähler-Modalen.

- **3 neue Hintergrundmusik-Tracks** — `Late Night Hip Hop Groove`, `Drifting Down the Hall` (90er-Vibes) und `Midnight Charleston Stomp` (Swing). Anzahl der Tracks steigt von 15 auf 18.

### Verbesserungen

- **Suchleiste im Stimmwähler entfernt** — Ersetzt durch Schnellsprung nach erstem Buchstaben. Das alte Suchtextfeld hatte Fokusprobleme, die Navigationstasten verschluckten. Der Sprung ist schneller für den typischen "Stimme X finden"-Anwendungsfall.

- **Track-Listen-Sortierung korrigiert** — Tracks mit Emoji-Präfixen (z. B. `🎤 Late Night Hip Hop Groove`) werden jetzt nach dem alphabetischen Teil des Namens sortiert, nicht nach dem Emoji-Codepoint. Die Reihenfolge ist konsistent über Node/ICU-Versionen hinweg.

- **Favoriten-Hotkey ist jetzt nur `*`** — Die doppelte `f`-Bindung zum Markieren von Favoriten in Stimmwählern und im Haupt-Stimmen-Tab wurde entfernt. `f` ist jetzt frei für den Schnellsprung nach erstem Buchstaben (z. B. zu Frank oder Felix springen). Der `*`-Marker bleibt der kanonische Weg, Favoriten umzuschalten.

### Fehlerbehebungen

- **Nicht installierte Zeilen im Stimmen-Tab werden nicht mehr beschädigt** — Das Auswählen einer nicht installierten Stimme löschte visuell ihre Anbieter-Spalte aufgrund eines Regex-Strips, der den `bright-black-fg`-Wrapper der Zeile zu weit fasste. Ersetzt durch einen präzisen Hint-Anker, der nur den exakten Hint-Text entfernt.

- **Blink-Artefakte in Musik- + Stimmen-Tabs verschwunden** — `█`-Cursor lassen beim schnellen Scrollen durch die Liste keine Streublöcke mehr zurück. Beide Tabs verwenden jetzt einen präzisen Blink-Strip-Helfer anstelle des fragilen positionsbasierten Slicers.

- **Setup-Tab schlägt nicht mehr stillschweigend fehl** — `_renderScreen3` umschloss den gesamten `setupCompleted`-Schreibblock in einem einzigen leeren `try/catch {}`. Beschädigte lokale Konfigurationsdateien werden jetzt nach `config.json.bak` gesichert und neu geschrieben, wobei Fehler in stderr protokolliert werden — kein "stuck repeating setup" ohne Erklärung mehr.

- **Stimmwähler `q`-Abbruch funktioniert jetzt** — Der neue Schnellsprung nach erstem Buchstaben verschluckte `q` (und andere Vi-Navigationstasten). Reservierte Tasten-Blocklist hinzugefügt.

- **Track-Picker case-insensitive Sortierung** — Neue Tracks mit Title-Case-Namen (`Late Night Hip Hop Groove.mp3`) springen nicht mehr an den Anfang der Liste über die Kleinbuchstaben-`agent_vibes_*`-Tracks.

### Auswirkungen für Benutzer

- Das Bearbeiten der Stimme oder Einstellungen eines Agenten ist jetzt schneller — kein Klicken auf Speichern mehr nötig
- Der Stimmwähler ist deutlich übersichtlicher, da alle 904 LibriTTS-Sprecher eindeutige, freundliche Namen haben
- Geschlecht auf einen Blick durch farbige Symbole
- Drei neue Musiktracks für Abwechslung
- Blink-/Scroll-Artefakte in Stimmen- und Musik-Tabs verschwunden

---

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
