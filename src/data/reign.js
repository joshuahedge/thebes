// Version 6.0, Track A (rulings 640-679): a harder later game. Track 0 (contract, docs/superpowers/notes/2026-10-22-version-6-0-contract.md)
// laid out the shapes below; Track A owns this file, fills in the numbers and may add fields inside each record (never remove these).
// A leaf data file: it imports nothing (src/data/v60.js joins its lists into the shared ones).
// Every number here is a first value: the balance runs (tests/v60/a/, docs/superpowers/notes/2026-10-22-v60-a-balance.md) measure them.

const isRec = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isDay = (v) => v === null || Number.isInteger(v);

// ── The cost scale (src/sim/costs.js costScale) ──
// The multipliers on top of the difficulty's cost that grow with the city (ruling 611). costScale(world) returns one of each; Track 0's
// stub returns this row, so every cost is today's. wages: each worker's monthly wage; upkeep: each building's monthly upkeep; monuments:
// a monument's founding, its work gold and its gilding or capstone; court: what the court asks and the tribute that buys a raid off.
export const COST_SCALE_NONE = Object.freeze({ wages: 1, upkeep: 1, monuments: 1, court: 1 });

// Ruling 640: the rows by rank (MILESTONES id). Below Market town every cost is the data's own. Each rank above Town adds to upkeep and the
// court; wages and monuments grow little until Capital (the capital run's 60-70% band holds a Capital's books, tests/stage4/balance) and
// more beyond it. A city's multiplier is 1 + (row - 1) x its difficulty's cost (src/data/difficulty.js: 0.8 on Relaxed and Peaceful, 1.25
// on Hard), so easier levels keep their lower costs (ruling 641). Money is whole gold: src/sim/economy.js rounds each building's bill.
export const COST_GROWTH = {
  village: COST_SCALE_NONE,
  town: COST_SCALE_NONE,
  market_town: { wages: 1, upkeep: 1.05, monuments: 1, court: 1.05 },
  city: { wages: 1, upkeep: 1.08, monuments: 1, court: 1.1 },
  great_city: { wages: 1.01, upkeep: 1.1, monuments: 1, court: 1.15 },
  capital: { wages: 1.01, upkeep: 1.12, monuments: 1, court: 1.25 },
  great_capital: { wages: 1.08, upkeep: 1.25, monuments: 1.1, court: 1.4 },
  seat: { wages: 1.1, upkeep: 1.3, monuments: 1.15, court: 1.5 },
};

// ── The court's due (ruling 642, src/sim/pressure.js courtDue) ──
// From the year the yearly tribute starts (QUOTA.fromYear, src/data/s47.js) the court takes its due in gold on the first day of each year,
// with the tribute's goods: `treasury` of the gold in the treasury, or `taxes` of a year's taxes at this month's rate, whichever is more, by
// rank; times favour's factor (`favour`: high, steady, low; ruling 643: low favour raises the yearly tribute) and the difficulty's cost;
// halved (`greatWork`) while the great work is under way, the crown's own temple. Rounded to `step`. It is taken even when the treasury
// cannot pay (the city goes into debt): the court sheet, the alert row and Advice say it months ahead (`warnMonths`).
export const COURT_DUE = {
  treasury: { village: 0, town: 0.1, market_town: 0.15, city: 0.2, great_city: 0.3, capital: 0.45, great_capital: 0.45, seat: 0.45 },
  taxes: { village: 0, town: 0.05, market_town: 0.05, city: 0.08, great_city: 0.12, capital: 0.2, great_capital: 0.22, seat: 0.25 },
  favour: { high: 0.75, steady: 1, low: 2 },
  greatWork: 0.25,
  step: 10,
  warnMonths: 3,
};

