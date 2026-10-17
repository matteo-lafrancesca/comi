'use client';

import React, { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import FriendCard from '@/components/FriendCard';
import FriendRequestsDrawer, { type FriendRequestsTab } from '@/components/FriendRequestsDrawer';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { buttonStyles } from '@/components/ui/button-styles';
import { errorMessage } from '@/lib/errors';
import { useFriendRequests, useFriends } from '@/lib/queries/queries';

export default function AmisPage() {
  const { data: friends, isPending, error, refetch } = useFriends();
  const { data: requests } = useFriendRequests();
  const [drawerTab, setDrawerTab] = useState<FriendRequestsTab | null>(null);
  const received = requests?.received.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Amis"
        action={
          <Button size="sm" onClick={() => setDrawerTab(received ? 'requests' : 'search')}>
            <UserPlus className="h-4 w-4" />
            {received ? `Demandes (${received})` : 'Ajouter'}
          </Button>
        }
      />

      {isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-text-light-muted dark:text-text-dark-muted" />
        </div>
      ) : error ? (
        <div className="max-w-lg space-y-4">
          <Alert>{errorMessage(error, 'Impossible de charger vos amis.')}</Alert>
          <button onClick={() => refetch()} className={buttonStyles({ size: 'sm', variant: 'secondary' })}>
            Réessayer
          </button>
        </div>
      ) : friends.length === 0 ? (
        <div className="py-20 max-w-sm">
          <p className="font-display text-2xl leading-snug">Vous n’avez pas encore d’amis ici.</p>
          <p className="mt-2 text-sm text-text-light-muted dark:text-text-dark-muted">
            Retrouvez-les par leur pseudo avec le bouton « Ajouter ».
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
          {friends.map((friend) => (
            <FriendCard key={friend.id} friend={friend} />
          ))}
        </div>
      )}

      <FriendRequestsDrawer
        isOpen={drawerTab !== null}
        initialTab={drawerTab ?? 'search'}
        onClose={() => setDrawerTab(null)}
      />
    </div>
  );
}
