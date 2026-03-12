import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { AuthContext } from '../../contexts/AuthContext';
import * as Google from 'expo-auth-session/providers/google';

const mockLogin = jest.fn();
const mockLoginWithGoogle = jest.fn();

const providers = ({ children }) => (
  <AuthContext.Provider value={{ login: mockLogin, loginWithGoogle: mockLoginWithGoogle }}>
    {children}
  </AuthContext.Provider>
);

const mockNavigation = {
  navigate: jest.fn(),
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByLabelText } = render(<LoginScreen navigation={mockNavigation} />, { wrapper: providers });
    
    expect(getByText('EventSpot')).toBeTruthy();
    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  it('shows validation errors for empty fields', async () => {
    const { getByText, queryByText } = render(<LoginScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.press(getByText('Login'));
    
    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
      expect(getByText('Password must be at least 6 characters')).toBeTruthy();
    });
  });

  it('calls login with email and password when form is valid', async () => {
    const { getByText, getByLabelText } = render(<LoginScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.press(getByText('Login'));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue({ code: 'auth/invalid-credential' });
    
    const { getByText, getByLabelText } = render(<LoginScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'wrongpassword');
    fireEvent.press(getByText('Login'));
    
    await waitFor(() => {
      expect(getByText('Invalid email or password.')).toBeTruthy();
    });
  });

  it('navigates to Register screen when Register link is pressed', () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.press(getByText("Don't have an account? Register"));
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
  });

  it('calls loginWithGoogle when Google sign in is successful', async () => {
    const mockPromptAsync = jest.fn();
    Google.useIdTokenAuthRequest.mockReturnValue([{}, { type: 'success', params: { id_token: 'mock-token' } }, mockPromptAsync]);

    render(<LoginScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalledWith('mock-token');
    });
  });

  it('handles Google login button press', () => {
    const mockPromptAsync = jest.fn();
    Google.useIdTokenAuthRequest.mockReturnValue([{ some: 'request' }, null, mockPromptAsync]);

    const { getByText } = render(<LoginScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.press(getByText('Sign in with Google'));
    expect(mockPromptAsync).toHaveBeenCalled();
  });

  it('handles various firebase error codes', async () => {
    const { getByText, getByLabelText } = render(<LoginScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password');

    const errorCodes = [
      { code: 'auth/user-not-found', expected: 'No user found with this email.' },
      { code: 'auth/wrong-password', expected: 'Incorrect password.' },
      { code: 'auth/too-many-requests', expected: 'Too many failed login attempts. Please try again later.' },
      { code: 'unknown', expected: 'An error occurred during login.' }
    ];

    for (const error of errorCodes) {
      mockLogin.mockRejectedValueOnce({ code: error.code });
      fireEvent.press(getByText('Login'));
      await waitFor(() => expect(getByText(error.expected)).toBeTruthy());
    }
  });
});
