// Version 5.0 Task 7 (rulings 580-599): grand homes you can reach, in the sim. Every rule here is tested both ways, from the sim's own functions:
//   - a low street's fix (desirabilityFix): the decoration and the tile, checked against a brute-force search that places each unlocked decoration on
//     every free tile and reads houseDesirability; placing it at the named tile gives exactly the score it promised; locked and boxed-in streets;
//   - where a chain is stuck (moreOf / unmadeFix): a store by a maker with nowhere to put its goods, a workshop by the store holding its input, more of
//     the input, and nothing stuck; a hunting lodge by the nearest herd;
//   - the goals: a third food (kinds of food the city makes), a Fine manor's and a Villa's street, their words and counts from TIERS and GOODS.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { desirabilityFix, nextStep, moreOf, unmadeFix, buildFixFor, cityAdvice } from '../../../src/sim/advice.js';
import { houseDesirability } from '../../../src/sim/desirability.js';
import { desirabilityTarget, needCause } from '../../../src/sim/housing.js';
import { checkTiles } from '../../../src/sim/commands.js';
import { costOf } from '../../../src/sim/costs.js';
import { isUnlocked } from '../../../src/sim/progression.js';
import { removeBuilding } from '../../../src/sim/world.js';
import { goalMet, goalProgress, goalById, nextItemFor, foodKinds, bestStreet } from '../../../src/sim/goals.js';
import { ADVICE } from '../../../src/data/advice.js';
import { DESIRABILITY } from '../../../src/data/desirability.js';
import { TIERS } from '../../../src/data/housing.js';
import { GOALS } from '../../../src/data/goals.js';
import { GOODS } from '../../../src/data/goods.js';
import { idx } from '../../../src/sim/grid.js';
import { grandDistrict } from '../../../src/dev/v50/grand.js';
import { showMeTarget } from '../../../src/ui/goalsList.js';

// The best tile for each unlocked decoration, found by placing it for real on every free tile in reach and reading the home's score.
function bruteForce(w, home) {
  const from = houseDesirability(w, home), out = [];
  for (const type of ADVICE.decor) {
    if (!isUnlocked(w, type)) continue;
    const r = DESIRABILITY[type].length;
    let best = null;
    for (let y = home.y - r; y < home.y + home.d + r; y++) {
      for (let x = home.x - r; x < home.x + home.w + r; x++) {
        if (checkTiles(w, type, x, y) !== null) continue;
        const b = addRaw(w, type, x, y);
        const gain = houseDesirability(w, home) - from;
        removeBuilding(w, b.id);
        if (gain > 0 && (!best || gain > best.gain)) best = { type, gain, cost: costOf(w, type) };
      }
    }
    if (best) out.push(best);
  }
  return out;
}
// The rule the fix is said to follow, applied to the brute force: the cheapest that closes the gap alone, else the one that lifts most (the cheaper on a tie).
function expectedPick(w, home) {
  const gap = desirabilityTarget(home.tier) - houseDesirability(w, home);
  const all = bruteForce(w, home);
  const closing = all.filter((o) => o.gain >= gap).sort((a, b) => a.cost - b.cost)[0];
  return closing || all.sort((a, b) => b.gain - a.gain || a.cost - b.cost)[0] || null;
}

