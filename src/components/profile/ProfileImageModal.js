import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Avatar, Button, IconButton, Modal, Portal, Text, useTheme } from 'react-native-paper';
import { spacing, radius } from '../../config/theme';

const ProfileImageModal = ({ visible, onDismiss, user, onPickImage, uploadingImage, getInitials }) => {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContent,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View style={styles.modalHeader}>
          <Text variant="titleLarge">Profile Picture</Text>
          <IconButton icon="close" size={24} onPress={onDismiss} />
        </View>

        <View style={styles.modalImageContainer}>
          {user?.photoURL ? (
            <Image
              source={{ uri: user.photoURL }}
              style={styles.fullSizeImage}
              resizeMode="contain"
            />
          ) : (
            <Avatar.Text
              size={200}
              label={getInitials()}
              style={{ backgroundColor: theme.colors.primary }}
              color={theme.colors.onPrimary}
            />
          )}
        </View>

        <Button
          mode="contained"
          icon="camera"
          onPress={onPickImage}
          loading={uploadingImage}
          disabled={uploadingImage}
          style={styles.modalButton}
        >
          {uploadingImage ? 'Uploading...' : 'Upload New Image'}
        </Button>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: radius.md,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  fullSizeImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  modalButton: {
    marginTop: spacing.sm,
  },
});

export default ProfileImageModal;
