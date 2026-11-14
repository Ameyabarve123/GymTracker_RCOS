import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { confirmDeleteSavedMeal, SavedMealRow } from '@/components/saved-meal-row';
import { Card } from '@/components/ui/card';
import { CircleButton, GradientHeader } from '@/components/ui/gradient-header';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Font, Radius, Spacing } from '@/constants/theme';
import { useDeleteSavedMeal, useSavedMeals } from '@/hooks/use-nutrition';
import { useTheme } from '@/hooks/use-theme';
import { searchMeals } from '@/lib/meal-search';
import type { MealType, SavedMeal } from '@/types/database';

const FILTERS: { type: MealType | 'all'; label: string }[] = [
  { type: 'all', label: 'All' },
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snack' },
];

export default function SavedMealsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const saved = useSavedMeals();
  const deleteSaved = useDeleteSavedMeal();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MealType | 'all'>('all');

  const all = saved.data;
  const results = useMemo(() => searchMeals(all ?? [], query, filter), [all, query, filter]);
  const total = all?.length ?? 0;
  const searching = query.trim().length > 0 || filter !== 'all';

  function log(meal: SavedMeal) {
    // Opens Log a Meal with this meal filled in, so it can be tweaked before adding.
    router.push({
      pathname: '/add-meal',
      params: {
        type: meal.meal_type,
        name: meal.name,
        calories: String(meal.calories),
        protein: String(meal.protein),
        carbs: String(meal.carbs),
        fats: String(meal.fats),
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

  const header = (
    <GradientHeader
      title="Saved Meals"
      subtitle={`${total} saved meal${total === 1 ? '' : 's'}`}
      left={<CircleButton icon="arrow-back" accessibilityLabel="Back" onPress={() => router.back()} />}
      right={<CircleButton icon="add" variant="dark" accessibilityLabel="Log a new meal" onPress={() => router.push('/add-meal')} />}>
      <View style={styles.filters} accessibilityRole="radiogroup">
        {FILTERS.map(({ type, label }) => {
          const active = type === filter;
          return (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(type)}
              style={[styles.filter, { backgroundColor: active ? theme.inverse : theme.card }]}>
              <Text style={[styles.filterText, { color: active ? theme.onInverse : theme.text }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </GradientHeader>
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
    body = results.map((meal) => (
      <SavedMealRow
        key={meal.id}
        meal={meal}
        onLog={() => log(meal)}
        onDelete={() => remove(meal)}
        deleting={deleteSaved.isPending && deleteSaved.variables === meal.id}
      />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  filter: { minHeight: 40, paddingHorizontal: 14, borderRadius: Radius.pill, justifyContent: 'center' },
  filterText: { fontSize: 14, fontFamily: Font.semibold },
  count: { fontSize: 13, fontFamily: Font.medium, paddingHorizontal: Spacing.one },
  list: { gap: 6 },
  loading: { paddingVertical: Spacing.four },
  empty: { fontSize: 14, fontFamily: Font.medium, textAlign: 'center', paddingVertical: Spacing.three },
});
