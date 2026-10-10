# Stage 1b follow-ups

Carried forward from the Stage 1b reviews (per-task reviews and the final whole-branch review on 10 Oct 2026). Nothing here blocked the merge. Each item belongs to the plan that first touches the code in question.

## Plan 1c (interface and input)

- **Chunk cache memory.** A chunk canvas is 560×304 art px; at `CHUNK_MAX_SCALE = 3` that is about 6.1 MB, so a 64×64 map at one scale is 16 × 6.1 ≈ 98 MB on a dpr ≥ 2 phone, and stale entries at other scales add to it on desktops that zoom. Lower `maxChunks` to 32, purge other-scale entries for a chunk when it re-bakes at a new scale, trim `CHUNK_MARGIN` from 24 towards 4 art px (the clip dilation needs 1.5 device px), and try `CHUNK_MAX_SCALE = 2` on a real phone (terrain is soft; sprites stay crisp).
- **Stale-chunk fallback.** When the zoom bucket changes, every chunk goes stale at once and the renderer shows sand holes for a few frames (two bakes per frame). Let `baker.get` hand back the stale sprite while a fresh bake is pending.
- **Overlay cost.** `overlayMarks` calls `houseStatus` for every in-range house every frame, and `coveredBy` scans all buildings per need. Memoise marks per `(world, world.day, roadVersion)`: they only change on a tick. Reach tints also stack alpha where two services overlap and are not range-culled; union the tiles once per frame.
- **Walker speed.** `TILES_PER_DAY = 3` at 1.5 days per second is 4.5 tiles per second at 1× (13.5 at 3×), which reads brisk rather than "gentle" (spec 5.4). Try 1.5–2. Also: a building whose only reachable road is one tile gets a frozen walker (hide it or pace a neighbour); `walkersAt` now scans and sorts every candidate each frame (fine at 3 ms, but memoise if the HUD shows it).
- **Plot pads on sand.** Empty housing plots draw a `TERRAIN.plot` pad (#F2DFB5 at 0.9) that is lighter than sand, so a street of unoccupied plots reads as a row of pale scallops (see `1b-laptop.png` by the temple). Use a tone no lighter than the local sand at about 0.5 alpha, or drop the pad under tier-0 plots once 1c draws a placement outline. Josh to judge by eye.
- **Overlay legibility.** The food hue (#E2B13C) ring with a white halo is weak on sand; add a thin dark outer stroke to dots and rings. The ghost's ✓ and ✕ have no halo. `OVERLAY_HUE.water` equals `UI.ok`, so the water overlay and the can-place ghost share a blue. `drawOverlay` throws on an unknown kind; guard it before a UI toggle exists.
- **Input guards.** `clampZoom(NaN)` propagates NaN into the camera; `visibleTileRange`'s `pad` is replaced whole, not merged. The input layer should validate before calling. `src/dev/devControls.js` (to be deleted) hijacks Ctrl+R and drags on any mouse button; do not copy those habits.
- **Loop.** `tick()` on a running loop queues a second rAF chain (test-only hook; guard or document). The `MAX_DAYS_PER_FRAME` cap is unreachable at the current `DAYS_PER_SECOND` (max 1.125 days per frame at 3×); it is tested with an artificial speed.
- **Tests worth adding.** An overlap-strip seam test (bake two neighbouring chunks, hash the shared strip); per-kind colour probes for figures and overlays (today the kinds are told apart only by whole-canvas hashes); a `tb` guard for `h = 0` (NaN points) before tiers 5–9 use computed heights.
- **Art registry.** `height` means the tallest drawn point above the ground plane (max z-top); `bounds` must contain all ink (`tests/render/artBounds.test.js` enforces it for every slot). Tiers 5–9 and monuments must register the same way.

## Plan 1d (onboarding, saving, shipping)

- **PNG slots.** A PNG slot whose image fails to load is indistinguishable from one still loading (`pending` counts forever, no retry), and `ready()` could hang on an injected already-complete broken image. Add a failed flag before the first real PNG slot.
- **Sprite memory.** Sprite keys grow with each distinct dpr value (browser zoom); call `spriteCache.clear()` when dpr changes.
- **Sample city.** `buildSampleCity` is reused behind the title card; its west granary silently fails to place on some seeds and the farm count is terrain-dependent (0–3). The stress city is a fixture, not a legal play-through.
- **Screenshot tool.** `tests/screenshot.ps1` deletes the output PNG before capture (a failed run loses the old file) and stops only the main Edge process.

## Stage 2 and later

- **Sub-pixel sprites.** `drawSprite` does not snap to integer device px, so sprites can blur at fractional camera positions; snap if it shows.
- **Glow and pulse** effects draw a 1×1 tile for any building; 2×2 upgrades (tier 6+) will want the footprint.
- **River assumptions.** `riverSpans` fills `[first, last]` per row (a lake or a second channel would be over-filled) and `spanCache` never invalidates (terrain is immutable in Stage 1).
- **`chunkSignature` includes house tiers**, so a month in which many houses upgrade re-bakes their chunks (two per frame). Drop the tier from the signature if it ever shows as a hitch: tiers only change sprites, not terrain.
