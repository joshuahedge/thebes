# Thebes Stage 1b: Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw the Stage 1a world on a high-DPI canvas in the approved art style: blended terrain baked in chunks, code-drawn buildings from a sprite cache, depth sorting, cosmetic walkers, overlays, placement ghosts and feedback effects, driven by a fixed-timestep game loop, with a dev page that shows it running.

**Architecture:** `src/render/` reads the world and never changes it. Pure maths lives in `iso.js` and `camera.js`. Every drawing function takes a small drawing helper (`makeDraw`) that wraps Canvas 2D and works in "art pixels", the mock-up's unit where a tile is 32×16; the game draws at 2× that (64 px tiles at zoom 1). Art is registered in slots (`house.t1`, `well`, …) and rendered once per zoom bucket into offscreen canvases by `spriteCache.js`. Terrain is baked into 16×16-tile chunk canvases by `terrainBaker.js`, which re-bakes a chunk only when its signature (terrain, roads, occupancy, building types and tiers) changes. `renderer.js` composes a frame; `loop.js` steps the sim in whole game-days. The sim gains an optional, unsaved event channel so effects can react to upgrades, downgrades, milestones and arrivals.

**Tech Stack:** HTML + JavaScript ES modules, Canvas 2D, `requestAnimationFrame`, the in-house test harness, `tests/serve.py`, headless Microsoft Edge.

**Spec:** `docs/superpowers/specs/2026-10-09-thebes-design.md` (sections 4.5 walkers, 5.1–5.4 art and feel, 6.3 overlays, 6.5 placement states, 7.1–7.4 architecture and game loop, 9 testing). Also binding: `docs/superpowers/notes/2026-10-10-stage-1b-plan-brief.md`, the "Plan 1b" section of `docs/superpowers/notes/2026-10-09-stage-1a-followups.md`, and the approved art in `docs/superpowers/notes/art-reference/` (`README.md`, `v4-new-era-style.html`, `blending-before-after.html`). The art code below is a faithful Canvas port of those SVG mock-ups; when in doubt, the mock-up wins.

## Global Constraints

- No build step, no npm, no frameworks, no third-party code. Plain ES modules loaded by the browser.
- Target browsers: iOS Safari 16+, current Android Chrome, current desktop Chrome, Edge, Firefox and Safari. No `ctx.filter`, no `OffscreenCanvas` requirement, no top-level `await` in `src/`.
- `src/sim/` stays deterministic: never `Math.random`, `Date`, `performance.now` or the DOM. The event channel added here is optional and never saved.
- `src/render/` may use `performance.now()`, `requestAnimationFrame` and the DOM, but **must never mutate the world**. Its caches are `WeakMap`s keyed by the world object, or live inside renderer objects.
- Render code may import `hash2` and `valueNoise` from `src/sim/rng.js` for cosmetic randomness. Everything cosmetic is seeded from `world.seed`, tile coordinates and time, so two frames of the same world at the same time are identical.
- Tunables live in `src/data/`; render palettes live in `src/render/art/palette.js`.
- The world is JSON-safe data. Nothing in this plan adds a field to it.
- Tile width is **64 CSS px at zoom 1** (spec 5.3). Mock-up art is drawn at 32 px tiles, so `ART_SCALE = 2`. Zoom is clamped to 0.5–2.
- Commit identity for this repo only: `Joshua Hedge <181878008+joshuahedge@users.noreply.github.com>`. It's already set in `.git/config`; never change it or the global config. There is no work GitHub for this project.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (as the brief requires; keep it as written).
- Never use any file, image or text from Pharaoh or Pharaoh: A New Era, and never use the word "Pharaoh" in game text or code identifiers.
- LF line endings (`.gitattributes` enforces it). Run all commands from the repo root `C:\dev\thebes` in PowerShell.
- Every task ends with the whole suite green: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` prints `ALL PASSED`. There are 160 tests now; this plan adds about 60.

## File Structure

```
thebes/
  dev.html                           dev page (root): seeded world, sample city, clock, full-window canvas
  src/
    sim/clock.js                     MODIFY: optional events on tickDay/advanceDays/runMonth
    sim/housing.js                   MODIFY: monthlyHousing(world, events) reports upgrades and downgrades
    dev/
      sampleCity.js                  buildSampleCity(world), buildStressCity(world) via commands.js
      devControls.js                 keyboard and mouse dev controls; 1c deletes this file
    render/
      iso.js                         art-pixel projection, tile<->art conversion, depth keys, hash
      camera.js                      camera {x,y,zoom}, screen<->tile, pan/zoom, visible range, chunks
      spriteCache.js                 slot -> offscreen canvas per zoom bucket and dpr, PNG-ready
      terrainBaker.js                chunk signatures, ground layers, plots, decoration, chunk cache
      terrainWater.js                the river: band, depth, foam, ripples, reeds
      terrainRoads.js                road segments in deterministic order, stroked paths, ruts, pebbles
      renderer.js                    one frame: chunks, shadows, depth-sorted sprites, effects, overlays
      loop.js                        requestAnimationFrame driver with a fixed game-day timestep
      walkers.js                     cosmetic walkers on in-reach road tiles, deterministic from time
      overlays.js                    water/food/religion/housing marks, reach highlight, placement ghost
      effects.js                     puff, glow "+Shack", pulse "-Cottage", milestone hook, reduced motion
      art/
        palette.js                   every colour used by the art and terrain
        ctx.js                       makeDraw(ctx, scale): poly/line/circ/ell/path/text/faceGrad/dome
        primitives.js                tb, box, qd, crs, door, win, parapet, mat, rug, pots, fence, stairs,
                                     ladder, post, awn, col, bed, pool, statue, groundShadow, tile
        housing.js                   H1-H4 and HOUSE_ART
        services.js                  well, farmGrain, granary, bazaar, temple and SERVICE_ART
        nature.js                    palmAt, acacia, reeds, rock, scrub, dune, tufts, fieldTile, NATURE_ART
        figures.js                   fig(kind) and FIGURE_ART
        registry.js                  ART: every slot {w, d, height, bounds, shadows, draw}, slotFor(b)
  tests/
    helpers/canvas.js                makeCanvas, pixelAt, canvasHash, nearColour
    helpers/renderWorld.js           riverWorld() and renderSetup() for render tests
    sim/events.test.js
    render/iso.test.js  camera.test.js  ctx.test.js  primitives.test.js  housingArt.test.js
    render/servicesArt.test.js  natureArt.test.js  figuresArt.test.js  spriteCache.test.js
    render/terrainBaker.test.js  terrainRoads.test.js  renderer.test.js  loop.test.js
    render/walkers.test.js  overlays.test.js  effects.test.js  stress.test.js
```

## Conventions every task relies on

- **Art pixels.** All drawing code works in the mock-up's units: `p(x, y) = [(x - y) * 16, (x + y) * 8]` maps a tile corner to art px, so a tile is 32×16. The drawing helper multiplies by a `scale` (device px per art px). At zoom 1 and dpr 1 the scale is `ART_SCALE = 2`, which gives the spec's 64 px tiles.
- **Faces.** `C[0]` is the top, `C[1]` the lit left face (the +y face), `C[2]` the shaded right face (the +x face).
- **Shadows** are two ground polygons per block, offset right by `h × 0.45` at 12% and `h × 0.85` at 8%, colour `#3E3260`. The renderer draws all shadows before any sprite.
- **Depth order:** objects sort by footprint-centre `x + y`, ascending, then by id.
- **Slots.** A building's slot is `house.t<tier>` for houses and its `type` for everything else. Figures are `fig.<kind>`, trees `palm` and `acacia`.
- **Tests that draw** create a canvas with `document.createElement('canvas')`; the runner is a real browser. Pixel checks use loose tolerances.

## How to run tests

- **Command line:** `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` runs everything; `-Grep "camera"` runs one group. It exits 0 only when it prints `ALL PASSED`.
- **Browser:** `python tests/serve.py 8000 .`, then open `http://localhost:8000/tests/` (add `?grep=camera`), or `http://localhost:8000/dev.html` once Task 16 exists.

---

### Task 1: Sim event channel

**Files:**
- Modify: `src/sim/clock.js:46-67`
- Modify: `src/sim/housing.js:464-498`
- Test: `tests/sim/events.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `tickDay`, `advanceDays`, `runMonth` (clock), `monthlyHousing` (housing), `updateMilestone` (returns true when the milestone changed), `arrivalsBatch` (returns the number who arrived).
- Produces: optional last parameter `events` (an array or `null`) on `tickDay(world, events = null)`, `advanceDays(world, n, events = null)`, `runMonth(world, events = null)` and `monthlyHousing(world, events = null)`. When an array is given, the sim pushes plain objects into it and never reads them:
  - `{ type: 'upgrade', id, from, to }` and `{ type: 'downgrade', id, from, to }` from `monthlyHousing` (tier numbers);
  - `{ type: 'milestone', id }` from `runMonth` when `updateMilestone` returns true (`id` is the new `world.milestone`);
  - `{ type: 'arrivals', count }` from `tickDay` when `arrivalsBatch` returns more than 0.

  Nothing about the simulation changes when `events` is omitted. Events are never stored in the world.

- [ ] **Step 1: Write the failing tests**

`tests/sim/events.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { tickDay, advanceDays } from '../../src/sim/clock.js';
import { monthlyHousing } from '../../src/sim/housing.js';
import { serialize } from '../../src/save/serialize.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('sim events', () => {
  it('reports an upgrade with the old and new tier', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    addRaw(w, 'well', 13, 9);
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([{ type: 'upgrade', id: h.id, from: 1, to: 2 }]);
  });
  it('reports a downgrade when the timer runs out', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([]);
    monthlyHousing(w, events);
    expect(events).toEqual([{ type: 'downgrade', id: h.id, from: 2, to: 1 }]);
  });
  it('reports arrivals and the first milestone through tickDay', () => {
    const w = street();
    for (let x = 1; x <= 30; x++) addRaw(w, 'house', x, 11, { tier: 4, residents: 0 });
    for (let x = 2; x <= 30; x += 6) addRaw(w, 'well', x, 9);
    staffAll(w);
    const events = [];
    advanceDays(w, 10, events);
    const arrivals = events.filter((e) => e.type === 'arrivals');
    expect(arrivals.length).toBe(1);
    expect(arrivals[0].count).toBeGreaterThan(0);
    w.mood = 100;
    for (const b of Object.values(w.buildings)) if (b.type === 'house') b.residents = 16;
    advanceDays(w, 20, events);
    expect(events.some((e) => e.type === 'milestone' && e.id === 'town')).toBe(true);
  });
  it('changes nothing about the world when no events array is given', () => {
    const a = street();
    const b = street();
    for (const w of [a, b]) {
      addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
      addRaw(w, 'well', 13, 9);
    }
    const events = [];
    advanceDays(a, 45);
    advanceDays(b, 45, events);
    expect(serialize(a)).toBe(serialize(b));
    expect(events.length).toBeGreaterThan(0);
    expect(serialize(b).includes('"events"')).toBe(false);
  });
  it('accepts a single tickDay with events', () => {
    const w = street();
    const events = [];
    tickDay(w, events);
    expect(events).toEqual([]);
  });
});
```

Append to `tests/all.js`:
```js
import './sim/events.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sim events"`
Expected: the upgrade and downgrade tests FAIL (`expected [] to equal [{"type":"upgrade"...`), and the arrivals test FAILS because nothing is pushed.

- [ ] **Step 3: Add the channel to housing**

In `src/sim/housing.js`, change the signature and the two tier changes inside `monthlyHousing`:

```js
export function monthlyHousing(world, events = null) {
  const cov = computeCoverage(world);
  const bazaars = bazaarsByHouse(world);
  for (const h of housesOf(world)) {
    h.leftThisMonth = 0;
    if (h.tier === 0) continue;
    const met = {
      road: touchesRoad(world, h),
      water: cov.water.has(h.id),
      religion: cov.religion.has(h.id),
      food: wantedNeeds(h).includes('food') ? consumeFood(h) : false,
    };
    h.met = met;
    topUpHouse(world, h, wantedGoods(h), bazaars.get(h.id));
    h.stockedFor = h.residents;

    const currentOk = met.road && needsOf(h.tier).every((n) => met[n]);
    if (currentOk) {
      h.downTimer = 0;
      const next = h.tier + 1;
      if (next <= MAX_TIER && needsOf(next).every((n) => met[n])) {
        if (events) events.push({ type: 'upgrade', id: h.id, from: h.tier, to: next });
        h.tier = next;
      }
    } else {
      h.downTimer++;
      if (h.downTimer >= DOWNGRADE_AFTER_MONTHS) {
        if (h.tier > 1) {
          if (events) events.push({ type: 'downgrade', id: h.id, from: h.tier, to: h.tier - 1 });
          h.tier--;
        }
        h.downTimer = 0;
      }
    }

    const cap = TIERS[h.tier].capacity;
    let leave = met.road ? Math.max(0, h.residents - cap) : h.residents;
    leave = Math.min(leave, leaveCap(h));
    if (leave > 0) removeResidents(h, leave);
  }
}
```

- [ ] **Step 4: Add the channel to the clock**

Replace `runMonth`, `tickDay` and `advanceDays` in `src/sim/clock.js`:

```js
// events is an optional array. When given, the sim pushes plain objects into it so the renderer can
// react (effects, banners). It is never read by the sim and never saved.
export function runMonth(world, events = null) {
  restockBazaars(world);
  monthlyHousing(world, events);
  departures(world);
  monthlyEconomy(world);
  updateMood(world);
  const milestoneChanged = updateMilestone(world);
  if (milestoneChanged && events) events.push({ type: 'milestone', id: world.milestone });
  computeAlerts(world);
  clearUndo(world);
}

export function tickDay(world, events = null) {
  assignLabour(world);
  produceDay(world);
  world.day += 1;
  if (world.day % ARRIVAL_EVERY === 0) {
    const count = arrivalsBatch(world);
    if (count > 0 && events) events.push({ type: 'arrivals', count });
  }
  if (world.day % DAYS_PER_MONTH === 0) runMonth(world, events);
}

export function advanceDays(world, n, events = null) {
  for (let i = 0; i < n; i++) tickDay(world, events);
}
```

- [ ] **Step 5: Run the whole suite**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: every existing test still PASS (the determinism and save tests prove the channel is inert), the five new tests PASS, then `ALL PASSED`.

- [ ] **Step 6: Commit**

```powershell
git add src/sim/clock.js src/sim/housing.js tests/sim/events.test.js tests/all.js
git commit -m "Add an optional event channel to the clock and housing`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Isometric maths and the camera

**Files:**
- Create: `src/render/iso.js`, `src/render/camera.js`
- Test: `tests/render/iso.test.js`, `tests/render/camera.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: nothing from the sim.
- Produces (`iso.js`):
  - `ART_SCALE = 2`, `TILE_W = 64`, `TILE_H = 32`, `ART_TILE_W = 32`, `ART_TILE_H = 16`.
  - `p(x, y) → [ax, ay]` tile corner to art px; `U(q, h) → [q[0], q[1] - h]` raises a point by `h`.
  - `artToTile(ax, ay) → { x, y }`, the exact inverse of `p` (fractional).
  - `tileDiamond(x, y) → [4 points]`, `quad(x, y, w, d, z) → [4 points]` (a footprint raised by z), `dia(cx, cy, r) → [4 points]`.
  - `hs(x, y, k) → 0..1`, the mock-up's sine hash, used only for art placement.
  - `depthKey(x, y, w, d) → number` (`x + w/2 + y + d/2`), `compareDepth(a, b)` for objects shaped `{ key, id }`.
- Produces (`camera.js`):
  - `MIN_ZOOM = 0.5`, `MAX_ZOOM = 2`, `clampZoom(z)`, `CHUNK = 16`.
  - `createCamera({ x, y, zoom }) → { x, y, zoom }`; `x`, `y` are the tile coordinates (fractional) at the centre of the view.
  - `pxPerArt(cam) → ART_SCALE * cam.zoom` (CSS px per art px).
  - `artToScreen(cam, view, ax, ay) → [sx, sy]`, `tileToScreen(cam, view, x, y) → [sx, sy]`, `screenToArt(cam, view, sx, sy) → [ax, ay]`, `screenToTile(cam, view, sx, sy) → { x, y }` (fractional), `screenToTileIndex(cam, view, sx, sy) → { x, y }` (floored). `view` is `{ width, height }` in CSS px.
  - `panBy(cam, dxPx, dyPx)` moves the camera so the world slides by that many CSS px; `zoomAt(cam, view, factor, sx, sy)` zooms keeping the world point under `(sx, sy)` fixed; both mutate `cam` and return it.
  - `visibleTileRange(cam, view, size, pad = { side: 1, top: 1, bottom: 4 }) → { x0, y0, x1, y1 }` inclusive tile bounds, clamped to the map; `bottom` pads further in +x and +y so tall buildings whose footprint is just below the screen still draw.
  - `visibleChunks(range) → [{ cx, cy }]` in row-major order.

- [ ] **Step 1: Write the failing tests**

`tests/render/iso.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { p, U, artToTile, tileDiamond, quad, dia, hs, depthKey, compareDepth, ART_SCALE, TILE_W } from '../../src/render/iso.js';

const close = (a, b) => Math.abs(a - b) < 1e-9;

describe('iso', () => {
  it('projects a tile corner to the mock-up grid', () => {
    expect(p(0, 0)).toEqual([0, 0]);
    expect(p(1, 0)).toEqual([16, 8]);
    expect(p(0, 1)).toEqual([-16, 8]);
    expect(p(3, 5)).toEqual([-32, 64]);
  });
  it('draws tiles 64 CSS px wide at zoom 1', () => {
    expect((p(1, 0)[0] - p(0, 1)[0]) * ART_SCALE).toBe(TILE_W);
  });
  it('round-trips art px back to fractional tiles', () => {
    for (const [x, y] of [[0, 0], [3, 5], [10.25, 2.5], [63, 63]]) {
      const q = p(x, y);
      const t = artToTile(q[0], q[1]);
      expect(close(t.x, x) && close(t.y, y)).toBe(true);
    }
  });
  it('raises points and builds diamonds', () => {
    expect(U([5, 9], 4)).toEqual([5, 5]);
    expect(tileDiamond(0, 0)).toEqual([[0, 0], [16, 8], [0, 16], [-16, 8]]);
    expect(quad(0, 0, 1, 1, 10)).toEqual([[0, -10], [16, -2], [0, 6], [-16, -2]]);
    expect(dia(1, 1, 1)).toEqual([p(1, 0), p(2, 1), p(1, 2), p(0, 1)]);
  });
  it('hashes deterministically into 0..1', () => {
    expect(hs(3, 4, 5)).toBe(hs(3, 4, 5));
    expect(hs(3, 4, 5) === hs(3, 4, 6)).toBe(false);
    for (let i = 0; i < 50; i++) {
      const v = hs(i, i * 7, 1);
      expect(v >= 0 && v < 1).toBe(true);
    }
  });
  it('orders by footprint centre, then id', () => {
    expect(depthKey(2, 2, 2, 2)).toBe(6);
    const a = { key: depthKey(2, 2, 1, 1), id: 1 };
    const b = { key: depthKey(3, 2, 1, 1), id: 2 };
    const c = { key: depthKey(2, 3, 1, 1), id: 3 };
    expect([c, b, a].sort(compareDepth).map((o) => o.id)).toEqual([1, 2, 3]);
  });
});
```

`tests/render/camera.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import {
  createCamera, clampZoom, tileToScreen, screenToTile, screenToTileIndex, panBy, zoomAt,
  visibleTileRange, visibleChunks, MIN_ZOOM, MAX_ZOOM,
} from '../../src/render/camera.js';

const view = { width: 800, height: 600 };
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

describe('camera', () => {
  it('clamps zoom to 0.5-2', () => {
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
    expect(clampZoom(9)).toBe(MAX_ZOOM);
    expect(createCamera({ zoom: 3 }).zoom).toBe(2);
  });
  it('puts the camera tile at the centre of the view', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    expect(tileToScreen(cam, view, 32, 32)).toEqual([400, 300]);
    const [sx, sy] = tileToScreen(cam, view, 33, 32);
    expect(sx).toBe(432);
    expect(sy).toBe(316);
  });
  it('round-trips screen to tile and back at every zoom', () => {
    for (const zoom of [0.5, 1, 1.37, 2]) {
      const cam = createCamera({ x: 10.5, y: 20.25, zoom });
      for (const [sx, sy] of [[0, 0], [400, 300], [799, 599], [123, 456]]) {
        const t = screenToTile(cam, view, sx, sy);
        const [bx, by] = tileToScreen(cam, view, t.x, t.y);
        expect(close(bx, sx) && close(by, sy)).toBe(true);
      }
    }
  });
  it('floors to a tile index', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const [sx, sy] = tileToScreen(cam, view, 32.5, 32.5);
    expect(screenToTileIndex(cam, view, sx, sy)).toEqual({ x: 32, y: 32 });
  });
  it('pans by screen pixels', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const before = screenToTile(cam, view, 400, 300);
    panBy(cam, 64, 0);
    const after = screenToTile(cam, view, 464, 300);
    expect(close(after.x, before.x) && close(after.y, before.y)).toBe(true);
  });
  it('zooms around the cursor', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const before = screenToTile(cam, view, 100, 100);
    zoomAt(cam, view, 1.5, 100, 100);
    expect(cam.zoom).toBe(1.5);
    const after = screenToTile(cam, view, 100, 100);
    expect(close(after.x, before.x) && close(after.y, before.y)).toBe(true);
    zoomAt(cam, view, 10, 100, 100);
    expect(cam.zoom).toBe(MAX_ZOOM);
  });
  it('culls to the tiles on screen, with room for tall buildings', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const r = visibleTileRange(cam, view, 64);
    expect(r.x0 <= 32 && 32 <= r.x1 && r.y0 <= 32 && 32 <= r.y1).toBe(true);
    expect(r.x0 > 5 && r.y0 > 5).toBe(true);
    expect(r.x1 - r.x0).toBeLessThan(40);
    const edge = visibleTileRange(createCamera({ x: 0, y: 0, zoom: 0.5 }), view, 64);
    expect(edge.x0).toBe(0);
    expect(edge.y0).toBe(0);
  });
  it('lists the chunks a range touches', () => {
    expect(visibleChunks({ x0: 0, y0: 0, x1: 15, y1: 15 })).toEqual([{ cx: 0, cy: 0 }]);
    expect(visibleChunks({ x0: 10, y0: 14, x1: 20, y1: 17 })).toEqual([
      { cx: 0, cy: 0 }, { cx: 1, cy: 0 }, { cx: 0, cy: 1 }, { cx: 1, cy: 1 },
    ]);
  });
});
```

Append to `tests/all.js`:
```js
import './render/iso.test.js';
import './render/camera.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "iso"`
Expected: `LOAD ERROR` naming `src/render/iso.js`.

- [ ] **Step 3: Write iso.js**

`src/render/iso.js`:
```js
// Isometric projection in "art pixels": the unit the approved mock-ups were drawn in, where a tile is
// 32 px wide and 16 px tall. The game draws at ART_SCALE times this, so a tile is 64 CSS px at zoom 1.
export const ART_SCALE = 2;
export const ART_TILE_W = 32;
export const ART_TILE_H = 16;
export const TILE_W = ART_TILE_W * ART_SCALE;
export const TILE_H = ART_TILE_H * ART_SCALE;

export const p = (x, y) => [(x - y) * 16, (x + y) * 8];
export const U = (q, h) => [q[0], q[1] - h];

export function artToTile(ax, ay) {
  return { x: (ax / 16 + ay / 8) / 2, y: (ay / 8 - ax / 16) / 2 };
}

export const tileDiamond = (x, y) => [p(x, y), p(x + 1, y), p(x + 1, y + 1), p(x, y + 1)];
export const quad = (x, y, w, d, z) => [U(p(x, y), z), U(p(x + w, y), z), U(p(x + w, y + d), z), U(p(x, y + d), z)];
export const dia = (cx, cy, r) => [p(cx, cy - r), p(cx + r, cy), p(cx, cy + r), p(cx - r, cy)];

// The mock-ups' sine hash: cheap, deterministic, good enough for scattering pebbles and tufts.
export function hs(x, y, k) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

export const depthKey = (x, y, w, d) => x + w / 2 + y + d / 2;
export const compareDepth = (a, b) => a.key - b.key || a.id - b.id;
```

- [ ] **Step 4: Write camera.js**

`src/render/camera.js`:
```js
import { ART_SCALE, p, artToTile } from './iso.js';

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const CHUNK = 16;

export const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

// x, y: the tile coordinates (fractional) shown at the centre of the view.
export function createCamera({ x = 0, y = 0, zoom = 1 } = {}) {
  return { x, y, zoom: clampZoom(zoom) };
}

export const pxPerArt = (cam) => ART_SCALE * cam.zoom;

export function artToScreen(cam, view, ax, ay) {
  const c = p(cam.x, cam.y);
  const k = pxPerArt(cam);
  return [view.width / 2 + (ax - c[0]) * k, view.height / 2 + (ay - c[1]) * k];
}

export function tileToScreen(cam, view, x, y) {
  const q = p(x, y);
  return artToScreen(cam, view, q[0], q[1]);
}

export function screenToArt(cam, view, sx, sy) {
  const c = p(cam.x, cam.y);
  const k = pxPerArt(cam);
  return [c[0] + (sx - view.width / 2) / k, c[1] + (sy - view.height / 2) / k];
}

export function screenToTile(cam, view, sx, sy) {
  const [ax, ay] = screenToArt(cam, view, sx, sy);
  return artToTile(ax, ay);
}

export function screenToTileIndex(cam, view, sx, sy) {
  const t = screenToTile(cam, view, sx, sy);
  return { x: Math.floor(t.x), y: Math.floor(t.y) };
}

export function panBy(cam, dxPx, dyPx) {
  const k = pxPerArt(cam);
  const t = artToTile(dxPx / k, dyPx / k); // the projection is linear, so a delta converts the same way
  cam.x -= t.x;
  cam.y -= t.y;
  return cam;
}

export function zoomAt(cam, view, factor, sx, sy) {
  const before = screenToTile(cam, view, sx, sy);
  cam.zoom = clampZoom(cam.zoom * factor);
  const after = screenToTile(cam, view, sx, sy);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
  return cam;
}

// Inclusive tile bounds that cover the view. Tall buildings rise towards smaller x + y on screen, so
// footprints just past the bottom edge can still show: `bottom` pads +x and +y further than the rest.
export function visibleTileRange(cam, view, size, pad = { side: 1, top: 1, bottom: 4 }) {
  const corners = [[0, 0], [view.width, 0], [0, view.height], [view.width, view.height]]
    .map(([sx, sy]) => screenToTile(cam, view, sx, sy));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of corners) {
    x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y);
    x1 = Math.max(x1, t.x); y1 = Math.max(y1, t.y);
  }
  const last = size - 1;
  return {
    x0: Math.max(0, Math.floor(x0) - pad.side - pad.top),
    y0: Math.max(0, Math.floor(y0) - pad.side - pad.top),
    x1: Math.min(last, Math.ceil(x1) + pad.side + pad.bottom),
    y1: Math.min(last, Math.ceil(y1) + pad.side + pad.bottom),
  };
}

export function visibleChunks(range) {
  const out = [];
  for (let cy = Math.floor(range.y0 / CHUNK); cy <= Math.floor(range.y1 / CHUNK); cy++) {
    for (let cx = Math.floor(range.x0 / CHUNK); cx <= Math.floor(range.x1 / CHUNK); cx++) out.push({ cx, cy });
  }
  return out;
}
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `iso` and `camera` groups PASS, then `ALL PASSED`.

- [ ] **Step 6: Commit**

```powershell
git add src/render/iso.js src/render/camera.js tests/render/iso.test.js tests/render/camera.test.js tests/all.js
git commit -m "Add isometric projection maths and the camera`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Palette and the shared drawing helper

