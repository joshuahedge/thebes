// Stage 4, Track E: the Motion setting (spec 5.4, rulings 216-218, 247-249): the Settings row's words and the device's own
// setting read live, the one-time Gentle tip, Gentle's variants of the effects, flames, glints and smoke, the interface's
// instant transitions under Gentle, the title backdrop drifting under Full only, and setMotion for the shots.
import { describe, it, expect } from '../../harness.js';
import { createSettings, motionStatus, gentleTipDue, motionLevelOf } from '../../../src/ui/settings.js';
import { createEffects, EFFECT_MS } from '../../../src/render/effects.js';
import { drawFires, gentleShapes, GENTLE_FLAME_MS, GENTLE_SMOKE_RISE_PX, FLAME } from '../../../src/render/fire.js';
import { createAmbient, drawAmbientLate, glintAt, riverRows, GENTLE_SMOKE_RISE_PX as AMBIENT_RISE_PX } from '../../../src/render/ambient.js';
import { createBackdrop } from '../../../src/ui/titleCard.js';
import { createCameraControl } from '../../../src/ui/cameraControl.js';
import { createCamera } from '../../../src/render/camera.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../../src/data/tips.js';
import { MOTION4_TEXT, TIP_TEXT, TIP_HELP_TEXT, ART_TEXT } from '../../../src/ui/text.js';
import { makeTestWorld, addRaw, setRoad, staffAll } from '../../helpers/testWorld.js';
import { riverWorld } from '../../helpers/renderWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { mount, fire } from '../../helpers/dom.js';
import { rigUI, mountShell } from '../../helpers/uiWorld.js';

const noStorage = { getItem: () => null, setItem: () => {} };
// Settings whose device asks for less motion or not (asks()), with the device's change watch in the test's hands.
function deviceSettings(root, asks) {
  const watch = { changed: null };
  const s = createSettings({ storage: noStorage, root, systemReducedMotion: () => asks(), watchSystem: (cb) => { watch.changed = cb; return () => { watch.changed = null; }; } });
  return { s, watch };
}

// A draw object that records its calls (and still draws), on its own canvas.
function spyDraw() {
  const g = makeDraw(makeCanvas(64, 64).getContext('2d'), 1);
  const calls = [];
  for (const k of ['line', 'stroke', 'poly', 'radial', 'path', 'circ', 'ell', 'text']) {
    const f = g[k];
    g[k] = (...a) => { calls.push({ k, a }); return f(...a); };
  }
  return { g, calls };
}

