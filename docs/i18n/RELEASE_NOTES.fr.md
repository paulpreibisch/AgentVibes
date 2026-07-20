> 🌐 [English version](../../RELEASE_NOTES.md)

## 🎧 v5.14.0 — Des installations qui marchent, des aperçus fiables

**Publié le :** 2026-07-19 · sur `latest` — `npm install agentvibes@latest`

Une grosse version de rattrapage. Si vous venez de la 5.13.1, celle-ci contient aussi tout ce que la 5.13.2 apportait — cette version avait été taguée mais n'est jamais arrivée sur npm.

### 📥 L'installation sur Mac et Linux fonctionne enfin

C'est LE gros morceau. Sur une installation Mac ou Linux toute neuve, l'installation de Piper et le téléchargement des voix **ne se lançaient tout simplement jamais**. Vous voyiez « Installing Piper TTS… » puis « installation failed or was cancelled » — un échec annoncé pour une étape qui n'avait même pas commencé.

C'était cassé depuis 51 versions. Ça n'a jamais fonctionné que sur la seule configuration sur laquelle nous développons, ce qui explique précisément pourquoi personne ne l'avait remarqué aussi longtemps. C'est corrigé, et désormais testé de la façon dont vous installez réellement le produit.

Quelques problèmes d'installation connexes sont partis avec : certains scripts étaient enregistrés dans un format Windows que Mac et Linux ne savent pas lire, et s'arrêtaient donc avant de faire quoi que ce soit. Ils sont maintenant dans le bon format.

### 🔧 Vos fichiers personnalisés restent les vôtres

Si vous aviez modifié l'un des scripts de hook installés par AgentVibes, une mise à jour pouvait écraser votre travail. Sur Windows, c'était pire encore : le programme de mise à jour ne connaissait que 8 des 25 scripts, la plupart étaient donc mal traités.

Désormais, tous les scripts sont pris en compte, et tout ce que vous avez modifié est copié dans une sauvegarde horodatée avant d'être touché. Si vous aviez modifié `play-tts.ps1`, vous retrouveriez votre version enregistrée juste à côté sous la forme :

```
play-tts.ps1.user.bak.20260719-143052
```

L'horodatage correspond à la date et à l'heure de cette mise à jour : chaque mise à jour conserve donc sa propre sauvegarde — vous pouvez toujours revenir en arrière, et pas seulement jusqu'à la première.

### 🎵 Le bouton Aperçu joue l'ensemble du mixage

Le bouton Aperçu des écrans de configuration est censé tout jouer ensemble — la **voix** que vous avez choisie, la **réverbération et les effets audio**, et votre **musique de fond** — pour que vous entendiez exactement ce à quoi votre agent va ressembler. Deux choses cassaient ça.

