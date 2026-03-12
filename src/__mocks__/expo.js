module.exports = {
  registerRootComponent: jest.fn(),
  Constants: {
    expoConfig: { extra: {} },
    manifest: { extra: {} },
  },
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  MediaTypeOptions: { Images: 'Images' },
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } })),
  getLastKnownPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } })),
  hasServicesEnabledAsync: jest.fn(() => Promise.resolve(true)),
  Accuracy: { Balanced: 3 },
};
