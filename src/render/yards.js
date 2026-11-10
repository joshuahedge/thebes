// Version 9.3 (Track G, rulings 1912-1914): the ground under and round the buildings, baked into the chunk (spec section 5). Each building gets a trodden yard a little
// larger than its footprint, in the materials of its look (MATERIALS[look].ground: packed earth, swept gravel, part-paved, a paved court); neighbouring homes with a
// tile or less between them share one patch; a worn path runs to the nearest road tile when a tile or two lies between; and a soft contact shadow sits at the walls' base.
// All noise is hashed from the map seed and the tile, so a map always draws the same, and nothing here draws per frame.
import { p } from './iso.js';
import { hash2, valueNoise } from '../sim/rng.js';
import { idx, inBounds } from '../sim/grid.js';
import { T } from '../sim/terrain.js';
import { SHADOW, STONE, GOLD, TERRAIN } from './art/palette.js';
import { MATERIALS } from './art/materials.js';
import { lookReader } from './groundLooks.js';
import { dotsFill, linesStroke } from './batch.js';
import { FARM_TYPES } from './art/stages.js';

export const YARD_REACH = 0.3;        // tiles a yard reaches past the footprint
export const PATH_REACH = 3;          // a path runs to a road at most this many tiles from the footprint (the signature's two-tile ring covers the rest)
const NO_YARD = new Set([...FARM_TYPES, 'wall', 'gate', 'bridge', 'rubble', 'plaza', 'garden', 'statue', 'sphinx']);
export const hasYard = (b) => Boolean(b) && !NO_YARD.has(b.type);

const noise = (world, x, y, salt, f) => valueNoise(x * f, y * f, world.seed + salt, 1) - 0.5;

// A closed soft outline round the rectangle (x0, y0)-(x1, y1) (tiles), grown by e, its edge wandering by noise: a path of quadratic curves through the midpoints of
// the points, walked clockwise in tile space (so every yard has one winding and a group of them fills as a union).
const outlines = new WeakMap();   // world -> Map: a footprint's outline (it hangs off the footprint and the seed, nothing else), so a re-bake does not work the noise again
function yardOutline(world, x0, y0, x1, y1, e, salt) {
  let held = outlines.get(world);
  if (!held || held.size > 3000) { held = new Map(); outlines.set(world, held); }
  const key = `${x0},${y0},${x1},${y1},${e},${salt}`;
  let hit = held.get(key);
  if (!hit) { hit = outlineOf(world, x0, y0, x1, y1, e, salt); held.set(key, hit); }
  return hit;
}
function outlineOf(world, x0, y0, x1, y1, e, salt) {
  const pts = [];
  const side = (ax, ay, bx, by, nx, ny) => {
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(len / 0.8));
    for (let k = 0; k < n; k++) {
      const u = k / n, px = ax + (bx - ax) * u, py = ay + (by - ay) * u;
      const w = e + noise(world, px, py, salt, 2.3) * 0.3 + noise(world, px, py, salt + 9, 6.1) * 0.12 - (k === 0 ? 0.1 : 0);   // the corners are pulled in a touch
      pts.push(p(px + nx * w, py + ny * w));
    }
  };
  side(x0, y0, x1, y0, 0, -1); side(x1, y0, x1, y1, 1, 0); side(x1, y1, x0, y1, 0, 1); side(x0, y1, x0, y0, -1, 0);
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const segs = [['M', mid(pts[pts.length - 1], pts[0])]];
  for (let k = 0; k < pts.length; k++) segs.push(['Q', pts[k], mid(pts[k], pts[(k + 1) % pts.length])]);
  segs.push(['Z']);
  return segs;
}

const rectSegs = (x0, y0, x1, y1) => [['M', p(x0, y0)], ['L', p(x1, y0)], ['L', p(x1, y1)], ['L', p(x0, y1)], ['Z']];

// The buildings with a footprint tile in the range, in the order the tiles are walked (the same on every bake).
function buildingsIn(world, range) {
  const seen = new Set(), list = [];
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (!inBounds(world.size, x, y)) continue;
      const id = world.occ[idx(world.size, x, y)];
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const b = world.buildings[id];
      if (b && hasYard(b)) list.push(b);
    }
  }
  return list;
}

