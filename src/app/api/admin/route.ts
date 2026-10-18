import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-handler';
import { ADMIN_MODEL_NAMES, adminModel } from '@/lib/admin';
import type { AdminModel } from '@/types';

/**
 * GET /api/admin
 * Tables de la base : colonnes et nombre de lignes.
 */
export const GET = withAdmin(async () => {
  const models: AdminModel[] = await Promise.all(
    ADMIN_MODEL_NAMES.map(async (name) => {
      const { fields, delegate } = adminModel(name);
      return { name, fields, count: await delegate.count() };
    })
  );
  return NextResponse.json({ models });
});