describe('s4 motion settings and the Motion row', () => {
  it('says what the row is doing from the setting and the device, both ways, and drops Stage 3\'s mirrors', () => {
    const { root, cleanup } = mount();
    try {
      let asks = true;
      const { s, watch } = deviceSettings(root, () => asks);
      expect(motionStatus(s)).toEqual({ setting: 'system', level: 'gentle', device: true, asks: true });
      expect(MOTION4_TEXT.status(motionStatus(s))).toBe('Motion: Gentle (your device asks for less motion)');
      expect(gentleTipDue(s)).toBe(true);
      asks = false;
      expect(MOTION4_TEXT.status(motionStatus(s))).toBe("Motion: Full (your device's setting)");
      expect(gentleTipDue(s)).toBe(false);
      s.set({ motion: 'gentle' });
      asks = true;
      expect([MOTION4_TEXT.status(motionStatus(s)), gentleTipDue(s)]).toEqual(['Motion: Gentle', false]);   // chosen here: no tip
      s.set({ motion: 'still' });
      expect(MOTION4_TEXT.status(motionStatus(s))).toBe('Motion: Still');
      expect(['reducedMotion' in s.get(), 'ambient' in s.get(), Object.keys(MOTION4_TEXT.levelLines)]).toEqual([false, false, ['full', 'gentle', 'still']]);
      expect(gentleTipDue({ get: () => ({}), reducedMotion: () => true })).toBe(false);   // a Stage 1-3 stand-in never asks
      s.destroy();
      expect(watch.changed).toBe(null);
    } finally { cleanup(); }
  });
  it('tells every subscriber when the device\'s own setting changes, as set() does', () => {
    const { root, cleanup } = mount();
    try {
      let asks = false;
      const { s, watch } = deviceSettings(root, () => asks);
      const heard = [];
      s.subscribe(() => heard.push(s.motionLevel()));
      asks = true;
      watch.changed();
      expect([heard, root.dataset.motion]).toEqual([['gentle'], 'gentle']);
      s.set({ motion: 'full' });
      expect(heard).toEqual(['gentle', 'full']);
      s.destroy();
    } finally { cleanup(); }
  });
  it('shows the four choices, the status line and what the level moves, following a change of the device at once', () => {
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      let asks = true;
      const { s, watch } = deviceSettings(root, () => asks);
      const menus = createMenuSheets({ store: createStore(INITIAL_UI_STATE), settings: s, toasts: { show() {} } });
      const body = root.querySelector('#body');
      menus.settings(body, { close() {} });
      const status = body.querySelector('.motion-status'), line = body.querySelector('.motion-line');
      const choices = [...body.querySelectorAll('.choice.motion')];
      expect(choices.map((b) => [b.dataset.value, b.textContent, b.getAttribute('aria-pressed')])).toEqual([
        ['system', 'Follow the device', 'true'], ['full', 'Full', 'false'], ['gentle', 'Gentle', 'false'], ['still', 'Still', 'false']]);
      expect([status.textContent, line.textContent, status.getAttribute('aria-live')]).toEqual([MOTION4_TEXT.status(motionStatus(s)), MOTION4_TEXT.levelLines.gentle, 'polite']);
      expect(status.textContent).toBe('Motion: Gentle (your device asks for less motion)');
      asks = false;
      watch.changed();                                                             // the device's setting changed: the words follow it
      expect([status.textContent, line.textContent]).toEqual(["Motion: Full (your device's setting)", MOTION4_TEXT.levelLines.full]);
      fire(choices[3], 'click');
      expect([status.textContent, line.textContent, choices[3].getAttribute('aria-pressed'), choices[0].getAttribute('aria-pressed')])
        .toEqual(['Motion: Still', MOTION4_TEXT.levelLines.still, 'true', 'false']);
      body.remove();                                                               // the sheet closed: the row stops listening
      s.set({ motion: 'full' });
      expect(status.textContent).toBe('Motion: Still');
      s.destroy();
    } finally { cleanup(); }
  });
  it('makes the interface\'s own transitions and animations instant under Gentle and Still, and leaves them under Full', async () => {
    const shell = await mountShell(390, 844);                                     // the stylesheet comes with the shell
    const was = document.body.dataset.motion;
    try {
      const probe = document.createElement('div');
      probe.setAttribute('style', 'transition: opacity 300ms ease 50ms; animation: cheer-in 200ms ease-out');
      shell.root.append(probe);
      const look = (level) => {
        document.body.dataset.motion = level;
        const cs = getComputedStyle(probe);
        return [cs.transitionDuration, cs.transitionDelay, cs.animationName];
      };
      // Under Full the chrome moves, even on a device that asks for less motion (ruling 16: the base's device rule in css/ui.css
      // only decides before data-motion is set).
      expect(look('full')).toEqual(['0.3s', '0.05s', 'cheer-in']);
      expect(look('gentle')).toEqual(['0s', '0s', 'none']);
      expect(look('still')).toEqual(['0s', '0s', 'none']);
    } finally {
      if (was === undefined) delete document.body.dataset.motion; else document.body.dataset.motion = was;
      shell.cleanup();
    }
  });
});