const occAt = (world, x, y) => (inBounds(world.size, x, y) ? world.occ[idx(world.size, x, y)] : 0);
const roadAt = (world, x, y) => inBounds(world.size, x, y) && Boolean(world.road[idx(world.size, x, y)]);
const freeAt = (world, x, y) => inBounds(world.size, x, y) && !world.occ[idx(world.size, x, y)] && !world.road[idx(world.size, x, y)] && world.terrain[idx(world.size, x, y)] !== T.WATER;

// Where a building's worn path goes: the nearest road tile straight out from a side with free tiles between. Returns { k, from: [x, y] on the footprint's edge, to: [x, y] the
// road tile's centre, side }, or null when a road touches the footprint (it needs no path) or none is in reach. Front sides (south, east) first, so ties go to the side the viewer sees.
export function pathFor(world, b) {
  let best = null;
  for (const side of [2, 1, 0, 3]) {
    const along = side === 0 || side === 2 ? b.w : b.d;
    const order = [...Array(along).keys()].sort((a, c) => Math.abs(a - (along - 1) / 2) - Math.abs(c - (along - 1) / 2) || a - c);   // from the middle out
    for (const a of order) {
      for (let k = 1; k <= PATH_REACH; k++) {
        const tx = side === 1 ? b.x + b.w - 1 + k : side === 3 ? b.x - k : b.x + a;
        const ty = side === 2 ? b.y + b.d - 1 + k : side === 0 ? b.y - k : b.y + a;
        if (roadAt(world, tx, ty)) {
          if (k === 1) return null;
          if (!best || k < best.k) best = { k, from: [side === 1 ? b.x + b.w : side === 3 ? b.x : b.x + a + 0.5, side === 2 ? b.y + b.d : side === 0 ? b.y : b.y + a + 0.5], to: [tx + 0.5, ty + 0.5], side };
          break;
        }
        if (!freeAt(world, tx, ty)) break;
      }
    }
  }
  return best;
}

// A worn path: a slightly wider rim, then the packed surface, with a gentle seeded bend. Returns its curve.
function pathCurve(world, path, b) {
  const [fx, fy] = path.from, [tx, ty] = path.to;
  const bend = noise(world, b.x, b.y, 1913, 1.7) * 0.18, mx = (fx + tx) / 2, my = (fy + ty) / 2;
  const across = path.side === 0 || path.side === 2 ? [bend, 0] : [0, bend];
  return [['M', p(fx, fy)], ['Q', p(mx + across[0], my + across[1]), p(tx, ty)]];
}

// The soft shadow at the walls' base: two layers, the light from the upper left so it falls a little to the right and down. One path a layer for the whole chunk.
function contactShadows(g, list) {
  const segs = [], core = [];
  for (const b of list) {
    segs.push(...rectSegs(b.x - 0.1 + 0.1, b.y - 0.1 + 0.12, b.x + b.w + 0.2, b.y + b.d + 0.22));
    core.push(...rectSegs(b.x + 0.03, b.y + 0.05, b.x + b.w + 0.07, b.y + b.d + 0.09));
  }
  g.path(segs, SHADOW, { alpha: 0.1 });
  g.path(core, SHADOW, { alpha: 0.14 });
}

