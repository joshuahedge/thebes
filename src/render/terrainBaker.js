// Blended terrain (spec 5.2) baked into 16 x 16-tile chunk canvases. Gameplay keeps the grid; only the
// picture blends. A chunk is re-baked when its signature (what is under it) changes.
import { CHUNK } from './camera.js';
import { ART_SCALE, p, tileDiamond } from './iso.js';
import { hash2, valueNoise } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { idx, inBounds } from '../sim/grid.js';
import { BUILDINGS } from '../data/buildings.js';
import { makeDraw } from './art/ctx.js';
import { TERRAIN, LEAF2 } from './art/palette.js';
import { rock, scrub, dune, tufts, reeds } from './art/nature.js';
import { hasNewLand, GRASS } from '../data/s47.js';
import { moistureOf, moistureAt, decorDraw } from './grass.js';
import { defaultCreateCanvas, bucketFor } from './spriteCache.js';
import { drawRiver, riverIsle, riverPools } from './terrainWater.js';
import { drawRoads } from './terrainRoads.js';
import { drawBridges } from './terrainBridges.js';
import { drawWalls, wallCode } from './terrainWalls.js';

export { CHUNK };
export const CHUNK_MARGIN = 4;  // art px of canvas around the chunk diamond
export const CHUNK_MAX_SCALE = 3; // device px per art px; terrain is soft, so a little upscaling is fine
export const BLEND = 0.33;        // edges wander by about a third of a tile
export const BLOTCH_ALPHA = 0.22; // calm sand (early-game pass 2.1): faint blotches in shades close to the sand
export const FERTILE_SPECKS = 6;  // loam speckles per fertile tile; every third is a light crumb
export const FERTILE_TUFT_SHARE = 0.45; // share of fertile tiles that carry two small green tufts

const TYPE_INDEX = Object.keys(BUILDINGS);

export function chunkScaleFor(zoom, dpr) {
  const s = ART_SCALE * bucketFor(zoom) * dpr;
  if (s >= CHUNK_MAX_SCALE) return CHUNK_MAX_SCALE;
  if (s >= 2) return 2;
  if (s >= 1.5) return 1.5;
  return 1;
}