**Files:**
- Create: `src/render/art/palette.js`, `src/render/art/ctx.js`
- Create: `tests/helpers/canvas.js`
- Test: `tests/render/ctx.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: nothing.
- Produces (`palette.js`): every colour constant the mock-ups use, by the same names: face palettes `WASH`, `WASH2`, `MUD`, `MUD2`, `STONE`, `SST`, `ROCK`, `GOLDC`, `LIME`, `THATCH` (three entries each: top, lit, shaded); accents `TEAL`, `TEAL_DARK`, `BLUE`, `RED`, `RED_DARK`, `GOLD`, `PINK`, `ORANGE`, `GREEN`, `GREEN_DARK`, `PURP`, `WOOD`, `LEAF`, `LEAF2`, `LEAF3`; line colours `OUTLINE`, `SHADOW`, `INK`, `WINDOW`, `DOOR`, `PARAPET`, `POT`, `POT_LIGHT`, `TRUNK`, `TRUNK_RING`; the `TERRAIN` object and the `UI` object (overlay hues and placement states).
- Produces (`ctx.js`): `makeDraw(ctx, scale) → g`, where coordinates are art px and `scale` is device px per art px. `g` has:
  - `g.ctx`, `g.scale`;
  - `g.poly(pts, fill, o)`, `g.circ(q, r, fill, o)`, `g.ell(q, rx, ry, fill, o)`, `g.path(segs, fill, o)` where `o` is `{ alpha, outline, stroke, strokeWidth, strokeAlpha }` (`outline: true` is the mock-up's `OL`: `#5A4A6A` at 32%, 0.6 px, round joins; `fill` may be `'none'`);
  - `g.line(a, b, color, width = 1, alpha = 1)` with round caps; `g.stroke(segs, color, width, alpha)` strokes a path;
  - `segs` is an array of `['M', q]`, `['L', q]`, `['Q', ctrl, q]` or `['Z']`;
  - `g.faceGrad(pts)` fills a polygon with the face gradient (white 14% at its top, clear at 55%, `#3A2E5A` 16% at its bottom);
  - `g.radial(q, rx, ry, color, alpha = 1)` a soft ellipse, solid to 60% of its radius then fading to clear;
  - `g.dome(c, rx, ryTop, ryBottom, o)` the granary roof shape with its radial highlight;
  - `g.text(q, str, { size = 6, color, align = 'center', weight = '600', alpha = 1 })`;
  - `g.clip(pts)`, `g.save()`, `g.restore()`.
  - Also exported: `rgba(hex, alpha) → 'rgba(r,g,b,a)'`.
- Produces (`tests/helpers/canvas.js`): `makeCanvas(w, h) → canvas`, `pixelAt(canvas, x, y) → [r, g, b, a]`, `canvasHash(canvas) → number` (FNV-1a over all pixel bytes), `nearColour(rgb, hex, tol = 40) → boolean`.

- [ ] **Step 1: Write the test helper and the failing tests**

`tests/helpers/canvas.js`:
```js
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function pixelAt(canvas, x, y) {
  const d = canvas.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data;
  return [d[0], d[1], d[2], d[3]];
}

export function canvasHash(canvas) {
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let h = 2166136261;
  for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619) >>> 0;
  return h;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function nearColour(rgb, hex, tol = 40) {
  const t = hexToRgb(hex);
  return Math.abs(rgb[0] - t[0]) <= tol && Math.abs(rgb[1] - t[1]) <= tol && Math.abs(rgb[2] - t[2]) <= tol;
}
```

`tests/render/ctx.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { makeDraw, rgba } from '../../src/render/art/ctx.js';
import { WASH, TERRAIN, UI } from '../../src/render/art/palette.js';
import { makeCanvas, pixelAt, nearColour } from '../helpers/canvas.js';

const square = [[0, 0], [20, 0], [20, 20], [0, 20]];

describe('draw helper', () => {
  it('fills a polygon in art px scaled to device px', () => {
    const c = makeCanvas(100, 100);
    const g = makeDraw(c.getContext('2d'), 2);
    g.poly(square, '#2F6FA8');
    expect(nearColour(pixelAt(c, 20, 20), '#2F6FA8', 4)).toBe(true);
    expect(pixelAt(c, 60, 60)[3]).toBe(0);
  });
  it('honours fill alpha and the standard outline', () => {
    const c = makeCanvas(60, 60);
    const g = makeDraw(c.getContext('2d'), 1);
    g.poly(square, '#000000', { alpha: 0.5, outline: true });
    const a = pixelAt(c, 10, 10)[3];
    expect(a).toBeGreaterThan(100);
    expect(a).toBeLessThan(160);
    expect(pixelAt(c, 20, 10)[3]).toBeGreaterThan(0);
  });
  it('draws lines, circles, ellipses and quadratic paths', () => {
    const c = makeCanvas(60, 60);
    const g = makeDraw(c.getContext('2d'), 1);
    g.line([0, 30], [60, 30], '#C4473A', 2);
    g.circ([10, 10], 5, '#5E9E4A');
    g.ell([40, 10], 8, 4, '#E2B13C');
    g.path([['M', [0, 50]], ['Q', [30, 40], [60, 50]], ['L', [60, 60]], ['L', [0, 60]], ['Z']], '#7A5AA0');
    expect(nearColour(pixelAt(c, 30, 30), '#C4473A', 30)).toBe(true);
    expect(nearColour(pixelAt(c, 10, 10), '#5E9E4A', 4)).toBe(true);
    expect(nearColour(pixelAt(c, 40, 10), '#E2B13C', 4)).toBe(true);
    expect(nearColour(pixelAt(c, 30, 57), '#7A5AA0', 4)).toBe(true);
  });
  it('shades a face with the gradient and a soft radial blob', () => {
    const c = makeCanvas(60, 60);
    const g = makeDraw(c.getContext('2d'), 1);
    g.poly(square, WASH[1]);
    g.faceGrad(square);
    const top = pixelAt(c, 10, 1), bottom = pixelAt(c, 10, 19);
    expect(top[0] + top[1] + top[2]).toBeGreaterThan(bottom[0] + bottom[1] + bottom[2]);
    g.radial([40, 40], 15, 8, TERRAIN.plot);
    expect(pixelAt(c, 40, 40)[3]).toBe(255);
    expect(pixelAt(c, 54, 40)[3]).toBeLessThan(120);
  });
  it('draws text, domes and clips', () => {
    const c = makeCanvas(80, 80);
    const g = makeDraw(c.getContext('2d'), 2);
    g.text([20, 20], '✓', { size: 12, color: UI.ok });
    let inked = 0;
    for (let x = 20; x < 60; x += 2) for (let y = 20; y < 60; y += 2) if (pixelAt(c, x, y)[3] > 0) inked++;
    expect(inked).toBeGreaterThan(3);
    g.dome([30, 30], 8, 8.5, 4);
    expect(pixelAt(c, 60, 56)[3]).toBe(255);
    g.save();
    g.clip([[0, 0], [10, 0], [10, 10], [0, 10]]);
    g.poly(square, '#000000');
    g.restore();
    expect(pixelAt(c, 30, 30)[3]).toBe(255);
    expect(nearColour(pixelAt(c, 5, 5), '#000000', 4)).toBe(true);
  });
  it('converts hex to rgba', () => {
    expect(rgba('#2F6FA8', 0.5)).toBe('rgba(47,111,168,0.5)');
  });
});
```

Append to `tests/all.js`:
```js
import './render/ctx.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "draw helper"`
Expected: `LOAD ERROR` naming `src/render/art/ctx.js`.

- [ ] **Step 3: Write the palette**

`src/render/art/palette.js`:
```js
// Every colour the art and terrain use, copied from the approved mock-ups. Face palettes are
// [top, lit left face, shaded right face].
export const WASH = ['#FAF5EC', '#EFE6D9', '#C9BCCD'];
export const WASH2 = ['#F6EFE3', '#E9DED0', '#C1B3C6'];
export const MUD = ['#DCB57E', '#CB9F66', '#A08274'];
export const MUD2 = ['#E0BC88', '#CFA670', '#A68A78'];
export const STONE = ['#F4EDDF', '#E7DDCC', '#C3B8C6'];
export const SST = ['#ECD9AC', '#D9C495', '#B0A09E'];
export const ROCK = ['#D3B582', '#B99565', '#8E7470'];
export const GOLDC = ['#F6D46A', '#E2B13C', '#B98A4A'];
export const LIME = ['#F6EFDF', '#EBE1CE', '#CBBFCB'];
export const THATCH = ['#E9CB82', '#D8B366', '#AC9070'];

export const TEAL = '#2E8C83';
export const TEAL_DARK = '#22685F';
export const BLUE = '#2F6FA8';
export const RED = '#C4473A';
export const RED_DARK = '#9A3A30';
export const GOLD = '#E2B13C';
export const PINK = '#D9667A';
export const ORANGE = '#E07B39';
export const GREEN = '#5E9E4A';
export const GREEN_DARK = '#3E7A36';
export const PURP = '#7A5AA0';
export const WOOD = '#6B4A3A';
export const LEAF = '#4F8A2E';
export const LEAF2 = '#6AA83A';
export const LEAF3 = '#3F7526';

export const OUTLINE = '#5A4A6A';   // 32% opacity, 0.6 px, where a face meets another
export const SHADOW = '#3E3260';    // ground shadows, two layers at 12% and 8%
export const INK = '#3A2E5A';       // the dark line where a wall meets the ground
export const WINDOW = '#4A3C4E';
export const DOOR = '#3E3040';
export const PARAPET = '#ECE2D2';
export const POT = '#C9552F';
export const POT_LIGHT = '#F6B48A';
export const TRUNK = '#9A7448';
export const TRUNK_RING = '#6E5236';

export const TERRAIN = {
  sand: '#EBD6A8', sandOff: '#DCC594',
  blotches: ['#E2C995', '#F1E0B8', '#E6CFA0', '#F4E6C4', '#DDC28C'],
  dotLight: '#F8ECCF', dotDark: '#D4B987',
  grass: '#8FB64C', grassAlt: '#86AE45', grassSoft: '#C9C27E', grassSecond: '#7EA846',
  fertile: '#D9BE86', fertileSecond: '#CBAE74', fertileSoft: '#E6D2A0',
  bank: '#B9A978', bankSecond: '#C9B98A', mud: '#7A5E40', mudDark: '#5E4630',
  rocky: '#D3B582', rockySecond: '#C4A574', rockySoft: '#E0C898', pebble: '#B39C82', pebbleLight: '#D9C7A8',
  water: '#2E8C96', waterDeep: '#1E6A7C', waterLight: '#86CBC4', foam: '#DDF4F1', ripple: '#B8E6E2',
  road: '#DCC08C', roadEdge: '#C2A274', roadPebble: '#B39466', roadPebbleLight: '#F2E2BC',
  plot: '#F2DFB5', field: '#7FAA45', fieldEdge: '#6A5A40', grid: '#3E3260',
};

export const UI = {
  ok: '#2F6FA8', warn: '#E0A030', bad: '#E2604C', label: '#3B2A14', halo: '#FFFFFF',
  water: '#2F6FA8', food: '#E2B13C', religion: '#7A5AA0', housing: '#2E8C83',
};
```

- [ ] **Step 4: Write the drawing helper**

`src/render/art/ctx.js`:
```js
import { OUTLINE } from './palette.js';

export function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Wraps a Canvas 2D context so the art code can draw in art px (a tile is 32 x 16). `scale` is device px
// per art px. The options object mirrors the SVG mock-ups' extras: { alpha } is fill-opacity,
// { outline: true } is their standard thin outline, { stroke, strokeWidth, strokeAlpha } a custom stroke.
export function makeDraw(ctx, scale) {
  const s = (v) => v * scale;

  function trace(pts) {
    ctx.beginPath();
    ctx.moveTo(s(pts[0][0]), s(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(s(pts[i][0]), s(pts[i][1]));
    ctx.closePath();
  }

  function tracePath(segs) {
    ctx.beginPath();
    for (const seg of segs) {
      if (seg[0] === 'M') ctx.moveTo(s(seg[1][0]), s(seg[1][1]));
      else if (seg[0] === 'L') ctx.lineTo(s(seg[1][0]), s(seg[1][1]));
      else if (seg[0] === 'Q') ctx.quadraticCurveTo(s(seg[1][0]), s(seg[1][1]), s(seg[2][0]), s(seg[2][1]));
      else if (seg[0] === 'Z') ctx.closePath();
    }
  }

  function fillStroke(fill, o) {
    if (fill && fill !== 'none') {
      ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (o.outline) {
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = s(0.6);
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else if (o.stroke) {
      ctx.globalAlpha = o.strokeAlpha === undefined ? 1 : o.strokeAlpha;
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = s(o.strokeWidth === undefined ? 1 : o.strokeWidth);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const g = {
    ctx,
    scale,
    poly(pts, fill, o = {}) { trace(pts); fillStroke(fill, o); },
    circ(q, r, fill, o = {}) {
      ctx.beginPath();
      ctx.arc(s(q[0]), s(q[1]), s(Math.max(0, r)), 0, Math.PI * 2);
      fillStroke(fill, o);
    },
    ell(q, rx, ry, fill, o = {}) {
      ctx.beginPath();
      ctx.ellipse(s(q[0]), s(q[1]), s(Math.max(0, rx)), s(Math.max(0, ry)), 0, 0, Math.PI * 2);
      fillStroke(fill, o);
    },
    path(segs, fill, o = {}) { tracePath(segs); fillStroke(fill, o); },
    line(a, b, color, width = 1, alpha = 1) {
      ctx.beginPath();
      ctx.moveTo(s(a[0]), s(a[1]));
      ctx.lineTo(s(b[0]), s(b[1]));
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = s(width);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    stroke(segs, color, width = 1, alpha = 1) {
      tracePath(segs);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = s(width);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    // The mock-ups' url(#fg): white 14% at the top of the face, clear at 55%, #3A2E5A 16% at the bottom.
    faceGrad(pts) {
      let top = Infinity, bottom = -Infinity;
      for (const q of pts) { top = Math.min(top, q[1]); bottom = Math.max(bottom, q[1]); }
      if (bottom - top < 1e-6) return;
      const gr = ctx.createLinearGradient(0, s(top), 0, s(bottom));
      gr.addColorStop(0, 'rgba(255,255,255,0.14)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(58,46,90,0.16)');
      trace(pts);
      ctx.fillStyle = gr;
      ctx.fill();
    },
    // A soft ellipse: solid to 60% of its radius, then fading to clear. Replaces the SVG blur filter.
    radial(q, rx, ry, color, alpha = 1) {
      if (rx <= 0 || ry <= 0) return;
      ctx.save();
      ctx.translate(s(q[0]), s(q[1]));
      ctx.scale(s(rx), s(ry));
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, color);
      gr.addColorStop(0.6, color);
      gr.addColorStop(1, rgba(color, 0));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    // The granary roof: a tall half-ellipse cap on a flatter half-ellipse base, lit from the upper left.
    dome(c, rx, ryTop, ryBottom, o = {}) {
      ctx.beginPath();
      ctx.ellipse(s(c[0]), s(c[1]), s(rx), s(ryTop), 0, Math.PI, Math.PI * 2);
      ctx.ellipse(s(c[0]), s(c[1]), s(rx), s(ryBottom), 0, 0, Math.PI);
      ctx.closePath();
      const gr = ctx.createRadialGradient(s(c[0] - rx * 0.3), s(c[1] - ryTop * 0.4), 0, s(c[0]), s(c[1]), s(rx * 1.7));
      gr.addColorStop(0, '#FFFAEE');
      gr.addColorStop(1, '#CDBFC4');
      fillStroke(gr, o);
    },
    text(q, str, { size = 6, color = '#3B2A14', align = 'center', weight = '600', alpha = 1 } = {}) {
      ctx.font = `${weight} ${s(size)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillText(str, s(q[0]), s(q[1]));
      ctx.globalAlpha = 1;
    },
    clip(pts) { trace(pts); ctx.clip(); },
    save() { ctx.save(); },
    restore() { ctx.restore(); },
  };
  return g;
}
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `draw helper` PASS, then `ALL PASSED`.

- [ ] **Step 6: Commit**

```powershell
git add src/render/art/palette.js src/render/art/ctx.js tests/helpers/canvas.js tests/render/ctx.test.js tests/all.js
git commit -m "Add the art palette and the canvas drawing helper`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Art primitives

**Files:**
- Create: `src/render/art/primitives.js`
- Test: `tests/render/primitives.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `p`, `U`, `quad`, `hs`, `tileDiamond` (Task 2), `makeDraw` and the palette (Task 3).
- Produces: Canvas ports of the mock-up primitives. Every function takes the drawing helper `g` first; the rest of the parameters match the mock-up exactly (tile units for positions and sizes, art px for heights):
  - `tile(g, x, y, c, o)`, `groundShadow(g, x, y, w, d, h)` (both shadow layers at once).
  - `tb(g, x, y, w, d, h, z, i, C, fx) → { L, R }` tapered block; `box(g, x, y, w, d, h, z, C, fx)` is `tb` with `i = 0`. `L(u, s)` and `R(u, s)` map a fraction `u` along the lit (+y) or shaded (+x) face and a height `s` to an art point. `fx === 0` draws plain faces (no outline, gradient or edge lines).
  - `qd(g, F, u0, u1, s0, s1, c, o)` a quad on one face mapper; `crs(g, F, h, c, st = 3)` courses; `door(g, F, u0, u1, h)`; `win(g, S, u0, u1, s0, s1)`; `parapet(g, a, b, w, d, h)`; `mat(g, x, y, w, d, z, c1, c2)`; `rug(g, x, y, w, d, z, c1, c2, c3)`; `pots(g, q, n)`; `fence(g, x, y, w, d)`; `stairs(g, x, y, len, dep, hT, n, C)`; `ladder(g, a, b)`; `post(g, gx, gy, z, h)`; `awn(g, x, y, w, d, z, c1, c2, st)`; `col(g, gx, gy, h, z, cap)`; `bed(g, x, y, w, d)`; `pool(g, x, y, w, d)`; `statue(g, gx, gy)`.
  - Re-exports `p`, `U`, `quad`, `hs` so art files import geometry from one place.

- [ ] **Step 1: Write the failing tests**

`tests/render/primitives.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { WASH, WASH2, MUD, STONE, BLUE, GOLD, RED, PINK, TEAL, TEAL_DARK } from '../../src/render/art/palette.js';
import {
  tb, box, qd, crs, door, win, parapet, mat, rug, pots, fence, stairs, ladder, post, awn, col, bed, pool, statue,
  groundShadow, tile, p, U,
} from '../../src/render/art/primitives.js';
import { makeCanvas, pixelAt } from '../helpers/canvas.js';

// A 200 x 200 canvas at scale 2 with the art origin in the middle, so tile (0, 0) sits around (100, 100).
function scene() {
  const c = makeCanvas(200, 200);
  const ctx = c.getContext('2d');
  ctx.translate(100, 100);
  return { c, g: makeDraw(ctx, 2) };
}

