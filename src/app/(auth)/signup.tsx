import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export default function SignupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!username || !email || !password) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { needsConfirmation } = await signUp(email, password, username);
      if (needsConfirmation) {
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link. Confirm your email, then log in.'
        );
        router.replace('/login');
      }
      // Otherwise the auth listener will route into the app automatically.
    } catch (err) {
      Alert.alert('Sign up failed', err instanceof Error ? err.message : 'Something went wrong.');
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
          <Text style={[styles.logo, { color: theme.tint }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Track your lifts, meals, and streaks.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Username"
            placeholder="gymrat99"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
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
            placeholder="At least 6 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title="Sign Up" loading={loading} onPress={handleSignup} />
        </View>

        <View style={styles.footer}>
          <Text style={{ color: theme.textSecondary }}>Already have an account? </Text>
          <Link href="/login" style={{ color: theme.tint, fontWeight: '700' }}>
            Log in
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
  logo: { fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: 15 },
  form: { gap: Spacing.three },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
