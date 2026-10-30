import type { PropsWithChildren } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = PropsWithChildren<{
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  edges?: boolean;
}>;

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  edges = true,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const padding: ViewStyle = {
    paddingTop: edges ? insets.top + Spacing.two : Spacing.three,
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.three,
  };

  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={[styles.inner, padding, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.inner, padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
        ) : undefined
      }>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
  },
});
