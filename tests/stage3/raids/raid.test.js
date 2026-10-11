import { describe, it, expect } from '../../harness.js';
import { raidDay, raidMood, laterWarnDay, raidAlerts } from '../../../src/sim/raids.js';
import { trainSoldiers } from '../../../src/sim/combat.js';
import { soldiersPayOf } from '../../../src/sim/costs.js';
import { tickDay } from '../../../src/sim/clock.js';
import { fireDay } from '../../../src/sim/fire.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { drawWall } from '../../../src/sim/defence.js';
import { removeBuilding } from '../../../src/sim/world.js';
import { idx } from '../../../src/sim/grid.js';
import { RAIDS, UNITS, DEFENCE } from '../../../src/data/raids.js';
import { DANGER_MOOD } from '../../../src/data/mood.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

const EAST = { x: 31, y: 16 };

// A 32x32 Market town raided from the east (31, 16) only, with a storehouse at (6, 15) (2x2) and a road along y = 13.
function city(gold = 1000) {
  const w = makeTestWorld({ gold, raiderEntries: [EAST] });
  setRoad(w, 0, 13, 31, 13);
  w.milestone = 'market_town';
  const store = addRaw(w, 'storehouse', 6, 15);
  return { w, store };
}

// Puts a warning up that arrives today (the contract's shape) and runs the arrival day.
function arriveNow(w, size, { first = size === RAIDS.firstSize, target = 'storehouse', day = 1000 } = {}) {
  w.raid.index = first ? 1 : 2;
  w.raid.warning = { index: w.raid.index - 1, entry: { ...EAST }, dir: 'east', size, tribute: first ? null : 240, target, day: day - RAIDS.warningDays, arrives: day, first };
  w.day = day;
  const events = [];
  raidDay(w, events);
  return events;
}

// Runs raid days (as tickDay would, without the rest of the city) until the raid ends, or for `days`.
function runRaid(w, days = 200) {
  const events = [];
  for (let k = 0; k < days && w.raid.active; k++) {
    w.day += 1;
    raidDay(w, events);
  }
  return events;
}
const strikes = (events) => events.filter((e) => e.type === 'raid_strike');
const ended = (events) => events.find((e) => e.type === 'raid_end');

