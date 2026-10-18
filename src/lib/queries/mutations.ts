'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import type { Ymd } from '@/lib/date-utils';
import type { RepasPatchPayload, RepasPayload } from '@/lib/schemas';
import type { AnalysisResult } from '@/lib/repas-form';
import type { FriendCard, FriendRelation, ProgrammationWithRepas, RepasWithIngredients } from '@/types';
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

export function useCreateRepasMutation() {
  const invalidateRepas = useInvalidateRepas();
  return useMutation({
    mutationFn: (payload: RepasPayload) =>
      apiJson<RepasWithIngredients>('/api/repas', {
        method: 'POST',
        json: payload,
        fallbackError: 'Erreur lors de la création du repas.',
      }),
    onSuccess: invalidateRepas,
  });
}

export function useUpdateRepasMutation(repasId: number) {
  const invalidateRepas = useInvalidateRepas();
  return useMutation({
    mutationFn: (payload: RepasPayload) =>
      apiJson<RepasWithIngredients>(`/api/repas/${repasId}`, {
        method: 'PATCH',
        json: payload,
        fallbackError: 'Erreur lors de la mise à jour du repas.',
      }),
    onSuccess: invalidateRepas,
  });
}

/** Analyse d'une photo de plat par l'IA : renvoie une recette à relire. */
export function useAnalyseImageMutation() {
  return useMutation({
    mutationFn: ({ image, titre }: { image: File; titre: string }) => {
      const body = new FormData();
      body.append('image', image);
      if (titre.trim()) body.append('titre', titre.trim());
      return apiJson<AnalysisResult>('/api/repas/analyser', {
        method: 'POST',
        body,
        fallbackError: "Une erreur est survenue lors de l'analyse.",
      });
    },
  });
}

/** Rend un repas public (visible par les amis) ou privé (le retire de chez eux). */
export function useRepasVisibilityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ repasId, isPublic }: { repasId: number; isPublic: boolean }) =>
      apiJson<RepasWithIngredients>(`/api/repas/${repasId}`, {
        method: 'PATCH',
        json: { isPublic } satisfies RepasPatchPayload,
        fallbackError: 'Impossible de modifier la confidentialité du repas.',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.repas.all }),
  });
}

/** Ajoute la recette publique d'un ami à mon carnet. */
export function useSaveRepasMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (repasId: number) =>
      apiJson<unknown>(`/api/repas/${repasId}/save`, {
        method: 'POST',
        fallbackError: "Impossible d'ajouter cette recette à votre carnet.",
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.repas.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.all }),
      ]),
  });
}

/** Retire la recette d'un ami de mon carnet (et de mon planning / mes courses). */
export function useUnsaveRepasMutation() {
  const queryClient = useQueryClient();
  const invalidateRepas = useInvalidateRepas();
  return useMutation({
    mutationFn: (repasId: number) =>
      apiJson<unknown>(`/api/repas/${repasId}/save`, {
        method: 'DELETE',
        fallbackError: 'Impossible de retirer cette recette de votre carnet.',
      }),
    onSuccess: () =>
      Promise.all([invalidateRepas(), queryClient.invalidateQueries({ queryKey: queryKeys.friends.all })]),
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

// ── Amis ────────────────────────────────────────────────────────────────────

/** Toute action sur une demande change la liste, les demandes et les relations affichées dans la recherche. */
function useInvalidateFriends() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.friends.all });
}

/** Envoie une demande (acceptée d'office si l'autre m'en avait envoyé une). */
export function useSendFriendRequestMutation() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: (userId: number) =>
      apiJson<{ relation: FriendRelation }>('/api/friends/requests', {
        method: 'POST',
        json: { userId },
        fallbackError: "Impossible d'envoyer la demande.",
      }),
    onSuccess: invalidate,
  });
}

export function useAcceptFriendRequestMutation() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: (requestId: number) =>
      apiJson<unknown>(`/api/friends/requests/${requestId}/accept`, {
        method: 'POST',
        fallbackError: "Impossible d'accepter la demande.",
      }),
    onSuccess: invalidate,
  });
}

/** Refuse (demande reçue) ou annule (demande envoyée). */
export function useDeleteFriendRequestMutation() {
  const invalidate = useInvalidateFriends();
  return useMutation({
    mutationFn: (requestId: number) =>
      apiJson<unknown>(`/api/friends/requests/${requestId}`, {
        method: 'DELETE',
        fallbackError: 'Impossible de supprimer la demande.',
      }),
    onSuccess: invalidate,
  });
}

/**
 * Retire un ami : ses recettes quittent mon carnet, mon planning et mes courses. Appelée depuis son
 * profil, que l'on quitte ensuite : les requêtes « amis » sont marquées périmées sans être rechargées
 * (le profil encore affiché répondrait 403) ; elles se rechargent à leur prochain affichage, et l'ami
 * est retiré de la liste en cache pour ne pas y réapparaître le temps du rechargement.
 */
export function useRemoveFriendMutation() {
  const queryClient = useQueryClient();
  const invalidateRepas = useInvalidateRepas();
  return useMutation({
    mutationFn: (userId: number) =>
      apiJson<unknown>(`/api/friends/${userId}`, { method: 'DELETE', fallbackError: 'Impossible de retirer cet ami.' }),
    onSuccess: (_data, userId) => {
      queryClient.setQueryData<FriendCard[]>(queryKeys.friends.list, (list) => list?.filter((f) => f.id !== userId));
      return Promise.all([
        invalidateRepas(),
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.all, refetchType: 'none' }),
      ]);
    },
  });
}
