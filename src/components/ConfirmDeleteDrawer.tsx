'use client';

import React from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import Drawer from '@/components/Drawer';

interface ConfirmDeleteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Main message body, shown before the highlighted name */
  message?: string;
  /** The name/label to highlight in bold brand color */
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
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-md"
      title={
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-extrabold text-lg">{title}</span>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-text-light-main dark:text-text-dark-main font-medium leading-relaxed">
          {message}{highlightedName ? (
            <>
              {' '}
              <span className="font-extrabold">"{highlightedName}"</span>
            </>
          ) : null} ?
          {warningText && (
            <span className="text-text-light-muted dark:text-text-dark-muted text-xs mt-1 block">
              {warningText}
            </span>
          )}
        </p>

        {error && (
          <div className="p-3 text-xs font-semibold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/40">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/20">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 text-sm font-bold border border-neutral-200 dark:border-neutral-800 rounded-input hover:bg-neutral-50 dark:hover:bg-neutral-800 text-text-light-main dark:text-text-dark-main active:scale-95 transition-all cursor-pointer text-center disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-extrabold bg-red-600 hover:bg-red-700 text-white rounded-input active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-60 disabled:pointer-events-none"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Suppression...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
