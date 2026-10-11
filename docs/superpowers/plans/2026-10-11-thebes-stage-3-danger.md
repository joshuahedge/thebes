# Thebes Stage 3: Danger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Danger, scoring and ambient life (spec 10, stage 3): fire with risk, blazes, seeded ignition and spread, the firehouse, rubble and clearing, the fire-risk overlay and the sheets' fire row; raids with a three-month warning and countdown chip, sizing, targets, tribute and the raid report; walls, gates, towers, barracks, soldiers and automatic combat; festivals; Peaceful; the danger mood terms and defence costs in the 60-70% balance band; three alert tiers with one ranked banner, the speed reactions and the On a fire setting, the raid horn and the coin tick; flames, units and walls drawn readably with reduced-motion versions; the score and its parts, previews, splits, medals, Seal this reign, records, the weekly seed, the share link and card, and screenshot mode; the early-game additions (Founded Thebes, the next-threshold bar, feats, stamps, citizen remarks, and the danger goals, firsts, achievements, daily goals and tips); ambient life; world version 4.

**Architecture:** One contract track lands first: Track 0, three tasks on `stage-3-danger`, gives world version 4 and its migration, all of Stage 3's data, the costs, every new module with its final names and signatures (stubs that return safe defaults, and complete versions of the pure rules more than one track reads), and every seam two tracks share, wired once. Five tracks then run at the same time in their own worktrees, each owning its own files: A the fire sim, B the raids and defence sim, C art and render, D the danger interface and sound, E scoring and gamification. The controller merges them onto `stage-3-danger` in the order A, B, C, D, E, running the full suite after each, and then does Track F (balance and integration) itself.

**Tech Stack:** HTML + CSS + JavaScript ES modules, Canvas 2D, the in-house test harness in headless Edge (`tests/run-tests.ps1`), `tests/serve.py`, PowerShell tools.

**Spec:** `docs/superpowers/specs/2026-10-09-thebes-design.md`, sections 2, 3, 4.1, 4.3, 4.5, 4.7, 4.9, 4.11-4.14, 4.17-4.19, 5.4-5.6, 6.3, 6.4, 6.8, 7.2, 7.3, 9 and 10 (revised 11 Oct 2026 for Stage 3), and rulings 69-133 in `docs/superpowers/notes/handoff-2026-10-11/rulings-so-far.md`. Background: `docs/superpowers/notes/2026-10-11-stage-3-review.md`, `docs/superpowers/notes/reference/stage-3/` (`code-map.md`, `design.md`, `scoring.md`, `ux.md`).

**Out of scope** (Stage 4 and later, spec 3, 4.16, 4.19 and 10): the quarry, brickworks, builders' guild and crews; obelisks, the colossus, mastabas and pyramids; prestige and its effects; the Monuments score part (score v2); scribes; missions (stage 5); river flooding, disease, crime and more foods; direct control of soldiers; global leaderboards and checked scores; music; a tax-rate setting; progress while the game is closed.

## Global Constraints

- No build step, no npm, no frameworks, no third-party code. Plain ES modules, plain CSS in `css/ui.css`. Targets: iOS Safari 16+, current Android Chrome, desktop Chrome, Edge, Firefox, Safari.
- The sim stays deterministic: no wall clock, no `Math.random`, no storage or DOM in `src/sim`. All randomness is a stateless `hash2` draw keyed by building id and day, or by the raid index, with the world's seed and a salt from the data (`FIRE_SALT`, `RAID_SALT`); there is no RNG state in the world. Every fire, raider, soldier and wall state lives in the world, so saving and loading mid-fire or mid-raid changes nothing. Path and coverage caches live outside the world (a `WeakMap`, as `reach.js` does).
- The UI changes the world only through sim functions: the Stage 1-2 commands, `settle`, `setGuide`, `startDaily`, `swapDaily`, `setAccept`, `openRoute`, `setTradeOrder`, and this stage's `payTribute`, `drawWall`, `clearRubble`, `holdFestival`, `sealReign`, `setCityId` and `setSpeed`.
- `WORLD_VERSION` goes from 3 to 4 in Task 0.1 with a migration; nothing else changes the save's top-level shape. A track that needs another world field asks the controller for a contract change and never adds one alone. Inside the contract's records (a raid's `active` record, a soldier, `feats.counters`, a fire record) the owning track may add fields, documented in its module's header.
- No upgrade lowers capacity or tax per tile; no arbitrage (the Stage 2 data tests stand).
- Spec 6.1 binds every new control and row: real buttons with labels, 44 px targets, 4.5:1 text, nothing over the middle of the map, one panel at a time, Back closes one step, meaning never by colour alone. Spec 5.4 binds motion: reduced motion respected, under 3 flashes a second, flames change shape at 2 Hz or less and never flash, nothing pulses longer than 5 s, ambient motion changes direction or brightness at most once a second.
- **Words in the interface must match what the sim does** (the commonest Stage 2 bug). Every line that states a rule (a disabled button's reason, a price, a countdown, "a firehouse reaches it", "Your towers can beat this raid") is computed from the sim's own function, and a test sets the world up both ways and checks the words follow the function.
- Copy: plain English, sentence case; every player-facing string lives in `src/ui/text.js`, inside the track's own section; "Pharaoh" never appears, and nothing names or hints at an employer anywhere (code, comments, commits, notes).
- Commit identity for this repo only: `Joshua Hedge <181878008+joshuahedge@users.noreply.github.com>` (check `git config --local user.email`; worktrees share it). Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- LF line endings, UTF-8 without BOM.
- **Never push.** A push to `main` deploys the live site; the controller merges locally and Josh publishes.
- **Branches and worktrees.** Track 0 runs on `stage-3-danger` in `C:\dev\thebes`. Each of Tracks A-E works in its own worktree `C:\dev\thebes-s3-<track>` on the branch `s3-<track>`, cut from the Track 0 commit (`<track>` is `fire`, `raids`, `art`, `ui` or `score`):
  `git -C C:\dev\thebes worktree add C:\dev\thebes-s3-fire -b s3-fire <track-0-commit>`. Run every command from the worktree's root; `tests/run-tests.ps1` and `tests/screenshot.ps1` serve the folder they sit in. Track F runs on `stage-3-danger` in `C:\dev\thebes` after the merges.
- **Tests.** Every Stage 3 `describe` name starts with its track's prefix: `s3 contract`, `s3 fire`, `s3 raids`, `s3 art`, `s3 ui`, `s3 score` or `s3 balance`. New test files go in `tests/stage3/<track>/` and are imported only from `tests/stage3/<track>.all.js`; nobody edits `tests/all.js` after Track 0. While iterating, run the track alone: `-Grep "s3 <track>" -WaitSeconds 120`. Before each commit: `tools/sw-files.ps1`, then the full suite with `-WaitSeconds 120`, ending `ALL PASSED`.
- **Headless Edge reports `prefers-reduced-motion: reduce`.** A test of normal motion must force it off (`createSettings({ ..., systemReducedMotion: () => false })`, or a settings object whose `reducedMotion()` returns false); a test of the reduced-motion version can force it on. Never let a test depend on the machine's setting.
- `sw-files.js` is regenerated, never hand-edited. On a merge conflict in it, take either side, run `tools/sw-files.ps1`, run the full suite, commit.
- Timing assertions flake under load (`longrun` < 3000 ms, `capital` < 5000 ms, the stress frame, the desirability preview). Stagger full runs across worktrees (14 logical CPUs; one full run at a time is safest); rerun a timing failure once before investigating it.
- Shared files follow the ownership table in the contract: a track edits only the files and sections it owns, and the seams Track 0 made are the only way into the others.
- **Catching up before the last task.** Tracks merge in the order A, B, C, D, E. Before its last task, a track merges `stage-3-danger` (which then holds the tracks merged before it) into its branch and runs the full suite, so its merge is clean and its cross-track checks meet the real thing: B's strike starting a real blaze needs A; D's and E's checks against real fires and raids need A and B. Until then a track's tests set the other tracks' state by hand to the contract's shapes and never assert a STUB's default.

## File Structure

```
src/data/fire.js            NEW (0.1)  FIRE, FIRE_SALT, FIRE_RISK, HOUSE_RISK, FIRE_BANDS, FIRE_BAND_IDS        tuned by A
src/data/raids.js           NEW (0.1)  RAIDS, RAID_SALT, UNITS, DEFENCE, FESTIVAL                              tuned by B
src/data/scoring.js         NEW (0.1)  SCORE_*, MEDALS, SPLIT_MILESTONES, RECORDS_*, SHARE                     tuned by E
src/data/feats.js           NEW (0.1)  FEATS = []                                                             filled by E
src/data/ambient.js         NEW (0.1)  AMBIENT (ruling 133)                                                   tuned by C
src/data/buildings.js, difficulty.js, progression.js, desirability.js, mood.js, ui.js     MODIFY (0.1)  contract only
src/sim/world.js            MODIFY (0.1)  WORLD_VERSION 4, newRaidState, newDangerState, newTally, STAGE3_TALLY   contract only
src/sim/costs.js            MODIFY (0.1)  rubbleCostOf, festivalCostOf, riskOf, raidsOn, soldiersPayOf          contract only
src/save/migrate.js, serialize.js   MODIFY (0.1, 0.3)  v3 -> v4, REQUIRED, TALLY_KEYS, records in the envelope   contract only
src/render/art/defence.js   NEW (0.1)  placeholder slots                                                      C
src/sim/fire.js             NEW (0.2)  fire (coverage and daily risk complete)                                 A
src/sim/raids.js            NEW (0.2)  raids (size, wealth, tribute and payTribute complete)                   B
src/sim/combat.js, pathfinding.js, defence.js   NEW (0.2)  combat and soldiers, the flow field, walls         B
src/sim/festival.js         NEW (0.2)  festivals (complete)                                                    B
src/sim/score.js, feats.js  NEW (0.2)  the score (medals, splits, sealReign complete), feats                   E
src/sim/clock.js, alerts.js, mood.js, economy.js, progression.js, settle.js, commands.js, undo.js   MODIFY (0.2)  contract only
src/render/fire.js, units.js, ambient.js   NEW (0.3)  flames, units, ambient life and the frame gate          C
src/render/renderer.js, loop.js   MODIFY (0.3)  the hooks, allowFrame                                          contract only (C may add to loop.js)
src/ui/danger.js            NEW (0.3)  the danger interface                                                    D
src/ui/scoreUi.js, share.js NEW (0.3)  the score interface, sharing                                            E
src/save/records.js         NEW (0.3)  records on the device                                                   E
src/dev/scenes.js           NEW (0.3)  devScene                                                                F
src/ui/createUI.js, boot.js MODIFY (0.3)  the seams                                                            contract only
src/ui/sheets.js, placement.js, confirmBar.js, alerts.js, menu.js, store.js, modes.js, backstack.js, settings.js, titleCard.js, hud.js   MODIFY (0.3)  see ownership
src/ui/text.js, css/ui.css  MODIFY (0.1, 0.3)  one section per track                                           each track its section
tests/stage3/<track>.all.js, tests/stage3/<track>/*.test.js   NEW                                            each track its own
```

## Conventions every task relies on

- Tests use `describe`/`it`/`expect` from `tests/harness.js` (`toBe`, `toEqual`, `toBeTruthy`, `toBeFalsy`, `toBeGreaterThan`, `toBeGreaterThanOrEqual`, `toBeLessThan`, `toBeLessThanOrEqual`, `toContain`, `toThrow`; there is no `.not` and no `toBeCloseTo`). Always clean up in `try/finally`.
- Sim fixtures: `makeTestWorld({ size, fertile, gold, raiderEntries })`, `setRoad`, `addRaw`, `staffAll` (`tests/helpers/testWorld.js`). UI fixtures: `rigUI({ width, height, hooks, welcome, sfx, clock, now, world, settings })`, `mountShell`, `fakeHistory`, `fakeDoc` (`tests/helpers/uiWorld.js`); `mount`, `fire` (`tests/helpers/dom.js`); `makeCanvas` (`tests/helpers/canvas.js`).
- A test can reach the danger and score interfaces of a rigged game as `r.ui.danger` and `r.ui.scoreUi`; replacing one of their functions in a test (as the contract's tests do) is how another track's behaviour is stood in for.
- Sim events are plain objects pushed into the optional `events` array; the sim never reads it.
- **STUBs.** A function whose comment starts `STUB.` returns a safe default until its track replaces the body in place, keeping its signature and the contract its comment states (add detail to the comment, never contradict it). Another track's tests never depend on a STUB's default beyond "does nothing"; they set the world's state by hand to the contract's shapes instead (a `raid.warning` record, a `b.fire` record, a soldier).
- **Data and its words land together** (`houseSheetEconomy.test.js` and the celebrate, tips and goals tests check that firsts, achievements, daily goals, tips and chapters have words).
- **Words.** A track keeps its words in its own section of `src/ui/text.js` as its own exported object (`FIRE_TEXT`, `RAID_TEXT`, `ART_TEXT`, `DANGER_UI_TEXT`, `SCORE_TEXT`, `BALANCE_TEXT`) and adds to the shared tables (`ALERT_TEXT`, `MOOD_NAMES`, `REASONS`, `T`, `FIRST_TEXT`, `ACHIEVEMENT_NAMES`, `ACHIEVEMENT_TEXT`, `DAILY_TEXT`, `TIP_TEXT`, `CHAPTER_NAMES`, `OVERLAY_NAMES`, `OVERLAY_LEGEND`, `EFFECTS`, `DIFFICULTY_NAMES`) only with `Object.assign(...)` inside its own section, which runs after every table is defined. Insert new lines just above the section's end marker.
- **Styles.** Each track's rules go in its own section at the end of `css/ui.css`, just above the end marker.

## The contract (binding)

Every track implements its part exactly; the others rely on these names and shapes. Track 0's code (`10-track0.md`) is the reference: each new module's header comment repeats its part of this contract.

### Ownership of files

| File or area | Owner after Track 0 | Others |
|---|---|---|
| `src/sim/fire.js`, `src/data/fire.js` (numbers), `src/sim/labour.js` (`isWorking`: a building in the fire stage stops working) | A | read only |
| `src/sim/raids.js`, `combat.js`, `pathfinding.js`, `defence.js`, `festival.js`, `src/data/raids.js` (numbers) | B | read only |
| `src/render/fire.js`, `units.js`, `ambient.js`, `src/render/art/*`, `src/render/terrainBaker.js` (+ a new `terrainWalls.js`), `src/render/walkers.js`, `src/render/loop.js` (the idle cap only), `src/ui/thumbs.js`, `src/data/ambient.js` | C | read only |
| `src/ui/danger.js`, `src/ui/alerts.js`, `src/ui/minimap.js`, `src/ui/overlayUi.js`, `src/render/overlays.js`, `src/render/effects.js` (the water ripple), `src/ui/placement.js`, `src/ui/confirmBar.js`, `src/ui/sheets.js` (beyond the parts seam; the store re-entrancy fix), `src/ui/menu.js` (Settings rows), `src/ui/settings.js`, `src/ui/titleCard.js` (only if Peaceful's row needs it), `src/audio/sfx.js`, `src/data/ui.js` (`AUTO_OVERLAY.firehouse`, legend steps) | D | E only through `scoreLineFor`, `titleDecor` and the sheet parts |
| `src/sim/score.js`, `src/sim/feats.js`, `src/sim/goals.js`, `firsts.js`, `achievements.js`, `daily.js`, `src/save/records.js`, `src/ui/scoreUi.js`, `src/ui/share.js`, `src/ui/hud.js` (the score chip), `src/ui/goalsList.js` (Founded Thebes, the next-threshold bar), `src/ui/welcomeBack.js`, `src/ui/celebrate.js` (citizen remarks), `src/data/scoring.js`, `feats.js`, `goals.js`, `firsts.js`, `achievements.js`, `daily.js`, `tips.js` | E | read only |
| `src/sim/clock.js`, `alerts.js`, `mood.js`, `economy.js`, `progression.js`, `settle.js`, `commands.js`, `undo.js`, `world.js`, `costs.js`, `src/save/migrate.js`, `serialize.js`, `src/render/renderer.js`, `src/ui/createUI.js`, `src/boot.js`, `src/ui/store.js`, `modes.js`, `backstack.js`, `src/data/buildings.js`, `difficulty.js`, `progression.js`, `desirability.js`, `mood.js`, `tests/all.js`, `tests/helpers/*` | contract (Track 0; the controller for F) | a track that finds it must change one stops and asks the controller |
| `src/ui/text.js`, `css/ui.css` | each track its own section | — |
| `src/dev/scenes.js`, `src/dev/sampleCity.js`, `tests/sim/longrun.test.js`, `capital.test.js`, `README.md`, `difficultyHint` (in `text.js`, edited in place) | F | — |

A track tunes numbers only in its own data file (A `fire.js`, B `raids.js`, C `ambient.js`, E `scoring.js` and the goal and reward files); a change to a contract data file (`buildings.js`, `difficulty.js`, `progression.js`, `desirability.js`, `mood.js`) goes through the controller.

### World version 4

`createWorld({ seed, size, map, difficulty, cityId = null })` adds these fields (all in `REQUIRED`, all checked by `validateWorld`):

| Field | Default | Shape and meaning | Writer |
|---|---|---|---|
| `wall` | `size²` zeros | per tile: 0 none, > 0 a standing wall's hit points, -1 a breach (broken stone). A gate is a wall tile on a road; a tower on a wall tile is a building on a tile whose `wall` holds `DEFENCE.towerOnWallHp` | B (`drawWall`, combat); Demolish and undo (contract) |
| `wallVersion` | 0 | bumped whenever a wall tile appears, goes or breaks (not on each hit) | B, Demolish, undo |
| `raid` | `newRaidState()` | `{ clockDay, nextWarnDay, index, warning, active, adaptation, last }`, below | B (`payTribute`: contract) |
| `soldiers` | `[]` | every trained soldier `{ id, barracks, x, y, hp, hit, task }`, ascending id | B |
| `nextUnitId` | 1 | raiders and soldiers share one id sequence | B |
| `danger` | `newDangerState()` | `{ burnDays: [day…] (buildings burned, last 360 days, oldest first), lastFireDay (last day a building reached the fire stage, or null), festivalDay (or null), firePaused (the city's one first-time pause for a fire no staffed firehouse reaches) }` | A (`burnDays`, `lastFireDay`, `firePaused`), B (`festivalDay`) |
| `splits` | `{}` | milestone id -> the day the city first became it (`updateMilestone`, contract) | contract |
| `seals` | `[]` | `{ day, score, parts, medal, version }` per Seal this reign (`sealReign`) | E |
| `feats` | `{ earned: [], lost: [], counters: {} }` | feat ids earned, ids ruled out, and `checkFeats`' running whole numbers | E |
| `cityId` | `null` | the records id the interface gives a city (`newCityId`): at `createWorld` for a new city, by `setCityId` at load for an older one | boot |

Every building gains `risk: 0` (points, only buildings that can burn gain any) and `fire: null` (`makeBuilding`, `v3ToV4`). Fire state lives on the building, not in a world map: it is created, snapshotted for undo, merged, split and removed with the building, ids are never reused, and the renderer, alerts and sheets already walk the buildings. The shapes:

- `fire: { stage: 'blaze', days, need, fought }`: days the blaze has lasted, the covered-and-staffed days it needs (1 or 2, drawn at ignition), and how many it has had.
- `fire: { stage: 'fire', days, left }`: days it has burned, and days left before the building burns down (drawn when it grows: 10-15).

The raid state:

- `clockDay`: the day the city first had `RAIDS.clockPeople` people (`max(tally.peakPeople, population)`), or null; never set on Peaceful (`raidsOn`). `nextWarnDay`: `clockDay + RAIDS.firstWarnAfter` for the first warning, `laterWarnDay(world, arrives)` after each raid or tribute. `index`: raids warned so far, so the next warning's index (the first raid is index 0).
- `warning`: null, or `{ index, entry: { x, y }, dir, size, tribute, target, day, arrives, first }` — `dir` from `entryDir`; `size` fixed now (`raidSize`); `tribute` = `tributeFor(world, size)`, or null when `first`; `target` the `raidTargetKind` now; `arrives` = `day + RAIDS.warningDays`; `first` = `index === 0`.
- `active`: null, or `{ index, entry, dir, size, target, day, raiders: [{ id, x, y, hp, hit }], phase: 'attack' | 'strike' | 'leave' | 'retreat', targetId, struck: [ids], wait, byTowers, bySoldiers, burned, stolen, shots: [{ from: { x, y }, to: { x, y } }] }` (`shots`: the day's tower shots, for the arrows). On arrival the warning becomes `active` (`warning` back to null).
- `adaptation`: 1; a lost raid sets `RAIDS.adaptLost`, every other raid (beaten or paid off) adds `RAIDS.adaptStep` up to 1.
- `last`: null, or the last raid's report `{ index, dir, size, won, byTowers, bySoldiers, towers, burned, stolen, day }` (`day`: the day it ended). A paid-off raid leaves no report.

Tallies (`STAGE3_TALLY`, all in `TALLY_KEYS`, all start at 0): `fires` (blazes started, by any cause), `blazesOut`, `firesOut`, `burned`, `rubbleCleared` (Demolish and `clearRubble`; undo takes it back), `raids` (raids that arrived), `raidsBeaten`, `raidsLost`, `tributes`, `raidersByTowers`, `raidersBySoldiers`, `soldiersWounded`, `goldStolen`, `festivals`, `wallTiles` (wall tiles drawn; undo takes it back).

History: each month-end row is `{ day, people, gold, mood, score, parts }` (`scoreRow`); rows from a version 3 save have no `score` or `parts`.

`MIGRATIONS[3]` (v3 -> v4): every building gets `risk: 0, fire: null`; the defaults above; the Stage 3 tallies at 0; `splits` empty (earlier milestone days are unknown); `cityId` null (boot sets one at load); the raid clock starts on the day the save is loaded when the city's peak or people reach `RAIDS.clockPeople` (ruling 94), so its first warning comes two game-years later; the Stage 3 build items it has unlocked (the firehouse; the wall, tower and barracks from Market town) join `newItems` once each.

`world.calm` is a **test-only** switch, not part of the save: while true, `tickDay` skips `fireDay` and `raidDay`. Track 0 sets it in `tests/sim/longrun.test.js`, `tests/sim/capital.test.js`, `buildSampleCity` and `buildStressCity` (so the title backdrop and the Stage 2 screenshots stay as they are); Track F gives those cities firehouses and defences and removes it. No other code may set it.

### Data

- `BUILDINGS` adds `firehouse` (1x1, 50, upkeep 4, 4 workers, `safety`, Services, road, `reach: 8`, no `provides`), `tower` (1x1, 150, 8, 4, `safety`, Defence, road), `barracks` (2x2, 200, 12, 6, `safety`, Defence, road), `wall` (cost 8 a tile, Defence card, `tile: true`), `gate` (cost 20 a tile, `tile: true`, `buildable: false`: a wall drawn on a road, no card) and `rubble` (1x1, cost 0, no road, `buildable: false`). `BUILDABLE` lists every type but `gate` and `rubble`. `checkTiles` refuses `buildable: false` and (after the lock check) `tile: true` types with `'unknown'`: walls are drawn.
- `MILESTONES`: the firehouse with the Village; `wall`, `tower`, `barracks` with Market town. `CATEGORIES`: Services gains `firehouse` (last); Defence is `['wall', 'tower', 'barracks']`. `toolForItem('wall')` is `{ kind: 'wall' }`.
- `DESIRABILITY`: firehouse `[-1]`, tower `[-2, -1]`, barracks `[-4, -2]`, rubble `[-3, -1]` (each 1x1 rubble tile on its own), wall and gate `[]`.
- `DIFFICULTIES`: `peaceful { cost: 0.8, risk: 0.5, raids: false }`, `relaxed { 0.8, 0.5, raids: true }`, `normal { 1, 1, true }`, `hard { 1.25, 1.5, true }`; `DIFFICULTY_ORDER = ['peaceful', 'relaxed', 'normal', 'hard']`. Settings accept Peaceful for new cities; a Stage 2 city keeps its level.
- `DANGER_MOOD` (`src/data/mood.js`): `fireLastMonth -4`, `burnedEach -2`, `burnedMax -10`, `burnedDays 180`, `raidBeaten -3`, `raidLost -8`, `raidDays 180`; the festival's `+6` for 90 days is `FESTIVAL.mood` and `.days`.
- `src/data/fire.js`, `raids.js`, `scoring.js`, `ambient.js`: every number of spec 4.3, 4.11-4.13, 4.18, 4.19 and 5.6 (rulings 69-133), as `10-track0.md` gives them. `FEATS` is empty until Track E.
- The rows Track E adds with their words: the Danger chapter and its chain goals ("Build a firehouse" after the Town goal; "Build a tower and a barracks" after the trade route, skipped on Peaceful), the event goals for the first fire (alert codes `fire` and `blaze`) and the first raid warning (`raid_warning`; its words name the warning's direction), five firsts, four achievements, three daily goals, six tips and ten feats (spec 4.19 tables). Peaceful skips the defence goals, daily goals, feats and achievements (`raidsOn`).

### Costs (`src/sim/costs.js`)

`costOf(world, 'wall' | 'gate' | 'tower' | 'barracks' | 'firehouse')` as every building; `rubbleCostOf(world)` per tile (5 x cost); `festivalCostOf(world)` (200 x cost); `riskOf(world)`; `raidsOn(world)`; `soldiersPayOf(world)` = soldiers x 8, never scaled. Tribute is `tributeFor(world, size)` in `raids.js` (0.8 x towers needed x `costOf(world, 'tower')`).

### Sim modules

Complete in Track 0 (owners may refine, never change the behaviour): `baseRiskOf(b)`, `canBurn(b)`, `fireStarted(world)`, `fireRiskOf(world, b)`, `fireBand(risk)` (0 Low, 1 Rising, 2 High, 3 Can catch fire), `burning(world)`, `fireCoverage(world)` (Map id -> 0..1, cached), `coverageOf(world, b)`, `staffedCover(world, b)` (coverage >= 0.5), `dailyRiskOf(world, b)`, `rubbleClearCost(world, tiles)`; `entryDir(world, entry)`, `towersNeeded(size)`, `workingTowers(world)`, `raidTargetKind(world)`, `raidWealth(world)`, `raidSize(world)`, `tributeFor(world, size)`, `laterWarnDay(world, fromDay)`, `tributeQuote(world)` (`{ cost, size, towersNeeded, towersHave, buildN, buildCost, hidden, payable, reason }` or null), `payTribute(world)`; `tileCost(world, x, y)`; `isGate(world, i)`, `wallHpFor(world, i)`; `festivalStatus(world)` (`{ can, reason, cost, nextIn, activeFor }`), `holdFestival(world)`, `festivalMood(world)`; `scoreFactor`, `medalFor(raw)`, `nextMedal(world, raw)` (`{ medal, points }` in city-score points, or null), `splitMonths(world)`, `scoreRow(world)`, `sealReign(world)`.

STUBs, with their owners:

| Function | Owner | Contract |
|---|---|---|
| `fireDay(world, events)` | A | the day's fire step, run by `tickDay` after production and before the day turns (draws key on the day being simulated): risk builds from Town (`dailyRiskOf`), ignition at the threshold (3%, `hash2(id, day, seed + FIRE_SALT.ignite)`, risk back to 0), blazes fought or grown, fires spread (6% to each burnable edge neighbour, starting a blaze), go out (25% x coverage, a firehouse built or staffed during the fire counting from the next day) or burn down; events, tallies, `danger` days; the city's first fire no staffed firehouse reaches sets the speed to 0 through `setSpeed` and `danger.firePaused` |
| `igniteBuilding(world, id, events, cause)` | A | starts a blaze (`cause`: `'ignite'`, `'spread'`, `'raid'`); false when there is no such building, it never burns or it is burning; B calls it for a strike |
| `burnBuilding(world, id, events)` | A | a home becomes empty plots on its tiles (four for a 2x2), its residents leave the city; anything else one rubble per footprint tile, its stock lost; removes the building and inserts new ones under new ids; returns the new ids |
| `fireAlerts(world)` | A | `{ code: 'fire', id }` (critical: a blaze or fire no staffed firehouse reaches), `{ code: 'blaze', id }` (warning: a covered blaze), `{ code: 'fire_risk', id }` (warning: High or Can-catch-fire band and no staffed firehouse covers it), ascending id; cheap (cached coverage) |
| `fireMood(world)` | A | `{ fire }` while a building reached the fire stage in the last 30 days, `{ burned }` for the last 180 days' burned buildings (−2 each, at most −10); a key only while its term is not 0 |
| `raidDay(world, events)` | B | after `fireDay`: starts the clock (never on Peaceful), raises the warning on `nextWarnDay` (entry by `hash2(seed, index, RAID_SALT.entry)`; first warning pauses through `setSpeed(0)`, later ones drop 2x or 3x to 1x), brings the raiders in on `arrives` (drop to 1x), then each day moves the band (`flowField`), trains soldiers and runs `combatDay`, strikes (`igniteBuilding(…, 'raid')` and theft), retreats at half and ends the raid with its report, adaptation and `nextWarnDay` |
| `raidMonth(world, events)` | B | run by `runMonth` before mood; nothing is required of it yet |
| `raidAlerts(world)` | B | `{ code: 'raid_warning', x, y, dir, arrives }` and `{ code: 'raid', x, y, left }`, both critical, pinned at a map point (the entry, or the band's centre) |
| `raidMood(world)` | B | `{ raid: -3 or -8 }` for 180 days after a raid ends, by `last.won`; `{}` otherwise |
| `trainSoldiers(world, events)`, `combatDay(world, events)` | B | spec 4.13 rules; a barracks keeps its training in `b.progress`; `active.shots` each day |
| `flowField(world, goals)` | B | `{ dist: Float64Array(size²), next(x, y) }` toward goal tiles, cached outside the world on the wall, road and building versions |
| `previewWall(world, x0, y0, x1, y1, flip)`, `drawWall(…)` | B | `{ ok, reason, warnings, tiles, gates, cost }` along the road tool's L; reasons `locked`, `out_of_bounds`, `water`, `blocked`, `nothing_to_place`, `no_gold`; `drawWall` charges, bumps `wallVersion`, counts `tally.wallTiles`, takes `'wall'` out of `newItems` and pushes `{ kind: 'wall', tiles, before, cost }` |
| `scoreOf(world)` | E | `{ version, total, raw, factor, parts: { people, prosperity, culture, safety }, reasons: { part: null or { code, … } }, medal, next }`, spec 4.19 formulas; Safety's defence term reads `raidSize`, `workingTowers` and `world.soldiers`, its fire term `fireCoverage` |
| `scorePreview(world, type, x, y)` | E | the parts a building would change, counted as staffed |
| `checkFeats(world, events)` | E | called by `runMonth` (after achievements) and `settle`; pushes `{ type: 'feat', id }` |

### Commands (spec 7.3)

| Command | Module | Returns |
|---|---|---|
| `payTribute(world)` | raids.js (complete) | `{ ok, cost }` or `no_warning`, `first_raid`, `below_zero` |
| `drawWall(world, x0, y0, x1, y1, flip)` | defence.js (B) | as `previewWall` |
| `clearRubble(world, x0, y0, x1 = x0, y1 = y0)` | commands.js (complete; re-exported by fire.js) | `{ ok, count, cost }` or `no_rubble`, `no_gold` |
| `holdFestival(world)` | festival.js (complete) | `{ ok, cost }` or `locked`, `no_temple`, `too_soon`, `no_gold` |
| `sealReign(world)` | score.js (complete) | `{ ok: true, seal }`; never refused |
| `setCityId(world, id)` | commands.js (complete) | refused with `bad_id` or `has_id` |

Demolish (contract): rubble's refund is minus `rubbleCostOf` (refused with `no_gold` below the debt floor); `previewDemolishArea` returns `{ buildingIds, roadTiles, wallTiles, rubble, clearCost, refund, ok, reason }`; a wall tile is taken up (a gate keeps its road) for no refund. Buildings and roads never go on wall tiles, except a tower on a standing wall tile; a road never crosses a wall (a gate is drawn as wall over a road). Undo entries: `place { ids, cost }` refunds only what still stands; `road { tiles, cost }`; `demolish { buildings, roads, walls: [[i, value]], refund }` is refused (`occupied`) and dropped when a building or road would go back onto used tiles; `wall { tiles, before, cost }`.

### Events

| Event | Pushed by | Meaning |
|---|---|---|
| `{ type: 'fire', id, covered, first }` | A | a blaze started; `covered`: a staffed firehouse reaches it; `first`: the sim paused for the city's first uncovered fire |
| `{ type: 'fire_grow', id, covered }` | A | a blaze grew into a fire |
| `{ type: 'fire_out', id, stage }` | A | put out (`'blaze'` or `'fire'`) |
| `{ type: 'burned', id, kind, to }` | A | burned down: `kind` its type, `to` the new ids in footprint order |
| `{ type: 'raid_warning', index, entry, dir, size, tribute, target, arrives, first }` | B | a warning appeared (the sim has paused for the first, dropped to 1x for later ones) |
| `{ type: 'raid_start', index, dir, size }` | B | raiders arrived (the sim has dropped to 1x) |
| `{ type: 'raid_strike', id, stolen }` | B | a target struck |
| `{ type: 'raid_end', won, report }` | B | the raid is over; `report` as `raid.last` |
| `{ type: 'feat', id }` | E | a feat earned |

The speed reactions (spec 4.3): the sim makes the first-time pauses (first uncovered fire, first warning) and the drops to 1x (later warnings, every arrival) through `setSpeed`; the interface (D) makes the later uncovered fires' reaction from the On a fire setting (`'pause'`, `'goto'`: 1x and the camera there, `'inform'`: 1x and the banner). `createUI` repaints the speed buttons after every batch of events.

### Alerts and words

`alertsFor` appends `fireAlerts` and `raidAlerts` to the Stage 2 list. Tier (D, `src/ui/alerts.js`): critical `fire`, `raid_warning`, `raid`, `debt`, `save_failed`, ranked active raid, raid warning, fire, debt, save failing; warning `blaze`, `fire_risk` and the Stage 2 codes. Alert words go through `ALERT_TEXT` (`code -> (alert, world, b, name) => { title, fix }`), which `alertText` reads first: A words `fire`, `blaze`, `fire_risk`; B words `raid_warning`, `raid`. D words everything around them (the banner's collapsed rows, "+N more", the countdown chip, Pay tribute, captions), E the goals and rewards. Mood rows (`MOOD_NAMES`): A `fire`, `burned`; B `raid`, `festival`. `REASONS`: each track words the reason codes its commands return.

### Render

`renderFrame` takes three optional hooks, each called once a frame in art px: `opts.ambient(g, range)` after the terrain chunks, `opts.fire(g, range)` and `opts.units(g, range)` after the depth-sorted sprites (before effects and overlays). `createUI` passes `ambient.draw`, `drawFires(g, world, range, now, { reducedMotion })` and `drawUnitMarks(g, world, range, timeDays, now, { reducedMotion })`, and appends `unitsAt(world, timeDays, range)` (`{ id: UNIT_ID_BASE + unit id, kind: 'raider' | 'soldier', x, y, dir }`) to the walkers, drawn as `fig.raider` and `fig.soldier` (C adds the kinds). `createAmbient({ enabled })` (`enabled`: the Ambient motion setting and not reduced motion) and `createFrameGate({ idleAfterMs, fpsCap })` (`noteInput(now)`, `allow(now, paused)`; the loop's `allowFrame`) are C's. The art slots `firehouse`, `tower`, `barracks`, `wall`, `gate`, `rubble` exist as placeholders (`src/render/art/defence.js`); C replaces them, keeping the names.

### Interface

- `createUI` makes `danger = createDanger(ctx)` and `scoreUi = createScoreUi(ctx)` once, with `ctx = { world, store, settings, sfx, toasts, celebrations, effects, cameraControl, speedControl, alerts, root, doc, now, clock, hooks, afterCommand, refresh, onView, showMeAt, selectBuilding, screenshotMode, fireTip }` (`hooks.records` is the device's records). Neither may call `refresh` or `afterCommand` while it is being created. Each returns `{ sheets, sheetParts: { building(b), house(h), actions(b), summary() }, onEvents(events), refresh(), onAlertAction(alert, action), onCommand(e), destroy() }`:
  - `sheets`: custom sheet kinds (heading `T[kind]`, so each kind needs a `T` entry in the track's section);
  - `sheetParts`: arrays of nodes at fixed places: after a building sheet's reach row; after a home's checklist and warnings; at the front of a building sheet's actions (the temple's Hold a festival); in the summary after the goals (E's score section, then D's last raid report);
  - `onEvents`: every batch of sim events (the loop's and settle's); `refresh`: after every command and game day; `onAlertAction`: an alert's second button (`alerts.action(alert, 'tribute')`); `onCommand`: every command, before settling.
- `scoreLineFor(world, type, x, y)` (E) is the confirm bar's score line: `toolPreview` puts it in `p.score` for a placeable building ghost and the bar shows `"<effect> · <score>"`. E memoises it.
- `titleDecor({ records, shared, startSeed, clock })` (E) returns the title card's `decorate(element, { buttonBox, newCity })`; `startSeed(seed)` starts a city on that seed, asking first when a city is saved.
- The wall card starts a line tool (`LINE_TOOLS = ['road', 'wall']`) that previews with `previewWall` and confirms with `drawWall`; D words it. A demolish whose clearing would cross the debt floor is refused in the bar (`reason: 'no_gold'`); D words the rubble bar.
- Screenshot mode: `ctx.screenshotMode()` (and the ☰ menu's Screenshot mode) sets the store's `screenshot` flag: the whole interface hides (`body.screenshot`), one history step, and a tap, a click, Esc or Back leaves it; the speed is untouched.
- Settings: `ambient` (boolean, default true) and `fireReaction` (`'pause' | 'goto' | 'inform'`, default `'inform'`, `FIRE_REACTIONS`); D adds their rows to the Settings sheet.
- Sounds: `SFX.horn` (three low notes) and `SFX.coin` (one note ≤ 0.1 s, gain ≤ 0.15); D plays them.
- The summary shows soldiers' pay on its own row once paid (`stats.lastMonth.soldiers`, `summaryData(...).soldiers`).

### Records, the export and boot

`createRecords({ storage })` (E) is `{ load(), noteCity(world, now), addSeal(world, seal, now), merge(other), bests(n) }` over `{ version: 1, cities: [...], chronicle: [...] }` in `localStorage` `thebes.records`. Boot: every new city gets `newCityId(clock())`; a loaded city without one gets one (`setCityId`); `hooks.save` calls `records.noteCity` after every successful save; an export's envelope carries `records: records.load()` (`packSave(world, { …, records })`; `unpackSave` returns `records`, null when absent; autosaves carry none); an import merges them. `window.__thebes = { devScene }` exists before the title card; `startGame` keeps `devScene` beside `world`, `cam`, `renderer`, `loop`, `ui`; `devScene(api, name)` (F) resolves `'stub'` until Track F.

### Shared files

- `src/ui/text.js`: one section per track at the end of the file, in the order contract, fire, raids, art, ui, score, balance, each between `// ── s3 <name> (Track X) ──` and `// ── end s3 <name> ──`, with three stable separator lines between sections. `css/ui.css` likewise (`/* ── s3 <name> (Track X) ── */`).
- `tests/all.js` imports `tests/stage3/{contract,fire,raids,art,ui,score,balance}.all.js`; each track edits only its own aggregator.
- `sw-files.js`: regenerated by every track; on conflict, regenerate.

## How to run tests

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 120
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "s3 fire" -WaitSeconds 120
```

Expected at the end of every task: `ALL PASSED`. Run `tools/sw-files.ps1` after editing any cached file (`src/`, `css/`, `index.html`) and before a full run; `pwa.test.js` fails on a stale list. A full run takes 25-60 s; `-WaitSeconds 120` covers a loaded machine. If a run times out, check `Get-Process python*` for a CPU-heavy stray before rerunning.

## Tracks and tasks

Track 0 runs first, alone, on `stage-3-danger`. Then Tracks A-E run at the same time, each in its worktree; each keeps its own ledger in its worktree's `.superpowers/sdd/<plan>/progress.md`, and the controller keeps the master ledger in `C:\dev\thebes`. The controller merges `s3-fire`, `s3-raids`, `s3-art`, `s3-ui`, `s3-score` into `stage-3-danger` in that order (`git merge --no-ff s3-<track>`), regenerating `sw-files.js` and running the full suite after each merge; after A merges, B's raid strikes use real fire, and after B merges, D's tribute sheet and E's Safety part meet real raids. Track F then runs on `stage-3-danger`. Model hints: **sonnet** where the task's code is complete and the job is transcription; **opus** for art, judgement and every task whose words must follow the sim.

| Task | Scope | Files it owns | Model |
|---|---|---|---|
| **0.1** | World v4 and its migration; the Stage 3 data (buildings, fire, raids, defence, festivals, Peaceful, mood, score, feats, ambient); costs; categories; placeholder art; the pinned tests | data, `world.js`, `costs.js`, `migrate.js`, `serialize.js`, `art/defence.js`, `art/registry.js`, `tests/stage3/*.all.js` | sonnet |
| **0.2** | The sim modules (stubs, and the shared rules complete: coverage, daily risk, raid size, tribute, festivals, medals, seals); the clock, alerts, mood, pay, splits and settle wiring; rubble and wall rules in commands and undo; the loop's pause stop | `src/sim/*` new and wired | sonnet |
| **0.3** | The render hooks and stubs; the danger and score interfaces' seams; screenshot mode; the wall line tool; the score line seat; settings; the title card's decoration; records, city ids, the export and import, `devScene`; the horn and coin; text and style sections; `raiderEntries`; the calm switch | `src/render/*` hooks, `createUI.js`, `boot.js`, UI seams | sonnet |
| **A1** | Risk and ignition: `fireDay`'s daily risk from Town, the seeded ignition at the threshold, `igniteBuilding` (the blaze, its seeded put-out days, the `fire` event, the first-time pause), `isWorking` false in the fire stage | `src/sim/fire.js`, `src/sim/labour.js` | sonnet |
| **A2** | Stages and burning: blazes fought (covered and staffed days) or grown, fire length, spread to edge neighbours (never across a road), covered fires going out, `burnBuilding` (homes to empty plots through the merge/split rules, others to rubble with new ids, residents leaving, stock lost), danger days, tallies, events | `src/sim/fire.js` | sonnet |
| **A3** | Fire's alerts, mood terms and words: `fireAlerts`, `fireMood`, `ALERT_TEXT` for fire, blaze and fire_risk, `MOOD_NAMES`; spec 9's fire cases; determinism and save-mid-fire tests | `src/sim/fire.js`, A's text section | opus |
| **B1** | The clock and the warning: clock start (never on Peaceful), the first and later warnings, entry and direction, size and tribute fixed at the warning, target kind, the speed reactions, events, `raidAlerts`, B's alert and reason words | `src/sim/raids.js`, B's text section | sonnet |
| **B2** | Walls and paths: `previewWall` and `drawWall` (L lines, gates on roads, breaches redrawn, prices, undo, `wallVersion`, `newItems`), `flowField` | `src/sim/defence.js`, `src/sim/pathfinding.js` | sonnet |
| **B3** | The raid: arrival, the band on the flow field, breaching, strikes and theft, towers, barracks training, soldiers out and back, retreat, the end, the report, adaptation, `raidMood`; spec 9's raid and defence cases (one staffed tower beats the first raid; a closed ring holds until breached); determinism and save-mid-raid | `src/sim/raids.js`, `src/sim/combat.js` | opus |
| **C1** | Building art: the firehouse (red emblem), rubble (distinct from an empty plot), the tower, the barracks, wall and gate pieces, card thumbnails | `src/render/art/*`, `src/ui/thumbs.js` | opus |
| **C2** | Walls on the map and fire: the wall layer (a continuous mudbrick band, a gate arch on roads, broken stone at a breach; re-baked on `wallVersion`), `drawFires` (blaze, fire, smoke; shape change ≤ 2 Hz, no flashes; reduced motion: still icon and "Burning") | `terrainBaker.js`, `terrainWalls.js`, `src/render/fire.js`, C's text section | opus |
| **C3** | Units: raider and soldier figures (1.5x, told apart by shape), `unitsAt` moving smoothly between days, health bars after the first hit, arrows for 0.3 s (a still line under reduced motion), a firehouse walker | `art/figures.js`, `src/render/units.js`, `walkers.js` | opus |
| **C4** | Ambient life: every element of spec 5.6, out of step by tile hash, wind by seed, the real clock, the budget and drop order, swaying trees in the depth pass; `createFrameGate`'s idle cap | `src/render/ambient.js`, `loop.js` (cap only) | opus |
| **D1** | Alert tiers: the critical set and ranking, one banner with "+N more", rolled-up repeats whose View steps through them, the countdown chip, Pay tribute on the banner (`alerts.action`), minimap point pins with an arrow, the legend's icon under a banner on small phones, the store re-entrancy fix | `src/ui/alerts.js`, `minimap.js`, `overlayUi.js` (shrink), `sheets.js` (fix), D's css | opus |
| **D2** | Reactions, sound and settings: `danger.onEvents` (On a fire, captions for blazes put out and raid reports, the horn, the coin tick), the well's water ripple (`onCommand`, `effects.js`), the Ambient motion and On a fire rows, Peaceful's row in Settings | `src/ui/danger.js`, `menu.js`, `render/effects.js` | opus |
| **D3** | Danger sheets: the tribute confirmation sheet (cost, gold after, what it cancels and does not, outcome-named buttons, no default, the rule's words when disabled), the fire row on every building and house sheet with Show me and View, firehouse, tower, barracks and rubble sheets, the temple's festival button, the last raid's report in the summary | `src/ui/danger.js`, D's text section | opus |
| **D4** | Tools and the fire-risk overlay: the wall tool's words and ghosts, the rubble demolish bar, the firehouse's placing words and auto overlay, the fire-risk overlay (four bands, hatching, dot and ring) with the generalised graded legend, problem markers for High and above | `placement.js`, `confirmBar.js`, `render/overlays.js`, `overlayUi.js`, `data/ui.js` | opus |
| **E1** | The score: `scoreOf` (parts, reasons), `scorePreview` and `scoreLineFor`, the summary's score section (bars, reasons, medal, points to next, splits against the best), the summary button's chip, Welcome back's score trend | `src/sim/score.js`, `src/ui/scoreUi.js`, `hud.js`, `welcomeBack.js` | opus |
| **E2** | Records, seals and sharing: `records.js` (rows, chronicle, bests, caps, merge, try/catch), Seal this reign (sheet, `sealReign`, `addSeal`), `share.js` (weekly seed, link and check, emoji row, picture card), Share score and its screenshot button | `src/save/records.js`, `src/ui/share.js`, `scoreUi.js` | opus |
| **E3** | The title card: the three bests, stamps, This week's Nile, a shared link's friend score with "Beat N?" and Start this seed | `scoreUi.js` (`titleDecor`) | opus |
| **E4** | Gamification: Founded Thebes ("1 of 10"), the next-threshold bar (medals from Capital), feats (data, `checkFeats`, words, the achievements group, at sealing), citizen remarks, and the danger chapter, goals, event goals, firsts, achievements, daily goals and tips with their words | `goals.js`, `firsts.js`, `achievements.js`, `daily.js`, `tips.js`, `feats.js` (data and sim), `goalsList.js`, `celebrate.js`, E's text section | opus |
| **F1** | Balance: the long runs build firehouses (and the capital run defences) through the player's commands, assert the 60-70% band at a steady tier-4 town (ruling 114), and lose the calm switch | `tests/sim/longrun.test.js`, `capital.test.js`, data tuning with the owners' consent | opus |
| **F2** | Integration: the sample and stress cities with firehouses and defences, no calm; the title backdrop's build time (precompute or fewer days); `difficultyHint` naming the risks; `devScene` for the `-Stage3` screenshots; README, follow-ups, the final review | `src/dev/*`, `difficultyHint`, notes | opus |

## Contract notes

Places where the spec was ambiguous or the code disagreed, and what the contract chose.

1. **Fire state on the building**, not a `world.fire` map: `b.risk` and `b.fire` live and die with the building, survive demolish snapshots and merges, and need no clean-up; the renderer and alerts already walk the buildings each frame and tick.
2. **Walls are a tile layer** (`world.wall`, -1 for a breach) as the code map recommends, but `wall` and `gate` are also `BUILDINGS` keys (`tile: true`) so names, prices, the Defence card, the unlock tests and thumbnails work unchanged; `place` refuses them. The spec's "walls, gate" unlock is one card: a gate is a wall drawn over a road and has no card of its own.
3. **Rubble costs 0** and `gate` and `rubble` are `buildable: false`; the data tests that required every building to cost something, have a card and a milestone now read `BUILDABLE`.
4. **Roads never cross walls**: a gate is made only by drawing wall over a road (a road drawn through a wall would make a gate at the road's price). Demolish takes a wall tile up for no refund (the spec says nothing; roads and plots refund nothing); a gate's road stays.
5. **Buildings never stand on a wall tile or a breach**, except a tower on a standing wall tile (spec: "on open ground or on a wall tile").
6. **The 1a undo guards moved from Track A to Track 0**: Track 0 had to edit the same hunk of `undo.js` for wall tiles. A placement refunds only what still stands, pro rata for painted plots; a demolish that would go back onto used tiles is refused (`occupied`) and dropped.
7. **Pure shared rules are complete in Track 0** (fire coverage and daily risk, raid size and wealth, tribute and `payTribute`, festivals, medals and seals), so D's tribute sheet, fire row and festival button and E's Safety part can test against the real rule before A and B merge. A and B own those files afterwards.
8. **Festivals sit in `src/sim/festival.js`**, owned by B; the temple's button and its words are D's.
9. **Alerts are not computed once per tick.** `alertsFor` stays pure and is still called several times a tick; fire's and raids' parts must stay cheap (coverage is cached). A per-tick memo is a follow-up if the stress city needs it.
10. **The fire-risk overlay is wholly D's** (`OVERLAYS`, `GRADED_OVERLAYS`, `AUTO_OVERLAY.firehouse`, the legend): listing an overlay without its drawing and legend would crash the O key's cycle, so it lands as one unit and D updates `overlaysStage2.test.js`.
11. **The firehouse has `reach: 8` but no `provides`**, so it never joins `coveredBy` or the homes' needs; its cover comes from `fireCoverage`. Until D words it, its placing line is empty (`effectText` has no entry).
12. **Peaceful shows on the title card and in Settings from Task 0.1** (they list `DIFFICULTY_ORDER`), with Relaxed's hint until Track F's `difficultyHint` names the risks.
13. **The raid clock at load** starts when the city's peak or its people reach 250 (the spec says "already had 250"; the peak is what the city "had").
14. **Splits of a version 3 city are unknown**: `splits` starts empty, so its share link writes `x` for milestones it passed before Stage 3 and its summary has no "faster than your best" for them.
15. **The city id** is a `createWorld` parameter and the `setCityId` command, both fed by the interface's `newCityId` (time and a random tail), since the sim never reads the clock.
16. **Records ride in the save envelope** as an optional `records` field; `SAVE_VERSION` stays 1 (older games ignore it); autosaves leave it out.
17. **Speed reactions are split**: the sim makes the city's first-time pauses and the drops to 1x (deterministic, saved), the interface the later On a fire reaction (a device setting). The spec's "goes through setSpeed" holds for both.
18. **`fireDay` and `raidDay` run before the day turns**, so their draws key on the day being simulated and a month-end month sees that day's fires.
19. **Feats are checked monthly and after commands**, not daily (no feat needs a mid-month day: gold changes outside the month end only through commands, goal rewards, trade and theft, which never go below 0).
20. **Soldiers' pay shows on its own summary row only once paid** (a village would otherwise show "Soldiers' pay −0").
21. **Screenshot mode is the contract's** (store, modes, back stack, input, menu), because every part of it is a shared file; E's Share score button and D's menu row reach it through `ctx.screenshotMode`.
22. **The idle frame-rate cap** is a gate the loop asks (`allowFrame`) that C fills in, so C never edits `createUI` or `boot`.
23. **Spec 4.9's arrivals formula** (6 + 0.05 p) still differs from `data/mood.js` (30 + 0.08 p), a Stage 1 tuning; Stage 3 does not touch it (a follow-up from the spec step).
24. **The calm switch** (`world.calm`) is test scaffolding in shipped code until Track F; it keeps the long runs, the stress city, the title backdrop and the Stage 2 screenshots unchanged while A and B land.

---

# Track 0: the contract

## Track 0: the contract

Track 0 runs on the branch `stage-3-danger` in `C:\dev\thebes` itself, one task after another, before any worktree exists. When Task 0.3 is committed, its commit is the base every track branch is cut from (see "Tracks and tasks" in the header). Every code block below was applied, in this order, to a copy of `main` at `28d4f0c` and the full suite run after each task: 937, 962 and 984 tests, `ALL PASSED`. The before-blocks are exact; apply them in the order given.

---

### Task 0.1: World version 4, the Stage 3 data, costs and placeholder art

**Files:**
- Create: `src/data/fire.js`, `src/data/raids.js`, `src/data/scoring.js`, `src/data/feats.js`, `src/data/ambient.js`, `src/render/art/defence.js`
- Modify: `src/data/buildings.js` (six types and `BUILDABLE`), `src/data/difficulty.js` (Peaceful, `raids`), `src/data/progression.js`, `src/data/desirability.js`, `src/data/mood.js` (`DANGER_MOOD`), `src/data/ui.js` (categories)
- Modify: `src/sim/world.js` (`WORLD_VERSION = 4`, the new fields and factories, `risk` and `fire` on every building), `src/sim/costs.js` (`rubbleCostOf`, `festivalCostOf`, `riskOf`, `raidsOn`, `soldiersPayOf`), `src/sim/commands.js` (`checkTiles` refuses tile types and unbuildable types)
- Modify: `src/save/migrate.js` (`MIGRATIONS[3]`), `src/save/serialize.js` (`REQUIRED`, exported `TALLY_KEYS`, `validateWorld`)
- Modify: `src/render/art/registry.js` (the placeholder slots), `src/ui/text.js` (Track 0's section: Peaceful's name)
- Modify: `sw-files.js` (regenerated by `tools/sw-files.ps1`)
- Create tests: `tests/stage3/contract/dangerData.test.js`, `tests/stage3/contract/worldV4.test.js`, `tests/stage3/contract/migrateV4.test.js`, and the seven aggregators `tests/stage3/{contract,fire,raids,art,ui,score,balance}.all.js`
- Modify tests: `tests/all.js` (the seven aggregators), and the pinned tests listed in Step 5

**Interfaces:**
- Consumes: `createWorld`, `makeBuilding`, `MIGRATIONS`, `REQUIRED`, `validateWorld`, `costOf`'s `scaled` rule, `CATEGORIES`, `ART`, `boundsFor`, `box`, `qd`.
- Produces (contract): everything under "World version 4", "Data" and "Costs" in the contract: `WORLD_VERSION = 4`; `newRaidState`, `newDangerState`, `newTally`, `STAGE3_TALLY` (`src/sim/world.js`); `createWorld({ ..., cityId })`; `MIGRATIONS[3]`; `TALLY_KEYS` exported; `BUILDINGS.firehouse/tower/barracks/wall/gate/rubble`, `BUILDABLE`; `FIRE`, `FIRE_SALT`, `FIRE_RISK`, `HOUSE_RISK`, `FIRE_BANDS`, `FIRE_BAND_IDS`; `RAIDS`, `RAID_SALT`, `UNITS`, `DEFENCE`, `FESTIVAL`; `DANGER_MOOD`; `SCORE_VERSION`, `SCORE_PARTS`, `SCORE_WEIGHTS`, `SCORE_TERMS`, `SCORE_FACTOR`, `MEDALS`, `SPLIT_MILESTONES`, `RECORDS_KEY`, `RECORDS_MAX`, `SHARE`; `FEATS = []`; `AMBIENT`; `DIFFICULTIES.peaceful`, `DIFFICULTY_ORDER` with Peaceful first; `rubbleCostOf`, `festivalCostOf`, `riskOf`, `raidsOn`, `soldiersPayOf`; the art slots `firehouse`, `tower`, `barracks`, `wall`, `gate`, `rubble`; `DIFFICULTY_NAMES.peaceful`.

- [ ] **Step 1: Write the failing tests**

Create `tests/stage3/contract/dangerData.test.js`:

```js
import { describe, it, expect } from '../../harness.js';
import { BUILDINGS, BUILDABLE } from '../../../src/data/buildings.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { TIERS } from '../../../src/data/housing.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../../src/data/difficulty.js';
import { FIRE, FIRE_SALT, FIRE_RISK, HOUSE_RISK, FIRE_BANDS, FIRE_BAND_IDS } from '../../../src/data/fire.js';
import { RAIDS, RAID_SALT, UNITS, DEFENCE, FESTIVAL } from '../../../src/data/raids.js';
import { DANGER_MOOD } from '../../../src/data/mood.js';
import { SCORE_VERSION, SCORE_PARTS, SCORE_WEIGHTS, SCORE_TERMS, SCORE_FACTOR, MEDALS, SPLIT_MILESTONES, RECORDS_KEY, RECORDS_MAX, SHARE } from '../../../src/data/scoring.js';
import { FEATS } from '../../../src/data/feats.js';
import { AMBIENT } from '../../../src/data/ambient.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { ART } from '../../../src/render/art/registry.js';
import { costOf, rubbleCostOf, festivalCostOf, riskOf, raidsOn, soldiersPayOf } from '../../../src/sim/costs.js';
import { makeTestWorld } from '../../helpers/testWorld.js';

const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));
const byLevel = (fn) => DIFFICULTY_ORDER.map((d) => { const w = makeTestWorld(); w.difficulty = d; return fn(w); });

describe('s3 contract data', () => {
  it('adds the firehouse, tower and barracks as buildings, and the wall, gate and rubble with the spec 4.11-4.13 numbers', () => {
    const KEYS = ['name', 'w', 'd', 'cost', 'upkeep', 'workers', 'priority', 'category', 'needsRoad'];
    expect(pick(BUILDINGS.firehouse, [...KEYS, 'reach'])).toEqual({ name: 'Firehouse', w: 1, d: 1, cost: 50, upkeep: 4, workers: 4, priority: 'safety', category: 'services', needsRoad: true, reach: 8 });
    expect(pick(BUILDINGS.tower, KEYS)).toEqual({ name: 'Tower', w: 1, d: 1, cost: 150, upkeep: 8, workers: 4, priority: 'safety', category: 'defence', needsRoad: true });
    expect(pick(BUILDINGS.barracks, KEYS)).toEqual({ name: 'Barracks', w: 2, d: 2, cost: 200, upkeep: 12, workers: 6, priority: 'safety', category: 'defence', needsRoad: true });
    expect(pick(BUILDINGS.wall, [...KEYS.filter((k) => k !== 'priority'), 'tile'])).toEqual({ name: 'Wall', w: 1, d: 1, cost: 8, upkeep: 0, workers: 0, category: 'defence', needsRoad: false, tile: true });
    expect(pick(BUILDINGS.gate, ['name', 'cost', 'upkeep', 'tile', 'buildable'])).toEqual({ name: 'Gate', cost: 20, upkeep: 0, tile: true, buildable: false });
    expect(pick(BUILDINGS.rubble, ['name', 'w', 'd', 'cost', 'upkeep', 'workers', 'needsRoad', 'buildable'])).toEqual({ name: 'Rubble', w: 1, d: 1, cost: 0, upkeep: 0, workers: 0, needsRoad: false, buildable: false });
    expect(BUILDABLE).toEqual(Object.keys(BUILDINGS).filter((t) => t !== 'gate' && t !== 'rubble'));
    expect(BUILDINGS.firehouse.reach).toBe(FIRE.reach);
  });
  it('unlocks the firehouse with the Village and the wall, tower and barracks with Market town, and gives each a card', () => {
    const at = (type) => MILESTONES.find((m) => m.unlocks.includes(type)).id;
    expect(['firehouse', 'wall', 'tower', 'barracks'].map(at)).toEqual(['village', 'market_town', 'market_town', 'market_town']);
    expect(CATEGORIES.find((c) => c.id === 'services').items.slice(-1)).toEqual(['firehouse']);
    expect(CATEGORIES.find((c) => c.id === 'defence').items).toEqual(['wall', 'tower', 'barracks']);
    for (const slot of ['firehouse', 'tower', 'barracks', 'wall', 'gate', 'rubble']) expect([slot, typeof (ART[slot] && ART[slot].draw)]).toEqual([slot, 'function']);
  });
  it('sets the fire numbers of spec 4.12', () => {
    expect(FIRE).toEqual({
      startsAt: 'town', threshold: 100, ignitionChance: 0.03, cut: 0.8, staffedAt: 0.5, blazeDays: 3, putOutDays: [1, 2],
      fireDays: [10, 15], spreadChance: 0.06, outChance: 0.25, rubbleCost: 5, reach: 8,
    });
    expect(new Set(Object.values(FIRE_SALT)).size).toBe(Object.keys(FIRE_SALT).length);
    expect(FIRE_BANDS).toEqual([0, 25, 60, 100]);
    expect(FIRE_BAND_IDS.length).toBe(FIRE_BANDS.length);
  });
  it('gives every building that burns its risk a day, and none to those that never burn', () => {
    expect(FIRE_RISK).toEqual({
      potter: 1.0, brewery: 1.0, weaver: 0.5, jeweller: 0.5, granary: 0.5, storehouse: 0.5, trading_post: 0.5,
      bazaar: 0.3, booth: 0.3, barracks: 0.3, farm_grain: 0.15, farm_fig: 0.15, farm_barley: 0.15, farm_flax: 0.15, clay_pit: 0.15, gem_mine: 0.15,
      temple: 0.1, firehouse: 0.1,
    });
    for (const never of ['garden', 'statue', 'well', 'wall', 'gate', 'tower', 'rubble', 'house']) expect([never, FIRE_RISK[never]]).toEqual([never, undefined]);
    for (const t of Object.keys(FIRE_RISK)) expect([t, Boolean(BUILDINGS[t])]).toEqual([t, true]);
    expect(HOUSE_RISK).toEqual([0, 0.3, 0.3, 0.25, 0.25, 0.25, 0.2, 0.2, 0.2, 0.2]);
    expect(HOUSE_RISK.length).toBe(TIERS.length);
    expect(Math.round(FIRE.threshold / HOUSE_RISK[4])).toBe(400);                   // an uncovered House: about 13 months
  });
  it('sets the raid, unit, defence and festival numbers of spec 4.13', () => {
    expect(RAIDS).toEqual({
      clockPeople: 250, firstWarnAfter: 720, warningDays: 90, laterMin: 720, laterMax: 1440, firstSize: 3, minSize: 2, maxSize: 12,
      peoplePerRaider: 125, wealthBase: 5000, wealthStep: 5000, wealthMax: 4, adaptLost: 0.6, adaptStep: 0.2, raidersPerTower: 3,
      tributeShare: 0.8, strikes: 3, strikeDays: 2, stealShare: 0.01, stealMin: 5, stealMax: 50, retreatShare: 0.5,
      targets: ['trading_post', 'storehouse', 'bazaar', 'temple'],
    });
    for (const t of RAIDS.targets) expect(Boolean(BUILDINGS[t])).toBe(true);
    expect(new Set(Object.values(RAID_SALT)).size).toBe(Object.keys(RAID_SALT).length);
    expect(UNITS).toEqual({ raider: { hp: 10, speed: 1, damage: 2 }, soldier: { hp: 12, speed: 2, damage: 3 } });
    expect(DEFENCE).toEqual({ wallHp: 40, gateHp: 40, towerOnWallHp: 80, towerRange: 4, towerDamage: 4, patrol: 8, soldiersPerBarracks: 4, trainDays: 30, soldierPay: 8 });
    expect(FESTIVAL).toEqual({ from: 'town', cost: 200, mood: 6, days: 90, every: 360 });
  });
  it('sets the danger mood terms of spec 4.9', () => {
    expect(DANGER_MOOD).toEqual({ fireLastMonth: -4, burnedEach: -2, burnedMax: -10, burnedDays: 180, raidBeaten: -3, raidLost: -8, raidDays: 180 });
  });
  it('sets score v1: four parts whose weights add up to 100, a factor per level, medals and the share link', () => {
    expect(SCORE_VERSION).toBe(1);
    expect(SCORE_PARTS).toEqual(['people', 'prosperity', 'culture', 'safety']);
    expect(Object.keys(SCORE_WEIGHTS)).toEqual(SCORE_PARTS);
    for (const part of SCORE_PARTS) expect([part, Object.values(SCORE_WEIGHTS[part]).reduce((a, b) => a + b, 0)]).toEqual([part, 100]);
    expect(SCORE_TERMS).toEqual({ growthSteps: 5, homesSpan: 8, taxPerPerson: 5, jobsFull: 0.05, jobsZero: 0.30, treasuryZero: -500, routes: 2, pleasant: 50, burnedPenalty: 0.2, raidLostPenalty: 0.5, recordDays: 360 });
    expect(SCORE_FACTOR).toEqual({ peaceful: 0.7, relaxed: 0.8, normal: 1, hard: 1.25 });
    expect(Object.keys(SCORE_FACTOR).sort()).toEqual([...DIFFICULTY_ORDER].sort());
    expect(MEDALS).toEqual([{ id: 'bronze', at: 160 }, { id: 'silver', at: 240 }, { id: 'gold', at: 320 }]);
    expect(SPLIT_MILESTONES).toEqual(MILESTONES.slice(1).map((m) => m.id));
    expect([RECORDS_KEY, RECORDS_MAX]).toEqual(['thebes.records', 200]);
    expect(SHARE).toEqual({ base: 'https://joshuahedge.github.io/thebes/', format: 't1', difficulty: { peaceful: 'p', relaxed: 'r', normal: 'n', hard: 'h' }, checkLength: 4 });
    expect(FEATS).toEqual([]);                                                       // Track E fills it, with its words
  });
  it('sets the ambient numbers of ruling 133', () => {
    expect(pick(AMBIENT, ['glintDriftTilesPerSecond', 'reedSwayDeg', 'treeSwayDeg', 'cropBandEveryMs', 'budgetMs', 'idleFpsCap', 'idleAfterMs', 'maxChangeHz'])).toEqual({
      glintDriftTilesPerSecond: 0.2, reedSwayDeg: 3, treeSwayDeg: 2, cropBandEveryMs: 6000, budgetMs: 2, idleFpsCap: 30, idleAfterMs: 2000, maxChangeHz: 1,
    });
    expect([AMBIENT.glintFadeMs, AMBIENT.reedSwayPeriodMs, AMBIENT.treeSwayPeriodMs, AMBIENT.smokeEveryMs, AMBIENT.rareEveryMs]).toEqual([[4000, 7000], [3000, 6000], [4000, 6000], [2000, 3000], [60000, 120000]]);
    expect(AMBIENT.dropOrder).toEqual(['rare', 'smoke', 'sway']);
  });
});

describe('s3 contract costs', () => {
  it('scales walls, gates, towers, barracks, rubble clearing and festivals by the difficulty, never soldiers\' pay', () => {
    expect(byLevel((w) => costOf(w, 'wall'))).toEqual([6, 6, 8, 10]);
    expect(byLevel((w) => costOf(w, 'gate'))).toEqual([16, 16, 20, 25]);
    expect(byLevel((w) => costOf(w, 'tower'))).toEqual([120, 120, 150, 188]);         // 187.5 rounds up
    expect(byLevel((w) => costOf(w, 'barracks'))).toEqual([160, 160, 200, 250]);
    expect(byLevel((w) => costOf(w, 'firehouse'))).toEqual([40, 40, 50, 63]);
    expect(byLevel(rubbleCostOf)).toEqual([4, 4, 5, 6]);                             // 6.25 rounds down
    expect(byLevel(festivalCostOf)).toEqual([160, 160, 200, 250]);
    const w = makeTestWorld();
    w.soldiers.push({ id: 1 }, { id: 2 }, { id: 3 });
    for (const d of DIFFICULTY_ORDER) { w.difficulty = d; expect([d, soldiersPayOf(w)]).toEqual([d, 3 * DEFENCE.soldierPay]); }
  });
  it('reads the risk multiplier and whether raids come from the level', () => {
    expect(byLevel(riskOf)).toEqual([0.5, 0.5, 1, 1.5]);
    expect(byLevel(raidsOn)).toEqual([false, true, true, true]);
    expect(DIFFICULTY_ORDER.map((d) => DIFFICULTIES[d].raids)).toEqual([false, true, true, true]);
  });
});
```


Create `tests/stage3/contract/worldV4.test.js`:

```js
import { describe, it, expect } from '../../harness.js';
import {
  createWorld, makeBuilding, WORLD_VERSION, STAGE3_TALLY, newTally, newRaidState, newDangerState,
} from '../../../src/sim/world.js';
import { serialize, deserialize, validateWorld, REQUIRED, TALLY_KEYS } from '../../../src/save/serialize.js';
import { canPlace } from '../../../src/sim/commands.js';
import { makeTestWorld, setRoad } from '../../helpers/testWorld.js';

describe('s3 contract world v4', () => {
  it('creates a version 4 world with no walls, no raid clock, no soldiers, no danger, no splits, seals or feats', () => {
    const w = createWorld({ seed: 4 });
    expect(WORLD_VERSION).toBe(4);
    expect(w.version).toBe(4);
    expect(w.wall.length).toBe(w.size * w.size);
    expect(w.wall.every((v) => v === 0)).toBe(true);
    expect(w.wallVersion).toBe(0);
    expect(w.raid).toEqual({ clockDay: null, nextWarnDay: null, index: 0, warning: null, active: null, adaptation: 1, last: null });
    expect(w.raid).toEqual(newRaidState());
    expect(w.soldiers).toEqual([]);
    expect(w.nextUnitId).toBe(1);
    expect(w.danger).toEqual({ burnDays: [], lastFireDay: null, festivalDay: null, firePaused: false });
    expect(w.danger).toEqual(newDangerState());
    expect([w.splits, w.seals, w.feats, w.cityId]).toEqual([{}, [], { earned: [], lost: [], counters: {} }, null]);
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
    expect(Object.keys(w).sort()).toEqual([...REQUIRED].sort());
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
  });
  it('starts every Stage 3 tally at zero, and the save checks each one', () => {
    const w = createWorld({ seed: 4 });
    expect(STAGE3_TALLY).toEqual(['fires', 'blazesOut', 'firesOut', 'burned', 'rubbleCleared', 'raids', 'raidsBeaten', 'raidsLost', 'tributes',
      'raidersByTowers', 'raidersBySoldiers', 'soldiersWounded', 'goldStolen', 'festivals', 'wallTiles']);
    for (const k of STAGE3_TALLY) expect([k, w.tally[k]]).toEqual([k, 0]);
    expect(w.tally).toEqual(newTally());
    for (const k of STAGE3_TALLY) expect(TALLY_KEYS).toContain(k);
  });
  it('takes a city id from the interface, and none for anything that is not a non-empty string', () => {
    expect(createWorld({ seed: 4, cityId: 'k3x9-7' }).cityId).toBe('k3x9-7');
    for (const bad of [undefined, null, '', 7, {}]) expect(createWorld({ seed: 4, cityId: bad }).cityId).toBe(null);
  });
  it('gives each new world its own walls, raid state, soldiers, danger and lists', () => {
    const a = createWorld({ seed: 4 }), b = createWorld({ seed: 4 });
    a.wall[5] = 40; a.raid.index = 2; a.soldiers.push({ id: 1 }); a.danger.burnDays.push(3); a.splits.town = 9; a.seals.push({ day: 1 }); a.feats.earned.push('x');
    expect([b.wall[5], b.raid.index, b.soldiers, b.danger.burnDays, b.splits, b.seals, b.feats.earned]).toEqual([0, 0, [], [], {}, [], []]);
  });
  it('gives every building no fire risk and no fire', () => {
    const w = createWorld({ seed: 4 });
    for (const type of ['house', 'potter', 'firehouse', 'rubble', 'tower']) {
      const b = makeBuilding(w, type, 3, 3);
      expect([type, b.risk, b.fire]).toEqual([type, 0, null]);
    }
  });
  it('never places a wall, a gate or rubble as a building: walls are drawn, rubble is left by fire', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    w.milestone = 'capital';
    expect(canPlace(w, 'wall', 12, 9).reason).toBe('unknown');
    expect(canPlace(w, 'gate', 12, 9).reason).toBe('unknown');
    expect(canPlace(w, 'rubble', 12, 9).reason).toBe('unknown');
    expect(canPlace(w, 'tower', 12, 9).ok).toBe(true);
    w.milestone = 'town';
    expect(canPlace(w, 'wall', 12, 9).reason).toBe('locked');                         // before Market town it is locked first
    expect(canPlace(w, 'firehouse', 12, 9).ok).toBe(true);                            // the firehouse comes with the Village
  });
  it('round-trips a world with walls, a raid, soldiers, fires, splits, seals and feats', () => {
    const w = createWorld({ seed: 6, cityId: 'abc' });
    w.wall[10] = 40; w.wall[11] = -1; w.wallVersion = 2;
    w.raid = { ...newRaidState(), clockDay: 30, nextWarnDay: 750, index: 1, adaptation: 0.8,
      warning: { index: 1, entry: { x: 63, y: 32 }, dir: 'east', size: 4, tribute: 240, target: 'storehouse', day: 760, arrives: 850, first: false } };
    w.soldiers.push({ id: 3, barracks: 9, x: 4.5, y: 6, hp: 12, hit: false, task: 'wait' });
    w.nextUnitId = 4;
    w.danger.burnDays.push(100, 140); w.danger.lastFireDay = 140; w.danger.festivalDay = 90; w.danger.firePaused = true;
    w.splits = { town: 400, market_town: 700 };
    w.seals.push({ day: 800, score: 240, parts: { people: 60, prosperity: 60, culture: 60, safety: 60 }, version: 1 });
    w.feats = { earned: ['swift_town'], lost: ['grain_alone'], counters: { fedMonths: 3 } };
    expect(deserialize(serialize(w))).toEqual(w);
  });
});
```


Create `tests/stage3/contract/migrateV4.test.js`:

```js
import { describe, it, expect } from '../../harness.js';
import { migrate, MIGRATIONS, CURRENT_VERSION } from '../../../src/save/migrate.js';
import { serialize, deserialize, validateWorld, unpackSave, REQUIRED } from '../../../src/save/serialize.js';
import { createWorld, population, STAGE3_TALLY, newRaidState, newDangerState } from '../../../src/sim/world.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../../src/sim/commands.js';
import { RAIDS } from '../../../src/data/raids.js';

const V4_KEYS = ['wall', 'wallVersion', 'raid', 'soldiers', 'nextUnitId', 'danger', 'splits', 'seals', 'feats', 'cityId'];
const code = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };

// A version 3 save as Stage 2 wrote it: a lived-in city without the version 4 fields.
function v3City({ milestone = null, peak = null } = {}) {
  const w = createWorld({ seed: 7 });
  const { x, y } = w.focus;
  expect(drawRoad(w, x - 6, y, x + 6, y).ok).toBe(true);
  expect(paintHouses(w, x - 5, y + 1, x + 5, y + 1).ids.length).toBeGreaterThan(0);
  expect(place(w, 'well', x, y - 1).ok).toBe(true);
  advanceDays(w, 75);
  const v3 = JSON.parse(serialize(w));
  for (const k of V4_KEYS) delete v3[k];
  for (const k of STAGE3_TALLY) delete v3.tally[k];
  for (const b of Object.values(v3.buildings)) { delete b.risk; delete b.fire; }
  v3.newItems = v3.newItems.filter((t) => !['firehouse', 'wall', 'tower', 'barracks'].includes(t));   // Stage 2 never listed them
  if (milestone) v3.milestone = milestone;
  if (peak !== null) v3.tally.peakPeople = peak;
  v3.version = 3;
  return v3;
}

// A valid version 4 world as plain data, changed by fn, then validated.
function validAfter(fn) {
  const w = JSON.parse(serialize(createWorld({ seed: 3 })));
  fn(w);
  return validateWorld(w);
}

describe('s3 contract migrate v3 to v4', () => {
  it('adds no walls, no raid, no soldiers, no danger, no splits, seals, feats or city id, and keeps everything else', () => {
    const v3 = v3City();
    expect(population(v3)).toBeGreaterThan(0);
    const before = JSON.stringify(v3);
    const v4 = MIGRATIONS[3](v3);
    expect(JSON.stringify(v3)).toBe(before);                                  // the old object is not changed
    expect(v4.version).toBe(4);
    expect(v4.wall).toEqual(new Array(v3.size * v3.size).fill(0));
    expect([v4.wallVersion, v4.soldiers, v4.nextUnitId, v4.splits, v4.seals, v4.cityId]).toEqual([0, [], 1, {}, [], null]);
    expect(v4.raid).toEqual(newRaidState());                                    // under 250 people: no clock yet
    expect(v4.danger).toEqual(newDangerState());
    expect(v4.feats).toEqual({ earned: [], lost: [], counters: {} });
    expect(v4.tally).toEqual({ ...v3.tally, ...Object.fromEntries(STAGE3_TALLY.map((k) => [k, 0])) });
    for (const [id, b] of Object.entries(v3.buildings)) expect(v4.buildings[id]).toEqual({ ...b, risk: 0, fire: null });
    expect(v4.newItems).toEqual([...v3.newItems, 'firehouse']);                 // a Village gets the firehouse's New badge
    for (const k of Object.keys(v3)) {
      if (!['version', 'tally', 'buildings', 'newItems'].includes(k)) expect([k, v4[k]]).toEqual([k, v3[k]]);
    }
    expect(Object.keys(v4).sort()).toEqual([...REQUIRED].sort());
    expect(validateWorld(v4)).toBe(true);
  });
  it('gives a Market town or bigger the defences New badges too, once each', () => {
    const v3 = v3City({ milestone: 'city' });
    v3.newItems = ['farm_barley', 'tower'];
    expect(MIGRATIONS[3](v3).newItems).toEqual(['farm_barley', 'tower', 'firehouse', 'wall', 'barracks']);
    expect(MIGRATIONS[3](v3City({ milestone: 'town' })).newItems).toEqual(['firehouse']);
  });
  it('starts the raid clock on the day it is loaded for a city that already had 250 people, so no raid lands at once', () => {
    const v3 = v3City({ peak: RAIDS.clockPeople });
    const v4 = MIGRATIONS[3](v3);
    expect(v4.raid.clockDay).toBe(v3.day);
    expect(v4.raid.nextWarnDay).toBe(v3.day + RAIDS.firstWarnAfter);
    expect([v4.raid.warning, v4.raid.active, v4.raid.index]).toEqual([null, null, 0]);
    expect(MIGRATIONS[3](v3City({ peak: RAIDS.clockPeople - 1 })).raid.clockDay).toBe(null);   // 249: the clock waits
  });
  it('runs through migrate, deserialize and unpackSave', () => {
    const v3 = v3City();
    expect(CURRENT_VERSION).toBe(4);
    expect(migrate(v3)).toEqual(MIGRATIONS[3](v3));
    expect(deserialize(JSON.stringify(v3)).version).toBe(4);
    const back = unpackSave(JSON.stringify({ version: 1, savedAt: 1760000000000, lastSpeed: 2, world: v3 }));
    expect([back.savedAt, back.lastSpeed, back.world.version, back.world.gold]).toEqual([1760000000000, 2, 4, v3.gold]);
  });
  it('reports a malformed version 3 save as corrupt, not as a failed migration', () => {
    expect(code(() => deserialize(JSON.stringify({ version: 3 })))).toBe('corrupt_save');
    const v3 = v3City();
    v3.buildings = null;
    expect(code(() => deserialize(JSON.stringify(v3)))).toBe('corrupt_save');
    const odd = v3City();
    odd.size = 'big';
    expect(code(() => deserialize(JSON.stringify(odd)))).toBe('corrupt_save');
  });
});

describe('s3 contract validateWorld v4', () => {
  it('requires each new field and each Stage 3 tally', () => {
    for (const k of V4_KEYS) expect([k, validAfter((w) => { delete w[k]; })]).toEqual([k, false]);
    for (const k of STAGE3_TALLY) expect([k, validAfter((w) => { delete w.tally[k]; })]).toEqual([k, false]);
    expect(validAfter((w) => { w.difficulty = 'peaceful'; })).toBe(true);
  });
  it('checks the wall layer: one whole number per tile, -1 for a breach at the least', () => {
    expect(validAfter((w) => { w.wall[3] = 40; w.wall[4] = -1; })).toBe(true);
    expect(validAfter((w) => { w.wall.pop(); })).toBe(false);
    expect(validAfter((w) => { w.wall[3] = -2; })).toBe(false);
    expect(validAfter((w) => { w.wall[3] = 1.5; })).toBe(false);
    expect(validAfter((w) => { w.wallVersion = 'x'; })).toBe(false);
    expect(validAfter((w) => { w.nextUnitId = 0; })).toBe(false);
  });
  it('checks every building has a risk and a fire that is null, a blaze or a fire', () => {
    const withHouse = (fn) => validAfter((w) => {
      w.buildings[1] = { id: 1, type: 'house', x: 2, y: 2, w: 1, d: 1, staff: 0, paused: false, store: {}, progress: 0, blocked: null, risk: 0, fire: null };
      w.occ[2 * w.size + 2] = 1;
      fn(w.buildings[1]);
    });
    expect(withHouse(() => {})).toBe(true);
    expect(withHouse((b) => { b.fire = { stage: 'blaze', days: 1, need: 2, fought: 0 }; })).toBe(true);
    expect(withHouse((b) => { b.fire = { stage: 'fire', days: 0, left: 12 }; })).toBe(true);
    expect(withHouse((b) => { b.fire = { stage: 'smoke' }; })).toBe(false);
    expect(withHouse((b) => { delete b.risk; })).toBe(false);
    expect(withHouse((b) => { b.risk = NaN; })).toBe(false);
  });
  it('checks the raid, danger, splits, seals, feats and city id shapes', () => {
    expect(validAfter((w) => { w.raid = null; })).toBe(false);
    expect(validAfter((w) => { w.raid.clockDay = 1.5; })).toBe(false);
    expect(validAfter((w) => { w.raid.index = -1; })).toBe(false);
    expect(validAfter((w) => { w.raid.warning = []; })).toBe(false);
    expect(validAfter((w) => { w.raid.adaptation = null; })).toBe(false);
    expect(validAfter((w) => { w.soldiers = [1]; })).toBe(false);
    expect(validAfter((w) => { w.danger.burnDays = [1.5]; })).toBe(false);
    expect(validAfter((w) => { w.danger.firePaused = 0; })).toBe(false);
    expect(validAfter((w) => { w.splits = { town: 'soon' }; })).toBe(false);
    expect(validAfter((w) => { w.seals = [3]; })).toBe(false);
    expect(validAfter((w) => { w.feats = { earned: [], lost: [] }; })).toBe(false);
    expect(validAfter((w) => { w.feats.counters.fed = 'x'; })).toBe(false);
    expect(validAfter((w) => { w.cityId = ''; })).toBe(false);
    expect(validAfter((w) => { w.cityId = 'a1'; })).toBe(true);
  });
});
```


The seven aggregators. Track 0's lists its own files; each track's starts with only its header and is the one file the track adds its imports to.

Create `tests/stage3/contract.all.js`:

```js
// Stage 3, Track 0 (the contract): every test file of the track, one import each. describe names start with "s3 contract".
import './contract/dangerData.test.js';
import './contract/worldV4.test.js';
import './contract/migrateV4.test.js';
```


Create `tests/stage3/fire.all.js`:

```js
// Stage 3, Track A: every test file of the track, one import each (tests/stage3/fire/*.test.js). describe names start
// with "s3 fire", so tests/run-tests.ps1 -Grep "s3 fire" runs the track alone. Only Track A edits this file.
```


Create `tests/stage3/raids.all.js`:

```js
// Stage 3, Track B: every test file of the track, one import each (tests/stage3/raids/*.test.js). describe names start
// with "s3 raids", so tests/run-tests.ps1 -Grep "s3 raids" runs the track alone. Only Track B edits this file.
```


Create `tests/stage3/art.all.js`:

```js
// Stage 3, Track C: every test file of the track, one import each (tests/stage3/art/*.test.js). describe names start
// with "s3 art", so tests/run-tests.ps1 -Grep "s3 art" runs the track alone. Only Track C edits this file.
```


Create `tests/stage3/ui.all.js`:

```js
// Stage 3, Track D: every test file of the track, one import each (tests/stage3/ui/*.test.js). describe names start
// with "s3 ui", so tests/run-tests.ps1 -Grep "s3 ui" runs the track alone. Only Track D edits this file.
```


Create `tests/stage3/score.all.js`:

```js
// Stage 3, Track E: every test file of the track, one import each (tests/stage3/score/*.test.js). describe names start
// with "s3 score", so tests/run-tests.ps1 -Grep "s3 score" runs the track alone. Only Track E edits this file.
```


Create `tests/stage3/balance.all.js`:

```js
// Stage 3, Track F: every test file of the track, one import each (tests/stage3/balance/*.test.js). describe names start
// with "s3 balance", so tests/run-tests.ps1 -Grep "s3 balance" runs the track alone. Only Track F edits this file.
```


In `tests/all.js`, replace:

```js
import './sim/goodsMonth.test.js';
import './ui/houseSheetEconomy.test.js';
```

with:

```js
import './sim/goodsMonth.test.js';
import './ui/houseSheetEconomy.test.js';
// Stage 3: one aggregator per track (tests/stage3/*.all.js); each track adds its files there, never here.
import './stage3/contract.all.js';
import './stage3/fire.all.js';
import './stage3/raids.all.js';
import './stage3/art.all.js';
import './stage3/ui.all.js';
import './stage3/score.all.js';
import './stage3/balance.all.js';
```


- [ ] **Step 2: Run them to see them fail**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "s3 contract" -WaitSeconds 120
```

Expected: the page cannot load, because `src/data/fire.js`, `src/data/raids.js`, `src/data/scoring.js`, `src/data/feats.js` and `src/data/ambient.js` do not exist yet:

```
LOAD ERROR
TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:<port>/tests/all.js
```

- [ ] **Step 3: Implement**

The new data files, every number from the spec's tables (spec 4.3, 4.9, 4.11-4.13, 4.18, 4.19, 5.6; rulings 69-133):

Create `src/data/fire.js`:

```js
// Fire (spec 4.3, 4.12), all tunable. Risk is points towards THRESHOLD: each day a building that can burn adds its
// type's rate (a home's by its tier) times the difficulty's risk multiplier (riskOf in src/sim/costs.js) times the
// firehouse cut (1 - CUT x coverage). Every random draw is stateless: hash2(building id, day, seed + a SALT).
export const FIRE = {
  startsAt: 'town',          // risk builds up only once the city is a Town
  threshold: 100,            // risk at which a building can catch fire
  ignitionChance: 0.03,      // a day, once at the threshold
  cut: 0.8,                  // a fully staffed firehouse cuts build-up by 80% (scaled by coverage)
  staffedAt: 0.5,            // coverage that counts as staffed, for putting fires out
  blazeDays: 3,              // a blaze not put out within this many days grows into a fire
  putOutDays: [1, 2],        // covered, staffed days a blaze needs to be put out (seeded at ignition)
  fireDays: [10, 15],        // days a fire burns before the building burns down (seeded when it grows)
  spreadChance: 0.06,        // a day, to each burnable neighbour sharing an edge
  outChance: 0.25,           // a day a covered fire goes out, times coverage
  rubbleCost: 5,             // gold per rubble tile cleared, times the difficulty's cost (rubbleCostOf)
  reach: 8,                  // the firehouse's road reach (BUILDINGS.firehouse.reach; a data test keeps them equal)
};

// Salts for hash2(id or a, day or b, world.seed + SALT): one per kind of draw, so no two draws share a stream.
export const FIRE_SALT = { ignite: 7101, putOut: 7102, length: 7103, spread: 7104, out: 7105 };

// Risk per day by building type (spec 4.12). A type not listed never burns: roads, empty plots, gardens, statues,
// wells, walls, gates, towers and rubble. Homes burn by their tier (HOUSE_RISK), so 'house' is not listed here.
const FARMS = 0.15;
export const FIRE_RISK = {
  potter: 1.0, brewery: 1.0,
  weaver: 0.5, jeweller: 0.5,
  granary: 0.5, storehouse: 0.5, trading_post: 0.5,
  bazaar: 0.3, booth: 0.3, barracks: 0.3,
  farm_grain: FARMS, farm_fig: FARMS, farm_barley: FARMS, farm_flax: FARMS, clay_pit: FARMS, gem_mine: FARMS,
  temple: 0.1, firehouse: 0.1,
};

// Index = tier, as TIERS: an empty plot (0) never burns; hut and shack 0.3; cottage, house, townhouse 0.25; manor up 0.2.
export const HOUSE_RISK = [0, 0.3, 0.3, 0.25, 0.25, 0.25, 0.2, 0.2, 0.2, 0.2];

// The fire-risk overlay's bands (spec 4.12): where each starts. Low 0-24, Rising 25-59, High 60-99, Can catch fire 100+.
export const FIRE_BANDS = [0, 25, 60, 100];
export const FIRE_BAND_IDS = ['low', 'rising', 'high', 'catch'];
```


Create `src/data/raids.js`:

```js
// Raids, defence and festivals (spec 4.3, 4.13), all tunable. Every random draw is stateless:
// hash2(world.seed, raid index, RAID_SALT.x), so a reload changes nothing.
export const RAIDS = {
  clockPeople: 250,          // the raid clock starts the day the city first has this many people (never on Peaceful)
  firstWarnAfter: 720,       // days from the clock's start to the first warning
  warningDays: 90,           // from the warning to the raiders' arrival
  laterMin: 720,             // later warnings: this many days after the last raid's arrival day (or the day a
  laterMax: 1440,            //   cancelled raid would have arrived), seeded between the two
  firstSize: 3,              // the first raid, at every difficulty
  minSize: 2,
  maxSize: 12,
  peoplePerRaider: 125,      // people term = people / 125
  wealthBase: 5000,          // wealth term = clamp((wealth - 5000) / 5000, 0, 4)
  wealthStep: 5000,
  wealthMax: 4,
  adaptLost: 0.6,            // a lost raid sets adaptation to this ...
  adaptStep: 0.2,            // ... and every later raid (beaten, lost or paid off) adds this, up to 1
  raidersPerTower: 3,        // towers needed = ceil(raiders / 3)
  tributeShare: 0.8,         // tribute = round(0.8 x towers needed x the tower's price in this city)
  strikes: 3,                // targets a band strikes before it leaves
  strikeDays: 2,             // days it stays at each
  stealShare: 0.01,          // each raider steals 1% of the treasury per strike ...
  stealMin: 5,               // ... at least 5 ...
  stealMax: 50,              // ... at most 50, never taking the treasury below 0
  retreatShare: 0.5,         // the band turns back once this share (rounded up) has fallen
  targets: ['trading_post', 'storehouse', 'bazaar', 'temple'],   // then any other building that is not a home
};

export const RAID_SALT = { gap: 8101, entry: 8102 };

// Units (spec 4.13): hit points, tiles moved a day, damage dealt a day.
export const UNITS = {
  raider: { hp: 10, speed: 1, damage: 2 },
  soldier: { hp: 12, speed: 2, damage: 3 },
};

// Defences (spec 4.13). Wall and gate prices are BUILDINGS.wall.cost and BUILDINGS.gate.cost (per tile, times the
// difficulty's cost); the tower and barracks are ordinary buildings in src/data/buildings.js.
export const DEFENCE = {
  wallHp: 40,                // a wall tile
  gateHp: 40,                // a wall tile on a road
  towerOnWallHp: 80,         // a wall tile with a tower on it
  towerRange: 4,             // straight-line tiles
  towerDamage: 4,            // a day, times the tower's staffing ratio, to the nearest raider in range
  patrol: 8,                 // straight-line tiles from the barracks' centre
  soldiersPerBarracks: 4,
  trainDays: 30,             // days to train one soldier at full staff (slower when short-staffed, none below 25%)
  soldierPay: 8,             // gold per soldier per month, in peace too and from a paused barracks
};

// Festivals (spec 4.13): a mood lever at a working temple, from Town.
export const FESTIVAL = {
  from: 'town',
  cost: 200,                 // times the difficulty's cost (festivalCostOf)
  mood: 6,
  days: 90,                  // the mood bonus lasts this long
  every: 360,                // days from one festival to the next
};
```


Create `src/data/scoring.js`:

```js
// The city score (spec 4.19), all tunable. Four parts, each 0-100, computed from the city's state at every month's
// end (src/sim/score.js scoreOf); the city score is their sum times the difficulty's factor, rounded. Records keep the
// version, so a change to any formula or weight here bumps SCORE_VERSION (Stage 4's Monuments part makes it 2).
export const SCORE_VERSION = 1;

export const SCORE_PARTS = ['people', 'prosperity', 'culture', 'safety'];

// Each part's terms (each 0 to 1) and their weights; a part's weights add up to 100.
export const SCORE_WEIGHTS = {
  people: { growth: 60, homes: 40 },
  prosperity: { taxes: 30, jobs: 30, treasury: 20, trade: 20 },
  culture: { temple: 25, entertainment: 25, bazaar: 25, pleasant: 25 },
  safety: { fire: 40, defence: 40, record: 20 },
};

// The terms' scales (spec 4.19). growth = (milestones reached after Village + the fraction to the next) / growthSteps;
// homes = (resident-weighted average tier - 1) / homesSpan; taxes = last month's tax per person / taxPerPerson;
// jobs = 1 - (unemployment - jobsFull) / (jobsZero - jobsFull), clamped; treasury = 1 at 0 gold or more, falling to 0 at
// treasuryZero; trade = open routes / routes; pleasant = average home desirability / pleasant; record = 1 - burned x
// burnedPenalty - raids lost x raidLostPenalty over the last recordDays, at least 0.
export const SCORE_TERMS = {
  growthSteps: 5,
  homesSpan: 8,
  taxPerPerson: 5,
  jobsFull: 0.05,
  jobsZero: 0.30,
  treasuryZero: -500,
  routes: 2,
  pleasant: 50,
  burnedPenalty: 0.2,
  raidLostPenalty: 0.5,
  recordDays: 360,
};

// Each difficulty's score factor (spec 4.18): the most a city can score is 400 times it.
export const SCORE_FACTOR = { peaceful: 0.7, relaxed: 0.8, normal: 1, hard: 1.25 };

// Medals on the parts' total before the factor (spec 4.19); shown in city-score points (times the factor).
export const MEDALS = [
  { id: 'bronze', at: 160 },
  { id: 'silver', at: 240 },
  { id: 'gold', at: 320 },
];

// The milestones whose first day the world records (world.splits) and the share link carries, in order.
export const SPLIT_MILESTONES = ['town', 'market_town', 'city', 'great_city', 'capital'];

// Records on the device (src/save/records.js): the localStorage key, and the most city rows and chronicle entries
// each list keeps (the oldest go first, never a best).
export const RECORDS_KEY = 'thebes.records';
export const RECORDS_MAX = 200;

// The share link (spec 4.19): https://joshuahedge.github.io/thebes/#t1.<seed>.<p|r|n|h>.<parts>.<splits>.<check>.
export const SHARE = {
  base: 'https://joshuahedge.github.io/thebes/',
  format: 't1',
  difficulty: { peaceful: 'p', relaxed: 'r', normal: 'n', hard: 'h' },
  checkLength: 4,
};
```


Create `src/data/feats.js`:

```js
// Feats (spec 4.19): named, optional style bonuses, per city. They pay nothing, gate nothing and can be missed; they
// list under achievements in their own group and show when a reign is sealed. Track E fills this list with the ten
// feats of spec 4.19 and their words (FEAT_TEXT in src/ui/text.js) in one commit; src/sim/feats.js judges them and
// keeps its running state in world.feats ({ earned, lost, counters }).
export const FEATS = [];
```


Create `src/data/ambient.js`:

```js
// Ambient life (spec 5.6, ruling 133), all tunable. Drawn on the real clock over the baked terrain for visible tiles
// only (src/render/ambient.js); off under reduced motion or the Ambient motion setting. Times are real milliseconds.
export const AMBIENT = {
  glintDriftTilesPerSecond: 0.2,   // water glints drift downstream ...
  glintFadeMs: [4000, 7000],       // ... fading in and out over 4-7 s
  rippleShiftPx: 1,                // bank ripples shift about 1 px back and forth ...
  ripplePeriodMs: 5000,            // ... over 5 s
  reedSwayDeg: 3,                  // reeds sway +-3 degrees ...
  reedSwayPeriodMs: [3000, 6000],  // ... over 3-6 s
  treeSwayDeg: 2,                  // palms and acacias lean +-2 degrees from the base ...
  treeSwayPeriodMs: [4000, 6000],  // ... over 4-6 s
  cropBandEveryMs: 6000,           // a lighter band crosses a working farm in the wind direction
  smokeEveryMs: [2000, 3000],      // one puff every 2-3 s from kilns, the brewery and chimneys of Townhouses and up
  smokeRiseTiles: 1,
  rareEveryMs: [60000, 120000],    // a bird, a felucca, ducks: at most one of each on screen, each every 60-120 s
  rareKinds: ['bird', 'felucca', 'ducks'],
  maxChangeHz: 1,                  // nothing changes direction or brightness more than once a second
  budgetMs: 2,                     // a frame's ambient budget on a mid-range phone (the stress city)
  dropOrder: ['rare', 'smoke', 'sway'],   // over budget, drop these first, in this order; the water always stays
  idleFpsCap: 30,                  // paused, with no input for idleAfterMs: cap the frame rate
  idleAfterMs: 2000,
};
```


The buildings, the levels, the unlocks, desirability, the danger mood terms and the cards:

In `src/data/buildings.js`, replace:

```js
    needsRoad: true, produces: { good: 'jewellery', perMonth: 15 }, consumes: 'gems', producerReach: 12,
  },
};
```

with:

```js
    needsRoad: true, produces: { good: 'jewellery', perMonth: 15 }, consumes: 'gems', producerReach: 12,
  },
  // Stage 3 (spec 4.12, 4.13). The firehouse's reach is road tiles, as every service's; a tower's range and a barracks'
  // patrol are straight-line tiles (src/data/raids.js DEFENCE). Walls and gates are a tile layer (world.wall), never
  // buildings in world.buildings: their entries give the name, the cost per tile and the card; tile: true keeps them
  // out of place(). A gate is a wall drawn on a road, so it has no card of its own. Rubble is what a burned building
  // that is not a home leaves on each tile of its footprint: no card, no road, no upkeep, never burns.
  // buildable: false means no card, no milestone and no place().
  firehouse: {
    name: 'Firehouse', w: 1, d: 1, cost: 50, upkeep: 4, workers: 4, priority: 'safety', category: 'services',
    needsRoad: true, reach: 8,
  },
  tower: { name: 'Tower', w: 1, d: 1, cost: 150, upkeep: 8, workers: 4, priority: 'safety', category: 'defence', needsRoad: true },
  barracks: { name: 'Barracks', w: 2, d: 2, cost: 200, upkeep: 12, workers: 6, priority: 'safety', category: 'defence', needsRoad: true },
  wall: { name: 'Wall', w: 1, d: 1, cost: 8, upkeep: 0, workers: 0, category: 'defence', needsRoad: false, tile: true },
  gate: { name: 'Gate', w: 1, d: 1, cost: 20, upkeep: 0, workers: 0, category: null, needsRoad: false, tile: true, buildable: false },
  rubble: { name: 'Rubble', w: 1, d: 1, cost: 0, upkeep: 0, workers: 0, category: null, needsRoad: false, buildable: false },
};

// The types a player can build (a card, a milestone, place() or a drawing tool): every type but gate and rubble.
export const BUILDABLE = Object.keys(BUILDINGS).filter((t) => BUILDINGS[t].buildable !== false);
```


Replace the whole of `src/data/difficulty.js` with:

```js
// Difficulty (spec 4.18): chosen when a city starts and fixed for its life. cost multiplies building, road, wall,
// route, rubble-clearing and festival costs, and so tribute, which is priced from towers (never upkeep, wages or
// soldiers' pay: spec 4.11); risk multiplies fire risk build-up and raid size (never raid timing or the first raid's
// size); raids: false is Peaceful, whose city never starts a raid clock. Goals, workers and desirability are the
// same at every level. Each level's score factor lives with the score (src/data/scoring.js).
export const DIFFICULTIES = {
  peaceful: { cost: 0.8, risk: 0.5, raids: false },
  relaxed: { cost: 0.8, risk: 0.5, raids: true },
  normal: { cost: 1, risk: 1, raids: true },
  hard: { cost: 1.25, risk: 1.5, raids: true },
};

// The order the title card and the settings sheet list them in.
export const DIFFICULTY_ORDER = ['peaceful', 'relaxed', 'normal', 'hard'];
```


In `src/data/progression.js`, replace:

```js
// Milestones (spec 4.14) and the buildings each unlocks. Buildings of later stages (defences, quarry, brickworks,
// the builders' guild, monuments) are listed only when their stage ships. Byblos, the second trade partner, opens
// at Great city through src/data/trade.js.
export const MILESTONES = [
  { id: 'village', name: 'Village', population: 0, unlocks: ['house', 'well', 'farm_grain', 'granary', 'bazaar', 'temple', 'garden'] },
  { id: 'town', name: 'Town', population: 150, unlocks: ['farm_fig', 'clay_pit', 'potter', 'storehouse', 'booth', 'statue'] },
  { id: 'market_town', name: 'Market town', population: 250, unlocks: ['trading_post'] },
  { id: 'city', name: 'City', population: 400, unlocks: ['farm_barley', 'brewery'] },
  { id: 'great_city', name: 'Great city', population: 650, unlocks: ['farm_flax', 'weaver'] },
```

with:

```js
// Milestones (spec 4.14) and the buildings each unlocks. Buildings of later stages (quarry, brickworks, the builders'
// guild, monuments) are listed only when their stage ships. Byblos, the second trade partner, opens at Great city
// through src/data/trade.js. Stage 3: the firehouse comes with the Village (fire risk itself starts at Town), and the
// wall (whose gates are walls drawn on roads), tower and barracks with Market town, where the raid clock starts.
export const MILESTONES = [
  { id: 'village', name: 'Village', population: 0, unlocks: ['house', 'well', 'farm_grain', 'granary', 'bazaar', 'temple', 'garden', 'firehouse'] },
  { id: 'town', name: 'Town', population: 150, unlocks: ['farm_fig', 'clay_pit', 'potter', 'storehouse', 'booth', 'statue'] },
  { id: 'market_town', name: 'Market town', population: 250, unlocks: ['trading_post', 'wall', 'tower', 'barracks'] },
  { id: 'city', name: 'City', population: 400, unlocks: ['farm_barley', 'brewery'] },
  { id: 'great_city', name: 'Great city', population: 650, unlocks: ['farm_flax', 'weaver'] },
```


In `src/data/desirability.js`, replace:

```js
  gem_mine: [-8, -6, -4, -2],
  trading_post: [-3, -2, -1],
};
```

with:

```js
  gem_mine: [-8, -6, -4, -2],
  trading_post: [-3, -2, -1],
  // Stage 3 (spec 4.7). Rubble is 1x1, so each tile of a burned building's rubble counts on its own. Walls and gates
  // change nothing.
  firehouse: [-1],
  tower: [-2, -1],
  barracks: [-4, -2],
  rubble: [-3, -1],
  wall: [],
  gate: [],
};
```


In `src/data/mood.js`, replace:

```js
};
```

with:

```js
};

// The danger terms (spec 4.9), each its own row in the summary's mood breakdown. Fire's (src/sim/fire.js fireMood):
// a building reached the fire stage last month (a blaze put out in time does not count); each building burned down,
// houses included, in the last burnedDays. Raids' (src/sim/raids.js raidMood): for raidDays after a raid ends, by its
// outcome; a raid cancelled by tribute never happened. The festival's (src/sim/festival.js festivalMood): its bonus is
// FESTIVAL.mood for FESTIVAL.days (src/data/raids.js).
export const DANGER_MOOD = {
  fireLastMonth: -4,
  burnedEach: -2,
  burnedMax: -10,
  burnedDays: 180,
  raidBeaten: -3,
  raidLost: -8,
  raidDays: 180,
};
```


In `src/data/ui.js`, replace:

```js
  { id: 'food', items: ['farm_grain', 'farm_fig', 'granary'] },
  { id: 'industry', items: ['clay_pit', 'potter', 'farm_barley', 'brewery', 'farm_flax', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post'] },
  { id: 'services', items: ['well', 'bazaar', 'temple', 'booth'] },
  { id: 'defence', items: [] },
  { id: 'monuments', items: [] },
];
```

with:

```js
  { id: 'food', items: ['farm_grain', 'farm_fig', 'granary'] },
  { id: 'industry', items: ['clay_pit', 'potter', 'farm_barley', 'brewery', 'farm_flax', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post'] },
  { id: 'services', items: ['well', 'bazaar', 'temple', 'booth', 'firehouse'] },
  { id: 'defence', items: ['wall', 'tower', 'barracks'] },
  { id: 'monuments', items: [] },
];
```


The world, its migration and its validation:

In `src/sim/world.js`, replace:

```js
import { idx, footprint } from './grid.js';

export const WORLD_VERSION = 3;
export const HISTORY_MONTHS = 12;   // month-end rows kept for the Welcome back trends
```

with:

```js
import { idx, footprint } from './grid.js';

export const WORLD_VERSION = 4;
export const HISTORY_MONTHS = 12;   // month-end rows kept for the Welcome back trends
```

In `src/sim/world.js`, replace:

```js
export const newTradeState = () => ({ routes: {}, orders: {}, drift: {}, used: {}, year: 1 });

// difficulty is a DIFFICULTIES key (spec 4.18), fixed for the city's life; anything else starts a Normal city.
export function createWorld({ seed = 1, size = 64, map = null, difficulty = 'normal' } = {}) {
  const m = map || generateMap(seed, size);
  const n = m.size * m.size;
```

with:

```js
export const newTradeState = () => ({ routes: {}, orders: {}, drift: {}, used: {}, year: 1 });

// The raid state a city starts with (Stage 3, spec 4.13): no clock (clockDay is the day the city first had
// RAIDS.clockPeople people; it keeps running if people later fall), no raid warned yet (index counts warnings, so the
// next one's index), no warning up and no raid under way, full adaptation, no report. src/sim/raids.js owns the shapes
// of warning, active and last (see the Stage 3 plan's contract).
export const newRaidState = () => ({ clockDay: null, nextWarnDay: null, index: 0, warning: null, active: null, adaptation: 1, last: null });

// Danger the city remembers (Stage 3, spec 4.9, 4.12, 4.13, 4.19): the day of every building burned in the last
// 360 days (oldest first: mood looks back 180 days and Safety 360), the last day a building reached the fire stage,
// the day of the last festival, and whether the city has had its one first-time pause for a fire no firehouse reaches.
export const newDangerState = () => ({ burnDays: [], lastFireDay: null, festivalDay: null, firePaused: false });

// The tallies a city starts with. Stage 1-2's, then Stage 3's (spec 4.12, 4.13): fires started (blazes, by ignition,
// spread or a raid), blazes and fires put out, buildings burned, rubble tiles cleared, raids that arrived, raids beaten
// and lost, tributes paid, raiders stopped by towers and by soldiers, soldiers wounded, gold stolen, festivals held and
// wall tiles drawn.
export const STAGE3_TALLY = ['fires', 'blazesOut', 'firesOut', 'burned', 'rubbleCleared', 'raids', 'raidsBeaten', 'raidsLost', 'tributes',
  'raidersByTowers', 'raidersBySoldiers', 'soldiersWounded', 'goldStolen', 'festivals', 'wallTiles'];
export const newTally = () => ({
  harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0, made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0,
  ...Object.fromEntries(STAGE3_TALLY.map((k) => [k, 0])),
});

// difficulty is a DIFFICULTIES key (spec 4.18), fixed for the city's life; anything else starts a Normal city. cityId
// is the id the interface gives a new city for its records (spec 4.19: the sim never reads the clock); null until then.
export function createWorld({ seed = 1, size = 64, map = null, difficulty = 'normal', cityId = null } = {}) {
  const m = map || generateMap(seed, size);
  const n = m.size * m.size;
```

In `src/sim/world.js`, replace:

```js
    daily: null,                                        // today's daily goals: { date, picks, base, done, swapped }
    guide: { on: true, done: false },                   // the guided start: running, and whether it has finished
    // Running counts for firsts, achievements, daily goals and the summary; made: units produced, by good.
    tally: { harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0, made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0 },
    difficulty: Object.hasOwn(DIFFICULTIES, difficulty) ? difficulty : 'normal',
    trade: newTradeState(),                             // open routes, orders, price drift and quota used this year
    newItems: [],                                       // build items a milestone unlocked and nothing has placed yet ("New")
  };
  for (const [x, y] of m.startRoad) world.road[idx(world.size, x, y)] = 1;
```

with:

```js
    daily: null,                                        // today's daily goals: { date, picks, base, done, swapped }
    guide: { on: true, done: false },                   // the guided start: running, and whether it has finished
    // Running counts for firsts, achievements, daily goals, feats, the score and the summary; made: units produced, by good.
    tally: newTally(),
    difficulty: Object.hasOwn(DIFFICULTIES, difficulty) ? difficulty : 'normal',
    trade: newTradeState(),                             // open routes, orders, price drift and quota used this year
    newItems: [],                                       // build items a milestone unlocked and nothing has placed yet ("New")
    // Stage 3 (world version 4).
    wall: new Array(n).fill(0),                         // per tile: 0 none, > 0 a standing wall's hit points, -1 a breach (broken stone)
    wallVersion: 0,                                     // bumped whenever a wall tile appears, goes or breaks (path and bake caches)
    raid: newRaidState(),
    soldiers: [],                                       // every trained soldier: { id, barracks, x, y, hp, hit, task } (src/sim/combat.js)
    nextUnitId: 1,                                      // raiders and soldiers share one id sequence
    danger: newDangerState(),
    splits: {},                                         // milestone id -> the day the city first became it (spec 4.19)
    seals: [],                                          // { day, score, parts, version } per Seal this reign, oldest first
    feats: { earned: [], lost: [], counters: {} },      // feat ids earned and ruled out, and feats.js's running counts
    cityId: typeof cityId === 'string' && cityId ? cityId : null,
  };
  for (const [x, y] of m.startRoad) world.road[idx(world.size, x, y)] = 1;
```

In `src/sim/world.js`, replace:

```js
export function makeBuilding(world, type, x, y) {
  const def = BUILDINGS[type];
  const b = { id: world.nextId++, type, x, y, w: def.w, d: def.d, staff: 0, paused: false, store: {}, progress: 0, blocked: null };
  if (type === 'house') Object.assign(b, { tier: 0, residents: 0, stock: {}, met: {}, downTimer: 0, leftThisMonth: 0, stockedFor: 0 });
  if (type === 'storehouse') b.accepts = {};   // good -> false where the player refused it (setAccept, spec 4.10)
```

with:

```js
export function makeBuilding(world, type, x, y) {
  const def = BUILDINGS[type];
  // risk: fire risk points (spec 4.12); fire: null, or the blaze or fire burning in it (src/sim/fire.js).
  const b = { id: world.nextId++, type, x, y, w: def.w, d: def.d, staff: 0, paused: false, store: {}, progress: 0, blocked: null, risk: 0, fire: null };
  if (type === 'house') Object.assign(b, { tier: 0, residents: 0, stock: {}, met: {}, downTimer: 0, leftThisMonth: 0, stockedFor: 0 });
  if (type === 'storehouse') b.accepts = {};   // good -> false where the player refused it (setAccept, spec 4.10)
```


In `src/save/migrate.js`, replace:

```js
import { WORLD_VERSION, newTradeState } from '../sim/world.js';

export const CURRENT_VERSION = WORLD_VERSION;
```

with:

```js
import { WORLD_VERSION, newTradeState, newRaidState, newDangerState, STAGE3_TALLY } from '../sim/world.js';
import { MILESTONES } from '../data/progression.js';
import { RAIDS } from '../data/raids.js';

export const CURRENT_VERSION = WORLD_VERSION;
```

In `src/save/migrate.js`, replace:

```js
}

// Each entry upgrades a world from version N to N + 1. Add one whenever WORLD_VERSION goes up.
export const MIGRATIONS = { 1: v1ToV2, 2: v2ToV3 };

// table and target are parameters so tests can drive a synthetic chain; production calls use the defaults.
```

with:

```js
}

// The Stage 3 build items a city of this milestone has already unlocked (spec 4.14: a city saved before Stage 3 gets
// "New" badges for the firehouse, and for the defences if it is already a Market town), in the milestones' order.
function stage3Unlocked(milestone) {
  const reached = MILESTONES.findIndex((m) => m.id === milestone);
  const out = [];
  for (let i = 0; i <= reached; i++) for (const t of MILESTONES[i].unlocks) if (['firehouse', 'wall', 'tower', 'barracks'].includes(t)) out.push(t);
  return out;
}

// v3 -> v4 (Stage 3). Every building gets no fire risk and no fire; the city gets no walls, no soldiers, no seals, no
// splits (the days it became each milestone before Stage 3 are unknown), no feats and no city id (the interface gives
// it one at load), and the Stage 3 tallies start at zero. A city that already had the raid clock's people (its peak or
// its people now: a Stage 2 city never Peaceful) starts the clock on the day it is loaded (spec 4.13, ruling 94), so
// its first warning comes two game-years later and no raid lands at once. Already-unlocked Stage 3 build items join
// newItems. Every other field is kept as it was. A malformed save is left for validateWorld to report.
function v3ToV4(w) {
  const tally = w.tally !== null && typeof w.tally === 'object' && !Array.isArray(w.tally) ? w.tally : {};
  const buildings = {};
  if (w.buildings && typeof w.buildings === 'object') {
    for (const [id, b] of Object.entries(w.buildings)) buildings[id] = b && typeof b === 'object' ? { ...b, risk: 0, fire: null } : b;
  }
  const raid = newRaidState();
  const peak = Math.max(Number.isFinite(tally.peakPeople) ? tally.peakPeople : 0, peopleIn(w));
  if (peak >= RAIDS.clockPeople && Number.isInteger(w.day)) { raid.clockDay = w.day; raid.nextWarnDay = w.day + RAIDS.firstWarnAfter; }
  const items = Array.isArray(w.newItems) ? w.newItems.slice() : w.newItems;
  if (Array.isArray(items)) for (const t of stage3Unlocked(w.milestone)) if (!items.includes(t)) items.push(t);
  const cells = Number.isInteger(w.size) && w.size > 0 ? w.size * w.size : 0;
  return {
    ...w,
    version: 4,
    buildings,
    newItems: items,
    tally: { ...tally, ...Object.fromEntries(STAGE3_TALLY.map((k) => [k, 0])) },
    wall: new Array(cells).fill(0),
    wallVersion: 0,
    raid,
    soldiers: [],
    nextUnitId: 1,
    danger: newDangerState(),
    splits: {},
    seals: [],
    feats: { earned: [], lost: [], counters: {} },
    cityId: null,
  };
}

// Each entry upgrades a world from version N to N + 1. Add one whenever WORLD_VERSION goes up.
export const MIGRATIONS = { 1: v1ToV2, 2: v2ToV3, 3: v3ToV4 };

// table and target are parameters so tests can drive a synthetic chain; production calls use the defaults.
```


In `src/save/serialize.js`, replace:

```js
import { BUILDINGS } from '../data/buildings.js';
import { DIFFICULTIES } from '../data/difficulty.js';

// Every top-level field createWorld produces (src/sim/world.js).
```

with:

```js
import { BUILDINGS } from '../data/buildings.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { STAGE3_TALLY } from '../sim/world.js';

// Every top-level field createWorld produces (src/sim/world.js).
```

In `src/save/serialize.js`, replace:

```js
  'firsts', 'achievements', 'daily', 'guide', 'tally',
  'difficulty', 'trade', 'newItems',
];

const TALLY_KEYS = ['harvested', 'profitMonths', 'peakPeople', 'upgrades', 'dailyDone', 'sold', 'bought', 'tradeIncome', 'caravans'];
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isCounts = (v) => isRecord(v) && Object.values(v).every(Number.isFinite);       // tally.made: good -> units
```

with:

```js
  'firsts', 'achievements', 'daily', 'guide', 'tally',
  'difficulty', 'trade', 'newItems',
  'wall', 'wallVersion', 'raid', 'soldiers', 'nextUnitId', 'danger', 'splits', 'seals', 'feats', 'cityId',
];

export const TALLY_KEYS = ['harvested', 'profitMonths', 'peakPeople', 'upgrades', 'dailyDone', 'sold', 'bought', 'tradeIncome', 'caravans', ...STAGE3_TALLY];
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isCounts = (v) => isRecord(v) && Object.values(v).every(Number.isFinite);       // tally.made: good -> units
```

In `src/save/serialize.js`, replace:

```js
const isDaily = (d) => d === null || (isRecord(d) && typeof d.date === 'string' && Array.isArray(d.picks)
  && Array.isArray(d.done) && isRecord(d.base) && typeof d.swapped === 'boolean');

// The save envelope (spec 4.17): wall-clock fields sit beside the world, never inside it.
```

with:

```js
const isDaily = (d) => d === null || (isRecord(d) && typeof d.date === 'string' && Array.isArray(d.picks)
  && Array.isArray(d.done) && isRecord(d.base) && typeof d.swapped === 'boolean');
// Stage 3 (version 4): the shapes the save must have; what each record holds inside is its module's business.
const isDay = (v) => v === null || Number.isInteger(v);
const isFire = (f) => f === null || (isRecord(f) && (f.stage === 'blaze' || f.stage === 'fire'));
const isRaid = (r) => isRecord(r) && isDay(r.clockDay) && isDay(r.nextWarnDay) && Number.isInteger(r.index) && r.index >= 0
  && (r.warning === null || isRecord(r.warning)) && (r.active === null || isRecord(r.active)) && (r.last === null || isRecord(r.last))
  && Number.isFinite(r.adaptation);
const isDanger = (d) => isRecord(d) && Array.isArray(d.burnDays) && d.burnDays.every(Number.isInteger) && isDay(d.lastFireDay)
  && isDay(d.festivalDay) && typeof d.firePaused === 'boolean';
const isFeats = (f) => isRecord(f) && isStrings(f.earned) && isStrings(f.lost) && isCounts(f.counters);

// The save envelope (spec 4.17): wall-clock fields sit beside the world, never inside it.
```

In `src/save/serialize.js`, replace:

```js
  if (typeof w.difficulty !== 'string' || !Object.hasOwn(DIFFICULTIES, w.difficulty)) return false;
  if (!isTrade(w.trade) || !isStrings(w.newItems)) return false;
  return true;
}
```

with:

```js
  if (typeof w.difficulty !== 'string' || !Object.hasOwn(DIFFICULTIES, w.difficulty)) return false;
  if (!isTrade(w.trade) || !isStrings(w.newItems)) return false;
  for (const b of Object.values(w.buildings)) if (!Number.isFinite(b.risk) || !isFire(b.fire)) return false;
  if (!Array.isArray(w.wall) || w.wall.length !== cells || !w.wall.every((v) => Number.isInteger(v) && v >= -1)) return false;
  if (!Number.isInteger(w.wallVersion) || !Number.isInteger(w.nextUnitId) || w.nextUnitId < 1) return false;
  if (!isRaid(w.raid) || !Array.isArray(w.soldiers) || !w.soldiers.every(isRecord) || !isDanger(w.danger)) return false;
  if (!isRecord(w.splits) || !Object.values(w.splits).every(Number.isInteger) || !Array.isArray(w.seals) || !w.seals.every(isRecord)) return false;
  if (!isFeats(w.feats) || !(w.cityId === null || (typeof w.cityId === 'string' && w.cityId.length > 0))) return false;
  return true;
}
```


Costs and the placing rule for tile types:

Replace the whole of `src/sim/costs.js` with:

```js
// What things cost in this city (spec 4.11, 4.18): the data's base cost times the city's difficulty, rounded to
// whole gold and never below 1. Every command, preview and card reads costs through here, so a Hard city's well
// costs the same on its card, in the confirm bar, in the treasury and in its undo. Trade routes too, and from Stage 3
// wall and gate tiles (costOf(world, 'wall'), costOf(world, 'gate')), rubble clearing and festivals. Tribute is
// priced from the tower's cost here (src/sim/raids.js tributeQuote).
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { PARTNERS } from '../data/trade.js';
import { FIRE } from '../data/fire.js';
import { FESTIVAL, DEFENCE } from '../data/raids.js';

const scaled = (world, base) => Math.max(1, Math.round(base * DIFFICULTIES[world.difficulty].cost));

export const costOf = (world, type) => scaled(world, BUILDINGS[type].cost);

export const roadCostOf = (world) => scaled(world, ECONOMY.roadCost);

export const routeCostOf = (world, partnerId) => scaled(world, PARTNERS[partnerId].routeCost);

// Clearing one rubble tile (spec 4.12): 5 gold times the difficulty's cost, rounded per tile.
export const rubbleCostOf = (world) => scaled(world, FIRE.rubbleCost);

// Holding a festival (spec 4.13): 200 gold times the difficulty's cost.
export const festivalCostOf = (world) => scaled(world, FESTIVAL.cost);

// The difficulty's risk multiplier (spec 4.18): fire risk build-up and raid size. Never raid timing, the first raid's
// size, upkeep or wages.
export const riskOf = (world) => DIFFICULTIES[world.difficulty].risk;

// Whether this city has raids at all: every level but Peaceful (spec 4.18).
export const raidsOn = (world) => DIFFICULTIES[world.difficulty].raids !== false;

// Soldiers' pay for a month (spec 4.11): per soldier, in peace too and from a paused barracks; never scaled.
export const soldiersPayOf = (world) => world.soldiers.length * DEFENCE.soldierPay;
```


In `src/sim/commands.js`, replace:

```js
export function checkTiles(world, type, x, y) {
  const def = BUILDINGS[type];
  if (!def) return 'unknown';
  if (!isUnlocked(world, type)) return 'locked';
  // A fractional tile would index between cells and leave ghost entries in occ and the save.
  if (!isTile(x, y)) return 'out_of_bounds';
```

with:

```js
export function checkTiles(world, type, x, y) {
  const def = BUILDINGS[type];
  if (!def || def.buildable === false) return 'unknown';   // rubble (and a gate) is never built
  if (!isUnlocked(world, type)) return 'locked';
  if (def.tile) return 'unknown';                          // walls are drawn as a line (drawWall, src/sim/defence.js), not placed
  // A fractional tile would index between cells and leave ghost entries in occ and the save.
  if (!isTile(x, y)) return 'out_of_bounds';
```


The placeholder art (Track C replaces the drawings, keeping the slot names) and its registration:

Create `src/render/art/defence.js`:

```js
// Stage 3 art slots (spec 5.4): the firehouse, rubble, the tower, the barracks, and the wall and gate pieces. These are
// the Stage 3 contract's PLACEHOLDERS: plain blocks with the right footprint and an emblem stripe, so every card, sprite
// and thumbnail exists before the art lands. Track C replaces each drawing with the real one (and may move the
// firehouse and rubble into services.js), keeping the slot names: firehouse, rubble, tower, barracks, wall, gate.
// Walls are a tile layer (world.wall); the 'wall' and 'gate' slots are what their cards and thumbnails show, and Track C
// decides how the map draws the layer itself.
import { box, qd, p } from './primitives.js';
import { WASH, STONE, MUD2, ROCK, RED, BLUE, TEAL } from './palette.js';
import { boundsFor } from '../iso.js';

function block(g, x, y, w, d, h, faces, stripe) {
  const F = box(g, x, y, w, d, h, 0, faces);
  if (stripe) qd(g, F.L, 0.15, 0.85, h - 3, h - 1, stripe);
  return F;
}

export const firehouse = (g, x, y) => block(g, x + 0.15, y + 0.15, 0.7, 0.7, 12, WASH, RED);
export const tower = (g, x, y) => block(g, x + 0.2, y + 0.2, 0.6, 0.6, 22, STONE, BLUE);
export const barracks = (g, x, y) => block(g, x + 0.2, y + 0.2, 1.6, 1.6, 10, MUD2, TEAL);
export const wall = (g, x, y) => block(g, x + 0.05, y + 0.3, 0.9, 0.4, 7, MUD2, null);
export const gate = (g, x, y) => { block(g, x + 0.05, y + 0.3, 0.25, 0.4, 9, MUD2, null); block(g, x + 0.7, y + 0.3, 0.25, 0.4, 9, MUD2, null); };
export function rubble(g, x, y) {
  for (const [u, v, s] of [[0.2, 0.25, 0.3], [0.55, 0.2, 0.25], [0.35, 0.55, 0.35], [0.65, 0.6, 0.2]]) block(g, x + u, y + v, s, s, 2.5, ROCK, null);
  g.circ(p(x + 0.5, y + 0.5), 0.8, MUD2[2]);
}

export const DEFENCE_ART = {
  firehouse: { w: 1, d: 1, height: 12, bounds: boundsFor(1, 1, 12), shadows: [[0.15, 0.15, 0.7, 0.7, 12]], draw: firehouse },
  tower: { w: 1, d: 1, height: 22, bounds: boundsFor(1, 1, 22), shadows: [[0.2, 0.2, 0.6, 0.6, 22]], draw: tower },
  barracks: { w: 2, d: 2, height: 10, bounds: boundsFor(2, 2, 10), shadows: [[0.2, 0.2, 1.6, 1.6, 10]], draw: barracks },
  wall: { w: 1, d: 1, height: 7, bounds: boundsFor(1, 1, 7), shadows: [], draw: wall },
  gate: { w: 1, d: 1, height: 9, bounds: boundsFor(1, 1, 9), shadows: [], draw: gate },
  rubble: { w: 1, d: 1, height: 3, bounds: boundsFor(1, 1, 3), shadows: [], draw: rubble },
};
```


In `src/render/art/registry.js`, replace:

```js
import { NATURE_ART } from './nature.js';
import { FIGURE_ART } from './figures.js';
import { granaryStage, storehouseStage, bazaarStage, farmStage, FARM_TYPES } from './stages.js';

export { boundsFor } from '../iso.js';

export const ART = { ...HOUSE_ART, ...SERVICE_ART, ...INDUSTRY_ART, ...NATURE_ART, ...FIGURE_ART };

// The art slot a building shows: houses by tier, granaries, storehouses and bazaars by how full they are
```

with:

```js
import { NATURE_ART } from './nature.js';
import { FIGURE_ART } from './figures.js';
import { DEFENCE_ART } from './defence.js';
import { granaryStage, storehouseStage, bazaarStage, farmStage, FARM_TYPES } from './stages.js';

export { boundsFor } from '../iso.js';

export const ART = { ...HOUSE_ART, ...SERVICE_ART, ...INDUSTRY_ART, ...NATURE_ART, ...FIGURE_ART, ...DEFENCE_ART };

// The art slot a building shows: houses by tier, granaries, storehouses and bazaars by how full they are
```


Track 0's section of `src/ui/text.js`, at the very end of the file (Task 0.3 adds the other tracks' sections after it):

In `src/ui/text.js`, replace:

```js
export const TREND_MARKS = { up: '▲', down: '▼' };
```

with:

```js
export const TREND_MARKS = { up: '▲', down: '▼' };

// ── s3 contract (Track 0) ────────────────────────────────────────────────────────────────────────────────────────
// Words for the Stage 3 contract's own additions. Each Stage 3 track keeps its words in its own section below, as its
// own exported objects (FIRE_TEXT, RAID_TEXT, ...), and adds to the shared tables above (FIRST_TEXT, MOOD_NAMES,
// REASONS, CHAPTER_NAMES, T, ...) only with Object.assign inside its own section, so no two tracks edit the same lines.
Object.assign(DIFFICULTY_NAMES, { peaceful: 'Peaceful' });
// ── end s3 contract ──────────────────────────────────────────────────────────────────────────────────────────────
```


- [ ] **Step 4: Run the tests to see them pass**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "s3 contract" -WaitSeconds 120
```

Expected: `26 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

Peaceful is a fourth level (every per-level list gains a first entry equal to Relaxed's); the firehouse is a Village card and the Defence category has three cards from Town (locked until Market town); gates and rubble have no card, no milestone and no price; the save is version 4. Each change below keeps the test's meaning.

In `tests/data/data.test.js`, replace:

```js
      expect(b.w).toBeGreaterThanOrEqual(1);
      expect(b.d).toBeGreaterThanOrEqual(1);
      expect(b.cost).toBeGreaterThan(0);
      if (b.workers > 0) expect(PRIORITY_LEVELS).toContain(b.priority);
    }
```

with:

```js
      expect(b.w).toBeGreaterThanOrEqual(1);
      expect(b.d).toBeGreaterThanOrEqual(1);
      if (b.buildable === false) expect([type, b.cost >= 0]).toEqual([type, true]);   // rubble costs nothing; a gate is priced per tile
      else expect([type, b.cost > 0]).toEqual([type, true]);
      if (b.workers > 0) expect(PRIORITY_LEVELS).toContain(b.priority);
    }
```


In `tests/data/economyData.test.js`, replace:

```js
import { describe, it, expect } from '../harness.js';
import { GOODS, FOOD_GOODS, HOUSEHOLD_GOODS, RAW_GOODS } from '../../src/data/goods.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { TIERS, MAX_TIER } from '../../src/data/housing.js';
import { MILESTONES } from '../../src/data/progression.js';
```

with:

```js
import { describe, it, expect } from '../harness.js';
import { GOODS, FOOD_GOODS, HOUSEHOLD_GOODS, RAW_GOODS } from '../../src/data/goods.js';
import { BUILDINGS, BUILDABLE } from '../../src/data/buildings.js';
import { TIERS, MAX_TIER } from '../../src/data/housing.js';
import { MILESTONES } from '../../src/data/progression.js';
```

In `tests/data/economyData.test.js`, replace:

```js
    ]);
    expect(Object.fromEntries(MILESTONES.map((m) => [m.id, m.unlocks]))).toEqual({
      village: ['house', 'well', 'farm_grain', 'granary', 'bazaar', 'temple', 'garden'],
      town: ['farm_fig', 'clay_pit', 'potter', 'storehouse', 'booth', 'statue'],
      market_town: ['trading_post'],
      city: ['farm_barley', 'brewery'],
      great_city: ['farm_flax', 'weaver'],
```

with:

```js
    ]);
    expect(Object.fromEntries(MILESTONES.map((m) => [m.id, m.unlocks]))).toEqual({
      village: ['house', 'well', 'farm_grain', 'granary', 'bazaar', 'temple', 'garden', 'firehouse'],
      town: ['farm_fig', 'clay_pit', 'potter', 'storehouse', 'booth', 'statue'],
      market_town: ['trading_post', 'wall', 'tower', 'barracks'],
      city: ['farm_barley', 'brewery'],
      great_city: ['farm_flax', 'weaver'],
```

In `tests/data/economyData.test.js`, replace:

```js
  it('unlocks every building exactly once, and nothing that does not exist', () => {
    const all = MILESTONES.flatMap((m) => m.unlocks);
    expect([...all].sort()).toEqual(Object.keys(BUILDINGS).sort());
  });
  it('unlocks each workshop no earlier than its raw good and the stores both need', () => {
```

with:

```js
  it('unlocks every building exactly once, and nothing that does not exist', () => {
    const all = MILESTONES.flatMap((m) => m.unlocks);
    expect([...all].sort()).toEqual(BUILDABLE.slice().sort());                       // gates and rubble are never unlocked: no card
  });
  it('unlocks each workshop no earlier than its raw good and the stores both need', () => {
```

In `tests/data/economyData.test.js`, replace:

```js
      clay_pit: [-6, -5, -4, -3, -2, -1], potter: [-4, -3, -2, -1], brewery: [-4, -3, -2, -1], weaver: [-4, -3, -2, -1],
      jeweller: [-4, -3, -2, -1], gem_mine: [-8, -6, -4, -2], trading_post: [-3, -2, -1],
    });
  });
```

with:

```js
      clay_pit: [-6, -5, -4, -3, -2, -1], potter: [-4, -3, -2, -1], brewery: [-4, -3, -2, -1], weaver: [-4, -3, -2, -1],
      jeweller: [-4, -3, -2, -1], gem_mine: [-8, -6, -4, -2], trading_post: [-3, -2, -1],
      firehouse: [-1], tower: [-2, -1], barracks: [-4, -2], rubble: [-3, -1], wall: [], gate: [],
    });
  });
```


In `tests/sim/worldV3.test.js`, replace:

```js
import { describe, it, expect } from '../harness.js';
import { createWorld, WORLD_VERSION } from '../../src/sim/world.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../src/data/difficulty.js';

describe('world v3', () => {
  it('creates a version 3 world with a difficulty, no trade, no new items and the new tallies at zero', () => {
    const w = createWorld({ seed: 4 });
    expect(WORLD_VERSION).toBe(3);
    expect(w.version).toBe(3);
    expect(w.difficulty).toBe('normal');
    expect(w.trade).toEqual({ routes: {}, orders: {}, drift: {}, used: {}, year: 1 });
    expect(w.newItems).toEqual([]);
    expect(w.tally).toEqual({
      harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0,
      made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0,
```

with:

```js
import { describe, it, expect } from '../harness.js';
import { createWorld, STAGE3_TALLY } from '../../src/sim/world.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../src/data/difficulty.js';

describe('world v3', () => {
  it('creates a world with a difficulty, no trade, no new items and the new tallies at zero', () => {
    const w = createWorld({ seed: 4 });
    expect(w.difficulty).toBe('normal');
    expect(w.trade).toEqual({ routes: {}, orders: {}, drift: {}, used: {}, year: 1 });
    expect(w.newItems).toEqual([]);
    const stage2 = Object.fromEntries(Object.entries(w.tally).filter(([k]) => !STAGE3_TALLY.includes(k)));   // Stage 3's: tests/sim/worldV4.test.js
    expect(stage2).toEqual({
      harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0,
      made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0,
```

In `tests/sim/worldV3.test.js`, replace:

```js

describe('data difficulty', () => {
  it('lists Relaxed, Normal and Hard with the spec 4.18 multipliers', () => {
    expect(DIFFICULTY_ORDER).toEqual(['relaxed', 'normal', 'hard']);
    expect(Object.keys(DIFFICULTIES).sort()).toEqual([...DIFFICULTY_ORDER].sort());
    expect(DIFFICULTIES).toEqual({ relaxed: { cost: 0.8, risk: 0.5 }, normal: { cost: 1, risk: 1 }, hard: { cost: 1.25, risk: 1.5 } });
  });
});
```

with:

```js

describe('data difficulty', () => {
  it('lists Peaceful, Relaxed, Normal and Hard with the spec 4.18 multipliers, and raids on all but Peaceful', () => {
    expect(DIFFICULTY_ORDER).toEqual(['peaceful', 'relaxed', 'normal', 'hard']);
    expect(Object.keys(DIFFICULTIES).sort()).toEqual([...DIFFICULTY_ORDER].sort());
    expect(DIFFICULTIES).toEqual({
      peaceful: { cost: 0.8, risk: 0.5, raids: false }, relaxed: { cost: 0.8, risk: 0.5, raids: true },
      normal: { cost: 1, risk: 1, raids: true }, hard: { cost: 1.25, risk: 1.5, raids: true },
    });
  });
});
```


In `tests/sim/costs.test.js`, replace:

```js
import { describe, it, expect } from '../harness.js';
import { costOf, roadCostOf } from '../../src/sim/costs.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { ECONOMY } from '../../src/data/economy.js';
import { DIFFICULTY_ORDER } from '../../src/data/difficulty.js';
```

with:

```js
import { describe, it, expect } from '../harness.js';
import { costOf, roadCostOf } from '../../src/sim/costs.js';
import { BUILDINGS, BUILDABLE } from '../../src/data/buildings.js';
import { ECONOMY } from '../../src/data/economy.js';
import { DIFFICULTY_ORDER } from '../../src/data/difficulty.js';
```

In `tests/sim/costs.test.js`, replace:

```js
describe('costs', () => {
  it('scales building costs by the difficulty, rounded to whole gold', () => {
    expect(byLevel((w) => costOf(w, 'well'))).toEqual([24, 30, 38]);         // 37.5 rounds up
    expect(byLevel((w) => costOf(w, 'temple'))).toEqual([96, 120, 150]);
    expect(byLevel((w) => costOf(w, 'granary'))).toEqual([64, 80, 100]);
    expect(byLevel((w) => costOf(w, 'house'))).toEqual([4, 5, 6]);           // 6.25 rounds down
  });
  it('leaves every Normal cost exactly as the data says', () => {
    const w = cityAt('normal');
    for (const type of Object.keys(BUILDINGS)) expect([type, costOf(w, type)]).toEqual([type, BUILDINGS[type].cost]);
    expect(roadCostOf(w)).toBe(ECONOMY.roadCost);
  });
  it('scales road tiles too, and never charges less than 1 gold', () => {
    expect(byLevel((w) => roadCostOf(w))).toEqual([2, 2, 3]);                 // 1.6 rounds to 2, 2.5 to 3
    const saved = BUILDINGS.house.cost;
    BUILDINGS.house.cost = 0.4;                                                // 0.32, 0.4 and 0.5 would round to 0, 0 and 1
    try {
      expect(byLevel((w) => costOf(w, 'house'))).toEqual([1, 1, 1]);
    } finally { BUILDINGS.house.cost = saved; }
  });
```

with:

```js
describe('costs', () => {
  it('scales building costs by the difficulty, rounded to whole gold', () => {
    expect(byLevel((w) => costOf(w, 'well'))).toEqual([24, 24, 30, 38]);     // Peaceful costs what Relaxed does         // 37.5 rounds up
    expect(byLevel((w) => costOf(w, 'temple'))).toEqual([96, 96, 120, 150]);
    expect(byLevel((w) => costOf(w, 'granary'))).toEqual([64, 64, 80, 100]);
    expect(byLevel((w) => costOf(w, 'house'))).toEqual([4, 4, 5, 6]);           // 6.25 rounds down
  });
  it('leaves every Normal cost exactly as the data says', () => {
    const w = cityAt('normal');
    for (const type of BUILDABLE) expect([type, costOf(w, type)]).toEqual([type, BUILDINGS[type].cost]);   // rubble is cleared, never bought
    expect(roadCostOf(w)).toBe(ECONOMY.roadCost);
  });
  it('scales road tiles too, and never charges less than 1 gold', () => {
    expect(byLevel((w) => roadCostOf(w))).toEqual([2, 2, 2, 3]);                 // 1.6 rounds to 2, 2.5 to 3
    const saved = BUILDINGS.house.cost;
    BUILDINGS.house.cost = 0.4;                                                // 0.32, 0.4 and 0.5 would round to 0, 0 and 1
    try {
      expect(byLevel((w) => costOf(w, 'house'))).toEqual([1, 1, 1, 1]);
    } finally { BUILDINGS.house.cost = saved; }
  });
```

In `tests/sim/costs.test.js`, replace:

```js
      return expected;
    });
    expect(refunds).toEqual([24, 30, 37]);                                     // 37.5 rounds down
    const w = cityAt('hard');
    place(w, 'house', 20, 20);
```

with:

```js
      return expected;
    });
    expect(refunds).toEqual([24, 24, 30, 37]);                                     // 37.5 rounds down
    const w = cityAt('hard');
    place(w, 'house', 20, 20);
```


In `tests/sim/economyUnlocks.test.js`, replace:

```js
  it('prices a trade route by the city’s difficulty', () => {
    const byLevel = (id) => DIFFICULTY_ORDER.map((d) => { const w = street(); w.difficulty = d; return routeCostOf(w, id); });
    expect(byLevel('memphis')).toEqual([240, 300, 375]);
    expect(byLevel('byblos')).toEqual([480, 600, 750]);
  });
});
```

with:

```js
  it('prices a trade route by the city’s difficulty', () => {
    const byLevel = (id) => DIFFICULTY_ORDER.map((d) => { const w = street(); w.difficulty = d; return routeCostOf(w, id); });
    expect(byLevel('memphis')).toEqual([240, 240, 300, 375]);
    expect(byLevel('byblos')).toEqual([480, 480, 600, 750]);
  });
});
```


In `tests/save/store.test.js`, replace:

```js
    try { migrate({ version: 2 }, table, 3); } catch (e) { msg = e.message; }
    expect(msg).toBe('bad_migration_2');
    expect(CURRENT_VERSION).toBe(3);
  });
});
```

with:

```js
    try { migrate({ version: 2 }, table, 3); } catch (e) { msg = e.message; }
    expect(msg).toBe('bad_migration_2');
    expect(CURRENT_VERSION).toBe(4);
  });
});
```


In `tests/save/migrateV2.test.js`, replace:

```js
const NEW_KEYS = ['firsts', 'achievements', 'daily', 'guide', 'tally'];
const V3_KEYS = ['difficulty', 'trade', 'newItems'];   // version 3's fields (tests/save/migrateV3.test.js)
const code = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };
```

with:

```js
const NEW_KEYS = ['firsts', 'achievements', 'daily', 'guide', 'tally'];
const V3_KEYS = ['difficulty', 'trade', 'newItems'];   // version 3's fields (tests/save/migrateV3.test.js)
const V4_KEYS = ['wall', 'wallVersion', 'raid', 'soldiers', 'nextUnitId', 'danger', 'splits', 'seals', 'feats', 'cityId'];   // version 4's (migrateV4.test.js)
const code = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };
```

In `tests/save/migrateV2.test.js`, replace:

```js
  advanceDays(w, 75);
  const v1 = JSON.parse(serialize(w));
  for (const k of [...NEW_KEYS, ...V3_KEYS]) delete v1[k];
  v1.goals = { completed: v1.goals.completed.slice() };
  v1.version = 1;
```

with:

```js
  advanceDays(w, 75);
  const v1 = JSON.parse(serialize(w));
  for (const k of [...NEW_KEYS, ...V3_KEYS, ...V4_KEYS]) delete v1[k];
  for (const b of Object.values(v1.buildings)) { delete b.risk; delete b.fire; }
  v1.goals = { completed: v1.goals.completed.slice() };
  v1.version = 1;
```

In `tests/save/migrateV2.test.js`, replace:

```js
    expect(v2.goals.completed === v1.goals.completed).toBe(false); // a copy, not the same array
    for (const k of Object.keys(v1)) if (k !== 'version' && k !== 'goals') expect([k, v2[k]]).toEqual([k, v1[k]]);
    expect(Object.keys(v2).sort()).toEqual(REQUIRED.filter((k) => !V3_KEYS.includes(k)).sort());
    expect(validateWorld(MIGRATIONS[2](v2))).toBe(true);                    // valid once version 3 adds its fields
  });
  it('runs through migrate, deserialize and unpackSave', () => {
    const v1 = v1City();
    expect(CURRENT_VERSION).toBe(3);
    expect(migrate(v1)).toEqual(MIGRATIONS[2](MIGRATIONS[1](v1)));
    expect(deserialize(JSON.stringify(v1)).version).toBe(3);
    const back = unpackSave(JSON.stringify({ version: 1, savedAt: 1760000000000, lastSpeed: 2, world: v1 }));
    expect(back.savedAt).toBe(1760000000000);
    expect(back.lastSpeed).toBe(2);
    expect(back.world.version).toBe(3);
    expect(back.world.guide.on).toBe(false);
    expect(back.world.tally.peakPeople).toBe(population(v1));
    expect(back.world.buildings).toEqual(v1.buildings);
  });
  it('reports a malformed version 1 save as corrupt, not as a failed migration', () => {
```

with:

```js
    expect(v2.goals.completed === v1.goals.completed).toBe(false); // a copy, not the same array
    for (const k of Object.keys(v1)) if (k !== 'version' && k !== 'goals') expect([k, v2[k]]).toEqual([k, v1[k]]);
    expect(Object.keys(v2).sort()).toEqual(REQUIRED.filter((k) => !V3_KEYS.includes(k) && !V4_KEYS.includes(k)).sort());
    expect(validateWorld(MIGRATIONS[3](MIGRATIONS[2](v2)))).toBe(true);     // valid once versions 3 and 4 add their fields
  });
  it('runs through migrate, deserialize and unpackSave', () => {
    const v1 = v1City();
    expect(CURRENT_VERSION).toBe(4);
    expect(migrate(v1)).toEqual(MIGRATIONS[3](MIGRATIONS[2](MIGRATIONS[1](v1))));
    expect(deserialize(JSON.stringify(v1)).version).toBe(4);
    const back = unpackSave(JSON.stringify({ version: 1, savedAt: 1760000000000, lastSpeed: 2, world: v1 }));
    expect(back.savedAt).toBe(1760000000000);
    expect(back.lastSpeed).toBe(2);
    expect(back.world.version).toBe(4);
    expect(back.world.guide.on).toBe(false);
    expect(back.world.tally.peakPeople).toBe(population(v1));
    expect(Object.keys(back.world.buildings)).toEqual(Object.keys(v1.buildings));
    for (const [id, b] of Object.entries(v1.buildings)) expect(back.world.buildings[id]).toEqual({ ...b, risk: 0, fire: null });   // version 4: no risk, no fire
  });
  it('reports a malformed version 1 save as corrupt, not as a failed migration', () => {
```


In `tests/save/migrateV3.test.js`, replace:

```js
import { migrate, MIGRATIONS, CURRENT_VERSION } from '../../src/save/migrate.js';
import { serialize, deserialize, validateWorld, unpackSave, REQUIRED } from '../../src/save/serialize.js';
import { createWorld, population } from '../../src/sim/world.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
```

with:

```js
import { migrate, MIGRATIONS, CURRENT_VERSION } from '../../src/save/migrate.js';
import { serialize, deserialize, validateWorld, unpackSave, REQUIRED } from '../../src/save/serialize.js';
import { createWorld, population, STAGE3_TALLY } from '../../src/sim/world.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
```

In `tests/save/migrateV3.test.js`, replace:

```js
const V3_KEYS = ['difficulty', 'trade', 'newItems'];
const V3_TALLY = ['made', 'sold', 'bought', 'tradeIncome', 'caravans'];
const code = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };
```

with:

```js
const V3_KEYS = ['difficulty', 'trade', 'newItems'];
const V3_TALLY = ['made', 'sold', 'bought', 'tradeIncome', 'caravans'];
const V4_KEYS = ['wall', 'wallVersion', 'raid', 'soldiers', 'nextUnitId', 'danger', 'splits', 'seals', 'feats', 'cityId'];   // version 4's (migrateV4.test.js)
const code = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };
```

In `tests/save/migrateV3.test.js`, replace:

```js
  advanceDays(w, 75);
  const v2 = JSON.parse(serialize(w));
  for (const k of V3_KEYS) delete v2[k];
  for (const k of V3_TALLY) delete v2.tally[k];
  v2.version = 2;
  return v2;
```

with:

```js
  advanceDays(w, 75);
  const v2 = JSON.parse(serialize(w));
  for (const k of [...V3_KEYS, ...V4_KEYS]) delete v2[k];
  for (const k of [...V3_TALLY, ...STAGE3_TALLY]) delete v2.tally[k];
  for (const b of Object.values(v2.buildings)) { delete b.risk; delete b.fire; }
  v2.version = 2;
  return v2;
```

In `tests/save/migrateV3.test.js`, replace:

```js
    expect(v3.tally === v2.tally).toBe(false);                    // a copy, not the same object
    for (const k of Object.keys(v2)) if (k !== 'version' && k !== 'tally') expect([k, v3[k]]).toEqual([k, v2[k]]);
    expect(Object.keys(v3).sort()).toEqual([...REQUIRED].sort());
    expect(validateWorld(v3)).toBe(true);
  });
  it('runs through migrate, deserialize and unpackSave, and keeps the old costs', () => {
    const v2 = v2City();
    expect(CURRENT_VERSION).toBe(3);
    expect(migrate(v2)).toEqual(MIGRATIONS[2](v2));
    expect(deserialize(JSON.stringify(v2)).version).toBe(3);
    const back = unpackSave(JSON.stringify({ version: 1, savedAt: 1760000000000, lastSpeed: 2, world: v2 }));
    expect(back.savedAt).toBe(1760000000000);
    expect(back.lastSpeed).toBe(2);
    expect(back.world.version).toBe(3);
    expect(back.world.difficulty).toBe('normal');
    expect(back.world.buildings).toEqual(v2.buildings);
    expect(back.world.gold).toBe(v2.gold);
    expect([costOf(back.world, 'well'), costOf(back.world, 'temple'), roadCostOf(back.world)]).toEqual([30, 120, 2]);   // a city from before plays on Normal
```

with:

```js
    expect(v3.tally === v2.tally).toBe(false);                    // a copy, not the same object
    for (const k of Object.keys(v2)) if (k !== 'version' && k !== 'tally') expect([k, v3[k]]).toEqual([k, v2[k]]);
    expect(Object.keys(v3).sort()).toEqual(REQUIRED.filter((k) => !V4_KEYS.includes(k)).sort());
    expect(validateWorld(MIGRATIONS[3](v3))).toBe(true);                    // valid once version 4 adds its fields
  });
  it('runs through migrate, deserialize and unpackSave, and keeps the old costs', () => {
    const v2 = v2City();
    expect(CURRENT_VERSION).toBe(4);
    expect(migrate(v2)).toEqual(MIGRATIONS[3](MIGRATIONS[2](v2)));
    expect(deserialize(JSON.stringify(v2)).version).toBe(4);
    const back = unpackSave(JSON.stringify({ version: 1, savedAt: 1760000000000, lastSpeed: 2, world: v2 }));
    expect(back.savedAt).toBe(1760000000000);
    expect(back.lastSpeed).toBe(2);
    expect(back.world.version).toBe(4);
    expect(back.world.difficulty).toBe('normal');
    for (const [id, b] of Object.entries(v2.buildings)) expect(back.world.buildings[id]).toEqual({ ...b, risk: 0, fire: null });
    expect(back.world.gold).toBe(v2.gold);
    expect([costOf(back.world, 'well'), costOf(back.world, 'temple'), roadCostOf(back.world)]).toEqual([30, 120, 2]);   // a city from before plays on Normal
```


In `tests/ui/difficultyChoice.test.js`, replace:

```js

describe('ui difficulty choice', () => {
  it('puts Relaxed, Normal and Hard under New city, chooses the level it is given, and reports a new choice', () => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    try {
```

with:

```js

describe('ui difficulty choice', () => {
  it('puts Peaceful, Relaxed, Normal and Hard under New city, chooses the level it is given, and reports a new choice', () => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    try {
```

In `tests/ui/difficultyChoice.test.js`, replace:

```js
      const choices = [...row.querySelectorAll('.choice.difficulty')];
      expect(choices.map((b) => b.textContent)).toEqual(DIFFICULTY_ORDER.map((d) => DIFFICULTY_NAMES[d]));
      expect(choices.map((b) => b.tagName)).toEqual(['BUTTON', 'BUTTON', 'BUTTON']);
      expect(row.querySelector('[role="group"]').getAttribute('aria-label')).toBe(T.difficultyForNewCities);
      expect(pressed(row)).toEqual(['hard']);
      expect(row.querySelector('.difficulty-hint').textContent).toBe(difficultyHint('hard'));
      expect(choices[0].getAttribute('aria-describedby')).toBe(row.querySelector('.difficulty-hint').id);
      fire(choices[0], 'click');
      expect([pressed(row), chosen]).toEqual([['relaxed'], ['relaxed']]);
      expect(row.querySelector('.difficulty-hint').textContent).toBe(difficultyHint('relaxed'));
```

with:

```js
      const choices = [...row.querySelectorAll('.choice.difficulty')];
      expect(choices.map((b) => b.textContent)).toEqual(DIFFICULTY_ORDER.map((d) => DIFFICULTY_NAMES[d]));
      expect(choices.map((b) => b.tagName)).toEqual(['BUTTON', 'BUTTON', 'BUTTON', 'BUTTON']);
      expect(row.querySelector('[role="group"]').getAttribute('aria-label')).toBe(T.difficultyForNewCities);
      expect(pressed(row)).toEqual(['hard']);
      expect(row.querySelector('.difficulty-hint').textContent).toBe(difficultyHint('hard'));
      expect(choices[0].getAttribute('aria-describedby')).toBe(row.querySelector('.difficulty-hint').id);
      fire(choices[1], 'click');
      expect([pressed(row), chosen]).toEqual([['relaxed'], ['relaxed']]);
      expect(row.querySelector('.difficulty-hint').textContent).toBe(difficultyHint('relaxed'));
```

In `tests/ui/difficultyChoice.test.js`, replace:

```js
      const group = body.querySelector(`[role="group"][aria-label="${T.difficultyForNewCities}"]`);
      expect(group.closest('.row').textContent).toContain(T.difficultyForNewCities);
      expect([...group.querySelectorAll('.choice.difficulty')].map((b) => b.textContent)).toEqual(['Relaxed', 'Normal', 'Hard']);
      expect(pressed(group)).toEqual(['normal']);
      fire(group.querySelector('[data-value="hard"]'), 'click');
```

with:

```js
      const group = body.querySelector(`[role="group"][aria-label="${T.difficultyForNewCities}"]`);
      expect(group.closest('.row').textContent).toContain(T.difficultyForNewCities);
      expect([...group.querySelectorAll('.choice.difficulty')].map((b) => b.textContent)).toEqual(['Peaceful', 'Relaxed', 'Normal', 'Hard']);
      expect(pressed(group)).toEqual(['normal']);
      fire(group.querySelector('[data-value="hard"]'), 'click');
```


In `tests/ui/stage2Cards.test.js`, replace:

```js
import { CATEGORIES } from '../../src/data/ui.js';
import { MILESTONES } from '../../src/data/progression.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { GOODS } from '../../src/data/goods.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
```

with:

```js
import { CATEGORIES } from '../../src/data/ui.js';
import { MILESTONES } from '../../src/data/progression.js';
import { BUILDINGS, BUILDABLE } from '../../src/data/buildings.js';
import { GOODS } from '../../src/data/goods.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
```

In `tests/ui/stage2Cards.test.js`, replace:

```js
    expect(shownItems(w, 'food')).toEqual(['farm_grain', 'farm_fig', 'granary']);
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'storehouse']);
    expect(shownItems(w, 'services')).toEqual(['well', 'bazaar', 'temple', 'booth']);
    expect([cardInfo(w, 'garden').locked, cardInfo(w, 'statue').locked, cardInfo(w, 'potter').lockText]).toEqual([false, true, 'Unlocks at Town']);
    w.milestone = 'town';
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'storehouse', 'trading_post']);
    expect(cardInfo(w, 'trading_post').lockText).toBe('Unlocks at Market town');
    w.milestone = 'market_town';
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'farm_barley', 'brewery', 'storehouse', 'trading_post']);
```

with:

```js
    expect(shownItems(w, 'food')).toEqual(['farm_grain', 'farm_fig', 'granary']);
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'storehouse']);
    expect(shownItems(w, 'services')).toEqual(['well', 'bazaar', 'temple', 'booth', 'firehouse']);
    expect(shownItems(w, 'defence')).toEqual([]);                                     // Market town's cards: hidden until Town
    expect([cardInfo(w, 'garden').locked, cardInfo(w, 'statue').locked, cardInfo(w, 'potter').lockText]).toEqual([false, true, 'Unlocks at Town']);
    w.milestone = 'town';
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'storehouse', 'trading_post']);
    expect(cardInfo(w, 'trading_post').lockText).toBe('Unlocks at Market town');
    expect(shownItems(w, 'defence').map((i) => [i, cardInfo(w, i).locked])).toEqual([['wall', true], ['tower', true], ['barracks', true]]);
    w.milestone = 'market_town';
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'farm_barley', 'brewery', 'storehouse', 'trading_post']);
```

In `tests/ui/stage2Cards.test.js`, replace:

```js
  });
  it('puts every building in exactly one category and unlocks each at a milestone', () => {
    for (const type of Object.keys(BUILDINGS)) {
      expect([type, CATEGORIES.filter((c) => c.items.includes(type)).length]).toEqual([type, 1]);
      expect([type, MILESTONES.some((m) => m.unlocks.includes(type))]).toEqual([type, true]);
```

with:

```js
  });
  it('puts every building in exactly one category and unlocks each at a milestone', () => {
    for (const type of BUILDABLE) {                                                    // gates and rubble have no card
      expect([type, CATEGORIES.filter((c) => c.items.includes(type)).length]).toEqual([type, 1]);
      expect([type, MILESTONES.some((m) => m.unlocks.includes(type))]).toEqual([type, true]);
```


In `tests/ui/cards.test.js`, replace:

```js
    const picked = [];
    const buttons = renderCards(root, { world: w, category: 'services', activeItem: 'well', onPick: (i) => picked.push(i) });
    expect(buttons.length).toBe(4);                                  // the booth comes with Town: shown, locked
    expect(buttons[0].querySelector('.name').textContent).toBe('Well');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
```

with:

```js
    const picked = [];
    const buttons = renderCards(root, { world: w, category: 'services', activeItem: 'well', onPick: (i) => picked.push(i) });
    expect(buttons.length).toBe(5);                                  // the booth comes with Town: shown, locked; the firehouse with the Village
    expect(buttons[0].querySelector('.name').textContent).toBe('Well');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
```


In `tests/ui/cardThumbs.test.js`, replace:

```js
    const items = visibleCategories().flatMap((c) => c.items);
    expect(items).toEqual(['road', 'demolish', 'house', 'garden', 'statue', 'farm_grain', 'farm_fig', 'granary', 'clay_pit', 'potter', 'farm_barley', 'brewery',
      'farm_flax', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post', 'well', 'bazaar', 'temple', 'booth']);
    for (const item of items) {
      const c = drawThumb(document.createElement('canvas'), item, 1);
```

with:

```js
    const items = visibleCategories().flatMap((c) => c.items);
    expect(items).toEqual(['road', 'demolish', 'house', 'garden', 'statue', 'farm_grain', 'farm_fig', 'granary', 'clay_pit', 'potter', 'farm_barley', 'brewery',
      'farm_flax', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post', 'well', 'bazaar', 'temple', 'booth', 'firehouse',
      'wall', 'tower', 'barracks']);
    for (const item of items) {
      const c = drawThumb(document.createElement('canvas'), item, 1);
```

In `tests/ui/cardThumbs.test.js`, replace:

```js
  });
  it('shows only the categories with something to build, each with its colour band', async () => {
    expect(visibleCategories().map((c) => c.id)).toEqual(SHOWN);
    expect(Object.keys(CATEGORY_TINT).sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
    expect(HELP_ROWS.find((row) => row[0] === 'category')[2]).toBe('1 to 7');
```

with:

```js
  });
  it('shows only the categories with something to build, each with its colour band', async () => {
    expect(visibleCategories().map((c) => c.id)).toEqual([...SHOWN, 'defence']);   // Defence has cards from Stage 3, shown from Town (locked)
    expect(Object.keys(CATEGORY_TINT).sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
    expect(HELP_ROWS.find((row) => row[0] === 'category')[2]).toBe('1 to 7');
```

In `tests/ui/cardThumbs.test.js`, replace:

```js
        fire(r.root.querySelector(`${width === 844 ? '#rail' : '#panel'} ${width === 844 ? '.cat' : '.tab'}[data-category="services"]`), 'click');
        const cards = [...r.root.querySelectorAll(`${host} .card`)];
        expect([width, cards.length]).toEqual([width, 4]);
        for (const c of cards) {
          const box = c.getBoundingClientRect();
```

with:

```js
        fire(r.root.querySelector(`${width === 844 ? '#rail' : '#panel'} ${width === 844 ? '.cat' : '.tab'}[data-category="services"]`), 'click');
        const cards = [...r.root.querySelectorAll(`${host} .card`)];
        expect([width, cards.length]).toEqual([width, 5]);
        for (const c of cards) {
          const box = c.getBoundingClientRect();
```


In `tests/ui/panels.test.js`, replace:

```js
    expect(store.get().category).toBe('services');
    expect(tabs[4].getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.cards .card').length).toBe(4);
    fire(root.querySelectorAll('.cards .card')[2], 'click');
    expect(picked).toEqual(['temple']);
```

with:

```js
    expect(store.get().category).toBe('services');
    expect(tabs[4].getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.cards .card').length).toBe(5);
    fire(root.querySelectorAll('.cards .card')[2], 'click');
    expect(picked).toEqual(['temple']);
```


In `tests/ui/createUI.test.js`, replace:

```js
    expect([shown('dock'), shown('panel'), shown('rail')]).toEqual([false, true, false]);
    expect(r.root.querySelectorAll('#topbar .speed button').length).toBe(4);
    expect(r.root.querySelectorAll('#panel .cards .card').length).toBe(4);    // the services grid, the booth locked until Town
    expect(r.root.querySelector('#panel .minimap canvas')).toBeTruthy();
    r.cleanup();
```

with:

```js
    expect([shown('dock'), shown('panel'), shown('rail')]).toEqual([false, true, false]);
    expect(r.root.querySelectorAll('#topbar .speed button').length).toBe(4);
    expect(r.root.querySelectorAll('#panel .cards .card').length).toBe(5);    // the services grid, the booth locked until Town
    expect(r.root.querySelector('#panel .minimap canvas')).toBeTruthy();
    r.cleanup();
```


- [ ] **Step 6: Visual check**

```
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=11' -Out s3-contract-panel.png -Width 1280 -Height 800 -Eval "document.querySelector('#panel .tab[data-category=services]').click()"
```

Expected: the side panel's Services grid ends with a Firehouse card, 50 gold, whose picture is the placeholder (a whitewashed block with a red band). The title card (`/?nosw=1`) lists Peaceful, Relaxed, Normal and Hard under New city; Peaceful's hint is Relaxed's until Track F's `difficultyHint` names the risks. Delete the PNG afterwards.

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 120
```

Expected: `sw-files.js` gains the six new files (132 entries), then `937 passed, 0 failed` and `ALL PASSED` (911 before, 26 new).

- [ ] **Step 8: Commit**

```powershell
git add src/data/fire.js src/data/raids.js src/data/scoring.js src/data/feats.js src/data/ambient.js src/data/buildings.js src/data/difficulty.js src/data/progression.js src/data/desirability.js src/data/mood.js src/data/ui.js src/sim/world.js src/sim/costs.js src/sim/commands.js src/save/migrate.js src/save/serialize.js src/render/art/defence.js src/render/art/registry.js src/ui/text.js sw-files.js tests/all.js tests/stage3 tests/data/data.test.js tests/data/economyData.test.js tests/sim/worldV3.test.js tests/sim/costs.test.js tests/sim/economyUnlocks.test.js tests/save/store.test.js tests/save/migrateV2.test.js tests/save/migrateV3.test.js tests/ui/difficultyChoice.test.js tests/ui/stage2Cards.test.js tests/ui/cards.test.js tests/ui/cardThumbs.test.js tests/ui/panels.test.js tests/ui/createUI.test.js
git commit -m @'
Add world version 4 and the Stage 3 data: fire, raids, defences, Peaceful and the score

A city now carries walls, the raid clock, soldiers, danger days, milestone splits, seals, feats and a records id, and
every building a fire risk and a fire state; a version 3 save migrates with no danger, its raid clock started at load
when it already had 250 people, and New badges for the Stage 3 buildings it has unlocked. The data gains the
firehouse, tower, barracks, wall, gate and rubble, the fire, raid, defence, festival, score and ambient numbers of the
revised spec, and Peaceful as a fourth level. Placeholder art keeps every card and sprite drawable until the art lands.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 0.2: The sim stubs and the sim wiring

**Files:**
- Create (stubs with final signatures, and the pure rules several tracks read, complete; see the contract): `src/sim/fire.js` (complete: what burns, bands, `fireCoverage`, `dailyRiskOf`), `src/sim/raids.js` (complete: `raidSize`, `raidWealth`, `tributeFor`, `laterWarnDay`, `tributeQuote`, `payTribute`, `towersNeeded`, `workingTowers`, `raidTargetKind`, `entryDir`), `src/sim/combat.js`, `src/sim/pathfinding.js` (complete: `tileCost`), `src/sim/defence.js`, `src/sim/festival.js` (complete), `src/sim/score.js` (complete: medals, splits, `sealReign`), `src/sim/feats.js`
- Modify: `src/sim/clock.js` (fire and raids daily, `raidMonth`, feats, the score in history rows), `src/sim/alerts.js` (fire and raid alerts), `src/sim/mood.js` (the danger terms), `src/sim/economy.js` (soldiers' pay), `src/sim/progression.js` (splits), `src/sim/settle.js` (feats), `src/sim/commands.js` (rubble clearing, wall tiles, `clearRubble`, `setCityId`), `src/sim/undo.js` (walls, the Stage 3 guards), `src/render/loop.js` (stop on a pause from the sim)
- Modify: `sw-files.js`
- Create tests: `tests/stage3/contract/simSeams.test.js`
- Modify tests: `tests/stage3/contract.all.js`, `tests/sim/economy.test.js`, `tests/sim/goals.test.js`

**Interfaces:**
- Consumes: Task 0.1's data, costs and world fields; `atLeast`, `isWorking`, `allBuildings`, `footprint`, `idx`, `inBounds`, `rectTiles`, `pushUndo`, `canAfford`, `spend`, `refund`.
- Produces (contract): every function under "Sim modules" in the contract, as stubs or (where marked) complete; the wiring under "One-time wiring: sim"; the commands `clearRubble` and `setCityId`; the undo entry kinds and guards; the event and alert shapes as documented in each module's header.

- [ ] **Step 1: Write the failing tests**

Create `tests/stage3/contract/simSeams.test.js`:

```js
import { describe, it, expect } from '../../harness.js';
import { createWorld, buildingAt, population } from '../../../src/sim/world.js';
import { idx } from '../../../src/sim/grid.js';
import { T as TERRAIN } from '../../../src/sim/terrain.js';
import { runMonth, tickDay } from '../../../src/sim/clock.js';
import { createGameLoop } from '../../../src/render/loop.js';
import { updateMilestone } from '../../../src/sim/progression.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { updateMood } from '../../../src/sim/mood.js';
import { settle } from '../../../src/sim/settle.js';
import {
  canPlace, place, previewRoad, drawRoad, demolishAt, demolishArea, previewDemolishArea, clearRubble, setCityId, demolishRefundFor,
} from '../../../src/sim/commands.js';
import { undo, pushUndo } from '../../../src/sim/undo.js';
import { rubbleCostOf } from '../../../src/sim/costs.js';
import {
  baseRiskOf, canBurn, fireStarted, fireRiskOf, fireBand, burning, fireCoverage, coverageOf, staffedCover, dailyRiskOf,
  fireDay, igniteBuilding, burnBuilding, fireAlerts, fireMood, rubbleClearCost, clearRubble as clearRubbleFromFire,
} from '../../../src/sim/fire.js';
import {
  entryDir, towersNeeded, workingTowers, raidTargetKind, raidSize, raidWealth, tributeFor, laterWarnDay, tributeQuote, payTribute,
  raidDay, raidMonth, raidAlerts, raidMood,
} from '../../../src/sim/raids.js';
import { trainSoldiers, combatDay } from '../../../src/sim/combat.js';
import { tileCost, flowField } from '../../../src/sim/pathfinding.js';
import { isGate, wallHpFor, previewWall, drawWall } from '../../../src/sim/defence.js';
import { festivalStatus, holdFestival, festivalMood } from '../../../src/sim/festival.js';
import { scoreOf, scorePreview, scoreRow, scoreFactor, medalFor, nextMedal, splitMonths, sealReign } from '../../../src/sim/score.js';
import { checkFeats } from '../../../src/sim/feats.js';
import { DEFENCE, RAIDS } from '../../../src/data/raids.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

// Road along y = 10 in a 32x32 test world, at Market town so the defences are unlocked.
function street(gold = 1000) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'market_town';
  return w;
}

describe('s3 contract fire seams', () => {
  it('knows what can burn, from the data, and bands risk as the overlay does', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 2, 11), garden = addRaw(w, 'garden', 5, 11), hut = addRaw(w, 'house', 6, 11, { tier: 1 }), plot = addRaw(w, 'house', 7, 11);
    const tower = addRaw(w, 'tower', 8, 11), rubble = addRaw(w, 'rubble', 9, 11);
    expect([potter, garden, hut, plot, tower, rubble].map(baseRiskOf)).toEqual([1, 0, 0.3, 0, 0, 0]);
    expect([potter, garden, hut, plot, tower, rubble].map(canBurn)).toEqual([true, false, true, false, false, false]);
    potter.risk = 42; garden.risk = 5;
    expect([fireRiskOf(w, potter), fireRiskOf(w, garden)]).toEqual([42, 0]);
    expect([0, 24, 25, 59, 60, 99, 100, 250].map(fireBand)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(fireStarted(w)).toBe(true);
    w.milestone = 'village';
    expect(fireStarted(w)).toBe(false);
    potter.fire = { stage: 'blaze', days: 0, need: 1, fought: 0 };
    expect(burning(w).map((b) => b.id)).toEqual([potter.id]);
  });
  it('prices rubble clearing per tile at the city\'s level, and offers clearRubble from fire.js too', () => {
    const w = street();
    expect([rubbleClearCost(w), rubbleClearCost(w, 4)]).toEqual([5, 20]);
    w.difficulty = 'hard';
    expect(rubbleClearCost(w, 4)).toBe(24);
    expect(clearRubbleFromFire).toBe(clearRubble);
  });
  it('starts as safe stubs with their final signatures (Track A fills them in)', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 2, 11);
    const before = JSON.stringify(w);
    expect(fireCoverage(w) instanceof Map).toBe(true);
    expect([coverageOf(w, potter), staffedCover(w, potter), typeof dailyRiskOf(w, potter)]).toEqual([0, false, 'number']);
    fireDay(w, []);
    expect(typeof igniteBuilding(w, potter.id, [], 'raid')).toBe('boolean');
    expect(Array.isArray(burnBuilding(w, 999, []))).toBe(true);
    expect([Array.isArray(fireAlerts(w)), typeof fireMood(w)]).toEqual([true, 'object']);
    expect(JSON.stringify(w)).toBe(before);
  });
  it('covers buildings whose road tiles a working firehouse reaches within 8 road tiles, at its staffing ratio', () => {
    const w = street();
    const fh = addRaw(w, 'firehouse', 10, 9, { staff: 4 });                         // its road tile is (10, 10)
    const potter = addRaw(w, 'potter', 12, 11), granary = addRaw(w, 'granary', 16, 11), bazaar = addRaw(w, 'bazaar', 18, 11);
    const cover = () => [potter, granary, bazaar].map((b) => coverageOf(w, b));
    expect(cover()).toEqual([1, 1, 0]);                                              // the bazaar's nearest road tile is 9 away
    expect(fireCoverage(w)).toBe(fireCoverage(w));                                   // cached while nothing changes
    fh.staff = 2;
    expect([cover(), staffedCover(w, potter)]).toEqual([[0.5, 0.5, 0], true]);
    fh.staff = 1;
    expect([cover(), staffedCover(w, potter)]).toEqual([[0.25, 0.25, 0], false]);   // working, but not staffed for putting fires out
    fh.staff = 0;
    expect(cover()).toEqual([0, 0, 0]);                                              // below 25%: it works not at all
    fh.staff = 4; fh.paused = true;
    expect(cover()).toEqual([0, 0, 0]);
    fh.paused = false;
    addRaw(w, 'firehouse', 20, 9, { staff: 2 });
    expect(cover()).toEqual([1, 1, 0.5]);                                            // the best ratio among those reaching it
  });
  it('builds risk each day from Town by the type, the level and the cover', () => {
    const w = street();
    addRaw(w, 'firehouse', 10, 9, { staff: 4 });
    const potter = addRaw(w, 'potter', 12, 11), bazaar = addRaw(w, 'bazaar', 18, 11), garden = addRaw(w, 'garden', 22, 11);
    expect([near(dailyRiskOf(w, potter), 0.2), near(dailyRiskOf(w, bazaar), 0.3), dailyRiskOf(w, garden)]).toEqual([true, true, 0]);
    w.difficulty = 'hard';
    expect(near(dailyRiskOf(w, bazaar), 0.45)).toBe(true);
    w.milestone = 'village';
    expect(dailyRiskOf(w, bazaar)).toBe(0);
  });
});

describe('s3 contract raid seams', () => {
  it('names an entry by its edge, counts the towers a raid needs and the working ones, and finds the target kind', () => {
    const w = createWorld({ seed: 3 });
    expect(w.raiderEntries.map((e) => entryDir(w, e))).toEqual(['east', 'north']);
    expect(entryDir(w, { x: 0, y: 30 })).toBe('west');
    expect(entryDir(w, { x: 30, y: w.size - 1 })).toBe('south');
    expect([1, 2, 3, 4, 6, 7, 12].map(towersNeeded)).toEqual([1, 1, 1, 2, 2, 3, 4]);
    const s = street();
    expect(raidTargetKind(s)).toBe('building');
    addRaw(s, 'temple', 2, 11);
    expect(raidTargetKind(s)).toBe('temple');
    addRaw(s, 'storehouse', 6, 11);
    expect(raidTargetKind(s)).toBe('storehouse');
    const t = addRaw(s, 'tower', 10, 11);
    expect(workingTowers(s)).toBe(0);
    staffAll(s);
    expect(workingTowers(s)).toBe(1);
    t.paused = true;
    expect(workingTowers(s)).toBe(0);
  });
  it('starts as safe stubs with their final signatures (Track B fills them in)', () => {
    const w = street();
    const before = JSON.stringify(w);
    expect(raidSize(w)).toBe(RAIDS.firstSize);
    expect(tributeQuote(w)).toBe(null);
    expect(payTribute(w)).toEqual({ ok: false, reason: 'no_warning', warnings: [] });
    raidDay(w, []); raidMonth(w, []); trainSoldiers(w, []); combatDay(w, []);
    expect([raidAlerts(w), raidMood(w), flowField(w, [[1, 1]])]).toEqual([[], {}, null]);
    expect(previewWall(w, 1, 1, 5, 1)).toEqual({ ok: false, reason: 'locked', warnings: [], tiles: [], gates: [], cost: 0 });
    expect(drawWall(w, 1, 1, 5, 1).ok).toBe(false);
    expect(checkFeats(w, [])).toEqual([]);
    expect(JSON.stringify(w)).toBe(before);
  });
  it('sizes a raid from people and wealth, the level and the adaptation; the first is always 3', () => {
    const w = street(0);
    const home = addRaw(w, 'house', 1, 1, { tier: 4, residents: 250 });
    w.difficulty = 'hard';
    expect(raidSize(w)).toBe(3);                                                      // index 0: the first raid, at every level
    w.difficulty = 'normal';
    w.raid.index = 1;
    const at = (people, wealth) => { home.residents = people; w.gold = wealth - 5; expect(raidWealth(w)).toBe(wealth); return raidSize(w); };
    expect(at(250, 6000)).toBe(3);                                                    // 1 + 2 + 0.2 = 3.2
    expect(at(600, 15000)).toBe(8);                                                   // 1 + 4.8 + 2 = 7.8
    expect(at(1000, 60000)).toBe(12);                                                 // 13, at most 12
    w.difficulty = 'relaxed';
    expect(at(1000, 60000)).toBe(7);                                                  // 6.5
    expect(at(0, 5)).toBe(2);                                                         // 1 x 0.5, at least 2
    w.difficulty = 'normal';
    w.raid.adaptation = 0.6;
    expect(at(600, 15000)).toBe(5);                                                   // 7.8 x 0.6 = 4.68
    w.gold = -300;
    expect(raidWealth(w)).toBe(5);                                                    // debt counts as 0
  });
  it('quotes and takes a warned raid\'s tribute, never the first one and never below 0, and schedules the next warning', () => {
    const w = street(1000);
    expect(tributeFor(w, 8)).toBe(360);                                               // 0.8 x 3 towers x 150
    w.difficulty = 'hard';
    expect(tributeFor(w, 4)).toBe(301);                                               // 0.8 x 2 x 188
    w.difficulty = 'normal';
    w.raid.index = 2;
    w.raid.warning = { index: 1, entry: { x: 31, y: 16 }, dir: 'east', size: 8, tribute: 360, target: 'storehouse', day: 800, arrives: 890, first: false };
    addRaw(w, 'tower', 3, 9, { staff: 4 });
    expect(tributeQuote(w)).toEqual({ cost: 360, size: 8, towersNeeded: 3, towersHave: 1, buildN: 2, buildCost: 300, hidden: false, payable: true, reason: null });
    w.gold = 359;
    expect([tributeQuote(w).reason, payTribute(w).reason]).toEqual(['below_zero', 'below_zero']);
    w.gold = 1000;
    w.raid.adaptation = 0.6;
    const next = laterWarnDay(w, 890);
    expect(next >= 890 + RAIDS.laterMin && next <= 890 + RAIDS.laterMax).toBe(true);
    expect(payTribute(w)).toEqual({ ok: true, cost: 360, warnings: [] });
    expect([w.gold, w.tally.tributes, w.raid.adaptation, w.raid.warning, w.raid.nextWarnDay]).toEqual([640, 1, Math.min(1, 0.6 + RAIDS.adaptStep), null, next]);
    expect(payTribute(w).reason).toBe('no_warning');
    w.raid.warning = { index: 0, entry: { x: 31, y: 16 }, dir: 'east', size: 3, tribute: null, target: 'building', day: 720, arrives: 810, first: true };
    const q = tributeQuote(w);
    expect([q.hidden, q.payable, q.reason, q.cost, q.buildN]).toEqual([true, false, 'first_raid', null, 0]);
    expect(payTribute(w).reason).toBe('first_raid');
  });
  it('holds a festival at a working temple from Town, once a year, for six mood points over three months', () => {
    const w = street(1000);
    w.milestone = 'village';
    expect(festivalStatus(w).reason).toBe('locked');
    w.milestone = 'town';
    expect(festivalStatus(w).reason).toBe('no_temple');
    const t = addRaw(w, 'temple', 2, 11);
    expect(festivalStatus(w).reason).toBe('no_temple');                              // not staffed: not working
    t.staff = 6;
    expect(festivalStatus(w)).toEqual({ can: true, reason: null, cost: 200, nextIn: 0, activeFor: 0 });
    w.day = 100;
    expect(holdFestival(w)).toEqual({ ok: true, cost: 200, warnings: [] });
    expect([w.gold, w.danger.festivalDay, w.tally.festivals, festivalMood(w)]).toEqual([800, 100, 1, { festival: 6 }]);
    w.day = 189;
    const s = festivalStatus(w);
    expect([festivalMood(w), s.activeFor, s.nextIn, s.reason]).toEqual([{ festival: 6 }, 1, 271, 'too_soon']);
    w.day = 190;
    expect(festivalMood(w)).toEqual({});
    w.day = 460;
    expect(festivalStatus(w).can).toBe(true);
    w.gold = -400;
    expect(holdFestival(w).reason).toBe('no_gold');
    w.difficulty = 'hard';
    expect(festivalStatus(w).cost).toBe(250);
    w.gold = 1000;
    expect(holdFestival(w).ok).toBe(true);
    updateMood(w);
    expect([w.moodBreakdown.festival, w.mood]).toEqual([6, 60 + 20 + 6]);            // no homes: everyone fed (+20), and the festival
  });
  it('costs a raider 1 a tile on open ground and roads, nothing through water or buildings, 1 + hp / 2 through a wall', () => {
    const w = street();
    addRaw(w, 'well', 3, 3);
    w.terrain[idx(w.size, 5, 5)] = TERRAIN.WATER;
    w.wall[idx(w.size, 6, 6)] = 40;
    w.wall[idx(w.size, 7, 7)] = -1;
    const t = addRaw(w, 'tower', 8, 8);
    w.wall[idx(w.size, 8, 8)] = DEFENCE.towerOnWallHp;
    expect([tileCost(w, 1, 1), tileCost(w, 1, 10), tileCost(w, 3, 3), tileCost(w, 5, 5), tileCost(w, 6, 6), tileCost(w, 7, 7), tileCost(w, 8, 8), tileCost(w, -1, 0)])
      .toEqual([1, 1, Infinity, Infinity, 21, 1, 41, Infinity]);
    expect(t.type).toBe('tower');
    expect([isGate(w, idx(w.size, 6, 6)), wallHpFor(w, idx(w.size, 6, 6)), wallHpFor(w, idx(w.size, 6, 10))]).toEqual([false, DEFENCE.wallHp, DEFENCE.gateHp]);
    w.wall[idx(w.size, 6, 10)] = 40;
    expect(isGate(w, idx(w.size, 6, 10))).toBe(true);
  });
});

describe('s3 contract clock and economy wiring', () => {
  it('runs the day with fire and raids, stops a frame\'s days when the sim pauses, and keeps a calm city\'s mood rows', () => {
    const w = street();
    w.speed = 3;
    let day = w.day;
    Object.defineProperty(w, 'day', { get: () => day, set: (v) => { day = v; if (v === 2) w.speed = 0; }, configurable: true, enumerable: true });   // the sim pausing on day 2
    const loop = createGameLoop({ world: w, render: () => {}, raf: () => 0, caf: () => {} });
    loop.tick(0); loop.tick(250); loop.tick(500);
    expect([w.day, loop.accumulator]).toEqual([2, 0]);
    loop.tick(750); loop.tick(1000);
    expect(w.day).toBe(2);
    const c = street();
    tickDay(c, []);
    updateMood(c);
    expect(Object.keys(c.moodBreakdown)).toEqual(['base', 'food', 'jobs', 'debt']);   // no danger terms in a calm city
  });
  it('pays soldiers monthly, in peace and from a paused barracks, on its own line', () => {
    const w = street(1000);
    const barracks = addRaw(w, 'barracks', 2, 11, { paused: true });
    w.soldiers.push({ id: 1, barracks: barracks.id, x: 3, y: 12, hp: 12, hit: false, task: 'wait' }, { id: 2, barracks: barracks.id, x: 3, y: 12, hp: 12, hit: false, task: 'wait' });
    const gold = w.gold;
    runMonth(w, []);
    const m = w.stats.lastMonth;
    expect(m.soldiers).toBe(2 * DEFENCE.soldierPay);
    expect(m.net).toBe(m.taxes - m.wages - m.upkeep - m.soldiers);
    expect(m.upkeep).toBe(0);                                                       // paused: no upkeep, but the pay stands
    expect(w.gold).toBe(gold + m.net);
  });
  it('stores the score and its four parts in each month-end row', () => {
    const w = street();
    runMonth(w, []);
    const row = w.history[w.history.length - 1];
    expect(row).toEqual({ day: w.day, people: population(w), gold: w.gold, mood: w.mood, ...scoreRow(w) });
    expect(Object.keys(row.parts)).toEqual(['people', 'prosperity', 'culture', 'safety']);
  });
  it('records the day the city first became each milestone, once, two at a time when it jumps', () => {
    const w = makeTestWorld();
    const home = addRaw(w, 'house', 1, 1, { tier: 4, residents: MILESTONES[2].population });   // straight to Market town
    w.day = 90;
    expect(updateMilestone(w)).toBe(true);
    expect(w.splits).toEqual({ town: 90, market_town: 90 });
    home.residents = 0; w.tally.peakPeople = 0; w.milestone = 'village';           // a city never loses a milestone; even then
    w.day = 300; home.residents = MILESTONES[1].population;
    updateMilestone(w);
    expect(w.splits).toEqual({ town: 90, market_town: 90 });                       // the first day stands
    expect(splitMonths(w)).toEqual({ town: 3, market_town: 3, city: null, great_city: null, capital: null });
  });
  it('lists fire and raid alerts with the rest, and settles feats after every command', () => {
    const w = street();
    expect(alertsFor(w)).toEqual([]);
    expect(settle(w, []).filter((e) => e.type === 'feat')).toEqual([]);
  });
});

describe('s3 contract commands', () => {
  it('keeps buildings and roads off wall tiles, but lets a tower stand on a standing wall', () => {
    const w = street();
    const wallTile = idx(w.size, 12, 9), breach = idx(w.size, 14, 9);
    w.wall[wallTile] = 40; w.wall[breach] = -1;
    expect(canPlace(w, 'firehouse', 12, 9).reason).toBe('occupied');
    expect(canPlace(w, 'tower', 12, 9).ok).toBe(true);
    expect(canPlace(w, 'tower', 14, 9).reason).toBe('occupied');                     // not on broken stone
    expect(previewRoad(w, 12, 8, 12, 9).reason).toBe('blocked');
    w.wall[idx(w.size, 16, 10)] = 40;                                                  // a gate: the road through it stays usable
    expect(drawRoad(w, 16, 9, 16, 10).ok).toBe(true);
  });
  it('clears rubble through Demolish at its price, refuses below the debt floor, counts it and undoes it', () => {
    const w = street(100);
    const r = addRaw(w, 'rubble', 12, 9);
    expect(demolishRefundFor(w, r)).toBe(-rubbleCostOf(w));
    expect(demolishAt(w, 12, 9)).toEqual({ ok: true, refund: -5, warnings: [] });
    expect([w.gold, w.tally.rubbleCleared, buildingAt(w, 12, 9)]).toEqual([95, 1, null]);
    expect(undo(w).ok).toBe(true);
    expect([w.gold, w.tally.rubbleCleared, buildingAt(w, 12, 9).type]).toEqual([100, 0, 'rubble']);
    w.gold = ECONOMY.debtFloor + 4;
    expect(demolishAt(w, 12, 9).reason).toBe('no_gold');
    expect(buildingAt(w, 12, 9).type).toBe('rubble');
  });
  it('sums an area\'s refunds less its clearing, and clears only rubble with clearRubble', () => {
    const w = street(1000);
    for (const x of [12, 13, 14]) addRaw(w, 'rubble', x, 9);
    place(w, 'well', 15, 9);
    const p = previewDemolishArea(w, 12, 9, 15, 9);
    expect([p.rubble, p.clearCost, p.refund, p.ok, p.reason]).toEqual([3, 15, 7 - 15, true, null]);   // the well refunds 7
    expect(clearRubble(w, 0, 0)).toEqual({ ok: false, reason: 'no_rubble', warnings: [], count: 0, cost: 0 });
    const gold = w.gold;
    expect(clearRubble(w, 12, 9, 15, 9)).toEqual({ ok: true, warnings: [], count: 3, cost: 15 });
    expect([w.gold, w.tally.rubbleCleared, buildingAt(w, 15, 9).type]).toEqual([gold - 15, 3, 'well']);
    undo(w);
    expect([w.gold, w.tally.rubbleCleared, buildingAt(w, 13, 9).type]).toEqual([gold, 0, 'rubble']);
    w.gold = ECONOMY.debtFloor + 10;
    expect(clearRubble(w, 12, 9, 14, 9).reason).toBe('no_gold');
    expect(demolishArea(w, 12, 9, 14, 9).reason).toBe('no_gold');
  });
  it('takes up wall tiles with Demolish (a gate keeps its road) and puts them back on undo', () => {
    const w = street();
    const gate = idx(w.size, 5, 10), wall = idx(w.size, 5, 9), breach = idx(w.size, 5, 8);
    w.wall[gate] = 40; w.wall[wall] = 25; w.wall[breach] = -1;
    const v = w.wallVersion;
    expect(demolishAt(w, 5, 10).ok).toBe(true);
    expect([w.wall[gate], w.road[gate], w.wallVersion]).toEqual([0, 1, v + 1]);
    expect(demolishArea(w, 5, 8, 5, 9).count).toBe(2);
    expect([w.wall[wall], w.wall[breach]]).toEqual([0, 0]);
    undo(w); undo(w);
    expect([w.wall[gate], w.wall[wall], w.wall[breach], w.wallVersion]).toEqual([40, 25, -1, v + 4]);
  });
  it('undoes a wall entry to each tile\'s old value, refunds its cost and uncounts its tiles', () => {
    const w = street(1000);
    const a = idx(w.size, 3, 3), b = idx(w.size, 4, 3);
    w.wall[b] = -1;
    w.wall[a] = 40; w.wall[b] = 40; w.gold -= 16; w.tally.wallTiles += 2;            // what drawWall does (Track B)
    pushUndo(w, { kind: 'wall', tiles: [a, b], before: [0, -1], cost: 16 });
    expect(undo(w)).toEqual({ ok: true, kind: 'wall' });
    expect([w.wall[a], w.wall[b], w.gold, w.tally.wallTiles]).toEqual([0, -1, 1000, 0]);
  });
  it('refunds only what still stands on undo, and never puts a building back where something now stands', () => {
    const w = street(1000);
    expect(place(w, 'potter', 12, 8).ok).toBe(true);
    const id = buildingAt(w, 12, 8).id;
    delete w.buildings[id];                                                            // burned down (fire.js removes it and frees its tiles)
    for (const [x, y] of [[12, 8], [13, 8], [12, 9], [13, 9]]) w.occ[idx(w.size, x, y)] = 0;
    const gold = w.gold;
    expect(undo(w).ok).toBe(true);
    expect(w.gold).toBe(gold);                                                         // nothing back for a building that is gone
    place(w, 'well', 20, 9);
    demolishAt(w, 20, 9);
    place(w, 'garden', 20, 9);
    undo(w);                                                                           // the garden goes: its tile is free again
    place(w, 'garden', 20, 9);
    w.undo.splice(w.undo.length - 1, 1);                                               // keep the garden: the demolish is next
    const before = w.gold;
    expect(undo(w)).toEqual({ ok: false, reason: 'occupied' });
    expect([buildingAt(w, 20, 9).type, w.gold, w.undo.map((e) => e.kind)]).toEqual(['garden', before, ['place']]);   // refused, and dropped
  });
  it('takes a city id once, from the interface', () => {
    const w = street();
    expect(setCityId(w, '').reason).toBe('bad_id');
    expect(setCityId(w, 'abc').ok).toBe(true);
    expect(setCityId(w, 'def').reason).toBe('has_id');
    expect(w.cityId).toBe('abc');
  });
});

describe('s3 contract score seams', () => {
  it('scores zero until Track E fills in the parts, with the version, factor, medals and next medal per level', () => {
    const w = street();
    const s = scoreOf(w);
    expect(s).toEqual({ version: 1, total: 0, raw: 0, factor: 1, parts: { people: 0, prosperity: 0, culture: 0, safety: 0 },
      reasons: { people: null, prosperity: null, culture: null, safety: null }, medal: null, next: { medal: 'bronze', points: 160 } });
    expect(scorePreview(w, 'well', 3, 9)).toEqual({ people: 0, prosperity: 0, culture: 0, safety: 0 });
    expect([159, 160, 239, 240, 320, 400].map(medalFor)).toEqual([null, 'bronze', 'bronze', 'silver', 'gold', 'gold']);
    w.difficulty = 'relaxed';
    expect([scoreFactor(w), nextMedal(w, 200)]).toEqual([0.8, { medal: 'silver', points: 192 - 160 }]);
    w.difficulty = 'hard';
    expect([nextMedal(w, 0), nextMedal(w, 320)]).toEqual([{ medal: 'bronze', points: 200 }, null]);
  });
  it('seals a reign in the world, as often as asked', () => {
    const w = street();
    w.day = 400;
    const r = sealReign(w);
    expect(r).toEqual({ ok: true, warnings: [], seal: { day: 400, score: 0, parts: { people: 0, prosperity: 0, culture: 0, safety: 0 }, medal: null, version: 1 } });
    sealReign(w);
    expect(w.seals.length).toBe(2);
  });
});
```


In `tests/stage3/contract.all.js`, replace:

```js
import './contract/worldV4.test.js';
import './contract/migrateV4.test.js';
```

with:

```js
import './contract/worldV4.test.js';
import './contract/migrateV4.test.js';
import './contract/simSeams.test.js';
```


- [ ] **Step 2: Run them to see them fail**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "s3 contract" -WaitSeconds 120
```

Expected: `LOAD ERROR` (`src/sim/fire.js` and the other new modules do not exist yet), exit code 1.

- [ ] **Step 3: Implement**

The stub modules. Each header is the contract for its module: the state it owns, its events and alerts, and every signature. A function marked STUB returns its safe default until its track fills it in; the rest are complete, because more than one track reads them (fire coverage: fire, the danger interface's fire row and overlay, and Safety; raid size and tribute: raids, the tribute sheet and Safety; festivals: the temple's button), so each track can test against the real rule from the start.

Create `src/sim/fire.js`:

```js
// Fire (spec 4.3, 4.9, 4.12). Stage 3 contract: Track 0 fixed every name, signature and shape here; Track A implements
// the functions marked STUB (each returns a safe default until then) and may add private helpers. Nothing here reads
// the clock or Math.random: every draw is hash2(id, world.day, world.seed + FIRE_SALT.x).
//
// State. Every building has b.risk (points, 0 up; only types that can burn ever gain any) and b.fire:
//   null                                          not burning
//   { stage: 'blaze', days, need, fought }        a blaze: days it has lasted, the covered-and-staffed days it needs to
//                                                 go out (1 or 2, drawn at ignition), and how many it has had
//   { stage: 'fire', days, left }                 a fire: days it has burned and days left before the building burns down
// world.danger.burnDays (days of buildings burned, last 360 days), .lastFireDay (the last day a building reached the
// fire stage) and .firePaused (the city's one first-time pause for a fire no staffed firehouse reaches) are fire's too,
// as are the tallies fires, blazesOut, firesOut, burned and rubbleCleared (rubble is counted by the commands).
//
// Events (pushed into the events array the clock passes; never saved):
//   { type: 'fire', id, covered, first }   a blaze started (by ignition, a spread or a raid's strike); covered: a staffed
//                                           firehouse reaches it; first: this is the city's first-time pause (the sim has
//                                           set world.speed to 0)
//   { type: 'fire_grow', id, covered }     a blaze grew into a fire
//   { type: 'fire_out', id, stage }        a blaze or fire was put out ('blaze' or 'fire')
//   { type: 'burned', id, kind, to }       the building burned down: kind is its type, to the ids of what replaced it
//                                           (empty plots for a home, rubble otherwise), in footprint order
// Alerts (fireAlerts): { code: 'fire', id } critical, a blaze or fire no staffed firehouse reaches; { code: 'blaze', id }
// warning, a covered blaze; { code: 'fire_risk', id } warning, a building in the High or Can-catch-fire band that no
// staffed firehouse covers (it carries the problem marker).
import { FIRE, FIRE_RISK, HOUSE_RISK, FIRE_BANDS } from '../data/fire.js';
import { allBuildings } from './world.js';
import { atLeast } from './progression.js';
import { rubbleCostOf, riskOf } from './costs.js';
import { roadReach, adjacentRoadTiles } from './reach.js';
import { isWorking, staffRatio } from './labour.js';

export { clearRubble } from './commands.js';   // the clearRubble command (spec 7.3) lives with demolish in commands.js

// A building's own risk a day before the difficulty and any firehouse: its type's, a home's by its tier; 0 never burns.
export const baseRiskOf = (b) => (b.type === 'house' ? HOUSE_RISK[b.tier] || 0 : FIRE_RISK[b.type] || 0);

// Whether a building can catch fire at all (spec 4.12): roads, empty plots, gardens, statues, wells, walls, gates,
// towers and rubble never do.
export const canBurn = (b) => baseRiskOf(b) > 0;

// Risk only builds up once the city is a Town.
export const fireStarted = (world) => atLeast(world, FIRE.startsAt);

// The risk points a building carries now (0 for one that never burns).
export const fireRiskOf = (world, b) => (canBurn(b) ? b.risk || 0 : 0);

// The band (spec 4.12) a risk falls in: 0 Low, 1 Rising, 2 High, 3 Can catch fire (FIRE_BAND_IDS).
export function fireBand(risk) {
  let k = 0;
  for (let i = 0; i < FIRE_BANDS.length; i++) if (risk >= FIRE_BANDS[i]) k = i;
  return k;
}

// Every burning building (a blaze or a fire), ascending id.
export const burning = (world) => allBuildings(world).filter((b) => b.fire);

// Building id -> coverage 0..1 (spec 4.12): the best staffing ratio among the working firehouses (25% staff or more, not
// paused) whose road reach (FIRE.reach tiles) takes in a road tile next to it. Buildings no firehouse reaches are not in
// the map. Each road tile keeps the best ratio reaching it, then each building reads its own road tiles: one pass over the
// firehouses and one over the buildings, never every building against every firehouse. Cached outside the world, keyed
// on the road version and a signature of every building's id, place, size and a firehouse's staff and pause; read-only.
const coverCache = new WeakMap();   // world -> { key, map }
function coverKey(world) {
  let h = 0x811c9dc5, n = 0;
  for (const b of allBuildings(world)) {
    n++;
    h = Math.imul(h ^ b.id, 16777619);
    h = Math.imul(h ^ (b.x * 256 + b.y), 16777619);
    h = Math.imul(h ^ (b.w * 4 + b.d), 16777619);
    if (b.type === 'firehouse') h = Math.imul(h ^ ((b.staff | 0) * 2 + (b.paused ? 1 : 0) + 1000), 16777619);
  }
  return `${world.roadVersion}|${n}|${h}`;
}
export function fireCoverage(world) {
  const key = coverKey(world);
  const c = coverCache.get(world);
  if (c && c.key === key) return c.map;
  const best = new Map();   // road tile -> the best staffing ratio of a working firehouse reaching it
  for (const f of allBuildings(world)) {
    if (f.type !== 'firehouse' || !isWorking(world, f)) continue;
    const ratio = staffRatio(world, f);
    for (const t of roadReach(world, f, FIRE.reach).keys()) if (ratio > (best.get(t) || 0)) best.set(t, ratio);
  }
  const map = new Map();
  if (best.size) {
    for (const b of allBuildings(world)) {
      let v = 0;
      for (const t of adjacentRoadTiles(world, b)) v = Math.max(v, best.get(t) || 0);
      if (v > 0) map.set(b.id, v);
    }
  }
  coverCache.set(world, { key, map });
  return map;
}

// A building's coverage, 0..1.
export const coverageOf = (world, b) => fireCoverage(world).get(b.id) || 0;

// Covered and staffed, for putting fires out: coverage of at least FIRE.staffedAt.
export const staffedCover = (world, b) => coverageOf(world, b) >= FIRE.staffedAt;

// The risk points the building adds today (spec 4.12): its base risk x the difficulty's risk (riskOf) x (1 - cut x
// coverage), and 0 before Town or for a building that never burns.
export function dailyRiskOf(world, b) {
  if (!fireStarted(world) || !canBurn(b)) return 0;
  return baseRiskOf(b) * riskOf(world) * (1 - FIRE.cut * coverageOf(world, b));
}

// STUB. The day's fire step, run by tickDay after production: risk builds, buildings at the threshold may ignite, blazes
// are fought or grow, fires spread, go out or burn down, with their events, tallies and danger days; the first fire no
// staffed firehouse reaches pauses the game once per city (world.speed = 0, danger.firePaused).
export function fireDay(world, events = null) {}

// STUB. Starts a blaze in the building (cause: 'ignite', 'spread' or 'raid'). Returns true when a blaze started; false
// when there is no such building, it never burns or it is already burning. Raids call it for a strike (Track B).
export function igniteBuilding(world, id, events = null, cause = 'ignite') {
  return false;
}

// STUB. Burns the building down now: a home becomes empty plots on its tiles (four for a 2x2) and its residents leave
// the city; anything else becomes one rubble per footprint tile and loses its stock. Removes it and inserts the new
// buildings under new ids (never a type change in place). Returns the new ids, or [] when there is no such building.
export function burnBuilding(world, id, events = null) {
  return [];
}

// STUB. Fire's alerts (codes above), in ascending building id.
export function fireAlerts(world) {
  return [];
}

// STUB. Fire's mood terms (spec 4.9, DANGER_MOOD): { fire } when a building reached the fire stage in the last 30 days,
// { burned } for buildings burned in the last 180; a key only while its term is not 0. updateMood adds them.
export function fireMood(world) {
  return {};
}

// What clearing this many rubble tiles costs in this city.
export const rubbleClearCost = (world, tiles = 1) => tiles * rubbleCostOf(world);
```


Create `src/sim/raids.js`:

```js
// Raids (spec 4.3, 4.9, 4.13). Stage 3 contract: Track 0 fixed every name, signature and shape here; Track B implements
// the functions marked STUB and may add private helpers. Draws are hash2(world.seed, raid index, RAID_SALT.x).
//
// State: world.raid = { clockDay, nextWarnDay, index, warning, active, adaptation, last } (newRaidState in world.js).
//   clockDay      the day the city first had RAIDS.clockPeople people (null until then; never on Peaceful)
//   nextWarnDay   the day the next warning appears (null while the clock has not started)
//   index         raids warned so far: the next warning's index (the first raid is index 0)
//   warning       null, or the raid on its way:
//                 { index, entry: { x, y }, dir, size, tribute, target, day, arrives, first }
//                 dir: 'north' | 'east' | 'south' | 'west' (entryDir); size: raiders, fixed now; tribute: gold, or null
//                 for the first raid (hidden); target: the RAIDS.targets kind it is after, or 'building'; day: the
//                 warning's day; arrives: day + RAIDS.warningDays; first: index === 0
//   active        null, or the raid under way: { index, entry, dir, size, target, day, raiders, phase, targetId, struck,
//                 wait, byTowers, bySoldiers, burned, stolen, shots }
//                 raiders: [{ id, x, y, hp, hit }] (tile coordinates, may be fractional; hit: hurt at least once);
//                 phase: 'attack' | 'strike' | 'leave' | 'retreat'; targetId: the building the band is going for; struck:
//                 ids struck so far (at most RAIDS.strikes); wait: days left at the current strike; byTowers, bySoldiers:
//                 raiders stopped by each; burned: buildings the raid's blazes burned down; stolen: gold taken; shots: the
//                 day's tower shots [{ from: { x, y }, to: { x, y } }] for the arrows (Track C draws them)
//   adaptation    1, or less after a lost raid (RAIDS.adaptLost, then + RAIDS.adaptStep per raid up to 1)
//   last          null, or the last raid's report: { index, dir, size, won, byTowers, bySoldiers, towers, burned, stolen,
//                 day } (day: the day it ended; a raid paid off leaves no report and no mood term)
// world.soldiers (combat.js), world.nextUnitId (raiders and soldiers share it), and the tallies raids, raidsBeaten,
// raidsLost, tributes, raidersByTowers, raidersBySoldiers, soldiersWounded and goldStolen are raids'.
//
// Events: { type: 'raid_warning', index, entry, dir, size, tribute, target, arrives, first } (the sim has paused the
// game for the first, dropped 2x or 3x to 1x for later ones); { type: 'raid_start', index, dir, size } (the sim has
// dropped 2x or 3x to 1x); { type: 'raid_strike', id, stolen } (a target struck); { type: 'raid_end', won, report }
// (report as raid.last); { type: 'tribute', index, cost } is never pushed: payTribute is a command and returns it.
// Alerts (raidAlerts): { code: 'raid_warning', x, y, dir, arrives } and { code: 'raid', x, y, left } (left: raiders still
// on the map), both critical and pinned at a map point (x, y: the entry, or the band's centre while it is on the map).
import { RAIDS, RAID_SALT } from '../data/raids.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, population } from './world.js';
import { isWorking } from './labour.js';
import { costOf, riskOf } from './costs.js';
import { spend } from './money.js';
import { hash2 } from './rng.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });

// The edge an entry point sits on, named as the warning words it ("from the east").
export function entryDir(world, entry) {
  if (entry.x >= world.size - 1) return 'east';
  if (entry.x <= 0) return 'west';
  if (entry.y <= 0) return 'north';
  return 'south';
}

// The staffed towers that would beat a raid of this size (spec 4.13): ceil(raiders / 3).
export const towersNeeded = (size) => Math.ceil(size / RAIDS.raidersPerTower);

// Towers that are working now (staffed at 25% or more and not paused).
export const workingTowers = (world) => allBuildings(world).filter((b) => b.type === 'tower' && isWorking(world, b)).length;

// The kind of building a raid warned now would be after: the first of RAIDS.targets the city has, else 'building'
// (any other building that is not a home).
export function raidTargetKind(world) {
  const types = new Set(allBuildings(world).map((b) => b.type));
  return RAIDS.targets.find((t) => types.has(t)) || 'building';
}

// The city's wealth for raid size (spec 4.13): the treasury if above 0, plus the base cost of every standing building
// (roads and walls are not buildings; rubble costs nothing).
export function raidWealth(world) {
  let w = Math.max(0, world.gold);
  for (const b of allBuildings(world)) w += BUILDINGS[b.type].cost;
  return w;
}

// The raiders a raid warned now would bring (spec 4.13): RAIDS.firstSize for the first raid (index 0) at every level;
// otherwise round((1 + people / 125 + clamp((wealth - 5000) / 5000, 0, 4)) x the difficulty's risk x adaptation),
// between RAIDS.minSize and RAIDS.maxSize. The warning fixes it; Safety's defence term (score.js) reads it for "now".
export function raidSize(world) {
  if (world.raid.index === 0) return RAIDS.firstSize;
  const wealth = Math.min(RAIDS.wealthMax, Math.max(0, (raidWealth(world) - RAIDS.wealthBase) / RAIDS.wealthStep));
  const raw = 1 + population(world) / RAIDS.peoplePerRaider + wealth;
  return Math.max(RAIDS.minSize, Math.min(RAIDS.maxSize, Math.round(raw * riskOf(world) * world.raid.adaptation)));
}

// A raid's tribute (spec 4.13): round(RAIDS.tributeShare x towers needed x the tower's price in this city), fixed when
// the warning appears (warning.tribute; null for the first raid, which cannot be paid off).
export const tributeFor = (world, size) => Math.round(RAIDS.tributeShare * towersNeeded(size) * costOf(world, 'tower'));

// The day a later warning appears (spec 4.13): RAIDS.laterMin to RAIDS.laterMax days after fromDay (the last raid's
// arrival day, or the day a cancelled raid would have arrived), drawn by hash2(seed, the next raid's index, salt).
export function laterWarnDay(world, fromDay) {
  const span = RAIDS.laterMax - RAIDS.laterMin + 1;
  return fromDay + RAIDS.laterMin + Math.floor(hash2(world.seed, world.raid.index, RAID_SALT.gap) * span);
}

// The warned raid's tribute and the defence it could buy instead, or null with no warning up:
// { cost, size, towersNeeded, towersHave, buildN, buildCost, hidden, payable, reason }
// cost: the warning's tribute (null for the first raid); hidden: the first raid; buildN: max(0, towers needed - working
// towers); buildCost: buildN x the tower's price; payable and reason: what payTribute would say now (reason null when
// payable).
export function tributeQuote(world) {
  const w = world.raid.warning;
  if (!w) return null;
  const need = towersNeeded(w.size), have = workingTowers(world), buildN = Math.max(0, need - have);
  const reason = w.first ? 'first_raid' : world.gold - w.tribute < 0 ? 'below_zero' : null;
  return { cost: w.tribute, size: w.size, towersNeeded: need, towersHave: have, buildN, buildCost: buildN * costOf(world, 'tower'), hidden: Boolean(w.first), payable: !reason, reason };
}

// The payTribute command (spec 4.13, 7.3): pays the warned raid's tribute and cancels the raid: no raiders, no report,
// no mood term; the adaptation steps up as after any raid, and the next warning comes laterWarnDay after the day it
// would have arrived. { ok: true, cost, warnings: [] }, or fails with 'no_warning' (none up: raiders that have arrived
// are no longer a warning), 'first_raid' (it cannot be paid off) or 'below_zero' (the treasury would go below 0).
export function payTribute(world) {
  const w = world.raid.warning;
  if (!w) return fail('no_warning');
  if (w.first) return fail('first_raid');
  if (world.gold - w.tribute < 0) return fail('below_zero');
  spend(world, w.tribute);
  world.tally.tributes += 1;
  world.raid.adaptation = Math.min(1, world.raid.adaptation + RAIDS.adaptStep);
  world.raid.nextWarnDay = laterWarnDay(world, w.arrives);
  world.raid.warning = null;
  return { ok: true, cost: w.tribute, warnings: [] };
}

// STUB. The day's raid step, run by tickDay after fire: starts the clock, raises the warning, brings the raiders in,
// then moves the band, trains and moves soldiers and resolves combat (combat.js), strikes, retreat and the end.
export function raidDay(world, events = null) {}

// STUB. The month-end raid step, run by runMonth before mood (nothing required yet; kept so a later rule has its seam).
export function raidMonth(world, events = null) {}

// STUB. Raids' alerts (codes above).
export function raidAlerts(world) {
  return [];
}

// STUB. The raid mood term (spec 4.9, DANGER_MOOD): { raid } for raidDays after a raid ends, by its outcome; {} otherwise.
export function raidMood(world) {
  return {};
}
```


Create `src/sim/combat.js`:

```js
// Combat and soldiers (spec 4.13). Stage 3 contract: Track B implements the STUBs; raidDay (raids.js) calls them.
//
// world.soldiers: one entry per trained soldier, ascending id: { id, barracks, x, y, hp, hit, task }
//   barracks: the id of the barracks that trained it; x, y: tile coordinates (may be fractional); hp: UNITS.soldier.hp
//   down to 1 (a soldier at 0 is wounded and leaves the list); hit: hurt at least once; task: 'wait' | 'out' | 'back'.
// A barracks keeps its training progress in its own b.progress (days of training at full staff towards
// DEFENCE.trainDays). Raiders live in world.raid.active.raiders.
//
// STUB. Trains soldiers for the day: each barracks at 25% staff or more adds its staffing ratio to b.progress and, at
// DEFENCE.trainDays, trains one soldier (up to DEFENCE.soldiersPerBarracks of its own), placed at the barracks.
export function trainSoldiers(world, events = null) {}

// STUB. One day of fighting while a raid is under way: towers shoot (DEFENCE.towerDamage x staffing, the nearest raider
// within DEFENCE.towerRange), soldiers walk out to raiders within DEFENCE.patrol of their barracks and fight, raiders hit
// the wall tile in their way or a soldier beside them. Records raid.active.shots and the tallies.
export function combatDay(world, events = null) {}
```


Create `src/sim/pathfinding.js`:

```js
// Raider pathfinding (spec 4.13): one flow field per band target, rebuilt when walls, roads or buildings change, cached
// outside the world (a WeakMap, as reach.js does), so saves stay pure data. Stage 3 contract: Track B implements the
// STUB and may change tileCost's internals, never its meaning.
import { idx, inBounds } from './grid.js';
import { T } from './terrain.js';

// What crossing a tile costs a raider (spec 4.13): open ground and roads 1; water and buildings cannot be crossed
// (Infinity); a standing wall, gate or tower-on-wall tile 1 + its hit points / 2 (the days one raider needs to break
// it); a breach 1. A tower stands on a wall tile with the wall's hit points (DEFENCE.towerOnWallHp), so its tile is a
// wall tile here; a tower on open ground is a building.
export function tileCost(world, x, y) {
  if (!inBounds(world.size, x, y)) return Infinity;
  const i = idx(world.size, x, y);
  if (world.terrain[i] === T.WATER) return Infinity;
  if (world.wall[i] > 0) return 1 + world.wall[i] / 2;
  if (world.wall[i] < 0) return 1;
  return world.occ[i] ? Infinity : 1;
}

// STUB. The flow field towards the goal tiles ([[x, y], ...]): { dist, next } where dist is a Float64Array of size²
// (the cheapest cost from each tile to a goal, Infinity where none is reachable) and next(x, y) is the neighbouring
// tile [x, y] one step cheaper, or null at a goal or where none is. Shared and cached: callers must not write to it.
export function flowField(world, goals) {
  return null;
}
```


Create `src/sim/defence.js`:

```js
// Walls and gates (spec 4.13, 6.4 Drawing mode). Stage 3 contract: Track 0 fixed the names, signatures and shapes;
// Track B implements the STUBs. Walls are a tile layer, world.wall: 0 none, > 0 a standing tile's hit points, -1 a breach
// (broken stone, a gap until wall is drawn over it again at the normal price). A gate is a wall tile on a road: citizens,
// walkers and road reach pass it (it is still road), raiders treat it as wall. world.wallVersion goes up whenever a tile
// appears, goes or breaks (the path and terrain caches key on it). The commands keep buildings and roads off wall tiles
// (a tower may stand on a standing wall tile), and demolish and undo handle wall tiles (src/sim/commands.js, undo.js).
import { DEFENCE } from '../data/raids.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], tiles: [], gates: [], cost: 0, ...extra });

// A wall tile on a road.
export const isGate = (world, i) => world.wall[i] !== 0 && Boolean(world.road[i]);

// The hit points a newly drawn tile gets: a gate's on a road, a wall's elsewhere.
export const wallHpFor = (world, i) => (world.road[i] ? DEFENCE.gateHp : DEFENCE.wallHp);

// STUB. What drawing wall from (x0, y0) to (x1, y1) would do, in the road tool's L (flip picks the other L):
// { ok, reason, warnings, tiles, gates, cost } where tiles are the map indices that get wall (new tiles and breaches
// redrawn; standing wall is skipped), gates the subset on roads, and cost = walls x costOf(world, 'wall') + gates x
// costOf(world, 'gate'). Fails with 'locked' (before Market town), 'out_of_bounds', 'water', 'blocked' (a building in the
// way), 'nothing_to_place' (all of it is wall already) or 'no_gold' (below the debt floor), keeping tiles and cost.
export function previewWall(world, x0, y0, x1, y1, flip = false) {
  return fail('locked');
}

// STUB. The drawWall command (spec 7.3): draws the preview's tiles at full hit points, charges its cost, bumps
// wallVersion, adds tally.wallTiles, takes 'wall' out of newItems, and pushes the undo entry
// { kind: 'wall', tiles, before, cost } (before: each tile's value before, so undo puts breaches back). Returns the
// preview's result.
export function drawWall(world, x0, y0, x1, y1, flip = false) {
  return previewWall(world, x0, y0, x1, y1, flip);
}
```


Create `src/sim/festival.js`:

```js
// Festivals (spec 4.9, 4.13): a small mood lever at a working temple, from Town. Complete in the Stage 3 contract (the
// rules are a few lines of data, and the temple's button needs them from the start); Track B owns the file from then on.
// State: world.danger.festivalDay (the day of the last festival, or null) and tally.festivals.
import { FESTIVAL } from '../data/raids.js';
import { allBuildings } from './world.js';
import { atLeast } from './progression.js';
import { isWorking } from './labour.js';
import { canAfford, spend } from './money.js';
import { festivalCostOf } from './costs.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });
const sinceLast = (world) => (world.danger.festivalDay === null ? Infinity : world.day - world.danger.festivalDay);

// What the temple sheet's button needs: { can, reason, cost, nextIn, activeFor }. reason (null when it can): 'locked'
// (before Town), 'no_temple' (no working temple), 'too_soon' (within FESTIVAL.every days of the last) or 'no_gold'
// (the treasury would go below the debt floor); nextIn: days until the next may be held (0 when it may); activeFor: days
// the last festival's mood bonus has left (0 when none).
export function festivalStatus(world) {
  const cost = festivalCostOf(world);
  const since = sinceLast(world);
  const nextIn = Math.max(0, FESTIVAL.every - since);
  const activeFor = Math.max(0, FESTIVAL.days - since);
  let reason = null;
  if (!atLeast(world, FESTIVAL.from)) reason = 'locked';
  else if (!allBuildings(world).some((b) => b.type === 'temple' && isWorking(world, b))) reason = 'no_temple';
  else if (nextIn > 0) reason = 'too_soon';
  else if (!canAfford(world, cost)) reason = 'no_gold';
  return { can: reason === null, reason, cost, nextIn, activeFor };
}

// The holdFestival command (spec 7.3): charges festivalCostOf, records the day, counts tally.festivals.
// { ok: true, cost, warnings: [] } or fails with festivalStatus's reason.
export function holdFestival(world) {
  const s = festivalStatus(world);
  if (!s.can) return fail(s.reason);
  spend(world, s.cost);
  world.danger.festivalDay = world.day;
  world.tally.festivals += 1;
  return { ok: true, cost: s.cost, warnings: [] };
}

// The festival's mood term (spec 4.9): { festival: FESTIVAL.mood } for FESTIVAL.days after one is held, else {}.
export function festivalMood(world) {
  return sinceLast(world) < FESTIVAL.days ? { festival: FESTIVAL.mood } : {};
}
```


Create `src/sim/score.js`:

```js
// The city score (spec 4.19): four parts measured from the city's state, never from clicks, the clock, pausing or undo,
// and never gating anything. Stage 3 contract: Track 0 fixed the names, signatures and shapes; Track E implements the
// STUBs. runMonth stores each month's score and parts in the history row (src/sim/clock.js).
import { SCORE_VERSION, SCORE_PARTS, SCORE_FACTOR, MEDALS, SPLIT_MILESTONES } from '../data/scoring.js';
import { DAYS_PER_MONTH } from './time.js';

const zeroParts = () => Object.fromEntries(SCORE_PARTS.map((p) => [p, 0]));

// The difficulty's score factor.
export const scoreFactor = (world) => SCORE_FACTOR[world.difficulty];

// The best medal a parts' total earns ('bronze', 'silver', 'gold'), or null.
export function medalFor(raw) {
  let medal = null;
  for (const m of MEDALS) if (raw >= m.at) medal = m.id;
  return medal;
}

// The next medal above a parts' total and the city-score points to it ({ medal, points }), or null at gold. Medals sit on
// the parts' total, but show in city-score points: the medal's total times the factor, rounded, less the city score.
export function nextMedal(world, raw) {
  const f = scoreFactor(world);
  const m = MEDALS.find((x) => raw < x.at);
  return m ? { medal: m.id, points: Math.max(1, Math.round(m.at * f) - Math.round(raw * f)) } : null;
}

// STUB. The score now: { version, total, raw, factor, parts, reasons, medal, next }
//   parts    { people, prosperity, culture, safety }, each a whole number 0-100 (spec 4.19 formulas, data/scoring.js)
//   raw      the parts' sum (0-400); total: round(raw x factor), the city score
//   reasons  per part, null or { code, ... }: the term that lost the part the most points, for its reason line
//            (codes and their fields are Track E's; the words live in SCORE_TEXT in src/ui/text.js)
//   medal    medalFor(raw); next: nextMedal(world, raw)
export function scoreOf(world) {
  const parts = zeroParts();
  const raw = 0;
  const factor = scoreFactor(world);
  return {
    version: SCORE_VERSION, total: Math.round(raw * factor), raw, factor, parts,
    reasons: Object.fromEntries(SCORE_PARTS.map((p) => [p, null])), medal: medalFor(raw), next: nextMedal(world, raw),
  };
}

// STUB. What placing a building of this type at (x, y) would change, counting it as staffed: { people, prosperity,
// culture, safety } in whole points (the confirm bar shows changes of 1 or more: src/ui/scoreUi.js scoreLineFor).
export function scorePreview(world, type, x, y) {
  return zeroParts();
}

// Game-months from the start to each milestone the city has reached (world.splits), null where not reached.
export function splitMonths(world) {
  return Object.fromEntries(SPLIT_MILESTONES.map((id) => [id, Number.isInteger(world.splits[id]) ? Math.floor(world.splits[id] / DAYS_PER_MONTH) : null]));
}

// The month-end history row's score fields (runMonth): { score, parts }.
export function scoreRow(world) {
  const s = scoreOf(world);
  return { score: s.total, parts: { ...s.parts } };
}

// The sealReign command (spec 4.19, 7.3): records the day and the score in the world; never refused, and repeatable.
// The interface then writes the chronicle entry (src/save/records.js). { ok: true, warnings: [], seal }.
export function sealReign(world) {
  const s = scoreOf(world);
  const seal = { day: world.day, score: s.total, parts: { ...s.parts }, medal: s.medal, version: s.version };
  world.seals.push(seal);
  return { ok: true, warnings: [], seal };
}
```


Create `src/sim/feats.js`:

```js
// Feats (spec 4.19): named, optional style bonuses, per city; no gold, never gating. Stage 3 contract: Track E implements
// the STUB and fills FEATS (src/data/feats.js) with their words. State: world.feats = { earned, lost, counters }:
// earned and lost are feat ids (lost: can no longer be earned, e.g. Grain alone once a fig orchard stands before Market
// town), counters a record of whole numbers the checks keep (a streak of fed months, say). runMonth and settle call it.
//
// STUB. Records each feat newly earned (pushing { type: 'feat', id }) or ruled out; returns the ids earned by this call.
// Peaceful skips the raid feats (spec 4.18).
export function checkFeats(world, events = null) {
  return [];
}
```


The clock: fire and raids each day after production and before the day turns (their draws key on the day being simulated), `raidMonth` before mood, feats after achievements, and the score in every month-end row:

In `src/sim/clock.js`, replace:

```js
import { population, HISTORY_MONTHS } from './world.js';
import { goodsMonthStart, homeGoodsHeld, recordGoodsMonth } from './goodsMonth.js';

const ARRIVAL_EVERY = DAYS_PER_MONTH / MOOD.arrivalBatchesPerMonth;
```

with:

```js
import { population, HISTORY_MONTHS } from './world.js';
import { goodsMonthStart, homeGoodsHeld, recordGoodsMonth } from './goodsMonth.js';
import { fireDay } from './fire.js';
import { raidDay, raidMonth } from './raids.js';
import { checkFeats } from './feats.js';
import { scoreRow } from './score.js';

const ARRIVAL_EVERY = DAYS_PER_MONTH / MOOD.arrivalBatchesPerMonth;
```

In `src/sim/clock.js`, replace:

```js
  monthlyEconomy(world);
  const tradeSpent = tradeMonth(world, events);
  updateMood(world);
  const milestoneChanged = updateMilestone(world);
```

with:

```js
  monthlyEconomy(world);
  const tradeSpent = tradeMonth(world, events);
  raidMonth(world, events);                            // Stage 3 (src/sim/raids.js)
  updateMood(world);
  const milestoneChanged = updateMilestone(world);
```

In `src/sim/clock.js`, replace:

```js
  computeAlerts(world);
  checkAchievements(world, events);
  clearUndo(world);
  recordGoodsMonth(world, goods, held, heldAfter, tradeSpent);   // after monthlyEconomy (it starts stats.lastMonth) and tradeMonth
  world.history.push({ day: world.day, people: population(world), gold: world.gold, mood: world.mood });
  if (world.history.length > HISTORY_MONTHS) world.history.splice(0, world.history.length - HISTORY_MONTHS);
  if (events) events.push({ type: 'month' });
```

with:

```js
  computeAlerts(world);
  checkAchievements(world, events);
  checkFeats(world, events);                           // Stage 3 (src/sim/feats.js)
  clearUndo(world);
  recordGoodsMonth(world, goods, held, heldAfter, tradeSpent);   // after monthlyEconomy (it starts stats.lastMonth) and tradeMonth
  // The month-end row: Welcome back's trends, and from Stage 3 the city score and its four parts (spec 4.19).
  world.history.push({ day: world.day, people: population(world), gold: world.gold, mood: world.mood, ...scoreRow(world) });
  if (world.history.length > HISTORY_MONTHS) world.history.splice(0, world.history.length - HISTORY_MONTHS);
  if (events) events.push({ type: 'month' });
```

In `src/sim/clock.js`, replace:

```js
  assignLabour(world);
  produceDay(world);
  world.day += 1;
  if (world.day % ARRIVAL_EVERY === 0) {
```

with:

```js
  assignLabour(world);
  produceDay(world);
  fireDay(world, events);                              // Stage 3: fire, then raids and combat (src/sim/fire.js, raids.js)
  raidDay(world, events);
  world.day += 1;
  if (world.day % ARRIVAL_EVERY === 0) {
```


Alerts, mood, soldiers' pay, milestone splits and feats after every command:

In `src/sim/alerts.js`, replace:

```js
import { isWorking } from './labour.js';
import { storeTotal } from './production.js';

export function alertsFor(world) {
```

with:

```js
import { isWorking } from './labour.js';
import { storeTotal } from './production.js';
import { fireAlerts } from './fire.js';
import { raidAlerts } from './raids.js';

export function alertsFor(world) {
```

In `src/sim/alerts.js`, replace:

```js
    if (def.sells && isWorking(world, b) && FOOD_GOODS.every((g) => !((b.store[g] || 0) > 0))) alerts.push({ code: 'bazaar_empty', id: b.id });   // no food in stock
  }
  for (const level of world.labour.shortLevels || []) alerts.push({ code: 'labour_shortage', level });
  const L = world.labour;
```

with:

```js
    if (def.sells && isWorking(world, b) && FOOD_GOODS.every((g) => !((b.store[g] || 0) > 0))) alerts.push({ code: 'bazaar_empty', id: b.id });   // no food in stock
  }
  alerts.push(...fireAlerts(world), ...raidAlerts(world));   // Stage 3: fire (fire, blaze, fire_risk) and raids (raid_warning, raid)
  for (const level of world.labour.shortLevels || []) alerts.push({ code: 'labour_shortage', level });
  const L = world.labour;
```


In `src/sim/mood.js`, replace:

```js
import { atLeast } from './progression.js';
import { wantedNeeds } from './housing.js';

export function updateMood(world) {
```

with:

```js
import { atLeast } from './progression.js';
import { wantedNeeds } from './housing.js';
import { fireMood } from './fire.js';
import { raidMood } from './raids.js';
import { festivalMood } from './festival.js';

export function updateMood(world) {
```

In `src/sim/mood.js`, replace:

```js

  const debt = world.gold < 0 ? -Math.min(MOOD.debtMax, Math.round(-world.gold / MOOD.debtPerPoint)) + 0 : 0;
  world.mood = Math.max(0, Math.min(100, MOOD.base + food + jobs + debt));
  world.moodBreakdown = { base: MOOD.base, food, jobs, debt };
  return world.mood;
}
```

with:

```js

  const debt = world.gold < 0 ? -Math.min(MOOD.debtMax, Math.round(-world.gold / MOOD.debtPerPoint)) + 0 : 0;
  // Stage 3's danger terms (spec 4.9): each module reports only the terms that apply now, so a calm city's breakdown is
  // the same four rows as before. fire, burned (fire.js); raid (raids.js); festival (festival.js).
  const danger = { ...fireMood(world), ...raidMood(world), ...festivalMood(world) };
  const dangerSum = Object.values(danger).reduce((s, v) => s + v, 0);
  world.mood = Math.max(0, Math.min(100, MOOD.base + food + jobs + debt + dangerSum));
  world.moodBreakdown = { base: MOOD.base, food, jobs, debt, ...danger };
  return world.mood;
}
```


In `src/sim/economy.js`, replace:

```js
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from './world.js';

export function monthlyEconomy(world) {
```

with:

```js
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from './world.js';
import { soldiersPayOf } from './costs.js';

export function monthlyEconomy(world) {
```

In `src/sim/economy.js`, replace:

```js
    wages += b.staff * ECONOMY.wagePerWorker;
  }
  const net = taxes - wages - upkeep;
  world.gold += net;
  world.stats.lastMonth = { taxes, wages, upkeep, net };
  if (net > 0) world.tally.profitMonths += 1;
}
```

with:

```js
    wages += b.staff * ECONOMY.wagePerWorker;
  }
  const soldiers = soldiersPayOf(world);               // spec 4.11: every soldier, in peace too, a paused barracks' as well
  const net = taxes - wages - upkeep - soldiers;
  world.gold += net;
  world.stats.lastMonth = { taxes, wages, upkeep, soldiers, net };
  if (net > 0) world.tally.profitMonths += 1;
}
```


In `src/sim/progression.js`, replace:

```js
  for (let k = from + 1; k <= i; k++) {
    for (const type of MILESTONES[k].unlocks) if (!world.newItems.includes(type)) world.newItems.push(type);
  }
  world.milestone = MILESTONES[i].id;
```

with:

```js
  for (let k = from + 1; k <= i; k++) {
    for (const type of MILESTONES[k].unlocks) if (!world.newItems.includes(type)) world.newItems.push(type);
    if (!Number.isInteger(world.splits[MILESTONES[k].id])) world.splits[MILESTONES[k].id] = world.day;   // spec 4.19: the day it first became one
  }
  world.milestone = MILESTONES[i].id;
```


In `src/sim/settle.js`, replace:

```js
import { checkAchievements } from './achievements.js';
import { checkDaily } from './daily.js';

export function settle(world, events = null) {
```

with:

```js
import { checkAchievements } from './achievements.js';
import { checkDaily } from './daily.js';
import { checkFeats } from './feats.js';

export function settle(world, events = null) {
```

In `src/sim/settle.js`, replace:

```js
  checkAchievements(world, events);
  checkDaily(world, events);
  return events;
}
```

with:

```js
  checkAchievements(world, events);
  checkDaily(world, events);
  checkFeats(world, events);
  return events;
}
```


Commands: rubble is cleared through Demolish at its price (a negative refund, refused below the debt floor) and through the `clearRubble` command; buildings and roads keep off wall tiles (a tower may stand on a standing one); Demolish takes up wall tiles and keeps a gate's road; a city id is set once:

In `src/sim/commands.js`, replace:

```js
import { touchesRoad, buildingsInReach } from './reach.js';
import { canAfford, spend, refund } from './money.js';
import { costOf, roadCostOf } from './costs.js';
import { isUnlocked } from './progression.js';
import { pushUndo } from './undo.js';
```

with:

```js
import { touchesRoad, buildingsInReach } from './reach.js';
import { canAfford, spend, refund } from './money.js';
import { costOf, roadCostOf, rubbleCostOf } from './costs.js';
import { isUnlocked } from './progression.js';
import { pushUndo } from './undo.js';
```

In `src/sim/commands.js`, replace:

```js
    if (world.terrain[i] === T.WATER) return 'water';
    if (world.occ[i] || world.road[i]) return 'occupied';
    if (def.terrain && world.terrain[i] !== TERRAIN_BY_NAME[def.terrain]) return 'needs_' + def.terrain;
  }
```

with:

```js
    if (world.terrain[i] === T.WATER) return 'water';
    if (world.occ[i] || world.road[i]) return 'occupied';
    if (world.wall[i] && !(type === 'tower' && world.wall[i] > 0)) return 'occupied';   // a tower may stand on a standing wall tile (spec 4.13)
    if (def.terrain && world.terrain[i] !== TERRAIN_BY_NAME[def.terrain]) return 'needs_' + def.terrain;
  }
```

In `src/sim/commands.js`, replace:

```js
}

// A quarter of what the building costs in this city (difficulty included); plots refund nothing (spec 4.11).
export const demolishRefundFor = (world, b) => (b.type === 'house' ? 0 : Math.floor(costOf(world, b.type) * ECONOMY.demolishRefund));

export function demolishAt(world, x, y) {
  if (!isTile(x, y) || !inBounds(world.size, x, y)) return fail('out_of_bounds', { refund: 0 });
  const b = buildingAt(world, x, y);
  if (b) {
    const snap = JSON.parse(JSON.stringify(b));
    removeBuilding(world, b.id);
    const amount = demolishRefundFor(world, b);
    refund(world, amount);
    pushUndo(world, { kind: 'demolish', buildings: [snap], roads: [], refund: amount });
    return { ok: true, refund: amount, warnings: [] };
  }
  const i = idx(world.size, x, y);
  if (world.road[i]) {
    world.road[i] = 0;
    world.roadVersion++;
    pushUndo(world, { kind: 'demolish', buildings: [], roads: [i], refund: 0 });
    return { ok: true, refund: 0, warnings: [] };
  }
```

with:

```js
}

// A quarter of what the building costs in this city (difficulty included); plots refund nothing (spec 4.11). Clearing a
// rubble tile costs gold instead (spec 4.12): its "refund" is minus the clearing price, and the demolish that clears it
// is refused when that would take the treasury below the debt floor.
export const demolishRefundFor = (world, b) => {
  if (b.type === 'rubble') return -rubbleCostOf(world);
  return b.type === 'house' ? 0 : Math.floor(costOf(world, b.type) * ECONOMY.demolishRefund);
};

// One tile: a building (or a rubble tile), else a wall tile (a gate keeps its road), else a road. Walls and roads refund
// nothing. Undo entries: { kind: 'demolish', buildings: [snapshots], roads: [tile index], walls: [[tile index, value]],
// refund } (src/sim/undo.js).
export function demolishAt(world, x, y) {
  if (!isTile(x, y) || !inBounds(world.size, x, y)) return fail('out_of_bounds', { refund: 0 });
  const b = buildingAt(world, x, y);
  if (b) {
    const amount = demolishRefundFor(world, b);
    if (amount < 0 && !canAfford(world, -amount)) return fail('no_gold', { refund: 0 });
    const snap = JSON.parse(JSON.stringify(b));
    removeBuilding(world, b.id);
    refund(world, amount);
    if (b.type === 'rubble') world.tally.rubbleCleared += 1;
    pushUndo(world, { kind: 'demolish', buildings: [snap], roads: [], walls: [], refund: amount });
    return { ok: true, refund: amount, warnings: [] };
  }
  const i = idx(world.size, x, y);
  if (world.wall[i]) {
    const walls = [[i, world.wall[i]]];
    world.wall[i] = 0;
    world.wallVersion++;
    pushUndo(world, { kind: 'demolish', buildings: [], roads: [], walls, refund: 0 });
    return { ok: true, refund: 0, warnings: [] };
  }
  if (world.road[i]) {
    world.road[i] = 0;
    world.roadVersion++;
    pushUndo(world, { kind: 'demolish', buildings: [], roads: [i], walls: [], refund: 0 });
    return { ok: true, refund: 0, warnings: [] };
  }
```

In `src/sim/commands.js`, replace:

```js
    const i = idx(world.size, x, y);
    if (world.terrain[i] === T.WATER) return fail('water', { tiles: [], cost: 0 });
    if (world.occ[i]) return fail('blocked', { tiles: [], cost: 0 });
    if (!world.road[i]) tiles.push(i);
  }
```

with:

```js
    const i = idx(world.size, x, y);
    if (world.terrain[i] === T.WATER) return fail('water', { tiles: [], cost: 0 });
    if (world.occ[i] || (world.wall[i] && !world.road[i])) return fail('blocked', { tiles: [], cost: 0 });   // a road never crosses a wall: draw wall over a road for a gate
    if (!world.road[i]) tiles.push(i);
  }
```

In `src/sim/commands.js`, replace:

```js
}

export function previewDemolishArea(world, x0, y0, x1, y1) {
  const buildingIds = [];
  const roadTiles = [];
  for (const [x, y] of rectTiles(x0, y0, x1, y1, world.size)) {
    if (!inBounds(world.size, x, y)) continue;
```

with:

```js
}

// Everything in the rectangle: buildings (rubble among them), road tiles and wall tiles. refund is the buildings' refunds
// less the rubble's clearing (clearCost, rubble tiles x rubbleCostOf), so it is negative when clearing costs more than
// the rest gives back; ok is false (reason 'no_gold') when that would take the treasury below the debt floor.
export function previewDemolishArea(world, x0, y0, x1, y1) {
  const buildingIds = [];
  const roadTiles = [];
  const wallTiles = [];
  for (const [x, y] of rectTiles(x0, y0, x1, y1, world.size)) {
    if (!inBounds(world.size, x, y)) continue;
```

In `src/sim/commands.js`, replace:

```js
    if (world.occ[i] && !buildingIds.includes(world.occ[i])) buildingIds.push(world.occ[i]);
    if (world.road[i]) roadTiles.push(i);
  }
  const refundTotal = buildingIds.reduce((s, id) => s + demolishRefundFor(world, world.buildings[id]), 0);
  return { buildingIds, roadTiles, refund: refundTotal };
}

export function demolishArea(world, x0, y0, x1, y1) {
  const p = previewDemolishArea(world, x0, y0, x1, y1);
  const count = p.buildingIds.length + p.roadTiles.length;
  if (!count) return fail('nothing_here', { count: 0, refund: 0 });
  const snaps = p.buildingIds.map((id) => JSON.parse(JSON.stringify(world.buildings[id])));
  for (const id of p.buildingIds) removeBuilding(world, id);
  for (const t of p.roadTiles) world.road[t] = 0;
  if (p.roadTiles.length) world.roadVersion++;
  refund(world, p.refund);
  pushUndo(world, { kind: 'demolish', buildings: snaps, roads: p.roadTiles, refund: p.refund });
  return { ok: true, warnings: [], count, refund: p.refund };
}
```

with:

```js
    if (world.occ[i] && !buildingIds.includes(world.occ[i])) buildingIds.push(world.occ[i]);
    if (world.road[i]) roadTiles.push(i);
    if (world.wall[i]) wallTiles.push(i);
  }
  const rubble = buildingIds.filter((id) => world.buildings[id].type === 'rubble').length;
  const refundTotal = buildingIds.reduce((s, id) => s + demolishRefundFor(world, world.buildings[id]), 0);
  const ok = refundTotal >= 0 || canAfford(world, -refundTotal);
  return { buildingIds, roadTiles, wallTiles, rubble, clearCost: rubble * rubbleCostOf(world), refund: refundTotal, ok, reason: ok ? null : 'no_gold' };
}

export function demolishArea(world, x0, y0, x1, y1) {
  const p = previewDemolishArea(world, x0, y0, x1, y1);
  const count = p.buildingIds.length + p.roadTiles.length + p.wallTiles.length;
  if (!count) return fail('nothing_here', { count: 0, refund: 0 });
  if (!p.ok) return fail(p.reason, { count, refund: 0 });
  const snaps = p.buildingIds.map((id) => JSON.parse(JSON.stringify(world.buildings[id])));
  for (const id of p.buildingIds) removeBuilding(world, id);
  for (const t of p.roadTiles) world.road[t] = 0;
  if (p.roadTiles.length) world.roadVersion++;
  const walls = p.wallTiles.map((t) => [t, world.wall[t]]);
  for (const [t] of walls) world.wall[t] = 0;
  if (walls.length) world.wallVersion++;
  refund(world, p.refund);
  world.tally.rubbleCleared += p.rubble;
  pushUndo(world, { kind: 'demolish', buildings: snaps, roads: p.roadTiles, walls, refund: p.refund });
  return { ok: true, warnings: [], count, refund: p.refund };
}

// The clearRubble command (spec 4.12, 7.3): clears the rubble in the rectangle (one tile by default) and nothing else,
// charging rubbleCostOf a tile; undoable like a demolish. { ok: true, count, cost, warnings: [] }, or fails with
// 'no_rubble' or 'no_gold' (below the debt floor). The Demolish tool clears rubble through demolishAt and demolishArea,
// which charge the same price.
export function clearRubble(world, x0, y0, x1 = x0, y1 = y0) {
  const ids = [];
  for (const [x, y] of rectTiles(x0, y0, x1, y1, world.size)) {
    const b = buildingAt(world, x, y);
    if (b && b.type === 'rubble' && !ids.includes(b.id)) ids.push(b.id);
  }
  if (!ids.length) return fail('no_rubble', { count: 0, cost: 0 });
  const cost = ids.length * rubbleCostOf(world);
  if (!canAfford(world, cost)) return fail('no_gold', { count: ids.length, cost });
  const snaps = ids.map((id) => JSON.parse(JSON.stringify(world.buildings[id])));
  for (const id of ids) removeBuilding(world, id);
  spend(world, cost);
  world.tally.rubbleCleared += ids.length;
  pushUndo(world, { kind: 'demolish', buildings: snaps, roads: [], walls: [], refund: -cost });
  return { ok: true, warnings: [], count: ids.length, cost };
}

// The city's id for the device's records (spec 4.19), given once by the interface (the sim never reads the clock): a
// new city gets it in createWorld, a city from before Stage 3 at load. Refused once the city has one.
export function setCityId(world, id) {
  if (typeof id !== 'string' || !id) return fail('bad_id');
  if (world.cityId) return fail('has_id');
  world.cityId = id;
  return { ok: true, warnings: [] };
}
```


Undo: the wall entry, wall tiles in demolish entries, and the 1a follow-up's guards (a placement refunds only what still stands; a demolish never goes back onto used tiles):

Replace the whole of `src/sim/undo.js` with:

```js
import { insertBuilding, removeBuilding } from './world.js';
import { footprint, idx } from './grid.js';
import { spend, refund } from './money.js';

export const UNDO_LIMIT = 10;

export function pushUndo(world, entry) {
  world.undo.push(entry);
  if (world.undo.length > UNDO_LIMIT) world.undo.shift();
}

export function clearUndo(world) { world.undo = []; }

// Whether a demolished building can go back on its tiles (spec 7.3): nothing else stands there, no road, and no wall
// (a tower may stand on a standing wall tile).
function footprintFree(world, snap) {
  for (const [x, y] of footprint(snap.x, snap.y, snap.w, snap.d)) {
    const i = idx(world.size, x, y);
    if (world.occ[i] || world.road[i]) return false;
    if (world.wall[i] && !(snap.type === 'tower' && world.wall[i] > 0)) return false;
  }
  return true;
}

// Undoes the last action. Stage 3 guards (spec 7.3): a placement refunds only what still stands (a building that has
// since burned, or a plot merged away, gives nothing back), and a demolish is refused, and dropped, when one of its
// buildings or roads would go back onto tiles something now uses. Wall entries ({ kind: 'wall', tiles, before, cost },
// pushed by drawWall) put each tile's old value back.
export function undo(world) {
  const e = world.undo.pop();
  if (!e) return { ok: false, reason: 'nothing_to_undo' };
  if (e.kind === 'place') {
    let standing = 0;
    for (const id of e.ids) if (removeBuilding(world, id)) standing++;
    refund(world, e.ids.length ? Math.round((e.cost * standing) / e.ids.length) : 0);
  } else if (e.kind === 'road') {
    for (const t of e.tiles) world.road[t] = 0;
    world.roadVersion++;
    refund(world, e.cost);
  } else if (e.kind === 'demolish') {
    const walls = e.walls || [];
    if (!e.buildings.every((snap) => footprintFree(world, snap)) || e.roads.some((t) => world.occ[t])) return { ok: false, reason: 'occupied' };
    for (const snap of e.buildings) insertBuilding(world, JSON.parse(JSON.stringify(snap)));
    for (const t of e.roads) world.road[t] = 1;
    if (e.roads.length) world.roadVersion++;
    for (const [t, v] of walls) world.wall[t] = v;
    if (walls.length) world.wallVersion++;
    spend(world, e.refund);
    const rubble = e.buildings.filter((s) => s.type === 'rubble').length;
    if (rubble) world.tally.rubbleCleared = Math.max(0, world.tally.rubbleCleared - rubble);
  } else if (e.kind === 'wall') {
    e.tiles.forEach((t, k) => { world.wall[t] = e.before[k]; });
    world.wallVersion++;
    world.tally.wallTiles = Math.max(0, world.tally.wallTiles - e.tiles.length);
    refund(world, e.cost);
  }
  return { ok: true, kind: e.kind };
}
```


The loop stops the frame's days as soon as the sim pauses:

In `src/render/loop.js`, replace:

```js
      acc -= 1;
      steps++;
    }
    if (acc >= 1) acc %= 1;          // the cap left a backlog: drop it instead of spiralling
```

with:

```js
      acc -= 1;
      steps++;
      if (world.speed === 0) { acc = 0; break; }   // the sim paused the game (a first fire or raid warning): no more days this frame
    }
    if (acc >= 1) acc %= 1;          // the cap left a backlog: drop it instead of spiralling
```


- [ ] **Step 4: Run the tests to see them pass**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "s3 contract" -WaitSeconds 120
```

Expected: `51 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

The month's record gains soldiers' pay (0 without soldiers) and the month-end row gains the score and its parts:

In `tests/sim/economy.test.js`, replace:

```js
    addRaw(w, 'well', 20, 9);
    monthlyEconomy(w);
    expect(w.stats.lastMonth).toEqual({ taxes: 40, wages: 24, upkeep: 13, net: 3 });
    expect(w.gold).toBe(1003);
  });
```

with:

```js
    addRaw(w, 'well', 20, 9);
    monthlyEconomy(w);
    expect(w.stats.lastMonth).toEqual({ taxes: 40, wages: 24, upkeep: 13, soldiers: 0, net: 3 });   // no soldiers: no pay (spec 4.11)
    expect(w.gold).toBe(1003);
  });
```


In `tests/sim/goals.test.js`, replace:

```js
    expect(events.filter((e) => e.type === 'month').length).toBe(1);
    expect(w.history.length).toBe(1);
    expect(w.history[0]).toEqual({ day: 30, people: w.history[0].people, gold: w.history[0].gold, mood: w.history[0].mood });
    expect(Object.keys(w.history[0]).sort()).toEqual(['day', 'gold', 'mood', 'people']);
    advanceDays(w, 30 * (HISTORY_MONTHS + 2));
    expect(w.history.length).toBe(HISTORY_MONTHS);
```

with:

```js
    expect(events.filter((e) => e.type === 'month').length).toBe(1);
    expect(w.history.length).toBe(1);
    expect(w.history[0]).toEqual({ day: 30, people: w.history[0].people, gold: w.history[0].gold, mood: w.history[0].mood, score: w.history[0].score, parts: w.history[0].parts });
    expect(Object.keys(w.history[0]).sort()).toEqual(['day', 'gold', 'mood', 'parts', 'people', 'score']);   // the score and its parts from Stage 3 (spec 4.19)
    advanceDays(w, 30 * (HISTORY_MONTHS + 2));
    expect(w.history.length).toBe(HISTORY_MONTHS);
```


- [ ] **Step 6: Visual check**

Not a visual task (sim only; every stub leaves the game as it was).

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 120
```

Expected: `sw-files.js` gains the eight new modules (140 entries), then `962 passed, 0 failed` and `ALL PASSED` (937 before, 25 new).

- [ ] **Step 8: Commit**

```powershell
git add src/sim/fire.js src/sim/raids.js src/sim/combat.js src/sim/pathfinding.js src/sim/defence.js src/sim/festival.js src/sim/score.js src/sim/feats.js src/sim/clock.js src/sim/alerts.js src/sim/mood.js src/sim/economy.js src/sim/progression.js src/sim/settle.js src/sim/commands.js src/sim/undo.js src/render/loop.js sw-files.js tests/stage3/contract.all.js tests/stage3/contract/simSeams.test.js tests/sim/economy.test.js tests/sim/goals.test.js
git commit -m @'
Add the Stage 3 sim modules as stubs and wire fire, raids, mood, pay and the score into the clock

Fire, raids, combat, pathfinding, walls, festivals, the score and feats exist with their final names and shapes, and
the clock, alerts, mood, the economy, milestones and settling call them, so each track can build its part alone.
Demolish clears rubble at its price and takes up wall tiles, clearRubble and setCityId are commands, undo handles
walls and never refunds a building that has gone nor puts one back where something stands, and the loop stops at once
when the sim pauses.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 0.3: Render and interface seams, screenshot mode, records, text and style sections, the dev hook and fixtures

**Files:**
- Create (stubs with final signatures): `src/render/fire.js`, `src/render/units.js`, `src/render/ambient.js`, `src/ui/danger.js`, `src/ui/scoreUi.js`, `src/ui/share.js`, `src/save/records.js`, `src/dev/scenes.js`
- Modify: `src/render/renderer.js` (one hook each for ambient, fire and units), `src/render/loop.js` (`allowFrame`), `src/ui/createUI.js` (the danger and score seams, the render hooks, the speed repaint, screenshot mode, the frame gate), `src/ui/alerts.js` (`onAction`), `src/ui/store.js`, `src/ui/modes.js` and `src/ui/backstack.js` (screenshot mode), `src/ui/menu.js` (the Screenshot mode item), `src/ui/sheets.js` (sheet parts, soldiers' pay row), `src/ui/hud.js` (`soldiers` in `summaryData`), `src/ui/placement.js` (the wall line tool, the score line, demolish refusals), `src/ui/confirmBar.js`, `src/ui/settings.js` (`ambient`, `fireReaction`), `src/ui/titleCard.js` (`decorate`), `src/data/ui.js` (`toolForItem('wall')`), `src/boot.js` (records, city ids, the dev hook, seeds, export and import), `src/save/serialize.js` (`records` in the envelope), `src/audio/sfx.js` (`horn`, `coin`), `src/sim/clock.js` (the test-only `calm` switch), `src/dev/sampleCity.js`, `src/ui/text.js` and `css/ui.css` (one section per track)
- Modify: `sw-files.js`
- Create tests: `tests/stage3/contract/uiSeams.test.js`
- Modify tests: `tests/stage3/contract.all.js`, `tests/stage3/contract/simSeams.test.js`, `tests/helpers/testWorld.js` (`raiderEntries`), `tests/audio/sfx.test.js`, `tests/sim/longrun.test.js`, `tests/sim/capital.test.js`, `tests/ui/store.test.js`

**Interfaces:**
- Consumes: Tasks 0.1-0.2; `createUI`'s components; `createSheets`; `renderFrame`; `toolPreview`, `createPlacement`; `createSettings`; `createTitleCard`; `boot`'s hooks; `packSave`, `unpackSave`; `SFX`.
- Produces (contract): everything under "Render modules", "Interface modules", "One-time wiring: render and interface", "Settings", "Records and the export", "Shared files" and "Fixtures" in the contract.

- [ ] **Step 1: Write the failing tests**

Create `tests/stage3/contract/uiSeams.test.js`:

```js
import { describe, it, expect } from '../../harness.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { UNIT_ID_BASE, unitsAt, drawUnitMarks } from '../../../src/render/units.js';
import { drawFires } from '../../../src/render/fire.js';
import { createAmbient, createFrameGate } from '../../../src/render/ambient.js';
import { createGameLoop } from '../../../src/render/loop.js';
import { createConfirmBar } from '../../../src/ui/confirmBar.js';
import { createPlacement, LINE_TOOLS } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createSettings, DEFAULT_SETTINGS, FIRE_REACTIONS } from '../../../src/ui/settings.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { createDanger } from '../../../src/ui/danger.js';
import { createScoreUi, scoreLineFor, titleDecor } from '../../../src/ui/scoreUi.js';
import { weeklySeed, shareLink, parseShareLink, emojiRow, pictureCard } from '../../../src/ui/share.js';
import { createRecords, emptyRecords, newCityId, mergeRecords } from '../../../src/save/records.js';
import { devScene } from '../../../src/dev/scenes.js';
import { toolForItem } from '../../../src/data/ui.js';
import { SFX } from '../../../src/audio/sfx.js';
import { packSave, unpackSave } from '../../../src/save/serialize.js';
import { createWorld } from '../../../src/sim/world.js';
import { openSheet } from '../../../src/ui/modes.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { T, reasonText, alertText, ALERT_TEXT, FIRE_TEXT, RAID_TEXT, ART_TEXT, DANGER_UI_TEXT, SCORE_TEXT, BALANCE_TEXT } from '../../../src/ui/text.js';
import { el } from '../../../src/ui/components.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { mount, fire } from '../../helpers/dom.js';
import { rigUI, mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
const noStorage = { getItem: () => null, setItem: () => {} };
const STUB_PARTS = ['building', 'house', 'actions', 'summary'];

async function bootRig({ platform = {}, store = createSaveStore({ idb: fakeIndexedDB(), local: null }) } = {}) {
  const shell = await mountShell(1280, 800);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage: noStorage, platform,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('s3 contract render seams', () => {
  it('calls the ambient layer after the terrain, then fire and the units\' marks after the sprites, before effects and overlays', () => {
    const w = makeTestWorld();
    const canvas = makeCanvas(400, 300);
    const renderer = createRenderer({ canvas, dpr: 1 });
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    const order = [];
    const hook = (name) => (g, range) => { order.push(name); expect([name, typeof g.poly, Number.isInteger(range.x0)]).toEqual([name, 'function', true]); };
    renderer.renderFrame(w, cam, {
      view: { width: 400, height: 300 }, ambient: hook('ambient'), fire: hook('fire'), units: hook('units'),
      effects: { draw: () => order.push('effects') }, drawOverlay: () => order.push('overlay'),
    });
    expect(order).toEqual(['ambient', 'fire', 'units', 'effects', 'overlay']);
    renderer.renderFrame(w, cam, { view: { width: 400, height: 300 } });               // every hook is optional
  });
  it('asks the frame gate before drawing each frame, after running the day', () => {
    const w = makeTestWorld();
    w.speed = 1;
    const drawn = [];
    let allow = true;
    const loop = createGameLoop({ world: w, render: ({ now }) => drawn.push(now), allowFrame: () => allow, raf: () => 0, caf: () => {} });
    loop.tick(0); loop.tick(250);
    allow = false;
    loop.tick(500); loop.tick(750);
    expect([drawn, w.day]).toEqual([[0, 250], 1]);                                      // the sim ran on; only the drawing waited
    const gate = createFrameGate();
    gate.noteInput(0);
    expect(gate.allow(5000, true)).toBe(true);                                        // the stub allows every frame (Track C)
  });
  it('starts the fire, units and ambient layers as stubs that draw nothing', () => {
    const w = makeTestWorld();
    expect(UNIT_ID_BASE).toBe(100000);
    expect(unitsAt(w, 0, null)).toEqual([]);
    expect([drawFires(null, w, null, 0), drawUnitMarks(null, w, null, 0, 0)]).toEqual([undefined, undefined]);
    const a = createAmbient({ enabled: () => false });
    a.draw(null, w, null, 0);
    expect(a.stats).toEqual({ ms: 0, dropped: [] });
  });
});

describe('s3 contract interface seams', () => {
  it('hands the renderer the ambient, fire and units hooks and the units with the walkers', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      let seen = null;
      const real = r.renderer.renderFrame;
      r.renderer.renderFrame = (world, cam, opts) => { seen = opts; return real(world, cam, opts); };
      r.frame();
      expect([typeof seen.ambient, typeof seen.fire, typeof seen.units, Array.isArray(seen.walkers)]).toEqual(['function', 'function', 'function', true]);
      expect([typeof r.ui.danger, typeof r.ui.scoreUi, typeof r.ui.ambient.draw, r.ui.allowFrame(0)]).toEqual(['object', 'object', 'function', true]);
    } finally { r.cleanup(); }
  });
  it('builds the danger and score interfaces in the final shape, and routes events, refreshes and sheet parts to them', async () => {
    for (const make of [createDanger, createScoreUi]) {
      const x = make({});
      expect(Object.keys(x).sort()).toEqual(['destroy', 'onAlertAction', 'onCommand', 'onEvents', 'refresh', 'sheetParts', 'sheets']);
      expect(Object.keys(x.sheetParts)).toEqual(STUB_PARTS);
      for (const k of STUB_PARTS) expect(x.sheetParts[k]({ id: 1 })).toEqual([]);
    }
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const log = [];
      r.ui.danger.onEvents = (events) => log.push(['danger', events.length]);
      r.ui.scoreUi.onEvents = (events) => log.push(['score', events.length]);
      r.ui.danger.refresh = () => log.push(['danger refresh']);
      r.ui.scoreUi.refresh = () => log.push(['score refresh']);
      r.ui.onEvents([{ type: 'month' }]);
      r.ui.refresh();
      expect(log).toEqual([['danger', 1], ['score', 1], ['danger refresh'], ['score refresh']]);
      log.length = 0;
      r.ui.danger.onCommand = (e) => log.push(['danger command', e.kind]);
      r.ui.scoreUi.onCommand = (e) => log.push(['score command', e.kind]);
      r.ui.afterCommand({ kind: 'pause', result: { ok: true }, undoable: false });
      expect(log.slice(0, 2)).toEqual([['danger command', 'pause'], ['score command', 'pause']]);
      r.ui.danger.sheetParts.building = (b) => [el('p', { class: 's3-danger-row', text: `fire row ${b.type}` })];
      r.ui.danger.sheetParts.actions = (b) => [el('button', { type: 'button', class: 's3-festival', text: b.type })];
      r.ui.scoreUi.sheetParts.summary = () => [el('section', { class: 's3-score', text: 'Score 0' })];
      r.ui.danger.sheetParts.house = (h) => [el('p', { class: 's3-house-row', text: `home ${h.id}` })];
      const temple = Object.values(r.world.buildings).find((b) => b.type === 'temple');
      r.store.set(openSheet(r.store.get(), 'info', temple.id));
      const sheet = r.root.querySelector('#sheet');
      expect(sheet.querySelector('.s3-danger-row').textContent).toBe('fire row temple');
      expect(sheet.querySelector('.actions').firstElementChild.className).toBe('s3-festival');   // at the front of the actions
      const home = Object.values(r.world.buildings).find((b) => b.type === 'house');
      r.store.set(openSheet(r.store.get(), 'info', home.id));
      expect(sheet.querySelector('.s3-house-row').textContent).toBe(`home ${home.id}`);
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(sheet.querySelector('.s3-score').textContent).toBe('Score 0');
    } finally { r.cleanup(); }
  });
  it('routes an alert\'s second action to both interfaces', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const seen = [];
      r.ui.danger.onAlertAction = (a, kind) => seen.push(['danger', a.code, kind]);
      r.ui.scoreUi.onAlertAction = (a, kind) => seen.push(['score', a.code, kind]);
      r.ui.alerts.action({ code: 'raid_warning' }, 'tribute');
      expect(seen).toEqual([['danger', 'raid_warning', 'tribute'], ['score', 'raid_warning', 'tribute']]);
    } finally { r.cleanup(); }
  });
  it('hides the whole interface in screenshot mode, from the menu, until a tap, Esc or Back, and leaves the speed alone', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.speedControl.set(2);
      r.store.set(openSheet(r.store.get(), 'menu'));
      const items = [...r.root.querySelectorAll('#sheet .menu-list button')].map((b) => b.textContent);
      expect(items.slice(-3)).toEqual([T.howToPlay, T.screenshotMode, T.about]);
      fire(r.root.querySelector('#sheet .screenshot-mode'), 'click');
      expect([r.store.get().screenshot, r.store.get().sheet, document.body.classList.contains('screenshot')]).toEqual([true, null, true]);
      expect(getComputedStyle(r.root.querySelector('#topbar')).display).toBe('none');
      expect(getComputedStyle(r.root.querySelector('#dock')).display).toBe('none');
      expect(r.world.speed).toBe(2);
      r.tap(12, 12);
      expect([r.store.get().screenshot, document.body.classList.contains('screenshot')]).toEqual([false, false]);
      expect(r.store.get().mode).toBe('browse');                                       // the tap only brought the interface back
      r.ui.screenshotMode();
      fire(r.root, 'keydown', { key: 'Escape' });
      expect(r.store.get().screenshot).toBe(false);
      r.ui.screenshotMode();
      expect(r.history.length).toBeGreaterThan(1);                                      // a history entry, so Back closes it
      r.history.back();
      expect(r.store.get().screenshot).toBe(false);
    } finally { r.cleanup(); }
  });
  it('repaints the speed buttons after the sim changes the speed in a batch of events', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.speedControl.set(2);
      expect(r.root.querySelector('.speed-main').getAttribute('aria-label') === T.play).toBe(false);
      r.world.speed = 0;                                                               // what fire.js and raids.js do on a first fire or warning
      r.ui.onEvents([{ type: 'fire', id: 1, covered: false, first: true }]);
      expect(r.root.querySelector('.speed-main').getAttribute('aria-label')).toBe(T.play);
    } finally { r.cleanup(); }
  });
  it('shows soldiers\' pay on its own summary row once soldiers are paid', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.stats.lastMonth = { taxes: 40, wages: 10, upkeep: 5, soldiers: 0, net: 25 };
      r.store.set(openSheet(r.store.get(), 'summary'));
      const rows = () => [...r.root.querySelectorAll('#sheet .row')].map((x) => x.textContent);
      expect(rows().some((t) => t.startsWith(T.soldiersPay))).toBe(false);
      r.world.stats.lastMonth = { taxes: 40, wages: 10, upkeep: 5, soldiers: 16, net: 9 };
      r.ui.refresh();
      expect(rows()).toContain(`${T.soldiersPay}−16`);
    } finally { r.cleanup(); }
  });
});

describe('s3 contract placement seams', () => {
  function rig(gold = 1000) {
    const { root, cleanup } = mount();
    const world = makeTestWorld({ gold });
    setRoad(world, 0, 10, 31, 10);
    world.milestone = 'market_town';
    const store = createStore(INITIAL_UI_STATE);
    const placement = createPlacement({ world, store });
    const bar = createConfirmBar({ container: root, store, placement, onCancel() {}, onConfirm() {}, onUndo() {} });
    return { root, world, store, placement, bar, cleanup };
  }
  it('draws walls with the line tool: tap a start and an end, Flip, and the sim\'s answer in the bar', () => {
    const r = rig();
    try {
      expect(toolForItem('wall')).toEqual({ kind: 'wall' });
      expect(LINE_TOOLS).toEqual(['road', 'wall']);
      r.placement.start(toolForItem('wall'));
      expect(r.store.get().mode).toBe('drawing');
      expect(r.root.querySelector('.title').textContent).toBe('Wall');
      r.placement.pointAt(3, 3);
      r.placement.pointAt(8, 5);
      expect(r.store.get().line).toEqual({ x0: 3, y0: 3, x1: 8, y1: 5, flip: false });
      r.bar.render();
      expect(r.root.querySelector('.flip')).toBeTruthy();
      const p = r.placement.preview();
      expect([p.state, p.text]).toEqual(['bad', reasonText('locked')]);               // the stub previewWall refuses (Track B)
      expect(r.placement.confirm().ok).toBe(false);
      r.placement.dragTo(1, 1, 'start');
      r.placement.dragTo(4, 1, 'move');
      expect(r.store.get().line).toEqual({ x0: 1, y0: 1, x1: 4, y1: 1, flip: false });
    } finally { r.cleanup(); }
  });
  it('carries the score line beside the effect, and none from the stub', () => {
    const r = rig();
    try {
      expect(scoreLineFor(r.world, 'well', 3, 9)).toBe('');
      r.placement.start({ kind: 'building', type: 'well' }, { x: 12, y: 9 });
      expect(r.placement.preview().score).toBe('');
      const { root, cleanup } = mount();
      const store = createStore({ ...INITIAL_UI_STATE, mode: 'placing', tool: { kind: 'building', type: 'well' } });
      const fake = { preview: () => ({ state: 'ok', reason: null, text: '', effect: 'Gives water to 2 homes', score: '+3 Culture', cost: 30, refund: 0, nicer: '' }), canUndo: () => false, flip() {} };
      createConfirmBar({ container: root, store, placement: fake, onCancel() {}, onConfirm() {}, onUndo() {} });
      expect(root.querySelector('.effect').textContent).toBe('Gives water to 2 homes · +3 Culture');
      cleanup();
    } finally { r.cleanup(); }
  });
  it('refuses a demolish whose rubble clearing would cross the debt floor, in the bar', () => {
    const r = rig(-498);
    try {
      addRaw(r.world, 'rubble', 12, 9);
      r.placement.start({ kind: 'demolish' });
      r.placement.pointAt(12, 9);
      r.placement.pointAt(12, 9);
      const p = r.placement.preview();
      expect([p.state, p.reason]).toEqual(['bad', 'no_gold']);
    } finally { r.cleanup(); }
  });
});

describe('s3 contract settings, title, sound and words', () => {
  it('keeps Ambient motion (on) and On a fire (Just tell me) in settings, and only their own values', () => {
    expect([DEFAULT_SETTINGS.ambient, DEFAULT_SETTINGS.fireReaction, FIRE_REACTIONS]).toEqual([true, 'inform', ['pause', 'goto', 'inform']]);
    const data = {};
    const storage = { getItem: (k) => data[k] || null, setItem: (k, v) => { data[k] = v; } };
    const { root, cleanup } = mount();
    try {
      const s = createSettings({ storage, root, systemReducedMotion: () => false });
      s.set({ ambient: false, fireReaction: 'goto' });
      s.set({ ambient: 'no', fireReaction: 'panic', difficulty: 'peaceful' });
      expect([s.get().ambient, s.get().fireReaction, s.get().difficulty]).toEqual([false, 'goto', 'peaceful']);
      expect(createSettings({ storage, root, systemReducedMotion: () => false }).get().fireReaction).toBe('goto');
    } finally { cleanup(); }
  });
  it('lets the score interface decorate the title card once, with its buttons', () => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    try {
      const calls = [];
      createTitleCard({ container: root.querySelector('#title'), hasSave: true, onContinue() {}, onNewCity() {}, onSound() {},
        decorate: (element, parts) => calls.push([element.classList.contains('title-card'), parts.buttonBox.classList.contains('title-buttons'), parts.newCity.classList.contains('new-city')]) });
      expect(calls).toEqual([[true, true, true]]);
      expect(typeof titleDecor({})).toBe('function');
    } finally { cleanup(); }
  });
  it('builds the raid horn from three low notes and the coin tick from one short quiet high note', () => {
    expect(SFX.horn.length).toBe(3);
    for (const n of SFX.horn) expect([n.f < 200, n.d <= 0.4, n.g <= 0.35]).toEqual([true, true, true]);
    expect(SFX.coin.length).toBe(1);
    expect([SFX.coin[0].f > 1000, SFX.coin[0].d <= 0.1, SFX.coin[0].g <= 0.15]).toEqual([true, true, true]);
  });
  it('gives every track its own words object, and the contract its own words', () => {
    for (const o of [FIRE_TEXT, RAID_TEXT, ART_TEXT, DANGER_UI_TEXT, SCORE_TEXT, BALANCE_TEXT]) expect(o !== null && typeof o === 'object').toBe(true);
    expect([T.soldiersPay, T.wallBuilt, reasonText('no_rubble')]).toEqual(["Soldiers' pay", 'Wall built', 'No rubble here']);
  });
  it('lets a track word its own alert codes through ALERT_TEXT, the one table alertText reads first', () => {
    const w = makeTestWorld();
    const potter = addRaw(w, 'potter', 2, 11);
    expect(alertText({ code: 's3_test', id: potter.id }, w).title).toBe('Something needs attention');
    ALERT_TEXT.s3_test = (a, world, b, name) => ({ title: `${name} test ${b.id}`, fix: 'Do it' });
    try {
      expect(alertText({ code: 's3_test', id: potter.id }, w)).toEqual({ title: `Potter test ${potter.id}`, fix: 'Do it' });
      expect(alertText({ code: 'debt' }, w).title).toBe('The treasury is in debt');                // the rest as before
    } finally { delete ALERT_TEXT.s3_test; }
  });
});

describe('s3 contract records, sharing and boot', () => {
  it('carries the device\'s records in an export beside the world, and none in an autosave', () => {
    const w = createWorld({ seed: 5 });
    const recs = { ...emptyRecords(), cities: [{ id: 'a' }] };
    expect(unpackSave(packSave(w, { savedAt: 1, lastSpeed: 2, records: recs })).records).toEqual(recs);
    expect(unpackSave(packSave(w, { savedAt: 1, lastSpeed: 2 })).records).toBe(null);
    expect('records' in JSON.parse(packSave(w))).toBe(false);
    expect(unpackSave(JSON.stringify(w)).records).toBe(null);                          // a bare world
  });
  it('starts the records and sharing as stubs with their final shapes', () => {
    expect(emptyRecords()).toEqual({ version: 1, cities: [], chronicle: [] });
    const recs = createRecords({ storage: noStorage });
    expect(recs.load()).toEqual(emptyRecords());
    expect(recs.bests()).toEqual([]);
    expect(mergeRecords(emptyRecords(), emptyRecords())).toEqual(emptyRecords());
    expect(/^[0-9a-z]+-[0-9a-z]{4}$/.test(newCityId(1760000000000, () => 0.5))).toBe(true);
    expect(newCityId(1760000000000, () => 0.5)).toBe(newCityId(1760000000000, () => 0.5));
    expect([weeklySeed(new Date(2026, 9, 11)), shareLink({}), parseShareLink('#x'), emojiRow({}), pictureCard(null, null)]).toEqual([0, '', null, '', null]);
  });
  it('shows the dev scene hook before the game, keeps it in the game, gives each city an id, and writes and carries records', async () => {
    const downloaded = [];
    const r = await bootRig({ platform: { share: null, canShare: null, download: (f) => downloaded.push(f) } });
    try {
      expect(r.api.phase()).toBe('title');
      expect(await window.__thebes.devScene('fire')).toBe('stub');
      expect(await devScene(r.api, 'fire')).toBe('stub');
      expect(r.api.hooks.records).toBe(r.api.records);                                 // for Seal this reign
      const noted = [];
      r.api.records.noteCity = (world) => noted.push(world.cityId);
      fire(r.root.querySelector('#title .new-city'), 'click');
      const g = r.api.game();
      expect(typeof g.world.cityId).toBe('string');
      expect([window.__thebes.world, typeof window.__thebes.devScene]).toEqual([g.world, 'function']);
      await flush(); await flush();
      expect(noted).toEqual([g.world.cityId]);                                         // the new city's first autosave noted it
      await r.api.hooks.exportCity();
      const text = await downloaded[0].text();
      expect(JSON.parse(text).records).toEqual(emptyRecords());
    } finally { r.cleanup(); }
  });
  it('gives a loaded city without an id its own, and merges an imported file\'s records', async () => {
    const old = createWorld({ seed: 6 });
    const file = new File([packSave(old, { savedAt: 1, lastSpeed: 1, records: { ...emptyRecords(), cities: [{ id: 'z' }] } })], 'c.json', { type: 'application/json' });
    const r = await bootRig({ platform: { pick: async () => file } });
    try {
      const merged = [];
      r.api.records.merge = (other) => merged.push(other.cities.map((c) => c.id));
      await r.api.hooks.importCity();
      expect(merged).toEqual([['z']]);
      expect(typeof r.api.game().world.cityId).toBe('string');
    } finally { r.cleanup(); }
  });
});
```


In `tests/stage3/contract.all.js`, replace:

```js
import './contract/migrateV4.test.js';
import './contract/simSeams.test.js';
```

with:

```js
import './contract/migrateV4.test.js';
import './contract/simSeams.test.js';
import './contract/uiSeams.test.js';
```


The calm switch's test and the fixture's raider entries (`makeTestWorld` gains `raiderEntries`, used by Track B's tests):

In `tests/stage3/contract/simSeams.test.js`, replace:

```js
    expect(splitMonths(w)).toEqual({ town: 3, market_town: 3, city: null, great_city: null, capital: null });
  });
  it('lists fire and raid alerts with the rest, and settles feats after every command', () => {
    const w = street();
```

with:

```js
    expect(splitMonths(w)).toEqual({ town: 3, market_town: 3, city: null, great_city: null, capital: null });
  });
  it('skips fire and raids for a calm world, the test-only switch the long runs and sample cities carry until Track F', () => {
    const w = street();
    expect('calm' in w).toBe(false);                                                // never set by the game
    w.calm = true;
    tickDay(w, []);
    expect(w.day).toBe(1);
    expect(JSON.parse(JSON.stringify(w)).calm).toBe(true);
    expect(makeTestWorld({ raiderEntries: [{ x: 31, y: 16 }] }).raiderEntries).toEqual([{ x: 31, y: 16 }]);   // the fixture's entries for raid tests
  });
  it('lists fire and raid alerts with the rest, and settles feats after every command', () => {
    const w = street();
```


In `tests/helpers/testWorld.js`, replace:

```js
import { idx } from '../../src/sim/grid.js';

export function makeTestWorld({ size = 32, fertile = [[0, 0, 8, 32]], gold = 100000 } = {}) {
  const terrain = new Array(size * size).fill(T.DESERT);
  for (const [fx, fy, fw, fd] of fertile) {
    for (let y = fy; y < fy + fd; y++) for (let x = fx; x < fx + fw; x++) terrain[idx(size, x, y)] = T.FERTILE;
  }
  const map = { size, terrain, tradeEntry: { x: size - 1, y: size - 1 }, startRoad: [], focus: { x: size >> 1, y: size >> 1 }, raiderEntries: [] };
  const world = createWorld({ seed: 1, size, map });
  world.gold = gold;
```

with:

```js
import { idx } from '../../src/sim/grid.js';

// raiderEntries (Stage 3): the map's raider entry points, [{ x, y }, ...] on its edges; none by default.
export function makeTestWorld({ size = 32, fertile = [[0, 0, 8, 32]], gold = 100000, raiderEntries = [] } = {}) {
  const terrain = new Array(size * size).fill(T.DESERT);
  for (const [fx, fy, fw, fd] of fertile) {
    for (let y = fy; y < fy + fd; y++) for (let x = fx; x < fx + fw; x++) terrain[idx(size, x, y)] = T.FERTILE;
  }
  const map = { size, terrain, tradeEntry: { x: size - 1, y: size - 1 }, startRoad: [], focus: { x: size >> 1, y: size >> 1 }, raiderEntries };
  const world = createWorld({ seed: 1, size, map });
  world.gold = gold;
```


- [ ] **Step 2: Run them to see them fail**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "s3 contract" -WaitSeconds 120
```

Expected: `LOAD ERROR` (`src/render/units.js` and the other new modules do not exist yet), exit code 1.

- [ ] **Step 3: Implement**

The render stubs, each called by the renderer through one hook:

Create `src/render/fire.js`:

```js
// Flames and smoke (spec 5.4), drawn from the world's fire state (b.fire, src/sim/fire.js), so they survive a reload.
// Stage 3 contract: Track C implements the STUB. createUI passes it to renderFrame as opts.fire, which calls it once a
// frame in art px (the camera's origin set) after the depth-sorted sprites and before the effects and overlays.
//
// STUB. Draws every burning building in range: a blaze as one small flame on the roof, a fire as three larger flames and
// a column of soft smoke puffs; shape changes at 2 Hz or less, never a brightness flash or a saturated-red flash. Under
// reduced motion: a still flame icon and the word "Burning". now: the frame's time in ms (the real clock).
export function drawFires(g, world, range, now, { reducedMotion = false } = {}) {}
```


Create `src/render/units.js`:

```js
// Raiders and soldiers (spec 5.4). Stage 3 contract: Track C implements the STUBs. Units are depth-sorted with the
// walkers: createUI appends unitsAt's entries to the walkers list it hands renderFrame, which draws each as the figure
// slot fig.<kind> (src/render/art/figures.js gains 'raider' and 'soldier'). Health bars and arrows are drawn on top by
// drawUnitMarks, which renderFrame calls as opts.units after the sprites (art px).

// Unit ids in the walkers list are UNIT_ID_BASE + the unit's id, so they never meet a walker's (a building id).
export const UNIT_ID_BASE = 100000;

// STUB. The units in range as walker entries: { id: UNIT_ID_BASE + unit id, kind: 'raider' | 'soldier', x, y, dir },
// moving smoothly between days (timeDays is the day plus the frame's fraction). Raiders come from world.raid.active,
// soldiers from world.soldiers.
export function unitsAt(world, timeDays, range = null) {
  return [];
}

// STUB. Health bars over units that have been hit, and the day's tower arrows (world.raid.active.shots) as thin strokes
// that fly for 0.3 s, or a still line for a moment under reduced motion.
export function drawUnitMarks(g, world, range, timeDays, now, { reducedMotion = false } = {}) {}
```


Create `src/render/ambient.js`:

```js
// Ambient life (spec 5.6): water glints, bank ripples, reed and tree sway, crop ripple, smoke, and rare birds, feluccas
// and ducks, on the real clock, out of step by tile hash, over the baked terrain for visible tiles only. Numbers in
// src/data/ambient.js. Stage 3 contract: Track C implements the STUBs. createUI makes one per game and passes its draw to
// renderFrame as opts.ambient, which calls it once a frame in art px right after the terrain chunks.
import { AMBIENT } from '../data/ambient.js';

// The idle frame rate (spec 5.6): paused, with no input for idleAfterMs, frames are capped at fpsCap. createUI notes every
// pointer, key and wheel input and the game loop asks allow(now, paused) before drawing a frame (it still runs the sim).
// STUB: every frame is allowed.
export function createFrameGate({ idleAfterMs = AMBIENT.idleAfterMs, fpsCap = AMBIENT.idleFpsCap } = {}) {
  return {
    noteInput(now) {},
    allow(now, paused) { return true; },
  };
}
//
// enabled() says whether to draw at all: the Ambient motion setting and not reduced motion (createUI decides).
export function createAmbient({ enabled = () => true } = {}) {
  return {
    // STUB. Draws the ambient layer for the tiles in range at time now (ms), within the frame budget, dropping rare life,
    // then smoke, then sway when over it (the water stays). Draws nothing while enabled() is false.
    draw(g, world, range, now) {},
    // What the last frame drew and cost: { ms, dropped } (dropped: the kinds left out to keep the budget).
    stats: { ms: 0, dropped: [] },
  };
}
```


In `src/render/renderer.js`, replace:

```js
    const rising = opts.rising || null;   // building ids only: tree and walker ids start at 1e6
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    for (const o of objects) {
      if (!o.def) continue;
```

with:

```js
    const rising = opts.rising || null;   // building ids only: tree and walker ids start at 1e6
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    if (opts.ambient) opts.ambient(g, range);              // Stage 3: ambient life over the terrain (render/ambient.js)
    for (const o of objects) {
      if (!o.def) continue;
```

In `src/render/renderer.js`, replace:

```js
    }

    // 4. Effects, overlays and the placement grid, back in art px.
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    if (opts.effects) opts.effects.draw(g, opts.now === undefined ? performance.now() : opts.now, world);
    if (opts.drawOverlay) opts.drawOverlay(g, range);
```

with:

```js
    }

    // 4. Fire and the units' marks (Stage 3: render/fire.js, render/units.js), effects, overlays and the placement grid,
    // back in art px.
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    if (opts.fire) opts.fire(g, range);
    if (opts.units) opts.units(g, range);
    if (opts.effects) opts.effects.draw(g, opts.now === undefined ? performance.now() : opts.now, world);
    if (opts.drawOverlay) opts.drawOverlay(g, range);
```


The game loop asks a frame gate before it draws (the idle frame-rate cap of spec 5.6; Track C fills in `createFrameGate`):

In `src/render/loop.js`, replace:

```js
export const MAX_DAYS_PER_FRAME = 12;

export function createGameLoop({ world, render, onEvents = null, raf = (fn) => requestAnimationFrame(fn), caf = (id) => cancelAnimationFrame(id) }) {
  let last = null, acc = 0, handle = null, running = false;
  const events = [];
```

with:

```js
export const MAX_DAYS_PER_FRAME = 12;

// allowFrame (Stage 3): asked each frame, after the sim's days, whether to draw it (the idle frame-rate cap, spec 5.6).
export function createGameLoop({ world, render, onEvents = null, allowFrame = null, raf = (fn) => requestAnimationFrame(fn), caf = (id) => cancelAnimationFrame(id) }) {
  let last = null, acc = 0, handle = null, running = false;
  const events = [];
```

In `src/render/loop.js`, replace:

```js
      events.length = 0;
    }
    render({ timeDays: world.day + acc, dt, steps, now: t });
  }
```

with:

```js
      events.length = 0;
    }
    if (allowFrame && !allowFrame(t)) return;
    render({ timeDays: world.day + acc, dt, steps, now: t });
  }
```


The interface stubs. `createDanger` (Track D) and `createScoreUi` (Track E) return the same shape; `scoreLineFor` is the confirm bar's "+N" seam and `titleDecor` the title card's:

Create `src/ui/danger.js`:

```js
// The danger interface (spec 4.3, 4.12, 4.13, 6.3): the speed reactions and the On a fire setting, the raid horn and the
// coin tick, the tribute confirmation sheet, the festival button, the fire row and the defence rows on building sheets,
// and the last raid's report in the summary. Stage 3 contract: Track D implements createDanger; createUI makes one per
// game (after the alerts, speed control and toasts, before the sheets) and calls it only through this shape.
//
// ctx: { world, store, settings, sfx, toasts, celebrations, effects, cameraControl, speedControl, alerts, root, doc, now,
// clock, hooks, afterCommand, refresh, onView, showMeAt, selectBuilding }. createDanger must not call refresh or
// afterCommand while it is being created (the sheets do not exist yet); every later call is fine.
//
// Returns:
//   sheets      custom sheet kinds it owns -> render(body, { close }) (createSheets' custom sheets; the heading is
//               T[kind], so each kind it adds needs a T entry in Track D's section of text.js)
//   sheetParts  { building(b), house(h), actions(b), summary() }, each returning an array of DOM nodes (empty for none):
//               rows after a building sheet's reach row, rows after a home's checklist, buttons at the front of a
//               building sheet's actions, and nodes in the summary after the goals
//   onEvents(events)  every batch of sim events: the loop's and those settle returns after a command
//   refresh()   after every command and every game day, once the alerts and the chrome are up to date
//   onAlertAction(alert, action)  an alert's button other than View was pressed (alerts.action; 'tribute' for Pay tribute)
//   onCommand(e)  after every command, with createUI's afterCommand record ({ kind, result, text, undoable }), before the
//               settle (a placed well's ripple, a tip on placing a firehouse)
//   destroy()   when the interface goes
// ctx.screenshotMode() enters screenshot mode (the store's screenshot flag; Back, Esc, a tap or a click leaves it).
// ctx.fireTip(trigger) asks for a tip (src/data/tips.js triggers), as createUI does for its own.
export function createDanger(ctx) {
  return {
    sheets: {},
    sheetParts: { building: () => [], house: () => [], actions: () => [], summary: () => [] },
    onEvents() {},
    refresh() {},
    onAlertAction() {},
    onCommand() {},
    destroy() {},
  };
}
```


Create `src/ui/scoreUi.js`:

```js
// The score interface (spec 4.1, 4.17, 4.19): the summary's score section with Seal this reign and Share score, the
// score chip on the summary button, the next-threshold bar, the "+N" score preview in the confirm bar, feats, citizen
// remarks, and the title card's records, stamps, weekly seed and shared score. Stage 3 contract: Track E implements the
// STUBs; createUI makes one per game exactly as it makes the danger interface (src/ui/danger.js: the same ctx, the same
// returned shape), and boot.js decorates the title card through titleDecor.
//
// STUB. Returns { sheets, sheetParts: { building, house, actions, summary }, onEvents, refresh, onAlertAction, onCommand,
// destroy } (danger.js). Share score's screenshot button calls ctx.screenshotMode().
export function createScoreUi(ctx) {
  return {
    sheets: {},
    sheetParts: { building: () => [], house: () => [], actions: () => [], summary: () => [] },
    onEvents() {},
    refresh() {},
    onAlertAction() {},
    onCommand() {},
    destroy() {},
  };
}

// STUB. The confirm bar's score line for a building ghost that can be placed at (x, y): the parts it would change by 1
// point or more, counting it as staffed ("+3 Culture"), or '' for none. placement.js calls it for every preview, so it
// memoises on the ghost tile and the city's state, as nicerFor does.
export function scoreLineFor(world, type, x, y) {
  return '';
}

// STUB. The title card's decoration (spec 4.1, 4.19): the three highest bests and a stamp per sealed reign under
// Continue, This week's Nile, and a shared score link's "Beat N?" with Start this seed. boot.js calls titleDecor once per
// title card and passes the result to createTitleCard as decorate, which calls it with (element, { buttonBox, newCity }).
// opts: { records (src/save/records.js), shared (the page's location hash, '' for none), startSeed(seed) (starts a
// city on that seed, asking first when a city is saved, as New city does), clock }.
export function titleDecor(opts) {
  return () => {};
}
```


Create `src/ui/share.js`:

```js
// Sharing a score (spec 4.19): the weekly seed, the share link and its check, the emoji row and the picture card. Opt-in
// only, labelled "friends' honour". Stage 3 contract: Track E implements the STUBs. The interface reads the date; the
// sim never does.
//
// STUB. This week's Nile: ISO week-year x 100 + ISO week number of the local date (week 41 of 2026 is 202641).
export function weeklySeed(date) {
  return 0;
}

// STUB. The share link for a score: SHARE.base + '#t1.<seed>.<p|r|n|h>.<parts joined by ->.<months to each milestone
// joined by -, x where not reached>.<4 base-36 check characters>'.
export function shareLink({ seed, difficulty, parts, splits }) {
  return '';
}

// STUB. Reads a location hash: { ok: true, seed, difficulty, parts, splits } for a good link, { ok: false, reason }
// ('bad_check', 'newer_format', 'malformed') otherwise, and null for a hash that is not a share link at all.
export function parseShareLink(hash) {
  return null;
}

// STUB. One line per part, a square per 20 points ("People 🟩🟩🟩⬜⬜"), joined with new lines.
export function emojiRow(parts) {
  return '';
}

// STUB. The 1200x630 picture card as a canvas (the city, the four bars, the medal, the seed and level, "friends' honour").
export function pictureCard(world, score, { createCanvas } = {}) {
  return null;
}
```


Create `src/save/records.js`:

```js
// Records on the device (spec 4.19): localStorage RECORDS_KEY ('thebes.records'), separate from the save and read and
// written inside try/catch, so private browsing never breaks the game. Stage 3 contract: Track 0 fixed the API and the
// top-level shape; Track E implements the STUBs and the rows' fields.
//   { version: 1, cities: [ { id, seed, difficulty, scoreVersion, best, splits, updated } ],
//     chronicle: [ { id, cityId, seed, difficulty, day, score, parts, splits, medal, feats, version, date } ] }
// Each list keeps at most RECORDS_MAX (the oldest go first, never a best). boot.js writes a city row on every save,
// export carries the records beside the world (packSave's records) and import merges them by id.
import { RECORDS_KEY } from '../data/scoring.js';

export const RECORDS_VERSION = 1;
export const emptyRecords = () => ({ version: RECORDS_VERSION, cities: [], chronicle: [] });

function defaultStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}

// A new city's id (spec 4.19: given by the interface, never by the sim): the time in base 36 and a random tail.
export function newCityId(now = Date.now(), rand = Math.random) {
  return `${Math.floor(now).toString(36)}-${Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0')}`;
}

// STUB. Two records merged by id (a city row keeps its better best and earlier splits; chronicle entries are unique).
export function mergeRecords(a, b) {
  return a || emptyRecords();
}

export function createRecords({ storage = defaultStorage(), key = RECORDS_KEY } = {}) {
  return {
    // STUB. What the device holds, or emptyRecords() when nothing, unreadable or blocked.
    load() { return emptyRecords(); },
    // STUB. After every save: updates this city's row (seed, difficulty, score version, best month-end score, splits).
    noteCity(world, now) {},
    // STUB. After Seal this reign: adds a chronicle entry for the seal (sealReign's seal), with the device's date.
    addSeal(world, seal, now) {},
    // STUB. Import: merges records from an exported file into the device's own.
    merge(other) {},
    // STUB. The three highest bests per seed and difficulty, for the title card.
    bests(n = 3) { return []; },
  };
}
```


Create `src/dev/scenes.js`:

```js
// Development scenes for the Stage 3 screenshots (tools/shots.ps1 -Stage3): window.__thebes.devScene(name) sets up one
// scene and resolves when it is ready to capture. boot.js exposes devScene before the title card shows. Stage 3 contract:
// a stub that resolves 'stub'; the integrator fills in the scenes ('peaceful', 'fire', 'tribute', 'battle', 'score',
// 'ambient') in Track F. api is boot's returned object ({ phase, game, startGame, hooks }).
export async function devScene(api, name) {
  return 'stub';
}
```


Screenshot mode (spec 4.19, 6.4) is the interface's own: a store flag that hides the whole interface, one history step so Back leaves it, and the ☰ menu's item; a tap, a click or Esc leaves it too. Alerts gain a second action (Pay tribute) routed to the interfaces:

In `src/ui/store.js`, replace:

```js
  lastSpeed: 1,
  confirmDialog: null,
};
```

with:

```js
  lastSpeed: 1,
  confirmDialog: null,
  screenshot: false,     // Stage 3: screenshot mode hides the whole interface until the next tap, click, Esc or Back
};
```


In `src/ui/modes.js`, replace:

```js
}

export function back(state) {
  if (state.confirmDialog) return { confirmDialog: null };
  if (state.sheet && state.sheet.kind !== 'info') return afterPanel(state);
```

with:

```js
}

// Screenshot mode (spec 4.19, 6.4): the whole interface hides, with nothing open behind it; the speed is left alone.
export function enterScreenshot(state) {
  return { ...CLEAR_TOOL, mode: 'browse', selectedId: null, sheet: null, confirmDialog: null, screenshot: true };
}

export function back(state) {
  if (state.screenshot) return { screenshot: false };
  if (state.confirmDialog) return { confirmDialog: null };
  if (state.sheet && state.sheet.kind !== 'info') return afterPanel(state);
```


In `src/ui/backstack.js`, replace:

```js
import { back, isToolMode } from './modes.js';

const stepsOf = (s) => (s.confirmDialog ? 1 : 0) + (s.sheet && s.sheet.kind !== 'info' ? 1 : 0) + (isToolMode(s.mode) ? 1 : 0) + (s.mode === 'selected' ? 1 : 0);

export function createBackStack({
```

with:

```js
import { back, isToolMode } from './modes.js';

const stepsOf = (s) => (s.confirmDialog ? 1 : 0) + (s.sheet && s.sheet.kind !== 'info' ? 1 : 0) + (isToolMode(s.mode) ? 1 : 0) + (s.mode === 'selected' ? 1 : 0)
  + (s.screenshot ? 1 : 0);

export function createBackStack({
```


In `src/ui/menu.js`, replace:

```js
// canResumeGuide / onResumeGuide come from createUI: How to play offers "Resume guide" while the guide is off
// and one of its steps is open, under Help: Guide and tips only (early-game pass 3.2).
export function createMenuSheets({ store, settings, toasts, hooks = {}, onNewCity = () => {}, version = APP_VERSION, canResumeGuide = () => false, onResumeGuide = () => {} }) {
  const open = (kind) => store.set(openSheet(store.get(), kind));
  const hookOr = (name) => () => { if (typeof hooks[name] === 'function') hooks[name](); else toasts.show(T.notYet); };
```

with:

```js
// canResumeGuide / onResumeGuide come from createUI: How to play offers "Resume guide" while the guide is off
// and one of its steps is open, under Help: Guide and tips only (early-game pass 3.2).
// onScreenshot (Stage 3, spec 6.3): the menu's Screenshot mode; createUI enters the mode.
export function createMenuSheets({ store, settings, toasts, hooks = {}, onNewCity = () => {}, version = APP_VERSION, canResumeGuide = () => false, onResumeGuide = () => {}, onScreenshot = null }) {
  const open = (kind) => store.set(openSheet(store.get(), kind));
  const hookOr = (name) => () => { if (typeof hooks[name] === 'function') hooks[name](); else toasts.show(T.notYet); };
```

In `src/ui/menu.js`, replace:

```js
      button(T.settings, { onClick: () => open('settings') }),
      button(T.howToPlay, { onClick: () => open('help') }),
      button(T.about, { onClick: () => open('about') }),
    ]));
```

with:

```js
      button(T.settings, { onClick: () => open('settings') }),
      button(T.howToPlay, { onClick: () => open('help') }),
      typeof onScreenshot === 'function' ? button(T.screenshotMode, { class: 'screenshot-mode', onClick: onScreenshot }) : null,
      button(T.about, { onClick: () => open('about') }),
    ]));
```


In `src/ui/alerts.js`, replace:

```js
}

export function createAlerts({ world, banner, live, onView = () => {}, onNewCritical = () => {}, root = document.body, getAlerts = () => alertsFor(world) }) {
  let current = { all: [], critical: [], ordinary: [] };
  let lastKeys = null;
```

with:

```js
}

// onAction (Stage 3): a button on an alert other than View (the raid warning's Pay tribute), as onAction(alert, action).
export function createAlerts({ world, banner, live, onView = () => {}, onAction = () => {}, onNewCritical = () => {}, root = document.body, getAlerts = () => alertsFor(world) }) {
  let current = { all: [], critical: [], ordinary: [] };
  let lastKeys = null;
```

In `src/ui/alerts.js`, replace:

```js
    list: () => current.all,
    critical: () => current.critical,
  };
}
```

with:

```js
    list: () => current.all,
    critical: () => current.critical,
    action: (alert, kind) => onAction(alert, kind),
  };
}
```


`createUI` makes the two interfaces once (before the menus, so the menu has Screenshot mode), routes every command, every batch of events, every refresh and every alert action to them, hands their sheet parts to the sheets, repaints the speed buttons after events (the sim may have paused), gives the renderer the ambient, fire and units hooks, and notes input for the frame gate:

In `src/ui/createUI.js`, replace:

```js
import { GOLD } from '../render/art/palette.js';
import { createStore, INITIAL_UI_STATE } from './store.js';
import { select, deselect, back, openSheet, closeSheet, setDock, isToolMode, pickCategory } from './modes.js';
import { pickLayout, watchLayout } from './layout.js';
import { createBackStack } from './backstack.js';
```

with:

```js
import { GOLD } from '../render/art/palette.js';
import { createStore, INITIAL_UI_STATE } from './store.js';
import { select, deselect, back, openSheet, closeSheet, setDock, isToolMode, pickCategory, enterScreenshot } from './modes.js';
import { pickLayout, watchLayout } from './layout.js';
import { createBackStack } from './backstack.js';
```

In `src/ui/createUI.js`, replace:

```js
import { createGuide, canResumeGuide } from './guide.js';
import { el, setText, clear } from './components.js';
import { buildingName, reasonText, milestoneText, caravanText, FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, T } from './text.js';
```

with:

```js
import { createGuide, canResumeGuide } from './guide.js';
import { el, setText, clear } from './components.js';
import { createDanger } from './danger.js';
import { createScoreUi } from './scoreUi.js';
import { unitsAt, drawUnitMarks } from '../render/units.js';
import { drawFires } from '../render/fire.js';
import { createAmbient, createFrameGate } from '../render/ambient.js';
import { buildingName, reasonText, milestoneText, caravanText, FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, T } from './text.js';
```

In `src/ui/createUI.js`, replace:

```js
  // Ghost and day bookkeeping lives up here: afterCommand is hoisted and may run during construction.
  let lastDay = world.day, ghostsDirty = true, ghostState = null, ghostList = [], tintList = [];
  let saveFailed = false, destroyed = false;
  // Daily goals (spec 3.7) come from the device's local date, read once when this game starts, so nothing expires
```

with:

```js
  // Ghost and day bookkeeping lives up here: afterCommand is hoisted and may run during construction.
  let lastDay = world.day, ghostsDirty = true, ghostState = null, ghostList = [], tintList = [];
  // Stage 3: the danger and score interfaces, made below once their context exists. Until then (afterCommand can run
  // during construction) seams() is empty, so nothing calls them early.
  let danger = null, scoreUi = null;
  const seams = () => [danger, scoreUi].filter(Boolean);
  let saveFailed = false, destroyed = false;
  // Daily goals (spec 3.7) come from the device's local date, read once when this game starts, so nothing expires
```

In `src/ui/createUI.js`, replace:

```js
  const placement = createPlacement({ world, store, afterCommand, effects, now });
  const speedControl = createSpeedControl({ world, store, afterCommand, onPausedHidden: () => toasts.show(T.pausedHidden), doc });
  const alerts = createAlerts({ world, banner: $('banner'), live: $('live'), onView: viewAlert, onNewCritical: () => sfx.play('alert'), root, getAlerts: () => (saveFailed ? [...alertsFor(world), { code: 'save_failed' }] : alertsFor(world)) });
  // Web Audio needs a user gesture before it plays (spec 5.5). A touch pointerdown is not an activation event
  // (pointerup and keydown are), so all three listen; they go once the context is running. While sound is off,
```

with:

```js
  const placement = createPlacement({ world, store, afterCommand, effects, now });
  const speedControl = createSpeedControl({ world, store, afterCommand, onPausedHidden: () => toasts.show(T.pausedHidden), doc });
  const alerts = createAlerts({
    world, banner: $('banner'), live: $('live'), onView: viewAlert, onNewCritical: () => sfx.play('alert'), root,
    onAction: (a, kind) => { for (const s of seams()) s.onAlertAction(a, kind); },   // Stage 3: Pay tribute and the like
    getAlerts: () => (saveFailed ? [...alertsFor(world), { code: 'save_failed' }] : alertsFor(world)),
  });
  // Web Audio needs a user gesture before it plays (spec 5.5). A touch pointerdown is not an activation event
  // (pointerup and keydown are), so all three listen; they go once the context is running. While sound is off,
```

In `src/ui/createUI.js`, replace:

```js
  const onGesture = () => { if (sfx.unlock()) for (const t of GESTURES) root.removeEventListener(t, onGesture); };
  for (const t of GESTURES) root.addEventListener(t, onGesture);
  const panelMinimap = createMinimap({ world, cam, view, size: 160, dpr: renderer.dpr });
  const sheetMinimap = createMinimap({ world, cam, view, size: 200, dpr: renderer.dpr });
```

with:

```js
  const onGesture = () => { if (sfx.unlock()) for (const t of GESTURES) root.removeEventListener(t, onGesture); };
  for (const t of GESTURES) root.addEventListener(t, onGesture);
  // Stage 3: the idle frame-rate cap (spec 5.6, render/ambient.js) counts from the last input.
  const frameGate = createFrameGate();
  const INPUTS = ['pointerdown', 'keydown', 'wheel'];
  const onInput = () => frameGate.noteInput(now());
  for (const t of INPUTS) root.addEventListener(t, onInput);
  const panelMinimap = createMinimap({ world, cam, view, size: 160, dpr: renderer.dpr });
  const sheetMinimap = createMinimap({ world, cam, view, size: 200, dpr: renderer.dpr });
```

In `src/ui/createUI.js`, replace:

```js
  const goalsStrip = createGoalsStrip({ container: $('goals'), world, onShowMe: showMe, onOpen: () => toggleSheet('goals'), onSkipGuide: skipGuide });
  $('goals').append(nudgeRegion);                      // the nudge's one line sits under the strip and hides with it (early-game pass 3.5)
  const menus = createMenuSheets({
    store, settings, toasts, hooks, onNewCity: typeof hooks.newCity === 'function' ? hooks.newCity : () => {},
    canResumeGuide: () => canResumeGuide(world, settings.get().help), onResumeGuide: () => { setGuide(world, true); refresh(); },
  });
  // Choosing Tips only or Off turns a running guide off at once (spec 3.1: all of it can be switched off).
```

with:

```js
  const goalsStrip = createGoalsStrip({ container: $('goals'), world, onShowMe: showMe, onOpen: () => toggleSheet('goals'), onSkipGuide: skipGuide });
  $('goals').append(nudgeRegion);                      // the nudge's one line sits under the strip and hides with it (early-game pass 3.5)
  // Stage 3 seams (the Stage 3 plan's contract): the danger interface (Track D, ui/danger.js) and the score interface
  // (Track E, ui/scoreUi.js) plug in here, each as one object with its own sheets, sheet parts, event, refresh and
  // alert-action hooks. Screenshot mode (spec 4.19) is the interface's own; both may enter it through the context.
  const screenshotMode = () => store.set(enterScreenshot(store.get()));
  const seamCtx = {
    world, store, settings, sfx, toasts, celebrations, effects, cameraControl, speedControl, alerts, root, doc, now, clock, hooks,
    afterCommand, refresh, onView: viewAlert, showMeAt, selectBuilding, screenshotMode, fireTip,
  };
  danger = createDanger(seamCtx);
  scoreUi = createScoreUi(seamCtx);
  const ambient = createAmbient({ enabled: () => settings.get().ambient && !settings.reducedMotion() });
  const menus = createMenuSheets({
    store, settings, toasts, hooks, onNewCity: typeof hooks.newCity === 'function' ? hooks.newCity : () => {},
    canResumeGuide: () => canResumeGuide(world, settings.get().help), onResumeGuide: () => { setGuide(world, true); refresh(); },
    onScreenshot: screenshotMode,
  });
  // Choosing Tips only or Off turns a running guide off at once (spec 3.1: all of it can be switched off).
```

In `src/ui/createUI.js`, replace:

```js
    ...menus, goals: goalsSheet(world, { onShowMe: showMe }),
    trade: tradeSheet({ world, afterCommand, onShowMe: showMeAt, toast: (text) => toasts.show(text) }),
  };
  if (welcome) {
```

with:

```js
    ...menus, goals: goalsSheet(world, { onShowMe: showMe }),
    trade: tradeSheet({ world, afterCommand, onShowMe: showMeAt, toast: (text) => toasts.show(text) }),
    ...danger.sheets, ...scoreUi.sheets,
  };
  if (welcome) {
```

In `src/ui/createUI.js`, replace:

```js
  }
  Object.assign(customSheets, extraSheets);
  const sheets = createSheets({ container: $('sheet'), store, world, placement, cameraControl, minimap: sheetMinimap, getAlerts: () => alerts.list(), onView: viewAlert, onShowMe: showMeAt, onSelect: selectBuilding, afterCommand, custom: customSheets });
  createDialog({ container: $('dialog'), store });
  const backStack = createBackStack({ store, history, addListener, removeListener });
```

with:

```js
  }
  Object.assign(customSheets, extraSheets);
  const sheets = createSheets({ container: $('sheet'), store, world, placement, cameraControl, minimap: sheetMinimap, getAlerts: () => alerts.list(), onView: viewAlert, onShowMe: showMeAt, onSelect: selectBuilding, afterCommand, custom: customSheets, parts: [danger.sheetParts, scoreUi.sheetParts] });
  createDialog({ container: $('dialog'), store });
  const backStack = createBackStack({ store, history, addListener, removeListener });
```

In `src/ui/createUI.js`, replace:

```js
    if (e.undoable && e.kind === 'building' && store.get().tool && store.get().tool.type === 'trading_post') fireTip('tradingPostPlaced');
    if (e.kind === 'speed' && world.speed > 0 && tips.current() === 'press_play') tips.dismiss();   // its condition has cleared
    ghostsDirty = true;
    // Goals, firsts, achievements and daily goals settle after every command (undo and speed included), so a
```

with:

```js
    if (e.undoable && e.kind === 'building' && store.get().tool && store.get().tool.type === 'trading_post') fireTip('tradingPostPlaced');
    if (e.kind === 'speed' && world.speed > 0 && tips.current() === 'press_play') tips.dismiss();   // its condition has cleared
    for (const s of seams()) s.onCommand(e);           // Stage 3: the interfaces see every command (a well's ripple, a tip)
    ghostsDirty = true;
    // Goals, firsts, achievements and daily goals settle after every command (undo and speed included), so a
```

In `src/ui/createUI.js`, replace:

```js
    if (list.some((a) => a.code === 'labour_shortage')) fireTip('labourShortage');
    nudge.noteProgress(progressSignature());
  }
  // Goal progress as one string: the nudge starts again whenever it changes (early-game pass 3.5).
```

with:

```js
    if (list.some((a) => a.code === 'labour_shortage')) fireTip('labourShortage');
    nudge.noteProgress(progressSignature());
    for (const s of seams()) s.refresh();
  }
  // Goal progress as one string: the nudge starts again whenever it changes (early-game pass 3.5).
```

In `src/ui/createUI.js`, replace:

```js
      if (cheer) celebrations.show(cheer);
    }
  }
  function cheerSound() { sfx.play('goal'); sfx.buzz(20); }
```

with:

```js
      if (cheer) celebrations.show(cheer);
    }
    speedControl.render();                             // the sim may have changed the speed (a first fire or raid warning)
    for (const s of seams()) s.onEvents(events);
  }
  function cheerSound() { sfx.play('goal'); sfx.buzz(20); }
```

In `src/ui/createUI.js`, replace:

```js
    tap({ x, y, type }) {
      const s = store.get();
      const t = tileUnder(x, y);
      if (isToolMode(s.mode)) {
```

with:

```js
    tap({ x, y, type }) {
      const s = store.get();
      if (s.screenshot) { store.set({ screenshot: false }); return; }   // a tap or click brings the interface back (spec 6.4)
      const t = tileUnder(x, y);
      if (isToolMode(s.mode)) {
```

In `src/ui/createUI.js`, replace:

```js
    if (pendingUpdate && !isToolMode(s.mode)) showUpdateToast();
    root.classList.toggle('has-overlay', Boolean(s.overlay));
    if (s.selectedId !== lastSelected) {
      lastSelected = s.selectedId;
```

with:

```js
    if (pendingUpdate && !isToolMode(s.mode)) showUpdateToast();
    root.classList.toggle('has-overlay', Boolean(s.overlay));
    root.classList.toggle('screenshot', Boolean(s.screenshot));
    if (s.selectedId !== lastSelected) {
      lastSelected = s.selectedId;
```

In `src/ui/createUI.js`, replace:

```js
    const selected = s.selectedId !== null ? world.buildings[s.selectedId] : null;
    const ring = guide.marker(t);                                              // the guide's ring on its step's target (spec 3.2)
    renderer.renderFrame(world, cam, {
      view: v, walkers: walkersAt(world, timeDays, range), effects, now: t, rising: effects.risingIds(t, world), grid: isToolMode(s.mode),
      drawOverlay: (g, r) => {
        if (s.overlay) drawOverlay(g, world, s.overlay, r);
```

with:

```js
    const selected = s.selectedId !== null ? world.buildings[s.selectedId] : null;
    const ring = guide.marker(t);                                              // the guide's ring on its step's target (spec 3.2)
    const still = { reducedMotion: settings.reducedMotion() };
    renderer.renderFrame(world, cam, {
      view: v, walkers: [...walkersAt(world, timeDays, range), ...unitsAt(world, timeDays, range)], effects, now: t, rising: effects.risingIds(t, world), grid: isToolMode(s.mode),
      ambient: (g, r) => ambient.draw(g, world, r, t),                          // Stage 3 (render/ambient.js, fire.js, units.js)
      fire: (g, r) => drawFires(g, world, r, t, still),
      units: (g, r) => drawUnitMarks(g, world, r, timeDays, t, still),
      drawOverlay: (g, r) => {
        if (s.overlay) drawOverlay(g, world, s.overlay, r);
```

In `src/ui/createUI.js`, replace:

```js
  return {
    store, settings, sfx, placement, showMeAt, cameraControl, alerts, toasts, celebrations, tips, effects, guide, speedControl, actions, render, afterCommand, refresh, onEvents, offerUpdate, autosave, setSaveFailed,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      guide.destroy(); stopSettingsWatch();            // the guide's store subscription and the shared settings' watch
      doc.removeEventListener('visibilitychange', onVisibility);
      for (const t of GESTURES) root.removeEventListener(t, onGesture);
      mapInput.detach(); keyboard.detach(); backStack.stop(); stopLayout(); stopVisibility(); toasts.clear(); celebrations.clear();
      // The shell's containers outlive this UI (a new city builds another one on the same page): leave them empty.
```

with:

```js
  return {
    store, settings, sfx, placement, showMeAt, cameraControl, alerts, toasts, celebrations, tips, effects, guide, speedControl, actions, render, afterCommand, refresh, onEvents, offerUpdate, autosave, setSaveFailed,
    danger, scoreUi, ambient, screenshotMode,
    allowFrame: (t) => frameGate.allow(t, world.speed === 0),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const s of seams()) s.destroy();
      guide.destroy(); stopSettingsWatch();            // the guide's store subscription and the shared settings' watch
      doc.removeEventListener('visibilitychange', onVisibility);
      for (const t of GESTURES) root.removeEventListener(t, onGesture);
      for (const t of INPUTS) root.removeEventListener(t, onInput);
      mapInput.detach(); keyboard.detach(); backStack.stop(); stopLayout(); stopVisibility(); toasts.clear(); celebrations.clear();
      // The shell's containers outlive this UI (a new city builds another one on the same page): leave them empty.
```

In `src/ui/createUI.js`, replace:

```js
      document.body.style.removeProperty('--panel-tabs-bottom');
      delete root.dataset.mode;
      root.classList.remove('has-banner', 'has-overlay', 'nudge-play');
      store.dispose();                                 // last: every component's subscription to this interface's store
    },
```

with:

```js
      document.body.style.removeProperty('--panel-tabs-bottom');
      delete root.dataset.mode;
      root.classList.remove('has-banner', 'has-overlay', 'nudge-play', 'screenshot');
      store.dispose();                                 // last: every component's subscription to this interface's store
    },
```


The sheets' parts (rows after a building's reach, rows after a home's checklist, buttons at the front of the actions, nodes in the summary after the goals) and soldiers' pay on its own row:

In `src/ui/sheets.js`, replace:

```js
const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

export function createSheets({ container, store, world, placement, cameraControl, minimap, getAlerts = () => [], onView = () => {}, onShowMe = () => {}, onSelect = () => {}, afterCommand = () => {}, custom = {} }) {
  const close = () => store.set(closeSheet(store.get()));

  function head(title) {
```

with:

```js
const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

// parts (Stage 3): the danger and score interfaces' sheet parts (src/ui/danger.js), each { building(b), house(h),
// actions(b), summary() } returning arrays of nodes, added in the list's order at fixed places in the sheets below.
export function createSheets({ container, store, world, placement, cameraControl, minimap, getAlerts = () => [], onView = () => {}, onShowMe = () => {}, onSelect = () => {}, afterCommand = () => {}, custom = {}, parts = [] }) {
  const close = () => store.set(closeSheet(store.get()));
  const extra = (kind, ...args) => parts.flatMap((p) => (p && typeof p[kind] === 'function' ? p[kind](...args) || [] : []));

  function head(title) {
```

In `src/ui/sheets.js`, replace:

```js
    const reach = def.reach || def.supplyReach || def.producerReach;
    if (reach) body.append(row(T.reach, `${reach} road tiles`));
    body.append(el('h3', { text: T.problems }), problems(b.id));
    const actions = el('div', { class: 'actions' });
    // The trading post's routes and orders live on their own sheet (spec 4.15); Back comes back here.
    if (b.type === 'trading_post') actions.append(button(T.trade, { class: 'trade primary', onClick: () => store.set(openSheet(store.get(), 'trade', b.id)) }));
```

with:

```js
    const reach = def.reach || def.supplyReach || def.producerReach;
    if (reach) body.append(row(T.reach, `${reach} road tiles`));
    body.append(...extra('building', b));
    body.append(el('h3', { text: T.problems }), problems(b.id));
    const actions = el('div', { class: 'actions' }, extra('actions', b));
    // The trading post's routes and orders live on their own sheet (spec 4.15); Back comes back here.
    if (b.type === 'trading_post') actions.append(button(T.trade, { class: 'trade primary', onClick: () => store.set(openSheet(store.get(), 'trade', b.id)) }));
```

In `src/ui/sheets.js`, replace:

```js
    if (s.downgradeIn !== null && lost) body.append(el('p', { class: 'coral', text: `Loses ${NEED_NAMES[lost].toLowerCase()} in ${plural(s.downgradeIn, 'month', 'months')}` }));
    else if (s.missingNow.includes('desirability')) body.append(el('p', { class: 'coral keep-warning', text: keepWarningText(tierName(s.tier), s.downgradeIn) }));
    body.append(el('div', { class: 'actions' }, [button(T.demolish, { class: 'demolish danger', onClick: () => { const r = placement.demolishOne(h.x, h.y); if (r.ok) close(); } })]));
    return [head(tierName(s.tier)), body];
```

with:

```js
    if (s.downgradeIn !== null && lost) body.append(el('p', { class: 'coral', text: `Loses ${NEED_NAMES[lost].toLowerCase()} in ${plural(s.downgradeIn, 'month', 'months')}` }));
    else if (s.missingNow.includes('desirability')) body.append(el('p', { class: 'coral keep-warning', text: keepWarningText(tierName(s.tier), s.downgradeIn) }));
    body.append(...extra('house', h));
    body.append(el('div', { class: 'actions' }, [button(T.demolish, { class: 'demolish danger', onClick: () => { const r = placement.demolishOne(h.x, h.y); if (r.ok) close(); } })]));
    return [head(tierName(s.tier)), body];
```

In `src/ui/sheets.js`, replace:

```js
    const body = el('div', { class: 'body' });
    body.append(row(T.difficulty, DIFFICULTY_NAMES[d.difficulty] || d.difficulty));
    body.append(el('h3', { text: T.incomeVsSpending }), row(T.taxes, `+${d.taxes}`), row(T.wages, `−${d.wages}`), row(T.upkeep, `−${d.upkeep}`), row(T.net, (d.net >= 0 ? '+' : '') + d.net));
    // Trade under its own heading, as Net above leaves it out: what caravans paid the city and what it paid them.
    body.append(el('h3', { text: T.tradeLastMonth }), row(T.tradeSales, `+${d.tradeIncome}`), row(T.tradeBought, `−${d.tradeSpent}`));
```

with:

```js
    const body = el('div', { class: 'body' });
    body.append(row(T.difficulty, DIFFICULTY_NAMES[d.difficulty] || d.difficulty));
    body.append(el('h3', { text: T.incomeVsSpending }), row(T.taxes, `+${d.taxes}`), row(T.wages, `−${d.wages}`), row(T.upkeep, `−${d.upkeep}`));
    if (d.soldiers > 0) body.append(row(T.soldiersPay, `−${d.soldiers}`));       // spec 6.3: soldiers' pay on its own row
    body.append(row(T.net, (d.net >= 0 ? '+' : '') + d.net));
    // Trade under its own heading, as Net above leaves it out: what caravans paid the city and what it paid them.
    body.append(el('h3', { text: T.tradeLastMonth }), row(T.tradeSales, `+${d.tradeIncome}`), row(T.tradeBought, `−${d.tradeSpent}`));
```

In `src/ui/sheets.js`, replace:

```js
    const open = openGoals(world, 3);
    body.append(open.length ? el('ul', { class: 'goals' }, open.map((g) => el('li', { class: 'goal', text: g.text }))) : el('p', { class: 'muted', text: T.goalsNone }));
    body.append(...achievementsSection());
    return [head(T.summary), body];
```

with:

```js
    const open = openGoals(world, 3);
    body.append(open.length ? el('ul', { class: 'goals' }, open.map((g) => el('li', { class: 'goal', text: g.text }))) : el('p', { class: 'muted', text: T.goalsNone }));
    body.append(...extra('summary'));
    body.append(...achievementsSection());
    return [head(T.summary), body];
```


In `src/ui/hud.js`, replace:

```js
  return {
    gold: world.gold, people: population(world), mood: world.mood, moodBreakdown: world.moodBreakdown, date: dateParts(world),
    taxes: last.taxes, wages: last.wages, upkeep: last.upkeep, net: last.net,
    tradeIncome: last.tradeIncome || 0, tradeSpent: last.tradeSpent || 0, made: last.made || {}, used: last.used || {}, difficulty: world.difficulty,   // the economy (spec 4.10, 4.18)
    foodStored, foodByGood, foodNeed, monthsOfFood: foodNeed > 0 ? Math.round((foodStored / foodNeed) * 10) / 10 : null,
```

with:

```js
  return {
    gold: world.gold, people: population(world), mood: world.mood, moodBreakdown: world.moodBreakdown, date: dateParts(world),
    taxes: last.taxes, wages: last.wages, upkeep: last.upkeep, soldiers: last.soldiers || 0, net: last.net,
    tradeIncome: last.tradeIncome || 0, tradeSpent: last.tradeSpent || 0, made: last.made || {}, used: last.used || {}, difficulty: world.difficulty,   // the economy (spec 4.10, 4.18)
    foodStored, foodByGood, foodNeed, monthsOfFood: foodNeed > 0 ? Math.round((foodStored / foodNeed) * 10) / 10 : null,
```


The wall card starts a line tool that draws like the road tool through `previewWall` and `drawWall`; the preview carries the score line; a demolish that would clear rubble below the debt floor is refused in the bar:

In `src/data/ui.js`, replace:

```js
export function toolForItem(item) {
  if (item === 'road') return { kind: 'road' };
  if (item === 'demolish') return { kind: 'demolish' };
  if (item === 'house') return { kind: 'houses' };
```

with:

```js
export function toolForItem(item) {
  if (item === 'road') return { kind: 'road' };
  if (item === 'wall') return { kind: 'wall' };       // drawn as a line, like a road (spec 6.4 Drawing mode)
  if (item === 'demolish') return { kind: 'demolish' };
  if (item === 'house') return { kind: 'houses' };
```


In `src/ui/placement.js`, replace:

```js
import { costOf } from '../sim/costs.js';
import { refusingStores } from '../sim/production.js';
import { buildingName, reasonText, warningText, effectText, plural, nicerText, T } from './text.js';

const footprintOf = (tool) => (tool.kind === 'building' ? { w: BUILDINGS[tool.type].w, d: BUILDINGS[tool.type].d } : { w: 1, d: 1 });

export function snapGhost(world, tool, x, y) {
```

with:

```js
import { costOf } from '../sim/costs.js';
import { refusingStores } from '../sim/production.js';
import { previewWall, drawWall } from '../sim/defence.js';
import { scoreLineFor } from './scoreUi.js';
import { buildingName, reasonText, warningText, effectText, plural, nicerText, T } from './text.js';

const footprintOf = (tool) => (tool.kind === 'building' ? { w: BUILDINGS[tool.type].w, d: BUILDINGS[tool.type].d } : { w: 1, d: 1 });

// Tools drawn as a line from a start to an end, in an L that can be flipped (spec 6.4 Drawing mode): roads and walls.
export const LINE_TOOLS = ['road', 'wall'];
const isLine = (tool) => Boolean(tool) && LINE_TOOLS.includes(tool.kind);

export function snapGhost(world, tool, x, y) {
```

In `src/ui/placement.js`, replace:

```js
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: warn ? warningLine(world, tool.type, x, y, r.warnings[0]) : '', effect, cost, count: 1, tiles: [], refund: 0 };
  }
  if (tool.kind === 'road') {
    const l = state.line;
    if (!l) return idle(T.tapStart);
    if (l.x1 === null) return idle(T.tapEnd, [[l.x0, l.y0]]);
    const tiles = roadPath(l.x0, l.y0, l.x1, l.y1, l.flip);
    const r = previewRoad(world, l.x0, l.y0, l.x1, l.y1, l.flip);
    if (!r.ok) return bad(r.reason, r.cost, r.tiles.length, tiles);
    if (!r.tiles.length) return bad('nothing_to_place', 0, 0, tiles);
```

with:

```js
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: warn ? warningLine(world, tool.type, x, y, r.warnings[0]) : '', effect, cost, count: 1, tiles: [], refund: 0 };
  }
  if (isLine(tool)) {
    const l = state.line;
    if (!l) return idle(T.tapStart);
    if (l.x1 === null) return idle(T.tapEnd, [[l.x0, l.y0]]);
    const tiles = roadPath(l.x0, l.y0, l.x1, l.y1, l.flip);
    const r = (tool.kind === 'road' ? previewRoad : previewWall)(world, l.x0, l.y0, l.x1, l.y1, l.flip);
    if (!r.ok) return bad(r.reason, r.cost, r.tiles.length, tiles);
    if (!r.tiles.length) return bad('nothing_to_place', 0, 0, tiles);
```

In `src/ui/placement.js`, replace:

```js
  }
  const r = previewDemolishArea(world, a.x0, a.y0, a.x1, a.y1);
  const count = r.buildingIds.length + r.roadTiles.length;
  const tiles = rectTiles(a.x0, a.y0, a.x1, a.y1, world.size);
  if (!count) return bad('nothing_here', 0, 0, tiles);
  return { state: 'ok', reason: null, warnings: [], text: `${plural(count, 'item', 'items')} · ${T.refund} ${r.refund}`, effect: '', cost: -r.refund, count, tiles, refund: r.refund };
}
```

with:

```js
  }
  const r = previewDemolishArea(world, a.x0, a.y0, a.x1, a.y1);
  const count = r.buildingIds.length + r.roadTiles.length + r.wallTiles.length;
  const tiles = rectTiles(a.x0, a.y0, a.x1, a.y1, world.size);
  if (!count) return bad('nothing_here', 0, 0, tiles);
  if (!r.ok) return bad(r.reason, -r.refund, count, tiles);                     // clearing rubble would cross the debt floor
  return { state: 'ok', reason: null, warnings: [], text: `${plural(count, 'item', 'items')} · ${T.refund} ${r.refund}`, effect: '', cost: -r.refund, count, tiles, refund: r.refund };
}
```

In `src/ui/placement.js`, replace:

```js
  p.nicer = '';
  p.nicerTone = '';
  if (state.tool.kind === 'building' && (p.state === 'ok' || p.state === 'warn')) {
    const d = nicerFor(world, state.tool.type, state.ghost.x, state.ghost.y);
    p.nicer = nicerText(d.better, d.worse);
    p.nicerTone = d.better && d.worse ? 'mixed' : d.better ? 'better' : d.worse ? 'worse' : '';
  }
  return p;
```

with:

```js
  p.nicer = '';
  p.nicerTone = '';
  p.score = '';                                         // Stage 3: the parts it would change, "+3 Culture" (scoreUi.js)
  if (state.tool.kind === 'building' && (p.state === 'ok' || p.state === 'warn')) {
    const d = nicerFor(world, state.tool.type, state.ghost.x, state.ghost.y);
    p.nicer = nicerText(d.better, d.worse);
    p.nicerTone = d.better && d.worse ? 'mixed' : d.better ? 'better' : d.worse ? 'worse' : '';
    p.score = scoreLineFor(world, state.tool.type, state.ghost.x, state.ghost.y);
  }
  return p;
```

In `src/ui/placement.js`, replace:

```js
      if (!s.tool) return;
      if (s.tool.kind === 'building') { api.moveGhost(x, y); return; }
      if (s.tool.kind === 'road') {
        const l = s.line;
        store.set({ line: !l || l.x1 !== null ? { x0: x, y0: y, x1: null, y1: null, flip: false } : { ...l, x1: x, y1: y } });
```

with:

```js
      if (!s.tool) return;
      if (s.tool.kind === 'building') { api.moveGhost(x, y); return; }
      if (isLine(s.tool)) {
        const l = s.line;
        store.set({ line: !l || l.x1 !== null ? { x0: x, y0: y, x1: null, y1: null, flip: false } : { ...l, x1: x, y1: y } });
```

In `src/ui/placement.js`, replace:

```js
      const s = store.get();
      if (!s.tool || s.tool.kind === 'building') return;
      if (phase === 'start') { store.set(s.tool.kind === 'road' ? { line: { x0: x, y0: y, x1: null, y1: null, flip: false } } : { area: { x0: x, y0: y, x1: null, y1: null } }); return; }
      if (s.tool.kind === 'road' && s.line) store.set({ line: { ...s.line, x1: x, y1: y } });
      else if (s.tool.kind !== 'road' && s.area) store.set({ area: { ...s.area, x1: x, y1: y } });
    },
    flip() { const s = store.get(); if (s.line) store.set({ line: { ...s.line, flip: !s.line.flip } }); },
```

with:

```js
      const s = store.get();
      if (!s.tool || s.tool.kind === 'building') return;
      if (phase === 'start') { store.set(isLine(s.tool) ? { line: { x0: x, y0: y, x1: null, y1: null, flip: false } } : { area: { x0: x, y0: y, x1: null, y1: null } }); return; }
      if (isLine(s.tool) && s.line) store.set({ line: { ...s.line, x1: x, y1: y } });
      else if (!isLine(s.tool) && s.area) store.set({ area: { ...s.area, x1: x, y1: y } });
    },
    flip() { const s = store.get(); if (s.line) store.set({ line: { ...s.line, flip: !s.line.flip } }); },
```

In `src/ui/placement.js`, replace:

```js
        cx = s.ghost.x + def.w / 2; cy = s.ghost.y + def.d / 2;
        text = `${buildingName(t.type)} ${T.placed.toLowerCase()}`;
      } else if (t.kind === 'road') {
        result = drawRoad(world, s.line.x0, s.line.y0, s.line.x1, s.line.y1, s.line.flip);
        cx = s.line.x1 + 0.5; cy = s.line.y1 + 0.5;
        text = T.roadLaid;
      } else {
        const a = s.area;
```

with:

```js
        cx = s.ghost.x + def.w / 2; cy = s.ghost.y + def.d / 2;
        text = `${buildingName(t.type)} ${T.placed.toLowerCase()}`;
      } else if (isLine(t)) {
        result = (t.kind === 'road' ? drawRoad : drawWall)(world, s.line.x0, s.line.y0, s.line.x1, s.line.y1, s.line.flip);
        cx = s.line.x1 + 0.5; cy = s.line.y1 + 0.5;
        text = t.kind === 'road' ? T.roadLaid : T.wallBuilt;
      } else {
        const a = s.area;
```

In `src/ui/placement.js`, replace:

```js
        if (t.kind === 'building') effects.rise(result.id, s.ghost.x, s.ghost.y, BUILDINGS[t.type].w, BUILDINGS[t.type].d, at);   // the work-gang settle
      }
      if (t.kind === 'road') store.set({ line: null });
      else if (t.kind !== 'building') store.set({ area: null });
      afterCommand({ kind: t.kind, result, text, undoable: true });
```

with:

```js
        if (t.kind === 'building') effects.rise(result.id, s.ghost.x, s.ghost.y, BUILDINGS[t.type].w, BUILDINGS[t.type].d, at);   // the work-gang settle
      }
      if (isLine(t)) store.set({ line: null });
      else if (t.kind !== 'building') store.set({ area: null });
      afterCommand({ kind: t.kind, result, text, undoable: true });
```


In `src/ui/confirmBar.js`, replace:

```js
import { el, button, iconButton, clear } from './components.js';

const titleOf = (tool) => (tool.kind === 'building' ? buildingName(tool.type) : tool.kind === 'road' ? buildingName('road') : tool.kind === 'houses' ? T.housingPlots : T.demolish);
const NICER_TONE = { better: 'teal', worse: 'coral', mixed: 'muted', '': 'muted' };
const rotates = (tool) => tool.kind === 'building' && Boolean(BUILDINGS[tool.type].rotates);   // none in Stage 1 (mastabas come with monuments)
```

with:

```js
import { el, button, iconButton, clear } from './components.js';

const titleOf = (tool) => (tool.kind === 'building' ? buildingName(tool.type) : tool.kind === 'road' || tool.kind === 'wall' ? buildingName(tool.kind) : tool.kind === 'houses' ? T.housingPlots : T.demolish);
const NICER_TONE = { better: 'teal', worse: 'coral', mixed: 'muted', '': 'muted' };
const rotates = (tool) => tool.kind === 'building' && Boolean(BUILDINGS[tool.type].rotates);   // none in Stage 1 (mastabas come with monuments)
```

In `src/ui/confirmBar.js`, replace:

```js
      // The effect takes the empty reason line when there is nothing to warn about, so the bar never grows a line. Homes
      // served read in teal; "no homes in reach yet" is not a gain, so it reads muted.
      p.state === 'ok' && p.effect ? el('div', { class: `effect small ${p.effect === T.noHomesInReach ? 'muted' : 'teal'}`, text: p.effect }) : null,
      // What it does to the homes around it (spec 4.7), in words; teal when nicer, coral when less pleasant, ink when both.
      p.nicer ? el('div', { class: `nicer small ${NICER_TONE[p.nicerTone]}`, text: p.nicer }) : null,
```

with:

```js
      // The effect takes the empty reason line when there is nothing to warn about, so the bar never grows a line. Homes
      // served read in teal; "no homes in reach yet" is not a gain, so it reads muted.
      // Stage 3: the score parts it would change ride on the same line ("Gives water to 6 homes · +3 Culture", spec 4.19).
      p.state === 'ok' && (p.effect || p.score) ? el('div', { class: `effect small ${p.effect === T.noHomesInReach && !p.score ? 'muted' : 'teal'}`, text: [p.effect, p.score].filter(Boolean).join(' · ') }) : null,
      // What it does to the homes around it (spec 4.7), in words; teal when nicer, coral when less pleasant, ink when both.
      p.nicer ? el('div', { class: `nicer small ${NICER_TONE[p.nicerTone]}`, text: p.nicer }) : null,
```

In `src/ui/confirmBar.js`, replace:

```js
    const controls = [];
    if (rotates(s.tool)) controls.push(iconButton(T.rotate, '⟳', { class: 'rotate', disabled: true }));
    if (s.tool.kind === 'road' && s.line && s.line.x1 !== null) controls.push(button(T.flip, { class: 'flip', onClick: () => placement.flip() }));
    controls.push(button(T.undo, { class: 'undo', disabled: !placement.canUndo(), onClick: onUndo }));
    controls.push(iconButton(T.cancel, '✕', { class: 'cancel', onClick: onCancel }));
```

with:

```js
    const controls = [];
    if (rotates(s.tool)) controls.push(iconButton(T.rotate, '⟳', { class: 'rotate', disabled: true }));
    if ((s.tool.kind === 'road' || s.tool.kind === 'wall') && s.line && s.line.x1 !== null) controls.push(button(T.flip, { class: 'flip', onClick: () => placement.flip() }));
    controls.push(button(T.undo, { class: 'undo', disabled: !placement.canUndo(), onClick: onUndo }));
    controls.push(iconButton(T.cancel, '✕', { class: 'cancel', onClick: onCancel }));
```


Settings, the title card's decoration hook, the export's records and the two new sounds:

In `src/ui/settings.js`, replace:

```js

export const HELP_LEVELS = ['full', 'tips', 'off'];
export const DEFAULT_SETTINGS = { sound: false, vibration: true, textSize: 100, leftHanded: false, keyboardShortcuts: true, reducedMotion: 'system', help: 'full', seenTips: [], difficulty: 'normal' };

const isBool = (v) => typeof v === 'boolean';
```

with:

```js

export const HELP_LEVELS = ['full', 'tips', 'off'];
// Stage 3 (spec 4.3, 5.6, 6.3): ambient motion on or off, and what a fire no staffed firehouse reaches does to the speed
// after the city's first one: 'pause', 'goto' (1x and the camera goes there) or 'inform' (1x and the banner).
export const FIRE_REACTIONS = ['pause', 'goto', 'inform'];
export const DEFAULT_SETTINGS = { sound: false, vibration: true, textSize: 100, leftHanded: false, keyboardShortcuts: true, reducedMotion: 'system', help: 'full', seenTips: [], difficulty: 'normal', ambient: true, fireReaction: 'inform' };

const isBool = (v) => typeof v === 'boolean';
```

In `src/ui/settings.js`, replace:

```js
  seenTips: (v) => Array.isArray(v) && v.every((s) => typeof s === 'string'),
  difficulty: (v) => DIFFICULTY_ORDER.includes(v),
};
// Lists are copied on the way in and out of storage, so no caller can change the defaults or the stored copy.
```

with:

```js
  seenTips: (v) => Array.isArray(v) && v.every((s) => typeof s === 'string'),
  difficulty: (v) => DIFFICULTY_ORDER.includes(v),
  ambient: isBool,
  fireReaction: (v) => FIRE_REACTIONS.includes(v),
};
// Lists are copied on the way in and out of storage, so no caller can change the defaults or the stored copy.
```


In `src/ui/titleCard.js`, replace:

```js
}

export function createTitleCard({ container, hasSave, canInstall = false, canBring = false, sound = false, difficulty = 'normal', message = null, onContinue, onNewCity, onSound, onDifficulty = () => {}, onInstall = () => {}, onBring = () => {} }) {
  let on = Boolean(sound);
  const soundButton = button(on ? T.playMuted : T.playWithSound, { class: 'sound' });
```

with:

```js
}

// decorate (Stage 3): called once with (element, { buttonBox, newCity }) after the card is built, so the score interface
// adds the records, stamps, This week's Nile and a shared score (src/ui/scoreUi.js titleDecor) without editing this file.
export function createTitleCard({ container, hasSave, canInstall = false, canBring = false, sound = false, difficulty = 'normal', message = null, onContinue, onNewCity, onSound, onDifficulty = () => {}, onInstall = () => {}, onBring = () => {}, decorate = null }) {
  let on = Boolean(sound);
  const soundButton = button(on ? T.playMuted : T.playWithSound, { class: 'sound' });
```

In `src/ui/titleCard.js`, replace:

```js
  const showPanelNode = (children) => { guide = el('div', { class: 'guide' }, children); buttonBox.hidden = true; element.append(guide); };
  const showCard = () => { if (guide) { guide.remove(); guide = null; } buttonBox.hidden = false; buttons[0].focus(); };
  clear(container);
  container.append(element);
```

with:

```js
  const showPanelNode = (children) => { guide = el('div', { class: 'guide' }, children); buttonBox.hidden = true; element.append(guide); };
  const showCard = () => { if (guide) { guide.remove(); guide = null; } buttonBox.hidden = false; buttons[0].focus(); };
  if (typeof decorate === 'function') decorate(element, { buttonBox, newCity });
  clear(container);
  container.append(element);
```


In `src/save/serialize.js`, replace:

```js
}

export function packSave(world, { savedAt = null, lastSpeed = 1 } = {}) {
  return JSON.stringify({ version: SAVE_VERSION, savedAt, lastSpeed, world });
}
```

with:

```js
}

// records (Stage 3, spec 4.17): the device's records (src/save/records.js), carried by an export beside the world and
// merged on import; autosaves leave them out.
export function packSave(world, { savedAt = null, lastSpeed = 1, records = null } = {}) {
  return JSON.stringify(records ? { version: SAVE_VERSION, savedAt, lastSpeed, world, records } : { version: SAVE_VERSION, savedAt, lastSpeed, world });
}
```

In `src/save/serialize.js`, replace:

```js
    lastSpeed: !bare && [1, 2, 3].includes(obj.lastSpeed) ? obj.lastSpeed : 1,
    world,
  };
}
```

with:

```js
    lastSpeed: !bare && [1, 2, 3].includes(obj.lastSpeed) ? obj.lastSpeed : 1,
    world,
    records: !bare && isRecord(obj.records) ? obj.records : null,
  };
}
```


In `src/audio/sfx.js`, replace:

```js
// Sound and haptics (spec 5.5): seven short synthesised effects, off by default, unlocked on the first user
// gesture; an ambient audio session so the iPhone silent switch is respected; short vibration pulses.
// No audio element and no silent-switch unlock hack: when the phone is muted, the game is quiet.
```

with:

```js
// Sound and haptics (spec 5.5): nine short synthesised effects (the raid horn and the coin tick from Stage 3), off by default, unlocked on the first user
// gesture; an ambient audio session so the iPhone silent switch is respected; short vibration pulses.
// No audio element and no silent-switch unlock hack: when the phone is muted, the game is quiet.
```

In `src/audio/sfx.js`, replace:

```js
  alert: [{ f: 330, type: 'square', t: 0, d: 0.12, g: 0.15 }, { f: 330, type: 'square', t: 0.2, d: 0.12, g: 0.15 }],
  goal: [{ f: 587, type: 'sine', t: 0, d: 0.1, g: 0.2 }, { f: 880, type: 'sine', t: 0.1, d: 0.2, g: 0.25 }],
};
```

with:

```js
  alert: [{ f: 330, type: 'square', t: 0, d: 0.12, g: 0.15 }, { f: 330, type: 'square', t: 0.2, d: 0.12, g: 0.15 }],
  goal: [{ f: 587, type: 'sine', t: 0, d: 0.1, g: 0.2 }, { f: 880, type: 'sine', t: 0.1, d: 0.2, g: 0.25 }],
  // Stage 3: the raid horn, three low notes once when a warning appears; the coin tick, one high note when taxes arrive.
  horn: [{ f: 147, type: 'sawtooth', t: 0, d: 0.35, g: 0.2 }, { f: 147, type: 'sawtooth', t: 0.45, d: 0.35, g: 0.2 }, { f: 110, type: 'sawtooth', t: 0.9, d: 0.4, g: 0.22 }],
  coin: [{ f: 1568, type: 'triangle', t: 0, d: 0.08, g: 0.12 }],
};
```


Boot: a city id for every new city and every loaded city without one, a records note after every save, the records in an export and merged on import, a chosen seed for This week's Nile and a shared score, and `window.__thebes.devScene` before the title card:

In `src/boot.js`, replace:

```js
// they write nothing until the first autosave, which then replaces the saved city).
import { createWorld } from './sim/world.js';
import { setSpeed, setGuide } from './sim/commands.js';
import { createCamera } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
```

with:

```js
// they write nothing until the first autosave, which then replaces the saved city).
import { createWorld } from './sim/world.js';
import { setSpeed, setGuide, setCityId } from './sim/commands.js';
import { createCamera } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
```

In `src/boot.js`, replace:

```js
import { openSheet } from './ui/modes.js';
import { registerServiceWorker, applyUpdate } from './pwa.js';

const HOUR = 3600 * 1000;
```

with:

```js
import { openSheet } from './ui/modes.js';
import { registerServiceWorker, applyUpdate } from './pwa.js';
import { createRecords, newCityId } from './save/records.js';
import { titleDecor } from './ui/scoreUi.js';
import { devScene } from './dev/scenes.js';

const HOUR = 3600 * 1000;
```

In `src/boot.js`, replace:

```js
  const renderer = createRenderer({ canvas });
  const settings = createSettings({ storage, root });
  // One audio context for the whole page: every game (New city, import) shares it.
  const sfx = createSfx({ enabled: () => settings.get().sound, canVibrate: () => settings.get().vibration });
```

with:

```js
  const renderer = createRenderer({ canvas });
  const settings = createSettings({ storage, root });
  // Stage 3: the device's records (spec 4.19), and the development scenes hook, there before the title card shows
  // (tools/shots.ps1 -Stage3); startGame keeps it beside the game's own fields.
  const records = createRecords({ storage });
  let api = null;
  win.__thebes = { devScene: (name) => devScene(api, name) };
  // One audio context for the whole page: every game (New city, import) shares it.
  const sfx = createSfx({ enabled: () => settings.get().sound, canVibrate: () => settings.get().vibration });
```

In `src/boot.js`, replace:

```js
  // A new city starts with the guide on only under Help: Guide and tips (early-game pass 3.1), and at the difficulty
  // the settings hold for new cities (spec 4.18). The sample and stress cities of the development flags never guide.
  function freshWorld() {
    const world = createWorld({ seed: seedOf(), difficulty: settings.get().difficulty });
    if (stress) buildStressCity(world); else if (sample) buildSampleCity(world);
    if (params.has('speed')) setSpeed(world, Number(params.get('speed')));
```

with:

```js
  // A new city starts with the guide on only under Help: Guide and tips (early-game pass 3.1), and at the difficulty
  // the settings hold for new cities (spec 4.18). The sample and stress cities of the development flags never guide.
  // seed: a chosen seed (This week's Nile, a shared score's Start this seed); otherwise the flag's or a random one. Each
  // new city gets its id for the records here (spec 4.19: the interface gives it, the sim never reads the clock).
  function freshWorld({ seed = null } = {}) {
    const world = createWorld({ seed: Number.isInteger(seed) ? seed : seedOf(), difficulty: settings.get().difficulty, cityId: newCityId(clock()) });
    if (stress) buildStressCity(world); else if (sample) buildSampleCity(world);
    if (params.has('speed')) setSpeed(world, Number(params.get('speed')));
```

In `src/boot.js`, replace:

```js

  const hooks = {
    canInstall: () => flow.canInstall(),
    async install() {
```

with:

```js

  const hooks = {
    records,                                            // Stage 3: the device's records, for Seal this reign (src/ui/scoreUi.js)
    canInstall: () => flow.canInstall(),
    async install() {
```

In `src/boot.js`, replace:

```js
      const text = packSave(current.world, { savedAt: clock(), lastSpeed: current.ui.store.get().lastSpeed });
      const r = await store.save(text);
      if (r.ok && !persisted) {                         // spec 4.17: ask to keep the data once a city exists
        persisted = true;
```

with:

```js
      const text = packSave(current.world, { savedAt: clock(), lastSpeed: current.ui.store.get().lastSpeed });
      const r = await store.save(text);
      if (r.ok) { try { records.noteCity(current.world, clock()); } catch (e) { /* records never stop a save */ } }   // spec 4.19
      if (r.ok && !persisted) {                         // spec 4.17: ask to keep the data once a city exists
        persisted = true;
```

In `src/boot.js`, replace:

```js
      if (!current) return;
      const { ui, world } = current;
      const text = packSave(world, { savedAt: clock(), lastSpeed: ui.store.get().lastSpeed });
      try {                                             // share first: the sheet needs the tap's activation window (iOS)
        const r = await exportSave(text, { share: io.share, canShare: io.canShare, download: io.download, date: new Date(clock()) });
```

with:

```js
      if (!current) return;
      const { ui, world } = current;
      const text = packSave(world, { savedAt: clock(), lastSpeed: ui.store.get().lastSpeed, records: records.load() });   // spec 4.17: the export carries the records
      try {                                             // share first: the sheet needs the tap's activation window (iOS)
        const r = await exportSave(text, { share: io.share, canShare: io.canShare, download: io.download, date: new Date(clock()) });
```

In `src/boot.js`, replace:

```js
        return;
      }
      const go = () => startGame(save.world, { fromSave: true, savedAt: save.savedAt, lastSpeed: save.lastSpeed, saveNow: true });
      if (current) current.ui.store.set({ confirmDialog: { text: T.replaceCityConfirm, confirmLabel: T.importCity, onConfirm: go } });
      else go();                                        // the title phase has no city to replace
```

with:

```js
        return;
      }
      const go = () => {
        if (save.records) { try { records.merge(save.records); } catch (e) { /* a bad records block never stops an import */ } }   // spec 4.17
        startGame(save.world, { fromSave: true, savedAt: save.savedAt, lastSpeed: save.lastSpeed, saveNow: true });
      };
      if (current) current.ui.store.set({ confirmDialog: { text: T.replaceCityConfirm, confirmLabel: T.importCity, onConfirm: go } });
      else go();                                        // the title phase has no city to replace
```

In `src/boot.js`, replace:

```js
    stopGame();
    if (fromSave) setSpeed(world, 0);                   // the game always reopens paused (spec 4.17)
    const cam = createCamera({ x: stress ? 32 : world.focus.x, y: stress ? 32 : world.focus.y, zoom: 1 });
    const ui = createUI({ world, canvas, cam, renderer, root, doc, win, settings, hooks, now, clock, welcome: fromSave ? { savedAt, lastSpeed } : null,
      sfx, extraSheets: { install: installGuide(flow, { hasCity: true, onPrompt: () => hooks.install(), onBring: () => hooks.importCity() }) }, ...uiOptions });
    const loop = createGameLoop({ world, onEvents: (events) => { ui.effects.fromEvents(world, events, now()); ui.onEvents(events); }, render: ui.render, ...loopOptions });
    current = { world, ui, loop, cam };
    if (notice) ui.toasts.show(notice);
```

with:

```js
    stopGame();
    if (fromSave) setSpeed(world, 0);                   // the game always reopens paused (spec 4.17)
    if (!world.cityId) setCityId(world, newCityId(clock()));   // a city from before Stage 3 gets its records id at load
    const cam = createCamera({ x: stress ? 32 : world.focus.x, y: stress ? 32 : world.focus.y, zoom: 1 });
    const ui = createUI({ world, canvas, cam, renderer, root, doc, win, settings, hooks, now, clock, welcome: fromSave ? { savedAt, lastSpeed } : null,
      sfx, extraSheets: { install: installGuide(flow, { hasCity: true, onPrompt: () => hooks.install(), onBring: () => hooks.importCity() }) }, ...uiOptions });
    const loop = createGameLoop({ world, onEvents: (events) => { ui.effects.fromEvents(world, events, now()); ui.onEvents(events); }, render: ui.render, allowFrame: ui.allowFrame, ...loopOptions });
    current = { world, ui, loop, cam };
    if (notice) ui.toasts.show(notice);
```

In `src/boot.js`, replace:

```js
    loop.start();
    if (pendingUpdate) { ui.offerUpdate(pendingUpdate); pendingUpdate = null; }
    win.__thebes = { world, cam, renderer, loop, ui };
    return current;
  }
```

with:

```js
    loop.start();
    if (pendingUpdate) { ui.offerUpdate(pendingUpdate); pendingUpdate = null; }
    win.__thebes = { ...(win.__thebes || {}), world, cam, renderer, loop, ui };
    return current;
  }
```

In `src/boot.js`, replace:

```js
  function blockIfNewer(loaded) { saveBlocked = loaded.state === 'error' && loaded.code === 'newer_version'; }

  // Spec 4.17: with a saved city, a new one asks first and offers to export the old one.
  function confirmNewCity(loaded) {
    if (!title) return;
    title.card.showPanel((body, back) => {
```

with:

```js
  function blockIfNewer(loaded) { saveBlocked = loaded.state === 'error' && loaded.code === 'newer_version'; }

  // Spec 4.17: with a saved city, a new one asks first and offers to export the old one. seed: a chosen seed (spec 4.19).
  function confirmNewCity(loaded, seed = null) {
    if (!title) return;
    title.card.showPanel((body, back) => {
```

In `src/boot.js`, replace:

```js
        } catch (e) { if (title) title.card.setMessage(T.exportFailed); }
      } });
      const start = button(T.startNewCity, { class: 'start-new danger', onClick: () => startGame(freshWorld()) });
      body.append(el('p', { text: T.newCityConfirm }), el('div', { class: 'actions' }, [exportFirst, start, button(T.back, { class: 'panel-back', onClick: back })]));
    });
```

with:

```js
        } catch (e) { if (title) title.card.setMessage(T.exportFailed); }
      } });
      const start = button(T.startNewCity, { class: 'start-new danger', onClick: () => startGame(freshWorld({ seed })) });
      body.append(el('p', { text: T.newCityConfirm }), el('div', { class: 'actions' }, [exportFirst, start, button(T.back, { class: 'panel-back', onClick: back })]));
    });
```

In `src/boot.js`, replace:

```js
      onInstall: async () => { if ((await flow.promptInstall()) === 'guide' && title) title.card.showGuide(guide); },
      onBring: () => hooks.importCity(),
    });
    title = { card, loop, backdrop };
```

with:

```js
      onInstall: async () => { if ((await flow.promptInstall()) === 'guide' && title) title.card.showGuide(guide); },
      onBring: () => hooks.importCity(),
      // Stage 3 (spec 4.19): records, stamps, This week's Nile and a shared score, from the score interface.
      decorate: titleDecor({
        records, shared: (win.location && win.location.hash) || '', clock,
        startSeed: (seed) => (loaded.state === 'ok' ? confirmNewCity(loaded, seed) : startGame(freshWorld({ seed }))),
      }),
    });
    title = { card, loop, backdrop };
```

In `src/boot.js`, replace:

```js
  } else showTitle(await loadSave(store));

  return {
    phase: () => (title ? 'title' : 'game'),
    game: () => current,
    startGame, hooks,
    destroy() { win.removeEventListener('beforeinstallprompt', onPrompt); showNotice(root.querySelector('#notice'), null); leaveTitle(); stopGame(); },
  };
}
```

with:

```js
  } else showTitle(await loadSave(store));

  api = {
    phase: () => (title ? 'title' : 'game'),
    game: () => current,
    startGame, hooks, records,
    destroy() { win.removeEventListener('beforeinstallprompt', onPrompt); showNotice(root.querySelector('#notice'), null); leaveTitle(); stopGame(); },
  };
  return api;
}
```


The test-only calm switch (the long runs and the sample cities set it until Track F gives them firehouses and defences):

In `src/sim/clock.js`, replace:

```js
  assignLabour(world);
  produceDay(world);
  fireDay(world, events);                              // Stage 3: fire, then raids and combat (src/sim/fire.js, raids.js)
  raidDay(world, events);
  world.day += 1;
  if (world.day % ARRIVAL_EVERY === 0) {
```

with:

```js
  assignLabour(world);
  produceDay(world);
  // Stage 3: fire, then raids and combat (src/sim/fire.js, raids.js). world.calm is a TEST-ONLY switch the Stage 3
  // contract gives the long runs and the sample cities until Track F builds their firehouses and defences and removes it:
  // never set by the game, not in the save's required fields.
  if (!world.calm) {
    fireDay(world, events);
    raidDay(world, events);
  }
  world.day += 1;
  if (world.day % ARRIVAL_EVERY === 0) {
```


In `src/dev/sampleCity.js`, replace:

```js

export function buildSampleCity(world, { days = 360, stageTwoDays = 240 } = {}) {
  const gold = world.gold;
  world.gold = 1e9;
```

with:

```js

export function buildSampleCity(world, { days = 360, stageTwoDays = 240 } = {}) {
  world.calm = true;                                // Stage 3 contract: no fire or raids until Track F (src/sim/clock.js)
  const gold = world.gold;
  world.gold = 1e9;
```

In `src/dev/sampleCity.js`, replace:

```js

export function buildStressCity(world, { days = 60 } = {}) {
  const gold = world.gold;
  world.gold = 1e9;
```

with:

```js

export function buildStressCity(world, { days = 60 } = {}) {
  world.calm = true;                                // Stage 3 contract: no fire or raids until Track F (src/sim/clock.js)
  const gold = world.gold;
  world.gold = 1e9;
```


One section per track in `src/ui/text.js` and `css/ui.css`, at the end of each file, in track order, with stable separator lines between them:

In `src/ui/text.js`, replace:

```js
export const LEVEL_NAMES = { essential: 'water and food', safety: 'safety', services: 'services', industry: 'industry', monuments: 'monuments' };

// Every problem names the cause and the fix (spec 6.3).
export function alertText(alert, world) {
  const b = alert.id ? world.buildings[alert.id] : null;
  const name = b ? buildingName(b.type) : 'A building';
  switch (alert.code) {
    case 'no_road': return { title: `${name} has no road`, fix: 'Lay a road beside it' };
```

with:

```js
export const LEVEL_NAMES = { essential: 'water and food', safety: 'safety', services: 'services', industry: 'industry', monuments: 'monuments' };

// Stage 3: the tracks' alert words, filled in their own sections below with Object.assign: code -> (alert, world, b,
// name) => { title, fix }, where b is the alert's building (or null) and name its name ('A building' without one).
export const ALERT_TEXT = {};

// Every problem names the cause and the fix (spec 6.3).
export function alertText(alert, world) {
  const b = alert.id ? world.buildings[alert.id] : null;
  const name = b ? buildingName(b.type) : 'A building';
  if (ALERT_TEXT[alert.code]) return ALERT_TEXT[alert.code](alert, world, b, name);
  switch (alert.code) {
    case 'no_road': return { title: `${name} has no road`, fix: 'Lay a road beside it' };
```

In `src/ui/text.js`, replace:

```js
// REASONS, CHAPTER_NAMES, T, ...) only with Object.assign inside its own section, so no two tracks edit the same lines.
Object.assign(DIFFICULTY_NAMES, { peaceful: 'Peaceful' });
// ── end s3 contract ──────────────────────────────────────────────────────────────────────────────────────────────
```

with:

```js
// REASONS, CHAPTER_NAMES, T, ...) only with Object.assign inside its own section, so no two tracks edit the same lines.
Object.assign(DIFFICULTY_NAMES, { peaceful: 'Peaceful' });
Object.assign(T, { soldiersPay: "Soldiers' pay", wallBuilt: 'Wall built', screenshotMode: 'Screenshot mode' });
Object.assign(REASONS, { no_rubble: 'No rubble here', bad_id: "Can't do that", has_id: "Can't do that" });
// ── end s3 contract ──────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 fire (Track A) ──────────────────────────────────────────────────────────────────────────────────────────
// Track A's words for fire: the fire row, alert titles and fixes for fire, blaze and fire_risk, the mood rows fire and burned, captions. Add new lines just above the end marker.
export const FIRE_TEXT = {};
// ── end s3 fire ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 raids (Track B) ──────────────────────────────────────────────────────────────────────────────────────────
// Track B's words for raids: alert titles for raid_warning and raid, directions, the report, tribute and festival reasons, mood rows raid and festival. Add new lines just above the end marker.
export const RAID_TEXT = {};
// ── end s3 raids ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 art (Track C) ──────────────────────────────────────────────────────────────────────────────────────────
// Track C's words for art: words drawn on the map (the reduced-motion "Burning"). Add new lines just above the end marker.
export const ART_TEXT = {};
// ── end s3 art ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 ui (Track D) ──────────────────────────────────────────────────────────────────────────────────────────
// Track D's words for the danger interface: banners, the countdown chip, the tribute sheet, settings rows, the fire overlay and its legend. Add new lines just above the end marker.
export const DANGER_UI_TEXT = {};
// ── end s3 ui ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 score (Track E) ──────────────────────────────────────────────────────────────────────────────────────────
// Track E's words for scoring: parts, reasons, medals, splits, records, sharing, feats, remarks, and the danger goals, firsts, achievements, daily goals and tips. Add new lines just above the end marker.
export const SCORE_TEXT = {};
// ── end s3 score ───────────────────────────────────────────────────────────────────────────────────────────────────

//
// (A stable separator between the Stage 3 sections: leave these lines as they are.)
//
// ── s3 balance (Track F) ──────────────────────────────────────────────────────────────────────────────────────────
// Track F's words for the integrator: anything balance needs words for (difficultyHint is edited in place). Add new lines just above the end marker.
export const BALANCE_TEXT = {};
// ── end s3 balance ───────────────────────────────────────────────────────────────────────────────────────────────────
```


In `css/ui.css`, replace:

```css
  .title-buttons { gap: 4px; }
}
```

with:

```css
  .title-buttons { gap: 4px; }
}

/* (A stable separator between the Stage 3 sections: leave these lines as they are.) */

/* ── s3 contract (Track 0) ── Track 0's styles for the contract. Add new rules just above the end marker. */
/* Screenshot mode (spec 4.19, 6.4): nothing of the interface shows over the map; the screen-reader lines stay. */
body.screenshot #ui > :not(#live):not(#map-summary) { display: none !important; }
/* ── end s3 contract ── */

/* (A stable separator between the Stage 3 sections: leave these lines as they are.) */

/* ── s3 fire (Track A) ── Track A's styles for fire. Add new rules just above the end marker. */
/* ── end s3 fire ── */

/* (A stable separator between the Stage 3 sections: leave these lines as they are.) */

/* ── s3 raids (Track B) ── Track B's styles for raids and defence. Add new rules just above the end marker. */
/* ── end s3 raids ── */

/* (A stable separator between the Stage 3 sections: leave these lines as they are.) */

/* ── s3 art (Track C) ── Track C's styles for art and render. Add new rules just above the end marker. */
/* ── end s3 art ── */

/* (A stable separator between the Stage 3 sections: leave these lines as they are.) */

/* ── s3 ui (Track D) ── Track D's styles for the danger interface. Add new rules just above the end marker. */
/* ── end s3 ui ── */

/* (A stable separator between the Stage 3 sections: leave these lines as they are.) */

/* ── s3 score (Track E) ── Track E's styles for scoring and records. Add new rules just above the end marker. */
/* ── end s3 score ── */

/* (A stable separator between the Stage 3 sections: leave these lines as they are.) */

/* ── s3 balance (Track F) ── Track F's styles for balance and integration. Add new rules just above the end marker. */
/* ── end s3 balance ── */
```


- [ ] **Step 4: Run the tests to see them pass**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "s3 contract" -WaitSeconds 120
```

Expected: `73 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

Two sounds join the list, the store gains its screenshot flag, and the long runs carry the calm switch until Track F:

In `tests/audio/sfx.test.js`, replace:

```js

describe('audio sfx', () => {
  it('stays silent until enabled and unlocked, then plays the seven effects as short envelopes', () => {
    let on = false, created = 0;
    const ctx = fakeAudio();
    const sfx = createSfx({ create: () => { created++; return ctx; }, enabled: () => on, vibrate: null, audioSession: null });
    expect(sfx.names).toEqual(['place', 'road', 'demolish', 'upgrade', 'milestone', 'alert', 'goal']);
    expect(sfx.play('place')).toBe(false);
    expect(sfx.unlock()).toBe(false);
```

with:

```js

describe('audio sfx', () => {
  it('stays silent until enabled and unlocked, then plays the nine effects as short envelopes', () => {
    let on = false, created = 0;
    const ctx = fakeAudio();
    const sfx = createSfx({ create: () => { created++; return ctx; }, enabled: () => on, vibrate: null, audioSession: null });
    expect(sfx.names).toEqual(['place', 'road', 'demolish', 'upgrade', 'milestone', 'alert', 'goal', 'horn', 'coin']);   // Stage 3: the raid horn and the coin tick
    expect(sfx.play('place')).toBe(false);
    expect(sfx.unlock()).toBe(false);
```


In `tests/ui/store.test.js`, replace:

```js
  it('has every field the conventions list', () => {
    const keys = Object.keys(INITIAL_UI_STATE).sort();
    expect(keys).toEqual(['area', 'category', 'confirmDialog', 'dock', 'ghost', 'hoverId', 'inputType', 'lastSpeed', 'layout', 'line', 'mode', 'overlay', 'panelFolded', 'selectedId', 'sheet', 'tool']);
  });
});
```

with:

```js
  it('has every field the conventions list', () => {
    const keys = Object.keys(INITIAL_UI_STATE).sort();
    expect(keys).toEqual(['area', 'category', 'confirmDialog', 'dock', 'ghost', 'hoverId', 'inputType', 'lastSpeed', 'layout', 'line', 'mode', 'overlay', 'panelFolded', 'screenshot', 'selectedId', 'sheet', 'tool']);
  });
});
```


In `tests/sim/longrun.test.js`, replace:

```js
function realVillage() {
  const w = makeTestWorld({ size: 48, fertile: [[0, 0, 8, 48]], gold: ECONOMY.startGold });
  const steps = [
    () => drawRoad(w, 0, 12, 27, 12),
```

with:

```js
function realVillage() {
  const w = makeTestWorld({ size: 48, fertile: [[0, 0, 8, 48]], gold: ECONOMY.startGold });
  w.calm = true;                                   // Stage 3 contract: no fire or raids until Track F gives it firehouses
  const steps = [
    () => drawRoad(w, 0, 12, 27, 12),
```


In `tests/sim/capital.test.js`, replace:

```js
  for (let y = 21; y < 23; y++) for (let x = 10; x < 14; x++) terrain[idx(SIZE, x, y)] = T.ROCKY;
  const map = { size: SIZE, terrain, tradeEntry: { x: 47, y: 20 }, startRoad: [], focus: { x: 24, y: 16 }, raiderEntries: [] };
  return createWorld({ seed: 5, size: SIZE, map });
}
```

with:

```js
  for (let y = 21; y < 23; y++) for (let x = 10; x < 14; x++) terrain[idx(SIZE, x, y)] = T.ROCKY;
  const map = { size: SIZE, terrain, tradeEntry: { x: 47, y: 20 }, startRoad: [], focus: { x: 24, y: 16 }, raiderEntries: [] };
  const w = createWorld({ seed: 5, size: SIZE, map });
  w.calm = true;                                   // Stage 3 contract: no fire or raids until Track F gives it firehouses and defences
  return w;
}
```


- [ ] **Step 6: Visual check**

Not a visual task: every stub draws nothing and adds nothing to a sheet, so the game looks as it did after Task 0.1. One check that the seams run in the real page: `/?skipTitle=1&nosw=1&seed=11` at 1280x800 plays with no console errors for a game month at 3x (open the browser's console, press Play, then 3x).

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 120
```

Expected: `sw-files.js` gains the eight new modules (148 entries), then `984 passed, 0 failed` and `ALL PASSED` (962 before, 22 new).

- [ ] **Step 8: Commit**

```powershell
git add src/render/fire.js src/render/units.js src/render/ambient.js src/render/renderer.js src/render/loop.js src/ui/danger.js src/ui/scoreUi.js src/ui/share.js src/save/records.js src/dev/scenes.js src/ui/createUI.js src/ui/alerts.js src/ui/store.js src/ui/modes.js src/ui/backstack.js src/ui/menu.js src/ui/sheets.js src/ui/hud.js src/data/ui.js src/ui/placement.js src/ui/confirmBar.js src/ui/settings.js src/ui/titleCard.js src/save/serialize.js src/audio/sfx.js src/boot.js src/sim/clock.js src/dev/sampleCity.js src/ui/text.js css/ui.css sw-files.js tests/stage3/contract.all.js tests/stage3/contract/uiSeams.test.js tests/stage3/contract/simSeams.test.js tests/helpers/testWorld.js tests/audio/sfx.test.js tests/sim/longrun.test.js tests/sim/capital.test.js tests/ui/store.test.js
git commit -m @'
Add the Stage 3 render and interface seams, records, the dev hook and a section per track

The renderer gains one hook each for ambient life, fire and units, and the loop a frame gate; the interface makes the
danger and score interfaces once and routes events, refreshes, alert actions and sheet parts to them; screenshot mode
hides the whole interface until a tap, Esc or Back; the wall card draws a line like the road tool; the confirm bar has
a seat for the score line and settings hold Ambient motion and On a fire. Boot gives every city a
records id, notes each save, carries the records in an export and merges them on import, and exposes the dev scene
hook before the title card. The text and the stylesheet get one section per track, and the long runs and sample
cities stay calm until their firehouses and defences come with Track F.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

After this commit, record its hash in the master ledger: it is the base of every track branch.

---

# Tracks A-F

The track tasks are being written in parallel and are added to this plan in the next commit, before Track 0 is merged.
