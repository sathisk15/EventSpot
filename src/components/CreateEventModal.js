import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Appbar, 
  useTheme, 
  Portal, 
  Modal,
  IconButton,
  Searchbar,
  List,
  Card,
  Chip
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { EVENT_CATEGORIES } from '../constants/eventCategories';
import { spacing, radius, elevation } from '../config/theme';

const DEFAULT_EVENT_DURATION_MINUTES = 60;

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

const createDefaultSchedule = () => {
  const start = new Date();
  start.setSeconds(0, 0);
  return {
    start,
    end: addMinutes(start, DEFAULT_EVENT_DURATION_MINUTES),
  };
};

const updateDatePart = (baseDate, selectedDate) => {
  const nextDate = new Date(baseDate);
  nextDate.setFullYear(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  );
  return nextDate;
};

const updateTimePart = (baseDate, selectedTime) => {
  const nextDate = new Date(baseDate);
  nextDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
  return nextDate;
};

const getDurationMinutes = (startDate, endDate) =>
  Math.round((endDate.getTime() - startDate.getTime()) / 60000);

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

const formatCoordinateFallback = (latitude, longitude) =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

const formatAddressFromParts = (parts, latitude, longitude) => {
  if (!parts) {
    return formatCoordinateFallback(latitude, longitude);
  }

  const candidates = [
    parts.name,
    parts.street,
    parts.district,
    parts.city,
    parts.subregion,
    parts.region,
    parts.country,
  ].filter(Boolean);

  if (candidates.length === 0) {
    return formatCoordinateFallback(latitude, longitude);
  }

  return [...new Set(candidates)].join(', ');
};

