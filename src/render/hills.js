// Hills on screen (Stage 4.7, Task 3, ruling 464): the sim's T.HILLS tiles drawn as sand-stone mounds standing at their real height, one sprite a
// tile, depth-sorted with the buildings, trees and walkers (a figure in front of a hill is drawn over it, one behind it under it). Look only: nothing
// here reads or writes the sim beyond the terrain, and the draws are hash2 keyed by the seed with S47_SALT.hillLook (a render salt).
//
// A hill is a smooth dome on a fine grid (HILL.sub points a tile). The height at a point is the dome's profile of its distance in from the nearest tile that
// is not a hill (so it is 0 all round the cluster and meets the rocky skirt flush, with no cliff), scaled by the cluster's size and bent by a little noise.
// A tile is the 4 x 4 points of its own patch, drawn as triangles lit from the lower left (a slope turned towards +y is lit, one turned towards +x lies in a
// lavender shadow, as every building's faces are), cut into sand-stone strata by contour lines at fixed heights (so the layers run on from tile to tile),
// with a few boulders on the slopes. Its slot is `hill.<hash of its heights>.<look>`: hillsIn registers the entry in the art registry the first time a
// world needs it, so the registry holds only the looks the maps have used.
import { p, U as up, hs } from './iso.js';
import { hash2, valueNoise } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { idx, inBounds } from '../sim/grid.js';
import { S47_SALT } from '../data/s47.js';
import { ART } from './art/registry.js';
import { SHADOW } from './art/palette.js';

export const HILL = {
  sub: 3,            // grid points a tile is cut into each way
  reach: 1.6,        // tiles in from the edge of a cluster where the dome is at its full height
  unit: 23,          // art px of height of a 2 x 2 cluster's middle (bigger clusters stand higher)
  grow: 0.45,        // how much taller the biggest cluster (14 tiles) stands than the smallest (share of the unit)
  noise: 0.45,       // share of the height the noise bends it by
  band: 6,           // art px between the strata lines
  looks: 4,          // sprite variants a patch has (boulders)
  light: [-0.2, 0.7, 0.55],   // the direction the light comes from, in tile coordinates (x, y, up): from the +y side and above
  // the sand-stone ramp by how lit a slope is (0 shadow ... 1 full light): lavender shadow, rock, sand-stone, pale top
  ramp: [[0.0, '#8E7684'], [0.25, '#A98F8C'], [0.45, '#C4A57B'], [0.62, '#D8C08E'], [0.88, '#E6D2A2'], [1.0, '#F0E2BC']],
  layer: '#B58A5C',  // the tone every other layer takes a little of
  line: '#6E5668', rock: '#B39C82', rockLight: '#D9C7A8', rockShade: '#8E7684',
};

const mix = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};
const rampAt = (b) => {
  const r = HILL.ramp;
  for (let i = 1; i < r.length; i++) if (b <= r[i][0]) return mix(r[i - 1][1], r[i][1], (b - r[i - 1][0]) / (r[i][0] - r[i - 1][0]));
  return mix(r[r.length - 1][1], r[r.length - 1][1], 0);
};
// The strata tone: a colour (as mix returns it) taken a little towards HILL.layer.
function tint(col) {
  const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(col), l = parseInt(HILL.layer.slice(1), 16), t = 0.24;
  const o = [(l >> 16) & 255, (l >> 8) & 255, l & 255];
  return `rgb(${[+m[1], +m[2], +m[3]].map((v, i) => Math.round(v * (1 - t) + o[i] * t)).join(',')})`;
}

