import { Ionicons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import { type ComponentProps, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  nutrition: 'restaurant-outline',
  workouts: 'barbell-outline',
  profile: 'person-outline',
};

// Layout of the bar; the sliding indicator is positioned from these numbers.
const ITEM_WIDTH = 64;
const ITEM_HEIGHT = 56;
const GAP = 4;
const PADDING = 6;

const slotLeft = (index: number) => PADDING + index * (ITEM_WIDTH + GAP);

// The "sticky" feel: the edge moving toward the new tab springs fast, the trailing edge lags,
// so the pill stretches toward its destination, then pulls its tail in and settles.
const LEADING_EDGE = { damping: 16, stiffness: 320, mass: 0.6 };
const TRAILING_EDGE = { damping: 18, stiffness: 150, mass: 0.9 };

/** Floating pill tab bar: a black indicator slides and stretches between tabs. */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  // The indicator's left and right edges, in pixels from the bar's left side.
  const left = useSharedValue(slotLeft(state.index));
  const right = useSharedValue(slotLeft(state.index) + ITEM_WIDTH);
  const previousIndex = useRef(state.index);

  useEffect(() => {
    const from = previousIndex.current;
    const to = state.index;
    previousIndex.current = to;
    const targetLeft = slotLeft(to);
    const targetRight = targetLeft + ITEM_WIDTH;

    if (reduceMotion || from === to) {
      left.value = targetLeft;
      right.value = targetRight;
      return;
    }
    const movingRight = to > from;
    left.value = withSpring(targetLeft, movingRight ? TRAILING_EDGE : LEADING_EDGE);
    right.value = withSpring(targetRight, movingRight ? LEADING_EDGE : TRAILING_EDGE);
  }, [state.index, reduceMotion, left, right]);

  const indicatorStyle = useAnimatedStyle(() => {
    const width = Math.max(right.value - left.value, ITEM_WIDTH * 0.6);
    // Flatten slightly while stretched, like a stretched drop.
    const stretch = Math.min(Math.max((width - ITEM_WIDTH) / ITEM_WIDTH, 0), 1);
    return {
      left: left.value,
      width,
      transform: [{ scaleY: interpolate(stretch, [0, 1], [1, 0.86]) }],
    };
  });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 14 }]}>
      <View style={[styles.bar, { backgroundColor: theme.tabBar, shadowColor: theme.shadow }]} accessibilityRole="tablist">
        <Animated.View pointerEvents="none" style={[styles.indicator, { backgroundColor: theme.inverse }, indicatorStyle]} />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={styles.item}>
              <TabIcon
                name={ICONS[route.name] ?? 'ellipse-outline'}
                index={index}
                left={left}
                right={right}
                color={theme.text}
                activeColor={theme.onInverse}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Icon that turns light as the indicator covers its slot, so it is always readable mid-slide. */
function TabIcon({ name, index, left, right, color, activeColor }: {
  name: keyof typeof Ionicons.glyphMap;
  index: number;
  left: SharedValue<number>;
  right: SharedValue<number>;
  color: string;
  activeColor: string;
}) {
  const start = slotLeft(index);
  const activeStyle = useAnimatedStyle(() => {
    const overlap = Math.min(right.value, start + ITEM_WIDTH) - Math.max(left.value, start);
    return { opacity: Math.min(Math.max(overlap / ITEM_WIDTH, 0), 1) };
  });

  return (
    <View>
      <Ionicons name={name} size={22} color={color} />
      <Animated.View style={[StyleSheet.absoluteFill, activeStyle]}>
        <Ionicons name={name} size={22} color={activeColor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    gap: GAP,
    padding: PADDING,
    borderRadius: 28,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  indicator: {
    position: 'absolute',
    top: PADDING,
    height: ITEM_HEIGHT,
    borderRadius: Radius.lg - 2,
  },
  item: { width: ITEM_WIDTH, height: ITEM_HEIGHT, borderRadius: Radius.lg - 2, alignItems: 'center', justifyContent: 'center' },
});
