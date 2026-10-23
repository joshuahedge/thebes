// Version 5.0 Task 3 (rulings 540-549): what the three new layers show, from the sim (src/sim/layers.js). Each is tested both ways: the world set up so a home or workplace is
// marked, then changed so it is not. Home progress reads houseStatus (the rows nextStep walks), Goods supply the same rows and what stores hold, Workers the labour record.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { layerUnlocked, supplyGoods, resolveSupplyGood, homeProgress, goodSupply, workersState, joblessBand } from '../../../src/sim/layers.js';
import { houseStatus } from '../../../src/sim/housing.js';
import { nextStep } from '../../../src/sim/advice.js';
import { setPaused, demolishAt } from '../../../src/sim/commands.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { assignLabour } from '../../../src/sim/labour.js';
import { removeBuilding, buildingsVersion } from '../../../src/sim/world.js';
import { MIN_STAFF_RATIO } from '../../../src/data/labour.js';
import { CRIME } from '../../../src/data/crime.js';
import { TIERS } from '../../../src/data/housing.js';
import { GOODS, HOUSEHOLD_GOODS } from '../../../src/data/goods.js';
import { JOBLESS_BANDS, SUPPLY_GOODS, LAYER_UNLOCK } from '../../../src/data/layers.js';
import { BUILDINGS } from '../../../src/data/buildings.js';

// The lists are kept until the buildings, roads or day change (a raw edit to a stock or a staff count, as these tests make, is a change the day's tick would bring).
const changed = (w) => { w.day += 1; return w; };
const unmet = (w, home) => houseStatus(w, home).checklist.filter((c) => !c.met).map((c) => c.need);

// A road along y = 10 and a tier-4 home at (12, 11) whose next tier asks for pottery; a well, a temple and a bazaar with grain (the home has its own too) serve it.
function street({ milestone = 'town', tier = 4 } = {}) {
  const w = makeTestWorld();
  w.milestone = milestone;
  setRoad(w, 0, 10, 31, 10);
  const home = addRaw(w, 'house', 12, 11, { tier, residents: TIERS[tier].capacity, stockedFor: TIERS[tier].capacity, stock: { grain: 30 } });
  const well = addRaw(w, 'well', 14, 9);
  const temple = addRaw(w, 'temple', 20, 8);
  const bazaar = addRaw(w, 'bazaar', 9, 8);
  bazaar.store.grain = 200;
  staffAll(w);
  return { w, home, well, temple, bazaar };
}
const givePottery = ({ w, home, bazaar }) => {
  bazaar.store.pottery = 300;
  home.stock.pottery = Math.ceil(TIERS[5].capacity * GOODS.pottery.perResidentPerMonth * 2);
  return changed(w);
};

