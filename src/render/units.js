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
//
// Version 6.0 (Track B2, rulings 720-739): battles you can see. Drawn from the sim's state alone (nothing is written back):
//   fighting     a soldier and a raider on foot standing within FIGHT.reach of each other show a fighting pose facing the foe (the slot
//                fig.<who>_<pose>_<face>, src/render/art/armies.js), 'a' then 'b' at the Motion level's pace (Still holds 'a')
//   the chieftain  a raider with chief: true is drawn as 'chief' (a head taller, a gold breastplate) with his banner on a tall pole behind
//                him (drawBanner: it moves with him; Full ripples, Gentle cross-fades two still shapes, Still holds one); when he falls
//                the banner lies where he fell for BANNER.fellMs. His health bar reads his own, larger, hit points
//   loot         a raider of a band that has struck and is leaving carries a sack ('raider_sack')
//   blows        a unit whose hit points dropped shows a spark (Full) or a ring that fades in place (Gentle); one that vanishes in the
//                field fell (a dust cloud and a lying figure, Full; the figure fading, Gentle)
//   arrows       a tower's or archer's shot flies in an arc and lands in a puff or ring; Gentle and Still show the arc as one line
// Motion comes from the options of unitsAt and drawUnitMarks, else setBattleHooks (the interface registers the settings' level and clock once),
// else Full.
import { UNITS } from '../data/raids.js';
import { UNIT_TYPES, ENEMY_TYPES } from '../data/armies.js';
import { CHIEFTAIN } from '../data/hazards.js';
import { FIGHT, SCRUM, SPARK, FALL, ARROWS, BANNER } from '../data/battle.js';
import { ART } from './art/registry.js';
import { p, U } from './iso.js';
import { gentleShapes } from './fire.js';

// Unit ids in the walkers list are UNIT_ID_BASE + the unit's id, so they never meet a walker's (a building id).
export const UNIT_ID_BASE = 100000;
export const ARROW_MS = ARROWS.ms;           // a tower's arrow flies for 0.3 s
export const STILL_ARROW_MS = ARROWS.stillMs;   // under reduced motion it shows as a still line for this long
export const BAR = { w: 9, h: 1.8, lift: 27 };   // a health bar: art px wide and tall, and its height over the feet
export const BAR_COLOUR = { back: '#2A2230', raider: '#F08A70', soldier: '#7FD8CF' };
const ARROW = ARROWS.colour;

// Where the interface says the Motion level and the clock are (createBattleUi, src/ui/v60/battle.js); a test or a screenshot may set them too.
// hold: null, or (a dev scene's screenshot) an age in ms at which every arrow, spark and fall is shown, so a still picture catches the moment; the interface
// clears it on every new game (createBattleUi).
const HOOKS_AT_START = { motion: () => 'full', now: () => (typeof performance !== 'undefined' ? performance.now() : 0), hold: null };
const hooks = { ...HOOKS_AT_START };
export function setBattleHooks(h = {}) { Object.assign(hooks, h); }
export function resetBattleHooks() { Object.assign(hooks, HOOKS_AT_START); }
export const heldAge = () => hooks.hold;

const tracks = new WeakMap();                // world -> Map(unit id -> { x, y, fromX, fromY, at, dir, hp, ... })
const volleys = new WeakMap();               // world -> { key, start }: when the day's tower shots were first drawn
const scenes = new WeakMap();                // world -> { sparks, falls, banners }: the blows, falls and fallen banners still showing

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const glide = (t, timeDays) => {
  const f = clamp01(timeDays - t.at);
  return { x: t.fromX + (t.x - t.fromX) * f, y: t.fromY + (t.y - t.fromY) * f };
};
const dirOf = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : dx < 0 ? 3 : 2) : (dy > 0 ? 2 : 0));
// The Motion level of a call: its own option, else for unitsAt (which createUI calls with none) the interface's hook; drawUnitMarks always gets the
// level from its caller (createUI passes motion), and without one is as it was before Version 6.0: Full unless reducedMotion.
const levelOf = (o = {}) => o.motion || (o.reducedMotion ? 'still' : hooks.motion());
const marksLevel = (o = {}) => o.motion || (o.reducedMotion ? 'still' : 'full');

