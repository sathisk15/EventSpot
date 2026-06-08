import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
};

export const elevation = {
  none: 0,
  low: 2,
  mid: 4,
  high: 8,
};

export const gradient = {
  colors: ['#6A3FF5', '#E84DBB', '#1F8FFF'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6A3FF5',
    onPrimary: '#FFFFFF',
    primaryContainer: '#EEE8FF',
    onPrimaryContainer: '#1A005E',
    secondary: '#E84DBB',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFE4F5',
    onSecondaryContainer: '#3D0030',
    tertiary: '#1F8FFF',
    background: '#F8F9FF',
    surface: '#FFFFFF',
    surfaceVariant: '#F2F5FF',
    onSurfaceVariant: '#667085',
    outline: '#E4E7EC',
    outlineVariant: '#F2F4F7',
    error: '#EA4335',
    success: '#22C55E',
    accent: '#FF6B2C',
    accentYellow: '#FFC94A',
    textPrimary: '#1A1D29',
    textSecondary: '#667085',
    textMuted: '#98A2B3',
    elevation: {
      level0: 'transparent',
      level1: 'rgb(247, 246, 255)',
      level2: 'rgb(242, 240, 255)',
      level3: 'rgb(237, 234, 255)',
      level4: 'rgb(232, 228, 255)',
      level5: 'rgb(227, 222, 255)',
    },
    mapControlText: '#667085',
    mapControlBg: '#F8F9FF',
    mapDark: '#1A1D29',
  },
};
