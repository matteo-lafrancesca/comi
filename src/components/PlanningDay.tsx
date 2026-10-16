'use client';

import React from 'react';
import PlanningSlot from '@/components/PlanningSlot';
import type { ProgrammationWithRepas } from '@/types';
import type { WeekRef, Ymd } from '@/lib/date-utils';
import { formatMonthShort, weekdayLabel } from '@/lib/date-format';

interface PlanningDayProps {
  date: Ymd;
  isToday: boolean;
  /** Semaine affichée */
  week: WeekRef;
  /** Repas du midi et du soir (undefined : créneau libre) */
  midi?: ProgrammationWithRepas;
  soir?: ProgrammationWithRepas;
  onOpenDetail: (prog: ProgrammationWithRepas) => void;
  isSchedulingMode: boolean;
  onScheduleRepas: (date: Ymd, heure: 0 | 1) => void;
}

/** Une journée du menu de la semaine : date à gauche, midi et soir à droite. */
export default function PlanningDay({ date, isToday, midi, soir, ...slotProps }: PlanningDayProps) {
  return (
    <section
      id={`day-card-${date}`}
      className={`grid grid-cols-[3.75rem_1fr] md:grid-cols-[6rem_1fr] gap-4 py-5 border-b border-neutral-200 dark:border-neutral-800 ${
        isToday ? 'border-l-[3px] border-l-brand pl-3 -ml-3' : ''
      }`}
    >
      <header className="pt-0.5">
        <span className="eyebrow block capitalize">{weekdayLabel(date).slice(0, 3)}.</span>
        <span className="block font-display text-4xl font-semibold leading-none mt-1">{Number(date.slice(8))}</span>
        <span className="block text-xs mt-1.5 text-text-light-muted dark:text-text-dark-muted">
          {isToday ? "aujourd'hui" : formatMonthShort(date)}
        </span>
      </header>

      <div className="grid md:grid-cols-2 md:gap-x-8 gap-y-1">
        <PlanningSlot date={date} heure={0} label="Midi" programmation={midi} {...slotProps} />
        <PlanningSlot date={date} heure={1} label="Soir" programmation={soir} {...slotProps} />
      </div>
    </section>
  );
}
