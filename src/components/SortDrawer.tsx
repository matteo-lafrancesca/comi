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
    >
      <div className="space-y-2.5">
        {sortOptions.map((option) => {
          const isSelected = option.value === currentSort;
          return (
            <button
              key={option.value}
              onClick={() => {
                onSortChange(option.value);
                onClose();
              }}
              className={`w-full flex items-start gap-4 p-4 rounded-card text-left transition-all duration-300 border cursor-pointer ${
                isSelected
                  ? 'bg-brand text-white border-brand shadow-xs hover:bg-brand-hover'
                  : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/20 dark:hover:bg-neutral-800 border-neutral-100/50 dark:border-neutral-800/20 hover:scale-[1.01]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className={`block text-sm font-bold truncate ${
                  isSelected ? 'text-white' : 'text-text-light-main dark:text-text-dark-main'
                }`}>
                  {option.label}
                </span>
                <span className={`block text-xs font-semibold mt-1 leading-normal ${
                  isSelected ? 'text-white/85' : 'text-text-light-muted dark:text-text-dark-muted'
                }`}>
                  {option.description}
                </span>
              </div>
              {isSelected && (
                <div className="shrink-0 h-5 w-5 bg-white/20 text-white rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Drawer>
  );
}
