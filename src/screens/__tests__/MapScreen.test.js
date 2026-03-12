import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MapScreen from '../MapScreen';
import { AuthContext } from '../../contexts/AuthContext';
import * as Location from 'expo-location';
import {
  fetchEvents,
  saveEvent,
  setEventInterest,
  updateEvent,
  deleteEvent,
  subscribeToEvents,
} from '../../services/eventService';
import { Alert } from 'react-native';
// Alert is mocked in jest.setup.js

// Mock eventService
jest.mock('../../services/eventService', () => ({
  fetchEvents: jest.fn(),
  saveEvent: jest.fn(),
  setEventInterest: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
  subscribeToEvents: jest.fn(),
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
  return ({ visible, onDismiss, event, currentUserId, onEdit, onDelete, onToggleInterest, interestLoading }) => visible ? (
    <View testID="event-detail-modal-mock">
      <Text>Event Details Mock</Text>
      <Text>{event?.name}</Text>
      <Text>{event?.createdBy === currentUserId ? 'Owner View' : 'Viewer View'}</Text>
      <Text>{Array.isArray(event?.attendees) ? `${event.attendees.length} interested` : '0 interested'}</Text>
      <Text>{interestLoading ? 'Interest Loading' : 'Interest Idle'}</Text>
      <TouchableOpacity onPress={() => onDismiss()}><Text>close-modal</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => onEdit?.(event)}><Text>edit-event</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete?.(event)}><Text>delete-event</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => onToggleInterest?.(event, true)}><Text>toggle-interest-on</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => onToggleInterest?.(event, false)}><Text>toggle-interest-off</Text></TouchableOpacity>
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

const getLastMapMessage = () => {
  const calls = global.__WEBVIEW_POST_MESSAGE_MOCK__?.mock?.calls || [];
  const lastCall = calls[calls.length - 1];
  return lastCall ? JSON.parse(lastCall[0]) : null;
};

