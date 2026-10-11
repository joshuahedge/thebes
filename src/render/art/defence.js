// Stage 3 art slots (spec 5.4): the firehouse, rubble, the tower, the barracks, and the wall and gate pieces. These are
// the Stage 3 contract's PLACEHOLDERS: plain blocks with the right footprint and an emblem stripe, so every card, sprite
// and thumbnail exists before the art lands. Track C replaces each drawing with the real one (and may move the
// firehouse and rubble into services.js), keeping the slot names: firehouse, rubble, tower, barracks, wall, gate.
// Walls are a tile layer (world.wall); the 'wall' and 'gate' slots are what their cards and thumbnails show, and Track C
// decides how the map draws the layer itself.
import { box, qd, p } from './primitives.js';
import { WASH, STONE, MUD2, ROCK, RED, BLUE, TEAL } from './palette.js';
import { boundsFor } from '../iso.js';

function block(g, x, y, w, d, h, faces, stripe) {
  const F = box(g, x, y, w, d, h, 0, faces);
  if (stripe) qd(g, F.L, 0.15, 0.85, h - 3, h - 1, stripe);
  return F;
}

export const firehouse = (g, x, y) => block(g, x + 0.15, y + 0.15, 0.7, 0.7, 12, WASH, RED);
export const tower = (g, x, y) => block(g, x + 0.2, y + 0.2, 0.6, 0.6, 22, STONE, BLUE);
export const barracks = (g, x, y) => block(g, x + 0.2, y + 0.2, 1.6, 1.6, 10, MUD2, TEAL);
export const wall = (g, x, y) => block(g, x + 0.05, y + 0.3, 0.9, 0.4, 7, MUD2, null);
export const gate = (g, x, y) => { block(g, x + 0.05, y + 0.3, 0.25, 0.4, 9, MUD2, null); block(g, x + 0.7, y + 0.3, 0.25, 0.4, 9, MUD2, null); };
export function rubble(g, x, y) {
  for (const [u, v, s] of [[0.2, 0.25, 0.3], [0.55, 0.2, 0.25], [0.35, 0.55, 0.35], [0.65, 0.6, 0.2]]) block(g, x + u, y + v, s, s, 2.5, ROCK, null);
  g.circ(p(x + 0.5, y + 0.5), 0.8, MUD2[2]);
}

export const DEFENCE_ART = {
  firehouse: { w: 1, d: 1, height: 12, bounds: boundsFor(1, 1, 12), shadows: [[0.15, 0.15, 0.7, 0.7, 12]], draw: firehouse },
  tower: { w: 1, d: 1, height: 22, bounds: boundsFor(1, 1, 22), shadows: [[0.2, 0.2, 0.6, 0.6, 22]], draw: tower },
  barracks: { w: 2, d: 2, height: 10, bounds: boundsFor(2, 2, 10), shadows: [[0.2, 0.2, 1.6, 1.6, 10]], draw: barracks },
  wall: { w: 1, d: 1, height: 7, bounds: boundsFor(1, 1, 7), shadows: [], draw: wall },
  gate: { w: 1, d: 1, height: 9, bounds: boundsFor(1, 1, 9), shadows: [], draw: gate },
  rubble: { w: 1, d: 1, height: 3, bounds: boundsFor(1, 1, 3), shadows: [], draw: rubble },
};
