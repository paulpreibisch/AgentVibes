> 🌐 [English version](../../RELEASE_NOTES.md)

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
