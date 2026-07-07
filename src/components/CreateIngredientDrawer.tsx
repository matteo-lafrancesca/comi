'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Check, Loader2 } from 'lucide-react';
import { CATEGORY_DETAILS, CategorieIngredient, normalizeCategory } from '@/types';
import Drawer from '@/components/Drawer';
import { IngredientSuggestion } from '@/components/IngredientSearchInput';

interface CreateIngredientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-filled name when the user typed something in the search field */
  initialName?: string;
  /** Called with the newly created ingredient after success */
  onCreated: (ingredient: IngredientSuggestion) => void;
}

export default function CreateIngredientDrawer({
  isOpen,
  onClose,
  initialName = '',
  onCreated,
}: CreateIngredientDrawerProps) {
  const [nom, setNom] = useState(initialName);
  const [categorie, setCategorie] = useState<CategorieIngredient>('epicerie-salee');
  const [creating, setCreating] = useState(false);

  // Sync initialName when drawer opens or the prop changes
  useEffect(() => {
    if (isOpen) {
      setNom(initialName);
      setCategorie(normalizeCategory(initialName));
    }
  }, [isOpen, initialName]);

  const handleSubmit = async () => {
    if (!nom.trim()) return;

    try {
      setCreating(true);
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: nom.trim(), categorie }),
      });

      if (!res.ok) {
        throw new Error("Impossible de créer l'ingrédient.");
      }

      const created: IngredientSuggestion = await res.json();
      onCreated(created);
      onClose();
    } catch (err: any) {
      alert(err.message || "Une erreur est survenue lors de la création de l'ingrédient.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-brand">
          <Tag className="h-5 w-5" />
          <span className="font-extrabold text-lg">Nouvel ingrédient</span>
        </div>
      }
      maxWidth="sm:max-w-md"
    >
      <div className="space-y-5">
        <p className="text-xs text-text-light-muted dark:text-text-dark-muted font-medium leading-relaxed">
          Cet ingrédient n&apos;existe pas encore. Enregistrez-le pour pouvoir l&apos;utiliser dans vos recettes.
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-light-main dark:text-text-dark-main">
            Nom de l&apos;ingrédient
          </label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom de l'ingrédient"
            className="w-full px-4 py-2.5 text-sm border outline-none bg-neutral-50/50 dark:bg-neutral-800/10 border-neutral-200 dark:border-neutral-800 rounded-xl text-text-light-main dark:text-text-dark-main font-semibold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-text-light-main dark:text-text-dark-main">
            Rayon / Catégorie du magasin *
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
            {Object.entries(CATEGORY_DETAILS).map(([key, details]) => {
              const isSelected = categorie === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategorie(key as CategorieIngredient)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'bg-brand text-white border-brand shadow-xs shadow-brand/10'
                      : 'bg-bg-light dark:bg-bg-dark text-text-light-main dark:text-text-dark-main border-neutral-200/60 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  <span className="line-clamp-1">{details.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/20">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-xs font-bold border border-neutral-200 dark:border-neutral-800 rounded-input hover:bg-neutral-50 dark:hover:bg-neutral-800 text-text-light-main dark:text-text-dark-main active:scale-95 transition-all cursor-pointer text-center"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={creating || !nom.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-extrabold bg-brand hover:bg-brand-hover text-white rounded-input active:scale-95 transition-all cursor-pointer shadow-sm shadow-brand/20 disabled:opacity-60 disabled:pointer-events-none"
          >
            {creating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Création...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Créer et ajouter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
