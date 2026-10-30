import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SetupRequired() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top + Spacing.five },
      ]}>
      <Text style={[styles.title, { color: theme.text }]}>GymTracker</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Supabase isn&apos;t configured yet.
      </Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.step, { color: theme.text }]}>
          1. Copy <Text style={styles.code}>.env.example</Text> to <Text style={styles.code}>.env</Text>
        </Text>
        <Text style={[styles.step, { color: theme.text }]}>
          2. Add your <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_URL</Text> and{' '}
          <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>
        </Text>
        <Text style={[styles.step, { color: theme.text }]}>
          3. Run the SQL in <Text style={styles.code}>supabase/migrations</Text>
        </Text>
        <Text style={[styles.step, { color: theme.text }]}>4. Restart with the cache cleared</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.four, gap: Spacing.three },
  title: { fontSize: 32, fontWeight: '800' },
  body: { fontSize: 16 },
  card: { borderRadius: 16, padding: Spacing.four, gap: Spacing.three, marginTop: Spacing.two },
  step: { fontSize: 15, lineHeight: 22 },
  code: { fontWeight: '700' },
});
