'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, ArrowUpDown, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import type { RepasWithIngredients } from '@/types';
import { errorMessage } from '@/lib/errors';
import { parseSelectSlot, planningUrl } from '@/lib/routes';
import { useRepasList } from '@/lib/queries/queries';
import { useScheduleMutation } from '@/lib/queries/mutations';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useToast } from '@/hooks/useToast';
import RepasCard from '@/components/RepasCard';
import PageHeader from '@/components/PageHeader';
import RepasDetailModal from '@/components/RepasDetailModal';
import SortDrawer from '@/components/SortDrawer';
import { buttonStyles } from '@/components/ui/button-styles';
import Alert from '@/components/ui/Alert';
import Toast from '@/components/ui/Toast';

const SORT_LABELS: Record<string, string> = {
  alphabetique: 'Ordre alphabétique',
  rarete: 'Rare (Moins programmé)',
  date_creation: 'Ajouté récemment',
};

/** Dernière recherche et dernier tri : conservés quand on quitte puis revient sur la liste. */
let lastFilters = { sort: 'date_creation', search: '' };

export default function RepasPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  // Mode « choisir un repas pour un créneau du planning », porté par l'URL.
  const slot = parseSelectSlot(searchParams);

  const [search, setSearch] = useState(lastFilters.search);
  const [sort, setSort] = useState(lastFilters.sort);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedRepas, setSelectedRepas] = useState<RepasWithIngredients | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  useEffect(() => {
    lastFilters = { sort, search };
  }, [sort, search]);

  const { data: repasList, isPending, error, hasNextPage, fetchNextPage, isFetchingNextPage, isPlaceholderData, refetch } =
    useRepasList(sort, debouncedSearch);
  const scheduleMutation = useScheduleMutation();

  useScrollRestoration({
    key: `repas:${sort}:${debouncedSearch}`,
    ready: Boolean(repasList) && !isPlaceholderData,
  });

  // Scroll infini : la sentinelle en bas de liste charge la page suivante quand elle apparaît.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage || isPlaceholderData) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && fetchNextPage(), {
      threshold: 0.1,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isPlaceholderData, fetchNextPage, repasList]);

  const handleSelectRepas = async (repasId: number) => {
    if (!slot) return;
    try {
      await scheduleMutation.mutateAsync({ repasId, date: slot.date, heure: slot.heure });
      router.push(planningUrl({ week: slot.returnWeek, focus: slot.date }), { scroll: false });
    } catch (err) {
      toast.show(errorMessage(err, 'Une erreur est survenue lors de la programmation du repas.'));
    }
  };

  const handleCardClick = (repas: RepasWithIngredients) => {
    if (slot) {
      handleSelectRepas(repas.id);
    } else {
      setSelectedRepas(repas);
      setIsDetailOpen(true);
    }
  };

  return (
    <div>
      <Toast message={toast.message} onClose={toast.dismiss} />

      <PageHeader
        title="Mes repas"
        action={
          <Link href="/repas/nouveau" className={buttonStyles({ size: 'sm' })}>
            <Plus className="h-4 w-4" />
            Nouveau
          </Link>
        }
      />

      {/* Recherche & tri */}
      <div className="flex items-center gap-3 border-b border-neutral-300 dark:border-neutral-700 focus-within:border-text-light-main dark:focus-within:border-text-dark-main transition-colors">
        <Search className="h-4 w-4 shrink-0 text-text-light-muted dark:text-text-dark-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une recette"
          className="flex-1 min-w-0 py-3 text-base bg-transparent outline-none placeholder:text-text-light-muted dark:placeholder:text-text-dark-muted"
        />
      </div>
      <button
        onClick={() => setIsSortOpen(true)}
        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main cursor-pointer"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        Trié par : {(SORT_LABELS[sort] ?? SORT_LABELS.date_creation).toLowerCase()}
      </button>

      {isPending ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between p-4 border border-neutral-200/30 dark:border-neutral-800/30 bg-card-light dark:bg-card-dark rounded-card animate-pulse"
            >
              <div className="w-full aspect-square rounded-card bg-neutral-200 dark:bg-neutral-800/40 mb-3.5" />
              <div className="h-4 bg-neutral-200 dark:bg-neutral-800/40 rounded-full w-3/4 mx-auto mb-4" />
              <div className="h-9 bg-neutral-200 dark:bg-neutral-800/40 rounded-input w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="max-w-lg mx-auto mt-6 space-y-4 text-center">
          <Alert>{errorMessage(error, 'Impossible de charger vos repas.')}</Alert>
          <button onClick={() => refetch()} className={buttonStyles({ size: 'sm', variant: 'secondary' })}>
            Réessayer
          </button>
        </div>
      ) : repasList.length === 0 ? (
        <div className="py-20 max-w-sm">
          <p className="font-display text-2xl leading-snug">
            {search ? 'Rien ne correspond à cette recherche.' : 'Votre carnet est vide.'}
          </p>
          {!search && (
            <p className="mt-2 text-sm text-text-light-muted dark:text-text-dark-muted">
              Ajoutez une première recette avec le bouton « Nouveau ».
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 mt-8 animate-fade-in transition-opacity duration-200 ${
              isPlaceholderData ? 'opacity-50' : ''
            }`}
          >
            {repasList.map((repas) => (
              <RepasCard key={repas.id} repas={repas} selectMode={slot !== null} onClick={() => handleCardClick(repas)} />
            ))}
          </div>

          {hasNextPage && !isPlaceholderData && (
            <div ref={sentinelRef} className="flex justify-center items-center py-6 w-full">
              <Loader2 className="h-6 w-6 text-brand animate-spin" />
            </div>
          )}
        </div>
      )}

      <RepasDetailModal
        repas={selectedRepas}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRepas(null);
        }}
      />

      <SortDrawer isOpen={isSortOpen} onClose={() => setIsSortOpen(false)} currentSort={sort} onSortChange={setSort} />
    </div>
  );
}
