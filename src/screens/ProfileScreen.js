import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
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
  Switch,
} from 'react-native-paper';
import { updateProfile, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../config/firebase';
import { AuthContext } from '../contexts/AuthContext';
import { saveRealtimeEventsPreference } from '../services/userPreferencesService';
import { uploadProfileImage } from '../services/profileService';
import { spacing, radius, theme as appTheme } from '../config/theme';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileImageModal from '../components/profile/ProfileImageModal';

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
  const [savingPreference, setSavingPreference] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [realtimeEventsEnabled, setRealtimeEventsEnabled] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setBio(data.bio || '');
            setSocialLink(data.socialLink || '');
            setRealtimeEventsEnabled(Boolean(data.realtimeEventsEnabled));
          } else {
            setRealtimeEventsEnabled(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
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

  const chooseProfileImage = async source => {
    const isCamera = source === 'camera';
    const permissionResult = isCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      setErrorMsg(
        isCamera
          ? 'Permission to access camera is required!'
          : 'Permission to access camera roll is required!',
      );
      return;
    }

    const picker = isCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await picker({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      handleUploadImage(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    Alert.alert('Profile Picture', 'Choose image source', [
      { text: 'Camera', onPress: () => chooseProfileImage('camera') },
      { text: 'Photos', onPress: () => chooseProfileImage('photos') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleToggleRealtime = async () => {
    const nextValue = !realtimeEventsEnabled;
    setRealtimeEventsEnabled(nextValue);
    setSavingPreference(true);
    setMessage('');
    setErrorMsg('');

    try {
      await saveRealtimeEventsPreference(user.uid, nextValue);
      setMessage('Settings updated successfully!');
    } catch (error) {
      setRealtimeEventsEnabled(!nextValue);
      setErrorMsg('Failed to update realtime event setting.');
    } finally {
      setSavingPreference(false);
    }
  };

  const handleUploadImage = async uri => {
    if (!uri) return;

    setUploadingImage(true);
    setErrorMsg('');
    setMessage('');

    try {
      await uploadProfileImage(user.uid, uri);
      setMessage('Profile picture updated successfully!');
      setModalVisible(false);
    } catch (error) {
      console.error('Native Upload error:', error);
      setErrorMsg('Image upload failed: ' + error.message);
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
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      await setDoc(
        doc(db, 'users', user.uid),
        { bio: bio.trim(), socialLink: socialLink.trim() },
        { merge: true },
      );
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
        setErrorMsg(
          'This operation is sensitive and requires recent authentication. Please log out and log back in before trying again.',
        );
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
          <ProfileHeader
            user={user}
            uploadingImage={uploadingImage}
            onPressAvatar={() => setModalVisible(true)}
            getInitials={getInitials}
          />

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
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
            ]}
          >
            <Text variant="titleMedium" style={styles.sectionTitle}>Profile Details</Text>
            <TextInput
              mode="outlined"
              label="Display Name"
              value={displayName}
              onChangeText={text => { setDisplayName(text); setMessage(''); setErrorMsg(''); }}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Short Bio"
              value={bio}
              onChangeText={text => { setBio(text); setMessage(''); setErrorMsg(''); }}
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="Tell people about yourself..."
            />
            <TextInput
              mode="outlined"
              label="Social Link"
              value={socialLink}
              onChangeText={text => { setSocialLink(text); setMessage(''); setErrorMsg(''); }}
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
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
            ]}
          >
            <Text variant="titleMedium" style={styles.sectionTitle}>Change Password</Text>
            <TextInput
              mode="outlined"
              label="New Password"
              value={newPassword}
              onChangeText={text => { setNewPassword(text); setMessage(''); setErrorMsg(''); }}
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
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
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
              styles.section,
              styles.sectionCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
            ]}
          >
            <Text variant="titleMedium" style={styles.sectionTitle}>App Settings</Text>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceCopy}>
                <Text variant="titleSmall">Realtime Events</Text>
                <Text variant="bodyMedium" style={styles.preferenceHint}>
                  Turn on live event updates. By default, the app uses manual refresh mode.
                </Text>
              </View>
              <Switch
                testID="realtime-toggle"
                value={realtimeEventsEnabled}
                disabled={savingPreference}
                onValueChange={handleToggleRealtime}
              />
            </View>
          </View>

          <View
            style={[
              styles.logoutSection,
              styles.sectionCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
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

      <ProfileImageModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        user={user}
        onPickImage={pickImage}
        uploadingImage={uploadingImage}
        getInitials={getInitials}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: 80,
    flexGrow: 1,
  },
  section: { marginBottom: spacing.md },
  sectionCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  input: { marginBottom: 12 },
  button: { marginVertical: spacing.xs },
  logoutSection: { marginTop: 6 },
  logoutButton: { paddingVertical: 6 },
  successText: {
    color: appTheme.colors.success,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  preferenceCopy: { flex: 1 },
  preferenceHint: {
    marginTop: spacing.xs,
    opacity: 0.68,
    lineHeight: 19,
  },
});

export default ProfileScreen;
