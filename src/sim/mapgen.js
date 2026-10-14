import { createRng, valueNoise, hash2 } from './rng.js';
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { T } from './terrain.js';
import { MAP, MAP_VARIANTS, MAP_SALT, areaScale } from '../data/map.js';
import { LAND_VERSION, newLandFor } from '../data/s47.js';

// Clay (Stage 4.5, ruling 312): the bank tiles are chained along the water, so a stretch is a walk of 4-10 of them from a
// seeded start, 8-neighbour steps in a fixed order; some stretches are two tiles deep, taking the dry land tile beside each
// bank tile (desert, meadow or fertile, never rock or a bank) as well. Stretches go on until the map holds its target
// (MAP.clay), counted in tiles turned to clay. free(i) says a tile may change: always on a new map, and, when an old
// map is migrated, only a tile with no building, road or wall on it. Returns the number of tiles turned. Deterministic
// in (terrain, size, seed); the draws have their own salt, so they never move the generator's.
export function addClay(terrain, size, seed, free = () => true, { salt = 0, target = null, wide = false } = {}) {
  const C = MAP.clay;
  const rng = createRng(((seed ^ C.salt) + salt) >>> 0);
  const banks = [];
  for (let i = 0; i < terrain.length; i++) if (terrain[i] === T.BANK && free(i)) banks.push(i);
  if (!banks.length) return 0;
  const as = areaScale(size);   // Stage 4.6 (ruling 333): the target grows with the map's area; at 64 it is C.targetMin + rng.int(C.targetExtra + 1), as before
  const goal = target === null ? (as === 1 ? C.targetMin + rng.int(C.targetExtra + 1) : Math.round(C.targetMin * as) + rng.int(Math.round(C.targetExtra * as) + 1)) : target;
  const W = MAP.shapes.clay, wrng = wide ? createRng(((seed ^ MAP_SALT.clayWide) + salt) >>> 0) : null;
  const dry = (t) => t === T.DESERT || t === T.MEADOW || t === T.FERTILE;
  let turned = 0;   // the clay the map holds by now (a lake's included), so the target is for the whole map
  for (const t of terrain) if (t === T.CLAY) turned++;
  const first = turned;
  for (let tries = 0; tries < C.maxTries && turned < goal; tries++) {
    const start = banks[rng.int(banks.length)];
    if (terrain[start] !== T.BANK) continue;
    const want = C.stretchMin + rng.int(C.stretchExtra), deep = rng.chance(C.deepChance);
    const stretch = [start], seen = new Set([start]);
    for (let k = 0; k < stretch.length && stretch.length < want; k++) {
      const x = stretch[k] % size, y = (stretch[k] - x) / size;
      for (let dy = -1; dy <= 1 && stretch.length < want; dy++) for (let dx = -1; dx <= 1 && stretch.length < want; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (!inBounds(size, nx, ny)) continue;
        const n = idx(size, nx, ny);
        if (!seen.has(n) && terrain[n] === T.BANK && free(n)) { seen.add(n); stretch.push(n); }
      }
    }
    if (wide) {   // Stage 4.6 (ruling 331): 2-3 tiles across: each bank tile and one or two layers of dry land inland of it, at most W.cap tiles a stretch
      const depth = (W.wideMin - 1) + wrng.int(W.wideExtra);
      const taken = new Set(stretch);
      let front = stretch, cap = W.cap;
      for (const b of stretch) { terrain[b] = T.CLAY; turned++; cap--; }
      for (let d = 0; d < depth && cap > 0; d++) {
        const next = [];
        for (const b of front) {
          const x = b % size, y = (b - x) / size;
          for (const [dx, dy] of NEIGHBOURS4) {
            if (cap <= 0 || !inBounds(size, x + dx, y + dy)) continue;
            const n = idx(size, x + dx, y + dy);
            if (taken.has(n) || !dry(terrain[n]) || !free(n)) continue;
            taken.add(n); terrain[n] = T.CLAY; turned++; cap--; next.push(n);
          }
        }
        front = next;
      }
      continue;
    }
    for (const b of stretch) {
      terrain[b] = T.CLAY; turned++;
      if (!deep) continue;
      const x = b % size, y = (b - x) / size;
      for (const [dx, dy] of NEIGHBOURS4) {
        if (!inBounds(size, x + dx, y + dy)) continue;
        const n = idx(size, x + dx, y + dy);
        if (dry(terrain[n]) && free(n)) { terrain[n] = T.CLAY; turned++; }
      }
    }
  }
  return turned - first;
}

