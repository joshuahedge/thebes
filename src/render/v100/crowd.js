// Version 10.0, Track L (L.3 and L.8, spec 5b and 5g, rulings 2206-2209, 2240-2243): the bazaar's crowd and a festival's onlookers.
//   crowdAt(world, timeDays, nowMs, range, motion, { day }) -> walker entries: a working bazaar with food on its shelf draws 3 + 5 x busy(hour)
//     figures standing about its stalls (busy 1 in the morning, 0.3 at noon, none at night), each moving on to another stall every 6 to 10 game
//     days (a second each at 1x: game time, so they hold while paused) with a short walk between; one short of food draws one figure; a plaza or
//     garden within CROWD.seatReach tiles adds two sitting. At most LIFE.crowdCap a bazaar, CROWD.bazaars bazaars nearest the middle of the view.
//     In the lesson none until its food step is done (spec 5h, Q6: the moment food reaches the bazaar shows as people arriving). On a festival day
//     the crowd has gone to watch the procession (festivalLineAt). A figure past the hour's count fades out over a share of it, never popping.
//   festivalLineAt(world, timeDays, nowMs, range, motion) -> walker entries: on a festival day a line of townsfolk stands along the procession's
//     road, facing it, every other tile of the loop on alternate sides, at most LIFE.lineCap, the processions nearest the middle of the view first.
// Gentle: everyone stands (no walk between stalls); Still: none. Source 'crowd', ids from LIFE_IDS.crowd.
import { LIFE } from '../../data/ambient.js';
import { LIGHT } from '../../data/seasons.js';
import { BUILDINGS } from '../../data/buildings.js';
import { FOOD_GOODS } from '../../data/goods.js';
import { LESSON_STEPS } from '../../data/lesson.js';
import { allBuildings } from '../../sim/world.js';
import { isWorking } from '../../sim/labour.js';
import { stepDone } from '../../sim/lesson.js';
import { buildingsInRange } from '../chunkIndex.js';
import { festivalOn, festivalLoopOf } from '../walkers.js';
import { dayOf } from '../light.js';
import { LIFE_IDS } from './life.js';
import { LIFE_SALT as S, unit, nearestFirst, clamp01, facing, inRange } from './lifeCommon.js';

export const CROWD = {
  shortBelow: 10,          // a bazaar with less food than this on its shelf is short: one figure
  periodDays: [6, 10],     // game days at a stall before moving on
  walkDays: 0.8,           // of which the last are the walk to the next stall
  seatReach: 3,            // tiles to a plaza or garden whose seats it fills
  bazaars: 3,              // bazaars with a crowd at once, nearest the middle of the view
  lineSpacing: 2,          // a festival onlooker every this many tiles of the procession's loop
};
// The stalls a figure stands at, as shares of the bazaar's footprint from its back corner: all in its front half (so they draw over its sprite) or
// just past its front edges.
const STALLS = [[0.3, 1.08], [0.72, 1.08], [1.08, 0.3], [1.08, 0.72], [0.78, 0.82], [0.84, 0.52], [0.52, 0.86], [0.98, 0.98], [0.62, 0.64], [1.2, 0.52], [0.45, 1.2], [1.18, 1.02]];
const KINDS = ['woman', 'citizen', 'noble', 'porter', 'child', 'woman', 'farmer', 'citizen'];
const JITTER = 0.14;   // tiles: each figure stands a little off its stall's spot, so two at one stall never stand on one another

// How busy a bazaar is at the hour of the day (light.js dayOf): 1 in the morning, 0.3 at noon, a little more in the afternoon, none at night.
export function busyAt(day) {
  if (day.phase === 'night') return 0;
  if (day.phase === 'dawn' || day.phase === 'dusk') return 0.6;
  const v = clamp01(day.u / LIGHT.day);
  if (v < 0.3) return 1;
  if (v < 0.5) return 1 - 0.7 * ((v - 0.3) / 0.2);
  if (v < 0.75) return 0.3 + 0.3 * ((v - 0.5) / 0.25);
  return 0.6;
}
// The share the dark leaves (the crowd thins as dusk comes on, is gone at night, gathers at dawn).
const lit = (day) => (day.phase === 'day' ? 1 : day.phase === 'night' ? 0 : 1 - clamp01(day.dark));