// FNV-style hash of terrain, road, occupancy, building type, house tier and wall (Stage 3: none, standing or a
// breach, so a chunk re-bakes when the sim bumps world.wallVersion for a tile under it) for the chunk plus a two-tile
// ring (bakeChunk draws two tiles deep): blending, road joins and wall links look across chunk edges, so a change next
// door must re-bake this chunk too.
export function chunkSignature(world, cx, cy) {
  let h = (2166136261 ^ (world.seed | 0)) >>> 0;
  const mix = (v) => { h = Math.imul(h ^ (v | 0), 16777619) >>> 0; };
  mix(world.size);
  for (let y = cy * CHUNK - 2; y <= cy * CHUNK + CHUNK + 1; y++) {
    for (let x = cx * CHUNK - 2; x <= cx * CHUNK + CHUNK + 1; x++) {
      if (!inBounds(world.size, x, y)) { mix(255); continue; }
      const i = idx(world.size, x, y);
      mix(world.terrain[i]);
      mix(world.road[i] ? 1 : 0);
      const b = world.occ[i] ? world.buildings[world.occ[i]] : null;
      mix(b ? TYPE_INDEX.indexOf(b.type) + 1 : 0);
      mix(b && b.type === 'house' ? b.tier + 1 : 0);
      mix(wallCode(world, x, y));
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

// The same with a test in place of a terrain code: the share of the four tiles meeting at corner (x, y) for which test(tx, ty) holds (off-map
// tiles count as matching). Used by the green band, whose tiles are the ones past a moisture level.
export function cornerShare(world, x, y, test) {
  let n = 0;
  for (const [tx, ty] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) if (!inBounds(world.size, tx, ty) || test(tx, ty)) n++;
  return n / 4;
}

// The tile's diamond as 8 art points (corners and edge midpoints), each pushed out from the tile centre
// where the terrain continues and pulled in where it stops, plus value noise. `expand` adds a uniform
// push (tiles) for the soft outer pass.
export function blobFor(world, x, y, code, salt, expand, test = null, wander = 1) {
  const cx = x + 0.5, cy = y + 0.5;
  const seed = world.seed + salt + code * 101;
  const push = (px, py, w, k) => {
    const n = valueNoise(px * 3.1 + k, py * 3.1, seed, 1.3) - 0.5;
    const amt = (w - 0.5) * BLEND * 1.5 * wander + n * BLEND * wander + expand;
    const f = 1 + 2 * amt;
    return p(cx + (px - cx) * f, cy + (py - cy) * f);
  };
  const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
  const weights = corners.map(([ax, ay]) => (test ? cornerShare(world, ax, ay, test) : cornerWeight(world, ax, ay, code)));
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

// One terrain layer in up to three passes: a soft, slightly larger pass in a paler tone; the main fill; and,
// when the style has a `second` tone, that tone offset by (3, 2) art px on about 60% of tiles for clumpy
// texture. All tiles of the layer go into one path per pass, so overlapping blobs union instead of stacking alpha.
// style.only (Stage 4.5), when given, is a predicate on the tile index that keeps a pass to those tiles (an island's land).
function drawLayer(g, world, range, code, style) {
  const passes = [
    { expand: 0.2, fill: style.soft, alpha: 0.5, dx: 0, dy: 0, salt: 1, pick: () => true },
    { expand: 0, fill: style.main, alpha: 1, dx: 0, dy: 0, salt: 1, pick: () => true },
  ];
  if (style.second) passes.push({ expand: -0.05, fill: style.second, alpha: 0.55, dx: 3, dy: 2, salt: 2, pick: (x, y) => hash2(x, y, world.seed + 9) < 0.6 });
  for (const pass of passes) {
    const ctx = g.ctx;
    ctx.beginPath();
    let any = false;
    forTiles(world, range, (x, y, i) => {
      if (world.terrain[i] !== code || !pass.pick(x, y) || (style.only && !style.only(i))) return;
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

// Fertile land's texture in place of an offset second tone (which drew stair-steps along the blend): dark
// loam speckles, a few light crumbs and, on some tiles, small green tufts. Positions hang off the tile, so
// neighbouring chunks draw the same ones at a border.
function fertileSpeckle(g, world, x, y) {
  for (let j = 0; j < FERTILE_SPECKS; j++) {
    const q = p(x + hash2(x, y, 110 + j), y + hash2(x, y, 120 + j));
    if (j % 3 === 2) g.circ(q, 0.6, TERRAIN.fertileSecond, { alpha: 0.7 });
    else g.circ(q, 0.5 + hash2(x, y, 130 + j) * 0.4, TERRAIN.fertileSpeck, { alpha: 0.55 });
  }
  if (hash2(x, y, world.seed + 140) >= FERTILE_TUFT_SHARE) return;
  for (let j = 0; j < 2; j++) {
    const q = p(x + 0.15 + hash2(x, y, 150 + j) * 0.7, y + 0.15 + hash2(x, y, 160 + j) * 0.7);
    g.line(q, [q[0] - 0.7, q[1] - 2.6], TERRAIN.fertileTuft, 0.7);
    g.line(q, [q[0] + 0.5, q[1] - 3], LEAF2, 0.6);
    g.line(q, [q[0] + 1.2, q[1] - 1.9], TERRAIN.fertileTuft, 0.6);
  }
}

// Clay's texture (Stage 4.5): a few dark crack strokes and light flecks on each tile, positions hung off the tile as fertileSpeckle's are.
function claySpeckle(g, x, y) {
  for (let j = 0; j < 2; j++) {
    const q = p(x + 0.2 + hash2(x, y, 210 + j) * 0.6, y + 0.2 + hash2(x, y, 220 + j) * 0.6);
    g.line(q, [q[0] + 2.4 + hash2(x, y, 230 + j) * 2, q[1] + 0.6], TERRAIN.clayCrack, 0.6, 0.55);
    g.line(q, [q[0] + 1, q[1] + 1.8], TERRAIN.clayCrack, 0.5, 0.4);
  }
  g.circ(p(x + hash2(x, y, 240), y + hash2(x, y, 241)), 0.6, TERRAIN.claySoft, { alpha: 0.8 });
  // Small dug hollows (Stage 4.6, ruling 331): a dark pit with a sunlit rim on about half the tiles, so clay reads as worked ground.
  if (hash2(x, y, 250) < 0.55) {
    const q = p(x + 0.25 + hash2(x, y, 251) * 0.5, y + 0.25 + hash2(x, y, 252) * 0.5);
    g.ell(q, 3.6, 1.6, TERRAIN.clayHollow, { alpha: 0.9 });
    g.ell([q[0] - 0.3, q[1] + 1.1], 3.2, 0.7, TERRAIN.clayLip, { alpha: 0.8 });
    g.ell([q[0] + 0.2, q[1] - 0.1], 2.1, 0.8, TERRAIN.clayCrack, { alpha: 0.55 });
  }
}

// The map's decor choices (Stage 4.6, ruling 332), from world.mapParams: dune fields (bit 1) and dry wadis (bit 2), one byte a tile, worked
// out once a world (the params never change).
const shapeLayers = new WeakMap();
export function shapeLayer(world) {
  let layer = shapeLayers.get(world);
  if (layer) return layer;
  const n = world.size, P = world.mapParams || {};
  layer = new Uint8Array(n * n);
  for (const d of P.dunes || []) {
    for (let y = Math.max(0, Math.floor(d.y - d.ry)); y <= Math.min(n - 1, Math.ceil(d.y + d.ry)); y++) {
      for (let x = Math.max(0, Math.floor(d.x - d.rx)); x <= Math.min(n - 1, Math.ceil(d.x + d.rx)); x++) {
        if (((x + 0.5 - d.x) / d.rx) ** 2 + ((y + 0.5 - d.y) / d.ry) ** 2 <= 1) layer[idx(n, x, y)] |= 1;
      }
    }
  }
  for (const w of P.wadis || []) for (const i of w.tiles) if (i >= 0 && i < layer.length) layer[i] |= 2;
  shapeLayers.set(world, layer);
  return layer;
}

// A dune field's crests and a wadi's gravel on one desert tile.
function shapeTile(g, world, x, y, bits) {
  const cq = p(x + 0.5, y + 0.5);
  if (bits & 2) {
    g.ell(cq, 15, 6, TERRAIN.wadi, { alpha: 0.6 });   // wide enough that neighbouring tiles' beds run together
    g.stroke([['M', [cq[0] - 6, cq[1] + 0.4]], ['Q', [cq[0], cq[1] - 1.6], [cq[0] + 6, cq[1] + 0.6]]], TERRAIN.wadiCrack, 0.7, 0.7);
    for (let j = 0; j < 3; j++) g.circ(p(x + 0.15 + hash2(x, y, 270 + j) * 0.7, y + 0.15 + hash2(x, y, 280 + j) * 0.7), 0.7, TERRAIN.wadiPebble, { alpha: 0.8 });
  }
  if ((bits & 1) && hash2(x, y, world.seed + 300) < 0.7) {
    dune(g, [cq[0] + (hash2(x, y, 310) - 0.5) * 6, cq[1] + (hash2(x, y, 311) - 0.5) * 3]);
    if (hash2(x, y, 312) < 0.4) dune(g, [cq[0] + 6, cq[1] - 3]);
  }
}

const nearType = (world, x, y, code) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => terrainAt(world, x + dx, y + dy, -1) === code);

// The green band (Stage 4.7, ruling 462): on a map with new land, dry ground (sand, loam, meadow) takes a green wash that deepens towards the water, from
// ONE moisture field (src/render/grass.js). Each tier of GRASS.tiers is one path of the tiles past its moisture level, drawn as the same wavering blobs
// as every layer, so the edge of each is soft and noisy; the tiers stack (pale sage far out, rich green by the water), so the band fades through scrub
// into sand with no hard line. Rock is left alone. The sim's fertile land does not move; this is only how the ground is drawn.
const BAND_GROUND = (t) => t === T.DESERT || t === T.FERTILE || t === T.MEADOW;
function drawGrassBand(g, world, range) {
  const field = moistureOf(world);
  if (!field) return;
  const n = world.size, tiles = [];
  forTiles(world, range, (x, y, i) => { if (field[i] >= GRASS.tiers[0] && BAND_GROUND(world.terrain[i])) tiles.push([x, y, field[i]]); });
  if (!tiles.length) return;
  const ctx = g.ctx;
  GRASS.tiers.forEach((from, k) => {
    const test = (tx, ty) => { const j = idx(n, tx, ty), t = world.terrain[j]; return t === T.ROCKY ? false : BAND_GROUND(t) ? field[j] >= from : true; };
    ctx.beginPath();
    let any = false;
    for (const [x, y, m] of tiles) {
      if (m < from) continue;
      const pts = blobFor(world, x, y, -1 - k, 5 + k, 0.04, test, GRASS.wander);
      ctx.moveTo(pts[0][0] * g.scale, pts[0][1] * g.scale);
      for (let q = 1; q < pts.length; q++) ctx.lineTo(pts[q][0] * g.scale, pts[q][1] * g.scale);
      ctx.closePath();
      any = true;
    }
    if (!any) return;
    ctx.globalAlpha = GRASS.alphas[k];
    ctx.fillStyle = GRASS.colours[k];
    ctx.fill('nonzero');
    ctx.globalAlpha = 1;
  });
}

// What grows in the band, on the ground (the trees are decorAt's): grass tufts, thick by the water and thinning out, a little scrub where the green gives out, and
// reeds on the banks. Positions hang off the tile, so chunks agree at a border.
function bandScatter(g, world, x, y, i, t) {
  const m = moistureAt(world, i);
  if (m <= 0) return;
  const u = decorDraw(world, x, y, 1);
  if (t === T.BANK) {
    if (m > 0.5 && decorDraw(world, x, y, 3) < 0.22) reeds(g, p(x + 0.25 + u * 0.5, y + 0.55));
    return;
  }
  if (t !== T.DESERT && t !== T.MEADOW) return;
  const tiers = GRASS.tiers;
  const n = m >= tiers[3] ? 4 : m >= tiers[2] ? 3 : m >= tiers[1] ? (u < 0.8 ? 2 : 1) : m >= tiers[0] ? (u < 0.55 ? 1 : 0) : 0;
  if (n && t === T.DESERT) tufts(g, x, y, n, 2);
  if (m < tiers[1] && m > 0.02 && decorDraw(world, x, y, 2) < 0.17) scrub(g, p(x + 0.25 + u * 0.5, y + 0.3 + decorDraw(world, x, y, 4) * 0.4));
}

// Sand everywhere, faint blotches and dots, then the blended layers, then the scatter that sells the blend:
// loam speckles on fertile land, tufts across meadow borders, pebbles across rocky borders, mud on the banks,
// rocks, scrub and dunes.
export function drawGround(g, world, range) {
  const a = p(range.x0, range.y0), b = p(range.x1 + 1, range.y0), c = p(range.x1 + 1, range.y1 + 1), d = p(range.x0, range.y1 + 1);
  g.poly([a, b, c, d], TERRAIN.sand);
  // Blotches are keyed off absolute 4 x 4-tile cells, so neighbouring chunks draw the same ones at a border.
  for (let gy = Math.floor(range.y0 / 4); gy <= Math.floor(range.y1 / 4); gy++) {
    for (let gx = Math.floor(range.x0 / 4); gx <= Math.floor(range.x1 / 4); gx++) {
      const q = p(gx * 4 + hash2(gx, gy, world.seed + 41) * 4, gy * 4 + hash2(gx, gy, world.seed + 42) * 4);
      const rx = 14 + hash2(gx, gy, world.seed + 43) * 30;
      g.ell(q, rx, rx * 0.45, TERRAIN.blotches[Math.abs(gx * 7 + gy * 13) % 5], { alpha: BLOTCH_ALPHA });
    }
  }
  forTiles(world, range, (x, y, i) => {
    if (world.terrain[i] === T.WATER) return;
    for (let j = 0; j < 4; j++) g.circ(p(x + hash2(x, y, 40 + j), y + hash2(x, y, 50 + j)), 0.7, j % 2 ? TERRAIN.dotLight : TERRAIN.dotDark, { alpha: 0.7 });
  });
  drawLayer(g, world, range, T.ROCKY, { soft: TERRAIN.rockySoft, main: TERRAIN.rocky, second: TERRAIN.rockySecond });
  drawLayer(g, world, range, T.HILLS, { soft: TERRAIN.rockySoft, main: TERRAIN.rockySecond, second: TERRAIN.rocky });   // Stage 4.7: the ground under the hill sprites (src/render/hills.js stands on it)
  drawLayer(g, world, range, T.FERTILE, { soft: TERRAIN.fertileSoft, main: TERRAIN.fertile, second: null });
  drawGrassBand(g, world, range);   // Stage 4.7: new land only
  drawLayer(g, world, range, T.MEADOW, { soft: TERRAIN.grassSoft, main: TERRAIN.grass, second: TERRAIN.grassSecond });
  drawLayer(g, world, range, T.BANK, { soft: TERRAIN.bankSecond, main: TERRAIN.bank, second: TERRAIN.bankSecond });
  drawLayer(g, world, range, T.CLAY, { soft: TERRAIN.claySoft, main: TERRAIN.clay, second: TERRAIN.claySecond });
  forTiles(world, range, (x, y, i) => scatterTile(g, world, x, y, i));
}

// The scatter on one tile that sells the blend (see drawGround); an island's tiles take it again after the river is drawn.
function scatterTile(g, world, x, y, i) {
  const t = world.terrain[i];
  if (t === T.WATER || !isFree(world, i)) return;
  const r = hash2(x, y, world.seed + 3);
  if (t === T.FERTILE) fertileSpeckle(g, world, x, y);
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
  if (t === T.CLAY) claySpeckle(g, x, y);
  if (hasNewLand(world)) bandScatter(g, world, x, y, i, t);
  if (t === T.DESERT) {
    const bits = shapeLayer(world)[i];
    if (bits) shapeTile(g, world, x, y, bits);
    const cq = p(x + 0.5, y + 0.5);
    if (r < 0.05) rock(g, cq);
    else if (r < 0.11) scrub(g, cq);
    else if (r > 0.9 && valueNoise(x, y, world.seed + 5, 7) > 0.55) dune(g, cq);
  }
}

// An island in the river (Stage 4.5): the land inside the river's rows, drawn over the water with the same blended layers
// and scatter as the shore, so it reads as ground with a bank round it.
function drawIsle(g, world, range) {
  const isle = riverIsle(world).filter(([x, y]) => x >= range.x0 - 1 && x <= range.x1 + 1 && y >= range.y0 - 1 && y <= range.y1 + 1);
  if (!isle.length) return;
  const mine = new Set(isle.map(([x, y]) => idx(world.size, x, y)));
  const only = (i) => mine.has(i);
  drawLayer(g, world, range, T.FERTILE, { soft: TERRAIN.fertileSoft, main: TERRAIN.fertile, second: null, only });
  drawLayer(g, world, range, T.BANK, { soft: TERRAIN.bankSecond, main: TERRAIN.bank, second: TERRAIN.bankSecond, only });
  drawLayer(g, world, range, T.CLAY, { soft: TERRAIN.claySoft, main: TERRAIN.clay, second: TERRAIN.claySecond, only });
  for (const [x, y] of isle) scatterTile(g, world, x, y, idx(world.size, x, y));
}

// Pools (an oasis's lake, Stage 4.5): each water tile that is not the river drawn as a wavering blob in the river's own layers, a
// bank halo, wet sand, shallows and water, with a deep patch where all four neighbours are water, ripples and a few reeds
// on the shore. Tile blobs overlap and union, so the lake reads as one pool with a soft edge.
function drawPools(g, world, range) {
  const pools = riverPools(world).filter(([x, y]) => x >= range.x0 - 1 && x <= range.x1 + 1 && y >= range.y0 - 1 && y <= range.y1 + 1);
  if (!pools.length) return;
  const water = (x, y) => terrainAt(world, x, y, T.WATER) === T.WATER;
  const inland = (x, y) => [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => water(x + dx, y + dy)));   // all eight neighbours are water
  const passes = [
    { expand: 0.42, fill: TERRAIN.bank, alpha: 0.85, pick: () => true },
    { expand: 0.28, fill: '#CDBE8E', alpha: 0.7, pick: () => true },
    { expand: 0.12, fill: TERRAIN.shallows, alpha: 1, pick: () => true },
    { expand: -0.1, fill: TERRAIN.water, alpha: 1, pick: () => true },
    { expand: -0.12, fill: TERRAIN.waterDeep, alpha: 0.7, pick: (x, y) => inland(x, y) },
  ];
  const ctx = g.ctx;
  for (const pass of passes) {
    ctx.beginPath();
    let any = false;
    for (const [x, y] of pools) {
      if (!pass.pick(x, y)) continue;
      const pts = blobFor(world, x, y, T.WATER, 3, pass.expand);
      ctx.moveTo(pts[0][0] * g.scale, pts[0][1] * g.scale);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0] * g.scale, pts[k][1] * g.scale);
      ctx.closePath();
      any = true;
    }
    if (!any) continue;
    ctx.globalAlpha = pass.alpha;
    ctx.fillStyle = pass.fill;
    ctx.fill('nonzero');
    ctx.globalAlpha = 1;
  }
  for (const [x, y] of pools) {
    for (let j = 0; j < 2; j++) {
      const q = p(x + 0.15 + hash2(x, y, 11 + j) * 0.7, y + 0.15 + hash2(x, y, 21 + j) * 0.7);
      g.stroke([['M', q], ['Q', [q[0] + 3, q[1] - 1.4], [q[0] + 6, q[1]]]], TERRAIN.ripple, 0.7, 0.65);
    }
    if (hash2(x, y, world.seed + 61) < 0.28 && !inland(x, y)) reeds(g, p(x + 0.5, y + 0.55));
  }
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
    g.radial(c, 15 * (b.w + b.d) / 2, 7.5 * (b.w + b.d) / 2, TERRAIN.plot, 0.6);
  });
}

// The faint tile grid 1c fades in while placing. Drawn per frame by the renderer, never baked.
export function drawTileGrid(g, range, alpha = 0.18) {
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) g.poly(tileDiamond(x, y), 'none', { stroke: TERRAIN.grid, strokeWidth: 0.5, strokeAlpha: alpha });
  }
}