// The variant a seed picks when a city is started with 'auto' (ruling 313): one draw, hash2 keyed by the seed with a salt.
export const variantFor = (seed) => MAP_VARIANTS[Math.floor(hash2(seed, 0, MAP.variantSalt) * MAP_VARIANTS.length)];

// The map. variant picks the river's layout (ruling 313, MAP.variants); 'classic' is the original generator, draw for draw,
// so every fixture, dev scene and old seed keeps its map. The others share its terrain rules (water, a one-tile bank, the
// fertile band, meadow, clay) and differ in where the river runs, how it bends, an island in it or a lake in the desert, and
// where the rock lies (always off the river: no patch within MAP.rockAwayTiles of water, none on the start area).
//
// size (Stage 4.6, ruling 333): MAP_SIZES' 48, 64 or 80 (any size works; tests use small ones). The layouts' positions were drawn
// for 64 (MAP.size): at another size each position across or down the map (where the river runs, where rock and a lake may lie,
// where the raiders come in) is scaled by size / 64 (at), and widths, bends and distances stay as they are. At 64 `at` is the
// identity, so classic at 64 draws exactly as before (tests/stage46/contract/mapSizes.test.js holds the fingerprints). The counts that
// follow the map's area (the rock, the clay, the raider entries) scale with areaScale (ruling 333).
//
// Shape choices (ruling 332): every map but classic at Normal also draws seeded choices (MAP.shapes, MAP_SALT): how strongly and how
// long the river meanders, 0-2 side channels or oxbow lakes (pools of water of their own), 2-5 rocky outcrop clusters, 1-3 palm groves,
// dune fields and 0-2 dry wadis (decor on desert), and clay patches 2-3 tiles across; they are returned in params (world.mapParams) and
// drawn from the seed, the size and the layout alone, so a link, a stamp and a replay draw the same map.
export function generateMap(seed, size = MAP.size, variant = 'classic') {
  const v = MAP_VARIANTS.includes(variant) ? variant : 'classic';
  const spec = MAP.variants[v];
  const at = (n) => (size === MAP.size ? n : Math.round((n * size) / MAP.size));
  // Stage 4.6 (ruling 332): every map but classic at Normal draws seeded shape choices (src/data/map.js MAP.shapes); classic at Normal
  // draws exactly as before and keeps params {}.
  const varied = v !== 'classic' || size !== MAP.size;
  const SH = MAP.shapes, params = {};
  const mean = varied ? meanderFor(seed) : null;
  if (mean) params.meander = mean;
  const rng = createRng(seed);
  const terrain = new Array(size * size).fill(T.DESERT);
  const phase = rng.range(0, Math.PI * 2);
  const base = at(spec.riverBaseX === undefined ? MAP.riverBaseX : spec.riverBaseX);
  const swing = (w) => (mean ? { amp: w.amp * mean.strength, period: w.period * mean.length } : w);
  const wave1 = swing(spec.wave1 || MAP.riverWave1), wave2 = swing(spec.wave2 || MAP.riverWave2);
  const rawX = (y) => base + wave1.amp * Math.sin(y / wave1.period + phase) + wave2.amp * Math.sin(y / wave2.period + phase * 2);
  const flipped = spec.mirror ? (y) => size - 1 - rawX(y) : rawX;
  const riverX = varied ? (y) => Math.min(size - 1 - SH.meander.edge, Math.max(SH.meander.edge, flipped(y))) : flipped;   // a meandering river never runs off the map
  const hw = MAP.waterHalfWidth;

  // An island splits the river: the water spreads to a fixed span round the island over its rows, easing in and out (f).
  let isl = null;
  if (spec.island) {
    const I = spec.island;
    const yc = at(I.minY) + rng.int(at(I.spanY));
    isl = { cy: yc + 0.5, half: I.halfMin + rng.range(0, I.halfExtra), lx: I.lxMin + rng.range(0, I.lxExtra), ix: Math.round(riverX(yc)) };
  }
  const islandEase = (y) => {
    if (!isl) return 0;
    const d = Math.max(0, Math.abs(y + 0.5 - isl.cy) - (isl.half + 1));
    if (d >= spec.island.ease) return 0;
    const t = 1 - d / spec.island.ease;
    return t * t * (3 - 2 * t);
  };

  for (let y = 0; y < size; y++) {
    const cx = riverX(y);
    const f = islandEase(y);
    const wl = f ? (1 - f) * (cx - hw) + f * (isl.ix - isl.lx - spec.island.mainBank) : 0;
    const wr = f ? (1 - f) * (cx + hw) + f * (isl.ix + isl.lx + spec.island.sideBank) : 0;
    for (let x = 0; x < size; x++) {
      let dist = Math.abs(x - cx);
      if (f) dist = (x < wl ? wl - x : x > wr ? x - wr : 0) + hw;
      let t = T.DESERT;
      if (dist <= hw) t = T.WATER;
      else if (dist <= MAP.bankHalfWidth) t = T.BANK;
      else if (dist <= MAP.fertileBase + valueNoise(x, y, seed, MAP.fertileNoiseScale) * MAP.fertileNoise) t = T.FERTILE;
      else if (valueNoise(x, y, seed + 17, MAP.meadowNoiseScale) > MAP.meadowThreshold) t = T.MEADOW;
      terrain[idx(size, x, y)] = t;
    }
  }

  if (isl) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const e = ((x - isl.ix) / isl.lx) ** 2 + ((y + 0.5 - isl.cy) / isl.half) ** 2;
        if (e <= 1) terrain[idx(size, x, y)] = e <= spec.island.core ? T.FERTILE : T.BANK;
      }
    }
  }

  // An oasis: a lake in the desert with a bank ring and a fertile ring, its edge wavering with the noise; some of its bank
  // turns to clay first, so the lake always has a little.
  if (spec.lake) {
    const L = spec.lake;
    const lake = { x: at(L.minX) + rng.int(at(L.spanX)), y: at(L.minY) + rng.int(at(L.spanY)), r: L.rMin + rng.range(0, L.rExtra) };
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - lake.x, y - lake.y);
        const r = lake.r + (valueNoise(x, y, seed + 53, 3) - 0.5) * L.wobble;
        const i = idx(size, x, y);
        if (d <= r) terrain[i] = T.WATER;
        else if (d <= r + 1) terrain[i] = T.BANK;
        else if (d <= r + 1 + L.fertileRing && (terrain[i] === T.DESERT || terrain[i] === T.MEADOW)) terrain[i] = T.FERTILE;
      }
    }
    const reach = lake.r + L.wobble / 2 + 1 + L.fertileRing + 1;
    addClay(terrain, size, seed, (i) => Math.hypot((i % size) - lake.x, Math.floor(i / size) - lake.y) <= reach, { salt: 1, target: L.clay });
  }

  // The trade road comes in MAP.tradeRoadOffsetX tiles off the river at the south edge; a river that bends hard (spec.clearStart) is
  // measured at its farthest swing over the last rows, so the first homes never land on it.
  let nearEdge = riverX(size - 1);
  if (spec.clearStart || varied) for (let y = size - MAP.clearStartRows; y < size; y++) nearEdge = spec.mirror ? Math.min(nearEdge, riverX(y)) : Math.max(nearEdge, riverX(y));
  const ex = Math.round(nearEdge) + (spec.mirror ? -MAP.tradeRoadOffsetX : MAP.tradeRoadOffsetX);
  const focus = { x: ex + (spec.mirror ? -MAP.focusOffset.x : MAP.focusOffset.x), y: size + MAP.focusOffset.y };

  const rp = MAP.rockPatches;
  if (varied) {
    // Outcrop clusters (ruling 332) in the variant's x ranges (classic's is its patches' box), the rock scaled by the map's area.
    const ranges = (spec.rocks ? spec.rocks.ranges : [[rp.minX, rp.minX + MAP.size - rp.marginX - 1]]).map(([x0, x1]) => [at(x0), at(x1)]);
    params.outcrops = addOutcrops(terrain, size, seed, ranges, focus, at);
    addPools(terrain, size, seed, riverX, focus, ex, params);
    addGroves(terrain, size, seed, params);
  } else if (v === 'classic') {
    const patches = rp.min + rng.int(rp.extra);
    for (let p = 0; p < patches; p++) {
      const px = at(rp.minX) + rng.int(size - at(rp.marginX)), py = at(rp.minY) + rng.int(size - at(rp.marginY)), r = rp.radiusMin + rng.int(rp.radiusExtra);
      for (let y = py - r - 1; y <= py + r + 1; y++) {
        for (let x = px - r - 1; x <= px + r + 1; x++) {
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          if ((x - px) ** 2 + (y - py) ** 2 <= r * r + valueNoise(x, y, seed + 31, rp.edgeNoiseScale) * rp.edgeNoise) terrain[idx(size, x, y)] = T.ROCKY;
        }
      }
    }
  }

  addClay(terrain, size, seed, undefined, varied ? { wide: true } : {});

  const tradeEntry = { x: ex, y: size - 1 };
  const startRoad = [];
  for (let y = size - 1; y >= size - MAP.startRoadLength; y--) {
    startRoad.push([ex, y]);
    const i = idx(size, ex, y);
    if (terrain[i] === T.WATER || terrain[i] === T.ROCKY) terrain[i] = T.DESERT;
  }
  const raiderEntries = entriesFor(terrain, size, spec, at);
  // params (Stage 4.6, world.mapParams): the seeded shape choices (ruling 332), for display and replays: the meander's strength and length,
  // the outcrop clusters placed, the side channels and oxbow lakes (pools), palm groves, dune fields and wadis (the last two are only drawn).
  if (varied) addDunesAndWadis(terrain, size, seed, focus, ex, params);
  // Stage 4.7 (Task 0 contract): every map but classic at Normal gets the new land (hills, oases, the grass band; Tasks 1-3 fill them
  // in, each drawing from S47_SALT, never the rng stream above). land marks it in world.mapParams; oases: [{ x, y, r }] (world.oases).
  const oases = [];
  if (newLandFor(v, size)) params.land = LAND_VERSION;
  return { size, terrain, tradeEntry, startRoad, focus, raiderEntries, variant: v, params, oases };
}

