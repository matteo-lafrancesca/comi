import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  /** Nom d'affichage : fournit l'initiale quand il n'y a pas de photo */
  pseudo: string | null;
  /** Photo enregistrée (URL distante) ou aperçu local (`blob:`) */
  photoUrl: string | null;
  /** Côté en pixels */
  size?: number;
  className?: string;
}

/** Photo de profil carrée ; sans photo, initiale en serif italique (comme les repas sans photo). */
export default function Avatar({ pseudo, photoUrl, size = 40, className = '' }: AvatarProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-input bg-neutral-100 dark:bg-neutral-800 ${className}`}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        photoUrl.startsWith('blob:') ? (
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Image src={photoUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
        )
      ) : (
        <span
          className="font-display italic leading-none text-neutral-500 dark:text-neutral-400 select-none"
          style={{ fontSize: size * 0.45 }}
        >
          {pseudo?.trim().charAt(0).toUpperCase() || '?'}
        </span>
      )}
    </span>
  );
}
