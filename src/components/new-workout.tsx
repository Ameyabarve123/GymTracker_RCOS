import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Font, Radius, Spacing } from '@/constants/theme';
import { usePresets, type PresetWithData } from '@/hooks/use-presets';
import { useTheme } from '@/hooks/use-theme';
import { draftExercise, newWorkout, type WorkoutDraft } from '@/lib/workout-draft';

export function NewWorkout({ dateKey, onCreate }: {
  dateKey: string; onCreate: (draft: WorkoutDraft) => void;
}) {
  const theme = useTheme();
  const presets = usePresets();
  const [name, setName] = useState('');
  const swatches = [theme.lavender, theme.mint, theme.peach, theme.yellow];

  function start(preset?: PresetWithData) {
    const draft = newWorkout(dateKey, name.trim() || preset?.name || 'Workout', preset?.id ?? null);
    draft.exercises = (preset?.preset_exercises ?? []).map((item) => draftExercise(item.exercise ?? {
      id: item.exercise_id, name: 'Exercise', muscle_group: 'other',
    }));
    onCreate(draft);
  }

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Start a workout</Text>
        <TextField label="Workout name" placeholder="e.g. Push Day" value={name} onChangeText={setName} />
        <Button title="Start empty workout" icon="add" onPress={() => start()} />
      </Card>
      {presets.isError ? (
        <Text style={[styles.note, { color: theme.danger }]}>Could not load presets. You can still start an empty workout.</Text>
      ) : null}
      {(presets.data ?? []).length > 0 ? (
        <Card style={styles.card}>
          <Text style={[styles.subtitle, { color: theme.text }]}>Start from a preset</Text>
          {(presets.data ?? []).map((preset, i) => (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              accessibilityLabel={`Start ${preset.name}, ${preset.preset_exercises.length} exercises`}
              onPress={() => start(preset)}
              style={[styles.preset, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.swatch, { backgroundColor: swatches[i % swatches.length] }]} />
              <Text numberOfLines={1} style={[styles.presetName, { color: theme.text }]}>{preset.name}</Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>{preset.preset_exercises.length} ex</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.text} />
            </Pressable>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  card: { gap: 12 },
  title: { fontSize: 20, fontFamily: Font.bold },
  subtitle: { fontSize: 15, fontFamily: Font.bold },
  note: { fontFamily: Font.semibold, paddingHorizontal: Spacing.two },
  preset: { minHeight: 52, borderRadius: Radius.md, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 10, height: 28, borderRadius: 5 },
  presetName: { flex: 1, fontSize: 15, fontFamily: Font.semibold },
  meta: { fontSize: 13, fontFamily: Font.medium },
});
