// Version 9.2, Track A, 6.3-6.5 (rulings 1830-1834): the audit's list. The teal token and the text pairs, the minimap as a control, the alerts' two live regions, screenshot mode's
// way back, the dock's names, the page's meta tags, and the loading screen gone once the title is up (the first load's check, 2.12).
import { describe, it, expect } from '../../harness.js';
import { rigUI, mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { TOKENS, TEXT_PAIRS, contrastRatio } from '../../../src/ui/theme.js';
import { createMinimap } from '../../../src/ui/minimap.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { key } from '../../helpers/dom.js';

describe('v92 a audit: colour', () => {
  it('has the teal token at about #1A5F57 (5.4:1 on the second parchment) and every text pair, the new ones too, at 4.5:1', async () => {
    expect(TOKENS.teal).toBe('#1A5F57');
    expect(contrastRatio(TOKENS.teal, TOKENS.parchment2)).toBeGreaterThanOrEqual(5.4);
    for (const pair of [['coralText', 'parchment2'], ['amberText', 'parchment2'], ['lapis', 'parchment'], ['lapisInk', 'lapis'], ['coral', 'ink'], ['amber', 'ink'], ['teal', 'parchment2']]) {
      expect([pair.join(' on '), TEXT_PAIRS.some(([a, b]) => a === pair[0] && b === pair[1])]).toEqual([pair.join(' on '), true]);
    }
    expect(TEXT_PAIRS.length).toBeGreaterThanOrEqual(28);
    expect(TEXT_PAIRS.filter(([a, b]) => contrastRatio(TOKENS[a], TOKENS[b]) < 4.5)).toEqual([]);
    const css = await (await fetch('/css/ui.css')).text();
    expect(css.includes('--teal: #1A5F57;')).toBe(true);
  });
});

describe('v92 a audit: the minimap, the live regions, screenshot mode', () => {
  it('gives the minimap a role, a name, a place in the Tab order and arrow keys that pan the view', () => {
    const world = makeTestWorld({ gold: 100 });
    const moves = [];
    const cam = { x: 20, y: 20, zoom: 1 };
    const m = createMinimap({ world, cam, view: () => ({ width: 400, height: 300 }), size: 120, dpr: 1, onMove: (x, y) => moves.push([x, y]) });
    const c = m.canvas;
    expect([c.getAttribute('role'), c.getAttribute('aria-label'), c.tabIndex]).toEqual(['application', 'Minimap', 0]);
    expect(c.getAttribute('aria-description').length > 0).toBe(true);
    const step = Math.max(2, Math.round(world.size / 16));
    for (const [k, dx, dy] of [['ArrowRight', 1, 0], ['ArrowLeft', -1, 0], ['ArrowDown', 0, 1], ['ArrowUp', 0, -1]]) {
      const ev = key(c, k);
      expect([k, ev.defaultPrevented]).toEqual([k, true]);
      expect([k, moves[moves.length - 1]]).toEqual([k, [cam.x + dx * step + 0.5, cam.y + dy * step + 0.5]]);
    }
    const before = moves.length;
    key(c, 'ArrowRight', { ctrlKey: true });
    key(c, 'a');
    expect(moves.length).toBe(before);
  });

  it('keeps one politeness a region: #live polite, #live-urgent assertive, and a new critical is said in the assertive one only', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const polite = r.root.querySelector('#live'), urgent = r.root.querySelector('#live-urgent');
      expect([polite.getAttribute('aria-live'), urgent.getAttribute('aria-live')]).toEqual(['polite', 'assertive']);
      r.world.gold = -500;                                   // a debt is a critical
      r.ui.alerts.refresh();
      expect([polite.getAttribute('aria-live'), urgent.getAttribute('aria-live'), urgent.textContent.length > 0, polite.textContent]).toEqual(['polite', 'assertive', true, '']);
    } finally { r.cleanup(); }
  });

  it('keeps a small pinned "Show interface" button in screenshot mode, and it brings the interface back', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const b = r.root.querySelector('#show-interface');
      expect(b.textContent).toBe('Show interface');
      expect(b.getClientRects().length).toBe(0);              // out of screenshot mode it is not on the page
      r.ui.screenshotMode();
      expect(r.store.get().screenshot).toBe(true);
      const box = b.getBoundingClientRect();
      expect([getComputedStyle(b).position, box.width >= 44, box.height >= 44]).toEqual(['fixed', true, true]);
      expect(getComputedStyle(r.root.querySelector('#dock')).display).toBe('none');
      b.click();
      expect(r.store.get().screenshot).toBe(false);
      expect(b.getClientRects().length).toBe(0);
    } finally { r.cleanup(); }
  });

  it('names every dock category button for a screen reader, in words', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const cats = [...r.root.querySelectorAll('#dock .cat')];
      expect(cats.length).toBeGreaterThan(3);
      for (const c of cats) expect([c.dataset.category, (c.getAttribute('aria-label') || c.textContent).trim().length > 2]).toEqual([c.dataset.category, true]);
    } finally { r.cleanup(); }
  });
});

describe('v92 a audit: the compact rail (6.3)', () => {
  it('shows a small word under each rail icon at 667x375, inside a 44 px button, at 12 px or more', async () => {
    const r = await rigUI({ width: 667, height: 375 });
    try {
      expect(r.store.get().layout).toBe('compact');
      const cats = [...r.root.querySelectorAll('#rail .cat')];
      expect(cats.length).toBeGreaterThan(2);
      for (const c of cats) {
        const w = c.querySelector('.cat-word'), b = r.root.querySelector('#rail').getBoundingClientRect(), wb = w && w.getBoundingClientRect(), cb = c.getBoundingClientRect();
        expect([c.dataset.category, Boolean(w) && w.textContent.length > 2, parseFloat(getComputedStyle(w).fontSize) >= 12, cb.height >= 43.5, wb.width > 8 && wb.right <= b.right + 0.5 && wb.left >= b.left - 0.5]).toEqual([c.dataset.category, true, true, true, true]);
        expect(c.getAttribute('aria-label')).toBe(w.textContent);
      }
    } finally { r.cleanup(); }
  });
});

describe('v92 a audit: the page', () => {
  it('has the color-scheme meta (light) and a viewport that allows zoom', async () => {
    const doc = new DOMParser().parseFromString(await (await fetch('/index.html')).text(), 'text/html');
    expect(doc.querySelector('meta[name="color-scheme"]').getAttribute('content')).toBe('light');
    const vp = doc.querySelector('meta[name="viewport"]').getAttribute('content');
    expect([vp.includes('user-scalable'), vp.includes('maximum-scale')]).toEqual([false, false]);
    expect(doc.querySelector('#live-urgent').getAttribute('aria-live')).toBe('assertive');
  });

  it('6.5: the loading screen is gone once the title is up, and the title was on the page when it went', async () => {
    const node = document.createElement('div');
    node.id = 'v91-loading';
    document.body.append(node);
    let at = null;
    window.__v91Loading = { done: () => { at = { title: document.querySelectorAll('#title button').length > 0, titleShown: !document.querySelector('#title').hidden }; node.remove(); } };
    const shell = await mountShell(1280, 800);
    const history = fakeHistory();
    const noStorage = { getItem: () => null, setItem: () => {} };
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage: noStorage,
      envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    try {
      expect(api.phase()).toBe('title');
      expect(document.getElementById('v91-loading')).toBe(null);
      expect(at).toEqual({ title: true, titleShown: true });
    } finally {
      api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; delete window.__v91Loading; node.remove();
    }
  });
});
