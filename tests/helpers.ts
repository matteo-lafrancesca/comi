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
