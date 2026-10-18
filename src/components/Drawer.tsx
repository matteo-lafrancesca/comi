'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

let scrollLocks = 0;
let savedOverflow = { body: '', main: '' };

/**
 * Verrouille le scroll derrière un drawer. Compteur partagé : avec des drawers empilés (ex. confirmation
 * de suppression sur une fiche), chacun mémorisait l'état déjà verrouillé par l'autre et le restaurait
 * dans le désordre, laissant la page bloquée pour de bon. Renvoie la fonction de déverrouillage.
 */
function lockPageScroll() {
  const mainEl = document.querySelector('main');
  if (scrollLocks++ === 0) {
    savedOverflow = { body: document.body.style.overflow, main: mainEl?.style.overflow ?? '' };
    document.body.style.overflow = 'hidden';
    if (mainEl) mainEl.style.overflow = 'hidden';
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--scrollLocks > 0) return;
    document.body.style.overflow = savedOverflow.body;
    const currentMain = document.querySelector('main');
    if (currentMain) currentMain.style.overflow = savedOverflow.main;
  };
}

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  headerImage?: React.ReactNode;
  maxWidth?: string; // e.g., 'sm:max-w-3xl' or 'sm:max-w-md'
  height?: string; // e.g., 'h-[80dvh]' or 'h-auto'
  maxHeight?: string; // e.g., 'max-h-[95dvh]'
  /** Sur mobile, le panneau occupe tout l'écran (formulaires avec clavier) ; inchangé dès `sm:`. */
  fullScreenMobile?: boolean;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  headerImage,
  maxWidth = 'sm:max-w-2xl',
  fullScreenMobile = false,
  height = fullScreenMobile ? 'h-(--app-h) sm:h-auto' : 'h-[80dvh] sm:h-auto',
  maxHeight = fullScreenMobile ? 'max-h-(--app-h) sm:max-h-[90vh]' : 'max-h-[94dvh] sm:max-h-[90vh]'
}: DrawerProps) {
  // Montage différé : le panneau reste monté pendant l'animation de fermeture
  const [mounted, setMounted] = useState(isOpen);
  const [entered, setEntered] = useState(false);
  const visible = isOpen && entered;

  if (isOpen && !mounted) setMounted(true);

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const touchStartRef = useRef(0);
  const scrollStartRef = useRef(0);

  const draggingRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Une frame de délai pour que la transition d'entrée se déclenche
      const timer = setTimeout(() => setEntered(true), 20);
      return () => {
        clearTimeout(timer);
        setEntered(false);
      };
    }
    // Attend la fin de la transition de sortie (300ms) avant de démonter
    const timer = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Sync Escape key and body overflow locking
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const unlock = lockPageScroll();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unlock();
    };
  }, [visible, onClose]);

  // React attache touchmove en mode passif : preventDefault y est ignoré et iOS
  // applique son rebond natif au contenu en plus du translateY du panneau
  // (la photo descend alors plus vite que le drawer). Écouteur natif non passif.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const block = (e: TouchEvent) => {
      if (
        draggingRef.current &&
        scrollStartRef.current <= 0 &&
        e.touches[0].clientY > touchStartRef.current &&
        e.cancelable
      ) {
        e.preventDefault();
      }
    };
    panel.addEventListener('touchmove', block, { passive: false });
    return () => panel.removeEventListener('touchmove', block);
  }, [mounted]);

  if (!mounted) return null;

  // Touch handlers for responsive swipe-to-close gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientY;
    // Scroll le plus haut entre le conteneur et les listes défilantes imbriquées touchées :
    // sans ça, remonter une liste interne déplacerait le panneau au lieu de la liste.
    let scrollTop = 0;
    for (let el = e.target as HTMLElement | null; el && el !== panelRef.current; el = el.parentElement) {
      scrollTop = Math.max(scrollTop, el.scrollTop);
    }
    scrollStartRef.current = scrollTop;
    draggingRef.current = true;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartRef.current;

    // Swipe-to-close conditions:
    // 1. Swiping downwards (deltaY > 0)
    // 2. The scrollable content is scrolled to the very top (scrollTop <= 0)
    if (deltaY > 0 && scrollStartRef.current <= 0) {
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    draggingRef.current = false;
    setIsDragging(false);
    // If swiped down past the 120px threshold, trigger close
    if (dragOffset > 120) {
      onClose();
    }
    setDragOffset(0);
  };

  // iOS annule le geste (geste système, appel…) sans touchend : sans reset, le panneau resterait décalé
  const handleTouchCancel = () => {
    draggingRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  };

  // Determine CSS transform based on touch drag gestures
  const panelStyle = isDragging
    ? { transform: `translateY(${dragOffset}px)`, transition: 'none' }
    : {};

  return createPortal(
    <div className={`fixed inset-x-0 top-0 h-(--app-h) z-50 flex items-end sm:items-center justify-center transition-all duration-300 ${
      visible ? 'pointer-events-auto' : 'pointer-events-none'
    }`}>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        onTouchMove={(e) => {
          if (e.cancelable) e.preventDefault();
        }}
        className={`fixed inset-x-0 top-0 h-(--app-h) bg-ink/55 dark:bg-black/70 transition-opacity duration-300 ease-in-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer Panel container */}
      <div
        ref={panelRef}
        style={panelStyle}
        className={`fixed bottom-[calc(100dvh-var(--app-h))] left-0 right-0 sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:right-auto bg-card-light dark:bg-card-dark ${fullScreenMobile ? 'rounded-none pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] sm:pt-0 sm:pb-0' : 'rounded-t-card'} sm:rounded-card shadow-2xl flex flex-col overflow-hidden border-t sm:border border-neutral-200 dark:border-neutral-800 z-10 w-full ${maxWidth} ${height} ${maxHeight} transition-all duration-300 ease-out select-none ${
          visible 
            ? 'translate-y-0 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:scale-100 sm:opacity-100' 
            : 'translate-y-full sm:translate-y-4 sm:-translate-x-1/2 sm:-translate-y-[45%] sm:scale-95 sm:opacity-0'
        }`}
      >
        {/* Floating Close button for drawers with headerImage */}
        {headerImage && (
          <button 
            onClick={onClose}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 p-2 rounded-input bg-card-light/95 dark:bg-card-dark/95 text-text-light-main dark:text-text-dark-main transition-colors cursor-pointer shadow-md z-30 pointer-events-auto"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Floating Swipe Handle indicator on top of headerImage */}
        {headerImage && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none sm:hidden">
            <div className="w-10 h-1 bg-white/80 rounded-full shadow-xs" />
          </div>
        )}

        {/* Header area for drawers WITHOUT headerImage */}
        {!headerImage && (
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            className="shrink-0 cursor-grab active:cursor-grabbing"
          >
            {/* Swipe Handle Indicator */}
            <div className="flex flex-col pt-3 pb-2 shrink-0 select-none items-center justify-center">
              <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full sm:hidden" />
            </div>

            {/* Title Header */}
            {title && (
              <div className="flex items-center justify-between px-6 pb-4 pt-1 shrink-0 border-b border-neutral-200 dark:border-neutral-800">
                <div className="min-w-0 flex-1">
                  {typeof title === 'string' ? (
                    <h3 className="font-display text-2xl font-semibold text-text-light-main dark:text-text-dark-main truncate">
                      {title}
                    </h3>
                  ) : (
                    title
                  )}
                </div>
                <button 
                  onClick={onClose}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-input hover:bg-neutral-100 dark:hover:bg-neutral-800 text-text-light-muted dark:text-text-dark-muted transition-colors cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scrollable contents area */}
        <div 
          ref={scrollRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          className={`overflow-y-auto overscroll-y-contain flex-1 select-text ${headerImage ? 'p-0' : 'p-6'}`}
        >
          {headerImage && (
            <div className="relative w-full overflow-hidden shrink-0 select-none">
              {headerImage}
            </div>
          )}
          <div className={headerImage ? 'p-6' : ''}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
