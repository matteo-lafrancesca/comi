'use client';

import { useEffect } from 'react';

/**
 * Force WebKit à recalculer le viewport au lancement de la PWA iOS.
 *
 * Après le passage à viewport-fit=cover en cours de chargement (voir `app/layout.tsx`), l'affichage est plein
 * écran mais les zones de clic restent calées sur l'ancien viewport : il faut toucher au-dessus des boutons,
 * jusqu'à ce que l'ouverture du clavier provoque un recalcul. Masquer puis réafficher le `body` (pleine
 * hauteur) dans la même tâche provoque ce recalcul sans clavier ni image intermédiaire.
 */
export default function ViewportReflow() {
  useEffect(() => {
    if (!window.matchMedia('(display-mode: standalone)').matches) return;

    const reflow = () =>
      requestAnimationFrame(() => {
        const { body } = document;
        body.style.display = 'none';
        void body.offsetHeight;
        body.style.display = '';
      });

    if (document.readyState === 'complete') reflow();
    else window.addEventListener('load', reflow, { once: true });

    return () => window.removeEventListener('load', reflow);
  }, []);

  return null;
}
