'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, UserMinus } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { sharedRecipesLabel } from '@/lib/string-utils';
import { useFriendProfile } from '@/lib/queries/queries';
import { useRemoveFriendMutation } from '@/lib/queries/mutations';
import BackHeader from '@/components/BackHeader';
import Avatar from '@/components/Avatar';
import RepasCard from '@/components/RepasCard';
import RepasDetailModal from '@/components/RepasDetailModal';
import ConfirmDeleteDrawer from '@/components/ConfirmDeleteDrawer';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { buttonStyles } from '@/components/ui/button-styles';

/** Profil d'un ami : ses recettes publiques (à ajouter à mon carnet) et le retrait de l'ami. */
export default function FriendProfilePage() {
  const params = useParams<{ id: string }>();
  const friendId = params.id;
  const router = useRouter();
  const { data: profile, isPending, error, refetch } = useFriendProfile(friendId);
  const removeMutation = useRemoveFriendMutation();

  /** Gardé à la fermeture de la fiche : elle reste en mode aperçu pendant son animation. */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // La fiche lit le repas dans le profil : `savedByMe` suit la requête après un ajout / retrait.
  const selected = profile?.repas.find((r) => r.id === selectedId) ?? null;

  const handleRemove = async () => {
    setRemoveError(null);
    try {
      await removeMutation.mutateAsync(friendId);
      router.replace('/amis');
    } catch (err) {
      setRemoveError(errorMessage(err, 'Une erreur est survenue.'));
    }
  };

  if (isPending) {
    return (
      <div>
        <BackHeader title="Profil" backHref="/amis" />
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-text-light-muted dark:text-text-dark-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    // 403 : plus amis ; 404 : identifiant inconnu (lien périmé ou modifié à la main)
    const notFriends = error instanceof ApiError && (error.status === 403 || error.status === 404);
    return (
      <div className="max-w-lg">
        <BackHeader title="Profil" backHref="/amis" />
        <div className="space-y-4">
          <Alert>
            {notFriends
              ? 'Vous ne faites pas (ou plus) partie de ses amis : son profil n’est pas visible.'
              : errorMessage(error, 'Impossible de charger ce profil.')}
          </Alert>
          {notFriends ? (
            <Link href="/amis" className={buttonStyles({ size: 'sm', variant: 'secondary' })}>
              Retour à mes amis
            </Link>
          ) : (
            <button onClick={() => refetch()} className={buttonStyles({ size: 'sm', variant: 'secondary' })}>
              Réessayer
            </button>
          )}
        </div>
      </div>
    );
  }

  const { pseudo, photoUrl, repas } = profile;

  return (
    <div>
      <BackHeader title={pseudo} backHref="/amis" />

      <div className="flex items-center gap-4">
        <Avatar pseudo={pseudo} photoUrl={photoUrl} size={88} />
        <p className="eyebrow text-text-light-muted dark:text-text-dark-muted">
          {sharedRecipesLabel(repas.length)}
        </p>
      </div>

      {repas.length === 0 ? (
        <p className="py-16 max-w-sm font-display text-2xl leading-snug">{pseudo} n’a pas encore partagé de recette.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 mt-10 animate-fade-in">
          {repas.map((r) => (
            <RepasCard
              key={r.id}
              repas={r}
              hideOwner
              onClick={() => {
                setSelectedId(r.id);
                setIsDetailOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-16 pt-6 border-t border-neutral-200 dark:border-neutral-800">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            setRemoveError(null);
            setRemoveOpen(true);
          }}
        >
          <UserMinus className="h-4 w-4" />
          Retirer cet ami
        </Button>
      </div>

      <RepasDetailModal
        repas={selected}
        savedByMe={selected?.savedByMe}
        isOpen={isDetailOpen && selected !== null}
        onClose={() => setIsDetailOpen(false)}
      />

      <ConfirmDeleteDrawer
        isOpen={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Retirer cet ami"
        message="Retirer"
        highlightedName={pseudo}
        warningText="Ses recettes quitteront votre carnet et votre planning, et les vôtres quitteront les siens."
        confirmLabel="Retirer"
        pendingLabel="Retrait…"
        onConfirm={handleRemove}
        isDeleting={removeMutation.isPending}
        error={removeError}
      />
    </div>
  );
}
