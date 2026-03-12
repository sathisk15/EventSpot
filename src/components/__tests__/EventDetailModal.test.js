import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EventDetailModal from '../EventDetailModal';

const mockOnDismiss = jest.fn();

const mockEvent = {
  id: '1',
  name: 'Summer Concert',
  description: 'An amazing outdoor concert by the lake.',
  date: '2026-07-15T19:00:00.000Z',
  creatorEmail: 'test@example.com',
  images: ['https://example.com/image1.jpg'],
  location: {
    address: 'Central Park, NY',
    latitude: 40.785091,
    longitude: -73.968285
  }
};

const defaultProps = {
  visible: true,
  onDismiss: mockOnDismiss,
  event: mockEvent
};

describe('EventDetailModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with event data', () => {
    const { getByText } = render(<EventDetailModal {...defaultProps} />);
    
    expect(getByText('Event Details')).toBeTruthy();
    expect(getByText('Summer Concert')).toBeTruthy();
    expect(getByText('An amazing outdoor concert by the lake.')).toBeTruthy();
    expect(getByText('test@example.com')).toBeTruthy();
    expect(getByText('Central Park, NY')).toBeTruthy();
  });

  it('calls onDismiss when close action is pressed', () => {
    const { getByText } = render(<EventDetailModal {...defaultProps} />);
    
    // The Appbar.Action icon="close" is mocked as a TouchableOpacity with text "close"
    fireEvent.press(getByText('close'));
    
    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('returns null if no event is provided', () => {
    const { queryByText } = render(<EventDetailModal visible={true} onDismiss={mockOnDismiss} event={null} />);
    
    expect(queryByText('Event Details')).toBeNull();
  });

  it('renders fallback location text when an address is missing', () => {
    const eventWithoutAddress = {
      ...mockEvent,
      images: [],
      location: {},
    };

    const { getByText } = render(
      <EventDetailModal visible={true} onDismiss={mockOnDismiss} event={eventWithoutAddress} />
    );

    expect(getByText('View on Map')).toBeTruthy();
    expect(getByText("I'm Interested")).toBeTruthy();
  });
});
