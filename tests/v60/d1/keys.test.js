// Version 6.0 Track D1 (rulings 744, 745): desktop controls. Arrows or WASD pan, + and - zoom, Esc closes, 1 to 7 pick a build category, right-click cancels,
// the speed steps moved to ] and [; all listed in How to play from KEYS itself; and none of them fires while a text field has focus or a control needs the
// key for its own job.
import { describe, it, expect } from '../../harness.js';
import { createKeyboard, matchKey } from '../../../src/ui/keyboard.js';
import { createCamera, MIN_ZOOM, MAX_ZOOM } from '../../../src/render/camera.js';
import { createCameraControl } from '../../../src/ui/cameraControl.js';
import { createMenuSheets, keyLabel } from '../../../src/ui/menu.js';
import { KEYS, ZOOM_STEP, PAN_STEP_PX } from '../../../src/data/ui.js';
import { HELP_ROWS, T } from '../../../src/ui/text.js';
import { createSettings } from '../../../src/ui/settings.js';
import { mount, fire, key } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { openSheet } from '../../../src/ui/modes.js';

const NAMES = ['pause', 'speedUp', 'speedDown', 'rotate', 'minimap', 'overlay', 'confirm', 'back', 'undo', 'help'];

function rig({ shortcuts = true, html = '', hidden = false } = {}) {
  const { root, cleanup } = mount(`<div id="t" tabindex="0">${html}<button id="b">Go</button></div>`);
  const target = root.querySelector('#t');
  const cam = createCamera({ x: 16, y: 16, zoom: 1, size: 64 });
  const cameraControl = createCameraControl({ cam, view: () => ({ width: 400, height: 300 }), reducedMotion: () => true });
  const settings = { get: () => ({ keyboardShortcuts: shortcuts }) };
  const log = [];
  const actions = {};
  for (const n of NAMES) actions[n] = () => log.push(n);
  actions.category = (i) => log.push(`category${i}`);
  const kb = createKeyboard({ target, settings, cam, cameraControl, actions, hidden: () => hidden });
  return { root, target, cam, cameraControl, log, cleanup: () => { kb.detach(); cleanup(); } };
}

