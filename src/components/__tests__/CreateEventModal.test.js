import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import CreateEventModal from '../CreateEventModal';

const mockOnSave = jest.fn();
const mockOnDismiss = jest.fn();

const defaultProps = {
  visible: true,
  onDismiss: mockOnDismiss,
  onSave: mockOnSave,
  initialLocation: {
    latitude: 51.1079,
    longitude: 17.0385,
    address: 'Wroclaw, Poland',
  },
};

describe('CreateEventModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the event form with schedule controls', () => {
    const { getByText, getByPlaceholderText } = render(<CreateEventModal {...defaultProps} />);

    expect(getByText('Create Event')).toBeTruthy();
    expect(getByPlaceholderText('Search location...')).toBeTruthy();
    expect(getByText('Starts On')).toBeTruthy();
    expect(getByText('End Time')).toBeTruthy();
    expect(getByText('Duration: 1h')).toBeTruthy();
  });

  it('calls onSave with start, end, and duration fields', async () => {
    const { getByText, getByLabelText } = render(<CreateEventModal {...defaultProps} />);

    fireEvent.changeText(getByLabelText('Event Name'), 'My Birthday Party');
    fireEvent.changeText(getByLabelText('Description'), 'Pizza and cake at my place!');
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Birthday Party',
          description: 'Pizza and cake at my place!',
          location: defaultProps.initialLocation,
          date: expect.any(String),
          startDate: expect.any(String),
          endDate: expect.any(String),
          durationMinutes: 60,
        })
      );
    });
  });

  it('updates the duration when the end time changes', async () => {
    const { getByText, getAllByText } = render(<CreateEventModal {...defaultProps} />);

    fireEvent.press(getByText('icon-clock-end'));
    fireEvent.press(getAllByText('DateTimePicker')[0]);

    await waitFor(() => {
      expect(getByText('Duration: 2h')).toBeTruthy();
    });
  });

  it('updates local location when visible changes', () => {
    const { rerender, getByText } = render(<CreateEventModal {...defaultProps} visible={false} />);

    const newLocation = { latitude: 10, longitude: 20, address: 'Test Address' };
    rerender(<CreateEventModal {...defaultProps} visible={true} initialLocation={newLocation} />);

    expect(getByText('Test Address')).toBeTruthy();
  });

  it('shows alert if name or description is missing', () => {
    const { getByText } = render(<CreateEventModal {...defaultProps} />);

    fireEvent.press(getByText('Save'));

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing Info',
      'Please provide a name and description for the event.'
    );
  });

  it('calls onDismiss when close action is pressed', () => {
    const { getByText } = render(<CreateEventModal {...defaultProps} />);

    fireEvent.press(getByText('close'));

    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('performs location search and selects a result', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve([{ lat: '12.3', lon: '45.6', display_name: 'New Location' }]),
      })
    );

    const { getByPlaceholderText, getByText } = render(<CreateEventModal {...defaultProps} />);

    const searchInput = getByPlaceholderText('Search location...');
    fireEvent.changeText(searchInput, 'New York');
    fireEvent(searchInput, 'onSubmitEditing');

    await waitFor(() => {
      expect(getByText('New Location')).toBeTruthy();
    });

    fireEvent.press(getByText('New Location'));

    expect(searchInput.props.value).toBe('New Location');
  });

  it('handles search failure', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
    const { getByPlaceholderText } = render(<CreateEventModal {...defaultProps} />);

    const searchInput = getByPlaceholderText('Search location...');
    fireEvent.changeText(searchInput, 'Fail');
    fireEvent(searchInput, 'onSubmitEditing');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Search Error', 'Could not fetch location results.');
    });
  });

  it('handles image picking and removal', async () => {
    jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://test-image.jpg' }],
    });

    const { getByText, queryByText } = render(<CreateEventModal {...defaultProps} />);

    fireEvent.press(getByText('Add'));

    await waitFor(() => {
      expect(getByText('close-circle')).toBeTruthy();
    });

    fireEvent.press(getByText('close-circle'));

    await waitFor(() => {
      expect(queryByText('close-circle')).toBeNull();
    });
  });

  it('does not add images when the picker is cancelled', async () => {
    jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });

    const { getByText, queryByText } = render(<CreateEventModal {...defaultProps} />);

    fireEvent.press(getByText('Add'));

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    expect(queryByText('close-circle')).toBeNull();
  });

  it('includes selected image uris when saving', async () => {
    jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://picked-image.jpg' }],
    });

    const { getByText, getByLabelText } = render(<CreateEventModal {...defaultProps} />);

    fireEvent.press(getByText('Add'));

    await waitFor(() => {
      expect(getByText('close-circle')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Event Name'), 'Photo Event');
    fireEvent.changeText(getByLabelText('Description'), 'With an image');
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          images: ['file://picked-image.jpg'],
        })
      );
    });
  });

  it('handles save failure', async () => {
    mockOnSave.mockRejectedValueOnce(new Error('Save failed'));

    const { getByText, getByLabelText } = render(<CreateEventModal {...defaultProps} />);

    fireEvent.changeText(getByLabelText('Event Name'), 'Test');
    fireEvent.changeText(getByLabelText('Description'), 'Desc');
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to save event.');
    });
  });

  it('handles search input clearing', () => {
    const { getByPlaceholderText } = render(<CreateEventModal {...defaultProps} />);
    const searchInput = getByPlaceholderText('Search location...');

    fireEvent.changeText(searchInput, 'abc');
    expect(searchInput.props.value).toBe('abc');

    fireEvent(searchInput, 'onClearIconPress');
    expect(searchInput.props.value).toBe('');

    fireEvent.changeText(searchInput, 'def');
    fireEvent.changeText(searchInput, '');
    expect(searchInput.props.value).toBe('');
  });

  it('renders the selected location chip', () => {
    const { getByText } = render(<CreateEventModal {...defaultProps} />);

    expect(getByText('Wroclaw, Poland')).toBeTruthy();
  });

  it('does not render a selected location chip when no initial location is provided', () => {
    const { queryByText } = render(<CreateEventModal {...defaultProps} initialLocation={null} />);

    expect(queryByText('Wroclaw, Poland')).toBeNull();
  });

  it('handles empty search results', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
      })
    );

    const { getByPlaceholderText } = render(<CreateEventModal {...defaultProps} />);
    const searchInput = getByPlaceholderText('Search location...');
    fireEvent.changeText(searchInput, 'Unknown Place');
    fireEvent(searchInput, 'onSubmitEditing');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
