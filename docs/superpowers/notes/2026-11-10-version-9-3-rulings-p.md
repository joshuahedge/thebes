# Version 9.3, Track P: the caches and the bar's contract (rulings 1935-1939)

One line each, with the cost if wrong.

Measured on version-9-3 at c8dde90 plus this branch (`tests/v93/p/scenes.js`): the stress city (64) and the 112 map, each in the Capital look and mid-rebuild (the Capital's front a third of the way out, the City's two thirds), 600 frames of the camera (zoom 1, 2, the map's floor, 0.75, 1, panning), with walkers, in headless Edge with no GPU. Bytes and evictions are exact; times are the lower of two runs while another track's balance runs shared the machine.

| Scene | View, DPR | Sprites peak / one frame's own (MB) | Terrain peak (MB) | Evictions / draws | p50 / p95 (ms) |
|---|---|---|---|---|---|
| 64 Capital | 1280x800, 1 | 17.0 / 10.4 | 47.7 | 0 / 516,554 | 17.3 / 191.2 |
| 64 Capital | 1280x800, 2 | 41.5 / 41.5 | 66.0 | 396 (0.1%) | 143.1 / 246.7 |
| 64 Capital | 390x844, 2 | 38.0 / 38.0 | 47.1 | 569 (0.2%) | 41.4 / 180.3 |
| 64 rebuild | 1280x800, 1 | 23.8 / 13.4 | 47.7 | 0 / 516,421 | 22.6 / 185.7 |
| 64 rebuild | 1280x800, 2 | 53.7 / 53.7 | 66.0 | 896 (0.2%) | 135.4 / 225.2 |
| 64 rebuild | 390x844, 2 | 47.7 / 47.7 | 47.1 | 1,171 (0.5%) | 42.1 / 181.7 |
| 112 Capital | 1280x800, 1 | 32.0 / 9.8 | 47.8 | 308 (0.04%) | 39.5 / 199.6 |
| 112 Capital | 1280x800, 2 | 39.3 / 39.3 | 94.3 | 1,580 (0.2%) | 175.6 / 297.8 |
| 112 Capital | 390x844, 2 | 26.2 / 26.2 | 66.0 | 1,209 (0.4%) | 52.7 / 198.3 |
| 112 rebuild | 1280x800, 1 | 32.0 / 10.9 | 47.8 | 392 (0.06%) | 40.4 / 203.3 |
| 112 rebuild | 1280x800, 2 | 43.7 / 43.7 | 94.3 | 2,548 (0.4%) | 175.2 / 305.1 |
| 112 rebuild | 390x844, 2 | 29.2 / 29.2 | 66.0 | 1,687 (0.5%) | 50.5 / 200.3 |

On 9.1's budgets (16 MB sprites, 64 MB together) the same scenes at DPR 2 evicted up to 1.8% of draws and drew 12,739 sprites again (112 rebuild, desktop) against 2,731 on the new ones; the phone's 112 rebuild 3,889 against 1,827. The p95 frames are the zoom changes (a bucket's sprites drawn again, and two chunk bakes). A chunk bakes in 7 to 14 ms (median) on the 64, 80 and 112 maps mid-rebuild, at worst 34 ms under load; no frame baked more than two.

- **1935. The scenes.** The caches are measured on the stress city and the 112 map in the Capital look and mid-rebuild, at DPR 1 and 2, desktop 1280x800 and phone 390x844, over 600 frames of a moving camera (`tests/v93/p/scenes.js`); the standing test runs mid-rebuild only (three looks at once, a superset of the Capital's slots, which evicted less in every scene). Cost if wrong: a busier scene (a Huge map at the floor with every effect) evicts more than measured.
- **1936. The budgets by device.** `DEVICE_BUDGETS` in `spriteCache.js`: a desktop keeps 32 MB of sprites and 80 MB of sprites and terrain together, a phone 24 MB and 72 MB (9.1: 16 MB and 64 MB everywhere); the terrain's own 48 MB and 16 MB floor stay, so with the sprites at their budget the terrain keeps all of its own. `deviceKind`: a desktop when `navigator.deviceMemory` is 8 (Chromium's top bucket), a phone when it reports less; where it reports nothing (Safari, Firefox), a phone when the screen's short side is under 768 px. The renderer takes `cachesBudget` so the 9.1 P3 tests run on the phone's budgets on any machine; P3 is now 72 MB and its worst-view bound 88 MB (was 64 and 80; marked WAVE2-PIN). Cost if wrong: a phone's tab reloads on a Capital mid-rebuild (the real-phone list's question), or a 4 GB laptop gets the phone's smaller cache.
- **1937. What a frame needs is still held.** At DPR 2 a frame at zoom 2 draws more sprites than either budget (up to 54 MB on a desktop, 48 MB on a phone), and the 112 map's far view shows up to 94 MB of chunks on a desktop; both are kept as 9.1 rules (never evict what the frame draws or shows), so the budgets bound what is kept between views, not a view's own need. Evictions stay under 0.5% of draws in every scene (the test's bound is 5%). Cost if wrong: a desktop at DPR 2 holds about 130 MB of canvas on the 112 map's far view.
- **1938. The bar's contract and what is exempt.** `art/primitives.js` counts the calls of `shadeWall`, `contactLine` and `insetOpening` (`PRIMITIVE_CALLS`; wave 0 had not added the hook the plan names), and `tests/v93/p/bar.test.js` draws every registry slot once. Exempt, with no wall face and no opening: figures, animals, carts, boats and units (`fig.*`), fields (`farm_*`), palms and acacias, hills (`hill.*`, registered as a map draws them), rubble and wrecks, the empty lot, and the open works (well, booth, clay pit, quarry, fishing wharf, ferry landing, garden, statue, plaza). Cost if wrong: one of these gains a wall and is never checked.
- **1939. Owed to the bar (Track B's art, for the wave 3 fix wave).** Buildings with walls that call none of the three: the plain keys kept for cards (`temple`, `granary.s2`, `brickworks.s1` and so on: the 9.2 drawings, still on the build menu's thumbnails), every service's and workshop's shut state (the barred plank door replaces the inset doorway, and nothing else in the drawing calls the bar), and every state of the trading post, the Quay, the brickworks and the gem mine; the card slots `wall` and `gate` too. No Track B drawing calls `shadeWall` or `contactLine` outside `services.js`. They are listed by name in the test, which fails on any new slot without the bar and passes as the list shrinks. Cost if wrong: the shut workshops and the Quay read a step below the bar beside working neighbours.
