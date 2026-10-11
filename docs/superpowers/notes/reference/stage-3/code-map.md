# Thebes Stage 3 ("Danger"): code map for planning

Read-only survey of `C:\dev\thebes` at `main` = `ce5593b` (911 tests, ALL PASSED). Nothing in the repo was changed.

## Headlines

- **Nothing for Stage 3 exists yet** apart from stored hooks: `DIFFICULTIES[*].risk` (`src/data/difficulty.js`), `world.raiderEntries` (fixed east-edge and north-edge points in `src/sim/mapgen.js:50`), the empty `defence` category with icon and tint (`src/data/ui.js`), the `safety` labour level (`src/data/labour.js`, `LEVEL_NAMES` in `text.js`), and the critical-banner machinery (`src/ui/alerts.js`, `body.has-banner`).
- **There is no A\* pathfinding.** The only searches are breadth-first walks along roads: `walkRoads` in `src/sim/reach.js`, `joinsEntry` in `src/sim/trade.js` and `walkerLoop` in `src/render/walkers.js`.
- **Randomness is stateless:** a fresh `createRng(hash2(key, seed, salt))` per key (`daily.js:46`, `trade.js:97 drawDrift`), with no RNG state in the world. Fire and raids should do the same.
- **Many tests pin lists** the first Stage 3 commit must update (version, unlocks, desirability, sound names, overlays, the service-worker hash).
- **The 10-year village, the 6-year capital run, the stress city and the title backdrop** will all start meeting fire and raids.

## 1. Spec requirements: what exists, what is missing, and where each plugs in

