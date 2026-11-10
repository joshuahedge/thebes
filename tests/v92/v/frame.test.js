// Version 9.2, Track V (rulings 1850-1852): frame the city. Built-area bounds go in and a camera that holds them comes out; the F key and the Map button's double tap both do it; a city opens
// framed when its built area is off the opening view and does not move when it is already in it.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { cityBounds, fitCamera, boundsOutside, createCameraControl, FRAME_MAX_ZOOM } from '../../../src/ui/cameraControl.js';
import { createCamera, tileToScreen, MIN_ZOOM } from '../../../src/render/camera.js';
import { KEYS } from '../../../src/data/ui.js';
import { matchKey } from '../../../src/ui/keyboard.js';
import { HELP_ROWS } from '../../../src/ui/text.js';
import { createCorners } from '../../../src/ui/corners.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { mount, fire } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';

const view = { width: 375, height: 667 };
const insetsPhone = { top: 120, right: 0, bottom: 200, left: 0 };

function inside(cam, v, b, ins, margin) {
  const k = [[b.x0, b.y0], [b.x1 + 1, b.y0], [b.x1 + 1, b.y1 + 1], [b.x0, b.y1 + 1]].map(([x, y]) => tileToScreen(cam, v, x, y));
  return k.every(([sx, sy]) => sx >= ins.left + margin - 0.5 && sx <= v.width - ins.right - margin + 0.5 && sy >= ins.top + margin - 0.5 && sy <= v.height - ins.bottom - margin + 0.5);
}

