'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Faux au rendu serveur et à l'hydratation, vrai ensuite. Permet de ne monter qu'après
 * l'hydratation un sous-arbre qui lit `localStorage` à son initialisation (sans effet ni mismatch).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
