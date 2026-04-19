import {
  arrayRemove,
  arrayUnion,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import { db, auth } from '../config/firebase';

const uploadEventImage = async (imageUri) => {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const uploadResult = await FileSystem.uploadAsync(url, imageUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    parameters: {
      upload_preset: uploadPreset,
      folder: 'events',
    },
  });

  if (uploadResult.status !== 200) {
    throw new Error(`Cloudinary upload failed with status: ${uploadResult.status}`);
  }

  const responseData = JSON.parse(uploadResult.body);
  if (!responseData.secure_url) {
    throw new Error('Upload succeeded but no URL was returned');
  }

  return responseData.secure_url;
};

const getAuthenticatedUser = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
};

const assertEventOwnership = (eventOwnerId, user) => {
  if (eventOwnerId && eventOwnerId !== user.uid) {
    throw new Error('User not authorized to modify this event');
  }
};

const resolveEventImageUrls = async (images = [], user) => {
  const imageUrls = [];

  for (const imageUri of images) {
    if (typeof imageUri === 'string' && /^https?:\/\//.test(imageUri)) {
      imageUrls.push(imageUri);
      continue;
    }

    try {
      const downloadUrl = await uploadEventImage(imageUri);
      imageUrls.push(downloadUrl);
    } catch (uploadError) {
      console.error('Individual upload failed:', uploadError);
      throw uploadError;
    }
  }

  return imageUrls;
};

const buildEventPayload = async (eventData, user, { isUpdate = false } = {}) => {
  const startDate = eventData.startDate || eventData.date;
  const endDate = eventData.endDate || null;
  const durationMinutes =
    typeof eventData.durationMinutes === 'number' ? eventData.durationMinutes : null;
  const imageUrls = await resolveEventImageUrls(eventData.images, user);

  return {
    name: eventData.name,
    description: eventData.description,
    category: eventData.category || null,
    date: startDate,
    startDate,
    endDate,
    durationMinutes,
    location: eventData.location,
    images: imageUrls,
    createdBy: eventData.createdBy || user.uid,
    creatorEmail: eventData.creatorEmail || user.email,
    ...(isUpdate ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp(), attendees: [] }),
  };
};

const mapSnapshotToEvents = querySnapshot =>
  querySnapshot.docs.map(docSnapshot => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));

export const saveEvent = async eventData => {
  try {
    const user = getAuthenticatedUser();
    const eventDoc = await buildEventPayload(eventData, user);
    const docRef = await addDoc(collection(db, 'events'), eventDoc);
    return { id: docRef.id, ...eventDoc };
  } catch (error) {
    console.error('Error saving event:', error);
    throw error;
  }
};

export const updateEvent = async (eventId, eventData) => {
  try {
    const user = getAuthenticatedUser();
    assertEventOwnership(eventData.createdBy, user);

    const eventDoc = await buildEventPayload(eventData, user, { isUpdate: true });
    await updateDoc(doc(db, 'events', eventId), eventDoc);

    return { id: eventId, ...eventDoc };
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

export const setEventInterest = async (eventId, interested) => {
  try {
    const user = getAuthenticatedUser();

    await updateDoc(doc(db, 'events', eventId), {
      attendees: interested ? arrayUnion(user.uid) : arrayRemove(user.uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating event interest:', error);
    throw error;
  }
};

export const deleteEvent = async (eventId, eventOwnerId) => {
  try {
    const user = getAuthenticatedUser();
    assertEventOwnership(eventOwnerId, user);

    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

export const fetchEvents = async () => {
  try {
    const eventsQuery = collection(db, 'events');
    const querySnapshot = await getDocs(eventsQuery);
    return mapSnapshotToEvents(querySnapshot);
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

export const fetchUserEvents = async userId => {
  try {
    const eventsQuery = query(collection(db, 'events'), where('createdBy', '==', userId));
    const querySnapshot = await getDocs(eventsQuery);
    return mapSnapshotToEvents(querySnapshot);
  } catch (error) {
    console.error('Error fetching user events:', error);
    throw error;
  }
};

export const subscribeToEvents = (onEvents, onError) =>
  onSnapshot(
    collection(db, 'events'),
    querySnapshot => {
      onEvents(mapSnapshotToEvents(querySnapshot));
    },
    error => {
      console.error('Realtime events subscription error:', error);
      if (onError) {
        onError(error);
      }
    },
  );

export const subscribeToUserEvents = (userId, onEvents, onError) =>
  onSnapshot(
    query(collection(db, 'events'), where('createdBy', '==', userId)),
    querySnapshot => {
      onEvents(mapSnapshotToEvents(querySnapshot));
    },
    error => {
      console.error('Realtime user events subscription error:', error);
      if (onError) {
        onError(error);
      }
    },
  );
