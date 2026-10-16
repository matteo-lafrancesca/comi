'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { CategoryGroup, ShoppingItem } from '@/types';

interface ShoppingCategoryProps {
  group: CategoryGroup;
  /** État affiché d'une case (la modification locale prime sur la donnée du serveur) */
  isChecked: (item: ShoppingItem) => boolean;
  onToggle: (item: ShoppingItem) => void;
}

/** Un rayon de la liste de courses : titre, puis les articles à cocher. */
export default function ShoppingCategory({ group, isChecked, onToggle }: ShoppingCategoryProps) {
  return (
    <section className="break-inside-avoid mb-10">
      <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">{group.label}</h2>
      <ul className="divide-y divide-dashed divide-neutral-300 dark:divide-neutral-700">
        {group.items.map((item) => {
          const checked = isChecked(item);
          return (
            <li key={item.id}>
              <button
                onClick={() => onToggle(item)}
                className="w-full flex items-center gap-3 py-3 text-left cursor-pointer select-none print:py-1"
              >
                <span
                  className={`h-5 w-5 shrink-0 rounded-[4px] border-[1.5px] flex items-center justify-center transition-colors ${
                    checked
                      ? 'bg-text-light-main dark:bg-text-dark-main border-text-light-main dark:border-text-dark-main text-bg-light dark:text-bg-dark'
                      : 'border-neutral-400 dark:border-neutral-600'
                  }`}
                >
                  {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </span>
                <span
                  className={`text-[15px] transition-colors ${
                    checked ? 'line-through text-text-light-muted dark:text-text-dark-muted' : ''
                  }`}
                >
                  {item.phrase}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
