// Blended terrain (spec 5.2) baked into 16 x 16-tile chunk canvases. Gameplay keeps the grid; only the
// picture blends. A chunk is re-baked when its signature (what is under it) changes.
import { CHUNK } from './camera.js';
import { ART_SCALE, p, tileDiamond } from './iso.js';
import { hash2, valueNoise } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { idx, inBounds } from '../sim/grid.js';
import { BUILDINGS } from '../data/buildings.js';
import { makeDraw } from './art/ctx.js';
import { TERRAIN } from './art/palette.js';
import { rock, scrub, dune, tufts } from './art/nature.js';
import { defaultCreateCanvas, bucketFor } from './spriteCache.js';

export { CHUNK };
export const CHUNK_MARGIN = 24;   // art px of canvas around the chunk diamond
export const CHUNK_MAX_SCALE = 3; // device px per art px; terrain is soft, so a little upscaling is fine
export const BLEND = 0.33;        // edges wander by about a third of a tile

const TYPE_INDEX = Object.keys(BUILDINGS);

export function chunkScaleFor(zoom, dpr) {
  const s = ART_SCALE * bucketFor(zoom) * dpr;
  if (s >= CHUNK_MAX_SCALE) return CHUNK_MAX_SCALE;
  if (s >= 2) return 2;
  if (s >= 1.5) return 1.5;
  return 1;
}

// FNV-style hash of terrain, road, occupancy, building type and house tier for the chunk plus a one-tile
// ring: blending and road joins look across chunk edges, so a change next door must re-bake this chunk too.
export function chunkSignature(world, cx, cy) {
  let h = (2166136261 ^ (world.seed | 0)) >>> 0;
  const mix = (v) => { h = Math.imul(h ^ (v | 0), 16777619) >>> 0; };
  mix(world.size);
  for (let y = cy * CHUNK - 1; y <= cy * CHUNK + CHUNK; y++) {
    for (let x = cx * CHUNK - 1; x <= cx * CHUNK + CHUNK; x++) {
      if (!inBounds(world.size, x, y)) { mix(255); continue; }
      const i = idx(world.size, x, y);
      mix(world.terrain[i]);
      mix(world.road[i] ? 1 : 0);
      const b = world.occ[i] ? world.buildings[world.occ[i]] : null;
      mix(b ? TYPE_INDEX.indexOf(b.type) + 1 : 0);
      mix(b && b.type === 'house' ? b.tier + 1 : 0);
    }
  }
  return h;
}

const terrainAt = (world, x, y, fallback) => (inBounds(world.size, x, y) ? world.terrain[idx(world.size, x, y)] : fallback);

// Share of the four tiles meeting at corner (x, y) that have terrain `code`. Off-map tiles count as
// matching so the map edge never pulls a layer inward.
export function cornerWeight(world, x, y, code) {
  let n = 0;
  for (const [tx, ty] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) if (terrainAt(world, tx, ty, code) === code) n++;
  return n / 4;
}

// The tile's diamond as 8 art points (corners and edge midpoints), each pushed out from the tile centre
// where the terrain continues and pulled in where it stops, plus value noise. `expand` adds a uniform
// push (tiles) for the soft outer pass.
export function blobFor(world, x, y, code, salt, expand) {
  const cx = x + 0.5, cy = y + 0.5;
  const seed = world.seed + salt + code * 101;
  const push = (px, py, w, k) => {
    const n = valueNoise(px * 3.1 + k, py * 3.1, seed, 1.3) - 0.5;
    const amt = (w - 0.5) * BLEND * 1.5 + n * BLEND + expand;
    const f = 1 + 2 * amt;
    return p(cx + (px - cx) * f, cy + (py - cy) * f);
  };
  const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
  const weights = corners.map(([ax, ay]) => cornerWeight(world, ax, ay, code));
  const out = [];
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = corners[k], [bx, by] = corners[(k + 1) % 4];
    out.push(push(ax, ay, weights[k], 0));
    out.push(push((ax + bx) / 2, (ay + by) / 2, (weights[k] + weights[(k + 1) % 4]) / 2, 7));
  }
  return out;
}

const forTiles = (world, range, fn) => {
  for (let y = range.y0; y <= range.y1; y++) for (let x = range.x0; x <= range.x1; x++) if (inBounds(world.size, x, y)) fn(x, y, idx(world.size, x, y));
};

