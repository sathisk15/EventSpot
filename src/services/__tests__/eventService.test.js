import { saveEvent, fetchEvents } from '../eventService';
import { addDoc, getDocs, collection } from 'firebase/firestore';
import { uploadBytes, getDownloadURL, ref } from 'firebase/storage';
import { auth } from '../../config/firebase';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

// Mock Firebase Storage
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock Firebase Config
jest.mock('../../config/firebase', () => ({
  db: {},
  storage: {},
  auth: {
    currentUser: { uid: 'test-uid', email: 'test@example.com' },
  },
}));

describe('eventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser = { uid: 'test-uid', email: 'test@example.com' };
  });

  describe('fetchEvents', () => {
    it('should fetch events from firestore', async () => {
      const mockDocs = [
        { id: '1', data: () => ({ name: 'Event 1' }) },
        { id: '2', data: () => ({ name: 'Event 2' }) },
      ];
      getDocs.mockResolvedValueOnce({ docs: mockDocs });

      const events = await fetchEvents();

      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('Event 1');
      expect(getDocs).toHaveBeenCalled();
    });

    it('should throw error when fetch fails', async () => {
      getDocs.mockRejectedValueOnce(new Error('Fetch failed'));
      await expect(fetchEvents()).rejects.toThrow('Fetch failed');
    });
  });

  describe('saveEvent', () => {
    it('should save an event and upload images', async () => {
      const eventData = {
        name: 'Test Event',
        description: 'Description',
        date: '2023-01-01T00:00:00.000Z',
        images: ['file://image1.jpg'],
        location: { latitude: 0, longitude: 0, address: 'Test Location' },
      };

      // Mock XMLHttpRequest for blob conversion
      const mockXHR = {
        open: jest.fn(),
        send: jest.fn(),
        onload: null,
        onerror: null,
        response: new Blob(['test-data'], { type: 'image/jpeg' }),
        responseType: '',
      };
      global.XMLHttpRequest = jest.fn(() => mockXHR);

      uploadBytes.mockResolvedValueOnce({});
      getDownloadURL.mockResolvedValueOnce('https://mock-storage.com/image1.jpg');
      addDoc.mockResolvedValueOnce({ id: 'new-event-id' });

      // Trigger the XHR onload manually in a microtask
      setTimeout(() => {
        if (mockXHR.onload) mockXHR.onload();
      }, 0);

      const result = await saveEvent(eventData);

      expect(result.id).toBe('new-event-id');
      expect(uploadBytes).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
        name: 'Test Event',
        images: ['https://mock-storage.com/image1.jpg'],
      }));
    });

    it('should throw error when save fails', async () => {
      addDoc.mockRejectedValueOnce(new Error('Save failed'));
      await expect(saveEvent({ name: 'Error Event', images: [] })).rejects.toThrow('Save failed');
    });

    it('should reject when no user is authenticated', async () => {
      auth.currentUser = null;

      await expect(
        saveEvent({
          name: 'Private Event',
          description: 'Description',
          date: '2023-01-01T00:00:00.000Z',
          images: [],
          location: { latitude: 0, longitude: 0, address: 'Test Location' },
        })
      ).rejects.toThrow('User not authenticated');
    });

    it('should throw error when image upload fails', async () => {
      const eventData = { name: 'Img Fail', images: ['file://err.jpg'] };
      
      const mockXHR = {
        open: jest.fn(),
        send: jest.fn(),
        onload: null,
        onerror: null,
        response: new Blob(['test-data'], { type: 'image/jpeg' }),
      };
      global.XMLHttpRequest = jest.fn(() => mockXHR);

      setTimeout(() => { if (mockXHR.onload) mockXHR.onload(); }, 0);
      uploadBytes.mockRejectedValueOnce(new Error('Upload failed'));
      
      await expect(saveEvent(eventData)).rejects.toThrow('Upload failed');
    });

    it('should throw error when XHR request fails', async () => {
      const eventData = { name: 'XHR Fail', images: ['file://xhr-err.jpg'] };
      
      const mockXHR = {
        open: jest.fn(),
        send: jest.fn(),
        onload: null,
        onerror: null,
      };
      global.XMLHttpRequest = jest.fn(() => mockXHR);

      setTimeout(() => { if (mockXHR.onerror) mockXHR.onerror(new Error('Network error')); }, 0);
      
      await expect(saveEvent(eventData)).rejects.toThrow('Network request failed');
    });
  });
});