Lors de la configuration d'un agent Hermes, l'Aperçu jouait la voix et les effets mais laissait complètement tomber la musique. Et sous Windows, si **ffmpeg** (l'outil qui mélange la musique à la parole) n'était pas accessible, la musique disparaissait en silence — la voix se jouait parfaitement, donc rien ne semblait anormal.

Les deux sont corrigés. Et quand ffmpeg manque vraiment, vous recevez maintenant un message clair qui le dit, au lieu d'un silence à déchiffrer.

### 🎙️ Des aperçus dans la bonne voix, avec le bon nom

L'aperçu d'une voix utilise désormais le moteur propre à cette voix plutôt que celui défini globalement, et vous indique quel moteur vous êtes en train d'entendre. Les voix système de Windows et de Mac fonctionnent aussi via les aperçus distants. La liste des voix Windows n'affiche plus que les voix réellement sélectionnables — fini d'en choisir une qui ne parle jamais.

### 🟢 Local ou distant, en un coup d'œil

Les réglages colorent maintenant votre destination audio : **Local** en vert, **Remote** en rouge. Bien pratique quand vous vous demandez pourquoi la pièce est silencieuse — la réponse, en général, c'est que le son part sur une autre machine.

### 🪟 Windows envoyant l'audio ailleurs

Envoyer l'audio d'une machine Windows vers un autre ordinateur pouvait déformer les chemins de fichiers en route, ce qui faisait disparaître votre musique de fond sans rien dire. Corrigé.

### 📦 Un téléchargement plus propre

Le paquet n'embarque plus de fichiers dont il n'a jamais eu besoin, y compris des réglages locaux résiduels qui n'auraient jamais dû être publiés. Tout ce que l'application vous demande de lancer est désormais réellement inclus.

### 🧰 Sous le capot

La suite de tests passe maintenant sans accroc sur Windows, Mac et Linux à partir d'un dépôt tout neuf — elle échouait auparavant d'une manière qui masquait de vrais bugs, comme celui de l'installation ci-dessus. De nouveaux tests verrouillent les corrections apportées ici pour qu'elles ne puissent pas revenir en douce. Nous avons aussi corrigé un cas où un processus en arrière-plan pouvait rester bloqué au lieu de s'arrêter.

---

## 🔧 v5.13.2 — Des installations plus propres, une mise en route plus fluide

**Publié le :** 2026-07-17 · sur `latest` — `npm install agentvibes@latest`

### 🎛️ Vous démarrez avec les réglages par défaut, prêts à faire les vôtres

Les nouvelles installations démarrent désormais propres, avec les réglages par défaut intégrés pour la voix, la musique de fond et la personnalité — c'est donc votre configuration dès la toute première utilisation.

### 🐧 L'installation sur Mac et Linux fonctionne correctement

Certains des scripts qui configurent tout étaient enregistrés dans un format Windows que Mac et Linux ne peuvent pas lire, si bien qu'ils s'arrêtaient avant de faire quoi que ce soit. Ils sont maintenant dans le bon format. Installer Piper et télécharger des voix fonctionne à nouveau sur une machine Mac ou Linux toute neuve.

### 🔊 Votre choix de voix reste en place

Le fichier de réglages qui se souvient de quelle voix va avec quel moteur pouvait être mal lu, si bien que votre choix de moteur était silencieusement ignoré. Corrigé — ce que vous choisissez, c'est ce que vous obtenez.

### 📦 Un téléchargement plus léger et plus ordonné

Le paquet ne transporte plus de fichiers dont il n'a jamais eu besoin. Tout ce que l'application vous dit d'exécuter est maintenant vraiment inclus.

---

## 🔧 v5.13.1 — Les mises à jour Windows qui mettent vraiment à jour

**Publié le :** 2026-07-16 · sur `latest` — `npm install agentvibes@latest`

### 🪟 Vos scripts Windows se mettent maintenant vraiment à jour

Sous Windows, les petits scripts qui font parler vos agents vivent dans votre dossier `.claude/hooks`. La mise à jour disait qu'elle les rafraîchissait — mais sous Windows, elle ne le faisait pas vraiment, en silence, si bien qu'ils pouvaient rester bloqués sur la version installée au tout début pendant des mois.

Maintenant, ils se mettent à jour pour de vrai. Lancez `npx agentvibes update` et vous récupérerez chaque correctif que vous aviez manqué. Tout ce que vous aviez personnalisé vous-même reste protégé juste à côté, dans un fichier `.user.bak`, exactement comme avant.

Si vous êtes sur macOS ou Linux, rien ne change — les mises à jour fonctionnaient déjà très bien pour vous.

### 🔒 Un petit réglage de sécurité, en coulisses

Nous avons mis à jour l'un des composants qu'AgentVibes utilise pour lire les fichiers de configuration. Un fichier de configuration spécialement conçu aurait pu le faire se bloquer complètement. Rien n'a jamais pu être volé ou espionné — mais maintenant, il ne peut plus rester coincé non plus. Rien à faire de votre côté ; c'est déjà en place.

---

## 🎉 v5.13.0 — Vos Voix Partout, avec un Signal Sonore

**Publié le :** 2026-07-16 · sur `latest` — `npm install agentvibes`

Quoi de neuf :

### 🖥️ Utilisez les voix intégrées de votre ordinateur, depuis n'importe où
Vos agents tournent sur une machine et vous écoutez sur une autre ? Vous pouvez désormais choisir les voix intégrées de **Windows** (David, Zira, Mark) ou de **Mac**, et les entendre là où vous êtes assis. AgentVibes vous montre chaque voix et marque clairement celles que votre appareil d'écoute peut jouer.

### 🗂️ Toutes vos voix dans une seule liste bien rangée
Piper, Kokoro, ElevenLabs, Windows, Mac, Soprano — chaque voix provient désormais d'une seule liste, de sorte que ce que vous voyez est toujours ce que vous pouvez utiliser.

### 🔔 Un signal sonore avant que le son ne se joue
Juste avant qu'une réplique vocale ou un aperçu de musique ne démarre, vous entendrez un court carillon — vous savez ainsi que l'audio arrive, même s'il faut patienter un instant.

### 🎵 Les aperçus de musique suivent votre son
Prévisualisez une piste et elle se joue là où votre audio est configuré pour aller — y compris sur une autre machine.

### 🆔 Des agents qui se présentent
Activez les auto-présentations et chaque agent annonce qui il est au démarrage — bien pratique quand toute une équipe parle.

### 🛟 Vos propres modifications sont protégées lors d'une mise à jour
Vous avez modifié l'un des fichiers d'AgentVibes dans votre dossier `.claude/hooks` ? À partir de cette version, une mise à jour ne jette plus jamais votre travail à la poubelle. Si nous devons mettre à jour un fichier que vous aviez modifié, nous plaçons votre copie juste à côté avec `.user.bak` à la fin — par exemple `play-tts.sh.user.bak`.

**Ce fichier est créé par AgentVibes — rien n'est cassé et personne d'autre ne l'a déposé là.** C'est simplement votre ancienne version, conservée pour que vous puissiez y jeter un œil ou recopier vos modifications dans le nouveau fichier. Supprimez-le dès que vous n'en avez plus besoin.

Si vous aviez personnalisé des fichiers dans une version plus ancienne, cela vaut la peine de jeter un coup d'œil rapide dans `.claude/hooks` pour repérer ce que vous voudriez restaurer.

### ✨ Plus de voix, une expérience plus fluide
- Voix **ElevenLabs** entièrement prises en charge
- Davantage de voix **Kokoro**, fonctionnant parfaitement sur Windows
- Une installation plus rapide et plus fiable sur Windows
- **3 261 tests automatisés réussis** — stable et fiable

---

## 🎉 v5.12.0 — La Refonte de la Semaine Fable (Stable)

**Publié le :** 2026-07-05 · désormais sur `latest` — `npm install agentvibes`

Cette version transforme l'alpha de la « Semaine Fable » en une version stable. Pendant une semaine d'accès anticipé au nouveau modèle **Fable** d'Anthropic, nous l'avons pointé sur l'ensemble du code d'AgentVibes et avons reconstruit le cœur du système comme il se doit.

### Un cœur commun, plus solide

Chaque fois qu'AgentVibes parle, il prend beaucoup de décisions — quelle voix, quel moteur, faut-il jouer ici ou envoyer l'audio vers une autre machine, la musique de fond, le volume, la coupure du son. Cette logique avait été copiée dans plusieurs scripts distincts (Mac/Linux, Windows, distant, et le serveur de voix), et les copies ont lentement **divergé** — un correctif appliqué dans l'un était oublié dans les autres, ce qui explique pourquoi certains défauts revenaient sans cesse.

Nous avons tout remplacé par **un seul cœur commun** que chaque partie d'AgentVibes suit désormais — un seul endroit à corriger, un seul endroit auquel se fier. Ce que vous remarquerez :

- **Les voix Kokoro qui restaient muettes sur Linux fonctionnent maintenant partout.**
- **Vos choix de voix sont conservés** — les paramètres ne sont plus discrètement écrasés.
- **Le volume, la coupure du son et la lecture à distance se comportent de la même façon** sur Mac, Linux et Windows.
- **Sûr par défaut** — si le nouveau cœur n'est pas disponible sur votre machine, AgentVibes revient à l'ancien comportement, de sorte qu'il ne cesse jamais simplement de parler.

### Les aperçus se jouent désormais au bon endroit

Prévisualiser une voix ou une piste se jouait auparavant sur la machine devant laquelle vous étiez assis — ce qui restait muet si vous aviez configuré AgentVibes pour envoyer son audio ailleurs. Désormais :

- **Si vous avez configuré le mode distant SSH, les aperçus se jouent sur votre récepteur ; sinon ils se jouent localement, comme avant.**
- Cela couvre les **aperçus de voix** (Piper et Kokoro) depuis les écrans Setup, Agent et Settings, ainsi que les **aperçus de musique/piste** — appuyez sur Espace pour lancer, à nouveau sur Espace pour arrêter.

### Un menu de voix plus simple

- Nous avons **supprimé l'onglet Voices redondant.** Il ne listait jamais que les voix Piper et semait la confusion, puisque le choix d'une voix pour n'importe quel fournisseur se trouve déjà dans **Setup**.

### Les fondations de la suite

- Le récepteur reçoit désormais aussi le **chemin complet du dossier de projet** d'où provient un message (un nouveau champ `projectPath`, en plus du nom de projet qu'il recevait déjà) — posant les fondations des améliorations à venir.

