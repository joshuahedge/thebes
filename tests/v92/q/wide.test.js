// Version 9.2, Track Q, 3.4 (ruling 1777): on the wide layout the goals strip and the rank bar are in the side panel above the minimap; the top left keeps one banner and
// one tip. T7: 1280x800 with a raid warning, a goal, a rank bar and a tip: at most two rows over the map. Phones keep the strip where it was.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';

const shown = (n) => Boolean(n) && n.getClientRects().length > 0 && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden';
const rowsOverMap = (root) => [...root.querySelectorAll('#under-bar > *')].filter((n) => shown(n) && n.getBoundingClientRect().height > 4);

describe('v92 q wide: the desktop\'s top left', () => {
  it('T7: at 1280x800 with a raid warning, a goal and its rank bar, #goals is the panel\'s, above the minimap, and the top left holds the banner alone', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.raid.warning = { index: 1, entry: { x: 31, y: 16 }, dir: 'east', size: 8, tribute: 360, target: 'storehouse', day: 800, arrives: r.world.day + 80, first: false };
      r.ui.refresh();
      const goals = r.root.querySelector('#goals'), panel = r.root.querySelector('#panel');
      expect(goals.parentNode).toBe(panel);
      expect(goals.nextElementSibling.classList.contains('minimap')).toBe(true);
      expect(shown(goals.querySelector('.goal-strip'))).toBe(true);
      const bar = goals.querySelector('.threshold');
      expect([Boolean(bar), bar && shown(bar)]).toEqual([true, true]);
      const rows = rowsOverMap(r.root);
      expect(rows.map((n) => n.id)).toEqual(['banner']);
      expect(rows.length).toBeLessThanOrEqual(2);
      // the strip is inside the panel's box
      const pr = panel.getBoundingClientRect(), gr = goals.getBoundingClientRect();
      expect([gr.left >= pr.left - 1, gr.right <= pr.right + 1]).toEqual([true, true]);
      // folding the panel gives the strip its old place back, and unfolding takes it into the panel again
      r.store.set({ panelFolded: true });
      expect(goals.parentNode.id).toBe('under-bar');
      r.store.set({ panelFolded: false });
      expect(goals.parentNode).toBe(panel);
    } finally { r.cleanup(); }
  });

  it('the portrait layout keeps the goals strip under the top bar', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.refresh();
      expect(r.root.querySelector('#goals').parentNode.id).toBe('under-bar');
    } finally { r.cleanup(); }
  });
});
