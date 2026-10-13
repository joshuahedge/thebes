import { createRng, valueNoise, hash2 } from './rng.js';
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { T } from './terrain.js';
import { MAP, MAP_VARIANTS } from '../data/map.js';

// Clay (Stage 4.5, ruling 312): the bank tiles are chained along the water, so a stretch is a walk of 4-10 of them from a
// seeded start, 8-neighbour steps in a fixed order; some stretches are two tiles deep, taking the dry land tile beside each
// bank tile (desert, meadow or fertile, never rock or a bank) as well. Stretches go on until the map holds its target
// (MAP.clay), counted in tiles turned to clay. free(i) says a tile may change: always on a new map, and, when an old
// map is migrated, only a tile with no building, road or wall on it. Returns the number of tiles turned. Deterministic
// in (terrain, size, seed); the draws have their own salt, so they never move the generator's.
export function addClay(terrain, size, seed, free = () => true, { salt = 0, target = null } = {}) {
  const C = MAP.clay;
  const rng = createRng(((seed ^ C.salt) + salt) >>> 0);
  const banks = [];
  for (let i = 0; i < terrain.length; i++) if (terrain[i] === T.BANK && free(i)) banks.push(i);
  if (!banks.length) return 0;
  const goal = target === null ? C.targetMin + rng.int(C.targetExtra + 1) : target;
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
export function generateMap(seed, size = MAP.size, variant = 'classic') {
  const v = MAP_VARIANTS.includes(variant) ? variant : 'classic';
  const spec = MAP.variants[v];
  const rng = createRng(seed);
  const terrain = new Array(size * size).fill(T.DESERT);
  const phase = rng.range(0, Math.PI * 2);
  const base = spec.riverBaseX === undefined ? MAP.riverBaseX : spec.riverBaseX;
  const wave1 = spec.wave1 || MAP.riverWave1, wave2 = spec.wave2 || MAP.riverWave2;
  const rawX = (y) => base + wave1.amp * Math.sin(y / wave1.period + phase) + wave2.amp * Math.sin(y / wave2.period + phase * 2);
  const riverX = spec.mirror ? (y) => size - 1 - rawX(y) : rawX;
  const hw = MAP.waterHalfWidth;

  // An island splits the river: the water spreads to a fixed span round the island over its rows, easing in and out (f).
  let isl = null;
  if (spec.island) {
    const I = spec.island;
    const yc = I.minY + rng.int(I.spanY);
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
    const lake = { x: L.minX + rng.int(L.spanX), y: L.minY + rng.int(L.spanY), r: L.rMin + rng.range(0, L.rExtra) };
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
  if (spec.clearStart) for (let y = size - MAP.clearStartRows; y < size; y++) nearEdge = spec.mirror ? Math.min(nearEdge, riverX(y)) : Math.max(nearEdge, riverX(y));
  const ex = Math.round(nearEdge) + (spec.mirror ? -MAP.tradeRoadOffsetX : MAP.tradeRoadOffsetX);
  const focus = { x: ex + (spec.mirror ? -MAP.focusOffset.x : MAP.focusOffset.x), y: size + MAP.focusOffset.y };

  const rp = MAP.rockPatches;
  if (v === 'classic') {
    const patches = rp.min + rng.int(rp.extra);
    for (let p = 0; p < patches; p++) {
      const px = rp.minX + rng.int(size - rp.marginX), py = rp.minY + rng.int(size - rp.marginY), r = rp.radiusMin + rng.int(rp.radiusExtra);
      for (let y = py - r - 1; y <= py + r + 1; y++) {
        for (let x = px - r - 1; x <= px + r + 1; x++) {
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          if ((x - px) ** 2 + (y - py) ** 2 <= r * r + valueNoise(x, y, seed + 31, rp.edgeNoiseScale) * rp.edgeNoise) terrain[idx(size, x, y)] = T.ROCKY;
        }
      }
    }
  } else {
    addRocks(terrain, size, seed, rng, spec.rocks, focus);
  }

  addClay(terrain, size, seed);

  const tradeEntry = { x: ex, y: size - 1 };
  const startRoad = [];
  for (let y = size - 1; y >= size - MAP.startRoadLength; y--) {
    startRoad.push([ex, y]);
    const i = idx(size, ex, y);
    if (terrain[i] === T.WATER || terrain[i] === T.ROCKY) terrain[i] = T.DESERT;
  }
  const raiderEntries = entriesFor(terrain, size, spec);
  return { size, terrain, tradeEntry, startRoad, focus, raiderEntries, variant: v };
}

// Rock for a variant: round patches (radius 3, a wavering edge) in the x ranges the variant names, taking the ranges in turn, until
// the map holds MAP.rockTarget rocky tiles (so 90-130, a patch adding at most 41) and every range has had a patch. A patch whose centre lies within MAP.rockAwayTiles
// of water, or near the start area (the focus), is skipped, so the rock is always off the river and out of the way of the first
// homes; the tries are capped.
function addRocks(terrain, size, seed, rng, rocks, focus) {
  const rp = MAP.rockPatches;
  const waterNear = (px, py, r) => {
    for (let y = Math.max(0, py - r); y <= Math.min(size - 1, py + r); y++) {
      for (let x = Math.max(0, px - r); x <= Math.min(size - 1, px + r); x++) if (terrain[idx(size, x, y)] === T.WATER) return true;
    }
    return false;
  };
  let count = 0, placed = 0;
  for (let tries = 0; tries < MAP.rockTries && (count < MAP.rockTarget || placed < rocks.ranges.length); tries++) {
    const [x0, x1] = rocks.ranges[placed % rocks.ranges.length];
    const px = x0 + rng.int(x1 - x0 + 1), py = rp.minY + rng.int(size - rp.marginY), r = rp.radiusMin;
    if (Math.hypot(px - focus.x, py - focus.y) < MAP.rockAwayStart || waterNear(px, py, MAP.rockAwayTiles)) continue;
    placed++;
    for (let y = py - r - 1; y <= py + r + 1; y++) {
      for (let x = px - r - 1; x <= px + r + 1; x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const i = idx(size, x, y);
        if (terrain[i] === T.WATER || terrain[i] === T.ROCKY) continue;
        if ((x - px) ** 2 + (y - py) ** 2 <= r * r + valueNoise(x, y, seed + 31, rp.edgeNoiseScale) * rp.edgeNoise) { terrain[i] = T.ROCKY; count++; }
      }
    }
  }
}

// The raiders' two entries on the map's edges. A variant names where each starts (an edge and a position along it); a spot
// that is water slides along the edge to the nearest land tile, so an entry is always land. Classic keeps the middle of the
// east edge and of the north edge.
function entriesFor(terrain, size, spec) {
  const mid = Math.floor(size / 2);
  const wanted = spec.entries ? spec.entries(size) : [{ edge: 'east', at: mid }, { edge: 'north', at: mid }];
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
