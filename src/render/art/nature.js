// Trees and ground decoration, ported from the approved mock-up. Trees are drawn at a tile point (the
// centre of their tile) and draw their own soft ground shadow.
import { p, U, hs } from './primitives.js';
import { SHADOW, LEAF, LEAF2, LEAF3, TRUNK, TRUNK_RING, INK } from './palette.js';
import { AMBIENT } from '../../data/ambient.js';

export function palmAt(g, gx, gy, sc = 1, z = 0) {
  const c = U(p(gx, gy), z);
  contactShadow(g, c, 8 * sc, 2.8 * sc, 5 * sc);                              // Version 9.3 (Track N): a soft cast shadow and a dark contact patch at the foot
  const t = [c[0] + 3 * sc, c[1] - 20 * sc], c1 = [c[0] - 2 * sc, c[1] - 10 * sc];
  g.ell([c[0], c[1] - 0.2 * sc], 2.5 * sc, 0.9 * sc, TRUNK_RING, { alpha: 0.55 });   // the swollen base
  g.path([
    ['M', [c[0] - 1.3 * sc, c[1]]], ['Q', [c1[0] - 0.8 * sc, c1[1]], [t[0] - 0.9 * sc, t[1]]],
    ['L', [t[0] + 0.9 * sc, t[1]]], ['Q', [c1[0] + 0.8 * sc, c1[1]], [c[0] + 1.3 * sc, c[1]]], ['Z'],
  ], TRUNK);
  g.stroke([['M', [c[0] - 0.7 * sc, c[1] - 0.6 * sc]], ['Q', [c1[0] - 0.5 * sc, c1[1]], [t[0] - 0.5 * sc, t[1] + 1 * sc]]], '#C79C5E', 0.55 * sc, 0.8);   // the lit side
  g.stroke([['M', [c[0] + 1 * sc, c[1] - 0.6 * sc]], ['Q', [c1[0] + 0.8 * sc, c1[1]], [t[0] + 0.8 * sc, t[1] + 1 * sc]]], TRUNK_RING, 0.55 * sc, 0.7);   // the shaded side
  for (let s = 0.12; s < 0.95; s += 0.11) {
    const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, d = s * s;
    const bx = a * c[0] + b * c1[0] + d * t[0], by = a * c[1] + b * c1[1] + d * t[1];
    g.line([bx - 1.1 * sc, by], [bx + 1.1 * sc, by + 0.4 * sc], TRUNK_RING, 0.5 * sc);
  }
  const fronds = [[-165, LEAF3, 1], [-128, LEAF, 1.05], [-92, LEAF2, 0.75], [-55, LEAF, 1.05], [-15, LEAF3, 1], [25, LEAF2, 0.95], [155, LEAF2, 0.95], [118, LEAF, 0.85], [72, LEAF3, 0.8]];
  g.ell([t[0], t[1] + 2.4 * sc], 8 * sc, 3.2 * sc, '#2C5A1E', { alpha: 0.28 });   // the crown's own shade under the fronds
  for (const [a, cl, L] of fronds) {
    const ca = Math.cos((a * Math.PI) / 180), sa = Math.sin((a * Math.PI) / 180), len = 11 * sc * L;
    const e = [t[0] + ca * len, t[1] + sa * len * 0.5 + 4 * sc * Math.abs(ca)];
    const m = [t[0] + ca * len * 0.55, t[1] + sa * len * 0.3 - 2.2 * sc];
    const nx = -sa * 1.1 * sc, ny = ca * 1.9 * sc;
    g.path([['M', t], ['Q', [m[0] + nx, m[1] + ny], e], ['Q', [m[0] - nx, m[1] - ny], t], ['Z']], cl);
    g.stroke([['M', t], ['Q', m, e]], '#2C5A1E', 0.5 * sc, 0.5);
    g.stroke([['M', [t[0] + (m[0] - t[0]) * 0.3, t[1] + (m[1] - t[1]) * 0.3 - 0.4 * sc]], ['Q', [m[0], m[1] - 0.6 * sc], [m[0] + (e[0] - m[0]) * 0.7, m[1] + (e[1] - m[1]) * 0.7 - 0.5 * sc]]], '#B7DA7A', 0.5 * sc, ca < 0 ? 0.6 : 0.3);   // the sun on the frond's upper edge
  }
  g.circ([t[0] - 0.9 * sc, t[1] + 1.5 * sc], 1.1 * sc, '#6B4A2A');
  g.circ([t[0] + 1.1 * sc, t[1] + 1.7 * sc], 1.1 * sc, '#6B4A2A');
  g.circ([t[0] + 0.1 * sc, t[1] + 2.4 * sc], 1.0 * sc, '#5A3C20');
  g.circ([t[0] - 1.2 * sc, t[1] + 1.1 * sc], 0.35 * sc, '#C79C5E', { alpha: 0.8 });   // a glint on the nuts
}

