> 🌐 [English version](../../RELEASE_NOTES.md)

## 🌍 v4.5.0 — Version "Parlez Toutes les Langues"

**Date de sortie :** Avril 2026

Support TUI multilingue complet dans les 9 langues, renforcement complet de la sécurité Windows et zéro test en échec.

### 🌍 TUI Multilingue — 9 Langues

Chaque écran, onglet, bouton et étiquette dans la TUI `npx agentvibes` est maintenant entièrement traduit :

- **Anglais, Espagnol, Français, Allemand, Portugais, Japonais, Coréen, Chinois (Simplifié), Italien**
- Sélection de la langue au premier lancement (Écran 0 de l'assistant d'installation)
- Sous-onglet Langue dans Paramètres — changez la langue en direct sans redémarrage
- Tous les libellés de la barre d'onglets, le texte des boutons, les conseils de pied de page et les messages de statut traduits
- Onglet BMAD et onglet SSH Receiver entièrement localisés
- Fichiers i18n par langue avec repli vers l'anglais

### 🪟 Sécurité et Corrections de Bugs Windows

- **Noms de fichiers temporaires** — Tous les noms de fichiers temporaires avec `Date.now()` remplacés par `randomUUID()` (imprévisible, empêche le détournement de fichiers temporaires)
- **Injection shell** — `execSync('which ...', { shell: true })` remplacé par `spawnSync`
- **Lecteur de musique** — `ffplay` codé en dur sur Windows remplacé par `detectMp3Player()`
- **Coercition booléenne** — `isWindowsTerminal` retourne correctement `true/false` au lieu de faire fuiter la chaîne UUID de `WT_SESSION`

### 🎙️ BMAD Speak Multiplateforme

- `bin/bmad-speak.js` — point d'entrée multiplateforme pour la parole des agents BMAD
- `.claude/hooks-windows/bmad-speak.ps1` — BMAD speak Windows natif avec routage de personnalité par agent

### 🧪 Suite de Tests

- 600 tests, 0 échec
