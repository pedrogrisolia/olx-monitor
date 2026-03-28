const EXTRACTION_START_HOUR = 5;
const EXTRACTION_END_HOUR_EXCLUSIVE = 24;
const EXTRACTION_END_HOUR_INCLUSIVE = EXTRACTION_END_HOUR_EXCLUSIVE - 1;
const EXTRACTION_HOURS_RANGE = `${EXTRACTION_START_HOUR}-${EXTRACTION_END_HOUR_INCLUSIVE}`;
const EXTRACTION_WINDOW_LABEL = `${String(EXTRACTION_START_HOUR).padStart(2, "0")}:00-${String(EXTRACTION_END_HOUR_INCLUSIVE).padStart(2, "0")}:59`;

const shouldRunScraperNow = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  return hour >= EXTRACTION_START_HOUR && hour < EXTRACTION_END_HOUR_EXCLUSIVE;
};

const isFiveFieldCronExpression = (interval: string): boolean => {
  const parts = interval.trim().split(/\s+/);
  return parts.length === 5;
};

const applyExtractionWindowToCron = (interval: string): string => {
  if (!isFiveFieldCronExpression(interval)) {
    return interval;
  }

  const parts = interval.trim().split(/\s+/);
  const [minute, _hour, dayOfMonth, month, dayOfWeek] = parts;
  return `${minute} ${EXTRACTION_HOURS_RANGE} ${dayOfMonth} ${month} ${dayOfWeek}`;
};

export {
  shouldRunScraperNow,
  applyExtractionWindowToCron,
  EXTRACTION_WINDOW_LABEL,
  isFiveFieldCronExpression,
};