| Requirement (spec) | Exists | Missing | Extension point |
|---|---|---|---|
| Daily loop for fire risk (4.3) | `tickDay` in `src/sim/clock.js`: `assignLabour`, `produceDay`, day+1, arrivals, `runMonth`, `peakPeople`, `triggerEventGoals`, `checkGoals`, `checkFirsts`, `checkDaily` | a daily step for fire and for raids | Insert `fireDay(world, events)` and `raidDay(world, events)` after `produceDay`. Insert `raidMonth` and soldiers' pay into `runMonth` before `updateMood`. Events are plain objects pushed into `events`. |
| Fire risk from Town; firehouse lowers it; ignition at 3% (4.12) | `atLeast(world,'town')` in `progression.js`; `roadReach` / `reachDistance` / `buildingsInReach` in `reach.js`; `staffRatio` / `isWorking` in `labour.js` | new `src/sim/fire.js`, new `src/data/fire.js` (risk per type, threshold, 3% chance, burn days, spread chance, firehouse reduction, rubble clearing cost) | Firehouse coverage: union the firehouses' `roadReach` maps, then test each building's `adjacentRoadTiles`. Cache it outside the world (a WeakMap keyed on `roadVersion` plus a building signature, as `desirability.js` does). Do **not** copy `coveredBy` (houses × providers): that is the known 1-2 s overlay cost. |
| Firehouse (4.5 reach 10, Village, red emblem) | nothing | `BUILDINGS.firehouse`, a Village unlock, art, thumbnail, sheet | `src/data/buildings.js` (priority `safety`, category `services`), `src/data/progression.js` village list, `AUTO_OVERLAY.firehouse='fire'` and a walker kind in `KIND_BY_TYPE` (`walkers.js`) |
| Burned house → empty plot; others → rubble that costs to clear (4.12) | `splitHouse` (`src/sim/merge.js`) already turns an emptied 2×2 home into four empty plots; `demolishRefundFor` / `demolishAt` / `demolishArea` (`commands.js`) | the rubble type, a clearing cost (a negative refund needing `canAfford`), and the rubble art slots | Rubble **must** be a `BUILDINGS` key, or `validateWorld` rejects the save (`serialize.js`: every building type must exist). Mark it `buildable:false` and amend `stage2Cards.test.js:54`, which requires every building to have one category and one milestone. Burning must **remove the building and insert a new id**, never change `type` in place: the desirability memo assumes "a type never changes under the same id" (`desirability.js` `signature`). |
| The first fire adds a goal "Build a firehouse near …" (4.1, 4.12) | `EVENT_GOALS` keyed on alert `trigger` codes (`data/goals.js`), `triggerEventGoals` (`sim/goals.js`) | the `fire` alert code and the goal | Use need `{kind:'building', type:'firehouse'}`, not `noAlert`. A fire goes out by itself, and a known issue says event goals "complete when their trouble disappears". |
| Raids from 250 people; the first no sooner than 2 years later, sized for one tower; later ones every 2-4 years, seeded; size fixed at the warning; a 2-month warning (4.13) | `world.raiderEntries`; `dateParts` / `monthIndex` (`clock.js`); `yearOf` (`trade.js`, a duplicate) | `src/sim/raids.js`, `src/data/raids.js`, and world state: the day 250 people was reached, the next raid day, the warning, the active raid, raiders, count, last raid day | Draw each raid's day and size from `hash2(seed, raidIndex, salt)`. `makeTestWorld` sets `raiderEntries: []`, so raid tests need their own entries. |
| Pay tribute (4.13, 7.3 lists `payTribute`) | the `canAfford` / `spend` floor of −500 (`money.js`) | a `payTribute` command | Put it in `sim/raids.js`. The interface reaches it only through the command (7.3). |
| Raiders walk by A\* over ground and roads; walls block until broken; gates stop raiders; towers shoot within 4 tiles; barracks soldiers intercept; raiders set fires and steal gold; the raid ends at all dead or half lost (4.13) | `NEIGHBOURS4` / `inBounds` / `idx` (`grid.js`) only | `src/sim/pathfinding.js`, `src/sim/combat.js`, defence data, and walls as a tile layer | Recommended: one multi-source flow field per raid toward valuable buildings, recomputed on a wall, road or occupancy version (cached outside the world), with raiders walking down it. Walls drawn "like roads" (6.4 Drawing mode) fit a `world.wall` tile array (hit points per tile) better than one building per tile; gates are wall tiles on roads. Raid code calls `igniteBuilding(world, id)` from `fire.js`. |
| A raid warning or a fire drops speed to 1×; the first warning pauses (4.3, 6.8) | `setSpeed` (`commands.js`); `createSpeedControl` (`ui/speed.js`) repaints only via `api.render()` | the speed drop | The sim sets `world.speed` (deterministic and saved). `src/render/loop.js` `frame()` keeps ticking up to 12 days per frame after a pause, so add `if (world.speed === 0) { acc = 0; break; }`. `createUI.onEvents` must call `speedControl.render()`. |
| Mood: a raid in the last 6 months, buildings burned in the last 6 months (4.9) | `updateMood` (`sim/mood.js`); `MOOD` data; `MOOD_NAMES` (`text.js`); the summary lists `moodBreakdown` keys | two new mood terms and the days they look back to | `data/mood.js` plus `sim/mood.js`. The summary rows appear without further work once `MOOD_NAMES` has the words. |
| Soldiers' pay and tribute as spending (4.11) | `monthlyEconomy` (`sim/economy.js`) writes `stats.lastMonth` | a pay line in the summary | Add a `soldiers` field in `stats.lastMonth` and a row in `summarySheet` (`ui/sheets.js`). |
| Walls, gate, tower, barracks at Market town (4.14) | `MILESTONES` (`data/progression.js`); "New" badges (`updateMilestone`); `cardShown` (`ui/cards.js`); the defence card test scaffold (`stage2Cards.test.js:61-75`) | the data and the cards | `CATEGORIES.defence.items` (`data/ui.js`). Keys 1-7 already map category 6 to Defence. |
| Difficulty risks ×0.5/1/1.5 (4.18) | `DIFFICULTIES` | a reader for the risk multiplier | Add `riskOf(world)` next to `costOf` (`sim/costs.js`). `difficultyHint` (`text.js`, comment at line 325 "not promised") can now name the risks. `difficultyChoice.test.js` compares against the function, so it follows. |
| Critical alert banners with View and Pay tribute (6.3) | `CRITICAL = new Set(['debt','save_failed'])`, `renderBanner`, `onNewCritical` → `sfx.play('alert')`, `body.has-banner` (`ui/alerts.js`); CSS `#banner .critical` and `body.has-banner #legend` (`css/ui.css:65-75`) | new codes, a tribute action, collapsing rows | Add `fire`, `raid_warning` and `raid` to `CRITICAL`. Collapse many fires into one row ("3 fires"). Give `createAlerts` an `onTribute`. `alertsFor` (`sim/alerts.js`) gets the codes. `alertText` (`text.js`) gets the words. |
| Minimap pin at the entry point (4.13) | `createMinimap.render(alerts)` pins only alerts that have a building `id` (`ui/minimap.js:49`); the same holds for `problemMarkers` (`render/overlays.js:224`) | pins at a map point | Accept alerts with `x, y`. |
| Fire-risk overlay, graded with a legend (6.3) | `OVERLAYS`, `GRADED_OVERLAYS`, `OVERLAY_HUE`, `drawOverlay` (`render/overlays.js`); legend `scale()` (`ui/overlayUi.js`), which is hard-wired to `DESIRABILITY_STEPS` and `desirabilityBand` | a `fire` overlay | Generalise `scale(kind)`. `overlaysStage2.test.js:60,65` pins both lists. |
| Flames, smoke, raiders, soldiers (5.4: under 3 flashes per second; reduced motion) | `effects.js` holds transient, event-driven effects; `walkersAt` is cosmetic; `collectObjects(world, range, walkers)` depth-sorts `fig.<kind>` (`renderer.js`); `FIGURE_KINDS` (`art/figures.js`) | `render/fire.js` and `render/units.js` | Flames must be **state-driven** (from the world's fire state) so they survive a reload. Units append `{id, kind:'raider'\|'soldier', x, y}` to the walkers list. Figures need the new kinds. |
| Raid horn (5.5) | `SFX` table (`audio/sfx.js`) | a `horn` entry | `sfx.test.js:35` pins the names. Line 67 requires each note ≤ 0.4 s and gain ≤ 0.35, so the horn must be built from short notes. |
| World v4 and migration | `WORLD_VERSION = 3` (`sim/world.js`); `MIGRATIONS {1,2}` (`save/migrate.js`); `REQUIRED`, `TALLY_KEYS`, `validateWorld` (`save/serialize.js`) | `v3ToV4` | Pinned at 3 in `migrateV2.test.js:56-62`, `migrateV3.test.js:55-61` and `store.test.js:60`. The migration should push already-unlocked new types into `newItems` (a firehouse for every city; defences at Market town and up). That also fixes a known issue for these types. |
| Undo after fire or raids | `undo.js` trusts last-in-first-out order | two guards | A 1a follow-up already says "skip refunds when `removeBuilding` returns null, and refuse a demolish-undo onto an occupied footprint". Otherwise undoing the placement of a building that has since burned refunds it in full. |

## 2. Stage 2 and early-game leftovers that Stage 3 touches

- **Banner stacking:** with two banners up, the legend already reaches the lower half, and on an 844×390 phone the goals strip ends near 55% of the height. Fire and raids make banners common, so collapse them and shrink the legend to an icon, as spec 6.3 asks.
- **Same-title View names:** two buildings with the same alert title share one View name. Several fires make this worse.
- **`alertsFor` cost:** it runs several times a tick (`triggerEventGoals`, each `noAlert` goal, `alerts.refresh`). Compute it once per tick.
- **Store re-entrancy** (1c note, flagged for Stage 3): `sheets.render` calls `store.set(closeSheet)` inside a subscriber when the selected building is gone (`ui/sheets.js`, about line 298). Buildings vanishing on the daily tick makes this a real bug.
- **Small fixes to absorb:**
  - "New" badges after migration and undo, for the new types.
  - A thousands formatter in `text.js`; the score needs one.
  - One of `yearOf` / `dateParts` for raid timing, not both.
  - The trade sheet's refused toast says "Not enough gold" where the sheet says "Would put the treasury over 500 gold in debt". Pay tribute must not repeat this.
- **Balance note:** the capital run sits at about 154,000 gold by year 6, and wages plus upkeep are 30% of taxes against the 60-70% target. Gold sinks for Stage 3:
  - defence upkeep and soldiers' pay;
  - tribute (it should scale with population, or with treasury, to bite late; this needs a ruling);
  - rubble clearing and rebuilding;
  - festivals (ruling 34: "a Stage 3 candidate").
- **Long runs that change:**
  - `longrun.test.js` reaches Town, so its script needs a firehouse.
  - `capital.test.js` runs 6 years at 1,000+ people, so it needs a firehouse and defences or tribute. Its money check still holds, because fires and raids only remove gold.
- **Fixtures that will burn:** `buildSampleCity` (600 days to Town; feeds the title backdrop `TITLE_SEED` 11, `?sample=1` and the screenshot scenes) and `buildStressCity` (60 days at Capital). Both should place a firehouse. The fire and raid steps also add to the 600-day backdrop's load time on a phone.

## 3. Scoring and gamification: what exists and where a score plugs in

**What exists (no score anywhere):** goals with chapters and event goals (`data/goals.js`, `sim/goals.js`); firsts at 10 gold each (`checkFirsts`); 32 achievements with no gold (`achievementProgress`); daily goals at 25 gold with no streaks (`DAILY_POOL`); running counts in `world.tally` (`harvested`, `profitMonths`, `peakPeople`, `upgrades`, `dailyDone`, `made`, `sold`, `bought`, `tradeIncome`, `caravans`); `world.history` (12 month-end rows of `{day, people, gold, mood}`, read by Welcome back's `trendRow`); celebrations (`cheerFor` in `createUI.js`); the summary's `achievementsSection`; `closestAchievement` on Welcome back.

**Design tension:** the research rules (`notes/reference/city-builders/onboarding-and-gamification.md` §7 rule 6) say "No points or score". Josh's request for scoring overrides that rule, so record it as a ruling. Keep the score informational and never gating: no leaderboard, no streaks. Ratings work well here (the Heaven review's "four ratings so a lopsided city shows"), for example Prosperity, Culture, Safety and Growth, with a total scaled by difficulty.

**Where a score plugs in:**

| Where | File and function |
|---|---|
| The calculation | New `src/sim/score.js` `scoreOf(world)`, a pure function. It reads `tally`, tiers, goals, achievements and the new Stage 3 tallies (fires, buildings lost, fires put out, raids repelled, tributes, raiders beaten, gold stolen). The tally keys go in `createWorld`, `v3ToV4` and `TALLY_KEYS`. |
| History | Add `score` to each `world.history` row pushed in `runMonth`. Welcome back then adds a trend row. |
| Summary | A score section in `summarySheet`. Add a hook so it does not conflict with the interface track. |
| Title card | `createTitleCard` has no slot today. Add a `records` parameter for "Your cities: best and last score". |
| Records across cities ("each time") | New `src/save/records.js` in `localStorage` (`thebes.records`, wrapped in try/catch like `ui/settings.js`). Write it from `hooks.save` in `boot.js`. The world has no city id: use the seed, or add `world.meta.createdAt` passed in by the interface. The sim never reads the clock. |
| Export | The score is computed from the world, so exported saves carry it. Per-device records stay local, or go beside the world in the save envelope (`packSave`, `SAVE_VERSION` 1). |

**Early-game gamification additions** (all data plus words in `text.js`):
- Firsts: first firehouse, first fire put out, first wall, first raid beaten.
- Achievements: the research's "500 people, no fire losses for a year"; repel 3 raids; never pay tribute.
- Daily goals: build a firehouse, lay 10 wall tiles, build a tower (`from: 'market_town'`).
- Chain goals: "Build a firehouse" at Town, where fire risk begins; "Build a tower and barracks" at Market town.
- A `danger` chapter in `CHAPTER_NAMES`.
- Score bands (bronze, silver, gold) per city.

## 4. Technical risks

- **Determinism:**
  - Use `hash2(b.id, world.day, seed + salt)` for ignition, `hash2(burningId, neighbourId, day)` for spread, and the raid index for raid timing and size. Iterate in `allBuildings` order (ascending id).
  - Keep every fire, raider and soldier state in the world: positions, hit points, days left to burn. Then save-then-load mid-raid stays identical.
  - Keep path and coverage caches outside the world (`reach.js` WeakMap pattern).
  - Extend `serialize.test.js:77` ("identical worlds for the same seed and commands") with a city that is burning and raided.
- **Performance:** the stress city's month already takes about 0.4 s, and the first goods overlay 1-2 s (houses × providers).
  - Keep the daily fire step O(buildings) with cached coverage; spreading checks only the neighbours of burning buildings.
  - A\* on 4,096 tiles costs about 1 ms. A shared flow field per raid, rebuilt only on a version change, is cheaper still.
  - The fire-risk overlay must read the cached coverage, not `coveredBy`.
- **Save migration:** start the raid clock of a v3 city above 250 people at load, so no raid lands at once. The rubble type must exist before any save holds it. Default the per-building fire fields in `makeBuilding` and `v3ToV4`.
- **Test runner:** `run-tests.ps1` waits a fixed 45 s, then retries once. Today's full run took 25 s on a quiet machine and 50 s with one `find` running alongside (it passed only because the results arrived inside the window). Stage 3 adds perhaps 150-250 tests, so make the wait a parameter (`-WaitSeconds 120`).
- **Timing checks that flake under load:** `longrun` < 3000 ms, `capital` < 5000 ms, `stress` frame < 50 ms (wide < 120 ms), `desirability` previews < 100 ms.
- **Screenshots:** `tools/shots.ps1` has default and `-Stage2` scenes driven through `window.__thebes`.
  - Add `-Stage3` scenes: a fire with its banner, a raid warning with Pay tribute, placing walls, the fire-risk overlay, the score.
  - The Stage 2 scenes use the seed-11 sample city, so they shift if it burns.
  - From Git Bash, use `MSYS_NO_PATHCONV=1` and `C:/...` paths.
- **Service-worker list:** `sw-files.js` holds a hash of every cached file, and `tests/ui/pwa.test.js:41` fails when it is stale. Every branch that edits `src/` changes it, so it always conflicts on merge.

## 5. Parallelisation map

**Track 0, the contract** (one agent, merged first; everything below branches from it):
- World and saves: `WORLD_VERSION` 4 with every new field; `v3ToV4`; `REQUIRED`, `TALLY_KEYS` and validation; updates to the pinned tests (version, unlock lists, desirability table, `stage2Cards` `buildable:false`, sound names, overlay lists).
- All data, with numbers as rulings: `data/buildings.js` (firehouse, wall, gate, tower, barracks, rubble), `progression.js`, `desirability.js` (values for the new types, which spec 4.7 lacks), and new `data/fire.js` and `data/raids.js`.
- `riskOf` in `sim/costs.js`.
- Stub modules with final signatures:
  - `sim/fire.js`: `fireDay`, `igniteBuilding`, `burnBuilding`, `fireRiskOf`, `fireCoverage`, `fireAlerts`, `rubbleClearCost`.
  - `sim/raids.js`: `raidDay`, `raidMonth`, `payTribute`, `raidAlerts`.
  - `sim/combat.js`, `sim/pathfinding.js`, `sim/defence.js` (`previewWall`, `drawWall`), `sim/score.js`.
  - `render/fire.js`, `render/units.js`, `render/art/defence.js` (placeholder boxes, so the art registry is complete).
  - `ui/danger.js`, `ui/scoreUi.js`.
- One-time wiring:
  - `clock.js`: the daily and monthly calls.
  - `sim/alerts.js`: `alerts.push(...fireAlerts(w), ...raidAlerts(w))`.
  - `demolishRefundFor` → `rubbleClearCost`.
  - `loop.js`: the stop on speed 0.
  - `createUI.js`: seams that create `danger` and `scoreUi` and route events to them.
  - `sheets.js`: a summary-section hook.
- Agreed event shapes: `{type:'fire', id}`, `{type:'fire_out', id}`, `{type:'burned', id, to}`, `{type:'raid_warning', entry, size, tribute, dir}`, `{type:'raid_start'}`, `{type:'raid_end', won}`.
- Test layout: `tests/all.js` imports one aggregator per track (`tests/stage3/{fire,raids,art,ui,score}.all.js`), each starting empty. Describe names use the prefixes `s3 fire`, `s3 raids` and so on, so `-Grep` selects a track.
- `run-tests.ps1` gets `-WaitSeconds`.

| Track | Owns | Shared files (conflict risk) and how to avoid conflicts |
|---|---|---|
| A Fire sim | `sim/fire.js`, `data/fire.js` tuning, `sim/undo.js` guards, `sim/mood.js` fire term, `tests/stage3/fire/*` | `merge.js` (reuse `splitHouse`, no edits) |
| B Raids and defence sim | `sim/raids.js`, `combat.js`, `pathfinding.js`, `defence.js`, `data/raids.js`, the soldiers' pay in `economy.js`, the raid term in `mood.js` (a different hunk from A's), `tests/stage3/raids/*` | Codes against the contract's `igniteBuilding`. `commands.js` is not touched (walls live in `defence.js`). |
| C Art and render | `render/art/defence.js`; the firehouse and rubble in `art/services.js`; figures (`raider`, `soldier`, `firefighter`); `render/fire.js`; `render/units.js`; a wall terrain layer (`terrainBaker` signature plus a new `terrainWalls.js`); `ui/thumbs.js` icons | `renderer.js`: one hook only, added in the contract |
| D Interface and sound | `ui/danger.js` (speed reaction, horn, tribute), `ui/alerts.js` (critical set, collapsed rows, `onTribute`), `ui/minimap.js` point pins, `render/overlays.js` fire overlay, `ui/overlayUi.js` graded legend, `ui/placement.js` wall tool, building sheets in `ui/sheets.js`, `audio/sfx.js` horn, the store re-entrancy fix | `text.js`, `ui.css`, `sheets.js` |
| E Scoring and gamification | `sim/score.js`, `save/records.js`, `ui/scoreUi.js`, `welcomeBack.js` trend, `titleCard.js` records, the data in `firsts.js`, `achievements.js`, `daily.js` and `goals.js` | `text.js`, `ui.css`, `sheets.js` (only through the hook) |
| F Integration and balance (last, by the integrator) | the `capital` and `longrun` scripts, `dev/sampleCity.js` firehouses, `difficultyHint`, `tools/shots.ps1 -Stage3`, README, follow-ups note | n/a |

