'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowUpDown, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { RepasWithIngredients } from '@/types';
import RepasCard from '@/components/RepasCard';
import PageHeader from '@/components/PageHeader';
import { buttonStyles } from '@/components/ui/button-styles';
import RepasDetailModal from '@/components/RepasDetailModal';
import SortDrawer from '@/components/SortDrawer';
import { useNavigationCache } from '@/contexts/NavigationCacheContext';
import { apiFetch } from '@/lib/api';

export default function RepasPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { repasCache, updateRepasCache, invalidateCoursesCache } = useNavigationCache();

  const selectMode = searchParams.get('selectMode') === 'true';
  const dateParam = searchParams.get('date');
  const heureParam = searchParams.get('heure');
  const returnWeek = searchParams.get('returnWeek');
  const returnYear = searchParams.get('returnYear');

  const [repasList, setRepasList] = useState<RepasWithIngredients[]>(repasCache.repasList);
  const [loading, setLoading] = useState(!repasCache.isLoaded);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setIsSelecting] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(repasCache.searchQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(repasCache.searchQuery);
  const [sortBy, setSortBy] = useState(repasCache.sortBy);
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  // Pagination & Scroll Observer state
  const [page, setPage] = useState(repasCache.page);
  const [hasMore, setHasMore] = useState(repasCache.hasMore);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);
  
  // Detail Modal state
  const [selectedRepas, setSelectedRepas] = useState<RepasWithIngredients | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [isRefetching, setIsRefetching] = useState(false);
  const isInitialMountRef = useRef(true);
  const skipInitialFetchRef = useRef(repasCache.isLoaded);

  const [actionError, setActionError] = useState<string | null>(null);


  // Réinitialisation de la pagination quand la recherche ou le tri change
  useEffect(() => {
    // Montage avec cache : pas de refetch derrière, donc ne rien réinitialiser (sinon isRefetching reste bloqué)
    if (skipInitialFetchRef.current) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset de la liste au changement de filtre (dette: migrer vers un data-fetching dédié) */
    setPage(1);
    setHasMore(true);
    if (repasList.length === 0) {
      setLoading(true);
    } else {
      setIsRefetching(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, sortBy]);

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Synchroniser l'état local avec le cache
  useEffect(() => {
    updateRepasCache({
      repasList,
      page,
      hasMore,
      searchQuery,
      sortBy,
      isLoaded: true
    });
  }, [repasList, page, hasMore, searchQuery, sortBy, updateRepasCache]);

  // Gérer la position de défilement (Scroll Restoration)
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    if (repasCache.scrollPosition && repasCache.isLoaded) {
      const timer = setTimeout(() => {
        mainEl.scrollTop = repasCache.scrollPosition;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [repasCache.isLoaded, repasCache.scrollPosition]);

  // Sauvegarder la position de défilement au démontage
  useEffect(() => {
    return () => {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        updateRepasCache({ scrollPosition: mainEl.scrollTop });
      }
    };
  }, [updateRepasCache]);

  // Fetch meals on change of page, debounced search query or sort mode
  useEffect(() => {
    // Si c'est le premier montage et que les données sont déjà chargées depuis le cache,
    // on évite de refaire une requête réseau pour la page actuelle.
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      isInitialMountRef.current = false;
      return;
    }

    let active = true;
    
    const fetchRepas = async () => {
      try {
        if (page === 1) {
          if (repasList.length === 0) {
            setLoading(true);
          } else if (!isInitialMountRef.current) {
            setIsRefetching(true);
          }
        } else {
          setLoadingMore(true);
        }
        setError(null);
        
        let url = `/api/repas?sort=${sortBy}&limit=12&page=${page}`;
        if (debouncedSearchQuery.trim()) {
          url += `&search=${encodeURIComponent(debouncedSearchQuery)}`;
        }
        
        if (sortBy === 'alphabetique') {
          url += `&order=asc`;
        } else {
          url += `&order=desc`;
        }

        const res = await apiFetch(url);
        if (!res.ok) {
          throw new Error('Impossible de charger vos repas.');
        }
        const data = await res.json();
        
        if (active) {
          if (page === 1) {
            setRepasList(data.repas || []);
          } else {
            setRepasList((prev) => {
              // Déduplication par ID pour éviter les doublons en cas de chargement concurrent/cache
              const existingIds = new Set(prev.map((r) => r.id));
              const newItems = (data.repas || []).filter((r: RepasWithIngredients) => !existingIds.has(r.id));
              return [...prev, ...newItems];
            });
          }
          setHasMore(data.hasMore);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la récupération des repas.');
        }
      } finally {
        if (active) {
          setLoading(false);
          setLoadingMore(false);
          setIsRefetching(false);
          isInitialMountRef.current = false;
        }
      }
    };

    fetchRepas();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch uniquement sur page/recherche/tri
  }, [page, debouncedSearchQuery, sortBy]);

  // Set up IntersectionObserver for Infinite Scroll
  useEffect(() => {
    const observerTarget = observerTargetRef.current;
    if (!observerTarget || !hasMore || loading || loadingMore || isRefetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget);

    return () => {
      if (observerTarget) {
        observer.unobserve(observerTarget);
      }
    };
  }, [hasMore, loading, loadingMore, isRefetching]);

  const handleSelectRepas = async (repasId: number) => {
    if (!dateParam || !heureParam) return;
    try {
      setIsSelecting(true);
      const res = await apiFetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repasId,
          date: dateParam,
          heure: parseInt(heureParam, 10),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la programmation.');
      }

      // Invalider uniquement le cache des courses car un repas a été planifié
      invalidateCoursesCache();

      // Redirect back to planning page en ciblant le jour choisi
      let redirectUrl = `/planification?targetDate=${dateParam}`;
      if (returnWeek && returnYear) {
        redirectUrl += `&week=${returnWeek}&year=${returnYear}`;
      }
      router.push(redirectUrl, { scroll: false });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la programmation du repas.');
    } finally {
      setIsSelecting(false);
    }
  };

  // Auto-dismiss floating error after 4 seconds
  useEffect(() => {
    if (actionError) {
      const timer = setTimeout(() => setActionError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionError]);

  const getCurrentSortLabel = () => {
    switch (sortBy) {
      case 'alphabetique':
        return 'Ordre alphabétique';
      case 'rarete':
        return 'Rare (Moins programmé)';
      case 'date_creation':
      default:
        return 'Ajouté récemment';
    }
  };

  return (
    <div>
      {/* 🔔 Floating error notification */}
      {actionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-fade-in">
          <div className="bg-red-50 dark:bg-red-950/95 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 p-4 rounded-xl shadow-lg flex items-center justify-between gap-3">
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une recette"
          className="flex-1 min-w-0 py-3 text-base bg-transparent outline-none placeholder:text-text-light-muted dark:placeholder:text-text-dark-muted"
        />
      </div>
      <button
        onClick={() => setIsSortOpen(true)}
        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main cursor-pointer"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        Trié par : {getCurrentSortLabel().toLowerCase()}
      </button>

      {/* Main Grid Content Area */}
      {loading ? (
        /* Shimmer Skeletal Loader */
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
        /* Error Alert Display */
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/50 p-4 rounded-card text-center text-sm font-medium text-red-600 dark:text-red-400 max-w-lg mx-auto mt-6">
          {error}
        </div>
      ) : repasList.length === 0 ? (
        /* Empty State */
        <div className="py-20 max-w-sm">
          <p className="font-display text-2xl leading-snug">
            {searchQuery ? 'Rien ne correspond à cette recherche.' : 'Votre carnet est vide.'}
          </p>
          {!searchQuery && (
            <p className="mt-2 text-sm text-text-light-muted dark:text-text-dark-muted">
              Ajoutez une première recette avec le bouton « Nouveau ».
            </p>
          )}
        </div>
      ) : (
        /* Meals Grid List */
        <div className="space-y-6">
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 mt-8 animate-fade-in transition-opacity duration-200 ${isRefetching ? 'opacity-50' : ''}`}>
            {repasList.map((repas) => (
              <RepasCard
                key={repas.id}
                repas={repas}
                selectMode={selectMode}
                onClick={() => {
                  if (selectMode) {
                    handleSelectRepas(repas.id);
                  } else {
                    setSelectedRepas(repas);
                    setIsDetailOpen(true);
                  }
                }}
              />
            ))}
          </div>

          {/* Element sentinelle observé pour déclencher le chargement de la page suivante */}
          {hasMore && !isRefetching && (
            <div 
              ref={observerTargetRef} 
              className="flex justify-center items-center py-6 w-full"
            >
              <Loader2 className="h-6 w-6 text-brand animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Repas Detail Modal */}
      <RepasDetailModal
        repas={selectedRepas}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRepas(null);
        }}
        onDeleted={(id) => {
          setRepasList((prev) => prev.filter((r) => r.id !== id));
          setIsDetailOpen(false);
          setSelectedRepas(null);
        }}
      />

      {/* Sort Drawer */}
      <SortDrawer
        isOpen={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        currentSort={sortBy}
        onSortChange={handleSortChange}
      />
    </div>
  );
}
