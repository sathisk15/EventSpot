import React, {useContext, useEffect, useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Keyboard,
  ScrollView,
} from 'react-native';
import {
  Text,
  Appbar,
  useTheme,
  ActivityIndicator,
  Avatar,
  FAB,
  Searchbar,
  List,
  Card,
  Portal,
  Chip,
} from 'react-native-paper';
import {WebView} from 'react-native-webview';
import * as Location from 'expo-location';
import {AuthContext} from '../contexts/AuthContext';
import CreateEventModal from '../components/CreateEventModal';
import EventDetailModal from '../components/EventDetailModal';
import {
  fetchEvents,
  saveEvent,
  updateEvent,
  deleteEvent,
  subscribeToEvents,
} from '../services/eventService';
import {EVENT_CATEGORIES} from '../constants/eventCategories';

const formatCoordinateFallback = (latitude, longitude) =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

const ALL_EVENT_CATEGORIES = 'All';

const normalizeFilterValue = value => value?.trim().toLowerCase() || '';

const filterEvents = (eventList, query, category) => {
  const normalizedQuery = normalizeFilterValue(query);

  return eventList.filter(event => {
    const matchesCategory =
      !category ||
      category === ALL_EVENT_CATEGORIES ||
      event.category === category;

    if (!matchesCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      event.name,
      event.location?.address,
      event.category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
};

const MapScreen = ({navigation}) => {
  const {user} = useContext(AuthContext);
  const theme = useTheme();
  const webViewRef = useRef(null);

  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecentering, setIsRecentering] = useState(false);

  // Events state
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [eventFilterQuery, setEventFilterQuery] = useState('');
  const [eventFilterCategory, setEventFilterCategory] = useState(
    ALL_EVENT_CATEGORIES,
  );
  const [showEventFilters, setShowEventFilters] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialLocation, setModalInitialLocation] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      refreshEvents();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!webViewRef.current) {
      return;
    }

    postMapMessage({
      type: 'SET_EVENTS',
      events: filterEvents(events, eventFilterQuery, eventFilterCategory),
    });
  }, [events, eventFilterCategory, eventFilterQuery]);

  const postMapMessage = payload => {
    webViewRef.current?.postMessage(JSON.stringify(payload));
  };

  const resolveAddress = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        {headers: {'User-Agent': 'EventSpotApp/1.0'}},
      );
      const data = await response.json();
      return data.display_name || formatCoordinateFallback(latitude, longitude);
    } catch (error) {
      console.error('Reverse geocode failed:', error);
      return formatCoordinateFallback(latitude, longitude);
    }
  };

  const buildResolvedLocation = async (latitude, longitude) => ({
    latitude,
    longitude,
    address: await resolveAddress(latitude, longitude),
  });

  const getDeviceCoordinates = async () => {
    const {status} = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('Location permission is required to center the map.');
    }

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      throw new Error('Location services are disabled.');
    }

    let currentLocation = null;

    try {
      currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (error) {
      currentLocation = await Location.getLastKnownPositionAsync({});
    }

    if (!currentLocation?.coords) {
      throw new Error('Unable to determine your current location.');
    }

    return {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    };
  };

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
      // 1. Fetch Location
      const loc = await getDeviceCoordinates();
      setLocation(loc);
      await refreshEvents();

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
      console.log('Searching Nominatim for:', query);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {headers: {'User-Agent': 'EventSpotApp/1.0'}},
      );
      console.log('Nominatim response status:', response.status);
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

    setIsRecentering(true);
    try {
      const newLoc = await getDeviceCoordinates();
      updateMapLocation(newLoc);
    } catch (error) {
      console.error('Recenter error:', error);
      if (location) {
        postMapMessage({
          type: 'UPDATE_LOCATION',
          lat: location.latitude,
          lng: location.longitude,
        });
        Alert.alert(
          'Location Unavailable',
          'Unable to refresh your live location. The map stayed on your last known position.',
        );
      } else {
        Alert.alert('Location Error', error.message);
      }
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
      Alert.alert('Success', 'Event deleted successfully!');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to delete event.');
    }
  };

  const filteredEvents = filterEvents(
    events,
    eventFilterQuery,
    eventFilterCategory,
  );

  // Leaflet HTML with OpenStreetMap Tiles
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; background: #f0f0f0; }
          #map { height: 100vh; width: 100vw; }
          .leaflet-control-attribution { display: none; }
          
          /* User Location Icon */
          .user-location-icon .target-dot {
            width: 14px; height: 14px; background-color: ${theme.colors.primary};
            border: 3px solid white; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.3); z-index: 2;
          }
          .user-location-icon .pulse {
            position: absolute; width: 30px; height: 30px; background-color: ${theme.colors.primary};
            opacity: 0.4; border-radius: 50%; animation: pulse-animation 2s infinite ease-out; z-index: 1;
          }
          @keyframes pulse-animation {
            0% { transform: scale(0.5); opacity: 0.8; }
            100% { transform: scale(3); opacity: 0; }
          }

          /* Droplet Event Marker */
          .custom-leaflet-marker {
            background: transparent;
            border: none;
          }

          .event-pin {
            position: relative;
            width: 56px;
            height: 76px;
            animation: float-pin 3.2s ease-in-out infinite;
            transform-origin: center bottom;
          }
          
          @keyframes float-pin {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }

          .event-pin-body {
            position: relative;
            width: 56px;
            height: 56px;
            margin-top: 2px;
            border-radius: 50% 50% 50% 0;
            background: rgba(255,255,255,0.96);
            overflow: hidden;
            transform: rotate(-45deg);
            box-shadow:
              0 16px 28px rgba(15, 23, 42, 0.24),
              0 8px 14px rgba(15, 23, 42, 0.12);
          }

          .event-pin-media {
            position: absolute;
            inset: 4px;
            border-radius: 50% 50% 50% 0;
            overflow: hidden;
          }

          .event-pin-photo {
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            display: block;
            transform: rotate(45deg) scale(1.18);
            transform-origin: center;
          }

          .event-pin-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary});
            color: white;
            font-size: 18px;
            font-weight: 800;
            transform: rotate(45deg) scale(1.05);
            transform-origin: center;
          }

          .event-pin-shadow {
            position: absolute;
            left: 50%;
            bottom: 2px;
            width: 26px;
            height: 9px;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.2);
            filter: blur(3px);
            opacity: 0.38;
            transform: translateX(-50%);
          }

          /* Debug Counter Overlay */
          #debug-counter {
            position: fixed; top: 10px; left: 10px;
            background: rgba(0,0,0,0.7); color: white;
            padding: 5px 10px; border-radius: 15px;
            font-size: 10px; z-index: 9999;
            font-family: sans-serif; pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div id="debug-counter">Event Count: 0</div>
        <div id="map"></div>
        <script>
          function log(msg) { window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', msg: msg})); }
          function sendEventClick(eventId) { 
             window.ReactNativeWebView.postMessage(JSON.stringify({type: 'EVENT_CLICK', id: eventId})); 
          }

          var map = L.map('map', { zoomControl: false, attributionControl: false })
            .setView([${location?.latitude || 0}, ${location?.longitude || 0}], 15);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

          // User Marker
          var userIcon = L.divIcon({
            className: 'user-location-icon',
            html: '<div class="pulse"></div><div class="target-dot"></div>',
            iconSize: [30, 30], iconAnchor: [15, 15]
          });
          var userMarker = L.marker([${location?.latitude || 0}, ${location?.longitude || 0}], { icon: userIcon }).addTo(map);

          // Event Markers Group
          var eventMarkersLayer = L.layerGroup().addTo(map);

          function renderEvents(eventList) {
            log("Leaflet: Rendering " + eventList.length + " events.");
            document.getElementById('debug-counter').innerText = "Event Count: " + eventList.length;
            
            eventMarkersLayer.clearLayers();
            eventList.forEach(function(ev) {
              if (ev.location && ev.location.latitude !== undefined) {
                var lat = parseFloat(ev.location.latitude);
                var lng = parseFloat(ev.location.longitude);
                
                if (isNaN(lat) || isNaN(lng)) {
                  log("Leaflet: Invalid coordinates for event: " + ev.name);
                  return;
                }

                var badgeText = (ev.name ? ev.name.charAt(0) : 'E').toUpperCase();
                var mediaHtml = ev.images && ev.images[0]
                  ? '<div class="event-pin-photo" style="background-image: url(&quot;' + ev.images[0] + '&quot;);"></div>'
                  : '<span class="event-pin-fallback">' + badgeText + '</span>';
                
                var pinHtml = '<div class="event-pin">' +
                                '<div class="event-pin-body">' +
                                  '<div class="event-pin-media">' + mediaHtml + '</div>' +
                                '</div>' +
                                '<div class="event-pin-shadow"></div>' +
                              '</div>';

                var pinIcon = L.divIcon({
                  className: 'custom-leaflet-marker',
                  html: pinHtml,
                  iconSize: [56, 76], iconAnchor: [28, 74]
                });
                
                var marker = L.marker([lat, lng], { icon: pinIcon })
                  .addTo(eventMarkersLayer);
                
                marker.on('click', function() {
                  sendEventClick(ev.id);
                });
              } else {
                log("Leaflet: Skipping event due to missing location field: " + (ev.name || ev.id));
              }
            });
          }

          // Let React Native know we are ready
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'READY'}));

          // Initial Render
          renderEvents(${JSON.stringify(filteredEvents)});

          // Map Click Handler
          var tempMarker;
          map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;
            
            // Show a temporary "Drop Pin"
            if (tempMarker) map.removeLayer(tempMarker);
            tempMarker = L.marker([lat, lng], { opacity: 0.6 }).addTo(map);
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'MAP_CLICK', 
              lat: lat, 
              lng: lng
            }));
          });

          function handleNativeMessage(event) {
            var rawData = event && event.data ? event.data : event;
            if (!rawData) {
              return;
            }

            var data;
            try {
              data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            } catch (error) {
              log('Leaflet: Failed to parse native message');
              return;
            }

            if (data.type === 'UPDATE_LOCATION') {
              if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
              map.setView([data.lat, data.lng], 15);
              userMarker.setLatLng([data.lat, data.lng]);
            } else if (data.type === 'ZOOM_IN') {
              map.zoomIn();
            } else if (data.type === 'ZOOM_OUT') {
              map.zoomOut();
            } else if (data.type === 'SET_EVENTS') {
              renderEvents(data.events);
            }
          }

          window.addEventListener('message', handleNativeMessage);
          document.addEventListener('message', handleNativeMessage);
        </script>
      </body>
    </html>
  `;

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Appbar.Header elevated style={{backgroundColor: theme.colors.surface}}>
        <Appbar.Content
          title="EventSpot"
          titleStyle={{fontWeight: 'bold', color: theme.colors.primary}}
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
              style={{backgroundColor: theme.colors.primary}}
              color={theme.colors.onPrimary}
            />
          )}
          <View style={styles.onlineIndicator} />
        </TouchableOpacity>
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Card style={styles.controlsCard}>
          <Text style={styles.controlsLabel}>Find a place</Text>
          <Searchbar
            placeholder="Search location..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            onSubmitEditing={() => handleSearch(searchQuery)}
            onClearIconPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              setShowResults(false);
            }}
            loading={searchLoading}
            style={styles.searchBar}
          />
          <View style={styles.controlsRow}>
            <TouchableOpacity
              testID="toggle-filters"
              onPress={() => setShowEventFilters(current => !current)}
              style={[
                styles.controlButton,
                {
                  backgroundColor: showEventFilters
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant || '#EFF3F7',
                },
              ]}>
              <Text
                style={[
                  styles.controlButtonText,
                  {
                    color: showEventFilters
                      ? theme.colors.onPrimary || '#FFFFFF'
                      : theme.colors.onSurface || '#0F172A',
                  },
                ]}>
                {showEventFilters ? 'Hide Filters' : 'Show Filters'}
              </Text>
            </TouchableOpacity>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillText}>
                {filteredEvents.length}{' '}
                {filteredEvents.length === 1 ? 'event' : 'events'}
              </Text>
            </View>
          </View>

          {showResults && searchResults.length > 0 && (
            <Card style={styles.resultsCard}>
              <List.Section>
                {searchResults.map((item, index) => (
                  <List.Item
                    key={index}
                    title={item.display_name}
                    onPress={() => selectSearchResult(item)}
                    left={props => <List.Icon {...props} icon="map-marker" />}
                  />
                ))}
              </List.Section>
            </Card>
          )}

          {showEventFilters && (
            <Card style={styles.filterCard}>
              <Text style={styles.controlsLabel}>Filter events</Text>
              <Searchbar
                placeholder="Filter events by name, address, or category..."
                onChangeText={setEventFilterQuery}
                value={eventFilterQuery}
                onClearIconPress={() => setEventFilterQuery('')}
                style={styles.filterSearchBar}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChips}>
                {[ALL_EVENT_CATEGORIES, ...EVENT_CATEGORIES].map(category => {
                  const selected = eventFilterCategory === category;

                  return (
                    <Chip
                      key={category}
                      selected={selected}
                      onPress={() => setEventFilterCategory(category)}
                      style={[
                        styles.filterChip,
                        selected && {
                          backgroundColor:
                            theme.colors.primaryContainer || '#DCEBFF',
                        },
                      ]}
                      textStyle={
                        selected
                          ? {
                              color:
                                theme.colors.onPrimaryContainer ||
                                theme.colors.primary,
                            }
                          : undefined
                      }>
                      {category}
                    </Chip>
                  );
                })}
              </ScrollView>
            </Card>
          )}
        </Card>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator
              animating={true}
              color={theme.colors.primary}
              size="large"
            />
            <Text style={{marginTop: 10}}>Mapping your world...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centerBox}>
            <Text
              variant="titleMedium"
              style={{
                color: theme.colors.error,
                textAlign: 'center',
                padding: 20,
              }}>
              {errorMsg}
            </Text>
            <FAB
              icon="refresh"
              style={{marginTop: 20}}
              onPress={loadInitialData}
              label="Retry"
            />
          </View>
        ) : location ? (
          <>
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{html: mapHtml}}
              style={styles.map}
              javaScriptEnabled={true}
              onMessage={event => {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'LOG') {
                  console.log('Leaflet Log:', data.msg);
                } else if (data.type === 'READY') {
                  console.log(
                    'Leaflet is ready, pushing initial events:',
                    events.length,
                  );
                  webViewRef.current?.postMessage(
                    JSON.stringify({
                      type: 'SET_EVENTS',
                      events: filteredEvents,
                    }),
                  );
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

            <Portal>
              <View style={styles.mapControls}>
                <TouchableOpacity
                  testID="zoom-in-button"
                  style={[styles.mapControlButton, {backgroundColor: theme.colors.surface}]}
                  onPress={() => zoomMap('ZOOM_IN')}>
                  <Text style={styles.mapControlText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="zoom-out-button"
                  style={[styles.mapControlButton, {backgroundColor: theme.colors.surface}]}
                  onPress={() => zoomMap('ZOOM_OUT')}>
                  <Text style={styles.mapControlText}>-</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionDock}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {backgroundColor: theme.colors.surface},
                  ]}
                  onPress={() => navigation.navigate('MyEvents')}>
                  <Text style={styles.actionLabel}>My Events</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.primaryActionButton,
                    {backgroundColor: theme.colors.primary},
                  ]}
                  onPress={openCreateEventModal}>
                  <Text
                    style={[
                      styles.actionLabel,
                      {color: theme.colors.onPrimary || '#FFFFFF'},
                    ]}>
                    Add Event
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {backgroundColor: theme.colors.surface},
                  ]}
                  onPress={recenterMap}>
                  <Text style={styles.actionLabel}>
                    {isRecentering ? 'Recentering...' : 'Recenter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Portal>

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
            />
          </>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  searchContainer: {
    position: 'absolute',
    top: 90,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  controlsCard: {
    padding: 12,
    borderRadius: 24,
    elevation: 6,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  controlsLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.6,
    marginBottom: 8,
  },
  searchBar: {elevation: 0},
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  controlButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  controlButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryPill: {
    marginLeft: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F5F7FA',
  },
  summaryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  resultsCard: {
    marginTop: 10,
    maxHeight: 250,
    borderRadius: 18,
    overflow: 'hidden',
  },
  filterCard: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    elevation: 0,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  filterSearchBar: {
    elevation: 0,
  },
  filterChips: {
    paddingTop: 10,
    paddingRight: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  content: {flex: 1, position: 'relative'},
  centerBox: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  map: {flex: 1},
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 110,
    alignItems: 'center',
  },
  mapControlButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 8,
  },
  mapControlText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 26,
  },
  actionDock: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 26,
    padding: 8,
    elevation: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginHorizontal: 4,
  },
  primaryActionButton: {
    flex: 1.15,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  avatarContainer: {
    marginRight: 16,
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
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: 'white',
  },
});

export default MapScreen;
