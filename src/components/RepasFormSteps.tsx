'use client';

import React from 'react';
import {
  Camera,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';
import IngredientSearchInput from '@/components/IngredientSearchInput';
import IngredientRow from '@/components/IngredientRow';
import CreateIngredientDrawer from '@/components/CreateIngredientDrawer';
import SortableStepsList from '@/components/SortableStepsList';
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

/**
 * Composant partagé qui rend le formulaire multi-étapes de création/modification
 * d'un repas : indicateur d'étape, barre de progression, erreurs, contenu de
 * chaque étape et boutons de navigation.
 *
 * Utilisé par les pages "Nouveau repas" et "Modifier un repas".
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
      <div className="bg-card-light dark:bg-card-dark border border-neutral-200/40 dark:border-neutral-800/40 rounded-card shadow-xs p-6 md:p-8 space-y-6">

        {/* ── Indicateur d'étape ── */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800/20">
          <span className="font-extrabold text-sm text-text-light-main dark:text-text-dark-main">
            Étape {step} sur 3
          </span>
          <span className="text-xs font-bold text-text-light-muted dark:text-text-dark-muted">
            {step === 1
              ? 'Identité du repas'
              : step === 2
              ? 'Ingrédients requis'
              : 'Mode de préparation'}
          </span>
        </div>

        {/* ── Barre de progression ── */}
        <div className="w-full bg-neutral-100 dark:bg-neutral-800/60 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-brand h-full transition-all duration-500 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* ── Notification d'erreur ── */}
        {error && (
          <div className="p-4 text-sm font-semibold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/40 animate-fade-in">
            {error}
          </div>
        )}

        {/* ── ÉTAPE 1 : Titre & Photo ── */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            {isModeIa && (
              <div className="p-4 text-sm font-semibold bg-brand-light dark:bg-brand/10 text-brand rounded-xl border border-brand/20 animate-fade-in flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>
                  Recette préremplie avec succès par l&apos;IA. Vous pouvez
                  maintenant la vérifier et la modifier.
                </span>
              </div>
            )}

            {/* Champ titre */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-light-main dark:text-text-dark-main">
                Nom du repas *
              </label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Ex: Tarte tatin, Filet mignon..."
                className="w-full px-5 py-3 text-sm transition-all border outline-none bg-bg-light dark:bg-bg-dark border-neutral-200 dark:border-neutral-800 rounded-xl focus:border-brand dark:focus:border-brand focus:ring-1 focus:ring-brand text-text-light-main dark:text-text-dark-main placeholder:text-text-light-muted dark:placeholder:text-text-dark-muted font-semibold"
              />
            </div>

            {/* Zone image */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-light-main dark:text-text-dark-main">
                Image d&apos;illustration (Optionnel)
              </label>

              {(localPreviewUrl || photoUrl) ? (
                /* Prévisualisation de l'image sélectionnée */
                <div className="relative w-full aspect-video rounded-card overflow-hidden group border border-neutral-200/30 dark:border-neutral-800/30">
                  <img
                    src={localPreviewUrl || photoUrl || ''}
                    alt="Aperçu"
                    className="w-full h-full object-cover"
                  />
                  {isUploading ? (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                      <span className="text-xs font-bold text-white animate-pulse">
                        Téléversement en cours...
                      </span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/45 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-white text-black text-xs font-bold rounded-input shadow-md hover:bg-neutral-100 transition-colors cursor-pointer"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-input shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Zone de dépôt */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-card p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[200px] ${
                    isDragging
                      ? 'border-brand bg-brand-light/30 dark:bg-brand/5 scale-[1.01]'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-brand/40 bg-neutral-50/50 dark:bg-neutral-800/10'
                  }`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-10 w-10 text-brand animate-spin" />
                      <span className="text-xs font-bold text-text-light-muted dark:text-text-dark-muted animate-pulse">
                        Téléversement de la photo...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-white dark:bg-neutral-800 rounded-full shadow-xs border border-neutral-100 dark:border-neutral-800 text-text-light-muted dark:text-text-dark-muted mb-3">
                        <Camera className="h-6 w-6 stroke-[1.5]" />
                      </div>
                      <span className="text-sm font-bold text-text-light-main dark:text-text-dark-main">
                        <span className="hidden md:inline">
                          Glissez-déposez une image ou c
                        </span>
                        <span className="md:hidden">C</span>
                        liquez pour parcourir
                      </span>
                      <span className="text-[11px] text-text-light-muted dark:text-text-dark-muted mt-1.5 font-medium">
                        Formats acceptés : PNG, JPG, WEBP
                      </span>
                    </>
                  )}
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={isUploading}
              />
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 : Ingrédients ── */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <IngredientSearchInput
              onSelect={handleSelectIngredient}
              onCreateNew={openCreateIngredientDrawer}
              existingIngredients={selectedIngredients}
            />

            <div className="space-y-3">
              <span className="text-sm font-bold text-text-light-main dark:text-text-dark-main block">
                Ingrédients dans cette recette ({selectedIngredients.length})
              </span>

              {selectedIngredients.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/10 dark:bg-neutral-800/5">
                  <p className="text-xs font-semibold text-text-light-muted dark:text-text-dark-muted">
                    Aucun ingrédient sélectionné. Utilisez la barre de recherche
                    ci-dessus pour les ajouter.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/40">
                  {selectedIngredients.map((ing) => (
                    <IngredientRow
                      key={ing.id}
                      ingredient={ing}
                      onChange={updateMealIngredient}
                      onRemove={handleRemoveIngredient}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Instructions de préparation ── */}
        {step === 3 && (
          <div className="animate-fade-in">
            <SortableStepsList steps={steps} onChange={setSteps} />
          </div>
        )}

        {/* ── Boutons de navigation ── */}
        <div className="flex flex-col gap-2.5 pt-6 border-t border-neutral-100 dark:border-neutral-800/40 mt-4 w-full">
          {/* Bouton principal : Suivant ou Valider */}
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 rounded-input active:scale-95 transition-all duration-300 cursor-pointer shadow-xs"
            >
              <span>Suivant</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-extrabold bg-brand hover:bg-brand-hover text-white rounded-input active:scale-95 transition-all duration-300 cursor-pointer shadow-md shadow-brand/20 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{submitLoadingLabel}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{submitLabel}</span>
                </>
              )}
            </button>
          )}

          {/* Bouton secondaire : Précédent ou Annuler */}
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold border border-neutral-200 dark:border-neutral-800 rounded-input hover:bg-neutral-50 dark:hover:bg-neutral-800 text-text-light-main dark:text-text-dark-main active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Précédent</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold border border-neutral-200 dark:border-neutral-800 rounded-input hover:bg-neutral-50 dark:hover:bg-neutral-800 text-text-light-main dark:text-text-dark-main active:scale-95 transition-all duration-300 cursor-pointer text-center"
            >
              <span>Annuler</span>
            </button>
          )}
        </div>
      </div>

      {/* Drawer de création d'un ingrédient manquant à la volée */}
      <CreateIngredientDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        initialName={newIngredientInitialName}
        onCreated={handleIngredientCreated}
      />
    </>
  );
}
