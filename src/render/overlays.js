// Overlays (spec 6.3): filled dot = has it, hollow ring = missing, one hue per overlay; desirability is graded instead,
// one hue light to dark with hatching below zero. Plus the reach highlight for a selected building, the placement
// ghost's three states (spec 6.5) and the placement preview's desirability tint (spec 4.7).
import { BUILDINGS, dimsOf } from '../data/buildings.js';
import { HOUSEHOLD_GOODS } from '../data/goods.js';
import { housesOf, allBuildings, isSite, buildingsVersion } from '../sim/world.js';
import { houseStatus } from '../sim/housing.js';
import { roadReach, touchesRoad } from '../sim/reach.js';
import { isWorking } from '../sim/labour.js';
import { desirabilityField } from '../sim/desirability.js';
import { T as TILE, TERRAIN_BY_NAME, buildable } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';
import { fitOf } from '../sim/fit.js';
import { canPlace } from '../sim/commands.js';   // Version 7.0 (Track P): bankTiles asks the sim's own placing check
import { p, U, tileDiamond, quad } from './iso.js';
import { UI, INK, TEAL_DARK, WOOD } from './art/palette.js';
import { rgba, makeDraw } from './art/ctx.js';
import { ART, slotFor } from './art/registry.js';
import { GUIDE_PULSE_MS, DESIRABILITY_STEPS, VIEW_OUTLINE } from '../data/ui.js';
import { DEFENCE } from '../data/raids.js';
import { canBurn, fireRiskOf, fireBand, staffedCover } from '../sim/fire.js';
import { healthBandOf, healthCoverage, canFallIll, healthStarted } from '../sim/health.js';
import { HEALTH } from '../data/health.js';
import { CRIME } from '../data/crime.js';
import { crimeBand, crimeRiskOf, crimeCoverage, canCommitCrime, crimeStarted } from '../sim/crime.js';
import { MONUMENT, MONUMENT_PLACING } from '../data/monuments.js';
import { drawMonument } from './monuments.js';
import { LAYER_HUE } from '../data/layers.js';
import { drawProgress, drawSupply, drawWorkers } from './layers.js';   // Version 5.0 (Task 3): a cycle (layers.js reads tilePolys and mark), safe: each is used only inside functions
import { layerUnlocked } from '../sim/layers.js';
import { drawPlague } from './plague.js';   // Version 6.0 (Track B1): the Health layer's plague marks

// Version 5.0 (Task 3, rulings 540-549): Home progress, Goods supply and Workers (src/render/layers.js) join the table after Ground, so the order of the first eleven is unchanged.
export const OVERLAYS = ['water', 'food', 'religion', 'goods', 'entertainment', 'desirability', 'fire', 'health', 'crime', 'housing', 'ground', 'progress', 'supply', 'workers'];
// Fire risk (Stage 3, Track D) is one deep ember red, light to dark by band; no other overlay uses a red.
export const FIRE_HUE = '#9C2A1C';
// Stage 4.5 (rulings 318, 319): Health in an olive green and Crime in a deep violet, each graded like fire risk (light to dark by band).
export const HEALTH_HUE = '#6F8F1F';
export const CRIME_HUE = '#5E3A8C';
// The Ground overlay (placement review P1): free fertile land in a leaf green (darker than the meadow's lime, so the two read
// apart), free rocky ground in a stone grey. The hues are for the tint, the dots and the hatching; the legend uses them too.
// Stage 4.5 (ruling 312): free clay ground along the banks, in terracotta (tint and wide hatching), for the clay pit.
// Stage 4.7 (ruling 464): hills in a deep lavender, wide hatching and a heavy wash (the hills' ground is never free: nothing passes or builds there).
export const GROUND_HUE = { fertile: '#27934A', rocky: '#5F5A54', clay: '#C2552B', hills: '#5B3E7C' };
export const OVERLAY_HUE = {
  water: UI.water, food: UI.food, religion: UI.religion, goods: UI.goods, entertainment: UI.entertainment, desirability: UI.desirability, fire: FIRE_HUE, health: HEALTH_HUE, crime: CRIME_HUE, housing: UI.housing,
  ground: GROUND_HUE.fertile,
  progress: LAYER_HUE.progress, supply: LAYER_HUE.supply, workers: LAYER_HUE.workers,
};
export const SERVICE_TYPES = { water: ['well'], food: ['bazaar'], religion: ['temple'], goods: ['bazaar'], entertainment: ['booth'], housing: [] };
// Overlays that draw a graded scale over the ground instead of dots and rings (spec 6.3); their legend is a scale too.
export const GRADED_OVERLAYS = ['desirability', 'fire', 'health', 'crime'];
// The three Version 5.0 layers (their legends, keys and picker are their own: src/ui/overlayUi.js), and the ones the Layers picker and the O key offer now.
export const LAYER_OVERLAYS = ['progress', 'supply', 'workers'];
export const availableOverlays = (world) => OVERLAYS.filter((k) => !world || !LAYER_OVERLAYS.includes(k) || layerUnlocked(world, k));

export function houseMark(world, house, kind) {
  const s = houseStatus(world, house);
  if (kind === 'housing') {
    const blocking = s.checklist.find((c) => !c.met);
    return { has: !blocking, need: blocking ? blocking.need : null };
  }
  // Goods: every household good the home's next tier needs (pottery, beer, linen, jewellery); a home that needs none has no mark.
  if (kind === 'goods') {
    const rows = s.checklist.filter((c) => HOUSEHOLD_GOODS.includes(c.need));
    if (!rows.length) return null;
    const missing = rows.find((c) => !c.met);
    return { has: !missing, need: missing ? missing.need : null };
  }
  const item = s.checklist.find((c) => c.need === kind);
  return item ? { has: item.met, need: kind } : null;
}

const markCache = new WeakMap(); // world -> { key, marks }

// Cheap per-frame signature of what can change a mark between days: which buildings exist and their
// staff, paused and tier. O(n) over buildings; the expensive part (houseStatus per house) stays memoised.
function buildingSignature(world) {
  let sig = 0, n = 0;
  for (const b of allBuildings(world)) { n++; sig = (sig * 31 + b.id * 13 + (b.staff || 0) * 3 + (b.paused ? 7 : 0) + (b.tier || 0) * 11) | 0; }
  return `${n}:${sig}`;
}

function allMarks(world, kind) {
  const key = `${kind}|${world.day}|${world.roadVersion}|${world.nextId}|${buildingSignature(world)}`;
  const c = markCache.get(world);
  if (c && c.key === key) return c.marks;
  const marks = [];
  for (const h of housesOf(world)) {
    const m = houseMark(world, h, kind);
    if (m) marks.push({ id: h.id, x: h.x + h.w / 2, y: h.y + h.d / 2, has: m.has, need: m.need });
  }
  markCache.set(world, { key, marks });
  return marks;
}

// Memoised per tick: marks only change when the world does. The same array comes back until then.
export function overlayMarks(world, kind, range = null) {
  const marks = allMarks(world, kind);
  if (!range) return marks;
  return marks.filter((m) => m.x >= range.x0 && m.x <= range.x1 + 1 && m.y >= range.y0 && m.y <= range.y1 + 1);
}

const reachOf = (def) => def.reach || def.supplyReach || def.producerReach || 0;

export function reachTiles(world, b) {
  const dist = reachOf(BUILDINGS[b.type]);
  return dist ? [...roadReach(world, b, dist).keys()] : [];
}

