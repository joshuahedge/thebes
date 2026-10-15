// Stage 4.7, Task 7's review fixes (made in Task 8's first commit): the quota's reminders, last year's output from the snapshot alone, room for
// the biggest raid band, the second and third food's cause ranking, the quota sheet's honest favour words and its far-store row, and the far-good
// tip judged at the tier a home grows into.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { courtWorld, YEAR, MONTH } from '../../stage46/court/courtHelpers.js';
import { pressureMonth, quotaOf, quotaAsk, quotaStatus, sendQuota, yearOutput, QUOTA_POOL } from '../../../src/sim/pressure.js';
import { outputPerMonth, stockOf } from '../../../src/sim/court.js';
import { QUOTA, RAIDS_LATE } from '../../../src/data/s47.js';
import { RAIDS } from '../../../src/data/raids.js';
import { SLOTS } from '../../../src/sim/raids.js';
import { needCause, farHeld } from '../../../src/sim/housing.js';
import { farGoodTip } from '../../../src/sim/carts.js';
import { allBuildings } from '../../../src/sim/world.js';
import { quotaNodes, createPressureUi } from '../../../src/ui/s47/pressure.js';
import { S47_PRESSURE_TEXT as P, TIP_HELP_TEXT } from '../../../src/ui/text.js';

const store = (w, type) => allBuildings(w).find((b) => b.type === type);
function quotaCity({ made = { pottery: 800, grain: 4000 }, snapshot = true } = {}) {
  const w = courtWorld({ open: true });
  w.day = (QUOTA.fromYear - 1) * YEAR;
  w.tally.made = { ...made };
  w.court.yearMade = snapshot ? { day: w.day - YEAR, made: {}, kept: Object.fromEntries(QUOTA_POOL.map((g) => [g, 1e6])) } : null;
  w.court.letters = []; w.court.request = null; w.court.nextRequestDay = w.day + 10 * YEAR; w.court.nextCardDay = w.day + 10 * YEAR;
  return w;
}

describe('s47 review7 quota reminders', () => {
  it('reminds at the month ends 3 months and 1 month before the deadline while the quota is open and unmet, with what is still owed', () => {
    const w = quotaCity();
    pressureMonth(w);
    const q = quotaOf(w);
    const at = (day) => { w.day = day; const e = []; pressureMonth(w, e); return e.filter((x) => x.type === 'quota_reminder'); };
    expect(at(q.day + 8 * MONTH)).toEqual([]);                      // 4 months left: nothing
    expect(at(q.day + 9 * MONTH + 4)).toEqual([]);                  // not a month end
    const three = at(q.due - 3 * MONTH);
    expect(three.length).toBe(1);
    expect([three[0].months, three[0].owed]).toEqual([3, q.goods.map((g) => ({ good: g.good, left: g.amount }))]);
    expect(at(q.due - 2 * MONTH)).toEqual([]);
    store(w, 'storehouse').store.pottery = 40;
    w.day = q.due - MONTH;
    sendQuota(w);                                                   // some pottery goes: the reminder says what is left
    const one = at(q.due - MONTH);
    expect([one.length, one[0].months]).toEqual([1, 1]);
    const pottery = q.goods.find((g) => g.good === 'pottery');
    expect(one[0].owed.find((g) => g.good === 'pottery').left).toBe(pottery.amount - Math.min(40, pottery.amount));
    expect(P.captionReminder(three[0])).toBe(`The yearly tribute is due in 3 months: ${three[0].owed.map((g) => `${g.left} ${g.good}`).join(', ').replace(/, ([^,]*)$/, ' and $1')} still owed. Open the court to send it.`);
    expect(P.captionReminder(one[0])).toContain('due in 1 month:');
  });

  it('says nothing once the quota is met, or with no quota, and shows the caption through the seam', () => {
    const w = quotaCity();
    pressureMonth(w);
    const q = quotaOf(w);
    for (const g of q.goods) store(w, g.good === 'grain' ? 'granary' : 'storehouse').store[g.good] = g.amount;
    sendQuota(w);
    expect(quotaOf(w).result).toBe('met');
    for (const day of [q.due - 3 * MONTH, q.due - MONTH]) { w.day = day; const e = []; pressureMonth(w, e); expect(e.some((x) => x.type === 'quota_reminder')).toBe(false); }
    const none = courtWorld({ open: true });
    none.day = 3 * YEAR + 9 * MONTH;
    const e = []; pressureMonth(none, e);
    expect(e).toEqual([]);
    const shown = [];
    const ui = createPressureUi({ world: w, celebrations: { show: (c) => shown.push(c) }, fireTip: () => {} });
    ui.onEvents([{ type: 'quota_reminder', months: 3, owed: [{ good: 'pottery', left: 140 }] }]);
    expect(shown).toEqual([{ tier: 'info', text: 'The yearly tribute is due in 3 months: 140 pottery still owed. Open the court to send it.' }]);
  });
});

describe('s47 review7 yearly output', () => {
  it('asks only what the city really made when there is a snapshot; a good made none of is not asked; without one the court\'s output stands in', () => {
    const w = quotaCity({ made: { grain: 4000 } });               // the potter works, but made none last year
    expect(outputPerMonth(w, 'pottery')).toBeGreaterThan(0);
    expect(yearOutput(w, 'pottery')).toBe(0);
    expect(quotaAsk(w).map((a) => a.good)).toEqual(['grain']);
    const old = quotaCity({ made: { grain: 4000 }, snapshot: false });
    expect(yearOutput(old, 'pottery')).toBe(outputPerMonth(old, 'pottery') * 12);
    expect(quotaAsk(old).map((a) => a.good)).toContain('pottery');
  });
});

