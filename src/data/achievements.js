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
//   goals      goals completed (event goals included)                n
//   fedAll     every home at Cottage or above fed last month, in a city of at least `people` people
//   waterAll   every lived-in home reached by a working well, at least `homes` of them
//   jobs       at least `people` people and unemployment at most `rate`
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
];
