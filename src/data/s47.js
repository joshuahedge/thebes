// Stage 4.7 (Task 0 contract, docs/superpowers/notes/2026-10-14-stage-4-7-contract.md): the shared names and shapes of world version 8.
// A leaf data file: it imports nothing, so any data or sim file may import it.

// The salt table's Stage 4.7 range (4701-4719; tests/stage47/contract/contract.test.js keeps every salt in the game unique). Draw as
// Stage 4.6 does: never from the map generator's own rng stream (it would move classic maps), but hash2(a, b, (seed + S47_SALT.x) | 0)
// or createRng((seed ^ S47_SALT.x) >>> 0). "render" salts are for drawing only and never touch the sim.
export const S47_SALT = {
  hills: 4701,        // Task 3: how many hill clusters and where
  hillShape: 4702,    // Task 3: each cluster's tiles
  hillSkirt: 4703,    // Task 3: the rocky skirt's width
  oases: 4704,        // Task 2: how many oases and where
  oasisShape: 4705,   // Task 2: each pool's tiles and ring
  grass: 4706,        // Task 2: the grass band's value noise (render: the bake and decor)
  grassDecor: 4707,   // Task 2: tufts, reeds, palms and scrub in the band (render)
  resources: 4708,    // Task 1: the start-area resource repair
  carts: 4709,        // Task 5: any sim draw the carts need
  cartLook: 4710,     // Task 6: a cart's look and pace on screen (render)
  mineBlob: 4711,     // Task 1: the mine repair's ragged blob edge (it drew from the resources salt + 2, which is cartLook's)
  herdOasis: 4712,    // Task 2: where a herd aimed at an oasis stands (src/sim/wildlife.js)
  hillLook: 4713,     // Task 3: each hill tile's height and look (render: src/render/hills.js, never the sim)
  belts: 4714,        // Task 3b: where a rock belt runs, how long and wide (src/sim/belts.js)
};

// Tallies for Stage 4.7's firsts and summaries (world.tally; new and migrated cities start them at 0): buildings placed within 4 tiles
// of an oasis (Task 2's first), cart trips finished and goods they brought home (Task 5), yearly quotas met and missed (Task 7). Until
// Stage 4.7 is on main a task may add a key here (version 8 is not out yet); after that a new key needs version 9.
export const S47_TALLY = ['oasisBuilds', 'cartTrips', 'cartGoods', 'quotasMet', 'quotasMissed', 'plotsLaid', 'goodSpotPlots'];   // Task 4: plotsLaid, housing plots laid (keeps the next-house spots on once the first is placed); goodSpotPlots, plots laid on a Good spot (the spots' first)

// New land (hills, oases, the grass band): generated maps carry mapParams.land = LAND_VERSION when they get it, which is every new map
// but classic at Normal (64): that one draws exactly as before (rulings 332, 351). A saved city keeps its mapParams, so a city from
// before version 8 (no land key) never has new land drawn or generated under it.
export const LAND_VERSION = 1;
export const newLandFor = (variant, size) => !(variant === 'classic' && size === 64);
export const hasNewLand = (world) => Boolean(world && world.mapParams && world.mapParams.land >= LAND_VERSION);

// ── Shapes and their checks (src/save/serialize.js validateWorld calls these) ──
const isRec = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v, min = 0) => Number.isFinite(v) && v >= min;

// world.oases: [{ x, y, r }] the pool's centre tile and radius in tiles (Task 2 may add fields inside each record).
export const isOasis = (o) => isRec(o) && Number.isInteger(o.x) && Number.isInteger(o.y) && isNum(o.r);

// A store's orders (each granary and storehouse: b.orders): { [good]: { fetch } }, fetch the amount it fetches up to (Task 5 may add
// fields inside an order). stores: the goods the store may hold (BUILDINGS[type].stores).
export const isOrders = (orders, stores) => isRec(orders)
  && Object.entries(orders).every(([good, o]) => stores.includes(good) && isRec(o) && isNum(o.fetch));

