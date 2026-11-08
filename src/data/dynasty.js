// Version 9.0 "Dynasty", Track D (rulings 1565-1584): the titles a reign can earn and the trait each one leaves its heir. A leaf: it imports nothing.
// The ids are src/data/v90.js HEIRS; src/sim/dynasty.js reads both tables (titleOf, heirFactor), and the words quote them (Track D's text.js section).

// The titles in their order (design section 3, ruling 1565): at the Pass each compares one measure of the reign with its bar, and the highest fit
// (measure over bar) among the titles whose bar is met wins; a tie goes to the earlier row; none met is the Steady. The bars were first values
// (ruling 1566); wave 2's balance check set them from every balance run's measures (rulings 1621-1623): the Unconquered 3 -> 5 raids and the
// Builder 2,000 -> 4,600 units, so the great-work run is the Builder, the 20-year dangers runs the Unconquered and the 6-year capital run the
// Bountiful; the share bars stay (the scripted runs trade little and never set Low, so a fixture earns those two).
//   unconquered  raids beaten, none lost and no tribute paid (never on Peaceful)
//   builder      monument units laid (stone and bricks)
//   merchant     trade income over the bills (wages, upkeep and soldiers' pay), counted at month ends from Market town
//   bountiful    month ends with every Cottage-or-better home fed, over month ends from Town; at least `months` of them
//   generous     month ends at the Low tax rate, over month ends from Town; at least `months`, with High in at most `highMax` of them
export const TITLES = [
  { id: 'unconquered', bar: 5 },
  { id: 'builder', bar: 8000 },   // Version 9.2 (Track S, ruling 1804): was 4600, which the great-work run cleared far above every other title's fit
  { id: 'merchant', bar: 0.25 },   // Version 9.2 (Track S, ruling 1805): was 0.40
  { id: 'bountiful', bar: 0.90, months: 24 },
  { id: 'generous', bar: 0.50, months: 24, highMax: 0.1 },
];

// The heir's trait (design section 4, ruling 1567): a strength and a weakness, each one number read in its lever's one function through
// src/sim/dynasty.js heirFactor (a factor) or, for the Unconquered's first warning and the Generous's High rate, the two helpers beside it.
//   crews      monuments.js baseDayUnits: the units a crew lays a day
//   taxes      economy.js monthFigures: the month's taxes, on the rate's factor (the score's taxes term keeps reading taxesNormal)
//   pay        costs.js soldiersPayOf: every unit's pay, before the captured weapons' share (ruling 1568)
//   sooner     raids.js: every warning comes this many days sooner (the first after the clock starts, and each later one: laterWarnDay)
//   farms      production.js: a farm's daily rate
//   floodLoss  flood.js levelHarvest (so production.js harvestFactor and harvestQuote): a low flood's loss, times this
//   buys       trade.js tradePrices: what a partner pays for each good it buys from the city
//   workshops  production.js: the daily rate of anything that makes one good from another
//   arrivals   immigration.js monthlyArrivals
//   high       palace.js taxFactorOf: the High rate's factor in place of TAX_RATES.high's
export const TRAITS = {
  builder: { crews: 1.15, taxes: 0.95 },
  unconquered: { pay: 0.8, sooner: 30 },   // Version 9.2 (Track S, ruling 1802): was sooner 100 on the first warning only; now every warning, 30 days
  bountiful: { farms: 1.15, floodLoss: 1.5 },
  merchant: { buys: 1.15, workshops: 0.85 },
  generous: { arrivals: 1.2, high: 1.15, taxes: 0.95 },   // Version 9.2 (Track S, ruling 1803): taxes x0.95 at every rate, a cost that lasts (High 1.15 alone cost a city that never sets High nothing)
  steady: {},
};

// A weather loss times `times` (the Bountiful's floodLoss, ruling 1572): a harvest factor under 1 loses `times` as much, never under 0. With times 1 the
// factor comes back untouched (not 1 - (1 - f), which can miss f by a rounding step), so every other city plays exactly as on 8.4. Here, in the leaf,
// because src/sim/flood.js may not import the sim's dynasty.js (world.js imports flood.js).
export const deeperLoss = (factor, times) => (times !== 1 && factor < 1 ? Math.max(0, 1 - (1 - factor) * times) : factor);

// The levers heirFactor multiplies by (the rest are days or a replaced factor, read by their own helpers).
export const FACTOR_LEVERS = ['crews', 'taxes', 'pay', 'farms', 'floodLoss', 'buys', 'workshops', 'arrivals'];

// Pass the throne (design section 2): from City upward. The heir's first-screen line shows while a new heir's city is younger than HEIR_LINE_DAYS.
export const PASS_FROM = 'city';
export const HEIR_LINE_DAYS = 10;