// Every yard, path and contact shadow in the range. Per look, one path holds the yards' outlines and the bridges between close neighbours, so the fill is a union.
export function drawYards(g, world, range) {
  const list = buildingsIn(world, range);
  if (!list.length) return;
  const reader = lookReader(world), looks = new Map();
  for (const b of list) looks.set(b, reader.building(b));
  for (let look = 0; look < MATERIALS.length; look++) {
    const mine = list.filter((b) => looks.get(b) === look);
    if (!mine.length) continue;
    const m = MATERIALS[look], [packed, edge] = m.ground, e = YARD_REACH;
    const fill = [], paths = [], pebbles = [], fronts = [], joints = [], borders = [];
    for (const b of mine) {
      fill.push(...yardOutline(world, b.x, b.y, b.x + b.w, b.y + b.d, e, 1912));
      // neighbours with a tile or less between them (east and south only, so each pair is met once) share one patch: a bridge over the gap
      for (let dy = 0; dy < b.d; dy++) {
        const c = occAt(world, b.x + b.w + 1, b.y + dy);
        if (c && !occAt(world, b.x + b.w, b.y + dy) && world.buildings[c] && looks.get(world.buildings[c]) === look) fill.push(...rectSegs(b.x + b.w - 0.1, b.y + dy - 0.05, b.x + b.w + 1.1, b.y + dy + 1.05));
      }
      for (let dx = 0; dx < b.w; dx++) {
        const c = occAt(world, b.x + dx, b.y + b.d + 1);
        if (c && !occAt(world, b.x + dx, b.y + b.d) && world.buildings[c] && looks.get(world.buildings[c]) === look) fill.push(...rectSegs(b.x + dx - 0.05, b.y + b.d - 0.1, b.x + dx + 1.05, b.y + b.d + 1.1));
      }
      const path = pathFor(world, b);
      if (path) paths.push(...pathCurve(world, path, b));
      const x0 = b.x - e, y0 = b.y - e, x1 = b.x + b.w + e, y1 = b.y + b.d + e;
      if (look <= 1) {
        const n = Math.round((look === 0 ? 3 : 4) * (b.w + b.d) / 2);
        for (let j = 0; j < n; j++) pebbles.push(p(x0 + (x1 - x0) * (0.1 + 0.8 * hash2(b.x, b.y, 1920 + j)), y0 + (y1 - y0) * (0.1 + 0.8 * hash2(b.y, b.x, 1940 + j))));
      } else {
        const fy0 = look === 2 ? y0 + (y1 - y0) * 0.35 : y0;   // City: the front part paved; Capital: all of it, a court
        fronts.push(...rectSegs(x0, fy0, x1, y1));
        for (let u = x0 + 0.6; u < x1 - 0.1; u += 0.8) joints.push([p(u, fy0), p(u, y1)]);
        for (let v = fy0 + 0.6; v < y1 - 0.1; v += 0.8) joints.push([p(x0, v), p(x1, v)]);
        if (look === 3) borders.push(...rectSegs(x0 + 0.12, fy0 + 0.12, x1 - 0.12, y1 - 0.12));
      }
    }
    // the worn rim, fading into the ground (a wide soft stroke of the edge tone), a firm line at a Town's gravel, then the packed fill
    if (look <= 1) g.path(fill, 'none', { stroke: edge, strokeWidth: 4, strokeAlpha: 0.28 });   // the worn rim: a wide soft stroke, half of it under the fill (a kerbed court has its own edge)
    if (look === 1) g.path(fill, 'none', { stroke: edge, strokeWidth: 1.8, strokeAlpha: 0.8 });
    g.path(fill, packed, { alpha: look === 0 ? 0.9 : 0.95 });
    if (paths.length) {
      const paved = look >= 2;
      g.stroke(paths, paved ? STONE[2] : edge, paved ? 7.6 : 8, paved ? 0.7 : 0.35);
      g.stroke(paths, paved ? m.paving : packed, paved ? 6 : 5.6, look === 1 ? 0.95 : 1);
      if (look === 1) g.stroke(paths, edge, 0.7, 0.5);
    }
    if (look <= 1) dotsFill(g, pebbles, look === 0 ? 0.7 : 0.55, look === 0 ? TERRAIN.roadPebble : TERRAIN.pebble, 0.6);
    else {
      g.path(fronts, m.paving, { stroke: look === 2 ? STONE[2] : '#CDB27A', strokeWidth: look === 2 ? 1.1 : 1, strokeAlpha: 0.85 });
      linesStroke(g, joints, STONE[2], 0.4, 0.3);
      if (look === 3) g.path(borders, 'none', { stroke: GOLD, strokeWidth: 0.5, strokeAlpha: 0.6 });
    }
  }
  contactShadows(g, list);
}
