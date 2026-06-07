import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText, Surface } from 'react-native-paper';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from '../contexts/AuthContext';
import { spacing, radius } from '../config/theme';

WebBrowser.maybeCompleteAuthSession();

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [firebaseError, setFirebaseError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useContext(AuthContext);
  const theme = useTheme();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const getFriendlyErrorMessage = (error) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address.';
      case 'auth/invalid-email':
        return 'The email address is invalid.';
      case 'auth/weak-password':
        return 'The password is too weak. Please use a stronger password.';
      default:
        return error.message || 'An error occurred during registration.';
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
  };

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

  const handleRegister = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      await register(email, password);
    } catch (error) {
      setFirebaseError(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
          Join EventSpot
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          Create an account to get started
        </Text>
      </View>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
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
          onPress={handleRegister}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          loading={loading}
          disabled={loading}
        >
          Create Account
        </Button>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.outlineVariant }]} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginHorizontal: spacing.sm }}>
            or
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.outlineVariant }]} />
        </View>

        <Button
          mode="outlined"
          icon="google"
          style={styles.googleButton}
          contentStyle={styles.buttonContent}
          onPress={() => promptAsync()}
          disabled={!request || loading}
        >
          Continue with Google
        </Button>
      </Surface>

      <Button
        mode="text"
        onPress={() => navigation.navigate('Login')}
        style={styles.switchButton}
      >
        Already have an account? Login
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.xs,
  },
  firebaseError: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  primaryButton: {
    marginTop: spacing.sm,
    borderRadius: radius.sm,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  googleButton: {
    borderRadius: radius.sm,
  },
  switchButton: {
    alignSelf: 'center',
  },
});

export default RegisterScreen;
