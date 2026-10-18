'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Drawer from '@/components/Drawer';
import ConfirmDeleteDrawer from '@/components/ConfirmDeleteDrawer';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { useAdminDeleteRowMutation, useAdminSaveRowMutation } from '@/lib/queries/mutations';
import { errorMessage } from '@/lib/errors';
import type { AdminField, AdminModel, AdminRow } from '@/types';

interface AdminRowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  model: AdminModel;
  /** Ligne à modifier ; `null` pour en créer une. Remonter le composant (`key`) à chaque ouverture. */
  row: AdminRow | null;
}

type FormValues = Record<string, string | boolean>;

const initialValues = (fields: AdminField[], row: AdminRow | null): FormValues =>
  Object.fromEntries(
    fields.map((f) => {
      const value = row?.[f.name] ?? null;
      if (f.type === 'Boolean') return [f.name, value === true];
      return [f.name, value === null || f.writeOnly ? '' : String(value)];
    })
  );

/** Création / modification / suppression d'une ligne d'une table, champ par colonne (administration). */
export default function AdminRowDrawer({ isOpen, onClose, model, row }: AdminRowDrawerProps) {
  const fields = model.fields.filter((f) => !f.isId);
  const id = row ? Number(row.id) : null;
  const [initial] = useState(() => initialValues(fields, row));
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useAdminSaveRowMutation(model.name);
  const remove = useAdminDeleteRowMutation(model.name);

  const set = (name: string, value: string | boolean) => setValues((v) => ({ ...v, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Création : les champs remplis (vide = valeur par défaut) ; modification : les champs changés.
    const payload = Object.fromEntries(
      Object.entries(values).filter(([name, value]) => (id === null ? value !== '' : value !== initial[name]))
    );
    try {
      await save.mutateAsync({ id, values: payload });
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Impossible d’enregistrer la ligne.'));
    }
  };

  const handleDelete = async () => {
    if (id === null) return;
    try {
      await remove.mutateAsync(id);
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      setConfirmDelete(false);
      setError(errorMessage(err, 'Impossible de supprimer la ligne.'));
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={id === null ? `${model.name} · nouvelle ligne` : `${model.name} #${id}`}
      maxWidth="sm:max-w-lg"
      fullScreenMobile
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map((f) => {
          const label = `${f.name} · ${f.type}${f.required && !f.hasDefault ? ' *' : ''}`;
          if (f.type === 'Boolean') {
            return (
              <label key={f.name} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values[f.name] === true}
                  onChange={(e) => set(f.name, e.target.checked)}
                  className="h-4 w-4 accent-brand"
                />
                <span className="eyebrow">{label}</span>
              </label>
            );
          }
          return (
            <TextInput
              key={f.name}
              label={label}
              type={f.writeOnly ? 'password' : f.type === 'Int' || f.type === 'Float' ? 'number' : 'text'}
              step={f.type === 'Float' ? 'any' : undefined}
              autoComplete={f.writeOnly ? 'new-password' : 'off'}
              placeholder={
                f.writeOnly && id !== null
                  ? 'Inchangé si vide'
                  : f.type === 'DateTime'
                    ? '2026-10-18T12:00:00.000Z'
                    : f.hasDefault || !f.required
                      ? 'Vide : valeur par défaut / null'
                      : undefined
              }
              value={String(values[f.name])}
              onChange={(e) => set(f.name, e.target.value)}
            />
          );
        })}

        {error && <Alert>{error}</Alert>}

        <div className="flex items-center justify-between gap-3 pt-5 border-t border-neutral-200 dark:border-neutral-800">
          {id !== null ? (
            <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)}>
              Supprimer
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {id === null ? 'Créer' : 'Enregistrer'}
          </Button>
        </div>
      </form>

      <ConfirmDeleteDrawer
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        message="Supprimer la ligne"
        highlightedName={`${model.name} #${id}`}
        warningText="Les lignes qui en dépendent (cascade) seront supprimées aussi."
        onConfirm={handleDelete}
        isDeleting={remove.isPending}
      />
    </Drawer>
  );
}
