'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Utensils, ShoppingBasket, BookOpen, Pencil, Trash2, Loader2, CalendarX, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RepasWithIngredients } from '@/types';
import { formatIngredient } from '@/lib/shopping-list-utils';
import Drawer from '@/components/Drawer';
import ConfirmDeleteDrawer from '@/components/ConfirmDeleteDrawer';

interface RepasDetailModalProps {
  repas: RepasWithIngredients | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: (id: number) => void;
  programmationId?: number;
  onUnschedule?: (id: number) => Promise<void>;
  onReprogram?: () => void;
}

export default function RepasDetailModal({ 
  repas, 
  isOpen, 
  onClose, 
  onDeleted,
  programmationId,
  onUnschedule,
  onReprogram
}: RepasDetailModalProps) {
  const router = useRouter();
  const [activeRepas, setActiveRepas] = useState<RepasWithIngredients | null>(null);

  // Confirmation delete state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Unschedule state
  const [isUnscheduling, setIsUnscheduling] = useState(false);

  useEffect(() => {
    if (repas) {
      setActiveRepas(repas);
    }
  }, [repas]);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setActiveRepas(null);
        setIsDeleteConfirmOpen(false);
        setDeleteError(null);
        setIsUnscheduling(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keep rendering while the modal is open or during the exit transition
  if (!activeRepas && !isOpen) return null;

  const currentRepas = activeRepas || repas;
  if (!currentRepas) return null;

  const { id, titre, photoUrl, recette, ingredients } = currentRepas;

  const handleEdit = () => {
    onClose();
    router.push(`/repas/${id}/modifier`);
  };

  const handleUnschedule = async () => {
    if (!programmationId) return;
    try {
      setIsUnscheduling(true);
      const res = await fetch(`/api/planning/${programmationId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la déprogrammation.');
      }
      onClose();
      if (onUnschedule) {
        await onUnschedule(programmationId);
      }
    } catch (err: any) {
      alert(err.message || 'Une erreur est survenue lors de la déprogrammation.');
    } finally {
      setIsUnscheduling(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);

      const res = await fetch(`/api/repas/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la suppression.');
      }

      onClose();
      if (onDeleted) onDeleted(id);
    } catch (err: any) {
      setDeleteError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsDeleting(false);
    }
  };

  const headerImage = (
    <div className="relative w-full h-56 md:h-72 bg-brand-light dark:bg-neutral-800/30 border-b border-neutral-100 dark:border-neutral-800/20">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={titre}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full text-brand-light dark:text-neutral-700">
          <Utensils className="h-16 w-16 text-brand/35 dark:text-brand/20 stroke-[1.2]" />
        </div>
      )}
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        headerImage={headerImage}
        maxWidth="sm:max-w-3xl"
      >
        <div className="space-y-6">
          {/* Header Title + Actions */}
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light-main dark:text-text-dark-main leading-tight">
              {titre}
            </h2>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              {programmationId ? (
                <>
                  <button
                    type="button"
                    onClick={handleUnschedule}
                    disabled={isUnscheduling}
                    title="Enlever ce repas du planning"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white rounded-input transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isUnscheduling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CalendarX className="h-3.5 w-3.5" />
                    )}
                    <span>Déprogrammer</span>
                  </button>
                  {onReprogram && (
                    <button
                      type="button"
                      onClick={onReprogram}
                      title="Reprogrammer ce créneau"
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-brand bg-brand-light dark:bg-brand/10 hover:bg-brand hover:text-white dark:hover:bg-brand dark:hover:text-white rounded-input transition-all duration-200 active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Reprogrammer</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleEdit}
                    title="Modifier ce repas"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-text-light-main dark:text-text-dark-main bg-neutral-100 dark:bg-neutral-800 hover:bg-brand hover:text-white dark:hover:bg-brand dark:hover:text-white rounded-input transition-all duration-200 active:scale-95 cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Modifier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    title="Supprimer ce repas"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white rounded-input transition-all duration-200 active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <hr className="border-neutral-100 dark:border-neutral-800/40" />

          {/* Grid Layout: Column 1 (Ingredients), Column 2-3 (Recipe) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

            {/* Column 1: Ingredients */}
            <div className="md:col-span-1 space-y-5">
              <div className="flex items-center gap-2 text-brand font-bold text-sm uppercase tracking-wider">
                <ShoppingBasket className="h-5 w-5 stroke-[2]" />
                <h3>Ingrédients</h3>
              </div>

              {ingredients.length === 0 ? (
                <p className="text-sm text-text-light-muted dark:text-text-dark-muted italic">
                  Aucun ingrédient renseigné.
                </p>
              ) : (
                <ul className="space-y-2">
                  {ingredients.map((ing) => (
                    <li
                      key={ing.id}
                      className="text-sm font-medium text-text-light-main dark:text-text-dark-main bg-neutral-50 dark:bg-neutral-800/20 px-3.5 py-2.5 rounded-xl border border-neutral-100/50 dark:border-neutral-800/20"
                    >
                      {formatIngredient(ing.nom, ing.quantite, ing.unite)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Column 2-3: Recipe Instructions */}
            <div className="md:col-span-2 space-y-5">
              <div className="flex items-center gap-2 text-brand font-bold text-sm uppercase tracking-wider">
                <BookOpen className="h-5 w-5 stroke-[2]" />
                <h3>Préparation</h3>
              </div>

              {recette ? (
                <div className="space-y-4">
                  {recette.split('\n').filter(line => line.trim() !== '').map((step, idx) => (
                    <div key={idx} className="flex gap-3.5 items-start">
                      <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-brand-light dark:bg-brand/10 text-brand text-xs font-bold mt-0.5 border border-brand/10">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium text-text-light-main dark:text-text-dark-main leading-relaxed pt-0.5">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-light-muted dark:text-text-dark-muted italic">
                  Aucune instruction de préparation.
                </p>
              )}
            </div>

          </div>
        </div>
      </Drawer>

      {/* Delete Confirmation Drawer */}
      <ConfirmDeleteDrawer
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteError(null);
        }}
        title="Supprimer le repas"
        message="Êtes-vous sûr de vouloir supprimer"
        highlightedName={titre}
        warningText="Cette action est irréversible. Le repas sera définitivement supprimé de votre carnet de recettes."
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </>
  );
}