### Revu avant la livraison

Nous avons mené trois revues indépendantes sur les changements — sécurité, exactitude et régressions — et corrigé chaque problème réel avant la publication.

## 🎸 v5.8.0 — Soprano Fonctionne Maintenant + Sélecteur de Voix Corrigé pour Tous les Moteurs

**Publié le :** 2026-05-18

### 🐛 Soprano TTS Était Cassé — Maintenant Corrigé

Soprano (notre moteur TTS neuronal à 80M de paramètres, introduit dans la v5.6) échouait silencieusement sur Windows. Plusieurs problèmes combinés le cassaient de bout en bout :

- Le sélecteur de voix Windows affichait Soprano comme option mais le lançait avec le mauvais nom de binaire (`soprano-tts` au lieu de `soprano`)
- `play-tts-soprano.ps1` était appelé depuis Node.js avec un PATH tronqué, de sorte que les exécutables `soprano` et `soprano-webui` ne pouvaient pas être trouvés même s'ils étaient installés
- Le chemin du fichier wav était écrit dans le flux Information de PowerShell (`Write-Host`) au lieu de stdout, ce qui empêchait le processeur de reverb/musique de fond de le trouver
- Le Gradio WebUI ne démarrait jamais automatiquement — il fallait lancer `soprano-webui` manuellement avant chaque session

