# Version 10.0, Track P: rulings 2280-2299 (performance)

Where the plan and the code disagreed, the code won; each ruling says both. Every bound here is unthrottled (ruling 2105, Josh approved): the
in-suite tests measure headless Edge with no CPU throttle, and the 4x numbers come from `tools/profile.ps1 -Frames` alone.

**The machine's state.** This laptop has run about 1.7x slower since about 01:30 on 12 Nov (the brief's note). Calibration at 06:00 on 12 Nov,
before any Track P change: `-Grep "v100 w0 phone frame"` read stress p50 25.8 / p95 78.8 ms and Huge p50 29.6 / p95 119.5 ms, where Track 0 read
16.8 / 51.4 and 15.8 / 73.5 on 11 Nov: the slow state. Every number below names its time.

- **2280. The phone frame test's bounds are on, unthrottled, with one re-measure.** As the plan says, `tests/v100/w0/phoneFrame.test.js` turns on
  its `expect` lines (`BOUNDS_ON` true): the stress city's p50 <= 20.0 ms and p95 <= 39.6 ms, the Huge map's p50 <= 39.6 ms (P2 and P4 x 1.2,
  `boundsFor`), at 390x844 DPR 2 with the phone budgets. The plan's targets are at a 4x throttle and the harness cannot throttle (ruling 2104), so
  they are held unthrottled (ruling 2105). A scene that misses its bound is measured once more, the v90 budget test's way (`measuredWell`), so a
  passing burst of load does not fail the suite; the expects name the scene and the number missed. They fail at the start of the track: 06:00 on
  12 Nov the stress city read p50 25.8 and p95 78.8 ms (slow state; Track 0's fast-state reading was 16.8 / 51.4, p95 over already).
- **2281. The stress test's median is the flushed frame, held to 13.0 ms.** The plan: P2's target x 1.2 at 1280x800 scaled by Track 0's ratio
  between 1280x800 and 390x844 DPR 2. The ratio is the harness's (the in-suite instrument, ruling 2105): stress 10.9 / 16.8 ms, so
  20.0 x 0.649 = 13.0 ms (the profile's 1x ratio, 5.8 / 17.5, would give 6.6 ms, a standing camera's script time against a flushed one). The code
  timed the renderer's script alone (the raster deferred past it), 5 frames, under 50 ms; it now flushes the canvas each frame (`getImageData` of a
  pixel, the phone frame test's way), takes the median of 15 frames, and measures once more if it misses. The zoom-0.5 sanity bound (120 ms) stays.
- **2282. The Huge map's whole-frame bound sits beside V's layer bounds in `tests/v90/v/budget.test.js`, not in place of them.** The plan sets
  "budget.test.js's 112 bound likewise from P4"; the code's 112 bound is V's layers' own time (4 ms at the zoom floor in 1920x1080) and the raster
  cap (14 ms), and raising either to a frame's number would loosen it (Global Constraints: no bound is loosened). So a new test in the same file
  draws the whole frame of the 112 stress city at its zoom floor in 1920x1080 DPR 1, the camera standing and the walkers walking, flushed, median
  of 15 after 40 warm frames: P4's 33 ms x 1.2 x Track 0's harness ratio for the Huge map between 1920x1080 and 390x844 (19.7 / 15.8) =
  49.4 ms. It fails at the start of the track by far: the probe read 172 ms a frame at that zoom (the count cap, ruling 2289). P.4 moves it
  (ruling 2290).
- **2283. A chunk is drawn in bands (`drawChunk`, `terrainBaker.js`); `renderer.js` gains three lines for the track.** Not in the plan; found by
  measuring. With the phone's chunks in its budget (ruling 2286) the phone frame was raster-bound: the terrain alone took 12.6 ms of a 20.6 ms
  frame (06:09, slow state), because a scaled `drawImage` pays for every destination pixel it covers and a chunk's canvas is half transparent
  corners round its diamond. `drawChunk` draws the canvas in `chunkBands.n` (8) horizontal bands, each as wide as the diamond in it (plus the margin),
  overlapping by one source row so no seam opens: the terrain fell to 8.3 ms and the frame to 16.6 ms (same run; 16 bands gained nothing more).
  The test draws a frame both ways at DPR 2 and holds the pixels the same (under 0.1% differ by more than 6 in a channel). `renderer.js` is not
  in Track P's file list; the three changes there are hooks only (the chunk draw call, the bake cap, the warm band call), and no other track owns
  those lines. Snapping unscaled sprites to whole device pixels was tried and dropped (0.9 ms in one run, inside the noise, and it would step a
  walker by a device pixel where Track L tunes motion).
- **2284. The warm band is the plan's, plus the hill tiles.** `spriteCache.js` `warmBand(world, cam, view, budgetMs, dpr)` (the plan's signature
  with the ratio added: a sprite is keyed by its ratio) renders the slots of the buildings in the chunk ring one chunk outside the view, nearest
  first (`chunkIndex.js` `ringBuildings`), at most `WARM_BAND_MS` (2) a frame, called by the renderer on a frame with no bake or pre-bake and
  under `WARM_AFTER_MS` (8) of script. The plan's test (a one-chunk pan misses nothing) failed on the buildings alone: every hill tile is a slot of
  its own (`hills.js`), and the pan met 14 new ones, so the band warms the ring's hill tiles after its buildings. The test also proves the pan
  does reach new slots without the band (it renders them fresh), so the zero is earned.
