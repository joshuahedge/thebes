// Version 5.0 (Task 4, rulings 550-559): areas of farms, gardens and statues, the plots tool's core (src/sim/commands.js previewHouseTiles) for a
// building that is not one tile. previewAreaTiles judges a list of tiles (a dragged rectangle, or a touch plan's strokes) and says what an area
// would lay; paintAreaTiles lays it: one charge and one undo entry ({ kind: 'place', ids, cost }) for the lot.
//
//   farms (AREA_TYPES 'farm'): every origin whose whole footprint lies in the tiles and takes the building (checkTiles; a farm lacking only a road is
//     let through with the 'needs_road' warning, as the player's placing is), packed row by row, or column by column when that packs more.
//   gardens and statues ('spread'): a lattice from the tiles' top-left corner, one tile in every `spacing`, each that takes the building.
//
// positions: [[x, y], ...] the origins that get one (in order); skipped: [{ x, y, reason }] the tiles the ground refuses (water, hills, taken, not the
// right land; a farm's tiles count one by one), the reason being the sim's own tile reason; unit: the price of one; cost: n x unit; afford: how many
// the treasury can pay for (the debt floor, the rule every purchase follows). Refused: 'unknown' (not an area building), 'locked', 'nothing_to_place'
// (nothing fits) and 'no_gold' (the whole area crosses the debt floor: nothing is laid, as plots; afford says how many would have gone through).
import { dimsOf } from '../data/buildings.js';
import { AREA_SPACING_DEFAULT, AREA_SPACINGS, areaKindOf } from '../data/areas.js';
import { checkTiles, tileReason, placementWarnings } from './commands.js';
import { makeBuilding, insertBuilding } from './world.js';
import { footprint } from './grid.js';
import { ECONOMY } from '../data/economy.js';
import { costOf } from './costs.js';
import { canAfford, spend } from './money.js';
import { isUnlocked } from './progression.js';
import { pushUndo } from './undo.js';
import { noteBuilt } from './oases.js';

const keyOf = (x, y) => `${x},${y}`;

// The tiles once each, in the order given, off-map and fractional ones passed over.
function tileSet(world, list) {
  const seen = new Map();
  for (const t of list) {
    if (!Number.isInteger(t[0]) || !Number.isInteger(t[1]) || t[0] < 0 || t[1] < 0 || t[0] >= world.size || t[1] >= world.size) continue;
    const k = keyOf(t[0], t[1]);
    if (!seen.has(k)) seen.set(k, [t[0], t[1]]);
  }
  return seen;
}

// Farms packed greedily in one scan order: each origin whose footprint lies in the tiles, clear of the farms already taken, and that the sim lets stand.
function packFarms(world, type, tiles, byColumn) {
  const { w, d } = dimsOf(type, 0);
  const all = [...tiles.values()].sort(byColumn ? (a, b) => a[0] - b[0] || a[1] - b[1] : (a, b) => a[1] - b[1] || a[0] - b[0]);
  const taken = new Set(), out = [];
  for (const [x, y] of all) {
    const cells = footprint(x, y, w, d);
    if (cells.some(([cx, cy]) => !tiles.has(keyOf(cx, cy)) || taken.has(keyOf(cx, cy)))) continue;
    const reason = checkTiles(world, type, x, y);
    if (reason && reason !== 'needs_road') continue;
    out.push([x, y]);
    for (const [cx, cy] of cells) taken.add(keyOf(cx, cy));
  }
  return out;
}

export function previewAreaTiles(world, type, list, { spacing = AREA_SPACING_DEFAULT } = {}) {
  const kind = areaKindOf(type);
  const base = { positions: [], skipped: [], warnings: [], unit: 0, cost: 0, afford: 0 };
  if (!kind) return { ok: false, reason: 'unknown', ...base };
  if (!isUnlocked(world, type)) return { ok: false, reason: 'locked', ...base };
  const tiles = tileSet(world, list);
  const skipped = [];
  let positions;
  if (kind === 'farm') {
    const rows = packFarms(world, type, tiles, false), cols = packFarms(world, type, tiles, true);
    positions = cols.length > rows.length ? cols : rows;
    // Each tile the ground refuses, by the sim's own tile rule (a tile with a road or a building on it is refused as taken).
    for (const [x, y] of tiles.values()) { const reason = tileReason(world, type, x, y); if (reason) skipped.push({ x, y, reason }); }
  } else {
    const gap = AREA_SPACINGS.includes(spacing) ? spacing : AREA_SPACING_DEFAULT;
    positions = [];
    const all = [...tiles.values()];
    const x0 = Math.min(...all.map((t) => t[0])), y0 = Math.min(...all.map((t) => t[1]));
    for (const [x, y] of all.sort((a, b) => a[1] - b[1] || a[0] - b[0])) {
      if ((x - x0) % gap || (y - y0) % gap) continue;
      const reason = checkTiles(world, type, x, y);
      if (reason) skipped.push({ x, y, reason });
      else positions.push([x, y]);
    }
  }
  const unit = costOf(world, type);
  const cost = positions.length * unit;
  const afford = unit > 0 ? Math.min(positions.length, Math.max(0, Math.floor((world.gold - ECONOMY.debtFloor) / unit))) : positions.length;   // the most the debt floor lets through
  if (!positions.length) return { ok: false, reason: 'nothing_to_place', ...base, skipped, unit };
  // The warnings the player's placing carries (a road is still missing, a farm has no store in reach), each once, over every position.
  const warnings = [];
  for (const [x, y] of positions) {
    for (const code of placementWarnings(world, type, x, y, checkTiles(world, type, x, y) === 'needs_road')) if (!warnings.includes(code)) warnings.push(code);
    if (warnings.length >= 2) break;
  }
  if (!canAfford(world, cost)) return { ok: false, reason: 'no_gold', positions, skipped, warnings, unit, cost, afford };
  return { ok: true, reason: null, positions, skipped, warnings, unit, cost, afford: positions.length };
}

// Lays the preview's buildings: charged once, one undo entry for them all. { ok, ids, cost, warnings, skipped }, or the preview's refusal with ids [].
export function paintAreaTiles(world, type, list, options = {}) {
  const p = previewAreaTiles(world, type, list, options);
  if (!p.ok) return { ...p, ids: [] };
  const ids = p.positions.map(([x, y]) => { const b = insertBuilding(world, makeBuilding(world, type, x, y)); noteBuilt(world, b); return b.id; });
  spend(world, p.cost);
  pushUndo(world, { kind: 'place', ids, cost: p.cost });
  const fresh = world.newItems.indexOf(type);       // its card stops saying "New" (spec 4.14)
  if (fresh >= 0) world.newItems.splice(fresh, 1);
  return { ok: true, ids, cost: p.cost, warnings: p.warnings, skipped: p.skipped };
}
