# État des lieux

## Architecture

- **Next.js 16** (App Router), React 19, TypeScript strict, Tailwind v4. Servi sous `basePath: /comi` : tout appel réseau passe par `apiFetch` (`src/lib/api.ts`).
- **Données** : Prisma + SQLite (`prisma/schema.prisma`, migrations versionnées). Modèles : `User`, `Repas`, `Ingredient`, `RepasIngredient`, `Programmation`, `ShoppingListItem`.
- **Auth** : JWT d'accès 15 min + refresh token en base (haché, expiration glissante de 30 jours, pas de rotation), cookies httpOnly, `src/proxy.ts` protège les pages et rafraîchit la session ; `resolveSession` (`src/lib/auth.ts`) est le point d'entrée unique pour retrouver l'utilisateur. Mots de passe hachés avec `bcryptjs`.
- **Services externes** : Uploadthing (photos), Gemini (analyse photo → recette, `api/repas/analyser`).
- **API** : chaque route est enveloppée par `withAuth` (`src/lib/api-handler.ts`), valide son corps avec un schéma zod (`src/lib/schemas.ts`) et vérifie la propriété des ressources avec `assertOwned`.
- **Front** : `src/app/(main)` (repas, planification, courses, paramètres), `src/components` (partagés, `ui/` pour les primitives), `src/contexts` (auth, réglages, conteneur de scroll), `src/lib/queries` (données serveur via TanStack Query), `src/hooks/useRepasForm.ts` (formulaire de repas, logique pure dans `src/lib/repas-form.ts`), `src/lib` (dates, formatage, catégories).

## Variables d'environnement

`DATABASE_URL`, `JWT_SECRET`, `UPLOADTHING_TOKEN`, `GEMINI_API_KEY` (voir `.env.example`). Aucun secret n'est versionné (`.env` est ignoré). Les variables `ADMIN_*` de l'ancien `.env.example` n'étaient lues nulle part et ont été retirées.

## Avant / après la passe de nettoyage

| | Avant | Après |
|---|---|---|
| `tsc --noEmit` | OK | OK |
| ESLint | 41 erreurs, 24 avertissements | 0 / 0 |
| `any` | 13 | 0 |
| Script de contrôle | — | `npm run check` (lint + types + tests), exécuté en CI |
| Logique dupliquée | recherche d'ingrédient ×2, dépôt de photo ×2, mises en page planning mobile/desktop ×2, clé JWT ×2 | factorisée (`IngredientSearchInput`, `ImageDropzone`, `PlanningDay`, `auth.key`) |
| Tests | routes seulement | routes, session, schémas, logique du formulaire (41 tests) |
| `eslint-disable` dans `src/` | 4 | 0 |

Le reste, et le journal de la refonte « socle », sont dans `docs/dette-technique.md`.
