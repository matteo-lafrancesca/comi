'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Utensils, Search, Plus, X } from 'lucide-react';
import { CategorieIngredient, CATEGORY_DETAILS, normalizeCategory } from '@/types';
import Drawer from '@/components/Drawer';
import { formatIngredient } from '@/lib/shopping-list-utils';
import { normalizeSearchText } from '@/lib/string-utils';

interface AddExtraDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  week: number | null;
  year: number | null;
  /** Called after a successful add so the parent can refresh its data */
  onAdded: () => void;
}

export default function AddExtraDrawer({
  isOpen,
  onClose,
  week,
  year,
  onAdded,
}: AddExtraDrawerProps) {
  const [activeTab, setActiveTab] = useState<'repas' | 'ingredient'>('repas');
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Repas tab
  const [allMeals, setAllMeals] = useState<any[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [selectedRepasId, setSelectedRepasId] = useState('');
  const [searchMealQuery, setSearchMealQuery] = useState('');

  // Ingredient tab
  const [selectedIngredient, setSelectedIngredient] = useState<{
    id: string | number;
    nom: string;
    categorie: string;
  } | null>(null);
  const [ingredientNameInput, setIngredientNameInput] = useState('');
  const [ingredientCategory, setIngredientCategory] = useState<CategorieIngredient>('epicerie-salee');
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnite, setIngredientUnite] = useState('');
  const [ingredientSuggestions, setIngredientSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load meals when drawer opens
  useEffect(() => {
    if (isOpen) {
      const fetchMeals = async () => {
        try {
          setLoadingMeals(true);
          const res = await fetch('/api/repas');
          if (res.ok) {
            const data = await res.json();
            setAllMeals(data.repas || []);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingMeals(false);
        }
      };
      fetchMeals();
    }
  }, [isOpen]);

  // Autocomplete for ingredient names
  useEffect(() => {
    if (ingredientNameInput.trim().length < 2) {
      setIngredientSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ingredients?search=${encodeURIComponent(ingredientNameInput)}`);
        if (res.ok) {
          const data = await res.json();
          setIngredientSuggestions(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [ingredientNameInput]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Reset form on open/close or tab switch
  useEffect(() => {
    setFormError(null);
    setSelectedIngredient(null);
    setIngredientNameInput('');
  }, [isOpen, activeTab]);

  const filteredMeals = useMemo(() => {
    if (!searchMealQuery.trim()) return allMeals;
    const q = normalizeSearchText(searchMealQuery);
    return allMeals.filter((meal) => normalizeSearchText(meal.titre).includes(q));
  }, [allMeals, searchMealQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (week === null || year === null) return;

    setFormError(null);
    setAdding(true);
    try {
      let body: any = { week, year };

      if (activeTab === 'repas') {
        if (!selectedRepasId) {
          setFormError('Veuillez sélectionner une recette.');
          setAdding(false);
          return;
        }
        body.repasId = parseInt(selectedRepasId, 10);
      } else {
        if (!selectedIngredient) {
          setFormError('Veuillez sélectionner ou ajouter un article.');
          setAdding(false);
          return;
        }
        body.ingredientName = selectedIngredient.nom;
        body.categorie = selectedIngredient.categorie;
        if (ingredientQuantity) body.quantite = parseFloat(ingredientQuantity);
        if (ingredientUnite) body.unite = ingredientUnite;
      }

      const res = await fetch('/api/shopping-list/extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erreur lors de l'ajout.");
      }

      // Reset
      setSelectedRepasId('');
      setSelectedIngredient(null);
      setIngredientNameInput('');
      setIngredientQuantity('');
      setIngredientUnite('');
      onClose();
      onAdded();
    } catch (err: any) {
      setFormError(err.message || 'Une erreur est survenue.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Ajouter un article ou repas"
      maxWidth="sm:max-w-md"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex bg-neutral-100 dark:bg-neutral-900/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('repas')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === 'repas'
                ? 'bg-white dark:bg-neutral-800 text-brand shadow-xs'
                : 'text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main'
            }`}
          >
            Recette (Repas)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ingredient')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === 'ingredient'
                ? 'bg-white dark:bg-neutral-800 text-brand shadow-xs'
                : 'text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main'
            }`}
          >
            Article individuel
          </button>
        </div>

        {/* Form error */}
        {formError && (
          <div className="p-3 text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-xl leading-normal shrink-0">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {activeTab === 'repas' ? (
            /* Repas tab */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-text-light-main dark:text-text-dark-main">
                  Sélectionner un repas
                </label>
                <input
                  type="text"
                  placeholder="Rechercher parmi mes recettes..."
                  value={searchMealQuery}
                  onChange={(e) => setSearchMealQuery(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm transition-colors border outline-none bg-card-light dark:bg-card-dark border-neutral-200 dark:border-neutral-800 rounded-xl focus:border-brand dark:focus:border-brand text-text-light-main dark:text-text-dark-main placeholder:text-text-light-muted dark:placeholder:text-text-dark-muted"
                />
              </div>

              {loadingMeals ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 text-brand animate-spin" />
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-neutral-200/20 dark:border-neutral-800/40 rounded-xl p-2 bg-neutral-50/20 dark:bg-neutral-900/10">
                  {filteredMeals.length === 0 ? (
                    <div className="text-center py-6 text-xs text-text-light-muted dark:text-text-dark-muted font-medium">
                      Aucune recette trouvée.
                    </div>
                  ) : (
                    filteredMeals.map((meal) => (
                      <button
                        key={meal.id}
                        type="button"
                        onClick={() => setSelectedRepasId(meal.id.toString())}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                          selectedRepasId === meal.id.toString()
                            ? 'border-brand bg-brand-light dark:bg-brand/10 text-brand'
                            : 'border-neutral-200/50 dark:border-neutral-800/25 hover:bg-neutral-105 dark:hover:bg-neutral-800/40 text-text-light-main dark:text-text-dark-main'
                        }`}
                      >
                        <div className="h-9 w-9 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-200/20">
                          {meal.photoUrl ? (
                            <img src={meal.photoUrl} alt={meal.titre} className="object-cover w-full h-full" />
                          ) : (
                            <Utensils className="h-4 w-4 text-text-light-muted dark:text-text-dark-muted" />
                          )}
                        </div>
                        <span className="text-xs font-bold truncate">{meal.titre}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Ingredient tab */
            <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
              {selectedIngredient ? (
                /* Selected ingredient badge */
                <div className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-neutral-800/40 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm font-bold text-text-light-main dark:text-text-dark-main truncate">
                      {selectedIngredient.nom}
                    </span>
                    <span className="text-[10px] text-brand px-2 py-0.5 bg-brand-light dark:bg-brand/10 border border-brand/15 rounded-full font-bold shrink-0">
                      {CATEGORY_DETAILS[selectedIngredient.categorie as CategorieIngredient]?.label || selectedIngredient.categorie}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIngredient(null);
                      setIngredientNameInput('');
                    }}
                    className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-text-light-muted dark:text-text-dark-muted hover:text-brand transition-colors cursor-pointer shrink-0"
                    title="Changer d'article"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                /* Search field */
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-extrabold text-text-light-main dark:text-text-dark-main">
                    Rechercher ou ajouter un article
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light-muted dark:text-text-dark-muted" />
                    <input
                      type="text"
                      placeholder="ex: Yaourts nature, Pain de mie..."
                      value={ingredientNameInput}
                      onChange={(e) => {
                        setIngredientNameInput(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="w-full pl-11 pr-4 py-2.5 text-sm transition-colors border outline-none bg-card-light dark:bg-card-dark border-neutral-200 dark:border-neutral-800 rounded-xl focus:border-brand dark:focus:border-brand text-text-light-main dark:text-text-dark-main placeholder:text-text-light-muted dark:placeholder:text-text-dark-muted h-10 font-bold"
                    />
                    {showSuggestions && ingredientNameInput.trim().length >= 2 && (
                      <ul className="absolute z-10 w-full bg-card-light dark:bg-card-dark border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/40">
                        {ingredientSuggestions.map((suggestion) => (
                          <li key={suggestion.id}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIngredient({
                                  id: suggestion.id,
                                  nom: suggestion.nom,
                                  categorie: suggestion.categorie,
                                });
                                setIngredientNameInput(suggestion.nom);
                                setShowSuggestions(false);
                              }}
                              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-extrabold hover:bg-neutral-50 dark:hover:bg-neutral-800 text-text-light-main dark:text-text-dark-main cursor-pointer"
                            >
                              <span>{suggestion.nom}</span>
                              <span className="text-[9px] text-brand px-2 py-0.5 bg-brand-light dark:bg-brand/10 border border-brand/15 rounded-full font-bold">
                                {CATEGORY_DETAILS[suggestion.categorie as CategorieIngredient]?.label || suggestion.categorie}
                              </span>
                            </button>
                          </li>
                        ))}

                        {/* Add new on the fly */}
                        {!ingredientSuggestions.some(
                          (s) => normalizeSearchText(s.nom) === normalizeSearchText(ingredientNameInput)
                        ) && (
                          <li>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const name = ingredientNameInput.trim();
                                setSelectedIngredient({
                                  id: 'new',
                                  nom: name,
                                  categorie: normalizeCategory(name),
                                });
                                setIngredientNameInput(name);
                                setShowSuggestions(false);
                              }}
                              className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 text-text-light-main dark:text-text-dark-main border-t border-neutral-100 dark:border-neutral-800/40 cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2 text-text-light-main dark:text-text-dark-main">
                                <Plus className="h-4 w-4 text-brand shrink-0" />
                                <span>
                                  Ajouter{' '}
                                  <span className="font-extrabold text-brand">
                                    &quot;{ingredientNameInput.trim()}&quot;
                                  </span>
                                </span>
                              </div>
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-text-light-muted dark:text-text-dark-muted rounded-full uppercase shrink-0">
                                Nouveau
                              </span>
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Quantity / Unit fields — shown once an ingredient is selected */}
              {selectedIngredient && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-extrabold text-text-light-main dark:text-text-dark-main">
                    Quantité / Unité
                  </label>
                  <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-xl bg-card-light dark:bg-card-dark focus-within:border-brand overflow-hidden h-10 w-full transition-all">
                    <input
                      type="number"
                      step="any"
                      placeholder="Quantité (ex: 4)"
                      value={ingredientQuantity}
                      onChange={(e) => setIngredientQuantity(e.target.value)}
                      className="flex-1 min-w-0 px-3 text-xs font-bold border-none bg-transparent outline-none text-text-light-main dark:text-text-dark-main placeholder:text-text-light-muted dark:placeholder:text-text-dark-muted h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                    <input
                      type="text"
                      placeholder="Unité (ex: pots, tranches, g)"
                      value={ingredientUnite}
                      onChange={(e) => setIngredientUnite(e.target.value)}
                      className="flex-1 min-w-0 px-3 text-xs font-bold border-none bg-transparent outline-none text-text-light-main dark:text-text-dark-main placeholder:text-text-light-muted dark:placeholder:text-text-dark-muted h-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={adding}
            className="w-full py-3 bg-brand hover:bg-brand-hover text-white font-extrabold rounded-input flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:scale-100 cursor-pointer shadow-md shadow-brand/10"
          >
            {adding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Ajout en cours...</span>
              </>
            ) : (
              <span>Ajouter à la liste</span>
            )}
          </button>
        </form>
      </div>
    </Drawer>
  );
}