function tintTiles(g, world, tiles, color, alpha) {
  for (const t of tiles) {
    const x = t % world.size, y = (t - x) / world.size;
    g.poly(tileDiamond(x, y), color, { alpha });
  }
}

export function mark(g, m, color) {
  const c = U(p(m.x, m.y), 6);
  if (m.has) {
    g.circ(c, 4.8, INK, { alpha: 0.6 });
    g.circ(c, 4.2, UI.halo, { alpha: 0.9 });
    g.circ(c, 3, color);
  } else {
    g.circ(c, 4.4, 'none', { stroke: INK, strokeWidth: 1, strokeAlpha: 0.6 });
    g.circ(c, 3.6, 'none', { stroke: UI.halo, strokeWidth: 3.2, strokeAlpha: 0.9 });
    g.circ(c, 3.6, 'none', { stroke: color, strokeWidth: 1.6 });
  }
}

// `placing` is the type of the building being placed, if any: the Ground overlay brightens the tiles that have room for it. `good` is the good the Goods supply
// layer shows (pottery, beer, linen, jewellery or food).
export function drawOverlay(g, world, kind, range, placing = null, good = 'pottery') {
  if (kind === 'progress') { drawProgress(g, world, range); return; }
  if (kind === 'supply') { drawSupply(g, world, range, good); return; }
  if (kind === 'workers') { drawWorkers(g, world, range); return; }
  if (kind === 'ground') { drawGround(g, world, range, placing); return; }
  if (kind === 'desirability') { drawDesirability(g, world, range); return; }
  if (kind === 'fire') { drawFireRisk(g, world, range); return; }
  if (kind === 'health' || kind === 'crime') { drawHomeRisk(g, world, range, kind); return; }
  if (!SERVICE_TYPES[kind]) return;
  const color = OVERLAY_HUE[kind];
  const tiles = new Set();
  for (const b of allBuildings(world)) {
    if (!SERVICE_TYPES[kind].includes(b.type) || !isWorking(world, b)) continue;
    for (const t of reachTiles(world, b)) tiles.add(t);
  }
  for (const t of tiles) {
    const x = t % world.size, y = (t - x) / world.size;
    if (range && (x < range.x0 || x > range.x1 || y < range.y0 || y > range.y1)) continue;
    g.poly(tileDiamond(x, y), color, { alpha: 0.16 });
  }
  for (const m of overlayMarks(world, kind, range)) mark(g, m, color);
}

// Tiles [[x, y]...] as polygons for one path: tiles side by side along x are one parallelogram, so a screenful of ground is
// a few hundred polygons and not thousands of diamonds. That is most of an overlay's cost: the canvas fills by edges.
export function tilePolys(tiles) {
  const out = [];
  let first = null, last = null;
  const close = () => out.push([p(first[0], first[1]), p(last[0] + 1, first[1]), p(last[0] + 1, first[1] + 1), p(first[0], first[1] + 1)]);
  for (const t of tiles) {
    if (last && t[1] === last[1] && t[0] === last[0] + 1) { last = t; continue; }
    if (first) close();
    first = last = t;
  }
  if (first) close();
  return out;
}

// Diagonal hatching over a set of tiles: one fill of a stripe pattern that sits on the art grid (lines at x + y a multiple
// of 4 art px), so the stripes stay put while the set changes under a moving ghost. Hatching, not a hue, is what says
// "worse" (spec 6.1), so it reads without colour.
export function hatchTiles(g, tiles, color, opts) {
  g.hatchPolys(tilePolys(tiles), color, opts);
}

// The Ground overlay (placement review P1, spec 4.4, 6.3): where the land is fertile (farms, orchards) or rocky (mines).
// Free fertile tiles are leaf green with two small dots each, free rocky tiles stone grey with diagonal hatching, tile edges
// crisp (the terrain art feathers its edges, this does not); tiles with a building, road or wall on them stay plain. While a
// farm, orchard or mine is being placed, the tiles that belong to at least one free spot where its whole footprint fits are
// drawn at full strength and the rest at half. groundTiles and roomTiles are what the draw, the legend and the tests share.
export const GROUND_ALPHA = { bright: 1, dim: 0.5 };

const groundFree = (world, i) => !world.occ[i] && !world.road[i] && !world.wall[i];

// The free fertile, rocky and clay tiles in range, as [[x, y]...] in row order (so tilePolys joins runs along x).
export function groundTiles(world, range = null) {
  const r = range || { x0: 0, y0: 0, x1: world.size - 1, y1: world.size - 1 };
  const fertile = [], rocky = [], clay = [];
  for (let y = Math.max(0, r.y0); y <= Math.min(world.size - 1, r.y1); y++) {
    for (let x = Math.max(0, r.x0); x <= Math.min(world.size - 1, r.x1); x++) {
      const i = idx(world.size, x, y), t = world.terrain[i];
      if ((t !== TILE.FERTILE && t !== TILE.ROCKY && t !== TILE.CLAY) || !groundFree(world, i)) continue;
      (t === TILE.FERTILE ? fertile : t === TILE.CLAY ? clay : rocky).push([x, y]);
    }
  }
  return { fertile, rocky, clay };
}

// The hill tiles in range, [[x, y]...] in row order (Stage 4.7): the Ground overlay marks them and its legend names them. Kept apart from groundTiles,
// whose three lists are the free ground a building may take.
export function hillGroundTiles(world, range = null) {
  const r = range || { x0: 0, y0: 0, x1: world.size - 1, y1: world.size - 1 };
  const out = [];
  for (let y = Math.max(0, r.y0); y <= Math.min(world.size - 1, r.y1); y++) {
    for (let x = Math.max(0, r.x0); x <= Math.min(world.size - 1, r.x1); x++) if (world.terrain[idx(world.size, x, y)] === TILE.HILLS) out.push([x, y]);
  }
  return out;
}

const roomMemo = new WeakMap();   // world -> { key, room: Map `type|rot` -> Set of tile indices }

// The tile indices that belong to at least one free spot where a `type` building's whole footprint fits on its own ground
// (every tile of the right terrain with nothing on it). Ground only: whether a road touches the spot, or the gold is there, is
// the placement bar's business. Empty for a type with no terrain. Memoised on the buildings, roads and walls (the same
// signature the other overlays use), so a ghost that moves around asks once.
// Stage 4 (Track C, spec 6.3, ruling 229): a monument's room is the opposite case, every tile of a free spot where its whole
// footprint, in rotation `rot` (dimsOf), sits on dry ground that is not fertile land (desert, rocky, meadow, scrub, bank).
// Worked out at the pick and on each rotation, then kept until the roads or buildings change (the memo's key).
export function roomTiles(world, type, rot = 0) {
  const def = BUILDINGS[type];
  if (!def || (!def.terrain && !def.monument)) return new Set();
  const key = `${world.roadVersion}|${world.wallVersion}|${world.nextId}|${buildingSignature(world)}`;
  let m = roomMemo.get(world);
  if (!m || m.key !== key) { m = { key, room: new Map() }; roomMemo.set(world, m); }
  const { w, d } = dimsOf(type, rot);
  const slot = `${type}|${w}x${d}|${def.terrainMin}`;   // the rule is part of the key: a changed terrainMin works the room out again
  let room = m.room.get(slot);
  if (room) return room;
  room = new Set();
  const n = world.size;
  const want = def.terrain ? TERRAIN_BY_NAME[def.terrain] : null;
  // Stage 4.6 (ruling 331): a row with terrainMin (the clay pit: 2 of its 4 tiles) fits wherever the sim's own fitOf says so, with
  // no water under it and every tile free; the room is then the footprint's tiles of that ground. Rows without terrainMin keep
  // the every-tile rule.
  const loose = Boolean(def.terrain) && Number.isInteger(def.terrainMin);
  const ok = def.terrain
    ? (i) => (loose ? buildable(world, i) : world.terrain[i] === want) && groundFree(world, i)   // Stage 4.7: buildable (src/sim/terrain.js)
    : (i) => buildable(world, i) && world.terrain[i] !== TILE.FERTILE && groundFree(world, i);
  for (let y = 0; y + d <= n; y++) {
    for (let x = 0; x + w <= n; x++) {
      let fits = true;
      for (let dy = 0; dy < d && fits; dy++) for (let dx = 0; dx < w && fits; dx++) fits = ok(idx(n, x + dx, y + dy));
      if (!fits) continue;
      if (loose && !fitOf(world, type, x, y, rot).ok) continue;
      for (let dy = 0; dy < d; dy++) for (let dx = 0; dx < w; dx++) {
        const i = idx(n, x + dx, y + dy);
        if (!loose || world.terrain[i] === want) room.add(i);
      }
    }
  }
  m.room.set(slot, room);
  return room;
}

