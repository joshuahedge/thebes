import { WORLD_VERSION, newTradeState } from '../sim/world.js';

export const CURRENT_VERSION = WORLD_VERSION;

// People living in a saved world's homes, counted without trusting its shape (a malformed save is
// reported by validateWorld after the migration, not by a migration that throws).
function peopleIn(w) {
  let n = 0;
  const buildings = w.buildings && typeof w.buildings === 'object' ? Object.values(w.buildings) : [];
  for (const b of buildings) if (b && b.type === 'house' && Number.isFinite(b.residents)) n += b.residents;
  return n;
}

// v1 -> v2 (the early-game pass). firsts and achievements start as null, so the first check marks what is
// already true without celebrating it; an existing city has no guide; the tallies start at zero, except
// the peak, which starts at the city's population. Every other field is kept as it was.
function v1ToV2(w) {
  const completed = w.goals && Array.isArray(w.goals.completed) ? w.goals.completed.slice() : null;
  return {
    ...w,
    version: 2,
    firsts: null,
    achievements: null,
    daily: null,
    guide: { on: false, done: true },
    tally: { harvested: 0, profitMonths: 0, peakPeople: peopleIn(w), upgrades: 0, dailyDone: 0 },
    goals: { completed, triggered: [] },
  };
}

// v2 -> v3 (Stage 2). A city from before difficulty existed plays on Normal, so its costs do not change; it has no
// trade yet and no "New" badges, and the new tallies start at zero (nothing was made, sold or bought before).
// Every other field is kept as it was. A malformed tally is left for validateWorld to report.
function v2ToV3(w) {
  const tally = w.tally !== null && typeof w.tally === 'object' && !Array.isArray(w.tally) ? w.tally : {};
  return {
    ...w,
    version: 3,
    difficulty: 'normal',
    trade: newTradeState(),
    newItems: [],
    tally: { ...tally, made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0 },
  };
}

// Each entry upgrades a world from version N to N + 1. Add one whenever WORLD_VERSION goes up.
export const MIGRATIONS = { 1: v1ToV2, 2: v2ToV3 };

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
