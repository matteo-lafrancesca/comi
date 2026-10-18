import { isValidWeekRef, isValidYmd, type WeekRef, type Ymd } from '@/lib/date-utils';

/** Paramètres de requête lisibles (URLSearchParams ou ReadonlyURLSearchParams de Next). */
type Params = { get(name: string): string | null };

/** Semaine portée par l'URL (`week` + `year`), ou `null` pour la semaine courante. */
export function parseWeekParams(params: Params): WeekRef | null {
  const week = Number(params.get('week'));
  const year = Number(params.get('year'));
  const ref = { week, year };
  return params.get('week') !== null && params.get('year') !== null && isValidWeekRef(ref) ? ref : null;
}

function withWeek(params: URLSearchParams, week: WeekRef | null | undefined) {
  if (week) {
    params.set('week', String(week.week));
    params.set('year', String(week.year));
  }
}

const withQuery = (path: string, params: URLSearchParams) => {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

interface PlanningUrlOptions {
  /** Semaine à afficher (sinon : semaine courante) */
  week?: WeekRef | null;
  /** Repas à programmer : active le mode d'attribution */
  schedule?: number | null;
  /** Jour sur lequel centrer l'écran à l'arrivée */
  focus?: Ymd | null;
}

export function planningUrl({ week, schedule, focus }: PlanningUrlOptions = {}): string {
  const params = new URLSearchParams();
  withWeek(params, week);
  if (schedule) params.set('scheduleRepasId', String(schedule));
  if (focus) params.set('focus', focus);
  return withQuery('/planification', params);
}

/** Profil d'un ami. */
/** Profil d'un ami, par son identifiant public. */
export const friendUrl = (userId: string) => `/amis/${userId}`;

export function shoppingUrl(week?: WeekRef | null): string {
  const params = new URLSearchParams();
  withWeek(params, week);
  return withQuery('/courses', params);
}

/** Mode d'attribution du planning : repas à programmer, lu dans l'URL. */
export function parseScheduleParam(params: Params): number | null {
  const id = Number(params.get('scheduleRepasId'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Jour sur lequel centrer le planning, lu dans l'URL. */
export function parseFocusParam(params: Params): Ymd | null {
  const focus = params.get('focus');
  return isValidYmd(focus) ? focus : null;
}

export interface SelectSlot {
  date: Ymd;
  heure: 0 | 1;
  /** Semaine du planning d'où l'on vient (pour y revenir après le choix) */
  returnWeek: WeekRef;
}

/** Liste des repas en mode « choisir un repas pour ce créneau ». */
export function repasSelectUrl({ date, heure, returnWeek }: SelectSlot): string {
  const params = new URLSearchParams({
    selectMode: 'true',
    date,
    heure: String(heure),
    returnWeek: String(returnWeek.week),
    returnYear: String(returnWeek.year),
  });
  return `/repas?${params}`;
}

/** Créneau choisi dans l'URL de la liste des repas, ou `null` hors mode sélection. */
export function parseSelectSlot(params: Params): SelectSlot | null {
  const date = params.get('date');
  const heure = Number(params.get('heure'));
  const returnWeek = { week: Number(params.get('returnWeek')), year: Number(params.get('returnYear')) };
  if (params.get('selectMode') !== 'true' || !isValidYmd(date) || (heure !== 0 && heure !== 1)) return null;
  if (!isValidWeekRef(returnWeek)) return null;
  return { date, heure, returnWeek };
}
