// What a map holds near its start area (Stage 4.7, Task 1, ruling 461): how many clay pits, gem mines and grain farms the player can
// build within reach of the start area's centre (map.focus), measured with the game's own placing rule (src/sim/fit.js fitOf). The map
// generator guarantees the numbers in RESOURCES (src/data/s47.js) on every new map (repairResources, below) and the tests sweep them.
import { BUILDINGS } from '../data/buildings.js';
import { fitOf } from './fit.js';
import { T, TERRAIN_BY_NAME } from './terrain.js';
import { hash2 } from './rng.js';
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { MAP } from '../data/map.js';
import { RESOURCES, S47_SALT, resourceReach } from '../data/s47.js';

// The three buildings the guarantee counts, by the key of RESOURCES.
export const RESOURCE_TYPES = { clay: 'clay_pit', mine: 'gem_mine', farm: 'farm_grain' };

// Every spot where `type` (2x2) may stand on the map's ground, nearest the start area first: { x, y, dist } with (x, y) the footprint's
// corner and dist the straight distance from the start area's centre tile to the footprint's centre. Ground only: no water under
// it, none on the start road, and fitOf's terrain rule holds (clay: 2 of 4 tiles; mine and farm: all 4). `need` overrides the number
// of tiles that must be on the building's ground (the Stage 4.5 rule asked for all 4 under a clay pit: pass 4 to count by it).
// map is { size, terrain, focus, startRoad } (generateMap's result, or a world with those fields).
export function spotsFor(map, type, need = 0) {
  const { size, terrain, focus } = map;
  const want = TERRAIN_BY_NAME[BUILDINGS[type].terrain];
  const road = new Set((map.startRoad || []).map(([x, y]) => idx(size, x, y)));
  const fake = { size, terrain };
  const out = [];
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const a = idx(size, x, y), b = a + 1, c = a + size, d = c + 1;
      const n = (terrain[a] === want) + (terrain[b] === want) + (terrain[c] === want) + (terrain[d] === want);
      if (n < 2 || (need && n < need)) continue;
      if (terrain[a] === T.WATER || terrain[b] === T.WATER || terrain[c] === T.WATER || terrain[d] === T.WATER) continue;
      if (road.has(a) || road.has(b) || road.has(c) || road.has(d)) continue;
      if (!fitOf(fake, type, x, y).ok) continue;
      out.push({ x, y, dist: Math.hypot(x + 0.5 - focus.x, y + 0.5 - focus.y) });
    }
  }
  return out.sort((p, q) => p.dist - q.dist || p.y - q.y || p.x - q.x);
}

// How many of the spots (nearest first) can stand together: each takes a 2x2 footprint that no earlier one overlaps. within: only
// spots at most this far from the start area's centre count (default: the whole map).
export function packed(spots, within = Infinity) {
  const used = new Set();
  let n = 0;
  for (const s of spots) {
    if (s.dist > within) break;
    const k = [s.y * 4096 + s.x, s.y * 4096 + s.x + 1, (s.y + 1) * 4096 + s.x, (s.y + 1) * 4096 + s.x + 1];
    if (k.some((t) => used.has(t))) continue;
    for (const t of k) used.add(t);
    n++;
  }
  return n;
}

// The guarantee's numbers for a map: for each of clay, mine and farm, { near, nearest, all }: the fits within reach (packed), the
// distance to the nearest one anywhere (null when there is none) and the fits on the whole map (packed).
export function resourceCounts(map, reach) {
  const out = {};
  for (const [key, type] of Object.entries(RESOURCE_TYPES)) {
    const spots = spotsFor(map, type);
    out[key] = { near: packed(spots, reach), nearest: spots.length ? spots[0].dist : null, all: packed(spots) };
  }
  return out;
}

