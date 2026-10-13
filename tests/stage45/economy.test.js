// Task 4b (ruling 316, rulings 325): teach and warn. The month's forecast (src/sim/economy.js), the cost lines on cards and the
// confirm bar, the forecast in the top bar's gold chip and its amber, the summary's section, the one-time treasury tip, the Gold
// card and goal, the daily goals' fixes, and the Town unemployment penalty phased in over six months. Every word is checked against
// the sim's own function, with the world set up both ways.
import { describe, it, expect } from '../harness.js';
import { monthFigures, monthForecast, monthlyBill, balanceWith, biggestCost, monthlyEconomy } from '../../src/sim/economy.js';
import { updateMood, unemploymentPhase, jobsPenalty } from '../../src/sim/mood.js';
import { assignLabour } from '../../src/sim/labour.js';
import { settleGoals, goalMet, goalById, openGoals } from '../../src/sim/goals.js';
import { WORLD_VERSION } from '../../src/sim/world.js';
import { updateMilestone } from '../../src/sim/progression.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { ECONOMY, FORECAST } from '../../src/data/economy.js';
import { TIERS } from '../../src/data/housing.js';
import { DAILY_POOL } from '../../src/data/daily.js';
import { GOALS } from '../../src/data/goals.js';
import { TUTORIAL_CARDS } from '../../src/data/tutorial.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
import { cardInfo, shownItems } from '../../src/ui/cards.js';
import { toolPreview } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { createHud } from '../../src/ui/hud.js';
import { S45_TEXT, TIP_TEXT, TIP_HELP_TEXT, CARDS4_TEXT, MOOD_NAMES } from '../../src/ui/text.js';
import { openSheet } from '../../src/ui/modes.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { rigUI, uiWorld } from '../helpers/uiWorld.js';
import { mount, fire } from '../helpers/dom.js';

// A road along y = 10 with homes above it (Cottages: 2 gold a person) and a farm, a granary, a bazaar and a temple below, all staffed.
function city({ gold = 1000, residents = 10 } = {}) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 12, 9, { tier: 3, residents });
  addRaw(w, 'farm_grain', 2, 11);
  addRaw(w, 'granary', 6, 11);
  addRaw(w, 'bazaar', 9, 11);
  addRaw(w, 'temple', 24, 11);
  staffAll(w);
  return w;
}
const bills = (w) => { let upkeep = 0, wages = 0; for (const b of Object.values(w.buildings)) if (b.type !== 'house') { upkeep += BUILDINGS[b.type].upkeep; wages += b.staff * ECONOMY.wagePerWorker; } return { upkeep, wages }; };

