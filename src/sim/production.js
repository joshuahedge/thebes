import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { allBuildings } from './world.js';
import { buildingsInReach } from './reach.js';
import { isWorking, staffRatio } from './labour.js';
import { DAYS_PER_MONTH } from './time.js';

export const storeTotal = (b) => Object.values(b.store).reduce((s, v) => s + v, 0);

// A store has room while all its goods together are under its capacity.
export const hasSpace = (s) => storeTotal(s) < BUILDINGS[s.type].capacity;

// Whether a store takes deliveries of a good (spec 4.10): it is built to hold the good and, for a storehouse, the
// player has not refused it (b.accepts[good] === false, set by setAccept). A refused good it already holds stays
// there and can still be drawn on by workshops and bazaars.
export function storeAccepts(b, good) {
  if (!(BUILDINGS[b.type].stores || []).includes(good)) return false;
  return !(b.accepts && b.accepts[good] === false);
}

const stocked = (s, good) => (s.store[good] || 0) > 0;
const holds = (o, good) => (BUILDINGS[o.type].stores || []).includes(good) && stocked(o, good);

// Working stores within the producer's reach that take the good, nearest first, with room or not.
function outputStores(world, b, good) {
  return buildingsInReach(world, b, BUILDINGS[b.type].producerReach, (o) => storeAccepts(o, good) && isWorking(world, o)).map((r) => r.b);
}

// Stores within the producer's reach holding its input, nearest first, working or not: the rule bazaars restock by.
function inputStores(world, b, input) {
  return buildingsInReach(world, b, BUILDINGS[b.type].producerReach, (o) => holds(o, input)).map((r) => r.b);
}

// The store a workshop takes its next unit of input from: the nearest holding it. When no store that takes the output
// has room, only one of those stores can help (the nearest holding the input): giving up its input frees the room.
function inputSource(sources, targets, input) {
  if (targets.some(hasSpace)) return sources.find((s) => stocked(s, input));
  return sources.find((s) => stocked(s, input) && targets.includes(s));
}

// One unit (spec 4.10): a workshop takes one of its input from the nearest suitable store (inputSource), then the good
// goes to the nearest store with room. Taking the input first means a full storehouse that gave up the clay has room
// for the pot, so a storehouse filled with clay never stops its potter. Returns null, or why the unit could not be made.
function makeOne(world, good, input, sources, targets) {
  let from = null;
  if (input) {
    from = inputSource(sources, targets, input);
    if (!from) return sources.some((s) => stocked(s, input)) ? 'storage_full' : 'no_input';
    from.store[input] -= 1;
  }
  const to = targets.find(hasSpace);
  if (!to) {
    if (from) from.store[input] += 1;
    return 'storage_full';
  }
  to.store[good] = (to.store[good] || 0) + 1;
  world.tally.made[good] = (world.tally.made[good] || 0) + 1;
  if (FOOD_GOODS.includes(good)) world.tally.harvested += 1;   // every unit of food that reaches storage
  return null;
}

// Producers make output daily, scaled by staffing (spec 4.10). b.blocked says why one is idle: paused, understaffed,
// no_input (a workshop with none of its input in any store within its producer reach), no_storage (no working
// store within reach that takes the good has room for it) or storage_full (its stores filled up during the day).
export function produceDay(world) {
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.produces) continue;
    if (!isWorking(world, b)) { b.blocked = b.paused ? 'paused' : 'understaffed'; continue; }
    const { good, perMonth } = def.produces;
    const input = def.consumes || null;
    const sources = input ? inputStores(world, b, input) : [];
    if (input && !sources.length) { b.blocked = 'no_input'; continue; }
    const targets = outputStores(world, b, good);
    // A full store that gives up its input counts as having room: each unit takes its input first (see makeOne).
    if (!targets.some(hasSpace) && !(input && inputSource(sources, targets, input))) { b.blocked = 'no_storage'; continue; }
    b.blocked = null;
    b.progress += (perMonth / DAYS_PER_MONTH) * staffRatio(world, b);
    while (b.progress >= 1 - 1e-9) {
      const why = makeOne(world, good, input, sources, targets);
      if (why) { b.blocked = why; break; }
      b.progress -= 1;
    }
  }
}
