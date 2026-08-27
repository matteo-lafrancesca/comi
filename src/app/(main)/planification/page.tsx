'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  Utensils, 
  CalendarDays,
  Loader2
} from 'lucide-react';
import { ProgrammationWithRepas, RepasWithIngredients } from '@/types';
import { getCustomWeekDays, getOrderedDayLabels, getAdjacentWeek, getParisDate } from '@/lib/date-utils';
import RepasDetailModal from '@/components/RepasDetailModal';
import WeekSelector from '@/components/WeekSelector';
import PlanningSlot from '@/components/PlanningSlot';
import { useSettings } from '@/contexts/SettingsContext';
import { useNavigationCache } from '@/contexts/NavigationCacheContext';
import { apiFetch } from '@/lib/api';

export default function PlanificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { weekStartDay } = useSettings();
  const { planificationCache, updatePlanificationCache } = useNavigationCache();

  const weekParam = searchParams.get('week') || 'current';
  const yearParam = searchParams.get('year') || 'current';
  const cacheKey = `${weekParam}-${yearParam}`;
  const isCacheValid = planificationCache.isLoaded && planificationCache.key === cacheKey;

  const [loading, setLoading] = useState(!isCacheValid);
  const [error, setError] = useState<string | null>(null);
  
  const [currentWeek, setCurrentWeek] = useState<number | null>(isCacheValid ? planificationCache.currentWeek : null);
  const [currentYear, setCurrentYear] = useState<number | null>(isCacheValid ? planificationCache.currentYear : null);
  const [weekInfo, setWeekInfo] = useState<{ start: string; end: string } | null>(isCacheValid ? planificationCache.weekInfo : null);
  const [programmations, setProgrammations] = useState<ProgrammationWithRepas[]>(isCacheValid ? planificationCache.programmations : []);
  
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
        if (!isCacheValid) {
          setLoading(true);
        }
        setError(null);
        
        const weekVal = searchParams.get('week');
        const yearVal = searchParams.get('year');
        
        let url = '/api/planning';
        if (weekVal && yearVal) {
          url += `?week=${weekVal}&year=${yearVal}`;
        }
        
        const res = await apiFetch(url);
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
          // Update cache
          updatePlanificationCache({
            programmations: data.programmations,
            currentWeek: data.week,
            currentYear: data.year,
            weekInfo: {
              start: data.start,
              end: data.end
            },
            isLoaded: true,
            key: cacheKey
          });
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la récupération du planning.');
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
  }, [searchParams, cacheKey, isCacheValid, updatePlanificationCache]);

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

  // Refs for scrolling to today
  const todayMobileRef = useRef<HTMLDivElement | null>(null);
  const todayDesktopRef = useRef<HTMLDivElement | null>(null);

  const todayParis = getParisDate();
  const todayStr = `${todayParis.getFullYear()}-${String(todayParis.getMonth() + 1).padStart(2, '0')}-${String(todayParis.getDate()).padStart(2, '0')}`;

  // Auto-scroll to today's card/column once loading completes
  useEffect(() => {
    if (!loading && days.length > 0) {
      const timer = setTimeout(() => {
        const targetElement = todayMobileRef.current || todayDesktopRef.current;
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, days]);

  // Find a programmation for a given date and mealtime (0 = midi, 1 = soir)
  const findProgrammation = (date: Date, heure: number) => {
    const targetDateStr = date.toISOString().split('T')[0];
    return programmations.find((p) => {
      const pDateStr = new Date(p.date).toISOString().split('T')[0];
      return pDateStr === targetDateStr && p.heure === heure;
    });
  };

  const handleUnscheduleSuccess = async (progId: number) => {
    setProgrammations((prev) => {
      const updated = prev.filter((p) => p.id !== progId);
      updatePlanificationCache({ programmations: updated });
      return updated;
    });
  };

  const handleReprogram = () => {
    if (!selectedSlotDate || selectedSlotHeure === null) return;
    setIsDetailOpen(false);
    router.push(`/repas?selectMode=true&date=${selectedSlotDate}&heure=${selectedSlotHeure}&returnWeek=${currentWeek}&returnYear=${currentYear}`);
  };

  // Appelé depuis PlanningSlot quand on clique sur un créneau occupé
  const handleOpenSlotDetail = (prog: ProgrammationWithRepas, dateStr: string) => {
    setSelectedRepas(prog.repas);
    setSelectedProgId(prog.id);
    setSelectedSlotDate(dateStr);
    setSelectedSlotHeure(prog.heure);
    setIsDetailOpen(true);
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
            {days.map((day, idx) => {
              const dayStr = day.toISOString().split('T')[0];
              const isToday = dayStr === todayStr;
              return (
                <div 
                  key={idx} 
                  ref={isToday ? todayDesktopRef : undefined}
                  className="flex flex-col gap-3"
                >
                  {/* Day Header */}
                  <div className={`text-center py-2.5 border rounded-xl shrink-0 flex flex-col items-center justify-center min-h-[46px] ${
                    isToday 
                      ? 'bg-brand-light/40 dark:bg-brand/15 border-brand/30 text-brand' 
                      : 'bg-neutral-100/50 dark:bg-neutral-800/40 border-neutral-200/10 dark:border-neutral-800/10'
                  }`}>
                    {isToday ? (
                      <span className="block text-xs font-extrabold text-brand">
                        Aujourd'hui
                      </span>
                    ) : (
                      <>
                        <span className="block text-xs font-extrabold capitalize text-text-light-main dark:text-text-dark-main">
                          {dayLabels[idx]}
                        </span>
                        <span className="block text-[10px] font-bold text-text-light-muted dark:text-text-dark-muted mt-0.5">
                          {formatDateLabel(day)}
                        </span>
                      </>
                    )}
                  </div>
                  
                  {/* Slots */}
                  <div className="flex flex-col gap-3">
                    <PlanningSlot
                      day={day}
                      heure={0}
                      label="Midi"
                      programmation={findProgrammation(day, 0)}
                      currentWeek={currentWeek!}
                      currentYear={currentYear!}
                      onOpenDetail={handleOpenSlotDetail}
                    />
                    <PlanningSlot
                      day={day}
                      heure={1}
                      label="Soir"
                      programmation={findProgrammation(day, 1)}
                      currentWeek={currentWeek!}
                      currentYear={currentYear!}
                      onOpenDetail={handleOpenSlotDetail}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 📱 VUE MOBILE : Liste Verticale de Jours */}
          <div className="md:hidden space-y-4 animate-fade-in">
            {days.map((day, idx) => {
              const dayStr = day.toISOString().split('T')[0];
              const isToday = dayStr === todayStr;
              return (
                <div 
                  key={idx} 
                  ref={isToday ? todayMobileRef : undefined}
                  className={`bg-card-light dark:bg-card-dark p-4 rounded-card border shadow-xs flex flex-col gap-3.5 ${
                    isToday ? 'border-brand/40 dark:border-brand/30' : 'border-neutral-200/40 dark:border-neutral-800/40'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-baseline gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800/40">
                    <h3 className={`font-extrabold text-base capitalize ${isToday ? 'text-brand' : 'text-text-light-main dark:text-text-dark-main'}`}>
                      {isToday ? "Aujourd'hui" : dayLabels[idx]}
                    </h3>
                    {!isToday && (
                      <span className="text-xs font-bold text-text-light-muted dark:text-text-dark-muted">
                        {formatDateLabel(day)}
                      </span>
                    )}
                  </div>
                  
                  {/* Slots side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <PlanningSlot
                      day={day}
                      heure={0}
                      label="Midi"
                      programmation={findProgrammation(day, 0)}
                      currentWeek={currentWeek!}
                      currentYear={currentYear!}
                      onOpenDetail={handleOpenSlotDetail}
                    />
                    <PlanningSlot
                      day={day}
                      heure={1}
                      label="Soir"
                      programmation={findProgrammation(day, 1)}
                      currentWeek={currentWeek!}
                      currentYear={currentYear!}
                      onOpenDetail={handleOpenSlotDetail}
                    />
                  </div>
                </div>
              );
            })}
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
