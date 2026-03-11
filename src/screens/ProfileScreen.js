import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, useTheme, Appbar, HelperText, Avatar } from 'react-native-paper';
import { updateProfile, updatePassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { auth, storage } from '../config/firebase';
import { AuthContext } from '../contexts/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const theme = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const getInitials = () => {
    if (user?.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      setErrorMsg("Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    setUploadingImage(true);
    setMessage('');
    setErrorMsg('');
    try {
      // 1. Convert URI to Blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // 2. Upload to Firebase Storage
      const fileRef = ref(storage, `profiles/${user.uid}.jpg`);
      await uploadBytes(fileRef, blob);
      
      // 3. Get Download URL
      const photoURL = await getDownloadURL(fileRef);
      
      // 4. Update Auth Profile
      await updateProfile(auth.currentUser, { photoURL });
      
      setMessage('Profile picture updated successfully!');
    } catch (error) {
      setErrorMsg('Error uploading image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

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
          <TouchableOpacity onPress={pickImage} disabled={uploadingImage} style={styles.avatarWrapper}>
            {user?.photoURL ? (
              <Avatar.Image size={80} source={{ uri: user.photoURL }} style={{ backgroundColor: theme.colors.surfaceVariant }} />
            ) : (
              <Avatar.Text size={80} label={getInitials()} style={{ backgroundColor: theme.colors.primary }} color={theme.colors.onPrimary} />
            )}
            <View style={styles.editBadge}>
              <Text style={{color: 'white', fontSize: 10, fontWeight: 'bold'}}>{uploadingImage ? '...' : 'EDIT'}</Text>
            </View>
          </TouchableOpacity>
          <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold', marginTop: 12 }}>
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
  avatarWrapper: {
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00000099',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'white',
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
