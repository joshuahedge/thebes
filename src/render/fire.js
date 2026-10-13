// Flames and smoke (spec 5.4), drawn from the world's fire state (b.fire, src/sim/fire.js), so they survive a reload.
// Stage 3 contract: createUI passes drawFires to renderFrame as opts.fire, which calls it once a frame in art px (the
// camera's origin set) after the depth-sorted sprites and before the effects and overlays. It first draws the frame's
// late ambient layer (render/ambient.js: drawAmbientLate), the one hook after the sprites Track C has.
//
// A blaze is one small flame on the roof; a fire is three larger flames and a column of the potter's soft smoke puffs.
// A flame's shape (its tip's sway and its embers) steps once every FLAME_STEP_MS, so it changes at 2 Hz at most, each
// building out of step by its id; its colours and size never change, so nothing flashes, and it is orange and gold,
// never a saturated red. Smoke puffs rise and fade smoothly over SMOKE_RISE_MS. Under reduced motion a burning building
// shows still flames and the word "Burning" (ART_TEXT.burning) on a pale label, and no smoke.
//
// Stage 4.5 (ruling 310): both Full and Gentle show a smoke column on every fire (a blaze gets a thinner one; a fire's is
// the full column), Gentle's fading in place; Gentle's two flame shapes sit further apart so the change reads; the
// "Burning" label sits under the flames, not over the smoke, and neighbouring labels step down so no two overlap; and
// drawScorch (called under the sprites, opts.scorch) lays a scorch mark on the ground under every burning building and
// every rubble tile, under every level (Still included).
//
// Stage 4 (spec 5.4, ruling 248, Track E): drawFires' options take the Motion level ({ motion: 'full' | 'gentle' |
// 'still' }; without it, reducedMotion true reads as Still). Full is the above. Gentle: each flame cross-fades between two
// still shapes (no sway, no embers), one change a second at most (GENTLE_FLAME_MS, the fade GENTLE_FADE_MS of it), with the
// "Burning" label, and a fire's smoke fades in place, rising at most GENTLE_SMOKE_RISE_PX. Still: one still flame shape,
// the label, no smoke.
import { ART, slotFor } from './art/registry.js';
import { p, U, hs } from './iso.js';
import { ART_TEXT } from '../ui/text.js';
import { drawAmbientLate } from './ambient.js';

export const FLAME_STEP_MS = 500;
export const GENTLE_FLAME_MS = 1000;           // Gentle: a flame holds each of its two still shapes this long ...
export const GENTLE_FADE_MS = 400;             // ... and cross-fades to the other over the last part of it
export const GENTLE_SMOKE_RISE_PX = 4;         // Gentle: a smoke puff rises at most this far (spec 5.4)
const GENTLE_SHAPES = [0, 2];                  // the two still shapes: LEAN steps 0 and 2 (a lean left, a lean right), far enough apart to read
export const SMOKE_RISE_MS = 3000;
export const SMOKE_PUFFS = 5;
export const BLAZE_SMOKE_PUFFS = 3;            // Stage 4.5: a blaze's thinner column
// Each smoke puff is a shaded grey body with a pale top, so the column reads at default zoom on a phone over pale sand
// and dark loam alike (spec 5.4).
export const FLAME = { outer: '#E07B39', mid: '#F2A93B', core: '#FCE6A6', ember: '#F6C05A', smoke: '#6F6470', smokeLight: '#E4DCE2' };
const SMOKE_ALPHA = 0.7;                       // a puff's peak opacity (it fades in, then out as it rises)
const LEAN = [-0.8, 0.5, 1, -0.3];            // the tip's sway at each of four steps, in art px per unit of size
const LABEL = { fill: '#FFF8EA', text: '#3B2A14', size: 7, below: 9, gap: 1 };   // below: art px from the roof point down to the pill's middle   // 14 CSS px at zoom 1 (spec 6.1's 12 px floor)
// Flame sizes (a unit flame is 6.5 art px tall): one for a blaze, and a fire's three (left, right, middle).
const BLAZE_SIZE = 1.5, FIRE_SIZES = [1.9, 1.8, 2.5];

const inRange = (b, r) => !r || (b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0);

