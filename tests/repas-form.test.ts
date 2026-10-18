import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analysisToValues,
  emptyValues,
  formReducer,
  parseDraft,
  repasToValues,
  serializeDraft,
  validateStep,
  valuesToPayload,
  type RepasFormState,
} from '../src/lib/repas-form';
import { repasInputSchema, repasPatchSchema } from '../src/lib/schemas';
import type { RepasWithIngredients } from '../src/types';

const start = (): RepasFormState => ({ step: 1, values: emptyValues() });

test('reducer : ingrédient ajouté une seule fois (id ou nom, casse ignorée), modifié puis retiré', () => {
  let s = formReducer(start(), { type: 'addIngredient', ingredient: { id: 1, nom: 'Tomate', categorie: 'fruits-legumes' } });
  s = formReducer(s, { type: 'addIngredient', ingredient: { id: 1, nom: 'Tomate', categorie: 'fruits-legumes' } });
  s = formReducer(s, { type: 'addIngredient', ingredient: { id: 2, nom: 'tomate', categorie: 'fruits-legumes' } });
  assert.equal(s.values.ingredients.length, 1);

  const { id } = s.values.ingredients[0];
  s = formReducer(s, { type: 'updateIngredient', id, field: 'quantite', value: '2' });
  assert.equal(s.values.ingredients[0].quantite, '2');
  s = formReducer(s, { type: 'removeIngredient', id });
  assert.equal(s.values.ingredients.length, 0);
});

test('reducer : replace revient à la première étape', () => {
  let s = formReducer(start(), { type: 'goTo', step: 3 });
  s = formReducer(s, { type: 'replace', values: { ...emptyValues(), titre: 'IA' } });
  assert.deepEqual([s.step, s.values.titre], [1, 'IA']);
});

test('validateStep : titre obligatoire à la première étape seulement', () => {
  assert.ok(validateStep(1, emptyValues()));
  assert.equal(validateStep(1, { ...emptyValues(), titre: ' Gratin ' }), null);
  assert.equal(validateStep(2, emptyValues()), null);
});

test('repasToValues -> valuesToPayload : aller-retour', () => {
  const repas = {
    id: 1,
    titre: 'Gratin',
    recette: 'Éplucher\n\nCuire',
    photoUrl: null,
    isPublic: false,
    owner: null,
    savedCount: 0,
    createdAt: new Date(),
    ingredients: [
      { id: 7, nom: 'Pomme de terre', quantite: 500, unite: 'g', categorie: 'fruits-legumes' as const },
      { id: 8, nom: 'Sel', quantite: null, unite: null, categorie: 'epicerie-salee' as const },
    ],
  } satisfies RepasWithIngredients;

  const values = repasToValues(repas);
  assert.deepEqual(values.steps.map((s) => s.text), ['Éplucher', 'Cuire']);
  assert.equal(new Set(values.steps.map((s) => s.id)).size, 2);

  const payload = valuesToPayload(values, 'https://x/y.jpg');
  assert.equal(payload.recette, 'Éplucher\nCuire');
  assert.equal(payload.photoUrl, 'https://x/y.jpg');
  assert.deepEqual(payload.ingredients, [
    { nom: 'Pomme de terre', quantite: 500, unite: 'g', categorie: 'fruits-legumes' },
    { nom: 'Sel', quantite: null, unite: null, categorie: 'epicerie-salee' },
  ]);
  assert.ok(repasInputSchema.safeParse(payload).success, 'le payload client passe la validation serveur');
});

test('valuesToPayload : quantité illisible -> null, recette vide -> null', () => {
  const values = { ...emptyValues(), titre: ' T ' };
  values.ingredients = [{ id: 'a', nom: ' Sel ', quantite: 'abc', unite: '  ', categorie: 'epicerie-salee' }];
  const payload = valuesToPayload(values, null);
  assert.equal(payload.titre, 'T');
  assert.equal(payload.recette, null);
  assert.deepEqual(payload.ingredients, [{ nom: 'Sel', quantite: null, unite: null, categorie: 'epicerie-salee' }]);
});

test('analysisToValues : réponse incomplète de l’IA -> formulaire valide', () => {
  const v = analysisToValues({ ingredients: [{ nom: 'Riz', quantite: 200, unite: 'g', categorie: 'epicerie-salee' }] });
  assert.equal(v.titre, '');
  assert.equal(v.ingredients[0].quantite, '200');
  assert.equal(v.steps.length, 1, 'au moins une étape vide');
});

test('brouillon : aller-retour, et rejet des contenus invalides', () => {
  const values = { ...emptyValues(), titre: 'Brouillon' };
  const draft = parseDraft(serializeDraft({ mode: 'manuel', step: 2, values }));
  assert.deepEqual([draft?.mode, draft?.step, draft?.values.titre], ['manuel', 2, 'Brouillon']);

  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft('pas du json'), null);
  assert.equal(parseDraft('{"mode":"autre"}'), null);
  assert.equal(parseDraft('{"mode":"manuel","step":9}')?.step, 1);
});

test('schéma PATCH : champs omis conservés (undefined), null accepté pour effacer', () => {
  const omitted = repasPatchSchema.parse({ titre: 'T' });
  assert.equal(omitted.recette, undefined);
  assert.equal(omitted.photoUrl, undefined);
  assert.equal(repasPatchSchema.parse({ photoUrl: null }).photoUrl, null);
  assert.equal(repasPatchSchema.safeParse({ titre: '  ' }).success, false);
});
