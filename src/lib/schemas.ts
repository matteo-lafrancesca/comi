import { z } from 'zod';
import { isValidWeekRef, isValidYmd } from '@/lib/date-utils';

/**
 * Schémas d'entrée des routes API, partagés avec le client (types `RepasPayload`…).
 * Ils ne font que valider : le nettoyage (trim, quantité numérique) est fait par `repas-input.ts`.
 */

// ── Repas ──────────────────────────────────────────────────────────────────

const NOM_INGREDIENT = 'Chaque ingrédient doit comporter un nom valide.';
const CATEGORIE_INGREDIENT = 'Chaque ingrédient doit comporter une catégorie valide.';
const TITRE_REPAS = 'Le titre du repas est obligatoire.';

export const ingredientInputSchema = z.object({
  nom: z.string({ error: NOM_INGREDIENT }).trim().min(1, NOM_INGREDIENT),
  categorie: z.string({ error: CATEGORIE_INGREDIENT }).trim().min(1, CATEGORIE_INGREDIENT),
  quantite: z.union([z.number(), z.string()]).nullish(),
  unite: z.string().nullish(),
});

export const repasInputSchema = z.object({
  titre: z.string({ error: TITRE_REPAS }).trim().min(1, TITRE_REPAS),
  recette: z.string().nullish(),
  photoUrl: z.string().nullish(),
  ingredients: z
    .array(ingredientInputSchema, { error: 'Les ingrédients doivent être fournis sous forme de tableau.' })
    .optional(),
});

/** PATCH : tous les champs sont facultatifs, seuls ceux fournis sont modifiés. */
export const repasPatchSchema = repasInputSchema.partial();

export type IngredientPayload = z.input<typeof ingredientInputSchema>;
export type RepasPayload = z.input<typeof repasInputSchema>;

// ── Ingrédients ────────────────────────────────────────────────────────────

const NOM_REQUIS = "Le nom de l'ingrédient est obligatoire.";
const CATEGORIE_REQUISE = "La catégorie de l'ingrédient est obligatoire.";

export const createIngredientSchema = z.object({
  nom: z.string({ error: NOM_REQUIS }).trim().min(1, NOM_REQUIS),
  categorie: z.string({ error: CATEGORIE_REQUISE }).trim().min(1, CATEGORIE_REQUISE),
});

// ── Planning ───────────────────────────────────────────────────────────────

const DATE_INVALIDE = 'Format de date invalide (AAAA-MM-JJ attendu).';
const ymd = z.string({ error: DATE_INVALIDE }).refine(isValidYmd, DATE_INVALIDE);
const heure = z.union([z.literal(0), z.literal(1)], { error: "L'heure doit être 0 (midi) ou 1 (soir)." });

export const createProgrammationSchema = z.object({
  repasId: z.number({ error: 'Paramètres manquants ou invalides (repasId, date, heure).' }),
  date: ymd,
  heure,
});

export const updateProgrammationSchema = z
  .object({ repasId: z.number({ error: 'repasId doit être un nombre.' }), date: ymd, heure })
  .partial();

// ── Réglages ───────────────────────────────────────────────────────────────

const WEEK_START = 'weekStartDay doit être un entier entre 0 (Lundi) et 6 (Dimanche).';

export const settingsSchema = z.object({
  weekStartDay: z.number({ error: WEEK_START }).int(WEEK_START).min(0, WEEK_START).max(6, WEEK_START).optional(),
});

// ── Liste de courses ───────────────────────────────────────────────────────

export const checkItemsSchema = z.object({
  items: z.array(
    z.object(
      { id: z.number(), isChecked: z.boolean() },
      { error: 'Chaque élément doit comporter un id (nombre) et un champ isChecked (booléen).' }
    ),
    { error: "Le paramètre 'items' doit être un tableau." }
  ),
});

export const createExtraSchema = z
  .object({
    week: z.number(),
    year: z.number(),
    repasId: z.union([z.number(), z.string()]).optional(),
    ingredientName: z.string().optional(),
    categorie: z.string().nullish(),
    quantite: z.union([z.number(), z.string()]).nullish(),
    unite: z.string().nullish(),
  })
  .refine((v) => isValidWeekRef(v), {
    message: 'Les paramètres week et year sont obligatoires et doivent désigner une semaine valide.',
    path: ['week'],
  });
