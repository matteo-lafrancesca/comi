'use client';

import React, { useEffect } from 'react';

interface ToastProps {
  /** Message à afficher ; `null` masque la notification. */
  message: string | null;
  onClose: () => void;
  /** Durée d'affichage avant fermeture automatique (ms). */
  duration?: number;
}

/** Notification d'erreur flottante en haut de l'écran, qui se ferme seule. */
export default function Toast({ message, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-md w-full px-4 animate-fade-in print:hidden">
      <div
        role="alert"
        className="flex items-center justify-between gap-3 border-l-4 border-red-700 bg-card-light dark:bg-card-dark px-4 py-3 text-sm shadow-lg text-red-800 dark:text-red-300"
      >
        <span>{message}</span>
        <button
          onClick={onClose}
          className="shrink-0 text-xs font-semibold text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
