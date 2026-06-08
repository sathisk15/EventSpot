import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, radius } from '../../config/theme';

const ProfileHeader = ({ user, uploadingImage, onPressAvatar, getInitials }) => {
  const theme = useTheme();

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.colors.surface }]}>
      <LinearGradient
        colors={['#6A3FF5', '#E84DBB', '#1F8FFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.circle1} />
        <View style={styles.circle2} />
      </LinearGradient>

      <View style={styles.body}>
        <TouchableOpacity
          onPress={onPressAvatar}
          disabled={uploadingImage}
          style={styles.avatarWrapper}
        >
          {user?.photoURL ? (
            <Avatar.Image
              size={88}
              source={{ uri: user.photoURL }}
              style={styles.avatarBorder}
            />
          ) : (
            <Avatar.Text
              size={88}
              label={getInitials()}
              style={[styles.avatarBorder, { backgroundColor: theme.colors.primary }]}
              color={theme.colors.onPrimary}
            />
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>
              {uploadingImage ? '…' : 'EDIT'}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={[styles.displayName, { color: '#1A1D29' }]}>
          {user?.displayName || 'EventSpot User'}
        </Text>
        <Text style={[styles.email, { color: theme.colors.onSurfaceVariant }]}>
          {user?.email}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#6A3FF5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  banner: {
    height: 88,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -50,
    right: -20,
  },
  circle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -20,
    left: 30,
  },
  body: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  avatarWrapper: {
    marginTop: -44,
    position: 'relative',
  },
  avatarBorder: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  editBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default ProfileHeader;
