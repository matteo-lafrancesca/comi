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
import type { RepasFormReturn } from '@/hooks/useRepasForm';

interface RepasFormStepsProps {
  /** Tout l'état et les handlers issus de useRepasForm */
  form: RepasFormReturn;
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
}: RepasFormStepsProps) {
  const {
    step,
    error,
    loading,
    titre,
    setTitre,
    photoUrl,
    localPreviewUrl,
    isDragging,
    fileInputRef,
    isUploading,
    selectedIngredients,
    isCreateDrawerOpen,
    setIsCreateDrawerOpen,
    newIngredientInitialName,
    steps,
    setSteps,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeImage,
    handleNext,
    handlePrev,
    handleSelectIngredient,
    handleRemoveIngredient,
    updateMealIngredient,
    openCreateIngredientDrawer,
    handleIngredientCreated,
  } = form;

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
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Tarte tatin, filet mignon…"
              className="font-display text-2xl"
            />

            <ImageDropzone
              previewUrl={localPreviewUrl || photoUrl}
              busy={isUploading}
              busyLabel="Téléversement de la photo…"
              isDragging={isDragging}
              inputRef={fileInputRef}
              onFileChange={handleFileChange}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onRemove={removeImage}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
            <IngredientSearchInput
              onSelect={handleSelectIngredient}
              onCreateNew={openCreateIngredientDrawer}
              existingIngredients={selectedIngredients}
            />

            <section>
              <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">
                Dans la recette ({selectedIngredients.length})
              </h2>
              {selectedIngredients.length === 0 ? (
                <p className="py-4 text-sm text-text-light-muted dark:text-text-dark-muted">
                  Cherchez un ingrédient ci-dessus pour l&apos;ajouter.
                </p>
              ) : (
                <div className="divide-y divide-dashed divide-neutral-300 dark:divide-neutral-700">
                  {selectedIngredients.map((ing) => (
                    <IngredientRow key={ing.id} ingredient={ing} onChange={updateMealIngredient} onRemove={handleRemoveIngredient} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <SortableStepsList steps={steps} onChange={setSteps} />
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="ghost" onClick={step > 1 ? handlePrev : onCancel}>
            {step > 1 ? 'Précédent' : 'Annuler'}
          </Button>

          {step < 3 ? (
            <Button onClick={handleNext}>Suivant</Button>
          ) : (
            <Button onClick={onSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? submitLoadingLabel : submitLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Création d'un ingrédient manquant à la volée */}
      <CreateIngredientDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        initialName={newIngredientInitialName}
        onCreated={handleIngredientCreated}
      />
    </>
  );
}