const RAIDER_SLOT = { foot: 'raider', archer: 'raider_archer', chariot: 'raider_chariot', boat: 'raider_boat' };
const bandRec = (a, u) => (u.band && a.second ? a.second : a);
// A band that has struck and is on its way out carries what it took.
const carries = (a, u) => {
  if (bandRec(a, u).phase !== 'leave') return false;
  return Boolean(a.stolen > 0 || a.foodStolen > 0 || (a.taken && Object.keys(a.taken).length));
};

// Every unit with the map point its feet stand on (tile centre), before gliding.
function standing(world) {
  const out = [];
  const active = world.raid && world.raid.active;
  if (active && active.raiders) {
    for (const u of active.raiders) {
      const base = u.kind || 'foot', def = ENEMY_TYPES[base] || ENEMY_TYPES.foot;
      const slot = u.chief ? 'chief' : base !== 'foot' ? RAIDER_SLOT[base] || 'raider' : carries(active, u) ? 'raider_sack' : 'raider';
      const gates = [active.entry, active.second && active.second.entry].filter(Boolean);
      out.push({ u, kind: slot, base, side: 'raider', chief: Boolean(u.chief), gates, max: def.hp * (u.chief ? CHIEFTAIN.hpFactor : 1), x: u.x + 0.5, y: u.y + 0.5 });
    }
  }
  const waiting = new Map();                 // barracks id -> soldiers waiting in its yard so far
  for (const u of world.soldiers || []) {
    const b = world.buildings[u.barracks];
    const home = b && u.x >= b.x && u.x < b.x + b.w && u.y >= b.y && u.y < b.y + b.d;
    const kind = UNIT_TYPES[u.kind] ? u.kind : 'soldier', max = UNIT_TYPES[kind].hp;
    if (!home) { out.push({ u, kind, base: kind, side: 'soldier', max, x: u.x + 0.5, y: u.y + 0.5 }); continue; }
    const rank = waiting.get(b.id) || 0;
    waiting.set(b.id, rank + 1);
    out.push({ u, kind, base: kind, side: 'soldier', max, home: true, x: b.x + 0.35 + 0.42 * rank, y: b.y + b.d - 0.28 });
  }
  return out;
}

function sceneOf(world) {
  let s = scenes.get(world);
  if (!s) { s = { sparks: [], falls: [], banners: [] }; scenes.set(world, s); }
  return s;
}

// Whether a unit that has just vanished fell in the field: a raider not at its band's entry, a soldier away from its barracks.
function fellInField(world, t) {
  if (t.side === 'raider') return (t.gates || []).every((e) => Math.hypot(t.x - (e.x + 0.5), t.y - (e.y + 0.5)) > FALL.awayTiles);   // the entries as last seen: the last raider's fall ends the raid
  const b = world.buildings[t.barracks];
  return Boolean(b) && Math.hypot(t.x - (b.x + b.w / 2), t.y - (b.y + b.d / 2)) > FALL.awayTiles;
}

// The units as drawn at timeDays: each glides from where it was drawn when its spot last changed, over one game day. `now` (ms) stamps the blows
// and falls it notices (a unit's hit points dropping, a unit gone from the field).
function placed(world, timeDays, now = hooks.now()) {
  let m = tracks.get(world);
  if (!m) { m = new Map(); tracks.set(world, m); }
  const seen = new Set(), out = [], scene = sceneOf(world);
  for (const s of standing(world)) {
    seen.add(s.u.id);
    let t = m.get(s.u.id);
    if (!t) t = { x: s.x, y: s.y, fromX: s.x, fromY: s.y, at: timeDays, dir: 2, hp: s.u.hp };
    else if (t.x !== s.x || t.y !== s.y) {
      const now2 = glide(t, timeDays);
      Object.assign(t, { fromX: now2.x, fromY: now2.y, x: s.x, y: s.y, at: timeDays, dir: dirOf(s.x - now2.x, s.y - now2.y) });
    }
    const at = glide(t, timeDays);
    // A company out of its barracks stands spread (the sim keeps them on one spot): the offset is the drawing's; pairs are judged without it (unitsAt).
    const scrum = s.side === 'soldier' && !s.home && s.u.task === 'out' ? SCRUM[s.u.id % SCRUM.length] : null;
    const ox = scrum ? scrum[0] * FIGHT.spread : 0, oy = scrum ? scrum[1] * FIGHT.spread : 0;
    if (s.u.hp < t.hp && !s.home) scene.sparks.push({ x: at.x + ox, y: at.y + oy, at: now });
    Object.assign(t, { hp: s.u.hp, side: s.side, chief: s.chief, barracks: s.u.barracks, gates: s.gates, last: { x: at.x + ox, y: at.y + oy } });
    m.set(s.u.id, t);
    out.push({ ...s, ...at, dir: t.dir, ox, oy });
  }
  for (const id of [...m.keys()]) {
    if (seen.has(id)) continue;
    const t = m.get(id), at = t.last || { x: t.x, y: t.y };
    if (fellInField(world, { ...t, ...at })) {
      scene.falls.push({ x: at.x, y: at.y, at: now, side: t.side });
      if (t.chief) scene.banners.push({ x: at.x, y: at.y, at: now, id });
    }
    m.delete(id);
  }
  return out;
}

