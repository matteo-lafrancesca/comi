import type { Prisma } from '@prisma/client';
import type { RepasWithIngredients } from '@/types';

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
