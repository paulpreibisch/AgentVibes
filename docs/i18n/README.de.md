> 🌐 [English version](../../README.md)

## 🌟 NEU IN v4.5 — Release "Sprich Jede Sprache"

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