const inRange = (x, y, r) => !r || (x >= r.x0 && x <= r.x1 + 1 && y >= r.y0 && y <= r.y1 + 1);
const fighterOf = (s) => (s.side === 'soldier' ? (s.base === 'soldier' ? 'soldier' : null) : s.chief ? 'chief' : s.base === 'foot' || s.base === 'boat' ? 'raider' : null);

// Who stands beside whom: each foot soldier and foot raider with a foe of the other side within FIGHT.reach shows the pose facing the nearest.
// Returns { poses: unit id -> the pose slot, clashes: [{ x, y, pairs }] }: the places where blows are traded (one a cluster of pairs, merged within
// CLASH_MERGE tiles), where the drawing puts dust at the feet and a crossed-weapons mark overhead.
const CLASH_MERGE = 2.2;
function fighting(list, level, now) {
  const foes = { soldier: [], raider: [] };
  for (const s of list) if (fighterOf(s) && !s.home) foes[s.side].push(s);
  const poses = new Map(), clashes = [];
  if (!foes.soldier.length || !foes.raider.length) return { poses, clashes };
  for (const side of ['soldier', 'raider']) {
    for (const s of foes[side]) {
      let near = null, best = FIGHT.reach;
      for (const o of foes[side === 'soldier' ? 'raider' : 'soldier']) {
        const d = Math.hypot(o.x - s.x, o.y - s.y);
        if (d <= best) { best = d; near = o; }
      }
      if (!near) continue;
      const face = ((near.x - near.y) - (s.x - s.y)) >= 0 ? 'r' : 'l';
      const period = FIGHT.period[level];
      const pose = !period ? 'a' : Math.floor(now / period + ((s.u.id * 0.37) % 1)) % 2 ? 'b' : 'a';
      poses.set(s.u.id, `${fighterOf(s)}_${pose}_${face}`);
      if (side !== 'soldier') continue;                                          // one mark per pair: from the soldier's side
      const mx = (s.x + s.ox + near.x + near.ox) / 2, my = (s.y + s.oy + near.y + near.oy) / 2;
      const c = clashes.find((k) => Math.hypot(k.x - mx, k.y - my) <= CLASH_MERGE);
      if (c) { c.x = (c.x * c.pairs + mx) / (c.pairs + 1); c.y = (c.y * c.pairs + my) / (c.pairs + 1); c.pairs += 1; }
      else clashes.push({ x: mx, y: my, pairs: 1 });
    }
  }
  return { poses, clashes };
}

