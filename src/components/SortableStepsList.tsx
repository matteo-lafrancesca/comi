'use client';

import React from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import { newStep } from '@/lib/repas-form';
import type { StepItem } from '@/types';

interface SortableStepsListProps {
  /** Liste des étapes courantes */
  steps: StepItem[];
  /** Callback déclenché à chaque réordonnancement ou modification */
  onChange: (steps: StepItem[]) => void;
}

/**
 * Liste d'étapes de préparation réordonnable (poignée : souris, doigt en appui long, clavier),
 * via @dnd-kit. Compatible desktop et mobile / iOS PWA.
 */
export default function SortableStepsList({ steps, onChange }: SortableStepsListProps) {
  const sensors = useSensors(
    useSensor(MouseSensor),
    // Appui bref avant de saisir : un glissement vertical immédiat reste un scroll
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = steps.findIndex((s) => s.id === active.id);
    const to = steps.findIndex((s) => s.id === over.id);
    if (from !== -1 && to !== -1) onChange(arrayMove(steps, from, to));
  };

  return (
    <div className="space-y-4">
      <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">
        Étapes ({steps.length})
      </h2>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps} strategy={verticalListSortingStrategy}>
          {steps.map((step, idx) => (
            <SortableStep
              key={step.id}
              step={step}
              index={idx}
              onTextChange={(text) => onChange(steps.map((s) => (s.id === step.id ? { ...s, text } : s)))}
              onRemove={() => onChange(steps.filter((s) => s.id !== step.id))}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button variant="secondary" size="sm" onClick={() => onChange([...steps, newStep()])}>
        <Plus className="h-4 w-4" />
        Ajouter une étape
      </Button>
    </div>
  );
}

interface SortableStepProps {
  step: StepItem;
  index: number;
  onTextChange: (text: string) => void;
  onRemove: () => void;
}

function SortableStep({ step, index, onTextChange, onRemove }: SortableStepProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        // Déplacement vertical uniquement
        transform: CSS.Transform.toString(transform && { ...transform, x: 0, scaleX: 1, scaleY: 1 }),
        transition,
        position: 'relative',
        zIndex: isDragging ? 20 : 1,
      }}
      className={[
        'flex gap-3 items-start py-4 border-b border-dashed border-neutral-300 dark:border-neutral-700',
        isDragging ? 'rounded-card bg-card-light dark:bg-card-dark border border-neutral-300 dark:border-neutral-600 shadow-lg px-2' : '',
      ].join(' ')}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label="Réordonner l'étape"
        className={[
          'shrink-0 mt-1.5 p-1 touch-none select-none transition-colors duration-150',
          isDragging
            ? 'text-brand cursor-grabbing'
            : 'text-text-light-muted dark:text-text-dark-muted cursor-grab hover:text-text-light-main dark:hover:text-text-dark-main active:cursor-grabbing',
        ].join(' ')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="shrink-0 w-6 text-right font-display italic text-3xl leading-none text-brand mt-1 select-none">
        {index + 1}
      </span>

      <textarea
        value={step.text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={`Description de l'étape ${index + 1}...`}
        rows={4}
        className="flex-1 px-3 py-2 text-[15px] leading-relaxed border border-neutral-300 dark:border-neutral-700 rounded-input bg-transparent outline-none focus:border-text-light-main dark:focus:border-text-dark-main min-h-[96px] resize-y"
      />

      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 mt-1.5 p-1 text-text-light-muted dark:text-text-dark-muted hover:text-red-700 dark:hover:text-red-400 cursor-pointer transition-colors duration-150"
        aria-label="Supprimer l'étape"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
