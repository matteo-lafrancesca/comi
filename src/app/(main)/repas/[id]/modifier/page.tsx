'use client';

import React, { useState, useEffect } from 'react';
import { errorMessage } from '@/lib/errors';
import { useRouter, useParams } from 'next/navigation';
import { CategorieIngredient, RepasWithIngredients } from '@/types';
import { useNavigationCache } from '@/contexts/NavigationCacheContext';
import { useRepasForm } from '@/hooks/useRepasForm';
import RepasFormSteps from '@/components/RepasFormSteps';
import BackHeader from '@/components/BackHeader';
import { apiFetch } from '@/lib/api';

export default function ModifierRepasPage() {
  const router = useRouter();
  const params = useParams();
  const repasId = params?.id as string;
  const { invalidateRepasCache } = useNavigationCache();
  const form = useRepasForm();

  // État propre à cette page
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Chargement des données existantes ────────────────────────────────────

  useEffect(() => {
    if (!repasId) return;

    const fetchRepas = async () => {
      try {
        setInitialLoading(true);
        const res = await apiFetch(`/api/repas/${repasId}`);
        if (!res.ok) {
          throw new Error('Repas introuvable ou accès non autorisé.');
        }
        const data: RepasWithIngredients = await res.json();

        form.setTitre(data.titre);
        form.setPhotoUrl(data.photoUrl ?? null);

        form.setSelectedIngredients(
          data.ingredients.map((ing) => ({
            id: Math.random().toString(),
            ingredientId: ing.id,
            nom: ing.nom,
            quantite:
              ing.quantite !== null && ing.quantite !== undefined
                ? String(ing.quantite)
                : '',
            unite: ing.unite ?? '',
            categorie: ing.categorie as CategorieIngredient,
          }))
        );

        if (data.recette) {
          const lines = data.recette.split('\n').filter((l) => l.trim() !== '');
          form.setSteps(
            lines.length > 0
              ? lines.map((text) => ({ id: Math.random().toString(), text }))
              : [{ id: 'init-step-1', text: '' }]
          );
        } else {
          form.setSteps([{ id: 'init-step-1', text: '' }]);
        }
      } catch (err) {
        form.setError(errorMessage(err, 'Erreur lors du chargement du repas.'));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchRepas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repasId]);

  // ── Soumission (PATCH /api/repas/:id) ────────────────────────────────────

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

      const res = await apiFetch(`/api/repas/${repasId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, photoUrl: finalPhotoUrl ?? null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour du repas.');
      }

      invalidateRepasCache();
      router.push('/repas');
    } catch (err) {
      form.setError(errorMessage(err, 'Une erreur inattendue est survenue.'));
    } finally {
      form.setLoading(false);
    }
  };

  // ── Skeleton de chargement ───────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-6">
        <div className="h-9 w-56 bg-neutral-200 dark:bg-neutral-800 rounded" />
        <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
        <div className="h-48 w-full bg-neutral-200 dark:bg-neutral-800 rounded-card" />
      </div>
    );
  }

  // ── Formulaire multi-étapes ──────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">
      <BackHeader title="Modifier la recette" />

      <RepasFormSteps
        form={form}
        submitLabel="Enregistrer"
        submitLoadingLabel={form.selectedImageFile && !form.photoUrl ? "Envoi de l'image..." : 'Enregistrement...'}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/repas')}
      />
    </div>
  );
}
