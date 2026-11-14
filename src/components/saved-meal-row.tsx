import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Font, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MealType, SavedMeal } from '@/types/database';

const TYPE_LABELS: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

/** Asks before deleting; logged meals made from the template are unaffected. */
export function confirmDeleteSavedMeal(name: string, onConfirm: () => void) {
  Alert.alert('Delete saved meal', `Remove "${name}" from your saved meals? Meals you've already logged stay in your history.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export function SavedMealRow({ meal, onLog, onDelete, deleting }: {
  meal: SavedMeal;
  onLog: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const theme = useTheme();
  const tone = { breakfast: theme.peach, lunch: theme.mint, dinner: theme.lavender, snack: theme.yellow }[meal.meal_type];

  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>{meal.name}</Text>
          <View style={[styles.pill, { backgroundColor: tone }]}>
            <Text style={[styles.pillText, { color: theme.onAccent }]}>{TYPE_LABELS[meal.meal_type]}</Text>
          </View>
        </View>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {meal.calories} kcal · P {meal.protein} · C {meal.carbs} · F {meal.fats}
        </Text>
      </View>
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete saved meal ${meal.name}`}
          accessibilityState={{ disabled: !!deleting }}
          disabled={deleting}
          hitSlop={6}
          onPress={onDelete}
          style={[styles.icon, { backgroundColor: theme.backgroundElement, opacity: deleting ? 0.5 : 1 }]}>
          <Ionicons name="trash-outline" size={17} color={theme.danger} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Log ${meal.name}`}
        onPress={onLog}
        style={[styles.icon, { backgroundColor: theme.inverse }]}>
        <Ionicons name="add" size={18} color={theme.onInverse} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontSize: 15, fontFamily: Font.semibold },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
  pillText: { fontSize: 11, fontFamily: Font.bold },
  meta: { fontSize: 13, fontFamily: Font.medium },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
