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
    primary: '#5B3CF5',
    onPrimary: '#FFFFFF',
    primaryContainer: '#EDE9FF',
    onPrimaryContainer: '#1A005E',
    secondary: '#4895EF',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#D6EBFF',
    onSecondaryContainer: '#003060',
    tertiary: '#5B3CF5',
    background: '#F5F4FF',
    surface: '#FFFFFF',
    surfaceVariant: '#EDE9FF',
    onSurfaceVariant: '#5F5585',
    error: '#EA4335',
    success: '#5B3CF5',
    elevation: {
      level0: 'transparent',
      level1: 'rgb(246, 244, 255)',
      level2: 'rgb(240, 237, 255)',
      level3: 'rgb(235, 230, 255)',
      level4: 'rgb(231, 225, 255)',
      level5: 'rgb(227, 220, 255)',
    },
    mapControlText: '#5F5585',
    mapControlBg: '#F5F4FF',
    mapDark: '#2D1B69',
  },
};
