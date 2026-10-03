'use client';

import React from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

interface ImageDropzoneProps {
  /** URL (locale ou distante) de l'image choisie, ou null */
  previewUrl: string | null;
  /** Téléversement / analyse en cours : bloque les interactions */
  busy?: boolean;
  /** Texte affiché pendant que `busy` est vrai */
  busyLabel?: string;
  isDragging: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemove: () => void;
}

/** Zone de dépôt / aperçu d'une photo, partagée par la création manuelle et l'import IA. */
export default function ImageDropzone({
  previewUrl,
  busy = false,
  busyLabel = 'Envoi en cours…',
  isDragging,
  inputRef,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
}: ImageDropzoneProps) {
  return (
    <div>
      {previewUrl ? (
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-card bg-neutral-100 dark:bg-neutral-800">
          <img src={previewUrl} alt="Aperçu" className="w-full h-full object-cover" />
          {busy ? (
            <div className="absolute inset-0 bg-ink/65 flex items-center justify-center gap-3 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">{busyLabel}</span>
            </div>
          ) : (
            <div className="absolute bottom-3 right-3 flex gap-2">
              <Button size="sm" variant="secondary" className="bg-card-light dark:bg-card-dark" onClick={() => inputRef.current?.click()}>
                Changer
              </Button>
              <Button size="sm" variant="secondary" className="bg-card-light dark:bg-card-dark" onClick={onRemove}>
                Retirer
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !busy && inputRef.current?.click()}
          className={`w-full min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-card border border-dashed text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-text-light-main dark:border-text-dark-main bg-brand-light dark:bg-brand/10'
              : 'border-neutral-400 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
          }`}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-6 w-6 text-text-light-muted dark:text-text-dark-muted" strokeWidth={1.5} />
          )}
          <span className="font-display text-lg">{busy ? busyLabel : 'Ajouter une photo'}</span>
          {!busy && (
            <span className="text-xs text-text-light-muted dark:text-text-dark-muted">
              Touchez pour choisir, ou glissez un fichier ici
            </span>
          )}
        </button>
      )}
      <input type="file" ref={inputRef} onChange={onFileChange} accept="image/*" className="hidden" disabled={busy} />
    </div>
  );
}
