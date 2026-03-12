describe('firebase config', () => {
  const envBackup = {...process.env};

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...envBackup,
      EXPO_PUBLIC_FIREBASE_API_KEY: 'api-key',
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'project-id',
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'bucket.appspot.com',
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'sender-id',
      EXPO_PUBLIC_FIREBASE_APP_ID: 'app-id',
    };
  });

  afterAll(() => {
    process.env = envBackup;
  });

  it('initializes auth with AsyncStorage persistence', () => {
    const initializeApp = jest.fn(() => 'mock-app');
    const getApps = jest.fn(() => []);
    const getApp = jest.fn();
    const initializeAuth = jest.fn(() => 'mock-auth');
    const getAuth = jest.fn(() => 'fallback-auth');
    const getReactNativePersistence = jest.fn(() => 'mock-persistence');
    const getStorage = jest.fn(() => 'mock-storage');
    const getFirestore = jest.fn(() => 'mock-db');

    jest.doMock('firebase/app', () => ({
      initializeApp,
      getApps,
      getApp,
    }));
    jest.doMock('firebase/auth', () => ({
      initializeAuth,
      getAuth,
      getReactNativePersistence,
    }));
    jest.doMock('firebase/storage', () => ({
      getStorage,
    }));
    jest.doMock('firebase/firestore', () => ({
      getFirestore,
    }));
    jest.doMock('@react-native-async-storage/async-storage', () => 'mock-async-storage');

    let firebaseModule;
    jest.isolateModules(() => {
      jest.unmock('../firebase');
      firebaseModule = require('../firebase');
    });

    expect(initializeApp).toHaveBeenCalledWith({
      apiKey: 'api-key',
      authDomain: 'example.firebaseapp.com',
      projectId: 'project-id',
      storageBucket: 'bucket.appspot.com',
      messagingSenderId: 'sender-id',
      appId: 'app-id',
    });
    expect(getReactNativePersistence).toHaveBeenCalledWith('mock-async-storage');
    expect(initializeAuth).toHaveBeenCalledWith('mock-app', {
      persistence: 'mock-persistence',
    });
    expect(getAuth).not.toHaveBeenCalled();
    expect(firebaseModule.auth).toBe('mock-auth');
    expect(firebaseModule.storage).toBe('mock-storage');
    expect(firebaseModule.db).toBe('mock-db');
  });

  it('falls back to getAuth when auth has already been initialized', () => {
    const initializeApp = jest.fn(() => 'mock-app');
    const getApps = jest.fn(() => []);
    const getApp = jest.fn();
    const initializeAuth = jest.fn(() => {
      throw new Error('already initialized');
    });
    const getAuth = jest.fn(() => 'fallback-auth');
    const getReactNativePersistence = jest.fn(() => 'mock-persistence');

    jest.doMock('firebase/app', () => ({
      initializeApp,
      getApps,
      getApp,
    }));
    jest.doMock('firebase/auth', () => ({
      initializeAuth,
      getAuth,
      getReactNativePersistence,
    }));
    jest.doMock('firebase/storage', () => ({
      getStorage: jest.fn(() => 'mock-storage'),
    }));
    jest.doMock('firebase/firestore', () => ({
      getFirestore: jest.fn(() => 'mock-db'),
    }));
    jest.doMock('@react-native-async-storage/async-storage', () => 'mock-async-storage');

    let firebaseModule;
    jest.isolateModules(() => {
      jest.unmock('../firebase');
      firebaseModule = require('../firebase');
    });

    expect(initializeAuth).toHaveBeenCalled();
    expect(getAuth).toHaveBeenCalledWith('mock-app');
    expect(firebaseModule.auth).toBe('fallback-auth');
  });
});
