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
// Version 7.1 (Track M, ruling 1020): six more, appended (MAP.courses, drawn by src/sim/courses.js); the first six draw exactly as in 7.0.
export const MAP_VARIANTS_70 = ['classic', 'east', 'middle', 'wide-bends', 'island', 'oasis'];
export const MAP_VARIANTS_71 = ['delta', 'confluence', 'twin', 'wide-nile', 'cataract', 'lake-fed'];
// Version 8.2 (Track G, rulings 1300-1305): the Great oasis, appended after the twelve: no river at all, one great lake in the desert
// (src/sim/greatOasis.js draws it). The old 'oasis' (the classic river with a small lake) still draws as in 7.1.1 for every city, link and
// fixture that names it, but the new-city card no longer offers it (MAP_VARIANTS_OFFERED) and 'auto' never picks it (variantFor).
export const MAP_VARIANTS_82 = ['great-oasis'];
export const MAP_VARIANTS = [...MAP_VARIANTS_70, ...MAP_VARIANTS_71, ...MAP_VARIANTS_82];
export const MAP_VARIANTS_OFFERED = MAP_VARIANTS.filter((v) => v !== 'oasis');
for (const v of MAP_VARIANTS_71) MAP.variants[v] = { course: v };
// noRiver: the map has no river (no Quay, no river partner: src/sim/trade.js, src/sim/fit.js; the words say "the great lake": src/ui/v82/oasisText.js).
MAP.variants['great-oasis'] = { course: 'great-oasis', noRiver: true };
export const hasRiver = (variant) => !(MAP.variants[variant] && MAP.variants[variant].noRiver);

// Version 8.2 (Track G, rulings 1301-1304): the Great oasis's tunables. Positions across or down the map are for 64 and scale with the size;
// the lake's radius grows with the square root of the side (so it is about 3 x the 7.0 oasis pond's area at Normal, and stays the map's
// centrepiece on a Huge one); other widths and distances do not scale.
//   share    of the picks 'auto' makes, the share that is the Great oasis (one in nine; the rest split as in 7.1 over the other eleven)
//   r        the lake's mean radius at Normal; aspect: its width over its height; wobble: how far the noise moves its edge (tiles)
//   gap      tiles of land from the lake's south edge to the start area's row (its fertile ring reaches the start area)
//   dx       how far either side of the middle its centre may lie (scaled)
//   inlets   1-2 lobes of water on its edge (radius `inletR`), never on the start's side, so the shore has bays and points
//   springs  2-4 small spring pools of 2-5 tiles, springFrom tiles beyond the lake's edge, each with a bank and a fertile ring; they are
//            listed as oases (world.oases), so a wharf, a Nilometer or a Quay may not use them (ruling 463)
//   edge     tiles every water tile keeps from the map's edge (no boat reaches the lake: no boat raids)
MAP.greatOasis = {
  share: 1 / 9, r: [5.0, 6.2], aspect: [0.8, 1.25], wobble: 1.6, gap: [5, 7], dx: 8,
  inlets: [1, 2], inletR: [1.6, 2.3], springs: [2, 4], springFrom: [5, 10], springTiles: [2, 5], edge: 6,
  clayShare: 0.5,   // of MAP.clay.targetMin (scaled by the area): the clay laid on the lake's and springs' banks (20 tiles at Normal)
};

