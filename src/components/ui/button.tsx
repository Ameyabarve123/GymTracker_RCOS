import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: Props) {
  const theme = useTheme();

  const bg =
    variant === 'primary'
      ? theme.tint
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.backgroundElement
          : 'transparent';

  const fg =
    variant === 'primary' || variant === 'danger'
      ? '#ffffff'
      : variant === 'ghost'
        ? theme.tint
        : theme.text;

  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : state.pressed ? 0.85 : 1 },
        fullWidth && styles.fullWidth,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <Text style={[styles.label, { color: fg }]}>{title}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { fontSize: 16, fontWeight: '700' },
});
