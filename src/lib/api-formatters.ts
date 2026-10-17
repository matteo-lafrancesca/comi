import type { Prisma } from '@prisma/client';
import type { ProgrammationWithRepas, RepasWithIngredients } from '@/types';
import { fromDbDate } from '@/lib/date-utils';

/**
 * Type Prisma complet pour un repas avec ses ingrédients chargés.
 */
export type RepasWithIngredientsPayload = Prisma.RepasGetPayload<{
  include: {
    ingredients: {
      include: {
        ingredient: true;
      };
    };
  };
}>;

/**
 * Formate un repas Prisma vers le format de réponse API `RepasWithIngredients`.
 * Élimine la duplication du mapping dans toutes les routes API.
 */
export function formatRepasResponse(repas: RepasWithIngredientsPayload): RepasWithIngredients {
  return {
    id: repas.id,
    userId: repas.userId,
    titre: repas.titre,
    recette: repas.recette,
    photoUrl: repas.photoUrl,
    isPublic: repas.isPublic,
    createdAt: repas.createdAt,
    ingredients: repas.ingredients.map((ri) => ({
      id: ri.id,
      nom: ri.ingredient.nom,
      quantite: ri.quantite,
      unite: ri.unite,
      categorie: ri.ingredient.categorie as RepasWithIngredients['ingredients'][number]['categorie'],
    })),
  };
}

/** Programmation Prisma avec son repas complet. */
export type ProgrammationPayload = Prisma.ProgrammationGetPayload<{
  include: { repas: { include: { ingredients: { include: { ingredient: true } } } } };
}>;

/** Include Prisma à utiliser pour obtenir un `ProgrammationPayload`. */
export const PROGRAMMATION_INCLUDE = {
  repas: { include: { ingredients: { include: { ingredient: true } } } },
} satisfies Prisma.ProgrammationInclude;

/** Programmation Prisma -> réponse API (date calendaire « AAAA-MM-JJ »). */
export function formatProgrammationResponse(prog: ProgrammationPayload): ProgrammationWithRepas {
  return {
    id: prog.id,
    userId: prog.userId,
    repasId: prog.repasId,
    date: fromDbDate(prog.date),
    heure: prog.heure === 1 ? 1 : 0,
    repas: formatRepasResponse(prog.repas),
  };
}
