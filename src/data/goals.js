// Goals (spec 4.1): the opening chain, then the next milestone. Plain data: needs are declarative so
// missions can define goals the same way later; src/sim/goals.js evaluates them.
export const GOAL_REWARD = 25;

export const GOALS = [
  { id: 'road', text: 'Lay a road', reward: GOAL_REWARD, need: { kind: 'road' }, showMe: { category: 'roads', item: 'road', target: 'startRoad' } },
  { id: 'plots', text: 'Place 6 housing plots', reward: GOAL_REWARD, need: { kind: 'houses', n: 6 }, showMe: { category: 'homes', item: 'house', target: 'startRoad' } },
  { id: 'well', text: 'Build a well so huts become shacks', reward: GOAL_REWARD, need: { kind: 'building', type: 'well', n: 1 }, showMe: { category: 'services', item: 'well', target: 'houses' } },
  { id: 'food', text: 'Build a farm, a granary and a bazaar', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'farm_grain', n: 1 }, { kind: 'building', type: 'granary', n: 1 }, { kind: 'building', type: 'bazaar', n: 1 }] }, showMe: { category: 'food', item: 'farm_grain', target: 'focus' } },
  { id: 'temple', text: 'Build a temple', reward: GOAL_REWARD, need: { kind: 'building', type: 'temple', n: 1 }, showMe: { category: 'services', item: 'temple', target: 'houses' } },
  { id: 'people100', text: 'Reach 100 people', reward: GOAL_REWARD, need: { kind: 'people', n: 100 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'town', text: 'Reach 150 people to become a Town', reward: GOAL_REWARD, need: { kind: 'people', n: 150 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
];
