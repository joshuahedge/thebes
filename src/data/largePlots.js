// Version 6.0, Track C (rulings 700-719): the Large plot, a 2x2 housing lot where a grand home grows in place (ruling 616: small plots
// stop at Townhouse; homes merged under the old rule keep working). Track 0 (contract, docs/superpowers/notes/2026-10-22-version-6-0-contract.md)
// laid out the shape; Track C owns this file. A leaf data file: it imports nothing (src/data/v60.js joins its lists).
//
// A Large plot is a home (type 'house') of 2x2 with large: true (src/sim/largePlots.js isLargePlot). The flag is the only new field: a
// house without it is a 1x1 plot or, at 2x2, a home merged under the old rule (every v8 city's 2x2 homes), so no save needs it added.
// Rubble keeps no flag either: a Large plot that burns or is wrecked leaves rubble whose `was` names it (src/data/hazards.js, the contract).
//
// The card is a BUILDINGS row of its own (LARGE_BUILDINGS: the dock card, the ghost, the price and the bar all read it) that is never a
// building in the world: placing it lays a house (src/sim/commands.js place, src/sim/largePlots.js makeLargePlot).

// LARGE_PLOT: unlockTier, the home tier whose first appearance in the city unlocks the card (a Townhouse; tests/v60/c checks it against TIERS)
// and the top tier of a small (1x1) plot; opensTier, the tier people move in as (the Manor: its needs are the lot's "Opens when" list);
// size, the lot's tiles a side; type, the card's id.
export const LARGE_PLOT = { unlockTier: 5, opensTier: 6, size: 2, type: 'large_plot' };

// Salts (Track C's range 6051-6059; tests/v60/contract keeps every salt unique). Rename the spares as they are used.
export const LARGE_SALT = { spare1: 6051, spare2: 6052 };

// ── Track C's rows in the Version 6.0 lists (src/data/v60.js joins them) ──
// Tallies: Large plots laid, and whether the city has had a Townhouse (the card's unlock, kept: 0 or 1). Until 6.0 is on main Track C may
// add a key here; after that a new key needs version 10.
export const LARGE_TALLY = ['largePlots', 'largeUnlocked'];
// The card: 2x2, the price of the four plots it stands in for, no road needed to lay it (as a plot), never in the world as this type.
export const LARGE_BUILDINGS = {
  large_plot: { name: 'Large plot', w: 2, d: 2, cost: 20, upkeep: 0, workers: 0, category: 'homes', needsRoad: false, buildable: false },
};
export const LARGE_FIRSTS = [
  { id: 'first_large_plot', check: { kind: 'tally', key: 'largePlots', n: 1 } },
];
export const LARGE_ACHIEVEMENTS = [];
export const LARGE_TIPS = [
  { id: 'large_plot_card', trigger: 'largePlotCard', priority: false },        // the city first has the Large plot card (its first Townhouse)
  { id: 'large_plot_lot', trigger: 'largePlotSheet', priority: false, waits: false },   // an empty Large plot's sheet opened
];
// No goal row of its own: the Manor goal (src/data/goals.js 'manor') is the Large plot's goal, its words and Show me moved to the card (ruling 701).
export const LARGE_GOALS = [];
