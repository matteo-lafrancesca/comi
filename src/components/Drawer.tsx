'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  headerImage?: React.ReactNode;
  maxWidth?: string; // e.g., 'sm:max-w-3xl' or 'sm:max-w-md'
  height?: string; // e.g., 'h-[80dvh]' or 'h-auto'
  maxHeight?: string; // e.g., 'max-h-[95dvh]'
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  headerImage,
  maxWidth = 'sm:max-w-2xl',
  height = 'h-[80dvh] sm:h-auto',
  maxHeight = 'max-h-[94dvh] sm:max-h-[90vh]'
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

  const scrollRef = useRef<HTMLDivElement>(null);

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
    
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Lock main scroll container to prevent page scrolling behind drawer
    const mainEl = document.querySelector('main');
    let originalMainOverflow = '';
    if (mainEl) {
      originalMainOverflow = mainEl.style.overflow;
      mainEl.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalBodyOverflow;
      if (mainEl) {
        mainEl.style.overflow = originalMainOverflow;
      }
    };
  }, [visible, onClose]);

  if (!mounted) return null;

  // Touch handlers for responsive swipe-to-close gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientY;
    // Record current scroll position of the scrollable container
    scrollStartRef.current = scrollRef.current ? scrollRef.current.scrollTop : 0;
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
      if (e.cancelable) {
        e.preventDefault();
      }
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // If swiped down past the 120px threshold, trigger close
    if (dragOffset > 120) {
      onClose();
    }
    setDragOffset(0);
  };

  // Determine CSS transform based on touch drag gestures
  const panelStyle = isDragging
    ? { transform: `translateY(${dragOffset}px)`, transition: 'none' }
    : {};

  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all duration-300 ${
      visible ? 'pointer-events-auto' : 'pointer-events-none'
    }`}>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        onTouchMove={(e) => {
          if (e.cancelable) e.preventDefault();
        }}
        className={`fixed inset-0 bg-neutral-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer Panel container */}
      <div 
        style={panelStyle}
        className={`fixed bottom-0 left-0 right-0 sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:right-auto bg-card-light dark:bg-card-dark rounded-t-card sm:rounded-card shadow-2xl flex flex-col overflow-hidden border-t sm:border border-neutral-200/40 dark:border-neutral-800/40 z-10 w-full ${maxWidth} ${height} ${maxHeight} transition-all duration-300 ease-out select-none ${
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
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/40 hover:bg-black/60 dark:bg-neutral-900/60 dark:hover:bg-neutral-950 text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-md z-30 pointer-events-auto"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Floating Swipe Handle indicator on top of headerImage */}
        {headerImage && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none sm:hidden">
            <div className="w-12 h-1 bg-white/70 dark:bg-white/50 backdrop-blur-md rounded-full shadow-xs" />
          </div>
        )}

        {/* Header area for drawers WITHOUT headerImage */}
        {!headerImage && (
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="shrink-0 cursor-grab active:cursor-grabbing"
          >
            {/* Swipe Handle Indicator */}
            <div className="flex flex-col pt-3 pb-1.5 shrink-0 bg-neutral-50/20 dark:bg-neutral-800/5 select-none items-center justify-center">
              <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-800 rounded-full sm:hidden" />
            </div>

            {/* Title Header */}
            {title && (
              <div className="flex items-center justify-between px-6 pb-4 pt-1 shrink-0 border-b border-neutral-100/50 dark:border-neutral-800/20">
                <div className="min-w-0 flex-1">
                  {typeof title === 'string' ? (
                    <h3 className="text-lg font-bold text-text-light-main dark:text-text-dark-main truncate">
                      {title}
                    </h3>
                  ) : (
                    title
                  )}
                </div>
                <button 
                  onClick={onClose}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-text-light-muted dark:text-text-dark-muted transition-colors cursor-pointer"
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
          className={`overflow-y-auto flex-1 select-text ${headerImage ? 'p-0' : 'p-6'}`}
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
