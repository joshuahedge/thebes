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