const food = (b) => FOOD_GOODS.reduce((n, g) => n + (b.store && b.store[g] || 0), 0);
// The lesson's food step: the farm, granary and bazaar all working (src/data/lesson.js 'workers'), so food reaches the bazaar.
const FOOD_STEP = LESSON_STEPS.find((s) => s.id === 'workers');
export const lessonFoodDone = (world) => !world.lesson || Boolean(FOOD_STEP && stepDone(world, FOOD_STEP));

// A figure's place at stall k of the bazaar.
const stallAt = (b, k) => { const [fx, fy] = STALLS[((k % STALLS.length) + STALLS.length) % STALLS.length]; return [b.x + fx * b.w, b.y + fy * b.d]; };

function bazaarCrowd(world, b, timeDays, motion, day, out) {
  const seed = world.seed | 0, base = LIFE_IDS.crowd + (b.id % 11000) * 16, cx = b.x + b.w / 2, cy = b.y + b.d / 2, light = lit(day);
  if (light < 0.02) return;
  let room = LIFE.crowdCap;
  // two sitting at a plaza or garden near it
  const reach = CROWD.seatReach + 1, near = { x0: Math.floor(cx - reach), y0: Math.floor(cy - reach), x1: Math.ceil(cx + reach), y1: Math.ceil(cy + reach) };
  const seat = buildingsInRange(world, near).find((o) => (o.type === 'plaza' || o.type === 'garden') && Math.abs(o.x + o.w / 2 - cx) + Math.abs(o.y + o.d / 2 - cy) <= CROWD.seatReach + 1);
  const short = food(b) < CROWD.shortBelow;
  if (seat && !short) {
    for (let i = 0; i < 2; i++) out.push({ id: base + 14 + i, kind: 'citizen_sit', x: seat.x + (i ? 1.12 : 0.4) * seat.w, y: seat.y + (i ? 0.45 : 1.12) * seat.d, dir: i ? 3 : 1, stand: true, alpha: light });
    room -= 2;
  }
  const n = short ? 1 : 3 + 5 * busyAt(day);
  for (let i = 0; i < Math.min(room, Math.ceil(n)); i++) {
    const alpha = clamp01((n - i) * 2 - (short ? 0 : 1)) * light;           // the last of a count that is falling fades out over half a figure of it
    if (alpha < 0.02) continue;
    const h = unit(b.id, i, seed, S.crowd), period = CROWD.periodDays[0] + (CROWD.periodDays[1] - CROWD.periodDays[0]) * h;
    let x, y, dir, stand = true;
    if (motion !== 'full') {                                                     // Gentle: each at its own stall, standing
      [x, y] = stallAt(b, i * 5);
      dir = facing(cx - x, cy - y);
    } else {
      const s = timeDays / period + unit(b.id, i, seed, S.stall), k = Math.floor(s), f = s - k;
      const from = stallAt(b, i * 5 + k * (1 + (i % 4))), to = stallAt(b, i * 5 + (k + 1) * (1 + (i % 4)));
      const w = clamp01((f - (1 - CROWD.walkDays / period)) / (CROWD.walkDays / period));   // the walk to the next stall at the end of its time
      x = from[0] + (to[0] - from[0]) * w; y = from[1] + (to[1] - from[1]) * w;
      if (w > 0 && w < 1) { stand = false; dir = facing(to[0] - from[0], to[1] - from[1]); } else dir = facing(cx - x, cy - y) === 1 ? (h < 0.7 ? 1 : 3) : (h < 0.7 ? 3 : 1);   // mostly turned to the stalls, some away
    }
    x += (unit(b.id, i, seed, S.stall + 1) - 0.5) * 2 * JITTER; y += (unit(i, b.id, seed, S.stall + 1) - 0.5) * 2 * JITTER;
    out.push({ id: base + i, kind: KINDS[(i + Math.floor(h * 3)) % KINDS.length], x, y, dir, stand, alpha });
  }
}

