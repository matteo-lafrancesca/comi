import type { WeekInfo } from '@/types';
import { adjacentWeek, isValidWeekRef, todayParis, weekRange, weekRefOf, type WeekRef } from '@/lib/date-utils';

/**
 * Résout la semaine demandée par une requête : `week` et `year` explicites, ou la semaine
 * courante à Paris si les deux sont absents. Point d'entrée unique pour planning et courses.
 *
 * @returns les informations de semaine, ou `null` si les paramètres sont invalides
 */
export function resolveWeek(searchParams: URLSearchParams, weekStartDay: number, now: Date = new Date()): WeekInfo | null {
  const weekParam = searchParams.get('week');
  const yearParam = searchParams.get('year');

  let ref: WeekRef;
  if (weekParam === null && yearParam === null) {
    ref = weekRefOf(todayParis(now), weekStartDay);
  } else {
    ref = { week: Number(weekParam), year: Number(yearParam) };
    if (weekParam === null || yearParam === null || !isValidWeekRef(ref)) return null;
  }

  const range = weekRange(ref, weekStartDay);
  return {
    ...range,
    weekStartDay,
    prev: adjacentWeek(ref, 'prev'),
    next: adjacentWeek(ref, 'next'),
  };
}
