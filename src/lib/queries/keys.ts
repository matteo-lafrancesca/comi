import type { WeekRef } from '@/lib/date-utils';

/**
 * Clés de requêtes et règles d'invalidation.
 *
 * Les clés « semaine » contiennent le `weekStartDay` (le serveur découpe les semaines avec) et,
 * pour la semaine courante, la date du jour : à minuit, la requête « courante » change de clé.
 *
 * Qui invalide quoi (invalidation par préfixe) :
 * - programmer / déprogrammer un repas      -> planning + courses
 * - créer un repas                          -> repas
 * - modifier / supprimer un repas           -> repas + planning + courses
 * - rendre un repas public / privé          -> repas
 * - ajouter une recette d'ami à son carnet   -> repas + amis (`savedByMe` du profil)
 * - retirer une recette d'ami de son carnet  -> repas + planning + courses + amis
 * - envoyer / accepter / refuser / annuler une demande d'ami -> amis (liste, demandes, recherche, profil)
 * - retirer un ami                          -> amis (sans rechargement : on quitte son profil) + repas + planning + courses
 * - ajouter / retirer un article hors plan  -> courses
 * - changer le jour de début de semaine     -> planning + courses retirés du cache (autre découpage)
 */
export const queryKeys = {
  planning: {
    all: ['planning'] as const,
    week: (weekStartDay: number, ref: WeekRef | null, today: string) =>
      ['planning', weekStartDay, ref ? `${ref.year}-${ref.week}` : `current-${today}`] as const,
  },
  shopping: {
    all: ['shopping'] as const,
    week: (weekStartDay: number, ref: WeekRef | null, today: string) =>
      ['shopping', weekStartDay, ref ? `${ref.year}-${ref.week}` : `current-${today}`] as const,
  },
  friends: {
    all: ['friends'] as const,
    list: ['friends', 'list'] as const,
    requests: ['friends', 'requests'] as const,
    search: (q: string) => ['friends', 'search', q] as const,
    profile: (userId: number) => ['friends', 'profile', userId] as const,
  },
  repas: {
    all: ['repas'] as const,
    list: (sort: string, search: string) => ['repas', 'list', { sort, search }] as const,
    options: (search: string) => ['repas', 'options', search] as const,
    detail: (id: number) => ['repas', 'detail', id] as const,
  },
};