// ── Heights ──
const fieldCache = new WeakMap();   // terrain -> { seed, v: Int16Array((n * sub + 1)^2) heights in art px, tiles: [tile index], m }
// Every grid point's height in art px, and the list of hill tiles; once a world (terrain never changes in play).
export function hillField(world) {
  const hit = fieldCache.get(world.terrain);
  if (hit && hit.seed === world.seed) return hit;
  const n = world.size, S = HILL.sub, m = n * S + 1, v = new Int16Array(m * m), tiles = [];
  const isHill = (x, y) => inBounds(n, x, y) && world.terrain[idx(n, x, y)] === T.HILLS;
  for (let i = 0; i < world.terrain.length; i++) if (world.terrain[i] === T.HILLS) tiles.push(i);
  if (tiles.length) {
    // the size of each cluster (8-neighbour components of hill tiles), so a bigger one stands higher
    const comp = new Int32Array(n * n).fill(-1), sizes = [];
    for (const i0 of tiles) {
      if (comp[i0] >= 0) continue;
      const c = sizes.length, q = [i0];
      comp[i0] = c;
      for (let k = 0; k < q.length; k++) {
        const x = q[k] % n, y = (q[k] - x) / n;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isHill(x + dx, y + dy) && comp[idx(n, x + dx, y + dy)] < 0) { comp[idx(n, x + dx, y + dy)] = c; q.push(idx(n, x + dx, y + dy)); }
      }
      sizes.push(q.length);
    }
    const salt = (world.seed + S47_SALT.hillLook) | 0;
    const done = new Uint8Array(m * m);
    for (const i of tiles) {
      const tx = i % n, ty = (i - tx) / n, size = sizes[comp[i]];
      const peak = HILL.unit * (1 + HILL.grow * Math.min(1, Math.max(0, (size - 4) / 10)));
      for (let j = 0; j <= S; j++) {
        for (let k = 0; k <= S; k++) {
          const gx = tx * S + k, gy = ty * S + j, node = gy * m + gx;
          if (done[node]) continue;
          done[node] = 1;
          const X = gx / S, Y = gy / S;
          let d = HILL.reach;                                          // the distance in from the nearest tile that is not a hill, up to the dome's reach
          for (let ey = Math.floor(Y) - 2; ey <= Math.floor(Y) + 2; ey++) {
            for (let ex = Math.floor(X) - 2; ex <= Math.floor(X) + 2; ex++) {
              if (isHill(ex, ey)) continue;
              d = Math.min(d, Math.hypot(Math.max(ex - X, 0, X - (ex + 1)), Math.max(ey - Y, 0, Y - (ey + 1))));
            }
          }
          const t = Math.min(1, d / HILL.reach), dome = 0.35 * Math.sin((t * Math.PI) / 2) + 0.65 * t * t * (3 - 2 * t);   // a gentle foot, a steeper middle, a rounded top
          const bend = 1 + (valueNoise(X * 2.4, Y * 2.4, salt, 1) - 0.5) * 2 * HILL.noise;
          v[node] = d <= 0 ? 0 : Math.max(0, Math.round(peak * dome * bend));
        }
      }
    }
  }
  const out = { seed: world.seed, v, tiles, m };
  fieldCache.set(world.terrain, out);
  return out;
}

// The tile's 4 x 4 grid heights, row by row, and its look.
export function hillPatch(world, x, y) {
  const { v, m } = hillField(world), S = HILL.sub, hts = [];
  for (let j = 0; j <= S; j++) for (let k = 0; k <= S; k++) hts.push(v[(y * S + j) * m + x * S + k]);
  return { hts, look: Math.floor(hash2(x, y, (world.seed + S47_SALT.hillLook + 7) | 0) * HILL.looks) };
}
const slotOf = ({ hts, look }) => {
  let h = 2166136261;
  for (const t of hts) h = Math.imul(h ^ t, 16777619) >>> 0;
  return `hill.${h.toString(36)}.${look}`;
};
// The tile's slot name.
export const hillSlotAt = (world, x, y) => slotOf(hillPatch(world, x, y));

// The hill objects of a frame, for renderer.collectObjects: [{ x, y, slot, i }] for each hill tile in range (the slots registered in `registry`).
export function hillsIn(world, range, registry = ART) {
  const { tiles } = hillField(world), n = world.size, out = [];
  for (const i of tiles) {
    const x = i % n, y = (i - x) / n;
    if (x < range.x0 - 1 || x > range.x1 + 1 || y < range.y0 - 1 || y > range.y1 + 1) continue;
    const patch = hillPatch(world, x, y), slot = slotOf(patch);
    if (!registry[slot]) registry[slot] = hillDef(patch);
    out.push({ x, y, slot, i });
  }
  return out;
}

// ── The art ──
// The part of a polygon (points [x, y, z] in tile coordinates and art px of height) with z between lo and hi (Sutherland-Hodgman against each plane).
function clipZ(poly, lo, hi) {
  const cut = (pts, keep, level) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ia = keep(a), ib = keep(b);
      if (ia) out.push(a);
      if (ia !== ib) {
        const t = (level - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, level]);
      }
    }
    return out;
  };
  let pts = cut(poly, (q) => q[2] >= lo - 1e-9, lo);
  if (pts.length) pts = cut(pts, (q) => q[2] <= hi + 1e-9, hi);
  return pts;
}
const screen = ([x, y, z]) => up(p(x, y), z);

// A boulder at art point q: a rounded stone with a lit top, `s` times the size of the scatter rock (art/nature.js rock).
function boulder(g, q, s, shade = false) {
  g.ell([q[0] + 1.2 * s, q[1] + 0.6 * s], 4.6 * s, 1.3 * s, SHADOW, { alpha: 0.16 });
  g.poly([[q[0] - 4 * s, q[1]], [q[0] - 2.4 * s, q[1] - 3.2 * s], [q[0] + 1.6 * s, q[1] - 3.8 * s], [q[0] + 4.4 * s, q[1] - 1.1 * s], [q[0] + 3 * s, q[1] + 1.2 * s], [q[0] - 2 * s, q[1] + 1.3 * s]], shade ? HILL.rockShade : HILL.rock, { outline: true });
  g.poly([[q[0] - 2.2 * s, q[1] - 2.6 * s], [q[0] + 1.6 * s, q[1] - 3.3 * s], [q[0] + 3 * s, q[1] - 1.5 * s], [q[0] - 0.8 * s, q[1] - 1 * s]], HILL.rockLight);
}

