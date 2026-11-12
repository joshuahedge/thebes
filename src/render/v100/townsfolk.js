// Version 10.0, Track L (L.2, spec 5a, rulings 2202-2204): townsfolk, the people who are not on an errand. Each home with residents in the view
// has, by a hash of the home and the hour of the light loop's day, none, one or two figures at its door or in its yard for a while: a woman grinding
// grain, a man mending a net in the shade, children playing (one running about on game time, one sitting), a goat or a dog standing or lying. A
// home within TOWNSFOLK.bankReach tiles of the water sends its women down to the bank instead: one kneeling to wash, one carrying water. Each
// figure keeps its place for its window (TOWNSFOLK.slotMs of the real clock) and fades in and out over LIFE.fadeMs, never popping; the yards
// thin at dusk (they fade with the night's dark) and are empty at night. At most LIFE.idleCap[device] figures, the homes nearest the middle of
// the view first. Gentle: they stand (the running child too); Still: none. Source 'idle', ids from LIFE_IDS.townsfolk.
//   townsfolkAt(world, timeDays, nowMs, range, motion, { deviceKind, day }) -> walker entries { id, kind, x, y, dir, stand, alpha }
import { LIFE } from '../../data/ambient.js';
import { LIGHT } from '../../data/seasons.js';
import { T } from '../../sim/terrain.js';
import { idx, inBounds } from '../../sim/grid.js';
import { DEVICE_KIND } from '../spriteCache.js';
import { dayOf } from '../light.js';
import { LIFE_IDS } from './life.js';
import { LIFE_SALT as S, unit, nearestHomes, fadeIn, facing, clamp01 } from './lifeCommon.js';

export const TOWNSFOLK = {
  slotMs: 24000,           // how long a figure keeps its place (real ms), each home's windows out of step
  share: [[0, 0.3], [0.18, 0.42], [0.42, 0.26], [0.75, 0.36], [1, 0.3]],   // the share of homes with a figure through the day phase (busy in the morning, fewer at noon), between these points
  twilight: 0.3,           // the share at dusk and dawn (the day's ends: the figures fade with the dark instead)
  margin: 0.04,            // the share over which a figure fades as the hour passes it
  homesPerCap: 1.6,        // homes looked at, per figure the cap allows (about 0.57 figures a home in the morning: the cap is met only then)
  second: 0.35,            // of those, the share with a second figure
  bankReach: 2,            // tiles from a home to the water for the bank's figures
  bankShare: 0.6,          // of a bank home's figures, the share at the bank
  run: 0.35,               // how far (tiles) a running child goes each way along the yard, on game time
};
// The yard's poses and their weights.
const POSES = [['woman_grind', 5], ['citizen_sit', 4], ['child', 4], ['child_sit', 2], ['goat', 2], ['goat_lie', 1.5], ['dog', 1.5], ['dog_lie', 2]];
const POSE_TOTAL = POSES.reduce((n, [, w]) => n + w, 0);
function poseOf(h) {
  let v = h * POSE_TOTAL;
  for (const [k, w] of POSES) { if (v < w) return k; v -= w; }
  return POSES[0][0];
}

// The share of homes with a figure at the hour of the day: { phase, u } from light.js dayOf. u is the loop's 0..1, the day phase its first LIGHT.day.
export function shareAt(day) {
  if (day.phase === 'night') return 0;
  if (day.phase !== 'day') return TOWNSFOLK.twilight;
  const v = clamp01(day.u / LIGHT.day), pts = TOWNSFOLK.share;                  // 0 .. 1 through the day phase
  for (let i = 1; i < pts.length; i++) {
    if (v <= pts[i][0]) { const [a, sa] = pts[i - 1], [c, sc] = pts[i]; return sa + (sc - sa) * ((v - a) / (c - a)); }
  }
  return pts[pts.length - 1][1];
}

// The spot by the water for a home within bankReach tiles of it: the land tile next to the nearest water tile, nudged to the edge, and the way
// to the water. Cached per world and terrain (the terrain never changes in play).
const banks = new WeakMap();
export function bankSpot(world, b) {
  let m = banks.get(world);
  if (!m || m.terrain !== world.terrain) { m = { terrain: world.terrain, spots: new Map() }; banks.set(world, m); }
  const n = world.size, R = TOWNSFOLK.bankReach;
  if (m.spots.has(b.id)) {                                                       // kept while its tile stays open (a building put there since moves it)
    const had = m.spots.get(b.id);
    if (!had || !world.occ[idx(n, Math.floor(had.x), Math.floor(had.y))]) return had;
  }
  let best = null;
  for (let y = b.y - R; y < b.y + b.d + R; y++) for (let x = b.x - R; x < b.x + b.w + R; x++) {
    if (!inBounds(n, x, y) || world.terrain[idx(n, x, y)] !== T.WATER) continue;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const lx = x + dx, ly = y + dy;
      if (!inBounds(n, lx, ly) || world.terrain[idx(n, lx, ly)] === T.WATER || world.occ[idx(n, lx, ly)]) continue;   // open ground, not under a building
      const d = Math.abs(lx + 0.5 - (b.x + b.w / 2)) + Math.abs(ly + 0.5 - (b.y + b.d / 2));
      if (!best || d < best.d || (d === best.d && idx(n, lx, ly) < best.i)) best = { d, i: idx(n, lx, ly), x: lx + 0.5 - dx * 0.32, y: ly + 0.5 - dy * 0.32, wx: -dx, wy: -dy };
    }
  }
  const spot = best ? { x: best.x, y: best.y, dir: facing(best.wx, best.wy), wx: best.wx, wy: best.wy } : null;
  m.spots.set(b.id, spot);
  return spot;
}

