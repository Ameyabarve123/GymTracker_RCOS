import { StyleSheet, Text, View } from 'react-native';

import { Font, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  value: number;
  goal: number;
  color: string;
  unit?: string;
  /** Draw on a black panel instead of a white card. */
  inverse?: boolean;
};

/** "Protein  112 / 160 g" with a slim progress bar, styled for the black macro panel. */
export function MacroBar({ label, value, goal, color, unit = 'g', inverse = false }: Props) {
  const theme = useTheme();
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const strong = inverse ? theme.onInverse : theme.text;
  const muted = inverse ? theme.onInverseSecondary : theme.textSecondary;

  return (
    <View
      style={styles.block}
      accessible
      accessibilityLabel={`${label}: ${Math.round(value)} of ${goal}${unit ? ` ${unit}` : ''}`}>
      <Text style={[styles.label, { color: muted }]}>{label}</Text>
      <Text style={[styles.value, { color: strong }]}>
        {Math.round(value).toLocaleString()}
        <Text style={[styles.goal, { color: muted }]}>{` / ${goal.toLocaleString()}${unit ? ` ${unit}` : ''}`}</Text>
      </Text>
      <View style={[styles.track, { backgroundColor: inverse ? theme.inverseTrack : theme.backgroundElement }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 2, flex: 1, minWidth: 0 },
  label: { fontSize: 13, fontFamily: Font.medium },
  value: { fontSize: 22, fontFamily: Font.medium, letterSpacing: -0.5 },
  goal: { fontSize: 13, fontFamily: Font.medium, letterSpacing: 0 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: Spacing.one + 2 },
  fill: { height: '100%', borderRadius: 3 },
});
