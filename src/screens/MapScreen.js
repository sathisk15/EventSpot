import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { Text, Appbar, useTheme, ActivityIndicator, Avatar, FAB } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { AuthContext } from '../contexts/AuthContext';

const MapScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const webViewRef = useRef(null);
  
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecentering, setIsRecentering] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          Alert.alert('Permission Denied', 'EventSpot requires location access to find events near you.');
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
          console.log("getCurrentPositionAsync failed, trying LastKnown...");
          currentLocation = await Location.getLastKnownPositionAsync({});
        }
        
        if (currentLocation) {
          console.log("Found location:", currentLocation.coords);
          setLocation({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });
        } else {
          setErrorMsg('Waiting for precision location...');
        }
      } catch (error) {
        console.error("Location error:", error);
        setErrorMsg('Error fetching location');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      
      console.log("Recentering to:", newLoc);
      setLocation(newLoc);
      
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

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Leaflet HTML with OpenStreetMap Tiles (100% Free, No Keys)
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
          
          .user-location-icon {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .target-dot {
            width: 14px;
            height: 14px;
            background-color: ${theme.colors.primary};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 5px rgba(0,0,0,0.3);
            z-index: 2;
          }
          
          .pulse {
            position: absolute;
            width: 30px;
            height: 30px;
            background-color: ${theme.colors.primary};
            opacity: 0.4;
            border-radius: 50%;
            animation: pulse-animation 2s infinite ease-out;
            z-index: 1;
          }
          
          @keyframes pulse-animation {
            0% { transform: scale(0.5); opacity: 0.8; }
            100% { transform: scale(3); opacity: 0; }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Send console logs back to React Native for debugging
          function log(msg) {
             window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', msg: msg}));
          }

          log("HTML: Initializing map at " + ${location?.latitude} + ", " + ${location?.longitude});

          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${location?.latitude || 0}, ${location?.longitude || 0}], 15);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);

          var modernIcon = L.divIcon({
            className: 'user-location-icon',
            html: '<div class="pulse"></div><div class="target-dot"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          var userMarker = L.marker([${location?.latitude || 0}, ${location?.longitude || 0}], {
            icon: modernIcon
          }).addTo(map);

          window.addEventListener('message', function(event) {
            var data = JSON.parse(event.data);
            log("HTML: Received message " + data.type);
            if (data.type === 'UPDATE_LOCATION') {
              map.setView([data.lat, data.lng], 15);
              userMarker.setLatLng([data.lat, data.lng]);
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
        <TouchableOpacity 
          onPress={() => navigation.navigate('Profile')}
          style={styles.avatarContainer}
        >
          {user?.photoURL ? (
            <Avatar.Image
              size={36}
              source={{ uri: user.photoURL }}
              style={{ backgroundColor: theme.colors.surfaceVariant }}
            />
          ) : (
            <Avatar.Text 
              size={36} 
              label={getInitials()} 
              style={{ backgroundColor: theme.colors.primary }}
              color={theme.colors.onPrimary}
            />
          )}
          <View style={styles.onlineIndicator} />
        </TouchableOpacity>
      </Appbar.Header>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
            <Text style={{ marginTop: 10 }}>Finding your location...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centerBox}>
             <Text variant="titleMedium" style={{ color: theme.colors.error, textAlign: 'center', padding: 20 }}>{errorMsg}</Text>
             <FAB icon="refresh" style={{ marginTop: 20 }} onPress={() => setLoading(true)} label="Retry" />
          </View>
        ) : location ? (
          <>
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: mapHtml }}
              style={styles.map}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={(event) => {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'LOG') {
                  console.log("Leaflet Log:", data.msg);
                }
              }}
            />
            <FAB
              icon="crosshairs-gps"
              style={[styles.fab, { backgroundColor: theme.colors.primary }]}
              color={theme.colors.onPrimary}
              onPress={recenterMap}
              loading={isRecentering}
            />
          </>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
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
    backgroundColor: '#4CAF50', // Vibrant Green
    borderWidth: 2,
    borderColor: 'white',
  }
});

export default MapScreen;