// Version 7.0 (Track P, ruling 1008): where a building bound to water (the Quay, the wharf, the lodge, the nilometer) can go, as the Ground overlay's room is for the buildings
// bound to fertile, rocky or clay ground: the tile indices of every free spot the sim's own canPlace accepts, with the road and the gold left to the bar. Worked out once, and
// again when the buildings, roads or walls change (roomTiles' key). Empty for a building with no water rule.
const bankMemo = new WeakMap();   // world -> { key, banks: Map `type|rot` -> Set of tile indices }
export function bankTiles(world, type, rot = 0) {
  const def = BUILDINGS[type];
  if (!def || !def.water) return new Set();
  const key = `${world.roadVersion}|${world.wallVersion}|${world.nextId}|${buildingSignature(world)}`;
  let m = bankMemo.get(world);
  if (!m || m.key !== key) { m = { key, banks: new Map() }; bankMemo.set(world, m); }
  const slot = `${type}|${rot}`;
  let out = m.banks.get(slot);
  if (out) return out;
  out = new Set();
  const n = world.size, { w, d } = dimsOf(type, rot);
  for (let y = 0; y + d <= n; y++) {
    for (let x = 0; x + w <= n; x++) {
      const c = canPlace(world, type, x, y, { roadLater: true, rot });
      if (!c.ok && c.reason !== 'no_gold') continue;
      for (let dy = 0; dy < d; dy++) for (let dx = 0; dx < w; dx++) out.add(idx(n, x + dx, y + dy));
    }
  }
  m.banks.set(slot, out);
  return out;
}
export const BANK_HUE = '#2F6FA8';   // the interface's blue (css --blue): a bank is where the river is
// A light wash and fine hatching on the banks in view, under the ghost. Static.
export function drawBankHint(g, world, type, range, rot = 0) {
  const room = bankTiles(world, type, rot);
  if (!room.size) return;
  const tiles = [];
  for (let y = Math.max(0, range.y0); y <= Math.min(world.size - 1, range.y1); y++) for (let x = Math.max(0, range.x0); x <= Math.min(world.size - 1, range.x1); x++) if (room.has(idx(world.size, x, y))) tiles.push([x, y]);
  if (!tiles.length) return;
  const polys = tilePolys(tiles);
  g.polys(polys, BANK_HUE, { alpha: 0.16 });
  g.hatchPolys(polys, BANK_HUE, { fill: 0, line: 0.5, gap: 6, width: 1.2 });
}

// Stage 4 (Track C): the rotation of the building being placed, which createUI's drawOverlay call does not pass (it passes the
// type): the placement sets it when a tool starts and on each turn, and the Ground overlay and its legend read it.
const placingRot = new WeakMap();   // world -> 0 | 1
export const setPlacingRot = (world, rot) => { placingRot.set(world, rot === 1 ? 1 : 0); };
export const placingRotOf = (world) => placingRot.get(world) || 0;

// The pale gold wash a monument's room gets (the Monuments tint, src/data/ui.js CATEGORY_TINT), crisp-edged like the rest.
export const MONUMENT_ROOM_HUE = '#E2B13C';
export const MONUMENT_ROOM_ALPHA = 0.42;

// Two small dots per tile as one repeating pattern on the art grid. A tile's centre is at (16a, 8(b + 1)) with a and b the same
// parity, so the pattern's 32 x 16 art px cell holds two tile centres, (0, 8) and (16, 0); each gets a dot either side of it.
const dotsMemo = new WeakMap();
function dotsPattern(g, color, alpha) {
  const unit = g.scale * 16, px = Math.max(2, Math.round(unit));
  const key = `${color}|${alpha}|${unit}`;
  let byKey = dotsMemo.get(g.ctx);
  if (!byKey) { byKey = new Map(); dotsMemo.set(g.ctx, byKey); }
  if (byKey.has(key)) return byKey.get(key);
  const tile = document.createElement('canvas');
  tile.width = 2 * px; tile.height = px;
  const t = tile.getContext('2d');
  t.fillStyle = rgba(color, alpha);
  const k = px / 16;
  for (const [ax, ay] of [[4, 8], [28, 8], [12, 0], [20, 0], [12, 16], [20, 16]]) {
    t.beginPath(); t.arc(ax * k, ay * k, 1.25 * k, 0, Math.PI * 2); t.fill();
  }
  const pattern = g.ctx.createPattern(tile, 'repeat');
  if (px !== unit) pattern.setTransform(new DOMMatrix().scale(unit / px));
  if (byKey.size >= 16) byKey.clear();
  byKey.set(key, pattern);
  return pattern;
}

function groundLayer(g, tiles, kind, strength) {
  if (!tiles.length) return;
  const polys = tilePolys(tiles);
  if (kind === 'fertile') {
    g.polys(polys, GROUND_HUE.fertile, { alpha: 0.36 * strength });
    g.polys(polys, dotsPattern(g, '#0B3D1A', 0.9 * strength));
  } else if (kind === 'clay') {
    g.polys(polys, GROUND_HUE.clay, { alpha: 0.34 * strength });
    g.hatchPolys(polys, GROUND_HUE.clay, { fill: 0, line: 0.8 * strength, gap: 6, width: 1.4 });
  } else if (kind === 'hills') {
    g.hatchPolys(polys, GROUND_HUE.hills, { fill: 0.5 * strength, line: 0.95 * strength, gap: 8, width: 2.6 });
  } else {
    g.hatchPolys(polys, GROUND_HUE.rocky, { fill: 0.28 * strength, line: 0.85 * strength, gap: 4 });
  }
}

