// Stage 4.7 final review fixes (rulings 478-481): the raid band spots, the tribute's words and Show me, a failed Send, the Fetch refusal on an order, the
// words read from the data, the keep list, the spots legend on a day tick and a leftover zero key in a store.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';
import { courtWorld, YEAR, MONTH } from '../../stage46/court/courtHelpers.js';
import { SLOTS, bandSlot } from '../../../src/sim/raids.js';
import { pressureMonth, quotaOf, quotaStatus, QUOTA_POOL } from '../../../src/sim/pressure.js';
import { cartDay, setFetch } from '../../../src/sim/carts.js';
import { setAccept } from '../../../src/sim/commands.js';
import { QUOTA } from '../../../src/data/s47.js';
import { TIERS } from '../../../src/data/housing.js';
import { HOUSEHOLD_GOODS } from '../../../src/data/goods.js';
import { allBuildings } from '../../../src/sim/world.js';
import { select } from '../../../src/ui/modes.js';
import { quotaNodes, createPressureUi } from '../../../src/ui/s47/pressure.js';
import { createCourtUi } from '../../../src/ui/s46/court.js';
import { unmadeFix } from '../../../src/ui/sheets.js';
import { spotsLegend } from '../../../src/ui/s47/spots.js';
import { S47_PRESSURE_TEXT as P, S47_CARTS_TEXT as W, FIRST_TEXT, TIP_TEXT, buildingName, goodName, NEED_NAMES } from '../../../src/ui/text.js';