describe('s4 motion Gentle tip', () => {
  const settingsAsking = (asks) => createSettings({ storage: noStorage, root: document.body, systemReducedMotion: () => asks, watchSystem: () => () => {} });
  it('has its words and its own trigger, short enough for a tip', () => {
    const tip = TIPS.find((t) => t.id === 'gentle_motion');
    expect([tip.trigger, tip.priority, TIP_TEXT.gentle_motion]).toEqual(['gentleMotion', false, 'Your device asks for less motion, so the city moves gently. Settings → Motion changes it.']);
    expect(TIP_TEXT.gentle_motion.split(/\s+/).length).toBeLessThanOrEqual(20);
  });
  // M7 (final review): How to play lists every tip on every device, so the Gentle tip's line there must be true on any device
  // and at any level: it states motionLevelOf's rule, checked both ways.
  it('lists the Gentle tip in How to play by its rule, true whether or not the device asks and at any level', () => {
    expect(TIP_HELP_TEXT.gentle_motion).toBe('While Settings → Motion follows the device, a device that asks for less motion moves the city gently.');
    expect([motionLevelOf('system', true), motionLevelOf('system', false), motionLevelOf('full', true), motionLevelOf('still', true)]).toEqual(['gentle', 'full', 'full', 'still']);
    for (const asks of [true, false]) {
      const { root, cleanup } = mount('<div id="body"></div>');
      const settings = settingsAsking(asks);
      try {
        createMenuSheets({ store: createStore(INITIAL_UI_STATE), settings, toasts: { show() {} } }).help(root.querySelector('#body'), { close() {} });
        const items = [...root.querySelectorAll('.tips-list li')].map((li) => li.textContent);
        expect([asks, items.includes(TIP_HELP_TEXT.gentle_motion), items.includes(TIP_TEXT.gentle_motion), items.length]).toEqual([asks, true, false, TIPS.length]);
      } finally { cleanup(); settings.destroy(); }
    }
  });
  it('withdraws a shown Gentle tip once its words stop being true (a level is chosen)', async () => {
    let t = 0;
    const settings = settingsAsking(true);
    settings.set({ seenTips: TIPS.map((x) => x.id).filter((id) => id !== 'gentle_motion') });
    const r = await rigUI({ width: 1280, height: 800, now: () => t, settings });
    try {
      r.renderer.renderFrame = () => {};
      t = TIP_FIRST_DELAY_MS + 1;
      r.frame(t);
      expect(r.ui.tips.current()).toBe('gentle_motion');
      r.frame(t + 100);
      expect(r.ui.tips.current()).toBe('gentle_motion');                          // still true: it stays
      settings.set({ motion: 'full' });
      r.frame(t + 200);
      expect(r.ui.tips.current()).toBe(null);
    } finally { r.cleanup(); settings.destroy(); }
  });
  it('shows once, after the first 10 s, on a device that asks for less motion; never when it does not, or when a level is chosen', async () => {
    for (const [asks, motion, want] of [[true, null, 'gentle_motion'], [false, null, null], [true, 'gentle', null], [true, 'still', null]]) {
      let t = 0;
      const settings = settingsAsking(asks);
      if (motion) settings.set({ motion });
      const r = await rigUI({ width: 1280, height: 800, now: () => t, settings });
      try {
        r.renderer.renderFrame = () => {};
        r.frame(0);
        expect(r.ui.tips.current()).toBe(null);                                   // never in the first 10 s
        t = TIP_FIRST_DELAY_MS + 1;
        r.frame(t);
        expect([asks, motion, r.ui.tips.current()]).toEqual([asks, motion, want]);
        if (want) {
          expect(r.root.querySelector('#tip .text').textContent).toBe(TIP_TEXT.gentle_motion);
          r.ui.tips.dismiss();
          t += 600000;
          r.frame(t);
          expect(r.ui.tips.current()).toBe(null);                                 // once per device
          expect(settings.get().seenTips.includes('gentle_motion')).toBe(true);
        }
      } finally { r.cleanup(); settings.destroy(); }
    }
  });
  it('waits while a phone\'s game is paused, and shows once it runs', async () => {
    let t = 0;
    const settings = settingsAsking(true);
    settings.set({ seenTips: TIPS.map((x) => x.id).filter((id) => id !== 'gentle_motion') });   // only the Gentle tip is news
    const r = await rigUI({ width: 390, height: 844, now: () => t, settings });
    try {
      r.renderer.renderFrame = () => {};
      r.world.speed = 0;
      t = TIP_FIRST_DELAY_MS + 1;
      r.frame(t);
      expect(r.ui.tips.current()).toBe(null);
      r.world.speed = 1;
      r.frame(t + 1000);
      expect(r.ui.tips.current()).toBe('gentle_motion');
    } finally { r.cleanup(); settings.destroy(); }
  });
});

