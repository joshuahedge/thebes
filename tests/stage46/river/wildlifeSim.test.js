// The River track's wildlife tests (rulings 335, 363-366): the herds, the hunting lodge, the lodge's game, the Court's two herd hooks, the
// crocodile scare, and game and fish as foods.
import { describe, it, expect } from '../../harness.js';
import { WILDLIFE, HUNTING, HERD_KINDS } from '../../../src/data/river.js';
import { GOODS, FOOD_GOODS, FOOD_SLOTS } from '../../../src/data/goods.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import {
  wildlifeDay, wildlifeMonth, huntHerd, herdsInReach, huntingOutlook, takeGame, crocSpots, crocsNear, herdArrives, herdLeaves, startHerds, maxHerds,
  wildlifeOn, scareOf,
} from '../../../src/sim/wildlife.js';
import { produceDay } from '../../../src/sim/production.js';
import { population, allBuildings } from '../../../src/sim/world.js';
import { monthlyHousing, wantedGoods, needCause } from '../../../src/sim/housing.js';
import { bazaarsByHouse, topUpHouse, monthlyNeed } from '../../../src/sim/distribution.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { makeTestWorld, setRoad } from '../../helpers/testWorld.js';
import { riverWorld, addRaw, addGranary, stepRiver, dayOf, MONTH, YEAR } from './riverHelpers.js';

const herd = (w, o = {}) => {
  const h = { id: w.wildlife.nextId++, kind: 'gazelle', x: 32, y: 20, size: 6, max: 6, regrow: null, hx: 32, hy: 20, px: 32, py: 20, moved: 0, hunted: 0, dir: 1, ...o };
  w.wildlife.herds.push(h);
  return h;
};
// A lodge on the road (32, 11), staffed, with a granary beside it.
function lodgeWorld() {
  const w = riverWorld();
  w.wildlife.seeded = true;                           // no herds but the ones a test puts
  const lodge = addRaw(w, 'hunting_lodge', 32, 11);
  lodge.staff = 3;
  const granary = addGranary(w, 28, 11);
  return { w, lodge, granary };
}
const monthOfGame = (w) => { const g = allBuildings(w).find((b) => b.type === 'granary'); const was = g.store.game || 0; for (let i = 0; i < MONTH; i++) produceDay(w); return (g.store.game || 0) - was; };