const getScheduleFromEvent = (event) => {
  if (!event) {
    return createDefaultSchedule();
  }

  const start = new Date(event.startDate || event.date || new Date());
  start.setSeconds(0, 0);

  let end;
  if (event.endDate) {
    end = new Date(event.endDate);
  } else if (typeof event.durationMinutes === 'number') {
    end = addMinutes(start, event.durationMinutes);
  } else {
    end = addMinutes(start, DEFAULT_EVENT_DURATION_MINUTES);
  }

  return { start, end };
};

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

  // Local location state
  const [localLocation, setLocalLocation] = React.useState(initialLocation);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);

  // Sync modal state when it opens for create or edit.
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

  const handleLocationSearch = async (query) => {
    if (!query) return;
    setSearchLoading(true);
    setShowResults(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'EventSpotApp/1.0' } }
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search fetch failed:", error);
      Alert.alert('Search Error', 'Could not fetch location results.');
    } finally {
      setSearchLoading(false);
    }
  };

  const selectLocation = (item) => {
    const newLoc = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      address: item.display_name
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

      const [addressParts] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

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

  const addPickedImages = assets => {
    if (!assets?.length) {
      return;
    }

    setImages(currentImages => [...currentImages, ...assets]);
  };

  const openPhotoLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to choose event images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      addPickedImages(result.assets);
    }
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take event photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled) {
      addPickedImages(result.assets);
    }
  };

  const handlePickImage = async () => {
    Alert.alert('Add Image', 'Choose image source', [
      { text: 'Camera', onPress: openCamera },
      { text: 'Photos', onPress: openPhotoLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
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
        location: localLocation, // Use localLocation which might have been changed via search
      });
      // Reset form
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
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
          <Appbar.Action icon="close" onPress={onDismiss} />
          <Appbar.Content title={initialEvent ? 'Edit Event' : 'Create Event'} />
          <Button mode="text" onPress={handleSave} loading={loading} disabled={loading}>
            {initialEvent ? 'Update' : 'Save'}
          </Button>
        </Appbar.Header>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.searchSection}>
            <Text variant="labelLarge" style={styles.sectionTitle}>Event Location</Text>
            <View style={styles.locationInputRow}>
              <Searchbar
                placeholder="Search location..."
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (!text) {
                    setSearchResults([]);
                    setShowResults(false);
                  }
                }}
                value={searchQuery}
                onSubmitEditing={() => handleLocationSearch(searchQuery)}
                onClearIconPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowResults(false);
                }}
                loading={searchLoading}
                style={[styles.searchBar, styles.searchBarInput]}
              />
              <IconButton
                icon="crosshairs-gps"
                mode="contained-tonal"
                size={24}
                disabled={currentLocationLoading}
                onPress={handleUseCurrentLocation}
                accessibilityLabel="Use current location"
              />
            </View>
            {showResults && searchResults.length > 0 && (
              <Card style={styles.resultsCard}>
                <List.Section>
                  {searchResults.map((item, index) => (
                    <List.Item
                      key={index}
                      title={item.display_name}
                      onPress={() => selectLocation(item)}
                      left={props => <List.Icon {...props} icon="map-marker" />}
                    />
                  ))}
                </List.Section>
              </Card>
            )}
            {!showResults && localLocation && (
              <View style={styles.selectedLocationBox}>
                <Chip icon="check-circle" style={{ backgroundColor: theme.colors.primaryContainer }}>
                  {localLocation.address}
                </Chip>
              </View>
            )}
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

          <View style={styles.categorySection}>
            <Text variant="labelLarge" style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryRow}>
              {EVENT_CATEGORIES.map(option => {
                const selected = category === option;
                return (
                  <Chip
                    key={option}
                    selected={selected}
                    showSelectedCheck={selected}
                    onPress={() => setCategory(option)}
                    style={[
                      styles.categoryChip,
                      selected ? { backgroundColor: theme.colors.primaryContainer } : null,
                    ]}
                  >
                    {option}
                  </Chip>
                );
              })}
            </View>
          </View>

          <View style={styles.dateTimeSection}>
            <Text variant="labelLarge" style={styles.sectionTitle}>Schedule</Text>

            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeItem}>
                <Text variant="labelMedium">Starts On</Text>
                <Button mode="outlined" onPress={() => setActivePicker('startDate')} icon="calendar" style={styles.dateTimeButton}>
                  {startDate.toLocaleDateString()}
                </Button>
              </View>
              <View style={styles.dateTimeItem}>
                <Text variant="labelMedium">Start Time</Text>
                <Button mode="outlined" onPress={() => setActivePicker('startTime')} icon="clock-start" style={styles.dateTimeButton}>
                  {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Button>
              </View>
            </View>

            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeItem}>
                <Text variant="labelMedium">Ends On</Text>
                <Button mode="outlined" onPress={() => setActivePicker('endDate')} icon="calendar-end" style={styles.dateTimeButton}>
                  {endDate.toLocaleDateString()}
                </Button>
              </View>
              <View style={styles.dateTimeItem}>
                <Text variant="labelMedium">End Time</Text>
                <Button mode="outlined" onPress={() => setActivePicker('endTime')} icon="clock-end" style={styles.dateTimeButton}>
                  {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Button>
              </View>
            </View>

            <View style={styles.durationRow}>
              <Chip icon="timer-sand" style={{ backgroundColor: theme.colors.secondaryContainer }}>
                Duration: {formatDuration(durationMinutes)}
              </Chip>
            </View>
          </View>
          {activePicker && (
            <DateTimePicker
              value={activePicker.startsWith('start') ? startDate : endDate}
              mode={activePicker.endsWith('Date') ? 'date' : 'time'}
              is24Hour={true}
              display="default"
              onChange={handlePickerChange}
            />
          )}

          <Text variant="labelLarge" style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal style={styles.imageScroll}>
            {images.map((img, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                <IconButton
                  icon="close-circle"
                  size={20}
                  color="red"
                  style={styles.removeIcon}
                  onPress={() => removeImage(index)}
                />
              </View>
            ))}
            <TouchableOpacity style={[styles.addImage, { borderColor: theme.colors.primary }]} onPress={handlePickImage}>
              <IconButton icon="camera-plus" color={theme.colors.primary} size={30} />
              <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Add</Text>
            </TouchableOpacity>
          </ScrollView>

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
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeSection: {
    marginBottom: spacing.md,
  },
  categorySection: {
    marginBottom: spacing.md,
  },
  searchBar: {
    elevation: elevation.low,
  },
  searchBarInput: {
    flex: 1,
  },
  resultsCard: {
    marginTop: spacing.xs,
    maxHeight: 200,
    elevation: elevation.mid,
    zIndex: 1000,
  },
  selectedLocationBox: {
    marginTop: 12,
    flexDirection: 'row',
  },
  input: {
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateTimeItem: {
    flex: 0.48,
  },
  dateTimeButton: {
    marginTop: spacing.xs,
  },
  durationRow: {
    marginBottom: 12,
  },
  imageScroll: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: radius.sm,
  },
  removeIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  addImage: {
    width: 100,
    height: 100,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default CreateEventModal;
