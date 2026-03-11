import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../config/firebase';

export const saveEvent = async (eventData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const imageUrls = [];
    
    // 1. Upload images to Firebase Storage
    for (const imageUri of eventData.images) {
      try {
        console.log("Processing image:", imageUri);
        
        // Use XMLHttpRequest which is more stable for local files on Android than fetch()
        const blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() {
            resolve(xhr.response);
          };
          xhr.onerror = function(e) {
            console.log("XHR Error:", e);
            reject(new TypeError("Network request failed"));
          };
          xhr.responseType = "blob";
          xhr.open("GET", imageUri, true);
          xhr.send(null);
        });
        
        const filename = `events/${user.uid}/${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const storageRef = ref(storage, filename);
        
        console.log("Uploading to Firebase Storage:", filename);
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
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
    const eventsQuery = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(eventsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};
