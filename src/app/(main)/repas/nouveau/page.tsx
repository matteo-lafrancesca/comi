'use client';

import React, { useState } from 'react';
import { errorMessage } from '@/lib/errors';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Camera,
  Loader2,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { compressImage } from '@/lib/image-compression';
import { useNavigationCache } from '@/contexts/NavigationCacheContext';
import { useRepasForm } from '@/hooks/useRepasForm';
import RepasFormSteps from '@/components/RepasFormSteps';
import { apiFetch } from '@/lib/api';

export default function NouveauRepasPage() {
  const router = useRouter();
  const { invalidateRepasCache } = useNavigationCache();
  const form = useRepasForm();
  const { fileInputRef, handleFileChange, selectedImageFile } = form;

  // État propre à cette page
  const [creationMode, setCreationMode] = useState<null | 'manuel' | 'ia_upload' | 'ia_form'>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ── Analyse de l'image par l'IA ──────────────────────────────────────────

  const handleAnalyzeImage = async () => {
    if (!selectedImageFile) return;

    try {
      setIsAnalyzing(true);
      form.setError(null);

      const compressedFile = await compressImage(selectedImageFile);

      const formData = new FormData();
      formData.append('image', compressedFile);
      if (form.titre.trim()) {
        formData.append('titre', form.titre.trim());
      }

      const res = await apiFetch('/api/repas/analyser', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Une erreur est survenue lors de l'analyse.");
      }

      const data = await res.json();

      form.setTitre(data.titre || '');

      if (data.ingredients && Array.isArray(data.ingredients)) {
        form.setSelectedIngredients(
          data.ingredients.map((ing: { nom: string; quantite: number | null | undefined; unite: string | null; categorie: string }) => ({
            id: crypto.randomUUID(),
            nom: ing.nom,
            quantite:
              ing.quantite !== null && ing.quantite !== undefined
                ? String(ing.quantite)
                : '',
            unite: ing.unite || '',
            categorie: ing.categorie,
          }))
        );
      } else {
        form.setSelectedIngredients([]);
      }

      if (data.recette && Array.isArray(data.recette)) {
        const mappedSteps = data.recette.map((stepText: string) => ({
          id: crypto.randomUUID(),
          text: stepText,
        }));
        form.setSteps(
          mappedSteps.length > 0 ? mappedSteps : [{ id: 'init-step-1', text: '' }]
        );
      } else {
        form.setSteps([{ id: 'init-step-1', text: '' }]);
      }

      setCreationMode('ia_form');
      form.setStep(1);
    } catch (err) {
      form.setError(err instanceof Error ? err.message : "Impossible d'analyser l'image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Soumission (POST /api/repas) ─────────────────────────────────────────

  const handleSubmit = async () => {
    try {
      form.setLoading(true);
      form.setError(null);

      let finalPhotoUrl: string | null;
      try {
        finalPhotoUrl = await form.uploadImageIfNeeded();
      } catch (err) {
        throw new Error(
          `Échec du traitement/téléversement de l'image: ${errorMessage(err, String(err))}`
        );
      }

      const payload = form.buildSubmitPayload();

      const res = await apiFetch('/api/repas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, photoUrl: finalPhotoUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la création du repas.');
      }

      invalidateRepasCache();
      router.push('/repas');
    } catch (err) {
      form.setError(errorMessage(err, 'Une erreur inattendue est survenue.'));
    } finally {
      form.setLoading(false);
    }
  };

  // ── Écran de choix du mode de création ──────────────────────────────────

  if (creationMode === null) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/repas"
            className="p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-text-light-muted dark:text-text-dark-muted transition-colors active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="text-xs font-bold text-text-light-muted dark:text-text-dark-muted uppercase tracking-wider">
              Mes recettes
            </span>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-light-main dark:text-text-dark-main">
              Créer un repas
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Carte : ajout manuel */}
          <button
            type="button"
            onClick={() => setCreationMode('manuel')}
            className="flex flex-col items-center justify-center p-8 bg-card-light dark:bg-card-dark border border-neutral-200/40 dark:border-neutral-800/40 rounded-card shadow-xs hover:shadow-md active:scale-95 transition-all duration-300 cursor-pointer group min-h-[250px] text-center"
          >
            <div className="p-5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-text-light-muted dark:text-text-dark-muted mb-4 group-hover:bg-brand/10 group-hover:text-brand transition-colors duration-300">
              <Plus className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="text-lg font-bold text-text-light-main dark:text-text-dark-main mb-2">
              Ajouter manuellement
            </h3>
            <p className="text-xs font-semibold text-text-light-muted dark:text-text-dark-muted max-w-xs leading-relaxed">
              Saisissez vous-même la recette complète.
            </p>
          </button>

          {/* Carte : analyse IA */}
          <button
            type="button"
            onClick={() => setCreationMode('ia_upload')}
            className="flex flex-col items-center justify-center p-8 bg-card-light dark:bg-card-dark border border-neutral-200/40 dark:border-neutral-800/40 rounded-card shadow-xs hover:shadow-md active:scale-95 transition-all duration-300 cursor-pointer group min-h-[250px] text-center"
          >
            <div className="p-5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-text-light-muted dark:text-text-dark-muted mb-4 group-hover:bg-brand/10 group-hover:text-brand transition-colors duration-300 relative">
              <Camera className="h-8 w-8 stroke-[1.5]" />
              <Sparkles className="h-4 w-4 text-brand absolute top-3 right-3 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-text-light-main dark:text-text-dark-main mb-2">
              Analyse photo par IA
            </h3>
            <p className="text-xs font-semibold text-text-light-muted dark:text-text-dark-muted max-w-xs leading-relaxed">
              Prenez une photo ou importez-la pour que l&apos;IA génère et
              remplisse la recette automatiquement.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // ── Écran d'upload pour l'analyse IA ────────────────────────────────────

  if (creationMode === 'ia_upload') {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              form.setError(null);
              form.setTitre('');
              setCreationMode(null);
            }}
            className="p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-text-light-muted dark:text-text-dark-muted transition-colors active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="text-xs font-bold text-text-light-muted dark:text-text-dark-muted uppercase tracking-wider">
              Analyse photo par IA
            </span>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-light-main dark:text-text-dark-main">
              Importer la photo du plat
            </h1>
          </div>
        </div>

        <div className="bg-card-light dark:bg-card-dark border border-neutral-200/40 dark:border-neutral-800/40 rounded-card shadow-xs p-6 md:p-8 space-y-6">
          {form.error && (
            <div className="p-4 text-sm font-semibold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/40 animate-fade-in">
              {form.error}
            </div>
          )}

          {/* Champ titre facultatif pour aider l'IA */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-light-muted dark:text-text-dark-muted">
              Nom du plat (facultatif)
            </label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) => form.setTitre(e.target.value)}
              placeholder="Ex: Pâtes carbonara, Tarte aux pommes..."
              disabled={isAnalyzing}
              className="w-full px-5 py-3 text-sm transition-all border outline-none bg-bg-light dark:bg-bg-dark border-neutral-200 dark:border-neutral-800 rounded-xl focus:border-brand dark:focus:border-brand focus:ring-1 focus:ring-brand text-text-light-main dark:text-text-dark-main placeholder:text-text-light-muted dark:placeholder:text-text-dark-muted font-semibold"
            />
          </div>

          {/* Zone de dépôt / prévisualisation */}
          <div className="space-y-2">
            {(form.localPreviewUrl || form.photoUrl) ? (
              <div className="relative w-full aspect-video rounded-card overflow-hidden group border border-neutral-200/30 dark:border-neutral-800/30">
                <img
                  src={form.localPreviewUrl || form.photoUrl || ''}
                  alt="Aperçu"
                  className="w-full h-full object-cover"
                />
                {isAnalyzing ? (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-10 w-10 text-brand animate-spin" />
                    <span className="text-sm font-bold text-white animate-pulse">
                      L&apos;IA analyse votre plat, veuillez patienter...
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
                      onClick={form.removeImage}
                      className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-input shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div
                onDragOver={form.handleDragOver}
                onDragLeave={form.handleDragLeave}
                onDrop={form.handleDrop}
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-card p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[250px] ${
                  form.isDragging
                    ? 'border-brand bg-brand-light/30 dark:bg-brand/5 scale-[1.01]'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-brand/40 bg-neutral-50/50 dark:bg-neutral-800/10'
                }`}
              >
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
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={isAnalyzing}
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col gap-2.5 pt-6 border-t border-neutral-100 dark:border-neutral-800/40 w-full">
            <button
              type="button"
              onClick={handleAnalyzeImage}
              disabled={!selectedImageFile || isAnalyzing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-brand hover:bg-brand-hover text-ink rounded-input active:scale-95 transition-all duration-300 cursor-pointer shadow-md shadow-brand/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyse en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Lancer l&apos;analyse par l&apos;IA</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                form.setError(null);
                form.setTitre('');
                setCreationMode(null);
              }}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold border border-neutral-200 dark:border-neutral-800 rounded-input hover:bg-neutral-50 dark:hover:bg-neutral-800 text-text-light-main dark:text-text-dark-main active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50"
            >
              <span>Précédent</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulaire multi-étapes (mode manuel ou ia_form) ─────────────────────

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            form.reset();
            setCreationMode(null);
          }}
          className="p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-text-light-muted dark:text-text-dark-muted transition-colors active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <span className="text-xs font-bold text-text-light-muted dark:text-text-dark-muted uppercase tracking-wider">
            Mes recettes {creationMode === 'ia_form' && '• IA'}
          </span>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-light-main dark:text-text-dark-main">
            Créer un repas {creationMode === 'ia_form' && "avec l'IA"}
          </h1>
        </div>
      </div>

      <RepasFormSteps
        form={form}
        submitLabel="Créer la recette"
        submitLoadingLabel={
          selectedImageFile && !form.photoUrl
            ? "Envoi de l'image..."
            : 'Enregistrement...'
        }
        onSubmit={handleSubmit}
        onCancel={() => {
          form.reset();
          setCreationMode(null);
        }}
        isModeIa={creationMode === 'ia_form'}
      />
    </div>
  );
}
