import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Card, Searchbar, List, Chip, useTheme } from 'react-native-paper';
import { EVENT_CATEGORIES } from '../../constants/eventCategories';
import { theme as appTheme, spacing, radius, elevation } from '../../config/theme';
import { ALL_EVENT_CATEGORIES } from '../../utils/eventFilters';

const MapSearchControls = ({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onClearSearch,
  searchLoading,
  showResults,
  searchResults,
  onSelectResult,
  showFilters,
  onToggleFilters,
  eventFilterQuery,
  onEventFilterQueryChange,
  eventFilterCategory,
  onEventFilterCategoryChange,
  filteredEventsCount,
  hasActiveFilters,
  onClearAll,
}) => {
  const theme = useTheme();

  return (
    <Card style={styles.controlsCard}>
      <Text style={styles.controlsLabel}>Find a place</Text>
      <Searchbar
        placeholder="Search location..."
        onChangeText={onSearchQueryChange}
        value={searchQuery}
        onSubmitEditing={() => onSearch(searchQuery)}
        onClearIconPress={onClearSearch}
        loading={searchLoading}
        style={styles.searchBar}
      />
      <View style={styles.controlsRow}>
        <View style={styles.controlsActions}>
          <TouchableOpacity
            testID="toggle-filters"
            onPress={onToggleFilters}
            style={[
              styles.controlButton,
              {
                backgroundColor: showFilters
                  ? theme.colors.primary
                  : theme.colors.surfaceVariant || '#EFF3F7',
              },
            ]}>
            <Text
              style={[
                styles.controlButtonText,
                {
                  color: showFilters
                    ? theme.colors.onPrimary || '#FFFFFF'
                    : theme.colors.onSurface || '#0F172A',
                },
              ]}>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Text>
          </TouchableOpacity>
          {hasActiveFilters ? (
            <TouchableOpacity
              testID="clear-search-filters"
              onPress={onClearAll}
              style={[
                styles.secondaryControlButton,
                { borderColor: theme.colors.outlineVariant || '#D5DEE8' },
              ]}>
              <Text
                style={[
                  styles.secondaryControlButtonText,
                  { color: theme.colors.onSurface || '#0F172A' },
                ]}>
                Clear All
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryPillText}>
            {filteredEventsCount}{' '}
            {filteredEventsCount === 1 ? 'event' : 'events'}
          </Text>
        </View>
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

      {showFilters && (
        <Card style={styles.filterCard}>
          <Text style={styles.controlsLabel}>Filter events</Text>
          <Searchbar
            placeholder="Filter events by name, address, or category..."
            onChangeText={onEventFilterQueryChange}
            value={eventFilterQuery}
            onClearIconPress={() => onEventFilterQueryChange('')}
            style={styles.filterSearchBar}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}>
            {[ALL_EVENT_CATEGORIES, ...EVENT_CATEGORIES].map(category => {
              const selected = eventFilterCategory === category;
              return (
                <Chip
                  key={category}
                  selected={selected}
                  onPress={() => onEventFilterCategoryChange(category)}
                  style={[
                    styles.filterChip,
                    selected && {
                      backgroundColor: theme.colors.primaryContainer || '#DCEBFF',
                    },
                  ]}
                  textStyle={
                    selected
                      ? { color: theme.colors.onPrimaryContainer || theme.colors.primary }
                      : undefined
                  }>
                  {category}
                </Chip>
              );
            })}
          </ScrollView>
        </Card>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  controlsCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    elevation: 6,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  controlsLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.6,
    marginBottom: spacing.sm,
  },
  searchBar: { elevation: elevation.none },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  controlsActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  controlButton: {
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  controlButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryControlButton: {
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    marginLeft: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  secondaryControlButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryPill: {
    marginLeft: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: appTheme.colors.mapControlBg,
    minWidth: 82,
    alignItems: 'center',
  },
  summaryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: appTheme.colors.mapControlText,
  },
  resultsCard: {
    marginTop: spacing.sm,
    maxHeight: 250,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  filterCard: {
    marginTop: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 14,
    elevation: elevation.none,
    borderRadius: radius.lg,
    backgroundColor: appTheme.colors.mapControlBg,
  },
  filterSearchBar: { elevation: elevation.none },
  filterChips: {
    paddingTop: spacing.sm,
    paddingRight: spacing.sm,
  },
  filterChip: { marginRight: spacing.sm },
});

export default MapSearchControls;
