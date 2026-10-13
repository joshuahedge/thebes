// Stage 4.6, the Armies track's tests. tests/stage46/all.js imports this one file for the track; the track's other test files are
// imported from here, and every describe is named 's46 armies ...', so tests/run-tests.ps1 -Grep "s46 armies" runs the track alone.
import { describe, it, expect } from '../../harness.js';
import './combat.test.js';
import './raids.test.js';
import './words.test.js';
import './art.test.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { DESIRABILITY } from '../../../src/data/desirability.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { TIPS } from '../../../src/data/tips.js';
import { UNITS, DEFENCE } from '../../../src/data/raids.js';
import { UNIT_TYPES, UNIT_KINDS, ENEMY_TYPES, ARMY_BUILDINGS, ARMY_UNLOCKS, MATCHUPS, newArmyState, isArmyState } from '../../../src/data/armies.js';
import { unitsAtHome, unitsAway, sendUnits, armyDay, unitHp, feedHorses, armyMonth, armyAlerts, horseGrainOf, feedTypes, grainHeld } from '../../../src/sim/armies.js';
import { soldiersPayOf } from '../../../src/sim/costs.js';
import { monthFigures } from '../../../src/sim/economy.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';

const unitAt = (w, kind, b, extra = {}) => {
  const u = { id: w.nextUnitId++, kind, barracks: b.id, x: b.x + b.w / 2, y: b.y + b.d / 2, hp: UNIT_TYPES[kind].hp, hit: false, task: 'wait', ...extra };
  w.soldiers.push(u);
  return u;
};

describe('s46 armies data', () => {
  it('prices the archery range and the stables as the plan says, in Defence, with Market town (ruling 387)', () => {
    expect(['w', 'd', 'cost', 'upkeep', 'workers', 'category'].map((k) => BUILDINGS.archery_range[k])).toEqual([2, 2, 180, 10, 6, 'defence']);
    expect(['w', 'd', 'cost', 'upkeep', 'workers', 'category'].map((k) => BUILDINGS.stables[k])).toEqual([2, 3, 300, 14, 6, 'defence']);
    expect(ARMY_UNLOCKS).toEqual({ market_town: ['archery_range', 'stables'] });
    for (const t of ['archery_range', 'stables']) {
      expect(MILESTONES.filter((m) => m.unlocks.includes(t)).map((m) => m.id)).toEqual(['market_town']);
      expect(CATEGORIES.find((c) => c.id === 'defence').items).toContain(t);
      expect(DESIRABILITY[t]).toEqual(ARMY_BUILDINGS[t].desirability);
    }
    expect(DESIRABILITY.stables).toEqual([-6, -4, -2]);
  });
  it('keeps the soldier\'s numbers Stage 3\'s, gives each kind one building, and lists the plan\'s matchups', () => {
    expect([UNIT_TYPES.soldier.hp, UNIT_TYPES.soldier.damage, UNIT_TYPES.soldier.patrol, UNIT_TYPES.soldier.perBuilding, UNIT_TYPES.soldier.pay])
      .toEqual([UNITS.soldier.hp, UNITS.soldier.damage, DEFENCE.patrol, DEFENCE.soldiersPerBarracks, DEFENCE.soldierPay]);
    expect(UNIT_KINDS.map((k) => UNIT_TYPES[k].building)).toEqual(['barracks', 'archery_range', 'stables']);
    expect([ENEMY_TYPES.archer.fromRaid, ENEMY_TYPES.boat.fromRaid, ENEMY_TYPES.chariot.fromRaid]).toEqual([3, 5, 6]);
    expect(MATCHUPS.archer.foot).toEqual({ wall: 2, melee: 0.5 });
    expect(MATCHUPS.chariot.archer).toEqual({ open: 2, nearWall: 0.5 });
    expect(Object.values(MATCHUPS.soldier).every((c) => c.gate === 1.5)).toBe(true);
  });
  it('adds a first and a tip for each building, and one for the first mixed raid', () => {
    expect(['first_archery_range', 'first_stables'].every((id) => FIRSTS.some((f) => f.id === id))).toBe(true);
    expect(['archeryRangePlaced', 'stablesPlaced', 'mixedRaidWarned'].every((t) => TIPS.some((x) => x.trigger === t))).toBe(true);
  });
  it('checks the army record: away units of a known kind, fed a boolean', () => {
    expect(newArmyState()).toEqual({ away: [], fed: true });
    expect([isArmyState({ away: [] }), isArmyState({ away: [], fed: false }), isArmyState({ away: [], fed: 1 }), isArmyState({ away: [{ kind: 'archer', back: 3 }] })]).toEqual([true, true, false, true]);
  });
});

