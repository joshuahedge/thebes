// Road-reach cover by one kind of service building (Stage 4.5): the physician and the police post cover homes the way the
// firehouse covers buildings (src/sim/fire.js fireCoverage, fireCause). One function builds both for a type and its reach.
//
// coverageMap(world, type, reach): building id -> coverage 0..1: the best staffing ratio among the working buildings of that
// type (25% staff or more, not paused, not in the fire stage) whose road reach (reach tiles) takes in a road tile next to it.
// Buildings none reaches are not in the map. Cached outside the world on the road version and a signature of every building's
// id, place and size and of the service buildings' staff, pause and fire stage. Read-only.
// coverCause(world, b, type, reach): why a building is or is not covered, { cause, cover, service }: 'covered' (coverage of
// staffedAt or more), 'no_road', 'none' (nothing of that type within reach), or the best one that does reach it:
// 'short' (short of workers), 'burning' or 'paused'; service is that building's id (or null).
import { allBuildings } from './world.js';
import { roadReach, adjacentRoadTiles } from './reach.js';
import { isWorking, staffRatio } from './labour.js';

const caches = new Map();   // type -> WeakMap(world -> { key, map })
const inFireStage = (b) => Boolean(b.fire && b.fire.stage === 'fire');

function keyOf(world, type) {
  let h = 0x811c9dc5, n = 0;
  for (const b of allBuildings(world)) {
    n++;
    h = Math.imul(h ^ b.id, 16777619);
    h = Math.imul(h ^ (b.x * 256 + b.y), 16777619);
    h = Math.imul(h ^ (b.w * 4 + b.d), 16777619);
    if (b.type === type) h = Math.imul(h ^ ((b.staff | 0) * 4 + (b.paused ? 1 : 0) + (inFireStage(b) ? 2 : 0) + 1000), 16777619);
  }
  return `${world.roadVersion}|${n}|${h}`;
}

export function coverageMap(world, type, reach) {
  const key = keyOf(world, type);
  let byWorld = caches.get(type);
  if (!byWorld) { byWorld = new WeakMap(); caches.set(type, byWorld); }
  const c = byWorld.get(world);
  if (c && c.key === key) return c.map;
  const best = new Map();   // road tile -> the best staffing ratio of a working service reaching it
  for (const f of allBuildings(world)) {
    if (f.type !== type || !isWorking(world, f)) continue;
    const ratio = staffRatio(world, f);
    for (const t of roadReach(world, f, reach).keys()) if (ratio > (best.get(t) || 0)) best.set(t, ratio);
  }
  const map = new Map();
  if (best.size) {
    for (const b of allBuildings(world)) {
      let v = 0;
      for (const t of adjacentRoadTiles(world, b)) v = Math.max(v, best.get(t) || 0);
      if (v > 0) map.set(b.id, v);
    }
  }
  byWorld.set(world, { key, map });
  return map;
}

export function coverCause(world, b, type, reach, staffedAt) {
  const cover = coverageMap(world, type, reach).get(b.id) || 0;
  const roads = adjacentRoadTiles(world, b);
  let pick = null, rank = -1;
  if (roads.length) {
    for (const f of allBuildings(world)) {
      if (f.type !== type) continue;
      const r = roadReach(world, f, reach);
      if (!roads.some((t) => r.has(t))) continue;
      const rk = inFireStage(f) ? 1 : f.paused ? 0 : 2 + staffRatio(world, f);
      if (rk > rank) { rank = rk; pick = f; }
    }
  }
  let cause;
  if (cover >= staffedAt) cause = 'covered';
  else if (!roads.length) cause = 'no_road';
  else if (!pick) cause = 'none';
  else cause = inFireStage(pick) ? 'burning' : pick.paused ? 'paused' : 'short';
  return { cause, cover, service: pick ? pick.id : null };
}
