// Version 10.0, Track L (L.4, spec 5c, rulings 2210-2214): river life, on the real clock, on the river's rows in view (ambient.js riverRows:
// a classic map's river; a 7.1 layout's water blobs have no rows and no river life).
//   feluccas   from City (one) and Capital (two): a sailing boat crossing the river between the banks at a hash-chosen row near the middle of
//              the view, RIVER.crossMs a crossing, out and back, its sail on the way it goes
//   herons     two in the shallows at the crossing's banks; as a felucca comes within RIVER.startle tiles one lifts, a two-frame rise (Full),
//              and is gone until the boat has passed
//   crocodile  in Shemu one basks on the bank nearest the middle of the view through the day and slides into the water at dusk
//   hippo      once a minute a hippo surfaces in the deep channel for a few seconds, a splash as it comes up and goes down
// The wharf's own boat and its fisher are the River track's (render/wildlife.js boatOf, on game time): life adds no second boat (ruling 2210).
// At most LIFE.riverCap figures. Gentle: the boats stand at their crossing's middle, the herons stand (no lift), the crocodile and the hippo as
// under Full but never moving (their shows and slides are fades in place); Still: none. Source 'river', ids from LIFE_IDS.river. Not in the lesson.
//   riverLifeAt(world, timeDays, nowMs, range, motion, { day }) -> walker entries
import { LIFE } from '../../data/ambient.js';
import { milestoneIndex } from '../../sim/progression.js';
import { seasonAt } from '../../sim/seasons.js';
import { riverRows } from '../ambient.js';
import { dayOf } from '../light.js';
import { LIFE_IDS } from './life.js';
import { LIFE_SALT as S, unit, clamp01, inRange } from './lifeCommon.js';

export const RIVER = {
  crossMs: 40000,          // a felucca's crossing, bank to bank (real ms); it rests RIVER.restMs at each bank
  restMs: 6000,
  startle: 2,              // tiles: a heron lifts as a boat comes this near
  hippoEveryMs: 60000,     // a hippo surfaces once a minute ...
  hippoUpMs: 7000,         // ... for this long, a splash its first and last second
  minWidth: 3,             // a crossing needs at least this much river (tiles)
};
// Version 10.0.1 (Track A, A.2, rulings 2378-2380): the real-ms pacing of river life's new frames.
export const HERON_FLAP_MS = 150;       // a rising or landing heron swaps its two flap frames this often
const HERON_LOOK_MS = 400;              // the boat's place this long ago: nearer then than now means the heron is landing
export const CROC_SWAY_MS = 1800;       // a basking crocodile's tail takes this long to pass from one of its four poses to the next
export const HIPPO_FLICK_MS = 2400;     // a surfaced hippo flicks its ears once in this long, for HIPPO_FLICK_HOLD_MS
export const HIPPO_FLICK_HOLD_MS = 350;
const FROM_CITY = milestoneIndex('city'), FROM_CAPITAL = milestoneIndex('capital');
const rankOf = (world) => milestoneIndex(world.milestone || 'village');

// The river's rows in view (and a row each side), widest-first candidates for a crossing near the middle.
function rowsInView(world, range) {
  const rows = riverRows(world, range.y0, range.y1);
  return [...rows.entries()].filter(([, r]) => r.right - r.left >= RIVER.minWidth).map(([y, r]) => ({ y, ...r }));
}

// A felucca's place at real time now on its row: { x, y, dir, t (0..1 across), left (heading to the left bank) }.
function feluccaAt(row, k, seed, nowMs, motion) {
  const lane = row.y + 0.5, a = row.left + 0.7, b = row.right - 0.7;
  if (motion !== 'full') return { x: (a + b) / 2, y: lane, left: k % 2 === 1 };
  const span = 2 * (RIVER.crossMs + RIVER.restMs), at = (nowMs + unit(k, row.y, seed, S.felucca) * span) % span;
  const out = at < RIVER.crossMs + RIVER.restMs, u = out ? at : at - RIVER.crossMs - RIVER.restMs;
  const t = clamp01(u / RIVER.crossMs), f = t * t * (3 - 2 * t);                 // eases off a bank and into the next
  return { x: out ? a + (b - a) * f : b - (b - a) * f, y: lane, left: !out };
}

