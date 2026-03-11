import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from '../contexts/AuthContext';

// Ensure the web browser redirect handling completes correctly
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [firebaseError, setFirebaseError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useContext(AuthContext);
  const theme = useTheme();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // Temp fallback to prevent crash if not explicitly set
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const getFriendlyErrorMessage = (error) => {
    switch (error.code) {
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/user-not-found':
        return 'No user found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later.';
      default:
        return error.message || 'An error occurred during login.';
    }
  };

  const handleGoogleLogin = async (idToken) => {
    setLoading(true);
    setFirebaseError('');
    try {
      await loginWithGoogle(idToken);
    } catch (error) {
       setFirebaseError(getFriendlyErrorMessage(error));
    } finally {
       setLoading(false);
    }
  }

  const validateForm = () => {
    let isValid = true;
    setFirebaseError('');
    if (!email.includes('@') || !email.includes('.')) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }
    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      setFirebaseError(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>EventSpot</Text>
      
      <TextInput
        mode="outlined"
        label="Email"
        value={email}
        onChangeText={(text) => { setEmail(text); setEmailError(''); setFirebaseError(''); }}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        error={!!emailError}
      />
      <HelperText type="error" visible={!!emailError}>
        {emailError}
      </HelperText>
      
      <TextInput
        mode="outlined"
        label="Password"
        value={password}
        onChangeText={(text) => { setPassword(text); setPasswordError(''); setFirebaseError(''); }}
        secureTextEntry
        style={styles.input}
        error={!!passwordError}
      />
      <HelperText type="error" visible={!!passwordError}>
        {passwordError}
      </HelperText>
      
      <HelperText type="error" visible={!!firebaseError} style={styles.firebaseError}>
        {firebaseError}
      </HelperText>

      <Button 
        mode="contained" 
        onPress={handleLogin} 
        style={styles.button}
        loading={loading}
        disabled={loading}
      >
        Login
      </Button>

      <Button
        mode="outlined"
        icon="google"
        style={styles.button}
        onPress={() => promptAsync()}
        disabled={!request || loading}
      >
        Sign in with Google
      </Button>
      
      <Button 
        mode="text" 
        onPress={() => navigation.navigate('Register')}
      >
        Don't have an account? Register
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    marginBottom: 2, // Reduced margin since HelperText takes up space
  },
  firebaseError: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 6,
  },
});

export default LoginScreen;