// One terrain layer in three passes: a soft, slightly larger pass in a paler tone; the main fill; and a
// second tone offset by (3, 2) art px on about 60% of tiles for texture. All tiles of the layer go into
// one path per pass, so overlapping blobs union instead of stacking alpha.
function drawLayer(g, world, range, code, style) {
  const passes = [
    { expand: 0.2, fill: style.soft, alpha: 0.5, dx: 0, dy: 0, salt: 1, pick: () => true },
    { expand: 0, fill: style.main, alpha: 1, dx: 0, dy: 0, salt: 1, pick: () => true },
    { expand: -0.05, fill: style.second, alpha: 0.55, dx: 3, dy: 2, salt: 2, pick: (x, y) => hash2(x, y, world.seed + 9) < 0.6 },
  ];
  for (const pass of passes) {
    const ctx = g.ctx;
    ctx.beginPath();
    let any = false;
    forTiles(world, range, (x, y, i) => {
      if (world.terrain[i] !== code || !pass.pick(x, y)) return;
      const pts = blobFor(world, x, y, code, pass.salt, pass.expand);
      ctx.moveTo((pts[0][0] + pass.dx) * g.scale, (pts[0][1] + pass.dy) * g.scale);
      for (let k = 1; k < pts.length; k++) ctx.lineTo((pts[k][0] + pass.dx) * g.scale, (pts[k][1] + pass.dy) * g.scale);
      ctx.closePath();
      any = true;
    });
    if (!any) continue;
    ctx.globalAlpha = pass.alpha;
    ctx.fillStyle = pass.fill;
    ctx.fill('nonzero');
    ctx.globalAlpha = 1;
  }
}

const isFree = (world, i) => !world.occ[i] && !world.road[i];
const nearType = (world, x, y, code) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => terrainAt(world, x + dx, y + dy, -1) === code);

// Sand everywhere, pale blotches and dots, then the blended layers, then the scatter that sells the blend:
// tufts across meadow borders, pebbles across rocky borders, mud on the banks, rocks, scrub and dunes.
export function drawGround(g, world, range) {
  const a = p(range.x0, range.y0), b = p(range.x1 + 1, range.y0), c = p(range.x1 + 1, range.y1 + 1), d = p(range.x0, range.y1 + 1);
  g.poly([a, b, c, d], TERRAIN.sand);
  const left = d[0], right = b[0], top = a[1], bottom = c[1];
  for (let i = 0; i < 24; i++) {
    const q = [left + hash2(i, 1, world.seed) * (right - left), top + hash2(i, 2, world.seed) * (bottom - top)];
    const rx = 14 + hash2(i, 3, world.seed) * 30;
    g.ell(q, rx, rx * 0.45, TERRAIN.blotches[i % 5], { alpha: 0.5 });
  }
  forTiles(world, range, (x, y, i) => {
    if (world.terrain[i] === T.WATER) return;
    for (let j = 0; j < 4; j++) g.circ(p(x + hash2(x, y, 40 + j), y + hash2(x, y, 50 + j)), 0.7, j % 2 ? TERRAIN.dotLight : TERRAIN.dotDark, { alpha: 0.7 });
  });
  drawLayer(g, world, range, T.ROCKY, { soft: TERRAIN.rockySoft, main: TERRAIN.rocky, second: TERRAIN.rockySecond });
  drawLayer(g, world, range, T.FERTILE, { soft: TERRAIN.fertileSoft, main: TERRAIN.fertile, second: TERRAIN.fertileSecond });
  drawLayer(g, world, range, T.MEADOW, { soft: TERRAIN.grassSoft, main: TERRAIN.grass, second: TERRAIN.grassSecond });
  drawLayer(g, world, range, T.BANK, { soft: TERRAIN.bankSecond, main: TERRAIN.bank, second: TERRAIN.bankSecond });
  forTiles(world, range, (x, y, i) => {
    const t = world.terrain[i];
    if (t === T.WATER || !isFree(world, i)) return;
    const r = hash2(x, y, world.seed + 3);
    if (t === T.MEADOW) tufts(g, x, y, 9, 0);
    else if (t !== T.BANK && nearType(world, x, y, T.MEADOW)) tufts(g, x, y, 3, 5);
    if (t === T.ROCKY || nearType(world, x, y, T.ROCKY)) {
      const n = t === T.ROCKY ? 3 : 1;
      for (let j = 0; j < n; j++) g.circ(p(x + hash2(x, y, 80 + j), y + hash2(x, y, 90 + j)), 0.9, j % 2 ? TERRAIN.pebbleLight : TERRAIN.pebble, { alpha: 0.8 });
    }
    if (t === T.BANK) {
      const q = p(x + 0.3 + r * 0.4, y + 0.3 + hash2(x, y, 4) * 0.4);
      g.ell(q, 5 + r * 5, 1.6, TERRAIN.mud, { alpha: 0.7 });
      g.ell([q[0] - 1, q[1] - 0.4], 3.5 + r * 3, 1.1, TERRAIN.mudDark, { alpha: 0.6 });
    }
    if (t === T.DESERT) {
      const cq = p(x + 0.5, y + 0.5);
      if (r < 0.05) rock(g, cq);
      else if (r < 0.11) scrub(g, cq);
      else if (r > 0.9 && valueNoise(x, y, world.seed + 5, 7) > 0.55) dune(g, cq);
    }
  });
}

