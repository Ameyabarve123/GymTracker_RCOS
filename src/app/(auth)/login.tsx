import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.logo, { color: theme.tint }]}>GymTracker</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Welcome back. Let&apos;s get after it.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            placeholder="Your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title="Log In" loading={loading} onPress={handleLogin} />
        </View>

        <View style={styles.footer}>
          <Text style={{ color: theme.textSecondary }}>Don&apos;t have an account? </Text>
          <Link href="/signup" style={{ color: theme.tint, fontWeight: '700' }}>
            Sign up
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', gap: Spacing.five },
  header: { gap: Spacing.two, alignItems: 'center' },
  logo: { fontSize: 36, fontWeight: '800' },
  subtitle: { fontSize: 15 },
  form: { gap: Spacing.three },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