// ── The repair (Task 1, ruling 461) ──
// repairResources(map, seed): checks the guarantee and mends what a draw missed, in place on map.terrain, deterministically: the only
// draws are hash2 tie-breaks keyed by the seed and S47_SALT.resources, so a map is still a function of (seed, size, layout). It never
// rejects a seed and touches nothing when the map already holds enough, so a map that meets the guarantee is byte-identical.
//   clay   fewer than 2 clay-pit fits in reach: the nearest clay patch is widened (a bank stretch turned to clay if none lies near, then
//          the dry ground inland of it, layer by layer)
//   mine   no gem-mine fit in reach: a rocky patch is grown on open ground nearest the existing rock (a skirt for an outcrop that lies
//          just out of reach), kept off the river and the start area as the generator keeps every outcrop
//   farm   fewer than 6 farm fits in reach: the fertile band is widened over the open ground beside it
// ranges: the x ranges the layout keeps its rock in (a skirt stays in them when it can). mine: false skips the mine repair (classic at Normal, ruling 332/351: its rock never moves). Returns the tiles changed per kind: { clay, mine, farm } (all 0 when nothing needed mending).
const DRY = (t) => t === T.DESERT || t === T.MEADOW || t === T.FERTILE;
const CLAY_INLAND = 4;   // the farthest from water (tiles) the clay repair widens inland (Task 1 review: 48 island seed 185 once reached 5)
const OPEN = (t) => t === T.DESERT || t === T.MEADOW;   // ground a repair may take without touching what the generator made on purpose

