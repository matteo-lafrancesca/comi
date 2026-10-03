/** Extrait un message lisible d'une valeur interceptée (`catch (err)` est de type `unknown`). */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
