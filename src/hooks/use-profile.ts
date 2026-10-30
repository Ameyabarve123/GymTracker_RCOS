import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export function useProfile() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId!)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
