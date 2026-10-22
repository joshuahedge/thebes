// Version 6.0, Track A (rulings 652-658): the ranks beyond Capital and the great work. Great Capital and the Seat of the Two Lands need people and
// a grand home; the great temple comes with the Seat, one a city; its stages wait for their offerings of goods; finishing it wins the reign, seals
// the score once, and the city plays on.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { updateMilestone, isUnlocked, milestoneNeedsMet } from '../../../src/sim/progression.js';
import { monumentDay, greatWorkStatus, offeringOf, storedOf, isGreatWork } from '../../../src/sim/monuments.js';
import { demandDay, greatWorkOf, reignWon } from '../../../src/sim/demands.js';
import { canPlace } from '../../../src/sim/commands.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { DIFFICULTIES } from '../../../src/data/difficulty.js';

const M = (id) => MILESTONES.find((m) => m.id === id);
function capital(people) {
  const w = makeTestWorld({ size: 40, gold: 50000 });
  w.milestone = 'capital';
  w.tally.peakPeople = people;
  return w;
}

describe('v60 a ranks beyond Capital', () => {
  it('makes a Capital a Great Capital only with the people and a Villa standing, and the Seat only with more people and an Estate', () => {
    const w = capital(M('great_capital').population);
    expect([updateMilestone(w), w.milestone]).toEqual([false, 'capital']);          // the people, no Villa
    const villa = addRaw(w, 'house', 4, 4, { w: 2, d: 2, tier: 8, residents: 150 });
    expect(milestoneNeedsMet(w, M('great_capital'))).toBe(true);
    expect([updateMilestone(w), w.milestone]).toEqual([true, 'great_capital']);
    expect(Number.isInteger(w.splits.great_capital)).toBe(true);
    w.tally.peakPeople = M('seat').population;
    expect([updateMilestone(w), w.milestone]).toEqual([false, 'great_capital']);    // the people, no Estate
    villa.tier = 9;
    expect([updateMilestone(w), w.milestone]).toEqual([true, 'seat']);
    expect(w.newItems).toContain(GREAT_WORK.type);
    const few = capital(M('great_capital').population - 1);
    addRaw(few, 'house', 4, 4, { w: 2, d: 2, tier: 9, residents: 180 });
    expect([updateMilestone(few), few.milestone]).toEqual([false, 'capital']);     // a grand home, too few people
  });

  it('unlocks the great temple at the Seat and locks it again once one stands (one a city)', () => {
    const w = capital(0);
    expect(isUnlocked(w, GREAT_WORK.type)).toBe(false);
    w.milestone = 'seat';
    expect(isUnlocked(w, GREAT_WORK.type)).toBe(true);
    setRoad(w, 0, 20, 39, 20);
    expect(canPlace(w, GREAT_WORK.type, 10, 15).ok).toBe(true);
    addRaw(w, GREAT_WORK.type, 2, 2);
    expect(isUnlocked(w, GREAT_WORK.type)).toBe(false);
    expect(canPlace(w, GREAT_WORK.type, 10, 15).reason).toBe('locked');
  });
});

// The Seat with the great temple founded by the road, four staffed guilds by it and stone and bricks on its site; a storehouse and a granary.
function seat({ goods = {}, food = {} } = {}) {
  const w = makeTestWorld({ size: 40, gold: 50000 });
  w.milestone = 'seat';
  setRoad(w, 0, 20, 39, 20);
  const gw = addRaw(w, GREAT_WORK.type, 10, 15);
  for (let i = 0; i < 4; i++) addRaw(w, 'builders_guild', 2 + i * 2, 21);
  addRaw(w, 'storehouse', 20, 21, { store: { ...goods } });
  addRaw(w, 'granary', 23, 21, { store: { ...food } });
  staffAll(w);
  gw.site.stock = { stone: 150, bricks: 20 };
  return { w, gw };
}
const days = (w, n, events = null) => { for (let i = 0; i < n; i++) { monumentDay(w, events); demandDay(w, events); w.day += 1; } };

describe('v60 a the great work', () => {
  it('waits at a stage\'s first course for its offering while the stores hold less, and lays it once they hold it (the goods leave)', () => {
    const first = offeringOf(makeTestWorld(), 0);
    expect(first).toEqual({ good: GREAT_WORK.offerings[0].good, n: GREAT_WORK.offerings[0].n });
    const { w, gw } = seat({ food: { [first.good]: first.n - 1 } });
    days(w, 4);
    expect([gw.site.course, gw.site.laid.stone, gw.site.reason]).toEqual([0, 0, 'waiting_offering']);
    expect(greatWorkStatus(w, gw)).toEqual({ stage: 0, stages: 5, offered: 0, offering: { ...first, have: first.n - 1 }, waiting: true });
    Object.values(w.buildings).find((b) => b.type === 'granary').store[first.good] = first.n + 10;
    const events = [];
    days(w, 1, events);
    expect(events.filter((e) => e.type === 'offering_made').map((e) => [e.stage, e.good, e.n])).toEqual([[0, first.good, first.n]]);
    expect([storedOf(w, first.good), w.reign.greatWork, w.reign.offered]).toEqual([10, gw.id, 1]);
    expect(gw.site.laid.stone).toBeGreaterThan(0);
    expect(gw.site.reason).toBe(null);
  });

  it('asks each stage\'s offering times the difficulty\'s cost, and stops the crews again at the next stage\'s first course', () => {
    for (const d of ['relaxed', 'normal', 'hard']) {
      const w = makeTestWorld();
      w.difficulty = d;
      expect([d, offeringOf(w, 2).n]).toEqual([d, Math.round(GREAT_WORK.offerings[2].n * DIFFICULTIES[d].cost)]);
    }
    const { w, gw } = seat();
    gw.site.course = GREAT_WORK.perStage - 1;                                        // the last course of stage 1, its offering made
    w.reign.greatWork = gw.id;
    w.reign.offered = 1;
    gw.site.laid = { stone: MONUMENTS.great_temple.courses[1].stone - 1, bricks: MONUMENTS.great_temple.courses[1].bricks };
    days(w, 3);
    expect([gw.site.course, gw.site.reason, w.tally.greatWorkStages]).toEqual([GREAT_WORK.perStage, 'waiting_offering', 1]);
    expect(greatWorkStatus(w, gw).offering.good).toBe(GREAT_WORK.offerings[1].good);
  });

  it('wins the reign the day it is finished: the day, the sealed score with won, the event; once only, and the city plays on', () => {
    const { w, gw } = seat();
    expect([greatWorkOf(w), reignWon(w)]).toEqual([null, false]);
    days(w, 1);
    expect(greatWorkOf(w).id).toBe(gw.id);                                           // noted the day it stands
    gw.site.course = MONUMENTS.great_temple.courses.length;
    gw.site.done = w.day;
    const events = [];
    days(w, 1, events);
    expect(reignWon(w)).toBe(true);
    expect(w.reign.won).toBe(gw.site.done);
    expect(w.reign.seal.won).toBe(true);
    expect(w.seals.length).toBe(1);
    expect(events.filter((e) => e.type === 'reign_won').length).toBe(1);
    days(w, 30, events);
    expect([w.seals.length, events.filter((e) => e.type === 'reign_won').length]).toEqual([1, 1]);
    expect(isGreatWork(gw) && greatWorkStatus(w, gw).stage).toBe(5);
  });
});
