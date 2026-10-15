// Trees and ground decoration, ported from the approved mock-up. Trees are drawn at a tile point (the
// centre of their tile) and draw their own soft ground shadow.
import { p, U, hs } from './primitives.js';
import { SHADOW, LEAF, LEAF2, LEAF3, TRUNK, TRUNK_RING } from './palette.js';
import { AMBIENT } from '../../data/ambient.js';

export function palmAt(g, gx, gy, sc = 1, z = 0) {
  const c = U(p(gx, gy), z);
  g.ell([c[0] + 5 * sc, c[1]], 8 * sc, 2.8 * sc, SHADOW, { alpha: 0.14 });
  const t = [c[0] + 3 * sc, c[1] - 20 * sc], c1 = [c[0] - 2 * sc, c[1] - 10 * sc];
  g.path([
    ['M', [c[0] - 1.3 * sc, c[1]]], ['Q', [c1[0] - 0.8 * sc, c1[1]], [t[0] - 0.9 * sc, t[1]]],
    ['L', [t[0] + 0.9 * sc, t[1]]], ['Q', [c1[0] + 0.8 * sc, c1[1]], [c[0] + 1.3 * sc, c[1]]], ['Z'],
  ], TRUNK);
  for (let s = 0.12; s < 0.95; s += 0.11) {
    const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, d = s * s;
    const bx = a * c[0] + b * c1[0] + d * t[0], by = a * c[1] + b * c1[1] + d * t[1];
    g.line([bx - 1.1 * sc, by], [bx + 1.1 * sc, by + 0.4 * sc], TRUNK_RING, 0.5 * sc);
  }
  const fronds = [[-165, LEAF3, 1], [-128, LEAF, 1.05], [-92, LEAF2, 0.75], [-55, LEAF, 1.05], [-15, LEAF3, 1], [25, LEAF2, 0.95], [155, LEAF2, 0.95], [118, LEAF, 0.85], [72, LEAF3, 0.8]];
  for (const [a, cl, L] of fronds) {
    const ca = Math.cos((a * Math.PI) / 180), sa = Math.sin((a * Math.PI) / 180), len = 11 * sc * L;
    const e = [t[0] + ca * len, t[1] + sa * len * 0.5 + 4 * sc * Math.abs(ca)];
    const m = [t[0] + ca * len * 0.55, t[1] + sa * len * 0.3 - 2.2 * sc];
    const nx = -sa * 1.1 * sc, ny = ca * 1.9 * sc;
    g.path([['M', t], ['Q', [m[0] + nx, m[1] + ny], e], ['Q', [m[0] - nx, m[1] - ny], t], ['Z']], cl);
    g.stroke([['M', t], ['Q', m, e]], '#2C5A1E', 0.5 * sc, 0.5);
  }
  g.circ([t[0] - 0.9 * sc, t[1] + 1.5 * sc], 1.1 * sc, '#6B4A2A');
  g.circ([t[0] + 1.1 * sc, t[1] + 1.7 * sc], 1.1 * sc, '#6B4A2A');
}

export function acacia(g, gx, gy) {
  const c = p(gx, gy);
  g.ell([c[0] + 7, c[1] + 1], 12, 3.5, SHADOW, { alpha: 0.13 });
  g.stroke([['M', c], ['L', [c[0] + 0.5, c[1] - 7]], ['L', [c[0] - 5, c[1] - 12]], ['M', [c[0] + 0.5, c[1] - 7]], ['L', [c[0] + 6, c[1] - 12.5]]], '#6B4F3A', 1.4);
  g.ell([c[0], c[1] - 13.5], 12, 3.6, '#4F7E2E');
  g.ell([c[0] - 1, c[1] - 14.6], 10, 2.8, '#62963A');
  g.ell([c[0] + 2, c[1] - 15.3], 6, 1.8, '#86B64E');
}

export function reeds(g, q) {
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 1.2, hh = 5 + hs(q[0], q[1], i) * 4;
    g.line([q[0] + dx, q[1]], [q[0] + dx * 1.6, q[1] - hh], i % 2 ? '#4F8A2E' : '#6AA83A', 0.8);
    if (i % 2 === 0) g.ell([q[0] + dx * 1.6, q[1] - hh - 1], 1.1, 1.8, '#9CC45A');
  }
}

