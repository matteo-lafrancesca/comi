'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import type { Ymd } from '@/lib/date-utils';
import type { ProgrammationWithRepas } from '@/types';
import { queryKeys } from './keys';

/** Invalide planning et courses (les deux dépendent des programmations). */
function useInvalidatePlanningAndShopping() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.planning.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.shopping.all }),
    ]);
}

/** À appeler après la création ou la modification d'un repas. */
export function useInvalidateRepas() {
  const queryClient = useQueryClient();
  const invalidatePlanningAndShopping = useInvalidatePlanningAndShopping();
  return async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.repas.all }), invalidatePlanningAndShopping()]);
  };
}

export function useScheduleMutation() {
  const invalidate = useInvalidatePlanningAndShopping();
  return useMutation({
    mutationFn: (input: { repasId: number; date: Ymd; heure: 0 | 1 }) =>
      apiJson<ProgrammationWithRepas>('/api/planning', {
        method: 'POST',
        json: input,
        fallbackError: 'Erreur lors de la programmation.',
      }),
    onSuccess: invalidate,
  });
}

export function useUnscheduleMutation() {
  const invalidate = useInvalidatePlanningAndShopping();
  return useMutation({
    mutationFn: (programmationId: number) =>
      apiJson<unknown>(`/api/planning/${programmationId}`, {
        method: 'DELETE',
        fallbackError: 'Erreur lors de la déprogrammation.',
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteRepasMutation() {
  const invalidateRepas = useInvalidateRepas();
  return useMutation({
    mutationFn: (repasId: number) =>
      apiJson<unknown>(`/api/repas/${repasId}`, { method: 'DELETE', fallbackError: 'Erreur lors de la suppression.' }),
    onSuccess: invalidateRepas,
  });
}

export interface ExtraInput {
  week: number;
  year: number;
  repasId?: number;
  ingredientName?: string;
  categorie?: string;
  quantite?: number;
  unite?: string;
}

export function useAddExtraMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExtraInput) =>
      apiJson<unknown>('/api/shopping-list/extras', {
        method: 'POST',
        json: input,
        fallbackError: "Erreur lors de l'ajout.",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.shopping.all }),
  });
}

export function useDeleteExtraMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (extraId: number) =>
      apiJson<unknown>(`/api/shopping-list/extras/${extraId}`, {
        method: 'DELETE',
        fallbackError: 'Erreur lors de la suppression.',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.shopping.all }),
  });
}
