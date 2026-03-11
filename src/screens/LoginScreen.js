import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

const LoginScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to EventSpot</Text>
      <Button 
        title="Go to Map (Temp)" 
        onPress={() => navigation.navigate('Map')}
      />
      <Button 
        title="Don't have an account? Register" 
        onPress={() => navigation.navigate('Register')}
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

export default LoginScreen;
