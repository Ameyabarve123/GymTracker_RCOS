const assert = require('node:assert/strict');
const { test } = require('node:test');
const { searchMeals } = require('../src/lib/meal-search.ts');

const meals = [
  { id: '1', name: 'Chicken rice bowl' },
  { id: '2', name: 'Crème brûlée' },
  { id: '3', name: 'Oats with berries' },
  { id: '4', name: 'Chicken wrap' },
];
const ids = (list) => list.map((m) => m.id);

test('empty query returns every meal in its original order', () => {
  assert.deepEqual(ids(searchMeals(meals, '   ')), ['1', '2', '3', '4']);
});

test('matching ignores case, accents and word order', () => {
  assert.deepEqual(ids(searchMeals(meals, 'CHICKEN')), ['1', '4']);
  assert.deepEqual(ids(searchMeals(meals, 'creme brulee')), ['2']);
  assert.deepEqual(ids(searchMeals(meals, 'rice chicken')), ['1']);
  assert.deepEqual(ids(searchMeals(meals, 'chicken salad')), []);
});