describe('s3 raids the raid', () => {
  it('brings the raiders in on the warned day at the entry, drops 2x or 3x to 1x, and heals the walls', () => {
    const { w } = city();
    drawWall(w, 20, 2, 22, 2);
    addRaw(w, 'tower', 21, 2);
    w.wall[idx(w.size, 20, 2)] = 12;
    w.speed = 3;
    const unit = w.nextUnitId;
    const events = arriveNow(w, 5, { first: false });
    const a = w.raid.active;
    expect(w.raid.warning).toBe(null);
    expect([a.index, a.size, a.dir, a.day, a.phase, a.struck, a.byTowers, a.bySoldiers, a.burned, a.stolen]).toEqual([1, 5, 'east', 1000, 'attack', [], 0, 0, 0, 0]);
    expect(a.raiders.map((r) => [r.id, r.hp, r.hit, Math.floor(r.x), Math.floor(r.y)])).toEqual([0, 1, 2, 3, 4].map((k) => [unit + k, UNITS.raider.hp, false, 31, 16]));
    expect([w.nextUnitId, w.tally.raids, w.speed]).toEqual([unit + 5, 1, 1]);
    expect(events).toEqual([{ type: 'raid_start', index: 1, dir: 'east', size: 5 }]);
    expect([20, 21, 22].map((x) => w.wall[idx(w.size, x, 2)])).toEqual([DEFENCE.wallHp, DEFENCE.towerOnWallHp, DEFENCE.wallHp]);
    expect(raidAlerts(w)).toEqual([{ code: 'raid', x: 31, y: 16, left: 5 }]);
    const p = city().w;
    p.speed = 0;
    arriveNow(p, 3);
    expect(p.speed).toBe(0);                                                          // never a pause, and a paused game stays paused
  });
  it('walks to the nearest of the warned kind, strikes three targets two days each, steals, then leaves: a lost raid', () => {
    const { w, store } = city(1000);
    const far = addRaw(w, 'storehouse', 6, 3);
    const temple = addRaw(w, 'temple', 14, 20);
    addRaw(w, 'well', 25, 12);
    addRaw(w, 'house', 20, 20, { tier: 3, residents: 10 });
    arriveNow(w, 3, { day: 1000 });
    const events = runRaid(w);
    const hits = strikes(events);
    expect(hits.map((e) => e.id)).toEqual([store.id, far.id, temple.id]);            // storehouses nearest first, then the next kind down
    expect(hits.map((e) => e.stolen)).toEqual([30, 30, 27]);                           // 1% of the treasury a raider, at least 5: 10+10+10, 10+10+10, 9+9+9
    expect(w.gold).toBe(1000 - 87);
    const end = ended(events);
    expect(end.won).toBe(false);
    expect(end.report).toEqual({ index: 0, dir: 'east', size: 3, won: false, byTowers: 0, bySoldiers: 0, towers: 0, burned: 0, stolen: 87, day: w.day, burnedKinds: [], fires: end.report.fires });
    expect(w.raid.last).toEqual(end.report);
    expect([w.raid.active, w.tally.raidsLost, w.tally.raidsBeaten, w.tally.goldStolen, w.raid.adaptation]).toEqual([null, 1, 0, 87, RAIDS.adaptLost]);
    expect(w.raid.nextWarnDay).toBe(laterWarnDay(w, 1000));
    expect(raidMood(w)).toEqual({ raid: DANGER_MOOD.raidLost });
    w.day = end.report.day + DANGER_MOOD.raidDays - 1;
    expect(raidMood(w)).toEqual({ raid: DANGER_MOOD.raidLost });
    w.day += 1;
    expect(raidMood(w)).toEqual({});
  });
  it('stays two days at a target, striking on the first, and never takes the treasury below 0', () => {
    const { w, store } = city(7);
    arriveNow(w, 3);
    const events = runRaid(w, 23);
    expect(strikes(events)).toEqual([{ type: 'raid_strike', id: store.id, stolen: 7 }]);  // 5, then the last 2, then nothing
    expect([w.gold, w.raid.active.phase, w.raid.active.wait, w.raid.active.x, w.raid.active.y]).toEqual([0, 'strike', RAIDS.strikeDays, 8, 16]);
    runRaid(w, 1);
    expect([w.raid.active.phase, w.raid.active.x]).toEqual(['strike', 8]);
    runRaid(w, 1);
    expect(w.raid.active.phase).toBe('leave');                                        // no other building: it goes home
    expect(w.raid.active.x).toBe(9);
  });
  it('lights a blaze through the fire system at each strike and follows it', () => {
    const { w, store } = city();
    arriveNow(w, 3);
    runRaid(w, 23);
    const a = w.raid.active;
    expect(a.struck).toEqual([store.id]);
    expect(a.fires.map((f) => f.id)).toEqual(store.fire ? [store.id] : []);           // igniteBuilding is Track A's: a stub lights nothing
  });
  it('counts the buildings its fires burn down, by kind, during the raid and after it ends', () => {
    const { w, store } = city();
    const temple = addRaw(w, 'temple', 14, 20);
    arriveNow(w, 3);
    const a = w.raid.active;
    store.fire = { stage: 'fire', days: 4, left: 3 };                                  // as Track A's blaze would be by now
    temple.fire = { stage: 'blaze', days: 1, need: 2, fought: 0 };
    a.fires.push({ id: store.id, type: 'storehouse' }, { id: temple.id, type: 'temple' });
    removeBuilding(w, store.id);                                                      // what burnBuilding does, on this day
    w.danger.burnDays.push(1001);
    runRaid(w, 1);
    expect([a.burned, a.burnedKinds, a.fires]).toEqual([1, ['storehouse'], [{ id: temple.id, type: 'temple' }]]);
    a.raiders = [];                                                                   // the raid ends with the temple still burning
    runRaid(w, 1);
    expect([w.raid.last.burned, w.raid.last.fires.length]).toEqual([1, 1]);
    removeBuilding(w, temple.id);
    w.danger.burnDays.push(w.day + 1);
    w.day += 1;
    raidDay(w, []);
    expect([w.raid.last.burned, w.raid.last.burnedKinds, w.raid.last.fires]).toEqual([2, ['storehouse', 'temple'], []]);
  });
  it('counts a struck building the real fire burns down (once Track A has merged; the stub lights nothing)', () => {
    const { w, store } = city();
    arriveNow(w, 3);
    runRaid(w, 23);
    if (!store.fire) return;                                                          // before Track A: nothing to follow
    for (let k = 0; k < 60 && w.buildings[store.id]; k++) { w.day += 1; fireDay(w, []); raidDay(w, []); }
    expect(store.id in w.buildings).toBe(false);                                      // no firehouse: the blaze grew and burned it down
    const rec = w.raid.active || w.raid.last;
    expect([rec.burned, rec.burnedKinds, rec.fires]).toEqual([1, ['storehouse'], []]);
  });
});

