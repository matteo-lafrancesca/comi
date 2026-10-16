'use client';

import { useSyncExternalStore } from 'react';
import { todayParis, type Ymd } from '@/lib/date-utils';

function subscribe(onChange: () => void) {
  // Le jour change à minuit, ou quand la PWA repasse au premier plan après une longue veille.
  const interval = setInterval(onChange, 60_000);
  document.addEventListener('visibilitychange', onChange);
  window.addEventListener('focus', onChange);
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onChange);
    window.removeEventListener('focus', onChange);
  };
}

/** Date du jour à Paris, mise à jour automatiquement au changement de jour. */
export function useToday(): Ymd {
  return useSyncExternalStore(subscribe, () => todayParis(), () => todayParis());
}
