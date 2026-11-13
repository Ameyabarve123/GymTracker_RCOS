/**
 * Design tokens for the GymTracker UI redesign (see architectureDesign/UI_Redesign).
 * Soft peach-to-mint gradient headers, white rounded cards on a warm grey ground,
 * black "metric" panels, a yellow call-to-action, and pastel accents.
 */

import '@/global.css';

import { Platform } from 'react-native';

const pastel = {
  lavender: '#DCD3FA',
  mint: '#A6E1DA',
  peach: '#F7D2C3',
  yellow: '#F7E27A',
} as const;

export const Colors = {
  light: {
    text: '#111111',
    textSecondary: '#5C5C5C',
    background: '#F2F2F0',
    card: '#FFFFFF',
    /** Fill for inputs, rows and chips that sit inside a card. */
    backgroundElement: '#F2F2F0',
    backgroundSelected: '#E6E3DE',
    border: '#E6E3DE',
    /** Primary actions: black buttons with white labels. */
    tint: '#111111',
    onTint: '#FFFFFF',
    tintMuted: pastel.lavender,
    /** Yellow call-to-action. */
    accent: pastel.yellow,
    onAccent: '#111111',
    /** Black metric panels and the active tab. */
    inverse: '#111111',
    onInverse: '#FFFFFF',
    onInverseSecondary: '#A9A9A9',
    inverseTrack: '#333333',
    danger: '#B42318',
    success: '#1F7A6F',
    warning: '#B4532A',
    dropset: '#5B47B5',
    dropsetFill: '#F4F0FE',
    ...pastel,
    calories: pastel.yellow,
    protein: pastel.lavender,
    carbs: pastel.mint,
    fats: pastel.peach,
    gradient: ['#F7D2C3', '#F4EEE8', '#A6E1DA'] as const,
    tabBar: 'rgba(255,255,255,0.96)',
    shadow: '#000000',
  },
  dark: {
    text: '#F5F5F3',
    textSecondary: '#A9A9A9',
    background: '#0E0E0E',
    card: '#1C1C1C',
    backgroundElement: '#2A2A2A',
    backgroundSelected: '#333333',
    border: '#2E2E2E',
    tint: '#F5F5F3',
    onTint: '#111111',
    tintMuted: '#3B3459',
    accent: pastel.yellow,
    onAccent: '#111111',
    inverse: '#000000',
    onInverse: '#FFFFFF',
    onInverseSecondary: '#A9A9A9',
    inverseTrack: '#333333',
    danger: '#FF8A80',
    success: '#7FD8CC',
    warning: '#F7B096',
    dropset: '#C9BDF7',
    dropsetFill: '#2A2540',
    lavender: '#3B3459',
    mint: '#24504B',
    peach: '#5A3A2F',
    yellow: '#5C5326',
    calories: pastel.yellow,
    protein: pastel.lavender,
    carbs: pastel.mint,
    fats: pastel.peach,
    gradient: ['#4A3530', '#1E1E1E', '#1F4541'] as const,
    tabBar: 'rgba(28,28,28,0.96)',
    shadow: '#000000',
  },
} as const;

export type ThemeColor = {
  [K in keyof typeof Colors.light]: (typeof Colors.light)[K] extends string ? K : never;
}[keyof typeof Colors.light];

/** Manrope faces, loaded in the root layout. Each weight is its own family on Android. */
export const Font = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 36,
  pill: 999,
} as const;

/** Space reserved under scrolling tab screens for the floating tab bar. */
export const TabBarSpace = 112;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
