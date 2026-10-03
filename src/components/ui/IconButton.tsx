import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Libellé accessible, affiché aussi en infobulle. */
  label: string;
  tone?: 'default' | 'danger';
}

/** Bouton carré à icône seule, à bordure fine. */
export default function IconButton({ label, tone = 'default', className = '', type = 'button', ...props }: IconButtonProps) {
  const toneClasses =
    tone === 'danger'
      ? 'text-red-700 dark:text-red-400 hover:bg-red-700 hover:text-white dark:hover:bg-red-700 dark:hover:text-white border-red-700/30'
      : 'text-text-light-main dark:text-text-dark-main hover:bg-neutral-100 dark:hover:bg-neutral-800 border-neutral-300 dark:border-neutral-700';
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={`p-2.5 border rounded-input transition-colors cursor-pointer disabled:opacity-50 ${toneClasses} ${className}`}
      {...props}
    />
  );
}