// One flame standing on art point q: an orange teardrop, a gold heart, a pale core and two embers above its tip.
// { embers: false } leaves the embers out; { alpha } draws the whole flame at that opacity (Gentle's cross-fade).
export function flame(g, q, size, step, { embers = true, alpha = 1 } = {}) {
  const [x, y] = q, w = 2.2 * size, h = 6.5 * size, lean = LEAN[step % LEAN.length] * size;
  const o = { alpha };
  const shape = (k, tip, fill) => g.path([
    ['M', [x - w * k, y]], ['Q', [x - w * k * 1.15, y - h * k * 0.55], [x + tip, y - h * k]],
    ['Q', [x + w * k * 1.15, y - h * k * 0.55], [x + w * k, y]], ['Q', [x, y + w * k * 0.45], [x - w * k, y]], ['Z'],
  ], fill, o);
  shape(1, lean, FLAME.outer);
  shape(0.62, lean * 0.7, FLAME.mid);
  g.ell([x, y - h * 0.12], w * 0.32, w * 0.26, FLAME.core, o);
  if (!embers) return;
  const side = step % 2 ? 1 : -1;
  g.circ([x + lean * 1.3 + side * size, y - h - (1 + (step % 3)) * size * 1.2], 0.45 * size, FLAME.ember);
  g.circ([x + lean * 0.6 - side * 1.4 * size, y - h * 0.8 - (step % 2) * size], 0.35 * size, FLAME.ember);
}

// Where a building's flames stand: on its roof, at the footprint's centre, about two thirds of its art height up.
export function roofPoint(world, b) {
  const def = ART[slotFor(b, world)];
  const z = Math.max(4, Math.round((def ? def.height : 10) * 0.62));
  return U(p(b.x + b.w / 2, b.y + b.d / 2), z);
}

