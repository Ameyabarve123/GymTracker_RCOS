const assert = require('node:assert/strict');
const { test } = require('node:test');
const { searchMeals } = require('../src/lib/meal-search.ts');

const meals = [
  { id: '1', name: 'Chicken rice bowl', meal_type: 'lunch' },
  { id: '2', name: 'Crème brûlée', meal_type: 'snack' },
  { id: '3', name: 'Oats with berries', meal_type: 'breakfast' },
  { id: '4', name: 'Chicken wrap', meal_type: 'dinner' },
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

test('meal type filter combines with the query', () => {
  assert.deepEqual(ids(searchMeals(meals, '', 'breakfast')), ['3']);
  assert.deepEqual(ids(searchMeals(meals, 'chicken', 'dinner')), ['4']);
  assert.deepEqual(ids(searchMeals(meals, 'oats', 'lunch')), []);
});
