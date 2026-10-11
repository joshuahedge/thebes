import { describe, it, expect } from '../harness.js';
import { TIERS } from '../../src/data/housing.js';
import { FIRSTS } from '../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { DAILY_POOL } from '../../src/data/daily.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
import { houseStatus } from '../../src/sim/housing.js';
import { desirabilityContributors } from '../../src/sim/desirability.js';
import { removeBuilding } from '../../src/sim/world.js';
import { select, openSheet } from '../../src/ui/modes.js';
import {
  T, NEED_NAMES, CAUSE_TEXT, FIRST_TEXT, ACHIEVEMENT_TEXT, DAILY_TEXT, CHAPTER_NAMES, TIP_TEXT,
  causeText, desirabilityText, contributorText, keepWarningText, goodName,
} from '../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

// A Town street along y = 10 with a home at (12, 9), a well, a temple and a bazaar in reach of it, and a granary.
function street({ tier = 4, residents = 16, stock = { grain: 10 } } = {}) {
  const w = makeTestWorld({ gold: 5000 });
  w.milestone = 'town';
  setRoad(w, 0, 10, 31, 10);
  const home = addRaw(w, 'house', 12, 9, { tier, residents, stock: { ...stock }, stockedFor: residents });
  addRaw(w, 'well', 12, 11);
  addRaw(w, 'temple', 14, 11);
  const bazaar = addRaw(w, 'bazaar', 17, 11);
  addRaw(w, 'granary', 3, 11, { store: { grain: 100 } });
  staffAll(w);
  return { w, home, bazaar };
}
const rowOf = (r, need) => r.root.querySelector(`#sheet .checklist li[data-need="${need}"]`);
const words = (li, sel) => (li.querySelector(sel) ? li.querySelector(sel).textContent : null);
// The house sheet never says something false (the pass's invariant, at the interface): a row shows a cause exactly
// when it is missing, and every cause it shows has words.
function sheetTellsTheTruth(r) {
  const rows = [...r.root.querySelectorAll('#sheet .checklist li')];
  expect(rows.length).toBeGreaterThan(0);
  for (const li of rows) {
    const cause = li.querySelector('.cause');
    expect([li.dataset.need, li.classList.contains('missing'), Boolean(cause && cause.textContent.length > 0)])
      .toEqual([li.dataset.need, li.classList.contains('missing'), li.classList.contains('missing')]);
  }
}