// ── Stage 4.6 (ruling 332): the seeded shape choices. Each has its own stream (MAP_SALT), so classic at Normal, which draws none, never
// moves; everything below is a function of (seed, size, layout) alone, so a share link, a record's stamp and a replay draw the same map.
const round2 = (n) => Math.round(n * 100) / 100;
const between = ([a, b], u) => a + (b - a) * u;
const isDry = (t) => t === T.DESERT || t === T.FERTILE || t === T.MEADOW;

// The river's swing and wavelength, as factors of the layout's own.
function meanderFor(seed) {
  const M = MAP.shapes.meander;
  return { strength: round2(between(M.strength, hash2(seed, 1, MAP_SALT.meander))), length: round2(between(M.length, hash2(seed, 2, MAP_SALT.meander))) };
}

// Chebyshev distance of every tile to the nearest water tile, searched out to cap (cap + 1 where it is farther): one breadth-first pass.
function waterDistance(terrain, size, cap) {
  const d = new Uint8Array(size * size).fill(Math.min(255, cap + 1));
  const queue = [];
  for (let i = 0; i < terrain.length; i++) if (terrain[i] === T.WATER) { d[i] = 0; queue.push(i); }
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k];
    if (d[i] >= cap) continue;
    const x = i % size, y = (i - x) / size;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || !inBounds(size, x + dx, y + dy)) continue;
      const n = idx(size, x + dx, y + dy);
      if (d[n] > d[i] + 1) { d[n] = d[i] + 1; queue.push(n); }
    }
  }
  return d;
}

