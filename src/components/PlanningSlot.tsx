'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Utensils } from 'lucide-react';
import type { ProgrammationWithRepas } from '@/types';

interface PlanningSlotProps {
  /** Date du créneau */
  day: Date;
  /** 0 = Midi, 1 = Soir */
  heure: 0 | 1;
  /** Label affiché dans le badge (ex: "Midi" | "Soir") */
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
 * Créneau de planification — affiche soit un repas programmé (cliquable),
 * soit un bouton d'ajout vide.
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

  if (programmation) {
    const { repas } = programmation;
    return (
      <article
        onClick={handleClickSlot}
        className={`flex flex-col justify-between p-3.5 transition-all duration-300 border shadow-xs bg-card-light dark:bg-card-dark rounded-card hover:shadow-md active:scale-[0.98] cursor-pointer group h-36 relative ${
          isSchedulingMode 
            ? 'border-brand/50 hover:border-brand hover:ring-2 hover:ring-brand/30' 
            : 'border-neutral-200/40 dark:border-neutral-800/40 hover:border-neutral-300 dark:hover:border-neutral-700'
        }`}
      >
        {/* Cover image or icon */}
        <div className="relative w-full h-16 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800/60 mb-2 flex items-center justify-center border border-neutral-100/50 dark:border-neutral-800/10 shrink-0">
          {repas.photoUrl ? (
            <img
              src={repas.photoUrl}
              alt={repas.titre}
              className="object-cover w-full h-full"
            />
          ) : (
            <Utensils className="h-5 w-5 text-brand/35 dark:text-brand/20" />
          )}
          {/* Slot indicator */}
          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 text-[9px] font-semibold tracking-wider bg-brand-light dark:bg-brand/20 text-brand rounded-full uppercase">
            {label}
          </span>
          {isSchedulingMode && (
            <span className="absolute top-1.5 right-1.5 px-2 py-0.5 text-[9px] font-semibold tracking-wider bg-amber-500 text-white rounded-full uppercase shadow-xs">
              Remplacer
            </span>
          )}
        </div>

        <h4 className="text-xs font-bold text-center line-clamp-2 text-text-light-main dark:text-text-dark-main leading-snug grow flex items-center justify-center px-1">
          {repas.titre}
        </h4>
      </article>
    );
  }

  // Créneau vide
  return (
    <button
      onClick={handleClickSlot}
      className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-card group transition-all duration-300 cursor-pointer h-36 w-full text-left outline-none ${
        isSchedulingMode
          ? 'border-brand bg-brand-light/30 dark:bg-brand/10 hover:bg-brand-light/50 dark:hover:bg-brand/20 scale-[1.01]'
          : 'border-neutral-200/60 dark:border-neutral-800/50 hover:border-brand/50 dark:hover:border-brand/40 hover:bg-brand-light/20 dark:hover:bg-brand/5'
      }`}
    >
      <span className={`px-2 py-0.5 text-[9px] font-semibold tracking-wider rounded-full uppercase mb-2 transition-colors ${
        isSchedulingMode 
          ? 'bg-brand text-ink' 
          : 'bg-neutral-100 dark:bg-neutral-800 text-text-light-muted dark:text-text-dark-muted group-hover:bg-brand-light group-hover:text-brand'
      }`}>
        {label}
      </span>
      <div className={`p-2 rounded-full transition-all shadow-xs active:scale-95 ${
        isSchedulingMode
          ? 'bg-brand text-ink'
          : 'bg-neutral-50 dark:bg-neutral-800 text-text-light-muted dark:text-text-dark-muted group-hover:bg-brand group-hover:text-white'
      }`}>
        <Plus className="h-4 w-4" />
      </div>
      <span className={`text-[10px] font-semibold mt-2 transition-colors ${
        isSchedulingMode
          ? 'text-brand font-bold'
          : 'text-text-light-muted dark:text-text-dark-muted group-hover:text-brand'
      }`}>
        {isSchedulingMode ? 'Placer ici' : 'Ajouter'}
      </span>
    </button>
  );
}
