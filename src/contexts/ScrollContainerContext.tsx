'use client';

import { createContext, useContext, type RefObject } from 'react';

/** Élément qui défile dans l'application (le `<main>` du layout). */
export const ScrollContainerContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function useScrollContainer(): RefObject<HTMLElement | null> {
  const ref = useContext(ScrollContainerContext);
  if (!ref) throw new Error('useScrollContainer doit être utilisé dans le layout principal');
  return ref;
}
