import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/lib/auth';

export default function SignupScreen() {
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
    <AuthShell
      mode="signup"
      headline={'Start your\nstreak today.'}
      tagline="Track your lifts, meals, and streaks."
      footer={{ prompt: 'Already have an account?', linkLabel: 'Log in', href: '/login' }}>
      <TextField
        label="Username"
        placeholder="gymrat99"
        autoCapitalize="none"
        autoComplete="username"
        value={username}
        onChangeText={setUsername}
      />
      <TextField
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label="Password"
        placeholder="At least 6 characters"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleSignup}
      />
      <Button title="Create account" variant="accent" icon="arrow-forward" loading={loading} onPress={handleSignup} />
    </AuthShell>
  );
}
