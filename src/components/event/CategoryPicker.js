import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Text, useTheme } from 'react-native-paper';
import { EVENT_CATEGORIES } from '../../constants/eventCategories';
import { spacing } from '../../config/theme';

const CategoryPicker = ({ category, onCategoryChange }) => {
  const theme = useTheme();

  return (
    <View style={styles.categorySection}>
      <Text variant="labelLarge" style={styles.sectionTitle}>Category</Text>
      <View style={styles.categoryRow}>
        {EVENT_CATEGORIES.map(option => {
          const selected = category === option;
          return (
            <Chip
              key={option}
              selected={selected}
              showSelectedCheck={selected}
              onPress={() => onCategoryChange(option)}
              style={[
                styles.categoryChip,
                selected ? { backgroundColor: theme.colors.primaryContainer } : null,
              ]}
            >
              {option}
            </Chip>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  categorySection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    marginBottom: spacing.sm,
  },
});

export default CategoryPicker;
