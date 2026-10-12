// Ambient life (spec 5.6): water glints, bank ripples, reed and tree sway, crop ripple, smoke, and rare birds, feluccas
// and ducks, on the real clock, out of step by tile hash, over the baked terrain for visible tiles only. Numbers in
// src/data/ambient.js. Stage 3 contract: createUI makes one per game and passes its draw to renderFrame as
// opts.ambient, which calls it once a frame in art px right after the terrain chunks.
//
// Two layers. The ground layer (glints and ripples on the river, swaying reed tips, a felucca and ducks) is drawn by
// draw(), under the sprites. What must show over buildings (crop bands on working fields, glints on garden and villa
// pools, chimney and kiln smoke, a bird crossing) is the late layer: draw() leaves it for drawAmbientLate(g), which
// drawFires (render/fire.js, opts.fire, right after the sprites) calls with the same frame's draw object, so it runs
// in the same frame or not at all. A late item at a field or pool is left out while something taller than a field
// stands just in front of it (it would show through that building).
//
// Calm (spec 5.4, 5.6): every motion is slow and smooth; a glint or puff fades in and out over seconds; nothing
// changes direction or brightness more than once a second. Rare life and the drop order keep the frame inside its
// budget: over AMBIENT.budgetMs (a running average), rare life goes first, then smoke, then sway; the water stays.
// A dropped kind returns only after RESTORE_AFTER_MS well under budget, so kinds never blink in and out.
//
// Stage 4 (spec 5.4, 5.6, ruling 217, Track E): createAmbient takes the Motion level (level(): 'full' | 'gentle' |
// 'still'; without it, enabled() true reads as Full). Full is all of it. Gentle keeps only fades in place: river and pool
// glints fade in and out where they are (no drift), smoke fades in place rising at most GENTLE_SMOKE_RISE_PX, the bank
// ripples hold still; no reed or tree sway, no crop bands, no rare life. Still (or enabled() false) draws nothing.
import { AMBIENT } from '../data/ambient.js';
import { hash2 } from '../sim/rng.js';
import { idx, inBounds } from '../sim/grid.js';
import { isWorking } from '../sim/labour.js';
import { p, U } from './iso.js';
import { riverSpans, riverBanks, smoothPath } from './terrainWater.js';
import { ART, slotFor } from './art/registry.js';
import { BIG } from './art/housing.js';
import { TERRAIN, WOOD, SHADOW } from './art/palette.js';

export const LEVEL_HOLD_MS = 2000;           // the budget can drop one more kind at most this often
export const RESTORE_AFTER_MS = 10000;       // and brings one back only after this long at under half the budget
export const GENTLE_SMOKE_RISE_PX = 4;       // Gentle: a puff rises at most this far (spec 5.4)
const FIELDS = ['farm_grain', 'farm_barley', 'farm_flax'];
// Tile offsets and art height of the potter's kiln, the brewhouse and (Stage 4) the brickworks' kiln top (src/render/art,
// Track B's brickworks: the kiln's mouth at (1.56, 0.46), 14 art px up).
export const SMOKE_FROM = { potter: [1.52, 0.52, 9], brewery: [0.66, 0.46, 10], brickworks: [1.56, 0.46, 14] };
// One appearance per kind per window, starting up to RARE_JITTER_MS in, so they come rareEveryMs apart (45-90 s).
const RARE_WINDOW_MS = (AMBIENT.rareEveryMs[0] + AMBIENT.rareEveryMs[1]) / 2;
const RARE_JITTER_MS = (AMBIENT.rareEveryMs[1] - AMBIENT.rareEveryMs[0]) / 2;
const RARE_MS = { bird: 9000, felucca: 40000, ducks: 24000 };
const SALT = { glint: 501, ripple: 502, reed: 503, tree: 504, crop: 505, pool: 506, smoke: 507, rare: 508, wind: 509 };

// The idle frame rate (spec 5.6): paused, with no input for idleAfterMs, frames are capped at fpsCap. createUI notes every
// pointer, key and wheel input and the game loop asks allow(now, paused) before drawing a frame (it still runs the sim).
// A frame is allowed once 1000 / fpsCap ms (less a few ms of slack, so a 60 Hz display draws every second frame) have
// passed since the last one drawn.
export function createFrameGate({ idleAfterMs = AMBIENT.idleAfterMs, fpsCap = AMBIENT.idleFpsCap } = {}) {
  let lastInput = -Infinity, lastDrawn = -Infinity;
  const gap = 1000 / fpsCap - 4;
  return {
    noteInput(now) { lastInput = now; },
    allow(now, paused) {
      if (!paused || now - lastInput < idleAfterMs || now - lastDrawn >= gap) { lastDrawn = now; return true; }
      return false;
    },
  };
}

