'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PenLine, Camera, Loader2, Sparkles } from 'lucide-react';
import { useCreateRepasMutation, useAnalyseImageMutation } from '@/lib/queries/mutations';
import { compressImage } from '@/lib/image-compression';
import { errorMessage } from '@/lib/errors';
import { analysisToValues, clearDraft, loadDraft, saveDraft, type RepasDraft } from '@/lib/repas-form';
import { useRepasForm } from '@/hooks/useRepasForm';
import { useHydrated } from '@/hooks/useHydrated';
import RepasFormSteps from '@/components/RepasFormSteps';
import BackHeader from '@/components/BackHeader';
import ImageDropzone from '@/components/ImageDropzone';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import TextInput from '@/components/ui/TextInput';

type CreationMode = null | 'manuel' | 'ia_upload' | 'ia_form';

const MODES = [
  { mode: 'manuel' as const, title: 'Je la saisis', hint: 'Titre, ingrédients et étapes, à la main.', icon: PenLine },
  { mode: 'ia_upload' as const, title: 'Je photographie le plat', hint: "L'IA propose une recette à relire.", icon: Camera },
];

/**
 * Le brouillon vit dans localStorage : le formulaire n'est monté qu'après l'hydratation
 * pour le lire à son initialisation. Changer `session` le remet à zéro (retour au choix du mode).
 */
export default function NouveauRepasPage() {
  const hydrated = useHydrated();
  const [session, setSession] = useState(0);

  if (!hydrated) return <div className="max-w-2xl mx-auto" />;
  return (
    <NouveauRepas
      key={session}
      onRestart={() => {
        clearDraft();
        setSession((n) => n + 1);
      }}
    />
  );
}

function NouveauRepas({ onRestart }: { onRestart: () => void }) {
  const router = useRouter();
  const [draft] = useState<RepasDraft | null>(loadDraft);
  const [mode, setMode] = useState<CreationMode>(draft?.mode ?? null);
  const form = useRepasForm({ values: draft?.values, step: draft?.step });
  const createRepas = useCreateRepasMutation();
  const analyse = useAnalyseImageMutation();
  const { image } = form;

  // Brouillon : sauvegardé à chaque modification (la photo n'est pas conservée)
  useEffect(() => {
    if (mode === 'manuel' || mode === 'ia_form') saveDraft({ mode, step: form.step, values: form.values });
  }, [mode, form.step, form.values]);

  const handleAnalyze = async () => {
    if (!image.file) return;
    form.setError(null);
    try {
      const result = await analyse.mutateAsync({ image: await compressImage(image.file), titre: form.titre });
      form.replaceValues(analysisToValues(result));
      setMode('ia_form');
    } catch (err) {
      form.setError(errorMessage(err, "Impossible d'analyser l'image."));
    }
  };

  const handleSubmit = () =>
    form.submit(async (payload) => {
      await createRepas.mutateAsync(payload);
      clearDraft();
      router.push('/repas');
    });

  if (mode === null) {
    return (
      <div className="max-w-2xl mx-auto">
        <BackHeader title="Nouvelle recette" />

        <ul className="border-t border-text-light-main dark:border-text-dark-main">
          {MODES.map(({ mode: m, title, hint, icon: Icon }, idx) => (
            <li key={m} className="border-b border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setMode(m)}
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

  if (mode === 'ia_upload') {
    const backToChoice = () => {
      form.setError(null);
      form.setTitre('');
      setMode(null);
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
            disabled={analyse.isPending}
          />

          <ImageDropzone {...image.dropzoneProps} busy={analyse.isPending} busyLabel="L'IA analyse votre plat…" />

          <div className="flex items-center justify-between gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <Button variant="ghost" onClick={backToChoice} disabled={analyse.isPending}>
              Retour
            </Button>
            <Button onClick={handleAnalyze} disabled={!image.file || analyse.isPending}>
              {analyse.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analyser
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <BackHeader title="Nouvelle recette" eyebrow={mode === 'ia_form' ? 'Proposée par IA' : undefined} onBack={onRestart} />

      <RepasFormSteps
        form={form}
        submitLabel="Créer la recette"
        submitLoadingLabel={image.file ? "Envoi de l'image..." : 'Enregistrement...'}
        onSubmit={handleSubmit}
        onCancel={onRestart}
        isModeIa={mode === 'ia_form'}
      />
    </div>
  );
}
