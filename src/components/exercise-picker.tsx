import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCreateExercise, useExercises } from '@/hooks/use-exercises';
import type { Exercise } from '@/types/database';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
};

export function ExercisePicker({ visible, onClose, onSelect }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const exercises = useExercises();
  const createExercise = useCreateExercise();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = exercises.data ?? [];
    if (!q) return list;
    return list.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises.data, query]);

  const exactMatch = (exercises.data ?? []).some(
    (e) => e.name.toLowerCase() === query.trim().toLowerCase()
  );

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    const created = await createExercise.mutateAsync({ name, muscle_group: 'other' });
    setQuery('');
    onSelect(created);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Add exercise</Text>
          <Pressable hitSlop={10} onPress={onClose}>
            <Ionicons name="close" size={26} color={theme.text} />
          </Pressable>
        </View>

        <TextInput
          placeholder="Search or create..."
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          style={[
            styles.search,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        />

        {query.trim().length > 0 && !exactMatch ? (
          <Pressable
            style={[styles.createRow, { borderColor: theme.border }]}
            onPress={handleCreate}>
            <Ionicons name="add-circle" size={20} color={theme.tint} />
            <Text style={[styles.createText, { color: theme.tint }]}>
              Create &quot;{query.trim()}&quot;
            </Text>
          </Pressable>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.five }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.item, { borderColor: theme.border }]}
              onPress={() => {
                onSelect(item);
                onClose();
                setQuery('');
              }}>
              <View>
                <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                  {item.muscle_group}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.two },
  title: { fontSize: 22, fontWeight: '800' },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three - 2, fontSize: 16 },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  createText: { fontSize: 15, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemMeta: { fontSize: 13, textTransform: 'capitalize' },
});
