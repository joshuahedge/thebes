// Stage 4.6, Armies track (rulings 340-341, 380-389): unit types (soldiers, archers, chariots, one building each), enemy types, the
// typed matchup table combat.js reads, the raid's seeded mix and the two new buildings. A leaf data file: it may import raids.js (a
// leaf), never goods.js, buildings.js, progression.js, ui.js, firsts.js, achievements.js or tips.js (they import s46.js, which
// imports this).
import { UNITS, DEFENCE } from './raids.js';

// ── Your units (ruling 340) ──
// Each kind trains at one building type. world.soldiers holds every trained unit of every kind (the name stays from Stage 3), each
// { id, kind, barracks, x, y, hp, hit, task }: kind is one of UNIT_KINDS, barracks the id of the building that trained it (whatever
// its type). A city from before Stage 4.6 has kind 'soldier' on every unit.
//   hp          hit points when trained or back from the capital (ruling 381)
//   speed       tiles walked (or driven) a day
//   damage      dealt a day to one enemy, times the matchup (MATCHUPS) and, for chariots, the horses' feed (ARMY.hungry)
//   range       an archer shoots an enemy up to this many tiles away (straight line); the others strike only beside one
//   patrol      the unit goes out to enemies within this many tiles of its building's centre
//   perBuilding units one building keeps (it trains another when one is wounded or leaves service)
//   trainDays   days to train one at full staff (slower when short of workers, none below 25%)
//   pay         gold a month for each unit at home, in peace too; units away at the capital are not paid
//   grain       chariots only: grain each chariot's horses eat a month (armyMonth), from granaries then storehouses
// The soldier's numbers are Stage 3's (UNITS.soldier, DEFENCE), read from there so the two never disagree.
export const UNIT_TYPES = {
  soldier: { building: 'barracks', hp: UNITS.soldier.hp, speed: UNITS.soldier.speed, damage: UNITS.soldier.damage, range: 0, patrol: DEFENCE.patrol, perBuilding: DEFENCE.soldiersPerBarracks, trainDays: DEFENCE.trainDays, pay: DEFENCE.soldierPay },
  archer: { building: 'archery_range', hp: 8, speed: 2, damage: 2, range: 3, patrol: 10, perBuilding: 4, trainDays: 30, pay: 8 },
  chariot: { building: 'stables', hp: 16, speed: 3, damage: 4, range: 0, patrol: 12, perBuilding: 3, trainDays: 45, pay: 10, grain: 3 },
};
export const UNIT_KINDS = Object.keys(UNIT_TYPES);
// The building type -> the unit kind it trains.
export const UNIT_OF_BUILDING = Object.fromEntries(UNIT_KINDS.map((k) => [UNIT_TYPES[k].building, k]));

// ── Enemies (ruling 341) ──
// fromRaid: the raid (1st, 2nd, ...) from which the kind may come; raid.index is 0-based, so it may come once index >= fromRaid - 1.
// A boat also needs a river that reaches a map edge. A raid's composition is its mix: { foot, archer, chariot, boat } counts that add
// up to its size (warning.mix, active.mix and the report's mix); a raider carries kind (one of ENEMY_KINDS). A city from before Stage
// 4.6 has an all-foot mix on a warning or raid under way.
//   hp, damage   hit points, and damage dealt a day to a unit beside it (or, for a raider that breaks walls, to the wall in its way)
//   speed        tiles a band moves a day when every raider left in it is of this kind (a band moves at its slowest kind's pace)
//   breaksWalls  hits the standing wall tile in its band's way; a band with none of these left is turned by a wall (ruling 383)
//   range        an archer shoots a tower (first) or a unit up to this many tiles away when none is beside it
//   charge       a chariot rides at a unit up to this many tiles away along a line that crosses no wall, gate, water or rocky ground
//   landWithin   boats land on a river bank within this many tiles of a building (ruling 384)
export const ENEMY_TYPES = {
  foot: { fromRaid: 1, hp: UNITS.raider.hp, damage: UNITS.raider.damage, speed: UNITS.raider.speed, breaksWalls: true },
  archer: { fromRaid: 3, hp: 8, damage: 2, speed: 1, breaksWalls: false, range: 4 },
  chariot: { fromRaid: 6, hp: 14, damage: 3, speed: 2, breaksWalls: false, charge: 3 },
  boat: { fromRaid: 5, hp: UNITS.raider.hp, damage: UNITS.raider.damage, speed: UNITS.raider.speed, breaksWalls: true, landWithin: 4 },
};
export const ENEMY_KINDS = Object.keys(ENEMY_TYPES);
export const footMix = (size) => Object.fromEntries(ENEMY_KINDS.map((k) => [k, k === 'foot' ? size : 0]));

// The raid's mix (ruling 382): from its raid on, each kind but foot takes a share of the raid, share = min(max, base + perRaid x
// raids since it first may come) x the difficulty's factor (riskFactor[0] + riskFactor[1] x its risk: 0.75 on Relaxed, 1 on Normal,
// 1.25 on Hard) x a seeded jitter between 1 - jitter and 1 + jitter (hash2(seed, raid index x 4 + kind, RAID_SALT.mix)), rounded; a
// kind that may come brings at least 1 once the raid is minAtSize or more. Foot keep at least footMin of the raid (others give way,
// the largest first). The first raid is always on foot (RAIDS.firstSize). Boats come only on a raid from one side (one band): their
// landing makes the raid's second band.
export const MIX = {
  archer: { base: 0.15, perRaid: 0.03, max: 0.35 },
  chariot: { base: 0.12, perRaid: 0.03, max: 0.25 },
  boat: { base: 0.25, perRaid: 0, max: 0.25 },
  riskFactor: [0.5, 0.5],
  jitter: 0.3,
  minAtSize: 4,
  footMin: 0.4,
};

