export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold cursor-pointer select-none transition-[transform,box-shadow,background-color] duration-150 disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<ButtonVariant, string> = {
  // Tampon : jaune, bordure encre, ombre pleine qui s'écrase au clic
  primary:
    'bg-brand text-ink border border-ink shadow-[2px_2px_0_var(--color-ink)] hover:bg-brand-hover active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_var(--color-ink)] dark:border-brand dark:shadow-none dark:active:translate-x-0 dark:active:translate-y-0 dark:active:brightness-90',
  secondary:
    'border border-neutral-300 dark:border-neutral-700 text-text-light-main dark:text-text-dark-main hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700',
  danger: 'bg-red-700 text-white hover:bg-red-800 active:bg-red-900',
  ghost:
    'text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main hover:bg-neutral-100 dark:hover:bg-neutral-800',
};

const sizes: Record<ButtonSize, string> = {
  md: 'px-5 py-3 text-sm rounded-input',
  sm: 'px-3.5 py-2 text-xs rounded-input',
};

/** Classes d'un bouton — utilisable aussi sur un `<Link>`. */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className = '',
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}
