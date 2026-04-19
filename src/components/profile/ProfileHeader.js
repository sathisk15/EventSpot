import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';
import { spacing, radius } from '../../config/theme';

const ProfileHeader = ({ user, uploadingImage, onPressAvatar, getInitials }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.headerSection,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPressAvatar}
        disabled={uploadingImage}
        style={styles.avatarWrapper}
      >
        {user?.photoURL ? (
          <Avatar.Image
            size={80}
            source={{ uri: user.photoURL }}
            style={{ backgroundColor: theme.colors.surfaceVariant }}
          />
        ) : (
          <Avatar.Text
            size={80}
            label={getInitials()}
            style={{ backgroundColor: theme.colors.primary }}
            color={theme.colors.onPrimary}
          />
        )}
        <View style={styles.editBadge}>
          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
            {uploadingImage ? '...' : 'EDIT'}
          </Text>
        </View>
      </TouchableOpacity>
      <Text
        variant="headlineSmall"
        style={{ color: theme.colors.primary, fontWeight: 'bold', marginTop: 12 }}
      >
        {user?.displayName || 'EventSpot User'}
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
        {user?.email}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  avatarWrapper: {
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00000099',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'white',
  },
});

export default ProfileHeader;
