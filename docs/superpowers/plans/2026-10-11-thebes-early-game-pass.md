# Thebes: Visual, UX and Early-Game Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Stage 1 look closer to the approved mock-up and carry a new player through the first ten minutes: calm readable land, stock and crops you can see, a work-gang settle on every placement, cards with pictures, placement that lands and explains, a goals strip that points, problem markers, labelled corner buttons, a house sheet that says why, then a guided start, goals that keep coming, tips, an idle nudge, celebrations for firsts, streak-free daily goals and achievements.

**Architecture:** Sim first (Tasks 1-4): the world gains versioned fields for firsts, achievements, daily goals, the guide and running tallies, all evaluated by deterministic sim functions that the daily tick and a new `settle(world, events)` call run; `settle` runs after every command so steps finish while paused. Then the look (Tasks 5-7: terrain palette, stage-based sprite slots, a rise effect). Then interface (Tasks 8-16): each mechanic is a small `src/ui/*.js` module wired in `createUI.js`, reading the world and turning sim events into celebrations. Task 17 wraps up.

**Tech Stack:** HTML + CSS + JavaScript ES modules, Canvas 2D, the in-house test harness in headless Edge (`tests/run-tests.ps1`), `tests/serve.py`, PowerShell tools.

**Spec:** `docs/superpowers/specs/2026-10-11-thebes-early-game-pass-design.md` (this pass) and `docs/superpowers/specs/2026-10-09-thebes-design.md` (sections 4.1, 4.17, 5, 6, 7.3). Background: `docs/superpowers/notes/2026-10-11-city-builder-research.md`, `docs/superpowers/notes/2026-10-11-stage-1d-followups.md`.

**Out of scope:** new buildings, desirability, tiers 5-9, "New" badges, chimney smoke, boats, seasons, pausing on new events, a tutorial map.

## Global Constraints

- No build step, no npm, no frameworks, no third-party code. Plain ES modules, plain CSS in `css/ui.css`. Target browsers: iOS Safari 16+, current Android Chrome, current desktop Chrome, Edge, Firefox, Safari.
- The sim stays deterministic: no wall clock, no `Math.random`, no storage or DOM inside `src/sim`. The date for daily goals enters the sim only as a `dateKey` string argument (`'YYYY-MM-DD'`) passed by the interface.
- The UI changes the world only through sim functions (`src/sim/commands.js`, `src/sim/undo.js`, `assignLabour`, and this plan's `settle`, `setGuide`, `startDaily`, `swapDaily`). It never assigns world fields directly.
- Every world-shape change goes through `src/save/migrate.js`: this plan raises `WORLD_VERSION` from 1 to 2 in Task 1, and nothing else changes the shape afterwards.
- Spec 6.1 binds every new control: real `<button>`s with labels, 44 px targets, 4.5:1 text (dimmed cards included), one panel at a time, **nothing over the middle of the map** (new rows live in `#under-bar` at the top or in sheets), Back closes one step, meaning never by colour alone.
- Spec 5.4: everything that moves respects reduced motion (`settings.reducedMotion()` / `effects.reducedMotion`); pulses stay under 3 flashes per second and stop within 5 s.
- Nothing blocks play, nothing nags: tips once per device, the nudge goes silent after one line, the guide is skippable in one tap.
- Copy rules: plain English, sentence case, no jargon; "Pharaoh" never appears in code or text; **every string the player sees lives in `src/ui/text.js`**.
- Commit identity for this repo only: `Joshua Hedge <181878008+joshuahedge@users.noreply.github.com>` (already in `.git/config`; check `git config --local user.email` before the first commit). Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (the project's standing rule; it overrides any attribution habit of the implementing model).
- LF line endings. Run commands from `C:\dev\thebes`. The suite is `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` and must end with `ALL PASSED` before every commit (436 tests before this plan). `-Grep "<text>"` runs the tests whose names contain the text.
- After editing any file the service worker caches (anything under `src/`, `css/`, `index.html`, icons), rerun `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1` before the full suite, or the `ui pwa` test fails on the stale build stamp. New files under `src/` must be added to the cache list by the same tool.
- No `git push`, no remote changes. Work on the branch `early-game-pass`; the controller merges to `main` locally at the end.

## File Structure

```
src/data/goals.js            MODIFY: chapters, tier-count goals, EVENT_GOALS, GUIDE_GOALS, GUIDE_REWARD, EVENT_REWARD
src/data/firsts.js           NEW: FIRSTS (declarative), FIRST_REWARD
src/data/achievements.js     NEW: ACHIEVEMENTS (declarative, 24)
src/data/daily.js            NEW: DAILY_POOL, DAILY_COUNT, DAILY_REWARD, DAILY_AFTER
src/data/tips.js             NEW: TIPS (id, trigger, priority), TIP_GAP_MS, TIP_HOURLY_MAX, TIP_FIRST_DELAY_MS
src/data/ui.js               MODIFY: CATEGORY_TINT, NUDGE_GLOW_MS, NUDGE_LINE_MS, CHEER_MS, CHEER_GAP_MS, NEAREST_FIT_RADIUS
src/sim/world.js             MODIFY: WORLD_VERSION 2; firsts, achievements, daily, guide, tally, goals.triggered
src/sim/goals.js             MODIFY: new need kinds, goalProgress, event goals, settleGoals, guide helpers
src/sim/firsts.js            NEW: checkFirsts, firstMet
src/sim/achievements.js      NEW: checkAchievements, achievementProgress
src/sim/daily.js             NEW: dailyAvailable, pickDaily, startDaily, dailyProgress, checkDaily, swapDaily
src/sim/settle.js            NEW: settle(world, events): goals, firsts, achievements, daily
src/sim/commands.js          MODIFY: setGuide
src/sim/clock.js             MODIFY: tickDay/runMonth call the new checks; tally.peakPeople
src/sim/production.js        MODIFY: tally.harvested
src/sim/economy.js           MODIFY: tally.profitMonths
src/sim/housing.js           MODIFY: tally.upgrades; needCause; homesServedFrom
src/save/migrate.js          MODIFY: MIGRATIONS[1] (v1 -> v2)
src/save/serialize.js        MODIFY: REQUIRED and validateWorld for the new fields
src/render/art/palette.js    MODIFY: terrain colours (loam, meadow, shallows, off-map, edge fade)
src/render/terrainBaker.js   MODIFY: calmer blotches, fertile speckle in place of the offset pass
src/render/terrainWater.js   MODIFY: shallows strip
src/render/art/services.js   MODIFY: granary/bazaar stock stages, farm growth stages
src/render/art/figures.js    MODIFY: fig.hauler
src/render/art/registry.js   MODIFY: slotFor(b, world) with stage slots
src/render/effects.js        MODIFY: rise (work gang), sparkle
src/render/renderer.js       MODIFY: map-edge fade, stage slots, rising sprites revealed bottom-up
src/render/overlays.js       MODIFY: drawProblemMarkers, drawGuideMarker
src/ui/thumbs.js             NEW: drawThumb(canvas, item, dpr)
src/ui/cards.js              MODIFY: thumbnails, suggested/dimmed states
src/ui/dock.js, sidePanel.js, rail.js   MODIFY: hidden empty categories, tints, guide dot
src/ui/placement.js          MODIFY: nearestFit, effect text in the preview, rise on confirm
src/ui/confirmBar.js         MODIFY: effect line, rotate only when it rotates
src/ui/speed.js, corners.js  MODIFY: words on the buttons
src/ui/sheets.js             MODIFY: house checklist with cause, fix and Show me; plain mood rows; achievements
src/ui/goalsList.js          MODIFY: progress chip, reward unit, filled Show me, chapters, Today, Skip guide
src/ui/guide.js              NEW: guide state -> classes on cards, categories and the map marker
src/ui/celebrate.js          NEW: the caption queue in #cheer
src/ui/tips.js               NEW: the tip row in #tip, rate limits, seen per device
src/ui/nudge.js              NEW: the idle nudge state machine
src/ui/welcomeBack.js        MODIFY: today's goals, ▲▼ trends, closest achievement
src/ui/settings.js           MODIFY: help ('full' | 'tips' | 'off'), seenTips
src/ui/menu.js               MODIFY: Help choice row; tips list and Resume guide in How to play
src/ui/createUI.js           MODIFY: wiring (settle after commands, date key, guide, cheers, tips, nudge, markers)
src/ui/text.js               MODIFY: every new string
src/boot.js                  MODIFY: a new city's guide follows settings.help
index.html                   MODIFY: #cheer and #tip rows in #under-bar
css/ui.css                   MODIFY: styles for all of the above
tests/...                    one new test file per new module, listed in tests/all.js
```

## Conventions every task relies on

- Tests use `describe`/`it`/`expect` from `tests/harness.js` (`toBe`, `toEqual`, `toBeTruthy`, `toBeFalsy`, `toBeGreaterThan`, `toBeGreaterThanOrEqual`, `toBeLessThan`, `toBeLessThanOrEqual`, `toContain`, `toThrow`); async tests are fine. Every new test file is imported in `tests/all.js` (append near related files).
- Sim fixtures: `makeTestWorld({ size, fertile, gold })`, `setRoad(world, x0, y0, x1, y1)`, `addRaw(world, type, x, y, extra)`, `staffAll(world)` from `tests/helpers/testWorld.js`. `makeTestWorld` has an empty `startRoad`, fertile land at x < 8 and 100,000 gold unless told otherwise.
- UI fixtures: `rigUI({ width, height, hooks, welcome, sfx })` from `tests/helpers/uiWorld.js` mounts the real shell (`index.html` + `css/ui.css`) with `uiWorld()` (road along y = 10, two huts at (12,9) and (13,9), farm, granary, bazaar, well, temple south of the road) and returns `{ root, world, canvas, cam, ui, store, history, doc, tap, resize, frame, cleanup }`. Always `cleanup()` in a `try/finally`.
- `el(tag, props, children)`, `button(label, props)`, `iconButton(label, glyph, props)`, `icon(glyph)`, `clear(node)`, `setText(node, text)` from `src/ui/components.js`.
- A sim function that can fail returns `{ ok: false, reason }`; success is `{ ok: true, ... }`.
- Sim events are plain objects pushed into an optional `events` array: existing `{ type: 'upgrade' | 'downgrade' | 'milestone' | 'goal' | 'month' | 'arrivals' }`, plus this plan's `first`, `achievement`, `daily`, `guide_done` (shapes below).

## Interfaces between tasks (the contract)

Every task implements its part of this contract exactly; later tasks rely on these names and shapes.

### World fields (Task 1)
- `WORLD_VERSION = 2`. `createWorld` adds:
  - `firsts: []` (ids from `FIRSTS`; `null` means "mark what is already true without celebrating" and is only ever produced by the migration)
  - `achievements: []` (ids from `ACHIEVEMENTS`; `null` as above)
  - `daily: null` or `{ date: 'YYYY-MM-DD', picks: [id, id, id], base: { [id]: number }, done: [id...], swapped: boolean }`
  - `guide: { on: true, done: false }`
  - `tally: { harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0 }`
  - `goals: { completed: [], triggered: [] }`
- Tallies: `produceDay` adds 1 to `tally.harvested` for every unit of a food good it stores; `monthlyEconomy` adds 1 to `tally.profitMonths` when `net > 0`; `monthlyHousing` adds 1 to `tally.upgrades` per upgrade; `tickDay` sets `tally.peakPeople = max(peakPeople, population)`; `checkDaily` adds 1 to `tally.dailyDone` per daily goal done.
- `MIGRATIONS[1](w)` returns a new object with `version: 2`, `firsts: null`, `achievements: null`, `daily: null`, `guide: { on: false, done: true }`, `tally: { harvested: 0, profitMonths: 0, peakPeople: <population of w>, upgrades: 0, dailyDone: 0 }`, `goals: { completed: w.goals.completed.slice(), triggered: [] }`, and every other field of `w` unchanged.
- `validateWorld` requires the five new keys; `firsts`/`achievements` are `null` or arrays of strings; `daily` is `null` or an object with `date` string, `picks`/`done` arrays, `base` object, `swapped` boolean; `guide` has boolean `on`/`done`; `tally` has the five finite numbers; `goals.triggered` is an array.

### Goals (Task 2) — `src/data/goals.js`, `src/sim/goals.js`
- Data: `GOAL_REWARD = 25`, `EVENT_REWARD = 10`, `GUIDE_REWARD = 50`. `GOALS` in order: `road`, `plots`, `well`, `food`, `temple`, `homes_cottage` (`{ kind: 'tier', tier: 3, n: 8 }`, text "Grow 8 homes to Cottage or better"), `people100`, `homes_house` (`{ kind: 'tier', tier: 4, n: 8 }`, "Grow 8 homes to House or better"), `town`. Each goal gains `chapter: 'first_homes' | 'feed' | 'grow'` (road, plots, well → `first_homes`; food, temple → `feed`; the rest → `grow`). `GUIDE_GOALS = ['road', 'plots', 'well', 'food', 'temple']`.
- `EVENT_GOALS`: `{ id, trigger, chapter: 'event', text, reward: EVENT_REWARD, need, showMe }`:
  - `fix_bazaar`: trigger `'bazaar_empty'`, "Get grain to the bazaar", need `{ kind: 'noAlert', code: 'bazaar_empty' }`, showMe `{ category: 'food', item: 'granary', target: 'alert', code: 'bazaar_empty' }`
  - `more_workers`: trigger `'labour_shortage'`, "Find more workers: place more homes", need `{ kind: 'noAlert', code: 'labour_shortage' }`, showMe `{ category: 'homes', item: 'house', target: 'houses' }`
  - `more_jobs`: trigger `'unemployment'`, "Make more jobs: build a farm or a bazaar", need `{ kind: 'noAlert', code: 'unemployment' }`, showMe `{ category: 'food', item: 'farm_grain', target: 'focus' }`
  - `out_of_debt`: trigger `'debt'`, "Get out of debt", need `{ kind: 'gold', n: 0 }`, showMe `null` (Show me opens the city summary)
- Goal texts stay in `src/data/goals.js` as today (the goals list is data; missions reuse it).
- Sim (`src/sim/goals.js`):
  - `goalById(id)`: searches `GOALS` then `EVENT_GOALS`; `null` if neither.
  - `goalMet(world, need)`: existing kinds plus `tier` (houses with `tier >= need.tier` number at least `need.n`), `noAlert` (no entry of `alertsFor(world)` has `code === need.code`), `gold` (`world.gold >= need.n`); `road` becomes "at least one road tile that is not in `world.startRoad`".
  - `goalProgress(world, goal)` → `{ n, of } | null`: `houses` → `{ n: homes, of: need.n }`; `building` → `{ n: min(count, need.n || 1), of: need.n || 1 }`; `people` → `{ n: min(pop, need.n), of: need.n }`; `tier` → `{ n: min(count, need.n), of: need.n }`; `all` → `{ n: parts met, of: parts }`; anything else `null`.
  - `triggerEventGoals(world)`: for each event goal not in `goals.triggered` and not in `goals.completed`, if any `alertsFor(world)` entry has `code === goal.trigger`, push its id to `goals.triggered`.
  - `openGoals(world, limit = 3)`: triggered, uncompleted event goals first (in `EVENT_GOALS` order), then uncompleted `GOALS`; sliced to `limit`.
  - `checkGoals(world, events = null)`: completes at most one open goal (as today), pays `goal.reward`, pushes `{ type: 'goal', id, reward }`; then, if `world.guide.on && !world.guide.done` and every `GUIDE_GOALS` id is completed, sets `guide.done = true`, adds `GUIDE_REWARD` gold and pushes `{ type: 'guide_done', reward: GUIDE_REWARD }`. Returns the goal or `null`.
  - `settleGoals(world, events = null)`: calls `checkGoals` until it returns `null` (at most 20 times).
  - `nextItemFor(world, goal)`: for an `all` need, the `type` of the first unmet `building` part; otherwise `goal.showMe ? goal.showMe.item : null`.
  - `guideActive(world)`: `world.guide.on && !world.guide.done && GUIDE_GOALS.some((id) => !completed)`.
  - `guideGoal(world)`: the first `openGoals(world, 99)` entry whose id is in `GUIDE_GOALS`, or `null`.
- `src/sim/commands.js`: `setGuide(world, on)` sets `world.guide.on = Boolean(on)` and returns `{ ok: true, warnings: [] }`.
- `src/sim/settle.js`: `settle(world, events = null)` runs `settleGoals`, then (from Task 3) `checkFirsts` and `checkAchievements`, then (from Task 4) `checkDaily`, in that order, and returns `events`.
- `tickDay`: after arrivals and before the month: unchanged; at the end: `triggerEventGoals(world); checkGoals(world, events);` (Task 3 adds `checkFirsts`, Task 4 adds `checkDaily`).

### Firsts and achievements (Task 3)
- `src/data/firsts.js`: `FIRST_REWARD = 10`; `FIRSTS = [{ id, check }]` in this order, `check` declarative: `first_family` `{ kind: 'people', n: 1 }`, `first_full_home` `{ kind: 'fullHome' }`, `first_harvest` `{ kind: 'tally', key: 'harvested', n: 1 }`, `first_shack` `{ kind: 'tier', tier: 2 }`, `first_cottage` `{ kind: 'tier', tier: 3 }`, `first_house` `{ kind: 'tier', tier: 4 }`, `first_profit` `{ kind: 'tally', key: 'profitMonths', n: 1 }`, `people_100` `{ kind: 'people', n: 100 }`.
- `src/sim/firsts.js`: `firstMet(world, def)` → `null` when not met, else `{ x, y }` (the centre of a fitting building: the first house with residents, the first full house, the first granary holding food, the first house at the tier) or `{ x: null, y: null }` when there is no place (profit). `checkFirsts(world, events = null)`: when `world.firsts === null`, set it to the ids already met and return without events or gold; otherwise for each unrecorded first that is met, record it, add `FIRST_REWARD` gold and push `{ type: 'first', id, reward: FIRST_REWARD, x, y }`.
- `src/data/achievements.js`: `ACHIEVEMENTS = [{ id, measure }]`, 24 entries, `measure` declarative: `{ kind: 'roads', n }` (road tiles not in the start road), `{ kind: 'homes', n }` (housing plots), `{ kind: 'buildings', type, n }`, `{ kind: 'tier', tier, n }` (homes at that tier or above), `{ kind: 'people', n }` (uses `tally.peakPeople` and the live population, the larger), `{ kind: 'tally', key, n }`, `{ kind: 'goals', n }` (goals completed), `{ kind: 'fedAll', people }` (every home at tier 3 or above has `met.food`, at least `people` people, at least one such home), `{ kind: 'waterAll', homes }` (every home with residents is covered by water, at least `homes` homes), `{ kind: 'jobs', people, rate }` (population at least `people` and unemployment at most `rate`). The list: `way_in` roads 10; `neighbours` homes 10; `street` homes 25; `busy_streets` homes 50; `water_bearer` well 5; `breadbasket` farm_grain 3; `plenty` granary 2; `market_day` bazaar 3; `faithful` temple 2; `shack_row` tier 2 ×10; `cottage_lane` tier 3 ×20; `house_proud` tier 4 ×20; `hamlet` people 50; `town` people 150; `bustling` people 300; `good_harvests` harvested 500; `granary_of_the_river` harvested 2000; `steady_books` profitMonths 6; `prosperous` profitMonths 24; `no_one_hungry` fedAll 100; `water_for_all` waterAll 30; `busy_hands` jobs 150 / 0.05; `on_course` goals 9; `day_by_day` dailyDone 10.
- `src/sim/achievements.js`: `achievementProgress(world, def)` → `{ n, of }` with `n` clamped to `of` (boolean kinds report `{ n: 0 | 1, of: 1 }`); `checkAchievements(world, events = null)`: `null` → silent mark as for firsts; otherwise record each newly complete id and push `{ type: 'achievement', id }`. No gold.
- `tickDay` gains `checkFirsts(world, events)` after `checkGoals`; `runMonth` gains `checkAchievements(world, events)` after `computeAlerts`. `settle` gains both.

### Daily goals (Task 4)
- `src/data/daily.js`: `DAILY_COUNT = 3`, `DAILY_REWARD = 25`, `DAILY_AFTER = 'temple'`, `DAILY_POOL = [{ id, measure, n }]`: `plots4` `{ kind: 'homes' }` n 4; `roads10` `{ kind: 'roads' }` n 10; `upgrades3` `{ kind: 'tally', key: 'upgrades' }` n 3; `well1` `{ kind: 'buildings', type: 'well' }` n 1; `bazaar1` `{ kind: 'buildings', type: 'bazaar' }` n 1; `temple1` `{ kind: 'buildings', type: 'temple' }` n 1; `farm1` `{ kind: 'buildings', type: 'farm_grain' }` n 1; `people20` `{ kind: 'people' }` n 20; `profit1` `{ kind: 'tally', key: 'profitMonths' }` n 1; `harvest100` `{ kind: 'tally', key: 'harvested' }` n 100. A pool entry is available when its building type (if any) is unlocked.
- `src/sim/daily.js`: `dailyAvailable(world)` → `world.goals.completed.includes(DAILY_AFTER)`; `dailyMeasure(world, def)` → the current number (homes count, road tiles beyond the start road, the tally value, the building count, the population); `pickDaily(world, dateKey)` → `DAILY_COUNT` distinct available ids, a deterministic shuffle seeded by a hash of `dateKey` and `world.seed` (same inputs, same picks); `startDaily(world, dateKey)` → `true` when it drew a new day (sets `world.daily = { date, picks, base, done: [], swapped: false }` with `base[id] = dailyMeasure(...)`), `false` when not available or already drawn for that date; `dailyProgress(world, id)` → `{ n: clamp(measure - base, 0, n), of: n }`; `checkDaily(world, events = null)` → for each pick not done with `n >= of`: record, add `DAILY_REWARD`, `tally.dailyDone += 1`, push `{ type: 'daily', id, reward: DAILY_REWARD }`; `swapDaily(world, index)` → `{ ok: false, reason: 'no_swap' }` when there is no day, the swap is used, or the pick is done; otherwise replaces `picks[index]` with the first available id (in the same shuffle order) not already picked, sets its base, marks `swapped`, returns `{ ok: true, id }`.
- `tickDay` gains `if (world.daily) checkDaily(world, events)` after `checkFirsts`; `settle` gains it.
- The interface computes `dateKey` from the device clock (`dateKeyOf(ms)` in `src/ui/goalsList.js`, local date, zero-padded) and calls `startDaily` when the game starts and whenever the key changes (checked once per rendered game day).

### Rendering (Tasks 5-7, 10)
- `TERRAIN` gains `offMap`, `edgeFade`, `fertileSpeck`, `fertileTuft`, `shallows`; `fertile`, `fertileSoft`, `fertileSecond`, `grass`, `grassSoft`, `grassSecond`, `sandOff` change value (Task 5).
- `slotFor(b, world = null)` (Task 6): `house.t<tier>` as today; `granary.s<0-3>` from `granaryStage(b)`, `bazaar.s<0-2>` from `bazaarStage(b)`, `farm_grain.g<0-3>` from `farmStage(world, b)` (with `world === null`, the plain type slot); everything else the type. `ART` keeps `granary`, `bazaar` and `farm_grain` as the full/middle stages for card thumbnails and assets. The stage helpers live in `src/render/art/stages.js`.
- `effects.rise(id, x, y, w, d, now)` and `effects.risingIds(now)` → `Map<id, t>` with `t` in `[0, 1)` (Task 7); `EFFECT_MS.rise = 900`; `renderFrame` takes `opts.rising` (that map) and reveals those sprites bottom-up; `effects.sparkle(x, y, color, now)` (Task 14) with `EFFECT_MS.sparkle = 1200`.
- `drawProblemMarkers(g, world, alerts, range)` (Task 10) and `drawGuideMarker(g, x, y, pulsing, now)` (Task 13) in `src/render/overlays.js`, called from `createUI.render`'s `drawOverlay`.

### Interface (Tasks 8-16)
- `nearestFit(world, tool, x, y, maxR = NEAREST_FIT_RADIUS)` in `src/ui/placement.js` → `{ x, y }` (Task 8); `placement.start(tool, centre)` and `createUI`'s Show me use it for building tools. `NEAREST_FIT_RADIUS = 10`.
- `homesServedFrom(world, type, x, y)` in `src/sim/housing.js` → the number of housing plots (any tier, empty ones included) that a service of that type placed at that spot would reach along the roads within its `reach`, using the same rule as `coveredBy` (Task 8). `toolPreview` adds `effect: string` (`''` when none); `effectText(type, n)` in `text.js`.
- `drawThumb(canvas, item, dpr = 1)` in `src/ui/thumbs.js` (Task 9). `CATEGORY_TINT` in `src/data/ui.js`; `visibleCategories()` → `CATEGORIES` entries with at least one item.
- `needCause(world, house, need)` in `src/sim/housing.js` -> `null` when the home has the need (or `need` is not one of road, water, food, religion), else `{ code, id }`:
  - `no_road` (id null): the home touches no road; every missing need of such a home reports this.
  - `no_well`, `no_bazaar`, `no_temple` (id null): no well, bazaar or temple of that kind reaches the home along the roads at all, working or not.
  - `well_idle`, `bazaar_idle`, `temple_idle` (id the building): one reaches the home but is paused or short of workers (the nearest such).
  - `bazaar_empty` (id the bazaar): a working bazaar reaches the home, holds no grain, and no granary lies within its supply reach.
  - `granary_empty` (id the granary): a working bazaar is empty and a working, empty granary lies within its supply reach (the nearest such).
  - `granary_idle` (id the granary): a working bazaar is empty and every granary within its supply reach is empty and paused or short of workers (the nearest such).
  - `next_delivery` (id the bazaar): a working bazaar reaching the home holds grain, or can draw on a granary that holds some, so the next monthly delivery feeds it.
- `src/ui/text.js`: `CAUSE_TEXT[code]` is `{ cause, fix }`, or `{ paused: { cause, fix }, short: { cause, fix } }` for the `*_idle` codes; `causeText(cause, world)` returns `{ cause, fix }` using the building's real state (`b.paused`). `residentsLabel` no longer exists; `progressText(n, of)` does.
- `createSheets({ ..., onShowMe, onSelect })`: `onShowMe({ category, item, x, y })` for a fix that builds something (Show me); `onSelect(buildingId)` for a fix that is a building already in reach (View). `createUI` passes `showMeAt` and its `selectBuilding(id)` (select the building, open its sheet and pan to it; also used by alert View). Every Show me button is labelled `Show me: <fix>`, every View `View: <building name>`.
- `createUI` (Task 11) gains `showMeAt({ category, item, x, y })`: closes any sheet, picks the category, starts the tool (a building ghost lands on `nearestFit` there), pans to `(x, y)` while keeping the ghost inside the free view (`cameraControl.panToKeeping`), and pulses; goal Show me and the house sheet's Show me both call it. `createSheets` takes `onShowMe(target)`.
- Task 12 wires `settle`: `createUI.afterCommand` runs `const events = settle(world, [])` and, if any, `effects.fromEvents(world, events, now())` and `onEvents(events)`. It also owns `dateKeyOf(ms)` and the `startDaily` calls. The goals strip gets `onSkipGuide` and shows `goalProgress`.
- `createGuide({ world, store, root })` in `src/ui/guide.js` (Task 13) → `{ state(), render() }` where `state()` → `{ active, goal, item, category }`; it sets `body.guide-on`, `[data-item=<item>].suggested` and `.dimmed` on other cards, and `.suggested` on the category button. `settings.help`: `'full' | 'tips' | 'off'` (default `'full'`); `settings.seenTips`: array of tip ids (default `[]`).
- `createCelebrations({ container, setTimer, clearTimer })` in `src/ui/celebrate.js` (Task 14) → `{ show({ tier: 'first' | 'milestone', text, reward = 0 }), clear(), pending() }`. `CHEER_MS = { first: 2500, milestone: 4000 }`, `CHEER_GAP_MS = 3000`. `#cheer` is the last row of `#under-bar` (after `#goals`, and after `#tip` once Task 15 adds it), so a caption never moves the goals strip.
- `createTips({ container, settings, now })` in `src/ui/tips.js` (Task 15) → `{ trigger(key, { busy }), dismiss(), current() }`; `#tip` sits between `#goals` and `#cheer` in `#under-bar`. `createNudge({ now })` in `src/ui/nudge.js` → `{ noteAction(), noteProgress(signature), tick({ running, busy }) }` returning `'none' | 'glow' | 'line'`. `NUDGE_GLOW_MS = 45000`, `NUDGE_LINE_MS = 60000`.
- Achievements on the summary sheet and the Welcome back additions (Task 16) read `ACHIEVEMENTS`, `achievementProgress`, `world.daily`, `dailyProgress`.

## How to run tests

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "goals"
```

Expected at the end of every task: `ALL PASSED`. A task that edits a cached file runs `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1` before the full run.

---
### Task 1: World version 2, tallies and the migration

**Files:**
- Modify: `src/sim/world.js` (`WORLD_VERSION = 2`; `createWorld` adds `firsts`, `achievements`, `daily`, `guide`, `tally`, `goals.triggered`)
- Modify: `src/sim/production.js` (`tally.harvested`)
- Modify: `src/sim/economy.js` (`tally.profitMonths`)
- Modify: `src/sim/housing.js` (`tally.upgrades`)
- Modify: `src/sim/clock.js` (`tally.peakPeople` in `tickDay`)
- Modify: `src/save/migrate.js` (exported `MIGRATIONS` with the v1 -> v2 step)
- Modify: `src/save/serialize.js` (`REQUIRED` and `validateWorld` for the new fields)
- Modify: `sw-files.js` (regenerated by `tools/sw-files.ps1`)
- Create: `tests/sim/worldV2.test.js`, `tests/save/migrateV2.test.js`
- Modify: `tests/all.js` (two imports), `tests/save/store.test.js` and `tests/save/serialize.test.js` (version pins)
- Test: `tests/sim/worldV2.test.js`, `tests/save/migrateV2.test.js`

**Interfaces:**
- Consumes: `createWorld`, `population`, `removeBuilding` (`src/sim/world.js`); `GOODS` (`src/data/goods.js`); `produceDay`, `monthlyEconomy`, `monthlyHousing`, `tickDay`, `advanceDays`; `migrate`, `CURRENT_VERSION`; `serialize`, `deserialize`, `validateWorld`, `unpackSave`, `REQUIRED`; the fixtures `makeTestWorld`, `setRoad`, `addRaw`, `staffAll`.
- Produces (contract, World fields): `WORLD_VERSION = 2`. World fields: `firsts: []`, `achievements: []`, `daily: null`, `guide: { on: true, done: false }`, `tally: { harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0 }`, `goals: { completed: [], triggered: [] }`. Tallies: `produceDay` adds to `harvested`, `monthlyEconomy` to `profitMonths`, `monthlyHousing` to `upgrades`, and `tickDay` sets `peakPeople`. `tally.dailyDone` stays at 0 until Task 4's `checkDaily`. `MIGRATIONS[1](w)` (now exported), `REQUIRED` with the five new keys, and `validateWorld` rules for each.

- [ ] **Step 1: Write the failing tests**

Before anything else, from `C:\dev\thebes` (this is the plan's first commit):

```powershell
git branch --show-current          # expected: early-game-pass
git config --local user.email      # expected: 181878008+joshuahedge@users.noreply.github.com
```

Create `tests/sim/worldV2.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { createWorld, population, removeBuilding, WORLD_VERSION } from '../../src/sim/world.js';
import { produceDay } from '../../src/sim/production.js';
import { monthlyEconomy } from '../../src/sim/economy.js';
import { monthlyHousing } from '../../src/sim/housing.js';
import { tickDay, advanceDays } from '../../src/sim/clock.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y = 10; a farm on fertile land (x < 8) and a granary beside it, both touching the road.
function farmWorld() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  const farm = addRaw(w, 'farm_grain', 2, 8);
  const granary = addRaw(w, 'granary', 5, 8);
  return { w, farm, granary };
}

describe('world v2', () => {
  it('creates a version 2 world with the new fields at their starting values', () => {
    const w = createWorld({ seed: 4 });
    expect(WORLD_VERSION).toBe(2);
    expect(w.version).toBe(2);
    expect(w.firsts).toEqual([]);
    expect(w.achievements).toEqual([]);
    expect(w.daily).toBe(null);
    expect(w.guide).toEqual({ on: true, done: false });
    expect(w.tally).toEqual({ harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0 });
    expect(w.goals).toEqual({ completed: [], triggered: [] });
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
  });
  it('counts every unit of food a farm stores, and nothing when the farm is stopped', () => {
    const { w, farm, granary } = farmWorld();
    staffAll(w);
    for (let d = 0; d < 10; d++) produceDay(w);
    expect(granary.store.grain).toBe(10);
    expect(w.tally.harvested).toBe(10);
    farm.staff = 2;                                   // under a quarter of 10 workers: the farm stops
    for (let d = 0; d < 10; d++) produceDay(w);
    expect(farm.blocked).toBe('understaffed');
    expect(w.tally.harvested).toBe(10);
    farm.staff = 5;                                   // half staffed: half a unit a day
    for (let d = 0; d < 10; d++) produceDay(w);
    expect(granary.store.grain).toBe(15);
    expect(w.tally.harvested).toBe(15);
  });
  it('counts the harvest through the daily tick when homes staff the farm', () => {
    const { w, granary } = farmWorld();
    for (let x = 10; x < 20; x++) addRaw(w, 'house', x, 11, { tier: 1, residents: 5 });   // 50 people: 20 workers for 16 jobs
    advanceDays(w, 30);
    expect(granary.store.grain).toBe(30);
    expect(w.tally.harvested).toBe(30);
  });
  it('counts a month in profit and not a month at a loss', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'house', 2, 11, { tier: 2, residents: 8 });
    addRaw(w, 'house', 3, 11, { tier: 4, residents: 16 });
    const temple = addRaw(w, 'temple', 12, 8, { staff: 6 });
    addRaw(w, 'well', 20, 9);
    monthlyEconomy(w);                                // taxes 40, wages 24, upkeep 13: net +3
    expect(w.stats.lastMonth.net).toBe(3);
    expect(w.tally.profitMonths).toBe(1);
    temple.staff = 0;
    addRaw(w, 'granary', 14, 8, { staff: 6 });        // wages 24, upkeep 19 against taxes 40: net -3
    monthlyEconomy(w);
    expect(w.stats.lastMonth.net).toBe(-3);
    expect(w.tally.profitMonths).toBe(1);
  });
  it('counts each upgrade and never a downgrade', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const a = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    const b = addRaw(w, 'house', 14, 11, { tier: 1, residents: 5 });
    const well = addRaw(w, 'well', 13, 9);
    monthlyHousing(w);                                // no events array: still counted
    expect([a.tier, b.tier]).toEqual([2, 2]);
    expect(w.tally.upgrades).toBe(2);
    removeBuilding(w, well.id);
    monthlyHousing(w);
    monthlyHousing(w);                                // two dry months: both drop back to huts
    expect([a.tier, b.tier]).toEqual([1, 1]);
    expect(w.tally.upgrades).toBe(2);
  });
  it('keeps the peak population through the daily tick', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const h = addRaw(w, 'house', 5, 11);
    advanceDays(w, 9);
    expect(w.tally.peakPeople).toBe(0);
    advanceDays(w, 1);                                // the first arrivals come on day 10
    expect(population(w)).toBe(5);
    expect(w.tally.peakPeople).toBe(5);
    h.residents = 1;
    tickDay(w);
    expect(population(w)).toBe(1);
    expect(w.tally.peakPeople).toBe(5);
  });
});
```

Where the numbers come from:
- At full staffing a farm makes `perMonth / 30 = 1` unit a day.
- 2 staff out of 10 is 0.2, below `MIN_STAFF_RATIO` 0.25, so the farm stops.
- The daily-tick test has 50 residents, so the workforce is `floor(50 * 0.4) = 20`. That covers the 16 essential jobs (farm 10, granary 6), so both buildings are fully staffed every day and 30 units are stored in 30 days.
- The economy figures are those of the existing `tests/sim/economy.test.js` fixture.

Create `tests/save/migrateV2.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { migrate, MIGRATIONS, CURRENT_VERSION } from '../../src/save/migrate.js';
import { serialize, deserialize, validateWorld, unpackSave, REQUIRED } from '../../src/save/serialize.js';
import { createWorld, population } from '../../src/sim/world.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';

const NEW_KEYS = ['firsts', 'achievements', 'daily', 'guide', 'tally'];
const code = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };

// A version 1 save as Stage 1d wrote it: a lived-in city without the version 2 fields.
function v1City() {
  const w = createWorld({ seed: 7 });
  const { x, y } = w.focus;
  expect(drawRoad(w, x - 6, y, x + 6, y).ok).toBe(true);
  expect(paintHouses(w, x - 5, y + 1, x + 5, y + 1).ids.length).toBeGreaterThan(0);
  expect(place(w, 'well', x, y - 1).ok).toBe(true);
  advanceDays(w, 75);
  const v1 = JSON.parse(serialize(w));
  for (const k of NEW_KEYS) delete v1[k];
  v1.goals = { completed: v1.goals.completed.slice() };
  v1.version = 1;
  return v1;
}

// A valid version 2 world as plain data, changed by fn, then validated.
function validAfter(fn) {
  const w = JSON.parse(serialize(createWorld({ seed: 3 })));
  fn(w);
  return validateWorld(w);
}

describe('migrate v1 to v2', () => {
  it('adds the new fields, turns the guide off and keeps everything else', () => {
    const v1 = v1City();
    expect(population(v1)).toBeGreaterThan(0);
    expect(v1.goals.completed.length).toBeGreaterThan(0);
    const before = JSON.stringify(v1);
    const v2 = MIGRATIONS[1](v1);
    expect(JSON.stringify(v1)).toBe(before);                      // the old object is not changed
    expect(v2.version).toBe(2);
    expect(v2.firsts).toBe(null);
    expect(v2.achievements).toBe(null);
    expect(v2.daily).toBe(null);
    expect(v2.guide).toEqual({ on: false, done: true });
    expect(v2.tally).toEqual({ harvested: 0, profitMonths: 0, peakPeople: population(v1), upgrades: 0, dailyDone: 0 });
    expect(v2.goals).toEqual({ completed: v1.goals.completed, triggered: [] });
    expect(v2.goals.completed === v1.goals.completed).toBe(false); // a copy, not the same array
    for (const k of Object.keys(v1)) if (k !== 'version' && k !== 'goals') expect([k, v2[k]]).toEqual([k, v1[k]]);
    expect(Object.keys(v2).sort()).toEqual([...REQUIRED].sort());
    expect(validateWorld(v2)).toBe(true);
  });
  it('runs through migrate, deserialize and unpackSave', () => {
    const v1 = v1City();
    expect(CURRENT_VERSION).toBe(2);
    expect(migrate(v1)).toEqual(MIGRATIONS[1](v1));
    expect(deserialize(JSON.stringify(v1)).version).toBe(2);
    const back = unpackSave(JSON.stringify({ version: 1, savedAt: 1760000000000, lastSpeed: 2, world: v1 }));
    expect(back.savedAt).toBe(1760000000000);
    expect(back.lastSpeed).toBe(2);
    expect(back.world.version).toBe(2);
    expect(back.world.guide.on).toBe(false);
    expect(back.world.tally.peakPeople).toBe(population(v1));
    expect(back.world.buildings).toEqual(v1.buildings);
  });
  it('reports a malformed version 1 save as corrupt, not as a failed migration', () => {
    expect(code(() => deserialize(JSON.stringify({ version: 1 })))).toBe('corrupt_save');
    const v1 = v1City();
    v1.goals = { completed: 'none' };
    expect(code(() => deserialize(JSON.stringify(v1)))).toBe('corrupt_save');
  });
});

describe('validateWorld v2', () => {
  it('accepts a new world, a drawn daily and a migrated city', () => {
    expect(validAfter(() => {})).toBe(true);
    expect(validAfter((w) => { w.daily = { date: '2026-10-11', picks: ['plots4', 'roads10', 'well1'], base: { plots4: 0, roads10: 3, well1: 1 }, done: ['well1'], swapped: false }; })).toBe(true);
    expect(validAfter((w) => { w.firsts = null; w.achievements = null; w.guide = { on: false, done: true }; })).toBe(true);
    expect(validAfter((w) => { w.firsts = ['first_family']; w.achievements = ['way_in']; w.goals.triggered = ['fix_bazaar']; })).toBe(true);
  });
  it('requires each new field', () => {
    for (const k of NEW_KEYS) expect([k, validAfter((w) => { delete w[k]; })]).toEqual([k, false]);
    expect(validAfter((w) => { delete w.goals.triggered; })).toBe(false);
  });
  it('rejects bad firsts and achievements', () => {
    expect(validAfter((w) => { w.firsts = 'first_family'; })).toBe(false);
    expect(validAfter((w) => { w.firsts = [1]; })).toBe(false);
    expect(validAfter((w) => { w.achievements = {}; })).toBe(false);
  });
  it('rejects a bad daily', () => {
    const good = () => ({ date: '2026-10-11', picks: ['plots4'], base: { plots4: 0 }, done: [], swapped: false });
    expect(validAfter((w) => { w.daily = { ...good(), date: 20261011 }; })).toBe(false);
    expect(validAfter((w) => { const d = good(); delete d.picks; w.daily = d; })).toBe(false);
    expect(validAfter((w) => { w.daily = { ...good(), done: 'none' }; })).toBe(false);
    expect(validAfter((w) => { w.daily = { ...good(), base: [] }; })).toBe(false);
    expect(validAfter((w) => { w.daily = { ...good(), swapped: 'no' }; })).toBe(false);
    expect(validAfter((w) => { w.daily = []; })).toBe(false);
  });
  it('rejects a bad guide', () => {
    expect(validAfter((w) => { w.guide = null; })).toBe(false);
    expect(validAfter((w) => { w.guide = { on: 'yes', done: false }; })).toBe(false);
    expect(validAfter((w) => { w.guide = { on: true }; })).toBe(false);
  });
  it('rejects a bad tally', () => {
    expect(validAfter((w) => { w.tally = null; })).toBe(false);
    expect(validAfter((w) => { delete w.tally.upgrades; })).toBe(false);
    expect(validAfter((w) => { w.tally.harvested = '12'; })).toBe(false);
    expect(validAfter((w) => { w.tally.peakPeople = NaN; })).toBe(false);
    expect(validAfter((w) => { w.tally.dailyDone = Infinity; })).toBe(false);
  });
});
```

In `tests/all.js`, replace:

```js
import './sim/world.test.js';
```

with:

```js
import './sim/world.test.js';
import './sim/worldV2.test.js';
```

and replace:

```js
import './save/serialize.test.js';
```

with:

```js
import './save/serialize.test.js';
import './save/migrateV2.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "v2"
```

Expected: `LOAD ERROR` with `SyntaxError: The requested module '../../src/save/migrate.js' does not provide an export named 'MIGRATIONS'`. The whole page fails to load because a named import is missing. (If you comment out the migrate test import, the world v2 tests fail on `expected 1 to be 2` and on `w.tally` being undefined.)

- [ ] **Step 3: Implement**

**`src/sim/world.js`**. Replace:

```js
export const WORLD_VERSION = 1;
```

with:

```js
export const WORLD_VERSION = 2;
```

Then replace:

```js
    goals: { completed: [] },                           // ids of finished goals, in order
    history: [],                                        // { day, people, gold, mood } per month end, newest last
  };
```

with:

```js
    goals: { completed: [], triggered: [] },            // ids of finished goals, in order; event goals that have fired
    history: [],                                        // { day, people, gold, mood } per month end, newest last
    firsts: [],                                         // ids of firsts already celebrated (null: mark silently, from a v1 save)
    achievements: [],                                   // ids of achievements already earned (null as for firsts)
    daily: null,                                        // today's daily goals: { date, picks, base, done, swapped }
    guide: { on: true, done: false },                   // the guided start: running, and whether it has finished
    tally: { harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0 },   // running counts for firsts, achievements and daily goals
  };
```

**`src/sim/production.js`**. Replace:

```js
import { BUILDINGS } from '../data/buildings.js';
```

with:

```js
import { BUILDINGS } from '../data/buildings.js';
import { GOODS } from '../data/goods.js';
```

Then replace:

```js
      t.store[good] = (t.store[good] || 0) + 1;
      b.progress -= 1;
```

with:

```js
      t.store[good] = (t.store[good] || 0) + 1;
      if (GOODS[good].food) world.tally.harvested += 1;   // every unit of food that reaches storage
      b.progress -= 1;
```

**`src/sim/economy.js`**. Replace:

```js
  world.gold += net;
  world.stats.lastMonth = { taxes, wages, upkeep, net };
```

with:

```js
  world.gold += net;
  world.stats.lastMonth = { taxes, wages, upkeep, net };
  if (net > 0) world.tally.profitMonths += 1;
```

**`src/sim/housing.js`** (inside `monthlyHousing`). Replace:

```js
        if (events) events.push({ type: 'upgrade', id: h.id, from: h.tier, to: next });
        h.tier = next;
```

with:

```js
        if (events) events.push({ type: 'upgrade', id: h.id, from: h.tier, to: next });
        h.tier = next;
        world.tally.upgrades += 1;
```

**`src/sim/clock.js`** (end of `tickDay`; `population` is already imported). Replace:

```js
  if (world.day % DAYS_PER_MONTH === 0) runMonth(world, events);
  checkGoals(world, events);
```

with:

```js
  if (world.day % DAYS_PER_MONTH === 0) runMonth(world, events);
  world.tally.peakPeople = Math.max(world.tally.peakPeople, population(world));
  checkGoals(world, events);
```

**`src/save/migrate.js`**. Replace the whole file with:

```js
import { WORLD_VERSION } from '../sim/world.js';

export const CURRENT_VERSION = WORLD_VERSION;

// People living in a saved world's homes, counted without trusting its shape (a malformed save is
// reported by validateWorld after the migration, not by a migration that throws).
function peopleIn(w) {
  let n = 0;
  const buildings = w.buildings && typeof w.buildings === 'object' ? Object.values(w.buildings) : [];
  for (const b of buildings) if (b && b.type === 'house' && Number.isFinite(b.residents)) n += b.residents;
  return n;
}

// v1 -> v2 (the early-game pass). firsts and achievements start as null, so the first check marks what is
// already true without celebrating it; an existing city has no guide; the tallies start at zero, except
// the peak, which starts at the city's population. Every other field is kept as it was.
function v1ToV2(w) {
  const completed = w.goals && Array.isArray(w.goals.completed) ? w.goals.completed.slice() : null;
  return {
    ...w,
    version: 2,
    firsts: null,
    achievements: null,
    daily: null,
    guide: { on: false, done: true },
    tally: { harvested: 0, profitMonths: 0, peakPeople: peopleIn(w), upgrades: 0, dailyDone: 0 },
    goals: { completed, triggered: [] },
  };
}

// Each entry upgrades a world from version N to N + 1. Add one whenever WORLD_VERSION goes up.
export const MIGRATIONS = { 1: v1ToV2 };

// table and target are parameters so tests can drive a synthetic chain; production calls use the defaults.
export function migrate(obj, table = MIGRATIONS, target = CURRENT_VERSION) {
  if (!obj || !Number.isInteger(obj.version)) throw new Error('not_a_save');
  if (obj.version > target) throw new Error('newer_version');
  let w = obj;
  while (w.version < target) {
    const step = table[w.version];
    if (!step) throw new Error('no_migration_' + w.version);
    let next;
    try { next = step(w); } catch (e) { throw new Error('bad_migration_' + w.version); }
    if (!next || !(next.version > w.version) || next.version > target) throw new Error('bad_migration_' + w.version);
    w = next;
  }
  return w;
}
```

**`src/save/serialize.js`**. Replace:

```js
  'raiderEntries', 'focus', 'stats', 'startRoad', 'goals', 'history',
];
```

with:

```js
  'raiderEntries', 'focus', 'stats', 'startRoad', 'goals', 'history',
  'firsts', 'achievements', 'daily', 'guide', 'tally',
];

const TALLY_KEYS = ['harvested', 'profitMonths', 'peakPeople', 'upgrades', 'dailyDone'];
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// Firsts and achievements: ids, or null for "mark what is already true without celebrating" (a v1 save).
const isIdList = (v) => v === null || (Array.isArray(v) && v.every((id) => typeof id === 'string'));
const isDaily = (d) => d === null || (isRecord(d) && typeof d.date === 'string' && Array.isArray(d.picks)
  && Array.isArray(d.done) && isRecord(d.base) && typeof d.swapped === 'boolean');
```

Then replace (in `validateWorld`):

```js
  if (!Array.isArray(w.startRoad) || !w.goals || !Array.isArray(w.goals.completed) || !Array.isArray(w.history)) return false;
  return true;
```

with:

```js
  if (!Array.isArray(w.startRoad) || !w.goals || !Array.isArray(w.goals.completed) || !Array.isArray(w.history)) return false;
  if (!Array.isArray(w.goals.triggered) || !isIdList(w.firsts) || !isIdList(w.achievements) || !isDaily(w.daily)) return false;
  if (!isRecord(w.guide) || typeof w.guide.on !== 'boolean' || typeof w.guide.done !== 'boolean') return false;
  if (!isRecord(w.tally) || !TALLY_KEYS.every((k) => Number.isFinite(w.tally[k]))) return false;
  return true;
```

- [ ] **Step 4: Run the tests to see them pass**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "v2"
```

Expected: `15 passed, 0 failed` and `ALL PASSED` (6 world v2, 3 migrate v1 to v2, 6 validateWorld v2).

- [ ] **Step 5: Update the existing tests this breaks**

I grepped `tests/` for `WORLD_VERSION`, `CURRENT_VERSION`, `REQUIRED`, `version: 1` and direct callers of `produceDay`, `monthlyEconomy` and `monthlyHousing`:
- `tests/sim/world.test.js` compares against `WORLD_VERSION` by name, so it is unaffected.
- `tests/save/serialize.test.js` "lists exactly the fields createWorld produces as required" follows `REQUIRED` automatically.
- Every world in the tests comes from `createWorld` (directly or through `makeTestWorld`), so it has `tally`.
- `store.test.js` "reports the save codes" still gets `newer_version`: its `{ version: 2, world }` is the envelope version, and `SAVE_VERSION` stays 1.

Two lines change:

`tests/save/store.test.js` ("refuses a migration that overshoots or throws"). Replace:

```js
    expect(CURRENT_VERSION).toBe(1);
```

with:

```js
    expect(CURRENT_VERSION).toBe(2);
```

`tests/save/serialize.test.js` ("reports corrupt_save for a current-version save with missing fields"). `{ version: 1 }` is no longer the current version. The tolerant migration still reports it as `corrupt_save`, and the new migrate test covers that case, so point this test back at the current version. Replace:

```js
    expect(code(() => deserialize(JSON.stringify({ version: 1 })))).toBe('corrupt_save');
```

with:

```js
    expect(code(() => deserialize(JSON.stringify({ version: CURRENT_VERSION })))).toBe('corrupt_save');
```

(`CURRENT_VERSION` is already imported in that file.)

- [ ] **Step 6: Full suite**

```powershell
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED`, with 451 tests (436 + 15).

- [ ] **Step 7: Commit**

```powershell
git add src/sim/world.js src/sim/production.js src/sim/economy.js src/sim/housing.js src/sim/clock.js src/save/migrate.js src/save/serialize.js sw-files.js tests/sim/worldV2.test.js tests/save/migrateV2.test.js tests/all.js tests/save/store.test.js tests/save/serialize.test.js
git commit -m @'
Raise the world to version 2 with running tallies and a migration

A world now carries its firsts, achievements, today's daily goals, the
guide, the event goals that have fired, and running tallies: food
harvested, months in profit, peak population, upgrades and daily goals
done. A version 1 save migrates with the guide off and its firsts and
achievements left to be marked silently, so an existing city is not
flooded with celebrations. The save check validates every new field.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 2: Goals that keep coming, event goals, settle, setGuide

**Files:**
- Modify: `src/data/goals.js` (whole file: chapters, the two tier goals, `EVENT_REWARD`, `GUIDE_REWARD`, `GUIDE_GOALS`, `EVENT_GOALS`)
- Modify: `src/sim/goals.js` (whole file: new need kinds, `goalProgress`, event goals, `settleGoals`, guide helpers)
- Create: `src/sim/settle.js` (`settle(world, events)`, goals only for now)
- Modify: `src/sim/commands.js` (`setGuide`)
- Modify: `src/sim/clock.js` (`tickDay` calls `triggerEventGoals` before `checkGoals`)
- Modify: `sw-files.js` (regenerated; adds `src/sim/settle.js` to the cache list)
- Create: `tests/sim/goalsV2.test.js`
- Modify: `tests/all.js`, `tests/sim/goals.test.js` (chain ids), `tests/ui/goalsList.test.js` ("1 of 9 done")
- Test: `tests/sim/goalsV2.test.js`

**Interfaces:**
- Consumes: from Task 1, `world.guide`, `world.goals.triggered`, and the `tally.peakPeople` line in `tickDay`. Existing code: `alertsFor` (`src/sim/alerts.js`), `idx` (`src/sim/grid.js`), `housesOf`, `population` and `allBuildings` (`src/sim/world.js`), `CATEGORIES` (`src/data/ui.js`, in the test only).
- Produces (contract, Goals):
  - Data: `GOAL_REWARD = 25`, `EVENT_REWARD = 10`, `GUIDE_REWARD = 50`, `GOALS` (9 goals in order, each with a `chapter`), `GUIDE_GOALS`, `EVENT_GOALS`.
  - Sim functions: `goalById`, `goalMet` (adds the `tier`, `noAlert` and `gold` kinds; `road` becomes a set difference), `goalProgress`, `triggerEventGoals`, `openGoals`, `checkGoals` (pushes `{ type: 'guide_done', reward: 50 }` once), `settleGoals`, `nextItemFor`, `guideActive`, `guideGoal`.
  - `settle(world, events = null)` in `src/sim/settle.js`, which returns `events`.
  - `setGuide(world, on)` in `src/sim/commands.js`, which returns `{ ok: true, warnings: [] }`.
  - `tickDay` ends with `triggerEventGoals(world); checkGoals(world, events);`.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/goalsV2.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { GOALS, EVENT_GOALS, GUIDE_GOALS, GOAL_REWARD, EVENT_REWARD, GUIDE_REWARD } from '../../src/data/goals.js';
import { CATEGORIES } from '../../src/data/ui.js';
import {
  goalById, goalMet, goalProgress, triggerEventGoals, openGoals, checkGoals, settleGoals, nextItemFor, guideActive, guideGoal,
} from '../../src/sim/goals.js';
import { settle } from '../../src/sim/settle.js';
import { setGuide, drawRoad, demolishAt } from '../../src/sim/commands.js';
import { tickDay } from '../../src/sim/clock.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

const ids = (goals) => goals.map((g) => g.id);

// Everything the five guide goals ask for, on a road along y = 10 (the buildings only need to exist).
function readyCity() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  for (let x = 10; x < 16; x++) addRaw(w, 'house', x, 11);
  addRaw(w, 'well', 17, 11);
  addRaw(w, 'farm_grain', 2, 8);
  addRaw(w, 'granary', 5, 8);
  addRaw(w, 'bazaar', 9, 8);
  addRaw(w, 'temple', 12, 8);
  return w;
}

describe('goals v2', () => {
  it('lists the chain in chapters, the guide goals and the event goals', () => {
    expect(ids(GOALS)).toEqual(['road', 'plots', 'well', 'food', 'temple', 'homes_cottage', 'people100', 'homes_house', 'town']);
    expect(GOALS.map((g) => g.chapter)).toEqual(['first_homes', 'first_homes', 'first_homes', 'feed', 'feed', 'grow', 'grow', 'grow', 'grow']);
    expect(goalById('homes_cottage').need).toEqual({ kind: 'tier', tier: 3, n: 8 });
    expect(goalById('homes_cottage').text).toBe('Grow 8 homes to Cottage or better');
    expect(goalById('homes_house').need).toEqual({ kind: 'tier', tier: 4, n: 8 });
    expect(goalById('homes_house').text).toBe('Grow 8 homes to House or better');
    expect(GUIDE_GOALS).toEqual(['road', 'plots', 'well', 'food', 'temple']);
    expect([GOAL_REWARD, EVENT_REWARD, GUIDE_REWARD]).toEqual([25, 10, 50]);
    expect(EVENT_GOALS.map((g) => [g.id, g.trigger, g.need])).toEqual([
      ['fix_bazaar', 'bazaar_empty', { kind: 'noAlert', code: 'bazaar_empty' }],
      ['more_workers', 'labour_shortage', { kind: 'noAlert', code: 'labour_shortage' }],
      ['more_jobs', 'unemployment', { kind: 'noAlert', code: 'unemployment' }],
      ['out_of_debt', 'debt', { kind: 'gold', n: 0 }],
    ]);
    for (const g of EVENT_GOALS) {
      expect([g.id, g.chapter, g.reward, g.text.length > 0, goalById(g.id) === g]).toEqual([g.id, 'event', EVENT_REWARD, true, true]);
    }
    expect(goalById('fix_bazaar').showMe).toEqual({ category: 'food', item: 'granary', target: 'alert', code: 'bazaar_empty' });
    expect(goalById('out_of_debt').showMe).toBe(null);
    for (const g of [...GOALS, ...EVENT_GOALS]) {
      if (g.showMe) expect([g.id, CATEGORIES.find((c) => c.id === g.showMe.category).items.includes(g.showMe.item)]).toEqual([g.id, true]);
    }
    const all = ids([...GOALS, ...EVENT_GOALS]);
    expect(new Set(all).size).toBe(all.length);
    expect(goalById('nope')).toBe(null);
  });
  it('counts only road laid beyond the start road, as an exact set difference', () => {
    const w = makeTestWorld();
    setRoad(w, 31, 31, 31, 25);                                   // a 7-tile start road
    w.startRoad = [[31, 31], [31, 30], [31, 29], [31, 28], [31, 27], [31, 26], [31, 25]];
    expect(goalMet(w, { kind: 'road' })).toBe(false);
    expect(demolishAt(w, 31, 28).ok).toBe(true);                  // taking up a start-road tile lays nothing
    expect(goalMet(w, { kind: 'road' })).toBe(false);
    expect(drawRoad(w, 31, 28, 31, 28).ok).toBe(true);            // putting it back is still the start road
    expect(goalMet(w, { kind: 'road' })).toBe(false);
    expect(demolishAt(w, 31, 28).ok).toBe(true);
    expect(drawRoad(w, 30, 25, 30, 25).ok).toBe(true);            // one new tile: 7 tiles in all, as many as the start road
    expect(goalMet(w, { kind: 'road' })).toBe(true);
  });
  it('grows homes to a tier, counting better tiers too', () => {
    const w = makeTestWorld();
    for (let x = 0; x < 7; x++) addRaw(w, 'house', x, 5, { tier: 3, residents: 12 });
    addRaw(w, 'house', 7, 5, { tier: 2, residents: 8 });
    expect(goalMet(w, goalById('homes_cottage').need)).toBe(false);
    expect(goalProgress(w, goalById('homes_cottage'))).toEqual({ n: 7, of: 8 });
    addRaw(w, 'house', 8, 5, { tier: 4, residents: 16 });        // a House is better than a Cottage
    expect(goalMet(w, goalById('homes_cottage').need)).toBe(true);
    expect(goalMet(w, goalById('homes_house').need)).toBe(false);
    expect(goalProgress(w, goalById('homes_house'))).toEqual({ n: 1, of: 8 });
    for (let x = 9; x < 12; x++) addRaw(w, 'house', x, 5, { tier: 3, residents: 12 });
    expect(goalProgress(w, goalById('homes_cottage'))).toEqual({ n: 8, of: 8 });   // 11 homes, clamped to the target
  });
  it('reports progress for counting goals and null for the others', () => {
    const w = makeTestWorld();
    expect(goalProgress(w, goalById('plots'))).toEqual({ n: 0, of: 6 });
    addRaw(w, 'house', 1, 1); addRaw(w, 'house', 2, 1);
    expect(goalProgress(w, goalById('plots'))).toEqual({ n: 2, of: 6 });
    expect(goalProgress(w, goalById('well'))).toEqual({ n: 0, of: 1 });
    addRaw(w, 'well', 5, 5); addRaw(w, 'well', 7, 5);
    expect(goalProgress(w, goalById('well'))).toEqual({ n: 1, of: 1 });
    addRaw(w, 'farm_grain', 0, 10); addRaw(w, 'bazaar', 10, 10);
    expect(goalProgress(w, goalById('food'))).toEqual({ n: 2, of: 3 });
    addRaw(w, 'house', 3, 1, { tier: 4, residents: 16 });
    expect(goalProgress(w, goalById('people100'))).toEqual({ n: 16, of: 100 });
    for (let x = 0; x < 10; x++) addRaw(w, 'house', x, 20, { tier: 4, residents: 16 });
    expect(goalProgress(w, goalById('people100'))).toEqual({ n: 100, of: 100 });   // 176 people, clamped
    expect(goalProgress(w, goalById('plots'))).toEqual({ n: 6, of: 6 });          // 13 homes, clamped
    for (const id of ['road', 'fix_bazaar', 'more_workers', 'more_jobs', 'out_of_debt']) expect([id, goalProgress(w, goalById(id))]).toEqual([id, null]);
  });
  it('turns a first empty bazaar into a goal that completes once the bazaar has grain, once per city', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const bz = addRaw(w, 'bazaar', 9, 11);
    staffAll(w);
    expect(alertsFor(w).map((a) => a.code)).toEqual(['bazaar_empty']);
    expect(ids(openGoals(w))).toEqual(['road', 'plots', 'well']);
    expect(triggerEventGoals(w)).toEqual(['fix_bazaar']);
    expect(w.goals.triggered).toEqual(['fix_bazaar']);
    expect(ids(openGoals(w))).toEqual(['fix_bazaar', 'road', 'plots']);
    const events = [];
    expect(checkGoals(w, events).id).toBe('road');               // still empty: the next met goal completes instead
    bz.store.grain = 50;
    const gold = w.gold;
    expect(checkGoals(w, events).id).toBe('fix_bazaar');
    expect(w.gold).toBe(gold + EVENT_REWARD);
    expect(events).toEqual([{ type: 'goal', id: 'road', reward: GOAL_REWARD }, { type: 'goal', id: 'fix_bazaar', reward: EVENT_REWARD }]);
    bz.store.grain = 0;                                           // empty again: the goal does not come back
    expect(triggerEventGoals(w)).toEqual([]);
    expect(w.goals.triggered).toEqual(['fix_bazaar']);
    expect(ids(openGoals(w))).toEqual(['plots', 'well', 'food']);
  });
  it('puts triggered event goals first, in their listed order', () => {
    const w = makeTestWorld({ gold: -10 });
    expect(triggerEventGoals(w)).toEqual(['out_of_debt']);
    w.labour = { workforce: 10, employed: 10, jobs: 22, shortLevels: ['services'] };
    expect(triggerEventGoals(w)).toEqual(['more_workers']);
    w.milestone = 'town';
    w.labour = { workforce: 100, employed: 10, jobs: 10, shortLevels: [] };
    expect(triggerEventGoals(w)).toEqual(['more_jobs']);
    expect(w.goals.triggered).toEqual(['out_of_debt', 'more_workers', 'more_jobs']);
    expect(ids(openGoals(w))).toEqual(['more_workers', 'more_jobs', 'out_of_debt']);
    expect(ids(openGoals(w, 5))).toEqual(['more_workers', 'more_jobs', 'out_of_debt', 'road', 'plots']);
    w.goals.completed.push('more_workers', 'road');
    expect(ids(openGoals(w, 4))).toEqual(['more_jobs', 'out_of_debt', 'plots', 'well']);
  });
  it('triggers and completes an event goal through the daily tick', () => {
    const w = makeTestWorld({ gold: -100 });
    setRoad(w, 0, 10, 31, 10);
    const events = [];
    tickDay(w, events);
    expect(w.goals.triggered).toEqual(['out_of_debt']);
    expect(events).toEqual([{ type: 'goal', id: 'road', reward: GOAL_REWARD }]);   // still in debt: the road goal completes
    expect(w.gold).toBe(-75);
    w.gold = 5;
    events.length = 0;
    tickDay(w, events);
    expect(events).toEqual([{ type: 'goal', id: 'out_of_debt', reward: EVENT_REWARD }]);
    expect(w.gold).toBe(15);
    expect(ids(openGoals(w))).toEqual(['plots', 'well', 'food']);
  });
  it('settles several goals at once and finishes the guide once, paying its reward', () => {
    const w = readyCity();
    const gold = w.gold;
    const events = [];
    expect(ids(settleGoals(w, events))).toEqual(['road', 'plots', 'well', 'food', 'temple']);
    expect(w.goals.completed).toEqual(['road', 'plots', 'well', 'food', 'temple']);
    expect(events.map((e) => e.type + ':' + (e.id || ''))).toEqual(['goal:road', 'goal:plots', 'goal:well', 'goal:food', 'goal:temple', 'guide_done:']);
    expect(events[5]).toEqual({ type: 'guide_done', reward: GUIDE_REWARD });
    expect(w.guide).toEqual({ on: true, done: true });
    expect(w.gold).toBe(gold + 5 * GOAL_REWARD + GUIDE_REWARD);
    events.length = 0;
    expect(settleGoals(w, events)).toEqual([]);
    expect(checkGoals(w, events)).toBe(null);
    expect(events).toEqual([]);
    expect(w.gold).toBe(gold + 5 * GOAL_REWARD + GUIDE_REWARD);
  });
  it('pays goal rewards but no guide reward when the guide is off', () => {
    const w = readyCity();
    const gold = w.gold;
    expect(setGuide(w, false)).toEqual({ ok: true, warnings: [] });
    const events = [];
    settleGoals(w, events);
    expect(w.goals.completed.length).toBe(5);
    expect(events.some((e) => e.type === 'guide_done')).toBe(false);
    expect(w.guide).toEqual({ on: false, done: false });
    expect(w.gold).toBe(gold + 5 * GOAL_REWARD);
  });
  it('names the next card a goal needs', () => {
    const w = makeTestWorld();
    const food = goalById('food');
    expect(nextItemFor(w, food)).toBe('farm_grain');
    addRaw(w, 'granary', 5, 8);
    expect(nextItemFor(w, food)).toBe('farm_grain');              // the first missing part, whatever was built first
    addRaw(w, 'farm_grain', 2, 8);
    expect(nextItemFor(w, food)).toBe('bazaar');
    addRaw(w, 'bazaar', 9, 8);
    expect(nextItemFor(w, food)).toBe('farm_grain');              // nothing missing: its Show me card
    expect(nextItemFor(w, goalById('well'))).toBe('well');
    expect(nextItemFor(w, goalById('plots'))).toBe('house');
    expect(nextItemFor(w, goalById('out_of_debt'))).toBe(null);
    expect(nextItemFor(w, null)).toBe(null);
  });
  it('knows whether the guide runs and which goal it is on', () => {
    const w = makeTestWorld();
    expect(guideActive(w)).toBe(true);
    expect(guideGoal(w).id).toBe('road');
    setRoad(w, 0, 10, 31, 10);
    settleGoals(w);
    expect(guideGoal(w).id).toBe('plots');
    addRaw(w, 'bazaar', 9, 11);
    staffAll(w);
    triggerEventGoals(w);
    expect(openGoals(w, 1)[0].id).toBe('fix_bazaar');
    expect(guideGoal(w).id).toBe('plots');                        // event goals are not guide steps
    setGuide(w, 0);
    expect(w.guide.on).toBe(false);
    expect(guideActive(w)).toBe(false);
    expect(guideGoal(w).id).toBe('plots');                        // still known while off, for Resume guide
    setGuide(w, 'yes');
    expect(w.guide.on).toBe(true);
    expect(guideActive(w)).toBe(true);
    w.goals.completed.push('plots', 'well', 'food', 'temple');
    expect(guideActive(w)).toBe(false);
    expect(guideGoal(w)).toBe(null);
    w.goals.completed = ['road'];
    w.guide = { on: true, done: true };                           // a finished guide never runs again
    expect(guideActive(w)).toBe(false);
  });
  it('settles through settle and hands back the events array', () => {
    const w = readyCity();
    const events = [];
    expect(settle(w, events)).toBe(events);
    expect(events.filter((e) => e.type === 'goal').length).toBe(5);
    expect(events.filter((e) => e.type === 'guide_done').length).toBe(1);
    const quiet = readyCity();
    expect(settle(quiet)).toBe(null);
    expect(quiet.goals.completed.length).toBe(5);
    expect(quiet.guide.done).toBe(true);
  });
});
```

Where the numbers come from:
- The bazaar in the event-goal tests is staffed (6 of 6), touches the road and holds no grain, so `alertsFor` gives exactly `bazaar_empty`. `makeTestWorld` has an empty start road, so the `setRoad` street meets the road goal.
- The tick test starts at -100 gold. Day 1 completes the road goal (+25, giving -75) while `out_of_debt` waits. At 5 gold, day 2 completes `out_of_debt` (+10, giving 15).
- `readyCity` meets all five guide goals. `settleGoals` completes them in five calls, one goal per call, in list order. The fifth call also pays the guide.

In `tests/all.js`, replace:

```js
import './sim/goals.test.js';
```

with:

```js
import './sim/goals.test.js';
import './sim/goalsV2.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "goals v2"
```

Expected: `LOAD ERROR` with `TypeError: Failed to fetch dynamically imported module: .../tests/all.js`. `src/sim/settle.js` does not exist yet, and `src/data/goals.js` does not export `EVENT_GOALS`.

- [ ] **Step 3: Implement**

**`src/data/goals.js`**. Replace the whole file with:

```js
// Goals (spec 4.1, early-game pass 3.2 and 3.3): the opening chain in chapters, then the next milestone,
// and first-time troubles that become goals. Plain data: needs are declarative so missions can define
// goals the same way later; src/sim/goals.js evaluates them.
export const GOAL_REWARD = 25;
export const EVENT_REWARD = 10;    // a first-time trouble put right
export const GUIDE_REWARD = 50;    // paid once, when the guided start's goals are all done

export const GOALS = [
  { id: 'road', chapter: 'first_homes', text: 'Lay a road', reward: GOAL_REWARD, need: { kind: 'road' }, showMe: { category: 'roads', item: 'road', target: 'startRoad' } },
  { id: 'plots', chapter: 'first_homes', text: 'Place 6 housing plots', reward: GOAL_REWARD, need: { kind: 'houses', n: 6 }, showMe: { category: 'homes', item: 'house', target: 'startRoad' } },
  { id: 'well', chapter: 'first_homes', text: 'Build a well so huts become shacks', reward: GOAL_REWARD, need: { kind: 'building', type: 'well', n: 1 }, showMe: { category: 'services', item: 'well', target: 'houses' } },
  { id: 'food', chapter: 'feed', text: 'Build a farm, a granary and a bazaar', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'farm_grain', n: 1 }, { kind: 'building', type: 'granary', n: 1 }, { kind: 'building', type: 'bazaar', n: 1 }] }, showMe: { category: 'food', item: 'farm_grain', target: 'focus' } },
  { id: 'temple', chapter: 'feed', text: 'Build a temple', reward: GOAL_REWARD, need: { kind: 'building', type: 'temple', n: 1 }, showMe: { category: 'services', item: 'temple', target: 'houses' } },
  { id: 'homes_cottage', chapter: 'grow', text: 'Grow 8 homes to Cottage or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 3, n: 8 }, showMe: { category: 'services', item: 'bazaar', target: 'houses' } },
  { id: 'people100', chapter: 'grow', text: 'Reach 100 people', reward: GOAL_REWARD, need: { kind: 'people', n: 100 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'homes_house', chapter: 'grow', text: 'Grow 8 homes to House or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 4, n: 8 }, showMe: { category: 'services', item: 'temple', target: 'houses' } },
  { id: 'town', chapter: 'grow', text: 'Reach 150 people to become a Town', reward: GOAL_REWARD, need: { kind: 'people', n: 150 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
];

// The guided start (early-game pass 3.2) runs while any of these is open.
export const GUIDE_GOALS = ['road', 'plots', 'well', 'food', 'temple'];

// First-time troubles (early-game pass 3.3): each becomes a goal at the front of the list the first time
// an alert with its trigger code appears, once per city, and completes when the trouble has cleared.
// A null showMe means Show me opens the city summary.
export const EVENT_GOALS = [
  { id: 'fix_bazaar', trigger: 'bazaar_empty', chapter: 'event', text: 'Get grain to the bazaar', reward: EVENT_REWARD, need: { kind: 'noAlert', code: 'bazaar_empty' }, showMe: { category: 'food', item: 'granary', target: 'alert', code: 'bazaar_empty' } },
  { id: 'more_workers', trigger: 'labour_shortage', chapter: 'event', text: 'Find more workers: place more homes', reward: EVENT_REWARD, need: { kind: 'noAlert', code: 'labour_shortage' }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'more_jobs', trigger: 'unemployment', chapter: 'event', text: 'Make more jobs: build a farm or a bazaar', reward: EVENT_REWARD, need: { kind: 'noAlert', code: 'unemployment' }, showMe: { category: 'food', item: 'farm_grain', target: 'focus' } },
  { id: 'out_of_debt', trigger: 'debt', chapter: 'event', text: 'Get out of debt', reward: EVENT_REWARD, need: { kind: 'gold', n: 0 }, showMe: null },
];
```

**`src/sim/goals.js`**. Replace the whole file with:

```js
// Goal evaluation (spec 4.1, early-game pass 3.2 and 3.3): pure checks against the world, rewards paid into
// the treasury. First-time event goals sit in front of the opening chain; the guided start is the chain's
// first five goals and pays once when they are all done.
import { GOALS, EVENT_GOALS, GUIDE_GOALS, GUIDE_REWARD } from '../data/goals.js';
import { housesOf, population, allBuildings } from './world.js';
import { alertsFor } from './alerts.js';
import { idx } from './grid.js';

const SETTLE_MAX = 20;   // settleGoals stops after this many completions in one go

export const goalById = (id) => GOALS.find((g) => g.id === id) || EVENT_GOALS.find((g) => g.id === id) || null;

const countOf = (world, type) => allBuildings(world).filter((b) => b.type === type).length;
const homesAtTier = (world, tier) => housesOf(world).filter((h) => h.tier >= tier).length;
const hasAlert = (world, code) => alertsFor(world).some((a) => a.code === code);

// Road the player laid: road tiles that are not part of the generator's start road (an exact set
// difference, so taking up a start-road tile and laying one elsewhere still counts the new tile).
function laidRoadTiles(world) {
  const start = new Set(world.startRoad.map(([x, y]) => idx(world.size, x, y)));
  let n = 0;
  for (let i = 0; i < world.road.length; i++) if (world.road[i] && !start.has(i)) n++;
  return n;
}

export function goalMet(world, need) {
  switch (need.kind) {
    case 'road': return laidRoadTiles(world) > 0;
    case 'houses': return housesOf(world).length >= need.n;
    case 'building': return countOf(world, need.type) >= (need.n || 1);
    case 'people': return population(world) >= need.n;
    case 'tier': return homesAtTier(world, need.tier) >= need.n;
    case 'noAlert': return !hasAlert(world, need.code);
    case 'gold': return world.gold >= need.n;
    case 'all': return need.of.every((x) => goalMet(world, x));
    default: return false;
  }
}

// How far a counting goal has got, for the "2 of 6" chip; null for goals that do not count anything.
export function goalProgress(world, goal) {
  const need = goal.need;
  switch (need.kind) {
    case 'houses': return { n: Math.min(housesOf(world).length, need.n), of: need.n };
    case 'building': { const of = need.n || 1; return { n: Math.min(countOf(world, need.type), of), of }; }
    case 'people': return { n: Math.min(population(world), need.n), of: need.n };
    case 'tier': return { n: Math.min(homesAtTier(world, need.tier), need.n), of: need.n };
    case 'all': return { n: need.of.filter((x) => goalMet(world, x)).length, of: need.of.length };
    default: return null;
  }
}

// The first time an alert with an event goal's trigger code appears, that goal joins the list (once per city).
export function triggerEventGoals(world) {
  const { completed, triggered } = world.goals;
  const waiting = EVENT_GOALS.filter((g) => !triggered.includes(g.id) && !completed.includes(g.id));
  if (!waiting.length) return [];
  const codes = new Set(alertsFor(world).map((a) => a.code));
  const fired = waiting.filter((g) => codes.has(g.trigger)).map((g) => g.id);
  triggered.push(...fired);
  return fired;
}

// Triggered event goals first (in EVENT_GOALS order), then the chain, both without the completed ones.
export function openGoals(world, limit = 3) {
  const done = new Set(world.goals.completed);
  const triggered = new Set(world.goals.triggered);
  const events = EVENT_GOALS.filter((g) => triggered.has(g.id) && !done.has(g.id));
  return [...events, ...GOALS.filter((g) => !done.has(g.id))].slice(0, limit);
}

// Completes at most one open goal (any open goal, so a met chain goal never waits behind event goals),
// then finishes the guide once its goals are all done.
export function checkGoals(world, events = null) {
  let goal = null;
  for (const g of openGoals(world, Infinity)) {
    if (!goalMet(world, g.need)) continue;
    world.goals.completed.push(g.id);
    world.gold += g.reward;
    if (events) events.push({ type: 'goal', id: g.id, reward: g.reward });
    goal = g;
    break;
  }
  const guide = world.guide;
  if (guide.on && !guide.done && GUIDE_GOALS.every((id) => world.goals.completed.includes(id))) {
    guide.done = true;
    world.gold += GUIDE_REWARD;
    if (events) events.push({ type: 'guide_done', reward: GUIDE_REWARD });
  }
  return goal;
}

// Every goal the city has already earned, in one go (after a command, so steps finish while paused).
export function settleGoals(world, events = null) {
  const done = [];
  for (let i = 0; i < SETTLE_MAX; i++) {
    const g = checkGoals(world, events);
    if (!g) break;
    done.push(g);
  }
  return done;
}

// The card a goal needs next: the first missing building of a compound goal, else its Show me card.
export function nextItemFor(world, goal) {
  if (!goal) return null;
  if (goal.need.kind === 'all') {
    const part = goal.need.of.find((p) => p.kind === 'building' && !goalMet(world, p));
    if (part) return part.type;
  }
  return goal.showMe ? goal.showMe.item : null;
}

export function guideActive(world) {
  const done = new Set(world.goals.completed);
  return Boolean(world.guide.on && !world.guide.done && GUIDE_GOALS.some((id) => !done.has(id)));
}

// The guide's current step: the first open goal that is one of its goals (event goals are skipped).
export function guideGoal(world) {
  return openGoals(world, 99).find((g) => GUIDE_GOALS.includes(g.id)) || null;
}
```

**`src/sim/settle.js`** (new file):

```js
// Settling (early-game pass 3.2): whatever the city has earned is paid out after every command, not only
// on game days, so steps finish while the game is paused. The interface calls settle after each command;
// the daily tick runs the same checks itself (src/sim/clock.js). Returns the events array it was given.
import { settleGoals } from './goals.js';

export function settle(world, events = null) {
  settleGoals(world, events);
  // Next, in this order: firsts and achievements (src/sim/firsts.js, src/sim/achievements.js),
  // then daily goals (src/sim/daily.js).
  return events;
}
```

**`src/sim/commands.js`**. Replace:

```js
export function setSpeed(world, speed) {
  if (![0, 1, 2, 3].includes(speed)) return fail('bad_speed');
  world.speed = speed;
  return { ok: true, warnings: [] };
}
```

with:

```js
export function setSpeed(world, speed) {
  if (![0, 1, 2, 3].includes(speed)) return fail('bad_speed');
  world.speed = speed;
  return { ok: true, warnings: [] };
}

// The guided start (early-game pass 3.2): Skip guide turns it off, Resume guide turns it back on.
export function setGuide(world, on) {
  world.guide.on = Boolean(on);
  return { ok: true, warnings: [] };
}
```

**`src/sim/clock.js`**. Replace:

```js
import { checkGoals } from './goals.js';
```

with:

```js
import { checkGoals, triggerEventGoals } from './goals.js';
```

Then replace (the end of `tickDay`, as Task 1 left it):

```js
  if (world.day % DAYS_PER_MONTH === 0) runMonth(world, events);
  world.tally.peakPeople = Math.max(world.tally.peakPeople, population(world));
  checkGoals(world, events);
```

with:

```js
  if (world.day % DAYS_PER_MONTH === 0) runMonth(world, events);
  world.tally.peakPeople = Math.max(world.tally.peakPeople, population(world));
  triggerEventGoals(world);
  checkGoals(world, events);
```

This task changes no interface file. Event goals can now lead the strip, the goals sheet and the summary, and `goalById` finds them for the existing goal toast. Until Task 11, Show me on "Get out of debt" (`showMe: null`) would throw in `createUI.showMe`, and the `'alert'` target falls back to the map focus in `showMeTarget`. Task 11 fixes both, so do not ship between Tasks 2 and 11.

- [ ] **Step 4: Run the tests to see them pass**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "goals v2"
```

Expected: `12 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

I grepped `tests/` for `GOALS`, `openGoals`, `checkGoals`, `goalById`, `goals.completed`, `people100`, the old goal count, `tickDay` and `advanceDays`. Exactly two expectations change:

`tests/sim/goals.test.js` ("lists the opening chain in order and shows three at a time"). Replace:

```js
    expect(GOALS.map((g) => g.id)).toEqual(['road', 'plots', 'well', 'food', 'temple', 'people100', 'town']);
```

with:

```js
    expect(GOALS.map((g) => g.id)).toEqual(['road', 'plots', 'well', 'food', 'temple', 'homes_cottage', 'people100', 'homes_house', 'town']);
```

`tests/ui/goalsList.test.js` ("renders the goals sheet with progress and up to three goals"). The chain now has 9 goals. Replace:

```js
    expect(root.textContent).toContain('1 of 7 done');
```

with:

```js
    expect(root.textContent).toContain('1 of 9 done');
```

These need no change, and here is why:
- `tests/sim/events.test.js` "accepts a single tickDay with events": the bare street raises no alert, so the day still reports only the road goal.
- `tests/ui/createUI.test.js` "refreshes alerts, the banner…": the rig's `tickDay` at -30 gold now also triggers `out_of_debt` and `more_workers`, but the road goal is still the first met goal. Gold goes to -5 and the debt banner shows, exactly as its comment says.
- `tests/ui/autosave.test.js` and `tests/ui/hud.test.js` do not look at goals.
- `tests/dev/sampleCity.test.js` gold bound: the new rewards add at most 165 gold.
- `tests/sim/longrun.test.js` time budget: `alertsFor` runs once a day only while an event goal is still waiting, and the suite measured it well inside the budget.

- [ ] **Step 6: Full suite**

```powershell
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED`, with 463 tests (451 + 12). `sw-files.ps1` must run first: it adds `src/sim/settle.js` to the cache list, which the `ui pwa` test checks.

- [ ] **Step 7: Commit**

```powershell
git add src/data/goals.js src/sim/goals.js src/sim/settle.js src/sim/commands.js src/sim/clock.js sw-files.js tests/sim/goalsV2.test.js tests/all.js tests/sim/goals.test.js tests/ui/goalsList.test.js
git commit -m @'
Keep goals coming: tier goals, first-time event goals and the guide's end

The opening chain gains chapters and two tier goals that bridge to Town.
The first empty bazaar, labour shortage, unemployment and debt each
become a goal at the front of the list once per city, paying 10 gold
when the trouble clears. The road goal counts tiles beyond the start
road exactly. Finishing the five guide goals pays 50 gold once.
settle(world, events) completes everything already earned, so steps
can finish while paused, and setGuide switches the guide on or off.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

- `goals` counts every completed goal, event goals included, so "On course" should read "Complete 9 goals".
- `fedAll`'s "at least `people` people" is the city's population, judged from `house.met.food` at the last month end.
- `waterAll` uses `coveredBy` (working wells, reached now).
- `jobs` reads unemployment from `world.labour`, the last labour assignment. A city with no workforce does not qualify.
- A firsts `tier` check is met when any home is at that tier or above. Its place is the first home at exactly that tier, otherwise the first home above it.

### Task 3: Firsts and achievements

**Files:**
- Create: `src/data/firsts.js`, `src/data/achievements.js`, `src/sim/firsts.js`, `src/sim/achievements.js`
- Modify: `src/sim/clock.js` (`tickDay` calls `checkFirsts` after `checkGoals`; `runMonth` calls `checkAchievements` after `computeAlerts`)
- Modify: `src/sim/settle.js` (`settle` calls `checkFirsts` then `checkAchievements` after `settleGoals`)
- Modify: `tests/all.js` (two imports), `tests/ui/createUI.test.js` (one debt fixture needs more debt: the first family now pays 10 gold on the same tick)
- Test: `tests/sim/firsts.test.js`, `tests/sim/achievements.test.js`

**Interfaces:**
- Consumes:
  - From Task 1: `world.firsts` (an array, or `null` after migration), `world.achievements` (an array or `null`), `world.tally.{ harvested, profitMonths, peakPeople, dailyDone }`, `world.goals.completed`.
  - From Task 2: `src/sim/settle.js` with `settle(world, events = null)` calling `settleGoals(world, events)` and returning `events`. `tickDay` ends with `triggerEventGoals(world); checkGoals(world, events);`.
  - Existing code: `allBuildings`, `housesOf`, `population` (`src/sim/world.js`); `coveredBy` (`src/sim/housing.js`); `idx` (`src/sim/grid.js`); `TIERS` (`src/data/housing.js`); `BUILDINGS`; `FOOD_GOODS`.
- Produces:
  - `src/data/firsts.js`: `FIRST_REWARD = 10`, `FIRSTS`.
  - `src/sim/firsts.js`: `firstMet(world, def)`, `checkFirsts(world, events = null)`.
  - `src/data/achievements.js`: `ACHIEVEMENTS` (24).
  - `src/sim/achievements.js`: `achievementProgress(world, def)`, `checkAchievements(world, events = null)`, `roadsLaid(world)`, `countType(world, type)`.
  - Events: `{ type: 'first', id, reward: 10, x, y }` (`x`/`y` are `null` when there is no place) and `{ type: 'achievement', id }`.
  - Wiring: `tickDay` checks firsts every day, `runMonth` checks achievements every month, and `settle` checks both.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/firsts.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { FIRSTS, FIRST_REWARD } from '../../src/data/firsts.js';
import { firstMet, checkFirsts } from '../../src/sim/firsts.js';
import { settle } from '../../src/sim/settle.js';
import { advanceDays } from '../../src/sim/clock.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

const first = (id) => FIRSTS.find((f) => f.id === id);

// Road along y = 10 (32 tiles, none of them start road: makeTestWorld's start road is empty).
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('sim firsts', () => {
  it('lists the Stage 1 firsts in order, each paying 10 gold', () => {
    expect(FIRST_REWARD).toBe(10);
    expect(FIRSTS.map((f) => f.id)).toEqual([
      'first_family', 'first_full_home', 'first_harvest', 'first_shack', 'first_cottage', 'first_house', 'first_profit', 'people_100',
    ]);
    expect(first('first_full_home').check).toEqual({ kind: 'fullHome' });
    expect(first('first_harvest').check).toEqual({ kind: 'tally', key: 'harvested', n: 1 });
    expect(first('first_cottage').check).toEqual({ kind: 'tier', tier: 3 });
    expect(first('people_100').check).toEqual({ kind: 'people', n: 100 });
  });
  it('places people and full homes at the first home that shows them', () => {
    const w = street();
    expect(firstMet(w, first('first_family'))).toBe(null);
    addRaw(w, 'house', 12, 11);                                              // an empty plot is no family
    expect(firstMet(w, first('first_family'))).toBe(null);
    addRaw(w, 'house', 13, 11, { tier: 1, residents: 3 });
    addRaw(w, 'house', 14, 11, { tier: 1, residents: 5 });                  // a hut holds 5
    expect(firstMet(w, first('first_family'))).toEqual({ x: 13.5, y: 11.5 });
    expect(firstMet(w, first('first_full_home'))).toEqual({ x: 14.5, y: 11.5 });
    expect(firstMet(w, first('people_100'))).toBe(null);
    for (let x = 0; x < 23; x++) addRaw(w, 'house', x, 12, { tier: 1, residents: 4 });   // 8 + 92 = 100 people
    expect(firstMet(w, first('people_100'))).toEqual({ x: 13.5, y: 11.5 });
  });
  it('places a tier at the first home at exactly that tier, else the first above it', () => {
    const w = street();
    addRaw(w, 'house', 12, 11, { tier: 3, residents: 12 });
    addRaw(w, 'house', 13, 11, { tier: 2, residents: 8 });
    expect(firstMet(w, first('first_shack'))).toEqual({ x: 13.5, y: 11.5 });   // the shack, not the cottage
    expect(firstMet(w, first('first_cottage'))).toEqual({ x: 12.5, y: 11.5 });
    expect(firstMet(w, first('first_house'))).toBe(null);
    const v = street();
    addRaw(v, 'house', 5, 11, { tier: 4, residents: 16 });
    expect(firstMet(v, first('first_shack'))).toEqual({ x: 5.5, y: 11.5 });
  });
  it('places the harvest at the first granary holding food, and profit nowhere', () => {
    const w = street();
    expect(firstMet(w, first('first_harvest'))).toBe(null);
    w.tally.harvested = 1;
    expect(firstMet(w, first('first_harvest'))).toEqual({ x: null, y: null });  // the grain has already gone on
    addRaw(w, 'granary', 20, 11);
    addRaw(w, 'granary', 24, 11, { store: { grain: 3 } });
    expect(firstMet(w, first('first_harvest'))).toEqual({ x: 25, y: 12 });
    expect(firstMet(w, first('first_profit'))).toBe(null);
    w.tally.profitMonths = 1;
    expect(firstMet(w, first('first_profit'))).toEqual({ x: null, y: null });
    expect(firstMet(w, { id: 'nope', check: { kind: 'nope' } })).toBe(null);
  });
  it('records each first once, pays 10 gold and reports it with its place', () => {
    const w = street();
    const events = [];
    expect(checkFirsts(w, events)).toEqual([]);
    expect(events).toEqual([]);
    expect(w.firsts).toEqual([]);
    addRaw(w, 'house', 12, 11, { tier: 2, residents: 3 });
    w.tally.profitMonths = 1;
    const gold = w.gold;
    expect(checkFirsts(w, events)).toEqual(['first_family', 'first_shack', 'first_profit']);
    expect(w.gold).toBe(gold + 3 * FIRST_REWARD);
    expect(w.firsts).toEqual(['first_family', 'first_shack', 'first_profit']);
    expect(events).toEqual([
      { type: 'first', id: 'first_family', reward: 10, x: 12.5, y: 11.5 },
      { type: 'first', id: 'first_shack', reward: 10, x: 12.5, y: 11.5 },
      { type: 'first', id: 'first_profit', reward: 10, x: null, y: null },
    ]);
    expect(checkFirsts(w, events)).toEqual([]);                              // once per city
    expect(events.length).toBe(3);
    expect(w.gold).toBe(gold + 30);
    const quiet = street();
    addRaw(quiet, 'house', 12, 11, { tier: 1, residents: 1 });
    const before = quiet.gold;
    checkFirsts(quiet);                                                      // no events array: still recorded and paid
    expect(quiet.firsts).toEqual(['first_family']);
    expect(quiet.gold).toBe(before + 10);
  });
  it('marks what is already true silently when the firsts are null (a migrated city)', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 1, residents: 5 });
    w.firsts = null;
    const gold = w.gold;
    const events = [];
    expect(checkFirsts(w, events)).toEqual([]);
    expect(w.firsts).toEqual(['first_family', 'first_full_home']);
    expect(events).toEqual([]);
    expect(w.gold).toBe(gold);
    h.tier = 2;                                                              // later firsts celebrate as usual
    expect(checkFirsts(w, events)).toEqual(['first_shack']);
    expect(events).toEqual([{ type: 'first', id: 'first_shack', reward: 10, x: 12.5, y: 11.5 }]);
    expect(w.gold).toBe(gold + 10);
  });
  it('is checked every day by the clock: the first family moves in on day 10', () => {
    const w = street();
    addRaw(w, 'house', 5, 11);
    const events = [];
    advanceDays(w, 9, events);
    expect(events.filter((e) => e.type === 'first')).toEqual([]);
    const gold = w.gold;
    advanceDays(w, 1, events);
    expect(events.filter((e) => e.type === 'first')).toEqual([
      { type: 'first', id: 'first_family', reward: 10, x: 5.5, y: 11.5 },
      { type: 'first', id: 'first_full_home', reward: 10, x: 5.5, y: 11.5 },  // five arrive and a hut holds five
    ]);
    expect(w.gold).toBe(gold + 20);
  });
  it('settles goals, then firsts, then achievements, without a game day', () => {
    const w = street();                                                      // 32 road tiles: the road goal and 'way_in'
    addRaw(w, 'house', 12, 11, { tier: 1, residents: 3 });
    const gold = w.gold;
    const events = [];
    expect(settle(w, events)).toBe(events);
    expect(events).toEqual([
      { type: 'goal', id: 'road', reward: 25 },
      { type: 'first', id: 'first_family', reward: 10, x: 12.5, y: 11.5 },
      { type: 'achievement', id: 'way_in' },
    ]);
    expect(w.gold).toBe(gold + 35);
    expect(w.day).toBe(0);
    expect(settle(w, [])).toEqual([]);                                       // nothing twice
  });
});
```

Create `tests/sim/achievements.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { achievementProgress, checkAchievements, roadsLaid } from '../../src/sim/achievements.js';
import { advanceDays } from '../../src/sim/clock.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

const byId = (id) => ACHIEVEMENTS.find((a) => a.id === id);
const progress = (w, id) => achievementProgress(w, byId(id));

describe('sim achievements', () => {
  it('lists 24 achievements with unique ids and measures the sim can count', () => {
    expect(ACHIEVEMENTS.map((a) => a.id)).toEqual([
      'way_in', 'neighbours', 'street', 'busy_streets', 'water_bearer', 'breadbasket', 'plenty', 'market_day',
      'faithful', 'shack_row', 'cottage_lane', 'house_proud', 'hamlet', 'town', 'bustling', 'good_harvests',
      'granary_of_the_river', 'steady_books', 'prosperous', 'no_one_hungry', 'water_for_all', 'busy_hands',
      'on_course', 'day_by_day',
    ]);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(24);
    const kinds = ['roads', 'homes', 'buildings', 'tier', 'people', 'tally', 'goals', 'fedAll', 'waterAll', 'jobs'];
    const tallyKeys = Object.keys(makeTestWorld().tally);
    for (const a of ACHIEVEMENTS) {
      expect(kinds).toContain(a.measure.kind);
      if (a.measure.kind === 'buildings') expect(Object.keys(BUILDINGS)).toContain(a.measure.type);
      if (a.measure.kind === 'tally') expect(tallyKeys).toContain(a.measure.key);
    }
    expect(byId('cottage_lane').measure).toEqual({ kind: 'tier', tier: 3, n: 20 });
    expect(byId('no_one_hungry').measure).toEqual({ kind: 'fedAll', people: 100 });
    expect(byId('water_for_all').measure).toEqual({ kind: 'waterAll', homes: 30 });
    expect(byId('busy_hands').measure).toEqual({ kind: 'jobs', people: 150, rate: 0.05 });
  });
  it('counts road tiles laid beyond the start road, clamped to the target', () => {
    const w = makeTestWorld();
    w.startRoad = [[0, 10], [1, 10]];
    setRoad(w, 0, 10, 5, 10);
    expect(roadsLaid(w)).toBe(4);
    expect(progress(w, 'way_in')).toEqual({ n: 4, of: 10 });
    setRoad(w, 0, 10, 31, 10);
    expect(roadsLaid(w)).toBe(30);
    expect(progress(w, 'way_in')).toEqual({ n: 10, of: 10 });
  });
  it('counts homes, buildings of a type and homes at a tier or above', () => {
    const w = makeTestWorld();
    [1, 2, 3, 4, 0].forEach((tier, i) => addRaw(w, 'house', 10 + i, 11, { tier }));
    addRaw(w, 'well', 10, 9);
    addRaw(w, 'well', 12, 9);
    expect(progress(w, 'neighbours')).toEqual({ n: 5, of: 10 });            // empty plots are homes too
    expect(progress(w, 'water_bearer')).toEqual({ n: 2, of: 5 });
    expect(progress(w, 'faithful')).toEqual({ n: 0, of: 2 });
    expect(progress(w, 'shack_row')).toEqual({ n: 3, of: 10 });
    expect(progress(w, 'cottage_lane')).toEqual({ n: 2, of: 20 });
    expect(progress(w, 'house_proud')).toEqual({ n: 1, of: 20 });
  });
  it('counts people as the larger of the peak and the live population', () => {
    const w = makeTestWorld();
    for (let x = 0; x < 6; x++) addRaw(w, 'house', 10 + x, 11, { tier: 1, residents: 5 });   // 30 people
    expect(progress(w, 'hamlet')).toEqual({ n: 30, of: 50 });
    w.tally.peakPeople = 45;
    expect(progress(w, 'hamlet')).toEqual({ n: 45, of: 50 });
    w.tally.peakPeople = 400;
    expect(progress(w, 'bustling')).toEqual({ n: 300, of: 300 });
  });
  it('reads the tallies and the goals completed', () => {
    const w = makeTestWorld();
    w.tally.harvested = 120;
    w.tally.profitMonths = 30;
    w.tally.dailyDone = 3;
    expect(progress(w, 'good_harvests')).toEqual({ n: 120, of: 500 });
    expect(progress(w, 'granary_of_the_river')).toEqual({ n: 120, of: 2000 });
    expect(progress(w, 'prosperous')).toEqual({ n: 24, of: 24 });
    expect(progress(w, 'day_by_day')).toEqual({ n: 3, of: 10 });
    expect(progress(w, 'on_course')).toEqual({ n: 0, of: 9 });
    w.goals.completed.push('road', 'plots');
    expect(progress(w, 'on_course')).toEqual({ n: 2, of: 9 });
  });
  it('judges everyone fed: every Cottage or better fed, 100 people, at least one such home', () => {
    const w = makeTestWorld();
    const homes = [];
    for (let x = 0; x < 10; x++) homes.push(addRaw(w, 'house', 10 + x, 11, { tier: 3, residents: 10, met: { food: true } }));
    expect(progress(w, 'no_one_hungry')).toEqual({ n: 1, of: 1 });
    homes[4].met = { food: false };
    expect(progress(w, 'no_one_hungry')).toEqual({ n: 0, of: 1 });
    homes[4].met = { food: true };
    homes[9].residents = 9;                                                  // 99 people
    expect(progress(w, 'no_one_hungry')).toEqual({ n: 0, of: 1 });
    homes[9].residents = 10;
    for (const h of homes) h.tier = 2;                                       // nobody at Cottage yet
    expect(progress(w, 'no_one_hungry')).toEqual({ n: 0, of: 1 });
  });
  it('judges water for all: every lived-in home reached by a working well, 30 homes or more', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const homes = [];
    for (let x = 1; x <= 30; x++) homes.push(addRaw(w, 'house', x, 11, { tier: 1, residents: 2 }));
    for (const x of [4, 13, 22]) addRaw(w, 'well', x, 9);                   // reach 5: x 0-26 covered
    expect(progress(w, 'water_for_all')).toEqual({ n: 0, of: 1 });
    addRaw(w, 'well', 31, 9);                                                // and now 27-30
    expect(progress(w, 'water_for_all')).toEqual({ n: 1, of: 1 });
    homes[0].residents = 0;                                                  // 29 lived-in homes
    expect(progress(w, 'water_for_all')).toEqual({ n: 0, of: 1 });
  });
  it('judges busy hands: 150 people and unemployment at most 5%', () => {
    const w = makeTestWorld();
    const homes = [];
    for (let x = 0; x < 10; x++) homes.push(addRaw(w, 'house', 10 + x, 11, { tier: 4, residents: 15 }));   // 150 people
    w.labour = { workforce: 60, employed: 57, jobs: 60, shortLevels: [] };  // 3 of 60 out of work: exactly 5%
    expect(progress(w, 'busy_hands')).toEqual({ n: 1, of: 1 });
    w.labour.employed = 56;
    expect(progress(w, 'busy_hands')).toEqual({ n: 0, of: 1 });
    w.labour.employed = 57;
    homes[0].residents = 14;
    expect(progress(w, 'busy_hands')).toEqual({ n: 0, of: 1 });
    homes[0].residents = 15;
    w.labour = { workforce: 0, employed: 0, jobs: 0, shortLevels: [] };
    expect(progress(w, 'busy_hands')).toEqual({ n: 0, of: 1 });
  });
  it('records each new achievement once with an event and no gold', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 9, 10);
    for (let x = 0; x < 10; x++) addRaw(w, 'house', x, 11);
    const gold = w.gold;
    const events = [];
    expect(checkAchievements(w, events)).toEqual(['way_in', 'neighbours']);
    expect(events).toEqual([{ type: 'achievement', id: 'way_in' }, { type: 'achievement', id: 'neighbours' }]);
    expect(w.achievements).toEqual(['way_in', 'neighbours']);
    expect(w.gold).toBe(gold);
    expect(checkAchievements(w, events)).toEqual([]);
    expect(events.length).toBe(2);
  });
  it('marks what is already true silently when the achievements are null (a migrated city)', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 9, 10);
    for (let x = 0; x < 10; x++) addRaw(w, 'house', x, 11);
    w.achievements = null;
    const events = [];
    expect(checkAchievements(w, events)).toEqual([]);
    expect(w.achievements).toEqual(['way_in', 'neighbours']);
    expect(events).toEqual([]);
    for (let x = 0; x < 15; x++) addRaw(w, 'house', x, 12);                // 25 homes
    expect(checkAchievements(w, events)).toEqual(['street']);
    expect(events).toEqual([{ type: 'achievement', id: 'street' }]);
  });
  it('is checked at each month end, before the month event', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 9, 10);                                                // ten tiles: 'way_in'
    const events = [];
    advanceDays(w, 29, events);
    expect(events.filter((e) => e.type === 'achievement')).toEqual([]);
    advanceDays(w, 1, events);
    expect(events.filter((e) => e.type === 'achievement')).toEqual([{ type: 'achievement', id: 'way_in' }]);
    const types = events.map((e) => e.type);
    expect(types.indexOf('achievement')).toBeLessThan(types.indexOf('month'));
    expect(w.achievements).toEqual(['way_in']);
  });
});
```

In `tests/all.js`, add the two imports directly after the line `import './sim/goals.test.js';`. Task 2's `goalsV2` import may also sit after that line; the order between them does not matter.

Before:

```js
import './sim/goals.test.js';
```

After:

```js
import './sim/goals.test.js';
import './sim/firsts.test.js';
import './sim/achievements.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sim firsts"`
Expected: the page cannot load, because the new test files import modules that do not exist yet:

```
LOAD ERROR
TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:<port>/tests/all.js
```

- [ ] **Step 3: Implement**

Create `src/data/firsts.js`:

```js
// Firsts (spec 3.6): one small celebration per city for each of these, each paying FIRST_REWARD. Checks are
// declarative so later stages can add firsts for new goods and tiers; src/sim/firsts.js evaluates them.
// The words the player sees live in src/ui/text.js (FIRST_TEXT, keyed by id).
export const FIRST_REWARD = 10;

export const FIRSTS = [
  { id: 'first_family', check: { kind: 'people', n: 1 } },
  { id: 'first_full_home', check: { kind: 'fullHome' } },
  { id: 'first_harvest', check: { kind: 'tally', key: 'harvested', n: 1 } },
  { id: 'first_shack', check: { kind: 'tier', tier: 2 } },
  { id: 'first_cottage', check: { kind: 'tier', tier: 3 } },
  { id: 'first_house', check: { kind: 'tier', tier: 4 } },
  { id: 'first_profit', check: { kind: 'tally', key: 'profitMonths', n: 1 } },
  { id: 'people_100', check: { kind: 'people', n: 100 } },
];
```

Create `src/sim/firsts.js`:

```js
// Firsts (spec 3.6): each is recorded once per city, pays FIRST_REWARD and reports where it happened so the
// interface can put a sparkle on the building. Pure checks against the world; data in src/data/firsts.js.
import { FIRSTS, FIRST_REWARD } from '../data/firsts.js';
import { BUILDINGS } from '../data/buildings.js';
import { TIERS } from '../data/housing.js';
import { FOOD_GOODS } from '../data/goods.js';
import { allBuildings, housesOf, population } from './world.js';

const centre = (b) => (b ? { x: b.x + b.w / 2, y: b.y + b.d / 2 } : { x: null, y: null });
const isFull = (h) => h.tier >= 1 && h.residents >= TIERS[h.tier].capacity;
const holdsFood = (b) => (BUILDINGS[b.type].stores || []).some((g) => FOOD_GOODS.includes(g) && (b.store[g] || 0) > 0);

// null when the first has not happened; otherwise where it happened: the centre of the building that shows
// it (the first lived-in home, the first full home, the first granary holding food, the first home at the
// tier), or { x: null, y: null } when nothing on the map shows it (a month in profit). def is a FIRSTS entry.
export function firstMet(world, def) {
  const c = def.check || def;
  switch (c.kind) {
    case 'people':
      return population(world) >= c.n ? centre(housesOf(world).find((h) => h.residents > 0)) : null;
    case 'fullHome': {
      const h = housesOf(world).find(isFull);
      return h ? centre(h) : null;
    }
    case 'tier': {
      const houses = housesOf(world);
      const at = houses.find((h) => h.tier === c.tier) || houses.find((h) => h.tier >= c.tier);
      return at ? centre(at) : null;
    }
    case 'tally':
      if ((world.tally[c.key] || 0) < c.n) return null;
      return centre(c.key === 'harvested' ? allBuildings(world).find(holdsFood) : null);
    default:
      return null;
  }
}

// Records every first that has happened and is not yet recorded. A world whose firsts are null (a city
// migrated from version 1) has its already-true firsts marked silently: no events, no gold.
// Returns the ids recorded with a celebration by this call.
export function checkFirsts(world, events = null) {
  if (world.firsts === null) {
    world.firsts = FIRSTS.filter((f) => firstMet(world, f)).map((f) => f.id);
    return [];
  }
  const added = [];
  for (const f of FIRSTS) {
    if (world.firsts.includes(f.id)) continue;
    const at = firstMet(world, f);
    if (!at) continue;
    world.firsts.push(f.id);
    world.gold += FIRST_REWARD;
    added.push(f.id);
    if (events) events.push({ type: 'first', id: f.id, reward: FIRST_REWARD, x: at.x, y: at.y });
  }
  return added;
}
```

Create `src/data/achievements.js`:

```js
// Achievements (spec 3.8): visible from the start with exact conditions, per city, never time-limited,
// missable or grindy, and they never unlock content or pay gold. Measures are declarative; src/sim/
// achievements.js counts them. Names and condition text live in src/ui/text.js (keyed by id).
// Measure kinds:
//   roads      road tiles laid (not part of the start road)        n
//   homes      housing plots, any tier, empty ones included          n
//   buildings  buildings of one type                                 type, n
//   tier       homes at that tier or above                           tier, n
//   people     the most people the city has had                      n
//   tally      a running tally in world.tally                        key, n
//   goals      goals completed (event goals included)                n
//   fedAll     every home at Cottage or above fed last month, in a city of at least `people` people
//   waterAll   every lived-in home reached by a working well, at least `homes` of them
//   jobs       at least `people` people and unemployment at most `rate`
export const ACHIEVEMENTS = [
  { id: 'way_in', measure: { kind: 'roads', n: 10 } },
  { id: 'neighbours', measure: { kind: 'homes', n: 10 } },
  { id: 'street', measure: { kind: 'homes', n: 25 } },
  { id: 'busy_streets', measure: { kind: 'homes', n: 50 } },
  { id: 'water_bearer', measure: { kind: 'buildings', type: 'well', n: 5 } },
  { id: 'breadbasket', measure: { kind: 'buildings', type: 'farm_grain', n: 3 } },
  { id: 'plenty', measure: { kind: 'buildings', type: 'granary', n: 2 } },
  { id: 'market_day', measure: { kind: 'buildings', type: 'bazaar', n: 3 } },
  { id: 'faithful', measure: { kind: 'buildings', type: 'temple', n: 2 } },
  { id: 'shack_row', measure: { kind: 'tier', tier: 2, n: 10 } },
  { id: 'cottage_lane', measure: { kind: 'tier', tier: 3, n: 20 } },
  { id: 'house_proud', measure: { kind: 'tier', tier: 4, n: 20 } },
  { id: 'hamlet', measure: { kind: 'people', n: 50 } },
  { id: 'town', measure: { kind: 'people', n: 150 } },
  { id: 'bustling', measure: { kind: 'people', n: 300 } },
  { id: 'good_harvests', measure: { kind: 'tally', key: 'harvested', n: 500 } },
  { id: 'granary_of_the_river', measure: { kind: 'tally', key: 'harvested', n: 2000 } },
  { id: 'steady_books', measure: { kind: 'tally', key: 'profitMonths', n: 6 } },
  { id: 'prosperous', measure: { kind: 'tally', key: 'profitMonths', n: 24 } },
  { id: 'no_one_hungry', measure: { kind: 'fedAll', people: 100 } },
  { id: 'water_for_all', measure: { kind: 'waterAll', homes: 30 } },
  { id: 'busy_hands', measure: { kind: 'jobs', people: 150, rate: 0.05 } },
  { id: 'on_course', measure: { kind: 'goals', n: 9 } },
  { id: 'day_by_day', measure: { kind: 'tally', key: 'dailyDone', n: 10 } },
];
```

Create `src/sim/achievements.js`:

```js
// Achievements (spec 3.8): exact progress for every measure, so the summary sheet can say "12 of 50", and
// one 'achievement' event per unlock. No gold. Data in src/data/achievements.js.
import { ACHIEVEMENTS } from '../data/achievements.js';
import { allBuildings, housesOf, population } from './world.js';
import { coveredBy } from './housing.js';
import { idx } from './grid.js';

// Road tiles the player laid: every road tile that is not part of the generator's start road.
export function roadsLaid(world) {
  const start = new Set(world.startRoad.map(([x, y]) => idx(world.size, x, y)));
  let n = 0;
  for (let i = 0; i < world.road.length; i++) if (world.road[i] && !start.has(i)) n++;
  return n;
}

export const countType = (world, type) => allBuildings(world).filter((b) => b.type === type).length;

// The counting measures; null for the yes/no ones.
function count(world, m) {
  switch (m.kind) {
    case 'roads': return roadsLaid(world);
    case 'homes': return housesOf(world).length;
    case 'buildings': return countType(world, m.type);
    case 'tier': return housesOf(world).filter((h) => h.tier >= m.tier).length;
    case 'people': return Math.max(world.tally.peakPeople, population(world));
    case 'tally': return world.tally[m.key] || 0;
    case 'goals': return world.goals.completed.length;
    default: return null;
  }
}

// Every home at Cottage or above was fed at the last month end (house.met), in a city of `people` or more.
function fedAll(world, people) {
  if (population(world) < people) return false;
  const homes = housesOf(world).filter((h) => h.tier >= 3);
  return homes.length > 0 && homes.every((h) => Boolean(h.met && h.met.food));
}

// Every lived-in home is reached by a working well now, with at least `homes` lived-in homes.
function waterAll(world, homes) {
  const lived = housesOf(world).filter((h) => h.residents > 0);
  return lived.length >= homes && lived.every((h) => coveredBy(world, h, 'water'));
}

// Unemployment from the last labour assignment (world.labour), in a city of `people` or more.
function jobsFor(world, people, rate) {
  const L = world.labour;
  if (population(world) < people || !(L.workforce > 0)) return false;
  return (L.workforce - L.employed) / L.workforce <= rate;
}

function holds(world, m) {
  switch (m.kind) {
    case 'fedAll': return fedAll(world, m.people);
    case 'waterAll': return waterAll(world, m.homes);
    case 'jobs': return jobsFor(world, m.people, m.rate);
    default: return false;
  }
}

// { n, of } with n never above of; the yes/no measures report { n: 0 or 1, of: 1 }. def is an ACHIEVEMENTS entry.
export function achievementProgress(world, def) {
  const m = def.measure || def;
  const n = count(world, m);
  if (n === null) return { n: holds(world, m) ? 1 : 0, of: 1 };
  return { n: Math.min(n, m.n), of: m.n };
}

const complete = (world, a) => { const p = achievementProgress(world, a); return p.n >= p.of; };

// Records every newly complete achievement and reports each one. A world whose achievements are null (a
// city migrated from version 1) has the complete ones marked silently. Returns the ids reported.
export function checkAchievements(world, events = null) {
  if (world.achievements === null) {
    world.achievements = ACHIEVEMENTS.filter((a) => complete(world, a)).map((a) => a.id);
    return [];
  }
  const added = [];
  for (const a of ACHIEVEMENTS) {
    if (world.achievements.includes(a.id) || !complete(world, a)) continue;
    world.achievements.push(a.id);
    added.push(a.id);
    if (events) events.push({ type: 'achievement', id: a.id });
  }
  return added;
}
```

Modify `src/sim/clock.js` with three edits.

Edit 1: the imports.

Before:

```js
import { computeAlerts } from './alerts.js';
```

After:

```js
import { computeAlerts } from './alerts.js';
import { checkFirsts } from './firsts.js';
import { checkAchievements } from './achievements.js';
```

Edit 2: in `runMonth`, check achievements after the alerts.

Before:

```js
  computeAlerts(world);
  clearUndo(world);
```

After:

```js
  computeAlerts(world);
  checkAchievements(world, events);
  clearUndo(world);
```

Edit 3: the last lines of `tickDay`. Task 2 left `triggerEventGoals(world);` on the line above; leave it there.

Before:

```js
  checkGoals(world, events);
}
```

After:

```js
  checkGoals(world, events);
  checkFirsts(world, events);
}
```

`tickDay` now ends:

```js
  triggerEventGoals(world);
  checkGoals(world, events);
  checkFirsts(world, events);
}
```

Modify `src/sim/settle.js` with two edits.

Edit 1: add two imports directly below Task 2's import from `./goals.js`. If that line names more functions than `settleGoals`, keep it unchanged and still add the two lines below it.

Before:

```js
import { settleGoals } from './goals.js';
```

After:

```js
import { settleGoals } from './goals.js';
import { checkFirsts } from './firsts.js';
import { checkAchievements } from './achievements.js';
```

Edit 2: inside `settle`.

Before:

```js
  settleGoals(world, events);
```

After:

```js
  settleGoals(world, events);
  checkFirsts(world, events);
  checkAchievements(world, events);
```

Delete the placeholder comment line Task 2 left inside `settle` for Task 3, if there is one. Keep any comment for Task 4 until Task 4. The function now reads (plus anything else Task 2 put in it):

```js
export function settle(world, events = null) {
  settleGoals(world, events);
  checkFirsts(world, events);
  checkAchievements(world, events);
  return events;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sim firsts"`
Expected: `8 passed, 0 failed` and `ALL PASSED`.

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sim achievements"`
Expected: `11 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

One existing test breaks: `tests/ui/createUI.test.js` > "refreshes alerts, the banner, the badge and the canvas summary when the day changes". The rig's two huts hold 8 people, so on the tick the road goal pays 25 and now the first family pays 10. A starting gold of -30 ends at +5, out of debt, and the banner assertion fails.

Because that test fails part-way without `cleanup()`, the shell stays mounted and about 25 later UI tests fail with `Cannot read properties of null (reading 'dispatchEvent')`. Fix this one line and the rest pass again.

Before:

```js
    r.world.gold = -30;   // the road goal pays 25 on the same day, so -5 would be out of debt by the tick
```

After:

```js
    r.world.gold = -50;   // the road goal (25) and the first family (10) pay on the same day, so -30 would be out of debt by the tick
```

If Task 2 already changed this line, keep the same rule: the starting gold plus 35 must still be below 0.

These tests were checked and still pass:
- `tests/sim/events.test.js` "accepts a single tickDay with events": the street has no homes, so no first lands on day one.
- `tests/sim/events.test.js` "changes nothing about the world when no events array is given": firsts are recorded and paid the same way with or without events.
- `tests/sim/clock.test.js`, `tests/sim/goals.test.js`, `tests/sim/integration.test.js`: they assert no gold totals or exact event lists after ticks that a first could change.
- `tests/sim/longrun.test.js`: firsts add at most 80 gold and achievements none; the bounds are greater than 2000 and less than 60000.
- `tests/dev/sampleCity.test.js`: at most +80, against a bound of less than `startGold + 5000`.
- `tests/save/serialize.test.js` determinism: both worlds run the same checks.
- `tests/ui/autosave.test.js` and `tests/ui/hud.test.js`: `onEvents` and `effects.fromEvents` ignore the new event types, and `hud` only checks that `net` is a number.

This was verified by running the whole suite with stand-ins for Tasks 1 and 2. Task 3 changed exactly one test result.

Tests that Tasks 1 or 2 add may also break, if they assert exact gold or an exact event list after `tickDay`, `advanceDays` or `settle` on a world with residents, a profitable month or a harvest. Candidates: `tests/sim/worldV2.test.js`, `tests/sim/goalsV2.test.js`. A first can now land in those ticks. To fix one, switch firsts off in that fixture with `w.firsts = FIRSTS.map((f) => f.id);` (import `FIRSTS` from `src/data/firsts.js`). For achievements, use `w.achievements = ACHIEVEMENTS.map((a) => a.id);`. The alternative is to add `FIRST_REWARD` per first to the expected gold.

- [ ] **Step 6: Full suite**

Run: `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1` (four new files under `src/` join the cache list)
Then: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ALL PASSED`, with 19 more tests than before this task.

- [ ] **Step 7: Commit**

```powershell
git add src/data/firsts.js src/data/achievements.js src/sim/firsts.js src/sim/achievements.js src/sim/clock.js src/sim/settle.js tests/sim/firsts.test.js tests/sim/achievements.test.js tests/all.js tests/ui/createUI.test.js sw-files.js
git commit -m @'
Celebrate firsts and track achievements in the sim

Eight firsts (first family, full home, harvest, Shack, Cottage, House,
month in profit, 100 people) pay 10 gold each and say where they
happened; 24 achievements report exact progress and never pay. The clock
checks firsts daily and achievements at each month end, and settle runs
both after every command. A migrated city marks what is already true
without celebrating.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 4: Daily goals

**Files:**
- Create: `src/data/daily.js`, `src/sim/daily.js`
- Modify: `src/sim/clock.js` (`tickDay` calls `checkDaily` after `checkFirsts` when a day is drawn)
- Modify: `src/sim/settle.js` (`settle` calls `checkDaily` last)
- Modify: `tests/all.js` (one import)
- Test: `tests/sim/daily.test.js`

**Interfaces:**
- Consumes:
  - From Task 1: `world.daily` (`null` or `{ date, picks, base, done, swapped }`), `world.tally.{ upgrades, harvested, profitMonths, dailyDone }`, `world.goals.completed`, `world.seed`.
  - From Task 3: `roadsLaid(world)` and `countType(world, type)` from `src/sim/achievements.js`; `clock.js` and `settle.js` exactly as Task 3 left them.
  - Existing code: `createRng`, `hash2` (`src/sim/rng.js`); `isUnlocked` (`src/sim/progression.js`); `housesOf`, `population` (`src/sim/world.js`).
- Produces:
  - `src/data/daily.js`: `DAILY_COUNT = 3`, `DAILY_REWARD = 25`, `DAILY_AFTER = 'temple'`, `DAILY_POOL`.
  - `src/sim/daily.js`: `dailyAvailable(world)`, `dailyMeasure(world, def)`, `pickDaily(world, dateKey)`, `startDaily(world, dateKey)`, `dailyProgress(world, id)`, `checkDaily(world, events = null)`, `swapDaily(world, index)`, plus `hashKey(key)` and `dailyOrder(world, dateKey)`.
  - Event: `{ type: 'daily', id, reward: 25 }`.
  - Wiring: `tickDay` runs `if (world.daily) checkDaily(world, events)`, and `settle` runs `checkDaily` last.
  - Task 12 calls `startDaily` with `dateKeyOf(clock())`. Tasks 12 and 16 read `world.daily` and `dailyProgress`.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/daily.test.js`. The pinned picks below were computed with this exact shuffle, and the hash values are the standard FNV-1a 32-bit test vectors.

```js
import { describe, it, expect } from '../harness.js';
import { DAILY_POOL, DAILY_COUNT, DAILY_REWARD, DAILY_AFTER } from '../../src/data/daily.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { MILESTONES } from '../../src/data/progression.js';
import {
  dailyAvailable, dailyMeasure, hashKey, dailyOrder, pickDaily, startDaily, dailyProgress, checkDaily, swapDaily,
} from '../../src/sim/daily.js';
import { settle } from '../../src/sim/settle.js';
import { advanceDays } from '../../src/sim/clock.js';
import { removeBuilding } from '../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

const DAY = '2026-10-11';
const def = (id) => DAILY_POOL.find((d) => d.id === id);

// A city past the opening chain (so daily goals are open) with the guide already finished.
function readyCity(seed = 1) {
  const w = makeTestWorld();
  w.seed = seed;
  w.goals.completed.push('road', 'plots', 'well', 'food', 'temple');
  w.guide = { on: false, done: true };
  return w;
}

// Today's goals set by hand, with their snapshots taken now.
function dayWith(w, picks) {
  const base = {};
  for (const id of picks) base[id] = dailyMeasure(w, def(id));
  w.daily = { date: DAY, picks: picks.slice(), base, done: [], swapped: false };
  return w.daily;
}

describe('sim daily goals', () => {
  it('offers ten small goals, three a day, 25 gold each, once the temple goal is done', () => {
    expect(DAILY_COUNT).toBe(3);
    expect(DAILY_REWARD).toBe(25);
    expect(DAILY_AFTER).toBe('temple');
    expect(DAILY_POOL.map((d) => d.id)).toEqual([
      'plots4', 'roads10', 'upgrades3', 'well1', 'bazaar1', 'temple1', 'farm1', 'people20', 'profit1', 'harvest100',
    ]);
    const tallyKeys = Object.keys(makeTestWorld().tally);
    for (const d of DAILY_POOL) {
      expect(['homes', 'roads', 'buildings', 'people', 'tally']).toContain(d.measure.kind);
      if (d.measure.kind === 'buildings') expect(Object.keys(BUILDINGS)).toContain(d.measure.type);
      if (d.measure.kind === 'tally') expect(tallyKeys).toContain(d.measure.key);
      expect(d.n).toBeGreaterThan(0);
    }
    expect(def('upgrades3')).toEqual({ id: 'upgrades3', measure: { kind: 'tally', key: 'upgrades' }, n: 3 });
  });
  it('opens only once the temple goal is complete', () => {
    const w = makeTestWorld();
    expect(dailyAvailable(w)).toBe(false);
    w.goals.completed.push('road', 'plots', 'well', 'food');
    expect(dailyAvailable(w)).toBe(false);
    expect(startDaily(w, DAY)).toBe(false);
    expect(w.daily).toBe(null);
    w.goals.completed.push('temple');
    expect(dailyAvailable(w)).toBe(true);
    expect(startDaily(w, DAY)).toBe(true);
    expect(w.daily.date).toBe(DAY);
  });
  it('measures plots, laid road, buildings, people and tallies', () => {
    const w = makeTestWorld();
    w.startRoad = [[0, 10]];
    setRoad(w, 0, 10, 9, 10);                                                // 10 tiles, one of them start road
    addRaw(w, 'house', 1, 11, { tier: 1, residents: 5 });
    addRaw(w, 'house', 2, 11, { tier: 1, residents: 2 });
    addRaw(w, 'house', 3, 11);
    addRaw(w, 'well', 1, 9);
    addRaw(w, 'well', 2, 9);
    Object.assign(w.tally, { upgrades: 4, profitMonths: 2, harvested: 150 });
    const m = (id) => dailyMeasure(w, def(id));
    expect(m('plots4')).toBe(3);
    expect(m('roads10')).toBe(9);
    expect(m('well1')).toBe(2);
    expect(m('temple1')).toBe(0);
    expect(m('people20')).toBe(7);
    expect(m('upgrades3')).toBe(4);
    expect(m('profit1')).toBe(2);
    expect(m('harvest100')).toBe(150);
  });
  it('draws the same three for the same date and city, and others for another date or seed', () => {
    expect(hashKey('')).toBe(0x811c9dc5);                                    // FNV-1a test vectors
    expect(hashKey('a')).toBe(0xe40c292c);
    expect(hashKey('foobar')).toBe(0xbf9cf968);
    const a = readyCity(1);
    const b = readyCity(1);
    expect(pickDaily(a, DAY)).toEqual(['plots4', 'well1', 'temple1']);
    expect(pickDaily(b, DAY)).toEqual(pickDaily(a, DAY));
    expect(pickDaily(a, '2026-10-12')).toEqual(['temple1', 'roads10', 'plots4']);
    expect(pickDaily(readyCity(2), DAY)).toEqual(['people20', 'bazaar1', 'plots4']);
    const order = dailyOrder(a, DAY);
    expect(order.slice(0, DAILY_COUNT)).toEqual(pickDaily(a, DAY));
    expect(order.slice().sort()).toEqual(DAILY_POOL.map((d) => d.id).sort());
    addRaw(a, 'house', 3, 3, { tier: 1, residents: 5 });                     // the city's state does not move the draw
    a.tally.harvested = 99;
    const before = JSON.stringify(a);
    expect(pickDaily(a, DAY)).toEqual(['plots4', 'well1', 'temple1']);
    expect(JSON.stringify(a)).toBe(before);                                  // and drawing changes nothing
  });
  it('only draws goals whose building is unlocked', () => {
    const village = MILESTONES[0];
    const saved = village.unlocks;
    village.unlocks = saved.filter((t) => t !== 'temple' && t !== 'bazaar');
    try {
      const w = readyCity();
      const order = dailyOrder(w, DAY);
      expect(order.length).toBe(8);
      expect(order.includes('temple1') || order.includes('bazaar1')).toBe(false);
      for (let d = 10; d <= 28; d++) {
        const picks = pickDaily(w, `2026-10-${d}`);
        expect(picks.length).toBe(3);
        expect(picks.includes('temple1') || picks.includes('bazaar1')).toBe(false);
      }
    } finally {
      village.unlocks = saved;
    }
    expect(dailyOrder(readyCity(), DAY).length).toBe(10);
  });
  it('draws once per date with a snapshot of each measure, and redraws on a new date', () => {
    const w = readyCity();
    setRoad(w, 0, 10, 4, 10);                                                // 5 road tiles
    addRaw(w, 'house', 1, 11, { tier: 1, residents: 5 });
    addRaw(w, 'house', 2, 11, { tier: 1, residents: 3 });
    addRaw(w, 'well', 3, 9);
    Object.assign(w.tally, { upgrades: 7, harvested: 40, profitMonths: 2 });
    expect(startDaily(w, DAY)).toBe(true);
    expect(w.daily).toEqual({ date: DAY, picks: ['plots4', 'well1', 'temple1'], base: { plots4: 2, well1: 1, temple1: 0 }, done: [], swapped: false });
    const drawn = w.daily;
    expect(startDaily(w, DAY)).toBe(false);                                  // safe to call on every check
    expect(w.daily).toBe(drawn);
    w.daily.done.push('plots4');
    w.daily.swapped = true;
    expect(startDaily(w, '2026-10-12')).toBe(true);                          // yesterday's goals give way
    expect(w.daily).toEqual({ date: '2026-10-12', picks: ['temple1', 'roads10', 'plots4'], base: { temple1: 0, roads10: 5, plots4: 2 }, done: [], swapped: false });
    expect(startDaily(w, '')).toBe(false);
    expect(startDaily(w, null)).toBe(false);
    expect(w.daily.date).toBe('2026-10-12');
  });
  it('counts progress from the snapshot, clamped to 0..n', () => {
    const w = readyCity();
    const first = addRaw(w, 'house', 0, 11, { tier: 1, residents: 5 });   // 5 people before the day starts
    dayWith(w, ['plots4', 'roads10', 'people20']);
    expect(dailyProgress(w, 'plots4')).toEqual({ n: 0, of: 4 });
    addRaw(w, 'house', 1, 11);
    addRaw(w, 'house', 2, 11);
    expect(dailyProgress(w, 'plots4')).toEqual({ n: 2, of: 4 });
    setRoad(w, 0, 10, 11, 10);                                               // 12 tiles
    expect(dailyProgress(w, 'roads10')).toEqual({ n: 10, of: 10 });
    first.residents = 0;                                                     // fewer people than at the snapshot
    expect(dailyProgress(w, 'people20')).toEqual({ n: 0, of: 20 });
    first.residents = 5;
    addRaw(w, 'house', 3, 11, { tier: 1, residents: 5 });
    expect(dailyProgress(w, 'people20')).toEqual({ n: 5, of: 20 });
    expect(dailyProgress(w, 'well1')).toBe(null);                            // not one of today's
    expect(dailyProgress(w, 'nope')).toBe(null);
    w.daily = null;
    expect(dailyProgress(w, 'plots4')).toBe(null);
  });
  it('pays each finished goal once and counts it for the city', () => {
    const w = readyCity();
    dayWith(w, ['plots4', 'well1', 'profit1']);
    const gold = w.gold;
    const events = [];
    expect(checkDaily(w, events)).toEqual([]);
    const homes = [0, 1, 2, 3].map((x) => addRaw(w, 'house', x, 11));
    addRaw(w, 'well', 5, 9);
    expect(checkDaily(w, events)).toEqual(['plots4', 'well1']);
    expect(events).toEqual([{ type: 'daily', id: 'plots4', reward: 25 }, { type: 'daily', id: 'well1', reward: 25 }]);
    expect(w.gold).toBe(gold + 2 * DAILY_REWARD);
    expect(w.tally.dailyDone).toBe(2);
    expect(w.daily.done).toEqual(['plots4', 'well1']);
    expect(checkDaily(w, events)).toEqual([]);
    expect(w.gold).toBe(gold + 50);
    removeBuilding(w, homes[0].id);                                          // a finished goal stays finished
    expect(dailyProgress(w, 'plots4')).toEqual({ n: 4, of: 4 });
    expect(checkDaily(w, events)).toEqual([]);
    w.tally.profitMonths += 1;
    checkDaily(w);                                                           // no events array: still recorded and paid
    expect(w.daily.done).toEqual(['plots4', 'well1', 'profit1']);
    expect(w.tally.dailyDone).toBe(3);
    expect(w.gold).toBe(gold + 75);
    expect(events.length).toBe(2);
    w.daily = null;
    expect(checkDaily(w, events)).toEqual([]);
  });
  it('is checked by the clock every day and by settle after a command', () => {
    const w = readyCity();
    dayWith(w, ['upgrades3', 'plots4', 'roads10']);
    w.tally.upgrades += 3;
    const gold = w.gold;
    const events = [];
    advanceDays(w, 1, events);
    expect(events.filter((e) => e.type === 'daily')).toEqual([{ type: 'daily', id: 'upgrades3', reward: 25 }]);
    expect(w.gold).toBe(gold + 25);
    const v = readyCity();
    dayWith(v, ['well1', 'plots4', 'roads10']);
    addRaw(v, 'well', 5, 9);
    const settled = [];
    settle(v, settled);
    expect(settled).toEqual([{ type: 'daily', id: 'well1', reward: 25 }]);
    expect(v.day).toBe(0);
  });
  it('swaps one unfinished goal a day for the next in the day\'s order', () => {
    const w = readyCity();
    expect(swapDaily(w, 0)).toEqual({ ok: false, reason: 'no_swap' });      // no day drawn yet
    startDaily(w, DAY);
    expect(w.daily.picks).toEqual(['plots4', 'well1', 'temple1']);
    for (let x = 0; x < 3; x++) addRaw(w, 'house', x, 11, { tier: 1, residents: 4 });   // 12 people by the swap
    expect(swapDaily(w, 1)).toEqual({ ok: true, id: 'people20' });
    expect(w.daily.picks).toEqual(['plots4', 'people20', 'temple1']);
    expect(w.daily.base).toEqual({ plots4: 0, people20: 12, temple1: 0 });  // the new goal counts from the swap
    expect(w.daily.swapped).toBe(true);
    expect(swapDaily(w, 0)).toEqual({ ok: false, reason: 'no_swap' });      // one swap a day
    expect(startDaily(w, '2026-10-12')).toBe(true);
    expect(w.daily.picks).toEqual(['temple1', 'roads10', 'plots4']);
    addRaw(w, 'temple', 20, 20);
    expect(checkDaily(w)).toEqual(['temple1']);
    expect(swapDaily(w, 0)).toEqual({ ok: false, reason: 'no_swap' });      // not a finished goal
    for (const bad of [3, -1, 1.5]) expect(swapDaily(w, bad)).toEqual({ ok: false, reason: 'no_swap' });
    expect(swapDaily(w, 2)).toEqual({ ok: true, id: 'people20' });
    expect(w.daily.picks).toEqual(['temple1', 'roads10', 'people20']);
    expect(new Set(w.daily.picks).size).toBe(3);
    expect(w.daily.done).toEqual(['temple1']);
  });
});
```

In `tests/all.js`, add the import after the achievements test that Task 3 added.

Before:

```js
import './sim/achievements.test.js';
```

After:

```js
import './sim/achievements.test.js';
import './sim/daily.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sim daily"`
Expected: the page cannot load, because `src/data/daily.js` and `src/sim/daily.js` do not exist yet:

```
LOAD ERROR
TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:<port>/tests/all.js
```

- [ ] **Step 3: Implement**

Create `src/data/daily.js`:

```js
// Daily goals (spec 3.7): three small goals per local day once the opening chain is done, each finishable in
// about five minutes. No streaks, no day counts, nothing missed. Measures are declarative and count from a
// snapshot taken when the day is drawn (src/sim/daily.js). The words live in src/ui/text.js (DAILY_TEXT).
export const DAILY_COUNT = 3;
export const DAILY_REWARD = 25;
export const DAILY_AFTER = 'temple';            // daily goals open once this goal is complete

// measure kinds: homes (housing plots), roads (tiles beyond the start road), buildings (of a type),
// people (the population now), tally (a running tally in world.tally).
export const DAILY_POOL = [
  { id: 'plots4', measure: { kind: 'homes' }, n: 4 },
  { id: 'roads10', measure: { kind: 'roads' }, n: 10 },
  { id: 'upgrades3', measure: { kind: 'tally', key: 'upgrades' }, n: 3 },
  { id: 'well1', measure: { kind: 'buildings', type: 'well' }, n: 1 },
  { id: 'bazaar1', measure: { kind: 'buildings', type: 'bazaar' }, n: 1 },
  { id: 'temple1', measure: { kind: 'buildings', type: 'temple' }, n: 1 },
  { id: 'farm1', measure: { kind: 'buildings', type: 'farm_grain' }, n: 1 },
  { id: 'people20', measure: { kind: 'people' }, n: 20 },
  { id: 'profit1', measure: { kind: 'tally', key: 'profitMonths' }, n: 1 },
  { id: 'harvest100', measure: { kind: 'tally', key: 'harvested' }, n: 100 },
];
```

Create `src/sim/daily.js`:

```js
// Daily goals (spec 3.7): three small goals per local day, seeded by the date and the city's seed, counted
// from a snapshot taken when the day is drawn. The sim never reads a clock: the interface passes the local
// date as a 'YYYY-MM-DD' key. No streaks: a new key simply replaces yesterday's goals. Data in src/data/daily.js.
import { DAILY_POOL, DAILY_COUNT, DAILY_REWARD, DAILY_AFTER } from '../data/daily.js';
import { housesOf, population } from './world.js';
import { isUnlocked } from './progression.js';
import { createRng, hash2 } from './rng.js';
import { roadsLaid, countType } from './achievements.js';

const defOf = (id) => DAILY_POOL.find((d) => d.id === id) || null;
const isAvailable = (world, def) => !def.measure.type || isUnlocked(world, def.measure.type);

export const dailyAvailable = (world) => world.goals.completed.includes(DAILY_AFTER);

// The number a pool entry counts, as it stands now. def is a DAILY_POOL entry.
export function dailyMeasure(world, def) {
  const m = def.measure || def;
  switch (m.kind) {
    case 'homes': return housesOf(world).length;
    case 'roads': return roadsLaid(world);
    case 'buildings': return countType(world, m.type);
    case 'people': return population(world);
    case 'tally': return world.tally[m.key] || 0;
    default: return 0;
  }
}

// FNV-1a over the key's characters: the same 32-bit number for the same date on every device.
export function hashKey(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Every available pool id in this day's order: a Fisher-Yates shuffle seeded by the date and the city.
// The first DAILY_COUNT are the day's goals; the swap takes the next one not already picked.
export function dailyOrder(world, dateKey) {
  const ids = DAILY_POOL.filter((d) => isAvailable(world, d)).map((d) => d.id);
  const rng = createRng(Math.floor(hash2(hashKey(dateKey), world.seed, 0) * 4294967296));
  for (let i = ids.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export const pickDaily = (world, dateKey) => dailyOrder(world, dateKey).slice(0, DAILY_COUNT);

// Draws the goals for dateKey. true when it drew a new day; false when daily goals are not open yet, the
// key is not a string, or this date is already drawn (so calling it on every check is safe).
export function startDaily(world, dateKey) {
  if (typeof dateKey !== 'string' || !dateKey || !dailyAvailable(world)) return false;
  if (world.daily && world.daily.date === dateKey) return false;
  const picks = pickDaily(world, dateKey);
  const base = {};
  for (const id of picks) base[id] = dailyMeasure(world, defOf(id));
  world.daily = { date: dateKey, picks, base, done: [], swapped: false };
  return true;
}

// { n, of } for one of today's picks: the gain since the snapshot, clamped to 0..of; a done pick stays full.
// null when there is no day or id is not one of its picks.
export function dailyProgress(world, id) {
  const day = world.daily;
  const def = defOf(id);
  if (!day || !def || !day.picks.includes(id)) return null;
  if (day.done.includes(id)) return { n: def.n, of: def.n };
  const base = Number.isFinite(day.base[id]) ? day.base[id] : dailyMeasure(world, def);
  return { n: Math.max(0, Math.min(def.n, dailyMeasure(world, def) - base)), of: def.n };
}

// Records each pick that has reached its target, pays DAILY_REWARD and counts it in tally.dailyDone.
// Returns the ids recorded by this call.
export function checkDaily(world, events = null) {
  const day = world.daily;
  if (!day) return [];
  const added = [];
  for (const id of day.picks) {
    if (day.done.includes(id)) continue;
    const p = dailyProgress(world, id);
    if (!p || p.n < p.of) continue;
    day.done.push(id);
    world.gold += DAILY_REWARD;
    world.tally.dailyDone += 1;
    added.push(id);
    if (events) events.push({ type: 'daily', id, reward: DAILY_REWARD });
  }
  return added;
}

// The one free swap a day: replaces an unfinished pick with the next id in the day's order that is not
// already picked, snapshotting its measure now.
export function swapDaily(world, index) {
  const day = world.daily;
  const fail = { ok: false, reason: 'no_swap' };
  if (!day || day.swapped || !Number.isInteger(index) || index < 0 || index >= day.picks.length) return fail;
  const old = day.picks[index];
  if (day.done.includes(old)) return fail;
  const id = dailyOrder(world, day.date).find((x) => !day.picks.includes(x));
  if (!id) return fail;
  day.picks[index] = id;
  delete day.base[old];
  day.base[id] = dailyMeasure(world, defOf(id));
  day.swapped = true;
  return { ok: true, id };
}
```

Modify `src/sim/clock.js` with two edits. Both anchors are lines Task 3 wrote.

Edit 1: the imports.

Before:

```js
import { checkAchievements } from './achievements.js';
```

After:

```js
import { checkAchievements } from './achievements.js';
import { checkDaily } from './daily.js';
```

Edit 2: the end of `tickDay`.

Before:

```js
  checkFirsts(world, events);
}
```

After:

```js
  checkFirsts(world, events);
  if (world.daily) checkDaily(world, events);
}
```

Modify `src/sim/settle.js` with two edits. Both anchors are lines Task 3 wrote. Also delete any placeholder comment Task 2 left there for Task 4.

Edit 1: the imports.

Before:

```js
import { checkAchievements } from './achievements.js';
```

After:

```js
import { checkAchievements } from './achievements.js';
import { checkDaily } from './daily.js';
```

Edit 2: inside `settle`.

Before:

```js
  checkAchievements(world, events);
```

After:

```js
  checkAchievements(world, events);
  checkDaily(world, events);
```

`settle` now reads (plus anything else Task 2 put in it):

```js
export function settle(world, events = null) {
  settleGoals(world, events);
  checkFirsts(world, events);
  checkAchievements(world, events);
  checkDaily(world, events);
  return events;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sim daily"`
Expected: `10 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

None. `world.daily` stays `null` until something calls `startDaily`, and nothing does until Task 12 wires it into the interface. `tickDay` skips `checkDaily` when there is no day, and `settle`'s `checkDaily` returns at once for `null`. No existing fixture draws a day, so no gold or event list changes. This was verified by running the whole suite with stand-ins for Tasks 1 and 2: Tasks 3 and 4 together changed exactly one test, the createUI one fixed in Task 3.

- [ ] **Step 6: Full suite**

Run: `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1` (two new files under `src/`)
Then: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ALL PASSED`, with 10 more tests than after Task 3.

- [ ] **Step 7: Commit**

```powershell
git add src/data/daily.js src/sim/daily.js src/sim/clock.js src/sim/settle.js tests/sim/daily.test.js tests/all.js sw-files.js
git commit -m @'
Add streak-free daily goals to the sim

Three small goals a day once the temple goal is done, drawn from the
date key and the city seed, counted from a snapshot taken when the day
is drawn, 25 gold each, one free swap and a lifetime count. The sim never
reads a clock: the interface passes the date key.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

NOTE FOR LATER TASKS: After Task 9, every category control carries `data-category="<id>"`: dock `.cat`, rail `.cat`, panel `.tab`. Cards keep `data-item="<item>"`. Task 13's `.suggested` on "the category button" can select on these. `problemMarkers()` returns `{ id, x, y, lift, kind }`, where `lift` is in art px.

Scope note (not a contract problem): Task 5 also changes how `bakeChunk` cuts a chunk to its diamond. It now draws everything, then applies one `destination-in` mask, instead of clipping every layer. Clipping blends each layer's partial edge coverage into the layers below it, which leaves a 1 px pale line along every chunk border. The line was already there (+6 levels on the old pale fertile land) but on dark loam it rises to +14, a visible stripe across farmland every 16 tiles. The chunk signature, the cache and the 1.5 px dilation stay the same. A test pins the fix.

All code below was checked mechanically. Every replace/with block and new file in this document was applied to a scratch copy of `early-game-pass` at `f013881` (Tasks 1-4 landed, 492 tests), and the full suite ended `ALL PASSED` after each task: 499, 507, 514. On a scratch copy, each task's new tests also fail before its Step 3 and pass after it. Task 5's block (4) leaves one blank line after `fertileSpeckle`, which is intended.

---

### Task 5: Calm, readable land

**Files:**
- Modify: `src/render/art/palette.js` (TERRAIN)
- Modify: `src/render/terrainBaker.js` (blotch alpha, fertile speckles and tufts in place of the offset pass, chunk cut as one mask)
- Modify: `src/render/terrainWater.js` (shallows strip)
- Modify: `src/render/renderer.js` (off-map fill, map-edge fade band)
- Create: `tests/render/terrainLook.test.js`
- Modify: `tests/render/renderer.test.js` (one assertion), `tests/all.js`
- Regenerated: `sw-files.js`

**Interfaces:**
- Consumes: `TERRAIN` and the drawing helpers (`makeDraw`, `p`, `hash2`), `riverBanks`/`bandPath` inside `terrainWater.js`, `createRenderer().renderFrame`.
- Produces (contract): `TERRAIN.offMap = '#C8AE7C'`, `TERRAIN.edgeFade = '#A08458'`, `TERRAIN.fertileSpeck = '#6E5234'`, `TERRAIN.fertileTuft = '#5E8E32'`, `TERRAIN.shallows = '#4DB6AE'`. Changed values: `fertile '#A8885C'`, `fertileSoft '#BC9C6E'`, `fertileSecond '#AE8C5E'`, `grass '#86B04A'`, `grassSoft '#B3C272'`, `grassSecond '#74A03E'`, `sandOff '#C8AE7C'` (alias of `offMap`), and `blotches` (closer shades).
- Produces (new exports, additive): `BLOTCH_ALPHA = 0.22`, `FERTILE_SPECKS = 6`, `FERTILE_TUFT_SHARE = 0.45` from `terrainBaker.js`; `SHALLOWS_TILES = 0.25` from `terrainWater.js`; `EDGE_FADE` and `drawMapEdge(g, size)` from `renderer.js`. The chunk signature and the baker cache are unchanged.

Colour choices, one line each:
- `shallows #4DB6AE`: a turquoise midway between `water #2E8C96` and `waterLight #86CBC4`, so the bank steps channel → shallows → light edge → foam without a new hue (it echoes the mock-up's pool `#4FB3B5`).
- `edgeFade #A08458`: a deeper umber of the off-map sand's own hue, so the band reads as the map slab's soft shadow line, not a new colour.
- `fertileSpeck #6E5234`: the loam's hue about a third darker (next to the bank's `mudDark`), so speckles read as clods. `fertileSecond #AE8C5E` (light crumbs) sits between the loam and its soft edge. `fertileTuft #5E8E32` is a muted leaf green darker than the meadow, so tufts read as weeds on loam, not as meadow.
- `grassSoft #B3C272` sits halfway from meadow to sand, nudged green so the feathered edge still reads green. `grassSecond #74A03E` is a darker saturated green for the clumps.
- `blotches`: all five sit within 3.2% HSL lightness of the sand. At alpha 0.22 they vary the ground by under 1%.

- [ ] **Step 1: Write the failing tests**

Create `tests/render/terrainLook.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { TERRAIN } from '../../src/render/art/palette.js';
import { bakeChunk, createTerrainBaker, BLOTCH_ALPHA, CHUNK } from '../../src/render/terrainBaker.js';
import { drawRiver, SHALLOWS_TILES } from '../../src/render/terrainWater.js';
import { createRenderer, EDGE_FADE } from '../../src/render/renderer.js';
import { createCamera } from '../../src/render/camera.js';
import { createSpriteCache } from '../../src/render/spriteCache.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { p, artToTile } from '../../src/render/iso.js';
import { T } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt, hexToRgb, nearColour } from '../helpers/canvas.js';

// WCAG relative luminance on the 0-1 scale, and HSL lightness.
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const lightness = ([r, g, b]) => (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Every device pixel of a baked chunk whose tile point lies inside one of `tiles`, kept `margin` tiles in
// from the tile's edges (so the soft blend edge is left out), as [r, g, b].
function tilePixels(sprite, tiles, margin = 0.12) {
  const o = p(sprite.cx * CHUNK, sprite.cy * CHUNK);
  const { width } = sprite.canvas;
  const data = sprite.canvas.getContext('2d').getImageData(0, 0, width, sprite.canvas.height).data;
  const dev = (ax, ay) => [sprite.ax + (ax - o[0]) * sprite.scale, sprite.ay + (ay - o[1]) * sprite.scale];
  const out = [];
  for (const [tx, ty] of tiles) {
    const [x0] = dev(...p(tx, ty + 1)), [x1] = dev(...p(tx + 1, ty));
    const [, y0] = dev(...p(tx, ty)), [, y1] = dev(...p(tx + 1, ty + 1));
    for (let dy = Math.floor(y0); dy <= y1; dy++) {
      for (let dx = Math.floor(x0); dx <= x1; dx++) {
        const t = artToTile(o[0] + (dx - sprite.ax) / sprite.scale, o[1] + (dy - sprite.ay) / sprite.scale);
        if (t.x < tx + margin || t.x > tx + 1 - margin || t.y < ty + margin || t.y > ty + 1 - margin) continue;
        const k = (dy * width + dx) * 4;
        out.push([data[k], data[k + 1], data[k + 2]]);
      }
    }
  }
  return out;
}

const block = (x0, x1, y0, y1) => { const out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]); return out; };

describe('terrain look', () => {
  it('paints fertile land as dark loam that reads against sand at a glance', () => {
    expect(TERRAIN.fertile).toBe('#A8885C');
    expect(TERRAIN.fertileSoft).toBe('#BC9C6E');
    const sand = luminance(hexToRgb(TERRAIN.sand)), loam = luminance(hexToRgb(TERRAIN.fertile)), soft = luminance(hexToRgb(TERRAIN.fertileSoft));
    expect(sand - loam).toBeGreaterThanOrEqual(0.12);
    expect(soft).toBeGreaterThan(loam);                       // the soft edge feathers loam towards sand
    expect(soft).toBeLessThan(sand);
    expect(luminance(hexToRgb(TERRAIN.fertileSpeck))).toBeLessThan(loam);
    for (const key of ['offMap', 'edgeFade', 'fertileSpeck', 'fertileTuft', 'shallows']) expect(typeof TERRAIN[key]).toBe('string');
  });
  it('makes the meadow a saturated green and the ground past the map a darker, quieter sand', () => {
    expect(TERRAIN.grass).toBe('#86B04A');
    const greenness = (hex) => { const [r, g] = hexToRgb(hex); return g - r; };
    expect(greenness(TERRAIN.grass)).toBeGreaterThan(30);
    expect(greenness(TERRAIN.grass)).toBeGreaterThan(greenness(TERRAIN.sand));
    expect(greenness(TERRAIN.grassSecond)).toBeGreaterThan(greenness(TERRAIN.grassSoft));
    expect(TERRAIN.offMap).toBe('#C8AE7C');
    expect(TERRAIN.sandOff).toBe(TERRAIN.offMap);
    expect(luminance(hexToRgb(TERRAIN.offMap))).toBeLessThan(luminance(hexToRgb(TERRAIN.sand)));
    expect(luminance(hexToRgb(TERRAIN.edgeFade))).toBeLessThan(luminance(hexToRgb(TERRAIN.offMap)));
  });
  it('keeps the sand blotches faint and within a narrow lightness band', () => {
    expect(BLOTCH_ALPHA).toBeLessThanOrEqual(0.25);
    const sand = lightness(hexToRgb(TERRAIN.sand));
    for (const hex of TERRAIN.blotches) expect(Math.abs(lightness(hexToRgb(hex)) - sand)).toBeLessThanOrEqual(0.04);
  });
  it('bakes fertile tiles much darker than sand, textured with speckles and tufts', () => {
    const s = bakeChunk(riverWorld(), 0, 1, 2);
    const loam = tilePixels(s, block(7, 9, 18, 22));              // fertile, free, away from the bank and the meadow
    const sand = tilePixels(s, block(12, 14, 26, 28));            // open desert
    expect(loam.length).toBeGreaterThan(1000);
    expect(mean(sand.map(luminance)) - mean(loam.map(luminance))).toBeGreaterThanOrEqual(0.12);
    const main = luminance(hexToRgb(TERRAIN.fertile));
    const specks = loam.filter((c) => luminance(c) < main - 0.05).length;
    const tufts = loam.filter(([r, g, b]) => g > r + 8 && g > b + 30).length;
    expect(specks).toBeGreaterThan(10);
    expect(tufts).toBeGreaterThan(3);
  });
  it('lays a turquoise shallows strip inside each bank, between the foam line and the channel', () => {
    const w = makeTestWorld({ size: 24, fertile: [] });
    for (let y = 0; y < 24; y++) for (let x = 10; x <= 13; x++) w.terrain[idx(24, x, y)] = T.WATER;   // a straight river four tiles wide
    const c = makeCanvas(600, 500);
    const ctx = c.getContext('2d');
    const ox = 100, oy = -150, k = 2;
    ctx.translate(ox, oy);
    drawRiver(makeDraw(ctx, k), w, { x0: 0, y0: 0, x1: 23, y1: 23 });
    const at = (tx, ty) => pixelAt(c, ox + p(tx, ty)[0] * k, oy + p(tx, ty)[1] * k);
    const wobble = (y) => Math.sin(y * 1.3) * 0.12 + Math.sin(y * 0.47) * 0.18;   // terrainWater's bank wobble
    let shallows = 0, channel = 0, rows = 0;
    for (let y = 3; y <= 12; y++) {
      const bank = 10 - 0.05 + wobble(y);                         // the left bank curve at this row's centre
      rows++;
      if (nearColour(at(bank + SHALLOWS_TILES * 0.68, y + 0.5), TERRAIN.shallows, 30)) shallows++;
      if (nearColour(at(bank + SHALLOWS_TILES * 2, y + 0.5), TERRAIN.water, 30)) channel++;
    }
    expect(shallows).toBeGreaterThanOrEqual(Math.ceil(rows * 0.6));
    expect(channel).toBeGreaterThanOrEqual(Math.ceil(rows * 0.6));
  });
  it('cuts a chunk to its diamond without paling its edge pixels, so no line shows along chunk borders', () => {
    const w = makeTestWorld({ size: 32, fertile: [[0, 0, 32, 32]] });   // loam everywhere
    const s = bakeChunk(w, 0, 0, 2);
    const d = s.canvas.getContext('2d').getImageData(0, 0, s.canvas.width, s.canvas.height).data;
    const edge = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 64 && d[i + 3] <= 250) edge.push([d[i], d[i + 1], d[i + 2]]);
    expect(edge.length).toBeGreaterThan(100);
    // A clip on every layer blended the sand beneath into these partly covered pixels (about 20 levels paler).
    expect(Math.abs(mean(edge.map((c) => c[0])) - hexToRgb(TERRAIN.fertile)[0])).toBeLessThan(12);
  });
  it('fills past the map with the off-map sand and fades the map edge into it', () => {
    const w = riverWorld();
    const canvas = makeCanvas(400, 300);
    const renderer = createRenderer({ canvas, dpr: 1, spriteCache: createSpriteCache(), baker: createTerrainBaker(), maxBakesPerFrame: Infinity });
    // Camera centre p(21, 33) = art (-192, 432). At that art y the map's bottom-left edge (y = 32) is at tile
    // x 22, art x -160: screen (264, 150). The map lies to the right of it.
    renderer.renderFrame(w, createCamera({ x: 21, y: 33, zoom: 1 }), { view: { width: 400, height: 300 } });
    const far = pixelAt(canvas, 20, 150);                          // nearly four tiles off the map
    const edge = pixelAt(canvas, 258, 150);                        // 3 art px outside the edge
    const inside = pixelAt(canvas, 300, 150);                      // sand on the map
    expect(nearColour(far, TERRAIN.offMap, 3)).toBe(true);
    expect(nearColour(edge, TERRAIN.offMap, 6)).toBe(false);
    expect(edge[0] + edge[1] + edge[2]).toBeLessThan(far[0] + far[1] + far[2]);
    expect(nearColour(inside, TERRAIN.offMap, 6)).toBe(false);
    expect(EDGE_FADE.length).toBeGreaterThan(1);
  });
});
```

In `tests/all.js`, after `import './render/terrainBaker.test.js';`, add:

```js
import './render/terrainLook.test.js';
```

All pixel coordinates above are device pixels at scale 2 (`bakeChunk(..., 2)` and `makeDraw(ctx, 2)`) or at zoom 1 and dpr 1 in the renderer (sprite bucket 1, so one art px is two device px).

- [ ] **Step 2: Run them to see them fail**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "terrain look"
```

Expected: the page fails to load, so nothing runs:

```
LOAD ERROR
SyntaxError: The requested module '../../src/render/terrainBaker.js' does not provide an export named 'BLOTCH_ALPHA'
```

- [ ] **Step 3: Implement**

**3a. `src/render/art/palette.js`.** Replace:

```js
export const TERRAIN = {
  sand: '#EBD6A8', sandOff: '#DCC594',
  blotches: ['#E2C995', '#F1E0B8', '#E6CFA0', '#F4E6C4', '#DDC28C'],
  dotLight: '#F8ECCF', dotDark: '#D4B987',
  grass: '#8FB64C', grassAlt: '#86AE45', grassSoft: '#C9C27E', grassSecond: '#7EA846',
  fertile: '#D9BE86', fertileSecond: '#CBAE74', fertileSoft: '#E6D2A0',
  bank: '#B9A978', bankSecond: '#C9B98A', mud: '#7A5E40', mudDark: '#5E4630',
  rocky: '#D3B582', rockySecond: '#C4A574', rockySoft: '#E0C898', pebble: '#B39C82', pebbleLight: '#D9C7A8',
  water: '#2E8C96', waterDeep: '#1E6A7C', waterLight: '#86CBC4', foam: '#DDF4F1', ripple: '#B8E6E2',
```

with:

```js
// Terrain (early-game pass 2.1): calm sand whose blotches stay within about 3% lightness of it; fertile land as
// dark river loam with speckles and tufts; a saturated meadow; turquoise shallows along the river bank; and a
// darker, quieter sand past the map edge, with a soft umber band along the edge itself.
export const TERRAIN = {
  sand: '#EBD6A8', offMap: '#C8AE7C', sandOff: '#C8AE7C', edgeFade: '#A08458',   // sandOff is kept as an alias of offMap
  blotches: ['#E7D1A2', '#EFDBB0', '#E9D3A4', '#EEDAAE', '#E5CF9E'],
  dotLight: '#F8ECCF', dotDark: '#D4B987',
  grass: '#86B04A', grassAlt: '#86AE45', grassSoft: '#B3C272', grassSecond: '#74A03E',
  fertile: '#A8885C', fertileSecond: '#AE8C5E', fertileSoft: '#BC9C6E', fertileSpeck: '#6E5234', fertileTuft: '#5E8E32',
  bank: '#B9A978', bankSecond: '#C9B98A', mud: '#7A5E40', mudDark: '#5E4630',
  rocky: '#D3B582', rockySecond: '#C4A574', rockySoft: '#E0C898', pebble: '#B39C82', pebbleLight: '#D9C7A8',
  water: '#2E8C96', waterDeep: '#1E6A7C', waterLight: '#86CBC4', shallows: '#4DB6AE', foam: '#DDF4F1', ripple: '#B8E6E2',
```

(The `road`, `plot`, `field` lines and the closing `};` are unchanged.)

**3b. `src/render/terrainBaker.js`.** Seven replacements.

(1) Replace:

```js
import { TERRAIN } from './art/palette.js';
```

with:

```js
import { TERRAIN, LEAF2 } from './art/palette.js';
```

(2) Replace:

```js
export const BLEND = 0.33;        // edges wander by about a third of a tile
```

with:

```js
export const BLEND = 0.33;        // edges wander by about a third of a tile
export const BLOTCH_ALPHA = 0.22; // calm sand (early-game pass 2.1): faint blotches in shades close to the sand
export const FERTILE_SPECKS = 6;  // loam speckles per fertile tile; every third is a light crumb
export const FERTILE_TUFT_SHARE = 0.45; // share of fertile tiles that carry two small green tufts
```

(3) Replace:

```js
// One terrain layer in three passes: a soft, slightly larger pass in a paler tone; the main fill; and a
// second tone offset by (3, 2) art px on about 60% of tiles for texture. All tiles of the layer go into
// one path per pass, so overlapping blobs union instead of stacking alpha.
function drawLayer(g, world, range, code, style) {
  const passes = [
    { expand: 0.2, fill: style.soft, alpha: 0.5, dx: 0, dy: 0, salt: 1, pick: () => true },
    { expand: 0, fill: style.main, alpha: 1, dx: 0, dy: 0, salt: 1, pick: () => true },
    { expand: -0.05, fill: style.second, alpha: 0.55, dx: 3, dy: 2, salt: 2, pick: (x, y) => hash2(x, y, world.seed + 9) < 0.6 },
  ];
```

with:

```js
// One terrain layer in up to three passes: a soft, slightly larger pass in a paler tone; the main fill; and,
// when the style has a `second` tone, that tone offset by (3, 2) art px on about 60% of tiles for clumpy
// texture. All tiles of the layer go into one path per pass, so overlapping blobs union instead of stacking alpha.
function drawLayer(g, world, range, code, style) {
  const passes = [
    { expand: 0.2, fill: style.soft, alpha: 0.5, dx: 0, dy: 0, salt: 1, pick: () => true },
    { expand: 0, fill: style.main, alpha: 1, dx: 0, dy: 0, salt: 1, pick: () => true },
  ];
  if (style.second) passes.push({ expand: -0.05, fill: style.second, alpha: 0.55, dx: 3, dy: 2, salt: 2, pick: (x, y) => hash2(x, y, world.seed + 9) < 0.6 });
```

(4) Replace:

```js
const isFree = (world, i) => !world.occ[i] && !world.road[i];
```

with:

```js
const isFree = (world, i) => !world.occ[i] && !world.road[i];

// Fertile land's texture in place of an offset second tone (which drew stair-steps along the blend): dark
// loam speckles, a few light crumbs and, on some tiles, small green tufts. Positions hang off the tile, so
// neighbouring chunks draw the same ones at a border.
function fertileSpeckle(g, world, x, y) {
  for (let j = 0; j < FERTILE_SPECKS; j++) {
    const q = p(x + hash2(x, y, 110 + j), y + hash2(x, y, 120 + j));
    if (j % 3 === 2) g.circ(q, 0.6, TERRAIN.fertileSecond, { alpha: 0.7 });
    else g.circ(q, 0.5 + hash2(x, y, 130 + j) * 0.4, TERRAIN.fertileSpeck, { alpha: 0.55 });
  }
  if (hash2(x, y, world.seed + 140) >= FERTILE_TUFT_SHARE) return;
  for (let j = 0; j < 2; j++) {
    const q = p(x + 0.15 + hash2(x, y, 150 + j) * 0.7, y + 0.15 + hash2(x, y, 160 + j) * 0.7);
    g.line(q, [q[0] - 0.7, q[1] - 2.6], TERRAIN.fertileTuft, 0.7);
    g.line(q, [q[0] + 0.5, q[1] - 3], LEAF2, 0.6);
    g.line(q, [q[0] + 1.2, q[1] - 1.9], TERRAIN.fertileTuft, 0.6);
  }
}

```

(5) Replace:

```js
// Sand everywhere, pale blotches and dots, then the blended layers, then the scatter that sells the blend:
// tufts across meadow borders, pebbles across rocky borders, mud on the banks, rocks, scrub and dunes.
```

with:

```js
// Sand everywhere, faint blotches and dots, then the blended layers, then the scatter that sells the blend:
// loam speckles on fertile land, tufts across meadow borders, pebbles across rocky borders, mud on the banks,
// rocks, scrub and dunes.
```

and in the same function replace:

```js
      g.ell(q, rx, rx * 0.45, TERRAIN.blotches[Math.abs(gx * 7 + gy * 13) % 5], { alpha: 0.5 });
```

with:

```js
      g.ell(q, rx, rx * 0.45, TERRAIN.blotches[Math.abs(gx * 7 + gy * 13) % 5], { alpha: BLOTCH_ALPHA });
```

(6) Replace:

```js
  drawLayer(g, world, range, T.FERTILE, { soft: TERRAIN.fertileSoft, main: TERRAIN.fertile, second: TERRAIN.fertileSecond });
```

with:

```js
  drawLayer(g, world, range, T.FERTILE, { soft: TERRAIN.fertileSoft, main: TERRAIN.fertile, second: null });
```

and replace:

```js
    if (t === T.MEADOW) tufts(g, x, y, 9, 0);
```

with:

```js
    if (t === T.FERTILE) fertileSpeckle(g, world, x, y);
    if (t === T.MEADOW) tufts(g, x, y, 9, 0);
```

(The meadow, rocky and bank layers keep their offset `second` pass. The meadow's darker `grassSecond` clumps are its "clumpy" texture.)

(7) In `bakeChunk`, replace:

```js
  const range = { x0: ox - 2, y0: oy - 2, x1: ox + CHUNK + 1, y1: oy + CHUNK + 1 };
  g.save();
  // Dilate the clip by about one device pixel so anti-aliased diamond edges leave no hairline seam; both
  // chunks draw identical content in the overlap, so the overdraw is harmless.
  const e = 1.5 / scale;
  const mid = p(ox + CHUNK / 2, oy + CHUNK / 2);
  g.clip([p(ox, oy), p(ox + CHUNK, oy), p(ox + CHUNK, oy + CHUNK), p(ox, oy + CHUNK)].map((v) => {
    const dx = v[0] - mid[0], dy = v[1] - mid[1], len = Math.hypot(dx, dy) || 1;
    return [v[0] + dx / len * e, v[1] + dy / len * e];
  }));
  drawGround(g, world, range);
  drawRiver(g, world, range);
  drawPlots(g, world, range);
  drawRoads(g, world, range);
  g.restore();
  return { canvas, ax, ay, scale, cx, cy };
```

with:

```js
  const range = { x0: ox - 2, y0: oy - 2, x1: ox + CHUNK + 1, y1: oy + CHUNK + 1 };
  drawGround(g, world, range);
  drawRiver(g, world, range);
  drawPlots(g, world, range);
  drawRoads(g, world, range);
  // Cut the chunk to its diamond, dilated by about one device pixel so anti-aliased edges leave no hairline
  // gap; both chunks draw identical content in the overlap, so the overdraw is harmless. The cut is one mask
  // at the end rather than a clip on every layer: a clip blends each layer's partial edge coverage into the
  // layers beneath, so the edge pixels came out paler than the ground and drew a line along chunk borders on
  // dark loam (early-game pass 2.1).
  const e = 1.5 / scale;
  const mid = p(ox + CHUNK / 2, oy + CHUNK / 2);
  g.save();
  ctx.globalCompositeOperation = 'destination-in';
  g.poly([p(ox, oy), p(ox + CHUNK, oy), p(ox + CHUNK, oy + CHUNK), p(ox, oy + CHUNK)].map((v) => {
    const dx = v[0] - mid[0], dy = v[1] - mid[1], len = Math.hypot(dx, dy) || 1;
    return [v[0] + dx / len * e, v[1] + dy / len * e];
  }), '#000000');
  g.restore();
  return { canvas, ax, ay, scale, cx, cy };
```

**3c. `src/render/terrainWater.js`.** Three replacements.

Replace the header:

```js
// The river as one smooth band (spec 5.2): wet-sand fringe, water with a deep centre and light shallows,
// a foam line, ripples and reeds. Mapgen gives one contiguous span of WATER per row, so the banks are
// curves through the row spans with the mock-up's gentle sine wobble.
```

with:

```js
// The river as one smooth band (spec 5.2): wet-sand fringe, a turquoise shallows strip about a quarter tile
// wide inside each bank (early-game pass 2.1), water with a deep centre, a light edge and a foam line,
// ripples and reeds. Mapgen gives one contiguous span of WATER per row, so the banks are curves through the
// row spans with the mock-up's gentle sine wobble.
```

Replace:

```js
const spanCache = new WeakMap(); // world -> { spans, minWidth }; terrain never changes in Stage 1
```

with:

```js
const spanCache = new WeakMap(); // world -> { spans, minWidth }; terrain never changes in Stage 1
export const SHALLOWS_TILES = 0.25; // the shallows strip's width inside each bank, in tiles (a quarter tile across on screen)
```

In `drawRiver`, replace:

```js
  g.path(bandPath(left, right, 0), TERRAIN.water);
```

with:

```js
  g.path(bandPath(left, right, 0), TERRAIN.shallows);                 // the whole river, then the channel over it,
  g.path(bandPath(left, right, -SHALLOWS_TILES), TERRAIN.water);      // leaves the shallows strip along each bank
```

(`bandPath` with a negative grow moves both banks inward by a quarter tile. That is 8 art px across on screen, a quarter of a tile's width. The deep stroke, the light edge and the foam line still draw on top in the same order.)

**3d. `src/render/renderer.js`.** Three replacements.

Replace:

```js
const intersects = (b, r) => b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0;
```

with:

```js
// The map edge (early-game pass 2.1): strokes along the map diamond, widest and faintest first, drawn under
// the terrain chunks so only their outer halves show: a soft band that fades from the edge into the
// off-map sand, so the edge reads as a border rather than a flat triangle. [width in art px, alpha].
export const EDGE_FADE = [[24, 0.1], [14, 0.14], [7, 0.2], [2.5, 0.3]];

export function drawMapEdge(g, size) {
  const pts = [p(0, 0), p(size, 0), p(size, size), p(0, size)];
  for (const [width, alpha] of EDGE_FADE) g.poly(pts, 'none', { stroke: TERRAIN.edgeFade, strokeWidth: width, strokeAlpha: alpha });
}

const intersects = (b, r) => b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0;
```

In `renderFrame`, replace:

```js
    ctx.fillStyle = TERRAIN.sandOff;
    ctx.fillRect(0, 0, W, H);
    const zoom = cam.zoom;
    const range = visibleTileRange(cam, view, world.size);
    const toDevice = (ax, ay) => { const [sx, sy] = artToScreen(cam, view, ax, ay); return [sx * dpr, sy * dpr]; };
```

with:

```js
    ctx.fillStyle = TERRAIN.offMap;
    ctx.fillRect(0, 0, W, H);
    const zoom = cam.zoom;
    const range = visibleTileRange(cam, view, world.size);
    const toDevice = (ax, ay) => { const [sx, sy] = artToScreen(cam, view, ax, ay); return [sx * dpr, sy * dpr]; };
    const [ox, oy] = toDevice(0, 0);
    const g = makeDraw(ctx, ART_SCALE * zoom * dpr);

    // 0. The map edge band, in art px with the art origin placed by the camera; the chunks cover its inner half.
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    drawMapEdge(g, world.size);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
```

and replace (the two lines move up, so pass 2 no longer declares them):

```js
    // 2. Ground shadows, drawn in art px with the art origin placed by the camera.
    const [ox, oy] = toDevice(0, 0);
    const g = makeDraw(ctx, ART_SCALE * zoom * dpr);
    const objects = collectObjects(world, range, opts.walkers || [], registry);
```

with:

```js
    // 2. Ground shadows, drawn in art px with the art origin placed by the camera.
    const objects = collectObjects(world, range, opts.walkers || [], registry);
```

- [ ] **Step 4: Run the tests to see them pass**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "terrain look"
```

Expected: `7 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

Search: `git grep -n -e sandOff -e "TERRAIN\.\(fertile\|grass\|sand\)" -e blotches -- tests` (or the Grep tool over `tests/` for `sandOff|TERRAIN\.(fertile|grass|sand)|blotches`).

- `tests/render/renderer.test.js` (the 'sizes the canvas for dpr 2' test) checks that the centre pixel is not the off-map fill. It still passes, because `sandOff` now equals `offMap`, but point it at the colour the renderer actually fills with. Replace:

  ```js
      expect(nearColour(pixelAt(canvas, 200, 150), TERRAIN.sandOff, 4)).toBe(false);
  ```

  with:

  ```js
      expect(nearColour(pixelAt(canvas, 200, 150), TERRAIN.offMap, 4)).toBe(false);
  ```

- Nothing else needs a change:
  - `tests/render/terrainBaker.test.js` checks sand near `TERRAIN.sand` within 45 (the sand colour is unchanged; the blotches are fainter) and the meadow's `g > r` (still true for `#86B04A`).
  - `tests/ui/minimap.test.js` checks the meadow's `g > r` (still true).
  - `tests/render/followups.test.js` pins `TERRAIN.plot`, which is unchanged.
  - The chunk-cache tests in `terrainBaker.test.js` and `followups.test.js` still pass, because the signature and cache are untouched.

Run `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "renderer"`. Expected: `ALL PASSED`.

- [ ] **Step 6: Visual check**

Run from `C:\dev\thebes` (the raw folder is gitignored):

```powershell
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7&sample=1' -Out docs/superpowers/notes/screenshots/raw/t05-land-1280.png -Width 1280 -Height 800
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7&sample=1' -Out docs/superpowers/notes/screenshots/raw/t05-land-390.png -Width 390 -Height 844
```

What to look for at 1280x800:
- The fertile band between the river and the city is dark chocolate loam with small dark speckles, a few pale crumbs and scattered green tufts. Its edge feathers through a paler loam into the sand.
- No straight pale line runs across the loam (chunk borders are every 16 tiles).
- The sand is calm, with barely visible blotches.
- Each river bank has a turquoise strip, about a quarter tile wide, between the white foam line and the teal channel.
- The bottom-left triangle past the map is a darker, quieter sand. A soft darker band hugs the map's edge and fades out within about half a tile.

At 390x844: the farmland reads as farmland at a glance, a dark field against calm sand. If you go from Git Bash instead of PowerShell, prefix with `MSYS_NO_PATHCONV=1` and keep `-Out` relative or `C:/...`, never `/c/...`.

- [ ] **Step 7: Full suite**

```powershell
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED` (7 more tests than before this task).

- [ ] **Step 8: Commit**

```powershell
git add src/render/art/palette.js src/render/terrainBaker.js src/render/terrainWater.js src/render/renderer.js tests/render/terrainLook.test.js tests/render/renderer.test.js tests/all.js sw-files.js
git commit -m "Calm the land: dark river loam, a greener meadow, turquoise shallows and a soft map edge" -m "Sand blotches drop to faint, close shades. Fertile land is dark loam with speckles and tufts in place of the offset tone that drew stair-steps, and the meadow is a saturated green. The river gains a quarter-tile shallows strip inside each bank. Past the map is a darker sand with a soft umber band along the edge. Chunks are cut to their diamond with one mask at the end, so their edge pixels keep the ground's colour and no pale line shows along chunk borders on the loam." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Stock you can see, fields that grow

**Files:**
- Create: `src/render/art/stages.js`
- Modify: `src/render/art/services.js` (granary, bazaar and farm stages; `cropTile`; stage slots)
- Modify: `src/render/art/registry.js` (`slotFor(b, world = null)`)
- Modify: `src/render/renderer.js` (`collectObjects` passes `world`)
- Create: `tests/render/lifeArt.test.js`
- Modify: `tests/render/servicesArt.test.js` (slot count), `tests/all.js`
- Regenerated: `sw-files.js`

**Interfaces:**
- Consumes: `BUILDINGS.granary.capacity` (600), `BUILDINGS.bazaar.capacity` (300), `b.store`, `b.staff`, `b.paused`, `b.blocked`, `b.id`, `world.day`; `collectObjects` in `renderer.js`.
- Produces (contract):
  - `src/render/art/stages.js`:
    - `granaryStage(b)` → 0 empty, 1 under 1/3, 2 under 2/3, 3 the rest (sum of `b.store` over capacity).
    - `bazaarStage(b)` → 0 empty, 1 under 1/2, 2 the rest.
    - `farmStage(world, b)` → 0 when `b.paused`, `!b.staff` or `b.blocked`; otherwise `1 + floor(((world.day + b.id * 17) % 60) / 20)`.
  - `slotFor(b, world = null)` → `house.t<tier>`, `granary.s<0-3>`, `bazaar.s<0-2>`, and `farm_grain.g<0-3>` (with no world, `'farm_grain'`); everything else is its type.
  - `ART` gains `granary.s0`-`s3`, `bazaar.s0`-`s2` and `farm_grain.g0`-`g3`. Each has its plain slot's `w`, `d`, `height`, `bounds` and `shadows`. The plain `granary`, `bazaar` and `farm_grain` slots stay, drawing stages 3, 2 and 2.
- Produces (additive): `FARM_CYCLE_DAYS = 60` and `FARM_ID_OFFSET = 17` from `stages.js`; `PLAIN_STAGE` and `cropTile(g, x, y, stage)` from `services.js`. The art functions gain a `stage` parameter: `granary(g, X, Y, stage = 3)`, `bazaar(g, X, Y, stage = 2)`, `farmGrain(g, X, Y, stage = 2)`.

Design notes:
- The bazaar's awnings hide its counter tops at map zoom, so the stock shows on the ground in front of each counter: nothing, then one heaped basket, then two heaped baskets and a jar.
- The granary's grain shows as orange-red caps in the silo hatches (the reference's "red grain in round roof bins"), burlap sacks by the door and, when full, a grain heap in the yard.
- On the farm, the back row (tiles at `j = 0`, the upper-right half on screen) runs one stage ahead, capped at golden. A sprouting field therefore shows green behind and sprouts in front, and a green field shows gold behind.
- Growth is cosmetic (ruling R9).

- [ ] **Step 1: Write the failing tests**

Create `tests/render/lifeArt.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { granaryStage, bazaarStage, farmStage, FARM_CYCLE_DAYS } from '../../src/render/art/stages.js';
import { ART, slotFor } from '../../src/render/art/registry.js';
import { granary, bazaar, farmGrain, PLAIN_STAGE } from '../../src/render/art/services.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { p } from '../../src/render/iso.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createCamera } from '../../src/render/camera.js';
import { createSpriteCache } from '../../src/render/spriteCache.js';
import { createTerrainBaker } from '../../src/render/terrainBaker.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeCanvas, pixelAt, canvasHash } from '../helpers/canvas.js';

const STAGE_SLOTS = {
  granary: ['granary.s0', 'granary.s1', 'granary.s2', 'granary.s3'],
  bazaar: ['bazaar.s0', 'bazaar.s1', 'bazaar.s2'],
  farm_grain: ['farm_grain.g0', 'farm_grain.g1', 'farm_grain.g2', 'farm_grain.g3'],
};

// A 2x2 building drawn alone at scale 2 with its art origin at canvas (160, 110), as servicesArt.test.js does.
function drawAlone(fn) {
  const c = makeCanvas(320, 260);
  const ctx = c.getContext('2d');
  ctx.translate(160, 110);
  fn(makeDraw(ctx, 2));
  return c;
}
const at = (c, ax, ay) => pixelAt(c, 160 + ax * 2, 110 + ay * 2);

// Mean colour over a 7 x 7 grid inside tile (tx, ty), clear of the fence along the field's back edges.
function tileMean(c, tx, ty) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let u = 0.2; u < 0.85; u += 0.1) {
    for (let v = 0.2; v < 0.85; v += 0.1) {
      const q = p(tx + u, ty + v);
      const px = at(c, q[0], q[1]);
      r += px[0]; g += px[1]; b += px[2]; n++;
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}

describe('life art', () => {
  it('fills a granary in four stages by its share of capacity', () => {
    const cap = BUILDINGS.granary.capacity;
    const stage = (grain) => granaryStage({ type: 'granary', store: { grain } });
    expect(granaryStage({ type: 'granary', store: {} })).toBe(0);
    expect([stage(0), stage(1), stage(cap / 3 - 1), stage(cap / 3), stage((2 * cap) / 3 - 1), stage((2 * cap) / 3), stage(cap)]).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
  it('stocks a bazaar in three stages by its share of capacity', () => {
    const cap = BUILDINGS.bazaar.capacity;
    const stage = (grain) => bazaarStage({ type: 'bazaar', store: { grain } });
    expect([stage(0), stage(1), stage(cap / 2 - 1), stage(cap / 2), stage(cap)]).toEqual([0, 1, 1, 2, 2]);
  });
  it('grows a working farm through three stages over sixty days, offset by id, and leaves an idle one fallow', () => {
    const farm = { type: 'farm_grain', id: 1, staff: 10, paused: false, blocked: null };
    expect(FARM_CYCLE_DAYS).toBe(60);
    // id 1 shifts the cycle by 17 days: day 2 is cycle day 19 (sprouting), day 3 is day 20 (green)
    expect([2, 3, 22, 23, 42, 43].map((day) => farmStage({ day }, farm))).toEqual([1, 2, 2, 3, 3, 1]);
    const counts = [0, 0, 0, 0];
    for (let day = 0; day < 60; day++) counts[farmStage({ day }, farm)]++;
    expect(counts).toEqual([0, 20, 20, 20]);
    expect(farmStage({ day: 3 }, { ...farm, id: 2 })).toBe(2);              // (3 + 34) % 60 = 37: green
    expect(farmStage({ day: 3 }, { ...farm, paused: true })).toBe(0);
    expect(farmStage({ day: 3 }, { ...farm, staff: 0 })).toBe(0);
    expect(farmStage({ day: 3 }, { ...farm, blocked: 'no_storage' })).toBe(0);
  });
  it('names stage slots for granaries, bazaars and farms, and keeps the rest as they were', () => {
    const world = { day: 3 };
    expect(slotFor({ type: 'granary', store: { grain: BUILDINGS.granary.capacity } })).toBe('granary.s3');
    expect(slotFor({ type: 'bazaar', store: {} }, world)).toBe('bazaar.s0');
    expect(slotFor({ type: 'farm_grain', id: 1, staff: 10, paused: false, blocked: null }, world)).toBe('farm_grain.g2');
    expect(slotFor({ type: 'farm_grain', id: 1, staff: 10, paused: false, blocked: null })).toBe('farm_grain');
    expect(slotFor({ type: 'house', tier: 2 }, world)).toBe('house.t2');
    expect(slotFor({ type: 'well' }, world)).toBe('well');
  });
  it('registers every stage slot with its building\'s footprint, height and shadows, each drawn differently', () => {
    for (const [type, slots] of Object.entries(STAGE_SLOTS)) {
      const plain = ART[type];
      const hashes = new Set();
      for (const slot of slots) {
        const e = ART[slot];
        expect([slot, e.w, e.d, e.height]).toEqual([slot, plain.w, plain.d, plain.height]);
        expect(e.bounds).toEqual(plain.bounds);
        expect(e.shadows).toEqual(plain.shadows);
        const c = drawAlone((g) => e.draw(g, 0, 0));
        hashes.add(canvasHash(c));
      }
      expect(hashes.size).toBe(slots.length);
    }
    expect(PLAIN_STAGE).toEqual({ granary: 3, bazaar: 2, farm_grain: 2 });
    // the plain slot is the full or middle stage, for card thumbnails and assets
    expect(canvasHash(drawAlone((g) => ART.granary.draw(g, 0, 0)))).toBe(canvasHash(drawAlone((g) => ART['granary.s3'].draw(g, 0, 0))));
  });
  it('shows grain in the silo tops once a granary holds some, and goods in front of the stalls once a bazaar does', () => {
    // the front silo's hatch: dome centre U(p(1.4, 1.4), 9) = (0, 13.4), hatch 8.2 above it, sampled just below
    const hatch = (stage) => at(drawAlone((g) => granary(g, 0, 0, stage)), 0, 5.5);
    expect(hatch(0)[0]).toBeLessThan(120);           // the dark empty hatch
    expect(hatch(3)[0]).toBeGreaterThan(200);        // grain
    // in front of the front stall's counter: the first heaped basket's goods at U(p(1.5, 1.9), 1.9) = (-6.4, 25.3),
    // the second's at U(p(1.74, 1.9), 1.9) = (-2.6, 27.2)
    const first = (stage) => at(drawAlone((g) => bazaar(g, 0, 0, stage)), -6.4, 25.3);
    const second = (stage) => at(drawAlone((g) => bazaar(g, 0, 0, stage)), -2.6, 27.2);
    expect(first(0)[3]).toBe(0);                      // bare ground in front of an empty stall
    expect(first(1)[0]).toBeGreaterThan(first(1)[1] + 60);   // a heap of red goods
    expect(second(1)[3]).toBe(0);
    expect(second(2)[0]).toBeGreaterThan(200);       // piled: a second heap, gold
    expect(second(2)[2]).toBeLessThan(100);
  });
  it('grows the field from fallow to golden with the back row a stage ahead', () => {
    const look = (stage) => { const c = drawAlone((g) => farmGrain(g, 0, 0, stage)); return { back: tileMean(c, 0, 0), front: tileMean(c, 0, 1) }; };
    const green = (m) => m.g > m.r;
    const golden = (m) => m.r > 175 && m.g < m.r;
    const loam = (m) => m.r < 170 && m.g < m.r;
    const f0 = look(0), f1 = look(1), f2 = look(2), f3 = look(3);
    expect([loam(f0.back), loam(f0.front)]).toEqual([true, true]);
    expect([green(f1.back), loam(f1.front)]).toEqual([true, true]);
    expect(f1.front.g - f1.front.r).toBeGreaterThan(f0.front.g - f0.front.r);   // sprouts on the ploughed rows
    expect([golden(f2.back), green(f2.front)]).toEqual([true, true]);
    expect([golden(f3.back), golden(f3.front)]).toEqual([true, true]);
  });
  it('asks the sprite cache for the stage each building is at', () => {
    const w = riverWorld();
    const granaryB = Object.values(w.buildings).find((b) => b.type === 'granary');
    const farm = Object.values(w.buildings).find((b) => b.type === 'farm_grain');
    granaryB.store = { grain: BUILDINGS.granary.capacity - 100 };
    const asked = [];
    const real = createSpriteCache();
    const cache = { get: (slot, ...rest) => { asked.push(slot); return real.get(slot, ...rest); } };
    const renderer = createRenderer({ canvas: makeCanvas(400, 300), dpr: 1, spriteCache: cache, baker: createTerrainBaker(), maxBakesPerFrame: Infinity });
    renderer.renderFrame(w, createCamera({ x: 18, y: 14, zoom: 1 }), { view: { width: 400, height: 300 } });
    expect(asked).toContain('granary.s3');
    expect(asked).toContain('bazaar.s1');                                     // 50 of 300
    expect(asked).toContain(`farm_grain.g${farmStage(w, farm)}`);
    expect(farmStage(w, farm)).toBeGreaterThan(0);                            // staffed, so growing
    expect(asked.includes('granary') || asked.includes('bazaar') || asked.includes('farm_grain')).toBe(false);
  });
});
```

In `tests/all.js`, after `import './render/servicesArt.test.js';`, add:

```js
import './render/lifeArt.test.js';
```

Bounds containment for every new slot is already covered by `tests/render/artBounds.test.js`, which walks all of `ART`. Every stage keeps the plain slot's height: grain caps, sacks, baskets and the heap all sit below the domes, awnings and pennants that set it.

- [ ] **Step 2: Run them to see them fail**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "life art"
```

Expected: the page fails to load, because `src/render/art/stages.js` does not exist yet:

```
LOAD ERROR
TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:<port>/tests/all.js
```

- [ ] **Step 3: Implement**

**3a. Create `src/render/art/stages.js`:**

```js
// Which drawing a building shows (early-game pass 2.2 and 2.3): granaries and bazaars by how full they are,
// grain farms by how far the crop has grown. Pure functions of the building (and, for farms, the game day);
// the renderer turns them into art slots through slotFor in registry.js.
import { BUILDINGS } from '../../data/buildings.js';

export const FARM_CYCLE_DAYS = 60;     // sprouting, green, golden: 20 game days each
export const FARM_ID_OFFSET = 17;      // days the cycle shifts per building id, so a district never grows in step

const stored = (b) => { let n = 0; for (const v of Object.values(b.store || {})) n += v; return n; };

// 0 empty, 1 under a third full, 2 under two thirds, 3 the rest.
export function granaryStage(b) {
  const n = stored(b), cap = BUILDINGS.granary.capacity;
  if (n <= 0) return 0;
  if (n * 3 < cap) return 1;
  if (n * 3 < cap * 2) return 2;
  return 3;
}

// 0 empty stalls, 1 under half full, 2 piled.
export function bazaarStage(b) {
  const n = stored(b);
  if (n <= 0) return 0;
  return n * 2 < BUILDINGS.bazaar.capacity ? 1 : 2;
}

// 0 fallow when the farm is not working (paused, unstaffed or blocked); otherwise 1 sprouting, 2 green,
// 3 golden, cycling over FARM_CYCLE_DAYS. The look only: production stays daily.
export function farmStage(world, b) {
  if (b.paused || !b.staff || b.blocked) return 0;
  const third = FARM_CYCLE_DAYS / 3;
  return 1 + Math.floor(((world.day + b.id * FARM_ID_OFFSET) % FARM_CYCLE_DAYS) / third);
}
```

(Integer comparisons `n * 3 < cap` avoid floating-point surprises at exactly a third.)

**3b. `src/render/art/services.js`.** Four replacements. The imports are unchanged: `pots`, `tile` and `hs` are already imported.

(1) Replace the header:

```js
// Stage 1 service buildings, ported from the approved mock-up (well, granary, bazaar, temple, fieldTile).
// The grain farm is new: a fenced 2x2 field of grain rows with a small farmhouse in the near corner.
// Each service carries a small pennant in its emblem colour (spec 5.3) so it reads at phone zoom.
```

with:

```js
// Stage 1 service buildings, ported from the approved mock-up (well, granary, bazaar, temple, fieldTile).
// The grain farm is new: a fenced 2x2 field of grain rows with a small farmhouse in the near corner.
// Each service carries a small pennant in its emblem colour (spec 5.3) so it reads at phone zoom.
// Granaries and bazaars show their stock and farms their crop (early-game pass 2.2, 2.3): each draws a stage
// chosen by stages.js, and SERVICE_ART registers one slot per stage beside the plain type slot.
```

(2) Replace the whole `granary` and `bazaar` functions:

```js
// Granary: a whitewashed block with a teal band, four domed silos and grain sacks by the door.
export function granary(g, X, Y) {
  const F = box(g, X + 0.1, Y + 0.1, 1.8, 1.8, 9, 0, WASH);
  door(g, F, 0.42, 0.58, 6);
  qd(g, F.L, 0, 1, 7.4, 8.4, TEAL);
  qd(g, F.R, 0, 1, 7.4, 8.4, TEAL_DARK);
  for (const [u, v] of [[0.6, 0.6], [1.4, 0.6], [0.6, 1.4], [1.4, 1.4]]) {
    const c = U(p(X + u, Y + v), 9);
    g.dome(c, 8, 8.5, 4, { outline: true });
    g.circ([c[0], c[1] - 8.2], 1.3, '#5A4A5A');
  }
  [0.42, 0.52, 0.62].forEach((u, i) => g.ell(U(p(X + u + 0.1, Y + 2.08), 1.2), 1.7, 1.3, i % 2 ? '#E2C990' : '#EED6A0', { outline: true }));
  pennant(g, U(p(X + 1.85, Y + 0.15), 9), 7, SERVICE_EMBLEM.granary);
}

// Bazaar: four stalls, each a counter of goods under a striped awning in its own colour.
export function bazaar(g, X, Y) {
  const cs = [[RED, '#933E2B'], [GOLD, '#B08436'], [BLUE, '#245A88'], [GREEN, GREEN_DARK]];
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], k) => {
    const x = X + i, y = Y + j;
    box(g, x + 0.24, y + 0.3, 0.52, 0.4, 3.2, 0, ['#D9B47A', '#C49E66', '#A08478']);
    for (const [u, c] of [[0.3, '#C9552F'], [0.55, GOLD], [0.8, '#6E9E3A']]) g.ell(U(p(x + 0.24 + 0.52 * u, y + 0.55), 3.4), 1.4, 0.9, c, { outline: true });
    g.ell(U(p(x + 0.88, y + 0.5), 1), 1.6, 1, '#D9B060', { outline: true });
    awn(g, x + 0.1, y + 0.1, 0.8, 0.8, 7.5, cs[k][0], cs[k][1]);
  });
  pennant(g, U(p(X + 1.9, Y + 0.1), 8.7), 7, SERVICE_EMBLEM.bazaar);
}
```

with:

```js
// Granary: a whitewashed block with a teal band, four domed silos and grain sacks by the door. `stage`
// (granaryStage): 0 empty, dark hatches and a bare yard; 1 one silo of grain and a sack; 2 two silos and
// three sacks; 3 every silo heaped, six sacks and a loose heap of grain in the yard.
const GRAIN = '#D9803A', GRAIN_LIGHT = '#F0B060', SACKS = ['#D2B074', '#C49E62'];
const SILOS_FILLED = [0, 1, 2, 4];                       // silos showing grain at each stage, back to front
const SACK_SPOTS = [0.42, 0.52, 0.62, 1.28, 1.38, 1.48]; // along the lit face's foot, left then right of the door
const SACKS_AT = [0, 1, 3, 6];
export function granary(g, X, Y, stage = 3) {
  const F = box(g, X + 0.1, Y + 0.1, 1.8, 1.8, 9, 0, WASH);
  door(g, F, 0.42, 0.58, 6);
  qd(g, F.L, 0, 1, 7.4, 8.4, TEAL);
  qd(g, F.R, 0, 1, 7.4, 8.4, TEAL_DARK);
  [[0.6, 0.6], [1.4, 0.6], [0.6, 1.4], [1.4, 1.4]].forEach(([u, v], i) => {
    const c = U(p(X + u, Y + v), 9);
    g.dome(c, 8, 8.5, 4, { outline: true });
    const top = [c[0], c[1] - 8.2];
    if (i >= SILOS_FILLED[stage]) { g.circ(top, 1.3, '#5A4A5A'); return; }
    g.ell(top, 3.2, 1.6, GRAIN, { outline: true });
    if (stage === 3) g.ell([top[0], top[1] - 1.1], 2.2, 1.1, GRAIN_LIGHT);   // heaped to the brim
  });
  SACK_SPOTS.slice(0, SACKS_AT[stage]).forEach((u, i) => g.ell(U(p(X + u + 0.1, Y + 2.08), 1.2), 1.7, 1.3, SACKS[i % 2], { outline: true }));
  if (stage === 3) {                                        // a loose heap of grain in the yard
    const h = p(X + 1.8, Y + 2.12);
    g.ell(U(h, 1), 3.4, 1.7, GRAIN, { outline: true });
    g.ell(U(h, 2.1), 2.2, 1.1, GRAIN_LIGHT);
  }
  pennant(g, U(p(X + 1.85, Y + 0.15), 9), 7, SERVICE_EMBLEM.granary);
}

// Bazaar: four stalls, each a counter of goods under a striped awning in its own colour. The awnings hide the
// counter tops at map zoom, so the stock shows on the ground in front of each counter. `stage` (bazaarStage):
// 0 bare, with an empty basket by each stall; 1 a heaped basket in front of each counter; 2 piled: two heaped
// baskets and a jar in front of each counter and full baskets beside them.
const GOODS = [[0.3, '#C9552F'], [0.55, GOLD], [0.8, '#6E9E3A']];
const BASKET = '#B08436';
function heapedBasket(g, q, color) {
  g.ell(U(q, 0.9), 2, 1.2, BASKET, { outline: true });
  g.ell(U(q, 1.9), 1.5, 0.9, color, { outline: true });
}
export function bazaar(g, X, Y, stage = 2) {
  const cs = [[RED, '#933E2B'], [GOLD, '#B08436'], [BLUE, '#245A88'], [GREEN, GREEN_DARK]];
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], k) => {
    const x = X + i, y = Y + j;
    box(g, x + 0.24, y + 0.3, 0.52, 0.4, 3.2, 0, ['#D9B47A', '#C49E66', '#A08478']);
    if (stage > 0) for (const [u, c] of GOODS) g.ell(U(p(x + 0.24 + 0.52 * u, y + 0.55), 3.4), 1.4, 0.9, c, { outline: true });
    const side = U(p(x + 0.88, y + 0.5), 1);
    if (stage === 2) g.ell(side, 1.6, 1, '#D9B060', { outline: true });
    else g.ell(side, 1.6, 1, 'none', { stroke: '#A08478', strokeWidth: 0.6 });
    if (stage >= 1) heapedBasket(g, p(x + 0.5, y + 0.9), GOODS[k % 3][1]);
    if (stage === 2) {
      heapedBasket(g, p(x + 0.74, y + 0.9), GOODS[(k + 1) % 3][1]);
      pots(g, p(x + 0.24, y + 0.88), 1);
    }
    awn(g, x + 0.1, y + 0.1, 0.8, 0.8, 7.5, cs[k][0], cs[k][1]);
  });
  pennant(g, U(p(X + 1.9, Y + 0.1), 8.7), 7, SERVICE_EMBLEM.bazaar);
}
```

(3) Replace the head of `farmGrain`:

```js
// Grain farm: four field tiles with straight rows, a reed fence round the edge that stops at the
// farmhouse, and a small thatched farmhouse in the near corner with pots and a green pennant.
export function farmGrain(g, X, Y) {
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) fieldTile(g, X + i, Y + j, 'grain');
```

with:

```js
// One field tile of the grain farm at a growth stage: 0 fallow (ploughed furrows), 1 sprouting, 2 green
// grain (fieldTile), 3 golden grain.
const LOAM = '#8A6A42', FURROW = '#6E5234', RIDGE = '#B49268', SPROUT = '#7FB04A', SPROUT_TIP = '#B4D86A';
const RIPE = '#D4AE4E', RIPE_STALK = '#A88E3A', RIPE_HEAD = '#F2DE90';
export function cropTile(g, x, y, stage) {
  if (stage === 2) { fieldTile(g, x, y, 'grain'); return; }
  const edge = { stroke: TERRAIN.fieldEdge, strokeWidth: 0.6, strokeAlpha: 0.35 };
  if (stage === 3) {
    tile(g, x, y, RIPE, edge);
    for (let v = 0.14; v < 0.95; v += 0.18) {
      for (let u = 0.08; u < 0.98; u += 0.11) {
        const q = p(x + u, y + v), hh = 2.6 + hs(x * 7 + u, y * 3 + v, 1) * 1.2;
        g.line(q, [q[0] + 0.3, q[1] - hh], RIPE_STALK, 0.7);
        g.circ([q[0] + 0.3, q[1] - hh], 0.6, RIPE_HEAD);
      }
    }
    return;
  }
  tile(g, x, y, LOAM, edge);
  for (let v = 0.14; v < 0.95; v += 0.18) {                 // a furrow per crop row, a pale ridge beside it
    g.line(p(x + 0.04, y + v), p(x + 0.96, y + v), FURROW, 0.8, 0.55);
    g.line(p(x + 0.04, y + v + 0.06), p(x + 0.96, y + v + 0.06), RIDGE, 0.6, 0.6);
  }
  if (stage !== 1) return;
  for (let v = 0.14; v < 0.95; v += 0.18) {
    for (let u = 0.08; u < 0.98; u += 0.11) {
      const q = p(x + u, y + v), hh = 0.9 + hs(x * 7 + u, y * 3 + v, 1) * 0.6;
      g.line(q, [q[0] - 0.3, q[1] - hh], SPROUT, 0.6);
      g.circ([q[0] - 0.3, q[1] - hh], 0.35, SPROUT_TIP);
    }
  }
}

// Grain farm: four crop tiles, a reed fence round the edge that stops at the farmhouse, and a small thatched
// farmhouse in the near corner with pots and a green pennant. `stage` (farmStage): 0 fallow, 1 sprouting,
// 2 green, 3 golden; the back row (the two tiles at j = 0) runs one stage ahead, capped at golden, so a
// working field shows two stages at once.
export function farmGrain(g, X, Y, stage = 2) {
  const back = stage === 0 ? 0 : Math.min(3, stage + 1);
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) cropTile(g, X + i, Y + j, j === 0 ? back : stage);
```

(The rest of `farmGrain`, from the four `fence(...)` calls to the pennant, is unchanged.)

(4) Replace `SERVICE_ART`:

```js
export const SERVICE_ART = {
  well: { w: 1, d: 1, height: 18, bounds: boundsFor(1, 1, 18), shadows: [[0.28, 0.28, 0.44, 0.44, 6]], draw: well },
  farm_grain: { w: 2, d: 2, height: 12, bounds: boundsFor(2, 2, 12), shadows: [[1.4, 1.4, 0.52, 0.52, 9]], draw: farmGrain },
  granary: { w: 2, d: 2, height: 22, bounds: boundsFor(2, 2, 22), shadows: [[0.1, 0.1, 1.8, 1.8, 16]], draw: granary },
  bazaar: {
    w: 2, d: 2, height: 16, bounds: boundsFor(2, 2, 16),
    shadows: [[0.12, 0.12, 0.76, 0.76, 9], [1.12, 0.12, 0.76, 0.76, 9], [0.12, 1.12, 0.76, 0.76, 9], [1.12, 1.12, 0.76, 0.76, 9]],
    draw: bazaar,
  },
  temple: { w: 2, d: 2, height: 40, bounds: boundsFor(2, 2, 40), shadows: [[0.25, 0.2, 1.5, 1, 15], [0.1, 1.2, 1.8, 0.7, 23]], draw: temple },
};
```

with:

```js
// The plain type slots are what cards and assets show: a full granary, a piled bazaar, a green field.
export const PLAIN_STAGE = { granary: 3, bazaar: 2, farm_grain: 2 };

const FARM_SLOT = { w: 2, d: 2, height: 12, bounds: boundsFor(2, 2, 12), shadows: [[1.4, 1.4, 0.52, 0.52, 9]] };
const GRANARY_SLOT = { w: 2, d: 2, height: 22, bounds: boundsFor(2, 2, 22), shadows: [[0.1, 0.1, 1.8, 1.8, 16]] };
const BAZAAR_SLOT = {
  w: 2, d: 2, height: 16, bounds: boundsFor(2, 2, 16),
  shadows: [[0.12, 0.12, 0.76, 0.76, 9], [1.12, 0.12, 0.76, 0.76, 9], [0.12, 1.12, 0.76, 0.76, 9], [1.12, 1.12, 0.76, 0.76, 9]],
};

export const SERVICE_ART = {
  well: { w: 1, d: 1, height: 18, bounds: boundsFor(1, 1, 18), shadows: [[0.28, 0.28, 0.44, 0.44, 6]], draw: well },
  farm_grain: { ...FARM_SLOT, draw: (g, x, y) => farmGrain(g, x, y, PLAIN_STAGE.farm_grain) },
  granary: { ...GRANARY_SLOT, draw: (g, x, y) => granary(g, x, y, PLAIN_STAGE.granary) },
  bazaar: { ...BAZAAR_SLOT, draw: (g, x, y) => bazaar(g, x, y, PLAIN_STAGE.bazaar) },
  temple: { w: 2, d: 2, height: 40, bounds: boundsFor(2, 2, 40), shadows: [[0.25, 0.2, 1.5, 1, 15], [0.1, 1.2, 1.8, 0.7, 23]], draw: temple },
};
// One slot per stage, named as slotFor (registry.js) names them: granary.s0-s3, bazaar.s0-s2, farm_grain.g0-g3.
for (let s = 0; s < 4; s++) SERVICE_ART[`granary.s${s}`] = { ...GRANARY_SLOT, draw: (g, x, y) => granary(g, x, y, s) };
for (let s = 0; s < 3; s++) SERVICE_ART[`bazaar.s${s}`] = { ...BAZAAR_SLOT, draw: (g, x, y) => bazaar(g, x, y, s) };
for (let s = 0; s < 4; s++) SERVICE_ART[`farm_grain.g${s}`] = { ...FARM_SLOT, draw: (g, x, y) => farmGrain(g, x, y, s) };
```

**3c. `src/render/art/registry.js`.** Replace the whole file with:

```js
// Every art slot the renderer and sprite cache can draw. An entry is
//   { w, d, height, bounds: [left, top, right, bottom], shadows: [[dx, dy, w, d, h], ...], draw(g, x, y) }
// with the footprint in tiles, height and bounds in art px relative to p(x, y) of the footprint origin,
// and shadows as ground-shadow blocks relative to the origin tile. A slot can later point at a PNG by
// replacing `draw` with `png: { src, ax, ay, scale }` (see spriteCache.js); nothing else changes.
import { HOUSE_ART } from './housing.js';
import { SERVICE_ART } from './services.js';
import { NATURE_ART } from './nature.js';
import { FIGURE_ART } from './figures.js';
import { granaryStage, bazaarStage, farmStage } from './stages.js';

export { boundsFor } from '../iso.js';

export const ART = { ...HOUSE_ART, ...SERVICE_ART, ...NATURE_ART, ...FIGURE_ART };

// The art slot a building shows: houses by tier, granaries and bazaars by how full they are (stages.js), and
// grain farms by their crop's growth, which runs on the game day, so a farm needs the world (without one,
// the plain 'farm_grain' slot). Everything else is its type.
export function slotFor(b, world = null) {
  if (b.type === 'house') return `house.t${b.tier}`;
  if (b.type === 'granary') return `granary.s${granaryStage(b)}`;
  if (b.type === 'bazaar') return `bazaar.s${bazaarStage(b)}`;
  if (b.type === 'farm_grain') return world ? `farm_grain.g${farmStage(world, b)}` : 'farm_grain';
  return b.type;
}
```

**3d. `src/render/renderer.js`.** In `collectObjects`, replace:

```js
    const slot = slotFor(b);
```

with:

```js
    const slot = slotFor(b, world);
```

The sprite cache keys by slot, so a stage change simply asks for another cached sprite. The terrain chunk signature is untouched. A farm's slot changes at most every 20 game days.

- [ ] **Step 4: Run the tests to see them pass**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "life art"
```

Expected: `8 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

Search: `git grep -n -e "SERVICE_ART" -e "slotFor" -e "'granary'" -e "'bazaar'" -e "farm_grain" -- tests/render tests/ui`.

- `tests/render/servicesArt.test.js` ('registers every Stage 1 building type with its real footprint') pins the slot count. Replace:

  ```js
      expect(Object.keys(SERVICE_ART).length).toBe(5);
  ```

  with:

  ```js
      expect(Object.keys(SERVICE_ART).length).toBe(16);   // the five types plus 4 granary, 3 bazaar and 4 farm stage slots
  ```

- Nothing else needs a change:
  - `servicesArt.test.js` 'fills the farm with green field rows' samples the 2x2 centre of `farmGrain(g, 0, 0)` (default stage 2, front row green). It still reads green, as verified.
  - `servicesArt.test.js` 'draws every Stage 1 service ... a different look' calls the art functions with their defaults and still gets five distinct hashes.
  - `housingArt.test.js` checks `slotFor({ type: 'well' })` and the house tiers, which are unchanged.
  - `pick.js` and its tests call `slotFor(b)` with no world. A granary or bazaar now resolves to a stage slot of the same height, and a farm to the plain slot.
  - `stress.test.js` keeps `world.day` fixed between frames, so no sprite re-renders once warm.
  - `artBounds.test.js` now also walks the 11 stage slots and passes.

Run `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "service art"`. Expected: `ALL PASSED`.

- [ ] **Step 6: Visual check**

The `-Eval` below uses only backtick strings (no quotes), so it passes through `powershell -File` intact.

```powershell
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7&sample=1' -Out docs/superpowers/notes/screenshots/raw/t06-life-1280.png -Width 1280 -Height 800
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7&sample=1' -Out docs/superpowers/notes/screenshots/raw/t06-life-390.png -Width 390 -Height 844
$ev = '(async () => { const { ART } = await import(`./src/render/art/registry.js`); const { makeDraw } = await import(`./src/render/art/ctx.js`); const c = document.createElement(`canvas`); c.width = innerWidth; c.height = innerHeight; c.style.cssText = `position:fixed;left:0;top:0;z-index:9999;background:#EBD6A8`; document.body.append(c); const ctx = c.getContext(`2d`); const rows = [[`granary.s0`, `granary.s1`, `granary.s2`, `granary.s3`], [`bazaar.s0`, `bazaar.s1`, `bazaar.s2`], [`farm_grain.g0`, `farm_grain.g1`, `farm_grain.g2`, `farm_grain.g3`]]; rows.forEach((row, j) => row.forEach((slot, i) => { ctx.save(); ctx.translate(160 + i * 300, 80 + j * 250); ART[slot].draw(makeDraw(ctx, 3.2), 0, 0); ctx.restore(); })); })()'
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7&sample=1' -Out docs/superpowers/notes/screenshots/raw/t06-stages-1280.png -Width 1280 -Height 800 -BudgetMs 300 -Eval $ev
```

What to look for:
- In the sample city at both sizes, the three farms by the river show different stages (golden fields, a green-and-gold field), not three identical green squares. The granary's silo tops show orange-red grain caps.
- In `t06-stages-1280.png`, a contact sheet of all eleven stage sprites:
  - Granary: dark hatches and a bare yard, then one grain cap and a sack, then two caps and three sacks, then four heaped caps, six sacks and a grain heap.
  - Bazaar: bare stalls, then a heaped basket in front of each counter, then two baskets and a red jar per stall.
  - Farm: ploughed brown furrows, then green behind and sprouts in front, then gold behind and green in front, then all gold.

- [ ] **Step 7: Full suite**

```powershell
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED` (8 more tests than before this task). `sw-files.ps1` adds `src/render/art/stages.js` to the cache list.

- [ ] **Step 8: Commit**

```powershell
git add src/render/art/stages.js src/render/art/services.js src/render/art/registry.js src/render/renderer.js tests/render/lifeArt.test.js tests/render/servicesArt.test.js tests/all.js sw-files.js
git commit -m "Show stock in granaries and bazaars and let the fields grow" -m "Granaries draw four fill states (grain caps in the silo hatches, sacks and a heap in the yard) and bazaars three (bare, a heaped basket per stall, piled baskets and jars). Working farms cycle sprouting, green and golden over 60 days, offset by id, with the back row a stage ahead; idle farms lie fallow. slotFor takes the world and picks the stage slot; the plain slots stay for cards and assets." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Work gangs and the settle

**Files:**
- Modify: `src/render/art/figures.js` (`hauler` kind, `hauler()` function; the `fig.hauler` slot follows from `FIGURE_KINDS`)
- Modify: `src/render/effects.js` (`rise`, `risingIds`, the rise drawing, `EFFECT_MS.rise`)
- Modify: `src/render/renderer.js` (`opts.rising`, `drawRising`, shadows grow with the rise)
- Modify: `src/ui/placement.js` (`confirm` calls `effects.rise` for building tools)
- Modify: `src/ui/createUI.js` (`render` passes `rising`)
- Create: `tests/render/rise.test.js`
- Modify: `tests/helpers/uiWorld.js` (`rigUI` returns its `renderer`), `tests/ui/placement.test.js` (stub and expectation), `tests/all.js`
- Regenerated: `sw-files.js`

**Interfaces:**
- Consumes: `place()`'s `{ ok, id }`, `BUILDINGS[type].w/d`, `effects`' `reducedMotion` (settings), `renderFrame`, `drawSprite` from `spriteCache.js`, `createUI.render`'s `now` (`t`).
- Produces (contract):
  - `EFFECT_MS.rise = 900`.
  - `effects.rise(id, x, y, w, d, now)`, a no-op under reduced motion.
  - `effects.risingIds(now)` → `Map<id, t>` with `t` in `[0, 1)`.
  - `renderFrame(world, cam, { ..., rising })` reveals those buildings' sprites bottom-up.
  - `createUI.render` passes `rising: effects.risingIds(t)`.
  - `placement.confirm` calls `effects.rise(result.id, ghost.x, ghost.y, def.w, def.d, now)` for building tools only.
  - `fig.hauler` is in `ART`.
- Produces (additive):
  - `hauler(g, gx, gy, phase = 0)`, plus `'hauler'` in `FIGURE_KINDS`, from `figures.js`.
  - `RISE_STEPS = 2` from `effects.js`.
  - `drawRising(ctx, sprite, px, py, zoom, dpr, t)` from `renderer.js`.
  - `rigUI()` also returns `renderer`.

Behaviour notes:
- The rise runs on the frame clock, not game days, so it plays in full while paused and is untouched by the loop's 0.25 s frame cap.
- Roads, plots and demolish only puff, as before.
- The place sound and buzz in `afterCommand` are unchanged.
- Under reduced motion `rise` adds nothing, so `risingIds` is empty: no haulers, no dust, and the building simply appears.
- The building's ground shadow grows with the rise. At `t = 0` only the footprint is tinted, which reads as a marked-out site.

- [ ] **Step 1: Write the failing tests**

In `tests/helpers/uiWorld.js`, `rigUI` returns the renderer it builds so a test can watch `renderFrame`. Replace:

```js
    root: shell.root, world, canvas, cam, ui, store: ui.store, history, doc, at, screenOf, tap, resize, frame,
```

with:

```js
    root: shell.root, world, canvas, cam, renderer, ui, store: ui.store, history, doc, at, screenOf, tap, resize, frame,
```

Create `tests/render/rise.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { createEffects, EFFECT_MS } from '../../src/render/effects.js';
import { hauler, fig } from '../../src/render/art/figures.js';
import { ART } from '../../src/render/art/registry.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createCamera } from '../../src/render/camera.js';
import { createPlacement } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { T } from '../../src/sim/terrain.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';
import { rigUI } from '../helpers/uiWorld.js';
import { makeCanvas, pixelAt, canvasHash } from '../helpers/canvas.js';

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

function scene() {
  const c = makeCanvas(200, 200);
  const ctx = c.getContext('2d');
  ctx.translate(100, 60);
  return { c, g: makeDraw(ctx, 2) };
}

// A temple at (15, 15) on rocky ground (which grows no trees), framed by a 240 x 240 view at zoom 1 and drawn
// with no terrain and no ground shadow, so every pixel that is not the plain fill belongs to the temple
// sprite. Its art origin p(15, 15) lands at screen (120, 88) and its sprite (bounds [-40, -48, 40, 40]) spans
// y -8 to 168, so a rise of t cuts it at y = -8 + 176 * (1 - t): 124 at a quarter, 80 at a half.
// Returns the topmost temple row and the number of temple pixels (sampled every 2 px).
function templeInk(t) {
  const w = makeTestWorld({ size: 32, fertile: [] });
  w.terrain.fill(T.ROCKY);
  const temple = addRaw(w, 'temple', 15, 15);
  const canvas = makeCanvas(240, 240);
  const renderer = createRenderer({
    canvas, dpr: 1,
    baker: { peek: () => ({ sprite: null, fresh: false }), get: () => null },
    registry: { temple: { ...ART.temple, shadows: [] } },
  });
  const rising = t === null ? undefined : new Map([[temple.id, t]]);
  renderer.renderFrame(w, createCamera({ x: 16, y: 16, zoom: 1 }), { view: { width: 240, height: 240 }, rising });
  const d = canvas.getContext('2d').getImageData(0, 0, 240, 240).data;
  const bg = [d[0], d[1], d[2]];
  let top = Infinity, count = 0;
  for (let y = 0; y < 240; y += 2) {
    for (let x = 0; x < 240; x += 2) {
      const k = (y * 240 + x) * 4;
      if (Math.abs(d[k] - bg[0]) + Math.abs(d[k + 1] - bg[1]) + Math.abs(d[k + 2] - bg[2]) <= 12) continue;
      top = Math.min(top, y);
      count++;
    }
  }
  return { top, count };
}

describe('rise', () => {
  it('raises a building over 900 ms and then forgets it', () => {
    expect(EFFECT_MS.rise).toBe(900);
    const fx = createEffects({ reducedMotion: () => false });
    fx.rise(7, 3, 4, 2, 2, 1000);
    const a = fx.risingIds(1000).get(7), b = fx.risingIds(1300).get(7), c = fx.risingIds(1800).get(7);
    expect(a).toBe(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(c).toBeLessThan(1);
    expect(fx.count(1899)).toBe(1);
    expect(fx.risingIds(1900).has(7)).toBe(false);
    expect(fx.count(1901)).toBe(0);
  });
  it('raises nothing under reduced motion', () => {
    const fx = createEffects({ reducedMotion: () => true });
    fx.rise(7, 3, 4, 2, 2, 1000);
    expect(fx.risingIds(1000).size).toBe(0);
    expect(fx.count(1000)).toBe(0);
  });
  it('draws two haulers and dust while a building rises', () => {
    const fx = createEffects({ reducedMotion: () => false });
    fx.rise(1, 0, 0, 2, 2, 0);
    const { c, g } = scene();
    fx.draw(g, 300);
    expect(inked(c)).toBeGreaterThan(60);
    const { c: c2, g: g2 } = scene();
    fx.draw(g2, 950);                                   // over: nothing left to draw
    expect(inked(c2)).toBe(0);
  });
  it('draws a hauler with a brick on its head that bobs as it steps', () => {
    expect(typeof ART['fig.hauler'].draw).toBe('function');
    const draw = (fn) => { const c = makeCanvas(120, 120); const ctx = c.getContext('2d'); ctx.translate(60, 90); fn(makeDraw(ctx, 2)); return c; };
    const still = draw((g) => hauler(g, 0, 0, 0));
    expect(pixelAt(still, 60, 90 - 30)[3]).toBeGreaterThan(0);          // the brick, 15 art px up
    expect(canvasHash(still)).toBe(canvasHash(draw((g) => fig(g, 0, 0, 'hauler'))));
    expect(canvasHash(draw((g) => hauler(g, 0, 0, 0.5))) === canvasHash(still)).toBe(false);
    expect(canvasHash(still) === canvasHash(draw((g) => fig(g, 0, 0, 'porter')))).toBe(false);
  });
  it('reveals a rising building from the bottom up', () => {
    const full = templeInk(null), half = templeInk(0.5), quarter = templeInk(0.25), none = templeInk(0);
    expect(full.count).toBeGreaterThan(400);
    expect(half.top).toBeGreaterThanOrEqual(78);       // nothing above the cut at y 80
    expect(half.top).toBeGreaterThan(full.top + 10);   // the flags and pylon tops are still underground
    expect(quarter.top).toBeGreaterThanOrEqual(122);   // the cut at y 124
    expect(quarter.count).toBeLessThan(half.count);
    expect(half.count).toBeLessThan(full.count);
    expect(none.count).toBe(0);
  });
  it('raises a placed building but not roads or plots', () => {
    const world = makeTestWorld({ gold: 1000 });
    setRoad(world, 0, 10, 31, 10);
    const store = createStore(INITIAL_UI_STATE);
    const calls = [];
    const pl = createPlacement({ world, store, effects: { puff() {}, rise: (...a) => calls.push(a) }, now: () => 42 });
    pl.start({ kind: 'building', type: 'well' });
    pl.moveGhost(14, 9);
    const r = pl.confirm();
    expect(r.ok).toBe(true);
    expect(calls).toEqual([[r.id, 14, 9, 1, 1, 42]]);
    pl.start({ kind: 'road' });
    pl.pointAt(3, 12);
    pl.pointAt(6, 12);
    expect(pl.confirm().ok).toBe(true);
    pl.start({ kind: 'houses' });
    pl.pointAt(20, 11);
    pl.pointAt(21, 11);
    expect(pl.confirm().ok).toBe(true);
    expect(calls.length).toBe(1);
  });
  it('hands the rising buildings to the renderer each frame', async () => {
    const r = await rigUI();
    try {
      r.ui.settings.set({ reducedMotion: 'off' });
      const seen = [];
      const real = r.renderer.renderFrame;
      r.renderer.renderFrame = (w, cam, opts) => { seen.push(opts.rising); return real(w, cam, opts); };
      r.ui.placement.start({ kind: 'building', type: 'well' });
      r.ui.placement.moveGhost(16, 9);
      const res = r.ui.placement.confirm();
      expect(res.ok).toBe(true);
      r.frame(300);                                       // the rig's clock put the rise at 0
      const t = seen[seen.length - 1].get(res.id);
      expect(t).toBeGreaterThan(0.3);
      expect(t).toBeLessThan(0.4);
      r.frame(1000);
      expect(seen[seen.length - 1].has(res.id)).toBe(false);
    } finally {
      r.cleanup();
    }
  });
});
```

In `tests/all.js`, after `import './render/effects.test.js';`, add:

```js
import './render/rise.test.js';
```

Why the tests take the shape they do:
- Headless Edge reports prefers-reduced-motion. The effects tests build with `reducedMotion: () => false`, and the rig test sets `settings.reducedMotion` to `'off'`.
- Both placement tests call `moveGhost` after `start`, so Task 8's nearest-fit `start` cannot move the ghost under them.
- `templeInk` passes its own `registry` to `createRenderer`, but only `collectObjects` reads it; the sprite cache keeps the full `ART`. Shadows are dropped so only sprite pixels count.

- [ ] **Step 2: Run them to see them fail**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "rise >"
```

Expected: the page fails to load:

```
LOAD ERROR
SyntaxError: The requested module '../../src/render/art/figures.js' does not provide an export named 'hauler'
```

(Use `"rise >"`, not `"rise"`: plain `rise` also matches "mood > rises ..." and "ui hud > summarises ...".)

- [ ] **Step 3: Implement**

**3a. `src/render/art/figures.js`.** Replace the whole file with:

```js
// Small people, ported from the mock-up's fig(). Walkers (walkers.js) pick a kind per service; the hauler
// carries a mud brick for the work gang that raises a new building (early-game pass 2.4) and, in Stage 4,
// the monument crews.
import { p, U } from './primitives.js';
import { SHADOW, TEAL, BLUE, GOLD, ORANGE, WOOD, MUD } from './palette.js';

export const FIGURE_KINDS = ['citizen', 'woman', 'water', 'porter', 'priest', 'farmer', 'noble', 'fisher', 'hauler'];

// A small mud brick in the art's iso shading (lit left face, shaded right face, pale top), its bottom front
// corner at (cx, by).
function brick(g, cx, by, s) {
  const r = 2.6 * s, h = 1.8 * s, k = r * 0.5;
  g.poly([[cx - r, by - k], [cx, by], [cx, by - h], [cx - r, by - k - h]], MUD[1], { outline: true });
  g.poly([[cx, by], [cx + r, by - k], [cx + r, by - k - h], [cx, by - h]], MUD[2], { outline: true });
  g.poly([[cx - r, by - k - h], [cx, by - h], [cx + r, by - k - h], [cx, by - 2 * k - h]], MUD[0], { outline: true });
}

export function fig(g, gx, gy, kind, z = 0, sc = 1) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc, sk = '#A0663F', hair = '#1E150E';
  g.ell([X, Y], 3 * s, 1.1 * s, SHADOW, { alpha: 0.25 });
  const long = kind === 'woman' || kind === 'priest';
  const cl = kind === 'priest' ? '#FFFFFF' : '#F7F2E8';
  if (!long) {
    g.line([X - 0.9 * s, Y], [X - 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
    g.line([X + 0.9 * s, Y], [X + 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
    g.poly([[X - 1.9 * s, Y - 2.8 * s], [X + 1.9 * s, Y - 2.8 * s], [X + 1.5 * s, Y - 5.7 * s], [X - 1.5 * s, Y - 5.7 * s]], cl);
    g.line([X - 1.5 * s, Y - 5.4 * s], [X + 1.5 * s, Y - 5.4 * s], kind === 'noble' ? GOLD : TEAL, 0.7 * s);
    g.poly([[X - 1.5 * s, Y - 5.6 * s], [X + 1.5 * s, Y - 5.6 * s], [X + 1.7 * s, Y - 8.7 * s], [X - 1.7 * s, Y - 8.7 * s]], sk);
  } else {
    g.poly([[X - 2 * s, Y], [X + 2 * s, Y], [X + 1.6 * s, Y - 8.7 * s], [X - 1.6 * s, Y - 8.7 * s]], cl, { outline: true });
  }
  const hand = kind === 'hauler' ? -13.2 : -5;   // a hauler holds both arms up to the brick on its head
  g.line([X - 1.8 * s, Y - 8.4 * s], [X - 2.4 * s, Y + hand * s], sk, 0.9 * s);
  g.line([X + 1.8 * s, Y - 8.4 * s], [X + 2.4 * s, Y + hand * s], sk, 0.9 * s);
  g.line([X - 1.5 * s, Y - 8.5 * s], [X + 1.5 * s, Y - 8.5 * s], kind === 'noble' ? GOLD : (kind === 'woman' ? TEAL : BLUE), 1 * s);
  if (kind === 'priest') g.line([X - 1.6 * s, Y - 8.2 * s], [X + 1.4 * s, Y - 5.5 * s], ORANGE, 1 * s);
  if (kind === 'woman') g.ell([X - 0.5 * s, Y - 9.6 * s], 1.7 * s, 2.4 * s, hair);
  if (kind !== 'priest') g.circ([X - 0.2 * s, Y - 10.8 * s], 1.75 * s, hair);
  g.circ([X + 0.25 * s, Y - 10.3 * s], 1.4 * s, sk);
  if (kind === 'water') g.ell([X + 2.4 * s, Y - 9.4 * s], 1.5 * s, 1.8 * s, '#C9552F', { outline: true });
  if (kind === 'porter') g.ell([X, Y - 12.8 * s], 2.6 * s, 1.2 * s, '#D9B060', { outline: true });
  if (kind === 'farmer') g.line([X + 2.4 * s, Y - 5 * s], [X + 5 * s, Y + 0.8 * s], WOOD, 0.8 * s);
  if (kind === 'hauler') brick(g, X + 0.2 * s, Y - 12.4 * s, s);
  if (kind === 'fisher') {
    g.line([X + 2.4 * s, Y - 6 * s], [X + 10 * s, Y - 15 * s], WOOD, 0.6);
    g.line([X + 10 * s, Y - 15 * s], [X + 12 * s, Y + 2 * s], '#EDE6D2', 0.3);
  }
}

// A hauler at tile point (gx, gy), bouncing one step per `phase` cycle (0..1).
export function hauler(g, gx, gy, phase = 0) {
  fig(g, gx, gy, 'hauler', Math.abs(Math.sin(phase * Math.PI)) * 1.4);
}

export const FIGURE_ART = {};
for (const kind of FIGURE_KINDS) {
  FIGURE_ART[`fig.${kind}`] = { w: 0, d: 0, height: 14, bounds: [-14, -30, 14, 6], shadows: [], draw: (g, x, y) => fig(g, x, y, kind) };
}
```

(The brick's top is 16.8 art px up, plus up to 1.4 of bounce, which stays inside the figure bounds `[-14, -30, 14, 6]`. `artBounds.test.js` checks `fig.hauler` like every other slot.)

**3b. `src/render/effects.js`.** Three replacements.

Replace:

```js
// Feedback effects (spec 5.4): a dust puff on placing, a glow and "+Shack" on upgrade, a coral pulse and
// "−Cottage" on downgrade, and a hook for the milestone banner (the banner itself is 1c's DOM). Under
// prefers-reduced-motion there are no puffs, glows or pulses, and labels stay still.
import { TIERS } from '../data/housing.js';
import { p, U, quad } from './iso.js';
import { UI, GOLD, TERRAIN } from './art/palette.js';

export const EFFECT_MS = { puff: 600, glow: 1200, pulse: 1200, label: 1400 };
```

with:

```js
// Feedback effects (spec 5.4): a dust puff on placing, a glow and "+Shack" on upgrade, a coral pulse and
// "−Cottage" on downgrade, and a hook for the milestone banner (the banner itself is 1c's DOM). The settle
// (early-game pass 2.4): a placed building rises from the ground while two haulers work at its front corners
// in a little dust; the renderer reveals the sprite bottom-up from risingIds. Under prefers-reduced-motion
// there are no puffs, glows, pulses or rises (the building simply appears), and labels stay still.
import { TIERS } from '../data/housing.js';
import { p, U, quad } from './iso.js';
import { UI, GOLD, TERRAIN } from './art/palette.js';
import { hauler } from './art/figures.js';

export const EFFECT_MS = { puff: 600, glow: 1200, pulse: 1200, label: 1400, rise: 900 };
export const RISE_STEPS = 2;   // hauler steps per rise: about two a second
```

Replace:

```js
    label(x, y, text, color, now) { add({ kind: 'label', x, y, text, color, start: now }); },
```

with:

```js
    label(x, y, text, color, now) { add({ kind: 'label', x, y, text, color, start: now }); },
    // Building `id` with footprint w x d at tile (x, y) rises from the ground over EFFECT_MS.rise.
    rise(id, x, y, w, d, now) { if (!reduced()) add({ kind: 'rise', id, x, y, w, d, start: now }); },
    // id -> how far each rising building is up, in [0, 1).
    risingIds(now) {
      prune(now);
      const out = new Map();
      for (const e of list) if (e.kind === 'rise') out.set(e.id, Math.max(0, age(e, now)));
      return out;
    },
```

In `draw`, replace:

```js
        } else if (e.kind === 'label') {
```

with:

```js
        } else if (e.kind === 'rise') {
          const k = Math.max(0, t);
          // Dust along the two front edges, lifting and thinning as the walls go up.
          for (let i = 0; i < 4; i++) {
            const u = i % 2 ? 0.75 : 0.25;
            const q = i < 2 ? p(e.x + e.w * u, e.y + e.d) : p(e.x + e.w, e.y + e.d * u);
            g.circ([q[0], q[1] - 1 - k * 7], 1.5 + k * 2.5, TERRAIN.dotLight, { alpha: (1 - k) * 0.55 });
          }
          // Two haulers at the front corners, a half step apart.
          const step = (k * RISE_STEPS) % 1;
          hauler(g, e.x + 0.05, e.y + e.d + 0.25, step);
          hauler(g, e.x + e.w + 0.25, e.y + 0.05, (step + 0.5) % 1);
        } else if (e.kind === 'label') {
```

(The haulers stand just outside the footprint's left and right corners, the outer ends of its two lit-facing edges, so drawing them after the sprites never puts them behind the building.)

**3c. `src/render/renderer.js`.** Four replacements, against the file as Tasks 5 and 6 left it.

Replace the header:

```js
// One frame (spec 7.4): baked terrain chunks, ground shadows, depth-sorted sprites (buildings, trees and
// walkers), then effects, overlays and the placement grid. Reads the world; never writes it.
```

with:

```js
// One frame (spec 7.4): baked terrain chunks, ground shadows, depth-sorted sprites (buildings, trees and
// walkers), then effects, overlays and the placement grid. Reads the world; never writes it. Buildings in
// opts.rising (id -> t in [0, 1), from effects.risingIds) are revealed bottom-up: only the lowest t share of
// the sprite shows, and the shadow grows with it.
```

Replace:

```js
const defaultDpr = () => (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
```

with:

```js
const defaultDpr = () => (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

// drawSprite with only the bottom t share of the sprite's height showing, clipped in device px.
export function drawRising(ctx, sprite, px, py, zoom, dpr, t) {
  if (t <= 0) return;
  const k = (ART_SCALE * zoom * dpr) / sprite.scale;
  const left = px - sprite.ax * k, top = py - sprite.ay * k;
  const w = sprite.canvas.width * k, h = sprite.canvas.height * k;
  const cut = top + h * (1 - Math.min(1, t));
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, cut, w, top + h - cut);
  ctx.clip();
  drawSprite(ctx, sprite, px, py, zoom, dpr);
  ctx.restore();
}
```

Replace:

```js
    const objects = collectObjects(world, range, opts.walkers || [], registry);
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    for (const o of objects) {
      if (!o.def) continue;
      for (const [dx, dy, w, d, h] of o.def.shadows) groundShadow(g, o.x + dx, o.y + dy, w, d, h);
    }
```

with:

```js
    const objects = collectObjects(world, range, opts.walkers || [], registry);
    const rising = opts.rising || null;   // building ids only: tree and walker ids start at 1e6
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    for (const o of objects) {
      if (!o.def) continue;
      const up = rising && rising.has(o.id) ? rising.get(o.id) : 1;
      for (const [dx, dy, w, d, h] of o.def.shadows) groundShadow(g, o.x + dx, o.y + dy, w, d, h * up);
    }
```

Replace:

```js
      const q = p(o.x, o.y);
      const [px, py] = toDevice(q[0], q[1]);
      drawSprite(ctx, sprite, px, py, zoom, dpr);
      sprites++;
```

with:

```js
      const q = p(o.x, o.y);
      const [px, py] = toDevice(q[0], q[1]);
      if (rising && rising.has(o.id)) drawRising(ctx, sprite, px, py, zoom, dpr, rising.get(o.id));
      else drawSprite(ctx, sprite, px, py, zoom, dpr);
      sprites++;
```

(The clip is in device px from the sprite canvas's bottom edge. The sprite cache buckets zoom, so `k` rescales from the bucket's scale to the real one exactly as `drawSprite` does.)

**3d. `src/ui/placement.js`.** In `confirm`, replace:

```js
      if (!result.ok) return result;
      assignLabour(world);
      if (effects) effects.puff(cx, cy, now());
```

with:

```js
      if (!result.ok) return result;
      assignLabour(world);
      if (effects) {
        const at = now();
        effects.puff(cx, cy, at);
        if (t.kind === 'building') effects.rise(result.id, s.ghost.x, s.ghost.y, BUILDINGS[t.type].w, BUILDINGS[t.type].d, at);   // the work-gang settle
      }
```

**3e. `src/ui/createUI.js`.** In `render`, replace:

```js
      view: v, walkers: walkersAt(world, timeDays, range), effects, now: t, grid: isToolMode(s.mode),
```

with:

```js
      view: v, walkers: walkersAt(world, timeDays, range), effects, now: t, rising: effects.risingIds(t), grid: isToolMode(s.mode),
```

(`t` is the loop's frame timestamp, the same clock as `placement`'s `now()`, which is `performance.now()`.)

- [ ] **Step 4: Run the tests to see them pass**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "rise >"
```

Expected: `7 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

Search: `git grep -n -e "effects: {" -e "puff" -e "FIGURE_KINDS" -e "EFFECT_MS" -- tests`.

- `tests/ui/placement.test.js` stubs `effects` with only `puff`, so a building confirm would now throw `effects.rise is not a function`. Its farm test pins the call order. In `rig()`, replace:

  ```js
    const pl = createPlacement({ world, store, afterCommand: (e) => log.push(e.kind), effects: { puff: () => log.push('puff') }, now: () => 0 });
  ```

  with:

  ```js
    const pl = createPlacement({ world, store, afterCommand: (e) => log.push(e.kind), effects: { puff: () => log.push('puff'), rise: () => log.push('rise') }, now: () => 0 });
  ```

  and in 'warns when a farm has no granary in reach, and places it on confirm', replace:

  ```js
      expect(log).toEqual(['puff', 'building']);
  ```

  with:

  ```js
      expect(log).toEqual(['puff', 'rise', 'building']);
  ```

  The road (`['puff', 'road']`) and plots/demolish (`['puff', 'houses', 'puff', 'demolish']`) expectations stay as they are, and now also prove those tools do not rise.
- Nothing else needs a change:
  - `tests/render/figuresArt.test.js` loops over `FIGURE_KINDS`, so it checks `hauler` too: ink, a distinct look, the shared bounds, and `FIGURE_ART` size equal to `FIGURE_KINDS.length`. It passes.
  - `tests/render/effects.test.js` uses its own effect kinds.
  - `tests/ui/carryovers.test.js` counts a pulse only.
  - The other `createPlacement` callers (`confirmBar`, `panels`, `sheets` tests) pass no `effects`, and `confirm` skips the block when `effects` is null.
  - `renderer.test.js` passes no `rising`, which means none.

Run `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui placement"`. Expected: `ALL PASSED`.

- [ ] **Step 6: Visual check**

Headless Edge reports reduced motion, so the eval switches it off, places a temple on the nearest free spot to the camera, and puts the tool away. Run from `C:\dev\thebes` in PowerShell:

```powershell
$ev = '(async () => { const t = window.__thebes; t.ui.settings.set({ reducedMotion: `off` }); const m = await import(`./src/sim/commands.js`); const c = { x: Math.round(t.cam.x), y: Math.round(t.cam.y) }; let spot = null; for (let r = 0; r < 14 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) { if (m.canPlace(t.world, `temple`, c.x + dx, c.y + dy).ok) spot = { x: c.x + dx, y: c.y + dy }; } t.ui.placement.start({ kind: `building`, type: `temple` }); t.ui.placement.moveGhost(spot.x, spot.y); t.ui.placement.confirm(); t.ui.placement.cancel(); return `${spot.x},${spot.y}`; })()'
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7&sample=1' -Out docs/superpowers/notes/screenshots/raw/t07-rise-1280.png -Width 1280 -Height 800 -BudgetMs 150 -Eval $ev
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7&sample=1' -Out docs/superpowers/notes/screenshots/raw/t07-rise-390.png -Width 390 -Height 844 -BudgetMs 150 -Eval $ev
```

What to look for: a temple near the middle of the view, caught part-built. Its lower walls are showing and its pylons and flags have not yet risen above a straight horizontal cut. Pale dust puffs sit along its two front edges. Two small workers, each holding a mud brick over their head, stand at the footprint's left and right corners. The "Temple placed" toast and the religion overlay legend are also on screen.

The capture time drifts by a few hundred ms from run to run. If the temple is already complete, rerun with `-BudgetMs 0`. If only the darkened footprint shows, rerun with `-BudgetMs 300`.

- [ ] **Step 7: Full suite**

```powershell
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED` (7 more tests than before this task).

- [ ] **Step 8: Commit**

```powershell
git add src/render/art/figures.js src/render/effects.js src/render/renderer.js src/ui/placement.js src/ui/createUI.js tests/render/rise.test.js tests/helpers/uiWorld.js tests/ui/placement.test.js tests/all.js sw-files.js
git commit -m "Raise each placed building with a two-hauler work gang" -m "Confirming a building now raises it from the ground over 900 ms: the renderer reveals its sprite bottom-up and grows its shadow, while two haulers with mud bricks bob at its front corners in a little dust. Roads, plots and demolish only puff as before, and under reduced motion the building simply appears. The hauler is a new figure kind for the Stage 4 monument crews." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: Placement that lands and explains

**Files:**
- Modify: `src/data/ui.js` (`NEAREST_FIT_RADIUS`), `src/sim/housing.js` (`homesServedFrom`), `src/ui/text.js` (`effectText`, `T.noHomesInReach`), `src/ui/placement.js` (`nearestFit`, `start()` uses it, `toolPreview().effect`), `src/ui/confirmBar.js` (effect line, rotate only for rotating buildings, publishes `--confirm-h`), `src/ui/createUI.js` (`pick` keeps the ghost in view, Show me lands on a fit, `placingInsets`, `destroy` clears `--confirm-h`), `css/ui.css` (compact bar rows, dialog wrap, portrait corners above the bar), `sw-files.js` (regenerated)
- Test: Create `tests/ui/placementFit.test.js`. Modify `tests/all.js`, `tests/ui/placement.test.js`, `tests/ui/confirmBar.test.js`, `tests/ui/panels.test.js`, `tests/ui/goalsList.test.js`

**Interfaces:**
- Consumes: `canPlace` (`src/sim/commands.js`); `roadReach`, `reachDistance` (`src/sim/reach.js`); `housesOf` (`src/sim/world.js`); `snapGhost`, `toolPreview`, `createPlacement` (existing, `src/ui/placement.js`, whose `confirm()` already calls Task 7's `effects.rise`; this task does not touch `confirm()`); `cameraControl.keepVisible`; `showMeTarget` (`src/ui/goalsList.js`); `toolForItem` (`src/data/ui.js`); `plural`, `T` (`src/ui/text.js`).
- Produces:
  - `NEAREST_FIT_RADIUS = 10` (`src/data/ui.js`).
  - `nearestFit(world, tool, x, y, maxR = NEAREST_FIT_RADIUS) → { x, y }` (`src/ui/placement.js`). For a building tool it searches Chebyshev rings 0..maxR around `snapGhost(world, tool, x, y)`. Within a ring it orders tiles by squared distance, then row (top first), then column (left first). The first clean `canPlace` wins anywhere in reach; otherwise it takes the first ok-with-warnings fit; otherwise the snapped point. A non-building tool returns the snapped point.
  - `placement.start(tool, centre)`: a building ghost lands on `nearestFit(world, tool, centre.x, centre.y)`.
  - `homesServedFrom(world, type, x, y) → number` (`src/sim/housing.js`): the housing plots (any tier, empty included) within `BUILDINGS[type].reach` road tiles of a probe footprint at (x, y), by the `coveredBy` rule. Returns 0 for types without `reach`.
  - `toolPreview(world, state).effect: string` on every preview. Building ok/warn: `effectText(type, homesServedFrom(...))` when the type has `reach`, else ''. Everything else: ''.
  - `effectText(type, n)` (`src/ui/text.js`): well "Gives water to N homes", bazaar "Feeds N homes", temple "Serves N homes", "1 home" when n = 1, `T.noHomesInReach` ("No homes in reach yet") when n = 0, '' for any other type.
  - Confirm bar:
    - `.effect.small.teal` line when `p.state === 'ok' && p.effect`.
    - `.rotate` button only when `BUILDINGS[tool.type].rotates`. No Stage 1 building rotates.
    - The bar's height is published as `--confirm-h` on `document.body` (removed while hidden).
  - `createUI`:
    - `pick(item)` pans with `keepVisible` when the fitted ghost lands off screen.
    - Show me starts the goal's tool at the target, so a building ghost lands on `nearestFit` there.
    - A goal with `showMe: null` opens the city summary (Task 11 later moves all of this onto `showMeAt`).

- [ ] **Step 1: Write the failing tests**

`tests/ui/placementFit.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { nearestFit, createPlacement } from '../../src/ui/placement.js';
import { createConfirmBar } from '../../src/ui/confirmBar.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { homesServedFrom } from '../../src/sim/housing.js';
import { canPlace } from '../../src/sim/commands.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { NEAREST_FIT_RADIUS } from '../../src/data/ui.js';
import { screenToTile, tileToScreen } from '../../src/render/camera.js';
import { effectText, T } from '../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';
import { uiWorld, rigUI } from '../helpers/uiWorld.js';
import { mount, fire } from '../helpers/dom.js';

const WELL = { kind: 'building', type: 'well' };
const FARM = { kind: 'building', type: 'farm_grain' };
const TEMPLE = { kind: 'building', type: 'temple' };

// A road along y = 10 across a 32 x 32 map; fertile land on x < 8 (makeTestWorld's default).
function street() {
  const w = makeTestWorld({ gold: 1000 });
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('ui placement fit', () => {
  it('lands a ghost on the nearest free tile beside a road, ten tiles out at most', () => {
    const w = street();
    expect(NEAREST_FIT_RADIUS).toBe(10);
    expect(nearestFit(w, WELL, 12, 9)).toEqual({ x: 12, y: 9 });               // it fits where it is: it stays
    expect(nearestFit(w, WELL, 12.4, 2.2)).toEqual({ x: 12, y: 9 });           // seven rows above the road: straight down to it
    addRaw(w, 'well', 12, 9);
    expect(nearestFit(w, WELL, 12, 9)).toEqual({ x: 11, y: 9 });               // taken: the nearest free tile (ties go up, then left)
    expect(nearestFit(w, WELL, 30, 30, 3)).toEqual({ x: 30, y: 30 });          // nothing within three tiles: the snapped point, so the bar says why
    expect(nearestFit(w, WELL, 40, -2, 2)).toEqual({ x: 31, y: 0 });           // snapped onto the map first
    expect(nearestFit(w, { kind: 'road' }, 4.6, 7.2)).toEqual({ x: 5, y: 7 }); // line and area tools only snap
  });
  it('keeps the whole footprint free and on the map', () => {
    const w = street();
    addRaw(w, 'house', 20, 11);
    addRaw(w, 'house', 21, 11);
    const at = nearestFit(w, TEMPLE, 20, 11);
    expect(at).toEqual({ x: 18, y: 11 });                                       // two tiles left: clear of both plots, still on the road
    expect(canPlace(w, 'temple', at.x, at.y).ok).toBe(true);
    const edge = nearestFit(w, TEMPLE, 31, 11);
    expect(edge).toEqual({ x: 30, y: 11 });                                     // a 2 x 2 never hangs off the right edge
  });
  it('prefers a clean fit to one with a warning, and takes a warned fit when nothing is clean', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);                                                  // road A
    setRoad(w, 0, 20, 31, 20);                                                  // road B, not joined to road A
    expect(nearestFit(w, FARM, 3, 18)).toEqual({ x: 3, y: 18 });               // no granary anywhere: the warned fit right here
    addRaw(w, 'granary', 10, 11);                                               // on road A
    expect(canPlace(w, 'farm_grain', 3, 18).warnings).toEqual(['no_storage']);
    expect(nearestFit(w, FARM, 3, 18)).toEqual({ x: 3, y: 11 });               // seven rows up on road A, where its grain has somewhere to go
  });
  it('counts the homes a service would reach from a spot, by the coverage rule', () => {
    const w = street();
    addRaw(w, 'house', 5, 9);                                                   // an empty plot counts
    addRaw(w, 'house', 8, 9, { tier: 1, residents: 4 });                        // five road tiles from a well at (4, 11)
    addRaw(w, 'house', 9, 9, { tier: 1, residents: 4 });                        // six: one too far for a well
    addRaw(w, 'house', 6, 20);                                                  // no road at all
    expect(homesServedFrom(w, 'well', 4, 11)).toBe(2);
    expect(homesServedFrom(w, 'temple', 4, 11)).toBe(3);
    expect(homesServedFrom(w, 'bazaar', 4, 11)).toBe(3);
    expect(homesServedFrom(w, 'granary', 4, 11)).toBe(0);                       // no reach of its own
    expect(homesServedFrom(w, 'well', 4, 14)).toBe(0);                          // touches no road
  });
  it('says what a service will do from the ghost, in plain words', () => {
    expect(effectText('well', 6)).toBe('Gives water to 6 homes');
    expect(effectText('bazaar', 1)).toBe('Feeds 1 home');
    expect(effectText('temple', 2)).toBe('Serves 2 homes');
    expect(effectText('well', 0)).toBe(T.noHomesInReach);
    expect(effectText('farm_grain', 3)).toBe('');
    const world = uiWorld();                                                    // huts at (12, 9) and (13, 9) on the road at y = 10
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world, store });
    pl.start(WELL, { x: 14, y: 9 });
    expect(store.get().ghost).toEqual({ x: 14, y: 9 });
    expect(pl.preview().effect).toBe('Gives water to 2 homes');
    pl.start(TEMPLE, { x: 16, y: 8 });
    expect(store.get().ghost).toEqual({ x: 16, y: 8 });
    expect(pl.preview().effect).toBe('Serves 2 homes');
    pl.start({ kind: 'road' });
    expect(pl.preview().effect).toBe('');
    pl.start(WELL, { x: 14, y: 9 });
    pl.moveGhost(14, 20);                                                       // no road there: blocked
    expect(pl.preview().state).toBe('bad');
    expect(pl.preview().effect).toBe('');
  });
  it('puts the effect in the bar in teal, and shows rotate only for buildings that rotate', () => {
    const { root, cleanup } = mount();
    try {
      const world = uiWorld();
      const store = createStore(INITIAL_UI_STATE);
      const placement = createPlacement({ world, store });
      const bar = createConfirmBar({ container: root, store, placement, onCancel() {}, onConfirm() {}, onUndo() {} });
      placement.start(WELL, { x: 14, y: 9 });
      const effect = root.querySelector('.confirm .effect');
      expect(effect.textContent).toBe('Gives water to 2 homes');
      expect(effect.classList.contains('teal')).toBe(true);
      expect(root.querySelector('.rotate')).toBe(null);                         // nothing rotates in Stage 1
      placement.moveGhost(14, 20);                                              // no road: the reason takes the line
      expect(root.querySelector('.confirm .effect')).toBe(null);
      expect(root.querySelector('.reason').classList.contains('coral')).toBe(true);
      BUILDINGS.well.rotates = true;                                            // borrow the well to see the button come back
      try { bar.render(); expect(root.querySelector('.rotate')).toBeTruthy(); } finally { delete BUILDINGS.well.rotates; }
      bar.render();
      expect(root.querySelector('.rotate')).toBe(null);
      placement.cancel();
    } finally { cleanup(); }
  });
  it('brings a ghost that landed off screen into view', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.settings.set({ reducedMotion: 'on' });                               // the view jumps, so the test can read it at once
      const v = { width: 390, height: 844 };
      const c = screenToTile(r.cam, v, v.width / 2, v.height * 0.4);          // where a picked card's ghost starts
      r.cam.x += 20.2 - c.x; r.cam.y += 1.2 - c.y;                              // aim that point at (20, 1): eight rows above the road
      const before = { x: r.cam.x, y: r.cam.y };
      r.store.set({ category: 'services', dock: 'tray' });
      fire(r.root.querySelector('#dock .tray .card[data-item="well"]'), 'click');
      expect(r.store.get().ghost).toEqual({ x: 20, y: 9 });
      expect(r.cam.x === before.x && r.cam.y === before.y).toBe(false);
      const [sx, sy] = tileToScreen(r.cam, v, 20.5, 9.5);
      expect(sx >= 0 && sx <= v.width && sy >= 0 && sy <= v.height).toBe(true);
    } finally { r.cleanup(); }
  });
  it('gives the bar its own row for words in compact, and stacks the corners above it in portrait at 100% and 150%', async () => {
    const compact = await rigUI({ width: 844, height: 390 });
    try {
      compact.ui.placement.start(WELL, { x: 14, y: 9 });
      const info = compact.root.querySelector('#confirm .info').getBoundingClientRect();
      const ok = compact.root.querySelector('#confirm .ok').getBoundingClientRect();
      expect(info.width).toBeGreaterThanOrEqual(200);
      expect(ok.top).toBeGreaterThanOrEqual(info.bottom - 0.5);                // the buttons sit on a row of their own
    } finally { compact.cleanup(); }
    for (const size of [100, 150]) {
      const r = await rigUI({ width: 390, height: 844 });
      try {
        r.ui.settings.set({ textSize: size });
        r.ui.placement.start(WELL, { x: 14, y: 9 });
        expect(r.root.querySelector('#confirm .effect').textContent).toBe('Gives water to 2 homes');
        const bar = r.root.querySelector('#confirm').getBoundingClientRect();
        const corners = r.root.querySelector('#corners').getBoundingClientRect();
        expect(corners.height).toBeGreaterThan(0);
        expect([size, corners.bottom <= bar.top + 0.5]).toEqual([size, true]);
      } finally { r.cleanup(); }
    }
  });
  it('lets the confirm dialog buttons wrap at large text', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.store.set({ confirmDialog: { text: T.newCityConfirm, confirmLabel: T.startNewCity, extraLabel: T.exportFirst, onConfirm() {}, onExtra() {} } });
      expect(getComputedStyle(r.root.querySelector('#dialog .buttons')).flexWrap).toBe('wrap');
      const box = r.root.querySelector('#dialog .box').getBoundingClientRect();
      for (const b of r.root.querySelectorAll('#dialog .buttons button')) {
        const rc = b.getBoundingClientRect();
        expect([b.textContent, rc.right <= box.right + 0.5, rc.height < 60]).toEqual([b.textContent, true, true]);   // one line each, inside the box
      }
    } finally { r.cleanup(); }
  });
});
```

In `tests/all.js`, directly after `import './ui/placement.test.js';`, add:
```js
import './ui/placementFit.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "placement fit"`
Expected: output starts with `LOAD ERROR` and a SyntaxError that names a missing export: `nearestFit`, `homesServedFrom`, `effectText` or `NEAREST_FIT_RADIUS`, whichever the engine reports first. Exit code 1.

- [ ] **Step 3: Implement**

`src/data/ui.js`: replace
```js
export const AUTO_OVERLAY = { well: 'water', bazaar: 'food', temple: 'religion' };
```
with
```js
export const AUTO_OVERLAY = { well: 'water', bazaar: 'food', temple: 'religion' };

// Picking a card or Show me puts a building ghost on the nearest tile where it fits, at most this many tiles
// out (early-game pass 2.6). Only when nothing fits does it stay on the point itself.
export const NEAREST_FIT_RADIUS = 10;
```

`src/sim/housing.js`: insert this function directly after the `computeCoverage` function (the one that ends `  return cov;\n}`). The file already imports `BUILDINGS`, `housesOf`, `roadReach` and `reachDistance`.
```js
// How many housing plots (any tier, empty ones too) a service of this type placed at (x, y) would reach along
// the roads: the coveredBy rule applied to a building that is not there yet (early-game pass 2.6).
export function homesServedFrom(world, type, x, y) {
  const def = BUILDINGS[type];
  if (!def || !def.reach) return 0;
  const reach = roadReach(world, { x, y, w: def.w, d: def.d }, def.reach);
  let n = 0;
  for (const h of housesOf(world)) if (reachDistance(reach, world, h) <= def.reach) n++;
  return n;
}
```

`src/ui/text.js`: replace
```js
export const warningText = (code) => WARNINGS[code] || "Won't work yet";
```
with
```js
export const warningText = (code) => WARNINGS[code] || "Won't work yet";

// What a service will do from the ghost's spot (early-game pass 2.6), counted by homesServedFrom.
const EFFECTS = { well: (homes) => `Gives water to ${homes}`, bazaar: (homes) => `Feeds ${homes}`, temple: (homes) => `Serves ${homes}` };
export function effectText(type, n) {
  if (!EFFECTS[type]) return '';
  return n > 0 ? EFFECTS[type](plural(n, 'home', 'homes')) : T.noHomesInReach;
}
```
In the same file, replace
```js
  hoverHint: 'Hover a building or pick a card',
```
with
```js
  hoverHint: 'Hover a building or pick a card',
  noHomesInReach: 'No homes in reach yet',
```

`src/ui/placement.js`: replace the two imports
```js
import { AUTO_OVERLAY } from '../data/ui.js';
import { buildingName, reasonText, warningText, plural, T } from './text.js';
```
with
```js
import { AUTO_OVERLAY, NEAREST_FIT_RADIUS } from '../data/ui.js';
import { homesServedFrom } from '../sim/housing.js';
import { buildingName, reasonText, warningText, effectText, plural, T } from './text.js';
```
Replace the `snapGhost` function
```js
export function snapGhost(world, tool, x, y) {
  const { w, d } = footprintOf(tool);
  return { x: Math.max(0, Math.min(world.size - w, Math.round(x))), y: Math.max(0, Math.min(world.size - d, Math.round(y))) };
}
```
with
```js
export function snapGhost(world, tool, x, y) {
  const { w, d } = footprintOf(tool);
  return { x: Math.max(0, Math.min(world.size - w, Math.round(x))), y: Math.max(0, Math.min(world.size - d, Math.round(y))) };
}

// The tiles at Chebyshev distance r from (cx, cy): nearest first, then the upper row, then the left column, so
// the search below is deterministic.
function ringTiles(cx, cy, r) {
  if (r === 0) return [[cx, cy]];
  const out = [];
  for (let k = -r; k <= r; k++) out.push([k, -r], [k, r]);
  for (let k = -r + 1; k <= r - 1; k++) out.push([-r, k], [r, k]);
  out.sort((a, b) => (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]) || a[1] - b[1] || a[0] - b[0]);
  return out.map(([dx, dy]) => [cx + dx, cy + dy]);
}

// Where a picked building's ghost lands (early-game pass 2.6): the nearest origin, in rings out to maxR
// tiles around the snapped point, where it can be placed. A clean fit anywhere in reach beats a fit with a
// warning; with no fit at all the snapped point stays, so the bar can say why. Line and area tools only snap.
export function nearestFit(world, tool, x, y, maxR = NEAREST_FIT_RADIUS) {
  const start = snapGhost(world, tool, x, y);
  if (!tool || tool.kind !== 'building') return start;
  let warned = null;
  for (let r = 0; r <= maxR; r++) {
    for (const [tx, ty] of ringTiles(start.x, start.y, r)) {
      const c = canPlace(world, tool.type, tx, ty);           // off-map origins fail here as out_of_bounds
      if (!c.ok) continue;
      if (!c.warnings.length) return { x: tx, y: ty };
      if (!warned) warned = { x: tx, y: ty };
    }
  }
  return warned || start;
}
```
Replace the two helper lines `const idle = …` and `const bad = …` and the whole `toolPreview` function (from `const idle` down to the `}` that closes `toolPreview`) with:
```js
const idle = (text, tiles = []) => ({ state: 'idle', reason: null, warnings: [], text, effect: '', cost: 0, count: 0, tiles, refund: 0 });
const bad = (reason, cost, count, tiles = []) => ({ state: 'bad', reason, warnings: [], text: reasonText(reason), effect: '', cost, count, tiles, refund: 0 });

export function toolPreview(world, state) {
  const { tool } = state;
  if (!tool) return null;
  if (tool.kind === 'building') {
    const def = BUILDINGS[tool.type];
    if (!state.ghost) return idle('');
    const { x, y } = state.ghost;
    const r = canPlace(world, tool.type, x, y);
    if (!r.ok) return bad(r.reason, def.cost, 1);
    const warn = r.warnings.length > 0;
    // A service says how many homes it would reach from here (early-game pass 2.6); other buildings say nothing.
    const effect = def.reach ? effectText(tool.type, homesServedFrom(world, tool.type, x, y)) : '';
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: warn ? warningText(r.warnings[0]) : '', effect, cost: def.cost, count: 1, tiles: [], refund: 0 };
  }
  if (tool.kind === 'road') {
    const l = state.line;
    if (!l) return idle(T.tapStart);
    if (l.x1 === null) return idle(T.tapEnd, [[l.x0, l.y0]]);
    const tiles = roadPath(l.x0, l.y0, l.x1, l.y1, l.flip);
    const r = previewRoad(world, l.x0, l.y0, l.x1, l.y1, l.flip);
    if (!r.ok) return bad(r.reason, r.cost, r.tiles.length, tiles);
    if (!r.tiles.length) return bad('nothing_to_place', 0, 0, tiles);
    return { state: 'ok', reason: null, warnings: [], text: plural(r.tiles.length, 'tile', 'tiles'), effect: '', cost: r.cost, count: r.tiles.length, tiles, refund: 0 };
  }
  const a = state.area;
  if (!a) return idle(T.tapStart);
  if (a.x1 === null) return idle(T.tapCorner, [[a.x0, a.y0]]);
  if (tool.kind === 'houses') {
    const r = previewHouses(world, a.x0, a.y0, a.x1, a.y1);
    const tiles = r.positions.map(([x, y]) => [x, y]);
    if (!r.ok) return bad(r.reason, r.cost, r.positions.length, tiles);
    const warn = r.warnings.length > 0;
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: warn ? warningText(r.warnings[0]) : plural(r.positions.length, 'plot', 'plots'), effect: '', cost: r.cost, count: r.positions.length, tiles, refund: 0 };
  }
  const r = previewDemolishArea(world, a.x0, a.y0, a.x1, a.y1);
  const count = r.buildingIds.length + r.roadTiles.length;
  const tiles = rectTiles(a.x0, a.y0, a.x1, a.y1, world.size);
  if (!count) return bad('nothing_here', 0, 0, tiles);
  return { state: 'ok', reason: null, warnings: [], text: `${plural(count, 'item', 'items')} · ${T.refund} ${r.refund}`, effect: '', cost: -r.refund, count, tiles, refund: r.refund };
}
```
In `createPlacement`, replace
```js
    start(tool, centre = null) {
      store.set(startToolPatch(store.get(), tool));
      if (tool.kind === 'building') {
        if (centre) api.moveGhost(centre.x, centre.y);
        if (AUTO_OVERLAY[tool.type]) store.set({ overlay: AUTO_OVERLAY[tool.type] });
      }
    },
```
with
```js
    start(tool, centre = null) {
      store.set(startToolPatch(store.get(), tool));
      if (tool.kind === 'building') {
        if (centre) { const at = nearestFit(world, tool, centre.x, centre.y); api.moveGhost(at.x, at.y); }   // early-game pass 2.6
        if (AUTO_OVERLAY[tool.type]) store.set({ overlay: AUTO_OVERLAY[tool.type] });
      }
    },
```
Leave `confirm()` (with Task 7's `effects.rise`) untouched.

`src/ui/confirmBar.js`: replace the whole file with:
```js
// The confirm bar for placing, drawing and demolishing (spec 6.4-6.5): name, cost, the reason when blocked,
// what a service will do from the ghost's spot (early-game pass 2.6), rotate for buildings that rotate, Flip
// for roads, Undo, x and the tick. It never tucks away.
import { BUILDINGS } from '../data/buildings.js';
import { isToolMode } from './modes.js';
import { buildingName, T } from './text.js';
import { el, button, iconButton, clear } from './components.js';

const titleOf = (tool) => (tool.kind === 'building' ? buildingName(tool.type) : tool.kind === 'road' ? buildingName('road') : tool.kind === 'houses' ? T.housingPlots : T.demolish);
const rotates = (tool) => tool.kind === 'building' && Boolean(BUILDINGS[tool.type].rotates);   // none in Stage 1 (mastabas come with monuments)

export function createConfirmBar({ container, store, placement, onCancel, onConfirm, onUndo }) {
  const element = el('div', { id: 'confirm', hidden: true });
  container.append(element);

  // Portrait stacks the corner buttons on top of the bar, and the bar's words can wrap at large text sizes, so
  // its real height goes to --confirm-h on the body (css/ui.css). Hidden, it takes nothing.
  function publishHeight() {
    const h = element.hidden ? 0 : Math.ceil(element.getBoundingClientRect().height);
    if (h > 0) document.body.style.setProperty('--confirm-h', `${h}px`);
    else document.body.style.removeProperty('--confirm-h');
  }

  function render() {
    const s = store.get();
    // The bar rebuilds on every change, so remember which control had focus and put it back (spec 6.8).
    const focusedClass = element.contains(document.activeElement) ? [...document.activeElement.classList].find((c) => ['rotate', 'flip', 'undo', 'cancel', 'ok'].includes(c)) : null;
    clear(element);
    if (!isToolMode(s.mode) || !s.tool) { element.hidden = true; publishHeight(); return; }
    element.hidden = false;
    const p = placement.preview();
    const demolish = s.tool.kind === 'demolish';
    const costText = demolish ? (p.refund ? `${T.refund} ${p.refund}` : '') : (p.cost ? `${p.cost} gold` : '');
    const info = el('div', { class: 'info' }, [
      el('div', { class: 'title', text: titleOf(s.tool) }),
      el('div', { class: 'cost small muted', text: costText }),
      el('div', { class: `reason small ${p.state === 'bad' ? 'coral' : p.state === 'warn' ? 'amber' : 'muted'}`, text: p.text }),
      // The effect takes the empty reason line when there is nothing to warn about, so the bar never grows a line.
      p.state === 'ok' && p.effect ? el('div', { class: 'effect small teal', text: p.effect }) : null,
    ]);
    const controls = [];
    if (rotates(s.tool)) controls.push(iconButton(T.rotate, '⟳', { class: 'rotate', disabled: true }));
    if (s.tool.kind === 'road' && s.line && s.line.x1 !== null) controls.push(button(T.flip, { class: 'flip', onClick: () => placement.flip() }));
    controls.push(button(T.undo, { class: 'undo', disabled: !placement.canUndo(), onClick: onUndo }));
    controls.push(iconButton(T.cancel, '✕', { class: 'cancel', onClick: onCancel }));
    controls.push(iconButton(T.confirm, '✓', { class: `ok ${demolish ? 'danger' : 'primary'}`, disabled: p.state === 'bad' || p.state === 'idle', onClick: onConfirm }));
    element.append(el('div', { class: `confirm${demolish ? ' demolish' : ''}` }, [info, ...controls]));
    publishHeight();
    if (focusedClass) {
      const again = element.querySelector(`.${focusedClass}`);
      if (again && !again.disabled) again.focus();
    }
  }
  render();
  store.subscribe(render);
  return { render, element };
}
```

`src/ui/createUI.js`: replace
```js
  // A card was picked: the ghost appears a little above mid-screen, snapped onto the map (spec 6.5).
  function pick(item) {
    const v = view();
    const c = screenToTile(cam, v, v.width / 2, v.height * 0.4);
    placement.start(toolForItem(item), { x: c.x, y: c.y });
  }
  // Show me (spec 4.1): open the right card, then pan to and pulse the place the goal is about.
  function showMe(goal) {
    const s = store.get();
    if (s.sheet) store.set(closeSheet(s));
    store.set(pickCategory(store.get(), goal.showMe.category));
    pick(goal.showMe.item);
    const t = showMeTarget(world, goal);
    cameraControl.panTo(t.x, t.y);
    placement.moveGhost(Math.floor(t.x), Math.floor(t.y));   // a building ghost lands on the target, not at the old screen centre (ignored for road and plot tools)
    const at = now();
    for (let i = 0; i < SHOW_ME_PULSES; i++) effects.pulse(t.x, t.y, at + i * SHOW_ME_PULSE_MS);
  }
```
with
```js
  // A card was picked: the ghost starts a little above mid-screen and lands on the nearest tile where it fits
  // (spec 6.5, early-game pass 2.6). That tile can be up to ten tiles away, so the view follows it off screen.
  function pick(item) {
    const v = view();
    const c = screenToTile(cam, v, v.width / 2, v.height * 0.4);
    const tool = toolForItem(item);
    placement.start(tool, { x: c.x, y: c.y });
    const g = store.get().ghost;
    if (g && tool.kind === 'building') {
      const def = BUILDINGS[tool.type];
      cameraControl.keepVisible(g.x + def.w / 2, g.y + def.d / 2, placingInsets(store.get()));
    }
  }
  // Show me (spec 4.1): open the right card, then pan to and pulse the place the goal is about. A building
  // ghost lands on the nearest fit around the target (early-game pass 2.6). Task 11 moves this onto showMeAt.
  function showMe(goal) {
    const s = store.get();
    if (s.sheet) store.set(closeSheet(s));
    if (!goal.showMe) { store.set(openSheet(store.get(), 'summary')); return; }   // a city-wide goal (out of debt): the summary explains it
    store.set(pickCategory(store.get(), goal.showMe.category));
    const t = showMeTarget(world, goal);
    placement.start(toolForItem(goal.showMe.item), { x: Math.floor(t.x), y: Math.floor(t.y) });   // road and plot tools ignore the point
    cameraControl.panTo(t.x, t.y);
    const at = now();
    for (let i = 0; i < SHOW_ME_PULSES; i++) effects.pulse(t.x, t.y, at + i * SHOW_ME_PULSE_MS);
  }
```
Replace
```js
    return { top: TOPBAR_PX, right: PANEL_PX, bottom: 0, left: 0 };
  }
```
(the end of `sheetInsets`) with
```js
    return { top: TOPBAR_PX, right: PANEL_PX, bottom: 0, left: 0 };
  }
  // The map a tool leaves free: in portrait the confirm bar and the corner buttons on it cover the bottom.
  function placingInsets(s) {
    if (s.layout !== 'portrait') return sheetInsets(s);
    return { top: TOPBAR_PX, right: 0, bottom: Math.min(view().height * 0.3, 240), left: 0 };
  }
```
In `destroy()`, replace
```js
      confirmBar.element.remove();
```
with
```js
      confirmBar.element.remove();
      document.body.style.removeProperty('--confirm-h');   // the bar's published height goes with it
```
`openSheet`, `BUILDINGS` and `toolForItem` are already imported in `createUI.js`.

`css/ui.css`: replace
```css
#dialog .buttons { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
```
with
```css
#dialog .buttons { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin-top: 12px; }
```
Replace
```css
body[data-layout="portrait"][data-mode="placing"] #corners, body[data-layout="portrait"][data-mode="drawing"] #corners, body[data-layout="portrait"][data-mode="demolishing"] #corners { bottom: calc(var(--safe-bottom) + 104px); }
```
with
```css
/* The corners sit on the confirm bar by its measured height (--confirm-h, set by confirmBar.js), whatever the text size. */
body[data-layout="portrait"][data-mode="placing"] #corners, body[data-layout="portrait"][data-mode="drawing"] #corners, body[data-layout="portrait"][data-mode="demolishing"] #corners { bottom: calc(var(--confirm-h, calc(var(--safe-bottom) + 96px)) + 8px); }
```
Append to the end of the file:
```css
/* Placement that explains (early-game pass 2.6). Compact: the bar is a narrow column beside the rail, so its words
   get a row of their own above the buttons and never wrap one word per line. */
body[data-layout="compact"] .confirm { flex-wrap: wrap; justify-content: flex-end; }
body[data-layout="compact"] .confirm .info { flex: 1 0 100%; }
```
The `.effect` line uses the existing `.small` and `.teal` classes. Teal `#1F6F66` on parchment `#F3E7CB` is 4.9:1.

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "placement fit"`
Expected: nine `PASS ui placement fit > …` lines, `9 passed, 0 failed`, `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

Building ghosts no longer stay on the start point when it does not fit, and Show me no longer drops the ghost on an occupied target tile. Four tests pinned the old behaviour. No existing test asserts on the rotate button, so `confirmBar.test.js` needs only the ghost fix.

1. `tests/ui/placement.test.js`, first test: the well started at (40, -2) now walks nine rows down to the road. Replace
```js
    expect(store.get().ghost).toEqual({ x: 31, y: 0 });
```
with
```js
    expect(store.get().ghost).toEqual({ x: 31, y: 9 });           // snapped onto the map, then down to the nearest tile where it fits
```
The farm test is unchanged: with no granary every farm spot warns, so the warned fit at the start point (2, 8) wins.

2. `tests/ui/confirmBar.test.js`, first test: replace
```js
    r.placement.start({ kind: 'building', type: 'well' }, { x: 5, y: 20 });
    r.bar.render();
```
with
```js
    r.placement.start({ kind: 'building', type: 'well' }, { x: 5, y: 20 });
    r.placement.moveGhost(5, 20);                                  // the start lands on the nearest fit; put the ghost back where nothing fits
    r.bar.render();
```

3. `tests/ui/panels.test.js`, rail test: replace
```js
    placement.start({ kind: 'building', type: 'well' }, { x: 5, y: 20 });
    expect(root.querySelector('.bottom').hidden).toBe(false);
```
with
```js
    placement.start({ kind: 'building', type: 'well' }, { x: 5, y: 20 });
    placement.moveGhost(5, 20);                                    // the start lands on the nearest fit; put the ghost back where nothing fits
    expect(root.querySelector('.bottom').hidden).toBe(false);
```
(The second `placement.start(... { x: 5, y: 20 })` in that test asserts nothing about the ghost; leave it.)

4. `tests/ui/goalsList.test.js`, last test ("Show me puts a building ghost on the target"). The well goal's target, the mean of the huts, is (13, 9), the hut's own tile. Show me now steps around it. Add a new import line directly after `import { describe, it, expect } from '../harness.js';`:
```js
import { nearestFit } from '../../src/ui/placement.js';
```
and replace
```js
    expect(r.store.get().ghost).toEqual({ x: Math.floor(t.x), y: Math.floor(t.y) });
```
with
```js
    expect(r.store.get().ghost).toEqual(nearestFit(r.world, { kind: 'building', type: 'well' }, Math.floor(t.x), Math.floor(t.y)));
    expect(r.ui.placement.preview().state).toBe('ok');             // the hut on the target tile is stepped around
```

The following were checked and still pass without edits:
- `createUI.test.js`: they tap (5, 9) after picking.
- `a11y.test.js`: the aimed point (5, 9) fits, so the ghost stays.
- `sfx.test.js` and `pwa.test.js`: they only start and cancel a tool.

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui placement"`, then `-Grep "ui confirm bar"`, `-Grep "ui panels"`, `-Grep "ui goals"`. Each ends `ALL PASSED`.

- [ ] **Step 6: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```
Expected: `Wrote sw-files.js: …`, then every test PASS, nine more than before this task, and `ALL PASSED`.

- [ ] **Step 7: Commit**

```powershell
git add src/data/ui.js src/sim/housing.js src/ui/text.js src/ui/placement.js src/ui/confirmBar.js src/ui/createUI.js css/ui.css sw-files.js tests/ui/placementFit.test.js tests/ui/placement.test.js tests/ui/confirmBar.test.js tests/ui/panels.test.js tests/ui/goalsList.test.js tests/all.js
git commit -m "Land the ghost where it fits and say what a service will do" -m "Picking a card or Show me puts a building ghost on the nearest tile where it fits, up to ten tiles out and a clean fit first, and the view follows it. The confirm bar says how many homes a well, bazaar or temple would reach, shows rotate only for buildings that rotate, gives its words their own row in compact and lifts the corner buttons by its real height. Confirm dialog buttons wrap at large text." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Cards with pictures, tinted tabs, hidden empty categories

**Files:**
- Create: `src/ui/thumbs.js`
- Modify: `src/data/ui.js` (`CATEGORY_TINT`, `visibleCategories`), `src/ui/cards.js` (picture, name, cost with a coin), `src/ui/dock.js`, `src/ui/sidePanel.js`, `src/ui/rail.js` (visible categories only, `data-category`, `--tint`), `src/ui/createUI.js` (number keys ignore hidden categories), `css/ui.css`, `sw-files.js` (regenerated; `src/ui/thumbs.js` joins the cache list)
- Test: Create `tests/ui/cardThumbs.test.js`. Modify `tests/all.js`, `tests/ui/dock.test.js`, `tests/ui/panels.test.js`, `tests/ui/createUI.test.js`, `tests/ui/carryovers.test.js`, `tests/ui/pwa.test.js`, `tests/ui/a11y.test.js`, `tests/audio/sfx.test.js`

**Interfaces:**
- Consumes:
  - `ART` from `src/render/art/registry.js`. The plain `granary`, `bazaar` and `farm_grain` slots stay after Task 6, and `house.t3` exists.
  - `makeDraw` (`src/render/art/ctx.js`) and `p` (`src/render/iso.js`).
  - `TERRAIN`, `SHADOW`, `ROCK`, `RED` and `UI` (`src/render/art/palette.js`).
  - `CATEGORIES`, `CATEGORY_ICONS` and `cardInfo`.
- Produces:
  - `src/ui/thumbs.js`:
    - `THUMB_W = 56` and `THUMB_H = 40` (CSS px).
    - `drawThumb(canvas, item, dpr = 1) → canvas`. It sizes the backing store to `round(56·dpr) × round(40·dpr)` and draws the item's art fitted with its aspect ratio kept, centred.
    - Which art each item gets: `house` → `house.t3`; `road` → a drawn road strip; `demolish` → a drawn plot with rubble and a coral cross; any other item → its plain `ART` slot. An unknown item stays blank.
    - Each item × dpr is painted once and copied onto every card after that.
  - `src/data/ui.js`: `CATEGORY_TINT` (all seven ids), `visibleCategories()` → the `CATEGORIES` entries with at least one item. In Stage 1 that is roads, homes, food and services.
  - Card markup: `button.card[data-item]` holding `canvas.thumb[aria-hidden=true]`, then `span.name`, then `span.cost`.
    - The cost holds `span.coin[aria-hidden=true]` plus "30 gold".
    - Unaffordable cards keep `⊘ 30 gold`, locked cards keep `🔒 Unlocks at …`, and Demolish keeps "Refunds a quarter" with no coin.
  - Every dock `.cat`, rail `.cat` and panel `.tab` carries `data-category="<id>"` and the inline custom property `--tint: CATEGORY_TINT[id]`. CSS draws a 3 px band from it.
  - Number keys 1-7 keep their mapping (key N is `CATEGORIES[N - 1]`, as the spec's 2.5 says) and do nothing when that category is hidden, so the keys never shift when Stage 2 fills Industry. `HELP_ROWS` keeps "1 to 7".

- [ ] **Step 1: Write the failing tests**

`tests/ui/cardThumbs.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { drawThumb, THUMB_W, THUMB_H } from '../../src/ui/thumbs.js';
import { renderCards } from '../../src/ui/cards.js';
import { CATEGORIES, CATEGORY_TINT, visibleCategories } from '../../src/data/ui.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { HELP_ROWS } from '../../src/ui/text.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { mount, fire, key } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';
import { canvasHash } from '../helpers/canvas.js';

const inked = (c) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
  return n;
};
const ids = (nodes) => [...nodes].map((n) => n.dataset.category);
const SHOWN = ['roads', 'homes', 'food', 'services'];

describe('ui card pictures', () => {
  it('draws a picture for every Stage 1 card, sized for the screen', () => {
    const items = visibleCategories().flatMap((c) => c.items);
    expect(items).toEqual(['road', 'demolish', 'house', 'farm_grain', 'granary', 'well', 'bazaar', 'temple']);
    for (const item of items) {
      const c = drawThumb(document.createElement('canvas'), item, 1);
      expect([item, c.width, c.height]).toEqual([item, THUMB_W, THUMB_H]);
      expect([item, inked(c) > 150]).toEqual([item, true]);
    }
    const sharp = drawThumb(document.createElement('canvas'), 'well', 2);
    expect([sharp.width, sharp.height]).toEqual([THUMB_W * 2, THUMB_H * 2]);
    const again = drawThumb(document.createElement('canvas'), 'well', 2);
    expect(canvasHash(again)).toBe(canvasHash(sharp));                           // painted once, copied after
    expect(inked(drawThumb(document.createElement('canvas'), 'nothing', 1))).toBe(0);
  });
  it('puts the picture, the name and the cost with a coin on each card', () => {
    const { root, cleanup } = mount();
    try {
      const w = makeTestWorld({ gold: -400 });                                    // a well fits the debt floor; a temple does not
      const cards = renderCards(root, { world: w, category: 'services', onPick: () => {} });
      const thumb = cards[0].firstElementChild;
      expect([thumb.tagName, thumb.classList.contains('thumb'), thumb.getAttribute('aria-hidden')]).toEqual(['CANVAS', true, 'true']);
      expect(cards[0].querySelector('.name').textContent).toBe('Well');
      expect(cards[0].querySelector('.cost').textContent).toBe(`${BUILDINGS.well.cost} gold`);
      expect(cards[0].querySelector('.cost .coin').getAttribute('aria-hidden')).toBe('true');
      expect(cards[2].querySelector('.cost').textContent).toBe(`⊘ ${BUILDINGS.temple.cost} gold`);   // unaffordable keeps its mark and words
      expect(cards[2].querySelector('.coin')).toBe(null);
      renderCards(root, { world: makeTestWorld(), category: 'roads', onPick: () => {} });
      expect(root.querySelector('[data-item="demolish"] .cost').textContent).toBe('Refunds a quarter');
      expect(root.querySelector('[data-item="demolish"] .coin')).toBe(null);
      expect(root.querySelector('[data-item="demolish"] canvas.thumb')).toBeTruthy();
    } finally { cleanup(); }
  });
  it('shows only the categories with something to build, each with its colour band', async () => {
    expect(visibleCategories().map((c) => c.id)).toEqual(SHOWN);
    expect(Object.keys(CATEGORY_TINT).sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
    expect(HELP_ROWS.find((row) => row[0] === 'category')[2]).toBe('1 to 7');
    const r = await rigUI({ width: 390, height: 844 });
    try {
      expect(ids(r.root.querySelectorAll('#dock .cat'))).toEqual(SHOWN);
      expect(ids(r.root.querySelectorAll('#rail .cat'))).toEqual(SHOWN);
      expect(ids(r.root.querySelectorAll('#panel .tab'))).toEqual(SHOWN);
      for (const sel of ['#dock .cat', '#rail .cat', '#panel .tab']) {
        for (const b of r.root.querySelectorAll(sel)) expect([sel, b.style.getPropertyValue('--tint').trim()]).toEqual([sel, CATEGORY_TINT[b.dataset.category]]);
      }
      expect(getComputedStyle(r.root.querySelector('#dock .cat[data-category="food"]')).backgroundImage).toContain('gradient');
    } finally { r.cleanup(); }
  });
  it('keeps the number keys on their categories and ignores the hidden ones', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      key(r.root, '5');
      expect(r.store.get().category).toBe('services');
      expect(r.store.get().dock).toBe('tray');
      key(r.root, '3');
      expect(r.store.get().category).toBe('food');
      key(r.root, '4');                                                           // Industry is hidden in Stage 1: ignored
      expect(r.store.get().category).toBe('food');
      key(r.root, '7');                                                           // Monuments too
      expect(r.store.get().category).toBe('food');
    } finally { r.cleanup(); }
  });
  it('fits a tray of picture cards under the corner buttons at 100% and 150% text', async () => {
    for (const size of [100, 150]) {
      for (const category of ['services', 'homes']) {                            // three short cards; one long name that wraps
        const r = await rigUI({ width: 390, height: 844 });
        try {
          r.ui.settings.set({ textSize: size });
          fire(r.root.querySelector(`#dock .cat[data-category="${category}"]`), 'click');
          expect(r.store.get().dock).toBe('tray');
          const dock = r.root.querySelector('#dock').getBoundingClientRect();
          const corners = r.root.querySelector('#corners').getBoundingClientRect();
          const card = r.root.querySelector('#dock .tray .card').getBoundingClientRect();
          expect([size, category, corners.bottom <= dock.top + 0.5, card.bottom <= dock.bottom + 0.5]).toEqual([size, category, true, true]);
        } finally { r.cleanup(); }
      }
    }
  });
});
```

In `tests/all.js`, directly after `import './ui/cards.test.js';`, add:
```js
import './ui/cardThumbs.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "card pictures"`
Expected: `LOAD ERROR`. Either the module `src/ui/thumbs.js` cannot be fetched (a failed module import for `all.js`), or a SyntaxError names the missing export `visibleCategories` or `CATEGORY_TINT`. Exit code 1.

- [ ] **Step 3: Implement**

`src/ui/thumbs.js` (new):
```js
// Card pictures (early-game pass 2.5): each build card shows its building's own drawing, rendered from the art
// registry and fitted into a small canvas. Roads and demolish get small drawn icons of their own. Each picture
// is painted once per item and pixel ratio, then copied onto every card that shows it.
import { ART } from '../render/art/registry.js';
import { makeDraw } from '../render/art/ctx.js';
import { p } from '../render/iso.js';
import { TERRAIN, SHADOW, ROCK, RED, UI } from '../render/art/palette.js';

export const THUMB_W = 56;    // CSS px; css/ui.css sizes .card .thumb to match
export const THUMB_H = 40;

// A short stretch of road, drawn the way terrainRoads.js draws roads: shadow, edge, top, ruts and pebbles.
const ROAD_ICON = {
  bounds: [-8, 0, 40, 32],
  draw(g) {
    const path = [['M', p(0.5, 0.5)], ['L', p(2.5, 0.5)]];
    for (const [c, w, a] of [[SHADOW, 15, 0.12], [TERRAIN.roadEdge, 12, 1], [TERRAIN.road, 10, 1]]) g.stroke(path, c, w, a);
    const ruts = [];
    for (const o of [-0.12, 0.12]) ruts.push(['M', p(0.5, 0.5 + o)], ['L', p(2.5, 0.5 + o)]);
    g.stroke(ruts, TERRAIN.roadEdge, 0.7, 0.7);
    for (const [x, y, c] of [[0.9, 0.4, TERRAIN.roadPebble], [1.6, 0.65, TERRAIN.roadPebbleLight], [2.2, 0.45, TERRAIN.roadPebble]]) g.circ(p(x, y), 0.6, c);
  },
};

// A cleared plot with a little rubble under a coral cross.
const DEMOLISH_ICON = {
  bounds: [-18, -18, 18, 14],
  draw(g) {
    g.poly([[0, -2], [14, 5], [0, 12], [-14, 5]], TERRAIN.plot, { outline: true });
    for (const [x, y, s] of [[-6, 5, 3], [4, 3, 2.5], [2, 8, 2]]) g.poly([[x, y - s / 2], [x + s, y], [x, y + s / 2], [x - s, y]], ROCK[0], { outline: true });
    const arms = [[[-8, -14], [8, 0]], [[8, -14], [-8, 0]]];
    for (const [a, b] of arms) g.line(a, b, UI.halo, 5, 0.9);
    for (const [a, b] of arms) g.line(a, b, RED, 3);
  },
};

function artFor(item) {
  if (item === 'road') return ROAD_ICON;
  if (item === 'demolish') return DEMOLISH_ICON;
  const def = ART[item === 'house' ? 'house.t3' : item];      // a plot shows a Cottage, what it grows into
  return def && def.draw ? def : null;
}

// Fit the art's bounds into the canvas, keeping its aspect ratio, centred.
function paint(canvas, art, dpr) {
  canvas.width = Math.round(THUMB_W * dpr);
  canvas.height = Math.round(THUMB_H * dpr);
  if (!art) return;
  const [l, t, r, b] = art.bounds;
  const scale = Math.min(canvas.width / (r - l), canvas.height / (b - t));
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate((canvas.width - (r - l) * scale) / 2 - l * scale, (canvas.height - (b - t) * scale) / 2 - t * scale);
  art.draw(makeDraw(ctx, scale), 0, 0);
  ctx.restore();
}

const painted = new Map();   // `${item}@${dpr}` -> canvas

export function drawThumb(canvas, item, dpr = 1) {
  const key = `${item}@${dpr}`;
  let src = painted.get(key);
  if (!src) { src = document.createElement('canvas'); paint(src, artFor(item), dpr); painted.set(key, src); }
  canvas.width = src.width;       // also clears it
  canvas.height = src.height;
  canvas.getContext('2d').drawImage(src, 0, 0);
  return canvas;
}
```

`src/data/ui.js`: replace
```js
export const CATEGORY_ICONS = { roads: '═', homes: '⌂', food: '❋', industry: '⚒', services: '✚', defence: '⛊', monuments: '▲' };
```
with
```js
export const CATEGORY_ICONS = { roads: '═', homes: '⌂', food: '❋', industry: '⚒', services: '✚', defence: '⛊', monuments: '▲' };

// A thin band on each category button and tab in its buildings' emblem colour (early-game pass 2.5).
export const CATEGORY_TINT = { roads: '#B39466', homes: '#C9552F', food: '#6AA83A', industry: '#8E7470', services: '#2F6FA8', defence: '#9A3A30', monuments: '#E2B13C' };

// Categories with nothing to build stay hidden until a stage fills them; the number keys count only these.
export const visibleCategories = () => CATEGORIES.filter((c) => c.items.length > 0);
```

`src/ui/cards.js`: replace the whole file with:
```js
// Building cards (spec 6.3, early-game pass 2.5): the building's picture, its name and its cost with a coin;
// coral with a coin-slash when unaffordable; a lock and the unlock condition when locked. Shared by the dock
// tray, the side panel grid and the rail drawer.
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { isUnlocked } from '../sim/progression.js';
import { canAfford } from '../sim/money.js';
import { CATEGORIES } from '../data/ui.js';
import { buildingName, unlockText, T } from './text.js';
import { el, clear } from './components.js';
import { drawThumb } from './thumbs.js';

const deviceRatio = () => Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);

export function cardInfo(world, item) {
  let cost = 0, suffix = '', costText;
  if (item === 'road') { cost = ECONOMY.roadCost; suffix = ' per tile'; }
  else if (item === 'house') { cost = BUILDINGS.house.cost; suffix = ' per plot'; }
  else if (item !== 'demolish') cost = BUILDINGS[item].cost;
  costText = item === 'demolish' ? 'Refunds a quarter' : `${cost} gold${suffix}`;
  const locked = Boolean(BUILDINGS[item]) && !isUnlocked(world, item);
  return { item, name: buildingName(item), cost, costText, affordable: canAfford(world, cost), locked, lockText: locked ? unlockText(item) : '' };
}

export function activeItemOf(tool) {
  if (!tool) return null;
  if (tool.kind === 'building') return tool.type;
  if (tool.kind === 'houses') return 'house';
  return tool.kind;   // 'road' or 'demolish'
}

// Locked and unaffordable cards keep their words and marks; an affordable cost gets a coin (decoration only).
function costLine(info) {
  if (info.locked) return [`\u{1F512} ${info.lockText}`];
  if (!info.affordable) return [`⊘ ${info.costText}`];
  return info.cost ? [el('span', { class: 'coin', 'aria-hidden': 'true' }), info.costText] : [info.costText];
}

export function renderCards(container, { world, category, activeItem = null, onPick, grid = false }) {
  const focusedItem = container.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.item : null;
  clear(container);
  container.classList.toggle('grid', grid);
  const cat = CATEGORIES.find((c) => c.id === category);
  const items = cat ? cat.items : [];
  if (!items.length) { container.append(el('p', { class: 'empty', text: T.comingLater })); return []; }
  const dpr = deviceRatio();
  const buttons = items.map((item) => {
    const info = cardInfo(world, item);
    const cls = ['card', info.affordable ? '' : 'unaffordable', info.locked ? 'locked' : ''].filter(Boolean).join(' ');
    const thumb = drawThumb(el('canvas', { class: 'thumb', 'aria-hidden': 'true' }), item, dpr);
    const b = el('button', { type: 'button', class: cls, dataset: { item }, 'aria-pressed': String(activeItem === item), 'aria-disabled': info.locked ? 'true' : null }, [
      thumb, el('span', { class: 'name', text: info.name }), el('span', { class: 'cost' }, costLine(info)),
    ]);
    if (!info.locked) b.addEventListener('click', () => onPick(item));
    return b;
  });
  container.append(...buttons);
  if (focusedItem) { const again = buttons.find((b) => b.dataset.item === focusedItem); if (again) again.focus(); }
  return buttons;
}
```

`src/ui/dock.js`: replace
```js
import { CATEGORIES, CATEGORY_ICONS } from '../data/ui.js';
```
with
```js
import { visibleCategories, CATEGORY_ICONS, CATEGORY_TINT } from '../data/ui.js';
```
replace
```js
  const catButtons = CATEGORIES.map((c) => {
    const b = el('button', { type: 'button', class: 'cat', 'aria-pressed': 'false' }, [icon(CATEGORY_ICONS[c.id]), el('span', { text: CATEGORY_NAMES[c.id] })]);
```
with
```js
  const shown = visibleCategories();            // empty categories stay hidden until a stage fills them (early-game pass 2.5)
  const catButtons = shown.map((c) => {
    const b = el('button', { type: 'button', class: 'cat', dataset: { category: c.id }, 'aria-pressed': 'false' }, [icon(CATEGORY_ICONS[c.id]), el('span', { text: CATEGORY_NAMES[c.id] })]);
    b.style.setProperty('--tint', CATEGORY_TINT[c.id]);
```
and replace
```js
    catButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(s.dock === 'tray' && s.category === CATEGORIES[i].id)));
```
with
```js
    catButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(s.dock === 'tray' && s.category === shown[i].id)));
```

`src/ui/sidePanel.js`: replace
```js
import { CATEGORIES } from '../data/ui.js';
```
with
```js
import { visibleCategories, CATEGORY_TINT } from '../data/ui.js';
```
replace
```js
  const tabButtons = CATEGORIES.map((c) => button(CATEGORY_NAMES[c.id], { class: 'tab', 'aria-pressed': 'false', onClick: () => store.set({ category: c.id }) }));
```
with
```js
  const shown = visibleCategories();            // empty categories stay hidden until a stage fills them (early-game pass 2.5)
  const tabButtons = shown.map((c) => {
    const b = button(CATEGORY_NAMES[c.id], { class: 'tab', dataset: { category: c.id }, 'aria-pressed': 'false', onClick: () => store.set({ category: c.id }) });
    b.style.setProperty('--tint', CATEGORY_TINT[c.id]);
    return b;
  });
```
and replace
```js
    tabButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(s.category === CATEGORIES[i].id)));
```
with
```js
    tabButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(s.category === shown[i].id)));
```

`src/ui/rail.js`: replace
```js
import { CATEGORIES, CATEGORY_ICONS } from '../data/ui.js';
```
with
```js
import { visibleCategories, CATEGORY_ICONS, CATEGORY_TINT } from '../data/ui.js';
```
replace
```js
  const catButtons = CATEGORIES.map((c) => iconButton(CATEGORY_NAMES[c.id], CATEGORY_ICONS[c.id], {
    class: 'cat', 'aria-pressed': 'false',
    onClick: () => {
      const s = store.get();
      if (s.dock === 'tray' && s.category === c.id) store.set(setDock(s, 'slim'));
      else store.set({ category: c.id, dock: 'tray' });
    },
  }));
```
with
```js
  const shown = visibleCategories();            // empty categories stay hidden until a stage fills them (early-game pass 2.5)
  const catButtons = shown.map((c) => {
    const b = iconButton(CATEGORY_NAMES[c.id], CATEGORY_ICONS[c.id], {
      class: 'cat', dataset: { category: c.id }, 'aria-pressed': 'false',
      onClick: () => {
        const s = store.get();
        if (s.dock === 'tray' && s.category === c.id) store.set(setDock(s, 'slim'));
        else store.set({ category: c.id, dock: 'tray' });
      },
    });
    b.style.setProperty('--tint', CATEGORY_TINT[c.id]);
    return b;
  });
```
and replace
```js
    catButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(open && s.category === CATEGORIES[i].id)));
```
with
```js
    catButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(open && s.category === shown[i].id)));
```

`src/ui/createUI.js`: keep the existing `CATEGORIES` import, and replace
```js
    category: (i) => { const s = store.get(); const category = CATEGORIES[i].id; store.set(s.layout === 'wide' ? { category } : { category, dock: 'tray' }); },
```
with
```js
    category: (i) => {                                 // keys 1-7 keep their categories; a hidden one does nothing (early-game pass 2.5)
      const c = CATEGORIES[i];
      if (!c || !c.items.length) return;
      const s = store.get();
      store.set(s.layout === 'wide' ? { category: c.id } : { category: c.id, dock: 'tray' });
    },
```

`src/ui/text.js`: no change (the help row keeps "1 to 7").

`css/ui.css`: replace
```css
.card { flex: 0 0 auto; width: 124px; min-height: 84px; scroll-snap-align: start; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; padding: 8px; text-align: left; white-space: normal; }
```
with
```css
.card { flex: 0 0 auto; width: 124px; min-height: 84px; scroll-snap-align: start; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 4px; padding: 8px; text-align: left; white-space: normal; }
```
and append to the end of the file:
```css
/* Cards with pictures (early-game pass 2.5): the building's drawing over its name and cost; the coin is decoration. */
.card .thumb { display: block; width: 56px; height: 40px; flex: 0 0 auto; }
.card .coin { display: inline-block; width: 0.75em; height: 0.75em; margin-right: 4px; border-radius: 50%; background: var(--gold); box-shadow: inset 0 0 0 1px #B98A4A; vertical-align: -0.05em; }
/* Category bands: a thin stripe in the category's emblem colour (--tint, set on each button). A background image, so
   it survives the dock's background: none and the pressed tab's teal fill; it adds no height. */
#dock .cat, #rail .cat, #panel .tab, #panel .tab[aria-pressed="true"] { background-image: linear-gradient(var(--tint, transparent), var(--tint, transparent)); background-repeat: no-repeat; background-position: 50% 100%; background-size: 60% 3px; }
```
The band is decoration: each category still says its name in words (button text or `aria-label`), so meaning never rests on colour.

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "card pictures"`
Expected: five `PASS ui card pictures > …` lines, `ALL PASSED`.

If the tray check fails at 150% for `homes`, measure `dock.height`. The budget is `--dock-tray` (348 px at 150%) and the expected height is about 300 px. The likely culprit is the tray's horizontal scrollbar. Do not raise `--dock-tray`. Instead, check that `.card .thumb` really computes to 40 px tall and that the `.card` rule replacement took.

- [ ] **Step 5: Update the existing tests this breaks**

Seven categories became four (roads, homes, food, services). That moves Services from index 4 to index 3, and from key `5` to key `4`. Where a test clicks Services by index, switch it to the new `data-category` attribute so it no longer depends on position.

1. `tests/ui/dock.test.js`, first test: replace
```js
    expect(root.querySelectorAll('.cat').length).toBe(7);
```
with
```js
    expect(root.querySelectorAll('.cat').length).toBe(4);          // empty categories are hidden
```
(`.cat[2]` is still Food.)

2. `tests/ui/panels.test.js`, side panel test: replace
```js
    expect(tabs.length).toBe(7);
    fire(tabs[4], 'click');
    expect(store.get().category).toBe('services');
    expect(tabs[4].getAttribute('aria-pressed')).toBe('true');
```
with
```js
    expect(tabs.length).toBe(4);                                   // empty categories are hidden
    fire(tabs[3], 'click');
    expect(store.get().category).toBe('services');
    expect(tabs[3].getAttribute('aria-pressed')).toBe('true');
```
In the rail test, replace
```js
    expect(cats.length).toBe(7);
```
with
```js
    expect(cats.length).toBe(4);
```
(`cats[1]` is still Homes.)

3. `tests/ui/createUI.test.js`: replace every occurrence (three: the first, second and fifth tests) of
```js
r.root.querySelectorAll('#dock .cat')[4]
```
with
```js
r.root.querySelector('#dock .cat[data-category="services"]')
```

4. `tests/ui/carryovers.test.js`: replace
```js
    fire(r.root.querySelectorAll('#rail .cat')[4], 'click');
```
with
```js
    fire(r.root.querySelector('#rail .cat[data-category="services"]'), 'click');
```
and replace
```js
    fire(r.root.querySelectorAll('#dock .cat')[4], 'click');
```
with
```js
    fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');
```

5. `tests/ui/pwa.test.js`: replace both occurrences of
```js
r.root.querySelectorAll('#dock .cat')[4]
```
with
```js
r.root.querySelector('#dock .cat[data-category="services"]')
```

6. `tests/ui/a11y.test.js` and `tests/audio/sfx.test.js` press '5' for Services: still right, because the number keys keep their categories. No change.

The following were checked and need no edit:
- `cards.test.js`: `.name` is still there, and the `industry` category still renders "Coming later" when asked for directly.
- `keyboard.test.js`: its actions are stubs that log the raw index.
- `text.test.js`: `KEYS.category` keeps seven keys.
- `menu.test.js`: `HELP_ROWS` is unchanged ("1 to 7").

Run: `-Grep "ui dock"`, `-Grep "ui panels"`, `-Grep "ui createUI"`, `-Grep "ui carry-overs"`, `-Grep "ui pwa"`, `-Grep "ui accessibility"`, `-Grep "sfx"`. Each ends `ALL PASSED`.

- [ ] **Step 6: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```
Expected: `Wrote sw-files.js: …` with one more entry than before (`src/ui/thumbs.js`), then every test PASS, five more than before this task, and `ALL PASSED`.

- [ ] **Step 7: Commit**

```powershell
git add src/ui/thumbs.js src/ui/cards.js src/ui/dock.js src/ui/sidePanel.js src/ui/rail.js src/ui/createUI.js src/ui/text.js src/data/ui.js css/ui.css sw-files.js tests/ui/cardThumbs.test.js tests/ui/dock.test.js tests/ui/panels.test.js tests/ui/createUI.test.js tests/ui/carryovers.test.js tests/ui/pwa.test.js tests/ui/a11y.test.js tests/audio/sfx.test.js tests/all.js
git commit -m "Give the build cards pictures and the categories colour bands" -m "Each card draws its building from the art registry (roads and demolish get small drawn icons), then its name and its cost with a coin. Category buttons and tabs carry a thin band in their buildings' colour, empty categories stay hidden until a stage fills them, and the number keys count only the categories shown." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Corner and speed buttons with words, problem markers

**Files:**
- Modify:
  - `src/ui/speed.js` (corner button reads ▶ Play or ❚❚ and the speed; chevron ▴)
  - `src/ui/corners.js` (Map and Layers words)
  - `src/ui/text.js` (`T.play`, `T.mapButton`, `T.layers`, `pauseSpeedText`, `layersText`)
  - `src/render/overlays.js` (`problemMarkers`, `drawProblemMarkers`)
  - `src/render/art/palette.js` (`UI.problem`)
  - `src/ui/createUI.js` (draw the markers in the overlay pass)
  - `css/ui.css` (labelled corner buttons; corners step left of the compact column)
  - `sw-files.js` (regenerated)
- Test: Create `tests/ui/cornerWords.test.js` and `tests/render/problemMarkers.test.js`. Modify `tests/all.js`, `tests/ui/speed.test.js`

**Interfaces:**
- Consumes:
  - `alerts.list()` (`src/ui/alerts.js`, the cached triaged list).
  - `ART` and `slotFor` (`src/render/art/registry.js`). This task calls `slotFor(b)` with no world, which gives the plain slot (Task 6's signature).
  - `allBuildings` (`src/sim/world.js`).
  - `p` and `U` (`src/render/iso.js`).
  - `UI` and `INK` (`src/render/art/palette.js`).
  - `SPEED_LABELS` and `OVERLAY_NAMES` (`src/ui/text.js`).
  - From Task 9: `[data-category]` on rail buttons (used only by the test).
- Produces:
  - `problemMarkers(world, alerts, range = null) → [{ id, x, y, lift, kind: 'problem' | 'down' }]` (`src/render/overlays.js`).
    - Buildings come in id order, at most one marker each.
    - `'problem'`: a non-house building whose id appears in any alert.
    - `'down'`: a house with `tier > 1 && downTimer > 0`.
    - `x, y` is the footprint centre in tiles. `lift = ART[slotFor(b)].height + 4·(w + d) + 6` art px, or `30 + 6` when there is no art.
    - `range` filters by centre the same way `overlayMarks` does.
  - `drawProblemMarkers(g, world, alerts, range)`: per marker, a white halo, then a disc, then a glyph.
    - Coral `'!'`: `UI.problem` disc with a white `'!'`.
    - Amber `'↓'`: `UI.warn` disc with an ink `'↓'` (`UI.label`).
    - Static: nothing animates.
    - `createUI.render`'s `drawOverlay` calls it last, with `alerts.list()`.
  - `UI.problem = '#A33624'`.
  - Text (`src/ui/text.js`): `T.play` 'Play', `T.mapButton` 'Map', `T.layers` 'Layers'. `pauseSpeedText(speed)` → 'Pause, speed 2×'. `layersText(kind)` → 'Layers' or 'Layers: Water'.
  - Corner speed button `.speed-main` holds `.icon` ('▶' or '❚❚', `aria-hidden`) and `.word` ('Play' or the `SPEED_LABELS` entry). Its `aria-label` is 'Play' or 'Pause, speed 2×'. The chevron's icon is '▴'.
  - Minimap and overlay buttons gain class `labelled` and a `.label` word.
    - Minimap: label 'Map'; `aria-label` 'Map' or 'Map, N alerts'.
    - Overlay: label 'Layers' or the overlay's name; `aria-label` from `layersText`; `aria-pressed` as before.

- [ ] **Step 1: Write the failing tests**

`tests/ui/cornerWords.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createSpeedControl } from '../../src/ui/speed.js';
import { createCorners } from '../../src/ui/corners.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { openSheet } from '../../src/ui/modes.js';
import { T, OVERLAY_NAMES, pauseSpeedText, layersText } from '../../src/ui/text.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

const box = (r, sel) => r.root.querySelector(sel).getBoundingClientRect();

describe('ui corner words', () => {
  it('says Play when paused, and the speed with a pause mark when running', () => {
    const { root, cleanup } = mount('<div id="c"></div>');
    try {
      const w = makeTestWorld();
      const ctl = createSpeedControl({ world: w, store: createStore(INITIAL_UI_STATE) });
      ctl.mountCorner(root.querySelector('#c'));
      const main = root.querySelector('.speed-main');
      const parts = () => [main.querySelector('.icon').textContent, main.querySelector('.word').textContent];
      expect(parts()).toEqual(['▶', 'Play']);
      expect(main.getAttribute('aria-label')).toBe(T.play);
      expect(main.querySelector('.icon').getAttribute('aria-hidden')).toBe('true');
      ctl.set(2);
      expect(parts()).toEqual(['❚❚', '2×']);
      expect(main.getAttribute('aria-label')).toBe('Pause, speed 2×');
      expect(pauseSpeedText(3)).toBe('Pause, speed 3×');
      fire(main, 'click');                                                         // a tap pauses
      expect(w.speed).toBe(0);
      expect(main.getAttribute('aria-label')).toBe('Play');
      expect(root.querySelector('.speed-chevron .icon').textContent).toBe('▴');
    } finally { cleanup(); }
  });
  it('labels the map and layers buttons, and the layers word follows the overlay', () => {
    const { root, cleanup } = mount();
    try {
      const store = createStore(INITIAL_UI_STATE);
      const world = makeTestWorld();
      let alerts = 0;
      const corners = createCorners({ container: root, store, speedControl: createSpeedControl({ world, store }), onMinimap() {}, onOverlay() {}, alertCount: () => alerts });
      const map = root.querySelector('.minimap-button'), layers = root.querySelector('.overlay-button');
      expect([map.querySelector('.label').textContent, map.getAttribute('aria-label')]).toEqual(['Map', 'Map']);
      expect([layers.querySelector('.label').textContent, layers.getAttribute('aria-label')]).toEqual(['Layers', 'Layers']);
      store.set({ overlay: 'water' });
      expect(layers.querySelector('.label').textContent).toBe(OVERLAY_NAMES.water);
      expect(layers.getAttribute('aria-label')).toBe('Layers: Water');
      expect(layers.getAttribute('aria-pressed')).toBe('true');
      expect(layersText('religion')).toBe('Layers: Religion');
      store.set({ overlay: null });
      expect(layers.querySelector('.label').textContent).toBe(T.layers);
      expect(layers.getAttribute('aria-pressed')).toBe('false');
      alerts = 2;
      corners.render();
      expect(map.getAttribute('aria-label')).toBe('Map, 2 alerts');
      expect(map.querySelector('.badge').textContent).toBe('2');
    } finally { cleanup(); }
  });
  it('keeps the corner buttons tappable and apart at 150% text, and clear of the compact column', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.ui.speedControl.set(3);
      r.store.set({ overlay: 'religion' });                                       // the longest overlay word
      const left = box(r, '#corners .left'), right = box(r, '#corners .right'), shell = r.root.getBoundingClientRect();
      expect(left.right).toBeLessThanOrEqual(right.left);
      expect(left.left).toBeGreaterThanOrEqual(shell.left);
      expect(right.right).toBeLessThanOrEqual(shell.right);
      for (const sel of ['.speed-main', '.speed-chevron', '.minimap-button', '.overlay-button']) {
        const b = box(r, `#corners ${sel}`);
        expect([sel, b.width >= 44, b.height >= 44]).toEqual([sel, true, true]);
      }
      expect(parseFloat(getComputedStyle(r.root.querySelector('#corners .overlay-button .label')).fontSize)).toBeGreaterThanOrEqual(12);
    } finally { r.cleanup(); }
    const c = await rigUI({ width: 844, height: 390 });                          // compact: drawer, bar and sheets share the column by the rail
    try {
      c.ui.placement.start({ kind: 'building', type: 'well' }, { x: 14, y: 9 });
      expect(box(c, '#corners .right').right).toBeLessThanOrEqual(box(c, '#confirm').left + 0.5);
      c.ui.placement.cancel();
      fire(c.root.querySelector('#rail .cat[data-category="services"]'), 'click');
      expect(c.root.querySelector('#rail .drawer').hidden).toBe(false);
      expect(box(c, '#corners .right').right).toBeLessThanOrEqual(box(c, '#rail .drawer').left + 0.5);
      c.store.set(openSheet(c.store.get(), 'summary'));
      expect(box(c, '#corners .right').right).toBeLessThanOrEqual(box(c, '#sheet').left + 0.5);
    } finally { c.cleanup(); }
  });
});
```

`tests/render/problemMarkers.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { problemMarkers, drawProblemMarkers } from '../../src/render/overlays.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { ART } from '../../src/render/art/registry.js';
import { UI } from '../../src/render/art/palette.js';
import { p } from '../../src/render/iso.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { artToScreen } from '../../src/render/camera.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt, nearColour } from '../helpers/canvas.js';
import { rigUI } from '../helpers/uiWorld.js';

function town() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  const bazaar = addRaw(w, 'bazaar', 9, 11);                                          // staffed, nothing to sell: bazaar_empty
  addRaw(w, 'granary', 6, 11, { store: { grain: 100 } });
  addRaw(w, 'well', 15, 11);
  const shack = addRaw(w, 'house', 12, 9, { tier: 2, residents: 6, downTimer: 1 });   // counting down to lose a tier
  addRaw(w, 'house', 13, 9, { tier: 1, residents: 4, downTimer: 1 });                // a hut has no tier to lose
  addRaw(w, 'house', 14, 9, { tier: 3, residents: 10 });                             // healthy
  staffAll(w);
  return { w, bazaar, shack };
}

const liftOf = (b, slot) => ART[slot].height + 4 * (b.w + b.d) + 6;

// Pixels within r of (cx, cy) that are near a colour.
function near(c, cx, cy, hex, r = 10) {
  let n = 0;
  for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) {
    for (let y = Math.round(cy - r); y <= Math.round(cy + r); y++) if (nearColour(pixelAt(c, x, y), hex, 30)) n++;
  }
  return n;
}

describe('render problem markers', () => {
  it('lists one marker per building with a problem, and a down arrow for a home losing a tier', () => {
    const { w, bazaar, shack } = town();
    const alerts = alertsFor(w);
    expect(alerts.map((a) => a.code)).toEqual(['bazaar_empty']);
    const marks = problemMarkers(w, alerts, null);
    expect(marks).toEqual([
      { id: bazaar.id, x: 10, y: 12, lift: liftOf(bazaar, 'bazaar'), kind: 'problem' },
      { id: shack.id, x: 12.5, y: 9.5, lift: liftOf(shack, 'house.t2'), kind: 'down' },
    ]);
    const noisy = [...alerts, { code: 'no_road', id: bazaar.id }, { code: 'no_road', id: shack.id }, { code: 'no_road', id: 999 }, { code: 'debt' }];
    expect(problemMarkers(w, noisy, null)).toEqual(marks);                            // one per building; homes, missing ids and city-wide alerts add nothing
    expect(problemMarkers(w, alerts, { x0: 0, y0: 0, x1: 8, y1: 31 })).toEqual([]);   // off screen
    expect(problemMarkers(w, alerts, { x0: 9, y0: 11, x1: 10, y1: 12 }).map((m) => m.kind)).toEqual(['problem']);
  });
  it('marks nothing in a healthy town', () => {
    const { w, bazaar, shack } = town();
    bazaar.store.grain = 50;
    shack.downTimer = 0;
    expect(problemMarkers(w, alertsFor(w), null)).toEqual([]);
  });
  it('draws a coral ! badge and an amber down-arrow badge just above the buildings', () => {
    const { w, bazaar, shack } = town();
    const alerts = alertsFor(w);
    for (const [b, disc, glyph] of [[bazaar, UI.problem, UI.halo], [shack, UI.warn, UI.label]]) {
      const c = makeCanvas(200, 200);
      const ctx = c.getContext('2d');
      const q = p(b.x + b.w / 2, b.y + b.d / 2);
      ctx.translate(100 - 2 * q[0], 170 - 2 * q[1]);                                  // the building's centre at (100, 170), 2 device px per art px
      drawProblemMarkers(makeDraw(ctx, 2), w, alerts, null);
      const m = problemMarkers(w, alerts, null).find((x) => x.id === b.id);
      const cy = 170 - 2 * m.lift;
      expect([b.type, near(c, 100, cy, disc) > 20]).toEqual([b.type, true]);
      expect([b.type, near(c, 100, cy, glyph, 5) > 0]).toEqual([b.type, true]);       // the glyph inside the disc
    }
  });
  it('draws the markers in the game frame from the live alerts', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.frame(0);
      const m = problemMarkers(r.world, r.ui.alerts.list(), null).find((x) => x.kind === 'problem');
      expect(r.world.buildings[m.id].type).toBe('bazaar');                             // uiWorld's bazaar has nothing to sell
      const q = p(m.x, m.y);
      const [sx, sy] = artToScreen(r.cam, { width: 390, height: 844 }, q[0], q[1] - m.lift);
      expect(near(r.canvas, sx, sy, UI.problem)).toBeGreaterThan(20);
    } finally { r.cleanup(); }
  });
});
```

In `tests/all.js`, directly after `import './ui/speed.test.js';`, add:
```js
import './ui/cornerWords.test.js';
```
and directly after `import './render/overlays.test.js';`, add:
```js
import './render/problemMarkers.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "corner words"`
Expected: `LOAD ERROR` with a SyntaxError naming a missing export (`pauseSpeedText`, `layersText`, `problemMarkers` or `drawProblemMarkers`). Exit code 1. `-Grep "problem markers"` gives the same `LOAD ERROR`, because both files load through `tests/all.js`.

- [ ] **Step 3: Implement**

`src/ui/text.js`: replace
```js
export const OVERLAY_NAMES = { water: 'Water', food: 'Food', religion: 'Religion', housing: 'Housing' };
```
with
```js
export const OVERLAY_NAMES = { water: 'Water', food: 'Food', religion: 'Religion', housing: 'Housing' };
// The corner buttons' accessible names (early-game pass 2.9); each starts with or contains the word it shows.
export const pauseSpeedText = (speed) => `${T.pause}, ${T.speed.toLowerCase()} ${SPEED_LABELS[speed]}`;
export const layersText = (kind) => (kind ? `${T.layers}: ${OVERLAY_NAMES[kind]}` : T.layers);
```
and replace
```js
  hoverHint: 'Hover a building or pick a card',
```
with
```js
  hoverHint: 'Hover a building or pick a card',
  play: 'Play', mapButton: 'Map', layers: 'Layers',
```

`src/ui/speed.js`: replace
```js
import { el, button, iconButton, setText, clear } from './components.js';
import { SPEED_LABELS, T } from './text.js';
```
with
```js
import { el, button, iconButton, icon, setText, clear } from './components.js';
import { SPEED_LABELS, T, pauseSpeedText } from './text.js';
```
and replace the whole `mountCorner` method
```js
    mountCorner(container) {
      const main = button(SPEED_LABELS[world.speed], { class: 'speed-main primary', 'aria-label': `${T.speed}: ${SPEED_LABELS[world.speed]}` });
      const chevron = iconButton(T.speed, '⌄', { class: 'speed-chevron', 'aria-expanded': 'false' });
      const options = el('div', { class: 'speed-options', hidden: true });
      for (const s of [1, 2, 3]) options.append(button(SPEED_LABELS[s], { onClick: () => { api.set(s); options.hidden = true; chevron.setAttribute('aria-expanded', 'false'); } }));
      main.addEventListener('click', () => api.toggle());
      chevron.addEventListener('click', () => { options.hidden = !options.hidden; chevron.setAttribute('aria-expanded', String(!options.hidden)); });
      container.append(el('div', { class: 'speed-corner group' }, [main, chevron, options]));
      mounted.push(() => { setText(main, SPEED_LABELS[world.speed]); main.setAttribute('aria-label', `${T.speed}: ${SPEED_LABELS[world.speed]}`); });
    },
```
with
```js
    mountCorner(container) {
      // The main button says what a tap does (early-game pass 2.9): "▶ Play" when paused, "❚❚ 2×" (the speed) when running.
      const glyph = icon('▶');
      const word = el('span', { class: 'word' });
      const main = el('button', { type: 'button', class: 'speed-main primary' }, [glyph, word]);
      const chevron = iconButton(T.speed, '▴', { class: 'speed-chevron', 'aria-expanded': 'false' });   // ▴ renders in every system font
      const options = el('div', { class: 'speed-options', hidden: true });
      for (const s of [1, 2, 3]) options.append(button(SPEED_LABELS[s], { onClick: () => { api.set(s); options.hidden = true; chevron.setAttribute('aria-expanded', 'false'); } }));
      main.addEventListener('click', () => api.toggle());
      chevron.addEventListener('click', () => { options.hidden = !options.hidden; chevron.setAttribute('aria-expanded', String(!options.hidden)); });
      container.append(el('div', { class: 'speed-corner group' }, [main, chevron, options]));
      const paint = () => {
        const running = world.speed > 0;
        setText(glyph, running ? '❚❚' : '▶');
        setText(word, running ? SPEED_LABELS[world.speed] : T.play);
        main.setAttribute('aria-label', running ? pauseSpeedText(world.speed) : T.play);
      };
      paint();
      mounted.push(paint);
    },
```
(The wide bar's `mountBar` keeps `SPEED_LABELS`.)

`src/ui/corners.js`: replace the whole file with:
```js
// Corner buttons (spec 6.3): pause and speed bottom-left; minimap with the alert badge and the overlay toggle
// bottom-right. Each says what it is in a word under its icon (early-game pass 2.9). They show at every dock
// height and never sit in the middle of the map.
import { el, iconButton, setText } from './components.js';
import { T, plural, layersText, OVERLAY_NAMES } from './text.js';

// An icon button with its word underneath. The aria-label leads with the same word, so the name matches the label.
function labelled(label, glyph, props) {
  const b = iconButton(label, glyph, props);
  b.classList.add('labelled');
  const word = el('span', { class: 'label', text: label });
  b.append(word);
  return { b, word };
}

export function createCorners({ container, store, speedControl, onMinimap, onOverlay, alertCount = () => 0 }) {
  const left = el('div', { class: 'group left' });
  speedControl.mountCorner(left);
  const map = labelled(T.mapButton, '▣', { class: 'minimap-button has-badge', onClick: onMinimap });
  const badge = el('span', { class: 'badge', hidden: true });
  map.b.append(badge);
  const layers = labelled(T.layers, '◑', { class: 'overlay-button', 'aria-pressed': 'false', onClick: onOverlay });
  const right = el('div', { class: 'group right' }, [map.b, layers.b]);
  container.append(left, right);

  function render() {
    const n = alertCount();
    badge.hidden = n === 0;
    badge.textContent = String(n);
    map.b.setAttribute('aria-label', n ? `${T.mapButton}, ${plural(n, 'alert', 'alerts')}` : T.mapButton);
    const kind = store.get().overlay;
    setText(layers.word, kind ? OVERLAY_NAMES[kind] : T.layers);
    layers.b.setAttribute('aria-label', layersText(kind));
    layers.b.setAttribute('aria-pressed', String(Boolean(kind)));
    speedControl.render();
  }
  render();
  store.subscribe(render);
  return { render };
}
```

`src/render/art/palette.js`: replace
```js
  water: '#2F6FA8', food: '#E2B13C', religion: '#7A5AA0', housing: '#2E8C83',
};
```
with
```js
  water: '#2F6FA8', food: '#E2B13C', religion: '#7A5AA0', housing: '#2E8C83',
  problem: '#A33624',   // the map's problem badge (early-game pass 2.8): white "!" on it reads at 6.8:1
};
```

`src/render/overlays.js`: replace
```js
import { UI, INK } from './art/palette.js';
```
with
```js
import { UI, INK } from './art/palette.js';
import { ART, slotFor } from './art/registry.js';
```
and append to the end of the file:
```js
// Problem markers (early-game pass 2.8): a coral "!" badge over a building with an alert, an amber "↓" over a
// home counting down to lose a tier. One per building, drawn in the overlay pass, never animated. The list is a
// pure function the draw and the tests share. `lift` is art px from the footprint centre up to the badge's
// centre: the sprite's top (its height above the back corner, plus the back corner's 4 * (w + d) above the
// centre), then the badge radius and a pixel.
const BADGE_R = 5;

export function problemMarkers(world, alerts, range = null) {
  const flagged = new Set();
  for (const a of alerts || []) if (a.id !== undefined && a.id !== null) flagged.add(a.id);
  const out = [];
  for (const b of allBuildings(world)) {
    const kind = b.type === 'house' ? (b.tier > 1 && b.downTimer > 0 ? 'down' : null) : (flagged.has(b.id) ? 'problem' : null);
    if (!kind) continue;
    const x = b.x + b.w / 2, y = b.y + b.d / 2;
    if (range && (x < range.x0 || x > range.x1 + 1 || y < range.y0 || y > range.y1 + 1)) continue;
    const art = ART[slotFor(b)];
    out.push({ id: b.id, x, y, lift: (art ? art.height + 4 * (b.w + b.d) : 30) + BADGE_R + 1, kind });
  }
  return out;
}

export function drawProblemMarkers(g, world, alerts, range) {
  for (const m of problemMarkers(world, alerts, range)) {
    const c = U(p(m.x, m.y), m.lift);
    const down = m.kind === 'down';
    g.circ(c, BADGE_R + 1.2, UI.halo, { alpha: 0.9 });
    g.circ(c, BADGE_R, down ? UI.warn : UI.problem, { stroke: INK, strokeWidth: 0.6, strokeAlpha: 0.5 });
    g.text(c, down ? '↓' : '!', { size: 7.5, weight: '700', color: down ? UI.label : UI.halo });   // the glyph, not the colour, says which
  }
}
```
(`allBuildings`, `p` and `U` are already imported in `overlays.js`. The ink `UI.label` on amber `#E0A030` reads at about 6:1.)

`src/ui/createUI.js`: replace
```js
import { drawOverlay, drawReachHighlight, drawGhost } from '../render/overlays.js';
```
with
```js
import { drawOverlay, drawReachHighlight, drawGhost, drawProblemMarkers } from '../render/overlays.js';
```
and, inside `render`'s `drawOverlay` callback, replace
```js
        for (const ghost of ghosts()) drawGhost(g, ghost);
```
with
```js
        for (const ghost of ghosts()) drawGhost(g, ghost);
        drawProblemMarkers(g, world, alerts.list(), r);                        // early-game pass 2.8: one badge per building with a problem
```

`css/ui.css`: append to the end of the file:
```css
/* Corner buttons with words (early-game pass 2.9): an icon over a short word; the speed button reads ▶ Play or ❚❚ 2×. */
#corners .labelled { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; min-width: 48px; min-height: 52px; padding: 2px 8px; line-height: 1.1; }
#corners .labelled .label { font-size: calc(12px * var(--ui-scale)); white-space: nowrap; }
#corners .speed-main, #corners .speed-chevron { min-height: 52px; }
.speed-main .icon { width: auto; margin-right: 6px; }
/* Compact: the drawer, the confirm bar and sheets share the column beside the rail, so the corners step left of it. */
body[data-layout="compact"]:has(#confirm:not([hidden])) #corners,
body[data-layout="compact"]:has(#rail .drawer:not([hidden])) #corners,
body[data-layout="compact"]:has(#sheet:not([hidden])) #corners { right: calc(var(--rail-w) + var(--drawer-w) + var(--safe-right)); }
```
`:has()` is in every target browser: Safari 15.4+, Chrome/Edge 105+, Firefox 121+.

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "corner words"`
Expected: three `PASS ui corner words > …` lines, `ALL PASSED`.
Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "problem markers"`
Expected: four `PASS render problem markers > …` lines, `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

1. `tests/ui/speed.test.js`, last test: the paused corner button no longer says "Paused". Replace
```js
import { SPEED_LABELS } from '../../src/ui/text.js';
```
with
```js
import { SPEED_LABELS, T } from '../../src/ui/text.js';
```
and replace
```js
    expect(main.textContent).toContain(SPEED_LABELS[0]);
```
with
```js
    expect(main.textContent).toContain(T.play);                  // "▶ Play" when paused (early-game pass 2.9)
```
The later `expect(main.textContent).toContain(SPEED_LABELS[1]);` still holds ("❚❚1×" contains "1×"). The wide bar's four buttons still read `SPEED_LABELS`.

The following were checked and need no edit:
- `panels.test.js` corners test: the minimap `aria-label` still contains "1 alert" and "3 alerts", and `.left .speed-main` still exists.
- `a11y.test.js`: every new control has an `aria-label`.
- `text.test.js`: `SPEED_LABELS` is unchanged.
- `components.test.js`: it tests `iconButton` with its own literal label.

Run: `-Grep "ui speed"`, `-Grep "ui panels"`, `-Grep "ui accessibility"`, `-Grep "overlays"`. Each ends `ALL PASSED`.

- [ ] **Step 6: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```
Expected: `Wrote sw-files.js: …`, then every test PASS, seven more than before this task, and `ALL PASSED`.

- [ ] **Step 7: Commit**

```powershell
git add src/ui/speed.js src/ui/corners.js src/ui/text.js src/render/overlays.js src/render/art/palette.js src/ui/createUI.js css/ui.css sw-files.js tests/ui/cornerWords.test.js tests/render/problemMarkers.test.js tests/ui/speed.test.js tests/all.js
git commit -m "Put words on the corner buttons and problem badges on the map" -m "The speed button reads Play when paused and the speed with a pause mark when running; the minimap and overlay buttons say Map and Layers (or the overlay's name). A building with an alert shows a coral ! badge and a home about to lose a tier an amber down arrow. In compact the corner buttons step left of the drawer, the confirm bar and sheets." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: A house sheet that says why; plain mood rows; showMeAt

**Files:**
- Modify: `src/sim/housing.js` (append `needCause` and its helper), `src/ui/sheets.js` (whole file below), `src/ui/goalsList.js` (`showMeTarget` only), `src/ui/createUI.js` (`showMeAt`, `showMe`, `createSheets` call, imports, returned API), `src/ui/text.js` (`CAUSE_TEXT`, `MOOD_NAMES`, `progressText`, `residentsLabel`, `T.hasIt`, `T.missing`), `src/data/ui.js` (`categoryOfItem`), `css/ui.css`
- Create: `tests/sim/needCause.test.js`, `tests/ui/houseSheetWhy.test.js`
- Test: modify `tests/ui/goalsList.test.js` (one assertion), `tests/all.js`

**Interfaces:**
- Consumes: `houseStatus` and the private `liveNeeds` (same file), `roadReach`, `reachDistance`, `isWorking`, `FOOD_GOODS`, `BUILDINGS`; `nearestFit(world, tool, x, y)` from `src/ui/placement.js` (Task 8); `nextItemFor`, `goalById`, `triggerEventGoals` from `src/sim/goals.js` and the `alert` / `null` `showMe` shapes of `EVENT_GOALS` (Task 2); `alertsFor`; `toolForItem`, `SHOW_ME_PULSES`, `SHOW_ME_PULSE_MS`; `effects.pulse`; `cameraControl.panTo`; `placement.start` / `placement.moveGhost`.
- Produces: `needCause(world, house, need)` → `null` | `{ code, id }` (codes `no_road`, `no_well`, `no_bazaar`, `bazaar_empty`, `next_delivery`, `no_temple`; `id` is the bazaar for `bazaar_empty` / `next_delivery`, else `null`). `createSheets({ ..., onShowMe })` with `onShowMe({ category, item, x, y })`. `createUI` gains `showMeAt({ category, item, x, y })` (also on the returned object); goal Show me goes through it. `showMeTarget` handles `target: 'alert'` and `showMe: null`. `categoryOfItem(item)` in `src/data/ui.js`. `src/ui/text.js`: `CAUSE_TEXT[code] = { cause, fix }`, `MOOD_NAMES`, `progressText(n, of)` → `'n of m'`, `residentsLabel(n, of)`, `T.hasIt`, `T.missing`.

- [ ] **Step 1: Write the failing tests**

`tests/sim/needCause.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { needCause, houseStatus } from '../../src/sim/housing.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y = 10. The home at (12, 9) sits on it at (12, 10); as a Shack (tier 2) it wants water and food next.
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  const home = addRaw(w, 'house', 12, 9, { tier: 2, residents: 8 });
  return { w, home };
}

describe('sim need cause', () => {
  it('is null for a need the home has, and for a need it does not know', () => {
    const { w, home } = street();
    expect(needCause(w, home, 'road')).toBe(null);
    expect(needCause(w, home, 'music')).toBe(null);
  });
  it('blames a missing road for every need of a home that touches none', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'well', 15, 11);
    const away = addRaw(w, 'house', 12, 5, { tier: 2, residents: 8 });
    for (const need of ['road', 'water', 'food', 'religion']) expect(needCause(w, away, need)).toEqual({ code: 'no_road', id: null });
  });
  it('water: no working well within reach until one is built; a paused well does not count', () => {
    const { w, home } = street();
    expect(needCause(w, home, 'water')).toEqual({ code: 'no_well', id: null });
    addRaw(w, 'well', 25, 11);                                     // 14 road tiles along: out of a well's reach of 5
    expect(needCause(w, home, 'water')).toEqual({ code: 'no_well', id: null });
    const well = addRaw(w, 'well', 15, 11);
    expect(needCause(w, home, 'water')).toBe(null);
    well.paused = true;
    expect(needCause(w, home, 'water')).toEqual({ code: 'no_well', id: null });
  });
  it('food: no working bazaar, then an empty one, then grain on its way, then fed', () => {
    const { w, home } = street();
    expect(needCause(w, home, 'food')).toEqual({ code: 'no_bazaar', id: null });
    const bazaar = addRaw(w, 'bazaar', 9, 11);                      // no staff yet: not working
    expect(needCause(w, home, 'food')).toEqual({ code: 'no_bazaar', id: null });
    staffAll(w);
    expect(needCause(w, home, 'food')).toEqual({ code: 'bazaar_empty', id: bazaar.id });
    bazaar.store.grain = 40;
    expect(needCause(w, home, 'food')).toEqual({ code: 'next_delivery', id: bazaar.id });
    home.stock.grain = 2;                                           // a month of food for 8 people
    expect(needCause(w, home, 'food')).toBe(null);
    expect(houseStatus(w, home).checklist.find((c) => c.need === 'food').met).toBe(true);   // the checklist's own rule agrees
  });
  it('food: names the nearest empty bazaar, or the nearest one that has grain', () => {
    const { w, home } = street();
    const near = addRaw(w, 'bazaar', 9, 11);                        // 3 road tiles from the home
    const far = addRaw(w, 'bazaar', 17, 11);                        // 6 road tiles from the home
    staffAll(w);
    expect(needCause(w, home, 'food')).toEqual({ code: 'bazaar_empty', id: near.id });
    far.store.grain = 10;
    expect(needCause(w, home, 'food')).toEqual({ code: 'next_delivery', id: far.id });
  });
  it('religion: no working temple within reach until a staffed one is', () => {
    const { w, home } = street();
    expect(needCause(w, home, 'religion')).toEqual({ code: 'no_temple', id: null });
    addRaw(w, 'temple', 17, 11);
    expect(needCause(w, home, 'religion')).toEqual({ code: 'no_temple', id: null });   // unstaffed
    staffAll(w);
    expect(needCause(w, home, 'religion')).toBe(null);
  });
});
```

`tests/ui/houseSheetWhy.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createSheets } from '../../src/ui/sheets.js';
import { createMinimap } from '../../src/ui/minimap.js';
import { createPlacement } from '../../src/ui/placement.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { showMeTarget } from '../../src/ui/goalsList.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { canPlace, demolishAt } from '../../src/sim/commands.js';
import { updateMood } from '../../src/sim/mood.js';
import { goalById, triggerEventGoals } from '../../src/sim/goals.js';
import { categoryOfItem } from '../../src/data/ui.js';
import { createCamera } from '../../src/render/camera.js';
import { T, NEED_NAMES, CAUSE_TEXT, MOOD_NAMES, residentsLabel } from '../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

// The sheets on their own, with a road along y = 10 and Show me recorded instead of acted on.
function rig() {
  const { root, cleanup } = mount();
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  const store = createStore(INITIAL_UI_STATE);
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const view = () => ({ width: 400, height: 300 });
  const shown = [];
  const sheets = createSheets({
    container: root, store, world, placement: createPlacement({ world, store }),
    cameraControl: createCameraControl({ cam, view, reducedMotion: () => true }),
    minimap: createMinimap({ world, cam, view, size: 100 }), getAlerts: () => alertsFor(world), onShowMe: (t) => shown.push(t),
  });
  return { root, world, store, sheets, shown, cleanup };
}
const rowFor = (root, need) => [...root.querySelectorAll('.checklist li')].find((li) => li.querySelector('.name').textContent === NEED_NAMES[need]);

describe('ui house sheet why', () => {
  it('words every cause in plain English with the reach the sim uses, and names the mood rows', () => {
    expect(CAUSE_TEXT.no_road.cause).toBe('No road beside it');
    expect(CAUSE_TEXT.no_well.cause).toBe('No working well within 5 road tiles');
    expect(CAUSE_TEXT.bazaar_empty.cause).toBe('The bazaar has no grain');
    expect(CAUSE_TEXT.next_delivery.cause).toBe('Food arrives at the next delivery');
    for (const code of ['no_road', 'no_well', 'no_bazaar', 'bazaar_empty', 'next_delivery', 'no_temple']) expect(CAUSE_TEXT[code].cause.length).toBeGreaterThan(0);
    for (const code of ['no_road', 'no_well', 'no_bazaar', 'bazaar_empty', 'no_temple']) expect(CAUSE_TEXT[code].fix.length).toBeGreaterThan(0);
    expect(MOOD_NAMES).toEqual({ base: 'Starting mood', food: 'Food', jobs: 'Jobs', debt: 'Debt' });
    expect(categoryOfItem('bazaar')).toBe('services');
    expect(categoryOfItem('granary')).toBe('food');
    expect(categoryOfItem('nothing')).toBe(null);
  });
  it('gives each checklist row a mark, the need and a status in words, and a missing need its cause, fix and Show me', () => {
    const r = rig();
    try {
      const hut = addRaw(r.world, 'house', 28, 9, { tier: 1, residents: 4 });   // no well anywhere
      r.store.set(select(r.store.get(), hut.id));
      const road = rowFor(r.root, 'road');
      expect(road.querySelector('.status').textContent).toBe(T.hasIt);
      expect(road.textContent).toContain('✓');
      expect(road.querySelector('.show-me')).toBe(null);
      const water = rowFor(r.root, 'water');
      expect(water.querySelector('.status').textContent).toBe(T.missing);
      expect(water.textContent).toContain('No working well within 5 road tiles');
      expect(water.textContent).toContain(CAUSE_TEXT.no_well.fix);
      fire(water.querySelector('.show-me'), 'click');
      expect(r.shown).toEqual([{ category: 'services', item: 'well', x: 28.5, y: 9.5 }]);
      const meter = r.root.querySelector('.residents [role="img"]');
      expect(meter.getAttribute('aria-label')).toBe(residentsLabel(4, 5));
      expect(r.root.textContent).toContain('4 of 5');
    } finally { r.cleanup(); }
  });
  it("points an empty bazaar's Show me at a granary beside that bazaar, and offers none while food is on its way", () => {
    const r = rig();
    try {
      addRaw(r.world, 'well', 15, 11);
      const bazaar = addRaw(r.world, 'bazaar', 9, 11);
      staffAll(r.world);
      const shack = addRaw(r.world, 'house', 12, 9, { tier: 2, residents: 8 });
      r.store.set(select(r.store.get(), shack.id));
      let food = rowFor(r.root, 'food');
      expect(food.textContent).toContain(CAUSE_TEXT.bazaar_empty.cause);
      fire(food.querySelector('.show-me'), 'click');
      expect(r.shown).toEqual([{ category: 'food', item: 'granary', x: 10, y: 12 }]);
      bazaar.store.grain = 40;
      r.sheets.render();
      food = rowFor(r.root, 'food');
      expect(food.textContent).toContain(CAUSE_TEXT.next_delivery.cause);
      expect(food.querySelector('.show-me')).toBe(null);
    } finally { r.cleanup(); }
  });
  it('reads the mood rows in plain English', () => {
    const r = rig();
    try {
      updateMood(r.world);
      r.store.set(openSheet(r.store.get(), 'summary'));
      const labels = [...r.root.querySelectorAll('.row')].map((row) => row.firstChild.textContent);
      expect(labels).toContain(MOOD_NAMES.base);
      expect(labels).toContain(MOOD_NAMES.food);
      expect(labels.includes('base')).toBe(false);
    } finally { r.cleanup(); }
  });
  it('aims an event goal at the building in trouble, and a goal with nowhere to point at the focus', () => {
    const world = makeTestWorld();
    setRoad(world, 0, 20, 31, 20);
    expect(showMeTarget(world, goalById('fix_bazaar'))).toEqual({ x: world.focus.x, y: world.focus.y });   // no empty bazaar yet
    addRaw(world, 'bazaar', 4, 21);
    staffAll(world);
    expect(showMeTarget(world, goalById('fix_bazaar'))).toEqual({ x: 5, y: 22 });
    expect(goalById('out_of_debt').showMe).toBe(null);
    expect(showMeTarget(world, goalById('out_of_debt'))).toEqual({ x: world.focus.x, y: world.focus.y });
  });
  it("in the game, the house sheet's Show me starts placing a well with its ghost on a free tile beside the home", async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const hut = addRaw(r.world, 'house', 28, 9, { tier: 1, residents: 4 });   // out of reach of the rig's well at (15, 11)
      r.store.set(select(r.store.get(), hut.id));
      const water = [...r.root.querySelectorAll('#sheet .checklist li')].find((li) => li.textContent.includes(NEED_NAMES.water));
      expect(water.textContent).toContain('No working well within 5 road tiles');
      fire(water.querySelector('.show-me'), 'click');
      const s = r.store.get();
      expect(s.sheet).toBe(null);
      expect(s.mode).toBe('placing');
      expect(s.tool).toEqual({ kind: 'building', type: 'well' });
      expect(s.category).toBe('services');
      expect(Math.abs(s.ghost.x - 28) <= 2 && Math.abs(s.ghost.y - 9) <= 2).toBe(true);
      expect(canPlace(r.world, 'well', s.ghost.x, s.ghost.y).ok).toBe(true);
    } finally { r.cleanup(); }
  });
  it("sends goal Show me the same way: the goal's next missing building, an event goal's building, the summary for debt", async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.goals.completed.push('road', 'plots', 'well');
      demolishAt(r.world, 6, 11);                                   // no granary: it is the food goal's next building
      r.ui.refresh();
      fire(r.root.querySelector('#goals .show-me'), 'click');
      expect(r.store.get().tool).toEqual({ kind: 'building', type: 'granary' });
      expect(r.store.get().category).toBe('food');
      r.ui.placement.cancel();
      triggerEventGoals(r.world);                                   // the rig's bazaar is staffed and empty
      expect(r.world.goals.triggered).toContain('fix_bazaar');
      r.ui.refresh();
      fire(r.root.querySelector('#goals .show-me'), 'click');
      const g = r.store.get().ghost;
      expect(r.store.get().tool.type).toBe('granary');
      expect(Math.abs(g.x - 9) <= 3 && Math.abs(g.y - 11) <= 3).toBe(true);   // beside the bazaar at (9, 11)
      expect(canPlace(r.world, 'granary', g.x, g.y).ok).toBe(true);
      r.ui.placement.cancel();
      r.world.goals.completed.push('fix_bazaar');
      r.world.gold = -30;
      triggerEventGoals(r.world);
      r.ui.refresh();
      fire(r.root.querySelector('#goals .show-me'), 'click');
      expect(r.store.get().sheet.kind).toBe('summary');
      expect(typeof r.ui.showMeAt).toBe('function');
    } finally { r.cleanup(); }
  });
});
```

`tests/all.js`: add `import './sim/needCause.test.js';` on the line after `import './sim/housing.test.js';`, and `import './ui/houseSheetWhy.test.js';` on the line after `import './ui/sheets.test.js';`.

- [ ] **Step 2: Run them to see them fail**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "need cause"
```
Expected: `LOAD ERROR` with `SyntaxError: The requested module '../../src/sim/housing.js' does not provide an export named 'needCause'` (a missing export stops the whole test page from loading, so every grep shows the same error).

- [ ] **Step 3: Implement**

`src/sim/housing.js`: append at the end of the file (after `houseStatus`; every name used is already imported):
```js
// Why a home lacks a need (early-game pass 2.10), judged by the same live rules as the checklist: null when it
// has the need (or the need is unknown), else { code, id }. A home that touches no road blames the road for
// every need, since no well, bazaar or temple can reach it without one. For food, id is the bazaar concerned:
// the nearest working one in reach that has grain (next_delivery), else the nearest empty one (bazaar_empty).
export function needCause(world, house, need) {
  const met = liveNeeds(world, house);
  if (!(need in met) || met[need]) return null;
  if (!met.road) return { code: 'no_road', id: null };
  if (need === 'water') return { code: 'no_well', id: null };
  if (need === 'religion') return { code: 'no_temple', id: null };
  const reaching = bazaarsReaching(world, house);
  if (!reaching.length) return { code: 'no_bazaar', id: null };
  const stocked = reaching.find((bz) => FOOD_GOODS.some((g) => (bz.store[g] || 0) > 0));
  return stocked ? { code: 'next_delivery', id: stocked.id } : { code: 'bazaar_empty', id: reaching[0].id };
}

// Working bazaars whose reach takes in the home, nearest first: the rule bazaarsByHouse uses for deliveries.
function bazaarsReaching(world, house) {
  const out = [];
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.sells || !isWorking(world, b)) continue;
    const dist = reachDistance(roadReach(world, b, def.reach), world, house);
    if (dist <= def.reach) out.push({ b, dist });
  }
  out.sort((p, q) => p.dist - q.dist || p.b.id - q.b.id);
  return out.map((e) => e.b);
}
```

`src/data/ui.js`: add right after the `toolForItem` function:
```js
// The build category an item's card sits in (Show me and the guide open it); null for an unknown item.
export function categoryOfItem(item) {
  const c = CATEGORIES.find((cat) => cat.items.includes(item));
  return c ? c.id : null;
}
```

`src/ui/text.js`:

Before:
```js
export const NEED_NAMES = { road: 'Road access', water: 'Water', food: 'Food', religion: 'Temple' };
```
After:
```js
export const NEED_NAMES = { road: 'Road access', water: 'Water', food: 'Food', religion: 'Temple' };

// The house sheet's causes and fixes (early-game pass 2.10), keyed by needCause codes. Reaches come from the data.
export const CAUSE_TEXT = {
  no_road: { cause: 'No road beside it', fix: 'Lay a road next to it' },
  no_well: { cause: `No working well within ${BUILDINGS.well.reach} road tiles`, fix: 'Build a well near it' },
  no_bazaar: { cause: `No working bazaar within ${BUILDINGS.bazaar.reach} road tiles`, fix: 'Build a bazaar near it' },
  bazaar_empty: { cause: 'The bazaar has no grain', fix: 'Build a granary near the bazaar' },
  next_delivery: { cause: 'Food arrives at the next delivery', fix: '' },
  no_temple: { cause: `No working temple within ${BUILDINGS.temple.reach} road tiles`, fix: 'Build a temple near it' },
};

// The city summary's mood rows, keyed by world.moodBreakdown.
export const MOOD_NAMES = { base: 'Starting mood', food: 'Food', jobs: 'Jobs', debt: 'Debt' };
```

Before:
```js
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
```
After:
```js
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const progressText = (n, of) => `${n} of ${of}`;
export const residentsLabel = (n, of) => `${progressText(n, of)} residents`;
```

Before (inside `T`):
```js
  residents: 'Residents', nextTier: 'To grow it needs', upgradesAtMonthEnd: 'Grows at the end of the month', emptyPlot: 'Waiting for people to move in',
```
After:
```js
  residents: 'Residents', nextTier: 'To grow it needs', upgradesAtMonthEnd: 'Grows at the end of the month', emptyPlot: 'Waiting for people to move in',
  hasIt: 'Has it', missing: 'Missing',
```

`src/ui/sheets.js` (whole file; no earlier task touches it):
```js
// Info sheets, the city summary and the minimap sheet (spec 6.3). One sheet at a time, every one with an x.
// A home's sheet says why it is not growing: each missing need names its cause and its fix, with Show me
// (early-game pass 2.10). Show me itself lives in createUI (showMeAt); this file only hands it a target.
import { BUILDINGS } from '../data/buildings.js';
import { houseStatus, needCause } from '../sim/housing.js';
import { setPaused } from '../sim/commands.js';
import { assignLabour } from '../sim/labour.js';
import { openGoals } from '../sim/goals.js';
import { closeSheet } from './modes.js';
import { summaryData } from './hud.js';
import { ZOOM_STEP } from '../data/ui.js';
import { buildingName, tierName, NEED_NAMES, CAUSE_TEXT, MOOD_NAMES, alertText, plural, progressText, residentsLabel, T } from './text.js';
import { el, button, iconButton, clear } from './components.js';

const row = (label, value) => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);

// Where each cause's Show me points: the card to open, and whether to aim at the home or at the building the
// cause names (an empty bazaar wants a granary beside it). next_delivery needs nothing from the player.
const CAUSE_FIX = {
  no_road: { category: 'roads', item: 'road', at: 'home' },
  no_well: { category: 'services', item: 'well', at: 'home' },
  no_bazaar: { category: 'services', item: 'bazaar', at: 'home' },
  bazaar_empty: { category: 'food', item: 'granary', at: 'building' },
  no_temple: { category: 'services', item: 'temple', at: 'home' },
};
const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });

export function createSheets({ container, store, world, placement, cameraControl, minimap, getAlerts = () => [], onView = () => {}, onShowMe = () => {}, afterCommand = () => {}, custom = {} }) {
  const close = () => store.set(closeSheet(store.get()));

  function head(title) {
    return el('div', { class: 'head' }, [el('h2', { text: title }), iconButton(T.close, '✕', { class: 'close', onClick: close })]);
  }

  function problems(id) {
    const list = getAlerts().filter((a) => a.id === id);
    if (!list.length) return el('p', { class: 'muted', text: T.noProblems });
    return el('ul', { class: 'problems' }, list.map((a) => {
      const t = alertText(a, world);
      return el('li', { class: 'problem' }, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', onClick: () => onView(a) })]);
    }));
  }

  function buildingSheet(b) {
    const def = BUILDINGS[b.type];
    const body = el('div', { class: 'body' });
    body.append(row(T.workers, def.workers ? `${b.staff} of ${def.workers}` : T.noWorkersNeeded));
    for (const [good, n] of Object.entries(b.store)) body.append(row(`${T.stock}: ${good}`, String(n)));
    const reach = def.reach || def.supplyReach || def.producerReach;
    if (reach) body.append(row(T.reach, `${reach} road tiles`));
    body.append(el('h3', { text: T.problems }), problems(b.id));
    const actions = el('div', { class: 'actions' });
    if (def.workers || def.upkeep) {
      actions.append(button(b.paused ? T.resume : T.pause, { class: 'pause', onClick: () => {
        const r = setPaused(world, b.id, !b.paused);
        if (r.ok) { assignLabour(world); afterCommand({ kind: 'pause', result: r, text: b.paused ? T.paused : T.resumed, undoable: false }); render(); }
      } }));
    }
    actions.append(button(T.demolish, { class: 'demolish danger', onClick: () => { const r = placement.demolishOne(b.x, b.y); if (r.ok) close(); } }));
    body.append(actions);
    return [head(buildingName(b.type)), body];
  }

  // One row of the next-tier checklist: a mark, the need, a status in words (meaning never by colour alone);
  // a missing need adds its cause, then its fix with Show me when there is something to build.
  function needRow(h, c) {
    const li = el('li', { class: c.met ? 'met' : 'missing' }, [el('div', { class: 'need' }, [
      el('span', { class: c.met ? 'tick' : 'cross', 'aria-hidden': 'true', text: c.met ? '✓' : '✕' }),
      el('span', { class: 'name', text: NEED_NAMES[c.need] }),
      el('span', { class: `status small ${c.met ? 'teal' : 'coral'}`, text: c.met ? T.hasIt : T.missing }),
    ])]);
    const cause = c.met ? null : needCause(world, h, c.need);
    if (!cause) return li;
    const words = CAUSE_TEXT[cause.code];
    li.append(el('p', { class: 'cause small', text: words.cause }));
    const fix = CAUSE_FIX[cause.code];
    if (!fix) return li;
    const near = fix.at === 'building' && world.buildings[cause.id] ? world.buildings[cause.id] : h;
    const at = centreOf(near);
    const target = { category: fix.category, item: fix.item, x: at.x, y: at.y };
    li.append(el('div', { class: 'fix' }, [
      el('span', { class: 'small muted', text: words.fix }),
      button(T.showMe, { class: 'show-me primary', onClick: () => onShowMe(target) }),
    ]));
    return li;
  }

  function houseSheet(h) {
    const s = houseStatus(world, h);
    const body = el('div', { class: 'body' });
    if (s.tier === 0) body.append(el('p', { class: 'muted', text: T.emptyPlot }));
    const share = s.capacity ? Math.min(1, s.residents / s.capacity) : 0;
    body.append(el('div', { class: 'row residents' }, [
      el('span', { class: 'muted', text: T.residents }),
      el('span', { class: 'value' }, [
        progressText(s.residents, s.capacity),
        el('span', { class: 'meter', role: 'img', 'aria-label': residentsLabel(s.residents, s.capacity) }, [el('span', { class: 'fill', style: { width: `${Math.round(share * 100)}%` } })]),
      ]),
    ]));
    if (s.next) {
      body.append(el('h3', { text: `${T.nextTier} (${s.next.name})` }));
      body.append(el('ul', { class: 'checklist' }, s.checklist.map((c) => needRow(h, c))));
      if (s.tier >= 1 && s.checklist.every((c) => c.met)) body.append(el('p', { class: 'teal', text: T.upgradesAtMonthEnd }));
    }
    if (s.downgradeIn !== null && s.missingNow.length) body.append(el('p', { class: 'coral', text: `Loses ${NEED_NAMES[s.missingNow[0]].toLowerCase()} in ${plural(s.downgradeIn, 'month', 'months')}` }));
    body.append(el('div', { class: 'actions' }, [button(T.demolish, { class: 'demolish danger', onClick: () => { const r = placement.demolishOne(h.x, h.y); if (r.ok) close(); } })]));
    return [head(tierName(s.tier)), body];
  }

  function summarySheet() {
    const d = summaryData(world);
    const body = el('div', { class: 'body' });
    body.append(el('h3', { text: T.incomeVsSpending }), row(T.taxes, `+${d.taxes}`), row(T.wages, `−${d.wages}`), row(T.upkeep, `−${d.upkeep}`), row(T.net, (d.net >= 0 ? '+' : '') + d.net));
    body.append(el('h3', { text: T.foodInStore }), row(T.grain, `${d.foodStored}`), row(T.lasts, d.monthsOfFood === null ? '–' : plural(d.monthsOfFood, 'month', 'months')));
    body.append(el('h3', { text: T.employment }), row(T.working, `${d.working} of ${d.workforce}`), row(T.jobless, `${d.jobless}`), row(T.jobs, `${d.jobs}`));
    body.append(el('h3', { text: T.moodBreakdown }), row(T.mood, `${d.mood}`));
    // The starting mood is a level, the rest are swings from it (early-game pass 2.10: plain English rows).
    for (const [k, v] of Object.entries(d.moodBreakdown || {})) body.append(row(MOOD_NAMES[k] || k, k === 'base' ? String(v) : (v >= 0 ? '+' : '') + v));
    body.append(el('h3', { text: T.goals }));
    const open = openGoals(world, 3);
    body.append(open.length ? el('ul', { class: 'goals' }, open.map((g) => el('li', { class: 'goal', text: g.text }))) : el('p', { class: 'muted', text: T.goalsNone }));
    return [head(T.summary), body];
  }

  function minimapSheet() {
    const body = el('div', { class: 'body' });
    const canvas = minimap.canvas;
    canvas.onclick = (ev) => { const r = canvas.getBoundingClientRect(); const t = minimap.tileFromPoint(ev.clientX - r.left, ev.clientY - r.top); cameraControl.panTo(t.x + 0.5, t.y + 0.5); };
    const zoomIn = iconButton(T.zoomIn, '+', { class: 'zoom-in', onClick: () => cameraControl.zoomStep(ZOOM_STEP, cameraControl.centre().x, cameraControl.centre().y) });
    const zoomOut = iconButton(T.zoomOut, '−', { class: 'zoom-out', onClick: () => cameraControl.zoomStep(1 / ZOOM_STEP, cameraControl.centre().x, cameraControl.centre().y) });
    body.append(el('div', { class: 'minimap-wrap' }, [canvas]), el('div', { class: 'actions' }, [zoomIn, zoomOut]));
    const list = getAlerts();
    body.append(el('h3', { text: T.alerts }));
    if (!list.length) body.append(el('p', { class: 'muted', text: T.noAlerts }));
    else body.append(el('ul', { class: 'alert-list' }, list.map((a) => { const t = alertText(a, world); return el('li', {}, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', onClick: () => onView(a) })]); })));
    minimap.render(list);
    return [head(T.minimap), body];
  }

  function render() {
    const s = store.get();
    // A rebuild drops keyboard focus: put it back on the button at the same position when its class matches (spec 6.8).
    const buttons = [...container.querySelectorAll('button')];
    const focusIndex = buttons.indexOf(document.activeElement);
    const focusClass = focusIndex >= 0 ? buttons[focusIndex].className : null;
    clear(container);
    if (!s.sheet) { container.hidden = true; return; }
    let parts;
    if (s.sheet.kind === 'info') {
      const b = world.buildings[s.sheet.id];
      if (!b) { store.set(closeSheet(s)); container.hidden = true; return; }
      parts = b.type === 'house' ? houseSheet(b) : buildingSheet(b);
    } else if (s.sheet.kind === 'summary') parts = summarySheet();
    else if (s.sheet.kind === 'minimap') parts = minimapSheet();
    else if (custom[s.sheet.kind]) { const body = el('div', { class: 'body' }); custom[s.sheet.kind](body, { close }); parts = [head(T[s.sheet.kind] || s.sheet.kind), body]; }
    else { container.hidden = true; return; }
    container.hidden = false;
    container.append(...parts);
    if (focusIndex >= 0) {
      const again = container.querySelectorAll('button')[focusIndex];
      if (again && again.className === focusClass && !again.disabled) again.focus();
    }
  }

  render();
  store.subscribe(render);
  return { render };
}
```

`src/ui/goalsList.js`:

Before:
```js
import { GOALS } from '../data/goals.js';
import { openGoals } from '../sim/goals.js';
import { housesOf } from '../sim/world.js';
```
After:
```js
import { GOALS } from '../data/goals.js';
import { openGoals } from '../sim/goals.js';
import { alertsFor } from '../sim/alerts.js';
import { housesOf } from '../sim/world.js';
```

Before:
```js
export function showMeTarget(world, goal) {
  const kind = goal.showMe.target;
```
After:
```js
// Where a goal's Show me points. 'alert' aims at the first building with that alert (an event goal's trouble);
// a goal with no showMe (out of debt) and any target that finds nothing fall back to the city's focus.
export function showMeTarget(world, goal) {
  const show = goal.showMe;
  const kind = show ? show.target : null;
  if (kind === 'alert') {
    const a = alertsFor(world).find((x) => x.code === show.code && x.id && world.buildings[x.id]);
    if (a) { const b = world.buildings[a.id]; return { x: b.x + b.w / 2, y: b.y + b.d / 2 }; }
  }
```
(The rest of `showMeTarget`, from `if (kind === 'startRoad' && ...` to the final `return { x: world.focus.x, y: world.focus.y };`, stays as it is.)

`src/ui/createUI.js`:

Imports: add `categoryOfItem` to the `'../data/ui.js'` import (keep whatever Task 9 added), make the goals import read `import { goalById, nextItemFor } from '../sim/goals.js';`, and make sure the placement import includes `nearestFit` (Task 8 may have added it): `import { createPlacement, snapGhost, nearestFit } from './placement.js';`.

Replace the whole `showMe` function (whatever Task 8 left in it), which today reads:
```js
  // Show me (spec 4.1): open the right card, then pan to and pulse the place the goal is about.
  function showMe(goal) {
    const s = store.get();
    if (s.sheet) store.set(closeSheet(s));
    store.set(pickCategory(store.get(), goal.showMe.category));
    pick(goal.showMe.item);
    const t = showMeTarget(world, goal);
    cameraControl.panTo(t.x, t.y);
    placement.moveGhost(Math.floor(t.x), Math.floor(t.y));   // a building ghost lands on the target, not at the old screen centre (ignored for road and plot tools)
    const at = now();
    for (let i = 0; i < SHOW_ME_PULSES; i++) effects.pulse(t.x, t.y, at + i * SHOW_ME_PULSE_MS);
  }
```
with:
```js
  // Show me (spec 4.1, early-game pass 2.6 and 2.10): close any sheet, open the right card, start its tool, pan to
  // the place and pulse it. A building's ghost lands on the nearest tile where it fits around the place, so it
  // never starts on top of a home. The goals strip, the goals sheet and the house sheet all come through here.
  function showMeAt({ category, item, x, y }) {
    const s = store.get();
    if (s.sheet) store.set(closeSheet(s));
    store.set(pickCategory(store.get(), category || categoryOfItem(item)));
    const tool = toolForItem(item);
    placement.start(tool);
    if (tool.kind === 'building') {
      const def = BUILDINGS[tool.type];
      const fit = nearestFit(world, tool, Math.round(x - def.w / 2), Math.round(y - def.d / 2));
      placement.moveGhost(fit.x, fit.y);
    }
    cameraControl.panTo(x, y);
    const at = now();
    for (let i = 0; i < SHOW_ME_PULSES; i++) effects.pulse(x, y, at + i * SHOW_ME_PULSE_MS);
  }
  // A goal's Show me: the next building it still needs, at its target. A goal with nowhere to point (debt)
  // opens the city summary instead.
  function showMe(goal) {
    if (!goal.showMe) { store.set(openSheet(store.get(), 'summary')); return; }
    const item = nextItemFor(world, goal) || goal.showMe.item;
    const t = showMeTarget(world, goal);
    showMeAt({ category: categoryOfItem(item) || goal.showMe.category, item, x: t.x, y: t.y });
  }
```

Before:
```js
  const sheets = createSheets({ container: $('sheet'), store, world, placement, cameraControl, minimap: sheetMinimap, getAlerts: () => alerts.list(), onView: viewAlert, afterCommand, custom: customSheets });
```
After:
```js
  const sheets = createSheets({ container: $('sheet'), store, world, placement, cameraControl, minimap: sheetMinimap, getAlerts: () => alerts.list(), onView: viewAlert, onShowMe: showMeAt, afterCommand, custom: customSheets });
```

In the object `createUI` returns, add `showMeAt,` after `placement,` (the line that starts `store, settings, sfx, placement, ...`).

`css/ui.css`: append at the end of the file:
```css
/* The house sheet (early-game pass 2.10): each need on its own row with a mark, its name and a status in
   words; a missing one adds its cause, its fix and Show me. Residents carry a small meter. */
#sheet .checklist { list-style: none; padding-left: 0; }
.checklist li { padding: 6px 0; border-bottom: 1px solid var(--parchment-2); }
.checklist .need { display: flex; align-items: center; gap: 8px; }
.checklist .need .name { flex: 1; min-width: 0; }
.checklist .tick, .checklist .cross { display: inline-block; width: 1.25em; text-align: center; font-weight: 700; }
.checklist .cause { margin: 2px 0 0 calc(1.25em + 8px); }
.checklist .fix { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px 8px; margin: 4px 0 0 calc(1.25em + 8px); }
.row.residents .value { display: inline-flex; align-items: center; gap: 8px; }
.meter { display: inline-block; width: 64px; height: 8px; border-radius: 4px; background: var(--parchment-2); box-shadow: inset 0 0 0 1px var(--parchment-3); overflow: hidden; }
.meter .fill { display: block; height: 100%; background: var(--teal); }
```

- [ ] **Step 4: Run the tests to see them pass**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "need cause"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "house sheet why"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui sheets"
```
Expected: each ends `ALL PASSED` (6, 7 and 3 tests).

- [ ] **Step 5: Update the existing tests this breaks**

Searched `tests/` for the old Show me pathway (`showMe`, `show-me`, `moveGhost`, `Math.floor(t.`), the checklist markup (`checklist`, `'Has '`, `Missing`), the mood rows (`moodBreakdown`, `'base'`) and literal labels in sheets.js (`row\('[A-Z]`).

1. `tests/ui/goalsList.test.js`, test "stacks under the banner and the legend, and Show me puts a building ghost on the target": the ghost now lands on the nearest free tile, not on the home at the target. Add `import { canPlace } from '../../src/sim/commands.js';` to the imports, and replace the block below (if Task 8 already rewrote the last line, replace whatever it became):

Before:
```js
    r.world.goals.completed.push('road', 'plots');
    r.ui.refresh();
    fire(r.root.querySelector('#goals .show-me'), 'click');
    const t = showMeTarget(r.world, goalById('well'));
    expect(r.store.get().tool.type).toBe('well');
    expect(r.store.get().ghost).toEqual({ x: Math.floor(t.x), y: Math.floor(t.y) });
```
After:
```js
    r.world.gold = 1000;                                              // out of debt, so the ghost's tile can be judged a fit
    r.world.goals.completed.push('road', 'plots');
    r.ui.refresh();
    fire(r.root.querySelector('#goals .show-me'), 'click');
    const t = showMeTarget(r.world, goalById('well'));
    const ghost = r.store.get().ghost;
    expect(r.store.get().tool.type).toBe('well');
    expect(Math.abs(ghost.x + 0.5 - t.x) <= 2 && Math.abs(ghost.y + 0.5 - t.y) <= 2).toBe(true);   // beside the homes, not on them
    expect(canPlace(r.world, 'well', ghost.x, ghost.y).ok).toBe(true);
```

2. `tests/ui/sheets.test.js` "shows a home with its checklist, timers and residents": still passes (rows keep the visible ✓ / ✕ marks, the need names and "8 of 8"). No change.
3. `tests/ui/carryovers.test.js` checks sheets.js has no `row('Literal` labels: the new code uses `T` and `MOOD_NAMES` only. No change.
4. `tests/ui/goalsList.test.js` "wires Show me into the game": the road goal still starts the road tool in `roads`, closes sheets and pans. No change.

- [ ] **Step 6: Full suite**

```powershell
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```
Expected: the last line is `ALL PASSED`.

- [ ] **Step 7: Commit**

```powershell
git add src/sim/housing.js src/ui/sheets.js src/ui/goalsList.js src/ui/createUI.js src/ui/text.js src/data/ui.js css/ui.css sw-files.js tests/sim/needCause.test.js tests/ui/houseSheetWhy.test.js tests/ui/goalsList.test.js tests/all.js
git commit -m "Make the house sheet say why a home is not growing, and give every Show me one path`n`nEach need on the checklist reads Has it or Missing; a missing one names its cause and fix with a Show me that opens the right card and puts the ghost on a free tile nearby. Goal Show me goes the same way, aims event goals at the building in trouble and opens the summary for debt. The summary's mood rows read in plain English.`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The goals strip and sheet; settle and the date wired in

**Files:**
- Modify: `src/ui/goalsList.js` (whole file below), `src/ui/createUI.js` (settle in `afterCommand`, daily sync, Skip guide, imports, destroy), `src/ui/text.js`, `css/ui.css`
- Create: `tests/ui/goalsV2.test.js`
- Test: modify `tests/ui/goalsList.test.js` (whole file below), `tests/ui/createUI.test.js`, `tests/audio/sfx.test.js`, `tests/helpers/uiWorld.js` (`clock` option), `tests/all.js`

**Interfaces:**
- Consumes: `settle(world, events)` (Tasks 2-4); `startDaily`, `dailyProgress`, `swapDaily` from `src/sim/daily.js` and `DAILY_REWARD`, `DAILY_COUNT`, `DAILY_POOL` from `src/data/daily.js` (Task 4); `openGoals`, `goalProgress`, `guideActive`, `goalById`, `EVENT_GOALS`, goal `chapter` (Task 2); `setGuide` (Task 2); `showMeTarget`, `showMe` (Task 11); `progressText` (Task 11).
- Produces: `dateKeyOf(ms)` from `src/ui/goalsList.js`; `createGoalsStrip({ container, world, onShowMe, onOpen, onSkipGuide })` (progress chip, '+25 gold', primary Show me, Goals, Skip guide while `guideActive`; hides `#goals` when no goal is open); `goalsSheet(world, { onShowMe, onSwap })` (chapters, Today, Swap, lifetime count). `createUI.afterCommand` runs `settle` then `effects.fromEvents` and `onEvents`, then draws the day's goals; `startDaily(world, sessionDate)` (the local date read once at construction, so nothing expires mid-session) at construction, after every command and on every new rendered game day. `src/ui/text.js`: `CHAPTER_NAMES`, `DAILY_TEXT`, `rewardText(n)`, `progressLabel(n, of)`, `dailyDoneText(n)`, `swapLabel(text)`, `T.skipGuide`, `T.today`, `T.swap`, `T.done`. `rigUI({ clock })`.

- [ ] **Step 1: Write the failing tests**

`tests/helpers/uiWorld.js`: let tests fix the device clock.

Before:
```js
export async function rigUI({ width = 390, height = 844, hooks = {}, doc = fakeDoc(), welcome = null, sfx = null } = {}) {
```
After:
```js
export async function rigUI({ width = 390, height = 844, hooks = {}, doc = fakeDoc(), welcome = null, sfx = null, clock = undefined } = {}) {
```
Before:
```js
    keyTarget: shell.root, storage: { getItem: () => null, setItem: () => {} }, now: () => 0, hooks, doc, welcome, sfx,
```
After:
```js
    keyTarget: shell.root, storage: { getItem: () => null, setItem: () => {} }, now: () => 0, hooks, doc, welcome, sfx, clock,   // undefined clock: createUI's Date.now
```

`tests/ui/goalsV2.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createGoalsStrip, goalsSheet, dateKeyOf } from '../../src/ui/goalsList.js';
import { GOALS, EVENT_GOALS, GOAL_REWARD } from '../../src/data/goals.js';
import { DAILY_POOL, DAILY_COUNT, DAILY_REWARD } from '../../src/data/daily.js';
import { goalById } from '../../src/sim/goals.js';
import { settle } from '../../src/sim/settle.js';
import { tickDay } from '../../src/sim/clock.js';
import { T, CHAPTER_NAMES, DAILY_TEXT, goalsProgressText, rewardText, progressText, progressLabel, dailyDoneText } from '../../src/ui/text.js';
import { openSheet } from '../../src/ui/modes.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

const DAY_MS = 24 * 3600 * 1000;
const FIXED = new Date(2026, 9, 11, 12, 0, 0).getTime();   // local noon on 11 October 2026

describe('ui goals v2', () => {
  it('reads the local date as YYYY-MM-DD, zero padded', () => {
    expect(dateKeyOf(new Date(2026, 0, 5, 9, 30).getTime())).toBe('2026-01-05');
    expect(dateKeyOf(new Date(2026, 11, 31, 23, 59).getTime())).toBe('2026-12-31');
    expect(dateKeyOf(FIXED)).toBe('2026-10-11');
  });
  it('names every chapter and every daily goal, and words rewards in gold', () => {
    for (const g of [...GOALS, ...EVENT_GOALS]) expect(typeof CHAPTER_NAMES[g.chapter]).toBe('string');
    for (const d of DAILY_POOL) expect(typeof DAILY_TEXT[d.id]).toBe('string');
    expect(rewardText(25)).toBe('+25 gold');
    expect(progressText(2, 6)).toBe('2 of 6');
  });
  it('shows a progress chip that counts, the reward in gold and a filled Show me', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      world.goals.completed.push('road');
      const strip = createGoalsStrip({ container: root, world, onShowMe: () => {}, onOpen: () => {} });
      const chip = root.querySelector('.goal-strip .chip');
      expect(chip.textContent).toBe(progressText(0, 6));
      expect(chip.getAttribute('aria-label')).toBe(progressLabel(0, 6));
      expect(root.querySelector('.goal-strip .reward').textContent).toBe(rewardText(GOAL_REWARD));
      expect(root.querySelector('.goal-strip .show-me').classList.contains('primary')).toBe(true);
      addRaw(world, 'house', 3, 3);
      strip.render();
      expect(root.querySelector('.goal-strip .chip').textContent).toBe(progressText(1, 6));
      world.goals.completed.length = 0;                            // the road goal counts nothing: no chip
      strip.render();
      expect(root.querySelector('.goal-strip .chip').hidden).toBe(true);
    } finally { cleanup(); }
  });
  it('groups the goals sheet by chapter, with progress and the reward unit on every row, event goals first', () => {
    const { root, cleanup } = mount();
    try {
      const world = makeTestWorld();
      world.goals.completed.push('road');
      addRaw(world, 'house', 3, 3); addRaw(world, 'house', 4, 3);
      goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
      expect([...root.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([CHAPTER_NAMES.first_homes, CHAPTER_NAMES.feed]);
      const rows = [...root.querySelectorAll('.goal')];
      expect(rows[0].textContent).toContain(progressText(2, 6));
      for (const row of rows) expect(row.textContent).toContain(rewardText(GOAL_REWARD));
      for (const row of rows) expect(row.querySelector('.show-me').classList.contains('primary')).toBe(true);
      world.goals.triggered.push('fix_bazaar');
      root.innerHTML = '';
      goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
      expect(root.querySelector('h3').textContent).toBe(CHAPTER_NAMES.event);
      expect(root.querySelector('.goal').textContent).toContain(goalById('fix_bazaar').text);
      expect(root.querySelector('.goal').textContent).toContain(rewardText(goalById('fix_bazaar').reward));
      world.goals.completed.push('fix_bazaar');                    // event goals never count against the chain
      root.innerHTML = '';
      goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
      expect(root.textContent).toContain(goalsProgressText(1, GOALS.length));
    } finally { cleanup(); }
  });
  it('settles goals after every command, so plots placed while paused finish the step without a game day', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const day = r.world.day, gold = r.world.gold;
      expect(r.world.speed).toBe(0);
      r.ui.placement.start({ kind: 'houses' });
      r.ui.placement.pointAt(14, 9); r.ui.placement.pointAt(17, 9);
      expect(r.ui.placement.confirm().ok).toBe(true);               // 4 plots beside the rig's 2 huts: 6
      expect(r.world.goals.completed).toContain('plots');
      expect(r.world.day).toBe(day);
      expect(r.world.guide.done).toBe(true);                         // road, plots, well, food and temple all done
      expect(r.world.gold).toBeGreaterThan(gold);
      expect(r.root.querySelector('#goals .text').textContent).toBe(goalById('homes_cottage').text);
      expect(r.root.querySelector('#goals .chip').textContent).toBe(progressText(0, 8));
      expect(r.root.querySelector('#goals .skip-guide').hidden).toBe(true);
    } finally { r.cleanup(); }
  });
  it('puts the Undo toast last, so goals finished by the same command never push it out', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.placement.start({ kind: 'building', type: 'well' });
      r.ui.placement.moveGhost(5, 9);
      expect(r.ui.placement.confirm().ok).toBe(true);               // road, well, food and temple goals finish now
      const toasts = [...r.root.querySelectorAll('#toasts .toast')];
      const undo = toasts.find((t) => t.querySelector('.action'));
      expect(Boolean(undo)).toBe(true);
      expect(undo.querySelector('.action').textContent).toBe(T.undo);
      expect(toasts[toasts.length - 1]).toBe(undo);
    } finally { r.cleanup(); }
  });
  it('offers Skip guide while the guide runs; one tap turns it off and hides the button', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const skip = r.root.querySelector('#goals .skip-guide');
      expect(skip.hidden).toBe(false);
      expect(skip.textContent).toBe(T.skipGuide);
      fire(skip, 'click');
      expect(r.world.guide.on).toBe(false);
      expect(r.root.querySelector('#goals .skip-guide').hidden).toBe(true);
      expect(r.root.querySelector('#goals .goal-strip').hidden).toBe(false);   // the goals carry on without the guide
    } finally { r.cleanup(); }
  });
  it('hides the whole goals row when nothing is open, so #under-bar keeps no gap for it', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.goals.completed.push(...GOALS.map((g) => g.id));
      r.ui.refresh();
      expect(getComputedStyle(r.root.querySelector('#goals')).display).toBe('none');
    } finally { r.cleanup(); }
  });
  it('fits the strip on a phone at 150% text: 44 px buttons, nothing past the edge, the goal not cut off', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.settings.set({ textSize: 150 });
      const bar = r.root.querySelector('#under-bar').getBoundingClientRect();
      const strip = r.root.querySelector('#goals .goal-strip');
      const box = strip.getBoundingClientRect();
      expect(box.right <= bar.right + 0.5).toBe(true);
      for (const b of strip.querySelectorAll('button')) {
        if (b.hidden) continue;
        const rb = b.getBoundingClientRect();
        expect(rb.height).toBeGreaterThanOrEqual(44);
        expect(rb.right <= box.right + 0.5).toBe(true);
      }
      const text = strip.querySelector('.text');
      expect(text.scrollWidth <= text.clientWidth + 1).toBe(true);   // 'Lay a road' fits on its own line
      expect(getComputedStyle(strip.querySelector('.reward')).display).toBe('none');   // portrait: the reward reads in the sheet
    } finally { r.cleanup(); }
  });
  it('shows Today after the temple goal: three daily goals with progress, one swap, the lifetime count, a new draw each day', async () => {
    let now = FIXED;
    const r = await rigUI({ width: 1280, height: 800, clock: () => now });
    try {
      expect(r.world.daily).toBe(null);                              // not before the temple goal
      settle(r.world);                                               // the rig's city meets road, well, food and temple
      expect(r.world.goals.completed).toContain('temple');
      r.ui.afterCommand({ kind: 'check', undoable: false });         // any command draws the day's goals
      expect(r.world.daily.date).toBe('2026-10-11');
      r.store.set(openSheet(r.store.get(), 'goals'));
      const sheet = r.root.querySelector('#sheet');
      expect([...sheet.querySelectorAll('h3')].map((h) => h.textContent)).toContain(T.today);
      const rows = [...sheet.querySelectorAll('.daily')];
      expect(rows.length).toBe(DAILY_COUNT);
      r.world.daily.picks.forEach((id, i) => expect(rows[i].textContent).toContain(DAILY_TEXT[id]));
      expect(rows[0].textContent).toContain(rewardText(DAILY_REWARD));
      const firstPick = DAILY_POOL.find((d) => d.id === r.world.daily.picks[0]);
      expect(rows[0].querySelector('.chip').textContent).toBe(progressText(0, firstPick.n));   // counted from the draw's snapshot
      expect(sheet.textContent).toContain(dailyDoneText(r.world.tally.dailyDone));
      const swaps = sheet.querySelectorAll('.daily .swap');
      expect(swaps.length).toBe(DAILY_COUNT);
      const before = r.world.daily.picks.slice();
      fire(swaps[0], 'click');
      expect(r.world.daily.swapped).toBe(true);
      expect(r.world.daily.picks[0] === before[0]).toBe(false);
      expect(new Set(r.world.daily.picks).size).toBe(DAILY_COUNT);
      expect(r.root.querySelector('#sheet .daily').textContent).toContain(DAILY_TEXT[r.world.daily.picks[0]]);
      expect(r.root.querySelectorAll('#sheet .daily .swap').length).toBe(0);   // one swap a day
      now += DAY_MS;                                                  // a new local day, seen on the next rendered game day
      tickDay(r.world);
      r.frame(16);
      expect(r.world.daily.date).toBe(dateKeyOf(now));
      expect(r.world.daily.swapped).toBe(false);
    } finally { r.cleanup(); }
  });
});
```

`tests/all.js`: add `import './ui/goalsV2.test.js';` on the line after `import './ui/goalsList.test.js';`.

- [ ] **Step 2: Run them to see them fail**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui goals v2"
```
Expected: `LOAD ERROR` with `SyntaxError: The requested module '../../src/ui/goalsList.js' does not provide an export named 'dateKeyOf'` (or the same for `CHAPTER_NAMES` / `rewardText` from `text.js`).

- [ ] **Step 3: Implement**

`src/ui/text.js`:

Before:
```js
export const goalsProgressText = (done, total) => `${done} of ${total} done`;
```
After:
```js
export const goalsProgressText = (done, total) => `${done} of ${total} done`;
export const rewardText = (n) => `+${n} gold`;
export const progressLabel = (n, of) => `Progress ${progressText(n, of)}`;
export const dailyDoneText = (n) => plural(n, 'daily goal done', 'daily goals done');
export const swapLabel = (text) => `Swap: ${text}`;

// Goal chapters for the goals sheet (early-game pass 3.3); triggered first-time events come first.
export const CHAPTER_NAMES = { first_homes: 'First homes', feed: 'Feed the village', grow: 'Grow', event: 'Needs attention' };
// Daily goals (early-game pass 3.7), keyed by DAILY_POOL ids.
export const DAILY_TEXT = {
  plots4: 'Place 4 housing plots', roads10: 'Lay 10 road tiles', upgrades3: 'Grow 3 homes a tier', well1: 'Build a well',
  bazaar1: 'Build a bazaar', temple1: 'Build a temple', farm1: 'Build a grain farm', people20: 'Gain 20 people',
  profit1: 'Have a month in profit', harvest100: 'Store 100 grain',
};
```
(`progressText` and `plural` are defined above this line, so the arrow functions can use them.)

Before (inside `T`):
```js
  foodInStore: 'Food in store', employment: 'Employment', moodBreakdown: 'Mood', goals: 'Goals', goal: 'Goal', showMe: 'Show me', goalsDone: 'All goals done', goalDone: 'Goal done', goalsNone: 'No goals open',
```
After:
```js
  foodInStore: 'Food in store', employment: 'Employment', moodBreakdown: 'Mood', goals: 'Goals', goal: 'Goal', showMe: 'Show me', goalsDone: 'All goals done', goalDone: 'Goal done', goalsNone: 'No goals open',
  skipGuide: 'Skip guide', today: 'Today', swap: 'Swap', done: 'Done',
```

`src/ui/goalsList.js` (whole file):
```js
// The goals list (spec 4.1; early-game pass 2.7, 3.3 and 3.7). The strip under the top bar shows the first
// open goal with its progress ("2 of 6"), its reward, a filled Show me, Goals and, while the guide runs, Skip
// guide; the whole row hides when no goal is open. The goals sheet shows up to three open goals grouped by
// chapter, then today's daily goals. Goal state lives in the world (src/sim/goals.js, src/sim/daily.js):
// this file reads it, and changes it only through swapDaily.
import { GOALS } from '../data/goals.js';
import { DAILY_REWARD } from '../data/daily.js';
import { openGoals, goalProgress, guideActive } from '../sim/goals.js';
import { dailyProgress, swapDaily } from '../sim/daily.js';
import { alertsFor } from '../sim/alerts.js';
import { housesOf } from '../sim/world.js';
import { el, button, clear, setText } from './components.js';
import { T, CHAPTER_NAMES, DAILY_TEXT, goalsProgressText, rewardText, progressText, progressLabel, dailyDoneText, swapLabel } from './text.js';

const FOCUS_CLASSES = ['show-me', 'open-goals', 'skip-guide'];

// The device's local date as 'YYYY-MM-DD'. It is the only way the date reaches the sim (daily goals).
export function dateKeyOf(ms) {
  const d = new Date(ms);
  const two = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

// Where a goal's Show me points. 'alert' aims at the first building with that alert (an event goal's trouble);
// a goal with no showMe (out of debt) and any target that finds nothing fall back to the city's focus.
export function showMeTarget(world, goal) {
  const show = goal.showMe;
  const kind = show ? show.target : null;
  if (kind === 'alert') {
    const a = alertsFor(world).find((x) => x.code === show.code && x.id && world.buildings[x.id]);
    if (a) { const b = world.buildings[a.id]; return { x: b.x + b.w / 2, y: b.y + b.d / 2 }; }
  }
  if (kind === 'startRoad' && world.startRoad.length) {
    const [x, y] = world.startRoad[world.startRoad.length - 1];
    return { x: x + 0.5, y: y + 0.5 };
  }
  if (kind === 'houses') {
    const homes = housesOf(world);
    if (homes.length) {
      const sx = homes.reduce((n, h) => n + h.x + h.w / 2, 0), sy = homes.reduce((n, h) => n + h.y + h.d / 2, 0);
      return { x: sx / homes.length, y: sy / homes.length };
    }
  }
  return { x: world.focus.x, y: world.focus.y };
}

// "2 of 6" (and its words for screen readers) where a goal counts something, else null. Never past the target.
function countOf(world, goal) {
  const p = goalProgress(world, goal);
  if (!p) return null;
  const n = Math.min(p.n, p.of);
  return { text: progressText(n, p.of), label: progressLabel(n, p.of) };
}
const chip = (c) => el('span', { class: 'chip small', role: 'img', 'aria-label': c.label, text: c.text });

function goalRow(world, goal, onShowMe) {
  const c = countOf(world, goal);
  return el('li', { class: 'goal' }, [
    el('span', { class: 'text' }, [goal.text, ' ', c ? chip(c) : null, c ? ' ' : null, el('span', { class: 'reward small muted', text: rewardText(goal.reward) })]),
    button(T.showMe, { class: 'show-me primary', onClick: () => onShowMe(goal) }),
  ]);
}

export function createGoalsStrip({ container, world, onShowMe, onOpen, onSkipGuide = () => {} }) {
  const strip = el('div', { class: 'goal-strip', hidden: true });
  container.append(strip);
  let shownId, parts = null;

  // Rebuilt only when the goal changes (refreshChrome runs every day and command), so focus survives refreshes.
  function build(goal) {
    const focusedClass = strip.contains(document.activeElement) ? [...document.activeElement.classList].find((c) => FOCUS_CLASSES.includes(c)) : null;
    clear(strip);
    parts = null;
    if (!goal) return;
    const progress = el('span', { class: 'chip small', role: 'img' });
    const showMe = button(T.showMe, { class: 'show-me primary', onClick: () => onShowMe(goal) });
    const skip = button(T.skipGuide, { class: 'skip-guide quiet', onClick: () => onSkipGuide() });
    strip.append(
      el('span', { class: 'main' }, [
        el('span', { class: 'label small muted', text: T.goal }),
        el('span', { class: 'text', text: goal.text, title: goal.text }),
        progress,
        el('span', { class: 'reward small muted', text: rewardText(goal.reward) }),
      ]),
      el('span', { class: 'buttons' }, [showMe, button(T.goals, { class: 'open-goals quiet', onClick: onOpen }), skip]),
    );
    parts = { progress, showMe, skip };
    update(goal);
    if (focusedClass) {
      const again = strip.querySelector(`.${focusedClass}`);
      (again && !again.hidden ? again : showMe).focus();
    }
  }
  function update(goal) {
    const c = countOf(world, goal);
    parts.progress.hidden = !c;
    if (c) { setText(parts.progress, c.text); parts.progress.setAttribute('aria-label', c.label); }
    const hide = !guideActive(world);
    if (hide && document.activeElement === parts.skip) parts.showMe.focus();   // Skip guide hides itself: keep focus in the strip
    parts.skip.hidden = hide;
  }
  function render() {
    const [goal] = openGoals(world, 1);
    const id = goal ? goal.id : null;
    strip.hidden = !goal;
    container.hidden = !goal;                         // no empty row, and so no gap, in #under-bar
    if (id !== shownId) { shownId = id; build(goal); }
    else if (goal) update(goal);
  }
  render();
  return { render };
}

// The goals sheet: the chain's count, up to three open goals by chapter, then Today when daily goals are drawn.
export function goalsSheet(world, { onShowMe, onSwap = (i) => swapDaily(world, i).ok }) {
  function draw(body) {
    const done = GOALS.filter((g) => world.goals.completed.includes(g.id)).length;   // event goals never count against the chain
    body.append(el('p', { class: 'muted', text: goalsProgressText(done, GOALS.length) }));
    const open = openGoals(world, 3);
    if (!open.length) body.append(el('p', { text: T.goalsDone }));
    const chapters = [];
    for (const g of open) if (!chapters.includes(g.chapter)) chapters.push(g.chapter);
    for (const ch of chapters) {
      body.append(el('h3', { text: CHAPTER_NAMES[ch] || '' }), el('ul', { class: 'goals' }, open.filter((g) => g.chapter === ch).map((g) => goalRow(world, g, onShowMe))));
    }
    if (world.daily) body.append(...today(body));
  }
  // Today (spec 3.7): no streaks, no countdowns. Swap is offered once a day, on a goal not yet done.
  function today(body) {
    const d = world.daily;
    const rows = d.picks.map((id, i) => {
      const done = d.done.includes(id);
      const p = dailyProgress(world, id);
      const text = DAILY_TEXT[id] || id;
      const status = done
        ? el('span', { class: 'status small teal' }, [el('span', { 'aria-hidden': 'true', text: '✓ ' }), T.done])
        : chip({ text: progressText(p.n, p.of), label: progressLabel(p.n, p.of) });
      const swap = !done && !d.swapped
        ? button(T.swap, { class: 'swap quiet', 'aria-label': swapLabel(text), onClick: () => { if (onSwap(i)) { clear(body); draw(body); } } })
        : null;
      return el('li', { class: done ? 'daily done' : 'daily' }, [
        el('span', { class: 'text' }, [text, ' ', status, ' ', el('span', { class: 'reward small muted', text: rewardText(DAILY_REWARD) })]),
        swap,
      ]);
    });
    return [el('h3', { text: T.today }), el('ul', { class: 'goals' }, rows), el('p', { class: 'small muted', text: dailyDoneText(world.tally.dailyDone) })];
  }
  return (body) => draw(body);
}
```

`src/ui/createUI.js`:

Imports. Before:
```js
import { createGoalsStrip, goalsSheet, showMeTarget } from './goalsList.js';
```
After:
```js
import { createGoalsStrip, goalsSheet, showMeTarget, dateKeyOf } from './goalsList.js';
```
And add these three lines right after `import { goalById, nextItemFor } from '../sim/goals.js';` (Task 11's line):
```js
import { settle } from '../sim/settle.js';
import { startDaily } from '../sim/daily.js';
import { setGuide } from '../sim/commands.js';
```

Before:
```js
  const goalsStrip = createGoalsStrip({ container: $('goals'), world, onShowMe: showMe, onOpen: () => toggleSheet('goals') });
```
After:
```js
  const goalsStrip = createGoalsStrip({ container: $('goals'), world, onShowMe: showMe, onOpen: () => toggleSheet('goals'), onSkipGuide: skipGuide });
```

Add right before `function toggleSheet(kind) {`:
```js
  // Skip guide (spec 3.2): one tap, no confirm. Resume guide in How to play brings it back.
  function skipGuide() { setGuide(world, false); refresh(); }
  // Daily goals (spec 3.7) come from the device's local date, read once when this game starts, so nothing
  // expires mid-session (a session that crosses midnight keeps its goals; the next start draws the new day).
  // startDaily does nothing before the opening chain is done or once that date's goals exist, so calling it at
  // start, after every command and on every new game day is cheap: it draws the moment the chain finishes.
  const sessionDate = dateKeyOf(clock());
  function syncDaily() { startDaily(world, sessionDate); }
```

Replace the whole `afterCommand` function. Before:
```js
  function afterCommand(e) {
    if (e.undoable) {                                  // a ✓ outcome: place, road, plots or demolish
      sfx.play(e.kind === 'road' ? 'road' : e.kind === 'demolish' ? 'demolish' : 'place');
      sfx.buzz(20);
      toasts.show(e.text, { action: T.undo, onAction: undo, ms: UNDO_TOAST_MS });
    } else if (e.kind === 'undo') toasts.show(T.undone);
    ghostsDirty = true;
    refresh();
  }
```
After:
```js
  function afterCommand(e) {
    if (e.undoable) {                                  // a ✓ outcome: place, road, plots or demolish
      sfx.play(e.kind === 'road' ? 'road' : e.kind === 'demolish' ? 'demolish' : 'place');
      sfx.buzz(20);
    }
    ghostsDirty = true;
    // Goals, firsts, achievements and daily goals settle after every command (undo and speed included), so a
    // guided step finishes while the game is paused (early-game pass 3.2).
    const events = settle(world, []);
    if (events.length) { effects.fromEvents(world, events, now()); onEvents(events); }
    syncDaily();
    // The command's own toast goes last: two toasts at most, so goal lines from the same command never push its Undo out.
    if (e.undoable) toasts.show(e.text, { action: T.undo, onAction: undo, ms: UNDO_TOAST_MS });
    else if (e.kind === 'undo') toasts.show(T.undone);
    refresh();
  }
```

In `render`, before:
```js
    if (world.day !== lastDay) { lastDay = world.day; ghostsDirty = true; refreshDaily(); }
```
After:
```js
    if (world.day !== lastDay) { lastDay = world.day; ghostsDirty = true; syncDaily(); refreshDaily(); }
```

At the end of construction, before:
```js
  refreshDaily();
  if (welcome) store.set(openSheet(store.get(), 'welcome'));
```
After:
```js
  syncDaily();
  refreshDaily();
  if (welcome) store.set(openSheet(store.get(), 'welcome'));
```

In `destroy`, add this line right after the `for (const id of [...]) clear($(id));` loop over the shell containers:
```js
      $('goals').hidden = false;                       // the strip hides its row when no goal is open; the next UI decides again
```

`css/ui.css`. Before:
```css
.goal-strip { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; background: var(--parchment); border-radius: var(--radius); padding: 2px 4px 2px 12px; box-shadow: var(--shadow); }
.goal-strip .text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
body[data-layout="wide"] #goals { max-width: 440px; }
body[data-layout="compact"] #under-bar { right: calc(var(--rail-w) + var(--safe-right) + 8px); }
.goals { list-style: none; padding: 0; }
.goals .goal { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--parchment-2); }
```
After:
```css
/* The strip's buttons wrap onto a second line when the goal's words need the room (phones, large text). */
.goal-strip { display: inline-flex; flex-wrap: wrap; align-items: center; column-gap: 8px; row-gap: 0; max-width: 100%; box-sizing: border-box; background: var(--parchment); border-radius: var(--radius); padding: 2px 4px 2px 12px; box-shadow: var(--shadow); }
.goal-strip .main { display: flex; align-items: center; gap: 8px; flex: 1 1 140px; min-width: 0; }
.goal-strip .text { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goal-strip .reward { flex: none; white-space: nowrap; }
.goal-strip .buttons { display: flex; align-items: center; gap: 4px; flex: none; margin-left: auto; }
body[data-layout="portrait"] .goal-strip .reward { display: none; }   /* phones: the reward reads in the goals sheet */
.chip { flex: none; display: inline-block; background: var(--teal-soft); color: var(--ink); border-radius: 10px; padding: 0 8px; white-space: nowrap; }
body[data-layout="wide"] #goals { max-width: 560px; }
body[data-layout="compact"] #under-bar { right: calc(var(--rail-w) + var(--safe-right) + 8px); }
.goals { list-style: none; padding: 0; }
.goals .goal, .goals .daily { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--parchment-2); }
#sheet .goals + h3 { margin-top: 10px; }
```

- [ ] **Step 4: Run the tests to see them pass**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui goals"
```
Expected: `ALL PASSED` (the 6 tests of `ui goals` and the 10 of `ui goals v2`; apply Step 5's goalsList.test.js first, since the old file still expects the pre-pass count and reward text).

- [ ] **Step 5: Update the existing tests this breaks**

Searched `tests/` (including `tests/audio/`) for the strip markup (`goal-strip`, `show-me`, `open-goals`, `+25`, `reward`), goal toasts (`goalDone`, `#toasts .toast`), sounds after commands (`played`), gold after commands (`world.gold`), `goalsProgressText` / `of 7 done`, and the goals sheet (`#sheet .goal`).

1. `tests/ui/goalsList.test.js`: replace the whole file (it carries Task 11's ghost change; counts now come from `GOALS.length`, the reward from `rewardText`, chapters are checked, and an emptied strip hides its row):
```js
import { describe, it, expect } from '../harness.js';
import { createGoalsStrip, goalsSheet, showMeTarget } from '../../src/ui/goalsList.js';
import { GOALS, GOAL_REWARD } from '../../src/data/goals.js';
import { goalById } from '../../src/sim/goals.js';
import { canPlace } from '../../src/sim/commands.js';
import { T, CHAPTER_NAMES, goalsProgressText, rewardText } from '../../src/ui/text.js';
import { openSheet } from '../../src/ui/modes.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

describe('ui goals', () => {
  it('shows the first open goal in the strip with Show me, and hides the row when all are done', () => {
    const { root, cleanup } = mount();
    const world = makeTestWorld();
    const shown = [], opened = [];
    const strip = createGoalsStrip({ container: root, world, onShowMe: (g) => shown.push(g.id), onOpen: () => opened.push(1) });
    expect(root.textContent).toContain(GOALS[0].text);
    expect(root.textContent).toContain(rewardText(GOAL_REWARD));
    fire(root.querySelector('.show-me'), 'click');
    expect(shown).toEqual(['road']);
    fire(root.querySelector('.open-goals'), 'click');
    expect(opened).toEqual([1]);
    world.goals.completed.push('road');
    strip.render();
    expect(root.textContent).toContain(GOALS[1].text);
    world.goals.completed = GOALS.map((g) => g.id);
    strip.render();
    expect(root.querySelector('.goal-strip').hidden).toBe(true);
    expect(root.hidden).toBe(true);                                  // the whole row goes, so #under-bar keeps no gap for it
    cleanup();
  });
  it('renders the goals sheet by chapter with the count and up to three goals', () => {
    const { root, cleanup } = mount();
    const world = makeTestWorld();
    world.goals.completed.push('road');
    const shown = [];
    goalsSheet(world, { onShowMe: (g) => shown.push(g.id) })(root, { close: () => {} });
    expect(root.textContent).toContain(goalsProgressText(1, GOALS.length));
    expect([...root.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([CHAPTER_NAMES.first_homes, CHAPTER_NAMES.feed]);
    const rows = root.querySelectorAll('.goal');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain(GOALS[1].text);
    fire(rows[2].querySelector('.show-me'), 'click');
    expect(shown).toEqual(['food']);
    world.goals.completed = GOALS.map((g) => g.id);
    root.innerHTML = '';
    goalsSheet(world, { onShowMe: () => {} })(root, { close: () => {} });
    expect(root.textContent).toContain(T.goalsDone);
    cleanup();
  });
  it('finds the Show me target for each kind', () => {
    const world = makeTestWorld();
    world.startRoad = [[31, 31], [31, 30], [31, 29]];
    expect(showMeTarget(world, goalById('road'))).toEqual({ x: 31.5, y: 29.5 });
    expect(showMeTarget(world, goalById('food'))).toEqual({ x: world.focus.x, y: world.focus.y });
    expect(showMeTarget(world, goalById('well'))).toEqual({ x: world.focus.x, y: world.focus.y });   // no homes yet
    addRaw(world, 'house', 10, 10); addRaw(world, 'house', 12, 10);
    expect(showMeTarget(world, goalById('well'))).toEqual({ x: 11.5, y: 10.5 });
  });
  it('wires Show me into the game: the right card starts, the camera moves, and done goals toast', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    r.ui.settings.set({ reducedMotion: 'off' });
    expect(r.root.querySelector('#goals .goal-strip').hidden).toBe(false);
    fire(r.root.querySelector('#goals .show-me'), 'click');
    const s = r.store.get();
    expect(s.category).toBe('roads');
    expect(s.mode).toBe('drawing');
    expect(s.sheet).toBe(null);
    expect(r.ui.cameraControl.animating).toBe(true);
    r.store.set(openSheet(r.store.get(), 'goals'));
    expect(r.root.querySelectorAll('#sheet .goal').length).toBe(3);
    r.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }]);
    expect(r.root.querySelector('#toasts .toast').textContent).toContain(GOALS[0].text);
    r.store.set(openSheet(r.store.get(), 'summary'));
    expect(r.root.querySelector('#sheet').textContent).toContain(GOALS[0].text);
    r.store.set({ overlay: 'water' });
    expect(document.body.classList.contains('has-overlay')).toBe(true);
    r.cleanup();
  });
  it('keeps keyboard focus on the strip across refreshes', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    const btn = r.root.querySelector('#goals .show-me');
    btn.focus();
    expect(document.activeElement).toBe(btn);
    r.ui.refresh();
    expect(document.activeElement).toBe(r.root.querySelector('#goals .show-me'));
    r.world.goals.completed.push('road');         // a new goal rebuilds the strip; focus goes back to the same button
    r.ui.refresh();
    expect(r.root.querySelector('#goals').textContent).toContain(GOALS[1].text);
    expect(document.activeElement).toBe(r.root.querySelector('#goals .show-me'));
    r.cleanup();
  });
  it('stacks under the banner and the legend, and Show me puts a building ghost on a free tile near the target', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    r.world.gold = -30; r.ui.alerts.refresh();
    r.store.set({ overlay: 'water' });
    const top = (sel) => r.root.querySelector(sel).getBoundingClientRect().top;
    const bottom = (sel) => r.root.querySelector(sel).getBoundingClientRect().bottom;
    expect(bottom('#banner')).toBeGreaterThan(top('#banner'));
    expect(bottom('#legend')).toBeGreaterThan(top('#legend'));
    expect(top('#legend') >= bottom('#banner')).toBe(true);
    expect(top('#goals .goal-strip') >= bottom('#legend')).toBe(true);
    r.world.gold = 1000;                                              // out of debt, so the ghost's tile can be judged a fit
    r.world.goals.completed.push('road', 'plots');
    r.ui.refresh();
    fire(r.root.querySelector('#goals .show-me'), 'click');
    const t = showMeTarget(r.world, goalById('well'));
    const ghost = r.store.get().ghost;
    expect(r.store.get().tool.type).toBe('well');
    expect(Math.abs(ghost.x + 0.5 - t.x) <= 2 && Math.abs(ghost.y + 0.5 - t.y) <= 2).toBe(true);   // beside the homes, not on them
    expect(canPlace(r.world, 'well', ghost.x, ghost.y).ok).toBe(true);
    r.cleanup();
  });
});
```

2. `tests/ui/createUI.test.js`, "places a well from the dock ... then Undo from the toast": placing the well now settles the four goals the rig's city already meets (gold +100, and Task 3's first family +10) and their goal toasts. Settle them before the test's command so the gold check and the toast check are about the command alone. Add `import { settle } from '../../src/sim/settle.js';` to the imports. Before:
```js
    const r = await rigUI();
    expect(r.store.get().layout).toBe('portrait');
```
After:
```js
    const r = await rigUI();
    settle(r.world);                                                          // the rig's city already meets four goals: pay them now
    const start = r.world.gold;
    expect(r.store.get().layout).toBe('portrait');
```
Before:
```js
    expect(r.world.gold).toBe(1000);
```
After:
```js
    expect(r.world.gold).toBe(start);
```

3. `tests/audio/sfx.test.js`, "plays from the game: commands and ✓, events, ...": the first ✓ would now also play four goal sounds. Add `import { settle } from '../../src/sim/settle.js';` to the imports. Before:
```js
    const r = await rigUI({ width: 1280, height: 800, sfx });
    expect(r.ui.sfx).toBe(sfx);
```
After:
```js
    const r = await rigUI({ width: 1280, height: 800, sfx });
    settle(r.world);                                                          // the rig's city already meets four goals: settle them silently first
    expect(r.ui.sfx).toBe(sfx);
```

4. No other test breaks: `tests/ui/boot.test.js` counts `.goal-strip` (still one) and checks gold only before any command; `tests/ui/a11y.test.js` finds every new button named ("Skip guide", "Swap", "Show me"; the chip is `role="img"` with a label); `tests/ui/welcomeBack.test.js`, `autosave.test.js` and `pwa.test.js` assert nothing that settling changes.

- [ ] **Step 6: Full suite**

```powershell
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```
Expected: the last line is `ALL PASSED`.

- [ ] **Step 7: Commit**

```powershell
git add src/ui/goalsList.js src/ui/createUI.js src/ui/text.js css/ui.css sw-files.js tests/ui/goalsV2.test.js tests/ui/goalsList.test.js tests/ui/createUI.test.js tests/audio/sfx.test.js tests/helpers/uiWorld.js tests/all.js
git commit -m "Settle goals after every command and let the goals strip point the way`n`nThe strip shows progress, the reward in gold, a filled Show me and Skip guide while the guide runs, and hides its row when nothing is open. The goals sheet groups goals by chapter and adds Today with one swap and a lifetime count. Daily goals are drawn from the device's local date at start, after commands and on each new game day; the Undo toast now comes after any goal lines.`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: The guided start and the Help setting

**Files:**
- Create: `src/ui/guide.js`, `tests/ui/guide.test.js`
- Modify: `src/ui/settings.js`, `src/ui/menu.js`, `src/boot.js`, `src/ui/createUI.js`, `src/ui/dock.js`, `src/ui/sidePanel.js`, `src/ui/rail.js`, `src/render/overlays.js`, `src/data/ui.js`, `src/ui/text.js`, `css/ui.css`
- Test: modify `tests/helpers/uiWorld.js` (cleanup), `tests/all.js`

**Interfaces:**
- Consumes: `guideActive`, `guideGoal`, `nextItemFor` (Task 2), `GUIDE_GOALS` (Task 2), `setGuide` (Task 2), `categoryOfItem` and `showMeTarget` (Task 11), `skipGuide` / `refresh` and the strip's `.skip-guide` (Task 12), the cards' `[data-item]` and Task 9's `canvas.thumb`, `quad`, `TEAL_DARK`, `UI.halo`.
- Produces: `createGuide({ world, store, root, reducedMotion })` → `{ state(), render(), marker(now), destroy() }` with `state()` → `{ active, goal, item, category }`; sets `body.guide-on`, `.card[data-item=<item>].suggested` (with a `.tag` reading `T.suggested`), `.dimmed` on every other card, and `.suggested` / `.dimmed` on `.cat[data-category]` and `.tab[data-category]`. `guideState(world)`, `canResumeGuide(world)`. `drawGuideMarker(g, x, y, pulsing, now)` in `src/render/overlays.js`. `GUIDE_PULSES = 2`, `GUIDE_PULSE_MS = 600` in `src/data/ui.js`. `settings.help` (`'full' | 'tips' | 'off'`, default `'full'`), `settings.seenTips` (array of strings, default `[]`), `HELP_LEVELS`. `createMenuSheets({ ..., canResumeGuide, onResumeGuide })`. A new city's guide follows `settings.help`. `createUI` returns `guide`. `src/ui/text.js`: `HELP_NAMES`, `T.helpLevel`, `T.suggested`, `T.resumeGuide`, `T.guideHelp`.

- [ ] **Step 1: Write the failing tests**

`tests/helpers/uiWorld.js` (a failed test must not leave the guide's body class behind). Before:
```js
      document.body.classList.remove('has-banner', 'has-overlay', 'panel-folded', 'reduce-motion');
```
After:
```js
      document.body.classList.remove('has-banner', 'has-overlay', 'panel-folded', 'reduce-motion', 'guide-on');
```

`tests/ui/guide.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { boot } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { createSettings, DEFAULT_SETTINGS } from '../../src/ui/settings.js';
import { createMenuSheets } from '../../src/ui/menu.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { openSheet } from '../../src/ui/modes.js';
import { showMeTarget } from '../../src/ui/goalsList.js';
import { canResumeGuide } from '../../src/ui/guide.js';
import { guideGoal } from '../../src/sim/goals.js';
import { drawGuideMarker } from '../../src/render/overlays.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { p } from '../../src/render/iso.js';
import { GUIDE_PULSES, GUIDE_PULSE_MS } from '../../src/data/ui.js';
import { T, HELP_NAMES } from '../../src/ui/text.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { rigUI, mountShell, fakeHistory } from '../helpers/uiWorld.js';
import { makeCanvas, canvasHash, pixelAt } from '../helpers/canvas.js';
import { mount, fire } from '../helpers/dom.js';

// The game booted straight into a new city (?skipTitle=1) with the given stored settings.
async function bootWith(stored) {
  const shell = await mountShell(1280, 800);
  const history = fakeHistory();
  const storage = { getItem: () => (stored ? JSON.stringify(stored) : null), setItem: () => {} };
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('skipTitle=1&seed=8'),
    now: () => 0, clock: () => 1760000000000, storage, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

// Contrast as shown: the text colour with its alpha and every opacity up to `stop`, over `stop`'s background.
const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
function backdrop(node) {
  for (let n = node; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) return c; }
  return [255, 255, 255, 1];
}
const lum = (c) => { const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
function contrastIn(node, stop) {
  const fg = rgba(getComputedStyle(node).color);
  let alpha = fg[3];
  for (let n = node; n; n = n.parentElement) { alpha *= Number(getComputedStyle(n).opacity); if (n === stop) break; }
  const bg = backdrop(stop);
  const shown = [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha));
  const [hi, lo] = [lum(shown), lum(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

describe('ui guide', () => {
  it('stores the Help level and the seen tips, defaulting to Guide and tips', () => {
    const { root, cleanup } = mount();
    try {
      const data = {};
      const storage = { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
      const s = createSettings({ storage, root, systemReducedMotion: () => false });
      expect(DEFAULT_SETTINGS.help).toBe('full');
      expect(DEFAULT_SETTINGS.seenTips).toEqual([]);
      expect(s.get().help).toBe('full');
      s.set({ help: 'tips', seenTips: ['play'] });
      s.set({ help: 'never', seenTips: [1] });                       // invalid values are ignored
      expect(s.get().help).toBe('tips');
      expect(s.get().seenTips).toEqual(['play']);
      const again = createSettings({ storage, root, systemReducedMotion: () => false });
      expect(again.get().help).toBe('tips');
      expect(again.get().seenTips).toEqual(['play']);
      again.get().seenTips.push('x');
      expect(DEFAULT_SETTINGS.seenTips).toEqual([]);                  // the defaults never change
    } finally { cleanup(); }
  });
  it('offers the Help choice in settings', () => {
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const settings = createSettings({ storage: { getItem: () => null, setItem: () => {} }, root, systemReducedMotion: () => false });
      const menus = createMenuSheets({ store: createStore(INITIAL_UI_STATE), settings, toasts: { show: () => {} } });
      const body = root.querySelector('#body');
      menus.settings(body, { close: () => {} });
      const choices = [...body.querySelectorAll('.choice.help')];
      expect(choices.map((b) => b.textContent)).toEqual([HELP_NAMES.full, HELP_NAMES.tips, HELP_NAMES.off]);
      expect(choices[0].getAttribute('aria-pressed')).toBe('true');
      fire(body.querySelector('.choice.help[data-value="off"]'), 'click');
      expect(settings.get().help).toBe('off');
      expect(body.querySelector('.choice.help[data-value="off"]').getAttribute('aria-pressed')).toBe('true');
    } finally { cleanup(); }
  });
  it('starts a new city with the guide on only under Guide and tips', async () => {
    let r = await bootWith(null);
    try {
      expect(r.api.game().world.guide.on).toBe(true);
      expect(document.body.classList.contains('guide-on')).toBe(true);
      r.api.game().ui.settings.set({ help: 'off' });
      r.api.hooks.newCity();
      expect(r.api.game().world.guide.on).toBe(false);
      expect(document.body.classList.contains('guide-on')).toBe(false);
    } finally { r.cleanup(); }
    r = await bootWith({ help: 'tips' });
    try {
      expect(r.api.game().world.guide.on).toBe(false);
    } finally { r.cleanup(); }
  });
  it('suggests the card the step needs, dims the rest and keeps them usable', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      expect(r.ui.guide.state()).toEqual({ active: true, goal: guideGoal(r.world), item: 'road', category: 'roads' });
      expect(document.body.classList.contains('guide-on')).toBe(true);
      const road = r.root.querySelector('#panel .card[data-item="road"]');
      expect(road.classList.contains('suggested')).toBe(true);
      expect(road.querySelector('.tag').textContent).toBe(T.suggested);
      const demolish = r.root.querySelector('#panel .card[data-item="demolish"]');
      expect(demolish.classList.contains('dimmed')).toBe(true);
      expect(demolish.querySelector('.tag')).toBe(null);
      expect(r.root.querySelector('#panel .tab[data-category="roads"]').classList.contains('suggested')).toBe(true);
      expect(r.root.querySelector('#panel .tab[data-category="homes"]').classList.contains('dimmed')).toBe(true);
      expect(r.root.querySelector('#dock .cat[data-category="roads"]').classList.contains('suggested')).toBe(true);
      fire(demolish, 'click');                                       // dimmed, still usable
      expect(r.store.get().mode).toBe('demolishing');
    } finally { r.cleanup(); }
  });
  it('moves the suggestion to the plots card once a road is drawn, with the dot on Homes', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.placement.start({ kind: 'road' });
      r.ui.placement.pointAt(5, 14); r.ui.placement.pointAt(8, 14);
      expect(r.ui.placement.confirm().ok).toBe(true);               // settles: road, well, food and temple are done
      r.ui.placement.cancel();
      expect(r.ui.guide.state().item).toBe('house');
      r.store.set({ category: 'homes' });
      expect(r.root.querySelector('#panel .card[data-item="house"]').classList.contains('suggested')).toBe(true);
      expect(r.root.querySelector('#panel .tab[data-category="homes"]').classList.contains('suggested')).toBe(true);
      expect(r.root.querySelector('#panel .tab[data-category="roads"]').classList.contains('dimmed')).toBe(true);
      expect(r.root.querySelector('#dock .cat[data-category="homes"]').classList.contains('suggested')).toBe(true);
    } finally { r.cleanup(); }
  });
  it('Skip guide clears every mark; Resume guide in How to play brings them back', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      fire(r.root.querySelector('#goals .skip-guide'), 'click');
      expect(r.world.guide.on).toBe(false);
      expect(document.querySelectorAll('.suggested, .dimmed, .card .tag').length).toBe(0);
      expect(document.body.classList.contains('guide-on')).toBe(false);
      expect(r.ui.guide.marker(0)).toBe(null);
      expect(canResumeGuide(r.world)).toBe(true);
      r.store.set(openSheet(r.store.get(), 'help'));
      const resume = r.root.querySelector('#sheet .resume-guide');
      expect(resume.textContent).toBe(T.resumeGuide);
      fire(resume, 'click');
      expect(r.world.guide.on).toBe(true);
      expect(r.store.get().sheet).toBe(null);
      expect(r.root.querySelector('#panel .card[data-item="road"]').classList.contains('suggested')).toBe(true);
      r.store.set(openSheet(r.store.get(), 'help'));
      expect(r.root.querySelector('#sheet .resume-guide')).toBe(null);   // offered only while the guide is off
    } finally { r.cleanup(); }
  });
  it('turns a running guide off when Help changes to Tips only or Off, and leaves it off when it changes back', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.settings.set({ sound: true });                            // another setting leaves the guide alone
      expect(r.world.guide.on).toBe(true);
      r.ui.settings.set({ help: 'tips' });
      expect(r.world.guide.on).toBe(false);
      expect(document.body.classList.contains('guide-on')).toBe(false);
      r.ui.settings.set({ help: 'full' });                           // Resume guide brings it back, not the setting
      expect(r.world.guide.on).toBe(false);
      expect(canResumeGuide(r.world)).toBe(true);
    } finally { r.cleanup(); }
  });
  it("rings the step's target on the map: two pulses when the step changes, then still, and still under reduced motion", async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.settings.set({ reducedMotion: 'off' });
      const first = r.ui.guide.marker(1000);
      expect({ x: first.x, y: first.y }).toEqual(showMeTarget(r.world, guideGoal(r.world)));
      expect(first.pulsing).toBe(true);
      expect(r.ui.guide.marker(1000 + GUIDE_PULSES * GUIDE_PULSE_MS - 1).pulsing).toBe(true);
      expect(r.ui.guide.marker(1000 + GUIDE_PULSES * GUIDE_PULSE_MS).pulsing).toBe(false);
      r.world.goals.completed.push('road');                          // the next step rings afresh
      r.ui.refresh();
      expect(r.ui.guide.marker(9000)).toEqual({ ...showMeTarget(r.world, guideGoal(r.world)), pulsing: true });
      r.ui.settings.set({ reducedMotion: 'on' });
      expect(r.ui.guide.marker(9001).pulsing).toBe(false);
      r.frame(9002);                                                 // the frame draws the ring without throwing
    } finally { r.cleanup(); }
  });
  it('draws the ring the same at rest whatever the time, and grows it while pulsing', () => {
    const shot = (pulsing, now) => {
      const c = makeCanvas(240, 160);
      const ctx = c.getContext('2d');
      const [ax, ay] = p(10.5, 10.5);
      ctx.translate(120 - 2 * ax, 80 - 2 * ay);
      drawGuideMarker(makeDraw(ctx, 2), 10.5, 10.5, pulsing, now);
      return c;
    };
    const still = shot(false, 0);
    expect(canvasHash(still)).toBe(canvasHash(shot(false, 300)));
    expect(canvasHash(shot(true, 0)) === canvasHash(shot(true, 300))).toBe(false);
    let inked = 0;
    for (let x = 0; x < 240; x += 2) for (let y = 0; y < 160; y += 2) if (pixelAt(still, x, y)[3] > 0) inked++;
    expect(inked).toBeGreaterThan(20);
  });
  it('keeps dimmed cards readable: their words at 4.5:1 or better, and the Suggested tag too', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const demolish = r.root.querySelector('#panel .card[data-item="demolish"]');
      expect(demolish.classList.contains('dimmed')).toBe(true);
      expect(getComputedStyle(demolish).opacity).toBe('1');          // only the picture fades
      for (const sel of ['.name', '.cost']) expect(contrastIn(demolish.querySelector(sel), demolish)).toBeGreaterThanOrEqual(4.5);
      const tag = r.root.querySelector('#panel .card.suggested .tag');
      expect(contrastIn(tag, tag)).toBeGreaterThanOrEqual(4.5);
    } finally { r.cleanup(); }
  });
});
```

`tests/all.js`: add `import './ui/guide.test.js';` on the line after `import './ui/goalsV2.test.js';`.

- [ ] **Step 2: Run them to see them fail**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui guide"
```
Expected: `LOAD ERROR` naming `/src/ui/guide.js` (404: `Failed to fetch dynamically imported module`, or `does not provide an export named 'drawGuideMarker'`).

- [ ] **Step 3: Implement**

`src/data/ui.js`: add right after `export const SHOW_ME_PULSE_MS = 400;`:
```js
export const GUIDE_PULSES = 2;          // the guide's map ring pulses twice when its step changes, then stays still (spec 3.2)
export const GUIDE_PULSE_MS = 600;      // one pulse: under 3 flashes a second, done well within 5 s (spec 5.4)
```

`src/ui/text.js`:

Before:
```js
export const SPEED_LABELS = ['Paused', '1×', '2×', '3×'];
```
After:
```js
export const SPEED_LABELS = ['Paused', '1×', '2×', '3×'];
// The Help setting (early-game pass 3.1), keyed by settings.help.
export const HELP_NAMES = { full: 'Guide and tips', tips: 'Tips only', off: 'Off' };
```
(If Task 10 changed the `SPEED_LABELS` line, add the two new lines after it as it now reads.)

Before (inside `T`):
```js
  sound: 'Sound', vibration: 'Vibration', textSize: 'Text size', leftHanded: 'Left-handed controls', keyboardShortcuts: 'Keyboard shortcuts', reducedMotion: 'Reduce motion', followSystem: 'Follow the system',
```
After:
```js
  sound: 'Sound', vibration: 'Vibration', textSize: 'Text size', leftHanded: 'Left-handed controls', keyboardShortcuts: 'Keyboard shortcuts', reducedMotion: 'Reduce motion', followSystem: 'Follow the system',
  helpLevel: 'Help', suggested: 'Suggested', resumeGuide: 'Resume guide',
  guideHelp: 'While the guide runs, the card for the next step says Suggested and a ring marks the place. Skip guide in the goals strip turns it off.',
```

`src/ui/settings.js`:

Before:
```js
// Settings (spec 6.3): sound, vibration, text size, left-handed controls, keyboard shortcuts, reduced motion.
// Stored in localStorage when available; applied to the document as data attributes and a class.
import { prefersReducedMotion } from '../render/effects.js';

export const DEFAULT_SETTINGS = { sound: false, vibration: true, textSize: 100, leftHanded: false, keyboardShortcuts: true, reducedMotion: 'system' };

const isBool = (v) => typeof v === 'boolean';
const VALID = {
  sound: isBool, vibration: isBool, leftHanded: isBool, keyboardShortcuts: isBool,
  textSize: (v) => [100, 125, 150].includes(v),
  reducedMotion: (v) => ['system', 'on', 'off'].includes(v),
};
```
After:
```js
// Settings (spec 6.3): sound, vibration, text size, left-handed controls, keyboard shortcuts, reduced motion,
// and (early-game pass 3.1, 3.4) Help ('full' guide and tips, 'tips' only, 'off') and the tips seen on this device.
// Stored in localStorage when available; applied to the document as data attributes and a class.
import { prefersReducedMotion } from '../render/effects.js';

export const HELP_LEVELS = ['full', 'tips', 'off'];
export const DEFAULT_SETTINGS = { sound: false, vibration: true, textSize: 100, leftHanded: false, keyboardShortcuts: true, reducedMotion: 'system', help: 'full', seenTips: [] };

const isBool = (v) => typeof v === 'boolean';
const VALID = {
  sound: isBool, vibration: isBool, leftHanded: isBool, keyboardShortcuts: isBool,
  textSize: (v) => [100, 125, 150].includes(v),
  reducedMotion: (v) => ['system', 'on', 'off'].includes(v),
  help: (v) => HELP_LEVELS.includes(v),
  seenTips: (v) => Array.isArray(v) && v.every((s) => typeof s === 'string'),
};
// Lists are copied on the way in and out of storage, so no caller can change the defaults or the stored copy.
const copy = (v) => (Array.isArray(v) ? v.slice() : v);
```

Before:
```js
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (obj && VALID[k](obj[k])) out[k] = obj[k];
```
After:
```js
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (obj && VALID[k](obj[k])) out[k] = copy(obj[k]);
```

Before:
```js
  let value = { ...DEFAULT_SETTINGS, ...load() };
```
After:
```js
  let value = { ...DEFAULT_SETTINGS, seenTips: DEFAULT_SETTINGS.seenTips.slice(), ...load() };
```

Before:
```js
      for (const [k, v] of Object.entries(patch)) if (k in VALID && VALID[k](v)) next[k] = v;
```
After:
```js
      for (const [k, v] of Object.entries(patch)) if (k in VALID && VALID[k](v)) next[k] = copy(v);
```

`src/ui/menu.js`:

Before:
```js
import { HELP_ROWS, T } from './text.js';
```
After:
```js
import { HELP_ROWS, HELP_NAMES, T } from './text.js';
```

Before:
```js
export function createMenuSheets({ store, settings, toasts, hooks = {}, onNewCity = () => {}, version = APP_VERSION }) {
```
After:
```js
// canResumeGuide / onResumeGuide come from createUI: How to play offers "Resume guide" while the guide is off
// and one of its steps is open (early-game pass 3.2).
export function createMenuSheets({ store, settings, toasts, hooks = {}, onNewCity = () => {}, version = APP_VERSION, canResumeGuide = () => false, onResumeGuide = () => {} }) {
```

Before:
```js
      choiceRow(T.reducedMotion, 'reducedMotion', [['system', T.followSystem], ['on', T.on], ['off', T.off]]),
    );
  }

  function help(body) {
```
After:
```js
      choiceRow(T.reducedMotion, 'reducedMotion', [['system', T.followSystem], ['on', T.on], ['off', T.off]]),
      choiceRow(T.helpLevel, 'help', [['full', HELP_NAMES.full], ['tips', HELP_NAMES.tips], ['off', HELP_NAMES.off]]),
    );
  }

  function help(body, { close } = {}) {
```

Before:
```js
    body.append(el('h3', { text: T.goals }), el('p', { class: 'muted', text: T.goalsHelp }));
  }
```
After:
```js
    body.append(el('h3', { text: T.goals }), el('p', { class: 'muted', text: T.goalsHelp }), el('p', { class: 'muted', text: T.guideHelp }));
    if (canResumeGuide()) {
      body.append(el('div', { class: 'actions' }, [button(T.resumeGuide, { class: 'resume-guide primary', onClick: () => { onResumeGuide(); if (close) close(); } })]));
    }
  }
```

`src/boot.js`:

Before:
```js
import { setSpeed } from './sim/commands.js';
```
After:
```js
import { setSpeed, setGuide } from './sim/commands.js';
```

Before:
```js
  function freshWorld() {
    const world = createWorld({ seed: seedOf() });
    if (stress) buildStressCity(world); else if (sample) buildSampleCity(world);
    if (params.has('speed')) setSpeed(world, Number(params.get('speed')));
    return world;
  }
```
After:
```js
  // A new city starts with the guide on only under Help: Guide and tips (early-game pass 3.1). The sample and
  // stress cities of the development flags never guide.
  function freshWorld() {
    const world = createWorld({ seed: seedOf() });
    if (stress) buildStressCity(world); else if (sample) buildSampleCity(world);
    if (params.has('speed')) setSpeed(world, Number(params.get('speed')));
    setGuide(world, settings.get().help === 'full' && !stress && !sample);
    return world;
  }
```

`src/ui/guide.js` (new):
```js
// The guided start (early-game pass 3.2). While the city's guide runs, the card its current step needs carries
// a "Suggested" tag and a teal ring, every other card and category is dimmed but stays usable, the suggested
// category carries a dot, and the map rings the step's target: two pulses when the step changes, then still.
// This module only reads the world and sets classes; createUI turns the guide on and off through setGuide.
import { GUIDE_GOALS } from '../data/goals.js';
import { categoryOfItem, GUIDE_PULSES, GUIDE_PULSE_MS } from '../data/ui.js';
import { guideActive, guideGoal, nextItemFor } from '../sim/goals.js';
import { showMeTarget } from './goalsList.js';
import { el } from './components.js';
import { T } from './text.js';

const OFF = { active: false, goal: null, item: null, category: null };

// What the guide points at now: its step, the item that step needs next and that item's category.
export function guideState(world) {
  const goal = guideActive(world) ? guideGoal(world) : null;
  if (!goal) return OFF;
  const item = nextItemFor(world, goal) || (goal.showMe ? goal.showMe.item : null);
  return { active: true, goal, item, category: item ? categoryOfItem(item) : null };
}

// How to play offers "Resume guide" while the guide is off and one of its steps is still open.
export function canResumeGuide(world) {
  const done = new Set(world.goals.completed);
  return !world.guide.on && !world.guide.done && GUIDE_GOALS.some((id) => !done.has(id));
}

export function createGuide({ world, store, root, reducedMotion = () => false }) {
  let current = OFF;
  let ringId = null, ringSince = 0;

  // Cards are rebuilt whenever their tray, grid or drawer re-renders, so the classes go back on after every
  // store change (this subscription runs after the dock's, panel's and rail's) and every refreshChrome.
  function apply() {
    const { active, item, category } = current;
    root.classList.toggle('guide-on', active);
    for (const card of root.querySelectorAll('.card[data-item]')) {
      const suggested = active && card.dataset.item === item;
      card.classList.toggle('suggested', suggested);
      card.classList.toggle('dimmed', active && !suggested);
      const tag = card.querySelector('.tag');
      if (suggested && !tag) card.append(el('span', { class: 'tag', text: T.suggested }));
      if (!suggested && tag) tag.remove();
    }
    for (const b of root.querySelectorAll('.cat[data-category], .tab[data-category]')) {
      const suggested = active && b.dataset.category === category;
      b.classList.toggle('suggested', suggested);
      b.classList.toggle('dimmed', active && !suggested);
    }
  }
  function render() { current = guideState(world); apply(); return current; }

  render();
  const unsubscribe = store.subscribe(apply);
  return {
    state: () => current,
    render,
    // The map ring for one frame: { x, y, pulsing } at the step's Show me target, or null without a guide.
    marker(now) {
      if (!current.active) { ringId = null; return null; }
      if (current.goal.id !== ringId) { ringId = current.goal.id; ringSince = now; }
      const at = showMeTarget(world, current.goal);
      return { x: at.x, y: at.y, pulsing: !reducedMotion() && now - ringSince < GUIDE_PULSES * GUIDE_PULSE_MS };
    },
    destroy() { unsubscribe(); current = OFF; apply(); },
  };
}
```

`src/render/overlays.js`: in the imports, make the palette line read `import { UI, INK, TEAL_DARK } from './art/palette.js';` (keep anything Task 10 added) and add `import { GUIDE_PULSE_MS } from '../data/ui.js';`. Append at the end of the file:
```js
// The guided start's ring on the ground at a step's target (early-game pass 3.2): teal on a white halo.
// Pulsing, it grows and fades once per GUIDE_PULSE_MS; at rest it is drawn still (always so under reduced
// motion, which the caller decides).
export function drawGuideMarker(g, x, y, pulsing = false, now = 0) {
  const k = pulsing ? (now % GUIDE_PULSE_MS) / GUIDE_PULSE_MS : 0;
  const r = 0.8 + k * 0.6;
  const fade = 1 - k * 0.7;
  const pts = quad(x - r, y - r, 2 * r, 2 * r, 0);
  g.poly(pts, TEAL_DARK, { alpha: 0.12 * fade });
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 3.4, strokeAlpha: 0.85 * fade });
  g.poly(pts, 'none', { stroke: TEAL_DARK, strokeWidth: 2, strokeAlpha: fade });
}
```

`src/ui/dock.js`, `src/ui/sidePanel.js`, `src/ui/rail.js`: give each category button its category id. If Task 9 already sets `data-category` on these buttons, skip this part. Otherwise add `dataset: { category: c.id }` to the props of the category button (merge it into Task 9's `dataset` if it has one). In today's code:

`src/ui/dock.js`, before:
```js
    const b = el('button', { type: 'button', class: 'cat', 'aria-pressed': 'false' }, [icon(CATEGORY_ICONS[c.id]), el('span', { text: CATEGORY_NAMES[c.id] })]);
```
After:
```js
    const b = el('button', { type: 'button', class: 'cat', 'aria-pressed': 'false', dataset: { category: c.id } }, [icon(CATEGORY_ICONS[c.id]), el('span', { text: CATEGORY_NAMES[c.id] })]);
```

`src/ui/sidePanel.js`, before:
```js
  const tabButtons = CATEGORIES.map((c) => button(CATEGORY_NAMES[c.id], { class: 'tab', 'aria-pressed': 'false', onClick: () => store.set({ category: c.id }) }));
```
After:
```js
  const tabButtons = CATEGORIES.map((c) => button(CATEGORY_NAMES[c.id], { class: 'tab', 'aria-pressed': 'false', dataset: { category: c.id }, onClick: () => store.set({ category: c.id }) }));
```

`src/ui/rail.js`, before:
```js
    class: 'cat', 'aria-pressed': 'false',
```
After:
```js
    class: 'cat', 'aria-pressed': 'false', dataset: { category: c.id },
```
(Task 9 changes `CATEGORIES.map` to the visible categories in these files; keep that and only add the `dataset` entry.)

`src/ui/createUI.js`:

Imports: add `drawGuideMarker` to the `'../render/overlays.js'` import, and add:
```js
import { createGuide, canResumeGuide } from './guide.js';
```

After the line that creates the rail (`const rail = createRail({ ... });`), add:
```js
  const guide = createGuide({ world, store, root, reducedMotion: settings.reducedMotion });   // after the dock, panel and rail, so its store subscription runs after theirs
```

Before:
```js
  const menus = createMenuSheets({ store, settings, toasts, hooks, onNewCity: typeof hooks.newCity === 'function' ? hooks.newCity : () => {} });
```
After:
```js
  const menus = createMenuSheets({
    store, settings, toasts, hooks, onNewCity: typeof hooks.newCity === 'function' ? hooks.newCity : () => {},
    canResumeGuide: () => canResumeGuide(world), onResumeGuide: () => { setGuide(world, true); refresh(); },
  });
  // Choosing Tips only or Off turns a running guide off at once (spec 3.1: all of it can be switched off).
  // Choosing Guide and tips again does not restart it; Resume guide in How to play does.
  let lastHelp = settings.get().help;
  const stopHelpWatch = settings.subscribe((v) => {
    if (v.help === lastHelp) return;
    lastHelp = v.help;
    if (v.help !== 'full' && world.guide.on) { setGuide(world, false); refresh(); }
  });
```

In `refreshChrome`, insert `guide.render();` immediately after `rail.render();` (the line reads `hud.render(); dock.render(); sidePanel.render(); rail.render(); guide.render(); confirmBar.render(); ...` afterwards; keep anything other tasks added).

In `render`, after the line `const selected = s.selectedId !== null ? world.buildings[s.selectedId] : null;` add:
```js
    const ring = guide.marker(t);                                              // the guide's ring on its step's target (spec 3.2)
```
and inside `drawOverlay`, immediately before `for (const ghost of ghosts()) drawGhost(g, ghost);`, add:
```js
        if (ring) drawGuideMarker(g, ring.x, ring.y, ring.pulsing, t);         // under the ghost, so the ghost stays readable
```

In `destroy`, right after `destroyed = true;` add:
```js
      guide.destroy(); stopHelpWatch();
```

In the object `createUI` returns, add `guide,` after `effects,`.

`css/ui.css`: append at the end of the file:
```css
/* The guided start (early-game pass 3.2): the suggested card has a teal ring and a tag; the other cards keep
   their words at full strength (4.5:1) and only their picture fades; the suggested category carries a dot. */
.card, #dock .cat, #rail .cat, #panel .tab { position: relative; }
.card.suggested { border-color: var(--teal); box-shadow: inset 0 0 0 2px var(--teal); }
.card .tag { position: absolute; top: 4px; right: 4px; background: var(--teal); color: var(--teal-ink); border-radius: 8px; padding: 0 6px; font-size: calc(12px * var(--ui-scale)); line-height: 1.6; font-weight: 600; pointer-events: none; }
.card.dimmed { border-color: transparent; }
.card.dimmed .thumb { opacity: 0.6; filter: saturate(0.5); }
.cat.dimmed .icon { opacity: 0.6; }
.cat.suggested::after, .tab.suggested::after { content: ""; position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 0 2px var(--parchment); }
```

- [ ] **Step 4: Run the tests to see them pass**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui guide"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui menu"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui settings"
```
Expected: each ends `ALL PASSED` (10, 4 and 3 tests).

- [ ] **Step 5: Update the existing tests this breaks**

Searched `tests/` for settings keys and defaults (`DEFAULT_SETTINGS`, `toEqual(DEFAULT`), the help sheet (`menus.help`, `goalsHelp`, `'help'`), the menu's signature (`createMenuSheets`), the new-city flow (`newCity`, `skipTitle`, `freshWorld`, `world.gold`), card classes (`className`, `classList.contains('card`), `.guide` (the install guide's class), and category buttons (`.cat`, `.tab`). Nothing breaks:
- `tests/ui/settings.test.js` and the menu test's settings case compare with `DEFAULT_SETTINGS` itself, which now carries `help` and `seenTips`; the stub storage loads nothing, and the malformed-storage case still falls back to defaults.
- `tests/ui/menu.test.js` "help lists every shortcut ...": `help` still lists every shortcut and `T.goalsHelp`; without the new options there is no Resume guide button.
- `tests/ui/boot.test.js`: a new city's gold, sheet and banner are unchanged by `setGuide`; the install guide's `.guide` class is not used by the guided start (it uses `guide-on`, `.suggested`, `.dimmed`, `.tag`); `destroy` removes `guide-on`.
- `tests/ui/a11y.test.js`: the Help choices and Resume guide are labelled buttons; the tag is a span inside an already-named card.
- `tests/ui/createUI.test.js` and the panel/dock tests count `.card` elements; the tag is not a card.

- [ ] **Step 6: Full suite**

```powershell
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```
Expected: the last line is `ALL PASSED` (`sw-files.ps1` also adds `src/ui/guide.js` to the cache list).

- [ ] **Step 7: Commit**

```powershell
git add src/ui/guide.js src/ui/settings.js src/ui/menu.js src/boot.js src/ui/createUI.js src/ui/dock.js src/ui/sidePanel.js src/ui/rail.js src/render/overlays.js src/data/ui.js src/ui/text.js css/ui.css sw-files.js tests/ui/guide.test.js tests/helpers/uiWorld.js tests/all.js
git commit -m "Guide a new city through its first steps, with a Help setting to switch it off`n`nWhile the guide runs, the card for the next step is marked Suggested, the others dim their pictures but stay usable and readable, its category gets a dot and a teal ring marks the place on the map. Help in settings chooses Guide and tips, Tips only or Off; a new city follows it, Skip guide stops it in one tap and Resume guide in How to play brings it back.`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 14: Celebrations

**Files:**
- Create: `src/ui/celebrate.js`, `tests/ui/celebrate.test.js`
- Modify: `index.html` (`#cheer` row), `src/data/ui.js` (`CHEER_MS`, `CHEER_GAP_MS`), `src/render/effects.js` (`sparkle`, `EFFECT_MS.sparkle`), `src/ui/text.js` (`FIRST_TEXT`, `ACHIEVEMENT_NAMES`, `achievementCondition`, `ACHIEVEMENT_TEXT`, `cheerReward`, three `T` keys), `src/ui/createUI.js` (celebrations replace the goal and milestone toasts), `css/ui.css`, `sw-files.js` (regenerated), `tests/all.js`
- Test: `tests/ui/celebrate.test.js`; update `tests/ui/goalsList.test.js`

**Interfaces:**
- Consumes: sim events `goal { id, reward }`, `first { id, reward, x, y }`, `achievement { id }`, `daily { id, reward }`, `guide_done { reward }`, `milestone { id }` (Tasks 2-4, and the existing clock); `FIRSTS` (`src/data/firsts.js`), `ACHIEVEMENTS` (`src/data/achievements.js`), `DAILY_POOL` (`src/data/daily.js`, tests only), `goalById`, `guideActive` (`src/sim/goals.js`), `setGuide` (`src/sim/commands.js`, tests only), `DAILY_TEXT` (`src/ui/text.js`, Task 12), Task 12's `afterCommand` → `onEvents(events)` path.
- Produces: `createCelebrations({ container, setTimer, clearTimer })` → `{ show({ tier: 'first' | 'milestone', text, reward = 0, onShow = null }), clear(), pending() }`; `CHEER_MS = { first: 2500, milestone: 4000 }`, `CHEER_GAP_MS = 3000`; `effects.sparkle(x, y, color, now)` with `EFFECT_MS.sparkle = 1200`; `#cheer` as the last row of `#under-bar` (after `#goals`, so a caption never moves the goals strip under a finger; Task 15 puts `#tip` between them); `FIRST_TEXT`, `ACHIEVEMENT_NAMES`, `ACHIEVEMENT_TEXT`, `achievementCondition(measure)`, `cheerReward(n)` in `src/ui/text.js` (Task 16 reads `ACHIEVEMENT_NAMES` and `ACHIEVEMENT_TEXT`); `createUI(...).celebrations`.

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/celebrate.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { createCelebrations } from '../../src/ui/celebrate.js';
import { createEffects, EFFECT_MS } from '../../src/render/effects.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { GOLD } from '../../src/render/art/palette.js';
import { CHEER_MS, CHEER_GAP_MS } from '../../src/data/ui.js';
import { FIRSTS } from '../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { DAILY_POOL } from '../../src/data/daily.js';
import { GOALS } from '../../src/data/goals.js';
import { setGuide } from '../../src/sim/commands.js';
import { guideActive } from '../../src/sim/goals.js';
import { FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, milestoneText, cheerReward, T } from '../../src/ui/text.js';
import { mount } from '../helpers/dom.js';
import { makeCanvas, pixelAt } from '../helpers/canvas.js';
import { rigUI } from '../helpers/uiWorld.js';

// setTimeout on a clock the test moves: due timers fire in time order (then in the order they were set).
function fakeClock() {
  let t = 0, seq = 0;
  const timers = new Map();
  return {
    setTimer(fn, ms) { seq += 1; timers.set(seq, { fn, at: t + ms, id: seq }); return seq; },
    clearTimer(id) { timers.delete(id); },
    advance(ms) {
      const end = t + ms;
      for (;;) {
        let due = null;
        for (const x of timers.values()) if (x.at <= end && (!due || x.at < due.at || (x.at === due.at && x.id < due.id))) due = x;
        if (!due) break;
        timers.delete(due.id);
        t = due.at;
        due.fn();
      }
      t = end;
    },
  };
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};
function scene() {
  const c = makeCanvas(200, 200);
  const ctx = c.getContext('2d');
  ctx.translate(100, 100);
  return { c, g: makeDraw(ctx, 2) };
}

describe('ui celebrate', () => {
  it('shows one caption at a time, 3 s apart, each hidden after its time', () => {
    const { root, cleanup } = mount();
    try {
      const clock = fakeClock();
      const cheers = createCelebrations({ container: root, setTimer: clock.setTimer, clearTimer: clock.clearTimer });
      const texts = () => [...root.querySelectorAll('.cheer .text')].map((n) => n.textContent);
      cheers.show({ tier: 'first', text: 'One', reward: 10 });
      cheers.show({ tier: 'first', text: 'Two' });
      cheers.show({ tier: 'first', text: 'Three' });
      expect(texts()).toEqual(['One']);
      expect(cheers.pending()).toBe(2);
      clock.advance(CHEER_MS.first - 1);
      expect(texts()).toEqual(['One']);
      clock.advance(1);
      expect(texts()).toEqual([]);                                   // hidden at 2.5 s
      clock.advance(CHEER_GAP_MS - CHEER_MS.first - 1);
      expect(texts()).toEqual([]);                                   // and nothing until the gap is up
      clock.advance(1);
      expect(texts()).toEqual(['Two']);                              // 3 s after the first one started
      expect(cheers.pending()).toBe(1);
      clock.advance(CHEER_GAP_MS);
      expect(texts()).toEqual(['Three']);
      clock.advance(CHEER_GAP_MS);
      expect(texts()).toEqual([]);
      expect(cheers.pending()).toBe(0);
      cheers.show({ tier: 'first', text: 'Later' });                 // the gap has long passed: at once
      expect(texts()).toEqual(['Later']);
      cheers.show({ tier: 'first', text: 'Dropped' });
      cheers.clear();
      expect(root.children.length).toBe(0);
      expect(cheers.pending()).toBe(0);
      clock.advance(60000);
      expect(root.children.length).toBe(0);                          // clear cancelled the timers and the queue
    } finally { cleanup(); }
  });
  it('writes the star, the words and the gold, holds a milestone for 4 s, and runs onShow when a caption appears', () => {
    const { root, cleanup } = mount();
    try {
      const clock = fakeClock();
      const cheers = createCelebrations({ container: root, setTimer: clock.setTimer, clearTimer: clock.clearTimer });
      cheers.show({ tier: 'first', text: FIRST_TEXT.first_harvest, reward: 10 });
      const node = root.querySelector('.cheer');
      expect(node.classList.contains('first')).toBe(true);
      expect(node.querySelector('.icon').textContent).toBe('★');
      expect(node.querySelector('.icon').getAttribute('aria-hidden')).toBe('true');
      expect(node.querySelector('.text').textContent).toBe(FIRST_TEXT.first_harvest);
      expect(node.querySelector('.reward').textContent).toBe('+10 gold');
      expect(cheerReward(25)).toBe('+25 gold');
      const ran = [];
      cheers.show({ tier: 'milestone', text: milestoneText('Town'), onShow: () => ran.push('town') });
      expect(ran).toEqual([]);                                       // still waiting its turn
      clock.advance(CHEER_GAP_MS);
      expect(ran).toEqual(['town']);
      const town = root.querySelector('.cheer');
      expect(town.classList.contains('milestone')).toBe(true);
      expect(town.querySelector('.reward')).toBe(null);
      cheers.show({ tier: 'first', text: 'Next' });
      clock.advance(CHEER_MS.milestone - 1);
      expect(root.querySelector('.cheer .text').textContent).toBe(milestoneText('Town'));
      clock.advance(1);
      expect(root.querySelector('.cheer .text').textContent).toBe('Next');   // straight after the milestone hides
      expect(root.querySelectorAll('.cheer').length).toBe(1);
    } finally { cleanup(); }
  });
  it('says what happened for every first, names every achievement with its exact condition, and never says XP', () => {
    for (const f of FIRSTS) expect(FIRST_TEXT[f.id].length).toBeGreaterThan(20);
    expect(Object.keys(ACHIEVEMENT_NAMES).length).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_NAMES[a.id].length).toBeGreaterThan(2);
      expect(ACHIEVEMENT_TEXT[a.id].length).toBeGreaterThan(8);
    }
    expect(FIRST_TEXT.first_shack).toContain('Shack');
    expect(ACHIEVEMENT_TEXT.way_in).toBe('Lay 10 road tiles beyond the starting road');
    expect(ACHIEVEMENT_TEXT.street).toBe('Have 25 homes');
    expect(ACHIEVEMENT_TEXT.water_bearer).toBe('Have 5 wells');
    expect(ACHIEVEMENT_TEXT.breadbasket).toBe('Have 3 grain farms');
    expect(ACHIEVEMENT_TEXT.plenty).toBe('Have 2 granaries');
    expect(ACHIEVEMENT_TEXT.cottage_lane).toBe('Have 20 homes at Cottage or better');
    expect(ACHIEVEMENT_TEXT.bustling).toBe('Reach 300 people');
    expect(ACHIEVEMENT_TEXT.granary_of_the_river).toBe('Harvest 2000 food');
    expect(ACHIEVEMENT_TEXT.prosperous).toBe('End 24 months in profit');
    expect(ACHIEVEMENT_TEXT.no_one_hungry).toBe('Reach 100 people with every Cottage or better home fed');
    expect(ACHIEVEMENT_TEXT.water_for_all).toBe('Have 30 lived-in homes, all with water');
    expect(ACHIEVEMENT_TEXT.busy_hands).toBe('Reach 150 people with 5% or fewer out of work');
    expect(ACHIEVEMENT_TEXT.on_course).toBe('Finish 9 goals');
    expect(ACHIEVEMENT_TEXT.day_by_day).toBe('Finish 10 daily goals');
    const all = [...Object.values(FIRST_TEXT), ...Object.values(ACHIEVEMENT_NAMES), ...Object.values(ACHIEVEMENT_TEXT), T.guideDone, T.dailyDone, T.achievement].join(' ');
    expect(/\bXP\b/i.test(all)).toBe(false);
  });
  it('celebrates goals, firsts, achievements, daily goals, the guide and milestones in the caption row, not as toasts', async () => {
    const played = [], buzzed = [];
    const sfx = { play: (n) => { played.push(n); return true; }, buzz: (ms) => { buzzed.push(ms); return true; }, unlock: () => false };
    const r = await rigUI({ sfx });
    try {
      const cheer = r.root.querySelector('#cheer');
      expect(cheer.previousElementSibling.id).toBe('goals');                 // the last row of #under-bar, so nothing above it moves
      expect(cheer.getAttribute('role')).toBe('status');
      expect(cheer.getAttribute('aria-live')).toBe('polite');
      r.ui.celebrations.clear();                                             // anything construction queued
      played.length = 0; buzzed.length = 0;
      r.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }, { type: 'first', id: 'first_family', reward: 10, x: 12.5, y: 9.5 }]);
      expect(cheer.querySelector('.cheer .text').textContent).toBe(`${T.goalDone}: ${GOALS[0].text}`);   // the goal first, then the first
      expect(cheer.querySelector('.cheer .reward').textContent).toBe('+25 gold');
      expect(r.ui.celebrations.pending()).toBe(1);
      expect(played).toEqual(['goal']);                                       // sound and buzz come with the caption
      expect(buzzed).toEqual([20]);
      expect(r.root.querySelector('#toasts').textContent.includes(GOALS[0].text)).toBe(false);
      r.ui.celebrations.clear();
      r.ui.onEvents([{ type: 'first', id: 'first_family', reward: 10, x: 12.5, y: 9.5 }]);
      expect(cheer.textContent).toContain(FIRST_TEXT.first_family);
      expect(cheer.textContent).toContain('+10 gold');
      expect(r.ui.effects.active(0).some((e) => e.kind === 'sparkle')).toBe(true);   // a burst, or a still ring under reduced motion
      r.ui.celebrations.clear();
      r.ui.onEvents([{ type: 'milestone', id: 'town' }]);
      expect(cheer.querySelector('.cheer').classList.contains('milestone')).toBe(true);
      expect(cheer.textContent).toContain(milestoneText('Town'));
      expect(played[played.length - 1]).toBe('milestone');
      expect(r.root.querySelector('#toasts').textContent.includes(milestoneText('Town'))).toBe(false);
      r.ui.celebrations.clear();
      setGuide(r.world, true);
      expect(guideActive(r.world)).toBe(true);                               // the plots goal is open in the test city
      r.ui.onEvents([{ type: 'achievement', id: 'way_in' }]);
      expect(cheer.children.length).toBe(0);                                // achievements stay quiet while the guide runs
      setGuide(r.world, false);
      r.ui.onEvents([{ type: 'achievement', id: 'way_in' }]);
      expect(cheer.textContent).toContain(`${T.achievement}: ${ACHIEVEMENT_NAMES.way_in}`);
      r.ui.celebrations.clear();
      const daily = DAILY_POOL[0].id;
      r.ui.onEvents([{ type: 'daily', id: daily, reward: 25 }]);
      expect(cheer.textContent).toContain(`${T.dailyDone}: ${DAILY_TEXT[daily]}`);
      r.ui.celebrations.clear();
      r.ui.onEvents([{ type: 'guide_done', reward: 50 }]);
      expect(cheer.textContent).toContain(T.guideDone);
      expect(cheer.textContent).toContain('+50 gold');
      r.ui.destroy();
      expect(cheer.children.length).toBe(0);
    } finally { r.cleanup(); }
  });
  it('bursts a sparkle of diamonds, or a still ring under reduced motion, gone after 1.2 s', () => {
    expect(EFFECT_MS.sparkle).toBe(1200);
    const fx = createEffects({ reducedMotion: false });
    fx.sparkle(0, 0, GOLD, 0);
    expect(fx.active(0)[0].kind).toBe('sparkle');
    expect(fx.active(0)[0].still).toBe(false);
    const a = scene();
    fx.draw(a.g, 300);
    expect(inked(a.c)).toBeGreaterThan(8);
    expect(fx.count(EFFECT_MS.sparkle - 1)).toBe(1);
    expect(fx.count(EFFECT_MS.sparkle + 1)).toBe(0);
    const still = createEffects({ reducedMotion: true });
    still.sparkle(0, 0, GOLD, 0);
    expect(still.count(0)).toBe(1);                                          // unlike a puff, it stays, as a still ring
    expect(still.active(0)[0].still).toBe(true);
    const b = scene();
    still.draw(b.g, 300);
    expect(inked(b.c)).toBeGreaterThan(0);
  });
});
```

Append this line to the end of `tests/all.js`:

```js
import './ui/celebrate.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui celebrate"`
Expected: `LOAD ERROR`, with the import of `/src/ui/celebrate.js` failing (the module does not exist yet), so no test runs.

- [ ] **Step 3: Implement**

**3a. `src/data/ui.js`**: append at the end of the file:

```js
// Celebration captions (spec 3.6): how long each tier's caption shows, and the least time between two
// captions starting. A milestone shows longer than the gap, so the next caption waits until it hides.
export const CHEER_MS = { first: 2500, milestone: 4000 };
export const CHEER_GAP_MS = 3000;
```

**3b. Create `src/ui/celebrate.js`:**

```js
// Celebrations (spec 3.6): captions in #cheer, the last row under the top bar (below the goals strip), for firsts, goals,
// achievements, daily goals, the end of the guide and milestones. One caption at a time: each shows for
// CHEER_MS[tier], and the next starts CHEER_GAP_MS after the previous one started (or when it hides, if it
// shows longer). Nothing to tap and nothing takes focus: #cheer is a polite live region, so each caption is
// read once as it appears. An item's onShow runs when its caption appears, so sound and sparkle land with it.
import { CHEER_MS, CHEER_GAP_MS } from '../data/ui.js';
import { el, clear } from './components.js';
import { cheerReward } from './text.js';

export function createCelebrations({ container, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id) }) {
  const queue = [];
  let node = null;          // the caption on screen
  let hideTimer = null;     // hides it after its tier's time
  let slotTimer = null;     // frees the row for the next caption; null while the row is free

  function hide() {
    hideTimer = null;
    if (node) { node.remove(); node = null; }
  }

  function next() {
    slotTimer = null;
    const item = queue.shift();
    if (!item) return;
    if (hideTimer !== null) { clearTimer(hideTimer); hide(); }
    const ms = CHEER_MS[item.tier] || CHEER_MS.first;
    node = el('div', { class: `cheer ${item.tier}` }, [
      el('span', { class: 'icon', 'aria-hidden': 'true', text: '★' }),
      el('span', { class: 'text', text: item.text }),
      item.reward > 0 ? el('span', { class: 'reward', text: cheerReward(item.reward) }) : null,
    ]);
    container.append(node);
    hideTimer = setTimer(hide, ms);
    slotTimer = setTimer(next, Math.max(CHEER_GAP_MS, ms));
    if (typeof item.onShow === 'function') item.onShow();
  }

  return {
    show({ tier = 'first', text, reward = 0, onShow = null }) {
      queue.push({ tier, text, reward, onShow });
      if (slotTimer === null) next();
    },
    clear() {
      queue.length = 0;
      if (hideTimer !== null) clearTimer(hideTimer);
      if (slotTimer !== null) clearTimer(slotTimer);
      hideTimer = null;
      slotTimer = null;
      node = null;
      clear(container);
    },
    pending: () => queue.length,
  };
}
```

**3c. `src/render/effects.js`**: three edits.

Replace the header comment's first two lines:

```js
// Feedback effects (spec 5.4): a dust puff on placing, a glow and "+Shack" on upgrade, a coral pulse and
// "−Cottage" on downgrade, and a hook for the milestone banner (the banner itself is 1c's DOM). Under
// prefers-reduced-motion there are no puffs, glows or pulses, and labels stay still.
```

with:

```js
// Feedback effects (spec 5.4): a dust puff on placing, a glow and "+Shack" on upgrade, a coral pulse and
// "−Cottage" on downgrade, and a sparkle on a building for a first (early-game pass 3.6). Under
// prefers-reduced-motion there are no puffs, glows or pulses, labels stay still and a sparkle is a still ring.
// The onMilestone hook stays for callers that want it; the interface celebrates milestones itself (celebrate.js).
```

In `EFFECT_MS`, add `sparkle: 1200` (keep every key earlier tasks added, such as Task 7's `rise: 900`). On main the line reads `export const EFFECT_MS = { puff: 600, glow: 1200, pulse: 1200, label: 1400 };`. After Task 7 and this task it reads:

```js
export const EFFECT_MS = { puff: 600, glow: 1200, pulse: 1200, label: 1400, rise: 900, sparkle: 1200 };
```

In the `fx` object, directly after the `label(x, y, text, color, now) { ... },` method, add:

```js
    // A first (spec 3.6): a burst of small diamonds, or a still ring that fades under reduced motion.
    sparkle(x, y, color, now) { add({ kind: 'sparkle', x, y, color, still: reduced(), start: now }); },
```

In `draw(g, now)`, insert this branch immediately before `} else if (e.kind === 'label') {`:

```js
        } else if (e.kind === 'sparkle') {
          const q = U(c, 14);                                    // about a storey above the building's centre
          if (e.still) g.circ(q, 10, 'none', { stroke: e.color, strokeWidth: 1.5, strokeAlpha: 1 - t });
          else {
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2;
              const r = 4 + t * 14;
              const s = 2.4 * (1 - t * 0.5);
              const d = [q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r * 0.6 - t * 4];
              g.poly([[d[0], d[1] - s], [d[0] + s * 0.6, d[1]], [d[0], d[1] + s], [d[0] - s * 0.6, d[1]]], e.color, { alpha: 1 - t });
            }
          }
```

**3d. `src/ui/text.js`**: two edits.

Add this import below `import { TIERS } from '../data/housing.js';`:

```js
import { ACHIEVEMENTS } from '../data/achievements.js';
```

Add these keys inside the `T` object, after its last key. On main that is `hoverHint: 'Hover a building or pick a card',`; earlier tasks may have appended keys after it. If Task 13 already added `guideDone`, keep that key and leave this one out.

```js
  achievement: 'Achievement', dailyDone: 'Daily goal done', guideDone: "You've got the basics",
```

Append at the very end of the file:

```js
// Celebrations (spec 3.6): what each first says (what happened and why it matters), achievement names and
// their exact conditions, and the gold suffix on a caption. Numbers come from the data, so the words never drift.
const TOWN = MILESTONES.find((m) => m.id === 'town');
export const FIRST_TEXT = {
  first_family: 'The first family has moved in. People work your buildings and pay taxes.',
  first_full_home: 'A home is full. Meet its needs and it grows to hold more people.',
  first_harvest: 'First harvest: grain reached the granary. Bazaars can now sell food.',
  first_shack: `First ${TIERS[2].name}: water let a hut grow. ${TIERS[2].name}s hold ${TIERS[2].capacity} people.`,
  first_cottage: `First ${TIERS[3].name}: food let a home grow. ${TIERS[3].name}s hold ${TIERS[3].capacity} people and pay more tax.`,
  first_house: `First ${TIERS[4].name}: a temple let a home grow. ${TIERS[4].name}s hold ${TIERS[4].capacity} people.`,
  first_profit: 'First month in profit: taxes covered wages and upkeep with gold to spare.',
  people_100: `100 people live here now. At ${TOWN.population} people the city becomes a ${TOWN.name}.`,
};

export const ACHIEVEMENT_NAMES = {
  way_in: 'Way in', neighbours: 'Neighbours', street: 'A proper street', busy_streets: 'Busy streets',
  water_bearer: 'Water bearer', breadbasket: 'Breadbasket', plenty: 'Plenty', market_day: 'Market day', faithful: 'Faithful',
  shack_row: 'Shack row', cottage_lane: 'Cottage lane', house_proud: 'House proud',
  hamlet: 'Hamlet', town: 'Town at last', bustling: 'Bustling',
  good_harvests: 'Good harvests', granary_of_the_river: 'Granary of the river',
  steady_books: 'Steady books', prosperous: 'Prosperous',
  no_one_hungry: 'No one hungry', water_for_all: 'Water for all', busy_hands: 'Busy hands',
  on_course: 'On course', day_by_day: 'Day by day',
};

const BUILDING_PLURALS = { well: 'wells', farm_grain: 'grain farms', granary: 'granaries', bazaar: 'bazaars', temple: 'temples' };
const TALLY_CONDITIONS = {
  harvested: (n) => `Harvest ${n} food`,
  profitMonths: (n) => `End ${n} months in profit`,
  upgrades: (n) => `Grow homes ${n} times`,
  dailyDone: (n) => `Finish ${n} daily goals`,
};

// An achievement's exact condition, from its declarative measure ("Have 25 homes").
export function achievementCondition(m) {
  switch (m.kind) {
    case 'roads': return `Lay ${m.n} road tiles beyond the starting road`;
    case 'homes': return `Have ${m.n} homes`;
    case 'buildings': {
      const one = buildingName(m.type).toLowerCase();
      return `Have ${plural(m.n, one, BUILDING_PLURALS[m.type] || `${one}s`)}`;
    }
    case 'tier': return `Have ${m.n} homes at ${tierName(m.tier)} or better`;
    case 'people': return `Reach ${m.n} people`;
    case 'tally': return TALLY_CONDITIONS[m.key] ? TALLY_CONDITIONS[m.key](m.n) : '';
    case 'goals': return `Finish ${m.n} goals`;
    case 'fedAll': return `Reach ${m.people} people with every ${tierName(3)} or better home fed`;
    case 'waterAll': return `Have ${m.homes} lived-in homes, all with water`;
    case 'jobs': return `Reach ${m.people} people with ${Math.round(m.rate * 100)}% or fewer out of work`;
    default: return '';
  }
}
export const ACHIEVEMENT_TEXT = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, achievementCondition(a.measure)]));

export const cheerReward = (n) => `+${n} ${T.gold.toLowerCase()}`;
```

**3e. `index.html`**: replace

```html
    <div id="goals" role="region" aria-label="Goals"></div>
  </div>
```

with

```html
    <div id="goals" role="region" aria-label="Goals"></div>
    <div id="cheer" role="status" aria-live="polite"></div>
  </div>
```

(No whitespace inside `#cheer`: the existing `#under-bar > :empty { display: none; }` hides the row while no caption shows, and `body.on-title #under-bar > :not(#notice)` hides it on the title.)

**3f. `src/ui/createUI.js`**: five edits.

(1) Imports. Add after `import { createEffects } from '../render/effects.js';`:

```js
import { GOLD } from '../render/art/palette.js';
```

Add after `import { createToasts } from './toasts.js';`:

```js
import { createCelebrations } from './celebrate.js';
```

Add `guideActive` to the existing import from `'../sim/goals.js'` (on main it is `import { goalById } from '../sim/goals.js';`; earlier tasks may have added names). Add `FIRST_TEXT, ACHIEVEMENT_NAMES, DAILY_TEXT` to the existing import from `'./text.js'` (on main: `import { buildingName, reasonText, milestoneText, T } from './text.js';`). `MILESTONES` and `milestoneText` stay imported; the new `cheerFor` uses them.

(2) Replace the effects construction:

```js
  const effects = createEffects({
    reducedMotion: settings.reducedMotion,
    onMilestone: (id) => { const m = MILESTONES.find((x) => x.id === id); toasts.show(milestoneText(m ? m.name : id)); },
  });
```

with:

```js
  const effects = createEffects({ reducedMotion: settings.reducedMotion });
  // Celebrations (spec 3.6) replace the goal and milestone toasts. Created this early because afterCommand
  // (hoisted) forwards settle's events to onEvents, which shows them.
  const celebrations = createCelebrations({ container: $('cheer') });
```

(3) Replace the whole `onEvents` function. On main it is the six-line function from `function onEvents(events) {` to its closing `}`, with the goal toast loop and the sound loop. If an earlier task added lines to it, keep those lines inside the new loop. Replace it with:

```js
  // Sim events, from game days (the loop, through boot.js) and from settle after a command (Task 12).
  // Celebrations queue in #cheer one at a time (spec 3.6); each one's sound, buzz and sparkle come with its caption.
  function onEvents(events) {
    for (const e of events) if (e.type === 'month') { autosave('month'); break; }
    for (const e of events) {
      if (e.type === 'upgrade') sfx.play('upgrade');
      const cheer = cheerFor(e);
      if (cheer) celebrations.show(cheer);
    }
  }
  function cheerSound() { sfx.play('goal'); sfx.buzz(20); }
  // The caption for one sim event, or null. Achievements stay quiet while the guide runs (spec 3.8): the sim
  // still records them, and the summary shows them as done once the guide ends.
  function cheerFor(e) {
    if (e.type === 'milestone') {
      const m = MILESTONES.find((x) => x.id === e.id);
      return { tier: 'milestone', text: milestoneText(m ? m.name : e.id), onShow: () => { sfx.play('milestone'); sfx.buzz(40); } };
    }
    if (e.type === 'goal') {
      const g = goalById(e.id);
      return g ? { tier: 'first', text: `${T.goalDone}: ${g.text}`, reward: e.reward, onShow: cheerSound } : null;
    }
    if (e.type === 'first') {
      if (!FIRST_TEXT[e.id]) return null;
      const at = Number.isFinite(e.x) && Number.isFinite(e.y) ? { x: e.x, y: e.y } : null;
      return { tier: 'first', text: FIRST_TEXT[e.id], reward: e.reward, onShow: () => { cheerSound(); if (at) effects.sparkle(at.x, at.y, GOLD, now()); } };
    }
    if (e.type === 'achievement') {
      if (guideActive(world) || !ACHIEVEMENT_NAMES[e.id]) return null;
      return { tier: 'first', text: `${T.achievement}: ${ACHIEVEMENT_NAMES[e.id]}`, onShow: cheerSound };
    }
    if (e.type === 'daily') return DAILY_TEXT[e.id] ? { tier: 'first', text: `${T.dailyDone}: ${DAILY_TEXT[e.id]}`, reward: e.reward, onShow: cheerSound } : null;
    if (e.type === 'guide_done') return { tier: 'first', text: T.guideDone, reward: e.reward, onShow: cheerSound };
    return null;
  }
```

(4) In the returned object, add `celebrations` after `toasts`. On main the line starts `store, settings, sfx, placement, cameraControl, alerts, toasts, effects, ...`; it becomes `store, settings, sfx, placement, cameraControl, alerts, toasts, celebrations, effects, ...` (keep any names earlier tasks added).

(5) In `destroy()`, replace

```js
      mapInput.detach(); keyboard.detach(); backStack.stop(); stopLayout(); stopVisibility(); toasts.clear();
```

with

```js
      mapInput.detach(); keyboard.detach(); backStack.stop(); stopLayout(); stopVisibility(); toasts.clear(); celebrations.clear();
```

Also add `'cheer'` to the array of container ids that `destroy()` clears. On main: `for (const id of ['topbar', 'dock', 'panel', 'rail', 'corners', 'goals', 'banner', 'legend', 'live', 'map-summary']) clear($(id));`. Put `'cheer'` after `'goals'` and keep any ids earlier tasks added.

**3g. `css/ui.css`**: append at the end:

```css
/* Celebration captions (spec 3.6): the last row of #under-bar, a parchment card with a gold star. Nothing to
   tap, so the row lets taps through to the map. Text is ink on parchment, and the reward is teal (4.8:1). */
#cheer { position: static; display: flex; max-width: 100%; pointer-events: none; }
#cheer .cheer { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; box-sizing: border-box; background: var(--parchment); color: var(--ink); border: 1px solid var(--gold); border-radius: var(--radius); padding: 6px 12px; box-shadow: var(--shadow); animation: cheer-in 200ms ease-out; }
#cheer .cheer .icon { color: var(--amber-text); }
#cheer .cheer .text { min-width: 0; }
#cheer .cheer .reward { color: var(--teal); font-weight: 600; white-space: nowrap; }
#cheer .cheer.milestone { background: var(--amber-soft); border-color: var(--amber-text); font-weight: 600; }
body[data-layout="wide"] #cheer { max-width: 440px; }
@keyframes cheer-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
body.reduce-motion #cheer .cheer { animation: none; }
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui celebrate"`
Expected: `5 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

Find what is pinned to the old behaviour:

```powershell
git grep -n -e "#toasts .toast').textContent).toContain(GOALS" -e "onMilestone" -e "milestoneText" -e "goalDone" -- tests
```

- `tests/ui/goalsList.test.js` ("wires Show me into the game ..."): done goals no longer toast. Rename the test from `'wires Show me into the game: the right card starts, the camera moves, and done goals toast'` to `'wires Show me into the game: the right card starts, the camera moves, and done goals celebrate'`, and replace

```js
    r.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }]);
    expect(r.root.querySelector('#toasts .toast').textContent).toContain(GOALS[0].text);
```

with

```js
    r.ui.celebrations.clear();
    r.ui.onEvents([{ type: 'goal', id: 'road', reward: 25 }]);
    expect(r.root.querySelector('#cheer .cheer').textContent).toContain(GOALS[0].text);     // a caption now, not a toast (spec 3.6)
    expect(r.root.querySelector('#toasts').textContent.includes(GOALS[0].text)).toBe(false);
```

  If Task 12's `tests/ui/goalsV2.test.js` (or any other hit) reads a goal's text from `#toasts`, change it the same way, to `#cheer .cheer`.
- `tests/render/effects.test.js` uses `onMilestone`. Leave it unchanged: `createEffects` still accepts the hook and calls it from `fromEvents`. Only `createUI` stopped passing it.
- `index.html` order: `tests/ui/boot.test.js` checks that `#notice` sits under the top bar and `#banner` under `#notice`. Both still hold, because an empty `#cheer` is `display: none`. No change.

- [ ] **Step 6: Full suite**

Run: `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`, then `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `Wrote sw-files.js: ...` (now listing `./src/ui/celebrate.js`), then `ALL PASSED`.

- [ ] **Step 7: Commit**

```powershell
git add src/ui/celebrate.js src/ui/createUI.js src/ui/text.js src/data/ui.js src/render/effects.js index.html css/ui.css sw-files.js tests/ui/celebrate.test.js tests/ui/goalsList.test.js tests/all.js
git commit -m @'
Celebrate firsts, goals, achievements and Town in a caption row under the top bar

One caption at a time, 3 s apart, with the goal sound and a sparkle on the
building for a first (a still ring under reduced motion). Goal and milestone
toasts are gone; achievements stay quiet while the guide runs.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

(In Git Bash, use `git commit -F - <<'EOF'` ... `EOF` with the same message.)

### Task 15: Tips and the idle nudge

**Files:**
- Create: `src/data/tips.js`, `src/ui/tips.js`, `src/ui/nudge.js`, `tests/ui/tips.test.js`, `tests/ui/nudge.test.js`
- Modify: `index.html` (`#tip` row), `src/data/ui.js` (`NUDGE_GLOW_MS`, `NUDGE_LINE_MS`), `src/ui/text.js` (`TIP_TEXT`, five `T` keys), `src/ui/createUI.js` (triggers, nudge, Play pulse), `src/ui/menu.js` (How to play lists the tips), `css/ui.css`, `tests/helpers/uiWorld.js` (`rigUI` takes `now`), `sw-files.js` (regenerated), `tests/all.js`
- Test: `tests/ui/tips.test.js`, `tests/ui/nudge.test.js`

**Interfaces:**
- Consumes: `settings.help` (`'full' | 'tips' | 'off'`) and `settings.seenTips` (Task 13); `openGoals`, `goalProgress` (`src/sim/goals.js`, Task 2); `settle` (`src/sim/settle.js`, tests only); Task 12's `afterCommand` (runs `settle`, then `onEvents`); the goals strip's `.show-me` button (Task 12); Task 14's `onEvents` and `celebrations`; `alertText` (`src/ui/text.js`).
- Produces: `TIPS` (`{ id, trigger, priority }`), `TIP_GAP_MS = 180000`, `TIP_HOURLY_MAX = 5`, `TIP_FIRST_DELAY_MS = 10000` in `src/data/tips.js`; `createTips({ container, settings, now })` → `{ trigger(key, { busy }), flush({ busy }), dismiss(), current() }`; `createNudge({ now })` → `{ noteAction(), noteProgress(signature), tick({ running, busy }) }` returning `'none' | 'glow' | 'line'`, plus `nudgeLineText(world, alerts, goal)` and `NUDGE_MAX_STEP_MS`; `NUDGE_GLOW_MS = 45000`, `NUDGE_LINE_MS = 60000` in `src/data/ui.js`; `#tip` after `#goals`; `TIP_TEXT` in `src/ui/text.js`; `createUI(...).tips`.

- [ ] **Step 1: Write the failing tests**

First, let `rigUI` take a clock, so the tests can move past the tips' first delay. In `tests/helpers/uiWorld.js`, add `now = () => 0` to `rigUI`'s options. On main the signature reads:

```js
export async function rigUI({ width = 390, height = 844, hooks = {}, doc = fakeDoc(), welcome = null, sfx = null } = {}) {
```

After the change (keep any options earlier tasks added):

```js
export async function rigUI({ width = 390, height = 844, hooks = {}, doc = fakeDoc(), welcome = null, sfx = null, now = () => 0 } = {}) {
```

In the `createUI({ ... })` call below it, replace `now: () => 0,` with `now,`.

Create `tests/ui/tips.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { createTips } from '../../src/ui/tips.js';
import { createSettings } from '../../src/ui/settings.js';
import { TIPS, TIP_GAP_MS, TIP_HOURLY_MAX, TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
import { settle } from '../../src/sim/settle.js';
import { buildingAt } from '../../src/sim/world.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { TIP_TEXT, T } from '../../src/ui/text.js';
import { fakeLocal } from '../helpers/fakeStorage.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

// Tips on a clock the test moves; the session starts at t = 0.
function rig(storage = fakeLocal()) {
  const { root, cleanup } = mount();
  const settings = createSettings({ storage, root, systemReducedMotion: () => false });
  const clock = { t: 0 };
  const tips = createTips({ container: root, settings, now: () => clock.t });
  return { root, settings, storage, clock, tips, cleanup };
}
const shownText = (root) => { const n = root.querySelector('.tip-row .text'); return n ? n.textContent : null; };

describe('ui tips', () => {
  it('shows a tip on its trigger with Got it, once per device, without taking focus', () => {
    const r = rig();
    try {
      r.clock.t = TIP_FIRST_DELAY_MS;
      expect(r.tips.trigger('no_such_trigger')).toBe(false);
      expect(r.tips.trigger('arrivals')).toBe(true);
      expect(r.tips.current()).toBe('arrivals');
      expect(shownText(r.root)).toBe(TIP_TEXT.arrivals);
      expect(r.settings.get().seenTips).toEqual(['arrivals']);                // showing marks it seen
      const gotIt = r.root.querySelector('.got-it');
      expect(gotIt.textContent).toBe(T.gotIt);
      expect(document.activeElement === gotIt).toBe(false);
      fire(gotIt, 'click');
      expect(r.tips.current()).toBe(null);
      expect(r.root.children.length).toBe(0);
      r.clock.t += TIP_GAP_MS;
      expect(r.tips.trigger('arrivals')).toBe(false);                         // seen
      const c2 = { t: 0 };
      const again = createTips({ container: r.root, settings: createSettings({ storage: r.storage, root: r.root, systemReducedMotion: () => false }), now: () => c2.t });
      c2.t = TIP_FIRST_DELAY_MS;
      expect(again.trigger('arrivals')).toBe(false);                          // seen on this device, in a new session too
      expect(again.trigger('monthEnd')).toBe(true);
    } finally { r.cleanup(); }
  });
  it('waits out the first 10 s, keeps 3 minutes between tips and shows at most five an hour', () => {
    const r = rig();
    try {
      r.clock.t = TIP_FIRST_DELAY_MS - 1;
      expect(r.tips.trigger('arrivals')).toBe(false);
      r.clock.t = TIP_FIRST_DELAY_MS;
      expect(r.tips.trigger('arrivals')).toBe(true);
      r.tips.dismiss();
      r.clock.t += TIP_GAP_MS - 1;
      expect(r.tips.trigger('monthEnd')).toBe(false);
      r.clock.t += 1;
      for (const key of ['monthEnd', 'goalDone', 'overlayOn', 'problemMarker']) {
        expect(r.tips.trigger(key)).toBe(true);
        r.tips.dismiss();
        r.clock.t += TIP_GAP_MS;
      }
      expect(TIP_HOURLY_MAX).toBe(5);
      expect(r.tips.trigger('houseSheet')).toBe(false);                        // a sixth inside the hour
      r.clock.t = TIP_FIRST_DELAY_MS + 3600 * 1000;                             // an hour after the first
      expect(r.tips.trigger('houseSheet')).toBe(true);
    } finally { r.cleanup(); }
  });
  it('holds a tip while a tool is active, shows one at a time, and lets the Play tip jump the queue', () => {
    const r = rig();
    try {
      r.clock.t = TIP_FIRST_DELAY_MS;
      expect(r.tips.trigger('servicePlaced', { busy: true })).toBe(false);
      expect(r.tips.flush({ busy: true })).toBe(false);
      expect(r.tips.flush({ busy: false })).toBe(true);
      expect(r.tips.current()).toBe('service_reach');
      r.clock.t += TIP_GAP_MS;
      expect(r.tips.trigger('monthEnd')).toBe(false);                          // one at a time
      expect(r.tips.trigger('plotsPaused', { busy: true })).toBe(true);        // priority: past a tool, and it replaces the tip
      expect(r.tips.current()).toBe('press_play');
      expect(TIPS.filter((t) => t.priority).map((t) => t.id)).toEqual(['press_play']);
    } finally { r.cleanup(); }
    const early = rig();
    try { expect(early.tips.trigger('plotsPaused')).toBe(true); }             // and before the first delay
    finally { early.cleanup(); }
  });
  it('shows nothing under Help: Off and still shows tips under Tips only', () => {
    const r = rig();
    try {
      r.clock.t = TIP_FIRST_DELAY_MS;
      r.settings.set({ help: 'off' });
      expect(r.tips.trigger('arrivals')).toBe(false);
      expect(r.tips.trigger('plotsPaused')).toBe(false);
      expect(r.settings.get().seenTips).toEqual([]);
      r.settings.set({ help: 'tips' });
      expect(r.tips.trigger('arrivals')).toBe(true);
    } finally { r.cleanup(); }
  });
  it('keeps every tip short and unique, and lists them all in How to play', async () => {
    const ids = TIPS.map((t) => t.id), triggers = TIPS.map((t) => t.trigger);
    expect(TIPS.length).toBe(10);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(triggers).size).toBe(triggers.length);
    for (const t of TIPS) {
      expect(typeof TIP_TEXT[t.id]).toBe('string');
      expect(TIP_TEXT[t.id].split(/\s+/).length).toBeLessThanOrEqual(20);
    }
    const r = await rigUI();
    try {
      r.store.set(openSheet(r.store.get(), 'help'));
      const items = [...r.root.querySelectorAll('#sheet .tips-list li')].map((li) => li.textContent);
      expect(items).toEqual(TIPS.map((t) => TIP_TEXT[t.id]));
      expect([...r.root.querySelectorAll('#sheet h3')].some((h) => h.textContent === T.tips)).toBe(true);
    } finally { r.cleanup(); }
  });
  it('in the game: plots placed while paused bring the Play tip, and Play pulses until the game runs', async () => {
    const r = await rigUI();
    try {
      const row = r.root.querySelector('#tip');
      expect(r.root.querySelector('#goals').nextElementSibling).toBe(row);
      expect(row.getAttribute('role')).toBe('status');
      expect(r.world.speed).toBe(0);
      r.ui.placement.start({ kind: 'houses' });
      r.ui.placement.pointAt(14, 9);
      r.ui.placement.pointAt(15, 9);
      expect(r.ui.placement.confirm().ok).toBe(true);
      expect(r.ui.tips.current()).toBe('press_play');
      expect(row.textContent).toContain(TIP_TEXT.press_play);
      r.frame(16);
      expect(document.body.classList.contains('nudge-play')).toBe(true);
      r.ui.speedControl.set(1);
      r.frame(32);
      expect(r.ui.tips.current()).toBe(null);                                   // its condition cleared
      expect(document.body.classList.contains('nudge-play')).toBe(false);
    } finally { r.cleanup(); }
  });
  it('in the game: a house sheet, a service placed and an overlay each bring their tip, a held one once the tool closes', async () => {
    let t = 0;
    const r = await rigUI({ now: () => t });
    try {
      settle(r.world, []);                                                     // finish what the test city already meets, so placing raises no goal events
      t = TIP_FIRST_DELAY_MS;
      r.store.set(select(r.store.get(), buildingAt(r.world, 12, 9).id));
      expect(r.ui.tips.current()).toBe('house_needs');
      r.ui.tips.dismiss();
      t += TIP_GAP_MS;
      r.ui.placement.start({ kind: 'building', type: 'well' });
      r.ui.placement.moveGhost(16, 9);
      expect(r.ui.placement.confirm().ok).toBe(true);
      expect(r.ui.tips.current()).toBe(null);                                   // held while the tool is active
      r.ui.placement.cancel();
      expect(r.ui.tips.current()).toBe('service_reach');
      r.ui.tips.dismiss();
      t += TIP_GAP_MS;
      r.store.set({ overlay: null });
      r.store.set({ overlay: 'food' });
      expect(r.ui.tips.current()).toBe('overlay_keys');
    } finally { r.cleanup(); }
  });
});
```

Create `tests/ui/nudge.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { createNudge, nudgeLineText, NUDGE_MAX_STEP_MS } from '../../src/ui/nudge.js';
import { NUDGE_GLOW_MS, NUDGE_LINE_MS } from '../../src/data/ui.js';
import { GOALS } from '../../src/data/goals.js';
import { alertText, T } from '../../src/ui/text.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { rigUI } from '../helpers/uiWorld.js';

// The nudge on a clock the test moves, ticked every half second like a slow frame rate.
function machine() {
  const clock = { t: 0 };
  const nudge = createNudge({ now: () => clock.t });
  nudge.tick({ running: false, busy: false });
  const run = (ms, opts = { running: true, busy: false }) => {
    let state = 'none';
    for (let done = 0; done < ms; done += 500) { clock.t += 500; state = nudge.tick(opts); }
    return state;
  };
  return { clock, nudge, run };
}

describe('ui nudge', () => {
  it('glows after 45 s of idle play, shows one line 60 s later, then stays quiet until an action', () => {
    const m = machine();
    expect(NUDGE_GLOW_MS).toBe(45000);
    expect(NUDGE_LINE_MS).toBe(60000);
    expect(m.run(NUDGE_GLOW_MS - 500)).toBe('none');
    expect(m.run(500)).toBe('glow');
    expect(m.run(NUDGE_LINE_MS - 500)).toBe('glow');
    expect(m.run(500)).toBe('line');
    expect(m.run(10 * 60 * 1000)).toBe('line');                                // one line: no third stage, no repeat
    m.nudge.noteAction();
    expect(m.run(500)).toBe('none');
  });
  it('counts neither paused nor busy time, and a stalled frame counts one second at most', () => {
    const m = machine();
    expect(m.run(NUDGE_GLOW_MS * 3, { running: false, busy: false })).toBe('none');
    expect(m.run(NUDGE_GLOW_MS * 3, { running: true, busy: true })).toBe('none');
    m.clock.t += 10 * 60 * 1000;                                               // a hidden tab
    expect(m.nudge.tick({ running: true, busy: false })).toBe('none');
    expect(m.run(NUDGE_GLOW_MS - NUDGE_MAX_STEP_MS - 500)).toBe('none');
    expect(m.run(500)).toBe('glow');
  });
  it('starts again when goal progress moves, not when the same progress is noted', () => {
    const m = machine();
    m.nudge.noteProgress('0|road|0');
    expect(m.run(NUDGE_GLOW_MS)).toBe('glow');
    m.nudge.noteProgress('0|road|0');
    expect(m.run(500)).toBe('glow');
    m.nudge.noteProgress('1|plots|0');
    expect(m.run(500)).toBe('none');
  });
  it('names an affordable fix for the first problem, else the open goal', () => {
    const w = makeTestWorld({ gold: 100 });
    const well = addRaw(w, 'well', 20, 20);                                     // no road beside it
    const noRoad = { code: 'no_road', id: well.id };
    const goal = GOALS[0];
    const t = alertText(noRoad, w);
    expect(nudgeLineText(w, [noRoad], goal)).toBe(`${T.next}: ${t.title}. ${t.fix}`);
    w.gold = 0;
    expect(nudgeLineText(w, [noRoad, { code: 'bazaar_empty', id: well.id }], goal)).toBe(`${T.next}: ${goal.text}`);   // nothing it can pay for
    expect(nudgeLineText(w, [{ code: 'save_failed' }], null)).toBe('');
    w.gold = -10;
    const debt = alertText({ code: 'debt' }, w);
    expect(nudgeLineText(w, [{ code: 'debt' }], goal)).toBe(`${T.next}: ${debt.title}. ${debt.fix}`);   // getting out of debt costs nothing
  });
  it('in the game: Show me glows after 45 s of idle play, one Next line follows, and a command clears both', async () => {
    const r = await rigUI();
    try {
      r.ui.speedControl.set(1);
      const showMe = () => r.root.querySelector('#goals .show-me');
      const line = () => r.root.querySelector('#goals .nudge-line');
      let t = 0;
      const play = (ms) => { const end = t + ms; while (t < end) { t += 1000; r.frame(t); } };
      r.frame(0);
      play(NUDGE_GLOW_MS - 1000);
      expect(showMe().classList.contains('glow')).toBe(false);
      play(1000);
      expect(showMe().classList.contains('glow')).toBe(true);
      expect(line().hidden).toBe(true);
      play(NUDGE_LINE_MS);
      expect(showMe().classList.contains('glow')).toBe(false);
      expect(line().hidden).toBe(false);
      expect(line().textContent.startsWith(`${T.next}: `)).toBe(true);
      r.ui.speedControl.set(2);                                                 // any command is an action
      play(1000);
      expect(line().hidden).toBe(true);
      expect(showMe().classList.contains('glow')).toBe(false);
      r.ui.settings.set({ help: 'off' });
      play(NUDGE_GLOW_MS + 1000);
      expect(showMe().classList.contains('glow')).toBe(false);                  // Help: Off silences it
    } finally { r.cleanup(); }
  });
});
```

Append these lines to the end of `tests/all.js`:

```js
import './ui/tips.test.js';
import './ui/nudge.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui tips"`
Expected: `LOAD ERROR`, with the import of `/src/ui/tips.js` (or `/src/data/tips.js`) failing, so no test runs. `-Grep "ui nudge"` gives the same load error, for `/src/ui/nudge.js`.

- [ ] **Step 3: Implement**

**3a. `src/data/ui.js`**: append:

```js
// The idle nudge (spec 3.5): Show me glows after this much idle running play, and one Next line follows this much later.
export const NUDGE_GLOW_MS = 45000;
export const NUDGE_LINE_MS = 60000;
```

**3b. Create `src/data/tips.js`:**

```js
// Tips (spec 3.4): ten short lessons, each tied to one trigger the interface fires (src/ui/createUI.js).
// Each shows at most once per device. The priority tip (only Press Play) ignores the first delay, the gap
// and an active tool, and replaces a tip already showing. The words live in src/ui/text.js (TIP_TEXT).
export const TIPS = [
  { id: 'press_play', trigger: 'plotsPaused', priority: true },          // plots placed while paused
  { id: 'arrivals', trigger: 'arrivals', priority: false },              // families arrived
  { id: 'house_needs', trigger: 'houseSheet', priority: false },         // a house sheet opened
  { id: 'service_reach', trigger: 'servicePlaced', priority: false },    // a well, bazaar or temple placed
  { id: 'problem_marker', trigger: 'problemMarker', priority: false },   // problem markers appeared on the map
  { id: 'month_summary', trigger: 'monthEnd', priority: false },         // a month ended
  { id: 'more_workers', trigger: 'labourShortage', priority: false },    // a labour shortage began
  { id: 'undo_demolish', trigger: 'demolished', priority: false },       // something was demolished
  { id: 'goals_list', trigger: 'goalDone', priority: false },            // a goal was done
  { id: 'overlay_keys', trigger: 'overlayOn', priority: false },         // an overlay turned on by hand
];

export const TIP_GAP_MS = 180000;          // at least 3 minutes between two tips
export const TIP_HOURLY_MAX = 5;           // and at most five in any hour
export const TIP_FIRST_DELAY_MS = 10000;   // none in the first 10 s of a session
```

**3c. Create `src/ui/tips.js`:**

```js
// The tip row (spec 3.4): one tip at a time in #tip, under the goals strip, with Got it. A tip fires only on
// its trigger, at most once per device (settings.seenTips; showing it counts), never in the first
// TIP_FIRST_DELAY_MS of a session, at least TIP_GAP_MS after the last one and at most TIP_HOURLY_MAX an hour.
// A tip triggered while a tool is active waits in a one-tip slot until flush() runs with no tool active.
// The priority tip (Press Play) skips the delay, the gap and the tool rule. Nothing shows under Help: Off.
// #tip is a polite live region: a tip is read once as it appears, and it never takes focus.
import { TIPS, TIP_GAP_MS, TIP_HOURLY_MAX, TIP_FIRST_DELAY_MS } from '../data/tips.js';
import { el, button, clear } from './components.js';
import { TIP_TEXT, T } from './text.js';

const HOUR_MS = 60 * 60 * 1000;

export function createTips({ container, settings, now = () => performance.now() }) {
  const started = now();
  const shownAt = [];      // when each tip of this session appeared
  let showing = null;      // the id on screen
  let waiting = null;      // a tip held back by an active tool

  const seen = () => (Array.isArray(settings.get().seenTips) ? settings.get().seenTips : []);
  const enabled = () => settings.get().help !== 'off';

  function allowed(tip, t) {
    if (tip.priority) return true;
    if (showing) return false;
    if (t - started < TIP_FIRST_DELAY_MS) return false;
    if (shownAt.length && t - shownAt[shownAt.length - 1] < TIP_GAP_MS) return false;
    return shownAt.filter((s) => t - s < HOUR_MS).length < TIP_HOURLY_MAX;
  }

  function render() {
    clear(container);
    if (!showing) return;
    container.append(el('div', { class: 'tip-row' }, [
      el('span', { class: 'label small muted', text: T.tip }),
      el('span', { class: 'text', text: TIP_TEXT[showing] }),
      button(T.gotIt, { class: 'got-it quiet', onClick: () => api.dismiss() }),
    ]));
  }

  function consider(tip, busy) {
    if (!enabled() || seen().includes(tip.id)) return false;
    if (busy && !tip.priority) { if (!waiting) waiting = tip; return false; }
    const t = now();
    if (!allowed(tip, t)) return false;
    showing = tip.id;
    shownAt.push(t);
    settings.set({ seenTips: [...seen(), tip.id] });
    render();
    return true;
  }

  const api = {
    trigger(key, { busy = false } = {}) {
      const tip = TIPS.find((x) => x.trigger === key);
      return tip ? consider(tip, busy) : false;
    },
    flush({ busy = false } = {}) {
      if (busy || !waiting) return false;
      const tip = waiting;
      waiting = null;
      return consider(tip, false);
    },
    dismiss() {
      if (!showing) return;
      showing = null;
      render();
    },
    current: () => showing,
  };
  return api;
}
```

**3d. Create `src/ui/nudge.js`:**

```js
// The idle nudge (spec 3.5). After NUDGE_GLOW_MS of running play with no tool, sheet or dialog open, no
// meaningful action and no goal progress, Show me glows. NUDGE_LINE_MS later one "Next:" line appears. Then
// nothing more until the player acts or a goal moves. It is never a sound, a camera move or a panel. The state
// machine is pure: time comes from the injected clock, and paused or busy time never counts.
import { NUDGE_GLOW_MS, NUDGE_LINE_MS } from '../data/ui.js';
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { alertText, T } from './text.js';

export const NUDGE_MAX_STEP_MS = 1000;     // a stalled frame (a hidden tab, a long hitch) counts as one second at most

export function createNudge({ now = () => performance.now(), glowMs = NUDGE_GLOW_MS, lineMs = NUDGE_LINE_MS } = {}) {
  let idle = 0;              // ms of idle running play since the last action or progress
  let last = null;           // the previous tick's time
  let signature;             // the last goal-progress signature noted
  return {
    noteAction() { idle = 0; },
    noteProgress(sig) { if (sig !== signature) { signature = sig; idle = 0; } },
    tick({ running = false, busy = false } = {}) {
      const t = now();
      const dt = last === null ? 0 : Math.min(NUDGE_MAX_STEP_MS, Math.max(0, t - last));
      last = t;
      if (running && !busy) idle += dt;
      if (idle >= glowMs + lineMs) return 'line';
      if (idle >= glowMs) return 'glow';
      return 'none';
    },
  };
}

// What each alert's cheapest fix costs, for "an affordable fix". Alerts without an entry (a failing save) are skipped.
const FIX_COST = {
  no_road: () => ECONOMY.roadCost,
  no_storage: () => BUILDINGS.granary.cost,
  storage_full: () => BUILDINGS.granary.cost,
  bazaar_empty: () => BUILDINGS.granary.cost,
  understaffed: () => BUILDINGS.house.cost,
  labour_shortage: () => BUILDINGS.house.cost,
  unemployment: () => Math.min(BUILDINGS.farm_grain.cost, BUILDINGS.bazaar.cost),
  debt: () => -Infinity,
};

// The nudge's one line: the first problem the treasury can pay to fix, else the open goal, else nothing.
export function nudgeLineText(world, alerts, goal) {
  for (const a of alerts) {
    const cost = FIX_COST[a.code];
    if (cost && world.gold >= cost()) { const t = alertText(a, world); return `${T.next}: ${t.title}. ${t.fix}`; }
  }
  return goal ? `${T.next}: ${goal.text}` : '';
}
```

**3e. `src/ui/text.js`**: add these keys inside `T`, after its last key:

```js
  tip: 'Tip', gotIt: 'Got it', tips: 'Tips', tipsHelp: 'Each tip shows once, under the goals. Help in Settings turns them off.', next: 'Next',
```

Append at the end of the file:

```js
// Tips (spec 3.4): one line each, verb first, 20 words or fewer, keyed by the ids in src/data/tips.js.
export const TIP_TEXT = {
  press_play: 'Press Play so people can move in. Plots stay empty while the game is paused.',
  arrivals: 'Place more plots to make room: new families arrive a few times a month while homes have space.',
  house_needs: 'Read the list: it shows what this home needs to grow, and Show me points at the fix.',
  service_reach: 'Look at the coloured tiles: they show which homes a well, bazaar or temple reaches along the roads.',
  problem_marker: 'Tap a building with a red ! badge to see what is wrong and how to fix it.',
  month_summary: "Tap the numbers in the top bar to see this month's taxes, wages and food.",
  more_workers: 'Place more homes: every building needs workers, and workers come from homes.',
  undo_demolish: 'Press Undo to bring back what you just removed, if you change your mind.',
  goals_list: 'Open Goals to see what comes next, how far along you are and the gold each pays.',
  overlay_keys: 'Read the overlay: a filled dot has it, a hollow ring is missing it. Tap ✕ to close it.',
};
```

**3f. `index.html`**: replace

```html
    <div id="goals" role="region" aria-label="Goals"></div>
    <div id="cheer" role="status" aria-live="polite"></div>
```

with

```html
    <div id="goals" role="region" aria-label="Goals"></div>
    <div id="tip" role="status" aria-live="polite"></div>
    <div id="cheer" role="status" aria-live="polite"></div>
```

**3g. `src/ui/menu.js`**: add `import { TIPS } from '../data/tips.js';` below `import { KEYS, APP_VERSION } from '../data/ui.js';`, and add `TIP_TEXT` to the import from `'./text.js'` (on main: `import { HELP_ROWS, T } from './text.js';`). At the end of `help(body)`, after its last `body.append(...)` (on main the goals line; Task 13's Resume guide may follow it), add:

```js
    body.append(el('h3', { text: T.tips }), el('p', { class: 'muted', text: T.tipsHelp }), el('ul', { class: 'tips-list' }, TIPS.map((tip) => el('li', { text: TIP_TEXT[tip.id] }))));
```

**3h. `src/ui/createUI.js`**: nine edits. Anchors are named by the code around them because Tasks 7-14 have moved lines.

(1) Imports. Add after `import { createCelebrations } from './celebrate.js';` (Task 14):

```js
import { createTips } from './tips.js';
import { createNudge, nudgeLineText } from './nudge.js';
```

Add `openGoals, goalProgress` to the import from `'../sim/goals.js'` (skip any already there) and `AUTO_OVERLAY` to the import from `'../data/ui.js'`.

(2) Directly after Task 14's line `const celebrations = createCelebrations({ container: $('cheer') });`, add:

```js
  // Tips and the idle nudge (spec 3.4, 3.5): quiet, never over the map, both off under Help: Off. frameNow is
  // the latest frame's time, so the nudge counts only time the player actually watched.
  const tips = createTips({ container: $('tip'), settings, now });
  let frameNow = now();
  const nudge = createNudge({ now: () => frameNow });
  const nudgeLine = el('p', { class: 'nudge-line', hidden: true });
  let nudgeState = 'none', markerCount = 0, hadShortage = false;
  const helpOn = () => settings.get().help !== 'off';
  const fireTip = (key) => tips.trigger(key, { busy: isToolMode(store.get().mode) });
```

(3) Directly after the statement that creates `goalsStrip` (`const goalsStrip = createGoalsStrip({ container: $('goals'), ... });`), add:

```js
  $('goals').append(nudgeLine);                        // the nudge's one line sits under the strip (spec 3.5)
```

(4) In `afterCommand(e)`, insert these lines immediately before `ghostsDirty = true;`:

```js
    nudge.noteAction();                                // a command is a meaningful action (spec 3.5)
    if (e.undoable && e.kind === 'houses' && world.speed === 0) fireTip('plotsPaused');
    if (e.undoable && e.kind === 'building' && store.get().tool && AUTO_OVERLAY[store.get().tool.type]) fireTip('servicePlaced');
    if (e.undoable && e.kind === 'demolish') fireTip('demolished');
    if (e.kind === 'speed' && world.speed > 0 && tips.current() === 'press_play') tips.dismiss();   // its condition has cleared
```

(5) In Task 14's `onEvents`, replace

```js
    for (const e of events) {
      if (e.type === 'upgrade') sfx.play('upgrade');
      const cheer = cheerFor(e);
```

with

```js
    for (const e of events) {
      if (e.type === 'upgrade') sfx.play('upgrade');
      else if (e.type === 'arrivals') fireTip('arrivals');
      else if (e.type === 'month') fireTip('monthEnd');
      else if (e.type === 'goal') fireTip('goalDone');
      const cheer = cheerFor(e);
```

(6) In `refreshChrome()`, after `setText($('map-summary'), mapSummaryText(world, alerts.list()));`, add:

```js
    // Tips that follow the alerts (the first problem markers, a labour shortage), and goal progress for the nudge.
    const list = alerts.list();
    const markers = list.filter((a) => a.id !== undefined && a.id !== null).length;
    if (markers > 0 && markerCount === 0) fireTip('problemMarker');
    markerCount = markers;
    const shortage = list.some((a) => a.code === 'labour_shortage');
    if (shortage && !hadShortage) fireTip('labourShortage');
    hadShortage = shortage;
    nudge.noteProgress(progressSignature());
```

and add this function directly after `refreshChrome`:

```js
  // Goal progress as one string: the nudge starts again whenever it changes (spec 3.5).
  function progressSignature() {
    const [goal] = openGoals(world, 1);
    const p = goal ? goalProgress(world, goal) : null;
    return `${world.goals.completed.length}|${goal ? goal.id : ''}|${p ? p.n : ''}`;
  }
```

(7) Directly after the line `root.dataset.mode = store.get().mode;` (just after the existing `store.subscribe` block), add:

```js
  // Tips and the nudge watch the interface: a tool starting (a card picked, Show me) and a sheet opening are
  // meaningful actions; a house sheet and an overlay turned on by hand have tips; a held tip shows once no tool is active.
  let seenMode = store.get().mode, seenSheet = store.get().sheet, seenOverlay = store.get().overlay;
  store.subscribe((s) => {
    const opened = Boolean(s.sheet) && s.sheet !== seenSheet;
    if ((isToolMode(s.mode) && !isToolMode(seenMode)) || opened) nudge.noteAction();
    if (opened && s.sheet.kind === 'info') { const b = world.buildings[s.sheet.id]; if (b && b.type === 'house') fireTip('houseSheet'); }
    if (s.overlay && s.overlay !== seenOverlay && !isToolMode(s.mode)) fireTip('overlayOn');
    if (!isToolMode(s.mode)) tips.flush({ busy: false });
    seenMode = s.mode; seenSheet = s.sheet; seenOverlay = s.overlay;
  });
```

(8) In `render({ timeDays, now: t })`, add `frameNow = t;` as the first statement (before `cameraControl.tick(t);`) and `tickNudge(store.get());` as the last statement (after the `if (world.day !== lastDay) { ... }` line). Then add this function directly after `render`:

```js
  // Once a frame (spec 3.5): the nudge's glow on Show me, then its one line, then nothing more. The Play tip's
  // pulse on the speed control lasts while that tip shows and the game is paused. Help: Off silences both.
  function tickNudge(s) {
    const on = helpOn();
    if (!on && tips.current()) tips.dismiss();
    root.classList.toggle('nudge-play', tips.current() === 'press_play' && world.speed === 0);
    const state = on ? nudge.tick({ running: world.speed > 0, busy: isToolMode(s.mode) || Boolean(s.sheet) || Boolean(s.confirmDialog) }) : 'none';
    if (state === nudgeState) return;
    nudgeState = state;
    const showMeButton = $('goals').querySelector('.show-me');
    if (showMeButton) showMeButton.classList.toggle('glow', state === 'glow');
    const text = state === 'line' ? nudgeLineText(world, alerts.list(), openGoals(world, 1)[0] || null) : '';
    setText(nudgeLine, text);
    nudgeLine.hidden = !text;
  }
```

(9) Add `tips` to the returned object (after `celebrations`). In `destroy()`, add `'tip'` to the cleared container ids (after `'cheer'`), and replace `root.classList.remove('has-banner', 'has-overlay');` with `root.classList.remove('has-banner', 'has-overlay', 'nudge-play');` (keep any classes earlier tasks added to that call).

**3i. `css/ui.css`**: append:

```css
/* The tip row (spec 3.4): under the goals strip, one tip at a time with Got it. Ink on teal-soft (6.7:1 for the muted label). */
#tip { position: static; display: flex; max-width: 100%; pointer-events: none; }
#tip > * { pointer-events: auto; }
#tip .tip-row { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; box-sizing: border-box; background: var(--teal-soft); color: var(--ink); border: 1px solid var(--teal); border-radius: var(--radius); padding: 2px 4px 2px 12px; box-shadow: var(--shadow); }
#tip .tip-row .text { min-width: 0; }
body[data-layout="wide"] #tip { max-width: 440px; }

/* The idle nudge (spec 3.5): its one line sits under the goals strip, so #goals stacks in a column. Show me
   gets a gold ring that pulses twice (under 1 flash a second, done in 2.4 s), then stays still until the
   player acts; under reduced motion only the still ring shows. The Play tip rings the speed control the same way. */
#goals { flex-direction: column; align-items: flex-start; gap: 4px; }
#goals .nudge-line { margin: 0; max-width: 100%; box-sizing: border-box; background: var(--parchment); color: var(--ink); border-radius: var(--radius); padding: 4px 12px; box-shadow: var(--shadow); pointer-events: none; }
.goal-strip .show-me.glow { box-shadow: 0 0 0 3px var(--gold); animation: nudge-glow 1.2s ease-in-out 2; }
body.nudge-play .speed-main { box-shadow: 0 0 0 3px var(--gold); animation: nudge-glow 1.2s ease-in-out 2; }
body.nudge-play #topbar .speed-bar { border-radius: var(--radius); box-shadow: 0 0 0 3px var(--gold); animation: nudge-glow 1.2s ease-in-out 2; }
@keyframes nudge-glow { 0%, 100% { box-shadow: 0 0 0 3px var(--gold); } 50% { box-shadow: 0 0 0 8px rgba(226, 177, 60, 0.35); } }
body.reduce-motion .goal-strip .show-me.glow, body.reduce-motion.nudge-play .speed-main, body.reduce-motion.nudge-play #topbar .speed-bar { animation: none; }
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui tips"`
Expected: `7 passed, 0 failed` and `ALL PASSED`.
Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui nudge"`
Expected: `5 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

Check:

```powershell
git grep -n -e "#goals" -e "tips" -e "nudge" -e "'help')" -e "rigUI({" -- tests
```

Nothing should need changing:
- `tests/ui/goalsList.test.js` ("stacks under the banner and the legend") compares the strip's top with the legend's bottom. That still holds with `#goals` as a column, because the hidden nudge line is `display: none`.
- `tests/ui/menu.test.js` ("help lists every shortcut ...") counts `.shortcuts tbody tr` and looks for `T.goalsHelp`. The tips list is a separate `ul.tips-list` after them.
- `tests/ui/a11y.test.js` opens the help sheet. The tips list has no buttons, and Got it is a named button.
- `tests/ui/boot.test.js` checks that `#topbar` and `#dock` are empty after destroy. `#tip` and the nudge line (inside `#goals`) are cleared by `destroy()` too.
- `rigUI`'s new `now` option defaults to the old `() => 0`, so existing callers behave as before.

If a Task 12 or 13 test asserts the exact children of `#goals` (for example `#goals.children.length === 1`), change it to count `.goal-strip` instead (`#goals .goal-strip`), since `#goals` now also holds the hidden `.nudge-line`.

- [ ] **Step 6: Full suite**

Run: `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`, then `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ALL PASSED` (the cache list now includes `./src/data/tips.js`, `./src/ui/tips.js` and `./src/ui/nudge.js`).

- [ ] **Step 7: Commit**

```powershell
git add src/data/tips.js src/ui/tips.js src/ui/nudge.js src/ui/createUI.js src/ui/menu.js src/ui/text.js src/data/ui.js index.html css/ui.css sw-files.js tests/ui/tips.test.js tests/ui/nudge.test.js tests/helpers/uiWorld.js tests/all.js
git commit -m @'
Add tips under the goals strip and a silent idle nudge on Show me

Ten tips, each once per device, at most one every 3 minutes and five an
hour, held while a tool is active; Press Play jumps the queue and rings the
speed control. After 45 s of idle play Show me glows, and 60 s later one
Next line names an affordable fix or the goal. Help: Off turns both off.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 16: Achievements on the summary; Welcome back additions

**Files:**
- Create: `tests/ui/achievementsSheet.test.js`
- Modify: `src/ui/sheets.js` (Achievements section at the end of the summary), `src/ui/welcomeBack.js` (▲▼ trends, Today, closest achievement), `src/ui/text.js` (headings and helpers), `css/ui.css` (`.trends`, achievements list), `sw-files.js` (regenerated), `tests/ui/welcomeBack.test.js`, `tests/all.js`
- Test: `tests/ui/achievementsSheet.test.js`, `tests/ui/welcomeBack.test.js`

**Interfaces:**
- Consumes: `ACHIEVEMENTS` (`src/data/achievements.js`), `achievementProgress(world, def)` (`src/sim/achievements.js`), `world.achievements` (`null` or ids), `world.daily`, `dailyProgress(world, id)`, `startDaily` (tests) (`src/sim/daily.js`), `guideActive` (`src/sim/goals.js`), `GUIDE_GOALS` (`src/data/goals.js`, tests), `setGuide` (tests), `ACHIEVEMENT_NAMES` and `ACHIEVEMENT_TEXT` (Task 14), `DAILY_TEXT` and `T.today` (Task 12).
- Produces: the summary's Achievements section (`h3` "Achievements, N of 24", then `ul.achievements` with one `li.achievement[data-id]` per achievement, each with a `role="progressbar"` bar or "Done"); `trendDirection(current, history, key)` and `closestAchievement(world)` exported from `src/ui/welcomeBack.js`; `achievementsHeading`, `progressOfText` and `closestAchievementText` in `src/ui/text.js`.

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/achievementsSheet.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { openSheet } from '../../src/ui/modes.js';
import { setGuide } from '../../src/sim/commands.js';
import { guideActive } from '../../src/sim/goals.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { T, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, achievementsHeading } from '../../src/ui/text.js';

const rowOf = (r, id) => r.root.querySelector(`#sheet .achievement[data-id="${id}"]`);
const lastHeading = (r) => r.root.querySelector('#sheet .body').lastElementChild.previousElementSibling.textContent;

describe('ui achievements sheet', () => {
  it('ends the city summary with every achievement, its exact condition and its progress', async () => {
    const r = await rigUI();
    try {
      setGuide(r.world, false);
      r.world.achievements = [];
      r.store.set(openSheet(r.store.get(), 'summary'));
      const body = r.root.querySelector('#sheet .body');
      expect(body.lastElementChild.classList.contains('achievements')).toBe(true);   // the last section
      expect(lastHeading(r)).toBe(achievementsHeading(0, ACHIEVEMENTS.length));
      expect(achievementsHeading(5, 24)).toBe('Achievements, 5 of 24');
      expect(body.querySelectorAll('.achievement').length).toBe(ACHIEVEMENTS.length);
      const neighbours = rowOf(r, 'neighbours');
      expect(neighbours.textContent).toContain(ACHIEVEMENT_NAMES.neighbours);
      expect(neighbours.textContent).toContain('Have 10 homes');
      expect(neighbours.textContent).toContain('2 of 10');                             // the test city's two huts
      const bar = neighbours.querySelector('[role="progressbar"]');
      expect([bar.getAttribute('aria-valuemin'), bar.getAttribute('aria-valuenow'), bar.getAttribute('aria-valuemax')]).toEqual(['0', '2', '10']);
      expect(bar.getAttribute('aria-label')).toBe(`${ACHIEVEMENT_NAMES.neighbours}: 2 of 10`);
      expect(bar.querySelector('.fill').style.width).toBe('20%');
      expect(rowOf(r, 'street').textContent).toContain(ACHIEVEMENT_TEXT.street);
      r.world.achievements = ['way_in'];
      r.ui.refresh();
      expect(lastHeading(r)).toBe(achievementsHeading(1, ACHIEVEMENTS.length));
      const wayIn = rowOf(r, 'way_in');
      expect(wayIn.classList.contains('done')).toBe(true);
      expect(wayIn.textContent).toContain(T.doneLabel);
      expect(wayIn.querySelector('[role="progressbar"]')).toBe(null);
    } finally { r.cleanup(); }
  });
  it('keeps achievements out of sight while the guide runs', async () => {
    const r = await rigUI();
    try {
      setGuide(r.world, true);
      expect(guideActive(r.world)).toBe(true);
      r.store.set(openSheet(r.store.get(), 'summary'));
      const sheet = r.root.querySelector('#sheet');
      expect(sheet.textContent).toContain(T.achievementsLater);
      expect(sheet.querySelectorAll('.achievement').length).toBe(0);
    } finally { r.cleanup(); }
  });
  it('shows Not yet, not a bar, for achievements that are met or not', async () => {
    const r = await rigUI();
    try {
      setGuide(r.world, false);
      r.world.achievements = [];
      r.store.set(openSheet(r.store.get(), 'summary'));
      for (const id of ['no_one_hungry', 'water_for_all', 'busy_hands']) {
        const row = rowOf(r, id);
        expect(row.textContent).toContain(T.notYetMet);
        expect(row.querySelector('[role="progressbar"]')).toBe(null);
      }
    } finally { r.cleanup(); }
  });
});
```

In `tests/ui/welcomeBack.test.js`, replace the import block at the top:

```js
import { describe, it, expect } from '../harness.js';
import { elapsedText, trendText } from '../../src/ui/welcomeBack.js';
import { T, alertText } from '../../src/ui/text.js';
import { GOALS } from '../../src/data/goals.js';
import { fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';
```

with:

```js
import { describe, it, expect } from '../harness.js';
import { elapsedText, trendText, trendDirection, closestAchievement } from '../../src/ui/welcomeBack.js';
import { T, alertText, ACHIEVEMENT_NAMES, DAILY_TEXT, closestAchievementText } from '../../src/ui/text.js';
import { GOALS, GUIDE_GOALS } from '../../src/data/goals.js';
import { startDaily, dailyProgress } from '../../src/sim/daily.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';
```

Then add these three tests inside `describe('ui welcome back', ...)`, after the existing two:

```js
  it('compares with the row three months back however long the history is, and says which way it went', () => {
    const rows = [100, 110, 120, 130, 140, 150].map((people, i) => ({ day: 30 * (i + 1), people, gold: 0, mood: 60 }));
    expect(trendText('People', 160, rows, 'people')).toBe('People 160, up from 120');
    expect(trendDirection(160, rows, 'people')).toBe('up');
    expect(trendDirection(100, rows, 'people')).toBe('down');
    expect(trendDirection(120, rows, 'people')).toBe('steady');
    expect(trendDirection(5, [], 'people')).toBe(null);
  });
  it('picks the unfinished achievement nearest to done', () => {
    const w = makeTestWorld();
    w.achievements = [];
    expect(closestAchievement(w)).toBe(null);                                   // nothing started
    for (let i = 0; i < 8; i++) addRaw(w, 'house', 10 + i, 5);
    const c = closestAchievement(w);
    expect([c.def.id, c.n, c.of]).toEqual(['neighbours', 8, 10]);
    addRaw(w, 'house', 18, 5); addRaw(w, 'house', 19, 5);
    expect(closestAchievement(w).def.id).toBe('street');                        // 10 of 10 is finished, recorded or not
    w.achievements = ['neighbours'];
    expect(closestAchievement(w).def.id).toBe('street');
  });
  it('marks trends with ▲ and ▼ beside the words, lists today\'s goals and names the closest achievement', async () => {
    const r = await rigUI({ welcome: { savedAt: Date.now() - H, lastSpeed: 1 } });
    try {
      r.world.history = [{ day: 30, people: 4, gold: r.world.gold + 500, mood: r.world.mood }];
      r.ui.refresh();
      const sheet = r.root.querySelector('#sheet');
      const rows = [...sheet.querySelectorAll('.trends li')];
      expect(rows[0].querySelector('.trend.up').textContent).toBe('▲');
      expect(rows[0].querySelector('.trend').getAttribute('aria-hidden')).toBe('true');
      expect(rows[0].textContent).toContain(`${T.people} 8, ${T.upFrom} 4`);
      expect(rows[1].querySelector('.trend.down').textContent).toBe('▼');
      expect(rows[2].querySelector('.trend')).toBe(null);                        // steady: the words only
      expect(rows[2].textContent).toContain(T.steadyAt);
      expect(sheet.querySelector('.today')).toBe(null);                          // no daily goals before the opening chain is done
      expect(sheet.querySelector('.closest')).toBe(null);                        // achievements stay hidden while the guide runs
      for (const id of GUIDE_GOALS) if (!r.world.goals.completed.includes(id)) r.world.goals.completed.push(id);
      expect(startDaily(r.world, '2026-10-11')).toBe(true);
      r.world.achievements = [];
      r.ui.refresh();
      const today = sheet.querySelector('.today');
      expect(today.previousElementSibling.textContent).toBe(T.today);
      expect(today.querySelectorAll('li').length).toBe(3);
      const first = r.world.daily.picks[0];
      const p = dailyProgress(r.world, first);
      expect(today.querySelector('li').textContent).toContain(DAILY_TEXT[first]);
      expect(today.querySelector('li').textContent).toContain(`${p.n} of ${p.of}`);
      const c = closestAchievement(r.world);
      expect(c === null).toBe(false);
      expect(sheet.querySelector('.closest').textContent).toBe(closestAchievementText(ACHIEVEMENT_NAMES[c.def.id], c.n, c.of));
    } finally { r.cleanup(); }
  });
```

Append this line to the end of `tests/all.js`:

```js
import './ui/achievementsSheet.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui achievements sheet"`
Expected: `LOAD ERROR`. `tests/ui/welcomeBack.test.js` imports `trendDirection` and `closestAchievement`, which `src/ui/welcomeBack.js` does not export yet, so the module graph fails to link and no test runs. (Once the welcome exports exist, the three achievements-sheet tests fail on missing `.achievement` rows and the missing `achievementsHeading`.)

- [ ] **Step 3: Implement**

**3a. `src/ui/text.js`**: add these keys inside `T`, after its last key. `today` is Task 12's key; add it only if it is missing.

```js
  achievements: 'Achievements', achievementsLater: 'Achievements show here once the guide is done.', doneLabel: 'Done', notYetMet: 'Not yet', closestAchievement: 'Closest achievement',
  today: 'Today',
```

Append at the end of the file:

```js
// Achievements on the summary and the Welcome back card (spec 3.8, 3.9).
export const achievementsHeading = (done, total) => `${T.achievements}, ${done} of ${total}`;
export const progressOfText = (n, of) => `${n} of ${of}`;
export const closestAchievementText = (name, n, of) => `${T.closestAchievement}: ${name}, ${n} of ${of}`;
```

**3b. `src/ui/sheets.js`**: four edits.

Imports. Add below `import { openGoals } from '../sim/goals.js';`, and add `guideActive` to that goals import (keep names earlier tasks added):

```js
import { achievementProgress } from '../sim/achievements.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
```

Add `ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, achievementsHeading, progressOfText` to the import from `'./text.js'`.

Below `const row = (label, value) => ...;`, add:

```js
const YES_NO = new Set(['fedAll', 'waterAll', 'jobs']);   // achievements that are met or not: no count to show
```

At the end of `summarySheet()`, replace

```js
    return [head(T.summary), body];
  }
```

with

```js
    body.append(...achievementsSection());
    return [head(T.summary), body];
  }

  // Achievements (spec 3.8): every one with its exact condition and its progress, at the end of the summary.
  // Hidden while the guide runs, so they never compete with it.
  function achievementsSection() {
    if (guideActive(world)) return [el('h3', { text: T.achievements }), el('p', { class: 'muted', text: T.achievementsLater })];
    const done = new Set(world.achievements || []);
    const count = ACHIEVEMENTS.filter((a) => done.has(a.id)).length;
    return [
      el('h3', { text: achievementsHeading(count, ACHIEVEMENTS.length) }),
      el('ul', { class: 'achievements' }, ACHIEVEMENTS.map((a) => achievementRow(a, done.has(a.id)))),
    ];
  }

  function achievementRow(a, isDone) {
    const name = ACHIEVEMENT_NAMES[a.id];
    let status;
    if (isDone) status = el('span', { class: 'status' }, [el('span', { class: 'tick', 'aria-hidden': 'true', text: '✓ ' }), T.doneLabel]);
    else if (YES_NO.has(a.measure.kind)) status = el('span', { class: 'status muted', text: T.notYetMet });
    else {
      const p = achievementProgress(world, a);
      const words = progressOfText(p.n, p.of);
      status = el('span', { class: 'status' }, [
        el('span', { class: 'ach-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(p.of), 'aria-valuenow': String(p.n), 'aria-label': `${name}: ${words}` }, [
          el('span', { class: 'fill', style: { width: `${Math.round((p.n / p.of) * 100)}%` } }),
        ]),
        el('span', { class: 'small', 'aria-hidden': 'true', text: words }),     // the bar's label already says it
      ]);
    }
    return el('li', { class: isDone ? 'achievement done' : 'achievement', dataset: { id: a.id } }, [
      el('span', { class: 'what' }, [el('strong', { text: name }), el('span', { class: 'small muted', text: ACHIEVEMENT_TEXT[a.id] })]),
      status,
    ]);
  }
```

**3c. Replace `src/ui/welcomeBack.js`** with the file below. Tasks 1-15 do not touch this file; check with `git log --oneline main.. -- src/ui/welcomeBack.js`, and if one did, merge its lines into this version.

```js
// The Welcome back card (spec 4.17; early-game pass 3.9): the date, how long ago, trends with ▲ and ▼ beside
// the words, open goals, today's goals, the achievement closest to done, alerts with View, Carry on.
import { population } from '../sim/world.js';
import { dateParts } from '../sim/clock.js';
import { openGoals, guideActive } from '../sim/goals.js';
import { dailyProgress } from '../sim/daily.js';
import { achievementProgress } from '../sim/achievements.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { CRITICAL } from './alerts.js';
import { el, button } from './components.js';
import { alertText, dateText, plural, progressOfText, closestAchievementText, ACHIEVEMENT_NAMES, DAILY_TEXT, T } from './text.js';

const MINUTE = 60 * 1000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;

export function elapsedText(savedAt, now = Date.now()) {
  if (!Number.isFinite(savedAt)) return T.aWhileAgo;
  const ms = Math.max(0, now - savedAt);
  if (ms < MINUTE) return T.justNow;
  if (ms < HOUR) return `${plural(Math.floor(ms / MINUTE), 'minute', 'minutes')} ago`;
  if (ms < DAY) return `${plural(Math.floor(ms / HOUR), 'hour', 'hours')} ago`;
  return `${plural(Math.floor(ms / DAY), 'day', 'days')} ago`;
}

// Compares the current value with the row three months back (or the oldest row when there are fewer).
export function trendText(label, current, history, key) {
  if (!history.length) return `${label} ${current}`;
  const then = history[Math.max(0, history.length - 4)][key];
  if (current > then) return `${label} ${current}, ${T.upFrom} ${then}`;
  if (current < then) return `${label} ${current}, ${T.downFrom} ${then}`;
  return `${label} ${current}, ${T.steadyAt} ${then}`;
}

// Which way trendText's comparison went: 'up', 'down', 'steady', or null with no history.
export function trendDirection(current, history, key) {
  if (!history.length) return null;
  const then = history[Math.max(0, history.length - 4)][key];
  return current > then ? 'up' : current < then ? 'down' : 'steady';
}

const TREND_GLYPHS = { up: '▲', down: '▼' };

// The glyph is decoration (aria-hidden); the words carry the meaning, so colour is never the only signal.
function trendRow(label, current, history, key) {
  const dir = trendDirection(current, history, key);
  return el('li', { class: dir ? `trend-row ${dir}` : 'trend-row' }, [
    TREND_GLYPHS[dir] ? el('span', { class: `trend ${dir}`, 'aria-hidden': 'true', text: TREND_GLYPHS[dir] }) : null,
    el('span', { class: 'words', text: trendText(label, current, history, key) }),
  ]);
}

// The unfinished achievement nearest to done: the highest share of its count, ties to the earlier one in
// ACHIEVEMENTS. Recorded ones, ones already at their count, and ones not started are left out. Null if none.
export function closestAchievement(world) {
  const done = new Set(world.achievements || []);
  let best = null;
  for (const def of ACHIEVEMENTS) {
    if (done.has(def.id)) continue;
    const p = achievementProgress(world, def);
    if (p.n <= 0 || p.n >= p.of) continue;
    const share = p.n / p.of;
    if (!best || share > best.share) best = { def, n: p.n, of: p.of, share };
  }
  return best ? { def: best.def, n: best.n, of: best.of } : null;
}

function dailyRow(world, id) {
  const done = world.daily.done.includes(id);
  const p = dailyProgress(world, id);
  return el('li', { class: done ? 'goal done' : 'goal' }, [
    el('span', { class: 'text' }, [done ? el('span', { class: 'tick', 'aria-hidden': 'true', text: '✓ ' }) : null, DAILY_TEXT[id] || '']),
    el('span', { class: 'small muted', text: done ? T.doneLabel : progressOfText(p.n, p.of) }),
  ]);
}

export function welcomeSheet({ world, savedAt, lastSpeed, now = () => Date.now(), getAlerts = () => [], onView = () => {}, onCarryOn = () => {}, onStayPaused = () => {} }) {
  return (body) => {
    body.append(el('p', { text: dateText(dateParts(world)) }), el('p', { class: 'muted', text: `${T.lastPlayed} ${elapsedText(savedAt, now())}` }));
    body.append(el('ul', { class: 'trends' }, [
      trendRow(T.people, population(world), world.history, 'people'),
      trendRow(T.gold, world.gold, world.history, 'gold'),
      trendRow(T.mood, world.mood, world.history, 'mood'),
    ]));
    const goals = openGoals(world, 3);
    body.append(el('h3', { text: T.goals }), goals.length ? el('ul', { class: 'goals' }, goals.map((g) => el('li', { class: 'goal', text: g.text }))) : el('p', { class: 'muted', text: T.goalsNone }));
    if (world.daily) body.append(el('h3', { text: T.today }), el('ul', { class: 'goals today' }, world.daily.picks.map((id) => dailyRow(world, id))));
    const closest = guideActive(world) ? null : closestAchievement(world);   // achievements stay hidden while the guide runs
    if (closest) body.append(el('p', { class: 'closest', text: closestAchievementText(ACHIEVEMENT_NAMES[closest.def.id], closest.n, closest.of) }));
    const alerts = [...getAlerts()].sort((a, b) => Number(CRITICAL.has(b.code)) - Number(CRITICAL.has(a.code)));   // critical ones first (stable)
    body.append(el('h3', { text: T.alerts }));
    if (!alerts.length) body.append(el('p', { class: 'muted', text: T.noAlerts }));
    else body.append(el('ul', { class: 'alert-list' }, alerts.map((a) => { const t = alertText(a, world); return el('li', {}, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', onClick: () => onView(a) })]); })));
    body.append(el('div', { class: 'actions welcome-actions' }, [
      button(T.carryOn, { class: 'carry-on primary', onClick: () => onCarryOn(lastSpeed) }),
      button(T.stayPaused, { class: 'stay-paused', onClick: () => onStayPaused() }),
    ]));
  };
}
```

**3d. `css/ui.css`**: append:

```css
/* Welcome back trends (1d follow-up): an arrow column, then the words. Teal up, coral down, both beside words. */
#sheet .trends { list-style: none; padding-left: 0; }
.trends .trend-row { display: flex; align-items: baseline; gap: 6px; padding: 2px 0; }
.trends .trend { display: inline-block; width: 1.25em; text-align: center; }
.trends .trend.up { color: var(--teal); }
.trends .trend.down { color: var(--coral-text); }
.trends .trend-row:not(.up):not(.down) .words { margin-left: calc(1.25em + 6px); }
#sheet .closest { margin: 8px 0; }

/* Achievements at the end of the city summary (spec 3.8): name and condition on the left, progress on the right. */
#sheet .achievements { list-style: none; padding-left: 0; }
.achievements .achievement { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--parchment-2); }
.achievements .what { display: flex; flex-direction: column; min-width: 0; }
.achievements .status { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.ach-bar { display: inline-block; width: 64px; height: 8px; border-radius: 4px; background: var(--parchment); border: 1px solid var(--ink-soft); overflow: hidden; }
.ach-bar .fill { display: block; height: 100%; background: var(--teal); }
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui achievements sheet"`
Expected: `3 passed, 0 failed` and `ALL PASSED`.
Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui welcome back"`
Expected: `5 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

Check:

```powershell
git grep -n -e "'summary'" -e "trends" -e "T.goalsNone" -e "lastElementChild" -- tests
```

Nothing should need changing:
- `tests/ui/sheets.test.js` ("shows the summary ...") looks for `T.taxes` and `GOALS[0].text` in the summary. Both are still there. Its `makeTestWorld` city has the guide on, so the new section is one heading and the "once the guide is done" line.
- `tests/ui/carryovers.test.js` checks that `sheets.js` has no literal `row('X` labels and that the summary shows `T.grain`, `T.lasts`, `T.working` and `T.jobs`. The new code adds no `row(` calls.
- `tests/ui/a11y.test.js` opens the summary. The new rows have no buttons, and each progress bar has an `aria-label`.
- The existing welcome test still finds `People 8`, the first goal and the debt alert. A row with no history keeps the plain words and gets no glyph.

If a Task 11 or 12 test asserts that the summary's last element is the goals list or the mood rows, change it to look the section up by its heading instead, since Achievements is now last.

- [ ] **Step 6: Full suite**

Run: `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`, then `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ALL PASSED`.

- [ ] **Step 7: Commit**

```powershell
git add src/ui/sheets.js src/ui/welcomeBack.js src/ui/text.js css/ui.css sw-files.js tests/ui/achievementsSheet.test.js tests/ui/welcomeBack.test.js tests/all.js
git commit -m @'
List achievements on the city summary and add today's goals to Welcome back

Every achievement shows its exact condition and a progress bar, hidden while
the guide runs. Welcome back gains up and down arrows beside the trend words,
today's three goals with progress, and the achievement closest to done.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 17: Wrap-up: cache list, README, after screenshots and follow-ups

**Files:**
- Modify: `sw-files.js` (regenerated), `README.md` (what the game now does), `.gitignore` (already ignores `docs/superpowers/notes/screenshots/raw/`)
- Create: `docs/superpowers/notes/screenshots/early-game-pass-phone-portrait.png`, `-phone-landscape.png`, `-tablet.png`, `-laptop.png` (before/after contact sheets), `docs/superpowers/notes/2026-10-11-early-game-pass-followups.md`

**Interfaces:**
- Consumes: everything from Tasks 1-16.
- Produces: nothing new for code; the follow-ups note feeds Stage 2.

This task is done by the controller (it needs the before shots taken at the start of the session and the screenshot helper scripts in the session scratchpad).

- [ ] **Step 1: Regenerate the cache list and run the suite**

Run: `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1` then `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ALL PASSED`.

- [ ] **Step 2: Play the first ten minutes in the browser**

Serve with `python tests/serve.py 8000 .` and open `http://127.0.0.1:8000/?nosw=1` in the built-in browser at 390x844. Start a new city and check, in order: the road card is suggested and the rest dimmed; Show me lands the ghost on a free tile; laying a road while paused completes the goal and celebrates; plots while paused bring the Play tip; Play brings families (first family celebration); a well shows "Gives water to N homes"; the food goal suggests farm, then granary, then bazaar; fields grow; the granary fills; the temple finishes the guide with "You've got the basics"; the house sheet names causes with Show me; the summary lists achievements; after the temple, Today shows three goals; idling 45 s glows Show me. Note anything wrong in the follow-ups file (Step 5) or fix it here if it is a one-line fix with a test.

- [ ] **Step 3: Take the after screenshots and build the contact sheets**

Run the session's `shots.ps1 -Tag after` (same six scenarios and four sizes as the before set), then `python contact.py docs/superpowers/notes/screenshots/raw docs/superpowers/notes/screenshots early-game-pass before after`. Look at all four sheets; anything broken at a size is fixed before the commit.

- [ ] **Step 4: README**

In `README.md`, under the description of what the game does, add a short paragraph: a guided start you can skip, goals with Show me that keep coming, daily goals without streaks, achievements on the city summary, and the Help setting (Guide and tips, Tips only, Off).

- [ ] **Step 5: Follow-ups note**

Write `docs/superpowers/notes/2026-10-11-early-game-pass-followups.md`: carried-over review findings that did not block the merge, the play-test notes from Step 2, and what Stage 2 must extend (new goals and firsts for each good, achievements for the new tiers, tips for desirability and trade, "New" badges, problem markers for the new alert codes, thumbnails and tints for the new buildings).

- [ ] **Step 6: Full suite and commit**

Run: `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1` then `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ALL PASSED`.

```powershell
git add sw-files.js README.md docs/superpowers/notes/screenshots/early-game-pass-*.png docs/superpowers/notes/2026-10-11-early-game-pass-followups.md
git commit -m @'
Wrap up the early-game pass: README, before and after screenshots, follow-ups

Contact sheets at the four sizes compare the title card, a fresh city,
placing a well, the house checklist, the summary and Welcome back.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

