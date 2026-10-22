# Version 6.0 contract (Track 0)

Written 22 Oct 2026 on `version-6-0` for the tracks of `plans/2026-10-22-thebes-version-6-0-a-harder-nile.md`. Binding: later tracks use these names and shapes; a track that must change one says so in a ruling. Rulings 620-639 are Track 0's (listed at the end).

Every seam below is a named function whose stub keeps today's game: a city at Normal on the classic map plays, draws and costs exactly as on main until a track fills its seam. Tests: `tests/v60/contract/` (describe names `v60 contract`).

## 1. World version 9 and `MIGRATIONS[8]`

`WORLD_VERSION` and `CURRENT_VERSION` are 9 (`src/sim/world.js`, `src/save/migrate.js`). Three top-level records, each built by its owner's data file (createWorld and `v8ToV9` call the same functions), and checked in `src/save/serialize.js` by the owner's own `is...` function:

| field | made by | shape | owner |
|---|---|---|---|
| `reign` | `newReignState()` (`src/data/reign.js`) | `{ greatWork: null \| building id, won: null \| day, closed: false }` | A |
| `demands` | `newDemandState()` (`src/data/reign.js`) | `{ open: [demand], nextDay: null \| day, nextId: 1, log: [] }`; a demand is at least `{ id, kind: DEMAND_KINDS, day, due, accepted }` (`goods`, `gold`, `building`, `soldiers`) | A |
| `hazards` | `newHazardState(graceUntil)` (`src/data/hazards.js`) | `{ graceUntil: day, plague, drought, locusts }`, each kind `{ warning: null \| { day, strikes, ... }, active: null \| record, nextDay: null \| day, last: null \| record }` | B1 |

Two **optional per-building fields**, never added to a save and absent on anything older (so `v8ToV9` touches no building):
- a home's `large: true` marks a **Large plot** (`isLargePlot`). A 2x2 home without it was merged under the old rule (`isMergedHome`) and keeps the old rules (C).
- rubble's `was`: what stood there, `{ type, x, y, w, d, rot, day, cause: 'fire' | 'wreck' }` (the origin of the old footprint, shared by its tiles), for clearing, rebuilding and drawing a burnt-out shell. Absent: old rubble, drawn and cleared as before (B1 writes it, B2 draws it).

The validator accepts `large` only on a house (boolean) and `was` only on rubble (null or a record).

**Ranks beyond Capital are not a field** (ruling 621): Track A appends Great Capital and Seat of the Two Lands to `MILESTONES` (`src/data/progression.js`), so `world.milestone` holds them and a v8 Capital stays a Capital until it earns the next.

**Tallies**: `STAGE60_TALLY` = `V60_TALLY` (`src/data/v60.js`) joins `REIGN_TALLY` (`demandsMet, demandsFailed, greatWorkStages`), `HAZARD_TALLY` (`plagues, plagueHomes, quarantines, droughts, swarms, blights, harvestsEarly, wrecked, looted`) and `LARGE_TALLY` (`largePlots`); new and migrated cities start them at 0. A track may add a key to its own list until 6.0 is on main.

**`v8ToV9`** keeps every field as it was (homes, merged homes, milestone, treasury, rubble) and adds the three records new, the tallies at 0, and the grace from the **load**: `hazards.graceUntil = save's day + GRACE_DAYS` (1,080 days, three game years); a new city's is `GRACE_DAYS` from day 0 (ruling 623). Tested: a Capital with a merged Manor and 12,345 gold on day 2,000 keeps all three; `dangerDraws` is shut on days 2,000-3,079 and open on 3,080.

Older tests that pinned version 8 now pin 9; their migration chains end with `MIGRATIONS[8]`.

## 2. Track A seams: costs that grow, demands, the great work

**`costScale(world)`** (`src/sim/costs.js`) returns `{ wages, upkeep, monuments, court }`, multipliers on top of the difficulty's cost. Stub: `COST_SCALE_NONE` (all 1, frozen; `src/data/reign.js`). **It is already applied wherever each is paid, so Tracks B1 and C never touch a cost:**
- `wages`, `upkeep`: `src/sim/economy.js` through `upkeepIn(scale, type)` and `wageIn(scale)` in `monthFigures` (so `monthlyEconomy` and `monthForecast`), `monthlyBill(type, world)` (the cards and the placing bar now pass the world: `src/ui/cards.js`, `src/ui/placement.js`), `balanceWith`, `biggestCost`. Track A decides rounding there.
- `monuments`: `costOf` for a monument's founding, `workGoldPerUnit`, `extraGoldOf` (`src/sim/costs.js`). The palace is not scaled (Track A may add it in `palacePriceOf`).
- `court`: `tributeFor` (`src/sim/raids.js`, the raid tribute). What the court asks (requests, demands, the yearly quota in `src/sim/pressure.js`) Track A scales in its own files.