describe('s4 motion Gentle effects', () => {
  it('fades the upgrade glow, the downgrade pulse and the well ring in place, keeps labels still, and drops puffs and the rise', () => {
    let level = 'gentle';
    const fx = createEffects({ reducedMotion: () => level !== 'full', motionLevel: () => level });
    const w = makeTestWorld();
    const h = addRaw(w, 'house', 5, 5, { tier: 2, residents: 8 });
    fx.puff(1, 1, 0);
    fx.rise(h.id, 5, 5, 1, 1, 0);
    fx.ripple(3, 3, 0);
    fx.sparkle(2, 2, '#E2B13C', 0);
    fx.fromEvents(w, [{ type: 'upgrade', id: h.id, from: 1, to: 2 }, { type: 'downgrade', id: h.id, from: 3, to: 2 }], 0);
    const kinds = fx.active(0).map((e) => [e.kind, Boolean(e.still)]);
    expect(kinds).toEqual([['ripple', true], ['sparkle', true], ['glow', true], ['label', false], ['pulse', true], ['label', false]]);
    expect([fx.motion, fx.labelLift(0.5), fx.risingIds(0, w).size]).toEqual(['gentle', 0, 0]);
    // In place: the glow's ring keeps its width, the pulse and the ring keep their size; only their opacity falls.
    const shapes = (t) => {
      const s = spyDraw();
      fx.draw(s.g, t, w);
      return s.calls.filter((c) => c.k === 'poly' && c.a[1] === 'none').map((c) => [c.a[0].map((q) => q.map((v) => Math.round(v * 10))), c.a[2].strokeWidth]);
    };
    expect(shapes(100)).toEqual(shapes(EFFECT_MS.ripple - 50));
    level = 'still';
    fx.glow(0, 0, 0);
    fx.pulse(0, 0, 0);
    fx.ripple(0, 0, 0);
    fx.puff(0, 0, 0);
    expect(fx.active(0).length).toBe(6);                                          // Still adds none of them
    level = 'full';
    fx.glow(0, 0, 0);
    fx.puff(0, 0, 0);
    expect(fx.active(0).slice(6).map((e) => [e.kind, Boolean(e.still)])).toEqual([['glow', false], ['puff', false]]);
    expect(fx.labelLift(0.5)).toBe(5);
  });
  it('keeps Stage 1-3 callers as they were: reducedMotion alone reads as Full or Still', () => {
    expect([createEffects({ reducedMotion: false }).motion, createEffects({ reducedMotion: true }).motion]).toEqual(['full', 'still']);
    const fx = createEffects({ reducedMotion: true });
    fx.glow(0, 0, 0);
    fx.ripple(0, 0, 0);
    expect(fx.count(0)).toBe(0);
  });
  it('wires the game\'s effects, ambient and flames to the Motion level (createUI)', async () => {
    const r = await rigUI();
    try {
      const seen = [];
      const render = r.renderer.renderFrame;
      r.renderer.renderFrame = (world, cam, opts) => { seen.push(opts); return render(world, cam, opts); };
      for (const motion of ['full', 'gentle', 'still']) {
        r.ui.settings.set({ motion });
        r.frame(1000);
        expect([motion, r.ui.effects.motion]).toEqual([motion, motion]);
      }
      expect(seen.length).toBe(3);
      // drawFires is handed the level: a burning hut shows "Burning" under Gentle and Still, never under Full.
      const hut = Object.values(r.world.buildings).find((b) => b.type === 'house' && b.residents > 0);
      hut.fire = { stage: 'blaze', days: 1, need: 2, fought: 0 };
      const words = (opts) => { const s = spyDraw(); opts.fire(s.g, { x0: 0, y0: 0, x1: 63, y1: 63 }); return s.calls.filter((c) => c.k === 'text').map((c) => c.a[1]); };
      expect(seen.map(words)).toEqual([[], [ART_TEXT.burning], [ART_TEXT.burning]]);
    } finally { r.cleanup(); }
  });
});