function drawGround(g, world, range, placing) {
  const { fertile, rocky, clay } = groundTiles(world, range);
  groundLayer(g, hillGroundTiles(world, range), 'hills', GROUND_ALPHA.bright);   // Stage 4.7: hills always at full strength, whatever is being placed
  const def = placing ? BUILDINGS[placing] : null;
  if (def && def.monument) {
    // A monument's room (ruling 229): fertile and rocky ground at half strength, a gold wash on every tile with room.
    groundLayer(g, fertile, 'fertile', GROUND_ALPHA.dim);
    groundLayer(g, rocky, 'rocky', GROUND_ALPHA.dim);
    groundLayer(g, clay, 'clay', GROUND_ALPHA.dim);
    const room = roomTiles(world, placing, placingRotOf(world));
    const r = range || { x0: 0, y0: 0, x1: world.size - 1, y1: world.size - 1 };
    const gold = [];
    for (let y = Math.max(0, r.y0); y <= Math.min(world.size - 1, r.y1); y++) {
      for (let x = Math.max(0, r.x0); x <= Math.min(world.size - 1, r.x1); x++) if (room.has(idx(world.size, x, y))) gold.push([x, y]);
    }
    if (gold.length) g.polys(tilePolys(gold), MONUMENT_ROOM_HUE, { alpha: MONUMENT_ROOM_ALPHA });
    return;
  }
  const room = def && def.terrain ? roomTiles(world, placing) : null;
  if (!room) {
    groundLayer(g, fertile, 'fertile', GROUND_ALPHA.bright);
    groundLayer(g, rocky, 'rocky', GROUND_ALPHA.bright);
    groundLayer(g, clay, 'clay', GROUND_ALPHA.bright);
    return;
  }
  const inRoom = ([x, y]) => room.has(idx(world.size, x, y));
  groundLayer(g, fertile.filter((t) => !inRoom(t)), 'fertile', GROUND_ALPHA.dim);
  groundLayer(g, rocky.filter((t) => !inRoom(t)), 'rocky', GROUND_ALPHA.dim);
  groundLayer(g, clay.filter((t) => !inRoom(t)), 'clay', GROUND_ALPHA.dim);
  groundLayer(g, fertile.filter(inRoom), 'fertile', GROUND_ALPHA.bright);
  groundLayer(g, rocky.filter(inRoom), 'rocky', GROUND_ALPHA.bright);
  groundLayer(g, clay.filter(inRoom), 'clay', GROUND_ALPHA.bright);
}

// The desirability overlay (spec 4.7, 6.3): each tile's score in one indigo, light to dark by the bands of
// DESIRABILITY_STEPS, and coral hatching below zero. Water and the tiles under other buildings stay clear: only open
// ground and homes have a use for the number. DESIRABILITY_ALPHA is each band's strength (the legend uses it too):
// even steps from a first band strong enough to show on bare ground.
export const DESIRABILITY_ALPHA = [0.14, 0.25, 0.36, 0.47, 0.58];

// The band a score falls in: -1 below zero, else the index of the last step it reaches.
export function desirabilityStep(v) {
  if (v < 0) return -1;
  let k = 0;
  while (k + 1 < DESIRABILITY_STEPS.length && v >= DESIRABILITY_STEPS[k + 1]) k++;
  return k;
}

// The tiles in range by band: { below: [[x, y]...], steps: [[[x, y]...] per band] }. The draw and the tests share it.
export function desirabilityBands(world, range = null) {
  const field = desirabilityField(world);
  const r = range || { x0: 0, y0: 0, x1: world.size - 1, y1: world.size - 1 };
  const below = [];
  const steps = DESIRABILITY_STEPS.map(() => []);
  for (let y = Math.max(0, r.y0); y <= Math.min(world.size - 1, r.y1); y++) {
    for (let x = Math.max(0, r.x0); x <= Math.min(world.size - 1, r.x1); x++) {
      const i = idx(world.size, x, y);
      if (!buildable(world, i)) continue;   // Stage 4.7: no band on water or hills (src/sim/terrain.js)
      const id = world.occ[i];
      if (id && world.buildings[id].type !== 'house') continue;
      const v = field[i];
      if (v < 0) below.push([x, y]);
      else steps[desirabilityStep(v)].push([x, y]);
    }
  }
  return { below, steps };
}

function drawDesirability(g, world, range) {
  const { below, steps } = desirabilityBands(world, range);
  steps.forEach((tiles, k) => g.polys(tilePolys(tiles), OVERLAY_HUE.desirability, { alpha: DESIRABILITY_ALPHA[k] }));
  hatchTiles(g, below, UI.bad, { fill: 0.1, line: 0.75 });
}

// The fire-risk overlay (spec 4.12, 6.3): every building that can burn, tinted by its band in one ember hue light to dark
// (FIRE_ALPHA, which the legend uses too), with light diagonal hatching on High and dense cross-hatching on Can catch
// fire, and a filled dot where a staffed firehouse reaches it (staffedCover, as the fire row and the alerts say) or a
// hollow ring where none does. Buildings that never burn get nothing. fireRiskMarks is the list the draw and tests share.
export const FIRE_ALPHA = [0.12, 0.26, 0.4, 0.55];
export function fireRiskMarks(world, range = null) {
  const out = [];
  for (const b of allBuildings(world)) {
    if (!canBurn(b)) continue;
    const x = b.x + b.w / 2, y = b.y + b.d / 2;
    if (range && (x < range.x0 || x > range.x1 + 1 || y < range.y0 || y > range.y1 + 1)) continue;
    out.push({ id: b.id, x, y, b, band: fireBand(fireRiskOf(world, b)), has: staffedCover(world, b) });
  }
  return out;
}

// Diagonal stripes both ways as one repeating pattern on the art grid (the counterpart of the drawing context's one-way
// hatching), memoised per context and size.
const crossMemo = new WeakMap();
function crossHatch(g, color, gap) {
  const unit = g.scale * gap, px = Math.max(2, Math.round(unit));
  const key = `${color}|${gap}|${unit}`;
  let byKey = crossMemo.get(g.ctx);
  if (!byKey) { byKey = new Map(); crossMemo.set(g.ctx, byKey); }
  if (byKey.has(key)) return byKey.get(key);
  const tile = document.createElement('canvas');
  tile.width = tile.height = px;
  const t = tile.getContext('2d');
  t.strokeStyle = rgba(color, 0.85);
  t.lineWidth = Math.max(1, (0.9 * px) / gap);
  for (const c of [0, px, 2 * px]) {
    t.beginPath(); t.moveTo(c + px, -px); t.lineTo(c - px, px); t.stroke();
    t.beginPath(); t.moveTo(c - 2 * px, -px); t.lineTo(c, px); t.stroke();
  }
  const pattern = g.ctx.createPattern(tile, 'repeat');
  if (px !== unit) pattern.setTransform(new DOMMatrix().scale(unit / px));
  if (byKey.size >= 16) byKey.clear();
  byKey.set(key, pattern);
  return pattern;
}

function drawFireRisk(g, world, range) {
  const marks = fireRiskMarks(world, range);
  const foot = (m) => tilePolys(Array.from({ length: m.b.w * m.b.d }, (_, k) => [m.b.x + (k % m.b.w), m.b.y + Math.floor(k / m.b.w)]));
  const byBand = [[], [], [], []];
  for (const m of marks) byBand[m.band].push(...foot(m));
  byBand.forEach((polys, k) => g.polys(polys, FIRE_HUE, { alpha: FIRE_ALPHA[k] }));
  g.hatchPolys(byBand[2], FIRE_HUE, { fill: 0, line: 0.6, gap: 5 });
  if (byBand[3].length) g.polys(byBand[3], crossHatch(g, FIRE_HUE, 3));
  for (const m of marks) mark(g, m, FIRE_HUE);
}