describe('s45 forecast (the sim)', () => {
  it('is the month the sim will pay: taxes less wages, upkeep and soldiers, and monthlyEconomy pays exactly it', () => {
    const w = city({ residents: 40 });
    const f = monthForecast(w), { upkeep, wages } = bills(w);
    expect([f.taxes, f.wages, f.upkeep, f.soldiers, f.net]).toEqual([40 * TIERS[3].tax, wages, upkeep, 0, 40 * TIERS[3].tax - wages - upkeep]);
    const gold = w.gold;
    monthlyEconomy(w);
    expect([w.gold - gold, w.stats.lastMonth.taxes, w.stats.lastMonth.wages, w.stats.lastMonth.upkeep, w.stats.lastMonth.net]).toEqual([f.net, f.taxes, f.wages, f.upkeep, f.net]);
    expect(monthFigures(w)).toEqual({ taxes: f.taxes, wages: f.wages, upkeep: f.upkeep, soldiers: f.soldiers, net: f.net });
  });
  it('leaves out a paused building and one no road touches, as the month does', () => {
    const w = city();
    const before = monthFigures(w);
    const temple = Object.values(w.buildings).find((b) => b.type === 'temple');
    temple.paused = true;
    expect(monthFigures(w).upkeep).toBe(before.upkeep - BUILDINGS.temple.upkeep);
    temple.paused = false;
    addRaw(w, 'well', 20, 20);                                        // no road beside it
    expect(monthFigures(w).upkeep).toBe(before.upkeep);
  });
  it('says an empty city has nothing to forecast, and a city that gains (net 0 or more) never runs out', () => {
    const empty = makeTestWorld();
    expect([monthForecast(empty).active, monthForecast(empty).runsOut, monthForecast(empty).goesBelow]).toEqual([false, false, false]);
    const rich = city({ residents: 400 });                            // 800 in taxes against about 280 of bills
    const f = monthForecast(rich);
    expect([f.active, f.net > 0, f.monthsLeft, f.runsOut, f.goesBelow]).toEqual([true, true, null, false, false]);
  });
  it('runs out within 6 months only when the treasury over the bill is under 6: a deep treasury with a negative month is not amber', () => {
    const w = city({ residents: 10 });
    const net = monthFigures(w).net;
    expect(net).toBeLessThan(0);
    const at = (months) => { w.gold = Math.floor(-net * months); return monthForecast(w); };
    for (const [months, runsOut, goesBelow] of [[20, false, false], [6.1, false, false], [5.9, true, false], [3.1, true, false], [2.9, true, true], [0.5, true, true]]) {
      const f = at(months);
      expect([months, f.net < 0, f.runsOut, f.goesBelow]).toEqual([months, true, runsOut, goesBelow]);
    }
    const f = at(4);
    expect(Math.abs(f.monthsLeft - f.gold / -f.net) < 1e-9).toBe(true);
    expect([FORECAST.amberMonths, FORECAST.warnMonths]).toEqual([6, 3]);
    w.gold = -50;                                                     // already in debt and still losing
    expect([monthForecast(w).monthsLeft, monthForecast(w).runsOut, monthForecast(w).goesBelow]).toEqual([0, true, true]);
  });
  it('prices a building at its upkeep plus 4 gold a worker (a farm 46, a well 3), and a purchase moves the balance by what the city can staff', () => {
    expect(monthlyBill('farm_grain')).toEqual({ upkeep: 6, workers: 10, wages: 10 * ECONOMY.wagePerWorker, bill: 46 });
    expect(monthlyBill('well')).toEqual({ upkeep: 3, workers: 0, wages: 0, bill: 3 });
    // The balance with a farm added equals the month as the sim then computes it, with no workforce, a few idle hands and plenty.
    for (const residents of [0, 10, 100]) {
      const w = makeTestWorld({ gold: 5000 });
      setRoad(w, 0, 10, 31, 10);
      addRaw(w, 'house', 12, 9, { tier: 3, residents });
      assignLabour(w);
      const predicted = balanceWith(w, 'farm_grain');
      addRaw(w, 'farm_grain', 2, 11);
      assignLabour(w);
      expect([residents, predicted]).toEqual([residents, monthFigures(w).net]);
    }
  });
  it('names the building that costs the most (upkeep and the wages of its staff), the lowest id on a tie, none when none costs', () => {
    expect(biggestCost(makeTestWorld())).toBe(null);
    const w = city();
    const farm = Object.values(w.buildings).find((b) => b.type === 'farm_grain');
    expect(biggestCost(w)).toEqual({ id: farm.id, type: 'farm_grain', cost: 6 + 10 * ECONOMY.wagePerWorker });
    farm.paused = true;
    const next = biggestCost(w);
    expect(next.cost).toBeLessThan(46);
    expect(['granary', 'bazaar', 'temple']).toContain(next.type);
    const t = makeTestWorld();
    setRoad(t, 0, 10, 31, 10);
    const a = addRaw(t, 'well', 10, 11), b = addRaw(t, 'well', 14, 11);
    expect([biggestCost(t).id, biggestCost(t).id === Math.min(a.id, b.id)]).toEqual([a.id, true]);
  });
});

