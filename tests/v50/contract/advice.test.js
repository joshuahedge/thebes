// Version 5.0 Task 0 (the contract): city advice (src/sim/advice.js cityAdvice) and a home's next step (nextStep), each set up both ways:
// the problem there and the advice naming it with the sim's own numbers and fix, then the problem gone and the advice with it. A fix is never
// something the sim would refuse: locked buildings are never offered, a price is costOf's (a road's per tile) and afford is canAfford's.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { cityAdvice, nextStep, causeFix, unmadeFix, priceOf, compareAdvice, daysToDelivery, makerOf, storeFor, goodMakers } from '../../../src/sim/advice.js';
import * as text from '../../../src/ui/text.js';
import { ADVICE, ADVICE_KINDS } from '../../../src/data/advice.js';
import { TIERS, MAX_TIER } from '../../../src/data/housing.js';
import { HOUSEHOLD_GOODS, GOODS } from '../../../src/data/goods.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { needCause, houseStatus } from '../../../src/sim/housing.js';
import { houseDesirability } from '../../../src/sim/desirability.js';
import { costOf, roadCostOf } from '../../../src/sim/costs.js';
import { canAfford } from '../../../src/sim/money.js';
import { isUnlocked } from '../../../src/sim/progression.js';
import { largePlotUnlocked } from '../../../src/sim/largePlots.js';
import { monthForecast } from '../../../src/sim/economy.js';
import { towersNeeded, firstRaidTarget } from '../../../src/sim/raids.js';
import { fallIll } from '../../../src/sim/health.js';
import { createWorld, buildingAt, removeBuilding } from '../../../src/sim/world.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { serialize } from '../../../src/save/serialize.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';

const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
const ofKind = (w, kind) => cityAdvice(w).filter((a) => a.kind === kind);

// A road along y = 10 with a working well, temple and bazaar in reach of a House (tier 4) at (12, 11) that has its food: its next tier, a
// Townhouse, also asks for pottery, which nothing in the city makes or keeps.
function street({ size = 64, tier = 4, milestone = 'village' } = {}) {
  const w = makeTestWorld({ size });
  w.milestone = milestone;
  setRoad(w, 0, 10, size - 1, 10);
  const well = addRaw(w, 'well', 14, 9);
  const temple = addRaw(w, 'temple', 20, 8);
  const bazaar = addRaw(w, 'bazaar', 9, 8);
  const home = addRaw(w, 'house', 12, 11, { tier, residents: TIERS[tier].capacity, stockedFor: TIERS[tier].capacity, stock: { grain: 30 } });
  staffAll(w);
  return { w, well, temple, bazaar, home };
}

// Every item's shape and the never-refused rule.
function checkItems(w, list) {
  for (const a of list) {
    expect(Object.keys(a).sort()).toEqual(['afford', 'cost', 'count', 'data', 'fix', 'id', 'key', 'kind', 'weight']);
    expect(ADVICE_KINDS).toContain(a.kind);
    expect(a.weight).toBeGreaterThan(0);
    if (a.fix && a.fix.item) {
      expect([a.key, a.fix.item === 'road' || (a.fix.item === 'large_plot' ? largePlotUnlocked(w) : isUnlocked(w, a.fix.item))]).toEqual([a.key, true]);   // Version 6.0: the Large plot card is unlocked by its first Townhouse, not a milestone
      expect([a.cost, a.afford]).toEqual([priceOf(w, a.fix), canAfford(w, a.cost)]);
      expect(['near', 'terrain']).toContain(a.fix.at);
    } else if (a.fix && a.fix.select !== undefined) {
      expect(Boolean(w.buildings[a.fix.select])).toBe(true);
      expect([a.cost, a.afford]).toEqual([null, null]);
    } else if (a.fix) {
      expect([a.fix.view, a.fix.target]).toEqual(['summary', null]);
      expect(['forecast', 'employment', 'events']).toContain(a.fix.section);   // Version 7.0 (Track E): the waiting event's item opens the summary's Events section (src/sim/cityEvents.js eventItems)
    }
  }
  for (let i = 1; i < list.length; i++) expect(compareAdvice(list[i - 1], list[i]) <= 0).toBe(true);
}