describe('v50 layers: when each is offered', () => {
  it('Home progress comes with the first home, Goods supply and Workers at Town, as the data says', () => {
    expect(LAYER_UNLOCK).toEqual({ progress: { home: true }, supply: { milestone: 'town' }, workers: { milestone: 'town' } });
    const empty = makeTestWorld();
    expect(['progress', 'supply', 'workers'].map((k) => layerUnlocked(empty, k))).toEqual([false, false, false]);
    const { w } = street({ milestone: 'village' });
    expect(['progress', 'supply', 'workers'].map((k) => layerUnlocked(w, k))).toEqual([true, false, false]);   // a home stands: Home progress; not yet a Town
    w.milestone = 'town';
    expect(['progress', 'supply', 'workers'].map((k) => layerUnlocked(w, k))).toEqual([true, true, true]);
    w.milestone = 'capital';
    expect(['progress', 'supply', 'workers'].map((k) => layerUnlocked(w, k))).toEqual([true, true, true]);
    expect(layerUnlocked(w, 'water')).toBe(true);                                                          // every other layer was always offered
  });
  it('the supply picker offers a household good once its maker can be built, and foods always', () => {
    expect(SUPPLY_GOODS).toEqual(['pottery', 'beer', 'linen', 'jewellery', 'food']);
    const { w } = street({ milestone: 'village' });
    expect(supplyGoods(w)).toEqual(['food']);
    w.milestone = 'town';
    expect(supplyGoods(w)).toEqual(['pottery', 'food']);                // the potter and the clay pit come with Town
    w.milestone = 'city';
    expect(supplyGoods(w)).toEqual(['pottery', 'beer', 'food']);        // the brewery with City
    w.milestone = 'great_city';
    expect(supplyGoods(w)).toEqual(['pottery', 'beer', 'linen', 'food']);
    w.milestone = 'capital';
    expect(supplyGoods(w)).toEqual(SUPPLY_GOODS);
    expect(HOUSEHOLD_GOODS.every((g) => SUPPLY_GOODS.includes(g))).toBe(true);
  });
  it('the good shown is the one picked when it is offered, else the first offered', () => {
    const { w } = street({ milestone: 'town' });
    expect([resolveSupplyGood(w, 'food'), resolveSupplyGood(w, 'pottery'), resolveSupplyGood(w, null), resolveSupplyGood(w, 'jewellery')]).toEqual(['food', 'pottery', 'pottery', 'pottery']);
    w.milestone = 'village';
    expect([resolveSupplyGood(w, 'pottery'), resolveSupplyGood(w, null)]).toEqual(['food', 'food']);
  });
});

describe('v50 layers: home progress', () => {
  it('a home one need short is "one" and names that need, from houseStatus; with the need met it is "ready"', () => {
    const c = street();
    expect(unmet(c.w, c.home)).toEqual(['pottery']);
    let m = homeProgress(c.w).find((x) => x.id === c.home.id);
    expect([m.state, m.n, m.first, m.missing, m.tier]).toEqual(['one', 1, 'pottery', ['pottery'], 4]);
    expect([m.x, m.y]).toEqual([12.5, 11.5]);
    expect(nextStep(c.w, c.home).need).toBe('pottery');                  // the same need nextStep names first
    givePottery(c);
    expect(unmet(c.w, c.home)).toEqual([]);
    m = homeProgress(c.w).find((x) => x.id === c.home.id);
    expect([m.state, m.n, m.first, m.missing]).toEqual(['ready', 0, null, []]);
    expect(nextStep(c.w, c.home).reason).toBe('ready');
  });
  it('two or more missing is "many": the first is the one nextStep names, n counts them all', () => {
    const c = street();
    removeBuilding(c.w, c.well.id);
    removeBuilding(c.w, c.temple.id);
    expect(unmet(c.w, c.home)).toEqual(['water', 'religion', 'pottery']);
    const m = homeProgress(c.w).find((x) => x.id === c.home.id);
    expect([m.state, m.n, m.first, m.missing]).toEqual(['many', 3, 'water', ['water', 'religion', 'pottery']]);
    expect(nextStep(c.w, c.home).need).toBe(m.first);
    addRaw(c.w, 'well', 14, 9);                                          // one fewer missing: still two
    staffAll(c.w);
    const k = homeProgress(c.w).find((x) => x.id === c.home.id);
    expect([k.state, k.n, k.first]).toEqual(['many', 2, 'religion']);
  });
  it('an empty plot beside a road shows nothing; one with no road is one need short, the road', () => {
    const { w } = street();
    const plot = addRaw(w, 'house', 5, 11, { tier: 0 });
    const lone = addRaw(w, 'house', 25, 20, { tier: 0 });
    const list = homeProgress(w);
    expect(list.some((x) => x.id === plot.id)).toBe(false);
    const m = list.find((x) => x.id === lone.id);
    expect([m.state, m.first, m.missing]).toEqual(['one', 'road', ['road']]);
    setRoad(w, 25, 21, 25, 31);                                          // a road beside it now
    setRoad(w, 24, 21, 25, 21);
    expect(homeProgress(w).some((x) => x.id === lone.id)).toBe(false);
  });
  it('three kinds of food hides two, and a Townhouse has no square to count any more (the rows nextStep walks)', () => {
    const { w } = street({ tier: 5 });
    const home = Object.values(w.buildings).find((b) => b.type === 'house');
    const m = homeProgress(w).find((x) => x.id === home.id);
    expect(m.missing.includes('merge')).toBe(false);                     // Version 6.0: a small plot stops at Townhouse, so there is no 2x2 square to ask for
    expect(houseStatus(w, home).merge.needed).toBe(false);
    const lot = addRaw(w, 'house', 20, 11, { tier: 0, w: 2, d: 2, large: true });   // an empty Large plot is shown like a home, its Manor rows the needs
    const l = homeProgress(w).find((x) => x.id === lot.id);
    expect([l.tier, l.missing.includes('entertainment'), l.missing.includes('merge')]).toEqual([0, true, false]);
    const top = street({ tier: 9 });
    const villa = Object.values(top.w.buildings).find((b) => b.type === 'house');
    const t = homeProgress(top.w).find((x) => x.id === villa.id);
    expect(t.missing.includes('twoFoods')).toBe(false);                  // threeFoods includes it
    expect(t.missing.includes('threeFoods')).toBe(true);
  });
});

