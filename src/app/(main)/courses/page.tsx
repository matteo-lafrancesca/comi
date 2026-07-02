'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  Carrot, 
  Beef, 
  Egg, 
  Croissant, 
  Soup, 
  Cookie, 
  GlassWater, 
  Snowflake,
  Refrigerator,
  Loader2,
  Check,
  ShoppingBag,
  Trash2,
  Apple,
  Utensils,
} from 'lucide-react';
import { CategorieIngredient, CATEGORY_DETAILS, normalizeCategory } from '@/types';
import { getDatesForISOWeek, getISOWeekAndYear } from '@/lib/date-utils';
import { formatIngredient } from '@/lib/shopping-list-utils';
import ConfirmDeleteDrawer from '@/components/ConfirmDeleteDrawer';
import AddExtraDrawer from '@/components/AddExtraDrawer';
import WeekSelector from '@/components/WeekSelector';

interface ShoppingItem {
  id: number;
  ingredientId: number;
  nom: string;
  quantite: number | null;
  unite: string | null;
  phrase: string;
  isChecked: boolean;
}

interface CategoryGroup {
  categorie: CategorieIngredient;
  label: string;
  order: number;
  items: ShoppingItem[];
}

const CATEGORY_ICONS: Record<CategorieIngredient, React.ComponentType<{ className?: string }>> = {
  'fruits-legumes': Carrot,
  'boucherie-poissonnerie': Beef,
  'frais': Refrigerator,
  'produits-laitiers': Egg,
  'boulangerie-patisserie': Croissant,
  'epicerie-salee': Soup,
  'epicerie-sucree': Cookie,
  'boissons': GlassWater,
  'surgeles': Snowflake,
};

