> 🌐 [English version](../../README.md)

**Auteur** : Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Version** : v5.6.9

---

## 🌟 NOUVEAU DANS v5.7.7 — Restauration des Voix en Mode Party + Améliorations

**Les agents du mode party parlent à nouveau :** BMAD `/party-mode` invoque maintenant de manière fiable le bon skill AgentVibes, et chaque réponse d'agent est lue à voix haute avec sa voix unique avec musique, pretext et reverb par agent — chargés automatiquement depuis `~/.agentvibes/bmad-voice-map.json`.

**Nouvelle piste intégrée :** 🌌 CelestialVelvet ajoutée au catalogue musical intégré.

**Correction du contraste TUI :** Les lignes sélectionnées dans les onglets Voix et Agents n'affichent plus de texte gris illisible.

**SSH distant :** Correction de l'erreur "wait: pid is not a child of this shell" dans `play-tts-ssh-remote.sh`.

## v5.7.6 — Intégrité du Payload SSH Distant + Réécriture du Récepteur

**Correction musique/voix SSH distant :** La bonne piste musicale et voix du projet atteignent maintenant le récepteur distant — auparavant la configuration globale était utilisée au lieu des paramètres du projet actif.

**Réécriture du récepteur Bash :** Le `agentvibes-receiver.sh` Linux/Termux a été entièrement réécrit pour décoder le format de payload base64 JSON actuel. L'ancien format d'arguments positionnels d'avant v5.5 a disparu.

**Plus de double introduction :** Le prétext de personnalité (ex., "Bcs latin dance here") n'est plus prononcé deux fois via SSH distant. `play-tts.sh` le préfixe au texte ; le récepteur ne reçoit plus de champ prétext séparé à préfixer à nouveau.

**Hôte SSH visible dans la TUI :** Les onglets Paramètres et Voix affichent maintenant l'alias d'hôte SSH distant configuré.

**Corrections de sécurité** et 24 nouveaux tests BATS couvrant le voyage aller-retour complet émetteur → récepteur.

## v5.7.5 — Contraste des Boutons TUI + Corrections de Routage BMAD

## v5.7.0 — Support BMAD v6.6 + Redémarrage Automatique du Watcher Windows

**BMAD v6.6.0 :** AgentVibes détecte maintenant la nouvelle structure d'agents `.claude/skills/*/agents/`, gère correctement BMAD installé globalement dans `~/_bmad`, et ignore gracieusement les agents v6.6+ en Markdown simple lors de l'injection TTS au lieu d'erreur. L'onglet BMAD affiche maintenant la détection correctement pour les installations globales.

**Watcher Windows :** `tts-watcher.ps1` est maintenant un fichier autonome dans `~/.agentvibes/tts-watcher.ps1`. Exécuter `npx agentvibes update` copie maintenant le dernier watcher **et** le redémarre automatiquement — le fichier et le processus sont mis à jour en une seule étape, sans redémarrage manuel.

**Fournisseur Windows :** `play-tts.ps1` respecte maintenant le `ProviderOverride` de la configuration du serveur Linux lors de la réception d'audio distant.

## v5.6.9 — Réverbération et Musique de Fond Silencieuses dans les Installations NPX

**Utilisateurs WSL :** AgentVibes jouait `en_US-lessac-medium` quelle que soit votre voix configurée. Corrigé — Piper est maintenant trouvé dans les shells non interactifs en ajoutant explicitement `~/.local/bin` au `PATH` avant la vérification du binaire.

**Routage par projet :** Le hook de démarrage de session intègre maintenant `--project-dir` dans chaque commande TTS injectée, de sorte que votre voix et votre musique configurées jouent correctement dans les appels à l'outil Bash même quand `CLAUDE_PROJECT_DIR` n'est pas dans l'environnement.

`play-tts-piper.sh` et `play-tts-piper.ps1` sont maintenant inclus dans le déploiement des hooks critiques d'`agentvibes install` — les versions mises à jour se propagent automatiquement.

## v5.6.7 — Aperçu Windows Corrigé

Le bouton Aperçu dans la configuration audio LLM fonctionne désormais correctement sur Windows.

