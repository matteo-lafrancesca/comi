'use client';

import { useReducer, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import type { RepasPayload } from '@/lib/schemas';
import { emptyValues, formReducer, valuesToPayload, validateStep, type FormStep, type RepasFormValues } from '@/lib/repas-form';
import type { IngredientSuggestion, StepItem } from '@/types';
import { useImageUpload } from './useImageUpload';

export interface RepasFormInit {
  values?: RepasFormValues;
  step?: FormStep;
  /** Photo déjà enregistrée (modification) */
  photoUrl?: string | null;
}

/**
 * Formulaire de repas en 3 étapes (le plat, ingrédients, préparation), partagé par « nouveau »
 * et « modifier ». L'état est un reducer (`lib/repas-form.ts`) : les composants n'exposent que des
 * actions nommées, jamais de setter brut. L'état initial est fourni au montage : le formulaire se
 * monte une fois ses données prêtes, sans effet de chargement.
 */
export function useRepasForm(init: RepasFormInit = {}) {
  const [state, dispatch] = useReducer(formReducer, init, (i) => ({
    step: i.step ?? 1,
    values: i.values ?? emptyValues(),
  }));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** Nom à pré-remplir dans le drawer « Nouvel ingrédient » ; null = fermé */
  const [newIngredientName, setNewIngredientName] = useState<string | null>(null);
  const image = useImageUpload({ initialUrl: init.photoUrl, onError: setError });

  const { step, values } = state;

  const goTo = (target: FormStep) => dispatch({ type: 'goTo', step: target });

  return {
    step,
    titre: values.titre,
    ingredients: values.ingredients,
    steps: values.steps,
    error,
    loading,
    image,

    setError,
    setTitre: (titre: string) => dispatch({ type: 'setTitre', titre }),
    setSteps: (steps: StepItem[]) => dispatch({ type: 'setSteps', steps }),
    addIngredient: (ingredient: IngredientSuggestion) => dispatch({ type: 'addIngredient', ingredient }),
    removeIngredient: (id: string) => dispatch({ type: 'removeIngredient', id }),
    updateIngredient: (id: string, field: 'quantite' | 'unite', value: string) =>
      dispatch({ type: 'updateIngredient', id, field, value }),
    /** Remplace tout le contenu (proposition de l'IA) et revient à la première étape. */
    replaceValues: (next: RepasFormValues) => {
      setError(null);
      dispatch({ type: 'replace', values: next });
    },

    next: () => {
      const message = validateStep(step, values);
      setError(message);
      if (!message) goTo((step + 1) as FormStep);
    },
    prev: () => {
      setError(null);
      goTo((step - 1) as FormStep);
    },

    newIngredientName,
    openNewIngredient: setNewIngredientName,
    closeNewIngredient: () => setNewIngredientName(null),

    /** Contenu courant, pour le brouillon. */
    values,

    /**
     * Envoie la photo si besoin, puis appelle `send` avec le corps de requête.
     * Gère l'état de chargement et l'erreur affichée.
     */
    submit: async (send: (payload: RepasPayload) => Promise<void>) => {
      setLoading(true);
      setError(null);
      try {
        let photoUrl: string | null;
        try {
          photoUrl = await image.uploadIfNeeded();
        } catch (err) {
          throw new Error(`Échec du traitement/téléversement de l'image: ${errorMessage(err, String(err))}`);
        }
        await send(valuesToPayload(values, photoUrl));
      } catch (err) {
        setError(errorMessage(err, 'Une erreur inattendue est survenue.'));
      } finally {
        setLoading(false);
      }
    },
  };
}

export type RepasForm = ReturnType<typeof useRepasForm>;