// world.carts: one per fetching store at most, on its way out or back (Task 5 owns the rules, Task 6 the drawing).
//   id      integer: the fetching store's id (one cart per store, so ids never clash and need no counter)
//   from    the source store's id (the goods come from here)
//   to      the fetching store's id (the goods go here; the cart's home)
//   good    the good carried
//   amount  units carried (taken from `from` the day the cart sets out)
//   len     road tiles one way (the path's length when it set out)
//   left    the day it set out; turn: the day it reaches `from`; due: the day it is home
//   state   'out' (on the way to the source), 'back' (on the way home with the goods), 'return' (the road broke: it turns round)
//   Task 5 adds two fields, set only while state is 'return' (see the contract note, section 12): at, the road tiles from home along
//   the route where it turned; dest, 'home' (it broke on the way out: the goods went back to the source at once) or 'source' (it broke
//   on the way back: it carries the goods back to the source, where they are put on the shelf on the due day). In 'return', turn is
//   the break day and due is the break day plus the distance it had travelled on that leg over the speed, rounded up.
export const CART_STATES = ['out', 'back', 'return'];
export const CART_DESTS = ['home', 'source'];
export const isCart = (c) => isRec(c) && ['id', 'from', 'to', 'left', 'turn', 'due'].every((k) => Number.isInteger(c[k]))
  && typeof c.good === 'string' && isNum(c.amount) && isNum(c.len) && CART_STATES.includes(c.state)
  && (c.state !== 'return' || (CART_DESTS.includes(c.dest) && Number.isInteger(c.at) && c.at >= 0));

// Task 5 (ruling 466): the carts' numbers, all tunable here. perTrip: the most a cart carries a trip; speed: road tiles a game day each
// way; defaultFetch: the amount a new order fetches up to. A trip's days are worked out in src/sim/carts.js tripTimes.
export const CARTS = { perTrip: 20, speed: 8, defaultFetch: 100 };

// Task 1 (ruling 461): what every new map holds near the start area. reach: tiles from the start area's centre (map.focus) at Normal
// (64), scaled linearly with the map's size; then, within that reach, at least `clay` clay-pit fits, `mine` gem-mine fits on rocky
// ground and `farm` grain-farm fits on fertile ground, counted as footprints that do not overlap (what the player can actually build).
export const RESOURCES = { reach: 20, clay: 2, mine: 1, farm: 6 };
export const resourceReach = (size) => Math.round((RESOURCES.reach * size) / 64);

// Task 2 (ruling 463): desert oases (src/sim/oases.js draws and reads them). Counts by map size: Small (size <= smallMax), Normal, Large (size >= largeMin).
// A site keeps fromRiver tiles from any other water, fromEdge from a map edge, fromStart from the start area's centre and fromEntry from a raider
// entry or the trade entry, and apart from another oasis; the pool is 3-8 water tiles, the zone (a square of side 2 x zone + 1) is open desert or
// meadow, and `clay` tiles of clay lie beside the pool. A building within `near` tiles of an oasis is "An oasis in the desert" (the first).
export const OASES = {
  small: [0, 1], normal: [0, 2], large: [1, 3], smallMax: 56, largeMin: 72,
  fromRiver: 12, fromEdge: 8, fromStart: 16, fromEntry: 12, apart: 14, fromRock: 8,   // fromRock: no rock within this many tiles of a pool (the generator keeps rock 8 off water)
  pool: [3, 8], zone: 5, clay: [3, 7], near: 4, tries: 600, decorNear: 6,   // decorNear: tiles from a pool's edge that palms grow (src/render/renderer.js)
  herdShare: 0.5,   // of a herd's spawn tries, the share aimed at an oasis (when the map has one)
  herdReach: [3, 9], // a herd aimed at an oasis stands this many tiles from its pool's edge
};

