import { NextResponse } from 'next/server';
import { withAdmin, parseBody, parseId } from '@/lib/api-handler';
import { adminModel, adminWrite, toAdminData } from '@/lib/admin';
import { adminRowSchema } from '@/lib/schemas';

type Params = { model: string; id: string };

const ID_INVALIDE = 'Identifiant invalide.';

/**
 * PATCH /api/admin/[model]/[id]
 * Modifie les colonnes envoyées. Payload : { colonne: valeur }.
 */
export const PATCH = withAdmin<Params>(async (request, _user, { model: name, id }) => {
  const model = adminModel(name);
  const rowId = parseId(id, ID_INVALIDE);
  const data = await toAdminData(model, await parseBody(request, adminRowSchema), 'update');
  const row = await adminWrite(() => model.delegate.update({ where: { id: rowId }, data, select: model.select }));
  return NextResponse.json(row);
});

/**
 * DELETE /api/admin/[model]/[id]
 * Supprime une ligne (et ce qui en dépend, selon les cascades du schéma).
 */
export const DELETE = withAdmin<Params>(async (_request, _user, { model: name, id }) => {
  const model = adminModel(name);
  const rowId = parseId(id, ID_INVALIDE);
  await adminWrite(() => model.delegate.delete({ where: { id: rowId } }));
  return NextResponse.json({ message: 'Ligne supprimée.' });
});
