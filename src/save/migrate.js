import { WORLD_VERSION } from '../sim/world.js';

export const CURRENT_VERSION = WORLD_VERSION;

// Each entry upgrades a world from version N to N + 1. Add one whenever WORLD_VERSION goes up.
const MIGRATIONS = {};

// table and target are parameters so tests can drive a synthetic chain; production calls use the defaults.
export function migrate(obj, table = MIGRATIONS, target = CURRENT_VERSION) {
  if (!obj || !Number.isInteger(obj.version)) throw new Error('not_a_save');
  if (obj.version > target) throw new Error('newer_version');
  let w = obj;
  while (w.version < target) {
    const step = table[w.version];
    if (!step) throw new Error('no_migration_' + w.version);
    let next;
    try { next = step(w); } catch (e) { throw new Error('bad_migration_' + w.version); }
    if (!next || !(next.version > w.version) || next.version > target) throw new Error('bad_migration_' + w.version);
    w = next;
  }
  return w;
}
