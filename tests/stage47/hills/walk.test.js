// Stage 4.7 Task 3 (ruling 472): walkers round water and hills. The shared walk (src/sim/walk.js) answers over the shared passable rule; hunters,
// foot soldiers and archers use it; herds never stand on water or hills; newcomers walk the roads, each a passable tile. Each is tested on a
// river map and on a hilly map, and set up both ways (with the way round and without it).
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { T, passable, buildable } from '../../../src/sim/terrain.js';
import { idx, inBounds } from '../../../src/sim/grid.js';
import { findPath, walkPath, pathLengths, pointAlong, WALK } from '../../../src/sim/walk.js';
import { soldiersHome } from '../../../src/sim/combat.js';
import { landReach } from '../../../src/sim/hills.js';
import { UNIT_TYPES } from '../../../src/data/armies.js';
import { wildlifeDay, crocSpots } from '../../../src/sim/wildlife.js';
import { huntersOf } from '../../../src/render/wildlife.js';
import { entryPath } from '../../../src/render/newcomers.js';
import { HUNTING } from '../../../src/data/river.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// A 40 x 40 test world with a block of hills (x 12-14, y 2-16) and a river (x 26-27, y 0-39), no fertile land.
function arena({ hills = true, river = false } = {}) {
  const w = makeTestWorld({ size: 40, fertile: [] });
  if (hills) for (let y = 2; y <= 16; y++) for (let x = 12; x <= 14; x++) w.terrain[idx(40, x, y)] = T.HILLS;
  if (river) for (let y = 0; y < 40; y++) for (const x of [26, 27]) w.terrain[idx(40, x, y)] = T.WATER;
  return w;
}
const tileOk = (w, x, y) => inBounds(w.size, Math.floor(x), Math.floor(y)) && passable(w, idx(w.size, Math.floor(x), Math.floor(y)));
// Every point along a polyline, a tenth of a tile apart, stands on a passable tile.
function along(w, pts) {
  const cum = pathLengths(pts), out = [];
  for (let s = 0; s <= cum[cum.length - 1] + 1e-9; s += 0.1) out.push(pointAlong(pts, cum, s));
  return out;
}

describe('s47 walk', () => {
  it('goes straight across open ground, exactly as the figures always did', () => {
    const w = arena({ hills: false });
    const path = walkPath(w, { x: 3.5, y: 20.5 }, { x: 20.5, y: 28.5 });
    expect(path).toEqual([{ x: 3.5, y: 20.5 }, { x: 20.5, y: 28.5 }]);
  });

  it('goes round hills: every point of the way is passable, longer than the straight line but not by much', () => {
    const w = arena();
    const a = { x: 6.5, y: 8.5 }, b = { x: 20.5, y: 8.5 };
    const path = walkPath(w, a, b);
    expect(path !== null).toBe(true);
    expect(along(w, path).every((q) => tileOk(w, q.x, q.y))).toBe(true);
    const len = pathLengths(path).pop();
    expect(len > 14 && len < 14 + 24).toBe(true);
    // with no hills the same two points are one straight leg
    expect(walkPath(arena({ hills: false }), a, b).length).toBe(2);
    expect(walkPath(w, a, b)).toEqual(path);                    // deterministic
    expect(findPath(w, idx(40, 6, 8), idx(40, 20, 8)).every((t) => passable(w, t))).toBe(true);
  });

  it('goes round the river or over a bridge, and has no way over water alone', () => {
    const w = arena({ hills: false, river: true });
    const a = { x: 20.5, y: 20.5 }, b = { x: 33.5, y: 20.5 };
    expect(walkPath(w, a, b)).toBe(null);                       // the river runs the whole map: no way across
    w.terrain[idx(40, 26, 39)] = T.DESERT; w.terrain[idx(40, 27, 39)] = T.DESERT;   // a ford at the foot of the map
    const round = walkPath(w, a, b);
    expect(round !== null && pathLengths(round).pop() > 40).toBe(true);
    expect(along(w, round).every((q) => tileOk(w, q.x, q.y))).toBe(true);
    w.terrain[idx(40, 26, 39)] = T.WATER; w.terrain[idx(40, 27, 39)] = T.WATER;
    w.road[idx(40, 26, 20)] = 1; w.road[idx(40, 27, 20)] = 1;   // a bridge on the row they stand on (a road on water, ruling 314)
    const over = walkPath(w, a, b);
    expect(over !== null && pathLengths(over).pop() < 15).toBe(true);
    expect(along(w, over).every((q) => tileOk(w, q.x, q.y))).toBe(true);
  });

  it('starts from the nearest passable tile when the doorstep is on water, and gives up past the search limit', () => {
    const w = arena({ hills: false, river: true });
    const path = walkPath(w, { x: 26.5, y: 10.5 }, { x: 20.5, y: 10.5 });   // standing on the water's edge tile
    expect(path !== null).toBe(true);
    expect(WALK.expand > 100).toBe(true);
  });
});

