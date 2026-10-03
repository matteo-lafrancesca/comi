'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { RepasWithIngredients } from '@/types';

interface RepasCardProps {
  repas: RepasWithIngredients;
  onClick: () => void;
  selectMode?: boolean;
}

/** Vignette d'une recette : photo en 4/5, titre en serif. Sans photo : initiale sur papier ligné. */
export default function RepasCard({ repas, onClick, selectMode = false }: RepasCardProps) {
  const { titre, photoUrl } = repas;
  const [imageError, setImageError] = useState(false);

  return (
    <button onClick={onClick} className="group text-left cursor-pointer flex flex-col gap-3">
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-card bg-neutral-100 dark:bg-neutral-800/60 transition-shadow duration-300 group-hover:shadow-lg">
        {photoUrl && !imageError ? (
          <Image
            src={photoUrl}
            alt={titre}
            onError={() => setImageError(true)}
            width={400}
            height={500}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-[repeating-linear-gradient(transparent,transparent_27px,var(--color-neutral-200)_27px,var(--color-neutral-200)_28px)] dark:bg-[repeating-linear-gradient(transparent,transparent_27px,var(--color-neutral-800)_27px,var(--color-neutral-800)_28px)]">
            <span className="font-display italic text-7xl text-neutral-400 dark:text-neutral-600 select-none">
              {titre.trim().charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {selectMode && (
          <span className="absolute bottom-0 inset-x-0 py-2.5 text-center text-xs font-semibold bg-brand text-ink">
            Choisir ce repas
          </span>
        )}
      </div>
      <h3 className="font-display text-lg leading-snug font-medium line-clamp-2 text-text-light-main dark:text-text-dark-main">
        {titre}
      </h3>
    </button>
  );
}
