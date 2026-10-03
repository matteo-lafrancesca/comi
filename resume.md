# Mission : reprendre et organiser un projet vibecodé

## Contexte

Ce projet a été écrit rapidement avec l'aide d'une IA ("vibecoding"). Il fonctionne probablement en grande partie, mais il peut contenir : du code dupliqué ou mort, des fichiers trop gros, des secrets en dur, peu ou pas de tests, une structure incohérente, des dépendances inutiles ou obsolètes.

**Ton rôle** : l'organiser et le fiabiliser **sans casser ce qui marche déjà**. Tu n'es pas là pour tout réécrire.

## Règles générales

1. **Ne jamais réécrire from scratch.** Refactorer par petites étapes, module par module.
2. **Un changement = un commit.** Commits petits, atomiques, avec un message clair.
3. **Toujours vérifier après chaque modification** : le projet se lance, les tests passent, le linter est propre.
4. **Ne pas changer le comportement** pendant un refactor. Les corrections de bugs et les nouvelles fonctionnalités sont des commits séparés.
5. **Demander avant** toute action destructrice ou ambiguë (suppression de fichiers, migration de base de données, changement d'API publique, mise à jour majeure d'une dépendance).
6. **Si tu n'es pas sûr de l'utilité d'un morceau de code**, ne le supprime pas : signale-le dans la liste de dette technique.
7. **Ne jamais exposer, afficher ou committer de secrets** (clés API, mots de passe, tokens).

## Plan en phases

### Phase 1 : Comprendre avant de toucher

- Lire le dépôt : structure des dossiers, points d'entrée, fichiers de config, dépendances.
- Lancer le projet et noter ce qui marche, ce qui casse, ce qui est à moitié fini.
- Identifier : variables d'environnement, base de données, services externes, scripts de build/déploiement.
- Repérer les zones à risque : secrets en dur, authentification, requêtes non protégées/injections, dépendances obsolètes ou vulnérables.
- **Livrable** : un court état des lieux (`docs/audit.md`) avec l'architecture actuelle, les problèmes trouvés et les questions en suspens.

### Phase 2 : Filet de sécurité

- Vérifier que le projet est sous Git ; créer une branche dédiée (ex. `refactor/cleanup`).
- Écrire des **tests de caractérisation** ou des tests de bout en bout sur les parcours critiques, pour figer le comportement actuel.
- Ajouter un linter, un formateur et, si le langage le permet, le typage strict (de façon progressive).
- **Livrable** : une commande unique qui lance lint + tests, et qui passe au vert.

### Phase 3 : Nettoyage

- Supprimer le code mort, les fichiers dupliqués et les dépendances inutilisées (après vérification).
- Sortir les secrets dans un `.env` ; fournir un `.env.example` ; vérifier le `.gitignore`.
- Centraliser la configuration.
- Uniformiser le nommage et la gestion des erreurs.
- **Livrable** : code plus léger, config propre, aucun secret dans le dépôt.

### Phase 4 : Réorganisation de l'architecture

- Séparer les responsabilités : **UI / logique métier / accès aux données**.
- Découper les gros fichiers et fonctions fourre-tout en unités cohérentes.
- Commencer par les modules les plus fragiles ou ceux qui changent le plus souvent.
- Relancer les tests après chaque étape.
- **Livrable** : une structure de dossiers lisible et cohérente, documentée.

### Phase 5 : Documentation et automatisation

- Écrire un `README.md` : installation, lancement, tests, architecture en bref.
- Mettre en place une CI minimale (lint + tests à chaque push).
- Tenir à jour un fichier `docs/dette-technique.md` listant ce qui reste à faire, avec priorité et effort estimé.

### Phase 6 : Priorisation du backlog

Classer les chantiers restants dans cet ordre :

1. **Risque** : sécurité, bugs bloquants.
2. **Valeur** : ce qui apporte le plus à l'utilisateur.
3. **Effort** : privilégier ce qui débloque la suite à moindre coût.

## Format attendu de tes réponses

- Avant chaque phase : annonce brièvement ce que tu vas faire.
- Après chaque phase : résume ce qui a été fait, ce qui reste, et les risques éventuels.
- En cas de doute : pose **une seule question claire** plutôt que de deviner.

## Informations à confirmer avec l'utilisateur au démarrage

- Stack du projet (langage, framework, base de données).
- Principale source de frustration : bugs, code illisible, difficulté à ajouter des fonctionnalités, déploiement ?
- Le projet est-il déjà en production ? Y a-t-il des utilisateurs réels ?
- Existe-t-il des parties à ne surtout pas toucher ?
