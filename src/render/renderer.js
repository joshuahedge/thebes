// One frame (spec 7.4): baked terrain chunks, ground shadows, depth-sorted sprites (buildings, trees and
// walkers), then effects, overlays and the placement grid. Reads the world; never writes it.
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
// hides the tree, because occupancy wins.
export function decorAt(world, x, y) {
  const i = idx(world.size, x, y);
  if (world.occ[i] || world.road[i]) return null;
  const t = world.terrain[i];
  const r = hash2(x, y, world.seed + 7);
  if (t === T.MEADOW) return r < 0.08 ? 'palm' : r < 0.12 ? 'acacia' : null;
  if (t === T.FERTILE) return r < 0.025 ? 'palm' : null;
  if (t === T.BANK) return r < 0.06 ? 'palm' : null;
  if (t === T.DESERT) return r < 0.006 ? 'acacia' : null;
  return null;
}

const intersects = (b, r) => b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0;

export function collectObjects(world, range, walkers = [], registry = ART) {
  const out = [];
  for (const b of Object.values(world.buildings)) {
    if (!intersects(b, range)) continue;
    const slot = slotFor(b);
    const def = registry[slot];
    if (!def || !(def.draw || def.png)) continue;
    out.push({ key: depthKey(b.x, b.y, b.w, b.d), id: b.id, slot, def, x: b.x, y: b.y });
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

export function createRenderer({
  canvas, spriteCache = createSpriteCache(), baker = createTerrainBaker(),
  dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1, registry = ART, maxBakesPerFrame = 2,
}) {
  const ctx = canvas.getContext('2d');
  const stats = { chunks: 0, bakes: 0, objects: 0, sprites: 0, ms: 0, frames: 0 };

  function renderFrame(world, cam, opts = {}) {
    const started = performance.now();
    const view = opts.view || { width: canvas.clientWidth || canvas.width / dpr, height: canvas.clientHeight || canvas.height / dpr };
    const W = Math.round(view.width * dpr), H = Math.round(view.height * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = TERRAIN.sandOff;
    ctx.fillRect(0, 0, W, H);
    const zoom = cam.zoom;
    const range = visibleTileRange(cam, view, world.size);
    const toDevice = (ax, ay) => { const [sx, sy] = artToScreen(cam, view, ax, ay); return [sx * dpr, sy * dpr]; };

    // 1. Terrain chunks. Stale or missing chunks bake a few per frame; the rest show next frame.
    let bakes = 0, chunks = 0;
    for (const { cx, cy } of visibleChunks(range)) {
      let sprite = baker.get(world, cx, cy, zoom, dpr, false);
      if (!sprite && bakes < maxBakesPerFrame) { sprite = baker.get(world, cx, cy, zoom, dpr, true); bakes++; }
      if (!sprite) continue;
      const o = p(cx * CHUNK, cy * CHUNK);
      const [px, py] = toDevice(o[0], o[1]);
      drawSprite(ctx, sprite, px, py, zoom, dpr);
      chunks++;
    }

    // 2. Ground shadows, drawn in art px with the art origin placed by the camera.
    const [ox, oy] = toDevice(0, 0);
    const g = makeDraw(ctx, ART_SCALE * zoom * dpr);
    const objects = collectObjects(world, range, opts.walkers || [], registry);
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    for (const o of objects) {
      if (!o.def) continue;
      for (const [dx, dy, w, d, h] of o.def.shadows) groundShadow(g, o.x + dx, o.y + dy, w, d, h);
    }

    // 3. Depth-sorted sprites: buildings, trees and walkers in one pass, back to front.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let sprites = 0;
    for (const o of objects) {
      const sprite = spriteCache.get(o.slot, zoom, dpr);
      if (!sprite) continue;
      const q = p(o.x, o.y);
      const [px, py] = toDevice(q[0], q[1]);
      drawSprite(ctx, sprite, px, py, zoom, dpr);
      sprites++;
    }

    // 4. Effects, overlays and the placement grid, back in art px.
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    if (opts.effects) opts.effects.draw(g, opts.now === undefined ? performance.now() : opts.now);
    if (opts.drawOverlay) opts.drawOverlay(g, range);
    if (opts.grid) drawTileGrid(g, range);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    stats.chunks = chunks; stats.bakes = bakes; stats.objects = objects.length; stats.sprites = sprites;
    stats.ms = performance.now() - started; stats.frames++;
    return stats;
  }

  return { renderFrame, stats, spriteCache, baker, dpr };
}