describe('s47 review7 raid band spots', () => {
  it('has a distinct spot, inside the tile, for each raider of the biggest possible raid (18 and the highest cap, one more for two sides)', () => {
    const most = RAIDS.maxSize + Math.max(...Object.values(RAIDS_LATE.cap)) + 1;
    expect(SLOTS.length).toBeGreaterThanOrEqual(most);
    expect(new Set(SLOTS.map(([x, y]) => `${x},${y}`)).size).toBe(SLOTS.length);
    expect(SLOTS.every(([x, y]) => Math.abs(x) < 0.5 && Math.abs(y) < 0.5)).toBe(true);
  });
});

describe('s47 review7 food cause ranking', () => {
  // A home on a street with a bazaar; grain it has, the rest it lacks. Fish is the one a far store holds; figs an empty near store would bring.
  function foodCity({ nearFigs = false } = {}) {
    const w = makeTestWorld({ size: 64 });
    setRoad(w, 0, 10, 63, 10);
    const home = addRaw(w, 'house', 12, 11, { tier: 8, residents: 100, stockedFor: 100, stock: { grain: 30 } });
    addRaw(w, 'bazaar', 9, 8);
    addRaw(w, 'granary', 4, 8, { store: nearFigs ? { figs: 50 } : {} });
    addRaw(w, 'granary', 52, 8, { store: { fish: 80 } });
    staffAll(w);
    return { w, home };
  }
  it('ranks a delivery on its way first, then a good held only far away, then the first food in order', () => {
    const a = foodCity();
    const far = allBuildings(a.w).find((b) => b.x === 52);
    for (const need of ['twoFoods', 'threeFoods']) {
      const c = needCause(a.w, a.home, need);
      expect([need, c.code, c.good, c.id]).toEqual([need, 'good_far', 'fish', far.id]);
    }
    const b = foodCity({ nearFigs: true });
    for (const need of ['twoFoods', 'threeFoods']) {
      const c = needCause(b.w, b.home, need);
      expect([need, c.code, c.good]).toEqual([need, 'next_delivery', 'figs']);
    }
  });
});

describe('s47 review7 quota sheet words and far stores', () => {
  it('states both favour figures through the cap: near 100 neither word overstates the gain', () => {
    const w = quotaCity();
    pressureMonth(w);
    for (const [favour, early, late] of [[50, 8, 5], [96, 4, 4], [99, 1, 1], [100, 0, 0]]) {
      w.court.favour = favour;
      w.day = quotaOf(w).day + 2 * MONTH;
      const st = quotaStatus(w);
      expect([favour, st.favour, st.favourLate]).toEqual([favour, early, late]);
      const signed = (n) => (n > 0 ? `+${n}` : String(n));
      const words = P.ifMetText(st);
      expect(words).toContain(`${signed(early)} by month ${QUOTA.early}`);
      expect(words).toContain(`${signed(late)} after`);
    }
    expect(TIP_HELP_TEXT.raids_wealth).toContain('up to 3-9 more raiders, by level');
  });

  it('says nothing of Fetch on a quota good held only in a far store, because Send ships it from any store at any distance', () => {
    const w = quotaCity();
    addRaw(w, 'bazaar', 3, 8);
    const near = store(w, 'storehouse');
    const far = addRaw(w, 'storehouse', 36, 8, { store: {} });
    staffAll(w);
    pressureMonth(w);
    near.store.pottery = 0;
    far.store.pottery = 120;
    const picked = [];
    const act = { send: () => sendQuota(w), select: (id) => picked.push(id) };
    expect(farHeld(w, 'pottery').code).toBe('good_far');                      // a house would be told to Fetch it; the tribute is not
    const list = quotaNodes(w, act).find((n) => n.classList && n.classList.contains('quota-goods'));
    expect(list.querySelector('.quota-far, .quota-far-actions')).toBe(null);
    expect(list.textContent.includes('Fetch')).toBe(false);
    expect(quotaStatus(w).goods.find((g) => g.good === 'pottery').have).toBe(120);   // the status counts the far store, and Send takes from it
    const sent = sendQuota(w);
    expect([sent.ok, sent.shipped.pottery > 0, far.store.pottery < 120]).toEqual([true, true, true]);
  });
});

describe('s47 review7 far-good tip', () => {
  it('judges a home at the tier it grows into: a Fine manor with a month at its own use still waits for the Villa\'s', () => {
    const w = makeTestWorld({ size: 64 });
    setRoad(w, 0, 10, 63, 10);
    addRaw(w, 'bazaar', 9, 8);
    addRaw(w, 'storehouse', 4, 8, { store: {} });
    addRaw(w, 'storehouse', 52, 8, { store: { pottery: 400, beer: 400, linen: 400 } });
    const home = addRaw(w, 'house', 12, 11, { tier: 7, residents: 150, stockedFor: 150, stock: { pottery: 6, beer: 6, linen: 6 } });
    staffAll(w);
    expect(farGoodTip(w) === null).toBe(false);                          // 6 is a month at tier 7's use; the Villa asks 9-12
    home.stock = { pottery: 12, beer: 12, linen: 9 };
    expect(farGoodTip(w)).toBe(null);
  });
});