export default function CoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [extras, setExtras] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  // Floating action error state
  const [actionError, setActionError] = useState<string | null>(null);

  // Drawer states
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [extraToDelete, setExtraToDelete] = useState<any | null>(null);

  // Unified fetch shopping list data function
  const fetchShoppingList = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      const weekParam = searchParams.get('week');
      const yearParam = searchParams.get('year');

      let url = '/api/shopping-list';
      if (weekParam && yearParam) {
        url += `?week=${weekParam}&year=${yearParam}`;
      }

      const res = await fetch(url);
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
  };

  useEffect(() => {
    fetchShoppingList(true);
  }, [searchParams]);

  // Auto-dismiss floating action errors after 4 seconds
  useEffect(() => {
    if (actionError) {
      const timer = setTimeout(() => setActionError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionError]);

  const handleDeleteExtra = (extra: any) => {
    setExtraToDelete(extra);
  };

  const confirmDeleteExtra = async (extraId: number) => {
    try {
      const res = await fetch(`/api/shopping-list/extras/${extraId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la suppression.');
      }

      await fetchShoppingList(false);
    } catch (err: any) {
      setActionError(err.message || 'Une erreur est survenue lors de la suppression.');
    }
  };

  // Calculate week start and end date labels client-side
  const weekInfo = useMemo(() => {
    if (currentWeek === null || currentYear === null) return null;
    const { start, end } = getDatesForISOWeek(currentWeek, currentYear);
    return { start, end };
  }, [currentWeek, currentYear]);

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
    if (!weekInfo) return;
    const prevDate = new Date(weekInfo.start);
    prevDate.setDate(prevDate.getDate() - 7);
    const { week, year } = getISOWeekAndYear(prevDate);
    router.push(`${pathname}?week=${week}&year=${year}`);
  };

  const handleNextWeek = () => {
    if (!weekInfo) return;
    const nextDate = new Date(weekInfo.start);
    nextDate.setDate(nextDate.getDate() + 7);
    const { week, year } = getISOWeekAndYear(nextDate);
    router.push(`${pathname}?week=${week}&year=${year}`);
  };

  const handleCurrentWeek = () => {
    router.push(pathname);
  };

  // Toggle item checked state with optimistic update
  const handleToggleItem = async (itemId: number, currentCheckedState: boolean) => {
    // 1. Optimistic Update
    setCategories((prevCategories) =>
      prevCategories.map((cat) => ({
        ...cat,
        items: cat.items.map((item) =>
          item.id === itemId ? { ...item, isChecked: !currentCheckedState } : item
        ),
      }))
    );

    try {
      const res = await fetch(`/api/shopping-list/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isChecked: !currentCheckedState }),
      });

      if (!res.ok) {
        throw new Error('Erreur de synchronisation.');
      }
    } catch {
      // Revert in case of API failure
      setCategories((prevCategories) =>
        prevCategories.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId ? { ...item, isChecked: currentCheckedState } : item
          ),
        }))
      );
      setActionError("Impossible de mettre à jour l'ingrédient. Veuillez vérifier votre connexion.");
    }
  };

  // Calculate shopping list completion metrics
  const totalCount = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.items.length, 0);
  }, [categories]);

  return (
    <div className="space-y-6">
      {/* 🔔 Floating error notification */}
      {actionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-fade-in print:hidden">
          <div className="bg-red-50 dark:bg-red-955/95 text-red-650 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 p-4 rounded-xl shadow-lg flex items-center justify-between gap-3">
            <span className="text-xs font-bold leading-normal">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-text-light-muted dark:text-text-dark-muted hover:text-red-600 transition-colors font-extrabold text-xs cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/40"
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

      {/* 🌟 Page header */}
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-text-light-main dark:text-text-dark-main">
          Ma liste de courses
        </h1>
        <button
          onClick={() => setIsAddDrawerOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-extrabold transition-all duration-300 bg-brand hover:bg-brand-hover text-white rounded-input hover:scale-[1.02] active:scale-95 shadow-sm shadow-brand/20 cursor-pointer"
        >
          <span>Ajouter un article / repas</span>
        </button>
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
          className="print:border-none print:shadow-none print:bg-transparent print:p-0"
        />
      )}

      {/* 🔄 Main loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 print:hidden">
          <Loader2 className="h-10 w-10 text-brand animate-spin mb-3" />
          <span className="text-sm font-medium text-text-light-muted dark:text-text-dark-muted animate-pulse">
            Calcul de votre liste de courses...
          </span>
        </div>
      ) : error ? (
        /* ⚠️ Error state */
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/50 p-4 rounded-card text-center text-sm font-medium text-red-600 dark:text-red-400 max-w-lg mx-auto print:hidden">
          {error}
        </div>
      ) : totalCount === 0 ? (
        /* 📭 Empty state */
        <div className="flex flex-col items-center justify-center py-16 px-6 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-card bg-card-light/20 dark:bg-card-dark/5 max-w-md mx-auto text-center">
          <div className="p-4 bg-brand-light dark:bg-brand/10 text-brand rounded-full mb-4">
            <ShoppingBag className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-text-light-main dark:text-text-dark-main">
            Aucun ingrédient requis
          </h3>
          <p className="text-sm text-text-light-muted dark:text-text-dark-muted mt-2 font-medium">
            Votre liste de courses est vide pour cette semaine car vous n&apos;avez planifié aucun repas contenant des ingrédients. Vous pouvez planifier des repas ou ajouter des recettes et articles manuels.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full max-w-xs justify-center">
            <button
              onClick={() => router.push('/planification')}
              className="px-5 py-2.5 text-sm font-bold bg-brand hover:bg-brand-hover text-white rounded-input hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-sm shadow-brand/20 cursor-pointer text-center"
            >
              Planifier mes repas
            </button>
            <button
              onClick={() => setIsAddDrawerOpen(true)}
              className="px-5 py-2.5 text-sm font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-text-light-main dark:text-text-dark-main rounded-input hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer text-center"
            >
              Ajouter manuellement
            </button>
          </div>
        </div>
      ) : (
        /* 🛒 Active shopping list */
        <div className="space-y-6">
          {/* 🧾 Hors-planning section */}
          {extras.length > 0 && (
            <div className="bg-card-light dark:bg-card-dark p-5 rounded-card border border-neutral-200/40 dark:border-neutral-800/40 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800/50">
                <h2 className="text-sm font-extrabold text-text-light-main dark:text-text-dark-main flex items-center gap-2">
                  <ShoppingBag className="h-4.5 w-4.5 text-brand shrink-0" />
                  <span>Hors-planning ({extras.length})</span>
                </h2>
                <span className="text-[10px] font-bold text-text-light-muted dark:text-text-dark-muted hidden sm:inline">
                  Articles et recettes ajoutés manuellement
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {extras.map((extra) => {
                  if (extra.repas) {
                    return (
                      <div
                        key={extra.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200/30 dark:border-neutral-800/20 text-xs font-bold text-text-light-main dark:text-text-dark-main group transition-all duration-300 border-dashed hover:border-red-200/60 hover:bg-red-50/20 dark:hover:bg-red-950/10"
                      >
                        <Utensils className="h-3.5 w-3.5 text-brand/70 shrink-0" />
                        <span className="truncate max-w-[150px]">{extra.repas.titre}</span>
                        <button
                          onClick={() => handleDeleteExtra(extra)}
                          className="p-0.5 rounded-full text-text-light-muted dark:text-text-dark-muted hover:text-brand hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ml-1"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  } else if (extra.ingredient) {
                    const phrase = formatIngredient(
                      extra.ingredient.nom,
                      extra.quantite,
                      extra.unite
                    );
                    return (
                      <div
                        key={extra.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200/30 dark:border-neutral-800/20 text-xs font-bold text-text-light-main dark:text-text-dark-main group transition-all duration-300 border-dashed hover:border-red-200/60 hover:bg-red-50/20 dark:hover:bg-red-950/10"
                      >
                        <Apple className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate max-w-[180px]">{phrase}</span>
                        <button
                          onClick={() => handleDeleteExtra(extra)}
                          className="p-0.5 rounded-full text-text-light-muted dark:text-text-dark-muted hover:text-brand hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ml-1"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {/* 📋 Ingredient categories grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
            {categories.map((group) => {
              const IconComponent = CATEGORY_ICONS[group.categorie] || ShoppingBag;
              
              return (
                <section 
                  key={group.categorie}
                  className="flex flex-col bg-card-light dark:bg-card-dark rounded-card border border-neutral-200/40 dark:border-neutral-800/40 p-5 shadow-xs transition-all duration-300 hover:border-neutral-300 dark:hover:border-neutral-700 print:shadow-none print:border-none print:p-0 print:gap-2"
                >
                  {/* Category header */}
                  <div className="flex items-center pb-3.5 mb-4 border-b border-neutral-100 dark:border-neutral-800/50 print:border-neutral-200 print:mb-2 print:pb-1">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-brand-light dark:bg-brand/10 text-brand flex items-center justify-center shrink-0 print:hidden">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <h2 className="text-base font-extrabold text-text-light-main dark:text-text-dark-main print:text-lg">
                        {group.label}
                      </h2>
                    </div>
                  </div>

                  {/* Ingredient list */}
                  <ul className="space-y-2.5">
                    {group.items.map((item) => (
                      <li 
                        key={item.id}
                        onClick={() => handleToggleItem(item.id, item.isChecked)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/20 transition-all duration-300 cursor-pointer active:scale-[0.99] select-none print:px-0 print:py-1 print:hover:bg-transparent print:active:scale-100"
                      >
                        {/* Custom checkbox */}
                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-300 print:border-neutral-400 ${
                          item.isChecked
                            ? 'bg-brand border-brand text-white scale-100 shadow-xs shadow-brand/10'
                            : 'border-neutral-300 dark:border-neutral-700 bg-transparent scale-100'
                        }`}>
                          {item.isChecked && (
                            <Check className="h-3 w-3 stroke-[3]" />
                          )}
                        </div>

                        {/* Ingredient text */}
                        <span className={`text-sm font-semibold transition-all duration-300 tracking-wide leading-relaxed print:text-neutral-805 ${
                          item.isChecked
                            ? 'line-through text-text-light-muted dark:text-text-dark-muted opacity-50'
                            : 'text-text-light-main dark:text-text-dark-main'
                        }`}>
                          {item.phrase}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
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
