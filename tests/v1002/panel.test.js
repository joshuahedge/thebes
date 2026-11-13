// Version 10.0.2 (rulings 2444-2448): the phone's placing panel is compact. Collapsed: the name and cost, one row of condition pills (the ones that say no first), Undo, Cancel and Confirm. More opens the
// rest 10.0.1 showed, and is remembered for the session. The panel takes the tab row's place (no empty band), and the ghost stays above it and left of the rail, More open too.
import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire } from '../helpers/dom.js';
import { tileToScreen } from '../../src/render/camera.js';
import { dimsOf } from '../../src/data/buildings.js';

const shown = (n) => Boolean(n) && n.getClientRects().length > 0 && getComputedStyle(n).display !== 'none';
const card = (r, category, item) => { fire(r.root.querySelector(`#dock .cat[data-category="${category}"]`), 'click'); const c = r.root.querySelector(`#dock .tray .card[data-item="${item}"]`); fire(c, 'click'); r.frame(0); };

describe('v1002 panel: folded and More', () => {
  it('collapsed shows the name, the cost, one row of pills and the three buttons; More shows the effect line and the pills wrapped', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.world.milestone = 'capital';
      r.ui.refresh();
      card(r, 'services', 'well');
      r.ui.placement.moveGhost(14, 9);
      const bar = r.root.querySelector('#confirm .confirm');
      expect(bar.classList.contains('phone')).toBe(true);
      const q = (s) => bar.querySelector(s);
      expect([shown(q('.name')), q('.name').textContent, shown(q('.cost')), shown(q('.cancel')), shown(q('.ok'))]).toEqual([true, 'Well', true, true, true]);
      expect(shown(q('.effect'))).toBe(false);                                           // "Gives water to 2 homes" waits for More
      const toggle = q('.more-toggle');
      expect([toggle.textContent, toggle.getAttribute('aria-expanded')]).toEqual(['More', 'false']);
      const collapsed = bar.getBoundingClientRect().height;
      toggle.click();
      const open = r.root.querySelector('#confirm .confirm');
      expect([open.classList.contains('more-open'), shown(open.querySelector('.effect')), open.querySelector('.more-toggle').textContent, open.querySelector('.more-toggle').getAttribute('aria-expanded')]).toEqual([true, true, 'Less', 'true']);
      expect(open.querySelector('.effect').textContent).toBe('Gives water to 2 homes');
      expect(open.getBoundingClientRect().height).toBeGreaterThan(collapsed);
      open.querySelector('.more-toggle').click();
      expect(r.root.querySelector('#confirm .confirm').getBoundingClientRect().height).toBeLessThanOrEqual(collapsed + 1);   // Less folds it back
    } finally { r.cleanup(); }
  });
  it('keeps the conditions to ONE row collapsed (the refused first) and wraps them with More', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.world.milestone = 'capital';
      r.ui.refresh();
      card(r, 'food', 'farm_grain');
      r.ui.placement.moveGhost(7, 20);                                                    // half on fertile land, no road: more than one pill says no
      const pills = () => [...r.root.querySelectorAll('#confirm .conds .cond')];
      const rows = () => new Set(pills().map((p) => Math.round(p.getBoundingClientRect().top))).size;
      expect(pills().length).toBeGreaterThan(1);
      expect(rows()).toBe(1);
      const order = pills().map((p) => (p.classList.contains('cant') ? 0 : p.classList.contains('later') ? 1 : 2));
      expect(order).toEqual([...order].sort((a, b) => a - b));                           // the ones that say no come first
      r.store.set({ placingMore: true });
      expect(pills().length).toBeGreaterThan(1);
    } finally { r.cleanup(); }
  });
  it('says when pills run past the row\'s edge: a fade and a +N chip with the count not fully in view; the failing ones stay first; the chip opens More (375x667, 150% text)', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150, reducedMotion: 'on', help: 'off' });
      r.world.milestone = 'capital';
      r.ui.refresh();
      card(r, 'food', 'farm_grain');
      r.ui.placement.moveGhost(20, 20);                                                   // no fertile land, no road, no granary: three that fail or wait
      const conds = r.root.querySelector('#confirm .conds'), pills = () => [...conds.querySelectorAll('.cond')];
      expect(pills().length).toBeGreaterThanOrEqual(3);
      expect(pills().slice(0, 3).every((p) => p.classList.contains('cant') || p.classList.contains('later'))).toBe(true);
      const box = conds.getBoundingClientRect();
      const cut = pills().filter((p) => p.getBoundingClientRect().right > box.right + 1).length;
      const chip = r.root.querySelector('#confirm .more-count');
      expect([Boolean(chip), cut >= 1, chip && chip.textContent]).toEqual([true, true, `+${cut}`]);
      const detail = JSON.stringify({ box: [box.left, box.right], pills: pills().map((p) => [p.className, Math.round(p.getBoundingClientRect().left), Math.round(p.getBoundingClientRect().right)]) });
      expect([detail, pills()[0].getBoundingClientRect().right <= box.right + 1]).toEqual([detail, true]);        // the first is whole
      expect([detail, conds.classList.contains('overflow')]).toEqual([detail, true]);
      chip.click();
      expect([r.store.get().placingMore, r.root.querySelector('#confirm .more-count')]).toEqual([true, null]);
    } finally { r.cleanup(); }
  });
  it('remembers More for the session: it stays open for the next card, and Less stays folded', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.world.milestone = 'capital';
      r.ui.refresh();
      expect(r.store.get().placingMore).toBe(false);
      card(r, 'services', 'well');
      r.root.querySelector('#confirm .more-toggle').click();
      expect(r.store.get().placingMore).toBe(true);
      r.ui.placement.cancel();
      expect(r.store.get().mode).toBe('browse');
      card(r, 'food', 'farm_grain');
      expect([r.root.querySelector('#confirm .confirm').classList.contains('more-open'), r.root.querySelector('#confirm .more-toggle').textContent]).toEqual([true, 'Less']);
      r.root.querySelector('#confirm .more-toggle').click();
      r.ui.placement.cancel();
      card(r, 'services', 'well');
      expect(r.root.querySelector('#confirm .confirm').classList.contains('more-open')).toBe(false);
    } finally { r.cleanup(); }
  });
  it('takes the tab row\'s place: the dock is gone while placing and the panel stands on the screen\'s foot, no band below it', async () => {
    for (const [w, h, text] of [[390, 844, 100], [375, 667, 150]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        r.ui.settings.set({ textSize: text, reducedMotion: 'on' });
        r.world.milestone = 'capital';
        r.ui.refresh();
        card(r, 'food', 'farm_grain');
        const shell = r.root.getBoundingClientRect(), bar = r.root.querySelector('#confirm .confirm').getBoundingClientRect();
        expect([text, getComputedStyle(r.root.querySelector('#dock')).display, Math.abs(bar.bottom - shell.bottom) <= 1]).toEqual([text, 'none', true]);
      } finally { r.cleanup(); }
    }
  });
  it('holds the ghost above the panel and left of the rail, More open too, at 375x667 and 150% text under a goal row', async () => {
    for (const more of [false, true]) {
      const r = await rigUI({ width: 375, height: 667 });
      try {
        r.ui.settings.set({ textSize: 150, reducedMotion: 'on', help: 'off' });
        r.world.milestone = 'capital';
        r.ui.refresh();
        const filler = document.createElement('div');
        filler.style.cssText = 'height:67px;width:10px;pointer-events:none';
        filler.append(document.createTextNode(' '));
        r.root.querySelector('#under-bar').append(filler);
        r.store.set({ placingMore: more });
        card(r, 'food', 'farm_grain');
        r.ui.cameraControl.tick(1e6);
        const s = r.store.get();
        const { w, d } = dimsOf('farm_grain', s.tool.rot || 0);
        const pts = [[0, 0], [w, 0], [0, d], [w, d]].map(([dx, dy]) => tileToScreen(r.cam, { width: 375, height: 667 }, s.ghost.x + dx, s.ghost.y + dy));
        const barTop = r.root.querySelector('#confirm .confirm').getBoundingClientRect().top;
        const railLeft = Math.min(...[...r.root.querySelectorAll('#corners .speed-main, #corners .speed-chevron, #corners .minimap-button, #corners .overlay-button')].map((n) => n.getBoundingClientRect().left - r.canvas.getBoundingClientRect().left));
        const rowsEnd = r.root.querySelector('#under-bar').getBoundingClientRect().bottom;
        expect([more, Math.max(...pts.map((p) => p[1])) <= barTop, Math.max(...pts.map((p) => p[0])) <= railLeft, Math.min(...pts.map((p) => p[1])) >= rowsEnd - 2]).toEqual([more, true, true, true]);
      } finally { r.cleanup(); }
    }
  });
  it('re-frames the ghost when More opens and the panel grows over it', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150, reducedMotion: 'on', help: 'off' });
      r.world.milestone = 'capital';
      r.ui.refresh();
      card(r, 'food', 'farm_grain');
      r.ui.cameraControl.tick(1e6);
      r.root.querySelector('#confirm .more-toggle').click();
      r.ui.cameraControl.tick(1e6);
      const s = r.store.get();
      const { w, d } = dimsOf('farm_grain', s.tool.rot || 0);
      const lowest = Math.max(...[[0, 0], [w, 0], [0, d], [w, d]].map(([dx, dy]) => tileToScreen(r.cam, { width: 375, height: 667 }, s.ghost.x + dx, s.ghost.y + dy)[1]));
      expect(lowest <= r.root.querySelector('#confirm .confirm').getBoundingClientRect().top).toBe(true);
    } finally { r.cleanup(); }
  });
  it('leaves landscape, tablet and wide with the full bar: no More, no phone class', async () => {
    for (const [w, h] of [[844, 390], [1024, 768], [1280, 800]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        r.world.milestone = 'capital';
        r.ui.refresh();
        r.ui.placement.start({ kind: 'building', type: 'well' }, { x: 14, y: 9 });
        const bar = r.root.querySelector('#confirm .confirm');
        expect([w, bar.classList.contains('phone'), r.root.querySelector('#confirm .more-toggle')]).toEqual([w, false, null]);
        expect(shown(bar.querySelector('.effect'))).toBe(true);
      } finally { r.cleanup(); }
    }
  });
});
