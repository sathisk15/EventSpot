import React, { useContext, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, Card, Chip, Text, useTheme } from 'react-native-paper';

import { AuthContext } from '../contexts/AuthContext';
import CreateEventModal from '../components/CreateEventModal';
import {
  deleteEvent,
  fetchUserEvents,
  subscribeToUserEvents,
  updateEvent,
} from '../services/eventService';

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

  const startMyEventsSubscription = () => {
    if (!user?.uid) {
      setEvents([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    return subscribeToUserEvents(
      user.uid,
      userEvents => {
        setEvents(userEvents);
        setLoading(false);
      },
      error => {
        console.error('My events load failed:', error);
        Alert.alert('Error', 'Failed to load your events.');
        setLoading(false);
      },
    );
  };

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
    const unsubscribe = startMyEventsSubscription();
    return () => {
      unsubscribe?.();
    };
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

  const handleViewEvent = event => {
    navigation.navigate('Map', {
      focusEventId: event.id,
      focusEvent: event,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="My Events" />
        <Appbar.Action icon="home" onPress={() => navigation.navigate('Map')} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.summaryHeader}>
            <View>
              <Text variant="titleMedium" style={styles.summaryTitle}>
                Your event space
              </Text>
              <Text variant="bodyMedium" style={styles.summaryText}>
                Review, edit, and manage everything you have posted from one place.
              </Text>
            </View>
            <View
              style={[
                styles.summaryBadge,
                { backgroundColor: theme.colors.primaryContainer || '#DCEBFF' },
              ]}
            >
              <Text
                variant="labelLarge"
                style={{ color: theme.colors.onPrimaryContainer || theme.colors.primary }}
              >
                {events.length} {events.length === 1 ? 'event' : 'events'}
              </Text>
            </View>
          </View>
        </Card>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading your events...</Text>
          </View>
        ) : events.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.emptyState}>
              <Text variant="titleMedium">No events yet</Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Events you create will appear here for quick editing or deletion.
              </Text>
            </View>
          </Card>
        ) : (
          events.map(event => (
            <Card key={event.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text variant="titleLarge" style={styles.cardTitle}>
                    {event.name}
                  </Text>
                  <Text style={[styles.ownerPill, { color: theme.colors.primary }]}>
                    Posted by you
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  {event.category ? <Chip icon="shape">{event.category}</Chip> : null}
                  <Chip icon="calendar">{formatEventDate(event)}</Chip>
                  <Chip icon="clock-outline">{formatEventTime(event)}</Chip>
                </View>
                <Text variant="bodyMedium" style={styles.address}>
                  {event.location?.address || 'No address available'}
                </Text>
                <Text variant="bodySmall" style={styles.description} numberOfLines={3}>
                  {event.description || 'No description provided yet.'}
                </Text>
                <View style={styles.actionRow}>
                  <Button mode="contained-tonal" onPress={() => handleViewEvent(event)} style={styles.actionButton}>
                    View Event
                  </Button>
                  <Button mode="outlined" onPress={() => setEditingEvent(event)} style={styles.actionButton}>
                    Edit
                  </Button>
                  <Button
                    mode="contained"
                    buttonColor={theme.colors.error}
                    onPress={() => handleDeleteEvent(event)}
                    style={styles.actionButton}
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
    paddingBottom: 32,
  },
  summaryCard: {
    marginBottom: 14,
    borderRadius: 24,
    elevation: 2,
  },
  summaryHeader: {
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryText: {
    opacity: 0.72,
    maxWidth: 220,
    lineHeight: 20,
  },
  summaryBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  centerState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  emptyCard: {
    borderRadius: 24,
    elevation: 1,
  },
  emptyState: {
    paddingVertical: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    marginBottom: 12,
    borderRadius: 24,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  cardContent: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  ownerPill: {
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(59,130,246,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  address: {
    marginBottom: 10,
    opacity: 0.8,
    lineHeight: 20,
  },
  description: {
    opacity: 0.7,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
  },
});

export default MyEventsScreen;