// The Health and Crime overlays (Stage 4.5, rulings 318, 319): every home with people in it, tinted by its band in the overlay's hue
// light to dark (FIRE_ALPHA's steps, as fire risk), with light diagonal hatching on High and dense cross-hatching on the top band
// (an ill home, or one that can cause a theft), and a filled dot where a staffed physician or police post reaches it (coverage of HEALTH.staffedAt or CRIME.staffedAt, the
// coverage map read once: the sheet's and the alerts' test) or a hollow ring where none does. Empty plots and every other building get
// nothing. homeRiskMarks is the list the draw and the tests share.
export function homeRiskMarks(world, kind, range = null) {
  const out = [];
  if (!(kind === 'health' ? healthStarted(world) : crimeStarted(world))) return out;   // before the threat starts, and on Peaceful, no home is marked
  const cover = kind === 'health' ? healthCoverage(world) : crimeCoverage(world), staffedAt = kind === 'health' ? HEALTH.staffedAt : CRIME.staffedAt;   // read once, not per home
  for (const b of housesOf(world)) {
    if (kind === 'health' ? !canFallIll(b) : !canCommitCrime(b)) continue;
    const x = b.x + b.w / 2, y = b.y + b.d / 2;
    if (range && (x < range.x0 || x > range.x1 + 1 || y < range.y0 || y > range.y1 + 1)) continue;
    out.push(kind === 'health'
      ? { id: b.id, x, y, b, band: healthBandOf(world, b), has: (cover.get(b.id) || 0) >= staffedAt }
      : { id: b.id, x, y, b, band: crimeBand(crimeRiskOf(world, b)), has: (cover.get(b.id) || 0) >= staffedAt });
  }
  return out;
}

function drawHomeRisk(g, world, range, kind) {
  const hue = OVERLAY_HUE[kind];
  const marks = homeRiskMarks(world, kind, range);
  const foot = (m) => tilePolys(Array.from({ length: m.b.w * m.b.d }, (_, k) => [m.b.x + (k % m.b.w), m.b.y + Math.floor(k / m.b.w)]));
  const byBand = [[], [], [], []];
  for (const m of marks) byBand[m.band].push(...foot(m));
  byBand.forEach((polys, k) => g.polys(polys, hue, { alpha: FIRE_ALPHA[k] }));
  g.hatchPolys(byBand[2], hue, { fill: 0, line: 0.6, gap: 5 });
  if (byBand[3].length) g.polys(byBand[3], crossHatch(g, hue, 3));
  for (const m of marks) mark(g, m, hue);
  if (kind === 'health') drawPlague(g, world, range);   // Version 6.0 (Track B1, ruling 686): a sick home's heavy ring, a quarantined district's dashed edge
}

// The placement preview's tint (spec 4.7): a teal wash on the tiles a building would make nicer, coral hatching on
// those it would make worse. tiles = desirabilityPreview(...).tiles: [{ x, y, v }]. Wash against hatch, never colour alone.
export function drawDesirabilityTint(g, tiles) {
  const better = [], worse = [];
  for (const t of tiles || []) if (t.v > 0) better.push([t.x, t.y]); else if (t.v < 0) worse.push([t.x, t.y]);
  g.polys(tilePolys(better), UI.nicer, { alpha: 0.28 });
  hatchTiles(g, worse, UI.bad, { fill: 0.1, line: 0.85 });
}

// Stage 3 (Track D, spec 4.5, 6.3): a tower's range and a barracks' patrol are straight-line tiles from its centre, not road
// reach: the tiles whose centres lie within that distance, highlighted when the building is selected.
export const RANGE_OF = { tower: DEFENCE.towerRange, barracks: DEFENCE.patrol };
export function rangeTiles(world, b) {
  const r = RANGE_OF[b.type];
  if (!r) return [];
  const cx = b.x + b.w / 2, cy = b.y + b.d / 2, out = [];
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(world.size - 1, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(world.size - 1, Math.ceil(cx + r)); x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) out.push(idx(world.size, x, y));
    }
  }
  return out;
}

// Stage 4 (Track C, spec 6.3): a monument site's reach, the road tiles within MONUMENT.crewReach (its guilds, quarries and
// brickworks serve it from there) and within MONUMENT.supplyReach (it draws from storehouses there): { crew, supply }, tile
// indices; empty for a site no road touches.
export function siteReachTiles(world, b) {
  return { crew: [...roadReach(world, b, MONUMENT.crewReach).keys()], supply: [...roadReach(world, b, MONUMENT.supplyReach).keys()] };
}

// Stage 4 (Track C, spec 6.3, ruling 281): View from the alert list, the banner or Welcome back outlines the building it selects
// in the marker's colour with a white halo for VIEW_OUTLINE.holdMs, then fades out over fadeMs under Full motion; under Gentle
// and Still it holds still and then goes. noteView(world, id) starts it (the View buttons call it); the clock and the Motion
// level come from the interface (setViewClock, the monuments interface sets it); drawReachHighlight draws it on the selected
// building, so it shows while View's selection does.
const viewClocks = new WeakMap();   // world -> { now(), motion() }
const viewed = new WeakMap();       // world -> { id, at }
export const setViewClock = (world, clock) => { viewClocks.set(world, clock); };
export function noteView(world, id) {
  const clock = viewClocks.get(world);
  if (Number.isInteger(id) && clock) viewed.set(world, { id, at: clock.now() });
}
// The outline's strength ms after View: 1 while it holds, easing to 0 over the fade under Full, else 0 once it has held.
export function viewOutlineAlpha(ms, motion) {
  if (ms < 0) return 0;
  if (ms < VIEW_OUTLINE.holdMs) return 1;
  if (motion === 'full' && ms < VIEW_OUTLINE.holdMs + VIEW_OUTLINE.fadeMs) return 1 - (ms - VIEW_OUTLINE.holdMs) / VIEW_OUTLINE.fadeMs;
  return 0;
}
// The outline's strength on building `id` now (0 when View did not pick it, or its time has passed).
export function viewOutlineOn(world, id) {
  const v = viewed.get(world), clock = viewClocks.get(world);
  if (!v || !clock || v.id !== id) return 0;
  return viewOutlineAlpha(clock.now() - v.at, clock.motion());
}

export function drawReachHighlight(g, world, b) {
  if (isSite(b)) {
    // Both reaches: the 16-tile supply reach lighter, the 12-tile crew and producer reach at the usual strength.
    const { crew, supply } = siteReachTiles(world, b);
    const inner = new Set(crew);
    tintTiles(g, world, supply.filter((t) => !inner.has(t)), UI.housing, 0.1);
    tintTiles(g, world, crew, UI.housing, 0.22);
  } else tintTiles(g, world, RANGE_OF[b.type] ? rangeTiles(world, b) : reachTiles(world, b), UI.housing, 0.22);
  g.poly(quad(b.x, b.y, b.w, b.d, 0), 'none', { stroke: UI.halo, strokeWidth: 2.2, strokeAlpha: 0.9 });
  g.poly(quad(b.x, b.y, b.w, b.d, 0), 'none', { stroke: UI.housing, strokeWidth: 1.2 });
  // View's outline, over the reach's: the marker's colour, 2 CSS px on a white halo, and a faint wash inside.
  const outline = viewOutlineOn(world, b.id);
  if (outline > 0) {
    const pts = quad(b.x, b.y, b.w, b.d, 0), css = cssScaleOf(g);
    g.poly(pts, UI.problem, { alpha: 0.12 * outline });
    g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 5 / css, strokeAlpha: 0.9 * outline });
    g.poly(pts, 'none', { stroke: UI.problem, strokeWidth: 2.5 / css, strokeAlpha: outline });
  }
}

