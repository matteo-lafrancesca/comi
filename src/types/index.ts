import type { 
  User as PrismaUser, 
  Repas as PrismaRepas, 
  Ingredient as PrismaIngredient, 
  RepasIngredient as PrismaRepasIngredient,
  Programmation as PrismaProgrammation,
  ShoppingListItem as PrismaShoppingListItem
} from '@prisma/client';

// Ré-export pour compatibilité des imports existants (logique dans lib/category-utils.ts)
export { normalizeCategory } from '@/lib/category-utils';

// Modèles principaux réexportés depuis Prisma
export type User = PrismaUser;
export type Repas = PrismaRepas;
export type Ingredient = PrismaIngredient;
export type RepasIngredient = PrismaRepasIngredient;
export type Programmation = PrismaProgrammation;
export type ShoppingListItem = PrismaShoppingListItem;

// Catégories d'ingrédients alimentaires (triées dans l'ordre du parcours type en magasin)
export const CATEGORY_DETAILS = {
  'fruits-legumes': { label: 'Fruits & Légumes', order: 1 },
  'boucherie-poissonnerie': { label: 'Boucherie & Poissonnerie', order: 2 },
  'frais': { label: 'Rayon Frais', order: 3 },
  'produits-laitiers': { label: 'Produits Laitiers & Œufs', order: 4 },
  'boulangerie-patisserie': { label: 'Boulangerie & Pâtisserie', order: 5 },
  'epicerie-salee': { label: 'Épicerie Salée', order: 6 },
  'epicerie-sucree': { label: 'Épicerie Sucrée', order: 7 },
  'boissons': { label: 'Boissons', order: 8 },
  'surgeles': { label: 'Surgelés', order: 9 }
} as const;

export const CATEGORIES_INGREDIENTS = Object.keys(CATEGORY_DETAILS) as Array<keyof typeof CATEGORY_DETAILS>;
export type CategorieIngredient = keyof typeof CATEGORY_DETAILS;



// Types étendus avec les relations Prisma (couramment utilisés dans l'application)
export type RepasWithIngredients = Repas & {
  ingredients: {
    id: number;
    nom: string;
    quantite: number | null;
    unite: string | null;
    categorie: CategorieIngredient;
  }[];
};

export type ProgrammationWithRepas = Programmation & {
  repas: RepasWithIngredients;
};

export type UserWithRelations = User & {
  repas: Repas[];
  programmation: Programmation[];
};

export type ShoppingListItemWithIngredient = ShoppingListItem & {
  ingredient: Ingredient;
};

// ── Types pour la liste de courses ──────────────────────────────────────────

/** Un article de la liste de courses (ingrédient agrégé pour la semaine) */
export interface ShoppingItem {
  id: number;
  ingredientId: number;
  nom: string;
  quantite: number | null;
  unite: string | null;
  phrase: string;
  isChecked: boolean;
}

/** Groupe d'articles par catégorie dans la liste de courses */
export interface CategoryGroup {
  categorie: CategorieIngredient;
  label: string;
  order: number;
  items: ShoppingItem[];
}

/** Article hors-planning (repas ou ingrédient ajouté manuellement) */
export interface ShoppingListExtraItem {
  id: number;
  quantite?: number | null;
  unite?: string | null;
  repas?: { id: number; titre: string } | null;
  ingredient?: { id: number; nom: string; categorie: string } | null;
}

