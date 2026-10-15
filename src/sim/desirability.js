// Desirability (spec 4.7). Every tile scores the sum of the values of the buildings near it. Each building type,
// and each home by its tier, has values by distance 1 to 6 (data/desirability.js), counted as the Chebyshev
// distance from the nearest tile of its footprint (1 = touching, diagonals included). Values add where they
// overlap, and a building never scores its own footprint. A home (a 2x2 one too) uses its best tile.
// A building that needs a road and has none beside it gives nothing (rulings P10, P11: it does nothing until a road
// touches it), good or bad. The field is memoised per world on a signature of the buildings (id, place, size and tier)
// and the road version, so it is rebuilt only after a building is added, removed, moved, merged or changes tier, or a
// road is drawn or removed. Everything here only reads the world.
import { DESIRABILITY, HOUSE_DESIRABILITY } from '../data/desirability.js';
import { SITE_DESIRABILITY } from '../data/monuments.js';
import { PALACE_STYLES } from '../data/palace.js';
import { MONUMENT_STYLES } from '../data/wonders.js';
import { BUILDINGS, dimsOf } from '../data/buildings.js';
import { allBuildings, housesOf } from './world.js';
import { idx, inBounds } from './grid.js';
import { lacksRoad } from './reach.js';

const memo = new WeakMap();   // world -> { sig, field }; kept outside the world so saves stay pure data

// A building's values by distance: a home's by its tier (an empty plot adds nothing), anything else's by its type. Stage 4
// (spec 4.7, 4.20; complete in the contract, Track A owns it after): a monument site under way gives SITE_DESIRABILITY and
// a finished one its kind's values; the palace gives its style's.
export function valuesOf(b) {
  if (b.type === 'house') return HOUSE_DESIRABILITY[b.tier] || [];
  if (b.site && b.site.done === null) return SITE_DESIRABILITY;
  if (b.type === 'palace') return (PALACE_STYLES[b.style] || PALACE_STYLES[0]).desirability;
  // Stage 4.6 (ruling 343): a finished Gilded monument adds MONUMENT_STYLES.gilded.desirability (+1) at every distance its kind reaches.
  if (b.site && MONUMENT_STYLES[b.style] && MONUMENT_STYLES[b.style].desirability) return (DESIRABILITY[b.type] || []).map((v) => v + MONUMENT_STYLES[b.style].desirability);
  return DESIRABILITY[b.type] || [];
}

// Stage 4.6: the desirability a monument's style adds at every distance (MONUMENT_STYLES: Gilded +1), 0 for any other.
const styleValue = (style) => (MONUMENT_STYLES[style] ? MONUMENT_STYLES[style].desirability : 0);

// Whether a building gives its values now: one that needs a road and has none gives nothing (rulings P10, P11), except a
// finished monument, which needs no road for its desirability (ruling 228).
export const givesDesirability = (world, b) => Boolean(b.site && b.site.done !== null) || !lacksRoad(world, b);

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

// A fingerprint of everything the field depends on (each building's id, place, size and tier, and the road version,
// since a road drawn or removed can wake or silence a building): one tight pass, about 50 microseconds for a full 64x64
// city. Only homes have a tier; a type never changes under the same id.
function signature(world) {
  const list = Object.values(world.buildings);
  let h = 0x811c9dc5;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    h = Math.imul(h ^ b.id, 16777619);                    // one step each, so no two (id, x, y) pack to the same input
    h = Math.imul(h ^ b.x, 16777619);
    h = Math.imul(h ^ b.y, 16777619);
    h = Math.imul(h ^ ((b.tier | 0) * 16 + b.w * 4 + b.d), 16777619);
    h = Math.imul(h ^ ((b.style | 0) * 2 + (b.site && b.site.done !== null ? 1 : 0) + (typeof b.style === 'string' ? 4 * styleValue(b.style) : 0)), 16777619);   // Stage 4: a palace's style, a monument finished; Stage 4.6: a monument's style value (a string: only a monument's, so the pass stays cheap)
  }
  return `${list.length}:${h}:${world.roadVersion}`;
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
    if (!givesDesirability(world, b)) continue;
    spread(size, b.x, b.y, b.w, b.d, valuesOf(b), (i, tx, ty, v) => { field[i] += v; });
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

// Version 5.0 (Task 7): the score a home would have with one more building of `type` at (x, y), counted as the field counts it (its
// DESIRABILITY values by distance; the decorations a low street's fix places need no road, so they count at once): the best tile of the
// home's footprint with that building's value added. Only reads the world.
export function scoreWith(world, house, type, x, y, field = desirabilityField(world)) {
  const vals = DESIRABILITY[type] || [];
  const { w, d } = dimsOf(type);
  let best = -Infinity;
  for (let ty = house.y; ty < house.y + house.d; ty++) {
    for (let tx = house.x; tx < house.x + house.w; tx++) best = Math.max(best, field[idx(world.size, tx, ty)] + valueAt(vals, x, y, w, d, tx, ty));
  }
  return best;
}

// The buildings that most change a home's score, at its best tile: [{ id, type, value }], largest effect first
// (by size, either sign; ties by id). The house sheet's "14 of 20: +6 temple, +3 garden, -4 potter".
export function desirabilityContributors(world, house, n = 3) {
  const { x, y } = bestTile(world, house);
  const out = [];
  for (const b of allBuildings(world)) {
    if (b.id === house.id || !givesDesirability(world, b)) continue;
    const value = valueAt(valuesOf(b), b.x, b.y, b.w, b.d, x, y);
    if (value) out.push({ id: b.id, type: b.type, value });
  }
  out.sort((p, q) => Math.abs(q.value) - Math.abs(p.value) || p.id - q.id);
  return out.slice(0, n);
}

// What placing a building of this type at (x, y) would do (spec 4.7), once a road touches it, without placing it: the tiles it would change
// with their change v, and how many housing plots (any tier, empty ones too, as homesServedFrom counts) would get
// a better or a worse best tile. Stage 4: rot turns a mastaba's footprint; a monument previews its finished values unless
// site is true (the site's dust and noise: "while building: N homes less pleasant", spec 4.7).
export function desirabilityPreview(world, type, x, y, { rot = 0, site = false, style = null } = {}) {
  const def = BUILDINGS[type];
  const tiles = [];
  if (!def) return { better: 0, worse: 0, tiles };
  const { w, d } = dimsOf(type, rot);
  const bonus = !site && def.monument && MONUMENT_STYLES[style] ? MONUMENT_STYLES[style].desirability : 0;   // Stage 4.6: a Gilded one is one nicer at every distance
  const own = DESIRABILITY[type] || [];
  const vals = site && def.monument ? SITE_DESIRABILITY : bonus ? own.map((v) => v + bonus) : own;
  const delta = new Map();
  spread(world.size, x, y, w, d, vals, (i, tx, ty, v) => {
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
