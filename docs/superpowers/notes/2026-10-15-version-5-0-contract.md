# Version 5.0 contract (Task 0)

Written 15 Oct 2026 on `version-5-0` for Tasks 1-8 of `plans/2026-10-15-thebes-version-5-0-know-your-city.md`. Binding: later tasks use these names and shapes; a task that must change one says so in a ruling.

## 0. World version: stays 8

No world field was needed. The buildings' version (section 4) lives in a WeakMap beside the world (never saved), and the advice "seen" marker belongs in **settings**, not the world (section 5). `WORLD_VERSION` and `CURRENT_VERSION` stay 8 (tested in `tests/v50/contract`).

## 1. `cityAdvice(world)` (`src/sim/advice.js`; data `src/data/advice.js`)

Returns every problem, ranked: `[{ key, kind, weight, count, id, data, fix, cost, afford }]`.
- `key`: stable while the problem lasts (the dot compares keys). `id`: the first home or building it concerns, or `null` (city-wide). `count`: homes, buildings, workers or towers. `data`: what the words need (below). `fix`, `cost`, `afford`: section 2.
- **Weight** is in points (one home held back one tier from a Shack = 1; ADVICE has every number, Task 8 tunes them). **Order** (`compareAdvice`): weight desc, then `ADVICE_KINDS` order (`raid_towers, fire, treasury, illness, crime, home_need, stranded, running_out, workers_short, jobless`), then lower `id` (null last), then `key`. Pure and deterministic; leaves the world untouched (tested). About 6 ms for the 112-home sample city; call it on demand (sheet open, month end), never per frame.

| kind | from | count | weight | data | fix |
|---|---|---|---|---|---|
| `home_need` | each home's `nextStep` (reason null or locked), grouped by `need:cause.code:cause.id`; key `home_need:<need>:<code>:<id or ->` | homes | Σ tier each would rise to (top tier: the tier it keeps); × `ADVICE.locked` (0.5) when the fix is locked | `need, cause, homes[], points, locked` | the first home's step |
| `stranded` | the same, cause `good_far`; key `stranded:<good>:<far store id>` | homes | as above | + `good, store, bazaar, len` | `select` the store near the bazaar that should set the Fetch order (`fetchStoreFor`, `fetch: true`), else the far store |
| `running_out` | stores + bazaar stalls of a home good (food = all foods) vs last month's `used - made` (`stats.lastMonth`); counted when held > 0 and held/drain < `ADVICE.runOutMonths` (3) and some home's own tier needs it | homes needing it | Σ their tiers | `need, goods, held, used, made, monthsLeft (1 dp), homes[], store` (the biggest holder) | build a grain farm (food) or `unmadeFix`'s maker, near that store |
| `workers_short` | `world.labour`: `jobs - employed` > 0 | workers short | × `workerShort` (0.5) | `short, jobs, workforce, levels, ids` (understaffed alert ids) | `view: 'summary', section: 'employment'` |
| `jobless` | the `unemployment` alert (Town+, share > MOOD threshold) | jobless | × `jobless` (0.25) | `jobless, workforce, jobs` | summary, employment |
| `treasury` | `monthForecast` `active && runsOut` | 1 | max(1, round(-net / 10)) × 2 when `goesBelow` | `net, gold, monthsLeft, soon, biggest` (`biggestCost`) | summary, `forecast` |
| `fire` | `fire` + `fire_risk` alerts | buildings | 8 each burning, 3 each at risk | `burning, atRisk, ids, cause, service` (`fireCause` of the first: burning first, else lowest id) | `none` → firehouse by it; `no_road` → road by it; `short`/`paused`/`burning` → select the firehouse |
| `illness` | `illness` alerts (their `ids`) | homes | × 3 | `ids, districts, cause, service` (`healthCause`) | as fire, physician |
| `crime` | `crime_risk` alerts | homes | × 2 | as illness (`crimeCause`) | as fire, police post |
| `raid_towers` | warned: `tributeQuote` (`towersNeeded`, `towersHave`); else once `raid.clockDay` is set: `towersNeeded(raidSize)` vs `workingTowers`; never on Peaceful, before the tower unlocks, or while raiders are on the map | towers short | × 10, × 2 warned | `size, need, have, buildN, buildCost, warned, dirs` | tower by the warned entry, else `world.focus` (cost: one tower) |

Not counted: homes waiting on a delivery (nothing to do), homes ready to rise, empty plots on a road.

## 2. Fixes and prices

