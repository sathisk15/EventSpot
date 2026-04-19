export const ALL_EVENT_CATEGORIES = 'All';

const normalizeFilterValue = value => value?.trim().toLowerCase() || '';

export const filterEvents = (eventList, query, category) => {
  const normalizedQuery = normalizeFilterValue(query);

  return eventList.filter(event => {
    const matchesCategory =
      !category ||
      category === ALL_EVENT_CATEGORIES ||
      event.category === category;

    if (!matchesCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      event.name,
      event.location?.address,
      event.category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
};