describe('ui house sheet for the economy', () => {
  it('follows a good from no store near the bazaar, to nothing making it, to on its way, to in the home, with Show me at each step', async () => {
    const { w, home } = street();
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), home.id));
      let pottery = rowOf(r, 'pottery');
      expect(pottery.querySelector('.name').textContent).toBe(NEED_NAMES.pottery);
      expect(words(pottery, '.cause')).toBe('The bazaar has no pottery');
      expect(words(pottery, '.fix span')).toBe('Build a storehouse within 16 road tiles of it');
      sheetTellsTheTruth(r);
      fire(pottery.querySelector('.show-me'), 'click');
      expect([r.store.get().category, r.store.get().tool]).toEqual(['industry', { kind: 'building', type: 'storehouse' }]);
      const store = addRaw(w, 'storehouse', 20, 11);
      staffAll(w);
      r.store.set(select(r.store.get(), home.id));
      pottery = rowOf(r, 'pottery');
      expect(words(pottery, '.cause')).toBe('Nothing makes pottery near the bazaar');
      expect(words(pottery, '.fix span')).toBe('Make pottery near it: a clay pit and a potter');
      fire(pottery.querySelector('.show-me'), 'click');                               // the first maker the city has none of
      expect(r.store.get().tool).toEqual({ kind: 'building', type: 'clay_pit' });
      store.store.pottery = 20;
      r.store.set(select(r.store.get(), home.id));
      pottery = rowOf(r, 'pottery');
      expect(words(pottery, '.cause')).toBe('The next delivery brings pottery');
      expect(pottery.querySelector('button')).toBe(null);                             // nothing to do: it comes by itself
      sheetTellsTheTruth(r);
      home.stock.pottery = 1;
      r.ui.refresh();
      expect(rowOf(r, 'pottery').classList.contains('met')).toBe(true);
      sheetTellsTheTruth(r);
    } finally { r.cleanup(); }
  });
  it('words makers or a store that are not unlocked yet by the milestone that brings them, and a food as grown', () => {
    const w = makeTestWorld();
    expect(causeText({ code: 'no_good', id: null, good: 'pottery' }, w, 'pottery')).toEqual({ cause: 'The bazaar has no pottery', fix: 'Storehouses come with Town' });
    w.milestone = 'town';
    expect(causeText({ code: 'good_unmade', id: null, good: 'beer' }, w, 'beer')).toEqual({ cause: 'Nothing makes beer near the bazaar', fix: 'Barley farms and breweries come with City' });
    w.milestone = 'city';
    expect(causeText({ code: 'good_unmade', id: null, good: 'beer' }, w, 'beer').fix).toBe('Make beer near it: a barley farm and a brewery');
    expect(causeText({ code: 'good_unmade', id: null, good: 'figs' }, w, 'twoFoods')).toEqual({ cause: 'Nothing grows figs near the bazaar', fix: 'Grow figs near it: a fig orchard' });
    expect(causeText({ code: 'no_good', id: null, good: 'figs' }, w, 'twoFoods').fix).toBe('Build a granary within 16 road tiles of it');
    expect(causeText({ code: 'next_delivery', id: null, good: 'figs' }, w, 'twoFoods').cause).toBe('The next delivery brings figs');
    expect(causeText({ code: 'next_delivery', id: null }, w, 'food')).toBe(CAUSE_TEXT.next_delivery);   // food keeps its words
    expect(causeText({ code: 'no_such_code', id: null }, w, 'water')).toBe(null);
  });
  it('names a missing booth, an idle one and one with no road, each with its fix', async () => {
    const { w, home } = street({ tier: 5, residents: 22, stock: { grain: 10, pottery: 5 } });
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), home.id));
      let fun = rowOf(r, 'entertainment');
      expect(words(fun, '.cause')).toBe(`No booth within 8 road tiles`);
      expect(words(fun, '.fix span')).toBe(CAUSE_TEXT.no_booth.fix);
      sheetTellsTheTruth(r);
      fire(fun.querySelector('.show-me'), 'click');
      expect(r.store.get().tool).toEqual({ kind: 'building', type: 'booth' });
      const booth = addRaw(w, 'booth', 16, 11, { paused: true });
      r.store.set(select(r.store.get(), home.id));
      fun = rowOf(r, 'entertainment');
      expect(words(fun, '.cause')).toBe('The booth is paused');
      fire(fun.querySelector('.view'), 'click');
      expect(r.store.get().selectedId).toBe(booth.id);
      removeBuilding(w, booth.id);
      addRaw(w, 'booth', 13, 7);                                                      // beside the home, but no road touches it
      r.store.set(select(r.store.get(), home.id));
      expect(words(rowOf(r, 'entertainment'), '.cause')).toBe('The booth has no road');
      sheetTellsTheTruth(r);
    } finally { r.cleanup(); }
  });
  it("shows the desirability score and its three biggest causes, with a garden's Show me while it falls short", async () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    const home = addRaw(w, 'house', 12, 9, { tier: 5, residents: 22, stock: { grain: 10, pottery: 5 }, stockedFor: 22 });
    addRaw(w, 'temple', 14, 11);                                                      // 2 tiles away: +6
    addRaw(w, 'garden', 12, 8);                                                       // touching: +3
    addRaw(w, 'potter', 8, 11);                                                       // 3 tiles away: -2
    staffAll(w);
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), home.id));
      let row = rowOf(r, 'desirability');
      expect(row.querySelector('.name').textContent).toBe(NEED_NAMES.desirability);
      expect(words(row, '.desirability')).toBe('7 of 20: +6 temple, +3 garden, −2 potter');        // spec 4.7's form
      expect(words(row, '.cause')).toBe(CAUSE_TEXT.low_desirability.cause);
      fire(row.querySelector('.show-me'), 'click');
      expect(r.store.get().tool).toEqual({ kind: 'building', type: 'garden' });
      addRaw(w, 'statue', 11, 9);
      addRaw(w, 'statue', 13, 9);
      r.store.set(select(r.store.get(), home.id));
      row = rowOf(r, 'desirability');
      expect(row.classList.contains('met')).toBe(true);
      expect(words(row, '.desirability')).toBe(desirabilityText(23, 20, desirabilityContributors(w, home, 3).map((d) => contributorText(d.value, d.type))));
      expect(words(row, '.desirability')).toBe('23 of 20: +8 statue, +8 statue, +6 temple');
      sheetTellsTheTruth(r);
    } finally { r.cleanup(); }
  });
  it('warns the month before a Manor drops for its street, in the words of spec 4.6', async () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    const manor = addRaw(w, 'house', 12, 8, { w: 2, d: 2, tier: 6, residents: 60, stock: { grain: 30, pottery: 10 }, stockedFor: 60, downTimer: 1 });
    addRaw(w, 'well', 12, 11);
    addRaw(w, 'temple', 14, 11);
    addRaw(w, 'booth', 16, 11);
    addRaw(w, 'bazaar', 17, 11);
    staffAll(w);
    expect(houseStatus(w, manor).missingNow.filter((n) => n !== 'desirability')).toEqual([]);   // every need met: only the street is short
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), manor.id));
      expect(r.root.querySelector('#sheet .keep-warning').textContent).toBe('Loses Manor in 1 month: the street is not pleasant enough');
      expect(keepWarningText('Manor', null)).toBe('The street is not pleasant enough to keep a Manor');
      sheetTellsTheTruth(r);
    } finally { r.cleanup(); }
  });
  it('asks a Townhouse for a 2×2 square of plots, with Show me on the plot tool, and says when the square is there', async () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    const home = addRaw(w, 'house', 12, 9, { tier: 5, residents: 22 });
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), home.id));
      let merge = rowOf(r, 'merge');
      expect(merge.querySelector('.name').textContent).toBe(`Room to become a ${TIERS[6].name}`);
      expect(words(merge, '.cause')).toBe(CAUSE_TEXT.no_square.cause);
      expect(words(merge, '.fix span')).toBe(`Make a square with three plots beside it, empty or ${TIERS[5].name}s`);
      sheetTellsTheTruth(r);
      fire(merge.querySelector('.show-me'), 'click');
      expect(r.store.get().tool).toEqual({ kind: 'houses' });
      for (const [x, y] of [[11, 8], [12, 8], [11, 9]]) addRaw(w, 'house', x, y);   // three empty plots: the north-west square
      r.store.set(select(r.store.get(), home.id));
      merge = rowOf(r, 'merge');
      expect([merge.classList.contains('met'), merge.querySelector('.status').textContent]).toEqual([true, T.hasIt]);
      sheetTellsTheTruth(r);
    } finally { r.cleanup(); }
  });
  it('sums up the economy: the difficulty, trade income, food by kind and each good made against used last month', async () => {
    const r = await rigUI();
    try {
      const rows = () => [...r.root.querySelectorAll('#sheet .row')].map((row) => [row.firstChild.textContent, row.lastChild.textContent]);
      r.world.difficulty = 'hard';
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(rows()[0]).toEqual([T.difficulty, 'Hard']);
      expect(r.root.querySelector('#sheet').textContent).toContain(T.noGoodsYet);
      r.store.set({ sheet: null });
      r.world.stats.lastMonth = { taxes: 10, wages: 4, upkeep: 2, net: 4, made: { pottery: 30, clay: 40, grain: 25 }, used: { pottery: 26, clay: 30, grain: 18 }, tradeIncome: 240 };
      r.world.buildings[Object.keys(r.world.buildings).find((id) => r.world.buildings[id].type === 'granary')].store = { grain: 50, figs: 12 };
      r.store.set(openSheet(r.store.get(), 'summary'));
      const all = rows();
      expect(all.some(([k, v]) => k === T.tradeIncome && v === '+240')).toBe(true);
      expect(all.some(([k, v]) => k === goodName('figs') && v === '12')).toBe(true);
      const head = [...r.root.querySelectorAll('#sheet h3')].find((h) => h.textContent === T.goodsLastMonth);
      const goods = [];
      for (let n = head.nextElementSibling; n && n.tagName !== 'H3'; n = n.nextElementSibling) goods.push([n.firstChild.textContent, n.lastChild.textContent]);
      expect(goods).toEqual([[goodName('grain'), '25 made, 18 used'], [goodName('pottery'), '30 made, 26 used'], [goodName('clay'), '40 made, 30 used']]);
    } finally { r.cleanup(); }
  });
  it('brings the desirability tip on a Townhouse sheet, and the merge tip once that one is seen', async () => {
    let t = 0;
    for (const seen of [[], ['desirability']]) {
      const r = await rigUI({ now: () => t });
      try {
        const des = TIPS.find((x) => x.trigger === 'desirabilityShown'), merge = TIPS.find((x) => x.trigger === 'townhouseSheet');
        const house = TIPS.find((x) => x.trigger === 'houseSheet');
        r.ui.settings.set({ seenTips: [house.id, ...(seen.length ? [des.id] : [])] });
        t = TIP_FIRST_DELAY_MS;
        const home = r.world.buildings[Object.keys(r.world.buildings).find((id) => r.world.buildings[id].type === 'house')];
        home.tier = 5;
        r.store.set(select(r.store.get(), home.id));
        const want = seen.length ? merge : des;
        expect(r.ui.tips.current()).toBe(want.id);
        expect(r.root.querySelector('#tip .text').textContent).toBe(TIP_TEXT[want.id]);
      } finally { r.cleanup(); t = 0; }
    }
  });
  it("has the words for Stage 2's firsts, achievements, daily goals and goal chapters, from the data", () => {
    for (const f of FIRSTS.filter((x) => x.check.kind === 'tier' && x.check.tier >= 5)) expect([f.id, FIRST_TEXT[f.id].head]).toEqual([f.id, `First ${TIERS[f.check.tier].name}`]);
    const madeFirst = FIRSTS.find((x) => x.check.kind === 'made');
    expect(FIRST_TEXT[madeFirst.id].head).toBe(`First ${goodName(madeFirst.check.good).toLowerCase()}`);
    const made = ACHIEVEMENTS.find((a) => a.measure.kind === 'made');
    expect(ACHIEVEMENT_TEXT[made.id]).toBe(`Make ${made.measure.n} ${goodName(made.measure.good).toLowerCase()}`);
    const trade = ACHIEVEMENTS.find((a) => a.measure.kind === 'tally' && a.measure.key === 'tradeIncome');
    expect(ACHIEVEMENT_TEXT[trade.id]).toBe(`Earn ${trade.measure.n} gold from trade`);
    const estate = ACHIEVEMENTS.find((a) => a.measure.kind === 'tier' && a.measure.n === 1);
    expect(ACHIEVEMENT_TEXT[estate.id]).toBe(`Have 1 home at ${TIERS[estate.measure.tier].name} or better`);
    for (const d of DAILY_POOL) expect([d.id, typeof DAILY_TEXT[d.id], DAILY_TEXT[d.id].length > 8]).toEqual([d.id, 'string', true]);
    const madeDaily = DAILY_POOL.find((d) => d.measure.kind === 'made');
    expect(DAILY_TEXT[madeDaily.id]).toBe(`Make ${madeDaily.n} ${goodName(madeDaily.measure.good).toLowerCase()}`);
    expect([CHAPTER_NAMES.goods, CHAPTER_NAMES.grand]).toEqual(['Goods', 'A grand city']);
  });
});
