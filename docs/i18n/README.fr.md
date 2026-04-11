> 🌐 [English version](../../README.md)

**Auteur** : Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Version** : v5.1.4

---

## 🛡️ NOUVEAU DANS v5.1.4 — Refonte de Résilience TTS + Fournisseur LLM par Défaut

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
