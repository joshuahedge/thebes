// Monuments (spec 4.16, rulings 179-243), every number a first value: Josh's playtest sets the final ones (ruling 224).
// Seven kinds from Stage 4, and from Stage 4.6 three more (the great sphinx, the sun temple and the step pyramid: rulings 345, 390-392),
// listed here in the order of their cost, small to great, which is the order of the Monuments tab. Each a building type in BUILDINGS (monument: true, category 'monuments'), founded as a site and built
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
// Version 6.0 (Track A, ruling 652): the great temple, the final great work, joins them last: one a city, unlocked at the last rank (Seat of
// the Two Lands), its courses laid in stages that each take an offering of goods (GREAT_WORK in src/data/reign.js).
export const MONUMENT_KINDS = ['obelisk_small', 'obelisk_large', 'great_sphinx', 'colossus', 'mastaba_small', 'mastaba_large', 'sun_temple', 'pyramid_small', 'step_pyramid', 'pyramid_great', 'great_temple'];

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
  // Stage 4.6 (ruling 390): between the large obelisk and the colossus: stone only, 720 of it (the large obelisk's 360, the colossus's 960),
  // 18 months with its two crews (9 and 24); a desirability profile like the colossus's; it comes with the colossus, at Great city.
  great_sphinx: {
    name: 'Great sphinx', w: 3, d: 2, rotates: false, crews: 2, crewMonths: 36, courses: even(6, 120),
    founding: 500, extra: null, prestige: { courses: 20, done: 20 }, desirability: [12, 10, 8, 6, 4, 2], unlock: { milestone: 'great_city' },
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
  // Stage 4.6 (ruling 391): between the large mastaba and the small pyramid: bricks for the three core courses and stone for the three
  // facing courses (3,000 of each; 6,000 units against 4,800 and 7,680), 75 months with its four crews (60 and 96), the widest
  // desirability reach of the lot (6 tiles, all of it high); it comes with the large mastaba, at Capital.
  sun_temple: {
    name: 'Sun temple', w: 3, d: 3, rotates: false, crews: 4, crewMonths: 300, courses: [...even(3, 0, 1000), ...even(3, 1000)],
    founding: 2500, extra: null, prestige: { courses: 65, done: 65 }, desirability: [15, 13, 11, 9, 7, 5], unlock: { milestone: 'capital' },
  },
  // Stone for the courses, bricks for the ramp (15% of each course): 6,528 stone and 1,152 bricks.
  pyramid_small: {
    name: 'Small pyramid', w: 4, d: 4, rotates: false, crews: 4, crewMonths: 384, courses: even(8, 816, 144),
    founding: 3000, extra: null, prestige: { courses: 80, done: 80 }, desirability: [16, 14, 12, 10, 8, 6], unlock: { milestone: 'capital', prestige: 100 },
  },
  // Stage 4.6 (ruling 392): between the small and the great pyramid: ten courses of stone with the ramp's 15% in bricks (9,180 and 1,620; 10,800
  // units against 7,680 and 14,400), 135 months with four crews (96 and 180), no capstone; it comes with Capital (not by prestige: ruling 392).
  step_pyramid: {
    name: 'Step pyramid', w: 4, d: 4, rotates: false, crews: 4, crewMonths: 540, courses: even(10, 918, 162),
    founding: 4500, extra: null, prestige: { courses: 105, done: 105 }, desirability: [20, 17, 14, 11, 9, 7], unlock: { milestone: 'capital' },
  },
  // 12,240 stone and 2,160 bricks, then the gold capstone.
  pyramid_great: {
    name: 'Great pyramid', w: 7, d: 7, rotates: false, crews: 4, crewMonths: 720, courses: even(12, 1020, 180),
    founding: 6000, extra: { kind: 'capstone', gold: 5000 }, prestige: { courses: 135, done: 135 }, desirability: [24, 20, 16, 12, 10, 8], unlock: { milestone: 'capital', prestige: 300 },
  },
  // Version 6.0 (Track A, rulings 652-656): the great temple, a terraced temple of five stages (two courses each, GREAT_WORK.perStage), stone with
  // a tenth in bricks for its ramps: 4,320 stone and 480 bricks, 60 months with its four crews. Each stage begins with an offering of goods
  // (GREAT_WORK.offerings). Finishing it wins the reign. Drawn in the step family (src/render/art/monuments.js), five terraces and a shrine.
  great_temple: {
    name: 'Great temple', w: 5, d: 5, rotates: false, crews: 4, crewMonths: 300, courses: even(10, 540, 60),
    founding: 8000, extra: null, prestige: { courses: 100, done: 100 }, desirability: [24, 20, 16, 12, 10, 8], unlock: { milestone: 'seat' },
  },
};

// The materials monuments use (GOODS kind 'material', src/data/goods.js), in the order sheets list them.
export const MATERIALS = ['stone', 'bricks'];

// The rules every kind shares (spec 4.5, 4.11, 4.16; rulings 184-191, 237-244).
export const MONUMENT = {
  unitsPerCrewMonth: 20,   // a full crew lays 20 units a month (two-thirds of a unit a day); below MIN_STAFF_RATIO it stops
  goldPerUnit: 6.5,        // work gold: 6.5 a unit laid (130 a full crew-month) x the difficulty's cost, whole gold, fraction carried
                           // (Track F: the spec's first value was 5; at 5 the capital run held 64,909 gold at year 6, over its
                           // 60,000; at 6.5 it spends 67.5-68.4% of its taxes with four crews: tests/stage4/balance/capital.test.js)
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
