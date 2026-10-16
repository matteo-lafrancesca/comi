# Dette technique

Classée par risque, puis valeur, puis effort. Dernière mise à jour : refonte « socle » (branche `refactor/socle`), voir le journal en bas.

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
| 8 | Risques auth acceptés | (a) `register` indique si un email existe : choix UX, atténué par la limitation de débit. (b) Limiteur de débit en mémoire : passer à Redis si plusieurs instances. | S |

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

Dépendances ajoutées : `zod`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
