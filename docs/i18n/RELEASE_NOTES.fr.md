> 🌐 [English version](../../RELEASE_NOTES.md)

## 🚀 v5.0.0 — Support Multi-Fournisseur : Claude Code + Copilot + Codex

**Date de sortie :** Avril 2026

### Nouvelles Fonctionnalites

- **Support de GitHub Copilot dans VS Code** — Installez et configurez AgentVibes pour GitHub Copilot directement depuis la TUI. Cree `.vscode/mcp.json` et `.github/copilot-instructions.md`.

- **Support d'OpenAI Codex dans VS Code** — Integration complete de Codex avec `.codex/config.toml`, protocole TTS dans `AGENTS.md` et hooks d'initialisation.

- **Onglet de Configuration Unifie** — L'ancien assistant d'installation a 5 ecrans et l'onglet separe Fournisseurs LLM sont fusionnes en un seul onglet Configuration. Le premier lancement affiche un assistant en 4 etapes (Langue → Dependances → Moteur TTS → Fournisseurs) ; les utilisateurs habituels passent directement a l'ecran Fournisseurs.

- **Configuration Audio par Fournisseur** — Chaque fournisseur LLM (Claude Code, Copilot, Codex) dispose de son propre Moteur TTS, Voix, Reverb, Musique de Fond et Pretext via un modal de Configuration.

- **Ecran de Selection du Moteur TTS** — Une nouvelle etape de l'assistant affiche une liste de moteurs adaptee au systeme d'exploitation (Piper, Soprano, Windows SAPI, macOS Say) avec des boutons Installer pour les moteurs manquants.

- **Onglet Parametres Repense** — Le design a 5 sous-onglets est remplace par une liste plate et epuree : Langue de l'Interface, Moteur TTS par Defaut, Voix par Defaut, Verbosite, Destination Audio, Stockage de Configuration et Relancer l'Assistant de Configuration.

### Ameliorations

- **Selecteur de voix ameliore partout** — Affichage en 3 colonnes (Nom, Genre, Fournisseur), apercu avec la barre d'espace via synthese et lecture, position de defilement preservee pendant l'apercu.

- **Artefacts de texte d'aide corriges** — Se deplacer entre les lignes dans les onglets Agents et Musique ne laisse plus de texte fantome sur les lignes precedentes.

- **Routage vocal de Codex corrige** — `AGENTS.md` indique desormais a Codex d'utiliser `play-tts` pour la parole normale et `bmad-speak` uniquement pendant le mode fete BMAD.

### Impact Utilisateur

- AgentVibes fonctionne desormais avec Claude Code, GitHub Copilot ET OpenAI Codex
- Experience de configuration simplifiee — un seul onglet pour toute la gestion des fournisseurs
- Personnalisation vocale par fournisseur sans modifier les fichiers de configuration
- La page des parametres est considerablement plus simple et rapide a parcourir

---

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
