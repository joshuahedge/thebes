// Version 6.0, Track B1 (ruling 686): the plague on the Health layer, drawn from the world's own state (src/sim/plague.js), so it survives a reload.
// Shapes, never colour alone: a sick home carries a heavy ring with a cross in it (over the layer's own ring or dot), and a quarantined district is
// edged with a dashed line all round. src/render/overlays.js drawHomeRisk calls drawPlague for the Health layer only. Still at every Motion level.
import { p, U } from './iso.js';
import { INK, UI } from './art/palette.js';
import { sickHomes, quarantines, districtOf } from '../sim/plague.js';

export const PLAGUE_HUE = '#8E1B3A';
export const QUARANTINE_DASH = { on: 0.5, off: 0.5 };   // tiles of line and of gap along a district's edge

const inRange = (b, r) => !r || (b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0);

// The art points of a district's edge: its four sides as [from, to] tile corners, drawn as dashes of QUARANTINE_DASH along each (on the ground).
export function districtEdge(d) {
  const x0 = d.x0, y0 = d.y0, x1 = d.x1 + 1, y1 = d.y1 + 1;
  return [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
}

// Each dash of a district's edge as a [from, to] pair of art points, in order: the tests count them, the draw strokes them.
export function dashesOf(d, size = Infinity) {
  const out = [];
  for (const [[ax, ay], [bx, by]] of districtEdge(d)) {
    const len = Math.max(Math.abs(bx - ax), Math.abs(by - ay)), sx = Math.sign(bx - ax), sy = Math.sign(by - ay);
    const step = QUARANTINE_DASH.on + QUARANTINE_DASH.off;
    for (let t = 0; t < len; t += step) {
      const e = Math.min(len, t + QUARANTINE_DASH.on);
      const a = [ax + sx * t, ay + sy * t], b = [ax + sx * e, ay + sy * e];
      if (a[0] > size || a[1] > size || b[0] > size || b[1] > size) continue;
      out.push([p(a[0], a[1]), p(b[0], b[1])]);
    }
  }
  return out;
}

// A sick home's mark: a white halo ring, a heavy ring in the plague's crimson and a cross inside, over the home's centre.
export function drawPlague(g, world, range = null) {
  if (!world.hazards || !world.hazards.plague.active) return;
  for (const q of quarantines(world).values()) {
    for (const [a, b] of dashesOf(districtOf(q.key), world.size)) { g.line(a, b, UI.halo, 2.4, 0.9); g.line(a, b, PLAGUE_HUE, 1.3); }
  }
  for (const b of sickHomes(world)) {
    if (!inRange(b, range)) continue;
    const c = U(p(b.x + b.w / 2, b.y + b.d / 2), 6), r = 6.4;
    g.circ(c, r + 1.6, 'none', { stroke: UI.halo, strokeWidth: 3.2, strokeAlpha: 0.95 });
    g.circ(c, r, 'none', { stroke: INK, strokeWidth: 3, strokeAlpha: 0.7 });
    g.circ(c, r, 'none', { stroke: PLAGUE_HUE, strokeWidth: 2 });
    const k = r * 0.55;
    g.line([c[0] - k, c[1]], [c[0] + k, c[1]], PLAGUE_HUE, 1.7);
    g.line([c[0], c[1] - k], [c[0], c[1] + k], PLAGUE_HUE, 1.7);
  }
}
