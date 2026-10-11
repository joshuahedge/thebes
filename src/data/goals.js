// Goals (spec 4.1, early-game pass 3.2 and 3.3): the opening chain in chapters, then the economy's goals to
// the Capital, and first-time troubles that become goals. Plain data: needs are declarative so missions can
// define goals the same way later; src/sim/goals.js evaluates them. Need kinds: road, houses, building, people,
// tier, routes (open trade routes), noAlert, gold, all. A showMe target is startRoad, houses, focus, alert or
// rocky (any target the interface does not know points at the city's focus).
export const GOAL_REWARD = 25;
export const EVENT_REWARD = 10;    // a first-time trouble put right
export const GUIDE_REWARD = 50;    // paid once, when the guided start's goals are all done

export const GOALS = [
  { id: 'road', chapter: 'first_homes', text: 'Lay a road', reward: GOAL_REWARD, need: { kind: 'road' }, showMe: { category: 'roads', item: 'road', target: 'startRoad' } },
  { id: 'plots', chapter: 'first_homes', text: 'Place 6 housing plots', reward: GOAL_REWARD, need: { kind: 'houses', n: 6 }, showMe: { category: 'homes', item: 'house', target: 'startRoad' } },
  { id: 'well', chapter: 'first_homes', text: 'Build a well so huts become shacks', reward: GOAL_REWARD, need: { kind: 'building', type: 'well', n: 1 }, showMe: { category: 'services', item: 'well', target: 'houses' } },
  { id: 'food', chapter: 'feed', text: 'Build a farm, a granary and a bazaar', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'farm_grain', n: 1 }, { kind: 'building', type: 'granary', n: 1 }, { kind: 'building', type: 'bazaar', n: 1 }] }, showMe: { category: 'food', item: 'farm_grain', target: 'focus' } },
  { id: 'temple', chapter: 'feed', text: 'Build a temple', reward: GOAL_REWARD, need: { kind: 'building', type: 'temple', n: 1 }, showMe: { category: 'services', item: 'temple', target: 'houses' } },
  { id: 'homes_cottage', chapter: 'grow', text: 'Grow 8 homes to Cottage or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 3, n: 8 }, showMe: { category: 'services', item: 'bazaar', target: 'houses' } },
  { id: 'people100', chapter: 'grow', text: 'Reach 100 people', reward: GOAL_REWARD, need: { kind: 'people', n: 100 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'homes_house', chapter: 'grow', text: 'Grow 8 homes to House or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 4, n: 8 }, showMe: { category: 'services', item: 'temple', target: 'houses' } },
  { id: 'town', chapter: 'grow', text: 'Reach 150 people to become a Town', reward: GOAL_REWARD, need: { kind: 'people', n: 150 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  // From Town (spec 4.1, 4.6): each new need arrives with the goal that builds its chain, then a count of homes at
  // the tier that needs it, so one new demand comes at a time; the milestones and the trade route sit between.
  // Each text stays short enough for a two-line caption on a phone at 150% text (tests/ui/celebrate.test.js).
  { id: 'pottery', chapter: 'goods', text: 'Build a clay pit, storehouse and potter', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'clay_pit', n: 1 }, { kind: 'building', type: 'storehouse', n: 1 }, { kind: 'building', type: 'potter', n: 1 }] }, showMe: { category: 'industry', item: 'clay_pit', target: 'focus' } },
  { id: 'homes_townhouse', chapter: 'goods', text: 'Grow 8 homes to Townhouse or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 5, n: 8 }, showMe: { category: 'industry', item: 'potter', target: 'houses' } },
  { id: 'booth_gardens', chapter: 'goods', text: 'Build a booth and two gardens', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'booth', n: 1 }, { kind: 'building', type: 'garden', n: 2 }] }, showMe: { category: 'services', item: 'booth', target: 'houses' } },
  { id: 'manor', chapter: 'goods', text: 'Grow a Manor from four Townhouses', reward: GOAL_REWARD, need: { kind: 'tier', tier: 6, n: 1 }, showMe: { category: 'homes', item: 'garden', target: 'houses' } },
  { id: 'market_town', chapter: 'goods', text: 'Reach 250 people for a Market town', reward: GOAL_REWARD, need: { kind: 'people', n: 250 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'trade_route', chapter: 'goods', text: 'Build a trading post and open a route', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'trading_post', n: 1 }, { kind: 'routes', n: 1 }] }, showMe: { category: 'industry', item: 'trading_post', target: 'startRoad' } },
  { id: 'city', chapter: 'grand', text: 'Reach 400 people to become a City', reward: GOAL_REWARD, need: { kind: 'people', n: 400 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'beer', chapter: 'grand', text: 'Build a barley farm, brewery, orchard', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'farm_barley', n: 1 }, { kind: 'building', type: 'brewery', n: 1 }, { kind: 'building', type: 'farm_fig', n: 1 }] }, showMe: { category: 'industry', item: 'farm_barley', target: 'focus' } },
  { id: 'fine_manors', chapter: 'grand', text: 'Grow 2 homes to Fine manor or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 7, n: 2 }, showMe: { category: 'homes', item: 'statue', target: 'houses' } },
  { id: 'great_city', chapter: 'grand', text: 'Reach 650 people for a Great city', reward: GOAL_REWARD, need: { kind: 'people', n: 650 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'linen', chapter: 'grand', text: 'Build a flax farm and a weaver', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'farm_flax', n: 1 }, { kind: 'building', type: 'weaver', n: 1 }] }, showMe: { category: 'industry', item: 'farm_flax', target: 'focus' } },
  { id: 'villas', chapter: 'grand', text: 'Grow 2 homes to Villa or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 8, n: 2 }, showMe: { category: 'homes', item: 'statue', target: 'houses' } },
  { id: 'capital', chapter: 'grand', text: 'Reach 1,000 people for the Capital', reward: GOAL_REWARD, need: { kind: 'people', n: 1000 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'jewellery', chapter: 'grand', text: 'Build a gem mine and a jeweller', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'gem_mine', n: 1 }, { kind: 'building', type: 'jeweller', n: 1 }] }, showMe: { category: 'industry', item: 'gem_mine', target: 'rocky' } },
  { id: 'estate', chapter: 'grand', text: 'Grow an Estate', reward: GOAL_REWARD, need: { kind: 'tier', tier: 9, n: 1 }, showMe: { category: 'homes', item: 'statue', target: 'houses' } },
];

