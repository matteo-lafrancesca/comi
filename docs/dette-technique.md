# Dette technique

Classée par risque, puis valeur, puis effort. Mis à jour après la refonte navigation / dates / cache (branche `fix/navigation-refonte`).

## Risque

| # | Sujet | Détail | Effort |
|---|---|---|---|
| 1 | Tests de composants / e2e | Les routes (`planning`, `shopping-list`, `repas`, auth) et `date-utils` sont couverts par `npm test` (base SQLite jetable `tests/test.db`, session simulée). Reste : tests UI / e2e des parcours (Playwright). | M |
| 3 | `POST /api/repas` : 500 isolé non reproduit | Doublon d'ingrédient dans un payload et 6 créations parallèles passent en 201 (test de non-régression ajouté dans `tests/routes.test.ts`). Si ça réapparaît, regarder le log serveur (`P2002` ou verrou SQLite). | S |
| 4 | Risques auth acceptés | (a) Pas de rotation du refresh token : `getSessionUser` s'exécute en Server Component où les cookies sont en lecture seule, un nouveau token serait perdu et déconnecterait l'utilisateur. À reprendre avec une colonne `prev_token` si on déplace le rafraîchissement dans le seul `proxy`. (b) `register` indique si un email existe : choix UX, atténué par la limitation de débit. (c) Limiteur en mémoire : passer à Redis si plusieurs instances. | S |

## Valeur / maintenabilité

| # | Sujet | Détail | Effort |
|---|---|---|---|
| 7 | `SortableStepsList` | Lit des refs pendant le rendu (`eslint-disable react-hooks/refs`) pour la géométrie du drag. Passer les rectangles en state ou utiliser `@dnd-kit`. | M |
| 9 | `useRepasForm` (353 l.) | Un seul hook pour image, ingrédients, étapes et navigation. Scinder par étape. | M |
| 10 | Types dupliqués | `IngredientSuggestion`, `MealOption`, `StepItem`… définis localement dans plusieurs fichiers ; centraliser dans `src/types`. | S |

## Hygiène

- Règle ESLint `@next/next/no-img-element` désactivée (photos Uploadthing + aperçus `blob:`). `next/image` n'est utilisé que sur `RepasCard` et `RepasDetailModal`.
- Fins de ligne mélangées (avertissements « LF will be replaced by CRLF »). Ajouter un `.gitattributes` (`* text=auto eol=lf`) puis renormaliser en un commit dédié.
- `next dev --webpack` : vérifier si Turbopack est utilisable (le flag semble historique).
- `prisma/seed_generated_meals.ts` : script de données de démo, non branché dans `package.json`.
