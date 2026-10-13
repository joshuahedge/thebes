// Raiders and soldiers (spec 5.4). Stage 3 contract: units are depth-sorted with the walkers: createUI appends
// unitsAt's entries to the walkers list it hands renderFrame, which draws each as the figure slot fig.<kind>
// (src/render/art/figures.js: 'raider' and 'soldier', 1.5 times a citizen's size). Health bars and arrows are drawn on
// top by drawUnitMarks, which renderFrame calls as opts.units after the sprites (art px).
//
// Units move one step a day in the sim (world.raid.active.raiders, world.soldiers: tile coordinates, maybe fractional).
// The drawing glides each one from where it was drawn to its new spot over the next game day, from a per-world record
// kept outside the world (a WeakMap, like walkers.js's loops), so nothing is saved and a reload shows each unit where it
// stands. A soldier standing on its own barracks waits in the barracks' yard, in a row by id.
// Stage 4.6 (Armies track): each kind has its own figure slot (src/render/art/armies.js): your 'soldier', 'archer' and 'chariot',
// and raiders as 'raider' (on foot), 'raider_archer', 'raider_chariot' and 'raider_boat'; a unit waiting at home stands in its
// building's yard. Health bars read the kind's hit points (UNIT_TYPES, ENEMY_TYPES), coloured by side. Archers' shots (by 'archer')
// and enemy archers' (by 'enemy') leave from the shooter's chest, a tower's from its platform.
import { UNITS } from '../data/raids.js';
import { UNIT_TYPES, ENEMY_TYPES } from '../data/armies.js';
import { ART } from './art/registry.js';
import { p, U } from './iso.js';

// Unit ids in the walkers list are UNIT_ID_BASE + the unit's id, so they never meet a walker's (a building id).
export const UNIT_ID_BASE = 100000;
export const ARROW_MS = 300;                 // a tower's arrow flies for 0.3 s
export const STILL_ARROW_MS = 600;           // under reduced motion it shows as a still line for this long
export const BAR = { w: 9, h: 1.8, lift: 27 };   // a health bar: art px wide and tall, and its height over the feet
export const BAR_COLOUR = { back: '#2A2230', raider: '#F08A70', soldier: '#7FD8CF' };
const ARROW = '#3E3040';

const tracks = new WeakMap();                // world -> Map(unit id -> { x, y, fromX, fromY, at, dir })
const volleys = new WeakMap();               // world -> { key, start }: when the day's tower shots were first drawn

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const glide = (t, timeDays) => {
  const f = clamp01(timeDays - t.at);
  return { x: t.fromX + (t.x - t.fromX) * f, y: t.fromY + (t.y - t.fromY) * f };
};
const dirOf = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : dx < 0 ? 3 : 2) : (dy > 0 ? 2 : 0));

// Every unit with the map point its feet stand on (tile centre), before gliding.
function standing(world) {
  const out = [];
  const active = world.raid && world.raid.active;
  if (active && active.raiders) for (const u of active.raiders) out.push({ u, kind: RAIDER_SLOT[u.kind] || 'raider', side: 'raider', max: (ENEMY_TYPES[u.kind] || ENEMY_TYPES.foot).hp, x: u.x + 0.5, y: u.y + 0.5 });
  const waiting = new Map();                 // barracks id -> soldiers waiting in its yard so far
  for (const u of world.soldiers || []) {
    const b = world.buildings[u.barracks];
    const home = b && u.x >= b.x && u.x < b.x + b.w && u.y >= b.y && u.y < b.y + b.d;
    const kind = UNIT_TYPES[u.kind] ? u.kind : 'soldier', max = UNIT_TYPES[kind].hp;
    if (!home) { out.push({ u, kind, side: 'soldier', max, x: u.x + 0.5, y: u.y + 0.5 }); continue; }
    const rank = waiting.get(b.id) || 0;
    waiting.set(b.id, rank + 1);
    out.push({ u, kind, side: 'soldier', max, x: b.x + 0.35 + 0.42 * rank, y: b.y + b.d - 0.28 });
  }
  return out;
}

