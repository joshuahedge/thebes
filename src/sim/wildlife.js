// Wildlife, hunting and fishing (Stage 4.6, River track, ruling 335). Track 0 wrote the stubs every other file calls; the River track
// owns this file and fills them in. Herds are sim entities (world.wildlife, src/data/river.js newWildlifeState); birds, fish, hippos
// and crocodiles are render-only (src/render/wildlife.js), apart from crocodile spots, which are derived here from the seed and the
// terrain and never saved. Draws: hash2(a, b, (world.seed + RIVER_SALT.x) | 0).

// STUB (River): one day of the herds (wandering away from buildings, the hunters' trips, a crocodile scare).
export function wildlifeDay(world, events = null) {}

// STUB (River): the month's herd work (regrowth, a herd wandering in once a year).
export function wildlifeMonth(world, events = null) {}

// STUB (River): the alerts wildlife raises (none expected; a scare is a caption).
export const wildlifeAlerts = (world) => [];

// STUB (River, for the Court track's Lost herd card): a herd wanders in from a map edge, or the nearest herd wanders off. Each returns
// the herd ({ id, kind, x, y, size }) or null when none can (no room, no herd). Until the River track fills them in, null.
export const herdArrives = (world, events = null) => null;
export const herdLeaves = (world, events = null) => null;

// STUB (River): the crocodile spots, [[x, y], ...] water tiles, derived from the seed and the terrain (RIVER_SALT.crocSpot).
export const crocSpots = (world) => [];
