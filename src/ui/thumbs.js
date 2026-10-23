// Card pictures (early-game pass 2.5): each build card shows its building's own drawing, rendered from the art
// registry and fitted into a small canvas. Roads and demolish get small drawn icons of their own. The drawing is
// measured first and fitted by the pixels it really inks, so a small building fills the box as a big one does.
// Each picture is painted once per item and pixel ratio, then copied onto every card that shows it.
import { ART } from '../render/art/registry.js';
import { makeDraw } from '../render/art/ctx.js';
import { p } from '../render/iso.js';
import { TERRAIN, SHADOW, ROCK, RED, UI } from '../render/art/palette.js';
import { plaza } from '../render/art/plaza.js';

export const THUMB_W = 104;   // CSS px; css/ui.css sizes .card .thumb to match
export const THUMB_H = 52;
const INSET = 2;              // CSS px of clear border around the picture
const PROBE = 4;              // device px per art px for the measuring pass
const SLACK = 4;              // art px past a slot's bounds the measuring pass also looks at
const INK_ALPHA = 24;         // pixels fainter than this (a soft ground shadow) do not count as drawn

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

// Stage 4 (Track B): plazas are painted as courts, so the plaza card shows a little court of four joined tiles.
const PLAZA_ICON = {
  bounds: [-40, -9, 40, 41],
  draw(g) { plaza(g, 0, 0, 6); plaza(g, 1, 0, 12); plaza(g, 0, 1, 3); plaza(g, 1, 1, 9); },
};

// Only `draw`-based art slots get a picture; a slot that later points at a PNG would need handling here.
function artFor(item) {
  if (item === 'road') return ROAD_ICON;
  if (item === 'demolish') return DEMOLISH_ICON;
  if (item === 'plaza') return PLAZA_ICON;
  const def = ART[item === 'house' ? 'house.t1' : item === 'large_plot' ? 'house.lot' : item];      // a plot shows a Hut, the home it starts as; the Large plot card its marked lot (Version 6.0)
  return def && def.draw ? def : null;
}

// The box the art really inks, in art px: draw it big once and scan for pixels that are clearly there. A browser
// that blocks or noises canvas readback (Brave's farbling, Firefox's resistFingerprinting) reads back nothing, or
// ink everywhere: then the box is the art's own bounds, a little loose but never a blank or shrunken picture.
export function inkBounds(art) {
  const [l, t, r, b] = art.bounds;
  const w = Math.ceil((r - l + 2 * SLACK) * PROBE), h = Math.ceil((b - t + 2 * SLACK) * PROBE);
  const probe = document.createElement('canvas');
  probe.width = w; probe.height = h;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  ctx.translate((SLACK - l) * PROBE, (SLACK - t) * PROBE);
  art.draw(makeDraw(ctx, PROBE), 0, 0);
  const px = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] <= INK_ALPHA) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0 || (x0 === 0 && y0 === 0 && x1 === w - 1 && y1 === h - 1)) return art.bounds.slice();   // the art never reaches the slack edge
  return [l - SLACK + x0 / PROBE, t - SLACK + y0 / PROBE, l - SLACK + (x1 + 1) / PROBE, t - SLACK + (y1 + 1) / PROBE];
}

// Fit the inked box into the canvas, keeping its aspect ratio, centred, a couple of px in from the edge.
function paint(canvas, art, dpr) {
  canvas.width = Math.round(THUMB_W * dpr);
  canvas.height = Math.round(THUMB_H * dpr);
  const box = art && inkBounds(art);
  if (!box) return;
  const [l, t, r, b] = box;
  const inset = INSET * dpr;
  const scale = Math.min((canvas.width - 2 * inset) / (r - l), (canvas.height - 2 * inset) / (b - t));
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