describe('s45 forecast (cards and the confirm bar)', () => {
  it('puts "Upkeep N a month · N workers" on every card that has a bill, from the sim, and nothing on roads, plots and monuments', () => {
    const w = city();
    w.milestone = 'capital';                                          // every card unlocked
    expect(cardInfo(w, 'farm_grain').upkeepText).toBe('Upkeep 46 a month · 10 workers');
    expect(cardInfo(w, 'well').upkeepText).toBe('Upkeep 3 a month');
    expect(cardInfo(w, 'booth').upkeepText).toBe(`Upkeep ${monthlyBill('booth').bill} a month · 4 workers`);
    for (const t of ['road', 'house', 'demolish', 'statue', 'wall']) expect([t, cardInfo(w, t).upkeepText]).toEqual([t, '']);
    for (const category of ['homes', 'services', 'food', 'industry', 'defence', 'monuments']) {
      for (const item of shownItems(w, category)) {
        const i = cardInfo(w, item), bill = BUILDINGS[item] && !i.locked ? monthlyBill(item) : null;
        expect([item, i.upkeepText]).toEqual([item, bill && bill.bill > 0 ? S45_TEXT.upkeepLine(bill) : '']);
      }
    }
  });
  it('shows the card line in the tray (a card of a locked building shows its lock, not a bill)', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.store.set({ dock: 'tray', category: 'food' });
      const farm = r.root.querySelector('.card[data-item="farm_grain"]');
      expect(farm && farm.querySelector('.upkeep').textContent).toBe('Upkeep 46 a month · 10 workers');
      expect(farm.querySelector('.upkeep').title).toBe(S45_TEXT.upkeepTitle(monthlyBill('farm_grain')));
    } finally { r.cleanup(); }
  });
  it('says "Upkeep N a month" and "Monthly balance becomes +X or -X" in the bar, computed by the sim, with a staffed workforce or none', () => {
    for (const residents of [0, 100]) {
      const w = makeTestWorld({ gold: 5000 });
      setRoad(w, 0, 10, 31, 10);
      addRaw(w, 'house', 12, 9, { tier: 3, residents });
      assignLabour(w);
      const state = { ...INITIAL_UI_STATE, tool: { kind: 'building', type: 'farm_grain' }, ghost: { x: 2, y: 11 } };
      const p = toolPreview(w, state);
      expect(['ok', 'warn']).toContain(p.state);
      expect(p.warnings.includes('needs_road')).toBe(false);
      const net = balanceWith(w, 'farm_grain');
      expect([residents, p.upkeep, p.balance, p.balanceNet]).toEqual([residents, 'Upkeep 46 a month · 10 workers', `Monthly balance becomes ${S45_TEXT.signed(net)}`, net]);
      addRaw(w, 'farm_grain', 2, 11);
      assignLabour(w);
      expect(monthFigures(w).net).toBe(net);                          // and the month, once built, is that
    }
  });
  it('gives no balance to a spot with no road (it costs nothing until one comes) or no ground, and none to a road, plots or a demolish', () => {
    const w = makeTestWorld({ gold: 5000 });
    setRoad(w, 0, 10, 31, 10);
    const lone = toolPreview(w, { ...INITIAL_UI_STATE, tool: { kind: 'building', type: 'temple' }, ghost: { x: 20, y: 20 } });
    expect([lone.warnings.includes('needs_road'), lone.upkeep, lone.balance]).toEqual([true, 'Upkeep 34 a month · 6 workers', '']);
    for (const tool of [{ kind: 'road' }, { kind: 'houses' }, { kind: 'demolish' }]) {
      const p = toolPreview(w, { ...INITIAL_UI_STATE, tool, ghost: null });
      expect([tool.kind, p ? p.upkeep || '' : '', p ? p.balance || '' : '']).toEqual([tool.kind, '', '']);
    }
  });
  it('draws both lines in the confirm bar of a phone, coral when the balance is below 0, and keeps the balance line empty on a blocked spot', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.placement.start({ kind: 'building', type: 'well' }, { x: 16, y: 9 });
      r.ui.placement.moveGhost(16, 9);
      const bar = r.root.querySelector('#confirm');
      expect(bar.querySelector('.cost').textContent).toBe(`${BUILDINGS.well.cost} gold · Upkeep 3 a month`);
      const net = balanceWith(r.world, 'well');
      expect(bar.querySelector('.balance').textContent).toBe(S45_TEXT.balanceLine(net));
      expect(bar.querySelector('.balance').classList.contains('coral')).toBe(net < 0);
      r.ui.placement.moveGhost(12, 9);                                // on a home: blocked
      expect(r.ui.placement.preview().state).toBe('bad');
      expect(bar.querySelector('.balance').textContent.trim()).toBe('');
      expect(bar.querySelector('.balance') !== null).toBe(true);           // the line is kept, so the bar keeps its height
    } finally { r.cleanup(); }
  });
});

