import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Portal, useTheme } from 'react-native-paper';
import { theme as appTheme, spacing, radius, elevation } from '../../config/theme';

const MapActionControls = ({
  onZoomIn,
  onZoomOut,
  onMyEvents,
  onAddEvent,
  onRecenter,
  isRecentering,
}) => {
  const theme = useTheme();

  return (
    <Portal>
      <View style={styles.mapControls}>
        <TouchableOpacity
          testID="zoom-in-button"
          style={[styles.mapControlButton, { backgroundColor: theme.colors.surface }]}
          onPress={onZoomIn}>
          <Text style={styles.mapControlText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="zoom-out-button"
          style={[styles.mapControlButton, { backgroundColor: theme.colors.surface }]}
          onPress={onZoomOut}>
          <Text style={styles.mapControlText}>-</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionDock}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
          onPress={onMyEvents}>
          <Text style={styles.actionLabel}>My Events</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryActionButton, { backgroundColor: theme.colors.primary }]}
          onPress={onAddEvent}>
          <Text style={[styles.actionLabel, { color: theme.colors.onPrimary || '#FFFFFF' }]}>
            Add Event
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
          onPress={onRecenter}>
          <Text style={styles.actionLabel}>
            {isRecentering ? 'Recentering...' : 'Recenter'}
          </Text>
        </TouchableOpacity>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  mapControls: {
    position: 'absolute',
    right: spacing.md,
    bottom: 110,
    alignItems: 'center',
  },
  mapControlButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    elevation: elevation.high,
  },
  mapControlText: {
    fontSize: 24,
    fontWeight: '700',
    color: appTheme.colors.mapDark,
    lineHeight: 26,
  },
  actionDock: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    elevation: elevation.high,
  },
  actionButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginHorizontal: spacing.xs,
  },
  primaryActionButton: {
    flex: 1.15,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: appTheme.colors.mapDark,
  },
});

export default MapActionControls;
