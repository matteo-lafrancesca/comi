'use client';

import React, { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import { queryKeys } from '@/lib/queries/keys';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark';

interface SettingsContextType {
  /** Jour de début de semaine : 0=Lun, 1=Mar, 2=Mer, 3=Jeu, 4=Ven, 5=Sam, 6=Dim */
  weekStartDay: number;
  /** Enregistre le jour de début de semaine. Lève une erreur si l'enregistrement échoue. */
  setWeekStartDay: (day: number) => Promise<void>;
  theme: Theme;
  toggleTheme: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// ── Thème : la classe `dark` de <html> est la source de vérité (posée avant l'hydratation par le script du <head>)

const THEME_EVENT = 'comi:theme';

function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

const readTheme = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'light' as Theme);

  // Le jour de début de semaine vient de la session : il est connu dès que l'utilisateur l'est.
  const weekStartDay = user?.weekStartDay ?? 0;

  const setWeekStartDay = useCallback(
    async (day: number) => {
      if (day === weekStartDay) return;
      // Pas de mise à jour optimiste : les requêtes de semaine dépendent de cette valeur et le serveur
      // doit l'avoir enregistrée avant qu'elles repartent.
      await apiJson<unknown>('/api/settings', {
        method: 'PATCH',
        json: { weekStartDay: day },
        fallbackError: 'Impossible d’enregistrer le jour de début de semaine.',
      });
      queryClient.removeQueries({ queryKey: queryKeys.planning.all });
      queryClient.removeQueries({ queryKey: queryKeys.shopping.all });
      updateUser({ weekStartDay: day });
    },
    [weekStartDay, queryClient, updateUser]
  );

  const toggleTheme = useCallback(() => {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('theme', next);
    } catch {
      // stockage indisponible (navigation privée) : le thème vaut pour la session seulement
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return (
    <SettingsContext.Provider value={{ weekStartDay, setWeekStartDay, theme, toggleTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings doit être utilisé dans un SettingsProvider');
  }
  return context;
}
