'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { ShoppingListExtraItem } from '@/types';
import { formatIngredient } from '@/lib/shopping-list-utils';

interface ShoppingExtrasListProps {
  extras: ShoppingListExtraItem[];
  onDelete: (extra: ShoppingListExtraItem) => void;
}

/** Articles et recettes ajoutés à la main, hors planning. */
export default function ShoppingExtrasList({ extras, onDelete }: ShoppingExtrasListProps) {
  return (
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
                onClick={() => onDelete(extra)}
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
  );
}
