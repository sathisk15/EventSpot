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
import DateTimePicker from '@react-native-community/datetimepicker';

const DEFAULT_EVENT_DURATION_MINUTES = 60;

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

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

const CreateEventModal = ({ visible, onDismiss, onSave, initialLocation }) => {
  const theme = useTheme();
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addMinutes(new Date(), DEFAULT_EVENT_DURATION_MINUTES));
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

  // Sync with initialLocation when modal opens
  React.useEffect(() => {
    if (visible) {
      setLocalLocation(initialLocation);
      setSearchQuery(initialLocation?.address || '');
    }
  }, [visible, initialLocation]);

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

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImages([...images, ...result.assets]);
    }
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

    if (durationMinutes <= 0) {
      Alert.alert('Invalid Time Range', 'End time must be after the start time.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: eventName,
        description,
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
      setImages([]);
      const nextStartDate = new Date();
      setStartDate(nextStartDate);
      setEndDate(addMinutes(nextStartDate, DEFAULT_EVENT_DURATION_MINUTES));
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
          <Appbar.Content title="Create Event" />
          <Button mode="text" onPress={handleSave} loading={loading} disabled={loading}>
            Save
          </Button>
        </Appbar.Header>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.searchSection}>
            <Text variant="labelLarge" style={styles.sectionTitle}>Event Location</Text>
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
              style={styles.searchBar}
            />
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
    padding: 16,
  },
  searchSection: {
    marginBottom: 20,
  },
  dateTimeSection: {
    marginBottom: 16,
  },
  searchBar: {
    elevation: 2,
    backgroundColor: 'white',
  },
  resultsCard: {
    marginTop: 4,
    maxHeight: 200,
    elevation: 4,
    zIndex: 1000,
  },
  selectedLocationBox: {
    marginTop: 12,
    flexDirection: 'row',
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
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
    marginTop: 4,
  },
  durationRow: {
    marginBottom: 12,
  },
  imageScroll: {
    flexDirection: 'row',
    marginTop: 8,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
  },
  addImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default CreateEventModal;
