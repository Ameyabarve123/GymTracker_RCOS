import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MacroBar } from '@/components/macro-bar';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDailyLog } from '@/hooks/use-nutrition';
import { useProfile } from '@/hooks/use-profile';
import { toDateKey } from '@/lib/date';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const today = toDateKey();

  const profile = useProfile();
  const dailyLog = useDailyLog(today);

  const totals = dailyLog.data?.totals ?? { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const goals = {
    calories: profile.data?.calorie_goal ?? 2000,
    protein: profile.data?.protein_goal ?? 150,
    carbs: profile.data?.carbs_goal ?? 200,
    fats: profile.data?.fats_goal ?? 65,
  };

  const refreshing = profile.isRefetching || dailyLog.isRefetching;
  const onRefresh = () => {
    profile.refetch();
    dailyLog.refetch();
  };

  const caloriesLeft = Math.max(goals.calories - totals.calories, 0);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.greeting}>
        <Text style={[styles.hello, { color: theme.textSecondary }]}>Welcome back</Text>
        <Text style={[styles.username, { color: theme.text }]}>
          {profile.data?.username ?? '...'}
        </Text>
      </View>

      <View style={styles.streakRow}>
        <Card style={styles.streakCard}>
          <Ionicons name="flame" size={28} color={theme.carbs} />
          <Text style={[styles.streakValue, { color: theme.text }]}>
            {profile.data?.current_streak ?? 0}
          </Text>
          <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>Current streak</Text>
        </Card>
        <Card style={styles.streakCard}>
          <Ionicons name="trophy" size={28} color={theme.tint} />
          <Text style={[styles.streakValue, { color: theme.text }]}>
            {profile.data?.longest_streak ?? 0}
          </Text>
          <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>Longest streak</Text>
        </Card>
      </View>

      <Card>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Today</Text>
          <Text style={[styles.caloriesLeft, { color: theme.textSecondary }]}>
            {caloriesLeft} kcal left
          </Text>
        </View>
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

      <View style={styles.actions}>
        <QuickAction
          icon="add-circle"
          label="Log a meal"
          color={theme.protein}
          onPress={() => router.push('/add-meal')}
        />
        <QuickAction
          icon="barbell"
          label="Start workout"
          color={theme.tint}
          onPress={() => router.push(`/workout/${today}`)}
        />
      </View>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable style={{ flex: 1 }} onPress={onPress}>
      <Card style={styles.action}>
        <Ionicons name={icon} size={26} color={color} />
        <Text style={[styles.actionLabel, { color: theme.text }]}>{label}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: 2 },
  hello: { fontSize: 15 },
  username: { fontSize: 28, fontWeight: '800' },
  streakRow: { flexDirection: 'row', gap: Spacing.three },
  streakCard: { flex: 1, alignItems: 'center', gap: Spacing.one },
  streakValue: { fontSize: 32, fontWeight: '800' },
  streakLabel: { fontSize: 13 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  caloriesLeft: { fontSize: 13, fontWeight: '600' },
  caloriesRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  caloriesBig: { fontSize: 40, fontWeight: '800' },
  caloriesGoal: { fontSize: 16, fontWeight: '600' },
  macros: { gap: Spacing.three, marginTop: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.three },
  action: { flex: 1, alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  actionLabel: { fontSize: 15, fontWeight: '700' },
});
