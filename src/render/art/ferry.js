// Version 7.1, Track F: the art of ferries (rulings 1040-1059): the landing (1x1) and the ferry boat that crosses between two of them. This file
// is the registry's FERRY_ART (src/render/art/registry.js spreads it into ART): slot 'ferry_landing', and 'fig.ferry_boat' with a left-facing
// 'fig.ferry_boat_l' (the same drawing mirrored) for src/render/ferries.js's walker.
//
// The house style: weathered planks, rope and reed, white-washed stone; the Services category's blue pennant. The boat is told from a trade boat by
// its shape (a flat, open barge with a standing ferryman and his pole, no mast or sail), never by colour.
import { box, crs, p, U, quad } from './primitives.js';
import { pennant } from './services.js';
import { WOOD, WASH, SHADOW, TERRAIN, BLUE, STONE } from './palette.js';
import { boundsFor } from '../iso.js';
import { FERRY_LANDING } from '../../data/ferries.js';

const PLANK = ['#C9A36B', '#B58A56', '#8D6A44'];
const REED = ['#D9C27A', '#C4A95E', '#9C8450'];
const ROPE = '#B99A66';
export const FERRY_HEIGHT = 14;   // the shed's roof (the pennant rises above, inside the bounds' margin)

// A landing: a plank jetty at the water's edge with mooring posts, a small reed-roofed ferryman's shed on a stone footing, a coil of rope and a
// blue pennant. It reads the same whichever bank it stands on (it does not turn).
export function ferryLanding(g, x, y) {
  // the jetty, low, along the front
  const J = box(g, x + 0.06, y + 0.52, 0.88, 0.42, 1.4, 0, PLANK);
  for (let u = 0.14; u < 1; u += 0.18) g.line(J.L(u, 0.1), J.L(u, 1.3), PLANK[2], 0.4, 0.7);
  // two mooring posts with a rope between them
  for (const u of [0.16, 0.84]) { const q = U(p(x + u, y + 0.88), 1.4); g.line(q, U(q, 4.2), WOOD, 1.3); g.ell(U(q, 4.2), 0.85, 0.42, PLANK[2]); }
  g.stroke([['M', U(p(x + 0.16, y + 0.88), 5)], ['Q', U(p(x + 0.5, y + 0.92), 3), U(p(x + 0.84, y + 0.88), 5)]], ROPE, 0.5);
  // the shed on a stone footing at the back
  const S = box(g, x + 0.14, y + 0.08, 0.5, 0.42, 1.2, 0, STONE);
  crs(g, S, 1.2, '#B9AEBF', 1.2);
  const H = box(g, x + 0.18, y + 0.12, 0.42, 0.34, 5, 1.2, WASH);
  crs(g, H, 5, '#C4B8CC', 2.5);
  g.poly([U(p(x + 0.1, y + 0.04), 8.4), U(p(x + 0.68, y + 0.04), 8.4), U(p(x + 0.68, y + 0.5), 8.4), U(p(x + 0.1, y + 0.5), 8.4)], REED[0], { outline: true });
  g.poly(quad(x + 0.1, y + 0.04, 0.58, 0.46, 7.4), REED[1], { alpha: 0.5 });
  // a coil of rope and a pole against the shed
  g.ell(U(p(x + 0.78, y + 0.34), 0.6), 2.4, 1.2, ROPE, { outline: true });
  g.line(U(p(x + 0.9, y + 0.2), 0), U(p(x + 0.9, y + 0.2), 11), WOOD, 0.8);
  pennant(g, U(p(x + 0.9, y + 0.2), 11), 5, BLUE);
}

// ── The boat ──
const at = (gx, gy) => p(gx, gy);
function facing(g, X, left) {
  if (!left) return g;
  const f = (q) => [2 * X - q[0], q[1]];
  const segs = (list) => list.map((sg) => [sg[0], ...sg.slice(1).map(f)]);
  return {
    ...g, poly: (pts, ...r) => g.poly(pts.map(f), ...r), ell: (q, ...r) => g.ell(f(q), ...r), circ: (q, ...r) => g.circ(f(q), ...r),
    line: (a, b, ...r) => g.line(f(a), f(b), ...r), stroke: (sg, ...r) => g.stroke(segs(sg), ...r), path: (sg, ...r) => g.path(segs(sg), ...r),
  };
}

