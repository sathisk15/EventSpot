import * as Location from 'expo-location';

const formatCoordinateFallback = (latitude, longitude) =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

export const resolveAddress = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      { headers: { 'User-Agent': 'EventSpotApp/1.0' } },
    );
    const data = await response.json();
    return data.display_name || formatCoordinateFallback(latitude, longitude);
  } catch (error) {
    console.error('Reverse geocode failed:', error);
    return formatCoordinateFallback(latitude, longitude);
  }
};

export const buildResolvedLocation = async (latitude, longitude) => ({
  latitude,
  longitude,
  address: await resolveAddress(latitude, longitude),
});

export const getDeviceCoordinates = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Location permission is required to center the map.');
  }

  const enabled = await Location.hasServicesEnabledAsync();
  if (!enabled) {
    throw new Error('Location services are disabled.');
  }

  // Use last known position immediately if available — avoids waiting for a fresh GPS fix
  const lastKnown = await Location.getLastKnownPositionAsync({});
  if (lastKnown?.coords) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
    };
  }

  // No cached position — wait for a fresh fix with a 10s timeout
  const currentLocation = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Location timeout')), 10000),
    ),
  ]).catch(() => null);

  if (!currentLocation?.coords) {
    throw new Error('Unable to determine your current location.');
  }

  return {
    latitude: currentLocation.coords.latitude,
    longitude: currentLocation.coords.longitude,
  };
};
