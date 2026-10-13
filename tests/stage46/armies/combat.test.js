// Stage 4.6, the Armies track: units and enemies in combat (src/sim/combat.js), each rule set up both ways.
import { describe, it, expect } from '../../harness.js';
import { trainSoldiers, combatDay, situationsAt, unitDamage, BESIDE } from '../../../src/sim/combat.js';
import { UNIT_TYPES, ENEMY_TYPES, ARMY, MATCHUPS, matchup } from '../../../src/data/armies.js';
import { DEFENCE } from '../../../src/data/raids.js';
import { idx } from '../../../src/sim/grid.js';
import { T } from '../../../src/sim/terrain.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';

const wallAt = (w, x, y, hp = DEFENCE.wallHp) => { w.wall[idx(w.size, x, y)] = hp; w.wallVersion++; };
const unit = (w, kind, b, x, y, extra = {}) => {
  const u = { id: w.nextUnitId++, kind, barracks: b.id, x, y, hp: UNIT_TYPES[kind].hp, hit: false, task: 'wait', ...extra };
  w.soldiers.push(u);
  return u;
};
const raider = (kind, x, y, extra = {}) => ({ id: 9000 + Math.round(x * 100 + y), kind, x, y, hp: ENEMY_TYPES[kind].hp, hit: false, ...extra });
// A raid under way in the contract's shape, with the given raiders.
function raidOf(w, raiders) {
  w.raid.active = { index: 6, entry: { x: 31, y: 16 }, dir: 'east', size: raiders.length, mix: null, target: 'building', day: w.day, raiders, phase: 'attack', targetId: null,
    struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [], x: 20, y: 16, blocked: null, towerIds: [], fires: [], burnedKinds: [] };
  return w.raid.active;
}

describe('s46 armies training', () => {
  it('trains archers at the archery range and chariots at the stables, each at its days and up to its number, counting them', () => {
    const w = makeTestWorld({ size: 32 });
    const range = addRaw(w, 'archery_range', 2, 2, { staff: 6 }), stab = addRaw(w, 'stables', 8, 2, { staff: 6 });
    for (let d = 0; d < UNIT_TYPES.archer.trainDays; d++) trainSoldiers(w);
    expect(w.soldiers.map((u) => [u.kind, u.barracks, u.hp])).toEqual([['archer', range.id, UNIT_TYPES.archer.hp]]);
    for (let d = 0; d < 400; d++) trainSoldiers(w);
    const n = (k) => w.soldiers.filter((u) => u.kind === k).length;
    expect([n('archer'), n('chariot')]).toEqual([UNIT_TYPES.archer.perBuilding, UNIT_TYPES.chariot.perBuilding]);
    expect([w.tally.archersTrained, w.tally.chariotsTrained]).toEqual([UNIT_TYPES.archer.perBuilding, UNIT_TYPES.chariot.perBuilding]);
    expect(w.soldiers.find((u) => u.kind === 'chariot').barracks).toBe(stab.id);
    // A unit away at the capital keeps its place: nothing is trained in its stead.
    const sent = w.soldiers.pop();
    w.army.away.push({ id: sent.id, kind: sent.kind, barracks: sent.barracks, back: 999 });
    for (let d = 0; d < 400; d++) trainSoldiers(w);
    expect(n(sent.kind) + 1).toBe(UNIT_TYPES[sent.kind].perBuilding);
    // A unit whose building is no longer its kind's leaves service.
    w.buildings[range.id].type = 'barracks';
    trainSoldiers(w);
    expect(n('archer')).toBe(0);
  });
});

