// Version 10.0, Track M (ruling 2301, C12): a double tap on a building zooms and selects nothing; a single tap still selects (after the double-tap window), and a tap that
// needs no wait (a tool open, bare ground, a mouse click) is instant.
import { describe, it, expect } from '../../harness.js';
import { createMapInput } from '../../../src/ui/input.js';
import { createCamera } from '../../../src/render/camera.js';
import { createCameraControl } from '../../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { DOUBLE_TAP_MS } from '../../../src/data/ui.js';
import { mount, fire } from '../../helpers/dom.js';
import { bootAt, wait } from './helpers.js';

function rig({ mode = 'browse', waitsFor = () => true } = {}) {
  const { root, cleanup } = mount('<canvas id="c" width="400" height="300" style="width:400px;height:300px;display:block"></canvas>');
  const canvas = root.querySelector('canvas');
  const rect = canvas.getBoundingClientRect();
  const at = (x, y) => ({ clientX: rect.left + x, clientY: rect.top + y });
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const view = () => ({ width: 400, height: 300 });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: () => true });
  const store = createStore({ ...INITIAL_UI_STATE, mode });
  const clock = { t: 0 }, timers = [];
  const log = [];
  const actions = { tap: (e) => log.push(['tap', e.type]), secondary() {}, hover() {}, ghostDragStart: () => false, panStarted: () => log.push(['panStarted']), strokeDrag() {}, drawDrag() {} };
  const input = createMapInput({
    canvas, cam, view, cameraControl, store, actions, root, now: () => clock.t, tapWait: DOUBLE_TAP_MS, waitsFor,
    setTimer: (f, ms) => { const h = { f, at: clock.t + ms, live: true }; timers.push(h); return h; }, clearTimer: (h) => { h.live = false; },
  });
  const ev = (name, x, y, type = 'touch', id = 1) => fire(canvas, name, { ...at(x, y), pointerId: id, pointerType: type });
  const tap = (type = 'touch', x = 100, y = 80) => { ev('pointerdown', x, y, type); clock.t += 30; ev('pointerup', x, y, type); };
  const advance = (ms) => { clock.t += ms; for (const h of timers) if (h.live && h.at <= clock.t) { h.live = false; h.f(); } };
  return { cam, log, store, tap, ev, advance, clock, input, cleanup };
}

describe('v100 m: a double tap zooms without selecting (C12)', () => {
  it('holds a finger tap for the window, then counts it', () => {
    const r = rig();
    r.tap();
    expect(r.log).toEqual([]);
    r.advance(DOUBLE_TAP_MS - 40);
    expect(r.log).toEqual([]);
    r.advance(50);
    expect(r.log).toEqual([['tap', 'touch']]);
    r.input.detach(); r.cleanup();
  });
  it('zooms on the second tap and never counts the first', () => {
    const r = rig();
    const z0 = r.cam.zoom;
    r.tap(); r.advance(100); r.tap();
    r.advance(1000);
    expect(r.log).toEqual([]);
    expect(r.cam.zoom).toBeGreaterThan(z0);
    r.input.detach(); r.cleanup();
  });
  it('counts the first of two taps far apart before the second, in order', () => {
    const r = rig();
    r.tap('touch', 50, 50); r.advance(100); r.tap('touch', 300, 200);
    expect(r.log).toEqual([['tap', 'touch']]);   // the first counted when the second arrived; the second waits its own window
    r.advance(DOUBLE_TAP_MS + 10);
    expect(r.log).toEqual([['tap', 'touch'], ['tap', 'touch']]);
    r.input.detach(); r.cleanup();
  });
  it('counts a waiting tap at once when a drag starts', () => {
    const r = rig();
    r.tap(); r.advance(60);
    r.ev('pointerdown', 100, 80); r.ev('pointermove', 160, 80); r.ev('pointermove', 200, 80);
    expect(r.log[0]).toEqual(['tap', 'touch']);
    r.ev('pointerup', 200, 80);
    r.input.detach(); r.cleanup();
  });
  it('does not slow a tap that needs no wait: a mouse click, a tap in a tool, a tap where nothing is to select', () => {
    const mouse = rig();
    mouse.tap('mouse');
    expect(mouse.log).toEqual([['tap', 'mouse']]);
    mouse.input.detach(); mouse.cleanup();
    for (const mode of ['drawing', 'placing', 'demolishing']) {
      const r = rig({ mode });
      r.tap();
      expect([mode, r.log]).toEqual([mode, [['tap', 'touch']]]);
      r.input.detach(); r.cleanup();
    }
    const bare = rig({ waitsFor: () => false });
    bare.tap();
    expect(bare.log).toEqual([['tap', 'touch']]);
    bare.input.detach(); bare.cleanup();
  });
});

describe('v100 m: a held tap never lands in a tool (final review M-1)', () => {
  it('drops the held tap when a tool opens before the timer fires', () => {
    const r = rig();
    r.tap();
    r.store.set({ mode: 'drawing' });
    r.advance(DOUBLE_TAP_MS + 50);
    expect(r.log).toEqual([]);
    r.input.detach(); r.cleanup();
  });
  it('drops the held tap when the timer fires with a tool open and no change event reached it', () => {
    const r = rig();
    r.tap();
    r.store.set({ mode: 'drawing' }); r.input.detach();   // nothing listens any more: the timer's own check must hold
    r.advance(DOUBLE_TAP_MS + 50);
    expect(r.log).toEqual([]);
    r.cleanup();
  });
  it('drops the held tap when a later tap flushes it into a tool', () => {
    const r = rig();
    r.tap();
    r.store.set({ mode: 'placing' });
    r.tap('touch', 200, 150);
    expect(r.log).toEqual([['tap', 'touch']]);   // only the new tap, which is the tool's own
    r.input.detach(); r.cleanup();
  });
});

describe('v100 m: the double tap in the game, at 375x667 and 390x844, 100% and 150%', () => {
  for (const [width, height] of [[375, 667], [390, 844]]) {
    for (const textSize of [100, 150]) {
      it(`${width}x${height} t${textSize}: a double tap on a building zooms and leaves it unselected; a single tap selects it after the window`, async () => {
        const r = await bootAt('skipTitle=1&seed=11&sample=1', width, height, textSize);
        try {
          const g = r.api.game(), cam = g.cam || window.__thebes.cam;
          const b = Object.values(g.world.buildings).find((q) => q.type === 'well' || q.type === 'house');
          cam.x = b.x + 0.5; cam.y = b.y + 0.5; cam.zoom = 1;
          const canvas = r.root.querySelector('#map'), box = canvas.getBoundingClientRect();
          const at = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
          const touch = (name) => fire(canvas, name, { ...at, pointerId: 7, pointerType: 'touch', buttons: name === 'pointerup' ? 0 : 1 });
          const tap = async () => { touch('pointerdown'); await wait(20); touch('pointerup'); };
          const z0 = cam.zoom;
          await tap(); await wait(80); await tap();
          await wait(DOUBLE_TAP_MS + 100);
          expect([width, textSize, g.ui.store.get().mode, cam.zoom > z0]).toEqual([width, textSize, 'browse', true]);
          await tap();
          const early = g.ui.store.get().mode;                    // inside the window nothing is selected yet
          await wait(DOUBLE_TAP_MS + 120);
          expect([width, textSize, early, g.ui.store.get().mode]).toEqual([width, textSize, 'browse', 'selected']);
        } finally { r.cleanup(); }
      });
    }
  }
});
