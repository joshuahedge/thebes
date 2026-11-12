// Version 10.0 (Track F, rulings 2112-2114): the ground past the map's edge. Where 9.3 filled one flat tan to a hard diagonal, this is desert that pales and loses
// its detail with distance: from the off-map sand (TERRAIN.offMap) at the rim to a warm haze OFF_MAP_REACH tiles out, sparse dune strokes (baked once into a 256 px
// pattern, seeded by position) over those tiles fading with the distance, and a soft one-tile shadow just outside the rim so the land reads as raised, not cut. Nothing
// moves (so Still draws what Full does), and nothing here reads or writes anything but the frame: a pure function of the world's seed, the camera and the season.
// Drawn by renderFrame in place of the flat fill, before the terrain chunks. The season's wash is mixed into the ground's colours here (the land's own wash covers the
// land only) and the night tint (drawLight, over the whole canvas) falls on it as on everything else.
// Cost: the band is four quads (one a side of the map), each one fill with a linear gradient across it; the dunes are a few fills of the pattern over rings of the band.
import { p } from '../iso.js';
import { artToScreen } from '../camera.js';
import { TERRAIN } from '../art/palette.js';
import { hash2 } from '../../sim/rng.js';
import { seasonAt } from '../../sim/seasons.js';
import { SEASON_LOOK } from '../../data/seasons.js';

export const OFF_MAP_REACH = 12;            // tiles from the rim to the haze, and to where the dune strokes have faded away
export const DUNE_TILE = 256;               // the pattern's side, CSS px (it is baked at the device's ratio and drawn unscaled: a scaled pattern fill is four times the cost)
export const DUNE_STROKES = 640;            // strokes in one pattern tile
export const DUNE_SALT = 0x0D0E;            // the pattern's draw (added to the world's seed)
export const DUNE_ALPHA = 0.5;              // baked into the strokes: the fill itself runs at full alpha (an alpha fill of a pattern is three times the cost)
export const DUNE_THIN = [1, 0.55, 0.25];   // the share of the strokes each third of the band keeps, from the rim out: the detail goes with the distance
export const RIM_SHADOW = { tiles: 1, alpha: 0.18 };             // the shadow just outside the rim: its width and the alpha of its darkest
export const TILE_NORMAL_ART = 14.311;      // art px between two outsets one tile apart, measured across an edge (|(-16, 8) x (32, 16)| / 35.78)

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const SAND = hexRgb(TERRAIN.sand);
export const OFF_MAP_HAZE = toHex(mix(SAND, hexRgb('#E9DCC3'), 0.4));   // the sand blended 40% toward a warm cream
export const DUNE_COLOUR = toHex(SAND.map((v) => v * 0.94));            // the sand darkened 6%: a dune's crest
export const DUNE_LIP = toHex(SAND.map((v) => v * 0.82));               // and the lip under it, darker (ruling 2113)

// The pattern's strokes: short, flat runs (a dune's crest and its lip), one art px thick, scattered by hash. Pure in the seed.
export function duneStrokes(seed, count = DUNE_STROKES) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ x: Math.floor(hash2(i, 1, seed) * DUNE_TILE), y: Math.floor(hash2(i, 2, seed) * DUNE_TILE), len: 4 + Math.floor(hash2(i, 3, seed) * 8), lift: hash2(i, 4, seed) < 0.5 ? 0 : 1, keep: hash2(i, 5, seed) });
  }
  return out;
}

// The pattern canvas itself (DUNE_TILE x the ratio a side, transparent, the strokes one CSS px thick at DUNE_ALPHA: a crest in DUNE_COLOUR and, a pixel under part of it, a
// lip in DUNE_LIP), baked once per seed, ratio and thinning (variant 0 keeps every stroke, 1 and 2 the shares of DUNE_THIN).
const tiles = new Map();
export function duneCanvas(seed, dpr = 1, variant = 0) {
  const key = `${seed | 0}|${dpr}|${variant}`;
  let c = tiles.get(key);
  if (c) return c;
  const r = Math.max(1, Math.round(dpr));
  c = document.createElement('canvas');
  c.width = c.height = DUNE_TILE * r;
  const k = c.getContext('2d');
  k.globalAlpha = DUNE_ALPHA;
  for (const s of duneStrokes((seed + DUNE_SALT) | 0)) {
    if (s.keep >= DUNE_THIN[variant]) continue;
    for (let j = 0; j < s.len; j++) {
      const x = (s.x + j) % DUNE_TILE, y = (s.y + (s.lift && j > s.len / 2 ? 1 : 0)) % DUNE_TILE;
      k.fillStyle = DUNE_COLOUR; k.fillRect(x * r, y * r, r, r);
      if (s.lift && j % 2 === 0) { k.fillStyle = DUNE_LIP; k.fillRect(x * r, ((y + 1) % DUNE_TILE) * r, r, r); }
    }
  }
  tiles.set(key, c);
  return c;
}

// The season's washes as [colour, alpha] pairs (the land's own, SEASON_LOOK[season].wash, blended over the last month): what renderFrame hands to drawOffMap.
export function seasonWashes(world) {
  const s = seasonAt(world);
  const looks = s.blend > 0 ? [[s.season, 1 - s.blend], [s.next, s.blend]] : [[s.season, 1]];
  const out = [];
  for (const [id, w] of looks) { const [colour, alpha] = SEASON_LOOK[id].wash; if (alpha * w > 0.004) out.push([colour, alpha * w]); }
  return out;
}

