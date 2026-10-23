// Achievements (spec 3.8): visible from the start with exact conditions, per city, never time-limited,
// missable or grindy, and they never unlock content or pay gold. Measures are declarative; src/sim/
// achievements.js counts them. Names and condition text live in src/ui/text.js (keyed by id).
// Measure kinds:
//   roads      road tiles laid (not part of the start road)        n
//   homes      housing plots, any tier, empty ones included          n
//   buildings  buildings of one type                                 type, n
//   tier       homes at that tier or above                           tier, n
//   people     the most people the city has had                      n
//   tally      a running tally in world.tally                        key, n
//   made       units of a good produced (world.tally.made)            good, n
//   goals     goals completed (event goals included)                n
//   fedAll     every home at Cottage or above fed last month, in a city of at least `people` people
//   waterAll   every lived-in home reached by a working well, at least `homes` of them
//   jobs       at least `people` people and unemployment at most `rate`
//   safeYear   at least `people` people and no building burned for `days` days (counted from Town where its day is known)
// raids: true marks an achievement about raids, which a Peaceful city (no raids, spec 4.18) never earns or lists.
import { S46_ACHIEVEMENTS } from './s46.js';
import { V60_ACHIEVEMENTS } from './v60.js';

export const ACHIEVEMENTS = [
  { id: 'way_in', measure: { kind: 'roads', n: 10 } },
  { id: 'neighbours', measure: { kind: 'homes', n: 10 } },
  { id: 'street', measure: { kind: 'homes', n: 25 } },
  { id: 'busy_streets', measure: { kind: 'homes', n: 50 } },
  { id: 'water_bearer', measure: { kind: 'buildings', type: 'well', n: 5 } },
  { id: 'breadbasket', measure: { kind: 'buildings', type: 'farm_grain', n: 3 } },
  { id: 'plenty', measure: { kind: 'buildings', type: 'granary', n: 2 } },
  { id: 'market_day', measure: { kind: 'buildings', type: 'bazaar', n: 3 } },
  { id: 'faithful', measure: { kind: 'buildings', type: 'temple', n: 2 } },
  { id: 'shack_row', measure: { kind: 'tier', tier: 2, n: 10 } },
  { id: 'cottage_lane', measure: { kind: 'tier', tier: 3, n: 20 } },
  { id: 'house_proud', measure: { kind: 'tier', tier: 4, n: 20 } },
  { id: 'hamlet', measure: { kind: 'people', n: 50 } },
  { id: 'town', measure: { kind: 'people', n: 150 } },
  { id: 'bustling', measure: { kind: 'people', n: 300 } },
  { id: 'good_harvests', measure: { kind: 'tally', key: 'harvested', n: 500 } },
  { id: 'granary_of_the_river', measure: { kind: 'tally', key: 'harvested', n: 2000 } },
  { id: 'steady_books', measure: { kind: 'tally', key: 'profitMonths', n: 6 } },
  { id: 'prosperous', measure: { kind: 'tally', key: 'profitMonths', n: 24 } },
  { id: 'no_one_hungry', measure: { kind: 'fedAll', people: 100 } },
  { id: 'water_for_all', measure: { kind: 'waterAll', homes: 30 } },
  { id: 'busy_hands', measure: { kind: 'jobs', people: 150, rate: 0.05 } },
  { id: 'on_course', measure: { kind: 'goals', n: 9 } },
  { id: 'day_by_day', measure: { kind: 'tally', key: 'dailyDone', n: 10 } },
  { id: 'potters_wheel', measure: { kind: 'made', good: 'pottery', n: 500 } },
  { id: 'merchant_city', measure: { kind: 'tally', key: 'tradeIncome', n: 2000 } },
  { id: 'townhouse_terrace', measure: { kind: 'tier', tier: 5, n: 20 } },
  { id: 'manor_row', measure: { kind: 'tier', tier: 6, n: 5 } },
  { id: 'green_city', measure: { kind: 'buildings', type: 'garden', n: 20 } },
  { id: 'sculpture_garden', measure: { kind: 'buildings', type: 'statue', n: 10 } },
  { id: 'estate_life', measure: { kind: 'tier', tier: 9, n: 1 } },
  { id: 'thousand', measure: { kind: 'people', n: 1000 } },
  // Stage 3 (spec 4.19): danger's four.
  { id: 'fire_brigade', measure: { kind: 'buildings', type: 'firehouse', n: 3 } },
  { id: 'safe_streets', measure: { kind: 'safeYear', people: 500, days: 360 } },
  { id: 'wall_builder', measure: { kind: 'tally', key: 'wallTiles', n: 50 } },
  { id: 'raid_breaker', raids: true, measure: { kind: 'tally', key: 'raidsBeaten', n: 3 } },
  // Stage 4 (spec 4.19, 4.20): the monuments' five and the palace's. Measure kinds (Stage 4): prestige { n } (the city's
  // prestige now), kinds { n } (kinds with a finished monument standing), finished { type, n } (monuments of the type
  // finished), palaceStyle { n } (the palace's style, 0-4: n is the last).
  { id: 'monument_builder', measure: { kind: 'tally', key: 'monumentsDone', n: 3 } },
  { id: 'renowned', measure: { kind: 'prestige', n: 300 } },
  { id: 'seven_wonders', measure: { kind: 'kinds', n: 7 } },
  { id: 'stone_upon_stone', measure: { kind: 'tally', key: 'stoneLaid', n: 5000 } },
  { id: 'gilded_tip', measure: { kind: 'finished', type: 'obelisk_large', n: 1 } },
  { id: 'lapis_and_gold', measure: { kind: 'palaceStyle', n: 4 } },
  // Stage 4.6: each track's achievements (src/data/s46.js S46_ACHIEVEMENTS), with their names and conditions in its text.js section.
  ...S46_ACHIEVEMENTS,
  // Version 6.0 (src/data/v60.js V60_ACHIEVEMENTS): each track's achievements, from its own data file, names in its text.js section.
  ...V60_ACHIEVEMENTS,
];
