// Cosmetic walkers (spec 4.5): water carriers, priests, porters, firefighters (Stage 3) and citizens pacing the roads
// inside each working building's reach. Positions are a pure function of the world and the time, so nothing is
// stored in the world and the same frame always looks the same.
//
// Stage 4 (spec 5.7 items 3 and 4, rulings 214, 246, 257; Track E): processions, walkers like the rest, so they move on
// game time under every Motion level and hold still while the game is paused. While a festival lasts, each working
// temple's procession comes out of the temple on the day it is held and walks the roads in its reach, out and back,
// round and round (priests with the carried shrine, musicians and dancers: Track B's figure kinds in
// src/render/art/figures.js; a kind the registry does not have yet walks as a priest, so the procession shows before
// Track B's figures land; the temple's streamers are in src/render/procession.js),
// PROCESSION.start figures gaining one for each temple, booth and finished monument up to PROCESSION.max, and streamers
// stand at the temple's two front corners. For PROCESSION.dedicationDays after a monument is finished (its site.done, so
// a reload shows it), a dedication sets out from the nearest temple whose reach meets the monument's road, walks to it
// and back, or walks the monument's own road when no temple does. A figure shows once it has stepped out (its place on
// the road is past the start), so a procession files out one by one. At most PROCESSION.maxOnScreen
// processions, the nearest the middle of the view, only where the view is. Over budget they drop with the ambient
// layer's last kind (render/ambient.js ambientState: rare life, smoke and sway all dropped), not its first: they are a
// few cached sprites, and dropping rare life saves nothing under Gentle (it is off there), so they go only when the frame
// is in real trouble (a contract note asks the controller). The streamers flutter once a second under Full only.
import { BUILDINGS } from '../data/buildings.js';
import { FESTIVAL } from '../data/raids.js';
import { PROCESSION, AMBIENT } from '../data/ambient.js';
import { allBuildings, housesOf } from '../sim/world.js';
import { roadReach, adjacentRoadTiles } from '../sim/reach.js';
import { ambientState } from './ambient.js';
import { ART } from './art/registry.js';
import './procession.js';                                     // the festival temple's streamer slots
import { isWorking } from '../sim/labour.js';
import { idx, inBounds, NEIGHBOURS4 } from '../sim/grid.js';
import { hash2 } from '../sim/rng.js';

export const WALKER_CAP = 40;
export const TILES_PER_DAY = 2;   // at 1x a day lasts 2/3 s, so a tile takes a third of a second
export const CITIZEN_RANGE = 4;
export const CITIZEN_SHARE = 0.15;
export const KIND_BY_TYPE = { well: 'water', temple: 'priest', bazaar: 'porter', granary: 'porter', firehouse: 'firefighter' };

const reachFor = (def) => def.reach || def.supplyReach || def.producerReach || 6;

export function walkerLoop(world, b, maxDist) {
  const reach = roadReach(world, b, maxDist);
  if (!reach.size) return [];
  let far = -1, farD = -1;
  for (const [t, d] of reach) if (d > farD || (d === farD && t < far)) { far = t; farD = d; }
  return outAndBack(world, pathBack(world, reach, far));
}

