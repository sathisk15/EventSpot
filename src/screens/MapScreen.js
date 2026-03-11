import React, { useContext, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { Text, Appbar, useTheme, ActivityIndicator, Avatar } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { AuthContext } from '../contexts/AuthContext';

const MapScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        Alert.alert('Permission Denied', 'EventSpot requires location access to find events near you.');
        setLoading(false);
        return;
      }

      try {
        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch (error) {
        setErrorMsg('Error fetching location');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

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
             <Text variant="titleMedium" style={{ color: theme.colors.error }}>{errorMsg}</Text>
          </View>
        ) : location ? (
          <MapView 
            style={styles.map} 
            initialRegion={location}
            showsUserLocation={true}    // Native user dot
            showsMyLocationButton={true} // Quick recenter button
          >
            {/* We will drop event markers here later. For now, a custom marker for testing the user center. */}
            <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} title="You are here" />
          </MapView>
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
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
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