const inked = (c, x0, y0, x1, y1) => {
  let n = 0;
  for (let x = x0; x < x1; x += 2) for (let y = y0; y < y1; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('art primitives', () => {
  it('maps block faces like the mock-up', () => {
    const { g } = scene();
    const F = tb(g, 0, 0, 1, 1, 10, 0, 0, WASH);
    expect(F.L(0, 0)).toEqual(U(p(0, 1), 0));
    expect(F.L(1, 10)).toEqual(U(p(1, 1), 10));
    expect(F.R(0, 0)).toEqual(U(p(1, 0), 0));
    expect(F.R(1, 0)).toEqual(U(p(1, 1), 0));
    const T = tb(g, 0, 0, 1, 1, 10, 0, 0.25, WASH);
    expect(T.L(0, 10)).toEqual(U(p(0.25, 0.75), 10));
  });
  it('paints a block and leaves the ground outside it clear', () => {
    const { c, g } = scene();
    box(g, 0, 0, 1, 1, 10, 0, WASH);
    expect(pixelAt(c, 100, 96)[3]).toBe(255);    // centre of the top face (art 0, -2)
    expect(pixelAt(c, 100, 120)[3]).toBe(255);   // inside the lit face (art 0, 10)
    expect(pixelAt(c, 20, 20)[3]).toBe(0);
  });
  it('lays two shadow layers at 12% and 8%', () => {
    const { c, g } = scene();
    groundShadow(g, 0, 0, 1, 1, 10);
    const a = pixelAt(c, 104, 116)[3];
    expect(a).toBeGreaterThan(20);
    expect(a).toBeLessThan(90);
  });
  it('draws every detail primitive without throwing and with ink', () => {
    const { c, g } = scene();
    const F = box(g, 0, 0, 1, 1, 10, 0, WASH);
    crs(g, F, 10, '#9C7A54', 2.2);
    door(g, F, 0.36, 0.6, 4.4);
    win(g, F.R, 0.3, 0.5, 5, 7);
    qd(g, F.L, 0, 1, 8, 9, TEAL);
    parapet(g, 0, 0, 1, 1, 10);
    mat(g, 0.2, 0.2, 0.4, 0.3, 10, BLUE, GOLD);
    rug(g, 0.3, 0.3, 0.4, 0.3, 10, RED, '#F2D7A8', GOLD);
    pots(g, U(p(0.8, 0.5), 10), 2);
    fence(g, -1, -1, 1, 0.07);
    stairs(g, -1, 0.5, 0.4, 0.13, 8, 5, WASH2);
    ladder(g, U(p(0.6, 0.7), 10), U(p(0.6, 0.6), 16));
    post(g, -1, 1, 0, 5);
    awn(g, 1.1, 0, 0.5, 0.5, 8, TEAL, TEAL_DARK);
    col(g, -0.5, 1.5, 9, 0);
    bed(g, 1, 1, 0.6, 0.3);
    pool(g, 1.5, 1.5, 0.5, 0.3);
    statue(g, -1.5, 1.5);
    tile(g, 2, 2, MUD[0]);
    expect(inked(c, 0, 0, 200, 200)).toBeGreaterThan(400);
  });
  it('draws plain faces when fx is 0', () => {
    const a = scene(), b = scene();
    box(a.g, 0, 0, 1, 1, 10, 0, STONE, 0);
    box(b.g, 0, 0, 1, 1, 10, 0, STONE);
    // With outlines and the gradient the bottom of the lit face is darker than the plain version.
    const pa = pixelAt(a.c, 86, 122), pb = pixelAt(b.c, 86, 122);
    expect(pa[0] + pa[1] + pa[2]).toBeGreaterThan(pb[0] + pb[1] + pb[2]);
    expect(PINK.length).toBe(7);
  });
});
```

The second test's comment says it: the top face of a 1×1 block of height 10 is the diamond `quad(0, 0, 1, 1, 10)`, whose centre is art `(0, 8 - 10) = (0, -2)`, which at scale 2 from the (100, 100) origin is canvas `(100, 96)`; the lit face spans art y 8 to 16 (canvas 116 to 132) at x 0. Both sampled points are inside the block.

Append to `tests/all.js`:
```js
import './render/primitives.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "art primitives"`
Expected: `LOAD ERROR` naming `src/render/art/primitives.js`.

- [ ] **Step 3: Write the primitives (part 1: blocks and faces)**

`src/render/art/primitives.js`:
```js
// Canvas ports of the approved mock-up's drawing primitives. Positions and sizes are in tile units, heights
// in art px. Every function takes the drawing helper `g` (see ctx.js) first; otherwise the parameter lists
// are the mock-up's, so the two can be compared line by line.
import { p, U, quad, hs, tileDiamond } from '../iso.js';
import {
  SHADOW, INK, WINDOW, DOOR, PARAPET, POT, POT_LIGHT, WOOD, STONE, TEAL, TEAL_DARK, GREEN, GREEN_DARK,
  RED, GOLD, PURP, PINK, GOLDC,
} from './palette.js';

export { p, U, quad, hs };

export const tile = (g, x, y, c, o) => g.poly(tileDiamond(x, y), c, o);

// Two soft ground-shadow layers for a block of footprint w x d and height h at tile (x, y), offset to the
// right by h x 0.45 at 12% and h x 0.85 at 8%.
export function groundShadow(g, x, y, w, d, h) {
  const A = p(x, y), B = p(x + w, y), C = p(x + w, y + d), D = p(x, y + d);
  for (const [m, a] of [[0.45, 0.12], [0.85, 0.08]]) {
    const dx = h * m;
    g.poly([A, [A[0] + dx, A[1]], [B[0] + dx, B[1]], [C[0] + dx, C[1]], C, D], SHADOW, { alpha: a });
  }
}

// A tapered block: footprint w x d at (x, y), height h, raised by z, inset i at the top (0 = straight
// sides). C = [top, lit, shaded]. fx === 0 draws plain faces: no outline, gradient or edge lines.
// Returns the face mappers: L(u, s) / R(u, s) give the art point at fraction u along the lit (+y) or
// shaded (+x) face and height s up it. Details (doors, windows, bands) are placed through them.
export function tb(g, x, y, w, d, h, z, i, C, fx) {
  const L = (u, s) => { const k = (i * s) / h; return U(p(x + k + (w - 2 * k) * u, y + d - k), z + s); };
  const R = (u, s) => { const k = (i * s) / h; return U(p(x + w - k, y + k + (d - 2 * k) * u), z + s); };
  const ol = fx !== 0;
  const lf = [L(0, 0), L(1, 0), L(1, h), L(0, h)];
  const rf = [R(0, 0), R(1, 0), R(1, h), R(0, h)];
  g.poly(lf, C[1], { outline: ol });
  if (ol) g.faceGrad(lf);
  g.poly(rf, C[2], { outline: ol });
  if (ol) g.faceGrad(rf);
  if (w - 2 * i > 0.001 && d - 2 * i > 0.001) {
    g.poly([U(p(x + i, y + i), z + h), U(p(x + w - i, y + i), z + h), U(p(x + w - i, y + d - i), z + h), U(p(x + i, y + d - i), z + h)], C[0], { outline: ol });
  }
  if (ol) {
    if (z === 0) {
      g.line(L(0, 0), L(1, 0), INK, 1.1, 0.25);
      g.line(R(0, 0), R(1, 0), INK, 1.1, 0.25);
    }
    g.line(L(0, h), L(1, h), '#FFFFFF', 0.7, 0.6);
    g.line(R(0, h), R(1, h), '#FFFFFF', 0.6, 0.3);
  }
  return { L, R };
}

export const box = (g, x, y, w, d, h, z, C, fx) => tb(g, x, y, w, d, h, z, 0, C, fx);

export const qd = (g, F, u0, u1, s0, s1, c, o) => g.poly([F(u0, s0), F(u1, s0), F(u1, s1), F(u0, s1)], c, o);

// Horizontal mud-brick courses on both faces.
export function crs(g, F, h, c, st = 3) {
  for (let s = st; s < h - 0.5; s += st) {
    g.line(F.L(0, s), F.L(1, s), c, 0.45, 0.3);
    g.line(F.R(0, s), F.R(1, s), c, 0.45, 0.3);
  }
}

export function door(g, F, u0, u1, h) {
  qd(g, F.L, u0 - 0.05, u1 + 0.05, h, h + 1, '#FFFFFF', { alpha: 0.6 });
  qd(g, F.L, u0, u1, 0, h, DOOR);
}

export function win(g, S, u0, u1, s0, s1) {
  qd(g, S, u0, u1, s0, s1, WINDOW);
  g.line(S(u0 - 0.02, s0), S(u1 + 0.02, s0), '#FFFFFF', 0.6, 0.7);
}

export const parapet = (g, a, b, w, d, h) => g.poly(quad(a + 0.06, b + 0.06, w - 0.12, d - 0.12, h), PARAPET);

export function mat(g, x, y, w, d, z, c1, c2) {
  g.poly(quad(x, y, w, d, z), c1);
  if (c2) g.poly(quad(x + w * 0.3, y + d * 0.3, w * 0.4, d * 0.4, z), c2);
}

export function rug(g, x, y, w, d, z, c1, c2, c3) {
  g.poly(quad(x, y, w, d, z), c1, { stroke: c2, strokeWidth: 0.8 });
  for (const [v, c] of [[0.3, c2], [0.5, c3], [0.7, c2]]) {
    g.line(U(p(x + 0.04, y + d * v), z), U(p(x + w - 0.04, y + d * v), z), c, 0.8);
  }
}

export function pots(g, q, n) {
  for (let i = 0; i < n; i++) {
    const c = [q[0] + i * 2.8 - (n - 1) * 1.4, q[1] + (i % 2) * 0.8];
    g.ell(U(c, 1.5), 1.6, 1.6, POT, { outline: true });
    g.ell(U([c[0] - 0.5, c[1]], 2.1), 0.45, 0.55, POT_LIGHT, { alpha: 0.75 });
  }
}
```

- [ ] **Step 4: Write the primitives (part 2: fittings and garden pieces)**

Append to `src/render/art/primitives.js`:
```js
export function fence(g, x, y, w, d) {
  const F = box(g, x, y, w, d, 3, 0, ['#DDB872', '#CCA463', '#A48474'], 0);
  for (let u = 0.06; u < 1; u += 0.1) {
    g.line(F.L(u, 0), F.L(u, 3), '#9C7A3A', 0.35);
    g.line(F.R(u, 0), F.R(u, 3), '#8A6A4A', 0.35);
  }
}

export function stairs(g, x, y, len, dep, hT, n, C) {
  for (let i = 0; i < n; i++) box(g, x + (i * len) / n, y, len / n, dep, (hT * (i + 1)) / n, 0, C, 0);
}

export function ladder(g, a, b) {
  g.line([a[0] - 1.1, a[1]], [b[0] - 1.1, b[1]], WOOD, 0.6);
  g.line([a[0] + 1.1, a[1]], [b[0] + 1.1, b[1]], WOOD, 0.6);
  const n = Math.max(2, Math.floor(Math.abs(a[1] - b[1]) / 2));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    g.line([a[0] - 1.1 + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], [a[0] + 1.1 + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], WOOD, 0.45);
  }
}

export function post(g, gx, gy, z, h) {
  const q = U(p(gx, gy), z);
  g.line(q, U(q, h), WOOD, 0.7);
}

// A striped reed awning on three posts; st is the stripe colour.
export function awn(g, x, y, w, d, z, c1, c2, st) {
  for (const [a, b] of [[x + 0.04, y + d - 0.04], [x + w - 0.04, y + d - 0.04], [x + w - 0.04, y + 0.04]]) post(g, a, b, z - 4.2, 4.2);
  const A = tb(g, x, y, w, d, 1.2, z, 0.05, [c1, c2, c2], 0);
  const stripe = st || '#F6ECD6';
  for (let u = 0.1; u < 0.95; u += 0.25) {
    qd(g, A.L, u, u + 0.12, 0, 1.2, stripe, { alpha: 0.85 });
    qd(g, A.R, u, u + 0.12, 0, 1.2, stripe, { alpha: 0.6 });
  }
  g.poly(quad(x + 0.05, y + 0.05, w - 0.1, d - 0.1, z + 1.2), stripe, { alpha: 0.25 });
}

// A painted column with teal bands and a leafy capital.
export function col(g, gx, gy, h, z, cap) {
  const F = box(g, gx - 0.05, gy - 0.05, 0.1, 0.1, h, z, STONE, 0);
  for (const [a, b] of [[h * 0.25, h * 0.32], [h - 2.4, h - 1.7]]) {
    qd(g, F.L, 0, 1, a, b, TEAL);
    qd(g, F.R, 0, 1, a, b, TEAL_DARK);
  }
  tb(g, gx - 0.06, gy - 0.06, 0.12, 0.12, 1.6, z + h, -0.035, cap || ['#8FC07A', GREEN, GREEN_DARK], 0);
}

export function bed(g, x, y, w, d) {
  g.poly(quad(x, y, w, d, 0), '#6FA243', { stroke: '#C9B48A', strokeWidth: 1.1 });
  const flowers = [RED, GOLD, '#FFFFFF', PURP, PINK];
  for (let i = 0; i < 7; i++) {
    const q = p(x + w * (0.15 + 0.7 * hs(x, i, 1)), y + d * (0.15 + 0.7 * hs(y, i, 2)));
    g.circ(U(q, 1.4), 1.6, '#4F8A2E');
    g.circ(U(q, 2.5), 0.75, flowers[i % 5]);
  }
}

export function pool(g, x, y, w, d) {
  g.poly(quad(x - 0.05, y - 0.05, w + 0.1, d + 0.1, 0), '#F2E6CC');
  g.poly(quad(x, y, w, d, 0), '#4FB3B5');
  g.poly(quad(x + 0.04, y + 0.04, w - 0.08, d * 0.35, 0), '#7FD0CC', { alpha: 0.6 });
  g.line(p(x + w * 0.25, y + d * 0.6), p(x + w * 0.6, y + d * 0.6), '#D7F0EE', 0.7);
}

export function statue(g, gx, gy) {
  box(g, gx - 0.09, gy - 0.09, 0.18, 0.18, 3.2, 0, STONE, 0);
  box(g, gx - 0.035, gy - 0.035, 0.07, 0.07, 5.5, 3.2, GOLDC, 0);
  g.circ(U(p(gx, gy), 9.8), 1.15, GOLD);
}
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `art primitives` PASS, then `ALL PASSED`. If the "paints a block" pixel checks fail, print `pixelAt(c, 100, 96)` and `pixelAt(c, 100, 120)` and confirm the canvas was translated by (100, 100) before `makeDraw`; the geometry in the test is derived from `quad(0, 0, 1, 1, 10)`.

- [ ] **Step 6: Commit**

```powershell
git add src/render/art/primitives.js tests/render/primitives.test.js tests/all.js
git commit -m "Port the art primitives to canvas`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Houses H1–H4 and the art registry

**Files:**
- Create: `src/render/art/housing.js`, `src/render/art/registry.js`
- Modify: `src/render/iso.js` (add `boundsFor`)
- Test: `tests/render/housingArt.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: the primitives (Task 4), the palette (Task 3).
- Produces (`housing.js`): `H1(g, x, y)`, `H2`, `H3`, `H4`, each drawing a 1×1 house whose footprint origin is tile `(x, y)`, and `HOUSE_ART`, a map of slot → entry for `house.t1` … `house.t4`.
- Produces (`registry.js`):
  - An **entry** is `{ w, d, height, bounds, shadows, draw }`: footprint in tiles, `height` in art px (tallest point above the ground), `bounds` as `[left, top, right, bottom]` in art px relative to `p(x, y)` of the footprint origin, `shadows` as a list of `[dx, dy, w, d, h]` ground-shadow blocks relative to the origin tile, and `draw(g, x, y)`. A missing `draw` (an empty plot) means nothing is drawn.
  - `boundsFor(w, d, height, m = 8) → [-16 * d - m, -height - m, 16 * w + m, 8 * (w + d) + m]`. It lives in `iso.js` (so art files can import it without a cycle) and is re-exported by `registry.js`.
  - `ART`: every slot. In this task it holds the four houses; Tasks 6–8 add services, nature and figures by spreading their maps into it.
  - `slotFor(b) → string`: `house.t<tier>` for a house, else `b.type`.

- [ ] **Step 1: Write the failing tests**

`tests/render/housingArt.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { H1, H2, H3, H4, HOUSE_ART } from '../../src/render/art/housing.js';
import { ART, boundsFor, slotFor } from '../../src/render/art/registry.js';
import { groundShadow } from '../../src/render/art/primitives.js';
import { makeCanvas, pixelAt, canvasHash } from '../helpers/canvas.js';

function drawAlone(fn) {
  const c = makeCanvas(240, 200);
  const ctx = c.getContext('2d');
  ctx.translate(120, 80);
  fn(makeDraw(ctx, 2), 0, 0);
  return c;
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 3) for (let y = 0; y < c.height; y += 3) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('house art', () => {
  it('draws each tier with ink and a different look', () => {
    const hashes = new Set();
    for (const fn of [H1, H2, H3, H4]) {
      const c = drawAlone(fn);
      expect(inked(c)).toBeGreaterThan(150);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(4);
  });
  it('grows taller up the ladder', () => {
    expect(HOUSE_ART['house.t1'].height).toBeLessThan(HOUSE_ART['house.t3'].height);
    expect(HOUSE_ART['house.t3'].height).toBeLessThan(HOUSE_ART['house.t4'].height);
  });
  it('registers the four tiers with footprints, bounds and shadows', () => {
    for (const t of [1, 2, 3, 4]) {
      const e = ART[`house.t${t}`];
      expect(e.w).toBe(1);
      expect(e.d).toBe(1);
      expect(e.bounds.length).toBe(4);
      expect(e.bounds[1]).toBeLessThan(0);
      expect(e.shadows.length).toBeGreaterThan(0);
      for (const s of e.shadows) expect(s.length).toBe(5);
      expect(typeof e.draw).toBe('function');
    }
    expect(ART['house.t0']).toBe(undefined);
  });
  it('draws its shadows inside the footprint area', () => {
    const c = drawAlone((g) => { for (const [dx, dy, w, d, h] of HOUSE_ART['house.t4'].shadows) groundShadow(g, dx, dy, w, d, h); });
    expect(inked(c)).toBeGreaterThan(20);
  });
  it('computes bounds that contain a 1x1 footprint of the given height', () => {
    expect(boundsFor(1, 1, 14)).toEqual([-24, -22, 24, 24]);
    expect(boundsFor(2, 2, 20, 10)).toEqual([-42, -30, 42, 42]);
  });
  it('names slots by tier for houses and by type otherwise', () => {
    expect(slotFor({ type: 'house', tier: 3 })).toBe('house.t3');
    expect(slotFor({ type: 'well' })).toBe('well');
  });
});
```

Append to `tests/all.js`:
```js
import './render/housingArt.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "house art"`
Expected: `LOAD ERROR` naming `src/render/art/housing.js`.

- [ ] **Step 3: Write boundsFor and the registry**

Append to `src/render/iso.js`:
```js
// Art px bounds [left, top, right, bottom] of a sprite whose footprint origin sits at p(0, 0).
export function boundsFor(w, d, height, m = 8) {
  return [-16 * d - m, -height - m, 16 * w + m, 8 * (w + d) + m];
}
```

`src/render/art/registry.js`:
```js
// Every art slot the renderer and sprite cache can draw. An entry is
//   { w, d, height, bounds: [left, top, right, bottom], shadows: [[dx, dy, w, d, h], ...], draw(g, x, y) }
// with the footprint in tiles, height and bounds in art px relative to p(x, y) of the footprint origin,
// and shadows as ground-shadow blocks relative to the origin tile. A slot can later point at a PNG by
// replacing `draw` with `png: { src, ax, ay, scale }` (see spriteCache.js); nothing else changes.
import { HOUSE_ART } from './housing.js';

export { boundsFor } from '../iso.js';

export const ART = { ...HOUSE_ART };

export const slotFor = (b) => (b.type === 'house' ? `house.t${b.tier}` : b.type);
```

- [ ] **Step 4: Write the houses**

`src/render/art/housing.js`:
```js
// Housing tiers 1-4, ported line for line from the approved mock-up (v4-new-era-style.html, H1-H4).
// Tiers 5-9 arrive in Stage 2 and follow the same pattern.
import { box, tb, qd, crs, door, win, parapet, mat, pots, fence, stairs, awn, p, U } from './primitives.js';
import { MUD, MUD2, WASH, WASH2, THATCH, BLUE, GOLD, RED, PINK, GREEN, GREEN_DARK, TEAL } from './palette.js';
import { boundsFor } from '../iso.js';

// Hut: a mud-brick cube with a tall thatched roof, a woven door, a reed fence and a pot.
export function H1(g, x, y) {
  const a = x + 0.22, b = y + 0.22, w = 0.56;
  const F = box(g, a, b, w, w, 5.5, 0, MUD);
  crs(g, F, 5.5, '#9C7A54', 2.2);
  qd(g, F.L, 0.36, 0.62, 0, 3.8, '#4A3218');
  for (let u = 0.39; u < 0.6; u += 0.055) g.line(F.L(u, 0), F.L(u, 3.8), '#B08C50', 0.4, 0.8);
  const R = tb(g, a - 0.07, b - 0.07, w + 0.14, w + 0.14, 5.5, 5.5, 0.36, THATCH);
  for (let u = 0.08; u < 0.95; u += 0.14) {
    g.line(R.L(u, 0), R.L(0.5 + (u - 0.5) * 0.25, 4.8), '#AC8840', 0.4, 0.7);
    g.line(R.R(u, 0), R.R(0.5 + (u - 0.5) * 0.25, 4.8), '#8E7058', 0.4, 0.7);
  }
  fence(g, x + 0.06, y + 0.86, 0.6, 0.07);
  pots(g, p(x + 0.86, y + 0.6), 1);
}

// Shack: a taller mud block with a door, a window, a beamed flat roof and a pink mat.
export function H2(g, x, y) {
  const a = x + 0.14, b = y + 0.14, w = 0.66;
  const F = box(g, a, b, w, w, 7, 0, MUD2);
  crs(g, F, 7, '#9C7A54', 2.3);
  door(g, F, 0.36, 0.6, 4.4);
  win(g, F.R, 0.35, 0.55, 3.5, 5.2);
  box(g, a - 0.03, b - 0.03, w + 0.06, w + 0.06, 0.8, 7, ['#D8BC84', '#BEA064', '#A08878'], 0);
  for (let u = 0.12; u < 1; u += 0.16) g.line(U(p(a + u * w, b), 7.8), U(p(a + u * w, b + w), 7.8), '#B49660', 0.5, 0.8);
  mat(g, a + 0.12, b + 0.15, 0.3, 0.3, 7.85, PINK, null);
  pots(g, p(x + 0.9, y + 0.5), 2);
}

// Cottage: two whitewashed blocks, a blue-and-gold roof mat, windows and pots by the door.
export function H3(g, x, y) {
  const A = box(g, x + 0.1, y + 0.1, 0.65, 0.6, 9, 0, WASH);
  parapet(g, x + 0.1, y + 0.1, 0.65, 0.6, 9);
  mat(g, x + 0.2, y + 0.18, 0.35, 0.3, 9, BLUE, GOLD);
  win(g, A.R, 0.3, 0.5, 5, 7);
  win(g, A.L, 0.12, 0.28, 5, 7);
  const B = box(g, x + 0.5, y + 0.52, 0.42, 0.4, 6, 0, WASH2);
  parapet(g, x + 0.5, y + 0.52, 0.42, 0.4, 6);
  door(g, B, 0.3, 0.6, 4.4);
  pots(g, U(p(x + 0.74, y + 0.7), 6), 2);
}

// House: a tall block with a green awning on the roof terrace, an outside staircase and a low annexe.
export function H4(g, x, y) {
  const A = box(g, x + 0.08, y + 0.08, 0.62, 0.58, 12, 0, WASH);
  parapet(g, x + 0.08, y + 0.08, 0.62, 0.58, 12);
  win(g, A.R, 0.25, 0.45, 6.5, 9);
  win(g, A.L, 0.12, 0.3, 6.5, 9);
  awn(g, x + 0.12, y + 0.12, 0.48, 0.44, 16.2, GREEN, GREEN_DARK, TEAL);
  stairs(g, x + 0.1, y + 0.66, 0.4, 0.13, 11, 5, WASH2);
  const B = box(g, x + 0.55, y + 0.42, 0.38, 0.5, 7, 0, WASH2);
  parapet(g, x + 0.55, y + 0.42, 0.38, 0.5, 7);
  door(g, B, 0.3, 0.62, 4.6);
  mat(g, x + 0.6, y + 0.48, 0.26, 0.3, 7, GOLD, RED);
  pots(g, U(p(x + 0.86, y + 0.5), 7), 1);
}

// Shadow blocks are the mock-up's shd(...) calls, relative to the footprint origin.
export const HOUSE_ART = {
  'house.t1': { w: 1, d: 1, height: 14, bounds: boundsFor(1, 1, 14), shadows: [[0.22, 0.22, 0.56, 0.56, 9]], draw: H1 },
  'house.t2': { w: 1, d: 1, height: 12, bounds: boundsFor(1, 1, 12), shadows: [[0.14, 0.14, 0.66, 0.66, 10]], draw: H2 },
  'house.t3': { w: 1, d: 1, height: 13, bounds: boundsFor(1, 1, 13), shadows: [[0.1, 0.1, 0.65, 0.6, 12], [0.5, 0.52, 0.42, 0.4, 8]], draw: H3 },
  'house.t4': { w: 1, d: 1, height: 20, bounds: boundsFor(1, 1, 20), shadows: [[0.08, 0.08, 0.62, 0.58, 16], [0.55, 0.42, 0.38, 0.5, 9]], draw: H4 },
};
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `house art` PASS, then `ALL PASSED`.

- [ ] **Step 6: Commit**

```powershell
git add src/render/iso.js src/render/art/housing.js src/render/art/registry.js tests/render/housingArt.test.js tests/all.js
git commit -m "Draw housing tiers 1-4 and start the art registry`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Service buildings: well, grain farm, granary, bazaar, temple

**Files:**
- Create: `src/render/art/services.js`
- Modify: `src/render/art/registry.js`
- Test: `tests/render/servicesArt.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: the primitives (Task 4), the palette (Task 3), `boundsFor` (Task 5).
- Produces (`services.js`):
  - `well(g, x, y)` (1×1), `farmGrain(g, x, y)`, `granary(g, x, y)`, `bazaar(g, x, y)`, `temple(g, x, y)` (all 2×2), each drawing with the footprint origin at tile `(x, y)`.
  - `fieldTile(g, x, y, kind)` with `kind` one of `'grain' | 'barley' | 'flax'` (only grain is used in Stage 1).
  - `pennant(g, q, h, color)`: a small flag on a pole, the service's emblem (spec 5.3).
  - `SERVICE_EMBLEM = { well: BLUE, farm_grain: LEAF2, granary: GREEN, bazaar: RED, temple: GOLD }`, the emblem colours. Stage 1c reuses them for the build-dock icons.
  - `SERVICE_ART`: entries for the slots `well`, `farm_grain`, `granary`, `bazaar`, `temple`.
- Modifies `registry.js` so `ART = { ...HOUSE_ART, ...SERVICE_ART }`.

- [ ] **Step 1: Write the failing tests**

`tests/render/servicesArt.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { well, farmGrain, granary, bazaar, temple, fieldTile, SERVICE_ART, SERVICE_EMBLEM } from '../../src/render/art/services.js';
import { ART } from '../../src/render/art/registry.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { TERRAIN } from '../../src/render/art/palette.js';
import { makeCanvas, pixelAt, canvasHash, nearColour } from '../helpers/canvas.js';

function drawAlone(fn, w = 320, h = 260, ox = 160, oy = 110) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.translate(ox, oy);
  fn(makeDraw(ctx, 2), 0, 0);
  return c;
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 3) for (let y = 0; y < c.height; y += 3) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('service art', () => {
  it('draws every Stage 1 service with ink and a different look', () => {
    const hashes = new Set();
    for (const fn of [well, farmGrain, granary, bazaar, temple]) {
      const c = drawAlone(fn);
      expect(inked(c)).toBeGreaterThan(100);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(5);
  });
  it('fills the farm with green field rows', () => {
    const c = drawAlone(farmGrain);
    // art (0, 16) is the centre of the 2x2 footprint -> canvas (160, 142) at scale 2
    const px = pixelAt(c, 160, 142);
    expect(px[1]).toBeGreaterThan(px[0]);
    expect(px[1]).toBeGreaterThan(px[2]);
    const f = drawAlone((g) => fieldTile(g, 0, 0, 'grain'));
    expect(nearColour(pixelAt(f, 160, 126), TERRAIN.field, 60)).toBe(true);
  });
  it('registers every Stage 1 building type with its real footprint', () => {
    for (const type of ['well', 'farm_grain', 'granary', 'bazaar', 'temple']) {
      const e = ART[type];
      expect(e.w).toBe(BUILDINGS[type].w);
      expect(e.d).toBe(BUILDINGS[type].d);
      expect(e.height).toBeGreaterThan(0);
      expect(e.bounds.length).toBe(4);
      expect(e.shadows.length).toBeGreaterThan(0);
      expect(typeof e.draw).toBe('function');
      expect(typeof SERVICE_EMBLEM[type]).toBe('string');
    }
    expect(Object.keys(SERVICE_ART).length).toBe(5);
  });
  it('keeps the temple the tallest and the well the shortest', () => {
    expect(SERVICE_ART.temple.height).toBeGreaterThan(SERVICE_ART.granary.height);
    expect(SERVICE_ART.well.height).toBeLessThan(SERVICE_ART.bazaar.height);
  });
});
```

Append to `tests/all.js`:
```js
import './render/servicesArt.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "service art"`
Expected: `LOAD ERROR` naming `src/render/art/services.js`.

- [ ] **Step 3: Write the services (part 1: field, pennant, well, granary, bazaar)**

`src/render/art/services.js`:
```js
// Stage 1 service buildings, ported from the approved mock-up (well, granary, bazaar, temple, fieldTile).
// The grain farm is new: a fenced 2x2 field of grain rows with a small farmhouse in the near corner.
// Each service carries a small pennant in its emblem colour (spec 5.3) so it reads at phone zoom.
import { box, tb, qd, crs, door, fence, pots, awn, col, tile, p, U, quad, hs } from './primitives.js';
import {
  WASH, WASH2, MUD2, STONE, THATCH, TEAL, TEAL_DARK, BLUE, RED, GOLD, PINK, GREEN, GREEN_DARK, LEAF2, WOOD, DOOR,
  TERRAIN,
} from './palette.js';
import { boundsFor } from '../iso.js';

export const SERVICE_EMBLEM = { well: BLUE, farm_grain: LEAF2, granary: GREEN, bazaar: RED, temple: GOLD };

export function pennant(g, q, h, color) {
  g.line(q, U(q, h), WOOD, 0.7);
  g.poly([U(q, h), [q[0] + 6, q[1] - h + 1.5], U(q, h - 3)], color);
}

// A field tile: crop colour with straight rows of stalks. Only 'grain' is used in Stage 1.
export function fieldTile(g, x, y, k) {
  tile(g, x, y, { grain: TERRAIN.field, barley: '#D7BF62', flax: '#80AA52' }[k], { stroke: TERRAIN.fieldEdge, strokeWidth: 0.6, strokeAlpha: 0.35 });
  for (let v = 0.14; v < 0.95; v += 0.18) {
    for (let u = 0.08; u < 0.98; u += 0.11) {
      const q = p(x + u, y + v), hh = 2.2 + hs(x * 7 + u, y * 3 + v, 1) * 1.2;
      if (k === 'grain') {
        g.line(q, [q[0] - 0.3, q[1] - hh], '#4F7A2C', 0.7);
        g.line(q, [q[0] + 0.6, q[1] - hh * 0.8], '#A6CC5E', 0.6);
      } else if (k === 'barley') {
        g.line(q, [q[0] + 0.2, q[1] - hh], '#A88E3A', 0.7);
        g.circ([q[0] + 0.2, q[1] - hh], 0.55, '#F2DE90');
      } else {
        g.line(q, [q[0], q[1] - hh], '#4F7A2C', 0.6);
        if (hs(x + u, y + v, 4) > 0.45) g.circ([q[0], q[1] - hh], 0.6, '#8DB8EE');
      }
    }
  }
}

// Well: a stone drum of water with a wooden frame, a rope and a bucket, and a blue pennant.
export function well(g, x, y) {
  const gx = x + 0.5, gy = y + 0.5;
  const F = box(g, gx - 0.22, gy - 0.22, 0.44, 0.44, 4, 0, STONE);
  crs(g, F, 4, '#A89AA8', 1.6);
  g.poly(quad(gx - 0.15, gy - 0.15, 0.3, 0.3, 4), TERRAIN.water);
  const a = U(p(gx - 0.2, gy), 4), b = U(p(gx + 0.2, gy), 4);
  g.line(a, U(a, 8), WOOD, 0.9);
  g.line(b, U(b, 8), WOOD, 0.9);
  g.line(U(a, 8), U(b, 8), WOOD, 0.9);
  const m = U(p(gx, gy), 12);
  g.line(m, U(m, 4.6), '#8C7B5C', 0.4);
  g.ell(U(p(gx, gy), 6.8), 1, 1.2, '#7A5530');
  pennant(g, U(b, 8), 6, SERVICE_EMBLEM.well);
}

// Granary: a whitewashed block with a teal band, four domed silos and grain sacks by the door.
export function granary(g, X, Y) {
  const F = box(g, X + 0.1, Y + 0.1, 1.8, 1.8, 9, 0, WASH);
  door(g, F, 0.42, 0.58, 6);
  qd(g, F.L, 0, 1, 7.4, 8.4, TEAL);
  qd(g, F.R, 0, 1, 7.4, 8.4, TEAL_DARK);
  for (const [u, v] of [[0.6, 0.6], [1.4, 0.6], [0.6, 1.4], [1.4, 1.4]]) {
    const c = U(p(X + u, Y + v), 9);
    g.dome(c, 8, 8.5, 4, { outline: true });
    g.circ([c[0], c[1] - 8.2], 1.3, '#5A4A5A');
  }
  [0.42, 0.52, 0.62].forEach((u, i) => g.ell(U(p(X + u + 0.1, Y + 2.08), 1.2), 1.7, 1.3, i % 2 ? '#E2C990' : '#EED6A0', { outline: true }));
  pennant(g, U(p(X + 1.85, Y + 0.15), 9), 7, SERVICE_EMBLEM.granary);
}

// Bazaar: four stalls, each a counter of goods under a striped awning in its own colour.
export function bazaar(g, X, Y) {
  const cs = [[RED, '#933E2B'], [GOLD, '#B08436'], [BLUE, '#245A88'], [GREEN, GREEN_DARK]];
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], k) => {
    const x = X + i, y = Y + j;
    box(g, x + 0.24, y + 0.3, 0.52, 0.4, 3.2, 0, ['#D9B47A', '#C49E66', '#A08478']);
    for (const [u, c] of [[0.3, '#C9552F'], [0.55, GOLD], [0.8, '#6E9E3A']]) g.ell(U(p(x + 0.24 + 0.52 * u, y + 0.55), 3.4), 1.4, 0.9, c, { outline: true });
    g.ell(U(p(x + 0.88, y + 0.5), 1), 1.6, 1, '#D9B060', { outline: true });
    awn(g, x + 0.1, y + 0.1, 0.8, 0.8, 7.5, cs[k][0], cs[k][1]);
  });
  pennant(g, U(p(X + 1.9, Y + 0.1), 8.7), 7, SERVICE_EMBLEM.bazaar);
}
```

- [ ] **Step 4: Write the services (part 2: temple, farm, registry entries)**

Append to `src/render/art/services.js`:
```js
// Temple: a stone platform, a hall with painted columns on both faces, two pylons with banded cornices
// and painted figures, a gold-topped gateway between teal columns, and flags (one in the emblem gold).
export function temple(g, X, Y) {
  box(g, X + 0.05, Y + 0.05, 1.9, 1.9, 2, 0, STONE);
  const Hh = box(g, X + 0.25, Y + 0.2, 1.5, 1, 13, 2, STONE);
  qd(g, Hh.R, 0, 1, 1, 11.5, '#9A8CA0');
  qd(g, Hh.L, 0, 1, 1, 11.5, '#A99AA6');
  for (let i = 0; i < 6; i++) {
    const u = 0.05 + i * 0.17;
    qd(g, Hh.R, u, u + 0.08, 1, 10, '#F4EDDF');
    qd(g, Hh.R, u, u + 0.08, 4, 5, TEAL);
    qd(g, Hh.R, u - 0.015, u + 0.095, 10, 11.5, GREEN);
  }
  for (let i = 0; i < 7; i++) {
    const u = 0.04 + i * 0.14;
    qd(g, Hh.L, u, u + 0.07, 1, 10, '#F4EDDF');
    qd(g, Hh.L, u, u + 0.07, 4, 5, TEAL);
    qd(g, Hh.L, u - 0.015, u + 0.085, 10, 11.5, GREEN);
  }
  box(g, X + 0.2, Y + 0.15, 1.6, 1.1, 1.6, 15, STONE);
  const pyl = (px) => {
    const F = tb(g, px, Y + 1.2, 0.75, 0.7, 21, 2, 0.1, STONE);
    for (const [a, b, c] of [[18.6, 19.8, TEAL], [17.6, 18.6, RED], [16.8, 17.6, GOLD]]) {
      qd(g, F.L, 0, 1, a, b, c);
      qd(g, F.R, 0, 1, a, b, c, { alpha: 0.8 });
    }
    qd(g, F.L, 0.22, 0.78, 4, 15, '#F7F1E4');
    qd(g, F.L, 0.42, 0.58, 5, 11, TEAL);
    g.circ(F.L(0.5, 12.6), 1.6, TEAL);
    qd(g, F.L, 0.36, 0.64, 9.5, 10.4, BLUE);
    g.circ(F.L(0.5, 14.3), 1, GOLD);
    qd(g, F.L, 0.26, 0.3, 5, 14, BLUE, { alpha: 0.7 });
    qd(g, F.L, 0.7, 0.74, 5, 14, BLUE, { alpha: 0.7 });
    for (let s = 3.5; s < 15; s += 2.2) if (hs(px, s, 3) > 0.3) qd(g, F.R, 0.2, 0.8, s, s + 0.7, '#9A8CA0', { alpha: 0.5 });
    box(g, px + 0.08, Y + 1.28, 0.59, 0.54, 1.4, 23, ['#F3EBDA', '#E2D7C4', '#C0B4C2']);
    const fp = U(p(px + 0.4, Y + 1.97), 2);
    g.line(fp, U(fp, 31), WOOD, 0.8);
    g.poly([U(fp, 31), [fp[0] + 9, fp[1] - 29], U(fp, 27)], px < X + 0.5 ? PINK : SERVICE_EMBLEM.temple);
  };
  pyl(X + 0.1);
  const G = box(g, X + 0.85, Y + 1.35, 0.3, 0.45, 12, 2, STONE);
  qd(g, G.L, 0.12, 0.88, 0, 9, DOOR);
  qd(g, G.L, 0, 1, 10, 12, GOLD);
  col(g, X + 0.86, Y + 1.86, 10, 2);
  col(g, X + 1.14, Y + 1.86, 10, 2);
  pyl(X + 1.15);
}

// Grain farm: four field tiles with straight rows, a reed fence round the edge that stops at the
// farmhouse, and a small thatched farmhouse in the near corner with pots and a green pennant.
export function farmGrain(g, X, Y) {
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) fieldTile(g, X + i, Y + j, 'grain');
  fence(g, X + 0.02, Y + 0.02, 1.96, 0.06);
  fence(g, X + 0.02, Y + 0.02, 0.06, 1.96);
  fence(g, X + 0.02, Y + 1.92, 1.3, 0.06);
  fence(g, X + 1.92, Y + 0.02, 0.06, 1.3);
  const a = X + 1.4, b = Y + 1.4, w = 0.52;
  const F = box(g, a, b, w, w, 5, 0, MUD2);
  crs(g, F, 5, '#9C7A54', 2.2);
  door(g, F, 0.34, 0.6, 3.6);
  tb(g, a - 0.06, b - 0.06, w + 0.12, w + 0.12, 4.5, 5, 0.3, THATCH);
  pots(g, p(X + 1.2, Y + 1.78), 2);
  pennant(g, U(p(a + w, b + 0.06), 0), 9, SERVICE_EMBLEM.farm_grain);
}

export const SERVICE_ART = {
  well: { w: 1, d: 1, height: 18, bounds: boundsFor(1, 1, 18), shadows: [[0.28, 0.28, 0.44, 0.44, 6]], draw: well },
  farm_grain: { w: 2, d: 2, height: 12, bounds: boundsFor(2, 2, 12), shadows: [[1.4, 1.4, 0.52, 0.52, 9]], draw: farmGrain },
  granary: { w: 2, d: 2, height: 22, bounds: boundsFor(2, 2, 22), shadows: [[0.1, 0.1, 1.8, 1.8, 16]], draw: granary },
  bazaar: {
    w: 2, d: 2, height: 12, bounds: boundsFor(2, 2, 12),
    shadows: [[0.12, 0.12, 0.76, 0.76, 9], [1.12, 0.12, 0.76, 0.76, 9], [0.12, 1.12, 0.76, 0.76, 9], [1.12, 1.12, 0.76, 0.76, 9]],
    draw: bazaar,
  },
  temple: { w: 2, d: 2, height: 40, bounds: boundsFor(2, 2, 40), shadows: [[0.25, 0.2, 1.5, 1, 15], [0.1, 1.2, 1.8, 0.7, 23]], draw: temple },
};
```

Unused imports (`WASH2`) may be removed. Then in `src/render/art/registry.js` replace the import and the `ART` line:
```js
import { HOUSE_ART } from './housing.js';
import { SERVICE_ART } from './services.js';

export { boundsFor } from '../iso.js';

export const ART = { ...HOUSE_ART, ...SERVICE_ART };
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `service art` PASS, then `ALL PASSED`.

- [ ] **Step 6: Commit**

```powershell
git add src/render/art/services.js src/render/art/registry.js tests/render/servicesArt.test.js tests/all.js
git commit -m "Draw the well, grain farm, granary, bazaar and temple`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Nature: palms, acacias, reeds, rocks, scrub, dunes and tufts

**Files:**
- Create: `src/render/art/nature.js`
- Modify: `src/render/art/registry.js`
- Test: `tests/render/natureArt.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: the primitives (Task 4), the palette (Task 3), `boundsFor` (Task 5).
- Produces (`nature.js`), all ported from the mock-up:
  - `palmAt(g, gx, gy, sc = 1, z = 0)` at a tile point (not a corner), `acacia(g, gx, gy)`, `reeds(g, q)` at an art point, `rock(g, c)`, `scrub(g, c)`, `dune(g, c)` at art points, `tufts(g, x, y, n, k = 0)` on tile `(x, y)` with `n` tufts and hash salt `k`.
  - `NATURE_ART`: slots `palm` and `acacia` (1×1, own ground shadow drawn by the art, so `shadows: []`).
- Modifies `registry.js` so `ART` also spreads `NATURE_ART`.

- [ ] **Step 1: Write the failing tests**

`tests/render/natureArt.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { palmAt, acacia, reeds, rock, scrub, dune, tufts, NATURE_ART } from '../../src/render/art/nature.js';
import { ART } from '../../src/render/art/registry.js';
import { makeCanvas, pixelAt, canvasHash } from '../helpers/canvas.js';

function drawAlone(fn) {
  const c = makeCanvas(200, 200);
  const ctx = c.getContext('2d');
  ctx.translate(100, 120);
  fn(makeDraw(ctx, 2));
  return c;
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('nature art', () => {
  it('draws trees, reeds, rocks, scrub and dunes with ink', () => {
    expect(inked(drawAlone((g) => palmAt(g, 0.5, 0.5, 1)))).toBeGreaterThan(150);
    expect(inked(drawAlone((g) => acacia(g, 0.5, 0.5)))).toBeGreaterThan(150);
    expect(inked(drawAlone((g) => reeds(g, [0, 0])))).toBeGreaterThan(10);
    expect(inked(drawAlone((g) => rock(g, [0, 0])))).toBeGreaterThan(10);
    expect(inked(drawAlone((g) => scrub(g, [0, 0])))).toBeGreaterThan(10);
    expect(inked(drawAlone((g) => dune(g, [0, 0])))).toBeGreaterThan(5);
    expect(inked(drawAlone((g) => tufts(g, 0, 0, 9)))).toBeGreaterThan(5);
  });
  it('scales a palm', () => {
    const big = inked(drawAlone((g) => palmAt(g, 0.5, 0.5, 1)));
    const small = inked(drawAlone((g) => palmAt(g, 0.5, 0.5, 0.6)));
    expect(small).toBeLessThan(big);
  });
  it('places tufts deterministically by tile and salt', () => {
    const a = canvasHash(drawAlone((g) => tufts(g, 3, 4, 6, 0)));
    const b = canvasHash(drawAlone((g) => tufts(g, 3, 4, 6, 0)));
    const c = canvasHash(drawAlone((g) => tufts(g, 3, 4, 6, 5)));
    expect(a).toBe(b);
    expect(a === c).toBe(false);
  });
  it('registers palm and acacia slots', () => {
    for (const slot of ['palm', 'acacia']) {
      expect(NATURE_ART[slot].w).toBe(1);
      expect(ART[slot].bounds.length).toBe(4);
      expect(ART[slot].shadows).toEqual([]);
      expect(inked(drawAlone((g) => ART[slot].draw(g, 0, 0)))).toBeGreaterThan(100);
    }
  });
});
```

Append to `tests/all.js`:
```js
import './render/natureArt.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "nature art"`
Expected: `LOAD ERROR` naming `src/render/art/nature.js`.

- [ ] **Step 3: Write the nature art**

`src/render/art/nature.js`:
```js
// Trees and ground decoration, ported from the approved mock-up. Trees are drawn at a tile point (the
// centre of their tile) and draw their own soft ground shadow.
import { p, U, hs } from './primitives.js';
import { SHADOW, LEAF, LEAF2, LEAF3, TRUNK, TRUNK_RING } from './palette.js';
import { boundsFor } from '../iso.js';

export function palmAt(g, gx, gy, sc = 1, z = 0) {
  const c = U(p(gx, gy), z);
  g.ell([c[0] + 5 * sc, c[1]], 8 * sc, 2.8 * sc, SHADOW, { alpha: 0.14 });
  const t = [c[0] + 3 * sc, c[1] - 20 * sc], c1 = [c[0] - 2 * sc, c[1] - 10 * sc];
  g.path([
    ['M', [c[0] - 1.3 * sc, c[1]]], ['Q', [c1[0] - 0.8 * sc, c1[1]], [t[0] - 0.9 * sc, t[1]]],
    ['L', [t[0] + 0.9 * sc, t[1]]], ['Q', [c1[0] + 0.8 * sc, c1[1]], [c[0] + 1.3 * sc, c[1]]], ['Z'],
  ], TRUNK);
  for (let s = 0.12; s < 0.95; s += 0.11) {
    const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, d = s * s;
    const bx = a * c[0] + b * c1[0] + d * t[0], by = a * c[1] + b * c1[1] + d * t[1];
    g.line([bx - 1.1 * sc, by], [bx + 1.1 * sc, by + 0.4 * sc], TRUNK_RING, 0.5 * sc);
  }
  const fronds = [[-165, LEAF3, 1], [-128, LEAF, 1.05], [-92, LEAF2, 0.75], [-55, LEAF, 1.05], [-15, LEAF3, 1], [25, LEAF2, 0.95], [155, LEAF2, 0.95], [118, LEAF, 0.85], [72, LEAF3, 0.8]];
  for (const [a, cl, L] of fronds) {
    const ca = Math.cos((a * Math.PI) / 180), sa = Math.sin((a * Math.PI) / 180), len = 11 * sc * L;
    const e = [t[0] + ca * len, t[1] + sa * len * 0.5 + 4 * sc * Math.abs(ca)];
    const m = [t[0] + ca * len * 0.55, t[1] + sa * len * 0.3 - 2.2 * sc];
    const nx = -sa * 1.1 * sc, ny = ca * 1.9 * sc;
    g.path([['M', t], ['Q', [m[0] + nx, m[1] + ny], e], ['Q', [m[0] - nx, m[1] - ny], t], ['Z']], cl);
    g.stroke([['M', t], ['Q', m, e]], '#2C5A1E', 0.5 * sc, 0.5);
  }
  g.circ([t[0] - 0.9 * sc, t[1] + 1.5 * sc], 1.1 * sc, '#6B4A2A');
  g.circ([t[0] + 1.1 * sc, t[1] + 1.7 * sc], 1.1 * sc, '#6B4A2A');
}

export function acacia(g, gx, gy) {
  const c = p(gx, gy);
  g.ell([c[0] + 7, c[1] + 1], 12, 3.5, SHADOW, { alpha: 0.13 });
  g.stroke([['M', c], ['L', [c[0] + 0.5, c[1] - 7]], ['L', [c[0] - 5, c[1] - 12]], ['M', [c[0] + 0.5, c[1] - 7]], ['L', [c[0] + 6, c[1] - 12.5]]], '#6B4F3A', 1.4);
  g.ell([c[0], c[1] - 13.5], 12, 3.6, '#4F7E2E');
  g.ell([c[0] - 1, c[1] - 14.6], 10, 2.8, '#62963A');
  g.ell([c[0] + 2, c[1] - 15.3], 6, 1.8, '#86B64E');
}

export function reeds(g, q) {
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 1.2, hh = 5 + hs(q[0], q[1], i) * 4;
    g.line([q[0] + dx, q[1]], [q[0] + dx * 1.6, q[1] - hh], i % 2 ? '#4F8A2E' : '#6AA83A', 0.8);
    if (i % 2 === 0) g.ell([q[0] + dx * 1.6, q[1] - hh - 1], 1.1, 1.8, '#9CC45A');
  }
}

export function rock(g, c) {
  g.poly([[c[0] - 4, c[1]], [c[0] - 2.4, c[1] - 3], [c[0] + 1.8, c[1] - 3.6], [c[0] + 4.4, c[1] - 1], [c[0] + 3, c[1] + 1.4], [c[0] - 2, c[1] + 1.5]], '#B39C82', { outline: true });
  g.poly([[c[0] - 2.2, c[1] - 2.6], [c[0] + 1.8, c[1] - 3.2], [c[0] + 3, c[1] - 1.4], [c[0] - 1, c[1] - 1]], '#D9C7A8');
}

export function scrub(g, c) {
  g.ell([c[0] + 3, c[1] + 0.5], 5, 1.5, SHADOW, { alpha: 0.1 });
  g.circ([c[0] - 2, c[1] - 1.2], 2.4, '#5E8A34');
  g.circ([c[0] + 1.5, c[1] - 2.2], 2.6, '#72A040');
  g.circ([c[0] + 0.4, c[1] - 0.2], 2, '#4F7A2C');
  g.circ([c[0] + 1, c[1] - 3], 1, '#9CC45A');
}

export function dune(g, c) {
  g.stroke([['M', [c[0] - 9, c[1] + 1]], ['Q', [c[0], c[1] - 3.5], [c[0] + 9, c[1] + 1]]], '#F7EAC8', 1, 0.85);
  g.stroke([['M', [c[0] - 8, c[1] + 2.2]], ['Q', [c[0], c[1] - 1.4], [c[0] + 8, c[1] + 2.2]]], '#CDB283', 0.8, 0.45);
}

// n grass tufts scattered over tile (x, y); k salts the hash so border tufts differ from tile tufts.
export function tufts(g, x, y, n, k = 0) {
  for (let j = 0; j < n; j++) {
    const q = p(x + hs(x, y, 60 + j + k), y + hs(x, y, 70 + j + k));
    g.line(q, [q[0] - 0.8, q[1] - 3], '#4F7A2C', 0.7);
    g.line(q, [q[0] + 0.6, q[1] - 3.4], '#A6CC5E', 0.6);
    g.line(q, [q[0] + 1.4, q[1] - 2.2], '#6E9E3A', 0.6);
  }
}

export const NATURE_ART = {
  palm: { w: 1, d: 1, height: 20, bounds: [-16, -22, 20, 14], shadows: [], draw: (g, x, y) => palmAt(g, x + 0.5, y + 0.5, 1, 0) },
  acacia: { w: 1, d: 1, height: 18, bounds: [-16, -12, 22, 16], shadows: [], draw: (g, x, y) => acacia(g, x + 0.5, y + 0.5) },
};
```

`boundsFor` is imported for parity with the other art files; remove the import if the linter in your head objects. In `src/render/art/registry.js`:
```js
import { HOUSE_ART } from './housing.js';
import { SERVICE_ART } from './services.js';
import { NATURE_ART } from './nature.js';

export { boundsFor } from '../iso.js';

export const ART = { ...HOUSE_ART, ...SERVICE_ART, ...NATURE_ART };
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `nature art` PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/render/art/nature.js src/render/art/registry.js tests/render/natureArt.test.js tests/all.js
git commit -m "Draw palms, acacias, reeds, rocks, scrub, dunes and tufts`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Figures

**Files:**
- Create: `src/render/art/figures.js`
- Modify: `src/render/art/registry.js`
- Test: `tests/render/figuresArt.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: the primitives (Task 4), the palette (Task 3).
- Produces (`figures.js`):
  - `FIGURE_KINDS = ['citizen', 'woman', 'water', 'porter', 'priest', 'farmer', 'noble', 'fisher']`.
  - `fig(g, gx, gy, kind, z = 0, sc = 1)`: a small person standing at tile point `(gx, gy)` (their feet), ported from the mock-up: kilt or long dress, coloured collar, role prop (water jar, basket on the head, priest's sash, hoe, fishing pole).
  - `FIGURE_ART`: slots `fig.<kind>` for every kind, drawn with their feet at `p(x, y)` of the given tile corner (`w: 0, d: 0`), bounds `[-14, -30, 14, 6]`, `shadows: []`.
- Modifies `registry.js` so `ART` also spreads `FIGURE_ART`.

- [ ] **Step 1: Write the failing tests**

`tests/render/figuresArt.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { fig, FIGURE_KINDS, FIGURE_ART } from '../../src/render/art/figures.js';
import { ART } from '../../src/render/art/registry.js';
import { makeCanvas, pixelAt, canvasHash } from '../helpers/canvas.js';

function drawAlone(fn) {
  const c = makeCanvas(120, 120);
  const ctx = c.getContext('2d');
  ctx.translate(60, 90);
  fn(makeDraw(ctx, 2));
  return c;
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('figure art', () => {
  it('draws every kind with ink and tells them apart', () => {
    const hashes = new Set();
    for (const kind of FIGURE_KINDS) {
      const c = drawAlone((g) => fig(g, 0, 0, kind));
      expect(inked(c)).toBeGreaterThan(30);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(FIGURE_KINDS.length);
  });
  it('stands on its feet point and fits the registered bounds', () => {
    const c = drawAlone((g) => fig(g, 0, 0, 'citizen'));
    // feet shadow at art (0, 0) -> canvas (60, 90); the head is about 11 art px up
    expect(pixelAt(c, 60, 90)[3]).toBeGreaterThan(0);
    expect(pixelAt(c, 60, 70)[3]).toBeGreaterThan(0);
    expect(pixelAt(c, 60, 20)[3]).toBe(0);
    for (const kind of FIGURE_KINDS) {
      const e = ART[`fig.${kind}`];
      expect(e.w).toBe(0);
      expect(e.bounds).toEqual([-14, -30, 14, 6]);
      expect(e.shadows).toEqual([]);
    }
    expect(Object.keys(FIGURE_ART).length).toBe(FIGURE_KINDS.length);
  });
});
```

Append to `tests/all.js`:
```js
import './render/figuresArt.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "figure art"`
Expected: `LOAD ERROR` naming `src/render/art/figures.js`.

- [ ] **Step 3: Write the figures**

`src/render/art/figures.js`:
```js
// Small people, ported from the mock-up's fig(). Walkers (walkers.js) pick a kind per service.
import { p, U } from './primitives.js';
import { SHADOW, TEAL, BLUE, GOLD, ORANGE, WOOD } from './palette.js';

export const FIGURE_KINDS = ['citizen', 'woman', 'water', 'porter', 'priest', 'farmer', 'noble', 'fisher'];

export function fig(g, gx, gy, kind, z = 0, sc = 1) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc, sk = '#A0663F', hair = '#1E150E';
  g.ell([X, Y], 3 * s, 1.1 * s, SHADOW, { alpha: 0.25 });
  const long = kind === 'woman' || kind === 'priest';
  const cl = kind === 'priest' ? '#FFFFFF' : '#F7F2E8';
  if (!long) {
    g.line([X - 0.9 * s, Y], [X - 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
    g.line([X + 0.9 * s, Y], [X + 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
    g.poly([[X - 1.9 * s, Y - 2.8 * s], [X + 1.9 * s, Y - 2.8 * s], [X + 1.5 * s, Y - 5.7 * s], [X - 1.5 * s, Y - 5.7 * s]], cl);
    g.line([X - 1.5 * s, Y - 5.4 * s], [X + 1.5 * s, Y - 5.4 * s], kind === 'noble' ? GOLD : TEAL, 0.7 * s);
    g.poly([[X - 1.5 * s, Y - 5.6 * s], [X + 1.5 * s, Y - 5.6 * s], [X + 1.7 * s, Y - 8.7 * s], [X - 1.7 * s, Y - 8.7 * s]], sk);
  } else {
    g.poly([[X - 2 * s, Y], [X + 2 * s, Y], [X + 1.6 * s, Y - 8.7 * s], [X - 1.6 * s, Y - 8.7 * s]], cl, { outline: true });
  }
  g.line([X - 1.8 * s, Y - 8.4 * s], [X - 2.4 * s, Y - 5 * s], sk, 0.9 * s);
  g.line([X + 1.8 * s, Y - 8.4 * s], [X + 2.4 * s, Y - 5 * s], sk, 0.9 * s);
  g.line([X - 1.5 * s, Y - 8.5 * s], [X + 1.5 * s, Y - 8.5 * s], kind === 'noble' ? GOLD : (kind === 'woman' ? TEAL : BLUE), 1 * s);
  if (kind === 'priest') g.line([X - 1.6 * s, Y - 8.2 * s], [X + 1.4 * s, Y - 5.5 * s], ORANGE, 1 * s);
  if (kind === 'woman') g.ell([X - 0.5 * s, Y - 9.6 * s], 1.7 * s, 2.4 * s, hair);
  if (kind !== 'priest') g.circ([X - 0.2 * s, Y - 10.8 * s], 1.75 * s, hair);
  g.circ([X + 0.25 * s, Y - 10.3 * s], 1.4 * s, sk);
  if (kind === 'water') g.ell([X + 2.4 * s, Y - 9.4 * s], 1.5 * s, 1.8 * s, '#C9552F', { outline: true });
  if (kind === 'porter') g.ell([X, Y - 12.8 * s], 2.6 * s, 1.2 * s, '#D9B060', { outline: true });
  if (kind === 'farmer') g.line([X + 2.4 * s, Y - 5 * s], [X + 5 * s, Y + 0.8 * s], WOOD, 0.8 * s);
  if (kind === 'fisher') {
    g.line([X + 2.4 * s, Y - 6 * s], [X + 10 * s, Y - 15 * s], WOOD, 0.6);
    g.line([X + 10 * s, Y - 15 * s], [X + 12 * s, Y + 2 * s], '#EDE6D2', 0.3);
  }
}

export const FIGURE_ART = {};
for (const kind of FIGURE_KINDS) {
  FIGURE_ART[`fig.${kind}`] = { w: 0, d: 0, height: 14, bounds: [-14, -30, 14, 6], shadows: [], draw: (g, x, y) => fig(g, x, y, kind) };
}
```

In `src/render/art/registry.js`:
```js
import { HOUSE_ART } from './housing.js';
import { SERVICE_ART } from './services.js';
import { NATURE_ART } from './nature.js';
import { FIGURE_ART } from './figures.js';

export { boundsFor } from '../iso.js';

export const ART = { ...HOUSE_ART, ...SERVICE_ART, ...NATURE_ART, ...FIGURE_ART };
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `figure art` PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/render/art/figures.js src/render/art/registry.js tests/render/figuresArt.test.js tests/all.js
git commit -m "Draw the citizen, carrier, porter, priest and other figures`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Sprite cache

**Files:**
- Create: `src/render/spriteCache.js`
- Test: `tests/render/spriteCache.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `ART` (Tasks 5–8), `makeDraw` (Task 3), `ART_SCALE` (Task 2).
- Produces:
  - `ZOOM_BUCKETS = [0.5, 0.75, 1, 1.5, 2]`; `bucketFor(zoom)` picks the smallest bucket ≥ zoom (so a sprite is only ever drawn at or below its baked size, never upscaled); `spriteKey(slot, bucket, dpr) → '<slot>@<bucket>x<dpr>'`.
  - `createSpriteCache({ registry = ART, counter = null, createCanvas, loadImage }) → cache` with:
    - `cache.get(slot, zoom, dpr = 1) → sprite | null`. A sprite is `{ slot, canvas, ax, ay, scale, bucket, dpr }`: `canvas` holds the slot drawn once at `scale = ART_SCALE × bucket × dpr` device px per art px, and `(ax, ay)` is where art point `[0, 0]` (the footprint origin, or a figure's feet) lands in that canvas. Returns `null` for an unknown slot, or for a PNG slot whose image hasn't loaded yet.
    - `counter`, if given, gets `hits`, `misses` and `pending` incremented.
    - `cache.ready(slot) → Promise` resolving once a PNG slot's image is loaded (immediately for drawn slots).
    - `cache.size()`, `cache.clear()`.
  - **PNG slots:** a registry entry may carry `png: { src, ax, ay, scale }` instead of `draw`: the image file, its own anchor in image px and its image px per art px. The cache loads it once and bakes it into each bucket exactly like drawn art, so switching a slot to a PNG later changes nothing else.
  - `drawSprite(ctx, sprite, px, py, zoom, dpr = 1)`: draws the sprite so its art origin lands on device px `(px, py)`, scaled from its bucket to the real zoom.

- [ ] **Step 1: Write the failing tests**

`tests/render/spriteCache.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { ZOOM_BUCKETS, bucketFor, spriteKey, createSpriteCache, drawSprite } from '../../src/render/spriteCache.js';
import { ART } from '../../src/render/art/registry.js';
import { makeCanvas, pixelAt, nearColour } from '../helpers/canvas.js';

describe('sprite cache', () => {
  it('buckets zoom upwards to the nearest baked size', () => {
    expect(ZOOM_BUCKETS).toEqual([0.5, 0.75, 1, 1.5, 2]);
    expect(bucketFor(0.5)).toBe(0.5);
    expect(bucketFor(0.6)).toBe(0.75);
    expect(bucketFor(1)).toBe(1);
    expect(bucketFor(1.2)).toBe(1.5);
    expect(bucketFor(2)).toBe(2);
    expect(bucketFor(3)).toBe(2);
    expect(spriteKey('well', 1.5, 2)).toBe('well@1.5x2');
  });
  it('renders a slot once per bucket and dpr and counts hits', () => {
    const counter = { hits: 0, misses: 0 };
    const cache = createSpriteCache({ counter });
    const a = cache.get('well', 1, 1);
    const b = cache.get('well', 1, 1);
    const c = cache.get('well', 1.2, 1);
    const d = cache.get('well', 1, 2);
    expect(a).toBe(b);
    expect(a === c).toBe(false);
    expect(a === d).toBe(false);
    expect(counter).toEqual({ hits: 1, misses: 3 });
    expect(cache.size()).toBe(3);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('no_such_slot', 1, 1)).toBe(null);
  });
  it('anchors the art origin and paints the well centre', () => {
    const cache = createSpriteCache();
    const s = cache.get('well', 1, 1);
    const [l, t] = ART.well.bounds;
    expect(s.scale).toBe(2);
    expect(s.ax).toBe(-l * 2);
    expect(s.ay).toBe(-t * 2);
    // the tile centre of a 1x1 footprint is art (0, 8)
    expect(pixelAt(s.canvas, s.ax, s.ay + 16)[3]).toBeGreaterThan(0);
    expect(pixelAt(s.canvas, 1, 1)[3]).toBe(0);
    const hi = cache.get('temple', 2, 2);
    expect(hi.scale).toBe(8);
    expect(hi.canvas.width).toBeGreaterThan(s.canvas.width);
  });
  it('draws a sprite onto a canvas at the right place and zoom', () => {
    const cache = createSpriteCache();
    const c = makeCanvas(200, 200);
    const ctx = c.getContext('2d');
    drawSprite(ctx, cache.get('house.t1', 1, 1), 100, 100, 1, 1);
    expect(pixelAt(c, 100, 112)[3]).toBeGreaterThan(0);
    expect(pixelAt(c, 10, 10)[3]).toBe(0);
    const z = makeCanvas(200, 200);
    drawSprite(z.getContext('2d'), cache.get('house.t1', 0.5, 1), 100, 100, 0.5, 1);
    let big = 0, small = 0;
    for (let x = 0; x < 200; x += 2) for (let y = 0; y < 200; y += 2) {
      if (pixelAt(c, x, y)[3] > 0) big++;
      if (pixelAt(z, x, y)[3] > 0) small++;
    }
    expect(small).toBeLessThan(big);
  });
  it('can serve a slot from a PNG with no other change', async () => {
    const src = makeCanvas(4, 4);
    const sctx = src.getContext('2d');
    sctx.fillStyle = '#C4473A';
    sctx.fillRect(0, 0, 4, 4);
    const registry = { 'test.png': { w: 1, d: 1, height: 4, bounds: [0, -4, 4, 0], shadows: [], png: { src: src.toDataURL(), ax: 0, ay: 4, scale: 1 } } };
    const counter = { hits: 0, misses: 0, pending: 0 };
    const cache = createSpriteCache({ registry, counter });
    const first = cache.get('test.png', 1, 1);
    await cache.ready('test.png');
    const s = cache.get('test.png', 1, 1);
    expect(s === null).toBe(false);
    expect(first === null || first === s).toBe(true);
    expect(nearColour(pixelAt(s.canvas, 4, 4), '#C4473A', 8)).toBe(true);
    expect(counter.misses).toBe(1);
  });
});
```

Append to `tests/all.js`:
```js
import './render/spriteCache.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sprite cache"`
Expected: `LOAD ERROR` naming `src/render/spriteCache.js`.

- [ ] **Step 3: Write the sprite cache**

`src/render/spriteCache.js`:
```js
// Art slots rendered once per zoom bucket and devicePixelRatio onto offscreen canvases. A slot's registry
// entry either draws itself (`draw`) or points at a PNG (`png`); the cache treats both the same way.
import { ART } from './art/registry.js';
import { makeDraw } from './art/ctx.js';
import { ART_SCALE } from './iso.js';

export const ZOOM_BUCKETS = [0.5, 0.75, 1, 1.5, 2];

export function bucketFor(zoom) {
  for (const b of ZOOM_BUCKETS) if (zoom <= b + 1e-9) return b;
  return ZOOM_BUCKETS[ZOOM_BUCKETS.length - 1];
}

export const spriteKey = (slot, bucket, dpr) => `${slot}@${bucket}x${dpr}`;

export function defaultCreateCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function defaultLoadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const imageReady = (img) => Boolean(img.complete && img.naturalWidth > 0);

export function createSpriteCache({ registry = ART, counter = null, createCanvas = defaultCreateCanvas, loadImage = defaultLoadImage } = {}) {
  const sprites = new Map(); // key -> sprite
  const images = new Map();  // slot -> { img, promise }

  const count = (k) => { if (counter) counter[k] = (counter[k] || 0) + 1; };

  function imageFor(slot, def) {
    let entry = images.get(slot);
    if (!entry) {
      const img = loadImage(def.png.src);
      const promise = new Promise((resolve) => {
        if (imageReady(img)) { resolve(); return; }
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
      entry = { img, promise };
      images.set(slot, entry);
    }
    return entry;
  }

  function render(slot, def, bucket, dpr) {
    const scale = ART_SCALE * bucket * dpr;
    const [l, t, r, b] = def.bounds;
    const canvas = createCanvas(Math.max(1, Math.ceil((r - l) * scale)), Math.max(1, Math.ceil((b - t) * scale)));
    const ctx = canvas.getContext('2d');
    const ax = -l * scale, ay = -t * scale;
    if (def.png) {
      const { img } = imageFor(slot, def);
      const k = scale / def.png.scale;
      ctx.drawImage(img, ax - def.png.ax * k, ay - def.png.ay * k, img.width * k, img.height * k);
    } else if (def.draw) {
      ctx.save();
      ctx.translate(ax, ay);
      def.draw(makeDraw(ctx, scale), 0, 0);
      ctx.restore();
    }
    return { slot, canvas, ax, ay, scale, bucket, dpr };
  }

  return {
    get(slot, zoom, dpr = 1) {
      const def = registry[slot];
      if (!def) return null;
      const bucket = bucketFor(zoom);
      const key = spriteKey(slot, bucket, dpr);
      const hit = sprites.get(key);
      if (hit) { count('hits'); return hit; }
      if (def.png && !imageReady(imageFor(slot, def).img)) { count('pending'); return null; }
      count('misses');
      const sprite = render(slot, def, bucket, dpr);
      sprites.set(key, sprite);
      return sprite;
    },
    ready(slot) {
      const def = registry[slot];
      if (!def || !def.png) return Promise.resolve();
      return imageFor(slot, def).promise;
    },
    size() { return sprites.size; },
    clear() { sprites.clear(); },
  };
}

// Draw a sprite so its art origin lands on device px (px, py), scaled from its bucket to the real zoom.
export function drawSprite(ctx, sprite, px, py, zoom, dpr = 1) {
  const k = (ART_SCALE * zoom * dpr) / sprite.scale;
  ctx.drawImage(sprite.canvas, px - sprite.ax * k, py - sprite.ay * k, sprite.canvas.width * k, sprite.canvas.height * k);
}
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `sprite cache` PASS, then `ALL PASSED`. A data-URL image loads asynchronously even from memory, so the PNG test awaits `ready` before asserting.

- [ ] **Step 5: Commit**

```powershell
git add src/render/spriteCache.js tests/render/spriteCache.test.js tests/all.js
git commit -m "Cache art slots as sprites per zoom bucket and dpr`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Terrain baker: chunk signatures, blended ground, plots, decoration

**Files:**
- Create: `src/render/terrainBaker.js`
- Create: `tests/helpers/renderWorld.js`
- Test: `tests/render/terrainBaker.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `CHUNK` (Task 2), `p`, `tileDiamond`, `ART_SCALE` (Task 2), `hash2`, `valueNoise` (`src/sim/rng.js`), `T` (`src/sim/terrain.js`), `idx`, `inBounds` (`src/sim/grid.js`), `BUILDINGS`, `makeDraw` (Task 3), `TERRAIN` palette, `rock`, `scrub`, `dune`, `tufts` (Task 7), `defaultCreateCanvas`, `bucketFor` (Task 9).
- Produces (`terrainBaker.js`):
  - `CHUNK` (re-export), `CHUNK_MARGIN = 24`, `CHUNK_MAX_SCALE = 3`, `BLEND = 0.33`.
  - `chunkScaleFor(zoom, dpr) → 1 | 1.5 | 2 | 3` device px per art px for chunk canvases (capped so a chunk never exceeds about 1700×900 px).
  - `chunkSignature(world, cx, cy) → number`: hash of terrain, road, occupancy, building type and house tier for every tile in the chunk plus a one-tile ring.
  - `cornerWeight(world, x, y, code) → 0 | 0.25 | 0.5 | 0.75 | 1`: the share of the four tiles meeting at corner `(x, y)` that have terrain `code` (off-map tiles count as matching).
  - `blobFor(world, x, y, code, salt, expand) → [8 art points]`: the tile's diamond with corners pushed outward where the terrain continues and pulled inward where it stops, plus noise, so edges wander by about `BLEND` of a tile.
  - `drawGround(g, world, range)`: sand base with blotches and dots, then the rocky, fertile, meadow and bank layers (each in three passes: soft, main and an offset second tone), then tufts, pebbles, mud and desert decoration. `range` is `{ x0, y0, x1, y1 }` in tiles and may extend past the map.
  - `drawPlots(g, world, range)`: a soft pad under every building footprint touching the range.
  - `drawTileGrid(g, range, alpha = 0.18)`: the faint diamond grid 1c fades in while placing.
  - `bakeChunk(world, cx, cy, scale, createCanvas = defaultCreateCanvas) → { canvas, ax, ay, scale, cx, cy }`: a sprite-shaped record (so `drawSprite` draws it) whose art origin is the chunk's origin tile corner `p(cx × 16, cy × 16)`. The bake draws tiles two deep into the neighbouring chunks, clipped to this chunk's own diamond, so seams match without overdraw. Task 11 adds the river and roads inside it.
  - `createTerrainBaker({ createCanvas, counter, maxChunks = 48 }) → baker` with `baker.get(world, cx, cy, zoom, dpr, allowBake = true) → sprite | null` (re-bakes only when the signature changed; with `allowBake` false a missing or stale chunk returns `null` instead of baking), `baker.clear(world)`, `baker.size(world)`. `counter.bakes` counts bakes.
- Produces (`tests/helpers/renderWorld.js`): `riverWorld() → world`, a 32×32 test world with a wiggling river, banks, fertile strips, a rocky patch, a meadow, two roads, four houses (tiers 1–4), a well, a bazaar, a temple, a farm and a granary, all staffed; and `chunkPixel(sprite, tx, ty) → [r, g, b, a]`, the pixel at the centre of tile `(tx, ty)` inside a baked chunk sprite.

- [ ] **Step 1: Write the helper**

`tests/helpers/renderWorld.js`:
```js
import { idx } from '../../src/sim/grid.js';
import { T } from '../../src/sim/terrain.js';
import { p } from '../../src/render/iso.js';
import { CHUNK } from '../../src/render/camera.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from './testWorld.js';
import { pixelAt } from './canvas.js';

// A 32 x 32 world with every terrain type and every Stage 1 building, for render tests.
export function riverWorld() {
  const w = makeTestWorld({ size: 32, fertile: [] });
  for (let y = 0; y < 32; y++) {
    const rx = 4 + Math.round(Math.sin(y / 5) * 1.5);
    for (let x = 0; x < 32; x++) {
      const i = idx(32, x, y);
      const d = Math.abs(x - rx);
      if (d <= 1) w.terrain[i] = T.WATER;
      else if (d <= 2) w.terrain[i] = T.BANK;
      else if (d <= 6) w.terrain[i] = T.FERTILE;
      else if (x >= 20 && x <= 25 && y >= 4 && y <= 9) w.terrain[i] = T.ROCKY;
      else if (y >= 18 && y <= 24 && x >= 12 && x <= 19) w.terrain[i] = T.MEADOW;
    }
  }
  setRoad(w, 10, 12, 28, 12);
  setRoad(w, 20, 12, 20, 26);
  for (let t = 1; t <= 4; t++) addRaw(w, 'house', 11 + t, 13, { tier: t, residents: 4 * t });
  addRaw(w, 'well', 16, 11);
  addRaw(w, 'bazaar', 22, 10, { store: { grain: 50 } });
  addRaw(w, 'temple', 24, 13);
  addRaw(w, 'farm_grain', 8, 10);
  addRaw(w, 'granary', 17, 13, { store: { grain: 100 } });
  staffAll(w);
  return w;
}

// The device pixel at the centre of tile (tx, ty) in a baked chunk sprite.
export function chunkPixel(sprite, tx, ty) {
  const o = p(sprite.cx * CHUNK, sprite.cy * CHUNK);
  const c = p(tx + 0.5, ty + 0.5);
  return pixelAt(sprite.canvas, sprite.ax + (c[0] - o[0]) * sprite.scale, sprite.ay + (c[1] - o[1]) * sprite.scale);
}
```

- [ ] **Step 2: Write the failing tests**

`tests/render/terrainBaker.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import {
  chunkSignature, cornerWeight, blobFor, bakeChunk, createTerrainBaker, drawTileGrid, chunkScaleFor, CHUNK,
} from '../../src/render/terrainBaker.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { T } from '../../src/sim/terrain.js';
import { TERRAIN } from '../../src/render/art/palette.js';
import { riverWorld, chunkPixel } from '../helpers/renderWorld.js';
import { addRaw } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt, canvasHash, nearColour } from '../helpers/canvas.js';

describe('terrain baker', () => {
  it('picks a capped chunk scale', () => {
    expect(chunkScaleFor(1, 1)).toBe(2);
    expect(chunkScaleFor(0.5, 1)).toBe(1);
    expect(chunkScaleFor(2, 3)).toBe(3);
    expect(chunkScaleFor(1, 2)).toBe(3);
  });
  it('changes the signature only for the chunk a change touches', () => {
    const w = riverWorld();
    const before = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy]) => chunkSignature(w, cx, cy));
    addRaw(w, 'house', 14, 21);
    const after = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy]) => chunkSignature(w, cx, cy));
    expect(after[2] === before[2]).toBe(false);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(after[3]).toBe(before[3]);
    w.buildings[w.occ[21 * 32 + 14]].tier = 3;
    expect(chunkSignature(w, 0, 1) === after[2]).toBe(false);
  });
  it('weights corners by how many of their tiles share the terrain', () => {
    const w = riverWorld();
    expect(cornerWeight(w, 15, 21, T.MEADOW)).toBe(1);
    expect(cornerWeight(w, 12, 18, T.MEADOW)).toBe(0.25);
    expect(cornerWeight(w, 15, 21, T.DESERT)).toBe(0);
    expect(blobFor(w, 15, 21, T.MEADOW, 0, 0).length).toBe(8);
  });
  it('bakes the same pixels twice and paints each terrain its colour', () => {
    const w = riverWorld();
    const a = bakeChunk(w, 0, 1, 2);
    const b = bakeChunk(w, 0, 1, 2);
    expect(canvasHash(a.canvas)).toBe(canvasHash(b.canvas));
    const meadow = chunkPixel(a, 15, 21);
    expect(meadow[1]).toBeGreaterThan(meadow[0]);
    expect(nearColour(chunkPixel(a, 12, 28), TERRAIN.sand, 45)).toBe(true);
    const rocky = chunkPixel(bakeChunk(w, 1, 0, 2), 22, 6);
    expect(rocky[3]).toBe(255);
    expect(rocky[2]).toBeLessThan(rocky[0]);
  });
  it('re-bakes only the chunk that changed', () => {
    const w = riverWorld();
    const counter = { bakes: 0 };
    const baker = createTerrainBaker({ counter });
    const first = baker.get(w, 0, 1, 1, 1);
    baker.get(w, 1, 1, 1, 1);
    baker.get(w, 0, 1, 1, 1);
    expect(counter.bakes).toBe(2);
    addRaw(w, 'house', 14, 21);
    const again = baker.get(w, 0, 1, 1, 1);
    baker.get(w, 1, 1, 1, 1);
    expect(counter.bakes).toBe(3);
    expect(again === first).toBe(false);
    expect(baker.get(w, 1, 0, 1, 1, false)).toBe(null);
    expect(counter.bakes).toBe(3);
    expect(baker.size(w)).toBe(2);
  });
  it('draws the placement grid hook', () => {
    const c = makeCanvas(200, 200);
    const ctx = c.getContext('2d');
    ctx.translate(100, 20);
    drawTileGrid(makeDraw(ctx, 2), { x0: 0, y0: 0, x1: 3, y1: 3 });
    let inked = 0;
    for (let x = 0; x < 200; x += 2) for (let y = 0; y < 200; y += 2) if (pixelAt(c, x, y)[3] > 0) inked++;
    expect(inked).toBeGreaterThan(40);
    expect(CHUNK).toBe(16);
  });
});
```

Append to `tests/all.js`:
```js
import './render/terrainBaker.test.js';
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "terrain baker"`
Expected: `LOAD ERROR` naming `src/render/terrainBaker.js`.

- [ ] **Step 4: Write the baker (part 1: signatures and blended layers)**

`src/render/terrainBaker.js`:
```js
// Blended terrain (spec 5.2) baked into 16 x 16-tile chunk canvases. Gameplay keeps the grid; only the
// picture blends. A chunk is re-baked when its signature (what is under it) changes.
import { CHUNK } from './camera.js';
import { ART_SCALE, p, tileDiamond } from './iso.js';
import { hash2, valueNoise } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { idx, inBounds } from '../sim/grid.js';
import { BUILDINGS } from '../data/buildings.js';
import { makeDraw } from './art/ctx.js';
import { TERRAIN } from './art/palette.js';
import { rock, scrub, dune, tufts } from './art/nature.js';
import { defaultCreateCanvas, bucketFor } from './spriteCache.js';

