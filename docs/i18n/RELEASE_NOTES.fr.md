> 🌐 [English version](../../RELEASE_NOTES.md)

## 🎯 v5.2.1 — Identité Multi-LLM & Polish d'Installation

**Date de sortie :** Avril 2026

Routage LLM affiné pour Copilot/Codex et expérience de configuration améliorée.

### ✨ Nouveautés

#### Routage d'Identité Multi-LLM

- **GitHub Copilot a maintenant sa propre voix, son pré-texte et sa musique de fond** — totalement distinct de Claude Code et Codex. Dites bonjour à "Copilot here" au rythme d'une bossa nova.

- **Configs MCP par outil avec identité explicite** — chaque outil IA (`.vscode/mcp.json`, `.codex/config.toml`, `~/.copilot/mcp-config.json`) définit son propre `AGENTVIBES_LLM` pour un routage déterministe.

- **L'outil MCP `get_config` retourne maintenant le LLM détecté** — l'assistant peut confirmer son routage et répondre avec la bonne voix dès le départ.

- **Affinements de compatibilité Linux** — fins de ligne CRLF, permissions et gestion de l'override du provider de transport.

#### Améliorations du Flux d'Installation

- **Flux de navigation clavier** — en appuyant sur Entrée à travers les boutons Installer (Claude → Copilot → Codex), on saute maintenant à **Configurer Claude**, permettant de parcourir les trois Configurer avant d'atterrir sur Par Défaut.

- **La flèche bas ignore la ligne Par Défaut** depuis les colonnes Installer/Supprimer.

- **Messages de succès partiel d'installation** — si les copies de fichiers réussissent mais la config MCP a besoin d'un coup de pouce, vous verrez un avertissement clair au lieu d'un échec générique.

#### Valeurs par Défaut

- **Musique de fond par défaut de Claude Code** définie sur Chillwave (`agent_vibes_chillwave_v2_loop.mp3`).

#### Sous le Capot

- Validation de clé LLM renforcée pour une gestion plus sûre des variables d'environnement.
- Journalisation améliorée des erreurs pour les cas limites d'écriture de config Copilot CLI.
- Limitation connue documentée : si vous lancez VS Code depuis un terminal démarré par Claude Code, `CLAUDECODE=1` peut fuiter — la solution est de faire `unset CLAUDECODE` en premier.

---

## 🎯 v5.2.0 — Prévisualisation de Voix à Distance + Mode Homme des Cavernes + Évaluations de Voix

**Date de sortie :** Avril 2026

Cette version ajoute la prise en charge de la prévisualisation TTS à distance, un nouveau mode de verbosité ultra-concis et des évaluations pouce haut/bas pour les voix dans toute la TUI.

### Nouvelles Fonctionnalités

- **Mode de verbosité homme des cavernes** — Nouveau niveau de verbosité `caveman` pour une sortie TTS ultra-concise. Fragments plutôt que phrases. Se configure via `/agent-vibes:verbosity caveman` ou l'outil MCP `set_verbosity`. Télécharge automatiquement une voix lors d'une nouvelle installation si aucune n'est présente.

- **Évaluations pouce haut/bas pour les voix** — Remplace les anciens favoris étoilés par des évaluations 👍/👎. Appuyez sur `+` pour pouce haut, `-` pour pouce bas dans l'onglet Voix et dans le sélecteur de voix (onglet Configuration). Les évaluations persistent entre les sessions et sont partagées entre toutes les interfaces de sélection de voix.

- **Prévisualisation de voix à distance** — La prévisualisation de voix dans l'onglet Voix de la TUI, le sélecteur de voix et le navigateur de voix fonctionne désormais sur les serveurs sans interface graphique. Lorsque le fournisseur actif est `ssh-remote` ou `agentvibes-receiver`, la prévisualisation est routée via `play-tts.sh` pour lire l'audio sur le récepteur distant au lieu de nécessiter Piper + lecteur audio local. Adapté à la plateforme : utilise PowerShell sur Windows, bash sur Linux.

- **Routage du fournisseur récepteur SSH** — `ssh-remote` et `agentvibes-receiver` sont désormais des fournisseurs de première classe dans `play-tts.sh`. La fonction `speak_text()` et l'instruction case de routage principale les prennent en charge, éliminant les erreurs "Unknown provider".

### Corrections

- **Correction automatique des noms de locuteurs LibriTTS** — Le téléchargement de voix corrige désormais automatiquement les noms de locuteurs LibriTTS pour que les voix multi-locuteurs fonctionnent correctement dès la sortie de la boîte.
- **Expression régulière de validation de voix renforcée** — L'expression régulière du paramètre VOICE autorise désormais `::` (multi-locuteur), `.` (locale) et les espaces (noms de locuteurs) sans accepter la barre oblique inverse (risque d'injection). Les modèles de récepteur Linux et Windows mis à jour pour correspondre.
- **Compatibilité multiplateforme de `base64`** — Détecte GNU `base64 -w 0`, revient à BSD `-b 0`, puis `tr -d '\n'`. Corrige l'abandon du script sur les systèmes macOS/BSD.
- **Correction du double traitement des effets audio** — `play-tts-piper.ps1` ignore son propre appel au processeur audio lorsque `AGENTVIBES_NO_PLAY` est défini.
- **Correction de fuite de code de sortie** — `play-tts.ps1` quitte maintenant explicitement avec le code 0.
- **Prise en charge de la plateforme Windows dans l'onglet récepteur** — La détection IP de Tailscale, l'IP locale via PowerShell, la lecture de sshd_config et la copie dans le presse-papiers fonctionnent nativement sur Windows.
- **Ligne d'effets audio `llm:default`** — Une nouvelle ligne par défaut garantit que les récepteurs distants obtiennent réverbération, musique et pretexte.
- **Texte d'exemple de prévisualisation** — Modifié pour éviter un défaut de prononciation de Piper.
