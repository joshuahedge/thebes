// Version 9.1 Track R (rulings 1681-1684): Back to gold. Every number on the sheet against the sim's own (monthFigures, setPaused with the labour reassigned, monthlyEconomy run
// forward, setTaxRate, tradeMonth), in cities with and without a palace and a trading post, and every lever against what the sim will honour.
import { describe, it, expect } from '../../harness.js';
import { debtModel, topCosts, taxLever, sellLever, SELL_MIN, TOP_COSTS } from '../../../src/ui/v91/debtSheet.js';
import { monthFigures, monthlyEconomy } from '../../../src/sim/economy.js';
import { setPaused } from '../../../src/sim/commands.js';
import { assignLabour } from '../../../src/sim/labour.js';
import { setTaxRate, palaceOf, taxRateOf } from '../../../src/sim/palace.js';
import { setTradeOrder, tradeMonth } from '../../../src/sim/trade.js';
import { openSheet } from '../../../src/ui/modes.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { V91_R_TEXT as W, alertText, buildingName, goodName, partnerName } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';

// A small city in debt. Plenty of residents means no level of work is short of workers (Pause then takes its whole cost off); few means the workers freed go to other jobs.
function debtCity({ gold = -200, residents = 400, palace = false, post = false, route = false } = {}) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  setRoad(w, 31, 10, 31, 31);
  w.milestone = 'market_town';
  addRaw(w, 'house', 12, 9, { tier: 4, residents });
  addRaw(w, 'farm_grain', 2, 11);
  addRaw(w, 'farm_grain', 4, 11);
  addRaw(w, 'granary', 6, 11);
  addRaw(w, 'bazaar', 9, 11);
  addRaw(w, 'well', 15, 11);
  addRaw(w, 'temple', 24, 11);
  const out = { w };
  if (palace) out.palace = addRaw(w, 'palace', 20, 12);
  if (post) { out.store = addRaw(w, 'storehouse', 16, 8); out.post = addRaw(w, 'trading_post', 20, 8); }
  if (route) { w.trade.routes.memphis = { since: 0, gifted: true }; w.day = 90; }
  assignLabour(w);
  return out;
}

describe('v91 r debt: the sheet\'s figures are the sim\'s', () => {
  it('income, wages, upkeep, soldiers and the month\'s balance are monthFigures\'', () => {
    const { w } = debtCity();
    const f = monthFigures(w), m = debtModel(w);
    expect([m.gold, m.taxes, m.wages, m.upkeep, m.soldiers, m.net, m.costs]).toEqual([w.gold, f.taxes, f.wages, f.upkeep, f.soldiers, f.net, f.wages + f.upkeep + f.soldiers]);
    expect(m.inDebt).toBe(true);
  });
  it('the costliest buildings are the three the sim charges most (upkeep plus wages), the lowest id on a tie, none that Pause would be refused', () => {
    const { w } = debtCity();
    const rows = topCosts(w);
    expect(rows.length).toBe(TOP_COSTS);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].cost >= rows[i].cost).toBe(true);
    const all = Object.values(w.buildings).filter((b) => b.type !== 'house').map((b) => b.id);
    for (const r of rows) {
      expect(all.includes(r.id)).toBe(true);
      expect(r.cost > 0).toBe(true);
    }
    // a paused building costs nothing: it is not listed
    expect(setPaused(w, rows[0].id, true).ok).toBe(true);
    assignLabour(w);
    expect(topCosts(w).some((r) => r.id === rows[0].id)).toBe(false);
  });
  it('Pause takes exactly the row\'s cost off the month while no level of work is short of workers', () => {
    for (let k = 0; k < TOP_COSTS; k++) {
      const { w } = debtCity();
      const row = topCosts(w)[k];
      expect(row.exact).toBe(true);
      const before = monthFigures(w).net;
      for (const id of row.ids) expect(setPaused(w, id, true).ok).toBe(true);   // fix wave (ruling 1739): a row is every building of its kind
      assignLabour(w);
      expect(monthFigures(w).net - before).toBe(row.cost);
    }
  });
  it('with workers short, a row says "up to": the workers freed take other jobs, so the month gains no more than the row\'s cost', () => {
    const { w } = debtCity({ residents: 8 });
    const rows = topCosts(w);
    expect(rows.every((r) => r.exact === false)).toBe(true);
    for (const row of rows) {
      const c = debtCity({ residents: 8 }).w;
      const before = monthFigures(c).net;
      setPaused(c, row.id, true);
      assignLabour(c);
      const saved = monthFigures(c).net - before;
      expect(saved >= 0 && saved <= row.cost).toBe(true);
    }
  });
});