// The top bar's gold chip, on the real shell.
describe('s45 forecast (the gold chip)', () => {
  const chip = (root) => root.querySelector('#topbar .forecast');
  const number = (root) => chip(root).firstElementChild.firstElementChild.textContent;
  it('shows "+120 a month" from the sim in every layout, hidden while there is nothing to forecast', async () => {
    for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        r.ui.refresh();
        const f = monthForecast(r.world);
        expect([w, chip(r.root).hidden, number(r.root)]).toEqual([w, false, S45_TEXT.signed(f.net)]);
        expect(chip(r.root).querySelector('.sr-only').textContent).toBe(S45_TEXT.chipLabel(f));
        expect(chip(r.root).querySelector('.long').textContent + chip(r.root).querySelector('.short').textContent).toBe(' a month/mo');
        expect(S45_TEXT.chip(f.net)).toBe(`${f.net >= 0 ? '+' : '−'}${Math.abs(f.net)} a month`);
      } finally { r.cleanup(); }
    }
    const bare = await rigUI({ world: makeTestWorld({ gold: 1000 }) });
    try { bare.ui.refresh(); expect(chip(bare.root).hidden).toBe(true); } finally { bare.cleanup(); }
  });
  it('turns amber (with a mark and its words) only when the sim says the treasury runs out within 6 months, not whenever the month is negative', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const net = monthFigures(r.world).net;
      expect(net).toBeLessThan(0);
      r.world.gold = Math.floor(-net * 12);                           // a year of bills in the bank: negative, not amber
      r.ui.refresh();
      expect([chip(r.root).classList.contains('warn'), number(r.root).includes('⚠')]).toEqual([false, false]);
      expect(chip(r.root).querySelector('.sr-only').textContent).toBe(S45_TEXT.chipLabel(monthForecast(r.world)));
      r.world.gold = Math.floor(-net * 4);                            // four months left: amber
      r.ui.refresh();
      const f = monthForecast(r.world);
      expect([f.runsOut, chip(r.root).classList.contains('warn'), number(r.root)]).toEqual([true, true, `⚠ ${S45_TEXT.signed(f.net)}`]);
      expect(chip(r.root).querySelector('.sr-only').textContent).toBe(`Forecast minus ${-f.net} a month; the treasury runs out in about ${Math.ceil(f.monthsLeft)} months`);
      expect(getComputedStyle(chip(r.root)).color === getComputedStyle(r.root.querySelector('#topbar .stat.people .label')).color).toBe(false);
      r.world.gold = -10;
      r.ui.refresh();
      expect(chip(r.root).querySelector('.sr-only').textContent).toContain('the treasury is below 0');
    } finally { r.cleanup(); }
  });
  it('opens the summary at the forecast section from a tap on the chip, and at the top from a tap on the numbers', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.refresh();
      fire(chip(r.root).firstElementChild, 'click');
      expect(r.store.get().sheet).toEqual({ kind: 'summary', id: 'forecast' });
      const head = r.root.querySelector('#sheet [data-section="forecast"]');
      expect(head && head.textContent).toBe(monthForecast(r.world).net < 0 ? S45_TEXT.forecastHeadShort : S45_TEXT.forecastHeadOk);
      fire(chip(r.root).firstElementChild, 'click');                  // the same tap again closes it
      expect(r.store.get().sheet).toBe(null);
      fire(r.root.querySelector('#topbar .stat.gold .value'), 'click');
      expect(r.store.get().sheet).toEqual({ kind: 'summary', id: null });
    } finally { r.cleanup(); }
  });
  it('heads the summary section by what the balance is, and states the runway, both ways', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const section = () => { r.store.set(openSheet(r.store.get(), 'summary', 'forecast')); const h = r.root.querySelector('#sheet [data-section="forecast"]'); return { head: h.textContent, text: r.root.querySelector('#sheet').textContent }; };
      const net = monthFigures(r.world).net;
      r.world.gold = Math.floor(-net * 4);
      let s = section();
      const f = monthForecast(r.world);
      expect([s.head, s.text.includes(S45_TEXT.runsOutIn(f.monthsLeft)), s.text.includes(`${S45_TEXT.monthlyBalance}${S45_TEXT.signed(f.net)}`)]).toEqual([S45_TEXT.forecastHeadShort, true, true]);
      r.store.set({ sheet: null });
      addRaw(r.world, 'house', 14, 9, { tier: 3, residents: 400 });   // taxes now outrun the bills
      assignLabour(r.world);
      s = section();
      expect(monthForecast(r.world).net).toBeGreaterThan(0);
      expect([s.head, s.text.includes('At this rate')]).toEqual([S45_TEXT.forecastHeadOk, false]);
    } finally { r.cleanup(); }
  });
});

