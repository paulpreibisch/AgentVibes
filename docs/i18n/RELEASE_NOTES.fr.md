> 🌐 [English version](../../RELEASE_NOTES.md)

## 🎙️ v5.1.0 — Refonte du Sélecteur de Voix + Sauvegarde Automatique de l'Agent

**Date de sortie :** Avril 2026

### Nouvelles Fonctionnalités

- **Sauvegarde automatique dans le modal d'édition d'agent** — Les changements par agent de voix/personnalité/musique/réverbération/pretexte sont désormais enregistrés automatiquement pendant que vous les modifiez. Le bouton Enregistrer explicite a disparu ; un bref message « ✓ Enregistré ! » confirme chaque changement. Annuler et Réinitialiser aux Valeurs par Défaut fonctionnent toujours comme avant.

- **Noms uniques pour les locuteurs LibriTTS** — Les 904 locuteurs LibriTTS ne s'affichent plus comme « Anna », « Anna-2 », « Anna-3 », … « Anna-16 ». Chacun obtient un nom de famille déterministe d'un pool de 16 noms : **Anna Bell**, **Anna Carter**, **Anna Davis**, …, **Anna Quinn**. Les ID de voix sous-jacents ne changent pas, donc les configurations utilisateur existantes continuent de fonctionner.

- **Symboles de genre rose/bleu** — Les voix féminines affichent **♀** en rose (magenta), les voix masculines **♂** en bleu clair (bright-cyan), inconnu affiche `—`. La colonne `Gender` de l'en-tête est remplacée par `♀/♂` coloré (10 → 4 caractères de large), libérant de l'espace pour les noms longs. Appliqué à l'onglet Voix principal ET aux 3 modaux du sélecteur de voix (Configuration, Agents, Paramètres).

- **Saut rapide par première lettre dans les sélecteurs de voix** — Appuyez sur n'importe quelle lettre `a`–`z` pour sauter à la première voix commençant par cette lettre. Les touches réservées (`q`, `j`, `k`, `g`, `h`, `l`) sont bloquées pour conserver leur signification d'annulation / navigation vi.

- **Navigation par page dans les sélecteurs de voix** — `PgUp`, `PgDn`, `Home`, `End` fonctionnent désormais dans tous les modaux du sélecteur de voix.

- **3 nouvelles pistes de musique de fond** — `Late Night Hip Hop Groove`, `Drifting Down the Hall` (ambiance années 90), et `Midnight Charleston Stomp` (swing). Le nombre de pistes passe de 15 à 18.

### Améliorations

- **Barre de recherche du sélecteur de voix supprimée** — Remplacée par le saut par première lettre. L'ancien champ de recherche avait des problèmes de focus qui avalaient les touches de navigation. Le saut est plus rapide pour le cas typique « trouver la voix X ».

- **Tri de la liste des pistes corrigé** — Les pistes avec préfixes emoji (par ex. `🎤 Late Night Hip Hop Groove`) sont maintenant triées selon la partie alphabétique du nom, pas le code de l'emoji. L'ordre est cohérent entre les versions de Node/ICU.

- **La touche favori est désormais `*` uniquement** — Suppression du raccourci `f` dupliqué pour marquer les favoris dans les sélecteurs de voix et l'onglet Voix principal. `f` est maintenant libre pour le saut par première lettre (par ex. sauter à Frank ou Felix). Le marqueur `*` reste la façon canonique de basculer les favoris.

### Corrections de Bugs

- **Les lignes non installées de l'onglet Voix ne se corrompent plus** — Sélectionner une voix non installée supprimait visuellement sa colonne Fournisseur en raison d'une regex qui matchait trop largement le wrapper `bright-black-fg` de la ligne. Remplacée par un ancrage de hint précis qui ne supprime que le texte exact du hint.

- **Artefacts de clignotement éliminés dans les onglets Musique + Voix** — Les curseurs `█` ne laissent plus de blocs résiduels lors d'un défilement rapide dans la liste. Les deux onglets utilisent maintenant un helper précis pour supprimer le clignotement au lieu du fragile slicer basé sur la position.

- **L'onglet Configuration n'échoue plus silencieusement** — `_renderScreen3` enveloppait tout le bloc d'écriture `setupCompleted` dans un seul `try/catch {}` vide. Les fichiers de configuration locaux corrompus sont maintenant sauvegardés vers `config.json.bak` et réécrits, avec les erreurs loguées dans stderr — fini le « bloqué à répéter la configuration » sans explication.

- **L'annulation `q` du sélecteur de voix fonctionne maintenant** — Le nouveau saut par première lettre avalait `q` (et d'autres touches de navigation vi). Liste de blocage des touches réservées ajoutée.

- **Tri insensible à la casse du sélecteur de pistes** — Les nouvelles pistes avec des noms en Title Case (`Late Night Hip Hop Groove.mp3`) ne sautent plus en haut de la liste au-dessus des pistes en minuscules `agent_vibes_*`.

### Impact Utilisateur

- Modifier la voix ou les paramètres d'un agent est maintenant plus rapide — plus besoin de penser à cliquer sur Enregistrer
- Le sélecteur de voix est nettement moins encombré avec les 904 locuteurs LibriTTS ayant tous des noms uniques et amicaux
- Genre en un coup d'œil grâce aux symboles colorés
- Trois nouvelles pistes musicales pour la variété
- Artefacts de clignotement/défilement éliminés dans les onglets Voix et Musique

---

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
