import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

const MapScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Map</Text>
      <Text>Where the magic happens...</Text>
      <Button 
        title="Log Out (Temp)" 
        onPress={() => navigation.navigate('Login')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default MapScreen;
