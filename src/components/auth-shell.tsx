import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'login' | 'signup';

/** Gradient hero with a headline, plus a white card holding the Log in / Sign up form. */
export function AuthShell({ mode, headline, tagline, footer, children }: PropsWithChildren<{
  mode: Mode;
  headline: string;
  tagline: string;
  footer: { prompt: string; linkLabel: string; href: '/login' | '/signup' };
}>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.five }]}
        keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + Spacing.five }]}>
          <View style={[styles.logo, { backgroundColor: theme.inverse }]}>
            <Ionicons name="barbell-outline" size={28} color={theme.onInverse} />
          </View>
          <Text accessibilityRole="header" style={[styles.headline, { color: theme.text }]}>{headline}</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>{tagline}</Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]} accessibilityRole="tablist">
            <Segment label="Log in" href="/login" active={mode === 'login'} />
            <Segment label="Sign up" href="/signup" active={mode === 'signup'} />
          </View>
          {children}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>{footer.prompt} </Text>
          <Link href={footer.href} replace style={[styles.footerLink, { color: theme.text }]}>
            {footer.linkLabel}
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Segment({ label, href, active }: { label: string; href: '/login' | '/signup'; active: boolean }) {
  const theme = useTheme();
  if (active) {
    return (
      <View accessibilityRole="tab" accessibilityState={{ selected: true }} style={[styles.segItem, { backgroundColor: theme.inverse }]}>
        <Text style={[styles.segText, { color: theme.onInverse }]}>{label}</Text>
      </View>
    );
  }
  return (
    <Link href={href} replace accessibilityRole="tab" style={[styles.segItem, styles.segLink, { color: theme.textSecondary }]}>
      {label}
    </Link>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    minHeight: 380,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 28,
    paddingBottom: 72,
    gap: 18,
  },
  logo: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headline: { fontSize: 38, lineHeight: 42, fontFamily: Font.bold, letterSpacing: -1 },
  tagline: { fontSize: 15, fontFamily: Font.medium },
  card: {
    marginTop: -48,
    marginHorizontal: Spacing.three,
    borderRadius: 28,
    padding: Spacing.four,
    gap: 14,
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
    width: 'auto',
    maxWidth: 480,
    alignSelf: 'stretch',
  },
  segment: { flexDirection: 'row', gap: 6, borderRadius: Radius.pill, padding: 5 },
  segItem: { flex: 1, minHeight: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  segLink: { textAlign: 'center', textAlignVertical: 'center', lineHeight: 44, fontSize: 14, fontFamily: Font.semibold },
  segText: { fontSize: 14, fontFamily: Font.bold },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.four, flexWrap: 'wrap' },
  footerText: { fontSize: 14, fontFamily: Font.medium },
  footerLink: { fontSize: 14, fontFamily: Font.bold, textDecorationLine: 'underline' },
});