// One triangle of the surface: [a, b, c] points [x, y, z] in tile coordinates and art px of height. Its lit-ness from its normal (z in tile units: 16 art px
// to a tile) picks the sand-stone colour; each strata layer it crosses is filled, every other one a touch darker and warmer, and a contour line marks the join.
function slope(g, tri, L) {
  const zmax = Math.max(tri[0][2], tri[1][2], tri[2][2]), zmin = Math.min(tri[0][2], tri[1][2], tri[2][2]);
  if (zmax <= 0) return;                                              // all on the ground: the baked ground shows
  const [a, b, c] = tri;
  const e1 = [b[0] - a[0], b[1] - a[1], (b[2] - a[2]) / 16], e2 = [c[0] - a[0], c[1] - a[1], (c[2] - a[2]) / 16];
  let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  if (n[2] < 0) n = n.map((t) => -t);
  const nl = Math.hypot(...n) || 1, lit = Math.max(0, Math.min(1, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / nl));
  const base = rampAt(lit);
  for (let k = Math.floor(zmin / HILL.band); k * HILL.band < zmax; k++) {
    const poly = clipZ(tri, k * HILL.band, (k + 1) * HILL.band);
    if (poly.length < 3) continue;
    const col = k % 2 ? tint(base) : base;
    g.poly(poly.map(screen), col, { stroke: col, strokeWidth: 0.55 });   // the stroke in its own colour hides the hairline between neighbours
  }
  for (let k = Math.floor(zmin / HILL.band) + 1; k * HILL.band < zmax; k++) {
    const z = k * HILL.band, seg = [];
    for (let i = 0; i < 3; i++) {
      const p0 = tri[i], p1 = tri[(i + 1) % 3];
      if ((p0[2] - z) * (p1[2] - z) < 0) { const t = (z - p0[2]) / (p1[2] - p0[2]); seg.push(screen([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, z])); }
    }
    if (seg.length === 2) g.line(seg[0], seg[1], HILL.line, 0.55, 0.34);
  }
}

function drawHill(g, hts, look) {
  const Lraw = HILL.light, ln = Math.hypot(...Lraw), L = Lraw.map((c) => c / ln), S = HILL.sub, W = S + 1;
  const node = (k, j) => [k / S, j / S, hts[j * W + k]];
  // the foot: a contact shadow along the +x edge where the patch is on the ground
  if (hts[S] === 0 && hts[S * W + S] === 0) g.poly([screen([1, 0, 0]), screen([1.16, 0.08, 0]), screen([1.16, 1.0, 0]), screen([1, 1, 0])], SHADOW, { alpha: 0.1 });
  for (let j = 0; j < S; j++) {
    for (let k = 0; k < S; k++) {
      const nw = node(k, j), ne = node(k + 1, j), se = node(k + 1, j + 1), sw = node(k, j + 1);
      // the cell is cut along the diagonal that follows the ground best (the smaller drop), so a ridge stays a ridge
      const tris = Math.abs(nw[2] - se[2]) <= Math.abs(ne[2] - sw[2]) ? [[nw, ne, se], [nw, se, sw]] : [[nw, ne, sw], [ne, se, sw]];
      for (const tri of tris) slope(g, tri, L);
    }
  }
  // boulders on the slopes, at the cells the look picks
  const at = (k, j) => hts[j * W + k];
  const cells = [[1, 1, 0.95], [0, 2, 0.8], [2, 0, 1.1], [2, 2, 0.9]];
  const pick = look === 0 ? [] : look === 1 ? [cells[0]] : look === 2 ? [cells[1], cells[2]] : [cells[3]];
  for (const [k, j, s] of pick) {
    const z = (at(k, j) + at(k + 1, j) + at(k, j + 1) + at(k + 1, j + 1)) / 4;
    if (z < 3) continue;                                              // none on the very foot of the ground
    boulder(g, screen([(k + 0.5) / S, (j + 0.5) / S, z]), s, hs(look, k * 3 + j, 5) > 0.7);
  }
}

// The registry entry of a hill patch.
export function hillDef({ hts, look }) {
  const top = Math.max(...hts);
  return { w: 1, d: 1, height: top, bounds: [-20, -top - 8, 24, 22], shadows: [], draw: (g) => drawHill(g, hts, look) };
}
