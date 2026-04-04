> 🌐 [English version](../../RELEASE_NOTES.md)

## 🐛 v4.6.8 — Correction du Plantage lors d'une Installation Neuve

**Date de sortie :** Avril 2026

### Corrections de Bugs

- **L'onglet Paramètres ne plante plus lors d'une installation neuve** — `parseMultiSpeaker()` appelait `.includes()` sur un voice ID nul lorsqu'aucune voix n'était encore configurée. Un garde nul a été ajouté pour renvoyer un objet par défaut sûr. Signalé par un utilisateur qui a rencontré ce problème immédiatement après avoir terminé l'assistant d'installation.

- **Lien symbolique macOS /var dans le test de relecture** — Correction d'une assertion de test qui échouait sur macOS où `/var` est un lien symbolique vers `/private/var`, provoquant l'échec des comparaisons de chemins de relecture.

- **Analyse du pretext dans BMAD voices** — Les lignes de pretext dans `bmad-voices.md` sont maintenant correctement analysées et le markdown est supprimé de manière plus approfondie avant la synthèse TTS.

### Impact Utilisateur

- Les nouveaux utilisateurs ne subissent plus de plantage en naviguant vers Paramètres après une installation neuve
- La suite de tests fonctionne correctement sur macOS

---

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

---

## 🐛 v4.5.1 — Version Corrective

**Date de sortie :** Avril 2026

### Correction de Bug

- **Aperçu de l'onglet Musique** — Appuyer sur Espace sur une piste dans l'onglet Musique fonctionne maintenant correctement
  lors de l'exécution de `npx agentvibes` depuis un répertoire vierge. Auparavant, si `.claude/audio/tracks/`
  n'existait pas dans le répertoire de travail actuel, la liste des pistes affichait les pistes intégrées mais
  Espace ne faisait rien (le lecteur était lancé contre un chemin inexistant). Maintenant, il se replie
  automatiquement sur le répertoire de pistes inclus dans le paquet.
