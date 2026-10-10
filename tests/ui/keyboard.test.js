import { describe, it, expect } from '../harness.js';
import { createKeyboard, matchKey } from '../../src/ui/keyboard.js';
import { createCamera } from '../../src/render/camera.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { mount, key } from '../helpers/dom.js';

function rig(shortcuts = true) {
  const { root, cleanup } = mount('<input id="field"><div id="t" tabindex="0"></div>');
  const target = root.querySelector('#t');
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const view = () => ({ width: 400, height: 300 });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: () => true });
  const store = createStore(INITIAL_UI_STATE);
  const settings = { get: () => ({ keyboardShortcuts: shortcuts }) };
  const log = [];
  const actions = {};
  for (const n of ['pause', 'speedUp', 'speedDown', 'rotate', 'minimap', 'overlay', 'confirm', 'back', 'undo', 'help']) actions[n] = () => log.push(n);
  actions.category = (i) => log.push(`category${i}`);
  const kb = createKeyboard({ target, settings, cam, cameraControl, actions });
  return { root, target, cam, log, kb, cleanup };
}

describe('ui keyboard', () => {
  it('matches keys from the map and respects modifiers', () => {
    expect(matchKey({ key: ' ', ctrlKey: false, metaKey: false, altKey: false }, ['pause'])).toBe('pause');
    expect(matchKey({ key: 'z', ctrlKey: true, metaKey: false, altKey: false }, ['undo'])).toBe('undo');
    expect(matchKey({ key: 'z', ctrlKey: false, metaKey: false, altKey: false }, ['undo'])).toBe(null);
    expect(matchKey({ key: 'r', ctrlKey: true, metaKey: false, altKey: false }, ['rotate'])).toBe(null);   // Ctrl+R stays the browser's
    expect(matchKey({ key: '3', ctrlKey: false, metaKey: false, altKey: false }, ['category'])).toBe('category');
  });
  it('routes every spec 6.7 shortcut', () => {
    const r = rig();
    for (const k of [' ', '+', '-', '1', '7', 'r', 'M', 'o', 'Enter', 'Escape', '?']) key(r.target, k);
    key(r.target, 'z', { ctrlKey: true });
    expect(r.log).toEqual(['pause', 'speedUp', 'speedDown', 'category0', 'category6', 'rotate', 'minimap', 'overlay', 'confirm', 'back', 'help', 'undo']);
    const before = { x: r.cam.x, y: r.cam.y, zoom: r.cam.zoom };
    key(r.target, 'ArrowLeft');
    expect(r.cam.x < before.x && r.cam.y > before.y).toBe(true);
    key(r.target, 'd');
    expect(Math.abs(r.cam.x - before.x) < 1e-9 && Math.abs(r.cam.y - before.y) < 1e-9).toBe(true);
    key(r.target, '=');
    expect(r.log.filter((e) => e === 'speedUp').length).toBe(2);
    r.kb.detach(); r.cleanup();
  });
  it('stays quiet while a text field has focus and when single keys are switched off', () => {
    const r = rig();
    const field = r.root.querySelector('#field');
    key(field, ' ');
    key(field, 'Escape');
    expect(r.log).toEqual([]);
    r.kb.detach(); r.cleanup();
    const off = rig(false);
    key(off.target, ' ');
    key(off.target, 'o');
    key(off.target, 'Escape');
    key(off.target, 'Enter');
    key(off.target, 'z', { ctrlKey: true });
    expect(off.log).toEqual(['back', 'confirm', 'undo']);
    off.kb.detach(); off.cleanup();
  });
  it('prevents the browser default for handled keys only', () => {
    const r = rig();
    const handled = key(r.target, ' ');
    const unhandled = key(r.target, 'q');
    expect(handled.defaultPrevented).toBe(true);
    expect(unhandled.defaultPrevented).toBe(false);
    r.kb.detach(); r.cleanup();
  });
});
