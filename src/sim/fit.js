// Terrain-bound placing (Stage 4.6, Track 0 for the Map track, plan 331 "Why not here, everywhere"): the one rule every building that
// is bound to its ground follows: farms, orchards, mines and clay pits (BUILDINGS[type].terrain) and the River track's wharf, lodge and
// nilometer (BUILDINGS[type].water). src/sim/commands.js asks it on every placing check, so every refusal reads the same way and Show
// me can look for the nearest spot that fits (src/ui/placement.js nearestFit, which follows canPlace). The Map track owns this file
// (the words, the clay rule's number, the nearest fit's search); the River track only adds water rows to its buildings.
//
// A building's rule, from its BUILDINGS row:
//   terrain     'fertile' | 'rocky' | 'clay': the ground it stands on
//   terrainMin  how many of the footprint's tiles must be that ground (default: every tile). With every tile needed, a tile that is
//               not that ground refuses on its own (tile reason 'needs_<terrain>', as before Stage 4.6); with fewer, any tile may be
//               other dry ground and the footprint as a whole refuses with 'needs_<terrain>' when too few are
//   water       'touch': a footprint tile has a water tile beside it (4 directions); 'longSide': a water tile lies along one of the
//               footprint's long sides (either side of a square footprint). It refuses with 'needs_water' (a wharf, which fishes, counts the river's water only: Stage 4.7 needs_river). A footprint tile is never
//               water itself (that is the tile reason 'water', as for every building)
import { BUILDINGS, dimsOf } from '../data/buildings.js';
import { footprint, idx, inBounds } from './grid.js';
import { T, TERRAIN_BY_NAME } from './terrain.js';
import { inOasisPool } from './oases.js';

// Whether the per-tile terrain check applies: a building that needs every footprint tile on its ground (the rule before Stage 4.6).
export const tileBound = (type) => {
  const def = BUILDINGS[type];
  return Boolean(def && def.terrain) && !Number.isInteger(def.terrainMin);
};

// riverOnly (the fishing wharf, Stage 4.7): an oasis pool does not count as water; it is too small to fish (ruling 463).
const water = (world, x, y, riverOnly = false) => inBounds(world.size, x, y) && world.terrain[idx(world.size, x, y)] === T.WATER && !(riverOnly && inOasisPool(world, x, y));

// The water tiles along a side of the footprint: the row above (n) or below (s), the column left (w) or right (e).
function sideWater(world, x, y, w, d, side, riverOnly = false) {
  let n = 0;
  if (side === 'n' || side === 's') { const ty = side === 'n' ? y - 1 : y + d; for (let tx = x; tx < x + w; tx++) if (water(world, tx, ty, riverOnly)) n++; }
  else { const tx = side === 'w' ? x - 1 : x + w; for (let ty = y; ty < y + d; ty++) if (water(world, tx, ty, riverOnly)) n++; }
  return n;
}

// The building's fit at (x, y) with rotation rot: { terrain, fit, of, need, water, wet, ok, reason }.
//   terrain, fit, of, need: its ground, how many footprint tiles are that ground, out of how many, and how many it needs (null,
//     0, of, 0 without a terrain rule)
//   water, wet: its water rule (null without one) and the water tiles that count for it (beside the footprint for 'touch', along the
//     best long side for 'longSide')
//   ok, reason: whether the rule holds, else 'needs_<terrain>', 'needs_water' or (a wharf beside only an oasis pool) 'needs_river'
export function fitOf(world, type, x, y, rot = 0) {
  const def = BUILDINGS[type];
  const { w, d } = dimsOf(type, rot);
  const tiles = footprint(x, y, w, d);
  const out = { terrain: def.terrain || null, fit: 0, of: tiles.length, need: 0, water: def.water || null, wet: 0, ok: true, reason: null };
  if (def.terrain) {
    const want = TERRAIN_BY_NAME[def.terrain];
    out.fit = tiles.filter(([tx, ty]) => inBounds(world.size, tx, ty) && world.terrain[idx(world.size, tx, ty)] === want).length;
    out.need = Number.isInteger(def.terrainMin) ? Math.min(def.terrainMin, out.of) : out.of;
    if (out.fit < out.need) { out.ok = false; out.reason = `needs_${def.terrain}`; }
  }
  if (def.water) {
    const sides = def.water === 'longSide' ? (w > d ? ['n', 's'] : d > w ? ['w', 'e'] : ['n', 's', 'w', 'e']) : ['n', 's', 'w', 'e'];
    const count = (riverOnly) => (def.water === 'longSide' ? Math.max(...sides.map((s) => sideWater(world, x, y, w, d, s, riverOnly))) : sides.reduce((n, s) => n + sideWater(world, x, y, w, d, s, riverOnly), 0));
    out.wet = count(Boolean(def.fishes));
    // Stage 4.7 (ruling 463): a wharf beside only an oasis pool says so: "Must touch the river" (needs_river), not "Must touch water".
    if (!out.wet && out.ok) { out.ok = false; out.reason = def.fishes && count(false) ? 'needs_river' : 'needs_water'; }
  }
  return out;
}

// The footprint-level refusal commands.js adds after the tiles: null for a building with no rule, or one whose terrain rule is
// checked tile by tile (tileBound); else fitOf's reason.
export function fitReason(world, type, x, y, rot = 0) {
  const def = BUILDINGS[type];
  if (!def || (!def.water && (!def.terrain || tileBound(type)))) return null;
  return fitOf(world, type, x, y, rot).reason;
}