describe('v50 contract advice: homes held back', () => {
  it('names the first unmet need of each home, grouped by need and cause, weighed by the tier it would rise to', () => {
    const { w, well, home } = street({ tier: 3 });
    const hut = addRaw(w, 'house', 13, 11, { tier: 1, residents: 5, stockedFor: 5 });
    well.paused = true;                                          // in reach but paused: both lack water by it
    const list = ofKind(w, 'home_need');
    expect(list.map((a) => [a.key, a.count, a.weight, a.data.homes, a.data.need])).toEqual([[`home_need:water:well_idle:${well.id}`, 2, 4 + 2, [home.id, hut.id], 'water']]);
    expect(list[0].fix).toEqual({ select: well.id, target: centre(well), why: 'well_idle' });   // select it: nothing to build
    expect([list[0].cost, list[0].afford, list[0].id]).toEqual([null, null, home.id]);
    checkItems(w, cityAdvice(w));
    well.paused = false;
    expect(ofKind(w, 'home_need')).toEqual([]);
    expect([nextStep(w, home).reason, nextStep(w, hut).reason]).toEqual(['ready', 'ready']);
  });

  it('a missing well: build one by the first home, at its price, and whether the treasury can pay it; gone once a well serves them', () => {
    const { w, well, home } = street({ tier: 2 });
    removeBuilding(w, well.id);
    let [a] = ofKind(w, 'home_need');
    expect([a.key, a.fix, a.cost, a.afford, a.weight]).toEqual(['home_need:water:no_well:-', { item: 'well', at: 'near', target: centre(home) }, costOf(w, 'well'), true, 3]);
    w.gold = -100000;                                            // the placing rule would refuse it: afford says so
    [a] = ofKind(w, 'home_need');
    expect([a.fix.item, a.afford]).toEqual(['well', false]);
    addRaw(w, 'well', 15, 11, { staff: BUILDINGS.well.workers });
    expect(ofKind(w, 'home_need')).toEqual([]);
  });

  it('a good whose makers are locked weighs half and offers no build, naming what it waits for; at Town the store is offered', () => {
    const { w, bazaar, home } = street();
    let step = nextStep(w, home);
    expect([step.reason, step.need, step.cause.code, step.locked]).toEqual(['locked', 'pottery', 'no_good', { item: 'clay_pit', milestone: 'town' }]);
    let [a] = ofKind(w, 'home_need');
    expect([a.key, a.weight, a.fix, a.cost, a.data.locked]).toEqual([`home_need:pottery:no_good:${bazaar.id}`, 5 * ADVICE.locked, null, null, { item: 'clay_pit', milestone: 'town' }]);
    w.milestone = 'town';
    step = nextStep(w, home);
    expect([step.reason, step.fix, step.cost]).toEqual([null, { item: 'storehouse', at: 'near', target: centre(bazaar) }, costOf(w, 'storehouse')]);
    [a] = ofKind(w, 'home_need');
    expect([a.weight, a.fix.item]).toEqual([5, 'storehouse']);
    // A store in reach but empty: make pottery (the first maker the city has none of: a clay pit, on clay).
    const near = addRaw(w, 'storehouse', 4, 8, { staff: 6 });
    step = nextStep(w, home);
    expect([step.cause.code, step.fix.item, step.fix.at]).toEqual(['good_unmade', 'clay_pit', 'terrain']);
    // Pottery in that store: it comes with the next delivery, so the home waits and the advice leaves it out.
    near.store.pottery = 50;
    step = nextStep(w, home);
    expect([step.reason, step.need, step.cause.code, step.days]).toEqual(['waiting', 'pottery', 'next_delivery', daysToDelivery(w)]);
    expect(ofKind(w, 'home_need')).toEqual([]);
    checkItems(w, cityAdvice(w));
  });

  it('a good held only in a far store is stranded: select the store near the bazaar that should Fetch it (else the far store); gone once a store in reach holds it', () => {
    const { w, bazaar, home } = street({ milestone: 'town' });
    const near = addRaw(w, 'storehouse', 4, 8);
    const far = addRaw(w, 'storehouse', 50, 8, { store: { pottery: 40 } });
    staffAll(w);
    const [a] = ofKind(w, 'stranded');
    expect([a.key, a.count, a.weight, a.data.good, a.data.store, a.data.bazaar]).toEqual([`stranded:pottery:${far.id}`, 1, 5, 'pottery', far.id, bazaar.id]);
    expect(a.data.len).toBe(needCause(w, home, 'pottery').len);
    expect(a.fix).toEqual({ select: near.id, target: centre(near), why: 'good_far', fetch: true });   // Version 5.0 (Task 3 review): Show me opens the store that sets the Fetch order
    near.paused = true;                                                                              // none near can fetch: the far store, as before
    expect(ofKind(w, 'stranded')[0].fix).toEqual({ select: far.id, target: centre(far), why: 'good_far' });
    near.paused = false;
    near.store.pottery = 5;
    expect(ofKind(w, 'stranded')).toEqual([]);
  });

  it('a plot with no road: the road, at a road tile\'s price; a plot on the road is empty, not held back', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const off = addRaw(w, 'house', 20, 14);
    const on = addRaw(w, 'house', 20, 11);
    const step = nextStep(w, off);
    expect([step.reason, step.need, step.fix, step.cost]).toEqual([null, 'road', { item: 'road', at: 'near', target: centre(off) }, roadCostOf(w)]);
    expect(nextStep(w, on).reason).toBe('empty');
    const [a] = ofKind(w, 'home_need');
    expect([a.key, a.count, a.weight, a.data.homes]).toEqual(['home_need:road:no_road:-', 1, 1, [off.id]]);
  });

  it('a home with every row met rises at the month end; the top tier with all it needs is kept', () => {
    const { w, home } = street();
    w.milestone = 'town';
    home.stock.pottery = 20;
    expect([nextStep(w, home).reason, nextStep(w, home).days]).toEqual(['ready', daysToDelivery(w)]);
    expect(houseStatus(w, home).checklist.every((c) => c.met)).toBe(true);
    advanceDays(w, 3);
    expect(daysToDelivery(w)).toBe(30 - (w.day % 30));
    // The top tier: an Estate on a street with everything (Stage 4.7's tiers test street, compressed).
    const v = makeTestWorld();
    setRoad(v, 0, 10, 31, 10);
    addRaw(v, 'well', 14, 9); addRaw(v, 'temple', 20, 8); addRaw(v, 'booth', 16, 9);
    const bz = addRaw(v, 'bazaar', 9, 8);
    bz.store = Object.fromEntries([['grain', 300], ['figs', 300], ['fish', 300], ...HOUSEHOLD_GOODS.map((g) => [g, 300])]);
    const top = addRaw(v, 'house', 12, 11, { tier: MAX_TIER, w: 2, d: 2, residents: 160, stockedFor: 160 });
    top.stock = Object.fromEntries([...HOUSEHOLD_GOODS.map((g) => [g, Math.ceil(160 * GOODS[g].perResidentPerMonth * 2)]), ['grain', 20], ['figs', 20], ['fish', 20]]);
    for (const [x, y] of [[11, 11], [11, 12], [11, 13], [12, 13], [13, 13], [14, 13], [14, 12], [14, 11], [10, 11], [10, 12], [10, 13], [11, 14], [12, 14], [13, 14], [14, 14], [15, 11], [15, 12], [15, 13]]) {
      if (houseDesirability(v, top) >= TIERS[MAX_TIER].desirability.rise) break;
      if (!buildingAt(v, x, y)) addRaw(v, 'statue', x, y);
    }
    staffAll(v);
    expect([nextStep(v, top).reason, nextStep(v, top).next]).toEqual(['kept', null]);
    top.stock.jewellery = 0;                                     // short of jewellery: the step is to keep it
    const step = nextStep(v, top);
    expect([step.reason === null || step.reason === 'waiting', step.need]).toEqual([true, 'jewellery']);
  });
});

