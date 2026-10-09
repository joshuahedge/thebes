// Workers fill workplaces level by level, in this order (spec 4.8).
export const PRIORITY_LEVELS = ['essential', 'safety', 'services', 'industry', 'monuments'];
export const MIN_STAFF_RATIO = 0.25; // below this a workplace stops
