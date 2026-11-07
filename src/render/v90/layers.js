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
import { windOf } from '../ambient.js';
import { UNIT_ID_BASE } from '../units.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const inView = (x, y, r) => !r || (x >= r.x0 - 1 && x <= r.x1 + 2 && y >= r.y0 - 1 && y <= r.y1 + 2);

// ── V6: dust on the move ──
export const DUST = { cap: 30, periodMs: 700, colour: '#D8C4A0', alpha: 0.34, behind: 4 };
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
      g.circ([q[0] + back * (DUST.behind + ph * 6) * big, q[1] - 1 - ph * 2.5], (1.4 + ph * 2.2) * big, DUST.colour, { alpha: DUST.alpha * (1 - ph) });
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
        g.ell(U(q, 8), 1.6, 1, GOLD, { alpha: 0.4 + 0.6 * lamps });
        g.circ(U(q, 8.6), 0.7, '#FFF4C8', { alpha: lamps });
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
export const WEATHER = { clouds: 3, alpha: 0.1, tilesPerSecond: 0.25, radius: [4, 7], gusts: 12, gustMs: 1800, sand: '#E8D3A2' };
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
// The cloud shadows at real time now: { x, y (tiles), r } each, drifting with the wind across the view's middle and round again.
export function cloudsAt(world, range, now) {
  if (!range) return [];
  const wind = windOf(world), w = range.x1 - range.x0 + 1, h = range.y1 - range.y0 + 1, span = Math.max(w, h) + 16;
  const out = [];
  for (let i = 0; i < WEATHER.clouds; i++) {
    const h0 = hash2(i, 1, (world.seed | 0) + 9041), h1 = hash2(i, 2, (world.seed | 0) + 9041);
    const s = (((now / 1000) * WEATHER.tilesPerSecond + h0 * span) % span) - span / 2;   // along the wind, -span/2 .. span/2
    const side = (h1 - 0.5) * Math.min(w, h) * 0.8;
    out.push({ x: (range.x0 + range.x1) / 2 + wind.x * s - wind.y * side, y: (range.y0 + range.y1) / 2 + wind.y * s + wind.x * side, r: WEATHER.radius[0] + h1 * (WEATHER.radius[1] - WEATHER.radius[0]) });
  }
  return out;
}
export function drawWeather(g, world, range, now) {
  let n = 0;
  for (const c of cloudsAt(world, range, now)) {
    const q = p(c.x, c.y), r = c.r * 16;
    g.ell(q, r, r * 0.5, SHADOW, { alpha: WEATHER.alpha });                 // the shadow: a soft cluster, never darker than a quarter
    g.ell([q[0] + r * 0.5, q[1] - r * 0.12], r * 0.6, r * 0.3, SHADOW, { alpha: WEATHER.alpha * 0.6 });
    n++;
  }
  if (seasonAt(world).season !== 'shemu' || !range) return n;
  const wind = windOf(world), list = desertEdge(world), win = Math.floor(now / WEATHER.gustMs);
  const segs = [];
  let gusts = 0;
  for (let k = 0; k < list.length && gusts < WEATHER.gusts; k++) {
    const i = list[(k * 7919 + win * 104729) % list.length], x = i % world.size, y = (i - x) / world.size;
    if (!inView(x, y, range) || hash2(x, y + win, (world.seed | 0) + 9043) > 0.25) continue;
    const t = ((now % WEATHER.gustMs) / WEATHER.gustMs), a = p(x + 0.5 + wind.x * t * 1.2, y + 0.5 + wind.y * t * 1.2), b = p(x + 0.5 + wind.x * (t * 1.2 + 0.6), y + 0.5 + wind.y * (t * 1.2 + 0.6));
    segs.push(['M', [a[0], a[1] - 2]], ['L', [b[0], b[1] - 2]]);
    gusts++;
  }
  if (segs.length) g.stroke(segs, WEATHER.sand, 1, 0.55);
  return n + gusts;
}
