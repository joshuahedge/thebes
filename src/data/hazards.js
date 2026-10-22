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

// What a strike does once the grace is over (ruling 681, 682; src/sim/strikes.js). Each is scaled by dangerDraws(world).severity (Relaxed
// milder, Hard harsher). A strike either wrecks a building (it never also burns) or burns it as it always has.
//   chance   the share of strikes that wreck the building: it falls to rubble (one tile each) that keeps what stood there, so it can be
//            cleared and rebuilt; its stock is lost with it, less what the band takes
//   share    a storehouse's goods the band carries off, of each good, rounded up (a granary's food share is RAIDS.foodShare, as ever)
export const WRECK = { chance: 0.35 };
export const LOOT = { storeShare: 0.3 };
// Bands grow later in the game and are led by a chieftain (ruling 683): from the grace's end, each game year adds `perYear` raiders to a raid
// (times severity, at most `max`), and a band of `fromSize` or more has a chieftain: more hit points and a harder hand, and the band loses
// heart and turns back when he falls.
export const BAND_GROWTH = { perYear: 1, max: 4 };
export const CHIEFTAIN = { fromSize: 8, hpFactor: 2, damageFactor: 1.5 };

// Salts for hash2(a, b, (world.seed + HAZARD_SALT.x) | 0), Track B1's range 6021-6049 (tests/v60/contract keeps every salt unique).
// Rename the spares as they are used; never reuse a number.
export const HAZARD_SALT = {
  plagueDraw: 6021, plagueStart: 6022, plagueSpread: 6023, droughtDraw: 6024, droughtLevel: 6025, locustDraw: 6026, locustBand: 6027,
  blightKind: 6028, wreck: 6029, loot: 6030, chieftain: 6031, plagueLength: 6032, droughtWarn: 6033, locustGap: 6034, spare4: 6035,
};

// ── Plague (ruling 684-686; src/sim/plague.js) ──
// A plague starts in a crowded, poorly served home, a warning ahead; each day it may pass to the homes near a sick one; homes lose people
// until they mend and the work near them stops where no physician reaches. A physician, a well and room to breathe slow it; quarantining a
// district stops it spreading across that district's edge (and slows it inside) for a fee, while work in the district stops.
export const PLAGUE = {
  minHomes: 8,               // homes with people in them before a plague can be drawn
  first: [150, 480],         // days after the grace ends (or after a plague ends: `gap`) the first is drawn for, seeded between the two
  gap: [900, 1500],          // days from one plague's end to the next one's draw, divided by the level's chance
  warnDays: 60,              // the warning: two months ahead
  days: [30, 45],            // days a sick home stays sick (seeded)
  lossShare: 0.4,            // most of a home's people a plague takes (times severity, at most lossMax), rounded down
  lossMax: 0.8,
  lossPerDay: 1,             // people a sick home loses each day until it has lost its most
  spread: 0.12,              // a day, to each home near a sick one (times severity), before the three slow-downs below
  reach: 2,                  // tiles between two homes' footprints that a plague crosses (a road between them is 1)
  coverCut: 0.8,             // a staffed physician reaching the home it would pass to cuts the chance by this much (times coverage)
  wellFactor: 0.6,           // a home a working well reaches catches it at this share of the chance
  roomFactor: 0.5,           // a home with room (not crowded: HEALTH.crowdedPerTile) catches it at this share of the chance
  coverFactor: 2,            // a sick home a staffed physician reaches mends this many times as fast
  workReach: 3,              // tiles: a workplace this near a sick home no staffed physician reaches stops work
  quarantine: {
    months: 2,               // how long it holds
    feePerHome: 25,          // gold for each home with people in the district (times the difficulty's cost), at least feeMin
    feeMin: 100,
    insideFactor: 0.25,      // spreading inside the district keeps this share of its chance
  },
};

// ── Drought and the low Nile (ruling 687; src/sim/crops.js) ──
// A low flood is warned a few months ahead (the Nile reading); the year's flood is then Low, and for a year from the water's rise every farm
// yields (1 - cut x severity) of its crop. Full granaries carry the city: the words say whether the stores last.
export const DROUGHT = {
  first: [300, 900],         // days after the grace ends the first is drawn for
  gap: [1080, 1800],         // days between droughts, divided by the level's chance
  leadMonths: [3, 12],       // the warning comes this many months before the water would rise (the next rise at least the lower bound away)
  months: 12,                // how long the lean harvest lasts, from the rise
  cut: 0.5,                  // farms yield 1 - cut x severity: half on Normal
  floor: 0.25,               // never less than this share
};