describe('s46 armies situations and matchups', () => {
  it('reads wall, open, near a wall, gate and melee at a unit\'s tile, and multiplies their matchups (ruling 380)', () => {
    const w = makeTestWorld({ size: 32 });
    wallAt(w, 10, 10);
    expect(situationsAt(w, { x: 10.5, y: 11.5 })).toEqual(['wall', 'nearWall']);
    expect(situationsAt(w, { x: 10.5, y: 13.5 })).toEqual(['nearWall']);
    expect(situationsAt(w, { x: 10.5, y: 10 + ARMY.wallNear + 1.5 })).toEqual(['open']);
    w.road[idx(w.size, 10, 10)] = 1;                                                    // a gate
    expect(situationsAt(w, { x: 11.5, y: 10.5 })).toEqual(['wall', 'nearWall', 'gate']);
    w.wall[idx(w.size, 10, 10)] = -1;                                                   // a breach: no wall, still a gate's place
    expect(situationsAt(w, { x: 11.5, y: 10.5 })).toEqual(['open', 'gate']);
    const range = addRaw(w, 'archery_range', 20, 20);
    wallAt(w, 4, 4);
    const onWall = unit(w, 'archer', range, 4.5, 4.5), inOpen = unit(w, 'archer', range, 4.5, 24.5);
    const far = raider('foot', 4.5, 2.5), near = raider('foot', 4.5, 5.2);
    const base = UNIT_TYPES.archer.damage;
    expect([unitDamage(w, onWall, far), unitDamage(w, inOpen, raider('foot', 4.5, 22.5))]).toEqual([base * matchup('archer', 'foot', 'wall'), base]);
    expect(unitDamage(w, onWall, near)).toBe(base * matchup('archer', 'foot', 'wall') * matchup('archer', 'foot', 'melee'));
    expect(unitDamage(w, onWall, raider('chariot', 4.5, 2.5))).toBe(base);              // no archer row against chariots
    // Words and sim read one table: change it and the damage follows.
    const keep = MATCHUPS.archer.foot.wall;
    MATCHUPS.archer.foot.wall = 3;
    try { expect(unitDamage(w, onWall, far)).toBe(base * 3); } finally { MATCHUPS.archer.foot.wall = keep; }
  });
  it('gives chariots 2x in the open, half near a wall, and half again while their horses go hungry', () => {
    const w = makeTestWorld({ size: 32 });
    const stab = addRaw(w, 'stables', 26, 26);
    wallAt(w, 4, 4);
    const open = unit(w, 'chariot', stab, 15.5, 15.5), close = unit(w, 'chariot', stab, 5.5, 6.5);
    const d = UNIT_TYPES.chariot.damage;
    expect([unitDamage(w, open, raider('foot', 16.5, 15.5)), unitDamage(w, close, raider('archer', 6.5, 6.5))]).toEqual([d * 2, d * 0.5]);
    w.army.fed = false;
    expect(unitDamage(w, open, raider('foot', 16.5, 15.5))).toBe(d * 2 * ARMY.hungry);
  });
});

