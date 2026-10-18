# Dette technique

Classée par risque, puis valeur, puis effort. Dernière mise à jour : système d'amis (branche `dev`, détail dans `docs/plan-amis.md`), voir le journal en bas.

## Reste à faire

| # | Sujet | Détail | Effort |
|---|---|---|---|
| 1 | Tests UI / e2e | Routes API, `date-utils`, session et logique du formulaire repas (`lib/repas-form.ts`, schémas) sont couverts par `npm test` (base SQLite jetable `tests/test.db`). Reste un test de fumée Playwright (créer un repas → le programmer → voir les courses) une fois l'app stabilisée. | M |
| 2 | Refresh token non tourné | `renewRefreshToken` ne fait que repousser l'expiration (30 jours glissants) ; le token reste le même. Une vraie rotation exige de poser les cookies hors Server Component : désormais faisable car le rafraîchissement passe par `resolveSession` (proxy, `auth/me`, `getSessionUser`). Prévoir une colonne `prev_token` pour tolérer les requêtes concurrentes. | M |
| 3 | Routes `auth/*` hors `withAuth` | `login`, `register`, `refresh`, `logout`, `me` gardent leur propre try/catch (elles sont publiques ou gèrent leurs cookies). Les faire passer par un `withErrors` partagé. | S |
| 4 | Recherche d'ingrédient et `CreateIngredientDrawer` | Utilisent encore `apiFetch` + `useState` (règle « TanStack Query partout » non respectée). Créer `useIngredientSearch` / `useCreateIngredientMutation`. | S |
| 5 | `api/repas/analyser` (≈250 l.) | L'appel Gemini (prompt, schéma, filtrage des ingrédients) est inline dans la route. Extraire dans `lib/gemini.ts`. | S |
| 6 | Typage de `categorie` | Prisma stocke un `String` ; `formatRepasResponse` le caste en `CategorieIngredient`. Valable tant que toute écriture passe par `normalizeCategory` (c'est le cas) ; à resserrer si on ajoute une autre voie d'écriture. | S |
| 7 | Réordonnancement des étapes | Passé à `@dnd-kit` : clavier et branchement vérifiés, mais le glisser tactile (iOS PWA) reste à valider sur appareil réel. | S |
| 8 | Risques auth acceptés | (a) `register` indique si un email existe : choix UX, atténué par la limitation de débit. (b) Limiteur de débit en mémoire (connexion, recherche de pseudo) : repart à zéro au redémarrage ; passer à Redis si plusieurs instances. | S |
| 9 | Demandes d'ami croisées simultanées | L'unicité de `Friendship` n'est garantie que dans un sens (`ponytail:` dans `findFriendship`) : deux demandes croisées à la même milliseconde créent deux lignes. Correctif : paire canonique `(minId, maxId)` unique. | S |
| 10 | Pseudo imposé côté UI seulement | Les routes amis exigent un pseudo (`requirePseudo`), pas les autres : un compte sans pseudo peut appeler l'API repas. Sans conséquence aujourd'hui (rien n'est montré aux autres sans pseudo). | S |
| 11 | Course sur le pseudo | Deux comptes qui choisissent le même pseudo à la même milliseconde : 500 au lieu de 409 (l'index unique sur `pseudoKey` protège la donnée). Intercepter `P2002` comme pour les ingrédients. | S |
| 12 | Photos orphelines Uploadthing | Remplacer ou retirer une photo (repas, profil) ne supprime pas l'ancien fichier. Appeler `utapi.deleteFiles` sur l'ancienne URL. | S |
| 13 | Fraîcheur des données d'amis | Pas de temps réel : vitrine, profil et compteur de demandes (onglet Amis) se rafraîchissent au retour sur l'app (`refetchOnWindowFocus`, `staleTime` 30 s). Une fiche ouverte sur le profil d'un ami se ferme si l'ami repasse la recette en privé. | S |
| 14 | Choix public / privé hors formulaires | « Nouveau » / « Modifier » ne proposent pas la confidentialité (réglée depuis la fiche ; l'API l'accepte). Recherche d'amis par début de pseudo uniquement. | S |
| 15 | Ids séquentiels restants | Les utilisateurs sortent avec leur `publicId` ; les demandes d'ami (`requestId`) et les repas (`/repas/[id]/modifier`) gardent leur id en base. Même technique si besoin. | S |

## Hygiène

- Règle ESLint `@next/next/no-img-element` désactivée (photos Uploadthing + aperçus `blob:`). `next/image` n'est utilisé que sur `RepasCard` et `RepasDetailModal`.
- Plus aucun `eslint-disable` dans `src/`.

## Journal

### Refonte « socle »

| Phase | Changement | Dette soldée |
|---|---|---|
| 0 | `.gitattributes` (`eol=lf`) et fichiers renormalisés ; `next dev` sans `--webpack` (le build utilisait déjà Turbopack) ; `npm run seed:demo` (dates corrigées avec `date-utils`) ; `resume.md` supprimé ; route morte `PATCH /api/shopping-list/[id]` supprimée | Fins de ligne, flag `--webpack`, seed orphelin |
| 1 | `lib/api-handler.ts` : `withAuth` (session + erreurs), `parseBody`, `parseId`, `assertOwned`. `lib/schemas.ts` (zod) : validation d'entrée unique, types `RepasPayload` partagés client/serveur. `lib/repas-input.ts` : `ingredientLinks`, `cleanText`, `toQuantite`. Session : `resolveSession` unique (utilisée par `getSessionUser` et `auth/me`), cookies construits en un seul endroit, `proxy` passe par `verifyJWT`. `verifyAndRotateRefreshToken` renommée `renewRefreshToken` (elle ne tourne pas le token). `userId` du body de `POST /api/repas` supprimé | Boilerplate ×21, validation copiée POST/PATCH, session en triple, nom trompeur |
| 2 | `lib/repas-form.ts` (reducer, mappers, brouillon) pur et testé ; `useRepasForm` sans setter brut, `useImageUpload`, `useHydrated` ; types déplacés dans `src/types` ; page « modifier » via `useRepasQuery` + formulaire monté une fois les données prêtes (plus de `fetch`+`useState`, plus d'`eslint-disable`) ; mutations `useCreateRepasMutation`, `useUpdateRepasMutation`, `useAnalyseImageMutation` | `useRepasForm` 353 l., types dupliqués, `Math.random()` comme id, effets de chargement |
| 3 | `SortableStepsList` : 394 → ≈150 lignes avec `@dnd-kit` (souris, appui long tactile, clavier) | `eslint-disable react-hooks/refs` |
| Correctif | `npm ci` échouait sous Linux (`Missing: @emnapi/runtime from lock file`) : le lockfile généré sous Windows ne contient pas les dépendances wasm optionnelles de tailwind. Lockfile rebasé sur le précédent + ajouts ciblés, puis `@emnapi/core` et `@emnapi/runtime` épinglés en devDependencies (contournement de npm/cli#4828). Vérifié avec `npm ci --dry-run` sous npm 10.9 et 11.6 | Installation reproductible en production |

### Système d'amis

Pseudo, confidentialité des repas, amitiés, recettes d'amis dans son carnet (lien, pas copie), onglet et profils d'amis, identifiant public des utilisateurs. Décisions et carte du code : `docs/plan-amis.md`. Aucune dépendance ajoutée.

Piège à retenir : le sandbox Bash ne supprime pas les fichiers (sans erreur) ; `tests/setup.ts` ne pouvait donc pas effacer `tests/test.db`. Lancer `npm run check` depuis PowerShell.

### Refonte « socle » (dépendances)

Dépendances ajoutées : `zod`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` ; en devDependencies : `@emnapi/core`, `@emnapi/runtime`.

Piège à retenir : ne pas régénérer `package-lock.json` avec `npm install --package-lock-only` depuis Windows ; ajouter une dépendance avec `npm install <paquet>` puis contrôler `npm ci --dry-run` avant de pousser.
