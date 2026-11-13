// Version 10.0.1, Track U (ruling 2352, U.5): the bottom bar and the corner buttons stay put. On a phone the dock keeps one height in every state and the speed, Map and Layers buttons keep
// one place; the tray and the placing bar open above them, in their own region.
// Version 10.0.2 (rulings 2440-2441, 2449): the corner row is a side rail now. The buttons still keep ONE place (tests/v1002/rail.test.js holds the four rects at all four sizes); the dock no longer keeps one
// height (its tray is inside it again) and the tray and the placing panel stand BELOW the rail instead of above a row. This file's pins moved with that: the dock's rect is not compared, and the order checks say
// the rail's foot is above the tray and above the panel.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';

const rect = (r, sel) => { const n = r.root.querySelector(sel); if (!n) return null; const b = n.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, b: b.bottom }; };
const snap = (r) => ({ speed: rect(r, '#corners .speed-main'), map: rect(r, '#corners .minimap-button'), layers: rect(r, '#corners .overlay-button') });
const close = (a, b) => ['speed', 'map', 'layers'].every((k) => ['x', 'y', 'w', 'h'].every((c) => Math.abs(a[k][c] - b[k][c]) <= 1));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

for (const [w, h] of [[390, 844], [375, 667]]) {
  for (const size of [100, 150]) {
    describe(`v1001 u bottom bar ${w}x${h} at ${size}%`, () => {
      it('keeps the three corner buttons\' places in every state (the rail), with the tray and the panel below them', async () => {
        const r = await rigUI({ width: w, height: h });
        try {
          r.renderer.renderFrame = () => {};
          r.ui.settings.set({ textSize: size });
          r.store.set({ dock: 'slim', mode: 'browse', tool: null, sheet: null });
          await tick();
          const idle = snap(r);
          expect(idle.speed !== null && idle.map !== null && idle.layers !== null).toBe(true);
          for (const category of ['roads', 'homes', 'food', 'services']) {
            r.store.set({ category, dock: 'tray' });
            await tick();
            const s = snap(r);
            expect(close(idle, s)).toBe(true);
            const tray = rect(r, '#dock .tray');
            expect(s.layers.b <= tray.y + 1).toBe(true);                           // the tray opens below the rail's foot, never over it
          }
          const card = [...r.root.querySelectorAll('#dock .tray .card')].find((b) => !b.classList.contains('locked') && b.dataset.item !== 'demolish');
          card.click();
          await tick();
          const placing = snap(r);
          expect(close(idle, placing)).toBe(true);
          const bar = rect(r, '#confirm .confirm');
          expect(placing.layers.b <= bar.y + 1).toBe(true);                        // the placing panel stands below the rail's foot
          r.store.set({ mode: 'browse', tool: null, ghost: null, dock: 'slim' });
          await tick();
          expect(close(idle, snap(r))).toBe(true);
        } finally { r.cleanup(); }
      });
    });
  }
}
