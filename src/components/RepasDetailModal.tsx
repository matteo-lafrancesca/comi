'use client';

import React, { useState, useEffect } from 'react';
import { errorMessage } from '@/lib/errors';
import Image from 'next/image';
import { Pencil, Trash2, Loader2, RefreshCw, Calendar, CalendarX, Globe, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RepasWithIngredients } from '@/types';
import { formatIngredient } from '@/lib/shopping-list-utils';
import { planningUrl } from '@/lib/routes';
import { useDeleteRepasMutation, useRepasVisibilityMutation, useUnscheduleMutation } from '@/lib/queries/mutations';
import Drawer from '@/components/Drawer';
import IconButton from '@/components/ui/IconButton';
import Alert from '@/components/ui/Alert';
import ConfirmDeleteDrawer from '@/components/ConfirmDeleteDrawer';

interface RepasDetailModalProps {
  repas: RepasWithIngredients | null;
  isOpen: boolean;
  onClose: () => void;
  /** Présent quand le repas est affiché depuis un créneau du planning */
  programmationId?: number;
  onReprogram?: () => void;
}

export default function RepasDetailModal({ repas, isOpen, onClose, programmationId, onReprogram }: RepasDetailModalProps) {
  const router = useRouter();
  const [activeRepas, setActiveRepas] = useState<RepasWithIngredients | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [unscheduleError, setUnscheduleError] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  /** Dernière visibilité enregistrée ici : le repas reçu en prop est une copie qui ne suit pas la mutation. */
  const [savedVisibility, setSavedVisibility] = useState<{ id: number; isPublic: boolean } | null>(null);
  const deleteMutation = useDeleteRepasMutation();
  const visibilityMutation = useRepasVisibilityMutation();
  const unscheduleMutation = useUnscheduleMutation();
  const isDeleting = deleteMutation.isPending;
  const isUnscheduling = unscheduleMutation.isPending;

  // Conserve le dernier repas affiché pendant l'animation de fermeture
  if (repas && repas !== activeRepas) setActiveRepas(repas);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setActiveRepas(null);
        setIsDeleteConfirmOpen(false);
        setDeleteError(null);
        setUnscheduleError(null);
        setVisibilityError(null);
        setSavedVisibility(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keep rendering while the modal is open or during the exit transition
  if (!activeRepas && !isOpen) return null;

  const currentRepas = activeRepas || repas;
  if (!currentRepas) return null;

  const { id, titre, photoUrl, recette, ingredients } = currentRepas;
  const isPublic = savedVisibility?.id === id ? savedVisibility.isPublic : currentRepas.isPublic;

  const handleToggleVisibility = async () => {
    setVisibilityError(null);
    try {
      const updated = await visibilityMutation.mutateAsync({ repasId: id, isPublic: !isPublic });
      setSavedVisibility({ id, isPublic: updated.isPublic });
    } catch (err) {
      setVisibilityError(errorMessage(err, 'Une erreur est survenue.'));
    }
  };

  const handleEdit = () => {
    onClose();
    router.push(`/repas/${id}/modifier`);
  };

  const handleSchedule = () => {
    onClose();
    router.push(planningUrl({ schedule: id }), { scroll: false });
  };

  const handleUnschedule = async () => {
    if (!programmationId) return;
    setUnscheduleError(null);
    try {
      await unscheduleMutation.mutateAsync(programmationId);
      onClose();
    } catch (err) {
      setUnscheduleError(errorMessage(err, 'Une erreur est survenue lors de la déprogrammation.'));
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(id);
      onClose();
    } catch (err) {
      setDeleteError(errorMessage(err, 'Une erreur est survenue.'));
    }
  };

  const headerImage = (
    <div
      className={`relative w-full bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-center ${
        photoUrl ? 'aspect-square sm:aspect-[16/10] sm:max-h-[420px]' : 'h-28'
      }`}
    >
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
        <span className="font-display italic text-6xl text-neutral-400 dark:text-neutral-600 select-none">
          {titre.trim().charAt(0).toUpperCase()}
        </span>
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
        height="h-[95dvh] sm:h-auto"
        maxHeight="max-h-[96dvh] sm:max-h-[90vh]"
      >
        <div className="space-y-8">
          {unscheduleError && <Alert>{unscheduleError}</Alert>}
          {visibilityError && <Alert>{visibilityError}</Alert>}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-tight">{titre}</h2>
              {!programmationId && (
                <p className="eyebrow mt-2 text-text-light-muted dark:text-text-dark-muted">
                  {isPublic ? 'Visible par vos amis' : 'Recette privée'}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 sm:mt-1">
              {programmationId ? (
                <>
                  <IconButton label="Déprogrammer ce repas" onClick={handleUnschedule} disabled={isUnscheduling}>
                    {isUnscheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarX className="h-4 w-4" />}
                  </IconButton>
                  {onReprogram && (
                    <IconButton label="Reprogrammer ce créneau" onClick={onReprogram}>
                      <RefreshCw className="h-4 w-4" />
                    </IconButton>
                  )}
                </>
              ) : (
                <>
                  <IconButton label="Programmer ce repas" onClick={handleSchedule}>
                    <Calendar className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label={isPublic ? 'Rendre ce repas privé' : 'Rendre ce repas visible par vos amis'}
                    aria-pressed={isPublic}
                    onClick={handleToggleVisibility}
                    disabled={visibilityMutation.isPending}
                  >
                    {visibilityMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isPublic ? (
                      <Globe className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </IconButton>
                  <IconButton label="Modifier ce repas" onClick={handleEdit}>
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Supprimer ce repas" tone="danger" onClick={() => setIsDeleteConfirmOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12">
            <section className="md:col-span-2">
              <h3 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">Ingrédients</h3>
              {ingredients.length === 0 ? (
                <p className="mt-3 text-sm italic text-text-light-muted dark:text-text-dark-muted">Aucun ingrédient renseigné.</p>
              ) : (
                <ul className="divide-y divide-dashed divide-neutral-300 dark:divide-neutral-700">
                  {ingredients.map((ing) => (
                    <li key={ing.id} className="py-2.5 text-sm">
                      {formatIngredient(ing.nom, ing.quantite, ing.unite)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="md:col-span-3">
              <h3 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">Préparation</h3>
              {recette ? (
                <ol className="mt-4 space-y-5">
                  {recette
                    .split('\n')
                    .filter((line) => line.trim() !== '')
                    .map((step, idx) => (
                      <li key={idx} className="flex gap-4 items-baseline">
                        <span className="font-display italic text-3xl leading-none text-brand w-7 shrink-0 text-right">{idx + 1}</span>
                        <p className="text-[15px] leading-relaxed">{step}</p>
                      </li>
                    ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm italic text-text-light-muted dark:text-text-dark-muted">Aucune instruction de préparation.</p>
              )}
            </section>
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
