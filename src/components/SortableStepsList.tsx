'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical, Trash2, Plus } from 'lucide-react';

/** Un élément d'étape de préparation */
export interface StepItem {
  id: string;
  text: string;
}

interface SortableStepsListProps {
  /** Liste des étapes courantes */
  steps: StepItem[];
  /** Callback déclenché à chaque réordonnancement ou modification */
  onChange: (steps: StepItem[]) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

/** Délai en ms avant de considérer un touch comme un drag (évite les conflits scroll) */
const DRAG_START_THRESHOLD_MS = 120;
/** Distance px avant d'annuler le long-press (c'est un scroll) */
const DRAG_CANCEL_THRESHOLD_PX = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Liste d'étapes de préparation avec drag & drop natif (Pointer Events).
 * L'item draggé suit le doigt/curseur en temps réel via manipulation DOM directe.
 * Les items voisins s'écartent magnétiquement via React state (overIndex).
 * Compatible desktop et mobile/iOS PWA.
 */
export default function SortableStepsList({ steps, onChange }: SortableStepsListProps) {
  // ── État React (déclenche les re-renders pour l'effet magnétique) ────────────
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // ── Refs DOM ────────────────────────────────────────────────────────────────
  /** Map id → élément DOM de la ligne */
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── Refs de drag (pas de re-render) ─────────────────────────────────────────
  /** Snapshot des BoundingClientRect pris au début du drag */
  const itemRectsRef = useRef<DOMRect[]>([]);
  /** Y du pointer au début du drag */
  const startYRef = useRef(0);
  /** Index de l'item en cours de drag */
  const draggingIndexRef = useRef(-1);
  /** id de l'item en cours de drag (miroir ref de draggingId state) */
  const draggingIdRef = useRef<string | null>(null);
  /** overIndex courant (miroir ref de overIndex state) */
  const overIndexRef = useRef<number | null>(null);
  /** Drag actif ? */
  const isDragActiveRef = useRef(false);
  /** Timer long-press mobile */
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Y initial lors du pointerdown (pour détecter le scroll) */
  const initialYRef = useRef(0);

  // ── Synchro refs ↔ state ─────────────────────────────────────────────────────
  useEffect(() => {
    draggingIdRef.current = draggingId;
  }, [draggingId]);

  useEffect(() => {
    overIndexRef.current = overIndex;
  }, [overIndex]);

  // ── Helpers édition ─────────────────────────────────────────────────────────

  const handleUpdate = useCallback(
    (id: string, value: string) => {
      onChange(steps.map((s) => (s.id === id ? { ...s, text: value } : s)));
    },
    [steps, onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(steps.filter((s) => s.id !== id));
    },
    [steps, onChange]
  );

  const handleAdd = useCallback(() => {
    onChange([...steps, { id: `step-${Date.now()}`, text: '' }]);
  }, [steps, onChange]);

  // ── Calcul du translateY pour les items NON-draggés (effet magnétique) ───────

  const getNeighborTranslateY = useCallback(
    (idx: number, id: string): number => {
      if (draggingId === null || overIndex === null) return 0;
      if (id === draggingId) return 0; // géré séparément

      const dIdx = draggingIndexRef.current;
      const draggedHeight = itemRectsRef.current[dIdx]?.height ?? 88;

      if (dIdx < overIndex) {
        // Drag vers le bas → items entre [dIdx+1 … overIndex] remontent
        if (idx > dIdx && idx <= overIndex) return -draggedHeight;
      } else if (dIdx > overIndex) {
        // Drag vers le haut → items entre [overIndex … dIdx-1] descendent
        if (idx >= overIndex && idx < dIdx) return draggedHeight;
      }

      return 0;
    },
    [draggingId, overIndex]
  );

  // ── Calcul de l'overIndex à partir de la position Y courante ────────────────

  const computeOverIndex = useCallback((currentY: number): number => {
    const rects = itemRectsRef.current;
    if (rects.length === 0) return draggingIndexRef.current;

    let closest = draggingIndexRef.current;
    let closestDist = Infinity;

    rects.forEach((rect, idx) => {
      const centerY = rect.top + rect.height / 2;
      const dist = Math.abs(currentY - centerY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = idx;
      }
    });

    return closest;
  }, []);

  // ── Activation du drag ───────────────────────────────────────────────────────

  const activateDrag = useCallback(
    (id: string, pointerId: number, startY: number, gripEl: HTMLElement) => {
      const idx = steps.findIndex((s) => s.id === id);
      if (idx === -1) return;

      // Snapshot des positions au moment où le drag démarre
      const rects: DOMRect[] = [];
      steps.forEach((s) => {
        const el = itemRefs.current.get(s.id);
        rects.push(el ? el.getBoundingClientRect() : new DOMRect());
      });
      itemRectsRef.current = rects;

      draggingIndexRef.current = idx;
      startYRef.current = startY;
      isDragActiveRef.current = true;

      // Capture du pointer sur la poignée pour recevoir les events même hors bounds
      gripEl.setPointerCapture(pointerId);

      // Initialiser le transform de l'item draggé à 0 (il partira de là)
      const draggingEl = itemRefs.current.get(id);
      if (draggingEl) {
        draggingEl.style.transition = 'none';
        draggingEl.style.transform = 'translateY(0px) scale(1.01)';
        draggingEl.style.zIndex = '20';
        draggingEl.style.boxShadow = '0 12px 32px -4px rgba(0,0,0,0.15)';
      }

      setDraggingId(id);
      setOverIndex(idx);
    },
    [steps]
  );

  // ── Pointer Events ───────────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.preventDefault();

      const startY = e.clientY;
      initialYRef.current = startY;
      startYRef.current = startY;
      const gripEl = e.currentTarget as HTMLElement;
      const pointerId = e.pointerId;

      isDragActiveRef.current = false;

      if (e.pointerType === 'touch') {
        longPressTimerRef.current = setTimeout(() => {
          activateDrag(id, pointerId, startY, gripEl);
        }, DRAG_START_THRESHOLD_MS);
      } else {
        activateDrag(id, pointerId, startY, gripEl);
      }
    },
    [activateDrag]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (!isDragActiveRef.current) {
        // Sur touch, annuler le long-press si le doigt bouge verticalement (= scroll)
        if (longPressTimerRef.current !== null) {
          const deltaY = Math.abs(e.clientY - initialYRef.current);
          if (deltaY > DRAG_CANCEL_THRESHOLD_PX) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
        return;
      }

      if (draggingIdRef.current !== id) return;

      const deltaY = e.clientY - startYRef.current;

      // ① Déplacer l'item draggé en temps réel — manipulation DOM directe (pas de re-render)
      const draggingEl = itemRefs.current.get(id);
      if (draggingEl) {
        draggingEl.style.transform = `translateY(${deltaY}px) scale(1.01)`;
      }

      // ② Recalculer l'overIndex pour l'effet magnétique des voisins
      const newOverIndex = computeOverIndex(e.clientY);
      if (newOverIndex !== overIndexRef.current) {
        setOverIndex(newOverIndex); // déclenche un re-render React (léger)
      }
    },
    [computeOverIndex]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (!isDragActiveRef.current) return;
      isDragActiveRef.current = false;

