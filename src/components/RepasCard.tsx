'use client';

import React from 'react';
import { RepasWithIngredients } from '@/types';
import RepasThumbnail from '@/components/RepasThumbnail';

interface RepasCardProps {
  repas: RepasWithIngredients;
  onClick: () => void;
  selectMode?: boolean;
  /** Masque « de pseudo » (ex. sur le profil de l'auteur, où c'est redondant) */
  hideOwner?: boolean;
}

/**
 * Vignette d'une recette : photo en 4/5, titre en serif. Sans photo : initiale sur papier ligné.
 * Recette d'un ami : son pseudo sous le titre.
 */
export default function RepasCard({ repas, onClick, selectMode = false, hideOwner = false }: RepasCardProps) {
  const { titre, photoUrl, owner } = repas;

  return (
    <button onClick={onClick} className="group text-left cursor-pointer flex flex-col gap-3">
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-card bg-neutral-100 dark:bg-neutral-800/60 transition-shadow duration-300 group-hover:shadow-lg">
        <RepasThumbnail
          titre={titre}
          photoUrl={photoUrl}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
          imageClassName="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {selectMode && (
          <span className="absolute bottom-0 inset-x-0 py-2.5 text-center text-xs font-semibold bg-brand text-ink">
            Choisir ce repas
          </span>
        )}
      </div>
      <div>
        <h3 className="font-display text-lg leading-snug font-medium line-clamp-2 text-text-light-main dark:text-text-dark-main">
          {titre}
        </h3>
        {owner && !hideOwner && (
          <p className="mt-0.5 text-xs text-text-light-muted dark:text-text-dark-muted truncate">
            de <span className="font-display italic text-sm">{owner.pseudo}</span>
          </p>
        )}
      </div>
    </button>
  );
}