Tous ces problèmes sont maintenant corrigés. AgentVibes détecte automatiquement si le serveur WebUI de Soprano tourne sur le port 7860, le démarre sinon, et attend jusqu'à ce qu'il soit prêt (jusqu'à 90 secondes). Trois modes fonctionnent par ordre de priorité : WebUI (le plus rapide — le modèle reste chargé) → API compatible OpenAI → CLI `soprano` direct.

### 🐛 Le Sélecteur de Voix Ignorait Windows SAPI et macOS Say

Lors de l'ouverture du sélecteur de voix pour un LLM configuré pour utiliser **Windows SAPI** ou **macOS Say**, le sélecteur affichait la liste complète des voix Piper au lieu de la voix intégrée du moteur. C'était déroutant — sélectionner une voix Piper en utilisant SAPI ou macOS Say n'avait aucun effet, et la prévisualisation avec la barre espace se faisait via le mauvais moteur.

Le sélecteur s'adapte maintenant au moteur sélectionné :

- **Windows SAPI / macOS Say / Soprano :** affiche exactement un élément (la voix intégrée du moteur), le sélectionne automatiquement, et la prévisualisation avec barre espace parle via le bon binaire du moteur
- **Piper :** affiche le catalogue complet des voix installées comme avant

De plus, la sauvegarde de la configuration n'écrase plus silencieusement le champ `ttsEngine` avec `piper` lorsqu'un moteur natif est utilisé.

### 🔒 Fiabilité de Soprano (9 Corrections de Revue Adversariale)

- **Correction de plantage :** `destroy()` sur le socket pouvait émettre un événement `error` tardif sans écouteur, faisant planter le processus Node.js — un gestionnaire absorbeur est maintenant en place
- **Annulation de boucle :** la boucle de sondage WebUI de 90 secondes s'arrête maintenant immédiatement quand la fenêtre modale ou le sélecteur de voix est fermé (via AbortController)
- **Aucun rejet non géré :** gestionnaires `.catch()` ajoutés à tous les appels async de vérification WebUI
- **Aucun processus en double :** un délai de 10 secondes empêche de lancer deux instances de `soprano-webui` lors d'un clic rapide sur Aperçu
- **Meilleur retour d'erreur :** les échecs de spawn et les codes de sortie non nuls affichent maintenant un label d'erreur visible dans le sélecteur de voix
- **PATH préservé :** la mise à jour du PATH dans PowerShell ajoute maintenant les entrées du registre au lieu de remplacer tout le PATH, pour que les shims nvm, conda et pyenv continuent de fonctionner

---

## 🎭 v5.7.7 — Restauration des Voix en Mode Party + Améliorations

**Publié le :** 2026-05-17

### 🐛 Agents en Mode Party Silencieux (Pas de TTS par Agent)

Les agents du mode party affichaient les réponses en texte mais ne les lisaient pas avec leurs voix uniques. Deux causes profondes :

**Désambiguïsation du skill :** `/party-mode` correspondait à la commande BMAD `_bmad/core/workflows/party-mode` (qui tente de charger un chemin inexistant dans ce projet) au lieu du skill AgentVibes. Une commande `/party-mode` locale au projet redirige maintenant vers le bon skill.

**Étape TTS obligatoire :** L'étape d'appel `bmad-speak.js` de l'orchestrateur était mal spécifiée et parfois ignorée. L'étape 4 dans le skill du mode party BMAD est maintenant clairement marquée OBLIGATOIRE, avec une documentation explicite de ce que `bmad-speak.js` applique par agent : voix, pretext, reverb, personnalité et musique de fond — tout chargé automatiquement depuis `~/.agentvibes/bmad-voice-map.json`.

### 🔍 Journalisation de Diagnostic pour le Mode Party

`bmad-party-speak.sh` (hook PostToolUse) écrit maintenant des entrées de diagnostic structurées dans `/tmp/agentvibes-party-debug.log` — `fired`, `fingerprint HIT/MISS`, `invoking` et erreurs — pour diagnostiquer les problèmes de voix sans deviner.

### 🎵 Nouvelle Piste Intégrée : CelestialVelvet

Une nouvelle piste de musique ambiante **CelestialVelvet** (🌌) a été ajoutée au catalogue intégré. Disponible immédiatement dans le sélecteur de musique TUI et la carte de voix BMAD — aucun téléchargement requis.

### 🐛 TUI : Texte Gris sur les Lignes Sélectionnées Corrigé

Le texte blanc s'affiche maintenant correctement sur les lignes sélectionnées dans les onglets Voix et Agents. Auparavant, le premier plan `bright-black` combiné au fond vert produisait du texte gris illisible dans de nombreux terminaux.

### 🐛 SSH Distant : Erreur "wait: pid is not a child of this shell"

`play-tts-ssh-remote.sh` émettait `wait: pid X is not a child of this shell` dans certains shells. Corrigé en lançant `ssh` directement dans le sous-shell en arrière-plan pour que `$?` capture le code de sortie sans appel `wait` inter-shell.

---

## 🔧 v5.7.6 — Intégrité du Payload SSH Distant + Réécriture du Récepteur

**Publié le :** 2026-05-16

### 🐛 SSH Distant Jouant la Mauvaise Musique et Voix

Lors de l'utilisation de la fonctionnalité TTS SSH distant, la mauvaise piste musicale et voix du projet étaient appliquées. Cause racine : `CLAUDE_PROJECT_DIR` n'était pas transmis à l'émetteur, le faisant revenir à la configuration globale au lieu du `audio-effects.cfg` du projet actif.

### 🐛 Récepteur Bash Incompatible avec le Format de Payload JSON

Le récepteur bash Linux/Termux (`agentvibes-receiver.sh`) utilisait un format d'arguments positionnels d'avant la v5.5 et ne pouvait pas du tout décoder le payload base64 JSON actuel. Le récepteur a été entièrement réécrit pour correspondre à la logique du récepteur PowerShell : décode le base64, analyse le JSON, applique voix/musique/effets/volume et valide tous les champs.

### 🐛 Introduction de Personnalité Entendue Deux Fois à Distance

Le prétext de personnalité (ex., "Bcs latin dance here") était prononcé deux fois lors de l'utilisation du TTS SSH distant. Cause racine : `play-tts.sh` préfixe déjà le prétext au texte de la parole avant d'appeler l'émetteur ; l'émetteur le plaçait également dans le champ JSON `pretext`, causant le récepteur à le préfixer à nouveau. Le champ JSON `pretext` est maintenant intentionnellement laissé vide — la personnalité est transmise uniquement via le champ `text`.

### 🆕 Alias d'Hôte SSH Visible dans l'Onglet Paramètres

L'alias d'hôte SSH distant configuré est maintenant affiché dans les onglets Paramètres et Voix afin que les utilisateurs puissent confirmer quelle machine distante cible le TTS sans ouvrir les fichiers de configuration.

### 🔒 Corrections de Sécurité

Améliorations de validation des entrées dans l'émetteur et le récepteur SSH distant.

### 🧪 24 Nouveaux Tests BATS

- 15 tests de payload SSH distant : vérifient la voix, la piste musicale, le volume, la réverbération/effets, le traitement du prétext, l'identifiant LLM, la précédence de la configuration du projet et la validité JSON
- 9 tests de voyage aller-retour de bout en bout : l'émetteur construit le payload → le récepteur décode et applique tous les champs simultanément, détectant les régressions aux deux extrémités

---

## 🖥️ v5.7.5 — Contraste des Boutons TUI + Corrections de Routage BMAD

**Date de sortie :** 2026-05-13

### 🐛 Focus des Boutons TUI : Texte Gris Éliminé sur Tous les Terminaux

Les boutons focalisés et sélectionnés dans la TUI affichaient du texte gris clair sur fond bleu clair dans de nombreux terminaux. Cause principale : `bold: true` combiné à une couleur de premier plan sombre active le « mode lumineux » du terminal, rendant la couleur en gris quel que soit le ton exact.

**Correctif :** Tous les états de focus des boutons utilisent désormais **texte blanc sur fond vert foncé (`#2e7d32`)** — le même motif à contraste élevé déjà utilisé par l'onglet Agents. Des gestionnaires explicites `focus`/`blur` ont été ajoutés aux boutons modaux de setup-tab pour empêcher `attachBtnBlink` d'interférer avec l'application des couleurs `style.focus` passif de blessed.

### 🐛 Indicateur ♪ du Sélecteur de Voix de l'Onglet BMAD Absent

L'indicateur ♪ de prévisualisation dans la liste des voix de l'onglet BMAD n'apparaissait pas lors de la prévisualisation. L'onglet Agents manquait des appels `_refreshVP()` que l'onglet Paramètres avait déjà. Un minuteur d'affichage minimum de 2 secondes maintient désormais l'indicateur visible lorsque SSH-remote se termine immédiatement (mode fire-and-forget).

### 🐛 Installation Non Interactive : Prétext Générique au Lieu du Nom du Projet

Exécuter `agentvibes install` en mode non interactif définissait toujours le prétext comme `"Claude Code here"` quel que soit le projet. L'installateur dérive désormais un prétext tenant compte du projet à partir de `path.basename(process.cwd())` avec majuscules (ex., `"MyProject here"`), avec une solution de repli sûre pour les chemins racine Docker.

### 🐛 Prétext Global Écrasant la Configuration par Projet

`seedAllLlmDefaultsSync` remplissait les lignes LLM au niveau du projet avec la chaîne de prétext global, faisant que le `"Claude Code here"` global écrasait les valeurs `tts-pretext.txt` par projet. Les lignes au niveau du projet sont désormais remplies avec des prétexts vides pour que le fichier par projet prenne la priorité.

### 🐛 Variante TERM `screen`/`tmux` Causait une Erreur de Capacité `plab_norm`

Lorsque `TERM` était défini sur une variante `screen-*` ou `tmux-*`, blessed lançait une erreur de capacité `plab_norm` au démarrage. L'application remplace désormais `TERM` par `xterm-256color` avant de créer l'écran blessed quand une telle variante est détectée.

### 🐛 Musique/Réverb par Agent BMAD N'atteignait Pas le Récepteur SSH

`play-tts.sh` ne transmettait pas `AGENT_PROFILE_FILE` au transport distant SSH, donc les remplacements de musique de fond et de réverb par agent dans l'onglet BMAD étaient ignorés silencieusement pour l'audio distant. Le chemin du fichier de profil est maintenant passé comme argument 4 à `play-tts-ssh-remote.sh`.

### 🐛 Compatibilité Node 18 : `import.meta.dirname` Remplacé

Un fichier de test utilisait `import.meta.dirname`, disponible uniquement dans Node 21+. Remplacé par le motif `fileURLToPath(import.meta.url)` pour que les tests s'exécutent correctement sur Node 18 et 20.

---

## 🎭 v5.7.0 — Support BMAD v6.6 + Redémarrage Automatique du Watcher Windows

**Date de sortie :** 2026-05-11

### 🆕 Compatibilité avec BMAD v6.6.0

BMAD v6.6 a restructuré l'emplacement des agents — ils sont passés de `_bmad/bmm/agents/` à `.claude/skills/*/agents/`. AgentVibes détecte et analyse désormais ces nouveaux chemins correctement.

**L'injection TTS** ignore gracieusement les agents v6.6+ (qui utilisent du Markdown simple sans sections d'activation XML/YAML) au lieu de générer des erreurs. Le résumé d'installation indique maintenant clairement combien d'agents ont été ignorés vs. modifiés.

