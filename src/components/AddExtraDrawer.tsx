'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { CategorieIngredient, CATEGORY_DETAILS, normalizeCategory } from '@/types';
import Drawer from '@/components/Drawer';
import IngredientSearchInput, { IngredientSuggestion } from '@/components/IngredientSearchInput';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import TextInput from '@/components/ui/TextInput';
import { errorMessage } from '@/lib/errors';
import { normalizeSearchText } from '@/lib/string-utils';
import { apiFetch } from '@/lib/api';

interface AddExtraDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  week: number | null;
  year: number | null;
  /** Called after a successful add so the parent can refresh its data */
  onAdded: () => void;
}

interface MealOption {
  id: number;
  titre: string;
  photoUrl: string | null;
}

interface ExtraPayload {
  week: number;
  year: number;
  repasId?: number;
  ingredientName?: string;
  categorie?: string;
  quantite?: number;
  unite?: string;
}

type Tab = 'repas' | 'ingredient';

/** Drawer d'ajout hors-planning. Le formulaire n'est monté que drawer ouvert : son état repart de zéro à chaque ouverture. */
export default function AddExtraDrawer({ isOpen, onClose, week, year, onAdded }: AddExtraDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Ajouter à la liste" maxWidth="sm:max-w-md">
      <AddExtraForm onClose={onClose} week={week} year={year} onAdded={onAdded} />
    </Drawer>
  );
}

function AddExtraForm({ onClose, week, year, onAdded }: Omit<AddExtraDrawerProps, 'isOpen'>) {
  const [activeTab, setActiveTab] = useState<Tab>('repas');
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Onglet recette
  const [allMeals, setAllMeals] = useState<MealOption[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [selectedRepasId, setSelectedRepasId] = useState<number | null>(null);
  const [searchMealQuery, setSearchMealQuery] = useState('');

  // Onglet article
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientSuggestion | null>(null);
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnite, setIngredientUnite] = useState('');

  useEffect(() => {
    apiFetch('/api/repas')
      .then((res) => (res.ok ? res.json() : { repas: [] }))
      .then((data) => setAllMeals(data.repas || []))
      .catch(console.error)
      .finally(() => setLoadingMeals(false));
  }, []);

  const filteredMeals = useMemo(() => {
    if (!searchMealQuery.trim()) return allMeals;
    const q = normalizeSearchText(searchMealQuery);
    return allMeals.filter((meal) => normalizeSearchText(meal.titre).includes(q));
  }, [allMeals, searchMealQuery]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (week === null || year === null) return;

    const body: ExtraPayload = { week, year };
    if (activeTab === 'repas') {
      if (selectedRepasId === null) return setFormError('Choisissez une recette.');
      body.repasId = selectedRepasId;
    } else {
      if (!selectedIngredient) return setFormError('Choisissez ou créez un article.');
      body.ingredientName = selectedIngredient.nom;
      body.categorie = selectedIngredient.categorie;
      if (ingredientQuantity) body.quantite = parseFloat(ingredientQuantity);
      if (ingredientUnite) body.unite = ingredientUnite;
    }

    setFormError(null);
    setAdding(true);
    try {
      const res = await apiFetch('/api/shopping-list/extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erreur lors de l'ajout.");
      }

      onClose();
      onAdded();
    } catch (err) {
      setFormError(errorMessage(err, 'Une erreur est survenue.'));
    } finally {
      setAdding(false);
    }
  };

  const tabClasses = (tab: Tab) =>
    `pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
      activeTab === tab
        ? 'border-brand text-text-light-main dark:text-text-dark-main'
        : 'border-transparent text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-6 border-b border-neutral-200 dark:border-neutral-800">
        <button type="button" onClick={() => switchTab('repas')} className={tabClasses('repas')}>
          Une recette
        </button>
        <button type="button" onClick={() => switchTab('ingredient')} className={tabClasses('ingredient')}>
          Un article
        </button>
      </div>

      {formError && <Alert>{formError}</Alert>}

      {activeTab === 'repas' ? (
        <div className="space-y-4">
          <TextInput
            placeholder="Chercher dans mes recettes"
            value={searchMealQuery}
            onChange={(e) => setSearchMealQuery(e.target.value)}
            aria-label="Chercher dans mes recettes"
          />

          {loadingMeals ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-text-light-muted dark:text-text-dark-muted" />
            </div>
          ) : filteredMeals.length === 0 ? (
            <p className="py-4 text-sm text-text-light-muted dark:text-text-dark-muted">Aucune recette trouvée.</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredMeals.map((meal) => {
                const selected = selectedRepasId === meal.id;
                return (
                  <li key={meal.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRepasId(meal.id)}
                      className="w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer"
                    >
                      <span className={`font-display text-[17px] ${selected ? 'font-semibold' : ''}`}>{meal.titre}</span>
                      {selected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {selectedIngredient ? (
            <div className="flex items-center justify-between gap-3 py-2 border-b border-neutral-300 dark:border-neutral-700">
              <div className="min-w-0">
                <span className="block font-display text-xl truncate">{selectedIngredient.nom}</span>
                <span className="eyebrow">
                  {CATEGORY_DETAILS[selectedIngredient.categorie as CategorieIngredient]?.label || selectedIngredient.categorie}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIngredient(null)}
                className="p-1.5 -mr-1.5 text-text-light-muted dark:text-text-dark-muted hover:text-text-light-main dark:hover:text-text-dark-main cursor-pointer"
                aria-label="Changer d'article"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <IngredientSearchInput
              label="Article"
              placeholder="Yaourts nature, pain de mie…"
              onSelect={setSelectedIngredient}
              onCreateNew={(name) => setSelectedIngredient({ id: 0, nom: name, categorie: normalizeCategory(name) })}
            />
          )}

          {selectedIngredient && (
            <div className="grid grid-cols-2 gap-6 animate-fade-in">
              <TextInput
                label="Quantité"
                type="number"
                step="any"
                value={ingredientQuantity}
                onChange={(e) => setIngredientQuantity(e.target.value)}
              />
              <TextInput label="Unité" placeholder="pots, g…" value={ingredientUnite} onChange={(e) => setIngredientUnite(e.target.value)} />
            </div>
          )}
        </div>
      )}

      <Button type="submit" disabled={adding} className="w-full">
        {adding && <Loader2 className="h-4 w-4 animate-spin" />}
        {adding ? 'Ajout…' : 'Ajouter à la liste'}
      </Button>
    </form>
  );
}
