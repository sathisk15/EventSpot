import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MapScreen from '../MapScreen';
import { AuthContext } from '../../contexts/AuthContext';
import * as Location from 'expo-location';
import { fetchEvents, saveEvent, updateEvent, deleteEvent } from '../../services/eventService';
import { Alert } from 'react-native';
// Alert is mocked in jest.setup.js

// Mock eventService
jest.mock('../../services/eventService', () => ({
  fetchEvents: jest.fn(),
  saveEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

// Mock Modals to isolate MapScreen tests
jest.mock('../../components/CreateEventModal', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ visible, onDismiss, onSave, initialLocation, initialEvent }) => visible ? (
    <View testID="create-event-modal-mock">
      <Text>{initialEvent ? 'Edit Event Mock' : 'Create Event Mock'}</Text>
      <Text>{initialEvent?.name || 'No Initial Event'}</Text>
      <Text>{initialLocation?.address || 'No Initial Location'}</Text>
      <TouchableOpacity onPress={() => onDismiss()}><Text>close-modal</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => onSave({ name: 'New' })}><Text>save-modal</Text></TouchableOpacity>
    </View>
  ) : null;
});

jest.mock('../../components/EventDetailModal', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ visible, onDismiss, event, currentUserId, onEdit, onDelete }) => visible ? (
    <View testID="event-detail-modal-mock">
      <Text>Event Details Mock</Text>
      <Text>{event?.name}</Text>
      <Text>{event?.createdBy === currentUserId ? 'Owner View' : 'Viewer View'}</Text>
      <TouchableOpacity onPress={() => onDismiss()}><Text>close-modal</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => onEdit?.(event)}><Text>edit-event</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete?.(event)}><Text>delete-event</Text></TouchableOpacity>
    </View>
  ) : null;
});

// Location is mocked in jest.setup.js

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User'
};

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(),
};

const providers = ({ children }) => (
  <AuthContext.Provider value={{ user: mockUser }}>
    {children}
  </AuthContext.Provider>
);

const createFetchMock = ({ reverseAddress = 'Resolved Address', searchResults } = {}) =>
  jest.fn((url) => {
    if (url.includes('/reverse')) {
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ display_name: reverseAddress }),
      });
    }

    if (url.includes('/search')) {
      return Promise.resolve({
        status: 200,
        json: () =>
          Promise.resolve(
            searchResults || [{ lat: '52.2297', lon: '21.0122', display_name: 'Warsaw, Poland' }]
          ),
      });
    }

    return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
  });

