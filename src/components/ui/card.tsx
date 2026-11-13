import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** White rounded surface on the grey ground. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card }, style]} {...rest} />;
}

/** Black metric panel ("Your Macros", "Session Summary"). */
export function Panel({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return <View style={[styles.panel, { backgroundColor: theme.inverse }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  panel: {
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: Spacing.three,
  },
});
