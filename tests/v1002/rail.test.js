// Version 10.0.2 (rulings 2440-2443): on a portrait phone Play, Speed, Map and Layers are four round buttons in a rail on the right edge, with ONE place in every state: the same four rects (within 1 px)
// idle, with each tab's cards open, a card picked, More open, a card being dragged, a sheet open, a layer on, at both phone sizes and both text sizes. The rail's foot is above the tallest bottom panel.
import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire } from '../helpers/dom.js';
import { openSheet } from '../../src/ui/modes.js';

const BUTTONS = ['.speed-main', '.speed-chevron', '.minimap-button', '.overlay-button'];
const rects = (r) => BUTTONS.map((sel) => { const b = r.root.querySelector(`#corners ${sel}`).getBoundingClientRect(), shell = r.root.getBoundingClientRect(); return { x: b.left - shell.left, y: b.top - shell.top, w: b.width, h: b.height }; });
const same = (a, b) => a.every((q, i) => ['x', 'y', 'w', 'h'].every((k) => Math.abs(q[k] - b[i][k]) <= 1));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const firstCard = (r, item) => [...r.root.querySelectorAll('#dock .tray .card')].find((b) => (item ? b.dataset.item === item : !b.classList.contains('locked') && b.dataset.item !== 'demolish'));

for (const [w, h] of [[390, 844], [375, 667]]) {
  for (const size of [100, 150]) {
    describe(`v1002 rail ${w}x${h} at ${size}%`, () => {
      it('keeps the four buttons at one place idle, with cards open, placing, with More open, dragging, behind a sheet and with a layer on', async () => {
        const r = await rigUI({ width: w, height: h });
        try {
          r.renderer.renderFrame = () => {};
          r.ui.settings.set({ textSize: size, reducedMotion: 'on' });
          r.world.milestone = 'capital';
          r.store.set({ dock: 'slim', mode: 'browse', tool: null, sheet: null });
          await tick();
          const idle = rects(r), seen = [];
          // Each is a 44 px round button, one above the next, inside the screen, on the right edge.
          for (const [i, q] of idle.entries()) {
            expect([i, q.w >= 44 && q.w <= 44.5, q.h >= 44 && q.h <= 44.5, q.x + q.w <= w, q.x >= w / 2]).toEqual([i, true, true, true, true]);
            if (i > 0) expect([i, q.y >= idle[i - 1].y + idle[i - 1].h]).toEqual([i, true]);
          }
          const check = (what) => { const now = rects(r); seen.push(`${what}: ${same(idle, now) ? 'same' : JSON.stringify(now)}`); expect(same(idle, now)).toBe(true); };
          for (const category of ['roads', 'homes', 'food', 'services']) {
            r.store.set({ category, dock: 'tray' });
            await tick();
            check(`cards ${category}`);
            const tray = r.root.querySelector('#dock .tray').getBoundingClientRect(), dock = r.root.querySelector('#dock').getBoundingClientRect(), shell = r.root.getBoundingClientRect();
            const rail = idle[idle.length - 1];
            expect([category, rail.y + rail.h <= dock.top - shell.top, tray.bottom <= dock.bottom]).toEqual([category, true, true]);   // the rail's foot is above the open tray
          }
          // A card picked (a farm: the tallest panel, with pills), then More.
          r.store.set({ category: 'food', dock: 'tray' });
          await tick();
          firstCard(r, 'farm_grain').click();
          await tick();
          expect(r.store.get().mode).toBe('placing');
          check('placing');
          const bar = r.root.querySelector('#confirm .confirm').getBoundingClientRect(), shell = r.root.getBoundingClientRect();
          expect(idle[idle.length - 1].y + idle[idle.length - 1].h <= bar.top - shell.top).toBe(true);   // the rail's foot is above the panel, in More too (below)
          r.root.querySelector('#confirm .more-toggle').click();
          await tick();
          expect(r.store.get().placingMore).toBe(true);
          check('more');
          const open = r.root.querySelector('#confirm .confirm').getBoundingClientRect();
          expect(idle[idle.length - 1].y + idle[idle.length - 1].h <= open.top - shell.top).toBe(true);
          r.store.set({ placingMore: false });
          r.ui.placement.cancel();
          await tick();
          // A card being dragged: the press, the 14 px lead up, then a move onto the map.
          r.store.set({ category: 'food', dock: 'tray' });
          await tick();
          const card = firstCard(r, 'farm_grain'), cb = card.getBoundingClientRect();
          const base = { pointerId: 7, pointerType: 'touch', button: 0, isPrimary: true };
          fire(card, 'pointerdown', { ...base, clientX: cb.left + cb.width / 2, clientY: cb.top + cb.height / 2, buttons: 1 });
          fire(document, 'pointermove', { ...base, clientX: cb.left + cb.width / 2, clientY: cb.top - 14, buttons: 1 });
          const mid = r.at(w * 0.4, h * 0.4);
          fire(document.querySelector('.card-drag-surface') || document, 'pointermove', { ...base, ...mid, buttons: 1 });
          await tick();
          expect(document.body.classList.contains('card-dragging')).toBe(true);
          check('drag');
          fire(document.querySelector('.card-drag-surface') || document, 'pointercancel', { ...base, ...mid, buttons: 0 });
          r.ui.placement.cancel();
          r.store.set({ mode: 'browse', tool: null, ghost: null, dock: 'slim' });
          await tick();
          check('idle again');
          r.store.set(openSheet(r.store.get(), 'summary'));
          await tick();
          check('sheet open');
          r.store.set({ sheet: null });
          r.store.set({ overlay: 'entertainment' });                                // the longest layer's name
          await tick();
          check('a layer on');
          expect(seen.length).toBeGreaterThan(5);
        } finally { r.cleanup(); }
      });
      it('does not grow with the text size: every button is 44 px, the rail as slim at 150% as at 100%', async () => {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          await tick();
          const widths = rects(r).map((q) => [Math.round(q.w), Math.round(q.h)]);
          expect(widths).toEqual([[44, 44], [44, 44], [44, 44], [44, 44]]);
        } finally { r.cleanup(); }
      });
    });
  }
}

