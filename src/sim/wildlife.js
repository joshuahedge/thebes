// Wildlife, hunting and fishing (Stage 4.6, River track, rulings 335, 363-367). Track 0 wrote the stubs every other file calls; the River
// track owns this file. Herds are sim entities (world.wildlife, src/data/river.js newWildlifeState); birds, fish, hippos and
// crocodiles are render-only (src/render/wildlife.js), apart from crocodile spots, which are derived here from the seed and the
// terrain and never saved. Draws: hash2(a, b, (world.seed + RIVER_SALT.x) | 0).
//
// Herds (ruling 364): from the Town on, a Normal map holds WILDLIFE.startHerds herds (area scales it) on desert and rocky ground away from
// buildings. A herd steps a tile every WILDLIFE.moveEvery days within WILDLIFE.homeRange of its home, and moves off when a building comes
// within WILDLIFE.awayFrom tiles. A hunting lodge's hunters take one animal (HUNTING.gamePerAnimal game) from the nearest herd within HUNTING.reach
// tiles that has not given its animal this month and has more than HUNTING.keepAtLeast (ruling 460; src/sim/production.js asks huntHerd, then takeGame). A herd regrows 1 every
// WILDLIFE.regrowMonths months up to its size, and one at 0 is gone. A new herd may wander in from a map edge once a year.
import { BUILDINGS } from '../data/buildings.js';
import { MILESTONES } from '../data/progression.js';
import { MIN_STAFF_RATIO } from '../data/labour.js';
import { WILDLIFE, HUNTING, HERD_KINDS, HERD_KIND_IDS, RIVER_SALT } from '../data/river.js';
import { areaScale } from '../data/map.js';
import { OASES, S47_SALT } from '../data/s47.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './time.js';
import { hash2 } from './rng.js';
import { idx, inBounds } from './grid.js';
import { threatsOn } from './costs.js';
import { T, buildable } from './terrain.js';

const milestoneIndex = (id) => MILESTONES.findIndex((m) => m.id === id);
const atLeast = (world, id) => milestoneIndex(world.milestone) >= milestoneIndex(id);
const staffed = (b) => !b.paused && !(b.fire && b.fire.stage === 'fire') && (BUILDINGS[b.type].workers ? b.staff / BUILDINGS[b.type].workers >= MIN_STAFF_RATIO : true);

const salt = (world, k) => (world.seed + RIVER_SALT[k]) | 0;
// Whether the herds, the lodge's game and the crocodile scare are in this city yet (ruling 361): from the Town on.
export const wildlifeOn = (world) => atLeast(world, WILDLIFE.from);
export const maxHerds = (world) => Math.max(WILDLIFE.minHerds, Math.round(WILDLIFE.maxHerds * areaScale(world.size)));
export const startHerds = (world) => Math.max(WILDLIFE.minHerds, Math.round(WILDLIFE.startHerds * areaScale(world.size)));

// ── Ground ──
const groundOk = (kind, t) => HERD_KINDS[kind].ground.some((g) => (g === 'desert' ? t === T.DESERT : g === 'rocky' ? t === T.ROCKY : false));
const terrainAt = (world, x, y) => world.terrain[idx(world.size, x, y)];
// The distance in tiles from (x, y) to the nearest building tile within `r` (a square), or Infinity: world.occ marks every footprint tile.
function buildingNear(world, x, y, r) {
  let best = Infinity;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!inBounds(world.size, tx, ty) || !world.occ[idx(world.size, tx, ty)]) continue;
      best = Math.min(best, Math.hypot(dx, dy));
    }
  }
  return best;
}
const free = (world, x, y) => inBounds(world.size, x, y) && buildable(world, idx(world.size, x, y)) && !world.occ[idx(world.size, x, y)] && !world.road[idx(world.size, x, y)];   // Stage 4.7 (ruling 472): a herd never stands on water or hills (a bridge is a road tile, which a herd leaves alone anyway)

const newHerd = (world, kind, x, y, day) => {
  const w = world.wildlife, k = HERD_KINDS[kind];
  const size = k.min + Math.floor(hash2(w.nextId, 0, salt(world, 'herdSize')) * (k.max - k.min + 1));
  const herd = { id: w.nextId, kind, x, y, size, max: size, regrow: null, hx: x, hy: y, px: x, py: y, moved: day, hunted: 0, dir: 1 };
  w.nextId += 1;
  w.herds.push(herd);
  return herd;
};

