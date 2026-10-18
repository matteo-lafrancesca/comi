'use client';

import { useEffect } from 'react';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Recale les zones de clic au lancement de la PWA iOS, sans passer par le clavier.
 *
 * Après le passage à viewport-fit=cover en cours de chargement (voir `app/layout.tsx`), l'affichage est plein
 * écran mais iOS garde les zones de clic de l'ancien viewport : il faut toucher au-dessus des boutons, jusqu'à
 * ce que l'ouverture du clavier force la vue web à resynchroniser sa zone visible. On provoque la même
 * resynchronisation : un défilement de la fenêtre d'1px, puis un changement d'échelle du viewport.
 */
export default function PwaViewportSync() {
  useEffect(() => {
    if (!window.matchMedia('(display-mode: standalone)').matches) return;
    let cancelled = false;

    const sync = async () => {
      await wait(300);
      if (cancelled) return;
      const html = document.documentElement;

      // 1. Défilement réel de la fenêtre (overflow: hidden le bloquerait).
      html.style.overflow = 'auto';
      html.style.height = 'calc(100% + 1px)';
      window.scrollTo(0, 1);
      await nextFrame();
      window.scrollTo(0, 0);
      html.style.height = '';
      html.style.overflow = '';

      // 2. Changement d'échelle : le dernier <meta viewport> est celui qui s'applique.
      const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="viewport"]');
      const meta = metas[metas.length - 1];
      if (!meta) return;
      const content = meta.content;
      meta.content = content.replace(/initial-scale=1\b/, 'initial-scale=1.01').replace(/maximum-scale=1\b/, 'maximum-scale=1.01');
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
