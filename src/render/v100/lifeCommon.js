// Version 10.0, Track L (rulings 2200-2259): what life's sources share. Each source (townsfolk.js, crowd.js, riverLife.js, builders.js, night.js,
// weather.js) is a pure function of the world, the time and a hash: it reads the world and never writes it, and keeps no state in it.
import { hash2 } from '../../sim/rng.js';
import { buildingsInRange } from '../chunkIndex.js';

// Each source's hash salt, so two sources never pick the same homes or tiles in step.
export const LIFE_SALT = { idle: 2201, pose: 2202, spot: 2203, bank: 2204, crowd: 2211, stall: 2212, river: 2221, heron: 2222, croc: 2223, hippo: 2224, felucca: 2225,
  builder: 2231, hearth: 2241, flicker: 2242, storm: 2251, shimmer: 2252, line: 2261 };

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const unit = (a, b, seed, salt) => hash2(a | 0, b | 0, ((seed | 0) + salt) | 0);

// The middle of the view's tile range, and a building's distance from it (the walkers' measure: nearest the middle first).
export const middleOf = (range) => [(range.x0 + range.x1) / 2, (range.y0 + range.y1) / 2];
export const distTo = (b, mid) => Math.abs(b.x + b.w / 2 - mid[0]) + Math.abs(b.y + b.d / 2 - mid[1]);
export const inRange = (x, y, r) => x >= r.x0 && x <= r.x1 + 1 && y >= r.y0 && y <= r.y1 + 1;
export function nearestFirst(list, range) {
  const mid = middleOf(range);
  return list.map((b) => ({ b, d: distTo(b, mid) })).sort((a, c) => a.d - c.d || a.b.id - c.b.id).map((e) => e.b);
}

// The lived-in homes in the range, nearest the middle first, as townsfolk.js and night.js both walk them: kept a frame to the next for the same range
// (the camera standing) and the same world, made again when the view moves, the buildings change (their count, or the roads), or HOMES_FRESH_MS has
// passed (so a home emptied or filled since is seen within a couple of seconds). A render-side note kept by the world record, never in it.
export const HOMES_FRESH_MS = 2000;
const homesKept = new WeakMap();
export function nearestHomes(world, range, nowMs = 0) {
  const key = `${range.x0},${range.y0},${range.x1},${range.y1}|${world.roadVersion}|${world.nextId}`;
  const had = homesKept.get(world);
  if (had && had.key === key && nowMs >= had.at && nowMs - had.at < HOMES_FRESH_MS) return had.list;
  const list = nearestFirst(buildingsInRange(world, range).filter((b) => b.type === 'house' && b.residents > 0
    && b.x + b.w > range.x0 && b.x <= range.x1 + 1 && b.y + b.d > range.y0 && b.y <= range.y1 + 1), range);
  homesKept.set(world, { key, list, at: nowMs });
  return list;
}

// A figure's fade over its window of `slotMs`, `t` ms into it: in over the first fadeMs, out over the last (never popping on or off).
export const fadeIn = (t, slotMs, fadeMs) => clamp01(Math.min(t, slotMs - t) / fadeMs);

// The direction a figure faces to look along tile vector (dx, dy) on screen: screen x runs with x - y, and a figure drawn facing right is dir 1,
// one mirrored to face left dir 3 (src/render/art/figures.js walkSlotFor).
export const facing = (dx, dy) => (dx - dy >= 0 ? 1 : 3);
