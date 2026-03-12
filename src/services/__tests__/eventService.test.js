import { addDoc, deleteDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';

import {
  saveEvent,
  fetchEvents,
  updateEvent,
  deleteEvent,
  fetchUserEvents,
  subscribeToEvents,
  subscribeToUserEvents,
} from '../eventService';
import { auth } from '../../config/firebase';

jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: { BINARY_CONTENT: 'binary' },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
  updateDoc: jest.fn(),
  where: jest.fn(),
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

  describe('fetchUserEvents', () => {
    it('fetches only the current user events', async () => {
      getDocs.mockResolvedValueOnce({
        docs: [
          { id: '1', data: () => ({ name: 'Mine', createdBy: 'test-uid' }) },
        ],
      });

      const events = await fetchUserEvents('test-uid');

      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('createdBy', '==', 'test-uid');
      expect(events).toEqual([{ id: '1', name: 'Mine', createdBy: 'test-uid' }]);
    });

    it('throws when user event fetch fails', async () => {
      getDocs.mockRejectedValueOnce(new Error('User events failed'));

      await expect(fetchUserEvents('test-uid')).rejects.toThrow('User events failed');
    });
  });

  describe('realtime subscriptions', () => {
    it('subscribes to all events and maps snapshots', () => {
      const unsubscribe = jest.fn();
      const onEvents = jest.fn();

      onSnapshot.mockImplementationOnce((_queryRef, onNext) => {
        onNext({
          docs: [
            { id: '1', data: () => ({ name: 'Live Event' }) },
          ],
        });
        return unsubscribe;
      });

      const result = subscribeToEvents(onEvents);

      expect(onEvents).toHaveBeenCalledWith([{ id: '1', name: 'Live Event' }]);
      expect(result).toBe(unsubscribe);
    });

    it('subscribes to user events and builds the owner query', () => {
      const unsubscribe = jest.fn();
      const onEvents = jest.fn();

      onSnapshot.mockImplementationOnce((_queryRef, onNext) => {
        onNext({
          docs: [
            { id: 'mine', data: () => ({ name: 'Mine', createdBy: 'test-uid' }) },
          ],
        });
        return unsubscribe;
      });

      const result = subscribeToUserEvents('test-uid', onEvents);

      expect(where).toHaveBeenCalledWith('createdBy', '==', 'test-uid');
      expect(query).toHaveBeenCalled();
      expect(onEvents).toHaveBeenCalledWith([
        { id: 'mine', name: 'Mine', createdBy: 'test-uid' },
      ]);
      expect(result).toBe(unsubscribe);
    });

    it('forwards realtime subscription errors', () => {
      const onError = jest.fn();

      onSnapshot.mockImplementationOnce((_queryRef, _onNext, snapshotError) => {
        snapshotError(new Error('Realtime failed'));
        return jest.fn();
      });

      subscribeToEvents(jest.fn(), onError);

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('saveEvent', () => {
    const eventData = {
      name: 'Test Event',
      description: 'Description',
      category: 'Music',
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
          category: 'Music',
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

    it('keeps remote image urls unchanged when saving', async () => {
      addDoc.mockResolvedValueOnce({ id: 'remote-image-event' });

      const result = await saveEvent({
        ...eventData,
        images: ['https://example.com/existing.jpg'],
      });

      expect(FileSystem.uploadAsync).not.toHaveBeenCalled();
      expect(result.images).toEqual(['https://example.com/existing.jpg']);
    });
  });

  describe('updateEvent', () => {
    const eventData = {
      name: 'Updated Event',
      description: 'Updated Description',
      category: 'Networking',
      date: '2026-03-12T12:00:00.000Z',
      startDate: '2026-03-12T12:00:00.000Z',
      endDate: '2026-03-12T15:00:00.000Z',
      durationMinutes: 180,
      images: ['https://example.com/existing.jpg', 'file://new-image.jpg'],
      location: { latitude: 1, longitude: 2, address: 'Updated Location' },
      createdBy: 'test-uid',
      creatorEmail: 'test@example.com',
    };

    it('updates an owned event and uploads only new local images', async () => {
      FileSystem.uploadAsync.mockResolvedValueOnce({
        status: 200,
        body: JSON.stringify({ downloadTokens: 'updated-token' }),
      });

      const result = await updateEvent('event-123', eventData);

      expect(FileSystem.uploadAsync).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          name: 'Updated Event',
          category: 'Networking',
          images: [
            'https://example.com/existing.jpg',
            expect.stringContaining('token=updated-token'),
          ],
          updatedAt: 'mock-timestamp',
        })
      );
      expect(result.id).toBe('event-123');
    });

    it('rejects updates from non-owners', async () => {
      await expect(
        updateEvent('event-123', { ...eventData, createdBy: 'other-user' })
      ).rejects.toThrow('User not authorized to modify this event');
    });
  });

  describe('deleteEvent', () => {
    it('deletes an owned event', async () => {
      await deleteEvent('event-123', 'test-uid');

      expect(deleteDoc).toHaveBeenCalledWith(undefined);
    });

    it('rejects deletes from non-owners', async () => {
      await expect(deleteEvent('event-123', 'other-user')).rejects.toThrow(
        'User not authorized to modify this event'
      );
    });
  });
});