`monthlyBill(type)` without a world still gives the data's own figures (no game caller leaves it out).

**Demands** (`src/sim/demands.js`): `courtDemands(world)` → the open demands, oldest first, each the record plus `monthsLeft` (whole months to `due`, rounded up, 0 once due), as copies. `greatWorkOf(world)` (the building or null), `reignWon(world)`. Stubs (do nothing): `demandDay`, `demandMonth`, `demandAlerts` (→ []), `demandItems(world, alerts, out)`. Track A keeps each demand's reward and failure cost on the record so the words say them before Accept (ruling 612). Demands live in `world.demands`, not in `world.court` (the Stage 4.6 requests are untouched until Track A decides to fold them in).

## 3. Track B1 seams: the dangers and the raid strikes

**`dangerDraws(world)`** (`src/sim/hazards.js`, pure) → `{ open, graceUntil, daysLeft, chance, severity, raids, plague, drought, locusts, strikes: { burn, wreck, loot } }`. `open` is `day >= hazards.graceUntil`; before it no plague, drought or locusts may be drawn or warned and raiders neither wreck nor loot a storehouse (they burn and take a granary's food, as today: ruling 627). `chance`/`severity` come from `HAZARD_LEVELS` (`src/data/hazards.js`): Peaceful 0.5/0.5 with no plague and no raids, Relaxed 0.5/0.5, Normal 1/1, Hard 1.25/1.25 (B1 tunes; ruling 624). `plague` also needs `threatsOn` (no disease on Peaceful, ruling 320). Stubs: `hazardDay`, `hazardMonth`, `hazardAlerts` (→ []), `hazardItems(world, alerts, out)`.

**Raid strike hooks** (`src/sim/strikes.js` `STRIKES`, ruling 625): `burn`, `wreck`, `loot`, each `(world, active, b, events)`, run by `src/sim/raids.js strike` in `STRIKE_KINDS` order on anything that is not a home; gold is still stolen from anything but a granary. Today's behaviour moved there unchanged: `burn` = `igniteBuilding(..., 'raid')` and `active.fires`; `loot` = a granary's `RAIDS.foodShare` (returns units; strike counts it as `foodStolen`); `wreck` returns `[]` (stub). Track B1 fills `wreck` (rubble with `was`, `active.wrecked`, `active.wreckedKinds`, tally `wrecked`, event `{ type: 'raid_wreck', id, kind, to }`) and `loot` (storehouses too, `active.taken` `{ good: units }`, tally `looted`, event `{ type: 'raid_loot', id, goods }`), each gated by `dangerDraws(world).strikes`. The report (`raid.last`) keeps `burned`, `wrecked`, `wreckedKinds`, `taken`; absent means none (reports from before 6.0). **Track B2 draws from those events and from the state** (`b.fire`, rubble's `was`, `raid.active`), and never changes the sim.

Wrecking and rebuilding go through `src/sim/world.js` `makeBuilding`/`insertBuilding`/`removeBuilding` (as `fire.js` burns down); a rebuild command lives in `strikes.js` and calls `commands.js place`, never editing `commands.js` (Track C's in wave 1).

## 4. Track C seams: the Large plot

`src/sim/largePlots.js`: `isLargePlot(b)` (a house with `large: true`), `isMergedHome(b)` (a 2x2 house without it), `largePlotTiles(x, y)`, and two stubs: `largePlotUnlocked(world)` → false, `canPlaceLargePlot(world, x, y)` → `{ ok: false, reason: 'locked', warnings: [] }`. Track C fills them with canPlace's reasons (ruling 629) and places through `commands.js`. Data `src/data/largePlots.js` (`LARGE_PLOT.unlockTier` 5, the Townhouse; `size` 2). A Large plot is `type: 'house'`, so every home rule (taxes, needs, layers, fire, plague) holds; it never splits. A card of its own may be a `LARGE_BUILDINGS` row if Track C needs one.

## 5. Track D1 seam: map sizes

`MAP_SIZE_TABLE` (`src/data/map.js`): small 48, normal 64, large 80 (offered), **huge 112 (`offered: false`, `bigScreen: true`)**; `HUGE_MAP_SIZE`. `MAP_SIZES` is the offered rows, so the picker, links, records, `isMapSize` and `?size=` are unchanged until D1 sets `offered: true` with its picker words, the phone note, the zoom frame and the start guarantees (ruling 628). `createWorld({ size: 112 })` already works (tested; the `v60-huge` scene uses it). D1's salts `HUGE_SALT` 6071-6079.

## 6. Track D2 seam: the lesson

Settings keys (`src/ui/settings.js`): `lessonDone` (boolean, false) and `lessonStep` (integer ≥ 0, 0), validated like the others. `lessonDue(settings, hasSavedCity)` (`src/ui/lesson.js`) → true when the lesson is not done and there is no saved city (ruling 617); nothing calls it yet. The lesson's map and steps: `src/data/lesson.js` (`LESSON`, `LESSON_STEPS`). Nothing about the lesson is in the world (ruling 626).

## 7. Hooks wired once (no track edits clock.js, alerts.js, cityAdvice, createUI or the shared lists)

- **Sim** `src/sim/v60.js`: `v60Day` (after `s46Day`): `demandDay`, `hazardDay`; `v60Month` (after `pressureMonth`): `demandMonth`, `hazardMonth`; `v60Alerts` (after `s46Alerts`); `v60Advice(world, alerts, out)` (at the end of `cityAdvice`, before ranking): `demandItems`, `hazardItems`.
- **Advice kinds** (`src/data/advice.js ADVICE_KINDS`): `raid_towers, plague, fire, locusts, drought, treasury, demand, illness, crime, home_need, stranded, running_out, workers_short, jobless` (the old ten keep their order). Weights for the new kinds go in the track's own data file (`reign.js`, `hazards.js`), not in `ADVICE`.
- **Interface seams** `src/ui/v60/index.js` `createV60Seams` (after the Stage 4.7 seams in `createUI`): `reign.js` (A), `hazards.js` (B1), `largePlot.js` (C), `battle.js` (B2), `lesson.js` (D2); each `seamBase()` (`src/ui/s46/seam.js`: sheets, sheetParts building/house/actions/summary, onEvents, refresh, onAlertAction, onCommand, destroy). B1's "Harvest now" and quarantine buttons are sheet parts here, not edits to `sheets.js`.
- **Lists** joined by `src/data/v60.js` from each wave-1 track's data file: `V60_BUILDINGS` (end of `BUILDINGS`), `V60_GOALS` (end of `GOALS`), `V60_EVENT_GOALS` (end of `EVENT_GOALS`), `V60_FIRSTS`, `V60_ACHIEVEMENTS`, `V60_TIPS`, `V60_TALLY`. Wave-2/3 tips: `TIPS_V60_B2/D1/D2` in `src/data/tips.js`'s v60 section, one list each.
- **Words** (`src/ui/text.js`, at the end): a `v60 contract` section with `V60_HELP` (`{ a, b1, c, b2, d1, d2 }` lists of `{ head, text }`; How to play prints them after Gestures, in that order: `src/ui/menu.js`) and `V60_ADVICE_WORDS` (kind → `(item, world) => { what, why, fix }`; `adviceWords`' default case asks it). Then one section per track, separated by stable separator lines. A track writes only in its own section: its `TIP_TEXT`/`TIP_HELP_TEXT`/`FIRST_TEXT`/`ALERT_TEXT` entries (`ALERT_TEXT[code] = (alert, world, b, name) => { title, fix }`), its `V60_HELP.<track>.push(...)`, its `V60_ADVICE_WORDS.<kind>`.

## 8. Salts

`hash2(a, b, (world.seed + SALT.x) | 0)` or `createRng((seed ^ SALT.x) >>> 0)`; never the map generator's own stream. Ranges: A `REIGN_SALT` 6001-6019; B1 `HAZARD_SALT` 6021-6049; C `LARGE_SALT` 6051-6059; B2 `BATTLE_SALT` 6061-6069 (drawing only, `src/data/battle.js`); D1 `HUGE_SALT` 6071-6079 (`map.js`); D2 6081-6089 if it needs any. Rename spares, never reuse a number; the contract test keeps every salt in the game unique.

## 9. Files: who owns what

A track edits only files it owns; a **shared** file only in its own marked part. Wave-1 tracks A, B1 and C run in parallel, so the wave-1 split is strict.

| Track | Owns (edits freely) |
|---|---|
| **A** | `src/data/reign.js`, `src/sim/demands.js`, `src/ui/v60/reign.js`, `src/dev/v60/reign.js`; `src/sim/costs.js` (the `costScale` body and `palacePriceOf`; keep the other functions' signatures), `src/sim/economy.js`, `src/data/economy.js`; `src/sim/court.js`, `src/data/court.js`, `src/ui/s46/court.js`, `src/sim/pressure.js`, `src/ui/s47/pressure.js`; `src/data/progression.js`, `src/sim/progression.js`; `src/sim/monuments.js`, `src/data/monuments.js`, `src/ui/monumentSheet.js` (the great work reuses them); `src/sim/score.js`, `src/data/scoring.js`, `src/ui/scoreUi.js`'s seal part (the sealed score); `tests/v50/grand`, the run scripts' asserts it must move (record why) |
| **B1** | `src/data/hazards.js`, `src/sim/hazards.js`, `src/sim/strikes.js`, `src/ui/v60/hazards.js`, `src/dev/v60/hazards.js`; `src/sim/raids.js` (not `tributeFor`), `src/data/raids.js`, `src/sim/combat.js`, `src/sim/armies.js` (the chieftain), `src/sim/fire.js`, `src/data/fire.js`, `src/sim/health.js`, `src/data/health.js`, `src/sim/flood.js` (the Nile reading's low flood), `src/sim/production.js` (half harvests, Harvest now), `src/ui/dangerSheets.js` (the raid report), `src/render/illness.js`, `src/render/flood.js` |
| **C** | `src/data/largePlots.js`, `src/sim/largePlots.js`, `src/ui/v60/largePlot.js`, `src/dev/v60/largePlot.js`; `src/sim/housing.js`, `src/sim/merge.js`, `src/data/housing.js`, `src/sim/commands.js`, `src/sim/advice.js` (nextStep, causeFix, the Estate trick; not `cityAdvice`'s last lines), `src/data/advice.js` (`ADVICE`; not `ADVICE_KINDS`), `src/ui/sheets.js`, `src/ui/nextStepText.js`, `src/ui/adviceText.js` (not the default case), `src/sim/layers.js`, `src/ui/layersPicker.js`, `src/render/layers.js`, `src/ui/placement.js`, `src/render/chunkIndex.js`, `src/render/markers.js`, `src/render/art/housing.js`, `tests/v50/grand/` |
| **B2** (wave 2) | `src/data/battle.js`, `src/ui/v60/battle.js`, `src/dev/v60/battle.js`; `src/render/units.js`, `src/render/effects.js`, `src/render/fire.js`, `src/render/art/defence.js` (rubble and shells), `src/render/art/armies.js` |
| **D1** (wave 2) | `src/dev/v60/title.js`; `src/data/map.js` (the size table, `HUGE_SALT`), `src/sim/mapgen.js`, `src/ui/titleCard.js`, `src/ui/scoreUi.js`'s title part (This week's Nile goes), `src/ui/share.js`, `src/save/records.js` (sizes), `src/boot.js` (title flow, sound), `src/audio/*`, `src/ui/keyboard.js`, `src/ui/input.js`, `src/render/camera.js`, `src/ui/cameraControl.js`, `src/ui/settings.js` (`sound` default); `css/*` for the polish pass |
| **D2** (wave 3) | `src/data/lesson.js`, `src/ui/lesson.js`, `src/ui/v60/lesson.js`, `src/dev/v60/lesson.js`; `src/data/tutorial.js`, `src/ui/tutorial.js`, `src/dev/tutorialScenes.js`, `tools/tutorial.ps1`, `assets/` cards; `src/ui/settings.js` (`lessonDone`/`lessonStep` only); `src/boot.js`'s lesson offer (after D1's) |
| **Track 0** (nobody edits after) | `src/data/v60.js`, `src/sim/v60.js`, `src/ui/v60/index.js`, `src/dev/v60/index.js`, `src/dev/v60/base.js`, `tests/v60/all.js`, `tests/v60/contract/` |

**Shared files and who edits which part**
- `src/ui/text.js`: each track only in its own `── v60 <track> ──` section at the end (append above its end marker). Never edit another section or the contract section.
- `src/data/tips.js`: A, B1 and C add tips in their own data files (`REIGN_TIPS`, `HAZARD_TIPS`, `LARGE_TIPS`); B2, D1, D2 each in their own `TIPS_V60_<track>` list.
- Firsts, achievements, goals, buildings, tallies: only through the track's own data file lists (section 7). `firsts.js`, `achievements.js`, `goals.js`, `buildings.js`, `world.js` are not edited.
- How to play: `V60_HELP.<track>` in the track's text section (D1's keys may also add `HELP_ROWS` rows in its section via `HELP_ROWS.push`).
- `src/render/overlays.js`: C owns it; B1 may change only the Health layer's home marks (`drawHomeRisk`'s health branch and the functions it calls) to show plague.
- `src/ui/settings.js`: D1 the `sound` default, D2 the lesson keys (different waves).
- `src/ui/createUI.js`, `src/sim/clock.js`, `src/sim/alerts.js`: nobody (the hooks are wired); a track that truly needs a line asks the controller and records a ruling.
- `src/data/releases.js`, `README.md`, `APP_VERSION`: wave 4 only, at the end.
- `sw-files.js`: regenerated (`tools/sw-files.ps1`), never merged by hand.
- Tests: each track only in `tests/v60/<track>/` and its `all.js`; it updates an older test only where its own change moves that test's number (with the reason in the commit).

## 10. Dev scenes

`src/dev/v60/index.js` `V60_SCENES` (joined in `dev/scenes.js`; `VERSION60_SCENES` lists them), each in its track's file and refined by it; open `/?skipTitle=1&nosw=1&seed=11&sample=1` first (`v60-title`: `/?nosw=1`). Every scene takes `{ quick }`; helpers `sampleCity`, `look`, `endGrace`, `fullestHome` in `src/dev/v60/base.js`. As Track 0 left them (each loads without error in a booted game: `tests/v60/contract/scenes.test.js`):
- `v60-demand` (A): the seed-11 sample Capital with one demand offered: 400 linen within 12 months.
- `v60-greatwork` (A): the sample Capital, no great work yet.
- `v60-plague` (B1): grace ended, `hazards.plague.active` set on the fullest home.
- `v60-drought` (B1): a low Nile warned 90 days ahead. `v60-locusts` (B1): locusts warned over the first four farms.
- `v60-raid-burn` (B1): grace ended, the camera at the first raider entry. `v60-battle` (B2): the same, for the clash.
- `v60-largeplot` (C): the camera on the sample's first Townhouse.
- `v60-title` (D1): the title card's buttons, read. `v60-huge` (D1): a new seed-11 city on a 112 map.
- `v60-lesson` (D2): the device's lesson state.

## 11. Tests

`tests/all.js` imports `tests/v60/all.js` once; it imports `contract/all.js` then `a`, `b1`, `c`, `b2`, `d1`, `d2`, `balance` (each `tests/v60/<track>/all.js`, owned by its track). Describe names start with `v60 <track>` (`-Grep "v60 c"` also matches `v60 contract`: harmless).

## 12. Merge order

Wave 1: **C, then B1, then A** into `version-6-0` (C changes the most shared sim, `housing.js`/`commands.js`/`advice.js`; B1 next, raids and fire; A last, because its balance numbers must be measured with the dangers and the Large plots in). Regenerate `sw-files.js` after each merge, full suite after each. Wave 2: **B2, then D1**. Wave 3: D2. Wave 4: balance, review, fixes, docs and `releases.js`.

## Rulings (Track 0)

620. World version 9 adds three records (`reign`, `demands`, `hazards`) and two optional per-building fields (`large`, `was`); the migration adds no building field. — Cost if wrong: a track that wanted every house flagged adds the flag in its own code path.
621. The ranks beyond Capital are `MILESTONES` rows, not a world field. — Cost if wrong: Track A needs a field after all, a v10 migration.
622. `costScale` is one stub in `costs.js`, already applied to wages, upkeep, monuments and the raid tribute. — Cost if wrong: Track A finds another place to scale and edits a shared file.
623. The grace is a day (`hazards.graceUntil`): three game years from day 0, or from the load day for a v8 city, whatever its year. — Cost if wrong: an old city's dangers start sooner or later than a player expects.
624. Difficulty factors: Relaxed and Peaceful chance and severity 0.5, Hard 1.25; Peaceful has no plague but does have drought and locusts. — Cost if wrong: a Peaceful player meets a lean year.
625. A raid strike is three hooks (burn, wreck, loot) run in that order; today's strike moved into them unchanged. — Cost if wrong: B1 reorders them in its own file.
626. The lesson's state is two settings keys, never the world's. — Cost if wrong: a lesson left part-way cannot rebuild its city exactly.
627. Wrecking and looting a storehouse are new dangers and wait out the grace; burning and a granary's food do not. — Cost if wrong: an old city's first raid after loading is as harsh as before, not harsher.
628. Huge (112) is in a size table but not offered until Track D1 turns it on. — Cost if wrong: none (one flag).
629. A Large plot is a `house` with `large: true`, not a new building type. — Cost if wrong: code that keys on `w > 1` alone treats a Large plot as merged; use `isMergedHome`.
630. Demands live in `world.demands`, apart from the Stage 4.6 requests in `world.court`. — Cost if wrong: Track A folds requests into demands and clears the old record itself.
