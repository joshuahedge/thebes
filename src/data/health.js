// Disease (Stage 4.5, ruling 318), all tunable. Each home with people in it builds health risk points towards THRESHOLD every
// day: BASE, plus a rate for each thing wrong (no well reaches it; the ground around it is poor), times the
// difficulty's risk multiplier (riskOf in src/sim/costs.js), times the physician's cut (1 - CUT x coverage). At the threshold a
// seeded draw (ILLNESS_CHANCE a day) makes it fall ill. Every draw is stateless: hash2(home id, day, seed + a SALT).
export const HEALTH = {
  startsAt: 'town',          // risk builds up only once the city is a Town (the physician comes with it)
  threshold: 100,            // risk at which a home can fall ill
  base: 0.15,                // a day, for every home with people in it
  noWell: 0.5,               // a day more: no working well reaches it
  // Version 9.2 (Track S, ruling 1808): the daily "crowded" term (+0.3 for more than crowdedPerTile residents a tile) is dropped. Measured on the scripted runs it was true
  // for every Townhouse and up (34 of 34, 30 of 30 and 4 of 4 homes at the capital run's end; 38 of 38 at the great-work run's), so it was a flat rate on the grand homes,
  // and a rescale to the tier's capacity would make it true of every full home of every tier: the term told the player nothing. plagueRisk and the plague's room rule keep it.
  poorGround: 0.3,           // a day more: nearby desirability below 0
  crowdedPerTile: 20,        // the plague's own rule (src/sim/plague.js: where it starts, and a home with room): Townhouses and every 2x2 home fill up past this
  illnessChance: 0.02,       // a day, once at the threshold
  cut: 0.8,                  // a fully staffed physician cuts build-up by 80% (scaled by coverage)
  staffedAt: 0.5,            // coverage that counts as covered: spreads no further and a cure twice as fast
  illDays: [20, 40],         // days an illness lasts (seeded when it starts)
  lossShare: 0.25,           // most of a home's people an illness takes (rounded down), one a day
  spreadChance: 0.04,        // a day, to each healthy edge neighbour that is a home, unless the sick home is covered
  coverFactor: 2,            // a covered illness runs out this many times as fast
  reach: 8,                  // the physician's road reach (BUILDINGS.physician.reach; a data test keeps them equal)
};

// Salts for hash2(id, day, world.seed + SALT): one per kind of draw, so no two draws share a stream.
export const HEALTH_SALT = { fall: 7201, length: 7202, spread: 7203 };

// The Health overlay's bands: where each starts. Low 0-24, Rising 25-59, High 60-99, Can fall ill 100+ (as the fire risk's).
export const HEALTH_BANDS = [0, 25, 60, 100];
export const HEALTH_BAND_IDS = ['low', 'rising', 'high', 'ill'];

// The mood row (ruling 318): each ill home, at most MOOD_MAX in all.
export const HEALTH_MOOD = { each: -2, max: -8 };
