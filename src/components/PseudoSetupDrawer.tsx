'use client';

import React, { useState } from 'react';
import Drawer from '@/components/Drawer';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import TextInput from '@/components/ui/TextInput';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { errorMessage } from '@/lib/errors';

/**
 * Choix obligatoire du pseudo pour les comptes qui n'en ont pas encore (créés avant les amis).
 * Fermer le panneau sans le choisir déconnecte l'utilisateur.
 */
export default function PseudoSetupDrawer() {
  const { logout } = useAuth();
  const { updateProfile } = useSettings();
  const [pseudo, setPseudo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ pseudo });
    } catch (err) {
      setError(errorMessage(err, 'Une erreur est survenue.'));
      setSaving(false);
    }
  };

  return (
    <Drawer isOpen onClose={logout} title="Choisissez votre pseudo" maxWidth="sm:max-w-md" height="h-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <p className="text-sm text-text-light-muted dark:text-text-dark-muted">
          C’est le nom que verront vos amis. Vous pourrez le modifier dans les réglages.
        </p>
        {error && <Alert>{error}</Alert>}
        <TextInput
          label="Pseudo"
          autoComplete="nickname"
          autoFocus
          maxLength={30}
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          disabled={saving}
          required
        />
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="ghost" onClick={logout} disabled={saving}>
            Se déconnecter
          </Button>
          <Button type="submit" disabled={saving || !pseudo.trim()}>
            {saving ? 'Enregistrement…' : 'Valider'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
