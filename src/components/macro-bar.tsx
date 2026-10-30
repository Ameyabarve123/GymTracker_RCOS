import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  value: number;
  goal: number;
  color: string;
  unit?: string;
};

export function MacroBar({ label, value, goal, color, unit = 'g' }: Props) {
  const theme = useTheme();
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.value, { color: theme.textSecondary }]}>
          {Math.round(value)}
          <Text style={{ color: theme.textSecondary }}>
            {' / '}
            {goal}
            {unit}
          </Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.one + 2, alignSelf: 'stretch' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 14, fontWeight: '600' },
  value: { fontSize: 13, fontWeight: '600' },
  track: { height: 10, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
});