// The units in range as walker entries: { id: UNIT_ID_BASE + unit id, kind, x, y, dir }, moving smoothly between days (timeDays is the day plus
// the frame's fraction). Raiders come from world.raid.active, soldiers from world.soldiers. kind is the figure slot: 'raider' | 'soldier' |
// 'archer' | 'chariot' | 'raider_archer' | ..., 'chief', 'raider_sack', or a fighting pose ('soldier_a_r', 'raider_b_l', 'chief_a_r', ...).
// options: { now, motion } (ms; 'full' | 'gentle' | 'still'), else the interface's hooks.
export function unitsAt(world, timeDays, range = null, options = {}) {
  const now = options.now === undefined ? hooks.now() : options.now;
  const list = placed(world, timeDays, now);
  const { poses } = fighting(list, levelOf(options), now);
  const out = [];
  for (const s of list) if (inRange(s.x, s.y, range)) out.push({ id: UNIT_ID_BASE + s.u.id, kind: poses.get(s.u.id) || s.kind, x: s.x + s.ox, y: s.y + s.oy, dir: s.dir });
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

// One arrow: Full flies a short dart along the arc and lands in a puff of strokes; Gentle and Still show the whole arc as one line (Gentle fades it
// and lands in a ring that fades in place, Still holds it for STILL_ARROW_MS and shows no landing).
function drawArrow(g, shot, age, level) {
  const { from, to } = shotPath(shot);
  const arcH = Math.min(ARROWS.arcMax, Math.hypot(to[0] - from[0], to[1] - from[1]) * ARROWS.arc);
  const at = (k) => [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k - 4 * arcH * k * (1 - k)];   // an arc rising arcH over the chord's middle
  if (level !== 'full') {
    if (age >= STILL_ARROW_MS) return;
    const fade = level === 'gentle' ? 1 - age / STILL_ARROW_MS : 1;
    const mid = at(0.5);
    g.stroke([['M', from], ['Q', [mid[0], mid[1] - arcH], to]], ARROW, 0.5, 0.6 * (0.4 + 0.6 * fade));
    const head = at(0.94), prev = at(0.86);                                    // the arrowhead where it lands, so the line reads as a flight
    g.line(prev, head, ARROW, 0.6, 0.85 * (0.4 + 0.6 * fade));
    if (level === 'gentle') g.circ(to, 2.2 + 1.6 * (age / STILL_ARROW_MS), 'none', { stroke: ARROWS.trail, strokeWidth: 0.9, strokeAlpha: 0.75 * fade });
    return;
  }
  if (age < ARROWS.ms) {
    const f = age / ARROWS.ms;
    const head = at(f), tail = at(Math.max(0, f - 0.26));
    g.line(tail, head, ARROW, 0.9);
    g.line(tail, [tail[0] + (tail[0] - head[0]) * 0.2, tail[1] + (tail[1] - head[1]) * 0.2], ARROWS.fletch, 0.8, 0.95);   // the fletching
    g.circ(head, 1, ARROW);                                                                                                 // the head
    return;
  }
  const t = (age - ARROWS.ms) / ARROWS.landMs;
  if (t >= 1) return;
  for (let i = 0; i < 5; i++) {                                                // it lands: a puff of short strokes, dark and pale so it reads on sand and on brick
    const a = (i / 5) * Math.PI * 2 + 0.5, r0 = 1 + t * 2, r1 = 2.6 + t * 4.5;
    const A = [to[0] + Math.cos(a) * r0, to[1] + Math.sin(a) * r0 * 0.7], B = [to[0] + Math.cos(a) * r1, to[1] + Math.sin(a) * r1 * 0.7];
    g.line(A, B, ARROWS.trail, 1.1, 0.8 * (1 - t));
    g.line(A, B, SPARK.colour, 0.5, 1 - t);
  }
}

// The chieftain's banner at tile point (x, y): a pole behind him and a swallow-tailed cloth streaming right. Full ripples the cloth; Gentle cross-fades two
// still shapes (as a flame does); Still holds one. lying: his banner where he fell, flat on the ground, still at every level.
export function drawBanner(g, x, y, now, level, id, lying = false, alpha = 1) {
  const q = p(x, y), W = BANNER.wide, H = BANNER.high, wood = BANNER.wood;
  if (lying) {
    const a = [q[0] - 7, q[1] + 1], b = [q[0] + 4, q[1] - 2];
    g.line(a, b, wood, 0.8, alpha);
    g.poly([[b[0], b[1] - 0.4], [b[0] + W * 0.5, b[1] + 0.8], [b[0] + W * 0.78, b[1] + 1.4], [b[0] + W * 0.5, b[1] + 3.2], [b[0], b[1] + 2.6]], BANNER.cloth, { alpha: alpha * 0.9, outline: true });
    g.line([b[0] + 1.4, b[1] + 1.2], [b[0] + W * 0.55, b[1] + 1.6], BANNER.band, 0.9, alpha);
    return;
  }
  const bx = q[0] - 5.2, base = q[1] - 5, top = q[1] - BANNER.pole;
  g.line([bx, base], [bx, top], wood, 0.8);
  g.circ([bx, top - 0.6], 1.2, BANNER.gold);
  const cloth = (wave, a) => {
    const r1 = wave * 1.5, r2 = wave * 2.4, r3 = wave * 1.1, y0 = top + 1.2, y1 = y0 + H;
    const pts = [[bx, y0], [bx + W * 0.5, y0 - r1 * 0.6], [bx + W, y0 + r2], [bx + W * 0.7, (y0 + y1) / 2 + r3], [bx + W, y1 + r2 * 0.8], [bx + W * 0.5, y1 + r1 * 0.6], [bx, y1]];
    g.poly(pts, BANNER.cloth, { alpha: a, outline: true });
    g.poly([[bx, y0 + H * 0.38], [bx + W * 0.6, y0 + H * 0.38 + r1 * 0.3 + r2 * 0.4], [bx + W * 0.62, y0 + H * 0.62 + r1 * 0.3 + r2 * 0.3], [bx, y0 + H * 0.62]], BANNER.band, { alpha: a * 0.95 });
    g.circ([bx + W * 0.26, (y0 + y1) / 2 + r1 * 0.2], 1.7, BANNER.gold, { alpha: a });
  };
  if (level === 'full') cloth(Math.sin(now / BANNER.rippleMs * Math.PI * 2 + id), 1);
  else if (level === 'gentle') for (const [shape, a] of gentleShapes(now, id)) cloth(shape === 0 ? -0.8 : 0.8, a);
  else cloth(0.25, 1);
}

// Where blows are traded: a ring of low dust puffs at the feet (turning slowly under Full, fading in and out in place under Gentle, still under Still) and
// a crossed-weapons mark over the cluster (a shape, so it reads without colour; it beats with the blows under Full). Bigger for more pairs.
function drawClash(g, k, now, level) {
  const c = p(k.x, k.y), n = Math.min(6, k.pairs), puffs = 4 + n, r = 5 + 2.4 * Math.sqrt(k.pairs);
  for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * Math.PI * 2 + (level === 'full' ? now / 1600 : 0.4);
    const alpha = level === 'gentle' ? 0.2 + 0.1 * Math.sin(now / 1500 + i * 1.7) : 0.26;
    g.radial([c[0] + Math.cos(a) * r * 1.3, c[1] + 1 + Math.sin(a) * r * 0.55], 5, 3.2, FALL.dust, alpha);
  }
  const m = U(c, 33 + n), s = (0.9 + 0.07 * n) * (level === 'full' ? 1 + 0.1 * Math.sin((now / FIGHT.period.full) * Math.PI) : 1);
  for (const [dx, dy] of [[1, -1], [-1, -1]]) {
    const a = [m[0] - dx * 5 * s, m[1] - dy * 4 * s], b = [m[0] + dx * 5 * s, m[1] + dy * 4 * s];
    g.line(a, b, ARROW, 2.3 * s, 0.6);                                          // each weapon: a dark edge under a gold blade
    g.line(a, b, SPARK.edge, 1.3 * s);
    g.line([m[0] - dx * 1.2 * s, m[1] - dy * 1 * s], [m[0] + dx * 3.2 * s, m[1] + dy * 2.6 * s], SPARK.colour, 0.5 * s, 0.9);
  }
  g.circ(m, 1.5 * s, SPARK.core, { stroke: SPARK.edge, strokeWidth: 0.5, strokeAlpha: 0.9 });
}