// Outcrop clusters: 2-5 centres (every x range of the layout gets one first), each grown by round patches of radius 3, 2 or 1 within a few
// tiles of its centre, the clusters taking turns, until the map holds MAP.rockTarget x area rocky tiles. A patch whose centre lies within
// MAP.rockAwayTiles of water, or near the start area (the focus), is skipped, so the rock is always off the river and out of the first homes'
// way. Returns how many clusters it placed.
function addOutcrops(terrain, size, seed, ranges, focus, at) {
  const rp = MAP.rockPatches, S = MAP.shapes.outcrops;
  const rng = createRng((seed ^ MAP_SALT.outcrops) >>> 0);
  const target = Math.round(MAP.rockTarget * areaScale(size));
  const clusters = S.min + rng.int(S.extra);
  const wd = waterDistance(terrain, size, MAP.rockAwayTiles);
  const ok = (px, py) => px >= 0 && py >= 0 && px < size && py < size && Math.hypot(px - focus.x, py - focus.y) >= MAP.rockAwayStart && wd[idx(size, px, py)] > MAP.rockAwayTiles;
  const centres = [];
  for (let c = 0; c < clusters; c++) {
    const [x0, x1] = ranges[c % ranges.length];
    for (let t = 0; t < 60; t++) {
      const px = x0 + rng.int(x1 - x0 + 1), py = at(rp.minY) + rng.int(size - at(rp.marginY));
      if (ok(px, py)) { centres.push([px, py, x0, x1]); break; }
    }
  }
  const stamp = (px, py, r) => {
    let n = 0;
    for (let y = py - r - 1; y <= py + r + 1; y++) {
      for (let x = px - r - 1; x <= px + r + 1; x++) {
        if (!inBounds(size, x, y)) continue;
        const i = idx(size, x, y);
        if (terrain[i] === T.WATER || terrain[i] === T.ROCKY) continue;
        if ((x - px) ** 2 + (y - py) ** 2 <= r * r + valueNoise(x, y, seed + 31, rp.edgeNoiseScale) * rp.edgeNoise) { terrain[i] = T.ROCKY; n++; }
      }
    }
    return n;
  };
  let count = 0;
  for (let t = 0; t < S.tries && count < target && centres.length; t++) {
    const [cx, cy, x0, x1] = centres[t % centres.length];
    let px = cx, py = cy;
    if (t >= centres.length) {
      const spread = t < S.tries / 2 ? S.spread : S.spread * 2;   // a cluster crowded out of room reaches further in the second half of the tries
      px = Math.min(x1, Math.max(x0, px + Math.round(rng.range(-spread, spread)))); py += Math.round(rng.range(-spread, spread));   // and stays in its x range
      if (!ok(px, py)) continue;
    }
    const need = target - count;
    count += stamp(px, py, need >= 30 ? 3 : need >= 14 ? 2 : 1);
  }
  return centres.length;
}

