// Version 5.0 (Task 0, contract docs/superpowers/notes/2026-10-15-version-5-0-contract.md): what city advice (src/sim/advice.js cityAdvice)
// weighs and when. Weight is in points: one point is one home held back one tier from a Shack, so a home held back from a Villa is 8. Gold
// at risk and danger uncovered are put in the same points here. A leaf data file: it imports nothing. Task 8 tunes the numbers.
export const ADVICE = {
  top: 5,                  // the advice sheet shows the first this many (Task 1)
  runOutMonths: 3,         // a home good counts as running out when the stores and stalls hold less than this many months of last month's net use
  goldPerPoint: 10,        // a month's deficit: one point for each this much gold
  goldSoon: 2,             // times this when the treasury goes below 0 within FORECAST.warnMonths (the forecast's goesBelow)
  workerShort: 0.5,        // each job no worker fills
  jobless: 0.25,           // each jobless worker, once the sim counts unemployment (the 'unemployment' alert)
  burning: 8,              // each building on fire that no staffed firehouse reaches (the 'fire' alert)
  fireRisk: 3,             // each building at High fire risk that no staffed firehouse reaches (the 'fire_risk' alert)
  ill: 3,                  // each ill home no staffed physician reaches (the 'illness' alerts' homes)
  crime: 2,                // each home at High crime risk no staffed police post reaches (the 'crime_risk' alerts' homes)
  tower: 10,               // each tower short of what a raid this size needs
  towerWarned: 3,          // times this while a raid is warned (ruling 600: so the first warned raid, 4 towers short, outranks the booth, 120 to 108)
  largePlot: 6,            // Version 6.0 (Track C): Townhouses with every need met and no Large plot in the city: one Large plot, the weight of the Manor it opens as
  locked: 0.5,           // homes held back by a need whose fix is not unlocked yet: times this (the words name the milestone)
  // Task 7: the decorations a low street's fix chooses from (src/sim/advice.js desirabilityFix), each once it is unlocked: the cheapest that
  // lifts the home to its target alone, else the one that lifts it most, at the free tile where it lifts it most.
  decor: ['garden', 'statue', 'sphinx'],
};

// The kinds of advice, in the order that breaks a tie of weight (most urgent first). See the contract, section 1.
// Version 6.0 (Track 0): the new kinds take their places (plague, locusts and drought among the dangers, a court demand after the treasury);
// the old kinds keep their order among themselves, so no city's list moves until a track pushes a new kind (src/sim/v60.js v60Advice).
export const ADVICE_KINDS = ['raid_towers', 'plague', 'fire', 'locusts', 'drought', 'treasury', 'demand', 'illness', 'crime', 'home_need', 'stranded', 'running_out', 'workers_short', 'jobless'];