describe('v60 d1 keys: pan and zoom', () => {
  it('zooms a step in on + and =, a step out on - and _, about the middle of the view, and stops at the least and most zoom', () => {
    const r = rig();
    try {
      key(r.target, '+');
      expect(r.cam.zoom).toBe(ZOOM_STEP);
      key(r.target, '=');
      expect(Math.abs(r.cam.zoom - ZOOM_STEP * ZOOM_STEP) < 1e-9).toBe(true);
      key(r.target, '-'); key(r.target, '_');
      expect(Math.abs(r.cam.zoom - 1) < 1e-9).toBe(true);
      for (let i = 0; i < 12; i++) key(r.target, '+');
      expect(r.cam.zoom).toBe(MAX_ZOOM);
      for (let i = 0; i < 20; i++) key(r.target, '-');
      expect(r.cam.zoom).toBe(MIN_ZOOM);
      expect(r.log).toEqual([]);                                                          // zooming is the camera's, never a game action
    } finally { r.cleanup(); }
  });
  it('keeps the tile under the middle of the view still while it zooms', () => {
    const r = rig();
    try {
      const x = r.cam.x, y = r.cam.y;
      key(r.target, '+'); key(r.target, '+'); key(r.target, '-');
      expect([Math.abs(r.cam.x - x) < 1e-9, Math.abs(r.cam.y - y) < 1e-9]).toEqual([true, true]);
    } finally { r.cleanup(); }
  });
  it('pans a step on each arrow and each WASD key (either case), keeps panning on key repeat, and leaves Ctrl and Cmd combinations to the browser', () => {
    const r = rig();
    try {
      for (const k of ['ArrowLeft', 'a', 'A', 'ArrowRight', 'd', 'D', 'ArrowUp', 'w', 'W', 'ArrowDown', 's', 'S']) {
        const before = { x: r.cam.x, y: r.cam.y };
        const ev = key(r.target, k);
        const moved = { dx: r.cam.x - before.x, dy: r.cam.y - before.y };
        expect([k, ev.defaultPrevented, Math.hypot(moved.dx, moved.dy) > 0]).toEqual([k, true, true]);
      }
      const before = r.cam.x;
      key(r.target, 'ArrowLeft', { repeat: true });
      expect(r.cam.x < before).toBe(true);
      const z = r.cam.zoom, x = r.cam.x;
      key(r.target, '+', { ctrlKey: true }); key(r.target, '-', { metaKey: true }); key(r.target, 'a', { ctrlKey: true });
      expect([r.cam.zoom, r.cam.x]).toEqual([z, x]);
      expect(PAN_STEP_PX).toBeGreaterThan(0);
    } finally { r.cleanup(); }
  });
  it('moved the speed steps to ] and . (faster) and [ and , (slower), so + and - are the zoom\'s alone', () => {
    expect([KEYS.speedUp, KEYS.speedDown, KEYS.zoomIn, KEYS.zoomOut]).toEqual([[']', '.'], ['[', ','], ['+', '='], ['-', '_']]);
    const r = rig();
    try {
      for (const k of [']', '.', '[', ',']) key(r.target, k);
      expect(r.log).toEqual(['speedUp', 'speedUp', 'speedDown', 'speedDown']);
      r.log.length = 0;
      key(r.target, '+'); key(r.target, '-'); key(r.target, '='); key(r.target, '_');
      expect(r.log).toEqual([]);
    } finally { r.cleanup(); }
  });
  it('picks a build category on each number key 1 to 7', () => {
    const r = rig();
    try {
      for (const k of ['1', '2', '3', '4', '5', '6', '7']) key(r.target, k);
      expect(r.log).toEqual(['category0', 'category1', 'category2', 'category3', 'category4', 'category5', 'category6']);
      key(r.target, '8'); key(r.target, '0');
      expect(r.log.length).toBe(7);
    } finally { r.cleanup(); }
  });
  it('lets only Esc, Enter and undo through when single keys are switched off in Settings, zoom and pan included', () => {
    const r = rig({ shortcuts: false });
    try {
      for (const k of ['+', '-', 'ArrowLeft', 'w', ']', '1', ' ']) key(r.target, k);
      expect([r.cam.zoom, r.cam.x, r.log]).toEqual([1, 16, []]);
      key(r.target, 'Escape');
      expect(r.log).toEqual(['back']);
    } finally { r.cleanup(); }
  });
  it('lets the interface hidden (screenshot mode) keep pan, zoom and Esc, and nothing that changes the city', () => {
    const r = rig({ hidden: true });
    try {
      key(r.target, '+'); key(r.target, 'ArrowLeft'); key(r.target, 'Escape');
      for (const k of [' ', ']', '1', 'r', 'Enter']) key(r.target, k);
      expect([r.cam.zoom, r.cam.x < 16, r.log]).toEqual([ZOOM_STEP, true, ['back']]);
    } finally { r.cleanup(); }
  });
});

