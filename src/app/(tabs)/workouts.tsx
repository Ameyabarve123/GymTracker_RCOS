import { Ionicons } from '@expo/vector-icons';
import { endOfMonth, startOfMonth } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutDates } from '@/hooks/use-workouts';
import { formatDateInput, parseDateInput, toDateKey } from '@/lib/date';

export default function WorkoutsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = toDateKey();

  const [month, setMonth] = useState(() => new Date());
  const [dateInput, setDateInput] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const enteredDate = parseDateInput(dateInput);
  const fromKey = toDateKey(startOfMonth(month));
  const toKey = toDateKey(endOfMonth(month));

  const workoutDates = useWorkoutDates(fromKey, toKey);

  const markedDates: Record<string, object> = {};
  for (const date of workoutDates.data ?? []) {
    markedDates[date] = { marked: true, dotColor: theme.tint };
  }
  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] ?? {}),
    selected: true,
    selectedColor: theme.tint,
  };

  function showEnteredDate() {
    const date = parseDateInput(dateInput);
    if (!date) {
      setDateError('Enter a valid date, like May 25 2023, 5/25/2023, or 05 30 05.');
      return;
    }
    const key = toDateKey(date);
    setDateError(null);
    setDateInput(formatDateInput(date));
    setSelectedDate(key);
    setMonth(startOfMonth(date));
  }

  function showToday() {
    const now = new Date();
    const key = toDateKey(now);
    setMonth(startOfMonth(now));
    setSelectedDate(key);
    setDateInput(formatDateInput(now));
    setDateError(null);
  }

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

      <Card>
        <TextField
          label="Go to a date"
          accessibilityLabel="Workout date, for example May 25 2023"
          placeholder="May 25 2023"
          hint={enteredDate ? `Recognized as ${formatDateInput(enteredDate)}` : 'Try May 25 2023 or MM DD YY. Two-digit years mean 2000–2099.'}
          value={dateInput}
          clearLabel="Clear date"
          onClear={() => { setDateInput(''); setDateError(null); }}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="go"
          onChangeText={(value) => { setDateInput(value); setDateError(null); }}
          onSubmitEditing={showEnteredDate}
        />
        {dateError ? <Text accessibilityRole="alert" style={{ color: theme.danger }}>{dateError}</Text> : null}
        <Button title="Show Date on Calendar" variant="secondary" onPress={showEnteredDate} />
      </Card>

      <Card style={{ padding: Spacing.one }}>
        <Button title="Back to Today" variant="ghost" onPress={showToday} />
        <Calendar
          key={theme.background}
          initialDate={toDateKey(startOfMonth(month))}
          markedDates={markedDates}
          onDayPress={(day: DateData) => {
            setSelectedDate(day.dateString);
            router.push(`/workout/${day.dateString}`);
          }}
          onMonthChange={(m: DateData) => setMonth((previous) =>
            previous.getFullYear() === m.year && previous.getMonth() === m.month - 1
              ? previous : parseDateInput(`${m.dateString.slice(0, 7)}-01`) ?? previous
          )}
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
