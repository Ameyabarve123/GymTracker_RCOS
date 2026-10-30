import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Exercise, MuscleGroup } from '@/types/database';

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async (): Promise<Exercise[]> => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateExercise() {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; muscle_group: MuscleGroup }) => {
      const { data, error } = await supabase
        .from('exercises')
        .insert({ name: input.name, muscle_group: input.muscle_group, created_by: userId! })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}
