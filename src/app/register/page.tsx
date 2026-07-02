'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

function RegisterContent() {
  const { user, register, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirection si déjà connecté
  const redirectUrl = searchParams.get('from') || '/';

  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirectUrl);
    }
  }, [user, authLoading, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation client
    if (!email.trim() || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register(email, password);
      if (!result.success) {
        setError(result.error || "Une erreur est survenue lors de l'inscription.");
      }
    } catch {
      setError('Une erreur réseau est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-bg-light dark:bg-bg-dark">
        <div className="flex flex-col items-center gap-3">
          <img src="/menumanage/100.png" alt="Logo ManageMenu" className="h-12 w-12 animate-bounce rounded-xl shadow-sm" />
          <span className="text-sm font-medium text-text-light-muted dark:text-text-dark-muted">
            Chargement de la session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex items-center justify-center p-4 bg-bg-light dark:bg-bg-dark transition-colors duration-300"
      style={{
        minHeight: '100dvh',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <main className="w-full max-w-md flex flex-col gap-8">
          {/* En-tête / Logo */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center justify-center h-16 w-16 overflow-hidden rounded-card bg-brand-light dark:bg-brand/10 shadow-sm border border-neutral-200/50 dark:border-neutral-800/40">
              <img src="/menumanage/100.png" alt="Logo" className="h-full w-full object-cover" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-text-light-main dark:text-text-dark-main">
              ManageMenu
            </h1>
            <p className="text-sm text-text-light-muted dark:text-text-dark-muted max-w-xs">
              Planifiez vos repas de la semaine et générez votre liste de courses en un clin d'œil.
            </p>
          </div>

          {/* Formulaire dans une carte Soft UI */}
          <div className="p-6 md:p-8 bg-card-light dark:bg-card-dark border border-neutral-200/50 dark:border-neutral-800/40 shadow-sm rounded-card transition-all duration-300">
            <h2 className="text-xl font-semibold mb-6 text-text-light-main dark:text-text-dark-main">
              Créer un compte
            </h2>

            {error && (
              <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/40 dark:border-red-800/30 text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label 
                  htmlFor="email" 
                  className="text-xs font-semibold uppercase tracking-wider text-text-light-muted dark:text-text-dark-muted px-2"
                >
                  Adresse e-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-text-light-muted dark:text-text-dark-muted">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="exemple@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-5 py-3 text-sm transition-all border outline-none bg-card-light dark:bg-card-dark border-neutral-200 dark:border-neutral-800 rounded-input focus:border-brand dark:focus:border-brand focus:ring-1 focus:ring-brand text-text-light-main dark:text-text-dark-main placeholder:text-text-light-muted/60 dark:placeholder:text-text-dark-muted/60"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="flex flex-col gap-1.5">
                <label 
                  htmlFor="password" 
                  className="text-xs font-semibold uppercase tracking-wider text-text-light-muted dark:text-text-dark-muted px-2"
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-text-light-muted dark:text-text-dark-muted">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-5 py-3 text-sm transition-all border outline-none bg-card-light dark:bg-card-dark border-neutral-200 dark:border-neutral-800 rounded-input focus:border-brand dark:focus:border-brand focus:ring-1 focus:ring-brand text-text-light-main dark:text-text-dark-main placeholder:text-text-light-muted/60 dark:placeholder:text-text-dark-muted/60"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Confirmer le mot de passe */}
              <div className="flex flex-col gap-1.5">
                <label 
                  htmlFor="confirmPassword" 
                  className="text-xs font-semibold uppercase tracking-wider text-text-light-muted dark:text-text-dark-muted px-2"
                >
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-text-light-muted dark:text-text-dark-muted">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirmer votre mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-5 py-3 text-sm transition-all border outline-none bg-card-light dark:bg-card-dark border-neutral-200 dark:border-neutral-800 rounded-input focus:border-brand dark:focus:border-brand focus:ring-1 focus:ring-brand text-text-light-main dark:text-text-dark-main placeholder:text-text-light-muted/60 dark:placeholder:text-text-dark-muted/60"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full flex items-center justify-center gap-2 py-3 px-5 text-sm font-semibold rounded-input bg-brand hover:bg-brand-hover text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-sm shadow-brand/20 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 cursor-pointer"
              >
                {isSubmitting ? 'Création en cours...' : 'Créer un compte'}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            {/* Lien de connexion */}
            <div className="mt-8 text-center text-sm">
              <span className="text-text-light-muted dark:text-text-dark-muted">
                Déjà un compte ?{' '}
              </span>
              <Link 
                href="/login" 
                className="font-semibold text-brand hover:text-brand-hover transition-colors inline-flex items-center gap-0.5"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh w-full items-center justify-center bg-bg-light dark:bg-bg-dark">
          <div className="flex flex-col items-center gap-3">
            <img src="/menumanage/100.png" alt="Logo ManageMenu" className="h-12 w-12 animate-bounce rounded-xl shadow-sm" />
            <span className="text-sm font-medium text-text-light-muted dark:text-text-dark-muted">
              Chargement de la page...
            </span>
          </div>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
