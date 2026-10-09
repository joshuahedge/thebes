import { WORLD_VERSION } from '../sim/world.js';

export const CURRENT_VERSION = WORLD_VERSION;

// Each entry upgrades a world from version N to N + 1. Add one whenever WORLD_VERSION goes up.
const MIGRATIONS = {};

export function migrate(obj) {
  if (!obj || typeof obj.version !== 'number') throw new Error('not_a_save');
  if (obj.version > CURRENT_VERSION) throw new Error('newer_version');
  let w = obj;
  while (w.version < CURRENT_VERSION) {
    const step = MIGRATIONS[w.version];
    if (!step) throw new Error('no_migration_' + w.version);
    w = step(w);
  }
  return w;
}