const unit = (a, b, c) => hash2(a, b, c);               // 0..1, stateless
const between = ([lo, hi], h) => lo + (hi - lo) * h;
const wave = (now, period, phase) => Math.sin((2 * Math.PI * now) / period + phase * 2 * Math.PI);

// The wind (spec 5.6: fixed per seed), as a unit vector in tile space.
export function windOf(world) {
  const a = unit(world.seed | 0, 0, SALT.wind) * 2 * Math.PI;
  return { x: Math.cos(a), y: Math.sin(a) };
}

// A tree's lean in degrees at time now: +-AMBIENT.treeSwayDeg over 4-6 s, out of step by tile.
export function treeLean(world, x, y, now) {
  const period = between(AMBIENT.treeSwayPeriodMs, unit(x, y, (world.seed | 0) + SALT.tree));
  return AMBIENT.treeSwayDeg * wave(now, period, unit(y, x, (world.seed | 0) + SALT.tree));
}

// The river's rows in [y0, y1] as row -> { left, right, centre, width } in tile x (the drawn banks, wobble included).
export function riverRows(world, y0, y1) {
  const rows = new Map();
  const { left, right, centre } = riverBanks(world, y0, y1);
  for (let i = 0; i < left.length; i++) rows.set(left[i][1] - 0.5, { left: left[i][0], right: right[i][0], centre: centre[i][0], width: centre[i][2] });
  return rows;
}

// River tile (x, y)'s glint at time now (most tiles have one): { x, y } in tiles and its alpha, or null. Each glint lives
// 4-7 s, drifting downstream (+y) at AMBIENT.glintDriftTilesPerSecond and fading in and out, then starts again. With
// drift false (Gentle) it fades in and out where it starts.
export function glintAt(world, x, y, now, rows, drift = true) {
  const seed = world.seed | 0, h = unit(x, y, seed + SALT.glint);
  if (h > AMBIENT.glintShare) return null;
  const life = between(AMBIENT.glintFadeMs, unit(y, x, seed + SALT.glint));
  const t = ((now + h * life * 7) % life) / life;
  const gy = y + 0.2 + unit(x + 7, y, seed) * 0.6 + (drift ? AMBIENT.glintDriftTilesPerSecond * (t * life) / 1000 : 0);
  const row = rows.get(Math.floor(gy));
  if (!row) return null;
  const gx = Math.min(row.right - 0.35, Math.max(row.left + 0.35, x + 0.2 + unit(x, y + 7, seed) * 0.6));
  return { x: gx, y: gy, alpha: AMBIENT.glintAlpha * Math.sin(Math.PI * t) };
}

// Water glints: short pale strokes on the river's tiles in range. Strokes are batched into one path per step of
// GLINT_STEPS alpha steps (one stroke call each, not one per glint), so a glint's fade moves in small even steps.
export const GLINT_STEPS = 12;
function drawGlints(g, world, range, now, rows, drift = true) {
  const spans = riverSpans(world), buckets = [];
  for (let y = Math.max(0, range.y0); y <= Math.min(world.size - 1, range.y1); y++) {
    const s = spans[y];
    if (!s) continue;
    for (let x = Math.max(s[0], range.x0); x <= Math.min(s[1], range.x1); x++) {
      const gl = glintAt(world, x, y, now, rows, drift);
      if (!gl) continue;
      const k = Math.round((gl.alpha / AMBIENT.glintAlpha) * GLINT_STEPS);
      if (k <= 0) continue;
      const q = p(gl.x, gl.y);
      (buckets[k] || (buckets[k] = [])).push(['M', [q[0] - 2.2, q[1] + 0.4]], ['L', [q[0] + 2.2, q[1] - 0.4]]);
    }
  }
  for (let k = 1; k <= GLINT_STEPS; k++) if (buckets[k]) g.stroke(buckets[k], TERRAIN.foam, 0.7, (AMBIENT.glintAlpha * k) / GLINT_STEPS);
}

