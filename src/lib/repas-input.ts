import type { Prisma } from '@prisma/client';
import { normalizeCategory } from '@/lib/category-utils';
import type { IngredientPayload } from '@/lib/schemas';

/** Texte nettoyé : espaces retirés, chaîne vide -> null. */
export const cleanText = (value: string | null | undefined): string | null => value?.trim() || null;

/** Quantité saisie (nombre ou texte) -> nombre, ou null si absente / non numérique. */
export function toQuantite(value: number | string | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  const q = typeof value === 'string' ? Number.parseFloat(value) : value;
  return Number.isNaN(q) ? null : q;
}

/** Lignes `RepasIngredient` à créer : l'ingrédient est retrouvé par son nom, sinon créé. */
export function ingredientLinks(ingredients: IngredientPayload[]): Prisma.RepasIngredientCreateWithoutRepasInput[] {
  return ingredients.map((ing) => {
    const nom = ing.nom.trim();
    return {
      quantite: toQuantite(ing.quantite),
      unite: cleanText(ing.unite),
      ingredient: {
        connectOrCreate: {
          where: { nom },
          create: { nom, categorie: normalizeCategory(ing.categorie) },
        },
      },
    };
  });
}
