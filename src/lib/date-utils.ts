/**
 * Utilitaires pour la gestion des dates dans l'application de planning.
 * Tous les calculs de jour et de semaine sont basés sur le fuseau horaire de Paris (Europe/Paris).
 */

export const FRENCH_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/**
 * Prend une date d'entrée (ou la date actuelle) et retourne un nouvel objet Date
 * dont les champs locaux (getFullYear, getMonth, getDate, getHours, etc.) 
 * correspondent à l'heure locale de Paris.
 */
export function getParisDate(dateInput?: Date | string | number): Date {
  const date = dateInput !== undefined ? new Date(dateInput) : new Date();
  
  if (isNaN(date.getTime())) {
    throw new Error(`Date invalide fournie : ${dateInput}`);
  }

  // Formatage de la date en anglais (US) dans le fuseau horaire de Paris
  // pour un parsing stable et sans ambiguïté locale
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  // Création d'un objet Date où l'heure locale correspond à l'heure locale de Paris
  return new Date(
    parseInt(partMap.year, 10),
    parseInt(partMap.month, 10) - 1, // les mois en JS sont indexés à partir de 0
    parseInt(partMap.day, 10),
    parseInt(partMap.hour, 10),
    parseInt(partMap.minute, 10),
    parseInt(partMap.second, 10)
  );
}

/**
 * Normalise une date ajustée (en heure locale de Paris) vers une date à minuit UTC (00:00:00.000Z).
 * Utilisé pour stocker des dates de planification propres en DB ou faire des requêtes précises.
 */
export function normalizeToUTCDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
}

/**
 * Calcule le numéro de semaine ISO-8601 et l'année ISO correspondante pour une date donnée.
 * La date doit être préalablement ajustée à l'heure de Paris si on souhaite obtenir la semaine à Paris.
 */
export function getISOWeekAndYear(date: Date): { week: number; year: number } {
  const parisDate = getParisDate(date);
  // On clone la date pour ne pas la modifier
  const d = new Date(parisDate.getFullYear(), parisDate.getMonth(), parisDate.getDate());
  
  // Définit le jour le plus proche du jeudi de la même semaine : date + 4 - numéro du jour
  // En ISO 8601, les semaines commencent par le Lundi (1) et se terminent par le Dimanche (7)
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  
  // Date de début d'année de cette semaine
  const yearStart = new Date(d.getFullYear(), 0, 1);
  
  // Calcul du nombre de semaines
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return { week: weekNo, year: d.getFullYear() };
}

/**
 * Calcule les dates de début (Lundi 00:00 UTC) et de fin (Dimanche 23:59:59.999 UTC)
 * pour une semaine ISO et une année données.
 */
export function getDatesForISOWeek(week: number, year: number): { start: Date; end: Date } {
  // Le 4 Janvier fait toujours partie de la semaine 1 de la même année ISO
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  
  // Lundi de la semaine 1
  const monday = new Date(jan4.getTime());
  monday.setDate(jan4.getDate() - dayOfWeek + 1);
  
  // Lundi de la semaine demandée
  monday.setDate(monday.getDate() + (week - 1) * 7);
  
  // Dimanche de la semaine demandée
  const sunday = new Date(monday.getTime());
  sunday.setDate(monday.getDate() + 6);
  
  const start = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999));
  
  return { start, end };
}

/**
 * Renvoie un tableau de 7 objets Date normalisés à minuit UTC,
 * représentant chaque jour de la semaine demandée (du Lundi au Dimanche).
 */
export function getDaysOfWeek(week: number, year: number): Date[] {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  
  const monday = new Date(jan4.getTime());
  monday.setDate(jan4.getDate() - dayOfWeek + 1);
  monday.setDate(monday.getDate() + (week - 1) * 7);
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday.getTime());
    day.setDate(monday.getDate() + i);
    days.push(new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0)));
  }
  
  return days;
}

/**
 * Retourne les labels de jours ordonnés à partir de weekStartDay.
 * weekStartDay: 0=Lundi, 1=Mardi, ..., 6=Dimanche
 * Exemple : weekStartDay=2 (Mercredi) → ['Mercredi','Jeudi','Vendredi','Samedi','Dimanche','Lundi','Mardi']
 */
export function getOrderedDayLabels(weekStartDay: number): string[] {
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    labels.push(FRENCH_DAYS[(weekStartDay + i) % 7]);
  }
  return labels;
}

/**
 * Retourne {start, end} UTC de la "semaine personnalisée" de 7 jours
 * contenant `referenceDate`, avec `weekStartDay` comme premier jour.
 * weekStartDay: 0=Lundi, 1=Mardi, ..., 6=Dimanche
 */
export function getCustomWeekRange(
  referenceDate: Date,
  weekStartDay: number
): { start: Date; end: Date } {
  const parisDate = getParisDate(referenceDate);

  // JS getDay() : 0=Dim, 1=Lun, ..., 6=Sam
  // On convertit weekStartDay (0=Lun) vers JS convention (0=Dim)
  const jsWeekStartDay = weekStartDay === 6 ? 0 : weekStartDay + 1;

  // Jour JS de referenceDate
  const refDay = parisDate.getDay(); // 0=Dim, 1=Lun, ...

  // Nombre de jours à reculer pour atteindre le début de la semaine personnalisée
  let diff = (refDay - jsWeekStartDay + 7) % 7;

  const start = new Date(parisDate);
  start.setDate(parisDate.getDate() - diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0)),
    end: new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)),
  };
}

/**
 * Retourne les 7 Date[] normalisées UTC de la "semaine personnalisée"
 * contenant `referenceDate`, ordonnées de weekStartDay à weekStartDay+6.
 */
export function getCustomWeekDays(
  referenceDate: Date,
  weekStartDay: number
): Date[] {
  const { start } = getCustomWeekRange(referenceDate, weekStartDay);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    days.push(d);
  }
  return days;
}
