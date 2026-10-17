'use client';

import { useState } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError, BASE_PATH, apiFetch } from '@/lib/api';

let redirecting = false;

/**
 * Session refusée par l'API : on repart de la page de connexion (rechargement complet = état propre).
 * Les cookies sont effacés d'abord : le proxy ne vérifie que la signature du JWT et renverrait sinon
 * aussitôt vers l'accueil, qui reprendrait un 401 (boucle infinie si l'API et le proxy divergent).
 */
function handleUnauthorized(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 401 || redirecting) return;
  const { pathname } = window.location;
  if (pathname.startsWith(`${BASE_PATH}/login`) || pathname.startsWith(`${BASE_PATH}/register`)) return;
  redirecting = true;
  apiFetch('/api/auth/logout', { method: 'POST' })
    .catch(() => {})
    .finally(() => window.location.assign(`${BASE_PATH}/login`));
}

/**
 * Cache des données serveur.
 * - `staleTime` : un écran déjà visité s'affiche instantanément et se rafraîchit en arrière-plan ;
 * - `refetchOnWindowFocus` : la PWA se met à jour quand on la rouvre.
 */
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleUnauthorized }),
        mutationCache: new MutationCache({ onError: handleUnauthorized }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            // Une session expirée ne se règle pas en réessayant.
            retry: (failureCount, error) => !(error instanceof ApiError && error.status === 401) && failureCount < 1,
            refetchOnWindowFocus: true,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
