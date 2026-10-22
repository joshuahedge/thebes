// Version 6.0, Track B1 (rulings 680-699): the dangers: plague, drought and the low Nile, locusts and blight, and what raiders do when
// they get through (burn, wreck, loot). Track 0 (contract, docs/superpowers/notes/2026-10-22-version-6-0-contract.md) laid out the shapes
// and the grace; Track B1 owns this file, fills in the numbers and may add fields inside each record (never remove these). A leaf data
// file: it imports nothing (src/data/v60.js joins its lists into the shared ones).

const isRec = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isDay = (v) => v === null || Number.isInteger(v);

// ── The grace (ruling 615, 623) ──
// No new danger acts before world.hazards.graceUntil: a new city's is GRACE_DAYS (three game years from day 0), a city loaded from a
// version 8 save gets its load day plus GRACE_DAYS (the v8 -> v9 migration), so an old city meets nothing new for three game years.
export const GRACE_DAYS = 3 * 12 * 30;

// ── The dangers' kinds ──
// plague: a plague in the homes (Health layer); drought: a low Nile and a lean harvest; locusts: locusts or blight on a band of farms.
// Each kind's state (world.hazards[kind]), like the raid's:
//   warning  null, or the danger on its way: at least { day (warned), strikes (the day it arrives) }; Track B1 adds what it names
//   active   null, or the danger under way (Track B1's record: e.g. plague's homes and quarantines, the locusts' farms)
//   nextDay  the day the next one is drawn for, or null (not drawn yet)
//   last     null, or the last one's report (Track B1's record)
export const HAZARD_KINDS = ['plague', 'drought', 'locusts'];
export const newHazardKind = () => ({ warning: null, active: null, nextDay: null, last: null });
// world.hazards (world version 9). createWorld passes GRACE_DAYS; the v8 -> v9 migration the save's day + GRACE_DAYS.
export const newHazardState = (graceUntil = GRACE_DAYS) => ({ graceUntil, ...Object.fromEntries(HAZARD_KINDS.map((k) => [k, newHazardKind()])) });
const isKind = (s) => isRec(s) && (s.warning === null || isRec(s.warning)) && (s.active === null || isRec(s.active)) && isDay(s.nextDay)
  && (s.last === null || isRec(s.last));
export const isHazardState = (h) => isRec(h) && Number.isInteger(h.graceUntil) && HAZARD_KINDS.every((k) => isKind(h[k]));

// ── Difficulty (ruling 624) ──
// What src/sim/hazards.js dangerDraws(world) gives each level: chance multiplies how often a danger is drawn (Relaxed rarer), severity
// how hard it strikes (Relaxed milder), plague false keeps the plague off (Peaceful has no disease: ruling 320). Raids keep their own
// rule (DIFFICULTIES[..].raids: Peaceful has none). Track B1 tunes the numbers.
export const HAZARD_LEVELS = {
  peaceful: { chance: 0.5, severity: 0.5, plague: false },
  relaxed: { chance: 0.5, severity: 0.5, plague: true },
  normal: { chance: 1, severity: 1, plague: true },
  hard: { chance: 1.25, severity: 1.25, plague: true },
};

// ── Raid strikes (src/sim/strikes.js) ──
// The three things a band does to a building it reaches (ruling 625): burn (a blaze through the fire rules; today's strike), wreck (part
// of it falls to rubble, which keeps what stood there: see the contract, rubble's `was`) and loot (goods and food taken from a granary or
// a storehouse). STRIKE_KINDS is the order a strike runs them in; Track B1 adds the numbers (shares, which buildings) here.
export const STRIKE_KINDS = ['burn', 'wreck', 'loot'];

// Salts for hash2(a, b, (world.seed + HAZARD_SALT.x) | 0), Track B1's range 6021-6049 (tests/v60/contract keeps every salt unique).
// Rename the spares as they are used; never reuse a number.
export const HAZARD_SALT = {
  plagueDraw: 6021, plagueStart: 6022, plagueSpread: 6023, droughtDraw: 6024, droughtLevel: 6025, locustDraw: 6026, locustBand: 6027,
  blightKind: 6028, wreck: 6029, loot: 6030, chieftain: 6031, spare1: 6032, spare2: 6033, spare3: 6034, spare4: 6035,
};

// ── Track B1's rows in the Version 6.0 lists (src/data/v60.js joins them) ──
// Tallies (world.tally; new and migrated cities start them at 0): plagues begun, homes the plague reached, quarantines paid, droughts,
// locust swarms and blights, early harvests, buildings raiders wrecked, units of goods and food they looted. Until 6.0 is on main Track
// B1 may add a key here (version 9 is not out yet); after that a new key needs version 10.
export const HAZARD_TALLY = ['plagues', 'plagueHomes', 'quarantines', 'droughts', 'swarms', 'blights', 'harvestsEarly', 'wrecked', 'looted'];
export const HAZARD_FIRSTS = [];         // { id, check } (src/data/firsts.js); words in Track B1's text.js section (FIRST_TEXT)
export const HAZARD_ACHIEVEMENTS = [];   // { id, measure } (src/data/achievements.js)
export const HAZARD_TIPS = [];           // { id, trigger, priority } (src/data/tips.js); words TIP_TEXT / TIP_HELP_TEXT in Track B1's text.js section
export const HAZARD_EVENT_GOALS = [];    // event goal rows (src/data/goals.js EVENT_GOALS): e.g. the first plague, drought or locusts