const click = (node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
const store = (w, type) => allBuildings(w).find((b) => b.type === type);
function quotaCity() {
  const w = courtWorld({ open: true });
  w.day = (QUOTA.fromYear - 1) * YEAR;
  w.tally.made = { pottery: 800, grain: 4000 };
  w.court.yearMade = { day: w.day - YEAR, made: {}, kept: Object.fromEntries(QUOTA_POOL.map((g) => [g, 1e6])) };
  w.court.letters = []; w.court.request = null; w.court.nextRequestDay = w.day + 10 * YEAR; w.court.nextCardDay = w.day + 10 * YEAR;
  pressureMonth(w);
  w.day += 2 * MONTH;
  return w;
}
const drain = (w) => { for (const b of allBuildings(w)) for (const g of QUOTA_POOL) if (b.store && b.store[g]) b.store[g] = 0; };
const showMeOf = (nodes) => nodes.map((n) => n.querySelector && n.querySelector('.quota-actions .show-me')).find(Boolean);

describe('s47 final: raid band spots', () => {
  it('stands a band of up to 19 where Stage 4.5 drew it, whatever the raiders\' ids, and a bigger band on every spot', () => {
    for (const size of [1, 7, 18, 19]) {
      for (const first of [0, 5, 40, 1234]) {
        for (let n = 0; n < size; n++) expect(bandSlot(first + n, size)).toBe(SLOTS[(first + n) % 19]);
      }
    }
    const ids = Array.from({ length: SLOTS.length }, (_, n) => 700 + n);
    expect(new Set(ids.map((id) => bandSlot(id, SLOTS.length))).size).toBe(SLOTS.length);   // a big band: no two share a spot
    expect(bandSlot(21, 25)).toBe(SLOTS[21]);
  });
});

describe('s47 final: the tribute row and Send', () => {
  it('with nothing to ship, Show me goes to where the first owed good is made, as a house\'s unmade good does; with stock to show it shows the store', () => {
    const w = quotaCity();
    drain(w);
    const st = quotaStatus(w);
    expect(st.shipNow).toBe(0);
    const calls = [];
    const act = { send() {}, select: (id) => calls.push(['select', id]), showMeAt: (t) => calls.push(['showMeAt', t]) };
    const btn = showMeOf(quotaNodes(w, act));
    const owed = st.goods.find((g) => g.left > 0);
    const fix = unmadeFix({ good: owed.good }, w);
    expect(btn === undefined).toBe(false);
    expect(btn.textContent).toBe(P.showMe);
    expect(btn.getAttribute('aria-label')).toBe(P.showMaker(owed.good, fix.item));
    expect(btn.getAttribute('aria-label')).toContain(goodName(owed.good).toLowerCase());
    click(btn);
    expect([calls.length, calls[0][0], calls[0][1].item, calls[0][1].category]).toEqual([1, 'showMeAt', fix.item, fix.category]);
    store(w, 'storehouse').store.pottery = 50;                                  // something to ship: Show me is the store's, not the maker's
    click(showMeOf(quotaNodes(w, act)));
    expect(calls[1][0]).toBe('select');
  });

  it('a Send that finds the stores empty says so in a caption instead of nothing', () => {
    const w = quotaCity();
    store(w, 'storehouse').store.pottery = 30;
    const shown = [];
    let refreshed = 0;
    const ui = createCourtUi({ world: w, celebrations: { show: (c) => shown.push(c.text) }, store: { get: () => ({}), set() {} }, refresh: () => { refreshed++; }, selectBuilding() {}, showMeAt() {} });
    const body = document.createElement('div');
    ui.sheets.court(body, { close() {} });
    const send = body.querySelector('.quota-send button');
    expect(send.disabled).toBe(false);
    drain(w);                                                                   // the stores empty between the sheet's drawing and the tap
    click(send);
    expect(shown).toEqual([P.empty]);
    expect(refreshed).toBe(1);
    expect(quotaOf(w).goods.every((g) => g.sent === 0)).toBe(true);
    ui.destroy();
  });
});

describe('s47 final: the Fetch refusal on an existing order', () => {
  it('shows why a step on an order the sim refuses, instead of hiding the reason while the order is on', async () => {
    const w = makeTestWorld({ size: 64, fertile: [], gold: 1000 });
    setRoad(w, 0, 10, 63, 10);
    const home = addRaw(w, 'storehouse', 2, 11, { staff: 6, store: {} });
    addRaw(w, 'storehouse', 30, 11, { staff: 6, store: { pottery: 80 } });
    expect(setFetch(w, home.id, 'pottery', 20).ok).toBe(true);
    setAccept(w, home.id, 'pottery', false);                                    // the store is told to refuse pottery after the order was made
    const r = await rigUI({ world: w, width: 390, height: 844 });
    try {
      r.store.set(select(r.store.get(), home.id));
      click(r.root.querySelector('#sheet .fetch-head'));
      const row = r.root.querySelector('#sheet .fetch-good[data-good="pottery"]');
      click(row.querySelector('.step.more'));
      const line = r.root.querySelector('#sheet .fetch-good[data-good="pottery"] .fetch-refusal');
      expect(line === null).toBe(false);
      expect(line.textContent).toBe(W.refusal({ ok: false, reason: 'refuses', good: 'pottery' }));
      expect(home.orders.pottery.fetch).toBe(20);                              // the order itself stands as it was
    } finally { r.cleanup(); }
  });
});

describe('s47 final: a store keeps no zero key', () => {
  it('a cart that takes the last of a good out of a source leaves no 0 in its store', () => {
    const w = makeTestWorld({ size: 64, fertile: [], gold: 1000 });
    setRoad(w, 0, 10, 63, 10);
    const home = addRaw(w, 'storehouse', 2, 11, { staff: 6, store: {} });
    const far = addRaw(w, 'storehouse', 30, 11, { staff: 6, store: { pottery: 15, linen: 40 } });
    expect(setFetch(w, home.id, 'pottery', 40).ok).toBe(true);
    cartDay(w);
    expect(w.carts.length).toBe(1);
    expect('pottery' in far.store).toBe(false);
    expect(far.store.linen).toBe(40);
  });
});

describe('s47 final: words read from the data', () => {
  it('the upper-tier tip names its tiers, its food and its goods from the housing data, and says only what the data holds', () => {
    const upper = TIERS.filter((t) => t && t.needs.includes('threeFoods'));
    expect(upper.map((t) => t.name)).toEqual(['Villa', 'Estate']);
    const text = TIP_TEXT.upper_tiers;
    for (const t of upper) expect(text.toLowerCase()).toContain(t.name.toLowerCase());
    expect(text).toContain(NEED_NAMES.threeFoods.toLowerCase());
    const used = HOUSEHOLD_GOODS.filter((g) => upper.some((t) => t.needs.includes(g) && (t.use || 1) > 1));
    expect(used.length).toBeGreaterThan(0);
    for (const g of used) expect(text).toContain(goodName(g).toLowerCase());
    for (const g of HOUSEHOLD_GOODS.filter((x) => !used.includes(x))) expect(text).not.toContain(goodName(g).toLowerCase());
    expect(text.startsWith('A villa and an estate need')).toBe(true);
  });

  it('the first good spot names the well and the bazaar by their building names', () => {
    const why = FIRST_TEXT.first_good_spot.why;
    expect(why).toContain(`a ${buildingName('well').toLowerCase()} and a ${buildingName('bazaar').toLowerCase()}`);
  });

  it('the upper-tiers tip fires for the upgrade into a tier that asks three foods or whose next does, from the data, and not for lower ones', () => {
    const fired = [];
    const ui = createPressureUi({ world: makeTestWorld(), celebrations: { show() {} }, fireTip: (k) => fired.push(k) });
    const first = TIERS.findIndex((t) => t && t.needs.includes('threeFoods'));
    for (const to of [first - 2, first - 1, first, first + 1]) ui.onEvents([{ type: 'upgrade', to }]);
    expect(fired).toEqual(['upperTiers', 'upperTiers', 'upperTiers']);        // not the tier two below the first
  });
});

describe('s47 final: the keep list leaves out two foods beside three', () => {
  it('shows Three kinds of food without Two kinds of food on the top tier\'s keep list and on a checklist towards a tier that asks three; a tier that asks two keeps them', async () => {
    const w = makeTestWorld({ size: 64 });
    setRoad(w, 0, 10, 63, 10);
    const top = addRaw(w, 'house', 12, 11, { tier: 9, residents: 180, stockedFor: 180, stock: { grain: 30, figs: 30 } });
    const villa = addRaw(w, 'house', 20, 11, { tier: 8, residents: 150, stockedFor: 150, stock: { grain: 30, figs: 30 } });
    const manor = addRaw(w, 'house', 28, 11, { tier: 6, residents: 100, stockedFor: 100, stock: { grain: 30 } });
    const r = await rigUI({ world: w });
    try {
      const needsOn = (h, list) => { r.store.set(select(r.store.get(), h.id)); return [...r.root.querySelectorAll(`#sheet ${list} li`)].map((li) => li.dataset.need); };
      const a = needsOn(top, '.keep-list');
      expect([a.includes('threeFoods'), a.includes('twoFoods')]).toEqual([true, false]);
      const b = needsOn(villa, '.checklist');
      expect([b.includes('threeFoods'), b.includes('twoFoods')]).toEqual([true, false]);
      const c = needsOn(manor, '.checklist');
      expect([c.includes('twoFoods'), c.includes('threeFoods')]).toEqual([true, false]);
    } finally { r.cleanup(); }
  });
});

describe('s47 final: the spots legend', () => {
  it('draws one icon on the Fair swatch (the map draws one), two on the Good one', () => {
    const icons = (kind) => spotsLegend().querySelector(`.spot-swatch.${kind}`).querySelectorAll('g').length;
    expect([icons('good'), icons('fair')]).toEqual([2, 1]);
  });

  it('follows the day: a well and a bazaar working again change the legend at the next day tick without any command', async () => {
    const w = uiWorld();
    for (const b of Object.values(w.buildings)) if (b.type === 'well' || b.type === 'bazaar') b.paused = true;
    const r = await rigUI({ world: w });
    try {
      r.ui.placement.start({ kind: 'houses' });
      r.frame(0);
      expect(r.root.querySelector('#legend .strip.spots.none') === null).toBe(false);
      for (const b of Object.values(r.world.buildings)) b.paused = false;
      r.world.day += 1;
      r.frame(0);
      expect(r.root.querySelector('#legend .strip.spots.none')).toBe(null);
      expect(r.root.querySelectorAll('#legend .strip.spots .key').length).toBe(2);
    } finally { r.cleanup(); }
  });
});
