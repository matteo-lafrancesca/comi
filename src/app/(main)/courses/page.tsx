'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { ShoppingListExtraItem } from '@/types';
import { formatDateRange } from '@/lib/date-format';
import { errorMessage } from '@/lib/errors';
import { parseWeekParams, planningUrl, shoppingUrl } from '@/lib/routes';
import { useShoppingList } from '@/lib/queries/queries';
import { useDeleteExtraMutation } from '@/lib/queries/mutations';
import { useShoppingChecks } from '@/hooks/useShoppingChecks';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useToast } from '@/hooks/useToast';
import ConfirmDeleteDrawer from '@/components/ConfirmDeleteDrawer';
import AddExtraDrawer from '@/components/AddExtraDrawer';
import ShoppingCategory from '@/components/ShoppingCategory';
import ShoppingExtrasList from '@/components/ShoppingExtrasList';
import WeekSelector from '@/components/WeekSelector';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Toast from '@/components/ui/Toast';

export default function CoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const { data: list, isPending, error, refetch, queryKey } = useShoppingList(parseWeekParams(searchParams));
  const checks = useShoppingChecks(JSON.stringify(queryKey), toast.show);
  const deleteExtra = useDeleteExtraMutation();

  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [extraToDelete, setExtraToDelete] = useState<ShoppingListExtraItem | null>(null);

  useScrollRestoration({ key: list ? `courses:${list.year}-${list.week}` : '', ready: Boolean(list) });

  const confirmDeleteExtra = async (extra: ShoppingListExtraItem) => {
    setExtraToDelete(null);
    try {
      await deleteExtra.mutateAsync(extra.id);
    } catch (err) {
      toast.show(errorMessage(err, 'Une erreur est survenue lors de la suppression.'));
    }
  };

  const totalCount = list?.categories.reduce((sum, group) => sum + group.items.length, 0) ?? 0;

  return (
    <div>
      <Toast message={toast.message} onClose={toast.dismiss} />

      <ConfirmDeleteDrawer
        isOpen={!!extraToDelete}
        onClose={() => setExtraToDelete(null)}
        title="Confirmer la suppression"
        message="Voulez-vous vraiment retirer l'article"
        highlightedName={extraToDelete?.repas?.titre || extraToDelete?.ingredient?.nom}
        warningText="de votre liste hors-planning ?"
        onConfirm={() => extraToDelete && confirmDeleteExtra(extraToDelete)}
        confirmLabel="Supprimer"
      />

      <div className="print:hidden">
        <PageHeader
          title="Courses"
          action={
            <Button size="sm" onClick={() => setIsAddDrawerOpen(true)}>
              Ajouter
            </Button>
          }
        />
      </div>

      {list && (
        <WeekSelector
          week={list.week}
          year={list.year}
          dateRange={formatDateRange(list.start, list.end)}
          onPrev={() => router.push(shoppingUrl(list.prev))}
          onNext={() => router.push(shoppingUrl(list.next))}
          onReset={() => router.push(shoppingUrl())}
          className="mb-8"
        />
      )}

      {isPending ? (
        <div className="flex justify-center py-20 print:hidden">
          <Loader2 className="h-6 w-6 animate-spin text-text-light-muted dark:text-text-dark-muted" />
        </div>
      ) : error ? (
        <div className="max-w-lg mx-auto space-y-4 text-center print:hidden">
          <Alert>{errorMessage(error, 'Impossible de charger la liste de courses.')}</Alert>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      ) : totalCount === 0 && list.extras.length === 0 ? (
        <div className="py-16 max-w-sm print:hidden">
          <p className="font-display text-2xl leading-snug">Rien à acheter cette semaine.</p>
          <p className="mt-2 text-sm text-text-light-muted dark:text-text-dark-muted">
            La liste se remplit à partir des repas planifiés. Vous pouvez aussi y ajouter des articles à la main.
          </p>
          <div className="flex gap-3 mt-6">
            <Button onClick={() => router.push(planningUrl({ week: list }))}>Planifier</Button>
            <Button variant="secondary" onClick={() => setIsAddDrawerOpen(true)}>
              Ajouter un article
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {list.extras.length > 0 && <ShoppingExtrasList extras={list.extras} onDelete={setExtraToDelete} />}

          <div className="md:columns-2 md:gap-12 print:columns-1">
            {list.categories.map((group) => (
              <ShoppingCategory
                key={group.categorie}
                group={group}
                isChecked={(item) => checks.isChecked(item.id, item.isChecked)}
                onToggle={(item) => checks.toggle(item.id, checks.isChecked(item.id, item.isChecked))}
              />
            ))}
          </div>
        </div>
      )}

      <AddExtraDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        week={list ?? null}
      />
    </div>
  );
}