describe('s46 river wildlife: the herds (ruling 335, 364)', () => {
  it('places the first herds from the Town on, none before, their number scaled by the map\'s area', () => {
    const v = riverWorld({ milestone: 'village' });
    stepRiver(v, 5);
    expect([v.wildlife.herds.length, v.wildlife.seeded, wildlifeOn(v)]).toEqual([0, false, false]);
    const counts = {};
    for (const size of [48, 64, 80]) {
      const w = riverWorld({ size });
      stepRiver(w, 1);
      counts[size] = w.wildlife.herds.length;
      expect([size, w.wildlife.herds.length, w.wildlife.seeded]).toEqual([size, startHerds(w), true]);
    }
    expect(counts[48]).toBeLessThan(counts[64]);
    expect(counts[64]).toBeLessThan(counts[80]);
    expect(startHerds(riverWorld({ size: 64 }))).toBe(WILDLIFE.startHerds);
  });
  it('puts them on their ground, 4 to 8 strong, away from buildings and from each other', () => {
    const w = riverWorld({ size: 80, seed: 3 });
    addRaw(w, 'granary', 40, 11);
    stepRiver(w, 1);
    expect(w.wildlife.herds.length).toBeGreaterThan(3);
    for (const h of w.wildlife.herds) {
      const t = w.terrain[idx(w.size, h.x, h.y)];
      const ok = HERD_KINDS[h.kind].ground.some((g) => (g === 'desert' ? t === T.DESERT : t === T.ROCKY));
      expect([h.id, ok, h.size >= HERD_KINDS[h.kind].min && h.size <= HERD_KINDS[h.kind].max, h.size === h.max]).toEqual([h.id, true, true, true]);
      // placed WILDLIFE.awayFrom tiles from buildings and WILDLIFE.apart from each other; the day's step may have moved each by a tile
      for (const b of allBuildings(w)) expect(Math.hypot(b.x + b.w / 2 - h.x, b.y + b.d / 2 - h.y)).toBeGreaterThan(WILDLIFE.awayFrom - 1.5);
      for (const o of w.wildlife.herds) if (o !== h) expect(Math.hypot(o.x - h.x, o.y - h.y)).toBeGreaterThan(WILDLIFE.apart - 2.9);
    }
    expect(w.wildlife.herds.filter((h) => h.kind === 'ostrich').every((h) => w.terrain[idx(w.size, h.x, h.y)] === T.DESERT)).toBe(true);   // ostriches live on the desert
  });
  it('is the same city and the same herds for the same seed, and other herds for another', () => {
    const a = riverWorld({ seed: 5 }), b = riverWorld({ seed: 5 }), c = riverWorld({ seed: 6 });
    for (const w of [a, b, c]) { stepRiver(w, 200); }
    expect(a.wildlife).toEqual(b.wildlife);
    expect(JSON.stringify(a.wildlife.herds) === JSON.stringify(c.wildlife.herds)).toBe(false);
  });
  it('wanders within its home range, only over its own ground, and moves off when a building comes near', () => {
    const w = riverWorld({ seed: 2 });
    w.wildlife.seeded = true;
    const h = herd(w, { x: 36, y: 25, hx: 36, hy: 25 });
    for (let i = 0; i < 300; i++) {
      stepRiver(w, 1);
      expect(Math.hypot(h.x - h.hx, h.y - h.hy)).toBeLessThan(WILDLIFE.homeRange + 1.5);
      const t = w.terrain[idx(w.size, h.x, h.y)];
      expect(t === T.DESERT || t === T.ROCKY).toBe(true);
    }
    const b = addRaw(w, 'granary', h.x + 1, h.y);                                           // a building beside it
    const dist = () => Math.hypot(b.x + 1 - h.x, b.y + 1 - h.y);
    const before = dist();
    stepRiver(w, WILDLIFE.moveEvery * 6);
    expect(dist()).toBeGreaterThan(before);
    expect(dist()).toBeGreaterThan(WILDLIFE.awayFrom - 0.5);
  });
  it('walks a tile every few days and records where it came from, so the render can walk it between', () => {
    const w = riverWorld();
    w.wildlife.seeded = true;
    const h = herd(w);
    stepRiver(w, WILDLIFE.moveEvery * 2);
    expect(h.moved).toBeGreaterThan(0);
    expect(Math.abs(h.x - h.px) <= 1 && Math.abs(h.y - h.py) <= 1).toBe(true);
  });
});

describe('s46 river wildlife: hunting (ruling 335, 364)', () => {
  it('brings up to 6 game a month from one herd in reach, taking each from the herd, and waits when none is left this month', () => {
    const { w, lodge, granary } = lodgeWorld();
    const h = herd(w, { size: 8, max: 8 });
    expect(herdsInReach(w, lodge).map((x) => x.id)).toEqual([h.id]);
    expect(Math.round(monthOfGame(w))).toBe(HUNTING.perHerdMonth);
    expect([h.size, w.tally.hunted, w.tally.made.game]).toEqual([2, 6, 6]);
    expect([granary.store.game, lodge.blocked]).toEqual([6, 'no_game']);                    // the herd's month is spent
    expect(lodge.progress).toBeLessThan(1.0001);                                            // and no more than one unit is banked
  });
  it('takes 6 a herd and no more than 24 in all', () => {
    const { w, lodge } = lodgeWorld();
    for (let i = 0; i < 2; i++) herd(w, { x: 32 + i * 3, y: 20, size: 8, max: 8 });
    expect(huntingOutlook(w, lodge).month).toBe(12);
    expect(Math.round(monthOfGame(w))).toBe(12);
    for (let i = 0; i < 6; i++) herd(w, { x: 24 + i * 3, y: 17, size: 8, max: 8 });
    w.wildlife.herds.forEach((x) => { x.hunted = 0; });
    lodge.hunted = 0;
    expect(huntingOutlook(w, lodge).month).toBe(HUNTING.maxMonth);
    expect(Math.round(monthOfGame(w))).toBe(HUNTING.maxMonth);
  });
  it('reaches herds within 12 tiles of the lodge and not beyond', () => {
    const { w, lodge } = lodgeWorld();
    const far = herd(w, { x: 32, y: 11 + 2 + 13, hx: 32, hy: 26 });                         // 13+ tiles from the lodge's middle
    const near = herd(w, { x: 32, y: 11 + 1 + 10, hx: 32, hy: 22 });
    expect(herdsInReach(w, lodge).map((x) => x.id)).toEqual([near.id]);
    expect(huntHerd(w, lodge)).toBe(near);
    w.wildlife.herds = [far];
    expect([huntHerd(w, lodge), huntingOutlook(w, lodge).herds]).toEqual([null, 0]);
    expect(monthOfGame(w)).toBe(0);
    expect(lodge.blocked).toBe('no_game');
  });
  it('does not hunt with the lodge unstaffed or paused', () => {
    const { w, lodge } = lodgeWorld();
    herd(w);
    lodge.staff = 0;
    expect(monthOfGame(w)).toBe(0);
    lodge.staff = 3; lodge.paused = true;
    expect(monthOfGame(w)).toBe(0);
  });
  it('shrinks a herd by 1 a hunt, regrows 1 every 2 months to its size, and is gone at 0', () => {
    const w = riverWorld();
    w.wildlife.seeded = true;
    w.day = dayOf(2, 1);
    const h = herd(w, { size: 5, max: 8, moved: w.day });
    takeGame(w, h);
    takeGame(w, h);
    expect([h.size, h.hunted, h.regrow, w.tally.hunted]).toEqual([3, 2, w.day + 2 * MONTH, 2]);
    stepRiver(w, 2 * MONTH);
    expect([h.size, h.hunted]).toEqual([4, 0]);
    const sizes = [];
    for (let m = 0; m < 5; m++) { stepRiver(w, MONTH); sizes.push(h.size); }
    expect(sizes).toEqual([4, 5, 5, 6, 6]);                                                  // one more every second month
    stepRiver(w, MONTH * 20);
    expect([h.size, h.regrow]).toEqual([8, null]);                                           // never past its size
    const one = herd(w, { size: 1, max: 1 });
    takeGame(w, one);
    expect(w.wildlife.herds.includes(one)).toBe(false);
  });
});

