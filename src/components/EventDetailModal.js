import React from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Image, 
  Dimensions 
} from 'react-native';
import { 
  Portal, 
  Modal, 
  Text, 
  Button, 
  useTheme, 
  Appbar, 
  Avatar, 
  Chip,
  Divider
} from 'react-native-paper';

const { width } = Dimensions.get('window');

const EventDetailModal = ({ visible, onDismiss, event }) => {
  const theme = useTheme();

  if (!event) return null;

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss} 
        contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
      >
        <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
          <Appbar.Action icon="close" onPress={onDismiss} />
          <Appbar.Content title="Event Details" />
        </Appbar.Header>

        <ScrollView>
          {event.images && event.images.length > 0 && (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.imageGallery}>
              {event.images.map((img, index) => (
                <Image key={index} source={{ uri: img }} style={styles.eventImage} />
              ))}
            </ScrollView>
          )}

          <View style={styles.infoContainer}>
            <Text variant="headlineSmall" style={styles.title}>{event.name}</Text>
            
            <View style={styles.authorRow}>
              <Avatar.Text size={24} label={event.creatorEmail?.charAt(0).toUpperCase()} />
              <Text variant="labelLarge" style={styles.authorText}>{event.creatorEmail}</Text>
            </View>

            <View style={styles.chipRow}>
              <Chip icon="calendar" style={styles.chip}>{new Date(event.date).toLocaleDateString()}</Chip>
              <Chip icon="clock-outline" style={styles.chip}>{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Chip>
            </View>

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.sectionLabel}>Description</Text>
            <Text variant="bodyLarge" style={styles.description}>{event.description}</Text>

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.sectionLabel}>Location</Text>
            <View style={styles.locationBox}>
              <Chip icon="map-marker" mode="outlined">{event.location?.address || 'View on Map'}</Chip>
            </View>
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
        
        <View style={styles.footer}>
          <Button mode="contained" style={styles.joinButton} onPress={() => {}}>
            I'm Interested
          </Button>
        </View>
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
  imageGallery: {
    height: 250,
    width: width,
  },
  eventImage: {
    width: width,
    height: 250,
    resizeMode: 'cover',
  },
  infoContainer: {
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  authorText: {
    marginLeft: 8,
    opacity: 0.7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  divider: {
    marginVertical: 15,
  },
  sectionLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    lineHeight: 24,
    opacity: 0.8,
  },
  locationBox: {
    marginTop: 5,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  joinButton: {
    borderRadius: 8,
  }
});

export default EventDetailModal;
