import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { updateProfile, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import ProfileScreen from '../ProfileScreen';
import { AuthContext } from '../../contexts/AuthContext';

jest.mock('firebase/auth');
jest.mock('firebase/firestore');

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
};

const mockLogout = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const renderWithUser = (user = mockUser) =>
  render(
    <AuthContext.Provider value={{ user, logout: mockLogout }}>
      <ProfileScreen navigation={mockNavigation} />
    </AuthContext.Provider>
  );

const waitForInitialProfileLoad = async (screen) => {
  await screen.findByText('Profile & Settings');
  await waitFor(() => expect(getDoc).toHaveBeenCalled());
};

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    doc.mockReturnValue('mock-user-doc');
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ bio: 'Old Bio', socialLink: 'Old Link' }),
    });
    setDoc.mockResolvedValue({});
    updateProfile.mockResolvedValue({});
    updatePassword.mockResolvedValue({});
  });

  it('renders user data loaded from auth and Firestore', async () => {
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    expect(screen.getByText('Test User')).toBeTruthy();
    expect(screen.getByText('test@example.com')).toBeTruthy();
    expect(screen.getByDisplayValue('Test User')).toBeTruthy();
    expect(screen.getByDisplayValue('Old Bio')).toBeTruthy();
    expect(screen.getByDisplayValue('Old Link')).toBeTruthy();
  });

  it('skips Firestore hydration when the user document does not exist', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => ({}),
    });

    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    expect(screen.queryByDisplayValue('Old Bio')).toBeNull();
    expect(screen.queryByDisplayValue('Old Link')).toBeNull();
  });

  it('does not fetch Firestore data when there is no user uid', async () => {
    const screen = renderWithUser({ email: 'guest@example.com' });

    await screen.findByText('Profile & Settings');

    expect(getDoc).not.toHaveBeenCalled();
    expect(screen.getByText('guest@example.com')).toBeTruthy();
  });

  it('updates profile details successfully', async () => {
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.changeText(screen.getByLabelText('Display Name'), 'New Name');
    fireEvent.changeText(screen.getByLabelText('Short Bio'), 'New Bio');
    fireEvent.changeText(screen.getByLabelText('Social Link'), 'https://twitter.com/test');
    fireEvent.press(screen.getByText('Update Profile'));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledWith(
        'mock-user-doc',
        expect.objectContaining({
          bio: 'New Bio',
          socialLink: 'https://twitter.com/test',
        }),
        { merge: true }
      );
    });

    expect(screen.getByText('Profile updated successfully!')).toBeTruthy();
  });

  it('shows an error when display name is empty', async () => {
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.changeText(screen.getByLabelText('Display Name'), '');
    fireEvent.press(screen.getByText('Update Profile'));

    expect(screen.getByText('Display name cannot be empty.')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('shows profile update failures', async () => {
    updateProfile.mockRejectedValueOnce(new Error('Update failed'));
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.changeText(screen.getByLabelText('Display Name'), 'New');
    fireEvent.press(screen.getByText('Update Profile'));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeTruthy();
    });
  });

  it('updates password successfully', async () => {
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.changeText(screen.getByLabelText('New Password'), 'newpassword123');
    fireEvent.press(screen.getByText('Update Password'));

    await waitFor(() => {
      expect(updatePassword).toHaveBeenCalled();
      expect(screen.getByText('Password updated successfully!')).toBeTruthy();
      expect(screen.getByLabelText('New Password').props.value).toBe('');
    });
  });

  it('shows an error when the new password is too short', async () => {
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.changeText(screen.getByLabelText('New Password'), '1234');
    fireEvent.press(screen.getByText('Update Password'));

    expect(screen.getByText('Password must be at least 6 characters.')).toBeTruthy();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('shows the recent-login password error', async () => {
    updatePassword.mockRejectedValueOnce({ code: 'auth/requires-recent-login' });
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.changeText(screen.getByLabelText('New Password'), 'newpassword123');
    fireEvent.press(screen.getByText('Update Password'));

    await waitFor(() => {
      expect(
        screen.getByText(
          'This operation is sensitive and requires recent authentication. Please log out and log back in before trying again.'
        )
      ).toBeTruthy();
    });
  });

  it('shows generic password update failures', async () => {
    updatePassword.mockRejectedValueOnce(new Error('Wrong password'));
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.changeText(screen.getByLabelText('New Password'), 'newpassword123');
    fireEvent.press(screen.getByText('Update Password'));

    await waitFor(() => {
      expect(screen.getByText('Wrong password')).toBeTruthy();
    });
  });

  it('logs out successfully', async () => {
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.press(screen.getByText('Log Out'));

    expect(mockLogout).toHaveBeenCalled();
  });

  it('shows a logout alert when logout fails', async () => {
    mockLogout.mockRejectedValueOnce(new Error('Logout failed'));
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.press(screen.getByText('Log Out'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Logout Error', 'Logout failed');
    });
  });

  it('navigates back from the header', async () => {
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.press(screen.getByText('back'));

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('uploads a profile image successfully', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://new-photo.jpg' }],
    });
    FileSystem.uploadAsync.mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ downloadTokens: 'mock-token' }),
    });

    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.press(screen.getByText('EDIT'));
    await screen.findByText('Profile Picture');
    fireEvent.press(screen.getByText('Upload New Image'));

    await waitFor(() => {
      expect(FileSystem.uploadAsync).toHaveBeenCalled();
      expect(screen.getByText('Profile picture updated successfully!')).toBeTruthy();
      expect(screen.queryByText('Profile Picture')).toBeNull();
    });
  });

  it('does not upload when image picker permission is denied', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.press(screen.getByText('EDIT'));
    fireEvent.press(screen.getByText('Upload New Image'));

    await waitFor(() => {
      expect(screen.getByText('Permission to access camera roll is required!')).toBeTruthy();
      expect(FileSystem.uploadAsync).not.toHaveBeenCalled();
    });
  });

  it('does not upload when the picker is cancelled', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.press(screen.getByText('EDIT'));
    fireEvent.press(screen.getByText('Upload New Image'));

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    expect(FileSystem.uploadAsync).not.toHaveBeenCalled();
  });

  it('shows upload failures from the network layer', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://fail.jpg' }],
    });
    FileSystem.uploadAsync.mockRejectedValueOnce(new Error('Network error'));

    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.press(screen.getByText('EDIT'));
    fireEvent.press(screen.getByText('Upload New Image'));

    await waitFor(() => {
      expect(screen.getByText('Image upload failed: Network error')).toBeTruthy();
    });
  });

  it('shows upload failures for non-200 responses', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://bad.jpg' }],
    });
    FileSystem.uploadAsync.mockResolvedValueOnce({
      status: 500,
      body: 'Server error',
    });

    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.press(screen.getByText('EDIT'));
    fireEvent.press(screen.getByText('Upload New Image'));

    await waitFor(() => {
      expect(screen.getByText(/Image upload failed: Upload failed with status: 500/)).toBeTruthy();
    });
  });

  it('closes the profile image modal from the backdrop and close icon', async () => {
    const screen = renderWithUser();

    await waitForInitialProfileLoad(screen);

    fireEvent.press(screen.getByText('EDIT'));
    await screen.findByText('Profile Picture');

    fireEvent.press(screen.getByTestId('modal-backdrop'));
    await waitFor(() => expect(screen.queryByText('Profile Picture')).toBeNull());

    fireEvent.press(screen.getByText('EDIT'));
    await screen.findByText('Profile Picture');

    fireEvent.press(screen.getByText('close'));
    await waitFor(() => expect(screen.queryByText('Profile Picture')).toBeNull());
  });

  it('falls back to email or U when the display name is missing', async () => {
    const emailOnlyScreen = renderWithUser({ email: 'email@test.com' });
    await emailOnlyScreen.findByText('Profile & Settings');
    expect(emailOnlyScreen.getByText('E')).toBeTruthy();

    const anonymousScreen = renderWithUser({});
    await anonymousScreen.findByText('Profile & Settings');
    expect(anonymousScreen.getByText('U')).toBeTruthy();
  });

  it('logs Firestore hydration failures', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    getDoc.mockRejectedValueOnce(new Error('Firestore error'));

    const screen = renderWithUser();

    await screen.findByText('Profile & Settings');
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching user data:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
