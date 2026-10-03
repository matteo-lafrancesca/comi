const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * Limiteur à fenêtre fixe, en mémoire (par instance serveur).
 * Retourne true si la requête dépasse `max` appels par `windowMs` pour `key`.
 * ponytail: état local au process, passer à Redis/Upstash si plusieurs instances.
 */
export function isRateLimited(key: string, max = 10, windowMs = 15 * 60 * 1000, now = Date.now()): boolean {
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  const entry = hits.get(key);
  if (!entry) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

/** Clé de limitation : route + IP du client (proxy `x-forwarded-for`). */
export function rateLimitKey(request: Request, route: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  return `${route}:${ip}`;
}
