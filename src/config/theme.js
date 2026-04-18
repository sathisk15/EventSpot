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
    primary: '#6200EE',
    secondary: '#03DAC6',
    tertiary: '#FF5722',
    background: '#F6F6F6',
    surface: '#FFFFFF',
    error: '#B00020',
    success: '#4CAF50',
    mapControlText: '#334155',
    mapControlBg: '#F5F7FA',
    mapDark: '#0F172A',
  },
};
