import React from 'react';
import Link from 'next/link';
import type { FriendCard as FriendCardData } from '@/types';
import { friendUrl } from '@/lib/routes';
import Avatar from '@/components/Avatar';
import RepasThumbnail from '@/components/RepasThumbnail';

interface FriendCardProps {
  friend: FriendCardData;
}

/** Carte de profil d'un ami : avatar, pseudo et sa vitrine (3 dernières recettes publiques). Mène à son profil. */
export default function FriendCard({ friend }: FriendCardProps) {
  const { id, pseudo, photoUrl, vitrine } = friend;

  return (
    <Link href={friendUrl(id)} className="group block">
      <div className="flex items-center gap-3">
        <Avatar pseudo={pseudo} photoUrl={photoUrl} size={48} />
        <span className="min-w-0 truncate font-display text-2xl leading-tight group-hover:underline decoration-brand decoration-2 underline-offset-4">
          {pseudo}
        </span>
      </div>

      {vitrine.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {vitrine.map((repas) => (
            <div key={repas.id} className="relative aspect-[4/5] overflow-hidden rounded-input bg-neutral-100 dark:bg-neutral-800/60">
              <RepasThumbnail titre={repas.titre} photoUrl={repas.photoUrl} sizes="(max-width: 768px) 30vw, 140px" initialClassName="text-3xl" />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm italic text-text-light-muted dark:text-text-dark-muted">Aucune recette partagée pour l’instant.</p>
      )}
    </Link>
  );
}
