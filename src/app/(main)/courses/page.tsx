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
  ChefHat,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
  Check,
  ShoppingBag
} from 'lucide-react';
import { CategorieIngredient } from '@/types';
import { getDatesForISOWeek, getISOWeekAndYear } from '@/lib/date-utils';

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
  'charcuterie-traiteur': ChefHat,
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
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);


  // Fetch shopping list data
  useEffect(() => {
    let active = true;
    const fetchShoppingList = async () => {
      try {
        setLoading(true);
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

        if (active) {
          setCategories(data.categories || []);
          setCurrentWeek(data.week);
          setCurrentYear(data.year);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la récupération des données.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchShoppingList();

    return () => {
      active = false;
    };
  }, [searchParams]);

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
      alert("Impossible de mettre à jour l'ingrédient. Veuillez vérifier votre connexion.");
    }
  };

  // Calculate shopping list completion metrics
  const totalCount = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.items.length, 0);
  }, [categories]);



  return (
    <div className="space-y-6">
      {/* 🌟 En-tête de la page */}
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-light-main dark:text-text-dark-main">
          Ma liste de courses
        </h1>
      </div>

      {/* 📅 Sélecteur de semaine */}
      {weekInfo && currentWeek && currentYear && (
        <div className="flex items-center justify-between p-3 bg-card-light dark:bg-card-dark rounded-card border border-neutral-200/40 dark:border-neutral-800/40 shadow-xs print:border-none print:shadow-none print:bg-transparent print:p-0">
          <button
            onClick={handlePrevWeek}
            aria-label="Semaine précédente"
            className="p-2.5 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors border border-neutral-200/30 dark:border-neutral-800/20 text-text-light-main dark:text-text-dark-main cursor-pointer print:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="text-center print:text-left">
            <span className="block text-sm font-extrabold text-text-light-main dark:text-text-dark-main print:text-xl">
              Semaine {currentWeek}
            </span>
            <span className="block text-xs font-medium text-text-light-muted dark:text-text-dark-muted print:text-sm">
              {formatDateRange(weekInfo.start, weekInfo.end)}
            </span>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleCurrentWeek}
              aria-label="Revenir à la semaine actuelle"
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-all border border-neutral-200/50 dark:border-neutral-800 rounded-input hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-text-light-main dark:text-text-dark-main cursor-pointer active:scale-95 bg-card-light dark:bg-card-dark"
            >
              <CalendarDays className="h-3.5 w-3.5 text-brand shrink-0" />
              <span>Semaine actuelle</span>
            </button>

            <button
              onClick={handleNextWeek}
              aria-label="Semaine suivante"
              className="p-2.5 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors border border-neutral-200/30 dark:border-neutral-800/20 text-text-light-main dark:text-text-dark-main cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* 🔄 État de chargement principal */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 print:hidden">
          <Loader2 className="h-10 w-10 text-brand animate-spin mb-3" />
          <span className="text-sm font-medium text-text-light-muted dark:text-text-dark-muted animate-pulse">
            Calcul de votre liste de courses...
          </span>
        </div>
      ) : error ? (
        /* ⚠️ État d'erreur */
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/50 p-4 rounded-card text-center text-sm font-medium text-red-600 dark:text-red-400 max-w-lg mx-auto print:hidden">
          {error}
        </div>
      ) : totalCount === 0 ? (
        /* 📭 État vide (aucun ingrédient requis) */
        <div className="flex flex-col items-center justify-center py-16 px-6 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-card bg-card-light/20 dark:bg-card-dark/5 max-w-md mx-auto text-center">
          <div className="p-4 bg-brand-light dark:bg-brand/10 text-brand rounded-full mb-4">
            <ShoppingBag className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-text-light-main dark:text-text-dark-main">
            Aucun ingrédient requis
          </h3>
          <p className="text-sm text-text-light-muted dark:text-text-dark-muted mt-2 font-medium">
            Votre liste de courses est vide pour cette semaine car vous n&apos;avez planifié aucun repas contenant des ingrédients.
          </p>
          <button
            onClick={() => router.push('/planification')}
            className="mt-6 px-5 py-2.5 text-sm font-bold bg-brand hover:bg-brand-hover text-white rounded-input hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-sm shadow-brand/20 cursor-pointer text-center"
          >
            Planifier mes repas
          </button>
        </div>
      ) : (
        /* 🛒 Section Liste de Courses Active */
        <div className="space-y-6">
          


          {/* 📋 Grille des catégories d'ingrédients */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
            {categories.map((group) => {
              const IconComponent = CATEGORY_ICONS[group.categorie] || ShoppingBag;
              
              return (
                <section 
                  key={group.categorie}
                  className="flex flex-col bg-card-light dark:bg-card-dark rounded-card border border-neutral-200/40 dark:border-neutral-800/40 p-5 shadow-xs transition-all duration-300 hover:border-neutral-300 dark:hover:border-neutral-700 print:shadow-none print:border-none print:p-0 print:gap-2"
                >
                  {/* Header de la catégorie */}
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

                  {/* Liste des ingrédients de la catégorie */}
                  <ul className="space-y-2.5">
                    {group.items.map((item) => (
                      <li 
                        key={item.id}
                        onClick={() => handleToggleItem(item.id, item.isChecked)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/20 transition-all duration-300 cursor-pointer active:scale-[0.99] select-none print:px-0 print:py-1 print:hover:bg-transparent print:active:scale-100"
                      >
                        {/* Checkbox personnalisé */}
                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-300 print:border-neutral-400 ${
                          item.isChecked
                            ? 'bg-brand border-brand text-white scale-100 shadow-xs shadow-brand/10'
                            : 'border-neutral-300 dark:border-neutral-700 bg-transparent scale-100'
                        }`}>
                          {item.isChecked && (
                            <Check className="h-3 w-3 stroke-[3]" />
                          )}
                        </div>

                        {/* Texte de l'ingrédient */}
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
    </div>
  );
}
