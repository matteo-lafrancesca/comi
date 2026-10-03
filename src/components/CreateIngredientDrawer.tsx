'use client';

import React, { useState } from 'react';
import { errorMessage } from '@/lib/errors';
import { Loader2 } from 'lucide-react';
import { CATEGORY_DETAILS, CategorieIngredient, normalizeCategory } from '@/types';
import Drawer from '@/components/Drawer';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import { IngredientSuggestion } from '@/components/IngredientSearchInput';
import { apiFetch } from '@/lib/api';

interface CreateIngredientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-filled name when the user typed something in the search field */
  initialName?: string;
  /** Called with the newly created ingredient after success */
  onCreated: (ingredient: IngredientSuggestion) => void;
}

export default function CreateIngredientDrawer({ isOpen, onClose, initialName = '', onCreated }: CreateIngredientDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Nouvel ingrédient"
      maxWidth="sm:max-w-md"
    >
      <CreateIngredientForm initialName={initialName} onClose={onClose} onCreated={onCreated} />
    </Drawer>
  );
}

/** Monté uniquement drawer ouvert : l'état se réinitialise à chaque ouverture. */
function CreateIngredientForm({ initialName, onClose, onCreated }: Omit<CreateIngredientDrawerProps, 'isOpen' | 'initialName'> & { initialName: string }) {
  const [nom, setNom] = useState(initialName);
  const [categorie, setCategorie] = useState<CategorieIngredient>(normalizeCategory(initialName));
  const [creating, setCreating] = useState(false);

  const handleSubmit = async () => {
    if (!nom.trim()) return;

    try {
      setCreating(true);
      const res = await apiFetch('/api/ingredients', {
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
    } catch (err) {
      alert(errorMessage(err, "Une erreur est survenue lors de la création de l'ingrédient."));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-light-muted dark:text-text-dark-muted">
        Cet ingrédient n&apos;existe pas encore. Choisissez son rayon pour qu&apos;il soit bien classé dans la liste de courses.
      </p>

      <TextInput label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />

      <div>
        <span className="eyebrow block mb-2">Rayon</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_DETAILS).map(([key, details]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategorie(key as CategorieIngredient)}
              className={`px-3 py-1.5 text-sm rounded-input border cursor-pointer transition-colors ${
                categorie === key
                  ? 'bg-brand text-ink border-ink dark:border-brand font-semibold'
                  : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {details.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-5 border-t border-neutral-200 dark:border-neutral-800">
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={creating || !nom.trim()}>
          {creating && <Loader2 className="h-4 w-4 animate-spin" />}
          Créer
        </Button>
      </div>
    </div>
  );
}