describe('v50 grand sim: a low street names the decoration and its tile', () => {
  it('picks what the brute force picks, and placing it at its tile gives the score it promised, from a bare street up to a Villa', () => {
    const { world: w, home } = grandDistrict('street');
    const seen = new Set();
    for (let k = 0; k < 12; k++) {
      const fix = desirabilityFix(w, home);
      if (houseDesirability(w, home) >= desirabilityTarget(home.tier)) { expect(fix).toBe(null); break; }
      const want = expectedPick(w, home);
      expect([k, fix.item, fix.to - fix.from]).toEqual([k, want.type, want.gain]);
      expect([fix.needs, fix.from]).toEqual([TIERS[8].desirability.rise, houseDesirability(w, home)]);
      expect(checkTiles(w, fix.item, fix.spot.x, fix.spot.y)).toBe(null);
      expect([fix.target.x, fix.target.y]).toEqual([fix.spot.x + 0.5, fix.spot.y + 0.5]);
      addRaw(w, fix.item, fix.spot.x, fix.spot.y);
      expect(houseDesirability(w, home)).toBe(fix.to);                                // the promise kept
      seen.add(fix.item);
    }
    expect(houseDesirability(w, home)).toBeGreaterThanOrEqual(TIERS[8].desirability.rise);
    expect(seen.has('sphinx') && seen.size >= 2).toBe(true);                         // the dear one while the gap is wide, a cheaper one to close it
  });

  it('never names a decoration the city has not unlocked, nor one that would not help; with no tile that helps it falls back to the garden near the home', () => {
    for (const milestone of ['village', 'town', 'great_city']) {
      const { world: w, home } = grandDistrict('street');
      w.milestone = milestone;
      const fix = desirabilityFix(w, home);
      expect([milestone, isUnlocked(w, fix.item), fix.to > fix.from]).toEqual([milestone, true, true]);
      expect([milestone, fix.item]).toEqual([milestone, expectedPick(w, home).type]);
    }
    // Boxed in: every tile within a sphinx's reach is road, so no decoration can stand there.
    const { world: w, home } = grandDistrict('street');
    for (let y = home.y - 6; y < home.y + home.d + 6; y++) for (let x = home.x - 6; x < home.x + home.w + 6; x++) {
      if (x >= home.x && x < home.x + home.w && y >= home.y && y < home.y + home.d) continue;
      if (!w.occ[idx(w.size, x, y)]) w.road[idx(w.size, x, y)] = 1;
    }
    w.roadVersion++;
    expect(desirabilityFix(w, home)).toBe(null);
    const step = nextStep(w, home);
    expect([step.need, step.fix.item, step.fix.target]).toEqual(['desirability', 'garden', { x: home.x + 1, y: home.y + 1 }]);
  });

  it('is the next step, the advice item and the checklist row alike', () => {
    const { world: w, home } = grandDistrict('street');
    const step = nextStep(w, home);
    expect([step.reason, step.need, step.cause.code]).toEqual([null, 'desirability', 'low_desirability']);
    expect(step.fix).toEqual(desirabilityFix(w, home));
    expect(step.cost).toBe(costOf(w, step.fix.item));
    expect(buildFixFor(w, home, needCause(w, home, 'desirability'), 'desirability')).toEqual(step.fix);
    const item = cityAdvice(w).find((a) => a.kind === 'home_need' && a.data.need === 'desirability');
    expect([item.fix, item.cost]).toEqual([step.fix, step.cost]);
  });
});

// A brewery chain on a flat map: a road along y = 10, a storehouse and a bazaar on it; the brewery and the barley farm as each case lays them.
function chain() {
  const w = makeTestWorld({ size: 40, fertile: [[0, 0, 8, 40]] });
  w.milestone = 'capital';
  setRoad(w, 0, 10, 39, 10);
  const store = addRaw(w, 'storehouse', 10, 11);
  addRaw(w, 'bazaar', 14, 11);
  const farm = addRaw(w, 'farm_barley', 2, 11);
  const brewery = addRaw(w, 'brewery', 20, 11);
  staffAll(w);
  return { w, store, farm, brewery };
}

describe('v50 grand sim: where a chain is stuck', () => {
  it('names the step the chain lacks, from the sim\'s own blocks, both ways', () => {
    let c = chain();
    expect(moreOf(c.w, 'beer')).toEqual({ item: 'brewery', near: null });           // nothing stuck: another brewery
    c.brewery.blocked = 'no_storage';
    expect(moreOf(c.w, 'beer')).toEqual({ item: 'storehouse', near: c.brewery.id });   // its beer has nowhere to go: a store beside it
    c.brewery.blocked = 'storage_full';
    expect(moreOf(c.w, 'beer')).toEqual({ item: 'storehouse', near: c.brewery.id });
    c = chain();
    c.brewery.blocked = 'no_input';
    expect(moreOf(c.w, 'beer')).toEqual({ item: 'farm_barley', near: c.brewery.id });  // no barley anywhere: more barley
    c.store.store.barley = 50;
    expect(moreOf(c.w, 'beer')).toEqual({ item: 'brewery', near: c.store.id });        // barley lies unused: a brewery by it
    c.store.store.barley = 0;
    c.farm.blocked = 'no_storage';
    expect(moreOf(c.w, 'beer')).toEqual({ item: 'storehouse', near: c.farm.id });      // the farm has nowhere to put it: a store by the farm
  });

  it('puts a missing workshop by the store holding its input, and the words of the fix say so', () => {
    const c = chain();
    c.store.store.flax = 30;
    const far = addRaw(c.w, 'storehouse', 30, 11, { store: { flax: 80 } });
    expect(unmadeFix(c.w, { code: 'good_unmade', good: 'linen', id: null })).toEqual({ item: 'farm_flax', at: 'terrain' });   // flax's maker first
    addRaw(c.w, 'farm_flax', 2, 14);
    expect(unmadeFix(c.w, { code: 'good_unmade', good: 'linen', id: null })).toEqual({ item: 'weaver', at: 'building', near: far.id });   // the most flax
    far.store.flax = 0;
    expect(unmadeFix(c.w, { code: 'good_unmade', good: 'linen', id: null })).toEqual({ item: 'weaver', at: 'building', near: c.store.id });
    c.store.store.flax = 0;
    expect(unmadeFix(c.w, { code: 'good_unmade', good: 'linen', id: null })).toEqual({ item: 'weaver', at: 'building' });
  });

  it('sends the hunting lodge to the herd nearest the bazaar for a third food, and near the store with no herd about', () => {
    const { world: w, home } = grandDistrict('food');
    let step = nextStep(w, home);
    expect([step.need, step.cause.code, step.cause.good, step.fix.item, step.fix.herd]).toEqual(['threeFoods', 'good_unmade', 'game', 'hunting_lodge', true]);
    const herd = w.wildlife.herds[0];
    expect(step.fix.target).toEqual({ x: herd.x + 0.5, y: herd.y + 0.5 });
    w.wildlife.herds = [];
    step = nextStep(w, home);
    expect([step.fix.item, step.fix.herd]).toEqual(['hunting_lodge', undefined]);
  });
});

