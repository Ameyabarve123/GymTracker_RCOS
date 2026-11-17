import { Tabs, usePathname, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useMemo } from 'react';
import { Easing, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useReducedMotion } from 'react-native-reanimated';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useTheme } from '@/hooks/use-theme';

type TabOptions = NonNullable<Extract<React.ComponentProps<typeof Tabs>['screenOptions'], object>>;

// The tabs in bar order, by their URL path. Used to map a swipe to the neighbouring tab.
const TAB_ORDER = ['/', '/nutrition', '/workouts', '/profile'] as const;

/**
 * Smooth "fade through" between tabs (Material's pattern for switching sections): the old page
 * fades out quickly, then the new one fades in while drifting 12px into place. One gentle
 * ease (Material's standard curve) over 240ms, so pages never overlap half-transparent.
 */
const pageTransition: TabOptions = {
  animation: 'shift',
  transitionSpec: {
    animation: 'timing',
    config: { duration: 240, easing: Easing.bezier(0.2, 0, 0, 1) },
  },
  sceneStyleInterpolator: ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, -0.4, 0, 0.4, 1],
        outputRange: [0, 0, 1, 0, 0],
      }),
      transform: [
        { translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-12, 0, 12] }) },
      ],
    },
  }),
};

/**
 * Lets a horizontal swipe move to the neighbouring tab (swipe left = next, right = previous),
 * animated by the same fade-through as tapping. The gesture only claims clearly-horizontal
 * swipes (activeOffsetX) and yields to vertical scrolling (failOffsetY); its 24px threshold
 * also lets inner horizontal scrollers — like the Workouts calendar's month swipe — win first.
 */
function SwipeableTabs({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const navigate = useCallback((path: (typeof TAB_ORDER)[number]) => router.navigate(path), [router]);

  // A worklet gesture (no .runOnJS) so the gesture library wraps us in an animated view that the
  // New Architecture won't flatten; runOnJS hops back to JS only to perform the navigation.
  // Rebuilt when the active tab changes, so the handler always knows the current tab.
  const swipe = useMemo(() => {
    const current = TAB_ORDER.indexOf(pathname as (typeof TAB_ORDER)[number]);
    return Gesture.Pan()
      .activeOffsetX([-24, 24])
      .failOffsetY([-18, 18])
      .onEnd((event) => {
        'worklet';
        // Needs either a decent distance or a flick, so a small drag doesn't change tabs.
        if (Math.abs(event.translationX) < 56 && Math.abs(event.velocityX) < 500) return;
        const target = current + (event.translationX < 0 ? 1 : -1);
        if (current < 0 || target < 0 || target >= TAB_ORDER.length) return;
        runOnJS(navigate)(TAB_ORDER[target]);
      });
  }, [pathname, navigate]);

  // collapsable={false} stops React Native flattening this view away, which the gesture needs.
  return (
    <GestureDetector gesture={swipe}>
      <View collapsable={false} style={styles.fill}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

export default function TabsLayout() {
  const theme = useTheme();
  // Respect the phone's "Remove animations" accessibility setting.
  const reduceMotion = useReducedMotion();

  return (
    <SwipeableTabs>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.background },
          ...(reduceMotion ? { animation: 'none' } : pageTransition),
        }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="nutrition" options={{ title: 'Nutrition' }} />
        <Tabs.Screen name="workouts" options={{ title: 'Workouts' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </SwipeableTabs>
  );
}