describe('v92 v frame the city: the bounds and the camera', () => {
  it('cityBounds covers every building and road tile, and the extra points; null for an empty map', () => {
    const w = makeTestWorld();
    expect(cityBounds(w)).toBe(null);
    setRoad(w, 10, 12, 20, 12);
    addRaw(w, 'potter', 14, 8);
    const b = cityBounds(w);
    expect(b.x0).toBe(10); expect(b.x1).toBe(20); expect(b.y0).toBeLessThanOrEqual(8); expect(b.y1).toBe(12);
    expect(cityBounds(w, [[3, 30]])).toEqual({ ...b, x0: 3, y1: 30 });
  });

  it('a city that fits is centred at the opening zoom and never zoomed in past it', () => {
    const b = { x0: 20, y0: 20, x1: 22, y1: 22 };
    const cam = fitCamera(view, b, { insets: insetsPhone, margin: 48 });
    expect(cam.zoom).toBe(FRAME_MAX_ZOOM);
    expect(inside(cam, view, b, insetsPhone, 48)).toBe(true);
  });

  it('a city bigger than the screen at zoom 1 is zoomed out until its corners are in the free map', () => {
    const b = { x0: 10, y0: 10, x1: 17, y1: 17 };
    const cam = fitCamera(view, b, { insets: insetsPhone, margin: 48 });
    expect(cam.zoom).toBeLessThan(FRAME_MAX_ZOOM);
    expect(cam.zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
    if (cam.zoom > MIN_ZOOM + 1e-9) expect(inside(cam, view, b, insetsPhone, 48)).toBe(true);
    const wide = fitCamera({ width: 1280, height: 800 }, b, { insets: { top: 56, right: 320, bottom: 0, left: 0 }, margin: 48 });
    expect(wide.zoom).toBeGreaterThan(cam.zoom);                                   // more room, closer in
    expect(inside(wide, { width: 1280, height: 800 }, b, { top: 56, right: 320, bottom: 0, left: 0 }, 48)).toBe(true);
  });

  it('keeps to the least zoom and centres a city bigger than that', () => {
    const b = { x0: 0, y0: 0, x1: 119, y1: 119 };
    const cam = fitCamera(view, b);
    expect(cam.zoom).toBe(MIN_ZOOM);
    expect(Math.abs(cam.x - 60)).toBeLessThan(1.6);                                 // (a tile or so up the screen: buildings stand above their footprints)
    expect(Math.abs(cam.y - 60)).toBeLessThan(1.6);
  });

  it('boundsOutside says whether the camera as it is holds the bounds, and a framed camera holds them', () => {
    const b = { x0: 10, y0: 10, x1: 17, y1: 17 };
    expect(boundsOutside(createCamera({ x: 100, y: 100, zoom: 1 }), view, b)).toBe(true);
    const fit = fitCamera(view, b);
    expect(boundsOutside(createCamera({ x: fit.x, y: fit.y, zoom: fit.zoom }), view, b)).toBe(false);
  });

  it('cameraControl.frameCity moves the camera there (a jump at ms 0) and says whether there was a city', () => {
    const cam = createCamera({ x: 90, y: 90, zoom: 1 });
    const control = createCameraControl({ cam, view: () => view });
    expect(control.frameCity(null)).toBe(false);
    const b = { x0: 10, y0: 10, x1: 17, y1: 17 };
    expect(control.frameCity(b, { top: 0, right: 0, bottom: 0, left: 0 }, 48, 0)).toBe(true);
    expect(boundsOutside(cam, view, b)).toBe(false);
  });
});

describe('v92 v frame the city: the key and the double tap', () => {
  it('F is free: no other shortcut uses it, and it matches the frame action', () => {
    const owners = Object.keys(KEYS).filter((n) => KEYS[n].includes('f') || KEYS[n].includes('F'));
    expect(owners).toEqual(['frame']);
    expect(matchKey({ key: 'f' })).toBe('frame');
    expect(matchKey({ key: 'F' })).toBe('frame');
    expect(matchKey({ key: 'f', ctrlKey: true })).toBe(null);                       // Ctrl+F stays the browser's
  });
  it('the help list names it', () => {
    const row = HELP_ROWS.find((r) => r[0] === 'frame');
    expect(row && row[1]).toBe('Fit the city to the screen');
  });
  it('a double tap on the Map button frames the city and leaves the Minimap as it was; one tap only opens it', () => {
    const log = [];
    const host = document.createElement('div');
    mount(host);
    const speedControl = { mountCorner() {}, render() {} };
    createCorners({ container: host, store: createStore(INITIAL_UI_STATE), speedControl, onMinimap: () => log.push('map'), onOverlay() {}, onFrame: () => log.push('frame') });
    const btn = host.querySelector('.minimap-button');
    btn.click();
    expect(log).toEqual(['map']);
    btn.click();                                                                    // a second tap within DOUBLE_TAP_MS: the sheet the first opened is closed, then the city is framed
    expect(log).toEqual(['map', 'map', 'frame']);
  });
  it('the F key frames the real interface\'s city', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    const bounds = cityBounds(r.world);
    r.cam.x = 60; r.cam.y = 60;                                                      // looking away
    expect(boundsOutside(r.cam, { width: 1280, height: 800 }, bounds)).toBe(true);
    fire(r.root, 'keydown', { key: 'f' });
    r.ui.cameraControl.tick(1e9);
    expect(r.cam.zoom).toBeLessThanOrEqual(FRAME_MAX_ZOOM + 1e-9);
    expect(Math.hypot(r.cam.x - 16, r.cam.y - 10)).toBeLessThan(14);                 // back on the city (its middle is about (16, 10))
    r.cleanup();
  });
  it('a city opens framed when the camera starts on its start area and the built area is off the screen; one the screen already holds does not move', async () => {
    const far = makeTestWorld();
    setRoad(far, 14, 15, 30, 15);
    far.focus = { x: 2, y: 28 };                                                     // the start area a screen away from the streets
    const at = createCamera({ x: far.focus.x, y: far.focus.y, zoom: 1 });
    const r = await rigUI({ world: far, width: 1280, height: 800, cam: at });
    expect(boundsOutside(at, { width: 1280, height: 800 }, cityBounds(far, [[2, 28]]), { margin: 0 })).toBe(false);
    expect(at.zoom).toBeLessThan(1);
    r.cleanup();
    const small = makeTestWorld();
    setRoad(small, 14, 15, 18, 15);
    small.focus = { x: 16, y: 15 };
    const stay = createCamera({ x: 16, y: 15, zoom: 1 });
    const r2 = await rigUI({ world: small, width: 1280, height: 800, cam: stay });
    expect([stay.x, stay.y, stay.zoom]).toEqual([16, 15, 1]);
    r2.cleanup();
  });
});
