import { migrate } from './migrate.js';
import { BUILDINGS } from '../data/buildings.js';

// Every top-level field createWorld produces (src/sim/world.js).
export const REQUIRED = [
  'version', 'seed', 'size', 'day', 'speed', 'gold', 'terrain', 'road', 'occ', 'buildings', 'nextId',
  'mood', 'moodBreakdown', 'milestone', 'labour', 'alerts', 'undo', 'roadVersion', 'tradeEntry',
  'raiderEntries', 'focus', 'stats', 'startRoad', 'goals', 'history',
];

// The save envelope (spec 4.17): wall-clock fields sit beside the world, never inside it.
export const SAVE_VERSION = 1;

export function serialize(world) {
  return JSON.stringify(world);
}

export function validateWorld(w) {
  for (const k of REQUIRED) if (!(k in w)) return false;
  if (!Number.isInteger(w.size) || w.size <= 0) return false;
  const cells = w.size * w.size;
  for (const k of ['terrain', 'road', 'occ']) if (!Array.isArray(w[k]) || w[k].length !== cells) return false;
  if (!w.buildings || typeof w.buildings !== 'object') return false;
  if (!Number.isInteger(w.day) || !Number.isInteger(w.nextId) || !Number.isFinite(w.gold)) return false;
  for (const b of Object.values(w.buildings)) if (!b || !Object.hasOwn(BUILDINGS, b.type)) return false;   // 1a note: unknown types
  for (const id of w.occ) if (id !== 0 && !Object.hasOwn(w.buildings, id)) return false;                   // 1a note: stray occupancy
  if (!Array.isArray(w.startRoad) || !w.goals || !Array.isArray(w.goals.completed) || !Array.isArray(w.history)) return false;
  return true;
}

function finishLoad(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('corrupt_save');
  const w = migrate(obj);
  if (!validateWorld(w)) throw new Error('corrupt_save');
  return w;
}

// Version is checked before shape, so a newer or older save is reported as such and not as corrupt.
export function deserialize(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error('corrupt_save'); }
  return finishLoad(obj);
}

export function packSave(world, { savedAt = null, lastSpeed = 1 } = {}) {
  return JSON.stringify({ version: SAVE_VERSION, savedAt, lastSpeed, world });
}

// A bare world (an early export) is accepted as an envelope with no wall-clock data.
export function unpackSave(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error('corrupt_save'); }
  if (!obj || typeof obj !== 'object') throw new Error('corrupt_save');
  const bare = !('world' in obj);
  if (!bare && Number.isInteger(obj.version) && obj.version > SAVE_VERSION) throw new Error('newer_version');
  const world = finishLoad(bare ? obj : obj.world);
  return {
    savedAt: !bare && Number.isFinite(obj.savedAt) ? obj.savedAt : null,
    lastSpeed: !bare && [1, 2, 3].includes(obj.lastSpeed) ? obj.lastSpeed : 1,
    world,
  };
}