export function townsfolkAt(world, timeDays, nowMs, range, motion, { deviceKind = DEVICE_KIND, day = null } = {}) {
  if (motion === 'still' || !range || !world || !world.buildings) return [];
  const d = day || dayOf(world, motion);
  const cap = LIFE.idleCap[deviceKind] || LIFE.idleCap.desktop;
  const dusk = d.phase === 'dusk' || d.phase === 'dawn' ? 1 - clamp01(d.dark) : 1;   // the yards empty as the dark comes on, fill as it lifts
  if (d.phase === 'night' || dusk < 0.02) return [];
  const out = [], seed = world.seed | 0, slotMs = TOWNSFOLK.slotMs, still = motion !== 'full';
  // the homes nearest the middle, TOWNSFOLK.homesPerCap of them a figure the cap allows: a set that holds while the view does, so a figure comes and
  // goes by its own fade, not because a nearer home's took its place (the cap itself is cut only at the busiest hour)
  for (const b of nearestHomes(world, range, nowMs).slice(0, Math.ceil(cap * TOWNSFOLK.homesPerCap))) {
    if (world.buildings[b.id] !== b) continue;                                   // gone since the list was made
    if (out.length >= cap) break;
    for (let k = 0; k < 2 && out.length < cap; k++) {
      const off = unit(b.id, k, seed, S.idle) * slotMs, at = nowMs + off, slot = Math.floor(at / slotMs), t = at - slot * slotMs;
      // the share moves smoothly with the hour, and a figure whose hash it passes fades over TOWNSFOLK.margin of it (about ten seconds), never popping
      const share = shareAt(d) * (k ? TOWNSFOLK.second : 1), above = (share - unit(b.id * 2 + k, slot, seed, S.pose)) / TOWNSFOLK.margin;
      if (above <= 0) continue;
      const alpha = fadeIn(t, slotMs, LIFE.fadeMs) * dusk * clamp01(above);
      if (alpha < 0.02) continue;
      // its id by the window's parity too: the figure fading out at a window's end and the one fading in at the next's start are two figures
      const h = unit(b.id + k * 7919, slot, seed, S.spot), id = LIFE_IDS.townsfolk + (b.id % 49999) * 4 + k * 2 + (slot & 1);
      const bank = h < TOWNSFOLK.bankShare ? bankSpot(world, b) : null;
      if (bank) {
        const kneel = k === 0;                                                   // one kneeling to wash; a second carries water up from her
        out.push({ id, kind: kneel ? 'woman_kneel' : 'water', x: bank.x - (kneel ? 0 : bank.wx * 0.5 + bank.wy * 0.3), y: bank.y - (kneel ? 0 : bank.wy * 0.5 + bank.wx * 0.3), dir: bank.dir, stand: true, alpha });
        continue;
      }
      const kind = poseOf(unit(b.id + k * 104729, slot, seed, S.pose + 1));
      // the yard: along the home's front-left edge (k 0) or its front-right edge (k 1), a share of the way along it, just in front
      const v = 0.22 + 0.56 * unit(b.id, slot + k, seed, S.spot + 1), left = (k === 0) !== (h > 0.8);
      let x = left ? b.x + v * b.w : b.x + b.w + 0.2, y = left ? b.y + b.d + 0.2 : b.y + v * b.d;
      let dir = h * 7 % 1 < 0.5 ? 1 : 3, stand = true;
      if (kind === 'child' && !still) {                                          // running to and fro along the yard, on game time (it holds while paused)
        const ph = timeDays * 0.9 + unit(b.id, k, seed, S.spot + 2) * 6, s = Math.sin(ph * Math.PI) * TOWNSFOLK.run, ds = Math.cos(ph * Math.PI);
        if (left) x += s; else y += s;
        dir = left ? (ds >= 0 ? 1 : 3) : facing(0, ds >= 0 ? 1 : -1);
        stand = false;
      }
      out.push({ id, kind, x, y, dir, stand, alpha });
    }
  }
  return out;
}

// The life source (createUI registers it): `idle`, allowed in the lesson (spec 5h: townsfolk and hearths only).
export function townsfolkSource({ deviceKind = DEVICE_KIND, settings = () => null } = {}) {
  return {
    name: 'idle', lessonOk: true,
    walkers: (world, timeDays, nowMs, range, motion) => townsfolkAt(world, timeDays, nowMs, range, motion, { deviceKind, day: dayOf(world, motion, settings()) }),
  };
}
