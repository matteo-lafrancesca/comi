/**
 * Dates et semaines.
 *
 * Règles :
 * - une date calendaire est une chaîne « AAAA-MM-JJ » (type `Ymd`), sans fuseau ;
 * - toute l'arithmétique passe par `Date.UTC` / `getUTC*` : le fuseau du serveur ou du
 *   navigateur n'a donc aucune influence ;
 * - le seul calcul dépendant d'un fuseau est `todayParis` (une seule conversion) ;
 * - en base, une date est un minuit UTC (`toDbDate` / `fromDbDate`).
 *
 * Une semaine est identifiée par `{ week, year }` : la semaine ISO du lundi qu'elle contient.
 * Elle peut commencer un autre jour (`weekStartDay`), mais contient toujours exactement un lundi,
 * ce qui garde l'identifiant stable quel que soit le jour de début choisi.
 */

export const FRENCH_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** Date calendaire « AAAA-MM-JJ ». */
export type Ymd = string;

/** Identifiant d'une semaine : semaine ISO du lundi qu'elle contient. */
export interface WeekRef {
  week: number;
  year: number;
}

export interface WeekRange extends WeekRef {
  /** Premier jour (selon weekStartDay) */
  start: Ymd;
  /** Dernier jour */
  end: Ymd;
  /** Les 7 jours, dans l'ordre */
  days: Ymd[];
}

const DAY_MS = 86_400_000;
const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const toMs = (ymd: Ymd): number => {
  const m = YMD_RE.exec(ymd);
  if (!m) throw new Error(`Date invalide : ${ymd}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const fromMs = (ms: number): Ymd => new Date(ms).toISOString().slice(0, 10);

/** Vrai si la chaîne est une date calendaire réelle au format AAAA-MM-JJ. */
export function isValidYmd(value: unknown): value is Ymd {
  if (typeof value !== 'string' || !YMD_RE.test(value)) return false;
  return fromMs(toMs(value)) === value;
}

/** Date du jour à Paris. Seul point où le fuseau intervient. */
export function todayParis(now: Date = new Date()): Ymd {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(ymd: Ymd, n: number): Ymd {
  return fromMs(toMs(ymd) + n * DAY_MS);
}

/** 0 = lundi … 6 = dimanche. */
export function weekdayIndex(ymd: Ymd): number {
  return (new Date(toMs(ymd)).getUTCDay() + 6) % 7;
}

/** Date → minuit UTC, pour la base. */
export function toDbDate(ymd: Ymd): Date {
  return new Date(toMs(ymd));
}

/** Minuit UTC de la base → date calendaire. */
export function fromDbDate(date: Date): Ymd {
  return date.toISOString().slice(0, 10);
}

/** Semaine ISO (numéro et année ISO) d'une date. */
export function isoWeekOf(ymd: Ymd): WeekRef {
  const thursday = addDays(ymd, 3 - weekdayIndex(ymd));
  const year = Number(thursday.slice(0, 4));
  const dayOfYear = (toMs(thursday) - Date.UTC(year, 0, 1)) / DAY_MS;
  return { week: Math.floor(dayOfYear / 7) + 1, year };
}

/** Lundi de la semaine ISO donnée. */
export function mondayOfIsoWeek({ week, year }: WeekRef): Ymd {
  const jan4 = `${String(year).padStart(4, '0')}-01-04`;
  return addDays(jan4, -weekdayIndex(jan4) + (week - 1) * 7);
}

/** Vrai si `{ week, year }` désigne une vraie semaine ISO (53 n'existe pas toutes les années). */
export function isValidWeekRef(ref: WeekRef): boolean {
  if (!Number.isInteger(ref.week) || !Number.isInteger(ref.year)) return false;
  if (ref.week < 1 || ref.week > 53 || ref.year < 1900 || ref.year > 2200) return false;
  const back = isoWeekOf(mondayOfIsoWeek(ref));
  return back.week === ref.week && back.year === ref.year;
}

/** Premier jour de la semaine personnalisée contenant `ymd` (weekStartDay : 0 = lundi … 6 = dimanche). */
function customWeekStart(ymd: Ymd, weekStartDay: number): Ymd {
  return addDays(ymd, -((weekdayIndex(ymd) - weekStartDay + 7) % 7));
}

/** Identifiant de la semaine contenant `ymd`. */
export function weekRefOf(ymd: Ymd, weekStartDay: number): WeekRef {
  const start = customWeekStart(ymd, weekStartDay);
  const monday = addDays(start, (7 - weekdayIndex(start)) % 7);
  return isoWeekOf(monday);
}

/** Plage de 7 jours de la semaine `ref`. */
export function weekRange(ref: WeekRef, weekStartDay: number): WeekRange {
  const start = customWeekStart(mondayOfIsoWeek(ref), weekStartDay);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { week: ref.week, year: ref.year, start, end: days[6], days };
}

/** Semaine précédente ou suivante. */
export function adjacentWeek(ref: WeekRef, direction: 'prev' | 'next'): WeekRef {
  return isoWeekOf(addDays(mondayOfIsoWeek(ref), direction === 'prev' ? -7 : 7));
}

/**
 * Libellés de jours ordonnés à partir de weekStartDay.
 * Exemple : weekStartDay = 2 → ['Mercredi', 'Jeudi', …, 'Mardi'].
 */
export function getOrderedDayLabels(weekStartDay: number): string[] {
  return Array.from({ length: 7 }, (_, i) => FRENCH_DAYS[(weekStartDay + i) % 7]);
}
