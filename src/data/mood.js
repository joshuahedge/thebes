export const MOOD = {
  base: 60,
  fedWeight: 20,               // mood swing from 0% to 100% of food-needing residents fed: -20..+20
  unemploymentThreshold: 0.15,
  unemploymentWeight: 100,     // mood lost per 1.0 of unemployment above the threshold (from Town only)
  debtPerPoint: 25,            // gold of debt per mood point lost
  debtMax: 20,                 // most mood debt can cost
  arrivalsMin: 30,             // no arrivals below this mood
  departuresBelow: 30,         // people leave below this mood
  departureShare: 0.02,        // share of population leaving per month when mood is low
  arrivalBase: 30,             // spec 4.9 says 6 + 0.05×pop; raised so a new village fills in minutes, not hours
  arrivalPerPop: 0.08,
  arrivalMoodDivisor: 60,
  arrivalBatchesPerMonth: 3,   // arrivals are processed every 10 days
};

// The danger terms (spec 4.9), each its own row in the summary's mood breakdown. Fire's (src/sim/fire.js fireMood):
// a building reached the fire stage last month (a blaze put out in time does not count); each building burned down,
// houses included, in the last burnedDays. Raids' (src/sim/raids.js raidMood): for raidDays after a raid ends, by its
// outcome; a raid cancelled by tribute never happened. The festival's (src/sim/festival.js festivalMood): its bonus is
// FESTIVAL.mood for FESTIVAL.days (src/data/raids.js).
export const DANGER_MOOD = {
  fireLastMonth: -4,
  burnedEach: -2,
  burnedMax: -10,
  burnedDays: 180,
  raidBeaten: -3,
  raidLost: -8,
  raidDays: 180,
};
