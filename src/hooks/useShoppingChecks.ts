'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/queries/keys';
import type { ShoppingListResponse } from '@/types';

const SYNC_DELAY_MS = 1000;

/**
 * Cases cochées de la liste de courses.
 *
 * - Affichage immédiat : une surcharge locale (`overrides`) prime sur la donnée du serveur, donc un
 *   rechargement en arrière-plan ne peut pas défaire une case que l'on vient de cocher.
 * - Envoi groupé après 1 s d'inactivité.
 * - Envoi forcé (`keepalive`) quand la page est masquée, fermée ou quittée : plus aucune case perdue.
 * - En cas d'échec, les cases de l'envoi reviennent à l'état du serveur et `onError` est appelé.
 */
export function useShoppingChecks(weekKey: string, onError: (message: string) => void) {
  const queryClient = useQueryClient();
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const unsentRef = useRef(new Map<number, boolean>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  });

  const flush = useCallback(
    async (keepalive = false) => {
      clearTimeout(timerRef.current);
      if (unsentRef.current.size === 0) return;
      const batch = new Map(unsentRef.current);
      unsentRef.current.clear();

      const releaseBatch = () =>
        setOverrides((current) => {
          const next = { ...current };
          // Une case recochée pendant l'envoi garde sa nouvelle valeur.
          for (const [id, value] of batch) if (next[id] === value) delete next[id];
          return next;
        });

      try {
        await apiJson<unknown>('/api/shopping-list', {
          method: 'PATCH',
          json: { items: [...batch].map(([id, isChecked]) => ({ id, isChecked })) },
          keepalive,
          fallbackError: 'Impossible de synchroniser vos modifications de courses.',
        });
        queryClient.setQueriesData<ShoppingListResponse>({ queryKey: queryKeys.shopping.all }, (data) =>
          data && {
            ...data,
            categories: data.categories.map((category) => ({
              ...category,
              items: category.items.map((item) => (batch.has(item.id) ? { ...item, isChecked: batch.get(item.id)! } : item)),
            })),
          }
        );
      } catch (err) {
        onErrorRef.current(errorMessage(err, 'Impossible de synchroniser vos modifications de courses.'));
      } finally {
        releaseBatch();
      }
    },
    [queryClient]
  );

  const toggle = useCallback(
    (itemId: number, currentlyChecked: boolean) => {
      const next = !currentlyChecked;
      setOverrides((current) => ({ ...current, [itemId]: next }));
      unsentRef.current.set(itemId, next);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(), SYNC_DELAY_MS);
    },
    [flush]
  );

  // Envoi immédiat avant de changer de semaine, de masquer la page ou de quitter l'écran.
  useEffect(() => {
    const flushNow = () => void flush(true);
    const onVisibility = () => document.visibilityState === 'hidden' && flushNow();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushNow);
      flushNow();
    };
  }, [flush, weekKey]);

  /** État affiché d'une case : la surcharge locale prime sur la donnée du serveur. */
  const isChecked = useCallback((itemId: number, serverValue: boolean) => overrides[itemId] ?? serverValue, [overrides]);

  return { isChecked, toggle };
}