// Version 7.1 (Track M, rulings 1020-1039): the new layouts' tunables (src/sim/courses.js has the shapes). Positions across or down the map are
// for 64 and scale with the size, as the older layouts' do; widths (hw: a half-width in tiles, so 3 is 6 tiles of water) and distances do not.
//   newShare  of the picks 'auto' makes, the share that is one of the six new layouts (about two in three)
//   axes      which ways the river may run: 'ns' (north-south, on the west or the east side) or 'ew' (east-west, north of the start)
//   amp       the meander's swing; hw: the river's half-width, varying along it between the two
//   roadGap   tiles from a north-south river's water to the trade road (classic's is about 13); ewFromStart: how far north of the start
//             area's centre an east-west river's middle runs; ewRoad: how far either side of the middle the trade road may come in
//   maxWater  the most of the map water may cover (the playability test holds it)
MAP.courses = {
  newShare: 2 / 3, roadGap: 13, focusOff: 4, ewFromStart: 14, ewRoad: 8, maxWater: 0.22, reach: 11.5, step: 0.5,
  delta: { axes: ['ns', 'ew'], v: [12, 16], amp: [1, 2], hw: [1.8, 2.3], fork: [0.42, 0.58], arms: [2, 3], smallArms: 2, mouth: [3, 5], mouthLand: 3, armGap: [8, 11], forkHw: 1.6, sandbars: [1, 2], ewNorth: 0 },   // smallArms: the most a map smaller than Normal holds (its water stays under maxWater)
  // confluence: the fork's point jx either side of the middle and jy north of the start area (both scaled); each arm bends round a point ctl
  // tiles out and down from it and meets its side edge armEnd (scaled) north of the start area; stemSide: the share of stems that leave by
  // the upper west or east edge (stemSideY down it) rather than the north edge
  confluence: { axes: ['ns'], jx: 6, jy: [22, 28], amp: [0.8, 1.6], hw: [2.0, 2.6], armHw: [1.3, 1.8], ctl: [8, 10], armEnd: [4, 10], stemSide: 0.3, stemSideY: [8, 16] },
  // twin: the small river runs `apart` tiles from the main one (north-south) or at v (scaled) from the north edge (east-west)
  twin: { axes: ['ns', 'ew'], nsFrom: 64, v: [12, 15], amp: [1.5, 3], hw: [1.6, 2.2], small: { apart: [34, 40], v: [10, 14], amp: [1, 2], hw: [0.9, 1.2] } },
  'wide-nile': { axes: ['ns', 'ew'], v: [16, 18], amp: [1, 2], hw: [3.0, 3.9], ewNorth: 1 },
  cataract: { axes: ['ns', 'ew'], v: [11, 14], amp: [1.5, 3], hw: [1.6, 2.0], at: [0.2, 0.35], gorge: [10, 14], gorgeHw: 0.8, wall: [2, 1.5], rapids: [12, 16], rapidsHw: [3.0, 3.4], islets: [3, 4], isletGap: 4, ease: 3 },
  'lake-fed': { axes: ['ns', 'ew'], v: [11, 14], amp: [1.5, 3], hw: [1.6, 2.1], lake: { r: [8, 11], ry: [5, 6.5], nsDeep: 0.8, wobble: 1.6, ewNorth: 1 } },   // r: the lake's radius along the river (and across it, north-south); ry: across an east-west one
};

// ── s46 map (Stage 4.6, Map track) ── map sizes, the shape choices' salts and the Map track's lists. Track 0 put the sizes here;
// the Map track owns this file.
// How much bigger or smaller than Normal a map's area is (48 -> 0.5625, 64 -> 1, 80 -> 1.5625): rock, clay, raider entries and herds scale
// with it (ruling 333; the River track asks for it too).
export const areaScale = (size) => (size * size) / (MAP.size * MAP.size);
// The seeded shape choices of a map (ruling 332), drawn by src/sim/mapgen.js in every layout but classic at Normal, which draws exactly
// as it did before Stage 4.6. Ranges are [min, max]; each draw is hash2(seed, k, MAP_SALT.x) or a stream of its own (createRng).
//   meander   strength x the river's swing, length x its wavelength; edge: tiles the river's middle keeps off the map's edges
//   pools     side channels and oxbow lakes: up to `max`, each 4-7 tiles off the river (a gap of land all round: never joined to it);
//             a channel is 1 wide and 6-10 long, an oxbow an ellipse; clear: how far from rock, water and the start area they sit
//   outcrops  (Stage 4.7 Task 3b: classic-only history; a new map lays rock belts, src/sim/belts.js) 2-5 rocky clusters (patches of radius 3, 2 or 1 within 3 tiles of a centre), the map's rock still MAP.rockTarget x area
//   groves    (no longer drawn: a new map's meadow follows the water) 1-3 meadow patches (palms and acacias) 3-7 tiles from water, radius 2-3.5
//   dunes     1-3 fields of dune crests on far desert; wadis 0-2 dry riverbeds (desert, buildable) running towards the water
//   clay      wide: the patches are 2-3 tiles across (the bank tile and one or two inland), a stretch holding at most `cap` tiles
MAP.shapes = {
  meander: { strength: [0.85, 1.25], length: [0.85, 1.25], edge: 2.2 },
  pools: { max: 2, channelLen: [6, 10], offset: [4, 7], oxbowRx: [1.6, 2.6], oxbowRy: [2.6, 4.2], tries: 40, clearRock: 6, clearWater: 3, clearStart: 9, edge: 3 },
  outcrops: { min: 2, extra: 4, tries: 600, spread: 3 },
  groves: { min: 1, extra: 3, rMin: 2, rExtra: 1.5, nearMin: 3, nearMax: 7, tries: 60 },
  dunes: { min: 1, extra: 3, rxMin: 3, rxExtra: 3, ryMin: 2, ryExtra: 2, far: 7, tries: 60 },
  wadis: { max: 2, minLen: 12, maxLen: 30, far: 8, tries: 40 },
  clay: { wideMin: 2, wideExtra: 2, cap: 24 },
};

