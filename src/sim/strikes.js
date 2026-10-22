// Version 6.0 (Track 0 seam; Track B1 fills it, Track B2 draws what it leaves; ruling 625): what a raiding band does to a building it
// reaches that is not a home (a home's people flee: src/sim/raids.js frighten). src/sim/raids.js strike calls the three in STRIKE_KINDS
// order (src/data/hazards.js), then takes gold from anything that is not a granary, as before. Each is (world, active, b, events):
//   active   the raid under way (world.raid.active): a hook adds what it did to the raid's record, which becomes the report (raid.last)
//   b        the building struck; events: the clock's events array or null
//
//   burn(world, active, b, events) -> true when a blaze was started. Today's strike: a blaze through the fire rules (igniteBuilding,
//            cause 'raid', whose own 'fire' event B2 draws), followed while it burns (active.fires).
//   wreck(world, active, b, events) -> the rubble ids it left ([] when it wrecked nothing). STUB: wrecks nothing. Track B1: part of the
//            building falls to rubble, each rubble tile carrying was = { type, x, y, w, d, rot, day, cause: 'wreck' } (what stood there,
//            so it can be cleared and rebuilt); counts active.wrecked and active.wreckedKinds and the tally `wrecked`; pushes
//            { type: 'raid_wreck', id, kind, to } (to: the rubble ids) for B2's dust and debris.
//   loot(world, active, b, events) -> the units taken. Today: a granary loses RAIDS.foodShare of each food it holds (counted in
//            active.foodStolen by strike). Track B1: storehouses too, kept in active.taken ({ good: units }), the tally `looted`, and
//            { type: 'raid_loot', id, goods } for B2's carried sacks.
// The raid report (raid.last) lists burned, wrecked and taken: Track B1 keeps active.wrecked, active.wreckedKinds and active.taken there
// as it does burned (absent means none: a report from before 6.0 has none of them).
import { RAIDS } from '../data/raids.js';
import { igniteBuilding } from './fire.js';

// The food a granary strike takes: RAIDS.foodShare of each good it holds, rounded up. Returns the units taken.
function takeFood(b) {
  let n = 0;
  for (const good of Object.keys(b.store)) {
    const take = Math.min(b.store[good], Math.ceil(b.store[good] * RAIDS.foodShare));
    if (take > 0) { b.store[good] -= take; n += take; }
  }
  return n;
}

export const STRIKES = {
  burn(world, active, b, events) {
    if (!igniteBuilding(world, b.id, events, 'raid')) return false;
    active.fires.push({ id: b.id, type: b.type });
    return true;
  },
  wreck(world, active, b, events) {
    return [];
  },
  loot(world, active, b, events) {
    return b.type === 'granary' ? takeFood(b) : 0;
  },
};