// Version 9.3 (Track N, ruling 1921): the shadow every tree and rock casts: a broad soft cast to the right, and a small dark contact patch where it
// meets the ground, so nothing floats. c is the foot, (rx, ry) the cast's size, dx how far it lies to the right.
export function contactShadow(g, c, rx, ry, dx, dark = 0.26) {
  g.ell([c[0] + dx, c[1] + 0.2], rx, ry, SHADOW, { alpha: 0.13 });
  g.ell([c[0] + dx * 0.3, c[1] + 0.2], rx * 0.5, ry * 0.7, SHADOW, { alpha: 0.1 });
  g.ell([c[0], c[1] + 0.1], Math.max(1.6, rx * 0.22), Math.max(0.6, ry * 0.32), INK, { alpha: dark });
}

export function acacia(g, gx, gy) {
  const c = p(gx, gy);
  contactShadow(g, c, 12, 3.5, 7);
  g.stroke([['M', c], ['L', [c[0] + 0.5, c[1] - 7]], ['L', [c[0] - 5, c[1] - 12]], ['M', [c[0] + 0.5, c[1] - 7]], ['L', [c[0] + 6, c[1] - 12.5]]], '#6B4F3A', 1.4);
  g.stroke([['M', [c[0] - 0.5, c[1]]], ['L', [c[0] + 0, c[1] - 7]]], '#8A6A4C', 0.5, 0.8);              // the lit side of the trunk
  g.poly([[c[0] - 2.2, c[1] + 0.3], [c[0] - 0.6, c[1] - 1.8], [c[0] + 1.6, c[1] - 1.8], [c[0] + 3, c[1] + 0.3]], '#6B4F3A');   // the flared foot
  g.ell([c[0] + 0.5, c[1] - 12.2], 11, 2.8, '#33602A', { alpha: 0.7 });                                  // the crown's own shade underneath
  g.ell([c[0], c[1] - 13.5], 12, 3.6, '#4F7E2E');
  g.ell([c[0] - 6.4, c[1] - 12.6], 5, 2, '#4F7E2E');                                                    // a lobe either side, so it is not a plain saucer
  g.ell([c[0] + 6.6, c[1] - 13], 5, 2, '#4A7829');
  g.ell([c[0] - 1, c[1] - 14.6], 10, 2.8, '#62963A');
  g.ell([c[0] + 2, c[1] - 15.3], 6, 1.8, '#86B64E');
  g.ell([c[0] - 3.4, c[1] - 15.9], 2.6, 0.8, '#A6CC6A', { alpha: 0.8 });
  g.stroke([['M', [c[0] - 11, c[1] - 13.4]], ['Q', [c[0], c[1] - 10.6], [c[0] + 11, c[1] - 13.2]]], '#2C5A1E', 0.5, 0.35);
}

