// Version 7.1.1 (fix batch C, ruling 1120): rapids on the cataract layout. Where the river spreads wide round its small rocky islands (src/sim/courses.js: the
// islands are land enclosed by water), the water near each island is drawn as broken white water: short pale flecks and a little foam along each island's
// shore. Everything here is render only and reads from the map as it stands: the islands are found in the terrain, and the way the river runs is
// world.mapParams.course (axis 'ns' runs south; 'ew' east or west by its side), so map generation is untouched.
//   Full    each fleck drifts downstream a tile and fades in and out, out of step by tile (calm, like the glints)
//   Gentle  the same flecks stand still at full strength: a still white texture
//   Still   the same still texture (a picture, no movement)
// Drawn in the ground layer by render/v70.js, over the season's wash so the white stays white.
import { hash2 } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { idx, inBounds } from '../sim/grid.js';
import { p } from './iso.js';
import { TERRAIN } from './art/palette.js';

export const RAPIDS_LAYOUT = 'cataract';
const REACH_DOWN = 4;     // tiles downstream of a rock that still read as rapids
const REACH_UP = 2;       // and upstream or beside it
const REACH_GORGE = 2.5;  // from a rocky wall of the gorge
const GORGE_SHARE = 0.7;  // the gorge's walls throw less white than an island
const MAX_ISLAND = 60;      // a piece of enclosed land this small or smaller is an island
const DRIFT_TILES_PER_S = 0.45;
const CYCLE_MS = 3200;
const STEPS = 6;            // alpha steps of a fading fleck, one stroke call each
const SALT = 7111;
export const FLECKS = 4;      // flecks a tile can hold

const cache = new WeakMap();   // world -> { tiles: [{ x, y, w, shore }], flow: [fx, fy] }; the terrain never changes after the map is made

// The pieces of land (4-linked, not water) wholly ringed by water: the islands. The mainland touches the map's edge or is far larger.
function islands(world) {
  const n = world.size, seen = new Uint8Array(n * n), out = [];
  for (let s = 0; s < n * n; s++) {
    if (seen[s] || world.terrain[s] === T.WATER) continue;
    const comp = [s];
    seen[s] = 1;
    let ringed = true;
    for (let k = 0; k < comp.length; k++) {
      const x = comp[k] % n, y = (comp[k] - x) / n;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!inBounds(n, nx, ny)) { ringed = false; continue; }
        const j = idx(n, nx, ny);
        if (world.terrain[j] === T.WATER || seen[j]) continue;
        seen[j] = 1;
        comp.push(j);
      }
    }
    if (ringed && comp.length <= MAX_ISLAND) out.push(comp);
  }
  return out;
}

// The rapids of a world: the water tiles near an island, each with w (1 just downstream of a rock, falling to 0 away from it) and shore (it touches an island tile),
// in row order, and the unit vector the river runs in. Empty on any layout but the cataract.
export function rapidsOf(world) {
  let r = cache.get(world);
  if (r) return r;
  const n = world.size, course = (world.mapParams && world.mapParams.course) || {};
  const flow = course.axis === 'ew' ? [course.side === 'west' ? -1 : 1, 0] : [0, 1];
  const best = new Map();
  // Rock makes the white water: each island tile and each rocky tile of the gorge's walls throws it, thickest in the first tiles downstream and thinning
  // to nothing within REACH_DOWN (REACH_UP upstream, REACH_GORGE from a gorge wall), so open water between the rocks stays clear.
  const spread = (cx, cy, scale, down, up, shoreD) => {
    const R = Math.ceil(down);
    for (let y = cy - R; y <= cy + R; y++) {
      for (let x = cx - R; x <= cx + R; x++) {
        if (!inBounds(n, x, y) || world.terrain[idx(n, x, y)] !== T.WATER) continue;
        const d = Math.hypot(x - cx, y - cy), after = (x - cx) * flow[0] + (y - cy) * flow[1];
        const reach = after > 0.5 ? down : up;
        if (d > reach) continue;
        const w = scale * (after > 0.5 ? 1 : 0.5) * Math.max(0, 1 - Math.max(0, d - 1) / (reach - 1)) ** 1.5;
        const i = idx(n, x, y), tile = best.get(i) || { x, y, w: 0, shore: false };
        tile.w = Math.max(tile.w, w);
        tile.shore = tile.shore || d <= shoreD;
        best.set(i, tile);
      }
    }
  };
  if (world.mapVariant === RAPIDS_LAYOUT) {
    const rock = new Set();
    for (const comp of islands(world)) {
      for (const t of comp) { rock.add(t); spread(t % n, (t - (t % n)) / n, 1, REACH_DOWN, REACH_UP, 1.5); }
    }
    for (let i = 0; i < n * n; i++) if (world.terrain[i] === T.ROCKY && !rock.has(i)) spread(i % n, (i - (i % n)) / n, GORGE_SHARE, REACH_GORGE, REACH_GORGE, 0);
  }
  r = { tiles: [...best.values()].sort((a, b) => a.y - b.y || a.x - b.x), flow };
  cache.set(world, r);
  return r;
}

