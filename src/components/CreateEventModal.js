import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  TextInput,
  Button,
  Appbar,
  useTheme,
  Portal,
  Modal,
} from 'react-native-paper';
import * as Location from 'expo-location';
import { spacing } from '../config/theme';
import {
  DEFAULT_EVENT_DURATION_MINUTES,
  addMinutes,
  createDefaultSchedule,
  updateDatePart,
  updateTimePart,
  getDurationMinutes,
  formatAddressFromParts,
  getScheduleFromEvent,
} from '../utils/eventScheduleUtils';
import LocationSearchInput from './event/LocationSearchInput';
import CategoryPicker from './event/CategoryPicker';
import SchedulePicker from './event/SchedulePicker';
import EventImagePicker from './event/EventImagePicker';

const CreateEventModal = ({ visible, onDismiss, onSave, initialLocation, initialEvent = null }) => {
  const theme = useTheme();
  const defaultSchedule = React.useMemo(() => createDefaultSchedule(), []);
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState(defaultSchedule.start);
  const [endDate, setEndDate] = useState(defaultSchedule.end);
  const [activePicker, setActivePicker] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [localLocation, setLocalLocation] = React.useState(initialLocation);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      const nextSchedule = initialEvent ? getScheduleFromEvent(initialEvent) : createDefaultSchedule();
      const nextLocation = initialEvent?.location || initialLocation || null;

      setEventName(initialEvent?.name || '');
      setDescription(initialEvent?.description || '');
      setCategory(initialEvent?.category || '');
      setStartDate(nextSchedule.start);
      setEndDate(nextSchedule.end);
      setImages((initialEvent?.images || []).map(uri => ({ uri })));
      setLocalLocation(nextLocation);
      setSearchQuery(nextLocation?.address || '');
      setSearchResults([]);
      setShowResults(false);
      setActivePicker(null);
    }
  }, [visible, initialLocation, initialEvent]);

  const durationMinutes = getDurationMinutes(startDate, endDate);

  const handleLocationSearch = async query => {
    if (!query) return;
    setSearchLoading(true);
    setShowResults(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'EventSpotApp/1.0' } },
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search fetch failed:', error);
      Alert.alert('Search Error', 'Could not fetch location results.');
    } finally {
      setSearchLoading(false);
    }
  };

  const selectLocation = item => {
    const newLoc = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      address: item.display_name,
    };
    setLocalLocation(newLoc);
    setSearchQuery(item.display_name);
    setShowResults(false);
  };

  const handleUseCurrentLocation = async () => {
    setCurrentLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Please allow location access to use your current location.');
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = currentPosition.coords.latitude;
      const longitude = currentPosition.coords.longitude;

      const [addressParts] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const address = formatAddressFromParts(addressParts, latitude, longitude);
      const currentLoc = { latitude, longitude, address };

      setLocalLocation(currentLoc);
      setSearchQuery(address);
      setSearchResults([]);
      setShowResults(false);
    } catch (error) {
      console.error('Current location lookup failed:', error);
      Alert.alert('Location Error', 'Could not get your current location.');
    } finally {
      setCurrentLocationLoading(false);
    }
  };

  const handlePickerChange = (event, selectedValue) => {
    const pickerType = activePicker;
    setActivePicker(null);

    if (!selectedValue || !pickerType) {
      return;
    }

    if (pickerType === 'startDate') {
      const nextStartDate = updateDatePart(startDate, selectedValue);
      setStartDate(nextStartDate);
      if (endDate <= nextStartDate) {
        setEndDate(addMinutes(nextStartDate, DEFAULT_EVENT_DURATION_MINUTES));
      }
      return;
    }

    if (pickerType === 'startTime') {
      const nextStartDate = updateTimePart(startDate, selectedValue);
      setStartDate(nextStartDate);
      if (endDate <= nextStartDate) {
        setEndDate(addMinutes(nextStartDate, DEFAULT_EVENT_DURATION_MINUTES));
      }
      return;
    }

    if (pickerType === 'endDate') {
      setEndDate(updateDatePart(endDate, selectedValue));
      return;
    }

    if (pickerType === 'endTime') {
      setEndDate(updateTimePart(endDate, selectedValue));
    }
  };

  const handleSave = async () => {
    if (!eventName || !description) {
      Alert.alert('Missing Info', 'Please provide a name and description for the event.');
      return;
    }

    if (!category) {
      Alert.alert('Missing Info', 'Please select an event category.');
      return;
    }

    if (durationMinutes <= 0) {
      Alert.alert('Invalid Time Range', 'End time must be after the start time.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: eventName,
        description,
        category,
        date: startDate.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        durationMinutes,
        images: images.map(img => img.uri),
        location: localLocation,
      });
      setEventName('');
      setDescription('');
      setCategory('');
      setImages([]);
      const nextSchedule = createDefaultSchedule();
      setStartDate(nextSchedule.start);
      setEndDate(nextSchedule.end);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
      >
        <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
          <Appbar.Action icon="close" onPress={onDismiss} />
          <Appbar.Content title={initialEvent ? 'Edit Event' : 'Create Event'} />
          <Button mode="text" onPress={handleSave} loading={loading} disabled={loading}>
            {initialEvent ? 'Update' : 'Save'}
          </Button>
        </Appbar.Header>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.searchSection}>
            <LocationSearchInput
              searchQuery={searchQuery}
              onSearchQueryChange={text => {
                setSearchQuery(text);
                if (!text) {
                  setSearchResults([]);
                  setShowResults(false);
                }
              }}
              onSearch={handleLocationSearch}
              onClearSearch={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowResults(false);
              }}
              searchLoading={searchLoading}
              showResults={showResults}
              searchResults={searchResults}
              onSelectResult={selectLocation}
              onUseCurrentLocation={handleUseCurrentLocation}
              currentLocationLoading={currentLocationLoading}
              localLocation={localLocation}
            />
          </View>

          <TextInput
            label="Event Name"
            value={eventName}
            onChangeText={setEventName}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
          />

          <CategoryPicker category={category} onCategoryChange={setCategory} />

          <SchedulePicker
            startDate={startDate}
            endDate={endDate}
            activePicker={activePicker}
            onSetActivePicker={setActivePicker}
            onPickerChange={handlePickerChange}
            durationMinutes={durationMinutes}
          />

          <EventImagePicker
            images={images}
            onAddImages={assets => setImages(current => [...current, ...assets])}
            onRemoveImage={index => {
              const next = [...images];
              next.splice(index, 1);
              setImages(next);
            }}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    margin: 0,
    justifyContent: 'flex-start',
  },
  form: {
    padding: spacing.md,
  },
  searchSection: {
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
});

export default CreateEventModal;
