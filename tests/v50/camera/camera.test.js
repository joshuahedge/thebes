// Version 5.0 Task 6 (rulings 570-579): the smoother camera. Fling (Full, Gentle, Still, any touch stops it), Show me's glide and framing, a pinch and a zoom step that stay
// anchored under the fingers, double tap in and two-finger double tap out without disturbing taps in a tool, hit-testing through the chunk index, and the view cull that
// makes a big map cost what a small one does (the same pixels as a frame that drew everything).
import { describe, it, expect } from '../../harness.js';
import { createCamera, screenToTile, tileToScreen, MIN_ZOOM } from '../../../src/render/camera.js';
import { createCameraControl } from '../../../src/ui/cameraControl.js';
import { createGestures } from '../../../src/ui/gestures.js';
import { createMapInput } from '../../../src/ui/input.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { pickBuilding } from '../../../src/ui/pick.js';
import { buildingAt, allBuildings, createWorld } from '../../../src/sim/world.js';
import { createRenderer, collectObjects, cullControl, viewCull } from '../../../src/render/renderer.js';
import { createSpriteCache } from '../../../src/render/spriteCache.js';
import { buildStressCity } from '../../../src/dev/sampleCity.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { mount, fire } from '../../helpers/dom.js';
import { makeCanvas, canvasHash } from '../../helpers/canvas.js';
import { ZOOM_STEP, FLING_MIN_PX_S, FLING_TAU_MS, DOUBLE_TAP_MS, TWO_TAP_MS, SHOW_ME_GENTLE_MS, SHOW_ME_GLIDE_MS, SHOW_ME_MIN_ZOOM, DRAG_THRESHOLD_PX } from '../../../src/data/ui.js';
import { drawMarkers, CROWD } from '../../../src/render/markers.js';
import { roadlessPlotBadges } from '../../../src/render/overlays.js';
import { ART, slotFor } from '../../../src/render/art/registry.js';

const view = () => ({ width: 400, height: 300 });
const ctl = (level, cam = createCamera({ x: 20, y: 20, zoom: 1 }), clock = { t: 0 }) =>
  ({ cam, clock, cc: createCameraControl({ cam, view, reducedMotion: () => level !== 'full', motionLevel: () => level, now: () => clock.t }) });
// Runs the camera for ms at frame steps; returns the screen px the world slid (the tile under the middle, in screen px).
const slid = (cam, from) => { const a = tileToScreen(cam, view(), from.x, from.y); return { x: a[0] - 200, y: a[1] - 150 }; };
function runFling(level, vx, vy, step = 16, ms = 4000) {
  const { cam, clock, cc } = ctl(level);
  const start = { x: cam.x, y: cam.y };
  const started = cc.fling(vx, vy);
  let frames = 0;
  while (cc.animating && clock.t < ms) { clock.t += step; cc.tick(clock.t); frames++; }
  return { started, cam, d: slid(cam, start), ms: clock.t, stopped: !cc.animating, frames };
}

