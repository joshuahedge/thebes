// Stage 4.7 Task 3 review fixes (Task 4's first commit): the hunters' words say what the sim counts (herds within HUNTING.reach tiles in a straight
// line, whatever lies between), the walk's A* is memoised (the null result too) on roadVersion + terrain + the two tiles, and a hill's sprite slots
// are worked out once.
import { describe, it, expect } from '../../harness.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { findPath, pathMemoSize, PATH_MEMO_MAX } from '../../../src/sim/walk.js';
import { herdsInReach } from '../../../src/sim/wildlife.js';
import { soldiersHome } from '../../../src/sim/combat.js';
import { HUNTING } from '../../../src/data/river.js';
import { S46_RIVER_TEXT as R, TIP_TEXT, TIP_HELP_TEXT, FIRST_TEXT } from '../../../src/ui/text.js';
import { hillsIn, hillField } from '../../../src/render/hills.js';
import { createWorld } from '../../../src/sim/world.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';

const herd = (id, x, y) => ({ id, kind: 'gazelle', x, y, size: 5, max: 5, regrow: null, hx: x, hy: y, px: x, py: y, moved: 0, hunted: 0, dir: 1 });

describe('s47 review hunter words', () => {
  it('count herds in a straight line, as the sim does, with a river between the lodge and the herd', () => {
    const w = makeTestWorld({ size: 48, fertile: [] });
    for (let y = 0; y < 48; y++) for (const x of [20, 21]) w.terrain[idx(48, x, y)] = T.WATER;   // a river the whole map: no way over it
    const lodge = addRaw(w, 'hunting_lodge', 16, 20, { staff: 2 });
    w.wildlife.seeded = true;
    const R0 = HUNTING.reach;
    // the lodge's middle is (17, 21); a herd's centre is its tile + 0.5: R0 tiles east is just in reach, one tile further out is not
    w.wildlife.herds = [herd(1, 17 + R0 - 1, 20), herd(2, 17 + R0 + 2, 20)];   // centres at 17 + R0 - 0.5 and 17 + R0 + 2.5
    const inReach = herdsInReach(w, lodge).map((h) => h.id);
    expect(inReach).toEqual([1]);                                  // the herd across the water counts: the words say a straight line
    for (const words of [R.huntRule, R.noHerds, TIP_TEXT.hunters_range, TIP_HELP_TEXT.hunters_range, FIRST_TEXT.first_hunting_lodge.why]) {
      expect(words).toContain(`${R0} tiles in a straight line`);
    }
    expect(R.huntRule).toContain('round water and hills');
    expect(TIP_TEXT.hunters_range).toContain('round water and hills');
  });
});

describe('s47 review walk memo', () => {
  const arena = () => {
    const w = makeTestWorld({ size: 40, fertile: [] });
    for (let y = 0; y < 40; y++) for (const x of [26, 27]) w.terrain[idx(40, x, y)] = T.WATER;
    return w;
  };
  it('gives the same answer from the cache, null included, and forgets it when a road or the terrain changes', () => {
    const w = arena();
    const a = idx(40, 20, 20), b = idx(40, 33, 20);
    expect(pathMemoSize(w)).toBe(0);
    expect(findPath(w, a, b)).toBe(null);                          // no way over the river
    expect(pathMemoSize(w)).toBe(1);
    expect(findPath(w, a, b)).toBe(null);                          // from the cache (still one entry)
    expect(pathMemoSize(w)).toBe(1);
    const c = idx(40, 10, 10), d = idx(40, 15, 25);
    const p1 = findPath(w, c, d), p2 = findPath(w, c, d);
    expect(p1.length > 2 && p1 === p2).toBe(true);
    // a bridge (a road on the water) opens a way, and the cached null does not stand in the way
    w.road[idx(40, 26, 20)] = 1; w.road[idx(40, 27, 20)] = 1; w.roadVersion += 1;
    expect(findPath(w, a, b) !== null).toBe(true);
    expect(pathMemoSize(w)).toBe(1);                               // the cache started over
    expect(PATH_MEMO_MAX >= 100).toBe(true);
  });
  it('a unit that cannot reach its barracks searches once, not every day', () => {
    const w = arena();
    w.milestone = 'market_town';
    const bk = addRaw(w, 'barracks', 4, 8, { staff: 1 });
    w.soldiers = [{ id: 1, barracks: bk.id, x: 33.5, y: 8.5, hp: 12, hit: false, task: 'out' }];
    for (let d = 0; d < 30; d++) soldiersHome(w);
    expect(pathMemoSize(w)).toBe(1);                               // thirty days, one (null) search
    expect(w.soldiers[0].x > 27.5).toBe(true);
  });
});

describe('s47 review hill slots', () => {
  it('keeps each hill tile\'s slot once, and hands back the same slots every frame', () => {
    const w = createWorld({ seed: 7, mapVariant: 'east', size: 64 });
    const range = { x0: 0, y0: 0, x1: 63, y1: 63 };
    const reg = {};
    const first = hillsIn(w, range, reg);
    expect(first.length > 0).toBe(true);
    const field = hillField(w);
    expect(field.patches.size).toBe(first.length);
    const second = hillsIn(w, range, reg);
    expect(second.map((h) => h.slot)).toEqual(first.map((h) => h.slot));
    expect(field.patches.size).toBe(first.length);
    expect(first.every((h) => Boolean(reg[h.slot]))).toBe(true);
  });
});