// The units as drawn at timeDays: each glides from where it was drawn when its spot last changed, over one game day.
function placed(world, timeDays) {
  let m = tracks.get(world);
  if (!m) { m = new Map(); tracks.set(world, m); }
  const seen = new Set(), out = [];
  for (const s of standing(world)) {
    seen.add(s.u.id);
    let t = m.get(s.u.id);
    if (!t) { t = { x: s.x, y: s.y, fromX: s.x, fromY: s.y, at: timeDays, dir: 2 }; m.set(s.u.id, t); }
    else if (t.x !== s.x || t.y !== s.y) {
      const now = glide(t, timeDays);
      Object.assign(t, { fromX: now.x, fromY: now.y, x: s.x, y: s.y, at: timeDays, dir: dirOf(s.x - now.x, s.y - now.y) });
    }
    out.push({ ...s, ...glide(t, timeDays), dir: t.dir });
  }
  for (const id of [...m.keys()]) if (!seen.has(id)) m.delete(id);
  return out;
}

const RAIDER_SLOT = { foot: 'raider', archer: 'raider_archer', chariot: 'raider_chariot', boat: 'raider_boat' };
const inRange = (x, y, r) => !r || (x >= r.x0 && x <= r.x1 + 1 && y >= r.y0 && y <= r.y1 + 1);

// The units in range as walker entries: { id: UNIT_ID_BASE + unit id, kind: 'raider' | 'soldier', x, y, dir }, moving
// smoothly between days (timeDays is the day plus the frame's fraction). Raiders come from world.raid.active, soldiers
// from world.soldiers.
export function unitsAt(world, timeDays, range = null) {
  const out = [];
  for (const s of placed(world, timeDays)) if (inRange(s.x, s.y, range)) out.push({ id: UNIT_ID_BASE + s.u.id, kind: s.kind, x: s.x, y: s.y, dir: s.dir });
  return out;
}

function healthBar(g, s) {
  const max = s.max || UNITS[s.side || s.kind].hp, share = clamp01(s.u.hp / max);
  const [x, y] = U(p(s.x, s.y), BAR.lift), w = BAR.w, h = BAR.h;
  const rect = (x0, x1) => [[x0, y - h / 2], [x1, y - h / 2], [x1, y + h / 2], [x0, y + h / 2]];
  g.poly(rect(x - w / 2 - 0.4, x + w / 2 + 0.4), BAR_COLOUR.back, { alpha: 0.8 });
  if (share > 0) g.poly(rect(x - w / 2, x - w / 2 + w * share), BAR_COLOUR[s.side || s.kind]);
}

// A tower shot's path in art px: from the tower's platform to the raider's chest.
function shotPath(shot) {
  const from = shot.by === 'archer' || shot.by === 'enemy' ? U(p(shot.from.x + 0.5, shot.from.y + 0.5), 14) : U(p(shot.from.x + 0.5, shot.from.y + 0.5), ART.tower.height - 6);
  const to = U(p(shot.to.x + 0.5, shot.to.y + 0.5), 10);
  return { from, to };
}

// Health bars over units that have been hit, and the day's tower arrows (world.raid.active.shots) as thin strokes that
// fly for ARROW_MS, or a still line for STILL_ARROW_MS under reduced motion. A new day's shots start a new volley.
export function drawUnitMarks(g, world, range, timeDays, now, { reducedMotion = false } = {}) {
  const active = world.raid && world.raid.active;
  const shots = (active && active.shots) || [];
  if (!active && !(world.soldiers && world.soldiers.length)) return;
  for (const s of placed(world, timeDays)) if (s.u.hit && inRange(s.x, s.y, range)) healthBar(g, s);
  if (!shots.length) return;
  const key = `${world.day}:${shots.length}`;
  let v = volleys.get(world);
  if (!v || v.key !== key) { v = { key, start: now }; volleys.set(world, v); }
  const age = now - v.start;
  for (const shot of shots) {
    const { from, to } = shotPath(shot);
    if (reducedMotion) {
      if (age < STILL_ARROW_MS) g.line(from, to, ARROW, 0.5, 0.6);
      continue;
    }
    if (age >= ARROW_MS) continue;
    const f = age / ARROW_MS;
    const at = (k) => [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k - 8 * k * (1 - k)];   // a shallow arc
    const head = at(f);
    const tail = at(Math.max(0, f - 0.18));
    g.line(tail, head, ARROW, 0.6);
    g.line(tail, [tail[0] + (tail[0] - head[0]) * 0.25, tail[1] + (tail[1] - head[1]) * 0.25], '#F6ECD6', 0.6, 0.9);   // the fletching
  }
}
