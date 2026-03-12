import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../RegisterScreen';
import { AuthContext } from '../../contexts/AuthContext';
import * as Google from 'expo-auth-session/providers/google';

const mockRegister = jest.fn();
const mockLoginWithGoogle = jest.fn();

const providers = ({ children }) => (
  <AuthContext.Provider value={{ register: mockRegister, loginWithGoogle: mockLoginWithGoogle }}>
    {children}
  </AuthContext.Provider>
);

const mockNavigation = {
  navigate: jest.fn(),
};

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByLabelText } = render(<RegisterScreen navigation={mockNavigation} />, { wrapper: providers });
    
    expect(getByText('Join EventSpot')).toBeTruthy();
    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
    expect(getByText('Register')).toBeTruthy();
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  it('shows validation errors for empty fields', async () => {
    const { getByText, queryByText } = render(<RegisterScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.press(getByText('Register'));
    
    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
      expect(getByText('Password must be at least 6 characters')).toBeTruthy();
    });
  });

  it('calls register with email and password when form is valid', async () => {
    const { getByText, getByLabelText } = render(<RegisterScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.changeText(getByLabelText('Email'), 'newuser@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'securepassword');
    fireEvent.press(getByText('Register'));
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('newuser@example.com', 'securepassword');
    });
  });

  it('shows error message on registration failure', async () => {
    mockRegister.mockRejectedValue({ code: 'auth/email-already-in-use' });
    
    const { getByText, getByLabelText } = render(<RegisterScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.changeText(getByLabelText('Email'), 'existing@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password123');
    fireEvent.press(getByText('Register'));
    
    await waitFor(() => {
      expect(getByText('An account already exists with this email address.')).toBeTruthy();
    });
  });

  it('navigates to Login screen when Login link is pressed', () => {
    const { getByText } = render(<RegisterScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.press(getByText("Already have an account? Login"));
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
  });

  it('calls loginWithGoogle when Google sign in is successful', async () => {
    const mockPromptAsync = jest.fn();
    Google.useIdTokenAuthRequest.mockReturnValue([{}, { type: 'success', params: { id_token: 'mock-token' } }, mockPromptAsync]);

    render(<RegisterScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalledWith('mock-token');
    });
  });

  it('handles Google login button press', () => {
    const mockPromptAsync = jest.fn();
    Google.useIdTokenAuthRequest.mockReturnValue([{ some: 'request' }, null, mockPromptAsync]);

    const { getByText } = render(<RegisterScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.press(getByText('Sign in with Google'));
    expect(mockPromptAsync).toHaveBeenCalled();
  });

  it('handles various firebase error codes', async () => {
    const { getByText, getByLabelText } = render(<RegisterScreen navigation={mockNavigation} />, { wrapper: providers });
    
    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'password');

    const errorCodes = [
      { code: 'auth/email-already-in-use', expected: 'An account already exists with this email address.' },
      { code: 'auth/invalid-email', expected: 'The email address is invalid.' },
      { code: 'auth/weak-password', expected: 'The password is too weak. Please use a stronger password.' },
      { code: 'unknown', expected: 'An error occurred during registration.' }
    ];

    for (const error of errorCodes) {
      mockRegister.mockRejectedValueOnce({ code: error.code });
      fireEvent.press(getByText('Register'));
      await waitFor(() => expect(getByText(error.expected)).toBeTruthy());
    }
  });
});
