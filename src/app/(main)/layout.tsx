'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ShoppingBag,
  Settings,
  UtensilsCrossed
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      label: 'Repas',
      href: '/repas',
      icon: UtensilsCrossed,
    },
    {
      label: 'Planification',
      href: '/planification',
      icon: Calendar,
    },
    {
      label: 'Courses',
      href: '/courses',
      icon: ShoppingBag,
    },
  ];

  // Helper function to check active path
  const isActive = (href: string) => {
    if (href === '/planification' && pathname === '/') {
      return true;
    }
    return pathname.startsWith(href);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg-light dark:bg-bg-dark">
        <div className="flex flex-col items-center gap-3">
          <img src="/comi/clear/windows/StoreLogo.scale-200.png" alt="Logo Comi" className="h-12 w-12 animate-bounce rounded-xl shadow-sm" />
          <span className="text-sm font-medium text-text-light-muted dark:text-text-dark-muted animate-pulse">
            Chargement de votre espace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-bg-light dark:bg-bg-dark text-text-light-main dark:text-text-dark-main transition-colors duration-300"
    >

      {/* 💻 NAVIGATION DESKTOP : Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-card-light dark:bg-card-dark border-r border-neutral-200/50 dark:border-neutral-800/40 p-6 z-40 transition-all duration-300">
        {/* En-tête / Logo */}
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="flex items-center justify-center h-10 w-10 overflow-hidden">
            <img src="/comi/clear/windows/StoreLogo.scale-200.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight text-text-light-main dark:text-text-dark-main">
            Comi
          </span>
        </div>

        {/* Liens de navigation */}
        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-card text-sm font-semibold transition-all duration-300 cursor-pointer ${active
                    ? 'bg-brand text-white shadow-sm shadow-brand/20 scale-[1.02]'
                    : 'text-text-light-muted dark:text-text-dark-muted hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-text-light-main dark:hover:text-text-dark-main hover:translate-x-1'
                  }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-white' : 'text-text-light-muted dark:text-text-dark-muted'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Pied de page de la Sidebar */}
        <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-neutral-200/50 dark:border-neutral-800/40">
          {/* Email utilisateur */}
          {user && (
            <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800/30 rounded-card border border-neutral-200/30 dark:border-neutral-800/20">
              <span className="text-[10px] text-text-light-muted dark:text-text-dark-muted truncate block">
                {user.email}
              </span>
            </div>
          )}

          {/* Lien Paramètres */}
          <Link
            href="/parametres"
            className={`flex items-center gap-3 px-4 py-3 rounded-card text-sm font-semibold transition-all duration-300 cursor-pointer ${
              pathname.startsWith('/parametres')
                ? 'bg-brand text-white shadow-sm shadow-brand/20 scale-[1.02]'
                : 'text-text-light-muted dark:text-text-dark-muted hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-text-light-main dark:hover:text-text-dark-main hover:translate-x-1'
            }`}
          >
            <Settings className={`h-5 w-5 shrink-0 ${pathname.startsWith('/parametres') ? 'text-white' : 'text-text-light-muted dark:text-text-dark-muted'}`} />
            <span>Paramètres</span>
          </Link>
        </div>
      </aside>

      {/* 📱 MOBILE : Spacer pour la barre de statut iOS en PWA (Safe Area) */}
      <div className="h-[env(safe-area-inset-top,0px)] bg-bg-light dark:bg-bg-dark shrink-0 md:hidden" />

      {/* 📱 MOBILE : Header dans le flux */}
      <header className="flex md:hidden items-center justify-between px-5 h-14 bg-card-light dark:bg-card-dark border-b border-neutral-200/50 dark:border-neutral-800/40 transition-colors duration-300 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 overflow-hidden">
            <img src="/comi/clear/windows/StoreLogo.scale-200.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-lg font-bold tracking-tight text-text-light-main dark:text-text-dark-main">
            Comi
          </span>
        </div>

        <Link
          href="/parametres"
          className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors text-text-light-muted dark:text-text-dark-muted cursor-pointer"
          aria-label="Paramètres"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-grow flex flex-col md:pl-64 min-h-0 overflow-y-auto overscroll-none bg-bg-light dark:bg-bg-dark text-text-light-main dark:text-text-dark-main transition-colors duration-300">
        <div className="flex-1 p-4 pb-24 md:p-8 max-w-5xl w-full mx-auto md:py-8">
          {children}
        </div>
      </main>

      {/* 📱 MOBILE : Bottom Tab Bar fixé en bas */}
      <nav
        className="absolute bottom-0 left-0 right-0 z-50 flex md:hidden bg-card-light dark:bg-card-dark border-t border-neutral-200/50 dark:border-neutral-800/40 transition-colors duration-300 justify-around items-start"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', height: 'calc(56px + env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center w-20 pt-2 pb-1 text-center group cursor-pointer relative"
            >
              {/* Icône avec indicateur actif */}
              <div className={`p-1.5 rounded-full transition-all duration-300 ${active
                  ? 'text-brand scale-110 bg-brand-light dark:bg-brand/10'
                  : 'text-text-light-muted dark:text-text-dark-muted group-active:scale-95'
                }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-semibold tracking-wide transition-all duration-300 ${active
                  ? 'text-brand font-bold'
                  : 'text-text-light-muted dark:text-text-dark-muted'
                }`}>
                {item.label}
              </span>

              {/* Barre active discrète */}
              {active && (
                <span className="absolute top-0 w-6 h-0.5 rounded-full bg-brand" />
              )}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
