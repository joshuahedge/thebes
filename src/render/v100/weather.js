// Version 10.0, Track L (L.7, spec 5f, rulings 2230-2236): the weather that varies. The wind's drift is ambient.js windAt; the heat shimmer is a V layer
// (render/v90/layers.js drawShimmer). This file is the rare sandstorm:
//   stormsOf(seed, year) -> [{ startDay, seconds }]   seeded by the city's seed and the year (0 the first), so a map always has the same storms and a
//                       test can find one: none in the first year (LIFE.storm.fromYear), else 1 or 2 (LIFE.storm.perYear) on days in Shemu, each lasting
//                       20 to 40 s of real time (LIFE.storm.seconds)
//   stormAt(world, nowMs) -> { on, k, el, seconds }   a storm runs from the first frame on or after its startDay (render-side note, never in the world;
//                       a city loaded days later skips it), k its strength 0..1 (up over STORM.rampMs, down over the same at its end). Never in the lesson.
//   stormSwing, stormLean   the wind's swing (to 60 degrees) and the figures' lean (4 degrees, Full only) at that strength
//   weatherSource()     the life source 'weather': while a storm runs, a warm haze over the map (the sand's colour, to LIFE.storm.hazeAlpha) and, under
//                       Full, dust streaks blown across the view with the swinging wind (to LIFE.storm.dustCap). Gentle: the haze only; Still: nothing.
// The sim reads none of it. The lamps dim by STORM.lampDim (render/light.js) and the gusts thicken (layers.js drawWeather) with k.
import { LIFE } from '../../data/ambient.js';
import { SEASONS } from '../../data/tips.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../sim/time.js';
import { hash2 } from '../../sim/rng.js';
import { p } from '../iso.js';
import { windAt } from '../ambient.js';
import { clamp01, LIFE_SALT as S } from './lifeCommon.js';

// The haze is the sand's warm ochre; the dust banks a deeper ochre rolling through it and the streaks a darker blown sand, so both read over a sandy map.
export const STORM = { rampMs: 5000, swingDeg: 60, leanDeg: 4, lampDim: 0.3, haze: '#D9A864', bank: '#B98A4E', dust: '#A87A44', streakMs: 900, catchDays: 2, banks: 6, bankTilesPerSecond: 1.2 };
export const YEAR_DAYS = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const SHEMU = SEASONS.map((s, m) => (s === 'shemu' ? m : -1)).filter((m) => m >= 0);

// The storms of a year (0-based), sorted by day.
export function stormsOf(seed, year) {
  const L = LIFE.storm;
  if (!(year >= L.fromYear - 1) || !SHEMU.length) return [];
  const n = hash2(year, 1, ((seed | 0) + S.storm) | 0) < 0.5 ? L.perYear[0] : L.perYear[1], out = [];
  const shemuDays = SHEMU.length * DAYS_PER_MONTH;
  for (let i = 0; i < n; i++) {
    const at = Math.floor(hash2(year, 10 + i, ((seed | 0) + S.storm) | 0) * shemuDays), m = SHEMU[Math.floor(at / DAYS_PER_MONTH)];
    const startDay = year * YEAR_DAYS + m * DAYS_PER_MONTH + (at % DAYS_PER_MONTH);
    const seconds = L.seconds[0] + Math.round(hash2(year, 20 + i, ((seed | 0) + S.storm) | 0) * (L.seconds[1] - L.seconds[0]));
    if (!out.some((o) => Math.abs(o.startDay - startDay) < 3)) out.push({ startDay, seconds });
  }
  return out.sort((a, b) => a.startDay - b.startDay);
}

// When each storm began on screen (real ms), per world: render-side, never saved.
const began = new WeakMap();
const OFF = { on: false, k: 0, el: 0, seconds: 0 };
export function stormAt(world, nowMs) {
  if (!world || world.lesson || typeof world.day !== 'number') return OFF;
  let m = began.get(world);
  if (!m) { m = new Map(); began.set(world, m); }
  const forced = m.get('forced');
  if (forced) return shape(nowMs - forced.at, forced.seconds);
  const year = Math.floor(world.day / YEAR_DAYS);
  for (const s of stormsOf(world.seed, year)) {
    if (world.day < s.startDay) continue;
    let at = m.get(s.startDay);
    if (at === undefined) {
      if (world.day - s.startDay >= STORM.catchDays) { m.set(s.startDay, -Infinity); continue; }   // missed (a load, a fast game): never late
      at = nowMs; m.set(s.startDay, at);
    }
    const r = shape(nowMs - at, s.seconds);
    if (r.on) return r;
  }
  return OFF;
}
function shape(el, seconds) {
  const dur = seconds * 1000;
  if (!(el >= 0 && el < dur)) return OFF;
  return { on: true, k: clamp01(Math.min(el, dur - el) / STORM.rampMs), el, seconds };
}
// A dev scene's or a test's storm, started at real time `at` (ms), or cleared with null.
export function forceStorm(world, at, seconds = LIFE.storm.seconds[1]) {
  let m = began.get(world);
  if (!m) { m = new Map(); began.set(world, m); }
  if (at === null) m.delete('forced'); else m.set('forced', { at, seconds });
}

