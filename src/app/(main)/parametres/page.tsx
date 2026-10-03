'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
  Sun,
  Moon,
  LogOut,
  Calendar,
  Settings,
} from 'lucide-react';
import { FRENCH_DAYS } from '@/lib/date-utils';


export default function ParametresPage() {
  const { logout } = useAuth();
  const { weekStartDay, setWeekStartDay, theme, toggleTheme } = useSettings();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      {/* Titre */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-brand-light dark:bg-brand/10">
          <Settings className="h-5 w-5 text-brand" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text-light-main dark:text-text-dark-main">
          Paramètres
        </h1>
      </div>

      {/* ── Section Apparence ── */}
      <section className="bg-card-light dark:bg-card-dark rounded-card border border-neutral-200/40 dark:border-neutral-800/40 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800/40">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-light-muted dark:text-text-dark-muted">
            Apparence
          </h2>
        </div>

        <button
          id="settings-toggle-theme"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            {theme === 'light' ? (
              <Sun className="h-5 w-5 text-amber-500 shrink-0" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-400 shrink-0" />
            )}
            <span className="text-sm font-semibold text-text-light-main dark:text-text-dark-main">
              {theme === 'light' ? 'Mode Clair' : 'Mode Sombre'}
            </span>
          </div>
          {/* Toggle switch visuel */}
          <div
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
              theme === 'dark' ? 'bg-brand' : 'bg-neutral-200 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </button>
      </section>

      {/* ── Section Planning ── */}
      <section className="bg-card-light dark:bg-card-dark rounded-card border border-neutral-200/40 dark:border-neutral-800/40 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800/40">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-light-muted dark:text-text-dark-muted">
            Planning
          </h2>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-brand shrink-0" />
            <p className="text-sm font-semibold text-text-light-main dark:text-text-dark-main">
              Jour de début de semaine
            </p>
          </div>


          {/* Sélecteur 7 jours */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x hide-scrollbar">
            {FRENCH_DAYS.map((label, idx) => {
              const isSelected = idx === weekStartDay;
              const short = label.slice(0, 3);
              return (
                <button
                  key={idx}
                  id={`settings-weekday-${idx}`}
                  onClick={() => setWeekStartDay(idx)}
                  className={`flex-shrink-0 snap-start px-3.5 py-2 rounded-input text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-brand text-ink shadow-sm shadow-brand/25'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-text-light-muted dark:text-text-dark-muted hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {short}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section Compte ── */}
      <section className="bg-card-light dark:bg-card-dark rounded-card border border-neutral-200/40 dark:border-neutral-800/40 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800/40">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-light-muted dark:text-text-dark-muted">
            Compte
          </h2>
        </div>

        <button
          id="settings-logout"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-4 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer active:scale-[0.99]"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Se déconnecter</span>
        </button>
      </section>
    </div>
  );
}
