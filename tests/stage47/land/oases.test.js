// Stage 4.7 Task 2 (ruling 463): desert oases. Counts by size, where they may lie, that they never cut the start area off from a raider entry,
// that herds favour them, that a fishing wharf refuses a pool ("Must touch the river"), and the first "An oasis in the desert".
import { describe, it, expect } from '../../harness.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { createWorld } from '../../../src/sim/world.js';
import { MAP_VARIANTS, MAP_SIZES } from '../../../src/data/map.js';
import { OASES, S47_SALT, hasNewLand, isOasis } from '../../../src/data/s47.js';
import { T } from '../../../src/sim/terrain.js';
import { idx, inBounds } from '../../../src/sim/grid.js';
import { bridgeSpot } from '../../../src/sim/bridges.js';
import { oasisRange, inOasisPool, oasisNear, poolTiles } from '../../../src/sim/oases.js';
import { canPlace, place, paintHouseTiles, paintPlazaTiles } from '../../../src/sim/commands.js';
import { fitOf } from '../../../src/sim/fit.js';
import { firstMet } from '../../../src/sim/firsts.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { TIPS } from '../../../src/data/tips.js';
import { FIRST_TEXT, TIP_TEXT, TIP_HELP_TEXT, reasonText, S46_MAP_TEXT } from '../../../src/ui/text.js';
import { wildlifeDay } from '../../../src/sim/wildlife.js';
import { createMapUi } from '../../../src/ui/s46/map.js';

const SIZES = Object.values(MAP_SIZES), SEEDS = 200;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Every map of seeds 1..SEEDS at each size and layout, made once for this file's sweeps.
let cache = null;
function maps() {
  if (cache) return cache;
  cache = [];
  for (const size of SIZES) for (const variant of MAP_VARIANTS) for (let seed = 1; seed <= SEEDS; seed++) cache.push({ size, variant, seed, m: generateMap(seed, size, variant) });
  return cache;
}

// The oasis pool tiles of a generated map: water within the oasis's radius of its centre.
const poolOf = (m) => poolTiles({ size: m.size, terrain: m.terrain, oases: m.oases });
const edgeDist = (size, x, y) => Math.min(x, y, size - 1 - x, size - 1 - y);
// A plain flood fill over non-water tiles, 4 directions (the raiders' steps), from (x, y).
function reach(size, terrain, from) {
  const seen = new Uint8Array(size * size), q = [idx(size, from.x, from.y)];
  seen[q[0]] = 1;
  for (let k = 0; k < q.length; k++) {
    const x = q[k] % size, y = (q[k] - x) / size;
    for (const [dx, dy] of N4) {
      if (!inBounds(size, x + dx, y + dy)) continue;
      const j = idx(size, x + dx, y + dy);
      if (!seen[j] && terrain[j] !== T.WATER) { seen[j] = 1; q.push(j); }
    }
  }
  return seen;
}

