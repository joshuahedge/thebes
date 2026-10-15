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
import { isBridgeTile, DECK } from './terrainBridges.js';
import { hash2 } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';
import { hasNewLand, GRASS } from '../data/s47.js';
import { landTrees, LAND_TREES, moistureAt } from './grass.js';
import { hillsIn } from './hills.js';
import { buildingsInRange } from './chunkIndex.js';

// Draw-object ids: buildings use their own (small) ids, decor (trees) DECOR_ID_BASE + tile index, figures FIGURE_ID_BASE + walker id.
const DECOR_ID_BASE = 1e6, FIGURE_ID_BASE = 2e6;

// Cosmetic trees on free ground, decided by a hash of the tile and the seed. A building placed on the tile
// hides the tree, because occupancy wins; so does a road, and (Stage 4.5) a wall tile, a gate or a breach.
// Plots, plazas, rubble and monument sites are buildings, so world.occ covers them.
export function decorAt(world, x, y) {
  const i = idx(world.size, x, y);
  if (world.occ[i] || world.road[i] || (world.wall && world.wall[i] !== 0)) return null;
  const t = world.terrain[i], land = hasNewLand(world);
  const r = hash2(x, y, world.seed + 7);
  if (t === T.MEADOW) return r < 0.08 ? 'palm' : r < 0.12 ? 'acacia' : land ? LAND_TREES[landTrees(world)[i]] : null;
  if (t === T.FERTILE) return r < 0.025 ? 'palm' : land ? LAND_TREES[landTrees(world)[i]] : null;
  if (t === T.BANK) return r < 0.06 ? 'palm' : land ? LAND_TREES[landTrees(world)[i]] : null;
  if (t === T.DESERT) return r < 0.006 ? (!land || moistureAt(world, i) >= GRASS.tiers[0] ? 'acacia' : null) : land ? LAND_TREES[landTrees(world)[i]] : null;   // Task 3b: a new map's acacias stand only where the green reaches
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

// Version 5.0 (Task 6): what the view can show, for collectObjects. The range collectObjects is given is the tile-space box round the view's four corners, and the view is a
// tilted rectangle in it: at the minimum zoom that box holds up to twice the tiles the screen does, and (on a big map) a city's worth of sprites that are off the canvas. A
// sprite whose art bounds (its registry def's `bounds`, art px from p(x, y)) lie wholly outside the view and a margin is left out, and so are its shadow and its sort: the
// pixels are those of a frame that drew them. The margin (CULL_MARGIN art px, and the sprite's height again for its shadow) covers what is drawn beyond the bounds.
export const CULL_MARGIN = 48;
export const cullControl = { on: true };   // a test switches it off to draw a frame the old way and compare the pixels
export function viewCull(cam, view) {
  const k = ART_SCALE * cam.zoom, c = p(cam.x, cam.y);
  const m = CULL_MARGIN * k, ox = view.width / 2 - c[0] * k, oy = view.height / 2 - c[1] * k;
  const left = -m, top = -m, right = view.width + m, bottom = view.height + m;
  return {
    // Is a sprite with these art bounds at tile point (x, y) near the view (null bounds: yes)?
    sees(x, y, bounds, height = 0) {
      if (!bounds) return true;
      const sx = ox + (x - y) * 16 * k, sy = oy + (x + y) * 8 * k, h = height * k;
      return sx + bounds[2] * k + h >= left && sx + bounds[0] * k - h <= right && sy + bounds[3] * k + h >= top && sy + bounds[1] * k - h <= bottom;
    },
    // The x tiles of row y that can show something the size of `reach` art px (a tree): the part of the row inside the view and its margin, as [x0, x1] (empty when x0 > x1).
    row(y, reach) {
      const r = reach * k;
      // sx = ox + (x - y) * 16k within [left - r, right + r]; sy = oy + (x + y) * 8k within [top - r, bottom + r]
      const a0 = y + (left - r - ox) / (16 * k), a1 = y + (right + r - ox) / (16 * k);
      const b0 = (top - r - oy) / (8 * k) - y, b1 = (bottom + r - oy) / (8 * k) - y;
      return [Math.ceil(Math.max(a0, b0)), Math.floor(Math.min(a1, b1))];
    },
  };
}
// Does terrain chunk (cx, cy) (its diamond of CHUNK x CHUNK tiles, its bake a little wider) meet the view? Tested on the diamond's four corners' screen box.
function chunkShows(cam, view, cx, cy) {
  const k = ART_SCALE * cam.zoom, c = p(cam.x, cam.y), m = CULL_MARGIN * k;
  const ox = view.width / 2 - c[0] * k, oy = view.height / 2 - c[1] * k;
  const x0 = cx * CHUNK, y0 = cy * CHUNK, x1 = x0 + CHUNK, y1 = y0 + CHUNK;
  const left = ox + (x0 - y1) * 16 * k, right = ox + (x1 - y0) * 16 * k, top = oy + (x0 + y0) * 8 * k, bottom = oy + (x1 + y1) * 8 * k;
  return right >= -m && left <= view.width + m && bottom >= -m && top <= view.height + m;
}
const TREE_REACH = 64;   // art px a tree or hill tile can reach past its tile's point (the tallest is about 56 high)

// Version 5.0 (Task 0): the buildings in range come from the chunk index (src/render/chunkIndex.js), the same ones in the same order as a
// pass over every building, so a large city draws only what is near the view. Task 6: with `screen` ({ cam, view }) the objects the view cannot show are left out (viewCull).
export function collectObjects(world, range, walkers = [], registry = ART, screen = null) {
  const out = [];
  const cull = screen && cullControl.on ? viewCull(screen.cam, screen.view) : null;
  for (const b of buildingsInRange(world, range)) {
    const slot = slotFor(b, world);
    const def = registry[slot];
    if (!def || !(def.draw || def.png)) continue;
    if (cull && !def.live && !cull.sees(b.x, b.y, def.bounds, def.height)) continue;
    const o = { key: depthKey(b.x, b.y, b.w, b.d), id: b.id, slot, def, x: b.x, y: b.y };
    if (def.live) o.b = b;                             // Stage 4: a monument is drawn live from its building (opts.live)
    out.push(o);
  }
  for (let y = range.y0; y <= range.y1; y++) {
    let x0 = range.x0, x1 = range.x1;
    if (cull) { const [a, b] = cull.row(y, TREE_REACH); if (a > x0) x0 = a; if (b < x1) x1 = b; }
    for (let x = x0; x <= x1; x++) {
      const slot = decorAt(world, x, y);
      if (slot) out.push({ key: depthKey(x, y, 1, 1), id: DECOR_ID_BASE + idx(world.size, x, y), slot, def: registry[slot], x, y });
    }
  }
  // Stage 4.7 (ruling 464): hill tiles, each a sprite at its own depth (src/render/hills.js); their ids share the trees' range but are never swayed (`still`)
  for (const h of hillsIn(world, range, registry)) {
    if (cull && !cull.sees(h.x, h.y, registry[h.slot].bounds, registry[h.slot].height)) continue;
    out.push({ key: depthKey(h.x, h.y, 1, 1), id: DECOR_ID_BASE + h.i, slot: h.slot, def: registry[h.slot], x: h.x, y: h.y, still: true });
  }
  for (const wk of walkers) {
    if (wk.x < range.x0 || wk.x > range.x1 + 1 || wk.y < range.y0 || wk.y > range.y1 + 1) continue;
    if (cull) { const fd = registry[`fig.${wk.kind}`]; if (fd && !cull.sees(wk.x, wk.y, fd.bounds, fd.height)) continue; }
    out.push({ key: wk.x + wk.y + 0.01, id: FIGURE_ID_BASE + wk.id, slot: `fig.${wk.kind}`, def: null, x: wk.x, y: wk.y });
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
  const stats = { chunks: 0, bakes: 0, objects: 0, sprites: 0, live: 0, ms: 0, frames: 0, stale: 0, prebakes: 0 };
  let ring = { key: '', done: false };   // Version 5.0 (Task 8): the ring of chunks round the view that is baked, so a fling finds them ready

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
    g.cull = cullControl.on ? viewCull(cam, view) : null;   // Version 5.0 (Task 6): what the view can show, for a pass over the range's tiles that draws each one (markers.js)

    // 0. The map edge band, in art px with the art origin placed by the camera; the chunks cover its inner half.
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    drawMapEdge(g, world.size);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 1. Terrain chunks. Stale or missing chunks bake a few per frame; the rest show next frame.
    let bakes = 0, chunks = 0, stale = 0;
    for (const { cx, cy } of visibleChunks(range)) {
      if (cullControl.on && !chunkShows(cam, view, cx, cy)) continue;                  // Version 5.0 (Task 6): a chunk wholly off the canvas is neither baked nor drawn
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

    // 1b. Version 5.0 (Task 8): the culled chunks are not baked while they are off the canvas, so a fast fling would bake at the leading edge (two a frame) and
    // hitch on a phone. On a frame with nothing to bake, one chunk of the ring round the visible chunks is baked ahead, nearest the view first, never past what the
    // baker holds (it would evict the chunks in view). Once the ring is whole the pass is skipped until the view or the zoom moves it or a visible chunk re-bakes.
    let prebakes = 0;
    if (cullControl.on && baker.capacity) {
      if (bakes > 0 || stale > 0) ring.done = false;
      else {
        const vis = visibleChunks(range);
        let cx0 = Infinity, cx1 = -Infinity, cy0 = Infinity, cy1 = -Infinity;
        for (const { cx, cy } of vis) { cx0 = Math.min(cx0, cx); cx1 = Math.max(cx1, cx); cy0 = Math.min(cy0, cy); cy1 = Math.max(cy1, cy); }
        const rk = `${cx0},${cy0},${cx1},${cy1}|${zoom}|${dpr}`;
        if (rk !== ring.key) ring = { key: rk, done: false };
        if (!ring.done && vis.length) {
          const n = Math.ceil(world.size / CHUNK), mid = [(cx0 + cx1) / 2, (cy0 + cy1) / 2];
          let next = null, best = Infinity;
          for (let cy = Math.max(0, cy0 - 1); cy <= Math.min(n - 1, cy1 + 1); cy++) {
            for (let cx = Math.max(0, cx0 - 1); cx <= Math.min(n - 1, cx1 + 1); cx++) {
              if (cx >= cx0 && cx <= cx1 && cy >= cy0 && cy <= cy1 && chunkShows(cam, view, cx, cy)) continue;   // in view: drawn above
              if (baker.peek(world, cx, cy, zoom, dpr).fresh) continue;
              const d = Math.hypot(cx - mid[0], cy - mid[1]);
              if (d < best) { best = d; next = { cx, cy }; }
            }
          }
          if (next && baker.size(world) < baker.capacity) { baker.get(world, next.cx, next.cy, zoom, dpr, true); prebakes++; }
          else ring.done = true;                                         // whole, or the baker is full
        }
      }
    }

    // 2. Ground shadows, drawn in art px with the art origin placed by the camera.
    const objects = collectObjects(world, range, opts.walkers || [], registry, { cam, view });
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
      const slot = opts.treeSlot && !o.still && o.id >= DECOR_ID_BASE && o.id < FIGURE_ID_BASE ? opts.treeSlot(o) : o.slot;   // Stage 3: swaying trees (decor ids run from DECOR_ID_BASE up to FIGURE_ID_BASE)
      const sprite = spriteCache.get(slot, zoom, dpr);
      if (!sprite) continue;
      const q = p(o.x, o.y);
      if (o.id >= FIGURE_ID_BASE && isBridgeTile(world, Math.floor(o.x), Math.floor(o.y))) q[1] -= DECK.z + DECK.h;   // a figure on a bridge stands on its deck (Stage 4.5)
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

    stats.chunks = chunks; stats.bakes = bakes; stats.stale = stale; stats.prebakes = prebakes; stats.objects = objects.length; stats.sprites = sprites; stats.live = live;
    stats.ms = performance.now() - started; stats.frames++;
    return stats;
  }

  return { renderFrame, stats, spriteCache, baker, get dpr() { return currentDpr; } };
}