// Side channels and oxbow lakes: up to MAP.shapes.pools.max pieces of water of their own (so the river stays the biggest piece, and the
// water never joins it: each lies 4 tiles or more from any water), a bank tile round each. A channel is 1 tile wide and runs beside the river
// at its offset; an oxbow is an ellipse. None lies near rock, the start area or the trade road's corridor, so the invariants of the
// layouts hold. Writes params.pools.
function addPools(terrain, size, seed, riverX, focus, ex, params) {
  const P = MAP.shapes.pools, hw = MAP.waterHalfWidth;
  const rng = createRng((seed ^ MAP_SALT.channels) >>> 0);
  const count = rng.int(P.max + 1);
  const pools = [];
  const near = (x, y, r, test) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inBounds(size, x + dx, y + dy) && test(terrain[idx(size, x + dx, y + dy)])) return true; return false; };
  const fits = (tiles) => tiles.every(([x, y]) => x >= P.edge && y >= P.edge && x < size - P.edge && y < size - P.edge
    && isDry(terrain[idx(size, x, y)]) && Math.hypot(x - focus.x, y - focus.y) >= P.clearStart && !(Math.abs(x - ex) <= 3 && y >= size - 14)
    && !near(x, y, P.clearWater, (t) => t === T.WATER) && !near(x, y, P.clearRock, (t) => t === T.ROCKY));
  for (let k = 0; k < count; k++) {
    const kind = rng.chance(0.5) ? 'channel' : 'oxbow';
    for (let tries = 0; tries < P.tries; tries++) {
      const side = rng.chance(0.5) ? 1 : -1, off = P.offset[0] + rng.int(P.offset[1] - P.offset[0] + 1);
      const tiles = [];
      let pool;
      if (kind === 'channel') {
        const len = P.channelLen[0] + rng.int(P.channelLen[1] - P.channelLen[0] + 1);
        const y0 = P.edge + 1 + rng.int(Math.max(1, size - len - 2 * (P.edge + 1)));
        let prev = null;
        for (let j = 0; j < len; j++) {
          const y = y0 + j, x = Math.round(riverX(y) + side * (hw + off));
          if (prev !== null && x !== prev) for (let q = prev + Math.sign(x - prev); q !== x; q += Math.sign(x - prev)) tiles.push([q, y - 1]);   // a bend: filled in so the channel is one piece
          tiles.push([x, y]);
          prev = x;
        }
        pool = { kind, x: tiles[0][0], y: y0, len };
      } else {
        const rx = between(P.oxbowRx, rng.next()), ry = between(P.oxbowRy, rng.next());
        const cy = P.edge + 4 + rng.int(Math.max(1, size - 2 * (P.edge + 4))), cx = Math.round(riverX(cy) + side * (hw + off + rx));
        for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) {
          for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) {
            if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + (valueNoise(x, y, seed + 57, 3) - 0.5) * 0.5) tiles.push([x, y]);
          }
        }
        pool = { kind, x: cx, y: cy, rx: round2(rx), ry: round2(ry) };
      }
      if (!tiles.length || !fits(tiles)) continue;
      for (const [x, y] of tiles) terrain[idx(size, x, y)] = T.WATER;
      for (const [x, y] of tiles) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!inBounds(size, x + dx, y + dy)) continue;
          const i = idx(size, x + dx, y + dy);
          if (isDry(terrain[i])) terrain[i] = T.BANK;
        }
      }
      pools.push(pool);
      break;
    }
  }
  if (pools.length) params.pools = pools;
}

