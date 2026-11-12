// Version 9.0, Track V: the effects drawn above the sprites (effectsV90, src/render/v90/effects.js), each from what the sim already holds or the
// frame's own walkers, in the palette's colours and primitives.js's shapes (no blur, no glow). Every one is calm: a puff grows and fades over most
// of a second, nothing changes brightness more than about once a second, nothing shakes.
//   V6 dust      behind a band's raiders on the move and behind carts on sand (the sled gangs' dust is render/monuments.js)
//   V7 fire      a staffed firehouse that reaches a fire throws two arcs of water on it; steam rises a while where one goes out
//   V9 festival  a festival's working temples hang lamps that light at dusk; petals drift down round its procession; a beaten raid's
//                Victory (8.4's +4 mood for 90 days) hangs pennants on the palace
//   V10 weather  two or three cloud shadows drifting over the land with the wind (each under 25% dark), and in Shemu gusts of sand along the
//                desert's edge (at most WEATHER.gusts streaks)
import { p, U } from '../iso.js';
import { GOLD, TEAL, RED, WOOD, SHADOW } from '../art/palette.js';
import { T } from '../../sim/terrain.js';
import { idx, inBounds } from '../../sim/grid.js';
import { hash2 } from '../../sim/rng.js';
import { allBuildings } from '../../sim/world.js';
import { isWorking } from '../../sim/labour.js';
import { fireCoverage } from '../../sim/fire.js';
import { FIRE } from '../../data/fire.js';
import { raidMood } from '../../sim/raids.js';
import { seasonAt } from '../../sim/seasons.js';
import { festivalOn } from '../walkers.js';
import { lightShown } from '../light.js';
import { roofPoint } from '../fire.js';
import { windAt } from '../ambient.js';
import { UNIT_ID_BASE } from '../units.js';
import { LIFE } from '../../data/ambient.js';
import { LIGHT } from '../../data/seasons.js';
import { lightPeek } from '../light.js';
import { stormAt, stormSwing } from '../v100/weather.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const inView = (x, y, r) => !r || (x >= r.x0 - 1 && x <= r.x1 + 2 && y >= r.y0 - 1 && y <= r.y1 + 2);

// ── V6: dust on the move ──
export const DUST = { cap: 30, periodMs: 700, colour: '#D8C4A0', alpha: 0.34, behind: 4, fadeIn: 0.2 };
const RAIDER_KINDS = /^(raider|chief)/;
// The walkers that kick up dust: raiders that are walking (not standing, not in a fight's pose) and carts on desert sand.
export function dustSources(world, walkers) {
  const out = [];
  for (const w of walkers || []) {
    if (out.length >= DUST.cap) break;
    const unit = w.id >= UNIT_ID_BASE && w.id < UNIT_ID_BASE + 100000;
    if (unit && RAIDER_KINDS.test(w.kind) && !w.stand && !/_[ab]_[rl]$/.test(w.kind)) out.push(w);
    else if (w.cart) {
      const x = Math.floor(w.x), y = Math.floor(w.y);
      if (inBounds(world.size, x, y) && world.terrain[idx(world.size, x, y)] === T.DESERT) out.push(w);
    }
  }
  return out;
}
export function drawDust(g, world, walkers, range, now) {
  const list = dustSources(world, walkers);
  for (const w of list) {
    if (!inView(w.x, w.y, range)) continue;
    const q = p(w.x, w.y), back = w.dir === 2 || w.dir === 3 ? 1 : -1, big = w.cart ? 1 : 1.3;
    for (let i = 0; i < 2; i++) {
      const ph = ((now / DUST.periodMs + (w.id % 97) * 0.37 + i * 0.5) % 1 + 1) % 1;
      g.circ([q[0] + back * (DUST.behind + ph * 6) * big, q[1] - 1 - ph * 2.5], (1.4 + ph * 2.2) * big, DUST.colour, { alpha: DUST.alpha * Math.min(1, ph / DUST.fadeIn) * (1 - ph) });   // in over the first part of its life, out over the rest: none pops on or off
    }
  }
  return list.length;
}