export function riverLifeAt(world, timeDays, nowMs, range, motion, { day = null } = {}) {
  if (motion === 'still' || !range || !world || !world.terrain || world.lesson) return [];
  const rows = rowsInView(world, range);
  if (!rows.length) return [];
  const d = day || dayOf(world, motion), seed = world.seed | 0, out = [], base = LIFE_IDS.river, midY = (range.y0 + range.y1) / 2;
  const near = rows.slice().sort((p, q) => Math.abs(p.y - midY) - Math.abs(q.y - midY) || p.y - q.y);
  // feluccas: one from City, two from Capital, each on a row a few tiles apart, chosen by the hash of the seed and the view's middle band
  const boats = [], nBoats = rankOf(world) >= FROM_CAPITAL ? 2 : rankOf(world) >= FROM_CITY ? 1 : 0;
  for (let k = 0; k < nBoats && k < near.length; k++) {
    const row = near[Math.min(near.length - 1, k * 4 + Math.floor(unit(k, Math.floor(midY / 8), seed, S.felucca) * 2))];
    const f = feluccaAt(row, k, seed, nowMs, motion);
    if (!inRange(f.x, f.y, range)) continue;
    boats.push({ ...f, row, k });
    out.push({ id: base + k, kind: f.left ? 'trade_boat_l' : 'trade_boat', x: f.x, y: f.y, dir: f.left ? 3 : 1, stand: true });
  }
  // herons: in the shallows at each bank of the nearest row's crossing
  const hr = near[0];
  for (let k = 0; k < 2 && hr; k++) {
    const x = k ? hr.right - 0.3 : hr.left + 0.3, y = hr.y + 0.3 + unit(k, hr.y, seed, S.heron) * 0.4;
    if (!inRange(x, y, range)) continue;
    let lift = 0, pose = '';
    if (motion === 'full') {
      const dist = boats.reduce((m, f) => Math.min(m, Math.hypot(f.x - x, f.y - y)), Infinity);
      if (dist < RIVER.startle * 0.45) continue;                                  // flown: back once the boat has gone by
      // Version 10.0.1 (A.2, ruling 2378): the take-off as a boat nears (wings open, then two flap frames while it is up) and the landing as it draws off
      // (the flap, the wings open, the wings folding in). The boat a short while ago says which way it is going.
      const before = boats.reduce((m, f) => Math.min(m, Math.hypot(feluccaAt(f.row, f.k, seed, nowMs - HERON_LOOK_MS, motion).x - x, f.y - y)), Infinity);
      const leaving = dist > before;
      if (dist < RIVER.startle) lift = dist < RIVER.startle * 0.75 ? 9 : 4;
      if (lift === 9) pose = Math.floor(nowMs / HERON_FLAP_MS) % 2 ? '_fu' : '_fd';
      else if (lift === 4) pose = '_o';
      else if (leaving && dist < RIVER.startle * 1.25) pose = '_f';              // down again, the wings folding in
    }
    out.push({ id: base + 10 + k, kind: `heron${pose}${k ? '_l' : ''}`, x, y, dir: k ? 3 : 1, stand: true, lift });
  }
  // the crocodile: Shemu, on the bank nearest the middle; it basks through the day, slides in at dusk, and is gone at night until the next day
  if (seasonAt(world).season === 'shemu' && near.length && (d.phase === 'day' || d.phase === 'dusk')) {
    const row = near[Math.min(near.length - 1, 2)], k = unit(row.y, 3, seed, S.croc) < 0.5 ? 0 : 1;
    const sliding = d.phase === 'dusk', slide = sliding && motion === 'full' ? clamp01(d.dark) * 0.5 : 0;
    const x = k ? row.right + 0.55 - slide : row.left - 0.55 + slide, y = row.y + 0.5;
    const alpha = sliding ? 1 - clamp01(d.dark) : 1;
    // Version 10.0.1 (A.2, ruling 2380): basking, under Full the tail sways (along, up, along, down); sliding in, it goes through three stages (the snout in the
    // water, the forebody sinking, only the back and the eye above it). Gentle keeps the one slide frame and no sway. The new frames face left by name.
    const sway = !sliding && motion === 'full' ? [0, 1, 0, -1][Math.floor(nowMs / CROC_SWAY_MS + unit(row.y, 4, seed, S.croc) * 4) & 3] : 0;
    const stage = sliding ? (motion === 'full' ? (d.dark < 0.34 ? 1 : d.dark < 0.67 ? 2 : 3) : 1) : 0;
    const name = stage === 1 ? 'crocodile_slide' : stage ? `crocodile_slide${stage}` : sway ? `crocodile_t${sway > 0 ? 1 : 2}` : 'crocodile';
    const own = name !== 'crocodile' && name !== 'crocodile_slide';                    // the old two are mirrored by dir; the new frames carry a left copy
    if (inRange(x, y, range) && alpha > 0.02) out.push({ id: base + 20, kind: own && k ? `${name}_l` : name, x, y, dir: k ? 3 : 1, stand: true, alpha });
  }
  // the hippo: once a minute in the deep channel of a row near the middle
  if (near.length) {
    const row = near[Math.min(near.length - 1, 1)], at = (nowMs + unit(row.y, 5, seed, S.hippo) * RIVER.hippoEveryMs) % RIVER.hippoEveryMs;
    if (at < RIVER.hippoUpMs) {
      const x = row.centre + (unit(row.y, 6, seed, S.hippo) - 0.5) * 0.6, y = row.y + 0.5;
      const splash = at < 1000 || at > RIVER.hippoUpMs - 1000;
      // Version 10.0.1 (A.2, ruling 2379): surfaced, under Full it bobs a touch and flicks its ears (a puff at the nostrils) every HIPPO_FLICK_MS.
      const flick = motion === 'full' && !splash && at % HIPPO_FLICK_MS < HIPPO_FLICK_HOLD_MS;
      const e = { id: base + 30, kind: splash ? 'splash0' : flick ? 'hippo_e' : 'hippo', x, y, dir: 1, stand: true, alpha: motion === 'full' ? 1 : clamp01(Math.min(at, RIVER.hippoUpMs - at) / LIFE.fadeMs) };
      if (motion === 'full' && !splash) e.lift = Math.sin(nowMs / 900) * 0.6;
      if (inRange(x, y, range)) out.push(e);
    }
  }
  return out.slice(0, LIFE.riverCap);
}

// The life source (createUI registers it): 'river', not in the lesson.
export function riverSource({ settings = () => null } = {}) {
  return { name: 'river', lessonOk: false, walkers: (world, timeDays, nowMs, range, motion) => riverLifeAt(world, timeDays, nowMs, range, motion, { day: dayOf(world, motion, settings()) }) };
}
