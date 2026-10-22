// Stage 4.7, Task 8 (ruling 466): the far-district scene (src/dev/s47/carts.js) as a balance check. Its homes wait on pottery held only in a storehouse 35
// road tiles from their bazaars (the potters paused, the sample city's pottery taken away). The sample city's 28 townhouses start a tier down (waiting to rise
// to Townhouse, which needs pottery). Measured (seed 11, classic 64, 120 days), homes at Townhouse or above / homes still waiting on far pottery / trips:
//   no Fetch order                          0 (1 manor before, which falls back) / 31 / 0
//   the near storehouse Fetches pottery 100 26 (25 townhouses and the manor) / none / 14
import { describe, it, expect } from '../../harness.js';
import { createWorld, housesOf } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { buildCartsCity } from '../../../src/dev/s47/carts.js';
import { setFetch, farGoodTip } from '../../../src/sim/carts.js';
import { advanceDays } from '../../../src/sim/clock.js';

const tiers = (w) => {
  const out = {};
  for (const h of housesOf(w)) out[h.tier] = (out[h.tier] || 0) + 1;
  return out;
};
const atLeast = (w, tier) => housesOf(w).filter((h) => h.tier >= tier).length;
const scene = (order) => {
  const w = createWorld({ seed: 11, size: 64, mapVariant: 'classic' });
  buildSampleCity(w);
  const info = buildCartsCity(w);
  for (const h of housesOf(w)) if (h.tier === 5) h.tier = 4;                      // the townhouses start a tier down: waiting to rise (they need pottery)
  const before = { tiers: tiers(w), five: atLeast(w, 5), waiting: farGoodTip(w).count };
  if (order) expect(setFetch(w, info.near, 'pottery', 100).ok).toBe(true);
  advanceDays(w, 120);
  return { w, before, after: { tiers: tiers(w), five: atLeast(w, 5), tip: farGoodTip(w) } };
};

describe('s47 balance district', () => {
  it('shows homes upgrading once the near storehouse Fetches pottery, and none without the order', () => {
    const none = scene(false);
    const fetched = scene(true);
    expect([none.before.five, fetched.before.five, none.before.waiting]).toEqual([1, 1, 31]);   // one manor above them, 31 homes waiting (Version 6.0: the sample city's Manor is merged as a fixture, so two more plots stay apart; it was 29)
    expect(none.after.five).toBe(0);                                                            // no pottery near them: none rises, the manor falls back
    expect(none.after.tip.count).toBeGreaterThan(25);
    expect(none.w.tally.cartTrips).toBe(0);
    expect(fetched.after.five).toBeGreaterThanOrEqual(20);                                      // the carts bring it: the townhouses rise
    expect(fetched.after.tiers[5]).toBeGreaterThanOrEqual(20);
    expect(fetched.after.tip).toBe(null);                                                       // the far-pottery tip is answered
    expect(fetched.w.tally.cartTrips).toBeGreaterThanOrEqual(10);
  });
});