// ── V7: a fire fought ──
export const FOUGHT = { cap: 6, reach: 12, arcLift: 14, dropMs: 900, steamMs: 2600, water: '#7FC6D8', foam: '#E6F4F7', steam: '#F2F0EE' };
const burnt = new WeakMap();                 // world -> { ids: Set of ids burning at the last frame, steam: [{ x, y, at }] }
// The working firehouse nearest a burning building, within FOUGHT.reach tiles (by its centre), or null.
function firehouseFor(houses, b) {
  let best = null, bd = FOUGHT.reach;
  for (const f of houses) {
    const d = Math.abs(f.x + f.w / 2 - (b.x + b.w / 2)) + Math.abs(f.y + f.d / 2 - (b.y + b.d / 2));
    if (d <= bd && f.id !== b.id) { bd = d; best = f; }
  }
  return best;
}
export function firesFought(world, range) {
  const burning = [], houses = [];
  for (const b of allBuildings(world)) {
    if (b.fire) burning.push(b);
    else if (b.type === 'firehouse') houses.push(b);
  }
  if (!burning.length) return { burning, out: [] };
  const working = houses.filter((f) => isWorking(world, f));
  const cover = fireCoverage(world);                                         // once a frame: the sim's own cover, as staffedCover reads it
  const out = [];
  for (const b of burning) {
    if (out.length >= FOUGHT.cap) break;
    if (!inView(b.x + b.w / 2, b.y + b.d / 2, range) || !((cover.get(b.id) || 0) >= FIRE.staffedAt)) continue;
    const f = firehouseFor(working, b);
    if (f) out.push({ b, f });
  }
  return { burning, out };
}
export function drawFireFought(g, world, range, now) {
  let s = burnt.get(world);
  if (!s) { s = { ids: new Set(), steam: [] }; burnt.set(world, s); }
  const { burning, out } = firesFought(world, range);
  const ids = new Set(burning.map((b) => b.id));
  for (const id of s.ids) {
    const b = world.buildings[id];
    if (!ids.has(id) && b && b.type !== 'rubble') { const q = roofPoint(world, b); s.steam.push({ q, at: now }); }   // put out: steam where it burned
  }
  s.ids = ids;
  s.steam = s.steam.filter((k) => now - k.at < FOUGHT.steamMs && now >= k.at).slice(-FOUGHT.cap);
  for (const { b, f } of out) {
    const from = U(p(f.x + f.w * 0.5, f.y + f.d * 0.9), 8), to = roofPoint(world, b);
    for (let i = 0; i < 2; i++) {
      const dx = (i ? 2.5 : -2.5), a = [from[0] + dx, from[1]], c = [to[0] + dx * 0.6, to[1] + 1];
      const lift = Math.min(FOUGHT.arcLift + Math.hypot(c[0] - a[0], c[1] - a[1]) * 0.15, 40);
      const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - lift];
      g.stroke([['M', a], ['Q', mid, c]], FOUGHT.water, 1.1, 0.55);
      const ph = ((now / FOUGHT.dropMs + i * 0.5) % 1 + 1) % 1;            // a drop riding the arc
      const k = ph, x = (1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * mid[0] + k * k * c[0], y = (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * mid[1] + k * k * c[1];
      g.circ([x, y], 1.1, FOUGHT.foam, { alpha: 0.9 });
    }
  }
  for (const k of s.steam) {
    const t = (now - k.at) / FOUGHT.steamMs;
    for (let i = 0; i < 3; i++) g.circ([k.q[0] + (i - 1) * 3 * (1 + t), k.q[1] - 3 - t * 14 - i * 2], 2.4 + t * 3, FOUGHT.steam, { alpha: 0.55 * (1 - t) });
  }
  return out.length + s.steam.length;
}

// ── V9: the festival and the Victory ──
export const FESTIVE = { petalsPer: 2, petalCap: 24, petalMs: 2600, lampsFrom: 0.05, colours: ['#F2A0B4', '#F6D46A', '#FAF6EC'] };
const MARCHERS = new Set(['standard', 'shrine', 'musician', 'dancer', 'priest']);
export function festiveParts(world, walkers, range) {
  const fest = festivalOn(world), victory = Boolean(raidMood(world).victory);
  const temples = [], palaces = [], marchers = [];
  if (fest || victory) {
    for (const b of allBuildings(world)) {
      if (!inView(b.x + b.w / 2, b.y + b.d / 2, range)) continue;
      if (fest && b.type === 'temple' && isWorking(world, b)) temples.push(b);
      else if (victory && b.type === 'palace') palaces.push(b);
    }
  }
  if (fest) for (const w of walkers || []) if (marchers.length < FESTIVE.petalCap / FESTIVE.petalsPer && MARCHERS.has(w.kind) && w.id >= 200000 && w.id < 900000) marchers.push(w);
  return { temples, palaces, marchers };
}
export function drawFestive(g, world, walkers, range, now) {
  const { temples, palaces, marchers } = festiveParts(world, walkers, range);
  const lamps = clamp01(lightShown().lamps);
  if (lamps > FESTIVE.lampsFrom) {
    for (const b of temples) {
      for (const [u, v] of [[0, 1], [1, 1], [1, 0]]) {                       // a lamp on a stand at each front corner
        const q = p(b.x + u * b.w + (u ? -0.1 : 0.1), b.y + v * b.d + (v ? -0.1 : 0.1));
        g.line(q, U(q, 7), '#3A2C1E', 0.7, 0.9);
        if (lamps > 0.3) g.ell(U(q, 8.3), 4.6, 3.2, GOLD, { alpha: 0.3 * 1.3 * (lamps - 0.3) });   // Version 10.0, Track L (L.6): a festival night's lamps burn a third brighter, a warm halo round each
        g.ell(U(q, 8), 1.6 * 1.15, 1 * 1.15, GOLD, { alpha: Math.min(1, (0.4 + 0.6 * lamps) * 1.3) });
        g.circ(U(q, 8.6), 0.8, '#FFF4C8', { alpha: lamps });
      }
    }
  }
  for (const w of marchers) {
    const q = p(w.x, w.y);
    for (let i = 0; i < FESTIVE.petalsPer; i++) {
      const h = hash2(w.id, i, 9031), ph = ((now / FESTIVE.petalMs + h) % 1 + 1) % 1;
      const x = q[0] + (h - 0.5) * 14 + Math.sin(ph * Math.PI * 2 + h * 6) * 2, y = q[1] - 22 + ph * 20;
      g.ell([x, y], 1, 0.6, FESTIVE.colours[(w.id + i) % 3], { alpha: 0.9 * Math.sin(Math.PI * ph) });
    }
  }
  for (const b of palaces) {
    const wave = Math.sin(now / 1100);                                       // a slow ripple, once a second or so
    for (const [u, v, col] of [[0, 1, TEAL], [1, 0, GOLD], [1, 1, RED]]) {
      const q = p(b.x + u * b.w + (u ? -0.15 : 0.15), b.y + v * b.d + (v ? -0.15 : 0.15)), top = U(q, 30);
      g.line(U(q, 18), top, WOOD, 0.8);
      g.poly([top, [top[0] + 7, top[1] + 2 + wave], [top[0] + 3.5, top[1] + 3 + wave * 0.5], [top[0] + 7, top[1] + 4.6 + wave], [top[0], top[1] + 5]], col, { outline: true });
    }
  }
  return temples.length + palaces.length + marchers.length;
}

// ── V10: the weather ──
export const WEATHER = { clouds: 3, alpha: 0.1, soft: 4, tilesPerSecond: 0.25, radius: [4, 7], gusts: 12, gustMs: 1800, sand: '#E8D3A2' };
const edges = new WeakMap();                 // world -> [tile index of each desert tile beside non-desert land] (the terrain never changes in play)
export function desertEdge(world) {
  let e = edges.get(world);
  if (e && e.terrain === world.terrain) return e.list;
  const n = world.size, list = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = idx(n, x, y);
    if (world.terrain[i] !== T.DESERT) continue;
    let edge = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (inBounds(n, nx, ny) && world.terrain[idx(n, nx, ny)] !== T.DESERT && world.terrain[idx(n, nx, ny)] !== T.WATER) edge = true;
    }
    if (edge) list.push(i);
  }
  edges.set(world, { terrain: world.terrain, list });
  return list;
}
// ── Version 10.0, Track L (L.7, spec 5f, ruling 2231): the heat shimmer ──
// In Shemu around noon (the middle of the day phase), over open sand farther than SHIMMER.fromWater tiles from water, the ground the canvas already
// shows ripples: in a few tiles nearest the middle of the view, SHIMMER.slices thin bands of the canvas copied a device pixel aside at SHIMMER.alpha,
// rising slowly through the tile. Under Full only, never in the lesson, in V's layer (its weather share of V's budget); the interface is the page's,
// never this canvas, so it is never rippled.
export const SHIMMER = { fromWater: 6, slices: 3, alpha: 0.3, cap: 16, periodMs: 2400, noon: [0.3, 0.7] };
const sandFar = new WeakMap();                // world -> { terrain, far: Uint8Array (1 on desert tiles past fromWater tiles of water) }
export function farSand(world) {
  const had = sandFar.get(world);
  if (had && had.terrain === world.terrain) return had.far;
  const n = world.size, dist = new Int16Array(n * n).fill(-1), queue = [];
  for (let i = 0; i < n * n; i++) if (world.terrain[i] === T.WATER) { dist[i] = 0; queue.push(i); }
  for (let qi = 0; qi < queue.length; qi++) {
    const i = queue[qi], x = i % n, y = (i - x) / n;
    if (dist[i] > SHIMMER.fromWater) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(n, nx, ny)) continue;
      const j = idx(n, nx, ny);
      if (dist[j] < 0) { dist[j] = dist[i] + 1; queue.push(j); }
    }
  }
  const far = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) if (world.terrain[i] === T.DESERT && (dist[i] < 0 || dist[i] > SHIMMER.fromWater) && !world.occ[i] && !world.road[i]) far[i] = 1;
  sandFar.set(world, { terrain: world.terrain, far });
  return far;
}
export function shimmerOn(world, motion) {
  if (motion !== 'full' || world.lesson || seasonAt(world).season !== 'shemu') return false;
  const l = lightShown();
  if (l.phase !== 'day') return false;
  const u = ((lightPeek(world) % LIGHT.cycleMs) + LIGHT.cycleMs) % LIGHT.cycleMs / LIGHT.cycleMs / LIGHT.day;
  return u >= SHIMMER.noon[0] && u <= SHIMMER.noon[1];
}
export function drawShimmer(g, world, range, now, motion) {
  if (!range || !g.ctx || !shimmerOn(world, motion)) return 0;
  const far = farSand(world), n = world.size, cx = (range.x0 + range.x1) / 2, cy = (range.y0 + range.y1) / 2, tiles = [];
  const R = 7;                                                                     // a ring round the middle, so the cost does not grow with the view
  for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(n - 1, Math.floor(cy + R)); y++) {
    for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(n - 1, Math.floor(cx + R)); x++) {
      if (far[idx(n, x, y)] && hash2(x, y, (world.seed | 0) + 2252) < 0.5) tiles.push([x, y, Math.abs(x - cx) + Math.abs(y - cy)]);
    }
  }
  if (!tiles.length) return 0;
  tiles.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
  const ctx = g.ctx, m = ctx.getTransform(), S = g.scale, W = ctx.canvas.width, H = ctx.canvas.height;
  const tw = (p(1, 0)[0] - p(0, 1)[0]) * S, th = (p(1, 1)[1] - p(0, 0)[1]) * S, band = Math.max(1, Math.round(S * 0.5));
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = SHIMMER.alpha;
  let drawn = 0;
  for (const [x, y] of tiles.slice(0, SHIMMER.cap)) {
    const q = p(x + 0.5, y + 0.5), dx = q[0] * S + m.e, dy = q[1] * S + m.f;
    for (let k = 0; k < SHIMMER.slices; k++) {
      const ph = (((now / SHIMMER.periodMs + k / SHIMMER.slices + hash2(x, y, 2253)) % 1) + 1) % 1;   // rising through the tile
      const sy = Math.round(dy + th * (0.3 - 0.6 * ph)), w = Math.round(tw * 0.6 * Math.sin(Math.PI * ph)), sx = Math.round(dx - w / 2);
      if (w < 4 || sx < 1 || sy < 0 || sx + w + 1 >= W || sy + band >= H) continue;
      ctx.drawImage(ctx.canvas, sx, sy, w, band, sx + (k % 2 ? 1 : -1), sy, w, band);
      drawn++;
    }
  }
  ctx.restore();
  return drawn ? 1 : 0;
}

