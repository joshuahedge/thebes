// Version 7.1, fix batch B (rulings 1067-1073): the Trade sheet says what the caravan will do. Each line is set up both ways against the sim: a Buy at 0 buys nothing, a good no
// open route takes sells nothing, the held-back line shows only where trade holds goods back (when it sells), and Keep at least steps 50 from 100 up.
import { describe, it, expect } from '../../harness.js';
import { addRaw } from '../../helpers/testWorld.js';
import { fire } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { tradeCity } from './helpers.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { DIFFICULTIES } from '../../../src/data/difficulty.js';
import { FLOOR_STEP } from '../../../src/data/trade.js';
import { openSheet } from '../../../src/ui/modes.js';
import { tradeMonth, setTradeSwitch } from '../../../src/sim/trade.js';
import { heldBack } from '../../../src/sim/tradeRules.js';
import { placesFor } from '../../../src/ui/tradeSheet.js';
import { V70_TRADE_TEXT as W } from '../../../src/ui/text.js';

const city = tradeCity;
const caravan = (w, day) => { w.day = day; const events = []; tradeMonth(w, events); return events.find((e) => e.type === 'caravan'); };
const row = (r, g) => r.root.querySelector(`#sheet .trade-good[data-good="${g}"]`);
const help = (r, g) => row(r, g).querySelector('.keep-help');
const tap = (b) => { const box = b.getBoundingClientRect(); return [box.width >= 44, box.height >= 44]; };

describe('v71 fb trade: the Keep at least line says what the caravan will do', () => {
  it('says a Buy at 0 buys nothing yet, in amber, and a caravan buys nothing; at 10 the normal line returns and it buys', async () => {
    const { w } = city();
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      fire(row(r, 'figs').querySelector('.mode.buy'), 'click');
      expect(w.trade.orders.figs).toEqual({ mode: 'buy', keep: 0 });
      expect([help(r, 'figs').textContent, help(r, 'figs').classList.contains('amber')]).toEqual([W.buyNothing, true]);
      expect(W.buyNothing).toBe('Buys nothing yet: raise Keep at least');
      const first = caravan(w, 90);
      expect([first.bought, first.spent]).toEqual([{}, 0]);                         // the line is what the sim does
      fire(row(r, 'figs').querySelector('.keep-more'), 'click');
      expect([w.trade.orders.figs.keep, help(r, 'figs').textContent, help(r, 'figs').classList.contains('amber')]).toEqual([FLOOR_STEP, 'Buys until 10 are near the trading post', false]);
      const second = caravan(w, 180);
      expect(second.bought.figs).toBe(FLOOR_STEP);
    } finally { r.cleanup(); }
  });

  it('says no open route takes a good whose switches are all Off, and a caravan sells none; switched On the old line returns', async () => {
    const { w } = city({ stock: { pottery: 100 } });
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      fire(row(r, 'pottery').querySelector('.mode.sell'), 'click');
      const sw = () => r.root.querySelector('#sheet .route[data-partner="memphis"] .trade-switch[data-side="buys"][data-good="pottery"]');
      expect(help(r, 'pottery').textContent).toBe('Sells only what is over 0 near the trading post');
      fire(sw(), 'click');                                                           // Memphis's only pottery switch: Off
      expect([sw().getAttribute('aria-checked'), help(r, 'pottery').textContent, help(r, 'pottery').classList.contains('amber')]).toEqual(['false', W.noOpenRoute, true]);
      expect(W.noOpenRoute).toBe('No open route takes it: its switches are Off');
      expect(caravan(w, 90).sold).toEqual({});
      fire(sw(), 'click');
      expect([help(r, 'pottery').textContent, help(r, 'pottery').classList.contains('amber')]).toEqual(['Sells only what is over 0 near the trading post', false]);
      expect(caravan(w, 180).sold.pottery).toBe(50);                                  // a quarter of the yearly quota of 200
    } finally { r.cleanup(); }
  });

  it('counts only the places whose switch is On: with Memphis Off and Nubia On the level is near the Quay alone', () => {
    const { w } = city({ routes: ['memphis', 'nubia'] });
    expect(placesFor(w, 'grain', 'buys')).toEqual(['post', 'quay']);
    setTradeSwitch(w, 'memphis', 'buys', 'grain', false);
    expect(placesFor(w, 'grain', 'buys')).toEqual(['quay']);
    setTradeSwitch(w, 'nubia', 'buys', 'grain', false);
    expect(placesFor(w, 'grain', 'buys')).toEqual([]);
    expect(placesFor(w, 'figs', 'sells')).toEqual(['post']);                          // another good's switches are untouched
  });
});

