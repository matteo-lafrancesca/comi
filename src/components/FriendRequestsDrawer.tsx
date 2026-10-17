'use client';

import React, { useState } from 'react';
import { Check, Loader2, UserPlus } from 'lucide-react';
import type { FriendSummary } from '@/types';
import Drawer from '@/components/Drawer';
import Avatar from '@/components/Avatar';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import TextInput from '@/components/ui/TextInput';
import Tabs from '@/components/ui/Tabs';
import { errorMessage } from '@/lib/errors';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useFriendRequests, useUserSearch } from '@/lib/queries/queries';
import {
  useAcceptFriendRequestMutation,
  useDeleteFriendRequestMutation,
  useSendFriendRequestMutation,
} from '@/lib/queries/mutations';

export type FriendRequestsTab = 'search' | 'requests';

interface FriendRequestsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Onglet affiché à l'ouverture */
  initialTab: FriendRequestsTab;
}

/**
 * Ajout d'amis : recherche par pseudo (envoyer, accepter, annuler sur place) et demandes en attente
 * (reçues : accepter / refuser ; envoyées : annuler). Le contenu n'est monté que drawer ouvert :
 * son état repart de zéro à chaque ouverture.
 */
export default function FriendRequestsDrawer({ isOpen, onClose, initialTab }: FriendRequestsDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Ajouter un ami" maxWidth="sm:max-w-md" fullScreenMobile>
      <FriendRequestsPanel initialTab={initialTab} />
    </Drawer>
  );
}

function FriendRequestsPanel({ initialTab }: { initialTab: FriendRequestsTab }) {
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const search = useUserSearch(useDebouncedValue(query));
  const requests = useFriendRequests();
  const send = useSendFriendRequestMutation();
  const accept = useAcceptFriendRequestMutation();
  const remove = useDeleteFriendRequestMutation();
  const busy = send.isPending || accept.isPending || remove.isPending;

  const run = (action: () => Promise<unknown>) => async () => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err, 'Une erreur est survenue.'));
    }
  };

  const received = requests.data?.received ?? [];
  const sent = requests.data?.sent ?? [];
  const searching = query.trim().length >= 2;

  return (
    <div className="space-y-6">
      <Tabs
        tabs={[
          { id: 'search', label: 'Rechercher' },
          { id: 'requests', label: received.length ? `Demandes (${received.length})` : 'Demandes' },
        ]}
        active={tab}
        onChange={(next) => {
          setTab(next);
          setError(null);
        }}
      />

      {error && <Alert>{error}</Alert>}

      {tab === 'search' ? (
        <div className="space-y-4">
          <TextInput
            placeholder="Pseudo de votre ami"
            aria-label="Pseudo de votre ami"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {!searching ? (
            <Hint>Tapez au moins 2 lettres du pseudo.</Hint>
          ) : search.isPending ? (
            <Spinner />
          ) : search.error ? (
            <Alert>{errorMessage(search.error, 'Impossible de lancer la recherche.')}</Alert>
          ) : search.data.length === 0 ? (
            <Hint>Personne ne porte ce pseudo.</Hint>
          ) : (
            <UserList>
              {search.data.map((user) => (
                <UserRow key={user.id} user={user}>
                  {user.relation === 'none' && (
                    <Button size="sm" onClick={run(() => send.mutateAsync(user.id))} disabled={busy}>
                      <UserPlus className="h-4 w-4" />
                      Ajouter
                    </Button>
                  )}
                  {user.relation === 'received' && user.requestId !== null && (
                    <Button size="sm" onClick={run(() => accept.mutateAsync(user.requestId!))} disabled={busy}>
                      Accepter
                    </Button>
                  )}
                  {user.relation === 'sent' && user.requestId !== null && (
                    <Button size="sm" variant="ghost" onClick={run(() => remove.mutateAsync(user.requestId!))} disabled={busy}>
                      Annuler la demande
                    </Button>
                  )}
                  {user.relation === 'friend' && (
                    <span className="flex items-center gap-1 text-sm text-text-light-muted dark:text-text-dark-muted">
                      <Check className="h-4 w-4" />
                      Ami
                    </span>
                  )}
                </UserRow>
              ))}
            </UserList>
          )}
        </div>
      ) : requests.isPending ? (
        <Spinner />
      ) : requests.error ? (
        <Alert>{errorMessage(requests.error, 'Impossible de charger les demandes.')}</Alert>
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">Reçues</h3>
            {received.length === 0 ? (
              <Hint className="mt-3">Aucune demande reçue.</Hint>
            ) : (
              <UserList>
                {received.map((request) => (
                  <UserRow key={request.id} user={request.user}>
                    <Button size="sm" onClick={run(() => accept.mutateAsync(request.id))} disabled={busy}>
                      Accepter
                    </Button>
                    <Button size="sm" variant="ghost" onClick={run(() => remove.mutateAsync(request.id))} disabled={busy}>
                      Refuser
                    </Button>
                  </UserRow>
                ))}
              </UserList>
            )}
          </section>

          <section>
            <h3 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">Envoyées</h3>
            {sent.length === 0 ? (
              <Hint className="mt-3">Aucune demande en attente.</Hint>
            ) : (
              <UserList>
                {sent.map((request) => (
                  <UserRow key={request.id} user={request.user}>
                    <Button size="sm" variant="ghost" onClick={run(() => remove.mutateAsync(request.id))} disabled={busy}>
                      Annuler
                    </Button>
                  </UserRow>
                ))}
              </UserList>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function UserList({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-dashed divide-neutral-300 dark:divide-neutral-700">{children}</ul>;
}

/** Une personne (avatar + pseudo) et ses actions à droite. */
function UserRow({ user, children }: { user: FriendSummary; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar pseudo={user.pseudo} photoUrl={user.photoUrl} size={40} />
      <span className="flex-1 min-w-0 truncate font-display text-lg">{user.pseudo}</span>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </li>
  );
}

function Hint({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-text-light-muted dark:text-text-dark-muted ${className}`}>{children}</p>;
}

function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <Loader2 className="h-5 w-5 animate-spin text-text-light-muted dark:text-text-dark-muted" />
    </div>
  );
}