// The kind of the herd with this id: a gazelle about 60 times in 100, else an ostrich (which needs desert).
const kindFor = (world, id) => (hash2(id, 0, salt(world, 'herdKind')) < 0.6 ? 'gazelle' : 'ostrich');

// A free spot for a herd of a kind: seeded tries over the map, on its ground, WILDLIFE.awayFrom tiles from buildings and WILDLIFE.apart from other herds.
function spotFor(world, kind, key, edge = false) {
  const n = world.size, oases = world.oases || [], oasisSalt = (world.seed + S47_SALT.herdOasis) | 0;
  for (let k = 0; k < 400; k++) {
    let x = Math.floor(hash2(key, k * 2, salt(world, 'herdSpawn')) * n), y = Math.floor(hash2(key, k * 2 + 1, salt(world, 'herdSpawn')) * n);
    if (edge) {                                  // a map edge: one of the four sides, 1-3 tiles in
      const side = Math.floor(hash2(key, k + 1000, salt(world, 'herdWander')) * 4), d = 1 + Math.floor(hash2(key, k + 2000, salt(world, 'herdWander')) * 3);
      if (side === 0) y = d; else if (side === 1) y = n - 1 - d; else if (side === 2) x = d; else x = n - 1 - d;
    }
    // Stage 4.7 (ruling 463): herds favour oases. On a map with an oasis, OASES.herdShare of the tries aim at one: a seeded oasis and a spot
    // OASES.herdReach tiles from its pool's edge (S47_SALT.herdOasis). With no oasis this draws nothing, so every other map spawns as before.
    if (!edge && oases.length && hash2(key, k * 3 + 5000, oasisSalt) < OASES.herdShare) {
      const o = oases[Math.floor(hash2(key, k * 3 + 5001, oasisSalt) * oases.length)];
      const a = hash2(key, k * 3 + 5002, oasisSalt) * Math.PI * 2, rr = o.r + OASES.herdReach[0] + hash2(key, k * 3 + 5003, oasisSalt) * (OASES.herdReach[1] - OASES.herdReach[0]);
      x = Math.round(o.x + Math.cos(a) * rr); y = Math.round(o.y + Math.sin(a) * rr);
    }
    if (!inBounds(n, x, y) || !groundOk(kind, terrainAt(world, x, y)) || !free(world, x, y)) continue;
    if (buildingNear(world, x, y, WILDLIFE.awayFrom) !== Infinity) continue;
    if (world.wildlife.herds.some((h) => Math.hypot(h.x - x, h.y - y) < (edge ? 3 : WILDLIFE.apart))) continue;
    return { x, y };
  }
  return null;
}

// Places the first herds (once, from the Town on).
function seedHerds(world) {
  const w = world.wildlife;
  w.seeded = true;
  for (let i = 0; i < startHerds(world); i++) {
    const kind = kindFor(world, w.nextId);
    const at = spotFor(world, kind, w.nextId);
    if (at) newHerd(world, kind, at.x, at.y, world.day);
    else w.nextId += 1;                          // no room for this one: the next herd draws afresh
  }
}

