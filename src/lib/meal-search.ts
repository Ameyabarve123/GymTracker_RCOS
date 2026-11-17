type Searchable = { name: string };

/** Lowercase and strip accents so "creme" finds "Crème brûlée". */
function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Free-text search over meal names. Every word in the query must appear somewhere in the
 * name, in any order ("rice chicken" finds "Chicken rice bowl").
 */
export function searchMeals<T extends Searchable>(meals: readonly T[], query: string): T[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return meals.filter((meal) => {
    const name = normalize(meal.name);
    return words.every((word) => name.includes(word));
  });
}