describe('v60 d1 keys: a control that needs a key keeps it (ruling 745)', () => {
  const FIELDS = [
    ['a text field', '<input id="x" type="text">'], ['a number field', '<input id="x" type="number">'], ['a range slider', '<input id="x" type="range" min="0" max="10">'],
    ['a text area', '<textarea id="x"></textarea>'], ['a select', '<select id="x"><option>a</option><option>b</option></select>'],
    ['an editable line', '<div id="x" contenteditable="true">words</div>'],
    ['a slider role', '<div id="x" role="slider" tabindex="0" aria-valuenow="3"></div>'], ['a list box', '<div role="listbox"><div id="x" role="option" tabindex="0">one</div></div>'],
    ['a tab list', '<div role="tablist"><button id="x" role="tab">One</button></div>'], ['a radio group', '<div role="radiogroup"><button id="x" role="radio" aria-checked="true">One</button></div>'],
    ['a menu', '<div role="menu"><button id="x" role="menuitem">One</button></div>'], ['a marked control', '<div data-own-keys><button id="x">One</button></div>'],
  ];
  it('leaves arrows, WASD, + and -, the number keys, Space and Esc to such a control: nothing moves, nothing is handled, nothing is prevented', () => {
    for (const [what, html] of FIELDS) {
      const r = rig({ html });
      try {
        const node = r.root.querySelector('#x');
        const rolePart = ['a slider role', 'a list box', 'a tab list', 'a radio group', 'a menu', 'a marked control'].includes(what);   // these are not typing: the map's single keys (1-7, Space) stay the game's, but the keys that move the view do not
        const moveKeys = ['ArrowLeft', 'ArrowDown', 'a', 'w', '+', '=', '-', '_'];
        for (const k of moveKeys) {
          const ev = key(node, k);
          expect([what, k, ev.defaultPrevented]).toEqual([what, k, false]);
        }
        expect([what, r.cam.zoom, r.cam.x, r.cam.y]).toEqual([what, 1, 16, 16]);
        if (!rolePart) {
          for (const k of ['1', ' ', 'Escape', 'm', ']']) key(node, k);
          expect([what, r.log]).toEqual([what, []]);
        }
      } finally { r.cleanup(); }
    }
  });
  it('still moves the view from the map\'s own controls: a focused button takes its Enter and Space but pans and zooms on the other keys', () => {
    const r = rig();
    try {
      const b = r.root.querySelector('#b');
      const enter = key(b, 'Enter'), space = key(b, ' ');
      expect([enter.defaultPrevented, space.defaultPrevented, r.log]).toEqual([false, false, []]);
      key(b, '+');
      key(b, 'ArrowLeft');
      expect([r.cam.zoom, r.cam.x < 16]).toEqual([ZOOM_STEP, true]);
    } finally { r.cleanup(); }
  });
  it('leaves a focused summary its own Enter and Space', () => {
    const r = rig({ html: '<details><summary id="x">More</summary>text</details>' });
    try {
      const s = r.root.querySelector('#x');
      const enter = key(s, 'Enter'), space = key(s, ' ');
      expect([enter.defaultPrevented, space.defaultPrevented, r.log]).toEqual([false, false, []]);
    } finally { r.cleanup(); }
  });
  it('leaves the arrow keys to a scrolling panel (a sheet, the dialog) while focus is in it, and keeps W, A, S and D for the map', () => {
    const r = rig({ html: '<div id="sheet"><div class="body" tabindex="0" id="x">long text</div></div>' });
    try {
      const node = r.root.querySelector('#x');
      for (const k of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) {
        const ev = key(node, k);
        expect([k, ev.defaultPrevented]).toEqual([k, false]);
      }
      expect([r.cam.x, r.cam.y]).toEqual([16, 16]);
      const w = key(node, 'w');
      expect([w.defaultPrevented, r.cam.y !== 16]).toEqual([true, true]);
    } finally { r.cleanup(); }
  });
});

