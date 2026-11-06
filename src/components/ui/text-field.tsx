import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  onClear?: () => void;
  clearLabel?: string;
};

export function TextField({ label, hint, style, onFocus, onBlur, onClear, clearLabel = 'Clear text', ...rest }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text> : null}
      <View>
        <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: focused ? theme.tint : theme.border,
          },
          style,
          onClear ? styles.clearableInput : undefined,
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
        {onClear && !!rest.value && rest.editable !== false ? (
          <Pressable accessibilityRole="button" accessibilityLabel={clearLabel} style={styles.clearButton} onPress={onClear}>
            <Text style={[styles.clearText, { color: theme.textSecondary }]}>×</Text>
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.two, alignSelf: 'stretch' },
  label: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
    fontSize: 16,
  },
  hint: { fontSize: 12 },
  clearableInput: { paddingRight: 48 },
  clearButton: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, justifyContent: 'center', alignItems: 'center' },
  clearText: { fontSize: 26 },
});
