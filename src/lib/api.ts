export const BASE_PATH = '/comi';

/**
 * Construit une URL d'API complète préfixée avec le basePath (/comi).
 * Exemple: apiUrl('/api/auth/login') -> '/comi/api/auth/login'
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath.startsWith(BASE_PATH)) {
    return cleanPath;
  }
  return `${BASE_PATH}${cleanPath}`;
}

/**
 * Wrapper autour de `fetch` qui préfixe automatiquement l'URL avec le basePath de l'application.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(input), init);
}
