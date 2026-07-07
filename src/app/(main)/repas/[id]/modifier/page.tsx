'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Camera,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowLeft,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';
import { CategorieIngredient, RepasWithIngredients } from '@/types';
import { useUploadThing } from '@/lib/uploadthing';
import { compressImage } from '@/lib/image-compression';
import IngredientSearchInput, { IngredientSuggestion } from '@/components/IngredientSearchInput';
import IngredientRow, { IngredientRowItem } from '@/components/IngredientRow';
import CreateIngredientDrawer from '@/components/CreateIngredientDrawer';

interface StepItem {
  id: string;
  text: string;
}

export default function ModifierRepasPage() {
  const router = useRouter();
  const params = useParams();
  const repasId = params?.id as string;

  const [initialLoading, setInitialLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Titre & Photo
  const [titre, setTitre] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  // Step 2: Ingrédients du repas
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientRowItem[]>([]);

  // Drawer de création d'ingrédient manquant
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [newIngredientInitialName, setNewIngredientInitialName] = useState('');

  // Step 3: Étapes de recette
  const [steps, setSteps] = useState<StepItem[]>([{ id: 'init-step-1', text: '' }]);

  // Uploadthing setup
  const { startUpload, isUploading } = useUploadThing('imageUploader', {
    onUploadError: (err) => {
      setError(`Erreur lors de l'envoi de l'image: ${err.message}`);
    },
  });

  // --- Load existing meal data ---
  useEffect(() => {
    if (!repasId) return;

    const fetchRepas = async () => {
      try {
        setInitialLoading(true);
        const res = await fetch(`/api/repas/${repasId}`);
        if (!res.ok) {
          throw new Error('Repas introuvable ou accès non autorisé.');
        }
        const data: RepasWithIngredients = await res.json();

        setTitre(data.titre);
        setPhotoUrl(data.photoUrl ?? null);

        setSelectedIngredients(
          data.ingredients.map((ing) => ({
            id: Math.random().toString(),
            ingredientId: ing.id,
            nom: ing.nom,
            quantite: ing.quantite !== null && ing.quantite !== undefined ? String(ing.quantite) : '',
            unite: ing.unite ?? '',
            categorie: ing.categorie as CategorieIngredient,
          }))
        );

        if (data.recette) {
          const lines = data.recette.split('\n').filter((l) => l.trim() !== '');
          setSteps(
            lines.length > 0
              ? lines.map((text) => ({ id: Math.random().toString(), text }))
              : [{ id: 'init-step-1', text: '' }]
          );
        } else {
          setSteps([{ id: 'init-step-1', text: '' }]);
        }
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement du repas.');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchRepas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repasId]);

  // Image Drag & Drop
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setSelectedImageFile(file);
      setLocalPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
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
  };

  // Add selected ingredient
  const handleSelectIngredient = (ing: IngredientSuggestion) => {
    if (
      selectedIngredients.some(
        (item) => item.ingredientId === ing.id || item.nom.toLowerCase() === ing.nom.toLowerCase()
      )
    ) {
      return;
    }

    setSelectedIngredients([
      ...selectedIngredients,
      {
        id: Math.random().toString(),
        ingredientId: ing.id,
        nom: ing.nom,
        quantite: '',
        unite: '',
        categorie: ing.categorie as CategorieIngredient,
      },
    ]);
  };

  const handleRemoveIngredient = (id: string) =>
    setSelectedIngredients(selectedIngredients.filter((ing) => ing.id !== id));

  const updateMealIngredient = (id: string, field: 'quantite' | 'unite', value: string) =>
    setSelectedIngredients(selectedIngredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)));

  // Trigger Creation Drawer
  const openCreateIngredientDrawer = (name: string) => {
    setNewIngredientInitialName(name);
    setIsCreateDrawerOpen(true);
  };

  // Handle ingredient created in drawer
  const handleIngredientCreated = (createdIngredient: IngredientSuggestion) => {
    handleSelectIngredient(createdIngredient);
  };

  // Step 3 helpers
  const handleAddStep = () => setSteps([...steps, { id: Math.random().toString(), text: '' }]);

  const handleRemoveStep = (id: string) => setSteps(steps.filter((s) => s.id !== id));

  const handleUpdateStep = (id: string, value: string) =>
    setSteps(steps.map((s) => (s.id === id ? { ...s, text: value } : s)));

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setSteps(newSteps);
  };

  // Navigation validation
  const validateStep = () => {
    setError(null);
    if (step === 1 && !titre.trim()) {
      setError('Le titre du repas est obligatoire.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep((prev) => (prev + 1) as 1 | 2 | 3);
  };

  const handlePrev = () => {
    setError(null);
    setStep((prev) => (prev - 1) as 1 | 2 | 3);
  };

  // Submit update (PATCH)
  const handleSubmit = async () => {
    if (!validateStep()) return;

    try {
      setLoading(true);
      setError(null);

      let finalPhotoUrl = photoUrl;
      if (selectedImageFile) {
        try {
          console.log("Début de la compression de l'image (modifier):", selectedImageFile.name, `${(selectedImageFile.size / 1024).toFixed(1)} Ko`);
          const compressedFile = await compressImage(selectedImageFile);
          console.log("Image compressée avec succès (modifier):", compressedFile.name, `${(compressedFile.size / 1024).toFixed(1)} Ko`);

          console.log("Début de l'envoi de l'image (modifier):", {
            name: compressedFile.name,
            size: compressedFile.size,
            type: compressedFile.type
          });
          const uploadRes = await startUpload([compressedFile]);
          console.log("Résultat brut du téléversement (modifier):", uploadRes);

          if (uploadRes && uploadRes[0]) {
            finalPhotoUrl = uploadRes[0].url;
            console.log("URL de l'image obtenue avec succès (modifier):", finalPhotoUrl);
          } else {
            console.error("Aucune réponse ou réponse vide d'Uploadthing (modifier):", uploadRes);
            throw new Error("Le stockage n'a pas pu renvoyer d'adresse URL.");
          }
        } catch (err: any) {
          console.error("Erreur attrapée pendant la compression ou startUpload (modifier):", err);
          throw new Error(`Échec du traitement/téléversement de l'image: ${err.message || err}`);
        }
      }

      const mappedIngredients = selectedIngredients.map((ing) => ({
        nom: ing.nom.trim(),
        quantite: ing.quantite.trim() ? parseFloat(ing.quantite) : null,
        unite: ing.unite.trim() || null,
        categorie: ing.categorie,
      }));

      const cleanRecette = steps
        .map((s) => s.text.trim())
        .filter((text) => text !== '')
        .join('\n');

      const body = {
        titre: titre.trim(),
        recette: cleanRecette || null,
        photoUrl: finalPhotoUrl ?? null,
        ingredients: mappedIngredients,
      };

      const res = await fetch(`/api/repas/${repasId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour du repas.');
      }

      router.push('/repas');
    } catch (err: any) {
      setError(err.message || 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  // --- Loading skeleton ---
  if (initialLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
          <div className="space-y-2">
            <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
            <div className="h-7 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
          </div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-neutral-200/40 dark:border-neutral-800/40 rounded-card shadow-xs p-6 md:p-8 space-y-6">
          <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
          <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full" />
          <div className="h-12 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-40 w-full bg-neutral-200 dark:bg-neutral-800 rounded-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/repas"
          className="p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-text-light-muted dark:text-text-dark-muted transition-colors active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <span className="text-xs font-bold text-text-light-muted dark:text-text-dark-muted uppercase tracking-wider">
            Mes recettes
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light-main dark:text-text-dark-main flex items-center gap-2">
            <Pencil className="h-6 w-6 text-brand" />
            Modifier le repas
          </h1>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-card-light dark:bg-card-dark border border-neutral-200/40 dark:border-neutral-800/40 rounded-card shadow-xs p-6 md:p-8 space-y-6">

        {/* Step Indicator Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800/20">
          <span className="font-extrabold text-sm text-text-light-main dark:text-text-dark-main">
            Étape {step} sur 3
          </span>
          <span className="text-xs font-bold text-text-light-muted dark:text-text-dark-muted">
            {step === 1 ? 'Identité du repas' : step === 2 ? 'Ingrédients requis' : 'Mode de préparation'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-100 dark:bg-neutral-800/60 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-brand h-full transition-all duration-500 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 text-sm font-semibold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/40 animate-fade-in">
            {error}
          </div>
        )}

        {/* STEP 1: Title and Photo */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-light-main dark:text-text-dark-main">
                Nom du repas *
              </label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Ex: Tarte tatin, Filet mignon..."
                className="w-full px-5 py-3 text-sm transition-all border outline-none bg-bg-light dark:bg-bg-dark border-neutral-200 dark:border-neutral-800 rounded-xl focus:border-brand dark:focus:border-brand focus:ring-1 focus:ring-brand text-text-light-main dark:text-text-dark-main placeholder:text-text-light-muted dark:placeholder:text-text-dark-muted font-semibold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-text-light-main dark:text-text-dark-main">
                Image d&apos;illustration (Optionnel)
              </label>

              {(localPreviewUrl || photoUrl) ? (
                <div className="relative w-full aspect-video rounded-card overflow-hidden group border border-neutral-200/30 dark:border-neutral-800/30">
                  <img
                    src={localPreviewUrl || photoUrl || ''}
                    alt="Aperçu"
                    className="w-full h-full object-cover"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                      <span className="text-xs font-bold text-white animate-pulse">
                        Téléversement en cours...
                      </span>
                    </div>
                  )}
                  {!isUploading && (
                    <div className="absolute inset-0 bg-black/45 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-white text-black text-xs font-bold rounded-input shadow-md hover:bg-neutral-100 transition-colors cursor-pointer"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImageFile(null);
                          setPhotoUrl(null);
                          if (localPreviewUrl) {
                            URL.revokeObjectURL(localPreviewUrl);
                            setLocalPreviewUrl(null);
                          }
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-input shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-card p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[200px] ${
                    isDragging
                      ? 'border-brand bg-brand-light/30 dark:bg-brand/5 scale-[1.01]'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-brand/40 bg-neutral-50/50 dark:bg-neutral-800/10'
                  }`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-10 w-10 text-brand animate-spin" />
                      <span className="text-xs font-bold text-text-light-muted dark:text-text-dark-muted animate-pulse">
                        Téléversement de la photo...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-white dark:bg-neutral-800 rounded-full shadow-xs border border-neutral-100 dark:border-neutral-800 text-text-light-muted dark:text-text-dark-muted mb-3">
                        <Camera className="h-6 w-6 stroke-[1.5]" />
                      </div>
                      <span className="text-sm font-bold text-text-light-main dark:text-text-dark-main">
                        <span className="hidden md:inline">Glissez-déposez une image ou c</span>
                        <span className="md:hidden">C</span>
                        liquez pour parcourir
                      </span>
                      <span className="text-[11px] text-text-light-muted dark:text-text-dark-muted mt-1.5 font-medium">
                        Formats acceptés : PNG, JPG, WEBP
                      </span>
                    </>
                  )}
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={isUploading}
              />
            </div>
          </div>
        )}

        {/* STEP 2: Ingredients */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">

            {/* Ingredient search autocomplete */}
            <IngredientSearchInput
              onSelect={handleSelectIngredient}
              onCreateNew={openCreateIngredientDrawer}
              existingIngredients={selectedIngredients}
            />

            {/* Selected ingredients list */}
            <div className="space-y-3">
              <span className="text-sm font-bold text-text-light-main dark:text-text-dark-main block">
                Ingrédients dans cette recette ({selectedIngredients.length})
              </span>

              {selectedIngredients.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/10 dark:bg-neutral-800/5">
                  <p className="text-xs font-semibold text-text-light-muted dark:text-text-dark-muted">
                    Aucun ingrédient sélectionné. Utilisez la barre de recherche ci-dessus pour les ajouter.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/40">
                  {selectedIngredients.map((ing) => (
                    <IngredientRow
                      key={ing.id}
                      ingredient={ing}
                      onChange={updateMealIngredient}
                      onRemove={handleRemoveIngredient}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Recipe Steps */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-text-light-main dark:text-text-dark-main">
                Étapes de préparation ({steps.length})
              </span>
            </div>

            <div className="space-y-4">
              {steps.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex gap-3 items-start py-3 border-b border-neutral-100 dark:border-neutral-800/40 animate-fade-in"
                >
                  <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-brand-light dark:bg-brand/10 text-brand text-xs font-extrabold border border-brand/15 mt-1.5">
                    {idx + 1}
                  </span>

                  <textarea
                    value={s.text}
                    onChange={(e) => handleUpdateStep(s.id, e.target.value)}
                    placeholder={`Description de l'étape ${idx + 1}...`}
                    rows={4}
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-800 rounded-xl bg-card-light dark:bg-card-dark text-text-light-main dark:text-text-dark-main outline-none focus:border-brand font-medium min-h-[96px] resize-y"
                  />

                  <div className="flex flex-col gap-1.5 shrink-0 mt-1">
                    <button
                      type="button"
                      onClick={() => handleMoveStep(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded-lg text-text-light-muted dark:text-text-dark-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Monter"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveStep(idx, 'down')}
                      disabled={idx === steps.length - 1}
                      className="p-1 rounded-lg text-text-light-muted dark:text-text-dark-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Descendre"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveStep(s.id)}
                      className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddStep}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl hover:border-brand/40 text-text-light-muted dark:text-text-dark-muted hover:text-brand font-bold text-sm transition-all duration-300 active:scale-98 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter une étape</span>
            </button>
          </div>
        )}

        {/* Footer controls */}
        <div className="flex flex-col gap-2.5 pt-6 border-t border-neutral-100 dark:border-neutral-800/40 mt-4 w-full">
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 rounded-input active:scale-95 transition-all duration-300 cursor-pointer shadow-xs"
            >
              <span>Suivant</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-extrabold bg-brand hover:bg-brand-hover text-white rounded-input active:scale-95 transition-all duration-300 cursor-pointer shadow-md shadow-brand/20 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{selectedImageFile && !photoUrl ? "Envoi de l'image..." : 'Enregistrement...'}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Enregistrer les modifications</span>
                </>
              )}
            </button>
          )}

          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold border border-neutral-200 dark:border-neutral-800 rounded-input hover:bg-neutral-50 dark:hover:bg-neutral-800 text-text-light-main dark:text-text-dark-main active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Précédent</span>
            </button>
          ) : (
            <Link
              href="/repas"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold border border-neutral-200 dark:border-neutral-800 rounded-input hover:bg-neutral-50 dark:hover:bg-neutral-800 text-text-light-main dark:text-text-dark-main active:scale-95 transition-all duration-300 cursor-pointer text-center"
            >
              <span>Annuler</span>
            </Link>
          )}
        </div>
      </div>

      {/* Drawer for creating missing ingredient */}
      <CreateIngredientDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        initialName={newIngredientInitialName}
        onCreated={handleIngredientCreated}
      />

    </div>
  );
}