describe('s45 forecast (the phone top bar)', () => {
  it('keeps the gold chip\'s forecast inside the bar, under the gold, at 100% and 150% text on every phone', async () => {
    for (const [w, h] of [[360, 640], [375, 667], [390, 844], [844, 390], [667, 375]]) {
      for (const size of [100, 150]) {
        for (const amber of [false, true]) {
          const world = uiWorld();
          const r = await rigUI({ width: w, height: h, world });
          try {
            r.ui.settings.set({ textSize: size });
            world.gold = amber ? Math.floor(-monthFigures(world).net * 3) : 5000;
            r.ui.refresh();
            const at = `${w}x${h} at ${size}% ${amber ? 'amber' : 'plain'}`;
            const bar = r.root.querySelector('#topbar').getBoundingClientRect(), stats = r.root.querySelector('#topbar .stats').getBoundingClientRect();
            const words = r.root.querySelector('#topbar .forecast').firstElementChild.getBoundingClientRect();
            const gold = r.root.querySelector('#topbar .stat.gold .value').getBoundingClientRect();
            const rows = new Set([...r.root.querySelectorAll('#topbar .stat')].filter((s) => s.offsetParent !== null).map((s) => Math.round(s.getBoundingClientRect().top))).size;
            expect([at, words.width > 0, words.left >= stats.left - 0.5, words.right <= stats.right + 0.5, words.top >= gold.bottom - 1, words.bottom <= bar.bottom + 0.5, bar.bottom <= r.root.querySelector('#under-bar').getBoundingClientRect().top + 0.5, rows])
              .toEqual([at, true, true, true, true, true, true, 1]);
            expect([at, r.root.querySelector('#topbar .forecast .short').offsetParent !== null, r.root.querySelector('#topbar .forecast .long').offsetParent === null]).toEqual([at, true, true]);   // "/mo" on a phone
          } finally { r.cleanup(); }
        }
      }
    }
  });
  it('hides the forecast where the numbers have already wrapped to two rows (six-figure gold on the narrowest phone), so the bar never grows a third line', async () => {
    const world = uiWorld();
    const r = await rigUI({ width: 360, height: 640, world });
    try {
      r.ui.settings.set({ textSize: 150 });
      world.gold = 123456;
      for (const b of Object.values(world.buildings)) if (b.type === 'house') b.residents = 300;
      world.day = 11 * 360 + 300;
      r.ui.refresh();
      const bar = r.root.querySelector('#topbar').getBoundingClientRect();
      const tops = new Set([...r.root.querySelectorAll('#topbar .stat')].filter((s) => s.offsetParent !== null).map((s) => Math.round(s.getBoundingClientRect().top)));
      expect(tops.size).toBe(2);
      expect([r.root.querySelector('#topbar .stats').classList.contains('tight'), r.root.querySelector('#topbar .forecast').offsetParent]).toEqual([true, null]);
      expect(bar.bottom <= r.root.querySelector('#under-bar').getBoundingClientRect().top + 0.5).toBe(true);
    } finally { r.cleanup(); }
  });
});

