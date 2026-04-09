> 🌐 [English version](../../README.md)

**Auteur** : Paul Preibisch ([@997Fire](https://x.com/997Fire)) | **Version** : v5.0.0

---

## 🚀 NOUVEAU DANS v5.0.0 — Support Multi-Fournisseur : Claude Code + Copilot + Codex

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
