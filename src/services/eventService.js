import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
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

export const saveEvent = async (eventData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const imageUrls = [];
    
    // 1. Upload images to Firebase Storage
    for (const imageUri of eventData.images) {
      try {
        console.log("Processing image:", imageUri);
        const downloadUrl = await uploadEventImage(imageUri, user);
        imageUrls.push(downloadUrl);
      } catch (uploadError) {
        console.error("Individual upload failed:", uploadError);
        throw uploadError;
      }
    }

    // 2. Save event metadata to Firestore
    const eventDoc = {
      name: eventData.name,
      description: eventData.description,
      date: eventData.date,
      location: eventData.location, // { latitude, longitude, address }
      images: imageUrls,
      createdBy: user.uid,
      creatorEmail: user.email,
      createdAt: serverTimestamp(),
      attendees: [],
    };

    const docRef = await addDoc(collection(db, 'events'), eventDoc);
    return { id: docRef.id, ...eventDoc };
  } catch (error) {
    console.error("Error saving event:", error);
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