// Draw everything under one chunk: the ground, the river, the plots and roads, then the walls (Stage 3), which stand
// on the ground and over the roads they cross as gates.
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
  drawGround(g, world, range);
  drawRiver(g, world, range);
  drawPools(g, world, range);
  drawIsle(g, world, range);
  drawPlots(g, world, range);
  drawRoads(g, world, range);
  drawBridges(g, world, range);
  drawWalls(g, world, range);
  // Cut the chunk to its diamond, dilated by about one device pixel so anti-aliased edges leave no hairline
  // gap; both chunks draw identical content in the overlap, so the overdraw is harmless. The cut is one mask
  // at the end rather than a clip on every layer: a clip blends each layer's partial edge coverage into the
  // layers beneath, so the edge pixels came out paler than the ground and drew a line along chunk borders on
  // dark loam (early-game pass 2.1).
  const e = 1.5 / scale;
  const mid = p(ox + CHUNK / 2, oy + CHUNK / 2);
  g.save();
  ctx.globalCompositeOperation = 'destination-in';
  g.poly([p(ox, oy), p(ox + CHUNK, oy), p(ox + CHUNK, oy + CHUNK), p(ox, oy + CHUNK)].map((v) => {
    const dx = v[0] - mid[0], dy = v[1] - mid[1], len = Math.hypot(dx, dy) || 1;
    return [v[0] + dx / len * e, v[1] + dy / len * e];
  }), '#000000');
  g.restore();
  return { canvas, ax, ay, scale, cx, cy };
}

