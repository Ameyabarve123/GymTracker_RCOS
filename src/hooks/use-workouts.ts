import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Database, WorkoutWithData } from '@/types/database';

export type { WorkoutExerciseWithData, WorkoutWithData } from '@/types/database';

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
    queryFn: async ({ signal }): Promise<WorkoutWithData[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select(
          'id, user_id, preset_id, name, workout_date, notes, created_at, revision, ' +
            'workout_exercises(id, workout_id, exercise_id, order_index, ' +
            'exercise:exercises(id, name, muscle_group), ' +
            'exercise_sets(*))'
        )
        .eq('user_id', userId!)
        .eq('workout_date', dateKey)
        .order('created_at', { ascending: true })
        .abortSignal(signal);
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

export function useSaveWorkout(dateKey: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: async (input: Database['public']['Functions']['save_workout']['Args']) => {
      if (!userId) throw new Error('Sign in to save your workout.');
      const { data, error } = await supabase.rpc('save_workout', input);
      if (error) throw error;
      return data as WorkoutWithData;
    },
    onSuccess: async (workout, input) => {
      // Cancel older reads so they cannot replace the just-saved snapshot.
      const queryKey = ['workout-day', userId, dateKey];
      await qc.cancelQueries({ queryKey });
      qc.setQueryData<WorkoutWithData[]>(queryKey, (previous = []) => {
        const exists = previous.some((item) => item.id === workout.id);
        return exists ? previous.map((item) => item.id === workout.id ? workout : item) : [...previous, workout];
      });
      if (!input.p_workout.id) {
        void qc.invalidateQueries({ queryKey: ['workout-dates', userId] });
        void qc.invalidateQueries({ queryKey: ['profile', userId] });
      }
      if (input.p_workout.exercises.some((exercise) => !exercise.exercise_id)) {
        void qc.invalidateQueries({ queryKey: ['exercises'] });
      }
    },
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
    onSuccess: async (_, id) => {
      const queryKey = ['workout-day', userId, dateKey];
      await qc.cancelQueries({ queryKey });
      qc.setQueryData<WorkoutWithData[]>(queryKey, (previous = []) => previous.filter((workout) => workout.id !== id));
      void qc.invalidateQueries({ queryKey: ['workout-dates', userId] });
    },
  });
}
