import { describe, it, expect } from '../harness.js';
import { GOALS, GOAL_REWARD } from '../../src/data/goals.js';
import { goalMet, goalProgress, nextItemFor, openGoals, checkGoals, goalById } from '../../src/sim/goals.js';
import { createWorld, HISTORY_MONTHS } from '../../src/sim/world.js';
import { advanceDays, tickDay } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

describe('goals', () => {
  it('lists the opening chain in order and shows three at a time', () => {
    expect(GOALS.slice(0, 10).map((g) => g.id)).toEqual(['road', 'plots', 'well', 'food', 'temple', 'profit', 'homes_cottage', 'people100', 'homes_house', 'town']);   // Stage 2's follow
    for (const g of GOALS) { expect(g.text.length).toBeGreaterThan(0); expect(g.reward).toBe(GOAL_REWARD); expect(typeof g.showMe.category).toBe('string'); }
    const w = createWorld({ seed: 2 });
    expect(openGoals(w).map((g) => g.id)).toEqual(['road', 'plots', 'well']);
    expect(openGoals(w, 1).map((g) => g.id)).toEqual(['road']);
    expect(goalById('temple').need).toEqual({ kind: 'building', type: 'temple', n: 1 });
    expect(goalById('nope')).toBe(null);
  });
  it('completes one goal per check, in order, paying the reward and reporting an event', () => {
    const w = createWorld({ seed: 2 });
    const { x, y } = w.focus;
    const events = [];
    expect(checkGoals(w, events)).toBe(null);
    expect(drawRoad(w, x - 4, y, x + 4, y).ok).toBe(true);
    expect(paintHouses(w, x - 3, y + 1, x + 3, y + 1).ids.length).toBe(7);
    const gold = w.gold;
    expect(checkGoals(w, events).id).toBe('road');          // plots are met too, but one goal per day
    expect(w.gold).toBe(gold + GOAL_REWARD);
    expect(events).toEqual([{ type: 'goal', id: 'road', reward: GOAL_REWARD }]);
    expect(checkGoals(w, events).id).toBe('plots');
    expect(checkGoals(w, events)).toBe(null);
    expect(w.goals.completed).toEqual(['road', 'plots']);
    expect(openGoals(w).map((g) => g.id)).toEqual(['well', 'food', 'temple']);
  });
  it('only counts road the player laid, and evaluates the compound and people needs', () => {
    const w = makeTestWorld({ gold: 5000 });
    expect(goalMet(w, { kind: 'road' })).toBe(false);
    setRoad(w, 0, 10, 31, 10);
    expect(goalMet(w, { kind: 'road' })).toBe(true);
    addRaw(w, 'farm_grain', 2, 11); addRaw(w, 'granary', 6, 11);
    expect(goalMet(w, goalById('food').need)).toBe(false);
    addRaw(w, 'bazaar', 9, 11);
    expect(goalMet(w, goalById('food').need)).toBe(true);
    for (let i = 0; i < 20; i++) addRaw(w, 'house', i, 9, { tier: 1, residents: 5 });
    expect(goalMet(w, { kind: 'people', n: 100 })).toBe(true);
    expect(goalMet(w, { kind: 'people', n: 150 })).toBe(false);
    expect(goalMet(w, { kind: 'nope' })).toBe(false);
  });
  it('counts only buildings a road touches for "Build a ..." goals (ruling P11)', () => {
    const w = makeTestWorld({ gold: 5000 });
    const well = goalById('well');
    expect(place(w, 'well', 20, 21, { roadLater: true }).ok).toBe(true);
    expect(goalMet(w, well.need)).toBe(false);
    expect(goalProgress(w, well)).toEqual({ n: 0, of: 1 });
    addRaw(w, 'farm_grain', 2, 20); addRaw(w, 'granary', 5, 11); addRaw(w, 'bazaar', 9, 11);
    setRoad(w, 0, 10, 31, 10);
    expect(goalMet(w, goalById('food').need)).toBe(false);       // the farm at y 20 is off the road
    expect(goalProgress(w, goalById('food'))).toEqual({ n: 2, of: 3 });
    expect(nextItemFor(w, goalById('food'))).toBe('farm_grain');
    setRoad(w, 0, 22, 21, 22);                                    // a road along the farm and the well
    expect(goalMet(w, well.need)).toBe(true);
    expect(goalProgress(w, well)).toEqual({ n: 1, of: 1 });
    expect(goalMet(w, goalById('food').need)).toBe(true);
    addRaw(w, 'garden', 28, 28);                                  // a garden needs no road, so it counts on its own
    expect(goalMet(w, { kind: 'building', type: 'garden', n: 1 })).toBe(true);
  });
  it('is checked daily by the clock, which also records a month row and a month event', () => {
    const w = createWorld({ seed: 2 });
    const { x, y } = w.focus;
    drawRoad(w, x - 4, y, x + 4, y);
    const events = [];
    tickDay(w, events);
    expect(w.goals.completed).toEqual(['road']);
    expect(events.some((e) => e.type === 'goal')).toBe(true);
    events.length = 0;
    advanceDays(w, 29, events);
    expect(w.day).toBe(30);
    expect(events.filter((e) => e.type === 'month').length).toBe(1);
    expect(w.history.length).toBe(1);
    expect(w.history[0]).toEqual({ day: 30, people: w.history[0].people, gold: w.history[0].gold, mood: w.history[0].mood, score: w.history[0].score, parts: w.history[0].parts, version: 2 });
    expect(Object.keys(w.history[0]).sort()).toEqual(['day', 'gold', 'mood', 'parts', 'people', 'score', 'version']);   // the score and its parts from Stage 3 (spec 4.19), its version from Stage 4
    advanceDays(w, 30 * (HISTORY_MONTHS + 2));
    expect(w.history.length).toBe(HISTORY_MONTHS);
    expect(w.history[HISTORY_MONTHS - 1].day).toBe(w.day);
  });
  it('keeps the sim deterministic with goals in it', () => {
    const run = () => { const w = createWorld({ seed: 9 }); const { x, y } = w.focus; drawRoad(w, x - 4, y, x + 4, y); paintHouses(w, x - 3, y + 1, x + 3, y + 1); place(w, 'well', x, y - 1); advanceDays(w, 120); return w; };
    expect(run()).toEqual(run());
  });
});