export function repairResources(map, seed, ranges = null, { mine = true } = {}) {
  const { size, terrain, focus } = map;
  const reach = resourceReach(size);
  const salt = (seed + S47_SALT.resources) | 0;
  const road = new Set((map.startRoad || []).map(([x, y]) => idx(size, x, y)));
  const tie = (i, k = 0) => hash2(i, k, salt);
  const dist = (i) => Math.hypot((i % size) - focus.x, Math.floor(i / size) - focus.y);
  const done = { clay: 0, mine: 0, farm: 0 };
  const enough = (key) => packed(spotsFor(map, RESOURCE_TYPES[key]), reach) >= RESOURCES[key];
  const near4 = (i) => {
    const x = i % size, y = (i - x) / size;
    return NEIGHBOURS4.filter(([dx, dy]) => inBounds(size, x + dx, y + dy)).map(([dx, dy]) => (y + dy) * size + x + dx);
  };
  const near8 = (i) => {
    const x = i % size, y = (i - x) / size, out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && inBounds(size, x + dx, y + dy)) out.push((y + dy) * size + x + dx);
    return out;
  };
  const byNear = (a, b) => dist(a) - dist(b) || tie(a) - tie(b) || a - b;
  // Chebyshev tiles from the nearest water tile (255 where there is none), one breadth-first pass; water never changes in a repair.
  let wdCache = null;
  const waterDist = () => {
    if (wdCache) return wdCache;
    const wd = new Uint8Array(size * size).fill(255);
    const queue = [];
    for (let i = 0; i < terrain.length; i++) if (terrain[i] === T.WATER) { wd[i] = 0; queue.push(i); }
    for (let k = 0; k < queue.length; k++) for (const n of near8(queue[k])) if (wd[n] > wd[queue[k]] + 1) { wd[n] = wd[queue[k]] + 1; queue.push(n); }
    return (wdCache = wd);
  };

  // Clay: widen the clay patch nearest the start; with none in reach (or every third round, if widening is not enough), turn the bank
  // stretch nearest the start to clay first.
  const mendClay = () => {
    let stalled = false;   // widening got nowhere (the patch is at the edge of reach): the next round turns a nearer bank stretch to clay
    for (let round = 0; round < 24 && !enough('clay'); round++) {
      const clay = [];
      let banks = [];
      for (let i = 0; i < terrain.length; i++) {
        if (road.has(i)) continue;
        if (terrain[i] === T.CLAY && dist(i) <= reach) clay.push(i);
        else if (terrain[i] === T.BANK) banks.push(i);
      }
      let grown = 0;
      if (!clay.length || stalled || round % 3 === 2) {
        banks = banks.filter((i) => dist(i) <= reach + 4).sort(byNear);
        if (!banks.length) break;
        const stretch = [banks[0]], seen = new Set(stretch);
        for (let k = 0; k < stretch.length && stretch.length < 8; k++) {
          for (const n of near8(stretch[k]).sort(byNear)) {
            if (stretch.length < 8 && !seen.has(n) && terrain[n] === T.BANK && !road.has(n)) { seen.add(n); stretch.push(n); }
          }
        }
        for (const b of stretch) { terrain[b] = T.CLAY; grown++; }
      }
      // the dry ground inland of the clay in reach: one layer, nearest the start first, at most 10 tiles a round
      const front = [];
      for (let i = 0; i < terrain.length; i++) if (terrain[i] === T.CLAY && !road.has(i) && dist(i) <= reach) front.push(i);
      const wd = waterDist();   // clay stays within CLAY_INLAND tiles of water: the widening never leaves the bank's neighbourhood
      const targets = [...new Set(front.flatMap(near4))].filter((n) => DRY(terrain[n]) && !road.has(n) && dist(n) <= reach + 2 && wd[n] <= CLAY_INLAND).sort(byNear).slice(0, 10);
      for (const n of targets) { terrain[n] = T.CLAY; grown++; }
      done.clay += grown;
      stalled = !grown;
    }
  };

  // Mine: a rocky blob (radius 2 and a ragged edge) on open ground, its centre 11 or more tiles from the start and 8 or more from water (the
  // generator's own rules for an outcrop), in reach, and as near the existing rock as it can be: so an outcrop just out of reach gains a skirt.
  const mendMine = () => {
    if (enough('mine')) return;
    const wd = waterDist();
    const rock = [];
    for (let i = 0; i < terrain.length; i++) if (terrain[i] === T.ROCKY) rock.push(i);
    const toRock = (i) => rock.reduce((m, r) => Math.min(m, Math.hypot((r % size) - (i % size), Math.floor(r / size) - Math.floor(i / size))), 99);
    const fits = (i, awayWater, maxDist) => {
      const x = i % size, y = (i - x) / size, d = dist(i);
      if (d < MAP.rockAwayStart || d > maxDist || wd[i] <= awayWater) return false;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (!inBounds(size, x + dx, y + dy)) return false;
        const j = (y + dy) * size + x + dx;
        if (road.has(j) || !(OPEN(terrain[j]) || terrain[j] === T.ROCKY)) return false;
      }
      return true;
    };
    const inRange = (i) => !ranges || ranges.some(([x0, x1]) => (i % size) >= x0 && (i % size) <= x1);   // in the x ranges the layout keeps its rock in, if one is open
    for (const [keep, awayWater, maxDist] of [[true, MAP.rockAwayTiles, reach - 2], [true, 7, reach - 2], [false, 7, reach - 2], [false, 7, reach - 1]]) {
      const sites = [];
      for (let i = 0; i < terrain.length; i++) if ((!keep || inRange(i)) && fits(i, awayWater, maxDist)) sites.push(i);
      if (!sites.length) continue;
      const scored = sites.map((i) => ({ i, s: rock.length ? Math.round(toRock(i)) : 0 })).sort((a, b) => a.s - b.s || tie(a.i, 1) - tie(b.i, 1) || a.i - b.i);
      const c = scored[0].i, cx = c % size, cy = (c - cx) / size;
      for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) {
        if (!inBounds(size, x, y)) continue;
        const j = y * size + x;
        if (!OPEN(terrain[j]) || road.has(j)) continue;
        if (Math.hypot(x - cx, y - cy) <= 2 + hash2(x, y, (seed + S47_SALT.mineBlob) | 0) * 0.9) { terrain[j] = T.ROCKY; done.mine++; }
      }
      return;
    }
  };

  // Farms: widen the fertile band over the open ground beside it (4-neighbours of fertile ground and of the bank), nearest the start first.
  const mendFarm = () => {
    for (let round = 0; round < 12 && !enough('farm'); round++) {
      const src = [];
      for (let i = 0; i < terrain.length; i++) if ((terrain[i] === T.FERTILE || terrain[i] === T.BANK) && dist(i) <= reach + 2) src.push(i);
      const targets = [...new Set(src.flatMap(near4))].filter((n) => OPEN(terrain[n]) && !road.has(n) && dist(n) <= reach).sort(byNear).slice(0, 24);
      if (!targets.length) break;
      for (const n of targets) { terrain[n] = T.FERTILE; done.farm++; }
    }
  };

  mendClay();
  if (mine) mendMine();
  mendFarm();
  if (done.clay || done.mine || done.farm) { mendClay(); mendFarm(); }   // mending clay takes fertile ground, a farm band takes open ground: once more in case one undid another
  return done;
}