// ── Hunting ──
const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
const gap = (b, h) => { const c = centre(b); return Math.hypot(c.x - (h.x + 0.5), c.y - (h.y + 0.5)); };
// The herds a hunting lodge's hunters can reach: within HUNTING.reach tiles of the lodge's middle, nearest first (ties by id).
export function herdsInReach(world, b) {
  return world.wildlife.herds.filter((h) => h.size > 0 && gap(b, h) <= HUNTING.reach).sort((p, q) => gap(b, p) - gap(b, q) || p.id - q.id);
}
// Ruling 460: a hunt takes one animal, which brings HUNTING.gamePerAnimal game; a herd gives one animal a month (HUNTING.perHerdMonth game);
// hunters never take a herd below HUNTING.keepAtLeast animals. A lodge carries the game of its last animal (b.gameLeft) until it has made it.
export const ANIMALS_PER_HERD_MONTH = Math.max(1, Math.floor(HUNTING.perHerdMonth / HUNTING.gamePerAnimal));
const gaveThisMonth = (h) => (h.hunted || 0) >= ANIMALS_PER_HERD_MONTH;
const huntable = (h) => !gaveThisMonth(h) && h.size > HUNTING.keepAtLeast;
// The herd a hunt takes from now: the nearest in reach that has not given its animal this month and has more than HUNTING.keepAtLeast, or null.
export const huntHerd = (world, b) => herdsInReach(world, b).find(huntable) || null;
// Why a working lodge is resting, from the sim's own counts: 'month' (it has made HUNTING.maxMonth game this month), 'herds' (every herd in reach
// has given its animal this month), 'small' (the herds in reach that have not are down to HUNTING.keepAtLeast: the hunters let them regrow), or
// null (it can hunt now, has game in hand, or no herd is in reach: that is huntingOutlook's herds = 0).
export function huntRest(world, b) {
  if ((b.hunted || 0) >= HUNTING.maxMonth) return 'month';
  if ((b.gameLeft || 0) > 0) return null;
  const herds = herdsInReach(world, b);
  if (!herds.length || huntHerd(world, b)) return null;
  return herds.every(gaveThisMonth) ? 'herds' : 'small';
}
// What the lodge can bring in a month with the herds as they stand, in game: HUNTING.perHerdMonth for each herd in reach that can give its animal
// this month (or has given it), no more than HUNTING.maxMonth. month counts the whole month, the game already made in it included; left (ruling
// 421) is what it may still bring this month: the game in hand and HUNTING.perHerdMonth from each herd that can still give its animal (to any
// lodge), no more than the lodge's HUNTING.maxMonth less what it has made (b.hunted, game). Both counts start afresh at the month's end.
export function huntingOutlook(world, b) {
  const herds = herdsInReach(world, b);
  const animals = herds.reduce((s, h) => s + h.size, 0);
  const month = Math.min(HUNTING.maxMonth, herds.filter((h) => gaveThisMonth(h) || huntable(h)).length * HUNTING.perHerdMonth);
  const taken = b.hunted || 0;
  const left = Math.max(0, Math.min(HUNTING.maxMonth - taken, (b.gameLeft || 0) + herds.filter(huntable).length * HUNTING.perHerdMonth));
  return { herds: herds.length, animals, month, left, taken };
}
// One animal taken from a herd by a lodge's hunters: the herd shrinks, a herd that is no longer full starts regrowing, one at 0 is gone (only
// the Court can empty one: hunters keep HUNTING.keepAtLeast). The lodge gains HUNTING.gamePerAnimal game in hand (b.gameLeft), which it makes
// one unit at a time, each counted against HUNTING.maxMonth (b.hunted: game this month).
export function takeGame(world, herd, lodge = null) {
  if (lodge) lodge.gameLeft = (lodge.gameLeft || 0) + HUNTING.gamePerAnimal;
  herd.size -= 1;
  herd.hunted = (herd.hunted || 0) + 1;
  world.tally.hunted += 1;
  if (herd.size <= 0) world.wildlife.herds = world.wildlife.herds.filter((h) => h !== herd);
  else if (herd.regrow === null) herd.regrow = world.day + WILDLIFE.regrowMonths * DAYS_PER_MONTH;
}

