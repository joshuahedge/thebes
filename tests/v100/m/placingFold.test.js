// Version 10.0, Track M (ruling 2302, C14): placing at 150% text on a phone under 700 px tall folds the bar to its cost line, so the map keeps its room.
import { describe, it, expect } from '../../harness.js';
import { devScene, MOBILE_SCENE_PARAMS } from '../../../src/dev/scenes.js';
import { bootAt, frame, rect } from './helpers.js';

async function placingAt(width, height, textSize) {
  const r = await bootAt(MOBILE_SCENE_PARAMS.placing, width, height, textSize);
  await devScene(r.api, 'placing', { quick: true });
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
    expect([plain.cost, plain.balance]).toEqual([true, true]);
    expect(big.bar.height).toBeLessThan(160);
  });
  it('390x844 at 150% (not short) keeps its lines', async () => {
    const t = await placingAt(390, 844, 150);
    expect([t.short, t.cost, t.balance, t.chips]).toEqual([false, true, true, true]);
  });
});