describe('v91 r debt: the months', () => {
  it('months to clear are the whole months of this month\'s balance the treasury needs (monthlyEconomy pays exactly that balance)', () => {
    const { w } = debtCity({ residents: 800 });
    const net = monthFigures(w).net;
    expect(net > 0).toBe(true);
    w.gold = -Math.floor(net * 2.5);
    const m = debtModel(w);
    expect(m.monthsToClear).toBe(3);
    for (let i = 1; i < 3; i++) { monthlyEconomy(w); expect(w.gold < 0).toBe(true); }
    monthlyEconomy(w);
    expect(w.gold >= 0).toBe(true);
  });
  it('a city that loses gold a month never clears: none, with the loss named', () => {
    const { w } = debtCity({ residents: 10 });
    const m = debtModel(w);
    expect(m.net < 0).toBe(true);
    expect(m.monthsToClear).toBe(null);
  });
  it('months to the limit: the most whole months this balance runs before the treasury is past the debt floor, none when it grows', () => {
    const { w } = debtCity({ residents: 10, gold: -100 });
    const m = debtModel(w), net = monthFigures(w).net;
    expect(m.room).toBe(-100 - ECONOMY.debtFloor);
    expect(m.monthsToLimit).toBe(Math.floor(m.room / -net));
    for (let i = 0; i < m.monthsToLimit; i++) monthlyEconomy(w);
    expect(w.gold >= ECONOMY.debtFloor).toBe(true);
    monthlyEconomy(w);
    expect(w.gold < ECONOMY.debtFloor).toBe(true);
    expect(debtModel(w).pastLimit).toBe(true);
    const rich = debtCity({ residents: 800, gold: -100 }).w;
    expect(debtModel(rich).monthsToLimit).toBe(null);
  });
});

describe('v91 r debt: the levers are what the sim will honour', () => {
  it('no palace, no tax lever; with one, a step up from its rate, worth exactly what the sim then takes, and none at High', () => {
    expect(debtModel(debtCity().w).taxLever).toBe(null);
    const { w, palace } = debtCity({ palace: true });
    expect(palaceOf(w)).toBe(palace);
    expect(taxRateOf(w)).toBe('normal');
    const up = taxLever(w);
    expect([up.rate, up.mood, up.palace]).toEqual(['high', -8, palace.id]);
    const before = monthFigures(w).taxes;
    expect(setTaxRate(w, palace.id, up.rate).ok).toBe(true);
    expect(monthFigures(w).taxes - before).toBe(up.gain);
    expect(taxLever(w)).toBe(null);
    setTaxRate(w, palace.id, 'low');
    const step = taxLever(w), low = monthFigures(w).taxes;
    expect([step.rate, step.mood]).toEqual(['normal', -8]);
    setTaxRate(w, palace.id, step.rate);
    expect(monthFigures(w).taxes - low).toBe(step.gain);
  });
  it('the sale lever is the surplus of a good a partner buys, above the homes\' use and what is owed, worth exactly what the next caravan pays; never food, never raw goods', () => {
    const { w, store } = debtCity({ post: true, route: true });
    store.store = { pottery: 200, grain: 900, clay: 99, barley: 99 };
    const lever = sellLever(w);
    expect([lever.good, lever.partner, lever.boat]).toEqual(['pottery', 'memphis', false]);
    expect(lever.keep).toBe(60);               // 400 residents, 0.05 a month, three months, up to the next 10
    expect(lever.n).toBe(50);                  // a quarter of Memphis's yearly quota of 200
    expect(lever.gold).toBe(50 * 8);
    expect(lever.months).toBe(3);
    const gold = w.gold;
    expect(setTradeOrder(w, 'pottery', 'sell', lever.keep).ok).toBe(true);
    tradeMonth(w);
    expect(w.gold - gold).toBe(lever.gold);
    expect(store.store.grain).toBe(900);       // nothing else was sold
    expect(store.store.pottery).toBe(150);
  });
  it('no sale lever without a trading post, without an open route, with the post paused, with only food or raw goods stored, or when the surplus is worth less than the minimum', () => {
    expect(sellLever(debtCity().w)).toBe(null);
    expect(sellLever(debtCity({ post: true }).w)).toBe(null);
    const paused = debtCity({ post: true, route: true });
    paused.store.store = { pottery: 200 };
    expect(sellLever(paused.w).good).toBe('pottery');
    paused.post.paused = true;
    assignLabour(paused.w);
    expect(sellLever(paused.w)).toBe(null);
    const food = debtCity({ post: true, route: true });
    food.store.store = { grain: 900, figs: 900, clay: 500, barley: 500 };
    expect(sellLever(food.w)).toBe(null);
    const small = debtCity({ post: true, route: true });
    small.store.store = { pottery: 60 + 1 };   // one unit over the 60 kept: 8 gold, under the minimum
    expect(SELL_MIN > 8).toBe(true);
    expect(sellLever(small.w)).toBe(null);
  });
});

