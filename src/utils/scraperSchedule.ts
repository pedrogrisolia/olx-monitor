const EXTRACTION_START_HOUR = 5;
const EXTRACTION_END_HOUR_EXCLUSIVE = 24;
const EXTRACTION_HOURS_RANGE = "5-23";

const shouldRunScraperNow = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  return hour >= EXTRACTION_START_HOUR && hour < EXTRACTION_END_HOUR_EXCLUSIVE;
};

const applyExtractionWindowToCron = (interval: string): string => {
  const parts = interval.trim().split(/\s+/);
  if (parts.length !== 5) {
    return interval;
  }

  const [minute, , dayOfMonth, month, dayOfWeek] = parts;
  return `${minute} ${EXTRACTION_HOURS_RANGE} ${dayOfMonth} ${month} ${dayOfWeek}`;
};

export { shouldRunScraperNow, applyExtractionWindowToCron };
