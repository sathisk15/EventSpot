import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Appbar, useTheme } from 'react-native-paper';
import { AuthContext } from '../contexts/AuthContext';

const MapScreen = () => {
  const { logout } = useContext(AuthContext);
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content title="EventSpot" titleStyle={{ fontWeight: 'bold', color: theme.colors.primary }} />
        <Appbar.Action icon="logout" onPress={logout} color={theme.colors.error} />
      </Appbar.Header>

      <View style={styles.content}>
        <Text variant="titleLarge" style={styles.title}>Event Map</Text>
        <Text variant="bodyMedium">Where the magic happens...</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 10,
  },
});

export default MapScreen;
