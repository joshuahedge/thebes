// Firsts (spec 3.6): one small celebration per city for each of these, each paying FIRST_REWARD. Checks are
// declarative so later stages can add firsts for new goods and tiers; src/sim/firsts.js evaluates them.
// The words the player sees live in src/ui/text.js (FIRST_TEXT, keyed by id). Check kinds: people { n },
// fullHome, tier { tier }, tally { key, n }, made { good, n } (units of a good produced, world.tally.made), and from
// Stage 3 building { type } (one stands) and tallies { keys, n } (the tallies added together).
import { S46_FIRSTS } from './s46.js';
import { S47_FIRSTS } from './s47.js';
import { V60_FIRSTS } from './v60.js';

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
  // Stage 4 (spec 4.19, 4.20): the monuments' four and the palace's first. Check kind unlocked { type } (Stage 4): a prestige
  // unlock reached (world.prestigeUnlocks).
  { id: 'first_guild', check: { kind: 'building', type: 'builders_guild' } },
  { id: 'first_course', check: { kind: 'tally', key: 'courses', n: 1 } },
  { id: 'first_monument', check: { kind: 'tally', key: 'monumentsDone', n: 1 } },
  { id: 'pyramids_unlocked', check: { kind: 'unlocked', type: 'pyramid_small' } },
  { id: 'first_palace', check: { kind: 'building', type: 'palace' } },
  // Stage 4.5 (Task 5): the physician and the police post.
  { id: 'first_physician', check: { kind: 'building', type: 'physician' } },
  { id: 'first_police_post', check: { kind: 'building', type: 'police_post' } },
  // Stage 4.6: each track's firsts (src/data/s46.js S46_FIRSTS), with their words in the track's text.js section.
  ...S46_FIRSTS,
  // Stage 4.7 (src/data/s47.js S47_FIRSTS): an oasis in the desert.
  ...S47_FIRSTS,
  // Version 6.0 (src/data/v60.js V60_FIRSTS): each track's firsts, from its own data file, words in its text.js section.
  ...V60_FIRSTS,
];
