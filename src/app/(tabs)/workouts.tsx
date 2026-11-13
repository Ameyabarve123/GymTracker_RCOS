import { Ionicons } from '@expo/vector-icons';
import { endOfMonth, startOfMonth } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow, CircleButton, GradientHeader } from '@/components/ui/gradient-header';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Font, Radius, Spacing } from '@/constants/theme';
import { usePresets } from '@/hooks/use-presets';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutDates, useWorkoutDay } from '@/hooks/use-workouts';
import { formatDateInput, formatMonthYear, parseDateInput, toDateKey } from '@/lib/date';

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
  const todayWorkouts = useWorkoutDay(today);
  const presets = usePresets();
  const profile = useProfile();
  const todayName = todayWorkouts.data?.[0]?.name;
  const sessions = workoutDates.data?.length ?? 0;

  const markedDates: Record<string, { customStyles: { container: object; text: object } }> = {};
  const mark = (key: string, bg: string, fg: string) => {
    markedDates[key] = {
      customStyles: { container: { backgroundColor: bg, borderRadius: 12 }, text: { color: fg, fontFamily: Font.semibold } },
    };
  };
  for (const date of workoutDates.data ?? []) mark(date, theme.mint, theme.text);
  if (selectedDate !== today) mark(selectedDate, theme.lavender, theme.text);
  mark(today, theme.inverse, theme.onInverse);

  function showEnteredDate() {
    const date = parseDateInput(dateInput);
    if (!date) {
      setDateError('Enter a valid date, like May 25 2023, 5/25/2023, or 05 30 05.');
      return;
    }
    setDateError(null);
    setDateInput(formatDateInput(date));
    setSelectedDate(toDateKey(date));
    setMonth(startOfMonth(date));
  }

  function showToday() {
    const now = new Date();
    setMonth(startOfMonth(now));
    setSelectedDate(toDateKey(now));
    setDateInput('');
    setDateError(null);
  }

  const header = (
    <GradientHeader
      title="Workouts"
      subtitle={`${profile.data?.current_streak ?? 0}-day streak`}
      left={<View />}
      right={<CircleButton icon="options-outline" accessibilityLabel="Manage presets" onPress={() => router.push('/presets')} />}>
      <ChipRow>
        <Chip>{`Today: ${todayName ?? 'Rest'}`}</Chip>
        <Chip>{`${sessions} session${sessions === 1 ? '' : 's'} in ${formatMonthYear(month).split(' ')[0]}`}</Chip>
      </ChipRow>
    </GradientHeader>
  );

  return (
    <Screen
      header={header}
      tabBar
      refreshing={workoutDates.isRefetching}
      onRefresh={() => { workoutDates.refetch(); todayWorkouts.refetch(); }}>
      <Card style={styles.calendarCard}>
        <Calendar
          key={`${theme.background}-${fromKey}`}
          initialDate={fromKey}
          markingType="custom"
          markedDates={markedDates}
          enableSwipeMonths
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
            todayTextColor: theme.onInverse,
            arrowColor: theme.text,
            textSectionTitleColor: theme.textSecondary,
            textDayFontFamily: Font.semibold,
            textMonthFontFamily: Font.bold,
            textDayHeaderFontFamily: Font.semibold,
            textMonthFontSize: 16,
            textDayFontSize: 14,
          }}
        />
        <View style={styles.legend}>
          <Legend color={theme.mint} label="Trained" />
          <Legend color={theme.inverse} label="Today" />
          <Legend color={theme.lavender} label="Selected" />
        </View>
      </Card>

      <Card style={styles.findCard}>
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
        {dateError ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>{dateError}</Text> : null}
        <View style={styles.findRow}>
          <View style={styles.flex}><Button title="Show date" size="sm" onPress={showEnteredDate} /></View>
          <View style={styles.flex}><Button title="Back to today" size="sm" variant="secondary" style={{ backgroundColor: theme.backgroundElement }} onPress={showToday} /></View>
        </View>
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/workout/${today}`)}
        style={[styles.blackBar, { backgroundColor: theme.inverse }]}>
        <Text style={[styles.barLabel, { color: theme.onInverse }]}>{"Today's\nWorkout:"}</Text>
        <Ionicons name="barbell-outline" size={22} color={theme.onInverse} />
        <Text numberOfLines={1} style={[styles.barTitle, { color: theme.onInverse }]}>{todayName ?? 'Not started'}</Text>
        <View style={[styles.barPill, { backgroundColor: theme.accent }]}>
          <Text style={[styles.barPillText, { color: theme.onAccent }]}>{todayName ? 'Continue' : 'Start'}</Text>
        </View>
      </Pressable>

      <Card style={styles.presetCard}>
        <View style={styles.between}>
          <Text style={[styles.presetTitle, { color: theme.text }]}>Your presets</Text>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push('/presets')}>
            <Text style={[styles.manage, { color: theme.text }]}>Manage</Text>
          </Pressable>
        </View>
        {(presets.data ?? []).length === 0 ? (
          <Text style={[styles.muted, { color: theme.textSecondary }]}>
            Save a routine like Push, Pull or Legs to start workouts faster.
          </Text>
        ) : (
          <View style={styles.presetGrid}>
            {(presets.data ?? []).slice(0, 4).map((preset, i) => (
              <Pressable
                key={preset.id}
                accessibilityRole="button"
                accessibilityLabel={`${preset.name}, ${preset.preset_exercises.length} exercises. Open today's workout to start it.`}
                onPress={() => router.push(`/workout/${today}`)}
                style={[styles.preset, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.presetSwatch, { backgroundColor: [theme.lavender, theme.mint, theme.peach, theme.yellow][i % 4] }]} />
                <Text numberOfLines={1} style={[styles.presetName, { color: theme.text }]}>{preset.name}</Text>
                <Text style={[styles.muted, { color: theme.textSecondary }]}>{preset.preset_exercises.length} ex</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarCard: { borderRadius: 26, paddingHorizontal: Spacing.two, paddingBottom: 12 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, fontFamily: Font.semibold },
  findCard: { gap: 10 },
  findRow: { flexDirection: 'row', gap: Spacing.two },
  error: { fontFamily: Font.medium },
  blackBar: { borderRadius: 22, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  barLabel: { fontSize: 14, lineHeight: 17, fontFamily: Font.medium },
  barTitle: { flex: 1, fontSize: 16, fontFamily: Font.medium },
  barPill: { minHeight: 36, paddingHorizontal: 14, borderRadius: Radius.pill, justifyContent: 'center' },
  barPillText: { fontSize: 13, fontFamily: Font.bold },
  presetCard: { padding: 12, gap: 10 },
  presetTitle: { fontSize: 15, fontFamily: Font.bold, paddingHorizontal: 4 },
  manage: { fontSize: 13, fontFamily: Font.bold, textDecorationLine: 'underline', paddingHorizontal: 4 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  preset: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 52,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  presetSwatch: { width: 10, height: 28, borderRadius: 5 },
  presetName: { flex: 1, fontSize: 14, fontFamily: Font.semibold },
  muted: { fontSize: 13, fontFamily: Font.medium },
});
