'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  Plus, 
  Utensils, 
  CalendarDays,
  Loader2
} from 'lucide-react';
import { ProgrammationWithRepas, RepasWithIngredients } from '@/types';
import { getCustomWeekDays, getOrderedDayLabels, getAdjacentWeek } from '@/lib/date-utils';
import RepasDetailModal from '@/components/RepasDetailModal';
import WeekSelector from '@/components/WeekSelector';
import { useSettings } from '@/contexts/SettingsContext';


export default function PlanificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { weekStartDay } = useSettings();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [weekInfo, setWeekInfo] = useState<{ start: string; end: string } | null>(null);
  const [programmations, setProgrammations] = useState<ProgrammationWithRepas[]>([]);
  
  // Modal states for meal details
  const [selectedRepas, setSelectedRepas] = useState<RepasWithIngredients | null>(null);
  const [selectedProgId, setSelectedProgId] = useState<number | undefined>(undefined);
  const [selectedSlotDate, setSelectedSlotDate] = useState<string | null>(null);
  const [selectedSlotHeure, setSelectedSlotHeure] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch planning data
  useEffect(() => {
    let active = true;
    const fetchPlanning = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const weekParam = searchParams.get('week');
        const yearParam = searchParams.get('year');
        
        let url = '/api/planning';
        if (weekParam && yearParam) {
          url += `?week=${weekParam}&year=${yearParam}`;
        }
        
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('Impossible de charger le planning.');
        }
        
        const data = await res.json();
        
        if (active) {
          setProgrammations(data.programmations);
          setCurrentWeek(data.week);
          setCurrentYear(data.year);
          setWeekInfo({
            start: data.start,
            end: data.end
          });
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Une erreur est survenue lors de la récupération du planning.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    
    fetchPlanning();
    
    return () => {
      active = false;
    };
  }, [searchParams]);

  // Navigate to previous/next week using standard ISO week offsets
  const handlePrevWeek = () => {
    if (currentWeek === null || currentYear === null) return;
    const { week, year } = getAdjacentWeek(currentWeek, currentYear, 'prev');
    router.push(`${pathname}?week=${week}&year=${year}`);
  };

  const handleNextWeek = () => {
    if (currentWeek === null || currentYear === null) return;
    const { week, year } = getAdjacentWeek(currentWeek, currentYear, 'next');
    router.push(`${pathname}?week=${week}&year=${year}`);
  };

  const handleCurrentWeek = () => {
    router.push(pathname);
  };

  // Helper to format date display (forcing UTC to avoid client timezone shifts)
  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      timeZone: 'UTC' 
    });
  };

  const formatDateRange = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short', 
      timeZone: 'UTC' 
    };
    const startFormatted = start.toLocaleDateString('fr-FR', options);
    const endFormatted = end.toLocaleDateString('fr-FR', { 
      ...options, 
      year: 'numeric' 
    });
    
    return `Du ${startFormatted} au ${endFormatted}`;
  };

  // Get the 7 days of the current week according to weekStartDay
  const days =
    currentWeek && currentYear && weekInfo
      ? getCustomWeekDays(new Date(weekInfo.start), weekStartDay)
      : [];
  const dayLabels = getOrderedDayLabels(weekStartDay);

  // Find a programmation for a given date and mealtime (0 = midi, 1 = soir)
  const findProgrammation = (date: Date, heure: number) => {
    const targetDateStr = date.toISOString().split('T')[0];
    return programmations.find((p) => {
      const pDateStr = new Date(p.date).toISOString().split('T')[0];
      return pDateStr === targetDateStr && p.heure === heure;
    });
  };

  const handleUnscheduleSuccess = async (progId: number) => {
    setProgrammations((prev) => prev.filter((p) => p.id !== progId));
  };

  const handleReprogram = () => {
    if (!selectedSlotDate || selectedSlotHeure === null) return;
    setIsDetailOpen(false);
    router.push(`/repas?selectMode=true&date=${selectedSlotDate}&heure=${selectedSlotHeure}&returnWeek=${currentWeek}&returnYear=${currentYear}`);
  };

  const renderSlot = (day: Date, heure: number, label: string) => {
    const prog = findProgrammation(day, heure);
    const dateStr = day.toISOString().split('T')[0];
    
    if (prog) {
      const { id, repas } = prog;
      return (
        <article 
          onClick={() => {
            setSelectedRepas(repas);
            setSelectedProgId(id);
            setSelectedSlotDate(dateStr);
            setSelectedSlotHeure(heure);
            setIsDetailOpen(true);
          }}
          className="flex flex-col justify-between p-3.5 transition-all duration-300 border border-neutral-200/40 dark:border-neutral-800/40 shadow-xs bg-card-light dark:bg-card-dark rounded-card hover:shadow-md hover:scale-[1.02] hover:border-neutral-300 dark:hover:border-neutral-700 active:scale-[0.98] cursor-pointer group h-36"
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
            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 text-[9px] font-extrabold tracking-wider bg-brand-light dark:bg-brand/20 text-brand rounded-full uppercase">
              {label}
            </span>
          </div>
          
          <h4 className="text-xs font-bold text-center line-clamp-2 text-text-light-main dark:text-text-dark-main leading-snug grow flex items-center justify-center px-1">
            {repas.titre}
          </h4>
        </article>
      );
    }

    // Empty slot
    return (
      <button
        onClick={() => {
          router.push(`/repas?selectMode=true&date=${dateStr}&heure=${heure}&returnWeek=${currentWeek}&returnYear=${currentYear}`);
        }}
        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-neutral-200/60 dark:border-neutral-800/50 rounded-card hover:border-brand/50 dark:hover:border-brand/40 hover:bg-brand-light/20 dark:hover:bg-brand/5 group transition-all duration-300 cursor-pointer h-36 w-full text-left outline-none"
      >
        <span className="px-2 py-0.5 text-[9px] font-extrabold tracking-wider bg-neutral-100 dark:bg-neutral-800 text-text-light-muted dark:text-text-dark-muted rounded-full uppercase group-hover:bg-brand-light group-hover:text-brand transition-colors mb-2">
          {label}
        </span>
        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 text-text-light-muted dark:text-text-dark-muted rounded-full group-hover:bg-brand group-hover:text-white transition-all shadow-xs group-hover:scale-105 active:scale-95">
          <Plus className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-semibold text-text-light-muted dark:text-text-dark-muted mt-2 group-hover:text-brand transition-colors">
          Ajouter
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title & Today Link */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text-light-main dark:text-text-dark-main">
          Mon Planning
        </h1>
        {currentWeek && (
          <button
            onClick={handleCurrentWeek}
            className="flex items-center gap-1.5 px-4.5 py-2.5 text-xs font-bold transition-all border bg-card-light dark:bg-card-dark border-neutral-200/50 dark:border-neutral-800 rounded-input hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-text-light-main dark:text-text-dark-main cursor-pointer shadow-xs active:scale-95"
          >
            <CalendarDays className="h-4 w-4 text-brand shrink-0" />
            <span>Semaine actuelle</span>
          </button>
        )}
      </div>

      {/* Week Selector Bar */}
      {weekInfo && currentWeek && currentYear && (
        <WeekSelector
          week={currentWeek}
          year={currentYear}
          dateRange={formatDateRange(weekInfo.start, weekInfo.end)}
          onPrev={handlePrevWeek}
          onNext={handleNextWeek}
        />
      )}

      {/* Main Grid Content Area */}
      {loading ? (
        /* Loader state */
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-brand animate-spin mb-3" />
          <span className="text-sm font-medium text-text-light-muted dark:text-text-dark-muted animate-pulse">
            Chargement de votre planning...
          </span>
        </div>
      ) : error ? (
        /* Error Alert Display */
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/50 p-4 rounded-card text-center text-sm font-medium text-red-600 dark:text-red-400 max-w-lg mx-auto">
          {error}
        </div>
      ) : days.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-text-light-muted dark:text-text-dark-muted font-semibold">
            Aucune semaine chargée.
          </p>
        </div>
      ) : (
        <>
          {/* 💻 VUE PC : Grille à 7 Colonnes */}
          <div className="hidden md:grid grid-cols-7 gap-4 animate-fade-in">
            {days.map((day, idx) => (
              <div key={idx} className="flex flex-col gap-3">
                {/* Day Header */}
                <div className="text-center py-2.5 bg-neutral-100/50 dark:bg-neutral-800/40 border border-neutral-200/10 dark:border-neutral-800/10 rounded-xl shrink-0">
                  <span className="block text-xs font-extrabold capitalize text-text-light-main dark:text-text-dark-main">
                    {dayLabels[idx]}
                  </span>
                  <span className="block text-[10px] font-bold text-text-light-muted dark:text-text-dark-muted mt-0.5">
                    {formatDateLabel(day)}
                  </span>
                </div>
                
                {/* Slots */}
                <div className="flex flex-col gap-3">
                  {renderSlot(day, 0, 'Midi')}
                  {renderSlot(day, 1, 'Soir')}
                </div>
              </div>
            ))}
          </div>

          {/* 📱 VUE MOBILE : Liste Verticale de Jours */}
          <div className="md:hidden space-y-4 animate-fade-in">
            {days.map((day, idx) => (
              <div 
                key={idx} 
                className="bg-card-light dark:bg-card-dark p-4 rounded-card border border-neutral-200/40 dark:border-neutral-800/40 shadow-xs flex flex-col gap-3.5"
              >
                {/* Day Header */}
                <div className="flex items-baseline gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800/40">
                  <h3 className="font-extrabold text-base capitalize text-text-light-main dark:text-text-dark-main">
                    {dayLabels[idx]}
                  </h3>
                  <span className="text-xs font-bold text-text-light-muted dark:text-text-dark-muted">
                    {formatDateLabel(day)}
                  </span>
                </div>
                
                {/* Slots side by side */}
                <div className="grid grid-cols-2 gap-3">
                  {renderSlot(day, 0, 'Midi')}
                  {renderSlot(day, 1, 'Soir')}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Repas Detail Modal */}
      <RepasDetailModal
        repas={selectedRepas}
        isOpen={isDetailOpen}
        programmationId={selectedProgId}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRepas(null);
          setSelectedProgId(undefined);
          setSelectedSlotDate(null);
          setSelectedSlotHeure(null);
        }}
        onUnschedule={handleUnscheduleSuccess}
        onReprogram={handleReprogram}
      />
    </div>
  );
}
