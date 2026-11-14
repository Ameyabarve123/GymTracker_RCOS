import type { MealType } from '@/types/database';

type Searchable = { name: string; meal_type: MealType };

/** Lowercase and strip accents so "creme" finds "Crème brûlée". */
function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Filters meals by meal type and a free-text query. Every word in the query must
 * appear somewhere in the name, in any order ("rice chicken" finds "Chicken rice bowl").
 */
export function searchMeals<T extends Searchable>(meals: readonly T[], query: string, type: MealType | 'all' = 'all'): T[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return meals.filter((meal) => {
    if (type !== 'all' && meal.meal_type !== type) return false;
    const name = normalize(meal.name);
    return words.every((word) => name.includes(word));
  });
}
