'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ProgrammationWithRepas, RepasWithIngredients } from '@/types';
import { getCustomWeekDays, getOrderedDayLabels, getAdjacentWeek, getParisDate } from '@/lib/date-utils';
import RepasDetailModal from '@/components/RepasDetailModal';
import WeekSelector from '@/components/WeekSelector';
import PlanningDay from '@/components/PlanningDay';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/ui/Button';
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

  const scheduleRepasId = searchParams.get('scheduleRepasId');
  const scheduleRepasTitleParam = searchParams.get('scheduleRepasTitle');
  const activeScheduleRepas = useMemo(
    () => (scheduleRepasId ? { id: parseInt(scheduleRepasId, 10), titre: scheduleRepasTitleParam || undefined } : null),
    [scheduleRepasId, scheduleRepasTitleParam]
  );

  const isSchedulingMode = Boolean(activeScheduleRepas);

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
  // Conserve le mode d'attribution (scheduleRepas*) pendant la navigation
  const withScheduleParams = (params: URLSearchParams) => {
    if (scheduleRepasId) params.set('scheduleRepasId', scheduleRepasId);
    if (scheduleRepasTitleParam) params.set('scheduleRepasTitle', scheduleRepasTitleParam);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const goToWeek = (dir: 'prev' | 'next') => {
    if (currentWeek === null || currentYear === null) return;
    const { week, year } = getAdjacentWeek(currentWeek, currentYear, dir);
    router.push(withScheduleParams(new URLSearchParams({ week: String(week), year: String(year) })), { scroll: false });
  };

  const handlePrevWeek = () => goToWeek('prev');
  const handleNextWeek = () => goToWeek('next');

  const handleCurrentWeek = () => {
    if (pathname === '/planification' && !searchParams.get('week')) {
      centerOnDate(todayStr, 'smooth');
    } else {
      router.push(withScheduleParams(new URLSearchParams()), { scroll: false });
    }
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

  const todayParis = getParisDate();
  const todayStr = `${todayParis.getFullYear()}-${String(todayParis.getMonth() + 1).padStart(2, '0')}-${String(todayParis.getDate()).padStart(2, '0')}`;

  // Helper pour centrer un jour dans le conteneur principal sans animation dérangeante
  const centerOnDate = (dateStr: string, behavior: ScrollBehavior = 'auto') => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const targetElement = document.getElementById(`day-card-${dateStr}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cadrage volontairement déclenché sur ces seules dépendances
  }, [loading, days.length, targetDateParam, activeScheduleRepas, planificationCache.hasInitialScrolled, updatePlanificationCache, todayStr]);

  // Find a programmation for a given date and mealtime (0 = midi, 1 = soir)
  const findProgrammation = (date: Date, heure: 0 | 1) => {
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
    <div>
      {/* 🔔 Floating error notification */}
      {actionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-fade-in">
          <div className="bg-red-50 dark:bg-red-950/95 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 p-4 rounded-xl shadow-lg flex items-center justify-between gap-3">
            <span className="text-xs font-bold leading-normal">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-text-light-muted dark:text-text-dark-muted hover:text-red-600 transition-colors font-semibold text-xs cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/40"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <PageHeader
        title="Planning"
        action={
          currentWeek ? (
            <Button variant="secondary" size="sm" onClick={handleCurrentWeek}>
              Aujourd&apos;hui
            </Button>
          ) : undefined
        }
      />

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
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-text-light-muted dark:text-text-dark-muted" />
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
        <div className="animate-fade-in">
          {days.map((day, idx) => {
            const dayStr = day.toISOString().split('T')[0];
            return (
              <PlanningDay
                key={dayStr}
                day={day}
                weekdayLabel={dayLabels[idx]}
                dayNumber={String(day.getUTCDate())}
                monthLabel={day.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })}
                isToday={dayStr === todayStr}
                currentWeek={currentWeek!}
                currentYear={currentYear!}
                findProgrammation={findProgrammation}
                onOpenDetail={handleOpenSlotDetail}
                isSchedulingMode={isSchedulingMode}
                onScheduleRepas={handleDirectSchedule}
              />
            );
          })}
        </div>
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