describe('v50 layers: goods supply', () => {
  it('a home that asks for pottery lacks it until it has it; a home that does not ask is left out', () => {
    const c = street();
    const low = addRaw(c.w, 'house', 5, 11, { tier: 2, residents: 8, stock: {} });
    let s = goodSupply(c.w, 'pottery');
    expect(s.good).toBe('pottery');
    expect(s.homes.map((h) => [h.id, h.has])).toEqual([[c.home.id, false]]);   // a Shack's next tier needs no pottery
    expect(s.homes.some((h) => h.id === low.id)).toBe(false);
    givePottery(c);
    s = goodSupply(c.w, 'pottery');
    expect(s.homes.map((h) => [h.id, h.has])).toEqual([[c.home.id, true]]);
  });
  it('a store or bazaar that holds some is listed with the amount; one with none is not; a store that cannot hold it never is', () => {
    const c = street();
    const store = addRaw(c.w, 'storehouse', 4, 11);
    addRaw(c.w, 'granary', 24, 11);
    expect(goodSupply(c.w, 'pottery').holders).toEqual([]);
    store.store.pottery = 40;
    c.bazaar.store.pottery = 12;
    changed(c.w);
    let h = goodSupply(c.w, 'pottery').holders;
    expect(h.map((x) => [x.id, x.amount])).toEqual([[c.bazaar.id, 12], [store.id, 40]].sort((a, b) => a[0] - b[0]));
    store.store.pottery = 0;
    changed(c.w);
    h = goodSupply(c.w, 'pottery').holders;
    expect(h.map((x) => x.id)).toEqual([c.bazaar.id]);
    const food = goodSupply(c.w, 'food').holders;                          // foods: the bazaar's grain; a granary holding none is not listed
    expect(food.map((x) => [x.id, x.amount])).toEqual([[c.bazaar.id, 200]]);
    expect(h.every((x) => x.b.type !== 'granary')).toBe(true);
  });
  it('foods sum every food and look at the food rows: a home with grain has it, one without lacks it', () => {
    const c = street();
    c.bazaar.store.figs = 50;
    changed(c.w);
    const f = goodSupply(c.w, 'food');
    expect(f.holders.find((x) => x.id === c.bazaar.id).amount).toBe(250);   // grain 200 and figs 50
    expect(f.homes.map((x) => [x.id, x.has])).toEqual([[c.home.id, true]]);
    c.home.stock = {};
    c.bazaar.store.grain = 0;
    c.bazaar.store.figs = 0;
    changed(c.w);
    expect(goodSupply(c.w, 'food').homes.map((x) => [x.id, x.has])).toEqual([[c.home.id, false]]);
    expect(goodSupply(c.w, 'food').holders).toEqual([]);
  });
});

