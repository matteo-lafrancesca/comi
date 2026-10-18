import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface BackHeaderProps {
  title: string;
  /** Petite ligne au-dessus du titre */
  eyebrow?: string;
  /** Lien de retour (navigation). Ignoré si `onBack` est fourni. */
  backHref?: string;
  /** Retour géré par la page (ex: changer d'étape) */
  onBack?: () => void;
  /** Visuel à gauche du titre (ex. avatar d'un ami) */
  media?: React.ReactNode;
  /** Ligne sous le titre (ex. nombre de recettes) */
  subtitle?: React.ReactNode;
}

/** En-tête des pages secondaires : flèche de retour, repère, titre en serif. */
export default function BackHeader({ title, eyebrow, backHref = '/repas', onBack, media, subtitle }: BackHeaderProps) {
  const arrowClasses =
    'p-2 -ml-2 text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main transition-colors cursor-pointer';

  return (
    <div className="mb-8">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Retour" className={arrowClasses}>
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <Link href={backHref} aria-label="Retour" className={`inline-block ${arrowClasses}`}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}
      <div className={media ? 'mt-3 flex items-center gap-5' : undefined}>
        {media}
        <div className="min-w-0">
          {eyebrow && <span className="eyebrow block mt-3">{eyebrow}</span>}
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-tight mt-1 break-words">{title}</h1>
          {subtitle && <p className="eyebrow mt-2 text-text-light-muted dark:text-text-dark-muted">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