// Blows (a spark), falls (dust and a lying figure) and the banners of fallen chieftains.
function drawScene(g, world, range, now, level) {
  const s = scenes.get(world);
  if (!s || (!s.sparks.length && !s.falls.length && !s.banners.length)) return;
  const ageOf = (k) => (hooks.hold === null ? now - k.at : hooks.hold);          // a dev scene holds every moment at one age (setBattleHooks)
  s.sparks = s.sparks.filter((k) => ageOf(k) < SPARK.ringMs);
  s.falls = s.falls.filter((k) => ageOf(k) < FALL.ms);
  s.banners = s.banners.filter((k) => ageOf(k) < BANNER.fellMs);
  if (level !== 'still') {
    for (const k of s.sparks) {
      if (!inRange(k.x, k.y, range)) continue;
      const q = U(p(k.x, k.y), 9), age = ageOf(k);
      if (level === 'full') {
        if (age >= SPARK.ms) continue;
        const t = age / SPARK.ms;
        g.circ(q, 2.4 * (1 - t), SPARK.core, { alpha: 1 - t });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + k.at % 3, r0 = 1.6 + t * 2, r1 = 3.2 + t * 5;
          g.line([q[0] + Math.cos(a) * r0, q[1] + Math.sin(a) * r0 * 0.8], [q[0] + Math.cos(a) * r1, q[1] + Math.sin(a) * r1 * 0.8], i % 2 ? SPARK.edge : SPARK.colour, 0.7, 1 - t);
        }
      } else g.circ(q, 3.4, 'none', { stroke: SPARK.edge, strokeWidth: 0.9, strokeAlpha: 0.9 * (1 - age / SPARK.ringMs) });
    }
    for (const k of s.falls) {
      if (!inRange(k.x, k.y, range)) continue;
      const c = p(k.x, k.y), age = ageOf(k), fade = 1 - age / FALL.ms;
      if (level === 'full' && age < FALL.dustMs) {
        const t = age / FALL.dustMs;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.6;
          g.circ([c[0] + Math.cos(a) * (3 + t * 7), c[1] - 3 + Math.sin(a) * (3 + t * 7) * 0.5 - t * 4], 2.6 + t * 2.4, FALL.dust, { alpha: (1 - t) * 0.7 });
        }
      }
      g.ell([c[0], c[1] + 0.6], 4.4, 1.6, FALL.body, { alpha: 0.55 * fade });                  // the fallen figure, lying
      g.line([c[0] - 3.4, c[1] + 0.2], [c[0] + 3.8, c[1] - 0.2], FALL.body, 1.4, 0.75 * fade);
    }
  }
  for (const k of s.banners) if (inRange(k.x, k.y, range)) drawBanner(g, k.x, k.y, now, level, k.id, true, level === 'gentle' ? clamp01(2 - ageOf(k) / BANNER.fellMs * 2) : 1);
}

