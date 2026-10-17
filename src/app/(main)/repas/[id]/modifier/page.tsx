'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRepasQuery } from '@/lib/queries/queries';
import { useUpdateRepasMutation } from '@/lib/queries/mutations';
import { repasToValues } from '@/lib/repas-form';
import { errorMessage } from '@/lib/errors';
import { useRepasForm } from '@/hooks/useRepasForm';
import RepasFormSteps from '@/components/RepasFormSteps';
import BackHeader from '@/components/BackHeader';
import Alert from '@/components/ui/Alert';
import type { RepasWithIngredients } from '@/types';

/** Le formulaire n'est monté qu'une fois le repas chargé : il en prend une copie à son initialisation. */
export default function ModifierRepasPage() {
  const params = useParams<{ id: string }>();
  const { data: repas, error } = useRepasQuery(Number(params.id));

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <BackHeader title="Modifier la recette" />
        <Alert>{errorMessage(error, 'Erreur lors du chargement du repas.')}</Alert>
      </div>
    );
  }

  if (!repas) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-6">
        <div className="h-9 w-56 bg-neutral-200 dark:bg-neutral-800 rounded" />
        <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
        <div className="h-48 w-full bg-neutral-200 dark:bg-neutral-800 rounded-card" />
      </div>
    );
  }

  return <ModifierRepas repas={repas} />;
}

function ModifierRepas({ repas }: { repas: RepasWithIngredients }) {
  const router = useRouter();
  const updateRepas = useUpdateRepasMutation(repas.id);
  const form = useRepasForm({ values: repasToValues(repas), photoUrl: repas.photoUrl });

  const handleSubmit = () =>
    form.submit(async (payload) => {
      await updateRepas.mutateAsync(payload);
      router.push('/repas');
    });

  return (
    <div className="max-w-2xl mx-auto">
      <BackHeader title="Modifier la recette" />

      <RepasFormSteps
        form={form}
        submitLabel="Enregistrer"
        submitLoadingLabel={form.image.file ? "Envoi de l'image..." : 'Enregistrement...'}
        onSubmit={handleSubmit}
        submitOnEveryStep
        onCancel={() => router.push('/repas')}
      />
    </div>
  );
}
