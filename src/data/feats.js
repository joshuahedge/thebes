// Feats (spec 4.19): named, optional style bonuses, per city. They pay nothing, gate nothing and can be missed; they
// list under achievements in their own group and show when a reign is sealed. Their words are FEAT_TEXT in
// src/ui/text.js; src/sim/feats.js judges them and keeps its running state in world.feats ({ earned, lost, counters }).
// Check kinds (src/sim/feats.js):
//   neverInDebt { milestone }      become the milestone without the treasury ever going below 0
//   fedRun { months, people }      every home at Cottage or above fed for `months` month ends in a row, with `people` or more
//   without { type, milestone }    become the milestone without ever keeping one of that type past undo
//   noneBurned { milestone, days } no building burned for `days` after becoming the milestone
//   cleanRaid                      beat a raid with no building burned, no gold stolen and none of its fires still burning
//   noTribute { milestone }        become the milestone without paying tribute
//   buildings { types, n }         n buildings of these types at once
//   jobs { people, rate }          `people` or more with unemployment at `rate` or less
//   tally { key, n }               a running tally in world.tally
//   before { milestone, day }      become the milestone before this game day (day 720 starts game-year 3)
//   steadyBuild { types }          (Stage 4) finish a monument of one of these types with no month in which its crews stood
//                                  idle for lack of material (site.starved false, and none this month: site.month.starvedDays 0)
//   splitBefore { split, day }     (Stage 4) reach a split (world.splits: the great pyramid finished) before this game day
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
  // Stage 4 (spec 4.19): a mastaba or pyramid built without its crews ever waiting for material, and the great pyramid
  // finished before game-year 25 begins (day 8,640).
  { id: 'steady_hands', check: { kind: 'steadyBuild', types: ['mastaba_small', 'mastaba_large', 'pyramid_small', 'pyramid_great'] } },
  { id: 'swift_pyramid', check: { kind: 'splitBefore', split: 'great_pyramid', day: 8640 } },
];
