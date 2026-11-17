import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Meal, MealType, SavedMeal } from '@/types/database';

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type DailyLogData = {
  dateKey: string;
  meals: Meal[];
  totals: MacroTotals;
};

export type MealInput = {
  name: string;
  meal_type: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  photo_url?: string | null;
  saveAsTemplate?: boolean;
};

function sumMacros(meals: Meal[]): MacroTotals {
  return meals.reduce<MacroTotals>(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fats: acc.fats + m.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

async function ensureDailyLog(userId: string, dateKey: string): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('log_date', dateKey)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing.id;

  const { data: inserted, error: insErr } = await supabase
    .from('daily_logs')
    .insert({ user_id: userId, log_date: dateKey })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return inserted.id;
}

export function useDailyLog(dateKey: string) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['daily-log', userId, dateKey],
    enabled: !!userId,
    queryFn: async (): Promise<DailyLogData> => {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('id, log_date, meals(*)')
        .eq('user_id', userId!)
        .eq('log_date', dateKey)
        .maybeSingle();
      if (error) throw error;

      const meals = ((data?.meals as Meal[] | undefined) ?? []).sort((a, b) =>
        a.logged_at.localeCompare(b.logged_at)
      );
      return { dateKey, meals, totals: sumMacros(meals) };
    },
  });
}

export function useAddMeal(dateKey: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: MealInput) => {
      const logId = await ensureDailyLog(userId!, dateKey);
      const { saveAsTemplate, ...mealFields } = input;

      const { data, error } = await supabase
        .from('meals')
        .insert({
          daily_log_id: logId,
          user_id: userId!,
          name: mealFields.name,
          meal_type: mealFields.meal_type,
          calories: mealFields.calories,
          protein: mealFields.protein,
          carbs: mealFields.carbs,
          fats: mealFields.fats,
          photo_url: mealFields.photo_url ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;

      if (saveAsTemplate) {
        // Saved meals are not tied to a section; you pick breakfast/lunch/… when logging one.
        await supabase.from('saved_meals').insert({
          user_id: userId!,
          name: mealFields.name,
          calories: mealFields.calories,
          protein: mealFields.protein,
          carbs: mealFields.carbs,
          fats: mealFields.fats,
          photo_url: mealFields.photo_url ?? null,
        });
      }

      // Update streak for the day being logged.
      await supabase.rpc('touch_streak', { p_date: dateKey });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-log', userId, dateKey] });
      qc.invalidateQueries({ queryKey: ['profile', userId] });
      qc.invalidateQueries({ queryKey: ['saved-meals', userId] });
      qc.invalidateQueries({ queryKey: ['recent-meals', userId] });
    },
  });
}

/** Edits an already-logged meal in place — used to move it to another section, or change its values. */
export function useUpdateMeal(dateKey: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Meal, 'meal_type' | 'name' | 'calories' | 'protein' | 'carbs' | 'fats' | 'photo_url'>>;
    }) => {
      const { error } = await supabase.from('meals').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-log', userId, dateKey] });
      qc.invalidateQueries({ queryKey: ['recent-meals', userId] });
    },
  });
}

export function useDeleteMeal(dateKey: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase.from('meals').delete().eq('id', mealId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-log', userId, dateKey] });
    },
  });
}

export function useSavedMeals() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['saved-meals', userId],
    enabled: !!userId,
    queryFn: async (): Promise<SavedMeal[]> => {
      const { data, error } = await supabase
        .from('saved_meals')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Most recently logged meals (de-duplicated by name) for quick re-adding. */
export function useRecentMeals() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['recent-meals', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Meal[]> => {
      // Only meals logged in the last 24 hours, so stale entries drop off after a day.
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', userId!)
        .gte('logged_at', since)
        .order('logged_at', { ascending: false })
        .limit(30);
      if (error) throw error;

      const seen = new Set<string>();
      const unique: Meal[] = [];
      for (const meal of data ?? []) {
        const key = meal.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(meal);
        if (unique.length >= 10) break;
      }
      return unique;
    },
  });
}

/** Creates a saved-meal template directly (not logged to any day). */
export function useCreateSavedMeal() {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (meal: { name: string; calories: number; protein: number; carbs: number; fats: number; photo_url: string | null }) => {
      const { error } = await supabase.from('saved_meals').insert({ user_id: userId!, ...meal });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-meals', userId] }),
  });
}

/** Edits a saved meal's name or macros in place. */
export function useUpdateSavedMeal() {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<SavedMeal, 'name' | 'calories' | 'protein' | 'carbs' | 'fats' | 'photo_url'>>;
    }) => {
      const { error } = await supabase.from('saved_meals').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-meals', userId] }),
  });
}

export function useDeleteSavedMeal() {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_meals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-meals', userId] }),
  });
}