// The road path from tile `from` back down the reach's distances to a road tile beside the building (distance 1), the
// lowest tile index at each step; then the loop out along it and back.
function pathBack(world, reach, from) {
  const path = [from];
  let cur = from, d = reach.get(from);
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
  return path.reverse();
}
function outAndBack(world, path) {
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
  const phase = hash2(id, 0, 1) * loop.length;
  return positionAt(loop, timeDays * TILES_PER_DAY + phase, id, kind);
}
// The walker at distance s (tiles) along the loop, which it walks round and round.
function positionAt(loop, s, id, kind) {
  if (!loop.length) return null;
  if (loop.length === 1) return { id, kind, x: loop[0].x + 0.5, y: loop[0].y + 0.5, dir: 2 };
  s = ((s % loop.length) + loop.length) % loop.length;
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

// Fills `out` from `cands` ({ b, kind, maxDist }) up to the cap. With a range, the candidates nearest the
// centre of the view go first (ties by id), because the range is a bounding box that can cover most of the map.
function fill(world, timeDays, range, cands, out) {
  if (range) {
    const cx = (range.x0 + range.x1) / 2, cy = (range.y0 + range.y1) / 2;
    for (const c of cands) c.d = Math.abs(c.b.x + c.b.w / 2 - cx) + Math.abs(c.b.y + c.b.d / 2 - cy);
    cands.sort((a, b) => a.d - b.d || a.b.id - b.b.id);
  }
  for (const c of cands) {
    if (out.length >= WALKER_CAP) break;
    const w = positionOn(loopFor(world, c.b, c.maxDist), timeDays, c.b.id, c.kind);
    if (w) out.push(w);
  }
}

export function walkersAt(world, timeDays, range = null) {
  const out = [];
  const services = [];
  for (const b of allBuildings(world)) {
    const kind = KIND_BY_TYPE[b.type];
    if (!kind || !isWorking(world, b)) continue;
    const maxDist = reachFor(BUILDINGS[b.type]);
    if (outOfRange(b, maxDist, range)) continue;
    services.push({ b, kind, maxDist });
  }
  fill(world, timeDays, range, services, out);
  if (out.length >= WALKER_CAP) return out;
  const homes = [];
  for (const h of housesOf(world)) {
    if (h.residents <= 0 || hash2(h.x, h.y, world.seed + 13) >= CITIZEN_SHARE) continue;
    if (outOfRange(h, CITIZEN_RANGE, range)) continue;
    homes.push({ b: h, kind: hash2(h.x, h.y, world.seed + 14) < 0.5 ? 'citizen' : 'woman', maxDist: CITIZEN_RANGE });
  }
  fill(world, timeDays, range, homes, out);
  return out.concat(processionsAt(world, timeDays, range));
}

// ── Processions (Stage 4, Track E) ──

export const PROCESSION_ID_BASE = 200000;   // festival figures: base + temple id x 16 + i (units are 100000 + id)
export const DEDICATION_ID_BASE = 600000;   // dedication figures: base + monument id x 16 + i
export const STREAMER_ID_BASE = 900000;     // streamers: base + temple id x 2 + corner

// Whether a festival is on today (its mood lasts FESTIVAL.days from the day it was held).
export function festivalOn(world) {
  const d = world.danger && world.danger.festivalDay;
  return d !== null && d !== undefined && world.day >= d && world.day - d < FESTIVAL.days;
}

// How many figures a festival's procession has: PROCESSION.start, one more for each temple, booth and finished monument,
// at most PROCESSION.max (spec 5.7: a later festival is visibly bigger).
export function festivalSize(world) {
  let n = PROCESSION.start;
  for (const b of allBuildings(world)) {
    if (b.type === 'temple' || b.type === 'booth') n++;
    else if (BUILDINGS[b.type] && BUILDINGS[b.type].monument && b.site && b.site.done !== null && b.site.done !== undefined) n++;
  }
  return Math.min(PROCESSION.max, n);
}

// The monuments finished in the last PROCESSION.dedicationDays (from site.done, so a reload shows the dedication).
export function dedicationsOn(world) {
  return allBuildings(world).filter((b) => BUILDINGS[b.type] && BUILDINGS[b.type].monument && b.site && b.site.done !== null && b.site.done !== undefined
    && world.day >= b.site.done && world.day - b.site.done < PROCESSION.dedicationDays);
}

// A dedication's road: from the nearest temple (by road, within its reach) to the monument and back; with none in
// reach, along the monument's own road. Cached with the other loops until the roads change.
export function dedicationLoop(world, m) {
  return cached(world, `d${m.id}`, () => {
    const ends = new Set(adjacentRoadTiles(world, m));
    let best = null;
    for (const t of allBuildings(world)) {
      if (t.type !== 'temple') continue;
      const reach = roadReach(world, t, BUILDINGS.temple.reach);
      for (const e of ends) {
        const d = reach.get(e);
        if (d !== undefined && (!best || d < best.d || (d === best.d && (t.id < best.t.id || (t.id === best.t.id && e < best.e))))) best = { t, e, d, reach };
      }
    }
    if (!best) return walkerLoop(world, m, PROCESSION.ownReach);
    return outAndBack(world, pathBack(world, best.reach, best.e));
  });
}

function cached(world, key, make) {
  let c = cache.get(world);
  if (!c || c.version !== world.roadVersion) {
    c = { version: world.roadVersion, loops: new Map() };
    cache.set(world, c);
  }
  if (!c.loops.has(key)) c.loops.set(key, make());
  return c.loops.get(key);
}

// The walker kind a procession figure is drawn as: its own when the registry has the figure (Track B's), else a priest.
export const figureKind = (kind) => (ART[`fig.${kind}`] ? kind : 'priest');

// One procession's figures on a loop, setting out on day `from`: the first leads, the rest follow PROCESSION.spacing
// apart, each showing once it is out.
function figuresOn(loop, timeDays, from, n, idBase) {
  const out = [];
  if (!loop.length) return out;
  const lead = (timeDays - from) * PROCESSION.tilesPerDay;
  for (let i = 0; i < n; i++) {
    const s = lead - i * PROCESSION.spacing;
    if (s < 0) break;
    const w = positionAt(loop, s, idBase + i, figureKind(PROCESSION.order[i % PROCESSION.order.length]));
    if (w) out.push(w);
  }
  return out;
}

// The procession walkers in view: festivals' and dedications', with the festival temples' streamers.
export function processionsAt(world, timeDays, range = null) {
  const state = ambientState(world);
  if (state.dropped.length >= AMBIENT.dropOrder.length) return [];
  const hosts = [];
  if (festivalOn(world)) {
    for (const t of allBuildings(world)) {
      if (t.type !== 'temple' || !isWorking(world, t) || outOfRange(t, BUILDINGS.temple.reach, range)) continue;
      hosts.push({ b: t, kind: 'festival' });
    }
  }
  for (const m of dedicationsOn(world)) if (!outOfRange(m, BUILDINGS.temple.reach, range)) hosts.push({ b: m, kind: 'dedication' });
  if (range) {
    const cx = (range.x0 + range.x1) / 2, cy = (range.y0 + range.y1) / 2;
    const dist = (h) => Math.abs(h.b.x + h.b.w / 2 - cx) + Math.abs(h.b.y + h.b.d / 2 - cy);
    hosts.sort((a, b) => dist(a) - dist(b) || a.b.id - b.b.id);
  }
  const out = [];
  const size = festivalSize(world);
  const flutter = state.level === 'full' && Math.floor(state.now / PROCESSION.flutterMs) % 2 === 1;
  for (const h of hosts.slice(0, PROCESSION.maxOnScreen)) {
    const b = h.b;
    if (h.kind === 'festival') {
      out.push(...figuresOn(loopFor(world, b, BUILDINGS.temple.reach), timeDays, world.danger.festivalDay, size, PROCESSION_ID_BASE + b.id * 16));
      const kind = flutter ? 'streamer2' : 'streamer';
      out.push({ id: STREAMER_ID_BASE + b.id * 2, kind, x: b.x + 0.12, y: b.y + b.d - 0.12, dir: 2 });
      out.push({ id: STREAMER_ID_BASE + b.id * 2 + 1, kind, x: b.x + b.w - 0.12, y: b.y + 0.12, dir: 2 });
    } else {
      out.push(...figuresOn(dedicationLoop(world, b), timeDays, b.site.done, Math.min(PROCESSION.dedicationFigures, size), DEDICATION_ID_BASE + b.id * 16));
    }
  }
  return out;
}
