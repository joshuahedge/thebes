// Stage 4.7 Task 5 (ruling 466): the far-store tip as the interface raises it, and the caption for goods a cart loses. The rule is the sim's (farGoodTip, in
// carts.test.js); here the month end fires the tip with the city's own good, its Show me goes to the far store, and it is said once.
import { describe, it, expect } from '../../harness.js';
import { fire } from '../../helpers/dom.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';
import { addRaw } from '../../helpers/testWorld.js';
import { TIP_FIRST_DELAY_MS } from '../../../src/data/tips.js';
import { farGoodTip } from '../../../src/sim/carts.js';
import { S47_CARTS_TEXT as W, TIP_TEXT } from '../../../src/ui/text.js';

const make = async (world) => {
  let t = 0;
  const r = await rigUI({ width: 1280, height: 800, now: () => t, world });
  r.ui.settings.set({ seenTips: ['month_summary'] });
  t = TIP_FIRST_DELAY_MS;
  return r;
};
// uiWorld's bazaar (9, 11) reaches the two House-tier homes at x 14 and 15; the storehouse stands at x = at with pottery.
const cityWith = (at) => {
  const w = uiWorld();
  w.speed = 1;
  addRaw(w, 'house', 14, 9, { tier: 4, residents: 10 });
  addRaw(w, 'house', 16, 9, { tier: 4, residents: 10 });
  return { w, far: addRaw(w, 'storehouse', at, 11, { staff: 6, store: { pottery: 100 } }) };
};

describe('s47 carts: the far-store tip', () => {
  it('fires at the month end with the city\'s own good, and its Show me opens the far store', async () => {
    const { w, far } = cityWith(28);
    const r = await make(w);
    try {
      expect(farGoodTip(w).far).toBe(far.id);
      r.ui.onEvents([{ type: 'month' }]);
      expect(r.ui.tips.current()).toBe('fetch_far');
      expect(r.root.querySelector('#tip .text').textContent).toBe('Set a storehouse near these homes to keep pottery stocked');   // Version 8.3: Keep stocked
      const show = r.root.querySelector('#tip .tip-show-me');
      expect(show.textContent).toBe('Show me');
      fire(show, 'click');
      expect([r.ui.tips.current(), r.store.get().selectedId]).toEqual([null, far.id]);
      r.ui.onEvents([{ type: 'month' }]);                                  // once only: it was seen
      expect(r.ui.tips.current()).toBe(null);
    } finally { r.cleanup(); }
  });
  it('stays quiet when a store with the good is within the bazaar\'s supply reach', async () => {
    const { w } = cityWith(20);
    const r = await make(w);
    try {
      expect(farGoodTip(w)).toBe(null);
      r.ui.onEvents([{ type: 'month' }]);
      expect(r.ui.tips.current()).toBe(null);
    } finally { r.cleanup(); }
  });
  it('shows a caption when a cart loses goods', async () => {
    const r = await make(uiWorld());
    try {
      r.ui.onEvents([{ type: 'cartLost', id: 5, good: 'pottery', amount: 20 }]);
      expect(r.root.querySelector('#cheer').textContent).toContain(W.lost({ good: 'pottery', amount: 20 }));
      expect(TIP_TEXT.fetch_far).toContain('keep it stocked');   // Version 8.3: no tip says Fetch any more
    } finally { r.cleanup(); }
  });
});