**La détection de l'onglet BMAD** trouve désormais BMAD installé globalement dans `~/_bmad` (installation dans le répertoire home) en plus des installations locales au projet. Auparavant, l'onglet BMAD affichait "Non détecté" même lorsque BMAD était installé globalement.

**Sécurité :** La validation des chemins de l'installateur autorise désormais correctement les chemins BMAD sous le répertoire home de l'utilisateur, corrigeant une fausse alerte "Chemin BMAD invalide" pour les installations globales.

### 🆕 Watcher TTS Windows — Fichier Autonome + Redémarrage Automatique

`tts-watcher.ps1` est maintenant extrait en tant que fichier autonome dans `~/.agentvibes/tts-watcher.ps1`. Exécuter `npx agentvibes update` copie désormais le dernier watcher **et** le redémarre automatiquement — le fichier et le processus sont mis à jour en une seule étape, sans redémarrage manuel.

### 🐛 Remplacement de Fournisseur Windows Respecté sur le Portable

`play-tts.ps1` lit maintenant le paramètre `ProviderOverride` depuis la configuration côté Linux lors de la réception audio via SSH. Auparavant, le portable utilisait toujours son fournisseur configuré localement même si le serveur en spécifiait un différent.

### 🐛 Commande Sample Ajoutée au Gestionnaire de Voix

