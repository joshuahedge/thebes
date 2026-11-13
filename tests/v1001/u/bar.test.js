// Version 10.0.1, Track U (ruling 2352, U.5): the bottom bar and the corner buttons stay put. On a phone the dock keeps one height in every state and the speed, Map and Layers buttons keep
// one place; the tray and the placing bar open above them, in their own region.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';

const rect = (r, sel) => { const n = r.root.querySelector(sel); if (!n) return null; const b = n.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, b: b.bottom }; };
const snap = (r) => ({ dock: rect(r, '#dock'), speed: rect(r, '#corners .speed-main'), map: rect(r, '#corners .minimap-button'), layers: rect(r, '#corners .overlay-button') });
const same = (a, b) => ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) <= 1);
const close = (r, a, b) => ['dock', 'speed', 'map', 'layers'].every((k) => (k === 'layers' || k === 'map' ? Math.abs(a[k].x - b[k].x) <= 1 && Math.abs(a[k].y - b[k].y) <= 1 : same(a[k], b[k])));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

for (const [w, h] of [[390, 844], [375, 667]]) {
  for (const size of [100, 150]) {
    describe(`v1001 u bottom bar ${w}x${h} at ${size}%`, () => {
      it('keeps the dock\'s height and the three corner buttons\' places in every state', async () => {
        const r = await rigUI({ width: w, height: h });
        try {
          r.renderer.renderFrame = () => {};
          r.ui.settings.set({ textSize: size });
          r.store.set({ dock: 'slim', mode: 'browse', tool: null, sheet: null });
          await tick();
          const idle = snap(r);
          expect(idle.speed !== null && idle.map !== null && idle.layers !== null).toBe(true);
          const seen = [];
          for (const category of ['roads', 'homes', 'food', 'services']) {
            r.store.set({ category, dock: 'tray' });
            await tick();
            const s = snap(r);
            seen.push(`${category}: ${JSON.stringify(s) === JSON.stringify(idle) ? 'same' : close(r, idle, s) ? 'same' : JSON.stringify(s)}`);
            expect(close(r, idle, s)).toBe(true);
            const tray = rect(r, '#dock .tray');
            expect(tray.b <= s.speed.y + 1).toBe(true);                            // the tray opens above the buttons, never over them
          }
          const card = [...r.root.querySelectorAll('#dock .tray .card')].find((b) => !b.classList.contains('locked') && b.dataset.item !== 'demolish');
          card.click();
          await tick();
          const placing = snap(r);
          expect(close(r, idle, placing)).toBe(true);
          const bar = rect(r, '#confirm .confirm');
          expect(bar.b <= placing.speed.y + 1).toBe(true);                         // the placing bar stands above the buttons
          r.store.set({ mode: 'browse', tool: null, ghost: null, dock: 'slim' });
          await tick();
          expect(close(r, idle, snap(r))).toBe(true);
        } finally { r.cleanup(); }
      });
    });
  }
}
