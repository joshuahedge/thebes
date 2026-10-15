// Rock belts (Stage 4.7, Task 3b). On every map with new land (src/data/s47.js newLandFor) the rocky ground lies in a few long, narrow belts, not round
// patches: each a bent line of rock 20-40 tiles long and 3-5 wide in the body, narrowing to a point at both ends, running roughly the way the river does.
// Mines stand on it (rocky ground is open ground), and the hills (src/sim/hills.js) are the highest stretches of a belt's middle. The draws are createRng
// streams keyed by the seed with S47_SALT.belts and hash2 for the edge noise, never the generator's rng, so a map is still a function of (seed, size, layout).
//
// A belt is a centreline of points half a tile apart ([x, y, width]); the tiles within half its width of the line (the edge wavering by noise) turn
// rocky, but only open desert that keeps its distances: BELTS.fromWater from any water, fromStart from the start area's centre, fromEdge from the edge, and
// the layout's rock x ranges (a layout keeps its character). A belt must hold BELTS.minLen tiles of such line (it is cut where the line leaves them) and keeps
// BELTS.apart tiles from another belt's line; belts are tried until the map holds BELTS.area x its area of rocky tiles (at most BELTS.extra more than the count).
import { createRng, hash2, valueNoise } from './rng.js';
import { T } from './terrain.js';
import { idx, inBounds } from './grid.js';
import { areaScale, MAP } from '../data/map.js';
import { BELTS, S47_SALT } from '../data/s47.js';

const STEP = 0.5;   // tiles between two points of a centreline
const smooth = (t) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

// How many belts a map of this size draws: [min, max] (BELTS.count scaled by the map's area, at least one).
export function beltRange(size) {
  const as = areaScale(size), lo = Math.max(1, Math.round(BELTS.count[0] * as));
  return [lo, Math.max(lo, Math.round(BELTS.count[1] * as))];
}

// Chebyshev tiles from the nearest source tile (255 where there is none), one breadth-first pass. sources: tile indices.
function distFrom(size, sources) {
  const d = new Uint8Array(size * size).fill(255), queue = [];
  for (const i of sources) { d[i] = 0; queue.push(i); }
  for (let k = 0; k < queue.length; k++) {
    const x = queue[k] % size, y = (queue[k] - x) / size;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || !inBounds(size, x + dx, y + dy)) continue;
      const n = (y + dy) * size + x + dx;
      if (d[n] > d[queue[k]] + 1) { d[n] = d[queue[k]] + 1; queue.push(n); }
    }
  }
  return d;
}