// The cloud shadows at real time now: { x, y (tiles), r } each, drifting with the wind across the view's middle and round again.
export function cloudsAt(world, range, now) {
  if (!range) return [];
  // Version 10.0, Track L (ruling 2230): the wind drifts, and swings in a storm
  const wind = windAt(world, now, stormSwing(world, now)), w = range.x1 - range.x0 + 1, h = range.y1 - range.y0 + 1, span = Math.max(w, h) + 16;
  const out = [];
  for (let i = 0; i < WEATHER.clouds; i++) {
    const h0 = hash2(i, 1, (world.seed | 0) + 9041), h1 = hash2(i, 2, (world.seed | 0) + 9041);
    const s = (((now / 1000) * WEATHER.tilesPerSecond + h0 * span) % span) - span / 2;   // along the wind, -span/2 .. span/2
    const side = (h1 - 0.5) * Math.min(w, h) * 0.8;
    out.push({ x: (range.x0 + range.x1) / 2 + wind.x * s - wind.y * side, y: (range.y0 + range.y1) / 2 + wind.y * s + wind.x * side, r: WEATHER.radius[0] + h1 * (WEATHER.radius[1] - WEATHER.radius[0]) });
  }
  return out;
}
// A shadow is a soft cluster: each lobe is WEATHER.soft nested ellipses, each a share of the alpha, so the middle reaches about WEATHER.alpha
// and the edge fades out instead of ending in a hard rim (a flat oval read as a rendering fault in the polish review). No clouds in the lesson:
// over its spotlight's dimming they read as a smudge.
export function drawWeather(g, world, range, now, motion = 'full') {
  let n = drawShimmer(g, world, range, now, motion);                         // Version 10.0, Track L (L.7): the heat shimmer first, over the ground it ripples
  const clouds = world.lesson ? [] : cloudsAt(world, range, now), k = WEATHER.soft;
  for (const c of clouds) {
    const q = p(c.x, c.y), r = c.r * 16;
    for (let i = 0; i < k; i++) {
      const s = 1 - i / k;
      g.ell(q, r * s, r * 0.5 * s, SHADOW, { alpha: WEATHER.alpha / k });
    }
    for (let i = 1; i < k; i++) {
      const s = 1 - i / k;
      g.ell([q[0] + r * 0.5, q[1] - r * 0.12], r * 0.75 * s, r * 0.375 * s, SHADOW, { alpha: (WEATHER.alpha * 0.6) / (k - 1) });
    }
    n++;
  }
  if (seasonAt(world).season !== 'shemu' || !range) return n;
  // Version 10.0, Track L (L.7): the wind drifts (windAt), and in a sandstorm it swings and the gusts thicken towards LIFE.storm.dustCap
  const storm = stormAt(world, now), sk = storm.on ? storm.k : 0;
  const wind = windAt(world, now, stormSwing(world, now)), list = desertEdge(world), win = Math.floor(now / WEATHER.gustMs);
  const most = Math.round(WEATHER.gusts + (LIFE.storm.dustCap - WEATHER.gusts) * sk), share = 0.25 + 0.6 * sk;
  const segs = [];
  let gusts = 0;
  for (let k = 0; k < list.length && gusts < most; k++) {
    const i = list[(k * 7919 + win * 104729) % list.length], x = i % world.size, y = (i - x) / world.size;
    if (!inView(x, y, range) || hash2(x, y + win, (world.seed | 0) + 9043) > share) continue;
    const t = ((now % WEATHER.gustMs) / WEATHER.gustMs), a = p(x + 0.5 + wind.x * t * 1.2, y + 0.5 + wind.y * t * 1.2), b = p(x + 0.5 + wind.x * (t * 1.2 + 0.6), y + 0.5 + wind.y * (t * 1.2 + 0.6));
    segs.push(['M', [a[0], a[1] - 2]], ['L', [b[0], b[1] - 2]]);
    gusts++;
  }
  const fade = Math.sin(Math.PI * ((now % WEATHER.gustMs) / WEATHER.gustMs));   // a gust fades in and out over its window, so a new set never pops in
  if (segs.length && fade > 0.01) g.stroke(segs, WEATHER.sand, 1, 0.55 * fade);
  return n + gusts;
}
