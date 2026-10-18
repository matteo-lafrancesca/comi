'use client';

import { useEffect } from 'react';

/** Échelle appliquée un instant : assez pour que iOS recalcule, trop peu pour se voir (0,4px sur 390px). */
const NUDGE_SCALE = '1.001';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Recale les zones de clic au lancement de la PWA iOS, sans passer par le clavier.
 *
 * Après le passage à viewport-fit=cover en cours de chargement (voir `app/layout.tsx`), l'affichage est plein
 * écran mais iOS garde les zones de clic de l'ancien viewport : il faut toucher au-dessus des boutons, jusqu'à
 * ce que l'ouverture du clavier force la vue web à resynchroniser sa zone visible. Un changement d'échelle du
 * viewport, aussitôt annulé, provoque la même resynchronisation (un simple défilement ne suffit pas).
 */
export default function PwaViewportSync() {
  useEffect(() => {
    if (!window.matchMedia('(display-mode: standalone)').matches) return;
    let cancelled = false;

    const sync = async () => {
      // ponytail: délai repris de la version testée sur iPhone ; à réduire seulement après un nouveau test.
      await wait(300);
      // Le dernier <meta viewport> est celui qui s'applique.
      const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="viewport"]');
      const meta = metas[metas.length - 1];
      if (cancelled || !meta) return;
      const content = meta.content;
      meta.content = content
        .replace(/initial-scale=1\b/, `initial-scale=${NUDGE_SCALE}`)
        .replace(/maximum-scale=1\b/, `maximum-scale=${NUDGE_SCALE}`);
      await nextFrame();
      await wait(50);
      meta.content = content;
    };

    if (document.readyState === 'complete') sync();
    else window.addEventListener('load', sync, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', sync);
    };
  }, []);

  return null;
}
