'use client';

import { useEffect } from 'react';

/**
 * Recale les zones de clic au lancement de la PWA iOS, sans passer par le clavier.
 *
 * Après le passage à viewport-fit=cover en cours de chargement (voir `app/layout.tsx`), l'affichage est plein
 * écran mais iOS garde les zones de clic de l'ancien viewport : il faut toucher au-dessus des boutons, jusqu'à
 * ce que l'ouverture du clavier force la vue web à resynchroniser sa zone visible. Un défilement réel de la
 * fenêtre d'1px provoque la même resynchronisation ; il est invisible, tout l'écran étant en `position: fixed`.
 */
export default function PwaViewportSync() {
  useEffect(() => {
    if (!window.matchMedia('(display-mode: standalone)').matches) return;
    let frame = 0;

    const sync = () => {
      const html = document.documentElement;
      // overflow: hidden bloquerait le défilement ; la page doit dépasser d'1px pour pouvoir défiler.
      html.style.overflow = 'auto';
      html.style.height = 'calc(100% + 1px)';
      window.scrollTo(0, 1);
      frame = requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        html.style.height = '';
        html.style.overflow = '';
      });
    };

    if (document.readyState === 'complete') sync();
    else window.addEventListener('load', sync, { once: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('load', sync);
    };
  }, []);

  return null;
}
