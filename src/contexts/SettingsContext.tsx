'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface SettingsContextType {
  /** Jour de début de semaine : 0=Lun, 1=Mar, 2=Mer, 3=Jeu, 4=Ven, 5=Sam, 6=Dim */
  weekStartDay: number;
  /** Met à jour le jour de début en base de données */
  setWeekStartDay: (day: number) => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  settingsLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [weekStartDay, setWeekStartDayState] = useState<number>(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Initialise le thème depuis localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark =
      savedTheme === 'dark' ||
      (!savedTheme && document.documentElement.classList.contains('dark'));
    const resolvedTheme = isDark ? 'dark' : 'light';
    setTheme(resolvedTheme);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Charge weekStartDay depuis l'API
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await apiFetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (active) setWeekStartDayState(data.weekStartDay ?? 0);
        }
      } catch {
        // fallback silencieux : on garde 0 (lundi)
      } finally {
        if (active) setSettingsLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const setWeekStartDay = useCallback(async (day: number) => {
    // Optimistic update
    setWeekStartDayState(day);
    try {
      const res = await apiFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStartDay: day }),
      });
      if (!res.ok) {
        // Rollback si erreur
        const prev = weekStartDay;
        setWeekStartDayState(prev);
        console.error('Erreur lors de la sauvegarde du jour de début de semaine.');
      }
    } catch {
      setWeekStartDayState(weekStartDay);
      console.error('Erreur réseau lors de la sauvegarde du jour de début de semaine.');
    }
  }, [weekStartDay]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  return (
    <SettingsContext.Provider
      value={{ weekStartDay, setWeekStartDay, theme, toggleTheme, settingsLoading }}
    >
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