describe('v1002 rail: what each button shows, and what it keeps', () => {
  it('Play shows the drawn picture and the Paused tag; Speed shows the speed; Map its count; Layers is tinted while a layer is on', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.world.speed = 0;
      r.ui.speedControl.render();
      await tick();
      const play = r.root.querySelector('#corners .speed-main'), speed = r.root.querySelector('#corners .speed-chevron'), layers = r.root.querySelector('#corners .overlay-button');
      expect([play.dataset.state, play.querySelector('.speed-picture') !== null, getComputedStyle(play.querySelector('.state-tag')).display]).toEqual(['paused', true, 'block']);
      expect(play.querySelector('.state-tag').textContent).toBe('Paused');
      expect(parseFloat(getComputedStyle(play.querySelector('.state-tag')).fontSize)).toBeGreaterThanOrEqual(12);
      r.ui.speedControl.set(2);
      await tick();
      expect([play.dataset.state, speed.querySelector('.speed-now').textContent, getComputedStyle(speed.querySelector('.speed-now')).display]).toEqual(['playing', '2×', 'block']);
      expect(getComputedStyle(play.querySelector('.face .word')).display).toBe('none');       // the word is not drawn on the rail
      const plain = getComputedStyle(layers).backgroundColor;
      r.store.set({ overlay: 'ground' });
      await tick();
      expect(getComputedStyle(layers).backgroundColor !== plain).toBe(true);                    // tinted
      expect(layers.getAttribute('aria-pressed')).toBe('true');
      r.store.set({ overlay: null });
    } finally { r.cleanup(); }
  });
  it('keeps the titles, the aria labels and the key hints, the Speed popup and the Map and Layers openings', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const play = r.root.querySelector('#corners .speed-main'), speed = r.root.querySelector('#corners .speed-chevron'), map = r.root.querySelector('#corners .minimap-button'), layers = r.root.querySelector('#corners .overlay-button');
      expect([speed.getAttribute('aria-label'), speed.title, map.getAttribute('aria-label').startsWith('Map'), map.title, layers.title !== '', play.getAttribute('aria-label') !== null]).toEqual(['Speed', 'Speed', true, 'Map', true, true]);   // (the Map's name adds its alert count)
      expect(play.getAttribute('aria-keyshortcuts')).toBe('Space');
      expect(map.getAttribute('aria-keyshortcuts') !== null).toBe(true);
      speed.click();                                                                            // Speed opens its 1x 2x 3x, as before
      const options = r.root.querySelector('#corners .speed-options');
      expect([options.hidden, speed.getAttribute('aria-expanded'), options.querySelectorAll('button').length]).toEqual([false, 'true', 3]);
      const pop = options.getBoundingClientRect(), sp = speed.getBoundingClientRect();
      expect(pop.right <= sp.left + 0.5).toBe(true);                                            // beside the rail, never over it
      options.querySelectorAll('button')[2].click();
      expect([r.world.speed, options.hidden]).toEqual([3, true]);
      map.click();
      expect(r.store.get().sheet && r.store.get().sheet.kind).toBe('minimap');
      r.store.set({ sheet: null });
      layers.click();
      expect(r.store.get().layersOpen).toBe(true);
      const picker = r.root.querySelector('#corners .layers-picker').getBoundingClientRect(), lb = layers.getBoundingClientRect(), shell = r.root.getBoundingClientRect();
      expect([picker.right <= lb.left + 0.5, picker.left >= shell.left, picker.top >= shell.top]).toEqual([true, true, true]);   // the picker opens beside the rail, inside the screen
    } finally { r.cleanup(); }
  });
  it('stays clear of the rows under the top bar and of a toast: the rows end at its edge when they reach it', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150, reducedMotion: 'on', help: 'off' });
      const filler = document.createElement('div');
      filler.style.cssText = 'height:110px;width:300px;pointer-events:none;background:#ccc';
      filler.append(document.createTextNode(' '));
      r.root.querySelector('#under-bar').append(filler);
      r.store.set({ dock: 'slim', mode: 'browse' });
      await tick();
      expect(document.body.classList.contains('rail-clear')).toBe(true);
      const rail = BUTTONS.map((s) => r.root.querySelector(`#corners ${s}`).getBoundingClientRect());
      const rows = [...r.root.querySelectorAll('#under-bar > *')].filter((n) => n.getClientRects().length).map((n) => n.getBoundingClientRect());
      const hit = rows.some((a) => rail.some((b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
      expect(hit).toBe(false);
      filler.remove();
      await tick();
      r.ui.toasts.show('Road laid');
      r.store.set({ category: 'roads', dock: 'tray' });
      await tick();
      const toast = r.root.querySelector('#toasts .toast').getBoundingClientRect();
      expect(rail.some((b) => toast.left < b.right && toast.right > b.left && toast.top < b.bottom && toast.bottom > b.top)).toBe(false);
    } finally { r.cleanup(); }
  });
});