describe('v50 camera: fling', () => {
  it('Full: a swipe keeps panning in the swipe\'s direction, about speed x time constant in all, and slows to a stop', () => {
    const r = runFling('full', 1500, 0);
    expect(r.started).toBe(true);
    expect(r.stopped).toBe(true);
    const expected = 1500 * (FLING_TAU_MS.full / 1000);                  // the integral of the decaying speed
    expect(Math.abs(Math.abs(r.d.x) - expected) / expected).toBeLessThan(0.06);
    expect(r.d.x).toBeGreaterThan(0);                                   // the world slid right: it went the way the finger did
    expect(Math.abs(r.d.y)).toBeLessThan(1);
    expect(r.ms).toBeGreaterThan(500);                                  // a glide, not a jump...
    expect(r.ms).toBeLessThan(3000);                                    // ...that does come to rest
  });
  it('is the same distance at 60 and at 20 frames a second, and the speed only ever falls', () => {
    const a = runFling('full', 0, -1800, 16), b = runFling('full', 0, -1800, 50);
    expect(Math.abs(a.d.y - b.d.y)).toBeLessThan(Math.abs(a.d.y) * 0.03);
    const { cam, clock, cc } = ctl('full');
    cc.fling(1200, 600);
    let last = Infinity;
    for (let i = 0; i < 40; i++) {
      const before = { x: cam.x, y: cam.y };
      clock.t += 16; cc.tick(clock.t);
      const moved = slid(cam, before), stepPx = Math.hypot(moved.x, moved.y);
      expect(stepPx).toBeLessThanOrEqual(last + 1e-6);
      last = stepPx;
    }
  });
  it('Gentle goes a good deal shorter than Full for the same swipe, and Still not at all', () => {
    const full = runFling('full', 1500, 0), gentle = runFling('gentle', 1500, 0);
    expect(gentle.started).toBe(true);
    expect(Math.abs(gentle.d.x)).toBeLessThan(Math.abs(full.d.x) * 0.4);
    expect(Math.abs(gentle.d.x)).toBeGreaterThan(10);
    expect(gentle.ms).toBeLessThan(full.ms);
    const still = runFling('still', 1500, 0);
    expect(still.started).toBe(false);
    expect([still.d.x, still.d.y]).toEqual([0, 0]);
    expect(still.frames).toBe(0);
  });
  it('a slow lift leaves no fling, and the fastest swipe is capped', () => {
    expect(runFling('full', FLING_MIN_PX_S - 50, 0).started).toBe(false);
    const fast = runFling('full', 20000, 0), capped = runFling('full', 3500, 0);
    expect(Math.abs(fast.d.x - capped.d.x)).toBeLessThan(1);
  });
  it('any other move or a cancel (a touch, a key, the wheel) stops it at once', () => {
    const { cam, clock, cc } = ctl('full');
    cc.fling(2000, 0);
    clock.t += 16; cc.tick(clock.t);
    expect(cc.flinging).toBe(true);
    cc.cancel();
    const x = cam.x;
    expect([cc.flinging, cc.animating]).toEqual([false, false]);
    clock.t += 16; expect(cc.tick(clock.t)).toBe(false);
    expect(cam.x).toBe(x);
    cc.fling(2000, 0); cc.panTo(30, 30, 300);                           // a move begun replaces it
    expect(cc.flinging).toBe(false);
    cc.fling(2000, 0); cc.jumpTo(5, 5);
    expect(cc.flinging).toBe(false);
  });
});

