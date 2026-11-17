import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { SavedMealDetailModal, type SavedMealEdits } from '@/components/saved-meal-detail';
import { SavedMealFormModal } from '@/components/saved-meal-form';
import { confirmDeleteSavedMeal, SavedMealRow } from '@/components/saved-meal-row';
import { Card } from '@/components/ui/card';
import { CircleButton, GradientHeader } from '@/components/ui/gradient-header';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Font, Spacing } from '@/constants/theme';
import { useCreateSavedMeal, useDeleteSavedMeal, useSavedMeals, useUpdateSavedMeal } from '@/hooks/use-nutrition';
import { useTheme } from '@/hooks/use-theme';
import { searchMeals } from '@/lib/meal-search';
import type { SavedMeal } from '@/types/database';

/** Sorts meals A–Z by name and groups them under their first-letter heading (non-letters under "#"). */
function groupByLetter(meals: SavedMeal[]): { letter: string; meals: SavedMeal[] }[] {
  const sorted = [...meals].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const groups: { letter: string; meals: SavedMeal[] }[] = [];
  for (const meal of sorted) {
    const first = meal.name.trim()[0]?.toUpperCase() ?? '#';
    const letter = /[A-Z]/.test(first) ? first : '#';
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.meals.push(meal);
    else groups.push({ letter, meals: [meal] });
  }
  return groups;
}

export default function SavedMealsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const saved = useSavedMeals();
  const deleteSaved = useDeleteSavedMeal();
  const updateSaved = useUpdateSavedMeal();
  const createSaved = useCreateSavedMeal();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SavedMeal | null>(null);
  const [creating, setCreating] = useState(false);

  const all = saved.data;
  const results = useMemo(() => searchMeals(all ?? [], query), [all, query]);
  const sections = useMemo(() => groupByLetter(results), [results]);
  const total = all?.length ?? 0;
  const searching = query.trim().length > 0;

  function log(meal: SavedMeal) {
    // Opens Log a Meal with this meal filled in; you pick the section there.
    router.push({
      pathname: '/add-meal',
      params: {
        name: meal.name,
        calories: String(meal.calories),
        protein: String(meal.protein),
        carbs: String(meal.carbs),
        fats: String(meal.fats),
        ...(meal.photo_url ? { photo: meal.photo_url } : {}),
      },
    });
  }

  function remove(meal: SavedMeal) {
    confirmDeleteSavedMeal(meal.name, () =>
      deleteSaved.mutate(meal.id, {
        onError: (err) => Alert.alert('Could not delete', err instanceof Error ? err.message : 'Something went wrong.'),
      }),
    );
  }

  function saveEdits(edits: SavedMealEdits) {
    if (!selected) return;
    updateSaved.mutate(
      { id: selected.id, patch: edits },
      {
        onSuccess: () => setSelected(null),
        onError: (err) => Alert.alert('Could not save', err instanceof Error ? err.message : 'Something went wrong.'),
      },
    );
  }

  function createMeal(edits: SavedMealEdits) {
    createSaved.mutate(edits, {
      onSuccess: () => setCreating(false),
      onError: (err) => Alert.alert('Could not create', err instanceof Error ? err.message : 'Something went wrong.'),
    });
  }

  const header = (
    <GradientHeader
      title="Saved Meals"
      subtitle={`${total} saved meal${total === 1 ? '' : 's'}`}
      left={<CircleButton icon="arrow-back" accessibilityLabel="Back" onPress={() => router.back()} />}
      right={<CircleButton icon="add" variant="dark" accessibilityLabel="New saved meal" onPress={() => setCreating(true)} />}
    />
  );

  let body;
  if (saved.isPending) {
    body = <ActivityIndicator style={styles.loading} color={theme.text} />;
  } else if (saved.isError) {
    body = <Text style={[styles.empty, { color: theme.danger }]}>Couldn&apos;t load your saved meals. Pull down to try again.</Text>;
  } else if (total === 0) {
    body = (
      <Text style={[styles.empty, { color: theme.textSecondary }]}>
        No saved meals yet. When you log a meal, tick &quot;Save to my meals&quot; to keep it here.
      </Text>
    );
  } else if (results.length === 0) {
    body = <Text style={[styles.empty, { color: theme.textSecondary }]}>No saved meals match your search.</Text>;
  } else {
    body = sections.map((section) => (
      <View key={section.letter} style={styles.group}>
        <Text style={[styles.groupLetter, { color: theme.textSecondary }]}>{section.letter}</Text>
        {section.meals.map((meal) => (
          <SavedMealRow
            key={meal.id}
            meal={meal}
            onPress={() => setSelected(meal)}
            onLog={() => log(meal)}
            onDelete={() => remove(meal)}
            deleting={deleteSaved.isPending && deleteSaved.variables === meal.id}
          />
        ))}
      </View>
    ));
  }

  return (
    <Screen header={header} refreshing={saved.isRefetching} onRefresh={() => saved.refetch()}>
      <TextField
        accessibilityLabel="Search saved meals"
        placeholder="Search saved meals"
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery('')}
        clearLabel="Clear search"
        autoCorrect={false}
        returnKeyType="search"
      />
      {searching && total > 0 ? (
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {results.length} of {total} meal{total === 1 ? '' : 's'}
        </Text>
      ) : null}
      <Card style={styles.list}>{body}</Card>

      <SavedMealDetailModal
        meal={selected}
        busy={updateSaved.isPending}
        onSave={saveEdits}
        onLog={() => {
          const meal = selected;
          setSelected(null);
          if (meal) log(meal);
        }}
        onDelete={() => {
          const meal = selected;
          setSelected(null);
          if (meal) remove(meal);
        }}
        onClose={() => setSelected(null)}
      />

      <SavedMealFormModal
        visible={creating}
        busy={createSaved.isPending}
        onCreate={createMeal}
        onClose={() => setCreating(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 13, fontFamily: Font.medium, paddingHorizontal: Spacing.one },
  list: { gap: 6 },
  group: { gap: 6 },
  groupLetter: { fontSize: 13, fontFamily: Font.bold, marginTop: Spacing.one },
  loading: { paddingVertical: Spacing.four },
  empty: { fontSize: 14, fontFamily: Font.medium, textAlign: 'center', paddingVertical: Spacing.three },
});
