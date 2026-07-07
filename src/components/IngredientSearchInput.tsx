'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import { CATEGORY_DETAILS, CategorieIngredient } from '@/types';
import { normalizeSearchText } from '@/lib/string-utils';

export interface IngredientSuggestion {
  id: number;
  nom: string;
  categorie: string;
}

interface IngredientSearchInputProps {
  /** Called when the user selects an existing ingredient from the dropdown */
  onSelect: (ingredient: IngredientSuggestion) => void;
  /** Called when the user clicks "Ajouter X au dictionnaire" */
  onCreateNew: (name: string) => void;
  /** IDs or names already in the list, to avoid re-showing them */
  existingIngredients?: { ingredientId?: number; nom: string }[];
  placeholder?: string;
  label?: string;
}

export default function IngredientSearchInput({
  onSelect,
  onCreateNew,
  existingIngredients = [],
  placeholder = 'Rechercher un ingrédient (ex: Tomate, Crème fraîche...)',
  label = 'Ajouter un ingrédient',
}: IngredientSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IngredientSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Debounced autocomplete search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/ingredients?search=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Erreur autocomplete:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const exactMatchExists = searchResults.some(
    (r) => normalizeSearchText(r.nom) === normalizeSearchText(searchQuery)
  );

  const handleSelect = (ingredient: IngredientSuggestion) => {
    // Avoid duplicates
    const alreadyExists = existingIngredients.some(
      (item) =>
        item.ingredientId === ingredient.id ||
        normalizeSearchText(item.nom) === normalizeSearchText(ingredient.nom)
    );
    if (!alreadyExists) {
      onSelect(ingredient);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCreateNew = () => {
    onCreateNew(searchQuery.trim());
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="space-y-2 relative">
      <label className="text-sm font-bold text-text-light-main dark:text-text-dark-main">
        {label}
      </label>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-text-light-muted dark:text-text-dark-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
          placeholder={placeholder}
          className="w-full pl-11 pr-5 py-3 text-sm transition-all border outline-none bg-bg-light dark:bg-bg-dark border-neutral-200/80 dark:border-neutral-800 rounded-xl focus:border-brand dark:focus:border-brand focus:ring-1 focus:ring-brand text-text-light-main dark:text-text-dark-main placeholder:text-text-light-muted dark:placeholder:text-text-dark-muted font-medium"
        />
      </div>

      {/* Suggestions dropdown */}
      {isSearchFocused && searchQuery.trim() !== '' && (
        <div className="absolute left-0 right-0 mt-1 bg-card-light dark:bg-card-dark border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto">
          {/* Results matching */}
          {searchResults.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/65 text-left text-text-light-main dark:text-text-dark-main font-semibold"
            >
              <span>{suggestion.nom}</span>
              <span className="text-[10px] text-brand px-2 py-0.5 bg-brand-light dark:bg-brand/10 border border-brand/15 rounded-full font-bold">
                {CATEGORY_DETAILS[suggestion.categorie as CategorieIngredient]?.label || suggestion.categorie}
              </span>
            </button>
          ))}

          {/* Loading spinner */}
          {searching && (
            <div className="flex items-center justify-center p-4 text-text-light-muted dark:text-text-dark-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {/* Create custom ingredient trigger */}
          {!searching && !exactMatchExists && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors border-t border-neutral-100/50 dark:border-neutral-800/50 cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 text-text-light-main dark:text-text-dark-main">
                <div className="p-1.5 bg-brand-light dark:bg-brand/10 text-brand rounded-lg shrink-0">
                  <Plus className="h-4.5 w-4.5" />
                </div>
                <span className="font-semibold">
                  Ajouter <span className="font-extrabold text-brand">"{searchQuery}"</span> au dictionnaire
                </span>
              </div>
              <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-text-light-muted dark:text-text-dark-muted rounded-full">
                Nouveau
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
