import React from 'react';

// Mock WebView
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    WebView: React.forwardRef((props, ref) => {
      const postMessage = jest.fn();
      global.__WEBVIEW_POST_MESSAGE_MOCK__ = postMessage;
      React.useImperativeHandle(ref, () => ({
        postMessage,
      }));
      return (
        <View 
          testID={props.testID || 'webview-mock'} 
          {...props} 
          onMessage={(e) => props.onMessage && props.onMessage({ nativeEvent: { data: e } })}
        />
      );
    })
  };
});

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return ({ value, onChange, testID, mode }) => (
    <TouchableOpacity 
      testID={testID || 'datetimepicker'} 
      onPress={() =>
        onChange(
          {},
          new Date(value.getTime() + (mode === 'time' ? 3600000 : 86400000))
        )
      }
    >
      <Text>DateTimePicker</Text>
    </TouchableOpacity>
  );
});

// Mock expo-auth-session/providers/google
jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: jest.fn(() => [null, null, jest.fn()]),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openBrowserAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: { BINARY_CONTENT: 'binary' },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  MediaTypeOptions: { Images: 'Images', All: 'All', Videos: 'Videos' },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } })),
  getLastKnownPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } })),
  reverseGeocodeAsync: jest.fn(() => Promise.resolve([{ city: 'Test City', country: 'Test Country' }])),
  hasServicesEnabledAsync: jest.fn(() => Promise.resolve(true)),
  Accuracy: { Balanced: 3 },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    right: 0,
    bottom: 24,
    left: 0,
  })),
  SafeAreaProvider: ({ children }) => <>{children}</>,
}));

// Mock Firebase
jest.mock('./src/config/firebase', () => {
  const mockAuth = {
    currentUser: { 
      uid: 'test-user-id', 
      email: 'test@example.com',
      displayName: 'Test User',
      getIdToken: jest.fn(() => Promise.resolve('mock-id-token')),
    },
    onAuthStateChanged: jest.fn(),
  };

  return {
    auth: mockAuth,
    db: {
      collection: jest.fn(),
      doc: jest.fn(),
    },
    storage: {
      ref: jest.fn(),
    },
  };
});

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
  signInWithCredential: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadString: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock React Native Paper
jest.mock('react-native-paper', () => {
  const { View, Text, TouchableOpacity, TextInput: RNTextInput } = require('react-native');
  const React = require('react');
  return {
    Portal: ({ children }) => <View>{children}</View>,
    PaperProvider: ({ children }) => <>{children}</>,
    Modal: ({ children, visible, onDismiss }) => visible ? (
      <View>
        <TouchableOpacity testID="modal-backdrop" onPress={onDismiss} />
        {children}
      </View>
    ) : null,
    Button: ({ children, onPress, disabled, loading, icon }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading}>
        <View>
          {icon ? <Text>{`icon-${icon}`}</Text> : null}
          <Text>{children}</Text>
        </View>
      </TouchableOpacity>
    ),
    HelperText: ({ children, visible, type }) => visible ? <Text style={{ color: type === 'error' ? 'red' : 'black' }}>{children}</Text> : null,
    TextInput: ({ label, ...props }) => (
      <View>
        <Text>{label}</Text>
        <RNTextInput accessibilityLabel={label} {...props} />
      </View>
    ),
    MD3LightTheme: {
      colors: {
        primary: 'blue',
        secondary: 'green',
        tertiary: 'red',
        background: 'white',
        surface: 'white',
        error: 'red',
      },
    },
    Searchbar: (props) => <RNTextInput accessibilityLabel={props.placeholder} {...props} />,
    List: {
      Item: ({ title, onPress }) => (
        <TouchableOpacity onPress={onPress}>
          <Text>{title}</Text>
        </TouchableOpacity>
      ),
      Icon: (props) => <View {...props} />,
      Section: ({ children }) => <View>{children}</View>,
    },
    Card: ({ children }) => <View>{children}</View>,
    IconButton: ({ icon, onPress }) => <TouchableOpacity onPress={onPress}><Text>{icon}</Text></TouchableOpacity>,
    ActivityIndicator: () => null,
    useTheme: () => ({ colors: { primary: 'blue', surface: 'white', background: 'white', onPrimary: 'white' } }),
    Appbar: {
      Header: ({ children }) => <View>{children}</View>,
      Content: ({ title }) => <Text>{title}</Text>,
      Action: ({ icon, onPress }) => <TouchableOpacity testID={`action-${icon}`} onPress={onPress}><Text>{icon}</Text></TouchableOpacity>,
      BackAction: ({ onPress }) => <TouchableOpacity onPress={onPress}><Text>back</Text></TouchableOpacity>,
    },
    FAB: Object.assign(
      (props) => (
        <TouchableOpacity onPress={props.onPress}>
          <Text>{props.label || props.icon}</Text>
        </TouchableOpacity>
      ),
      {
        Group: ({ actions, open, onStateChange, icon }) => (
          <View>
            <TouchableOpacity testID="fab-toggle" onPress={() => onStateChange({ open: !open })}>
              <Text>{icon}</Text>
            </TouchableOpacity>
            {open && actions.map((action, i) => (
              <TouchableOpacity key={i} onPress={action.onPress}>
                <Text>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ),
      }
    ),
    Chip: ({ children, onPress, testID }) => (
      <TouchableOpacity onPress={onPress} testID={testID}>
        <View><Text>{children}</Text></View>
      </TouchableOpacity>
    ),
    Switch: ({ value, onValueChange, testID, disabled }) => (
      <TouchableOpacity
        testID={testID}
        onPress={() => onValueChange?.(!value)}
        disabled={disabled}
      >
        <Text>{value ? 'switch-on' : 'switch-off'}</Text>
      </TouchableOpacity>
    ),
    Text: ({ children, style }) => <Text style={style}>{children}</Text>,
    Avatar: {
      Text: ({ label }) => <View><Text>{label}</Text></View>,
      Image: (props) => <View {...props} />,
    },
    Divider: () => <View />,
  };
});

// Mock Alert - robust way in setupFilesAfterEnv
const { Alert } = require('react-native');
Alert.alert = jest.fn();

// Mock Expo constants to avoid manual firebase key issues
jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => <>{children}</>,
  useIsFocused: jest.fn(() => true),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: ({ children }) => <>{children}</>,
    Screen: ({ component: Component }) => Component ? <Component /> : null,
  })),
}));
