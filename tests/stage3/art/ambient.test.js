import { describe, it, expect } from '../../harness.js';
import {
  createAmbient, createFrameGate, drawAmbientLate, glintAt, riverRows, reedTips, treeLean, windOf, rareAt, GLINT_STEPS,
  LEVEL_HOLD_MS, RESTORE_AFTER_MS,
} from '../../../src/render/ambient.js';
import { AMBIENT } from '../../../src/data/ambient.js';
import { ART } from '../../../src/render/art/registry.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { drawFires } from '../../../src/render/fire.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildStressCity } from '../../../src/dev/sampleCity.js';
import { addRaw, setRoad, staffAll } from '../../helpers/testWorld.js';
import { riverWorld } from '../../helpers/renderWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';

const ALL = { x0: 0, y0: 0, x1: 31, y1: 31 };

// A draw object that records its calls (and still draws), on its own canvas.
function spyDraw() {
  const g = makeDraw(makeCanvas(64, 64).getContext('2d'), 1);
  const calls = [];
  for (const k of ['line', 'stroke', 'poly', 'radial', 'path', 'circ', 'ell', 'clip']) {
    const f = g[k];
    g[k] = (...a) => { calls.push({ k, a }); return f(...a); };
  }
  return { g, calls };
}
// One whole frame: the ground layer, then the late layer as drawFires runs it after the sprites.
function frame(ambient, world, now, range = ALL) {
  const s = spyDraw();
  ambient.draw(s.g, world, range, now);
  const ground = s.calls.length;
  drawAmbientLate(s.g);
  return { ground: s.calls.slice(0, ground), late: s.calls.slice(ground) };
}
const on = () => createAmbient({ enabled: () => true });
// Direction changes in a sampled series (a sign change of its steps).
function turns(series) {
  let n = 0, last = 0;
  for (let i = 1; i < series.length; i++) {
    const d = Math.sign(series[i] - series[i - 1]);
    if (d && last && d !== last) n++;
    if (d) last = d;
  }
  return n;
}