`fix` is one of:
- `{ item, at: 'near' | 'terrain', target: { x, y } }`: open `item`'s card, ghost near `target` (tile centre); `'terrain'`: the nearest free tile of `BUILDINGS[item].terrain` from there (`ui/goalsList.js nearestTerrainTile`, as the house sheet does). Category: `categoryOfItem(item)` (`data/ui.js`). `item` may be `'road'` (always available) or `'house'` (plots).
- `{ select: id, target, why }`: select that building (its sheet). `why` is the cause code (`well_idle`, `..._no_road`, `good_far`, or a service's `short`/`paused`/`burning`): label it View for an idle/roadless provider and the danger services, Show me for `good_far`.
- `{ view: 'summary', section: 'forecast' | 'employment', target: null }`: open the summary at that section (createUI `openSummary(section)`).
- `null`: nothing to offer (`data.locked` or the cause says why).

`cost = priceOf(world, fix)`: `costOf(world, item)`, a road's per-tile `roadCostOf`, `null` for select/view. `afford = canAfford(world, cost)` (the placing rule's debt floor), `null` with no cost. **Never refused:** a build fix is offered only when `isUnlocked` (road always); a locked one becomes `fix: null` with `locked: { item, milestone }` (milestone id). Tested on every item of a lived-in sample city.

**One fix table.** `causeFix(world, cause)` (the old `CAUSE_FIX` of `ui/sheets.js`, moved verbatim: `{ item, at: 'home'|'building'|'terrain' } | { view: true } | { select: true } | null`) and `unmadeFix(world, cause)` live in `sim/advice.js`; `ui/sheets.js` reads them (adding `category`; its exported `unmadeFix(cause, world)` is a wrapper). `makerOf`, `storeFor`, `goodMakers` moved there too; `ui/text.js` re-exports them.

## 3. `nextStep(world, house)` (Task 2)

The first unmet row of the house sheet's checklist (road, the next tier's needs in TIERS order, desirability, a Townhouse's square; three foods hides two) that has a fix. Always `{ reason, tier, next, downgradeIn, need, cause, fix, cost, afford, days, locked }` (keys that do not apply are null).
- `reason: null`: `need`, `cause` (needCause's), `fix`, `cost`, `afford`.
- `'waiting'`: the first unmet row's goods come at the next delivery (`next_delivery`); `days = daysToDelivery(world)` (deliveries happen at the month's end). Also (rare) unmet rows with no fix and no cause.
- `'locked'`: the first unmet row's fix waits on an unlock: `locked: { item, milestone }` (goods: makers first, then the store, as `text.js goodWords`).
- `'ready'`: every row met; rises at the month's end (`days`). `'kept'`: the top tier with every keep row met. `'empty'`: a plot on a road.