// Bank ripples: a faint line just inside each bank, shifting about a pixel back and forth over 5 s, out of step along it
// (still under Gentle: shift false).
function drawRipples(g, rows, now, shifts = true) {
  const shift = shifts ? AMBIENT.rippleShiftPx / 18 : 0;  // art px across the bank, in tiles
  for (const side of ['left', 'right']) {
    const pts = [];
    for (const [y, r] of rows) pts.push([r[side] + (side === 'left' ? 0.32 : -0.32) + shift * wave(now, AMBIENT.ripplePeriodMs, y * 0.13), y + 0.5]);
    if (pts.length > 1) g.stroke(smoothPath(pts), TERRAIN.ripple, 0.6, 0.45);
  }
}

// Reed tips: over each baked clump (terrainWater.js places them by the same hashes), two blades swaying +-3 degrees,
// out of step by clump; one stroke call per blade colour.
const REED_BLADES = [[-1.2, 6, '#4F8A2E'], [1.2, 7, '#6AA83A']];
export function reedTips(world, range, now, rows) {
  const seed = world.seed | 0, spans = riverSpans(world), out = REED_BLADES.map(() => []);
  for (const [y, r] of rows) {
    if (y < range.y0 || y > range.y1) continue;
    const s = spans[y], w = r.left - s[0] + 0.05;
    for (let j = 0; j < 2; j++) {
      const t = 0.15 + hash2(y, j, seed) * 0.7;
      const clumps = [];
      if (hash2(y, j + 4, seed) > 0.35) clumps.push(p(s[0] - 0.12 + w, y + t));
      if (hash2(y, j + 8, seed) > 0.35) clumps.push(p(s[1] + 1.12 + w, y + t));
      for (const q of clumps) {
        const k = unit(Math.round(q[0]), Math.round(q[1]), seed + SALT.reed);
        const a = ((AMBIENT.reedSwayDeg * wave(now, between(AMBIENT.reedSwayPeriodMs, k), k * 3.1)) * Math.PI) / 180;
        REED_BLADES.forEach(([dx, len], i) => {
          const base = [q[0] + dx, q[1] - 2.5];
          out[i].push(['M', base], ['L', [base[0] + Math.sin(a) * len, base[1] - Math.cos(a) * len]]);
        });
      }
    }
  }
  return out;
}
function drawReeds(g, world, range, now, rows) {
  reedTips(world, range, now, rows).forEach((segs, i) => { if (segs.length) g.stroke(segs, REED_BLADES[i][2], 0.7); });
}

const inRange = (b, r) => b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0;

// Whether anything taller than a field stands on the tiles just in front of b's footprint (it would cover a late item).
function screened(world, b) {
  const tall = (x, y) => {
    if (!inBounds(world.size, x, y)) return false;
    const o = world.occ[idx(world.size, x, y)];
    const def = o ? ART[slotFor(world.buildings[o], world)] : null;
    return Boolean(def && def.height > 12);
  };
  for (let j = 0; j <= b.d; j++) if (tall(b.x + b.w, b.y + j)) return true;
  for (let i = 0; i < b.w; i++) if (tall(b.x + i, b.y + b.d)) return true;
  return false;
}

// Crop ripple: a lighter band crossing a working field in the wind's direction every AMBIENT.cropBandEveryMs.
function drawCrops(g, world, b, now, wind) {
  const P = AMBIENT.cropBandEveryMs, t = ((now + unit(b.id, 0, SALT.crop) * P) % P) / P;
  const X = b.x, Y = b.y, z = 2.2, c = 1.35;
  g.save();
  g.clip([U(p(X, Y), z), U(p(X + 2, Y), z), U(p(X + 2, Y + c), z), U(p(X + c, Y + c), z), U(p(X + c, Y + 2), z), U(p(X, Y + 2), z)]);
  const s = -0.6 + t * 3.2;                                  // the band's distance along the wind from the field's upwind corner
  const ox = X + 1 - wind.x * 1.6 + wind.x * s, oy = Y + 1 - wind.y * 1.6 + wind.y * s;
  const nx = -wind.y * 2, ny = wind.x * 2, hw = 0.16;
  g.poly([U(p(ox - nx - wind.x * hw, oy - ny - wind.y * hw), z), U(p(ox + nx - wind.x * hw, oy + ny - wind.y * hw), z),
    U(p(ox + nx + wind.x * hw, oy + ny + wind.y * hw), z), U(p(ox - nx + wind.x * hw, oy - ny + wind.y * hw), z)], '#FBF3C6', { alpha: 0.22 });
  g.restore();
}

