// Version 7.0, Track S (rulings 930-959): day and night on a real-time loop of about six minutes (LIGHT in src/data/seasons.js), in the
// render layer only: never in the sim or the save (ruling 852); it holds while the game is paused; Still and the Settings switch "Day and
// night" off keep daylight. Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left full daylight; Track S owns
// this file (src/render/v70.js calls drawLight from createUI's frame).
//   lightAt(nowMs)   -> { phase, dark, warm, lamps }: phase one of LIGHT_PHASES, dark the night tint's strength (0 daylight .. 1 the deepest,
//                       which the readability test holds above the bar), warm the gold of dusk and dawn (0 .. 1), lamps how lit the lamps are
//                       (0 .. 1). nowMs is the loop's own clock (lightClock: the real frame clock, held while paused), not the sim's.
//   drawLight(g, world, range, frame, now, motion, settings)   after the sprites and before fire, units, effects and the overlays (so the
//                       marks a player reads are never dimmed): the tint (one multiply over the canvas) and the lamps. frame is { ctx, W, H,
//                       ox, oy, dpr } (the canvas in device px, the art origin); the transform is the art origin's, as for the other layers.
import { LIGHT, LAMP, NIGHT, SEASON_SALT } from '../data/seasons.js';
import { hash2 } from '../sim/rng.js';
import { idx } from '../sim/grid.js';
import { p } from './iso.js';
import { buildingsInRange } from './chunkIndex.js';

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

// The light at the loop's clock nowMs (ms): the loop begins at the start of the day, then dusk, the short night and dawn.
export function lightAt(nowMs) {
  const L = LIGHT, t = (((nowMs % L.cycleMs) + L.cycleMs) % L.cycleMs) / L.cycleMs;
  const duskAt = L.day, nightAt = duskAt + L.dusk, dawnAt = nightAt + L.night;
  let phase, dark, warm = 0;
  if (t < duskAt) { phase = 'day'; dark = 0; }
  else if (t < nightAt) { const u = (t - duskAt) / L.dusk; phase = 'dusk'; dark = smooth(u); warm = Math.sin(Math.PI * u); }
  else if (t < dawnAt) { phase = 'night'; dark = 1; }
  else { const u = (t - dawnAt) / L.dawn; phase = 'dawn'; dark = 1 - smooth(u); warm = Math.sin(Math.PI * u); }
  return { phase, dark, warm, lamps: clamp01((dark - L.lampsFrom) / (L.lampsFull - L.lampsFrom)) };
}

// Whether the light loop runs: not under Still (no new movement, daylight), and not once Settings has Day and night off.
export const lightOn = (motion, settings) => motion !== 'still' && !(settings && settings.dayNight === false);

// The loop's clock (ruling 939): real frame time added while the game runs, a quarter of a second at most a frame, held while it is paused. One per world,
// render-side, never saved. A frame with the light off only notes the time, so turning it on does not jump the loop.
const clocks = new WeakMap();
export function lightClock(world, now, running = true, advance = true) {
  let c = clocks.get(world);
  if (!c) { c = { t: 0, last: null }; clocks.set(world, c); }
  if (advance && running && c.last !== null) c.t += Math.min(LIGHT.maxStepMs, Math.max(0, now - c.last));
  c.last = now;
  return c.t;
}
// Sets the loop's clock (a dev scene, a test): ms into the cycle.
export function setLightClock(world, ms, now = 0) { clocks.set(world, { t: ms, last: now }); }

// The light the last drawn frame showed (the interface reads it for the first night's tip); daylight until a frame says otherwise.
let shown = { phase: 'day', dark: 0, warm: 0, lamps: 0 };
export const lightShown = () => shown;

// The multiplier the tint fills with: white at daylight, towards NIGHT.rgb as it darkens, with the dusk and dawn gold laid in first.
export function tintFor(l) {
  const out = [255, 255, 255];
  for (let i = 0; i < 3; i++) {
    const gold = lerp(255, NIGHT.warmRgb[i], clamp01(l.warm * NIGHT.warmMax));
    out[i] = Math.round(gold * lerp(255, NIGHT.rgb[i], clamp01(l.dark)) / 255);
  }
  return out;
}
// A map colour as the night tint leaves it (the multiply the canvas does): the same function the readability test measures with.
export function tinted(rgb, l) {
  const m = tintFor(l);
  return rgb.map((v, i) => Math.round((v * m[i]) / 255));
}

// A soft warm pool as a small canvas, one per radius (device px); drawn with 'lighter'. Cached on the page.
const pools = new Map();
const POOL_RADII = [3, 4, 6, 8, 11, 16, 22, 32, 44, 64, 96];
function poolSprite(radius) {
  const r = POOL_RADII.find((v) => v >= radius) || POOL_RADII[POOL_RADII.length - 1];
  let c = pools.get(r);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = r * 2;
    const x = c.getContext('2d'), [R, G, B] = LAMP.rgb;
    const gr = x.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, `rgba(255,236,190,0.95)`);
    gr.addColorStop(0.16, `rgba(${R},${G},${B},0.62)`);
    gr.addColorStop(0.55, `rgba(${R},${G - 30},${B - 40},0.2)`);
    gr.addColorStop(1, `rgba(${R},${G - 40},${B - 60},0)`);
    x.fillStyle = gr;
    x.fillRect(0, 0, r * 2, r * 2);
    pools.set(r, c);
  }
  return { canvas: c, r };
}

