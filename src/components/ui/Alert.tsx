import React from 'react';

interface AlertProps {
  tone?: 'error' | 'info';
  children: React.ReactNode;
}

/** Message d'erreur ou d'information : filet latéral, pas de pavé coloré. */
export default function Alert({ tone = 'error', children }: AlertProps) {
  const toneClasses =
    tone === 'error'
      ? 'border-red-700 text-red-800 dark:text-red-300 bg-red-700/5'
      : 'border-brand text-text-light-main dark:text-text-dark-main bg-brand-light dark:bg-brand/10';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`border-l-4 px-4 py-3 text-sm animate-fade-in ${toneClasses}`}>
      {children}
    </div>
  );
}
