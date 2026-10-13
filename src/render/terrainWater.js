// The river as one smooth band (spec 5.2): wet-sand fringe, a turquoise shallows strip about a quarter tile
// wide inside each bank (early-game pass 2.1), water with a deep centre, a light edge and a foam line,
// ripples and reeds. Mapgen gives one contiguous span of WATER per row, so the banks are curves through the
// row spans with the mock-up's gentle sine wobble.
import { p } from './iso.js';
import { hash2 } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';
import { TERRAIN } from './art/palette.js';
import { reeds } from './art/nature.js';

const spanCache = new WeakMap(); // world -> { spans, minWidth, pools, isle }; terrain never changes after the map is made
export const SHALLOWS_TILES = 0.25; // the shallows strip's width inside each bank, in tiles (a quarter tile across on screen)

// The river is the biggest piece of water (4-connected). Any other piece is a pool (an oasis's lake, Stage 4.5): drawn as a
// blob of its own, never as part of a river row. Land inside the river's rows (an island, Stage 4.5) is drawn over the water.
function waterPieces(world) {
  const n = world.size, piece = new Int32Array(n * n).fill(-1), sizes = [];
  for (let s = 0; s < n * n; s++) {
    if (world.terrain[s] !== T.WATER || piece[s] >= 0) continue;
    const id = sizes.length, queue = [s];
    piece[s] = id;
    for (let k = 0; k < queue.length; k++) {
      const i = queue[k], x = i % n, y = (i - x) / n;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        const j = ny * n + nx;
        if (world.terrain[j] === T.WATER && piece[j] < 0) { piece[j] = id; queue.push(j); }
      }
    }
    sizes.push(queue.length);
  }
  let river = 0;
  for (let k = 1; k < sizes.length; k++) if (sizes[k] > sizes[river]) river = k;
  return { piece, river };
}

function riverData(world) {
  let data = spanCache.get(world);
  if (data) return data;
  const n = world.size, { piece, river } = waterPieces(world);
  const spans = [], pools = [], isle = [];
  for (let y = 0; y < n; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < n; x++) {
      const i = idx(n, x, y);
      if (piece[i] === river) { if (a < 0) a = x; b = x; } else if (piece[i] >= 0) pools.push([x, y]);
    }
    spans.push(a < 0 ? null : [a, b]);
    if (a >= 0) for (let x = a; x <= b; x++) if (world.terrain[idx(n, x, y)] !== T.WATER) isle.push([x, y]);
  }
  let minWidth = Infinity;
  for (const s of spans) if (s) minWidth = Math.min(minWidth, s[1] - s[0] + 1);
  data = { spans, minWidth, pools, isle };
  spanCache.set(world, data);
  return data;
}

// The water that is not the river: [[x, y], ...] in row order (an oasis's lake; empty on most maps).
export const riverPools = (world) => riverData(world).pools;
// The land inside the river's rows, an island's tiles: [[x, y], ...] in row order (empty on most maps).
export const riverIsle = (world) => riverData(world).isle;

export const riverSpans = (world) => riverData(world).spans;

const wobble = (y) => Math.sin(y * 1.3) * 0.12 + Math.sin(y * 0.47) * 0.18;

export function riverBanks(world, y0, y1) {
  const spans = riverSpans(world);
  const left = [], right = [], centre = [];
  for (let y = Math.max(0, y0); y <= Math.min(world.size - 1, y1); y++) {
    const s = spans[y];
    if (!s) continue;
    const w = wobble(y);
    left.push([s[0] - 0.05 + w, y + 0.5]);
    right.push([s[1] + 1.05 + w, y + 0.5]);
    centre.push([(s[0] + s[1] + 1) / 2 + w, y + 0.5, s[1] - s[0] + 1]);
  }
  return { left, right, centre };
}

// A quadratic curve through tile points: each point becomes a control point, with the curve passing
// through the midpoints between neighbours.
export function smoothPath(tilePoints) {
  const q = tilePoints.map(([x, y]) => p(x, y));
  if (!q.length) return [];
  const segs = [['M', q[0]]];
  for (let i = 1; i < q.length - 1; i++) segs.push(['Q', q[i], [(q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2]]);
  if (q.length > 1) segs.push(['L', q[q.length - 1]]);
  return segs;
}

function bandPath(left, right, grow) {
  const l = left.map(([x, y]) => [x - grow, y]);
  const r = right.map(([x, y]) => [x + grow, y]).reverse();
  const segs = smoothPath(l);
  const back = smoothPath(r);
  if (!segs.length || !back.length) return [];
  back[0][0] = 'L';
  return [...segs, ...back, ['Z']];
}

export function drawRiver(g, world, range) {
  const { left, right, centre } = riverBanks(world, range.y0 - 2, range.y1 + 2);
  if (left.length < 2) return;
  g.path(bandPath(left, right, 0.35), TERRAIN.bank, { alpha: 0.85 });
  g.path(bandPath(left, right, 0.15), '#CDBE8E', { alpha: 0.7 });
  g.path(bandPath(left, right, 0), TERRAIN.shallows);                 // the whole river, then the channel over it,
  g.path(bandPath(left, right, -SHALLOWS_TILES), TERRAIN.water);      // leaves the shallows strip along each bank
  const { minWidth } = riverData(world); // over the whole river, so the deep band never steps at a chunk border
  const mid = smoothPath(centre);
  g.stroke(mid, TERRAIN.waterDeep, minWidth * 16 * 0.55, 0.85);
  g.stroke(mid, '#17596A', minWidth * 16 * 0.2, 0.5);
  for (const bank of [left, right]) {
    g.stroke(smoothPath(bank), TERRAIN.waterLight, 2.6, 0.7);
    g.stroke(smoothPath(bank), TERRAIN.foam, 1.1, 0.75);
  }
  const spans = riverSpans(world);
  for (let y = Math.max(0, range.y0); y <= Math.min(world.size - 1, range.y1); y++) {
    const s = spans[y];
    if (!s) continue;
    for (let x = s[0]; x <= s[1]; x++) {
      for (let j = 0; j < 2; j++) {
        const q = p(x + 0.15 + hash2(x, y, 11 + j) * 0.7, y + 0.15 + hash2(x, y, 21 + j) * 0.7);
        g.stroke([['M', q], ['Q', [q[0] + 3, q[1] - 1.4], [q[0] + 6, q[1]]]], TERRAIN.ripple, 0.7, 0.65);
      }
    }
    const w = wobble(y);
    for (let j = 0; j < 2; j++) {
      const t = 0.15 + hash2(y, j, world.seed) * 0.7;
      if (hash2(y, j + 4, world.seed) > 0.35) reeds(g, p(s[0] - 0.12 + w, y + t));
      if (hash2(y, j + 8, world.seed) > 0.35) reeds(g, p(s[1] + 1.12 + w, y + t));
    }
  }
}
