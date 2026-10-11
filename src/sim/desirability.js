// Desirability (spec 4.7). Every tile scores the sum of the values of the buildings near it. Each building type,
// and each home by its tier, has values by distance 1 to 6 (data/desirability.js), counted as the Chebyshev
// distance from the nearest tile of its footprint (1 = touching, diagonals included). Values add where they
// overlap, and a building never scores its own footprint. A home (a 2x2 one too) uses its best tile.
// The field is memoised per world on a signature of the buildings (id, place, size and tier), so it is rebuilt only
// after a building is added, removed, moved, merged or changes tier. Everything here only reads the world.
import { DESIRABILITY, HOUSE_DESIRABILITY } from '../data/desirability.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from './world.js';
import { idx, inBounds } from './grid.js';

const memo = new WeakMap();   // world -> { sig, field }; kept outside the world so saves stay pure data

// A building's values by distance: a home's by its tier (an empty plot adds nothing), anything else's by its type.
const valuesFor = (type, tier) => (type === 'house' ? HOUSE_DESIRABILITY[tier] : DESIRABILITY[type]) || [];

// The value a footprint gives the tile (tx, ty): 0 on the footprint itself and beyond its last distance.
function valueAt(vals, x, y, w, d, tx, ty) {
  const dist = Math.max(x - tx, tx - (x + w - 1), y - ty, ty - (y + d - 1));
  return dist >= 1 && dist <= vals.length ? vals[dist - 1] : 0;
}

// Calls visit(i, x, y, v) for every map tile within the values' reach of the footprint that it changes (v not 0).
function spread(size, x, y, w, d, vals, visit) {
  const r = vals.length;
  if (!r) return;
  const x0 = Math.max(0, x - r), x1 = Math.min(size - 1, x + w - 1 + r);
  const y0 = Math.max(0, y - r), y1 = Math.min(size - 1, y + d - 1 + r);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const v = valueAt(vals, x, y, w, d, tx, ty);
      if (v) visit(idx(size, tx, ty), tx, ty, v);
    }
  }
}

// A fingerprint of everything the field depends on (each building's id, place, size and tier): one tight pass, about
// 50 microseconds for a full 64x64 city. Only homes have a tier; a type never changes under the same id.
function signature(world) {
  const list = Object.values(world.buildings);
  let h = 0x811c9dc5;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    h = Math.imul(h ^ b.id, 16777619);                    // one step each, so no two (id, x, y) pack to the same input
    h = Math.imul(h ^ b.x, 16777619);
    h = Math.imul(h ^ b.y, 16777619);
    h = Math.imul(h ^ ((b.tier | 0) * 16 + b.w * 4 + b.d), 16777619);
  }
  return `${list.length}:${h}`;
}

// The whole map's scores, one per tile (index y * size + x). Shared and memoised: callers must not write to it.
// Checking the memo costs one pass over the buildings, so a caller reading many tiles or many homes at once (an
// overlay, the monthly housing check) takes the field once and reads it, or passes it to houseDesirability.
export function desirabilityField(world) {
  const sig = signature(world);
  const m = memo.get(world);
  if (m && m.sig === sig) return m.field;
  const size = world.size;
  const field = new Float32Array(size * size);
  for (const b of allBuildings(world)) {
    spread(size, b.x, b.y, b.w, b.d, valuesFor(b.type, b.tier), (i, tx, ty, v) => { field[i] += v; });
  }
  memo.set(world, { sig, field });
  return field;
}

export const desirabilityAt = (world, x, y) => (inBounds(world.size, x, y) ? desirabilityField(world)[idx(world.size, x, y)] : 0);

// The home's best tile: the highest score on its footprint, the first such tile in reading order.
function bestTile(world, house, field = desirabilityField(world)) {
  let best = null;
  for (let y = house.y; y < house.y + house.d; y++) {
    for (let x = house.x; x < house.x + house.w; x++) {
      const v = field[idx(world.size, x, y)];
      if (!best || v > best.v) best = { x, y, v };
    }
  }
  return best;
}

// A home's score: its best tile's (spec 4.7). `field` is an optional desirabilityField(world) taken once by a caller
// judging many homes, so they are all judged on the same field.
export const houseDesirability = (world, house, field = desirabilityField(world)) => bestTile(world, house, field).v;

// The buildings that most change a home's score, at its best tile: [{ id, type, value }], largest effect first
// (by size, either sign; ties by id). The house sheet's "14 of 20: +6 temple, +3 garden, -4 potter".
export function desirabilityContributors(world, house, n = 3) {
  const { x, y } = bestTile(world, house);
  const out = [];
  for (const b of allBuildings(world)) {
    if (b.id === house.id) continue;
    const value = valueAt(valuesFor(b.type, b.tier), b.x, b.y, b.w, b.d, x, y);
    if (value) out.push({ id: b.id, type: b.type, value });
  }
  out.sort((p, q) => Math.abs(q.value) - Math.abs(p.value) || p.id - q.id);
  return out.slice(0, n);
}

// What placing a building of this type at (x, y) would do (spec 4.7), without placing it: the tiles it would change
// with their change v, and how many housing plots (any tier, empty ones too, as homesServedFrom counts) would get
// a better or a worse best tile.
export function desirabilityPreview(world, type, x, y) {
  const def = BUILDINGS[type];
  const tiles = [];
  if (!def) return { better: 0, worse: 0, tiles };
  const delta = new Map();
  spread(world.size, x, y, def.w, def.d, valuesFor(type, 0), (i, tx, ty, v) => {
    tiles.push({ x: tx, y: ty, v });
    delta.set(i, v);
  });
  let better = 0, worse = 0;
  if (!tiles.length) return { better, worse, tiles };
  const field = desirabilityField(world);
  for (const h of housesOf(world)) {
    let before = -Infinity, after = -Infinity, touched = false;
    for (let ty = h.y; ty < h.y + h.d; ty++) {
      for (let tx = h.x; tx < h.x + h.w; tx++) {
        const i = idx(world.size, tx, ty);
        const dv = delta.get(i);
        if (dv) touched = true;
        before = Math.max(before, field[i]);
        after = Math.max(after, field[i] + (dv || 0));
      }
    }
    if (!touched) continue;
    if (after > before) better++;
    else if (after < before) worse++;
  }
  return { better, worse, tiles };
}