// ghost = { x, y, w, d, state: 'ok' | 'warn' | 'bad' | 'demolish' | 'gate' | 'bridge' (Version 6.0) }. A gate (Stage 3, a wall tile drawn over a
// road) is an ok tile marked with an arch instead of a tick, so the wall tool shows where its gates will go.
// A building's ghost adds (placement review P9, P10, P13):
//   badge: true      its mark is a badge at least 20 screen px across at any zoom, not a glyph that shrinks with the map
//   tiles: [{ x, y, state: 'met' | 'cant' }]   each footprint tile's own state, when the footprint is part right, part wrong
//   joins: [[x, y]...]   the free tiles where a road would touch it: a dashed amber outline and the road mark
const BADGE_MIN_R = 5;            // art px: 10 CSS px at zoom 1, so the badge is 20 CSS px across (ART_SCALE 2)
const BADGE_CSS_R = 10;
const JOIN_INK = '#7A5200';       // css --amber-text: the road mark on a joining tile

// The scale the ghost's fixed-size marks divide by: CSS px per art px (the renderer sets it on the context; a bare drawing
// context has none, and its own scale stands in).
const cssScaleOf = (g) => g.cssScale || g.scale;

// A round badge with a mark, white halo, at least 20 CSS px across: ✓ white on blue, ! dark on amber, ✕ white on the deep coral
// of the problem badge (the glyph, not the colour, says which).
function ghostBadge(g, c, mark) {
  const css = cssScaleOf(g);
  const R = Math.max(BADGE_MIN_R, BADGE_CSS_R / css);
  const fill = mark === '✓' || mark === '∩' ? UI.ok : mark === '!' ? UI.warn : UI.problem;
  g.circ(c, R + 2 / css, UI.halo, { alpha: 0.95 });
  g.circ(c, R, fill, { stroke: INK, strokeWidth: 0.6, strokeAlpha: 0.5 });
  g.text(c, mark, { size: 1.3 * R, weight: '700', color: mark === '!' ? UI.label : UI.halo });
}

// Coral hatching clipped to a footprint, and its outline.
function hatchedBad(g, x, y, w, d) {
  const pts = quad(x, y, w, d, 0);
  g.save();
  g.clip(pts);
  g.poly(pts, UI.bad, { alpha: 0.18 });
  const left = p(x, y + d)[0], right = p(x + w, y)[0], top = p(x, y)[1], bottom = p(x + w, y + d)[1];
  for (let k = left - (bottom - top); k < right; k += 4) g.line([k, bottom], [k + (bottom - top), top], UI.bad, 1, 0.8);
  g.restore();
  g.poly(pts, 'none', { stroke: UI.bad, strokeWidth: 1.4 });
}

// Version 6.0 (Track C, ghost state 'left'): ground in a dragged farm area that no farm covers, too little left for one more: amber hatching the other way to the coral's, and a
// dashed amber outline on a white halo, so it reads from skipped ground (coral, crossed) by its pattern as well as its colour. Static.
function hatchedLeft(g, x, y, w, d) {
  const pts = quad(x, y, w, d, 0);
  g.save();
  g.clip(pts);
  g.poly(pts, UI.warn, { alpha: 0.14 });
  const left = p(x, y + d)[0], right = p(x + w, y)[0], top = p(x, y)[1], bottom = p(x + w, y + d)[1];
  for (let k = left; k < right + (bottom - top); k += 4) g.line([k, top], [k - (bottom - top), bottom], UI.warn, 1, 0.8);
  g.restore();
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 2.4, strokeAlpha: 0.7 });
  g.ctx.setLineDash([3 * g.scale, 2 * g.scale]);
  g.poly(pts, 'none', { stroke: UI.warn, strokeWidth: 1.4 });
  g.ctx.setLineDash([]);
}

// A tile's dashed amber outline on a white halo: the sign for a free tile where a road would join (with the road mark in it) and
// for a plot with no road beside it.
function dashedAmberTile(g, x, y) {
  const pts = quad(x, y, 1, 1, 0);
  g.poly(pts, UI.warn, { alpha: 0.18 });
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 2.4, strokeAlpha: 0.7 });
  g.ctx.setLineDash([3 * g.scale, 2 * g.scale]);
  g.poly(pts, 'none', { stroke: UI.warn, strokeWidth: 1.4 });
  g.ctx.setLineDash([]);
}

// The free tiles where a road would join the building: a faint amber wash, a dashed amber outline on a white halo and the road
// mark (the Roads category's), so "draw one on a marked tile" can be followed.
function drawRoadJoins(g, joins) {
  const css = cssScaleOf(g);
  const size = Math.max(6, 12 / css);
  for (const [jx, jy] of joins) {
    dashedAmberTile(g, jx, jy);
    g.text(p(jx + 0.5, jy + 0.5), '═', { size, weight: '700', color: JOIN_INK });
  }
}

