import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Searchbar, IconButton, Chip, Card, List, useTheme } from 'react-native-paper';
import { elevation, spacing } from '../../config/theme';

const LocationSearchInput = ({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onClearSearch,
  searchLoading,
  showResults,
  searchResults,
  onSelectResult,
  onUseCurrentLocation,
  currentLocationLoading,
  localLocation,
}) => {
  const theme = useTheme();

  return (
    <View>
      <View style={styles.locationInputRow}>
        <Searchbar
          placeholder="Search location..."
          onChangeText={onSearchQueryChange}
          value={searchQuery}
          onSubmitEditing={() => onSearch(searchQuery)}
          onClearIconPress={onClearSearch}
          loading={searchLoading}
          style={[styles.searchBar, styles.searchBarInput]}
        />
        <IconButton
          icon="crosshairs-gps"
          mode="contained-tonal"
          size={24}
          disabled={currentLocationLoading}
          onPress={onUseCurrentLocation}
          accessibilityLabel="Use current location"
        />
      </View>
      {showResults && searchResults.length > 0 && (
        <Card style={styles.resultsCard}>
          <List.Section>
            {searchResults.map((item, index) => (
              <List.Item
                key={index}
                title={item.display_name}
                onPress={() => onSelectResult(item)}
                left={props => <List.Icon {...props} icon="map-marker" />}
              />
            ))}
          </List.Section>
        </Card>
      )}
      {!showResults && localLocation && (
        <View style={styles.selectedLocationBox}>
          <Chip icon="check-circle" style={{ backgroundColor: theme.colors.primaryContainer }}>
            {localLocation.address}
          </Chip>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    elevation: elevation.low,
  },
  searchBarInput: {
    flex: 1,
  },
  resultsCard: {
    marginTop: spacing.xs,
    maxHeight: 200,
    elevation: elevation.mid,
    zIndex: 1000,
  },
  selectedLocationBox: {
    marginTop: 12,
    flexDirection: 'row',
  },
});

export default LocationSearchInput;
