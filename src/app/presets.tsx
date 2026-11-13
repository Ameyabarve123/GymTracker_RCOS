import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CircleButton, GradientHeader } from '@/components/ui/gradient-header';
import { Screen } from '@/components/ui/screen';
import { SectionTitle } from '@/components/ui/section-title';
import { TextField } from '@/components/ui/text-field';
import { Font, Radius, Spacing } from '@/constants/theme';
import { useCreatePreset, useDeletePreset, usePresets } from '@/hooks/use-presets';
import { useTheme } from '@/hooks/use-theme';
import { toDateKey } from '@/lib/date';
import type { Exercise } from '@/types/database';

export default function PresetsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const presets = usePresets();
  const createPreset = useCreatePreset();
  const deletePreset = useDeletePreset();

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const swatches = [theme.lavender, theme.mint, theme.peach, theme.yellow];
  const list = presets.data ?? [];

  function addExercise(exercise: Exercise) {
    setSelected((prev) => (prev.some((e) => e.id === exercise.id) ? prev : [...prev, exercise]));
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give your preset a name.');
      return;
    }
    try {
      await createPreset.mutateAsync({ name: name.trim(), exerciseIds: selected.map((e) => e.id) });
      setName('');
      setSelected([]);
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  function confirmDelete(id: string, presetName: string) {
    Alert.alert('Delete preset', `Delete "${presetName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePreset.mutate(id) },
    ]);
  }

  const header = (
    <GradientHeader
      title="Presets"
      subtitle={`${list.length} routine${list.length === 1 ? '' : 's'}`}
      left={<CircleButton icon="arrow-back" accessibilityLabel="Back" onPress={() => router.back()} />}
      right={<View />}
    />
  );

  return (
    <Screen header={header} refreshing={presets.isRefetching} onRefresh={() => presets.refetch()}>
      <Card style={styles.card}>
        <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.text }]}>New preset</Text>
        <TextField label="Name" placeholder="e.g. Push Day" value={name} onChangeText={setName} />
        {selected.length > 0 ? (
          <View style={styles.exerciseList}>
            {selected.map((e, i) => (
              <View key={e.id} style={[styles.exerciseRow, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.exerciseName, { color: theme.text }]}>{i + 1}. {e.name}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${e.name}`}
                  hitSlop={8}
                  onPress={() => setSelected((prev) => prev.filter((x) => x.id !== e.id))}>
                  <Ionicons name="close" size={18} color={theme.text} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <Button title="Add exercise" variant="outline" icon="add" size="sm" onPress={() => setPickerOpen(true)} />
        <Button title="Save preset" loading={createPreset.isPending} onPress={handleCreate} />
      </Card>

      <SectionTitle title="Your presets" />
      {list.length === 0 ? (
        <Card>
          <Text style={[styles.muted, { color: theme.textSecondary }]}>No presets yet. Create one above.</Text>
        </Card>
      ) : (
        list.map((preset, i) => {
          const open = expanded === preset.id;
          const groups = Array.from(new Set(preset.preset_exercises.map((pe) => pe.exercise?.muscle_group).filter(Boolean)));
          return (
            <Card key={preset.id} style={styles.preset}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setExpanded(open ? null : preset.id)}
                style={styles.presetHeader}>
                <View style={[styles.swatch, { backgroundColor: swatches[i % swatches.length] }]} />
                <View style={styles.flex}>
                  <Text style={[styles.presetName, { color: theme.text }]}>{preset.name}</Text>
                  <Text style={[styles.muted, styles.capitalize, { color: theme.textSecondary }]}>
                    {preset.preset_exercises.length} exercise{preset.preset_exercises.length === 1 ? '' : 's'}
                    {groups.length ? ` · ${groups.join(', ')}` : ''}
                  </Text>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.text} />
              </Pressable>
              {open ? (
                <>
                  {preset.preset_exercises.map((pe) => (
                    <View key={pe.id} style={[styles.exerciseRow, { backgroundColor: theme.backgroundElement }]}>
                      <Text style={[styles.exerciseName, { color: theme.text }]}>{pe.exercise?.name ?? 'Exercise'}</Text>
                      {pe.target_sets && pe.target_reps ? (
                        <Text style={[styles.muted, { color: theme.textSecondary }]}>{pe.target_sets} × {pe.target_reps}</Text>
                      ) : null}
                    </View>
                  ))}
                  <View style={styles.presetActions}>
                    <View style={styles.flex}>
                      <Button title="Start today" variant="accent" size="sm"
                        onPress={() => router.push(`/workout/${toDateKey()}`)} />
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${preset.name}`}
                      onPress={() => confirmDelete(preset.id, preset.name)}
                      style={[styles.delete, { backgroundColor: theme.backgroundElement }]}>
                      <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    </Pressable>
                  </View>
                </>
              ) : null}
            </Card>
          );
        })
      )}

      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addExercise} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: 12 },
  cardTitle: { fontSize: 17, fontFamily: Font.bold },
  exerciseList: { gap: 6 },
  exerciseRow: {
    minHeight: 40,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  exerciseName: { fontSize: 14, fontFamily: Font.medium, flex: 1 },
  muted: { fontSize: 13, fontFamily: Font.medium },
  capitalize: { textTransform: 'capitalize' },
  preset: { gap: Spacing.two },
  presetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  swatch: { width: 12, height: 32, borderRadius: 6 },
  presetName: { fontSize: 17, fontFamily: Font.bold },
  presetActions: { flexDirection: 'row', gap: 6, paddingTop: 4, alignItems: 'center' },
  delete: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
