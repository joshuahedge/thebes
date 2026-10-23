// Version 7.0, Track T (rulings 870-899): the Trade sheet, the Quay's sheet and the summary's Trade row. A phone opens one route at a time
// (an accordion), a wide screen shows every route; each new control is a 44 x 44 button with an accessible name and a keyboard path; the
// words come from the sim (switches, Keep at least, held for the temple and the court, last year's profit), each set up both ways.
import { describe, it, expect } from '../../harness.js';
import { setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { fire, key } from '../../helpers/dom.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { QUAY_TYPE, FLOOR_STEP } from '../../../src/data/trade.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { DIFFICULTIES } from '../../../src/data/difficulty.js';
import { select, openSheet } from '../../../src/ui/modes.js';
import { tradePrices, sellAbove, monthsToNextArrival, keepAtLeast } from '../../../src/sim/trade.js';
import { tradeAllowed, heldBack } from '../../../src/sim/tradeRules.js';
import { caravanText, plural, T, V70_TRADE_TEXT as W, FIRST_TEXT, V70_HELP } from '../../../src/ui/text.js';
import { T as TERRAIN } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

// uiWorld at Capital with the river along the top three rows, a Quay at (20, 3) on it with a road beside it (y = 4) down to the main road
// (x = 18), a storehouse in reach of both, and a trading post joined to the trade entry. Memphis and Nubia open unless asked otherwise.
function tradeCity({ routes = ['memphis', 'nubia'], quay = true } = {}) {
  const w = uiWorld();
  w.milestone = 'capital';
  w.gold = 5000;
  for (let y = 0; y < 3; y++) for (let x = 0; x < w.size; x++) w.terrain[idx(w.size, x, y)] = TERRAIN.WATER;
  setRoad(w, 18, 4, 24, 4);
  setRoad(w, 18, 4, 18, 10);
  setRoad(w, 31, 10, w.tradeEntry.x, w.tradeEntry.y);
  const store = addRaw(w, 'storehouse', 19, 8, { store: { linen: 300, pottery: 40 } });
  const post = addRaw(w, 'trading_post', 16, 11);
  const q = quay ? addRaw(w, QUAY_TYPE, 20, 3) : null;
  staffAll(w);
  for (const id of routes) w.trade.routes[id] = { since: 0, gifted: true };
  return { w, store, post, q };
}
const sheet = (r) => r.root.querySelector('#sheet');
const card = (r, id) => sheet(r).querySelector(`.route[data-partner="${id}"]`);
const head = (r, id) => card(r, id).querySelector('.route-head');
const row = (r, g) => sheet(r).querySelector(`.trade-good[data-good="${g}"]`);
const tap = (b) => { const box = b.getBoundingClientRect(); return [box.width >= 44, box.height >= 44]; };
const named = (b) => (b.getAttribute('aria-label') || b.textContent).trim().length > 0;

describe('v70 t trade sheet on a phone', () => {
  it('opens one route at a time: each head a 44 px button that says when and what it earned, Enter or a tap opens it, Esc closes the sheet', async () => {
    const { w } = tradeCity();
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      const open = () => [...sheet(r).querySelectorAll('.route.open')].filter((li) => li.querySelector('.route-body')).map((li) => li.dataset.partner);
      expect(open()).toEqual(['memphis']);                                              // the first open route, the rest shut
      for (const id of ['memphis', 'nubia']) {
        const h = head(r, id);
        expect([h.tagName, h.getAttribute('aria-expanded'), named(h), ...tap(h)]).toEqual(['BUTTON', String(id === 'memphis'), true, true, true]);
        expect(h.querySelector('.summary').textContent).toBe(`Next ${id === 'nubia' ? 'boat' : 'caravan'} in ${plural(monthsToNextArrival(w), 'month', 'months')} · Last year: no visit`);
      }
      head(r, 'nubia').focus();
      fire(head(r, 'nubia'), 'click');                                                  // a button: Enter and Space click it
      expect(open()).toEqual(['nubia']);
      expect([head(r, 'nubia').getAttribute('aria-expanded'), head(r, 'memphis').getAttribute('aria-expanded')]).toEqual(['true', 'false']);
      expect(document.activeElement).toBe(head(r, 'nubia'));                             // focus stays on the head it was on
      expect(card(r, 'nubia').querySelector('.route-body').id).toBe(head(r, 'nubia').getAttribute('aria-controls'));
      fire(head(r, 'nubia'), 'click');
      expect(open()).toEqual([]);                                                       // tapped again, it shuts
      key(r.root, 'Escape');
      expect(r.store.get().sheet).toBe(null);
    } finally { r.cleanup(); }
  });

  it("gives each good on a route a 44 px switch that says its state in a word and its name, and the sim's rule follows it", async () => {
    const { w } = tradeCity({ routes: ['nubia'] });
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      const sw = () => card(r, 'nubia').querySelector('.trade-switch[data-side="buys"][data-good="grain"]');
      const p = tradePrices(w, 'nubia');
      expect([sw().getAttribute('role'), sw().getAttribute('aria-checked'), sw().querySelector('.state').textContent, sw().getAttribute('aria-label'), ...tap(sw())])
        .toEqual(['switch', 'true', 'On', 'Sell grain to Nubia: on', true, true]);
      expect(sw().querySelector('.price').textContent).toBe(`pays ${p.buys.grain} each`);
      const sells = [...card(r, 'nubia').querySelectorAll('.trade-switch[data-side="sells"]')].map((b) => [b.dataset.good, b.getAttribute('aria-label')]);
      expect(sells).toEqual([['stone', 'Buy stone from Nubia: on'], ['gems', 'Buy gems from Nubia: on']]);
      fire(sw(), 'click');
      expect([tradeAllowed(w, 'nubia', 'grain', 'buys'), w.trade.switches]).toEqual([false, { nubia: { buys: { grain: false } } }]);
      expect([sw().getAttribute('aria-checked'), sw().querySelector('.state').textContent, sw().getAttribute('aria-label')]).toEqual(['false', 'Off', 'Sell grain to Nubia: off']);
      fire(sw(), 'click');
      expect([tradeAllowed(w, 'nubia', 'grain', 'buys'), w.trade.switches]).toEqual([true, {}]);
    } finally { r.cleanup(); }
  });

  it('sets Keep at least with 44 px steppers named for the good, one level the caravan and the boat both obey', async () => {
    const { w } = tradeCity();
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      fire(row(r, 'linen').querySelector('.mode.sell'), 'click');
      const more = () => row(r, 'linen').querySelector('.keep-more'), less = () => row(r, 'linen').querySelector('.keep-less');
      expect([more().getAttribute('aria-label'), less().getAttribute('aria-label'), ...tap(more()), ...tap(less()), less().disabled])
        .toEqual([`+${FLOOR_STEP}: keep at least more linen`, `−${FLOOR_STEP}: keep at least less linen`, true, true, true, true, true]);
      more().focus();
      for (let i = 0; i < 3; i++) fire(more(), 'click');
      expect([w.trade.floors.linen, w.trade.orders.linen, keepAtLeast(w, 'linen'), sellAbove(w, 'linen')]).toEqual([30, { mode: 'sell', keep: 30 }, 30, 30]);
      expect(document.activeElement).toBe(more());
      expect([row(r, 'linen').querySelector('.keep-value').textContent, row(r, 'linen').querySelector('.keep-help').textContent]).toEqual(['Keep at least 30', 'Sells only what is over 30 in storage']);
      expect(row(r, 'linen').querySelector('.stock').textContent).toBe('300 near the trading post · 300 near the Quay');
      fire(row(r, 'linen').querySelector('.mode.ignore'), 'click');
      expect([w.trade.orders.linen, row(r, 'linen').querySelector('.keep')]).toEqual([{ mode: 'ignore', keep: 30 }, null]);
    } finally { r.cleanup(); }
  });
});

