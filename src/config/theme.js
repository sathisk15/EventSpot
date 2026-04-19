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
  full: 999,
};

export const elevation = {
  none: 0,
  low: 2,
  mid: 4,
  high: 8,
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1A73E8',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D2E3FC',
    onPrimaryContainer: '#001D35',
    secondary: '#34A853',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#CEEAD6',
    onSecondaryContainer: '#002204',
    tertiary: '#FBBC04',
    background: '#F1F3F4',
    surface: '#FFFFFF',
    surfaceVariant: '#E8F0FE',
    onSurfaceVariant: '#5F6368',
    error: '#EA4335',
    success: '#34A853',
    elevation: {
      level0: 'transparent',
      level1: 'rgb(244, 248, 254)',
      level2: 'rgb(237, 244, 253)',
      level3: 'rgb(230, 240, 252)',
      level4: 'rgb(227, 238, 252)',
      level5: 'rgb(223, 235, 252)',
    },
    mapControlText: '#5F6368',
    mapControlBg: '#F1F3F4',
    mapDark: '#3C4043',
  },
};