// ── The court's demands (rulings 644-650, src/sim/demands.js) ──
// From Town (`from`) about once a game year the court offers one demand: goods, gold, a building or soldiers. The first comes `firstMonths`
// after the city became a Town (or after the load, for an old city), each next `gapMonths` after the last was settled. An offer waits
// `offerMonths` for Accept or Decline, then lapses as declined. Declined: favour - favour.declined. Accepted: due `deadlineMonths` (by kind)
// later; met: favour + favour.met and the reward; failed (the deadline passes): favour - favour.failed. Each draw is seeded (REIGN_SALT).
// amounts: goods: [lo, hi] months of the city's output of a good it makes (household goods, foods, raw goods), x the court's scale and
// the difficulty's cost, rounded to `step`, at least `min`; gold: [lo, hi] months of taxes likewise, never more than `reserve` of the treasury
// (none offered when that is under `min`); soldiers: a share of the units at home, at least `min`, leaving one at home, away `months`.
// building: the first of `buildings` (in order) the city may build now, has fewest of and whose card it shows; met once one more of it stands
// (a monument finished) than when it was accepted. rewards: goods: `goods` share of the value (GOOD_VALUE, src/data/court.js); gold: `gold`
// share of the amount paid back; soldiers: `soldier` gold a unit; building: `building` share of its price; at least `min`, rounded to `step`.
export const DEMANDS = {
  from: 'town', firstMonths: 10, gapMonths: [10, 14], offerMonths: 3,
  deadlineMonths: { goods: [8, 12], gold: [4, 6], building: [12, 18], soldiers: [4, 6] },
  favour: { met: [8, 12], failed: [15, 20], declined: 5 },
  amounts: {
    goods: { months: [3, 5], min: 40, step: 10 },
    gold: { months: [1, 2], min: 200, step: 50, reserve: 0.6 },
    soldiers: { share: [0.3, 0.5], min: 2, months: 6 },
  },
  buildings: ['temple', 'statue', 'obelisk_small', 'obelisk_large', 'great_sphinx', 'colossus'],
  rewards: { goods: [0.5, 0.8], gold: [0.25, 0.4], soldier: 60, building: [0.5, 0.8], min: 50, step: 10 },
  logMax: 12,
  // reminderMonths: an accepted demand not yet ready raises the 'demand_due' alert this many months before its deadline. advice: the
  // weights of the 'demand' advice items (src/data/advice.js's points): an offer waiting; an accepted demand not ready (open, plus perMonth
  // for each month inside the reminder); the court's due the treasury cannot pay.
  reminderMonths: 2,
  advice: { offered: 12, open: 8, perMonth: 4, due: 25 },
};

// ── The great work (rulings 652-658: the Great temple, MONUMENTS.great_temple in src/data/monuments.js) ──
// A monument of its own kind, one a city, unlocked at the last rank (Seat of the Two Lands). Its courses go in `stages` of `perStage` courses;
// each stage, as its first course begins, takes its offering of goods from the city's stores (`offerings`, times the difficulty's cost), and
// waits for it while the stores hold less (reason 'waiting_offering'). Finishing the last course wins the reign (world.reign.won): the closing
// scene, the sealed score, then play on.
export const GREAT_WORK = {
  type: 'great_temple', perStage: 2,
  stages: ['foundations', 'court', 'hall', 'sanctuary', 'crown'],
  offerings: [{ good: 'grain', n: 400 }, { good: 'clay', n: 300 }, { good: 'linen', n: 200 }, { good: 'flax', n: 300 }, { good: 'grain', n: 500 }],
};

// ── The reign's end (world.reign, world version 9) ──
//   greatWork  null, or the id of the final great work's building (a monument site: b.site, the src/sim/monuments.js machinery)
//   won        null, or the day the great work was finished: the reign is won (the closing scene in a sheet, the sealed score, play on)
//   closed     whether the closing scene has been seen, so it shows once
//   Track A adds: seal (null, or the sealed score at the win: src/sim/score.js sealReign's record with won: true)
// The ranks beyond Capital are MILESTONES rows (src/data/progression.js), so world.milestone holds them (ruling 621): no field here.
// createWorld and the v8 -> v9 migration both start from this function.
export const newReignState = () => ({ greatWork: null, won: null, closed: false, seal: null });
export const isReignState = (r) => isRec(r) && (r.greatWork === null || Number.isInteger(r.greatWork)) && isDay(r.won) && typeof r.closed === 'boolean'
  && (r.seal === undefined || r.seal === null || isRec(r.seal));

