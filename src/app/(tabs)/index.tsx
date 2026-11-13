import { Ionicons } from '@expo/vector-icons';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CalorieGauge } from '@/components/calorie-gauge';
import { Card } from '@/components/ui/card';
import { CircleButton, GradientHeader } from '@/components/ui/gradient-header';
import { Screen } from '@/components/ui/screen';
import { SectionTitle } from '@/components/ui/section-title';
import { Font, Radius, Spacing } from '@/constants/theme';
import { useDailyLog } from '@/hooks/use-nutrition';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutDates, useWorkoutDay } from '@/hooks/use-workouts';
import { toDateKey } from '@/lib/date';
import { initials, workoutTotals } from '@/lib/workout-stats';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const now = new Date();
  const today = toDateKey(now);
  const weekStart = startOfWeek(now);

  const profile = useProfile();
  const dailyLog = useDailyLog(today);
  const workoutDay = useWorkoutDay(today);
  const weekDates = useWorkoutDates(toDateKey(weekStart), toDateKey(endOfWeek(now)));

  const totals = dailyLog.data?.totals ?? { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const goals = {
    calories: profile.data?.calorie_goal ?? 2000,
    protein: profile.data?.protein_goal ?? 150,
    carbs: profile.data?.carbs_goal ?? 200,
    fats: profile.data?.fats_goal ?? 65,
  };
  const workouts = workoutDay.data ?? [];
  const lifted = workoutTotals(workouts);
  const trained = new Set(weekDates.data ?? []);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = toDateKey(date);
    return { key, label: format(date, 'EEEEE'), trained: trained.has(key), isToday: key === today, future: key > today };
  });

  const refreshing = profile.isRefetching || dailyLog.isRefetching || workoutDay.isRefetching;
  const onRefresh = () => {
    profile.refetch();
    dailyLog.refetch();
    workoutDay.refetch();
    weekDates.refetch();
  };
  const openWorkout = () => router.push(`/workout/${today}`);

  const header = (
    <GradientHeader
      title="Today's Activity"
      left={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.navigate('/profile')}
          style={[styles.avatar, { backgroundColor: theme.lavender }]}>
          <Text style={[styles.avatarText, { color: theme.text }]}>{initials(profile.data?.username)}</Text>
        </Pressable>
      }
      right={<CircleButton icon="calendar-outline" accessibilityLabel="Open workout calendar" onPress={() => router.navigate('/workouts')} />}>
      <Card style={styles.streakCard}>
        <View style={styles.between}>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Current Streak</Text>
            <Text style={[styles.muted, { color: theme.textSecondary }]}>
              Longest streak: {profile.data?.longest_streak ?? 0} days
            </Text>
          </View>
          <Text style={[styles.streak, { color: theme.text }]}>
            {profile.data?.current_streak ?? 0}
            <Text style={[styles.muted, { color: theme.textSecondary }]}> days</Text>
          </Text>
        </View>
        <View style={styles.between}>
          <View
            style={styles.dots}
            accessible
            accessibilityLabel={`Trained ${week.filter((d) => d.trained).length} of 7 days this week`}>
            {week.map((day) => (
              <View key={day.key} style={styles.dayCol}>
                <View
                  style={[
                    styles.dot,
                    day.trained && { backgroundColor: day.isToday ? theme.inverse : theme.mint },
                    !day.trained && day.isToday && { borderWidth: 2, borderColor: theme.text },
                    !day.trained && !day.isToday && day.future && { borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.textSecondary },
                    !day.trained && !day.isToday && !day.future && { backgroundColor: theme.backgroundSelected },
                  ]}
                />
                <Text style={[styles.dayLetter, { color: theme.textSecondary }]}>{day.label}</Text>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/add-meal')}
            style={[styles.yellowPill, { backgroundColor: theme.accent }]}>
            <Text style={[styles.pillLabel, { color: theme.onAccent }]}>Log meal</Text>
          </Pressable>
        </View>
      </Card>
    </GradientHeader>
  );

  return (
    <Screen header={header} tabBar refreshing={refreshing} onRefresh={onRefresh}>
      <Card style={styles.todayCard}>
        <View style={styles.todayRow}>
          <Text style={[styles.date, { color: theme.text }]}>{format(now, 'd MMM').toUpperCase()}</Text>
          {workouts[0] ? (
            <View style={[styles.tag, { backgroundColor: theme.lavender }]}>
              <Text numberOfLines={1} style={[styles.tagText, { color: theme.text }]}>{workouts[0].name}</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={workouts.length ? "Open today's workout" : 'Start a workout'}
            onPress={openWorkout}
            style={[styles.tag, styles.tagLink, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="barbell-outline" size={18} color={theme.text} />
            <Text style={[styles.tagText, { color: theme.text }]}>
              {workouts.length ? `${lifted.exercises} exercise${lifted.exercises === 1 ? '' : 's'}` : 'Start'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={theme.text} style={styles.diagonal} />
          </Pressable>
        </View>
        <View style={styles.stats}>
          <View style={styles.flex}>
            <Text style={[styles.muted, { color: theme.textSecondary }]}>Calories</Text>
            <Text style={[styles.bigStat, { color: theme.text }]}>
              {Math.round(totals.calories).toLocaleString()}
              <Text style={[styles.statUnit, { color: theme.textSecondary }]}> / {goals.calories.toLocaleString()}</Text>
            </Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.muted, { color: theme.textSecondary }]}>Volume lifted</Text>
            <Text style={[styles.bigStat, { color: theme.text }]}>
              {lifted.volume.toLocaleString()}
              <Text style={[styles.statUnit, { color: theme.textSecondary }]}> lb</Text>
            </Text>
          </View>
        </View>
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={openWorkout}
        style={[styles.blackBar, { backgroundColor: theme.inverse }]}>
        <Text style={[styles.barLabel, { color: theme.onInverse }]}>{"Today's\nWorkout:"}</Text>
        <Ionicons name="barbell-outline" size={22} color={theme.onInverse} />
        <Text numberOfLines={1} style={[styles.barTitle, { color: theme.onInverse }]}>
          {workouts[0]?.name ?? 'Start a workout'}
        </Text>
        <Ionicons name="arrow-forward" size={18} color={theme.onInverse} style={styles.diagonal} />
      </Pressable>

      <SectionTitle title="Today's Macros" actionLabel="Open nutrition" onPress={() => router.navigate('/nutrition')} />
      <View style={styles.macroGrid}>
        <View style={styles.tileCol}>
          <MacroTile label="Protein" value={`${Math.round(totals.protein)}/${goals.protein}g`} />
          <MacroTile label="Carbs" value={`${Math.round(totals.carbs)}/${goals.carbs}g`} />
        </View>
        <View style={styles.gauge}>
          <CalorieGauge eaten={totals.calories} goal={goals.calories} />
        </View>
        <View style={styles.tileCol}>
          <MacroTile label="Fats" value={`${Math.round(totals.fats)}/${goals.fats}g`} />
          <MacroTile label="Meals" value={`${dailyLog.data?.meals.length ?? 0} logged`} />
        </View>
      </View>
    </Screen>
  );
}

function MacroTile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.card }]}>
      <Text style={[styles.tileLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.tileValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  avatar: { width: 46, height: 46, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontFamily: Font.extrabold },
  streakCard: { padding: 18, gap: 12 },
  cardTitle: { fontSize: 15, fontFamily: Font.bold },
  muted: { fontSize: 13, fontFamily: Font.medium },
  streak: { fontSize: 34, fontFamily: Font.bold, letterSpacing: -1 },
  dots: { flexDirection: 'row', gap: 6, flexShrink: 1 },
  dayCol: { alignItems: 'center', gap: 2 },
  dot: { width: 22, height: 22, borderRadius: 11 },
  dayLetter: { fontSize: 10, fontFamily: Font.semibold },
  yellowPill: { minHeight: 44, paddingHorizontal: 18, borderRadius: Radius.pill, justifyContent: 'center' },
  pillLabel: { fontSize: 14, fontFamily: Font.bold },
  todayCard: { borderRadius: 26, gap: 12 },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  date: { flex: 1, fontSize: 15, fontFamily: Font.bold },
  tag: { minHeight: 36, paddingHorizontal: 12, borderRadius: Radius.sm, justifyContent: 'center', maxWidth: 140 },
  tagLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, maxWidth: undefined },
  tagText: { fontSize: 14, fontFamily: Font.semibold },
  diagonal: { transform: [{ rotate: '-45deg' }] },
  stats: { flexDirection: 'row', gap: Spacing.two },
  bigStat: { fontSize: 28, fontFamily: Font.medium, letterSpacing: -0.5 },
  statUnit: { fontSize: 15, fontFamily: Font.medium, letterSpacing: 0 },
  blackBar: { borderRadius: 22, paddingVertical: Spacing.three, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64 },
  barLabel: { fontSize: 14, lineHeight: 17, fontFamily: Font.medium },
  barTitle: { flex: 1, fontSize: 16, fontFamily: Font.medium },
  macroGrid: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  tileCol: { width: 92, gap: Spacing.two },
  gauge: { flex: 1, alignItems: 'center' },
  tile: { borderRadius: 18, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center' },
  tileLabel: { fontSize: 13, fontFamily: Font.medium },
  tileValue: { fontSize: 16, fontFamily: Font.semibold },
});
