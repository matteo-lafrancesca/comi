import React from 'react';

interface PageHeaderProps {
  title: string;
  /** Action principale de la page (bouton / lien), alignée à droite. */
  action?: React.ReactNode;
}

/** Titre de page : serif, surligné. */
export default function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8">
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-none">
        <span className="marker">{title}</span>
      </h1>
      {action}
    </div>
  );
}
