# Brief for writing the Stage 1b (rendering) plan

Use this brief to write `docs/superpowers/plans/2026-10-10-thebes-stage-1b-rendering.md` with the superpowers writing-plans skill. Follow the skill exactly: header, Global Constraints, File Structure, tasks with Interfaces, full code in every code step, no placeholders, and a self-review. Match the style of the Stage 1a plan.

## Read first
1. **Spec (binding):** `docs/superpowers/specs/2026-10-09-thebes-design.md`. The parts that matter for 1b:
   - section 5 (art and feel);
   - 4.5 (walkers are cosmetic);
   - 6.3 (overlays: filled dot for has-it, hollow ring for missing, graded overlays in a single hue);
   - 7.1–7.4 (architecture, game loop and rendering);
   - 9 (testing).
2. **Format model:** `docs/superpowers/plans/2026-10-09-thebes-stage-1a-simulation-core.md`.
3. **Follow-ups:** `docs/superpowers/notes/2026-10-09-stage-1a-followups.md`. Its "Plan 1b" section is in scope: an event channel from the sim, and change detection for terrain rebakes.
4. **Real code:** read it so the plan uses the actual API.
   - `src/sim/*.js`, `src/data/*.js`
   - `tests/harness.js`, `tests/run-tests.ps1`, `tests/serve.py`, `tests/helpers/testWorld.js`, `tests/all.js`
5. **Approved art:** `docs/superpowers/notes/art-reference/` (the README, `v4-new-era-style.html` and `blending-before-after.html`). Port the SVG drawing functions to Canvas 2D, keeping the same geometry, palettes, lighting, face gradient, outlines, shadows and depth order.

## Scope
- **`dev.html` (repo root, dev only):**
  - Builds a seeded world with a sample city made through `commands.js`, runs the clock, and renders it full-window on a high-DPI canvas.
  - Dev keys: arrows or WASD to pan, +/− to zoom, 0–3 for speed, O to cycle overlays, plus a seed reload.
  - `?stress=1` loads a full 64×64 city.
  - Keep the dev controls in one small file that 1c can delete. The real UI is Stage 1c, so it's out of scope here.