describe('v70 t trade sheet: held back, the ledger, a missing Quay', () => {
  it('labels what is held for the temple and the court, and sells only above it; nothing once the offering is made', async () => {
    const run = async (offered, accepted) => {
      const { w } = tradeCity();
      const gw = addRaw(w, GREAT_WORK.type, 2, 14);
      w.reign.greatWork = gw.id;
      w.reign.offered = offered;
      w.demands.open.push({ id: 1, kind: 'goods', good: 'linen', type: null, amount: 60, reward: 100, day: 0, accepted, offerDue: 90, due: 300, months: 10, met: 5, failed: 5, declined: 3, had: null });
      w.trade.orders.grain = { mode: 'sell', keep: 0 };
      w.trade.orders.linen = { mode: 'sell', keep: 0 };
      const r = await rigUI({ world: w });
      try {
        r.store.set(openSheet(r.store.get(), 'trade'));
        const held = (g) => (row(r, g).querySelector('.held') || { textContent: null }).textContent;
        return [held('grain'), held('linen'), row(r, 'grain').querySelector('.keep-help').textContent, heldBack(w, 'grain').temple];
      } finally { r.cleanup(); }
    };
    const owed = Math.max(1, Math.round(GREAT_WORK.offerings[0].n * DIFFICULTIES.normal.cost));
    expect(await run(0, true)).toEqual([`${owed} held for the temple`, '60 held for the court', `Sells only what is over ${owed} in storage`, owed]);
    expect(await run(1, false)).toEqual([null, null, 'Sells only what is over 0 in storage', 0]);
  });

  it("says last year's profit per route from the sim's ledger, and none before a visit", async () => {
    const { w } = tradeCity({ routes: ['nubia'] });
    w.trade.ledger = { year: w.trade.year, now: {}, last: { nubia: { income: 340, spent: 120 } } };
    const r = await rigUI({ world: w, width: 1280, height: 800 });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      expect(head(r, 'nubia').querySelector('.summary').textContent.endsWith('Last year +220 gold')).toBe(true);
      expect(card(r, 'nubia').querySelector('.ledger').textContent).toBe('Last year it paid you 340 gold and you paid it 120 gold');
      w.trade.ledger.last = {};
      r.ui.refresh();
      expect(card(r, 'nubia').querySelector('.ledger').textContent).toBe('No visit last year yet');
    } finally { r.cleanup(); }
  });

  it('refuses a river route without a Quay, says why, and Show me starts the Quay by the river', async () => {
    const { w } = tradeCity({ routes: [], quay: false });
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      const nubia = card(r, 'nubia');
      expect([nubia.querySelector('.open-route').disabled, nubia.querySelector('.reason').textContent]).toEqual([true, 'Needs a Quay on the river']);
      const show = nubia.querySelector('.show-me');
      expect([show.getAttribute('aria-label'), ...tap(show)]).toEqual([`${T.showMe}: ${W.buildQuay}`, true, true]);
      fire(show, 'click');
      expect([r.store.get().tool, r.store.get().sheet]).toEqual([{ kind: 'building', type: QUAY_TYPE }, null]);
      addRaw(w, QUAY_TYPE, 20, 3);
      r.store.set(openSheet(r.store.get(), 'trade'));
      expect([card(r, 'nubia').querySelector('.open-route').disabled, card(r, 'nubia').querySelector('.reason')]).toEqual([false, null]);
      expect(card(r, 'punt').querySelector('.reason').textContent).toBe('Opens at Great Capital');
    } finally { r.cleanup(); }
  });

  it('says why no boat will come in the route card while the Quay is paused', async () => {
    const { w, q } = tradeCity({ routes: ['nubia'] });
    q.paused = true;
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      expect(head(r, 'nubia').querySelector('.summary').textContent.startsWith('No boat will come while the Quay is paused')).toBe(true);
    } finally { r.cleanup(); }
  });
});

