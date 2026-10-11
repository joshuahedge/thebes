import { describe, it, expect } from '../harness.js';
import { GOALS, EVENT_GOALS, GUIDE_GOALS, GOAL_REWARD, EVENT_REWARD, GUIDE_REWARD } from '../../src/data/goals.js';
import { CATEGORIES } from '../../src/data/ui.js';
import {
  goalById, goalMet, goalProgress, triggerEventGoals, openGoals, checkGoals, settleGoals, nextItemFor, guideActive, guideGoal,
} from '../../src/sim/goals.js';
import { settle } from '../../src/sim/settle.js';
import { setGuide, drawRoad, demolishAt } from '../../src/sim/commands.js';
import { tickDay } from '../../src/sim/clock.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

const ids = (goals) => goals.map((g) => g.id);

// Everything the five guide goals ask for, on a road along y = 10 (the buildings only need to exist).
function readyCity() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  for (let x = 10; x < 16; x++) addRaw(w, 'house', x, 11);
  addRaw(w, 'well', 17, 11);
  addRaw(w, 'farm_grain', 2, 8);
  addRaw(w, 'granary', 5, 8);
  addRaw(w, 'bazaar', 9, 8);
  addRaw(w, 'temple', 12, 8);
  return w;
}

describe('goals v2', () => {
  it('lists the chain in chapters, the guide goals and the event goals', () => {
    expect(ids(GOALS.slice(0, 9))).toEqual(['road', 'plots', 'well', 'food', 'temple', 'homes_cottage', 'people100', 'homes_house', 'town']);
    expect(GOALS.slice(0, 9).map((g) => g.chapter)).toEqual(['first_homes', 'first_homes', 'first_homes', 'feed', 'feed', 'grow', 'grow', 'grow', 'grow']);
    expect(goalById('homes_cottage').need).toEqual({ kind: 'tier', tier: 3, n: 8 });
    expect(goalById('homes_cottage').text).toBe('Grow 8 homes to Cottage or better');
    expect(goalById('homes_house').need).toEqual({ kind: 'tier', tier: 4, n: 8 });
    expect(goalById('homes_house').text).toBe('Grow 8 homes to House or better');
    expect(GUIDE_GOALS).toEqual(['road', 'plots', 'well', 'food', 'temple']);
    expect([GOAL_REWARD, EVENT_REWARD, GUIDE_REWARD]).toEqual([25, 10, 50]);
    expect(EVENT_GOALS.map((g) => [g.id, g.trigger, g.need])).toEqual([
      ['fix_bazaar', 'bazaar_empty', { kind: 'noAlert', code: 'bazaar_empty' }],
      ['more_workers', 'labour_shortage', { kind: 'noAlert', code: 'labour_shortage' }],
      ['more_jobs', 'unemployment', { kind: 'noAlert', code: 'unemployment' }],
      ['out_of_debt', 'debt', { kind: 'gold', n: 0 }],
    ]);
    for (const g of EVENT_GOALS) {
      expect([g.id, g.chapter, g.reward, g.text.length > 0, goalById(g.id) === g]).toEqual([g.id, 'event', EVENT_REWARD, true, true]);
    }
    expect(goalById('fix_bazaar').showMe).toEqual({ category: 'food', item: 'granary', target: 'alert', code: 'bazaar_empty' });
    expect(goalById('out_of_debt').showMe).toBe(null);
    for (const g of [...GOALS, ...EVENT_GOALS]) {
      if (!g.showMe) continue;
      expect([g.id, CATEGORIES.find((c) => c.id === g.showMe.category).items.includes(g.showMe.item)]).toEqual([g.id, true]);
    }
    const all = ids([...GOALS, ...EVENT_GOALS]);
    expect(new Set(all).size).toBe(all.length);
    expect(goalById('nope')).toBe(null);
  });
  it('counts only road laid beyond the start road, as an exact set difference', () => {
    const w = makeTestWorld();
    setRoad(w, 31, 31, 31, 25);                                   // a 7-tile start road
    w.startRoad = [[31, 31], [31, 30], [31, 29], [31, 28], [31, 27], [31, 26], [31, 25]];
    expect(goalMet(w, { kind: 'road' })).toBe(false);
    expect(demolishAt(w, 31, 28).ok).toBe(true);                  // taking up a start-road tile lays nothing
    expect(goalMet(w, { kind: 'road' })).toBe(false);
    expect(drawRoad(w, 31, 28, 31, 28).ok).toBe(true);            // putting it back is still the start road
    expect(goalMet(w, { kind: 'road' })).toBe(false);
    expect(demolishAt(w, 31, 28).ok).toBe(true);
    expect(drawRoad(w, 30, 25, 30, 25).ok).toBe(true);            // one new tile: 7 tiles in all, as many as the start road
    expect(goalMet(w, { kind: 'road' })).toBe(true);
  });
  it('grows homes to a tier, counting better tiers too', () => {
    const w = makeTestWorld();
    for (let x = 0; x < 7; x++) addRaw(w, 'house', x, 5, { tier: 3, residents: 12 });
    addRaw(w, 'house', 7, 5, { tier: 2, residents: 8 });
    expect(goalMet(w, goalById('homes_cottage').need)).toBe(false);
    expect(goalProgress(w, goalById('homes_cottage'))).toEqual({ n: 7, of: 8 });
    addRaw(w, 'house', 8, 5, { tier: 4, residents: 16 });        // a House is better than a Cottage
    expect(goalMet(w, goalById('homes_cottage').need)).toBe(true);
    expect(goalMet(w, goalById('homes_house').need)).toBe(false);
    expect(goalProgress(w, goalById('homes_house'))).toEqual({ n: 1, of: 8 });
    for (let x = 9; x < 12; x++) addRaw(w, 'house', x, 5, { tier: 3, residents: 12 });
    expect(goalProgress(w, goalById('homes_cottage'))).toEqual({ n: 8, of: 8 });   // 11 homes, clamped to the target
  });
  it('reports progress for counting goals and null for the others', () => {
    const w = makeTestWorld();
    expect(goalProgress(w, goalById('plots'))).toEqual({ n: 0, of: 6 });
    addRaw(w, 'house', 1, 1); addRaw(w, 'house', 2, 1);
    expect(goalProgress(w, goalById('plots'))).toEqual({ n: 2, of: 6 });
    expect(goalProgress(w, goalById('well'))).toEqual({ n: 0, of: 1 });
    addRaw(w, 'well', 5, 5); addRaw(w, 'well', 7, 5);
    expect(goalProgress(w, goalById('well'))).toEqual({ n: 1, of: 1 });
    addRaw(w, 'farm_grain', 0, 10); addRaw(w, 'bazaar', 10, 10);
    expect(goalProgress(w, goalById('food'))).toEqual({ n: 2, of: 3 });
    addRaw(w, 'house', 3, 1, { tier: 4, residents: 16 });
    expect(goalProgress(w, goalById('people100'))).toEqual({ n: 16, of: 100 });
    for (let x = 0; x < 10; x++) addRaw(w, 'house', x, 20, { tier: 4, residents: 16 });
    expect(goalProgress(w, goalById('people100'))).toEqual({ n: 100, of: 100 });   // 176 people, clamped
    expect(goalProgress(w, goalById('plots'))).toEqual({ n: 6, of: 6 });          // 13 homes, clamped
    for (const id of ['road', 'fix_bazaar', 'more_workers', 'more_jobs', 'out_of_debt']) expect([id, goalProgress(w, goalById(id))]).toEqual([id, null]);
  });
  it('turns a first empty bazaar into a goal that completes once the bazaar has grain, once per city', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const bz = addRaw(w, 'bazaar', 9, 11);
    staffAll(w);
    expect(alertsFor(w).map((a) => a.code)).toEqual(['bazaar_empty']);
    expect(ids(openGoals(w))).toEqual(['road', 'plots', 'well']);
    expect(triggerEventGoals(w)).toEqual(['fix_bazaar']);
    expect(w.goals.triggered).toEqual(['fix_bazaar']);
    expect(ids(openGoals(w))).toEqual(['fix_bazaar', 'road', 'plots']);
    const events = [];
    expect(checkGoals(w, events).id).toBe('road');               // still empty: the next met goal completes instead
    bz.store.grain = 50;
    const gold = w.gold;
    expect(checkGoals(w, events).id).toBe('fix_bazaar');
    expect(w.gold).toBe(gold + EVENT_REWARD);
    expect(events).toEqual([{ type: 'goal', id: 'road', reward: GOAL_REWARD }, { type: 'goal', id: 'fix_bazaar', reward: EVENT_REWARD }]);
    bz.store.grain = 0;                                           // empty again: the goal does not come back
    expect(triggerEventGoals(w)).toEqual([]);
    expect(w.goals.triggered).toEqual(['fix_bazaar']);
    expect(ids(openGoals(w))).toEqual(['plots', 'well', 'food']);
  });
  it('puts triggered event goals first, in their listed order', () => {
    const w = makeTestWorld({ gold: -10 });
    expect(triggerEventGoals(w)).toEqual(['out_of_debt']);
    w.labour = { workforce: 10, employed: 10, jobs: 22, shortLevels: ['services'] };
    expect(triggerEventGoals(w)).toEqual(['more_workers']);
    w.milestone = 'town';
    w.labour = { workforce: 100, employed: 10, jobs: 10, shortLevels: [] };
    expect(triggerEventGoals(w)).toEqual(['more_jobs']);
    expect(w.goals.triggered).toEqual(['out_of_debt', 'more_workers', 'more_jobs']);
    expect(ids(openGoals(w))).toEqual(['more_workers', 'more_jobs', 'out_of_debt']);
    expect(ids(openGoals(w, 5))).toEqual(['more_workers', 'more_jobs', 'out_of_debt', 'road', 'plots']);
    w.goals.completed.push('more_workers', 'road');
    expect(ids(openGoals(w, 4))).toEqual(['more_jobs', 'out_of_debt', 'plots', 'well']);
  });
  it('triggers and completes an event goal through the daily tick', () => {
    const w = makeTestWorld({ gold: -100 });
    setRoad(w, 0, 10, 31, 10);
    const events = [];
    tickDay(w, events);
    expect(w.goals.triggered).toEqual(['out_of_debt']);
    expect(events).toEqual([{ type: 'goal', id: 'road', reward: GOAL_REWARD }]);   // still in debt: the road goal completes
    expect(w.gold).toBe(-75);
    w.gold = 5;
    events.length = 0;
    tickDay(w, events);
    expect(events).toEqual([{ type: 'goal', id: 'out_of_debt', reward: EVENT_REWARD }]);
    expect(w.gold).toBe(15);
    expect(ids(openGoals(w))).toEqual(['plots', 'well', 'food']);
  });
  it('settles several goals at once and finishes the guide once, paying its reward', () => {
    const w = readyCity();
    const gold = w.gold;
    const events = [];
    expect(ids(settleGoals(w, events))).toEqual(['road', 'plots', 'well', 'food', 'temple']);
    expect(w.goals.completed).toEqual(['road', 'plots', 'well', 'food', 'temple']);
    expect(events.map((e) => e.type + ':' + (e.id || ''))).toEqual(['goal:road', 'goal:plots', 'goal:well', 'goal:food', 'goal:temple', 'guide_done:']);
    expect(events[5]).toEqual({ type: 'guide_done', reward: GUIDE_REWARD });
    expect(w.guide).toEqual({ on: true, done: true });
    expect(w.gold).toBe(gold + 5 * GOAL_REWARD + GUIDE_REWARD);
    events.length = 0;
    expect(settleGoals(w, events)).toEqual([]);
    expect(checkGoals(w, events)).toBe(null);
    expect(events).toEqual([]);
    expect(w.gold).toBe(gold + 5 * GOAL_REWARD + GUIDE_REWARD);
  });
  it('pays goal rewards but no guide reward when the guide is off', () => {
    const w = readyCity();
    const gold = w.gold;
    expect(setGuide(w, false)).toEqual({ ok: true, warnings: [] });
    const events = [];
    settleGoals(w, events);
    expect(w.goals.completed.length).toBe(5);
    expect(events.some((e) => e.type === 'guide_done')).toBe(false);
    expect(w.guide).toEqual({ on: false, done: false });
    expect(w.gold).toBe(gold + 5 * GOAL_REWARD);
  });
  it('names the next card a goal needs', () => {
    const w = makeTestWorld();
    const food = goalById('food');
    expect(nextItemFor(w, food)).toBe('farm_grain');
    addRaw(w, 'granary', 5, 8);
    expect(nextItemFor(w, food)).toBe('farm_grain');              // the first missing part, whatever was built first
    addRaw(w, 'farm_grain', 2, 8);
    expect(nextItemFor(w, food)).toBe('bazaar');
    addRaw(w, 'bazaar', 9, 8);
    expect(nextItemFor(w, food)).toBe('farm_grain');              // nothing missing: its Show me card
    expect(nextItemFor(w, goalById('well'))).toBe('well');
    expect(nextItemFor(w, goalById('plots'))).toBe('house');
    expect(nextItemFor(w, goalById('out_of_debt'))).toBe(null);
    expect(nextItemFor(w, null)).toBe(null);
  });
  it('knows whether the guide runs and which goal it is on', () => {
    const w = makeTestWorld();
    expect(guideActive(w)).toBe(true);
    expect(guideGoal(w).id).toBe('road');
    setRoad(w, 0, 10, 31, 10);
    settleGoals(w);
    expect(guideGoal(w).id).toBe('plots');
    addRaw(w, 'bazaar', 9, 11);
    staffAll(w);
    triggerEventGoals(w);
    expect(openGoals(w, 1)[0].id).toBe('fix_bazaar');
    expect(guideGoal(w).id).toBe('plots');                        // event goals are not guide steps
    setGuide(w, 0);
    expect(w.guide.on).toBe(false);
    expect(guideActive(w)).toBe(false);
    expect(guideGoal(w).id).toBe('plots');                        // still known while off, for Resume guide
    setGuide(w, 'yes');
    expect(w.guide.on).toBe(true);
    expect(guideActive(w)).toBe(true);
    w.goals.completed.push('plots', 'well', 'food', 'temple');
    expect(guideActive(w)).toBe(false);
    expect(guideGoal(w)).toBe(null);
    w.goals.completed = ['road'];
    w.guide = { on: true, done: true };                           // a finished guide never runs again
    expect(guideActive(w)).toBe(false);
  });
  it('settles through settle and hands back the events array', () => {
    const w = readyCity();
    const events = [];
    expect(settle(w, events)).toBe(events);
    expect(events.filter((e) => e.type === 'goal').length).toBe(5);
    expect(events.filter((e) => e.type === 'guide_done').length).toBe(1);
    const quiet = readyCity();
    expect(settle(quiet)).toBe(null);
    expect(quiet.goals.completed.length).toBe(5);
    expect(quiet.guide.done).toBe(true);
  });
});