export { CHUNK };
export const CHUNK_MARGIN = 24;   // art px of canvas around the chunk diamond
export const CHUNK_MAX_SCALE = 3; // device px per art px; terrain is soft, so a little upscaling is fine
export const BLEND = 0.33;        // edges wander by about a third of a tile

const TYPE_INDEX = Object.keys(BUILDINGS);

export function chunkScaleFor(zoom, dpr) {
  const s = ART_SCALE * bucketFor(zoom) * dpr;
  if (s >= CHUNK_MAX_SCALE) return CHUNK_MAX_SCALE;
  if (s >= 2) return 2;
  if (s >= 1.5) return 1.5;
  return 1;
}

// FNV-style hash of terrain, road, occupancy, building type and house tier for the chunk plus a one-tile
// ring: blending and road joins look across chunk edges, so a change next door must re-bake this chunk too.
export function chunkSignature(world, cx, cy) {
  let h = (2166136261 ^ (world.seed | 0)) >>> 0;
  const mix = (v) => { h = Math.imul(h ^ (v | 0), 16777619) >>> 0; };
  mix(world.size);
  for (let y = cy * CHUNK - 1; y <= cy * CHUNK + CHUNK; y++) {
    for (let x = cx * CHUNK - 1; x <= cx * CHUNK + CHUNK; x++) {
      if (!inBounds(world.size, x, y)) { mix(255); continue; }
      const i = idx(world.size, x, y);
      mix(world.terrain[i]);
      mix(world.road[i] ? 1 : 0);
      const b = world.occ[i] ? world.buildings[world.occ[i]] : null;
      mix(b ? TYPE_INDEX.indexOf(b.type) + 1 : 0);
      mix(b && b.type === 'house' ? b.tier + 1 : 0);
    }
  }
  return h;
}

