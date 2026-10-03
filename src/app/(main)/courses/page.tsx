'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Loader2, Check, X } from 'lucide-react';
import { CategoryGroup, ShoppingListExtraItem } from '@/types';
import { getDatesForISOWeek, getCustomWeekRange, getAdjacentWeek } from '@/lib/date-utils';

import { formatIngredient } from '@/lib/shopping-list-utils';
import ConfirmDeleteDrawer from '@/components/ConfirmDeleteDrawer';
import AddExtraDrawer from '@/components/AddExtraDrawer';
import WeekSelector from '@/components/WeekSelector';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/ui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { useNavigationCache } from '@/contexts/NavigationCacheContext';
import { apiFetch } from '@/lib/api';
export default function CoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { weekStartDay } = useSettings();
  const { coursesCache, updateCoursesCache } = useNavigationCache();

  const weekParam = searchParams.get('week') || 'current';
  const yearParam = searchParams.get('year') || 'current';
  const cacheKey = `${weekParam}-${yearParam}`;
  const isCacheValid = coursesCache.isLoaded && coursesCache.key === cacheKey;

  const [loading, setLoading] = useState(!isCacheValid);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryGroup[]>(isCacheValid ? coursesCache.categories : []);
  const [extras, setExtras] = useState<ShoppingListExtraItem[]>(isCacheValid ? coursesCache.extras : []);
  const [currentWeek, setCurrentWeek] = useState<number | null>(isCacheValid ? coursesCache.currentWeek : null);
  const [currentYear, setCurrentYear] = useState<number | null>(isCacheValid ? coursesCache.currentYear : null);

  // Floating action error state
  const [actionError, setActionError] = useState<string | null>(null);

  // Drawer states
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [extraToDelete, setExtraToDelete] = useState<ShoppingListExtraItem | null>(null);

  // Accumulateur des modifications en attente de synchronisation réseau
  const pendingUpdatesRef = useRef<Record<number, { isChecked: boolean; originalChecked: boolean }>>({});
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Nettoyage du timeout de synchronisation lors du démontage du composant
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Synchroniser l'état local avec le cache
  useEffect(() => {
    const urlWeek = searchParams.get('week');
    const urlYear = searchParams.get('year');
    
    const isMatching = 
      (urlWeek === null || currentWeek === parseInt(urlWeek, 10)) &&
      (urlYear === null || currentYear === parseInt(urlYear, 10));
      
    if (isMatching && currentWeek !== null && currentYear !== null) {
      updateCoursesCache({
        categories,
        extras,
        currentWeek,
        currentYear,
        isLoaded: true,
        key: cacheKey,
      });
    }
  }, [categories, extras, currentWeek, currentYear, cacheKey, searchParams, updateCoursesCache]);

  // Unified fetch shopping list data function
  const fetchShoppingList = useCallback(async (showLoader = true) => {
    try {
      if (showLoader && !isCacheValid) setLoading(true);
      setError(null);

      const weekVal = searchParams.get('week');
      const yearVal = searchParams.get('year');

      let url = '/api/shopping-list';
      if (weekVal && yearVal) {
        url += `?week=${weekVal}&year=${yearVal}`;
      }

      const res = await apiFetch(url);
      if (!res.ok) {
        throw new Error('Impossible de charger la liste de courses.');
      }

      const data = await res.json();
      setCategories(data.categories || []);
      setExtras(data.extras || []);
      setCurrentWeek(data.week);
      setCurrentYear(data.year);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  }, [searchParams, isCacheValid]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement des données au changement de semaine (dette: migrer vers un data-fetching dédié)
    fetchShoppingList(true);
  }, [fetchShoppingList]);

  // Auto-dismiss floating action errors after 4 seconds
  useEffect(() => {
    if (actionError) {
      const timer = setTimeout(() => setActionError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionError]);

  const handleDeleteExtra = (extra: ShoppingListExtraItem) => {
    setExtraToDelete(extra);
  };

  const confirmDeleteExtra = async (extraId: number) => {
    try {
      const res = await apiFetch(`/api/shopping-list/extras/${extraId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la suppression.');
      }

      await fetchShoppingList(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la suppression.');
    }
  };

  // Calculate week start and end date labels client-side
  const weekInfo = useMemo(() => {
    if (currentWeek === null || currentYear === null) return null;
    // Utilise la plage personnalisée cohérente avec l'API
    const isoRange = getDatesForISOWeek(currentWeek, currentYear);
    const { start, end } = getCustomWeekRange(new Date(isoRange.start), weekStartDay);
    return { start, end };
  }, [currentWeek, currentYear, weekStartDay]);


  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short', 
      timeZone: 'UTC' 
    };
    const startFormatted = start.toLocaleDateString('fr-FR', options);
    const endFormatted = end.toLocaleDateString('fr-FR', { 
      ...options, 
      year: 'numeric' 
    });
    return `Du ${startFormatted} au ${endFormatted}`;
  };

  const handlePrevWeek = () => {
    if (currentWeek === null || currentYear === null) return;
    const { week, year } = getAdjacentWeek(currentWeek, currentYear, 'prev');
    router.push(`${pathname}?week=${week}&year=${year}`);
  };

  const handleNextWeek = () => {
    if (currentWeek === null || currentYear === null) return;
    const { week, year } = getAdjacentWeek(currentWeek, currentYear, 'next');
    router.push(`${pathname}?week=${week}&year=${year}`);
  };

  const handleCurrentWeek = () => {
    router.push(pathname);
  };

  // Toggle item checked state with optimistic update and network batching (debounced at 2s)
  const handleToggleItem = (itemId: number, currentCheckedState: boolean) => {
    const nextCheckedState = !currentCheckedState;

    // 1. Optimistic Update dans l'UI
    setCategories((prevCategories) =>
      prevCategories.map((cat) => ({
        ...cat,
        items: cat.items.map((item) =>
          item.id === itemId ? { ...item, isChecked: nextCheckedState } : item
        ),
      }))
    );

    // 2. Enregistrer la mise à jour dans l'accumulateur local
    const pending = pendingUpdatesRef.current;
    if (pending[itemId]) {
      // Si on revient à l'état initial avant envoi réseau, on annule la mise à jour en attente
      if (pending[itemId].originalChecked === nextCheckedState) {
        delete pending[itemId];
      } else {
        pending[itemId].isChecked = nextCheckedState;
      }
    } else {
      pending[itemId] = {
        isChecked: nextCheckedState,
        originalChecked: currentCheckedState,
      };
    }

    // 3. Planifier/Repousser la synchronisation batch
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      const updatesToSend = { ...pendingUpdatesRef.current };
      // Vider tout de suite l'accumulateur pour les clics futurs pendant la requête réseau
      pendingUpdatesRef.current = {};

      const items = Object.entries(updatesToSend).map(([id, val]) => ({
        id: parseInt(id, 10),
        isChecked: val.isChecked,
      }));

      if (items.length === 0) return;

      try {
        const res = await apiFetch('/api/shopping-list', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items }),
        });

        if (!res.ok) {
          throw new Error('Erreur de synchronisation batch.');
        }
      } catch (err) {
        console.error('Erreur de synchronisation batch des courses:', err);
        // Revert en arrière uniquement pour les éléments de ce batch ayant échoué
        setCategories((prevCategories) =>
          prevCategories.map((cat) => ({
            ...cat,
            items: cat.items.map((item) => {
              const failedUpdate = updatesToSend[item.id];
              if (failedUpdate !== undefined) {
                return { ...item, isChecked: failedUpdate.originalChecked };
              }
              return item;
            }),
          }))
        );
        setActionError("Impossible de synchroniser vos modifications de courses. Veuillez vérifier votre connexion.");
      }
    }, 2000);
  };

  // Calculate shopping list completion metrics
  const totalCount = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.items.length, 0);
  }, [categories]);

  return (
    <div>
      {/* 🔔 Floating error notification */}
      {actionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-fade-in print:hidden">
          <div className="bg-red-50 dark:bg-red-955/95 text-red-650 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 p-4 rounded-xl shadow-lg flex items-center justify-between gap-3">
            <span className="text-xs font-bold leading-normal">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-text-light-muted dark:text-text-dark-muted hover:text-red-600 transition-colors font-semibold text-xs cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/40"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* 🗑️ Delete confirmation drawer */}
      <ConfirmDeleteDrawer
        isOpen={!!extraToDelete}
        onClose={() => setExtraToDelete(null)}
        title="Confirmer la suppression"
        message="Voulez-vous vraiment retirer l'article"
        highlightedName={extraToDelete?.repas?.titre || extraToDelete?.ingredient?.nom}
        warningText="de votre liste hors-planning ?"
        onConfirm={() => {
          if (extraToDelete) {
            confirmDeleteExtra(extraToDelete.id);
            setExtraToDelete(null);
          }
        }}
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

      {/* 📅 Week selector */}
      {weekInfo && currentWeek && currentYear && (
        <WeekSelector
          week={currentWeek}
          year={currentYear}
          dateRange={formatDateRange(weekInfo.start, weekInfo.end)}
          onPrev={handlePrevWeek}
          onNext={handleNextWeek}
          onReset={handleCurrentWeek}
          className="mb-8"
        />
      )}

      {/* 🔄 Main loading state */}
      {loading ? (
        <div className="flex justify-center py-20 print:hidden">
          <Loader2 className="h-6 w-6 animate-spin text-text-light-muted dark:text-text-dark-muted" />
        </div>
      ) : error ? (
        /* ⚠️ Error state */
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/50 p-4 rounded-card text-center text-sm font-medium text-red-600 dark:text-red-400 max-w-lg mx-auto print:hidden">
          {error}
        </div>
      ) : totalCount === 0 ? (
        <div className="py-16 max-w-sm print:hidden">
          <p className="font-display text-2xl leading-snug">Rien à acheter cette semaine.</p>
          <p className="mt-2 text-sm text-text-light-muted dark:text-text-dark-muted">
            La liste se remplit à partir des repas planifiés. Vous pouvez aussi y ajouter des articles à la main.
          </p>
          <div className="flex gap-3 mt-6">
            <Button onClick={() => router.push('/planification')}>Planifier</Button>
            <Button variant="secondary" onClick={() => setIsAddDrawerOpen(true)}>
              Ajouter un article
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {extras.length > 0 && (
            <section>
              <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">Hors planning</h2>
              <ul className="divide-y divide-dashed divide-neutral-300 dark:divide-neutral-700">
                {extras.map((extra) => {
                  const label = extra.repas
                    ? extra.repas.titre
                    : extra.ingredient
                      ? formatIngredient(extra.ingredient.nom, extra.quantite ?? null, extra.unite ?? null)
                      : null;
                  if (!label) return null;
                  return (
                    <li key={extra.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-[15px]">
                        {label}
                        {extra.repas && <span className="ml-2 eyebrow">recette</span>}
                      </span>
                      <button
                        onClick={() => handleDeleteExtra(extra)}
                        className="p-1.5 -mr-1.5 text-text-light-muted dark:text-text-dark-muted hover:text-red-700 dark:hover:text-red-400 cursor-pointer print:hidden"
                        aria-label="Retirer de la liste"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="md:columns-2 md:gap-12 print:columns-1">
            {categories.map((group) => (
              <section key={group.categorie} className="break-inside-avoid mb-10">
                <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">{group.label}</h2>
                <ul className="divide-y divide-dashed divide-neutral-300 dark:divide-neutral-700">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleToggleItem(item.id, item.isChecked)}
                        className="w-full flex items-center gap-3 py-3 text-left cursor-pointer select-none print:py-1"
                      >
                        <span
                          className={`h-5 w-5 shrink-0 rounded-[4px] border-[1.5px] flex items-center justify-center transition-colors ${
                            item.isChecked
                              ? 'bg-text-light-main dark:bg-text-dark-main border-text-light-main dark:border-text-dark-main text-bg-light dark:text-bg-dark'
                              : 'border-neutral-400 dark:border-neutral-600'
                          }`}
                        >
                          {item.isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </span>
                        <span
                          className={`text-[15px] transition-colors ${
                            item.isChecked ? 'line-through text-text-light-muted dark:text-text-dark-muted' : ''
                          }`}
                        >
                          {item.phrase}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}

      {/* Drawer d'ajout hors-planning */}
      <AddExtraDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        week={currentWeek}
        year={currentYear}
        onAdded={() => fetchShoppingList(false)}
      />
    </div>
  );
}