// Map sizes (ruling 333): tiles a side. Normal is the default and every city's from before Stage 4.6 (world.mapSize
// 64; the weekly seed, This week's Nile, was Normal too, until Version 6.0 dropped it); the title, sample and stress cities and the test fixtures stay Normal. createWorld takes any of them (and, for tests, any size
// with a map passed in).
// Version 6.0 (Track 0 seam, Track D1 owns it; ruling 628): every size the game knows, in the picker's order. offered: in MAP_SIZES (the
// title's picker, links, records, isMapSize, ?size=); bigScreen: the picker says it is best on a tablet or computer (phones). Huge is not
// offered until Track D1 turns it on with its picker words, its zoom frame and the start guarantees at 112 (createWorld takes any size,
// so a test or a dev scene can make one now).
export const MAP_SIZE_TABLE = [
  { id: 'small', size: 48, offered: true, bigScreen: false },
  { id: 'normal', size: 64, offered: true, bigScreen: false },
  { id: 'large', size: 80, offered: true, bigScreen: false },
  { id: 'huge', size: 112, offered: true, bigScreen: true },
];
export const HUGE_MAP_SIZE = 112;
export const MAP_SIZES = Object.fromEntries(MAP_SIZE_TABLE.filter((r) => r.offered).map((r) => [r.id, r.size]));
export const MAP_SIZE_IDS = Object.keys(MAP_SIZES);
export const DEFAULT_MAP_SIZE = MAP_SIZES.normal;
export const isMapSize = (n) => Object.values(MAP_SIZES).includes(n);
// Salts for the generator's seeded shape choices (ruling 332): hash2(seed, k, MAP_SALT.x) or createRng((seed ^ MAP_SALT.x) >>> 0), as
// MAP.clay.salt is used. Never draw a shape choice from the generator's own rng stream: classic at 64 must keep its fingerprints.
// Registered by Track 0 (unique across the game: tests/stage46/contract/salts.test.js).
export const MAP_SALT = {
  meander: 4601, channels: 4602, oxbow: 4603, outcrops: 4604, dunes: 4605, groves: 4606, wadis: 4607, clayWide: 4608,
  shapePick: 4609, greatOasis: 4610, spare2: 4611,   // greatOasis: Version 8.2 (Track G), the Great oasis's own stream (src/sim/greatOasis.js)
  courses: 4612,   // Version 7.1 (Track M): the new layouts' own stream (src/sim/courses.js)
};
// Version 6.0, Track D1's salts (the Huge map's own draws, if it needs any), range 6071-6079; rename the spares as they are used.
export const HUGE_SALT = { spare1: 6071, spare2: 6072 };
// The Map track's rows in the Stage 4.6 lists (src/data/s46.js joins every track's): tallies, firsts, achievements, tips.
export const MAP_TALLY = [];
export const MAP_FIRSTS = [];
export const MAP_ACHIEVEMENTS = [];
// The bridge tip (ruling 350): the first time a road meets water in the road tool (refused, or a bridge would be laid), fired by the Map seam
// (src/ui/s46/map.js) as 'roadMeetsWater'; its words are TIP_TEXT.bridges and TIP_HELP_TEXT.bridges (src/ui/text.js).
export const MAP_TIPS = [{ id: 'bridges', trigger: 'roadMeetsWater', priority: false }];
// ── end s46 map ──