describe('s46 river wildlife: the Court\'s lost herd (herdArrives, herdLeaves)', () => {
  it('lets a herd wander in from a map edge, pushing the event, and refuses when the map holds its most', () => {
    const w = riverWorld({ seed: 4 });
    w.wildlife.seeded = true;
    const events = [];
    const got = herdArrives(w, events);
    expect(got).toBeTruthy();
    const edge = (v) => v <= 3 || v >= w.size - 4;
    expect([edge(got.x) || edge(got.y), got.size >= 4 && got.size <= 8, w.wildlife.herds.length]).toEqual([true, true, 1]);
    expect(events).toEqual([{ type: 'herd_arrived', id: got.id, kind: got.kind, size: got.size }]);
    expect(herdArrives(w)).toBeTruthy();                                                    // no events array given: still works
    while (w.wildlife.herds.length < maxHerds(w)) herd(w);
    expect(herdArrives(w, events)).toBe(null);
  });
  it('sends off the herd nearest the city and says so; null with no herd', () => {
    const w = riverWorld();
    w.wildlife.seeded = true;
    expect(herdLeaves(w, [])).toBe(null);
    const far = herd(w, { x: 3, y: 3 }), near = herd(w, { x: w.focus.x + 2, y: w.focus.y + 2 });
    const events = [];
    const gone = herdLeaves(w, events);
    expect([gone.id, w.wildlife.herds.map((h) => h.id), events[0].type]).toEqual([near.id, [far.id], 'herd_left']);
    expect(herdLeaves(w)).toBeTruthy();
    expect(herdLeaves(w)).toBe(null);
  });
  it('is probed on a copy by the court without a trace, and the real call changes the city once', () => {
    const w = riverWorld();
    w.wildlife.seeded = true;
    herd(w);
    const copy = structuredClone(w);
    expect(herdArrives(copy, [])).toBeTruthy();
    expect(w.wildlife.herds.length).toBe(1);
    herdArrives(w, []);
    expect(w.wildlife.herds.length).toBe(2);
  });
  it('lets one herd wander in by itself each year, up to the map\'s most', () => {
    const w = riverWorld({ seed: 9 });
    stepRiver(w, 1);
    const start = w.wildlife.herds.length;
    stepRiver(w, YEAR * 3);
    expect(w.wildlife.arrived).toBe(4);
    expect(w.wildlife.herds.length).toBeGreaterThanOrEqual(start);
    expect(w.wildlife.herds.length).toBeLessThanOrEqual(maxHerds(w));
  });
});