describe('v50 camera: the input turns a swipe into a fling and a touch stops it', () => {
  function rig(level = 'full', mode = 'browse') {
    const { root, cleanup } = mount('<canvas id="c" width="400" height="300" style="width:400px;height:300px;display:block"></canvas>');
    const canvas = root.querySelector('canvas'), rect = canvas.getBoundingClientRect();
    const at = (x, y) => ({ clientX: rect.left + x, clientY: rect.top + y });
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    const clock = { t: 1000 };
    const cameraControl = createCameraControl({ cam, view, reducedMotion: () => level !== 'full', motionLevel: () => level, now: () => clock.t });
    const store = createStore({ ...INITIAL_UI_STATE, mode });
    const log = [];
    const actions = { tap: (e) => log.push(['tap', e.x, e.y]), secondary() {}, hover() {}, ghostDragStart: () => false, ghostDrag() {}, ghostDragEnd() {}, drawDrag: (e) => log.push(['draw', e.phase]), strokeDrag() {}, panStarted() {} };
    const input = createMapInput({ canvas, cam, view, cameraControl, store, actions, root, now: () => clock.t });
    const ev = (name, x, y, id = 1, type = 'touch') => fire(canvas, name, { ...at(x, y), pointerId: id, pointerType: type });
    return { cam, clock, cameraControl, store, log, ev, input, cleanup };
  }
  const swipe = (r, type = 'touch', restMs = 0) => {                      // 160 px in 80 ms: 2000 px/s
    r.ev('pointerdown', 100, 100, 1, type);
    for (let i = 1; i <= 8; i++) { r.clock.t += 10; r.ev('pointermove', 100 + i * 20, 100, 1, type); }
    r.clock.t += restMs;
    r.ev('pointerup', 260, 100, 1, type);
  };
  it('a quick swipe flings under Full, the fling keeps panning, and a touch stops it without making a tap', () => {
    const r = rig('full');
    swipe(r);
    expect(r.cameraControl.flinging).toBe(true);
    const x0 = r.cam.x;
    r.clock.t += 100; r.cameraControl.tick(r.clock.t);
    expect(r.cam.x).toBeLessThan(x0);                                   // still sliding the world right
    r.ev('pointerdown', 200, 150, 2);                                   // a touch lands on the moving map
    expect(r.cameraControl.flinging).toBe(false);
    r.ev('pointerup', 200, 150, 2);
    expect(r.log.some((e) => e[0] === 'tap')).toBe(false);              // it stopped the map; it did not tap what was under it
    r.ev('pointerdown', 200, 150, 3); r.ev('pointerup', 200, 150, 3);
    expect(r.log.filter((e) => e[0] === 'tap').length).toBe(1);         // the next touch is a tap as ever
    r.input.detach(); r.cleanup();
  });
  it('flings under Gentle (shorter), never under Still, never for a mouse, and not after the finger rested', () => {
    const g = rig('gentle'); swipe(g); expect(g.cameraControl.flinging).toBe(true); g.input.detach(); g.cleanup();
    const s = rig('still'); swipe(s); expect(s.cameraControl.flinging).toBe(false); s.input.detach(); s.cleanup();
    const m = rig('full'); swipe(m, 'mouse'); expect(m.cameraControl.flinging).toBe(false); m.input.detach(); m.cleanup();
    const rest = rig('full'); swipe(rest, 'touch', 150); expect(rest.cameraControl.flinging).toBe(false); rest.input.detach(); rest.cleanup();
    const slow = rig('full');
    slow.ev('pointerdown', 100, 100);
    for (let i = 1; i <= 8; i++) { slow.clock.t += 100; slow.ev('pointermove', 100 + i * 5, 100); }   // 50 px/s
    slow.ev('pointerup', 140, 100);
    expect(slow.cameraControl.flinging).toBe(false);
    slow.input.detach(); slow.cleanup();
  });
  it('a stroke in a drawing tool is not a pan, so it never flings', () => {
    const r = rig('full', 'drawing');
    swipe(r);
    expect(r.cameraControl.flinging).toBe(false);
    r.input.detach(); r.cleanup();
  });
});

