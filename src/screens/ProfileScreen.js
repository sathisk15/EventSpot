import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Appbar, HelperText } from 'react-native-paper';
import { updateProfile, updatePassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthContext } from '../contexts/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const theme = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdateName = async () => {
    if (!displayName.trim()) {
      setErrorMsg('Display name cannot be empty.');
      return;
    }

    setLoadingName(true);
    setMessage('');
    setErrorMsg('');
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim()
      });
      setMessage('Display name updated successfully!');
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoadingName(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoadingPassword(true);
    setMessage('');
    setErrorMsg('');
    try {
      await updatePassword(auth.currentUser, newPassword);
      setMessage('Password updated successfully!');
      setNewPassword('');
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
         setErrorMsg('This operation is sensitive and requires recent authentication. Please log out and log back in before trying again.');
      } else {
         setErrorMsg(error.message);
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Logout Error', error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Profile & Settings" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerSection}>
          <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {user?.displayName || 'EventSpot User'}
          </Text>
          <Text variant="bodyLarge" style={{ color: 'gray' }}>
            {user?.email}
          </Text>
        </View>

        <HelperText type="info" visible={!!message} style={styles.successText}>
          {message}
        </HelperText>
        <HelperText type="error" visible={!!errorMsg} style={styles.errorText}>
          {errorMsg}
        </HelperText>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Profile Details</Text>
          <TextInput
            mode="outlined"
            label="Display Name"
            value={displayName}
            onChangeText={(text) => { setDisplayName(text); setMessage(''); setErrorMsg(''); }}
            style={styles.input}
          />
          <Button 
            mode="contained" 
            onPress={handleUpdateName} 
            loading={loadingName}
            disabled={loadingName}
            style={styles.button}
          >
            Update Name
          </Button>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Change Password</Text>
          <TextInput
            mode="outlined"
            label="New Password"
            value={newPassword}
            onChangeText={(text) => { setNewPassword(text); setMessage(''); setErrorMsg(''); }}
            secureTextEntry
            style={styles.input}
          />
          <Button 
            mode="outlined" 
            onPress={handleUpdatePassword} 
            loading={loadingPassword}
            disabled={loadingPassword || !newPassword}
            style={styles.button}
          >
            Update Password
          </Button>
        </View>

        <View style={styles.logoutSection}>
          <Button 
            mode="contained-tonal" 
            icon="logout"
            buttonColor={theme.colors.errorContainer}
            textColor={theme.colors.onErrorContainer}
            onPress={handleLogout} 
            style={styles.logoutButton}
          >
            Log Out
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginVertical: 4,
  },
  logoutSection: {
    marginTop: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  logoutButton: {
    paddingVertical: 6,
  },
  successText: {
    color: 'green',
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 14,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 14,
  }
});

export default ProfileScreen;