// ── Crocodile spots (render and the scare) ──
// Water tiles with dry land beside them, picked by the seed: the WILDLIFE.crocs lowest draws (area scales the number), WILDLIFE.crocApart tiles
// apart. Derived from the terrain, which never changes in play, and cached on it.
const crocCache = new WeakMap();
export function crocSpots(world) {
  const key = world.terrain;
  const hit = crocCache.get(key);
  if (hit && hit.seed === world.seed) return hit.spots;
  const n = world.size, cands = [];
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      if (world.terrain[idx(n, x, y)] !== T.WATER) continue;
      const dry = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => buildable(world, idx(n, x + dx, y + dy)));   // Stage 4.7: open land beside it (src/sim/terrain.js)
      if (dry) cands.push({ x, y, h: hash2(x, y, salt(world, 'crocSpot')) });
    }
  }
  cands.sort((p, q) => p.h - q.h || p.y - q.y || p.x - q.x);
  const want = Math.max(2, Math.round(WILDLIFE.crocs * areaScale(n))), spots = [];
  for (const c of cands) {
    if (spots.length >= want) break;
    if (spots.every(([sx, sy]) => Math.hypot(sx - c.x, sy - c.y) >= WILDLIFE.crocApart)) spots.push([c.x, c.y]);
  }
  crocCache.set(key, { seed: world.seed, spots });
  return spots;
}
// The crocodile spots within WILDLIFE.crocReach tiles of a building's footprint (the straight gap between a spot's tile and the footprint).
export function crocsNear(world, b) {
  return crocSpots(world).filter(([sx, sy]) => {
    const dx = Math.max(0, b.x - sx, sx - (b.x + b.w - 1)), dy = Math.max(0, b.y - sy, sy - (b.y + b.d - 1));
    return Math.hypot(dx, dy) <= WILDLIFE.crocReach;
  });
}
// Whether a building is one a crocodile can scare: it has workers (a home or garden has none), the city has threats on (not Peaceful) and the
// crocodiles are in the city yet (wildlifeOn: from the Town on, as wildlifeDay draws the scare; final review: a Village sheet warned of a scare
// that could not happen).
export const scareable = (world, b) => Boolean(BUILDINGS[b.type].workers) && threatsOn(world) && wildlifeOn(world);
// The scare's day in a month (0-based day of the month) and whether this month has one (a draw: scareChance).
const monthIndexOf = (day) => Math.floor(day / DAYS_PER_MONTH);
export const scareDayOf = (world, month) => Math.floor(hash2(month, 1, salt(world, 'crocScare')) * DAYS_PER_MONTH);
export const scareHappens = (world, month) => hash2(month, 2, salt(world, 'crocScare')) < WILDLIFE.scareChance;
// The scare a building is under now ({ id, until }) or null.
// A wave 1 v7 save has no scares list until the first day tidies it: a sheet opened before that reads none (final review).
export const scareOf = (world, b) => ((world.wildlife && world.wildlife.scares) || []).find((s) => s.id === b.id) || null;

// ── Days and months ──
function moveHerds(world) {
  for (const h of world.wildlife.herds) {
    if ((world.day + h.id) % WILDLIFE.moveEvery !== 0) continue;
    const near = buildingNear(world, h.x, h.y, WILDLIFE.awayFrom);
    const flee = near !== Infinity;
    let best = null;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = h.x + dx, y = h.y + dy;
        if (!inBounds(world.size, x, y) || !groundOk(h.kind, terrainAt(world, x, y)) || !free(world, x, y)) continue;
        if (!flee && Math.hypot(x - h.hx, y - h.hy) > WILDLIFE.homeRange) continue;
        const away = buildingNear(world, x, y, WILDLIFE.awayFrom + 1);
        const score = (away === Infinity ? 10 : away * 2) + hash2(h.id * 7 + dx * 3 + dy, world.day, salt(world, 'herdMove')) * 6;
        if (!best || score > best.score) best = { x, y, score };
      }
    }
    if (!best) continue;
    // With a building near, the herd keeps moving off: its home moves too, so it does not wander back.
    h.px = h.x; h.py = h.y; h.moved = world.day;
    h.dir = (best.x - h.x) - (best.y - h.y) >= 0 ? 1 : -1;
    h.x = best.x; h.y = best.y;
    if (flee) { h.hx = best.x; h.hy = best.y; }
  }
}

// A herd record saved before the River track filled its record in (a wave 1 build) lacks the fields below: give it the starting values.
function tidy(w) {
  if (!Array.isArray(w.scares)) w.scares = [];
  if (!Number.isInteger(w.scareMonth)) w.scareMonth = -1;
  if (!Number.isInteger(w.arrived)) w.arrived = 0;
  if (typeof w.seeded !== 'boolean') w.seeded = w.herds.length > 0;
}

function releaseScares(world) {
  const w = world.wildlife;
  tidy(w);
  if (!w.scares.length) return;
  w.scares = w.scares.filter((s) => {
    if (world.day < s.until) return true;
    const b = world.buildings[s.id];
    if (b && b.paused) b.paused = false;        // paused by the scare: it works again. A player who paused or resumed it since took it back (ruling 423:
                                                // setPaused drops the scare), so a pause still under a scare here is the scare's own
    return false;
  });
}