`voice-manager.sh sample` n'avait pas de gestionnaire — l'appeler tombait silencieusement dans le chemin d'utilisation/sortie. Corrigé.

### 🐛 Le Routage SSH de Prévisualisation Détecte le Bon Endpoint

`provider-manager.sh` inclut maintenant `detect_routing_llm()` qui vérifie `AGENTVIBES_LLM_KEY` puis `transport-config.json` pour la première entrée `mode=remote`, afin que l'audio de prévisualisation atteigne le bon hôte SSH.

---

## 🔇 v5.6.9 — Réverbération et Musique de Fond Silencieuses dans les Installations NPX

**Date de sortie :** 2026-05-09

### 🐛 Réverbération et Musique de Fond Silencieusement Cassées pour Tous les Utilisateurs NPX

Lors de l'installation d'AgentVibes via `npx`, les fichiers de hook sont extraits du paquet avec des permissions 644 — sans bit d'exécution. `play-tts-piper.sh` appelait `audio-processor.sh` directement, ce qui se termine immédiatement avec le code 126 (Permission refusée) sur un fichier non exécutable. Tous les utilisateurs installés via `npx` obtenaient un TTS voix uniquement — sans réverbération, sans musique de fond, silencieusement.

**Correction 1 :** `play-tts-piper.sh` appelle désormais `audio-processor.sh` via `bash "$SCRIPT_DIR/audio-processor.sh"`, contournant la vérification du bit d'exécution.
**Correction 2 :** `install-deps.js` (postinstall) exécute maintenant `ensureHookPermissions()` pour faire `chmod 755` sur tous les fichiers `.sh` après npm install.

