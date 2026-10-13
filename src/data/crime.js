// Crime and unrest (Stage 4.5, ruling 319), all tunable. Each home with people in it adds crime risk points every day for each
// thing that is true: its tier is low (Hut to House), the city's mood is below MOOD_BELOW, unemployment is above
// UNEMPLOYED_ABOVE; times the difficulty's risk multiplier, times the police post's cut. At the threshold a seeded draw
// (THEFT_CHANCE a day) causes a theft. Every draw is stateless: hash2(home id, day, seed + a SALT).
export const CRIME = {
  startsAt: 'market_town',   // risk builds up only once the city is a Market town (the police post comes with it)
  threshold: 100,            // risk at which a home can cause a theft
  lowTier: 0.05,             // a day: the home's tier is 1 to LOW_TIER_MAX
  lowTierMax: 4,             // Hut, Shack, Cottage, House
  lowMood: 0.3,              // a day: city mood below MOOD_BELOW
  moodBelow: 45,
  jobless: 0.2,              // a day: more than UNEMPLOYED_ABOVE of the workforce has no job
  unemployedAbove: 0.1,
  theftChance: 0.02,         // a day, once at the threshold
  cut: 0.8,                  // a fully staffed police post cuts build-up by 80% (scaled by coverage)
  staffedAt: 0.5,            // coverage that counts as covered (the sheet's and the alerts' word)
  goldShare: 0.02,           // a theft from the treasury skims this much of it ...
  goldRange: [5, 100],       // ... but at least 5 and at most 100 gold (and never more than the treasury holds)
  goodsRange: [5, 20],       // a theft from a store takes this many units of one good (at most what is there)
  districtTiles: 12,         // an alert covers the homes at risk inside one square of this many tiles
  reach: 8,                  // the police post's road reach (BUILDINGS.police_post.reach; a data test keeps them equal)
};

export const CRIME_SALT = { theft: 7301, kind: 7302, amount: 7303, good: 7304 };

// The Crime overlay's bands: Low 0-24, Rising 25-59, High 60-99, Can cause a theft 100+.
export const CRIME_BANDS = [0, 25, 60, 100];
export const CRIME_BAND_IDS = ['low', 'rising', 'high', 'theft'];

// The mood row: each theft in the last DAYS days, at most MAX in all.
export const CRIME_MOOD = { each: -1, max: -5, days: 90 };
