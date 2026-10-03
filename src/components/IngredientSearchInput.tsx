'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import { CATEGORY_DETAILS, CategorieIngredient } from '@/types';
import { normalizeSearchText } from '@/lib/string-utils';
import { apiFetch } from '@/lib/api';

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
  placeholder = 'Tomate, crème fraîche…',
  label = 'Ajouter un ingrédient',
}: IngredientSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IngredientSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Debounced autocomplete search
  useEffect(() => {
    if (!searchQuery.trim()) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await apiFetch(`/api/ingredients?search=${encodeURIComponent(searchQuery)}`);
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
    <div className="relative">
      <label className="eyebrow block mb-1">{label}</label>
      <div className="flex items-center gap-3 border-b border-neutral-300 dark:border-neutral-700 focus-within:border-text-light-main dark:focus-within:border-text-dark-main transition-colors">
        <Search className="h-4 w-4 shrink-0 text-text-light-muted dark:text-text-dark-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
          placeholder={placeholder}
          className="flex-1 min-w-0 py-2.5 text-base bg-transparent outline-none placeholder:text-text-light-muted/70 dark:placeholder:text-text-dark-muted/70"
        />
        {searching && <Loader2 className="h-4 w-4 animate-spin text-text-light-muted dark:text-text-dark-muted" />}
      </div>

      {isSearchFocused && searchQuery.trim() !== '' && (
        <ul className="absolute left-0 right-0 mt-1 bg-card-light dark:bg-card-dark border border-text-light-main dark:border-neutral-600 rounded-card shadow-lg z-30 max-h-60 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
          {searchResults.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                onClick={() => handleSelect(suggestion)}
                className="w-full flex items-baseline justify-between gap-3 px-4 py-2.5 text-left cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              >
                <span className="text-[15px]">{suggestion.nom}</span>
                <span className="eyebrow shrink-0">
                  {CATEGORY_DETAILS[suggestion.categorie as CategorieIngredient]?.label || suggestion.categorie}
                </span>
              </button>
            </li>
          ))}

          {!searching && !exactMatchExists && (
            <li>
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full flex items-center gap-2 px-4 py-3 text-left text-[15px] cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>
                  Créer <strong className="marker">&laquo;&nbsp;{searchQuery.trim()}&nbsp;&raquo;</strong>
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