describe('s45 forecast (the warning tip)', () => {
  const lowCity = () => { const w = uiWorld(); w.gold = Math.floor(-monthFigures(w).net * 2); return w; };
  const make = async (world) => {
    let t = 0;
    const r = await rigUI({ width: 1280, height: 800, now: () => t, world });
    r.ui.settings.set({ seenTips: ['month_summary'] });
    t = TIP_FIRST_DELAY_MS;
    return r;
  };
  it('is the one new tip, on its own trigger, with words short enough for the tip row', () => {
    const tip = TIPS.find((x) => x.id === 'treasury_low');
    expect([tip.trigger, tip.priority, TIPS.filter((x) => x.trigger === 'treasuryLow').length]).toEqual(['treasuryLow', false, 1]);
    expect(TIP_TEXT.treasury_low.split(/\s+/).length).toBeLessThanOrEqual(20);
    expect(TIP_HELP_TEXT.treasury_low).toBe(S45_TEXT.warnTipHelp);
    expect(S45_TEXT.warnTipHelp).toContain(`${FORECAST.warnMonths} months`);
  });
  it('fires at a month end when the sim says the treasury goes below 0 within 3 months, with the city\'s own numbers and a Show me to the costliest building', async () => {
    const world = lowCity();
    const r = await make(world);
    try {
      expect(monthForecast(world).goesBelow).toBe(true);
      r.ui.onEvents([{ type: 'month' }]);
      expect(r.ui.tips.current()).toBe('treasury_low');
      const f = monthForecast(world), big = biggestCost(world);
      expect(r.root.querySelector('#tip .text').textContent).toBe(S45_TEXT.warnTip(f, big));
      expect(r.root.querySelector('#tip .text').textContent).toContain(`${S45_TEXT.runsOutIn(f.monthsLeft)}.`);
      expect(r.root.querySelector('#tip .text').textContent).toContain(`costs the most: ${big.cost} a month`);
      const show = r.root.querySelector('#tip .tip-show-me');
      expect(show.textContent).toBe('Show me');
      fire(show, 'click');
      expect([r.ui.tips.current(), r.store.get().selectedId]).toEqual([null, big.id]);
      expect(r.store.get().sheet).toEqual({ kind: 'info', id: big.id });
      r.ui.onEvents([{ type: 'month' }]);                             // once only: it was seen
      expect(r.ui.tips.current()).toBe(null);
    } finally { r.cleanup(); }
  });
  it('stays quiet while the treasury is deep, or the month gains, however negative the month is', async () => {
    const deep = uiWorld();
    deep.gold = Math.floor(-monthFigures(deep).net * 12);
    const a = await make(deep);
    try { expect(monthForecast(deep).goesBelow).toBe(false); a.ui.onEvents([{ type: 'month' }]); expect(a.ui.tips.current()).toBe(null); } finally { a.cleanup(); }
    const gains = uiWorld();
    addRaw(gains, 'house', 14, 9, { tier: 3, residents: 400 });
    assignLabour(gains);
    gains.gold = 10;
    const b = await make(gains);
    try { expect(monthForecast(gains).net).toBeGreaterThan(0); b.ui.onEvents([{ type: 'month' }]); expect(b.ui.tips.current()).toBe(null); } finally { b.cleanup(); }
  });
  it('words the warning from the forecast: below 0 already, or the months left', () => {
    const w = city({ residents: 10 });
    w.gold = Math.floor(-monthFigures(w).net * 2.4);
    const f = monthForecast(w), big = biggestCost(w);
    expect(S45_TEXT.warnTip(f, big)).toBe(`At this rate the treasury runs out in about 3 months. ${BUILDINGS[big.type].name} costs the most: ${big.cost} a month.`);
    w.gold = -5;
    expect(S45_TEXT.warnTip(monthForecast(w), null)).toBe('The treasury is below 0.');
  });
});