describe('v50 camera: pinch and zoom steps stay anchored', () => {
  it('a pinch keeps the tile that was under the fingers\' midpoint under it as the fingers spread and drift', () => {
    const { root, cleanup } = mount('<canvas id="c" width="400" height="300" style="width:400px;height:300px;display:block"></canvas>');
    const canvas = root.querySelector('canvas'), rect = canvas.getBoundingClientRect();
    const cam = createCamera({ x: 20, y: 18, zoom: 1 });
    const cc = createCameraControl({ cam, view, reducedMotion: () => true });
    const input = createMapInput({ canvas, cam, view, cameraControl: cc, store: createStore({ ...INITIAL_UI_STATE }), actions: { tap() {}, secondary() {}, hover() {}, ghostDragStart: () => false, panStarted() {} }, root });
    const f = (name, id, x, y) => fire(canvas, name, { clientX: rect.left + x, clientY: rect.top + y, pointerId: id, pointerType: 'touch' });
    const a = [100, 150], b = [200, 150];
    const under = screenToTile(cam, view(), 150, 150), z0 = cam.zoom;
    f('pointerdown', 1, ...a); f('pointerdown', 2, ...b);
    let pa = a, pb = b;
    for (let i = 1; i <= 6; i++) {                                      // spreading from 100 px to about 166: under the zoom limit
      pa = [a[0] - i * 3, a[1] + i * 3]; pb = [b[0] + i * 8, b[1] + i * 4];
      f('pointermove', 1, ...pa); f('pointermove', 2, ...pb);
    }
    const mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
    const now = screenToTile(cam, view(), mid[0], mid[1]);
    expect(Math.abs(now.x - under.x)).toBeLessThan(1e-6);
    expect(Math.abs(now.y - under.y)).toBeLessThan(1e-6);
    const ratio = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) / 100;
    expect(Math.abs(cam.zoom - z0 * ratio)).toBeLessThan(1e-6);          // and the scale is the fingers' spread
    f('pointerup', 2, ...pb); f('pointerup', 1, ...pa);
    input.detach(); cleanup();
  });
  it('a zoom step (double tap, the + and - buttons) keeps the tile under its point under it at every frame, not only at the end', () => {
    const { cam, clock, cc } = ctl('full', createCamera({ x: 22, y: 19, zoom: 1 }));
    const at = [310, 80], under = screenToTile(cam, view(), at[0], at[1]);
    cc.zoomStep(ZOOM_STEP, at[0], at[1]);
    for (const t of [40, 90, 160, 250, 349, 350, 400]) {
      clock.t = t; cc.tick(t);
      const here = screenToTile(cam, view(), at[0], at[1]);
      expect(Math.abs(here.x - under.x) + Math.abs(here.y - under.y)).toBeLessThan(1e-6);
    }
    expect(Math.abs(cam.zoom - ZOOM_STEP)).toBeLessThan(1e-9);
    cc.zoomStep(1 / ZOOM_STEP, at[0], at[1]);
    for (const t of [450, 600, 800]) {
      clock.t = t; cc.tick(t);
      const here = screenToTile(cam, view(), at[0], at[1]);
      expect(Math.abs(here.x - under.x) + Math.abs(here.y - under.y)).toBeLessThan(1e-6);
    }
    expect(Math.abs(cam.zoom - 1)).toBeLessThan(1e-9);
  });
});

