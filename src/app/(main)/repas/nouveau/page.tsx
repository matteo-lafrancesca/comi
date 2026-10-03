'use client';

import React, { useState, useEffect } from 'react';
import { errorMessage } from '@/lib/errors';
import { useRouter } from 'next/navigation';
import { PenLine, Camera, Loader2, Sparkles } from 'lucide-react';
import { compressImage } from '@/lib/image-compression';
import { useNavigationCache } from '@/contexts/NavigationCacheContext';
import { useRepasForm } from '@/hooks/useRepasForm';
import RepasFormSteps from '@/components/RepasFormSteps';
import BackHeader from '@/components/BackHeader';
import ImageDropzone from '@/components/ImageDropzone';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import TextInput from '@/components/ui/TextInput';
import { apiFetch } from '@/lib/api';

const DRAFT_KEY = 'comi:repas-draft';

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export default function NouveauRepasPage() {
  const router = useRouter();
  const { invalidateRepasCache } = useNavigationCache();
  const form = useRepasForm();
  const { fileInputRef, handleFileChange, selectedImageFile } = form;

  // État propre à cette page
  const [creationMode, setCreationMode] = useState<null | 'manuel' | 'ia_upload' | 'ia_form'>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ── Brouillon (localStorage) : survit à un rechargement ou à un changement de page.
  // La photo n'est pas conservée (File non sérialisable).
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
      if (d && (d.mode === 'manuel' || d.mode === 'ia_form')) {
        /* eslint-disable react-hooks/set-state-in-effect -- restauration unique du brouillon (localStorage indisponible au rendu serveur) */
        form.setTitre(d.titre ?? '');
        form.setSelectedIngredients(d.ingredients ?? []);
        if (d.steps?.length) form.setSteps(d.steps);
        form.setStep(d.step ?? 1);
        setCreationMode(d.mode);
      }
    } catch {}
    setDraftRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uniquement au montage
  }, []);

  useEffect(() => {
    if (!draftRestored || (creationMode !== 'manuel' && creationMode !== 'ia_form')) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          mode: creationMode,
          step: form.step,
          titre: form.titre,
          ingredients: form.selectedIngredients,
          steps: form.steps,
        })
      );
    } catch {}
  }, [draftRestored, creationMode, form.step, form.titre, form.selectedIngredients, form.steps]);

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

      clearDraft();
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
      <div className="max-w-2xl mx-auto">
        <BackHeader title="Nouvelle recette" />

        <ul className="border-t border-text-light-main dark:border-text-dark-main">
          {[
            { mode: 'manuel' as const, title: 'Je la saisis', hint: 'Titre, ingrédients et étapes, à la main.', icon: PenLine },
            { mode: 'ia_upload' as const, title: 'Je photographie le plat', hint: "L'IA propose une recette à relire.", icon: Camera },
          ].map(({ mode, title, hint, icon: Icon }, idx) => (
            <li key={mode} className="border-b border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setCreationMode(mode)}
                className="group w-full flex items-center gap-5 py-6 text-left cursor-pointer"
              >
                <span className="font-display italic text-3xl w-8 text-brand">{idx + 1}</span>
                <span className="flex-1">
                  <span className="block font-display text-2xl leading-tight group-hover:underline decoration-brand decoration-2 underline-offset-4">
                    {title}
                  </span>
                  <span className="block text-sm mt-1 text-text-light-muted dark:text-text-dark-muted">{hint}</span>
                </span>
                <Icon className="h-5 w-5 text-text-light-muted dark:text-text-dark-muted" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ── Écran d'upload pour l'analyse IA ────────────────────────────────────

  if (creationMode === 'ia_upload') {
    const backToChoice = () => {
      form.setError(null);
      form.setTitre('');
      setCreationMode(null);
    };

    return (
      <div className="max-w-2xl mx-auto">
        <BackHeader title="Photo du plat" eyebrow="Analyse par IA" onBack={backToChoice} />

        <div className="space-y-8">
          {form.error && <Alert>{form.error}</Alert>}

          <TextInput
            label="Nom du plat (facultatif)"
            value={form.titre}
            onChange={(e) => form.setTitre(e.target.value)}
            placeholder="Pâtes carbonara…"
            disabled={isAnalyzing}
          />

          <ImageDropzone
            previewUrl={form.localPreviewUrl || form.photoUrl}
            busy={isAnalyzing}
            busyLabel="L'IA analyse votre plat…"
            isDragging={form.isDragging}
            inputRef={fileInputRef}
            onFileChange={handleFileChange}
            onDragOver={form.handleDragOver}
            onDragLeave={form.handleDragLeave}
            onDrop={form.handleDrop}
            onRemove={form.removeImage}
          />

          <div className="flex items-center justify-between gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <Button variant="ghost" onClick={backToChoice} disabled={isAnalyzing}>
              Retour
            </Button>
            <Button onClick={handleAnalyzeImage} disabled={!selectedImageFile || isAnalyzing}>
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analyser
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulaire multi-étapes (mode manuel ou ia_form) ─────────────────────

  const backToChoice = () => {
    clearDraft();
    form.reset();
    setCreationMode(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <BackHeader title="Nouvelle recette" eyebrow={creationMode === 'ia_form' ? 'Proposée par IA' : undefined} onBack={backToChoice} />

      <RepasFormSteps
        form={form}
        submitLabel="Créer la recette"
        submitLoadingLabel={selectedImageFile && !form.photoUrl ? "Envoi de l'image..." : 'Enregistrement...'}
        onSubmit={handleSubmit}
        onCancel={backToChoice}
        isModeIa={creationMode === 'ia_form'}
      />
    </div>
  );
}
