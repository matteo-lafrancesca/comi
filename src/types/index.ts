import type { 
  User as PrismaUser, 
  Repas as PrismaRepas, 
  Ingredient as PrismaIngredient, 
  RepasIngredient as PrismaRepasIngredient,
  Programmation as PrismaProgrammation 
} from '@prisma/client';

// Modèles principaux réexportés depuis Prisma
export type User = PrismaUser;
export type Repas = PrismaRepas;
export type Ingredient = PrismaIngredient;
export type RepasIngredient = PrismaRepasIngredient;
export type Programmation = PrismaProgrammation;

// Catégories d'ingrédients alimentaires (triées dans l'ordre du parcours type en magasin)
export const CATEGORY_DETAILS = {
  'fruits-legumes': { label: 'Fruits & Légumes', order: 1 },
  'boucherie-poissonnerie': { label: 'Boucherie & Poissonnerie', order: 2 },
  'charcuterie-traiteur': { label: 'Charcuterie & Traiteur', order: 3 },
  'produits-laitiers': { label: 'Produits Laitiers & Œufs', order: 4 },
  'boulangerie-patisserie': { label: 'Boulangerie & Pâtisserie', order: 5 },
  'epicerie-salee': { label: 'Épicerie Salée', order: 6 },
  'epicerie-sucree': { label: 'Épicerie Sucrée', order: 7 },
  'boissons': { label: 'Boissons', order: 8 },
  'surgeles': { label: 'Surgelés', order: 9 }
} as const;

export const CATEGORIES_INGREDIENTS = Object.keys(CATEGORY_DETAILS) as Array<keyof typeof CATEGORY_DETAILS>;
export type CategorieIngredient = keyof typeof CATEGORY_DETAILS;

/**
 * Normalise une chaîne de caractères pour retourner une catégorie d'ingrédient valide.
 */
export function normalizeCategory(category: string): CategorieIngredient {
  const normalized = category.trim().toLowerCase();
  
  if (normalized.includes('fruit') || normalized.includes('legume') || normalized.includes('légume')) {
    return 'fruits-legumes';
  }
  if (normalized.includes('viande') || normalized.includes('poisson') || normalized.includes('boucherie') || normalized.includes('volaille')) {
    return 'boucherie-poissonnerie';
  }
  if (normalized.includes('charcuterie') || normalized.includes('traiteur')) {
    return 'charcuterie-traiteur';
  }
  if (
    normalized.includes('lait') || 
    normalized.includes('fromage') || 
    normalized.includes('oeuf') || 
    normalized.includes('œuf') || 
    normalized === 'frais' || 
    normalized.includes('crème') || 
    normalized.includes('creme') ||
    normalized.includes('yaourt') ||
    normalized.includes('beurre')
  ) {
    return 'produits-laitiers';
  }
  if (normalized.includes('boulangerie') || normalized.includes('pain') || normalized.includes('patisserie') || normalized.includes('pâtisserie')) {
    return 'boulangerie-patisserie';
  }
  if (normalized.includes('epicerie sucree') || normalized.includes('épicerie sucrée') || normalized.includes('sucre') || normalized.includes('chocolat') || normalized.includes('miel') || normalized.includes('confiture')) {
    return 'epicerie-sucree';
  }
  if (normalized.includes('condiment') || normalized.includes('sauce') || normalized.includes('epicerie') || normalized.includes('épicerie') || normalized.includes('pâte') || normalized.includes('pate') || normalized.includes('riz') || normalized.includes('sel') || normalized.includes('poivre') || normalized.includes('épice')) {
    return 'epicerie-salee';
  }
  if (normalized.includes('boisson') || normalized.includes('eau') || normalized.includes('jus') || normalized.includes('soda') || normalized.includes('vin') || normalized.includes('bière') || normalized.includes('biere')) {
    return 'boissons';
  }
  if (normalized.includes('surgel') || normalized.includes('surgelé') || normalized.includes('congel')) {
    return 'surgeles';
  }
  
  // Recherche d'une correspondance directe
  for (const key of CATEGORIES_INGREDIENTS) {
    const detail = CATEGORY_DETAILS[key];
    if (normalized === key || normalized === detail.label.toLowerCase()) {
      return key;
    }
  }
  
  return 'epicerie-salee'; // Fallback par défaut (Épicerie Salée)
}

// Types étendus avec les relations Prisma (couramment utilisés dans l'application)
export type RepasWithIngredients = Repas & {
  ingredients: {
    id: number;
    nom: string;
    quantite: string | null;
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
