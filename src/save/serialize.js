import { migrate } from './migrate.js';

// Every top-level field createWorld produces (src/sim/world.js).
export const REQUIRED = [
  'version', 'seed', 'size', 'day', 'speed', 'gold', 'terrain', 'road', 'occ', 'buildings', 'nextId',
  'mood', 'moodBreakdown', 'milestone', 'labour', 'alerts', 'undo', 'roadVersion', 'tradeEntry',
  'raiderEntries', 'focus', 'stats',
];

export function serialize(world) {
  return JSON.stringify(world);
}

function validateWorld(w) {
  for (const k of REQUIRED) if (!(k in w)) return false;
  if (!Number.isInteger(w.size) || w.size <= 0) return false;
  const cells = w.size * w.size;
  for (const k of ['terrain', 'road', 'occ']) if (!Array.isArray(w[k]) || w[k].length !== cells) return false;
  if (!w.buildings || typeof w.buildings !== 'object') return false;
  if (!Number.isInteger(w.day) || !Number.isInteger(w.nextId) || !Number.isFinite(w.gold)) return false;
  return true;
}

// Version is checked before shape, so a newer or older save is reported as such and not as corrupt.
export function deserialize(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error('corrupt_save'); }
  if (!obj || typeof obj !== 'object') throw new Error('corrupt_save');
  const w = migrate(obj);
  if (!validateWorld(w)) throw new Error('corrupt_save');
  return w;
}
