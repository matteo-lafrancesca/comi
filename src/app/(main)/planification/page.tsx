'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { ProgrammationWithRepas } from '@/types';
import type { Ymd } from '@/lib/date-utils';
import { formatDateRange } from '@/lib/date-format';
import { errorMessage } from '@/lib/errors';
import { parseFocusParam, parseScheduleParam, parseWeekParams, planningUrl, repasSelectUrl } from '@/lib/routes';
import { usePlanning } from '@/lib/queries/queries';
import { useScheduleMutation } from '@/lib/queries/mutations';
import { useToday } from '@/hooks/useToday';
import { useToast } from '@/hooks/useToast';
import { centerInContainer, useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useScrollContainer } from '@/contexts/ScrollContainerContext';
import RepasDetailModal from '@/components/RepasDetailModal';
import WeekSelector from '@/components/WeekSelector';
import PlanningDay from '@/components/PlanningDay';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Toast from '@/components/ui/Toast';

/** Centre un jour dans le conteneur défilant. Renvoie `false` si ce jour n'est pas affiché. */
function centerOnDay(container: HTMLElement, day: Ymd, behavior: ScrollBehavior = 'auto'): boolean {
  const target = container.querySelector<HTMLElement>(`#day-card-${day}`);
  if (!target) return false;
  centerInContainer(container, target, behavior);
  return true;
}

export default function PlanificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useScrollContainer();
  const toast = useToast();
  const today = useToday();

  // L'URL porte tout l'état de navigation : semaine, mode d'attribution, jour à centrer.
  const weekParam = parseWeekParams(searchParams);
  const scheduleRepasId = parseScheduleParam(searchParams);
  const focus = parseFocusParam(searchParams);

  const { data: planning, isPending, error, refetch } = usePlanning(weekParam);
  const scheduleMutation = useScheduleMutation();

  const [selected, setSelected] = useState<ProgrammationWithRepas | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const bySlot = useMemo(
    () => new Map((planning?.programmations ?? []).map((prog) => [`${prog.date}|${prog.heure}`, prog])),
    [planning]
  );

  const isCurrentWeek = planning?.days.includes(today) ?? false;

  // Cadrage à l'arrivée : jour demandé > position mémorisée > aujourd'hui (semaine courante) > haut de page.
  useScrollRestoration({
    key: planning ? `planning:${planning.year}-${planning.week}` : '',
    ready: Boolean(planning),
    first: (container) => {
      if (focus) return centerOnDay(container, focus);
      return scheduleRepasId !== null && centerOnDay(container, today);
    },
    fallback: (container) => {
      if (!centerOnDay(container, today)) container.scrollTo({ top: 0 });
    },
  });

  // Le jour demandé n'est utile qu'à l'arrivée : on le retire de l'URL (sans recharger quoi que ce soit).
  useEffect(() => {
    if (focus && planning) {
      router.replace(planningUrl({ week: weekParam, schedule: scheduleRepasId }), { scroll: false });
    }
  }, [focus, planning, router, weekParam, scheduleRepasId]);

  const goToWeek = (week: { week: number; year: number }) =>
    router.push(planningUrl({ week, schedule: scheduleRepasId }), { scroll: false });

  const handleToday = () => {
    const container = containerRef.current;
    if (isCurrentWeek && container) centerOnDay(container, today, 'smooth');
    else router.push(planningUrl({ schedule: scheduleRepasId }), { scroll: false });
  };

  const handleScheduleHere = async (date: Ymd, heure: 0 | 1) => {
    if (scheduleRepasId === null) return;
    try {
      await scheduleMutation.mutateAsync({ repasId: scheduleRepasId, date, heure });
      router.replace(planningUrl({ week: weekParam, focus: date }), { scroll: false });
    } catch (err) {
      toast.show(errorMessage(err, 'Une erreur est survenue lors de la programmation.'));
    }
  };

  const handleOpenDetail = (prog: ProgrammationWithRepas) => {
    setSelected(prog);
    setIsDetailOpen(true);
  };

  const handleReprogram = () => {
    if (!selected || !planning) return;
    setIsDetailOpen(false);
    setSelected(null);
    router.push(repasSelectUrl({ date: selected.date, heure: selected.heure, returnWeek: planning }), { scroll: false });
  };

  return (
    <div>
      <Toast message={toast.message} onClose={toast.dismiss} />

      <PageHeader
        title="Planning"
        action={
          planning ? (
            <Button variant="secondary" size="sm" onClick={handleToday}>
              Aujourd&apos;hui
            </Button>
          ) : undefined
        }
      />

      {planning && (
        <WeekSelector
          week={planning.week}
          year={planning.year}
          dateRange={formatDateRange(planning.start, planning.end)}
          onPrev={() => goToWeek(planning.prev)}
          onNext={() => goToWeek(planning.next)}
        />
      )}

      {isPending ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-text-light-muted dark:text-text-dark-muted" />
        </div>
      ) : error ? (
        <div className="max-w-lg mx-auto space-y-4 text-center">
          <Alert>{errorMessage(error, 'Impossible de charger le planning.')}</Alert>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <div className="animate-fade-in">
          {planning.days.map((date) => (
            <PlanningDay
              key={date}
              date={date}
              isToday={date === today}
              week={planning}
              midi={bySlot.get(`${date}|0`)}
              soir={bySlot.get(`${date}|1`)}
              onOpenDetail={handleOpenDetail}
              isSchedulingMode={scheduleRepasId !== null}
              onScheduleRepas={handleScheduleHere}
            />
          ))}
        </div>
      )}

      <RepasDetailModal
        repas={selected?.repas ?? null}
        isOpen={isDetailOpen}
        programmationId={selected?.id}
        onClose={() => {
          setIsDetailOpen(false);
          setSelected(null);
        }}
        onReprogram={handleReprogram}
      />
    </div>
  );
}
