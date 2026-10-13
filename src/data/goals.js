// Goals (spec 4.1, early-game pass 3.2 and 3.3): the opening chain in chapters, then the economy's goals to
// the Capital, and first-time troubles that become goals. Plain data: needs are declarative so missions can
// define goals the same way later; src/sim/goals.js evaluates them. Need kinds: road, houses, building, people,
// tier, routes (open trade routes), noAlert, gold, all. A showMe target is startRoad, houses, focus, alert, fertile, rocky, clay or
// raid (any target the interface does not know points at the city's focus). fertile, rocky and clay aim at the nearest free ground of
// that kind while the goal's next building needs it (a farm, a mine), else at the focus. A goal with `from` (a milestone id)
// waits for that milestone (or the people it takes), where its buildings unlock or its tier can be reached: the list
// the player sees ends before it, so nothing later shows ahead of it (openGoals in src/sim/goals.js). Stage 3: a goal
// with `raids: true` is about raids (or, from Stage 4.5, disease and crime, which Peaceful lacks too), so a Peaceful city (no raids, spec 4.18) never lists it; an event goal's trigger
// may be a list of alert codes, and dirText words it by the direction raiders come from (openGoals).
// Stage 4 (Track D): the opening four say the road rule and the fertile-land rule, each with a one-sentence `why` (ruling
// 265; shown when the goal is opened in place and in the Goals sheet), and the Monuments chapter. New need kinds: finished
// { type, n } (monuments of the type finished, road or not), any { of } (one of the needs), unlocked { type } (a prestige
// unlock reached: world.prestigeUnlocks) and crewNear {} (a monument on a road with a builders' guild in its crew reach).
// A goal with `when` (a need) is left out of the list, without holding up the goals after it, until the need is met (the
// brickworks waits for a mastaba, each pyramid for its prestige). showMe target 'site' aims at the newest monument site.
// An event goal with `causeText` and `causeShowMe` is worded and aimed by its trouble's cause: the first stalled site's
// reason ('{site}' is the site's name), else its own text and showMe.
import { BUILDINGS } from './buildings.js';
import { MONUMENTS } from './monuments.js';

export const GOAL_REWARD = 25;
export const EVENT_REWARD = 10;    // a first-time trouble put right
export const GUIDE_REWARD = 50;    // paid once, when the guided start's goals are all done

