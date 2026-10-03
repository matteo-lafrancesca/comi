'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekSelectorProps {
  week: number;
  year: number;
  /** Dates de début et de fin de la semaine, déjà formatées */
  dateRange: string;
  onPrev: () => void;
  onNext: () => void;
  /** Si fourni, un bouton « Cette semaine » est affiché */
  onReset?: () => void;
  className?: string;
}

/** Bandeau de navigation entre semaines : numéro en serif, dates en dessous. */
export default function WeekSelector({ week, dateRange, onPrev, onNext, onReset, className = '' }: WeekSelectorProps) {
  const arrow =
    'p-2 -m-2 text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main transition-colors cursor-pointer print:hidden';

  return (
    <div
      className={`flex items-center justify-between gap-4 py-4 border-y border-neutral-200 dark:border-neutral-800 print:border-none print:py-0 ${className}`}
    >
      <button onClick={onPrev} aria-label="Semaine précédente" className={arrow}>
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="text-center print:text-left">
        <span className="block font-display text-2xl font-semibold leading-none">Semaine {week}</span>
        <span className="block mt-1.5 text-xs text-text-light-muted dark:text-text-dark-muted">{dateRange}</span>
        {onReset && (
          <button
            onClick={onReset}
            className="mt-1.5 text-xs font-semibold underline underline-offset-4 decoration-brand decoration-2 cursor-pointer print:hidden"
          >
            Revenir à cette semaine
          </button>
        )}
      </div>

      <button onClick={onNext} aria-label="Semaine suivante" className={arrow}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