describe('v50 contract advice: the city', () => {
  it('a good running out within ADVICE.runOutMonths at last month\'s net use, for the homes whose own tier needs it; none when made keeps up', () => {
    const { w, home } = street({ tier: 5, milestone: 'town' });
    const store = addRaw(w, 'storehouse', 4, 8, { store: { pottery: 40 } });
    staffAll(w);
    w.stats.lastMonth = { used: { pottery: 30 }, made: {} };
    const [a] = ofKind(w, 'running_out').filter((x) => x.data.need === 'pottery');
    expect([a.key, a.weight, a.data.held, a.data.monthsLeft, a.data.homes, a.data.store]).toEqual(['running_out:pottery', 5, 40, 1.3, [home.id], store.id]);
    expect([a.fix.item, a.fix.at, a.fix.target, a.cost]).toEqual(['clay_pit', 'terrain', centre(store), costOf(w, 'clay_pit')]);
    w.stats.lastMonth = { used: { pottery: 30 }, made: { pottery: 30 } };
    expect(ofKind(w, 'running_out')).toEqual([]);
    w.stats.lastMonth = { used: { pottery: 10 }, made: {} };     // four months held: not yet
    expect(ofKind(w, 'running_out')).toEqual([]);
  });

  it('workers short from the labour record, and jobless once the sim counts unemployment (its alert)', () => {
    const { w } = street({ milestone: 'town' });
    w.labour = { workforce: 10, employed: 10, jobs: 30, shortLevels: ['services'] };
    let [a] = ofKind(w, 'workers_short');
    expect([a.count, a.weight, a.data.levels, a.fix]).toEqual([20, 20 * ADVICE.workerShort, ['services'], { view: 'summary', section: 'employment', target: null }]);
    expect(ofKind(w, 'jobless')).toEqual([]);
    w.labour = { workforce: 100, employed: 50, jobs: 50, shortLevels: [] };
    expect(ofKind(w, 'workers_short')).toEqual([]);
    [a] = ofKind(w, 'jobless');
    expect([a.count, a.weight]).toEqual([50, 50 * ADVICE.jobless]);
    w.labour = { workforce: 100, employed: 90, jobs: 90, shortLevels: [] };
    expect(ofKind(w, 'jobless')).toEqual([]);
  });

  it('the treasury running out (the forecast\'s runsOut), weighed by the deficit; none with gold in hand', () => {
    const { w } = street();
    w.gold = 30;
    const f = monthForecast(w);
    expect(f.net).toBeLessThan(0);
    const [a] = ofKind(w, 'treasury');
    expect([a.data.net, a.data.monthsLeft, a.data.soon, a.fix.section]).toEqual([f.net, f.monthsLeft, f.goesBelow, 'forecast']);
    expect(a.weight).toBe(Math.max(1, Math.round(-f.net / ADVICE.goldPerPoint)) * (f.goesBelow ? ADVICE.goldSoon : 1));
    w.gold = 100000;
    expect(ofKind(w, 'treasury')).toEqual([]);
  });

  it('fire risk no firehouse covers: a firehouse by it; a paused one in reach is selected; none once a staffed one covers it', () => {
    const { w, home } = street();
    home.risk = 100000;
    let [a] = ofKind(w, 'fire');
    expect([a.count, a.weight, a.data.cause, a.fix, a.cost]).toEqual([1, ADVICE.fireRisk, 'none', { item: 'firehouse', at: 'near', target: centre(home) }, costOf(w, 'firehouse')]);
    const fh = addRaw(w, 'firehouse', 16, 9, { paused: true });
    [a] = ofKind(w, 'fire');
    expect([a.data.cause, a.fix]).toEqual(['paused', { select: fh.id, target: centre(fh), why: 'paused' }]);
    fh.paused = false;
    fh.staff = BUILDINGS.firehouse.workers;
    expect(ofKind(w, 'fire')).toEqual([]);
  });

  it('illness and crime no service covers: the physician and police post only once unlocked', () => {
    const { w, home } = street();
    expect(fallIll(w, home.id)).toBe(true);
    let [a] = ofKind(w, 'illness');
    expect([a.count, a.weight, a.data.cause, a.fix]).toEqual([1, ADVICE.ill, 'none', null]);   // the physician comes with Town
    w.milestone = 'town';
    [a] = ofKind(w, 'illness');
    expect(a.fix).toEqual({ item: 'physician', at: 'near', target: centre(home) });
    home.illness = null;
    expect(ofKind(w, 'illness')).toEqual([]);
    w.milestone = 'market_town';
    home.crime = 100000;
    [a] = ofKind(w, 'crime');
    expect([a.count, a.weight, a.fix.item]).toEqual([1, ADVICE.crime, 'police_post']);
    home.crime = 0;
    expect(ofKind(w, 'crime')).toEqual([]);
  });

  it('towers short of a raid: once the raid clock runs, more while one is warned; none with enough working towers or on Peaceful', () => {
    const { w } = street({ milestone: 'market_town' });
    expect(ofKind(w, 'raid_towers')).toEqual([]);                // the clock has not started
    w.raid.clockDay = 0;
    const need = towersNeeded(3);                                  // the first raid's size
    let [a] = ofKind(w, 'raid_towers');
    expect([a.count, a.weight, a.data.need, a.data.have, a.data.warned, a.fix.item, a.fix.target, a.cost]).toEqual([need, need * ADVICE.tower, need, 0, false, 'tower', { x: w.focus.x + 0.5, y: w.focus.y + 0.5 }, costOf(w, 'tower')]);
    w.raid.warning = { size: 9, tribute: null, first: true, entry: { x: 0, y: 10 }, dir: 'W', arrives: 100 };
    [a] = ofKind(w, 'raid_towers');
    // Version 6.0 (Wave 4, ruling 787): the tower is aimed at the band's first strike (firstRaidTarget: the building it goes for first), not at the entry on the map's edge ({ x: 0.5, y: 10.5 }).
    const first = firstRaidTarget(w, w.raid.warning.entry);
    expect(first === null).toBe(false);
    expect([a.count, a.weight, a.data.warned, a.fix.target]).toEqual([towersNeeded(9), towersNeeded(9) * ADVICE.tower * ADVICE.towerWarned, true, { x: first.x + first.w / 2, y: first.y + first.d / 2 }]);
    expect(a.fix.target).toEqual({ x: 10, y: 9 });
    for (let i = 0; i < towersNeeded(9); i++) addRaw(w, 'tower', 30 + i, 11, { staff: BUILDINGS.tower.workers });
    expect(ofKind(w, 'raid_towers')).toEqual([]);
    w.raid.warning = null;
    w.difficulty = 'peaceful';
    expect(ofKind(w, 'raid_towers')).toEqual([]);
  });

  it('ranks by weight, then ADVICE_KINDS, then id, then key; the same city always gives the same list and is left untouched', () => {
    const a = { key: 'b', kind: 'jobless', weight: 5, id: null }, b = { key: 'a', kind: 'fire', weight: 5, id: 9 }, c = { key: 'c', kind: 'fire', weight: 5, id: 3 };
    const d = { key: 'z', kind: 'home_need', weight: 6, id: 50 }, e = { key: 'y', kind: 'home_need', weight: 5, id: null }, f = { key: 'x', kind: 'home_need', weight: 5, id: null };
    expect([a, b, c, d, e, f].sort(compareAdvice).map((x) => x.key)).toEqual(['z', 'c', 'a', 'x', 'y', 'b']);
    const { w, well } = street();
    well.paused = true;
    const before = serialize(w);
    expect(JSON.stringify(cityAdvice(w))).toBe(JSON.stringify(cityAdvice(w)));
    expect(serialize(w)).toBe(before);
    expect(cityAdvice(createWorld({ seed: 4 }))).toEqual([]);   // a new city has nothing to say
  });

  it('a lived-in sample city: every item well formed and never refused, each home group matching its homes\' next step', () => {
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);
    advanceDays(w, 45);
    const list = cityAdvice(w);                                   // 10 items over 112 homes in about 6 ms (15 Oct 2026)
    expect(list.length).toBeGreaterThan(0);
    checkItems(w, list);
    for (const a of list.filter((x) => x.kind === 'home_need' || x.kind === 'stranded')) {
      for (const id of a.data.homes) {
        const s = nextStep(w, w.buildings[id]);
        expect([id, s.need, s.cause.code]).toEqual([id, a.data.need, a.data.cause.code]);
      }
    }
  });
});

