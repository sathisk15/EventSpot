import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Chip, Text, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDuration } from '../../utils/eventScheduleUtils';
import { spacing } from '../../config/theme';

const SchedulePicker = ({
  startDate,
  endDate,
  activePicker,
  onSetActivePicker,
  onPickerChange,
  durationMinutes,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.dateTimeSection}>
      <Text variant="labelLarge" style={styles.sectionTitle}>Schedule</Text>

      <View style={styles.dateTimeContainer}>
        <View style={styles.dateTimeItem}>
          <Text variant="labelMedium">Starts On</Text>
          <Button
            mode="outlined"
            onPress={() => onSetActivePicker('startDate')}
            icon="calendar"
            style={styles.dateTimeButton}
          >
            {startDate.toLocaleDateString()}
          </Button>
        </View>
        <View style={styles.dateTimeItem}>
          <Text variant="labelMedium">Start Time</Text>
          <Button
            mode="outlined"
            onPress={() => onSetActivePicker('startTime')}
            icon="clock-start"
            style={styles.dateTimeButton}
          >
            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Button>
        </View>
      </View>

      <View style={styles.dateTimeContainer}>
        <View style={styles.dateTimeItem}>
          <Text variant="labelMedium">Ends On</Text>
          <Button
            mode="outlined"
            onPress={() => onSetActivePicker('endDate')}
            icon="calendar-end"
            style={styles.dateTimeButton}
          >
            {endDate.toLocaleDateString()}
          </Button>
        </View>
        <View style={styles.dateTimeItem}>
          <Text variant="labelMedium">End Time</Text>
          <Button
            mode="outlined"
            onPress={() => onSetActivePicker('endTime')}
            icon="clock-end"
            style={styles.dateTimeButton}
          >
            {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Button>
        </View>
      </View>

      <View style={styles.durationRow}>
        <Chip icon="timer-sand" style={{ backgroundColor: theme.colors.secondaryContainer }}>
          Duration: {formatDuration(durationMinutes)}
        </Chip>
      </View>

      {activePicker && (
        <DateTimePicker
          value={activePicker.startsWith('start') ? startDate : endDate}
          mode={activePicker.endsWith('Date') ? 'date' : 'time'}
          is24Hour={true}
          display="default"
          onChange={onPickerChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dateTimeSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateTimeItem: {
    flex: 0.48,
  },
  dateTimeButton: {
    marginTop: spacing.xs,
  },
  durationRow: {
    marginBottom: 12,
  },
});

export default SchedulePicker;
