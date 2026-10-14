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
  spare2: 4712, spare3: 4713, spare4: 4714,
};

// Tallies for Stage 4.7's firsts and summaries (world.tally; new and migrated cities start them at 0): buildings placed within 4 tiles
// of an oasis (Task 2's first), cart trips finished and goods they brought home (Task 5), yearly quotas met and missed (Task 7). Until
// Stage 4.7 is on main a task may add a key here (version 8 is not out yet); after that a new key needs version 9.
export const S47_TALLY = ['oasisBuilds', 'cartTrips', 'cartGoods', 'quotasMet', 'quotasMissed'];

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
//   state   'out' (on the way to the source), 'back' (on the way home with the goods), 'return' (the road broke: the goods go back
//           to the source)
export const CART_STATES = ['out', 'back', 'return'];
export const isCart = (c) => isRec(c) && ['id', 'from', 'to', 'left', 'turn', 'due'].every((k) => Number.isInteger(c[k]))
  && typeof c.good === 'string' && isNum(c.amount) && isNum(c.len) && CART_STATES.includes(c.state);

// Task 1 (ruling 461): what every new map holds near the start area. reach: tiles from the start area's centre (map.focus) at Normal
// (64), scaled linearly with the map's size; then, within that reach, at least `clay` clay-pit fits, `mine` gem-mine fits on rocky
// ground and `farm` grain-farm fits on fertile ground, counted as footprints that do not overlap (what the player can actually build).
export const RESOURCES = { reach: 20, clay: 2, mine: 1, farm: 6 };
export const resourceReach = (size) => Math.round((RESOURCES.reach * size) / 64);
