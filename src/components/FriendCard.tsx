import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { FriendCard as FriendCardData } from '@/types';
import { friendUrl } from '@/lib/routes';
import { sharedRecipesLabel } from '@/lib/string-utils';
import Avatar from '@/components/Avatar';
import RepasThumbnail from '@/components/RepasThumbnail';

interface FriendCardProps {
  friend: FriendCardData;
}

/**
 * Un ami dans la liste : avatar, pseudo, nombre de recettes partagées, puis sa vitrine (3 dernières
 * recettes publiques, titrées). Le bloc entier mène à son profil.
 */
export default function FriendCard({ friend }: FriendCardProps) {
  const { id, pseudo, photoUrl, vitrine, recipeCount } = friend;

  return (
    <Link href={friendUrl(id)} className="group block py-7">
      <div className="flex items-center gap-4">
        <Avatar pseudo={pseudo} photoUrl={photoUrl} size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-2xl leading-tight decoration-brand decoration-2 underline-offset-4 group-hover:underline">
            {pseudo}
          </h2>
          <p className="eyebrow mt-1 text-text-light-muted dark:text-text-dark-muted">{sharedRecipesLabel(recipeCount)}</p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-text-light-muted dark:text-text-dark-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-text-light-main dark:group-hover:text-text-dark-main" />
      </div>

      {vitrine.length > 0 && (
        <ul className="mt-5 grid grid-cols-3 gap-3">
          {vitrine.map((repas) => (
            <li key={repas.id} className="min-w-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-input bg-neutral-100 dark:bg-neutral-800/60">
                <RepasThumbnail
                  titre={repas.titre}
                  photoUrl={repas.photoUrl}
                  sizes="(max-width: 768px) 30vw, 160px"
                  initialClassName="text-4xl"
                />
              </div>
              <p className="mt-2 font-display text-sm leading-snug line-clamp-2 text-text-light-main dark:text-text-dark-main">
                {repas.titre}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