const terrainAt = (world, x, y, fallback) => (inBounds(world.size, x, y) ? world.terrain[idx(world.size, x, y)] : fallback);

// Share of the four tiles meeting at corner (x, y) that have terrain `code`. Off-map tiles count as
// matching so the map edge never pulls a layer inward.
export function cornerWeight(world, x, y, code) {
  let n = 0;
  for (const [tx, ty] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) if (terrainAt(world, tx, ty, code) === code) n++;
  return n / 4;
}

// The tile's diamond as 8 art points (corners and edge midpoints), each pushed out from the tile centre
// where the terrain continues and pulled in where it stops, plus value noise. `expand` adds a uniform
// push (tiles) for the soft outer pass.
export function blobFor(world, x, y, code, salt, expand) {
  const cx = x + 0.5, cy = y + 0.5;
  const seed = world.seed + salt + code * 101;
  const push = (px, py, w, k) => {
    const n = valueNoise(px * 3.1 + k, py * 3.1, seed, 1.3) - 0.5;
    const amt = (w - 0.5) * BLEND * 1.5 + n * BLEND + expand;
    const f = 1 + 2 * amt;
    return p(cx + (px - cx) * f, cy + (py - cy) * f);
  };
  const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
  const weights = corners.map(([ax, ay]) => cornerWeight(world, ax, ay, code));
  const out = [];
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = corners[k], [bx, by] = corners[(k + 1) % 4];
    out.push(push(ax, ay, weights[k], 0));
    out.push(push((ax + bx) / 2, (ay + by) / 2, (weights[k] + weights[(k + 1) % 4]) / 2, 7));
  }
  return out;
}

const forTiles = (world, range, fn) => {
  for (let y = range.y0; y <= range.y1; y++) for (let x = range.x0; x <= range.x1; x++) if (inBounds(world.size, x, y)) fn(x, y, idx(world.size, x, y));
};

// One terrain layer in three passes: a soft, slightly larger pass in a paler tone; the main fill; and a
// second tone offset by (3, 2) art px on about 60% of tiles for texture. All tiles of the layer go into
// one path per pass, so overlapping blobs union instead of stacking alpha.
function drawLayer(g, world, range, code, style) {
  const passes = [
    { expand: 0.2, fill: style.soft, alpha: 0.5, dx: 0, dy: 0, salt: 1, pick: () => true },
    { expand: 0, fill: style.main, alpha: 1, dx: 0, dy: 0, salt: 1, pick: () => true },
    { expand: -0.05, fill: style.second, alpha: 0.55, dx: 3, dy: 2, salt: 2, pick: (x, y) => hash2(x, y, world.seed + 9) < 0.6 },
  ];
  for (const pass of passes) {
    const ctx = g.ctx;
    ctx.beginPath();
    let any = false;
    forTiles(world, range, (x, y, i) => {
      if (world.terrain[i] !== code || !pass.pick(x, y)) return;
      const pts = blobFor(world, x, y, code, pass.salt, pass.expand);
      ctx.moveTo((pts[0][0] + pass.dx) * g.scale, (pts[0][1] + pass.dy) * g.scale);
      for (let k = 1; k < pts.length; k++) ctx.lineTo((pts[k][0] + pass.dx) * g.scale, (pts[k][1] + pass.dy) * g.scale);
      ctx.closePath();
      any = true;
    });
    if (!any) continue;
    ctx.globalAlpha = pass.alpha;
    ctx.fillStyle = pass.fill;
    ctx.fill('nonzero');
    ctx.globalAlpha = 1;
  }
}
```

- [ ] **Step 5: Write the baker (part 2: ground, decoration, plots, grid, chunks)**

Append to `src/render/terrainBaker.js`:
```js
const isFree = (world, i) => !world.occ[i] && !world.road[i];
const nearType = (world, x, y, code) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => terrainAt(world, x + dx, y + dy, -1) === code);

// Sand everywhere, pale blotches and dots, then the blended layers, then the scatter that sells the blend:
// tufts across meadow borders, pebbles across rocky borders, mud on the banks, rocks, scrub and dunes.
export function drawGround(g, world, range) {
  const a = p(range.x0, range.y0), b = p(range.x1 + 1, range.y0), c = p(range.x1 + 1, range.y1 + 1), d = p(range.x0, range.y1 + 1);
  g.poly([a, b, c, d], TERRAIN.sand);
  const left = d[0], right = b[0], top = a[1], bottom = c[1];
  for (let i = 0; i < 24; i++) {
    const q = [left + hash2(i, 1, world.seed) * (right - left), top + hash2(i, 2, world.seed) * (bottom - top)];
    const rx = 14 + hash2(i, 3, world.seed) * 30;
    g.ell(q, rx, rx * 0.45, TERRAIN.blotches[i % 5], { alpha: 0.5 });
  }
  forTiles(world, range, (x, y, i) => {
    if (world.terrain[i] === T.WATER) return;
    for (let j = 0; j < 4; j++) g.circ(p(x + hash2(x, y, 40 + j), y + hash2(x, y, 50 + j)), 0.7, j % 2 ? TERRAIN.dotLight : TERRAIN.dotDark, { alpha: 0.7 });
  });
  drawLayer(g, world, range, T.ROCKY, { soft: TERRAIN.rockySoft, main: TERRAIN.rocky, second: TERRAIN.rockySecond });
  drawLayer(g, world, range, T.FERTILE, { soft: TERRAIN.fertileSoft, main: TERRAIN.fertile, second: TERRAIN.fertileSecond });
  drawLayer(g, world, range, T.MEADOW, { soft: TERRAIN.grassSoft, main: TERRAIN.grass, second: TERRAIN.grassSecond });
  drawLayer(g, world, range, T.BANK, { soft: TERRAIN.bankSecond, main: TERRAIN.bank, second: TERRAIN.bankSecond });
  forTiles(world, range, (x, y, i) => {
    const t = world.terrain[i];
    if (t === T.WATER || !isFree(world, i)) return;
    const r = hash2(x, y, world.seed + 3);
    if (t === T.MEADOW) tufts(g, x, y, 9, 0);
    else if (t !== T.BANK && nearType(world, x, y, T.MEADOW)) tufts(g, x, y, 3, 5);
    if (t === T.ROCKY || nearType(world, x, y, T.ROCKY)) {
      const n = t === T.ROCKY ? 3 : 1;
      for (let j = 0; j < n; j++) g.circ(p(x + hash2(x, y, 80 + j), y + hash2(x, y, 90 + j)), 0.9, j % 2 ? TERRAIN.pebbleLight : TERRAIN.pebble, { alpha: 0.8 });
    }
    if (t === T.BANK) {
      const q = p(x + 0.3 + r * 0.4, y + 0.3 + hash2(x, y, 4) * 0.4);
      g.ell(q, 5 + r * 5, 1.6, TERRAIN.mud, { alpha: 0.7 });
      g.ell([q[0] - 1, q[1] - 0.4], 3.5 + r * 3, 1.1, TERRAIN.mudDark, { alpha: 0.6 });
    }
    if (t === T.DESERT) {
      const cq = p(x + 0.5, y + 0.5);
      if (r < 0.05) rock(g, cq);
      else if (r < 0.11) scrub(g, cq);
      else if (r > 0.9 && valueNoise(x, y, world.seed + 5, 7) > 0.55) dune(g, cq);
    }
  });
}

// A soft pad under every building footprint touching the range, so plots and buildings fade into the ground.
export function drawPlots(g, world, range) {
  const seen = new Set();
  forTiles(world, range, (x, y, i) => {
    const id = world.occ[i];
    if (!id || seen.has(id)) return;
    seen.add(id);
    const b = world.buildings[id];
    if (!b) return;
    const c = p(b.x + b.w / 2, b.y + b.d / 2);
    g.radial(c, 15 * (b.w + b.d) / 2, 7.5 * (b.w + b.d) / 2, TERRAIN.plot, 0.9);
  });
}

