'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ShoppingBag,
  Settings,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();
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
        <img src="/comi/clear/windows/StoreLogo.scale-200.png" alt="Comi" className="h-12 w-12 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg-light dark:bg-bg-dark text-text-light-main dark:text-text-dark-main">
      {/* Desktop : colonne de navigation */}
      <aside className="hidden md:flex flex-col w-60 fixed inset-y-0 left-0 border-r border-neutral-200 dark:border-neutral-800 px-8 py-10 z-40">
        <Wordmark className="mb-14" />

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-baseline gap-3 py-2 font-display text-xl"
            >
              <span className="w-4 text-[11px] font-sans tabular-nums text-text-light-muted dark:text-text-dark-muted">
                {isActive(item.href) ? '→' : ''}
              </span>
              <span
                className={`transition-colors ${
                  isActive(item.href)
                    ? 'underline decoration-brand decoration-2 underline-offset-4'
                    : 'text-text-light-muted dark:text-text-dark-muted group-hover:text-text-light-main dark:group-hover:text-text-dark-main'
                }`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <Link
          href="/parametres"
          className={`mt-auto flex items-center gap-2 text-sm transition-colors ${
            pathname.startsWith('/parametres')
              ? 'text-text-light-main dark:text-text-dark-main font-semibold'
              : 'text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main'
          }`}
        >
          <Settings className="h-4 w-4" />
          Paramètres
        </Link>
      </aside>

      {/* Mobile : zone de statut iOS + en-tête */}
      <div className="h-[env(safe-area-inset-top,0px)] shrink-0 md:hidden" />
      <header className="flex md:hidden items-center justify-between px-5 h-14 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <Wordmark small />
        <Link
          href="/parametres"
          className="p-2 -mr-2 text-text-light-muted dark:text-text-dark-muted"
          aria-label="Paramètres"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      <main className="flex-grow flex flex-col md:pl-60 min-h-0 overflow-y-auto overscroll-none">
        <div className="flex-1 px-5 pt-6 pb-28 md:px-12 md:py-12 max-w-5xl w-full mx-auto">{children}</div>
      </main>

      {/* Mobile : barre d'onglets */}
      <nav
        className="absolute bottom-0 left-0 right-0 z-50 flex md:hidden bg-card-light dark:bg-card-dark border-t border-neutral-200 dark:border-neutral-800"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
      >
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex-1 flex flex-col items-center gap-1 pt-3 pb-1 ${
                active ? 'text-text-light-main dark:text-text-dark-main' : 'text-text-light-muted dark:text-text-dark-muted'
              }`}
            >
              {active && <span className="absolute top-0 inset-x-6 h-[3px] bg-brand" />}
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span className="text-[11px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Wordmark({ className = '', small = false }: { className?: string; small?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src="/comi/clear/windows/StoreLogo.scale-200.png" alt="" className={small ? 'h-7 w-7' : 'h-9 w-9'} />
      <span className={`font-display italic font-semibold tracking-tight ${small ? 'text-2xl' : 'text-3xl'}`}>Comi</span>
    </div>
  );
}