describe('s4 motion Gentle flames', () => {
  const burning = (stage) => {
    const w = makeTestWorld({ fertile: [] });
    const b = addRaw(w, 'potter', 10, 10);
    b.fire = stage === 'fire' ? { stage: 'fire', days: 2, left: 9 } : { stage: 'blaze', days: 1, need: 2, fought: 0 };
    return { w, b };
  };
  const calls = (w, now, opts) => { const s = spyDraw(); drawFires(s.g, w, null, now, opts); return s.calls; };
  it('cross-fades two still shapes, one change a second at most, never thinning much', () => {
    let changes = 0, last = null;
    for (let t = 0; t <= 20000; t += 20) {
      const pairs = gentleShapes(t, 7);
      for (const [shape] of pairs) expect([1, 3].includes(shape)).toBe(true);
      const sq = pairs.reduce((s, [, a]) => s + a * a, 0);
      expect(Math.abs(sq - 1) < 1e-9).toBe(true);                                 // cos and sin weights
      expect(pairs.reduce((s, [, a]) => Math.max(s, a), 0)).toBeGreaterThan(0.7);
      const main = pairs.length === 1 ? pairs[0][0] : null;
      if (main !== null && last !== null && main !== last) changes++;
      if (main !== null) last = main;
    }
    expect([changes >= 18, changes <= 21]).toEqual([true, true]);                 // 20 s: about one change a second
    expect(gentleShapes(500, 1)).toEqual(gentleShapes(500 + 2 * GENTLE_FLAME_MS, 1));
    expect(gentleShapes(500, 1) === gentleShapes(500, 2)).toBe(false);
  });
  it('draws no embers under Gentle, with the "Burning" label, and its smoke fading in place within 4 px', () => {
    const { w } = burning('fire');
    const embers = (cs) => cs.filter((c) => c.k === 'circ' && c.a[2] === FLAME.ember).length;
    expect(embers(calls(w, 1000, { motion: 'full' }))).toBeGreaterThan(0);
    const gentle = calls(w, 1000, { motion: 'gentle' });
    expect([embers(gentle), gentle.filter((c) => c.k === 'text').map((c) => c.a[1])]).toEqual([0, [ART_TEXT.burning]]);
    expect(calls(w, 1000, { motion: 'full' }).filter((c) => c.k === 'text').length).toBe(0);
    // Each puff's centre over 3 s: under Gentle it moves GENTLE_SMOKE_RISE_PX up at most and never sideways.
    const puffs = (t, motion) => calls(w, t, { motion }).filter((c) => c.k === 'radial' && c.a[3] === FLAME.smoke).map((c) => c.a[0]);
    const spread = (motion) => {
      const series = [];
      for (let t = 0; t < 3000; t += 50) series.push(puffs(t, motion));
      return series[0].map((_, i) => {
        const xs = series.map((s) => s[i][0]), ys = series.map((s) => s[i][1]);
        return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
      });
    };
    for (const [dx, dy] of spread('gentle')) expect([dx < 1e-9, dy <= GENTLE_SMOKE_RISE_PX + 1e-9]).toEqual([true, true]);
    expect(Math.max(...spread('full').map(([, dy]) => dy))).toBeGreaterThan(20);
    const still = calls(w, 1000, { motion: 'still' });
    expect([still.filter((c) => c.k === 'radial').length, still.filter((c) => c.k === 'text').length]).toEqual([0, 1]);   // Stage 3's still flame
    expect(calls(w, 1000, { reducedMotion: true }).filter((c) => c.k === 'text').length).toBe(1);   // Stage 3's option: Still
  });
});

