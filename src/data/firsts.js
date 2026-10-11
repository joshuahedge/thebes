// Firsts (spec 3.6): one small celebration per city for each of these, each paying FIRST_REWARD. Checks are
// declarative so later stages can add firsts for new goods and tiers; src/sim/firsts.js evaluates them.
// The words the player sees live in src/ui/text.js (FIRST_TEXT, keyed by id).
export const FIRST_REWARD = 10;

export const FIRSTS = [
  { id: 'first_family', check: { kind: 'people', n: 1 } },
  { id: 'first_full_home', check: { kind: 'fullHome' } },
  { id: 'first_harvest', check: { kind: 'tally', key: 'harvested', n: 1 } },
  { id: 'first_shack', check: { kind: 'tier', tier: 2 } },
  { id: 'first_cottage', check: { kind: 'tier', tier: 3 } },
  { id: 'first_house', check: { kind: 'tier', tier: 4 } },
  { id: 'first_profit', check: { kind: 'tally', key: 'profitMonths', n: 1 } },
  { id: 'people_100', check: { kind: 'people', n: 100 } },
];
