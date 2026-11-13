import type { PropsWithChildren, ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, TabBarSpace } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = PropsWithChildren<{
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  refreshEnabled?: boolean;
  contentStyle?: ViewStyle;
  /** Full-bleed header (usually a GradientHeader) drawn above the padded content. */
  header?: ReactNode;
  /** Leave room for the floating tab bar. */
  tabBar?: boolean;
  /** Pad for the top safe area when there is no header. */
  edges?: boolean;
}>;

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  refreshEnabled = true,
  contentStyle,
  header,
  tabBar = false,
  edges = true,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const padding: ViewStyle = {
    paddingTop: header ? Spacing.two : edges ? insets.top + Spacing.two : Spacing.three,
    paddingBottom: tabBar ? TabBarSpace + insets.bottom : Spacing.six,
    paddingHorizontal: Spacing.two,
  };

  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        {header}
        <View style={[styles.inner, padding, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.grow}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            enabled={refreshEnabled}
            onRefresh={() => { if (refreshEnabled) onRefresh(); }}
            tintColor={theme.text}
          />
        ) : undefined
      }>
      {header}
      <View style={[styles.inner, padding, contentStyle]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
  },
});
