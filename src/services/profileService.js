import * as FileSystem from 'expo-file-system/legacy';
import { updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';

export const uploadProfileImage = async (uid, uri) => {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const uploadResult = await FileSystem.uploadAsync(url, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    parameters: {
      upload_preset: uploadPreset,
      folder: 'profiles',
      public_id: uid,
    },
  });

  if (uploadResult.status !== 200) {
    throw new Error(`Upload failed with status: ${uploadResult.status}`);
  }

  const responseData = JSON.parse(uploadResult.body);
  if (!responseData.secure_url) {
    throw new Error('Upload succeeded but no URL was returned');
  }

  const photoURL = responseData.secure_url;
  await updateProfile(auth.currentUser, { photoURL });
  return photoURL;
};
