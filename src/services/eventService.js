import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import { db, auth } from '../config/firebase';

const uploadEventImage = async (imageUri, user) => {
  const bucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const filename = `events/${user.uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(filename)}`;
  const idToken = await user.getIdToken();

  const uploadResult = await FileSystem.uploadAsync(url, imageUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'image/jpeg',
    },
  });

  if (uploadResult.status !== 200) {
    throw new Error(`Upload failed with status: ${uploadResult.status}`);
  }

  const responseData = JSON.parse(uploadResult.body);
  if (!responseData.downloadTokens) {
    throw new Error('Upload succeeded but no download token was returned');
  }

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
    filename
  )}?alt=media&token=${responseData.downloadTokens}`;
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
      console.log('Processing image:', imageUri);
      const downloadUrl = await uploadEventImage(imageUri, user);
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
    console.log("Fetching events from Firestore...");
    const eventsQuery = collection(db, 'events'); // Simplified query
    const querySnapshot = await getDocs(eventsQuery);
    const events = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`Fetched ${events.length} events:`, events);
    return events;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

export const fetchUserEvents = async userId => {
  try {
    const eventsQuery = query(collection(db, 'events'), where('createdBy', '==', userId));
    const querySnapshot = await getDocs(eventsQuery);
    return querySnapshot.docs.map(docSnapshot => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    }));
  } catch (error) {
    console.error('Error fetching user events:', error);
    throw error;
  }
};
