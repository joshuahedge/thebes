// Version 9.0 "Dynasty" (wave 0): the lists the shared code reads, kept here so the tracks never fight over src/sim/world.js or src/save/*.
// This file is a leaf: it imports nothing.

// The month-end counts world version 12 adds (design section 3, ruling 1560); new and migrated cities start every one at 0. Track D counts
// them in src/sim/dynasty.js countDynastyMonth: the month ends at Town or above, those with every Cottage-or-better home fed, and from
// Market town the trade income and the bills (wages, upkeep and soldiers' pay), for the Bountiful, the Generous and the Merchant.
export const V90_TALLY = ['townMonths', 'fedMonths', 'tradeGold', 'billsPaid'];

// The heirs a city can be (design section 4): each title's id, which is also the trait its heir's city plays under. world.heir is one of
// these, 'steady' in a new city by default, a migrated one and always in the lesson (ruling 1564); the records' rulers and dynasty use the same ids.
export const HEIRS = ['builder', 'unconquered', 'bountiful', 'merchant', 'generous', 'steady'];
export const HEIR_DEFAULT = 'steady';
export const isHeir = (v) => typeof v === 'string' && HEIRS.includes(v);