// A fleck's place on a water tile at time now: { x, y, a } in tiles and its strength 0..1, or null (not drawn). `moving` (Full) lets it drift and fade; otherwise
// it stands at the middle of its cycle, at full strength.
export function fleckAt(world, tile, k, now, moving) {
  const { x, y, w } = tile;
  if (hash2(x, y, SALT + k) > 0.6 * w * w + 0.04 * w) return null;   // thick beside a rock, almost none away from it
  const bx = x + 0.12 + hash2(x, y, SALT + 10 + k) * 0.76, by = y + 0.12 + hash2(x, y, SALT + 20 + k) * 0.76;
  if (!moving) return { x: bx, y: by, a: 1 };
  const flow = rapidsOf(world).flow, cycle = CYCLE_MS * (0.8 + 0.4 * hash2(x, y, SALT + 30 + k));
  const t = ((now + hash2(x, y, SALT + 40 + k) * cycle * 7) % cycle) / cycle;
  const move = (DRIFT_TILES_PER_S * (t * cycle)) / 1000 - DRIFT_TILES_PER_S * (cycle / 2000);   // centred on the still position
  const fx = bx + flow[0] * move, fy = by + flow[1] * move;
  if (!inBounds(world.size, Math.floor(fx), Math.floor(fy)) || world.terrain[idx(world.size, Math.floor(fx), Math.floor(fy))] !== T.WATER) return null;
  return { x: fx, y: fy, a: Math.sin(Math.PI * t) };
}

export function drawRapids(g, world, range, now, motion) {
  if (world.mapVariant !== RAPIDS_LAYOUT) return;
  const { tiles, flow } = rapidsOf(world);
  if (!tiles.length) return;
  const moving = motion === 'full', buckets = [], foam = [];
  const along = [1, 0.3];
  for (const t of tiles) {
    if (t.x < range.x0 - 1 || t.x > range.x1 + 1 || t.y < range.y0 - 1 || t.y > range.y1 + 1) continue;
    for (let k = 0; k < FLECKS; k++) {
      const f = fleckAt(world, t, k, now, moving);
      if (!f) continue;
      const s = Math.max(1, Math.round(f.a * STEPS));
      const q = p(f.x, f.y), len = 4 + hash2(t.x, t.y, SALT + 50 + k) * 4;
      (buckets[s] || (buckets[s] = [])).push(['M', [q[0] - len * along[0] / 2, q[1] + 0.3 * along[1]]], ['L', [q[0] + len * along[0] / 2, q[1] - 0.3 * along[1]]]);
    }
    if (t.shore || hash2(t.x, t.y, SALT + 60) < t.w * 0.5) foam.push(t);
  }
  // white caps: broken foam at each island's shore (always) and here and there in the water round it
  for (const t of foam) {
    for (let k = 0; k < (t.shore ? 2 : 1); k++) {
      const q = p(t.x + 0.2 + hash2(t.x, t.y, SALT + 61 + k) * 0.6, t.y + 0.2 + hash2(t.x, t.y, SALT + 65 + k) * 0.6);
      g.ell(q, 2.4 + hash2(t.x, t.y, SALT + 63 + k) * (t.shore ? 3.6 : 1.8), t.shore ? 1.5 : 1, TERRAIN.foam, { alpha: t.shore ? 0.85 : 0.7 });
    }
  }
  for (let s = 1; s <= STEPS; s++) if (buckets[s]) g.stroke(buckets[s], '#FFFFFF', 1.5, 0.95 * (s / STEPS));
}
