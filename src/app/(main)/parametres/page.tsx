'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Database, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { FRENCH_DAYS } from '@/lib/date-utils';
import PageHeader from '@/components/PageHeader';
import ProfileForm from '@/components/ProfileForm';
import Button from '@/components/ui/Button';
import { buttonStyles } from '@/components/ui/button-styles';
import { adminUrl } from '@/lib/routes';
import Alert from '@/components/ui/Alert';
import { errorMessage } from '@/lib/errors';

/** Choix exclusif sous forme de cases accolées. */
function choiceClasses(selected: boolean) {
  return `flex-1 py-2.5 text-sm cursor-pointer transition-colors ${
    selected
      ? 'bg-text-light-main text-bg-light dark:bg-text-dark-main dark:text-bg-dark font-semibold'
      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
  }`;
}

export default function ParametresPage() {
  const { user, logout } = useAuth();
  const { weekStartDay, setWeekStartDay, theme, toggleTheme } = useSettings();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWeekStartDay = async (day: number) => {
    setSaving(true);
    setError(null);
    try {
      await setWeekStartDay(day);
    } catch (err) {
      setError(errorMessage(err, 'Une erreur est survenue.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg">
      <PageHeader title="Réglages" />

      <div className="space-y-10">
        {user?.pseudo && (
          <section>
            <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">Profil</h2>
            {/* Remonté après chaque enregistrement : repart des valeurs sauvegardées */}
            <ProfileForm
              key={`${user.pseudo}|${user.photoUrl}`}
              initialPseudo={user.pseudo}
              initialPhotoUrl={user.photoUrl}
            />
          </section>
        )}

        <section>
          <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">Apparence</h2>
          <div className="mt-4 flex border border-text-light-main dark:border-text-dark-main rounded-input overflow-hidden divide-x divide-text-light-main dark:divide-text-dark-main">
            <button id="settings-toggle-theme" onClick={() => theme !== 'light' && toggleTheme()} className={choiceClasses(theme === 'light')}>
              Clair
            </button>
            <button onClick={() => theme !== 'dark' && toggleTheme()} className={choiceClasses(theme === 'dark')}>
              Sombre
            </button>
          </div>
        </section>

        <section>
          <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">La semaine commence le</h2>
          <div className="mt-4 grid grid-cols-7 border border-text-light-main dark:border-text-dark-main rounded-input overflow-hidden divide-x divide-text-light-main dark:divide-text-dark-main">
            {FRENCH_DAYS.map((label, idx) => (
              <button
                key={idx}
                id={`settings-weekday-${idx}`}
                onClick={() => handleWeekStartDay(idx)}
                disabled={saving}
                aria-label={label}
                aria-pressed={idx === weekStartDay}
                className={choiceClasses(idx === weekStartDay)}
              >
                {label.slice(0, 3)}
              </button>
            ))}
          </div>
          {error && (
            <div className="mt-3">
              <Alert>{error}</Alert>
            </div>
          )}
        </section>

        {user?.isAdmin && (
          <section>
            <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">Administration</h2>
            <Link id="settings-admin" href={adminUrl()} className={buttonStyles({ variant: 'secondary', className: 'mt-4' })}>
              <Database className="h-4 w-4" />
              Base de données
            </Link>
          </section>
        )}

        <section>
          <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">Compte</h2>
          <Button id="settings-logout" variant="secondary" onClick={logout} className="mt-4">
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </section>
      </div>
    </div>
  );
}
