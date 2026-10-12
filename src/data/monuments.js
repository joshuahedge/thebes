// Monuments (spec 4.16, rulings 179-243), every number a first value: Josh's playtest sets the final ones (ruling 224).
// Seven kinds, each a building type in BUILDINGS (monument: true, category 'monuments'), founded as a site and built
// course by course by builders' guild crews from stone and bricks. Times are game time with the kind's most crews and
// full supply: a full crew lays MONUMENT.unitsPerCrewMonth units a month, so a kind takes crewMonths / crews months.
//   name        the card's and the sheet's name
//   w, d        the footprint as the data draws it (rot 0); rotates: the mastabas turn a quarter (rot 1 swaps w and d)
//   crews       the most crews the site takes (one builders' guild gives one crew)
//   crewMonths  the work in crew-months; it equals the sum of every course's units / unitsPerCrewMonth (a data test)
//   courses     one entry per course, bottom first: the units of stone and of bricks it takes. A course whose recipe names
//               both is laid in proportion, so it waits when either is missing (ruling 239)
//   founding    the gold paid when the site is placed (x the difficulty's cost; never below 0, ruling 227)
//   extra       null, or { kind: 'gilding' | 'capstone', gold }: paid on the day the last course begins (ruling 241)
//   prestige    { courses, done }: the share earned course by course (rounded down, ruling 242) and on completion
//   desirability  the finished monument's values by distance 1-6 (spec 4.7); a site under way gives SITE_DESIRABILITY
//   unlock      { milestone } or { milestone, prestige }: the pyramids also need that much prestige (ruling 200)
export const MONUMENT_KINDS = ['obelisk_small', 'obelisk_large', 'colossus', 'mastaba_small', 'mastaba_large', 'pyramid_small', 'pyramid_great'];

// n courses of the same recipe.
const even = (n, stone, bricks = 0) => Array.from({ length: n }, () => ({ stone, bricks }));

export const MONUMENTS = {
  obelisk_small: {
    name: 'Small obelisk', w: 1, d: 1, rotates: false, crews: 1, crewMonths: 3, courses: even(3, 20),
    founding: 150, extra: null, prestige: { courses: 5, done: 5 }, desirability: [6, 5, 4, 3, 2, 1], unlock: { milestone: 'city' },
  },
  obelisk_large: {
    name: 'Large obelisk', w: 1, d: 1, rotates: false, crews: 2, crewMonths: 18, courses: even(4, 90),
    founding: 400, extra: { kind: 'gilding', gold: 1000 }, prestige: { courses: 15, done: 15 }, desirability: [10, 8, 6, 4, 2, 1], unlock: { milestone: 'city' },
  },
  colossus: {
    name: 'Colossus', w: 2, d: 2, rotates: false, crews: 2, crewMonths: 48, courses: even(6, 160),
    founding: 600, extra: null, prestige: { courses: 25, done: 25 }, desirability: [12, 10, 8, 6, 4, 2], unlock: { milestone: 'great_city' },
  },
  // Bricks for the core courses, stone for the top (facing) course: 1,620 bricks and 540 stone.
  mastaba_small: {
    name: 'Small mastaba', w: 3, d: 2, rotates: true, crews: 3, crewMonths: 108, courses: [...even(3, 0, 540), ...even(1, 540)],
    founding: 1000, extra: null, prestige: { courses: 35, done: 35 }, desirability: [10, 8, 6, 4, 2, 1], unlock: { milestone: 'great_city' },
  },
  // 3,840 bricks and 960 stone, in five equal courses (contract note 4: the spec's "about 3,600 and 1,200").
  mastaba_large: {
    name: 'Large mastaba', w: 4, d: 3, rotates: true, crews: 4, crewMonths: 240, courses: [...even(4, 0, 960), ...even(1, 960)],
    founding: 2000, extra: null, prestige: { courses: 55, done: 55 }, desirability: [14, 12, 10, 8, 6, 4], unlock: { milestone: 'capital' },
  },
  // Stone for the courses, bricks for the ramp (15% of each course): 6,528 stone and 1,152 bricks.
  pyramid_small: {
    name: 'Small pyramid', w: 4, d: 4, rotates: false, crews: 4, crewMonths: 384, courses: even(8, 816, 144),
    founding: 3000, extra: null, prestige: { courses: 80, done: 80 }, desirability: [16, 14, 12, 10, 8, 6], unlock: { milestone: 'capital', prestige: 100 },
  },
  // 12,240 stone and 2,160 bricks, then the gold capstone.
  pyramid_great: {
    name: 'Great pyramid', w: 7, d: 7, rotates: false, crews: 4, crewMonths: 720, courses: even(12, 1020, 180),
    founding: 6000, extra: { kind: 'capstone', gold: 5000 }, prestige: { courses: 135, done: 135 }, desirability: [24, 20, 16, 12, 10, 8], unlock: { milestone: 'capital', prestige: 300 },
  },
};

// The materials monuments use (GOODS kind 'material', src/data/goods.js), in the order sheets list them.
export const MATERIALS = ['stone', 'bricks'];

// The rules every kind shares (spec 4.5, 4.11, 4.16; rulings 184-191, 237-244).
export const MONUMENT = {
  unitsPerCrewMonth: 20,   // a full crew lays 20 units a month (two-thirds of a unit a day); below MIN_STAFF_RATIO it stops
  goldPerUnit: 5,          // work gold: 5 a unit laid (100 a full crew-month) x the difficulty's cost, whole gold, fraction carried
  crewReach: 12,           // a builders' guild works the nearest unpaused, unfinished site with room within this many road tiles
  producerReach: 12,       // a quarry or brickworks delivers to a site within its producer reach (BUILDINGS[..].producerReach)
  supplyReach: 16,         // a site also draws from storehouses within this many road tiles
  stockPerCrew: 40,        // a site's stockpile holds at most this x its kind's most crews, never more of one than its courses need
  stallDays: 3,            // a site with no work this many days in a row (unpaused, unfinished, on a road) is stalled (a warning)
  demolishRefund: 0.25,    // demolishing a monument or site refunds a quarter of its founding (ECONOMY.demolishRefund)
};

// A site under way is a little unpleasant to live beside once a road touches it (dust and noise, spec 4.7).
export const SITE_DESIRABILITY = [-3, -2, -1];

// Prestige (spec 4.16, 4.9, 4.19): +1 mood for every moodPer, at most moodMax; the Monuments score part is
// 100 x sqrt(prestige / scoreFull), at most 100. One of each kind is 700.
export const PRESTIGE = { moodPer: 70, moodMax: 10, scoreFull: 700 };

// The monument kinds that unlock by prestige (with their milestone), in order: their days are recorded once reached
// (world.prestigeUnlocks) and stay, as milestones do (ruling 243).
export const PRESTIGE_UNLOCKS = MONUMENT_KINDS.filter((k) => Number.isFinite(MONUMENTS[k].unlock.prestige));

// Placing big footprints (spec 6.5, rulings 208, 209, 231, 232): the nearest-fit search reaches fitRadius tiles (else
// NEAREST_FIT_RADIUS, src/data/ui.js) for footprints of at least bigArea tiles ("3x3 and up": the 4x3 mastaba, the
// pyramids and the palace; the 3x2 mastaba keeps 10, contract note 5); the ghost's silhouette of the finished monument is
// drawn at silhouetteAlpha, and a monument the ghost or a selected building lies behind fades to fadeBehind.
export const MONUMENT_PLACING = { fitRadius: 16, bigArea: 9, silhouetteAlpha: 0.35, fadeBehind: 0.4 };
