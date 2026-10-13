// Stage 4.6, the Armies track: the raid's mix, boats, a band's pace and walls turning bands that cannot break them (src/sim/raids.js,
// src/sim/armies.js), each set up both ways.
import { describe, it, expect } from '../../harness.js';
import { raidDay, raidSize } from '../../../src/sim/raids.js';
import { drawMix, boatLanding, raiderKinds, isMixed, counterModel, enemyMayCome } from '../../../src/sim/armies.js';
import { MIX, ENEMY_TYPES, ENEMY_KINDS, footMix } from '../../../src/data/armies.js';
import { RAIDS } from '../../../src/data/raids.js';
import { idx } from '../../../src/sim/grid.js';
import { T } from '../../../src/sim/terrain.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const EAST = { x: 31, y: 16 };
const sum = (mix) => ENEMY_KINDS.reduce((s, k) => s + mix[k], 0);

function city({ river = false } = {}) {
  const w = makeTestWorld({ gold: 1000, raiderEntries: [EAST] });
  if (river) for (let y = 0; y < w.size; y++) w.terrain[idx(w.size, 20, y)] = T.WATER;   // a river from the north edge to the south
  setRoad(w, 0, 13, river ? 19 : 31, 13);
  w.milestone = 'market_town';
  addRaw(w, 'storehouse', 6, 15);
  return w;
}

// Raises the warning for raid `index` through raidDay (its day has come) and returns it.
function warn(w, index) {
  w.raid.clockDay = 0;
  w.raid.index = index;
  w.raid.nextWarnDay = w.day = 1000;
  raidDay(w, []);
  return w.raid.warning;
}

// A warning of the given mix arriving today, then the arrival day run; returns the raid under way.
function arriveWith(w, mix, index = 6) {
  const size = sum(mix);
  w.raid.index = index + 1;
  w.raid.warning = { index, entry: { ...EAST }, dir: 'east', size, tribute: 100, target: 'storehouse', day: 900, arrives: 1000, first: false, mix };
  w.day = 1000;
  raidDay(w, []);
  return w.raid.active;
}

describe('s46 armies the raid\'s mix', () => {
  it('keeps the first raids on foot, then brings archers from the 3rd and chariots from the 6th, adding up to the size', () => {
    const w = city();
    expect(drawMix(w, 0, 3)).toEqual(footMix(3));
    expect(drawMix(w, 1, 9)).toEqual(footMix(9));
    const third = drawMix(w, 2, 10);
    expect([third.archer >= 1, third.chariot, third.boat, sum(third)]).toEqual([true, 0, 0, 10]);
    expect(drawMix(w, 4, 10).chariot).toBe(0);
    const sixth = drawMix(w, 5, 12);
    expect([sixth.archer >= 1, sixth.chariot >= 1, sixth.boat, sum(sixth)]).toEqual([true, true, 0, 12]);
    expect([enemyMayCome('archer', 1), enemyMayCome('archer', 2), enemyMayCome('chariot', 4), enemyMayCome('chariot', 5)]).toEqual([false, true, false, true]);
    for (let i = 2; i < 20; i++) for (const n of [2, 5, 11, 18]) {
      const m = drawMix(w, i, n);
      expect([i, n, sum(m), m.foot >= Math.ceil(n * MIX.footMin)]).toEqual([i, n, n, true]);
    }
  });
  it('draws the same mix for the same seed and raid, more raiders who are not on foot on Hard than on Relaxed', () => {
    const a = city(), b = city();
    expect(drawMix(a, 7, 15)).toEqual(drawMix(b, 7, 15));
    let hard = 0, relaxed = 0;
    for (let i = 2; i < 12; i++) {
      a.difficulty = 'hard'; hard += 15 - drawMix(a, i, 15).foot;
      a.difficulty = 'relaxed'; relaxed += 15 - drawMix(a, i, 15).foot;
    }
    expect(hard).toBeGreaterThan(relaxed);
  });
  it('puts the mix on the warning from the size the warning fixes, and an all-foot first raid', () => {
    const w = city();
    w.tally.peakPeople = 600;
    const first = warn(w, 0);
    expect(first.mix).toEqual(footMix(RAIDS.firstSize));
    const w2 = city();
    const size = (() => { w2.raid.index = 6; return raidSize(w2); })();
    const later = warn(w2, 6);
    expect([later.size, later.mix]).toEqual([size, drawMix(w2, 6, size)]);
    expect(sum(later.mix)).toBe(size);
  });
  it('makes raiders of each kind from the mix, splitting a two-band raid\'s kinds between its bands', () => {
    expect(raiderKinds({ foot: 4, archer: 2, chariot: 0, boat: 3 })).toEqual(['foot', 'archer', 'foot', 'foot', 'archer', 'foot']);
    const w = city();
    const a = arriveWith(w, { foot: 3, archer: 2, chariot: 1, boat: 0 });
    expect(a.raiders.map((r) => r.kind).sort()).toEqual(['archer', 'archer', 'chariot', 'foot', 'foot', 'foot']);
    expect(a.raiders.map((r) => r.hp)).toEqual(a.raiders.map((r) => ENEMY_TYPES[r.kind].hp));
  });
});

