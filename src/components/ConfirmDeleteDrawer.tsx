'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import Drawer from '@/components/Drawer';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

interface ConfirmDeleteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Main message body, shown before the highlighted name */
  message?: string;
  /** The name/label to highlight */
  highlightedName?: string;
  /** Optional secondary warning text shown below the main message */
  warningText?: string;
  /** Called when the user confirms deletion */
  onConfirm: () => void;
  isDeleting?: boolean;
  error?: string | null;
  /** Custom drawer title. Defaults to "Supprimer" */
  title?: string;
  /** Label for the confirm button. Defaults to "Supprimer définitivement" */
  confirmLabel?: string;
}

/** Confirmation de suppression — à utiliser pour toute suppression (jamais de modale inline). */
export default function ConfirmDeleteDrawer({
  isOpen,
  onClose,
  message = 'Voulez-vous vraiment supprimer',
  highlightedName,
  warningText,
  onConfirm,
  isDeleting = false,
  error,
  title = 'Supprimer',
  confirmLabel = 'Supprimer définitivement',
}: ConfirmDeleteDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} maxWidth="sm:max-w-md" height="h-auto" title={title}>
      <div className="space-y-6">
        <div>
          <p className="text-[15px] leading-relaxed">
            {message}
            {highlightedName ? (
              <>
                {' '}
                <strong className="font-display text-lg">&laquo;&nbsp;{highlightedName}&nbsp;&raquo;</strong>
              </>
            ) : null}{' '}
            ?
          </p>
          {warningText && <p className="mt-2 text-sm text-text-light-muted dark:text-text-dark-muted">{warningText}</p>}
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="flex items-center justify-end gap-3 pt-5 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Annuler
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isDeleting ? 'Suppression…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