describe('v91 r debt: the sheet', () => {
  const open = (r) => r.ui.store.set(openSheet(r.ui.store.get(), 'backToGold'));
  const sheetOf = (r) => r.root.querySelector('#sheet');

  it('says the treasury, this month\'s figures, the costliest buildings each with a named Pause, the months and the limit, all from the model', async () => {
    const c = debtCity({ residents: 800, gold: -400 });
    const r = await rigUI({ world: c.w });
    try {
      open(r);
      const m = debtModel(c.w), s = sheetOf(r);
      expect(s.querySelector('.head h2').textContent).toBe(W.debtTitle);
      expect(s.querySelector('.debt-head').textContent).toBe(W.inDebt(-400));
      expect([...s.querySelectorAll('.debt-figures li')].map((li) => li.textContent)).toEqual([W.income(m.taxes), W.wages(m.wages), W.upkeep(m.upkeep)]);
      expect(s.querySelector('.debt-net').textContent).toBe(W.net(m.net));
      const rows = [...s.querySelectorAll('.debt-cost')];
      expect(rows.length).toBe(m.top.length);
      rows.forEach((row, i) => {
        const name = W.kindName(m.top[i].type, m.top[i].count);   // fix wave (ruling 1739): was buildingName(type)
        expect(row.querySelector('strong').textContent).toBe(W.costRow(name, m.top[i].cost));
        expect(row.querySelector('button').getAttribute('aria-label')).toBe(W.pauseLabel(name));
        expect(row.querySelector('button').textContent).toBe(W.pause);
        expect(row.querySelector('p').textContent).toBe(W.pauseSaves(m.top[i].cost));
      });
      expect(s.querySelector('.debt-rate').textContent).toBe(W.climbs(m.monthsToClear));
      expect(s.querySelector('.debt-limit').textContent).toBe(`${W.limitAhead(m.room)}`);
      expect(s.querySelector('.debt-levers')).toBe(null);   // no palace, no post: the sheet says so
      expect(s.textContent).toContain(W.leversNone);
    } finally { r.cleanup(); }
  });
  it('Pause pauses that building through the sim and says so, focus on the note, and the month gains what the row said', async () => {
    const c = debtCity({ residents: 800 });
    const r = await rigUI({ world: c.w });
    try {
      open(r);
      const before = monthFigures(c.w).net, row = debtModel(c.w).top[0];
      sheetOf(r).querySelector('.debt-cost .debt-pause').click();
      expect(row.ids.every((id) => c.w.buildings[id].paused)).toBe(true);   // fix wave (ruling 1739): was the one building
      expect(monthFigures(c.w).net - before).toBe(row.cost);
      const note = sheetOf(r).querySelector('.debt-note');
      expect(note.textContent).toBe(W.pausedNote(W.kindName(row.type, row.count), row.cost));
      expect(document.activeElement).toBe(note);
      expect([...sheetOf(r).querySelectorAll('.debt-cost')].some((el) => el.dataset.id === String(row.id))).toBe(false);
    } finally { r.cleanup(); }
  });
  it('with a palace and a trading post it lists both levers, each with a named Show me that goes where the lever works', async () => {
    const c = debtCity({ palace: true, post: true, route: true });
    c.store.store = { pottery: 200 };
    const r = await rigUI({ world: c.w });
    try {
      open(r);
      const m = debtModel(c.w), s = sheetOf(r);
      const levers = [...s.querySelectorAll('.debt-lever')];
      expect(levers.length).toBe(2);
      expect(levers[0].querySelector('p').textContent).toBe(W.taxLever(m.taxLever.rate, m.taxLever.gain, m.taxLever.mood));
      expect(levers[0].querySelector('button').getAttribute('aria-label')).toBe(W.taxLeverLabel('high'));
      const s1 = m.sellLever;
      expect(levers[1].querySelector('p').textContent).toBe(W.sellLever(goodName(s1.good), partnerName(s1.partner), s1.gold, s1.months, false, s1.keep));
      expect(levers[1].querySelector('button').getAttribute('aria-label')).toBe(W.sellLeverLabel(goodName(s1.good)));
      levers[1].querySelector('button').click();
      expect(r.ui.store.get().sheet).toEqual({ kind: 'trade', id: c.post.id });
      open(r);
      sheetOf(r).querySelectorAll('.debt-lever button')[0].click();
      expect(r.ui.store.get().selectedId).toBe(c.palace.id);
    } finally { r.cleanup(); }
  });
  it('the debt alert\'s View opens the sheet, and its fix line points there', async () => {
    const c = debtCity();
    const r = await rigUI({ world: c.w });
    try {
      r.ui.alerts.refresh();
      expect(alertText({ code: 'debt' }, c.w).fix).toBe(W.debtFix);
      const view = r.root.querySelector('#banner .critical .view');
      expect(view.getAttribute('aria-label')).toContain('treasury is in debt');
      view.click();
      expect(r.ui.store.get().sheet.kind).toBe('backToGold');
    } finally { r.cleanup(); }
  });
  it('out of debt the sheet still opens, and says the treasury is out of debt with no months to wait', async () => {
    const c = debtCity({ gold: 300 });
    const r = await rigUI({ world: c.w });
    try {
      open(r);
      const s = sheetOf(r);
      expect(s.querySelector('.debt-head').textContent).toBe(W.notInDebt(300));
      expect(s.querySelector('.debt-rate')).toBe(null);
    } finally { r.cleanup(); }
  });
});