export function reeds(g, q) {
  g.ell([q[0] + 0.4, q[1] + 0.3], 4.6, 1.3, SHADOW, { alpha: 0.14 });                       // the water-dark patch they stand in
  g.ell([q[0], q[1] + 0.2], 2.4, 0.7, INK, { alpha: 0.18 });
  for (let i = 0; i < 7; i++) {
    const dx = (i - 3) * 0.95, hh = 4.6 + hs(q[0], q[1], i) * 5.4, lean = (i - 3) * 0.55 + (hs(q[0], q[1], i + 9) - 0.5) * 1.2;
    g.stroke([['M', [q[0] + dx, q[1]]], ['Q', [q[0] + dx + lean * 0.4, q[1] - hh * 0.6], [q[0] + dx + lean, q[1] - hh]]], i % 2 ? '#4F8A2E' : '#6AA83A', 0.8);
    if (i % 3 === 0) g.line([q[0] + dx + lean, q[1] - hh], [q[0] + dx + lean * 1.3, q[1] - hh - 2.4], '#3F7526', 0.35);
    if (i % 2 === 0) {                                                                      // a seed head, with a lit side
      g.ell([q[0] + dx + lean, q[1] - hh - 1], 1.1, 1.9, '#8A6B3A');
      g.ell([q[0] + dx + lean - 0.3, q[1] - hh - 1.3], 0.4, 1.1, '#C9A767', { alpha: 0.8 });
    }
  }
}

export function rock(g, c) {
  g.ell([c[0] + 2.2, c[1] + 1.6], 6, 1.5, SHADOW, { alpha: 0.14 });                          // its cast shadow and the dark where it sits
  g.ell([c[0] + 0.2, c[1] + 1.5], 3.8, 0.9, INK, { alpha: 0.24 });
  g.poly([[c[0] - 4, c[1]], [c[0] - 2.4, c[1] - 3], [c[0] + 1.8, c[1] - 3.6], [c[0] + 4.4, c[1] - 1], [c[0] + 3, c[1] + 1.4], [c[0] - 2, c[1] + 1.5]], '#B39C82', { outline: true });
  g.poly([[c[0] - 2.2, c[1] - 2.6], [c[0] + 1.8, c[1] - 3.2], [c[0] + 3, c[1] - 1.4], [c[0] - 1, c[1] - 1]], '#D9C7A8');
  g.poly([[c[0] + 1.2, c[1] - 1.2], [c[0] + 4.4, c[1] - 1], [c[0] + 3, c[1] + 1.4], [c[0] + 0.4, c[1] + 1.2]], '#8E7470', { alpha: 0.55 });   // the shaded face
  g.line([c[0] - 1, c[1] - 1], [c[0] + 1.2, c[1] - 1.2], '#8E7470', 0.4, 0.6);                                                          // a facet edge
  g.line([c[0] - 2.4, c[1] - 3], [c[0] + 1.8, c[1] - 3.6], '#FFF4DC', 0.5, 0.7);
}

export function scrub(g, c) {
  g.ell([c[0] + 3, c[1] + 0.5], 5, 1.5, SHADOW, { alpha: 0.12 });
  g.ell([c[0], c[1] + 0.2], 3.4, 0.9, INK, { alpha: 0.2 });
  g.circ([c[0] - 2, c[1] - 1.2], 2.4, '#5E8A34');
  g.circ([c[0] + 1.5, c[1] - 2.2], 2.6, '#72A040');
  g.circ([c[0] + 0.4, c[1] - 0.2], 2, '#4F7A2C');
  g.circ([c[0] + 1, c[1] - 3], 1, '#9CC45A');
  g.circ([c[0] - 0.2, c[1] - 3.4], 0.7, '#B7DA7A', { alpha: 0.8 });
  g.line([c[0] - 3.6, c[1] - 0.8], [c[0] - 4.4, c[1] - 2.2], '#4F7A2C', 0.5);                // a stray twig either side
  g.line([c[0] + 3.6, c[1] - 1.4], [c[0] + 4.6, c[1] - 2.8], '#4F7A2C', 0.5);
}

// A dry shrub (Stage 4.7 Task 3b): the drab olive-grey bush of open desert, away from any water, so vivid green is only ever by the water.
export function dryShrub(g, c) {
  g.ell([c[0] + 2.5, c[1] + 0.5], 4, 1.2, SHADOW, { alpha: 0.09 });
  g.ell([c[0] + 0.2, c[1] + 0.3], 2.4, 0.6, INK, { alpha: 0.16 });                           // Version 10.0 (Track Q, ruling 2148): the dark where it sits, as every bush has
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