describe('s47 hunters', () => {
  // A lodge at (9, 8) and a herd of gazelle at (19, 8) (within the hunters' reach), the hills between them.
  function hunt(w, herdAt = [19, 8]) {
    w.milestone = 'town';
    const lodge = addRaw(w, 'hunting_lodge', 9, 8, { staff: 2 });
    w.wildlife.seeded = true;
    w.wildlife.herds = [{ id: 1, kind: 'gazelle', x: herdAt[0], y: herdAt[1], size: 5, max: 5, regrow: null, hx: herdAt[0], hy: herdAt[1], px: herdAt[0], py: herdAt[1], moved: 0, hunted: 0, dir: 1 }];
    w.wildlife.nextId = 2;
    return lodge;
  }
  const sample = (w, lodge, motion = 'full') => { const out = []; for (let t = 0; t < 90; t += 0.31) for (const f of huntersOf(w, lodge, t, motion)) out.push(f); return out; };

  it('walk round hills to the herd: no figure ever stands on hills or water, and they still reach the herd', () => {
    const w = arena();
    const lodge = hunt(w);
    const figs = sample(w, lodge);
    expect(figs.every((f) => tileOk(w, f.x, f.y))).toBe(true);
    expect(Math.min(...figs.map((f) => Math.hypot(f.x - 19.5, f.y - 8.5))) < 3).toBe(true);
    // the same city without the hills: the straight line, and the hunters pass through where the hills were
    const open = arena({ hills: false });
    const figs0 = sample(open, hunt(open));
    expect(figs0.some((f) => f.x > 12 && f.x < 15 && f.y > 7 && f.y < 10)).toBe(true);
    expect(figs.some((f) => f.x > 12 && f.x < 15 && f.y > 2 && f.y < 17)).toBe(false);
  });

  it('go over a bridge to a herd across the river, and stand at the door when no way joins them (a river map)', () => {
    const w = arena({ hills: false, river: true });
    const lodge = hunt(w, [18, 12]);                              // the herd is on the lodge's bank: reachable
    expect(sample(w, lodge).every((f) => tileOk(w, f.x, f.y))).toBe(true);
    // a herd 12 tiles away across the river: within the lodge's reach, but no way over passable ground
    const across = arena({ hills: false, river: true });
    const lodge2 = addRaw(across, 'hunting_lodge', 21, 8, { staff: 2 });
    across.milestone = 'town';
    across.wildlife.seeded = true;
    across.wildlife.herds = [{ id: 1, kind: 'gazelle', x: 30, y: 9, size: 5, max: 5, regrow: null, hx: 30, hy: 9, px: 30, py: 9, moved: 0, hunted: 0, dir: 1 }];
    const figs = sample(across, lodge2);
    expect(Math.max(...figs.map((f) => f.x)) < 26).toBe(true);    // never past the water
    expect(figs.every((f) => tileOk(across, f.x, f.y))).toBe(true);
    // with a bridge on a row between them the hunters cross it
    across.road[idx(40, 26, 9)] = 1; across.road[idx(40, 27, 9)] = 1;
    across.roadVersion += 1;
    const over = sample(across, lodge2);
    expect(Math.max(...over.map((f) => f.x)) > 27).toBe(true);
    expect(over.every((f) => tileOk(across, f.x, f.y))).toBe(true);
    // Still: they stand at the door
    expect(sample(across, lodge2, 'still').every((f) => Math.abs(f.y - 9.5 - 0.35) < 2.5 && f.x < 24)).toBe(true);
    expect(HUNTING.reach >= 9).toBe(true);
  });
});

