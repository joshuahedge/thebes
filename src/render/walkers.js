// Cosmetic walkers (spec 4.5): water carriers, priests, porters and citizens pacing the roads inside each
// working building's reach. Positions are a pure function of the world and the time, so nothing is
// stored in the world and the same frame always looks the same.
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from '../sim/world.js';
import { roadReach } from '../sim/reach.js';
import { isWorking } from '../sim/labour.js';
import { idx, inBounds, NEIGHBOURS4 } from '../sim/grid.js';
import { hash2 } from '../sim/rng.js';

export const WALKER_CAP = 40;
export const TILES_PER_DAY = 3;   // at 1x a day lasts 2/3 s, so a tile takes about 0.22 s
export const CITIZEN_RANGE = 4;
export const CITIZEN_SHARE = 0.15;
export const KIND_BY_TYPE = { well: 'water', temple: 'priest', bazaar: 'porter', granary: 'porter' };

const reachFor = (def) => def.reach || def.supplyReach || def.producerReach || 6;

export function walkerLoop(world, b, maxDist) {
  const reach = roadReach(world, b, maxDist);
  if (!reach.size) return [];
  let far = -1, farD = -1;
  for (const [t, d] of reach) if (d > farD || (d === farD && t < far)) { far = t; farD = d; }
  const path = [far];
  let cur = far, d = farD;
  while (d > 1) {
    const x = cur % world.size, y = (cur - x) / world.size;
    let next = -1;
    for (const [dx, dy] of NEIGHBOURS4) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(world.size, nx, ny)) continue;
      const nt = idx(world.size, nx, ny);
      if (reach.get(nt) === d - 1 && (next < 0 || nt < next)) next = nt;
    }
    if (next < 0) break;
    path.push(next);
    cur = next;
    d--;
  }
  path.reverse();
  const tiles = path.map((t) => ({ x: t % world.size, y: (t - (t % world.size)) / world.size }));
  return tiles.concat(tiles.slice(1, -1).reverse());
}

const cache = new WeakMap(); // world -> { version, loops: Map<"id:maxDist", loop> }

function loopFor(world, b, maxDist) {
  let c = cache.get(world);
  if (!c || c.version !== world.roadVersion) {
    c = { version: world.roadVersion, loops: new Map() };
    cache.set(world, c);
  }
  const key = `${b.id}:${maxDist}`;
  let loop = c.loops.get(key);
  if (!loop) {
    loop = walkerLoop(world, b, maxDist);
    c.loops.set(key, loop);
  }
  return loop;
}

function positionOn(loop, timeDays, id, kind) {
  if (!loop.length) return null;
  if (loop.length === 1) return { id, kind, x: loop[0].x + 0.5, y: loop[0].y + 0.5, dir: 2 };
  const phase = hash2(id, 0, 1) * loop.length;
  const s = (timeDays * TILES_PER_DAY + phase) % loop.length;
  const i = Math.floor(s), f = s - i;
  const a = loop[i], b = loop[(i + 1) % loop.length];
  const dir = b.x > a.x ? 1 : b.x < a.x ? 3 : b.y > a.y ? 2 : 0;
  return { id, kind, x: a.x + (b.x - a.x) * f + 0.5, y: a.y + (b.y - a.y) * f + 0.5, dir };
}

// `range` ({ x0, y0, x1, y1 } in tiles, the renderer's visible range) keeps the capped crowd where the
// player looks: a building whose loop reach cannot touch the range is skipped before the cap applies.
const outOfRange = (b, maxDist, range) => Boolean(range) && (
  b.x + b.w - 1 + maxDist < range.x0 || b.x - maxDist > range.x1 ||
  b.y + b.d - 1 + maxDist < range.y0 || b.y - maxDist > range.y1);

export function walkersAt(world, timeDays, range = null) {
  const out = [];
  for (const b of allBuildings(world)) {
    if (out.length >= WALKER_CAP) break;
    const kind = KIND_BY_TYPE[b.type];
    if (!kind || !isWorking(world, b)) continue;
    const maxDist = reachFor(BUILDINGS[b.type]);
    if (outOfRange(b, maxDist, range)) continue;
    const w = positionOn(loopFor(world, b, maxDist), timeDays, b.id, kind);
    if (w) out.push(w);
  }
  for (const h of housesOf(world)) {
    if (out.length >= WALKER_CAP) break;
    if (h.residents <= 0 || hash2(h.x, h.y, world.seed + 13) >= CITIZEN_SHARE) continue;
    if (outOfRange(h, CITIZEN_RANGE, range)) continue;
    const kind = hash2(h.x, h.y, world.seed + 14) < 0.5 ? 'citizen' : 'woman';
    const w = positionOn(loopFor(world, h, CITIZEN_RANGE), timeDays, h.id, kind);
    if (w) out.push(w);
  }
  return out;
}
