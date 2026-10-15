// Stage 4.7 Task 3 (ruling 464): hills on new-land maps. Counts by size, where they may lie, their rocky skirt, and the connectivity invariant
// (nothing the start area reached is cut off, the raiders' entries and the bridge spot stay joined to it) over 200 seeds of every size and layout.
import { describe, it, expect } from '../../harness.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { createWorld } from '../../../src/sim/world.js';
import { MAP_VARIANTS, MAP_SIZES } from '../../../src/data/map.js';
import { HILLS, S47_SALT, hasNewLand } from '../../../src/data/s47.js';
import { T, passable, buildable } from '../../../src/sim/terrain.js';
import { idx, inBounds, NEIGHBOURS4 } from '../../../src/sim/grid.js';
import { bridgeSpot } from '../../../src/sim/bridges.js';
import { hillRange, landReach } from '../../../src/sim/hills.js';
import { poolTiles } from '../../../src/sim/oases.js';

const SIZES = Object.values(MAP_SIZES), SEEDS = 200;
const classicNormal = (variant, size) => variant === 'classic' && size === 64;

// Every map of seeds 1..SEEDS at each size and layout, made once for this file's sweeps.
let cache = null;
function maps() {
  if (cache) return cache;
  cache = [];
  for (const size of SIZES) for (const variant of MAP_VARIANTS) for (let seed = 1; seed <= SEEDS; seed++) cache.push({ size, variant, seed, m: generateMap(seed, size, variant) });
  return cache;
}
const hillTiles = (m) => { const out = []; for (let i = 0; i < m.terrain.length; i++) if (m.terrain[i] === T.HILLS) out.push([i % m.size, Math.floor(i / m.size)]); return out; };
// A world-shaped view of a generated map, so the shared passable and buildable rules read it (no road yet).
const view = (m) => ({ size: m.size, terrain: m.terrain, road: new Uint8Array(m.size * m.size), occ: new Uint8Array(m.size * m.size) });
// The hill clusters of a map: 8-neighbour components of its hill tiles.
function clusters(m) {
  const left = new Set(hillTiles(m).map(([x, y]) => idx(m.size, x, y))), out = [];
  while (left.size) {
    const first = left.values().next().value, comp = [first];
    left.delete(first);
    for (let k = 0; k < comp.length; k++) {
      const x = comp[k] % m.size, y = (comp[k] - x) / m.size;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const n = idx(m.size, x + dx, y + dy);
        if (inBounds(m.size, x + dx, y + dy) && left.has(n)) { left.delete(n); comp.push(n); }
      }
    }
    out.push(comp);
  }
  return out;
}
// The tiles a walker reaches from the start area by the shared passable rule, 4 directions, with the bridge spot's crossing joined (a bridge, as the
// road tool lays one): independent of src/sim/hills.js' own walk.
function reachBy(m, spot) {
  const w = view(m), n = m.size, seen = new Uint8Array(n * n), q = [idx(n, m.focus.x, m.focus.y)];
  const a = spot ? idx(n, spot.from[0], spot.from[1]) : -1, b = spot ? idx(n, spot.to[0], spot.to[1]) : -1;
  seen[q[0]] = 1;
  for (let k = 0; k < q.length; k++) {
    const x = q[k] % n, y = (q[k] - x) / n, nb = NEIGHBOURS4.map(([dx, dy]) => [x + dx, y + dy]).filter(([tx, ty]) => inBounds(n, tx, ty)).map(([tx, ty]) => idx(n, tx, ty));
    if (q[k] === a) nb.push(b); else if (q[k] === b) nb.push(a);
    for (const j of nb) if (!seen[j] && passable(w, j)) { seen[j] = 1; q.push(j); }
  }
  return seen;
}