export function createTerrainBaker({ createCanvas = defaultCreateCanvas, counter = null, maxChunks = 32 } = {}) {
  const perWorld = new WeakMap(); // world -> { map: Map(key -> { sig, sprite, used }) }
  let tick = 0;
  const entryFor = (world) => {
    let e = perWorld.get(world);
    if (!e) { e = { map: new Map() }; perWorld.set(world, e); }
    return e;
  };
  const key = (cx, cy, scale) => `${cx},${cy}@${scale}`;

  // The cached sprite for the chunk and whether it is still fresh (signature unchanged). Never bakes.
  function peek(world, cx, cy, zoom, dpr) {
    const scale = chunkScaleFor(zoom, dpr);
    const map = entryFor(world).map;
    const e = map.get(key(cx, cy, scale));
    if (e) {
      e.used = ++tick;
      return { sprite: e.sprite, fresh: e.sig === chunkSignature(world, cx, cy) };
    }
    // Nothing at this scale yet (a zoom-bucket change): the same chunk at another scale beats a hole.
    // drawSprite rescales by sprite.scale, so the renderer draws it correctly.
    for (const v of map.values()) {
      if (v.sprite.cx === cx && v.sprite.cy === cy) { v.used = ++tick; return { sprite: v.sprite, fresh: false }; }
    }
    return { sprite: null, fresh: false };
  }

  function get(world, cx, cy, zoom, dpr, allowBake = true) {
    const scale = chunkScaleFor(zoom, dpr);
    const w = entryFor(world);
    const k = key(cx, cy, scale);
    const sig = chunkSignature(world, cx, cy);
    let e = w.map.get(k);
    if (!e || e.sig !== sig) {
      if (!allowBake) return null;
      if (counter) counter.bakes = (counter.bakes || 0) + 1;
      e = { sig, sprite: bakeChunk(world, cx, cy, scale, createCanvas), used: ++tick };
      w.map.set(k, e);
      // Drop only this chunk's entries at other scales; the rest stay as fallbacks until their own re-bake.
      for (const [otherKey, v] of w.map) if (otherKey !== k && v.sprite.cx === cx && v.sprite.cy === cy) w.map.delete(otherKey);
      if (w.map.size > maxChunks) {
        let oldest = null;
        for (const [ok, v] of w.map) if (ok !== k && (oldest === null || v.used < w.map.get(oldest).used)) oldest = ok;
        if (oldest !== null) w.map.delete(oldest);
      }
    }
    e.used = ++tick;
    return e.sprite;
  }

  return { get, peek, size: (world) => entryFor(world).map.size, clear: (world) => perWorld.delete(world) };
}
