// Version 7.1.1 (fix batch C, rulings 1044 and 1120): a walker or cart crossing a running ferry is drawn over the crossing's own time. The sim counts a
// ferry as one step of crossingTiles(water) road tiles (src/sim/ferries.js ferryEdges: a link from a road tile on one bank to one on the other); a path
// drawn with every step the same length would jump that step in a tile's time. hopCum gives the time-weighted position of each step so the picture
// takes as long over the water as the sim does. A path with no ferry step returns null, and every caller then draws exactly as before.
import { ferryEdges } from '../sim/ferries.js';

const cache = new WeakMap();   // path array -> { edges, cum }

// The cumulative cost along `list` (n points, each a tile: toIdx(point) is its tile index): cum[i] is the cost of reaching point i from point 0 and
// cum[n - 1] the whole path's. With wrap (a loop that walks round and round) cum[n] adds the step from the last point back to the first.
// null when no step of it is a ferry hop (the common case, and always while no ferry runs).
export function hopCum(world, list, toIdx, wrap = false) {
  const edges = ferryEdges(world);
  if (!edges.size) return null;
  const hit = cache.get(list);
  if (hit && hit.edges === edges && hit.wrap === wrap) return hit.cum;
  const n = list.length, size = world.size, steps = wrap ? n : n - 1, cum = [0];
  let any = false;
  for (let i = 0; i < steps; i++) {
    const a = toIdx(list[i]), b = toIdx(list[(i + 1) % n]);
    let cost = 1;
    if (Math.abs((a % size) - (b % size)) + Math.abs(Math.floor(a / size) - Math.floor(b / size)) > 1) {
      const e = (edges.get(a) || []).find((l) => l.to === b);
      if (e) { cost = e.cost; any = true; }
    }
    cum.push(cum[i] + cost);
  }
  const out = any ? cum : null;
  cache.set(list, { edges, wrap, cum: out });
  return out;
}

// The step a cost distance d falls in on a path with cumulative costs cum (steps 0..steps-1), and how far through it: { i, k } with k in 0..1.
export function stepAt(cum, d) {
  const steps = cum.length - 1;
  let i = 0;
  while (i < steps - 1 && cum[i + 1] <= d) i++;
  return { i, k: Math.min(1, Math.max(0, (d - cum[i]) / (cum[i + 1] - cum[i]))) };
}