**Avoiding conflicts:**
- `text.js`, `ui.css`, `tests/all.js`: the contract leaves one delimited section per track at different places in the file, with stable lines between them, so the hunks never touch.
  - In `text.js`, tracks add their own objects (`FIRE_TEXT`, `RAID_TEXT`, `SCORE_TEXT`) rather than appending keys to the end of the single `T` literal, where every track would collide.
  - Data and its words must land in the same commit. `houseSheetEconomy.test.js` checks that firsts, achievements and daily goals have text.
- `data/buildings.js` and `world.js`: contract only. Tracks may tune numbers only on their own lines.
- `sw-files.js`: tracks regenerate it locally so `pwa.test.js` passes. On a conflict the integrator never edits it by hand: take either side, rerun `tools/sw-files.ps1`, rerun the suite, commit.
- Merge order: 0 → A → B (its tests may then switch from the stub to real fire) → C → D → E → F. Run the full suite after each merge. Track tests run with `-Grep 's3 <track>'`.

**Git worktrees:**
- `run-tests.ps1` and `tests/screenshot.ps1` serve `Split-Path -Parent $PSScriptRoot`, so each worktree tests its own files. Ports are free ones and each run gets its own GUID Edge profile in `%TEMP%`, so concurrent runs are safe functionally. Machine load is the limit (14 logical CPUs): stagger full runs or use `-Grep`, and expect the timing assertions above to flake.
- The repo identity (`user.email` in the local `.git/config`) and `.git/info/exclude` (which holds `.superpowers/`) are shared by every worktree, so commits get the right identity and `.superpowers/` is ignored everywhere.
- `sdd-workspace` resolves `git rev-parse --show-toplevel`, so each worktree gets its own `.superpowers/sdd/<plan>/`. Keep the master ledger in `C:\dev\thebes` and pass briefs and report files as absolute paths. `review-package` can run from the main checkout against any track's commits, because the object store is shared.
- Neither `.worktrees/` nor `.claude/worktrees/` is ignored today. Put worktrees in sibling folders (for example `C:\dev\thebes-s3-fire`), or add the folder to `.git/info/exclude` first. That is a local file, not a commit.
- Never push: a push to `main` deploys the live site.
