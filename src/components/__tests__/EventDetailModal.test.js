import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import EventDetailModal from '../EventDetailModal';

const mockOnDismiss = jest.fn();
const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();
const mockOnToggleInterest = jest.fn();

const mockEvent = {
  id: '1',
  name: 'Summer Concert',
  description: 'An amazing outdoor concert by the lake.',
  category: 'Music',
  date: '2026-07-15T19:00:00.000Z',
  startDate: '2026-07-15T19:00:00.000Z',
  endDate: '2026-07-15T21:30:00.000Z',
  durationMinutes: 150,
  creatorEmail: 'test@example.com',
  createdBy: 'owner-user',
  attendees: ['viewer-user', 'friend-user'],
  images: ['https://example.com/image1.jpg'],
  location: {
    address: 'Central Park, NY',
    latitude: 40.785091,
    longitude: -73.968285,
  },
};

describe('EventDetailModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with event data and schedule', () => {
    const { getByText, getByTestId } = render(
      <EventDetailModal
        visible={true}
        onDismiss={mockOnDismiss}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleInterest={mockOnToggleInterest}
        currentUserId="viewer-user"
        event={mockEvent}
      />
    );

    expect(getByText('Event Details')).toBeTruthy();
    expect(getByText('Summer Concert')).toBeTruthy();
    expect(getByText('An amazing outdoor concert by the lake.')).toBeTruthy();
    expect(getByText('Music')).toBeTruthy();
    expect(getByText('test@example.com')).toBeTruthy();
    expect(getByText('Central Park, NY')).toBeTruthy();
    expect(
      getByText(
        `From ${new Date(mockEvent.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      )
    ).toBeTruthy();
    expect(
      getByText(
        `To ${new Date(mockEvent.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      )
    ).toBeTruthy();
    expect(getByText('2h 30m')).toBeTruthy();
    expect(getByText('2 interested')).toBeTruthy();
    expect(getByTestId('event-detail-footer').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          paddingBottom: 40,
        }),
      ]),
    );
  });

  it('calls onDismiss when close action is pressed', () => {
    const { getByText } = render(
      <EventDetailModal
        visible={true}
        onDismiss={mockOnDismiss}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleInterest={mockOnToggleInterest}
        currentUserId="viewer-user"
        event={mockEvent}
      />
    );

    fireEvent.press(getByText('close'));

    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('returns null if no event is provided', () => {
    const { queryByText } = render(
      <EventDetailModal
        visible={true}
        onDismiss={mockOnDismiss}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleInterest={mockOnToggleInterest}
        currentUserId="viewer-user"
        event={null}
      />
    );

    expect(queryByText('Event Details')).toBeNull();
  });

  it('renders fallback location text when an address is missing', () => {
    const eventWithoutAddress = {
      ...mockEvent,
      images: [],
      location: {},
    };

    const { getByText } = render(
      <EventDetailModal
        visible={true}
        onDismiss={mockOnDismiss}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleInterest={mockOnToggleInterest}
        currentUserId="new-viewer"
        event={eventWithoutAddress}
      />
    );

    expect(getByText('View on Map')).toBeTruthy();
    expect(getByText("I'm Interested")).toBeTruthy();
  });

  it('falls back to the legacy date field when end date is absent', () => {
    const legacyEvent = {
      ...mockEvent,
      startDate: undefined,
      endDate: undefined,
      durationMinutes: undefined,
    };

    const { getByText, queryByText } = render(
      <EventDetailModal
        visible={true}
        onDismiss={mockOnDismiss}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleInterest={mockOnToggleInterest}
        currentUserId="viewer-user"
        event={legacyEvent}
      />
    );

    expect(
      getByText(
        `From ${new Date(legacyEvent.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      )
    ).toBeTruthy();
    expect(queryByText(/To /)).toBeNull();
    expect(queryByText('2h 30m')).toBeNull();
  });

  it('shows owner-only edit and delete actions', () => {
    const { getByText, queryByText } = render(
      <EventDetailModal
        visible={true}
        onDismiss={mockOnDismiss}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleInterest={mockOnToggleInterest}
        currentUserId="owner-user"
        event={mockEvent}
      />
    );

    expect(getByText('Edit Event')).toBeTruthy();
    expect(getByText('Delete Event')).toBeTruthy();
    expect(queryByText("I'm Interested")).toBeNull();
    expect(queryByText('2 interested')).toBeNull();
  });

  it('calls edit and delete handlers for the owner', () => {
    const { getByText } = render(
      <EventDetailModal
        visible={true}
        onDismiss={mockOnDismiss}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleInterest={mockOnToggleInterest}
        currentUserId="owner-user"
        event={mockEvent}
      />
    );

    fireEvent.press(getByText('Edit Event'));
    fireEvent.press(getByText('Delete Event'));

    expect(mockOnEdit).toHaveBeenCalledWith(mockEvent);
    expect(mockOnDelete).toHaveBeenCalledWith(mockEvent);
  });

  it('toggles interest for a viewer and reflects the interested state', () => {
    const { getByText } = render(
      <EventDetailModal
        visible={true}
        onDismiss={mockOnDismiss}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleInterest={mockOnToggleInterest}
        currentUserId="viewer-user"
        event={mockEvent}
      />
    );

    fireEvent.press(getByText('Interested'));

    expect(mockOnToggleInterest).toHaveBeenCalledWith(mockEvent, false);
  });

  it('lets a new viewer show interest', () => {
    const { getByText } = render(
      <EventDetailModal
        visible={true}
        onDismiss={mockOnDismiss}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleInterest={mockOnToggleInterest}
        currentUserId="new-viewer"
        event={{...mockEvent, attendees: ['friend-user']}}
      />
    );

    fireEvent.press(getByText("I'm Interested"));

    expect(mockOnToggleInterest).toHaveBeenCalledWith(
      {...mockEvent, attendees: ['friend-user']},
      true,
    );
  });
});
