// The river as one smooth band (spec 5.2): wet-sand fringe, water with a deep centre and light shallows,
// a foam line, ripples and reeds. Mapgen gives one contiguous span of WATER per row, so the banks are
// curves through the row spans with the mock-up's gentle sine wobble.
import { p } from './iso.js';
import { hash2 } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';
import { TERRAIN } from './art/palette.js';
import { reeds } from './art/nature.js';

const spanCache = new WeakMap(); // world -> spans; terrain never changes in Stage 1

export function riverSpans(world) {
  let spans = spanCache.get(world);
  if (spans) return spans;
  spans = [];
  for (let y = 0; y < world.size; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < world.size; x++) {
      if (world.terrain[idx(world.size, x, y)] === T.WATER) { if (a < 0) a = x; b = x; }
    }
    spans.push(a < 0 ? null : [a, b]);
  }
  spanCache.set(world, spans);
  return spans;
}

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
  g.path(bandPath(left, right, 0), TERRAIN.water);
  const minWidth = Math.min(...centre.map((c) => c[2]));
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