describe('v50 camera: double tap in, two-finger double tap out', () => {
  function g(opts = {}) {
    const log = []; let t = 0;
    const gs = createGestures({
      onTap: (e) => log.push(['tap', e.x, e.y]), onDoubleTap: (e) => log.push(['double', e.x, e.y]), onTwoFingerDoubleTap: (e) => log.push(['two', Math.round(e.x), Math.round(e.y)]),
      onPinchStart: () => log.push(['pinchStart']), onPinchEnd: () => log.push(['pinchEnd']),
    }, { now: () => t, ...opts });
    return { gs, log, at: (v) => { t = v; } };
  }
  const twoTap = (r, t0, moveBy = 0, hold = 60) => {
    r.at(t0); r.gs.pointerDown(1, 100, 100, 'touch'); r.gs.pointerDown(2, 160, 100, 'touch');
    if (moveBy) { r.at(t0 + 10); r.gs.pointerMove(1, 100 - moveBy, 100); }
    r.at(t0 + hold); r.gs.pointerUp(1, 100, 100); r.gs.pointerUp(2, 160, 100);
  };
  it('two quick two-finger taps are one two-finger double tap at the fingers\' midpoint; one is nothing, and it is never a tap', () => {
    const r = g();
    twoTap(r, 0);
    expect(r.log.filter((e) => e[0] === 'two' || e[0] === 'tap')).toEqual([]);
    twoTap(r, 200);
    expect(r.log.filter((e) => e[0] === 'two')).toEqual([['two', 130, 100]]);
    expect(r.log.some((e) => e[0] === 'tap')).toBe(false);
    twoTap(r, 600);                                                     // the pair is spent: a third is a first of the next
    expect(r.log.filter((e) => e[0] === 'two').length).toBe(1);
  });
  it('is not a double tap when the fingers moved (a pinch), stayed down too long, or the taps were far apart in time', () => {
    const moved = g(); twoTap(moved, 0, DRAG_THRESHOLD_PX + 6); twoTap(moved, 200); expect(moved.log.filter((e) => e[0] === 'two').length).toBe(0);
    const slow = g(); twoTap(slow, 0, 0, TWO_TAP_MS + 100); twoTap(slow, 700, 0, TWO_TAP_MS + 100); expect(slow.log.filter((e) => e[0] === 'two').length).toBe(0);
    const apart = g(); twoTap(apart, 0); twoTap(apart, DOUBLE_TAP_MS + 200); expect(apart.log.filter((e) => e[0] === 'two').length).toBe(0);
  });
  it('a double tap zooms in a step about the tap; two-finger double tap zooms out a step about the fingers', () => {
    const { root, cleanup } = mount('<canvas id="c" width="400" height="300" style="width:400px;height:300px;display:block"></canvas>');
    const canvas = root.querySelector('canvas'), rect = canvas.getBoundingClientRect();
    const cam = createCamera({ x: 20, y: 18, zoom: 1 });
    const cc = createCameraControl({ cam, view, reducedMotion: () => true });
    const store = createStore({ ...INITIAL_UI_STATE });
    let t = 0; const taps = [];
    const input = createMapInput({ canvas, cam, view, cameraControl: cc, store, actions: { tap: (e) => taps.push(e), secondary() {}, hover() {}, ghostDragStart: () => false, panStarted() {} }, root, now: () => t });
    const f = (name, id, x, y) => fire(canvas, name, { clientX: rect.left + x, clientY: rect.top + y, pointerId: id, pointerType: 'touch' });
    f('pointerdown', 1, 150, 120); f('pointerup', 1, 150, 120);
    f('pointerdown', 2, 152, 121); f('pointerup', 2, 152, 121);
    expect(Math.abs(cam.zoom - ZOOM_STEP)).toBeLessThan(1e-9);
    expect(taps.length).toBe(1);                                        // the first tap was a tap; the second was the double
    const z = cam.zoom, under = screenToTile(cam, view(), 200, 150);
    for (const [id, x] of [[3, 170], [4, 230]]) f('pointerdown', id, x, 150);
    for (const [id, x] of [[3, 170], [4, 230]]) f('pointerup', id, x, 150);
    for (const [id, x] of [[5, 170], [6, 230]]) f('pointerdown', id, x, 150);
    for (const [id, x] of [[5, 170], [6, 230]]) f('pointerup', id, x, 150);
    expect(Math.abs(cam.zoom - z / ZOOM_STEP)).toBeLessThan(1e-9);
    const now = screenToTile(cam, view(), 200, 150);
    expect(Math.abs(now.x - under.x) + Math.abs(now.y - under.y)).toBeLessThan(1e-6);
    input.detach(); cleanup();
  });
  it('with a tool open (the Route tap-tap, placing, plots) two taps stay two taps and nothing zooms', () => {
    for (const mode of ['drawing', 'placing', 'demolishing']) {
      const { root, cleanup } = mount('<canvas id="c" width="400" height="300" style="width:400px;height:300px;display:block"></canvas>');
      const canvas = root.querySelector('canvas'), rect = canvas.getBoundingClientRect();
      const cam = createCamera({ x: 20, y: 18, zoom: 1 });
      const cc = createCameraControl({ cam, view, reducedMotion: () => true });
      const taps = [];
      const input = createMapInput({ canvas, cam, view, cameraControl: cc, store: createStore({ ...INITIAL_UI_STATE, mode }), actions: { tap: (e) => taps.push(e), secondary() {}, hover() {}, ghostDragStart: () => false, panStarted() {} }, root });
      const f = (name, id, x, y) => fire(canvas, name, { clientX: rect.left + x, clientY: rect.top + y, pointerId: id, pointerType: 'touch' });
      f('pointerdown', 1, 150, 120); f('pointerup', 1, 150, 120);
      f('pointerdown', 2, 152, 121); f('pointerup', 2, 152, 121);
      expect([mode, taps.length, cam.zoom]).toEqual([mode, 2, 1]);
      input.detach(); cleanup();
    }
  });
});