export const GOALS = [
  { id: 'road', chapter: 'first_homes', text: 'Lay a road: buildings need one', why: 'Homes and workplaces work only when they touch a road.', reward: GOAL_REWARD, need: { kind: 'road' }, showMe: { category: 'roads', item: 'road', target: 'startRoad' } },
  { id: 'plots', chapter: 'first_homes', text: 'Place 6 housing plots by the road', why: 'Plots off the road stay empty until a road reaches them.', reward: GOAL_REWARD, need: { kind: 'houses', n: 6 }, showMe: { category: 'homes', item: 'house', target: 'startRoad' } },
  { id: 'well', chapter: 'first_homes', text: "Build a well by the homes' road", why: `A well gives water along the road for ${BUILDINGS.well.reach} tiles, so huts become shacks.`, reward: GOAL_REWARD, need: { kind: 'building', type: 'well', n: 1 }, showMe: { category: 'services', item: 'well', target: 'houses' } },
  { id: 'food', chapter: 'feed', text: 'Farm on fertile land, granary, bazaar', why: 'Farms need the fertile land by the river: Layers → Ground shows it. Each needs a road.', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'farm_grain', n: 1 }, { kind: 'building', type: 'granary', n: 1 }, { kind: 'building', type: 'bazaar', n: 1 }] }, showMe: { category: 'food', item: 'farm_grain', target: 'fertile' } },
  { id: 'temple', chapter: 'feed', text: 'Build a temple', reward: GOAL_REWARD, need: { kind: 'building', type: 'temple', n: 1 }, showMe: { category: 'services', item: 'temple', target: 'houses' } },
  // Stage 4.5 (Task 4b, ruling 316): right after the guided start, the first time taxes outrun the bills. It is met by the month's
  // own tally (world.tally.profitMonths, the same count the "First month in profit" caption uses); its Show me opens the homes card (homes pay the taxes),
  // where the forecast section would say what the month brings. It makes the opening chain eleven goals long.
  { id: 'profit', chapter: 'grow', text: 'End a month in profit', why: 'Homes pay taxes; every building costs upkeep and wages. Build homes before luxuries.', reward: GOAL_REWARD, need: { kind: 'profit' }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'homes_cottage', chapter: 'grow', text: 'Grow 8 homes to Cottage or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 3, n: 8 }, showMe: { category: 'services', item: 'bazaar', target: 'houses' } },
  { id: 'people100', chapter: 'grow', text: 'Reach 100 people', reward: GOAL_REWARD, need: { kind: 'people', n: 100 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'homes_house', chapter: 'grow', text: 'Grow 8 homes to House or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 4, n: 8 }, showMe: { category: 'services', item: 'temple', target: 'houses' } },
  { id: 'town', chapter: 'grow', text: 'Reach 150 people to become a Town', reward: GOAL_REWARD, need: { kind: 'people', n: 150 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  // Stage 3 (spec 4.1, 4.19): fire risk begins at Town, so the firehouse comes right after it.
  { id: 'firehouse', chapter: 'danger', text: 'Build a firehouse', reward: GOAL_REWARD, need: { kind: 'building', type: 'firehouse', n: 1 }, showMe: { category: 'services', item: 'firehouse', target: 'houses' } },
  // Stage 4.5 (ruling 320): disease starts at Town, so the physician comes right after the firehouse (not on Peaceful, which has none).
  { id: 'physician', chapter: 'danger', from: 'town', raids: true, text: 'Build a physician', reward: GOAL_REWARD, need: { kind: 'building', type: 'physician', n: 1 }, showMe: { category: 'services', item: 'physician', target: 'houses' } },
  // From Town (spec 4.1, 4.6): each new need arrives with the goal that builds its chain, then a count of homes at
  // the tier that needs it, so one new demand comes at a time; the milestones and the trade route sit between.
  // Each text stays short enough for a two-line caption on a phone at 150% text (tests/ui/celebrate.test.js).
  { id: 'pottery', chapter: 'goods', from: 'town', text: 'Build a clay pit, storehouse and potter', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'clay_pit', n: 1 }, { kind: 'building', type: 'storehouse', n: 1 }, { kind: 'building', type: 'potter', n: 1 }] }, showMe: { category: 'industry', item: 'clay_pit', target: 'clay' } },
  { id: 'homes_townhouse', chapter: 'goods', from: 'town', text: 'Grow 8 homes to Townhouse or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 5, n: 8 }, showMe: { category: 'industry', item: 'potter', target: 'houses' } },
  { id: 'booth_gardens', chapter: 'goods', from: 'town', text: 'Build a booth and two gardens', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'booth', n: 1 }, { kind: 'building', type: 'garden', n: 2 }] }, showMe: { category: 'services', item: 'booth', target: 'houses' } },
  { id: 'manor', chapter: 'goods', text: 'Grow a Manor from four Townhouses', reward: GOAL_REWARD, need: { kind: 'tier', tier: 6, n: 1 }, showMe: { category: 'homes', item: 'garden', target: 'houses' } },
  { id: 'market_town', chapter: 'goods', text: 'Reach 250 people for a Market town', reward: GOAL_REWARD, need: { kind: 'people', n: 250 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'trade_route', chapter: 'goods', from: 'market_town', text: 'Build a trading post and open a route', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'trading_post', n: 1 }, { kind: 'routes', n: 1 }] }, showMe: { category: 'industry', item: 'trading_post', target: 'startRoad' } },
  // Stage 3: the raid clock starts at Market town; the defences come after the trade route (not on Peaceful).
  { id: 'defences', chapter: 'danger', from: 'market_town', raids: true, text: 'Build a tower and a barracks', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'tower', n: 1 }, { kind: 'building', type: 'barracks', n: 1 }] }, showMe: { category: 'defence', item: 'tower', target: 'raid' } },
  // Stage 4.5 (ruling 320): crime starts at Market town, with the police post (not on Peaceful).
  { id: 'police_post', chapter: 'danger', from: 'market_town', raids: true, text: 'Build a police post', reward: GOAL_REWARD, need: { kind: 'building', type: 'police_post', n: 1 }, showMe: { category: 'services', item: 'police_post', target: 'houses' } },
  { id: 'city', chapter: 'grand', text: 'Reach 400 people to become a City', reward: GOAL_REWARD, need: { kind: 'people', n: 400 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'beer', chapter: 'grand', from: 'city', text: 'Build a barley farm, brewery, orchard', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'farm_barley', n: 1 }, { kind: 'building', type: 'brewery', n: 1 }, { kind: 'building', type: 'farm_fig', n: 1 }] }, showMe: { category: 'industry', item: 'farm_barley', target: 'fertile' } },
  { id: 'fine_manors', chapter: 'grand', from: 'city', text: 'Grow 2 homes to Fine manor or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 7, n: 2 }, showMe: { category: 'homes', item: 'statue', target: 'houses' } },
  // Stage 4 (spec 4.19): the Monuments chapter. From City the small obelisk and its supply; a "Found a" goal counts a
  // site once a road touches it (ruling 226), as every "Build a" goal does.
  { id: 'found_obelisk', chapter: 'monuments', from: 'city', text: 'Found a small obelisk', reward: GOAL_REWARD, need: { kind: 'building', type: 'obelisk_small', n: 1 }, showMe: { category: 'monuments', item: 'obelisk_small', target: 'focus' } },
  { id: 'guild_near', chapter: 'monuments', from: 'city', text: "Build a builders' guild near it", reward: GOAL_REWARD, need: { kind: 'crewNear' }, showMe: { category: 'monuments', item: 'builders_guild', target: 'site' } },
  { id: 'quarry', chapter: 'monuments', from: 'city', text: 'Build a quarry on rocky ground', reward: GOAL_REWARD, need: { kind: 'building', type: 'quarry', n: 1 }, showMe: { category: 'monuments', item: 'quarry', target: 'rocky' } },
  { id: 'finish_obelisk', chapter: 'monuments', from: 'city', text: 'Finish the small obelisk', reward: GOAL_REWARD, need: { kind: 'finished', type: 'obelisk_small', n: 1 }, showMe: { category: 'monuments', item: 'builders_guild', target: 'site' } },
  { id: 'great_city', chapter: 'grand', text: 'Reach 650 people for a Great city', reward: GOAL_REWARD, need: { kind: 'people', n: 650 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'linen', chapter: 'grand', from: 'great_city', text: 'Build a flax farm and a weaver', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'farm_flax', n: 1 }, { kind: 'building', type: 'weaver', n: 1 }] }, showMe: { category: 'industry', item: 'farm_flax', target: 'fertile' } },
  { id: 'villas', chapter: 'grand', from: 'great_city', text: 'Grow 2 homes to Villa or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 8, n: 2 }, showMe: { category: 'homes', item: 'statue', target: 'houses' } },
  // Stage 4: from Great city a colossus or a small mastaba, and the brickworks once a mastaba is founded.
  { id: 'found_colossus', chapter: 'monuments', from: 'great_city', text: 'Found a colossus or a small mastaba', reward: GOAL_REWARD, need: { kind: 'any', of: [{ kind: 'building', type: 'colossus', n: 1 }, { kind: 'building', type: 'mastaba_small', n: 1 }] }, showMe: { category: 'monuments', item: 'colossus', target: 'focus' } },
  { id: 'brickworks', chapter: 'monuments', from: 'great_city', when: { kind: 'any', of: [{ kind: 'building', type: 'mastaba_small', n: 1 }, { kind: 'building', type: 'mastaba_large', n: 1 }] }, text: 'Build a brickworks', reward: GOAL_REWARD, need: { kind: 'building', type: 'brickworks', n: 1 }, showMe: { category: 'monuments', item: 'brickworks', target: 'site' } },
  { id: 'capital', chapter: 'grand', text: 'Reach 1,000 people for the Capital', reward: GOAL_REWARD, need: { kind: 'people', n: 1000 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'jewellery', chapter: 'grand', from: 'capital', text: 'Build a gem mine and a jeweller', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'gem_mine', n: 1 }, { kind: 'building', type: 'jeweller', n: 1 }] }, showMe: { category: 'industry', item: 'gem_mine', target: 'rocky' } },
  { id: 'estate', chapter: 'grand', from: 'capital', text: 'Grow an Estate', reward: GOAL_REWARD, need: { kind: 'tier', tier: 9, n: 1 }, showMe: { category: 'homes', item: 'statue', target: 'houses' } },
  // Stage 4: at Capital the pyramids' prestige, then each pyramid once its prestige unlock is reached (ruling 243).
  { id: 'prestige_pyramids', chapter: 'monuments', from: 'capital', text: `Reach ${MONUMENTS.pyramid_small.unlock.prestige} prestige to unlock the small pyramid`, why: `The great pyramid unlocks at ${MONUMENTS.pyramid_great.unlock.prestige} prestige.`, reward: GOAL_REWARD, need: { kind: 'unlocked', type: 'pyramid_small' }, showMe: { category: 'monuments', item: 'builders_guild', target: 'site' } },
  { id: 'found_pyramid', chapter: 'monuments', from: 'capital', when: { kind: 'unlocked', type: 'pyramid_small' }, text: 'Found the small pyramid', reward: GOAL_REWARD, need: { kind: 'building', type: 'pyramid_small', n: 1 }, showMe: { category: 'monuments', item: 'pyramid_small', target: 'focus' } },
  { id: 'found_great_pyramid', chapter: 'monuments', from: 'capital', when: { kind: 'unlocked', type: 'pyramid_great' }, text: 'Found the great pyramid', reward: GOAL_REWARD, need: { kind: 'building', type: 'pyramid_great', n: 1 }, showMe: { category: 'monuments', item: 'pyramid_great', target: 'focus' } },
];

