// Card pictures (early-game pass 2.5): each build card shows its building's own drawing, rendered from the art
// registry and fitted into a small canvas. Roads and demolish get small drawn icons of their own. Each picture
// is painted once per item and pixel ratio, then copied onto every card that shows it.
import { ART } from '../render/art/registry.js';
import { makeDraw } from '../render/art/ctx.js';
import { p } from '../render/iso.js';
import { TERRAIN, SHADOW, ROCK, RED, UI } from '../render/art/palette.js';

export const THUMB_W = 56;    // CSS px; css/ui.css sizes .card .thumb to match
export const THUMB_H = 40;

// A short stretch of road, drawn the way terrainRoads.js draws roads: shadow, edge, top, ruts and pebbles.
const ROAD_ICON = {
  bounds: [-8, 0, 40, 32],
  draw(g) {
    const path = [['M', p(0.5, 0.5)], ['L', p(2.5, 0.5)]];
    for (const [c, w, a] of [[SHADOW, 15, 0.12], [TERRAIN.roadEdge, 12, 1], [TERRAIN.road, 10, 1]]) g.stroke(path, c, w, a);
    const ruts = [];
    for (const o of [-0.12, 0.12]) ruts.push(['M', p(0.5, 0.5 + o)], ['L', p(2.5, 0.5 + o)]);
    g.stroke(ruts, TERRAIN.roadEdge, 0.7, 0.7);
    for (const [x, y, c] of [[0.9, 0.4, TERRAIN.roadPebble], [1.6, 0.65, TERRAIN.roadPebbleLight], [2.2, 0.45, TERRAIN.roadPebble]]) g.circ(p(x, y), 0.6, c);
  },
};

// A cleared plot with a little rubble under a coral cross.
const DEMOLISH_ICON = {
  bounds: [-18, -18, 18, 14],
  draw(g) {
    g.poly([[0, -2], [14, 5], [0, 12], [-14, 5]], TERRAIN.plot, { outline: true });
    for (const [x, y, s] of [[-6, 5, 3], [4, 3, 2.5], [2, 8, 2]]) g.poly([[x, y - s / 2], [x + s, y], [x, y + s / 2], [x - s, y]], ROCK[0], { outline: true });
    const arms = [[[-8, -14], [8, 0]], [[8, -14], [-8, 0]]];
    for (const [a, b] of arms) g.line(a, b, UI.halo, 5, 0.9);
    for (const [a, b] of arms) g.line(a, b, RED, 3);
  },
};

function artFor(item) {
  if (item === 'road') return ROAD_ICON;
  if (item === 'demolish') return DEMOLISH_ICON;
  const def = ART[item === 'house' ? 'house.t3' : item];      // a plot shows a Cottage, what it grows into
  return def && def.draw ? def : null;
}

// Fit the art's bounds into the canvas, keeping its aspect ratio, centred.
function paint(canvas, art, dpr) {
  canvas.width = Math.round(THUMB_W * dpr);
  canvas.height = Math.round(THUMB_H * dpr);
  if (!art) return;
  const [l, t, r, b] = art.bounds;
  const scale = Math.min(canvas.width / (r - l), canvas.height / (b - t));
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate((canvas.width - (r - l) * scale) / 2 - l * scale, (canvas.height - (b - t) * scale) / 2 - t * scale);
  art.draw(makeDraw(ctx, scale), 0, 0);
  ctx.restore();
}

const painted = new Map();   // `${item}@${dpr}` -> canvas

export function drawThumb(canvas, item, dpr = 1) {
  const key = `${item}@${dpr}`;
  let src = painted.get(key);
  if (!src) { src = document.createElement('canvas'); paint(src, artFor(item), dpr); painted.set(key, src); }
  canvas.width = src.width;       // also clears it
  canvas.height = src.height;
  canvas.getContext('2d').drawImage(src, 0, 0);
  return canvas;
}