describe('v71 fb trade: the held-back line shows only where trade holds goods back', () => {
  it('is there in Sell and gone in Buy and Ignore, with the temple owed beer', async () => {
    const { w } = city({ stock: { beer: 500 }, routes: ['memphis', 'byblos'] })   // Memphis buys beer and Byblos sells it: all three choices;
    const gw = addRaw(w, GREAT_WORK.type, 2, 14);
    w.reign.greatWork = gw.id;
    w.reign.offered = 3;
    gw.site.course = 6;                                                               // the fourth stage (two courses a stage), whose offering is the beer
    expect(heldBack(w, 'beer').temple).toBeGreaterThan(0);
    const owed = Math.max(1, Math.round(GREAT_WORK.offerings[3].n * DIFFICULTIES.normal.cost));
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      const held = () => (row(r, 'beer').querySelector('.held') || { textContent: null }).textContent;
      const seen = {};
      for (const mode of ['sell', 'buy', 'ignore']) { fire(row(r, 'beer').querySelector(`.mode.${mode}`), 'click'); seen[mode] = held(); }
      expect(seen).toEqual({ sell: `${owed} held for the temple`, buy: null, ignore: null });
      fire(row(r, 'beer').querySelector('.mode.sell'), 'click');
      expect(held()).toBe(`${owed} held for the temple`);                            // back to Sell: it is back
    } finally { r.cleanup(); }
  });
});

describe('v71 fb trade: Keep at least steps 50 from 100 up', () => {
  it('steps 10 below 100 and 50 from 100, up and down, and the labels and 44 px targets follow', async () => {
    const { w } = city({ stock: { pottery: 40 } });
    const r = await rigUI({ world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'trade'));
      fire(row(r, 'pottery').querySelector('.mode.sell'), 'click');
      const more = () => row(r, 'pottery').querySelector('.keep-more'), less = () => row(r, 'pottery').querySelector('.keep-less');
      const level = () => w.trade.floors.pottery || 0;
      for (const n of [40, 100, 200]) { fire(row(r, 'pottery').querySelector('.mode.sell'), 'click'); w.trade.floors.pottery = n; w.trade.orders.pottery.keep = n; r.ui.refresh();
        const step = n >= 100 ? 50 : 10;
        expect([n, more().textContent, more().getAttribute('aria-label')]).toEqual([n, `+${step}`, `+${step}: keep at least more pottery`]);
        expect(tap(more()).concat(tap(less()))).toEqual([true, true, true, true]);
        fire(more(), 'click');
        expect([n, level()]).toEqual([n, n + step]);
      }
      expect(level()).toBe(250);                                                      // 200 + 50: one tap, not five
      fire(less(), 'click');
      expect([level(), less().textContent]).toEqual([200, '−50']);
      for (let i = 0; i < 2; i++) fire(less(), 'click');
      expect([level(), less().textContent, less().getAttribute('aria-label')]).toEqual([100, '−10', '−10: keep at least less pottery']);   // down from 100 is 10, so 100 -> 150 -> 100 -> 90
      fire(less(), 'click');
      expect(level()).toBe(90);
    } finally { r.cleanup(); }
  });
});
