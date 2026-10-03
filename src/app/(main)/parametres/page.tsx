'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { FRENCH_DAYS } from '@/lib/date-utils';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/ui/Button';

/** Choix exclusif sous forme de cases accolées. */
function choiceClasses(selected: boolean) {
  return `flex-1 py-2.5 text-sm cursor-pointer transition-colors ${
    selected
      ? 'bg-text-light-main text-bg-light dark:bg-text-dark-main dark:text-bg-dark font-semibold'
      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
  }`;
}

export default function ParametresPage() {
  const { logout } = useAuth();
  const { weekStartDay, setWeekStartDay, theme, toggleTheme } = useSettings();

  return (
    <div className="max-w-lg">
      <PageHeader title="Réglages" />

      <div className="space-y-10">
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
                onClick={() => setWeekStartDay(idx)}
                aria-label={label}
                aria-pressed={idx === weekStartDay}
                className={choiceClasses(idx === weekStartDay)}
              >
                {label.slice(0, 3)}
              </button>
            ))}
          </div>
        </section>

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
