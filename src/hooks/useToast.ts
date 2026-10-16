'use client';

import { useCallback, useState } from 'react';

/** État d'une notification d'erreur flottante (voir `ui/Toast`). */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const dismiss = useCallback(() => setMessage(null), []);
  return { message, show: setMessage, dismiss };
}
