// Version 8.4 "Gold and war" (wave 0): the lists the shared code reads, kept here so the tracks never fight over src/sim/world.js or src/save/*.
// This file is a leaf: it imports nothing.

// The tallies world version 11 adds (design section 5); new and migrated cities start every one at 0. Track G counts the tax months, the
// courses rushed and their gold, and the luxuries bought; Track E the elephants and ivory; Track R the gold the captured weapons saved.
export const V84_TALLY = [
  'taxLowMonths', 'taxHighMonths', 'coursesRushed', 'rushGold', 'luxuryBought',
  'elephantsMet', 'elephantsFelled', 'elephantsStampeded', 'ivoryTaken', 'spoilsGold',
];

// A city made before 8.4 has its Villas and Estates wait this many days from the load day before a missing luxury counts against them
// (design Q5, ruling 1460): world.luxuryFrom is the day the need starts to count, 0 for a city begun in 8.4.
export const LUXURY_GRACE_DAYS = 360;
