# Stage 4.7 contract (Task 0)

Written 14 Oct 2026 on `stage-4-7` for Tasks 1-8 of `plans/2026-10-14-thebes-stage-4-7-land-and-logistics.md`. Binding: later tasks use these names and shapes; a task that must change one says so in a ruling.

## 1. World version 8 (ruling 468)

`WORLD_VERSION` is 8; `MIGRATIONS[7]` is `v7ToV8` in `src/save/migrate.js`. Shapes and their checks live in `src/data/s47.js` (a leaf data file: it imports nothing); `validateWorld` calls them.

| Field | Shape | New city / migrated |
|---|---|---|
| terrain `T.HILLS` (7) | a terrain value (`src/sim/terrain.js`) | none on any map yet (Task 3 places them) / never added |
| `world.oases` | `[{ x, y, r }]` (centre tile, radius in tiles; `isOasis`); a task may add fields inside a record | `generateMap(...).oases` copied (`[]` until Task 2) / `[]` |
| `b.orders` on every store (any `BUILDINGS` row with `stores`: granary, storehouse) | `{ [good]: { fetch } }`, good in the row's `stores`, fetch a number >= 0 (`isOrders`); Task 5 may add fields inside an order | `{}` (`makeBuilding`) / `{}` |
| `world.carts` | `[cart]`, see section 4 (`isCart`) | `[]` / `[]` |
| `world.mapParams.land` | `LAND_VERSION` (1) on maps with new land, absent otherwise | see section 3 / mapParams kept exactly (no `land`) |
| tallies | `S47_TALLY` = `oasisBuilds, cartTrips, cartGoods, quotasMet, quotasMissed` (`STAGE47_TALLY` in world.js) | 0 / 0 |

The migration never touches terrain or mapParams (tested on a classic and a `wide-bends` v7 city). Until Stage 4.7 is on main, a task may add a key to `S47_TALLY` or a field inside these records freely (version 8 is not out); a new top-level field must also go in `REQUIRED` (serialize.js), `createWorld` and `v7ToV8`.

## 2. passable and buildable (`src/sim/terrain.js`)

