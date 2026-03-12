import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Appbar,
  HelperText,
  Avatar,
  Portal,
  Modal,
  IconButton,
} from 'react-native-paper';
import { updateProfile, updatePassword } from 'firebase/auth';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { auth, storage, db } from '../config/firebase';
import { AuthContext } from '../contexts/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const theme = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [bio, setBio] = useState('');
  const [socialLink, setSocialLink] = useState('');

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setBio(data.bio || '');
            setSocialLink(data.socialLink || '');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };
    fetchUserData();
  }, [user]);

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

    if (!result.canceled && result.assets[0].uri) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    if (!uri) return;

    setUploadingImage(true);
    setErrorMsg("");
    setMessage("");

    try {
      const bucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
      const path = `profiles/${user.uid}.jpg`;
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(path)}`;

      const idToken = await auth.currentUser.getIdToken();

      const uploadResult = await FileSystem.uploadAsync(url, uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'image/jpeg'
        }
      });

      if (uploadResult.status !== 200) {
        throw new Error(`Upload failed with status: ${uploadResult.status} - ${uploadResult.body}`);
      }

      const responseData = JSON.parse(uploadResult.body);
      const downloadToken = responseData.downloadTokens;
      
      const photoURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`;

      await updateProfile(auth.currentUser, {
        photoURL,
      });

      setMessage("Profile picture updated successfully!");
      setModalVisible(false);
    } catch (error) {
       console.log("Native Upload error:", error);
       setErrorMsg("Image upload failed: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      setErrorMsg('Display name cannot be empty.');
      return;
    }

    setLoadingProfile(true);
    setMessage('');
    setErrorMsg('');
    try {
      // 1. Update Auth Display Name
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim()
      });

      // 2. Update Firestore Bio & Social Links
      await setDoc(doc(db, 'users', user.uid), {
        bio: bio.trim(),
        socialLink: socialLink.trim()
      }, { merge: true });

      setMessage('Profile updated successfully!');
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoadingProfile(false);
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
        <Appbar.Action icon="home" onPress={() => navigation.navigate('Map')} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          testID="profile-scroll"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.headerSection,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <TouchableOpacity onPress={() => setModalVisible(true)} disabled={uploadingImage} style={styles.avatarWrapper}>
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
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {user?.email}
            </Text>
          </View>
          <HelperText type="info" visible={!!message} style={styles.successText}>
            {message}
          </HelperText>
          <HelperText type="error" visible={!!errorMsg} style={styles.errorText}>
            {errorMsg}
          </HelperText>

          <View
            style={[
              styles.section,
              styles.sectionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <Text variant="titleMedium" style={styles.sectionTitle}>Profile Details</Text>
            <TextInput
              mode="outlined"
              label="Display Name"
              value={displayName}
              onChangeText={(text) => { setDisplayName(text); setMessage(''); setErrorMsg(''); }}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Short Bio"
              value={bio}
              onChangeText={(text) => { setBio(text); setMessage(''); setErrorMsg(''); }}
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="Tell people about yourself..."
            />
            <TextInput
              mode="outlined"
              label="Social Link"
              value={socialLink}
              onChangeText={(text) => { setSocialLink(text); setMessage(''); setErrorMsg(''); }}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="Instagram, Twitter, etc."
            />
            <Button
              mode="contained"
              onPress={handleUpdateProfile}
              loading={loadingProfile}
              disabled={loadingProfile}
              style={styles.button}
            >
              Update Profile
            </Button>
          </View>

          <View
            style={[
              styles.section,
              styles.sectionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
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

          <View
            style={[
              styles.section,
              styles.sectionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <Text variant="titleMedium" style={styles.sectionTitle}>My Activity</Text>
            <Button
              mode="contained-tonal"
              icon="calendar-account"
              onPress={() => navigation.navigate('MyEvents')}
              style={styles.button}
            >
              My Events
            </Button>
          </View>

          <View
            style={[
              styles.logoutSection,
              styles.sectionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <Text variant="titleMedium" style={styles.sectionTitle}>Session</Text>
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
      </KeyboardAvoidingView>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
        >
          <View style={styles.modalHeader}>
            <Text variant="titleLarge">Profile Picture</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setModalVisible(false)}
            />
          </View>
          
          <View style={styles.modalImageContainer}>
             {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.fullSizeImage} resizeMode="contain" />
              ) : (
                <Avatar.Text size={200} label={getInitials()} style={{ backgroundColor: theme.colors.primary }} color={theme.colors.onPrimary} />
              )}
          </View>

          <Button 
            mode="contained" 
            icon="camera" 
            onPress={pickImage} 
            loading={uploadingImage}
            disabled={uploadingImage}
            style={styles.modalButton}
          >
            {uploadingImage ? 'Uploading...' : 'Upload New Image'}
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 144,
    flexGrow: 1,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 24,
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
    marginBottom: 18,
  },
  sectionCard: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
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
    marginTop: 6,
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
  },
  modalContent: {
    padding: 24,
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  fullSizeImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  modalButton: {
    marginTop: 8,
  }
});

export default ProfileScreen;
