// Version 6.0, Track C (rulings 700-719): the Large plot (ruling 616). Track 0 (contract,
// docs/superpowers/notes/2026-10-22-version-6-0-contract.md) fixed the names and shapes here; Track C implements them. A Large plot is a
// home (type 'house', so every rule about homes still holds: taxes, needs, the layers, fire, plague) of LARGE_PLOT.size a side carrying
// large: true, laid empty and marked (tier 0, a lot); people move in as a Manor once the Manor's needs are met nearby (src/sim/housing.js
// lotStatus, src/sim/immigration.js), and it climbs to an Estate in place, never splitting. A 2x2 home without the flag was merged under the
// old rule (src/sim/merge.js) and keeps working as before.
//
// The card is the BUILDINGS row `large_plot` (src/data/largePlots.js): canPlace, conditionsFor and place in commands.js read it like any
// building's, and place lays a house through makeLargePlot. commands.js and this file import each other and use each other's functions only at
// call time (as spots.js does).
import { LARGE_PLOT } from '../data/largePlots.js';
import { housesOf, makeBuilding } from './world.js';
import { canPlace } from './commands.js';

// A Large plot (with or without people in it).
export const isLargePlot = (b) => Boolean(b && b.type === 'house' && b.large === true);

// A 2x2 home merged under the old rule (every 2x2 home of a version 8 city): the merging rules still apply to it.
export const isMergedHome = (b) => Boolean(b && b.type === 'house' && b.w > 1 && b.large !== true);

// A Large plot nobody lives in yet: an empty marked lot (the card's lot, or one a Manor emptied back to).
export const isLot = (b) => isLargePlot(b) && b.tier === 0;

// A small (1x1) plot at its top tier: a Townhouse grows no further (ruling 616).
export const isSmallTop = (b) => Boolean(b && b.type === 'house' && b.w === 1 && b.tier === LARGE_PLOT.unlockTier);

// Whether the city has the Large plot card: from the first time it has a home at LARGE_PLOT.unlockTier (a Townhouse), and from then on
// (world.tally.largeUnlocked, set by noteLargePlotUnlock at each month end). A city that has a Townhouse now has it before the month end notes it.
export const largePlotUnlocked = (world) => Boolean(world.tally && world.tally.largeUnlocked > 0) || housesOf(world).some((h) => h.tier >= LARGE_PLOT.unlockTier);

// Keeps the card unlocked (a Townhouse that is later demolished or devolves does not take it back) and tells it as a "New" card until the first Large
// plot is laid, as a milestone's cards are (world.newItems). True the day it first unlocks. Called by the month's housing check.
export function noteLargePlotUnlock(world) {
  if (world.tally.largeUnlocked > 0 || !housesOf(world).some((h) => h.tier >= LARGE_PLOT.unlockTier)) return false;
  world.tally.largeUnlocked = 1;
  if (!(world.tally.largePlots > 0) && !world.newItems.includes(LARGE_PLOT.type)) world.newItems.push(LARGE_PLOT.type);
  return true;
}

// The placing rule for a Large plot whose north-west tile is (x, y): { ok, reason, warnings }, canPlace's own for the card (reasons 'locked',
// 'occupied', 'water', 'hills', 'out_of_bounds', 'no_gold'; the warning 'needs_road' while no road touches it, which is let through as a plot's is).
export function canPlaceLargePlot(world, x, y) {
  return canPlace(world, LARGE_PLOT.type, x, y, { roadLater: true });
}

// The home a Large plot is: an empty house of size x size carrying large: true (commands.js place inserts it).
export function makeLargePlot(world, x, y) {
  const b = makeBuilding(world, 'house', x, y);
  b.w = LARGE_PLOT.size;
  b.d = LARGE_PLOT.size;
  b.large = true;
  return b;
}

// The tiles a Large plot at (x, y) would cover, north-west first, row by row.
export function largePlotTiles(x, y) {
  const out = [];
  for (let j = 0; j < LARGE_PLOT.size; j++) for (let i = 0; i < LARGE_PLOT.size; i++) out.push([x + i, y + j]);
  return out;
}
