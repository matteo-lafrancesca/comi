'use client';

import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';

// ponytail: outil temporaire pour le décalage des clics en PWA iOS ; à supprimer une fois le recalcul trouvé.

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Hauteur (px) d'une sonde fixe dont la hauteur ou le padding est une expression CSS. */
function probe(css: Partial<CSSStyleDeclaration>, read: (el: HTMLElement) => number): number {
  const el = document.createElement('div');
  Object.assign(el.style, { position: 'fixed', top: '0', left: '0', width: '0', visibility: 'hidden' }, css);
  document.body.appendChild(el);
  const value = read(el);
  el.remove();
  return Math.round(value);
}

function measure(): string {
  const vv = window.visualViewport;
  const safe = (side: 'top' | 'bottom') =>
    probe({ [side === 'top' ? 'paddingTop' : 'paddingBottom']: `env(safe-area-inset-${side}, 0px)` }, (el) =>
      parseFloat(getComputedStyle(el)[side === 'top' ? 'paddingTop' : 'paddingBottom'])
    );
  const unit = (u: string) => probe({ height: `100${u}` }, (el) => el.getBoundingClientRect().height);
  const nav = document.querySelector('nav.absolute')?.getBoundingClientRect();
  return [
    `standalone ${window.matchMedia('(display-mode: standalone)').matches}`,
    `screen ${screen.width}×${screen.height}`,
    `inner ${window.innerWidth}×${window.innerHeight}  outer ${window.outerHeight}`,
    `docEl.client ${document.documentElement.clientHeight}`,
    `vv h ${vv?.height.toFixed(1)} top ${vv?.offsetTop.toFixed(1)} pageTop ${vv?.pageTop.toFixed(1)} scale ${vv?.scale}`,
    `scrollY ${window.scrollY}`,
    `vh ${unit('vh')} lvh ${unit('lvh')} svh ${unit('svh')} dvh ${unit('dvh')}`,
    `safe top ${safe('top')} bottom ${safe('bottom')}`,
    `nav top ${nav?.top.toFixed(1)} bottom ${nav?.bottom.toFixed(1)}`,
  ].join('\n');
}

const viewportMeta = () => document.querySelectorAll<HTMLMetaElement>('meta[name="viewport"]');

/** Recalculs candidats : chacun imite une partie de ce que fait l'ouverture du clavier. */
const TRIGGERS: { label: string; run: () => Promise<void> }[] = [
  {
    label: 'A · reflow body',
    run: async () => {
      document.body.style.display = 'none';
      void document.body.offsetHeight;
      document.body.style.display = '';
    },
  },
  {
    label: 'B · scroll fenêtre 1px',
    run: async () => {
      const html = document.documentElement;
      html.style.height = 'calc(100% + 1px)';
      window.scrollTo(0, 1);
      await nextFrame();
      window.scrollTo(0, 0);
      html.style.height = '';
    },
  },
  {
    label: 'C · réécrire le viewport',
    run: async () => {
      const metas = [...viewportMeta()];
      const last = metas[metas.length - 1];
      const content = last.content;
      last.content = content.replace(', viewport-fit=cover', '');
      await nextFrame();
      await wait(100);
      last.content = content;
    },
  },
  {
    label: 'D · supprimer le viewport par défaut',
    run: async () => {
      const metas = [...viewportMeta()];
      if (metas.length > 1) metas[0].remove();
    },
  },
  {
    label: 'E · focus sans clavier',
    run: async () => {
      const input = document.createElement('input');
      input.setAttribute('inputmode', 'none');
      Object.assign(input.style, { position: 'fixed', top: '0', left: '0', opacity: '0', fontSize: '16px' });
      document.body.appendChild(input);
      input.focus();
      await wait(300);
      input.blur();
      input.remove();
    },
  },
  {
    label: 'F · html en 100lvh puis retour',
    run: async () => {
      const html = document.documentElement;
      html.style.height = '100lvh';
      await nextFrame();
      await wait(100);
      html.style.height = '';
    },
  },
];

/**
 * Diagnostic temporaire du décalage des clics en PWA iOS : mesures du viewport, point rouge à l'endroit où
 * chaque contact est enregistré, et boutons qui déclenchent chacun un recalcul différent.
 */
export default function ViewportDiagnostic() {
  const [metrics, setMetrics] = useState('');
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const dot = document.createElement('div');
      Object.assign(dot.style, {
        position: 'fixed',
        left: `${t.clientX - 6}px`,
        top: `${t.clientY - 6}px`,
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: 'red',
        zIndex: '100000',
        pointerEvents: 'none',
      });
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 2000);
    };
    document.addEventListener('touchstart', onTouch, { capture: true, passive: true });
    return () => document.removeEventListener('touchstart', onTouch, { capture: true });
  }, []);

  const runTrigger = async (label: string, run: () => Promise<void>) => {
    await run();
    await wait(300);
    setLog((l) => [...l, label]);
    setMetrics(measure());
  };

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-text-light-muted dark:text-text-dark-muted">
        Touche un point précis : le point rouge montre où le contact est enregistré. Teste un bouton, puis vérifie
        si le point tombe sous ton doigt.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setMetrics(measure())}>
          Mesurer
        </Button>
        {TRIGGERS.map((t) => (
          <Button key={t.label} size="sm" variant="secondary" onClick={() => runTrigger(t.label, t.run)}>
            {t.label}
          </Button>
        ))}
      </div>
      {log.length > 0 && <p className="text-xs">Déclenchés : {log.join(', ')}</p>}
      {metrics && (
        <pre className="text-xs whitespace-pre-wrap font-mono bg-neutral-100 dark:bg-neutral-900 p-3 rounded-input">
          {metrics}
        </pre>
      )}
    </div>
  );
}
