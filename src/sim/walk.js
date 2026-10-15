// Walking paths over passable land (Stage 4.7, Task 3, ruling 472). The one shared walk for figures that go where they like rather than along
// the roads: a hunting lodge's hunters (render/wildlife.js) and the foot soldiers and archers (combat.js). It answers over the shared passable rule
// (src/sim/terrain.js: open land and bridges, never water or hills), so a walker goes round the river and round hills, and over a bridge.
//
// findPath is A* over the tile grid, 8 directions (a diagonal step only when both tiles beside it are passable: no cutting a corner), octile
// distance, ties broken by tile index, so a path is a function of the terrain, the roads and the two ends alone (the sim stays deterministic:
// no draws, no clocks). walkPath turns it into a polyline of points in tile coordinates, pulled straight wherever the line between two points
// keeps clear of anything impassable, so across open ground the path is the straight line it always was. Occupancy (buildings, walls) is not
// asked: the walkers it serves have always walked through the city; only the ground bars them.
import { passable } from './terrain.js';
import { idx, inBounds } from './grid.js';

const SQRT2 = Math.SQRT2;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];   // a fixed order, so a tie always breaks the same way
export const WALK = {
  expand: 4000,       // the most tiles one search looks at before giving up (null: no path)
  clear: 0.28,        // how far (tiles) a smoothed line keeps from an impassable tile at either side
  step: 0.2,          // tiles between the samples of that check
  snap: 3,            // how far (tiles) an end on impassable ground looks for the nearest passable tile
  look: 40,           // how many path points ahead the straightening looks
};

const tileOf = (world, x, y) => idx(world.size, Math.floor(x), Math.floor(y));
const okAt = (world, x, y) => inBounds(world.size, Math.floor(x), Math.floor(y)) && passable(world, tileOf(world, x, y));

// The nearest passable tile to point (x, y) within WALK.snap tiles, by ring and then by row and column; the point's own tile first.
export function nearestPassable(world, x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  for (let r = 0; r <= WALK.snap; r++) {
    let best = null;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !inBounds(world.size, tx + dx, ty + dy) || !passable(world, idx(world.size, tx + dx, ty + dy))) continue;
        const d = Math.hypot(tx + dx + 0.5 - x, ty + dy + 0.5 - y);
        if (!best || d < best.d - 1e-9) best = { x: tx + dx, y: ty + dy, d };
      }
    }
    if (best) return best;
  }
  return null;
}

// The tile path from tile a to tile b (indices) as an array of tile indices, a first and b last, or null (no way over passable ground, or more than
// WALK.expand tiles to look at).
export function findPath(world, a, b) {
  const n = world.size;
  if (a === b) return [a];
  const bx = b % n, by = (b - bx) / n;
  const g = new Float32Array(n * n).fill(Infinity), from = new Int32Array(n * n).fill(-1), done = new Uint8Array(n * n);
  const heap = [];   // [f, h, tile], a binary min-heap ordered by f, then h, then tile
  const less = (p, q) => p[0] < q[0] - 1e-9 || (Math.abs(p[0] - q[0]) <= 1e-9 && (p[1] < q[1] - 1e-9 || (Math.abs(p[1] - q[1]) <= 1e-9 && p[2] < q[2])));
  const push = (e) => {
    heap.push(e);
    for (let i = heap.length - 1; i > 0;) { const up = (i - 1) >> 1; if (!less(heap[i], heap[up])) break; [heap[i], heap[up]] = [heap[up], heap[i]]; i = up; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]];
        i = m;
      }
    }
    return top;
  };
  const h = (i) => { const dx = Math.abs((i % n) - bx), dy = Math.abs(Math.floor(i / n) - by); return dx + dy + (SQRT2 - 2) * Math.min(dx, dy); };
  g[a] = 0;
  push([h(a), h(a), a]);
  for (let looked = 0; heap.length && looked < WALK.expand; looked++) {
    const cur = pop()[2];
    if (done[cur]) continue;
    done[cur] = 1;
    if (cur === b) {
      const out = [];
      for (let t = b; t !== -1; t = from[t]) out.push(t);
      return out.reverse();
    }
    const x = cur % n, y = (cur - x) / n;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(n, nx, ny)) continue;
      const t = ny * n + nx;
      if (done[t] || !passable(world, t)) continue;
      if (dx && dy && (!passable(world, y * n + nx) || !passable(world, ny * n + x))) continue;   // no cutting a corner
      const cost = g[cur] + (dx && dy ? SQRT2 : 1);
      if (cost < g[t] - 1e-9) { g[t] = cost; from[t] = cur; push([cost + h(t), h(t), t]); }
    }
  }
  return null;
}

// Whether the straight line from (ax, ay) to (bx, by) keeps to passable ground, WALK.clear tiles to either side of it.
function clearLine(world, ax, ay, bx, by) {
  const len = Math.hypot(bx - ax, by - ay), steps = Math.max(1, Math.ceil(len / WALK.step));
  const px = len ? -(by - ay) / len : 0, py = len ? (bx - ax) / len : 0, c = WALK.clear;
  for (let s = 0; s <= steps; s++) {
    const x = ax + ((bx - ax) * s) / steps, y = ay + ((by - ay) * s) / steps;
    if (!okAt(world, x, y) || !okAt(world, x + px * c, y + py * c) || !okAt(world, x - px * c, y - py * c)) return false;
  }
  return true;
}

// The polyline of a walk from point a to point b ({ x, y } in tile coordinates): [{ x, y }] from a to b, or null when no way over passable ground
// joins them. An end that stands on impassable ground (a doorstep by the water) starts from the nearest passable tile instead.
export function walkPath(world, a, b) {
  const sa = nearestPassable(world, a.x, a.y), sb = nearestPassable(world, b.x, b.y);
  if (!sa || !sb) return null;
  const tiles = findPath(world, idx(world.size, sa.x, sa.y), idx(world.size, sb.x, sb.y));
  if (!tiles) return null;
  const pts = tiles.map((t) => ({ x: (t % world.size) + 0.5, y: Math.floor(t / world.size) + 0.5 }));
  pts[0] = { x: a.x, y: a.y };
  if (okAt(world, b.x, b.y)) pts[pts.length - 1] = { x: b.x, y: b.y };
  else pts.push({ x: b.x, y: b.y });
  // pull it straight: from each anchor, the farthest later point the line to which stays on clear ground (the ends are always kept)
  const out = [pts[0]];
  let at = 0;
  while (at < pts.length - 1) {
    let far = at + 1;
    for (let j = Math.min(pts.length - 1, at + WALK.look); j > at + 1; j--) if (clearLine(world, pts[at].x, pts[at].y, pts[j].x, pts[j].y)) { far = j; break; }
    out.push(pts[far]);
    at = far;
  }
  return out;
}

// Cumulative lengths of a polyline: [0, ...]; the last is the path's length.
export function pathLengths(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return cum;
}

// The point s tiles along a polyline (clamped to its ends) and the direction of the leg it is on: { x, y, dx, dy }.
export function pointAlong(pts, cum, s) {
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, dx: 1, dy: 0 };
  let i = 1;
  while (i < pts.length - 1 && cum[i] < s) i++;
  const a = pts[i - 1], b = pts[i], span = cum[i] - cum[i - 1] || 1;
  const k = Math.min(1, Math.max(0, (s - cum[i - 1]) / span));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dx: b.x - a.x, dy: b.y - a.y };
}