// Palm groves: 1-3 patches of meadow on the desert, 3-7 tiles from water, radius 2-3.5 with a wavering edge (meadow carries palms and
// acacias, src/render/renderer.js decorAt). Writes params.groves.
function addGroves(terrain, size, seed, params) {
  const G = MAP.shapes.groves;
  const rng = createRng((seed ^ MAP_SALT.groves) >>> 0);
  const wd = waterDistance(terrain, size, G.nearMax + 1);
  const groves = [];
  const n = G.min + rng.int(G.extra);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < G.tries; t++) {
      const x = rng.int(size), y = rng.int(size), i = idx(size, x, y);
      if (terrain[i] !== T.DESERT || wd[i] < G.nearMin || wd[i] > G.nearMax) continue;
      const r = round2(G.rMin + rng.range(0, G.rExtra));
      for (let y2 = Math.floor(y - r) - 1; y2 <= Math.ceil(y + r) + 1; y2++) {
        for (let x2 = Math.floor(x - r) - 1; x2 <= Math.ceil(x + r) + 1; x2++) {
          if (!inBounds(size, x2, y2) || terrain[idx(size, x2, y2)] !== T.DESERT) continue;
          if (Math.hypot(x2 - x, y2 - y) <= r + (valueNoise(x2, y2, seed + 59, 3) - 0.5) * 1.2) terrain[idx(size, x2, y2)] = T.MEADOW;
        }
      }
      groves.push({ x, y, r });
      break;
    }
  }
  if (groves.length) params.groves = groves;
}

