import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { MacroBar } from '@/components/macro-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDailyLog, useDeleteMeal } from '@/hooks/use-nutrition';
import { useProfile } from '@/hooks/use-profile';
import { formatPretty, toDateKey } from '@/lib/date';
import type { Meal } from '@/types/database';

export default function NutritionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = toDateKey();

  const profile = useProfile();
  const dailyLog = useDailyLog(today);
  const deleteMeal = useDeleteMeal(today);

  const totals = dailyLog.data?.totals ?? { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const meals = dailyLog.data?.meals ?? [];
  const goals = {
    calories: profile.data?.calorie_goal ?? 2000,
    protein: profile.data?.protein_goal ?? 150,
    carbs: profile.data?.carbs_goal ?? 200,
    fats: profile.data?.fats_goal ?? 65,
  };

  function confirmDelete(meal: Meal) {
    Alert.alert('Delete meal', `Remove "${meal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMeal.mutate(meal.id) },
    ]);
  }

  return (
    <Screen refreshing={dailyLog.isRefetching} onRefresh={() => dailyLog.refetch()}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Nutrition</Text>
        <Text style={[styles.date, { color: theme.textSecondary }]}>{formatPretty(today)}</Text>
      </View>

      <Card>
        <View style={styles.caloriesRow}>
          <Text style={[styles.caloriesBig, { color: theme.calories }]}>
            {Math.round(totals.calories)}
          </Text>
          <Text style={[styles.caloriesGoal, { color: theme.textSecondary }]}>
            / {goals.calories} kcal
          </Text>
        </View>
        <View style={styles.macros}>
          <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color={theme.protein} />
          <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color={theme.carbs} />
          <MacroBar label="Fats" value={totals.fats} goal={goals.fats} color={theme.fats} />
        </View>
      </Card>

      <Button title="Add Meal" onPress={() => router.push('/add-meal')} />

      <View style={styles.listHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Today&apos;s meals</Text>
        <Text style={[styles.count, { color: theme.textSecondary }]}>{meals.length}</Text>
      </View>

      {meals.length === 0 ? (
        <Card>
          <Text style={{ color: theme.textSecondary }}>
            No meals logged yet. Tap &quot;Add Meal&quot; to get started.
          </Text>
        </Card>
      ) : (
        meals.map((meal) => (
          <Card key={meal.id} style={styles.mealRow}>
            <View style={styles.mealInfo}>
              <Text style={[styles.mealName, { color: theme.text }]}>{meal.name}</Text>
              <Text style={[styles.mealMeta, { color: theme.textSecondary }]}>
                {meal.meal_type} · {meal.calories} kcal · P{meal.protein} C{meal.carbs} F{meal.fats}
              </Text>
            </View>
            <Pressable hitSlop={10} onPress={() => confirmDelete(meal)}>
              <Ionicons name="trash-outline" size={20} color={theme.danger} />
            </Pressable>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2 },
  title: { fontSize: 28, fontWeight: '800' },
  date: { fontSize: 15 },
  caloriesRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  caloriesBig: { fontSize: 40, fontWeight: '800' },
  caloriesGoal: { fontSize: 16, fontWeight: '600' },
  macros: { gap: Spacing.three, marginTop: Spacing.one },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  count: { fontSize: 15, fontWeight: '600' },
  mealRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealInfo: { flex: 1, gap: 2 },
  mealName: { fontSize: 16, fontWeight: '700' },
  mealMeta: { fontSize: 13 },
});
