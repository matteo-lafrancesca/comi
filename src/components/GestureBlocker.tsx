'use client';

import { useEffect } from 'react';

/** Zone, en pixels depuis le bord de l'écran, où commence le geste « page précédente/suivante » de Safari. */
const EDGE_ZONE_PX = 25;
/** Déplacement horizontal (px) à partir duquel un geste parti du bord est annulé. */
const SWIPE_THRESHOLD_PX = 5;

/**
 * Bloque le zoom par pincement et le balayage depuis le bord de l'écran (navigation de l'historique
 * sous Safari iOS).
 *
 * Seul le *déplacement* horizontal est annulé (`touchmove`). Annuler le `touchstart` supprimerait aussi
 * le clic qui suit : les boutons proches du bord (flèches de semaine) ne répondraient plus.
 */
export default function GestureBlocker() {
  useEffect(() => {
    const handleGestureStart = (e: Event) => e.preventDefault();

    let startX = 0;
    let startY = 0;
    let fromEdge = false;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      fromEdge = startX < EDGE_ZONE_PX || startX > window.innerWidth - EDGE_ZONE_PX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!fromEdge || !touch || !e.cancelable) return;
      const deltaX = Math.abs(touch.clientX - startX);
      const deltaY = Math.abs(touch.clientY - startY);
      if (deltaX > deltaY && deltaX > SWIPE_THRESHOLD_PX) e.preventDefault();
    };

    document.addEventListener('gesturestart', handleGestureStart);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return null;
}