describe('s45 gold card, goal and daily goals', () => {
  it('has a seventh picture card, Gold, after Food, with its words from the wage and its picture and mark made', async () => {
    expect(TUTORIAL_CARDS.map((c) => c.id)).toEqual(['road', 'homes', 'farm', 'food', 'gold', 'goals', 'ahead']);
    const c = CARDS4_TEXT.cards.gold;
    expect(c.words).toBe(`Homes pay taxes every month; every building costs upkeep and ${ECONOMY.wagePerWorker} gold for each worker. Build homes before luxuries.`);
    expect(c.words.split('. ').length).toBeLessThanOrEqual(2);
    const marks = await (await fetch('/assets/tutorial/cards.json')).json();
    expect(marks.cards.gold.mark.kind).toBe('ring');
    expect((await fetch('/assets/tutorial/gold.webp')).status).toBe(200);
  });
  it('adds "End a month in profit" right after the temple, met by a month that ends with taxes above the bills, paying 25 once', () => {
    const ids = GOALS.map((g) => g.id);
    expect(ids.slice(4, 7)).toEqual(['temple', 'profit', 'homes_cottage']);
    const g = goalById('profit');
    expect([g.text, g.reward, g.need]).toEqual(['End a month in profit', 25, { kind: 'profit' }]);
    const w = city({ residents: 400 });
    w.goals.completed.push('road', 'plots', 'well', 'food', 'temple');
    expect([goalMet(w, g.need), openGoals(w, 1).map((x) => x.id)]).toEqual([false, ['profit']]);
    const losing = city({ residents: 4 });
    monthlyEconomy(losing);
    expect(goalMet(losing, g.need)).toBe(false);                      // a month at a loss does not count
    monthlyEconomy(w);
    expect(w.stats.lastMonth.net).toBeGreaterThan(0);
    const gold = w.gold;
    expect(settleGoals(w).map((x) => x.id)).toContain('profit');
    expect(w.gold).toBeGreaterThanOrEqual(gold + 25);
  });
  it('drops the selling daily goal and says "a few minutes", not "about five minutes"', async () => {
    expect(DAILY_POOL.some((d) => d.id === 'sell20')).toBe(false);
    const text = await (await fetch('/src/data/daily.js')).text();
    expect(text.includes('about five minutes')).toBe(false);
    expect(text).toContain('a few minutes at 1x');
  });
});

