export const DEFAULT_EVENT_DURATION_MINUTES = 60;

export const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

export const createDefaultSchedule = () => {
  const start = new Date();
  start.setSeconds(0, 0);
  return {
    start,
    end: addMinutes(start, DEFAULT_EVENT_DURATION_MINUTES),
  };
};

export const updateDatePart = (baseDate, selectedDate) => {
  const nextDate = new Date(baseDate);
  nextDate.setFullYear(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
  );
  return nextDate;
};

export const updateTimePart = (baseDate, selectedTime) => {
  const nextDate = new Date(baseDate);
  nextDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
  return nextDate;
};

export const getDurationMinutes = (startDate, endDate) =>
  Math.round((endDate.getTime() - startDate.getTime()) / 60000);

export const formatDuration = minutes => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

const formatCoordinateFallback = (latitude, longitude) =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

export const formatAddressFromParts = (parts, latitude, longitude) => {
  if (!parts) {
    return formatCoordinateFallback(latitude, longitude);
  }

  const candidates = [
    parts.name,
    parts.street,
    parts.district,
    parts.city,
    parts.subregion,
    parts.region,
    parts.country,
  ].filter(Boolean);

  if (candidates.length === 0) {
    return formatCoordinateFallback(latitude, longitude);
  }

  return [...new Set(candidates)].join(', ');
};

export const getScheduleFromEvent = event => {
  if (!event) {
    return createDefaultSchedule();
  }

  const start = new Date(event.startDate || event.date || new Date());
  start.setSeconds(0, 0);

  let end;
  if (event.endDate) {
    end = new Date(event.endDate);
  } else if (typeof event.durationMinutes === 'number') {
    end = addMinutes(start, event.durationMinutes);
  } else {
    end = addMinutes(start, DEFAULT_EVENT_DURATION_MINUTES);
  }

  return { start, end };
};
