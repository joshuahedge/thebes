import { WORLD_VERSION, newTradeState, newRaidState, newDangerState, STAGE3_TALLY } from '../sim/world.js';
import { MILESTONES } from '../data/progression.js';
import { RAIDS } from '../data/raids.js';

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

// The Stage 3 build items a city of this milestone has already unlocked (spec 4.14: a city saved before Stage 3 gets
// "New" badges for the firehouse, and for the defences if it is already a Market town), in the milestones' order.
function stage3Unlocked(milestone) {
  const reached = MILESTONES.findIndex((m) => m.id === milestone);
  const out = [];
  for (let i = 0; i <= reached; i++) for (const t of MILESTONES[i].unlocks) if (['firehouse', 'wall', 'tower', 'barracks'].includes(t)) out.push(t);
  return out;
}

// v3 -> v4 (Stage 3). Every building gets no fire risk and no fire; the city gets no walls, no soldiers, no seals, no
// splits (the days it became each milestone before Stage 3 are unknown), no feats and no city id (the interface gives
// it one at load), and the Stage 3 tallies start at zero. A city that already had the raid clock's people (its peak or
// its people now: a Stage 2 city never Peaceful) starts the clock on the day it is loaded (spec 4.13, ruling 94), so
// its first warning comes two game-years later and no raid lands at once. Already-unlocked Stage 3 build items join
// newItems. Every other field is kept as it was. A malformed save is left for validateWorld to report.
function v3ToV4(w) {
  const tally = w.tally !== null && typeof w.tally === 'object' && !Array.isArray(w.tally) ? w.tally : {};
  const buildings = {};
  if (w.buildings && typeof w.buildings === 'object') {
    for (const [id, b] of Object.entries(w.buildings)) buildings[id] = b && typeof b === 'object' ? { ...b, risk: 0, fire: null } : b;
  }
  const raid = newRaidState();
  const peak = Math.max(Number.isFinite(tally.peakPeople) ? tally.peakPeople : 0, peopleIn(w));
  if (peak >= RAIDS.clockPeople && Number.isInteger(w.day)) { raid.clockDay = w.day; raid.nextWarnDay = w.day + RAIDS.firstWarnAfter; }
  const items = Array.isArray(w.newItems) ? w.newItems.slice() : w.newItems;
  if (Array.isArray(items)) for (const t of stage3Unlocked(w.milestone)) if (!items.includes(t)) items.push(t);
  const cells = Number.isInteger(w.size) && w.size > 0 ? w.size * w.size : 0;
  return {
    ...w,
    version: 4,
    buildings,
    newItems: items,
    tally: { ...tally, ...Object.fromEntries(STAGE3_TALLY.map((k) => [k, 0])) },
    wall: new Array(cells).fill(0),
    wallVersion: 0,
    raid,
    soldiers: [],
    nextUnitId: 1,
    danger: newDangerState(),
    splits: {},
    seals: [],
    feats: { earned: [], lost: [], counters: {} },
    cityId: null,
  };
}

// Each entry upgrades a world from version N to N + 1. Add one whenever WORLD_VERSION goes up.
export const MIGRATIONS = { 1: v1ToV2, 2: v2ToV3, 3: v3ToV4 };

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
