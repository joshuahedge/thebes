// The city score (spec 4.19), all tunable. Four parts, each 0-100, computed from the city's state at every month's
// end (src/sim/score.js scoreOf); the city score is their sum times the difficulty's factor, rounded. Records keep the
// version, so a change to any formula or weight here bumps SCORE_VERSION (Stage 4's Monuments part makes it 2).
export const SCORE_VERSION = 1;

export const SCORE_PARTS = ['people', 'prosperity', 'culture', 'safety'];

// Each part's terms (each 0 to 1) and their weights; a part's weights add up to 100.
export const SCORE_WEIGHTS = {
  people: { growth: 60, homes: 40 },
  prosperity: { taxes: 30, jobs: 30, treasury: 20, trade: 20 },
  culture: { temple: 25, entertainment: 25, bazaar: 25, pleasant: 25 },
  safety: { fire: 40, defence: 40, record: 20 },
};

// The terms' scales (spec 4.19). growth = (milestones reached after Village + the fraction to the next) / growthSteps;
// homes = (resident-weighted average tier - 1) / homesSpan; taxes = last month's tax per person / taxPerPerson;
// jobs = 1 - (unemployment - jobsFull) / (jobsZero - jobsFull), clamped; treasury = 1 at 0 gold or more, falling to 0 at
// treasuryZero; trade = open routes / routes; pleasant = average home desirability / pleasant; record = 1 - burned x
// burnedPenalty - raids lost x raidLostPenalty over the last recordDays, at least 0.
export const SCORE_TERMS = {
  growthSteps: 5,
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
};

// Each difficulty's score factor (spec 4.18): the most a city can score is 400 times it.
export const SCORE_FACTOR = { peaceful: 0.7, relaxed: 0.8, normal: 1, hard: 1.25 };

// Medals on the parts' total before the factor (spec 4.19); shown in city-score points (times the factor).
export const MEDALS = [
  { id: 'bronze', at: 160 },
  { id: 'silver', at: 240 },
  { id: 'gold', at: 320 },
];

// The milestones whose first day the world records (world.splits) and the share link carries, in order.
export const SPLIT_MILESTONES = ['town', 'market_town', 'city', 'great_city', 'capital'];

// Records on the device (src/save/records.js): the localStorage key, and the most city rows and chronicle entries
// each list keeps (the oldest go first, never a best).
export const RECORDS_KEY = 'thebes.records';
export const RECORDS_MAX = 200;

// The share link (spec 4.19): https://joshuahedge.github.io/thebes/#t1.<seed>.<p|r|n|h>.<parts>.<splits>.<check>.
export const SHARE = {
  base: 'https://joshuahedge.github.io/thebes/',
  format: 't1',
  difficulty: { peaceful: 'p', relaxed: 'r', normal: 'n', hard: 'h' },
  checkLength: 4,
};