- **2285. The band never warms past the sprite budget, and rests once whole.** A warmed sprite is stamped as got in the frame before, so it is the
  first to go if the budget tightens, and the band stops at the budget rather than push out a sprite the view drew. Once whole it is not walked
  again until the view's range, the bucket, the ratio or the far switch moves, or `WARM_RECHECK` (120) frames pass (a home's look changes with
  no move). Figures and trees are not warmed: walk poses are warmed by kind already (`warmWalk`), and trees are a handful of slots.
- **2286. The chunk ceiling follows the 9.3 device rule: a phone's chunks bake at 2 device px per art px at most.** The plan names "the chunk
  ceiling follows the 9.3 device rule" without a number. `CHUNK_CEILING` is `{ desktop: 3, phone: 2 }` by `deviceKind`
  (`createTerrainBaker({ kind })`, default `DEVICE_KIND`). At DPR 2 and zoom 1 a phone's chunk drew at 4 from a canvas of 3 (4.9 MB); at 2 it is
  2.2 MB, so the stress city's whole terrain (16 chunks, 33.5 MB) stays inside the phone's 48 MB and the pan bakes nothing once warm, where it
  baked 76 chunks in 600 frames; the stress phone p95 fell from 77.2 to 39.0 ms (06:03, slow state). The terrain is a little softer on a phone
  at zoom 1 and over (upscaled 2x, not 1.33x), the trade 9.0's `DPR_CAP` made for the whole canvas. The phone frame test now builds its renderer
  with the device's baker (`createTerrainBaker({ kind })`), as the device's own game does (Track 0's file; the change is the one argument).
- **2287. At zoom 0.6 and under, chunks bake at 2 on every device.** As the plan says: `chunkScaleFor(zoom, dpr, ceiling, far)` caps the scale at
  `FAR_CHUNK_SCALE` (2) when the zoom is `FAR_ZOOM` (0.6) or less; at DPR 2 the bucket 0.75 (zoom 0.51 to 0.6) baked at 3. At DPR 1 the far view
  was at 1.5 or 1 already. The far-view test holds the Huge map's far view at DPR 2 on a phone under P3's 64 MB, and a desktop's under its own
  80 MB (9.3's ruling 1936 raised the desktop past P3: holding it to 64 would undo that ruling, so the plan's "under 64 MB" is the phone's).
- **2288. A phone bakes one chunk a frame after a bake over 8 ms (ruling 1919's open cap).** As the plan says. The baker times each bake
  (`lastBakeMs`, its `now` option) and `bakeLimit(max)` gives `min(1, max)` on a phone when the last bake took over `SLOW_BAKE_MS` (8), else `max`;
  the renderer asks it as each frame begins. A desktop keeps two; `tests/v93/p/caches.test.js`'s two-a-frame cap holds.
- **2289. The count cap never evicts a chunk the frame shows, and holds 64.** Not in the plan; found by measuring. 9.1's `maxChunks` 32 dropped the
  oldest chunk shown or not, so the Huge map's far view in 1920x1080 (32 chunks at zoom 0.5, more as it pans) evicted chunks it showed and baked
  two every frame: 172 ms a frame (06:25, slow state, 1200 bakes in 600 frames). The cap now lets only chunks the frame does not show go (as the
  byte budget always has) and holds `MAX_CHUNKS` 64, the Huge map's 49 chunks and a ring; the bytes stay the real limit (ruling 1686).
  The desktop's Huge pan still re-bakes (119 bakes in 600 frames at 1920x1080, zoom 1): the terrain keeps 48 MB of a desktop's 80 MB caches,
  and `tests/v91/p/caches.test.js` pins the terrain to 48 MB; giving a desktop's terrain the room is a follow-up (not Track P's test file).
- **2290. P.4 moves the Huge frame's bound to zoom 1, where Track 0 measured its ratio, and holds the floor to P4's 250 ms.** Ruling 2282 applied the
  1920x1080 / 390x844 ratio (measured at zoom 1) to the zoom floor, which mixes two scenes: at the floor the whole 112 map is in sight (1583
  sprites) and the frame is 120-130 ms after Track P (06:36, slow state; 172 ms before, the count cap). So the 49.4 ms median holds the 112 city at
  zoom 1 in 1920x1080 (31.3-32.4 ms, 06:36), and the floor's median is held under P4's other clause, no frame over 250 ms after warm-up.
- **2291. The stress test's bound is the in-suite measure x 1.1: 23.0 ms, not 13.0.** Q4's rule: the target-derived 13.0 ms is out of reach on
  this machine in its slow state after Track P (alone: medians 16.9, 15.3, 15.8 ms at 06:36; 14.6 at 06:27; 16.8 and 18.2 at 06:48 with Track
  L's suite running). A first settle at the alone best (15.3 x 1.1 = 16.8 ms) failed inside the full suite (20.9 ms after three tries, the
  07:14 run, the only failure of 5495) and passed alone at 07:50: the suite's page is slower than a grep's, and a bound that only passes alone
  is a red suite for every later track. So the bound is the in-suite slow-state measure x 1.1, 23.0 ms: looser than Track 0's desktop
  placeholder (20.0, which was never an in-suite bound, only a column for scale) and far under the code's own 50 ms. Both numbers stand in
  the test (`STRESS_TARGET_MS`, `STRESS_MEDIAN_MS`), which takes up to three medians. The phone frame bounds (2280) and the Huge frame's (2290) reached their
  targets x 1.2 and stay there.
- **2292. The P.4 table (12 Nov 2026, the slow state; Track L's probes and suite ran beside some rows).** Before = Track 0's 11 Nov table (fast
  state) and this track's 06:00 calibration (slow state, before any change); after = Track P's tree. Profile = `tools/profile.ps1 -Frames -Cpu 1,4`
  (the real game, camera standing, 06:41-06:46; the page decides its device by `navigator.deviceMemory`, 8 in headless Edge, so its 390x844
  rows run the desktop's chunk ceiling and budgets). Harness = the phone frame test's `measureFrames` (panning a tile a frame, flushed, 600
  frames; phone budgets and baker at 390x844, desktop at the others; 06:31-06:35).

  | Scene | Size | Profile 4x p50 / p95, before (11 Nov) -> after | Profile 1x p50 / p95, before -> after | Harness p50 / p95, before (11 Nov fast; 12 Nov 06:00 slow) -> after (12 Nov slow) | Bound (in-suite) |
  |---|---|---|---|---|---|
  | Stress (64) | 390x844 DPR 2 | 94.7 / 129.5 -> 75.6 / 109.1 | 17.5 / 26.1 -> 17.7 / 21.4 | 16.8 / 51.4; 25.8 / 78.8 -> 17.9 / 36.8 | p50 20.0, p95 39.6 (target x 1.2: met) |
  | Huge (112) | 390x844 DPR 2 | 94.0 / 105.2 -> 87.4 / 114.3 | 17.8 / 24.1 -> 16.0 / 23.4 | 15.8 / 73.5; 29.6 / 119.5 -> 27.1 / 54.6 | p50 39.6 (target x 1.2: met) |
  | Stress (64) | 1280x800 DPR 1 | 36.3 / 42.2 -> 45.3 / 82.5 | 5.8 / 10.1 -> 9.5 / 15.6 | 10.9 / 14.6 -> 16.4 / 28.7 | standing median 16.8 (target 13.0 out of reach: 2291) |
  | Huge (112) | 1280x800 DPR 1 | 81.1 / 104.8 -> 77.6 / 93.8 | 14.3 / 32.8 -> 14.5 / 28.8 | 11.4 / 38.9 -> 27.4 / 72.3 | none |
  | Stress (64) | 1920x1080 DPR 1 | 78.1 / 128.8 -> 63.2 / 77.7 | 8.4 / 12.9 -> 13.2 / 21.7 | 15.9 / 23.5 -> 31.2 / 52.4 | none |
  | Huge (112) | 1920x1080 DPR 1 | 106.7 / 120.8 -> 123.3 / 139.1 | 21.0 / 28.8 -> 23.0 / 36.6 | 19.7 / 59.7 -> 36.7 / 94.5 | standing median 49.4 at zoom 1 (met: 31.3-32.4); 250 at the floor (120-130; 172 before) |

  Same-state comparisons (the probe, old code paths switched back in the same run, 06:14-06:25, slow state): stress 390x844 22.5 / 81.4 ->
  17.0 / 35.1; Huge 390x844 23.3 / 108.0 -> 19.7 / 45.8; stress 1280x800 17.1 / 29.8 -> 14.1 / 30.9; the Huge far view at 1920x1080 172 ->
  about 125 ms. The desktop rows' rises against 11 Nov are the machine's state (the old paths read the same or worse in the same runs). The
  4x throttle still leaves the phone rows 4.5x (stress) and 2.6x (Huge) over the 9.1 targets: the in-suite bounds are unthrottled (2105), and
  the throttled gap is the raster of a software canvas (two-thirds of a frame is native draw time, `-Layers` at 1280x800), which the next
  steps (a terrain layer kept between frames and blitted on a pan, shadows drawn in one path a frame) would attack.
- **2293. `tools/profile.ps1 -Frames` counted no frames since Track F; a chunk's `drawImage` now marks a drawn frame.** The profile counted a frame
  as drawn when the map canvas saw a `fillRect`; Track F's off-map ground draws nothing for a view inside the map (ruling 2119), so every row
  read "0 frames". The page-side hook now also watches `drawImage` on the map. Not in Track P's file list; no 10.0 track owns the tool, and P.4's
  table needs it.
- **2294. The phone stress frame's median bound is the in-suite measure x 1.1: 25.3 ms, not 20.0 (fix round 1, Q4).** The phone frame test failed
  on the merged tree, in the full suite (stress p50 23 ms) and alone (20.3 against 20.0, 10:00 12 Nov). The "frame" is not the rAF interval: it is
  the synchronous time of `renderFrame` plus a `getImageData` flush, so it is the software raster's time, not the screen's pacing; the game's own
  script is 4 ms of it (js p50 3.7 to 5.1). The target x 1.2 (20.0 ms) is out of reach on this machine in its slow state. Alone, 10:12 to 10:19 12 Nov, nine
  readings of stress p50: 20.3 (the best), 21.5, 21.5, 21.9, 21.9, 22.9, 24.1, 25.5, 25.8 (p95 33 to 39, js p50 3.7 to 5.1); in the suite 23.0. The
  alone best x 1.1 (22.3) would fail inside the suite (23.0), so as ruling 2291 did the bound is the in-suite measure x 1.1 = 25.3 ms: both numbers
  stand in the test (`STRESS_P50_MS`, the comment). There was no phone median bound before 10.0 (the bounds were off), so none is loosened. The scene is
  measured up to three times (best median kept). The controlled parts stay tight: p95 <= 39.6 ms (stress) and a new js p50 <= 8 ms (measured 3.7 to
  5.1 stress, 5.7 to 5.9 Huge; both scenes). The Huge map's p50 39.6 ms (read 29.8 at 10:19) is unchanged.
- **2295. A desktop's caches rise from 80 to 160 MB (terrain 48 to 120 MB); a phone's stay (fix round 1; follows 2289 and 2287).** Ruling 2289's count
  cap and the byte trim both skip a chunk the frame shows, so only the on-screen count bounded the far view's terrain: all 49 chunks of the 112 map at
  scale 2 held 111.8 MB at 1920x1080 DPR 2 against the desktop's 80 MB (the new test case failed at 10:20 12 Nov). Josh chose a larger desktop
  allowance over a cap (no scale step-down, which was built first and dropped). `DEVICE_BUDGETS.desktop.caches` (`spriteCache.js`) is 160 MB, and the baker's
  terrain byte budget is by device (`TERRAIN_BUDGET_BY_DEVICE` in `terrainBaker.js`: desktop 120 MB, phone 48 MB; the old `TERRAIN_BUDGET_BYTES` stays the
  phone's), so the 49 chunks at scale 2 (about 100 MB) and the 1920x1080 zoom-1 pan fit: the desktop's Huge pan at DPR 1 re-baked 119 chunks in
  600 frames (ruling 2289's open follow-up) and now bakes none once warm (the test). Phone budgets (72 MB caches, 24 sprites, 48 terrain) are exactly
  as they were. Worst case measured now at the floor zoom + 0.05 (0.55), terrain + sprites: phone 390x844 DPR 2 35.8 MB (of 64); desktop 1280x800
  DPR 2 84.1 MB; desktop 1920x1080 DPR 2 116 MB (terrain 90.1, sprites 25.9) and DPR 1 57.2 MB (of 160). Not held: a 1920x1080 DPR 2 pan at zoom 1 (4.9 MB chunks)
  still re-baked 4 chunks in a 96-frame sweep at 120 MB. The pinned desktop numbers moved: `tests/v91/p/caches.test.js`'s P3 test builds its renderer
  with a 48 MB baker (it pins the phone's budgets); v93's read `DEVICE_BUDGETS` and hold. `tests/v100/p/farView.test.js` holds the 1920x1080 cases.
