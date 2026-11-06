import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { usePresets, type PresetWithData } from '@/hooks/use-presets';
import { useTheme } from '@/hooks/use-theme';
import { draftExercise, newWorkout, type WorkoutDraft } from '@/lib/workout-draft';

export function NewWorkout({ dateKey, onCreate }: {
  dateKey: string; onCreate: (draft: WorkoutDraft) => void;
}) {
  const theme = useTheme();
  const presets = usePresets();
  const [name, setName] = useState('');

  function start(preset?: PresetWithData) {
    const draft = newWorkout(dateKey, name.trim() || preset?.name || 'Workout', preset?.id ?? null);
    draft.exercises = (preset?.preset_exercises ?? []).map((item) => draftExercise(item.exercise ?? {
      id: item.exercise_id, name: 'Exercise', muscle_group: 'other',
    }));
    onCreate(draft);
  }

  return (
    <View style={{ gap: Spacing.three }}>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>New workout</Text>
      <TextField label="Workout name" placeholder="e.g. Push Day" value={name} onChangeText={setName} />
      <Button title="Start empty workout" onPress={() => start()} />
      {presets.isError ? <Text style={{ color: theme.danger }}>Could not load presets. You can still start an empty workout.</Text> : null}
      {(presets.data ?? []).map((preset) => (
        <Button key={preset.id} title={`Start ${preset.name} (${preset.preset_exercises.length} exercises)`} variant="secondary" onPress={() => start(preset)} />
      ))}
    </View>
  );
}
