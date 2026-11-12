// Version 10.0, Track L (L.6 and L.8, spec 5e and 5g, rulings 2220-2224, 2242): lamps, hearths and smoke at night, the life source 'flicker'. Its
// late hook runs after the light pass (render/light.js drawLight: the night's tint, the lamps, each lamp's flicker under Full), so its glows add
// light over the tint:
//   doors     from dusk every home with residents glows warm at its door (a small lit opening in its front face and a soft pool before it),
//             as bright as the lamps; on a festival day the hearths light NIGHT_LIFE.festivalLeadMs before dusk
//   hearths   one home in NIGHT_LIFE.hearthShare (by hash) sends up a thin, slow hearth smoke from dusk to dawn (the ambient smoke's puff, at
//             NIGHT_LIFE.smokeAlpha, drifting with the wind; under Gentle it fades in place)
//   palace    at dusk the palace's windows light one after another, a sweep over NIGHT_LIFE.sweepMs, and stay lit through the night
// At most NIGHT_LIFE.doors doors and NIGHT_LIFE.hearths hearths, the homes nearest the middle of the view first; far out (a lamp under a pixel) the
// doors are left to the lamps' dots. Under Gentle the lights are steady (no flicker), under Still nothing (as the light itself). Allowed in the lesson.
import { LIGHT, LAMP } from '../../data/seasons.js';
import { buildingsInRange } from '../chunkIndex.js';
import { DEVICE_KIND } from '../spriteCache.js';
import { lightShown, lightPeek, glowPool, flickerOf } from '../light.js';
import { festivalOn } from '../walkers.js';
import { windAt } from '../ambient.js';
import { ART, slotFor } from '../art/registry.js';
import { p, U } from '../iso.js';
import { LIFE_SALT as S, unit, nearestFirst, nearestHomes, clamp01 } from './lifeCommon.js';

export const NIGHT_LIFE = { doors: 160, hearths: 24, phone: { doors: 90, hearths: 14 }, hearthShare: 0.25, smokeAlpha: 0.3, smokeMs: 5000, festivalLeadMs: 60000, sweepMs: 3000, doorGlow: 4, door: '#FFC872', pool: '#C8783A', smoke: '#E6E0DC' };

// How lit the doors are now: the lamps' strength (light.js), or on a festival day the early hearths' rise over the minute before dusk.
export function doorsLit(world, l = lightShown()) {
  let k = l.lamps;
  if (festivalOn(world) && l.phase === 'day') {
    const t = ((lightPeek(world) % LIGHT.cycleMs) + LIGHT.cycleMs) % LIGHT.cycleMs, dusk = LIGHT.day * LIGHT.cycleMs;
    k = Math.max(k, 0.6 * clamp01(1 - (dusk - t) / NIGHT_LIFE.festivalLeadMs));
  }
  return clamp01(k);
}
// How long since dusk began (ms of the light loop), for the palace's sweep; null outside dusk and night.
function sinceDusk(world, l) {
  if (l.phase !== 'dusk' && l.phase !== 'night') return null;
  const t = ((lightPeek(world) % LIGHT.cycleMs) + LIGHT.cycleMs) % LIGHT.cycleMs;
  return t - LIGHT.day * LIGHT.cycleMs;
}

const homesIn = (world, range) => buildingsInRange(world, range).filter((b) => b.type === 'house' && b.residents > 0);

// The doors: a lit opening in each home's front-left face and a soft pool on the ground before it.
export function doorPoints(world, range, g, cap = NIGHT_LIFE.doors, homes = nearestFirst(homesIn(world, range), range)) {
  const out = [];
  for (const b of homes) {
    if (out.length >= cap) break;
    if (g && g.cull && !g.cull.sees(b.x + b.w / 2, b.y + b.d / 2, [-24, -40, 24, 14])) continue;
    out.push({ b, x: b.x + b.w * (0.35 + 0.3 * unit(b.id, 1, world.seed, S.hearth)), y: b.y + b.d });
  }
  return out;
}
// The lit openings, in two groups by hash, each one fill, each flickering on its own slow beat under Full (so a fill stays one call), with a brighter
// core low in each (the hearth's light seen through the door). The homes' warm pools are the lamps' (light.js).
function drawDoors(g, world, range, k, now, motion, homes, cap = NIGHT_LIFE.doors) {
  if (g.cssScale !== undefined && g.cssScale < LAMP.farCss) return 0;
  const doors = doorPoints(world, range, g, cap, homes), openings = [[], []], cores = [];
  if (!doors.length) return 0;
  for (const d of doors) {
    openings[d.b.id & 1].push([U(p(d.x - 0.07, d.y), 0.2), U(p(d.x + 0.07, d.y), 0.2), U(p(d.x + 0.07, d.y), 4.6), U(p(d.x - 0.07, d.y), 4.6)]);
    cores.push([U(p(d.x - 0.04, d.y), 0.4), U(p(d.x + 0.04, d.y), 0.4), U(p(d.x + 0.04, d.y), 2.2), U(p(d.x - 0.04, d.y), 2.2)]);
  }
  for (const grp of [0, 1]) if (openings[grp].length) g.polys(openings[grp], NIGHT_LIFE.door, { alpha: Math.min(1, 0.85 * k * (motion === 'full' ? flickerOf(grp, 7, now) : 1)) });
  g.polys(cores, '#FFF0C8', { alpha: 0.8 * k });
  return doors.length;
}

