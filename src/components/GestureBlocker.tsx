'use client';

import { useEffect } from 'react';

export default function GestureBlocker() {
  useEffect(() => {
    // 1. Bloquer le pincement pour zoomer (pinch-to-zoom)
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('gesturestart', handleGestureStart);

    // 2. Bloquer le swipe de navigation d'historique (edge swipe back/forward) sur Safari iOS
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const x = e.touches[0].clientX;
        // Si le touché commence à moins de 15px du bord gauche ou droit, on l'annule
        // pour empêcher le navigateur de déclencher la navigation par balayage (edge swipe)
        if (x < 15 || x > window.innerWidth - 15) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  return null;
}