// A ferry heading right: a flat planked barge with low rails, a ferryman at the stern leaning on his long pole and two passengers with bundles.
export function ferryBoat(g0, gx, gy, left = false) {
  const [X, Y] = at(gx, gy), g = facing(g0, X, left);
  g.ell([X, Y + 0.6], 12, 3, TERRAIN.foam, { alpha: 0.4 });
  for (const k of [1, 2]) g.ell([X - 11 - k * 3, Y + 0.4], 2.4 + k, 0.8 + k * 0.2, TERRAIN.foam, { alpha: 0.38 - k * 0.1 });   // the wake
  g.path([['M', [X - 11, Y - 3.4]], ['Q', [X - 8, Y + 1.8], [X, Y + 1.8]], ['Q', [X + 8, Y + 1.8], [X + 11.6, Y - 3.4]],
    ['L', [X + 10.6, Y - 4.4]], ['Q', [X + 6, Y - 1.4], [X, Y - 1.4]], ['Q', [X - 7, Y - 1.4], [X - 10.4, Y - 4.4]], ['Z']], PLANK[0], { outline: true });
  g.line([X - 10.4, Y - 3.8], [X + 10.8, Y - 3.8], PLANK[2], 0.6, 0.9);                                                        // the rail
  for (const dx of [-8, -3, 2, 7]) { g.line([X + dx, Y + 1.2], [X + dx + 0.2, Y - 1.2], PLANK[1], 0.5); g.line([X + dx, Y - 3.8], [X + dx, Y - 6], PLANK[2], 0.6); }
  g.line([X - 10.4, Y - 6], [X + 10.8, Y - 6], PLANK[2], 0.5, 0.9);
  // two passengers: a head, a robe and a bundle
  for (const [dx, robe] of [[2.6, '#F7F2E8'], [6, '#D9C27A']]) {
    g.poly([[X + dx - 1.6, Y - 1.8], [X + dx + 1.6, Y - 1.8], [X + dx + 1.3, Y - 5.6], [X + dx - 1.3, Y - 5.6]], robe, { outline: true });
    g.circ([X + dx, Y - 7], 1.4, '#1E150E'); g.circ([X + dx + 0.3, Y - 6.6], 1.1, '#A0663F');
  }
  g.ell([X - 0.4, Y - 2.8], 1.8, 1.4, REED[0], { outline: true });
  // the ferryman at the stern with his pole
  const sx = X - 7.6, sy = Y - 1.8;
  g.poly([[sx - 1.6, sy], [sx + 1.6, sy], [sx + 1.3, sy - 4], [sx - 1.3, sy - 4]], '#F7F2E8', { outline: true });
  g.poly([[sx - 1.3, sy - 4], [sx + 1.3, sy - 4], [sx + 1.5, sy - 6.6], [sx - 1.5, sy - 6.6]], BLUE);
  g.circ([sx, sy - 8.2], 1.5, '#1E150E'); g.circ([sx + 0.3, sy - 7.8], 1.2, '#A0663F');
  g.line([sx + 1.2, sy - 7], [sx - 4.6, Y + 3.4], WOOD, 0.8);                                                                  // the pole, down into the water
}

const UNIT = (h, wide = 14) => ({ w: 0, d: 0, height: h, bounds: [-wide - 4, -h - 12, wide + 4, 8], shadows: [] });
export const FERRY_ART = {
  [FERRY_LANDING]: { w: 1, d: 1, height: FERRY_HEIGHT, bounds: boundsFor(1, 1, FERRY_HEIGHT, 14), shadows: [[0.1, 0.06, 0.6, 0.46, 8]], draw: ferryLanding },
  'fig.ferry_boat': { ...UNIT(14, 20), draw: (g, x, y) => ferryBoat(g, x, y, false) },
  'fig.ferry_boat_l': { ...UNIT(14, 20), draw: (g, x, y) => ferryBoat(g, x, y, true) },
};
