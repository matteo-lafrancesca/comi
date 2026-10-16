import { normalizeCategory } from '@/lib/category-utils';
import type { RepasPayload } from '@/lib/schemas';
import type { IngredientRowItem, IngredientSuggestion, RepasWithIngredients, StepItem } from '@/types';

/**
 * Logique pure du formulaire de repas (état, mappers, brouillon) : aucun React, aucun réseau,
 * donc testable directement (`tests/repas-form.test.ts`). Les hooks `useRepasForm` / `useImageUpload`
 * ne font que la brancher à React.
 */

export type FormStep = 1 | 2 | 3;

/** Contenu éditable du formulaire (la photo est gérée à part par `useImageUpload`). */
export interface RepasFormValues {
  titre: string;
  ingredients: IngredientRowItem[];
  steps: StepItem[];
}

export interface RepasFormState {
  step: FormStep;
  values: RepasFormValues;
}

// ── État ────────────────────────────────────────────────────────────────────

export const newStep = (text = ''): StepItem => ({ id: crypto.randomUUID(), text });

export const emptyValues = (): RepasFormValues => ({ titre: '', ingredients: [], steps: [newStep()] });

export type FormAction =
  | { type: 'setTitre'; titre: string }
  | { type: 'setSteps'; steps: StepItem[] }
  | { type: 'addIngredient'; ingredient: IngredientSuggestion }
  | { type: 'removeIngredient'; id: string }
  | { type: 'updateIngredient'; id: string; field: 'quantite' | 'unite'; value: string }
  | { type: 'goTo'; step: FormStep }
  | { type: 'replace'; values: RepasFormValues };

export function formReducer(state: RepasFormState, action: FormAction): RepasFormState {
  const { values } = state;
  switch (action.type) {
    case 'setTitre':
      return { ...state, values: { ...values, titre: action.titre } };
    case 'setSteps':
      return { ...state, values: { ...values, steps: action.steps } };
    case 'addIngredient': {
      const { ingredient } = action;
      const exists = values.ingredients.some(
        (item) => item.ingredientId === ingredient.id || item.nom.toLowerCase() === ingredient.nom.toLowerCase()
      );
      if (exists) return state;
      const row: IngredientRowItem = {
        id: crypto.randomUUID(),
        ingredientId: ingredient.id,
        nom: ingredient.nom,
        quantite: '',
        unite: '',
        categorie: normalizeCategory(ingredient.categorie),
      };
      return { ...state, values: { ...values, ingredients: [...values.ingredients, row] } };
    }
    case 'removeIngredient':
      return { ...state, values: { ...values, ingredients: values.ingredients.filter((i) => i.id !== action.id) } };
    case 'updateIngredient':
      return {
        ...state,
        values: {
          ...values,
          ingredients: values.ingredients.map((i) => (i.id === action.id ? { ...i, [action.field]: action.value } : i)),
        },
      };
    case 'goTo':
      return { ...state, step: action.step };
    case 'replace':
      return { step: 1, values: action.values };
  }
}

/** Message d'erreur si l'étape ne peut pas être quittée, sinon null. */
export function validateStep(step: FormStep, values: RepasFormValues): string | null {
  if (step === 1 && !values.titre.trim()) return 'Le titre du repas est obligatoire.';
  return null;
}

// ── Mappers ─────────────────────────────────────────────────────────────────

const toStepItems = (lines: string[]): StepItem[] => {
  const steps = lines.filter((l) => l.trim() !== '').map((text) => newStep(text));
  return steps.length > 0 ? steps : [newStep()];
};

/** Repas existant (réponse API) -> valeurs du formulaire de modification. */
export function repasToValues(repas: RepasWithIngredients): RepasFormValues {
  return {
    titre: repas.titre,
    ingredients: repas.ingredients.map((ing) => ({
      id: crypto.randomUUID(),
      ingredientId: ing.id,
      nom: ing.nom,
      quantite: ing.quantite !== null && ing.quantite !== undefined ? String(ing.quantite) : '',
      unite: ing.unite ?? '',
      categorie: ing.categorie,
    })),
    steps: toStepItems((repas.recette ?? '').split('\n')),
  };
}

/** Réponse de `/api/repas/analyser`. */
export interface AnalysisResult {
  titre?: string;
  ingredients?: { nom: string; quantite?: number | null; unite?: string | null; categorie: string }[];
  recette?: string[];
}

/** Proposition de l'IA -> valeurs du formulaire (à relire par l'utilisateur). */
export function analysisToValues(data: AnalysisResult): RepasFormValues {
  return {
    titre: data.titre ?? '',
    ingredients: (data.ingredients ?? []).map((ing) => ({
      id: crypto.randomUUID(),
      nom: ing.nom,
      quantite: ing.quantite !== null && ing.quantite !== undefined ? String(ing.quantite) : '',
      unite: ing.unite ?? '',
      categorie: normalizeCategory(ing.categorie),
    })),
    steps: toStepItems(data.recette ?? []),
  };
}

/** Valeurs du formulaire -> corps des requêtes POST / PATCH `/api/repas`. */
export function valuesToPayload(values: RepasFormValues, photoUrl: string | null): RepasPayload {
  return {
    titre: values.titre.trim(),
    recette: values.steps.map((s) => s.text.trim()).filter(Boolean).join('\n') || null,
    photoUrl,
    ingredients: values.ingredients.map((ing) => {
      const quantite = Number.parseFloat(ing.quantite);
      return {
        nom: ing.nom.trim(),
        quantite: Number.isNaN(quantite) ? null : quantite,
        unite: ing.unite.trim() || null,
        categorie: ing.categorie,
      };
    }),
  };
}

// ── Brouillon (localStorage) ────────────────────────────────────────────────

/** Brouillon d'une nouvelle recette : survit à un rechargement ; la photo n'est pas conservée. */
export interface RepasDraft {
  mode: 'manuel' | 'ia_form';
  step: FormStep;
  values: RepasFormValues;
}

const DRAFT_KEY = 'comi:repas-draft';

/** Lit un brouillon sérialisé (format plat) ; renvoie null s'il est absent ou invalide. */
export function parseDraft(raw: string | null): RepasDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || (d.mode !== 'manuel' && d.mode !== 'ia_form')) return null;
    return {
      mode: d.mode,
      step: d.step === 2 || d.step === 3 ? d.step : 1,
      values: {
        titre: typeof d.titre === 'string' ? d.titre : '',
        ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
        steps: Array.isArray(d.steps) && d.steps.length > 0 ? d.steps : [newStep()],
      },
    };
  } catch {
    return null;
  }
}

export const serializeDraft = ({ mode, step, values }: RepasDraft) => JSON.stringify({ mode, step, ...values });

export function loadDraft(): RepasDraft | null {
  try {
    return parseDraft(localStorage.getItem(DRAFT_KEY));
  } catch {
    return null;
  }
}

export function saveDraft(draft: RepasDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, serializeDraft(draft));
  } catch {
    // stockage indisponible (navigation privée…) : le brouillon est un confort, pas une garantie
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}