describe('v50 contract advice: one table for causes and fixes', () => {
  it('the house sheet, the next step and the advice read the same fix table; the goods\' makers are the sim\'s, re-exported by text.js', () => {
    expect([text.makerOf, text.storeFor, text.goodMakers]).toEqual([makerOf, storeFor, goodMakers]);
    expect([makerOf('pottery'), storeFor('pottery'), goodMakers('pottery')]).toEqual(['potter', 'storehouse', ['clay_pit', 'potter']]);
    const w = makeTestWorld();
    expect(causeFix(w, { code: 'next_delivery', id: 1 })).toBe(null);
    expect(causeFix(w, { code: 'no_well', id: null })).toEqual({ item: 'well', at: 'home' });
    expect(causeFix(w, { code: 'well_idle', id: 3 })).toEqual({ view: true });
    expect(causeFix(w, { code: 'good_far', id: 3, good: 'pottery' })).toEqual({ select: true });
    expect(causeFix(w, { code: 'no_good', id: 3, good: 'pottery' })).toBe(null);           // the clay pit and potter come with Town
    expect(unmadeFix(w, { good: 'pottery' })).toBe(null);
    w.milestone = 'town';
    expect(causeFix(w, { code: 'no_good', id: 3, good: 'pottery' })).toEqual({ item: 'storehouse', at: 'building' });
    expect(unmadeFix(w, { good: 'pottery' })).toEqual({ item: 'clay_pit', at: 'terrain' });
    expect([priceOf(w, null), priceOf(w, { select: 1 }), priceOf(w, { item: 'road' }), priceOf(w, { item: 'well' })]).toEqual([null, null, roadCostOf(w), costOf(w, 'well')]);
  });
});
