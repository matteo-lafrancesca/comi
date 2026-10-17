# Système d'amis — suivi du chantier

Document de reprise : contexte, décisions, ce qui est fait, ce qui reste. À lire en entier avant de
reprendre le travail dans une nouvelle conversation (avec `AGENTS.md` et `DESIGN_GUIDELINES.md`).

Branche : `dev` · dernier commit du chantier : `294dd13` (étape 6) · état : **étapes 1 à 6 faites, reste 7 et 8**.

---

## 1. Objectif

Un onglet **Amis** : on y retrouve ses amis sous forme de cartes de profil (pseudo, photo, recettes en
vitrine). Sur le profil d'un ami, on voit toutes ses recettes **publiques** et on peut les ajouter à son
carnet. On peut aussi retirer un ami.

Demandes de départ de l'utilisateur :

- pseudo pour chaque utilisateur, demandé dans une popup à la prochaine connexion (refuser = déconnexion) ;
- bouton de confidentialité sur les repas (tous privés par défaut) ;
- page Amis + bouton de demande d'ami (recherche par pseudo, accepter / refuser) ;
- amitiés en base ;
- recette d'un ami dans ses repas : **non modifiable**, **supprimée si l'ami la supprime**, sert à la programmer ;
- pouvoir supprimer un ami depuis son profil.

## 2. Décisions de conception (validées)

1. **Une recette d'ami est un lien, pas une copie** : table `RepasSaved (userId, repasId)`. La cascade
   Prisma supprime le lien (et les programmations / extras) si l'auteur supprime le repas.
2. **Perdre l'accès = tout nettoyer** : repasser une recette en privé, retirer un ami ou retirer une
   recette de son carnet supprime, chez les utilisateurs qui perdent l'accès, les `RepasSaved`, les
   programmations et les extras de courses de ces repas. Point unique : `purgeSharedAccess` (`src/lib/friends.ts`).
3. **Pseudo = nom d'affichage libre** (majuscules, accents, espaces conservés), 2 à 30 caractères
   (`pseudoSchema`). Unicité **sans casse ni accents** via la colonne `pseudoKey` = `normalizeSearchText(pseudo)`.
   Toute écriture passe par `pseudoFields()` (`src/lib/pseudo.ts`).
4. **Vitrine** = les 3 dernières recettes publiques (pas de choix manuel).
5. Un utilisateur montré aux autres n'expose que `{ id, pseudo, photoUrl }` (`FRIEND_SUMMARY_SELECT`), jamais l'e-mail.

## 3. Étapes faites

| # | Commit | Contenu |
|---|---|---|
| 1 | `607f5c0`, `cfb6c28` | Schéma : `User.pseudo` / `pseudoKey` (unique) / `photoUrl`, `Repas.isPublic`, tables `Friendship` (`pending` / `accepted`, une ligne par paire) et `RepasSaved`. Migrations `20261017120000_friends`, `20261017130000_pseudo_key`. |
| 2 | `20752f4` | Pseudo obligatoire à l'inscription (409 si pris), `PseudoSetupDrawer` pour les comptes sans pseudo (le fermer déconnecte), `PATCH /api/settings` (pseudo, photo), section Profil dans Réglages (`ProfileForm`, `Avatar`). `SessionUser` / `SESSION_USER_SELECT` incluent pseudo et photo ; login renvoie l'utilisateur complet. |
| — | `4dd7d2c` | Correctif : sur un 401, `providers.tsx` appelle `/api/auth/logout` avant d'aller sur `/login` (sinon boucle infinie proxy ↔ API). |
| 3 | `1a93f1e` | Confidentialité : `isPublic` en création et PATCH, bouton cadenas / globe + mention dans `RepasDetailModal`, purge à la mise en privé. |
| 4 | `873c1b6` | Backend amis (voir §4). Tests `tests/friends.test.ts`. |
| 5 | `5121296` | Carnet : `POST/DELETE /api/repas/[id]/save`, `GET /api/repas` inclut les recettes ajoutées, `owner` et `savedCount` dans chaque repas, `assertUsableRepas` pour planning et extras, tri rareté limité à ses propres programmations, fiche « recette d'ami » (programmer / retirer du carnet), confirmation avant de repasser en privé une recette présente chez des amis. |
| 6 | `294dd13` | Onglet **Amis** : page `/amis` (`FriendCard`), `FriendRequestsDrawer` (recherche + demandes), requêtes / mutations, `RepasThumbnail` et `ui/Tabs` extraits. |