describe('s3 raids defence', () => {
  it('one staffed tower beats the first raid; without it the raid is lost', () => {
    const lost = city();
    arriveNow(lost.w, RAIDS.firstSize);
    expect(ended(runRaid(lost.w)).won).toBe(false);
    const { w, store } = city();
    const tower = addRaw(w, 'tower', 20, 18);
    staffAll(w);
    arriveNow(w, RAIDS.firstSize);
    const events = runRaid(w);
    const end = ended(events);
    expect(end.won).toBe(true);
    expect(strikes(events)).toEqual([]);
    expect(store.id in w.buildings).toBe(true);
    expect([end.report.towers, end.report.byTowers, end.report.bySoldiers]).toEqual([1, 3, 0]);   // two fell, the third as it ran
    expect([w.tally.raidsBeaten, w.tally.raidersByTowers, w.raid.adaptation]).toEqual([1, end.report.byTowers, 1]);
    expect(raidMood(w)).toEqual({ raid: DANGER_MOOD.raidBeaten });
    expect(tower.id in w.buildings).toBe(true);
  });
  it('turns back once half the raiders (rounded up) have fallen, and the towers keep shooting as they go', () => {
    const { w } = city();
    addRaw(w, 'tower', 20, 18);
    staffAll(w);
    arriveNow(w, 5, { first: false });
    const a = w.raid.active;
    let turned = null;
    for (let k = 0; k < 200 && w.raid.active; k++) {
      w.day += 1;
      raidDay(w, []);
      if (w.raid.active && w.raid.active.phase === 'retreat' && turned === null) turned = 5 - a.raiders.length;
    }
    expect(turned).toBe(Math.ceil(5 * RAIDS.retreatShare));
    expect(w.raid.last.won).toBe(true);
    expect(w.raid.last.byTowers).toBeGreaterThan(turned - 1);
  });
  it('keeps raiders out with a closed ring until they breach it, hits them at the breach from a tower on the ring', () => {
    const { w, store } = city();
    // A ring round the storehouse: x 4..9, y 13..18 (a gate where the road at y = 13 crosses).
    drawWall(w, 4, 13, 9, 18);
    drawWall(w, 4, 13, 9, 18, true);
    expect(w.wall[idx(w.size, 9, 13)]).toBe(DEFENCE.gateHp);
    const shape = w.wallVersion;
    arriveNow(w, 3);
    let firstBlocked = null;
    for (let k = 0; k < 200 && w.raid.active; k++) {
      w.day += 1;
      raidDay(w, []);
      const a = w.raid.active;
      if (!a) break;
      if (a.blocked !== null && firstBlocked === null) firstBlocked = { tile: a.blocked, day: w.day, x: a.x };
      if (a.phase === 'strike') break;
    }
    expect(firstBlocked.x).toBe(10);                                                  // stopped outside the east side of the ring
    expect(w.wall[firstBlocked.tile]).toBe(-1);                                       // and broke through it
    expect(w.wallVersion).toBe(shape + 1);
    expect(w.raid.active.struck).toEqual([store.id]);
    const breachDays = Math.ceil(DEFENCE.wallHp / (3 * UNITS.raider.damage));
    expect(w.raid.active.day + 21 + breachDays).toBeLessThan(w.day + 1);
    // The same raid against the same ring with a staffed tower on it beside the cheapest tile: beaten at the wall.
    const t = city();
    drawWall(t.w, 4, 13, 9, 18);
    drawWall(t.w, 4, 13, 9, 18, true);
    addRaw(t.w, 'tower', 9, 18);
    staffAll(t.w);
    arriveNow(t.w, 3);
    const events = runRaid(t.w);
    expect(ended(events).won).toBe(true);
    expect(strikes(events)).toEqual([]);
    expect(t.w.raid.last.byTowers).toBeGreaterThan(1);
    expect(t.w.raid.last.towers).toBe(1);
  });
  it('brings down a tower standing on a wall tile when raiders break that tile', () => {
    const { w } = city();
    drawWall(w, 20, 15, 20, 17);
    const tower = addRaw(w, 'tower', 20, 16);
    arriveNow(w, 3);
    const a = w.raid.active;
    const tile = idx(w.size, 20, 16);
    expect(w.wall[tile]).toBe(DEFENCE.towerOnWallHp);
    w.wall[tile] = 2;                                                                 // nearly broken
    a.blocked = tile;
    const shape = w.wallVersion;
    runRaid(w, 1);
    expect([w.wall[tile], w.wallVersion, tower.id in w.buildings, w.occ[tile]]).toEqual([-1, shape + 1, false, 0]);
  });
  it('breaks a gate as wall, while the road through it still carries reach', () => {
    const { w } = city();
    drawWall(w, 10, 0, 10, 31);                                                       // a wall across the map, a gate at (10, 13)
    w.wall[idx(w.size, 10, 13)] = 2;                                                  // the gate is weakest: the band goes for it
    arriveNow(w, 3);
    w.wall[idx(w.size, 10, 13)] = 2;
    let blocked = null;
    for (let k = 0; k < 60 && w.raid.active && blocked === null; k++) {
      w.day += 1;
      raidDay(w, []);
      if (w.raid.active && w.raid.active.blocked !== null) blocked = w.raid.active.blocked;
    }
    expect(blocked).toBe(idx(w.size, 10, 13));
    expect(w.road[blocked]).toBe(1);
  });
  it('sends soldiers out to raiders within their patrol, has them fight, and walks them back after', () => {
    const { w } = city();
    const barracks = addRaw(w, 'barracks', 14, 14);
    const far = addRaw(w, 'barracks', 14, 26);
    staffAll(w);
    for (const b of [barracks, barracks, far]) w.soldiers.push({ id: w.nextUnitId++, barracks: b.id, x: b.x + 1, y: b.y + 1, hp: UNITS.soldier.hp, hit: false, task: 'wait' });
    arriveNow(w, 3);
    const events = runRaid(w);
    const end = ended(events);
    expect(end.won).toBe(true);
    expect(end.report.bySoldiers).toBeGreaterThan(0);
    expect(w.tally.raidersBySoldiers).toBe(end.report.bySoldiers);
    const mine = w.soldiers.filter((s) => s.barracks === barracks.id);
    expect(mine.length + w.tally.soldiersWounded).toBe(2);
    expect(mine.some((s) => s.hit)).toBe(true);
    const idle = w.soldiers.find((s) => s.barracks === far.id);
    expect([idle.task, idle.x, idle.y]).toEqual(['wait', far.x + 1, far.y + 1]);    // 12 tiles away: outside its patrol
    for (let k = 0; k < 20; k++) { w.day += 1; raidDay(w, []); }
    expect(mine.every((s) => s.task === 'wait' && s.x === barracks.x + 1 && s.y === barracks.y + 1)).toBe(true);
  });
});