## 🌟 NOUVEAU DANS v5.6.6 — Le Bouton Aperçu Fonctionne dans WSL + Suite de Tests Windows Complète

**Le bouton Aperçu dans la configuration audio LLM fonctionne désormais correctement dans WSL.** Lors de la configuration d'une voix, d'une réverbération et d'une piste de fond pour chaque LLM, cliquer sur Aperçu joue maintenant votre configuration audio complète — voix, musique et effets — exactement comme elle sonnera pendant une session réelle. Auparavant, la musique de fond était silencieusement abandonnée dans les configurations `npm link` et d'installation globale.

Une **suite de tests Windows complète** a été ajoutée à CI, s'exécutant aux côtés de la suite BATS Linux existante. Les chemins audio spécifiques à Windows sont désormais vérifiés à chaque push — les régressions ne peuvent plus passer silencieusement.

## v5.6.4 — Correction Critique de Sécurité de la Désinstallation

`uninstall --global` supprimait l'intégralité de votre répertoire `~/.claude/` — paramètres, CLAUDE.md, skills, configurations MCP, tout. Corrigé : AgentVibes effectue désormais une suppression chirurgicale, en ne touchant que les fichiers qu'il a lui-même créés. Un test de régression dans CI impose cela désormais — si le problème réapparaît un jour, le build échoue avant la publication.

## v5.6.3 — Hermes + Configuration distante simplifiée

AgentVibes parle désormais pour **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** — l'assistant IA auto-hébergé et auto-améliorant. Deux skills prêtes pour la production sont incluses dans `docs/hermes/skills/` :

- **`hermes-agentvibes-hook`** — Vocalise automatiquement chaque réponse Hermes via AgentVibes TTS. Se déclenche sur `agent:end`, supprime le markdown, limite le débit et intègre une protection SSH complète contre le MITM
- **`agentvibes-target`** — Apprend à Hermes à envoyer n'importe quel texte vers vos haut-parleurs à la demande, avec support Windows et Android

Aussi dans cette version : corrections de compatibilité PS5.1 pour `play-tts.ps1`, réparations modal/raccourcis clavier, et l'onglet BMAD affiche désormais tous les agents.

## v5.5 — Routage Audio par LLM

Donnez à **chaque LLM sa propre voix, son pré-texte et sa musique** — Claude Code, Copilot et Codex peuvent sonner différemment sans toucher aux paramètres globaux.

- Ajoutez des lignes `llm:<nom>|...|voice|pretext|engine` dans `audio-effects.cfg`
- Le serveur MCP détecte automatiquement quel LLM appelle et passe `--llm <key>`
- Configurez via **Setup → Default → Configure** dans le TUI

Correction également : crash de l'installateur Windows (`spinner.info is not a function`) lors d'une **réinstallation** avec une ancienne installation globale d'AgentVibes.

---

**🎛️ NOUVEAU DANS v5.4.0 — Installateur TUI et Corrections :**
- 🖥️ **Installateur TUI** - Interface terminal interactive : parcourez les voix, configurez les fournisseurs, activez le mode fête BMAD
- 🔧 **Correction du Spinner** - Résolution du crash `spinner.info is not a function` sur WSL/Linux
- 🐛 **Correction de la Dépendance Circulaire** - Suppression de la dépendance auto-référentielle `agentvibes@^3.5.9` qui cassait silencieusement les installations
- 🎵 **Correction du Volume de Musique de Fond** - Restauration du fallback `bg_volume="0.20"` dans `audio-processor.sh`
- 📂 **Correction de PROJECT_ROOT** - `play-tts.sh` résout maintenant correctement la racine du projet pour la configuration par projet

## 🎯 NOUVEAU DANS v5.3.0 — Prenez le Contrôle des Voix à Distance

