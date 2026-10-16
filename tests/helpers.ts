import './env';
import { db } from '../src/lib/db';
import { signJWT } from '../src/lib/auth';
import { setCookie, clearCookies } from './env';

export { db, clearCookies };

let n = 0;
/** Crée un utilisateur en base et le connecte (cookie JWT simulé). */
export async function loginAs(weekStartDay = 0) {
  const user = await db.user.create({
    data: { email: `u${Date.now()}_${n++}@t.fr`, passwordHash: 'x', weekStartDay },
  });
  setCookie('token', await signJWT({ userId: user.id, email: user.email }));
  return user;
}

export const json = (url: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

type Handler = (request: Request, ctx: { params: Promise<Record<string, never>> }) => Promise<Response>;

/** Module de route -> handlers appelables avec la seule requête (contexte de route vide fourni). */
export function routes<T extends Record<string, unknown>>(mod: T): { [K in keyof T]: T[K] extends Handler ? (request: Request) => Promise<Response> : T[K] } {
  const emptyCtx = { params: Promise.resolve({}) };
  return Object.fromEntries(
    Object.entries(mod).map(([k, v]) => [k, typeof v === 'function' ? (request: Request) => (v as Handler)(request, emptyCtx) : v])
  ) as never;
}
