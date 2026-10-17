import React from 'react';

interface TabsProps<T extends string> {
  tabs: { id: T; label: React.ReactNode }[];
  active: T;
  onChange: (tab: T) => void;
}

/** Onglets soulignés (trait jaune sous l'onglet actif). */
export default function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-neutral-200 dark:border-neutral-800">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            active === tab.id
              ? 'border-brand text-text-light-main dark:text-text-dark-main'
              : 'border-transparent text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
