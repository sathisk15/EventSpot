import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GradientButton = ({ onPress, children, style, loading, disabled, icon }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
    style={[styles.wrapper, style]}
  >
    <LinearGradient
      colors={disabled ? ['#C4C4C4', '#A0A0A0'] : ['#6A3FF5', '#E84DBB', '#1F8FFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={styles.label}>{children}</Text>
        </View>
      )}
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#6A3FF5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    marginRight: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default GradientButton;