describe('v50 layers: workers', () => {
  const farmStreet = () => {
    const w = makeTestWorld();
    w.milestone = 'capital';
    setRoad(w, 0, 10, 31, 10);
    const farm = addRaw(w, 'farm_grain', 2, 11);
    return { w, farm };
  };
  it('a workplace with fewer staff than workers is listed with how many it lacks; with all of them it is not', () => {
    const { w, farm } = farmStreet();
    farm.staff = 4;
    let s = workersState(w).shorts;
    expect(s.map((x) => [x.id, x.workers, x.staff, x.short, x.stopped])).toEqual([[farm.id, 10, 4, 6, false]]);
    expect([s[0].x, s[0].y]).toEqual([3, 12]);
    farm.staff = 10;
    changed(w);
    expect(workersState(w).shorts).toEqual([]);
  });
  it('below the staff a workplace needs to work at all it is "stopped" (the sim\'s MIN_STAFF_RATIO), and a workplace never opened has no staff at all', () => {
    const { w, farm } = farmStreet();
    farm.staff = Math.ceil(MIN_STAFF_RATIO * 10) - 1;
    expect(workersState(changed(w)).shorts[0].stopped).toBe(true);
    farm.staff = Math.ceil(MIN_STAFF_RATIO * 10);
    expect(workersState(changed(w)).shorts[0].stopped).toBe(false);
    delete farm.staff;
    changed(w);                                                      // placed and not yet staffed (the day's labour has not run)
    expect([workersState(w).shorts[0].staff, workersState(w).shorts[0].short, workersState(w).shorts[0].stopped]).toEqual([0, 10, true]);
  });
  it('a workplace placed or resumed mid-day shows its shortfall until the count on the next day, which hires it (what the Workers key says)', () => {
    const { w, farm } = farmStreet();
    addRaw(w, 'house', 12, 11, { tier: 4, residents: 100 });                  // people to work
    assignLabour(w);                                                          // the day's count: the farm is staffed
    changed(w);
    expect(workersState(w).shorts).toEqual([]);
    setPaused(w, farm.id, true);
    assignLabour(w);                                                          // the next count: paused, so it hires nobody
    changed(w);
    setPaused(w, farm.id, false);                                             // resumed mid-day
    expect(workersState(w).shorts.map((x) => [x.id, x.short])).toEqual([[farm.id, 10]]);
    const fresh = addRaw(w, 'farm_grain', 8, 11);                             // placed mid-day
    expect(workersState(w).shorts.map((x) => x.id).sort()).toEqual([farm.id, fresh.id].sort());
    assignLabour(w);                                                          // the next count hires them
    changed(w);
    expect(workersState(w).shorts).toEqual([]);
  });
  it('a paused workplace, one with no road beside it and one that needs no workers are not listed: the sim counts no jobs for them', () => {
    const { w, farm } = farmStreet();
    farm.staff = 0;
    expect(workersState(w).shorts.length).toBe(1);
    expect(setPaused(w, farm.id, true).ok).toBe(true);
    expect(workersState(w).shorts).toEqual([]);                             // paused: at once, without waiting for the day
    setPaused(w, farm.id, false);
    farm.staff = 0;
    changed(w);
    expect(workersState(w).shorts.length).toBe(1);
    const lone = addRaw(w, 'farm_grain', 2, 20);                            // no road beside it
    lone.staff = 0;
    changed(w);
    addRaw(w, 'well', 14, 11);                                              // a well needs no workers
    expect(workersState(w).shorts.map((x) => x.id)).toEqual([farm.id]);
  });
  it('the jobless are the labour record\'s (workforce less employed), shared out over the districts by where people live, the largest remainder first', () => {
    const w = makeTestWorld({ size: 32 });
    const T = CRIME.districtTiles;
    addRaw(w, 'house', 2, 2, { tier: 2, residents: 30 });                   // district 0,0
    addRaw(w, 'house', T + 2, 2, { tier: 2, residents: 10 });               // district 1,0
    addRaw(w, 'house', 2, T + 2, { tier: 2, residents: 10 });               // district 0,1
    addRaw(w, 'house', 20, 20, { tier: 0, residents: 0 });                  // a plot: nobody lives there
    w.labour = { workforce: 100, employed: 60, jobs: 60, shortLevels: [] };
    let d = workersState(w).districts;
    expect(d.map((x) => [x.cx, x.cy, x.residents, x.jobless])).toEqual([[0, 0, 30, 24], [1, 0, 10, 8], [0, 1, 10, 8]]);
    expect(workersState(w).jobless).toBe(40);
    expect([d[0].x0, d[0].y0, d[0].x1, d[0].y1]).toEqual([0, 0, T - 1, T - 1]);
    w.labour = { workforce: 100, employed: 93, jobs: 93, shortLevels: [] };
    d = workersState(changed(w)).districts;
    expect(d.map((x) => x.jobless)).toEqual([4, 2, 1]);                      // 4.2, 1.4, 1.4: the extra goes to the first of the equal fractions in cell order
    expect(d.reduce((s, x) => s + x.jobless, 0)).toBe(7);
    w.labour = { workforce: 100, employed: 100, jobs: 120, shortLevels: [] };  // more jobs than people: nobody is jobless
    changed(w);
    expect(workersState(w).districts).toEqual([]);
    expect(workersState(w).jobless).toBe(0);
  });
  it('a district is drawn in the band its jobless count reaches', () => {
    expect(JOBLESS_BANDS.map((b) => b.from)).toEqual([1, 5, 15]);
    expect([0, 1, 4, 5, 14, 15, 99].map(joblessBand)).toEqual([0, 0, 0, 1, 1, 2, 2]);
  });
});

