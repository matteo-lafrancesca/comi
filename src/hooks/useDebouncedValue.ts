'use client';

import { useEffect, useState } from 'react';

/** Renvoie `value` après `delay` ms sans changement (pour limiter les requêtes pendant la frappe). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
