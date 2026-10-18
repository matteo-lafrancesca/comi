import { NextResponse } from 'next/server';
import { withAdmin, parseBody } from '@/lib/api-handler';
import { ADMIN_PAGE_SIZE, adminModel, adminWrite, toAdminData } from '@/lib/admin';
import { adminRowSchema } from '@/lib/schemas';

type Params = { model: string };

/**
 * GET /api/admin/[model]?page=1
 * Lignes d'une table, les plus récentes d'abord.
 */
export const GET = withAdmin<Params>(async (request, _user, { model: name }) => {
  const model = adminModel(name);
  const page = Math.max(1, Number.parseInt(new URL(request.url).searchParams.get('page') ?? '', 10) || 1);
  const [rows, total] = await Promise.all([
    model.delegate.findMany({
      select: model.select,
      orderBy: { id: 'desc' },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    model.delegate.count(),
  ]);
  return NextResponse.json({ rows, total, page, pageSize: ADMIN_PAGE_SIZE });
});

/**
 * POST /api/admin/[model]
 * Crée une ligne. Payload : { colonne: valeur } (valeurs saisies, converties selon le type de la colonne).
 */
export const POST = withAdmin<Params>(async (request, _user, { model: name }) => {
  const model = adminModel(name);
  const data = await toAdminData(model, await parseBody(request, adminRowSchema), 'create');
  const row = await adminWrite(() => model.delegate.create({ data, select: model.select }));
  return NextResponse.json(row, { status: 201 });
});