// Places the belts on `terrain` in place and returns { belts, made }: belts = [{ x, y, len, line: [[x, y, w]] }] (the middle point, the length in tiles, the
// centreline) and made = rocky tiles laid. ctx: focus (the start area's centre), ranges: [[x0, x1]] the layout's rock x ranges, oases: [{ x, y, r }] as placed
// (a belt keeps BELTS.fromOasis tiles from a pool, so an oasis keeps its rock-free 8 tiles) and startRoad: [[x, y]] (a belt keeps BELTS.fromRoad off it). Belts are
// placed after the oases (they are the bigger thing and must give way to them), so they read the finished water.
export function placeBelts(terrain, size, seed, { focus, ranges, oases = [], startRoad = [] }) {
  const rng = createRng((seed ^ S47_SALT.belts) >>> 0), salt = (seed + S47_SALT.belts) | 0;
  const as = areaScale(size), [lo, hi] = beltRange(size), count = lo + rng.int(hi - lo + 1);
  const target = Math.round(BELTS.area * as), scale = size / MAP.size;
  const water = [], pools = [];
  for (let i = 0; i < terrain.length; i++) {
    if (terrain[i] !== T.WATER) continue;
    water.push(i);
    const x = i % size, y = (i - x) / size;
    if (oases.some((o) => Math.hypot(x - o.x, y - o.y) <= o.r)) pools.push(i);
  }
  const wd = distFrom(size, water), pd = distFrom(size, pools), rd = distFrom(size, startRoad.map(([x, y]) => idx(size, x, y)));
  const clear = (i) => wd[i] > BELTS.fromWater && pd[i] >= BELTS.fromOasis && rd[i] >= BELTS.fromRoad;
  let spread = 0;   // tiles the layout's x ranges are widened by: 0 until a map would be left with too little rock (below)
  const inRange = (x) => ranges.some(([x0, x1]) => x >= x0 - spread && x <= x1 + spread);
  const edge = (x, y) => Math.min(x, y, size - 1 - x, size - 1 - y);
  // a point of the line is usable when its tile is open desert that keeps the distances (the line may run over a tile that is not, as the width does)
  const usable = (px, py) => {
    const x = Math.floor(px), y = Math.floor(py);
    if (!inBounds(size, x, y) || !inRange(x) || edge(x, y) < BELTS.fromEdge + 1) return false;
    return terrain[idx(size, x, y)] === T.DESERT && clear(idx(size, x, y)) && wd[idx(size, x, y)] > BELTS.fromWater + 1 && Math.hypot(x + 0.5 - focus.x, y + 0.5 - focus.y) >= BELTS.fromStart + 2;
  };
  const belts = [];
  let made = 0;
  const apartFromBelts = (line) => belts.every((b) => line.every(([x, y], n) => n % 4 || b.line.every(([bx, by], m) => m % 4 || Math.hypot(x - bx, y - by) >= BELTS.apart)));
  const total = count + BELTS.extra;
  const lay = (k, ri) => {   // tries to lay belt k in range ri; true when it did
    const [x0, x1] = ranges[ri].map((v, j) => v + (j ? spread : -spread));
    for (let t = 0; t < BELTS.tries; t++) {
      const u = (j) => hash2(k * 7919 + t, j, salt);
      const len = (BELTS.length[0] + u(3) * (BELTS.length[1] - BELTS.length[0])) * Math.max(0.75, scale);
      const heading = (u(4) - 0.5) * 2 * BELTS.slant;   // radians off the +y line (the way the river runs)
      const reach = Math.min(size / 2 - 4, (len / 2) * Math.cos(heading) + 3);   // the middle is drawn far enough from the edges for the whole belt to fit
      const sx = x0 + 2 + u(1) * Math.max(1, x1 - x0 - 3), sy = reach + u(2) * (size - 2 * reach);
      if (!usable(sx, sy)) continue;
      const bend = (s) => heading + (valueNoise(s * 0.5 + 40 * k, 7 + t, salt, 5) - 0.5) * 2 * BELTS.bend;
      // walk both ways from the start, each as far as the points stay usable and the length allows
      const walk = (sign) => {
        const pts = [];
        let x = sx, y = sy;
        for (let s = 0; s < len / 2; s += STEP) {
          const a = bend(sign * s);
          x += sign * Math.sin(a) * STEP; y += sign * Math.cos(a) * STEP;
          if (!usable(x, y)) break;
          pts.push([x, y]);
        }
        return pts;
      };
      const back = walk(-1), fwd = walk(1);
      const path = [...back.reverse(), [sx, sy], ...fwd];
      const length = (path.length - 1) * STEP;
      if (length < BELTS.minLen * Math.max(0.75, scale)) continue;
      const W = BELTS.width[0] + u(5) * (BELTS.width[1] - BELTS.width[0]);
      const line = path.map(([x, y], n) => {
        const s = n * STEP, fromEnd = Math.min(s, length - s);
        const pulse = (valueNoise(s * 0.35, k * 13 + t, salt + 1, 3) - 0.5) * 2 * BELTS.pulse;
        return [x, y, Math.max(1, (W + pulse) * (0.22 + 0.78 * smooth(fromEnd / BELTS.taper)))];
      });
      if (!apartFromBelts(line)) continue;
      let laid = 0;
      for (const [px, py, w] of line) {
        const r = w / 2 + 0.7;
        for (let y = Math.floor(py - r); y <= Math.ceil(py + r); y++) {
          for (let x = Math.floor(px - r); x <= Math.ceil(px + r); x++) {
            if (!inBounds(size, x, y) || !inRange(x) || edge(x, y) < BELTS.fromEdge) continue;
            const i = idx(size, x, y);
            if (terrain[i] !== T.DESERT || !clear(i) || Math.hypot(x + 0.5 - focus.x, y + 0.5 - focus.y) < BELTS.fromStart) continue;
            if (Math.hypot(x + 0.5 - px, y + 0.5 - py) <= w / 2 + (valueNoise(x, y, seed + 31, 2.5) - 0.5) * 0.9) { terrain[i] = T.ROCKY; laid++; }
          }
        }
      }
      belts.push({ x: Math.round(sx), y: Math.round(sy), len: Math.round(length), line });
      made += laid;
      return true;
    }
    return false;
  };
  for (let k = 0; k < total + 2 && (k < count || made < target * 0.9); k++) {
    if (k === total && made < target * BELTS.least) spread = BELTS.spread;   // a map the ranges leave short of rock widens them for its last tries
    if (k >= total && made >= target * BELTS.least) break;
    lay(k, k % ranges.length);
  }
  // a layout with two rock ranges keeps a belt in each (its character: rock on both sides of the river), widening the range for it if it must
  const spread0 = spread;
  for (let ri = 0; ri < ranges.length; ri++) {
    const held = () => belts.some((b) => b.x >= ranges[ri][0] - BELTS.spread && b.x <= ranges[ri][1] + BELTS.spread);
    if (held()) continue;
    spread = 0;
    if (!lay(total + 2 + ri, ri)) { spread = BELTS.spread; lay(total + 2 + ri + ranges.length, ri); }
  }
  spread = spread0;
  return { belts, made };
}
