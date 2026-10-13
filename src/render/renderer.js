// One frame (spec 7.4): baked terrain chunks, ground shadows, depth-sorted sprites (buildings, trees and
// walkers), then effects, overlays and the placement grid. Reads the world; never writes it. Buildings in
// opts.rising (id -> t in [0, 1), from effects.risingIds) are revealed bottom-up: only the lowest t share of
// the sprite shows, and the shadow grows with it.
import { ART_SCALE, p, depthKey, compareDepth } from './iso.js';
import { visibleTileRange, visibleChunks, artToScreen, CHUNK } from './camera.js';
import { ART, slotFor } from './art/registry.js';
import { makeDraw } from './art/ctx.js';
import { groundShadow } from './art/primitives.js';
import { TERRAIN } from './art/palette.js';
import { createSpriteCache, drawSprite } from './spriteCache.js';
import { createTerrainBaker, drawTileGrid } from './terrainBaker.js';
import { hash2 } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';

// Cosmetic trees on free ground, decided by a hash of the tile and the seed. A building placed on the tile
// hides the tree, because occupancy wins; so does a road, and (Stage 4.5) a wall tile, a gate or a breach.
// Plots, plazas, rubble and monument sites are buildings, so world.occ covers them.
export function decorAt(world, x, y) {
  const i = idx(world.size, x, y);
  if (world.occ[i] || world.road[i] || (world.wall && world.wall[i] !== 0)) return null;
  const t = world.terrain[i];
  const r = hash2(x, y, world.seed + 7);
  if (t === T.MEADOW) return r < 0.08 ? 'palm' : r < 0.12 ? 'acacia' : null;
  if (t === T.FERTILE) return r < 0.025 ? 'palm' : null;
  if (t === T.BANK) return r < 0.06 ? 'palm' : null;
  if (t === T.DESERT) return r < 0.006 ? 'acacia' : null;
  return null;
}

// The map edge (early-game pass 2.1): strokes along the map diamond, widest and faintest first, drawn under
// the terrain chunks so only their outer halves show: a soft band that fades from the edge into the
// off-map sand, so the edge reads as a border rather than a flat triangle. [width in art px, alpha].
export const EDGE_FADE = [[24, 0.1], [14, 0.14], [7, 0.2], [2.5, 0.3]];

export function drawMapEdge(g, size) {
  const pts = [p(0, 0), p(size, 0), p(size, size), p(0, size)];
  for (const [width, alpha] of EDGE_FADE) g.poly(pts, 'none', { stroke: TERRAIN.edgeFade, strokeWidth: width, strokeAlpha: alpha });
}

const intersects = (b, r) => b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0;

export function collectObjects(world, range, walkers = [], registry = ART) {
  const out = [];
  for (const b of Object.values(world.buildings)) {
    if (!intersects(b, range)) continue;
    const slot = slotFor(b, world);
    const def = registry[slot];
    if (!def || !(def.draw || def.png)) continue;
    const o = { key: depthKey(b.x, b.y, b.w, b.d), id: b.id, slot, def, x: b.x, y: b.y };
    if (def.live) o.b = b;                             // Stage 4: a monument is drawn live from its building (opts.live)
    out.push(o);
  }
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      const slot = decorAt(world, x, y);
      if (slot) out.push({ key: depthKey(x, y, 1, 1), id: 1e6 + idx(world.size, x, y), slot, def: registry[slot], x, y });
    }
  }
  for (const wk of walkers) {
    if (wk.x < range.x0 || wk.x > range.x1 + 1 || wk.y < range.y0 || wk.y > range.y1 + 1) continue;
    out.push({ key: wk.x + wk.y + 0.01, id: 2e6 + wk.id, slot: `fig.${wk.kind}`, def: null, x: wk.x, y: wk.y });
  }
  out.sort(compareDepth);
  return out;
}

const defaultDpr = () => (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

// drawSprite with only the bottom t share of the sprite's height showing, clipped in device px.
export function drawRising(ctx, sprite, px, py, zoom, dpr, t) {
  if (t <= 0) return;
  const k = (ART_SCALE * zoom * dpr) / sprite.scale;
  const left = px - sprite.ax * k, top = py - sprite.ay * k;
  const w = sprite.canvas.width * k, h = sprite.canvas.height * k;
  const cut = top + h * (1 - Math.min(1, t));
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, cut, w, top + h - cut);
  ctx.clip();
  drawSprite(ctx, sprite, px, py, zoom, dpr);
  ctx.restore();
}

