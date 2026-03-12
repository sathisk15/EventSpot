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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const getEventStartDate = (event) => new Date(event.startDate || event.date);

const getEventEndDate = (event) => {
  if (event.endDate) {
    return new Date(event.endDate);
  }

  if (typeof event.durationMinutes === 'number') {
    return new Date(getEventStartDate(event).getTime() + event.durationMinutes * 60000);
  }

  return null;
};

const getDurationLabel = (event) => {
  if (typeof event.durationMinutes !== 'number') {
    return null;
  }

  const hours = Math.floor(event.durationMinutes / 60);
  const minutes = event.durationMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};

const getInterestCount = event => Array.isArray(event.attendees) ? event.attendees.length : 0;

const EventDetailModal = ({
  visible,
  onDismiss,
  event,
  currentUserId,
  onEdit,
  onDelete,
  onToggleInterest,
  interestLoading,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (!event) return null;

  const eventStartDate = getEventStartDate(event);
  const eventEndDate = getEventEndDate(event);
  const durationLabel = getDurationLabel(event);
  const isOwner = Boolean(currentUserId && event.createdBy === currentUserId);
  const interestCount = getInterestCount(event);
  const isInterested = Boolean(
    currentUserId &&
      Array.isArray(event.attendees) &&
      event.attendees.includes(currentUserId),
  );

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
              {event.category ? (
                <Chip icon="shape" style={styles.chip}>
                  {event.category}
                </Chip>
              ) : null}
              <Chip icon="calendar" style={styles.chip}>{eventStartDate.toLocaleDateString()}</Chip>
              <Chip icon="clock-start" style={styles.chip}>
                From {eventStartDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Chip>
              {eventEndDate ? (
                <Chip icon="clock-end" style={styles.chip}>
                  To {eventEndDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Chip>
              ) : null}
              {durationLabel ? (
                <Chip icon="timer-sand" style={styles.chip}>
                  {durationLabel}
                </Chip>
              ) : null}
              {!isOwner ? (
                <Chip icon="heart" style={styles.chip}>
                  {interestCount} interested
                </Chip>
              ) : null}
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
        
        <View
          testID="event-detail-footer"
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              paddingBottom: 16 + insets.bottom,
            },
          ]}>
          {isOwner ? (
            <View style={styles.ownerActions}>
              <Button mode="outlined" style={styles.ownerButton} onPress={() => onEdit?.(event)}>
                Edit Event
              </Button>
              <Button
                mode="contained"
                buttonColor={theme.colors.error}
                style={styles.ownerButton}
                onPress={() => onDelete?.(event)}
              >
                Delete Event
              </Button>
            </View>
          ) : (
            <Button
              mode={isInterested ? 'outlined' : 'contained'}
              style={styles.joinButton}
              loading={interestLoading}
              disabled={interestLoading}
              onPress={() => onToggleInterest?.(event, !isInterested)}>
              {isInterested ? 'Interested' : "I'm Interested"}
            </Button>
          )}
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
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  ownerButton: {
    flex: 1,
    borderRadius: 8,
  },
  joinButton: {
    borderRadius: 8,
  }
});

export default EventDetailModal;
