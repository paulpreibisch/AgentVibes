> 🌐 [English version](../../README.md)

## 🌟 NOUVEAU DANS v4.5 — Version "Parlez Toutes les Langues"

### 🌍 TUI Multilingue — 9 Langues

Chaque écran, bouton et étiquette dans `npx agentvibes` est maintenant entièrement traduit :

- **Anglais, Espagnol, Français, Allemand, Portugais, Japonais, Coréen, Chinois (Simplifié), Italien**
- Sélection de la langue au premier lancement — choisissez votre langue avant tout
- Sous-onglet Langue dans Paramètres — changez en direct, sans redémarrage nécessaire
- Tous les libellés d'onglets, boutons, conseils de pied de page, messages de statut et onglets BMAD/Receiver traduits
- Fichiers i18n par langue (`src/i18n/en.js`, `es.js`, `fr.js`, ...) avec repli vers l'anglais

### 🪟 Renforcement de la Sécurité Windows

- **Fichiers temporaires imprévisibles** — `randomUUID()` remplace `Date.now()` dans tous les noms de fichiers temporaires (JS + PowerShell)
- **Pas d'injection shell** — `spawnSync` remplace `execSync(..., { shell: true })` pour les recherches `which`
- **Détection intelligente du lecteur de musique** — `detectMp3Player()` remplace le `ffplay` codé en dur sur Windows
- **Correction booléenne** — `isWindowsTerminal` retourne maintenant `true/false`, pas la chaîne UUID de `WT_SESSION`

### 🎙️ BMAD Speak Multiplateforme

- `bmad-speak.js` — point d'entrée multiplateforme ; route automatiquement vers PowerShell sur Windows ou bash sur Mac/Linux
- `bmad-speak.ps1` — BMAD speak Windows natif avec routage de personnalité par agent

### 🧪 600 Tests, Zéro Échec
