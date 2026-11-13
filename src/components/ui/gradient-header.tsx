import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Font, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type HeaderProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  style?: ViewStyle;
}>;

/** Peach-to-mint header with a centered title, round side buttons, and optional content below. */
export function GradientHeader({ title, subtitle, left, right, children, style }: HeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + Spacing.two }, style]}>
      <View style={styles.inner}>
        {title || left || right ? (
          <View style={styles.bar}>
            <View style={styles.side}>{left}</View>
            <View style={styles.titles}>
              {title ? (
                <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: theme.text }]}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View style={[styles.side, styles.sideRight]}>{right}</View>
          </View>
        ) : null}
        {children}
      </View>
    </LinearGradient>
  );
}

type CircleButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: 'light' | 'dark';
  disabled?: boolean;
  size?: number;
};

/** Round icon button used in headers ("back", "more", "calendar", "add"). */
export function CircleButton({ icon, accessibilityLabel, onPress, variant = 'light', disabled, size = 46 }: CircleButtonProps) {
  const theme = useTheme();
  const dark = variant === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.circle,
        {
          width: size,
          height: size,
          backgroundColor: dark ? theme.inverse : theme.card,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}>
      <Ionicons name={icon} size={20} color={dark ? theme.onInverse : theme.text} />
    </Pressable>
  );
}

/** Small white pill used for header facts ("3 meals", "Preset: Push"). */
export function Chip({ children, tone, onPress }: PropsWithChildren<{ tone?: string; onPress?: () => void }>) {
  const theme = useTheme();
  const content = (
    <Text style={[styles.chipText, { color: tone ?? theme.text }]} numberOfLines={1}>
      {children}
    </Text>
  );
  if (!onPress) return <View style={[styles.chip, { backgroundColor: theme.card }]}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, { backgroundColor: theme.card }]}>
      {content}
    </Pressable>
  );
}

export function ChipRow({ children }: PropsWithChildren) {
  return <View style={styles.chipRow}>{children}</View>;
}

const styles = StyleSheet.create({
  header: {
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    paddingBottom: 18,
  },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  side: { width: 46, minHeight: 46, justifyContent: 'center' },
  sideRight: { alignItems: 'flex-end' },
  titles: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontFamily: Font.semibold },
  subtitle: { fontSize: 14, fontFamily: Font.medium, textTransform: 'uppercase' },
  circle: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two },
  chip: { borderRadius: Radius.sm, paddingVertical: Spacing.two, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  chipText: { fontSize: 14, fontFamily: Font.bold },
});