describe('s46 river wildlife: the crocodile scare (ruling 335, 366)', () => {
  // A staffed potter on the loam within 2 tiles of a crocodile spot, off the road.
  const lodgeNearCroc = (w) => {
    const free = (x, y) => [[0, 0], [1, 0], [0, 1], [1, 1]].every(([i, j]) => w.terrain[idx(w.size, x + i, y + j)] !== T.WATER && !w.occ[idx(w.size, x + i, y + j)] && !w.road[idx(w.size, x + i, y + j)]);
    for (const spot of crocSpots(w)) {
      if (spot[1] < 14 || spot[1] > 40) continue;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const x = spot[0] + dx, y = spot[1] + dy;
        if (x < 14 || x > 26 || y < 13 || y > 42 || !free(x, y) || !crocsNear(w, { x, y, w: 2, d: 2 }).length) continue;
        const b = addRaw(w, 'potter', x, y);
        b.staff = BUILDINGS.potter.workers;
        return b;
      }
    }
    return null;
  };
  it('has crocodile spots on the water\'s edge from the seed and the terrain, apart, and the same every time', () => {
    const w = riverWorld({ seed: 4 });
    const a = crocSpots(w), b = crocSpots(riverWorld({ seed: 4 }));
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(a).toEqual(b);
    for (const [x, y] of a) {
      expect(w.terrain[idx(w.size, x, y)]).toBe(T.WATER);
      expect([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => w.terrain[idx(w.size, x + dx, y + dy)] !== T.WATER)).toBe(true);
    }
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) expect(Math.hypot(a[i][0] - a[j][0], a[i][1] - a[j][1])).toBeGreaterThan(WILDLIFE.crocApart - 1e-9);
    expect(JSON.stringify(crocSpots(riverWorld({ seed: 5 }))) === JSON.stringify(a)).toBe(false);
  });
  it('pauses a workplace within 2 tiles of a spot for one day, at most once a month, with an event, and hurts no one', () => {
    const w = riverWorld({ seed: 4 });
    w.wildlife.seeded = true;
    const b = lodgeNearCroc(w);
    expect(b).toBeTruthy();
    const people = population(w);
    const events = [];
    const days = [];
    let pausedDays = 0;
    for (let d = 0; d < YEAR * 2; d++) {
      const before = events.length;
      stepRiver(w, 1, events);
      if (b.paused) pausedDays += 1;
      if (events.slice(before).some((e) => e.type === 'croc_scare')) days.push(w.day);
    }
    const scares = events.filter((e) => e.type === 'croc_scare');
    expect(scares.length).toBeGreaterThan(2);
    expect(scares.length).toBeLessThanOrEqual(24);
    expect(new Set(days.map((d) => Math.floor(d / MONTH))).size).toBe(days.length);          // never twice in a month
    expect([pausedDays, scares.map((e) => e.id).join()]).toEqual([scares.length * WILDLIFE.scareDays, scares.map(() => b.id).join()]);                             // one day each, then back to work
    expect(b.paused).toBe(false);
    expect([scares[0].id, scares[0].kind, scares[0].days]).toEqual([b.id, 'potter', WILDLIFE.scareDays]);
    expect(w.tally.crocScares).toBe(scares.length);
    expect(population(w)).toBe(people);
    expect(w.wildlife.scares).toEqual([]);
  });
  it('lets the scare go at the day\'s end and never touches a pause the player made', () => {
    const w = riverWorld({ seed: 4 });
    w.wildlife.seeded = true;
    const b = lodgeNearCroc(w);
    b.paused = true;                                                                          // the player's own pause
    stepRiver(w, YEAR);
    expect([b.paused, w.tally.crocScares]).toEqual([true, 0]);                                // an unworking building is not scared, nor unpaused
  });
  it('is off on Peaceful and does not scare a building with no workers', () => {
    const w = riverWorld({ seed: 4, difficulty: 'peaceful' });
    w.wildlife.seeded = true;
    const b = lodgeNearCroc(w);
    stepRiver(w, YEAR * 3);
    expect([w.tally.crocScares, b.paused, scareOf(w, b)]).toEqual([0, false, null]);
    const n = riverWorld({ seed: 4 });
    n.wildlife.seeded = true;
    const spot = crocSpots(n)[0];
    const house = addRaw(n, 'house', spot[0] + 2, spot[1], { tier: 1, residents: 5 });
    stepRiver(n, YEAR * 3);
    expect([n.tally.crocScares, house.paused]).toEqual([0, false]);
  });
});

