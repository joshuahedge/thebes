// Firsts (spec 3.6): one small celebration per city for each of these, each paying FIRST_REWARD. Checks are
// declarative so later stages can add firsts for new goods and tiers; src/sim/firsts.js evaluates them.
// The words the player sees live in src/ui/text.js (FIRST_TEXT, keyed by id). Check kinds: people { n },
// fullHome, tier { tier }, tally { key, n }, made { good, n } (units of a good produced, world.tally.made), and from
// Stage 3 building { type } (one stands) and tallies { keys, n } (the tallies added together).
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
  { id: 'first_pottery', check: { kind: 'made', good: 'pottery', n: 1 } },
  { id: 'first_townhouse', check: { kind: 'tier', tier: 5 } },
  { id: 'first_manor', check: { kind: 'tier', tier: 6 } },
  { id: 'first_caravan', check: { kind: 'tally', key: 'caravans', n: 1 } },
  { id: 'first_fine_manor', check: { kind: 'tier', tier: 7 } },
  { id: 'first_villa', check: { kind: 'tier', tier: 8 } },
  { id: 'first_estate', check: { kind: 'tier', tier: 9 } },
  // Stage 3 (spec 4.19): danger's five.
  { id: 'first_firehouse', check: { kind: 'building', type: 'firehouse' } },
  { id: 'first_fire_out', check: { kind: 'tallies', keys: ['blazesOut', 'firesOut'], n: 1 } },
  { id: 'first_wall', check: { kind: 'tally', key: 'wallTiles', n: 1 } },
  { id: 'first_tower', check: { kind: 'building', type: 'tower' } },
  { id: 'first_raid_beaten', check: { kind: 'tally', key: 'raidsBeaten', n: 1 } },
];