// A colour with the washes laid over it, as a hex.
const washed = (hex, washes) => { let c = hexRgb(hex); for (const [w, a] of washes) c = mix(c, hexRgb(w), a); return toHex(c); };

// The map's diamond pushed d tiles out on every side, in art px.
export const outset = (size, d) => [p(-d, -d), p(size + d, -d), p(size + d, size + d), p(-d, size + d)];

// g: the renderer's draw (g.scale = device px per art px) on its context; cam, view: the frame's. opts.season: seasonWashes(world) (none: no wash). opts.dark is the
// night tint's flag, kept for the signature: the tint is drawn over the whole canvas after the ground, so the off-map takes it as the land does.
export function drawOffMap(g, world, cam, view, nowMs, opts = {}) {
  const ctx = g.ctx, size = world.size, k = g.scale;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const washes = opts.season || [];
  const dpr = k / (2 * cam.zoom);                          // ART_SCALE (2) css px an art px at zoom 1
  const [sx, sy] = artToScreen(cam, view, 0, 0);
  const rim = washed(TERRAIN.offMap, washes), haze = washed(OFF_MAP_HAZE, washes);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, W, H);
  ctx.setTransform(1, 0, 0, 1, sx * dpr, sy * dpr);        // the art origin placed by the camera, as the edge band's
  const reach = OFF_MAP_REACH, rimPts = outset(size, 0);
  const outerPts = outset(size, reach);
  // One quad a side of the map, from the rim to the haze's edge: a gradient across it (the edge's outward normal), rim colour to haze.
  for (let i = 0; i < 4; i++) {
    const a = rimPts[i], b = rimPts[(i + 1) % 4], a2 = outerPts[i], b2 = outerPts[(i + 1) % 4];
    const ex = b[0] - a[0], ey = b[1] - a[1], len = Math.hypot(ex, ey);
    let nx = ey / len, ny = -ex / len;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, cx = (rimPts[0][0] + rimPts[2][0]) / 2, cy = (rimPts[0][1] + rimPts[2][1]) / 2;
    if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
    const L = reach * TILE_NORMAL_ART;
    const grad = ctx.createLinearGradient(mx * k, my * k, (mx + nx * L) * k, (my + ny * L) * k);
    grad.addColorStop(0, rim);
    grad.addColorStop(1, haze);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(a[0] * k, a[1] * k); ctx.lineTo(b[0] * k, b[1] * k); ctx.lineTo(b2[0] * k, b2[1] * k); ctx.lineTo(a2[0] * k, a2[1] * k);
    ctx.closePath();
    ctx.fill();
  }
  // The dunes: a third of the band at a time (rings four tiles wide), each with a pattern that keeps fewer strokes than the one inside it, so they thin and are gone at the
  // reach. The pattern is anchored at the art origin, drawn unscaled at the device's ratio, and its strokes carry their alpha.
  if (opts.dunes !== false) {
    const ratio = Math.max(1, Math.round(dpr)), step = reach / DUNE_THIN.length;
    for (let i = 0; i < DUNE_THIN.length; i++) {
      ctx.fillStyle = ctx.createPattern(duneCanvas(world.seed, ratio, i), 'repeat');
      ctx.beginPath();
      for (const pts of [outset(size, (i + 1) * step), outset(size, i * step)]) { ctx.moveTo(pts[0][0] * k, pts[0][1] * k); for (let j = 1; j < 4; j++) ctx.lineTo(pts[j][0] * k, pts[j][1] * k); ctx.closePath(); }
      ctx.fill('evenodd');
    }
  }
  // The rim's shadow: a band just outside the edge, darkest at the rim, nothing a tile out (a gradient across each side's one-tile quad).
  const shade = hexRgb(TERRAIN.edgeFade), shadeEnd = outset(size, RIM_SHADOW.tiles);
  for (let i = 0; i < 4; i++) {
    const a = rimPts[i], b = rimPts[(i + 1) % 4], a2 = shadeEnd[i], b2 = shadeEnd[(i + 1) % 4];
    const ex = b[0] - a[0], ey = b[1] - a[1], len = Math.hypot(ex, ey);
    let nx = ey / len, ny = -ex / len;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, cx = (rimPts[0][0] + rimPts[2][0]) / 2, cy = (rimPts[0][1] + rimPts[2][1]) / 2;
    if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
    const L = RIM_SHADOW.tiles * TILE_NORMAL_ART;
    const grad = ctx.createLinearGradient(mx * k, my * k, (mx + nx * L) * k, (my + ny * L) * k);
    grad.addColorStop(0, `rgba(${shade[0]},${shade[1]},${shade[2]},${RIM_SHADOW.alpha})`);
    grad.addColorStop(1, `rgba(${shade[0]},${shade[1]},${shade[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(a[0] * k, a[1] * k); ctx.lineTo(b[0] * k, b[1] * k); ctx.lineTo(b2[0] * k, b2[1] * k); ctx.lineTo(a2[0] * k, a2[1] * k);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
