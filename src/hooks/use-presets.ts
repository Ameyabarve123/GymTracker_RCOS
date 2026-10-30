import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Exercise, Preset, PresetExercise } from '@/types/database';

export type PresetExerciseWithData = PresetExercise & {
  exercise: Pick<Exercise, 'id' | 'name' | 'muscle_group'> | null;
};

export type PresetWithData = Preset & {
  preset_exercises: PresetExerciseWithData[];
};

export function usePresets() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['presets', userId],
    enabled: !!userId,
    queryFn: async (): Promise<PresetWithData[]> => {
      const { data, error } = await supabase
        .from('presets')
        .select(
          'id, user_id, name, created_at, ' +
            'preset_exercises(id, preset_id, exercise_id, order_index, target_sets, target_reps, ' +
            'exercise:exercises(id, name, muscle_group))'
        )
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const presets = (data ?? []) as unknown as PresetWithData[];
      for (const p of presets) {
        p.preset_exercises.sort((a, b) => a.order_index - b.order_index);
      }
      return presets;
    },
  });
}

export function useCreatePreset() {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; exerciseIds: string[] }) => {
      const { data: preset, error } = await supabase
        .from('presets')
        .insert({ user_id: userId!, name: input.name })
        .select('*')
        .single();
      if (error) throw error;

      if (input.exerciseIds.length > 0) {
        const { error: peErr } = await supabase.from('preset_exercises').insert(
          input.exerciseIds.map((exerciseId, index) => ({
            preset_id: preset.id,
            exercise_id: exerciseId,
            order_index: index,
          }))
        );
        if (peErr) throw peErr;
      }
      return preset;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presets', userId] }),
  });
}

export function useDeletePreset() {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('presets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presets', userId] }),
  });
}