describe('s46 armies the soldiers request interface (Court codes against it)', () => {
  it('sends soldiers first, then archers, then chariots, newest first, unpaid while away, back at each kind\'s hit points', () => {
    const w = makeTestWorld({ size: 32 });
    const bar = addRaw(w, 'barracks', 2, 2), range = addRaw(w, 'archery_range', 6, 2), stab = addRaw(w, 'stables', 10, 2);
    unitAt(w, 'soldier', bar, { hp: 3, hit: true });
    const a1 = unitAt(w, 'archer', range, { hp: 2, hit: true }), a2 = unitAt(w, 'archer', range);
    unitAt(w, 'chariot', stab);
    expect(unitsAtHome(w)).toEqual({ soldier: 1, archer: 2, chariot: 1 });
    expect(soldiersPayOf(w)).toBe(UNIT_TYPES.soldier.pay + 2 * UNIT_TYPES.archer.pay + UNIT_TYPES.chariot.pay);
    const events = [];
    expect(sendUnits(w, 2, 180, events)).toEqual({ ok: true, reason: null, sent: { soldier: 1, archer: 1 } });
    expect(w.soldiers.map((u) => u.id)).toEqual([a1.id, w.soldiers[1].id]);           // the newer archer went
    expect(w.army.away.map((u) => u.id)).toContain(a2.id);
    expect(w.tally.unitsSent).toBe(2);
    expect(soldiersPayOf(w)).toBe(UNIT_TYPES.archer.pay + UNIT_TYPES.chariot.pay);    // away: unpaid
    expect(monthFigures(w).soldiers).toBe(soldiersPayOf(w));
    expect(unitsAway(w)).toEqual([{ kind: 'soldier', n: 1, back: w.day + 180 }, { kind: 'archer', n: 1, back: w.day + 180 }]);
    expect(sendUnits(w, 3, 180)).toEqual({ ok: false, reason: 'not_enough', sent: {} });
    w.day += 180;
    armyDay(w, events);
    const back = w.soldiers.filter((u) => [a2.id].includes(u.id) || u.kind === 'soldier');
    expect(back.map((u) => [u.kind, u.hp, u.hit, u.task])).toEqual([['soldier', unitHp('soldier'), false, 'wait'], ['archer', unitHp('archer'), false, 'wait']]);
    expect(unitHp('chariot')).toBe(UNIT_TYPES.chariot.hp);
    expect(events.map((e) => e.type)).toEqual(['units_sent', 'units_back']);
  });
  it('lets a unit leave service when its building is gone or is another kind\'s now', () => {
    const w = makeTestWorld({ size: 32 });
    const range = addRaw(w, 'archery_range', 6, 2);
    unitAt(w, 'archer', range);
    sendUnits(w, 1, 10);
    delete w.buildings[range.id];
    w.day += 10;
    armyDay(w);
    expect([w.soldiers.length, w.army.away.length]).toEqual([0, 0]);
  });
  it('sends the units unitsAtHome counts: one walking back after a raid goes, none while a raid is under way', () => {
    const w = makeTestWorld({ size: 32 });
    const bar = addRaw(w, 'barracks', 2, 2);
    unitAt(w, 'soldier', bar, { task: 'back', x: 9, y: 9 });
    unitAt(w, 'soldier', bar);
    expect(unitsAtHome(w).soldier).toBe(2);
    w.raid.active = { phase: 'attack', dir: 'east', raiders: [] };                   // the other way: a raid under way keeps them
    expect(sendUnits(w, 2, 30)).toEqual({ ok: false, reason: 'raid', sent: {} });
    w.raid.active = null;
    expect(sendUnits(w, 2, 30)).toEqual({ ok: true, reason: null, sent: { soldier: 2 } });
    expect([unitsAtHome(w).soldier, w.soldiers.length]).toEqual([0, 0]);
    expect(sendUnits(w, 1, 30)).toEqual({ ok: false, reason: 'not_enough', sent: {} });
  });
});

describe('s46 armies horses', () => {
  it('feeds each chariot at home its grain a month from granaries first, and lets them go hungry when short', () => {
    const w = makeTestWorld({ size: 32 });
    const stab = addRaw(w, 'stables', 10, 2);
    const gran = addRaw(w, 'granary', 2, 10), store = addRaw(w, 'storehouse', 6, 10);
    const gran2 = addRaw(w, 'granary', 14, 10);
    gran.store = { grain: 4 }; gran2.store = { grain: 10 }; store.store = { grain: 50 };   // a storehouse holds no food: never eaten from
    expect(feedTypes()).toEqual(Object.keys(BUILDINGS).filter((t) => (BUILDINGS[t].stores || []).includes('grain')));
    expect([feedTypes().includes('granary'), feedTypes().includes('storehouse')]).toEqual([true, false]);
    unitAt(w, 'chariot', stab); unitAt(w, 'chariot', stab);
    expect(horseGrainOf(w)).toBe(2 * UNIT_TYPES.chariot.grain);
    expect(grainHeld(w)).toBe(14);
    expect(feedHorses(w)).toEqual({ need: 6, ate: 6 });
    expect([gran.store.grain, gran2.store.grain, store.store.grain, w.army.fed]).toEqual([0, 8, 50, true]);
    expect(armyAlerts(w)).toEqual([]);
    gran2.store.grain = 1;
    const events = [];
    armyMonth(w, events);
    expect([gran2.store.grain, store.store.grain, w.army.fed, events]).toEqual([0, 50, false, [{ type: 'horses_hungry', need: 6, ate: 1 }]]);
    expect(armyAlerts(w)).toEqual([{ code: 'horses_hungry', id: stab.id, need: 6 }]);
    gran.store.grain = 50;
    armyMonth(w);
    expect([w.army.fed, armyAlerts(w)]).toEqual([true, []]);
    w.soldiers = [];                                                                   // no chariots: nothing to eat, never hungry
    expect([feedHorses(w), w.army.fed]).toEqual([{ need: 0, ate: 0 }, true]);
  });
});
