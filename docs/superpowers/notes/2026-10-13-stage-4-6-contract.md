# Stage 4.6 contract (Track 0)

Written 13 Oct 2026 by the Track 0 architect on `stage-4-6`, for the six tracks of the plan `docs/superpowers/plans/2026-10-13-thebes-stage-4-6-land-court-armies.md`: **Map**, **River**, **Court**, **Armies**, **Wonders** (the plan's five) and **UX** (added by Josh on 13 Oct, rulings 400-409). Every track branches from the contract commit. The plan, its rules and its UX rules still bind; this note fixes the names, shapes, hooks and file ownership so the tracks can work in parallel and merge cleanly. Track 0's rulings are 345-349 below; the Map track's bridge clarity is ruling 350; the UX track has 400-409; integration, balance and the final review use 410 on.

## 0. How to use this note

- Each track **creates** files it owns and **edits** only what its section in section 7 lists. A shared file is touched only at the hook or marked section named for the track. If a track needs something outside its list, it asks the controller; it does not edit another track's file.
- Every hook is already wired and does nothing, so each track can build, test and screenshot alone. A track fills in **its own** function behind a hook; it never edits the hook's call site.
- Tests: `tests/stage46/<track>/<track>.test.js` is the one file `tests/stage46/all.js` imports for the track. Put other test files beside it and import them from it. Describe names start with `s46 <track>` (`map`, `river`, `court`, `armies`, `wonders`, `ux`), so `-Grep "s46 map"` runs one track. Track 0's tests are `s46 contract ...` (`tests/stage46/contract/`).
- `sw-files.js` is generated: never resolve a conflict in it by hand, rerun `tools/sw-files.ps1`.
- Import rule for data files: `goods.js`, `buildings.js`, `progression.js`, `ui.js`, `firsts.js`, `achievements.js` and `tips.js` import `src/data/s46.js`, which imports every track's data file. So a track data file (`map.js`'s s46 section, `river.js`, `court.js`, `armies.js`, `wonders.js`) must import none of those seven. Import other leaf data files (`raids.js`, `economy.js`, `map.js`) if you need them.
- Import cycles in the sim: `world.js` imports `sim/flood.js` (do not import `world.js` from `flood.js`), and `raids.js` imports `sim/court.js` (do not import `raids.js` from `court.js`; read `world.raid` directly).

## 1. World version 7 (ruling 344, ruling 347)

`WORLD_VERSION` is 7 and `MIGRATIONS[6]` (`v6ToV7` in `src/save/migrate.js`) upgrades every older save. Both `createWorld` and `v6ToV7` start each track's record from **the track's own function** in its data file, so a track that adds a field inside its record changes one function and new and migrated cities agree. `validateWorld` checks each record with **the track's own check** (also in its data file), so a track tightens its own validation.

