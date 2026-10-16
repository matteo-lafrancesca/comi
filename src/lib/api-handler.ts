import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { getSessionUser, type SessionUser } from '@/lib/auth';

/** Erreur « attendue » d'une route : convertie en réponse JSON `{ error }` avec le bon statut. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * Enveloppe une route authentifiée : session (401), conversion des `HttpError` en réponse JSON
 * et filet de sécurité 500 pour tout le reste. Remplace les try/catch recopiés dans chaque route.
 * `params` est résolu (segments dynamiques `[id]`), `{}` pour une route sans segment.
 */
export function withAuth<P extends Record<string, string> = Record<string, never>>(
  handler: (request: Request, user: SessionUser, params: P) => Promise<Response>
) {
  return async (request: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      const user = await getSessionUser();
      if (!user) throw new HttpError(401, 'Non autorisé. Veuillez vous connecter.');
      return await handler(request, user, await ctx.params);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(`Erreur ${request.method} ${new URL(request.url).pathname}:`, err);
      return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
    }
  };
}

/** Lit et valide le corps JSON ; la première erreur du schéma devient un 400 lisible. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, 'Corps de requête invalide.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? 'Données invalides.');
  return result.data;
}

/** Identifiant numérique d'un segment d'URL (`[id]`). */
export function parseId(raw: string, message: string): number {
  const id = Number.parseInt(raw, 10);
  if (Number.isNaN(id)) throw new HttpError(400, message);
  return id;
}

/** Garantit qu'une ressource existe (404) et appartient à l'utilisateur (403). */
export function assertOwned<T extends { userId: number }>(
  row: T | null,
  userId: number,
  messages: { notFound: string; forbidden: string }
): T {
  if (!row) throw new HttpError(404, messages.notFound);
  if (row.userId !== userId) throw new HttpError(403, messages.forbidden);
  return row;
}
