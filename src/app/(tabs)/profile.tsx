import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDailyLog } from '@/hooks/use-nutrition';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { useAuth } from '@/lib/auth';
import { toDateKey } from '@/lib/date';

export default function ProfileScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const today = useDailyLog(toDateKey());

  const [username, setUsername] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [carbsGoal, setCarbsGoal] = useState('');
  const [fatsGoal, setFatsGoal] = useState('');

  useEffect(() => {
    if (!profile.data) return;
    setUsername(profile.data.username);
    setIsPrivate(profile.data.is_private);
    setCalorieGoal(String(profile.data.calorie_goal));
    setProteinGoal(String(profile.data.protein_goal));
    setCarbsGoal(String(profile.data.carbs_goal));
    setFatsGoal(String(profile.data.fats_goal));
  }, [profile.data]);

  async function handleSave() {
    try {
      await updateProfile.mutateAsync({
        username: username.trim(),
        is_private: isPrivate,
        calorie_goal: Number(calorieGoal) || 0,
        protein_goal: Number(proteinGoal) || 0,
        carbs_goal: Number(carbsGoal) || 0,
        fats_goal: Number(fatsGoal) || 0,
      });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const totals = today.data?.totals ?? { calories: 0, protein: 0, carbs: 0, fats: 0 };

  return (
    <Screen refreshing={profile.isRefetching} onRefresh={() => profile.refetch()}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.tintMuted }]}>
          <Ionicons name="person" size={36} color={theme.tint} />
        </View>
        <Text style={[styles.username, { color: theme.text }]}>
          {profile.data?.username ?? '...'}
        </Text>
        <Text style={[styles.streak, { color: theme.textSecondary }]}>
          Current streak: {profile.data?.current_streak ?? 0} days
        </Text>
      </View>

      <Card style={styles.statsRow}>
        <Stat label="Calories" value={Math.round(totals.calories)} color={theme.calories} />
        <Stat label="Protein" value={Math.round(totals.protein)} color={theme.protein} />
        <Stat label="Carbs" value={Math.round(totals.carbs)} color={theme.carbs} />
        <Stat label="Fats" value={Math.round(totals.fats)} color={theme.fats} />
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
        <TextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Pressable style={styles.toggleRow} onPress={() => setIsPrivate((v) => !v)}>
          <View>
            <Text style={[styles.toggleTitle, { color: theme.text }]}>Private profile</Text>
            <Text style={[styles.toggleHint, { color: theme.textSecondary }]}>
              {isPrivate ? 'Only you can see your profile' : 'Others can find your profile'}
            </Text>
          </View>
          <Ionicons
            name={isPrivate ? 'lock-closed' : 'lock-open'}
            size={22}
            color={isPrivate ? theme.textSecondary : theme.success}
          />
        </Pressable>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily goals</Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="Calories" keyboardType="numeric" value={calorieGoal} onChangeText={setCalorieGoal} />
          </View>
          <View style={styles.flex}>
            <TextField label="Protein (g)" keyboardType="numeric" value={proteinGoal} onChangeText={setProteinGoal} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="Carbs (g)" keyboardType="numeric" value={carbsGoal} onChangeText={setCarbsGoal} />
          </View>
          <View style={styles.flex}>
            <TextField label="Fats (g)" keyboardType="numeric" value={fatsGoal} onChangeText={setFatsGoal} />
          </View>
        </View>
      </Card>

      <Button title="Save Changes" loading={updateProfile.isPending} onPress={handleSave} />
      <Button title="Sign Out" variant="danger" onPress={confirmSignOut} />
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { alignItems: 'center', gap: Spacing.two },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  username: { fontSize: 24, fontWeight: '800' },
  streak: { fontSize: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  toggleTitle: { fontSize: 15, fontWeight: '600' },
  toggleHint: { fontSize: 12 },
  row: { flexDirection: 'row', gap: Spacing.three },
});
