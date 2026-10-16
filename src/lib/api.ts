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

/** Erreur renvoyée par l'API (message lisible issu du champ `error` de la réponse). */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiJsonInit extends RequestInit {
  /** Corps JSON ; ajoute l'en-tête Content-Type (sinon, `body` est transmis tel quel, ex. FormData). */
  json?: unknown;
  /** Message utilisé si la réponse d'erreur n'en contient pas. */
  fallbackError?: string;
}

/**
 * Appelle l'API et renvoie le JSON typé. Lève une `ApiError` si la réponse n'est pas OK.
 */
export async function apiJson<T>(path: string, { json, fallbackError, headers, body, ...init }: ApiJsonInit = {}): Promise<T> {
  const res = await apiFetch(path, {
    ...init,
    headers: json === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: json === undefined ? body : JSON.stringify(json),
  });

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : null;
    throw new ApiError(message ?? fallbackError ?? `Erreur ${res.status}`, res.status);
  }
  return data as T;
}