export function createRenderer({
  canvas, spriteCache = createSpriteCache(), baker = createTerrainBaker(),
  dpr = defaultDpr, registry = ART, maxBakesPerFrame = 2,
}) {
  const dprOf = typeof dpr === 'function' ? dpr : () => dpr;
  let currentDpr = dprOf();
  const ctx = canvas.getContext('2d');
  const stats = { chunks: 0, bakes: 0, objects: 0, sprites: 0, live: 0, ms: 0, frames: 0, stale: 0 };

  function renderFrame(world, cam, opts = {}) {
    const started = performance.now();
    const nextDpr = dprOf();
    if (nextDpr !== currentDpr) { currentDpr = nextDpr; spriteCache.clear(); }   // browser zoom changed: sprites at the old ratio would only pile up
    const dpr = currentDpr;
    const view = opts.view || { width: canvas.clientWidth || canvas.width / dpr, height: canvas.clientHeight || canvas.height / dpr };
    const W = Math.round(view.width * dpr), H = Math.round(view.height * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = TERRAIN.offMap;
    ctx.fillRect(0, 0, W, H);
    const zoom = cam.zoom;
    const range = visibleTileRange(cam, view, world.size);
    const toDevice = (ax, ay) => { const [sx, sy] = artToScreen(cam, view, ax, ay); return [sx * dpr, sy * dpr]; };
    const [ox, oy] = toDevice(0, 0);
    const g = makeDraw(ctx, ART_SCALE * zoom * dpr, ART_SCALE * zoom);   // the CSS px an art px takes, for marks that keep their size on screen

    // 0. The map edge band, in art px with the art origin placed by the camera; the chunks cover its inner half.
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    drawMapEdge(g, world.size);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 1. Terrain chunks. Stale or missing chunks bake a few per frame; the rest show next frame.
    let bakes = 0, chunks = 0, stale = 0;
    for (const { cx, cy } of visibleChunks(range)) {
      const peeked = baker.peek(world, cx, cy, zoom, dpr);
      let sprite = peeked.fresh ? peeked.sprite : null;
      if (!sprite && bakes < maxBakesPerFrame) { sprite = baker.get(world, cx, cy, zoom, dpr, true); bakes++; }
      if (!sprite && peeked.sprite) { sprite = peeked.sprite; stale++; }   // stale beats a sand hole
      if (!sprite) continue;
      const o = p(cx * CHUNK, cy * CHUNK);
      const [px, py] = toDevice(o[0], o[1]);
      drawSprite(ctx, sprite, px, py, zoom, dpr);
      chunks++;
    }

    // 2. Ground shadows, drawn in art px with the art origin placed by the camera.
    const objects = collectObjects(world, range, opts.walkers || [], registry);
    const rising = opts.rising || null;   // building ids only: tree and walker ids start at 1e6
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    if (opts.ambient) opts.ambient(g, range);              // Stage 3: ambient life over the terrain (render/ambient.js)
    if (opts.scorch) opts.scorch(g, range);                // Stage 4.5: scorch marks under burning buildings and rubble (render/fire.js), under their sprites
    for (const o of objects) {
      if (!o.def) continue;
      const up = rising && rising.has(o.id) ? rising.get(o.id) : 1;
      for (const [dx, dy, w, d, h] of o.def.shadows) groundShadow(g, o.x + dx, o.y + dy, w, d, h * up);
    }

    // 3. Depth-sorted sprites: buildings, trees and walkers in one pass, back to front.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let sprites = 0, live = 0;
    for (const o of objects) {
      // Stage 4: a monument (art entry live: true) is drawn live in its depth slot, in art px with the art origin set
      // (src/render/monuments.js drawMonument through opts.live), never from the sprite cache. Without opts.live (a bare
      // renderFrame) it falls back to its placeholder sprite.
      if (o.def && o.def.live && opts.live) {
        ctx.setTransform(1, 0, 0, 1, ox, oy);
        opts.live(g, o);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        live++;
        continue;
      }
      const slot = opts.treeSlot && o.id >= 1e6 && o.id < 2e6 ? opts.treeSlot(o) : o.slot;   // Stage 3: swaying trees (decor ids are 1e6..2e6)
      const sprite = spriteCache.get(slot, zoom, dpr);
      if (!sprite) continue;
      const q = p(o.x, o.y);
      const [px, py] = toDevice(q[0], q[1]);
      if (rising && rising.has(o.id)) drawRising(ctx, sprite, px, py, zoom, dpr, rising.get(o.id));
      else drawSprite(ctx, sprite, px, py, zoom, dpr);
      sprites++;
    }

    // 4. Fire and the units' marks (Stage 3: render/fire.js, render/units.js), effects, overlays and the placement grid,
    // back in art px.
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    if (opts.fire) opts.fire(g, range);
    if (opts.units) opts.units(g, range);
    if (opts.effects) opts.effects.draw(g, opts.now === undefined ? performance.now() : opts.now, world);
    if (opts.drawOverlay) opts.drawOverlay(g, range);
    if (opts.grid) drawTileGrid(g, range);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    stats.chunks = chunks; stats.bakes = bakes; stats.stale = stale; stats.objects = objects.length; stats.sprites = sprites; stats.live = live;
    stats.ms = performance.now() - started; stats.frames++;
    return stats;
  }

  return { renderFrame, stats, spriteCache, baker, get dpr() { return currentDpr; } };
}
