# État des lieux

## Architecture

- **Next.js 16** (App Router), React 19, TypeScript strict, Tailwind v4. Servi sous `basePath: /comi` : tout appel réseau passe par `apiFetch` (`src/lib/api.ts`).
- **Données** : Prisma + SQLite (`prisma/schema.prisma`, migrations versionnées). Modèles : `User`, `Repas`, `Ingredient`, `RepasIngredient`, `Programmation`, `ShoppingListItem`.
- **Auth** : JWT d'accès 15 min + refresh token en base (rotation), cookies httpOnly, `src/proxy.ts` protège les pages et rafraîchit la session. Mots de passe hachés avec `bcryptjs`.
- **Services externes** : Uploadthing (photos), Gemini (analyse photo → recette, `api/repas/analyser`).
- **Front** : `src/app/(main)` (repas, planification, courses, paramètres), `src/components` (partagés, `ui/` pour les primitives), `src/contexts` (auth, réglages, cache de navigation), `src/hooks/useRepasForm.ts`, `src/lib` (dates, formatage, catégories).

## Variables d'environnement

`DATABASE_URL`, `JWT_SECRET`, `UPLOADTHING_TOKEN`, `GEMINI_API_KEY` (voir `.env.example`). Aucun secret n'est versionné (`.env` est ignoré). Les variables `ADMIN_*` de l'ancien `.env.example` n'étaient lues nulle part et ont été retirées.

## Avant / après la passe de nettoyage

| | Avant | Après |
|---|---|---|
| `tsc --noEmit` | OK | OK |
| ESLint | 41 erreurs, 24 avertissements | 0 / 0 |
| `any` | 13 | 0 |
| Script de contrôle | — | `npm run check` (lint + types), exécuté en CI |
| Logique dupliquée | recherche d'ingrédient ×2, dépôt de photo ×2, mises en page planning mobile/desktop ×2, clé JWT ×2 | factorisée (`IngredientSearchInput`, `ImageDropzone`, `PlanningDay`, `auth.key`) |

Le reste est suivi dans `docs/dette-technique.md`.