// A soft pad under every building footprint touching the range, so plots and buildings fade into the ground.
export function drawPlots(g, world, range) {
  const seen = new Set();
  forTiles(world, range, (x, y, i) => {
    const id = world.occ[i];
    if (!id || seen.has(id)) return;
    seen.add(id);
    const b = world.buildings[id];
    if (!b) return;
    const c = p(b.x + b.w / 2, b.y + b.d / 2);
    g.radial(c, 15 * (b.w + b.d) / 2, 7.5 * (b.w + b.d) / 2, TERRAIN.plot, 0.9);
  });
}

// The faint tile grid 1c fades in while placing. Drawn per frame by the renderer, never baked.
export function drawTileGrid(g, range, alpha = 0.18) {
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) g.poly(tileDiamond(x, y), 'none', { stroke: TERRAIN.grid, strokeWidth: 0.5, strokeAlpha: alpha });
  }
}

// Draw everything under one chunk. Task 11 adds the river and roads between the ground and the plots.
export function bakeChunk(world, cx, cy, scale, createCanvas = defaultCreateCanvas) {
  const ox = cx * CHUNK, oy = cy * CHUNK;
  const left = -16 * CHUNK - CHUNK_MARGIN, right = 16 * CHUNK + CHUNK_MARGIN, top = -CHUNK_MARGIN, bottom = 16 * CHUNK + CHUNK_MARGIN;
  const canvas = createCanvas(Math.ceil((right - left) * scale), Math.ceil((bottom - top) * scale));
  const ctx = canvas.getContext('2d');
  const ax = -left * scale, ay = -top * scale;
  const o = p(ox, oy);
  ctx.translate(ax - o[0] * scale, ay - o[1] * scale); // art coordinates below are world tiles
  const g = makeDraw(ctx, scale);
  const range = { x0: ox - 2, y0: oy - 2, x1: ox + CHUNK + 1, y1: oy + CHUNK + 1 };
  g.save();
  g.clip([p(ox, oy), p(ox + CHUNK, oy), p(ox + CHUNK, oy + CHUNK), p(ox, oy + CHUNK)]);
  drawGround(g, world, range);
  drawPlots(g, world, range);
  g.restore();
  return { canvas, ax, ay, scale, cx, cy };
}

export function createTerrainBaker({ createCanvas = defaultCreateCanvas, counter = null, maxChunks = 48 } = {}) {
  const perWorld = new WeakMap(); // world -> Map(key -> { sig, sprite, used })
  let tick = 0;
  const mapFor = (world) => {
    let m = perWorld.get(world);
    if (!m) { m = new Map(); perWorld.set(world, m); }
    return m;
  };
  return {
    get(world, cx, cy, zoom, dpr, allowBake = true) {
      const scale = chunkScaleFor(zoom, dpr);
      const m = mapFor(world);
      const key = `${cx},${cy}@${scale}`;
      const sig = chunkSignature(world, cx, cy);
      let e = m.get(key);
      if (!e || e.sig !== sig) {
        if (!allowBake) return null;
        if (counter) counter.bakes = (counter.bakes || 0) + 1;
        e = { sig, sprite: bakeChunk(world, cx, cy, scale, createCanvas), used: 0 };
        m.set(key, e);
        if (m.size > maxChunks) {
          let oldest = null;
          for (const [k, v] of m) if (!oldest || v.used < m.get(oldest).used) oldest = k;
          m.delete(oldest);
        }
      }
      e.used = ++tick;
      return e.sprite;
    },
    size(world) { return mapFor(world).size; },
    clear(world) { perWorld.delete(world); },
  };
}