describe('s47 soldiers', () => {
  function post(w, from, task = 'out') {
    w.milestone = 'market_town';
    const bk = addRaw(w, 'barracks', 4, 8, { staff: 1 });
    w.soldiers = [{ id: 1, barracks: bk.id, x: from.x, y: from.y, hp: 12, hit: false, task }];
    return bk;
  }
  const home = (w) => { const b = Object.values(w.buildings)[0]; return { x: b.x + b.w / 2, y: b.y + b.d / 2 }; };
  const walk = (w, days = 60) => {
    const seen = [];
    for (let d = 0; d < days; d++) { soldiersHome(w); seen.push({ x: w.soldiers[0].x, y: w.soldiers[0].y, task: w.soldiers[0].task }); }
    return seen;
  };

  it('walk home round hills, standing on passable ground every day, and arrive', () => {
    const w = arena();
    post(w, { x: 20.5, y: 8.5 });
    const seen = walk(w);
    expect(seen.every((s) => tileOk(w, s.x, s.y))).toBe(true);
    expect([w.soldiers[0].task, Math.hypot(w.soldiers[0].x - home(w).x, w.soldiers[0].y - home(w).y) < 0.01]).toEqual(['wait', true]);
    expect(UNIT_TYPES.soldier.speed > 0).toBe(true);
    // without the hills the walk is the straight line it was: fewer days
    const open = arena({ hills: false });
    post(open, { x: 20.5, y: 8.5 });
    expect(walk(open).findIndex((s) => s.task === 'wait') < seen.findIndex((s) => s.task === 'wait')).toBe(true);
  });

  it('stay on their own bank when no bridge joins them to the foe or the barracks (a river map), and cross a bridge when there is one', () => {
    const w = arena({ hills: false, river: true });
    post(w, { x: 33.5, y: 8.5 });
    const seen = walk(w, 40);
    expect(seen.every((s) => s.x > 27.5)).toBe(true);           // no wading the river
    w.road[idx(40, 26, 8)] = 1; w.road[idx(40, 27, 8)] = 1;     // a bridge on their row
    const crossed = walk(w, 40);
    expect(crossed.every((s) => tileOk(w, s.x, s.y))).toBe(true);
    expect(w.soldiers[0].task).toBe('wait');
  });
});

describe('s47 herds and newcomers', () => {
  it('never stand a herd on water or hills over a year of days, on a hilly map, and the spawn tries skip them', () => {
    for (const [seed, variant] of [[7, 'east'], [3, 'island'], [14, 'wide-bends']]) {
      const w = createWorld({ seed, mapVariant: variant, size: 64 });
      w.milestone = 'town';
      for (let d = 0; d < 360; d++) {
        w.day += 1;
        wildlifeDay(w);
        for (const h of w.wildlife.herds) {
          const i = idx(64, h.x, h.y);
          if (!buildable(w, i) || w.terrain[i] === T.HILLS || w.terrain[i] === T.WATER) throw new Error(`${variant} #${seed}: a herd at ${h.x},${h.y} on terrain ${w.terrain[i]} on day ${w.day}`);
        }
      }
      expect(w.wildlife.herds.length > 0).toBe(true);
    }
  });

  it('keeps crocodile spots on water with open land beside them, and newcomers on road tiles that are all passable', () => {
    const w = createWorld({ seed: 7, mapVariant: 'east', size: 64 });
    for (const [x, y] of crocSpots(w)) {
      expect(w.terrain[idx(64, x, y)]).toBe(T.WATER);
      expect([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => buildable(w, idx(64, x + dx, y + dy)))).toBe(true);
    }
    // a road from the trade entry to a house: the newcomers' path is passable tile by tile, and none of it is on a hill
    const m = w.tradeEntry;
    for (let y = m.y; y > m.y - 8; y--) w.road[idx(64, m.x, y)] = 1;
    w.roadVersion += 1;
    const house = addRaw(w, 'house', m.x + 1, m.y - 6, { tier: 1, residents: 4 });
    const path = entryPath(w, house);
    expect(path !== null && path.length > 3).toBe(true);
    expect(path.every((q) => tileOk(w, q.x, q.y))).toBe(true);
    expect(setRoad).toBeTruthy();
  });
});

describe('s47 generated maps walk', () => {
  it('has a way from the start area to every raider entry over passable ground on a hilly map, by the shared walk', () => {
    for (const [seed, variant] of [[7, 'east'], [21, 'middle'], [5, 'island']]) {
      const m = generateMap(seed, 64, variant), w = createWorld({ seed, mapVariant: variant, size: 64 });
      expect(m.terrain.includes(T.HILLS)).toBe(true);
      const reach = landReach(m.terrain, 64, m.focus, null);   // what the start area reaches on land, without a bridge
      for (const e of w.raiderEntries) {
        const path = walkPath(w, { x: w.focus.x + 0.5, y: w.focus.y + 0.5 }, { x: e.x + 0.5, y: e.y + 0.5 });
        expect([seed, variant, path !== null]).toEqual([seed, variant, Boolean(reach[idx(64, e.x, e.y)])]);
        if (path) expect(along(w, path).every((q) => tileOk(w, q.x, q.y))).toBe(true);
      }
    }
  });
});