describe('v60 d1 keys: in the game', () => {
  it('zooms the real map on + and -, keeps the city\'s own keys, and a text field in a sheet keeps its keys', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      const z = r.cam.zoom;
      key(r.root, '+');
      r.ui.cameraControl.tick(1e9);
      expect(Math.abs(r.cam.zoom - z * ZOOM_STEP) < 1e-6 || r.cam.zoom > z).toBe(true);
      key(r.root, '-'); key(r.root, '-');
      r.ui.cameraControl.tick(2e9);
      expect(r.cam.zoom < z * ZOOM_STEP).toBe(true);
      const speed = r.world.speed;
      key(r.root, ']');
      expect(r.world.speed).toBeGreaterThan(speed);                                         // the speed keys still work, on their new keys
      key(r.root, '[');
      expect(r.world.speed).toBe(speed);
    } finally { r.cleanup(); }
  });
  it('closes a sheet, the guidance row and a dialog on Esc, and a right-click cancels a tool but a right-drag only pans', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      key(r.root, '?');
      expect(r.store.get().sheet.kind).toBe('help');
      key(r.root, 'Escape');
      expect(r.store.get().sheet).toBe(null);
      r.store.set({ confirmDialog: { text: 'Sure?', confirmLabel: 'Yes', onConfirm() {} } });
      key(r.root, 'Escape');
      expect(r.store.get().confirmDialog).toBe(null);
      r.ui.placement.start({ kind: 'road' });
      expect(r.store.get().mode).toBe('drawing');
      const right = { ...r.at(200, 200), pointerId: 11, pointerType: 'mouse', button: 2, buttons: 2 };
      fire(r.canvas, 'pointerdown', right);
      fire(r.canvas, 'pointerup', { ...right, buttons: 0 });
      expect(r.store.get().mode).toBe('browse');                                           // a right-click is Back
      r.ui.placement.start({ kind: 'road' });
      const x = r.cam.x;
      fire(r.canvas, 'pointerdown', { ...r.at(200, 200), pointerId: 12, pointerType: 'mouse', button: 2, buttons: 2 });
      fire(r.canvas, 'pointermove', { ...r.at(300, 200), pointerId: 12, pointerType: 'mouse', button: 2, buttons: 2 });
      fire(r.canvas, 'pointerup', { ...r.at(300, 200), pointerId: 12, pointerType: 'mouse', button: 2, buttons: 0 });
      expect([r.store.get().mode, r.cam.x !== x]).toEqual(['drawing', true]);              // the drag moved the map and cancelled nothing
    } finally { r.cleanup(); }
  });
  it('picks a build category on 1 to 7 and leaves it alone while a sheet\'s text field has focus', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      key(r.root, '2');
      expect(r.store.get().category).toBe('homes');
      r.store.set(openSheet(r.store.get(), 'share'));
      const input = document.createElement('input');
      input.type = 'text';
      r.root.append(input);
      key(input, '3');
      key(input, ']');
      expect(r.store.get().category).toBe('homes');
    } finally { r.cleanup(); }
  });
});

describe('v60 d1 keys: How to play lists them, from the keys themselves', () => {
  function helpBody() {
    const { root, cleanup } = mount('<div id="body"></div>');
    const body = root.querySelector('#body');
    const root2 = document.createElement('div');
    const settings = createSettings({ storage: { getItem: () => null, setItem() {} }, root: root2, systemReducedMotion: () => false, watchSystem: () => () => {} });
    const menus = createMenuSheets({ store: { get: () => ({}), set() {}, subscribe: () => () => {} }, settings, toasts: { show() {} }, hooks: {} });
    menus.help(body, { close() {} });
    return { body, cleanup };
  }
  it('has a row for zoom in, zoom out and right-click, beside the rows it had, with the keys read from KEYS', () => {
    const h = helpBody();
    try {
      const rows = [...h.body.querySelectorAll('.shortcuts tbody tr')].map((tr) => [tr.querySelector('kbd').textContent, tr.children[1].textContent]);
      const byText = (words) => rows.find(([, text]) => text === words);
      expect(byText('Zoom in')[0]).toBe(keyLabel('zoomIn'));
      expect(byText('Zoom out')[0]).toBe(keyLabel('zoomOut'));
      expect(keyLabel('zoomIn')).toBe('+ or =');
      expect(keyLabel('zoomOut')).toBe('- or _');
      expect(byText('Faster')[0]).toBe('] or .');
      expect(byText('Slower')[0]).toBe('[ or ,');
      expect(byText('Move the view')[0]).toBe('Arrows or WASD');
      expect(byText('Pick a build category')[0]).toBe('1 to 7');
      expect(byText('Back one step')[0]).toBe('Esc');
      expect(rows.some(([k, text]) => k === 'Right-click' && text.includes('Cancel'))).toBe(true);
      expect(h.body.textContent).toContain('On a computer');
      expect(h.body.textContent).toContain(T.shortcutsOff);
    } finally { h.cleanup(); }
  });
  it('lists only keys that do what the row says: each row\'s first key reaches its action', () => {
    const r = rig();
    try {
      const done = [];
      for (const [name, text] of HELP_ROWS) {
        if (!KEYS[name]) continue;                                                        // the right button is not a key
        r.log.length = 0;
        const before = { zoom: r.cam.zoom, x: r.cam.x, y: r.cam.y };
        const k = KEYS[name][0];
        key(r.target, k, name === 'undo' ? { ctrlKey: true } : {});
        const acted = r.log.length > 0 || r.cam.zoom !== before.zoom || r.cam.x !== before.x || r.cam.y !== before.y;
        done.push([name, text, acted]);
      }
      expect(done.filter(([, , acted]) => !acted)).toEqual([]);
      expect(done.some(([name]) => name === 'zoomIn') && done.some(([name]) => name === 'zoomOut')).toBe(true);
    } finally { r.cleanup(); }
  });
});