      if (draggingIdRef.current !== id) return;

      // Réinitialiser le style de l'item draggé
      const draggingEl = itemRefs.current.get(id);
      if (draggingEl) {
        draggingEl.style.transform = '';
        draggingEl.style.zIndex = '';
        draggingEl.style.boxShadow = '';
        draggingEl.style.transition = '';
      }

      const dIdx = draggingIndexRef.current;
      const targetIdx = overIndexRef.current ?? dIdx;

      if (targetIdx !== dIdx) {
        const newSteps = [...steps];
        const [removed] = newSteps.splice(dIdx, 1);
        newSteps.splice(targetIdx, 0, removed);
        onChange(newSteps);
      }

      setDraggingId(null);
      setOverIndex(null);
    },
    [steps, onChange]
  );

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Réinitialiser le style de l'item draggé si annulation
    if (draggingIdRef.current) {
      const el = itemRefs.current.get(draggingIdRef.current);
      if (el) {
        el.style.transform = '';
        el.style.zIndex = '';
        el.style.boxShadow = '';
        el.style.transition = '';
      }
    }

    isDragActiveRef.current = false;
    setDraggingId(null);
    setOverIndex(null);
  }, []);

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-text-light-main dark:text-text-dark-main">
          Étapes de préparation ({steps.length})
        </span>
      </div>

      {/* Liste */}
      <div className="relative" style={{ isolation: 'isolate' }}>
        {/* eslint-disable-next-line react-hooks/refs -- géométrie de drag lue dans des refs (dette: la passer en state) */}
        {steps.map((s, idx) => {
          const isDragging = s.id === draggingId;
          // translateY pour les items NON-draggés (magnétique) — via React state
          const neighborTranslateY = getNeighborTranslateY(idx, s.id);

          return (
            <div
              key={s.id}
              ref={(el) => {
                if (el) itemRefs.current.set(s.id, el);
                else itemRefs.current.delete(s.id);
              }}
              style={
                isDragging
                  ? {
                      // Le style de l'item draggé est géré en direct via le DOM dans handlePointerMove
                      position: 'relative',
                      zIndex: 20,
                    }
                  : {
                      position: 'relative',
                      zIndex: 1,
                      transform: `translateY(${neighborTranslateY}px)`,
                      transition: 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }
              }
              className={[
                'flex gap-3 items-start py-3 border-b border-neutral-100 dark:border-neutral-800/40',
                isDragging
                  ? 'rounded-2xl bg-card-light dark:bg-card-dark border border-neutral-200/60 dark:border-neutral-700/60 px-2'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* Poignée drag */}
              <button
                type="button"
                aria-label="Réordonner l'étape"
                className={[
                  'shrink-0 mt-1.5 p-1 rounded-lg touch-none select-none transition-colors duration-150',
                  isDragging
                    ? 'text-brand cursor-grabbing'
                    : 'text-text-light-muted dark:text-text-dark-muted cursor-grab hover:text-brand hover:bg-brand-light/30 dark:hover:bg-brand/10 active:cursor-grabbing',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onPointerDown={(e) => handlePointerDown(e, s.id)}
                onPointerMove={(e) => handlePointerMove(e, s.id)}
                onPointerUp={(e) => handlePointerUp(e, s.id)}
                onPointerCancel={handlePointerCancel}
              >
                <GripVertical className="h-4 w-4" />
              </button>

              {/* Numéro */}
              <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-brand-light dark:bg-brand/10 text-brand text-xs font-semibold border border-brand/15 mt-1.5 select-none">
                {idx + 1}
              </span>

              {/* Textarea */}
              <textarea
                value={s.text}
                onChange={(e) => handleUpdate(s.id, e.target.value)}
                placeholder={`Description de l'étape ${idx + 1}...`}
                rows={4}
                className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-800 rounded-xl bg-card-light dark:bg-card-dark text-text-light-main dark:text-text-dark-main outline-none focus:border-brand font-medium min-h-[96px] resize-y"
              />

              {/* Suppression */}
              <button
                type="button"
                onClick={() => handleRemove(s.id)}
                className="shrink-0 mt-1.5 p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors duration-150"
                title="Supprimer l'étape"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Bouton Ajouter une étape */}
      <button
        type="button"
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl hover:border-brand/40 text-text-light-muted dark:text-text-dark-muted hover:text-brand font-bold text-sm transition-all duration-300 active:scale-98 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        <span>Ajouter une étape</span>
      </button>
    </div>
  );
}
