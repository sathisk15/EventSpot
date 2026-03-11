import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Alert,
  Modal,
  Platform
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Appbar, 
  useTheme, 
  Portal, 
  ActivityIndicator,
  IconButton
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const CreateEventModal = ({ visible, onDismiss, onSave, initialLocation }) => {
  const theme = useTheme();
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const currentDate = new Date(date);
      currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDate(currentDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const currentTime = new Date(date);
      currentTime.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setDate(currentTime);
    }
  };

  const handleSave = async () => {
    if (!eventName || !description) {
      Alert.alert('Missing Info', 'Please provide a name and description for the event.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: eventName,
        description,
        date: date.toISOString(),
        images: images.map(img => img.uri),
        location: initialLocation, // { latitude, longitude, address }
      });
      // Reset form
      setEventName('');
      setDescription('');
      setImages([]);
      setDate(new Date());
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

        <ScrollView style={styles.form}>
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

          <View style={styles.locationInfo}>
            <Text variant="labelLarge" style={{ color: theme.colors.outline }}>Location</Text>
            <Text variant="bodyMedium">{initialLocation?.address || 'Searching for coordinates...'}</Text>
          </View>

          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeItem}>
              <Text variant="labelLarge">Date</Text>
              <Button mode="outlined" onPress={() => setShowDatePicker(true)} icon="calendar">
                {date.toLocaleDateString()}
              </Button>
            </View>
            <View style={styles.dateTimeItem}>
              <Text variant="labelLarge">Time</Text>
              <Button mode="outlined" onPress={() => setShowTimePicker(true)} icon="clock">
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Button>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
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
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
  },
  locationInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateTimeItem: {
    flex: 0.48,
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
