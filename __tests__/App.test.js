import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Mock the Navigator since we test it separately
jest.mock('../src/navigation/AppNavigator', () => {
  const { View, Text } = require('react-native');
  return () => <View><Text>App Navigator Mock</Text></View>;
});

describe('App Smoke Test', () => {
  it('renders correctly without crashing', () => {
    const { getByText } = render(<App />);
    expect(getByText('App Navigator Mock')).toBeTruthy();
  });
});
