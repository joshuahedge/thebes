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
import { rock, scrub, dryShrub, dune, tufts, reeds } from './art/nature.js';
import { hasNewLand, GRASS } from '../data/s47.js';
import { moistureOf, moistureAt, decorDraw } from './grass.js';
import { defaultCreateCanvas, bucketFor } from './spriteCache.js';
import { drawBeltGround, beltScatter, screeScatter } from './rockBelts.js';
import { drawRiver, riverIsle, riverPools } from './terrainWater.js';
import { drawRoads, drawStreetFurniture } from './terrainRoads.js';
import { drawYards, hasYard } from './yards.js';
import { dotsFill, linesStroke, ellipsesFill } from './batch.js';
import { lookOfRank } from './looks.js';
import { lookReader } from './groundLooks.js';
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
  const top = lookOfRank(world.milestone), looks = top > 0 ? lookReader(world) : null;   // Village all over: no look to read
  for (let y = cy * CHUNK - 2; y <= cy * CHUNK + CHUNK + 1; y++) {
    for (let x = cx * CHUNK - 2; x <= cx * CHUNK + CHUNK + 1; x++) {
      if (!inBounds(world.size, x, y)) { mix(255); continue; }
      const i = idx(world.size, x, y);
      mix(world.terrain[i]);
      mix(world.road[i] ? 1 : 0);
      const b = world.occ[i] ? world.buildings[world.occ[i]] : null;
      mix(b ? TYPE_INDEX.indexOf(b.type) + 1 : 0);
      mix(b && b.type === 'house' ? b.tier + 1 : 0);
      // Version 9.3 (Track G, ruling 1914): what the yards and streets draw from. A building's tile: which of its four sides are the footprint's edge (the yard follows the
      // footprint) and its look (the yard's materials). A road tile: its look (lookAt: it changes when the day crosses the tile's front).
      if (b) {
        mix(((x - 1 < b.x) | 0) | ((x + 1 >= b.x + b.w) << 1) | ((y - 1 < b.y) << 2) | ((y + 1 >= b.y + b.d) << 3));
        if (looks && hasYard(b)) mix(looks.building(b));
      } else if (looks && world.road[i]) mix(looks.tile(x, y));
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
// Version 9.3 (Track G, ruling 1910): sixteen points a diamond (a corner, a quarter, the middle and a quarter on each side) instead of eight, and a second,
// finer octave of the same seeded noise, so an edge between grounds is a soft uneven curve that never runs along the tile diagonal for more than a
// fraction of a tile. The noise hangs off the point's own position (a shared edge's points are the same in both tiles), so chunks agree at a border.
export const EDGE_DETAIL = 1.7;   // the fine octave's share of BLEND
const EDGE_STEPS = [[0, 0], [0.25, 3], [0.5, 7], [0.75, 3]];
const INNER_STEPS = [[0, 0], [0.5, 7]];   // a tile with the ground all round it is covered by its neighbours: the eight points of old are enough   // [how far along the side, the noise's shift]; the shift hangs off the position so both tiles agree
export function blobFor(world, x, y, code, salt, expand, test = null, wander = 1) {
  const cx = x + 0.5, cy = y + 0.5;
  const seed = world.seed + salt + code * 101;
  const push = (px, py, w, k) => {
    const n = valueNoise(px * 3.1 + k, py * 3.1, seed, 1.3) - 0.5;
    const fine = w < 1 ? hash2(Math.round(px * 4), Math.round(py * 4), seed + 31) - 0.5 : 0;   // deep inside a ground the blob is covered by its neighbours: no need for the fine octave; the points lie on a quarter-tile grid, so one hash each is the noise
    const amt = (w - 0.5) * BLEND * 1.5 * wander + n * BLEND * wander + fine * BLEND * EDGE_DETAIL * wander + expand;
    const f = 1 + 2 * amt;
    return p(cx + (px - cx) * f, cy + (py - cy) * f);
  };
  const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
  const weights = corners.map(([ax, ay]) => (test ? cornerShare(world, ax, ay, test) : cornerWeight(world, ax, ay, code)));
  const out = [], steps = weights[0] === 1 && weights[1] === 1 && weights[2] === 1 && weights[3] === 1 ? INNER_STEPS : EDGE_STEPS;
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = corners[k], [bx, by] = corners[(k + 1) % 4];
    const wa = weights[k], wb = weights[(k + 1) % 4];
    for (const [u, shift] of steps) out.push(push(ax + (bx - ax) * u, ay + (by - ay) * u, wa + (wb - wa) * u, shift));
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
    if (j % 3 === 2) FR.fCrumb.push(q); else FR.fSpeck.push(q);   // 9.3 (Track G): collected, and drawn in batches with the edge details (flushFringe)
  }
  if (hash2(x, y, world.seed + 140) >= FERTILE_TUFT_SHARE) return;
  for (let j = 0; j < 2; j++) {
    const q = p(x + 0.15 + hash2(x, y, 150 + j) * 0.7, y + 0.15 + hash2(x, y, 160 + j) * 0.7);
    FR.fTuft.push([q, [q[0] - 0.7, q[1] - 2.6]], [q, [q[0] + 1.2, q[1] - 1.9]]);
    FR.fLeaf.push([q, [q[0] + 0.5, q[1] - 3]]);
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
  // Task 3b: the river's fringe is the greenest land: over fertile loam the tiers above are a thin wash, so the loam by the water takes two near-opaque
  // passes of meadow green (the loam's speckle and tufts are drawn over it, so farmland still reads; the Ground overlay is the exact cue for where farms fit).
  [[GRASS.tiers[3], TERRAIN.grassSoft, 0.75], [GRASS.tiers[4], TERRAIN.grass, 0.6]].forEach(([from, colour, alpha], k) => {
    const test = (tx, ty) => { const j = idx(n, tx, ty), t = world.terrain[j]; return t === T.FERTILE ? field[j] >= from : t === T.ROCKY ? false : !BAND_GROUND(t); };
    ctx.beginPath();
    let any = false;
    for (const [x, y, m] of tiles) {
      if (m < from || world.terrain[idx(n, x, y)] !== T.FERTILE) continue;
      const pts = blobFor(world, x, y, -20 - k, 25 + k, 0.04, test, GRASS.wander);
      ctx.moveTo(pts[0][0] * g.scale, pts[0][1] * g.scale);
      for (let q = 1; q < pts.length; q++) ctx.lineTo(pts[q][0] * g.scale, pts[q][1] * g.scale);
      ctx.closePath();
      any = true;
    }
    if (!any) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
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
  if (m < tiers[1] && m >= tiers[0] && decorDraw(world, x, y, 2) < 0.17) scrub(g, p(x + 0.25 + u * 0.5, y + 0.3 + decorDraw(world, x, y, 4) * 0.4));   // vivid scrub only where the green reaches
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
  if (hasNewLand(world)) drawBeltGround(g, world, range, { blobFor, forTiles });   // Stage 4.7 (Task 3b): rock belts, a distinct landmark (src/render/rockBelts.js); the ground under the hill sprites too
  else {
    drawLayer(g, world, range, T.ROCKY, { soft: TERRAIN.rockySoft, main: TERRAIN.rocky, second: TERRAIN.rockySecond });
    drawLayer(g, world, range, T.HILLS, { soft: TERRAIN.rockySoft, main: TERRAIN.rockySecond, second: TERRAIN.rocky });   // Stage 4.7: the ground under the hill sprites (src/render/hills.js stands on it)
  }
  drawLayer(g, world, range, T.FERTILE, { soft: TERRAIN.fertileSoft, main: TERRAIN.fertile, second: null });
  drawGrassBand(g, world, range);   // Stage 4.7: new land only
  drawLayer(g, world, range, T.MEADOW, { soft: TERRAIN.grassSoft, main: TERRAIN.grass, second: TERRAIN.grassSecond });
  drawLayer(g, world, range, T.BANK, { soft: TERRAIN.bankSecond, main: TERRAIN.bank, second: TERRAIN.bankSecond });
  drawLayer(g, world, range, T.CLAY, { soft: TERRAIN.claySoft, main: TERRAIN.clay, second: TERRAIN.claySecond });
  forTiles(world, range, (x, y, i) => scatterTile(g, world, x, y, i));
  flushFringe(g);
}

// Which shrub a desert tile of draw r (the scatter's hash) carries: 'scrub' (vivid green), 'dry' (the drab olive-grey bush) or null. Task 3b: on a new map vivid scrub only
// grows where there is moisture (the band's reach, GRASS.tiers[0]); out in the open desert a tile carries a dry shrub, and a sparser one (r < 0.08 of 0.05-0.11).
export function shrubKind(world, i, r) {
  if (r < 0.05 || r >= 0.11) return null;
  if (!hasNewLand(world) || moistureAt(world, i) >= GRASS.tiers[0]) return 'scrub';
  return r < 0.08 ? 'dry' : null;
}

// Version 9.3 (Track G, ruling 1911): the transition details of an edge between grounds. Along each side of a tile whose neighbour is another ground, a few small marks
// lie within a third of a tile of the side, on this tile's own ground: grass tufts at a meadow's edge (both sides of it), wet-sand flecks and a reed by the water, loam
// crumbs where the floodplain meets sand, a pebble or two at rock. Positions hang off the tile and the side, so a map always draws the same and chunks agree at a border.
const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // north (y), east (x + 1), south (y + 1), west (x)
const sidePoint = (x, y, side, u, d) => {          // a point on this tile at u along the side and d tiles in from it
  if (side === 0) return [x + u, y + d];
  if (side === 1) return [x + 1 - d, y + u];
  if (side === 2) return [x + u, y + 1 - d];
  return [x + d, y + u];
};
// The marks are collected as the tiles are walked and drawn at the end of drawGround and drawIsle in a handful of batched fills (see batch.js).
const FR = { fCrumb: [], fSpeck: [], fTuft: [], fLeaf: [], dk: [], lt: [], md: [], soft: [], sec: [], sand: [], mud: [], mudDot: [], crumb: [], pebD: [], pebL: [] };
function grassTuft(q, s) {
  FR.dk.push([q, [q[0] - 0.7, q[1] - 2.2 * s]]);
  FR.lt.push([q, [q[0] + 0.5, q[1] - 2.6 * s]]);
  FR.md.push([q, [q[0] + 1.2, q[1] - 1.7 * s]]);
}
function flushFringe(g) {
  dotsFill(g, FR.fSpeck, 0.7, TERRAIN.fertileSpeck, 0.55); dotsFill(g, FR.fCrumb, 0.6, TERRAIN.fertileSecond, 0.7);
  linesStroke(g, FR.fTuft, TERRAIN.fertileTuft, 0.65, 1); linesStroke(g, FR.fLeaf, LEAF2, 0.6, 1);
  linesStroke(g, FR.dk, '#4F7A2C', 0.6, 1); linesStroke(g, FR.lt, '#A6CC5E', 0.55, 1); linesStroke(g, FR.md, '#6E9E3A', 0.55, 1);
  dotsFill(g, FR.soft, 0.6, TERRAIN.grassSoft, 0.8); dotsFill(g, FR.sec, 0.5, TERRAIN.grassSecond, 0.6); dotsFill(g, FR.sand, 0.5, TERRAIN.dotLight, 0.8);
  ellipsesFill(g, FR.mud, TERRAIN.mud, 0.28); dotsFill(g, FR.mudDot, 0.5, TERRAIN.mudDark, 0.4);
  dotsFill(g, FR.crumb, 0.6, TERRAIN.fertileSecond, 0.7); dotsFill(g, FR.pebD, 0.8, TERRAIN.pebble, 0.8); dotsFill(g, FR.pebL, 0.6, TERRAIN.pebbleLight, 0.9);
  for (const k of Object.keys(FR)) FR[k].length = 0;
}
function edgeFringe(world, x, y, t) {
  for (let side = 0; side < 4; side++) {
    const n = terrainAt(world, x + SIDES[side][0], y + SIDES[side][1], t);
    if (n === t) continue;
    const at = (j, depth = 0.3) => p(...sidePoint(x, y, side, 0.1 + hash2(x, y, 700 + side * 10 + j) * 0.8, 0.04 + hash2(x, y, 740 + side * 10 + j) * depth));
    if (n === T.MEADOW && t !== T.BANK && t !== T.WATER) {                           // the grass reaches out: tufts and green flecks in the sand
      for (let j = 0; j < 2; j++) grassTuft(at(j), 0.8 + hash2(x, y, 780 + side * 4 + j) * 0.5);
      FR.soft.push(at(2, 0.22)); FR.sec.push(at(3, 0.22));
    } else if (t === T.MEADOW) {                                                     // the grass gives out: a few tufts at the rim and sand specks in it
      grassTuft(at(0, 0.22), 0.9);
      FR.sand.push(at(1, 0.22));
    } else if ((n === T.BANK || n === T.WATER) && t !== T.WATER) {                   // wet sand: dark damp flecks along the shore
      FR.mud.push([at(0, 0.18), 2.4, 0.8]);
      FR.mudDot.push(at(1, 0.2));
    } else if (n === T.FERTILE && t === T.DESERT) {                                  // loam crumbs thrown out into the sand
      for (let j = 0; j < 3; j++) FR.crumb.push(at(j, 0.28));
    } else if ((n === T.ROCKY || n === T.HILLS) && t === T.DESERT) {                // a pebble or two, light and dark
      FR.pebD.push(at(0)); FR.pebL.push(at(1));
    }
  }
}

// The scatter on one tile that sells the blend (see drawGround); an island's tiles take it again after the river is drawn.
function scatterTile(g, world, x, y, i) {
  const t = world.terrain[i];
  if (t === T.WATER || !isFree(world, i)) return;
  const r = hash2(x, y, world.seed + 3);
  if (t === T.FERTILE) fertileSpeckle(g, world, x, y);
  if (t === T.MEADOW) tufts(g, x, y, 9, 0);
  else if (t !== T.BANK && nearType(world, x, y, T.MEADOW)) tufts(g, x, y, 3, 5);
  if (hasNewLand(world) && (t === T.ROCKY || nearType(world, x, y, T.ROCKY) || nearType(world, x, y, T.HILLS))) {
    if (t === T.ROCKY) beltScatter(g, world, x, y, i); else if (t !== T.BANK) screeScatter(g, world, x, y);
  } else if (t === T.ROCKY || nearType(world, x, y, T.ROCKY)) {
    const n = t === T.ROCKY ? 3 : 1;
    for (let j = 0; j < n; j++) g.circ(p(x + hash2(x, y, 80 + j), y + hash2(x, y, 90 + j)), 0.9, j % 2 ? TERRAIN.pebbleLight : TERRAIN.pebble, { alpha: 0.8 });
  }
  if (t === T.BANK) {
    const q = p(x + 0.3 + r * 0.4, y + 0.3 + hash2(x, y, 4) * 0.4);
    g.ell(q, 5 + r * 5, 1.6, TERRAIN.mud, { alpha: 0.7 });
    g.ell([q[0] - 1, q[1] - 0.4], 3.5 + r * 3, 1.1, TERRAIN.mudDark, { alpha: 0.6 });
  }
  if (t === T.CLAY) claySpeckle(g, x, y);
  edgeFringe(world, x, y, t);
  if (hasNewLand(world)) bandScatter(g, world, x, y, i, t);
  if (t === T.DESERT) {
    const bits = shapeLayer(world)[i];
    if (bits) shapeTile(g, world, x, y, bits);
    const cq = p(x + 0.5, y + 0.5);
    if (r < 0.05) rock(g, cq);
    else if (shrubKind(world, i, r) === 'scrub') scrub(g, cq);
    else if (shrubKind(world, i, r) === 'dry') dryShrub(g, cq);
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
  flushFringe(g);
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
    if (!b || hasYard(b)) return;   // 9.3 (Track G): a building with a yard has its own trodden patch (yards.js)
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
  drawYards(g, world, range);   // Version 9.3 (Track G): the trodden yards, paths and contact shadows, under the roads
  drawRoads(g, world, range);
  drawStreetFurniture(g, world, range);
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

// Version 9.1 (Track P, ruling 1686): the chunks are held by their canvas bytes as well as their count. At DPR 2 and zoom 1 a chunk bakes at
// scale 3 (1,560 x 792 px, about 4.9 MB), so 32 of them were about 160 MB; the budget keeps about 48 MB, evicting the least recently used. A
// chunk the frame shows (the renderer names them in frame()) is never evicted for the budget, at any scale, so a view that needs more than the
// budget keeps every chunk it shows, and the ring round it is not baked ahead (room()). The renderer may lower the budget for a frame (ruling
// 1687: the terrain gives way to the sprites a view needs, so the two together keep CACHES_BUDGET_BYTES, target P3's 64 MB at DPR 2), never below
// TERRAIN_FLOOR_BYTES, so a sprite-heavy view (hills at zoom 2) still keeps the ring round it instead of evicting and baking it again frame after frame.
export const TERRAIN_BUDGET_BYTES = 48 * 1024 * 1024;
export const CACHES_BUDGET_BYTES = 64 * 1024 * 1024;
export const TERRAIN_FLOOR_BYTES = 16 * 1024 * 1024;
export const terrainBudgetFor = (spriteBytes) => Math.max(TERRAIN_FLOOR_BYTES, CACHES_BUDGET_BYTES - spriteBytes);
export const chunkBytes = (scale) => Math.ceil((32 * CHUNK + 2 * CHUNK_MARGIN) * scale) * Math.ceil((16 * CHUNK + 2 * CHUNK_MARGIN) * scale) * 4;   // bakeChunk's canvas

export function createTerrainBaker({ createCanvas = defaultCreateCanvas, counter = null, maxChunks = 32, maxBytes = TERRAIN_BUDGET_BYTES } = {}) {
  const perWorld = new WeakMap(); // world -> { map: Map(key -> { sig, sprite, used }), bytes }
  // shown: the chunks ('cx,cy') the frame being drawn shows; budget: this frame's; frameTick: the tick it began at (an entry used since was looked at in it)
  let tick = 0, shown = new Set(), budget = maxBytes, frameTick = 0;
  const trim = (w, keep = null) => { while (w.bytes > budget) { const o = oldest(w, keep, false); if (o === null) break; drop(w, o); } };
  const entryFor = (world) => {
    let e = perWorld.get(world);
    if (!e) { e = { map: new Map(), bytes: 0 }; perWorld.set(world, e); }
    return e;
  };
  const key = (cx, cy, scale) => `${cx},${cy}@${scale}`;
  const bytesOf = (sprite) => sprite.canvas.width * sprite.canvas.height * 4;
  const drop = (w, k) => { const v = w.map.get(k); if (v) { w.bytes -= bytesOf(v.sprite); w.map.delete(k); } };
  // The least recently used entry but `keep`; unless `any`, only among the chunks the frame does not show.
  const oldest = (w, keep, any) => {
    let found = null, at = Infinity;
    for (const [k, v] of w.map) if (k !== keep && v.used < at && (any || !shown.has(`${v.sprite.cx},${v.sprite.cy}`))) { found = k; at = v.used; }
    return found;
  };

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
      drop(w, k);
      e = { sig, sprite: bakeChunk(world, cx, cy, scale, createCanvas), used: ++tick };
      w.map.set(k, e);
      w.bytes += bytesOf(e.sprite);
      // Drop only this chunk's entries at other scales; the rest stay as fallbacks until their own re-bake.
      for (const [otherKey, v] of [...w.map]) if (otherKey !== k && v.sprite.cx === cx && v.sprite.cy === cy) drop(w, otherKey);
      if (w.map.size > maxChunks) { const o = oldest(w, k, true); if (o !== null) drop(w, o); }
      trim(w, k);
    }
    e.used = ++tick;
    return e.sprite;
  }

  return {
    get, peek, capacity: maxChunks, budget: maxBytes, size: (world) => entryFor(world).map.size, clear: (world) => perWorld.delete(world),
    // Version 9.1 (Track P): the renderer calls frame(chunks, world, bytes) as each frame begins with the chunks ({ cx, cy }) it shows, which the
    // budget never evicts, and this frame's budget (at most maxBytes), down to which the world's other chunks go at once; trim(world, bytes) sets
    // the budget again later in the frame. bytes(world) is what the world's chunks hold. room(world, zoom, dpr) says whether the ring's pre-bake
    // may bake one more chunk at that scale: it fits the count and the budget once the chunks this frame has not looked at are let go (the ring
    // ahead takes the place of chunks left behind, never of the ring itself, which the pre-bake's search looks at every frame).
    frame(chunks = [], world = null, bytes = maxBytes) {
      shown = new Set(chunks.map(({ cx, cy }) => `${cx},${cy}`));
      frameTick = tick;
      budget = Math.min(maxBytes, bytes);
      if (world) trim(entryFor(world));
    },
    trim(world, bytes = maxBytes) { budget = Math.min(maxBytes, bytes); trim(entryFor(world)); },
    bytes: (world) => entryFor(world).bytes,
    room: (world, zoom, dpr) => {
      const w = entryFor(world);
      let stale = 0, staleBytes = 0;
      for (const v of w.map.values()) if (v.used <= frameTick && !shown.has(`${v.sprite.cx},${v.sprite.cy}`)) { stale++; staleBytes += bytesOf(v.sprite); }
      return (w.map.size < maxChunks || stale > 0) && w.bytes - staleBytes + chunkBytes(chunkScaleFor(zoom, dpr)) <= budget;
    },
  };
}