// The faint tile grid 1c fades in while placing. Drawn per frame by the renderer, never baked.
export function drawTileGrid(g, range, alpha = 0.18) {
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) g.poly(tileDiamond(x, y), 'none', { stroke: TERRAIN.grid, strokeWidth: 0.5, strokeAlpha: alpha });
  }
}

// Draw everything under one chunk. Task 11 adds the river and roads between the ground and the plots.
export function bakeChunk(world, cx, cy, scale, createCanvas = defaultCreateCanvas) {
  const ox = cx * CHUNK, oy = cy * CHUNK;
  const left = -16 * CHUNK - CHUNK_MARGIN, right = 16 * CHUNK + CHUNK_MARGIN, top = -CHUNK_MARGIN, bottom = 16 * CHUNK + CHUNK_MARGIN;
  const canvas = createCanvas(Math.ceil((right - left) * scale), Math.ceil((bottom - top) * scale));
  const ctx = canvas.getContext('2d');
  const ax = -left * scale, ay = -top * scale;
  const o = p(ox, oy);
  ctx.translate(ax - o[0] * scale, ay - o[1] * scale); // art coordinates below are world tiles
  const g = makeDraw(ctx, scale);
  const range = { x0: ox - 2, y0: oy - 2, x1: ox + CHUNK + 1, y1: oy + CHUNK + 1 };
  g.save();
  g.clip([p(ox, oy), p(ox + CHUNK, oy), p(ox + CHUNK, oy + CHUNK), p(ox, oy + CHUNK)]);
  drawGround(g, world, range);
  drawPlots(g, world, range);
  g.restore();
  return { canvas, ax, ay, scale, cx, cy };
}

export function createTerrainBaker({ createCanvas = defaultCreateCanvas, counter = null, maxChunks = 48 } = {}) {
  const perWorld = new WeakMap(); // world -> Map(key -> { sig, sprite, used })
  let tick = 0;
  const mapFor = (world) => {
    let m = perWorld.get(world);
    if (!m) { m = new Map(); perWorld.set(world, m); }
    return m;
  };
  return {
    get(world, cx, cy, zoom, dpr, allowBake = true) {
      const scale = chunkScaleFor(zoom, dpr);
      const m = mapFor(world);
      const key = `${cx},${cy}@${scale}`;
      const sig = chunkSignature(world, cx, cy);
      let e = m.get(key);
      if (!e || e.sig !== sig) {
        if (!allowBake) return null;
        if (counter) counter.bakes = (counter.bakes || 0) + 1;
        e = { sig, sprite: bakeChunk(world, cx, cy, scale, createCanvas), used: 0 };
        m.set(key, e);
        if (m.size > maxChunks) {
          let oldest = null;
          for (const [k, v] of m) if (!oldest || v.used < m.get(oldest).used) oldest = k;
          m.delete(oldest);
        }
      }
      e.used = ++tick;
      return e.sprite;
    },
    size(world) { return mapFor(world).size; },
    clear(world) { perWorld.delete(world); },
  };
}
```

- [ ] **Step 6: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `terrain baker` PASS, then `ALL PASSED`. If the meadow pixel check fails, sample `chunkPixel(a, 15, 21)` and confirm the point is inside the baked diamond (tile (15, 21) is in chunk (0, 1)) and that the layer passes used `fill('nonzero')`.

- [ ] **Step 7: Commit**

```powershell
git add src/render/terrainBaker.js tests/helpers/renderWorld.js tests/render/terrainBaker.test.js tests/all.js
git commit -m "Bake blended terrain into chunks with change detection`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The river and the roads

**Files:**
- Create: `src/render/terrainWater.js`, `src/render/terrainRoads.js`
- Modify: `src/render/terrainBaker.js` (`bakeChunk`)
- Test: `tests/render/terrainRoads.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `p` (Task 2), `hash2`, `T`, `idx`, `inBounds`, the `TERRAIN` palette and `SHADOW`, `reeds` (Task 7), `bakeChunk` (Task 10).
- Produces (`terrainWater.js`):
  - `riverSpans(world) → Array<[xFirst, xLast] | null>` per row, cached per world (terrain never changes in Stage 1).
  - `riverBanks(world, y0, y1) → { left, right, centre }`: smooth bank points in tile coordinates for those rows, with the mock-up's sine wobble; `centre` entries are `[x, y, widthTiles]`.
  - `smoothPath(tilePoints) → segs`: a quadratic curve through the points, for the drawing helper.
  - `drawRiver(g, world, range)`: wet-sand fringe, the water body, a deep centre, shallow light edges, a foam line, ripples and reeds, drawn for rows a little beyond the range so the curve runs cleanly to the chunk edge.
- Produces (`terrainRoads.js`):
  - `roadSegments(world, range) → { segs: Array<[ax, ay, bx, by]>, dots: Array<[x, y]> }`: centre-to-centre segments between neighbouring road tiles for the range plus one tile around it, in row-major order with east before south; isolated tiles come back as dots.
  - `drawRoads(g, world, range)`: shadow, edge and top passes as continuous round-joined strokes, two wheel ruts per segment, and seeded pebbles.
- Modifies `bakeChunk` to call `drawRiver` after the ground and `drawRoads` after the plots.

- [ ] **Step 1: Write the failing tests**

`tests/render/terrainRoads.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { roadSegments } from '../../src/render/terrainRoads.js';
import { riverSpans, riverBanks, smoothPath } from '../../src/render/terrainWater.js';
import { bakeChunk, chunkSignature } from '../../src/render/terrainBaker.js';
import { TERRAIN } from '../../src/render/art/palette.js';
import { riverWorld, chunkPixel } from '../helpers/renderWorld.js';
import { setRoad } from '../helpers/testWorld.js';
import { nearColour } from '../helpers/canvas.js';

describe('river and roads', () => {
  it('lists road segments in a fixed order, east before south', () => {
    const w = riverWorld();
    const { segs, dots } = roadSegments(w, { x0: 0, y0: 0, x1: 31, y1: 31 });
    expect(segs[0]).toEqual([10, 12, 11, 12]);
    const east = segs.findIndex((s) => s.join() === [20, 12, 21, 12].join());
    const south = segs.findIndex((s) => s.join() === [20, 12, 20, 13].join());
    expect(east).toBeGreaterThan(-1);
    expect(south).toBe(east + 1);
    expect(segs.length).toBe(18 + 14);
    expect(dots).toEqual([]);
    setRoad(w, 2, 30, 2, 30);
    expect(roadSegments(w, { x0: 0, y0: 16, x1: 15, y1: 31 }).dots).toEqual([[2, 30]]);
  });
  it('only lists segments that touch the range or its ring', () => {
    const w = riverWorld();
    const { segs } = roadSegments(w, { x0: 16, y0: 16, x1: 31, y1: 31 });
    expect(segs.every(([ax, ay]) => ay >= 15)).toBe(true);
    expect(segs.some(([ax, ay, bx, by]) => by === 26)).toBe(true);
  });
  it('finds one water span per row and smooths the banks', () => {
    const w = riverWorld();
    const spans = riverSpans(w);
    expect(spans.length).toBe(32);
    expect(spans[0][1] - spans[0][0]).toBe(2);
    expect(riverSpans(w)).toBe(spans);
    const banks = riverBanks(w, 0, 31);
    expect(banks.left.length).toBe(32);
    expect(banks.centre[5][2]).toBe(3);
    const segs = smoothPath(banks.left);
    expect(segs[0][0]).toBe('M');
    expect(segs[1][0]).toBe('Q');
    expect(segs[segs.length - 1][0]).toBe('L');
  });
  it('paints water bluish and a road centre road-coloured', () => {
    const w = riverWorld();
    const s = bakeChunk(w, 0, 0, 2);
    const water = chunkPixel(s, 4, 8);
    expect(water[3]).toBe(255);
    expect(water[2]).toBeGreaterThan(water[0] + 20);
    expect(nearColour(chunkPixel(s, 15, 12), TERRAIN.road, 40)).toBe(true);
    expect(nearColour(chunkPixel(s, 15, 14), TERRAIN.road, 20)).toBe(false);
  });
  it('re-bakes a chunk when a road is drawn under it', () => {
    const w = riverWorld();
    const before = chunkSignature(w, 1, 1);
    setRoad(w, 24, 20, 28, 20);
    expect(chunkSignature(w, 1, 1) === before).toBe(false);
  });
});
```

Append to `tests/all.js`:
```js
import './render/terrainRoads.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "river and roads"`
Expected: `LOAD ERROR` naming `src/render/terrainRoads.js`.

- [ ] **Step 3: Write the river**

`src/render/terrainWater.js`:
```js
// The river as one smooth band (spec 5.2): wet-sand fringe, water with a deep centre and light shallows,
// a foam line, ripples and reeds. Mapgen gives one contiguous span of WATER per row, so the banks are
// curves through the row spans with the mock-up's gentle sine wobble.
import { p } from './iso.js';
import { hash2 } from '../sim/rng.js';
import { T } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';
import { TERRAIN } from './art/palette.js';
import { reeds } from './art/nature.js';

const spanCache = new WeakMap(); // world -> spans; terrain never changes in Stage 1

export function riverSpans(world) {
  let spans = spanCache.get(world);
  if (spans) return spans;
  spans = [];
  for (let y = 0; y < world.size; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < world.size; x++) {
      if (world.terrain[idx(world.size, x, y)] === T.WATER) { if (a < 0) a = x; b = x; }
    }
    spans.push(a < 0 ? null : [a, b]);
  }
  spanCache.set(world, spans);
  return spans;
}

const wobble = (y) => Math.sin(y * 1.3) * 0.12 + Math.sin(y * 0.47) * 0.18;

export function riverBanks(world, y0, y1) {
  const spans = riverSpans(world);
  const left = [], right = [], centre = [];
  for (let y = Math.max(0, y0); y <= Math.min(world.size - 1, y1); y++) {
    const s = spans[y];
    if (!s) continue;
    const w = wobble(y);
    left.push([s[0] - 0.05 + w, y + 0.5]);
    right.push([s[1] + 1.05 + w, y + 0.5]);
    centre.push([(s[0] + s[1] + 1) / 2 + w, y + 0.5, s[1] - s[0] + 1]);
  }
  return { left, right, centre };
}

// A quadratic curve through tile points: each point becomes a control point, with the curve passing
// through the midpoints between neighbours.
export function smoothPath(tilePoints) {
  const q = tilePoints.map(([x, y]) => p(x, y));
  if (!q.length) return [];
  const segs = [['M', q[0]]];
  for (let i = 1; i < q.length - 1; i++) segs.push(['Q', q[i], [(q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2]]);
  if (q.length > 1) segs.push(['L', q[q.length - 1]]);
  return segs;
}

function bandPath(left, right, grow) {
  const l = left.map(([x, y]) => [x - grow, y]);
  const r = right.map(([x, y]) => [x + grow, y]).reverse();
  const segs = smoothPath(l);
  const back = smoothPath(r);
  if (!segs.length || !back.length) return [];
  back[0][0] = 'L';
  return [...segs, ...back, ['Z']];
}

export function drawRiver(g, world, range) {
  const { left, right, centre } = riverBanks(world, range.y0 - 2, range.y1 + 2);
  if (left.length < 2) return;
  g.path(bandPath(left, right, 0.35), TERRAIN.bank, { alpha: 0.85 });
  g.path(bandPath(left, right, 0.15), '#CDBE8E', { alpha: 0.7 });
  g.path(bandPath(left, right, 0), TERRAIN.water);
  const minWidth = Math.min(...centre.map((c) => c[2]));
  const mid = smoothPath(centre);
  g.stroke(mid, TERRAIN.waterDeep, minWidth * 16 * 0.55, 0.85);
  g.stroke(mid, '#17596A', minWidth * 16 * 0.2, 0.5);
  for (const bank of [left, right]) {
    g.stroke(smoothPath(bank), TERRAIN.waterLight, 2.6, 0.7);
    g.stroke(smoothPath(bank), TERRAIN.foam, 1.1, 0.75);
  }
  const spans = riverSpans(world);
  for (let y = Math.max(0, range.y0); y <= Math.min(world.size - 1, range.y1); y++) {
    const s = spans[y];
    if (!s) continue;
    for (let x = s[0]; x <= s[1]; x++) {
      for (let j = 0; j < 2; j++) {
        const q = p(x + 0.15 + hash2(x, y, 11 + j) * 0.7, y + 0.15 + hash2(x, y, 21 + j) * 0.7);
        g.stroke([['M', q], ['Q', [q[0] + 3, q[1] - 1.4], [q[0] + 6, q[1]]]], TERRAIN.ripple, 0.7, 0.65);
      }
    }
    const w = wobble(y);
    for (let j = 0; j < 2; j++) {
      const t = 0.15 + hash2(y, j, world.seed) * 0.7;
      if (hash2(y, j + 4, world.seed) > 0.35) reeds(g, p(s[0] - 0.12 + w, y + t));
      if (hash2(y, j + 8, world.seed) > 0.35) reeds(g, p(s[1] + 1.12 + w, y + t));
    }
  }
}
```

- [ ] **Step 4: Write the roads and wire both into the baker**

`src/render/terrainRoads.js`:
```js
// Roads as continuous stroked paths through tile centres with round joins (spec 5.2): a soft shadow for
// worn edges, an edge tone, the top, two wheel ruts and seeded pebbles. Segments are listed in a fixed
// order so a chunk bakes identically every time.
import { p } from './iso.js';
import { hash2 } from '../sim/rng.js';
import { idx, inBounds } from '../sim/grid.js';
import { TERRAIN, SHADOW } from './art/palette.js';

const isRoad = (world, x, y) => inBounds(world.size, x, y) && Boolean(world.road[idx(world.size, x, y)]);

export function roadSegments(world, range) {
  const segs = [], dots = [];
  for (let y = range.y0 - 1; y <= range.y1 + 1; y++) {
    for (let x = range.x0 - 1; x <= range.x1 + 1; x++) {
      if (!isRoad(world, x, y)) continue;
      const e = isRoad(world, x + 1, y), s = isRoad(world, x, y + 1);
      if (e) segs.push([x, y, x + 1, y]);
      if (s) segs.push([x, y, x, y + 1]);
      if (!e && !s && !isRoad(world, x - 1, y) && !isRoad(world, x, y - 1)) dots.push([x, y]);
    }
  }
  return { segs, dots };
}

export function drawRoads(g, world, range) {
  const { segs, dots } = roadSegments(world, range);
  if (!segs.length && !dots.length) return;
  const path = [];
  for (const [ax, ay, bx, by] of segs) path.push(['M', p(ax + 0.5, ay + 0.5)], ['L', p(bx + 0.5, by + 0.5)]);
  for (const [c, w, a] of [[SHADOW, 15, 0.12], [TERRAIN.roadEdge, 12, 1], [TERRAIN.road, 10, 1]]) {
    if (path.length) g.stroke(path, c, w, a);
    for (const [x, y] of dots) g.circ(p(x + 0.5, y + 0.5), w / 2 * 0.6, c, { alpha: a });
  }
  const ruts = [];
  for (const [ax, ay, bx, by] of segs) {
    const alongX = ay === by;
    for (const o of [-0.12, 0.12]) {
      const ox = alongX ? 0 : o, oy = alongX ? o : 0;
      ruts.push(['M', p(ax + 0.5 + ox, ay + 0.5 + oy)], ['L', p(bx + 0.5 + ox, by + 0.5 + oy)]);
    }
  }
  if (ruts.length) g.stroke(ruts, TERRAIN.roadEdge, 0.7, 0.7);
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (!isRoad(world, x, y)) continue;
      for (let j = 0; j < 2; j++) {
        g.circ(p(x + 0.2 + hash2(x, y, 20 + j) * 0.6, y + 0.2 + hash2(x, y, 30 + j) * 0.6), 0.6, j ? TERRAIN.roadPebbleLight : TERRAIN.roadPebble);
      }
    }
  }
}
```

In `src/render/terrainBaker.js`, add the imports and the two calls inside `bakeChunk`:
```js
import { drawRiver } from './terrainWater.js';
import { drawRoads } from './terrainRoads.js';
```
```js
  g.clip([p(ox, oy), p(ox + CHUNK, oy), p(ox + CHUNK, oy + CHUNK), p(ox, oy + CHUNK)]);
  drawGround(g, world, range);
  drawRiver(g, world, range);
  drawPlots(g, world, range);
  drawRoads(g, world, range);
  g.restore();
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `river and roads` PASS, `terrain baker` still PASS, then `ALL PASSED`. If the road-centre colour check fails, check whether a pebble or rut landed on the sampled tile centre (print the pixel) and move the sample to tile (14, 12), which is also a plain road tile.

- [ ] **Step 6: Commit**

```powershell
git add src/render/terrainWater.js src/render/terrainRoads.js src/render/terrainBaker.js tests/render/terrainRoads.test.js tests/all.js
git commit -m "Draw the river as a smooth band and roads as continuous paths`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The renderer and the game loop

**Files:**
- Create: `src/render/renderer.js`, `src/render/loop.js`
- Test: `tests/render/renderer.test.js`, `tests/render/loop.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `visibleTileRange`, `visibleChunks`, `artToScreen`, `CHUNK` (Task 2), `ART`, `slotFor` (Tasks 5–8), `makeDraw` (Task 3), `groundShadow` (Task 4), `createSpriteCache`, `drawSprite` (Task 9), `createTerrainBaker`, `drawTileGrid` (Task 10), `tickDay`, `daysForSeconds` (`src/sim/clock.js`, Task 1).
- Produces (`renderer.js`):
  - `decorAt(world, x, y) → 'palm' | 'acacia' | null`: cosmetic trees on free meadow, fertile, bank and (rarely) desert tiles, decided by `hash2(x, y, seed + 7)`.
  - `collectObjects(world, range, walkers, registry = ART) → objects` sorted by `compareDepth`; each is `{ key, id, slot, def, x, y }` for buildings (with their registry entry in `def`), trees and walkers (`def` null, slot `fig.<kind>`, key `x + y + 0.01`).
  - `createRenderer({ canvas, spriteCache, baker, dpr, registry, maxBakesPerFrame = 2 }) → { renderFrame, stats, spriteCache, baker, dpr }`.
  - `renderFrame(world, cam, opts) → stats`. One frame: size the canvas to `view × dpr`, clear to off-map sand, draw visible chunks (baking at most `maxBakesPerFrame` stale chunks, skipping the rest until next frame), draw every object's ground shadows, draw the depth-sorted sprites, then `opts.effects.draw(g, now)`, `opts.drawOverlay(g, range)` and the grid. `opts` = `{ view: { width, height }, walkers: [], effects, drawOverlay, grid, now }`, all optional; `view` defaults to the canvas's CSS size. `stats` = `{ chunks, bakes, objects, sprites, ms, frames }`. Nothing here mutates the world.
- Produces (`loop.js`):
  - `MAX_FRAME_SECONDS = 0.25`, `MAX_DAYS_PER_FRAME = 12`.
  - `createGameLoop({ world, render, onEvents, raf, caf }) → { start(), stop(), tick(tMs), running, accumulator }`. Each frame converts the real time since the last frame (capped) into game-days with `daysForSeconds(world.speed, dt)`, accumulates, steps `tickDay(world, events)` for each whole day up to the cap, hands any events to `onEvents(events)`, then calls `render({ timeDays, dt, steps, now })` where `timeDays = world.day + fraction` for smooth walkers. `tick(t)` runs one frame by hand so tests never need `requestAnimationFrame`.

- [ ] **Step 1: Write the failing tests**

`tests/render/renderer.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createRenderer, decorAt, collectObjects } from '../../src/render/renderer.js';
import { createCamera } from '../../src/render/camera.js';
import { createSpriteCache } from '../../src/render/spriteCache.js';
import { createTerrainBaker } from '../../src/render/terrainBaker.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeCanvas, pixelAt, canvasHash } from '../helpers/canvas.js';

function setup(opts = {}) {
  const canvas = makeCanvas(400, 300);
  const counters = { sprite: { hits: 0, misses: 0 }, baker: { bakes: 0 } };
  const renderer = createRenderer({
    canvas, dpr: 1,
    spriteCache: createSpriteCache({ counter: counters.sprite }),
    baker: createTerrainBaker({ counter: counters.baker }),
    maxBakesPerFrame: opts.maxBakesPerFrame === undefined ? Infinity : opts.maxBakesPerFrame,
  });
  return { canvas, renderer, counters, view: { width: 400, height: 300 } };
}

describe('renderer', () => {
  it('renders one frame without a loop and reports what it drew', () => {
    const w = riverWorld();
    const { canvas, renderer, view } = setup();
    const cam = createCamera({ x: 18, y: 14, zoom: 1 });
    const stats = renderer.renderFrame(w, cam, { view });
    expect(stats.chunks).toBeGreaterThan(0);
    expect(stats.objects).toBeGreaterThanOrEqual(9);
    expect(stats.sprites).toBeGreaterThanOrEqual(9);
    expect(canvas.width).toBe(400);
    expect(pixelAt(canvas, 200, 150)[3]).toBe(255);
    const again = canvasHash(canvas);
    renderer.renderFrame(w, cam, { view });
    expect(canvasHash(canvas)).toBe(again);
  });
  it('never changes the world', () => {
    const w = riverWorld();
    const before = JSON.stringify(w);
    const { renderer, view } = setup();
    renderer.renderFrame(w, createCamera({ x: 18, y: 14, zoom: 1.3 }), { view, grid: true });
    expect(JSON.stringify(w)).toBe(before);
  });
  it('culls objects and chunks outside the view', () => {
    const w = riverWorld();
    const { renderer, view } = setup();
    const near = renderer.renderFrame(w, createCamera({ x: 18, y: 14, zoom: 2 }), { view }).objects;
    const far = renderer.renderFrame(w, createCamera({ x: 2, y: 30, zoom: 2 }), { view }).objects;
    expect(far).toBeLessThan(near);
  });
  it('spreads chunk bakes over frames', () => {
    const w = riverWorld();
    const { renderer, view, counters } = setup({ maxBakesPerFrame: 1 });
    const cam = createCamera({ x: 16, y: 16, zoom: 0.5 });
    const first = renderer.renderFrame(w, cam, { view });
    expect(first.bakes).toBe(1);
    expect(first.chunks).toBe(1);
    for (let i = 0; i < 6; i++) renderer.renderFrame(w, cam, { view });
    const settled = renderer.renderFrame(w, cam, { view });
    expect(settled.bakes).toBe(0);
    expect(settled.chunks).toBe(4);
    expect(counters.baker.bakes).toBe(4);
  });
  it('places trees deterministically on free ground only', () => {
    const w = riverWorld();
    let trees = 0;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const d = decorAt(w, x, y);
      expect(d).toBe(decorAt(w, x, y));
      if (d) { trees++; expect(w.occ[y * 32 + x]).toBe(0); expect(w.road[y * 32 + x]).toBe(0); }
    }
    expect(trees).toBeGreaterThan(0);
  });
  it('sorts objects by footprint centre with walkers between buildings', () => {
    const w = riverWorld();
    const objs = collectObjects(w, { x0: 0, y0: 0, x1: 31, y1: 31 }, [{ id: 1, kind: 'water', x: 14.5, y: 12.5 }]);
    for (let i = 1; i < objs.length; i++) expect(objs[i - 1].key <= objs[i].key).toBe(true);
    const walker = objs.find((o) => o.slot === 'fig.water');
    expect(walker.key).toBe(27.01);
    expect(objs.some((o) => o.slot === 'temple')).toBe(true);
  });
});
```

`tests/render/loop.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createGameLoop, MAX_FRAME_SECONDS, MAX_DAYS_PER_FRAME } from '../../src/render/loop.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

function harness(speed) {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 5, 11);
  w.speed = speed;
  const frames = [];
  const batches = [];
  const loop = createGameLoop({ world: w, render: (f) => frames.push(f), onEvents: (e) => batches.push(e), raf: () => 1, caf: () => {} });
  return { w, loop, frames, batches };
}

describe('game loop', () => {
  it('steps whole game-days on a fixed timestep', () => {
    const { w, loop, frames } = harness(1);
    loop.tick(0);
    expect(w.day).toBe(0);
    loop.tick(1000);
    expect(w.day).toBe(1);
    expect(Math.abs(frames[1].timeDays - 1.5) < 1e-9).toBe(true);
    loop.tick(2000);
    expect(w.day).toBe(3);
    expect(frames.length).toBe(3);
  });
  it('does nothing while paused and scales with speed', () => {
    const paused = harness(0);
    paused.loop.tick(0);
    paused.loop.tick(5000);
    expect(paused.w.day).toBe(0);
    expect(paused.frames[1].timeDays).toBe(0);
    const fast = harness(3);
    fast.loop.tick(0);
    fast.loop.tick(1000);
    expect(fast.w.day).toBe(4);
  });
  it('caps a long gap so a background tab never spirals', () => {
    const { w, loop } = harness(3);
    loop.tick(0);
    loop.tick(120000);
    expect(w.day).toBeLessThanOrEqual(Math.ceil(MAX_FRAME_SECONDS * 1.5 * 3));
    expect(w.day).toBeLessThanOrEqual(MAX_DAYS_PER_FRAME);
  });
  it('hands sim events to onEvents and never keeps them', () => {
    const { w, loop, batches } = harness(3);
    let t = 0;
    while (w.day < 10) { t += 250; loop.tick(t); }
    expect(batches.length).toBeGreaterThan(0);
    expect(batches[batches.length - 1].some((e) => e.type === 'arrivals')).toBe(true);
    expect(JSON.stringify(w).includes('arrivals')).toBe(false);
  });
  it('starts and stops through the injected frame scheduler', () => {
    let scheduled = 0, cancelled = 0;
    const w = makeTestWorld();
    const loop = createGameLoop({ world: w, render: () => {}, raf: () => { scheduled++; return 7; }, caf: () => { cancelled++; } });
    loop.start();
    loop.start();
    expect(scheduled).toBe(1);
    expect(loop.running).toBe(true);
    loop.stop();
    expect(cancelled).toBe(1);
    expect(loop.running).toBe(false);
  });
});
```

Append to `tests/all.js`:
```js
import './render/renderer.test.js';
import './render/loop.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "renderer"`
Expected: `LOAD ERROR` naming `src/render/renderer.js`.

- [ ] **Step 3: Write the game loop**

`src/render/loop.js`:
```js
// requestAnimationFrame driver with a fixed timestep of whole game-days (spec 7.4). The sim only ever
// sees tickDay, so the rules behave the same on every device; rendering gets a fractional day for motion.
import { tickDay, daysForSeconds } from '../sim/clock.js';

export const MAX_FRAME_SECONDS = 0.25; // a hidden tab or a hitch never becomes a burst of days
export const MAX_DAYS_PER_FRAME = 12;

export function createGameLoop({ world, render, onEvents = null, raf = (fn) => requestAnimationFrame(fn), caf = (id) => cancelAnimationFrame(id) }) {
  let last = null, acc = 0, handle = null, running = false;
  const events = [];

  function frame(t) {
    const dt = last === null ? 0 : Math.min(MAX_FRAME_SECONDS, Math.max(0, (t - last) / 1000));
    last = t;
    acc += daysForSeconds(world.speed, dt);
    let steps = 0;
    while (acc >= 1 && steps < MAX_DAYS_PER_FRAME) {
      tickDay(world, events);
      acc -= 1;
      steps++;
    }
    if (acc >= 1) acc %= 1;          // the cap left a backlog: drop it instead of spiralling
    if (world.speed === 0) acc = 0;
    if (events.length) {
      if (onEvents) onEvents(events.slice());
      events.length = 0;
    }
    render({ timeDays: world.day + acc, dt, steps, now: t });
    if (running) handle = raf(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = null;
      handle = raf(frame);
    },
    stop() {
      running = false;
      if (handle !== null) caf(handle);
      handle = null;
      last = null;
    },
    tick(t) { frame(t); },
    get running() { return running; },
    get accumulator() { return acc; },
  };
}
```