// Health bars over units that have been hit, the chieftain's banner, blows and falls, and the day's arrows (world.raid.active.shots and the like): each
// flies for ARROW_MS (Full) or shows as one arc for STILL_ARROW_MS (Gentle and Still). A new day's shots start a new volley.
export function drawUnitMarks(g, world, range, timeDays, now, opts = {}) {
  const active = world.raid && world.raid.active;
  const level = marksLevel(opts);
  const scene = scenes.get(world);
  const lingering = Boolean(scene && (scene.sparks.length || scene.falls.length || scene.banners.length));
  const tracked = tracks.get(world);                                         // units seen before: the last raider's fall ends the raid, and is seen now
  if (!active && !(world.soldiers && world.soldiers.length) && !lingering && !(tracked && tracked.size)) return;
  const shots = (active && active.shots) || [];
  const list = placed(world, timeDays, now);
  for (const k of fighting(list, level, now).clashes) if (inRange(k.x, k.y, range)) drawClash(g, k, now, level);
  for (const s of list) {
    const x = s.x + s.ox, y = s.y + s.oy;
    if (!inRange(x, y, range)) continue;
    if (s.u.hit) healthBar(g, { ...s, x, y });
    if (s.chief) drawBanner(g, x, y, now, level, s.u.id);
  }
  drawScene(g, world, range, now, level);
  if (!shots.length) return;
  const key = `${world.day}:${shots.length}`;
  let v = volleys.get(world);
  if (!v || v.key !== key) { v = { key, start: now }; volleys.set(world, v); }
  const age = hooks.hold === null ? now - v.start : hooks.hold;
  for (const shot of shots) drawArrow(g, shot, age, level);
}
