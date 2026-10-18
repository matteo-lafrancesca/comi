import bcryptjs from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { HttpError } from './api-handler';
import { pseudoFields } from './pseudo';
import type { AdminField } from '@/types';

/**
 * Administration générique de la base : les tables et leurs colonnes viennent du schéma Prisma (DMMF),
 * une nouvelle table ou colonne apparaît donc sans rien toucher ici. Toutes les tables ont un `id` entier.
 */

export const ADMIN_PAGE_SIZE = 50;

/** Colonnes jamais renvoyées : saisies en clair, enregistrées hachées. */
const WRITE_ONLY = new Set(['passwordHash']);

type Data = Record<string, unknown>;

/** Opérations Prisma communes à toutes les tables, appelées par nom de modèle. */
interface Delegate {
  findMany(args: { select: Record<string, true>; orderBy: { id: 'desc' }; skip: number; take: number }): Promise<Data[]>;
  count(): Promise<number>;
  create(args: { data: Data; select: Record<string, true> }): Promise<Data>;
  update(args: { where: { id: number }; data: Data; select: Record<string, true> }): Promise<Data>;
  delete(args: { where: { id: number } }): Promise<Data>;
}

export const ADMIN_MODEL_NAMES = Prisma.dmmf.datamodel.models.map((m) => m.name);

/** Table administrable par son nom de modèle (`User`, `RepasIngredient`…) ; 404 si inconnue. */
export function adminModel(name: string) {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === name);
  if (!model) throw new HttpError(404, 'Table inconnue.');

  const fields: AdminField[] = model.fields
    .filter((f) => f.kind === 'scalar')
    .map((f) => ({
      name: f.name,
      type: f.type,
      required: f.isRequired,
      hasDefault: f.hasDefaultValue,
      isId: f.isId,
      writeOnly: WRITE_ONLY.has(f.name),
    }));
  const select = Object.fromEntries(fields.filter((f) => !f.writeOnly).map((f) => [f.name, true as const]));
  const delegate = (db as unknown as Record<string, Delegate>)[name[0].toLowerCase() + name.slice(1)];
  return { name, fields, select, delegate };
}

async function coerce(field: AdminField, raw: string | number | boolean): Promise<unknown> {
  const invalid = (expected: string) => new HttpError(400, `${field.name} : ${expected} attendu.`);
  switch (field.type) {
    case 'Int': {
      const n = Number(raw);
      if (!Number.isInteger(n)) throw invalid('nombre entier');
      return n;
    }
    case 'Float': {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw invalid('nombre');
      return n;
    }
    case 'Boolean':
      if (raw === true || raw === 'true') return true;
      if (raw === false || raw === 'false') return false;
      throw invalid('booléen');
    case 'DateTime': {
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) throw invalid('date ISO (ex. 2026-10-18T12:00:00.000Z)');
      return d;
    }
    default:
      return field.writeOnly ? bcryptjs.hash(String(raw), 10) : String(raw);
  }
}

/**
 * Valeurs saisies (chaînes des champs du formulaire) -> données Prisma typées.
 * Vide = `null` (colonne facultative) ou valeur par défaut (création) ; un mot de passe vide reste inchangé.
 */
export async function toAdminData(
  model: ReturnType<typeof adminModel>,
  input: Record<string, string | number | boolean | null>,
  mode: 'create' | 'update'
): Promise<Data> {
  const data: Data = {};
  for (const [key, raw] of Object.entries(input)) {
    const field = model.fields.find((f) => f.name === key && !f.isId);
    if (!field) throw new HttpError(400, `Champ inconnu : ${key}.`);
    if (raw === null || raw === '') {
      if (field.writeOnly) continue;
      if (!field.required) data[key] = null;
      else if (mode === 'update') throw new HttpError(400, `${key} est obligatoire.`);
      continue;
    }
    data[key] = await coerce(field, raw);
  }
  // Le pseudo n'existe jamais sans sa clé normalisée (unicité, recherche).
  if (model.name === 'User' && 'pseudo' in data) {
    Object.assign(data, typeof data.pseudo === 'string' ? pseudoFields(data.pseudo) : { pseudoKey: null });
  }
  return data;
}

/** Erreurs Prisma prévisibles d'une écriture libre -> réponses lisibles plutôt qu'un 500. */
export async function adminWrite<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') throw new HttpError(409, 'Valeur déjà utilisée (contrainte d’unicité).');
      if (err.code === 'P2003') throw new HttpError(400, 'Référence invalide : la ligne liée n’existe pas.');
      if (err.code === 'P2025') throw new HttpError(404, 'Ligne introuvable.');
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
      throw new HttpError(400, 'Données incomplètes : un champ obligatoire est vide.');
    }
    throw err;
  }
}