// ── The court's demands (world.demands, world version 9; src/sim/demands.js courtDemands reads them) ──
//   open     demands offered or accepted and not yet met or failed, oldest first. Each a record with at least { id, kind (DEMAND_KINDS),
//            day (offered), due (the deadline day), accepted (boolean) }; Track A adds what it needs (good, type, amount, reward, failure)
//   nextDay  the day the next demand is offered, or null (none drawn yet: a new city, and a migrated one until Track A draws it)
//   nextId   the next demand's id (1 up)
//   log      past demands, newest last ({ id, kind, result: 'met' | 'failed' | 'refused', day }); Track A caps its length
// Track A's fields on an open demand: offerDue (the day an offer lapses), months (the deadline once accepted), good, type, amount, reward
// (gold paid when met), met (favour when met), failed (favour lost when failed), declined (favour lost when declined), had (the count of the
// building when accepted), units (soldiers sent). One demand at a time.
export const DEMAND_KINDS = ['goods', 'gold', 'building', 'soldiers'];
export const newDemandState = () => ({ open: [], nextDay: null, nextId: 1, log: [] });
const isDemand = (d) => isRec(d) && Number.isInteger(d.id) && DEMAND_KINDS.includes(d.kind) && Number.isInteger(d.day) && Number.isInteger(d.due)
  && typeof d.accepted === 'boolean';
export const isDemandState = (s) => isRec(s) && Array.isArray(s.open) && s.open.every(isDemand) && isDay(s.nextDay)
  && Number.isInteger(s.nextId) && s.nextId >= 1 && Array.isArray(s.log) && s.log.every(isRec);

// Salts for hash2(a, b, (world.seed + REIGN_SALT.x) | 0), Track A's range 6001-6019 (tests/v60/contract keeps every salt unique).
// Rename the spares as they are used; never reuse a number.
export const REIGN_SALT = { demandGap: 6001, demandKind: 6002, demandAmount: 6003, demandGood: 6004, demandDeadline: 6005, demandReward: 6006, demandFavour: 6007, demandFailed: 6008 };

// ── Track A's rows in the Version 6.0 lists (src/data/v60.js joins them) ──
// Tallies (world.tally; new and migrated cities start them at 0): demands met and failed (refused counts as failed), great-work stages
// finished. Until 6.0 is on main Track A may add a key here (version 9 is not out yet); after that a new key needs version 10.
export const REIGN_TALLY = ['demandsMet', 'demandsFailed', 'greatWorkStages'];
export const REIGN_BUILDINGS = {};       // type -> BUILDINGS row (the great temple is a monument kind: src/data/monuments.js, so none here)
export const REIGN_FIRSTS = [];          // { id, check } (src/data/firsts.js); words in Track A's text.js section (FIRST_TEXT)
export const REIGN_ACHIEVEMENTS = [];    // { id, measure } (src/data/achievements.js); names in Track A's text.js section
// Tips (ruling 651, progressive disclosure): the first demand offered, the court's due a year before it starts (the yearly tribute's own
// warning year), the ranks beyond Capital (Capital reached) and the great work (its card unlocked). Words in Track A's text.js section.
export const REIGN_TIPS = [
  { id: 'court_demands', trigger: 'demandOffered', priority: false },
  { id: 'court_due', trigger: 'dueWarned', priority: false },
  { id: 'beyond_capital', trigger: 'beyondCapital', priority: false },
  { id: 'great_work', trigger: 'greatWorkUnlocked', priority: false },
];
// Goals (after the Capital's): the two ranks beyond it and the great work (ruling 653). Words are short (a two-line caption at 150% text).
export const REIGN_GOALS = [
  { id: 'great_capital', chapter: 'reign', from: 'capital', text: 'Reach 1,250 people and a Villa: Great Capital', why: 'Beyond Capital each rank needs more people and grander homes.', reward: 25, need: { kind: 'all', of: [{ kind: 'people', n: 1250 }, { kind: 'tier', tier: 8, n: 1 }] }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'seat', chapter: 'reign', from: 'great_capital', text: 'Reach 1,400 people and an Estate: the Seat', why: 'The Seat of the Two Lands may raise the great temple that wins the reign.', reward: 25, need: { kind: 'all', of: [{ kind: 'people', n: 1400 }, { kind: 'tier', tier: 9, n: 1 }] }, showMe: { category: 'homes', item: 'statue', target: 'houses' } },
  { id: 'great_work', chapter: 'reign', from: 'seat', text: 'Raise the great temple to win the reign', why: 'Five stages, each with an offering of goods. Builders\' guilds lay it.', reward: 25, need: { kind: 'finished', type: 'great_temple', n: 1 }, showMe: { category: 'monuments', item: 'great_temple', target: 'focus' } },
];
export const REIGN_EVENT_GOALS = [];     // event goal rows (EVENT_GOALS): none (the demand's own sheet and Advice carry it)