// Task 3 (ruling 464) as reworked by Task 3b: hills (src/sim/hills.js draws and reads them) are the spines of the rock belts below: a stretch of
// `spine` tiles (4-10) of a belt's middle, `half` tiles each side of its centreline (so 2-3 wide), stood on the belt's rocky ground (no skirt of its own:
// the belt is the skirt). count: spines on a Normal map, scaled by the map's area (Small 1-3, Large 3-8). A spine keeps fromWater tiles from any water,
// fromOasis from an oasis pool, fromStart from the start area's centre, fromEntry from a raider entry, the trade entry and the bridge spot, fromRoad from
// the start road and fromEdge from a map edge; apart is the gap between two spines; ends: tiles it keeps from either end of its belt. All distances in
// tiles (Chebyshev, except the Euclidean ones to a point).
export const HILLS = {
  count: [2, 5], spine: [4, 10], half: [1.0, 1.6], ends: 4, minTiles: 6,
  fromWater: 7, fromOasis: 9, fromStart: 13, fromEntry: 8, fromRoad: 4, fromEdge: 3, apart: 5, tries: 120,
};

// Task 3b: rock belts (src/sim/belts.js), the map's rocky ground on a new map: `count` long, narrow belts on a Normal map (scaled by the map's area), each
// `length` tiles at Normal (scaled by size / 64) and `width` wide in the body (pulsing by `pulse`, narrowing over `taper` tiles at each end), bending along a
// heading `bend` radians either side of a river-ward line; together `area` rocky tiles at Normal (scaled by area), more belts being tried until they hold it.
// A belt keeps fromWater tiles from any water, fromOasis from an oasis pool (an oasis keeps 8 tiles clear of rock), fromRoad from the start road, fromStart from the start area's centre, fromEdge from the map's edge and apart from another belt (centrelines).
export const BELTS = {
  count: [2, 3], length: [20, 40], width: [4.4, 6.2], pulse: 1.0, taper: 6, bend: 0.4, slant: 0.5, minLen: 14, area: 240, extra: 3, tries: 300,
  fromWater: 6, fromStart: 11, fromEdge: 2, apart: 7, fromOasis: 9, fromRoad: 4, least: 0.5, spread: 8, floor: 0.45,
};

// Task 2 (ruling 462) retuned by Task 3b: the green band (src/render/grass.js, and the sim's one moisture field, src/sim/moisture.js). river / oasis: tiles the
// moisture reaches from water (an oasis has its own halo); noise: how far (tiles) two octaves of value noise push the edge about; tiers: the moisture a tint
// pass starts at, each pass a colour and an alpha; they stack, so the green deepens towards the water. meadowFrom: the moisture at which open desert is
// MEADOW on a new map (src/sim/mapgen.js): green ground only close to water, never in open desert.
export const GRASS = {
  river: 10, oasis: 7, noise: 4, noiseScale: 6, noise2: 2, noiseScale2: 2.4, decorFrom: 0.2, jitter: 1.5, wander: 1.4, meadowFrom: 0.42,
  tiers: [0.08, 0.2, 0.32, 0.46, 0.6, 0.76],
  colours: ['#E6DCA6', '#D9D48E', '#BFCF72', '#A9C45C', '#93B84F', '#84AE48'],
  alphas: [0.3, 0.3, 0.38, 0.4, 0.42, 0.45],
};

// Task 2: "An oasis in the desert" (the first, when a building first goes up within OASES.near tiles of an oasis: tally oasisBuilds) and its
// tip (How to play lists every tip). Joined into FIRSTS (firsts.js) and TIPS (tips.js); the words are in src/ui/text.js (the s47 section).
// Task 4: "A good spot", the first plot laid on a Good spot (tally goodSpotPlots).
export const S47_FIRSTS = [{ id: 'first_oasis', check: { kind: 'tally', key: 'oasisBuilds', n: 1 } }, { id: 'first_good_spot', check: { kind: 'tally', key: 'goodSpotPlots', n: 1 } }, { id: 'first_cart_trip', check: { kind: 'tally', key: 'cartTrips', n: 1 } }];
// Task 3: the hills tip fires the first time a placing check is refused for hills (src/ui/s46/map.js): words in text.js, listed in How to play.
// Task 4: the next-house spots tip fires when the first plot is laid and the house tool stays on (src/ui/createUI.js afterCommand); it waits for the tool to end.
export const S47_TIPS = [{ id: 'oasis_green', trigger: 'oasisBuilt', priority: false }, { id: 'hills_ground', trigger: 'hillsMet', priority: false }, { id: 'house_spots', trigger: 'houseSpots', priority: false }, { id: 'fetch_far', trigger: 'goodsFar', priority: false }];