// Dune fields and dry wadis: decor on buildable desert (the ground stays desert; src/render/terrainBaker.js draws them from the params).
// Dunes: 1-3 ellipses on far desert. Wadis: 0-2 dry riverbeds, each a walk of 12-30 desert tiles from far desert down the slope towards the
// water (some sideways wander), ending before the bank. Writes params.dunes and params.wadis.
function addDunesAndWadis(terrain, size, seed, focus, ex, params) {
  const D = MAP.shapes.dunes, W = MAP.shapes.wadis;
  const wd = waterDistance(terrain, size, size);
  const far = (x, y, d) => terrain[idx(size, x, y)] === T.DESERT && wd[idx(size, x, y)] >= d && Math.hypot(x - focus.x, y - focus.y) >= 10;
  const rng = createRng((seed ^ MAP_SALT.dunes) >>> 0);
  const dunes = [], n = D.min + rng.int(D.extra);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < D.tries; t++) {
      const x = rng.int(size), y = rng.int(size);
      if (!far(x, y, D.far)) continue;
      dunes.push({ x, y, rx: round2(D.rxMin + rng.range(0, D.rxExtra)), ry: round2(D.ryMin + rng.range(0, D.ryExtra)) });
      break;
    }
  }
  if (dunes.length) params.dunes = dunes;
  const wrng = createRng((seed ^ MAP_SALT.wadis) >>> 0);
  const wadis = [], m = wrng.int(W.max + 1);
  for (let k = 0; k < m; k++) {
    for (let t = 0; t < W.tries; t++) {
      let x = wrng.int(size), y = wrng.int(size);
      if (!far(x, y, W.far)) continue;
      const len = W.minLen + wrng.int(W.maxLen - W.minLen + 1), tiles = [idx(size, x, y)];
      for (let step = 0; step < len * 3 && tiles.length < len; step++) {
        const options = NEIGHBOURS4.map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => inBounds(size, nx, ny) && terrain[idx(size, nx, ny)] === T.DESERT && !tiles.includes(idx(size, nx, ny)));
        if (!options.length) break;
        options.sort((a, b) => wd[idx(size, a[0], a[1])] - wd[idx(size, b[0], b[1])]);
        const pick = wrng.chance(0.3) ? options[wrng.int(options.length)] : options[0];
        if (wd[idx(size, pick[0], pick[1])] <= 3) break;
        [x, y] = pick;
        tiles.push(idx(size, x, y));
      }
      if (tiles.length < W.minLen) continue;
      wadis.push({ tiles });
      break;
    }
  }
  if (wadis.length) params.wadis = wadis;
}

// The raiders' entries on the map's edges (two; three on a Large map). A variant names where each starts (an edge and a position along it); a spot
// that is water slides along the edge to the nearest land tile, so an entry is always land. Classic keeps the middle of the
// east edge and of the north edge.
function entriesFor(terrain, size, spec, scale = (n) => n) {
  const mid = Math.floor(size / 2);
  const wanted = spec.entries ? spec.entries(size).map((e) => ({ edge: e.edge, at: scale(e.at) })) : [{ edge: 'east', at: mid }, { edge: 'north', at: mid }];
  // Stage 4.6 (ruling 333): the entries scale with the area, two at least: a Large map (1.56 x the area) has a third, on the first one's edge,
  // 30% of the map's side along it, so a Large map has three entries on two edges (two on the first, one on the second).
  if (Math.round(2 * areaScale(size)) > 2) wanted.push({ edge: wanted[0].edge, at: wanted[0].at < mid ? wanted[0].at + Math.round(size * 0.3) : wanted[0].at - Math.round(size * 0.3) });
  return wanted.map(({ edge, at }) => {
    const tile = (k) => (edge === 'east' ? { x: size - 1, y: k } : edge === 'west' ? { x: 0, y: k } : { x: k, y: 0 });
    for (let d = 0; d < size; d++) {
      for (const k of d ? [at - d, at + d] : [at]) {
        if (k < 0 || k >= size) continue;
        const e = tile(k);
        if (terrain[idx(size, e.x, e.y)] !== T.WATER) return e;
      }
    }
    return tile(at);
  });
}