| Field | Shape | Starts as (new city / migrated) | Owner, function, check |
|---|---|---|---|
| `mapSize` | 48, 64 or 80; always equal to `size` (validated) | the map's size / 64 (the old size) | Map; `isMapSize` in `src/data/map.js` |
| `mapParams` | record: the generator's seeded shape choices | `generateMap(...).params` (`{}` until Map draws any) / `{}` | Map |
| `flood` | `{ year, level, forecast, from, to }` (year: game year or null; level, forecast: `FLOOD_LEVEL_IDS` or null; from, to: days or null) | `newFloodState()` | River; `src/data/river.js` `newFloodState`, `isFloodState` |
| `floodplain` | array, one 0 or 1 per tile | `floodplainOf(terrain, size)` (fertile within `FLOOD.reach` = 3 tiles of water, a square) | River; `src/sim/flood.js` `floodplainOf` |
| `wildlife` | `{ herds: [{ id, kind, x, y, size, max, regrow }], nextId }` | `newWildlifeState()`: no herds, nextId 1 | River; `newWildlifeState`, `isWildlifeState` |
| `court` | `{ favour, letters: [], request, cards: [], nextRequestDay, nextCardDay, nextId }` | `newCourtState()`: favour 50 | Court; `src/data/court.js` `newCourtState`, `isCourtState` |
| `army` | `{ away: [{ id, kind, barracks, back }] }` (units lent to the capital) | `newArmyState()` | Armies; `src/data/armies.js` `newArmyState`, `isArmyState` |
| unit `kind` | every entry of `world.soldiers` (the name stays: it holds every unit kind) has `kind` in `UNIT_KINDS` | `'soldier'` (combat.js `trainSoldiers` sets it; the migration adds it) | Armies |
| raid `mix` | `raid.warning.mix`, `raid.active.mix`, `raid.last.mix`: `{ foot, archer, chariot, boat }` adding up to `size`; each raider has `kind` (`ENEMY_KINDS`) | `footMix(size)` (raids.js sets it on every warning, raid and report; the migration adds it); raiders `'foot'` | Armies; `footMix` in `armies.js` |
| monument `style` | `b.style` on every monument building (site or finished), one of `MONUMENT_STYLE_IDS` | `MONUMENT_STYLE_DEFAULT` (`'classic'` until Wonders' picker) / `'classic'` | Wonders; `src/data/wonders.js` |
| tallies | `STAGE46_TALLY` = every track's list joined (`src/data/s46.js`) | 0 | each track's `*_TALLY` |

Tallies registered now: River `hunted, fished, floods, crocScares`; Court `requestsMet, requestsMissed, gifts, lettersRead, cardsPlayed`; Armies `archersTrained, chariotsTrained, raidersByArchers, raidersByChariots, unitsSent`; Map and Wonders none. A track adds a key to its own list and both new and migrated cities get it at 0. **Once Stage 4.6 is on main, a new key or field needs a version 8**; until then, adding inside a record or a tally list is free.

Validation is lenient where the Stage 3 pattern was: a raid record's insides are the Armies track's business (mix is not validated), and a unit with no `kind` still validates (tests make units by hand); a unit with a kind that is not in `UNIT_KINDS` does not.

The v6 -> v7 migration also adds to `newItems` every Stage 4.6 build item the city's milestone has already unlocked (from `S46_UNLOCKS`), as Stage 3 and 4 did.

## 2. Map sizes (ruling 333): what Track 0 did, what is left for the Map track

Done:
- `MAP_SIZES = { small: 48, normal: 64, large: 80 }`, `MAP_SIZE_IDS`, `DEFAULT_MAP_SIZE` (64), `isMapSize(n)` in `src/data/map.js`.
- `generateMap(seed, size, variant)` and `createWorld({ size })` take the size. At another size than 64 each layout's **positions** (river base x, island rows, the lake's box, rock ranges, the classic rock patches' box, raider entry positions) scale by `size / 64`; widths, bends and distances stay. At 64 the scale is the identity: `tests/stage46/contract/mapSizes.test.js` holds FNV fingerprints of all six layouts x six seeds taken from the generator **before** any change (e9f2307), and they still match. Invariants (a river, a buildable start road from the south edge, two land entries on the edges, the focus inside) hold at 48 and 80 for every layout.
- `generateMap` returns `params: {}` (becomes `world.mapParams`).
- Boot: `freshWorld({ seed, variant, size })`; `?size=48|64|80` is the dev flag (anything else falls back to Normal); `api.freshWorld` is exposed for dev scenes. The stress city's camera now starts at `size / 2` (it was a hard-coded 32).
- Checked with no change needed: sim (`world.size` everywhere), render (renderer, camera `visibleTileRange`, terrain baker: `maxChunks` 32 covers 25 chunks at 80), minimap (`size / world.size` scale), save (`validateWorld` by `size`), sample and stress cities (relative to `size`), share link **parse** path (no size in it yet).

Left for the Map track (each listed so nothing is lost):
1. New city's size picker (title card, `src/ui/titleCard.js` and the `onNewCity` / `confirmNewCity` lines in `src/boot.js`) passing `size` to `freshWorld`.
2. Share links: `shareLink`/`readShareLink` in `src/ui/share.js` add `&size=` for Small and Large only (Normal keeps today's links), and `startSeed(seed, variant)` in boot passes it.
3. Records and personal bests: `src/save/records.js` `keyOf` and the rows carry `mapSize` (Normal keeps today's keys, as classic did).
4. Stamps: `src/ui/scoreUi.js` `stampMap(seed, variant)` calls `generateMap(seed, undefined, variant)`: give it the record's size (a Large record's stamp would draw a 64 map today).
5. Area scaling of counts: `MAP.rockTarget` (90), `MAP.clay` target (40-66), the two raider entries, and herds (the River track asks Map's `areaScale(size)` helper, which Map adds to `src/data/map.js`).
6. The weekly seed stays Normal (`src/ui/scoreUi.js` weekly seed: no change needed, but test it).
7. Map may replace Track 0's simple position scaling in `mapgen.js`; the 64 fingerprints must keep passing for classic (the plan only binds classic at 64; if a non-classic layout's 64 print changes, update the test and say so in a ruling).

## 3. Registries and names

| Track | Data file (owned) | Names |
|---|---|---|
| Map | `src/data/map.js` (s46 section, and the file for 4.6) | `MAP_SIZES`, `MAP_SIZE_IDS`, `DEFAULT_MAP_SIZE`, `isMapSize`, `MAP_SALT`, `MAP_TALLY`, `MAP_FIRSTS`, `MAP_ACHIEVEMENTS`, `MAP_TIPS` |
| River | `src/data/river.js` | `FLOOD` (months 7-9, forecastMonths 3, reach 3), `FLOOD_LEVELS` (`low` 0.15/0.6, `fair` 0.35/0.9, `good` 0.35/1.1, `high` 0.15/1.25), `FLOOD_LEVEL_IDS`, `HERD_KINDS` (`gazelle`, `ostrich`), `WILDLIFE`, `HUNTING`, `FISHING`, `RIVER_GOODS` (game, fish), `RIVER_BUILDINGS` (`nilometer`, `hunting_lodge`, `fishing_wharf`), `RIVER_UNLOCKS`, `RIVER_DOCK`, `RIVER_TALLY`, `RIVER_FIRSTS`, `RIVER_ACHIEVEMENTS`, `RIVER_TIPS`, `RIVER_SALT` |
| Court | `src/data/court.js` | `FAVOUR`, `REQUESTS` (incl. `soldiersMonths` 6), `REQUEST_KINDS` (`goods`, `gold`, `food`, `soldiers`), `CARDS`, `COURT_CARDS` (`{ id, threat, choices: [{ id }, { id }] }`), `COURT_TALLY`, `COURT_FIRSTS`, `COURT_ACHIEVEMENTS`, `COURT_TIPS`, `COURT_SALT` |
| Armies | `src/data/armies.js` | `UNIT_TYPES` (`soldier`: barracks, `archer`: `archery_range`, `chariot`: `stables`), `UNIT_KINDS`, `ENEMY_TYPES` (`foot`, `archer` from raid 3, `chariot` from 6, `boat` from 5), `ENEMY_KINDS`, `footMix`, `SITUATIONS` (`wall`, `melee`, `open`, `nearWall`, `gate`), `MATCHUPS[unit][enemy][situation]` (the plan's numbers, 1 where not listed), `matchup()`, `ARMY_BUILDINGS`, `ARMY_UNLOCKS`, `ARMY_DOCK`, `ARMY_TALLY`, `ARMY_FIRSTS`, `ARMY_ACHIEVEMENTS`, `ARMY_TIPS` |
| Wonders | `src/data/wonders.js`, and `src/data/monuments.js` for the new kinds | `NEW_MONUMENT_KINDS` (`great_sphinx`, `sun_temple`, `step_pyramid`, ruling 345), `MONUMENT_STYLES` (`classic` not offered; `whitewashed`, `painted`, `gilded` goldFactor 1.1 desirability +1), `MONUMENT_STYLE_IDS`, `MONUMENT_STYLE_DEFAULT`, `WONDER_UNLOCKS`, `WONDER_TALLY`, `WONDER_FIRSTS`, `WONDER_ACHIEVEMENTS`, `WONDER_TIPS`, `WONDER_SALT` |
| UX | none needed (`src/data/ui.js` key bindings if it changes any; `src/ui/theme.js` tokens) | `S46_UX_TEXT` in text.js |

`src/data/s46.js` joins them in track order (map, river, court, armies, wonders): `S46_GOODS` -> `GOODS`; `S46_BUILDINGS` -> `BUILDINGS` (before the monuments); `S46_UNLOCKS` (milestone id -> types) -> `MILESTONES[..].unlocks`; `S46_DOCK` (category id -> items) -> `CATEGORIES[..].items`; `S46_TALLY`, `S46_FIRSTS`, `S46_ACHIEVEMENTS`, `S46_TIPS` -> the tallies, `FIRSTS`, `ACHIEVEMENTS`, `TIPS`. Nobody edits `s46.js` or the seven lists.

Food: `FOOD_SLOTS = ['grain', 'figs', 'game', 'fish']` in `src/data/goods.js` is the order foods are named in; `FOOD_GOODS` stays "the food goods that exist, in GOODS order". River adds game and fish as `RIVER_GOODS` rows (kind `food`) and then edits the food rules and words (section 7).

## 4. Salt table (`tests/stage46/contract/salts.test.js` checks every salt in the game is unique)

The existing pattern is one SALT object per system in its data file; Stage 4.6 keeps it. Draw convention for new sim draws: `hash2(a, b, (world.seed + SALT.x) | 0)` (a: an id, year or index; b: a day or month), as fire, health and crime do. The raids keep theirs: `hash2(world.seed, raid index, RAID_SALT.x)`. Never draw a map shape choice from the generator's own rng stream (it would move classic maps): use `hash2(seed, k, MAP_SALT.x)` or `createRng((seed ^ MAP_SALT.x) >>> 0)` as clay does.

| Track | Table | Salts |
|---|---|---|
| Map | `MAP_SALT` (4601-4619) | meander 4601, channels 4602, oxbow 4603, outcrops 4604, dunes 4605, groves 4606, wadis 4607, clayWide 4608, shapePick 4609, spare1 4610, spare2 4611 (existing: `MAP.variantSalt` 0x0A1E, `MAP.clay.salt`) |
| River | `RIVER_SALT` (4621-4639) | floodLevel 4621, herdSpawn 4622, herdWander 4623, herdKind 4624, herdSize 4625, herdMove 4626, crocSpot 4627, crocScare 4628, hunt 4629, fishBoat 4630, ambient 4631 (render only), lostHerd 4632, spare1 4633, spare2 4634 |
| Court | `COURT_SALT` (4641-4659) | requestGap 4641, requestKind 4642, requestAmount 4643, requestGood 4644, deadline 4645, reward 4646, favourMet 4647, favourMissed 4648, cardGap 4649, cardPick 4650, cardAmount 4651, gift 4652, giftKind 4653, giftAmount 4654, giftGood 4655, spare1 4656, spare2 4657 |
| Armies | `RAID_SALT` additions (8105-8119) | mix 8105, mix2 8106 (second band), boatEntry 8107, boatBank 8108 |
| Wonders | `WONDER_SALT` (4681-4689) | paint 4681 (render only), spare1 4682 |

A track that needs another salt adds it inside its own range in its own table; the uniqueness test keeps everyone honest.

## 5. Hooks already wired (call sites nobody edits again)

| Shared file | Hook | Calls (owner fills in) |
|---|---|---|
| `src/sim/clock.js` `tickDay` | `s46Day(world, events)` after `crimeDay`, before the day counts on | `src/sim/s46.js`: `floodDay` (River, `sim/flood.js`), `wildlifeDay` (River, `sim/wildlife.js`), `armyDay` (Armies, `sim/armies.js`), `courtDay` (Court, `sim/court.js`), in that order |
| `src/sim/clock.js` `runMonth` | `s46Month(world, events)` after `raidMonth`, before mood | `floodMonth`, `wildlifeMonth`, `armyMonth`, `courtMonth` |
| `src/sim/alerts.js` `alertsFor` | `s46Alerts(world)` after the monuments' | `floodAlerts`, `wildlifeAlerts`, `armyAlerts`, `courtAlerts` |
| `src/ui/alerts.js` | `CRITICAL_RANK` = raid, fire, raid_warning, **court_letter**, debt, save_failed | Court raises `{ code: 'court_letter', letter: id }` and words it (`ALERT_TEXT.court_letter`) |
| `src/sim/raids.js` `raidSize` | `favourRaidSize(world, size)` around the capped size (not the first raid) | Court (`sim/court.js`); Armies keeps the call |
| `src/sim/raids.js` `tributeFor` | `favourTributeFactor(world) x ...` | Court; Armies keeps the call |
| `src/sim/commands.js` | `tileBound` / `fitReason` / `fitOf` in `tileReason`, `checkTiles`, `conditionsFor` | Map (`sim/fit.js`); River declares rows |
| `src/sim/commands.js` `canPlace` / `conditionsFor` / `place` | `{ style }` option -> `costOf(world, type, { style })` and `makeBuilding(..., { style })` | Wonders (`costs.js` `costOf` prices it; the picker passes it) |
| `src/sim/world.js` `makeBuilding` | `b.style` for monuments | Wonders (`MONUMENT_STYLE_DEFAULT`) |
| `src/ui/createUI.js` | `createS46Seams(seamCtx)` -> six seams (sheets, sheetParts, onEvents, refresh, onAlertAction, onCommand, destroy), joined like danger/score/monuments | each track's `src/ui/s46/<track>.js` |
| `src/ui/createUI.js` frame | `s46Ground(g, world, range, now, motion)` before Stage 3's ambient; `s46Walkers(world, timeDays, range, motion)` joined to the walkers | `src/render/s46.js` -> River's `render/flood.js` `drawFlood`, `render/wildlife.js` `animalsAt` (ids from `WILDLIFE_ID_BASE` 1,400,000) |
| `src/render/art/registry.js` | `...S46_ART` in `ART`; `s46Slot(b, world)` first in `slotFor` | `render/art/s46.js` -> River's `art/river.js` (`RIVER_ART`, `riverSlot`), Armies' `art/armies.js` (`ARMY_ART`, `armySlot`) |
| `src/dev/scenes.js` | `...S46_SCENES` | `src/dev/s46/<track>.js` (stubs; `base.js` has `stub`, `inGame`, `wait`, `sampleAt`) |
| `src/ui/text.js` | six marked sections at the end, `S46_<TRACK>_TEXT` | each track inside its own markers only |
| `css/ui.css` | six marked sections at the end | each track inside its own markers only |
| `tests/stage46/all.js` | one import per track | each track's `<track>.test.js` imports the rest |

Dev scenes registered (`window.__thebes.devScene(name)`, open `/?skipTitle=1&nosw=1&seed=11&sample=1` first): `s46-sizes-small`, `s46-sizes-normal`, `s46-sizes-large` (working now: a new seed-11 sample city at that size, whole map in view), `s46-clay`, `s46-bridge` (Map), `s46-flood`, `s46-wildlife` (River), `s46-court-letter` (Court), `s46-mixed-raid` (Armies), `s46-wonders` (Wonders), `s46-speed`, `s46-hud` (UX). Stubs return "stub <name>: the track fills this scene in" so a stub shot is never mistaken for a real one.

## 6. Cross-track interfaces (defined now; rulings 348, 349)

**Why not here, everywhere: the terrain-fit helper (Map owns; River uses).** `src/sim/fit.js` is the one rule for every terrain-bound building, read from its `BUILDINGS` row: `terrain` (`fertile` / `rocky` / `clay`), `terrainMin` (how many footprint tiles must be that ground; default every tile, which keeps today's tile-by-tile refusal) and `water` (`'touch'`: a water tile beside the footprint, 4 directions; `'longSide'`: along either long side, any side for a square). `fitOf(world, type, x, y, rot)` returns `{ terrain, fit, of, need, water, wet, ok, reason }`; the refusal is `needs_<terrain>` or `needs_water`. It is wired into `canPlace` and `conditionsFor` today (ground condition gains `need`, or `water` and `wet`, only for rows that use them) and tested with stand-in rows. The Map track sets `clay_pit` to `terrainMin: 2`, writes the words ("Needs 2 of 4 tiles on clay (this spot has 1)", "Must touch the river on its long side"), and makes Show me land on the nearest fit (`src/ui/placement.js` `nearestFit` already follows `canPlace`). The River track only puts `water: 'longSide'` on `fishing_wharf`, `water: 'touch'` on `nilometer`, and whatever ground rule the lodge needs (none in the plan) in `RIVER_BUILDINGS`; its words for `needs_water` are Map's single line, so every refusal reads the same way.

**Soldiers requests (Court asks, Armies answers).** `src/sim/armies.js` (Armies owns, Track 0 wrote a working minimum so Court can test now): `unitsAtHome(world)` -> `{ soldier, archer, chariot }`; `unitsAway(world)` -> `[{ kind, n, back }]`; `sendUnits(world, n, days, events)` -> `{ ok, reason ('not_enough' | 'raid'), sent: { kind: n } }` (units waiting at home leave, soldiers first, newest first; they go to `world.army.away`, are unpaid and do not fight); `armyDay` brings them back on their day to the building that trained them (or they leave service if it is gone), pushing `units_back`. Court never reads or writes `world.soldiers` directly. Armies may rewrite the insides (pay, which kinds go first) and keep the names and shapes.

**Favour and raids (who owns which code).** Court owns `favourRaidSize(world, size)` and `favourTributeFactor(world)` in `src/sim/court.js` (what favour does: one size step at 30 or less, x0.8 / x1.2 tribute). Armies owns `src/sim/raids.js`, keeps both calls where Track 0 put them, and draws the **mix** from the size they return (so favour never changes the mix's proportions, only its total). The first raid ignores favour (it is always 3 on foot). Tribute prices the total.

**River hooks the Court's cards call.** `herdArrives(world, events)` / `herdLeaves(world, events)` (Lost herd) in `src/sim/wildlife.js`, and `buyForecast(world)` -> `{ ok, reason, level }` (Flood omen) in `src/sim/flood.js`. Stubs return null / `not_yet`; Court shows the card only when the hook can act (a card whose choice cannot happen is not drawn).

**Food.** River adds game and fish; any list of foods in words uses `FOOD_SLOTS` order. Court's food requests and Armies' horse feed (grain) read `FOOD_GOODS` / storehouse helpers, never a hard-coded list.

## 7. File ownership

"Creates" are new files the track owns outright. "Edits" are existing files; where a file is shared the exact place is named. Anything not listed: ask the controller.

### Map (rulings 331-333, 350)
- Owns/creates: `src/sim/fit.js` (Track 0's), `src/sim/mapgen.js`, `src/data/map.js` (all of it for 4.6), `src/ui/s46/map.js`, `src/dev/s46/map.js`, `tests/stage46/map/*`.
- Edits: `src/render/terrainBaker.js`, `src/render/art/palette.js` (clay's ground), `src/render/overlays.js` (the Ground overlay only), `src/ui/placement.js` (nearest fit, the ghost landing, Ground on for clay), `src/ui/goalsList.js` (the pottery goal's Show me, a bridge spot's Show me), `src/ui/titleCard.js` and the `onNewCity` / `confirmNewCity` / `startSeed` lines of `src/boot.js` (the size picker), `src/ui/share.js`, `src/save/records.js`, `src/ui/scoreUi.js` (`stampMap` and the share call only), `src/sim/bridges.js` (a `bridgeSpot(world, from)` for Show me), `src/data/buildings.js` (the `clay_pit` row only), `src/sim/commands.js` (the ground lines Track 0 marked, if the words need more from them), `src/ui/cards.js` (a terrain card's "where it lies" line, the road card's bridge line).
- text.js: `s46 map` section. css: `s46 map` section.
- **Bridge clarity (ruling 350), hooks:** the road card and the road tool's bar say roads cross water with a bridge at `costOf(world, 'bridge')` a tile (the bar already has `S45_TEXT.bridgeNote` from `previewRoadTiles`; the card line goes in `src/ui/cards.js`); the guidance-row tip is a `MAP_TIPS` row `{ id: 'bridges', trigger: 'roadMeetsWater' }` fired by the Map seam's `onCommand(e)` through `ctx.fireTip('roadMeetsWater')` when a road command is refused with `water`, `too_wide` or `bridge_shape`, or lays its first bridge; How to play gets it from `TIP_TEXT` / `TIP_HELP_TEXT` in the Map section; Show me (`goalsList.js` / the tip) points at `bridgeSpot(world, from)`, the nearest straight crossing of at most `BRIDGE_MAX` water tiles, on non-classic maps; `s46-bridge` dev scene.

### River (rulings 334-335)
- Owns/creates: `src/data/river.js`, `src/sim/flood.js`, `src/sim/wildlife.js`, `src/render/flood.js`, `src/render/wildlife.js`, `src/render/art/river.js`, `src/ui/s46/river.js`, `src/dev/s46/river.js`, `tests/stage46/river/*`.
- Edits: `src/sim/production.js` (the floodplain harvest via `floodHarvestFactor`, game and fish making), `src/sim/housing.js` and `src/data/housing.js` (food rules: game and fish count toward two foods), `src/sim/distribution.js` (bazaars' food), `src/data/buildings.js` (the `granary` `stores` and `bazaar` `stock` rows only), `src/data/tips.js` (the `SEASONS` line only, ruling 346), `src/ui/text.js` `CITIZEN_REMARKS` akhet rows only (ruling 346), `src/render/ambient.js` if its river life needs to give way to the capped animals.
- Farm sheet row, summary food forecast: through the River seam's `sheetParts.building` / `summary`.
- text.js / css: `s46 river` sections.

### Court (rulings 336-339)
- Owns/creates: `src/data/court.js`, `src/sim/court.js`, `src/ui/s46/court.js` (the letter sheet, the court sheet, favour in the summary through `sheetParts.summary`), `src/dev/s46/court.js`, `tests/stage46/court/*`.
- Edits: `src/data/goals.js` and `src/sim/goals.js` (the opening chapter's guided letter after the trading-post goal), `src/ui/celebrate.js` (past letters in the Recent list) if the Recent list needs a new kind.
- Never edits `raids.js` (its two hooks are called from there) or `world.soldiers` (use `sim/armies.js`).
- text.js / css: `s46 court` sections (`ALERT_TEXT.court_letter`, `T.court`, `T.letter` sheet headings).

### Armies (rulings 340-341)
- Owns/creates: `src/data/armies.js`, `src/sim/armies.js`, `src/render/art/armies.js`, `src/ui/s46/armies.js`, `src/dev/s46/armies.js`, `tests/stage46/armies/*`.
- Edits (owns for 4.6): `src/sim/combat.js`, `src/sim/raids.js` (keeping the two favour calls), `src/sim/defence.js`, `src/data/raids.js` (`UNITS`, `DEFENCE`, `RAID_SALT` inside 8105-8119), `src/render/units.js`, `src/render/art/defence.js`, `src/render/art/figures.js` (enemy figures, if not in `art/armies.js`), `src/ui/dangerSheets.js` (the raid sheet's mix and counters), `src/sim/costs.js` (`soldiersPayOf` only), `src/dev/scenes.js` raid builders' `mix` only if a scene needs a mixed raid (prefer `src/dev/s46/armies.js`).
- text.js / css: `s46 armies` sections. Existing raid words in `RAID_TEXT` / `DANGER_UI_TEXT` may be edited where they name foot raiders.

### Wonders (rulings 342-343)
- Owns/creates: `src/data/wonders.js`, `src/ui/s46/wonders.js`, `src/dev/s46/wonders.js`, `tests/stage46/wonders/*`.
- Edits (owns for 4.6): `src/data/monuments.js` (the three kinds, ids per ruling 345), `src/sim/monuments.js`, `src/render/monuments.js`, `src/render/art/monuments.js`, `src/ui/monumentSheet.js` (and the palace's style picker in it, which the monuments reuse), `src/sim/costs.js` (`costOf` style factor only), `src/sim/desirability.js` (gilded +1 only), `src/data/achievements.js` is **not** edited (use `WONDER_ACHIEVEMENTS`; `seven_wonders` stays "7 kinds" unless a ruling changes it).
- text.js / css: `s46 wonders` sections.

### UX (rulings 400-409, wave 2)
- Owns: `src/ui/hud.js` (the top bar), `src/ui/speed.js` (play, pause and speed: icons and words that read at a glance, never colour alone), `src/ui/keyboard.js` and the `keyActions` block of `src/ui/createUI.js` (Enter confirms a drawn or selected placement, including drag-placed tools like roads, walls, plots and plazas; Escape cancels; today Enter already confirms in tool modes, so the task is the cases it misses, e.g. a focused confirm-bar button or a finished drag), `src/ui/confirmBar.js` (its keyboard affordances), `src/ui/theme.js` and the `:root` tokens at the top of `css/ui.css` (the shared legibility tokens: contrast, sizes at phone zoom), `src/ui/s46/ux.js`, `src/dev/s46/ux.js`, `tests/stage46/ux/*`.
- How it coexists: UX changes legibility through **tokens and its own CSS section**, not by editing other tracks' sheets or rows. Sheets and the alert row are built with `src/ui/components.js` (`el`, `button`, `iconButton`), so tokens reach every track's sheet. Where a structural change in `src/ui/alerts.js` (the banner) or `src/ui/sheets.js` is needed, UX makes it after wave 1 has merged (it is a wave 2 track: branch from `stage-4-6` after Map, Court and Armies are in), never touching `CRITICAL_RANK`, `bannerModel`'s data or another track's seam. Every token change reruns `tests/stage4/look/lookContrast.test.js`, `tests/ui/a11y.test.js` and the mobile budget.
- text.js / css: `s46 ux` sections, plus the `:root` lines.

### Files nobody edits (Track 0's joins)
`src/data/s46.js`, `src/sim/s46.js`, `src/render/s46.js`, `src/render/art/s46.js`, `src/ui/s46/index.js`, `src/ui/s46/seam.js`, `src/dev/s46/index.js`, `src/dev/s46/base.js`, `tests/stage46/all.js`, `src/sim/world.js`, `src/save/migrate.js`, `src/save/serialize.js` (the tracks' checks live in their data files), `src/ui/createUI.js` (except UX's `keyActions` block).

## 8. Rulings 345-349 (Track 0)

345. The new monuments' ids are `great_sphinx` ("Great sphinx"), `sun_temple` and `step_pyramid`: `sphinx` is already the 1x1 statue on the Homes card, so the plan's "Sphinx (3x2)" cannot take that id. — Cost if wrong: the card says "Great sphinx" where the plan said "Sphinx"; a rename is words only.
346. The flood stays in game months 7-9 (the plan), and the River track moves the season calendar to match: `SEASONS` in `src/data/tips.js` puts Akhet (the flood) on months 7-10, Peret 11-2 and Shemu 3-6, and the remarks that speak of the river rising only show in a year whose flood is Fair or better. Today Akhet is months 1-4, so a remark would talk of the fields under water half a year before the sim floods them. — Cost if wrong: remarks shift by half a year; nothing in the sim changes.
347. World version 7 holds one record per track (`flood`, `floodplain`, `wildlife`, `court`, `army`) plus `mapSize` and `mapParams`; each record starts from the track's own function in its data file and is checked by the track's own check, so new and migrated cities agree and each track owns its shape. `world.soldiers` keeps its name for every unit kind (each unit has `kind`), every raid record carries `mix`, every monument `style`, and `mapSize` always equals `size`. — Cost if wrong: a field a track only discovers after Stage 4.6 is on main needs a version 8.
348. Every terrain-bound building follows one helper, `src/sim/fit.js`, read from its `BUILDINGS` row (`terrain`, `terrainMin`, `water`), wired into placing today: the Map track owns it (words, nearest fit, clay's 2 of 4) and the River track's wharf and nilometer only declare `water`. — Cost if wrong: a new kind of ground rule (say, "on the bank") needs a row field in Map's file rather than a check in River's.
349. The court and the army meet only through two interfaces: favour's raid size and tribute come from `src/sim/court.js` (Court) and are called from `raids.js` (Armies), which draws the mix from the favour-adjusted size, and the first raid ignores favour; soldiers requests use `src/sim/armies.js` (`unitsAtHome`, `unitsAway`, `sendUnits`, `armyDay`), units away are unpaid and do not fight. — Cost if wrong: favour cannot tilt a raid toward one enemy kind (by design, it only grows or shrinks it).

## 9. Performance: Large (80x80) against Normal (64x64)

Measured on this machine in headless Edge (software canvas, `--disable-gpu`), `tests/screenshot.ps1 -Width 390 -Height 844 -Dpr 2` (canvas 780x1688 device px), on the busiest scene, the stress city (`/?skipTitle=1&nosw=1&stress=1&seed=3&size=<n>`: the whole map built, 1,842 buildings at 64 and 2,930 at 80), the game loop stopped and `ui.render` called directly: 40 warm frames, then 120 timed frames, at zoom 1 and at the minimum zoom 0.5, camera on the map's middle; then 60 days ticked. Three runs per size, alternated; the table gives the median of the three runs' figures (each run's range in brackets). Also the seed-11 sample city at both sizes (one run each).

| Stress city, frame ms | 64x64 | 80x80 | 80 / 64 |
|---|---|---|---|
| zoom 1, median frame | 21.9 (17.1-30.0) | 19.7 (18.5-29.3) | 0.90 |
| zoom 1, mean frame | 23.0 (18.1-32.2) | 20.1 (18.9-29.3) | 0.87 |
| zoom 0.5, median frame | 8.1 (6.2-11.2) | 12.3 (11.7-12.8) | 1.52 |
| zoom 0.5, mean frame | 17.7 (13.1-24.6) | 27.6 (24.0-30.6) | 1.56 |
| zoom 0.5, p90 frame | 54.3 (40.5-78.6) | 67.3 (59.7-76.1) | 1.24 |
| sim, median ordinary day | 15.8 (11.6-20.9) | 32.2 (31.5-38.8) | 2.0 |
| sim, month-end day | 319 (220-398) | 929 (865-1,073) | 2.9 |

Sample city (166 buildings), zoom 1 mean frame: 19.6 ms at 64, 18.6 ms at 80 (0.95); sim day 0.8 ms at both.

**Mobile budget at Large:** `tests/ui/mobileBudget.test.js` with every scene's query given `&size=80` (a temporary edit, reverted): 13 passed, 0 failed (all twelve scenes at 375x667, 844x390 and 667x375, at 100%, 125% and 150% text). The rows under the top bar do not depend on the map's size.

**Verdict:** frame time passes: at the default zoom Large costs the same as Normal (the screen shows the same number of tiles), and zoomed all the way out it is about 1.5x, under the 1.6x line. The ratio there follows the building count (1.59x more buildings), not the map: per-frame work that walks every building grows with the city (the renderer's `collectObjects` visits every building to find those in view, and the walkers are worked out per building), as do the bigger number of sprites in view when zoomed out. The **simulation** does not pass a 1.6x line if one is applied to it: a stress-sized Large city's ordinary day is 2x and its month end 2.9x (about 0.9 s on this desktop, so a visible hitch once a month at 1x on a phone; a real player's Large city at a few hundred buildings is nowhere near this, and the sample city shows no difference). The month end grows faster than the building count, which points to work that is quadratic in buildings (per-home reach and coverage searches at the month end).

**Proposed fixes (not built; for the Map track or a follow-up, in order of value):**
1. Profile `runMonth` on the 80 stress city and cache per-month reach (`roadReach` per service building, keyed by `roadVersion`) so housing and coverage stop re-walking roads per home; target month end under 1.6x of 64's.
2. Index buildings by terrain chunk (rebuilt when a building is placed or removed) so `collectObjects` and the walkers visit only the chunks in view, so the zoomed-out frame stops scaling with the whole city.
3. Only if a phone shows it: cap decor (trees) drawn at zoom 0.5 by a stride, and bake terrain chunks at zoom 0.5 at half resolution (cheaper terrain bake).

## 10. Things in the plan that the code says otherwise

- The plan's "Sphinx (3x2)" collides with the existing `sphinx` building (a 1x1 Homes statue): ruling 345.
- The plan's flood months 7-9 contradict the game's own seasons (`SEASONS`: Akhet, the flood, is months 1-4, and citizen remarks say so): ruling 346.
- The plan says requests and cards arrive "above debt" and "below an active raid and uncovered fire"; a raid **warning** also sits between them today, and Track 0 put the letter below it (a warning is harm on its way; a letter is not).
- "Enter confirms a road" (UX track) already holds for a tool in progress (`keyActions.confirm` calls `confirm()` in any tool mode); a focused button keeps its own Enter (keyboard.js), which is likely the case Josh hit. The UX track should reproduce before changing.
- The plan lists `mapSize` as a field; `world.size` already is the map's size. Both are kept, and `mapSize` must equal `size` (validated), so nothing can disagree.
- `seven_wonders` ("7 kinds") was written for seven kinds; with ten it still reads true but is easier. Wonders decides (a ruling) whether it becomes "10 kinds".
- Raid sizes: the first raid is fixed at 3 on every level (`RAIDS.firstSize`), so favour cannot grow it; ruling 349 makes that explicit.
