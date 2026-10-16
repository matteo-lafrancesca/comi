'use client';

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import type { WeekRef } from '@/lib/date-utils';
import type { PlanningResponse, RepasWithIngredients, ShoppingListResponse } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { useToday } from '@/hooks/useToday';
import { queryKeys } from './keys';

const weekQuery = (ref: WeekRef | null) => (ref ? `?week=${ref.week}&year=${ref.year}` : '');

/** Planning d'une semaine (`null` : semaine courante). */
export function usePlanning(ref: WeekRef | null) {
  const { weekStartDay } = useSettings();
  const today = useToday();
  return useQuery({
    queryKey: queryKeys.planning.week(weekStartDay, ref, today),
    queryFn: () =>
      apiJson<PlanningResponse>(`/api/planning${weekQuery(ref)}`, { fallbackError: 'Impossible de charger le planning.' }),
  });
}

/** Liste de courses d'une semaine (`null` : semaine courante). */
export function useShoppingList(ref: WeekRef | null) {
  const { weekStartDay } = useSettings();
  const today = useToday();
  const queryKey = queryKeys.shopping.week(weekStartDay, ref, today);
  const query = useQuery({
    queryKey,
    queryFn: () =>
      apiJson<ShoppingListResponse>(`/api/shopping-list${weekQuery(ref)}`, {
        fallbackError: 'Impossible de charger la liste de courses.',
      }),
  });
  return { ...query, queryKey };
}

interface RepasPage {
  repas: RepasWithIngredients[];
  hasMore: boolean;
}

/** Liste paginée des repas (scroll infini). */
export function useRepasList(sort: string, search: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.repas.list(sort, search),
    initialPageParam: 1,
    placeholderData: keepPreviousData,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        sort,
        limit: '12',
        page: String(pageParam),
        order: sort === 'alphabetique' ? 'asc' : 'desc',
      });
      if (search.trim()) params.set('search', search);
      return apiJson<RepasPage>(`/api/repas?${params}`, { fallbackError: 'Impossible de charger vos repas.' });
    },
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length + 1 : undefined),
    select: (data) => {
      // Un repas ajouté pendant la pagination peut apparaître deux fois : on dédoublonne par id.
      const seen = new Set<number>();
      return data.pages
        .flatMap((page) => page.repas)
        .filter((repas) => !seen.has(repas.id) && seen.add(repas.id));
    },
  });
}

/** Recherche de repas pour un sélecteur (première page, ordre alphabétique). */
export function useRepasOptions(search: string) {
  return useQuery({
    queryKey: queryKeys.repas.options(search),
    placeholderData: keepPreviousData,
    queryFn: () => {
      const params = new URLSearchParams({ sort: 'alphabetique', order: 'asc', limit: '50', page: '1' });
      if (search.trim()) params.set('search', search);
      return apiJson<RepasPage>(`/api/repas?${params}`, { fallbackError: 'Impossible de charger vos repas.' });
    },
    select: (data) => data.repas,
  });
}
