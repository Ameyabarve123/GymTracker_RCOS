import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Font, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SavedMeal } from '@/types/database';

/** Asks before deleting; logged meals made from the template are unaffected. */
export function confirmDeleteSavedMeal(name: string, onConfirm: () => void) {
  Alert.alert('Delete saved meal', `Remove "${name}" from your saved meals? Meals you've already logged stay in your history.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export function SavedMealRow({ meal, onLog, onDelete, onPress, deleting }: {
  meal: SavedMeal;
  onLog: () => void;
  onDelete?: () => void;
  /** Tapping the name/macros opens details; without it that area is static. */
  onPress?: () => void;
  deleting?: boolean;
}) {
  const theme = useTheme();

  const info = (
    <View style={styles.flex}>
      <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>{meal.name}</Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {meal.calories} kcal · P {meal.protein} · C {meal.carbs} · F {meal.fats}
      </Text>
    </View>
  );

  return (
    <View style={styles.row}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${meal.name}, ${meal.calories} kcal. View details`}
          onPress={onPress}
          style={styles.flex}>
          {info}
        </Pressable>
      ) : (
        info
      )}
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
  name: { fontSize: 15, fontFamily: Font.semibold },
  meta: { fontSize: 13, fontFamily: Font.medium },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