// One day of the herds (wandering away from buildings, a crocodile scare). The first herds are placed on the first day from the Town on.
export function wildlifeDay(world, events = null) {
  releaseScares(world);
  if (!wildlifeOn(world)) return;
  const w = world.wildlife;
  if (!w.seeded) seedHerds(world);
  moveHerds(world);
  const month = monthIndexOf(world.day);
  if (w.scareMonth !== month && world.day % DAYS_PER_MONTH === scareDayOf(world, month) && threatsOn(world)) {
    w.scareMonth = month;
    if (scareHappens(world, month)) {
      const hit = Object.values(world.buildings).filter((b) => scareable(world, b) && staffed(b) && !scareOf(world, b) && crocsNear(world, b).length)
        .sort((p, q) => p.id - q.id);
      if (hit.length) {
        const b = hit[Math.floor(hash2(month, 3, salt(world, 'crocScare')) * hit.length)];
        b.paused = true;
        w.scares.push({ id: b.id, until: world.day + WILDLIFE.scareDays });
        world.tally.crocScares += 1;
        if (events) events.push({ type: 'croc_scare', id: b.id, kind: b.type, days: WILDLIFE.scareDays });
      }
    }
  }
}

// The month's herd work: a new month for the hunters' count, the regrowth, a herd wandering in once a year.
export function wildlifeMonth(world, events = null) {
  if (!wildlifeOn(world)) return;
  const w = world.wildlife;
  tidy(w);
  for (const b of Object.values(world.buildings)) if (b.hunted) b.hunted = 0;
  for (const h of w.herds) {
    h.hunted = 0;
    if (h.regrow !== null && world.day >= h.regrow) {
      h.size = Math.min(h.max, h.size + 1);
      h.regrow = h.size < h.max ? h.regrow + WILDLIFE.regrowMonths * DAYS_PER_MONTH : null;
    }
  }
  const month = monthIndexOf(world.day), year = Math.floor(month / MONTHS_PER_YEAR) + 1, m = (month % MONTHS_PER_YEAR) + 1;
  const when = 1 + Math.floor(hash2(year, 0, salt(world, 'herdWander')) * MONTHS_PER_YEAR);   // the month this year a herd wanders in
  if (m === when && w.arrived < year) {
    w.arrived = year;
    if (w.herds.length < maxHerds(world)) herdArrives(world, events);
  }
}

// The alerts wildlife raises: none (a scare is a caption).
export const wildlifeAlerts = (world) => [];

// ── The Court's Lost herd card ──
// A herd wanders in from a map edge: { id, kind, x, y, size }, or null when none can (the map holds its most, or no free ground at an edge).
export function herdArrives(world, events = null) {
  const w = world.wildlife;
  if (w.herds.length >= maxHerds(world)) return null;
  const key = w.nextId * 31 + (world.day % 97);
  const first = kindFor(world, key), kinds = [first, first === 'gazelle' ? 'ostrich' : 'gazelle'];
  let kind = null, at = null;
  for (const k of kinds) { at = spotFor(world, k, key, true); if (at) { kind = k; break; } }
  if (!at) return null;
  const h = newHerd(world, kind, at.x, at.y, world.day);
  if (events) events.push({ type: 'herd_arrived', id: h.id, kind: h.kind, size: h.size });
  return { id: h.id, kind: h.kind, x: h.x, y: h.y, size: h.size };
}
// The herd nearest the city's focus is sent off (to the capital's hunting grounds): { id, kind, x, y, size }, or null with no herd.
export function herdLeaves(world, events = null) {
  const w = world.wildlife;
  if (!w.herds.length) return null;
  const f = world.focus || { x: world.size / 2, y: world.size / 2 };
  const near = w.herds.slice().sort((p, q) => Math.hypot(p.x - f.x, p.y - f.y) - Math.hypot(q.x - f.x, q.y - f.y) || p.id - q.id)[0];
  w.herds = w.herds.filter((h) => h !== near);
  if (events) events.push({ type: 'herd_left', id: near.id, kind: near.kind, size: near.size });
  return { id: near.id, kind: near.kind, x: near.x, y: near.y, size: near.size };
}
