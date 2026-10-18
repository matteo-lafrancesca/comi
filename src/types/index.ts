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
import type { Ymd, WeekRef } from '@/lib/date-utils';

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
  'surgeles': { label: 'Surgelés', order: 9 },
  'hygiene': { label: 'Hygiène & Entretien', order: 10 }
} as const;

export const CATEGORIES_INGREDIENTS = Object.keys(CATEGORY_DETAILS) as Array<keyof typeof CATEGORY_DETAILS>;
export type CategorieIngredient = keyof typeof CATEGORY_DETAILS;



// Types étendus avec les relations Prisma (couramment utilisés dans l'application)
/** Sans `userId` : l'id interne d'un utilisateur ne quitte jamais le serveur (voir `FriendSummary.id`). */
export type RepasWithIngredients = Omit<Repas, 'userId'> & {
  /** Auteur, si c'est la recette d'un ami (null pour mes propres repas) */
  owner: FriendSummary | null;
  /** Nombre d'amis qui l'ont dans leur carnet (connu de l'auteur seulement, 0 sinon) */
  savedCount: number;
  ingredients: {
    id: number;
    nom: string;
    quantite: number | null;
    unite: string | null;
    categorie: CategorieIngredient;
  }[];
};

/** Repas programmé tel que renvoyé par l'API planning (date calendaire « AAAA-MM-JJ »). */
export interface ProgrammationWithRepas {
  id: number;
  repasId: number;
  date: Ymd;
  /** 0 = midi, 1 = soir */
  heure: 0 | 1;
  repas: RepasWithIngredients;
}

/** Semaine telle que calculée par le serveur : le client n'a aucun calcul de date à faire. */
export interface WeekInfo extends WeekRef {
  /** Jour de début de semaine utilisé pour ce calcul (0 = lundi … 6 = dimanche) */
  weekStartDay: number;
  start: Ymd;
  end: Ymd;
  /** Les 7 jours, dans l'ordre d'affichage */
  days: Ymd[];
  prev: WeekRef;
  next: WeekRef;
}

export interface PlanningResponse extends WeekInfo {
  programmations: ProgrammationWithRepas[];
}

export interface ShoppingListResponse extends WeekInfo {
  categories: CategoryGroup[];
  extras: ShoppingListExtraItem[];
}

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


// ── Types du formulaire de repas ────────────────────────────────────────────

/** Ingrédient proposé par la recherche / renvoyé par la création (`/api/ingredients`). */
export interface IngredientSuggestion {
  id: number;
  nom: string;
  categorie: string;
}

/** Ligne d'ingrédient éditée dans le formulaire (quantité et unité en texte tel que saisi). */
export interface IngredientRowItem {
  /** Clé unique côté client */
  id: string;
  ingredientId?: number;
  nom: string;
  quantite: string;
  unite: string;
  categorie: CategorieIngredient;
}

/** Une étape de préparation éditée dans le formulaire. */
export interface StepItem {
  id: string;
  text: string;
}

// ── Amis ────────────────────────────────────────────────────────────────────

/** Ce qu'un utilisateur montre aux autres : jamais son e-mail. */
export interface FriendSummary {
  /** Identifiant public (`User.publicId`), jamais l'id en base */
  id: string;
  pseudo: string;
  photoUrl: string | null;
}

/** Un ami et quelques-unes de ses recettes publiques (vitrine). */
export interface FriendCard extends FriendSummary {
  vitrine: { id: number; titre: string; photoUrl: string | null }[];
  /** Nombre total de ses recettes publiques */
  recipeCount: number;
}

/** Lien avec un autre utilisateur, vu par l'utilisateur connecté. */
export type FriendRelation = 'none' | 'sent' | 'received' | 'friend';

/** Résultat de la recherche par pseudo, avec la demande en cours (pour accepter / annuler sur place). */
export interface UserSearchResult extends FriendSummary {
  relation: FriendRelation;
  requestId: number | null;
}

/** Demande d'ami en attente ; `user` est l'autre personne (expéditeur ou destinataire). */
export interface FriendRequest {
  id: number;
  user: FriendSummary;
  createdAt: Date;
}

export interface FriendRequestsResponse {
  received: FriendRequest[];
  sent: FriendRequest[];
}

/** Profil d'un ami : ses recettes publiques, en précisant celles déjà dans mon carnet. */
export interface FriendProfile extends FriendSummary {
  repas: (RepasWithIngredients & { savedByMe: boolean })[];
}
