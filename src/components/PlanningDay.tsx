'use client';

import React from 'react';
import PlanningSlot from '@/components/PlanningSlot';
import type { ProgrammationWithRepas } from '@/types';

interface PlanningDayProps {
  day: Date;
  /** Nom du jour (ex: "lundi") */
  weekdayLabel: string;
  /** Numéro du jour dans le mois */
  dayNumber: string;
  /** Mois abrégé (ex: "oct.") */
  monthLabel: string;
  isToday: boolean;
  currentWeek: number;
  currentYear: number;
  /** Retourne la programmation d'un créneau (0 = midi, 1 = soir) */
  findProgrammation: (day: Date, heure: 0 | 1) => ProgrammationWithRepas | undefined;
  onOpenDetail: (prog: ProgrammationWithRepas, dateStr: string) => void;
  isSchedulingMode: boolean;
  onScheduleRepas: (dateStr: string, heure: 0 | 1) => void;
}

/** Une journée du menu de la semaine : date à gauche, midi et soir à droite. */
export default function PlanningDay({
  day,
  weekdayLabel,
  dayNumber,
  monthLabel,
  isToday,
  findProgrammation,
  ...slotProps
}: PlanningDayProps) {
  const dayStr = day.toISOString().split('T')[0];

  return (
    <section
      id={`day-card-${dayStr}`}
      className={`grid grid-cols-[3.75rem_1fr] md:grid-cols-[6rem_1fr] gap-4 py-5 border-b border-neutral-200 dark:border-neutral-800 ${
        isToday ? 'border-l-[3px] border-l-brand pl-3 -ml-3' : ''
      }`}
    >
      <header className="pt-0.5">
        <span className="eyebrow block capitalize">{weekdayLabel.slice(0, 3)}.</span>
        <span className="block font-display text-4xl font-semibold leading-none mt-1">
          <span className={isToday ? 'marker' : ''}>{dayNumber}</span>
        </span>
        <span className="block text-xs mt-1.5 text-text-light-muted dark:text-text-dark-muted">
          {isToday ? "aujourd'hui" : monthLabel}
        </span>
      </header>

      <div className="grid md:grid-cols-2 md:gap-x-8 gap-y-1">
        {([0, 1] as const).map((heure) => (
          <PlanningSlot
            key={heure}
            day={day}
            heure={heure}
            label={heure === 0 ? 'Midi' : 'Soir'}
            programmation={findProgrammation(day, heure)}
            {...slotProps}
          />
        ))}
      </div>
    </section>
  );
}