describe('v50 layers: cached by the buildings, the roads and the day', () => {
  it('the same list comes back until a building is placed or removed, a road is laid, the day passes or a pause is set', () => {
    const c = street();
    const a = homeProgress(c.w);
    expect(homeProgress(c.w)).toBe(a);
    expect(goodSupply(c.w, 'pottery')).toBe(goodSupply(c.w, 'pottery'));
    expect(goodSupply(c.w, 'pottery') === goodSupply(c.w, 'food')).toBe(false);
    const w1 = workersState(c.w);
    expect(workersState(c.w)).toBe(w1);
    const v = buildingsVersion(c.w);
    addRaw(c.w, 'garden', 5, 5);
    expect(buildingsVersion(c.w)).toBe(v + 1);
    const b = homeProgress(c.w);
    expect(b === a).toBe(false);
    expect(homeProgress(c.w)).toBe(b);
    setRoad(c.w, 25, 10, 25, 20);
    const r = homeProgress(c.w);
    expect(r === b).toBe(false);
    c.w.day += 1;
    const d = homeProgress(c.w);
    expect(d === r).toBe(false);
    expect(homeProgress(c.w)).toBe(d);
    setPaused(c.w, c.well.id, true);
    expect(homeProgress(c.w) === d).toBe(false);                                  // a pause is a change a frame must see at once
    expect(unmet(c.w, c.home).includes('water')).toBe(true);
    expect(homeProgress(c.w).find((x) => x.id === c.home.id).missing.includes('water')).toBe(true);
  });
  it('a demolition and the day\'s labour change what the lists say, and an old city (no cache yet) works', () => {
    const c = street();
    c.w.labour = { workforce: 10, employed: 10, jobs: 10, shortLevels: [] };
    expect(workersState(c.w).districts).toEqual([]);
    const before = homeProgress(c.w).find((x) => x.id === c.home.id).state;
    expect(demolishAt(c.w, c.temple.x, c.temple.y).ok).toBe(true);
    const after = homeProgress(c.w).find((x) => x.id === c.home.id);
    expect([before, after.state, after.missing.includes('religion')]).toEqual(['one', 'many', true]);
    advanceDays(c.w, 1);
    expect(Array.isArray(homeProgress(c.w))).toBe(true);
    expect(BUILDINGS.farm_grain.workers).toBe(10);
  });
});