// The pill's size in art px, from the same measuring the drawing uses.
export function labelSize(g, str) {
  const ctx = g.ctx;
  ctx.font = `700 ${LABEL.size * g.scale}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  return [ctx.measureText(str).width / g.scale + 5, LABEL.size + 2.6];
}

// Where each label's middle goes. points: [x, y] label middles in draw order (back to front); a label that would overlap one
// already placed steps down by a pill's height and a gap until it is clear, so a row of neighbouring fires reads as a stack.
// Returns the middles in the same order.
export function layoutLabels(points, w, h, gap = LABEL.gap) {
  const placed = [];
  return points.map(([x, y0]) => {
    let y = y0;
    while (placed.some(([px, py]) => Math.abs(px - x) < w && Math.abs(py - y) < h + gap)) y += h + gap;
    placed.push([x, y]);
    return [x, y];
  });
}

function label(g, q, str, [w, h]) {
  const ctx = g.ctx, [x, y] = q, r = h / 2;
  g.path([['M', [x - w / 2 + r, y - r]], ['L', [x + w / 2 - r, y - r]], ['Q', [x + w / 2, y - r], [x + w / 2, y]], ['Q', [x + w / 2, y + r], [x + w / 2 - r, y + r]],
    ['L', [x - w / 2 + r, y + r]], ['Q', [x - w / 2, y + r], [x - w / 2, y]], ['Q', [x - w / 2, y - r], [x - w / 2 + r, y - r]], ['Z']], LABEL.fill, { alpha: 0.94, outline: true });
  g.text([x, y + 0.2], str, { size: LABEL.size, color: LABEL.text, weight: '700' });
}

// A fire's column of smoke over art point q: SMOKE_PUFFS puffs (two radial fills each), each rising about 28 art px and
// fading as it goes, spaced evenly in time and out of step with other buildings by id.
// Under Gentle (inPlace) each puff fades where it is, rising GENTLE_SMOKE_RISE_PX at most, the column's puffs set one
// above another.
function smoke(g, q, now, id, inPlace = false, puffs = SMOKE_PUFFS, scale = 1) {
  const offset = ((id * 0.618) % 1);
  for (let i = 0; i < puffs; i++) {
    const t = (now / SMOKE_RISE_MS + i / puffs + offset) % 1;
    const a = SMOKE_ALPHA * Math.min(1, t / 0.15) * (1 - t * t);   // reaches 0 at the top, so no puff pops out
    const r = (4 + t * 6) * scale;
    const k = (i + 0.5) / puffs;                                    // a Gentle puff's own height in the column
    const c = inPlace ? [q[0] + 1.5 + k * 6 * scale, q[1] - 16 * scale - k * 28 * scale - t * GENTLE_SMOKE_RISE_PX] : [q[0] + 1.5 + t * 6 * scale, q[1] - 16 * scale - t * 28 * scale];
    g.radial(c, r, r * 0.8, FLAME.smoke, a);
    g.radial([c[0] - r * 0.25, c[1] - r * 0.3], r * 0.6, r * 0.45, FLAME.smokeLight, a * 0.8);
  }
}

// Gentle's cross-fade for flame key id at time now: [shape, alpha] pairs to draw, the shape it is leaving first. Each
// shape holds for GENTLE_FLAME_MS less the fade, then the next fades in over GENTLE_FADE_MS (cosine and sine weights, so
// the flame never thins much mid-fade), out of step by id.
export function gentleShapes(now, id) {
  const u = now / GENTLE_FLAME_MS + ((id * 0.618) % 1), n = Math.floor(u), f = u - n;
  const from = GENTLE_SHAPES[n % 2], to = GENTLE_SHAPES[(n + 1) % 2];
  const fade = GENTLE_FADE_MS / GENTLE_FLAME_MS;
  const b = Math.max(0, Math.min(1, (f - (1 - fade)) / fade));
  if (b === 0) return [[from, 1]];
  return [[from, Math.cos((b * Math.PI) / 2)], [to, Math.sin((b * Math.PI) / 2)]];
}

// A scorch mark on the ground under every burning building and every rubble tile (Stage 4.5, ruling 310): a soft soot stain
// under the footprint with a darker core and a few streaks, its shape from the building's tile, so it never changes frame to
// frame. Drawn in art px with the camera's origin set, under the sprites (renderFrame's opts.scorch), at every motion level.
export const SCORCH = { soot: '#2E2420', core: '#1F1814', burning: 0.5, rubble: 0.38 };
export function drawScorch(g, world, range) {
  for (const id in world.buildings) {
    const b = world.buildings[id];
    const rubble = b.type === 'rubble';
    if (!(b.fire || rubble) || !inRange(b, range)) continue;
    const c = p(b.x + b.w / 2, b.y + b.d / 2), k = (b.w + b.d) / 2, a = rubble ? SCORCH.rubble : SCORCH.burning;
    g.radial([c[0], c[1] + 3], 25 * k + 5, 12.5 * k + 3, SCORCH.soot, a);
    g.radial([c[0] + (hs(b.x, b.y, 1) - 0.5) * 4, c[1] + 3], 15 * k, 7.5 * k, SCORCH.core, Math.min(1, a * 1.3));
    for (let i = 0; i < 3; i++) {                                   // streaks of soot licking out along the ground
      const ang = hs(b.x, b.y, 2 + i) * Math.PI * 2, d = (13 + hs(b.x, b.y, 8 + i) * 9) * k;
      g.ell([c[0] + Math.cos(ang) * d, c[1] + 3 + Math.sin(ang) * d * 0.5], 5 + hs(b.x, b.y, 14 + i) * 4, 2.3, SCORCH.soot, { alpha: a * 0.85 });
    }
  }
}

export function drawFires(g, world, range, now, { reducedMotion = false, motion = null } = {}) {
  drawAmbientLate(g);                        // ambient life that shows over the buildings (render/ambient.js), this frame's
  const level = motion || (reducedMotion ? 'still' : 'full');
  const burning = [];
  for (const id in world.buildings) {
    const b = world.buildings[id];
    if (b.fire && inRange(b, range)) burning.push(b);
  }
  burning.sort((a, c) => (a.x + a.w / 2 + a.y + a.d / 2) - (c.x + c.w / 2 + c.y + c.d / 2) || a.id - c.id);   // back to front
  // The labels' places: under the flames, stepping down where neighbours' pills would overlap (Gentle and Still).
  const labels = [];
  if (level !== 'full' && burning.length) {
    const size = labelSize(g, ART_TEXT.burning);
    const middles = layoutLabels(burning.map((b) => { const q = roofPoint(world, b); return [q[0], q[1] + LABEL.below]; }), size[0], size[1]);
    for (const at of middles) labels.push({ at, size });
  }
  burning.forEach((b, n) => {
    const q = roofPoint(world, b), big = b.fire.stage === 'fire';
    if (level !== 'still') smoke(g, q, now, b.id, level === 'gentle', big ? SMOKE_PUFFS : BLAZE_SMOKE_PUFFS, big ? 1 : 0.7);
    // Each flame: Full steps its shape (sway and embers); Gentle cross-fades two still shapes; Still holds one.
    const draw = (at, size, k) => {
      if (level === 'full') flame(g, at, size, Math.floor(now / FLAME_STEP_MS) + b.id + k);
      else if (level === 'gentle') for (const [shape, alpha] of gentleShapes(now, b.id + k)) flame(g, at, size, shape, { embers: false, alpha });
      else flame(g, at, size, 0);
    };
    if (big) {
      const k = Math.min(2, b.w);
      draw([q[0] - 6.5 * k, q[1] + 1.5], FIRE_SIZES[0], 1);
      draw([q[0] + 6.5 * k, q[1] + 2], FIRE_SIZES[1], 2);
      draw([q[0], q[1] - 1], FIRE_SIZES[2], 0);
    } else {
      draw(q, BLAZE_SIZE, 0);
    }
    if (labels.length) label(g, labels[n].at, ART_TEXT.burning, labels[n].size);
  });
}
