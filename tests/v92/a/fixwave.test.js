// Version 9.2, Track A, fix wave (rulings 1875-1879): the final review's S1 (focus back to a menu-sheet row after a confirm), S2 (a Fit the city button in the Minimap sheet), S7 (Screenshot mode's
// focus), M4 (no second minimap on the wide layout), M5 (the dialog's document listener leaves with its interface), M14 (Options' sections as labelled groups).
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { openSheet } from '../../../src/ui/modes.js';
import { press } from '../helpers/keys.js';
import { createDialog, createMenuSheets } from '../../../src/ui/menu.js';
import { createStore } from '../../../src/ui/store.js';
import { T, A92_TEXT } from '../../../src/ui/text.js';

const later = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

describe('v92 a fixwave: focus', () => {
  it('S1: a confirm opened from a menu-sheet row gives focus back to that row (the sheet was rebuilt under it)', async () => {
    const r = await rigUI({ width: 390, height: 844, hooks: { lesson: () => {}, save: () => true } });
    try {
      r.store.set(openSheet(r.store.get(), 'menu'));
      await later();
      const sheet = r.root.querySelector('#sheet');
      const row = sheet.querySelector('.menu-lesson');
      expect(Boolean(row)).toBe(true);
      row.focus();
      press('Enter', { from: row });
      row.click();
      const dialog = r.root.querySelector('#dialog');
      expect(dialog.hidden).toBe(false);
      expect(document.activeElement).toBe(dialog.querySelector('.cancel'));
      expect(row.isConnected).toBe(false);   // the sheet was rebuilt when the question came up: the remembered node is gone
      dialog.querySelector('.cancel').click();
      const live = r.root.querySelector('#sheet .menu-lesson');
      expect(Boolean(live)).toBe(true);
      expect(document.activeElement).toBe(live);
    } finally { r.cleanup(); }
  });

  it('M5: destroying the interface removes the dialog\'s keydown listener from the document', () => {
    const store = createStore();
    const container = document.createElement('div');
    document.body.append(container);
    const add = document.addEventListener, remove = document.removeEventListener;
    let added = 0, removed = 0;
    document.addEventListener = function (type, fn, opts) { if (type === 'keydown') added++; return add.call(this, type, fn, opts); };
    document.removeEventListener = function (type, fn, opts) { if (type === 'keydown') removed++; return remove.call(this, type, fn, opts); };
    try {
      const d = createDialog({ container, store });
      expect(added).toBe(1);
      d.destroy();
      expect(removed).toBe(1);
    } finally { document.addEventListener = add; document.removeEventListener = remove; container.remove(); }
  });

  it('S7: Screenshot mode puts focus on Show interface, and leaving it puts focus on the Menu button', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      await later();
      r.ui.screenshotMode();
      await later();
      const show = r.root.querySelector('#show-interface');
      expect(document.activeElement).toBe(show);
      show.click();
      await later();
      expect(document.activeElement).toBe(r.root.querySelector('#topbar .menu'));
    } finally { r.cleanup(); }
  });
});

describe('v92 a fixwave: the Minimap sheet', () => {
  it('S2: has a Fit the city button beside + and − on the phone and the wide layout, and it frames the city; the help names it', async () => {
    for (const [width, height] of [[390, 844], [1280, 800]]) {
      const r = await rigUI({ width, height });
      try {
        r.store.set(openSheet(r.store.get(), 'minimap'));
        await later();
        const actions = r.root.querySelector('#sheet .actions');
        expect([width, [...actions.children].map((b) => b.className.split(' ')[0])]).toEqual([width, ['zoom-in', 'zoom-out', 'fit-city']]);
        expect(actions.querySelector('.fit-city').textContent).toBe(A92_TEXT.fitCity);
        r.cam.x = 2; r.cam.y = 2; r.cam.zoom = 2.5;
        actions.querySelector('.fit-city').click();
        await later(400);
        expect([width, r.cam.zoom < 2.5 || r.cam.x !== 2 || r.cam.y !== 2]).toEqual([width, true]);
      } finally { r.cleanup(); }
    }
    expect(T.gesturesHelp.includes('Fit the city')).toBe(true);
    expect(T.gesturesHelp.includes('Map button twice')).toBe(false);
  });

  it('M4: the wide layout draws no second minimap in the sheet; the phone keeps its own', async () => {
    const wide = await rigUI({ width: 1280, height: 800 });
    try {
      wide.store.set(openSheet(wide.store.get(), 'minimap'));
      await later();
      expect(wide.root.querySelector('#sheet .minimap-wrap')).toBe(null);
      expect(Boolean(wide.root.querySelector('#panel .minimap'))).toBe(true);
    } finally { wide.cleanup(); }
    const phone = await rigUI({ width: 390, height: 844 });
    try {
      phone.store.set(openSheet(phone.store.get(), 'minimap'));
      await later();
      expect(Boolean(phone.root.querySelector('#sheet .minimap-wrap canvas'))).toBe(true);
    } finally { phone.cleanup(); }
  });
});

describe('v92 a fixwave: Options', () => {
  it('M14: each section is a labelled group whose summary holds the plain words', async () => {
    const store = createStore();
    const settings = { get: () => ({ sound: true, difficulty: 'normal' }), set() {}, subscribe: () => () => {} };
    const root = document.createElement('div');
    document.body.append(root);
    try {
      const menus = createMenuSheets({ store, settings, toasts: { show() {} }, hooks: {} });
      menus.settings(root, { close() {} });
      for (const key of ['sound', 'display', 'controls', 'help', 'saves']) {
        const g = root.querySelector(`details.options-group.${key}`);
        const label = g && document.getElementById(g.getAttribute('aria-labelledby'));
        expect([key, Boolean(g), g && g.getAttribute('role'), label && label.tagName, g && g.querySelector('summary h3')]).toEqual([key, true, 'group', 'SUMMARY', null]);
      }
    } finally { root.remove(); }
  });
});
