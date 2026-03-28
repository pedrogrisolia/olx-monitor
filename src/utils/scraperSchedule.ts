const EXTRACTION_START_HOUR = 5;
const EXTRACTION_END_HOUR_EXCLUSIVE = 24;

const shouldRunScraperNow = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  return hour >= EXTRACTION_START_HOUR && hour < EXTRACTION_END_HOUR_EXCLUSIVE;
};

export { shouldRunScraperNow };