describe('v70 t trade sheet on a wide screen, the Quay and the summary', () => {
  it('shows every open route in the side panel, each with its switches, and no accordion', async () => {
    const { w } = tradeCity();
    const r = await rigUI({ world: w, width: 1280, height: 800 });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      expect(r.store.get().layout).toBe('wide');
      for (const id of ['memphis', 'nubia']) expect([id, head(r, id).tagName, Boolean(card(r, id).querySelector('.route-body .trade-switch'))]).toEqual([id, 'DIV', true]);
      const buttons = [...sheet(r).querySelectorAll('.trade-switch, .keep-more, .keep-less, .mode, .open-route')];
      expect(buttons.every((b) => named(b) && b.tagName === 'BUTTON' && b.tabIndex === 0)).toBe(true);        // every control on the Tab path
    } finally { r.cleanup(); }
  });

  it("opens the Trade sheet from the Quay's sheet and the summary's Trade row, and says who lands at the Quay", async () => {
    const { w, q } = tradeCity({ routes: ['nubia'] });
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), q.id));
      expect(sheet(r).querySelector('h2').textContent).toBe(BUILDINGS.quay.name);
      expect(sheet(r).querySelector('.quay-line').textContent).toBe(`Boats from Nubia land here. Next boat in ${plural(monthsToNextArrival(w), 'month', 'months')}.`);
      const trade = sheet(r).querySelector('.trade');
      expect([trade.textContent, ...tap(trade)]).toEqual([T.trade, true, true]);
      fire(trade, 'click');
      expect(r.store.get().sheet).toEqual({ kind: 'trade', id: q.id });
      key(r.root, 'Escape');
      expect(r.store.get().sheet).toEqual({ kind: 'info', id: q.id });                 // Back returns to the Quay
      r.store.set(openSheet(r.store.get(), 'summary'));
      const open = sheet(r).querySelector('.open-trade');
      expect([open.closest('.trade-row').textContent.startsWith('1 route open'), open.getAttribute('aria-label'), ...tap(open)]).toEqual([true, 'Trade routes: 1 route open', true, true]);
      fire(open, 'click');
      expect(r.store.get().sheet.kind).toBe('trade');
    } finally { r.cleanup(); }
  });

  it('calls a river arrival a boat, and has the first Quay and How to play words', () => {
    expect(caravanText({ partner: 'nubia', sold: { grain: 75 }, bought: {}, income: 75 }).text).toBe('A boat from Nubia bought 75 grain: +75 gold');
    expect(caravanText({ partner: 'memphis', sold: { grain: 75 }, bought: {}, income: 75 }).text).toBe('A caravan from Memphis bought 75 grain: +75 gold');
    expect(FIRST_TEXT.first_quay.head).toBe('First Quay');
    expect(V70_HELP.t.map((h) => h.head)).toEqual(['Trade by river', 'The Trade sheet']);
  });
});