describe('s3 raids soldiers', () => {
  it('trains one soldier per 30 days at full staff, slower when short, none below 25%, up to 4, and replaces the wounded', () => {
    const w = makeTestWorld();
    const b = addRaw(w, 'barracks', 4, 4);
    b.staff = 6;
    for (let d = 0; d < DEFENCE.trainDays - 1; d++) trainSoldiers(w);
    expect(w.soldiers.length).toBe(0);
    trainSoldiers(w);
    expect(w.soldiers).toEqual([{ id: 1, barracks: b.id, x: 5, y: 5, hp: UNITS.soldier.hp, hit: false, task: 'wait' }]);
    for (let d = 0; d < 5 * DEFENCE.trainDays; d++) trainSoldiers(w);
    expect(w.soldiers.length).toBe(DEFENCE.soldiersPerBarracks);
    expect(b.progress).toBe(0);
    expect(soldiersPayOf(w)).toBe(DEFENCE.soldiersPerBarracks * DEFENCE.soldierPay);
    w.soldiers.pop();
    b.staff = 5;                                                                       // 5 of 6: 36 days
    for (let d = 0; d < 35; d++) trainSoldiers(w);
    expect(w.soldiers.length).toBe(3);
    trainSoldiers(w);
    expect(w.soldiers.length).toBe(4);
    w.soldiers.pop();
    b.staff = 1;                                                                       // under 25%: no training
    for (let d = 0; d < 200; d++) trainSoldiers(w);
    expect(w.soldiers.length).toBe(3);
    b.staff = 6; b.paused = true;
    for (let d = 0; d < 200; d++) trainSoldiers(w);
    expect(w.soldiers.length).toBe(3);
    removeBuilding(w, b.id);                                                           // the barracks is gone: its soldiers leave service
    trainSoldiers(w);
    expect(w.soldiers).toEqual([]);
  });
  it('trains on Peaceful too, where no raid ever comes', () => {
    const w = makeTestWorld({ raiderEntries: [EAST] });
    w.difficulty = 'peaceful';
    w.tally.peakPeople = 1000;
    const b = addRaw(w, 'barracks', 4, 4);
    b.staff = 6;
    for (let d = 0; d < 3000; d++) { w.day = d; raidDay(w, []); }
    expect([w.soldiers.length, w.raid.clockDay, w.raid.warning, w.raid.active]).toEqual([4, null, null, null]);
  });
});