## 4. Carte du code

**API** (toutes `withAuth` ; recherche, envoi, acceptation et ajout au carnet exigent un pseudo via `requirePseudo`) :

| Route | Rôle |
|---|---|
| `GET /api/users/search?q=` | Préfixe de pseudo (≥ 2 car.), 10 max, avec `relation` et `requestId`. 60 req/min par utilisateur. |
| `GET / POST /api/friends/requests` | Demandes en attente `{ received, sent }` / envoyer `{ userId }` (acceptée d'office si demande croisée). |
| `POST /api/friends/requests/[id]/accept` | Accepter (destinataire seulement). |
| `DELETE /api/friends/requests/[id]` | Refuser ou annuler. |
| `GET /api/friends` | Amis + vitrine (`FriendCard[]`). |
| `GET /api/friends/[userId]` | Profil : recettes publiques avec `savedByMe` (`FriendProfile`). 403 si pas amis. |
| `DELETE /api/friends/[userId]` | Retirer un ami + purge dans les deux sens. **Déjà fait et testé, pas encore branché à l'UI.** |
| `POST / DELETE /api/repas/[id]/save` | Ajouter à / retirer de son carnet. **POST pas encore branché à l'UI.** |

**Lib** : `src/lib/friends.ts` (`requirePseudo`, `findFriendship`, `relationOf`, `assertFriends`,
`assertUsableRepas`, `purgeSharedAccess`), `src/lib/pseudo.ts`, `src/lib/api-formatters.ts`
(`REPAS_INCLUDE` charge l'auteur et le nombre de carnets ; `formatRepasResponse(repas, viewerId)` →
`owner` null pour ses repas, `savedCount` réservé à l'auteur).

**Types** (`src/types/index.ts`) : `FriendSummary`, `FriendCard`, `FriendRelation`, `UserSearchResult`,
`FriendRequest(sResponse)`, `FriendProfile` ; `RepasWithIngredients` a `isPublic`, `owner`, `savedCount`.

**Front** : `src/lib/queries/` → `useFriends`, `useFriendRequests`, `useUserSearch`,
`useSend/Accept/DeleteFriendRequestMutation`, `useRepasVisibilityMutation`, `useUnsaveRepasMutation` ;
clés `friends.{all,list,requests,search}` ; `friendUrl(id)` dans `routes.ts`.
Composants : `Avatar`, `PseudoSetupDrawer`, `ProfileForm`, `FriendCard`, `FriendRequestsDrawer`,
`RepasThumbnail`, `ui/Tabs` (tous listés dans `AGENTS.md`).

## 5. Étapes restantes

### Étape 7 — Profil d'un ami (prochaine)

Aujourd'hui, cliquer sur une carte d'ami mène à `/amis/[id]` → **404**.

- `src/app/(main)/amis/[id]/page.tsx` : `BackHeader` (retour vers `/amis`, titre = pseudo), grand `Avatar`,
  grille de `RepasCard` avec `profile.repas`, puis en bas « Retirer cet ami » (`Button` `danger`) →
  `ConfirmDeleteDrawer` (« ses recettes quitteront votre carnet et votre planning ») → retour à `/amis`.
  États : chargement, erreur (403 si plus amis → message + lien vers `/amis`), aucune recette publique.
- Requête `useFriendProfile(id)` + clé `friends.profile(id)` (sous `friends.all`).
- Mutations :
  - `useSaveRepasMutation` (`POST /api/repas/[id]/save`) → invalide `repas` + `friends.profile` ;
  - `useRemoveFriendMutation` (`DELETE /api/friends/[userId]`) → invalide `friends` + `repas` + planning + courses ;
  - `useUnsaveRepasMutation` doit aussi invalider `friends` (le `savedByMe` du profil change).
  Mettre à jour le commentaire d'invalidation de `keys.ts`.
- `RepasDetailModal` en **mode aperçu** depuis le profil : la recette n'est pas forcément dans mon carnet.
  Proposition : prop optionnelle (ex. `savedByMe?: boolean`, présente seulement depuis le profil) →
  bouton « Ajouter à mon carnet » (`BookmarkPlus`) si `false`, mention « Dans mon carnet » + « Retirer »
  si `true`. Pas de « Programmer » tant qu'elle n'est pas dans le carnet (l'API le refuserait : 403).
  Afficher l'état à jour après la mutation sans resynchroniser par effet (même technique que `savedVisibility`).
- `RepasCard` sur le profil : la mention « de *pseudo* » est redondante → prop pour la masquer.
- Vérifier dans le navigateur (voir §6) : ajout au carnet → visible dans « Mes repas » → programmable ;
  retrait d'un ami → ses recettes disparaissent du carnet et du planning.

### Étape 8 — Finitions

- Relire `AGENTS.md` (composants ajoutés à l'étape 7) et ajouter à `docs/dette-technique.md` les limites ci-dessous.
- Option : indicateur de demandes reçues sur l'onglet Amis de la navigation.
- `npm run check` + passe complète dans le navigateur.

## 6. Limites connues / dette

- **Demandes croisées simultanées** : l'unicité de `Friendship` n'est garantie que dans un sens (commentaire
  `ponytail:` dans `findFriendship`). Correctif si besoin : paire canonique `(minId, maxId)` unique.
- **Pseudo imposé seulement côté UI** pour les routes hors amis (un compte sans pseudo peut appeler l'API repas).
- **Course sur le pseudo** : deux choix identiques à la même milliseconde → 500 au lieu de 409 (l'index unique protège la donnée).
- **Photos orphelines Uploadthing** : remplacer / retirer sa photo de profil ne supprime pas l'ancienne (comme pour les repas).
- **Recherche par début de pseudo uniquement** ; limiteur de débit en mémoire (repart à zéro au redémarrage).
- **Vitrine des amis** rafraîchie seulement à leur prochaine visite.
- Formulaires « Nouveau » / « Modifier » sans choix public / privé (réglé depuis la fiche ; l'API l'accepte).

## 7. Environnement et pièges rencontrés

- **`dev.db` avait déjà une dérive de migrations** avant le chantier (migration `20260707075757` appliquée
  mais absente du repo, `20260704…` non appliquée). `prisma migrate dev` veut tout réinitialiser : **ne pas le faire**.
  Méthode utilisée pour chaque migration : générer le SQL avec
  `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url file:<fichier temporaire> --script`,
  l'appliquer avec `prisma db execute --file …`, puis `prisma migrate resolve --applied <nom>`.
  Sauvegarde : `prisma/backup-dev-2026-10-17-avant-amis.db` (ignorée par git).
- **`npm run dev` garde l'ancien client Prisma en mémoire** : après un changement de schéma, l'arrêter,
  lancer `npx prisma generate`, puis relancer (sinon `/api/auth/me` répond 500). `prisma generate`
  échoue en `EPERM` sur la DLL tant que le serveur tourne.
- **Vérification navigateur** : configuration `comi-verify` de `.claude/launch.json` (`next start` sur le
  port 3100) après un `npx next build`. Passer la vue en mobile (sinon écran « orientation non supportée »).
  Créer les comptes de test par un script Node lancé **depuis la racine du projet** (`node - < script.js`,
  pour résoudre `@prisma/client`), et les supprimer à la fin.
- **Tests** : `tests/helpers.ts` → `loginAs()` crée un utilisateur **avec pseudo**, `actAs(user)` change de
  session. Les routes à segment dynamique s'appellent avec `{ params: Promise.resolve({ id: '…' }) }`.
- `npm run check` doit passer ; il reste **deux warnings ESLint antérieurs au chantier** (`providers.tsx`
  `window.location.assign`, `WeekSelector.tsx` `onReset` inutilisé).
- Côté outils : les heredocs bash contenant une apostrophe typographique (’) échouent ; écrire le script dans un fichier.

## 8. Pour reprendre

> « Lis `docs/plan-amis.md`, `AGENTS.md` et `DESIGN_GUIDELINES.md`, puis fais l'étape 7. »

Méthode suivie à chaque étape : coder → tests (`tests/friends.test.ts`) → `npm run check` → vérification
navigateur → commit sur `dev` → rapport des modifications. Mettre à jour ce document (tableau §3 et §5) à la fin de chaque étape.
