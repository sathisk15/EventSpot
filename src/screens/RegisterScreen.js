import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from '../contexts/AuthContext';
import { spacing, radius } from '../config/theme';
import GradientButton from '../components/common/GradientButton';

WebBrowser.maybeCompleteAuthSession();

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [firebaseError, setFirebaseError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useContext(AuthContext);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleLogin(response.params.id_token);
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
      style={styles.root}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#1F8FFF', '#E84DBB', '#6A3FF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { height: SCREEN_HEIGHT * 0.32 }]}
      >
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.heroContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.heroTitle}>Join EventSpot</Text>
          <Text style={styles.heroSubtitle}>Create your account today</Text>
        </View>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create account</Text>
        <Text style={styles.cardSubtitle}>Fill in your details to get started</Text>

        <TextInput
          mode="outlined"
          label="Email address"
          value={email}
          onChangeText={(text) => { setEmail(text); setEmailError(''); setFirebaseError(''); }}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          error={!!emailError}
          outlineStyle={styles.inputOutline}
          left={<TextInput.Icon icon="email-outline" />}
        />
        <HelperText type="error" visible={!!emailError} style={styles.helperText}>
          {emailError}
        </HelperText>

        <TextInput
          mode="outlined"
          label="Password"
          value={password}
          onChangeText={(text) => { setPassword(text); setPasswordError(''); setFirebaseError(''); }}
          secureTextEntry={!passwordVisible}
          style={styles.input}
          error={!!passwordError}
          outlineStyle={styles.inputOutline}
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setPasswordVisible(v => !v)}
            />
          }
        />
        <HelperText type="error" visible={!!passwordError} style={styles.helperText}>
          {passwordError}
        </HelperText>

        {!!firebaseError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{firebaseError}</Text>
          </View>
        )}

        <GradientButton
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          style={styles.primaryButton}
        >
          Create Account
        </GradientButton>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          mode="outlined"
          icon="google"
          onPress={() => promptAsync()}
          disabled={!request || loading}
          style={styles.googleButton}
          contentStyle={styles.googleButtonContent}
          labelStyle={styles.googleButtonLabel}
        >
          Google
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          labelStyle={styles.footerLink}
          compact
        >
          Sign In
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#F8F9FF',
  },
  hero: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
  },
  circle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -50,
    left: -30,
    zIndex: 1,
  },
  circle2: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -20,
    right: 20,
    zIndex: 1,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xl,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    shadowColor: '#6A3FF5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1D29',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#667085',
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
  },
  inputOutline: {
    borderRadius: 12,
    borderColor: '#E4E7EC',
  },
  helperText: {
    marginTop: -2,
    marginBottom: 2,
  },
  errorBanner: {
    backgroundColor: '#FFF0EE',
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#EA4335',
  },
  errorBannerText: {
    color: '#EA4335',
    fontSize: 13,
  },
  primaryButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4E7EC',
  },
  dividerText: {
    color: '#98A2B3',
    fontSize: 13,
    marginHorizontal: spacing.sm,
  },
  googleButton: {
    borderRadius: 14,
    borderColor: '#E4E7EC',
    borderWidth: 1.5,
  },
  googleButtonContent: {
    paddingVertical: spacing.sm,
  },
  googleButtonLabel: {
    color: '#1A1D29',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: {
    color: '#667085',
    fontSize: 14,
  },
  footerLink: {
    color: '#6A3FF5',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RegisterScreen;
