import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../config/firebase';

export const fetchRealtimeEventsPreference = async userId => {
  if (!userId) {
    return false;
  }

  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    return false;
  }

  return Boolean(userDoc.data()?.realtimeEventsEnabled);
};

export const saveRealtimeEventsPreference = async (userId, enabled) => {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  await setDoc(
    doc(db, 'users', userId),
    { realtimeEventsEnabled: enabled },
    { merge: true },
  );
};
