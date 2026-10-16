'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useScrollContainer } from '@/contexts/ScrollContainerContext';

/** Positions de défilement mémorisées par écran. Hors état React : écrire ici ne re-rend rien. */
const savedPositions = new Map<string, number>();

/** Centre verticalement `target` dans le conteneur défilant. */
export function centerInContainer(container: HTMLElement, target: HTMLElement, behavior: ScrollBehavior = 'auto') {
  const offsetTop = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  const top = Math.max(0, offsetTop - container.clientHeight / 2 + target.clientHeight / 2);
  container.scrollTo({ top, behavior });
}

interface Options {
  /** Identifie l'écran (page + semaine, filtres…). Un changement de clé relance la restauration. */
  key: string;
  /** Vrai quand le contenu est affiché : avant, ni restauration ni mémorisation. */
  ready: boolean;
  /** Prioritaire sur la position mémorisée. Renvoie `true` si le défilement est déjà réglé. */
  first?: (container: HTMLElement) => boolean;
  /** Utilisé quand aucune position n'est mémorisée (sinon : haut de page). */
  fallback?: (container: HTMLElement) => void;
}

/**
 * Mémorise la position de défilement de chaque écran et la restaure à son retour.
 * Ordre à l'arrivée : `first`, puis position mémorisée, puis `fallback`, puis haut de page.
 */
export function useScrollRestoration({ key, ready, first, fallback }: Options) {
  const containerRef = useScrollContainer();
  const appliedKeyRef = useRef<string | null>(null);
  const callbacksRef = useRef({ first, fallback });
  const liveRef = useRef({ key, ready });

  useEffect(() => {
    callbacksRef.current = { first, fallback };
    liveRef.current = { key, ready };
  });

  // Mémorisation : au plus une écriture par image, jamais pendant un chargement.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const live = liveRef.current;
        if (live.ready && appliedKeyRef.current === live.key) savedPositions.set(live.key, container.scrollTop);
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener('scroll', onScroll);
    };
  }, [containerRef]);

  // Restauration : une fois par clé, dès que le contenu est affiché.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !ready || appliedKeyRef.current === key) return;
    appliedKeyRef.current = key;

    const { first: handleFirst, fallback: handleFallback } = callbacksRef.current;
    if (handleFirst?.(container)) return;
    const saved = savedPositions.get(key);
    if (saved !== undefined) container.scrollTo({ top: saved, behavior: 'auto' });
    else if (handleFallback) handleFallback(container);
    else container.scrollTo({ top: 0, behavior: 'auto' });
  }, [key, ready, containerRef]);
}
