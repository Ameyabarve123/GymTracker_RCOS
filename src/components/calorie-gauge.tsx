import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Font, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const WIDTH = 170;
const RADIUS = 73;
const STROKE = 10;
const ARC = `M${(WIDTH - RADIUS * 2) / 2} ${RADIUS + STROKE} A${RADIUS} ${RADIUS} 0 0 1 ${WIDTH - (WIDTH - RADIUS * 2) / 2} ${RADIUS + STROKE}`;
const ARC_LENGTH = Math.PI * RADIUS;

/** Half-circle gauge with the percentage in the middle and a lavender pill underneath. */
export function CalorieGauge({ eaten, goal }: { eaten: number; goal: number }) {
  const theme = useTheme();
  const pct = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const left = Math.max(goal - eaten, 0);
  const over = Math.max(eaten - goal, 0);

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`${Math.round(pct * 100)} percent of your ${goal} calorie goal. ${over > 0 ? `${Math.round(over)} over` : `${Math.round(left)} left`}.`}>
      <Svg width={WIDTH} height={RADIUS + STROKE * 2} style={styles.svg}>
        <Path d={ARC} fill="none" stroke={theme.backgroundSelected} strokeWidth={STROKE} strokeLinecap="round" />
        {pct > 0 ? (
          <Path
            d={ARC}
            fill="none"
            stroke={theme.mint}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH * pct} ${ARC_LENGTH}`}
          />
        ) : null}
      </Svg>
      <Text style={[styles.pct, { color: theme.text }]}>
        {Math.round(pct * 100)}
        <Text style={[styles.unit, { color: theme.textSecondary }]}> %</Text>
      </Text>
      <View style={[styles.pill, { backgroundColor: theme.lavender }]}>
        <Text style={[styles.pillText, { color: theme.text }]}>
          {over > 0 ? `${Math.round(over).toLocaleString()} kcal over` : `${Math.round(left).toLocaleString()} kcal left`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 140, alignItems: 'center', justifyContent: 'flex-end' },
  svg: { position: 'absolute', top: 6 },
  pct: { fontSize: 32, fontFamily: Font.semibold, letterSpacing: -1, lineHeight: 36 },
  unit: { fontSize: 15, fontFamily: Font.medium, letterSpacing: 0 },
  pill: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.pill },
  pillText: { fontSize: 14, fontFamily: Font.semibold },
});
