'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import BackHeader from '@/components/BackHeader';
import AdminRowDrawer from '@/components/AdminRowDrawer';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Alert from '@/components/ui/Alert';
import { useAdminModels, useAdminRows } from '@/lib/queries/queries';
import { adminUrl } from '@/lib/routes';
import type { AdminRow } from '@/types';

function Cell({ value }: { value: AdminRow[string] | undefined }) {
  if (value === null || value === undefined) return <span className="text-text-light-muted dark:text-text-dark-muted">—</span>;
  if (typeof value === 'boolean') return <>{value ? 'oui' : 'non'}</>;
  return <>{String(value)}</>;
}

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: models, error } = useAdminModels();

  const model = models?.find((m) => m.name === searchParams.get('table')) ?? models?.[0] ?? null;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const { data, error: rowsError } = useAdminRows(model?.name ?? null, page);

  const [drawerOpen, setDrawerOpen] = useState(false);
  // `key` remonte le formulaire à chaque ouverture (valeurs initiales de la ligne choisie).
  const [editing, setEditing] = useState<{ row: AdminRow | null; key: number }>({ row: null, key: 0 });
  const openRow = (row: AdminRow | null) => {
    setEditing((e) => ({ row, key: e.key + 1 }));
    setDrawerOpen(true);
  };

  const columns = model?.fields.filter((f) => !f.writeOnly) ?? [];
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <BackHeader title="Base de données" eyebrow="Administration" backHref="/parametres" />

      {error && <Alert>{error.message}</Alert>}

      {models && model && (
        <>
          <div className="overflow-x-auto hide-scrollbar">
            <Tabs
              tabs={models.map((m) => ({
                id: m.name,
                label: (
                  <span className="whitespace-nowrap">
                    {m.name} <span className="font-normal tabular-nums text-text-light-muted dark:text-text-dark-muted">{m.count}</span>
                  </span>
                ),
              }))}
              active={model.name}
              onChange={(table) => router.replace(adminUrl(table))}
            />
          </div>

          <div className="flex items-center justify-between gap-4 mt-6 mb-3">
            <p className="eyebrow tabular-nums">
              {data && data.total > 0
                ? `${(data.page - 1) * data.pageSize + 1}–${(data.page - 1) * data.pageSize + data.rows.length} sur ${data.total}`
                : 'Aucune ligne'}
            </p>
            <div className="flex items-center gap-2">
              {lastPage > 1 && (
                <>
                  <IconButton label="Page précédente" disabled={page <= 1} onClick={() => router.replace(adminUrl(model.name, page - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Page suivante" disabled={page >= lastPage} onClick={() => router.replace(adminUrl(model.name, page + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </IconButton>
                </>
              )}
              <Button size="sm" onClick={() => openRow(null)}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </div>

          {rowsError && <Alert>{rowsError.message}</Alert>}

          {data && data.rows.length > 0 && (
            <div className="overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-text-light-main dark:border-text-dark-main">
                    {columns.map((c) => (
                      <th key={c.name} className="eyebrow text-left font-normal py-2 pr-5 whitespace-nowrap">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-neutral-300 dark:divide-neutral-700">
                  {data.rows.map((row) => (
                    <tr
                      key={String(row.id)}
                      onClick={() => openRow(row)}
                      className="cursor-pointer transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {columns.map((c) => (
                        <td key={c.name} className="py-2.5 pr-5 max-w-56 truncate whitespace-nowrap tabular-nums">
                          {c.isId ? (
                            <button
                              type="button"
                              className="font-display italic cursor-pointer hover:underline"
                              aria-label={`Modifier la ligne ${row.id}`}
                            >
                              {String(row.id)}
                            </button>
                          ) : (
                            <Cell value={row[c.name]} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AdminRowDrawer
            key={editing.key}
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            model={model}
            row={editing.row}
          />
        </>
      )}
    </div>
  );
}
