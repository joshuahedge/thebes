// Raids, defence and festivals (spec 4.3, 4.13), all tunable. Every random draw is stateless:
// hash2(world.seed, raid index, RAID_SALT.x), so a reload changes nothing.
export const RAIDS = {
  clockPeople: 250,          // the raid clock starts the day the city first has this many people (never on Peaceful)
  firstWarnAfter: 720,       // days from the clock's start to the first warning
  warningDays: 90,           // from the warning to the raiders' arrival
  laterMin: 720,             // later warnings: this many days after the last raid's arrival day (or the day a
  laterMax: 1440,            //   cancelled raid would have arrived), seeded between the two
  firstSize: 3,              // the first raid, at every difficulty
  minSize: 2,
  maxSize: 18,               // Stage 4.5 (ruling 317): was 12
  growthPerYear: 0.1,        // size x (1 + this per year since the raid clock started) ...
  growthMax: 1.5,            // ... at most this
  peoplePerRaider: 125,      // people term = people / 125
  wealthBase: 5000,          // wealth term = clamp((wealth - 5000) / 5000, 0, 4)
  wealthStep: 5000,
  wealthMax: 4,
  adaptLost: 0.6,            // a lost raid sets adaptation to this ...
  adaptStep: 0.2,            // ... and every later raid (beaten, lost or paid off) adds this, up to 1
  raidersPerTower: 3,        // towers needed = ceil(raiders / 3)
  tributeShare: 0.8,         // tribute = round(0.8 x towers needed x the tower's price in this city)
  strikes: 3,                // targets a band strikes before it leaves
  strikeDays: 2,             // days it stays at each
  stealShare: 0.01,          // each raider steals 1% of the treasury per strike ...
  stealMin: 5,               // ... at least 5 ...
  stealMax: 50,              // ... at most 50, never taking the treasury below 0
  retreatShare: 0.5,         // the band turns back once this share (rounded up) has fallen
  twoSidedFrom: 3,           // raid index (the 4th raid) from which a raid may come as two bands ...
  twoSidedChance: 0.35,      // ... with this chance, seeded by hash2(seed, raid index, RAID_SALT.two)
  pillage: [null, 'granary', 'house'],   // a band's strikes by number: the 2nd goes for a granary, the 3rd for a home (else the usual targets)
  foodShare: 0.5,            // a strike at a granary takes this share of each good it holds (rounded up) ...
  fleeShare: 0.25,           // ... and one at a home makes this share of its residents flee (at least 1)
  targets: ['trading_post', 'storehouse', 'bazaar', 'temple'],   // then any other building that is not a home
};

export const RAID_SALT = { gap: 8101, entry: 8102, two: 8103, entry2: 8104 };

// Units (spec 4.13): hit points, tiles moved a day, damage dealt a day.
export const UNITS = {
  raider: { hp: 10, speed: 1, damage: 2 },
  soldier: { hp: 12, speed: 2, damage: 3 },
};

// Defences (spec 4.13). Wall and gate prices are BUILDINGS.wall.cost and BUILDINGS.gate.cost (per tile, times the
// difficulty's cost); the tower and barracks are ordinary buildings in src/data/buildings.js.
export const DEFENCE = {
  wallHp: 40,                // a wall tile
  gateHp: 40,                // a wall tile on a road
  towerOnWallHp: 80,         // a wall tile with a tower on it
  towerRange: 4,             // straight-line tiles
  towerDamage: 4,            // a day, times the tower's staffing ratio, to the nearest raider in range
  patrol: 8,                 // straight-line tiles from the barracks' centre
  soldiersPerBarracks: 4,
  trainDays: 30,             // days to train one soldier at full staff (slower when short-staffed, none below 25%)
  soldierPay: 8,             // gold per soldier per month, in peace too and from a paused barracks
};

// Festivals (spec 4.13): a mood lever at a working temple, from Town.
export const FESTIVAL = {
  from: 'town',
  cost: 200,                 // times the difficulty's cost (festivalCostOf)
  mood: 6,
  days: 90,                  // the mood bonus lasts this long
  every: 360,                // days from one festival to the next
};
