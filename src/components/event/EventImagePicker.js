import React from 'react';
import { View, Image, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { spacing, radius } from '../../config/theme';

const EventImagePicker = ({ images, onAddImages, onRemoveImage }) => {
  const theme = useTheme();

  const openPhotoLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to choose event images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      onAddImages(result.assets);
    }
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take event photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled) {
      onAddImages(result.assets);
    }
  };

  const handlePickImage = () => {
    Alert.alert('Add Image', 'Choose image source', [
      { text: 'Camera', onPress: openCamera },
      { text: 'Photos', onPress: openPhotoLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <>
      <Text variant="labelLarge" style={styles.sectionTitle}>Photos</Text>
      <ScrollView horizontal style={styles.imageScroll}>
        {images.map((img, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri: img.uri }} style={styles.imagePreview} />
            <IconButton
              icon="close-circle"
              size={20}
              color="red"
              style={styles.removeIcon}
              onPress={() => onRemoveImage(index)}
            />
          </View>
        ))}
        <TouchableOpacity
          style={[styles.addImage, { borderColor: theme.colors.primary }]}
          onPress={handlePickImage}
        >
          <IconButton icon="camera-plus" color={theme.colors.primary} size={30} />
          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Add</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  imageScroll: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: radius.sm,
  },
  removeIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  addImage: {
    width: 100,
    height: 100,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EventImagePicker;