describe('v50 camera: Show me glides and frames', () => {
  const target = { category: 'services', item: 'well', x: 13, y: 9.5 };
  it('Gentle (what headless Edge shows): a short glide that lands on the framing; Still: a jump; Full: a glide that lasts longer for a longer way', async () => {
    const gentle = await rigUI({ width: 390, height: 844 });
    try {
      gentle.ui.settings.set({ motion: 'gentle' });
      gentle.ui.cameraControl.jumpTo(26, 26);
      gentle.ui.showMeAt(target);
      expect(gentle.ui.cameraControl.animating).toBe(true);
      const mid = { x: gentle.cam.x, y: gentle.cam.y };
      expect([mid.x, mid.y]).toEqual([26, 26]);                         // not there yet
      gentle.ui.cameraControl.tick(1e9);
      expect(gentle.ui.cameraControl.animating).toBe(false);
      const c = gentle.screenOf(13, 9.5);
      expect(c.x > 0 && c.x < 390 && c.y > 48 && c.y < 844).toBe(true);   // framed on the phone
    } finally { gentle.cleanup(); }
    const still = await rigUI({ width: 390, height: 844 });
    try {
      still.ui.settings.set({ motion: 'still' });
      still.ui.cameraControl.jumpTo(26, 26);
      still.ui.showMeAt(target);
      expect(still.ui.cameraControl.animating).toBe(false);             // already there: no movement at all
      const c = still.screenOf(13, 9.5);
      expect(c.x > 0 && c.x < 390 && c.y > 48 && c.y < 844).toBe(true);
    } finally { still.cleanup(); }
  });
  it('Full glides for SHOW_ME_GLIDE_MS and more with distance; Gentle for SHOW_ME_GENTLE_MS; a plain pan under Gentle is still a jump (nothing else changed)', () => {
    const times = {};
    for (const level of ['full', 'gentle']) for (const far of [2, 40]) {
      const { cam, clock, cc } = ctl(level, createCamera({ x: 10, y: 10, zoom: 1 }));
      cc.glide(() => cc.panTo(10 + far, 10));
      expect(cc.animating).toBe(true);
      let n = 0; while (cc.animating && n < 2000) { clock.t += 1; cc.tick(clock.t); n++; }
      times[`${level}${far}`] = n;
      expect(cam.x).toBe(10 + far);
    }
    expect(times.full2).toBeGreaterThanOrEqual(SHOW_ME_GLIDE_MS);
    expect(times.full40).toBeGreaterThan(times.full2 + 100);
    expect(Math.abs(times.gentle2 - SHOW_ME_GENTLE_MS)).toBeLessThanOrEqual(2);
    expect(Math.abs(times.gentle40 - SHOW_ME_GENTLE_MS)).toBeLessThanOrEqual(2);
    const { cam, cc } = ctl('gentle');
    cc.panTo(30, 30);
    expect([cam.x, cam.y, cc.animating]).toEqual([30, 30, false]);
    const st = ctl('still');
    st.cc.glide(() => st.cc.panTo(33, 33));
    expect([st.cam.x, st.cam.y, st.cc.animating]).toEqual([33, 33, false]);
  });
  it('frames a place the view was zoomed out from: it comes in to the minimum framing zoom, and never goes out', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.cam.zoom = MIN_ZOOM;
      r.ui.showMeAt(target);
      r.ui.cameraControl.tick(1e9);
      expect(r.cam.zoom).toBe(SHOW_ME_MIN_ZOOM);
      r.cam.zoom = 1.5;
      r.ui.showMeAt(target);
      r.ui.cameraControl.tick(1e9);
      expect(r.cam.zoom).toBe(1.5);
    } finally { r.cleanup(); }
  });
});