// A glint on a pool (gardens; Villas and Estates, whose yard has one): it drifts a little and fades in and out (in the
// pool's middle under Gentle: drift false).
function drawPoolGlint(g, b, rect, now, drift = true) {
  const [u, v, w, d] = rect, life = between(AMBIENT.glintFadeMs, unit(b.id, 1, SALT.pool));
  const t = ((now + unit(b.id, 2, SALT.pool) * life) % life) / life;
  const q = p(b.x + u + w * (drift ? 0.3 + 0.4 * t : 0.5), b.y + v + d * 0.5);
  g.line([q[0] - 1.4, q[1] + 0.3], [q[0] + 1.4, q[1] - 0.3], TERRAIN.foam, 0.6, 0.85 * Math.sin(Math.PI * t));
}

// Smoke: puffs from a working kiln or brewhouse, or the roof of a lived-in Townhouse and up, one every 2-3 s, each
// rising about a tile and fading over AMBIENT.smokeLifePeriods of those periods, leaning with the wind, so a puff is always
// in the air. Under Gentle (inPlace) a puff fades where it starts, rising GENTLE_SMOKE_RISE_PX at most, with no lean.
function drawSmoke(g, b, base, now, wind, inPlace = false) {
  const P = between(AMBIENT.smokeEveryMs, unit(b.id, 3, SALT.smoke)), off = unit(b.id, 4, SALT.smoke) * P;
  const rise = inPlace ? GENTLE_SMOKE_RISE_PX : 16 * AMBIENT.smokeRiseTiles;
  if (inPlace) wind = { x: 0, y: 0 };
  const n = AMBIENT.smokeLifePeriods, [r0, grow] = AMBIENT.smokeRadius;
  for (let k = 0; k < n; k++) {
    const a = ((now + off) / (n * P) + k / n) % 1;          // this puff's age, 0 to 1 over its life of nP: a new one every P
    const alpha = AMBIENT.smokeAlpha * Math.min(1, a / 0.15) * (1 - a);
    const r = r0 + a * grow;
    const drift = p(wind.x * a * 0.3, wind.y * a * 0.3);
    g.radial([base[0] + drift[0], base[1] - 2 - rise * a + drift[1]], r, r * 0.8, '#F4F0F2', alpha);
  }
}

// A kiln or brewhouse smokes while it works and nothing holds it (b.blocked: no input, no storage, or a brickworks no
// monument site needs, 'idle'); a chimney while its home is lived in.
export function smokeBase(world, b) {
  const at = SMOKE_FROM[b.type];
  if (at) return isWorking(world, b) && !b.blocked ? U(p(b.x + at[0], b.y + at[1]), at[2]) : null;
  if (b.type === 'house' && b.tier >= 5 && b.residents > 0) {
    const def = ART[slotFor(b, world)];
    return U(p(b.x + b.w * 0.3, b.y + b.d * 0.3), Math.round(def.height * 0.8));
  }
  return null;
}

// The art box of the visible range, for rare life that crosses the view.
function artBox(range) {
  const pts = [p(range.x0, range.y0), p(range.x1 + 1, range.y0), p(range.x1 + 1, range.y1 + 1), p(range.x0, range.y1 + 1)];
  return { l: Math.min(...pts.map((q) => q[0])), r: Math.max(...pts.map((q) => q[0])), t: Math.min(...pts.map((q) => q[1])), b: Math.max(...pts.map((q) => q[1])) };
}

// Rare life on a fixed schedule from the real clock and the seed: kind k's n-th appearance starts 0-RARE_JITTER_MS into
// its n-th RARE_WINDOW_MS window and lasts RARE_MS[k], so at most one of each is on screen and they come
// AMBIENT.rareEveryMs apart (45-90 s). Returns the appearance under way as { t (0..1 through it), h (its own hash) }, or null.
export function rareAt(world, kind, now) {
  const k = AMBIENT.rareKinds.indexOf(kind) + 1, n = Math.floor(now / RARE_WINDOW_MS);
  const start = n * RARE_WINDOW_MS + unit(n, k, (world.seed | 0) + SALT.rare) * RARE_JITTER_MS;
  const t = (now - start) / RARE_MS[kind];
  return t >= 0 && t < 1 ? { t, h: unit(n, k + 10, (world.seed | 0) + SALT.rare) } : null;
}