describe('s46 river wildlife: game and fish are foods (ruling 363)', () => {
  const street = () => { const w = makeTestWorld(); setRoad(w, 0, 10, 31, 10); return w; };
  const staff = (w) => { for (const b of allBuildings(w)) b.staff = BUILDINGS[b.type].workers; };
  it('adds game and fish to the goods as foods, in the order foods are named', () => {
    expect([GOODS.game.kind, GOODS.fish.kind, GOODS.game.perResidentPerMonth, GOODS.fish.perResidentPerMonth]).toEqual(['food', 'food', 0.25, 0.25]);
    expect(FOOD_GOODS).toEqual(FOOD_SLOTS);
    expect(FOOD_SLOTS).toEqual(['grain', 'figs', 'game', 'fish']);
    expect(BUILDINGS.granary.stores).toEqual(FOOD_SLOTS);
    expect(BUILDINGS.bazaar.sells.slice(0, 4)).toEqual(FOOD_SLOTS);
    for (const g of FOOD_SLOTS) expect([g, BUILDINGS.bazaar.stock[g] > 0]).toEqual([g, true]);
  });
  it('lets a home meet two kinds of food with any two (game and fish count)', () => {
    const w = street();
    addRaw(w, 'bazaar', 9, 8, { store: { game: 200, fish: 200 } });
    const h = addRaw(w, 'house', 14, 11, { tier: 6, residents: 100, w: 2, d: 2, stock: { game: 25 } });
    staff(w);
    monthlyHousing(w);
    expect([h.met.food, h.met.twoFoods]).toEqual([true, false]);                              // game alone is food, not two kinds
    h.downTimer = 0;
    expect(h.stock.game).toBeGreaterThan(0);
    expect(h.stock.fish).toBeGreaterThan(0);                                                  // restocked half and half
    monthlyHousing(w);
    expect([h.met.food, h.met.twoFoods]).toEqual([true, true]);
  });
  it('counts grain with game as two kinds of food, as grain with figs always did', () => {
    const w = street();
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 200, game: 200 } });
    const h = addRaw(w, 'house', 14, 11, { tier: 6, residents: 100, w: 2, d: 2, stock: { grain: 13, game: 12 } });
    staff(w);
    monthlyHousing(w);
    expect(h.met.twoFoods).toBe(true);
  });
  it('tops a two-food home up from the bazaar\'s first two foods and names the missing food in the house sheet\'s cause', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 100, game: 100, fish: 100 } });
    const h = addRaw(w, 'house', 14, 11, { tier: 6, residents: 100, w: 2, d: 2 });
    staff(w);
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id), { twoFoods: true });
    expect(monthlyNeed(h, 'game')).toBe(25);
    expect([h.stock.grain, h.stock.game, h.stock.fish || 0]).toEqual([13, 12, 0]);            // grain and the next food on offer
    const lone = addRaw(w, 'house', 17, 11, { tier: 6, residents: 100, w: 2, d: 2, stock: { grain: 25 } });
    expect(needCause(w, lone, 'twoFoods')).toEqual({ code: 'next_delivery', id: bz.id, good: 'game' });   // the bazaar holds game and fish: the first it will bring
    bz.store.figs = 50;
    expect(needCause(w, lone, 'twoFoods').good).toBe('figs');                                 // the first food it lacks that the bazaar holds
  });
});


describe('s46 river wildlife: a record from before the track filled it in', () => {
  it('plays on with the fields it lacks (a wave 1 build saved herds and nextId only)', () => {
    const w = riverWorld({ seed: 2 });
    w.wildlife = { herds: [], nextId: 1 };
    stepRiver(w, MONTH * 3);
    expect([w.wildlife.seeded, Array.isArray(w.wildlife.scares), w.wildlife.herds.length > 0]).toEqual([true, true, true]);
    const old = riverWorld({ seed: 2 });
    old.wildlife = { herds: [{ id: 1, kind: 'gazelle', x: 34, y: 20, size: 5 }], nextId: 2 };
    stepRiver(old, YEAR + MONTH);
    expect(old.wildlife.herds.length).toBeGreaterThan(0);
    expect(old.wildlife.seeded).toBe(true);                                                  // it has herds: they are not seeded over
    expect(old.wildlife.arrived).toBeGreaterThanOrEqual(1);                                  // and one wandered in by itself in year 1 (the count was missing: it starts at 0)
  });
});
