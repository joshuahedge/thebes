// Map generation tunables: the river, the terrain bands, the rock patches and the trade road.
export const MAP = {
  size: 64,
  riverBaseX: 7, riverWave1: { amp: 2.5, period: 9 }, riverWave2: { amp: 1.5, period: 4.3 },
  waterHalfWidth: 1.6, bankHalfWidth: 2.6,
  fertileBase: 7, fertileNoise: 5, fertileNoiseScale: 6,
  meadowNoiseScale: 9, meadowThreshold: 0.72,
  rockPatches: { min: 2, extra: 2, minX: 34, marginX: 40, minY: 6, marginY: 12, radiusMin: 3, radiusExtra: 2, edgeNoiseScale: 3, edgeNoise: 4 },
  // Clay (Stage 4.5, ruling 312): stretches of 4-10 bank tiles (some a second tile deep) turn to clay until a map holds its
  // target, 40-66 tiles; a stretch adds at most 20, so a map ends with at most 85. salt keys the draws apart from the generator's.
  clay: { targetMin: 40, targetExtra: 26, stretchMin: 4, stretchExtra: 7, deepChance: 0.45, maxTries: 400, salt: 0x51A7C1A9 },
  bridgeMax: 4,         // the most tiles of water one bridge may cross, in a straight line (ruling 314)
  variantSalt: 0x0A1E,
  // The rock of a variant (every one but classic, which keeps its own patches): round patches of radius 3 until the map holds
  // rockTarget rocky tiles (so 90-130), none with its centre within rockAwayTiles of water or rockAwayStart of the start area.
  clearStartRows: 16,   // rows from the south edge a clearStart river's swing is measured over
  rockTarget: 90, rockTries: 120, rockAwayTiles: 8, rockAwayStart: 11,
  // The six river layouts (ruling 313). mirror: the classic river flipped to the east side; clearStart: the trade road keeps clear of the river's farthest swing; riverBaseX / wave1 / wave2: where
  // and how it meanders; island: the river splits round an island of 4-8 rows (a main channel mainBank tiles wide, a side channel
  // sideBank, the water easing in and out over `ease` rows); lake: an oasis (centre, radius, wobble, a fertile ring, clay tiles on
  // its bank); rocks.ranges: the x ranges rock patches sit in; entries: where the raiders come in (default: the middle of the east
  // and the north edges), as { edge: 'east' | 'west' | 'north', at }.
  variants: {
    classic: {},
    east: { mirror: true, rocks: { ranges: [[6, 29]] }, entries: () => [{ edge: 'west', at: 32 }, { edge: 'north', at: 31 }] },
    middle: { riverBaseX: 32, rocks: { ranges: [[6, 20], [44, 58]] }, entries: () => [{ edge: 'east', at: 32 }, { edge: 'north', at: 48 }] },
    'wide-bends': { clearStart: true, riverBaseX: 12, wave1: { amp: 5.5, period: 11 }, wave2: { amp: 2, period: 4.3 }, rocks: { ranges: [[34, 58]] } },
    island: {
      riverBaseX: 11, rocks: { ranges: [[34, 58]] },
      island: { minY: 20, spanY: 18, halfMin: 2, halfExtra: 1.9, lxMin: 1.5, lxExtra: 0.6, ease: 3, mainBank: 3, sideBank: 2, core: 0.6 },
    },
    oasis: {
      rocks: { ranges: [[34, 58]] },
      lake: { minX: 40, spanX: 10, minY: 14, spanY: 22, rMin: 2.8, rExtra: 0.8, wobble: 1.4, fertileRing: 2, clay: 9 },
    },
  },
  tradeRoadOffsetX: 14, startRoadLength: 9, focusOffset: { x: -4, y: -12 },
};

// The six river layouts (Stage 4.5, ruling 313). A new city's UI passes 'auto' and the seed picks one; everything else
// (tests, the dev scenes, the sample, stress and title cities) asks for 'classic'.
export const MAP_VARIANTS = ['classic', 'east', 'middle', 'wide-bends', 'island', 'oasis'];

// ── s46 map (Stage 4.6, Map track) ── map sizes, the shape choices' salts and the Map track's lists. Track 0 put the sizes here;
// the Map track owns this file.
// Map sizes (ruling 333): tiles a side. Normal is the default, the weekly seed's, and every city's from before Stage 4.6 (world.mapSize
// 64); the title, sample and stress cities and the test fixtures stay Normal. createWorld takes any of them (and, for tests, any size
// with a map passed in).
export const MAP_SIZES = { small: 48, normal: 64, large: 80 };
export const MAP_SIZE_IDS = Object.keys(MAP_SIZES);
export const DEFAULT_MAP_SIZE = MAP_SIZES.normal;
export const isMapSize = (n) => Object.values(MAP_SIZES).includes(n);
// Salts for the generator's seeded shape choices (ruling 332): hash2(seed, k, MAP_SALT.x) or createRng((seed ^ MAP_SALT.x) >>> 0), as
// MAP.clay.salt is used. Never draw a shape choice from the generator's own rng stream: classic at 64 must keep its fingerprints.
// Registered by Track 0 (unique across the game: tests/stage46/contract/salts.test.js).
export const MAP_SALT = {
  meander: 4601, channels: 4602, oxbow: 4603, outcrops: 4604, dunes: 4605, groves: 4606, wadis: 4607, clayWide: 4608,
  shapePick: 4609, spare1: 4610, spare2: 4611,
};
// The Map track's rows in the Stage 4.6 lists (src/data/s46.js joins every track's): tallies, firsts, achievements, tips.
export const MAP_TALLY = [];
export const MAP_FIRSTS = [];
export const MAP_ACHIEVEMENTS = [];
export const MAP_TIPS = [];
// ── end s46 map ──