function drawBird(g, box, a) {
  const fromLeft = a.h < 0.5, x = fromLeft ? box.l + (box.r - box.l) * a.t : box.r - (box.r - box.l) * a.t;
  const y = box.t + (box.b - box.t) * (0.2 + 0.4 * a.h) - Math.sin(Math.PI * a.t) * 6;
  const dir = fromLeft ? 1 : -1;
  g.ell([x, y + 14], 2.4, 0.8, SHADOW, { alpha: 0.12 });
  g.stroke([['M', [x - 3.2, y - 1.2]], ['Q', [x - 1.4, y - 2], [x, y]], ['Q', [x + 1.4, y - 2], [x + 3.2, y - 1.2]]], '#3A3040', 0.6);
  g.circ([x + dir * 0.4, y - 0.2], 0.5, '#3A3040');
}

function drawFelucca(g, rows, range, a) {
  const ys = [...rows.keys()].filter((y) => y >= range.y0 && y <= range.y1 - 8);
  if (!ys.length) return;
  const y = ys[Math.floor(a.h * ys.length)] + 8 * a.t;     // downstream at about AMBIENT.glintDriftTilesPerSecond
  const row = rows.get(Math.floor(y));
  if (!row) return;
  const q = p(row.centre, y);
  g.ell([q[0] + 1, q[1] + 1.2], 6, 1.6, SHADOW, { alpha: 0.18 });
  g.path([['M', [q[0] - 5.5, q[1] - 1]], ['Q', [q[0], q[1] + 2.6], [q[0] + 5.5, q[1] - 1.6]], ['L', [q[0] + 3.5, q[1] - 0.2]], ['L', [q[0] - 4, q[1] + 0.4]], ['Z']], WOOD, { outline: true });
  g.line([q[0], q[1] - 0.2], [q[0] + 0.4, q[1] - 11], '#5A4030', 0.5);
  g.path([['M', [q[0] + 0.4, q[1] - 11.5]], ['Q', [q[0] + 4.6, q[1] - 6], [q[0] + 4.4, q[1] - 1.6]], ['L', [q[0] - 2.6, q[1] - 1.8]], ['Z']], '#F7F2E8', { outline: true });
}

function drawDucks(g, rows, range, a) {
  const ys = [...rows.keys()].filter((y) => y >= range.y0 && y <= range.y1);
  if (!ys.length) return;
  const y = ys[Math.floor(a.h * ys.length)], row = rows.get(y), left = a.h < 0.5;
  for (let i = 0; i < 3; i++) {
    const x = left ? row.left + 0.3 + i * 0.12 : row.right - 0.3 - i * 0.12;
    const q = p(x, y + 0.3 + 0.4 * a.t + i * 0.15);
    g.ell([q[0], q[1]], 1.6, 0.8, '#8A6A4A', { outline: true });
    g.circ([q[0] + (left ? -1.2 : 1.2), q[1] - 1.2], 0.7, '#2E5E3A');
    g.ell([q[0], q[1] + 0.9], 2.2, 0.5, TERRAIN.ripple, { alpha: 0.4 });
  }
}

const lateByG = new WeakMap();               // the frame's draw object -> its late layer

// What the processions (src/render/walkers.js, Track E) need of the ambient layer's last frame for a world: the Motion
// level it drew at, what the budget has dropped (processions drop with rare life, spec 5.7) and its real clock (the
// streamers' flutter). Kept per world, outside it; a world no ambient layer has drawn reads as Still, nothing dropped.
const stateByWorld = new WeakMap();
export const ambientState = (world) => stateByWorld.get(world) || { level: 'still', dropped: [], now: 0 };

// The late layer of the frame g belongs to (crop bands, pool glints, smoke, birds), drawn once; render/fire.js calls it
// right after the sprites. Does nothing for a frame without one.
export function drawAmbientLate(g) {
  if (!g) return;
  const fn = lateByG.get(g);
  if (!fn) return;
  lateByG.delete(g);
  fn();
}

