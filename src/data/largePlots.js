// Version 6.0, Track C (rulings 700-719): the Large plot, a 2x2 housing lot where a grand home grows in place (ruling 616: small plots
// stop at Townhouse; homes merged under the old rule keep working). Track 0 (contract, docs/superpowers/notes/2026-10-22-version-6-0-contract.md)
// laid out the shape; Track C owns this file and fills in the numbers. A leaf data file: it imports nothing (src/data/v60.js joins its lists).
//
// A Large plot is a home (type 'house') of 2x2 with large: true (src/sim/largePlots.js isLargePlot). The flag is the only new field: a
// house without it is a 1x1 plot or, at 2x2, a home merged under the old rule (every v8 city's 2x2 homes), so no save needs it added.
// Rubble keeps no flag either: a Large plot that burns or is wrecked leaves rubble whose `was` names it (src/data/hazards.js, the contract).

// LARGE_PLOT: unlockTier, the home tier whose first appearance in the city unlocks the card (a Townhouse; Track C confirms it from TIERS);
// size, the lot's tiles a side.
export const LARGE_PLOT = { unlockTier: 5, size: 2 };

// Salts (Track C's range 6051-6059; tests/v60/contract keeps every salt unique). Rename the spares as they are used.
export const LARGE_SALT = { spare1: 6051, spare2: 6052 };

// ── Track C's rows in the Version 6.0 lists (src/data/v60.js joins them) ──
// Tallies: Large plots laid. Until 6.0 is on main Track C may add a key here; after that a new key needs version 10.
export const LARGE_TALLY = ['largePlots'];
export const LARGE_BUILDINGS = {};       // type -> BUILDINGS row, if the card needs a type of its own (see the contract, section 6)
export const LARGE_FIRSTS = [];
export const LARGE_ACHIEVEMENTS = [];
export const LARGE_TIPS = [];
export const LARGE_GOALS = [];           // goal rows (src/data/goals.js GOALS): e.g. lay a Large plot
