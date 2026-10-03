import React from 'react';

interface AuthShellProps {
  title: string;
  /** Ligne sous le formulaire (lien vers l'autre écran d'authentification) */
  footer: React.ReactNode;
  children: React.ReactNode;
}

/** Cadre commun des écrans de connexion / inscription. */
export default function AuthShell({ title, footer, children }: AuthShellProps) {
  return (
    <div
      className="w-full flex items-center justify-center px-6 bg-bg-light dark:bg-bg-dark"
      style={{
        minHeight: '100dvh',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <main className="w-full max-w-sm py-10">
        <div className="flex items-center gap-3 mb-12">
          <img src="/comi/clear/windows/StoreLogo.scale-200.png" alt="" className="h-10 w-10" />
          <span className="font-display italic font-semibold text-4xl tracking-tight">Comi</span>
        </div>

        <h1 className="font-display text-3xl font-semibold mb-8">
          {title}
        </h1>

        {children}

        <p className="mt-10 text-sm text-text-light-muted dark:text-text-dark-muted">{footer}</p>
      </main>
    </div>
  );
}

/** Écran d'attente pendant la vérification de session. */
export function AuthLoading() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-bg-light dark:bg-bg-dark">
      <img src="/comi/clear/windows/StoreLogo.scale-200.png" alt="Comi" className="h-12 w-12 animate-pulse" />
    </div>
  );
}
