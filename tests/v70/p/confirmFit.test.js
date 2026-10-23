// Version 7.0, Track P (fixer round 1): the placing bar's why line must not push the building's name off the top. On a phone held sideways (667x375) at 150% text the compact
// drawer is only as tall as the screen's right-hand column leaves, and a refused building (coral) or a half-working one (amber) already has the chips row and a Show me row; the
// extra why line took the room and cut off the name and cost line. At that size the why line is left in the page, hidden (the chips name each rule that fails).
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { QUAY_TYPE } from '../../../src/data/trade.js';

const FARM = { kind: 'building', type: 'farm_grain' };
const QUAY = { kind: 'building', type: QUAY_TYPE };

// A refused spot for each: the Quay on dry land (no water), a farm half on the fields (fertile ground only under 2 of its 4 squares).
const CASES = [['Quay', QUAY, 20, 20, 'Needs water'], ['farm', FARM, 7, 20, 'fertile']];

async function barAt(tool, x, y, textSize, width, height) {
  const r = await rigUI({ width, height });
  r.world.milestone = 'capital';
  r.ui.settings.set({ textSize, reducedMotion: 'on', help: 'off' });
  r.ui.placement.start(tool, { x, y });
  r.ui.placement.moveGhost(x, y);
  r.ui.refresh();
  return r;
}

describe('v70 p the compact placing bar keeps the name on screen', () => {
  for (const [label, tool, x, y] of CASES) {
    it(`a refused ${label} at 667x375 and 150% text: the drawer's top is on the screen, the name and the cost are visible, and the why line stays in the page, hidden`, async () => {
      const r = await barAt(tool, x, y, 150, 667, 375);
      try {
        const pv = r.ui.placement.preview();
        expect(pv.state).toBe('bad');
        const bar = r.root.querySelector('#confirm .confirm');
        const b = bar.getBoundingClientRect(), title = bar.querySelector('.title').getBoundingClientRect(), cost = bar.querySelector('.cost').getBoundingClientRect();
        const why = bar.querySelector('.why');
        expect([document.body.dataset.layout, document.body.dataset.textSize]).toEqual(['compact', '150']);
        expect([b.top >= 0, title.top >= b.top - 1, title.height > 0, title.bottom <= cost.top + 1, cost.bottom <= b.bottom + 1]).toEqual([true, true, true, true, true]);
        expect([Boolean(why), why && getComputedStyle(why).display, why && why.textContent]).toEqual([true, 'none', pv.why]);
        expect(bar.querySelectorAll('.conds .cond.cant').length).toBeGreaterThan(0);                // the chips still say what fails
      } finally { r.cleanup(); }
    });
  }
  it('the why line still shows at 100% text on the same screen, and in portrait at 150%', async () => {
    const wide = await barAt(QUAY, 20, 20, 100, 667, 375);
    const shownWhy = (r) => getComputedStyle(r.root.querySelector('#confirm .why')).display !== 'none';
    try { expect(shownWhy(wide)).toBe(true); } finally { wide.cleanup(); }
    const tall = await barAt(QUAY, 20, 20, 150, 390, 844);
    try { expect(shownWhy(tall)).toBe(true); } finally { tall.cleanup(); }
  });
});
