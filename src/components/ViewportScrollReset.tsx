'use client';

import { useEffect } from 'react';

const isEditable = (el: Element | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/**
 * Remet la fenêtre à zéro quand le clavier iOS se referme.
 *
 * En PWA (standalone), Safari fait défiler la fenêtre pour montrer le champ ciblé, même si `html`/`body`
 * sont en `overflow: hidden`, et ne la ramène pas à la fermeture du clavier. L'affichage paraît intact
 * (tout est en `position: fixed`) mais la zone de clic reste décalée : il faut toucher au-dessus des boutons.
 */
export default function ViewportScrollReset() {
  useEffect(() => {
    const reset = () => {
      // Laisse le focus passer au champ suivant avant de décider (focusout précède le focus suivant).
      requestAnimationFrame(() => {
        if (isEditable(document.activeElement)) return;
        if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
      });
    };

    const vv = window.visualViewport;
    document.addEventListener('focusout', reset);
    vv?.addEventListener('resize', reset);

    return () => {
      document.removeEventListener('focusout', reset);
      vv?.removeEventListener('resize', reset);
    };
  }, []);

  return null;
}
