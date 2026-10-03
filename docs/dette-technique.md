# Dette technique

Classée par risque, puis valeur, puis effort. Mis à jour après la passe de nettoyage (branche `refactor/cleanup`).

## Risque

| # | Sujet | Détail | Effort |
|---|---|---|---|
| 1 | Aucun test | Ni unitaire ni e2e. Les routes critiques (`api/planning`, `api/shopping-list`, auth) et `lib/date-utils.ts` (semaines personnalisées) sont les premières à couvrir. | M |
| 2 | Secret JWT de repli en dev | `src/lib/auth.ts` retombe sur une constante si `JWT_SECRET` est absent hors production. Acceptable en local ; à rendre bloquant partout si l'app est exposée. | S |
| 3 | `POST /api/repas` : un 500 isolé | Observé une fois (création de 6 repas à la suite, aucune reproduction ensuite). Soupçon : course sur la création d'ingrédients partagés. À investiguer dans `src/app/api/repas/route.ts`. | S |
| 4 | Garde-fous auth à auditer | Limitation de débit sur login/register, politique de mot de passe (6 caractères min.), durée des refresh tokens : non vérifiés dans cette passe. | M |

## Valeur / maintenabilité

| # | Sujet | Détail | Effort |
|---|---|---|---|
| 5 | Gros fichiers | `planification/page.tsx` (483 l.), `api/shopping-list/route.ts` (452), `repas/page.tsx` (434), `courses/page.tsx` (427). Extraire hooks de données (`usePlanning`, `useShoppingList`) et logique d'agrégation hors des routes. | M |
| 6 | Data-fetching maison | Les pages gèrent fetch + cache + états de chargement à la main, d'où 3 `eslint-disable react-hooks/set-state-in-effect` / `exhaustive-deps` (`courses`, `repas`, `planification`). Migrer vers TanStack Query ou SWR supprimerait aussi `NavigationCacheContext`. | L |
| 7 | `SortableStepsList` | Lit des refs pendant le rendu (`eslint-disable react-hooks/refs`) pour la géométrie du drag. Passer les rectangles en state ou utiliser `@dnd-kit`. | M |
| 8 | `SettingsContext` | Thème lu depuis `localStorage` dans un effet (`eslint-disable`). Passer à `useSyncExternalStore`. | S |
| 9 | `useRepasForm` (353 l.) | Un seul hook pour image, ingrédients, étapes et navigation. Scinder par étape. | M |
| 10 | Types dupliqués | `IngredientSuggestion`, `MealOption`, `StepItem`… définis localement dans plusieurs fichiers ; centraliser dans `src/types`. | S |

## Hygiène

- Règle ESLint `@next/next/no-img-element` désactivée (photos Uploadthing + aperçus `blob:`). `next/image` n'est utilisé que sur `RepasCard` et `RepasDetailModal`.
- Fins de ligne mélangées (avertissements « LF will be replaced by CRLF »). Ajouter un `.gitattributes` (`* text=auto eol=lf`) puis renormaliser en un commit dédié.
- `next dev --webpack` : vérifier si Turbopack est utilisable (le flag semble historique).
- `prisma/seed_generated_meals.ts` : script de données de démo, non branché dans `package.json`.