describe('s46 armies combat', () => {
  it('sends archers up the nearest wall in range and has them shoot from there, counting the fallen as theirs', () => {
    const w = makeTestWorld({ size: 32 });
    const range = addRaw(w, 'archery_range', 14, 20, { staff: 6 });
    for (let x = 10; x <= 20; x++) wallAt(w, x, 16);
    const a = unit(w, 'archer', range, 15, 21);
    const act = raidOf(w, [raider('foot', 15.5, 14.2, { hp: 9 })]);
    combatDay(w);
    expect(a.task).toBe('out');
    for (let k = 0; k < 4 && act.raiders.length; k++) combatDay(w);
    expect(Math.floor(a.y)).toBe(16);                                                   // on the wall line
    expect([act.raiders.length, act.byArchers, w.tally.raidersByArchers]).toEqual([0, 1, 1]);
    expect(act.shots.some((s) => s.by === 'archer') || act.byArchers === 1).toBe(true);
  });
  it('keeps archers that have no wall in reach shooting from their range in the open, at plain damage', () => {
    const w = makeTestWorld({ size: 32 });
    const range = addRaw(w, 'archery_range', 14, 24, { staff: 6 });
    const a = unit(w, 'archer', range, 15, 25);
    const foe = raider('foot', 15.5, 18.5, { hp: 50 });
    raidOf(w, [foe]);
    for (let k = 0; k < 6; k++) combatDay(w);
    expect(Math.hypot(a.x - foe.x, a.y - foe.y)).toBeLessThanOrEqual(UNIT_TYPES.archer.range + 1e-9);
    expect(Math.hypot(a.x - foe.x, a.y - foe.y)).toBeGreaterThan(BESIDE);
  });
  it('stops a chariot before a gate or wall it cannot pass, and lets it drive through a breach', () => {
    const w = makeTestWorld({ size: 32 });
    const stab = addRaw(w, 'stables', 14, 24, { staff: 6 });
    for (let x = 8; x <= 24; x++) wallAt(w, x, 18);
    w.road[idx(w.size, 15, 18)] = 1;                                                    // a gate on the road
    const c = unit(w, 'chariot', stab, 15.5, 22.5);
    const act = raidOf(w, [raider('foot', 15.5, 14.5, { hp: 99 })]);
    for (let k = 0; k < 5; k++) combatDay(w);
    expect(c.y).toBeGreaterThanOrEqual(19);                                                  // held south of the wall line
    w.wall[idx(w.size, 15, 18)] = -1;                                                   // the gate breached
    for (let k = 0; k < 5; k++) combatDay(w);
    expect(c.y).toBeLessThan(18);
    expect(act.raiders[0].hp).toBeLessThan(99);
  });
  it('has enemy archers shoot a tower from range, a tower on open ground falling at ARMY.towerHp and on a wall through its tile', () => {
    const w = makeTestWorld({ size: 32 });
    const t = addRaw(w, 'tower', 10, 10);                                               // unstaffed: it does not shoot back
    const act = raidOf(w, [raider('archer', 10.5, 10.5 - ENEMY_TYPES.archer.range + 0.2)]);
    const days = Math.ceil(ARMY.towerHp / ENEMY_TYPES.archer.damage);
    for (let k = 0; k < days - 1; k++) combatDay(w);
    expect(Boolean(w.buildings[t.id])).toBe(true);
    combatDay(w);
    expect([Boolean(w.buildings[t.id]), act.towersLost]).toEqual([false, 1]);
    const t2 = addRaw(w, 'tower', 20, 10);
    wallAt(w, 20, 10, DEFENCE.towerOnWallHp);
    act.raiders = [raider('archer', 20.5, 10.5 - ENEMY_TYPES.archer.range + 0.2)];
    combatDay(w);
    expect(w.wall[idx(w.size, 20, 10)]).toBe(DEFENCE.towerOnWallHp - ENEMY_TYPES.archer.damage);
    // Out of range: it shoots nothing.
    const w2 = makeTestWorld({ size: 32 });
    addRaw(w2, 'tower', 10, 10);
    const a2 = raidOf(w2, [raider('archer', 10.5, 10.5 - ENEMY_TYPES.archer.range - 1)]);
    combatDay(w2);
    expect(a2.shots).toEqual([]);
    expect(Boolean(t2)).toBe(true);
  });
  it('has an enemy chariot charge a unit along a clear line, and not across a wall or rocky ground', () => {
    const make = (block) => {
      const w = makeTestWorld({ size: 32 });
      const bar = addRaw(w, 'barracks', 2, 2);
      const s = unit(w, 'soldier', bar, 15.5, 15.5);                                  // waiting: its raider is outside its patrol
      if (block === 'wall') for (let x = 10; x <= 20; x++) wallAt(w, x, 17);
      if (block === 'rocky') for (let x = 10; x <= 20; x++) w.terrain[idx(w.size, x, 17)] = T.ROCKY;
      const r = raider('chariot', 15.5, 15.5 + ENEMY_TYPES.chariot.charge - 0.2);
      raidOf(w, [r]);
      const out = combatDay(w);
      return { s, r, out };
    };
    const clear = make(null);
    expect([clear.s.hp, clear.out.fighting]).toEqual([UNIT_TYPES.soldier.hp - ENEMY_TYPES.chariot.damage, true]);
    for (const b of ['wall', 'rocky']) {
      const m = make(b);
      expect([b, m.s.hp, m.out.fighting]).toEqual([b, UNIT_TYPES.soldier.hp, false]);
    }
  });
  it('lets only wall-breakers hit the wall in their band\'s way', () => {
    const run = (kind) => {
      const w = makeTestWorld({ size: 32 });
      wallAt(w, 15, 15);
      const act = raidOf(w, [raider(kind, 15.5, 14.5)]);
      act.blocked = idx(w.size, 15, 15);
      combatDay(w);
      return w.wall[idx(w.size, 15, 15)];
    };
    expect([run('foot'), run('boat'), run('archer'), run('chariot')]).toEqual([DEFENCE.wallHp - ENEMY_TYPES.foot.damage, DEFENCE.wallHp - ENEMY_TYPES.boat.damage, DEFENCE.wallHp, DEFENCE.wallHp]);
  });
});