describe('s46 armies boats', () => {
  it('lands boats on a bank within reach of the city when the river reaches a map edge, as the raid\'s second band', () => {
    const w = city({ river: true });
    addRaw(w, 'granary', 16, 15);                                                       // the city reaches the bank at x = 19
    const land = boatLanding(w, 4);
    expect(land !== null).toBe(true);
    // The bank: beside the river (x = 19 or 21), within landWithin tiles of the granary's 2x2 footprint at (16, 15).
    expect([[19, 21].includes(land.bank.x), ['north', 'south'].includes(land.dir), land.from.x]).toEqual([true, true, 20]);
    expect(land.bank.y >= 15 - ENEMY_TYPES.boat.landWithin && land.bank.y <= 16 + ENEMY_TYPES.boat.landWithin).toBe(true);
    expect(land.from.y === 0 || land.from.y === w.size - 1).toBe(true);
    const wn = warn(w, 4);
    expect([wn.mix.boat > 0, wn.second && wn.second.boat, wn.second && wn.second.size]).toEqual([true, true, wn.mix.boat]);
    w.day = wn.arrives;
    raidDay(w, []);
    const a = w.raid.active;
    const boats = a.raiders.filter((r) => r.band === 1);
    expect([boats.length, boats.every((r) => r.kind === 'boat'), a.second.entry]).toEqual([wn.mix.boat, true, wn.second.entry]);
    // No river at an edge, or no building near a bank: no boats.
    const dry = city();
    expect(boatLanding(dry, 4)).toBe(null);
    expect(warn(dry, 4).mix.boat).toBe(0);
    const far = city({ river: true });
    expect(boatLanding(far, 4)).toBe(null);                                             // the storehouse is 13 tiles from the river
  });
});

describe('s46 armies a band\'s pace and the walls', () => {
  it('moves a band of chariots alone at their speed, and a band with raiders on foot at theirs', () => {
    const fast = city(), slow = city();
    const a = arriveWith(fast, { foot: 0, archer: 0, chariot: 2, boat: 0 });
    const b = arriveWith(slow, { foot: 1, archer: 0, chariot: 1, boat: 0 });
    fast.day += 1; raidDay(fast, []);
    slow.day += 1; raidDay(slow, []);
    expect([EAST.x - a.x, EAST.x - b.x]).toEqual([ENEMY_TYPES.chariot.speed, ENEMY_TYPES.foot.speed]);
  });
  it('turns back a band that cannot break the wall in its way, and has one that can stop and hit it', () => {
    const wallUp = (w) => { for (let y = 0; y < w.size; y++) w.wall[idx(w.size, 25, y)] = 40; w.wallVersion++; };
    const c = city(); wallUp(c);
    const a = arriveWith(c, { foot: 0, archer: 1, chariot: 2, boat: 0 });
    for (let k = 0; k < 10 && a.phase === 'attack'; k++) { c.day += 1; raidDay(c, []); }
    expect([a.phase, a.turned]).toEqual(['retreat', 1]);
    const events = [];
    for (let k = 0; k < 40 && c.raid.active; k++) { c.day += 1; raidDay(c, events); }
    expect([c.raid.active, c.raid.last.won, c.raid.last.turned]).toEqual([null, true, 1]);
    const f = city(); wallUp(f);
    const b = arriveWith(f, { foot: 2, archer: 0, chariot: 1, boat: 0 });
    for (let k = 0; k < 10 && b.blocked === null; k++) { f.day += 1; raidDay(f, []); }
    expect([b.phase, b.blocked !== null, b.turned]).toEqual(['attack', true, undefined]);
  });
  it('turns a band of chariots back at rocky ground, but not one with raiders on foot', () => {
    const rocky = (w) => { for (let y = 0; y < w.size; y++) w.terrain[idx(w.size, 26, y)] = T.ROCKY; };
    const c = city(); rocky(c);
    const a = arriveWith(c, { foot: 0, archer: 0, chariot: 2, boat: 0 });
    for (let k = 0; k < 6 && a.phase === 'attack'; k++) { c.day += 1; raidDay(c, []); }
    expect(a.phase).toBe('retreat');
    const f = city(); rocky(f);
    const b = arriveWith(f, { foot: 1, archer: 0, chariot: 1, boat: 0 });
    for (let k = 0; k < 8; k++) { f.day += 1; raidDay(f, []); }
    expect([b.phase === 'retreat', b.x < 26]).toEqual([false, true]);
  });
});

describe('s46 armies counters', () => {
  it('lists, for each kind in a mix, the units and places the table says help, the weak spots, and the enemy\'s own traits', () => {
    const m = counterModel({ foot: 8, archer: 4, chariot: 2, boat: 0 });
    expect(m.map((c) => [c.kind, c.n])).toEqual([['foot', 8], ['archer', 4], ['chariot', 2]]);
    expect(m[0].helps.map((h) => [h.unit, h.situation, h.factor])).toEqual([['archer', 'wall', 2], ['chariot', 'open', 2], ['soldier', 'gate', 1.5]]);
    expect(m[0].weak.map((h) => [h.unit, h.situation])).toEqual([['archer', 'melee'], ['chariot', 'nearWall']]);
    expect([m[1].traits.shootsTowers, m[1].traits.range, m[2].traits.turnedByWalls, m[2].traits.noRocky, m[0].traits.turnedByWalls]).toEqual([true, ENEMY_TYPES.archer.range, true, true, false]);
    expect(counterModel(footMix(5)).length).toBe(1);
  });
});
