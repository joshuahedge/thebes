// Stage 4.7, Task 7 (ruling 471): the tougher upper tiers. A Villa and an Estate need three kinds of food and use more of each household good
// (src/data/housing.js threeFoods, use); a home short of them devolves a tier at a time by the usual rule (DOWNGRADE_AFTER_MONTHS); a saved city's
// Villas and Estates take that same path (no instant collapse); the house sheet states the use from the data, lists what keeps the top tier, and
// points a good held only in a far store to that store, naming Fetch.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { TIERS, MAX_TIER, DOWNGRADE_AFTER_MONTHS, useOf } from '../../../src/data/housing.js';
import { GOODS, HOUSEHOLD_GOODS } from '../../../src/data/goods.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { monthlyHousing, houseStatus, needCause } from '../../../src/sim/housing.js';
import { monthlyNeed } from '../../../src/sim/distribution.js';
import { houseDesirability } from '../../../src/sim/desirability.js';
import { buildingAt } from '../../../src/sim/world.js';
import { createPressureUi, tierUse, useTierOf } from '../../../src/ui/s47/pressure.js';
import { select } from '../../../src/ui/modes.js';
import { S47_PRESSURE_TEXT as P, NEED_NAMES, causeText, TIP_HELP_TEXT } from '../../../src/ui/text.js';

const fire = (node, type) => node.dispatchEvent(new MouseEvent(type, { bubbles: true }));

// A street along y = 10 with every service in reach of a 2x2 home at (12, 11), a bazaar stocked with `foods` and every household good, and
// statues round the home until it is pleasant enough for an Estate to rise (65).
function street({ tier = MAX_TIER, residents = 160, foods = ['grain', 'figs', 'fish'], stock = 'old' } = {}) {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'well', 14, 9);
  addRaw(w, 'temple', 20, 8);
  addRaw(w, 'booth', 16, 9);
  const bazaar = addRaw(w, 'bazaar', 9, 8);
  bazaar.store = Object.fromEntries([...foods.map((g) => [g, 300]), ...HOUSEHOLD_GOODS.map((g) => [g, 300])]);
  const home = addRaw(w, 'house', 12, 11, { tier, w: 2, d: 2, residents, stockedFor: residents });
  // An old save's stock: a month of each household good at the plain use (before ruling 471), and a month of food in `foods`.
  const use = stock === 'old' ? 1 : useOf(tier);
  home.stock = Object.fromEntries([
    ...HOUSEHOLD_GOODS.map((g) => [g, Math.ceil(residents * GOODS[g].perResidentPerMonth * use)]),
    ...foods.map((g) => [g, Math.ceil((residents * 0.25) / foods.length) + 1]),
  ]);
  for (const [x, y] of [[11, 11], [11, 12], [11, 13], [12, 13], [13, 13], [14, 13], [14, 12], [14, 11], [10, 11], [10, 12], [10, 13], [11, 14], [12, 14], [13, 14], [14, 14], [15, 11], [15, 12], [15, 13]]) {
    if (houseDesirability(w, home) >= TIERS[MAX_TIER].desirability.rise) break;
    if (!buildingAt(w, x, y)) addRaw(w, 'statue', x, y);
  }
  staffAll(w);
  return { w, home, bazaar };
}

describe('s47 upper tiers: the data', () => {
  it('asks a Villa and an Estate for three kinds of food, and uses 1.5x and 2x the household goods there (the rounding never adds one)', () => {
    expect([8, 9].map((t) => TIERS[t].needs.includes('threeFoods'))).toEqual([true, true]);
    expect([5, 6, 7].map((t) => TIERS[t].needs.includes('threeFoods'))).toEqual([false, false, false]);
    expect([1, 7, 8, 9].map(useOf)).toEqual([1, 1, 1.5, 2]);
    const villa = { tier: 8, residents: 150 }, estate = { tier: 9, residents: 180 }, fine = { tier: 7, residents: 125 };
    expect(['pottery', 'beer', 'linen'].map((g) => monthlyNeed(villa, g))).toEqual([12, 12, 9]);          // 11.25, 11.25, 9 (not 9.000…01)
    expect(HOUSEHOLD_GOODS.map((g) => monthlyNeed(estate, g))).toEqual([18, 18, 15, 11]);                // 18, 18, 14.4, 10.8
    expect(['pottery', 'beer'].map((g) => monthlyNeed(fine, g))).toEqual([7, 7]);                         // a Fine manor as before
    expect(monthlyNeed(estate, 'grain')).toBe(45);                                                         // food is as before
    expect(monthlyNeed(fine, 'pottery', 8)).toBe(Math.ceil(125 * 0.05 * 1.5));                             // at a Villa's use
  });
});

