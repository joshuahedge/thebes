// The city score (spec 4.19), all tunable. Five parts, each 0-100, computed from the city's state at every month's
// end (src/sim/score.js scoreOf); the city score is their sum times the difficulty's factor, rounded. Records keep the
// version, so a change to any formula or weight here bumps SCORE_VERSION. Stage 4 made it 2 (score v2): the fifth part,
// Monuments, and medals at 200, 300 and 400 of 500 (rulings 202-204). Version 9.2 made it 3 (Track S, rulings 1795-1799): a term that has not started
// counts nothing and is left out of the part's ceiling, the growth term runs to the Seat of the Two Lands, the Monuments part is measured against all
// eleven kinds, and the medals sit at 240, 320 and 400.
import { PRESTIGE } from './monuments.js';
export const SCORE_VERSION = 3;

export const SCORE_PARTS = ['people', 'prosperity', 'culture', 'safety', 'monuments'];
// Score v1's parts (Stage 3): a v1 record, history row or t1 link has these four only.
export const SCORE_PARTS_V1 = ['people', 'prosperity', 'culture', 'safety'];

// Each part's terms (each 0 to 1) and their weights; a part's weights add up to 100.
export const SCORE_WEIGHTS = {
  people: { growth: 60, homes: 40 },
  prosperity: { taxes: 30, jobs: 30, treasury: 20, trade: 20 },
  culture: { temple: 25, entertainment: 25, bazaar: 25, pleasant: 25 },
  safety: { fire: 40, defence: 40, record: 20 },
  monuments: { prestige: 100 },
};

// The terms' scales (spec 4.19). growth = (milestones reached after Village + the fraction to the next) / growthSteps (v3: the ranks after Village up
// to the Seat, 7; v2 stopped at Capital, 5);
// homes = (resident-weighted average tier - 1) / homesSpan; taxes = last month's tax per person / taxPerPerson;
// jobs = 1 - (unemployment - jobsFull) / (jobsZero - jobsFull), clamped; treasury = 1 at 0 gold or more, falling to 0 at
// treasuryZero; trade = open routes / routes; pleasant = average home desirability / pleasant; record = 1 - burned x
// burnedPenalty - raids lost x raidLostPenalty over the last recordDays, at least 0; prestige = sqrt(prestige /
// prestigeFull), at most 1 (PRESTIGE.scoreFull in src/data/monuments.js, the sum of every kind). v3: a term that has not started counts nothing (fire
// safety until Town, defence until the raid clock starts, and on Peaceful never), see TERMS_START below.
export const SCORE_TERMS = {
  growthSteps: 7,
  homesSpan: 8,
  taxPerPerson: 5,
  jobsFull: 0.05,
  jobsZero: 0.30,
  treasuryZero: -500,
  routes: 2,
  pleasant: 50,
  burnedPenalty: 0.2,
  raidLostPenalty: 0.5,
  recordDays: 360,
  prestigeFull: PRESTIGE.scoreFull,
};

// Each difficulty's score factor (spec 4.18): the most a city can score is 500 times it.
export const SCORE_FACTOR = { peaceful: 0.7, relaxed: 0.8, normal: 1, hard: 1.25 };

// Medals on the parts' total before the factor (spec 4.19); shown in city-score points (times the factor). Score v1's
// were 160, 240 and 320 of 400 (the same 40%, 60% and 80%).
// Score v2's were 200, 300 and 400 of 500. Version 9.2 (Track S, ruling 1796): v3's are 240, 320 and 400, measured on the scripted runs so a new village
// is under Bronze and a reasonable Capital reaches Silver or Gold (the table is in the rulings note).
export const MEDALS_V2 = [
  { id: 'bronze', at: 200 },
  { id: 'silver', at: 300 },
  { id: 'gold', at: 400 },
];
export const MEDALS = [
  { id: 'bronze', at: 240 },
  { id: 'silver', at: 320 },
  { id: 'gold', at: 400 },
];
// Each score version's medals and parts (spec 4.19: a best keeps its own version and is labelled "older scoring"). A
// month-end row, a best or a chronicle entry made under score v1 has v1's four parts and v1's medals (160, 240 and 320 of
// 400), so its medal is read on its own scale and never compared with a v2 total.
export const MEDALS_BY_VERSION = {
  1: [{ id: 'bronze', at: 160 }, { id: 'silver', at: 240 }, { id: 'gold', at: 320 }],
  2: MEDALS_V2,
  3: MEDALS,   // Version 9.2 (Track S, ruling 1796): score v3's own
};
export const PARTS_BY_VERSION = { 1: SCORE_PARTS_V1, 2: SCORE_PARTS, 3: SCORE_PARTS };

// A sealed reign's stamp (spec 4.19) gains a small glyph for each finished monument of these kinds, at most
// STAMP_GLYPHS_MAX on one stamp (in this order: mastabas, then pyramids). Cosmetic.
export const STAMP_KINDS = ['mastaba_small', 'mastaba_large', 'pyramid_small', 'pyramid_great'];
export const STAMP_GLYPHS_MAX = 4;

// The milestones whose first day the world records (world.splits, updateMilestone), in order.
export const SPLIT_MILESTONES = ['town', 'market_town', 'city', 'great_city', 'capital'];
// Score v2's seven splits (spec 4.19, ruling 204), in the share link's order: the five milestones, then the day the
// pyramids unlocked (Capital and 100 prestige both held) and the day the great pyramid was finished. world.splits holds
// all seven under these keys (src/sim/monuments.js updatePrestigeUnlocks records the last two).
export const SPLITS = [...SPLIT_MILESTONES, 'pyramids', 'great_pyramid'];

// Records on the device (src/save/records.js): the localStorage key, and the most city rows and chronicle entries
// each list keeps (the oldest go first, never a best).
export const RECORDS_KEY = 'thebes.records';
export const RECORDS_MAX = 200;

// The share link (spec 4.19): https://joshuahedge.github.io/thebes/#t3.<seed>.<p|r|n|h>.<parts>.<splits>.<check>. A link is
// written in `format`; formats lists every one that still opens: each with its score version, parts and splits. A t1
// link (four parts, five splits) opens as older scoring (ruling 203).
export const SHARE = {
  base: 'https://joshuahedge.github.io/thebes/',
  format: 't3',
  formats: {
    t1: { version: 1, parts: SCORE_PARTS_V1, splits: SPLIT_MILESTONES },
    t2: { version: 2, parts: SCORE_PARTS, splits: SPLITS },
    t3: { version: 3, parts: SCORE_PARTS, splits: SPLITS },   // Version 9.2 (Track S, ruling 1797): written from now on; read as t2 is
  },
  difficulty: { peaceful: 'p', relaxed: 'r', normal: 'n', hard: 'h' },
  checkLength: 4,
};
