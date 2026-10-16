import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateNeeds, uniteKeyOf } from '../src/lib/shopping-list';

test('uniteKeyOf : normalisation', () => {
  assert.equal(uniteKeyOf(null), '');
  assert.equal(uniteKeyOf('  G '), 'g');
});

test('aggregateNeeds : somme par ingrédient et unité (casse ignorée)', () => {
  const out = aggregateNeeds([
    { ingredientId: 1, unite: 'g', quantite: 100 },
    { ingredientId: 1, unite: 'G', quantite: 50 },
    { ingredientId: 1, unite: null, quantite: 2 },
    { ingredientId: 2, unite: null, quantite: null },
  ]);
  const byKey = Object.fromEntries(out.map((n) => [`${n.ingredientId}_${n.uniteKey}`, n.quantite]));
  assert.deepEqual(byKey, { '1_g': 150, '1_': 2, '2_': null });
});

test('aggregateNeeds : une quantité absente ne compte pas, sauf si toutes le sont', () => {
  const [mixed] = aggregateNeeds([
    { ingredientId: 1, unite: null, quantite: null },
    { ingredientId: 1, unite: null, quantite: 3 },
  ]);
  assert.equal(mixed.quantite, 3);
  const [none] = aggregateNeeds([
    { ingredientId: 1, unite: null, quantite: null },
    { ingredientId: 1, unite: null, quantite: null },
  ]);
  assert.equal(none.quantite, null);
});
