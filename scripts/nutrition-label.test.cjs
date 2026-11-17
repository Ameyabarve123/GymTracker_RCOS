const assert = require('node:assert/strict');
const { test } = require('node:test');
const { parseNutritionLabel, readProductName } = require('../src/lib/nutrition-label.ts');

test('US Nutrition Facts as ML Kit blocks (multi-line strings)', () => {
  const blocks = [
    'Nutrition Facts\n8 servings per container\nServing size 2/3 cup (55g)',
    'Amount per serving\nCalories 230',
    '% Daily Value*\nTotal Fat 8g 10%\nSaturated Fat 1g 5%\nTrans Fat 0g',
    'Cholesterol 0mg 0%\nSodium 160mg 7%\nTotal Carbohydrate 37g 13%\nDietary Fiber 4g 14%\nTotal Sugars 12g\nIncludes 10g Added Sugars 20%',
    'Protein 3g',
  ];
  assert.deepEqual(parseNutritionLabel(blocks), { calories: 230, protein: 3, carbs: 37, fats: 8 });
});

test('calories split across lines and OCR slips (O for 0, l for 1)', () => {
  const lines = ['Calories', '140', 'Total Fat Og 0%', 'Sat. Fat Og', 'Total Carb. 3lg', 'Protein lg'];
  assert.deepEqual(parseNutritionLabel(lines), { calories: 140, protein: 1, carbs: 31, fats: 0 });
});

test('EU table: kcal preferred over kJ, decimal commas, "of which" rows ignored', () => {
  const lines = ['Typical values per 100g', 'Energy 1,046kJ / 250kcal', 'Fat 8,5 g', 'of which saturates 1,2 g',
    'Carbohydrate 37,0 g', 'of which sugars 12 g', 'Fibre 4 g', 'Protein 6,4 g', 'Salt 0,4 g'];
  assert.deepEqual(parseNutritionLabel(lines), { calories: 250, protein: 6.4, carbs: 37, fats: 8.5 });
});

test('kJ only is converted; "Calories from Fat" is not the total', () => {
  assert.deepEqual(parseNutritionLabel(['Energy 840 kJ']), { calories: 201 });
  assert.equal(parseNutritionLabel(['Calories from Fat 70', 'Calories 250']).calories, 250);
});

test('unreadable text returns nothing rather than guesses', () => {
  assert.deepEqual(parseNutritionLabel(['Best before 12/2026', 'Store in a cool dry place']), {});
  assert.deepEqual(parseNutritionLabel([]), {});
});

test('amounts without units and a big calorie number in its own block (spinach label)', () => {
  const blocks = ['Chopped Baby Spinach', 'Nutrition Facts', 'Serving size OZ', 'Amount Per Serving\nCalories', '7', '% Daily Value*',
    'Total Fat 0\nSaturated Fat 0\nTrans Fat 0\nCholesterol 0\nSodium 22mg\nTotal Carbohydrates 1g\nDietary Fiber 0\nTotal Sugars 0\nIncludes Added Sugars\nProtein 1g',
    'Vitamin D 0\nCalcium 28mg\nIron 1mg\nPotassium 158mg'];
  assert.deepEqual(parseNutritionLabel(blocks), { calories: 7, protein: 1, carbs: 1, fats: 0 });
});

test('product name: closest plausible line above the Nutrition Facts heading', () => {
  // The spinach label as ML Kit may return it: separate blocks, or one block joining name and heading.
  assert.equal(readProductName(['Chopped Baby Spinach', 'Nutrition Facts', 'Serving size OZ']), 'Chopped Baby Spinach');
  assert.equal(readProductName(['Chopped Baby Spinach\nNutrition Facts']), 'Chopped Baby Spinach');
  // Brand on top, product just above the heading: the product wins.
  assert.equal(readProductName(['Fresh Express', 'Organic Kale Salad Kit', 'Nutrition Facts']), 'Organic Kale Salad Kit');
});

test('product name: tidies ALL CAPS and skips panel text above the heading', () => {
  assert.equal(readProductName(['GREEK YOGURT, PLAIN', 'Nutritlon Facts']), 'Greek Yogurt, Plain');
  assert.equal(readProductName(['Peanut Butter', '8 servings per container', 'NET WT 16 OZ (454g)', 'Nutrition Facts']), 'Peanut Butter');
  assert.equal(readProductName(['Whole Wheat Bread', 'Typical values per 100g', 'Nutrition Information']), 'Whole Wheat Bread');
});

test('product name: no guess without a heading or a plausible line', () => {
  assert.equal(readProductName(['Calories 230', 'Total Fat 8g']), undefined);
  assert.equal(readProductName(['Nutrition Facts', 'Calories 230']), undefined);
  assert.equal(readProductName(['12345 67', '% Daily Value', 'Nutrition Facts']), undefined);
});