// ── Matchups (ruling 340) ──
// MATCHUPS[unit][enemy][situation] is the damage multiplier a unit of that kind deals an enemy of that kind in that situation; any
// pairing or situation not listed is 1 (matchup). Situations, judged by combat.js at the unit's tile (ARMY's distances):
//   wall      on or next to a standing wall tile or a tower
//   melee     beside its foe (within combat.js BESIDE)
//   open      no standing wall within ARMY.wallNear tiles
//   nearWall  a standing wall within ARMY.wallNear tiles
//   gate      holding a gate or a breach (standing on or beside one)
// Where more than one applies, their multipliers multiply (ruling 380): an archer on the wall with a raider beside it hits at 2 x 0.5.
// The raid sheet's "what helps against each enemy" lines are read from this table (counterLines in src/sim/armies.js). Raiders by
// boat fight as raiders on foot do once landed.
export const SITUATIONS = ['wall', 'melee', 'open', 'nearWall', 'gate'];
export const MATCHUPS = {
  soldier: { foot: { gate: 1.5 }, archer: { gate: 1.5 }, chariot: { gate: 1.5 }, boat: { gate: 1.5 } },
  archer: { foot: { wall: 2, melee: 0.5 }, boat: { wall: 2, melee: 0.5 } },
  chariot: { archer: { open: 2, nearWall: 0.5 }, foot: { open: 2, nearWall: 0.5 }, boat: { open: 2, nearWall: 0.5 } },
};
export const matchup = (unit, enemy, situation) => {
  const row = MATCHUPS[unit] && MATCHUPS[unit][enemy];
  return row && Number.isFinite(row[situation]) ? row[situation] : 1;
};

// Distances and the rest (ruling 380, 383, 385):
//   wallNear   a standing wall within this many tiles makes a spot nearWall, none makes it open
//   towerHp    a tower on open ground falls after this much damage from enemy archers in one raid (a tower on a wall tile has the
//              tile's DEFENCE.towerOnWallHp, as when raiders break it)
//   hungry     chariots whose horses were not fed at the last month's end deal this share of their damage
export const ARMY = { wallNear: 3, towerHp: 40, hungry: 0.5 };

// world.army: away: units sent to the capital by a soldiers request (src/sim/armies.js sendUnits), each { id, kind, barracks, back }
// (back: the day it returns); fed: whether the chariots' horses had their grain at the last month's end (true until a month finds
// the stores short). createWorld and the v6 -> v7 migration both start here.
export const newArmyState = () => ({ away: [], fed: true });
export const isArmyState = (a) => Boolean(a) && typeof a === 'object' && !Array.isArray(a) && Array.isArray(a.away)
  && a.away.every((u) => u && typeof u === 'object' && UNIT_KINDS.includes(u.kind) && Number.isInteger(u.back))
  && (a.fed === undefined || typeof a.fed === 'boolean');

// ── The Armies track's rows in the Stage 4.6 lists (src/data/s46.js joins them) ──
// ARMY_BUILDINGS: the archery range and the stables, as BUILDINGS rows (desirability: what each adds to the tiles around it by
// distance, as src/data/desirability.js's rows, which reads it from here, ruling 389). ARMY_UNLOCKS: milestone id -> types: both with
// Market town, the walls' milestone (ruling 387: the plan put the range at Town, which would show a locked Defence tab from the first
// minutes; raids and walls start at Market town). ARMY_DOCK: category id -> items.
export const ARMY_BUILDINGS = {
  archery_range: { name: 'Archery range', w: 2, d: 2, cost: 180, upkeep: 10, workers: 6, priority: 'safety', category: 'defence', needsRoad: true, desirability: [-4, -2] },
  stables: { name: 'Stables', w: 2, d: 3, cost: 300, upkeep: 14, workers: 6, priority: 'safety', category: 'defence', needsRoad: true, desirability: [-6, -4, -2] },
};
export const ARMY_UNLOCKS = { market_town: ['archery_range', 'stables'] };
export const ARMY_DOCK = { defence: ['archery_range', 'stables'] };
// Tallies: units trained by kind, raiders stopped by archers and by chariots, units sent to the capital.
export const ARMY_TALLY = ['archersTrained', 'chariotsTrained', 'raidersByArchers', 'raidersByChariots', 'unitsSent'];
export const ARMY_FIRSTS = [
  { id: 'first_archery_range', check: { kind: 'building', type: 'archery_range' } },
  { id: 'first_stables', check: { kind: 'building', type: 'stables' } },
];
export const ARMY_ACHIEVEMENTS = [];
// One tip a building (progressive disclosure, UX rule 5), fired by the Armies seam when one is placed, and one when the first raid
// with enemies other than foot is warned (src/ui/s46/armies.js).
export const ARMY_TIPS = [
  { id: 'archers_on_walls', trigger: 'archeryRangePlaced', priority: false },   // an archery range placed
  { id: 'chariots_in_open', trigger: 'stablesPlaced', priority: false },         // a stables placed
  { id: 'mixed_raid', trigger: 'mixedRaidWarned', priority: false },             // a raid with archers, chariots or boats warned
];
// The Armies track's raid draws extend RAID_SALT in src/data/raids.js (hash2(world.seed, raid index, RAID_SALT.x), the raids'
// own pattern): mix 8105, mix2 8106, boatEntry 8107, boatBank 8108 (registered there by Track 0).
