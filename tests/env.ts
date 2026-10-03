// À importer en premier : variables d'env + fausse session (cookies) pour les routes.
import path from 'node:path';

process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.DATABASE_URL = `file:${path.join(__dirname, 'test.db')}`;

const jar: Record<string, string> = {};
const store = {
  get: (k: string) => (k in jar ? { name: k, value: jar[k] } : undefined),
  set: (k: string, v: string) => void (jar[k] = v),
};
// next/headers n'existe qu'en contexte de requête : on le remplace par un jar en mémoire.
require.cache[require.resolve('next/headers')] = {
  exports: { cookies: async () => store },
} as unknown as NodeJS.Module;

export const setCookie = (k: string, v: string) => void (jar[k] = v);
export const clearCookies = () => Object.keys(jar).forEach((k) => delete jar[k]);
