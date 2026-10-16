'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Cache des données serveur.
 * - `staleTime` : un écran déjà visité s'affiche instantanément et se rafraîchit en arrière-plan ;
 * - `refetchOnWindowFocus` : la PWA se met à jour quand on la rouvre.
 */
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, gcTime: 10 * 60_000, retry: 1, refetchOnWindowFocus: true },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