- **Personnalisez chaque annonce distante individuellement** — passez `--voice`, `--pretext`, `--music`, `--volume`, `--effects`, `--speed`, `--provider` en ligne de commande pour ce seul message. Plus besoin d'éditer les fichiers de config et de les remettre ensuite.
- **Sautez la phrase d'intro à la demande** — `--pretext ""` supprime le pré-texte pour un seul message.
- **Les messages longs et les caractères spéciaux fonctionnent correctement sous Windows** — le texte contenant des guillemets, apostrophes, emojis ou du contenu multi-lignes n'est plus tronqué en chemin vers le moteur vocal.
- **La lecture vocale fonctionne sur les serveurs Windows sans moniteur** — un assistant en arrière-plan tourne dans votre session utilisateur et récupère les annonces depuis une file d'attente, donc l'audio joue même en SSH sans interface graphique.
- **La prévisualisation vocale sur serveurs distants est routée vers le bon périphérique** — la prévisualisation de la TUI ne retombe plus sur l'audio local sur les machines sans haut-parleurs.
- **Plus de doubles phrases d'intro** quand l'expéditeur et le récepteur ont tous deux un pré-texte configuré.
- **55 nouveaux tests** pour l'attribution des voix en mode fête BMAD et l'isolation des agents.

## 🎯 v5.2.1 — Identité Multi-LLM & Polish d'Installation

- **Copilot obtient sa propre voix + pré-texte + musique** — "Copilot here" au rythme d'une bossa nova, totalement distinct de Claude Code et Codex.
- **Configs MCP par outil avec identité explicite** — `.vscode/mcp.json`, `.codex/config.toml`, `~/.copilot/mcp-config.json` chacun définit son propre `AGENTVIBES_LLM`.
- **L'outil MCP `get_config` retourne le LLM détecté** — les assistants peuvent confirmer leur routage et répondre avec la bonne voix.
- **Navigation Setup : Installer → Installer → Installer → Configurer → Configurer → Configurer** — le flux clavier parcourt les trois Configurer avant d'atterrir sur Par Défaut.
- **Musique de fond par défaut de Claude Code** définie sur Chillwave.
- **Affinements de compatibilité Linux** — CRLF, permissions, override du provider de transport.

## 🎯 NOUVEAU DANS v5.2.0 — Prévisualisation de Voix à Distance + Mode Homme des Cavernes + Évaluations de Voix

- **Mode de verbosité homme des cavernes** — Fragments TTS ultra-concis. Configurez via `/agent-vibes:verbosity caveman`.
- **👍/👎 évaluations de voix** — Appuyez sur `+` pour pouce haut, `-` pour pouce bas dans toute liste de voix. Remplace les favoris étoilés.
- **Prévisualisation de voix à distance** — La prévisualisation de voix dans la TUI fonctionne sur les serveurs sans interface graphique via le récepteur SSH. Aucun audio local requis.
- **Routage du récepteur SSH** — `ssh-remote` et `agentvibes-receiver` sont désormais des fournisseurs de première classe.
- **Validation des voix renforcée** — Format multi-locuteur `::`, base64 multiplateforme, pas d'injection de barre oblique inverse.

---

## 🛡️ v5.1.4 — Refonte de Résilience TTS + Fournisseur LLM par Défaut

- **Fournisseur LLM par Défaut** — Nouvelle entrée de repli en bas de Configuration → Fournisseurs. Configuration uniquement ; ouvre le modal Configurer standard.
- **Musique de fond par LLM s activate automatiquement** — Définir une piste de fond sur le modal Configurer par LLM la joue maintenant réellement.
- **Support Copilot CLI** — `installCopilotMcp` écrit désormais à la fois `.vscode/mcp.json` (Copilot Chat) ET `~/.copilot/mcp-config.json` (Copilot CLI).
- **Architecture de routage par client** — `.mcp.json` ne définit plus `AGENTVIBES_LLM`. Claude Code est auto-détecté via la variable `CLAUDECODE=1`.
- **Mutex TTS auto-réparateur** — Les processus `play-tts.ps1` bloqués sont tués automatiquement par l appelant suivant. Watchdog de 25 secondes garantit la progression.
- **Plus de rejeu d audio périmé** — `play-tts.ps1` capture le nom de fichier exact depuis le stdout du fournisseur.
- **La voix par LLM l emporte sur `VoiceOverride` explicite** — Corrigé.
- **`lessac-medium` → `lessac-high`** par défaut pour codex.
- **Renommage des fichiers scratch + encodage ASCII uniquement**.
- **La confirmation Configuration → Installer** avance maintenant le focus vers la ligne de fournisseur suivante.