describe('s4 motion Gentle ambient', () => {
  const frame = (a, w, now) => { const s = spyDraw(); a.draw(s.g, w, { x0: 0, y0: 0, x1: 31, y1: 31 }, now); const n = s.calls.length; drawAmbientLate(s.g); return { ground: s.calls.slice(0, n), late: s.calls.slice(n) }; };
  const ambientAt = (level) => createAmbient({ enabled: () => level !== 'still', level: () => level });
  it('fades glints in place without drifting, holds the bank ripples still, and draws no reeds, crops or rare life', () => {
    const w = riverWorld();
    const rows = riverRows(w, 0, 31);
    let spot = null;
    for (let y = 4; y < 20 && !spot; y++) for (let x = 0; x < 32; x++) if (w.terrain[y * 32 + x] === 3 && glintAt(w, x, y, 0, rows)) { spot = [x, y]; break; }
    const ys = new Set(), alphas = new Set();
    for (let t = 0; t <= 8000; t += 100) { const g = glintAt(w, spot[0], spot[1], t, rows, false); if (g) { ys.add(g.y); alphas.add(Math.round(g.alpha * 100)); } }
    expect([ys.size, alphas.size > 10]).toEqual([1, true]);                       // one place, fading in and out
    const gentle = ambientAt('gentle');
    const reedColours = new Set(['#4F8A2E', '#6AA83A']);
    const strokes = (f) => f.ground.filter((c) => c.k === 'stroke');
    const a = frame(gentle, w, 1000), b = frame(gentle, w, 2500);
    expect(strokes(a).some((c) => reedColours.has(c.a[1]))).toBe(false);
    const ripples = (f) => strokes(f).filter((c) => c.a[1] !== '#FFFFFF' && !reedColours.has(c.a[1]) && c.a[3] === 0.45).map((c) => JSON.stringify(c.a[0]));
    expect(ripples(a).length).toBe(2);
    expect(ripples(a)).toEqual(ripples(b));                                       // the bank ripples hold still
    expect(frame(gentle, w, 1000).late.some((c) => c.k === 'poly' && c.a[1] === '#FBF3C6')).toBe(false);   // no crop band
    expect(gentle.treeSlot(w, 5, 9, 'palm', 1300)).toBe('palm');
    const full = ambientAt('full');
    expect(strokes(frame(full, w, 1000)).some((c) => reedColours.has(c.a[1]))).toBe(true);
    expect(frame(ambientAt('still'), w, 1000).ground.length).toBe(0);
  });
  it('fades kiln and chimney smoke in place, rising 4 px at most, with no lean', () => {
    const w = riverWorld();
    setRoad(w, 26, 16, 26, 30);
    addRaw(w, 'potter', 27, 18);
    staffAll(w);
    const series = (level) => {
      const a = ambientAt(level), out = [];
      for (let t = 0; t < 6000; t += 50) out.push(frame(a, w, t).late.filter((c) => c.k === 'radial').map((c) => c.a[0]));
      return out;
    };
    const g = series('gentle');
    const xs = new Set(), ys = [];
    for (const s of g) for (const q of s) { xs.add(Math.round(q[0] * 1000)); ys.push(q[1]); }
    expect([xs.size, Math.max(...ys) - Math.min(...ys) <= AMBIENT_RISE_PX + 1e-9, AMBIENT_RISE_PX]).toEqual([1, true, 4]);
    const f = series('full'), fy = [];
    for (const s of f) for (const q of s) fy.push(q[1]);
    expect(Math.max(...fy) - Math.min(...fy)).toBeGreaterThan(10);
  });
});

describe('s4 motion title backdrop', () => {
  it('drifts under Full only, stops at once when the level leaves Full, and starts again when it comes back', () => {
    const w = makeTestWorld({ size: 64 });
    w.tradeEntry = { x: 30, y: 63 };
    const cam = createCamera({ x: 0, y: 0, zoom: 1 });
    let reduced = false, t = 0;
    const cc = createCameraControl({ cam, view: () => ({ width: 400, height: 300 }), reducedMotion: () => reduced, now: () => t });
    const backdrop = createBackdrop({ world: w, cam, cameraControl: cc, reducedMotion: () => reduced, driftMs: 1000, holdMs: 0 });
    const at = () => [Math.round(cam.x * 100), Math.round(cam.y * 100)];
    const start = at();
    backdrop.tick(0); cc.tick(0);
    t = 400; backdrop.tick(t); cc.tick(t);
    const moving = at();
    expect(moving === start || JSON.stringify(moving) === JSON.stringify(start)).toBe(false);   // Full: it drifts
    reduced = true;                                                                // Gentle (the device's setting changed)
    t = 500; backdrop.tick(t); cc.tick(t);
    const held = at();
    t = 900; backdrop.tick(t); cc.tick(t);
    t = 5000; backdrop.tick(t); cc.tick(t);
    expect(at()).toEqual(held);                                                    // it stopped where it was
    reduced = false;
    t = 5100; backdrop.tick(t); cc.tick(t);
    t = 5500; backdrop.tick(t); cc.tick(t);
    expect(JSON.stringify(at()) === JSON.stringify(held)).toBe(false);             // Full again: it drifts on
  });
});
