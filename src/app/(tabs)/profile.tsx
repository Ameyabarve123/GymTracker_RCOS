import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GradientHeader } from '@/components/ui/gradient-header';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Font, Radius, Spacing } from '@/constants/theme';
import { useDailyLog } from '@/hooks/use-nutrition';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { toDateKey } from '@/lib/date';
import { initials } from '@/lib/workout-stats';

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
  const since = profile.data?.created_at ? format(new Date(profile.data.created_at), 'MMM yyyy') : null;

  const header = (
    <GradientHeader>
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: theme.lavender, borderColor: theme.card }]}>
          <Text style={[styles.avatarText, { color: theme.text }]}>{initials(profile.data?.username)}</Text>
        </View>
        <View style={styles.flex}>
          <Text accessibilityRole="header" numberOfLines={1} style={[styles.username, { color: theme.text }]}>
            @{profile.data?.username ?? '…'}
          </Text>
          {since ? <Text style={[styles.muted, { color: theme.textSecondary }]}>Member since {since}</Text> : null}
        </View>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isPrivate }}
        onPress={() => setIsPrivate((v) => !v)}
        style={[styles.privacy, { backgroundColor: theme.card }]}>
        <Ionicons name={isPrivate ? 'lock-closed-outline' : 'lock-open-outline'} size={20} color={theme.text} />
        <View style={styles.flex}>
          <Text style={[styles.privacyTitle, { color: theme.text }]}>Private profile</Text>
          <Text style={[styles.muted, { color: theme.textSecondary }]}>
            {isPrivate ? 'Only you can see your stats' : 'Others can find your profile'}
          </Text>
        </View>
        <Switch
          value={isPrivate}
          onValueChange={setIsPrivate}
          trackColor={{ true: theme.inverse, false: theme.backgroundSelected }}
          thumbColor={theme.card}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>
    </GradientHeader>
  );

  return (
    <Screen header={header} tabBar refreshing={profile.isRefetching} onRefresh={() => profile.refetch()}>
      <View style={styles.tiles}>
        <Tile label="Current streak" value={`${profile.data?.current_streak ?? 0}`} unit="days" dark />
        <Tile label="Longest streak" value={`${profile.data?.longest_streak ?? 0}`} unit="days" />
        <Tile label="Today's calories" value={Math.round(totals.calories).toLocaleString()} />
        <Tile label="Today's protein" value={`${Math.round(totals.protein)}`} unit="g" />
      </View>

      <Card style={styles.card}>
        <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.text }]}>Account</Text>
        <TextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
      </Card>

      <Card style={styles.card}>
        <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.text }]}>Daily goals</Text>
        <GoalRow label="Calories (kcal)" value={calorieGoal} onChange={setCalorieGoal} />
        <GoalRow label="Protein (g)" value={proteinGoal} onChange={setProteinGoal} />
        <GoalRow label="Carbs (g)" value={carbsGoal} onChange={setCarbsGoal} />
        <GoalRow label="Fats (g)" value={fatsGoal} onChange={setFatsGoal} last />
      </Card>

      <Button title="Save changes" variant="accent" loading={updateProfile.isPending} onPress={handleSave} />
      <Button title="Sign out" variant="danger" icon="log-out-outline" style={{ backgroundColor: theme.card }} onPress={confirmSignOut} />
    </Screen>
  );
}

function Tile({ label, value, unit, dark }: { label: string; value: string; unit?: string; dark?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: dark ? theme.inverse : theme.card }]}>
      <Text style={[styles.tileLabel, { color: dark ? theme.onInverseSecondary : theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: dark ? theme.onInverse : theme.text }]}>
        {value}
        {unit ? <Text style={[styles.tileUnit, { color: dark ? theme.onInverseSecondary : theme.textSecondary }]}>{` ${unit}`}</Text> : null}
      </Text>
    </View>
  );
}

function GoalRow({ label, value, onChange, last }: { label: string; value: string; onChange: (v: string) => void; last?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.goalRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <Text style={[styles.goalLabel, { color: theme.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={`${label} goal`}
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
        style={[styles.goalInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 68, height: 68, borderRadius: Radius.pill, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontFamily: Font.extrabold },
  username: { fontSize: 22, fontFamily: Font.bold },
  muted: { fontSize: 13, fontFamily: Font.medium },
  privacy: { borderRadius: 18, padding: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  privacyTitle: { fontSize: 15, fontFamily: Font.bold },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { flexBasis: '48%', flexGrow: 1, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  tileLabel: { fontSize: 13, fontFamily: Font.medium },
  tileValue: { fontSize: 22, fontFamily: Font.medium, letterSpacing: -0.5 },
  tileUnit: { fontSize: 14, fontFamily: Font.medium, letterSpacing: 0 },
  card: { gap: 10 },
  cardTitle: { fontSize: 17, fontFamily: Font.bold },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  goalLabel: { fontSize: 15, fontFamily: Font.medium },
  goalInput: { width: 96, minHeight: 40, borderRadius: Radius.sm, textAlign: 'center', fontSize: 15, fontFamily: Font.bold },
});