---

## 🎙️ NOUVEAU DANS v5.1.0 — Refonte du Sélecteur de Voix + Sauvegarde Automatique de l'Agent

- **Sauvegarde automatique dans le modal agent** — Les changements de voix/personnalité/musique/réverbération/pretexte sont enregistrés automatiquement pendant que vous les modifiez. Un bref message « ✓ Enregistré ! » confirme chaque changement.
- **Noms uniques pour LibriTTS** — Les 904 locuteurs obtiennent des noms de famille déterministes : **Anna Bell**, **Anna Carter**, …, **Anna Quinn**. Fini les doublons « Anna-2 », « Anna-3 ».
- **Symboles de genre rose ♀ / bleu ♂** — Indicateurs de genre en couleur dans l'onglet Voix et dans tous les modaux du sélecteur de voix.
- **Saut rapide par première lettre** — Appuyez sur `a`–`z` dans n'importe quel sélecteur de voix pour sauter à cette lettre. `q`, `j`, `k`, `g`, `h`, `l` sont réservés à la navigation/annulation.
- **PgUp / PgDn / Home / End** dans les sélecteurs de voix
- **3 nouvelles pistes de musique de fond** — Late Night Hip Hop Groove, Drifting Down the Hall, Midnight Charleston Stomp
- **Barre de recherche supprimée des sélecteurs de voix** — remplacée par le saut par première lettre (plus rapide, sans problèmes de focus)
- **Correction de corruption dans l'onglet Voix** — les lignes non installées ne perdent plus leur colonne Fournisseur lors de la navigation
- **Artefacts de clignotement supprimés dans les onglets Musique + Voix**

---

## 🚀 v5.0.0 — Support Multi-Fournisseur : Claude Code + Copilot + Codex

- **GitHub Copilot + OpenAI Codex dans VS Code** — AgentVibes prend désormais en charge les trois principaux assistants de codage IA. Installez et configurez chacun depuis le TUI.
- **Un seul onglet Configuration** — assistant en 4 étapes (Langue → Dépendances → Moteur TTS → Fournisseurs) remplace les anciens onglets installateur + LLM. Les utilisateurs existants passent directement aux Fournisseurs.
- **Configuration audio par fournisseur** — chaque LLM a sa propre Voix, Moteur TTS, Réverbération, Musique et Pretexte via le modal Configurer.
- **Paramètres repensés** — liste plate et épurée : Langue, Moteur TTS, Voix, Verbosité, Destination Audio, Stockage de Configuration, Relancer l'Assistant.
- **Sélecteur de voix amélioré** — affichage en 3 colonnes, prévisualisation avec la barre espace, le défilement reste en place.

---

## 🎙️ v4.6.7 — Corrections TTS du Mode Fête

- **Les pretexts des agents sont maintenant prononcés en mode fête** — "John, Product Manager here" était silencieusement ignoré à cause d'un bug de synchronisation de pré-synthèse. Corrigé.
- **Plus d'astérisques prononcés** — le markdown est supprimé avant le TTS en mode fête
- **TTS de démarrage de session Windows corrigé** — le hook émet maintenant du JSON correct pour que le TTS s'active de manière fiable au démarrage de session
- **Le hook PreToolUse ne génère plus d'erreur** sur les commandes grep/regex

---

## 🧭 v4.6.6 — Navigation Naturelle dans le TUI

Le TUI des Paramètres fonctionne maintenant comme vous l'attendez. Bas se déplace de haut en bas à travers en-tête → sous-onglets → contenu → pied de page. Gauche/Droite change de sous-onglet et se déplace entre les boutons du pied de page. Haut depuis le contenu retourne au sous-onglet actif — pas toujours Voix. L'onglet Langue a une liste déroulante appropriée. Le Readme se rabat sur le README du paquet AgentVibes quand aucun local n'existe. Échap depuis l'installateur ne reste plus bloqué.

---

## 🌟 v4.5 — Version "Parlez Toutes les Langues"

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
