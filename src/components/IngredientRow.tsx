'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CategorieIngredient } from '@/types';

export interface IngredientRowItem {
  id: string; // client-side unique key
  ingredientId?: number;
  nom: string;
  quantite: string;
  unite: string;
  categorie: CategorieIngredient;
}

interface IngredientRowProps {
  ingredient: IngredientRowItem;
  onChange: (id: string, field: 'quantite' | 'unite', value: string) => void;
  onRemove: (id: string) => void;
}

const smallField =
  'bg-transparent border-b border-neutral-300 dark:border-neutral-700 py-1 text-sm text-center outline-none focus:border-text-light-main dark:focus:border-text-dark-main placeholder:text-text-light-muted/70 dark:placeholder:text-text-dark-muted/70';

/** Ligne d'ingrédient éditable : nom, quantité, unité, retrait. */
export default function IngredientRow({ ingredient, onChange, onRemove }: IngredientRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 animate-fade-in">
      <p className="flex-1 min-w-0 text-[15px] truncate">{ingredient.nom}</p>

      <input
        type="number"
        step="any"
        value={ingredient.quantite}
        onChange={(e) => onChange(ingredient.id, 'quantite', e.target.value)}
        placeholder="Qté"
        aria-label={`Quantité de ${ingredient.nom}`}
        className={`w-14 shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${smallField}`}
      />
      <input
        type="text"
        value={ingredient.unite}
        onChange={(e) => onChange(ingredient.id, 'unite', e.target.value)}
        placeholder="Unité"
        aria-label={`Unité de ${ingredient.nom}`}
        className={`w-16 shrink-0 ${smallField}`}
      />

      <button
        type="button"
        onClick={() => onRemove(ingredient.id)}
        className="p-1.5 -mr-1.5 shrink-0 text-text-light-muted dark:text-text-dark-muted hover:text-red-700 dark:hover:text-red-400 transition-colors cursor-pointer"
        aria-label={`Retirer ${ingredient.nom}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