describe('v50 camera: hit-testing through the chunk index', () => {
  // The old pickBuilding, scanning every building, as the reference (the same tile, the same diagonal look for a tall sprite, then the scan).
  function brute(world, cam, v, sx, sy, radius = 1.5) {
    const t = screenToTile(cam, v, sx, sy), tx = Math.floor(t.x), ty = Math.floor(t.y);
    const at = (x, y) => (x >= 0 && y >= 0 && x < world.size && y < world.size ? buildingAt(world, x, y) : null);
    const direct = at(tx, ty);
    if (direct) return direct;
    for (let k = 1; k <= 2; k++) {
      const b = at(tx + k, ty + k);
      const def = b ? ART[slotFor(b)] : null;
      if (b && (def ? def.height : 0) >= 16 * k - 8) return b;
    }
    let best = null, bestDist = cam.zoom <= MIN_ZOOM + 1e-9 ? Infinity : radius;
    for (const b of allBuildings(world)) { const d = Math.hypot(b.x + b.w / 2 - t.x, b.y + b.d / 2 - t.y); if (d < bestDist) { bestDist = d; best = b; } }
    return best;
  }
  it('finds what a scan of every building finds: under the finger, the nearest within reach, the nearest anywhere at minimum zoom', () => {
    const w = makeTestWorld({ size: 64, fertile: [] });
    let s = 5; const rnd = (n) => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 8) % n; };
    for (let k = 0; k < 90; k++) { const x = 2 + rnd(30) * 2, y = 2 + rnd(30) * 2; if (!buildingAt(w, x, y)) addRaw(w, k % 3 ? 'well' : 'granary', x, y); }
    const v = { width: 800, height: 600 };
    let checked = 0, found = 0;
    for (const zoom of [MIN_ZOOM, 0.75, 1, 2]) {
      const cam = createCamera({ x: 20 + rnd(24), y: 20 + rnd(24), zoom });
      for (let i = 0; i < 160; i++) {
        const sx = rnd(800), sy = rnd(600);
        const a = pickBuilding(w, cam, v, sx, sy), b = brute(w, cam, v, sx, sy);
        checked++;
        if (a) found++;
        expect([zoom, i, a ? a.id : null]).toEqual([zoom, i, b ? b.id : null]);
      }
    }
    expect(checked).toBe(640);
    expect(found).toBeGreaterThan(200);
  });
  it('at minimum zoom a tap anywhere still reaches the nearest building, however far', () => {
    const w = makeTestWorld({ size: 64, fertile: [] });
    const lone = addRaw(w, 'well', 60, 60);
    const cam = createCamera({ x: 5, y: 5, zoom: MIN_ZOOM });
    const v = { width: 800, height: 600 };
    const [sx, sy] = tileToScreen(cam, v, 3.5, 4.5);
    expect(pickBuilding(w, cam, v, sx, sy)).toBe(lone);
    expect(pickBuilding(w, createCamera({ x: 5, y: 5, zoom: 1 }), v, sx, sy)).toBe(null);
    expect(pickBuilding(makeTestWorld({ size: 64, fertile: [] }), cam, v, sx, sy)).toBe(null);   // an empty city: nothing, and it ends
  });
});

