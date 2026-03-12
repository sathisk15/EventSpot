import React, { useContext, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Chip, Text, useTheme } from 'react-native-paper';

import { AuthContext } from '../contexts/AuthContext';
import CreateEventModal from '../components/CreateEventModal';
import { deleteEvent, fetchUserEvents, updateEvent } from '../services/eventService';

const formatEventDate = event => new Date(event.startDate || event.date).toLocaleDateString();

const formatEventTime = event =>
  new Date(event.startDate || event.date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const MyEventsScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useContext(AuthContext);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);

  const loadMyEvents = async () => {
    if (!user?.uid) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const userEvents = await fetchUserEvents(user.uid);
      setEvents(userEvents);
    } catch (error) {
      console.error('My events load failed:', error);
      Alert.alert('Error', 'Failed to load your events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyEvents();
  }, [user?.uid]);

  const handleUpdateEvent = async eventData => {
    try {
      await updateEvent(editingEvent.id, {
        ...eventData,
        createdBy: editingEvent.createdBy,
        creatorEmail: editingEvent.creatorEmail,
      });
      Alert.alert('Success', 'Event updated successfully!');
      setEditingEvent(null);
      await loadMyEvents();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleDeleteEvent = async event => {
    try {
      await deleteEvent(event.id, event.createdBy);
      Alert.alert('Success', 'Event deleted successfully!');
      await loadMyEvents();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to delete event.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="My Events" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text>Loading your events...</Text>
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="titleMedium">No events yet</Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Events you create will appear here for quick editing or deletion.
            </Text>
          </View>
        ) : (
          events.map(event => (
            <Card key={event.id} style={styles.card}>
              <View style={styles.cardContent}>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  {event.name}
                </Text>
                <View style={styles.metaRow}>
                  <Chip icon="calendar">{formatEventDate(event)}</Chip>
                  <Chip icon="clock-outline">{formatEventTime(event)}</Chip>
                </View>
                <Text variant="bodyMedium" style={styles.address}>
                  {event.location?.address || 'No address available'}
                </Text>
                <Text variant="bodySmall" style={styles.description} numberOfLines={3}>
                  {event.description}
                </Text>
                <View style={styles.actionRow}>
                  <Button mode="outlined" onPress={() => setEditingEvent(event)}>
                    Edit
                  </Button>
                  <Button
                    mode="contained"
                    buttonColor={theme.colors.error}
                    onPress={() => handleDeleteEvent(event)}
                  >
                    Delete
                  </Button>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <CreateEventModal
        visible={Boolean(editingEvent)}
        onDismiss={() => setEditingEvent(null)}
        onSave={handleUpdateEvent}
        initialLocation={editingEvent?.location || null}
        initialEvent={editingEvent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardContent: {
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  address: {
    marginBottom: 8,
    opacity: 0.8,
  },
  description: {
    opacity: 0.7,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});

export default MyEventsScreen;
