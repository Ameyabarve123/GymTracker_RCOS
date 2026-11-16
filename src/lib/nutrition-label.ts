/**
 * Best-effort reader for OCR text from a nutrition label (US "Nutrition Facts" or EU/UK
 * "Nutrition information" tables). Returns only what it is reasonably sure of; the user
 * always reviews the filled-in values before saving.
 */
export type LabelValues = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
};

export type LabelField = keyof LabelValues;

const LIMITS: Record<LabelField, number> = { calories: 5000, protein: 500, carbs: 500, fats: 500 };

/** Fixes common OCR slips and turns decimal commas into dots, leaving thousands separators out. */
function clean(line: string): string {
  return line
    .toLowerCase()
    .replace(/(\d),(\d{3})(?!\d)/g, '$1$2') // 1,046 kJ -> 1046 kJ
    .replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2') // 2,5 g -> 2.5 g
    .replace(/\b[o](?=\s*m?g\b)/g, '0') // "Og" / "O g" -> 0g
    .replace(/(\d)o\b/g, '$10') // "1Og" read as "1o" -> 10
    .replace(/(\d)[il|](?=\s*g\b)/g, '$11') // "3lg" -> 31g
    .replace(/\b[il|](?=\s*g\b)/g, '1') // "lg" -> 1g
    .replace(/\s+/g, ' ')
    .trim();
}

/** A number not followed by "%" (skips % Daily Value), optionally with a unit. */
const AMOUNT = /(\d+(?:\.\d+)?)\s*(kcal|kj|mg|g)?(?!\s*\d)(?!\s*%)/g;

function amountsIn(text: string): { value: number; unit?: string }[] {
  return [...text.matchAll(AMOUNT)].map((m) => ({ value: Number(m[1]), unit: m[2] }));
}

/** First gram amount after the keyword on this line, else a bare number starting the next line. */
function gramsAfter(lines: string[], index: number, keyword: RegExp): number | undefined {
  const line = lines[index];
  const match = keyword.exec(line);
  const rest = match ? line.slice(match.index + match[0].length) : line;
  const amounts = amountsIn(rest).filter((a) => a.unit !== 'mg' && a.unit !== 'kcal' && a.unit !== 'kj');
  const grams = amounts.find((a) => a.unit === 'g') ?? amounts[0];
  if (grams) return grams.value;
  const next = lines[index + 1]?.match(/^(\d+(?:\.\d+)?)\s*g?\b(?!\s*%)/);
  return next ? Number(next[1]) : undefined;
}

const FIELDS: { field: Exclude<LabelField, 'calories'>; keyword: RegExp; skip?: RegExp }[] = [
  { field: 'protein', keyword: /\bprotein[s]?\b/ },
  { field: 'carbs', keyword: /\b(?:total )?carb(?:ohydrate)?s?\b\.?/, skip: /\bfib(?:er|re)\b/ },
  {
    field: 'fats',
    keyword: /\b(?:total )?fats?\b/,
    // Sub-rows and "Calories from Fat" are not the total.
    skip: /saturat|\bsat\b|trans|unsat|calories from/,
  },
];

function readCalories(lines: string[]): number | undefined {
  // An explicit kcal figure is the most reliable (EU labels list kJ first).
  for (const line of lines) {
    const kcal = amountsIn(line).find((a) => a.unit === 'kcal');
    if (kcal) return kcal.value;
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\bcalories\b|\benergy\b/.test(line) || /from fat/.test(line)) continue;
    const after = line.slice(line.search(/\bcalories\b|\benergy\b/));
    const amounts = amountsIn(after);
    const kj = amounts.find((a) => a.unit === 'kj');
    const plain = amounts.find((a) => !a.unit);
    if (plain) return plain.value;
    if (kj) return Math.round(kj.value / 4.184);
    // Big "Calories   230" often lands on two OCR lines.
    const next = lines[i + 1]?.match(/^(\d+)\b(?!\s*%)/);
    if (next) return Number(next[1]);
  }
  return undefined;
}

export function parseNutritionLabel(texts: readonly string[]): LabelValues {
  const lines = texts.flatMap((t) => t.split(/\r?\n/)).map(clean).filter(Boolean);
  const values: LabelValues = {};

  const calories = readCalories(lines);
  if (calories !== undefined) values.calories = calories;

  for (const { field, keyword, skip } of FIELDS) {
    for (let i = 0; i < lines.length; i++) {
      if (!keyword.test(lines[i]) || skip?.test(lines[i])) continue;
      const grams = gramsAfter(lines, i, keyword);
      if (grams !== undefined) {
        values[field] = grams;
        break;
      }
    }
  }

  for (const field of Object.keys(values) as LabelField[]) {
    const value = values[field]!;
    if (!Number.isFinite(value) || value < 0 || value > LIMITS[field]) delete values[field];
  }
  return values;
}