### 🐛 L'Aperçu du Navigateur de Voix Ignorait la Réverbération et la Musique de Fond

Le bouton **Aperçu** dans le Navigateur de Voix lisait la sortie brute de piper sans réverbération ni musique de fond, contournant entièrement `audio-processor.sh`.

**Correction :** L'audio de prévisualisation passe maintenant par le même pipeline `audio-processor.sh` que le vrai TTS.

### 🐛 Le MCP `text_to_speech` Retournait un Chemin de Fichier Corrompu et des Informations de Voix Manquantes

L'outil extrayait le chemin du fichier audio incorrectement (incluant des caractères de taille/emoji en fin) et ne reportait jamais le nom de la voix dans sa réponse.

**Correction :** Les codes ANSI sont supprimés avant l'analyse, le chemin `.wav` est extrait proprement, et la ligne `🎤 Voix utilisée :` est incluse dans la réponse de l'outil.

### 🐛 Le Basculement de Musique de Fond dans la TUI N'Avait Pas d'Effet

Activer la musique de fond dans l'onglet **Musique** écrivait dans `config.json` mais pas dans `background-music-enabled.txt` (lu par les hooks bash). La musique restait désactivée après le basculement. Sauvegarder une piste implique désormais aussi l'activation de la musique.

---

## 🐧 v5.6.8 — Routage Voix WSL Corrigé + Fiabilité du Cycle de Vie des Sessions

**Sortie :** 2026-05-09

### 🐛 WSL : La Voix Configurée est Maintenant Jouée (Plus de Repli sur Lessac)

Dans les sessions WSL, AgentVibes jouait `en_US-lessac-medium` quelle que soit la voix configurée. Cause racine : `pipx` installe Piper dans `~/.local/bin/`, que les shells interactifs obtiennent via `.bashrc`/`.zshrc`, mais les appels à l'outil Bash de Claude Code s'exécutent de façon non interactive et ignorent le chargement du profil — `command -v piper` échouait, revenant à la voix par défaut.

**Correction :** `play-tts-piper.sh` ajoute maintenant `~/.local/bin` et le bin du venv Piper de pipx au début du `PATH` avant la vérification du binaire, de sorte que Piper est trouvé quel que soit le mode du shell.

### 🐛 Voix/Musique par Projet Perdues Quand `CLAUDE_PROJECT_DIR` N'est Pas dans l'Environnement Bash

Quand Claude Code exécute un appel à l'outil Bash, `CLAUDE_PROJECT_DIR` n'est pas transmis dans l'environnement. Les hooks TTS ne pouvaient pas trouver la configuration par projet et se rabattaient sur les valeurs par défaut globales — mauvaise voix, mauvaise musique, pas de pré-texte.

**Correction :** `session-start-tts.sh` (et `.ps1`) incorpore désormais le répertoire du projet dans la commande hook injectée sous la forme `--project-dir`. `play-tts.sh` lit cet indicateur avant toute recherche de configuration, ce qui rend le routage par projet fiable pour chaque appel à l'outil Bash.

### 🐛 `play-tts-piper.sh` et `play-tts-piper.ps1` Non Déployés par `agentvibes install`

Ces hooks étaient absents de `CRITICAL_HOOKS` / `CRITICAL_HOOKS_WINDOWS`, donc `agentvibes install` ne propageait jamais les versions mises à jour vers `~/.claude/hooks/`.

**Correction :** Les deux figurent maintenant dans la liste des hooks critiques et sont toujours déployés lors de l'installation/mise à jour.

### 🐛 Bugs d'Affichage du Nom de Voix

- `uniquifyVoiceName("Mary-1")` retournait `"Mary-1 Bell"` au lieu de `"Mary Bell"`.
- Les noms 16Speakers comme `Rose_Ibex` recevaient incorrectement un nom de famille ajouté (`"Rose Ibex Bell"`).
- La ligne `🎤 Voice used:` était absente de la sortie bash WSL.

Les trois ont été corrigés. Un nouveau fichier de tests (`test/unit/voice-names.test.js`, 16 tests) couvre ces cas.

---

## 🪟 v5.6.7 — Aperçu Windows Corrigé