// The street lamps: road tiles where x + y is a multiple of LAMP.streetEvery, found once per world and road version.
const streets = new WeakMap();
export function streetLamps(world) {
  const had = streets.get(world);
  if (had && had.version === world.roadVersion && had.size === world.size) return had.list;
  const list = [];
  for (let y = 0; y < world.size; y++) {
    for (let x = (LAMP.streetEvery - (y % LAMP.streetEvery)) % LAMP.streetEvery; x < world.size; x += LAMP.streetEvery) if (world.road[idx(world.size, x, y)]) list.push(x, y);
  }
  streets.set(world, { version: world.roadVersion, size: world.size, list });
  return list;
}

// The lit homes in the range: [x, y, ...] in art px at the door, a share of them (not every window is lit). `stride` keeps only the homes whose id is a
// multiple of it (zoomed far out, a district's lights are a scatter of dots; the same homes stay lit as the view moves).
export function litHomes(world, range, g, stride = 1) {
  const out = [], seed = (world.seed + SEASON_SALT.lamps) | 0;
  for (const b of buildingsInRange(world, range)) {
    if (b.type !== 'house' || !(b.tier >= 1) || (stride > 1 && b.id % stride !== 0) || hash2(b.id, 3, seed) > 0.9) continue;
    const q = p(b.x + b.w / 2, b.y + b.d / 2);
    if (g.cull && !g.cull.sees(b.x + b.w / 2, b.y + b.d / 2, [-24, -40, 24, 14])) continue;
    out.push(q[0], q[1] - LAMP.homeLift);
  }
  return out;
}

export function litStreets(world, range, g) {
  const out = [], list = streetLamps(world);
  for (let i = 0; i < list.length; i += 2) {
    const x = list[i], y = list[i + 1];
    if (x < range.x0 || x > range.x1 || y < range.y0 || y > range.y1) continue;
    if (g.cull && !g.cull.sees(x + 0.5, y + 0.5, [-14, -30, 14, 10])) continue;
    const q = p(x + 0.5, y + 0.5);
    out.push(q[0], q[1] - 7);
  }
  return out;
}

function drawLamps(g, world, range, frame, lamps) {
  const ctx = frame.ctx, scale = g.scale, far = g.cssScale < LAMP.farCss;
  // (ruling 940) Far out every home would be a dot a pixel or two across, thousands of them (a Huge city at its zoom floor): one home in a few shows, more of them the nearer the view.
  const stride = !far ? 1 : g.cssScale < LAMP.farCss * 0.5 ? LAMP.farStride[0] : g.cssScale < LAMP.farCss * 0.75 ? LAMP.farStride[1] : LAMP.farStride[2];
  const homes = litHomes(world, range, g, stride), streetsAt = litStreets(world, range, g);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Every lamp as one warm dot, all in one fill: what far out shows, and the lamps past the most pools a frame draws.
  const dots = (lists) => {
    const [R, G, B] = LAMP.rgb, half = Math.max(1, frame.dpr * 0.9);
    ctx.globalAlpha = 0.85 * lamps;
    ctx.fillStyle = `rgb(${R},${G},${B})`;
    ctx.beginPath();
    for (const list of lists) for (let i = 0; i < list.length; i += 2) ctx.rect(list[i] * scale - half, list[i + 1] * scale - half, half * 2, half * 2);
    ctx.fill();
  };
  if (far) dots([homes, streetsAt]);
  else {
    let n = 0;
    const rest = [];
    ctx.globalAlpha = lamps;
    const pools = (list, radiusArt) => {
      const s = poolSprite(radiusArt * scale);
      const r = radiusArt * scale;                          // the sprite's own radius scaled to the pool's
      for (let i = 0; i < list.length; i += 2) {
        if (n < LAMP.most) { ctx.drawImage(s.canvas, list[i] * scale - r, list[i + 1] * scale - r, r * 2, r * 2); n++; } else rest.push(list[i], list[i + 1]);
      }
    };
    pools(homes, LAMP.home);
    pools(streetsAt, LAMP.street);
    if (rest.length) dots([rest]);
  }
  ctx.restore();
  if (!far && streetsAt.length) {
    // The lamp posts: a thin dark post under each lit head, so a lamp reads as one.
    const segs = [];
    for (let i = 0; i < streetsAt.length; i += 2) segs.push(['M', [streetsAt[i], streetsAt[i + 1] + 1]], ['L', [streetsAt[i], streetsAt[i + 1] + 7]]);
    g.stroke(segs, '#2E2418', 0.7, 0.8 * lamps);
  }
}

export function drawLight(g, world, range, frame, now, motion, settings) {
  const on = lightOn(motion, settings);
  const t = lightClock(world, now, world.speed > 0, on);
  const l = on ? lightAt(t) : { phase: 'day', dark: 0, warm: 0, lamps: 0 };
  shown = l;
  if (!on || (l.dark < 0.004 && l.warm < 0.004)) return;
  const ctx = frame.ctx;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  const m = tintFor(l);
  ctx.fillStyle = `rgb(${m[0]},${m[1]},${m[2]})`;
  ctx.fillRect(0, 0, frame.W, frame.H);
  ctx.restore();                                           // back to the art origin's transform
  if (l.lamps > 0.01) drawLamps(g, world, range, frame, l.lamps);
}