// Stage 4 (Track C, spec 6.5): a monument's ghost carries silhouette: { world, b }, the finished monument it stands for, drawn
// by the live draw (render/monuments.js) at MONUMENT_PLACING.silhouetteAlpha and still, under the footprint's marks.
// Every art primitive sets the context's alpha absolutely, so scaling globalAlpha around the draw does nothing: the monument is
// drawn at full strength into an offscreen layer (the target's size and transform) and the layer is laid on once at the
// silhouette's alpha, so it is one even 35% with no see-through between its own faces.
let silhouetteLayer = null;
function layerFor(w, h) {
  if (!silhouetteLayer || silhouetteLayer.width !== w || silhouetteLayer.height !== h) {
    silhouetteLayer = document.createElement('canvas');
    silhouetteLayer.width = w;
    silhouetteLayer.height = h;
  }
  return silhouetteLayer;
}
function drawSilhouette(g, { world, b }) {
  const { ctx } = g;
  const target = ctx.canvas;
  if (!target || typeof ctx.getTransform !== 'function' || typeof document === 'undefined') {   // no canvas to layer on: the plain draw
    drawMonument(g, world, b, { motion: 'still' });
    return;
  }
  const layer = layerFor(target.width, target.height), lctx = layer.getContext('2d');
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.clearRect(0, 0, layer.width, layer.height);
  lctx.setTransform(ctx.getTransform());
  drawMonument(makeDraw(lctx, g.scale, g.cssScale), world, b, { motion: 'still' });
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = MONUMENT_PLACING.silhouetteAlpha;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

// Version 6.0 (Track C): a bridge tile of a road's preview (ghost state 'bridge'): the usual blue tile with a deck of planks laid across it (three brown strokes on a pale halo),
// and the wave mark in the middle; so a bridge reads from a road tile by its planks and its mark as well as by the water under it. Static: nothing moves.
function bridgePlanks(g, x, y) {
  for (const f of [0.22, 0.5, 0.78]) {
    const a = p(x + 0.08, y + f), b = p(x + 0.92, y + f);
    g.line(a, b, UI.halo, 2.4, 0.7);
    g.line(a, b, WOOD, 1.2);
  }
}

// Version 7.0 (Track P, ruling 1008): a building's ghost square by square. Each footprint square shows its own verdict, so a farm half on the fields reads at a glance:
//   met    blue, solid outline: the square is right (free dry ground, and on the terrain the building stands on)
//   cant   coral hatching and a ✕: the square is wrong (taken, water, hills, off the map, not the terrain the building needs): the building cannot go here
//   off    amber hatching, a dashed outline and a !: free ground, but not the terrain the building's rule counts, and the rule is not met
//   plain  a faint dashed outline, no fill: free ground the rule does not count (the clay pit counts 2 of 4 squares) and does not need
// The whole ghost's verdict is the heavier outline round it (blue, amber for "placed but will not work yet", coral for "cannot be placed") and the badge in its middle (✓ ! ✕);
// the squares carry the pattern, so no verdict is colour alone. The water that counts for its water rule (≈) and the road that touches a side (═, solid; the free squares where
// one would go are dashed amber, drawRoadJoins) are marked beside it.
function plainSquare(g, x, y) {
  const pts = quad(x, y, 1, 1, 0);
  g.poly(pts, UI.ok, { alpha: 0.04 });
  g.ctx.setLineDash([2 * g.scale, 2 * g.scale]);
  g.poly(pts, 'none', { stroke: UI.ok, strokeWidth: 1, strokeAlpha: 0.7 });
  g.ctx.setLineDash([]);
}
function markedTile(g, x, y, mark, color) {
  const pts = quad(x, y, 1, 1, 0), css = cssScaleOf(g);
  g.poly(pts, color, { alpha: 0.16 });
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 2.4, strokeAlpha: 0.75 });
  g.poly(pts, 'none', { stroke: color, strokeWidth: 1.4 });
  g.text(p(x + 0.5, y + 0.5), mark, { size: Math.max(6, 12 / css), weight: '700', color: JOIN_INK });
}
function drawSquares(g, ghost) {
  const { x, y, w, d, state, tiles, badge, wet, roadAt } = ghost;
  for (const t of tiles) {
    const centre = p(t.x + 0.5, t.y + 0.5);
    if (t.state === 'cant') { hatchedBad(g, t.x, t.y, 1, 1); if (tiles.length > 1) ghostBadge(g, centre, '✕'); }
    else if (t.state === 'off') { hatchedLeft(g, t.x, t.y, 1, 1); ghostBadge(g, centre, '!'); }
    else if (t.state === 'plain') plainSquare(g, t.x, t.y);
    else {
      const tp = quad(t.x, t.y, 1, 1, 0);
      g.poly(tp, UI.ok, { alpha: 0.15 });
      g.poly(tp, 'none', { stroke: UI.halo, strokeWidth: 2.6, strokeAlpha: 0.8 });
      g.poly(tp, 'none', { stroke: UI.ok, strokeWidth: 1.4 });
    }
  }
  for (const [wx, wy] of wet || []) markedTile(g, wx, wy, '≈', UI.ok);
  for (const [rx, ry] of roadAt || []) markedTile(g, rx, ry, '═', UI.ok);
  const whole = state === 'bad' ? UI.bad : state === 'warn' ? UI.warn : UI.ok;
  const pts = quad(x, y, w, d, 0), css = cssScaleOf(g);
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 4.4 / css, strokeAlpha: 0.85 });
  g.poly(pts, 'none', { stroke: whole, strokeWidth: 2.6 / css });
  // The verdict's badge in the middle, unless the squares already carry it (a 1-square ghost's mark is that badge; a coral square has its own ✕).
  const own = tiles.some((t) => (state === 'bad' ? t.state === 'cant' : false)) && tiles.length > 1;
  if (!own && badge) ghostBadge(g, p(x + w / 2, y + d / 2), state === 'warn' ? '!' : state === 'bad' ? '✕' : '✓');
}

export function drawGhost(g, ghost) {
  const { x, y, w, d, state, tiles, joins, badge } = ghost;
  const pts = quad(x, y, w, d, 0);
  const centre = p(x + w / 2, y + d / 2);
  if (ghost.silhouette) drawSilhouette(g, ghost.silhouette);
  if (joins && joins.length) drawRoadJoins(g, joins);
  // A building's ghost always has its squares (ghostsFor); a monument's, with its silhouette, keeps its one outline until a square is wrong.
  if (badge && tiles && tiles.length && (!ghost.silhouette || tiles.some((t) => t.state === 'cant' || t.state === 'off'))) { drawSquares(g, ghost); return; }
  if (state === 'bad' && tiles && tiles.length) {
    // Part of the footprint is fine: each tile shows its own state, the good ones blue, the bad ones coral with a cross.
    for (const t of tiles) {
      if (t.state === 'cant') {
        hatchedBad(g, t.x, t.y, 1, 1);
        ghostBadge(g, p(t.x + 0.5, t.y + 0.5), '✕');
      } else {
        const tp = quad(t.x, t.y, 1, 1, 0);
        g.poly(tp, UI.ok, { alpha: 0.15 });
        g.poly(tp, 'none', { stroke: UI.halo, strokeWidth: 2.6, strokeAlpha: 0.8 });
        g.poly(tp, 'none', { stroke: UI.ok, strokeWidth: 1.4 });
      }
    }
    g.poly(pts, 'none', { stroke: UI.bad, strokeWidth: 1.4 });
    return;
  }
  if (state === 'bad' || state === 'demolish') {
    hatchedBad(g, x, y, w, d);
    if (state === 'bad') { if (badge) ghostBadge(g, centre, '✕'); else g.text(centre, '✕', { size: 9, color: UI.bad }); }
    return;
  }
  if (state === 'left') { hatchedLeft(g, x, y, w, d); return; }   // Version 6.0 (Track C): ground an area has but too little of for one more farm
  const color = state === 'warn' ? UI.warn : UI.ok;
  g.poly(pts, color, { alpha: state === 'bridge' || state === 'ferry' ? 0.32 : 0.15 });
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 2.6, strokeAlpha: 0.8 });
  g.poly(pts, 'none', { stroke: color, strokeWidth: 1.4 });
  if (state === 'bridge') bridgePlanks(g, x, y);
  const mark = state === 'warn' ? '!' : state === 'gate' ? '∩' : state === 'bridge' || state === 'ferry' ? '≈' : '✓';   // Version 7.1: a ferry's water squares carry the wave, with no planks
  if (badge) ghostBadge(g, centre, mark); else g.text(centre, mark, { size: 9, color });
}

// Problem markers (early-game pass 2.8, placement review P13): a coral badge over a building with an alert, an amber "↓" over a
// home counting down to lose a tier. One per building, drawn in the overlay pass, never animated. The badge is at least 20 CSS px
// across at any zoom (BADGE_R art px, grown when the map is zoomed out), and its mark says the cause: the road mark (two bars)
// when the building has no road beside it, "!" for any other problem. The list is a pure function the draw and the tests share.
// `lift` is art px from the footprint centre up to the badge's centre at its smallest size: the sprite's top (its height above the
// back corner, plus the back corner's 4 * (w + d) above the centre), then the badge radius and a pixel; a bigger badge rides higher
// by what it grew. `cause` is the alert code that decides the mark ('no_road' first), 'down' for a home losing a tier.
const BADGE_R = 5;

export function problemMarkers(world, alerts, range = null) {
  const cause = new Map();
  for (const a of alerts || []) {
    if (a.id === undefined || a.id === null) continue;
    if (!cause.has(a.id) || a.code === 'no_road') cause.set(a.id, a.code);   // the road decides the mark whatever else is wrong
  }
  const out = [];
  for (const b of allBuildings(world)) {
    const kind = b.type === 'house' ? (b.tier > 1 && b.downTimer > 0 ? 'down' : null) : (cause.has(b.id) ? 'problem' : null);
    if (!kind) continue;
    const x = b.x + b.w / 2, y = b.y + b.d / 2;
    if (range && (x < range.x0 || x > range.x1 + 1 || y < range.y0 || y > range.y1 + 1)) continue;
    const art = ART[slotFor(b)];
    out.push({ id: b.id, x, y, lift: (art ? art.height + 4 * (b.w + b.d) : 30) + BADGE_R + 1, kind, cause: kind === 'down' ? 'down' : cause.get(b.id) });
  }
  return out;
}

