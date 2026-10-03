'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface WeekSelectorProps {
  week: number;
  year: number;
  /** Formatted start and end dates of the current week */
  dateRange: string;
  onPrev: () => void;
  onNext: () => void;
  /** If provided, a "Semaine actuelle" reset button is shown */
  onReset?: () => void;
  className?: string;
}

export default function WeekSelector({
  week,
  dateRange,
  onPrev,
  onNext,
  onReset,
  className = '',
}: WeekSelectorProps) {
  return (
    <div
      className={`flex items-center justify-between p-3 bg-card-light dark:bg-card-dark rounded-card border border-neutral-200/40 dark:border-neutral-800/40 shadow-xs print:border-none print:shadow-none print:bg-transparent print:p-0 ${className}`}
    >
      <button
        onClick={onPrev}
        aria-label="Semaine précédente"
        className="p-2.5 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors border border-neutral-200/30 dark:border-neutral-800/20 text-text-light-main dark:text-text-dark-main cursor-pointer print:hidden"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="text-center print:text-left">
        <span className="block text-sm font-semibold text-text-light-main dark:text-text-dark-main print:text-xl">
          Semaine {week}
        </span>
        <span className="block text-xs font-medium text-text-light-muted dark:text-text-dark-muted print:text-sm">
          {dateRange}
        </span>
      </div>

      <div className="flex items-center gap-2 print:hidden">
        {onReset && (
          <button
            onClick={onReset}
            aria-label="Revenir à la semaine actuelle"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-all border border-neutral-200/50 dark:border-neutral-800 rounded-input hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-text-light-main dark:text-text-dark-main cursor-pointer active:scale-95 bg-card-light dark:bg-card-dark"
          >
            <CalendarDays className="h-3.5 w-3.5 text-brand shrink-0" />
            <span>Semaine actuelle</span>
          </button>
        )}

        <button
          onClick={onNext}
          aria-label="Semaine suivante"
          className="p-2.5 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors border border-neutral-200/30 dark:border-neutral-800/20 text-text-light-main dark:text-text-dark-main cursor-pointer"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