Cause codes (`needCause`), each with its fix: `no_road` road · `no_well` well · `no_bazaar` bazaar · `no_temple` temple · `no_booth` booth (near the home) · `bazaar_empty` granary · `granary_empty` grain farm (near the cause's building) · `well_idle` `granary_idle` `bazaar_idle` `temple_idle` `booth_idle` `well_no_road` `bazaar_no_road` `temple_no_road` `booth_no_road` select · `no_good` the good's store by the bazaar (null while store or makers locked) · `good_unmade` its first missing maker (`terrain` when it needs ground) · `good_far` select the far store · `low_desirability` garden · `no_square` house plots · `next_delivery` none (waiting). Words stay `ui/text.js causeText`.

**As built (Task 2):** the first thing in every house sheet is `.step-line` (`ui/sheets.js stepLine`, words `ui/nextStepText.js stepWords(world, home, step)`): label (`Next step:`, `Waiting:`, `Locked:`, `Ready:`, `Kept:`, `Empty:`; the word is the cue), the words, and Show me (a build, aimed as the checklist row's is) or View (a building in reach that does not serve the home; Show me for `good_far` selects the far store). A price the treasury cannot pay reads "more than the N you have". A fix whose words name several makers names only the first one the city lacks (the one priced, and the one Show me starts); the advice sheet names every maker the city lacks and prices the sum (`adviceText.js unmadeBuilds`). Show me for a build (the line, the checklist rows, the advice) goes through `advice.showMe` in `ui/adviceUi.js`: refused with why in a toast when no tile takes the building (`createSheets` prop `onShowMeBuild`, default `onShowMe`). An empty plot on a road shows `Empty:` and drops the older "Waiting for people to move in" line. Opening the advice sheet refreshes the button's cached keys (`adviceSheet` `onRead`).

## 4. Chunk index (Task 6; already used by the renderer)

`src/render/chunkIndex.js`: `chunkIndex(world)` → `{ version, size, per, chunks }` (`chunks[cy * per + cx]`: ids whose footprint touches that `CHUNK`=16 chunk, ascending); `buildingsInRange(world, { x0, y0, x1, y1 })` → the buildings meeting the inclusive range, each once, ascending id (exactly `Object.values(world.buildings)` filtered: tested); `buildingsNear(world, x, y, r)`. Rebuilt when `buildingsVersion(world)` (`sim/world.js`, bumped by every `insertBuilding`/`removeBuilding`; merges and splits go through them) changes; ids deleted behind its back are skipped. **Wired:** `render/renderer.js collectObjects` (same set; `compareDepth` is a total order, so frames are identical). **Left for Task 6:** `ui/pick.js` nearest-building fallback (it scans every building; at minimum zoom it needs all of them, so keep that case), overlays' per-building passes, and the before/after frame measure. Tasks 3 and 6 may key caches on `buildingsVersion` instead of hashing every building (`overlays.js` line 70 does today).

## 5. Seen marker (Task 1)

A settings key `adviceSeen: string[]` (add to `DEFAULT_SETTINGS` `[]` and `VALID` like `seenTips`): the `key`s of `cityAdvice(world).slice(0, ADVICE.top)` when the sheet was last opened. The dot shows while the top items hold a key not in it. Per device, not per city (a new city's first problems light it, which is right).

**As built (Task 1):** the button is `#topbar .advice` (a scroll, 44 px, named "City advice", "City advice: something new" with the dot), shown from the first house (sticky for the session); the advice is read at every command and every fifth game day (`ui/adviceUi.js`, never per frame), the sheet (`ui/adviceSheet.js`, custom sheet `advice`) marks the keys it shows as seen each time it draws. Words: `ui/adviceText.js adviceWords(item, world)` (what, why, fix, cost, short, action). Show me for a build fix goes through `adviceUi.js showMeRefusal`: when no tile near the target takes the building (the sim's `canPlace`, a price the treasury cannot pay excepted) it toasts why and starts no tool; Task 2's Show me can reuse it. A phone's top bar tightened (4 px ends, 3 px between numbers, a 44 px menu button) to fit the button at 360-390 px wide.

## 6. Tests and dev scenes

`tests/v50/all.js` (imported once by `tests/all.js`); each task adds `tests/v50/<task>/...` there; describe names `v50 <area>` (Task 0's: `v50 contract`). Dev scenes in `src/dev/v50/index.js` (`V50_SCENES`, joined in `dev/scenes.js`; `VERSION50_SCENES` lists them), each a `stub` until its task replaces it with `async (api, options) => description` (helpers `inGame`, `wait`, `sampleAt` in `dev/s46/base.js`; open `/?skipTitle=1&nosw=1&seed=11&sample=1` first): `v50-advice` (1), `v50-house-step` (2), `v50-layers` (3), `v50-areas` (4), `v50-roads` (5), `v50-grand` (7).

## 7. What each task should reuse

- **1 Advice sheet:** `cityAdvice`, `ADVICE.top`; the fix shapes above through createUI's `showMeAt({ category, item, x, y })`, `selectBuilding(id)`, `openSummary(section)`; danger words already in `text.js` (`alertText`, tribute `q` words). Top bar fit: `tests/ui/mobileBudget.test.js`.
- **2 Next step:** `nextStep`, `causeText` for the cause words, `daysToDelivery`; the row's Show me as `needRow` does today.
- **3 Layers:** the `OVERLAYS` table (`render/overlays.js`; a `goods` overlay already exists: name the new one distinctly), `ui/layersPicker.js`, the legend; per home `nextStep`/`houseStatus` for home progress; `staffRatio`/`BUILDINGS[t].workers` for workers; jobless districts by `CRIME.districtTiles`.
- **4 Build another / areas:** the plots tool's `plan`/`area` store state (`ui/placement.js`), `previewHouseTiles`/`paintHouseTiles` and `previewPlazaTiles`/`paintPlazaTiles` (`sim/commands.js`) for the preview/paint pattern; `canPlace`/`conditionsFor`; `costOf(world, type, { style })`; a store's orders via `setFetch(world, id, good, amount)` (`sim/carts.js`); one undo entry per area (`sim/undo.js`).
- **5 Routed roads:** `roadPath`, `previewRoadTiles`, `drawRoadTiles` (`sim/commands.js`); `BRIDGE_MAX`, `bridgeRuns`, `bridgeVerdicts`, `runReason` (`sim/bridges.js`); `buildable`/`passable`/`groundRefusal` (`sim/terrain.js`); `tileCost`, `flowField` (`sim/pathfinding.js`) and `findPath` (`sim/walk.js`) for A*. Cost from `roadCostOf` and the bridge cost the preview already returns.
- **6 Camera:** section 4; `render/camera.js` (`visibleTileRange`, `visibleChunks`), `ui/cameraControl.js`, `ui/gestures.js`; measure with the Stage 4.6 contract section 9 scene (Large stress city, zoom 0.5).
- **7 Grand homes:** `data/goals.js`; advice already names `low_desirability` (garden) and the upper goods (`no_good`, `good_unmade`, `good_far`); if statues should be named for desirability, change `causeFix` in one place (the house sheet follows).
