import { doc, getDoc, setDoc } from 'firebase/firestore';

import {
  fetchRealtimeEventsPreference,
  saveRealtimeEventsPreference,
} from '../userPreferencesService';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
  db: {},
}));

describe('userPreferencesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    doc.mockReturnValue('mock-user-doc');
    setDoc.mockResolvedValue({});
  });

  it('defaults realtime preference to false when the user document does not exist', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => ({}),
    });

    await expect(fetchRealtimeEventsPreference('user-1')).resolves.toBe(false);
  });

  it('returns the stored realtime preference when available', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ realtimeEventsEnabled: true }),
    });

    await expect(fetchRealtimeEventsPreference('user-1')).resolves.toBe(true);
  });

  it('saves the realtime preference with merge semantics', async () => {
    await saveRealtimeEventsPreference('user-1', true);

    expect(setDoc).toHaveBeenCalledWith(
      'mock-user-doc',
      { realtimeEventsEnabled: true },
      { merge: true },
    );
  });
});
