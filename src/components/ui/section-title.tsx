import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Large light section title with an optional round black arrow or a small trailing note. */
export function SectionTitle({ title, note, onPress, actionLabel }: {
  title: string;
  note?: string;
  onPress?: () => void;
  actionLabel?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
      {note ? <Text style={[styles.note, { color: theme.textSecondary }]}>{note}</Text> : null}
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel ?? `Open ${title}`}
          onPress={onPress}
          style={[styles.arrow, { backgroundColor: theme.inverse }]}>
          <Ionicons name="arrow-forward" size={18} color={theme.onInverse} style={styles.diagonal} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    marginTop: Spacing.three,
    minHeight: 44,
  },
  title: { fontSize: 24, fontFamily: Font.medium, letterSpacing: -0.5 },
  note: { fontSize: 14, fontFamily: Font.medium },
  arrow: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  diagonal: { transform: [{ rotate: '-45deg' }] },
});