// The guided start (early-game pass 3.2) runs while any of these is open.
export const GUIDE_GOALS = ['road', 'plots', 'well', 'food', 'temple'];

// First-time troubles (early-game pass 3.3): each becomes a goal at the front of the list the first time
// an alert with its trigger code appears, once per city, and completes when the trouble has cleared.
// A null showMe means Show me opens the city summary.
export const EVENT_GOALS = [
  { id: 'fix_bazaar', trigger: 'bazaar_empty', chapter: 'event', text: 'Get food to the bazaar', reward: EVENT_REWARD, need: { kind: 'noAlert', code: 'bazaar_empty' }, showMe: { category: 'food', item: 'granary', target: 'alert', code: 'bazaar_empty' } },
  { id: 'more_workers', trigger: 'labour_shortage', chapter: 'event', text: 'Find more workers: place more homes', reward: EVENT_REWARD, need: { kind: 'noAlert', code: 'labour_shortage' }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'more_jobs', trigger: 'unemployment', chapter: 'event', text: 'Make more jobs: build a farm or a bazaar', reward: EVENT_REWARD, need: { kind: 'noAlert', code: 'unemployment' }, showMe: { category: 'food', item: 'farm_grain', target: 'fertile' } },
  { id: 'out_of_debt', trigger: 'debt', chapter: 'event', text: 'Get out of debt', reward: EVENT_REWARD, need: { kind: 'gold', n: 0 }, showMe: null },
  // Stage 3 (spec 4.1, 4.19): the first fire, covered or not, and the first raid warning. Each asks for a building, so it
  // completes when that is built (a fire goes out by itself); one whose building already stands never joins the list.
  { id: 'fire_firehouse', trigger: ['fire', 'blaze'], chapter: 'event', text: 'Build a firehouse near the fire', reward: EVENT_REWARD, need: { kind: 'building', type: 'firehouse', n: 1 }, showMe: { category: 'services', item: 'firehouse', target: 'alert', code: ['fire', 'blaze'] } },
  {
    id: 'raid_tower', trigger: 'raid_warning', chapter: 'event', raids: true, text: 'Build a tower facing the raiders', reward: EVENT_REWARD, need: { kind: 'building', type: 'tower', n: 1 }, showMe: { category: 'defence', item: 'tower', target: 'raid' },
    dirText: { east: 'Build a tower facing the east', west: 'Build a tower facing the west', north: 'Build a tower facing the north', south: 'Build a tower facing the south' },
    dirsText: 'Build towers facing {dirs}',   // a two-sided raid from two edges names both ("east and south"), in band order; at most 36 characters
  },
  // Stage 4 (spec 4.19): the first stalled monument site, worded and aimed by its cause (ruling 245's reason codes); it is
  // done once no site is stalled. A cause with no build card to fix it (gold) opens the city summary.
  {
    id: 'fix_site', trigger: 'site_stalled', chapter: 'event', text: 'Get the monument site working again', reward: EVENT_REWARD, need: { kind: 'noAlert', code: 'site_stalled' },
    showMe: { category: 'monuments', item: 'quarry', target: 'alert', code: 'site_stalled' },
    causeText: {
      no_crew: 'Get a crew to the {site}', crew_short: "Find workers for the {site}'s guild", crew_burning: "Save the {site}'s guild from the fire",
      no_gold: 'Find gold for the {site}', waiting_gilding: 'Find gold for the {site}', waiting_capstone: 'Find gold for the {site}',
      no_stone: 'Get stone to the {site}', no_bricks: 'Get bricks to the {site}',
    },
    causeShowMe: {
      no_crew: { category: 'monuments', item: 'builders_guild', target: 'alert', code: 'site_stalled' },
      crew_short: { category: 'homes', item: 'house', target: 'houses' },
      crew_burning: { category: 'services', item: 'firehouse', target: 'alert', code: 'site_stalled', guild: true },   // at the burning guild
      no_gold: null, waiting_gilding: null, waiting_capstone: null,
      no_stone: { category: 'monuments', item: 'quarry', target: 'alert', code: 'site_stalled' },
      no_bricks: { category: 'monuments', item: 'brickworks', target: 'alert', code: 'site_stalled' },
    },
  },
  // Stage 4.6 (ruling 371, Court track): the first time a letter from the court arrives (the guided one: the trading goal opens the court), it joins the
  // list at the front, and is met once that letter is answered (sent, refused or past its deadline; a card answered first counts too). Built as an event goal, not an opening-chain goal (ruling 380). Show me opens the summary, where the court's row is.
  { id: 'court_letter', trigger: 'court_letter', chapter: 'event', text: 'Answer the letter from the court', why: "Open it from the alert row or the summary. Sending what it asks earns the capital's favour.", reward: EVENT_REWARD, need: { kind: 'courtAnswered' }, showMe: null },
];

// The opening chain (spec 4.1): Founded Thebes, already ticked when a city starts (an endowed start: it pays nothing and is
// never in GOALS, so nothing completes it), and the goals up to and including OPENING_LAST make eleven, so the strip opens
// at "1 of 11" (Stage 4.5 added the profit goal after the temple).
export const FOUNDED = { id: 'founded', chapter: 'first_homes', text: 'Founded Thebes' };
export const OPENING_LAST = 'town';
