module.exports = {
  preset: 'react-native',
  testTimeout: 15000,
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo|@expo|react-navigation|@react-navigation|react-native-paper|react-native-webview|@react-native-community|firebase)',
  ],
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    './jest.setup.js'
  ],
  setupFiles: [],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  moduleNameMapper: {
    '^expo$': '<rootDir>/src/__mocks__/expo.js',
    '^expo-constants$': '<rootDir>/src/__mocks__/expo.js',
    '^expo-modules-core$': '<rootDir>/src/__mocks__/expo.js',
  },
  modulePathIgnorePatterns: ['<rootDir>/.expo/'],
  globals: {
    __DEV__: true,
  },
};