describe('s47 hills', () => {
  it('holds up to 2-5 spines on Normal (scaled by area: 1-3 on Small, 3-8 on Large) on new-land maps, each of 6-50 tiles, nearly always the full draw, and none on classic at Normal', () => {
    const bad = [], seen = {};
    let short = 0, total = 0;
    for (const { size, variant, seed, m } of maps()) {
      const cs = clusters(m), key = `${size} ${variant}`;
      (seen[key] = seen[key] || new Set()).add(cs.length);
      if (classicNormal(variant, size)) { if (cs.length || m.params.hills) bad.push(`${key} #${seed}: hills on classic 64`); continue; }
      const [lo, hi] = hillRange(size);
      total++;
      if (cs.length > hi) bad.push(`${key} #${seed}: ${cs.length} spines, at most ${hi}`);
      if (cs.length < lo) short++;   // a Small map with a lake and a narrow rock range may have no belt long enough for a spine; the sweep says how often
      for (const c of cs) if (c.length < HILLS.minTiles || c.length > 50) bad.push(`${key} #${seed}: a spine of ${c.length} tiles`);
      if ((m.params.hills || []).length !== cs.length || (m.params.hills || []).reduce((s, h) => s + h.n, 0) !== hillTiles(m).length) bad.push(`${key} #${seed}: params.hills`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect([hillRange(48), hillRange(64), hillRange(80)]).toEqual([[1, 3], [2, 5], [3, 8]]);
    expect(short / total < 0.03).toBe(true);
    expect([...seen['64 east']].every((n) => n >= 2 && n <= 5) && seen['64 east'].size >= 3).toBe(true);   // the seeded draw really varies
  });

  it('gives every new-land map at least one rock belt (200 seeds of every size and layout), and none on classic at Normal', () => {
    const bad = [];
    for (const { size, variant, seed, m } of maps()) {
      if (classicNormal(variant, size)) { if (m.belts.length) bad.push(`${size} ${variant} #${seed}: belts on classic 64`); continue; }
      if (!m.belts.length) bad.push(`${size} ${variant} #${seed}: no belt`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it('keeps the plan\'s distances: 7 from any water, 9 from an oasis pool, off the start area, raider entries, the trade entry, the bridge spot and the start road', () => {
    const bad = [];
    for (const { size, variant, seed, m } of maps()) {
      const hills = hillTiles(m);
      if (!hills.length) continue;
      const tag = `${size} ${variant} #${seed}`, w = view(m), spot = bridgeSpot(w, m.focus);
      const water = [];
      for (let i = 0; i < m.terrain.length; i++) if (m.terrain[i] === T.WATER) water.push([i % size, Math.floor(i / size)]);
      const pool = poolTiles({ size, terrain: m.terrain, oases: m.oases }).map((i) => [i % size, Math.floor(i / size)]);
      for (const [x, y] of hills) {
        if (water.some(([wx, wy]) => Math.max(Math.abs(wx - x), Math.abs(wy - y)) < HILLS.fromWater)) bad.push(`${tag}: hill ${x},${y} within ${HILLS.fromWater} of water`);
        if (pool.some(([px, py]) => Math.max(Math.abs(px - x), Math.abs(py - y)) < HILLS.fromOasis)) bad.push(`${tag}: hill ${x},${y} within ${HILLS.fromOasis} of an oasis`);
        if (Math.hypot(x - m.focus.x, y - m.focus.y) < HILLS.fromStart) bad.push(`${tag}: hill ${x},${y} on the start area`);
        for (const e of [...m.raiderEntries, m.tradeEntry]) if (Math.hypot(x - e.x, y - e.y) < HILLS.fromEntry) bad.push(`${tag}: hill ${x},${y} by an entry`);
        if (spot && Math.hypot(x - spot.x, y - spot.y) < HILLS.fromEntry) bad.push(`${tag}: hill ${x},${y} by the bridge spot`);
        if (m.startRoad.some(([rx, ry]) => Math.max(Math.abs(rx - x), Math.abs(ry - y)) < HILLS.fromRoad)) bad.push(`${tag}: hill ${x},${y} on the start road`);
        if (Math.min(x, y, size - 1 - x, size - 1 - y) < HILLS.fromEdge) bad.push(`${tag}: hill ${x},${y} by an edge`);
      }
      for (const e of [...m.raiderEntries, m.tradeEntry]) if (m.terrain[idx(size, e.x, e.y)] === T.HILLS) bad.push(`${tag}: an entry on hills`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it('rings every cluster with rocky ground: each open tile beside a hill is rock', () => {
    const bad = [];
    let rocky = 0;
    for (const { size, variant, seed, m } of maps()) {
      for (const [x, y] of hillTiles(m)) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!inBounds(size, x + dx, y + dy)) continue;
          const t = m.terrain[idx(size, x + dx, y + dy)];
          if (t === T.DESERT || t === T.MEADOW) bad.push(`${size} ${variant} #${seed}: open ground ${x + dx},${y + dy} beside hill ${x},${y}`);
          if (t === T.ROCKY) rocky++;
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(rocky > 1000).toBe(true);
  });

  it('keeps the map joined on 200 seeds of every size and layout: the start area still reaches every raider entry, the trade entry and both ends of the bridge spot, and 90% of the buildable land', () => {
    const bad = [];
    let worst = 1;
    for (const { size, variant, seed, m } of maps()) {
      const hills = hillTiles(m);
      if (!hills.length) continue;
      const w = view(m), tag = `${size} ${variant} #${seed}`, spot = bridgeSpot(w, m.focus);
      const reach = reachBy(m, spot);
      for (const e of [...m.raiderEntries, m.tradeEntry]) if (!reach[idx(size, e.x, e.y)]) bad.push(`${tag}: entry ${e.x},${e.y} cut off`);
      if (spot) for (const [x, y] of [spot.from, spot.to]) if (!reach[idx(size, x, y)]) bad.push(`${tag}: bridge spot end ${x},${y} cut off`);
      // the same map with its hills made rock: what the start area reached then, it still reaches now (the hill tiles aside), so no hill cut anything off
      const flat = { ...m, terrain: m.terrain.slice() };
      for (let i = 0; i < flat.terrain.length; i++) if (flat.terrain[i] === T.HILLS) flat.terrain[i] = T.ROCKY;
      const before = reachBy(flat, spot);
      let joinedBefore = 0, joined = 0, lost = 0;
      for (let i = 0; i < m.terrain.length; i++) {
        if (!buildable(w, i)) continue;   // the hill tiles are not land any more
        joined += reach[i];
        joinedBefore += before[i];
        if (before[i] && !reach[i]) lost++;
      }
      if (lost) bad.push(`${tag}: ${lost} tiles cut off by the hills`);
      worst = Math.min(worst, joined / joinedBefore);
      if (joined / joinedBefore < 0.9) bad.push(`${tag}: only ${(100 * joined / joinedBefore).toFixed(1)}% of the land the start area reached is still joined`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(worst >= 0.9).toBe(true);
  });

  it('agrees with the generator\'s own walk (landReach) and treats the shared passable rule as terrain-only: no hill tile is passable, every other land tile is', () => {
    for (const [seed, variant] of [[3, 'east'], [9, 'island'], [14, 'wide-bends']]) {
      const m = generateMap(seed, 64, variant), w = view(m), spot = bridgeSpot(w, m.focus);
      const a = reachBy(m, spot), b = landReach(m.terrain, m.size, m.focus, spot);
      expect(a.every((v, i) => v === b[i])).toBe(true);
      for (let i = 0; i < m.terrain.length; i++) expect(passable(w, i)).toBe(m.terrain[i] !== T.HILLS && m.terrain[i] !== T.WATER);
    }
  });

  it('is a function of the seed, size and layout alone (S47 salts, never the generator stream), and a world keeps its hills', () => {
    const a = generateMap(7, 64, 'east'), b = generateMap(7, 64, 'east');
    expect(hillTiles(a)).toEqual(hillTiles(b));
    expect(hillTiles(a).length > 0).toBe(true);
    expect([S47_SALT.hills, S47_SALT.hillShape, S47_SALT.hillSkirt, S47_SALT.hillLook, S47_SALT.belts]).toEqual([4701, 4702, 4703, 4713, 4714]);
    const w = createWorld({ seed: 7, mapVariant: 'east', size: 64 });
    expect(hasNewLand(w)).toBe(true);
    expect(w.terrain.filter((t) => t === T.HILLS).length).toBe(hillTiles(a).length);
    expect(w.mapParams.hills).toEqual(a.params.hills);
    const c = createWorld({ seed: 7, mapVariant: 'classic', size: 64 });
    expect(c.terrain.includes(T.HILLS)).toBe(false);
    expect(c.mapParams.hills).toBe(undefined);
  });
});