describe('MapScreen', () => {
  let focusListener;
  const mockEvents = [{
    id: 'ev1',
    name: 'Cool Concert',
    location: { latitude: 51, longitude: 17, address: 'Concert Hall' },
    date: new Date().toISOString(),
    createdBy: 'test-user-id',
    creatorEmail: 'test@example.com',
  }];

  beforeEach(() => {
    jest.clearAllMocks();
    focusListener = undefined;
    mockNavigation.addListener.mockImplementation((eventName, callback) => {
      if (eventName === 'focus') {
        focusListener = callback;
      }
      return jest.fn();
    });
    
    // Default mocks
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.hasServicesEnabledAsync.mockResolvedValue(true);
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 51.1079, longitude: 17.0385 }
    });
    fetchEvents.mockResolvedValue(mockEvents);
    saveEvent.mockResolvedValue({});
    updateEvent.mockResolvedValue({});
    deleteEvent.mockResolvedValue();
    global.fetch = createFetchMock();
  });

  it('renders loading state initially', async () => {
    // We wrap render in act if needed, but RNTL usually handles it
    const { getByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });
    expect(getByText('Mapping your world...')).toBeTruthy();
  });

  it('loads location and events on mount', async () => {
    const mockEvents = [{ id: '1', name: 'Test Event', location: { latitude: 51.1079, longitude: 17.0385 } }];
    fetchEvents.mockResolvedValue(mockEvents);

    const { queryByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(fetchEvents).toHaveBeenCalled();
      expect(queryByText('Mapping your world...')).toBeNull();
    });
  });

  it('refreshes events when the map screen regains focus', async () => {
    fetchEvents
      .mockResolvedValueOnce(mockEvents)
      .mockResolvedValueOnce([
        {
          id: 'ev2',
          name: 'Fresh Event',
          location: { latitude: 52, longitude: 18, address: 'Fresh Hall' },
          date: new Date().toISOString(),
          createdBy: 'test-user-id',
          creatorEmail: 'test@example.com',
        },
      ]);

    render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => {
      expect(fetchEvents).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await focusListener?.();
    });

    await waitFor(() => {
      expect(fetchEvents).toHaveBeenCalledTimes(2);
    });
  });

  it('uses a background-image element for event marker photos', async () => {
    fetchEvents.mockResolvedValue([
      {
        id: 'photo-event',
        name: 'Photo Event',
        images: ['https://example.com/photo.jpg'],
        location: { latitude: 51.1079, longitude: 17.0385 },
      },
    ]);

    const { getByTestId } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    const webview = getByTestId('webview-mock');
    expect(webview.props.source.html).toContain('class="event-pin-photo"');
    expect(webview.props.source.html).toContain('background-image: url(&quot;');
    expect(webview.props.source.html).toContain("ev.images[0]");
    expect(webview.props.source.html).not.toContain('<img src=');
  });

  it('falls back to the last known position when live GPS fails', async () => {
    Location.getCurrentPositionAsync.mockRejectedValueOnce(new Error('GPS unavailable'));
    Location.getLastKnownPositionAsync.mockResolvedValueOnce({
      coords: { latitude: 40.7128, longitude: -74.0060 }
    });

    render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => {
      expect(Location.getLastKnownPositionAsync).toHaveBeenCalled();
      expect(fetchEvents).toHaveBeenCalled();
    });
  });

  it('shows error message if location permission is denied', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { queryByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => {
      expect(queryByText(/Permission to access location was denied/i)).toBeTruthy();
      expect(queryByText('Mapping your world...')).toBeNull();
    }, { timeout: 3000 });
  });

  it('opens CreateEventModal when map is clicked (simulated via onMessage)', async () => {
    const { getByTestId, getByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    const webview = getByTestId('webview-mock');
    
    // Simulate MAP_CLICK from Leaflet
    fireEvent(webview, 'onMessage', JSON.stringify({
      type: 'MAP_CLICK',
      lat: 51.1079,
      lng: 17.0385
    }));

    await waitFor(() => {
      expect(getByText('Create Event Mock')).toBeTruthy();
      expect(getByText('Resolved Address')).toBeTruthy();
    });
  });

  it('opens EventDetailModal when an event is clicked', async () => {
    const { getByTestId, getByText, queryByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => expect(queryByText('Mapping your world...')).toBeNull());

    const webview = getByTestId('webview-mock');
    
    // Simulate EVENT_CLICK from Leaflet
    fireEvent(webview, 'onMessage', JSON.stringify({
      type: 'EVENT_CLICK',
      id: 'ev1'
    }));

    await waitFor(() => {
      expect(getByText('Event Details Mock')).toBeTruthy();
      expect(getByText('Cool Concert')).toBeTruthy();
    });
  });

  it('performs location search and updates map', async () => {
    global.fetch = createFetchMock();

    const { getByPlaceholderText, getByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    const searchInput = getByPlaceholderText('Search location...');
    fireEvent.changeText(searchInput, 'Warsaw');
    fireEvent(searchInput, 'onSubmitEditing');

    await waitFor(() => {
      expect(getByText('Warsaw, Poland')).toBeTruthy();
    });

    // Select the result
    fireEvent.press(getByText('Warsaw, Poland'));

    // Should clear results
    await waitFor(() => {
      expect(searchInput.props.value).toBe('Warsaw, Poland');
    });
  });

  it('handles search failure', async () => {
    global.fetch = jest.fn((url) =>
      url.includes('/reverse')
        ? Promise.resolve({
            status: 200,
            json: () => Promise.resolve({ display_name: 'Resolved Address' }),
          })
        : Promise.reject(new Error('Network error'))
    );

    const { getByPlaceholderText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    const searchInput = getByPlaceholderText('Search location...');
    fireEvent.changeText(searchInput, 'Warsaw');
    fireEvent(searchInput, 'onSubmitEditing');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Search Error', expect.any(String));
    });
  });

  it('recenters map when FAB action is pressed', async () => {
    const { getByText, getByTestId } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent.press(getByText('plus')); // Open FAB Group
    fireEvent.press(getByText('Recenter'));

    await waitFor(() => {
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });
  });

  it('logs recenter errors without crashing', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    Location.getCurrentPositionAsync
      .mockResolvedValueOnce({ coords: { latitude: 51.1079, longitude: 17.0385 } })
      .mockRejectedValueOnce(new Error('GPS failed'));

    const { getByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent.press(getByText('plus'));
    fireEvent.press(getByText('Recenter'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Recenter error:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles Leaflet log and READY messages', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { getByTestId } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    const webview = getByTestId('webview-mock');
    
    // Test LOG
    fireEvent(webview, 'onMessage', JSON.stringify({ type: 'LOG', msg: 'Hello world' }));
    expect(consoleSpy).toHaveBeenCalledWith("Leaflet Log:", "Hello world");

    // Test READY
    fireEvent(webview, 'onMessage', JSON.stringify({ type: 'READY' }));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Leaflet is ready"), expect.any(Number));

    consoleSpy.mockRestore();
  });

  it('shows error message if location services are disabled', async () => {
    Location.hasServicesEnabledAsync.mockResolvedValue(false);

    const { queryByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => {
      expect(queryByText(/Location services are disabled/i)).toBeTruthy();
    });
  });

  it('handles initialization error gracefully', async () => {
    Location.requestForegroundPermissionsAsync.mockRejectedValue(new Error('Crash'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { queryByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => {
      expect(queryByText(/Error initializing map data/i)).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('handles FAB "Add Event" action', async () => {
    const { getByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });
    
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());
    
    fireEvent.press(getByText('plus')); // Open FAB
    fireEvent.press(getByText('Add Event'));
    
    expect(getByText('Create Event Mock')).toBeTruthy();
    expect(getByText('No Initial Location')).toBeTruthy();
  });

  it('navigates to My Events from the FAB menu', async () => {
    const { getByText, getByTestId } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent.press(getByTestId('fab-toggle'));
    fireEvent.press(getByText('My Events'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('MyEvents');
  });

  it('logs refresh failures after saving a new event', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    saveEvent.mockResolvedValueOnce({});
    fetchEvents
      .mockResolvedValueOnce(mockEvents)
      .mockRejectedValueOnce(new Error('Refresh failed'));

    const { getByText, getByTestId } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalledTimes(1));

    fireEvent.press(getByTestId('fab-toggle'));
    fireEvent.press(getByText('Add Event'));
    fireEvent.press(getByText('save-modal'));

    await waitFor(() => {
      expect(saveEvent).toHaveBeenCalledWith({ name: 'New' });
      expect(consoleSpy).toHaveBeenCalledWith('Refresh events error:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles modal dismissals', async () => {
    const { getByText, queryByText, getByTestId } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });
    
    await waitFor(() => expect(queryByText('Mapping your world...')).toBeNull());
    
    // Open and dismiss CreateEventModal
    fireEvent.press(getByTestId('fab-toggle'));
    fireEvent.press(getByText('Add Event'));
    expect(getByText('Create Event Mock')).toBeTruthy();
    
    fireEvent.press(getByText('close-modal')); 
    await waitFor(() => {
      expect(queryByText('Create Event Mock')).toBeNull();
    });

    // Open and dismiss EventDetailModal
    const webview = getByTestId('webview-mock');
    
    fireEvent(webview, 'onMessage', JSON.stringify({ type: 'EVENT_CLICK', id: 'ev1' }));
    
    await waitFor(() => expect(getByText('Event Details Mock')).toBeTruthy());
    fireEvent.press(getByText('close-modal')); 
    await waitFor(() => {
      expect(queryByText('Event Details Mock')).toBeNull();
    });
  });

  it('handles onSaveEvent in MapScreen', async () => {
    const { getByText, getByTestId } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });
    
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());
    
    fireEvent.press(getByTestId('fab-toggle'));
    fireEvent.press(getByText('Add Event'));
    
    fireEvent.press(getByText('save-modal'));
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Event created successfully!');
    });
  });

  it('opens the edit flow for events owned by the current user', async () => {
    const { getByTestId, getByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent(getByTestId('webview-mock'), 'onMessage', JSON.stringify({
      type: 'EVENT_CLICK',
      id: 'ev1'
    }));

    await waitFor(() => {
      expect(getByText('Owner View')).toBeTruthy();
    });

    fireEvent.press(getByText('edit-event'));

    await waitFor(() => {
      expect(getByText('Edit Event Mock')).toBeTruthy();
      expect(getByText('Cool Concert')).toBeTruthy();
      expect(getByText('Concert Hall')).toBeTruthy();
    });
  });

  it('updates an owned event from the edit flow', async () => {
    const { getByTestId, getByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent(getByTestId('webview-mock'), 'onMessage', JSON.stringify({
      type: 'EVENT_CLICK',
      id: 'ev1'
    }));

    await waitFor(() => {
      expect(getByText('Owner View')).toBeTruthy();
    });

    fireEvent.press(getByText('edit-event'));
    fireEvent.press(getByText('save-modal'));

    await waitFor(() => {
      expect(updateEvent).toHaveBeenCalledWith(
        'ev1',
        expect.objectContaining({
          name: 'New',
          createdBy: 'test-user-id',
          creatorEmail: 'test@example.com',
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Event updated successfully!');
    });
  });

  it('deletes an owned event from the detail modal', async () => {
    const { getByTestId, getByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent(getByTestId('webview-mock'), 'onMessage', JSON.stringify({
      type: 'EVENT_CLICK',
      id: 'ev1'
    }));

    await waitFor(() => {
      expect(getByText('Owner View')).toBeTruthy();
    });

    fireEvent.press(getByText('delete-event'));

    await waitFor(() => {
      expect(deleteEvent).toHaveBeenCalledWith('ev1', 'test-user-id');
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Event deleted successfully!');
    });
  });

  it('handles search query clearing', async () => {
    const { getByPlaceholderText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    const searchInput = getByPlaceholderText('Search location...');
    
    fireEvent(searchInput, 'onClearIconPress');
    // Code executed
  });

  it('handles retry on error', async () => {
    Location.requestForegroundPermissionsAsync.mockRejectedValueOnce(new Error('Initial Load Failed'));
    const { getByText, queryByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });
    
    await waitFor(() => expect(getByText(/Error initializing map data/i)).toBeTruthy());
    
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    fireEvent.press(getByText('Retry'));
    
    await waitFor(() => {
      expect(queryByText(/Error initializing map data/i)).toBeNull();
    });
  });

  it('handles initials fallback for user', () => {
    const userNoName = { email: 'anonymous@test.com' };
    const { getByText, rerender } = render(<AuthContext.Provider value={{ user: userNoName }}><MapScreen navigation={mockNavigation} /></AuthContext.Provider>);
    expect(getByText('A')).toBeTruthy();

    const userEmpty = {};
    rerender(<AuthContext.Provider value={{ user: userEmpty }}><MapScreen navigation={mockNavigation} /></AuthContext.Provider>);
    expect(getByText('U')).toBeTruthy();
  });

  it('ignores event clicks for unknown event ids', async () => {
    const { getByTestId, queryByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent(getByTestId('webview-mock'), 'onMessage', JSON.stringify({
      type: 'EVENT_CLICK',
      id: 'missing-event'
    }));

    expect(queryByText('Event Details Mock')).toBeNull();
  });

  it('handles search with empty query', async () => {
     const { getByPlaceholderText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });
     await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

     global.fetch.mockClear();
     const searchInput = getByPlaceholderText('Search location...');
     fireEvent.changeText(searchInput, '');
     fireEvent(searchInput, 'onSubmitEditing');
     // Should return early, no fetch called
     expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to coordinate text when reverse geocoding fails on map click', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn((url) =>
      url.includes('/reverse')
        ? Promise.reject(new Error('Reverse geocode failed'))
        : Promise.resolve({
            status: 200,
            json: () => Promise.resolve([{ lat: '52.2297', lon: '21.0122', display_name: 'Warsaw, Poland' }]),
          })
    );

    const { getByTestId, getByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent(getByTestId('webview-mock'), 'onMessage', JSON.stringify({
      type: 'MAP_CLICK',
      lat: 51.1079,
      lng: 17.0385
    }));

    await waitFor(() => {
      expect(getByText('51.10790, 17.03850')).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalledWith('Reverse geocode failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('clears the clicked location when opening the modal from the FAB after a map click', async () => {
    const { getByTestId, getByText, queryByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent(getByTestId('webview-mock'), 'onMessage', JSON.stringify({
      type: 'MAP_CLICK',
      lat: 51.1079,
      lng: 17.0385
    }));

    await waitFor(() => {
      expect(getByText('Resolved Address')).toBeTruthy();
    });

    fireEvent.press(getByText('close-modal'));
    await waitFor(() => {
      expect(queryByText('Create Event Mock')).toBeNull();
    });

    fireEvent.press(getByTestId('fab-toggle'));
    fireEvent.press(getByText('Add Event'));

    expect(getByText('No Initial Location')).toBeTruthy();
    expect(queryByText('Resolved Address')).toBeNull();
  });
});
