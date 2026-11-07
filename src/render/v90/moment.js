// Version 9.0, Track V (V5): the beaten raid's moment on the map, as state. The interface starts it when the alert row's moment starts on a beaten
// raid (src/ui/v60/battle.js, through raidMoment.js beatenRaidOnMap); it lasts the moment's MOMENT.days game days, and ends early when the next raid
// is warned or starts. Per world, outside it (never saved: a reload shows no moment on the map, as the alert row's moment is not kept either).
import { MOMENT } from '../../data/battle.js';
import { v90Off } from './dropper.js';

export const CHEER_TILES = 4;               // soldiers out within this many tiles of the spot raise their spears
const moments = new WeakMap();              // world -> { day, x, y, edge: { x, y }, chief: { x, y } | null }

export function startMoment(world, m) { if (world) moments.set(world, { ...m }); }
export function endMoment(world) { if (world) moments.delete(world); }

// The moment under way on this world, or null.
export function momentOf(world) {
  const m = moments.get(world);
  if (!m) return null;
  const raid = world.raid || {};
  if (world.day - m.day >= MOMENT.days || world.day < m.day || raid.warning || raid.active) { moments.delete(world); return null; }
  return m;
}

// Whether a soldier at (x, y) raises his spear: a moment is under way and he is near its spot.
export function cheering(world, x, y) {
  const m = momentOf(world);
  return Boolean(m) && m.x !== null && !v90Off('moment') && Math.hypot(x - m.x, y - m.y) <= CHEER_TILES;
}