// The Town unemployment penalty, phased in over six months from the day the city first became a Town (ruling 325).
describe('s45 unemployment phase-in', () => {
  // A Town whose workforce is all jobless: the full penalty is (1 - 0.15) x 100 = 85.
  const jobless = (townDay, day) => {
    const w = makeTestWorld({ gold: 1000 });
    addRaw(w, 'house', 12, 9, { tier: 1, residents: 250 });   // huts want no food: the Food row is +20 and the mood starts at 80
    w.milestone = 'town';
    w.splits.town = townDay;
    w.day = day;
    w.labour = { workforce: 100, employed: 0, jobs: 0, shortLevels: [] };
    return w;
  };
  it('is 0 on the day of Town, a sixth more each month, and the whole of it after six months', () => {
    const rows = [0, 1, 2, 3, 4, 5, 6, 9, 30].map((m) => { const w = jobless(100, 100 + m * 30); return [m, jobsPenalty(w).now, unemploymentPhase(w).monthsLeft]; });
    expect(rows).toEqual([[0, 0, 6], [1, -14, 5], [2, -28, 4], [3, -43, 3], [4, -57, 2], [5, -71, 1], [6, -85, 0], [9, -85, 0], [30, -85, 0]]);
    expect(jobsPenalty(jobless(100, 100)).full).toBe(-85);
    expect(FORECAST.phaseMonths).toBe(6);
  });
  it('feeds the mood: a Town of homes goes 80, 66, 52, ... and reaches 0 only after six months, not in the first', () => {
    const moods = [0, 1, 2, 3, 4, 5, 6].map((m) => { const w = jobless(100, 100 + m * 30); updateMood(w); return [w.mood, w.moodBreakdown.jobs]; });
    expect(moods).toEqual([[80, 0], [66, -14], [52, -28], [37, -43], [23, -57], [9, -71], [0, -85]]);
  });
  it('takes nothing before Town and nothing from a workforce under the 15% line, at any phase', () => {
    const w = jobless(100, 100);
    w.milestone = 'village';
    w.day = 100 + 400;
    expect(jobsPenalty(w)).toEqual({ now: 0, full: 0, monthsLeft: 0 });
    const ok = jobless(100, 100 + 400);
    ok.labour = { workforce: 100, employed: 90, jobs: 90, shortLevels: [] };
    expect(jobsPenalty(ok).now + 0).toBe(0);
  });
  it('gives the full penalty where the Town day was never recorded (an old save), and loads from version 6 with no new field or version', () => {
    const w = jobless(100, 110);
    w.splits = {};
    expect(unemploymentPhase(w)).toEqual({ factor: 1, monthsLeft: 0 });
    expect(jobsPenalty(w).now).toBe(-85);
    expect(WORLD_VERSION).toBe(6);                                    // world.splits.town is the start day, recorded since Stage 3
  });
  it('records the Town day when the city first becomes a Town, and the phase counts from it', () => {
    const w = makeTestWorld({ gold: 1000 });
    addRaw(w, 'house', 12, 9, { tier: 3, residents: 160 });
    w.tally.peakPeople = 160;
    w.labour = { workforce: 100, employed: 0, jobs: 0, shortLevels: [] };
    w.day = 90;
    expect([updateMilestone(w), w.milestone, w.splits.town]).toEqual([true, 'town', 90]);
    expect([unemploymentPhase(w).factor, jobsPenalty(w).now]).toEqual([0, 0]);
    w.day = 120;
    expect([unemploymentPhase(w).factor, jobsPenalty(w).now]).toEqual([1 / 6, -14]);
    updateMilestone(w);                                               // reached again: the day stays the first one
    expect(w.splits.town).toBe(90);
  });
  it('words the Jobs row of the mood breakdown with the phased value, and what it comes to, until it is whole', async () => {
    const world = jobless(100, 100 + 60);
    updateMood(world);
    const r = await rigUI({ width: 1280, height: 800, world });
    try {
      r.store.set(openSheet(r.store.get(), 'summary'));
      const rows = () => [...r.root.querySelectorAll('#sheet .row')].map((n) => n.textContent);
      const jobs = jobsPenalty(world);
      expect([jobs.now, jobs.full, jobs.monthsLeft]).toEqual([-28, -85, 4]);
      expect(rows()).toContain(`${S45_TEXT.jobsPhasing(-85, 4)}-28`);
      expect(S45_TEXT.jobsPhasing(-85, 4)).toBe('Jobs (phasing in: −85 in 4 months)');
      r.store.set({ sheet: null });
      world.day = 100 + 6 * 30;
      updateMood(world);
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(rows()).toContain(`${MOOD_NAMES.jobs}-85`);              // whole: the plain row
      expect(rows().some((t) => t.includes('phasing'))).toBe(false);
    } finally { r.cleanup(); }
  });
});