describe('s3 raids determinism', () => {
  // A small raided town through tickDay: people, a storehouse, a tower and a barracks, the clock started long ago.
  function town() {
    const w = makeTestWorld({ gold: 3000, raiderEntries: [EAST, { x: 16, y: 0 }] });
    setRoad(w, 0, 13, 31, 13);
    setRoad(w, 16, 0, 16, 31);
    w.milestone = 'market_town';
    for (let x = 0; x < 12; x += 2) addRaw(w, 'house', x, 14, { tier: 4, residents: 40 });
    addRaw(w, 'storehouse', 18, 14);
    addRaw(w, 'tower', 22, 12);
    addRaw(w, 'barracks', 12, 11);
    drawWall(w, 26, 10, 26, 20);
    Object.assign(w.raid, { clockDay: 0, nextWarnDay: 30, index: 1 });
    return w;
  }
  it('gives the same world for the same seed and days, and the same again when saved and loaded mid-raid', () => {
    const a = town(), b = town();
    let day = 0;
    while (!(a.raid.active && a.raid.active.raiders.length && a.raid.active.x < 26) && day < 400) { tickDay(a); tickDay(b); day++; }
    expect(Boolean(a.raid.active)).toBe(true);
    expect(serialize(a)).toBe(serialize(b));
    const c = deserialize(serialize(a));
    for (let d = 0; d < 60; d++) { tickDay(a); tickDay(c); }
    expect(serialize(c)).toBe(serialize(a));
  });
});