export function crowdAt(world, timeDays, nowMs, range, motion, { day = null } = {}) {
  if (motion === 'still' || !range || !world || !world.buildings) return [];
  if (festivalOn(world)) return [];                                            // gone to watch the procession (festivalLineAt)
  const d = day || dayOf(world, motion);
  const bazaars = buildingsInRange(world, range).filter((b) => b.type === 'bazaar' && BUILDINGS.bazaar && isWorking(world, b) && inRange(b.x + b.w / 2, b.y + b.d / 2, range));
  if (!bazaars.length || !lessonFoodDone(world)) return [];
  const out = [];
  for (const b of nearestFirst(bazaars, range).slice(0, CROWD.bazaars)) bazaarCrowd(world, b, timeDays, motion, d, out);
  return out;
}

// ── L.8: the festival's onlookers ──
// The working temples, kept a frame to the next for the same world (until a building is added, or TEMPLES_FRESH_MS passes, so one staffed or emptied
// since is seen within a couple of seconds): a render-side note kept by the world record, never in it. The list is shared; callers do not change it.
export const TEMPLES_FRESH_MS = 2000;
const templesKept = new WeakMap();
export function workingTemples(world, nowMs = 0) {
  const had = templesKept.get(world);
  if (had && had.next === world.nextId && nowMs >= had.at && nowMs - had.at < TEMPLES_FRESH_MS) return had.list;
  const list = allBuildings(world).filter((t) => t.type === 'temple' && isWorking(world, t));
  templesKept.set(world, { next: world.nextId, at: nowMs, list });
  return list;
}
export function festivalLineAt(world, timeDays, nowMs, range, motion) {
  if (motion === 'still' || !range || !world || !world.buildings || !festivalOn(world)) return [];
  const temples = workingTemples(world, nowMs);
  const out = [], seed = world.seed | 0;
  for (const t of nearestFirst(temples, range)) {
    const loop = festivalLoopOf(world, t);
    // the loop runs out and back: its first half is the road once
    const half = loop.slice(0, Math.ceil(loop.length / 2) + 1);
    let j = 0;
    for (let i = 1; i < half.length && out.length < LIFE.lineCap; i += CROWD.lineSpacing) {
      const a = half[i], b = half[Math.min(half.length - 1, i + 1)] || a, side = i % (2 * CROWD.lineSpacing) === 1 ? 1 : -1;
      const dx = b.x - a.x, dy = b.y - a.y, nx = -dy * side, ny = dx * side;   // to one side of the road, across it
      const x = a.x + 0.5 + nx * 0.42, y = a.y + 0.5 + ny * 0.42;
      if (!inRange(x, y, range)) continue;
      const h = unit(t.id, i, seed, S.line);
      out.push({ id: LIFE_IDS.crowd + 180000 + (t.id % 1000) * 16 + j++, kind: KINDS[Math.floor(h * KINDS.length)], x, y, dir: facing(-nx, -ny), stand: true });
    }
    if (out.length >= LIFE.lineCap) break;
  }
  return out;
}

// The life source (createUI registers it): 'crowd', allowed in the lesson behind its food step.
export function crowdSource({ settings = () => null } = {}) {
  return {
    name: 'crowd', lessonOk: true,
    walkers: (world, timeDays, nowMs, range, motion) => {
      const day = dayOf(world, motion, settings());
      return crowdAt(world, timeDays, nowMs, range, motion, { day }).concat(festivalLineAt(world, timeDays, nowMs, range, motion));
    },
  };
}
