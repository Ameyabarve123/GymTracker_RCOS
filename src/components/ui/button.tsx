import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from 'react-native';

import { Font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'md' | 'sm';
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  icon,
  size = 'md',
  ...rest
}: Props) {
  const theme = useTheme();

  const colors: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.tint, fg: theme.onTint },
    accent: { bg: theme.accent, fg: theme.onAccent },
    secondary: { bg: theme.card, fg: theme.text },
    outline: { bg: 'transparent', fg: theme.text, border: theme.textSecondary },
    ghost: { bg: 'transparent', fg: theme.text },
    danger: { bg: theme.backgroundElement, fg: theme.danger },
  };
  const { bg, fg, border } = colors[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        size === 'sm' && styles.small,
        { backgroundColor: bg, opacity: isDisabled ? 0.45 : state.pressed ? 0.85 : 1 },
        border ? { borderColor: border, borderWidth: 1.5, borderStyle: 'dashed' } : null,
        fullWidth && styles.fullWidth,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg} /> : null}
            <Text style={[styles.label, size === 'sm' && styles.smallLabel, { color: fg }]}>{title}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 44, paddingHorizontal: Spacing.three },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { fontSize: 16, fontFamily: Font.extrabold },
  smallLabel: { fontSize: 14, fontFamily: Font.bold },
});
