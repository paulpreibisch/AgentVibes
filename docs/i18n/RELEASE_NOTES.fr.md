> 🌐 [English version](../../RELEASE_NOTES.md)

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
