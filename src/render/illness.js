// The sign of illness (Stage 4.5, ruling 318): a green-grey cloth hung over the door of every ill home, drawn from the world's own
// state (h.illness, src/sim/health.js), so it survives a reload. It is still at every Motion level (nothing sways, flashes or
// fades), so it reads under Gentle and Still as under Full: a pale cloth with a dark edge, a pole across the lintel, two folds and a
// ragged hem, wider and taller than the door so it reads at default zoom on a phone. createUI draws it inside the fire hook (opts.fire), after the sprites.
import { p, U } from './iso.js';

export const CLOTH = { fill: '#A9B8A0', fold: '#7C8E76', edge: '#4A5A48', pole: '#6B4A3A', hem: '#8E9F88' };

// Where each tier's door stands on its lit (+y) face, in tiles from the footprint's corner, and how high: from the housing art
// (src/render/art/housing.js): cx the door's middle along x, fy the face's y, hw half its width, h its height in art px.
export const DOORS = [
  null,
  { cx: 0.49, fy: 0.78, hw: 0.073, h: 3.8 },    // Hut
  { cx: 0.457, fy: 0.8, hw: 0.08, h: 4.4 },     // Shack
  { cx: 0.69, fy: 0.92, hw: 0.063, h: 4.4 },    // Cottage
  { cx: 0.725, fy: 0.92, hw: 0.06, h: 4.6 },    // House
  { cx: 0.7, fy: 0.92, hw: 0.08, h: 5 },        // Townhouse
  ...[6, 7, 8, 9].map(() => ({ cx: 0.69, fy: 0.92, hw: 0.084, h: 7 })),   // the 2x2 homes' main door
];

const inRange = (b, r) => !r || (b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0);

// The cloth's art points for a home: { pole: [a, b], cloth: the quad, hem: the ragged lower edge, folds: [[a, b], ...] }.
export function clothFor(b) {
  const d = DOORS[b.tier] || DOORS[1];
  const w = Math.max(d.hw * 2.2, 0.15), top = d.h + 2, bottom = 0.4;   // wider and taller than the door, so it reads at default zoom on a phone
  const at = (u, z) => U(p(b.x + d.cx + u * w, b.y + d.fy + 0.02), z);
  return {
    pole: [at(-1.25, top + 0.4), at(1.25, top + 0.4)],
    cloth: [at(-1, top), at(1, top), at(1, bottom + 0.5), at(0.5, bottom), at(0, bottom + 0.6), at(-0.5, bottom), at(-1, bottom + 0.5)],
    folds: [[at(-0.33, top), at(-0.33, bottom + 1)], [at(0.4, top), at(0.4, bottom + 1)]],
  };
}

// Draws the cloth over the door of every ill home in range (every tier, in tier order of the homes' ids).
export function drawIllness(g, world, range = null) {
  for (const b of Object.values(world.buildings)) {
    if (b.type !== 'house' || !b.illness || !inRange(b, range)) continue;
    const c = clothFor(b);
    g.line(c.pole[0], c.pole[1], CLOTH.pole, 0.9);
    g.poly(c.cloth, CLOTH.fill, { outline: false, stroke: CLOTH.edge, strokeWidth: 0.7 });
    for (const [a, z] of c.folds) g.line(a, z, CLOTH.fold, 0.5, 0.8);
  }
}