describe('MapScreen', () => {
  let focusListener;
  let eventsSubscriptionHandler;
  const mockEvents = [{
    id: 'ev1',
    name: 'Cool Concert',
    location: { latitude: 51, longitude: 17, address: 'Concert Hall' },
    date: new Date().toISOString(),
    category: 'Music',
    attendees: ['friend-user'],
    createdBy: 'test-user-id',
    creatorEmail: 'test@example.com',
  }];

  beforeEach(() => {
    jest.clearAllMocks();
    if (global.__WEBVIEW_POST_MESSAGE_MOCK__) {
      global.__WEBVIEW_POST_MESSAGE_MOCK__.mockClear();
    }
    focusListener = undefined;
    eventsSubscriptionHandler = undefined;
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
    setEventInterest.mockResolvedValue({});
    updateEvent.mockResolvedValue({});
    deleteEvent.mockResolvedValue();
    subscribeToEvents.mockImplementation(onEvents => {
      eventsSubscriptionHandler = onEvents;
      onEvents(mockEvents);
      return jest.fn();
    });
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

  it('updates the map when the realtime event subscription pushes new data', async () => {
    const { getByTestId } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => {
      expect(subscribeToEvents).toHaveBeenCalledTimes(1);
    });

    act(() => {
      eventsSubscriptionHandler?.([
        {
          id: 'ev-live',
          name: 'Live Event',
          location: { latitude: 50.1, longitude: 19.9, address: 'Live Hall' },
          date: new Date().toISOString(),
          createdBy: 'someone-else',
          creatorEmail: 'live@example.com',
        },
      ]);
    });

    await waitFor(() => {
      expect(getLastMapMessage()).toEqual({
        type: 'SET_EVENTS',
        events: [
          expect.objectContaining({
            id: 'ev-live',
            name: 'Live Event',
          }),
        ],
      });
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

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    const webview = getByTestId('webview-mock');
    
    // Simulate EVENT_CLICK from Leaflet
    fireEvent(webview, 'onMessage', JSON.stringify({
      type: 'EVENT_CLICK',
      id: 'ev1'
    }));

    await waitFor(() => {
      expect(getByText('Event Details Mock')).toBeTruthy();
      expect(getByText('Cool Concert')).toBeTruthy();
      expect(getByText('1 interested')).toBeTruthy();
    });
  });

  it('renders zoom controls and sends zoom commands to the map', async () => {
    const { getByTestId } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent.press(getByTestId('zoom-in-button'));
    fireEvent.press(getByTestId('zoom-out-button'));

    expect(global.__WEBVIEW_POST_MESSAGE_MOCK__).toHaveBeenCalledWith(
      JSON.stringify({ type: 'ZOOM_IN' })
    );
    expect(global.__WEBVIEW_POST_MESSAGE_MOCK__).toHaveBeenCalledWith(
      JSON.stringify({ type: 'ZOOM_OUT' })
    );
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

  it('renders event filter controls and summary', async () => {
    const { getByTestId, getByPlaceholderText, getByText, queryByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    expect(getByText('Find a place')).toBeTruthy();
    expect(getByText('1 event')).toBeTruthy();
    expect(getByText('Show Filters')).toBeTruthy();
    expect(queryByText('Clear All')).toBeNull();

    fireEvent.press(getByTestId('toggle-filters'));

    expect(
      getByPlaceholderText('Filter events by name, address, or category...')
    ).toBeTruthy();
    expect(getByText('Filter events')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Music')).toBeTruthy();
  });

  it('filters map pins by name or address text', async () => {
    fetchEvents.mockResolvedValue([
      {
        id: 'ev1',
        name: 'Cool Concert',
        category: 'Music',
        location: { latitude: 51, longitude: 17, address: 'Concert Hall' },
      },
      {
        id: 'ev2',
        name: 'Food Market',
        category: 'Food',
        location: { latitude: 52, longitude: 18, address: 'Market Square' },
      },
    ]);

    const { getByPlaceholderText, getByTestId, getByText } = render(
      <MapScreen navigation={{}} />,
      { wrapper: providers }
    );

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    expect(getLastMapMessage()).toEqual({
      type: 'SET_EVENTS',
      events: expect.arrayContaining([
        expect.objectContaining({name: 'Cool Concert'}),
        expect.objectContaining({name: 'Food Market'}),
      ]),
    });

    fireEvent.press(getByTestId('toggle-filters'));
    fireEvent.changeText(
      getByPlaceholderText('Filter events by name, address, or category...'),
      'Market'
    );

    await waitFor(() => {
      expect(getByText('1 event')).toBeTruthy();
      expect(getLastMapMessage()).toEqual({
        type: 'SET_EVENTS',
        events: [expect.objectContaining({name: 'Food Market'})],
      });
    });
  });

  it('filters map pins by category', async () => {
    fetchEvents.mockResolvedValue([
      {
        id: 'ev1',
        name: 'Cool Concert',
        category: 'Music',
        location: { latitude: 51, longitude: 17, address: 'Concert Hall' },
      },
      {
        id: 'ev2',
        name: 'Startup Mixer',
        category: 'Networking',
        location: { latitude: 52, longitude: 18, address: 'Innovation Hub' },
      },
    ]);

    const { getByText, getByTestId } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent.press(getByTestId('toggle-filters'));
    fireEvent.press(getByText('Networking'));

    await waitFor(() => {
      expect(getByText('1 event')).toBeTruthy();
      expect(getLastMapMessage()).toEqual({
        type: 'SET_EVENTS',
        events: [expect.objectContaining({name: 'Startup Mixer'})],
      });
    });

    fireEvent.press(getByText('All'));

    await waitFor(() => {
      expect(getByText('2 events')).toBeTruthy();
      expect(getLastMapMessage()).toEqual({
        type: 'SET_EVENTS',
        events: expect.arrayContaining([
          expect.objectContaining({name: 'Startup Mixer'}),
          expect.objectContaining({name: 'Cool Concert'}),
        ]),
      });
    });
  });

  it('clears location search and event filters from a single action', async () => {
    const allEvents = [
      {
        id: 'ev1',
        name: 'Cool Concert',
        category: 'Music',
        location: { latitude: 51, longitude: 17, address: 'Concert Hall' },
      },
      {
        id: 'ev2',
        name: 'Food Market',
        category: 'Food',
        location: { latitude: 52, longitude: 18, address: 'Market Square' },
      },
    ];

    fetchEvents.mockResolvedValue(allEvents);
    subscribeToEvents.mockImplementationOnce(onEvents => {
      eventsSubscriptionHandler = onEvents;
      onEvents(allEvents);
      return jest.fn();
    });
    global.fetch = createFetchMock();

    const { getByPlaceholderText, getByTestId, getByText, queryByText } = render(
      <MapScreen navigation={{}} />,
      { wrapper: providers }
    );

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    const searchInput = getByPlaceholderText('Search location...');
    fireEvent.changeText(searchInput, 'Warsaw');
    fireEvent(searchInput, 'onSubmitEditing');

    await waitFor(() => {
      expect(getByText('Warsaw, Poland')).toBeTruthy();
      expect(getByText('Clear All')).toBeTruthy();
    });

    fireEvent.press(getByTestId('toggle-filters'));

    const filterInput = getByPlaceholderText('Filter events by name, address, or category...');
    fireEvent.changeText(filterInput, 'Market');
    fireEvent.press(getByText('Food'));

    await waitFor(() => {
      expect(getByText('1 event')).toBeTruthy();
    });

    fireEvent.press(getByTestId('clear-search-filters'));

    await waitFor(() => {
      expect(searchInput.props.value).toBe('');
      expect(queryByText('Warsaw, Poland')).toBeNull();
      expect(queryByText('Filter events by name, address, or category...')).toBeNull();
      expect(getByText('2 events')).toBeTruthy();
      expect(queryByText('Clear All')).toBeNull();
      expect(getLastMapMessage()).toEqual({
        type: 'SET_EVENTS',
        events: expect.arrayContaining([
          expect.objectContaining({name: 'Cool Concert'}),
          expect.objectContaining({name: 'Food Market'}),
        ]),
      });
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

  it('recenters map when action dock button is pressed', async () => {
    const { getByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent.press(getByText('Recenter'));

    await waitFor(() => {
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });
  });

  it('falls back to the last known position when recenter live GPS fails', async () => {
    Location.getCurrentPositionAsync
      .mockResolvedValueOnce({ coords: { latitude: 51.1079, longitude: 17.0385 } })
      .mockRejectedValueOnce(new Error('GPS failed'));
    Location.getLastKnownPositionAsync.mockResolvedValueOnce({
      coords: { latitude: 50.0647, longitude: 19.9450 }
    });

    const { getByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent.press(getByText('Recenter'));

    await waitFor(() => {
      expect(Location.getLastKnownPositionAsync).toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  it('shows an alert when recenter cannot find any location', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    Location.getCurrentPositionAsync
      .mockResolvedValueOnce({ coords: { latitude: 51.1079, longitude: 17.0385 } })
      .mockRejectedValueOnce(new Error('GPS failed'));
    Location.getLastKnownPositionAsync.mockResolvedValueOnce(null);

    const { getByText } = render(<MapScreen navigation={{}} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent.press(getByText('Recenter'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Recenter error:', expect.any(Error));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Unavailable',
        'Unable to refresh your live location. The map stayed on your last known position.',
      );
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

  it('handles action dock "Add Event" action', async () => {
    const { getByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });
    
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());
    
    fireEvent.press(getByText('Add Event'));
    
    expect(getByText('Create Event Mock')).toBeTruthy();
    expect(getByText('No Initial Location')).toBeTruthy();
  });

  it('navigates to My Events from the action dock', async () => {
    const { getByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent.press(getByText('My Events'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('MyEvents');
  });

  it('saves a new event without depending on a manual refresh', async () => {
    const { getByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalledTimes(1));

    fireEvent.press(getByText('Add Event'));
    fireEvent.press(getByText('save-modal'));

    await waitFor(() => {
      expect(saveEvent).toHaveBeenCalledWith({ name: 'New' });
    });
  });

  it('handles modal dismissals', async () => {
    const { getByText, queryByText, getByTestId } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });
    
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());
    
    // Open and dismiss CreateEventModal
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
    const { getByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });
    
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());
    
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

  it('toggles interest for events owned by other users', async () => {
    const viewerEvents = [
      {
        id: 'viewer-event',
        name: 'Community Meetup',
        location: { latitude: 51, longitude: 17, address: 'Community Hall' },
        date: new Date().toISOString(),
        attendees: [],
        createdBy: 'other-user',
        creatorEmail: 'other@example.com',
      },
    ];

    fetchEvents.mockResolvedValue(viewerEvents);
    subscribeToEvents.mockImplementationOnce(onEvents => {
      eventsSubscriptionHandler = onEvents;
      onEvents(viewerEvents);
      return jest.fn();
    });

    const { getByTestId, getByText } = render(<MapScreen navigation={mockNavigation} />, { wrapper: providers });

    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    fireEvent(getByTestId('webview-mock'), 'onMessage', JSON.stringify({
      type: 'EVENT_CLICK',
      id: 'viewer-event'
    }));

    await waitFor(() => {
      expect(getByText('Viewer View')).toBeTruthy();
      expect(getByText('0 interested')).toBeTruthy();
    });

    fireEvent.press(getByText('toggle-interest-on'));

    await waitFor(() => {
      expect(setEventInterest).toHaveBeenCalledWith('viewer-event', true);
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

  it('clears the clicked location when opening the modal from the action dock after a map click', async () => {
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

    fireEvent.press(getByText('Add Event'));

    expect(getByText('No Initial Location')).toBeTruthy();
    expect(queryByText('Resolved Address')).toBeNull();
  });
});