// The hearths' smoke: two thin puffs rising slowly from the roof's middle, a new one every half of NIGHT_LIFE.smokeMs.
function drawHearths(g, world, range, k, now, motion, homes, cap = NIGHT_LIFE.hearths) {
  let n = 0;
  const wind = motion === 'full' ? windAt(world, now) : { x: 0, y: 0 }, rise = motion === 'full' ? 14 : 2;
  const STEPS = 4, buckets = Array.from({ length: STEPS }, () => []);         // the puffs in four alpha steps: four fills in all
  for (const b of homes) {
    if (n >= cap) break;
    if (unit(b.id, 2, world.seed, S.hearth) >= NIGHT_LIFE.hearthShare) continue;
    const def = ART[slotFor(b, world)], base = U(p(b.x + b.w * 0.55, b.y + b.d * 0.4), Math.round((def ? def.height : 10) * 0.75));
    const off = unit(b.id, 3, world.seed, S.hearth) * NIGHT_LIFE.smokeMs;
    for (let i = 0; i < 2; i++) {
      const a = (((now + off) / NIGHT_LIFE.smokeMs + i / 2) % 1 + 1) % 1, v = Math.min(1, a / 0.2) * (1 - a) * 1.25;   // in, then out over its life
      const step = Math.min(STEPS - 1, Math.floor(v * STEPS));
      if (v < 0.05) continue;
      const drift = p(wind.x * a * 0.4, wind.y * a * 0.4), r = 1.3 + a * 2.2, c = [base[0] + drift[0], base[1] - 1 - rise * a + drift[1]], pts = [];
      for (let j = 0; j < 8; j++) { const t = (j / 8) * 2 * Math.PI; pts.push([c[0] + r * Math.cos(t), c[1] + r * 0.8 * Math.sin(t)]); }
      buckets[step].push(pts);
    }
    n++;
  }
  const dimmed = 1 - 0.5 * clamp01(lightShown().dark);                         // drawn over the night's tint: dimmed to sit in it
  buckets.forEach((list, s) => { if (list.length) g.polys(list, NIGHT_LIFE.smoke, { alpha: NIGHT_LIFE.smokeAlpha * k * dimmed * ((s + 1) / STEPS) }); });
  return n;
}

// The palace's windows: NIGHT_LIFE windows along its two front faces, lighting one after another over the sweep at dusk.
function drawPalace(g, world, range, l, now) {
  const since = sinceDusk(world, l);
  if (since === null || l.lamps < 0.02) return 0;
  const palaces = buildingsInRange(world, range).filter((b) => b.type === 'palace');
  const S2 = g.scale, ctx = g.ctx;
  let n = 0;
  for (const b of palaces) {
    const def = ART[slotFor(b, world)], h = Math.max(8, (def ? def.height : 20) * 0.35), wins = [];
    for (let i = 0; i < 4; i++) wins.push(U(p(b.x + b.w * (0.2 + 0.2 * i), b.y + b.d), h), U(p(b.x + b.w, b.y + b.d * (0.8 - 0.2 * i)), h));
    const pool = glowPool(3 * S2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    wins.forEach((q, i) => {
      const on = clamp01((since - (i / wins.length) * NIGHT_LIFE.sweepMs) / 400) * l.lamps;
      if (on < 0.02) return;
      ctx.globalAlpha = on;
      ctx.drawImage(pool.canvas, q[0] * S2 - 3 * S2, q[1] * S2 - 3 * S2, 6 * S2, 6 * S2);
      n++;
    });
    ctx.restore();
  }
  return n;
}

// `only` (a test's): a set of the parts to draw, of 'doors', 'hearths', 'palace'. deviceKind 'phone' takes NIGHT_LIFE.phone's caps.
export function drawNightLife(g, world, range, now, motion, l = lightShown(), only = null, deviceKind = 'desktop') {
  if (motion === 'still' || !range || !g.ctx) return 0;
  const k = doorsLit(world, l);
  if (k < 0.02) return 0;
  const homes = nearestHomes(world, range, now).filter((b) => world.buildings[b.id] === b), on = (part) => !only || only.has(part);
  const caps = deviceKind === 'phone' ? NIGHT_LIFE.phone : NIGHT_LIFE;
  return (on('doors') ? drawDoors(g, world, range, k, now, motion, homes, caps.doors) : 0) + (on('hearths') ? drawHearths(g, world, range, k, now, motion, homes, caps.hearths) : 0)
    + (on('palace') ? drawPalace(g, world, range, l, now) : 0);
}

// The life source (createUI registers it): 'flicker', allowed in the lesson (spec 5h: hearths).
export function nightSource({ deviceKind = DEVICE_KIND } = {}) {
  return { name: 'flicker', lessonOk: true, late: (g, world, range, nowMs, motion) => { drawNightLife(g, world, range, nowMs, motion, lightShown(), null, deviceKind); } };
}