- **`src/render/iso.js` and `src/render/camera.js`:** pure math.
  - Tile↔screen conversion at 64 px tile width at zoom 1, which is 2× the mock-up scale.
  - Camera `{ x, y, zoom }`, with zoom clamped to 0.5–2.
  - `screenToTile` (1c's input will use it), the visible tile range, and depth keys.
- **`src/render/art/*.js`:**
  - Canvas ports of the primitives: `tb`, `box`, `qd`, `crs`, door, window, parapet, mat, rug, pots, fence, stairs, ladder, awning, column, bed, pool, statue, palms, acacia, reeds, rocks, scrub and figures.
  - Stage 1 buildings: H1–H4, well, grain farm, granary, bazaar and temple. The farm is a fenced 2×2 field with grain rows plus a small farmhouse.
  - Use one shared drawing-context helper. Put the palettes in `src/render/art/palette.js`.
  - Tiers 5–9, monuments and boats come later. Make the registry easy to extend.
- **`src/render/spriteCache.js`:**
  - Art slots keyed by string (`house.t1`, `well`, …). Each slot is rendered once per zoom bucket and devicePixelRatio onto an offscreen canvas, with an anchor offset.
  - A slot must be able to point at a PNG later with no other code changes. A stub or a tiny implementation is enough for now.
- **`src/render/terrainBaker.js`:** blended terrain (spec 5.2) baked into 16×16 chunk canvases.
  - **Ground:** per-corner terrain weights plus value-noise masks give feathered edges over about ⅓ tile, with tufts and pebbles across borders.
  - **River:** a smooth curved band with a depth gradient, a foam line and reeds, using the WATER and BANK terrain codes.
  - **Roads:** continuous stroked paths through tile centres, with round joins, ruts and pebbles, drawn in a deterministic order.
  - **Plots:** fade into the ground.
  - **Decoration:** placed by a seeded cosmetic RNG. Render code may import `hash2` and `valueNoise` from `src/sim/rng.js`.
  - **Re-bake detection:** each frame, compute a per-chunk signature (a hash of the chunk's terrain, road and occupancy, plus the types and tiers there) for visible chunks. Re-bake only the chunks that changed. No sim change is needed.
  - **Grid toggle:** include a hook for the faint tile grid 1c will use while placing.
- **`src/render/renderer.js`:**
  - Each frame: clear, draw chunks, draw shadows on the ground, draw buildings depth-sorted by footprint centre, then figures and effects, then overlays. Cull to the camera range.
  - The `requestAnimationFrame` driver steps the sim in whole game-days on a fixed timestep, capped and scaled by speed, using `daysForSeconds`.
  - Tests must be able to render one frame without running the loop.
- **`src/render/walkers.js`:**
  - Cosmetic walkers along roads within each working service's reach: water carriers, priests and porters, plus some citizens.
  - They're deterministic from world plus time, never mutate the world, move smoothly between tiles, and are capped in number.
- **`src/render/overlays.js`:**
  - Water, food, religion and housing overlays. The housing overlay shows each home's next blocking need, using `houseStatus`.
  - A reach highlight for a selected building.
  - A placement-ghost drawer: valid shows an outline plus ✓; invalid shows coral hatching plus ✕.
- **`src/render/effects.js`:**
  - A dust puff on placement, a glow with "+Shack" on upgrade, a coral pulse with "−Cottage" on downgrade, and a milestone banner hook.
  - Respect `prefers-reduced-motion`.
- **Sim event channel:**
  - Optional, unsaved `events` parameters: `tickDay(world, events)` and `advanceDays(world, n, events)`, passed through `runMonth` and `monthlyHousing(world, events)`.
  - Events: `{ type: 'upgrade' | 'downgrade', id, from, to }`, `{ type: 'milestone', id }` and `{ type: 'arrivals', count }`.
  - Existing tests must keep passing, and determinism must be unaffected.
- **Performance:** about 60 fps for a full 64×64 city on a mid-range phone. Add a stress-frame test with a generous budget, for example under 50 ms per frame with warm caches in headless Edge (the runner uses the real clock).

## Tests
- **Unit tests:**
  - iso and camera round trips, culling and depth order;
  - sprite cache keys, bucketing and anchors, and cache hits counted with an injected counter;
  - the baker gives identical pixel hashes on re-bake, and only the changed chunk re-bakes;
  - road path order;
  - walkers stay on in-reach road tiles and are deterministic;
  - the overlay classification functions;
  - effects under reduced motion;
  - sim events are emitted correctly;
  - the stress-frame time budget.
- **Pixel sanity tests**, with loose tolerances: the well centre isn't transparent, water is bluish, a road centre is road-coloured.
- **Final task:** serve `dev.html` (`python tests/serve.py 8000 .`). The controller takes screenshots at phone and laptop sizes and compares them with the art reference.
- **Every task keeps the full suite green.** That's 160 tests now, plus the new ones.

## Constraints
- All the Stage 1a Global Constraints still apply:
  - no build step or npm;
  - deterministic `src/sim` (no `Math.random`, `Date` or `performance`);
  - tunables live in `src/data` (render palettes may live in `src/render/art/palette.js`);
  - a JSON-safe world, with caches kept outside it;
  - the commit trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  - no "Pharaoh" in code or game text;
  - LF line endings;
  - run from `C:\dev\thebes` in PowerShell.
- Render code may use `performance.now()` and `requestAnimationFrame`, but must never mutate the world.
- Aim for about 14–20 tasks. Split the art port by family: primitives, houses, services, nature, figures. Include the art code in full, translated faithfully, never summarised.
