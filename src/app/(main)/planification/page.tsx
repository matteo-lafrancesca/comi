'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  CalendarDays,
  CalendarPlus,
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
  const { planificationCache, updatePlanificationCache, invalidateCoursesCache } = useNavigationCache();

  const targetDateParam = searchParams.get('targetDate');

  const [activeScheduleRepas, setActiveScheduleRepas] = useState<{ id: number; titre?: string } | null>(() => {
    const idParam = searchParams.get('scheduleRepasId');
    const titleParam = searchParams.get('scheduleRepasTitle');
    return idParam ? { id: parseInt(idParam, 10), titre: titleParam || undefined } : null;
  });

  // Synchroniser quand searchParams change
  useEffect(() => {
    const idParam = searchParams.get('scheduleRepasId');
    const titleParam = searchParams.get('scheduleRepasTitle');
    if (idParam) {
      setActiveScheduleRepas({
        id: parseInt(idParam, 10),
        titre: titleParam || undefined,
      });
    } else {
      setActiveScheduleRepas(null);
    }
  }, [searchParams]);

  const isSchedulingMode = Boolean(activeScheduleRepas);
  const scheduleRepasTitle = activeScheduleRepas?.titre;

  const [isScheduling, setIsScheduling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
    router.push(`${pathname}?week=${week}&year=${year}`, { scroll: false });
  };

  const handleNextWeek = () => {
    if (currentWeek === null || currentYear === null) return;
    const { week, year } = getAdjacentWeek(currentWeek, currentYear, 'next');
    router.push(`${pathname}?week=${week}&year=${year}`, { scroll: false });
  };

  const handleCurrentWeek = () => {
    if (pathname === '/planification' && !searchParams.get('week')) {
      centerOnDate(todayStr, 'smooth');
    } else {
      router.push(pathname, { scroll: false });
    }
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

  // Helper pour centrer un jour dans le conteneur principal sans animation dérangeante
  const centerOnDate = (dateStr: string, behavior: ScrollBehavior = 'auto') => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const targetElement = document.getElementById(`day-card-${dateStr}`) || document.getElementById(`day-col-${dateStr}`);
    if (targetElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const mainRect = mainEl.getBoundingClientRect();
      const offsetTopInMain = targetRect.top - mainRect.top + mainEl.scrollTop;
      const desiredScrollTop = Math.max(0, offsetTopInMain - (mainEl.clientHeight / 2) + (targetElement.clientHeight / 2));
      mainEl.scrollTo({ top: desiredScrollTop, behavior });
      updatePlanificationCache({ scrollPosition: desiredScrollTop, hasInitialScrolled: true });
    }
  };

  // Suivre et mémoriser la position de défilement en continu
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    const handleScroll = () => {
      updatePlanificationCache({ 
        scrollPosition: mainEl.scrollTop, 
        hasInitialScrolled: true 
      });
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      mainEl.removeEventListener('scroll', handleScroll);
    };
  }, [updatePlanificationCache]);

  const hasCenteredForScheduleRef = useRef(false);

  // Cadrage automatique lors de l'accès ou après programmation d'un repas
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl || loading || days.length === 0) return;

    // 1. Si on revient de la sélection d'un repas pour une date précise :
    if (targetDateParam) {
      const timer = setTimeout(() => {
        centerOnDate(targetDateParam, 'auto');
        if (typeof window !== 'undefined') {
          const currentParams = new URLSearchParams(window.location.search);
          currentParams.delete('targetDate');
          const newQuery = currentParams.toString();
          const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
          window.history.replaceState(null, '', newUrl);
        }
      }, 40);
      return () => clearTimeout(timer);
    }

    // 2. Si on arrive en mode programmation rapide depuis un repas :
    if (activeScheduleRepas && !hasCenteredForScheduleRef.current) {
      hasCenteredForScheduleRef.current = true;
      const timer = setTimeout(() => {
        centerOnDate(todayStr, 'auto');
      }, 40);
      return () => clearTimeout(timer);
    }

    // 3. Restauration de la position précédente si déjà visité :
    if (planificationCache.hasInitialScrolled) {
      if (typeof planificationCache.scrollPosition === 'number' && planificationCache.scrollPosition > 0) {
        mainEl.scrollTop = planificationCache.scrollPosition;
      }
      return;
    }

    // 4. Premier accès absolu : cadrage direct sur aujourd'hui
    const timer = setTimeout(() => {
      centerOnDate(todayStr, 'auto');
    }, 40);
    return () => clearTimeout(timer);
  }, [loading, days.length, targetDateParam, activeScheduleRepas, planificationCache.hasInitialScrolled, updatePlanificationCache, todayStr]);

  // Find a programmation for a given date and mealtime (0 = midi, 1 = soir)
  const findProgrammation = (date: Date, heure: number) => {
    const targetDateStr = date.toISOString().split('T')[0];
    return programmations.find((p) => {
      const pDateStr = new Date(p.date).toISOString().split('T')[0];
      return pDateStr === targetDateStr && p.heure === heure;
    });
  };

  const handleUnscheduleSuccess = async (progId: number) => {
    const mainEl = document.querySelector('main');
    const currentScroll = mainEl ? mainEl.scrollTop : planificationCache.scrollPosition;

    const updated = programmations.filter((p) => p.id !== progId);
    setProgrammations(updated);
    updatePlanificationCache({
      programmations: updated,
      isLoaded: true,
      key: cacheKey,
      scrollPosition: currentScroll,
      hasInitialScrolled: true,
    });
    invalidateCoursesCache();
  };

  const handleCancelScheduleMode = () => {
    setActiveScheduleRepas(null);
    if (typeof window !== 'undefined') {
      const currentParams = new URLSearchParams(window.location.search);
      currentParams.delete('scheduleRepasId');
      currentParams.delete('scheduleRepasTitle');
      const newQuery = currentParams.toString();
      const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
      window.history.replaceState(null, '', newUrl);
    }
  };

  const handleDirectSchedule = async (dateStr: string, heure: 0 | 1) => {
    if (!activeScheduleRepas) return;
    const currentRepasId = activeScheduleRepas.id;
    const mainEl = document.querySelector('main');
    const currentScroll = mainEl ? mainEl.scrollTop : planificationCache.scrollPosition;

    try {
      setIsScheduling(true);
      setActionError(null);
      const res = await apiFetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repasId: currentRepasId,
          date: dateStr,
          heure,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la programmation.');
      }

      const newProg: ProgrammationWithRepas = await res.json();

      // Mettre à jour l'état local et le cache sans recharger la page
      const filtered = programmations.filter(
        (p) => !(new Date(p.date).toISOString().split('T')[0] === dateStr && p.heure === heure)
      );
      const updated = [...filtered, newProg];
      setProgrammations(updated);

      updatePlanificationCache({
        programmations: updated,
        isLoaded: true,
        key: cacheKey,
        scrollPosition: currentScroll,
        hasInitialScrolled: true,
      });

      // Invalider les courses
      invalidateCoursesCache();

      // Quitter le mode programmation
      handleCancelScheduleMode();

      // Maintenir le focus sur la date sélectionnée sans remonter
      requestAnimationFrame(() => {
        centerOnDate(dateStr, 'auto');
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la programmation.');
    } finally {
      setIsScheduling(false);
    }
  };

  // Auto-dismiss floating error after 4 seconds
  useEffect(() => {
    if (actionError) {
      const timer = setTimeout(() => setActionError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionError]);

  const handleReprogram = () => {
    if (!selectedSlotDate || selectedSlotHeure === null) return;
    setIsDetailOpen(false);
    router.push(`/repas?selectMode=true&date=${selectedSlotDate}&heure=${selectedSlotHeure}&returnWeek=${currentWeek}&returnYear=${currentYear}`, { scroll: false });
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
      {/* 🔔 Floating error notification */}
      {actionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-fade-in">
          <div className="bg-red-50 dark:bg-red-950/95 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 p-4 rounded-xl shadow-lg flex items-center justify-between gap-3">
            <span className="text-xs font-bold leading-normal">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-text-light-muted dark:text-text-dark-muted hover:text-red-600 transition-colors font-extrabold text-xs cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/40"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Banner de programmation rapide flottant (sans décalage de page) */}
      {isSchedulingMode && (
        <div className="fixed top-16 md:top-6 left-1/2 -translate-x-1/2 z-40 max-w-lg w-full px-4 animate-fade-in pointer-events-none">
          <div className="flex items-center justify-between gap-3 p-3.5 bg-card-light/95 dark:bg-card-dark/95 backdrop-blur-md border border-brand/40 rounded-card shadow-xl pointer-events-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand shrink-0">
                {isScheduling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarPlus className="h-4 w-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-extrabold text-text-light-main dark:text-text-dark-main truncate">
                  Programmation rapide
                </span>
                <span className="text-[11px] text-text-light-muted dark:text-text-dark-muted font-medium truncate">
                  Cliquez sur un créneau pour :{' '}
                  <span className="font-bold text-brand">{scheduleRepasTitle || 'ce repas'}</span>
                </span>
              </div>
            </div>
            <button
              onClick={handleCancelScheduleMode}
              disabled={isScheduling}
              className="px-3 py-1.5 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-text-light-main dark:text-text-dark-main rounded-input transition-all active:scale-95 cursor-pointer text-center shrink-0"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

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
                  id={`day-col-${dayStr}`}
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
                        Aujourd&apos;hui
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
                      isSchedulingMode={isSchedulingMode}
                      onScheduleRepas={handleDirectSchedule}
                    />
                    <PlanningSlot
                      day={day}
                      heure={1}
                      label="Soir"
                      programmation={findProgrammation(day, 1)}
                      currentWeek={currentWeek!}
                      currentYear={currentYear!}
                      onOpenDetail={handleOpenSlotDetail}
                      isSchedulingMode={isSchedulingMode}
                      onScheduleRepas={handleDirectSchedule}
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
                  id={`day-card-${dayStr}`}
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
                      isSchedulingMode={isSchedulingMode}
                      onScheduleRepas={handleDirectSchedule}
                    />
                    <PlanningSlot
                      day={day}
                      heure={1}
                      label="Soir"
                      programmation={findProgrammation(day, 1)}
                      currentWeek={currentWeek!}
                      currentYear={currentYear!}
                      onOpenDetail={handleOpenSlotDetail}
                      isSchedulingMode={isSchedulingMode}
                      onScheduleRepas={handleDirectSchedule}
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
