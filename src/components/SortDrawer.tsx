'use client';

import React from 'react';
import { Check } from 'lucide-react';
import Drawer from '@/components/Drawer';

interface SortOption {
  value: string;
  label: string;
  description: string;
}

interface SortDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSort: string;
  onSortChange: (sort: string) => void;
}

const sortOptions: SortOption[] = [
  {
    value: 'date_creation',
    label: 'Ajouté récemment',
    description: 'Voir les recettes les plus récentes en premier',
  },
  {
    value: 'alphabetique',
    label: 'Ordre alphabétique',
    description: 'Trier de A à Z par titre de recette',
  },
  {
    value: 'rarete',
    label: 'Rare (Moins programmé)',
    description: 'Proposer les repas non cuisinés depuis longtemps',
  },
];

export default function SortDrawer({ isOpen, onClose, currentSort, onSortChange }: SortDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Trier les repas"
      maxWidth="sm:max-w-md"
      height="h-auto"
    >
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 -my-2">
        {sortOptions.map((option) => {
          const isSelected = option.value === currentSort;
          return (
            <li key={option.value}>
              <button
                onClick={() => {
                  onSortChange(option.value);
                  onClose();
                }}
                className="w-full flex items-center gap-4 py-4 text-left cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <span className="block font-display text-lg">
                    <span className={isSelected ? 'font-bold' : ''}>{option.label}</span>
                  </span>
                  <span className="block text-xs mt-1 text-text-light-muted dark:text-text-dark-muted">
                    {option.description}
                  </span>
                </div>
                {isSelected && <Check className="h-5 w-5 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Drawer>
  );
}
