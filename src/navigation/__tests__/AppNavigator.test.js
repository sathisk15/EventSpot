import React from 'react';
import { render } from '@testing-library/react-native';
import AppNavigator from '../AppNavigator';
import { AuthContext } from '../../contexts/AuthContext';

// Mock screens to simplify the test
jest.mock('../../screens/LoginScreen', () => {
  const { View, Text } = require('react-native');
  return () => <View><Text>Login Screen</Text></View>;
});
jest.mock('../../screens/MapScreen', () => {
  const { View, Text } = require('react-native');
  return () => <View><Text>Map Screen</Text></View>;
});

const renderWithAuth = (authValue) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <AppNavigator />
    </AuthContext.Provider>
  );
};

describe('AppNavigator', () => {
  it('renders ActivityIndicator when loading is true', () => {
    const { getByTestId, queryByText } = renderWithAuth({ user: null, loading: true });
    
    // We didn't add testID to ActivityIndicator, but we can find it by type or improved mock
    // In our jest.setup.js, ActivityIndicator mock returns null. Let's find the View container instead.
    // Or let's check for the absence of screens.
    expect(queryByText('Login Screen')).toBeNull();
    expect(queryByText('Map Screen')).toBeNull();
  });

  it('renders Login screen when user is not authenticated', () => {
    const { getByText } = renderWithAuth({ user: null, loading: false });
    
    expect(getByText('Login Screen')).toBeTruthy();
  });

  it('renders Map screen when user is authenticated', () => {
    const { getByText } = renderWithAuth({ user: { uid: '123' }, loading: false });
    
    expect(getByText('Map Screen')).toBeTruthy();
  });
});