export const stormSwing = (world, nowMs) => { const s = stormAt(world, nowMs); return s.on ? (STORM.swingDeg * Math.PI / 180) * s.k : 0; };
// The figures' lean (radians, for renderFrame's opts.lean), Full only, with the wind on screen (screen x runs with x - y).
export function stormLean(world, nowMs, motion) {
  if (motion !== 'full') return 0;
  const s = stormAt(world, nowMs);
  if (!s.on) return 0;
  const w = windAt(world, nowMs, stormSwing(world, nowMs)), side = w.x - w.y >= 0 ? 1 : -1;
  return side * (STORM.leanDeg * Math.PI / 180) * s.k;
}

// The haze over the whole canvas (device px), and under Full the dust streaks across the view's tiles.
export function drawStorm(g, world, range, nowMs, motion) {
  const s = stormAt(world, nowMs);
  if (!s.on || motion === 'still' || !range) return 0;
  const ctx = g.ctx;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = LIFE.storm.hazeAlpha * s.k;
  ctx.fillStyle = STORM.haze;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  if (motion !== 'full') return 1;
  const wind = windAt(world, nowMs, stormSwing(world, nowMs)), w = range.x1 - range.x0 + 1, h = range.y1 - range.y0 + 1, seed = ((world.seed | 0) + S.storm) | 0;
  // banks of blown dust: big soft clouds of the haze's sand rolling across the view with the wind, round and round
  const span = Math.max(w, h) + 20;
  for (let i = 0; i < STORM.banks; i++) {
    const h0 = hash2(i, 1, seed), h1 = hash2(i, 2, seed), s0 = (((nowMs / 1000) * STORM.bankTilesPerSecond + h0 * span) % span) - span / 2, side = (h1 - 0.5) * Math.min(w, h);
    const q = p((range.x0 + range.x1) / 2 + wind.x * s0 - wind.y * side, (range.y0 + range.y1) / 2 + wind.y * s0 + wind.x * side), r = (5 + 4 * h1) * 16;
    for (let j = 0; j < 3; j++) g.ell([q[0], q[1] - 12], r * (1 - j * 0.28), r * 0.42 * (1 - j * 0.28), STORM.bank, { alpha: 0.12 * s.k });
  }
  // the streaks: two sets half a window apart, each fading in and out over its window, so as many show at every moment and none pops
  const n = Math.round(LIFE.storm.dustCap * s.k), sets = [[], []], fades = [0, 0];
  for (let set = 0; set < 2; set++) {
    const at = nowMs + set * STORM.streakMs / 2, win = Math.floor(at / STORM.streakMs), t = (at % STORM.streakMs) / STORM.streakMs;
    fades[set] = Math.sin(Math.PI * t);
    for (let i = set; i < n; i += 2) {                                         // each streak a gust of three blown lines, in the middle of the range (the view: the range's corners lie off it)
      const x = range.x0 + (0.2 + 0.6 * hash2(i, win, seed)) * w, y = range.y0 + (0.2 + 0.6 * hash2(win, i, seed)) * h, len = 1.6 + hash2(i, i + win, seed) * 2;
      for (let j = 0; j < 3; j++) {
        const ox = -wind.y * (j - 1) * 0.22 + wind.x * j * 0.3, oy = wind.x * (j - 1) * 0.22 + wind.y * j * 0.3, l = len * (1 - j * 0.25);
        const a = p(x + ox + wind.x * t * 2, y + oy + wind.y * t * 2), b = p(x + ox + wind.x * (t * 2 + l), y + oy + wind.y * (t * 2 + l));
        sets[set].push(['M', [a[0], a[1] - 4 - j * 2]], ['L', [b[0], b[1] - 4 - j * 2]]);
      }
    }
  }
  for (let set = 0; set < 2; set++) if (sets[set].length && fades[set] > 0.01) g.stroke(sets[set], STORM.dust, 1.4, 0.55 * fades[set] * s.k);
  return 1 + n;
}

// The life source (createUI registers it): 'weather', not in the lesson.
export function weatherSource() {
  return { name: 'weather', lessonOk: false, late: (g, world, range, nowMs, motion) => { drawStorm(g, world, range, nowMs, motion); } };
}
