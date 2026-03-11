import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from '../contexts/AuthContext';

// Ensure the web browser redirect handling completes correctly
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useContext(AuthContext);
  const theme = useTheme();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken) => {
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
    } catch (error) {
       Alert.alert('Google Login Error', error.message);
    } finally {
       setLoading(false);
    }
  }

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert('Login Error', error.message);
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
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      
      <TextInput
        mode="outlined"
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      
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
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 6,
  },
});

export default LoginScreen;

