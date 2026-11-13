// Version 10.0, Track M (ruling 2302, C14): placing at 150% text on a phone under 700 px tall folds the bar to its cost line, so the map keeps its room.
// Version 10.0.2 (ruling 2444): the fold is the phone's placing panel at EVERY size and text size now (the name, the cost and one row of pills; More opens the balance, the effect and the rest), so the
// two pins below moved: the 100% and the 390x844 panels are folded too, and each case also checks that More brings the balance and the effect back, short phone at large text included.
import { describe, it, expect } from '../../harness.js';
import { devScene, MOBILE_SCENE_PARAMS } from '../../../src/dev/scenes.js';
import { bootAt, frame, rect } from './helpers.js';

async function placingAt(width, height, textSize, more = false) {
  const r = await bootAt(MOBILE_SCENE_PARAMS.placing, width, height, textSize);
  await devScene(r.api, 'placing', { quick: true });
  if (more) r.api.game().ui.store.set({ placingMore: true });
  await frame(); await frame();
  const shown = (sel) => { const n = r.root.querySelector(`#confirm ${sel}`); return Boolean(n) && n.getBoundingClientRect().height > 0; };
  const out = { bar: rect(r.root, '#confirm .confirm'), cost: shown('.lines .cost'), balance: shown('.lines .balance'), effect: shown('.lines .effect'), chips: shown('.conds'), short: document.body.classList.contains('short') };
  r.cleanup();   // one page at a time: the text size and the layout sit on the body
  return out;
}

describe('v100 m: the placing bar folds on a short phone at large text (C14)', () => {
  it('375x667 at 150%: the cost line and the chips stay, the balance and the effect go, and the bar is much shorter', async () => {
    const big = await placingAt(375, 667, 150), plain = await placingAt(375, 667, 100);
    expect([big.short, big.cost, big.chips, big.balance, big.effect]).toEqual([true, true, true, false, false]);
    expect([plain.cost, plain.chips, plain.balance]).toEqual([true, true, false]);   // 10.0.2: folded at 100% as well; More brings the balance back (below)
    expect(big.bar.height).toBeLessThan(160);
    const more = await placingAt(375, 667, 150, true);
    expect([more.cost, more.chips, more.balance]).toEqual([true, true, true]);
    expect(more.bar.height).toBeGreaterThan(big.bar.height);
  });
  it('390x844 at 150% (not short) folds the same way, and More has its lines', async () => {
    const t = await placingAt(390, 844, 150);
    expect([t.short, t.cost, t.balance, t.chips]).toEqual([false, true, false, true]);   // 10.0.2: the panel is folded here too
    const more = await placingAt(390, 844, 150, true);
    expect([more.cost, more.balance, more.chips]).toEqual([true, true, true]);
  });
});