- [ ] **Step 4: Write the renderer**

`src/render/renderer.js`:
```js
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
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `renderer` and `game loop` PASS, then `ALL PASSED`. If "spreads chunk bakes over frames" sees more than 4 chunks, the test camera reaches past the 32×32 map; `visibleChunks` must clamp through `visibleTileRange` (it does, because the range is clamped to the map).

- [ ] **Step 6: Commit**

```powershell
git add src/render/renderer.js src/render/loop.js tests/render/renderer.test.js tests/render/loop.test.js tests/all.js
git commit -m "Compose frames from chunks and sprites, and drive the sim on a fixed timestep`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Cosmetic walkers

**Files:**
- Create: `src/render/walkers.js`
- Test: `tests/render/walkers.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `BUILDINGS`, `allBuildings`, `housesOf` (`src/sim/world.js`), `roadReach` (`src/sim/reach.js`, returns a cached read-only `Map<tileIndex, distance>` with adjacent road tiles at distance 1), `isWorking` (`src/sim/labour.js`), `idx`, `inBounds`, `NEIGHBOURS4`, `hash2`.
- Produces:
  - `WALKER_CAP = 40`, `TILES_PER_DAY = 3`, `CITIZEN_RANGE = 4`, `CITIZEN_SHARE = 0.15`, `KIND_BY_TYPE = { well: 'water', temple: 'priest', bazaar: 'porter', granary: 'porter' }`.
  - `walkerLoop(world, b, maxDist) → Array<{ x, y }>`: the round trip from the road tile next to the building out along the roads to the farthest tile it reaches and back (an empty list when no road touches it). Deterministic: ties break on the smaller tile index.
  - `walkersAt(world, timeDays) → Array<{ id, kind, x, y, dir }>`: one walker per working service building (its kind from `KIND_BY_TYPE`) plus citizens from about 15% of occupied houses, each placed along its loop at `timeDays × TILES_PER_DAY` tiles plus a per-building phase, interpolated smoothly between tiles; `x`, `y` are tile-centre coordinates; `dir` is 0 north, 1 east, 2 south, 3 west. At most `WALKER_CAP` walkers, taken in building-id order. Pure: the same world and time always give the same list, and nothing is written to the world. Loops are cached per world and `roadVersion`.

- [ ] **Step 1: Write the failing tests**

`tests/render/walkers.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { walkerLoop, walkersAt, WALKER_CAP, KIND_BY_TYPE } from '../../src/render/walkers.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

const onRoad = (w, wk) => Boolean(w.road[Math.floor(wk.y) * w.size + Math.floor(wk.x)]);

describe('walkers', () => {
  it('walks from the building out to the edge of its reach and back', () => {
    const w = riverWorld();
    const well = Object.values(w.buildings).find((b) => b.type === 'well');
    const loop = walkerLoop(w, well, 5);
    expect(loop[0]).toEqual({ x: 16, y: 12 });
    expect(loop.length).toBe(8);
    expect(loop.some((t) => t.x === 12 && t.y === 12)).toBe(true);
    for (let i = 1; i < loop.length; i++) expect(Math.abs(loop[i].x - loop[i - 1].x) + Math.abs(loop[i].y - loop[i - 1].y)).toBe(1);
  });
  it('is deterministic from the world and the time, and never writes the world', () => {
    const w = riverWorld();
    const before = JSON.stringify(w);
    const a = JSON.stringify(walkersAt(w, 3.7));
    const b = JSON.stringify(walkersAt(w, 3.7));
    expect(a).toBe(b);
    expect(a === JSON.stringify(walkersAt(w, 4.2))).toBe(false);
    expect(JSON.stringify(w)).toBe(before);
  });
  it('keeps every walker on a road tile and moves smoothly', () => {
    const w = riverWorld();
    for (let t = 0; t < 12; t += 0.37) {
      const list = walkersAt(w, t);
      expect(list.length).toBeGreaterThan(0);
      for (const wk of list) expect(onRoad(w, wk)).toBe(true);
      const next = walkersAt(w, t + 0.01);
      for (const wk of list) {
        const n = next.find((o) => o.id === wk.id);
        expect(Math.abs(n.x - wk.x) + Math.abs(n.y - wk.y)).toBeLessThan(0.1);
      }
    }
  });
  it('sends out the right kinds and only from working buildings', () => {
    const w = riverWorld();
    const kinds = new Set(walkersAt(w, 1).map((wk) => wk.kind));
    expect(kinds.has('water')).toBe(true);
    expect(kinds.has('priest')).toBe(true);
    expect(kinds.has('porter')).toBe(true);
    const temple = Object.values(w.buildings).find((b) => b.type === 'temple');
    temple.staff = 0;
    expect(walkersAt(w, 1).some((wk) => wk.kind === 'priest')).toBe(false);
    expect(KIND_BY_TYPE.well).toBe('water');
  });
  it('caps the crowd', () => {
    const w = makeTestWorld({ size: 64 });
    for (let y = 2; y < 62; y += 4) setRoad(w, 0, y, 63, y);
    for (let y = 2; y < 62; y += 4) for (let x = 1; x < 63; x += 6) addRaw(w, 'well', x, y + 1);
    staffAll(w);
    expect(walkersAt(w, 0.5).length).toBe(WALKER_CAP);
  });
});
```

Append to `tests/all.js`:
```js
import './render/walkers.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "walkers"`
Expected: `LOAD ERROR` naming `src/render/walkers.js`.

- [ ] **Step 3: Write the walkers**

`src/render/walkers.js`:
```js
// Cosmetic walkers (spec 4.5): water carriers, priests, porters and citizens pacing the roads inside each
// working building's reach. Positions are a pure function of the world and the time, so nothing is
// stored in the world and the same frame always looks the same.
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from '../sim/world.js';
import { roadReach } from '../sim/reach.js';
import { isWorking } from '../sim/labour.js';
import { idx, inBounds, NEIGHBOURS4 } from '../sim/grid.js';
import { hash2 } from '../sim/rng.js';

export const WALKER_CAP = 40;
export const TILES_PER_DAY = 3;   // at 1x a day lasts 2/3 s, so a tile takes about 0.22 s
export const CITIZEN_RANGE = 4;
export const CITIZEN_SHARE = 0.15;
export const KIND_BY_TYPE = { well: 'water', temple: 'priest', bazaar: 'porter', granary: 'porter' };

const reachFor = (def) => def.reach || def.supplyReach || def.producerReach || 6;

export function walkerLoop(world, b, maxDist) {
  const reach = roadReach(world, b, maxDist);
  if (!reach.size) return [];
  let far = -1, farD = -1;
  for (const [t, d] of reach) if (d > farD || (d === farD && t < far)) { far = t; farD = d; }
  const path = [far];
  let cur = far, d = farD;
  while (d > 1) {
    const x = cur % world.size, y = (cur - x) / world.size;
    let next = -1;
    for (const [dx, dy] of NEIGHBOURS4) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(world.size, nx, ny)) continue;
      const nt = idx(world.size, nx, ny);
      if (reach.get(nt) === d - 1 && (next < 0 || nt < next)) next = nt;
    }
    if (next < 0) break;
    path.push(next);
    cur = next;
    d--;
  }
  path.reverse();
  const tiles = path.map((t) => ({ x: t % world.size, y: (t - (t % world.size)) / world.size }));
  return tiles.concat(tiles.slice(1, -1).reverse());
}

const cache = new WeakMap(); // world -> { version, loops: Map<buildingId, loop> }

function loopFor(world, b, maxDist) {
  let c = cache.get(world);
  if (!c || c.version !== world.roadVersion) {
    c = { version: world.roadVersion, loops: new Map() };
    cache.set(world, c);
  }
  const key = `${b.id}:${maxDist}`;
  let loop = c.loops.get(key);
  if (!loop) {
    loop = walkerLoop(world, b, maxDist);
    c.loops.set(key, loop);
  }
  return loop;
}

function positionOn(loop, timeDays, id, kind) {
  if (!loop.length) return null;
  if (loop.length === 1) return { id, kind, x: loop[0].x + 0.5, y: loop[0].y + 0.5, dir: 2 };
  const phase = hash2(id, 0, 1) * loop.length;
  const s = (timeDays * TILES_PER_DAY + phase) % loop.length;
  const i = Math.floor(s), f = s - i;
  const a = loop[i], b = loop[(i + 1) % loop.length];
  const dir = b.x > a.x ? 1 : b.x < a.x ? 3 : b.y > a.y ? 2 : 0;
  return { id, kind, x: a.x + (b.x - a.x) * f + 0.5, y: a.y + (b.y - a.y) * f + 0.5, dir };
}

export function walkersAt(world, timeDays) {
  const out = [];
  for (const b of allBuildings(world)) {
    if (out.length >= WALKER_CAP) break;
    const kind = KIND_BY_TYPE[b.type];
    if (!kind || !isWorking(world, b)) continue;
    const w = positionOn(loopFor(world, b, reachFor(BUILDINGS[b.type])), timeDays, b.id, kind);
    if (w) out.push(w);
  }
  for (const h of housesOf(world)) {
    if (out.length >= WALKER_CAP) break;
    if (h.residents <= 0 || hash2(h.x, h.y, world.seed + 13) >= CITIZEN_SHARE) continue;
    const kind = hash2(h.x, h.y, world.seed + 14) < 0.5 ? 'citizen' : 'woman';
    const w = positionOn(loopFor(world, h, CITIZEN_RANGE), timeDays, h.id, kind);
    if (w) out.push(w);
  }
  return out;
}
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `walkers` PASS, then `ALL PASSED`. If the "right kinds" test misses `porter`, check that the bazaar and granary in `riverWorld` touch the road at y = 12 (bazaar at (22, 10) covers rows 10–11; granary at (17, 13) covers rows 13–14) and are staffed by `staffAll`.

- [ ] **Step 5: Commit**

```powershell
git add src/render/walkers.js tests/render/walkers.test.js tests/all.js
git commit -m "Add deterministic cosmetic walkers along in-reach roads`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Overlays, reach highlight and the placement ghost

**Files:**
- Create: `src/render/overlays.js`
- Test: `tests/render/overlays.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `houseStatus` (`src/sim/housing.js`), `housesOf`, `allBuildings`, `roadReach`, `BUILDINGS`, `p`, `tileDiamond`, `U`, the `UI` palette.
- Produces:
  - `OVERLAYS = ['water', 'food', 'religion', 'housing']`, `OVERLAY_HUE = { water: UI.water, food: UI.food, religion: UI.religion, housing: UI.housing }`, `SERVICE_TYPES = { water: ['well'], food: ['bazaar'], religion: ['temple'], housing: [] }`.
  - `houseMark(world, house, kind) → { has, need } | null`: for `water`, `food` and `religion`, whether the house's live checklist (`houseStatus`) has that need met; `null` when the house doesn't want it yet (too low a tier). For `housing`, `need` is the first unmet item in the checklist (the next blocking need) and `has` is true when nothing blocks.
  - `overlayMarks(world, kind, range = null) → Array<{ id, x, y, has, need }>` for every house in range with a non-null mark; `x`, `y` are the footprint centre.
  - `reachTiles(world, b) → number[]` tile indices the building reaches along the roads (`reach`, else `supplyReach`, else `producerReach`).
  - `drawOverlay(g, world, kind, range)`: tints the reach of every working service of that kind, then draws marks: a **filled dot** for has-it and a **hollow ring** for missing (spec 6.3), each with a white halo, raised a little above the footprint centre.
  - `drawReachHighlight(g, world, b)`: tints the building's reach and outlines its footprint, for the selected building.
  - `drawGhost(g, ghost)` with `ghost = { x, y, w, d, state }` and `state` one of `'ok' | 'warn' | 'bad'` (spec 6.5): ok = blue outline, light fill and a ✓; warn = amber outline and a !; bad = coral hatching and a ✕.
  - The renderer takes any of these through `opts.drawOverlay(g, range)`, so the dev page and 1c compose them.

- [ ] **Step 1: Write the failing tests**

`tests/render/overlays.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { OVERLAYS, houseMark, overlayMarks, reachTiles, drawOverlay, drawReachHighlight, drawGhost } from '../../src/render/overlays.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { UI } from '../../src/render/art/palette.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt, nearColour } from '../helpers/canvas.js';

function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}

function scene() {
  const c = makeCanvas(240, 200);
  const ctx = c.getContext('2d');
  ctx.translate(120, 60);
  return { c, g: makeDraw(ctx, 2) };
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('overlays', () => {
  it('classifies water, food and religion from the live checklist', () => {
    const w = street();
    const hut = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    const cottage = addRaw(w, 'house', 14, 11, { tier: 3, residents: 12, stock: { grain: 3 } });
    expect(houseMark(w, hut, 'water')).toEqual({ has: false, need: 'water' });
    expect(houseMark(w, hut, 'food')).toBe(null);
    addRaw(w, 'well', 13, 9);
    expect(houseMark(w, hut, 'water')).toEqual({ has: true, need: 'water' });
    expect(houseMark(w, cottage, 'food')).toEqual({ has: true, need: 'food' });
    expect(houseMark(w, cottage, 'religion')).toEqual({ has: false, need: 'religion' });
    addRaw(w, 'temple', 16, 8);
    staffAll(w);
    expect(houseMark(w, cottage, 'religion').has).toBe(true);
  });
  it('shows each home its next blocking need in the housing overlay', () => {
    const w = street();
    const hut = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    const plot = addRaw(w, 'house', 5, 20);
    expect(houseMark(w, hut, 'housing')).toEqual({ has: false, need: 'water' });
    expect(houseMark(w, plot, 'housing')).toEqual({ has: false, need: 'road' });
    addRaw(w, 'well', 13, 9);
    expect(houseMark(w, hut, 'housing')).toEqual({ has: true, need: null });
    const marks = overlayMarks(w, 'housing');
    expect(marks.length).toBe(2);
    expect(marks.find((m) => m.id === hut.id)).toEqual({ id: hut.id, x: 12.5, y: 11.5, has: true, need: null });
    expect(overlayMarks(w, 'water', { x0: 0, y0: 0, x1: 8, y1: 31 }).length).toBe(0);
    expect(OVERLAYS.length).toBe(4);
  });
  it('lists the tiles a building reaches', () => {
    const w = riverWorld();
    const well = Object.values(w.buildings).find((b) => b.type === 'well');
    const tiles = reachTiles(w, well);
    expect(tiles.length).toBe(9);
    expect(tiles).toContain(12 * 32 + 16);
    expect(tiles).toContain(12 * 32 + 12);
    expect(tiles).toContain(12 * 32 + 20);
    expect(tiles.includes(12 * 32 + 11)).toBe(false);
  });
  it('draws dots and rings, a reach highlight and the three ghost states', () => {
    const w = riverWorld();
    const full = { x0: 0, y0: 0, x1: 31, y1: 31 };
    const a = scene();
    drawOverlay(a.g, w, 'water', full);
    expect(inked(a.c)).toBeGreaterThan(10);
    const b = scene();
    drawReachHighlight(b.g, w, Object.values(w.buildings).find((o) => o.type === 'temple'));
    expect(inked(b.c)).toBeGreaterThan(10);
    const ok = scene();
    drawGhost(ok.g, { x: 0, y: 0, w: 1, d: 1, state: 'ok' });
    let blue = 0;
    for (let x = 80; x < 160; x += 2) for (let y = 56; y < 100; y += 2) if (nearColour(pixelAt(ok.c, x, y), UI.ok, 60)) blue++;
    expect(blue).toBeGreaterThan(5);
    const bad = scene();
    drawGhost(bad.g, { x: 0, y: 0, w: 2, d: 2, state: 'bad' });
    let coral = 0;
    for (let x = 60; x < 180; x += 2) for (let y = 60; y < 124; y += 2) if (nearColour(pixelAt(bad.c, x, y), UI.bad, 40)) coral++;
    expect(coral).toBeGreaterThan(20);
    const warn = scene();
    drawGhost(warn.g, { x: 0, y: 0, w: 1, d: 1, state: 'warn' });
    expect(inked(warn.c)).toBeGreaterThan(10);
  });
});
```

Append to `tests/all.js`:
```js
import './render/overlays.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "overlays"`
Expected: `LOAD ERROR` naming `src/render/overlays.js`.

- [ ] **Step 3: Write the overlays**

`src/render/overlays.js`:
```js
// Overlays (spec 6.3): filled dot = has it, hollow ring = missing, one hue per overlay. Plus the reach
// highlight for a selected building and the placement ghost's three states (spec 6.5).
import { BUILDINGS } from '../data/buildings.js';
import { housesOf, allBuildings } from '../sim/world.js';
import { houseStatus } from '../sim/housing.js';
import { roadReach } from '../sim/reach.js';
import { isWorking } from '../sim/labour.js';
import { p, U, tileDiamond, quad } from './iso.js';
import { UI } from './art/palette.js';

export const OVERLAYS = ['water', 'food', 'religion', 'housing'];
export const OVERLAY_HUE = { water: UI.water, food: UI.food, religion: UI.religion, housing: UI.housing };
export const SERVICE_TYPES = { water: ['well'], food: ['bazaar'], religion: ['temple'], housing: [] };

export function houseMark(world, house, kind) {
  const s = houseStatus(world, house);
  if (kind === 'housing') {
    const blocking = s.checklist.find((c) => !c.met);
    return { has: !blocking, need: blocking ? blocking.need : null };
  }
  const item = s.checklist.find((c) => c.need === kind);
  return item ? { has: item.met, need: kind } : null;
}

const inRange = (b, r) => !r || (b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0);

export function overlayMarks(world, kind, range = null) {
  const out = [];
  for (const h of housesOf(world)) {
    if (!inRange(h, range)) continue;
    const m = houseMark(world, h, kind);
    if (m) out.push({ id: h.id, x: h.x + h.w / 2, y: h.y + h.d / 2, has: m.has, need: m.need });
  }
  return out;
}

const reachOf = (def) => def.reach || def.supplyReach || def.producerReach || 0;

export function reachTiles(world, b) {
  const dist = reachOf(BUILDINGS[b.type]);
  return dist ? [...roadReach(world, b, dist).keys()] : [];
}

function tintTiles(g, world, tiles, color, alpha) {
  for (const t of tiles) {
    const x = t % world.size, y = (t - x) / world.size;
    g.poly(tileDiamond(x, y), color, { alpha });
  }
}

function mark(g, m, color) {
  const c = U(p(m.x, m.y), 6);
  if (m.has) {
    g.circ(c, 4.2, UI.halo, { alpha: 0.9 });
    g.circ(c, 3, color);
  } else {
    g.circ(c, 3.6, 'none', { stroke: UI.halo, strokeWidth: 3.2, strokeAlpha: 0.9 });
    g.circ(c, 3.6, 'none', { stroke: color, strokeWidth: 1.6 });
  }
}

export function drawOverlay(g, world, kind, range) {
  const color = OVERLAY_HUE[kind];
  for (const b of allBuildings(world)) {
    if (!SERVICE_TYPES[kind].includes(b.type) || !isWorking(world, b)) continue;
    tintTiles(g, world, reachTiles(world, b), color, 0.16);
  }
  for (const m of overlayMarks(world, kind, range)) mark(g, m, color);
}

export function drawReachHighlight(g, world, b) {
  tintTiles(g, world, reachTiles(world, b), UI.housing, 0.22);
  g.poly(quad(b.x, b.y, b.w, b.d, 0), 'none', { stroke: UI.halo, strokeWidth: 2.2, strokeAlpha: 0.9 });
  g.poly(quad(b.x, b.y, b.w, b.d, 0), 'none', { stroke: UI.housing, strokeWidth: 1.2 });
}

// ghost = { x, y, w, d, state: 'ok' | 'warn' | 'bad' }
export function drawGhost(g, ghost) {
  const { x, y, w, d, state } = ghost;
  const pts = quad(x, y, w, d, 0);
  const centre = p(x + w / 2, y + d / 2);
  if (state === 'bad') {
    g.save();
    g.clip(pts);
    g.poly(pts, UI.bad, { alpha: 0.18 });
    const left = p(x, y + d)[0], right = p(x + w, y)[0], top = p(x, y)[1], bottom = p(x + w, y + d)[1];
    for (let k = left - (bottom - top); k < right; k += 4) g.line([k, bottom], [k + (bottom - top), top], UI.bad, 1, 0.8);
    g.restore();
    g.poly(pts, 'none', { stroke: UI.bad, strokeWidth: 1.4 });
    g.text(centre, '✕', { size: 9, color: UI.bad });
    return;
  }
  const color = state === 'warn' ? UI.warn : UI.ok;
  g.poly(pts, color, { alpha: 0.15 });
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 2.6, strokeAlpha: 0.8 });
  g.poly(pts, 'none', { stroke: color, strokeWidth: 1.4 });
  g.text(centre, state === 'warn' ? '!' : '✓', { size: 9, color });
}
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `overlays` PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/render/overlays.js tests/render/overlays.test.js tests/all.js
git commit -m "Add the water, food, religion and housing overlays, reach highlight and placement ghost`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Feedback effects

**Files:**
- Create: `src/render/effects.js`
- Test: `tests/render/effects.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `TIERS` (`src/data/housing.js`), `p`, `U`, `quad`, the `UI` palette, `GOLD`, `TERRAIN`.
- Produces:
  - `EFFECT_MS = { puff: 600, glow: 1200, pulse: 1200, label: 1400 }`.
  - `prefersReducedMotion() → boolean` (safe when `matchMedia` is missing).
  - `createEffects({ reducedMotion = prefersReducedMotion(), onMilestone = null }) → effects` with:
    - `effects.puff(x, y, now)`: a dust puff at tile centre `(x, y)` (spec 5.4, placing). Skipped under reduced motion.
    - `effects.glow(x, y, now)` and `effects.pulse(x, y, now)`: the upgrade glow and the coral downgrade pulse. Skipped under reduced motion.
    - `effects.label(x, y, text, color, now)`: a rising label such as "+Shack". Always shown; it stays still under reduced motion.
    - `effects.fromEvents(world, events, now)`: turns sim events into effects: `upgrade` → glow + `+<tier name>` in gold; `downgrade` → pulse + `−<tier name>` (U+2212) in coral; `milestone` → `onMilestone(id)`; `arrivals` → nothing.
    - `effects.active(now)` the live list, `effects.count(now)`, `effects.draw(g, now)` which prunes expired effects and draws the rest in art px.
  - All times are milliseconds from the caller (the loop's `now`), never read inside, so tests drive them.

- [ ] **Step 1: Write the failing tests**

`tests/render/effects.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createEffects, EFFECT_MS, prefersReducedMotion } from '../../src/render/effects.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt } from '../helpers/canvas.js';

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

function scene() {
  const c = makeCanvas(200, 200);
  const ctx = c.getContext('2d');
  ctx.translate(100, 100);
  return { c, g: makeDraw(ctx, 2) };
}

describe('effects', () => {
  it('adds a puff that expires', () => {
    const fx = createEffects({ reducedMotion: false });
    fx.puff(3, 4, 1000);
    expect(fx.count(1000)).toBe(1);
    expect(fx.count(1000 + EFFECT_MS.puff - 1)).toBe(1);
    expect(fx.count(1000 + EFFECT_MS.puff + 1)).toBe(0);
  });
  it('turns sim events into glows, pulses and labels', () => {
    const w = makeTestWorld();
    const h = addRaw(w, 'house', 5, 5, { tier: 2, residents: 8 });
    const milestones = [];
    const fx = createEffects({ reducedMotion: false, onMilestone: (id) => milestones.push(id) });
    fx.fromEvents(w, [
      { type: 'upgrade', id: h.id, from: 1, to: 2 },
      { type: 'downgrade', id: h.id, from: 3, to: 2 },
      { type: 'milestone', id: 'town' },
      { type: 'arrivals', count: 5 },
      { type: 'upgrade', id: 9999, from: 1, to: 2 },
    ], 0);
    const live = fx.active(0);
    expect(live.filter((e) => e.kind === 'glow').length).toBe(1);
    expect(live.filter((e) => e.kind === 'pulse').length).toBe(1);
    expect(live.filter((e) => e.kind === 'label').map((e) => e.text)).toEqual(['+Shack', '−Shack']);
    expect(milestones).toEqual(['town']);
    expect(prefersReducedMotion() === true || prefersReducedMotion() === false).toBe(true);
  });
  it('keeps labels but drops puffs, glows and pulses under reduced motion', () => {
    const w = makeTestWorld();
    const h = addRaw(w, 'house', 5, 5, { tier: 2, residents: 8 });
    const fx = createEffects({ reducedMotion: true });
    fx.puff(1, 1, 0);
    fx.fromEvents(w, [{ type: 'upgrade', id: h.id, from: 1, to: 2 }], 0);
    const live = fx.active(0);
    expect(live.length).toBe(1);
    expect(live[0].kind).toBe('label');
    const { c, g } = scene();
    fx.draw(g, 100);
    const early = inked(c);
    const { c: c2, g: g2 } = scene();
    fx.draw(g2, 900);
    expect(early).toBeGreaterThan(0);
    expect(fx.labelLift(0.5)).toBe(0);
    expect(createEffects({ reducedMotion: false }).labelLift(0.5)).toBeGreaterThan(0);
    expect(inked(c2)).toBeGreaterThan(0);
  });
  it('draws puffs, glows and pulses with ink and prunes them afterwards', () => {
    const fx = createEffects({ reducedMotion: false });
    fx.puff(0, 0, 0);
    fx.glow(0, 0, 0);
    fx.pulse(0, 0, 0);
    const { c, g } = scene();
    fx.draw(g, 200);
    expect(inked(c)).toBeGreaterThan(20);
    fx.draw(g, 5000);
    expect(fx.count(5000)).toBe(0);
  });
});
```

Append to `tests/all.js`:
```js
import './render/effects.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "effects"`
Expected: `LOAD ERROR` naming `src/render/effects.js`.

- [ ] **Step 3: Write the effects**