**Sortie :** 2026-05-08

### 🐛 Le Bouton Aperçu Fonctionne Désormais Correctement sur Windows

Lors de la configuration audio par LLM sur Windows, cliquer sur **Aperçu** jouait la mauvaise voix (utilisant par défaut Windows SAPI) sans musique de fond ni réverbération. Désormais, il joue exactement la voix, la réverbération et la piste de fond que vous avez configurées.

### 🧪 Tests de Régression Ajoutés

Deux nouveaux tests CI Windows vérifient la recherche de configuration d'aperçu — ce bug ne peut donc plus régresser silencieusement dans une version future.

---

## 🔇→🎵 v5.6.6 — Prévisualisation de la Musique de Fond Corrigée pour npm link & Installations Globales

**Sortie :** 2026-05-08

### 🐛 Musique de Fond Silencieusement Absente de la Prévisualisation (npm link / Installation Globale)

Lorsque vous cliquiez sur **Prévisualiser** dans le modal de configuration LLM avec une piste de fond définie, vous n'entendiez que la voix — sans musique — sauf si AgentVibes était installé comme dépendance locale. Corrigé quelle que soit la façon dont vous installez AgentVibes.

**Cause racine :** Dans les configurations avec `npm link` et installation globale, un script de synchronisation utilisant `rsync --delete` effaçait périodiquement `background-music-enabled.txt` du répertoire du package car le fichier est gitignored. Après suppression, `audio-processor.sh` se rabattait sur une configuration globale avec la musique désactivée — silence.

**Correction :** `audio-processor.sh` vérifie désormais `CLAUDE_PROJECT_DIR/.claude/config/background-music-enabled.txt` **en premier**. La Prévisualisation de la TUI écrit également le drapeau dans le répertoire du projet (pas le répertoire du package), afin qu'il survive à toute synchronisation du répertoire du package.

### 🐛 Configuration par LLM Introuvable dans npm link / Installations Globales

Dans les mêmes configurations, `audio-processor.sh` ne trouvait pas la configuration audio par LLM (voix, réverbération, piste de fond) lorsque votre projet n'était pas le package AgentVibes lui-même.

**Correction :** Le script recherche désormais dans `CLAUDE_PROJECT_DIR/.claude/config/audio-effects.cfg` avant de se rabattre sur la configuration du package.

### 🐛 Piste de Fond "Introuvable" Après une Configuration Correcte

Lorsqu'une piste de fond était configurée mais qu'AgentVibes était installé globalement ou via `npm link`, le fichier de piste était introuvable — seul le répertoire du package était fouillé.

**Correction :** `audio-processor.sh` recherche également dans `CLAUDE_PROJECT_DIR/.claude/audio/tracks/` lorsque la piste n'est pas dans le répertoire du package.

### 🐛 Analyse des Lignes de Config LLM — Le Volume Absorbant les Colonnes Supplémentaires

Avec une ligne LLM complète à 7 colonnes (le format qu'écrit la TUI), le champ de volume absorbait toutes les colonnes finales. ffmpeg recevait une chaîne de volume malformée et se rabattait silencieusement sur l'audio voix uniquement.

**Correction :** L'analyseur capture désormais uniquement le champ de volume numérique, laissant les colonnes supplémentaires dans `_rest`.

### 🧪 Suite de Tests CI pour Windows

Les tests natifs Windows s'exécutent désormais en CI aux côtés de la suite BATS Linux, bloquant la publication afin que les chemins spécifiques à Windows ne puissent pas régresser silencieusement.

---

## 🛡️ v5.6.4 — Correction Critique de Sécurité de la Désinstallation

**Sortie :** 2026-05-08

### 🐛 La désinstallation avec `--global` ne supprime plus ~/.claude/

Avec `--global`, le désinstallateur supprimait `~/.claude/` de façon récursive au lieu de ne supprimer que les chemins appartenant à AgentVibes à l'intérieur. Cela provoquait une perte totale de données — paramètres, CLAUDE.md, skills, plugins, configurations MCP, outils personnalisés, tout. Confirmé réel, confirmé corrigé.

**v5.6.4 effectue une suppression chirurgicale — uniquement les chemins installés par AgentVibes :**

- `~/.claude/hooks/`, `hooks-windows/`, `commands/agent-vibes/`, `personalities/`, `audio/`
- `~/.agentvibes/` — entièrement propriété d'AgentVibes, supprimé en totalité
- `settings.json`, `CLAUDE.md`, skills, plugins, configurations MCP — **intacts**

Un test de régression applique désormais cette contrainte en CI. Si quelqu'un réintroduit une suppression large, le build échoue :

```js
// issue #182 regression guard
assert: settings.json and CLAUDE.md survived --global uninstall
```

Cela ne peut pas régresser silencieusement — le build cassera en premier.

---

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
