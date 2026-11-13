import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { MacroBar } from '@/components/macro-bar';
import { Card, Panel } from '@/components/ui/card';
import { Chip, ChipRow, CircleButton, GradientHeader } from '@/components/ui/gradient-header';
import { Screen } from '@/components/ui/screen';
import { SectionTitle } from '@/components/ui/section-title';
import { Font, Radius } from '@/constants/theme';
import { useDailyLog, useDeleteMeal } from '@/hooks/use-nutrition';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { toDateKey } from '@/lib/date';
import type { Meal, MealType } from '@/types/database';

const GROUPS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snacks' },
];

export default function NutritionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = toDateKey();

  const profile = useProfile();
  const dailyLog = useDailyLog(today);
  const deleteMeal = useDeleteMeal(today);
  const [open, setOpen] = useState<Partial<Record<MealType, boolean>>>({});

  const totals = dailyLog.data?.totals ?? { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const meals = dailyLog.data?.meals ?? [];
  const goals = {
    calories: profile.data?.calorie_goal ?? 2000,
    protein: profile.data?.protein_goal ?? 150,
    carbs: profile.data?.carbs_goal ?? 200,
    fats: profile.data?.fats_goal ?? 65,
  };
  const pct = goals.calories > 0 ? Math.round((totals.calories / goals.calories) * 100) : 0;
  const left = Math.round(goals.calories - totals.calories);

  function confirmDelete(meal: Meal) {
    Alert.alert('Delete meal', `Remove "${meal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMeal.mutate(meal.id) },
    ]);
  }

  const header = (
    <GradientHeader
      title="Nutrition"
      subtitle={format(new Date(), 'EEE, d MMM yyyy')}
      left={<View />}
      right={<CircleButton icon="add" variant="dark" accessibilityLabel="Log a meal" onPress={() => router.push('/add-meal')} />}>
      <ChipRow>
        <Chip>{`${meals.length} meal${meals.length === 1 ? '' : 's'}`}</Chip>
        <Chip tone={theme.success}>{`${pct}% of goal`}</Chip>
        <Chip tone={left < 0 ? theme.danger : theme.warning}>
          {left < 0 ? `${Math.abs(left).toLocaleString()} kcal over` : `${left.toLocaleString()} kcal left`}
        </Chip>
      </ChipRow>
    </GradientHeader>
  );

  return (
    <Screen header={header} tabBar refreshing={dailyLog.isRefetching} onRefresh={() => dailyLog.refetch()}>
      <Panel>
        <View style={styles.between}>
          <Text accessibilityRole="header" style={[styles.panelTitle, { color: theme.onInverse }]}>Your Macros</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/profile')}
            style={[styles.panelButton, { backgroundColor: theme.inverseTrack }]}>
            <Text style={[styles.panelButtonText, { color: theme.onInverse }]}>Edit goals</Text>
          </Pressable>
        </View>
        <View style={styles.grid}>
          <MacroBar inverse label="Calories" unit="kcal" value={totals.calories} goal={goals.calories} color={theme.calories} />
          <MacroBar inverse label="Protein" value={totals.protein} goal={goals.protein} color={theme.protein} />
        </View>
        <View style={styles.grid}>
          <MacroBar inverse label="Carbs" value={totals.carbs} goal={goals.carbs} color={theme.carbs} />
          <MacroBar inverse label="Fats" value={totals.fats} goal={goals.fats} color={theme.fats} />
        </View>
      </Panel>

      <SectionTitle title="Meals" note="Tap to expand" />
      <Card style={styles.mealsCard}>
        {GROUPS.map(({ type, label }) => {
          const items = meals.filter((meal) => meal.meal_type === type);
          const kcal = items.reduce((sum, meal) => sum + Number(meal.calories), 0);
          if (items.length === 0) {
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityLabel={`Add ${label.toLowerCase()}`}
                onPress={() => router.push({ pathname: '/add-meal', params: { type } })}
                style={[styles.groupRow, styles.emptyRow, { borderColor: theme.textSecondary }]}>
                <Text style={[styles.groupName, { color: theme.text }]}>{label}</Text>
                <Text style={[styles.groupMeta, { color: theme.textSecondary }]}>Add</Text>
                <Ionicons name="add" size={18} color={theme.text} />
              </Pressable>
            );
          }
          const expanded = open[type] ?? false;
          return (
            <View key={type} style={styles.group}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${label}, ${items.length} item${items.length === 1 ? '' : 's'}, ${kcal} kcal`}
                onPress={() => setOpen((prev) => ({ ...prev, [type]: !expanded }))}
                style={[styles.groupRow, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.groupName, { color: theme.text }]}>{label}</Text>
                <Text style={[styles.groupMeta, { color: theme.textSecondary }]}>{kcal.toLocaleString()} kcal</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.text} />
              </Pressable>
              {expanded ? (
                <View style={styles.items}>
                  {items.map((meal) => (
                    <View key={meal.id} style={styles.item}>
                      <View style={styles.flex}>
                        <Text style={[styles.itemName, { color: theme.text }]}>{meal.name}</Text>
                        <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                          {meal.calories} kcal · P {meal.protein} · C {meal.carbs} · F {meal.fats}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${meal.name}`}
                        hitSlop={8}
                        onPress={() => confirmDelete(meal)}
                        style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}>
                        <Ionicons name="trash-outline" size={16} color={theme.danger} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/add-meal', params: { type } })}
                    style={styles.addMore}>
                    <Ionicons name="add" size={16} color={theme.text} />
                    <Text style={[styles.addMoreText, { color: theme.text }]}>Add to {label.toLowerCase()}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontSize: 24, fontFamily: Font.medium },
  panelButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: Radius.pill, justifyContent: 'center' },
  panelButtonText: { fontSize: 13, fontFamily: Font.semibold },
  grid: { flexDirection: 'row', gap: 12 },
  mealsCard: { padding: 10 },
  group: { gap: 6 },
  groupRow: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyRow: { borderWidth: 1.5, borderStyle: 'dashed' },
  groupName: { flex: 1, fontSize: 15, fontFamily: Font.semibold },
  groupMeta: { fontSize: 13, fontFamily: Font.medium },
  items: { paddingHorizontal: 14, paddingBottom: 4, gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemName: { fontSize: 14, fontFamily: Font.semibold },
  itemMeta: { fontSize: 13, fontFamily: Font.medium },
  iconButton: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  addMore: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, alignSelf: 'flex-start' },
  addMoreText: { fontSize: 13, fontFamily: Font.bold },
});
