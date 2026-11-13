// Version 10.0.1, Track U (rulings 2411-2414, the review's fixes): the lesson lock follows the player's keys, a modal stops the card keys, key hints name the player's own keys, Esc cannot be taken from Back,
// Tab is never swallowed by a Change, and the order of the bottom stack holds at 375x667 and 150% text.
import { describe, it, expect } from '../../harness.js';
import { mount, key, fire } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { lockTo, unlock } from '../../../src/ui/v81/lessonLock.js';
import { effectiveKeys } from '../../../src/ui/v1001/keymap.js';
import { trayOpenOf } from '../../../src/ui/v1001/cardKeys.js';
import { openSheet } from '../../../src/ui/modes.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { V1001U_TEXT as K } from '../../../src/ui/text.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('v1001 u review: the lesson lock and the keys in effect', () => {
  function lockRig(keysMap, cardsOpen = false) {
    const m = mount('<button data-lock="tray-cat-roads">R</button><button data-lock="tray-cat-homes">H</button><button data-lock="speed">S</button><div id="t" tabindex="0"></div>');
    const refused = [];
    lockTo(['tray-cat-roads'], { root: document.body, onRefused: (id) => refused.push(id), keys: () => effectiveKeys(keysMap), cardsOpen: () => cardsOpen });
    return { m, refused, target: m.root.querySelector('#t'), done() { unlock(); m.cleanup(); } };
  }
  it('refuses a rebound tab key for a locked tab, lets the allowed tab\'s own rebound key through, and no longer refuses the old default digit', () => {
    const r = lockRig({ category: ['q', 'x', '3', '4', '5', '6', '7'] });
    try {
      key(r.target, 'x');                                                     // tab 2 (Homes) is locked
      key(r.target, 'q');                                                     // tab 1 (Roads) is the lesson's own
      key(r.target, '2');                                                     // no longer a tab key
      expect(r.refused).toEqual(['tray-cat-homes']);
    } finally { r.done(); }
  });
  it('refuses a rebound pause key and leaves Space alone once it is not pause', () => {
    const r = lockRig({ pause: ['p', 'P'] });
    try {
      key(r.target, ' ');
      expect(r.refused).toEqual([]);
      key(r.target, 'p');
      expect(r.refused).toEqual(['speed']);
    } finally { r.done(); }
  });
  it('lets a digit through as a card key while a tab\'s cards are open (the card refuses its own click)', () => {
    const open = lockRig({}, true);
    try { key(open.target, '2'); expect(open.refused).toEqual([]); } finally { open.done(); }
    const shut = lockRig({}, false);
    try { key(shut.target, '2'); expect(shut.refused).toEqual(['tray-cat-homes']); } finally { shut.done(); }
  });
});

describe('v1001 u review: a modal, the hints, Esc and Tab', () => {
  it('trayOpenOf is false under a confirm dialog, and a card key then picks nothing behind it (wide)', async () => {
    expect(trayOpenOf({ layout: 'wide', cardKeys: true, confirmDialog: { text: 'x' } })).toBe(false);
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      key(r.root, '2');
      expect(r.store.get().cardKeys).toBe(true);
      r.store.set({ confirmDialog: { text: 'Demolish?', confirmLabel: 'Yes' } });
      key(r.root, '1');
      expect(r.store.get().tool).toBe(null);
    } finally { r.cleanup(); }
  });
  it('names the player\'s own keys: Rotate on the bar, the Map button and Pause', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      r.ui.settings.set({ keyBindings: { rotate: ['x', 'X'], minimap: ['n', 'N'], pause: ['p', 'P'] } });
      const rotating = Object.keys(BUILDINGS).find((k) => BUILDINGS[k].rotates);
      r.ui.placement.start({ kind: 'building', type: rotating }, { x: 14, y: 9 });
      const rot = r.root.querySelector('#confirm .rotate');
      expect([rot.title.endsWith('(X)'), rot.getAttribute('aria-keyshortcuts')]).toEqual([true, 'x X']);
      r.ui.speedControl.render();
      expect(r.root.querySelector('.speed-step.step-0').getAttribute('aria-keyshortcuts')).toBe('p P');
      const map = r.root.querySelector('#corners .minimap-button');
      if (map) expect(map.getAttribute('aria-keyshortcuts')).toBe('N');
      r.ui.settings.set({ keyBindings: {} });
      r.ui.speedControl.render();
      expect(r.root.querySelector('.speed-step.step-0').getAttribute('aria-keyshortcuts')).toBe('Space');
    } finally { r.cleanup(); }
  });
  it('keeps Esc for Back: a hand-edited binding of Escape to another action is dropped', () => {
    const m = effectiveKeys({ pause: ['Escape'], rotate: ['Escape', 'x'] });
    expect([m.pause, m.rotate, m.back.includes('Escape')]).toEqual([[' '], ['x'], true]);
    expect(effectiveKeys({ back: ['q', 'Q'], pause: ['q'] }).pause).toEqual([' ']);   // and any key Back was given
  });
  it('lets Tab through a Change: it is not swallowed, and it ends the listen', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      r.store.set(openSheet(r.store.get(), 'settings'));
      const group = r.root.querySelector('#sheet .keys-section');
      const change = () => group.querySelector('.key-row-pause .key-change');
      change().click();
      expect(change().textContent).toBe(K.listening);
      const ev = key(change(), 'Tab');
      expect(ev.defaultPrevented).toBe(false);
      await tick(); await tick();
      expect(change().textContent).toBe(K.change);
      key(change(), 'p');                                                     // not listening any more: nothing is bound
      expect(r.ui.settings.get().keyBindings).toEqual({});
    } finally { r.cleanup(); }
  });
});

describe('v1001 u review: the bottom stack keeps its order at 375x667 and 150% text', () => {
  it('building, then toast, then tray, then the corner buttons, top to bottom, after a touch tick', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150, reducedMotion: 'on' });
      fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');
      fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');
      r.frame(0);
      const g = r.store.get().ghost, ok = r.root.querySelector('#confirm .ok');
      fire(ok, 'pointerdown', { pointerType: 'touch' }); fire(ok, 'click');
      r.ui.cameraControl.tick(1e6);
      const k = 2 * r.cam.zoom, well = r.screenOf(g.x + 0.5, g.y + 0.5);
      const ground = well.y + 8 * k;
      const box = (sel) => { const n = r.root.querySelector(sel); return n && n.getClientRects().length ? n.getBoundingClientRect() : null; };
      const toast = box('#toasts .toast'), tray = box('#dock .tray'), corners = box('#corners .speed-main');
      expect([Boolean(toast), Boolean(tray), Boolean(corners)]).toEqual([true, true, true]);
      expect([ground <= toast.top, toast.bottom <= tray.top + 1, tray.bottom <= corners.top + 1]).toEqual([true, true, true]);
      expect(r.cam.zoom >= 0.5 && r.cam.zoom <= 1).toBe(true);
    } finally { r.cleanup(); }
  });
});

void CATEGORIES;
