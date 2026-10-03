'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { ProgrammationWithRepas } from '@/types';

interface PlanningSlotProps {
  /** Date du créneau */
  day: Date;
  /** 0 = Midi, 1 = Soir */
  heure: 0 | 1;
  /** Libellé du créneau (ex: "Midi" | "Soir") */
  label: string;
  /** Programmation existante pour ce créneau, ou undefined si vide */
  programmation?: ProgrammationWithRepas;
  /** Semaine courante (pour les liens de navigation) */
  currentWeek: number;
  /** Année courante (pour les liens de navigation) */
  currentYear: number;
  /** Appelé quand l'utilisateur clique sur un créneau occupé en mode normal */
  onOpenDetail: (prog: ProgrammationWithRepas, dateStr: string) => void;
  /** Mode programmation rapide actif */
  isSchedulingMode?: boolean;
  /** Appelé pour programmer le repas directement sur ce créneau */
  onScheduleRepas?: (dateStr: string, heure: 0 | 1) => void;
}

/**
 * Ligne d'un créneau (midi / soir) dans le menu de la semaine :
 * soit le repas programmé (cliquable), soit une invitation à en ajouter un.
 */
export default function PlanningSlot({
  day,
  heure,
  label,
  programmation,
  currentWeek,
  currentYear,
  onOpenDetail,
  isSchedulingMode = false,
  onScheduleRepas,
}: PlanningSlotProps) {
  const router = useRouter();
  const dateStr = day.toISOString().split('T')[0];

  const handleClickSlot = () => {
    if (isSchedulingMode && onScheduleRepas) {
      onScheduleRepas(dateStr, heure);
      return;
    }

    if (programmation) {
      onOpenDetail(programmation, dateStr);
    } else {
      router.push(`/repas?selectMode=true&date=${dateStr}&heure=${heure}&returnWeek=${currentWeek}&returnYear=${currentYear}`, { scroll: false });
    }
  };

  const repas = programmation?.repas;
  const highlight = 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/40';

  return (
    <button
      onClick={handleClickSlot}
      className={`w-full min-h-[4.25rem] flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-input text-left cursor-pointer transition-colors ${highlight}`}
    >
      <div
        className={`w-12 h-12 shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${
          repas ? 'bg-neutral-100 dark:bg-neutral-800/60' : 'border border-dashed border-neutral-300 dark:border-neutral-700'
        }`}
      >
        {repas?.photoUrl ? (
          <img src={repas.photoUrl} alt="" className="object-cover w-full h-full" />
        ) : repas ? (
          <span className="font-display italic text-xl text-neutral-400 dark:text-neutral-600">
            {repas.titre.trim().charAt(0).toUpperCase()}
          </span>
        ) : (
          <Plus className="h-4 w-4 text-neutral-400 dark:text-neutral-600" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <span className="eyebrow block">{label}</span>
        {repas ? (
          <span className="block font-display text-[17px] leading-snug line-clamp-2">{repas.titre}</span>
        ) : (
          <span className="block text-sm text-text-light-muted dark:text-text-dark-muted">
            Ajouter un repas
          </span>
        )}
      </div>

    </button>
  );
}
