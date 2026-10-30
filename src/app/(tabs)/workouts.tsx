import { Ionicons } from '@expo/vector-icons';
import { endOfMonth, startOfMonth } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutDates } from '@/hooks/use-workouts';
import { toDateKey } from '@/lib/date';

export default function WorkoutsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = toDateKey();

  const [month, setMonth] = useState(() => new Date());
  const fromKey = toDateKey(startOfMonth(month));
  const toKey = toDateKey(endOfMonth(month));

  const workoutDates = useWorkoutDates(fromKey, toKey);

  const markedDates: Record<string, object> = {};
  for (const date of workoutDates.data ?? []) {
    markedDates[date] = { marked: true, dotColor: theme.tint };
  }
  markedDates[today] = {
    ...(markedDates[today] ?? {}),
    selected: true,
    selectedColor: theme.tint,
  };

  return (
    <Screen refreshing={workoutDates.isRefetching} onRefresh={() => workoutDates.refetch()}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Workouts</Text>
        <Pressable
          style={[styles.presetBtn, { backgroundColor: theme.backgroundElement }]}
          onPress={() => router.push('/presets')}>
          <Ionicons name="albums-outline" size={16} color={theme.tint} />
          <Text style={[styles.presetText, { color: theme.tint }]}>Presets</Text>
        </Pressable>
      </View>

      <Card style={{ padding: Spacing.one }}>
        <Calendar
          key={theme.background}
          current={toDateKey(month)}
          markedDates={markedDates}
          onDayPress={(day: DateData) => router.push(`/workout/${day.dateString}`)}
          onMonthChange={(m: DateData) => setMonth(new Date(m.year, m.month - 1, 1))}
          theme={{
            calendarBackground: theme.card,
            monthTextColor: theme.text,
            dayTextColor: theme.text,
            textDisabledColor: theme.textSecondary,
            todayTextColor: theme.tint,
            arrowColor: theme.tint,
            textSectionTitleColor: theme.textSecondary,
          }}
        />
      </Card>

      <Button title="Open Today's Workout" onPress={() => router.push(`/workout/${today}`)} />

      <Card style={styles.hintRow}>
        <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Tap any day to view or log a workout. Dots mark days you trained.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800' },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
  },
  presetText: { fontSize: 13, fontWeight: '700' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  hint: { flex: 1, fontSize: 13 },
});
