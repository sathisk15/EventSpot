import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200EE', // Deep Purple
    secondary: '#03DAC6', // Vibrant Teal
    tertiary: '#FF5722', // Coral accent
    background: '#F6F6F6', // Off-white clean background
    surface: '#FFFFFF', // Clean surface for cards
    error: '#B00020',
  },
};
