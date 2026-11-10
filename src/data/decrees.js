// src/data/decrees.js
// Version 9.3, the weekly decree (spec sections 1 and 5, rulings 1950-1954): the nine decrees, their order and pairs, and the run's length. A leaf: it imports nothing.
// Each decree (every key but measure optional; src/sim/rules.js reads them):
//   factors      { lever: f } multiplied into ruleFactor with the heir's (raidGap, raidSize, granaryHold, sickSpread, fireStart, courtAsk, courtReward, farms, buys, workshops)
//   cost         { building type: f } on costOf          rate     { building type: f } on a building's daily rate
//   unitPay      { unit kind: f } on a unit's pay        reach    { building type: tiles } in place of the data's reach
//   elephantsFrom  the raid index war elephants come from   boatShare  the share of raids that land by boat (at least)
//   floodStep    added to each flood's level step (-1: one step weaker)   forbid  building types that may not be built
//   measure      the bonus part's measure (src/sim/score.js decreeMeasure)   bar  the measure at which the part is 100 (Track K)
//   medals       [bronze, silver, gold] out of 600 (Track K); a pair's are in PAIR_MEDALS
export const DECREES = {
  sea_peoples: { factors: { raidGap: 0.5, raidSize: 1.5 }, cost: { wall: 0.5, gate: 0.5 }, boatShare: 0.5, measure: 'raidsBeaten', bar: 6, medals: [300, 360, 420] },
  low_nile: { factors: { farms: 0.7, granaryHold: 2 }, floodStep: -1, measure: 'fedMonths', bar: 50, medals: [300, 360, 420] },
  plague: { factors: { sickSpread: 3 }, cost: { physician: 0.5 }, measure: 'wellMonths', bar: 50, medals: [300, 360, 420] },
  stone_famine: { rate: { quarry: 0.5, brickworks: 2 }, measure: 'monumentUnits', bar: 3000, medals: [300, 360, 420] },
  vizier_levy: { factors: { courtAsk: 2, courtReward: 2 }, measure: 'requestsMet', bar: 8, medals: [300, 360, 420] },
  open_city: { forbid: ['wall', 'gate'], measure: 'raidsBeaten', bar: 4, medals: [300, 360, 420] },
  golden_caravans: { factors: { buys: 2, workshops: 0.5 }, measure: 'tradeOverBills', bar: 1, medals: [300, 360, 420] },
  fire_season: { factors: { fireStart: 3 }, reach: { firehouse: 12 }, measure: 'fireSafeMonths', bar: 60, medals: [300, 360, 420] },
  southern_host: { elephantsFrom: 2, cost: { archery_range: 0.5 }, unitPay: { archer: 0.5 }, measure: 'elephantsFelled', bar: 6, medals: [300, 360, 420] },
};
// Bars and medals above are first values; Track K sets them from the six-year runs (spec section 7).

export const DECREE_ORDER = ['sea_peoples', 'low_nile', 'plague', 'stone_famine', 'vizier_levy', 'open_city', 'golden_caravans', 'fire_season', 'southern_host'];
export const DECREE_PAIRS = [
  ['low_nile', 'golden_caravans'],
  ['sea_peoples', 'fire_season'],
  ['stone_famine', 'vizier_levy'],
  ['southern_host', 'open_city'],
  ['plague', 'low_nile'],
];
export const PAIR_MEDALS = DECREE_PAIRS.map(() => [270, 330, 390]);   // Track K

export const DECREE = { years: 6, endDay: 6 * 12 * 30, epoch: [2026, 47] };   // 2,160 days; the rotation's week 0 is 2026-W47 (Monday 16 November 2026)

// The flood's level step for a world.decree object (0 without one), here in the leaf so src/sim/flood.js may read it (it may not import rules.js).
export function floodStepOf(decree) {
  if (!decree || !Array.isArray(decree.ids)) return 0;
  return decree.ids.reduce((s, id) => s + ((DECREES[id] && DECREES[id].floodStep) || 0), 0);
}