export function rock(g, c) {
  g.poly([[c[0] - 4, c[1]], [c[0] - 2.4, c[1] - 3], [c[0] + 1.8, c[1] - 3.6], [c[0] + 4.4, c[1] - 1], [c[0] + 3, c[1] + 1.4], [c[0] - 2, c[1] + 1.5]], '#B39C82', { outline: true });
  g.poly([[c[0] - 2.2, c[1] - 2.6], [c[0] + 1.8, c[1] - 3.2], [c[0] + 3, c[1] - 1.4], [c[0] - 1, c[1] - 1]], '#D9C7A8');
}

export function scrub(g, c) {
  g.ell([c[0] + 3, c[1] + 0.5], 5, 1.5, SHADOW, { alpha: 0.1 });
  g.circ([c[0] - 2, c[1] - 1.2], 2.4, '#5E8A34');
  g.circ([c[0] + 1.5, c[1] - 2.2], 2.6, '#72A040');
  g.circ([c[0] + 0.4, c[1] - 0.2], 2, '#4F7A2C');
  g.circ([c[0] + 1, c[1] - 3], 1, '#9CC45A');
}

// A dry shrub (Stage 4.7 Task 3b): the drab olive-grey bush of open desert, away from any water, so vivid green is only ever by the water.
export function dryShrub(g, c) {
  g.ell([c[0] + 2.5, c[1] + 0.5], 4, 1.2, SHADOW, { alpha: 0.09 });
  g.circ([c[0] - 1.6, c[1] - 0.9], 1.9, '#8A8760');
  g.circ([c[0] + 1.2, c[1] - 1.6], 2.1, '#9A9672');
  g.circ([c[0] + 0.3, c[1] - 0.1], 1.6, '#7C7A58');
}

export function dune(g, c) {
  g.stroke([['M', [c[0] - 9, c[1] + 1]], ['Q', [c[0], c[1] - 3.5], [c[0] + 9, c[1] + 1]]], '#F7EAC8', 1, 0.85);
  g.stroke([['M', [c[0] - 8, c[1] + 2.2]], ['Q', [c[0], c[1] - 1.4], [c[0] + 8, c[1] + 2.2]]], '#CDB283', 0.8, 0.45);
}

// n grass tufts scattered over tile (x, y); k salts the hash so border tufts differ from tile tufts.
export function tufts(g, x, y, n, k = 0) {
  for (let j = 0; j < n; j++) {
    const q = p(x + hs(x, y, 60 + j + k), y + hs(x, y, 70 + j + k));
    g.line(q, [q[0] - 0.8, q[1] - 3], '#4F7A2C', 0.7);
    g.line(q, [q[0] + 0.6, q[1] - 3.4], '#A6CC5E', 0.6);
    g.line(q, [q[0] + 1.4, q[1] - 2.2], '#6E9E3A', 0.6);
  }
}

export const NATURE_ART = {
  palm: { w: 1, d: 1, height: 25, bounds: [-16, -22, 20, 14], shadows: [], draw: (g, x, y) => palmAt(g, x + 0.5, y + 0.5, 1, 0) },
  acacia: { w: 1, d: 1, height: 18, bounds: [-16, -12, 22, 16], shadows: [], draw: (g, x, y) => acacia(g, x + 0.5, y + 0.5) },
};

// Lean slots for ambient sway (spec 5.6, render/ambient.js treeSlot): each tree again, leant k steps of
// AMBIENT.treeSwayDeg / AMBIENT.treeLeanSteps degrees about the foot of its trunk (k from -steps to steps, not 0).
function leant(draw, deg) {
  return (g, x, y) => {
    const base = p(x + 0.5, y + 0.5), a = (deg * Math.PI) / 180, s = g.scale;
    g.save();
    g.ctx.translate(base[0] * s, base[1] * s);
    g.ctx.rotate(a);
    g.ctx.translate(-base[0] * s, -base[1] * s);
    draw(g, x, y);
    g.restore();
  };
}
for (const slot of ['palm', 'acacia']) {
  const def = NATURE_ART[slot], [l, t, r, b] = def.bounds;
  for (let k = -AMBIENT.treeLeanSteps; k <= AMBIENT.treeLeanSteps; k++) {
    if (k) NATURE_ART[`${slot}.l${k}`] = { ...def, bounds: [l - 2, t - 1, r + 2, b], draw: leant(def.draw, (k * AMBIENT.treeSwayDeg) / AMBIENT.treeLeanSteps) };
  }
}
