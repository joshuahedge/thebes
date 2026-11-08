// Workers fill workplaces level by level, in this order (spec 4.8).
export const PRIORITY_LEVELS = ['essential', 'safety', 'services', 'industry', 'monuments'];
// Version 9.2 (Track L, ruling 1758, design 2.6): until the city is a Town, services rank ahead of safety: fire starts only at Town (src/data/fire.js), so a firehouse in a
// Village took the workers a bazaar and a temple needed for a danger that cannot start. From Town the order above is the order (every kind of danger is live).
export const PRIORITY_LEVELS_BEFORE_TOWN = ['essential', 'services', 'safety', 'industry', 'monuments'];
export const MIN_STAFF_RATIO = 0.25; // below this a workplace stops
