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
