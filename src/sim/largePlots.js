// Version 6.0, Track C (rulings 700-719): the Large plot (ruling 616). Track 0 (contract,
// docs/superpowers/notes/2026-10-22-version-6-0-contract.md) fixed the names and shapes here; Track C implements the functions marked
// STUB and may add private helpers. A Large plot is a home (type 'house', so every rule about homes still holds: taxes, needs, the
// layers, fire, plague) of LARGE_PLOT.size a side carrying large: true, laid empty and marked; people move in as a Manor once the
// Manor's needs are met nearby, and it climbs to an Estate in place, never splitting. A 2x2 home without the flag was merged under the
// old rule (src/sim/merge.js) and keeps working as before.
import { LARGE_PLOT } from '../data/largePlots.js';

// A Large plot (with or without people in it).
export const isLargePlot = (b) => Boolean(b && b.type === 'house' && b.large === true);

// A 2x2 home merged under the old rule (every 2x2 home of a version 8 city): the merging rules still apply to it.
export const isMergedHome = (b) => Boolean(b && b.type === 'house' && b.w > 1 && b.large !== true);

// STUB (Track C): whether the city has the Large plot card: from the first time it has a home at LARGE_PLOT.unlockTier (a Townhouse),
// and from then on (a progressive unlock with its tip and How to play words). Until Track C fills it in, never: nothing changes.
export const largePlotUnlocked = (world) => false;

// STUB (Track C): the placing rule for a Large plot whose north-west tile is (x, y): { ok, reason, warnings }, with the reasons of
// src/sim/commands.js canPlace ('locked', 'blocked', 'water', 'out_of_bounds', 'no_gold', ...) so the words and Show me are the old
// ones. Track C places it through commands.js (place or its own paint) and one undo entry.
// Until then every spot is refused as locked.
export function canPlaceLargePlot(world, x, y) {
  return { ok: false, reason: 'locked', warnings: [] };
}

// The tiles a Large plot at (x, y) would cover, north-west first, row by row.
export function largePlotTiles(x, y) {
  const out = [];
  for (let j = 0; j < LARGE_PLOT.size; j++) for (let i = 0; i < LARGE_PLOT.size; i++) out.push([x + i, y + j]);
  return out;
}
