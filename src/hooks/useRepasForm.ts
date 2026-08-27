'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUploadThing } from '@/lib/uploadthing';
import { compressImage } from '@/lib/image-compression';
import { CategorieIngredient } from '@/types';
import type { IngredientSuggestion } from '@/components/IngredientSearchInput';
import type { IngredientRowItem } from '@/components/IngredientRow';
import type { StepItem } from '@/components/SortableStepsList';

export type { IngredientSuggestion, IngredientRowItem, StepItem };

/** Ingrédient formaté pour l'envoi à l'API */
export interface MappedIngredient {
  nom: string;
  quantite: number | null;
  unite: string | null;
  categorie: CategorieIngredient;
}

/** Tout l'état exposé par le hook */
export interface RepasFormState {
  step: 1 | 2 | 3;
  error: string | null;
  loading: boolean;
  // Étape 1 – Titre & Photo
  titre: string;
  photoUrl: string | null;
  localPreviewUrl: string | null;
  selectedImageFile: File | null;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  // Étape 2 – Ingrédients
  selectedIngredients: IngredientRowItem[];
  isCreateDrawerOpen: boolean;
  newIngredientInitialName: string;
  // Étape 3 – Instructions
  steps: StepItem[];
}

/** Tous les handlers et setters exposés par le hook */
export interface RepasFormHandlers {
  // Image
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  removeImage: () => void;
  // Navigation entre étapes
  handleNext: () => void;
  handlePrev: () => void;
  // Ingrédients
  handleSelectIngredient: (ing: IngredientSuggestion) => void;
  handleRemoveIngredient: (id: string) => void;
  updateMealIngredient: (id: string, field: 'quantite' | 'unite', value: string) => void;
  openCreateIngredientDrawer: (name: string) => void;
  handleIngredientCreated: (ing: IngredientSuggestion) => void;
  // Setters exposés (pré-remplissage depuis l'API ou l'IA)
  setSteps: React.Dispatch<React.SetStateAction<StepItem[]>>;
  setTitre: React.Dispatch<React.SetStateAction<string>>;
  setPhotoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedIngredients: React.Dispatch<React.SetStateAction<IngredientRowItem[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  setIsCreateDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Helpers de soumission (utilisés dans les handleSubmit des pages)
  uploadImageIfNeeded: () => Promise<string | null>;
  buildSubmitPayload: () => { titre: string; recette: string | null; ingredients: MappedIngredient[] };
  // Reset complet (retour à l'écran de sélection du mode)
  reset: () => void;
}

export type RepasFormReturn = RepasFormState & RepasFormHandlers;

/**
 * Hook centralisant toute la logique partagée entre les pages
 * "Nouveau repas" et "Modifier un repas".
 */
export function useRepasForm(): RepasFormReturn {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 1 – Titre & Photo
  const [titre, setTitre] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Étape 2 – Ingrédients
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientRowItem[]>([]);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [newIngredientInitialName, setNewIngredientInitialName] = useState('');

  // Étape 3 – Instructions
  const [steps, setSteps] = useState<StepItem[]>([{ id: crypto.randomUUID(), text: '' }]);

  const { startUpload, isUploading } = useUploadThing('imageUploader', {
    onUploadError: (err) => {
      setError(`Erreur lors de l'envoi de l'image: ${err.message}`);
    },
  });

  // Libération de l'URL objet au démontage pour éviter les fuites mémoire
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  // ── Handlers image ──────────────────────────────────────────────────────────

  const removeImage = useCallback(() => {
    setSelectedImageFile(null);
    setPhotoUrl(null);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [localPreviewUrl]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setError(null);
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        setSelectedImageFile(file);
        setLocalPreviewUrl(URL.createObjectURL(file));
      }
    },
    [localPreviewUrl]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        setError(null);
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        setSelectedImageFile(file);
        setLocalPreviewUrl(URL.createObjectURL(file));
      } else {
        setError("Seuls les fichiers d'image sont acceptés.");
      }
    },
    [localPreviewUrl]
  );

  // ── Handlers ingrédients ────────────────────────────────────────────────────

  const handleSelectIngredient = useCallback((ing: IngredientSuggestion) => {
    setSelectedIngredients((prev) => {
      if (
        prev.some(
          (item) =>
            item.ingredientId === ing.id ||
            item.nom.toLowerCase() === ing.nom.toLowerCase()
        )
      ) {
        return prev;
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          ingredientId: ing.id,
          nom: ing.nom,
          quantite: '',
          unite: '',
          categorie: ing.categorie as CategorieIngredient,
        },
      ];
    });
  }, []);

  const handleRemoveIngredient = useCallback((id: string) => {
    setSelectedIngredients((prev) => prev.filter((ing) => ing.id !== id));
  }, []);

  const updateMealIngredient = useCallback(
    (id: string, field: 'quantite' | 'unite', value: string) => {
      setSelectedIngredients((prev) =>
        prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
      );
    },
    []
  );

  const openCreateIngredientDrawer = useCallback((name: string) => {
    setNewIngredientInitialName(name);
    setIsCreateDrawerOpen(true);
  }, []);

  const handleIngredientCreated = useCallback(
    (createdIngredient: IngredientSuggestion) => {
      handleSelectIngredient(createdIngredient);
    },
    [handleSelectIngredient]
  );

  // ── Navigation entre étapes ─────────────────────────────────────────────────

  const validateStep = useCallback(
    (currentStep: number): boolean => {
      setError(null);
      if (currentStep === 1 && !titre.trim()) {
        setError('Le titre du repas est obligatoire.');
        return false;
      }
      return true;
    },
    [titre]
  );

  const handleNext = useCallback(() => {
    if (validateStep(step)) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3);
    }
  }, [validateStep, step]);

  const handlePrev = useCallback(() => {
    setError(null);
    setStep((prev) => (prev - 1) as 1 | 2 | 3);
  }, []);

  // ── Helpers de soumission ───────────────────────────────────────────────────

  /**
   * Compresse l'image sélectionnée et la téléverse via UploadThing.
   * Retourne l'URL finale (nouvelle si fichier sélectionné, existante sinon).
   * Lève une erreur si le téléversement échoue.
   */
  const uploadImageIfNeeded = useCallback(async (): Promise<string | null> => {
    if (!selectedImageFile) return photoUrl;

    const compressedFile = await compressImage(selectedImageFile);

    const uploadRes = await startUpload([compressedFile]);

    if (uploadRes && uploadRes[0]) {
      return uploadRes[0].url;
    }

    console.error("Aucune réponse ou réponse vide d'Uploadthing:", uploadRes);
    throw new Error("Le stockage n'a pas pu renvoyer d'adresse URL.");
  }, [selectedImageFile, photoUrl, startUpload]);

  /**
   * Construit le payload commun (titre, recette, ingrédients) prêt à être
   * envoyé à l'API (POST création ou PATCH mise à jour).
   */
  const buildSubmitPayload = useCallback(() => {
    const ingredients: MappedIngredient[] = selectedIngredients.map((ing) => ({
      nom: ing.nom.trim(),
      quantite: ing.quantite.trim() ? parseFloat(ing.quantite) : null,
      unite: ing.unite.trim() || null,
      categorie: ing.categorie,
    }));

    const cleanRecette = steps
      .map((s) => s.text.trim())
      .filter((text) => text !== '')
      .join('\n');

    return {
      titre: titre.trim(),
      recette: cleanRecette || null,
      ingredients,
    };
  }, [selectedIngredients, steps, titre]);

  // ── Reset complet ───────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep(1);
    setError(null);
    setLoading(false);
    setTitre('');
    // removeImage n'est pas utilisé ici pour éviter une dépendance cyclique
    setSelectedImageFile(null);
    setPhotoUrl(null);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelectedIngredients([]);
    setSteps([{ id: crypto.randomUUID(), text: '' }]);
  }, [localPreviewUrl]);

  return {
    // State
    step,
    error,
    loading,
    titre,
    photoUrl,
    localPreviewUrl,
    selectedImageFile,
    isDragging,
    fileInputRef,
    isUploading,
    selectedIngredients,
    isCreateDrawerOpen,
    newIngredientInitialName,
    steps,
    // Handlers
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeImage,
    handleNext,
    handlePrev,
    handleSelectIngredient,
    handleRemoveIngredient,
    updateMealIngredient,
    openCreateIngredientDrawer,
    handleIngredientCreated,
    // Setters
    setSteps,
    setTitre,
    setPhotoUrl,
    setSelectedIngredients,
    setError,
    setLoading,
    setStep,
    setIsCreateDrawerOpen,
    // Helpers
    uploadImageIfNeeded,
    buildSubmitPayload,
    reset,
  };
}
