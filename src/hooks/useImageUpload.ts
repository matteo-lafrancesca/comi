'use client';

import { useEffect, useRef, useState } from 'react';
import { useUploadThing } from '@/lib/uploadthing';
import { compressImage } from '@/lib/image-compression';

interface UseImageUploadOptions {
  /** Photo déjà enregistrée (modification d'un repas, profil) */
  initialUrl?: string | null;
  /** Reçoit les erreurs de sélection / d'envoi (null pour les effacer) */
  onError: (message: string | null) => void;
}

/**
 * Photo (repas, profil) : sélection (clic ou glisser-déposer), aperçu local et envoi différé
 * vers Uploadthing au moment de l'enregistrement.
 */
export function useImageUpload({ initialUrl = null, onError }: UseImageUploadOptions) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialUrl);
  const [file, setFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { startUpload, isUploading } = useUploadThing('imageUploader', {
    onUploadError: (err) => onError(`Erreur lors de l'envoi de l'image: ${err.message}`),
  });

  // Libère l'URL objet quand elle est remplacée ou au démontage
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const pick = (selected: File) => {
    onError(null);
    setFile(selected);
    setLocalPreviewUrl(URL.createObjectURL(selected));
  };

  const remove = () => {
    setFile(null);
    setPhotoUrl(null);
    setLocalPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  /**
   * Compresse et téléverse la photo choisie ; renvoie l'URL finale (celle d'origine si rien n'a changé).
   * Lève une erreur si l'envoi échoue.
   */
  const uploadIfNeeded = async (): Promise<string | null> => {
    if (!file) return photoUrl;
    const uploaded = await startUpload([await compressImage(file)]);
    const url = uploaded?.[0]?.url;
    if (!url) throw new Error("Le stockage n'a pas pu renvoyer d'adresse URL.");
    return url;
  };

  /** Props prêtes pour `ImageDropzone` (l'appelant ajoute `busy` / `busyLabel`). */
  const dropzoneProps = {
    previewUrl: localPreviewUrl ?? photoUrl,
    isDragging,
    inputRef,
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) pick(selected);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: () => setIsDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped?.type.startsWith('image/')) pick(dropped);
      else onError("Seuls les fichiers d'image sont acceptés.");
    },
    onRemove: remove,
  };

  return {
    /** Fichier choisi, pas encore envoyé */
    file,
    isUploading,
    /** Une photo (déjà enregistrée ou à envoyer) est présente */
    hasPhoto: Boolean(file || photoUrl),
    uploadIfNeeded,
    dropzoneProps,
  };
}
