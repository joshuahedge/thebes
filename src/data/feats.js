// Feats (spec 4.19): named, optional style bonuses, per city. They pay nothing, gate nothing and can be missed; they
// list under achievements in their own group and show when a reign is sealed. Their words are FEAT_TEXT in
// src/ui/text.js; src/sim/feats.js judges them and keeps its running state in world.feats ({ earned, lost, counters }).
// Check kinds (src/sim/feats.js):
//   neverInDebt { milestone }      become the milestone without the treasury ever going below 0
//   fedRun { months, people }      every home at Cottage or above fed for `months` month ends in a row, with `people` or more
//   without { type, milestone }    become the milestone without ever having a building of that type
//   noneBurned { milestone, days } no building burned for `days` after becoming the milestone
//   cleanRaid                      beat a raid with no building burned and no gold stolen
//   noTribute { milestone }        become the milestone without paying tribute
//   buildings { types, n }         n buildings of these types at once
//   jobs { people, rate }          `people` or more with unemployment at `rate` or less
//   tally { key, n }               a running tally in world.tally
//   before { milestone, day }      become the milestone before this game day (day 720 starts game-year 3)
// raids: true marks a raid feat, which a Peaceful city (no raids, spec 4.18) neither earns nor lists.
export const FEATS = [
  { id: 'debt_free', check: { kind: 'neverInDebt', milestone: 'town' } },
  { id: 'well_fed', check: { kind: 'fedRun', months: 12, people: 100 } },
  { id: 'grain_alone', check: { kind: 'without', type: 'farm_fig', milestone: 'market_town' } },
  { id: 'firewise', check: { kind: 'noneBurned', milestone: 'town', days: 1800 } },
  { id: 'untouched', raids: true, check: { kind: 'cleanRaid' } },
  { id: 'never_bowed', raids: true, check: { kind: 'noTribute', milestone: 'capital' } },
  { id: 'garden_city', check: { kind: 'buildings', types: ['garden', 'statue'], n: 20 } },
  { id: 'full_hands', check: { kind: 'jobs', people: 400, rate: 0.05 } },
  { id: 'merchant_prince', check: { kind: 'tally', key: 'sold', n: 1000 } },
  { id: 'swift_town', check: { kind: 'before', milestone: 'town', day: 720 } },
];
