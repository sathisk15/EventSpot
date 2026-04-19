import * as FileSystem from 'expo-file-system/legacy';
import { updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';

export const uploadProfileImage = async (uid, uri) => {
  const bucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const path = `profiles/${uid}.jpg`;
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(path)}`;

  const idToken = await auth.currentUser.getIdToken();

  const uploadResult = await FileSystem.uploadAsync(url, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'image/jpeg',
    },
  });

  if (uploadResult.status !== 200) {
    throw new Error(`Upload failed with status: ${uploadResult.status} - ${uploadResult.body}`);
  }

  const responseData = JSON.parse(uploadResult.body);
  const downloadToken = responseData.downloadTokens;

  const photoURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`;

  await updateProfile(auth.currentUser, { photoURL });

  return photoURL;
};
