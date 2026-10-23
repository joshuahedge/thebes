import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { allBuildings } from './world.js';
import { buildingsInReach, touchesRoad } from './reach.js';
import { isWorking, staffRatio } from './labour.js';
import { materialOf, supplyNeeded, deliverySites, stockRoom } from './monuments.js';
import { DAYS_PER_MONTH } from './time.js';
import { HUNTING } from '../data/river.js';
import { floodHarvestFactor, fishFactor } from './flood.js';
import { huntHerd, takeGame } from './wildlife.js';
import { HARVEST_NOW } from '../data/hazards.js';
import { droughtFactor, cropFactor, warnedBand, isFarm, cropShare } from './crops.js';
import { plagueHalted } from './plague.js';

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

// Stores within `reach` of a building (or of a ghost's probe) built to hold the good whose accept switch is off. When no
// store takes a producer's good, these are why: the quick fix is to let one accept, not to build another.
export function refusingStores(world, b, good, reach) {
  return buildingsInReach(world, b, reach, (o) => (BUILDINGS[o.type].stores || []).includes(good) && !storeAccepts(o, good)).map((r) => r.b);
}

// Whether a store in the producer's reach refuses the producer's own good.
export function producerRefused(world, b) {
  const def = BUILDINGS[b.type];
  return Boolean(def.produces) && refusingStores(world, b, def.produces.good, def.producerReach).length > 0;
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
// Stage 4 (spec 4.16): stone and bricks go first to the nearest monument site in reach with room for a whole unit
// (sites: deliverySites), counted as delivered (tally stoneDelivered / bricksDelivered); only then to a store.
function makeOne(world, good, input, sources, targets, sites = []) {
  const site = sites.find((s) => stockRoom(s)[good] >= 1 - 1e-6);
  let from = null;
  if (input) {
    from = site ? sources.find((s) => stocked(s, input)) : inputSource(sources, targets, input);
    if (!from) return sources.some((s) => stocked(s, input)) ? 'storage_full' : 'no_input';
    from.store[input] -= 1;
  }
  if (site) {
    site.site.stock[good] += 1;
    world.tally[`${good}Delivered`] += 1;
    world.tally.made[good] = (world.tally.made[good] || 0) + 1;
    return null;
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
// Stage 4 (spec 4.16, ruling 237): a quarry or brickworks on a road that is not needed (supplyNeeded) is 'idle' and makes
// nothing; one that is sends to monument sites first (deliverySites), so a site with room is somewhere to send.
// Version 6.0 (Track B1): work stops where a plague runs unchecked or a district is quarantined (plague.js plagueHalted: b.blocked 'plague'); a
// farm that has been harvested early rests (b.restUntil: 'resting'); locusts that eat the whole crop stop a farm in their band (b.blocked says
// 'locusts'); drought and blight only cut what a farm makes (cropFactor, droughtFactor). The words are src/ui/v60/hazards.js's.
export function produceDay(world) {
  const halted = plagueHalted(world);
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.produces) continue;
    const material = materialOf(b);
    if (material && !b.paused && touchesRoad(world, b) && !supplyNeeded(world, b)) { b.blocked = 'idle'; continue; }
    if (!isWorking(world, b)) { b.blocked = b.paused ? 'paused' : 'understaffed'; continue; }
    if (halted && halted.has(b.id)) { b.blocked = 'plague'; continue; }
    if (restDaysLeft(world, b) > 0) { b.blocked = 'resting'; continue; }
    const crop = cropFactor(world, b);
    if (crop <= 0) { b.blocked = world.hazards.locusts.active.kind; continue; }
    const { good, perMonth } = def.produces;
    const input = def.consumes || null;
    const sources = input ? inputStores(world, b, input) : [];
    if (input && !sources.length) { b.blocked = 'no_input'; continue; }
    const targets = outputStores(world, b, good);
    const sites = material ? deliverySites(world, b) : [];
    // A full store that gives up its input counts as having room: each unit takes its input first (see makeOne).
    if (!sites.length && !targets.some(hasSpace) && !(input && inputSource(sources, targets, input))) { b.blocked = 'no_storage'; continue; }
    b.blocked = null;
    // Stage 4.6 (River track, ruling 360): a floodplain farm's harvest follows the last flood; a wharf's boat lands more in the flood months.
    const rate = (perMonth / DAYS_PER_MONTH) * staffRatio(world, b) * harvestFactor(world, b) * crop * (def.fishes ? fishFactor(world) : 1);
    b.progress += rate;
    while (b.progress >= 1 - 1e-9) {
      // A hunting lodge (rulings 364, 460) makes each unit of game from the animal in hand (b.gameLeft); with none, its hunters take one animal
      // from a herd in reach (HUNTING.gamePerAnimal game); with none to take, or its HUNTING.maxMonth made, it waits (and banks no more than one).
      if (def.hunts) {
        const room = (b.hunted || 0) < HUNTING.maxMonth;
        if (room && !((b.gameLeft || 0) > 0)) { const herd = huntHerd(world, b); if (herd) takeGame(world, herd, b); }
        if (!room || !((b.gameLeft || 0) > 0)) { b.blocked = 'no_game'; b.progress = Math.min(b.progress, 1); break; }
      }
      const why = makeOne(world, good, input, sources, targets, sites);
      if (why) { b.blocked = why; break; }
      if (def.hunts) { b.gameLeft -= 1; b.hunted = (b.hunted || 0) + 1; }
      if (def.fishes) world.tally.fished += 1;
      b.progress -= 1;
    }
  }
}

// ── Version 6.0 (Track B1, rulings 687-688): the harvest's factors and Harvest now ──
// What the year's weather gives a building's crop: the flood's multiplier on a floodplain farm, or a drought's on any farm, whichever is the
// lower (a low flood in a drought year is not counted twice).
export function harvestFactor(world, b) {
  const flood = floodHarvestFactor(world, b), drought = droughtFactor(world, b);
  return drought < 1 ? Math.min(flood, drought) : flood;   // a good flood still feeds a farm when there is no drought
}

// The days a farm still rests after Harvest now: 0 before the rest begins (the day after the strike) and once it is over.
export const restDaysLeft = (world, b) => (b.restUntil > world.day && world.day >= (b.restFrom || 0) ? b.restUntil - world.day : 0);

// What Harvest now would do on a farm (the farm's sheet says these numbers): part of a month's crop, HARVEST_NOW.share of it at the farm's staffing
// and the year's weather, into the stores that take it, at once. The farm works on until the strike, then rests HARVEST_NOW.restDays days
// (from the day after it comes, under the swarm or blight) and makes nothing.
//   { ok, reason, good, units (what fits in the stores now), want (the crop's share), restDays, kind (locusts or blight), strikes (the day it comes) }
// reason when not ok: 'not_warned' (the farm is in no warned band: Harvest now is for a warning's farms), 'done' (already harvested for this
// warning), 'idle' (a farm that is not working has nothing to harvest), 'no_room' (no store that takes the crop has room).
export function harvestQuote(world, b) {
  const w = b && isFarm(b.type) ? warnedBand(world, b.id) : null;
  const def = b ? BUILDINGS[b.type] : null;
  // share (Version 6.0.1, ruling 801): the part of its crop the band leaves a farm if it struck today (crops.js cropShare: more while the great temple rises), for the words.
  const base = { good: def && def.produces ? def.produces.good : null, units: 0, want: 0, restDays: HARVEST_NOW.restDays, kind: w ? w.kind : null, strikes: w ? w.strikes : null, share: w ? cropShare(world, w.kind) : null };
  if (!w) return { ok: false, reason: 'not_warned', ...base };
  if ((w.early || []).includes(b.id)) return { ok: false, reason: 'done', ...base };
  if (!isWorking(world, b)) return { ok: false, reason: 'idle', ...base };
  const want = Math.max(1, Math.round(def.produces.perMonth * HARVEST_NOW.share * staffRatio(world, b) * harvestFactor(world, b)));
  const room = outputStores(world, b, base.good).reduce((s, t) => s + Math.max(0, BUILDINGS[t.type].capacity - storeTotal(t)), 0);
  const units = Math.min(want, Math.floor(room));
  if (units < 1) return { ok: false, reason: 'no_room', ...base, want };
  return { ok: true, reason: null, ...base, units, want };
}

// The Harvest now command: the quote's units into the stores, the farm resting (b.restUntil), the farm named among those harvested early
// (the warning's early list, which the swarm's record keeps), tally harvestsEarly. { ok, reason, units, ... } as the quote.
export function harvestNow(world, id) {
  const b = world.buildings[id];
  const q = harvestQuote(world, b);
  if (!q.ok) return q;
  const targets = outputStores(world, b, q.good);
  let got = 0;
  for (let n = 0; n < q.units; n++) { if (makeOne(world, q.good, null, [], targets)) break; got++; }
  const w = warnedBand(world, id);
  // The rest starts the day after the strike, where the swarm or blight is already cutting the crop, so what the farm makes until then is kept
  // and the grain taken now is a pure gain (a rest from the tap would cost up to 15 days of a full crop for 12 days of grain).
  b.restFrom = Math.max(world.day, w.strikes) + 1;
  b.restUntil = b.restFrom + HARVEST_NOW.restDays;
  (w.early = w.early || []).push(id);
  world.tally.harvestsEarly += 1;
  return { ...q, units: got };
}
