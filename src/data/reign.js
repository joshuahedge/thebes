// Version 6.0, Track A (rulings 640-679): a harder later game. Track 0 (contract, docs/superpowers/notes/2026-10-22-version-6-0-contract.md)
// laid out the shapes below; Track A owns this file, fills in the numbers and may add fields inside each record (never remove these).
// A leaf data file: it imports nothing (src/data/v60.js joins its lists into the shared ones).

const isRec = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isDay = (v) => v === null || Number.isInteger(v);

// ── The cost scale (src/sim/costs.js costScale) ──
// The multipliers on top of the difficulty's cost that grow with the city (ruling 611). costScale(world) returns one of each; Track 0's
// stub returns this row, so every cost is today's. wages: each worker's monthly wage; upkeep: each building's monthly upkeep; monuments:
// a monument's founding, its work gold and its gilding or capstone; court: what the court asks and the tribute that buys a raid off.
export const COST_SCALE_NONE = Object.freeze({ wages: 1, upkeep: 1, monuments: 1, court: 1 });

// ── The reign's end (world.reign, world version 9) ──
//   greatWork  null, or the id of the final great work's building (a monument site: b.site, the src/sim/monuments.js machinery)
//   won        null, or the day the great work was finished: the reign is won (the closing scene in a sheet, the sealed score, play on)
//   closed     whether the closing scene has been seen, so it shows once
// The ranks beyond Capital are MILESTONES rows (src/data/progression.js), so world.milestone holds them (ruling 621): no field here.
// createWorld and the v8 -> v9 migration both start from this function.
export const newReignState = () => ({ greatWork: null, won: null, closed: false });
export const isReignState = (r) => isRec(r) && (r.greatWork === null || Number.isInteger(r.greatWork)) && isDay(r.won) && typeof r.closed === 'boolean';

// ── The court's demands (world.demands, world version 9; src/sim/demands.js courtDemands reads them) ──
//   open     demands offered or accepted and not yet met or failed, oldest first. Each a record with at least { id, kind (DEMAND_KINDS),
//            day (offered), due (the deadline day), accepted (boolean) }; Track A adds what it needs (good, type, amount, reward, failure)
//   nextDay  the day the next demand is offered, or null (none drawn yet: a new city, and a migrated one until Track A draws it)
//   nextId   the next demand's id (1 up)
//   log      past demands, newest last ({ id, kind, result: 'met' | 'failed' | 'refused', day }); Track A caps its length
export const DEMAND_KINDS = ['goods', 'gold', 'building', 'soldiers'];
export const newDemandState = () => ({ open: [], nextDay: null, nextId: 1, log: [] });
const isDemand = (d) => isRec(d) && Number.isInteger(d.id) && DEMAND_KINDS.includes(d.kind) && Number.isInteger(d.day) && Number.isInteger(d.due)
  && typeof d.accepted === 'boolean';
export const isDemandState = (s) => isRec(s) && Array.isArray(s.open) && s.open.every(isDemand) && isDay(s.nextDay)
  && Number.isInteger(s.nextId) && s.nextId >= 1 && Array.isArray(s.log) && s.log.every(isRec);

// Salts for hash2(a, b, (world.seed + REIGN_SALT.x) | 0), Track A's range 6001-6019 (tests/v60/contract keeps every salt unique).
// Rename the spares as they are used; never reuse a number.
export const REIGN_SALT = { demandGap: 6001, demandKind: 6002, demandAmount: 6003, demandGood: 6004, demandDeadline: 6005, spare1: 6006, spare2: 6007, spare3: 6008 };

// ── Track A's rows in the Version 6.0 lists (src/data/v60.js joins them) ──
// Tallies (world.tally; new and migrated cities start them at 0): demands met and failed (refused counts as failed), great-work stages
// finished. Until 6.0 is on main Track A may add a key here (version 9 is not out yet); after that a new key needs version 10.
export const REIGN_TALLY = ['demandsMet', 'demandsFailed', 'greatWorkStages'];
export const REIGN_BUILDINGS = {};       // type -> BUILDINGS row (the great work, if it is a new type)
export const REIGN_FIRSTS = [];          // { id, check } (src/data/firsts.js); words in Track A's text.js section (FIRST_TEXT)
export const REIGN_ACHIEVEMENTS = [];    // { id, measure } (src/data/achievements.js); names in Track A's text.js section
export const REIGN_TIPS = [];            // { id, trigger, priority } (src/data/tips.js); words TIP_TEXT / TIP_HELP_TEXT in Track A's text.js section
export const REIGN_GOALS = [];           // goal rows (src/data/goals.js GOALS, after the Capital's): the ranks beyond Capital, the great work
export const REIGN_EVENT_GOALS = [];     // event goal rows (EVENT_GOALS): e.g. the first demand
