// Goals (spec 4.1, early-game pass 3.2 and 3.3): the opening chain in chapters, then the next milestone,
// and first-time troubles that become goals. Plain data: needs are declarative so missions can define
// goals the same way later; src/sim/goals.js evaluates them.
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
