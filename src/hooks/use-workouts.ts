import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Exercise, ExerciseSet, Workout, WorkoutExercise } from '@/types/database';

export type WorkoutExerciseWithData = WorkoutExercise & {
  exercise: Pick<Exercise, 'id' | 'name' | 'muscle_group'> | null;
  exercise_sets: ExerciseSet[];
};

export type WorkoutWithData = Workout & {
  workout_exercises: WorkoutExerciseWithData[];
};

/** Date keys (yyyy-MM-dd) that have at least one workout, for calendar markers. */
export function useWorkoutDates(fromKey: string, toKey: string) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['workout-dates', userId, fromKey, toKey],
    enabled: !!userId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('workout_date')
        .eq('user_id', userId!)
        .gte('workout_date', fromKey)
        .lte('workout_date', toKey);
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((w) => w.workout_date)));
    },
  });
}

export function useWorkoutDay(dateKey: string) {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['workout-day', userId, dateKey],
    enabled: !!userId,
    queryFn: async (): Promise<WorkoutWithData[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select(
          'id, user_id, preset_id, name, workout_date, notes, created_at, ' +
            'workout_exercises(id, workout_id, exercise_id, order_index, ' +
            'exercise:exercises(id, name, muscle_group), ' +
            'exercise_sets(*))'
        )
        .eq('user_id', userId!)
        .eq('workout_date', dateKey)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const workouts = (data ?? []) as unknown as WorkoutWithData[];
      for (const w of workouts) {
        w.workout_exercises.sort((a, b) => a.order_index - b.order_index);
        for (const we of w.workout_exercises) {
          we.exercise_sets.sort((a, b) => a.order_index - b.order_index);
        }
      }
      return workouts;
    },
  });
}

export function useCreateWorkout(dateKey: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; presetId?: string | null }) => {
      const { data: workout, error } = await supabase
        .from('workouts')
        .insert({
          user_id: userId!,
          name: input.name,
          workout_date: dateKey,
          preset_id: input.presetId ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;

      // If created from a preset, copy its exercises in as workout_exercises.
      if (input.presetId) {
        const { data: presetExercises, error: peErr } = await supabase
          .from('preset_exercises')
          .select('exercise_id, order_index')
          .eq('preset_id', input.presetId)
          .order('order_index', { ascending: true });
        if (peErr) throw peErr;

        if (presetExercises && presetExercises.length > 0) {
          const { error: weErr } = await supabase.from('workout_exercises').insert(
            presetExercises.map((pe) => ({
              workout_id: workout.id,
              exercise_id: pe.exercise_id,
              order_index: pe.order_index,
            }))
          );
          if (weErr) throw weErr;
        }
      }

      await supabase.rpc('touch_streak', { p_date: dateKey });
      return workout;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-day', userId, dateKey] });
      qc.invalidateQueries({ queryKey: ['workout-dates'] });
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}

export function useAddWorkoutExercise(dateKey: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { workoutId: string; exerciseId: string; orderIndex: number }) => {
      const { error } = await supabase.from('workout_exercises').insert({
        workout_id: input.workoutId,
        exercise_id: input.exerciseId,
        order_index: input.orderIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-day', userId, dateKey] }),
  });
}

export function useAddSet(dateKey: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      workoutExerciseId: string;
      setNumber: number;
      reps: number;
      weight: number;
      isDropset?: boolean;
    }) => {
      const { error } = await supabase.from('exercise_sets').insert({
        workout_exercise_id: input.workoutExerciseId,
        set_number: input.setNumber,
        reps: input.reps,
        weight: input.weight,
        is_dropset: input.isDropset ?? false,
        order_index: input.setNumber,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-day', userId, dateKey] }),
  });
}

export function useUpdateSet(dateKey: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<ExerciseSet> }) => {
      const { error } = await supabase
        .from('exercise_sets')
        .update(input.patch)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-day', userId, dateKey] }),
  });
}

export function useDeleteSet(dateKey: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercise_sets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-day', userId, dateKey] }),
  });
}

export function useDeleteWorkoutExercise(dateKey: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_exercises').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-day', userId, dateKey] }),
  });
}

export function useDeleteWorkout(dateKey: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workouts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-day', userId, dateKey] });
      qc.invalidateQueries({ queryKey: ['workout-dates'] });
    },
  });
}