// enabled() says whether to draw at all, and level() the Motion level (createUI decides: Full and Gentle draw, Still not).
// clock() is the real clock in ms, for the frame budget only.
export function createAmbient({ enabled = () => true, level = () => 'full', clock = () => performance.now() } = {}) {
  const full = () => level() === 'full';
  let dropLevel = 0, avg = null, lastChange = -Infinity, calmSince = null;
  let pending = null;                        // this frame's ground cost, until its late layer adds its own
  const stats = { ms: 0, dropped: [] };

  function account(ms, now) {
    if (lastChange === -Infinity) lastChange = now;   // a cold first frame (caches warming) never drops a kind at once
    stats.ms = ms;
    avg = avg === null ? ms : avg * 0.8 + ms * 0.2;
    const order = AMBIENT.dropOrder;
    if (avg > AMBIENT.budgetMs) {
      calmSince = null;
      if (dropLevel < order.length && now - lastChange >= LEVEL_HOLD_MS) { dropLevel++; lastChange = now; avg = AMBIENT.budgetMs * 0.75; }
    } else if (avg < AMBIENT.budgetMs / 2 && dropLevel > 0) {
      if (calmSince === null) calmSince = now;
      if (now - calmSince >= RESTORE_AFTER_MS && now - lastChange >= LEVEL_HOLD_MS) { dropLevel--; lastChange = now; calmSince = now; }
    } else calmSince = null;
    stats.dropped = order.slice(0, dropLevel);
  }

  function draw(g, world, range, now) {
    if (pending) { account(pending.ms, pending.now); pending = null; }   // the last frame had no late layer
    if (g) lateByG.delete(g);                // a late layer left from a frame that never drew it is stale: drop it
    if (world) stateByWorld.set(world, { level: enabled() ? level() : 'still', dropped: stats.dropped.slice(), now });
    if (!enabled() || !g || !range) return;
    const started = clock();
    const off = new Set(AMBIENT.dropOrder.slice(0, dropLevel));
    const moving = full();                   // Gentle: glints and smoke in place; no ripple shift, sway, crops or rare life
    if (!moving) for (const k of ['sway', 'rare']) off.add(k);
    const rows = riverRows(world, range.y0 - 2, range.y1 + 2);
    const wind = windOf(world);
    if (rows.size) {
      drawGlints(g, world, range, now, rows, moving);
      drawRipples(g, rows, now, moving);
      if (!off.has('sway')) drawReeds(g, world, range, now, rows);
      if (!off.has('rare')) {
        const boat = rareAt(world, 'felucca', now), ducks = rareAt(world, 'ducks', now);
        if (boat) drawFelucca(g, rows, range, boat);
        if (ducks) drawDucks(g, rows, range, ducks);
      }
    }
    pending = { ms: clock() - started, now };
    lateByG.set(g, () => {
      const lateStart = clock();
      for (const id in world.buildings) {
        const b = world.buildings[id];
        if (!inRange(b, range)) continue;
        if (FIELDS.includes(b.type) && !off.has('sway') && isWorking(world, b) && !screened(world, b)) drawCrops(g, world, b, now, wind);
        else if (b.type === 'garden' && !screened(world, b)) drawPoolGlint(g, b, [0.2, 0.56, 0.36, 0.28], now, moving);
        else if (b.type === 'house' && BIG[b.tier] && BIG[b.tier].pool && !screened(world, b)) drawPoolGlint(g, b, [0.32, 1.24, 0.6, 0.3], now, moving);
        if (!off.has('smoke')) {
          const base = smokeBase(world, b);
          if (base) drawSmoke(g, b, base, now, wind, !moving);
        }
      }
      if (!off.has('rare')) {
        const bird = rareAt(world, 'bird', now);
        if (bird) drawBird(g, artBox(range), bird);
      }
      const ms = (pending ? pending.ms : 0) + clock() - lateStart;
      pending = null;
      account(ms, now);
    });
  }

  // The art slot a tree shows at time now: its lean slot (palm.l-4 ... palm.l4, art/nature.js), or the still slot while ambient
  // motion is off or sway is dropped. For the renderer's depth pass (see the Stage 3 plan's contract note: a seam the
  // renderer does not have yet).
  function treeSlot(world, x, y, slot, now) {
    if (!enabled() || !full() || dropLevel >= AMBIENT.dropOrder.indexOf('sway') + 1) return slot;
    const k = Math.round((treeLean(world, x, y, now) / AMBIENT.treeSwayDeg) * AMBIENT.treeLeanSteps);
    return k ? `${slot}.l${k}` : slot;
  }

  return { draw, treeSlot, stats };
}