- `buildable(world, i)`: the ground is open land: not `WATER`, not `HILLS`. Terrain only; occupancy, roads and walls stay the caller's checks. Also the test for "dry land off the road net" where a bridge must not count.
- `passable(world, i)`: `buildable(world, i) || (WATER && road[i])` (a bridge). Hills are never passable; roads cannot be laid on hills, so a road tile is always passable.
- `groundRefusal(world, i)`: `null`, `'water'` or `'hills'`. Refusal words: `REASONS.hills` = "Hills: nothing can be built here" (text.js `s47` section at the end; Task 3 owns the hills' other words and may add a ground-chip line).

Routed through them (behaviour unchanged today: no map has hills):
- `sim/commands.js`: `tileReason` (every building, plot and plaza: `checkTiles`, `canPlace`, `conditionsFor`) -> `groundRefusal`; `roadTileReason` -> `groundRefusal` (water still bridgeable); `roadJoins` -> `buildable`.
- `sim/defence.js` `wallTileReason` -> `groundRefusal`.
- `sim/pathfinding.js` `tileCost` (raider flow fields, `ringGoals` in raids.js) -> `passable`.
- `sim/combat.js` `chariotGround` (and `chargeGround` on top of it) -> `passable`.
- `sim/armies.js` `landable` (boat landings) -> `buildable`.
- `sim/wildlife.js` `free` (herd spawn and moves) -> `passable` (herds also keep `groundOk`, desert/rocky only).
- `render/wildlife.js` `herdAnimals` footing -> `buildable` (no bridge, as before).
- `render/newcomers.js` `entryTree` (road walk) -> `passable`.
- `render/overlays.js` Ground overlay room and desirability bands -> `buildable`.
- Dev builders: `dev/sampleCity.js` `placeClayPit`, `dev/scenes.js` `freeLand` and the site search, `dev/s46/armies.js` `freeLand`, `dev/s46/river.js` road helpers -> `buildable`.

Left as they are (water as water, not passability): `sim/bridges.js` (bridge runs), `sim/fit.js` (`water` rule), `sim/flood.js` (floodplain), `sim/armies.js` river-mouth fill, `sim/wildlife.js` crocodile spots, `previewRoadTiles`' `onWater` (bridge verdicts), `sim/raids.js` rocky turn-back, `combat.js` `chargeGround`'s rocky test, render water/bank art, `ui/goalsList.js` `nearestTerrainTile` (exact terrain match; hills never match), `mapgen.js` (the generator). Not routed because there is no terrain check to route: **hunters** (`render/wildlife.js` `huntersOf`, straight lines) and **foot soldiers and archers** (`combat.js` `stepTowards`, straight lines that cross water today); Task 3 gives hunters (and herd moves, newcomers off-road if any) paths over `passable` (ruling 472) and decides whether foot units need it. Task 3 must also give `HILLS` a colour in `ui/minimap.js` and `ui/share.js` (they fall back to sand) and handle value 7 in `render/terrainBaker.js` (never seen today).

Carts (Task 5) walk roads, so a cart's path is road tiles, each `passable` by construction; check `passable` anyway when walking.

## 3. New land gate (Classic at Normal stays byte-identical)

`generateMap` sets `params.land = LAND_VERSION` when `newLandFor(variant, size)`: every map but classic at Normal (64); the same maps Stage 4.6 already varies. Read it with `hasNewLand(world)`. Rules:
- Terrain features (hills, oases, Task 1's repairs if not classic 64) are drawn inside `generateMap` only when `newLandFor` is true, and only with `S47_SALT` draws (`hash2(a, b, (seed + S47_SALT.x) | 0)` or `createRng((seed ^ S47_SALT.x) >>> 0)`), never the generator's rng stream. Shape choices go into `params` beside `land` (e.g. `params.hills`, `params.oases` counts or lists, `params.grass`).
- Render-only land (the grass band, its decor) is drawn only when `hasNewLand(world)`: a v7 city (no `land`) and classic at Normal draw exactly as today.
- `tests/stage46/contract/mapSizes.test.js` fingerprints and `tests/stage47/contract` (classic 64: params `{}`, oases `[]`) guard this.

## 4. Carts and orders (Tasks 5-6)

Cart: `{ id, from, to, good, amount, len, left, turn, due, state }`.
- `id`: the fetching store's id (one cart per store, so no counter); render ids add Task 6's own base.
- `from`: source store id; `to`: fetching (home) store id.
- `good`, `amount` (units carried; taken from `from` the day it sets out), `len` (road tiles one way when it set out).
- `left` (day set out), `turn` (day it reaches `from`), `due` (day it is home). Integers.
- `state`: `'out'` | `'back'` | `'return'` (`CART_STATES`; `return`: the road broke and the goods go back to the source). Task 5 owns the timing rules; if it needs another state or field it adds it in `s47.js` and says so.

Orders: `b.orders[good] = { fetch }`, absent good = not fetching. Data for trip size, speed and default amount belongs in a Task 5 data block (plan: 20 a trip, 8 road tiles a day, default 100).

## 5. Salts (`S47_SALT`, 4701-4719; `tests/stage47/contract` checks uniqueness game-wide)

hills 4701, hillShape 4702, hillSkirt 4703, oases 4704, oasisShape 4705, grass 4706 (render), grassDecor 4707 (render), resources 4708 (Task 1), carts 4709, cartLook 4710 (render), spare1-4 4711-4714. Add new ones inside the range.

## 6. Tests and dev scenes

- `tests/stage47/all.js` (imported by `tests/all.js`); each task adds `tests/stage47/<task>/...` there. Describe names `s47 <area>`; Task 0's are `s47 contract`.
- Dev scenes in `src/dev/s47/index.js` (`S47_SCENES`, joined in `src/dev/scenes.js`): `s47-grass`, `s47-oasis` (Task 2), `s47-hills` (Task 3), `s47-house-spots` (Task 4), `s47-carts` (Tasks 5-6). Each is a `stub` (from `src/dev/s46/base.js`) until its task replaces the entry with `async (api, options) => description`, using `inGame`, `wait`, `sampleAt` (opens a fresh sample city at a size, whole map in view; pass `{ variant }` for a non-classic map with new land) or a helper file beside `index.js`. Open `/?skipTitle=1&nosw=1&seed=11&sample=1` first.

## 7. Performance budget for Task 2

Stage 4.6 never timed the terrain bake on its own. The binding figure is Stage 4.6 contract section 9: Large (80) stress city at zoom 0.5, mean frame 27.6 ms (1.56x Normal's 17.7 ms; the line is 1.6x), median 12.3 ms; zoom 1 mean 20.1 ms. Task 2 measures the same scene (`tests/screenshot.ps1 -Width 390 -Height 844 -Dpr 2`, `/?skipTitle=1&nosw=1&stress=1&seed=3&size=80`; classic at 80 already has new land, `&variant=` picks a layout) before and after the grass band, plus a cold bake of all 25 chunks, and keeps Large within the 1.6x line against Normal and within 10% of its own before-figure (Task 0's proposal).

## 8. Task 2 additions (green band and oases; binding for later tasks)

- **Generator order (Tasks 3 on, read this).** `generateMap` edits the terrain in this order: river, island, lake, outcrops, pools, groves, clay, start road, **oases (Task 2)**, [hills (Task 3) go here, after the oases or before them but always before the repair], then `repairResources` (Task 1), which must stay the LAST terrain edit so the resource guarantee holds on the map the player gets (tested over 200 seeds per size and layout). Dunes, wadis, entries and params after it are decor and must not write the terrain. Hills must keep off oases (`world.oases`: the pool's centre and radius `r`, plus a margin: the oasis keeps open desert or meadow for 5 tiles round its centre, its fertile ring and clay inside that) and keep the connectivity invariant with the oases' pools in place.
- **Oases** (`src/sim/oases.js`, data `OASES` in `src/data/s47.js`): `world.oases = [{ x, y, r }]`, `r` the radius in tiles that holds every pool tile (centre tile to the farthest pool tile plus 0.5). 0-1 / 0-2 / 1-3 by size (`oasisRange`), pool 3-8 water tiles, a bank, a fertile ring (loam) and 3-7 clay tiles; always at least 12 tiles (Chebyshev) from any other water, 8 from an edge, 16 from the start area's centre, 12 from a raider entry or the trade entry, 14 from another oasis, and the bridge spot and every start-area-to-entry connection exactly as they were without it (the generator tries the next draw otherwise). Queries: `inOasisPool(world, x, y)`, `oasisNear(world, x, y, tiles)`, `poolTiles(world)`, `noteBuilt`. An oasis pool is water to everything (raiders, roads, bridges); only the fishing wharf does not count it (fit.js `needs_river`, words "Must touch the river": `REASONS.needs_river`, groundChip and refusalLine in the s47 section of text.js). The Nilometer too: it measures the river's flood, so it also refuses an oasis pool (`riverOnly` on its row, Task 2 review minor). "Within 4 tiles" of an oasis (`oasisNear`) is measured to the nearest pool tile, not the centre.
- **The first.** `first_oasis` ("An oasis in the desert"): tally `oasisBuilds`, counted by `noteBuilt` in `place`, `paintHouseTiles` and `paintPlazaTiles` for any building (not rubble) with a footprint tile within `OASES.near` (4) tiles of an oasis's pool (centre distance <= r + 4). The tip `oasis_green` (trigger `oasisBuilt`) is in TIPS and so in How to play (`TIP_HELP_TEXT`); the Map seam (`src/ui/s46/map.js` `onCommand`) fires `oasisBuilt` for a placed building within reach.
- **Herds** (`sim/wildlife.js` `spotFor`): on a map with oases, `OASES.herdShare` (half) of a herd's spawn tries aim at a seeded oasis, `OASES.herdReach` tiles from its pool's edge, with `S47_SALT.herdOasis` (4712, was spare2). A map with none draws exactly as before.
- **The green band** (`src/render/grass.js`): `moistureOf(world)` returns a per-tile 0..1 field, or `null` when `!hasNewLand(world)` (classic at Normal and pre-version-8 cities: nothing drawn differently, tested). Distance to water (river and lakes reach `GRASS.river` 14 tiles, an oasis pool `GRASS.oasis` 6, its own halo), pushed about by two octaves of value noise and a per-tile jitter (`S47_SALT.grass` 4706). It drives the bake (`drawGrassBand` in `terrainBaker.js`: six stacked tint passes over sand, loam and meadow, then the bank, clay and tufts over it; rock untouched), the baked scatter (`bandScatter`: tufts, scrub, reeds) and the trees (`decorAt` in `renderer.js`, via `landTrees`: palms and acacias, thicker round an oasis; `S47_SALT.grassDecor` 4707, only where the old rule drew nothing). Hills (Task 3) are not touched by it; if hills need to stay un-green, skip `T.HILLS` in `BAND_GROUND`.
- **Salts used:** oases 4704, oasisShape 4705, grass 4706, grassDecor 4707, herdOasis 4712, mineBlob 4711 (Task 1's review minor; was spare1). Free: spare3 4713, spare4 4714.
- **Performance (Task 2, Large stress city, `/?skipTitle=1&nosw=1&stress=1&seed=3&size=80`, 390x844 at Dpr 2, headless Edge, same method as section 9 of the Stage 4.6 contract; this machine's frame times drift about 10-15% between sessions, so each figure is the mean of several runs).** Before the band: cold bake of all 25 chunks 100 ms at zoom 0.5 (95-106; 4.0 ms a chunk) and 114 ms at zoom 1 (91-128); frame mean 22.8 ms at zoom 0.5 (21.0-23.8), 19.8 ms at zoom 1. After: cold bake 134 ms at zoom 0.5 (114-144; 5.4 ms a chunk, +34%, a one-off while the chunks bake two a frame) and 148 ms at zoom 1 (132-156, +30%); frame mean 23.4 ms at zoom 0.5 (+2.6%, median 12.6 against 12.1) and 22.1-24.5 ms at zoom 1 (+12% to +24% on the mean, but a Normal city with no band in the same sessions moved from 21.7 to 25.7 ms, and an A/B toggling the band's trees inside one page gave 23.1 against 22.6 ms: the band's per-frame cost is inside the noise; its trees are one lookup in a per-world array, `landTrees`). Large against Normal in the same session at zoom 0.5: 23.4 against 23.9 ms (0.98x, the line is 1.6x). The terrain bake is not per frame: a chunk re-bakes only when its signature changes.

## 9. Task 2 review minors (Task 3's first commit)

- Nilometer and wharf both refuse an oasis pool (`riverOnly` / `fishes` in `fit.js`): "Must touch the river".
- `oasisNear` / `builtNearOasis` measure "within 4 tiles" to the nearest pool tile, not the centre.
- The `oasisBuilt` tip also fires for plots (`houses`) and plazas (`plazas`): their command results carry `ids`.
- The 8-tile gap between a pool and rock now holds on the finished map: `repairResources(map, seed, ranges, { mine, avoid: oases })` keeps its mine blob 8 (+3 for the blob) tiles from a pool when any site allows it. About 1% of new-land maps (17 of 1800) have no such site, and there the guaranteed mine wins and the gap is shorter; the oasis sweep counts them.