describe('s47 upper tiers: in the sim', () => {
  it('keeps an Estate fed three foods; with two it drops a tier after two months, then another, never at once (an old save takes the same path)', () => {
    const run = (foods) => {
      const { w, home } = street({ foods });
      expect(houseDesirability(w, home)).toBeGreaterThanOrEqual(TIERS[MAX_TIER].desirability.keep);
      const tiers = [];
      for (let m = 0; m < 6; m++) { monthlyHousing(w); tiers.push(w.buildings[home.id].tier); }
      return tiers;
    };
    // Three foods: the old stock (a month at the plain use) misses the first check, the home stocks up at twice the use, and keeps its tier.
    expect(run(['grain', 'figs', 'fish'])).toEqual([9, 9, 9, 9, 9, 9]);
    // Two: the usual hysteresis, a tier every DOWNGRADE_AFTER_MONTHS months, down to the Fine manor, which two foods keep.
    expect(DOWNGRADE_AFTER_MONTHS).toBe(2);
    expect(run(['grain', 'figs'])).toEqual([9, 8, 8, 7, 7, 7]);
  });

  it('stocks a Fine manor for the Villa it grows into: three foods and the Villa\'s use of each good', () => {
    const { w, home } = street({ tier: 7, residents: 120, stock: 'new' });
    monthlyHousing(w);
    const h = w.buildings[home.id];
    for (const g of ['pottery', 'beer', 'linen']) expect([g, h.stock[g]]).toEqual([g, monthlyNeed(h, g, 8)]);
    expect(['grain', 'figs', 'fish'].every((g) => h.stock[g] > 0)).toBe(true);
    expect(houseStatus(w, h).checklist.find((c) => c.need === 'threeFoods')).toEqual({ need: 'threeFoods', met: true });
    h.stock.fish = 0;
    expect(houseStatus(w, h).checklist.find((c) => c.need === 'threeFoods').met).toBe(false);
    h.stock.pottery = monthlyNeed(h, 'pottery');                                 // enough for a Fine manor, not for a Villa
    expect(houseStatus(w, h).checklist.find((c) => c.need === 'pottery').met).toBe(false);
    expect(houseStatus(w, h).missingNow.includes('pottery')).toBe(false);       // but the home keeps its own tier
  });
});

describe('s47 upper tiers: the house sheet', () => {
  it('states each tier\'s use from the data: a Fine manor\'s as a Villa, a Villa\'s and an Estate\'s own', () => {
    const ui = createPressureUi({ world: makeTestWorld(), celebrations: { show() {} }, fireTip() {} });
    for (const [tier, residents, as] of [[7, 120, 8], [8, 150, 8], [9, 180, 9]]) {
      const h = { tier, residents, stock: {} };
      expect(useTierOf(h)).toBe(as);
      const [node] = ui.sheetParts.house(h);
      const rows = tierUse(h, as);
      expect(rows).toEqual(HOUSEHOLD_GOODS.filter((g) => TIERS[as].needs.includes(g)).map((good) => ({ good, amount: monthlyNeed(h, good, as) })));
      expect(node.textContent).toContain(P.useLine(as, rows));
      expect(P.useLine(as, rows)).toContain('food of three kinds');
    }
    expect(P.useLine(9, tierUse({ tier: 9, residents: 180 }, 9))).toBe('18 pottery, 18 beer, 15 linen and 11 jewellery (2× the usual), and food of three kinds');
    expect(ui.sheetParts.house({ tier: 6, residents: 90, stock: {} })).toEqual([]);   // below them: the checklist says it
    expect(TIP_HELP_TEXT.upper_tiers).toContain('1.5× and 2×');
  });

  it('lists what keeps the top tier, three kinds of food among them, each with its cause', async () => {
    const { w, home } = street({ foods: ['grain', 'figs'] });
    w.buildings[home.id].stock.fish = 0;
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), home.id));
      expect(r.root.querySelector('#sheet .keep-head').textContent).toBe(P.keepHead(TIERS[9].name));
      const row = r.root.querySelector('#sheet .keep-list li[data-need="threeFoods"]');
      expect([row.classList.contains('missing'), row.querySelector('.name').textContent]).toEqual([true, NEED_NAMES.threeFoods]);
      expect(row.querySelector('.cause').textContent).toBe(causeText(needCause(w, home, 'threeFoods'), w, 'threeFoods').cause);
      expect(Boolean(r.root.querySelector('#sheet .tier-use'))).toBe(true);
    } finally { r.cleanup(); }
  });

  it('points a good held only in a far store to that store, naming Fetch; a store in reach, or none linked by road, does not', async () => {
    const w = makeTestWorld({ size: 64 });
    setRoad(w, 0, 10, 63, 10);
    const home = addRaw(w, 'house', 12, 11, { tier: 5, residents: 20, stockedFor: 20, stock: { grain: 6 } });
    const bazaar = addRaw(w, 'bazaar', 9, 8);
    const near = addRaw(w, 'storehouse', 4, 8);                               // in the bazaar's supply reach, empty
    const far = addRaw(w, 'storehouse', 50, 8, { store: { pottery: 40 } }); // 40-odd road tiles away
    staffAll(w);
    const cause = needCause(w, home, 'pottery');
    expect([cause.code, cause.id, cause.good, cause.bazaar, cause.len > BUILDINGS.bazaar.supplyReach]).toEqual(['good_far', far.id, 'pottery', bazaar.id, true]);
    const words = causeText(cause, w, 'pottery');
    expect(words).toEqual({ cause: `Pottery is held only in a storehouse ${cause.len} road tiles from the bazaar`, fix: 'The storehouse near the bazaar can keep it stocked by cart' });   // Version 8.3: Keep stocked
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), home.id));
      const btn = r.root.querySelector('#sheet .checklist li[data-need="pottery"] .show-me');
      expect(btn.getAttribute('aria-label')).toBe(P.showFar(cause, w));
      fire(btn, 'click');
      expect(r.store.get().selectedId).toBe(near.id);   // Version 5.0: the store near the bazaar that should set the Fetch order (src/sim/advice.js fetchStoreFor)
    } finally { r.cleanup(); }
    near.store.pottery = 5;                                                    // in reach now: it comes with the next delivery
    expect(needCause(w, home, 'pottery').code).toBe('next_delivery');
    near.store.pottery = 0;
    w.road[10 * 64 + 30] = 0;                                                  // the road cut: no store with pottery is linked by road
    w.roadVersion += 1;
    expect(needCause(w, home, 'pottery').code).toBe('good_unmade');
  });
});
