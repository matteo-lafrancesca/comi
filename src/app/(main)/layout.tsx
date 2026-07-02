'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  ShoppingBag, 
  LogOut, 
  Sun, 
  Moon, 
  User,
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
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

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
    if (href === '/repas' && pathname === '/') {
      return true;
    }
    return pathname.startsWith(href);
  };

  // Safe logout handler
  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-bg-light dark:bg-bg-dark">
        <div className="flex flex-col items-center gap-3">
          <img src="/menumanage/100.png" alt="Logo ManageMenu" className="h-12 w-12 animate-bounce rounded-xl shadow-sm" />
          <span className="text-sm font-medium text-text-light-muted dark:text-text-dark-muted animate-pulse">
            Chargement de votre espace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col bg-bg-light dark:bg-bg-dark text-text-light-main dark:text-text-dark-main transition-colors duration-300">
      
      {/* 💻 NAVIGATION DESKTOP : Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-card-light dark:bg-card-dark border-r border-neutral-200/50 dark:border-neutral-800/40 p-6 z-40 transition-all duration-300">
        {/* En-tête / Logo */}
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="flex items-center justify-center h-10 w-10 overflow-hidden rounded-xl bg-brand-light dark:bg-brand/10 shadow-sm border border-neutral-200/50 dark:border-neutral-800/40">
            <img src="/menumanage/100.png" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <span className="text-xl font-bold tracking-tight text-text-light-main dark:text-text-dark-main">
            ManageMenu
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
                className={`flex items-center gap-3 px-4 py-3 rounded-card text-sm font-semibold transition-all duration-300 cursor-pointer ${
                  active
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

        {/* Pied de page de la Sidebar : Profil et actions */}
        <div className="mt-auto flex flex-col gap-4 pt-6 border-t border-neutral-200/50 dark:border-neutral-800/40">
          {/* Toggle Thème */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-card text-xs font-semibold text-text-light-muted dark:text-text-dark-muted hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {theme === 'light' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-500" />
                  Mode Clair
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-400" />
                  Mode Sombre
                </>
              )}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800">
              Basculer
            </span>
          </button>

          {/* Profil utilisateur */}
          {user && (
            <div className="flex items-center gap-3 px-4 py-2 bg-neutral-50 dark:bg-neutral-800/30 rounded-card border border-neutral-200/30 dark:border-neutral-800/20">
              <div className="h-8 w-8 rounded-full bg-brand-light dark:bg-brand/10 flex items-center justify-center text-brand shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-text-light-main dark:text-text-dark-main truncate">
                  Mon Compte
                </span>
                <span className="text-[10px] text-text-light-muted dark:text-text-dark-muted truncate">
                  {user.email}
                </span>
              </div>
            </div>
          )}

          {/* Bouton de Déconnexion */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-card text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 transition-all duration-300 cursor-pointer"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────
          📱 MOBILE : Header fixe en haut
          - padding-top absorbe la status bar iOS (safe-area-inset-top)
          - Le fond s'étend visuellement derrière la status bar
      ───────────────────────────────────────────────── */}
      <header
        className="flex md:hidden items-center justify-between px-5 bg-card-light dark:bg-card-dark backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/40 fixed top-0 left-0 right-0 z-40 transition-colors duration-300"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: '10px' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 overflow-hidden rounded-lg bg-brand-light dark:bg-brand/10 border border-neutral-200/50 dark:border-neutral-800/40">
            <img src="/menumanage/100.png" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <span className="text-lg font-bold tracking-tight text-text-light-main dark:text-text-dark-main">
            ManageMenu
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors text-text-light-muted dark:text-text-dark-muted cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <button
            onClick={handleLogout}
            className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────
          📱 MOBILE : Bottom Tab Bar fixe en bas
          - padding-bottom absorbe la home indicator iOS (safe-area-inset-bottom)
          - Le fond s'étend visuellement derrière la home indicator
          - Hauteur fixe = 56px de contenu + safe-area-inset-bottom
      ───────────────────────────────────────────────── */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 bg-card-light dark:bg-card-dark backdrop-blur-lg border-t border-neutral-200/50 dark:border-neutral-800/40 z-50 transition-colors duration-300 justify-around items-start"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
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
              <div className={`p-1.5 rounded-full transition-all duration-300 ${
                active 
                  ? 'text-brand scale-110 bg-brand-light dark:bg-brand/10' 
                  : 'text-text-light-muted dark:text-text-dark-muted group-active:scale-95'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-semibold tracking-wide transition-all duration-300 ${
                active 
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

      {/* ─────────────────────────────────────────────────
          CONTENU PRINCIPAL
          - Sur mobile : décalé sous le header (pt-content) et au-dessus de la tab bar (pb-content)
          - Sur desktop : décalé à droite de la sidebar
      ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col md:pl-64 overflow-y-auto overscroll-y-none pt-content md:pt-0 pb-content md:pb-6">
        <div className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
          {children}
        </div>
      </main>
      
    </div>
  );
}