`src/render/effects.js`:
```js
// Feedback effects (spec 5.4): a dust puff on placing, a glow and "+Shack" on upgrade, a coral pulse and
// "-Cottage" on downgrade, and a hook for the milestone banner (the banner itself is 1c's DOM). Under
// prefers-reduced-motion there are no puffs, glows or pulses, and labels stay still.
import { TIERS } from '../data/housing.js';
import { p, U, quad } from './iso.js';
import { UI, GOLD, TERRAIN } from './art/palette.js';

export const EFFECT_MS = { puff: 600, glow: 1200, pulse: 1200, label: 1400 };

export function prefersReducedMotion() {
  try { return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

export function createEffects({ reducedMotion = prefersReducedMotion(), onMilestone = null } = {}) {
  let list = [];
  const age = (e, now) => (now - e.start) / EFFECT_MS[e.kind];
  const prune = (now) => { list = list.filter((e) => age(e, now) < 1); };
  const add = (e) => { list.push(e); return e; };

  const fx = {
    reducedMotion,
    puff(x, y, now) { if (!reducedMotion) add({ kind: 'puff', x, y, start: now }); },
    glow(x, y, now) { if (!reducedMotion) add({ kind: 'glow', x, y, start: now }); },
    pulse(x, y, now) { if (!reducedMotion) add({ kind: 'pulse', x, y, start: now }); },
    label(x, y, text, color, now) { add({ kind: 'label', x, y, text, color, start: now }); },
    // How far (art px) a label has risen at progress t in 0..1. Still under reduced motion.
    labelLift(t) { return reducedMotion ? 0 : 10 * t; },
    fromEvents(world, events, now) {
      for (const ev of events) {
        if (ev.type === 'milestone') { if (onMilestone) onMilestone(ev.id); continue; }
        if (ev.type !== 'upgrade' && ev.type !== 'downgrade') continue;
        const b = world.buildings[ev.id];
        if (!b) continue;
        const cx = b.x + b.w / 2, cy = b.y + b.d / 2;
        const name = TIERS[ev.to] ? TIERS[ev.to].name : '';
        if (ev.type === 'upgrade') { fx.glow(cx, cy, now); fx.label(cx, cy, '+' + name, GOLD, now); }
        else { fx.pulse(cx, cy, now); fx.label(cx, cy, '−' + name, UI.bad, now); }
      }
    },
    active(now) { prune(now); return list.slice(); },
    count(now) { prune(now); return list.length; },
    draw(g, now) {
      prune(now);
      for (const e of list) {
        const t = age(e, now);
        const c = p(e.x, e.y);
        if (e.kind === 'puff') {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            const r = 4 + t * 10;
            g.circ([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.5 - t * 4], 2.5 - t * 1.5, TERRAIN.dotLight, { alpha: (1 - t) * 0.8 });
          }
        } else if (e.kind === 'glow') {
          g.poly(quad(e.x - 0.5, e.y - 0.5, 1, 1, 0), GOLD, { alpha: (1 - t) * 0.45 });
          g.poly(quad(e.x - 0.5, e.y - 0.5, 1, 1, 0), 'none', { stroke: GOLD, strokeWidth: 1.5 + t * 2, strokeAlpha: 1 - t });
        } else if (e.kind === 'pulse') {
          const r = 0.5 + t * 0.8;
          g.poly(quad(e.x - r, e.y - r, 2 * r, 2 * r, 0), 'none', { stroke: UI.bad, strokeWidth: 2 - t, strokeAlpha: 1 - t });
          g.poly(quad(e.x - 0.5, e.y - 0.5, 1, 1, 0), UI.bad, { alpha: (1 - t) * 0.25 });
        } else if (e.kind === 'label') {
          const q = U(c, 16 + fx.labelLift(t));
          g.text([q[0] + 0.6, q[1] + 0.6], e.text, { size: 7, color: UI.halo, alpha: Math.min(1, (1 - t) * 1.5) });
          g.text(q, e.text, { size: 7, color: e.color, alpha: Math.min(1, (1 - t) * 1.5) });
        }
      }
    },
  };
  return fx;
}
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `effects` PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/render/effects.js tests/render/effects.test.js tests/all.js
git commit -m "Add placement puffs, upgrade and downgrade effects, and the milestone hook`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: The dev page, sample city and dev controls

**Files:**
- Create: `src/dev/sampleCity.js`, `src/dev/devControls.js`, `dev.html`
- Test: `tests/dev/sampleCity.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `createWorld`, `population`, `dateParts`, the commands (`drawRoad`, `paintHouses`, `place`, `setSpeed`), `advanceDays`, `assignLabour`, `MILESTONES`, the camera, renderer, loop, walkers, overlays and effects (Tasks 2, 12–15).
- Produces (`sampleCity.js`):
  - `buildSampleCity(world, { days = 360 } = {}) → world`: a legal Stage 1 village laid through the public commands around the start road (main street, four cross streets, houses, wells, bazaar, temple, granaries, farms on fertile land), then `advanceDays(world, days)` so homes fill and climb, then `assignLabour`. Deterministic for a seed. Gold is restored to its value before building. Stage 1d reuses it behind the title card.
  - `buildStressCity(world, { days = 60 } = {}) → world`: a full 64×64 city: a road every fourth row (split around water), services every seven tiles beside each road, houses on both sides of every road. Because real immigration takes years, it then fills every home directly (tier 1–4 by a hash of its position, residents at capacity) before `advanceDays`, so the frame really is crowded. It is a stress fixture, not a legal play-through.
- Produces (`devControls.js`): `attachDevControls({ canvas, cam, world, state, view }) → detach()`. Keys: arrows or WASD pan, `+`/`-` zoom, `0`–`3` speed (through `setSpeed`), `O` cycles `state.overlay` through the overlays and off, `G` toggles `state.grid`, `R` reloads with the next seed. Mouse: drag pans, wheel zooms at the cursor. **Dev only: Stage 1c deletes this file.**
- Produces `dev.html` at the repo root: builds a seeded world (`?seed=N`, default 1), the sample city or (`?stress=1`) the stress city, renders full-window on a high-DPI canvas with the loop, walkers, effects and overlays, and shows a small HUD (date, speed, population, gold, mood, fps, frame ms, chunks, sprites, zoom, overlay, grid, the last milestone banner text, and the key list).

- [ ] **Step 1: Write the failing tests**

`tests/dev/sampleCity.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { buildSampleCity, buildStressCity } from '../../src/dev/sampleCity.js';
import { createWorld, population, allBuildings, housesOf } from '../../src/sim/world.js';
import { serialize } from '../../src/save/serialize.js';
import { ECONOMY } from '../../src/data/economy.js';

const countType = (w, type) => allBuildings(w).filter((b) => b.type === type).length;

describe('sample city', () => {
  it('builds a living village through the commands, deterministically', () => {
    const a = buildSampleCity(createWorld({ seed: 1 }));
    const b = buildSampleCity(createWorld({ seed: 1 }));
    expect(serialize(a)).toBe(serialize(b));
    expect(population(a)).toBeGreaterThan(150);
    expect(housesOf(a).length).toBeGreaterThan(40);
    for (const type of ['well', 'bazaar', 'temple', 'granary', 'farm_grain']) expect(countType(a, type)).toBeGreaterThan(0);
    expect(a.gold).toBeLessThan(ECONOMY.startGold + 5000);
    expect(Number.isFinite(a.gold)).toBe(true);
    expect(a.day).toBe(360);
  });
  it('builds a full stress city on a 64x64 map', () => {
    const w = buildStressCity(createWorld({ seed: 2 }));
    expect(housesOf(w).length).toBeGreaterThan(1200);
    expect(allBuildings(w).length - housesOf(w).length).toBeGreaterThan(80);
    expect(population(w)).toBeGreaterThan(5000);
    expect(housesOf(w).every((h) => h.tier >= 1)).toBe(true);
    expect(w.day).toBe(60);
  });
});
```

Append to `tests/all.js`:
```js
import './dev/sampleCity.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sample city"`
Expected: `LOAD ERROR` naming `src/dev/sampleCity.js`.

- [ ] **Step 3: Write the sample and stress cities**

`src/dev/sampleCity.js`:
```js
// Cities for the dev page (and, later, the title card), laid through the public commands so they are
// legal cities. Every call is deterministic for a seed: the commands are deterministic and so is the clock.
import { drawRoad, paintHouses, place } from '../sim/commands.js';
import { advanceDays } from '../sim/clock.js';
import { assignLabour } from '../sim/labour.js';
import { housesOf } from '../sim/world.js';
import { TIERS } from '../data/housing.js';
import { T } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';

const water = (world, x, y) => world.terrain[idx(world.size, x, y)] === T.WATER;

// Lays road west from (x0, y) one tile at a time until the river or the map edge stops it.
function roadWest(world, x0, y, minX) {
  for (let x = x0; x > minX; x--) {
    if (water(world, x - 1, y)) return x;
    if (!drawRoad(world, x, y, x - 1, y).ok) return x;
  }
  return minX;
}

export function buildSampleCity(world, { days = 360 } = {}) {
  const gold = world.gold;
  world.gold = 1e9;
  const ex = world.tradeEntry.x;
  const top = world.size - 10;                      // the start road already runs up to y = size - 9
  drawRoad(world, ex, top, ex, top - 24);
  const streets = [top - 4, top - 10, top - 16, top - 22];
  for (const y of streets) {
    drawRoad(world, ex, y, ex + 9, y);
    roadWest(world, ex, y, ex - 9);   // tile by tile, so the river can cut a street short without losing it
  }
  for (const y of streets) {
    place(world, 'well', ex - 5, y + 1);
    place(world, 'well', ex + 5, y + 1);
  }
  place(world, 'bazaar', ex + 1, top - 9);
  place(world, 'temple', ex - 3, top - 15);
  place(world, 'granary', ex + 1, top - 21);
  // Farms need fertile land, which lies west towards the river: run the lowest street out and try spots.
  const westEnd = roadWest(world, ex - 9, top - 4, 1);
  let farms = 0;
  for (let x = ex - 11; x >= westEnd && farms < 3; x--) if (place(world, 'farm_grain', x, top - 6).ok) { farms++; x--; }
  place(world, 'granary', ex - 12, top - 3);
  for (const y of streets) {
    paintHouses(world, ex - 9, y + 1, ex + 9, y + 1);
    paintHouses(world, ex - 9, y - 1, ex + 9, y - 1);
  }
  world.gold = gold;
  advanceDays(world, days);
  assignLabour(world);
  return world;
}

// A road along row y, split wherever the river crosses it.
function roadRow(world, y) {
  let start = null;
  for (let x = 0; x <= world.size; x++) {
    const blocked = x === world.size || water(world, x, y);
    if (!blocked && start === null) start = x;
    if (blocked && start !== null) {
      if (x - 1 > start) drawRoad(world, start, y, x - 1, y);
      start = null;
    }
  }
}

export function buildStressCity(world, { days = 60 } = {}) {
  const gold = world.gold;
  world.gold = 1e9;
  const size = world.size;
  const services = ['well', 'bazaar', 'temple', 'granary', 'farm_grain', 'well', 'granary'];
  for (let y = 2; y < size - 1; y += 4) roadRow(world, y);
  for (let y = 2; y < size - 3; y += 4) {
    for (let x = 1; x < size - 2; x += 7) place(world, services[(x / 7 + y / 4) % services.length | 0], x, y + 1);
  }
  for (let y = 2; y < size - 1; y += 4) {
    paintHouses(world, 0, y - 1, size - 1, y - 1);
    if (y + 1 < size) paintHouses(world, 0, y + 1, size - 1, y + 1);
  }
  // Fill the homes directly: a stress fixture needs a crowded frame now, not after years of arrivals.
  for (const h of housesOf(world)) {
    h.tier = 1 + ((h.x * 7 + h.y * 13) % 4);
    h.residents = TIERS[h.tier].capacity;
  }
  world.gold = gold;
  advanceDays(world, days);
  assignLabour(world);
  return world;
}
```

- [ ] **Step 4: Write the dev controls**

`src/dev/devControls.js`:
```js
// Dev-only controls for dev.html. Stage 1c builds the real input layer (gestures, mouse, keyboard) and
// deletes this file.
import { panBy, zoomAt } from '../render/camera.js';
import { setSpeed } from '../sim/commands.js';
import { OVERLAYS } from '../render/overlays.js';

export function attachDevControls({ canvas, cam, world, state, view }) {
  const step = 40;
  const centre = () => { const v = view(); return [v, v.width / 2, v.height / 2]; };
  const keys = (e) => {
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': panBy(cam, step, 0); break;
      case 'ArrowRight': case 'd': case 'D': panBy(cam, -step, 0); break;
      case 'ArrowUp': case 'w': case 'W': panBy(cam, 0, step); break;
      case 'ArrowDown': case 's': case 'S': panBy(cam, 0, -step); break;
      case '+': case '=': { const [v, cx, cy] = centre(); zoomAt(cam, v, 1.25, cx, cy); break; }
      case '-': case '_': { const [v, cx, cy] = centre(); zoomAt(cam, v, 0.8, cx, cy); break; }
      case '0': case '1': case '2': case '3': setSpeed(world, Number(e.key)); break;
      case 'o': case 'O': {
        const i = OVERLAYS.indexOf(state.overlay);
        state.overlay = i + 1 < OVERLAYS.length ? OVERLAYS[i + 1] : null;
        break;
      }
      case 'g': case 'G': state.grid = !state.grid; break;
      case 'r': case 'R': {
        const url = new URL(location.href);
        url.searchParams.set('seed', String((world.seed % 100000) + 1));
        location.href = url.href;
        break;
      }
      default: return;
    }
    e.preventDefault();
  };
  let drag = null;
  const down = (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); };
  const move = (e) => {
    if (!drag) return;
    panBy(cam, e.clientX - drag.x, e.clientY - drag.y);
    drag = { x: e.clientX, y: e.clientY };
  };
  const up = () => { drag = null; };
  const wheel = (e) => { zoomAt(cam, view(), e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY); e.preventDefault(); };
  window.addEventListener('keydown', keys);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: false });
  return () => {
    window.removeEventListener('keydown', keys);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('wheel', wheel);
  };
}
```

- [ ] **Step 5: Write the dev page**

`dev.html` (repo root):
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Thebes dev view</title>
<style>
  html, body { margin: 0; height: 100%; background: #DCC594; overflow: hidden; overscroll-behavior: none; }
  canvas { display: block; width: 100vw; height: 100vh; touch-action: none; }
  #hud { position: fixed; top: 8px; left: 8px; padding: 6px 10px; font: 13px/1.4 ui-monospace, Consolas, monospace;
         color: #3B2A14; background: rgba(250, 245, 236, 0.85); border-radius: 8px; white-space: pre; pointer-events: none; }
</style>
</head>
<body>
<canvas id="view"></canvas>
<div id="hud">loading</div>
<script type="module">
  // Dev page only (spec 7.2 has index.html + src/main.js as the real shell; that is Stage 1c and 1d).
  import { createWorld, population } from './src/sim/world.js';
  import { dateParts } from './src/sim/clock.js';
  import { MILESTONES } from './src/data/progression.js';
  import { createCamera } from './src/render/camera.js';
  import { createRenderer } from './src/render/renderer.js';
  import { createGameLoop } from './src/render/loop.js';
  import { walkersAt } from './src/render/walkers.js';
  import { drawOverlay } from './src/render/overlays.js';
  import { createEffects } from './src/render/effects.js';
  import { buildSampleCity, buildStressCity } from './src/dev/sampleCity.js';
  import { attachDevControls } from './src/dev/devControls.js';

  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed') || 1);
  const stress = params.get('stress') === '1';
  const world = createWorld({ seed });
  if (stress) buildStressCity(world); else buildSampleCity(world);
  world.speed = Number(params.get('speed') || 1);

  const canvas = document.getElementById('view');
  const hud = document.getElementById('hud');
  const cam = createCamera({ x: stress ? 32 : world.focus.x, y: stress ? 32 : world.focus.y, zoom: 1 });
  const renderer = createRenderer({ canvas });
  const state = { overlay: null, grid: false };
  const view = () => ({ width: window.innerWidth, height: window.innerHeight });
  let banner = '';
  const effects = createEffects({
    onMilestone: (id) => { const m = MILESTONES.find((x) => x.id === id); banner = `Your village is now a ${m ? m.name : id}`; },
  });
  attachDevControls({ canvas, cam, world, state, view });

  let fps = 0, frames = 0, lastFps = performance.now();
  const loop = createGameLoop({
    world,
    onEvents: (events) => effects.fromEvents(world, events, performance.now()),
    render: ({ timeDays, now }) => {
      const stats = renderer.renderFrame(world, cam, {
        view: view(),
        walkers: walkersAt(world, timeDays),
        effects,
        now,
        grid: state.grid,
        drawOverlay: state.overlay ? (g, range) => drawOverlay(g, world, state.overlay, range) : null,
      });
      frames++;
      if (now - lastFps > 500) { fps = Math.round((frames * 1000) / (now - lastFps)); frames = 0; lastFps = now; }
      const d = dateParts(world);
      hud.textContent = [
        `seed ${seed}${stress ? ' stress' : ''}  Y${d.year} M${d.month} D${d.day}  speed ${world.speed}x`,
        `pop ${population(world)}  gold ${world.gold}  mood ${world.mood}`,
        `${fps} fps  ${stats.ms.toFixed(1)} ms  chunks ${stats.chunks}  sprites ${stats.sprites}  zoom ${cam.zoom.toFixed(2)}`,
        `overlay ${state.overlay || 'off'}  grid ${state.grid ? 'on' : 'off'}  ${banner}`,
        'arrows/WASD pan  +/- zoom  0-3 speed  O overlay  G grid  R new seed  drag/wheel with the mouse',
      ].join('\n');
    },
  });
  loop.start();
  window.__thebes = { world, cam, renderer, loop, state };
</script>
</body>
</html>
```

- [ ] **Step 6: Run the tests, then look at the page**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `sample city` PASS, then `ALL PASSED`.

Then serve and open the page: `python tests/serve.py 8000 .` and visit `http://127.0.0.1:8000/dev.html`, `http://127.0.0.1:8000/dev.html?seed=7` and `http://127.0.0.1:8000/dev.html?stress=1`. Expected: a sand landscape with a teal river on the left, blended green meadows and soil, a village of whitewashed houses along roads, walkers moving, the HUD counting days, and `O` cycling the overlays. If the page is blank, open the browser console: a module error there is a missing export name.

- [ ] **Step 7: Commit**

```powershell
git add dev.html src/dev/sampleCity.js src/dev/devControls.js tests/dev/sampleCity.test.js tests/all.js
git commit -m "Add the dev page with a sample city, a stress city and dev controls`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Stress-frame budget, screenshots and the README

**Files:**
- Create: `tests/render/stress.test.js`, `tests/screenshot.ps1`
- Create: `docs/superpowers/notes/screenshots/` (PNG output)
- Modify: `README.md`, `tests/all.js`

**Interfaces:**
- Consumes: `buildStressCity` (Task 16), the renderer, walkers and camera.
- Produces:
  - A stress-frame test: a full 64×64 city rendered at laptop size; after warm-up frames, the median of five frames must be under 50 ms in headless Edge (the brief's generous budget; the runner uses the real clock).
  - `tests/screenshot.ps1 -Url <path> -Out <png> -Width <w> -Height <h>`: serves the repo, opens headless Edge at that size with a virtual-time budget so a few frames run, and writes a PNG. The controller uses it (or the built-in browser) to produce `docs/superpowers/notes/screenshots/1b-phone.png` (390×844), `1b-laptop.png` (1280×800) and `1b-stress.png` (1280×800, `?stress=1`) to show Joshua and to compare with the art reference.
  - README section "Dev view" describing `dev.html` and its keys.

- [ ] **Step 1: Write the failing test**

`tests/render/stress.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createCamera } from '../../src/render/camera.js';
import { walkersAt } from '../../src/render/walkers.js';
import { createWorld } from '../../src/sim/world.js';
import { buildStressCity } from '../../src/dev/sampleCity.js';
import { makeCanvas } from '../helpers/canvas.js';

describe('stress frame', () => {
  it('renders a full 64x64 city at laptop size well inside the frame budget once caches are warm', () => {
    const world = buildStressCity(createWorld({ seed: 3 }));
    const canvas = makeCanvas(1280, 800);
    const view = { width: 1280, height: 800 };
    const renderer = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: Infinity });
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const frame = (t) => renderer.renderFrame(world, cam, { view, walkers: walkersAt(world, t) });
    for (let i = 0; i < 3; i++) frame(i * 0.1);          // warm the chunk and sprite caches
    const times = [];
    for (let i = 0; i < 5; i++) {
      const started = performance.now();
      const stats = frame(1 + i * 0.1);
      times.push(performance.now() - started);
      expect(stats.bakes).toBe(0);
      expect(stats.sprites).toBeGreaterThan(200);
    }
    times.sort((a, b) => a - b);
    expect(times[2]).toBeLessThan(50);
    // Zoomed out, more is on screen; it must still finish in a sane time.
    const wide = createCamera({ x: 32, y: 32, zoom: 0.5 });
    renderer.renderFrame(world, wide, { view, walkers: walkersAt(world, 2) });
    const started = performance.now();
    renderer.renderFrame(world, wide, { view, walkers: walkersAt(world, 2.1) });
    expect(performance.now() - started).toBeLessThan(120);
  });
});
```

Append to `tests/all.js` (last, so it runs after everything else):
```js
import './render/stress.test.js';
```

- [ ] **Step 2: Run it**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "stress frame"`
Expected: PASS. If the median is over 50 ms, profile before changing budgets: the usual culprits are a sprite cache miss every frame (check `renderer.spriteCache.size()` stays flat between frames), chunk re-bakes (`stats.bakes` must be 0), or `walkersAt` recomputing loops (its cache keys on `roadVersion`, which must not change between frames). Only if the headless software renderer is simply slow on this machine, raise the budget to 80 ms and say so in the commit message.

- [ ] **Step 3: Write the screenshot script**

`tests/screenshot.ps1`:
```powershell
param([string]$Url = '/dev.html', [string]$Out = 'shot.png', [int]$Width = 1280, [int]$Height = 800, [int]$BudgetMs = 4000)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Output 'Microsoft Edge not found'; exit 2 }
$l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0); $l.Start(); $port = $l.LocalEndpoint.Port; $l.Stop()
$server = Start-Process -FilePath python -ArgumentList "`"$(Join-Path $PSScriptRoot 'serve.py')`"", "$port", "`"$root`"" -PassThru -WindowStyle Hidden
$profileDir = Join-Path $env:TEMP ('thebes-shot-' + [guid]::NewGuid().ToString('N'))
try {
  for ($i = 0; $i -lt 40; $i++) {
    try { if ((Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/dev.html" -TimeoutSec 2).StatusCode -eq 200) { break } } catch { Start-Sleep -Milliseconds 250 }
  }
  $outPath = if ([IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path (Get-Location) $Out }
  $dir = Split-Path -Parent $outPath
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
  $args = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    "--user-data-dir=`"$profileDir`"", "--window-size=$Width,$Height", "--virtual-time-budget=$BudgetMs",
    "--screenshot=`"$outPath`"", "http://127.0.0.1:$port$Url")
  $p = Start-Process -FilePath $edge -ArgumentList $args -PassThru -WindowStyle Hidden
  if (-not $p.WaitForExit(60000)) { Stop-Process -Id $p.Id -Force; Write-Output 'TIMEOUT'; exit 1 }
  if (Test-Path $outPath) { Write-Output "Wrote $outPath" } else { Write-Output 'NO SCREENSHOT'; exit 1 }
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
}
```

- [ ] **Step 4: Take the screenshots**

Run, from the repo root:
```powershell
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/dev.html?seed=1&speed=0' -Out docs/superpowers/notes/screenshots/1b-phone.png -Width 390 -Height 844
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/dev.html?seed=1&speed=0' -Out docs/superpowers/notes/screenshots/1b-laptop.png -Width 1280 -Height 800
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/dev.html?seed=1&stress=1&speed=0' -Out docs/superpowers/notes/screenshots/1b-stress.png -Width 1280 -Height 800
```
Expected: three PNGs. Open each and compare with `docs/superpowers/notes/art-reference/v4-new-era-style.html` and `blending-before-after.html` in a browser: whitewashed stacked houses with cool lavender shaded faces and soft violet ground shadows; blended grass and soil edges with tufts; a smooth teal river with foam and reeds; roads as continuous worn paths with ruts; the well, farm, granary, bazaar and temple recognisable at phone size. Note anything that differs from the reference in the commit message. The controller also opens the page in the built-in browser at phone and laptop sizes and shows Joshua the screenshots, as the brief requires.

- [ ] **Step 5: Update the README**

Add to `README.md` after "Run it locally":
```markdown
## Dev view

While the real interface is being built, `dev.html` shows the simulation running with the renderer:

    python tests/serve.py 8000 .

Then open http://localhost:8000/dev.html. Add `?seed=7` for another map, `?stress=1` for a full 64×64 city, or `&speed=0` to start paused. Keys: arrows or WASD pan, + and − zoom, 0–3 set the speed, O cycles the overlays, G toggles the tile grid, R reloads with the next seed. Drag to pan and use the wheel to zoom with a mouse.

`tests/screenshot.ps1 -Url '/dev.html?seed=1' -Out shot.png -Width 1280 -Height 800` saves a PNG of the page from headless Edge.
```

- [ ] **Step 6: Run the whole suite one last time**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: every test PASS, then `ALL PASSED`, exit code 0.

- [ ] **Step 7: Commit**

```powershell
git add tests/render/stress.test.js tests/screenshot.ps1 tests/all.js README.md docs/superpowers/notes/screenshots
git commit -m "Add the stress-frame budget test, a screenshot script and dev-view docs`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Spec coverage for this plan

| Spec section | Covered by |
|---|---|
| 4.5 Walkers for looks only, inside each building's reach | Task 13 |
| 5.1 Style: code-drawn, cool shadows, whitewash, stacked houses, colour from use, teal columns, painted gateways, people with props | Tasks 3–8 |
| 5.2 Blended terrain: noise-perturbed masks, tufts across borders, continuous roads with ruts and pebbles, smooth river with foam and reeds, plots fading into the ground, chunk baking with re-bake on change, placement grid hook | Tasks 10, 11 |
| 5.3 Readability: 64 px tiles at zoom 1, distinct tier silhouettes, service emblems | Tasks 2, 5, 6 |
| 5.4 Feedback: puff, glow "+Shack", pulse "−Cottage", milestone banner hook, gentle walkers, reduced motion | Tasks 13, 15 |
| 6.3 Overlays: water, food, religion, housing (next blocking need), filled dot versus hollow ring | Task 14 |
| 6.5 Placement states: blue outline + ✓, coral hatching + ✕, amber "won't work yet" | Task 14 |
| 7.1 Canvas, sharp on high-resolution screens | Tasks 9, 12 (dpr-aware sprites, chunks and canvas sizing) |
| 7.3 `render/` reads the world and never changes it | Every render task; checked by the renderer and walker tests |
| 7.4 Game loop: rAF, fixed timestep of whole game-days capped per frame; frame order chunks → sprites → figures and effects → overlays | Task 12 |
| 9 Performance budget: a crowded 64×64 stress city, terrain re-baking off the critical path | Tasks 12 (bake budget per frame), 16, 17 |
| Follow-ups "Plan 1b": event channel; change detection for building and tier changes | Tasks 1, 10 |

Out of scope here, by the brief: housing tiers 5–9, monuments, boats, the real UI (`index.html`, `src/main.js`, `src/ui/`), sound, saving to IndexedDB and publishing.

## Follow-ups for Plan 1c

- `src/dev/devControls.js` is the only input code; 1c replaces it with `src/ui/input.js`, `gestures.js` and `keyboard.js` and deletes it. `dev.html` can stay as a debugging page or go.
- The renderer takes overlays through `opts.drawOverlay(g, range)`; 1c composes `drawOverlay`, `drawReachHighlight` and `drawGhost` there, and uses `screenToTileIndex` for taps and hover.
- Walkers freeze when paused (`timeDays` stops). If a gently moving paused city is wanted behind the title card, 1d can pass its own clock to `walkersAt`.
- The milestone banner is a hook (`onMilestone`); the DOM banner and "New" badges are 1c.
- Signatures include house tiers, so a month in which many houses upgrade re-bakes their chunks (two per frame). If that ever shows as a hitch, drop the tier from the signature: tiers only change sprites, not terrain.

## Next plans

After this plan is executed, reviewed and merged, write plan **1c (interface and input)** against the real render API: the three layouts, modes, gestures, mouse and keyboard, sheets, minimap and alerts, consuming `screenToTileIndex`, the overlay drawers, `drawGhost`, the effects' `puff`, and the Plan 1c follow-ups in `docs/superpowers/notes/2026-10-09-stage-1a-followups.md`. Then plan **1d**.