describe('v60 d1 keys: the speed buttons name the keys that really change the speed (fixer round 1)', () => {
  it('names ] and [ with Keyboard shortcuts on, those keys do change the speed and + and - do not, and it names nothing with them off', async () => {
    const [up, down] = [KEYS.speedUp[0], KEYS.speedDown[0]];
    expect([up, down]).toEqual([']', '[']);
    expect([matchKey({ key: up }), matchKey({ key: down }), matchKey({ key: '+' }), matchKey({ key: '-' })]).toEqual(['speedUp', 'speedDown', 'zoomIn', 'zoomOut']);
    const r = await rigUI({ width: 1280, height: 800 });
    const titles = () => [...r.root.querySelectorAll('#topbar .speed-bar .speed-step')].map((b) => b.title);
    try {
      r.ui.settings.set({ keyboardShortcuts: true });
      expect(titles().slice(1).every((t) => t.includes(`(${up} and ${down} change it)`) && !t.includes('+'))).toBe(true);
      r.ui.settings.set({ keyboardShortcuts: false });
      expect(titles().some((t) => /Space|\+|\]|\[|change it/.test(t))).toBe(false);
    } finally { r.cleanup(); }
  });
});

describe('v60 d1 keys: the key list fits the panel at large text (polish 1)', () => {
  it('keeps every key and every word of the How to play table inside the side panel at 100% and 150% text, on a laptop and a phone', async () => {
    for (const [w, h, size] of [[1280, 800, 100], [1280, 800, 150], [1920, 1080, 150], [390, 844, 150]]) {
      const r = await rigUI({ width: w, height: h });
      document.body.dataset.textSize = String(size);
      try {
        r.renderer.renderFrame = () => {};
        r.store.set(openSheet(r.store.get(), 'help'));
        const table = r.root.querySelector('#sheet .shortcuts');
        const box = table.getBoundingClientRect(), sheet = r.root.querySelector('#sheet').getBoundingClientRect();
        const at = `${w}x${h} at ${size}%`;
        expect([at, table.scrollWidth <= table.clientWidth + 1, box.left >= sheet.left - 0.5, box.right <= sheet.right + 0.5]).toEqual([at, true, true, true]);
        for (const cell of table.querySelectorAll('td, th, kbd')) {
          const c = cell.getBoundingClientRect();
          expect([at, cell.textContent, c.right <= sheet.right + 1, c.left >= sheet.left - 1]).toEqual([at, cell.textContent, true, true]);
        }
      } finally { delete document.body.dataset.textSize; r.cleanup(); }
    }
  });
});