describe('v50 camera: the view cull', () => {
  const big = (size) => buildStressCity(createWorld({ seed: 3, size }));
  const V = { width: 390, height: 844 };
  it('leaves out only sprites wholly off the canvas, and keeps every one that touches it', () => {
    const w = big(64);
    for (const [zoom, x, y] of [[0.5, 32, 32], [1, 20, 44], [2, 40, 30], [0.75, 10, 10]]) {
      const cam = createCamera({ x, y, zoom });
      const range = { x0: 0, y0: 0, x1: 63, y1: 63 };
      const all = collectObjects(w, range, [], ART), seen = collectObjects(w, range, [], ART, { cam, view: V });
      const ids = new Set(seen.map((o) => o.id));
      expect(seen.length).toBeLessThan(all.length);
      const k = 2 * zoom;
      for (const o of all) {
        if (!o.def || !o.def.bounds) { expect(ids.has(o.id)).toBe(true); continue; }
        const [cx, cy] = [(o.x - o.y) * 16, (o.x + o.y) * 8], c0 = [(cam.x - cam.y) * 16, (cam.x + cam.y) * 8];
        const sx = V.width / 2 + (cx - c0[0]) * k, sy = V.height / 2 + (cy - c0[1]) * k, b = o.def.bounds;
        const touches = sx + b[2] * k >= 0 && sx + b[0] * k <= V.width && sy + b[3] * k >= 0 && sy + b[1] * k <= V.height;
        if (touches) expect(ids.has(o.id)).toBe(true);
      }
      expect(seen.every((o, i) => i === 0 || seen[i - 1].key <= o.key)).toBe(true);   // still in depth order
    }
  });
  it('draws the same pixels as a frame that drew everything, at several zooms and places', () => {
    const w = big(64);
    const frame = (cam, on) => {
      cullControl.on = on;
      try {
        const canvas = makeCanvas(V.width, V.height);
        const renderer = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: Infinity, spriteCache: createSpriteCache() });
        renderer.renderFrame(w, cam, { view: V });
        renderer.renderFrame(w, cam, { view: V });
        return canvasHash(canvas);
      } finally { cullControl.on = true; }
    };
    for (const [zoom, x, y] of [[0.5, 32, 32], [0.5, 12, 50], [1, 30, 30], [1.5, 44, 20], [2, 8, 8]]) {
      const cam = createCamera({ x, y, zoom });
      expect([zoom, x, y, frame(cam, true)]).toEqual([zoom, x, y, frame(cam, false)]);
    }
  });
  it('a Large map zoomed out draws about the sprites a Normal one does (the frame-time proxy: at most 1.25x), where it drew 1.4x before', () => {
    const counts = {};
    for (const size of [64, 80]) for (const on of [true, false]) {
      cullControl.on = on;
      try {
        const w = big(size);
        const canvas = makeCanvas(V.width, V.height);
        const renderer = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: Infinity, spriteCache: createSpriteCache() });
        const cam = createCamera({ x: size / 2, y: size / 2, zoom: 0.5 });
        renderer.renderFrame(w, cam, { view: V });
        const s = renderer.renderFrame(w, cam, { view: V });
        counts[`${size}${on ? 'on' : 'off'}`] = { sprites: s.sprites, chunks: s.chunks };
      } finally { cullControl.on = true; }
    }
    expect(counts['80on'].sprites / counts['64on'].sprites).toBeLessThanOrEqual(1.25);
    expect(counts['80off'].sprites / counts['64off'].sprites).toBeGreaterThan(1.25);   // the premise: without it the gap is real
    expect(counts['80on'].sprites).toBeLessThan(counts['80off'].sprites * 0.6);
    expect(counts['80on'].chunks).toBeLessThan(counts['80off'].chunks);                // chunks off the canvas are not drawn
  });
});

describe('v50 camera: a crowd of roadless plots seen from far out', () => {
  const plotsWorld = (n) => { const w = makeTestWorld({ size: 64, fertile: [] }); for (let i = 0; i < n; i++) addRaw(w, 'house', 4 + (i % 15), 4 + Math.floor(i / 15), { tier: 0 }); return w; };
  const drawn = (w, cssScale, cull = null) => {
    let polys = 0;
    const g = { cull, cssScale, scale: cssScale, ctx: { setLineDash() {} }, poly() { polys++; }, polys() { polys++; } };
    drawMarkers(g, w, [], { x0: 0, y0: 0, x1: 63, y1: 63 }, []);
    return polys;
  };
  it('keeps every plot\'s dashed outline up to CROWD.plots, and above that leaves a crowd to the road badges at the overview zoom only', () => {
    const few = plotsWorld(CROWD.plots), many = plotsWorld(CROWD.plots + 20);
    const far = 2 * CROWD.zoom, near = 2 * 1;                           // cssScale is ART_SCALE x zoom
    expect(drawn(few, far)).toBe(3 * CROWD.plots);                      // three passes a plot, all of them
    expect(drawn(many, far)).toBe(0);                                   // a crowd, far out: badges only
    expect(drawn(many, near)).toBe(3 * (CROWD.plots + 20));             // nearer, the outlines as ever
    expect(roadlessPlotBadges(many).length).toBeGreaterThan(0);          // and the badges are what says "road" there
  });
  it('does not draw the plots that are off the canvas', () => {
    const w = plotsWorld(60);
    const cam = createCamera({ x: 4, y: 4, zoom: 1 });
    const cull = viewCull(cam, { width: 200, height: 150 });
    const seen = drawn(w, 2, cull);
    expect(seen).toBeGreaterThan(0);
    expect(seen).toBeLessThan(3 * 60);
    expect(drawn(w, 2, null)).toBe(3 * 60);
  });
});
