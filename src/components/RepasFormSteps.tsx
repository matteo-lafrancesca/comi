'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import IngredientSearchInput from '@/components/IngredientSearchInput';
import IngredientRow from '@/components/IngredientRow';
import CreateIngredientDrawer from '@/components/CreateIngredientDrawer';
import SortableStepsList from '@/components/SortableStepsList';
import ImageDropzone from '@/components/ImageDropzone';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import TextInput from '@/components/ui/TextInput';
import type { RepasForm } from '@/hooks/useRepasForm';

interface RepasFormStepsProps {
  /** Formulaire issu de useRepasForm */
  form: RepasForm;
  /** Texte du bouton de validation finale (ex: "Créer la recette") */
  submitLabel: string;
  /** Texte du bouton pendant le chargement (ex: "Enregistrement...") */
  submitLoadingLabel: string;
  /** Callback déclenché au clic sur le bouton de validation finale (étape 3) */
  onSubmit: () => Promise<void>;
  /** Callback du bouton "Annuler" affiché à l'étape 1 */
  onCancel: () => void;
  /** Affiche le bandeau de confirmation IA à l'étape 1 (uniquement pour la page nouveau) */
  isModeIa?: boolean;
  /** Affiche le bouton de validation à chaque étape (édition), « Suivant » devenant secondaire */
  submitOnEveryStep?: boolean;
}

const STEP_LABELS = ['Le plat', 'Ingrédients', 'Préparation'] as const;

/**
 * Formulaire multi-étapes partagé par les pages « Nouveau repas » et « Modifier un repas » :
 * repère d'étape, erreurs, contenu de chaque étape et navigation.
 */
export default function RepasFormSteps({
  form,
  submitLabel,
  submitLoadingLabel,
  onSubmit,
  onCancel,
  isModeIa = false,
  submitOnEveryStep = false,
}: RepasFormStepsProps) {
  const { step, error, loading, image } = form;

  return (
    <>
      <div className="space-y-8">
        {/* Repère d'étape */}
        <ol className="flex items-baseline gap-5 border-b border-neutral-200 dark:border-neutral-800 pb-3">
          {STEP_LABELS.map((label, idx) => {
            const n = idx + 1;
            const current = n === step;
            return (
              <li
                key={label}
                className={`flex items-baseline gap-1.5 ${
                  current ? 'text-text-light-main dark:text-text-dark-main' : 'text-text-light-muted dark:text-text-dark-muted'
                }`}
              >
                <span className={`font-display italic ${current ? 'text-2xl' : 'text-base'}`}>{n}</span>
                <span className={`text-sm ${current ? 'font-semibold' : 'hidden sm:inline'}`}>{label}</span>
              </li>
            );
          })}
        </ol>

        {error && <Alert>{error}</Alert>}

        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            {isModeIa && <Alert tone="info">Recette préremplie par l&apos;IA : relisez et corrigez avant d&apos;enregistrer.</Alert>}

            <TextInput
              label="Nom du repas"
              value={form.titre}
              onChange={(e) => form.setTitre(e.target.value)}
              placeholder="Tarte tatin, filet mignon…"
              className="font-display text-2xl"
            />

            <ImageDropzone {...image.dropzoneProps} busy={image.isUploading} busyLabel="Téléversement de la photo…" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
            <IngredientSearchInput
              onSelect={form.addIngredient}
              onCreateNew={form.openNewIngredient}
              existingIngredients={form.ingredients}
            />

            <section>
              <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">
                Dans la recette ({form.ingredients.length})
              </h2>
              {form.ingredients.length === 0 ? (
                <p className="py-4 text-sm text-text-light-muted dark:text-text-dark-muted">
                  Cherchez un ingrédient ci-dessus pour l&apos;ajouter.
                </p>
              ) : (
                <div className="divide-y divide-dashed divide-neutral-300 dark:divide-neutral-700">
                  {form.ingredients.map((ing) => (
                    <IngredientRow key={ing.id} ingredient={ing} onChange={form.updateIngredient} onRemove={form.removeIngredient} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <SortableStepsList steps={form.steps} onChange={form.setSteps} />
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="ghost" onClick={step > 1 ? form.prev : onCancel}>
            {step > 1 ? 'Précédent' : 'Annuler'}
          </Button>

          <div className="flex items-center gap-3">
            {step < 3 && (
              <Button variant={submitOnEveryStep ? 'secondary' : 'primary'} onClick={form.next}>
                Suivant
              </Button>
            )}
            {(step === 3 || submitOnEveryStep) && (
              <Button onClick={onSubmit} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? submitLoadingLabel : submitLabel}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Création d'un ingrédient manquant à la volée */}
      <CreateIngredientDrawer
        isOpen={form.newIngredientName !== null}
        onClose={form.closeNewIngredient}
        initialName={form.newIngredientName ?? ''}
        onCreated={form.addIngredient}
      />
    </>
  );
}