describe('s47 oases', () => {
  it('holds 0-1 oases on Small, 0-2 on Normal and 1-3 on Large (classic at Normal none), on 200 seeds of every layout', () => {
    const bad = [], seen = {};
    for (const { size, variant, seed, m } of maps()) {
      const [, hi] = oasisRange(size), n = m.oases.length, key = `${size} ${variant}`;
      (seen[key] = seen[key] || new Set()).add(n);
      const classicNormal = variant === 'classic' && size === 64;
      if (classicNormal ? n !== 0 : n < (size >= 72 ? 1 : 0) || n > hi) bad.push(`${key} #${seed}: ${n} oases`);
      if (!m.oases.every(isOasis)) bad.push(`${key} #${seed}: not oases`);
      if (hasNewLand({ mapParams: m.params }) === classicNormal) bad.push(`${key} #${seed}: land key`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect([...seen['80 east']].sort()).toEqual([1, 2, 3]);   // the seeded draw really varies
    expect([...seen['64 east']].sort()).toEqual([0, 1, 2]);
    expect([...seen['48 east']].sort()).toEqual([0, 1]);
    expect([...seen['64 classic']]).toEqual([0]);
    expect([oasisRange(48), oasisRange(64), oasisRange(80)]).toEqual([[0, 1], [0, 2], [1, 3]]);
  });

  it('shapes each: a pool of 3-8 water tiles, a bank, a fertile ring and a little clay, in open desert', () => {
    const bad = [];
    for (const { size, variant, seed, m } of maps()) {
      for (const o of m.oases) {
        const tag = `${size} ${variant} #${seed} oasis ${o.x},${o.y}`;
        let water = 0, bank = 0, fertile = 0, clay = 0;
        for (let y = o.y - 6; y <= o.y + 6; y++) {
          for (let x = o.x - 6; x <= o.x + 6; x++) {
            if (!inBounds(size, x, y)) continue;
            const t = m.terrain[idx(size, x, y)], d = Math.hypot(x - o.x, y - o.y);
            if (t === T.WATER && d <= o.r) water++;
            else if (d <= o.r + 6) { if (t === T.BANK) bank++; else if (t === T.FERTILE) fertile++; else if (t === T.CLAY) clay++; }
          }
        }
        if (water < OASES.pool[0] || water > OASES.pool[1]) bad.push(`${tag}: ${water} water tiles`);
        if (bank < 6 || fertile < 6 || clay < 1) bad.push(`${tag}: bank ${bank} fertile ${fertile} clay ${clay}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it('keeps the plan\'s distances: 12 from the river, 8 from an edge and from rock, off the start area, raider entries, the trade entry and the bridge spot', () => {
    const bad = [], mended = new Set();
    for (const { size, variant, seed, m } of maps()) {
      if (!m.oases.length) continue;
      const pool = new Set(poolOf(m)), tag = `${size} ${variant} #${seed}`;
      const other = [];   // water that is not an oasis pool: the river, side channels, lakes
      for (let i = 0; i < m.terrain.length; i++) if (m.terrain[i] === T.WATER && !pool.has(i)) other.push([i % size, Math.floor(i / size)]);
      const z = new Uint8Array(size * size);
      const spot = bridgeSpot({ size, terrain: m.terrain, road: z, occ: z }, m.focus);
      for (const i of pool) {
        const x = i % size, y = Math.floor(i / size);
        if (other.some(([wx, wy]) => Math.max(Math.abs(wx - x), Math.abs(wy - y)) < OASES.fromRiver)) bad.push(`${tag}: pool ${x},${y} within ${OASES.fromRiver} of the river`);
        if (edgeDist(size, x, y) < OASES.fromEdge) bad.push(`${tag}: pool ${x},${y} within ${OASES.fromEdge} of an edge`);
        // the 8-tile gap to rock (OASES.fromRock) holds on the finished map: outcrops, hills and their rocky skirts keep it. The one thing that may
        // break it is Task 1's mine repair, and only on a map where no site keeps the gap (the repair prefers one that does): counted below
        for (let ry = y - OASES.fromRock; ry <= y + OASES.fromRock; ry++) for (let rx = x - OASES.fromRock; rx <= x + OASES.fromRock; rx++) {
          if (inBounds(size, rx, ry) && (m.terrain[idx(size, rx, ry)] === T.ROCKY || m.terrain[idx(size, rx, ry)] === T.HILLS)) {
            if (m.repaired.mine > 0) mended.add(tag); else bad.push(`${tag}: rock or hills ${rx},${ry} within ${OASES.fromRock} of pool ${x},${y}`);
          }
        }
      }
      for (const o of m.oases) {
        if (Math.hypot(o.x - m.focus.x, o.y - m.focus.y) < 11 + o.r + 1) bad.push(`${tag}: oasis ${o.x},${o.y} on the start area`);
        for (const e of [...m.raiderEntries, m.tradeEntry]) if (Math.hypot(o.x - e.x, o.y - e.y) < 10) bad.push(`${tag}: oasis ${o.x},${o.y} by an entry`);
        if (spot && Math.hypot(o.x - spot.x, o.y - spot.y) < 10) bad.push(`${tag}: oasis ${o.x},${o.y} on the bridge spot`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(mended.size <= 40).toBe(true);   // of 3400 maps (Task 3b: 26 with the belts and the fragment, 17 before; 0.8%), those with no other room for the guaranteed mine (src/sim/resources.js mendMine prefers a site that keeps the gap)   // of 1800 maps, only the few with no other room for the guaranteed mine (see src/sim/resources.js mendMine)
  });

  it('never cuts the start area off from a raider entry or the trade entry, nor moves the bridge spot, on 200 seeds of every size and layout', () => {
    const bad = [];
    let withOases = 0;
    for (const { size, variant, seed, m } of maps()) {
      if (!m.oases.length) continue;
      withOases++;
      const land = [...m.terrain];
      for (const i of poolOf(m)) land[i] = T.DESERT;   // the same map with every oasis pool taken away
      const before = reach(size, land, m.focus), after = reach(size, m.terrain, m.focus);
      for (const e of [...m.raiderEntries, m.tradeEntry]) if (before[idx(size, e.x, e.y)] && !after[idx(size, e.x, e.y)]) bad.push(`${size} ${variant} #${seed}: entry ${e.x},${e.y} cut off`);
      const z = new Uint8Array(size * size), spotOf = (terrain) => JSON.stringify(bridgeSpot({ size, terrain, road: z, occ: z }, m.focus));
      if (spotOf(land) !== spotOf(m.terrain)) bad.push(`${size} ${variant} #${seed}: the bridge spot moved`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(withOases > 1000).toBe(true);   // the sweep really had oases to check
  });

  it('is a function of the seed, size and layout alone (the S47 salts, never the generator stream), and a world keeps them', () => {
    expect([S47_SALT.oases, S47_SALT.oasisShape]).toEqual([4704, 4705]);
    const a = generateMap(5, 64, 'east'), b = generateMap(5, 64, 'east'), c = generateMap(6, 64, 'east');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.oases.length > 0 && JSON.stringify(a.oases) !== JSON.stringify(c.oases)).toBe(true);
    const w = createWorld({ seed: 5, mapVariant: 'east', size: 64 });
    expect(w.oases).toEqual(a.oases);
    expect(w.oases.length).toBe(2);
  });

  it('counts a tile as the pool of an oasis only when it is water within the oasis\'s radius', () => {
    const w = createWorld({ seed: 5, mapVariant: 'east', size: 64 });
    const o = w.oases[0], pool = poolTiles(w);
    expect(inOasisPool(w, o.x, o.y)).toBe(true);
    expect(pool.length >= 3).toBe(true);
    const river = w.terrain.findIndex((t, i) => t === T.WATER && !pool.includes(i));
    expect(inOasisPool(w, river % 64, Math.floor(river / 64))).toBe(false);
    // "within 4 tiles" is measured to the nearest pool tile, not the centre: a tile OASES.near from the pool's eastmost tile counts, one more does not
    const east = pool.map((i) => [i % 64, Math.floor(i / 64)]).filter(([, y]) => y === o.y).reduce((m, [x]) => Math.max(m, x), o.x);
    expect(oasisNear(w, east + OASES.near, o.y)).toBe(o);
    expect(oasisNear(w, east + OASES.near + 1, o.y)).toBe(null);
    expect(oasisNear(w, o.x + Math.ceil(o.r) + OASES.near + 3, o.y)).toBe(null);
  });
});

const wharfWorld = () => {
  const w = createWorld({ seed: 5, mapVariant: 'east', size: 64 });
  w.milestone = 'town';
  w.gold = 100000;
  return w;
};
// The first (x, y, rot) where the wharf's fit satisfies test, scanning the map.
function spotBy(w, test) {
  for (let y = 1; y < w.size - 2; y++) for (let x = 1; x < w.size - 2; x++) for (const rot of [0, 1]) {
    const f = fitOf(w, 'fishing_wharf', x, y, rot);
    if (test(f, x, y, rot)) return { x, y, rot };
  }
  return null;
}

describe('s47 oasis wharf', () => {
  it('refuses a fishing wharf on an oasis pool through the shared refusal "Must touch the river", and still lets one fish the river', () => {
    const w = wharfWorld();
    const pool = new Set(poolTiles(w));
    const beside = (x, y, rot) => {   // some footprint tile 4-neighbours an oasis pool tile
      const dims = rot ? [1, 2] : [2, 1];
      for (let j = 0; j < dims[1]; j++) for (let i = 0; i < dims[0]; i++) for (const [dx, dy] of N4) if (pool.has(idx(w.size, x + i + dx, y + j + dy))) return true;
      return false;
    };
    const atPool = spotBy(w, (f, x, y, rot) => f.reason === 'needs_river' && beside(x, y, rot));
    expect(atPool !== null).toBe(true);
    const c = canPlace(w, 'fishing_wharf', atPool.x, atPool.y, { rot: atPool.rot });
    expect([c.ok, c.reason]).toEqual([false, 'needs_river']);
    expect(reasonText('needs_river')).toBe('Must touch the river');
    expect(S46_MAP_TEXT.refusalLine('needs_river', { terrain: null }, { water: 'longSide' })).toBe('Must touch the river');
    expect(S46_MAP_TEXT.groundChip({ water: 'longSide', reason: 'needs_river', state: 'cant' }, { water: 'longSide' })).toBe('Must touch the river');
    // the river's own bank still takes a wharf; far from all water the old refusal stands
    const atRiver = spotBy(w, (f) => f.ok && f.wet > 0);
    expect(atRiver !== null).toBe(true);
    expect(fitOf(w, 'fishing_wharf', 2, 2, 0).reason).toBe('needs_water');
    // with the oasis taken away the same spot beside the pool is a wharf's (the pool is then ordinary water)
    w.oases = [];
    expect(fitOf(w, 'fishing_wharf', atPool.x, atPool.y, atPool.rot).ok).toBe(true);
  });
});

describe('s47 oasis nilometer', () => {
  it('refuses a Nilometer beside only an oasis pool with the same "Must touch the river", and still lets one stand by the river', () => {
    const w = wharfWorld();
    const pool = new Set(poolTiles(w));
    const at = (x, y) => fitOf(w, 'nilometer', x, y, 0);
    let atPool = null, atRiver = null;
    for (let y = 1; y < w.size - 1 && !(atPool && atRiver); y++) for (let x = 1; x < w.size - 1; x++) {
      const f = at(x, y);
      if (!atPool && f.reason === 'needs_river' && N4.some(([dx, dy]) => pool.has(idx(w.size, x + dx, y + dy)))) atPool = [x, y];
      if (!atRiver && f.ok && f.wet > 0) atRiver = [x, y];
    }
    expect(atPool !== null && atRiver !== null).toBe(true);
    const c = canPlace(w, 'nilometer', atPool[0], atPool[1]);
    expect([c.ok, c.reason]).toEqual([false, 'needs_river']);
    expect(fitOf(w, 'nilometer', 2, 2, 0).reason).toBe('needs_water');   // far from all water the old refusal stands
    w.oases = [];   // with the oasis taken away the same spot is ordinary water's
    expect(at(atPool[0], atPool[1]).ok).toBe(true);
  });
});

describe('s47 oasis first', () => {
  it('records "An oasis in the desert" when a building first goes up within 4 tiles of an oasis, and not for one farther off', () => {
    const w = wharfWorld();
    const o = w.oases[0];
    const first = FIRSTS.find((f) => f.id === 'first_oasis');
    expect(first.check).toEqual({ kind: 'tally', key: 'oasisBuilds', n: 1 });
    const free = (x, y) => inBounds(w.size, x, y) && w.terrain[idx(w.size, x, y)] === T.DESERT && !w.occ[idx(w.size, x, y)];
    let near = null, far = null;
    for (let y = 1; y < w.size - 1 && !(near && far); y++) {
      for (let x = 1; x < w.size - 1; x++) {
        if (!free(x, y)) continue;
        const d = Math.hypot(x - o.x, y - o.y);
        if (!near && d > o.r + 2 && oasisNear(w, x, y, OASES.near - 0.5) && canPlace(w, 'well', x, y, { roadLater: true }).ok) near = [x, y];
        if (!far && !oasisNear(w, x, y, OASES.near + 8) && canPlace(w, 'well', x, y, { roadLater: true }).ok) far = [x, y];
      }
    }
    expect(near !== null && far !== null).toBe(true);
    const rFar = place(w, 'well', far[0], far[1], { roadLater: true });
    expect([w.tally.oasisBuilds, firstMet(w, first)]).toEqual([0, null]);
    const rNear = place(w, 'well', near[0], near[1], { roadLater: true });
    expect(w.tally.oasisBuilds).toBe(1);
    expect(firstMet(w, first)).toEqual({ x: near[0] + 0.5, y: near[1] + 0.5 });
    // the tip fires for the building near an oasis only (the Map seam's onCommand)
    const fired = [], seam = createMapUi({ world: w, fireTip: (t) => fired.push(t) });
    seam.onCommand({ kind: 'building', result: { ok: true, id: rFar.id } });
    expect(fired).toEqual([]);
    seam.onCommand({ kind: 'building', result: { ok: true, id: rNear.id } });
    expect(fired).toEqual(['oasisBuilt']);
  });

  it('fires the tip for plots and plazas drawn near an oasis too (they come back as a list of ids), and not for those far off', () => {
    for (const kind of ['houses', 'plazas']) {
      const w = wharfWorld();
      w.milestone = 'city';   // the plaza unlocks with the City
      const o = w.oases[0];
      const free = (x, y) => inBounds(w.size, x, y) && w.terrain[idx(w.size, x, y)] === T.DESERT && !w.occ[idx(w.size, x, y)];
      let near = null, far = null;
      for (let y = 1; y < w.size - 1 && !(near && far); y++) {
        for (let x = 1; x < w.size - 1; x++) {
          if (!free(x, y)) continue;
          const d = Math.hypot(x - o.x, y - o.y);
          if (!near && d > o.r + 2 && oasisNear(w, x, y, OASES.near - 0.5)) near = [x, y];
          if (!far && !oasisNear(w, x, y, OASES.near + 6)) far = [x, y];
        }
      }
      expect(near !== null && far !== null).toBe(true);
      const paint = kind === 'houses' ? paintHouseTiles : paintPlazaTiles;
      const fired = [], seam = createMapUi({ world: w, fireTip: (t) => fired.push(t) });
      const rFar = paint(w, [far]);
      expect([kind, rFar.ok, rFar.ids.length]).toEqual([kind, true, 1]);
      seam.onCommand({ kind, result: rFar });
      expect([kind, fired]).toEqual([kind, []]);
      const rNear = paint(w, [near]);
      expect([kind, rNear.ok, rNear.ids.length]).toEqual([kind, true, 1]);
      seam.onCommand({ kind, result: rNear });
      expect([kind, fired]).toEqual([kind, ['oasisBuilt']]);
    }
  });

  it('has its words: the first, the tip (listed in How to play) and their numbers from the sim\'s data', () => {
    expect(FIRST_TEXT.first_oasis.head).toBe('An oasis in the desert');
    expect(FIRST_TEXT.first_oasis.why).toContain(`${OASES.near} tiles`);
    expect(FIRST_TEXT.first_oasis.why).toContain(`${OASES.pool[0]} to ${OASES.pool[1]} tiles`);
    expect(TIPS.find((t) => t.id === 'oasis_green')).toEqual({ id: 'oasis_green', trigger: 'oasisBuilt', priority: false });
    expect(TIP_TEXT.oasis_green.length > 20 && TIP_HELP_TEXT.oasis_green.length > 20).toBe(true);
    expect(TIP_TEXT.oasis_green).toContain('river, not an oasis');
    const words = (s) => s.trim().split(" ").length;
    expect(words(TIP_TEXT.oasis_green) <= 20 && words(TIP_HELP_TEXT.oasis_green) <= 20).toBe(true);   // the tips test limit
  });
});

describe('s47 oasis herds', () => {
  it('weights the herd spawn towards an oasis: more herds stand near one than on the same map without', () => {
    let withO = 0, without = 0, sample = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const a = createWorld({ seed, mapVariant: 'east', size: 80 }), b = createWorld({ seed, mapVariant: 'east', size: 80 });
      if (!a.oases.length) continue;
      const oases = a.oases.map((o) => ({ ...o }));
      b.oases = [];
      for (const w of [a, b]) { w.milestone = 'town'; wildlifeDay(w); }
      const near = (w) => w.wildlife.herds.filter((h) => oases.some((o) => Math.hypot(h.x - o.x, h.y - o.y) <= o.r + OASES.herdReach[1] + 2)).length;
      withO += near(a); without += near(b); sample++;
      for (const h of a.wildlife.herds) {   // herds keep to desert and rock, never the pool or its ring
        const t = a.terrain[idx(a.size, h.x, h.y)];
        expect([seed, t === T.DESERT || t === T.ROCKY]).toEqual([seed, true]);
      }
    }
    expect(sample >= 25).toBe(true);
    expect(withO > without * 2).toBe(true);
  });
});
