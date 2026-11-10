// src/data/decrees.js
// Version 9.3, the weekly decree (spec sections 1 and 5, rulings 1950-1954): the nine decrees, their order and pairs, and the run's length. A leaf: it imports nothing.
// Each decree (every key but measure optional; src/sim/rules.js reads them):
//   factors      { lever: f } multiplied into ruleFactor with the heir's (raidGap, raidSize, granaryHold, sickSpread, fireStart, courtAsk, courtReward, farms, buys, workshops)
//   cost         { building type: f } on costOf          rate     { building type: f } on a building's daily rate
//   unitPay      { unit kind: f } on a unit's pay        reach    { building type: tiles } in place of the data's reach
//   elephantsFrom  the raid index war elephants come from   boatShare  the share of raids that land by boat (at least)
//   boatsFrom    the raid index boats come from (Track K, ruling 1989); both "from"s are read against the raid's stage (src/sim/raids.js raidStage), so 1 is every raid after the first
//   floodStep    added to each flood's level step (-1: one step weaker)   forbid  building types that may not be built
//   measure      the bonus part's measure (src/sim/score.js decreeMeasure)   bar  the measure at which the part is 100 (Track K)
//   medals       [bronze, silver, gold] out of 600 (Track K); a pair's are in PAIR_MEDALS
// Fix A (rulings 1990, 1991): the most a months-measure bar may be. A run counts a month only from Town, and the scripted run reaches Town in month 6, so
// 66 is the most the script counts; a bar above what a run can count could never score 100. Every months bar is at most this (tests/v93/k/bars.test.js).
export const MONTHS_BAR_MAX = 60;
export const MONTH_MEASURES = ['fedMonths', 'wellMonths', 'fireSafeMonths'];
// Fix A (ruling 1991): a month with no sick home counts only while the city has at least this many Cottage-or-better homes, so a collapsed city doesn't win The Plague.
export const WELL_MONTH_HOMES = 15;
export const DECREES = {
  sea_peoples: { factors: { raidGap: 0.5, raidSize: 1.5 }, cost: { wall: 0.5, gate: 0.5 }, boatShare: 0.5, boatsFrom: 1, needsRiver: true, measure: 'raidsBeaten', bar: 8, medals: [400, 460, 520] },
  low_nile: { factors: { farms: 0.7, granaryHold: 2 }, floodStep: -1, measure: 'fedMonths', bar: 33, medals: [300, 360, 420] },
  plague: { factors: { sickSpread: 3 }, cost: { physician: 0.5 }, measure: 'wellMonths', bar: 5, medals: [210, 270, 330] },
  stone_famine: { rate: { quarry: 0.5, brickworks: 2 }, measure: 'monumentUnits', bar: 4200, medals: [240, 300, 360] },
  vizier_levy: { factors: { courtAsk: 2 },   // the card says the court asks twice as much and pays double: the reward follows the doubled ask, so no reward factor (Fix A, ruling 1992)
     measure: 'requestsMet', bar: 4, medals: [260, 320, 380] },
  open_city: { forbid: ['wall', 'gate'], measure: 'raidsBeaten', bar: 4, medals: [240, 300, 360] },
  golden_caravans: { factors: { buys: 2, workshops: 0.5 }, measure: 'tradeOverBills', bar: 0.074, medals: [290, 350, 410] },
  fire_season: { factors: { fireStart: 3 }, reach: { firehouse: 12 }, measure: 'fireSafeMonths', bar: MONTHS_BAR_MAX, medals: [310, 370, 430] },
  // elephantsFrom 1 (ruling 1987, was 2): elephantRaid reads it against the raid's stage, and a six-year run never reaches stage 1; stage 0 is every raid after the first.
  southern_host: { elephantsFrom: 1, cost: { archery_range: 0.5 }, unitPay: { archer: 0.5 }, measure: 'elephantsFelled', bar: 4, medals: [410, 470, 530] },
};
// Version 9.3 Track K (rulings 1985-1989): each bar is the scripted six-year run's measure x 1.25 (two significant figures, a count under 10 to the whole
// number), and each [bronze, silver, gold] is that run's total out of 600 rounded down to 10, +60, +120 (tests/v93/k/decrees.test.js, the numbers in ruling 1986).

export const DECREE_ORDER = ['sea_peoples', 'low_nile', 'plague', 'stone_famine', 'vizier_levy', 'open_city', 'golden_caravans', 'fire_season', 'southern_host'];
export const DECREE_PAIRS = [
  ['low_nile', 'golden_caravans'],
  ['sea_peoples', 'fire_season'],
  ['stone_famine', 'vizier_levy'],
  ['southern_host', 'open_city'],
  ['plague', 'low_nile'],
];
export const PAIR_MEDALS = [[310, 370, 430], [410, 470, 530], [250, 310, 370], [410, 470, 530], [230, 290, 350]];   // Track K (ruling 1986), in DECREE_PAIRS' order

export const DECREE = { years: 6, endDay: 6 * 12 * 30, epoch: [2026, 47] };   // 2,160 days; the rotation's week 0 is 2026-W47 (Monday 16 November 2026)

// The flood's level step for a world.decree object (0 without one), here in the leaf so src/sim/flood.js may read it (it may not import rules.js).
export function floodStepOf(decree) {
  if (!decree || !Array.isArray(decree.ids)) return 0;
  return decree.ids.reduce((s, id) => s + ((DECREES[id] && DECREES[id].floodStep) || 0), 0);
}
