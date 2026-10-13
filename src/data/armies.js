// Stage 4.6, Armies track (rulings 340-341): unit types (soldiers, archers, chariots, one building each), enemy types and the typed
// matchup table combat.js reads. Track 0 laid out the shapes and the plan's decided numbers; the Armies track owns this file and tunes
// it (recording any change as a ruling). A leaf data file: see src/data/river.js for what it may import.

// ── Your units (ruling 340) ──
// Each kind trains at one building type. world.soldiers holds every trained unit of every kind (the name stays from Stage 3), each
// { id, kind, barracks, x, y, hp, hit, task }: kind is one of UNIT_KINDS, barracks the id of the building that trained it (whatever
// its type). A city from before Stage 4.6 has kind 'soldier' on every unit.
export const UNIT_TYPES = {
  soldier: { building: 'barracks' },
  archer: { building: 'archery_range' },
  chariot: { building: 'stables' },
};
export const UNIT_KINDS = Object.keys(UNIT_TYPES);

// ── Enemies (ruling 341) ──
// fromRaid: the raid (1st, 2nd, ...) from which the kind may come; raid.index is 0-based, so it may come once index >= fromRaid - 1.
// A boat also needs a river that reaches a map edge. A raid's composition is its mix: { foot, archer, chariot, boat } counts that add
// up to its size (warning.mix, active.mix and the report's mix); a raider carries kind (one of ENEMY_KINDS). A city from before Stage
// 4.6 has an all-foot mix on a warning or raid under way.
export const ENEMY_TYPES = {
  foot: { fromRaid: 1 },
  archer: { fromRaid: 3 },
  chariot: { fromRaid: 6 },
  boat: { fromRaid: 5 },
};
export const ENEMY_KINDS = Object.keys(ENEMY_TYPES);
export const footMix = (size) => Object.fromEntries(ENEMY_KINDS.map((k) => [k, k === 'foot' ? size : 0]));

// ── Matchups (ruling 340) ──
// MATCHUPS[unit][enemy][situation] is the damage multiplier a unit of that kind deals an enemy of that kind in that situation; any
// pairing or situation not listed is 1 (matchup). Situations, judged by combat.js at the unit's tile:
//   wall      on or next to a wall tile or a tower
//   melee     beside its foe (within combat.js BESIDE)
//   open      no wall within 3 tiles
//   nearWall  a wall within 3 tiles
//   gate      holding a gate or a breach (standing on or beside one)
// The raid sheet's "what helps against each enemy" lines are read from this table (Armies track's words).
export const SITUATIONS = ['wall', 'melee', 'open', 'nearWall', 'gate'];
export const MATCHUPS = {
  soldier: { foot: { gate: 1.5 }, archer: { gate: 1.5 }, chariot: { gate: 1.5 }, boat: { gate: 1.5 } },
  archer: { foot: { wall: 2, melee: 0.5 } },
  chariot: { archer: { open: 2, nearWall: 0.5 }, foot: { open: 2, nearWall: 0.5 } },
};
export const matchup = (unit, enemy, situation) => {
  const row = MATCHUPS[unit] && MATCHUPS[unit][enemy];
  return row && Number.isFinite(row[situation]) ? row[situation] : 1;
};

// world.army: away: units sent to the capital by a soldiers request (src/sim/armies.js sendUnits), each { id, kind, barracks, back }
// (back: the day it returns). The Armies track may add fields inside; createWorld and the v6 -> v7 migration both start here.
export const newArmyState = () => ({ away: [] });
export const isArmyState = (a) => Boolean(a) && typeof a === 'object' && !Array.isArray(a) && Array.isArray(a.away)
  && a.away.every((u) => u && typeof u === 'object' && UNIT_KINDS.includes(u.kind) && Number.isInteger(u.back));

// ── The Armies track's rows in the Stage 4.6 lists (src/data/s46.js joins them) ──
// ARMY_BUILDINGS: the archery range and the stables, as BUILDINGS rows; ARMY_UNLOCKS: milestone id -> types; ARMY_DOCK: category id
// -> items (the defence category).
export const ARMY_BUILDINGS = {};
export const ARMY_UNLOCKS = {};
export const ARMY_DOCK = {};
// Tallies: units trained by kind, raiders stopped by archers and by chariots, units sent to the capital.
export const ARMY_TALLY = ['archersTrained', 'chariotsTrained', 'raidersByArchers', 'raidersByChariots', 'unitsSent'];
export const ARMY_FIRSTS = [];
export const ARMY_ACHIEVEMENTS = [];
export const ARMY_TIPS = [];
// The Armies track's raid draws extend RAID_SALT in src/data/raids.js (hash2(world.seed, raid index, RAID_SALT.x), the raids'
// own pattern): mix 8105, mix2 8106, boatEntry 8107, boatBank 8108 (registered there by Track 0).
