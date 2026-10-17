'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface RepasThumbnailProps {
  titre: string;
  photoUrl: string | null;
  /** Attribut `sizes` de next/image (largeur affichée) */
  sizes: string;
  /** Taille de l'initiale quand il n'y a pas de photo */
  initialClassName?: string;
  /** Classes de l'image (ex. zoom au survol) */
  imageClassName?: string;
}

/**
 * Visuel d'une recette, qui remplit son conteneur (à positionner en `relative`) : la photo, ou à défaut
 * (absente ou en erreur) l'initiale en serif italique sur papier ligné.
 */
export default function RepasThumbnail({
  titre,
  photoUrl,
  sizes,
  initialClassName = 'text-7xl',
  imageClassName = '',
}: RepasThumbnailProps) {
  const [imageError, setImageError] = useState(false);

  if (photoUrl && !imageError) {
    return (
      <Image
        src={photoUrl}
        alt={titre}
        fill
        sizes={sizes}
        onError={() => setImageError(true)}
        className={`object-cover ${imageClassName}`}
      />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[repeating-linear-gradient(transparent,transparent_27px,var(--color-neutral-200)_27px,var(--color-neutral-200)_28px)] dark:bg-[repeating-linear-gradient(transparent,transparent_27px,var(--color-neutral-800)_27px,var(--color-neutral-800)_28px)]">
      <span className={`font-display italic text-neutral-400 dark:text-neutral-600 select-none ${initialClassName}`}>
        {titre.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
