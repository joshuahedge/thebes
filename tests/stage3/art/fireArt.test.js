import { describe, it, expect } from '../../harness.js';
import { drawFires, roofPoint, FLAME_STEP_MS, SMOKE_PUFFS, BLAZE_SMOKE_PUFFS } from '../../../src/render/fire.js';
import { ART, slotFor } from '../../../src/render/art/registry.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { p, U } from '../../../src/render/iso.js';
import { ART_TEXT } from '../../../src/ui/text.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas, canvasHash, nearColour } from '../../helpers/canvas.js';

const BLAZE = { stage: 'blaze', days: 1, need: 2, fought: 0 };
const FIRE = { stage: 'fire', days: 2, left: 9 };

function burningPotter(fire) {
  const w = makeTestWorld({ fertile: [] });
  const b = addRaw(w, 'potter', 10, 10);
  b.fire = { ...fire };
  return { w, b };
}

// One frame of drawFires on a canvas centred on building b, counting the drawing calls it made.
function frame(w, b, now, opts = {}, range = null) {
  const c = makeCanvas(240, 220), ctx = c.getContext('2d');
  const q = p(b.x + b.w / 2, b.y + b.d / 2);
  ctx.translate(120 - q[0] * 2, 180 - q[1] * 2);
  const g = makeDraw(ctx, 2);
  const calls = { path: 0, radial: [], text: [] };
  const { path, radial, text } = g;
  g.path = (...a) => { calls.path++; return path(...a); };
  g.radial = (q2, rx, ry, col, a) => { calls.radial.push(a); return opts.skipSmoke ? undefined : radial(q2, rx, ry, col, a); };   // skipSmoke: count the smoke but leave it off the canvas, so a test of the flames' shape sees only them
  g.text = (q2, s, o) => { calls.text.push(s); return text(q2, s, o); };
  drawFires(g, w, range, now, opts);
  return { c, calls };
}

// Solid-ish pixels and their mean brightness.
function look(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0, lum = 0, red = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    n++;
    lum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    if (nearColour([d[i], d[i + 1], d[i + 2]], '#E8201C', 50)) red++;
  }
  return { n, mean: n ? lum / n : 0, red };
}

describe('s3 art fire', () => {
  it('stands a blaze as one small flame on the roof, and a fire as three larger flames under a column of smoke', () => {
    const blaze = burningPotter(BLAZE), fire = burningPotter(FIRE);
    const roof = roofPoint(blaze.w, blaze.b);
    expect(roof).toEqual(U(p(11, 11), Math.round(ART[slotFor(blaze.b, blaze.w)].height * 0.62)));
    const a = frame(blaze.w, blaze.b, 1000, { reducedMotion: false });
    const b = frame(fire.w, fire.b, 1000, { reducedMotion: false });
    expect([a.calls.path, a.calls.radial.length]).toEqual([2, BLAZE_SMOKE_PUFFS * 2 + 1]);   // one flame (its outer and inner shapes) and, Stage 4.5, a thinner column of smoke; Version 6.0: and soot charring the roof
    expect([b.calls.path, b.calls.radial.length]).toEqual([6, SMOKE_PUFFS * 2 + 1]);   // three flames and the smoke column (a body and a pale top a puff), and the soot
    expect(look(b.c).n).toBeGreaterThan(look(a.c).n * 3);
  });
  it('changes a flame\'s shape at most twice a second, never its brightness, and never in red', () => {
    const { w, b } = burningPotter(BLAZE);
    let last = null, changes = 0;
    const means = [], sizes = [];
    for (let t = 0; t < 5000; t += 20) {
      const { c } = frame(w, b, t, { reducedMotion: false, skipSmoke: true });
      const h = canvasHash(c), l = look(c);
      if (last !== null && h !== last) {
        changes++;
        expect([t, Math.floor(t / FLAME_STEP_MS) !== Math.floor((t - 20) / FLAME_STEP_MS)]).toEqual([t, true]);   // only on a step
      }
      last = h;
      means.push(l.mean); sizes.push(l.n);
      expect(l.red).toBe(0);
    }
    expect(FLAME_STEP_MS).toBeGreaterThanOrEqual(500);
    expect(changes).toBeGreaterThan(5);                                          // it does move
    expect(changes).toBeLessThanOrEqual(10);                                     // 5 s at 2 Hz
    expect(Math.max(...means) - Math.min(...means)).toBeLessThan(12);            // no flash: the same colours throughout
    expect(Math.min(...sizes) / Math.max(...sizes)).toBeGreaterThan(0.8);
  });
  it('lets the smoke rise and fade smoothly, with no puff popping in or out', () => {
    const { w, b } = burningPotter(FIRE);
    let prev = null;
    for (let t = 0; t < 6000; t += 16) {
      const alphas = frame(w, b, t, { reducedMotion: false }).calls.radial;
      if (prev) for (let i = 0; i < alphas.length; i++) expect([t, i, Math.abs(alphas[i] - prev[i]) < 0.05]).toEqual([t, i, true]);
      prev = alphas;
    }
  });
  it('shows still flames and the word "Burning" under reduced motion, with a still smoke column (Version 6.0, ruling 720: it holds, it does not rise)', () => {
    expect(ART_TEXT.burning).toBe('Burning');
    for (const [fire, puffs] of [[BLAZE, BLAZE_SMOKE_PUFFS], [FIRE, SMOKE_PUFFS]]) {
      const { w, b } = burningPotter(fire);
      const shots = [0, 700, 2600, 4100].map((t) => frame(w, b, t, { reducedMotion: true }));
      expect(new Set(shots.map((s) => canvasHash(s.c))).size).toBe(1);
      expect([shots[0].calls.text, shots[0].calls.radial.length]).toEqual([['Burning'], puffs * 2 + 1]);   // the column's puffs (a body and a pale top each) and the roof's soot
    }
  });
  it('draws only the burning buildings in range, and nothing at all where nothing burns', () => {
    const { w, b } = burningPotter(BLAZE);
    const other = addRaw(w, 'potter', 20, 20, { fire: { ...BLAZE } });
    addRaw(w, 'potter', 4, 20);                                                  // not burning
    expect(frame(w, b, 0).calls.path).toBe(4);
    expect(frame(w, b, 0, {}, { x0: 8, y0: 8, x1: 14, y1: 14 }).calls.path).toBe(2);
    other.fire = null;
    b.fire = null;
    expect(drawFires(null, w, null, 0)).toBe(undefined);                         // never touches the canvas
  });
});