describe('v50 grand sim: goals lead to a Villa and an Estate, one want at a time', () => {
  it('lists the grand chapter in order: Fine manors, the weaver, a third food, the street, Villas; then jewellery, the Villa\'s street and an Estate', () => {
    const grand = GOALS.filter((g) => g.chapter === 'grand').map((g) => g.id);
    expect(grand).toEqual(['city', 'beer', 'fine_manors', 'great_city', 'linen', 'third_food', 'villa_street', 'villas', 'capital', 'jewellery', 'estate_street', 'estate']);
    expect(goalById('third_food').text).toBe(`Bring in a third food: ${GOODS.game.name.toLowerCase()} or ${GOODS.fish.name.toLowerCase()}`);
    expect(goalById('villa_street').text).toBe(`Raise a ${TIERS[7].name}'s desirability to ${TIERS[8].desirability.rise}`);
    expect(goalById('estate_street').text).toBe(`Raise a ${TIERS[8].name}'s desirability to ${TIERS[9].desirability.rise}`);
    for (const id of ['third_food', 'villa_street', 'estate_street']) expect(goalById(id).text.length).toBeLessThanOrEqual(40);
  });

  it('counts a third food only when the city makes three kinds, each by a maker on a road', () => {
    const c = chain();
    const third = goalById('third_food');
    addRaw(c.w, 'farm_grain', 2, 14);
    addRaw(c.w, 'farm_fig', 2, 17);
    setRoad(c.w, 0, 13, 7, 13);
    setRoad(c.w, 0, 16, 7, 16);
    expect([foodKinds(c.w), goalMet(c.w, third.need), goalProgress(c.w, third)]).toEqual([2, false, { n: 2, of: 3 }]);
    const lodge = addRaw(c.w, 'hunting_lodge', 30, 20);                               // off the road: it cannot work, so it does not count
    expect(goalMet(c.w, third.need)).toBe(false);
    setRoad(c.w, 29, 19, 33, 19);
    expect([foodKinds(c.w), goalMet(c.w, third.need), goalProgress(c.w, third)]).toEqual([3, true, { n: 3, of: 3 }]);
    removeBuilding(c.w, lodge.id);
    expect(goalMet(c.w, third.need)).toBe(false);
  });

  it('meets the street goal when a home a tier below scores the tier\'s rise, and not a point before; its Show me and card are the next step\'s', () => {
    const { world: w, home } = grandDistrict('street');
    const goal = goalById('villa_street');
    const rise = TIERS[8].desirability.rise;
    expect(bestStreet(w, 8)).toEqual({ home, value: houseDesirability(w, home) });
    expect([goalMet(w, goal.need), goalProgress(w, goal)]).toEqual([false, { n: houseDesirability(w, home), of: rise }]);
    const fix = desirabilityFix(w, home);
    expect([nextItemFor(w, goal), showMeTarget(w, goal)]).toEqual([fix.item, fix.target]);
    while (houseDesirability(w, home) < rise) {
      const f = desirabilityFix(w, home);
      expect(goalMet(w, goal.need)).toBe(false);
      addRaw(w, f.item, f.spot.x, f.spot.y);
    }
    expect([goalMet(w, goal.need), goalProgress(w, goal)]).toEqual([true, { n: rise, of: rise }]);
    home.tier = 6;                                                                    // a Manor scoring the same is two tiers below a Villa: not yet
    expect(goalMet(w, goal.need)).toBe(false);
    home.tier = 8;                                                                    // a Villa scoring an Estate's rise meets the Estate's street goal
    expect(goalMet(w, goalById('estate_street').need)).toBe(houseDesirability(w, home) >= TIERS[9].desirability.rise);
  });
});
