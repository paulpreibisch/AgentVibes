> 🌐 [English version](../../RELEASE_NOTES.md)

## 🌟 v5.6.3 — AgentVibes débarque sur Hermes + Configuration distante simplifiée

**Sortie :** 2026-05-07

### 🎉 AgentVibes fonctionne maintenant avec Hermes

**[Hermes](https://github.com/NousResearch/hermes-agent)** est l'un des agents IA open source les plus populaires sur GitHub — plus de 21 000 étoiles et en pleine croissance. AgentVibes s'intègre désormais avec lui d'emblée : quand Hermes termine une réponse, AgentVibes la lit à voix haute via vos haut-parleurs automatiquement. Aucune configuration supplémentaire au-delà de l'installation du hook fourni.

### 🎉 Destination audio par LLM — choisissez d'où vient la voix

Quand vous configurez un LLM dans AgentVibes (Claude Code, Copilot, Codex ou Hermes), vous pouviez déjà définir une **voix, un style de réverbération, une musique de fond et un préfixe d'introduction** uniques pour chacun. Vous pouvez maintenant aussi définir la **destination audio** par LLM :

- **Local** — jouer via les haut-parleurs de l'ordinateur sur lequel vous travaillez
- **Distant** — envoyer l'audio vers une autre machine (votre ordinateur portable, par exemple) pendant que vous travaillez sur un serveur distant ou que vous exécutez Hermes dans le cloud

### 🎉 Sélecteur d'alias SSH — fini de taper les chemins à la main

Configurer l'audio distant nécessitait auparavant de taper un chemin SSH manuellement. Il y a maintenant un **menu déroulant directement dans la TUI d'AgentVibes** qui lit les alias SSH déjà présents sur votre machine. Choisissez celui qui pointe vers vos haut-parleurs — c'est fait. Votre voix vous suit que vous soyez en local ou à distance.

### 🐛 Corrections

- **Aucun audio du tout** — certaines configurations produisaient un silence complet sans aucun message d'erreur. Corrigé.
- **Mauvaise voix jouée** — dans certaines configurations, AgentVibes ignorait vos paramètres de voix par IA et revenait à la valeur par défaut. Corrigé.
- **Paramètres audio se propageant entre les messages** — la musique ou la réverbération définie pour un message pouvait accidentellement se transmettre au suivant. Corrigé.
- **Messages perdus après un crash** — si AgentVibes crashait en plein milieu d'un message, ce message était perdu. Il le récupère maintenant et le rejoue au redémarrage.

---

## 🎛️ v5.6.2 — Per-Message Audio Control for Remote Providers

> See [English release notes](../../RELEASE_NOTES.md) for full details.

---


## 🤖 v5.6.1 — Intégration Hermes Agent & Corrections PS5.1 Windows

**Sortie :** 2026-05-01

### 🎉 Intégration Hermes Agent (Nouveau !)

AgentVibes prend désormais officiellement en charge **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — l'assistant IA auto-hébergé et auto-améliorant. Deux skills Hermes prêtes pour la production sont incluses dans `docs/hermes/skills/` :

**`hermes-agentvibes-hook`** — Vocalise automatiquement chaque réponse Hermes via AgentVibes
- Se déclenche à chaque événement `agent:end` (Telegram, Discord, CLI, etc.)
- Supprime le markdown, les blocs de code et les emojis avant de parler
- Tronque aux limites des mots, limite le débit pour éviter la saturation de la file
- SSH sécurisé contre MITM avec `StrictHostKeyChecking=accept-new` + `known_hosts` persistant
- Journalisation complète dans `tts-hook.log` pour le débogage

**`agentvibes-target`** — Apprend à Hermes à envoyer n'importe quel texte vers vos haut-parleurs à la demande
- Payload JSON en base64 via SSH (même architecture ForceCommand que le récepteur Windows)
- Compatible avec les cibles Windows et Android
- Guide de dépannage détaillé inclus

**Installation :** Copiez la skill dans le répertoire home Hermes et redémarrez le gateway :
```bash
cp -r docs/hermes/skills/tts/hermes-agentvibes-hook ~/.hermes/skills/tts/
hermes gateway restart
```

### 🐛 Corrections PS5.1 Windows

- **Compatibilité PS5.1 de play-tts.ps1** — Correction de trois régressions du rebase v5.6.0 :
  remplacement de l'opérateur null-conditionnel PS7 (`?.`) par if/else compatible PS5.1, ajout du BOM UTF-8
  pour éviter la corruption des tirets longs avec CP1252, restauration de l'alias du fournisseur piper et
  du sentinel `AGENTVIBES_TEXT_FILE` perdus lors de la fusion
- **Corrections modal & raccourcis clavier** — Touche Échap du modal, raccourcis de navigation, Q+Verr Maj
  et gestion des erreurs de prévisualisation vocale réparés
- **Onglet BMAD** — Affiche désormais tous les agents quel que soit le module

---

## 🎵 v5.5.0 — Routage Audio par LLM et Résilience de l'Installateur Windows

**Sortie :** 2026-04-27

### 🆕 Routage Audio par LLM
Chaque LLM (Claude Code, Copilot, Codex) peut désormais avoir sa propre voix, son pré-texte, sa réverbération et ses
paramètres de musique de fond. Le serveur MCP passe `--llm <key>` à la fois à `play-tts.sh`
(Linux/macOS) et à `play-tts.ps1` (Windows), et les scripts recherchent les lignes `llm:<key>` dans
`audio-effects.cfg`. Des lignes par défaut pour `claude-code`, `copilot` et `codex` sont fournies
d'emblée ; configurez-les via **Setup → Default → Configure** dans le TUI.

### 🐛 Correction du Crash de l'Installateur Windows
Correction de l'erreur `spinner.info is not a function` qui faisait planter les **réinstallations** d'AgentVibes sous Windows
lorsque les utilisateurs avaient une ancienne installation globale. Les 10 fonctions de copie de fichiers de l'installateur
enveloppent désormais leur spinner avec `createRobustSpinner()` afin que les appelants obsolètes ne puissent jamais
provoquer de crash, quelles que soient les méthodes qu'ils exposent.

### 🎶 Parité de la Musique de Fond sous Windows
La lecture TTS sous Windows préfère désormais `ffplay` (rééchantillonnage sinc, sans artefacts) au rééchantillonneur
`SoundPlayer` de WinMM de faible qualité. Le nouvel helper `Invoke-AudioPlay` gère le repli de manière
transparente — si `ffplay` n'est pas disponible, `SoundPlayer` est utilisé comme avant.

### 🎉 Point d'Entrée Multiplateforme du Mode Fête
Les fichiers de pas du mode fête BMAD et la compétence Copilot font désormais référence de manière cohérente à
`node bin/bmad-speak.js` — le point d'entrée multiplateforme unique qui délègue à
`bmad-speak.ps1` sur Windows et `bmad-speak.sh` ailleurs.

### 🔧 Autres Corrections
- `play-tts.sh` accepte désormais un flag nommé `--llm <key>` en plus de la variable d'environnement `LLM_PROVIDER`
- `mcp-server/server.py` gère la chaîne de priorité `AGENTVIBES_LLM` → `CLAUDECODE=1` → `AGENTVIBES_MCP_FALLBACK`
  et transmet la clé résolue sous forme de `-llm`/`--llm` aux scripts TTS
- Ajout de lignes dans `audio-effects.cfg` pour `llm:claude-code`, `llm:copilot`, `llm:codex`
- Ajout de `command-routing.test.js` et de tests unitaires `ConfigService`
- Le gardien de contenu npm pack détecte désormais les fichiers publiables non suivis

### 📊 Technique
- 231 tests réussis (0 échec)

---

## 🎛️ v5.4.0 — Installateur TUI, Correction du Spinner et Nettoyage des Dépendances

**Sortie :** 2026-04-22

### ✨ Nouveautés
- **Installateur TUI** : Interface terminal interactive pour une installation guidée — parcourez les voix, configurez les fournisseurs, activez le mode fête BMAD, le tout depuis une magnifique interface terminal
- **Correction du Spinner Multiplateforme** : Résolution du crash `spinner.info is not a function` sur WSL/Linux qui bloquait l'installation

### 🐛 Corrections de Bugs
- **Suppression de la dépendance circulaire** : `package.json` dépendait de `agentvibes@^3.5.9` (lui-même), faisant que npm masquait le binaire corrigé avec l'ancien bugué — la cause silencieuse du crash du spinner lors des réinstallations
- **Restauration du fallback de volume de musique de fond** : Le fallback `bg_volume="0.20"` de `audio-processor.sh` perdu lors d'une fusion a été restauré
- **Correction de la détection de PROJECT_ROOT dans `play-tts.sh`** : La logique de remontée allait 2 niveaux trop haut, entraînant l'utilisation de la config globale `~/.agentvibes` au lieu de la config du projet

### 🔧 Technique
- 706/738 tests réussis

---

## 🎯 v5.3.0 — Prenez le Contrôle des Voix à Distance

**Date de sortie :** Avril 2026

Si vous utilisez AgentVibes pour envoyer des annonces vocales depuis un
serveur vers votre téléphone, votre ordinateur portable ou une autre
machine, cette version vous met aux commandes. Chaque appel peut
maintenant choisir sa propre voix, sa musique de fond, sa phrase
d'intro, sa réverbération, son volume et sa vitesse — directement
depuis la ligne de commande, pour ce seul message.

### ✨ Nouveautés

#### Vous pouvez maintenant personnaliser chaque annonce individuellement

Avant, si vous vouliez une voix ou une musique différente pour un
message spécifique, il fallait modifier un fichier de config (et se
souvenir de le remettre). Maintenant, il suffit d'ajouter un flag à la
commande.

Vous voulez que Winston parle avec son accent britannique et du jazz en
fond pour cette notification de déploiement ? Facile :

```bash
bash .claude/hooks/play-tts-ssh-remote.sh \
  --text "Deploy complete" \
  --voice "en_US-ryan-high" \
  --pretext "Winston here" \
  --music "Late Night Hip Hop Groove.mp3" \
  --volume 0.25
```

Tout ce que vous ne spécifiez pas revient à vos réglages habituels.
Envie de sauter la phrase d'intro juste cette fois-ci ? Passez
`--pretext ""` et ça restera silencieux avant le message.

**Flags disponibles :**
- `--voice` — quelle voix Piper utiliser
- `--pretext` — la phrase d'intro avant le message (passez `""` pour la sauter)
- `--music` — piste de musique de fond (les noms de fichiers avec espaces fonctionnent maintenant !)
- `--volume` — volume de la musique de fond (0.0 à 1.0)
- `--effects` — chaîne d'effets sonores comme la réverbération
- `--speed` — vitesse de diction de la voix
- `--provider` — quel moteur TTS utiliser
- `--agent` — quelle personnalité d'agent utiliser

L'ancienne façon d'appeler le script fonctionne toujours, donc rien de
ce que vous avez déjà configuré ne sera cassé.

### 🛠 Corrections de Fiabilité

- **Les messages longs et les caractères spéciaux ne sont plus coupés.**
  Sous Windows, les annonces longues ou les textes avec guillemets,
  apostrophes ou emojis étaient massacrés avant d'arriver au moteur
  vocal. Corrigé — votre message arrive maintenant exactement comme
  vous l'avez envoyé, peu importe sa longueur ou ses bizarreries.

- **Les annonces vocales fonctionnent maintenant sur les serveurs
  Windows sans moniteur.** Windows refuse de jouer l'audio dans la
  session "service" que SSH utilise normalement. Un petit assistant en
  arrière-plan tourne désormais dans votre session utilisateur normale
  et récupère les annonces depuis une file d'attente, donc l'audio est
  joué correctement même sur les serveurs sans interface graphique.

- **La prévisualisation vocale dans la TUI fonctionne sur les serveurs
  distants.** Avant, si vous prévisualisiez une voix depuis un serveur
  sans haut-parleurs, elle essayait de jouer en local (et échouait).
  Maintenant, elle est correctement routée vers le périphérique distant
  que vous avez configuré.

- **Plus de doubles phrases d'intro.** Si vous aviez configuré un
  pré-texte à la fois sur le serveur expéditeur et sur la machine
  réceptrice, vous l'entendiez deux fois. La version de l'expéditeur
  l'emporte maintenant — le récepteur n'ajoute plus la sienne par-dessus.

- **Les paramètres de streaming distant restent vraiment en place.**
  Un changement récent faisait accidentellement que les configurations
  de streaming distant (`ssh-remote`, `agentvibes-receiver`) étaient
  écrasées et retombaient sur la lecture locale. Corrigé.

- **Les annonces longues ne sont plus tuées en plein milieu de phrase.**
  Le timeout de sécurité qui arrête l'audio bloqué était trop agressif
  pour les messages longs. Il est maintenant suffisamment généreux pour
  gérer des annonces de la longueur d'un paragraphe.

- **État d'installation plus propre** — quand vous installez AgentVibes
  pour Claude Code, il écrit maintenant son fichier de fournisseur TTS
  explicitement au lieu de s'appuyer sur un état implicite.

### 🧪 Tests

55 nouveaux tests s'assurent que le mode fête BMAD continue de
fonctionner : chaque agent obtient sa voix et sa musique uniques, les
agents ne partagent pas accidentellement le même ID de locuteur Piper,
et l'installateur dirige toujours le mode fête vers le point d'entrée
multiplateforme.

---

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
