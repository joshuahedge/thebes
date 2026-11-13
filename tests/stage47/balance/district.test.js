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
// Version 10.0.1, Track S (ruling 2368): the near storehouse, with no order, now fetches the pottery for the bazaars by itself (src/sim/carts.js autoFetchMap),
// so "no order" no longer means no pottery. The scene without pottery is now every storehouse but the far one refusing pottery (accept switches off: none fetches it);
// the order and the store left alone (fetching by itself) both bring it.
const scene = (mode) => {
  const w = createWorld({ seed: 11, size: 64, mapVariant: 'classic' });
  buildSampleCity(w);
  const info = buildCartsCity(w);
  for (const h of housesOf(w)) if (h.tier === 5) h.tier = 4;                      // the townhouses start a tier down: waiting to rise (they need pottery)
  // 'refused': every store but the far one refuses pottery (the sample city's other storehouses by its bazaars would fetch it by themselves too).
  if (mode === 'refused') for (const b of Object.values(w.buildings)) if (b.type === 'storehouse' && b.id !== info.far) b.accepts = { ...(b.accepts || {}), pottery: false };
  const tip = farGoodTip(w);
  const before = { tiers: tiers(w), five: atLeast(w, 5), waiting: tip ? tip.count : 0 };
  if (mode === 'order') expect(setFetch(w, info.near, 'pottery', 100).ok).toBe(true);
  advanceDays(w, 120);
  return { w, before, after: { tiers: tiers(w), five: atLeast(w, 5), tip: farGoodTip(w) } };
};

describe('s47 balance district', () => {
  it('shows homes upgrading once the near storehouse Fetches pottery (by an order or by itself), and none while it refuses pottery', () => {
    const none = scene('refused');
    const fetched = scene('order');
    const itself = scene('auto');
    expect([none.before.five, fetched.before.five, none.before.waiting]).toEqual([1, 1, 31]);   // one manor above them, 31 homes waiting (Version 6.0: the sample city's Manor is merged as a fixture, so two more plots stay apart; it was 29)
    expect(none.after.five).toBe(0);                                                            // no pottery near them: none rises, the manor falls back
    expect(none.after.tip.count).toBeGreaterThan(25);
    expect(none.w.tally.cartTrips).toBe(12);   // 10.0.1 (ruling 2368): the stores still fetch the other goods their bazaars run out of (was 0 trips)
    for (const s of [fetched, itself]) {
      expect(s.after.five).toBeGreaterThanOrEqual(20);                                          // the carts bring it: the townhouses rise
      expect(s.after.tiers[5]).toBeGreaterThanOrEqual(20);
      expect(s.after.tip).toBe(null);                                                           // the far-pottery tip is answered
      expect(s.w.tally.cartTrips).toBeGreaterThanOrEqual(10);
    }
  });
});