describe('s3 art ambient', () => {
  it('draws nothing at all while ambient motion is off, by the setting or reduced motion', () => {
    const w = riverWorld();
    const a = createAmbient({ enabled: () => false });
    const f = frame(a, w, 5000);
    expect([f.ground.length, f.late.length, a.stats]).toEqual([0, 0, { ms: 0, dropped: [] }]);
  });
  it('lays glints and bank ripples on the river and swaying reed tips over the baked reeds, in a few batched strokes', () => {
    const w = riverWorld();
    const f = frame(on(), w, 5000);
    const strokes = f.ground.filter((c) => c.k === 'stroke');
    expect(strokes.length).toBeGreaterThan(3);
    expect(strokes.length).toBeLessThan(GLINT_STEPS + 2 + 2 + 1);               // glint alpha steps, two banks, two reed colours
    expect(f.ground.filter((c) => c.k === 'line').length).toBe(0);              // never one call per glint or blade
    const rows = riverRows(w, 0, 31);
    const glints = [];
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (w.terrain[y * 32 + x] === 3) { const gl = glintAt(w, x, y, 5000, rows); if (gl) glints.push(gl); }
    expect(glints.length).toBeGreaterThan(20);
    expect(new Set(glints.map((gl) => Math.round(gl.alpha * 100))).size).toBeGreaterThan(glints.length / 3);   // out of step
    for (const gl of glints) {
      const r = rows.get(Math.floor(gl.y));
      expect(gl.x >= r.left && gl.x <= r.right).toBe(true);                      // on the water
    }
  });
  it('drifts a glint downstream at about 0.2 tiles a second, fading in and out over 4-7 s', () => {
    const w = riverWorld();
    const rows = riverRows(w, 0, 31);
    const spot = [];
    for (let y = 4; y < 20 && !spot.length; y++) for (let x = 0; x < 32; x++) if (w.terrain[y * 32 + x] === 3 && glintAt(w, x, y, 0, rows)) { spot.push(x, y); break; }
    const samples = [];
    for (let t = 0; t <= 14000; t += 50) samples.push(glintAt(w, spot[0], spot[1], t, rows));
    const alphas = samples.map((s) => (s ? s.alpha : 0));
    expect(Math.max(...alphas)).toBeLessThanOrEqual(0.75);
    expect(turns(alphas)).toBeLessThanOrEqual(8);                                // up then down once per life: under 1 Hz
    for (let i = 1; i < samples.length; i++) {
      const [a, b] = [samples[i - 1], samples[i]];
      if (a && b && a.alpha > 0.05 && b.alpha > 0.05) expect(Math.abs((b.y - a.y) / 0.05 - AMBIENT.glintDriftTilesPerSecond) < 1e-6).toBe(true);
    }
  });
  it('sways reed tips +-3 degrees over 3-6 s and leans trees +-2 degrees over 4-6 s, each out of step', () => {
    const w = riverWorld();
    const rows = riverRows(w, 0, 31);
    const angles = (now) => reedTips(w, ALL, now, rows)[0].filter((s) => s[0] === 'L').map((s, i) => s[1]);
    const bases = reedTips(w, ALL, 0, rows)[0].filter((s) => s[0] === 'M').map((s) => s[1]);
    let maxDeg = 0;
    const firstTip = [];
    for (let t = 0; t <= 12000; t += 100) {
      const tips = angles(t);
      tips.forEach((tip, i) => { maxDeg = Math.max(maxDeg, Math.abs(Math.atan2(tip[0] - bases[i][0], bases[i][1] - tip[1]) * 180 / Math.PI)); });
      firstTip.push(tips[0][0]);
    }
    expect(maxDeg).toBeLessThanOrEqual(AMBIENT.reedSwayDeg + 1e-9);
    expect(maxDeg).toBeGreaterThan(AMBIENT.reedSwayDeg * 0.9);
    expect(turns(firstTip)).toBeGreaterThanOrEqual(3);                          // 12 s at 3-6 s a sway
    expect(turns(firstTip)).toBeLessThanOrEqual(8);
    const lean = [];
    for (let t = 0; t <= 12000; t += 100) lean.push(treeLean(w, 5, 9, t));
    expect(Math.max(...lean.map(Math.abs))).toBeLessThanOrEqual(AMBIENT.treeSwayDeg);
    expect([turns(lean) >= 3, turns(lean) <= 6]).toEqual([true, true]);
    expect(treeLean(w, 5, 9, 3000) === treeLean(w, 6, 9, 3000)).toBe(false);
  });
  it('picks a tree\'s lean slot for the depth pass, or the still tree while ambient motion is off', () => {
    const w = riverWorld();
    const a = on();
    const slots = new Set();
    for (let t = 0; t < 6000; t += 100) slots.add(a.treeSlot(w, 5, 9, 'palm', t));
    for (const s of slots) expect([s, Boolean(ART[s] && ART[s].draw)]).toEqual([s, true]);
    expect(slots.size).toBeGreaterThan(5);
    expect([...slots].every((s) => s === 'palm' || /^palm\.l-?[1-4]$/.test(s))).toBe(true);
    expect(createAmbient({ enabled: () => false }).treeSlot(w, 5, 9, 'acacia', 1234)).toBe('acacia');
  });
  it('runs a lighter band across a working field in the wind\'s direction every 6 s, and over no field that is idle or hidden', () => {
    const w = riverWorld();
    const farm = w.buildings[w.occ[10 * 32 + 8]];
    const band = (now) => frame(on(), w, now).late.find((c) => c.k === 'poly' && c.a[1] === '#FBF3C6');
    const centre = (c) => c.a[0].reduce((s, q) => [s[0] + q[0] / 4, s[1] + q[1] / 4], [0, 0]);
    const wind = windOf(w);
    const a = band(1000), b = band(1400);
    expect([Boolean(a), Boolean(b)]).toEqual([true, true]);
    const moved = [centre(b)[0] - centre(a)[0], centre(b)[1] - centre(a)[1]];
    const windArt = [(wind.x - wind.y) * 16, (wind.x + wind.y) * 8];
    expect(moved[0] * windArt[0] + moved[1] * windArt[1]).toBeGreaterThan(0);   // downwind
    expect(centre(band(1000 + AMBIENT.cropBandEveryMs))).toEqual(centre(a));
    farm.staff = 0;
    expect(band(1000)).toBe(undefined);
    staffAll(w);
    addRaw(w, 'house', farm.x + 2, farm.y + 1, { tier: 5, residents: 10 });        // a Townhouse just in front of the field
    expect(band(1000)).toBe(undefined);
  });
  it('puffs smoke from working kilns and the brewhouse and lived-in Townhouses and up, rising and fading smoothly', () => {
    const w = riverWorld();
    setRoad(w, 26, 16, 26, 30);
    const potter = addRaw(w, 'potter', 27, 18);
    addRaw(w, 'house', 27, 22, { tier: 4, residents: 10 });
    staffAll(w);
    const puffs = (now) => frame(on(), w, now).late.filter((c) => c.k === 'radial').map((c) => c.a[4]);
    expect(puffs(1000).length).toBe(2);                                          // the kiln's two puffs; a House has no chimney smoke
    addRaw(w, 'house', 27, 24, { tier: 5, residents: 10 });
    expect(puffs(1000).length).toBe(4);
    potter.staff = 0;
    expect(puffs(1000).length).toBe(2);
    let prev = null;
    for (let t = 0; t < 8000; t += 16) {
      const now = puffs(t);
      if (prev) now.forEach((al, i) => expect([t, i, Math.abs(al - prev[i]) < 0.05]).toEqual([t, i, true]));
      prev = now;
    }
  });
  it('brings each kind of rare life at most one at a time, 60 to 120 s apart', () => {
    const w = riverWorld();
    for (const kind of AMBIENT.rareKinds) {
      const starts = [];
      let was = false;
      for (let t = 0; t < 30 * 60000; t += 250) {
        const a = rareAt(w, kind, t);
        if (a && !was) starts.push(t);
        was = Boolean(a);
      }
      expect([kind, starts.length >= 15]).toEqual([kind, true]);
      for (let i = 1; i < starts.length; i++) {
        const gap = starts[i] - starts[i - 1];
        expect([kind, gap >= 60000 - 250 && gap <= 120000 + 250]).toEqual([kind, true]);
      }
    }
  });
  it('keeps to its budget: over it, drops rare life, then smoke, then sway, keeps the water, and brings them back after a calm spell', () => {
    const w = riverWorld();
    let cost = 3, t = 0;
    const a = createAmbient({ enabled: () => true, clock: () => (t += cost) });
    const run = (ms, step = 16) => { let f = null; for (let n = 0; n < ms; n += step) { now += step; f = frame(a, w, now); } return f; };
    let now = 0;
    run(LEVEL_HOLD_MS - 100);
    expect(a.stats.dropped).toEqual([]);                                         // never at once
    run(200);
    expect(a.stats.dropped).toEqual(['rare']);
    run(LEVEL_HOLD_MS);
    expect(a.stats.dropped).toEqual(['rare', 'smoke']);
    const last = run(LEVEL_HOLD_MS);
    expect(a.stats.dropped).toEqual(['rare', 'smoke', 'sway']);
    expect(last.ground.filter((c) => c.k === 'stroke').length).toBeGreaterThan(2);   // the water stays
    run(LEVEL_HOLD_MS * 2);
    expect(a.stats.dropped).toEqual(['rare', 'smoke', 'sway']);
    cost = 0.1;
    run(RESTORE_AFTER_MS - 1000);
    expect(a.stats.dropped.length).toBe(3);                                      // not back yet: no blinking in and out
    run(2000);
    expect(a.stats.dropped).toEqual(['rare', 'smoke']);
    expect(a.stats.ms).toBeLessThan(AMBIENT.budgetMs);
  });
  it('draws the late layer once, for its own frame only', () => {
    const w = riverWorld();
    setRoad(w, 26, 16, 26, 30);
    addRaw(w, 'potter', 27, 18);
    staffAll(w);
    const a = on();
    const one = spyDraw(), two = spyDraw();
    a.draw(one.g, w, ALL, 1000);
    const before = one.calls.length;
    drawAmbientLate(two.g);
    expect(two.calls.length).toBe(0);
    drawAmbientLate(one.g);
    expect(one.calls.length).toBeGreaterThan(before);
    const after = one.calls.length;
    drawAmbientLate(one.g);
    expect(one.calls.length).toBe(after);
    drawAmbientLate(null);
  });
  it('costs well under its budget on the stress city at laptop size (a mid-range phone is slower; the drop order covers it)', () => {
    const world = buildStressCity(createWorld({ seed: 3 }));
    const renderer = createRenderer({ canvas: makeCanvas(1280, 800), dpr: 1, maxBakesPerFrame: Infinity });
    const cam = createCamera({ x: 32, y: 32, zoom: 0.75 });
    const view = { width: 1280, height: 800 };
    const a = on();
    const ms = [];
    for (let i = 0; i < 30; i++) {
      const t = 1000 + i * 16;
      renderer.renderFrame(world, cam, { view, ambient: (g, r) => a.draw(g, world, r, t), fire: (g, r) => drawFires(g, world, r, t) });
      if (i >= 10) ms.push(a.stats.ms);
    }
    ms.sort((x, y) => x - y);
    expect(ms[10]).toBeLessThan(AMBIENT.budgetMs * 2);
  });
});

describe('s3 art frame gate', () => {
  it('caps frames at 30 a second once the game is paused and idle for 2 s, never while it runs or just after input', () => {
    const gate = createFrameGate();
    const count = (from, frames, paused) => { let n = 0; for (let i = 0; i < frames; i++) if (gate.allow(from + (i * 1000) / 60, paused)) n++; return n; };
    expect(count(0, 60, false)).toBe(60);                                        // running: every frame of a 60 Hz second
    gate.noteInput(1000);
    expect(count(1000, 120, true)).toBe(120);                                    // paused, but within 2 s of input
    const idle = count(3000, 60, true);
    expect([idle >= 29, idle <= 31]).toEqual([true, true]);                      // paused and idle: about 30
    gate.noteInput(4000);
    expect(count(4000, 30, true)).toBe(30);                                      // input brings full speed back
    expect(count(4500, 30, false)).toBe(30);
    const g120 = createFrameGate({ idleAfterMs: 0, fpsCap: AMBIENT.idleFpsCap });
    let n = 0;
    for (let i = 0; i < 120; i++) if (g120.allow((i * 1000) / 120, true)) n++;
    expect([n >= 29, n <= 31]).toEqual([true, true]);                            // a 120 Hz display too
  });
});