// ── Locusts and blight (ruling 688; src/sim/crops.js, src/sim/production.js harvestNow) ──
// A warning a month ahead names a band of farms. Locusts eat the crop of the farms in it for `days`; blight leaves part of it. A farm in the
// band can Harvest now: part of a month's crop at once, then it rests.
export const CROPS = {
  first: [60, 420],
  gap: [540, 1080],
  warnDays: 30,
  blightShare: 0.4,          // the share of draws that are blight rather than locusts
  minFarms: 3,               // a band of at least this many farms (the nearest to its centre when the city has few close together)
  maxFarms: 8,
  radius: 7,                 // tiles from the band's centre farm
  locusts: { days: 30, loss: 1 },     // the farms in the band yield (1 - loss x severity) of their crop for `days`, never less than 0
  blight: { days: 90, loss: 0.6 },
};
export const HARVEST_NOW = {
  share: 0.4,                // of a month's crop at the farm's staffing, into the stores at once
  restDays: 15,              // the farm then makes nothing for this long
};
export const CROP_KINDS = ['locusts', 'blight'];

// ── Advice weights (src/sim/hazards.js hazardItems; points as ADVICE's) ──
// An urgent danger (one warned, a plague with sick homes no physician reaches, a low Nile the stores will not carry) is put first: its weight is these
// points on top of the heaviest ordinary item, as a warned raid short of towers is (ruling 600), so the warning is read in the time left to act. A danger
// that needs nothing more of the player weighs only its points.
export const HAZARD_ADVICE = {
  plagueWarned: 6,           // a plague warned
  plagueHome: 4,             // each sick home no staffed physician reaches (a covered one weighs 1)
  droughtWarned: 5,          // a low Nile warned or under way and the stores will not carry the city: + droughtShortMonth for each month short
  droughtCovered: 1,         // ... and the stores will carry it (the warning is still on the sheet, low)
  droughtShortMonth: 2,
  locustFarm: 2,             // each farm in a warned band
  cropBlight: 1,             // each farm in a band under way
};

// ── Track B1's rows in the Version 6.0 lists (src/data/v60.js joins them) ──
// Tallies (world.tally; new and migrated cities start them at 0): plagues begun, homes the plague reached, quarantines paid, droughts,
// locust swarms and blights, early harvests, buildings raiders wrecked, units of goods and food they looted, and wrecked buildings rebuilt
// (ruling 689, added to the contract's list). Until 6.0 is on main Track B1 may add a key here (version 9 is not out yet); after that a
// new key needs version 10.
export const HAZARD_TALLY = ['plagues', 'plagueHomes', 'quarantines', 'droughts', 'swarms', 'blights', 'harvestsEarly', 'wrecked', 'looted', 'rebuilt'];
// Firsts celebrate what the player does about a danger, never the danger itself.
export const HAZARD_FIRSTS = [
  { id: 'first_quarantine', check: { kind: 'tally', key: 'quarantines', n: 1 } },
  { id: 'first_early_harvest', check: { kind: 'tally', key: 'harvestsEarly', n: 1 } },
  { id: 'first_rebuilt', check: { kind: 'tally', key: 'rebuilt', n: 1 } },
];
export const HAZARD_ACHIEVEMENTS = [];   // { id, measure } (src/data/achievements.js)
// One tip for each new danger, at its warning (or, for the plague's quarantine, when it strikes), and one for a building wrecked.
export const HAZARD_TIPS = [
  { id: 'plague_coming', trigger: 'plagueWarned', priority: false },          // a plague was warned
  { id: 'quarantine_choice', trigger: 'plagueStruck', priority: false },      // a plague began
  { id: 'low_nile', trigger: 'droughtWarned', priority: false },              // a low Nile was warned
  { id: 'locust_band', trigger: 'locustsWarned', priority: false },           // locusts or blight were warned over a band of farms
  { id: 'rebuild_wreck', trigger: 'rubbleWrecked', priority: false },         // raiders wrecked a building
];
export const HAZARD_EVENT_GOALS = [];    // event goal rows (src/data/goals.js EVENT_GOALS): e.g. the first plague, drought or locusts
