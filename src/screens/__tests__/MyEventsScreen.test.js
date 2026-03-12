import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import MyEventsScreen from '../MyEventsScreen';
import { AuthContext } from '../../contexts/AuthContext';
import {
  deleteEvent,
  fetchUserEvents,
  subscribeToUserEvents,
  updateEvent,
} from '../../services/eventService';

jest.mock('../../services/eventService', () => ({
  fetchUserEvents: jest.fn(),
  subscribeToUserEvents: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock('../../components/CreateEventModal', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ visible, initialEvent, onDismiss, onSave }) =>
    visible ? (
      <View>
        <Text>Edit Event Modal</Text>
        <Text>{initialEvent?.name}</Text>
        <TouchableOpacity onPress={() => onSave({ name: 'Updated Name', description: 'Updated Desc' })}>
          <Text>confirm-update</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDismiss}>
          <Text>close-edit</Text>
        </TouchableOpacity>
      </View>
    ) : null;
});

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

const mockEvents = [
  {
    id: 'ev1',
    name: 'My Concert',
    description: 'Owned by me',
    category: 'Music',
    date: '2026-03-12T12:00:00.000Z',
    startDate: '2026-03-12T12:00:00.000Z',
    createdBy: 'test-user-id',
    creatorEmail: 'test@example.com',
    images: [],
    location: { address: 'Main Square' },
  },
];

const renderScreen = () =>
  render(
    <AuthContext.Provider value={{ user: mockUser }}>
      <MyEventsScreen navigation={mockNavigation} />
    </AuthContext.Provider>
  );

describe('MyEventsScreen', () => {
  let userEventsSubscriptionHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    userEventsSubscriptionHandler = undefined;
    fetchUserEvents.mockResolvedValue(mockEvents);
    subscribeToUserEvents.mockImplementation((_userId, onEvents) => {
      userEventsSubscriptionHandler = onEvents;
      return jest.fn();
    });
    updateEvent.mockResolvedValue({});
    deleteEvent.mockResolvedValue();
  });

  it('renders the current user events', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(fetchUserEvents).toHaveBeenCalledWith('test-user-id');
      expect(screen.getByText('My Concert')).toBeTruthy();
      expect(screen.getByText('Music')).toBeTruthy();
      expect(screen.getByText('Main Square')).toBeTruthy();
    });
  });

  it('shows an empty state when the user has no events', async () => {
    fetchUserEvents.mockResolvedValueOnce([]);
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('No events yet')).toBeTruthy();
    });
  });

  it('updates the list when the realtime subscription pushes new events', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(subscribeToUserEvents).toHaveBeenCalledWith(
        'test-user-id',
        expect.any(Function),
        expect.any(Function),
      );
    });

    userEventsSubscriptionHandler?.([
      {
        id: 'ev-live',
        name: 'Realtime Event',
        description: 'Now live',
        category: 'Networking',
        date: '2026-03-12T12:00:00.000Z',
        startDate: '2026-03-12T12:00:00.000Z',
        createdBy: 'test-user-id',
        creatorEmail: 'test@example.com',
        images: [],
        location: { address: 'Realtime Square' },
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Realtime Event')).toBeTruthy();
      expect(screen.getByText('Realtime Square')).toBeTruthy();
    });
  });

  it('opens edit mode and updates an event', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('My Concert')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Edit'));

    await waitFor(() => {
      expect(screen.getByText('Edit Event Modal')).toBeTruthy();
      expect(screen.getAllByText('My Concert').length).toBeGreaterThan(1);
    });

    fireEvent.press(screen.getByText('confirm-update'));

    await waitFor(() => {
      expect(updateEvent).toHaveBeenCalledWith(
        'ev1',
        expect.objectContaining({
          name: 'Updated Name',
          createdBy: 'test-user-id',
          creatorEmail: 'test@example.com',
        })
      );
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Event updated successfully!');
    });
  });

  it('deletes an event from the list', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('My Concert')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Delete'));

    await waitFor(() => {
      expect(deleteEvent).toHaveBeenCalledWith('ev1', 'test-user-id');
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Event deleted successfully!');
    });
  });

  it('navigates back from the header', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('My Events')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('back'));

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('navigates home from the header', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('My Events')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('action-home'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Map');
  });
});
