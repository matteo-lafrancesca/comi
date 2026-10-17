'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import TextInput from '@/components/ui/TextInput';
import { useSettings } from '@/contexts/SettingsContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { errorMessage } from '@/lib/errors';

interface ProfileFormProps {
  /** Valeurs enregistrées ; le parent remonte le formulaire (`key`) quand elles changent. */
  initialPseudo: string;
  initialPhotoUrl: string | null;
}

/** Pseudo et photo de profil (réglages). La photo n'est envoyée qu'à l'enregistrement. */
export default function ProfileForm({ initialPseudo, initialPhotoUrl }: ProfileFormProps) {
  const { updateProfile } = useSettings();
  const [pseudo, setPseudo] = useState(initialPseudo);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const photo = useImageUpload({ initialUrl: initialPhotoUrl, onError: setError });
  const { previewUrl, inputRef, onFileChange, onRemove } = photo.dropzoneProps;

  const photoChanged = previewUrl !== initialPhotoUrl;
  const dirty = pseudo.trim() !== initialPseudo || photoChanged;
  const busy = saving || photo.isUploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const photoUrl = photoChanged ? await photo.uploadIfNeeded() : undefined;
      await updateProfile({ pseudo, ...(photoUrl !== undefined && { photoUrl }) });
    } catch (err) {
      setError(errorMessage(err, 'Une erreur est survenue.'));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-6">
      {error && <Alert>{error}</Alert>}

      <div className="flex items-center gap-4">
        <Avatar pseudo={pseudo} photoUrl={previewUrl} size={72} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
            {previewUrl ? 'Changer la photo' : 'Ajouter une photo'}
          </Button>
          {previewUrl && (
            <Button size="sm" variant="ghost" onClick={onRemove} disabled={busy}>
              Retirer
            </Button>
          )}
        </div>
        <input type="file" ref={inputRef} onChange={onFileChange} accept="image/*" className="hidden" disabled={busy} />
      </div>

      <TextInput
        label="Pseudo"
        autoComplete="nickname"
        maxLength={30}
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
        disabled={busy}
        required
      />

      <Button type="submit" disabled={busy || !dirty || !pseudo.trim()} className="self-start">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
