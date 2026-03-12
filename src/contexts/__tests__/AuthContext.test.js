import React, { useContext } from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { AuthContext, AuthProvider } from '../AuthContext';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { auth } from '../../config/firebase';

// Mock Firebase Auth
jest.mock('firebase/auth');

const TestComponent = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <Text>Loading...</Text>;
  return <Text>{user ? user.email : 'No User'}</Text>;
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides loading: true initially and eventually false', async () => {
    let capturedCallback;
    onAuthStateChanged.mockImplementation((auth, callback) => {
      capturedCallback = callback;
      return jest.fn(); // Unsubscribe
    });

    const { getByText, queryByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByText('Loading...')).toBeTruthy();

    await act(async () => {
      capturedCallback(null);
    });

    expect(queryByText('Loading...')).toBeNull();
    expect(getByText('No User')).toBeTruthy();
  });

  it('updates state when a user logs in', async () => {
    let capturedCallback;
    onAuthStateChanged.mockImplementation((auth, callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      capturedCallback({ email: 'test@example.com', uid: '123' });
    });

    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('calls Firebase signInWithEmailAndPassword on login', async () => {
    const { login } = await new Promise((resolve) => {
      const Grabber = () => {
        const value = useContext(AuthContext);
        resolve(value);
        return null;
      };
      render(
        <AuthProvider>
          <Grabber />
        </AuthProvider>
      );
    });

    await login('test@email.com', 'password');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@email.com', 'password');
  });

  it('calls Firebase createUserWithEmailAndPassword on register', async () => {
    const { register } = await new Promise((resolve) => {
      const Grabber = () => {
        const value = useContext(AuthContext);
        resolve(value);
        return null;
      };
      render(
        <AuthProvider>
          <Grabber />
        </AuthProvider>
      );
    });

    await register('new@email.com', 'password');
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'new@email.com', 'password');
  });

  it('calls Firebase signOut on logout', async () => {
    const { logout } = await new Promise((resolve) => {
      const Grabber = () => {
        const value = useContext(AuthContext);
        resolve(value);
        return null;
      };
      render(
        <AuthProvider>
          <Grabber />
        </AuthProvider>
      );
    });

    await logout();
    expect(signOut).toHaveBeenCalledWith(auth);
  });

  it('handles login error', async () => {
    const { login } = await new Promise((resolve) => {
      const Grabber = () => { resolve(useContext(AuthContext)); return null; };
      render(<AuthProvider><Grabber /></AuthProvider>);
    });

    signInWithEmailAndPassword.mockRejectedValue(new Error('Login failed'));
    await expect(login('test@email.com', 'password')).rejects.toThrow('Login failed');
  });

  it('handles register error', async () => {
    const { register } = await new Promise((resolve) => {
      const Grabber = () => { resolve(useContext(AuthContext)); return null; };
      render(<AuthProvider><Grabber /></AuthProvider>);
    });

    createUserWithEmailAndPassword.mockRejectedValue(new Error('Register failed'));
    await expect(register('test@email.com', 'password')).rejects.toThrow('Register failed');
  });

  it('handles logout error', async () => {
    const { logout } = await new Promise((resolve) => {
      const Grabber = () => { resolve(useContext(AuthContext)); return null; };
      render(<AuthProvider><Grabber /></AuthProvider>);
    });

    signOut.mockRejectedValue(new Error('Logout failed'));
    await expect(logout()).rejects.toThrow('Logout failed');
  });

  it('calls Google auth logic', async () => {
    const { loginWithGoogle } = await new Promise((resolve) => {
      const Grabber = () => { resolve(useContext(AuthContext)); return null; };
      render(<AuthProvider><Grabber /></AuthProvider>);
    });

    const { GoogleAuthProvider, signInWithCredential } = require('firebase/auth');
    GoogleAuthProvider.credential.mockReturnValue('mock-credential');
    
    await loginWithGoogle('mock-id-token');
    
    expect(GoogleAuthProvider.credential).toHaveBeenCalledWith('mock-id-token');
    expect(signInWithCredential).toHaveBeenCalledWith(auth, 'mock-credential');
  });

  it('handles Google login error', async () => {
    const { loginWithGoogle } = await new Promise((resolve) => {
      const Grabber = () => { resolve(useContext(AuthContext)); return null; };
      render(<AuthProvider><Grabber /></AuthProvider>);
    });

    const { signInWithCredential } = require('firebase/auth');
    signInWithCredential.mockRejectedValue(new Error('Google login failed'));
    
    await expect(loginWithGoogle('token')).rejects.toThrow('Google login failed');
  });
});
