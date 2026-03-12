import { addDoc, getDocs } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';

import { saveEvent, fetchEvents } from '../eventService';
import { auth } from '../../config/firebase';

jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: { BINARY_CONTENT: 'binary' },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

jest.mock('../../config/firebase', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test-uid',
      email: 'test@example.com',
      getIdToken: jest.fn(() => Promise.resolve('mock-id-token')),
    },
  },
}));

describe('eventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      getIdToken: jest.fn(() => Promise.resolve('mock-id-token')),
    };
  });

  describe('fetchEvents', () => {
    it('fetches events from firestore', async () => {
      getDocs.mockResolvedValueOnce({
        docs: [
          { id: '1', data: () => ({ name: 'Event 1' }) },
          { id: '2', data: () => ({ name: 'Event 2' }) },
        ],
      });

      const events = await fetchEvents();

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ id: '1', name: 'Event 1' });
    });

    it('throws when fetch fails', async () => {
      getDocs.mockRejectedValueOnce(new Error('Fetch failed'));

      await expect(fetchEvents()).rejects.toThrow('Fetch failed');
    });
  });

  describe('saveEvent', () => {
    const eventData = {
      name: 'Test Event',
      description: 'Description',
      date: '2026-03-12T12:00:00.000Z',
      startDate: '2026-03-12T12:00:00.000Z',
      endDate: '2026-03-12T14:00:00.000Z',
      durationMinutes: 120,
      images: ['file://image1.jpg'],
      location: { latitude: 0, longitude: 0, address: 'Test Location' },
    };

    it('saves an event and uploads images through the storage REST endpoint', async () => {
      FileSystem.uploadAsync.mockResolvedValueOnce({
        status: 200,
        body: JSON.stringify({ downloadTokens: 'download-token' }),
      });
      addDoc.mockResolvedValueOnce({ id: 'new-event-id' });

      const result = await saveEvent(eventData);

      expect(auth.currentUser.getIdToken).toHaveBeenCalled();
      expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
        expect.stringContaining('firebasestorage.googleapis.com'),
        'file://image1.jpg',
        expect.objectContaining({
          httpMethod: 'POST',
          uploadType: 'binary',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-id-token',
            'Content-Type': 'image/jpeg',
          }),
        })
      );
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          name: 'Test Event',
          startDate: '2026-03-12T12:00:00.000Z',
          endDate: '2026-03-12T14:00:00.000Z',
          durationMinutes: 120,
          images: [expect.stringContaining('token=download-token')],
        })
      );
      expect(result.id).toBe('new-event-id');
    });

    it('saves an event without uploading when there are no images', async () => {
      addDoc.mockResolvedValueOnce({ id: 'event-no-images' });

      const result = await saveEvent({ ...eventData, images: [] });

      expect(FileSystem.uploadAsync).not.toHaveBeenCalled();
      expect(result.images).toEqual([]);
    });

    it('falls back to the legacy date field when start and end are not provided', async () => {
      addDoc.mockResolvedValueOnce({ id: 'legacy-event' });

      const result = await saveEvent({
        ...eventData,
        startDate: undefined,
        endDate: undefined,
        durationMinutes: undefined,
        images: [],
      });

      expect(result.date).toBe('2026-03-12T12:00:00.000Z');
      expect(result.startDate).toBe('2026-03-12T12:00:00.000Z');
      expect(result.endDate).toBeNull();
      expect(result.durationMinutes).toBeNull();
    });

    it('rejects when no user is authenticated', async () => {
      auth.currentUser = null;

      await expect(saveEvent({ ...eventData, images: [] })).rejects.toThrow('User not authenticated');
    });

    it('throws when the firestore save fails', async () => {
      addDoc.mockRejectedValueOnce(new Error('Save failed'));

      await expect(saveEvent({ ...eventData, images: [] })).rejects.toThrow('Save failed');
    });

    it('throws when image upload fails', async () => {
      FileSystem.uploadAsync.mockRejectedValueOnce(new Error('Upload failed'));

      await expect(saveEvent(eventData)).rejects.toThrow('Upload failed');
    });

    it('throws when upload returns a non-200 status', async () => {
      FileSystem.uploadAsync.mockResolvedValueOnce({
        status: 500,
        body: 'Server error',
      });

      await expect(saveEvent(eventData)).rejects.toThrow('Upload failed with status: 500');
    });

    it('throws when upload succeeds without a download token', async () => {
      FileSystem.uploadAsync.mockResolvedValueOnce({
        status: 200,
        body: JSON.stringify({}),
      });

      await expect(saveEvent(eventData)).rejects.toThrow(
        'Upload succeeded but no download token was returned'
      );
    });

    it('uploads multiple images before saving the event', async () => {
      FileSystem.uploadAsync
        .mockResolvedValueOnce({
          status: 200,
          body: JSON.stringify({ downloadTokens: 'token-1' }),
        })
        .mockResolvedValueOnce({
          status: 200,
          body: JSON.stringify({ downloadTokens: 'token-2' }),
        });
      addDoc.mockResolvedValueOnce({ id: 'multi-image-event' });

      const result = await saveEvent({
        ...eventData,
        images: ['file://image1.jpg', 'file://image2.jpg'],
      });

      expect(FileSystem.uploadAsync).toHaveBeenCalledTimes(2);
      expect(result.images).toHaveLength(2);
    });
  });
});