// The homes and plots in view with no road beside them: each gets a dashed amber outline on its tile (drawProblemMarkers), since a
// plot with no road is a pale patch that nothing else marks. range is the visible tile range, as for problemMarkers.
// Version 5.0 (Task 6): the whole list is kept while the roads and the buildings are as they were (roadVersion, buildingsVersion: a house's place and the road beside it are all
// it depends on), so a frame filters a list instead of asking every home whether a road touches it.
const plotsMemo = new WeakMap();   // world -> { key, list }
export function roadlessPlots(world, range = null) {
  const key = `${world.roadVersion}|${buildingsVersion(world)}`;
  let m = plotsMemo.get(world);
  if (!m || m.key !== key) {
    const list = [];
    for (const b of housesOf(world)) if (!touchesRoad(world, b)) list.push({ id: b.id, x: b.x, y: b.y });
    m = { key, list };
    plotsMemo.set(world, m);
  }
  if (!range) return m.list;
  return m.list.filter((b) => !(b.x < range.x0 - 1 || b.x > range.x1 + 1 || b.y < range.y0 - 1 || b.y > range.y1 + 1));
}

// One road badge per connected group of homes and plots with no road beside them (final review 7): the outlines alone are thin,
// so the map also says "road" over them the way it does over a well with no road, without a badge on every plot. Plots join a
// group when their footprints touch along an edge. The badge sits over the group's plot nearest the group's middle, just above
// its sprite (just above the tile for an empty plot), as a building's badge does. Memoised on the roads and the buildings (it
// runs every frame); range keeps the ones in view.
const plotBadgeMemo = new WeakMap();   // world -> { key, list }
export function roadlessPlotBadges(world, range = null) {
  const key = `${world.roadVersion}|${buildingsVersion(world)}`;   // Version 5.0 (Task 6): the groups depend on the roads and which homes stand where, not on their staff or tier
  let m = plotBadgeMemo.get(world);
  if (!m || m.key !== key) { m = { key, list: groupRoadless(world) }; plotBadgeMemo.set(world, m); }
  for (const b of m.list) { const art = ART[slotFor(world.buildings[b.id])]; b.lift = (art ? art.height : 0) + b.liftBase; }   // the sprite's height follows the tier, which the memo does not key on
  if (!range) return m.list;
  return m.list.filter((b) => b.x >= range.x0 && b.x <= range.x1 + 1 && b.y >= range.y0 && b.y <= range.y1 + 1);
}

function groupRoadless(world) {
  const lone = housesOf(world).filter((h) => !touchesRoad(world, h));
  const at = new Map();                        // tile index -> the plot on it
  for (const h of lone) for (let y = h.y; y < h.y + h.d; y++) for (let x = h.x; x < h.x + h.w; x++) at.set(idx(world.size, x, y), h);
  const seen = new Set(), out = [];
  for (const start of lone) {
    if (seen.has(start.id)) continue;
    const group = [start];
    seen.add(start.id);
    for (let k = 0; k < group.length; k++) {
      const h = group[k];
      for (let y = h.y - 1; y <= h.y + h.d; y++) {
        for (let x = h.x - 1; x <= h.x + h.w; x++) {
          const corner = (x < h.x || x >= h.x + h.w) && (y < h.y || y >= h.y + h.d);
          if (corner || x < 0 || y < 0 || x >= world.size || y >= world.size) continue;
          const o = at.get(idx(world.size, x, y));
          if (o && !seen.has(o.id)) { seen.add(o.id); group.push(o); }
        }
      }
    }
    const mid = group.reduce((s, h) => [s[0] + (h.x + h.w / 2) / group.length, s[1] + (h.y + h.d / 2) / group.length], [0, 0]);
    const d = (h) => Math.hypot(h.x + h.w / 2 - mid[0], h.y + h.d / 2 - mid[1]);
    const pick = group.reduce((a, h) => (d(h) < d(a) - 1e-9 || (Math.abs(d(h) - d(a)) <= 1e-9 && h.id < a.id) ? h : a));
    out.push({ id: pick.id, ids: group.map((h) => h.id).sort((a, b) => a - b), x: pick.x + pick.w / 2, y: pick.y + pick.d / 2, liftBase: 4 * (pick.w + pick.d) + BADGE_R + 1, lift: 0 });   // lift = the pick's sprite height (an empty plot has none: just over its tile) + liftBase, refreshed on each read
  }
  return out;
}

// The road mark: two bars, white on the badge (a font's "═" is not always there).
function roadMark(g, c, R) {
  const half = 0.55 * R, gap = 0.28 * R;
  for (const dy of [-gap, gap]) g.line([c[0] - half, c[1] + dy], [c[0] + half, c[1] + dy], UI.halo, Math.max(1.2, 0.3 * R), 1);
}

// A badge's disc on its white halo, at (x, y) lifted `lift` art px, riding up by what it grew past BADGE_R.
function badgeDisc(g, x, y, lift, R, css, fill) {
  const c = U(p(x, y), lift + (R - BADGE_R));
  g.circ(c, R + Math.max(1.2, 2 / css), UI.halo, { alpha: 0.9 });
  g.circ(c, R, fill, { stroke: INK, strokeWidth: 0.6, strokeAlpha: 0.5 });
  return c;
}

export function drawProblemMarkers(g, world, alerts, range) {
  for (const t of roadlessPlots(world, range)) dashedAmberTile(g, t.x, t.y);
  const css = cssScaleOf(g);
  const R = Math.max(BADGE_R, BADGE_CSS_R / css);   // 20 CSS px across at the least, at any zoom
  for (const b of roadlessPlotBadges(world, range)) roadMark(g, badgeDisc(g, b.x, b.y, b.lift, R, css, UI.problem), R);
  for (const m of problemMarkers(world, alerts, range)) {
    const down = m.kind === 'down';
    const c = badgeDisc(g, m.x, m.y, m.lift, R, css, down ? UI.warn : UI.problem);
    if (m.cause === 'no_road') roadMark(g, c, R);
    else g.text(c, down ? '↓' : '!', { size: 1.5 * R, weight: '700', color: down ? UI.label : UI.halo });   // the glyph, not the colour, says which
  }
}

// The guided start's ring on the ground at a step's target (early-game pass 3.2): teal on a white halo.
// Pulsing, it grows and fades once per GUIDE_PULSE_MS, counted from `age`, the time since its step began (so the
// first pulse starts small at the step change); at rest it is drawn still (always so under reduced motion, which
// the caller decides).
export function drawGuideMarker(g, x, y, pulsing = false, age = 0) {
  const k = pulsing ? (age % GUIDE_PULSE_MS) / GUIDE_PULSE_MS : 0;
  const r = 0.8 + k * 0.6;
  const fade = 1 - k * 0.7;
  const pts = quad(x - r, y - r, 2 * r, 2 * r, 0);
  g.poly(pts, TEAL_DARK, { alpha: 0.12 * fade });
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 3.4, strokeAlpha: 0.85 * fade });
  g.poly(pts, 'none', { stroke: TEAL_DARK, strokeWidth: 2, strokeAlpha: fade });
}