// The guided start (early-game pass 3.2) runs while any of these is open.
export const GUIDE_GOALS = ['road', 'plots', 'well', 'food', 'temple'];

// First-time troubles (early-game pass 3.3): each becomes a goal at the front of the list the first time
// an alert with its trigger code appears, once per city, and completes when the trouble has cleared.
// A null showMe means Show me opens the city summary.
export const EVENT_GOALS = [
  { id: 'fix_bazaar', trigger: 'bazaar_empty', chapter: 'event', text: 'Get grain to the bazaar', reward: EVENT_REWARD, need: { kind: 'noAlert', code: 'bazaar_empty' }, showMe: { category: 'food', item: 'granary', target: 'alert', code: 'bazaar_empty' } },
  { id: 'more_workers', trigger: 'labour_shortage', chapter: 'event', text: 'Find more workers: place more homes', reward: EVENT_REWARD, need: { kind: 'noAlert', code: 'labour_shortage' }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'more_jobs', trigger: 'unemployment', chapter: 'event', text: 'Make more jobs: build a farm or a bazaar', reward: EVENT_REWARD, need: { kind: 'noAlert', code: 'unemployment' }, showMe: { category: 'food', item: 'farm_grain', target: 'focus' } },
  { id: 'out_of_debt', trigger: 'debt', chapter: 'event', text: 'Get out of debt', reward: EVENT_REWARD, need: { kind: 'gold', n: 0 }, showMe: null },
];
