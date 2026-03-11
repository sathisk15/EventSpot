import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Alert, TouchableOpacity, Keyboard } from 'react-native';
import { Text, Appbar, useTheme, ActivityIndicator, Avatar, FAB, Searchbar, List, Card, Portal } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { AuthContext } from '../contexts/AuthContext';
import CreateEventModal from '../components/CreateEventModal';
import EventDetailModal from '../components/EventDetailModal';
import { saveEvent, fetchEvents } from '../services/eventService';

const MapScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
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

  // FAB Group state
  const [fabOpen, setFabOpen] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setErrorMsg('Location services are disabled');
        setLoading(false);
        return;
      }

      let currentLocation;
      try {
        currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (e) {
        currentLocation = await Location.getLastKnownPositionAsync({});
      }
      
      if (currentLocation) {
        const loc = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };
        setLocation(loc);
        setSelectedLocation({ ...loc, address: 'Your Current Location' });
      }

      // 2. Fetch Events
      const fetchedEvents = await fetchEvents();
      setEvents(fetchedEvents);

    } catch (error) {
      console.error("Initialization error:", error);
      setErrorMsg('Error initializing map data');
    } finally {
      setLoading(false);
    }
  };

  const refreshEvents = async () => {
    try {
      const fetchedEvents = await fetchEvents();
      setEvents(fetchedEvents);
      
      // Update the Leaflet map with new events
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'SET_EVENTS',
          events: fetchedEvents
        }));
      }
    } catch (error) {
      console.error("Refresh events error:", error);
    }
  };

  const handleSearch = async (query) => {
    if (!query) return;
    setSearchLoading(true);
    setShowResults(true);
    try {
      console.log("Searching Nominatim for:", query);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'EventSpotApp/1.0' } }
      );
      console.log("Nominatim response status:", response.status);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search fetch failed:", error);
      Alert.alert('Search Error', `Network request failed. Please check your internet connection.`);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectSearchResult = (item) => {
    const newLoc = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      address: item.display_name
    };
    
    setLocation(newLoc);
    setSelectedLocation(newLoc);
    setShowResults(false);
    setSearchQuery(item.display_name);
    Keyboard.dismiss();

    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'UPDATE_LOCATION',
        lat: newLoc.latitude,
        lng: newLoc.longitude
      }));
    }
  };

  const recenterMap = async () => {
    if (!webViewRef.current) return;
    
    setIsRecentering(true);
    try {
      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const newLoc = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      
      setLocation(newLoc);
      setSelectedLocation({ ...newLoc, address: 'Current Location' });
      
      webViewRef.current.postMessage(JSON.stringify({
        type: 'UPDATE_LOCATION',
        lat: newLoc.latitude,
        lng: newLoc.longitude
      }));
    } catch (error) {
      console.error("Recenter error:", error);
    } finally {
      setIsRecentering(false);
    }
  };

  const onSaveEvent = async (eventData) => {
    try {
      await saveEvent(eventData);
      Alert.alert('Success', 'Event created successfully!');
      setModalVisible(false);
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

          /* High-End Photo-Pin Design */
          .event-pin {
            display: flex; flex-direction: column; align-items: center;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
            animation: float-pin 3s ease-in-out infinite;
          }
          
          @keyframes float-pin {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }

          .pin-head {
            width: 42px; height: 42px;
            border-radius: 50% 50% 50% 5px;
            background: white;
            padding: 3px;
            display: flex; align-items: center; justify-content: center;
            transform: rotate(-45deg);
            border: 1px solid rgba(255,255,255,0.8);
            box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
          }
          
          .pin-image {
            width: 100%; height: 100%;
            border-radius: 50%;
            background-size: cover;
            background-position: center;
            background-color: ${theme.colors.secondary};
            transform: rotate(45deg);
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 18px; font-weight: bold;
            overflow: hidden;
          }

          .pin-image img {
            width: 100%; height: 100%; object-fit: cover;
          }
          
          .pin-tail {
            width: 0; height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid white;
            margin-top: -12px;
            z-index: -1;
          }
        </style>
      </head>
      <body>
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
            eventMarkersLayer.clearLayers();
            eventList.forEach(function(ev) {
              if (ev.location && ev.location.latitude) {
                var imgHtml = ev.images && ev.images[0] ? '<img src="' + ev.images[0] + '" />' : '<span>' + ev.name.charAt(0) + '</span>';
                
                var pinHtml = '<div class="event-pin">' +
                                '<div class="pin-head">' +
                                  '<div class="pin-image">' + imgHtml + '</div>' +
                                '</div>' +
                              '</div>';

                var pinIcon = L.divIcon({
                  className: 'custom-leaflet-marker',
                  html: pinHtml,
                  iconSize: [44, 44], iconAnchor: [22, 44]
                });
                
                var marker = L.marker([ev.location.latitude, ev.location.longitude], { icon: pinIcon })
                  .addTo(eventMarkersLayer);
                
                marker.on('click', function() {
                  sendEventClick(ev.id);
                });
              }
            });
          }

          // Initial Render
          renderEvents(${JSON.stringify(events)});

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

          window.addEventListener('message', function(event) {
            var data = JSON.parse(event.data);
            if (data.type === 'UPDATE_LOCATION') {
              if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
              map.setView([data.lat, data.lng], 15);
              userMarker.setLatLng([data.lat, data.lng]);
            } else if (data.type === 'SET_EVENTS') {
              renderEvents(data.events);
            }
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content title="EventSpot" titleStyle={{ fontWeight: 'bold', color: theme.colors.primary }} />
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarContainer}>
          {user?.photoURL ? (
            <Avatar.Image size={36} source={{ uri: user.photoURL }} />
          ) : (
            <Avatar.Text size={36} label={getInitials()} style={{ backgroundColor: theme.colors.primary }} color={theme.colors.onPrimary} />
          )}
          <View style={styles.onlineIndicator} />
        </TouchableOpacity>
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search location..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={() => handleSearch(searchQuery)}
          onClearIconPress={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
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
                  onPress={() => selectSearchResult(item)}
                  left={props => <List.Icon {...props} icon="map-marker" />}
                />
              ))}
            </List.Section>
          </Card>
        )}
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
            <Text style={{ marginTop: 10 }}>Mapping your world...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centerBox}>
             <Text variant="titleMedium" style={{ color: theme.colors.error, textAlign: 'center', padding: 20 }}>{errorMsg}</Text>
             <FAB icon="refresh" style={{ marginTop: 20 }} onPress={loadInitialData} label="Retry" />
          </View>
        ) : location ? (
          <>
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: mapHtml }}
              style={styles.map}
              javaScriptEnabled={true}
              onMessage={(event) => {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'LOG') {
                  console.log("Leaflet Log:", data.msg);
                } else if (data.type === 'EVENT_CLICK') {
                  const ev = events.find(e => e.id === data.id);
                  if (ev) {
                    setSelectedEvent(ev);
                    setDetailVisible(true);
                  }
                } else if (data.type === 'MAP_CLICK') {
                  setSelectedLocation({
                    latitude: data.lat,
                    longitude: data.lng,
                    address: 'Dropped Pin'
                  });
                  setModalVisible(true);
                }
              }}
            />
            
            <Portal>
              <FAB.Group
                open={fabOpen}
                visible={true}
                icon={fabOpen ? 'close' : 'plus'}
                actions={[
                  { icon: 'calendar-plus', label: 'Add Event', onPress: () => setModalVisible(true) },
                  { icon: 'crosshairs-gps', label: 'Recenter', onPress: recenterMap },
                ]}
                onStateChange={({ open }) => setFabOpen(open)}
                fabStyle={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color={theme.colors.onPrimary}
                backdropColor="transparent"
              />
            </Portal>

            <CreateEventModal
              visible={modalVisible}
              onDismiss={() => setModalVisible(false)}
              onSave={onSaveEvent}
              initialLocation={selectedLocation}
            />

            <EventDetailModal
              visible={detailVisible}
              onDismiss={() => setDetailVisible(false)}
              event={selectedEvent}
            />
          </>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { position: 'absolute', top: 90, left: 16, right: 16, zIndex: 100 },
  searchBar: { elevation: 4 },
  resultsCard: { marginTop: 4, maxHeight: 250 },
  content: { flex: 1, position: 'relative' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  fab: { borderRadius: 28 },
  avatarContainer: { marginRight: 16, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  onlineIndicator: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: 'white' }
});

export default MapScreen;

