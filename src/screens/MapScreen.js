import React, {useContext, useEffect, useMemo, useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Keyboard,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Text,
  Appbar,
  useTheme,
  ActivityIndicator,
  Avatar,
  FAB,
} from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import {AuthContext} from '../contexts/AuthContext';
import CreateEventModal from '../components/CreateEventModal';
import EventDetailModal from '../components/EventDetailModal';
import buildMapHtml from '../components/map/buildMapHtml';
import MapSearchControls from '../components/map/MapSearchControls';
import MapActionControls from '../components/map/MapActionControls';
import { spacing, radius } from '../config/theme';
import {
  fetchEvents,
  saveEvent,
  setEventInterest,
  updateEvent,
  deleteEvent,
  subscribeToEvents,
} from '../services/eventService';
import { fetchRealtimeEventsPreference } from '../services/userPreferencesService';
import { buildResolvedLocation, getDeviceCoordinates } from '../utils/locationUtils';
import { ALL_EVENT_CATEGORIES, filterEvents } from '../utils/eventFilters';

const APPBAR_CONTENT_HEIGHT = 64;
const HEADER_TO_CONTROLS_GAP = 32;

const MapScreen = ({navigation, route}) => {
  const {user} = useContext(AuthContext);
  const theme = useTheme();
  const webViewRef = useRef(null);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecentering, setIsRecentering] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);

  // Events state
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [eventFilterQuery, setEventFilterQuery] = useState('');
  const [eventFilterCategory, setEventFilterCategory] = useState(ALL_EVENT_CATEGORIES);
  const [showEventFilters, setShowEventFilters] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialLocation, setModalInitialLocation] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [realtimeEventsEnabled, setRealtimeEventsEnabled] = useState(false);
  const showMapChrome = isFocused && !modalVisible && !detailVisible;

  const hasActiveSearchOrFilters = Boolean(
    searchQuery.trim() ||
      searchResults.length > 0 ||
      eventFilterQuery.trim() ||
      eventFilterCategory !== ALL_EVENT_CATEGORIES,
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadRealtimePreference();
      refreshEvents();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    loadRealtimePreference();
  }, [user?.uid]);

  useEffect(() => {
    if (!realtimeEventsEnabled) {
      return undefined;
    }

    const unsubscribe = subscribeToEvents(
      nextEvents => {
        setEvents(nextEvents);
      },
      () => {
        Alert.alert('Error', 'Failed to sync events in real time.');
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [realtimeEventsEnabled]);

  useEffect(() => {
    if (!webViewReady || !location) return;
    postMapMessage({
      type: 'UPDATE_LOCATION',
      lat: location.latitude,
      lng: location.longitude,
    });
  }, [location, webViewReady]);

  useEffect(() => {
    if (!webViewRef.current) {
      return;
    }

    postMapMessage({
      type: 'SET_EVENTS',
      events: filterEvents(events, eventFilterQuery, eventFilterCategory),
    });
  }, [events, eventFilterCategory, eventFilterQuery]);

  useEffect(() => {
    if (!selectedEvent?.id) {
      return;
    }

    const updatedSelectedEvent = events.find(event => event.id === selectedEvent.id);
    if (updatedSelectedEvent) {
      setSelectedEvent(updatedSelectedEvent);
    }
  }, [events, selectedEvent?.id]);

  useEffect(() => {
    const focusEvent = route?.params?.focusEvent;
    if (!focusEvent) {
      return;
    }

    clearSearchAndFilters();
    setSelectedEvent(focusEvent);
    setDetailVisible(true);
    navigation?.setParams?.({
      focusEvent: undefined,
      focusEventId: route?.params?.focusEventId,
    });
  }, [navigation, route?.params?.focusEvent, route?.params?.focusEventId]);

  useEffect(() => {
    const focusEventId = route?.params?.focusEventId;
    if (!focusEventId || events.length === 0) {
      return;
    }

    const targetEvent = events.find(event => event.id === focusEventId);
    if (!targetEvent) {
      return;
    }

    clearSearchAndFilters();
    setSelectedEvent(targetEvent);
    setDetailVisible(true);
    navigation?.setParams?.({focusEventId: undefined, focusEvent: undefined});
  }, [events, navigation, route?.params?.focusEventId]);

  const postMapMessage = payload => {
    webViewRef.current?.postMessage(JSON.stringify(payload));
  };

  async function loadRealtimePreference() {
    try {
      const enabled = await fetchRealtimeEventsPreference(user?.uid);
      setRealtimeEventsEnabled(enabled);
    } catch (error) {
      console.error('Realtime preference load failed:', error);
      setRealtimeEventsEnabled(false);
    }
  }

  const updateMapLocation = nextLocation => {
    setLocation(nextLocation);
    postMapMessage({
      type: 'UPDATE_LOCATION',
      lat: nextLocation.latitude,
      lng: nextLocation.longitude,
    });
  };

  const refreshEvents = async () => {
    try {
      const fetchedEvents = await fetchEvents();
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Refresh events error:', error);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [loc] = await Promise.all([
        getDeviceCoordinates(),
        refreshEvents(),
      ]);
      setLocation(loc);
    } catch (error) {
      console.error('Initialization error:', error);
      if (error.message === 'Location permission is required to center the map.') {
        setErrorMsg('Permission to access location was denied');
      } else if (error.message === 'Location services are disabled.') {
        setErrorMsg('Location services are disabled');
      } else {
        setErrorMsg('Error initializing map data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async query => {
    if (!query) return;
    setSearchLoading(true);
    setShowResults(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {headers: {'User-Agent': 'EventSpotApp/1.0'}},
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search fetch failed:', error);
      Alert.alert(
        'Search Error',
        `Network request failed. Please check your internet connection.`,
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearchAndFilters = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSearchLoading(false);
    setEventFilterQuery('');
    setEventFilterCategory(ALL_EVENT_CATEGORIES);
    setShowEventFilters(false);
  };

  const selectSearchResult = item => {
    const newLoc = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      address: item.display_name,
    };

    setLocation(newLoc);
    setShowResults(false);
    setSearchQuery(item.display_name);
    Keyboard.dismiss();

    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'UPDATE_LOCATION',
          lat: newLoc.latitude,
          lng: newLoc.longitude,
        }),
      );
    }
  };

  const recenterMap = async () => {
    if (!webViewRef.current) return;

    if (location) {
      postMapMessage({
        type: 'UPDATE_LOCATION',
        lat: location.latitude,
        lng: location.longitude,
      });
      return;
    }

    setIsRecentering(true);
    try {
      const newLoc = await getDeviceCoordinates();
      updateMapLocation(newLoc);
    } catch (error) {
      console.error('Recenter error:', error);
      Alert.alert('Location Error', error.message);
    } finally {
      setIsRecentering(false);
    }
  };

  const zoomMap = direction => {
    postMapMessage({type: direction});
  };

  const onSaveEvent = async eventData => {
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, {
          ...eventData,
          createdBy: editingEvent.createdBy,
          creatorEmail: editingEvent.creatorEmail,
        });
        Alert.alert('Success', 'Event updated successfully!');
      } else {
        await saveEvent(eventData);
        Alert.alert('Success', 'Event created successfully!');
      }
      setModalVisible(false);
      setModalInitialLocation(null);
      setEditingEvent(null);
      await refreshEvents();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const getInitials = () => {
    if (user?.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const handleMapClick = async (latitude, longitude) => {
    const resolvedLocation = await buildResolvedLocation(latitude, longitude);
    setEditingEvent(null);
    setModalInitialLocation(resolvedLocation);
    setModalVisible(true);
  };

  const openCreateEventModal = () => {
    setEditingEvent(null);
    setModalInitialLocation(null);
    setModalVisible(true);
  };

  const handleEditEvent = event => {
    setDetailVisible(false);
    setEditingEvent(event);
    setModalInitialLocation(event.location || null);
    setModalVisible(true);
  };

  const handleDeleteEvent = async event => {
    try {
      await deleteEvent(event.id, event.createdBy);
      setDetailVisible(false);
      setSelectedEvent(null);
      setEditingEvent(null);
      await refreshEvents();
      Alert.alert('Success', 'Event deleted successfully!');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to delete event.');
    }
  };

  const handleToggleInterest = async (event, interested) => {
    try {
      setInterestLoading(true);
      await setEventInterest(event.id, interested);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update your interest.');
    } finally {
      setInterestLoading(false);
    }
  };

  const filteredEvents = filterEvents(events, eventFilterQuery, eventFilterCategory);

  const mapHtml = useMemo(
    () => buildMapHtml(theme.colors.primary, theme.colors.secondary),
    [theme.colors.primary, theme.colors.secondary],
  );

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.appbarWrapper}>
        <LinearGradient
          colors={['#6A3FF5', '#E84DBB', '#1F8FFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Appbar.Header style={styles.appbarTransparent}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.appbarLogo}
            resizeMode="contain"
          />
          <Appbar.Content
            title="EventSpot"
            titleStyle={styles.appbarTitle}
          />
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Avatar.Image size={36} source={{uri: user.photoURL}} />
            ) : (
              <Avatar.Text
                size={36}
                label={getInitials()}
                style={styles.avatarText}
                color="#FFFFFF"
              />
            )}
            <View style={styles.onlineIndicator} />
          </TouchableOpacity>
        </Appbar.Header>
      </View>

      <View
        testID="map-search-container"
        style={[
          styles.searchContainer,
          { top: insets.top + APPBAR_CONTENT_HEIGHT + HEADER_TO_CONTROLS_GAP },
        ]}>
        <MapSearchControls
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearch={handleSearch}
          onClearSearch={() => {
            setSearchQuery('');
            setSearchResults([]);
            setShowResults(false);
          }}
          searchLoading={searchLoading}
          showResults={showResults}
          searchResults={searchResults}
          onSelectResult={selectSearchResult}
          showFilters={showEventFilters}
          onToggleFilters={() => setShowEventFilters(current => !current)}
          eventFilterQuery={eventFilterQuery}
          onEventFilterQueryChange={setEventFilterQuery}
          eventFilterCategory={eventFilterCategory}
          onEventFilterCategoryChange={setEventFilterCategory}
          filteredEventsCount={filteredEvents.length}
          hasActiveFilters={hasActiveSearchOrFilters}
          onClearAll={clearSearchAndFilters}
        />
      </View>

      <View style={styles.content}>
        {errorMsg ? (
          <View style={styles.centerBox}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.error, textAlign: 'center', padding: 20 }}>
              {errorMsg}
            </Text>
            <FAB icon="refresh" style={{marginTop: 20}} onPress={loadInitialData} label="Retry" />
          </View>
        ) : (
          <>
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{html: mapHtml}}
              style={styles.map}
              javaScriptEnabled={true}
              scrollEnabled={false}
              mixedContentMode="always"
              cacheEnabled={true}
              androidHardwareAccelerationDisabled={false}
              onMessage={event => {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'READY') {
                  setWebViewReady(true);
                  postMapMessage({ type: 'SET_EVENTS', events: filteredEvents });
                } else if (data.type === 'EVENT_CLICK') {
                  const ev = events.find(e => e.id === data.id);
                  if (ev) {
                    setSelectedEvent(ev);
                    setDetailVisible(true);
                  }
                } else if (data.type === 'MAP_CLICK') {
                  handleMapClick(data.lat, data.lng);
                }
              }}
            />

            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
                <Text style={{marginTop: 10}}>Mapping your world...</Text>
              </View>
            )}

            {showMapChrome ? (
              <MapActionControls
                onZoomIn={() => zoomMap('ZOOM_IN')}
                onZoomOut={() => zoomMap('ZOOM_OUT')}
                onMyEvents={() => navigation.navigate('MyEvents')}
                onAddEvent={openCreateEventModal}
                onRecenter={recenterMap}
                isRecentering={isRecentering}
              />
            ) : null}
          </>
        )}
      </View>

      <CreateEventModal
        visible={modalVisible}
        onDismiss={() => {
          setModalVisible(false);
          setModalInitialLocation(null);
          setEditingEvent(null);
        }}
        onSave={onSaveEvent}
        initialLocation={modalInitialLocation}
        initialEvent={editingEvent}
      />

      <EventDetailModal
        visible={detailVisible}
        onDismiss={() => setDetailVisible(false)}
        event={selectedEvent}
        currentUserId={user?.uid}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        onToggleInterest={handleToggleInterest}
        interestLoading={interestLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  appbarWrapper: {
    overflow: 'hidden',
  },
  appbarTransparent: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  appbarTitle: {
    fontWeight: '800',
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 0.3,
  },
  appbarLogo: { width: 32, height: 32, borderRadius: 9, marginLeft: 12, marginRight: 4 },
  avatarText: { backgroundColor: 'rgba(255,255,255,0.25)' },
  searchContainer: {
    position: 'absolute',
    top: 88,
    left: spacing.md,
    right: spacing.md,
    zIndex: 100,
  },
  content: { flex: 1, position: 'relative' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
  },
  map: { flex: 1 },
  avatarContainer: {
    marginRight: spacing.md,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
});

export default MapScreen;
