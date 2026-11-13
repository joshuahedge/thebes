// Version 10.0.2 (ruling 2446): how much of a 390x844 screen at 100% text the bottom panels and the rail cover (the share of its area under the dock, an open tray, the placing panel and the four rail
// buttons, counted once where they overlap). 10.0.1 (measured on 635abaa, the same way, the early scene) covered about 12.5% idle, 32.6% with the Roads tray open and 31.7% placing a farm, as a stack
// 37% of the screen's height tall with its full-width corner row. The targets: about 10% idle, 25% with cards open, 20% placing collapsed.
import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
// Area share of the screen under the union of the visible boxes, on a 2 px grid.
function coverage(r, w, h) {
  const shell = r.root.getBoundingClientRect(), S = 2, gw = Math.ceil(w / S), gh = Math.ceil(h / S), grid = new Uint8Array(gw * gh);
  const sel = ['#dock', '#confirm .confirm', '#corners .speed-main', '#corners .speed-chevron', '#corners .minimap-button', '#corners .overlay-button'];
  for (const n of sel.flatMap((s) => [...r.root.querySelectorAll(s)])) {
    if (!n.getClientRects().length || getComputedStyle(n).display === 'none' || getComputedStyle(n).visibility === 'hidden') continue;
    const b = n.getBoundingClientRect();
    const l = b.left - shell.left, t = b.top - shell.top, rr = b.right - shell.left, bb = b.bottom - shell.top;
    for (let y = Math.max(0, Math.floor(t / S)); y < Math.min(gh, Math.ceil(bb / S)); y++) for (let x = Math.max(0, Math.floor(l / S)); x < Math.min(gw, Math.ceil(rr / S)); x++) grid[y * gw + x] = 1;
  }
  let n = 0;
  for (const c of grid) n += c;
  return 100 * n * S * S / (w * h);
}

describe('v1002 coverage: the bottom of a 390x844 phone at 100% text', () => {
  it('covers about 10% idle, a quarter and a little more with cards open, and under 20% placing folded', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.renderer.renderFrame = () => {};
      r.ui.settings.set({ textSize: 100, reducedMotion: 'on' });
      r.world.milestone = 'capital';
      r.ui.refresh();
      r.store.set({ dock: 'slim', mode: 'browse', tool: null, sheet: null });
      await tick();
      const idle = coverage(r, 390, 844);
      const trays = {};
      for (const category of ['roads', 'homes', 'food', 'services']) { r.store.set({ category, dock: 'tray' }); await tick(); trays[category] = coverage(r, 390, 844); }
      r.store.set({ category: 'food', dock: 'tray' });
      await tick();
      r.root.querySelector('#dock .tray .card[data-item="farm_grain"]').click();
      await tick();
      const placing = coverage(r, 390, 844);
      r.root.querySelector('#confirm .more-toggle').click();
      await tick();
      const more = coverage(r, 390, 844);
      const note = JSON.stringify({ idle, trays, placing, more });
      expect([note, idle <= 12]).toEqual([note, true]);                                           // about 10%: the dock (8.5%) and the rail (2.7%)
      expect([note, Math.min(...Object.values(trays)) <= 25, Math.max(...Object.values(trays)) <= 25.5]).toEqual([note, true, true]);   // the shortest tray is within 25%; Version 10.0.3 (ruling 2464): the Roads tray lost its water lines (30.1% to 23.9%), so the tallest is Food's 25.1% (10.0.2 allowed 31%; 10.0.1: 32.6% and a 37%-tall stack)
      expect([note, placing <= 20]).toEqual([note, true]);
      expect([note, more <= 31]).toEqual([note, true]);
    } finally { r.cleanup(); }
  });
});
