import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCreatePreset, useDeletePreset, usePresets } from '@/hooks/use-presets';
import type { Exercise } from '@/types/database';

export default function PresetsScreen() {
  const theme = useTheme();
  const presets = usePresets();
  const createPreset = useCreatePreset();
  const deletePreset = useDeletePreset();

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  function addExercise(exercise: Exercise) {
    setSelected((prev) =>
      prev.some((e) => e.id === exercise.id) ? prev : [...prev, exercise]
    );
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give your preset a name.');
      return;
    }
    await createPreset.mutateAsync({ name: name.trim(), exerciseIds: selected.map((e) => e.id) });
    setName('');
    setSelected([]);
  }

  function confirmDelete(id: string, presetName: string) {
    Alert.alert('Delete preset', `Delete "${presetName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePreset.mutate(id) },
    ]);
  }

  return (
    <Screen refreshing={presets.isRefetching} onRefresh={() => presets.refetch()}>
      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>New preset</Text>
        <TextField label="Name" placeholder="e.g. Push" value={name} onChangeText={setName} />

        <Text style={[styles.label, { color: theme.textSecondary }]}>
          Exercises ({selected.length})
        </Text>
        {selected.map((e, i) => (
          <View key={e.id} style={styles.selectedRow}>
            <Text style={[styles.selectedName, { color: theme.text }]}>
              {i + 1}. {e.name}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => setSelected((prev) => prev.filter((x) => x.id !== e.id))}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        ))}
        <Button title="Add exercise" variant="secondary" onPress={() => setPickerOpen(true)} />
        <Button title="Save preset" loading={createPreset.isPending} onPress={handleCreate} />
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Your presets</Text>
      {(presets.data ?? []).length === 0 ? (
        <Card>
          <Text style={{ color: theme.textSecondary }}>No presets yet. Create one above.</Text>
        </Card>
      ) : (
        (presets.data ?? []).map((preset) => (
          <Card key={preset.id}>
            <View style={styles.presetHeader}>
              <Text style={[styles.presetName, { color: theme.text }]}>{preset.name}</Text>
              <Pressable hitSlop={10} onPress={() => confirmDelete(preset.id, preset.name)}>
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
              </Pressable>
            </View>
            {preset.preset_exercises.map((pe) => (
              <Text key={pe.id} style={[styles.presetExercise, { color: theme.textSecondary }]}>
                • {pe.exercise?.name ?? 'Exercise'}
              </Text>
            ))}
          </Card>
        ))
      )}

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addExercise}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600' },
  selectedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedName: { fontSize: 15 },
  presetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetName: { fontSize: 17, fontWeight: '700' },
  presetExercise: { fontSize: 14, lineHeight: 20 },
});
