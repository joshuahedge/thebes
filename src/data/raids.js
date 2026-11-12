// Raids, defence and festivals (spec 4.3, 4.13), all tunable. Every random draw is stateless:
// hash2(world.seed, raid index, RAID_SALT.x), so a reload changes nothing.
export const RAIDS = {
  clockPeople: 250,          // the raid clock starts the day the city first has this many people (never on Peaceful)
  firstWarnAfter: 300,       // days from the clock's start to the first warning (Version 8.4, rulings 1463, 1485: was 720)
  warningDays: 90,           // from the warning to the raiders' arrival
  laterMin: 360,             // later warnings: this many days after the last raid's arrival day (or the day a
  laterMax: 600,             //   cancelled raid would have arrived), seeded between the two (Version 8.4: were 720 and 1,440)
  leanDays: 60,              // Version 8.4 (ruling 1486): a later raid that would arrive within this many days before Shemu waits for Shemu's first day (0: none; 0 until wave 2)
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
  adaptStep: 0.2,            // ... and every later raid beaten or paid off adds this for each stagePace cycle (1,170 days) to the next raid, up to 1 (ruling 1532: was this a raid)
  raidersPerTower: 3,        // towers needed = ceil(raiders / 3)
  tributeShare: 0.8,         // tribute = round(0.8 x towers needed x the tower's price in this city)
  strikes: 3,                // targets a band strikes before it leaves
  strikeDays: 2,             // days it stays at each
  stealShare: 0.01,          // each raider steals 1% of the treasury per strike ...
  stealMin: 5,               // ... at least 5 ...
  stealMax: 50,              // ... at most 50, never taking the treasury below 0
  retreatShare: 0.5,         // the band turns back once this share (rounded up) has fallen
  twoSidedFrom: 3,           // raid stage (8.3's 4th raid, about 12 years after the clock starts: ruling 1531) from which a raid may come as two bands ...
  twoSidedChance: 0.35,      // ... with this chance, seeded by hash2(seed, raid index, RAID_SALT.two)
  pillage: [null, 'granary', 'house'],   // a band's strikes by number: the 2nd goes for a granary, the 3rd for a home (else the usual targets)
  foodShare: 0.5,            // a strike at a granary takes this share of each good it holds (rounded up) ...
  fleeShare: 0.25,           // ... and one at a home makes this share of its residents flee (at least 1)
  targets: ['trading_post', 'storehouse', 'bazaar', 'temple'],   // then any other building that is not a home
  // Version 8.4 (escalation by years, rulings 1530-1532): 8.3's raid clock, the pace raids grow at. A raid's stage (raidStage in src/sim/raids.js) is the
  // index 8.3's clock would have reached on its warning day: its first warning `first` days after the clock started, each later one a mean `gap` (8.3 drew
  // 720-1,440) after the last arrival, which came `warning` days after its warning. Raids come as often as the clock above says; what grows by the raid
  // (the mix, which kinds may come, two bands, the adaptation's climb) reads the stage, so twice the raids are not twice as hard.
  stagePace: { first: 720, gap: 1080, warning: 90 },
};

// Stage 4.6 (Track 0 registered them for the Armies track): the raid's mix by enemy kind, the second band's, a boat's entry and its bank.
// Version 8.4 (wave 0): elephant (which raids bring them, Track E), panic (a hurt elephant's stampede, E), scouts (their walk, Track R).
export const RAID_SALT = { gap: 8101, entry: 8102, two: 8103, entry2: 8104, mix: 8105, mix2: 8106, boatEntry: 8107, boatBank: 8108, elephant: 8109, panic: 8110, scouts: 8111 };

// Version 8.4, Track R (rulings 1487, 1488): scouts stand at the coming raid's entry for the `days` before each warning (the first included); a beaten
// raid's captured weapons cut every unit's pay by `share` for `days` days, and the next beaten raid restarts the year.
export const SCOUTS = { days: 30, min: 2, max: 3 };
export const SPOILS = { share: 0.25, days: 360 };

// Units (spec 4.13): hit points, tiles moved a day, damage dealt a day.
// Version 10.0.1, Track S (S.2, ruling 2357): raiders 1.5 tiles a day (was 1), soldiers 3 (was 2), so the ratio holds; a band moves a fraction of a tile
// a day by carrying it over (src/sim/raids.js bandDay: 1.5 is three tiles every two days).
export const UNITS = {
  raider: { hp: 10, speed: 1.5, damage: 2 },
  soldier: { hp: 12, speed: 3, damage: 3 },
};

// Defences (spec 4.13). Wall and gate prices are BUILDINGS.wall.cost and BUILDINGS.gate.cost (per tile, times the
// difficulty's cost); the tower and barracks are ordinary buildings in src/data/buildings.js.
export const DEFENCE = {
  wallHp: 40,                // a wall tile
  gateHp: 40,                // a wall tile on a road
  towerOnWallHp: 80,         // a wall tile with a tower on it
  towerRange: 4,             // straight-line tiles
  towerDamage: 4,            // a day, times the tower's staffing ratio, to the nearest raider in range
  // Version 10.0.1, Track S (S.1, ruling 2355): no patrol (was 8 straight-line tiles from the barracks' centre): soldiers go to the nearest raider anywhere.
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
