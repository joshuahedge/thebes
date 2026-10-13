// The picture cards state rules; each is checked here against the sim, the world set up both ways (Global Constraints:
// words follow the sim). The share of people who work is the sim's own number in the words (cards4WorkShare).
import { describe, it, expect } from '../../harness.js';
import { CARDS4_TEXT, cards4WorkShare, cards4Ahead } from '../../../src/ui/text.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { place, canPlace, setSpeed } from '../../../src/sim/commands.js';
import { assignLabour, isWorking } from '../../../src/sim/labour.js';
import { vacancies } from '../../../src/sim/immigration.js';
import { monthlyHousing, needsOf } from '../../../src/sim/housing.js';
import { produceDay } from '../../../src/sim/production.js';
import { createGameLoop } from '../../../src/render/loop.js';
import { createWorld } from '../../../src/sim/world.js';
import { raidDay } from '../../../src/sim/raids.js';
import { raidsOn, threatsOn } from '../../../src/sim/costs.js';
import { healthStarted } from '../../../src/sim/health.js';
import { crimeStarted } from '../../../src/sim/crime.js';
import { RAIDS } from '../../../src/data/raids.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../../src/data/difficulty.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const W = CARDS4_TEXT.cards;

describe('s4 cards the rules on the cards', () => {
  it('card 1: homes and workplaces work only when they touch a road', () => {
    expect(W.road.words).toContain('work only when they touch a road');
    const w = makeTestWorld();                                         // fertile land at x < 8
    addRaw(w, 'house', 20, 20, { tier: 1, residents: 100 });            // people to work, on a road of their own
    setRoad(w, 19, 21, 22, 21);
    const plot = addRaw(w, 'house', 12, 6);
    const farm = addRaw(w, 'farm_grain', 2, 5);
    assignLabour(w);
    expect([vacancies(w).some((v) => v.h === plot), isWorking(w, farm)]).toEqual([false, false]);
    setRoad(w, 0, 7, 14, 7);                                            // a road along both
    assignLabour(w);
    expect([vacancies(w).some((v) => v.h === plot), isWorking(w, farm)]).toEqual([true, true]);
  });

  it('card 2: a well near the homes, then food, lets them grow', () => {
    expect(W.homes.words).toContain('A well near them, then food, lets them grow');
    expect([needsOf(2), needsOf(3)]).toEqual([['water'], ['water', 'food']]);   // a Shack wants water; a Cottage food as well
    const w = makeTestWorld();
    setRoad(w, 10, 10, 20, 10);
    const home = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    monthlyHousing(w);
    expect(home.tier).toBe(1);
    addRaw(w, 'well', 14, 11);
    monthlyHousing(w);
    expect(home.tier).toBe(2);
  });

  it('card 3: farms grow only on the fertile land by the river', () => {
    expect(W.farm.words).toContain('Farms grow only on the fertile land by the river');
    const w = makeTestWorld();
    setRoad(w, 0, 10, 20, 10);
    expect([canPlace(w, 'farm_grain', 2, 8).ok, canPlace(w, 'farm_grain', 12, 8).ok]).toEqual([true, false]);
  });

  it('card 4: a farm fills a granary; about four in ten people work; a building short of workers works slowly', () => {
    expect(W.food.words).toContain(`${cards4WorkShare()}, and a building short of workers works slowly`);
    expect([cards4WorkShare(0.4), cards4WorkShare(0.3)]).toEqual(['About four in ten people work', 'About three in ten people work']);
    expect(cards4WorkShare()).toBe(cards4WorkShare(ECONOMY.workerShare));
    const w = makeTestWorld();
    setRoad(w, 0, 10, 20, 10);
    addRaw(w, 'house', 16, 11, { tier: 1, residents: 100 });
    assignLabour(w);
    expect(w.labour.workforce).toBe(Math.round(ECONOMY.workerShare * 10) * 10);   // the words' share of 100 people
    const farm = place(w, 'farm_grain', 2, 8), granary = place(w, 'granary', 6, 11);
    assignLabour(w);
    for (let d = 0; d < 30; d++) produceDay(w);
    expect(w.buildings[granary.id].store.grain).toBeGreaterThan(0);             // the farm filled the granary
    const f = w.buildings[farm.id], store = w.buildings[granary.id].store;
    const made = (staff, days) => { f.staff = staff; const before = store.grain; for (let d = 0; d < days; d++) produceDay(w); return store.grain - before; };
    expect([made(10, 10), made(5, 10)]).toEqual([10, 5]);                       // half the workers, half the grain
  });

  it('the last card: pause any time, and nothing happens while you plan', () => {
    expect(W.ahead.words).toContain('Pause any time: nothing happens while you plan');
    const w = makeTestWorld();
    setRoad(w, 0, 10, 20, 10);
    const frames = [];
    const loop = createGameLoop({ world: w, render: () => {}, raf: (fn) => { frames.push(fn); return frames.length; }, caf: () => {} });
    const run = (n) => { for (let i = 1; i <= n; i++) loop.tick(i * 250); };
    setSpeed(w, 0);
    loop.start();
    run(40);                                                            // ten seconds paused
    const day = w.day;
    expect(place(w, 'well', 12, 11).ok).toBe(true);                      // building while paused
    run(40);
    expect(w.day).toBe(day);
    setSpeed(w, 1);
    run(40);
    expect(w.day).toBeGreaterThan(day);
    loop.stop();
  });

  it('the last card: fires, raiders, sickness and thieves to guard against, but only fires on Peaceful, whose city never starts a raid clock or has sickness or thieves', () => {
    expect(W.ahead.words).toBe(cards4Ahead(true));                              // the stored words are the level with raids
    expect(cards4Ahead(true)).toContain('Later come fires, raiders, sickness and thieves to guard against, and monuments to raise.');
    expect(cards4Ahead(false)).toContain('Later come fires to guard against, and monuments to raise.');
    expect(['raiders', 'sickness', 'thieves'].map((k) => cards4Ahead(false).includes(k))).toEqual([false, false, false]);
    for (const level of DIFFICULTY_ORDER) {
      const w = createWorld({ seed: 3, difficulty: level });
      w.tally.peakPeople = RAIDS.clockPeople;                                   // a city of the size that starts the clock
      raidDay(w);
      const clock = w.raid.clockDay !== null;
      expect([level, clock, raidsOn(w), DIFFICULTIES[level].raids]).toEqual([level, level !== 'peaceful', level !== 'peaceful', level !== 'peaceful']);
      expect([level, cards4Ahead(DIFFICULTIES[level].raids).includes('raiders')]).toEqual([level, clock]);   // the words promise raiders exactly where the sim sends them
      const words = cards4Ahead(DIFFICULTIES[level].raids);
      w.milestone = 'market_town';                                                // far enough on for both to begin where they can
      expect([level, words.includes('sickness'), words.includes('thieves')]).toEqual([level, healthStarted(w), crimeStarted(w)]);   // sickness and thieves exactly where the sim has them
      expect([level, threatsOn(w)]).toEqual([level, level !== 'peaceful']);
    }
  });
});
