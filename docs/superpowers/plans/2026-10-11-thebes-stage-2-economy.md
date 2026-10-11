# Thebes Stage 2: Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the village into an economy: figs, pottery, beer, linen and jewellery chains with workshops and a storehouse; housing tiers 5 to 9 with 2×2 merges, desirability and hysteresis; the booth and entertainment; a trading post with two partners; milestones up to Capital; goods, entertainment and desirability overlays; difficulty; and the early-game mechanics extended to all of it.

**Architecture:** Data first (`src/data`: goods, buildings, tiers, desirability, trade, difficulty), then the sim, generalised rather than forked: production with inputs and storage chosen by good, distribution of many goods, a desirability field, tiers 5-9 with merges in a new `merge.js`, trade in `trade.js`, costs scaled by difficulty in `costs.js`, all behind `WORLD_VERSION` 3. Then art for the new buildings and tiers, then the interface (cards and sheets, the trading post sheet, the house sheet, overlays and the placement preview, difficulty), then balance with a long-run test to Capital.

**Tech Stack:** HTML + CSS + JavaScript ES modules, Canvas 2D, the in-house test harness in headless Edge (`tests/run-tests.ps1`), `tests/serve.py`, PowerShell tools.

**Spec:** `docs/superpowers/specs/2026-10-09-thebes-design.md`, sections 4.1, 4.6-4.8, 4.10, 4.11, 4.14, 4.15, 4.18, 5.3, 6.3 and 10 (revised 11 Oct 2026 for Stage 2). Background: `docs/superpowers/notes/2026-10-11-pharaoh-heaven-review.md` (section 5 answered), `docs/superpowers/notes/2026-10-11-city-builder-research.md` (section 8), `docs/superpowers/specs/2026-10-11-thebes-early-game-pass-design.md` (the mechanisms Stage 2 extends), `docs/superpowers/notes/2026-10-11-early-game-pass-followups.md`.

**Out of scope:** fire, raids, defences, monuments, quarry, brickworks, the builders' guild, festivals, scribes, river floods, missions.

## Global Constraints

- No build step, no npm, no frameworks, no third-party code. Plain ES modules, plain CSS in `css/ui.css`. Targets: iOS Safari 16+, current Android Chrome, desktop Chrome, Edge, Firefox, Safari.
- The sim stays deterministic: no wall clock, no `Math.random`, no storage or DOM in `src/sim`; all randomness (price drift) from `src/sim/rng.js` seeded by the world.
- The UI changes the world only through sim functions (commands, `settle`, `setGuide`, `startDaily`, `swapDaily`, and this plan's `setAccept`, `openRoute`, `setTradeOrder`).
- `WORLD_VERSION` goes from 2 to 3 in Task 1 with a migration; nothing else changes the save shape.
- **No upgrade lowers capacity or tax per tile** (data test). **No arbitrage**: no partner sells a good for less than 1.25× what any partner pays for it (data test).
- Spec 6.1 binds every new control and row: real buttons with labels, 44 px targets, 4.5:1 text, nothing over the middle of the map, one panel at a time, Back closes one step, meaning never by colour alone. Spec 5.4: motion respects reduced motion.
- The house sheet never says something false: every new cause code agrees with the sim's own rule (the invariant test from the pass extends to the new needs).
- Copy: plain English, sentence case; every player-facing string in `src/ui/text.js`; "Pharaoh" never appears.
- Commit identity for this repo only: `Joshua Hedge <181878008+joshuahedge@users.noreply.github.com>` (check `git config --local user.email`). Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- LF line endings, UTF-8 without BOM. Run from `C:\dev\thebes`. The suite is `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` and must end with `ALL PASSED` before every commit. After editing any cached file (`src/`, `css/`, `index.html`), run `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1` first.
- No `git push`. Work on the branch `stage-2-economy`; the controller merges to `main` locally.

## File Structure

```
src/data/goods.js            MODIFY: ten goods with kinds; FOOD_GOODS, HOUSEHOLD_GOODS, RAW_GOODS
src/data/buildings.js        MODIFY: fourteen buildings; granary stores, bazaar sells and per-good stock
src/data/housing.js          MODIFY: tiers 5-9 with needs, size and desirability rise/keep
src/data/progression.js      MODIFY: milestones to Capital with economy unlocks
src/data/desirability.js     NEW: DESIRABILITY, HOUSE_DESIRABILITY
src/data/trade.js            NEW: PARTNERS, CARAVAN_EVERY_MONTHS, PRICE_DRIFT, TRADE_REACH, ARBITRAGE_MARGIN
src/data/difficulty.js       NEW: DIFFICULTIES, DIFFICULTY_ORDER
src/data/goals.js, firsts.js, achievements.js, daily.js, tips.js   MODIFY: Stage 2 additions
src/data/ui.js               MODIFY: categories, overlays, auto overlays
src/sim/world.js             MODIFY: WORLD_VERSION 3; difficulty, trade, newItems, tally additions
src/sim/costs.js             NEW: costOf, roadCostOf, routeCostOf
src/sim/production.js        MODIFY: workshops with inputs, storage by good, storeAccepts
src/sim/distribution.js      MODIFY: many goods, two foods
src/sim/desirability.js      NEW: field, house score, contributors, preview
src/sim/merge.js             NEW: mergeSquare, mergeHouses, splitHouse
src/sim/housing.js           MODIFY: tiers 5-9 needs, hysteresis, merges, houseStatus, needCause
src/sim/trade.js             NEW: openRoute, setTradeOrder, tradeMonth, tradePrices, nextCaravanDay, postConnected
src/sim/commands.js          MODIFY: costs; setAccept
src/sim/clock.js             MODIFY: tradeMonth in runMonth
src/sim/progression.js       MODIFY: newItems on a milestone
src/save/migrate.js, serialize.js   MODIFY: v2 -> v3
src/render/art/housing.js    MODIFY: tiers 5-9
src/render/art/services.js, art/industry.js (NEW), art/stages.js, art/registry.js   MODIFY/NEW: new buildings and stages
src/ui/...                   MODIFY: cards, sheets (workshop, storehouse, house, summary), trade sheet (NEW src/ui/tradeSheet.js), overlays, placement preview, title card difficulty, text.js
tests/...                    one new test file per new module, listed in tests/all.js
```

## Conventions every task relies on

- Tests use `describe`/`it`/`expect` from `tests/harness.js` (`toBe`, `toEqual`, `toBeTruthy`, `toBeFalsy`, `toBeGreaterThan`, `toBeGreaterThanOrEqual`, `toBeLessThan`, `toBeLessThanOrEqual`, `toContain`, `toThrow`); every new test file is imported in `tests/all.js`.
- Sim fixtures: `makeTestWorld({ size, fertile, gold })`, `setRoad`, `addRaw`, `staffAll` (`tests/helpers/testWorld.js`); UI fixtures: `rigUI({ width, height, hooks, welcome, sfx, clock, now, world, settings })` (`tests/helpers/uiWorld.js`). Always clean up in `try/finally`.
- The pass's mechanisms you extend: goals data and `goalMet` kinds (`src/sim/goals.js`), `FIRSTS`/`firstMet`, `ACHIEVEMENTS`/`achievementProgress`, `DAILY_POOL`/`dailyMeasure`, `TIPS`, `needCause` and `CAUSE_TEXT`/`CAUSE_FIX` (the house sheet), `problemMarkers`, `drawThumb`, `CATEGORY_TINT`, celebrations (`cheerFor` in createUI), `settle`.
- Sim events are plain objects pushed into an optional `events` array.

## Interfaces between tasks (the contract)

Every task implements its part exactly; later tasks rely on these names and shapes.

### World version 3, difficulty and costs (Task 1)
- `WORLD_VERSION = 3`. `createWorld({ seed, size, map, difficulty = 'normal' })` adds `difficulty` (a key of `DIFFICULTIES`), `trade: { routes: {}, orders: {}, drift: {}, used: {}, year: 1 }`, `newItems: []`, and `tally` gains `made: {}` (good → units produced), `sold: 0`, `bought: 0`, `tradeIncome: 0`, `caravans: 0`.
- `MIGRATIONS[2](w)` → a new object with `version: 3`, `difficulty: 'normal'`, the `trade` defaults, `newItems: []`, and the four tally additions (zeros, `made: {}`); everything else unchanged. `validateWorld` checks each new field's type.
- `src/data/difficulty.js`: `DIFFICULTIES = { relaxed: { cost: 0.8, risk: 0.5 }, normal: { cost: 1, risk: 1 }, hard: { cost: 1.25, risk: 1.5 } }`, `DIFFICULTY_ORDER = ['relaxed', 'normal', 'hard']`.
- `src/sim/costs.js`: `costOf(world, type)` = `Math.max(1, Math.round(BUILDINGS[type].cost * DIFFICULTIES[world.difficulty].cost))`; `roadCostOf(world)` likewise from `ECONOMY.roadCost`; `routeCostOf(world, partnerId)` likewise from the partner's `routeCost`. `place`, `drawRoad`, `paintHouses`, their previews, `canPlace` and `demolishRefundFor` use them; undo refunds the cost it recorded. Cards and the confirm bar show the scaled cost.
- Settings gain `difficulty` (a `DIFFICULTY_ORDER` key, default `'normal'`); `boot.js` creates a new city with `settings.get().difficulty` (Task 16 adds the controls).

### Data (Task 2)
- `GOODS`: `grain`, `figs` (`kind: 'food'`, `perResidentPerMonth: 0.25`), `pottery` (0.05), `beer` (0.05), `linen` (0.04), `jewellery` (0.03) (`kind: 'household'`), `clay`, `barley`, `flax`, `gems` (`kind: 'raw'`); each `{ name, kind, perResidentPerMonth? }`. `FOOD_GOODS`, `HOUSEHOLD_GOODS`, `RAW_GOODS` derived.
- `BUILDINGS` adds `garden`, `statue` (1×1, no workers, no road needed, category homes), `farm_fig` (2×2, fertile, produces figs 24/month, priority essential, food), `clay_pit` (2×2, produces clay 40), `potter` (2×2, produces pottery 30, `consumes: 'clay'`), `storehouse` (2×2, `stores` = every non-food good, `capacity: 800`), `booth` (1×1, `provides: 'entertainment'`, `reach: 8`, `points: 10`, priority services), `trading_post` (2×2), `farm_barley` (2×2, fertile, barley 30), `brewery` (beer 25, consumes barley), `farm_flax` (2×2, fertile, flax 24), `weaver` (linen 20, consumes flax), `gem_mine` (2×2, rocky, gems 15), `jeweller` (2×2, jewellery 15, consumes gems). Workers, costs and upkeep as in the task. `granary.stores = ['grain', 'figs']`; `bazaar.sells` = the six food and household goods with a per-good `stock` capacity map (`grain: 300`, `figs: 200`, others 100).
- `TIERS` 5-9 per spec 4.6 with `needs` (5 adds `pottery`; 6 `entertainment`; 7 `beer`, `twoFoods`; 8 `linen`; 9 `jewellery`), `size` 1 or 2, and `desirability: { rise, keep }` for 6-9 (20/15, 35/29, 50/43, 65/57).
- `MILESTONES`: village (adds `garden`), town 150, market_town 250, city 400, great_city 650, capital 1000 with the spec 4.14 economy unlocks (later-stage buildings are not listed until their stage).
- `src/data/desirability.js`: `DESIRABILITY` (type → values by distance 1..6, spec 4.7) and `HOUSE_DESIRABILITY` (tier → values).
- `src/data/trade.js`: `PARTNERS` (Memphis at market_town, 300 gold; Byblos at great_city, 600 gold; `buys`/`sells` maps good → `{ price, quota }`; `gift: { good, n: 40 }`), `CARAVAN_EVERY_MONTHS = 3`, `PRICE_DRIFT = 0.1`, `TRADE_REACH = 16`, `ARBITRAGE_MARGIN = 1.25`.
- Data tests: tiers' capacity and tax per tile never fall; no arbitrage at the margin; every unlock, desirability key and good reference exists.

### Production and storage (Task 3)
- `storeAccepts(b, good)`: the building stores the good and, for a storehouse, `b.accepts[good] !== false`. `makeBuilding` gives a storehouse `accepts: {}`.
- `produceDay`: a producer with `consumes` needs that good in a store within `producerReach` (else `blocked = 'no_input'`); output goes to the nearest working store with space that accepts it (else `'no_storage'`); each unit made takes one input from the nearest store holding it, adds `tally.made[good]`, and still adds `tally.harvested` for food.
- Command `setAccept(world, id, good, accept)` → `{ ok: true }`, or `{ ok: false, reason: 'nothing_here' | 'not_storage' }`.
- Alerts: `no_input` (with `id`) and `storage_full` for any store.

### Distribution (Task 4)
- `restockBazaars`: each good the bazaar sells, up to `stock[good]`, from stores within `supplyReach`.
- `wantedGoods(house)` covers foods and every household good the house's current or next tier needs. A house that wants two foods tops up half its food need from each food and fills any gap from whichever is there. Household goods meet their need when the stock covers the month's use at the monthly check.
- `met.twoFoods` is true when grain and figs were both in stock before the month's eating.

### Desirability (Task 5)
- `desirabilityField(world)` → `Float32Array` of `size²`, memoised per world on a signature of the buildings; every non-road building (houses by tier) adds its values by Chebyshev distance from its footprint (1 = touching), never on its own footprint.
- `desirabilityAt(world, x, y)`; `houseDesirability(world, house)` = the best tile of its footprint; `desirabilityContributors(world, house, n = 3)` → `[{ id, type, value }]` by size of effect; `desirabilityPreview(world, type, x, y)` → `{ better, worse, tiles: [{ x, y, v }] }` for a building not yet placed.

### Tiers 5-9, merges, causes (Task 6)
- The monthly housing check adds the needs `pottery`, `entertainment` (`coveredBy(world, house, 'entertainment')`), `beer`, `twoFoods`, `linen`, `jewellery`, and desirability: rising to tier 6+ needs `houseDesirability >= rise`; holding needs `>= keep`; below `keep` starts the downgrade timer like an unmet need.
- `src/sim/merge.js`: `mergeSquare(world, house)` → the square's origin `{ x, y }` or `null` (spec 4.6 rules and order); `mergeHouses(world, house, origin)` → the merged house (removes the other three, combines residents and stock, keeps the lowest id); `splitHouse(world, house)` → four tier-5 houses with residents shared out.
- `houseStatus` lists the new needs, a `desirability` row `{ need: 'desirability', met, value, target }`, and `merge: { needed: boolean, ready: boolean }` for tier 5.
- `needCause` gains: `no_good` (`{ code, good, id: bazaar }`: the bazaar reaching the home has none of a household good), `good_unmade` (`{ code, good, id: bazaar }`: and no store within its supply reach holds it), the booth codes `no_booth`, `booth_idle`, `booth_no_road`, and `low_desirability` (`{ code, value, target }`); and for tier 5 `no_square` when no 2×2 square can form.
- Events: `{ type: 'merge', id }` and `{ type: 'split', id }` besides upgrade/downgrade.

### Trade (Task 7)
- Commands: `openRoute(world, partnerId)` (unlocked partner, a trading post exists, gold for `routeCostOf`) and `setTradeOrder(world, good, mode, keep)` (`mode` in `'buy' | 'sell' | 'ignore'`, `keep` an integer ≥ 0).
- `tradeMonth(world, events)` runs in `runMonth`: on caravan months each open route sends a caravan if a working trading post is joined by road to the trade entry; it brings the first-caravan gift, then sells and buys per the orders with per-visit caps of a quarter of the yearly quota, never below 0 gold, using stores within `TRADE_REACH` of the post; pushes `{ type: 'caravan', partner, sold: { good: n }, bought: { good: n }, income }`; updates `tally.sold`, `tally.bought`, `tally.tradeIncome`, `tally.caravans`. A new year resets `used` and redraws `drift` (seeded by world seed and year) within ±`PRICE_DRIFT`.
- `tradePrices(world, partnerId)` → `{ buys: { good: price }, sells: { good: price } }`; `nextCaravanDay(world)`; `postConnected(world)`.

### Goals, firsts, achievements, daily goals, tips (Task 8)
- `GOALS` continue after `town` (chapters `goods` and `grand`): pottery chain, 8 Townhouses, a booth and two gardens, a Manor, Market town, a trade route, City, the beer chain plus a fig orchard, 2 Fine manors, Great city, the linen chain, 2 Villas, Capital, the jewellery chain, an Estate. New need kind `routes` (open routes).
- `FIRSTS` add pottery made (new check kind `made` `{ good, n }`), Townhouse, Manor, first caravan, Fine manor, Villa, Estate. `ACHIEVEMENTS` add eight (pottery made 500, trade income 2,000, 20 Townhouses, 5 Manors, 20 gardens, 10 statues, an Estate, 1,000 people) with measure kind `made`. `DAILY_POOL` adds five (30 pottery, 3 gardens, sell 20 goods, a statue, a booth). `TIPS` add four (desirability, storehouse choices, trade, merges).

### Art (Tasks 9-11)
- Slots `house.t5` … `house.t9` (6-9 are 2×2), `garden`, `statue`, `booth`, `farm_fig.g0-3`, `farm_barley.g0-3`, `farm_flax.g0-3` (plain slots kept), `clay_pit`, `potter`, `brewery`, `weaver`, `gem_mine`, `jeweller`, `storehouse.s0-3` (plain kept), `trading_post`. `stages.js` gains `storehouseStage(b)` and generalises `farmStage` to every farm. `slotFor` maps them.

### Interface (Tasks 12-16)
- Categories: homes `house, garden, statue`; food `farm_grain, farm_fig, granary`; industry `clay_pit, potter, farm_barley, brewery, farm_flax, weaver, gem_mine, jeweller, storehouse, trading_post`; services `well, bazaar, temple, booth`. A category shows when it has an unlocked item or one in the next milestone; locked cards show only for the next milestone. `world.newItems` gets a milestone's unlocks; placing one removes it; cards show "New".
- Sheets: workshop status line, stock rows with good names, storehouse accept switches (`setAccept`), a Trade button on the trading post opening the trade sheet (routes, per-good price/mode/keep, next caravan), house sheet rows for the new needs and the desirability breakdown, merge line for tier 5; summary: goods made vs used last month, trade income, difficulty.
- Overlays: `goods`, `entertainment`, `desirability` (graded, six steps with a legend). Placement: a desirability tint around the ghost and a confirm-bar line "Makes N homes nicer" / "Makes N homes less pleasant".
- Difficulty: three choices under New city on the title card, a Settings row for new cities, the level in the summary.
- Celebrations and tips extended for caravans, merges, new firsts and achievements.

## How to run tests

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "trade"
```

Expected at the end of every task: `ALL PASSED`. A task that edits a cached file runs `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1` before the full run.

---

## Contract notes and controller rulings

The tasks below were drafted by six writers working in parallel. Each writer ran its own tasks' code on a scratch copy of the repo (with stand-ins for earlier tasks where those were not yet written), so the code is tested, but **before-blocks were written against slightly different bases**. When a before-block does not match because an earlier task already changed those lines, keep the earlier task's lines and apply only this task's change; when a test count in a step differs, what matters is `ALL PASSED`. The controller's rulings below bind where they differ from a task's text.

### Rulings that change task text
- **Goods causes (Tasks 6 and 14):** household goods and the second food follow the food codes' pattern: `next_delivery { code, id: bazaar, good }` when a working bazaar in reach has the good or a store in its supply reach holds some; `good_unmade { good, id: bazaar }` when stores for the good lie in that reach but none holds any; `no_good { good, id: bazaar }` when no store for the good lies in that reach. Task 6 carries a ruling block with the exact `goodCause`; Task 14's words already read this way.
- **Food mix (Task 4):** a home that does not want two foods tops up from the food its bazaar holds most of first (ties: grain), then fills any gap from the other. Two-food homes keep the half-and-half rule.
- **Bazaar stock (Task 2):** grain 300, figs 200, each household good 100, as the contract says; spec 4.10 is amended to match.
- **Desirability legend (Task 15):** a coral-hatched band below zero plus five single-hue steps whose thresholds are the tiers' rise values; spec 4.7 is amended to match.
- **Words for Task 8's additions:** Task 8 writes the final words for its firsts, achievements, daily goals, tips and chapters; Tasks 12-14 skip any addition of the same keys.
- **`'rocky'` Show me target (Task 12):** `showMeTarget` aims the jewellery goal at the rocky tile nearest the city's focus.
- **`DIFFICULTY_NAMES` and `T.difficulty`:** Task 14 adds them; Task 16 reuses them (a second export breaks `text.js`).
- **Transient state:** between Task 6 and Task 14 the house sheet of a home at tier 4 or above can throw (no words for the new causes yet). Visual checks in Tasks 9-13 never open such a sheet. The branch is merged only after Task 18.

### The writers' contract notes

**Tasks 1-2:**

- `routeCostOf(world, partnerId)` is listed under Task 1, but it reads the partner's `routeCost` from `src/data/trade.js`, which Task 2 creates. Task 1 creates `src/sim/costs.js` with `costOf` and `roadCostOf`; Task 2 adds `routeCostOf` to the same file with the same rule (`Math.max(1, Math.round(base * DIFFICULTIES[world.difficulty].cost))`). Its first user, Task 7, runs after Task 2, so nothing downstream changes.
- `demolishRefundFor` now takes the world: `demolishRefundFor(world, b)` (it was `demolishRefundFor(b)`), because the refund is a quarter of the city's scaled cost. Only `src/sim/commands.js` calls it.
- Spec 4.10 says bazaars restock "up to 200 of each good"; the contract gives a per-good `stock` of grain 300, figs 200 and 100 for each household good. The spec normally wins, but here the contract is the more specific and the later text, every other Stage 2 writer builds on its numbers (Task 4 restocks to `stock[good]`), and grain 300 is Stage 1's own cap, so Stage 1 does not change. Task 2 uses the contract's numbers. If the controller prefers the spec, it is one line in `src/data/buildings.js` (`stock`) plus the matching line in `tests/data/economyData.test.js`.
- The contract does not name the partner fields beyond `routeCost`, `buys`, `sells` and `gift`. Task 2 uses `PARTNERS[id] = { name, milestone, routeCost, buys, sells, gift }`, where `milestone` is the milestone id that unlocks the partner (`'market_town'`, `'great_city'`). Tasks 7 and 13 should read `milestone` for "unlocked partner".
- The Task 2 brief says "nothing new is placeable before Town", but the contract and spec 4.14 put the garden in Village's unlocks. Task 2 follows the contract: the sim lets a Village place a garden; it has no build card until Task 12 adds it to the Homes category, so the dock a player sees is unchanged until then.
- Task 2 changes two lines of sim code outside `src/data`, because the new data would otherwise break Stage 1: `produceDay` in `src/sim/production.js` tests `GOODS[good].kind === 'food'` (the contract's goods shape has no `food: true` flag any more), and `placementWarnings` in `src/sim/commands.js` warns `needs_road` only for housing plots (gardens and statues need no road; before Stage 2 the plot was the only building with `needsRoad: false`, so Stage 1 behaves exactly as before). Task 3's before-block for `produceDay` must show the new `kind === 'food'` line.
- The bazaar keeps `capacity: 300` beside its new `stock` map: the stall art (`bazaarStage`) reads it, and `restockBazaars` still caps each good at it until Task 4 switches restocking to `stock[good]`.
- Small additions the contract leaves open: `src/sim/world.js` also exports `newTradeState()` (the starting `trade` object, used by the v2 to v3 migration); `createWorld` starts a Normal city for any `difficulty` that is not a `DIFFICULTIES` key; `HOUSE_DESIRABILITY` is an array indexed by tier like `TIERS` (index 0, an empty plot, is `[]`; a Cottage is `[0]`).

**Tasks 3-5:**

- Task 4 owns how household goods and two foods are judged at the monthly check (the Distribution contract: "Household goods meet their need when the stock covers the month's use at the monthly check", "`met.twoFoods` is true when..."). So Task 4 sets `house.met.pottery`, `.beer`, `.linen`, `.jewellery` (for each household good the home's current or next tier needs, consuming the month's use) and `house.met.twoFoods` inside `monthlyHousing`. Task 6 adds `entertainment`, desirability, hysteresis, merges and the `houseStatus`/`needCause` side; it should not consume household goods a second time. Because the tier rise check is already data-driven (`needsOf(next).every((n) => met[n])`), a House with a month of pottery becomes a Townhouse from Task 4 on; tier 6 stays out of reach until Task 6 sets `met.entertainment`.
- `houseDesirability(world, house, field)` takes an optional third argument, a field from `desirabilityField(world)`. Checking the memo costs one pass over the buildings (about 50 microseconds in a full 64x64 city), and an upgrade part-way through the monthly loop would rebuild the field for the next home. Task 6 should take `const field = desirabilityField(world)` once before its loop and pass it, so every home is judged on the start-of-month field (cheap and independent of loop order). Additive: the two-argument call still works.
- `topUpHouse(world, house, goods, bazaars, { twoFoods })` takes an options argument: distribution.js cannot import housing.js's `wantedNeeds` without an import cycle, so `monthlyHousing` passes `wantedNeeds(h).includes('twoFoods')`. Additive: the four-argument call behaves as before.
- Task 4 narrows `graneriesFor` in housing.js (the empty-granary branch of `needCause` for food) to stores of a food, because since Task 2 the bazaar also sells household goods and a nearer storehouse was being named as "the granary". Task 6's `no_good` / `good_unmade` causes need their own lookup of the stores within the bazaar's supply reach that hold the household good; they should not widen `graneriesFor` again.
- `setAccept` returns `{ ok: true, warnings: [] }` or `{ ok: false, reason, warnings: [] }`, the shape every command already returns (`fail()` in commands.js); the contract's `{ ok: true }` / `{ ok: false, reason }` are read through `.ok` and `.reason`, so nothing downstream changes.

**Tasks 6-8:**

These three tasks were run, not predicted: they were applied in order on a copy of the repo carrying the finished Task 1-2 code (`s2n-t01t02`) and Task 3-5 code (`s2n-t03t05`), whose own suite passed with 779 tests, and the full suite passed after each task (793, 802 and 809 tests). The test counts below assume that base; with other Task 1-5 test files the totals move, but every task must end with `ALL PASSED`.

- Merge and split events. A merge pushes `{ type: 'merge', id }` then `{ type: 'upgrade', id, from: 5, to: 6 }`, both with the merged home's id: the lowest id of the four plots, which the merged home keeps. A Manor that drops a tier pushes `{ type: 'downgrade', id, from: 6, to: 5 }` then `{ type: 'split', id }`; the id stays on the north-west plot and the other three plots are new buildings. `mergeHouses` returns the Manor already at tier 6 (or null when the square at that origin cannot form); `splitHouse` returns the four plots NW, NE, SW, SE. `src/sim/merge.js` also exports `MERGE_TIER` (6, the first tier with size 2).
- houseStatus additions. The desirability row is `{ need: 'desirability', met, value, target, keep }` (`keep` is the home's own "to keep" value, null for a Townhouse), present from the Townhouse up; for the Estate, which has no tier to rise to, `target` is its own "to keep" (57). `merge` is returned for every home as `{ needed: tier === 5, ready }`. A home below its tier's "to keep" has `'desirability'` in `missingNow`. `housing.js` also exports `desirabilityTarget(tier)`.
- needCause additions. `'merge'` and `'desirability'` are needs `needCause` knows: `needCause(world, house, 'merge')` is `{ code: 'no_square', id: null }` for a Townhouse with no 2x2 square to join (null otherwise), and low desirability is `{ code: 'low_desirability', id: null, value, target }` (the `id` keeps the shape of every other cause). Neither blames a missing road. Household goods and `twoFoods` take the bazaar steps (`no_bazaar`, `bazaar_no_road`, `bazaar_idle`), then, read literally from the contract and matching Task 14's wording: `next_delivery` `{ code, id: bazaar, good }` when a working bazaar in reach has the good (food's own `next_delivery` stays `{ code, id }`), `no_good` when none has any yet but a store within its supply reach does (the bazaar restocks at the month's end), and `good_unmade` when no store within that reach holds any. `twoFoods` is traced through the first food the home has none of, so its codes carry `good: 'figs'` as a rule. The booth codes are `no_booth`, `booth_idle` and `booth_no_road`.
- A 2x2 home whose residents all leave (low mood, or no road) splits into four empty plots, so no empty or hut-sized home ever has a 2x2 footprint. Besides `monthlyHousing` this needs one line in `departures` in `src/sim/immigration.js`, a file the File Structure does not list under Task 6.
- Until Task 14 lands, the house sheet has no words for the new needs: `NEED_NAMES` lacks them, and today's `causeText` throws on a code it does not know (`CAUSE_TEXT[code].paused`), so between Task 6 and Task 14 opening the sheet of a House whose pottery is made nowhere (`good_unmade`) throws. No test opens such a sheet; Task 14's `causeText` returns null for unknown codes and adds every word. Visual checks in Tasks 9-13 should not open the sheet of a home at tier 4 or above.
- Trade extras (Task 7). The caravan event also carries `spent` (gold paid for purchases) and `gift` (`{ good, n }` on a route's first caravan, `n` being what fitted in the stores; null afterwards) beside the contract's `{ type, partner, sold, bought, income }`; `income` is sales only. `openRoute` returns `{ ok: true, cost, warnings }`, warning `'not_connected'` when no trading post is joined to the trade entry yet, or fails with `unknown_partner`, `already_open` (Task 13's word), `locked`, `no_post` or `no_gold`; `setTradeOrder` fails with `unknown_good`, `bad_mode` or `bad_keep`. Extra exports: `openRoutes(world)` (the number of open routes; Task 8 uses it), `activePost(world)`, `partnerUnlocked(world, id)`, `drawDrift(seed, year)` and `TRADE_MODES`. Inside `world.trade`: `routes[id] = { since: day, gifted }`, `orders[good] = { mode, keep }`, `drift[id][good]` a fraction within ±0.1 (absent means 0), `used[id][good]` units traded this year.
- Caravans keep one city-wide calendar: every open route's caravan comes at the end of every third month (days 90, 180, ...), as `nextCaravanDay(world)` without a partner argument implies, so a route opened just before a caravan month gets its first caravan at once. The level to keep counts the units in stores within `TRADE_REACH` of the post. `postConnected(world)` is true when any trading post, working or not, is joined by road to the trade entry tile; a caravan also needs that post to be working. `tradeMonth` runs in `runMonth` right after `monthlyEconomy`, so a month's caravan is not in `stats.lastMonth` (Task 14's `recordGoodsMonth`, which runs after both, sees it).
- Task 8 adds the final player-facing words for its own additions to `src/ui/text.js` (`FIRST_TEXT`, `ACHIEVEMENT_NAMES`, the conditions for `made` and the new tallies, `DAILY_TEXT`, `TIP_TEXT`, `CHAPTER_NAMES`), not placeholders: existing tests demand words for every first, achievement, daily goal, tip and chapter, and measure them (two-line captions and three-line tips at 150% text on a 360 px phone). Ids, triggers and wording are taken from the Task 12-14 writer's stand-ins and Task 14's text (achievements `merchant_city`, `townhouse_terrace`, `manor_row`, `sculpture_garden`, `estate_life`; tips `nicer_streets`/`desirabilityShown`, `storehouse_choices`/`storehousePlaced`, `trade_orders`/`tradingPostPlaced`, `merging_homes`/`townhouseSheet`), except that `merging_homes` is shortened to fit three lines. Tasks 12-14 must therefore not add these keys again (their "STAND-IN Task 8" before-blocks are done by Task 8, as is the plural fix in `achievementCondition`'s `'tier'` case); they still fire the four tip triggers.
- Stage 2 goal texts are shorter than the spec's example ("Your homes now want pottery: build a clay pit and a potter"): a goal's caption must fit two lines on a 360 px phone at 150% text (`celebrate.test.js`), about 36 characters. Needs still arrive one at a time through the order of the goals, the first's words ("Townhouses need pottery") and the house sheet.
- Daily pool entries gain two optional fields, `from` (a milestone id that must be reached) and `routes` (open trade routes needed). All five Stage 2 daily goals wait for Town, and selling also needs a route, so a village's daily draws are exactly as before.
- The jewellery goal's Show me uses a new target `'rocky'` (gem mines need rocky ground). `showMeTarget` sends a target it does not know to the city's focus, so this is safe now; an interface task may aim it at the nearest rocky tile.
- `goalsV2.test.js` checks that every goal's Show me item is in its category. Until Task 12 puts the Stage 2 buildings into `CATEGORIES`, Task 8 adds the contract's planned category lists to that check as `PLANNED`; Task 12 can delete it once `CATEGORIES` has them.

Risks the Tasks 6-8 writer listed:

- Task 6's before-blocks assume Task 4 as planned (`needToMeet`, `consumeGood`, the `twoFoods` line, food-only `graneriesFor`) and Task 5's `houseDesirability(world, house, field)`. If either landed differently, keep its lines and change only the blocks shown; never consume household goods a second time.
- The upper-tier tests assert exact desirability values (16, 8, 22) built from spec 4.7's garden and statue numbers, with empty plots adding nothing. If Task 2 or 5 tunes those numbers, adjust the statue and garden places in the test, not the expectations' meaning.
- Between Task 6 and Task 14 a house sheet of a home at tier 4 or above can throw (no words for the new causes yet; see the CONTRACT NOTE). Do not open one in Tasks 9-13 visual checks.
- `tradeMonth` and the year's drift run in every month end from Task 7 on; a long-run or determinism test that compares a world to a stored fixture past day 360 would see `trade.drift` filled (none does today).
- Task 8's words and ids overlap Tasks 12-14's plan text: apply Task 8's, then treat any later "STAND-IN Task 8" before-block for the same key as already done.

**Tasks 9-11:**

These three tasks were run, not predicted: their code was applied to a scratch copy of the repo (with stand-ins for Task 2's `BUILDINGS` and `GOODS` entries, exactly as the contract gives them), the full suite ended `ALL PASSED` (693 tests) after Task 11, and also after Task 9 alone and after Tasks 9 and 10; every drawing was screenshotted at zoom 1 and 2 on its own and in a running game, and adjusted until it read clearly. Pixel tests sample at scale 2 (zoom 1 on a 1x screen), in device pixels, at points chosen clear of anything drawn over them.

- none blocking. Two choices the contract leaves open are settled here and later tasks can rely on them: (1) the garden, statue, booth and the three new farms live in `src/render/art/services.js` (beside the grain farm they share code with) and the workshops, storehouse and trading post in the new `src/render/art/industry.js`; (2) emblem colours: `SERVICE_EMBLEM.farm_fig` is the grain farm's green, `SERVICE_EMBLEM.booth` is `PINK`, and every industry building (including the barley and flax farms) flies a pennant in a new palette constant `INDUSTRY_TINT = '#8E7470'`, equal to `CATEGORY_TINT.industry` (a test pins the two together). Task 15 may want to colour the entertainment overlay with `SERVICE_EMBLEM.booth`.

**Tasks 12-14:**

- Tasks 12-14 wire the four Stage 2 tips and own their words, assuming Task 8's `TIPS` entries `{ id: 'storehouse_choices', trigger: 'storehousePlaced' }`, `{ id: 'trade_orders', trigger: 'tradingPostPlaced' }`, `{ id: 'nicer_streets', trigger: 'desirabilityShown' }` and `{ id: 'merging_homes', trigger: 'townhouseSheet' }` (all `priority: false`). The tests find each tip by its trigger, so only the trigger strings must agree; if Task 8 chose other ids, put the `TIP_TEXT` words under Task 8's ids, and if it chose other triggers, use Task 8's trigger strings in the `fireTip(...)` calls and tests below.
- Task 14 gives Task 8's additions their words, keyed by these ids: firsts `first_pottery`, `first_townhouse`, `first_manor`, `first_caravan`, `first_fine_manor`, `first_villa`, `first_estate`; achievements `potters_wheel`, `merchant_city`, `townhouse_terrace`, `manor_row`, `green_city`, `sculpture_garden`, `estate_life`, `thousand`; daily goals `pottery30`, `gardens3`, `sell20`, `statue1`, `booth1`; chapters `goods`, `grand`. Wherever Task 8 used other ids, rename the keys in `FIRST_TEXT`, `ACHIEVEMENT_NAMES` and `DAILY_TEXT`; the Task 14 test finds the entries by their check or measure kind, and the existing celebrate and tips tests fail on any id without words. If Task 8 already added words (or placeholders) for these ids, Task 14's entries replace them.
- The goods causes are read as the Task 6 writer reads them, the way the food codes work: `next_delivery { good }` when a working bazaar has the good or can draw it from a store in its supply reach; `good_unmade { good, id: bazaar }` when stores for the good lie in the bazaar's supply reach but none holds any; `no_good { good, id: bazaar }` when no store for it lies in that reach. For two kinds of food the cause carries the missing food (`good: 'figs'`). Task 14 words `no_good` as the store to build and `good_unmade` as the makers to build.
- The trade sheet reads `world.trade.routes[id]` (truthy means open), `world.trade.orders[good]` (`{ mode, keep }`, `{ mode: 'ignore', keep: 0 }` when unset), `nextCaravanDay(world)` as a game day (a non-finite value or `null` hides the row) and an optional `gift: { good, n }` on the caravan event. It explains a disabled Open route by openRoute's three contract rules (`PARTNERS[id].milestone` reached, a trading post exists, `world.gold >= routeCostOf(world, id)`); a click that openRoute still refuses shows its reason in a toast.
- The summary's "made against used last month" (spec 4.10) needs a monthly record the contract does not list. Task 14 adds `src/sim/goodsMonth.js` and three lines to `runMonth`, keeping the record in the existing `world.stats.lastMonth` object (new fields `made`, `used`, `madeTotal`, `tradeIncome`). `validateWorld` only checks that `stats` is a record, so no save version changes; an old save's first month simply has no record yet.
- Both the Task 14 and the Task 16 briefs say the summary names the difficulty. Task 14 does it and adds `DIFFICULTY_NAMES = { relaxed: 'Relaxed', normal: 'Normal', hard: 'Hard' }` and `T.difficulty = 'Difficulty'` to `src/ui/text.js`. Task 16 must reuse them and skip its own summary row: a second `export const DIFFICULTY_NAMES` would break the module.
- The contract's category rule needs the city's milestone, so Task 12 adds `cardShown(world, item)`, `shownItems(world, category)` and `shownCategories(world)` to `src/ui/cards.js`; the dock, panel and rail build their category buttons from `shownCategories` and rebuild them when that set changes. `visibleCategories()` in `src/data/ui.js` keeps its name and now means "the categories a stage has filled". In Stage 2 every filled category already shows at Village (Industry with its three Town cards, locked), so the rebuild only matters when later data adds a category's first card at a later milestone (the test fakes one).
- Task 3 raises `storage_full` on a full store as well as on a blocked producer. Task 12 words the store's alert "Storehouse is full" / "Build another storehouse nearby", and `nudge.js` prices each fix by the building that fixes it: a full or missing store by its own kind (a storehouse costs less than the granary the nudge assumed), `no_input` by the input's maker. `FIX_COST` entries now take `(world, alert)`.

**Tasks 15-17:**

Verification: all three tasks were applied to a scratch copy of the repo (`SCRATCH\s2n-t15t17`) on top of Tasks 1-5 as their plans apply them (the code in `SCRATCH\s2n-t06t08-real`), Task 7's `src/sim/trade.js` from the Task 6-8 working copy, and small stand-ins for Task 6 (tiers 6-9, merges, desirability rise and keep) and Task 14 (the summary's difficulty row). Every test below was run there; the full suite ended `799 passed, 0 failed` / `ALL PASSED` (that count includes Tasks 1-5's tests but not Tasks 6-14's). The screenshots in the visual checks were taken from that copy (without Tasks 9-11's art, so the new buildings were invisible there; with the art they show).

- The desirability legend. Spec 4.7 says "a single-hue light-to-dark scale with a five-step legend"; the contract and the Task 15 brief say "graded, six steps" (<0, 0-19, 20-34, 35-49, 50-64, 65+). Task 15 does both: the single indigo hue has five steps (0-19 up to 65+), and below zero is not a sixth shade of that hue but coral hatching, the same pattern the placement preview uses for "worse", so the legend shows six bands of which five are the light-to-dark scale. This keeps spec 6.1 (meaning never by colour alone: "unpleasant" is a pattern) and the brief's six bands. The bands start at each tier's "to rise" value (`DESIRABILITY_STEPS = [0, 20, 35, 50, 65]`, derived from `TIERS` in `src/data/ui.js`), so tuning a rise value moves the legend with it.
- `OVERLAYS`, `OVERLAY_HUE` and `SERVICE_TYPES` stay in `src/render/overlays.js`, where they live today (the File Structure lists "overlays" under `src/data/ui.js`; only `AUTO_OVERLAY` and the new `DESIRABILITY_STEPS` are in `src/data/ui.js`). Moving `OVERLAYS` would touch every importer for no gain.
- Task 16 reuses Task 14's summary row, `DIFFICULTY_NAMES` and `T.difficulty` (the Task 12-14 plan's CONTRACT NOTE says Task 14 adds them and Task 16 must not export a second `DIFFICULTY_NAMES`). Task 16 adds the title card choice, the Settings row and a test that the summary names the current city's level and does not follow the setting.
- `openRoute` and `setTradeOrder` are imported from `src/sim/trade.js`, where the Task 6-8 plan puts them (its own tests import them from there; `src/sim/commands.js` does not re-export them). Task 17's long run is otherwise "public commands only": `drawRoad`, `paintHouses`, `place` from `src/sim/commands.js`, and the clock.
- The placement preview's line is added by wrapping `toolPreview` (the old body becomes `basePreview`) rather than editing its building branch, because Tasks 1 and 12 both edit that branch's return line. `toolPreview(world, state)` keeps its signature and every field; it gains `nicer` (the words, or `''`) and `nicerTone` (`'better'`, `'worse'`, `'mixed'` or `''`). "Homes" in "Makes 6 homes nicer" is what `desirabilityPreview` counts: every housing plot, empty ones too (Task 5).
- Task 17 changes the sample city's Stage 1 layout as well as adding Stage 2 to it: on most seeds its farms' granary never placed (it was aimed at the river) and its lower streets had no temple, so its homes stayed Shacks, which would have kept every Townhouse and Manor off the title backdrop. The granary now tries a spot beside the north road first and a second temple sits on that road. Task 17 also lets `buildStressCity` set `world.milestone = 'capital'` directly, a fixture write like its existing direct writes to tiers and residents, so it can place every Stage 2 building.

---

### Task 1: World version 3, difficulty and costs

**Files:**
- Create: `src/data/difficulty.js`, `src/sim/costs.js`
- Modify: `src/sim/world.js` (`WORLD_VERSION = 3`, `newTradeState`, `createWorld` gains `difficulty`, `trade`, `newItems`, the tally additions)
- Modify: `src/save/migrate.js` (`MIGRATIONS[2]`), `src/save/serialize.js` (`REQUIRED`, `validateWorld`)
- Modify: `src/sim/commands.js` (`canPlace`, `place`, `demolishRefundFor`, `previewRoad`, `previewHouses`, `previewDemolishArea` read costs through `costs.js`)
- Modify: `src/ui/cards.js` (`cardInfo`), `src/ui/placement.js` (building preview cost), `src/ui/nudge.js` (affordable fix), `src/ui/settings.js` (`difficulty` setting), `src/boot.js` (new cities start at the setting's level)
- Modify: `sw-files.js` (regenerated by `tools/sw-files.ps1`)
- Create tests: `tests/sim/worldV3.test.js`, `tests/sim/costs.test.js`, `tests/save/migrateV3.test.js`, `tests/ui/costsUi.test.js`
- Modify tests: `tests/all.js` (four imports), `tests/sim/worldV2.test.js`, `tests/save/migrateV2.test.js`, `tests/save/store.test.js`

**Interfaces:**
- Consumes: `BUILDINGS`, `ECONOMY`; `createWorld`, `makeBuilding`, `insertBuilding`; `migrate`, `MIGRATIONS`, `REQUIRED`, `validateWorld`; `canAfford`, `spend`, `refund`; `pushUndo`, `undo`; `createSettings`; `boot`'s `freshWorld`.
- Produces (contract): `WORLD_VERSION = 3`; `createWorld({ seed, size, map, difficulty = 'normal' })` with `difficulty`, `trade: { routes: {}, orders: {}, drift: {}, used: {}, year: 1 }`, `newItems: []`, and `tally.made: {}`, `tally.sold`, `tally.bought`, `tally.tradeIncome`, `tally.caravans` (zeros). `MIGRATIONS[2](w)` gives the same fields to a version 2 save (difficulty `'normal'`); `validateWorld` checks each new field's type. `DIFFICULTIES`, `DIFFICULTY_ORDER` (`src/data/difficulty.js`). `costOf(world, type)` and `roadCostOf(world)` (`src/sim/costs.js`; `routeCostOf` arrives in Task 2, see the note above). `demolishRefundFor(world, b)`. Settings gain `difficulty` (default `'normal'`, any `DIFFICULTY_ORDER` key); `boot` creates new cities with `settings.get().difficulty`. Cards, the confirm bar and the nudge use the scaled costs. Undo already refunds the cost each entry recorded; the new tests pin it.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/worldV3.test.js`:

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
    });
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
  });
  it('starts a city at the difficulty it is given, and at Normal for anything that is not a level', () => {
    for (const d of DIFFICULTY_ORDER) expect(createWorld({ seed: 4, difficulty: d }).difficulty).toBe(d);
    expect(createWorld({ seed: 4, difficulty: 'nightmare' }).difficulty).toBe('normal');
    expect(createWorld({ seed: 4, difficulty: 'toString' }).difficulty).toBe('normal');   // the levels' own keys only
    expect(createWorld({ seed: 4, difficulty: null }).difficulty).toBe('normal');
  });
  it('changes nothing else with the difficulty: the same map, gold and start road', () => {
    const a = createWorld({ seed: 9, difficulty: 'relaxed' }), b = createWorld({ seed: 9, difficulty: 'hard' });
    const { difficulty: da, ...restA } = a;
    const { difficulty: db, ...restB } = b;
    expect([da, db]).toEqual(['relaxed', 'hard']);
    expect(restA).toEqual(restB);
  });
  it('gives each new world its own trade state and lists', () => {
    const a = createWorld({ seed: 4 }), b = createWorld({ seed: 4 });
    a.trade.routes.memphis = { opened: 1 };
    a.newItems.push('booth');
    a.tally.made.pottery = 3;
    expect(b.trade.routes).toEqual({});
    expect(b.newItems).toEqual([]);
    expect(b.tally.made).toEqual({});
  });
});

describe('data difficulty', () => {
  it('lists Relaxed, Normal and Hard with the spec 4.18 multipliers', () => {
    expect(DIFFICULTY_ORDER).toEqual(['relaxed', 'normal', 'hard']);
    expect(Object.keys(DIFFICULTIES).sort()).toEqual([...DIFFICULTY_ORDER].sort());
    expect(DIFFICULTIES).toEqual({ relaxed: { cost: 0.8, risk: 0.5 }, normal: { cost: 1, risk: 1 }, hard: { cost: 1.25, risk: 1.5 } });
  });
});
```


Create `tests/sim/costs.test.js` (each level, the 1-gold floor, the debt floor, demolish refunds, and undo giving back exactly what each action charged or refunded):

```js
import { describe, it, expect } from '../harness.js';
import { costOf, roadCostOf } from '../../src/sim/costs.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { ECONOMY } from '../../src/data/economy.js';
import { DIFFICULTY_ORDER } from '../../src/data/difficulty.js';
import {
  canPlace, place, drawRoad, previewRoad, paintHouses, previewHouses, demolishAt, demolishArea, previewDemolishArea, demolishRefundFor,
} from '../../src/sim/commands.js';
import { undo } from '../../src/sim/undo.js';
import { buildingAt } from '../../src/sim/world.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';

// Road along y = 10, at the given difficulty.
function cityAt(difficulty, gold = 1000) {
  const w = makeTestWorld({ gold });
  w.difficulty = difficulty;
  setRoad(w, 0, 10, 31, 10);
  return w;
}
const byLevel = (fn) => DIFFICULTY_ORDER.map((d) => fn(cityAt(d)));

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
  it('charges the scaled cost when placing, drawing roads and painting plots, and records it for undo', () => {
    const w = cityAt('hard');
    expect(place(w, 'well', 12, 9).ok).toBe(true);
    expect(w.gold).toBe(1000 - 38);
    expect(w.undo[w.undo.length - 1].cost).toBe(38);
    const road = drawRoad(w, 12, 14, 16, 14);                                  // five new tiles
    expect(road.cost).toBe(15);
    expect(w.gold).toBe(1000 - 38 - 15);
    const plots = paintHouses(w, 12, 15, 14, 15);                              // three plots
    expect(plots.cost).toBe(18);
    expect(w.gold).toBe(1000 - 38 - 15 - 18);
    expect(previewRoad(cityAt('relaxed'), 12, 14, 16, 14).cost).toBe(10);
    expect(previewHouses(cityAt('relaxed'), 12, 15, 14, 15).cost).toBe(12);
  });
  it('judges the debt floor against the scaled cost', () => {
    const gold = ECONOMY.debtFloor + 37;                                      // enough for a well on Normal or Relaxed, not on Hard
    for (const [d, ok] of [['relaxed', true], ['normal', true], ['hard', false]]) {
      const w = cityAt(d, gold);
      const r = canPlace(w, 'well', 12, 9);
      expect([d, r.ok, r.reason || null]).toEqual([d, ok, ok ? null : 'no_gold']);
    }
    expect(previewRoad(cityAt('hard', ECONOMY.debtFloor + 5), 12, 14, 13, 14).reason).toBe('no_gold');   // two tiles at 3 gold
    expect(previewRoad(cityAt('normal', ECONOMY.debtFloor + 5), 12, 14, 13, 14).ok).toBe(true);
  });
  it('refunds a quarter of the scaled cost on demolish, and nothing for plots', () => {
    const refunds = byLevel((w) => {
      place(w, 'temple', 12, 8);
      const b = buildingAt(w, 12, 8);
      const before = w.gold;
      const expected = demolishRefundFor(w, b);
      expect(previewDemolishArea(w, 12, 8, 13, 9).refund).toBe(expected);
      const r = demolishAt(w, 12, 8);
      expect(r.refund).toBe(expected);
      expect(w.gold).toBe(before + expected);
      return expected;
    });
    expect(refunds).toEqual([24, 30, 37]);                                     // 37.5 rounds down
    const w = cityAt('hard');
    place(w, 'house', 20, 20);
    expect(demolishRefundFor(w, buildingAt(w, 20, 20))).toBe(0);
    place(w, 'well', 12, 9);
    expect(demolishArea(w, 12, 9, 20, 20).refund).toBe(9);                     // the well's floor(38 / 4); the plot gives nothing
  });
  it('undoes every action with exactly what it charged or refunded', () => {
    for (const d of DIFFICULTY_ORDER) {
      const w = cityAt(d);
      place(w, 'temple', 12, 8);
      drawRoad(w, 12, 14, 16, 14);
      paintHouses(w, 12, 15, 14, 15);
      const spent = w.gold;
      demolishAt(w, 12, 8);
      undo(w);                                                                 // the demolish: its refund is taken back
      expect([d, w.gold]).toEqual([d, spent]);
      undo(w); undo(w); undo(w);
      expect([d, w.gold]).toEqual([d, 1000]);
    }
  });
  it('refunds the recorded cost on undo, not the cost as it stands now', () => {
    const w = cityAt('hard');
    place(w, 'well', 12, 9);
    w.difficulty = 'relaxed';                                                  // never happens in play: proves undo reads its record
    undo(w);
    expect(w.gold).toBe(1000);
  });
});
```

Create `tests/save/migrateV3.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { migrate, MIGRATIONS, CURRENT_VERSION } from '../../src/save/migrate.js';
import { serialize, deserialize, validateWorld, unpackSave, REQUIRED } from '../../src/save/serialize.js';
import { createWorld, population } from '../../src/sim/world.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
import { costOf, roadCostOf } from '../../src/sim/costs.js';

const V3_KEYS = ['difficulty', 'trade', 'newItems'];
const V3_TALLY = ['made', 'sold', 'bought', 'tradeIncome', 'caravans'];
const code = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };

// A version 2 save as the early-game pass wrote it: a lived-in city without the version 3 fields.
function v2City() {
  const w = createWorld({ seed: 7 });
  const { x, y } = w.focus;
  expect(drawRoad(w, x - 6, y, x + 6, y).ok).toBe(true);
  expect(paintHouses(w, x - 5, y + 1, x + 5, y + 1).ids.length).toBeGreaterThan(0);
  expect(place(w, 'well', x, y - 1).ok).toBe(true);
  advanceDays(w, 75);
  const v2 = JSON.parse(serialize(w));
  for (const k of V3_KEYS) delete v2[k];
  for (const k of V3_TALLY) delete v2.tally[k];
  v2.version = 2;
  return v2;
}

// A valid version 3 world as plain data, changed by fn, then validated.
function validAfter(fn) {
  const w = JSON.parse(serialize(createWorld({ seed: 3 })));
  fn(w);
  return validateWorld(w);
}

describe('migrate v2 to v3', () => {
  it('adds Normal difficulty, no trade, no new items and zero tallies, and keeps everything else', () => {
    const v2 = v2City();
    expect(population(v2)).toBeGreaterThan(0);
    expect(v2.tally.peakPeople).toBeGreaterThan(0);
    const before = JSON.stringify(v2);
    const v3 = MIGRATIONS[2](v2);
    expect(JSON.stringify(v2)).toBe(before);                      // the old object is not changed
    expect(v3.version).toBe(3);
    expect(v3.difficulty).toBe('normal');
    expect(v3.trade).toEqual({ routes: {}, orders: {}, drift: {}, used: {}, year: 1 });
    expect(v3.newItems).toEqual([]);
    expect(v3.tally).toEqual({ ...v2.tally, made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0 });
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
  });
  it('reports a malformed version 2 save as corrupt, not as a failed migration', () => {
    expect(code(() => deserialize(JSON.stringify({ version: 2 })))).toBe('corrupt_save');
    const v2 = v2City();
    v2.tally = null;
    expect(code(() => deserialize(JSON.stringify(v2)))).toBe('corrupt_save');
    const odd = v2City();
    odd.tally = [1, 2];
    expect(code(() => deserialize(JSON.stringify(odd)))).toBe('corrupt_save');
  });
});

describe('validateWorld v3', () => {
  it('accepts a new world at every level and one that has traded', () => {
    expect(validAfter(() => {})).toBe(true);
    for (const d of ['relaxed', 'normal', 'hard']) expect(validAfter((w) => { w.difficulty = d; })).toBe(true);
    expect(validAfter((w) => {
      w.trade = { routes: { memphis: { opened: 30 } }, orders: { pottery: { mode: 'sell', keep: 50 } }, drift: { memphis: { pottery: 0.05 } }, used: { memphis: { pottery: 40 } }, year: 3 };
      w.newItems = ['booth', 'statue'];
      Object.assign(w.tally, { made: { pottery: 120, clay: 130 }, sold: 40, bought: 20, tradeIncome: 320, caravans: 2 });
    })).toBe(true);
  });
  it('requires each new field', () => {
    for (const k of V3_KEYS) expect([k, validAfter((w) => { delete w[k]; })]).toEqual([k, false]);
    for (const k of V3_TALLY) expect([k, validAfter((w) => { delete w.tally[k]; })]).toEqual([k, false]);
  });
  it('rejects a difficulty that is not a level', () => {
    expect(validAfter((w) => { w.difficulty = 'nightmare'; })).toBe(false);
    expect(validAfter((w) => { w.difficulty = 1; })).toBe(false);
    expect(validAfter((w) => { w.difficulty = 'toString'; })).toBe(false);
  });
  it('rejects a bad trade state', () => {
    expect(validAfter((w) => { w.trade = null; })).toBe(false);
    expect(validAfter((w) => { w.trade = []; })).toBe(false);
    for (const k of ['routes', 'orders', 'drift', 'used']) {
      expect([k, validAfter((w) => { delete w.trade[k]; })]).toEqual([k, false]);
      expect([k, validAfter((w) => { w.trade[k] = []; })]).toEqual([k, false]);
    }
    expect(validAfter((w) => { w.trade.year = 0; })).toBe(false);
    expect(validAfter((w) => { w.trade.year = 1.5; })).toBe(false);
  });
  it('rejects bad new items and bad trade tallies', () => {
    expect(validAfter((w) => { w.newItems = 'booth'; })).toBe(false);
    expect(validAfter((w) => { w.newItems = [3]; })).toBe(false);
    expect(validAfter((w) => { w.tally.made = []; })).toBe(false);
    expect(validAfter((w) => { w.tally.made = { pottery: '3' }; })).toBe(false);
    expect(validAfter((w) => { w.tally.sold = NaN; })).toBe(false);
    expect(validAfter((w) => { w.tally.tradeIncome = '10'; })).toBe(false);
  });
});
```

Create `tests/ui/costsUi.test.js` (cards, previews, the confirm bar, the nudge's affordable fix, the setting and boot):

```js
import { describe, it, expect } from '../harness.js';
import { cardInfo } from '../../src/ui/cards.js';
import { toolPreview, createPlacement } from '../../src/ui/placement.js';
import { createConfirmBar } from '../../src/ui/confirmBar.js';
import { nudgeLineText } from '../../src/ui/nudge.js';
import { createSettings, DEFAULT_SETTINGS } from '../../src/ui/settings.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { alertText, T } from '../../src/ui/text.js';
import { GOALS } from '../../src/data/goals.js';
import { ECONOMY } from '../../src/data/economy.js';
import { boot } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { place } from '../../src/sim/commands.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../helpers/uiWorld.js';

// Road along y = 10, at the given difficulty.
function cityAt(difficulty, gold = 1000) {
  const w = makeTestWorld({ gold });
  w.difficulty = difficulty;
  setRoad(w, 0, 10, 31, 10);
  return w;
}

function storageWith(value) {
  const data = value ? { 'thebes.settings': JSON.stringify(value) } : {};
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}

// The real page shell with boot, rigged as tests/ui/boot.test.js rigs it, but with settings storage of our own.
async function bootWith({ storage, params = '' }) {
  const shell = await mountShell(1280, 800);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(params), now: () => 0,
    clock: () => 1760000000000, storage, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('ui costs by difficulty', () => {
  it('shows each city its own costs on cards, and judges them affordable against those', () => {
    const hard = cityAt('hard');
    expect(cardInfo(hard, 'well')).toEqual({ item: 'well', name: 'Well', cost: 38, costText: '38 gold', affordable: true, locked: false, lockText: '' });
    expect(cardInfo(hard, 'road').costText).toBe('3 gold per tile');
    expect(cardInfo(hard, 'house').costText).toBe('6 gold per plot');
    expect(cardInfo(cityAt('relaxed'), 'temple').costText).toBe('96 gold');
    expect(cardInfo(cityAt('normal'), 'temple').costText).toBe('120 gold');
    expect(cardInfo(hard, 'demolish').costText).toBe('Refunds a quarter');
    const gold = ECONOMY.debtFloor + 35;                                      // a Normal well fits, a Hard one does not
    expect(cardInfo(cityAt('normal', gold), 'well').affordable).toBe(true);
    expect(cardInfo(cityAt('hard', gold), 'well').affordable).toBe(false);
  });
  it('previews the scaled cost for a building, a road, plots and a demolish', () => {
    const w = cityAt('hard');
    const ok = toolPreview(w, { tool: { kind: 'building', type: 'well' }, ghost: { x: 12, y: 9 } });
    expect([ok.state, ok.cost]).toEqual(['ok', 38]);
    const blocked = toolPreview(w, { tool: { kind: 'building', type: 'well' }, ghost: { x: 20, y: 20 } });
    expect([blocked.state, blocked.cost]).toEqual(['bad', 38]);
    expect(toolPreview(w, { tool: { kind: 'road' }, line: { x0: 12, y0: 14, x1: 16, y1: 14, flip: false } }).cost).toBe(15);
    expect(toolPreview(w, { tool: { kind: 'houses' }, area: { x0: 12, y0: 15, x1: 14, y1: 15 } }).cost).toBe(18);
    expect(place(w, 'temple', 12, 8).ok).toBe(true);
    expect(toolPreview(w, { tool: { kind: 'demolish' }, area: { x0: 12, y0: 8, x1: 13, y1: 9 } }).refund).toBe(37);
  });
  it('puts the scaled cost in the confirm bar and charges it on confirm', () => {
    const { root, cleanup } = mount();
    try {
      const world = cityAt('hard');
      const store = createStore(INITIAL_UI_STATE);
      const placement = createPlacement({ world, store });
      const bar = createConfirmBar({ container: root, store, placement, onCancel: () => {}, onConfirm: () => {}, onUndo: () => {} });
      placement.start({ kind: 'building', type: 'well' }, { x: 12, y: 9 });
      placement.moveGhost(12, 9);
      bar.render();
      expect(root.querySelector('.cost').textContent).toBe('38 gold');
      placement.confirm();
      expect(world.gold).toBe(1000 - 38);
    } finally { cleanup(); }
  });
  it('names a fix in the nudge only when this city can pay for it', () => {
    const goal = GOALS[0];
    for (const [d, named] of [['relaxed', true], ['hard', false]]) {
      const w = cityAt(d, 90);                                                 // a granary: 64 on Relaxed, 100 on Hard
      const farm = addRaw(w, 'farm_grain', 2, 8);
      const alert = { code: 'no_storage', id: farm.id };
      const t = alertText(alert, w);
      expect([d, nudgeLineText(w, [alert], goal)]).toEqual([d, named ? `${T.next}: ${t.title}. ${t.fix}` : `${T.next}: ${goal.text}`]);
    }
  });
});

describe('ui difficulty setting', () => {
  it('starts at Normal, keeps a level that is set and ignores anything else', () => {
    const { root, cleanup } = mount();
    try {
      expect(DEFAULT_SETTINGS.difficulty).toBe('normal');
      const storage = storageWith(null);
      const s = createSettings({ storage, root, systemReducedMotion: () => false });
      expect(s.get().difficulty).toBe('normal');
      s.set({ difficulty: 'hard' });
      expect(s.get().difficulty).toBe('hard');
      expect(JSON.parse(storage.data['thebes.settings']).difficulty).toBe('hard');
      s.set({ difficulty: 'brutal' });
      expect(s.get().difficulty).toBe('hard');
      expect(createSettings({ storage, root, systemReducedMotion: () => false }).get().difficulty).toBe('hard');
      expect(createSettings({ storage: storageWith({ difficulty: 'easy' }), root, systemReducedMotion: () => false }).get().difficulty).toBe('normal');
    } finally { cleanup(); }
  });
  it('starts every new city at the difficulty the settings hold', async () => {
    let r = await bootWith({ storage: storageWith({ difficulty: 'hard' }), params: 'skipTitle=1&seed=8' });
    try {
      expect(r.api.game().world.difficulty).toBe('hard');
      r.api.hooks.newCity();
      expect(r.api.game().world.difficulty).toBe('hard');
    } finally { r.cleanup(); }
    r = await bootWith({ storage: storageWith({ difficulty: 'relaxed' }) });
    try {
      expect(r.api.phase()).toBe('title');
      fire(r.root.querySelector('#title .new-city'), 'click');
      expect(r.api.game().world.difficulty).toBe('relaxed');
    } finally { r.cleanup(); }
    r = await bootWith({ storage: storageWith(null), params: 'skipTitle=1&seed=8' });
    try { expect(r.api.game().world.difficulty).toBe('normal'); } finally { r.cleanup(); }
  });
});
```

Add the imports to `tests/all.js`, each after the line shown:

In `tests/all.js`, replace:

```js
import './sim/worldV2.test.js';
```

with:

```js
import './sim/worldV2.test.js';
import './sim/worldV3.test.js';
import './sim/costs.test.js';
```

In `tests/all.js`, replace:

```js
import './save/migrateV2.test.js';
```

with:

```js
import './save/migrateV2.test.js';
import './save/migrateV3.test.js';
```

In `tests/all.js`, replace:

```js
import './ui/confirmBar.test.js';
```

with:

```js
import './ui/confirmBar.test.js';
import './ui/costsUi.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "v3"
```

Expected: the page cannot load, because `src/data/difficulty.js` and `src/sim/costs.js` do not exist yet:

```
LOAD ERROR
TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:<port>/tests/all.js
```

(The runner exits with code 1. The same happens with any `-Grep`, since the whole test graph fails to import.)

- [ ] **Step 3: Implement**

Create `src/data/difficulty.js`:

```js
// Difficulty (spec 4.18): chosen when a city starts and fixed for its life. cost multiplies building, road and
// route costs (never upkeep or wages: spec 4.11); risk multiplies fire and raid risk, which arrive in Stage 3,
// so Stage 2 only stores it. Goals, workers and desirability are the same at every level.
export const DIFFICULTIES = {
  relaxed: { cost: 0.8, risk: 0.5 },
  normal: { cost: 1, risk: 1 },
  hard: { cost: 1.25, risk: 1.5 },
};

// The order the title card and the settings sheet list them in.
export const DIFFICULTY_ORDER = ['relaxed', 'normal', 'hard'];
```

Create `src/sim/costs.js` (Task 2 adds `routeCostOf` here):

```js
// What things cost in this city (spec 4.11, 4.18): the data's base cost times the city's difficulty, rounded to
// whole gold and never below 1. Every command, preview and card reads costs through here, so a Hard city's well
// costs the same on its card, in the confirm bar, in the treasury and in its undo.
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { DIFFICULTIES } from '../data/difficulty.js';

const scaled = (world, base) => Math.max(1, Math.round(base * DIFFICULTIES[world.difficulty].cost));

export const costOf = (world, type) => scaled(world, BUILDINGS[type].cost);

export const roadCostOf = (world) => scaled(world, ECONOMY.roadCost);
```

`src/sim/world.js`: the version, the trade state helper, the `difficulty` parameter and the new fields.

In `src/sim/world.js`, replace:

```js
import { BUILDINGS } from '../data/buildings.js';
import { generateMap } from './mapgen.js';
```

with:

```js
import { BUILDINGS } from '../data/buildings.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { generateMap } from './mapgen.js';
```

In `src/sim/world.js`, replace:

```js
export const WORLD_VERSION = 2;
export const HISTORY_MONTHS = 12;   // month-end rows kept for the Welcome back trends

export function createWorld({ seed = 1, size = 64, map = null } = {}) {
```

with:

```js
export const WORLD_VERSION = 3;
export const HISTORY_MONTHS = 12;   // month-end rows kept for the Welcome back trends

// The trade state a city starts with (Stage 2): no routes open, no orders, no price drift drawn, no quota used.
export const newTradeState = () => ({ routes: {}, orders: {}, drift: {}, used: {}, year: 1 });

// difficulty is a DIFFICULTIES key (spec 4.18), fixed for the city's life; anything else starts a Normal city.
export function createWorld({ seed = 1, size = 64, map = null, difficulty = 'normal' } = {}) {
```

In `src/sim/world.js`, replace:

```js
    tally: { harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0 },   // running counts for firsts, achievements and daily goals
  };
```

with:

```js
    // Running counts for firsts, achievements, daily goals and the summary; made: units produced, by good.
    tally: { harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0, made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0 },
    difficulty: Object.hasOwn(DIFFICULTIES, difficulty) ? difficulty : 'normal',
    trade: newTradeState(),                             // open routes, orders, price drift and quota used this year
    newItems: [],                                       // build items a milestone unlocked and nothing has placed yet ("New")
  };
```

`src/save/migrate.js`: the v2 to v3 step.

In `src/save/migrate.js`, replace:

```js
import { WORLD_VERSION } from '../sim/world.js';
```

with:

```js
import { WORLD_VERSION, newTradeState } from '../sim/world.js';
```

In `src/save/migrate.js`, replace:

```js
// Each entry upgrades a world from version N to N + 1. Add one whenever WORLD_VERSION goes up.
export const MIGRATIONS = { 1: v1ToV2 };
```

with:

```js
// v2 -> v3 (Stage 2). A city from before difficulty existed plays on Normal, so its costs do not change; it has no
// trade yet and no "New" badges, and the new tallies start at zero (nothing was made, sold or bought before).
// Every other field is kept as it was. A malformed tally is left for validateWorld to report.
function v2ToV3(w) {
  const tally = w.tally !== null && typeof w.tally === 'object' && !Array.isArray(w.tally) ? w.tally : {};
  return {
    ...w,
    version: 3,
    difficulty: 'normal',
    trade: newTradeState(),
    newItems: [],
    tally: { ...tally, made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0 },
  };
}

// Each entry upgrades a world from version N to N + 1. Add one whenever WORLD_VERSION goes up.
export const MIGRATIONS = { 1: v1ToV2, 2: v2ToV3 };
```

`src/save/serialize.js`: the new required fields and their checks.

In `src/save/serialize.js`, replace:

```js
import { BUILDINGS } from '../data/buildings.js';
```

with:

```js
import { BUILDINGS } from '../data/buildings.js';
import { DIFFICULTIES } from '../data/difficulty.js';
```

In `src/save/serialize.js`, replace:

```js
  'firsts', 'achievements', 'daily', 'guide', 'tally',
];

const TALLY_KEYS = ['harvested', 'profitMonths', 'peakPeople', 'upgrades', 'dailyDone'];
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
```

with:

```js
  'firsts', 'achievements', 'daily', 'guide', 'tally',
  'difficulty', 'trade', 'newItems',
];

const TALLY_KEYS = ['harvested', 'profitMonths', 'peakPeople', 'upgrades', 'dailyDone', 'sold', 'bought', 'tradeIncome', 'caravans'];
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isCounts = (v) => isRecord(v) && Object.values(v).every(Number.isFinite);       // tally.made: good -> units
const isStrings = (v) => Array.isArray(v) && v.every((s) => typeof s === 'string');
// The trade state's shape (version 3); what each map holds is the trade code's business.
const isTrade = (t) => isRecord(t) && ['routes', 'orders', 'drift', 'used'].every((k) => isRecord(t[k])) && Number.isInteger(t.year) && t.year >= 1;
```

In `src/save/serialize.js`, replace:

```js
  if (!isRecord(w.tally) || !TALLY_KEYS.every((k) => Number.isFinite(w.tally[k]))) return false;
  return true;
```

with:

```js
  if (!isRecord(w.tally) || !TALLY_KEYS.every((k) => Number.isFinite(w.tally[k])) || !isCounts(w.tally.made)) return false;
  if (typeof w.difficulty !== 'string' || !Object.hasOwn(DIFFICULTIES, w.difficulty)) return false;
  if (!isTrade(w.trade) || !isStrings(w.newItems)) return false;
  return true;
```

`src/sim/commands.js`: every cost and refund through `costs.js` (`ECONOMY` stays imported for `demolishRefund`; `BUILDINGS` stays for the rest of the file).

In `src/sim/commands.js`, replace:

```js
import { canAfford, spend, refund } from './money.js';
```

with:

```js
import { canAfford, spend, refund } from './money.js';
import { costOf, roadCostOf } from './costs.js';
```

In `canPlace`:

In `src/sim/commands.js`, replace:

```js
  if (!canAfford(world, BUILDINGS[type].cost)) return fail('no_gold');
```

with:

```js
  if (!canAfford(world, costOf(world, type))) return fail('no_gold');
```

In `place`:

In `src/sim/commands.js`, replace:

```js
  const cost = BUILDINGS[type].cost;
  const b = insertBuilding(world, makeBuilding(world, type, x, y));
```

with:

```js
  const cost = costOf(world, type);
  const b = insertBuilding(world, makeBuilding(world, type, x, y));
```

In `src/sim/commands.js`, replace:

```js
export const demolishRefundFor = (b) => (b.type === 'house' ? 0 : Math.floor(BUILDINGS[b.type].cost * ECONOMY.demolishRefund));
```

with:

```js
// A quarter of what the building costs in this city (difficulty included); plots refund nothing (spec 4.11).
export const demolishRefundFor = (world, b) => (b.type === 'house' ? 0 : Math.floor(costOf(world, b.type) * ECONOMY.demolishRefund));
```

In `demolishAt`:

In `src/sim/commands.js`, replace:

```js
    const amount = demolishRefundFor(b);
```

with:

```js
    const amount = demolishRefundFor(world, b);
```

In `previewRoad`:

In `src/sim/commands.js`, replace:

```js
  const cost = tiles.length * ECONOMY.roadCost;
```

with:

```js
  const cost = tiles.length * roadCostOf(world);
```

In `previewHouses`:

In `src/sim/commands.js`, replace:

```js
  const cost = positions.length * BUILDINGS.house.cost;
```

with:

```js
  const cost = positions.length * costOf(world, 'house');
```

In `previewDemolishArea`:

In `src/sim/commands.js`, replace:

```js
  const refundTotal = buildingIds.reduce((s, id) => s + demolishRefundFor(world.buildings[id]), 0);
```

with:

```js
  const refundTotal = buildingIds.reduce((s, id) => s + demolishRefundFor(world, world.buildings[id]), 0);
```

`src/sim/undo.js` needs no change: a `place` or `road` entry already refunds the `cost` it recorded, and a `demolish` entry takes back the `refund` it recorded, so undo always returns exactly what the action charged at the difficulty in force.


`src/ui/cards.js`: cards show this city's costs and judge affordability against them.

In `src/ui/cards.js`, replace:

```js
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { isUnlocked } from '../sim/progression.js';
```

with:

```js
import { BUILDINGS } from '../data/buildings.js';
import { isUnlocked } from '../sim/progression.js';
import { costOf, roadCostOf } from '../sim/costs.js';
```

In `src/ui/cards.js`, replace:

```js
export function cardInfo(world, item) {
  let cost = 0, suffix = '', costText;
  if (item === 'road') { cost = ECONOMY.roadCost; suffix = ' per tile'; }
  else if (item === 'house') { cost = BUILDINGS.house.cost; suffix = ' per plot'; }
  else if (item !== 'demolish') cost = BUILDINGS[item].cost;
```

with:

```js
// Costs are this city's (difficulty included: spec 4.18), the same the commands charge.
export function cardInfo(world, item) {
  let cost = 0, suffix = '', costText;
  if (item === 'road') { cost = roadCostOf(world); suffix = ' per tile'; }
  else if (item === 'house') { cost = costOf(world, 'house'); suffix = ' per plot'; }
  else if (item !== 'demolish') cost = costOf(world, item);
```

`src/ui/placement.js`: the building preview (and so the confirm bar) shows the scaled cost. Roads, plots and demolish already take theirs from `previewRoad`, `previewHouses` and `previewDemolishArea`.

In `src/ui/placement.js`, replace:

```js
import { homesServedFrom } from '../sim/housing.js';
```

with:

```js
import { homesServedFrom } from '../sim/housing.js';
import { costOf } from '../sim/costs.js';
```

In `toolPreview`'s building branch:

In `src/ui/placement.js`, replace:

```js
    const def = BUILDINGS[tool.type];
    if (!state.ghost) return idle('');
    const { x, y } = state.ghost;
    const r = canPlace(world, tool.type, x, y);
    if (!r.ok) return bad(r.reason, def.cost, 1);
```

with:

```js
    const def = BUILDINGS[tool.type];
    if (!state.ghost) return idle('');
    const { x, y } = state.ghost;
    const cost = costOf(world, tool.type);
    const r = canPlace(world, tool.type, x, y);
    if (!r.ok) return bad(r.reason, cost, 1);
```

In `src/ui/placement.js`, replace:

```js
text: warn ? warningText(r.warnings[0]) : '', effect, cost: def.cost, count: 1, tiles: [], refund: 0 };
```

with:

```js
text: warn ? warningText(r.warnings[0]) : '', effect, cost, count: 1, tiles: [], refund: 0 };
```

`src/ui/nudge.js`: "an affordable fix" means affordable at this city's prices.

In `src/ui/nudge.js`, replace:

```js
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { alertText, T } from './text.js';
```

with:

```js
import { costOf, roadCostOf } from '../sim/costs.js';
import { alertText, T } from './text.js';
```

In `src/ui/nudge.js`, replace:

```js
// What each alert's cheapest fix costs, for "an affordable fix". Alerts without an entry (a failing save) are skipped.
const FIX_COST = {
  no_road: () => ECONOMY.roadCost,
  no_storage: () => BUILDINGS.granary.cost,
  storage_full: () => BUILDINGS.granary.cost,
  bazaar_empty: () => BUILDINGS.granary.cost,
  understaffed: () => BUILDINGS.house.cost,
  labour_shortage: () => BUILDINGS.house.cost,
  unemployment: () => Math.min(BUILDINGS.farm_grain.cost, BUILDINGS.bazaar.cost),
```

with:

```js
// What each alert's cheapest fix costs in this city (difficulty included), for "an affordable fix". Alerts without an
// entry (a failing save) are skipped.
const FIX_COST = {
  no_road: (w) => roadCostOf(w),
  no_storage: (w) => costOf(w, 'granary'),
  storage_full: (w) => costOf(w, 'granary'),
  bazaar_empty: (w) => costOf(w, 'granary'),
  understaffed: (w) => costOf(w, 'house'),
  labour_shortage: (w) => costOf(w, 'house'),
  unemployment: (w) => Math.min(costOf(w, 'farm_grain'), costOf(w, 'bazaar')),
```

In `nudgeLineText`:

In `src/ui/nudge.js`, replace:

```js
    if (cost && world.gold >= cost()) {
```

with:

```js
    if (cost && world.gold >= cost(world)) {
```

`src/ui/settings.js`: the difficulty for new cities (Task 16 adds the controls).

In `src/ui/settings.js`, replace:

```js
// Settings (spec 6.3): sound, vibration, text size, left-handed controls, keyboard shortcuts, reduced motion,
// and (early-game pass 3.1, 3.4) Help ('full' guide and tips, 'tips' only, 'off') and the tips seen on this device.
// Stored in localStorage when available; applied to the document as data attributes and a class.
import { prefersReducedMotion } from '../render/effects.js';
```

with:

```js
// Settings (spec 6.3): sound, vibration, text size, left-handed controls, keyboard shortcuts, reduced motion,
// (early-game pass 3.1, 3.4) Help ('full' guide and tips, 'tips' only, 'off') and the tips seen on this device,
// and (spec 4.18) the difficulty the next new city starts at. Stored in localStorage when available; applied to
// the document as data attributes and a class.
import { prefersReducedMotion } from '../render/effects.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
```

In `src/ui/settings.js`, replace:

```js
export const DEFAULT_SETTINGS = { sound: false, vibration: true, textSize: 100, leftHanded: false, keyboardShortcuts: true, reducedMotion: 'system', help: 'full', seenTips: [] };
```

with:

```js
export const DEFAULT_SETTINGS = { sound: false, vibration: true, textSize: 100, leftHanded: false, keyboardShortcuts: true, reducedMotion: 'system', help: 'full', seenTips: [], difficulty: 'normal' };
```

In `src/ui/settings.js`, replace:

```js
  seenTips: (v) => Array.isArray(v) && v.every((s) => typeof s === 'string'),
};
```

with:

```js
  seenTips: (v) => Array.isArray(v) && v.every((s) => typeof s === 'string'),
  difficulty: (v) => DIFFICULTY_ORDER.includes(v),
};
```

`src/boot.js`: every new city (New city on the title card, the confirm-over-a-saved-city path, the menu's New city and the development flags) goes through `freshWorld`, so one change covers them all. The title card's backdrop city stays Normal.

In `src/boot.js`, replace:

```js
  // A new city starts with the guide on only under Help: Guide and tips (early-game pass 3.1). The sample and
  // stress cities of the development flags never guide.
  function freshWorld() {
    const world = createWorld({ seed: seedOf() });
```

with:

```js
  // A new city starts with the guide on only under Help: Guide and tips (early-game pass 3.1), and at the difficulty
  // the settings hold for new cities (spec 4.18). The sample and stress cities of the development flags never guide.
  function freshWorld() {
    const world = createWorld({ seed: seedOf(), difficulty: settings.get().difficulty });
```

- [ ] **Step 4: Run the tests to see them pass**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "v3"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "costs"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "difficulty"
```

Expected: `ALL PASSED` for each, with `12 passed`, `14 passed` and `13 passed` (the grep matches the whole "describe > it" name, so the three runs overlap; together they cover all 27 new tests).

- [ ] **Step 5: Update the existing tests this breaks**

`grep -rn "WORLD_VERSION\|CURRENT_VERSION\|REQUIRED\|tally).toEqual" tests` finds the version 2 pins. Three files change; nothing else does (`tests/save/serialize.test.js` compares `createWorld`'s keys with `REQUIRED`, which grows with them, and every other test uses Normal, where every cost is unchanged).

`tests/sim/worldV2.test.js`: the version 2 test now checks only the version 2 fields (version 3 has its own file).

In `tests/sim/worldV2.test.js`, replace:

```js
  it('creates a version 2 world with the new fields at their starting values', () => {
    const w = createWorld({ seed: 4 });
    expect(WORLD_VERSION).toBe(2);
    expect(w.version).toBe(2);
    expect(w.firsts).toEqual([]);
```

with:

```js
  it('creates a world with the version 2 fields at their starting values', () => {
    const w = createWorld({ seed: 4 });
    expect(w.version).toBe(WORLD_VERSION);                                // version 3 and its fields: tests/sim/worldV3.test.js
    expect(w.firsts).toEqual([]);
```

In `tests/sim/worldV2.test.js`, replace:

```js
    expect(w.tally).toEqual({ harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0 });
    expect(w.goals).toEqual({ completed: [], triggered: [] });
```

with:

```js
    const { harvested, profitMonths, peakPeople, upgrades, dailyDone } = w.tally;
    expect({ harvested, profitMonths, peakPeople, upgrades, dailyDone }).toEqual({ harvested: 0, profitMonths: 0, peakPeople: 0, upgrades: 0, dailyDone: 0 });
    expect(w.goals).toEqual({ completed: [], triggered: [] });
```

`tests/save/migrateV2.test.js`: a version 1 save has no version 3 fields; a migrated version 2 world is valid once version 3 adds its fields; `migrate` now runs both steps.

In `tests/save/migrateV2.test.js`, replace:

```js
const NEW_KEYS = ['firsts', 'achievements', 'daily', 'guide', 'tally'];
```

with:

```js
const NEW_KEYS = ['firsts', 'achievements', 'daily', 'guide', 'tally'];
const V3_KEYS = ['difficulty', 'trade', 'newItems'];   // version 3's fields (tests/save/migrateV3.test.js)
```

In `tests/save/migrateV2.test.js`, replace:

```js
  const v1 = JSON.parse(serialize(w));
  for (const k of NEW_KEYS) delete v1[k];
```

with:

```js
  const v1 = JSON.parse(serialize(w));
  for (const k of [...NEW_KEYS, ...V3_KEYS]) delete v1[k];
```

In `tests/save/migrateV2.test.js`, replace:

```js
    expect(Object.keys(v2).sort()).toEqual([...REQUIRED].sort());
    expect(validateWorld(v2)).toBe(true);
```

with:

```js
    expect(Object.keys(v2).sort()).toEqual(REQUIRED.filter((k) => !V3_KEYS.includes(k)).sort());
    expect(validateWorld(MIGRATIONS[2](v2))).toBe(true);                    // valid once version 3 adds its fields
```

In `tests/save/migrateV2.test.js`, replace:

```js
    expect(CURRENT_VERSION).toBe(2);
    expect(migrate(v1)).toEqual(MIGRATIONS[1](v1));
    expect(deserialize(JSON.stringify(v1)).version).toBe(2);
```

with:

```js
    expect(CURRENT_VERSION).toBe(3);
    expect(migrate(v1)).toEqual(MIGRATIONS[2](MIGRATIONS[1](v1)));
    expect(deserialize(JSON.stringify(v1)).version).toBe(3);
```

In `tests/save/migrateV2.test.js`, replace:

```js
    expect(back.world.version).toBe(2);
```

with:

```js
    expect(back.world.version).toBe(3);
```

`tests/save/store.test.js`, at the end of "refuses a migration that overshoots or throws":

In `tests/save/store.test.js`, replace:

```js
    expect(CURRENT_VERSION).toBe(2);
```

with:

```js
    expect(CURRENT_VERSION).toBe(3);
```

- [ ] **Step 6: Visual check**

Not a visual task: no drawing changes. Costs on Normal are unchanged, so the cards and the confirm bar look as before.

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `sw-files.js` gains `./src/data/difficulty.js` and `./src/sim/costs.js` (118 entries), then `701 passed, 0 failed` and `ALL PASSED` (674 before, 27 new).

- [ ] **Step 8: Commit**

```powershell
git add src/data/difficulty.js src/sim/costs.js src/sim/world.js src/save/migrate.js src/save/serialize.js src/sim/commands.js src/ui/cards.js src/ui/placement.js src/ui/nudge.js src/ui/settings.js src/boot.js sw-files.js tests/all.js tests/sim/worldV3.test.js tests/sim/costs.test.js tests/save/migrateV3.test.js tests/ui/costsUi.test.js tests/sim/worldV2.test.js tests/save/migrateV2.test.js tests/save/store.test.js
git commit -m @'
Add world version 3 with difficulty, and charge every cost at the city's level

A city now has a difficulty (Relaxed, Normal or Hard) fixed when it starts, and every building, road and plot
cost, preview, card, refund and undo goes through one costs module that scales by it. Version 3 also adds the
trade state, the New-badge list and the tallies for goods made and trade, and a version 2 save migrates to a
Normal city with nothing changed. The settings hold the level for new cities.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```


### Task 2: Goods, buildings, tiers, milestones, desirability and trade data

**Files:**
- Modify (whole files): `src/data/goods.js`, `src/data/buildings.js`, `src/data/housing.js`, `src/data/progression.js`, `src/sim/costs.js`
- Create: `src/data/desirability.js`, `src/data/trade.js`
- Modify: `src/sim/production.js` (one line: food by `kind`), `src/sim/commands.js` (one line: the off-road warning only for plots)
- Modify: `sw-files.js` (regenerated)
- Create tests: `tests/data/economyData.test.js`, `tests/sim/economyUnlocks.test.js`
- Modify tests: `tests/all.js` (two imports), `tests/sim/events.test.js` (one line)

**Interfaces:**
- Consumes: Task 1's `DIFFICULTIES` and the private rounding rule in `src/sim/costs.js`; `PRIORITY_LEVELS`; `TERRAIN_BY_NAME`; `isUnlocked`, `updateMilestone`, `canPlace`, `place`, `monthlyHousing`, `houseStatus`, `produceDay`; the fixtures `makeTestWorld`, `setRoad`, `addRaw`, `staffAll`.
- Produces (contract): `GOODS` (ten goods, each `{ name, kind, perResidentPerMonth? }`), `FOOD_GOODS` (`['grain', 'figs']`), `HOUSEHOLD_GOODS` (`['pottery', 'beer', 'linen', 'jewellery']`), `RAW_GOODS` (`['clay', 'barley', 'flax', 'gems']`). `BUILDINGS` with the fourteen Stage 2 buildings (costs, upkeep, workers and priorities of the brief; `producerReach: 12` for every producer; `consumes` on the four workshops), `granary.stores = ['grain', 'figs']`, `storehouse.stores` = every non-food good with `capacity: 800`, `bazaar.sells` = the six food and household goods with `bazaar.stock` (`grain: 300`, `figs: 200`, the household goods 100; see the note on spec 4.10). `TIERS` 5-9 with cumulative `needs` (`pottery`; `entertainment`; `beer`, `twoFoods`; `linen`; `jewellery`), `size` 1 or 2 and `desirability: { rise, keep }` on 6-9; `MAX_TIER = 9`. `MILESTONES` village (adds `garden`), town 150, market_town 250, city 400, great_city 650, capital 1000 with the spec 4.14 economy unlocks. `DESIRABILITY` (type → values by distance 1..6) and `HOUSE_DESIRABILITY` (tier → values, an array indexed by tier). `PARTNERS` (`{ name, milestone, routeCost, buys, sells, gift }`), `CARAVAN_EVERY_MONTHS = 3`, `PRICE_DRIFT = 0.1`, `TRADE_REACH = 16`, `ARBITRAGE_MARGIN = 1.25`. `routeCostOf(world, partnerId)` in `src/sim/costs.js`.
- Stage 1 behaviour kept: nothing that needs a new good can be reached yet. A House never becomes a Townhouse (the housing check has no `pottery` rule until Task 6, so the need is never met), the bazaar is "empty" only when it holds none of its six goods (so a bazaar with grain behaves as before), and every Town-and-later building is locked before Town. The garden is placeable from Village (contract and spec 4.14) but has no card until Task 12.

- [ ] **Step 1: Write the failing tests**

Create `tests/data/economyData.test.js` (the data checks: every number against the spec and the brief, tiers' capacity and tax per tile never falling, every unlock, desirability key and good reference existing, no arbitrage at the margin):

```js
import { describe, it, expect } from '../harness.js';
import { GOODS, FOOD_GOODS, HOUSEHOLD_GOODS, RAW_GOODS } from '../../src/data/goods.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { TIERS, MAX_TIER } from '../../src/data/housing.js';
import { MILESTONES } from '../../src/data/progression.js';
import { DESIRABILITY, HOUSE_DESIRABILITY } from '../../src/data/desirability.js';
import { PARTNERS, CARAVAN_EVERY_MONTHS, PRICE_DRIFT, TRADE_REACH, ARBITRAGE_MARGIN } from '../../src/data/trade.js';
import { PRIORITY_LEVELS } from '../../src/data/labour.js';
import { TERRAIN_BY_NAME } from '../../src/sim/terrain.js';

const STAGE2 = ['garden', 'statue', 'farm_fig', 'clay_pit', 'potter', 'storehouse', 'booth', 'trading_post',
  'farm_barley', 'brewery', 'farm_flax', 'weaver', 'gem_mine', 'jeweller'];
const pick = (b, keys) => Object.fromEntries(keys.map((k) => [k, b[k]]));

describe('data goods', () => {
  it('lists the ten goods with their kinds and household use', () => {
    expect(Object.keys(GOODS)).toEqual(['grain', 'figs', 'pottery', 'beer', 'linen', 'jewellery', 'clay', 'barley', 'flax', 'gems']);
    expect(FOOD_GOODS).toEqual(['grain', 'figs']);
    expect(HOUSEHOLD_GOODS).toEqual(['pottery', 'beer', 'linen', 'jewellery']);
    expect(RAW_GOODS).toEqual(['clay', 'barley', 'flax', 'gems']);
    const use = Object.fromEntries([...FOOD_GOODS, ...HOUSEHOLD_GOODS].map((g) => [g, GOODS[g].perResidentPerMonth]));
    expect(use).toEqual({ grain: 0.25, figs: 0.25, pottery: 0.05, beer: 0.05, linen: 0.04, jewellery: 0.03 });
    for (const g of RAW_GOODS) expect([g, 'perResidentPerMonth' in GOODS[g]]).toEqual([g, false]);
    for (const [g, def] of Object.entries(GOODS)) expect([g, typeof def.name, def.name.length > 0]).toEqual([g, 'string', true]);
  });
});

describe('data buildings, Stage 2', () => {
  it('adds the fourteen buildings with the costs, upkeep, workers and priorities of the plan', () => {
    for (const t of STAGE2) expect([t, Boolean(BUILDINGS[t])]).toEqual([t, true]);
    const rows = Object.fromEntries(STAGE2.map((t) => [t, pick(BUILDINGS[t], ['cost', 'upkeep', 'workers', 'priority'])]));
    expect(rows).toEqual({
      garden: { cost: 12, upkeep: 0, workers: 0, priority: undefined },
      statue: { cost: 60, upkeep: 0, workers: 0, priority: undefined },
      farm_fig: { cost: 70, upkeep: 6, workers: 8, priority: 'essential' },
      clay_pit: { cost: 50, upkeep: 5, workers: 6, priority: 'industry' },
      potter: { cost: 90, upkeep: 8, workers: 8, priority: 'industry' },
      storehouse: { cost: 70, upkeep: 5, workers: 6, priority: 'essential' },
      booth: { cost: 50, upkeep: 4, workers: 4, priority: 'services' },
      trading_post: { cost: 150, upkeep: 10, workers: 6, priority: 'industry' },
      farm_barley: { cost: 60, upkeep: 6, workers: 8, priority: 'industry' },
      brewery: { cost: 100, upkeep: 8, workers: 8, priority: 'industry' },
      farm_flax: { cost: 60, upkeep: 6, workers: 8, priority: 'industry' },
      weaver: { cost: 110, upkeep: 8, workers: 8, priority: 'industry' },
      gem_mine: { cost: 140, upkeep: 10, workers: 10, priority: 'industry' },
      jeweller: { cost: 140, upkeep: 10, workers: 8, priority: 'industry' },
    });
  });
  it('gives each its footprint, category, road rule and ground', () => {
    const rows = Object.fromEntries(STAGE2.map((t) => [t, pick(BUILDINGS[t], ['w', 'd', 'category', 'needsRoad', 'terrain'])]));
    const big = (category, terrain) => ({ w: 2, d: 2, category, needsRoad: true, terrain });
    expect(rows).toEqual({
      garden: { w: 1, d: 1, category: 'homes', needsRoad: false, terrain: undefined },
      statue: { w: 1, d: 1, category: 'homes', needsRoad: false, terrain: undefined },
      farm_fig: big('food', 'fertile'),
      clay_pit: big('industry', undefined),
      potter: big('industry', undefined),
      storehouse: big('industry', undefined),
      booth: { w: 1, d: 1, category: 'services', needsRoad: true, terrain: undefined },
      trading_post: big('industry', undefined),
      farm_barley: big('industry', 'fertile'),
      brewery: big('industry', undefined),
      farm_flax: big('industry', 'fertile'),
      weaver: big('industry', undefined),
      gem_mine: big('industry', 'rocky'),
      jeweller: big('industry', undefined),
    });
    for (const b of Object.values(BUILDINGS)) if (b.terrain) expect(Object.keys(TERRAIN_BY_NAME)).toContain(b.terrain);
  });
  it('sets the monthly yields of spec 4.10, the workshops’ raw goods and a producer reach of 12', () => {
    const made = {}, used = {};
    for (const [t, b] of Object.entries(BUILDINGS)) {
      if (!b.produces) continue;
      made[t] = `${b.produces.good} ${b.produces.perMonth}`;
      if (b.consumes) used[t] = b.consumes;
      expect([t, b.producerReach]).toEqual([t, 12]);
    }
    expect(made).toEqual({
      farm_grain: 'grain 30', farm_fig: 'figs 24', clay_pit: 'clay 40', potter: 'pottery 30', farm_barley: 'barley 30',
      brewery: 'beer 25', farm_flax: 'flax 24', weaver: 'linen 20', gem_mine: 'gems 15', jeweller: 'jewellery 15',
    });
    expect(used).toEqual({ potter: 'clay', brewery: 'barley', weaver: 'flax', jeweller: 'gems' });
    for (const t of Object.keys(used)) {
      expect([t, GOODS[BUILDINGS[t].consumes].kind, GOODS[BUILDINGS[t].produces.good].kind]).toEqual([t, 'raw', 'household']);
    }
  });
  it('stores food in granaries and everything else in storehouses, and sells the six goods homes use', () => {
    expect(BUILDINGS.granary.stores).toEqual(['grain', 'figs']);
    expect(BUILDINGS.granary.capacity).toBe(600);
    expect(BUILDINGS.storehouse.stores).toEqual(['pottery', 'beer', 'linen', 'jewellery', 'clay', 'barley', 'flax', 'gems']);
    expect(BUILDINGS.storehouse.capacity).toBe(800);
    for (const g of Object.keys(GOODS)) {
      const homes = [BUILDINGS.granary, BUILDINGS.storehouse].filter((s) => s.stores.includes(g));
      expect([g, homes.length]).toEqual([g, 1]);                                   // every good has exactly one kind of store
    }
    expect(BUILDINGS.bazaar.sells).toEqual(['grain', 'figs', 'pottery', 'beer', 'linen', 'jewellery']);
    expect(BUILDINGS.bazaar.stock).toEqual({ grain: 300, figs: 200, pottery: 100, beer: 100, linen: 100, jewellery: 100 });
    expect(Object.keys(BUILDINGS.bazaar.stock)).toEqual(BUILDINGS.bazaar.sells);
  });
  it('makes the booth an entertainment service with a reach of 8 road tiles', () => {
    expect(pick(BUILDINGS.booth, ['provides', 'reach', 'points'])).toEqual({ provides: 'entertainment', reach: 8, points: 10 });
    const providers = Object.entries(BUILDINGS).filter(([, b]) => b.provides).map(([t, b]) => `${t} ${b.provides}`);
    expect(providers).toEqual(['well water', 'temple religion', 'booth entertainment']);
  });
  it('only references goods that exist, and every building is staffed by a known priority', () => {
    for (const [t, b] of Object.entries(BUILDINGS)) {
      const refs = [b.produces && b.produces.good, b.consumes, ...(b.stores || []), ...(b.sells || []), ...Object.keys(b.stock || {})].filter(Boolean);
      for (const g of refs) expect([t, g, Boolean(GOODS[g])]).toEqual([t, g, true]);
      if (b.workers > 0) expect(PRIORITY_LEVELS).toContain(b.priority);
    }
  });
});

describe('data tiers 5-9', () => {
  it('follows the spec 4.6 ladder: names, sizes, residents and tax', () => {
    expect(MAX_TIER).toBe(9);
    const rows = TIERS.slice(5).map((t) => [t.tier, t.name, t.size, t.capacity, t.tax]);
    expect(rows).toEqual([
      [5, 'Townhouse', 1, 22, 3], [6, 'Manor', 2, 100, 4], [7, 'Fine manor', 2, 125, 5], [8, 'Villa', 2, 150, 6], [9, 'Estate', 2, 180, 8],
    ]);
    for (let t = 1; t <= MAX_TIER; t++) expect(TIERS[t].tier).toBe(t);
  });
  it('adds one new demand per tier, beer and two foods together at Fine manor', () => {
    const added = [];
    for (let t = 5; t <= MAX_TIER; t++) added.push(TIERS[t].needs.filter((n) => !TIERS[t - 1].needs.includes(n)));
    expect(added).toEqual([['pottery'], ['entertainment'], ['beer', 'twoFoods'], ['linen'], ['jewellery']]);
    for (let t = 2; t <= MAX_TIER; t++) for (const n of TIERS[t - 1].needs) expect([t, n, TIERS[t].needs.includes(n)]).toEqual([t, n, true]);
  });
  it('asks tiers 6-9 for desirability to rise and a lower value to keep, and nothing below', () => {
    for (let t = 1; t <= 5; t++) expect([t, TIERS[t].desirability]).toEqual([t, undefined]);
    expect(TIERS.slice(6).map((t) => t.desirability)).toEqual([
      { rise: 20, keep: 15 }, { rise: 35, keep: 29 }, { rise: 50, keep: 43 }, { rise: 65, keep: 57 },
    ]);
    for (let t = 6; t <= MAX_TIER; t++) {
      expect(TIERS[t].desirability.keep).toBeLessThan(TIERS[t].desirability.rise);
      if (t > 6) expect(TIERS[t].desirability.keep).toBeGreaterThan(TIERS[t - 1].desirability.keep);
    }
  });
  it('never lets a merge or an upgrade lower capacity or tax per tile', () => {
    const perTile = (t) => [TIERS[t].capacity / TIERS[t].size ** 2, (TIERS[t].capacity * TIERS[t].tax) / TIERS[t].size ** 2];
    for (let t = 1; t < MAX_TIER; t++) {
      const [capA, taxA] = perTile(t), [capB, taxB] = perTile(t + 1);
      expect([t, capB >= capA, taxB >= taxA]).toEqual([t, true, true]);
    }
    expect(perTile(6)).toEqual([25, 100]);                                         // four Townhouses: 22 and 66 a tile
  });
});

describe('data milestones to Capital', () => {
  it('runs Village, Town, Market town, City, Great city and Capital with the spec 4.14 unlocks', () => {
    expect(MILESTONES.map((m) => [m.id, m.name, m.population])).toEqual([
      ['village', 'Village', 0], ['town', 'Town', 150], ['market_town', 'Market town', 250],
      ['city', 'City', 400], ['great_city', 'Great city', 650], ['capital', 'Capital', 1000],
    ]);
    expect(Object.fromEntries(MILESTONES.map((m) => [m.id, m.unlocks]))).toEqual({
      village: ['house', 'well', 'farm_grain', 'granary', 'bazaar', 'temple', 'garden'],
      town: ['farm_fig', 'clay_pit', 'potter', 'storehouse', 'booth', 'statue'],
      market_town: ['trading_post'],
      city: ['farm_barley', 'brewery'],
      great_city: ['farm_flax', 'weaver'],
      capital: ['gem_mine', 'jeweller'],
    });
  });
  it('unlocks every building exactly once, and nothing that does not exist', () => {
    const all = MILESTONES.flatMap((m) => m.unlocks);
    expect([...all].sort()).toEqual(Object.keys(BUILDINGS).sort());
  });
  it('unlocks each workshop no earlier than its raw good and the stores both need', () => {
    const at = (type) => MILESTONES.findIndex((m) => m.unlocks.includes(type));
    const rawMaker = (good) => Object.keys(BUILDINGS).find((t) => BUILDINGS[t].produces && BUILDINGS[t].produces.good === good);
    for (const t of ['potter', 'brewery', 'weaver', 'jeweller']) {
      const raw = rawMaker(BUILDINGS[t].consumes);
      expect([t, at(raw)]).toEqual([t, at(t)]);
      expect(at('storehouse')).toBeLessThanOrEqual(at(t));
    }
    expect(at('granary')).toBeLessThanOrEqual(at('farm_fig'));
  });
});

describe('data desirability', () => {
  it('gives every building but housing the spec 4.7 values, and only buildings that exist', () => {
    const types = Object.keys(BUILDINGS).filter((t) => t !== 'house');
    expect(Object.keys(DESIRABILITY).sort()).toEqual(types.sort());
    expect(DESIRABILITY).toEqual({
      garden: [3, 2, 1], statue: [8, 6, 4, 2], temple: [6, 6, 4, 4, 2, 2], booth: [3, 2, 1],
      bazaar: [-2, -1, 0, 1, 2, 3], well: [1], granary: [-8, -6, -4, -2], storehouse: [-6, -4, -2],
      farm_grain: [-2, -1], farm_fig: [-2, -1], farm_barley: [-2, -1], farm_flax: [-2, -1],
      clay_pit: [-6, -5, -4, -3, -2, -1], potter: [-4, -3, -2, -1], brewery: [-4, -3, -2, -1], weaver: [-4, -3, -2, -1],
      jeweller: [-4, -3, -2, -1], gem_mine: [-8, -6, -4, -2], trading_post: [-3, -2, -1],
    });
  });
  it('gives homes values by tier, from an empty plot to an Estate', () => {
    expect(HOUSE_DESIRABILITY.length).toBe(MAX_TIER + 1);
    expect(HOUSE_DESIRABILITY).toEqual([[], [-2, -1], [-1], [0], [1], [1, 1], [2, 2], [3, 2, 1], [4, 3, 2], [5, 4, 3, 2]]);
  });
  it('keeps every list to whole numbers over at most six tiles', () => {
    for (const [k, v] of [...Object.entries(DESIRABILITY), ...HOUSE_DESIRABILITY.map((v, t) => [`tier ${t}`, v])]) {
      expect([k, Array.isArray(v), v.length <= 6, v.every(Number.isInteger)]).toEqual([k, true, true, true]);
    }
  });
});

describe('data trade', () => {
  it('opens Memphis at Market town for 300 gold and Byblos at Great city for 600', () => {
    expect(Object.keys(PARTNERS)).toEqual(['memphis', 'byblos']);
    expect(Object.values(PARTNERS).map((p) => [p.name, p.milestone, p.routeCost])).toEqual([['Memphis', 'market_town', 300], ['Byblos', 'great_city', 600]]);
    for (const p of Object.values(PARTNERS)) expect(MILESTONES.some((m) => m.id === p.milestone)).toBe(true);
    expect([CARAVAN_EVERY_MONTHS, PRICE_DRIFT, TRADE_REACH, ARBITRAGE_MARGIN]).toEqual([3, 0.1, 16, 1.25]);
  });
  it('buys and sells the spec 4.15 goods at its prices and yearly quotas', () => {
    const list = (m) => Object.entries(m).map(([g, o]) => `${g} ${o.price} (${o.quota})`);
    expect(list(PARTNERS.memphis.buys)).toEqual(['grain 1 (300)', 'pottery 8 (200)', 'beer 10 (160)']);
    expect(list(PARTNERS.memphis.sells)).toEqual(['clay 2 (300)', 'figs 3 (200)', 'barley 3 (200)']);
    expect(list(PARTNERS.byblos.buys)).toEqual(['pottery 8 (120)', 'linen 14 (120)', 'jewellery 20 (80)']);
    expect(list(PARTNERS.byblos.sells)).toEqual(['flax 3 (160)', 'gems 9 (100)', 'beer 14 (100)']);
  });
  it('brings 40 of the first good on the sale list as the first caravan’s gift', () => {
    for (const [id, p] of Object.entries(PARTNERS)) expect([id, p.gift]).toEqual([id, { good: Object.keys(p.sells)[0], n: 40 }]);
  });
  it('trades only goods that exist, with positive whole prices and quotas a caravan can split in four', () => {
    for (const [id, p] of Object.entries(PARTNERS)) {
      for (const [g, o] of [...Object.entries(p.buys), ...Object.entries(p.sells)]) {
        expect([id, g, Boolean(GOODS[g]), o.price > 0, Number.isInteger(o.quota) && o.quota > 0, o.quota % 4]).toEqual([id, g, true, true, true, 0]);
      }
      for (const g of Object.keys(p.buys)) expect([id, g, g in p.sells]).toEqual([id, g, false]);   // never both ways
    }
  });
  it('allows no arbitrage: no partner sells a good for less than 1.25 times what any partner pays', () => {
    for (const seller of Object.values(PARTNERS)) {
      for (const [g, sale] of Object.entries(seller.sells)) {
        for (const buyer of Object.values(PARTNERS)) {
          if (!buyer.buys[g]) continue;
          expect([seller.name, buyer.name, g, sale.price >= buyer.buys[g].price * ARBITRAGE_MARGIN]).toEqual([seller.name, buyer.name, g, true]);
        }
      }
    }
    expect(PARTNERS.byblos.sells.beer.price / PARTNERS.memphis.buys.beer.price).toBeGreaterThanOrEqual(ARBITRAGE_MARGIN);   // the one good both ways
  });
  it('keeps the margin wider than a full year’s drift both ways, so drift can never cross it', () => {
    expect(ARBITRAGE_MARGIN).toBeGreaterThan((1 + PRICE_DRIFT) / (1 - PRICE_DRIFT));
  });
});
```

Create `tests/sim/economyUnlocks.test.js` (Stage 1 kept, the milestone walk, the garden's placement, a fig orchard filling a granary, route costs by level):

```js
import { describe, it, expect } from '../harness.js';
import { MILESTONES } from '../../src/data/progression.js';
import { DIFFICULTY_ORDER } from '../../src/data/difficulty.js';
import { updateMilestone, isUnlocked } from '../../src/sim/progression.js';
import { canPlace, place } from '../../src/sim/commands.js';
import { routeCostOf } from '../../src/sim/costs.js';
import { monthlyHousing, houseStatus } from '../../src/sim/housing.js';
import { produceDay } from '../../src/sim/production.js';
import { DAYS_PER_MONTH } from '../../src/sim/time.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y = 10.
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}
const later = MILESTONES.slice(1).flatMap((m) => m.unlocks);

describe('stage 2 unlocks', () => {
  it('keeps a Village to the Stage 1 buildings and the garden', () => {
    const w = street();
    expect(MILESTONES[0].unlocks.filter((t) => isUnlocked(w, t))).toEqual(MILESTONES[0].unlocks);
    for (const t of later) expect([t, isUnlocked(w, t), canPlace(w, t, 12, 8).reason]).toEqual([t, false, 'locked']);
    expect(canPlace(w, 'garden', 12, 8).ok).toBe(true);
  });
  it('walks the milestones by population, unlocking each one’s buildings and none of the next', () => {
    const w = street();
    const home = addRaw(w, 'house', 1, 1, { tier: 4, residents: 0 });
    for (let i = 1; i < MILESTONES.length; i++) {
      const m = MILESTONES[i];
      home.residents = m.population - 1;
      expect([m.id, updateMilestone(w)]).toEqual([m.id, false]);
      home.residents = m.population;
      expect([m.id, updateMilestone(w), w.milestone]).toEqual([m.id, true, m.id]);
      for (const t of m.unlocks) expect([t, isUnlocked(w, t)]).toEqual([t, true]);
      for (const t of (MILESTONES[i + 1] || { unlocks: [] }).unlocks) expect([t, isUnlocked(w, t)]).toEqual([t, false]);
    }
    expect(w.milestone).toBe('capital');
  });
  it('jumps straight to the highest milestone a population has reached', () => {
    const w = street();
    addRaw(w, 'house', 1, 1, { tier: 4, residents: 420 });
    expect(updateMilestone(w)).toBe(true);
    expect(w.milestone).toBe('city');
  });
  it('places a garden anywhere, with no road and no warning, since it needs neither', () => {
    const w = street();
    const r = canPlace(w, 'garden', 20, 20);
    expect([r.ok, r.warnings]).toEqual([true, []]);
    expect(canPlace(w, 'house', 20, 20).warnings).toEqual(['needs_road']);   // a plot still warns: no one moves in without a road
    expect(place(w, 'garden', 20, 20).ok).toBe(true);
  });
  it('keeps a House a House while nothing makes pottery, and names the Townhouse next', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16, stock: { grain: 4 } });
    addRaw(w, 'well', 13, 9);
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 100 } });
    addRaw(w, 'temple', 15, 8);
    staffAll(w);
    monthlyHousing(w);
    monthlyHousing(w);
    expect(h.tier).toBe(4);
    expect(h.downTimer).toBe(0);
    const s = houseStatus(w, h);
    expect(s.next).toEqual({ tier: 5, name: 'Townhouse' });
    expect(s.checklist.map((c) => c.need)).toEqual(['road', 'water', 'food', 'religion', 'pottery']);
  });
  it('sends a fig orchard’s figs to a granary and counts them as harvest', () => {
    const w = street();
    w.milestone = 'town';
    expect(place(w, 'farm_fig', 2, 8).ok).toBe(true);
    const granary = addRaw(w, 'granary', 5, 8);
    staffAll(w);
    for (let d = 0; d < DAYS_PER_MONTH; d++) produceDay(w);
    expect(granary.store).toEqual({ figs: 24 });
    expect(w.tally.harvested).toBe(24);
  });
  it('prices a trade route by the city’s difficulty', () => {
    const byLevel = (id) => DIFFICULTY_ORDER.map((d) => { const w = street(); w.difficulty = d; return routeCostOf(w, id); });
    expect(byLevel('memphis')).toEqual([240, 300, 375]);
    expect(byLevel('byblos')).toEqual([480, 600, 750]);
  });
});
```

Add the imports to `tests/all.js`, each after the line shown:

In `tests/all.js`, replace:

```js
import './data/data.test.js';
```

with:

```js
import './data/data.test.js';
import './data/economyData.test.js';
```

In `tests/all.js`, replace:

```js
import './sim/progression.test.js';
```

with:

```js
import './sim/progression.test.js';
import './sim/economyUnlocks.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "stage 2 unlocks"
```

Expected: the page cannot load, because `src/data/desirability.js` and `src/data/trade.js` do not exist yet (and `src/sim/costs.js` has no `routeCostOf`):

```
LOAD ERROR
TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:<port>/tests/all.js
```

- [ ] **Step 3: Implement**

Replace `src/data/goods.js` with (the `food: true` flag gives way to `kind`):

```js
// Goods (spec 4.10). kind: 'food' (homes eat it: grain from tier 3, figs as the second food from tier 7),
// 'household' (homes use it from the tier that needs it), 'raw' (only workshops use it). perResidentPerMonth is
// what a home uses, rounded up per home; raw goods have none.
export const GOODS = {
  grain: { name: 'Grain', kind: 'food', perResidentPerMonth: 0.25 },
  figs: { name: 'Figs', kind: 'food', perResidentPerMonth: 0.25 },
  pottery: { name: 'Pottery', kind: 'household', perResidentPerMonth: 0.05 },
  beer: { name: 'Beer', kind: 'household', perResidentPerMonth: 0.05 },
  linen: { name: 'Linen', kind: 'household', perResidentPerMonth: 0.04 },
  jewellery: { name: 'Jewellery', kind: 'household', perResidentPerMonth: 0.03 },
  clay: { name: 'Clay', kind: 'raw' },
  barley: { name: 'Barley', kind: 'raw' },
  flax: { name: 'Flax', kind: 'raw' },
  gems: { name: 'Gems', kind: 'raw' },
};

const ofKind = (kind) => Object.keys(GOODS).filter((k) => GOODS[k].kind === kind);
export const FOOD_GOODS = ofKind('food');            // grain first: the food every home from tier 3 eats
export const HOUSEHOLD_GOODS = ofKind('household');
export const RAW_GOODS = ofKind('raw');
```

Replace `src/data/buildings.js` with (the six Stage 1 entries are unchanged except `granary.stores` and the bazaar's `sells` and new `stock`; `capacity: 300` stays on the bazaar for its stall art and, until Task 4, its restocking):

```js
import { FOOD_GOODS, HOUSEHOLD_GOODS, RAW_GOODS } from './goods.js';

// w = footprint along x, d = footprint along y. reach values are in road tiles. A producer makes `perMonth` units
// at full staff; one with `consumes` (a workshop) turns one unit of that good into one unit of its own.
export const BUILDINGS = {
  house: { name: 'Housing plot', w: 1, d: 1, cost: 5, upkeep: 0, workers: 0, category: 'homes', needsRoad: false },
  well: { name: 'Well', w: 1, d: 1, cost: 30, upkeep: 3, workers: 0, category: 'services', needsRoad: true, provides: 'water', reach: 5 },
  farm_grain: {
    name: 'Grain farm', w: 2, d: 2, cost: 60, upkeep: 6, workers: 10, priority: 'essential', category: 'food',
    needsRoad: true, terrain: 'fertile', produces: { good: 'grain', perMonth: 30 }, producerReach: 12,
  },
  granary: {
    name: 'Granary', w: 2, d: 2, cost: 80, upkeep: 6, workers: 6, priority: 'essential', category: 'food',
    needsRoad: true, stores: ['grain', 'figs'], capacity: 600,
  },
  // stock: the most of each good a bazaar keeps (spec 4.10).
  bazaar: {
    name: 'Bazaar', w: 2, d: 2, cost: 60, upkeep: 8, workers: 6, priority: 'services', category: 'services',
    needsRoad: true, sells: [...FOOD_GOODS, ...HOUSEHOLD_GOODS], capacity: 300, reach: 10, supplyReach: 16,
    stock: { grain: 300, figs: 200, pottery: 100, beer: 100, linen: 100, jewellery: 100 },
  },
  temple: {
    name: 'Temple', w: 2, d: 2, cost: 120, upkeep: 10, workers: 6, priority: 'services', category: 'services',
    needsRoad: true, provides: 'religion', reach: 10,
  },
  // Stage 2 (spec 4.7, 4.10, 4.14, 4.15). Gardens and statues need no workers and no road.
  garden: { name: 'Garden', w: 1, d: 1, cost: 12, upkeep: 0, workers: 0, category: 'homes', needsRoad: false },
  statue: { name: 'Statue', w: 1, d: 1, cost: 60, upkeep: 0, workers: 0, category: 'homes', needsRoad: false },
  farm_fig: {
    name: 'Fig orchard', w: 2, d: 2, cost: 70, upkeep: 6, workers: 8, priority: 'essential', category: 'food',
    needsRoad: true, terrain: 'fertile', produces: { good: 'figs', perMonth: 24 }, producerReach: 12,
  },
  clay_pit: {
    name: 'Clay pit', w: 2, d: 2, cost: 50, upkeep: 5, workers: 6, priority: 'industry', category: 'industry',
    needsRoad: true, produces: { good: 'clay', perMonth: 40 }, producerReach: 12,
  },
  potter: {
    name: 'Potter', w: 2, d: 2, cost: 90, upkeep: 8, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, produces: { good: 'pottery', perMonth: 30 }, consumes: 'clay', producerReach: 12,
  },
  storehouse: {
    name: 'Storehouse', w: 2, d: 2, cost: 70, upkeep: 5, workers: 6, priority: 'essential', category: 'industry',
    needsRoad: true, stores: [...HOUSEHOLD_GOODS, ...RAW_GOODS], capacity: 800,
  },
  booth: {
    name: 'Booth', w: 1, d: 1, cost: 50, upkeep: 4, workers: 4, priority: 'services', category: 'services',
    needsRoad: true, provides: 'entertainment', reach: 8, points: 10,
  },
  trading_post: {
    name: 'Trading post', w: 2, d: 2, cost: 150, upkeep: 10, workers: 6, priority: 'industry', category: 'industry',
    needsRoad: true,
  },
  farm_barley: {
    name: 'Barley farm', w: 2, d: 2, cost: 60, upkeep: 6, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, terrain: 'fertile', produces: { good: 'barley', perMonth: 30 }, producerReach: 12,
  },
  brewery: {
    name: 'Brewery', w: 2, d: 2, cost: 100, upkeep: 8, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, produces: { good: 'beer', perMonth: 25 }, consumes: 'barley', producerReach: 12,
  },
  farm_flax: {
    name: 'Flax farm', w: 2, d: 2, cost: 60, upkeep: 6, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, terrain: 'fertile', produces: { good: 'flax', perMonth: 24 }, producerReach: 12,
  },
  weaver: {
    name: 'Weaver', w: 2, d: 2, cost: 110, upkeep: 8, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, produces: { good: 'linen', perMonth: 20 }, consumes: 'flax', producerReach: 12,
  },
  gem_mine: {
    name: 'Gem mine', w: 2, d: 2, cost: 140, upkeep: 10, workers: 10, priority: 'industry', category: 'industry',
    needsRoad: true, terrain: 'rocky', produces: { good: 'gems', perMonth: 15 }, producerReach: 12,
  },
  jeweller: {
    name: 'Jeweller', w: 2, d: 2, cost: 140, upkeep: 10, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, produces: { good: 'jewellery', perMonth: 15 }, consumes: 'gems', producerReach: 12,
  },
};
```

Replace `src/data/housing.js` with:

```js
// Index = tier. Tier 0 is an empty plot.
// 'road' access is implied for every tier; needs lists the extra needs, cumulative (spec 4.6). Tiers 6-9 are 2x2
// (size 2: merged from four plots) and need desirability: at least `rise` to grow into the tier, `keep` to hold it.
export const TIERS = [
  null,
  { tier: 1, name: 'Hut', size: 1, capacity: 5, tax: 1, needs: [] },
  { tier: 2, name: 'Shack', size: 1, capacity: 8, tax: 1, needs: ['water'] },
  { tier: 3, name: 'Cottage', size: 1, capacity: 12, tax: 2, needs: ['water', 'food'] },
  { tier: 4, name: 'House', size: 1, capacity: 16, tax: 2, needs: ['water', 'food', 'religion'] },
  { tier: 5, name: 'Townhouse', size: 1, capacity: 22, tax: 3, needs: ['water', 'food', 'religion', 'pottery'] },
  {
    tier: 6, name: 'Manor', size: 2, capacity: 100, tax: 4,
    needs: ['water', 'food', 'religion', 'pottery', 'entertainment'], desirability: { rise: 20, keep: 15 },
  },
  {
    tier: 7, name: 'Fine manor', size: 2, capacity: 125, tax: 5,
    needs: ['water', 'food', 'religion', 'pottery', 'entertainment', 'beer', 'twoFoods'], desirability: { rise: 35, keep: 29 },
  },
  {
    tier: 8, name: 'Villa', size: 2, capacity: 150, tax: 6,
    needs: ['water', 'food', 'religion', 'pottery', 'entertainment', 'beer', 'twoFoods', 'linen'], desirability: { rise: 50, keep: 43 },
  },
  {
    tier: 9, name: 'Estate', size: 2, capacity: 180, tax: 8,
    needs: ['water', 'food', 'religion', 'pottery', 'entertainment', 'beer', 'twoFoods', 'linen', 'jewellery'], desirability: { rise: 65, keep: 57 },
  },
];

export const MAX_TIER = TIERS.length - 1;
export const LEAVE_CAP = 0.25;              // most of a house's residents that can leave in one month
export const DOWNGRADE_AFTER_MONTHS = 2;    // consecutive unmet months before a house drops a tier
```

Replace `src/data/progression.js` with:

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
  { id: 'capital', name: 'Capital', population: 1000, unlocks: ['gem_mine', 'jeweller'] },
];
```

Create `src/data/desirability.js`:

```js
// Desirability (spec 4.7, tunable). Each building adds its values to the tiles around it by distance from the
// nearest tile of its footprint: index 0 is distance 1 (touching), up to distance 6. Values add where they overlap.
// Roads add nothing; housing adds HOUSE_DESIRABILITY by its tier instead.
const FARM = [-2, -1];
const WORKSHOP = [-4, -3, -2, -1];

export const DESIRABILITY = {
  garden: [3, 2, 1],
  statue: [8, 6, 4, 2],
  temple: [6, 6, 4, 4, 2, 2],
  booth: [3, 2, 1],
  bazaar: [-2, -1, 0, 1, 2, 3],
  well: [1],
  granary: [-8, -6, -4, -2],
  storehouse: [-6, -4, -2],
  farm_grain: FARM,
  farm_fig: FARM,
  farm_barley: FARM,
  farm_flax: FARM,
  clay_pit: [-6, -5, -4, -3, -2, -1],
  potter: WORKSHOP,
  brewery: WORKSHOP,
  weaver: WORKSHOP,
  jeweller: WORKSHOP,
  gem_mine: [-8, -6, -4, -2],
  trading_post: [-3, -2, -1],
};

// Index = tier, as TIERS: an empty plot adds nothing; Hut -2, -1; Shack -1; Cottage 0; House 1; Townhouse 1, 1;
// Manor 2, 2; Fine manor 3, 2, 1; Villa 4, 3, 2; Estate 5, 4, 3, 2.
export const HOUSE_DESIRABILITY = [
  [],
  [-2, -1],
  [-1],
  [0],
  [1],
  [1, 1],
  [2, 2],
  [3, 2, 1],
  [4, 3, 2],
  [5, 4, 3, 2],
];
```

Create `src/data/trade.js`:

```js
// Trade (spec 4.15, tunable). A partner opens once the city reaches its milestone and the player pays routeCost
// (scaled by difficulty: routeCostOf in src/sim/costs.js). buys: what it pays for the player's goods; sells: what it
// asks for its own; each good with a yearly quota, a quarter of which each caravan carries. A new route's first
// caravan brings a gift of the first good on its sale list.
export const PARTNERS = {
  memphis: {
    name: 'Memphis', milestone: 'market_town', routeCost: 300,
    buys: { grain: { price: 1, quota: 300 }, pottery: { price: 8, quota: 200 }, beer: { price: 10, quota: 160 } },
    sells: { clay: { price: 2, quota: 300 }, figs: { price: 3, quota: 200 }, barley: { price: 3, quota: 200 } },
    gift: { good: 'clay', n: 40 },
  },
  byblos: {
    name: 'Byblos', milestone: 'great_city', routeCost: 600,
    buys: { pottery: { price: 8, quota: 120 }, linen: { price: 14, quota: 120 }, jewellery: { price: 20, quota: 80 } },
    sells: { flax: { price: 3, quota: 160 }, gems: { price: 9, quota: 100 }, beer: { price: 14, quota: 100 } },
    gift: { good: 'flax', n: 40 },
  },
};

export const CARAVAN_EVERY_MONTHS = 3;   // a caravan from each open route every three game-months
export const PRICE_DRIFT = 0.1;          // prices drift by up to ±10% a year (seeded)
export const TRADE_REACH = 16;           // road tiles from the trading post to the stores its caravans use
export const ARBITRAGE_MARGIN = 1.25;    // no partner sells a good for less than this times what any partner pays
```

Replace `src/sim/costs.js` with (adds `routeCostOf` to Task 1's file):

```js
// What things cost in this city (spec 4.11, 4.18): the data's base cost times the city's difficulty, rounded to
// whole gold and never below 1. Every command, preview and card reads costs through here, so a Hard city's well
// costs the same on its card, in the confirm bar, in the treasury and in its undo. Trade routes too.
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { PARTNERS } from '../data/trade.js';

const scaled = (world, base) => Math.max(1, Math.round(base * DIFFICULTIES[world.difficulty].cost));

export const costOf = (world, type) => scaled(world, BUILDINGS[type].cost);

export const roadCostOf = (world) => scaled(world, ECONOMY.roadCost);

export const routeCostOf = (world, partnerId) => scaled(world, PARTNERS[partnerId].routeCost);
```

`src/sim/production.js`, in `produceDay` (goods carry a `kind` now):

In `src/sim/production.js`, replace:

```js
      if (GOODS[good].food) world.tally.harvested += 1;   // every unit of food that reaches storage
```

with:

```js
      if (GOODS[good].kind === 'food') world.tally.harvested += 1;   // every unit of food that reaches storage
```

`src/sim/commands.js`, in `placementWarnings` (a garden or statue off the road is not a problem; a plot still is, as before):

In `src/sim/commands.js`, replace:

```js
  if (!def.needsRoad && !touchesRoad(world, probe)) warnings.push('needs_road');
```

with:

```js
  // A plot can be placed off the road but no one moves in until one touches it; gardens and statues need none.
  if (type === 'house' && !touchesRoad(world, probe)) warnings.push('needs_road');
```


- [ ] **Step 4: Run the tests to see them pass**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "data "
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "stage 2 unlocks"
```

Expected: `33 passed` (the 23 new data tests with the existing `data` and `data difficulty` ones) and `7 passed`, each with `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

`grep -rn "milestone\|MILESTONES\|MAX_TIER\|FOOD_GOODS\|\.food\b" tests src` finds what the longer milestone list, the new tiers and the goods' `kind` touch. Results:
- `src/sim/production.js` read `GOODS[good].food`: changed in Step 3 (without it, `tally.harvested` stops counting and the `world v2` harvest tests fail).
- `tests/sim/events.test.js` "reports arrivals and the first milestone through tickDay" fills 30 Houses with 16 people each: 480 people now jump straight past Town to City, so the first milestone event is `city`, not `town`. Give them 6 each (180 people: a Town, short of Market town at 250):

In `tests/sim/events.test.js`, replace:

```js
    for (const b of Object.values(w.buildings)) if (b.type === 'house') b.residents = 16;
```

with:

```js
    for (const b of Object.values(w.buildings)) if (b.type === 'house') b.residents = 6;   // 180 people: a Town, short of Market town at 250
```

- Nothing else breaks. `tests/data/data.test.js` already loops to `MAX_TIER` (its per-tile and cumulative-needs checks now cover tiers 5-9) and checks unlocks and goods generically; `tests/sim/integration.test.js` peaks at 192 people (still a Town); `tests/sim/progression.test.js` uses 150; `tests/sim/daily.test.js` only edits `MILESTONES[0]`; `tests/ui/text.test.js` names every building from its data; the tier-4 homes in `tests/sim/*` never meet `pottery`, so none of them grows.

- [ ] **Step 6: Visual check**

Not a visual task: no art or interface changes. Between this task and Task 14, a House's sheet lists the Townhouse checklist with a `pottery` row whose name `NEED_NAMES` does not have yet, and the Housing overlay marks a House as missing a need (pottery). Tasks 6 and 14 give those rows their rule and words; nothing to do here.

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `sw-files.js` gains `./src/data/desirability.js` and `./src/data/trade.js` (120 entries), then `731 passed, 0 failed` and `ALL PASSED` (701 after Task 1, 30 new).

- [ ] **Step 8: Commit**

```powershell
git add src/data/goods.js src/data/buildings.js src/data/housing.js src/data/progression.js src/data/desirability.js src/data/trade.js src/sim/costs.js src/sim/production.js src/sim/commands.js sw-files.js tests/all.js tests/data/economyData.test.js tests/sim/economyUnlocks.test.js tests/sim/events.test.js
git commit -m @'
Add the Stage 2 data: ten goods, fourteen buildings, tiers 5 to 9, milestones to Capital and two trade partners

Goods now have a kind (food, household, raw); the buildings, yields, stores, the booth and the trading post,
the Townhouse to Estate ladder with its desirability to rise and keep, the economy unlocks from Town to
Capital, desirability by distance and Memphis and Byblos with their prices and quotas are all data, with
checks that no upgrade lowers capacity or tax per tile and that no partner can be played against another.
Route costs scale with difficulty. Nothing new is reachable before Town except the garden.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 3: Production chains and the storehouse

**Files:**
- Modify: `src/sim/production.js` (whole file below)
- Modify: `src/sim/world.js` (`makeBuilding`)
- Modify: `src/sim/alerts.js`
- Modify: `src/sim/commands.js` (one import, one line in `placementWarnings`, new `setAccept`)
- Create: `tests/sim/chains.test.js`
- Modify: `tests/all.js`, `sw-files.js` (regenerated)

**Interfaces:**
- Consumes (Task 1): `world.tally.made` (`{}`). (Task 2): `FOOD_GOODS`; `BUILDINGS.clay_pit` (produces clay 40/month), `potter` (produces pottery 30/month, `consumes: 'clay'`), `farm_fig` (figs 24/month, fertile), `granary.stores = ['grain', 'figs']` with `capacity: 600`, `storehouse` (`stores` = every non-food good, `capacity: 800`), `producerReach: 12` on every producer; `MILESTONES` with `clay_pit` unlocked at `town`.
- Produces: `storeAccepts(b, good)`; `hasSpace(s)` (now exported) and `storeTotal(b)` (unchanged); `produceDay` with workshop inputs, `b.blocked` one of `'paused' | 'understaffed' | 'no_input' | 'no_storage' | 'storage_full' | null`, and `tally.made[good]` for every unit made (food still adds `tally.harvested`); `makeBuilding` gives a storehouse `accepts: {}`; command `setAccept(world, id, good, accept)` → `{ ok: true }` or `{ ok: false, reason: 'nothing_here' | 'not_storage' }`; alerts `{ code: 'no_input', id: producer }` and `{ code: 'storage_full', id: store }` for any store whose goods fill its capacity (besides the existing producer `storage_full`).

The rules, as built and tested here:
- A producer with `consumes` waits with `blocked = 'no_input'` while no store within its producer reach holds the input. Input is drawn from any store holding it (working or not, refused or not: the rule bazaars restock by), nearest first.
- Output goes to the nearest working store within producer reach that `storeAccepts` the good and has room; with none, `blocked = 'no_storage'` and no progress is added that day. A store that fills part-way through the day stops the producer with `'storage_full'`.
- Each unit takes its input first, then looks for room. So a storehouse that is full of clay still takes the potter's pots (each pot takes the place of its clay) and a potter beside a full storehouse never deadlocks; if there is still no room, the input goes back.
- A refused good already in a storehouse stays and can still be drawn on. Accepting deletes the entry, so a storehouse that takes everything has `accepts: {}`. Only a storehouse has the switches (`not_storage` for a granary, or for a good the storehouse does not store).
- The `no_storage` placement warning now asks `storeAccepts`, so a store that refuses the good no longer counts.
- Production counts food with `FOOD_GOODS.includes(good)`, so it works whether Task 2's goods carry `kind: 'food'` or the old `food: true`.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/chains.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { produceDay, storeAccepts, storeTotal } from '../../src/sim/production.js';
import { setAccept, canPlace } from '../../src/sim/commands.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { makeBuilding } from '../../src/sim/world.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { DAYS_PER_MONTH } from '../../src/sim/time.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y = 10; 2x2 buildings at y = 8 touch it. Two such buildings at x and x' (x' >= x + 2) sit x' - x road
// tiles apart, so with a producer reach of 12 a store 12 along is in reach and one 13 along is not.
function row() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}
const month = (w) => { for (let d = 0; d < DAYS_PER_MONTH; d++) produceDay(w); };
const alertKeys = (w) => alertsFor(w).map((a) => `${a.code}:${a.id}`);

describe('production chains', () => {
  it('fills a storehouse from a clay pit at 40 a month, counting what was made but not as a harvest', () => {
    const w = row();
    const pit = addRaw(w, 'clay_pit', 10, 8);
    const store = addRaw(w, 'storehouse', 13, 8);
    staffAll(w);
    month(w);
    expect(store.store.clay).toBe(40);
    expect(pit.blocked).toBe(null);
    expect(w.tally.made.clay).toBe(40);
    expect(w.tally.harvested).toBe(0);
  });
  it('still counts grain reaching a granary as a harvest, and as grain made', () => {
    const w = row();
    addRaw(w, 'farm_grain', 2, 8);
    const granary = addRaw(w, 'granary', 5, 8);
    staffAll(w);
    month(w);
    expect(granary.store.grain).toBe(30);
    expect(w.tally.harvested).toBe(30);
    expect(w.tally.made.grain).toBe(30);
  });
  it('makes 30 pottery a month at full staff, one clay for each pot, from and to the storehouse', () => {
    const w = row();
    const store = addRaw(w, 'storehouse', 13, 8, { store: { clay: 100 } });
    const potter = addRaw(w, 'potter', 16, 8);
    staffAll(w);
    month(w);
    expect(store.store.pottery).toBe(30);
    expect(store.store.clay).toBe(70);
    expect(potter.blocked).toBe(null);
    expect(w.tally.made.pottery).toBe(30);
    expect(w.tally.made.clay).toBe(undefined);
  });
  it('makes half as much at half staff', () => {
    const w = row();
    const store = addRaw(w, 'storehouse', 13, 8, { store: { clay: 100 } });
    const potter = addRaw(w, 'potter', 16, 8);
    staffAll(w);
    potter.staff = BUILDINGS.potter.workers / 2;
    month(w);
    expect(store.store.pottery).toBe(15);
    expect(store.store.clay).toBe(85);
  });
  it('runs a whole chain: clay pit to storehouse to potter and back', () => {
    const w = row();
    addRaw(w, 'clay_pit', 10, 8);
    const store = addRaw(w, 'storehouse', 13, 8);
    addRaw(w, 'potter', 16, 8);
    staffAll(w);
    month(w);
    month(w);
    expect(w.tally.made.clay).toBe(80);
    expect(store.store.pottery).toBe(60);   // the pit digs at least one clay a day, so the potter never waits
    expect(store.store.clay).toBe(20);      // every pot used up one of the 80 clay dug
  });
  it('waits with no_input while no store within producer reach holds clay, and says so in the alerts', () => {
    const w = row();
    const near = addRaw(w, 'storehouse', 13, 8);
    const far = addRaw(w, 'storehouse', 23, 8, { store: { clay: 50 } });   // 13 road tiles from the potter: out of reach
    const potter = addRaw(w, 'potter', 10, 8);
    staffAll(w);
    produceDay(w);
    expect(potter.blocked).toBe('no_input');
    expect(potter.progress).toBe(0);
    expect(far.store.clay).toBe(50);
    expect(alertKeys(w)).toContain(`no_input:${potter.id}`);
    near.store.clay = 5;
    produceDay(w);
    expect(potter.blocked).toBe(null);
    expect(alertKeys(w).some((k) => k.startsWith('no_input'))).toBe(false);
  });
  it('draws on a store exactly at the edge of its reach', () => {
    const w = row();
    const edge = addRaw(w, 'storehouse', 22, 8, { store: { clay: 50 } });   // 12 road tiles from the potter
    const potter = addRaw(w, 'potter', 10, 8);
    staffAll(w);
    month(w);
    expect(potter.blocked).toBe(null);
    expect(edge.store.pottery).toBe(30);
  });
  it('stops mid-month with no_input when the clay runs out', () => {
    const w = row();
    const store = addRaw(w, 'storehouse', 13, 8, { store: { clay: 4 } });
    const potter = addRaw(w, 'potter', 16, 8);
    staffAll(w);
    month(w);
    expect(store.store.pottery).toBe(4);
    expect(store.store.clay).toBe(0);
    expect(potter.blocked).toBe('no_input');
  });
  it('takes clay from the nearest store holding it', () => {
    const w = row();
    const far = addRaw(w, 'storehouse', 5, 8, { store: { clay: 20 } });   // 11 road tiles from the potter
    const near = addRaw(w, 'storehouse', 13, 8, { store: { clay: 20 } });
    addRaw(w, 'potter', 16, 8);
    staffAll(w);
    for (let d = 0; d < 10; d++) produceDay(w);
    expect(near.store.clay).toBe(10);
    expect(near.store.pottery).toBe(10);
    expect(far.store.clay).toBe(20);
  });
  it('keeps a full storehouse that holds clay working: each pot takes the place of its clay', () => {
    const w = row();
    const store = addRaw(w, 'storehouse', 13, 8, { store: { clay: 800 } });
    const potter = addRaw(w, 'potter', 16, 8);
    const pit = addRaw(w, 'clay_pit', 10, 8);
    staffAll(w);
    month(w);
    expect(store.store.pottery).toBe(30);
    expect(store.store.clay).toBe(770);
    expect(storeTotal(store)).toBe(800);
    expect(potter.blocked).toBe(null);
    expect(pit.blocked).toBe('no_storage');
  });
  it('sends a refused good to the next store that takes it, and stops with no_storage when none does', () => {
    const w = row();
    const pit = addRaw(w, 'clay_pit', 10, 8);
    const near = addRaw(w, 'storehouse', 13, 8);
    const next = addRaw(w, 'storehouse', 16, 8);
    staffAll(w);
    expect(setAccept(w, near.id, 'clay', false).ok).toBe(true);
    for (let d = 0; d < 3; d++) produceDay(w);
    expect(near.store.clay || 0).toBe(0);
    expect(next.store.clay).toBe(4);
    expect(setAccept(w, next.id, 'clay', false).ok).toBe(true);
    produceDay(w);
    expect(pit.blocked).toBe('no_storage');
    expect(alertKeys(w)).toContain(`no_storage:${pit.id}`);
    expect(next.store.clay).toBe(4);                     // refusing keeps what it already holds
    expect(setAccept(w, near.id, 'clay', true).ok).toBe(true);
    produceDay(w);
    expect(pit.blocked).toBe(null);
  });
  it('still lets a workshop draw on a good its storehouse refuses, but never delivers to it', () => {
    const w = row();
    const refusing = addRaw(w, 'storehouse', 13, 8, { store: { clay: 10 } });
    const potter = addRaw(w, 'potter', 16, 8);
    staffAll(w);
    setAccept(w, refusing.id, 'clay', false);
    for (let d = 0; d < 3; d++) produceDay(w);
    expect(refusing.store.clay).toBe(7);
    expect(refusing.store.pottery).toBe(3);
    setAccept(w, refusing.id, 'pottery', false);
    produceDay(w);
    expect(potter.blocked).toBe('no_storage');
    expect(refusing.store.clay).toBe(7);
  });
  it('lets a granary take only food: figs yes, clay no', () => {
    const w = row();
    const orchard = addRaw(w, 'farm_fig', 2, 8);
    const granary = addRaw(w, 'granary', 5, 8);
    const pit = addRaw(w, 'clay_pit', 10, 8);
    staffAll(w);
    month(w);
    expect(granary.store.figs).toBe(24);
    expect(granary.store.clay).toBe(undefined);
    expect(orchard.blocked).toBe(null);
    expect(pit.blocked).toBe('no_storage');
    expect(w.tally.harvested).toBe(24);                  // figs are food: they count as a harvest too
    expect(w.tally.made.figs).toBe(24);
  });
  it('delivers only to a working store', () => {
    const w = row();
    const pit = addRaw(w, 'clay_pit', 10, 8);
    const store = addRaw(w, 'storehouse', 13, 8);
    staffAll(w);
    store.paused = true;
    produceDay(w);
    expect(pit.blocked).toBe('no_storage');
    store.paused = false;
    produceDay(w);
    expect(pit.blocked).toBe(null);
  });
  it('raises storage_full on any full store, granary or storehouse', () => {
    const w = row();
    const granary = addRaw(w, 'granary', 2, 8, { store: { grain: 600 } });
    const store = addRaw(w, 'storehouse', 13, 8, { store: { clay: 500, pottery: 299 } });
    staffAll(w);
    expect(alertKeys(w)).toContain(`storage_full:${granary.id}`);
    expect(alertKeys(w).includes(`storage_full:${store.id}`)).toBe(false);
    store.store.pottery = 300;
    expect(alertKeys(w)).toContain(`storage_full:${store.id}`);
  });
  it('says which stores accept a good', () => {
    const w = row();
    const granary = addRaw(w, 'granary', 2, 8);
    const store = addRaw(w, 'storehouse', 13, 8);
    expect(storeAccepts(granary, 'grain')).toBe(true);
    expect(storeAccepts(granary, 'figs')).toBe(true);
    expect(storeAccepts(granary, 'clay')).toBe(false);
    expect(storeAccepts(store, 'pottery')).toBe(true);
    expect(storeAccepts(store, 'grain')).toBe(false);
    expect(storeAccepts(addRaw(w, 'potter', 16, 8), 'pottery')).toBe(false);
    setAccept(w, store.id, 'pottery', false);
    expect(storeAccepts(store, 'pottery')).toBe(false);
    expect(storeAccepts(store, 'clay')).toBe(true);
  });
  it('gives a new storehouse an empty accepts record and nothing else one', () => {
    const w = row();
    expect(makeBuilding(w, 'storehouse', 13, 8).accepts).toEqual({});
    expect('accepts' in makeBuilding(w, 'granary', 2, 8)).toBe(false);
    expect('accepts' in makeBuilding(w, 'potter', 2, 8)).toBe(false);
  });
  it('setAccept: only a storehouse, and only for a good it stores', () => {
    const w = row();
    const granary = addRaw(w, 'granary', 2, 8);
    const store = addRaw(w, 'storehouse', 13, 8);
    expect(setAccept(w, 999, 'clay', false)).toEqual({ ok: false, reason: 'nothing_here', warnings: [] });
    expect(setAccept(w, granary.id, 'grain', false).reason).toBe('not_storage');
    expect(setAccept(w, store.id, 'grain', false).reason).toBe('not_storage');
    expect(setAccept(w, store.id, 'nonsense', false).reason).toBe('not_storage');
    expect(setAccept(w, store.id, 'beer', false)).toEqual({ ok: true, warnings: [] });
    expect(store.accepts).toEqual({ beer: false });
    expect(JSON.parse(JSON.stringify(store)).accepts).toEqual({ beer: false });   // plain data: it saves
    expect(setAccept(w, store.id, 'beer', true).ok).toBe(true);
    expect(store.accepts).toEqual({});
  });
  it('warns on placement when no store within reach accepts the good', () => {
    const w = row();
    const store = addRaw(w, 'storehouse', 13, 8);
    w.milestone = 'town';                                  // clay pits unlock at Town
    expect(canPlace(w, 'clay_pit', 10, 8).warnings).toEqual([]);
    setAccept(w, store.id, 'clay', false);
    expect(canPlace(w, 'clay_pit', 10, 8).warnings).toEqual(['no_storage']);
  });
});
```

In `tests/all.js`, add the import directly after `import './sim/production.test.js';`:

```js
import './sim/chains.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "production chains"`
Expected: the page does not load, so nothing runs:
```
LOAD ERROR
SyntaxError: The requested module '../../src/sim/commands.js' does not provide an export named 'setAccept'
```
(or the same for `storeAccepts` from `production.js`, whichever the browser resolves first).

- [ ] **Step 3: Implement**

Replace the whole of `src/sim/production.js` with:

```js
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { allBuildings } from './world.js';
import { buildingsInReach } from './reach.js';
import { isWorking, staffRatio } from './labour.js';
import { DAYS_PER_MONTH } from './time.js';

export const storeTotal = (b) => Object.values(b.store).reduce((s, v) => s + v, 0);

// A store has room while all its goods together are under its capacity.
export const hasSpace = (s) => storeTotal(s) < BUILDINGS[s.type].capacity;

// Whether a store takes deliveries of a good (spec 4.10): it is built to hold the good and, for a storehouse, the
// player has not refused it (b.accepts[good] === false, set by setAccept). A refused good it already holds stays
// there and can still be drawn on by workshops and bazaars.
export function storeAccepts(b, good) {
  if (!(BUILDINGS[b.type].stores || []).includes(good)) return false;
  return !(b.accepts && b.accepts[good] === false);
}

const holds = (o, good) => (BUILDINGS[o.type].stores || []).includes(good) && (o.store[good] || 0) > 0;

// Working stores within the producer's reach that take the good, nearest first, with room or not.
function outputStores(world, b, good) {
  return buildingsInReach(world, b, BUILDINGS[b.type].producerReach, (o) => storeAccepts(o, good) && isWorking(world, o)).map((r) => r.b);
}

// Stores within the producer's reach holding its input, nearest first, working or not: the rule bazaars restock by.
function inputStores(world, b, input) {
  return buildingsInReach(world, b, BUILDINGS[b.type].producerReach, (o) => holds(o, input)).map((r) => r.b);
}

// One unit (spec 4.10): a workshop takes one of its input from the nearest store holding it, then the good goes to
// the nearest store with room. Taking the input first means a full storehouse that gave up the clay has room for
// the pot, so a storehouse filled with clay never stops its potter. Returns null, or why the unit could not be made.
function makeOne(world, good, input, sources, targets) {
  let from = null;
  if (input) {
    from = sources.find((s) => (s.store[input] || 0) > 0);
    if (!from) return 'no_input';
    from.store[input] -= 1;
  }
  const to = targets.find(hasSpace);
  if (!to) {
    if (from) from.store[input] += 1;
    return 'storage_full';
  }
  to.store[good] = (to.store[good] || 0) + 1;
  world.tally.made[good] = (world.tally.made[good] || 0) + 1;
  if (FOOD_GOODS.includes(good)) world.tally.harvested += 1;   // every unit of food that reaches storage
  return null;
}

// Producers make output daily, scaled by staffing (spec 4.10). b.blocked says why one is idle: paused, understaffed,
// no_input (a workshop with none of its input in any store within its producer reach), no_storage (no working
// store within reach that takes the good has room for it) or storage_full (its stores filled up during the day).
export function produceDay(world) {
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.produces) continue;
    if (!isWorking(world, b)) { b.blocked = b.paused ? 'paused' : 'understaffed'; continue; }
    const { good, perMonth } = def.produces;
    const input = def.consumes || null;
    const sources = input ? inputStores(world, b, input) : [];
    if (input && !sources.length) { b.blocked = 'no_input'; continue; }
    const targets = outputStores(world, b, good);
    if (!targets.some(hasSpace) && !(input && targets.includes(sources[0]))) { b.blocked = 'no_storage'; continue; }
    b.blocked = null;
    b.progress += (perMonth / DAYS_PER_MONTH) * staffRatio(world, b);
    while (b.progress >= 1 - 1e-9) {
      const why = makeOne(world, good, input, sources, targets);
      if (why) { b.blocked = why; break; }
      b.progress -= 1;
    }
  }
}
```

In `src/sim/world.js`, `makeBuilding`, replace:

```js
  if (type === 'house') Object.assign(b, { tier: 0, residents: 0, stock: {}, met: {}, downTimer: 0, leftThisMonth: 0, stockedFor: 0 });
  return b;
```

with:

```js
  if (type === 'house') Object.assign(b, { tier: 0, residents: 0, stock: {}, met: {}, downTimer: 0, leftThisMonth: 0, stockedFor: 0 });
  if (type === 'storehouse') b.accepts = {};   // good -> false where the player refused it (setAccept, spec 4.10)
  return b;
```

In `src/sim/alerts.js`, add to the imports:

```js
import { storeTotal } from './production.js';
```

and in `alertsFor` replace:

```js
    if (b.blocked === 'storage_full') alerts.push({ code: 'storage_full', id: b.id });
```

with:

```js
    if (b.blocked === 'storage_full') alerts.push({ code: 'storage_full', id: b.id });
    if (b.blocked === 'no_input') alerts.push({ code: 'no_input', id: b.id });
    if (def.stores && storeTotal(b) >= def.capacity) alerts.push({ code: 'storage_full', id: b.id });   // any full store
```

In `src/sim/commands.js`, add to the imports at the top (after the existing ones, whatever Task 1 added):

```js
import { storeAccepts } from './production.js';
```

In `placementWarnings`, replace:

```js
  if (def.produces && !buildingsInReach(world, probe, def.producerReach, (o) => storesAny(o, [def.produces.good])).length) {
```

with:

```js
  if (def.produces && !buildingsInReach(world, probe, def.producerReach, (o) => storeAccepts(o, def.produces.good)).length) {
```

(`storesAny` stays: the `no_supply` check for bazaars still uses it.) Then add this function directly after `setGuide`:

```js
// A storehouse's switch for one good (spec 4.10). Refused, producers send the good to other stores or stop with
// no_storage; what the storehouse already holds stays and can still be drawn on. Only a storehouse has the switches,
// and only for the goods it stores. Accepting deletes the entry, so a storehouse that takes everything has accepts {}.
export function setAccept(world, id, good, accept) {
  const b = world.buildings[id];
  if (!b) return fail('nothing_here');
  if (b.type !== 'storehouse' || !(BUILDINGS[b.type].stores || []).includes(good)) return fail('not_storage');
  if (!b.accepts) b.accepts = {};
  if (accept) delete b.accepts[good];
  else b.accepts[good] = false;
  return { ok: true, warnings: [] };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "production"`
Expected: `23 passed, 0 failed` (the four existing `production` tests and the 19 new `production chains` tests) and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

None. Checked against the whole suite: `tests/sim/production.test.js` (grain to a granary: the same nearest-store-with-room rule), `tests/sim/commands.test.js` and `tests/ui/placement*.test.js` (the `no_storage` warning: a granary still accepts grain), `tests/sim/economy.test.js`, `tests/ui/alerts.test.js`, `tests/ui/sheets.test.js` (they set `blocked` by hand) and `tests/render/lifeArt.test.js` (full granaries, but no alert lists) all pass unchanged. The new store-level `storage_full` alert uses the code the interface already words ("Granary has no room left in storage"); `no_input` falls to `alertText`'s default until Task 12 adds its words, and `nudge.js` prices a `storage_full` fix as a granary until then (Task 12).

- [ ] **Step 6: Visual check**

Not a visual task (sim only).

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```
Expected: `ALL PASSED` (19 more tests than after Task 2).

- [ ] **Step 8: Commit**

```powershell
git add src/sim/production.js src/sim/world.js src/sim/alerts.js src/sim/commands.js tests/sim/chains.test.js tests/all.js sw-files.js
git commit -m @'
Run production chains through the storehouse, with accept switches per good

Workshops take one unit of their raw good from the nearest store within reach
for each unit they make and wait with "no input" when there is none; output
goes to the nearest working store that accepts the good and has room. A
storehouse can refuse a good (setAccept) and keeps what it already holds. Every
unit made is tallied by good, full stores raise "storage full", and a full
storehouse of clay still takes its potter's pots.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 4: Distribution of many goods

> **Controller ruling (adds to this task).** A home that does not want two foods tops up its food from the food its bazaar holds most of first (ties go to grain), then fills any gap from the other, instead of grain first: the Task 17 long run found surplus figs filling the granaries and blocking the grain farms. Two-food homes keep the half-and-half rule. Add one test to `tests/sim/distributionGoods.test.js`: a tier-4 home whose bazaar holds 10 grain and 40 figs takes its food from figs.


**Files:**
- Modify: `src/sim/distribution.js` (whole file below)
- Modify: `src/sim/housing.js` (imports, `wantedGoods`, the food-need helper, a new `consumeGood`, the `met` block in `monthlyHousing`, `graneriesFor`)
- Create: `tests/sim/distributionGoods.test.js`
- Modify: `tests/all.js`, `sw-files.js` (regenerated)

**Interfaces:**
- Consumes (Task 2): `GOODS` (every food at `perResidentPerMonth: 0.25`; pottery 0.05, beer 0.05, linen 0.04, jewellery 0.03), `FOOD_GOODS` (`grain`, `figs`), `HOUSEHOLD_GOODS` (`pottery`, `beer`, `linen`, `jewellery`); `BUILDINGS.bazaar.sells` (the six food and household goods) and `BUILDINGS.bazaar.stock` (`grain: 300`, `figs: 200`, others 100); `TIERS` 5-9 needs (5 `pottery`; 6 `entertainment`; 7 `beer`, `twoFoods`; 8 `linen`; 9 `jewellery`). (Task 3): the storehouse holds the household goods the bazaar draws on.
- Produces: `restockBazaars` (each good up to `stock[good]`, from stores within `supplyReach`, nearest first); `wantedGoods(house)` (every food once food is wanted, plus each household good the current or next tier needs); `topUpHouse(world, house, goods, bazaars, { twoFoods })`; in `monthlyHousing`, `house.met.twoFoods` (grain and figs both in stock before the month's eating) and `house.met[good]` for each wanted household good (the stock covered the month's use at the check, judged on the residents it was stocked for; the use is then taken from stock).

The rules, as built and tested here:
- Foods share one month's need (`monthlyNeed(house, FOOD_GOODS[0])`), met by any mix ("fed" is unchanged: `consumeFood` already eats any food). A home that wants two foods first takes each food up to half the need, rounded up; then any home fills what is still short from whichever food is there, grain first. Topping up never takes the food on hand past the month's need, so a home of 100 needing 25 holds 13 grain and 12 figs.
- A home that wants one food fills its need from grain, then from figs if grain runs short (figs feed a Cottage too).
- Each household good a home wants is topped up to its own month's need, rounded up per home (a House of 16 takes 1 pottery).
- `graneriesFor` (the empty-granary branch of `needCause` for food) now looks only at stores of a food the bazaar sells. With the bazaar selling household goods since Task 2, a storehouse nearer the bazaar than the granary was being named as the empty granary.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/distributionGoods.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { restockBazaars, bazaarsByHouse, topUpHouse, monthlyNeed } from '../../src/sim/distribution.js';
import { monthlyHousing, wantedGoods, needCause } from '../../src/sim/housing.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y = 10. Stores and the bazaar (2x2) sit at y = 8 above it; homes sit at y = 11 below it. The bazaar at
// x = 9 draws on stores up to 16 road tiles away (a 2x2 store at x = 25 is the last in reach) and serves the homes
// on this stretch of road.
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  return w;
}
const sorted = (list) => list.slice().sort();
const manor = (w, extra = {}) => addRaw(w, 'house', 14, 11, { tier: 6, residents: 100, w: 2, d: 2, ...extra });   // wants two foods next

describe('distribution of many goods', () => {
  it('restocks each good a bazaar sells up to its own stock level, from the stores that hold it', () => {
    const w = street();
    const granary = addRaw(w, 'granary', 2, 8, { store: { grain: 500, figs: 500 } });
    const store = addRaw(w, 'storehouse', 5, 8, { store: { pottery: 150, beer: 30, clay: 40 } });
    const bz = addRaw(w, 'bazaar', 9, 8);
    staffAll(w);
    restockBazaars(w);
    const stock = BUILDINGS.bazaar.stock;
    expect(bz.store.grain).toBe(stock.grain);
    expect(bz.store.figs).toBe(stock.figs);
    expect(bz.store.pottery).toBe(stock.pottery);
    expect(bz.store.beer).toBe(30);
    expect(bz.store.clay).toBe(undefined);                 // a raw good is never sold
    expect(granary.store.grain).toBe(500 - stock.grain);
    expect(granary.store.figs).toBe(500 - stock.figs);
    expect(store.store.pottery).toBe(150 - stock.pottery);
    expect(store.store.beer).toBe(0);
    expect(store.store.clay).toBe(40);
  });
  it('tops a good up to its level, nearest store first, and never from a store out of supply reach', () => {
    const w = street();
    const far = addRaw(w, 'storehouse', 27, 8, { store: { pottery: 100 } });   // 18 road tiles away
    const next = addRaw(w, 'storehouse', 22, 8, { store: { pottery: 100 } });
    const near = addRaw(w, 'storehouse', 2, 8, { store: { pottery: 30 } });
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { pottery: 40 } });
    staffAll(w);
    restockBazaars(w);
    const level = BUILDINGS.bazaar.stock.pottery;
    expect(bz.store.pottery).toBe(level);
    expect(near.store.pottery).toBe(0);
    expect(next.store.pottery).toBe(100 - (level - 40 - 30));
    expect(far.store.pottery).toBe(100);
  });
  it('leaves an idle bazaar empty', () => {
    const w = street();
    addRaw(w, 'storehouse', 5, 8, { store: { pottery: 100 } });
    const bz = addRaw(w, 'bazaar', 9, 8);
    restockBazaars(w);                                     // nobody works there
    expect(bz.store.pottery).toBe(undefined);
  });
  it('wants the foods and every household good of the current or next tier', () => {
    const w = street();
    const at = (tier) => sorted(wantedGoods(addRaw(w, 'house', 2 * tier, 20, { tier, residents: 5 })));
    expect(at(0)).toEqual([]);
    expect(at(1)).toEqual([]);
    expect(at(2)).toEqual(sorted(['grain', 'figs']));
    expect(at(3)).toEqual(sorted(['grain', 'figs']));
    expect(at(4)).toEqual(sorted(['grain', 'figs', 'pottery']));
    expect(at(5)).toEqual(sorted(['grain', 'figs', 'pottery']));
    expect(at(6)).toEqual(sorted(['grain', 'figs', 'pottery', 'beer']));
    expect(at(7)).toEqual(sorted(['grain', 'figs', 'pottery', 'beer', 'linen']));
    expect(at(8)).toEqual(sorted(['grain', 'figs', 'pottery', 'beer', 'linen', 'jewellery']));
    expect(at(9)).toEqual(sorted(['grain', 'figs', 'pottery', 'beer', 'linen', 'jewellery']));
  });
  it('tops a home up to one month of each household good it wants, rounded up, and no more', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 50, pottery: 50, beer: 50 } });
    const h = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16 });
    staffAll(w);
    const list = bazaarsByHouse(w).get(h.id);
    topUpHouse(w, h, wantedGoods(h), list);
    expect(monthlyNeed(h, 'pottery')).toBe(1);             // 16 x 0.05 = 0.8, rounded up per home
    expect(h.stock.pottery).toBe(1);
    expect(h.stock.grain).toBe(4);
    expect(h.stock.beer).toBe(undefined);                  // a House does not want beer yet
    topUpHouse(w, h, wantedGoods(h), list);
    expect(h.stock.pottery).toBe(1);
    expect(bz.store.pottery).toBe(49);
  });
  it('fills a home that wants one food from grain first, then from figs when grain is short', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 2, figs: 50 } });
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12 });
    staffAll(w);
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id));
    expect(h.stock.grain).toBe(2);
    expect(h.stock.figs).toBe(1);
    expect(bz.store.figs).toBe(49);
  });
  it('gives a home that wants two foods half of its need from each', () => {
    const w = street();
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 100, figs: 100 } });
    const h = manor(w);
    staffAll(w);
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id), { twoFoods: true });
    expect(monthlyNeed(h, 'grain')).toBe(25);
    expect(h.stock.grain).toBe(13);                        // half of 25, rounded up
    expect(h.stock.figs).toBe(12);                         // the rest of the month's need
  });
  it('fills the gap from whichever food is there when one runs short', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 100, figs: 5 } });
    const h = manor(w);
    staffAll(w);
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id), { twoFoods: true });
    expect(h.stock.figs).toBe(5);
    expect(h.stock.grain).toBe(20);
    bz.store.figs = 0;
    h.stock = {};
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id), { twoFoods: true });
    expect(h.stock.grain).toBe(25);
    expect(h.stock.figs || 0).toBe(0);
  });
  it('never takes food past a month of need, whatever the mix on hand', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { grain: 100, figs: 100 } });
    const h = manor(w, { stock: { figs: 25 } });
    staffAll(w);
    topUpHouse(w, h, wantedGoods(h), bazaarsByHouse(w).get(h.id), { twoFoods: true });
    expect(h.stock.grain || 0).toBe(0);
    expect(bz.store.grain).toBe(100);
  });
  it('counts two foods only when grain and figs were both in stock before the month\'s eating', () => {
    const w = street();
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 200, figs: 200 } });
    const h = manor(w, { stock: { grain: 25 } });           // only grain: still fed, but not two foods
    staffAll(w);
    monthlyHousing(w);
    expect(h.met.food).toBe(true);
    expect(h.met.twoFoods).toBe(false);
    expect(h.stock.grain).toBe(13);                        // restocked half and half for next month
    expect(h.stock.figs).toBe(12);
    h.downTimer = 0;                                       // this test is about food: never let the home drop a tier
    monthlyHousing(w);
    expect(h.met.food).toBe(true);
    expect(h.met.twoFoods).toBe(true);
  });
  it('keeps a home that wants two foods fed on grain alone', () => {
    const w = street();
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 200 } });
    const h = manor(w, { stock: { grain: 25 } });
    staffAll(w);
    monthlyHousing(w);
    h.downTimer = 0;                                       // this test is about food: never let the home drop a tier
    monthlyHousing(w);
    expect(h.met.food).toBe(true);
    expect(h.met.twoFoods).toBe(false);
    expect(h.stock.grain).toBe(25);
  });
  it('feeds a home on figs alone', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stock: { figs: 3 } });
    monthlyHousing(w);
    expect(h.met.food).toBe(true);
    expect(h.stock.figs).toBe(0);
  });
  it('meets a household good when the stock covers the month\'s use at the monthly check, then uses it', () => {
    const w = street();
    const bz = addRaw(w, 'bazaar', 9, 8, { store: { pottery: 10 } });
    const stocked = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16, stock: { pottery: 1 } });
    const bare = addRaw(w, 'house', 13, 11, { tier: 4, residents: 16 });
    const cottage = addRaw(w, 'house', 14, 11, { tier: 3, residents: 12 });   // wants no pottery yet
    staffAll(w);
    monthlyHousing(w);
    expect(stocked.met.pottery).toBe(true);
    expect(bare.met.pottery).toBe(false);
    expect(stocked.stock.pottery).toBe(1);                 // used, then topped up for next month
    expect(bare.stock.pottery).toBe(1);
    expect(cottage.stock.pottery).toBe(undefined);
    expect(bz.store.pottery).toBe(8);
  });
  it('judges a household good on the residents it was stocked for, as it does food', () => {
    const w = street();
    const h = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16, stockedFor: 16, stock: { pottery: 1 } });
    h.residents = 25;                                      // newcomers since the last delivery: they need 2
    monthlyHousing(w);
    expect(h.met.pottery).toBe(true);
    expect(h.stock.pottery).toBe(0);
  });
  it('grows a House with water, food, a temple and a month of pottery into a Townhouse', () => {
    const w = street();
    addRaw(w, 'well', 13, 9);
    addRaw(w, 'bazaar', 9, 8, { store: { grain: 100, pottery: 20 } });
    addRaw(w, 'temple', 15, 8);
    const h = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16, stock: { grain: 4 } });
    staffAll(w);
    monthlyHousing(w);
    expect(h.tier).toBe(4);                                // no pottery on hand at this check
    monthlyHousing(w);
    expect(h.tier).toBe(5);
  });
  it('blames the empty granary for missing food, never a storehouse the bazaar also draws on', () => {
    const w = street();
    const granary = addRaw(w, 'granary', 2, 8);
    addRaw(w, 'storehouse', 5, 8, { store: { pottery: 50 } });   // nearer the bazaar, and holds no food
    addRaw(w, 'bazaar', 9, 8);
    const home = addRaw(w, 'house', 12, 11, { tier: 2, residents: 8 });
    staffAll(w);
    expect(needCause(w, home, 'food')).toEqual({ code: 'granary_empty', id: granary.id });
  });
});
```

In `tests/all.js`, add the import directly after `import './sim/chains.test.js';`:

```js
import './sim/distributionGoods.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "distribution of many goods"`
Expected: `2 passed, 14 failed` (seen in a scratch run on top of Task 3; `leaves an idle bazaar empty` and `feeds a home on figs alone` already pass: the old code leaves an idle bazaar alone and already eats any food). The failures and their messages:
- `restocks each good a bazaar sells up to its own stock level...`: `expected 300 to be 200` (every good filled to the bazaar's single `capacity`)
- `tops a good up to its level, nearest store first...`: `expected 170 to be 100`
- `wants the foods and every household good of the current or next tier`: `expected ["figs","grain"] to equal ["figs","grain","pottery"]`
- `tops a home up to one month of each household good it wants...`: `expected undefined to be 1`
- `fills a home that wants one food from grain first...`: `expected 3 to be 1` (each food topped up to the whole need)
- `gives a home that wants two foods half of its need from each`: `expected 25 to be 13`
- `fills the gap from whichever food is there when one runs short`: `expected 25 to be 20`
- `never takes food past a month of need...`: `expected 25 to be 0`
- `counts two foods only when grain and figs were both in stock...`: `expected undefined to be false`
- `keeps a home that wants two foods fed on grain alone`: `expected undefined to be false`
- `meets a household good when the stock covers the month's use...`: `expected undefined to be true`
- `judges a household good on the residents it was stocked for...`: `expected undefined to be true`
- `grows a House with water, food, a temple and a month of pottery into a Townhouse`: `expected 4 to be 5`
- `blames the empty granary for missing food, never a storehouse...`: `expected {"code":"granary_empty","id":2} to equal {"code":"granary_empty","id":1}`

(The first two numbers depend on the bazaar `capacity` Task 2 left in place; 300 here.)

- [ ] **Step 3: Implement**

Replace the whole of `src/sim/distribution.js` with:

```js
import { BUILDINGS } from '../data/buildings.js';
import { GOODS, FOOD_GOODS } from '../data/goods.js';
import { allBuildings, housesOf } from './world.js';
import { buildingsInReach, roadReach, reachDistance } from './reach.js';
import { isWorking } from './labour.js';

// A home's use of a good in a month, rounded up per home (spec 4.10). Every food has the same rate, so a home's
// food need is monthlyNeed(house, FOOD_GOODS[0]) whatever mix of foods meets it.
export const monthlyNeed = (house, good) => Math.ceil(house.residents * GOODS[good].perResidentPerMonth);

const foodOnHand = (house) => FOOD_GOODS.reduce((s, g) => s + (house.stock[g] || 0), 0);

// Each working bazaar tops up every good it sells to its stock level for that good (data: bazaar.stock), from the
// stores within its supply reach that hold the good, nearest first (spec 4.10).
export function restockBazaars(world) {
  for (const bz of allBuildings(world)) {
    const def = BUILDINGS[bz.type];
    if (!def.sells || !isWorking(world, bz)) continue;
    for (const good of def.sells) {
      let need = (def.stock[good] || 0) - (bz.store[good] || 0);
      if (need <= 0) continue;
      const sources = buildingsInReach(world, bz, def.supplyReach,
        (o) => (BUILDINGS[o.type].stores || []).includes(good) && (o.store[good] || 0) > 0);
      for (const { b: src } of sources) {
        const take = Math.min(need, src.store[good]);
        src.store[good] -= take;
        bz.store[good] = (bz.store[good] || 0) + take;
        need -= take;
        if (need <= 0) break;
      }
    }
  }
}

export function bazaarsByHouse(world) {
  const map = new Map();
  const houses = housesOf(world);
  for (const bz of allBuildings(world)) {
    const def = BUILDINGS[bz.type];
    if (!def.sells || !isWorking(world, bz)) continue;
    const rm = roadReach(world, bz, def.reach);
    for (const h of houses) {
      const d = reachDistance(rm, world, h);
      if (d > def.reach) continue;
      if (!map.has(h.id)) map.set(h.id, []);
      map.get(h.id).push({ b: bz, dist: d });
    }
  }
  for (const list of map.values()) list.sort((p, q) => p.dist - q.dist || p.b.id - q.b.id);
  return map;
}

// Moves up to n of a good from the bazaars (nearest first) into the home's stock; returns how many moved.
function takeFrom(bazaars, house, good, n) {
  if (n <= 0) return 0;
  let left = n;
  for (const { b: bz } of bazaars || []) {
    if (left <= 0) break;
    const take = Math.min(left, bz.store[good] || 0);
    if (take > 0) {
      bz.store[good] -= take;
      house.stock[good] = (house.stock[good] || 0) + take;
      left -= take;
    }
  }
  return n - left;
}

// Tops a home up to one month of each good in `goods` from the bazaars reaching it, nearest first (spec 4.10).
// Foods share one month's need, met by any mix: a home that wants two foods (twoFoods) first takes each food up to
// half the need (rounded up), then any home fills what is still short of the need from whichever food is there,
// in FOOD_GOODS order. Topping up never takes the food on hand past the month's need. Each household good is topped
// up to its own month's need.
export function topUpHouse(world, house, goods, bazaars, { twoFoods = false } = {}) {
  const foods = goods.filter((g) => FOOD_GOODS.includes(g));
  if (foods.length) {
    const need = monthlyNeed(house, FOOD_GOODS[0]);
    if (twoFoods) {
      const half = Math.ceil(need / 2);
      for (const g of foods) takeFrom(bazaars, house, g, Math.min(half - (house.stock[g] || 0), need - foodOnHand(house)));
    }
    let gap = need - foodOnHand(house);
    for (const g of foods) gap -= takeFrom(bazaars, house, g, gap);
  }
  for (const good of goods) {
    if (!FOOD_GOODS.includes(good)) takeFrom(bazaars, house, good, monthlyNeed(house, good) - (house.stock[good] || 0));
  }
}
```

In `src/sim/housing.js`:

1. Replace the goods import:

```js
import { FOOD_GOODS } from '../data/goods.js';
```

with:

```js
import { FOOD_GOODS, HOUSEHOLD_GOODS } from '../data/goods.js';
```

2. Replace:

```js
export const wantedGoods = (house) => (wantedNeeds(house).includes('food') ? FOOD_GOODS.slice() : []);
```

with:

```js
// The goods a home tops up at the bazaar (spec 4.10): every food once its current or next tier needs food, and each
// household good (pottery, beer, linen, jewellery) that its current or next tier needs.
export function wantedGoods(house) {
  const wants = wantedNeeds(house);
  return [...(wants.includes('food') ? FOOD_GOODS : []), ...HOUSEHOLD_GOODS.filter((g) => wants.includes(g))];
}
```

3. Replace:

```js
const foodNeedToMeet = (house) =>
  monthlyNeed({ residents: Math.min(house.residents, house.stockedFor || house.residents) }, FOOD_GOODS[0]);
```

with:

```js
const needToMeet = (house, good) =>
  monthlyNeed({ residents: Math.min(house.residents, house.stockedFor || house.residents) }, good);
const foodNeedToMeet = (house) => needToMeet(house, FOOD_GOODS[0]);
```

4. Directly after the end of `consumeFood` (before `export function monthlyHousing`), add:

```js
// A household good is met when the stock covers the month's use at the monthly check (spec 4.10), judged like food
// on the residents it was stocked for; the month's use is then taken from the stock.
function consumeGood(house, good) {
  const needMet = needToMeet(house, good);
  const available = house.stock[good] || 0;
  house.stock[good] = available - Math.min(available, monthlyNeed(house, good));
  return needMet > 0 && available >= needMet;
}
```

5. In `monthlyHousing`, replace:

```js
    const met = {
      road: touchesRoad(world, h),
      water: cov.water.has(h.id),
      religion: cov.religion.has(h.id),
      food: wantedNeeds(h).includes('food') ? consumeFood(h) : false,
    };
    h.met = met;
    topUpHouse(world, h, wantedGoods(h), bazaars.get(h.id));
```

with:

```js
    const wants = wantedNeeds(h);
    const met = {
      road: touchesRoad(world, h),
      water: cov.water.has(h.id),
      religion: cov.religion.has(h.id),
      twoFoods: FOOD_GOODS.every((g) => (h.stock[g] || 0) > 0),   // grain and figs both in stock before the month's eating
      food: wants.includes('food') ? consumeFood(h) : false,
    };
    for (const g of HOUSEHOLD_GOODS) if (wants.includes(g)) met[g] = consumeGood(h, g);
    h.met = met;
    topUpHouse(world, h, wantedGoods(h), bazaars.get(h.id), { twoFoods: wants.includes('twoFoods') });
```

(`twoFoods` is listed before `food` on purpose: an object literal is evaluated in order, so it reads the stock before `consumeFood` eats it.)

6. Replace `graneriesFor` at the end of the file:

```js
// The stores a bazaar draws its goods from (restockBazaars' rule): any store of what it sells within its supply
// reach, nearest first, holding goods or not.
function graneriesFor(world, bazaar) {
  const def = BUILDINGS[bazaar.type];
  return buildingsInReach(world, bazaar, def.supplyReach, (o) => (BUILDINGS[o.type].stores || []).some((g) => def.sells.includes(g))).map((e) => e.b);
}
```

with:

```js
// The stores a bazaar draws its food from (restockBazaars' rule): any store of a food it sells within its supply
// reach, nearest first, holding food or not. A storehouse holds no food, so it is never named for an empty granary.
function graneriesFor(world, bazaar) {
  const def = BUILDINGS[bazaar.type];
  const foods = def.sells.filter((g) => FOOD_GOODS.includes(g));
  return buildingsInReach(world, bazaar, def.supplyReach, (o) => (BUILDINGS[o.type].stores || []).some((g) => foods.includes(g))).map((e) => e.b);
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "distribution"`
Expected: `18 passed, 0 failed` (the two existing `distribution` tests in `production.test.js` and the 16 new ones) and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

None. Checked against the whole suite: the existing `topUpHouse(w, h, ['grain'], list)` test still fills grain only (the listed foods), the housing tests read `h.met.food`, `.water` and `.road` (never the whole `met` object after a monthly check), `needCause`'s food tests use granaries only, and `src/ui/hud.js` keeps working: it reads `wantedGoods(h).length` as "wants food", which still holds because a home wants a household good only from tier 4, when it already wants food. `sampleCity`, `longrun` and `stress` cities have no pottery or figs, so they behave as before.

- [ ] **Step 6: Visual check**

Not a visual task (sim only).

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```
Expected: `ALL PASSED` (16 more tests than after Task 3).

- [ ] **Step 8: Commit**

```powershell
git add src/sim/distribution.js src/sim/housing.js tests/sim/distributionGoods.test.js tests/all.js sw-files.js
git commit -m @'
Sell every food and household good through the bazaar, and judge two foods

Bazaars restock each good they sell to its own level. Homes top up every food
and each household good their current or next tier needs; a home that wants
two foods takes half its need of each and fills any gap from whichever is
there. At the month's check a household good is met when the stock covered the
month, and two foods when grain and figs were both in stock. The empty-granary
cause no longer names a storehouse.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 5: Desirability

**Files:**
- Create: `src/sim/desirability.js`
- Create: `tests/sim/desirability.test.js`
- Modify: `tests/all.js`, `sw-files.js` (regenerated)

**Interfaces:**
- Consumes (Task 2): `DESIRABILITY` (type → values by distance 1..6, spec 4.7: garden `[3, 2, 1]`, statue `[8, 6, 4, 2]`, temple `[6, 6, 4, 4, 2, 2]`, well `[1]`, granary `[-8, -6, -4, -2]`, potter `[-4, -3, -2, -1]`, ...) and `HOUSE_DESIRABILITY` (tier → values: 1 `[-2, -1]`, 3 `[0]`, 4 `[1]`, 6 `[2, 2]`, ...; tier 0 or a missing entry adds nothing); `BUILDINGS` (`w`, `d` for the preview); `TIERS` 6 for a 2x2 Manor in the tests.
- Produces: `desirabilityField(world)` → `Float32Array(size * size)`, memoised per world on a signature of the buildings (callers must not write to it); `desirabilityAt(world, x, y)` (0 off the map); `houseDesirability(world, house, field?)` = the best tile of its footprint; `desirabilityContributors(world, house, n = 3)` → `[{ id, type, value }]` at the home's best tile, largest effect first (by size, either sign; ties by id); `desirabilityPreview(world, type, x, y)` → `{ better, worse, tiles: [{ x, y, v }] }`.

The rules, as built and tested here:
- Every building except roads (which are not buildings) adds its values to the tiles around it by Chebyshev distance from the nearest tile of its footprint: 1 is touching, diagonals included. Values add where they overlap; a building never scores its own footprint; homes add by their tier; types with no entry add nothing.
- A home's score is its best tile's; the contributors are read at that tile (the first best tile in reading order), so they explain the number the house sheet shows.
- The preview lists every map tile the building would change, with its change `v` (zeros left out, the footprint left out, clipped at the map edge), and counts the housing plots (any tier, empty ones too, as `homesServedFrom` counts them for "Gives water to 6 homes") whose best tile would rise or fall. A home whose best tile does not change is not counted, even if another of its tiles does. It places nothing.
- The memo's signature hashes each building's id, place, size and tier in one pass, so adding, removing, merging (size) or upgrading (tier) rebuilds the field and nothing else does. Building a full 64x64 city's field takes about 3 ms; a memo check about 50 microseconds. Callers reading many tiles or homes take the field once: the overlay (Task 15) reads `desirabilityField` once a frame rather than calling `desirabilityAt` per tile, and the monthly check (Task 6) passes one field to `houseDesirability`.
- Pure reads: nothing here writes to the world or the save.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/desirability.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { desirabilityField, desirabilityAt, houseDesirability, desirabilityContributors, desirabilityPreview } from '../../src/sim/desirability.js';
import { createWorld, removeBuilding, housesOf } from '../../src/sim/world.js';
import { buildStressCity } from '../../src/dev/sampleCity.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';

// Values (spec 4.7, data/desirability.js) by distance 1, 2, 3...: garden 3, 2, 1; statue 8, 6, 4, 2; temple 6, 6, 4,
// 4, 2, 2; well 1; potter -4, -3, -2, -1; granary -8, -6, -4, -2; Hut -2, -1; Cottage 0; Manor 2, 2.
// Desirability needs no roads, so these worlds have none.
const world = () => makeTestWorld();
const home = (w, x, y, tier = 3, extra = {}) => addRaw(w, 'house', x, y, { tier, residents: 5, ...extra });
const manor = (w, x, y) => home(w, x, y, 6, { w: 2, d: 2, residents: 100 });

describe('desirability', () => {
  it('falls off 3, 2, 1 around a garden, diagonals included, and never on the garden itself', () => {
    const w = world();
    addRaw(w, 'garden', 10, 10);
    expect(desirabilityAt(w, 10, 10)).toBe(0);
    expect(desirabilityAt(w, 11, 10)).toBe(3);
    expect(desirabilityAt(w, 12, 10)).toBe(2);
    expect(desirabilityAt(w, 13, 10)).toBe(1);
    expect(desirabilityAt(w, 14, 10)).toBe(0);
    expect(desirabilityAt(w, 9, 9)).toBe(3);
    expect(desirabilityAt(w, 8, 12)).toBe(2);
    expect(desirabilityAt(w, 7, 13)).toBe(1);
    expect(desirabilityAt(w, -1, 10)).toBe(0);            // off the map
  });
  it('adds values where they overlap, good and bad alike', () => {
    const w = world();
    addRaw(w, 'garden', 10, 10);
    addRaw(w, 'garden', 14, 10);
    expect(desirabilityAt(w, 11, 10)).toBe(4);            // 3 + 1
    expect(desirabilityAt(w, 12, 10)).toBe(4);            // 2 + 2
    addRaw(w, 'potter', 20, 10);                           // a 2x2 at x 20-21
    addRaw(w, 'garden', 17, 10);
    expect(desirabilityAt(w, 18, 10)).toBe(0);            // garden +3, potter -3
    expect(desirabilityAt(w, 19, 10)).toBe(-2);           // garden +2, potter -4
  });
  it('counts distance from the nearest tile of a 2x2 footprint and leaves the footprint alone', () => {
    const w = world();
    addRaw(w, 'granary', 10, 10);
    for (const [x, y] of [[10, 10], [11, 10], [10, 11], [11, 11]]) expect(desirabilityAt(w, x, y)).toBe(0);
    expect(desirabilityAt(w, 12, 11)).toBe(-8);
    expect(desirabilityAt(w, 9, 9)).toBe(-8);
    expect(desirabilityAt(w, 14, 7)).toBe(-4);
    expect(desirabilityAt(w, 15, 10)).toBe(-2);
    expect(desirabilityAt(w, 16, 10)).toBe(0);
  });
  it('scores homes by tier, and an empty plot not at all', () => {
    const w = world();
    home(w, 10, 10, 1);                                    // a Hut
    home(w, 20, 10, 0, { residents: 0 });                  // an empty plot
    expect(desirabilityAt(w, 11, 10)).toBe(-2);
    expect(desirabilityAt(w, 12, 10)).toBe(-1);
    expect(desirabilityAt(w, 21, 10)).toBe(0);
    manor(w, 10, 20);
    expect(desirabilityAt(w, 12, 21)).toBe(2);
    expect(desirabilityAt(w, 13, 21)).toBe(2);
    expect(desirabilityAt(w, 14, 21)).toBe(0);
  });
  it('gives a 2x2 home the score of its best tile, and never its own values', () => {
    const w = world();
    const h = manor(w, 20, 20);
    expect(houseDesirability(w, h)).toBe(0);
    addRaw(w, 'garden', 23, 20);
    expect(desirabilityAt(w, 20, 20)).toBe(1);
    expect(desirabilityAt(w, 21, 21)).toBe(2);
    expect(houseDesirability(w, h)).toBe(2);
  });
  it('names the biggest causes of a home\'s score, largest effect first, either sign', () => {
    const w = world();
    const h = home(w, 15, 15, 5);
    const temple = addRaw(w, 'temple', 13, 15);
    const potter = addRaw(w, 'potter', 16, 14);
    const garden = addRaw(w, 'garden', 15, 14);
    const well = addRaw(w, 'well', 16, 16);
    addRaw(w, 'garden', 25, 25);                           // too far to matter
    expect(houseDesirability(w, h)).toBe(6);               // 6 - 4 + 3 + 1
    expect(desirabilityContributors(w, h)).toEqual([
      { id: temple.id, type: 'temple', value: 6 },
      { id: potter.id, type: 'potter', value: -4 },
      { id: garden.id, type: 'garden', value: 3 },
    ]);
    expect(desirabilityContributors(w, h, 5).map((c) => c.id)).toEqual([temple.id, potter.id, garden.id, well.id]);
  });
  it('takes a 2x2 home\'s causes at its best tile', () => {
    const w = world();
    const h = manor(w, 20, 20);
    const statue = addRaw(w, 'statue', 23, 23);
    const garden = addRaw(w, 'garden', 19, 19);
    expect(houseDesirability(w, h)).toBe(8);               // at (21, 21): statue 6, garden 2
    expect(desirabilityContributors(w, h)).toEqual([
      { id: statue.id, type: 'statue', value: 6 },
      { id: garden.id, type: 'garden', value: 2 },
    ]);
  });
  it('previews the tiles a building would change and the homes it would make nicer or less pleasant', () => {
    const w = world();
    for (const x of [10, 11, 12]) home(w, x, 10);
    home(w, 25, 25);
    const garden = desirabilityPreview(w, 'garden', 11, 12);
    expect(garden.better).toBe(3);
    expect(garden.worse).toBe(0);
    expect(garden.tiles.length).toBe(48);                  // a 7x7 square less the garden's own tile
    expect(garden.tiles.every((t) => t.v > 0)).toBe(true);
    expect(garden.tiles.some((t) => t.x === 11 && t.y === 12)).toBe(false);
    expect(garden.tiles.find((t) => t.x === 11 && t.y === 10).v).toBe(2);
    const potter = desirabilityPreview(w, 'potter', 11, 12);
    expect(potter.better).toBe(0);
    expect(potter.worse).toBe(3);
    expect(potter.tiles.length).toBe(96);                  // a 10x10 square less the 2x2 footprint
    expect(desirabilityPreview(w, 'garden', 0, 0).tiles.length).toBe(15);   // clipped at the map's corner
    expect(desirabilityPreview(w, 'house', 11, 12)).toEqual({ better: 0, worse: 0, tiles: [] });
    expect(desirabilityPreview(w, 'nonsense', 11, 12)).toEqual({ better: 0, worse: 0, tiles: [] });
    expect(housesOf(w).length).toBe(4);                    // a preview places nothing
  });
  it('counts a home only when its best tile changes', () => {
    const w = world();
    const h = manor(w, 20, 20);
    addRaw(w, 'statue', 23, 20);                           // the east tiles score 6, the west ones 4
    expect(houseDesirability(w, h)).toBe(6);
    const p = desirabilityPreview(w, 'garden', 17, 20);    // +1 on the west tiles only
    expect(p.tiles.some((t) => t.x === 20 && t.y === 20)).toBe(true);
    expect(p.better).toBe(0);
    expect(p.worse).toBe(0);
  });
  it('previews exactly what placing the building then does', () => {
    const w = world();
    for (let x = 4; x < 28; x += 3) home(w, x, 12, 1 + (x % 5));
    addRaw(w, 'temple', 8, 15);
    addRaw(w, 'potter', 20, 9);
    const before = housesOf(w).map((h) => houseDesirability(w, h));
    const fieldBefore = Float32Array.from(desirabilityField(w));
    const p = desirabilityPreview(w, 'statue', 14, 14);
    addRaw(w, 'statue', 14, 14);
    const after = housesOf(w).map((h) => houseDesirability(w, h));
    expect(p.better).toBe(after.filter((v, i) => v > before[i]).length);
    expect(p.worse).toBe(after.filter((v, i) => v < before[i]).length);
    const field = desirabilityField(w);
    for (const t of p.tiles) expect(field[t.y * w.size + t.x] - fieldBefore[t.y * w.size + t.x]).toBe(t.v);
    let changed = 0;
    for (let i = 0; i < field.length; i++) if (field[i] !== fieldBefore[i]) changed++;
    expect(changed).toBe(p.tiles.length);
  });
  it('memoises the field until a building is added, removed, changes tier or merges', () => {
    const w = world();
    const h = home(w, 10, 10, 1);
    const first = desirabilityField(w);
    expect(desirabilityField(w)).toBe(first);              // the same array while nothing changes
    expect(desirabilityAt(w, 11, 10)).toBe(-2);
    const garden = addRaw(w, 'garden', 12, 10);
    expect(desirabilityField(w) === first).toBe(false);   // rebuilt once a building is added
    expect(desirabilityAt(w, 11, 10)).toBe(1);             // Hut -2, garden +3
    removeBuilding(w, garden.id);
    expect(desirabilityAt(w, 11, 10)).toBe(-2);
    h.tier = 4;                                            // the Hut grew into a House
    expect(desirabilityAt(w, 11, 10)).toBe(1);
    h.tier = 6; h.w = 2; h.d = 2;                          // merged into a Manor (the plots beside it gone)
    expect(desirabilityAt(w, 12, 10)).toBe(2);
    expect(desirabilityAt(w, 13, 10)).toBe(2);
  });
  it('judges every home against one field when given it, the same as asking one by one', () => {
    const w = world();
    const homes = [home(w, 10, 10, 1), manor(w, 12, 10), home(w, 15, 10, 4)];
    addRaw(w, 'garden', 11, 12);
    const field = desirabilityField(w);
    expect(homes.map((h) => houseDesirability(w, h, field))).toEqual(homes.map((h) => houseDesirability(w, h)));
  });
  it('builds and reads the field of a full 64x64 city quickly', () => {
    const w = buildStressCity(createWorld({ seed: 3 }));
    const homes = housesOf(w);
    expect(homes.length).toBeGreaterThan(1000);
    let started = performance.now();
    const field = desirabilityField(w);
    const build = performance.now() - started;
    started = performance.now();
    for (let i = 0; i < 100; i++) desirabilityField(w);   // memo hits
    const hits = performance.now() - started;
    started = performance.now();
    for (const h of homes) houseDesirability(w, h, field);
    const reads = performance.now() - started;
    started = performance.now();
    for (let x = 0; x < 60; x += 2) desirabilityPreview(w, 'statue', x, 30);
    const previews = performance.now() - started;
    expect(build).toBeLessThan(50);
    expect(hits).toBeLessThan(50);
    expect(reads).toBeLessThan(50);
    expect(previews).toBeLessThan(100);
  });
});
```

In `tests/all.js`, add the import directly after `import './sim/distributionGoods.test.js';`:

```js
import './sim/desirability.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "desirability"`
Expected: the page does not load:
```
LOAD ERROR
TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:<port>/tests/all.js
```
(the module `src/sim/desirability.js` does not exist yet, so `tests/all.js` cannot load).

- [ ] **Step 3: Implement**

Create `src/sim/desirability.js`:

```js
// Desirability (spec 4.7). Every tile scores the sum of the values of the buildings near it. Each building type,
// and each home by its tier, has values by distance 1 to 6 (data/desirability.js), counted as the Chebyshev
// distance from the nearest tile of its footprint (1 = touching, diagonals included). Values add where they
// overlap, and a building never scores its own footprint. A home (a 2x2 one too) uses its best tile.
// The field is memoised per world on a signature of the buildings (id, place, size and tier), so it is rebuilt only
// after a building is added, removed, moved, merged or changes tier. Everything here only reads the world.
import { DESIRABILITY, HOUSE_DESIRABILITY } from '../data/desirability.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from './world.js';
import { idx, inBounds } from './grid.js';

const memo = new WeakMap();   // world -> { sig, field }; kept outside the world so saves stay pure data

// A building's values by distance: a home's by its tier (an empty plot adds nothing), anything else's by its type.
const valuesFor = (type, tier) => (type === 'house' ? HOUSE_DESIRABILITY[tier] : DESIRABILITY[type]) || [];

// The value a footprint gives the tile (tx, ty): 0 on the footprint itself and beyond its last distance.
function valueAt(vals, x, y, w, d, tx, ty) {
  const dist = Math.max(x - tx, tx - (x + w - 1), y - ty, ty - (y + d - 1));
  return dist >= 1 && dist <= vals.length ? vals[dist - 1] : 0;
}

// Calls visit(i, x, y, v) for every map tile within the values' reach of the footprint that it changes (v not 0).
function spread(size, x, y, w, d, vals, visit) {
  const r = vals.length;
  if (!r) return;
  const x0 = Math.max(0, x - r), x1 = Math.min(size - 1, x + w - 1 + r);
  const y0 = Math.max(0, y - r), y1 = Math.min(size - 1, y + d - 1 + r);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const v = valueAt(vals, x, y, w, d, tx, ty);
      if (v) visit(idx(size, tx, ty), tx, ty, v);
    }
  }
}

// A fingerprint of everything the field depends on (each building's id, place, size and tier): one tight pass, about
// 50 microseconds for a full 64x64 city. Only homes have a tier; a type never changes under the same id.
function signature(world) {
  const list = Object.values(world.buildings);
  let h = 0x811c9dc5;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    h = Math.imul(h ^ (b.id * 4099 + b.x * 67 + b.y), 16777619);
    h = Math.imul(h ^ ((b.tier | 0) * 16 + b.w * 4 + b.d), 16777619);
  }
  return `${list.length}:${h}`;
}

// The whole map's scores, one per tile (index y * size + x). Shared and memoised: callers must not write to it.
// Checking the memo costs one pass over the buildings, so a caller reading many tiles or many homes at once (an
// overlay, the monthly housing check) takes the field once and reads it, or passes it to houseDesirability.
export function desirabilityField(world) {
  const sig = signature(world);
  const m = memo.get(world);
  if (m && m.sig === sig) return m.field;
  const size = world.size;
  const field = new Float32Array(size * size);
  for (const b of allBuildings(world)) {
    spread(size, b.x, b.y, b.w, b.d, valuesFor(b.type, b.tier), (i, tx, ty, v) => { field[i] += v; });
  }
  memo.set(world, { sig, field });
  return field;
}

export const desirabilityAt = (world, x, y) => (inBounds(world.size, x, y) ? desirabilityField(world)[idx(world.size, x, y)] : 0);

// The home's best tile: the highest score on its footprint, the first such tile in reading order.
function bestTile(world, house, field = desirabilityField(world)) {
  let best = null;
  for (let y = house.y; y < house.y + house.d; y++) {
    for (let x = house.x; x < house.x + house.w; x++) {
      const v = field[idx(world.size, x, y)];
      if (!best || v > best.v) best = { x, y, v };
    }
  }
  return best;
}

// A home's score: its best tile's (spec 4.7). `field` is an optional desirabilityField(world) taken once by a caller
// judging many homes, so they are all judged on the same field.
export const houseDesirability = (world, house, field = desirabilityField(world)) => bestTile(world, house, field).v;

// The buildings that most change a home's score, at its best tile: [{ id, type, value }], largest effect first
// (by size, either sign; ties by id). The house sheet's "14 of 20: +6 temple, +3 garden, -4 potter".
export function desirabilityContributors(world, house, n = 3) {
  const { x, y } = bestTile(world, house);
  const out = [];
  for (const b of allBuildings(world)) {
    if (b.id === house.id) continue;
    const value = valueAt(valuesFor(b.type, b.tier), b.x, b.y, b.w, b.d, x, y);
    if (value) out.push({ id: b.id, type: b.type, value });
  }
  out.sort((p, q) => Math.abs(q.value) - Math.abs(p.value) || p.id - q.id);
  return out.slice(0, n);
}

// What placing a building of this type at (x, y) would do (spec 4.7), without placing it: the tiles it would change
// with their change v, and how many housing plots (any tier, empty ones too, as homesServedFrom counts) would get
// a better or a worse best tile.
export function desirabilityPreview(world, type, x, y) {
  const def = BUILDINGS[type];
  const tiles = [];
  if (!def) return { better: 0, worse: 0, tiles };
  const delta = new Map();
  spread(world.size, x, y, def.w, def.d, valuesFor(type, 0), (i, tx, ty, v) => {
    tiles.push({ x: tx, y: ty, v });
    delta.set(i, v);
  });
  let better = 0, worse = 0;
  if (!tiles.length) return { better, worse, tiles };
  const field = desirabilityField(world);
  for (const h of housesOf(world)) {
    let before = -Infinity, after = -Infinity, touched = false;
    for (let ty = h.y; ty < h.y + h.d; ty++) {
      for (let tx = h.x; tx < h.x + h.w; tx++) {
        const i = idx(world.size, tx, ty);
        const dv = delta.get(i);
        if (dv) touched = true;
        before = Math.max(before, field[i]);
        after = Math.max(after, field[i] + (dv || 0));
      }
    }
    if (!touched) continue;
    if (after > before) better++;
    else if (after < before) worse++;
  }
  return { better, worse, tiles };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "desirability"`
Expected: `13 passed, 0 failed` and `ALL PASSED`. (Measured in a scratch run with other suites competing for the CPU: field build 2.7 ms, 100 memo hits 5.2 ms, every home of the stress city read from one field 1.2 ms, 30 previews 19 ms; the budgets are 50, 50, 50 and 100 ms.)

- [ ] **Step 5: Update the existing tests this breaks**

None: a new module that nothing imports yet. `tests/ui/pwa.test.js` checks that every import inside `src` resolves to a file listed in `sw-files.js`, which Step 7's `tools/sw-files.ps1` run takes care of.

- [ ] **Step 6: Visual check**

Not a visual task (sim only; the overlay and placement tint are Task 15).

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```
Expected: `ALL PASSED` (13 more tests than after Task 4).

- [ ] **Step 8: Commit**

```powershell
git add src/sim/desirability.js tests/sim/desirability.test.js tests/all.js sw-files.js
git commit -m @'
Score desirability on every tile, with a home's causes and a placement preview

Each building adds its values by distance from its footprint, homes by their
tier, never on its own tiles; a home takes its best tile. The field is
memoised on a fingerprint of the buildings, so it rebuilds only when one is
added, removed, merged or changes tier. The house sheet can name the biggest
causes, and a building not yet placed previews the tiles it would change and
how many homes it would make nicer or less pleasant.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 6: Tiers 5-9, merges and splits, causes

> **Controller ruling (overrides this task's goods-cause code and tests below).** Household goods and the second food follow the food codes' pattern, which Task 14's words rely on: `next_delivery { code, id: bazaar, good }` when a working bazaar in reach has the good **or a store in its supply reach holds some**; `good_unmade { good, id: bazaar }` when stores for the good lie in a working bazaar's supply reach but none holds any; `no_good { good, id: bazaar }` when no store for the good lies in that reach. So `goodCause` is exactly:
>
> ```js
> function goodCause(world, house, good) {
>   const { cause, working } = bazaarsFor(world, house, [good]);
>   if (cause) return cause;
>   const holds = (b) => (b.store[good] || 0) > 0;
>   const coming = working.find((bz) => holds(bz) || goodStoresFor(world, bz, good).some(holds));
>   if (coming) return { code: 'next_delivery', id: coming.id, good };
>   const kept = working.find((bz) => goodStoresFor(world, bz, good).length);
>   if (kept) return { code: 'good_unmade', good, id: kept.id };
>   return { code: 'no_good', good, id: working[0].id };
> }
> ```
>
> Update the comment above `needCause` to match, and flip the expectations in the two tests "traces a missing household good…" and "traces two kinds of food…": with no store for the good in reach the code is `no_good`; with an empty store (or one holding only clay, or a granary with only grain) it is `good_unmade`; with the good in a store or at the bazaar it is `next_delivery { id: bazaar.id, good }`. Everything else in this task stands.


**Files:**
- Create: `src/sim/merge.js`
- Create: `tests/sim/upperTiers.test.js`
- Modify: `src/sim/housing.js` (imports, `computeCoverage`, `monthlyHousing`, `liveNeeds`, `houseStatus`, `needCause`, one new helper)
- Modify: `src/sim/immigration.js` (`departures`: an emptied 2x2 home splits)
- Modify: `tests/all.js` (one import line), `sw-files.js` (regenerated)

**Interfaces:**
- Consumes: `TIERS` 5-9 with `size` and `desirability: { rise, keep }`, `HOUSE_DESIRABILITY`, the booth (`provides: 'entertainment'`, `reach: 8`) (Task 2); Task 4's monthly check, which already sets `met.twoFoods` and `met.pottery`/`beer`/`linen`/`jewellery` and uses up the month's share, its `needToMeet(house, good)` and its food-only `graneriesFor`; `desirabilityField(world)` and `houseDesirability(world, house, field)` (Task 5); `coveredBy`, `providersReaching`, `roadlessProvidersNear` (early-game pass).
- Produces: `mergeSquare(world, house)`, `mergeHouses(world, house, origin)`, `splitHouse(world, house)`, `MERGE_TIER` (`src/sim/merge.js`); the monthly check with entertainment, desirability to rise and keep (hysteresis), merges and splits; `houseStatus` with the new needs, the desirability row and `merge`; `needCause` with `no_good`, `good_unmade`, `no_booth`, `booth_idle`, `booth_no_road`, `low_desirability`, `no_square`; `desirabilityTarget(tier)`; events `merge` and `split`.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/upperTiers.test.js`. The streets keep the well, booth and temple too far away to change a home's desirability, so the values in the tests come only from gardens, statues and homes (spec 4.7 numbers).

```js
import { describe, it, expect } from '../harness.js';
import { TIERS } from '../../src/data/housing.js';
import { monthlyHousing, houseStatus, needCause, desirabilityTarget, removeResidents } from '../../src/sim/housing.js';
import { mergeSquare, mergeHouses, splitHouse, MERGE_TIER } from '../../src/sim/merge.js';
import { houseDesirability } from '../../src/sim/desirability.js';
import { departures } from '../../src/sim/immigration.js';
import { buildingAt, housesOf, removeBuilding } from '../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// Road along y = 10. The providers sit where they reach homes at x 12-13 along the road but are too far away to
// change their desirability: a well (reach 5, desirability only when touching), a booth (reach 8, desirability
// out to 3 tiles) and a temple (reach 10, out to 6 tiles). So in these streets only gardens, statues and homes
// make a home pleasant. Empty plots add nothing (spec 4.7 lists homes from the Hut up).
function street() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'well', 16, 9);
  addRaw(w, 'booth', 17, 9);
  addRaw(w, 'temple', 20, 8);
  staffAll(w);
  return w;
}

// A month of food and pottery for n people, stocked for them.
const stocked = (n, months = 1) => ({ residents: n, stockedFor: n, stock: { grain: Math.ceil(n * 0.25) * months, pottery: Math.ceil(n * 0.05) * months } });
const townhouse = (w, x, y, n = 20, months = 1) => addRaw(w, 'house', x, y, { tier: 5, ...stocked(n, months) });
const manor = (w, x, y, n = 90, months = 3) => addRaw(w, 'house', x, y, { tier: 6, w: 2, d: 2, ...stocked(n, months) });
const plot = (w, x, y) => addRaw(w, 'house', x, y);
const rows = (w, h) => houseStatus(w, h).checklist;

describe('sim upper tiers and merges', () => {
  it('turns a square of four Townhouses on a pleasant street with a booth into one Manor with everyone in it', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const a = townhouse(w, 12, 11, 20), b = townhouse(w, 13, 11, 21), c = townhouse(w, 12, 12, 22), d = townhouse(w, 13, 12, 19);
    addRaw(w, 'well', 12, 9);
    addRaw(w, 'temple', 15, 8);
    addRaw(w, 'booth', 14, 9);
    addRaw(w, 'statue', 11, 11);
    addRaw(w, 'statue', 11, 12);
    staffAll(w);
    expect(houseDesirability(w, a)).toBeGreaterThanOrEqual(TIERS[6].desirability.rise);
    const taxBefore = [a, b, c, d].reduce((n, h) => n + h.residents * TIERS[h.tier].tax, 0);
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([{ type: 'merge', id: a.id }, { type: 'upgrade', id: a.id, from: 5, to: 6 }]);
    const m = w.buildings[a.id];
    expect([m.x, m.y, m.w, m.d, m.tier, m.residents]).toEqual([12, 11, 2, 2, 6, 82]);
    for (const other of [b, c, d]) expect(w.buildings[other.id]).toBe(undefined);
    for (const [x, y] of [[12, 11], [13, 11], [12, 12], [13, 12]]) expect(buildingAt(w, x, y)).toBe(m);
    expect(housesOf(w).length).toBe(1);
    expect([m.stock.grain, m.stock.pottery]).toEqual([17, 5]);              // the others' food and pottery came along (the first ate its own)
    expect(w.tally.upgrades).toBe(1);
    expect(m.residents * TIERS[6].tax).toBeGreaterThan(taxBefore);         // the same people pay more as a Manor
    expect(TIERS[6].capacity / 4).toBeGreaterThanOrEqual(TIERS[5].capacity);   // and no tile holds fewer
  });
  it('picks the square to the north-west first, then clockwise', () => {
    const w = makeTestWorld();
    for (let y = 11; y <= 13; y++) for (let x = 11; x <= 13; x++) if (x !== 12 || y !== 12) plot(w, x, y);
    const h = townhouse(w, 12, 12, 10);
    expect(mergeSquare(w, h)).toEqual({ x: 11, y: 11 });                   // north-west
    Object.assign(buildingAt(w, 11, 11), { tier: 4, residents: 12 });
    expect(mergeSquare(w, h)).toEqual({ x: 12, y: 11 });                   // north-east
    Object.assign(buildingAt(w, 13, 11), { tier: 3, residents: 8 });
    expect(mergeSquare(w, h)).toEqual({ x: 12, y: 12 });                   // south-east
    removeBuilding(w, buildingAt(w, 13, 13).id);
    addRaw(w, 'garden', 13, 13);
    expect(mergeSquare(w, h)).toEqual({ x: 11, y: 12 });                   // south-west
    Object.assign(buildingAt(w, 11, 13), { tier: 2, residents: 3 });
    expect(mergeSquare(w, h)).toBe(null);
  });
  it('merges only with 1x1 plots at Townhouse or better, or plots nobody lives in yet', () => {
    const w = makeTestWorld();
    const h = townhouse(w, 12, 12, 10);
    townhouse(w, 13, 12, 10);
    plot(w, 12, 13);
    const house = addRaw(w, 'house', 13, 13, { tier: 4, residents: 12 });
    expect(mergeSquare(w, h)).toBe(null);                                  // a lived-in House cannot join
    removeResidents(house, 12);
    expect(house.tier).toBe(0);
    expect(mergeSquare(w, h)).toEqual({ x: 12, y: 12 });                   // once it is empty it can
    removeBuilding(w, house.id);
    addRaw(w, 'house', 13, 13, { tier: 6, w: 2, d: 2, residents: 50 });   // part of a Manor is not a plot
    expect(mergeSquare(w, h)).toBe(null);
    const low = makeTestWorld();
    for (const [x, y] of [[13, 12], [12, 13], [13, 13]]) plot(low, x, y);
    expect(mergeSquare(low, addRaw(low, 'house', 12, 12, { tier: 4, residents: 12 }))).toBe(null);   // only a Townhouse merges
    expect(mergeHouses(low, null, { x: 30, y: 30 })).toBe(null);          // no square there
    expect(MERGE_TIER).toBe(6);
  });
  it('keeps a Townhouse that is ready to grow but has no square to join, without a countdown', () => {
    const w = street();
    const h = townhouse(w, 12, 11, 20);
    addRaw(w, 'statue', 11, 12);
    addRaw(w, 'statue', 13, 12);
    addRaw(w, 'statue', 12, 12);
    expect(houseDesirability(w, h)).toBeGreaterThanOrEqual(20);
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([]);
    expect([h.tier, h.downTimer]).toEqual([5, 0]);
    expect(houseStatus(w, h).merge).toEqual({ needed: true, ready: false });
    expect(needCause(w, h, 'merge')).toEqual({ code: 'no_square', id: null });
  });
  it('splits a Manor that drops below tier 6 back into four Townhouses, sharing out its residents', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const m = manor(w, 12, 11, 90);                                        // no water, temple or booth: needs unmet
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([]);
    expect(houseStatus(w, m).downgradeIn).toBe(1);
    monthlyHousing(w, events);
    expect(events).toEqual([{ type: 'downgrade', id: m.id, from: 6, to: 5 }, { type: 'split', id: m.id }]);
    const parts = [[12, 11], [13, 11], [12, 12], [13, 12]].map(([x, y]) => buildingAt(w, x, y));
    expect(parts[0]).toBe(m);                                              // the north-west plot keeps the id
    expect(parts.map((p) => [p.w, p.d, p.tier])).toEqual([[1, 1, 5], [1, 1, 5], [1, 1, 5], [1, 1, 5]]);
    expect(parts.map((p) => p.residents)).toEqual([23, 23, 22, 22]);
    expect(new Set(parts.map((p) => p.id)).size).toBe(4);
    const split = splitHouse(w, Object.assign(mergeHouses(w, parts[0], { x: 12, y: 11 }), { residents: 3, stock: { grain: 5 } }));
    expect(split.map((p) => [p.tier, p.residents])).toEqual([[5, 1], [5, 1], [5, 1], [0, 0]]);   // nobody left for the fourth
    expect(split.map((p) => p.stock.grain || 0)).toEqual([2, 2, 1, 0]);    // stock goes to the plots with people
  });
  it('holds a Manor between the two desirability values, and drops it after a month below "to keep", with the countdown', () => {
    const w = street();
    const m = manor(w, 12, 11, 90, 5);
    addRaw(w, 'statue', 12, 13);
    const second = addRaw(w, 'statue', 11, 13);
    expect(houseDesirability(w, m)).toBe(16);                              // 15 to keep a Manor, 35 to rise to a Fine manor
    monthlyHousing(w);
    monthlyHousing(w);
    expect([m.tier, m.downTimer]).toEqual([6, 0]);
    const s = houseStatus(w, m);
    expect(s.checklist.find((c) => c.need === 'desirability')).toEqual({ need: 'desirability', met: false, value: 16, target: 35, keep: 15 });
    expect(s.missingNow).toEqual([]);
    removeBuilding(w, second.id);
    expect(houseDesirability(w, m)).toBe(8);
    const events = [];
    monthlyHousing(w, events);
    expect([m.tier, m.downTimer, events.length]).toEqual([6, 1, 0]);
    const warn = houseStatus(w, m);
    expect(warn.downgradeIn).toBe(1);
    expect(warn.missingNow).toEqual(['desirability']);
    expect(needCause(w, m, 'desirability')).toEqual({ code: 'low_desirability', id: null, value: 8, target: 35 });
    monthlyHousing(w, events);
    expect(events.map((e) => e.type)).toEqual(['downgrade', 'split']);
  });
  it('grows a Townhouse into a Manor only once the street reaches "to rise"', () => {
    const w = street();
    const h = townhouse(w, 12, 11, 20, 2);
    for (const [x, y] of [[13, 11], [12, 12], [13, 12]]) plot(w, x, y);
    addRaw(w, 'statue', 11, 12);
    addRaw(w, 'statue', 11, 13);
    addRaw(w, 'garden', 14, 12);
    expect(houseDesirability(w, h)).toBe(16);
    expect(rows(w, h).every((c) => c.met || c.need === 'desirability')).toBe(true);
    monthlyHousing(w);
    expect([h.tier, h.w, h.downTimer]).toEqual([5, 1, 0]);                 // below 20: it neither grows nor drops
    addRaw(w, 'statue', 14, 13);
    expect(houseDesirability(w, h)).toBe(22);
    const events = [];
    monthlyHousing(w, events);
    expect(events).toEqual([{ type: 'merge', id: h.id }, { type: 'upgrade', id: h.id, from: 5, to: 6 }]);
    expect([h.tier, h.w, h.d, h.residents]).toEqual([6, 2, 2, 20]);        // the empty plots add no one
  });
  it('turns a 2x2 home that empties into four empty plots, whether people leave or move out', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    manor(w, 12, 11, 1);
    w.mood = 10;                                                           // low mood: people leave
    departures(w);
    expect(housesOf(w).map((p) => [p.w, p.tier, p.residents])).toEqual([[1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0]]);
    const v = makeTestWorld();
    manor(v, 12, 20, 1);                                                   // no road: everyone moves out
    monthlyHousing(v);
    expect(housesOf(v).map((p) => [p.w, p.tier, p.residents])).toEqual([[1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0]]);
  });
  it('lists the next tier\'s needs, the desirability row and the merge line on the house sheet', () => {
    const w = street();
    const h = townhouse(w, 12, 11, 20);
    for (const [x, y] of [[13, 11], [12, 12], [13, 12]]) plot(w, x, y);
    const s = houseStatus(w, h);
    expect(s.checklist.map((c) => c.need)).toEqual(['road', ...TIERS[6].needs, 'desirability']);
    expect(s.checklist[s.checklist.length - 1]).toEqual({ need: 'desirability', met: false, value: 0, target: 20, keep: null });
    expect(s.merge).toEqual({ needed: true, ready: true });
    expect(needCause(w, h, 'merge')).toBe(null);
    const house = addRaw(w, 'house', 2, 11, { tier: 4, residents: 16 });
    expect(rows(w, house).map((c) => c.need)).toEqual(['road', ...TIERS[5].needs]);   // no desirability before the Manor
    expect(houseStatus(w, house).merge).toEqual({ needed: false, ready: false });
    const estate = addRaw(w, 'house', 24, 11, { tier: 9, w: 2, d: 2, residents: 100 });
    expect(rows(w, estate).find((c) => c.need === 'desirability').target).toBe(TIERS[9].desirability.keep);   // the top tier keeps
    expect([desirabilityTarget(4), desirabilityTarget(5), desirabilityTarget(6), desirabilityTarget(8), desirabilityTarget(9)]).toEqual([null, 20, 35, 65, 57]);
  });
  it('names the booth codes for entertainment', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const h = townhouse(w, 12, 11, 20);
    expect(needCause(w, h, 'entertainment')).toEqual({ code: 'no_booth', id: null });
    const roadless = addRaw(w, 'booth', 12, 13);                           // two tiles below the home, no road
    expect(needCause(w, h, 'entertainment')).toEqual({ code: 'booth_no_road', id: roadless.id });
    const booth = addRaw(w, 'booth', 16, 9);                               // on the road, unstaffed
    expect(needCause(w, h, 'entertainment')).toEqual({ code: 'booth_idle', id: booth.id });
    staffAll(w);
    expect(needCause(w, h, 'entertainment')).toBe(null);
    booth.paused = true;
    expect(needCause(w, h, 'entertainment')).toEqual({ code: 'booth_idle', id: booth.id });
  });
  it('traces a missing household good from the bazaar back to whether anything makes it', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const h = addRaw(w, 'house', 12, 11, { tier: 4, residents: 16, stockedFor: 16, stock: { grain: 4 } });
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'no_bazaar', id: null });
    const bazaar = addRaw(w, 'bazaar', 9, 8);
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'bazaar_idle', id: bazaar.id });
    staffAll(w);
    bazaar.store.grain = 50;                                               // grain is no help with pottery
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'good_unmade', good: 'pottery', id: bazaar.id });   // nothing makes or keeps any
    const store = addRaw(w, 'storehouse', 4, 8);                           // a store for pottery in its supply reach, empty
    staffAll(w);
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'good_unmade', good: 'pottery', id: bazaar.id });
    store.store.clay = 30;                                                 // clay is not pottery
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'good_unmade', good: 'pottery', id: bazaar.id });
    store.store.pottery = 12;                                              // in store: the bazaar restocks at the month's end
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'no_good', good: 'pottery', id: bazaar.id });
    bazaar.store.pottery = 6;                                              // at the bazaar: the home tops up at the month's end
    expect(needCause(w, h, 'pottery')).toEqual({ code: 'next_delivery', id: bazaar.id, good: 'pottery' });
    h.stock.pottery = 1;                                                   // a month for 16 people
    expect(needCause(w, h, 'pottery')).toBe(null);
    expect(needCause(w, h, 'food')).toEqual(null);
    const granary = addRaw(w, 'granary', 20, 8);                           // food causes look only at food stores
    staffAll(w);
    h.stock.grain = 0;
    bazaar.store.grain = 0;
    expect(needCause(w, h, 'food')).toEqual({ code: 'granary_empty', id: granary.id });
  });
  it('traces two kinds of food through the food the home has none of', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const h = addRaw(w, 'house', 12, 11, { tier: 6, w: 2, d: 2, residents: 20, stockedFor: 20, stock: { grain: 5 } });
    const bazaar = addRaw(w, 'bazaar', 9, 8, { store: { grain: 40 } });
    staffAll(w);
    expect(needCause(w, h, 'twoFoods')).toEqual({ code: 'good_unmade', good: 'figs', id: bazaar.id });
    const granary = addRaw(w, 'granary', 4, 8, { store: { grain: 100 } });
    staffAll(w);
    expect(needCause(w, h, 'twoFoods')).toEqual({ code: 'good_unmade', good: 'figs', id: bazaar.id });   // a granary, but no figs in it
    granary.store.figs = 20;
    expect(needCause(w, h, 'twoFoods')).toEqual({ code: 'no_good', good: 'figs', id: bazaar.id });
    bazaar.store.figs = 8;
    expect(needCause(w, h, 'twoFoods')).toEqual({ code: 'next_delivery', id: bazaar.id, good: 'figs' });
    h.stock.figs = 1;
    expect(needCause(w, h, 'twoFoods')).toBe(null);
  });
  it('blames a missing road for needs that come along roads, but not for desirability or a square', () => {
    const w = makeTestWorld();
    const h = addRaw(w, 'house', 12, 20, { tier: 5, residents: 20 });   // nothing in stock
    for (const need of ['road', 'entertainment', 'pottery', 'twoFoods']) expect(needCause(w, h, need)).toEqual({ code: 'no_road', id: null });
    expect(needCause(w, h, 'desirability').code).toBe('low_desirability');
    expect(needCause(w, h, 'merge')).toEqual({ code: 'no_square', id: null });
  });
  it('agrees with the checklist: no cause exactly when a row is met, for every need of tiers 5 to 9, through every state', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const homes = [
      townhouse(w, 12, 11, 20),
      addRaw(w, 'house', 2, 11, { tier: 7, w: 2, d: 2, residents: 100 }),  // a Fine manor: the next tier wants linen
      addRaw(w, 'house', 22, 11, { tier: 9, w: 2, d: 2, residents: 120 }), // an Estate: the top tier
      addRaw(w, 'house', 12, 20, { tier: 5, residents: 10 }),               // touches no road
    ];
    let bazaar, store, granary, booth;
    const steps = [
      () => {},
      () => { addRaw(w, 'well', 14, 9); addRaw(w, 'well', 4, 9); addRaw(w, 'well', 25, 9); },
      () => { booth = addRaw(w, 'booth', 16, 9); },                         // unstaffed
      () => { staffAll(w); },
      () => { bazaar = addRaw(w, 'bazaar', 9, 8); staffAll(w); },          // empty
      () => { store = addRaw(w, 'storehouse', 17, 8); granary = addRaw(w, 'granary', 6, 8); staffAll(w); },
      () => { store.store.pottery = 50; store.store.beer = 20; },
      () => { store.store.linen = 20; store.store.jewellery = 20; granary.store.grain = 80; },
      () => { granary.store.figs = 30; bazaar.store.figs = 10; },
      () => { for (const h of homes) Object.assign(h, { stockedFor: h.residents, stock: { grain: 40, figs: 40, pottery: 10, beer: 10, linen: 10, jewellery: 10 } }); },
      () => { addRaw(w, 'temple', 18, 11); staffAll(w); },
      () => { for (const [x, y] of [[11, 12], [12, 12], [13, 12]]) addRaw(w, 'statue', x, y); },
      () => { for (const [x, y] of [[2, 13], [3, 13], [4, 12], [1, 13]]) addRaw(w, 'statue', x, y); },
      () => { booth.paused = true; },
      () => { homes[1].stock.figs = 0; homes[2].stock.jewellery = 0; },
      () => { removeBuilding(w, buildingAt(w, 12, 12).id); plot(w, 12, 12); plot(w, 13, 11); },
    ];
    for (const step of steps) {
      step();
      for (const h of homes) {
        const s = houseStatus(w, h);
        for (const row of s.checklist) expect([h.id, row.need, needCause(w, h, row.need) === null]).toEqual([h.id, row.need, row.met]);
        expect([h.id, needCause(w, h, 'merge') === null]).toEqual([h.id, !s.merge.needed || s.merge.ready]);
      }
    }
  });
});
```


In `tests/all.js`, add the new file after the need-cause tests:

```js
import './sim/needCause.test.js';
import './sim/upperTiers.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sim upper tiers and merges"
```

Expected: `LOAD ERROR` (the test file imports `src/sim/merge.js`, which does not exist yet). With `merge.js` created but `housing.js` not yet changed, the import of `desirabilityTarget` fails the same way.

- [ ] **Step 3: Implement**

Create `src/sim/merge.js`:

```js
// Merging and splitting homes (spec 4.6). A Townhouse grows into a Manor only by joining the three plots beside it
// that make a 2x2 square: each must be a 1x1 housing plot at Townhouse or better, or one nobody lives in yet. When
// more than one square qualifies, a fixed order picks one: north-west first, then clockwise. The merged home keeps
// the lowest id and takes everyone's residents and stock. A 2x2 home that drops below Manor splits back into four
// Townhouses with its residents shared out. The monthly housing check (src/sim/housing.js) calls these.
import { TIERS } from '../data/housing.js';
import { buildingAt, makeBuilding, insertBuilding, removeBuilding } from './world.js';
import { inBounds } from './grid.js';

// The first tier whose homes are 2x2 (the Manor), and the tier a square's plots must have reached (the Townhouse).
export const MERGE_TIER = TIERS.findIndex((t) => t && t.size === 2);
const JOIN_TIER = MERGE_TIER - 1;

// The four squares that hold a home, as offsets of the square's north-west corner from the home: the square to its
// north-west first, then clockwise (north-east, south-east, south-west).
const SQUARES = [[-1, -1], [0, -1], [0, 0], [-1, 0]];
const CORNERS = [[0, 0], [1, 0], [0, 1], [1, 1]];   // a square's tiles: NW, NE, SW, SE

const isPlot = (b) => Boolean(b && b.type === 'house' && b.w === 1 && b.d === 1);

// A tile whose plot can join a square: a 1x1 housing plot at Townhouse or better, or one with no residents yet.
function joins(world, x, y) {
  if (!inBounds(world.size, x, y)) return false;
  const b = buildingAt(world, x, y);
  return isPlot(b) && (b.tier >= JOIN_TIER || b.residents === 0);
}

// The north-west corner { x, y } of the first square the home can merge into, or null when none can form.
export function mergeSquare(world, house) {
  if (!isPlot(house) || house.tier < JOIN_TIER) return null;
  for (const [dx, dy] of SQUARES) {
    const x = house.x + dx, y = house.y + dy;
    if (CORNERS.every(([cx, cy]) => joins(world, x + cx, y + cy))) return { x, y };
  }
  return null;
}

// Joins the square at origin into one Manor: the plot with the lowest id stays (its id, now 2x2), the other three
// go, and their residents and household stock are added together. Returns the merged home, or null when the square
// at origin cannot form.
export function mergeHouses(world, house, origin) {
  if (!origin) return null;
  const parts = CORNERS.map(([cx, cy]) => (inBounds(world.size, origin.x + cx, origin.y + cy) ? buildingAt(world, origin.x + cx, origin.y + cy) : null));
  if (!parts.every(isPlot) || new Set(parts.map((b) => b.id)).size !== 4) return null;
  const keep = parts.reduce((a, b) => (b.id < a.id ? b : a));
  const residents = parts.reduce((n, b) => n + b.residents, 0);
  const stock = {};
  for (const b of parts) for (const [good, n] of Object.entries(b.stock || {})) if (n > 0) stock[good] = (stock[good] || 0) + n;
  for (const b of parts) removeBuilding(world, b.id);
  Object.assign(keep, {
    x: origin.x, y: origin.y, w: 2, d: 2, tier: MERGE_TIER, residents, stock, stockedFor: residents,
    downTimer: 0, leftThisMonth: 0, met: { ...(house && house.met) },
  });
  return insertBuilding(world, keep);
}

// n shared among k parts as evenly as whole numbers allow, the first parts taking one more: part i's share.
const shareOf = (n, k, i) => Math.floor(n / k) + (i < n % k ? 1 : 0);

// Splits a 2x2 home into four plots: Townhouses sharing its residents evenly (the north-west plot keeps its id),
// with its household stock shared among the plots that have residents. A plot left with nobody is an empty plot,
// so a 2x2 home emptied of residents splits into four empty plots. Returns the four plots, NW, NE, SW, SE.
export function splitHouse(world, house) {
  const { x, y, residents } = house;
  const stock = house.stock || {};
  removeBuilding(world, house.id);
  const shares = CORNERS.map((_, i) => shareOf(residents, 4, i));
  const lived = shares.filter((r) => r > 0).length;
  let j = 0;
  return CORNERS.map(([cx, cy], i) => {
    const b = i === 0 ? house : makeBuilding(world, 'house', x + cx, y + cy);
    const r = shares[i];
    const own = {};
    if (r > 0) {
      for (const [good, n] of Object.entries(stock)) { const k = shareOf(n, lived, j); if (k > 0) own[good] = k; }
      j++;
    }
    Object.assign(b, {
      x: x + cx, y: y + cy, w: 1, d: 1, tier: r > 0 ? JOIN_TIER : 0, residents: r, stock: own,
      met: {}, downTimer: 0, leftThisMonth: 0, stockedFor: r,
    });
    return insertBuilding(world, b);
  });
}
```


Then change `src/sim/housing.js` as follows (each block appears exactly once).

1. Imports: after the labour import add the desirability and merge imports. (The goods import already reads `import { FOOD_GOODS, HOUSEHOLD_GOODS } from '../data/goods.js';` since Task 4.)

```js
import { isWorking } from './labour.js';
```

with:

```js
import { isWorking } from './labour.js';
import { desirabilityField, houseDesirability } from './desirability.js';
import { MERGE_TIER, mergeSquare, mergeHouses, splitHouse } from './merge.js';
```

2. `computeCoverage`: entertainment is a coverage need like water and religion.

```js
  const cov = { water: new Set(), religion: new Set() };
```

with:

```js
  const cov = { water: new Set(), religion: new Set(), entertainment: new Set() };
```

3. `monthlyHousing`, the top of the loop: take the month's desirability field once, and skip a home merged away earlier in the same check.

```js
  const bazaars = bazaarsByHouse(world);
  for (const h of housesOf(world)) {
    h.leftThisMonth = 0;
```

with:

```js
  const bazaars = bazaarsByHouse(world);
  const field = desirabilityField(world);   // every home is judged on the street as it stood when the month ended
  for (const h of housesOf(world)) {
    if (world.buildings[h.id] !== h) continue;   // merged into a neighbour's Manor earlier in this check
    h.leftThisMonth = 0;
```

4. `monthlyHousing`, the `met` object (Task 4's lines stay as they are; only the entertainment line is new):

```js
      religion: cov.religion.has(h.id),
```

with:

```js
      religion: cov.religion.has(h.id),
      entertainment: cov.entertainment.has(h.id),
```

5. `monthlyHousing`, the rise and fall decision and the leaving step (untouched by Task 4). Household goods were already used up above by Task 4's `consumeGood`; nothing here uses them again.

```js
    const currentOk = met.road && needsOf(h.tier).every((n) => met[n]);
    if (currentOk) {
      h.downTimer = 0;
      const next = h.tier + 1;
      if (next <= MAX_TIER && needsOf(next).every((n) => met[n])) {
        if (events) events.push({ type: 'upgrade', id: h.id, from: h.tier, to: next });
        h.tier = next;
        world.tally.upgrades += 1;
      }
    } else {
      h.downTimer++;
      if (h.downTimer >= DOWNGRADE_AFTER_MONTHS) {
        if (h.tier > 1) {
          if (events) events.push({ type: 'downgrade', id: h.id, from: h.tier, to: h.tier - 1 });
          h.tier--;
        }
        h.downTimer = 0;
      }
    }

    const cap = TIERS[h.tier].capacity;
    let leave = met.road ? Math.max(0, h.residents - cap) : h.residents;
    leave = Math.min(leave, leaveCap(h));
    if (leave > 0) removeResidents(h, leave);
```

with:

```js
    // Tiers 6-9 also want a pleasant street (spec 4.6): rising needs the next tier's "to rise" desirability and
    // holding needs the tier's "to keep" value; between the two a home neither rises nor falls. Below "to keep"
    // starts the countdown like an unmet need. Read only for homes where a value applies, from the month's field.
    const keep = keepOf(h.tier);
    const next = h.tier + 1;
    const rise = riseOf(next);
    const value = keep !== null || rise !== null ? houseDesirability(world, h, field) : 0;
    const currentOk = met.road && needsOf(h.tier).every((n) => met[n]) && (keep === null || value >= keep);
    let home = h;
    if (currentOk) {
      h.downTimer = 0;
      if (next <= MAX_TIER && needsOf(next).every((n) => met[n]) && (rise === null || value >= rise)) {
        if (TIERS[next].size > h.w) {
          // A Townhouse becomes a Manor only by joining a 2x2 square (spec 4.6); with no square it waits.
          const origin = mergeSquare(world, h);
          if (origin) {
            home = mergeHouses(world, h, origin);
            if (events) events.push({ type: 'merge', id: home.id }, { type: 'upgrade', id: home.id, from: next - 1, to: next });
            world.tally.upgrades += 1;
          }
        } else {
          if (events) events.push({ type: 'upgrade', id: h.id, from: h.tier, to: next });
          h.tier = next;
          world.tally.upgrades += 1;
        }
      }
    } else {
      h.downTimer++;
      if (h.downTimer >= DOWNGRADE_AFTER_MONTHS) {
        h.downTimer = 0;
        if (h.tier > 1) {
          if (events) events.push({ type: 'downgrade', id: h.id, from: h.tier, to: h.tier - 1 });
          if (TIERS[h.tier - 1].size < h.w) {
            // A Manor that drops a tier splits back into four Townhouses, residents shared out (spec 4.6).
            splitHouse(world, h);
            if (events) events.push({ type: 'split', id: h.id });
            continue;
          }
          h.tier--;
        }
      }
    }

    const cap = TIERS[home.tier].capacity;
    let leave = met.road ? Math.max(0, home.residents - cap) : home.residents;
    leave = Math.min(leave, leaveCap(home));
    if (leave > 0) removeResidents(home, leave);
    if (home.residents === 0 && home.w > 1) splitHouse(world, home);   // an emptied 2x2 home becomes four empty plots
```

6. `liveNeeds`: the whole function and its comment. Task 4's `needToMeet(house, good)` is reused, not redeclared.

```js
// The checklist is judged live from the world as it is now, not from the snapshot the last monthly tick
// stored in house.met, so a plot beside a road or a brand-new hut is never shown as missing what it has.
// Only the downgrade countdown is timer-based.
function liveNeeds(world, house) {
  const foodNeed = foodNeedToMeet(house);
  return {
    road: touchesRoad(world, house),
    water: coveredBy(world, house, 'water'),
    religion: coveredBy(world, house, 'religion'),
    food: foodNeed > 0 && foodOnHand(house) >= foodNeed,
  };
}
```

with:

```js
// The desirability a tier asks for: "to rise" into it, "to keep" it (spec 4.6); null where it asks for none.
const riseOf = (tier) => (tier >= 1 && tier <= MAX_TIER && TIERS[tier].desirability ? TIERS[tier].desirability.rise : null);
const keepOf = (tier) => (tier >= 1 && tier <= MAX_TIER && TIERS[tier].desirability ? TIERS[tier].desirability.keep : null);

// The value the checklist's desirability row measures against: the next tier's "to rise", or for the top tier
// its own "to keep"; null for homes whose next tier asks for none (tiers 0-4).
export function desirabilityTarget(tier) {
  if (tier + 1 <= MAX_TIER) return riseOf(tier + 1);
  return keepOf(tier);
}

// The checklist is judged live from the world as it is now, not from the snapshot the last monthly tick
// stored in house.met, so a plot beside a road or a brand-new hut is never shown as missing what it has.
// Only the downgrade countdown is timer-based. Household goods count as met while the stock covers the month's
// use (the monthly check's rule); two kinds of food means grain and figs are both in stock. desirability is
// there only for homes whose checklist has the row; merge is false only for a Townhouse with no square to join.
function liveNeeds(world, house) {
  const foodNeed = needToMeet(house, FOOD_GOODS[0]);
  const met = {
    road: touchesRoad(world, house),
    water: coveredBy(world, house, 'water'),
    religion: coveredBy(world, house, 'religion'),
    entertainment: coveredBy(world, house, 'entertainment'),
    food: foodNeed > 0 && foodOnHand(house) >= foodNeed,
    twoFoods: FOOD_GOODS.every((g) => (house.stock[g] || 0) > 0),
  };
  for (const good of HOUSEHOLD_GOODS) {
    const n = needToMeet(house, good);
    met[good] = n > 0 && (house.stock[good] || 0) >= n;
  }
  const target = desirabilityTarget(house.tier);
  if (target !== null) met.desirability = houseDesirability(world, house) >= target;
  met.merge = house.tier !== MERGE_TIER - 1 || mergeSquare(world, house) !== null;
  return met;
}

```

7. `houseStatus`: the whole function.

```js
export function houseStatus(world, house) {
  const tier = house.tier;
  const info = tier >= 1 ? TIERS[tier] : null;
  const next = tier + 1 <= MAX_TIER ? { tier: tier + 1, name: TIERS[tier + 1].name } : null;
  const met = liveNeeds(world, house);
  const checklistNeeds = ['road', ...needsOf(next ? next.tier : tier)];
  const checklist = checklistNeeds.map((need) => ({ need, met: Boolean(met[need]) }));
  const missingNow = tier >= 1 ? ['road', ...needsOf(tier)].filter((n) => !met[n]) : [];
  return {
    tier,
    name: info ? info.name : 'Empty plot',
    residents: house.residents,
    capacity: info ? info.capacity : TIERS[1].capacity,
    next,
    checklist,
    missingNow,
    downgradeIn: tier > 1 && house.downTimer > 0 ? DOWNGRADE_AFTER_MONTHS - house.downTimer : null,
  };
}
```

with:

```js
// What the house sheet shows (spec 6.3): the next tier's checklist, with a desirability row { need: 'desirability',
// met, value, target, keep } from the Townhouse up (keep is the home's own "to keep" value, null for a Townhouse);
// what the home is missing now (with 'desirability' when it is below "to keep"); the countdown; and for a
// Townhouse whether it needs a 2x2 square to grow and whether one can form.
export function houseStatus(world, house) {
  const tier = house.tier;
  const info = tier >= 1 ? TIERS[tier] : null;
  const next = tier + 1 <= MAX_TIER ? { tier: tier + 1, name: TIERS[tier + 1].name } : null;
  const met = liveNeeds(world, house);
  const checklistNeeds = ['road', ...needsOf(next ? next.tier : tier)];
  const checklist = checklistNeeds.map((need) => ({ need, met: Boolean(met[need]) }));
  const target = desirabilityTarget(tier);
  const keep = keepOf(tier);
  const value = target !== null || keep !== null ? houseDesirability(world, house) : null;
  if (target !== null) checklist.push({ need: 'desirability', met: met.desirability, value, target, keep });
  const missingNow = tier >= 1 ? ['road', ...needsOf(tier)].filter((n) => !met[n]) : [];
  if (keep !== null && value < keep) missingNow.push('desirability');
  const mergeNeeded = tier === MERGE_TIER - 1;
  return {
    tier,
    name: info ? info.name : 'Empty plot',
    residents: house.residents,
    capacity: info ? info.capacity : TIERS[1].capacity,
    next,
    checklist,
    missingNow,
    downgradeIn: tier > 1 && house.downTimer > 0 ? DOWNGRADE_AFTER_MONTHS - house.downTimer : null,
    merge: { needed: mergeNeeded, ready: mergeNeeded && met.merge },
  };
}
```

8. `needCause`: replace the whole function together with the comment above it, that is everything from the line
`// Why a home lacks a need (early-game pass 2.10), judged by the same live rules as the checklist: null when it` down to the closing brace after `  return { code: 'bazaar_empty', id: working[0].id };` (unchanged since the early-game pass; Task 4 did not touch it), with:

```js
// Why a home lacks a need (early-game pass 2.10), judged by the same live rules as the checklist: null when it
// has the need (or the need is unknown), else { code, id, ... }. A home that touches no road blames the road for
// every need that comes along the roads, since nothing can reach it without one. Providers (a well, a temple, a
// booth, a bazaar) are looked for in reach whether or not they work, so a paused or unstaffed one is named
// (well_idle, temple_idle, booth_idle, bazaar_idle, id the building) rather than answered with "build another";
// no_well, no_temple, no_booth and no_bazaar mean nothing of that kind reaches the home at all. Before those, a
// provider of that kind that touches no road, within its reach of the home in a straight line, is named
// (well_no_road, temple_no_road, booth_no_road, bazaar_no_road, id the nearest such), since it only needs a road.
// For food, a working bazaar in reach decides: one holding food, or able to draw on a granary that holds some,
// means next_delivery (id the bazaar); else granary_empty (id the nearest working granary in its supply reach,
// which holds nothing), granary_idle (the same, but every such granary is paused or short of workers; id the
// nearest) or bazaar_empty (id the bazaar, no granary in reach at all).
// For a household good (pottery, beer, linen, jewellery) and for two kinds of food (traced through the first food
// the home has none of), the same bazaar steps, then: next_delivery { good } when a working bazaar in reach has some;
// no_good { good, id: bazaar } when none has any yet but a store within one's supply reach holds some (the bazaar
// restocks at the month's end); good_unmade { good, id: bazaar } when no store within their supply reach holds any.
// Desirability below the row's target is low_desirability { value, target }; a Townhouse with no 2x2 square to
// join lacks 'merge' with no_square. Neither depends on the road.
const PROVIDER_KIND = { water: 'well', religion: 'temple', entertainment: 'booth' };

export function needCause(world, house, need) {
  const met = liveNeeds(world, house);
  if (!(need in met) || met[need]) return null;
  if (need === 'desirability') return { code: 'low_desirability', id: null, value: houseDesirability(world, house), target: desirabilityTarget(house.tier) };
  if (need === 'merge') return { code: 'no_square', id: null };
  if (!met.road) return { code: 'no_road', id: null };
  const kind = PROVIDER_KIND[need];
  if (kind) {
    const matches = (def) => def.provides === need;
    const [near] = providersReaching(world, house, matches);
    if (near) return { code: `${kind}_idle`, id: near.id };
    const [roadless] = roadlessProvidersNear(world, house, matches);
    return roadless ? { code: `${kind}_no_road`, id: roadless.id } : { code: `no_${kind}`, id: null };
  }
  if (need === 'food') return foodCause(world, house);
  const good = need === 'twoFoods' ? FOOD_GOODS.find((g) => !((house.stock[g] || 0) > 0)) : need;
  return goodCause(world, house, good);
}

// The bazaars reaching the home that sell `good` (any of FOOD_GOODS for food): no_bazaar, bazaar_no_road or
// bazaar_idle when none of them can serve it, else the working ones, nearest first.
function bazaarsFor(world, house, goods) {
  const sells = (def) => (def.sells || []).some((g) => goods.includes(g));
  const reaching = providersReaching(world, house, sells);
  if (!reaching.length) {
    const [roadless] = roadlessProvidersNear(world, house, sells);
    return { cause: roadless ? { code: 'bazaar_no_road', id: roadless.id } : { code: 'no_bazaar', id: null } };
  }
  const working = reaching.filter((bz) => isWorking(world, bz));
  if (!working.length) return { cause: { code: 'bazaar_idle', id: reaching[0].id } };
  return { working };
}

function foodCause(world, house) {
  const { cause, working } = bazaarsFor(world, house, FOOD_GOODS);
  if (cause) return cause;
  const supply = new Map(working.map((bz) => [bz.id, graneriesFor(world, bz)]));
  const holds = (b) => FOOD_GOODS.some((g) => (b.store[g] || 0) > 0);
  const coming = working.find((bz) => holds(bz) || supply.get(bz.id).some(holds));
  if (coming) return { code: 'next_delivery', id: coming.id };
  // Farms only fill working storage (storageFor), so an empty store that is paused or short of workers needs
  // resuming or staff, not a farm: granary_empty only when one of the bazaar's stores works.
  const live = working.find((bz) => supply.get(bz.id).some((o) => isWorking(world, o)));
  if (live) return { code: 'granary_empty', id: supply.get(live.id).find((o) => isWorking(world, o)).id };
  const bare = working.find((bz) => supply.get(bz.id).length);
  if (bare) return { code: 'granary_idle', id: supply.get(bare.id)[0].id };
  return { code: 'bazaar_empty', id: working[0].id };
}

function goodCause(world, house, good) {
  const { cause, working } = bazaarsFor(world, house, [good]);
  if (cause) return cause;
  const holds = (b) => (b.store[good] || 0) > 0;
  const stocked = working.find(holds);
  if (stocked) return { code: 'next_delivery', id: stocked.id, good };
  const supplied = working.find((bz) => goodStoresFor(world, bz, good).some(holds));
  if (supplied) return { code: 'no_good', good, id: supplied.id };
  return { code: 'good_unmade', good, id: working[0].id };
}
```

9. At the very end of the file, after Task 4's `graneriesFor` (which stays as it is), append:

```js
// The stores a bazaar draws one good from (restockBazaars' rule): any store of that good within its supply reach,
// nearest first, holding it or not. Household goods and the second food are traced through these.
function goodStoresFor(world, bazaar, good) {
  const def = BUILDINGS[bazaar.type];
  return buildingsInReach(world, bazaar, def.supplyReach, (o) => (BUILDINGS[o.type].stores || []).includes(good)).map((e) => e.b);
}
```


In `src/sim/immigration.js` (`departures` can empty a Manor too), replace:

```js
import { removeResidents, leaveCap } from './housing.js';
```

with:

```js
import { removeResidents, leaveCap } from './housing.js';
import { splitHouse } from './merge.js';
```

and then replace:

```js
    if (k > 0) { removeResidents(h, k); n -= k; left += k; }
```

with:

```js
    if (k > 0) { removeResidents(h, k); n -= k; left += k; }
    if (h.residents === 0 && h.w > 1) splitHouse(world, h);   // an emptied 2x2 home becomes four empty plots
```


- [ ] **Step 4: Run the tests to see them pass**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sim upper tiers and merges"
```

Expected: `14 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

None. Checked with `Get-ChildItem tests -Recurse -Filter *.js | Select-String -Pattern "houseStatus|needCause|monthlyHousing|checklist"`: the need-cause tests use a Cottage (its checklist is still road, water, food, temple), the housing and events tests use tiers 1-4 (no desirability row, no merge), and the overlay and house-sheet tests read rows generically. On the verification base the whole suite passed with no other edit.

- [ ] **Step 6: Visual check**

None: this task changes only the simulation (no drawing, no interface).

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED` (793 tests on the verification base: 779 + 14).

- [ ] **Step 8: Commit**

```powershell
git add src/sim/merge.js src/sim/housing.js src/sim/immigration.js tests/sim/upperTiers.test.js tests/all.js sw-files.js
git commit -m @'
Grow homes past House: Townhouses merge into Manors on pleasant streets

Tiers 5-9 check entertainment and desirability to rise and to keep, with a
month's warning. Four Townhouses in a square merge into one Manor (north-west
first), and a Manor that drops a tier splits back. The house checklist and
needCause cover every new need, with booth, goods and square causes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 7: Trade

**Files:**
- Create: `src/sim/trade.js`
- Create: `tests/sim/trade.test.js`
- Modify: `src/sim/clock.js` (`runMonth` calls `tradeMonth`)
- Modify: `tests/all.js` (one import line), `sw-files.js` (regenerated)

**Interfaces:**
- Consumes: `PARTNERS` (`{ name, milestone, routeCost, buys, sells, gift }`), `CARAVAN_EVERY_MONTHS`, `PRICE_DRIFT`, `TRADE_REACH` (Task 2, `src/data/trade.js`); `routeCostOf(world, partnerId)` (`src/sim/costs.js`); `world.trade` and the tallies `sold`, `bought`, `tradeIncome`, `caravans` (Task 1); `storeAccepts(b, good)` and `storeTotal(b)` (Task 3, `src/sim/production.js`); `atLeast`, `canAfford`/`spend`, `buildingsInReach`, `adjacentRoadTiles`, `isWorking`, `createRng`/`hash2`.
- Produces: `openRoute(world, partnerId)`, `setTradeOrder(world, good, mode, keep)`, `tradeMonth(world, events)` (in `runMonth`), `tradePrices(world, partnerId)`, `nextCaravanDay(world)`, `postConnected(world)`, and `openRoutes(world)` for Task 8; the event `{ type: 'caravan', partner, sold, bought, income, spent, gift }`.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/trade.test.js` (a Market town on a 32-tile map with a road joined to the trade entry at (31, 31)):

```js
import { describe, it, expect } from '../harness.js';
import { PARTNERS, PRICE_DRIFT } from '../../src/data/trade.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import {
  openRoute, setTradeOrder, tradeMonth, tradePrices, nextCaravanDay, postConnected, drawDrift, partnerUnlocked, openRoutes,
} from '../../src/sim/trade.js';
import { runMonth } from '../../src/sim/clock.js';
import { routeCostOf } from '../../src/sim/costs.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

// A Market town on a 32-tile map: a road along y = 10 joined down x = 31 to the trade entry at (31, 31), a
// trading post on it at (20, 8) and a storehouse and a granary within its 16 road tiles.
function market({ post = true } = {}) {
  const w = makeTestWorld({ gold: 1000 });
  setRoad(w, 0, 10, 31, 10);
  setRoad(w, 31, 10, 31, 31);
  w.milestone = 'market_town';
  const store = addRaw(w, 'storehouse', 16, 8);
  const granary = addRaw(w, 'granary', 12, 8);
  const tp = post ? addRaw(w, 'trading_post', 20, 8) : null;
  staffAll(w);
  return { w, store, granary, tp };
}

// The same, with the Memphis route open and its gift already given, on the first caravan day.
function withRoute() {
  const m = market();
  m.w.trade.routes.memphis = { since: 0, gifted: true };
  m.w.day = 90;
  return m;
}

describe('sim trade', () => {
  it('opens a route once the partner is unlocked and a trading post stands, for its cost at the city\'s difficulty', () => {
    const { w } = market({ post: false });
    expect(openRoute(w, 'atlantis')).toEqual({ ok: false, reason: 'unknown_partner', warnings: [] });
    w.milestone = 'town';
    expect(partnerUnlocked(w, 'memphis')).toBe(false);
    expect(openRoute(w, 'memphis').reason).toBe('locked');
    w.milestone = 'market_town';
    expect(openRoute(w, 'memphis').reason).toBe('no_post');
    const tp = addRaw(w, 'trading_post', 20, 8);
    w.gold = -300;                                                         // 300 more would pass the debt floor of -500
    expect(openRoute(w, 'memphis').reason).toBe('no_gold');
    w.gold = 1000;
    expect(openRoute(w, 'memphis')).toEqual({ ok: true, cost: PARTNERS.memphis.routeCost, warnings: [] });
    expect(w.gold).toBe(700);
    expect(w.trade.routes.memphis).toEqual({ since: 0, gifted: false });
    expect(openRoutes(w)).toBe(1);
    expect(openRoute(w, 'memphis').reason).toBe('already_open');
    expect(openRoute(w, 'byblos').reason).toBe('locked');                 // Byblos waits for the Great city
    w.milestone = 'great_city';
    w.difficulty = 'hard';
    expect(routeCostOf(w, 'byblos')).toBe(750);
    w.road[idx(w.size, 31, 20)] = 0;                                       // cut the way to the trade entry
    w.roadVersion++;
    expect(postConnected(w)).toBe(false);
    expect(openRoute(w, 'byblos')).toEqual({ ok: true, cost: 750, warnings: ['not_connected'] });
    expect(w.gold).toBe(-50);
    const relaxed = market().w;
    relaxed.difficulty = 'relaxed';
    expect(openRoute(relaxed, 'memphis').cost).toBe(240);
    expect(tp.type).toBe('trading_post');
  });
  it('takes a buy, sell or ignore order per good with a whole number to keep', () => {
    const { w } = market();
    expect(setTradeOrder(w, 'pottery', 'sell', 20)).toEqual({ ok: true, warnings: [] });
    expect(setTradeOrder(w, 'clay', 'buy', 0)).toEqual({ ok: true, warnings: [] });
    expect(w.trade.orders).toEqual({ pottery: { mode: 'sell', keep: 20 }, clay: { mode: 'buy', keep: 0 } });
    expect(setTradeOrder(w, 'pottery', 'ignore', 20).ok).toBe(true);
    expect(w.trade.orders.pottery).toEqual({ mode: 'ignore', keep: 20 });  // the level is kept for later
    expect(setTradeOrder(w, 'gold_dust', 'sell', 1).reason).toBe('unknown_good');
    expect(setTradeOrder(w, 'pottery', 'swap', 1).reason).toBe('bad_mode');
    expect(setTradeOrder(w, 'pottery', 'sell', -1).reason).toBe('bad_keep');
    expect(setTradeOrder(w, 'pottery', 'sell', 2.5).reason).toBe('bad_keep');
    expect(w.trade.orders.pottery).toEqual({ mode: 'ignore', keep: 20 });
  });
  it('sells only what is above the level to keep and buys only up to it, from and into stores near the post', () => {
    const { w, store } = withRoute();
    store.store = { pottery: 60, clay: 10 };
    setTradeOrder(w, 'pottery', 'sell', 20);
    setTradeOrder(w, 'clay', 'buy', 30);
    setTradeOrder(w, 'figs', 'ignore', 50);
    expect(tradePrices(w, 'memphis')).toEqual({ buys: { grain: 1, pottery: 8, beer: 10 }, sells: { clay: 2, figs: 3, barley: 3 } });
    const events = [];
    tradeMonth(w, events);
    expect(events).toEqual([{ type: 'caravan', partner: 'memphis', sold: { pottery: 40 }, bought: { clay: 20 }, income: 320, spent: 40, gift: null }]);
    expect(store.store).toEqual({ pottery: 20, clay: 30 });
    expect(w.gold).toBe(1000 + 320 - 40);
    w.day = 180;
    tradeMonth(w, events);
    expect(events[1]).toEqual({ type: 'caravan', partner: 'memphis', sold: {}, bought: {}, income: 0, spent: 0, gift: null });   // nothing above or below the levels
  });
  it('never takes the treasury below zero, and spends the caravan\'s own takings first', () => {
    const { w, store } = withRoute();
    setTradeOrder(w, 'clay', 'buy', 100);
    w.gold = 25;
    tradeMonth(w);
    expect([store.store.clay, w.gold]).toEqual([12, 1]);                   // 12 clay at 2 gold: 24 of the 25
    w.day = 180;
    w.gold = -50;
    tradeMonth(w);
    expect([store.store.clay, w.gold]).toEqual([12, -50]);                 // in debt: buys nothing
    w.day = 270;
    store.store.pottery = 10;
    setTradeOrder(w, 'pottery', 'sell', 0);
    tradeMonth(w);
    expect([store.store.pottery, store.store.clay, w.gold]).toEqual([0, 27, 0]);   // -50 + 80 for the pottery leaves 30: 15 clay
  });
  it('carries at most a quarter of each yearly quota per visit, and no more than the quota in a year', () => {
    const { w, store } = withRoute();
    store.store = { pottery: 500 };
    setTradeOrder(w, 'pottery', 'sell', 0);
    const sold = [];
    for (const day of [90, 180, 270]) {
      w.day = day;
      const events = [];
      tradeMonth(w, events);
      sold.push(events[0].sold.pottery);
    }
    expect(sold).toEqual([50, 50, 50]);                                    // a quarter of Memphis's 200
    expect(w.trade.used.memphis.pottery).toBe(150);
    w.trade.used.memphis.pottery = 180;
    w.day = 330;                                                           // not a caravan month: nothing moves
    tradeMonth(w);
    expect(store.store.pottery).toBe(350);
    w.day = 270;
    const events = [];
    tradeMonth(w, events);
    expect(events[0].sold).toEqual({ pottery: 20 });                       // the last 20 of this year's 200
    w.day = 360;                                                           // a new year: the quota starts again
    tradeMonth(w, events);
    expect([w.trade.year, events[1].sold.pottery, w.trade.used.memphis.pottery]).toEqual([2, 50, 50]);
  });
  it('brings the first caravan\'s gift once, into stores near the post', () => {
    const { w, store, granary } = market();
    w.trade.routes.memphis = { since: 0, gifted: false };
    w.day = 90;
    const events = [];
    tradeMonth(w, events);
    expect(events[0].gift).toEqual({ good: PARTNERS.memphis.gift.good, n: 40 });
    expect(store.store.clay).toBe(40);
    expect(w.trade.routes.memphis.gifted).toBe(true);
    w.day = 180;
    tradeMonth(w, events);
    expect([events[1].gift, store.store.clay]).toEqual([null, 40]);
    const full = market();
    full.store.store = { pottery: 790 };                                   // room for 10 of the 800
    full.w.trade.routes.memphis = { since: 0, gifted: false };
    full.w.day = 90;
    const ev = [];
    tradeMonth(full.w, ev);
    expect([ev[0].gift, full.store.store.clay]).toEqual([{ good: 'clay', n: 10 }, 10]);
    expect(granary.store).toEqual({});                                     // clay never goes to a granary
  });
  it('drifts prices each new year by at most 10%, the same for the same seed and year', () => {
    expect(drawDrift(1, 2)).toEqual(drawDrift(1, 2));
    expect(JSON.stringify(drawDrift(1, 2)) === JSON.stringify(drawDrift(2, 2))).toBe(false);
    expect(JSON.stringify(drawDrift(1, 2)) === JSON.stringify(drawDrift(1, 3))).toBe(false);
    for (const year of [2, 3, 4, 5]) {
      for (const [id, goods] of Object.entries(drawDrift(7, year))) {
        expect(Object.keys(goods).sort()).toEqual([...Object.keys(PARTNERS[id].buys), ...Object.keys(PARTNERS[id].sells)].sort());
        for (const d of Object.values(goods)) { expect(d).toBeGreaterThanOrEqual(-PRICE_DRIFT); expect(d).toBeLessThanOrEqual(PRICE_DRIFT); }
      }
    }
    const { w } = market();
    w.day = 360;
    tradeMonth(w);
    expect([w.trade.year, w.trade.used]).toEqual([2, {}]);
    expect(w.trade.drift).toEqual(drawDrift(w.seed, 2));
    for (const id of Object.keys(PARTNERS)) {
      const prices = tradePrices(w, id);
      for (const side of ['buys', 'sells']) {
        for (const [good, t] of Object.entries(PARTNERS[id][side])) {
          expect(prices[side][good]).toBeGreaterThanOrEqual(Math.max(1, Math.round(t.price * (1 - PRICE_DRIFT))));
          expect(prices[side][good]).toBeLessThanOrEqual(Math.round(t.price * (1 + PRICE_DRIFT)));
        }
      }
    }
  });
  it('sends no caravan while the post is unstaffed, paused or not joined to the trade entry', () => {
    const { w, store, tp } = withRoute();
    store.store = { pottery: 100 };
    setTradeOrder(w, 'pottery', 'sell', 0);
    const events = [];
    tp.staff = 0;
    tradeMonth(w, events);
    tp.staff = BUILDINGS.trading_post.workers;
    tp.paused = true;
    tradeMonth(w, events);
    tp.paused = false;
    w.road[idx(w.size, 31, 20)] = 0;
    w.roadVersion++;
    expect(postConnected(w)).toBe(false);
    tradeMonth(w, events);
    expect([events, store.store.pottery, w.tally.caravans]).toEqual([[], 100, 0]);
    w.road[idx(w.size, 31, 20)] = 1;
    w.roadVersion++;
    expect(postConnected(w)).toBe(true);
    tradeMonth(w, events);
    expect(events.length).toBe(1);
    const closed = market();
    closed.w.day = 90;
    tradeMonth(closed.w, events);                                          // no route open: no caravan
    expect(events.length).toBe(1);
  });
  it('runs at month ends through the clock and counts caravans, goods and trade income in the tallies', () => {
    const { w, store } = withRoute();
    store.store = { pottery: 70 };
    setTradeOrder(w, 'pottery', 'sell', 10);
    setTradeOrder(w, 'clay', 'buy', 15);
    w.day = 60;
    const events = [];
    runMonth(w, events);
    expect(events.some((e) => e.type === 'caravan')).toBe(false);
    w.day = 90;
    runMonth(w, events);
    expect(events.filter((e) => e.type === 'caravan')).toEqual([{ type: 'caravan', partner: 'memphis', sold: { pottery: 50 }, bought: { clay: 15 }, income: 400, spent: 30, gift: null }]);
    expect([w.tally.sold, w.tally.bought, w.tally.tradeIncome, w.tally.caravans]).toEqual([50, 15, 400, 1]);
    expect([nextCaravanDay({ day: 0 }), nextCaravanDay({ day: 89 }), nextCaravanDay({ day: 90 }), nextCaravanDay({ day: 100 })]).toEqual([90, 90, 180, 180]);
  });
});
```


In `tests/all.js`, add it after Task 6's line:

```js
import './sim/upperTiers.test.js';
import './sim/trade.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sim trade"
```

Expected: `LOAD ERROR` (the test file imports `src/sim/trade.js`, which does not exist yet).

- [ ] **Step 3: Implement**

Create `src/sim/trade.js`:

```js
// Trade (spec 4.15). A trading post joined by road to the trade entry lets the city open a route to each partner
// once its milestone is reached. Every CARAVAN_EVERY_MONTHS months, at a month end, each open route sends a caravan:
// the first one brings a gift, then it buys the city's goods above the level to keep (per good, mode 'sell') and
// sells the city goods up to that level (mode 'buy'), at most a quarter of each yearly quota per visit, never taking
// the treasury below zero, moving goods from and to stores within TRADE_REACH road tiles of the post. Prices drift
// each year within PRICE_DRIFT, seeded by the city's seed and the year, so the same city always sees the same prices.
//
// world.trade: routes { partnerId: { since: day, gifted } }, orders { good: { mode, keep } }, drift { partnerId:
// { good: fraction } } (no entry means no drift), used { partnerId: { good: units this year } }, year (the year
// the quota and drift belong to).
import { PARTNERS, CARAVAN_EVERY_MONTHS, PRICE_DRIFT, TRADE_REACH } from '../data/trade.js';
import { BUILDINGS } from '../data/buildings.js';
import { GOODS } from '../data/goods.js';
import { allBuildings } from './world.js';
import { adjacentRoadTiles, buildingsInReach } from './reach.js';
import { isWorking } from './labour.js';
import { atLeast } from './progression.js';
import { canAfford, spend } from './money.js';
import { routeCostOf } from './costs.js';
import { storeAccepts, storeTotal } from './production.js';
import { createRng, hash2 } from './rng.js';
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './time.js';

export const TRADE_MODES = ['buy', 'sell', 'ignore'];

const fail = (reason) => ({ ok: false, reason, warnings: [] });
const CARAVAN_DAYS = CARAVAN_EVERY_MONTHS * DAYS_PER_MONTH;
const yearOf = (day) => Math.floor(Math.floor(day / DAYS_PER_MONTH) / MONTHS_PER_YEAR) + 1;

// Whether the city has reached the partner's milestone.
export const partnerUnlocked = (world, partnerId) => Boolean(PARTNERS[partnerId]) && atLeast(world, PARTNERS[partnerId].milestone);

const posts = (world) => allBuildings(world).filter((b) => b.type === 'trading_post');

// True when the road from this footprint joins the trade entry: a walk along road tiles from the tiles beside it
// reaches the entry tile (any distance).
function joinsEntry(world, b) {
  const { x: ex, y: ey } = world.tradeEntry;
  if (!inBounds(world.size, ex, ey)) return false;
  const goal = idx(world.size, ex, ey);
  if (!world.road[goal]) return false;
  const seen = new Set(adjacentRoadTiles(world, b));
  const queue = [...seen];
  for (let qi = 0; qi < queue.length; qi++) {
    const t = queue[qi];
    if (t === goal) return true;
    const x = t % world.size, y = (t - x) / world.size;
    for (const [dx, dy] of NEIGHBOURS4) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(world.size, nx, ny)) continue;
      const n = idx(world.size, nx, ny);
      if (world.road[n] && !seen.has(n)) { seen.add(n); queue.push(n); }
    }
  }
  return false;
}

// How many trade routes the city has opened (goals, daily goals).
export const openRoutes = (world) => Object.values(world.trade.routes).filter(Boolean).length;

// True when some trading post, working or not, is joined by road to the trade entry.
export const postConnected = (world) => posts(world).some((p) => joinsEntry(world, p));

// The post caravans come to: the first (lowest id) trading post that works and is joined to the trade entry.
export const activePost = (world) => posts(world).find((p) => isWorking(world, p) && joinsEntry(world, p)) || null;

// Today's prices: what the partner pays for each good it buys, and asks for each good it sells, after this
// year's drift, in whole gold (never below 1).
export function tradePrices(world, partnerId) {
  const p = PARTNERS[partnerId];
  const drift = world.trade.drift[partnerId] || {};
  const price = (good, base) => Math.max(1, Math.round(base * (1 + (drift[good] || 0))));
  const side = (list) => Object.fromEntries(Object.entries(list).map(([good, t]) => [good, price(good, t.price)]));
  return { buys: side(p.buys), sells: side(p.sells) };
}

// The day of the next caravan month end: caravans come at the end of every CARAVAN_EVERY_MONTHS-th month.
export const nextCaravanDay = (world) => (Math.floor(world.day / CARAVAN_DAYS) + 1) * CARAVAN_DAYS;

// This year's drift for every partner and good, from the city's seed and the year alone.
export function drawDrift(seed, year) {
  const rng = createRng(Math.floor(hash2(seed, year, 7349) * 4294967296));
  const drift = {};
  for (const [id, p] of Object.entries(PARTNERS)) {
    drift[id] = {};
    for (const good of [...Object.keys(p.buys), ...Object.keys(p.sells)]) drift[id][good] = Math.round(rng.range(-PRICE_DRIFT, PRICE_DRIFT) * 1000) / 1000;
  }
  return drift;
}

// Opens the route to a partner: its milestone reached, a trading post built, the cost (scaled by difficulty)
// affordable. A route that opens while no post is joined to the trade entry warns 'not_connected'.
export function openRoute(world, partnerId) {
  if (!PARTNERS[partnerId]) return fail('unknown_partner');
  if (world.trade.routes[partnerId]) return fail('already_open');
  if (!partnerUnlocked(world, partnerId)) return fail('locked');
  if (!posts(world).length) return fail('no_post');
  const cost = routeCostOf(world, partnerId);
  if (!canAfford(world, cost)) return fail('no_gold');
  spend(world, cost);
  world.trade.routes[partnerId] = { since: world.day, gifted: false };
  return { ok: true, cost, warnings: postConnected(world) ? [] : ['not_connected'] };
}

// What caravans do with one good: 'buy' (the city buys it up to keep), 'sell' (the city sells it above keep) or
// 'ignore'. keep is a whole number of units, 0 or more.
export function setTradeOrder(world, good, mode, keep) {
  if (!GOODS[good]) return fail('unknown_good');
  if (!TRADE_MODES.includes(mode)) return fail('bad_mode');
  if (!Number.isInteger(keep) || keep < 0) return fail('bad_keep');
  world.trade.orders[good] = { mode, keep };
  return { ok: true, warnings: [] };
}

const storesOf = (b, good) => (BUILDINGS[b.type].stores || []).includes(good);

// How much of a good the stores in the post's reach hold.
function stockNear(world, post, good) {
  return buildingsInReach(world, post, TRADE_REACH, (o) => storesOf(o, good)).reduce((n, { b }) => n + (b.store[good] || 0), 0);
}

// Takes up to n of a good from the stores in the post's reach, nearest first; returns how many it took.
function takeNear(world, post, good, n) {
  let left = n;
  for (const { b } of buildingsInReach(world, post, TRADE_REACH, (o) => storesOf(o, good) && (o.store[good] || 0) > 0)) {
    const k = Math.min(left, b.store[good]);
    b.store[good] -= k;
    left -= k;
    if (left <= 0) break;
  }
  return n - left;
}

// Room for a good in the working stores in the post's reach that accept it.
const roomIn = (b) => BUILDINGS[b.type].capacity - storeTotal(b);
const targetsNear = (world, post, good) =>
  buildingsInReach(world, post, TRADE_REACH, (o) => storeAccepts(o, good) && isWorking(world, o) && roomIn(o) > 0).map((e) => e.b);
const roomNear = (world, post, good) => targetsNear(world, post, good).reduce((n, b) => n + roomIn(b), 0);

// Puts up to n of a good into those stores, nearest first; returns how many it put.
function putNear(world, post, good, n) {
  let left = n;
  for (const b of targetsNear(world, post, good)) {
    const k = Math.min(left, roomIn(b));
    b.store[good] = (b.store[good] || 0) + k;
    left -= k;
    if (left <= 0) break;
  }
  return n - left;
}

// One caravan from an open route, at the given post.
function caravan(world, partnerId, post, events) {
  const p = PARTNERS[partnerId];
  const route = world.trade.routes[partnerId];
  const used = world.trade.used[partnerId] || (world.trade.used[partnerId] = {});
  const prices = tradePrices(world, partnerId);
  const room = (good, side) => Math.max(0, Math.min(Math.floor(p[side][good].quota / 4), p[side][good].quota - (used[good] || 0)));
  let gift = null;
  if (!route.gifted) {
    route.gifted = true;
    const n = putNear(world, post, p.gift.good, p.gift.n);
    gift = { good: p.gift.good, n };
  }
  const sold = {}, bought = {};
  let income = 0, spent = 0;
  for (const good of Object.keys(p.buys)) {
    const order = world.trade.orders[good];
    if (!order || order.mode !== 'sell') continue;
    const n = takeNear(world, post, good, Math.min(room(good, 'buys'), Math.max(0, stockNear(world, post, good) - order.keep)));
    if (n <= 0) continue;
    sold[good] = n;
    used[good] = (used[good] || 0) + n;
    income += n * prices.buys[good];
  }
  world.gold += income;
  for (const good of Object.keys(p.sells)) {
    const order = world.trade.orders[good];
    if (!order || order.mode !== 'buy') continue;
    const price = prices.sells[good];
    const want = Math.min(room(good, 'sells'), Math.max(0, order.keep - stockNear(world, post, good)), roomNear(world, post, good), Math.floor(Math.max(0, world.gold) / price));
    const n = want > 0 ? putNear(world, post, good, want) : 0;
    if (n <= 0) continue;
    bought[good] = n;
    used[good] = (used[good] || 0) + n;
    spent += n * price;
    world.gold -= n * price;
  }
  const t = world.tally;
  t.sold += Object.values(sold).reduce((a, b) => a + b, 0);
  t.bought += Object.values(bought).reduce((a, b) => a + b, 0);
  t.tradeIncome += income;
  t.caravans += 1;
  if (events) events.push({ type: 'caravan', partner: partnerId, sold, bought, income, spent, gift });
}

// The month-end trade step (runMonth): a new year resets the quotas used and redraws the drift; on a caravan
// month every open route sends a caravan, in PARTNERS order, if a working trading post is joined to the trade entry.
export function tradeMonth(world, events = null) {
  const t = world.trade;
  const year = yearOf(world.day);
  if (year !== t.year) {
    t.year = year;
    t.used = {};
    t.drift = drawDrift(world.seed, year);
  }
  if (world.day % CARAVAN_DAYS !== 0) return;
  const open = Object.keys(PARTNERS).filter((id) => t.routes[id]);
  if (!open.length) return;
  const post = activePost(world);
  if (!post) return;
  for (const id of open) caravan(world, id, post, events);
}
```


In `src/sim/clock.js`, call it at each month end, after the economy step (purchases are judged on the treasury after taxes and wages):

Replace in `src/sim/clock.js` (change 1 of 2):

```js
import { monthlyHousing } from './housing.js';
import { arrivalsBatch, departures } from './immigration.js';
import { monthlyEconomy } from './economy.js';
import { updateMood } from './mood.js';
import { updateMilestone } from './progression.js';
import { computeAlerts } from './alerts.js';
```

with:

```js
import { monthlyHousing } from './housing.js';
import { arrivalsBatch, departures } from './immigration.js';
import { monthlyEconomy } from './economy.js';
import { tradeMonth } from './trade.js';
import { updateMood } from './mood.js';
import { updateMilestone } from './progression.js';
import { computeAlerts } from './alerts.js';
```

Replace in `src/sim/clock.js` (change 2 of 2):

```js
  monthlyHousing(world, events);
  departures(world);
  monthlyEconomy(world);
  updateMood(world);
  const milestoneChanged = updateMilestone(world);
  if (milestoneChanged && events) events.push({ type: 'milestone', id: world.milestone });
```

with:

```js
  monthlyHousing(world, events);
  departures(world);
  monthlyEconomy(world);
  tradeMonth(world, events);
  updateMood(world);
  const milestoneChanged = updateMilestone(world);
  if (milestoneChanged && events) events.push({ type: 'milestone', id: world.milestone });
```


- [ ] **Step 4: Run the tests to see them pass**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sim trade"
```

Expected: `9 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

None. `tradeMonth` pushes events only when a caravan comes, and a city with no open route only redraws the drift at each new year, which is deterministic (the save, load and determinism tests compare whole worlds and still pass). Checked with `Get-ChildItem tests -Recurse -Filter *.js | Select-String -Pattern "runMonth|type === 'month'|trade\."`; on the verification base the whole suite passed with no other edit.

- [ ] **Step 6: Visual check**

None: this task changes only the simulation (the trading post sheet and caravan captions are Task 13).

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED` (802 tests on the verification base).

- [ ] **Step 8: Commit**

```powershell
git add src/sim/trade.js src/sim/clock.js tests/sim/trade.test.js tests/all.js sw-files.js
git commit -m @'
Trade with Memphis and Byblos through caravans at the trading post

A route opens once its partner's milestone is reached, for a cost scaled by
difficulty. Every three months each open route's caravan brings its first
gift, then sells above the level to keep and buys up to it, a quarter of each
yearly quota per visit, never below zero gold. Prices drift each year from
the city's seed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 8: Goals, firsts, achievements, daily goals and tips for Stage 2

**Files:**
- Create: `tests/sim/goalsStage2.test.js`
- Modify: `src/data/goals.js`, `src/data/firsts.js`, `src/data/achievements.js`, `src/data/daily.js`, `src/data/tips.js`
- Modify: `src/sim/goals.js` (need kind `routes`), `src/sim/firsts.js` (check kind `made`, the caravan's place), `src/sim/achievements.js` (measure kind `made`), `src/sim/daily.js` (kind `made`; `from` and `routes`)
- Modify: `src/ui/text.js` (the words for every addition: see the CONTRACT NOTE)
- Modify (tests this breaks): `tests/sim/goals.test.js`, `tests/sim/goalsV2.test.js`, `tests/sim/firsts.test.js`, `tests/sim/achievements.test.js`, `tests/sim/daily.test.js`, `tests/ui/tips.test.js`, `tests/ui/achievementsSheet.test.js`
- Modify: `tests/all.js` (one import line), `sw-files.js` (regenerated)

**Interfaces:**
- Consumes: the Stage 2 buildings, `MILESTONES` to Capital, `TIERS` 5-9, `GOODS` (Task 2); `world.tally.made`, `sold`, `tradeIncome`, `caravans` (Tasks 1, 3, 7); `openRoutes(world)` (Task 7); the pass's `goalMet`/`goalProgress`, `firstMet`, `achievementProgress`, `dailyMeasure`, `isAvailable`.
- Produces: `GOALS` continuing after `town` in chapters `goods` and `grand` (15 goals: `pottery`, `homes_townhouse`, `booth_gardens`, `manor`, `market_town`, `trade_route`, `city`, `beer`, `fine_manors`, `great_city`, `linen`, `villas`, `capital`, `jewellery`, `estate`) and the need kind `routes`; `FIRSTS` `first_pottery` (check kind `made` `{ good, n }`), `first_townhouse`, `first_manor`, `first_caravan`, `first_fine_manor`, `first_villa`, `first_estate`; `ACHIEVEMENTS` `potters_wheel` (measure kind `made`), `merchant_city`, `townhouse_terrace`, `manor_row`, `green_city`, `sculpture_garden`, `estate_life`, `thousand`; `DAILY_POOL` `pottery30`, `gardens3`, `sell20`, `statue1`, `booth1`; `TIPS` `nicer_streets` (trigger `desirabilityShown`), `storehouse_choices` (`storehousePlaced`), `trade_orders` (`tradingPostPlaced`), `merging_homes` (`townhouseSheet`); and their words in `src/ui/text.js`.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/goalsStage2.test.js`. The scripted city builds each step by hand and checks that exactly the next goal completes, so the chain's order is pinned end to end:

```js
import { describe, it, expect } from '../harness.js';
import { GOALS, GOAL_REWARD } from '../../src/data/goals.js';
import { FIRSTS } from '../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { DAILY_POOL } from '../../src/data/daily.js';
import { TIPS } from '../../src/data/tips.js';
import { MILESTONES } from '../../src/data/progression.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { GOODS } from '../../src/data/goods.js';
import { goalById, goalMet, goalProgress, openGoals, settleGoals } from '../../src/sim/goals.js';
import { firstMet, checkFirsts } from '../../src/sim/firsts.js';
import { achievementProgress } from '../../src/sim/achievements.js';
import { dailyOrder, dailyMeasure } from '../../src/sim/daily.js';
import { milestoneIndex } from '../../src/sim/progression.js';
import { population } from '../../src/sim/world.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';

const STAGE1 = ['road', 'plots', 'well', 'food', 'temple', 'homes_cottage', 'people100', 'homes_house', 'town'];
const STAGE2 = ['pottery', 'homes_townhouse', 'booth_gardens', 'manor', 'market_town', 'trade_route', 'city', 'beer', 'fine_manors',
  'great_city', 'linen', 'villas', 'capital', 'jewellery', 'estate'];
const first = (id) => FIRSTS.find((f) => f.id === id);
const achievement = (id) => ACHIEVEMENTS.find((a) => a.id === id);
const pool = (id) => DAILY_POOL.find((d) => d.id === id);
const typesIn = (need) => (need.kind === 'all' ? need.of.flatMap(typesIn) : need.kind === 'building' ? [need.type] : []);

// A city that has finished the opening chain and the guide, at Town.
function town() {
  const w = makeTestWorld();
  w.goals.completed.push(...STAGE1);
  w.guide = { on: false, done: true };
  w.milestone = 'town';
  return w;
}

describe('sim goals and rewards for Stage 2', () => {
  it('keeps the opening chain and goes on from Town in two chapters, one new need at a time', () => {
    expect(GOALS.map((g) => g.id)).toEqual([...STAGE1, ...STAGE2]);
    expect(GOALS.slice(9).map((g) => g.chapter)).toEqual([...Array(6).fill('goods'), ...Array(9).fill('grand')]);
    expect(goalById('pottery').need).toEqual({ kind: 'all', of: [{ kind: 'building', type: 'clay_pit', n: 1 }, { kind: 'building', type: 'storehouse', n: 1 }, { kind: 'building', type: 'potter', n: 1 }] });
    expect(goalById('trade_route').need).toEqual({ kind: 'all', of: [{ kind: 'building', type: 'trading_post', n: 1 }, { kind: 'routes', n: 1 }] });
    expect([goalById('market_town').need, goalById('capital').need, goalById('estate').need]).toEqual([{ kind: 'people', n: 250 }, { kind: 'people', n: 1000 }, { kind: 'tier', tier: 9, n: 1 }]);
    // Every building a goal asks for is unlocked by the milestone the goals before it reached (people goals mark them).
    let reached = milestoneIndex('town');
    for (const g of GOALS.slice(9)) {
      if (g.need.kind === 'people') reached = MILESTONES.findIndex((m) => m.population === g.need.n);
      expect(reached).toBeGreaterThan(0);
      for (const type of typesIn(g.need)) {
        const at = MILESTONES.findIndex((m) => m.unlocks.includes(type));
        expect([g.id, type, at >= 0 && at <= reached]).toEqual([g.id, type, true]);
      }
      expect([g.id, g.reward, g.text.length > 0, Boolean(BUILDINGS[g.showMe.item]) || g.showMe.item === 'house']).toEqual([g.id, GOAL_REWARD, true, true]);
    }
  });
  it('counts open trade routes', () => {
    const w = town();
    const need = goalById('trade_route').need;
    expect(goalMet(w, { kind: 'routes', n: 1 })).toBe(false);
    expect(goalProgress(w, { need: { kind: 'routes', n: 2 } })).toEqual({ n: 0, of: 2 });
    addRaw(w, 'trading_post', 20, 8);
    expect([goalMet(w, need), goalProgress(w, goalById('trade_route'))]).toEqual([false, { n: 1, of: 2 }]);
    w.trade.routes.memphis = { since: 0, gifted: false };
    expect([goalMet(w, need), goalProgress(w, goalById('trade_route'))]).toEqual([true, { n: 2, of: 2 }]);
    w.trade.routes.byblos = { since: 0, gifted: false };
    expect(goalProgress(w, { need: { kind: 'routes', n: 1 } })).toEqual({ n: 1, of: 1 });   // clamped
  });
  it('completes the Stage 2 goals in order as a scripted city grows to an Estate', () => {
    const w = town();
    const crowd = addRaw(w, 'house', 0, 0, { tier: 1, residents: 150 });  // stands in for the city's people
    let hx = 0, bx = 0;                                                     // homes along y = 20, buildings along y = 24
    const home = (tier) => { addRaw(w, 'house', hx, 20, tier >= 6 ? { tier, w: 2, d: 2, residents: 1 } : { tier, residents: 1 }); hx += 2; };
    const build = (...types) => { for (const t of types) { addRaw(w, t, bx, 24); bx += 2; } };
    const people = (n) => { crowd.residents += n - population(w); };
    const steps = [
      [() => build('clay_pit', 'storehouse'), []],
      [() => build('potter'), ['pottery']],
      [() => { for (let i = 0; i < 8; i++) home(5); }, ['homes_townhouse']],
      [() => build('booth', 'garden'), []],
      [() => build('garden'), ['booth_gardens']],
      [() => home(6), ['manor']],
      [() => { people(250); w.milestone = 'market_town'; }, ['market_town']],
      [() => build('trading_post'), []],
      [() => { w.trade.routes.memphis = { since: w.day, gifted: false }; }, ['trade_route']],
      [() => { people(400); w.milestone = 'city'; }, ['city']],
      [() => build('farm_barley', 'brewery', 'farm_fig'), ['beer']],
      [() => { home(7); home(7); }, ['fine_manors']],
      [() => { people(650); w.milestone = 'great_city'; }, ['great_city']],
      [() => build('farm_flax', 'weaver'), ['linen']],
      [() => { home(8); home(8); }, ['villas']],
      [() => { people(1000); w.milestone = 'capital'; }, ['capital']],
      [() => build('gem_mine', 'jeweller'), ['jewellery']],
      [() => home(9), ['estate']],
    ];
    const gold = w.gold;
    for (const [step, expected] of steps) {
      step();
      expect(settleGoals(w).map((g) => g.id)).toEqual(expected);
    }
    expect(w.goals.completed).toEqual([...STAGE1, ...STAGE2]);
    expect(openGoals(w)).toEqual([]);
    expect(w.gold).toBe(gold + STAGE2.length * GOAL_REWARD);
  });
  it('adds firsts for pottery made, the first caravan and each new tier, each shown where it happened', () => {
    expect(FIRSTS.slice(8).map((f) => [f.id, f.check])).toEqual([
      ['first_pottery', { kind: 'made', good: 'pottery', n: 1 }],
      ['first_townhouse', { kind: 'tier', tier: 5 }],
      ['first_manor', { kind: 'tier', tier: 6 }],
      ['first_caravan', { kind: 'tally', key: 'caravans', n: 1 }],
      ['first_fine_manor', { kind: 'tier', tier: 7 }],
      ['first_villa', { kind: 'tier', tier: 8 }],
      ['first_estate', { kind: 'tier', tier: 9 }],
    ]);
    const w = town();
    expect(firstMet(w, first('first_pottery'))).toBe(null);
    w.tally.made.pottery = 1;
    expect(firstMet(w, first('first_pottery'))).toEqual({ x: null, y: null });   // gone on already, nothing makes it
    addRaw(w, 'potter', 10, 4);
    expect(firstMet(w, first('first_pottery'))).toEqual({ x: 11, y: 5 });        // the potter that made it
    addRaw(w, 'storehouse', 20, 4, { store: { pottery: 1 } });
    expect(firstMet(w, first('first_pottery'))).toEqual({ x: 21, y: 5 });        // the store holding it
    expect(firstMet(w, first('first_caravan'))).toBe(null);
    w.tally.caravans = 1;
    addRaw(w, 'trading_post', 4, 12);
    expect(firstMet(w, first('first_caravan'))).toEqual({ x: 5, y: 13 });
    addRaw(w, 'house', 14, 14, { tier: 7, w: 2, d: 2, residents: 100 });
    expect(firstMet(w, first('first_fine_manor'))).toEqual({ x: 15, y: 15 });
    expect(firstMet(w, first('first_manor'))).toEqual({ x: 15, y: 15 });         // nothing at exactly tier 6: the first above
    expect(firstMet(w, first('first_villa'))).toBe(null);
    const events = [];
    expect(checkFirsts(w, events)).toEqual(['first_family', 'first_shack', 'first_cottage', 'first_house', 'people_100', 'first_pottery', 'first_townhouse', 'first_manor', 'first_caravan', 'first_fine_manor']);
    expect(events.find((e) => e.id === 'first_caravan')).toEqual({ type: 'first', id: 'first_caravan', reward: 10, x: 5, y: 13 });
  });
  it('adds eight achievements, counting goods made, trade income, upper tiers, gardens, statues and people', () => {
    expect(ACHIEVEMENTS.slice(24).map((a) => [a.id, a.measure])).toEqual([
      ['potters_wheel', { kind: 'made', good: 'pottery', n: 500 }],
      ['merchant_city', { kind: 'tally', key: 'tradeIncome', n: 2000 }],
      ['townhouse_terrace', { kind: 'tier', tier: 5, n: 20 }],
      ['manor_row', { kind: 'tier', tier: 6, n: 5 }],
      ['green_city', { kind: 'buildings', type: 'garden', n: 20 }],
      ['sculpture_garden', { kind: 'buildings', type: 'statue', n: 10 }],
      ['estate_life', { kind: 'tier', tier: 9, n: 1 }],
      ['thousand', { kind: 'people', n: 1000 }],
    ]);
    const w = town();
    const p = (id) => achievementProgress(w, achievement(id));
    w.tally.made = { pottery: 120, clay: 900 };
    w.tally.tradeIncome = 2400;
    expect([p('potters_wheel'), p('merchant_city')]).toEqual([{ n: 120, of: 500 }, { n: 2000, of: 2000 }]);
    for (let i = 0; i < 3; i++) addRaw(w, 'garden', i, 2);
    addRaw(w, 'statue', 5, 2);
    addRaw(w, 'house', 8, 8, { tier: 5, residents: 22 });
    addRaw(w, 'house', 10, 8, { tier: 6, w: 2, d: 2, residents: 100 });
    expect([p('green_city'), p('sculpture_garden'), p('townhouse_terrace'), p('manor_row'), p('estate_life')]).toEqual([
      { n: 3, of: 20 }, { n: 1, of: 10 }, { n: 2, of: 20 }, { n: 1, of: 5 }, { n: 0, of: 1 },
    ]);
    w.tally.peakPeople = 640;
    expect(p('thousand')).toEqual({ n: 640, of: 1000 });
  });
  it('draws the Stage 2 daily goals only from Town, and the selling one only with a route open', () => {
    expect(DAILY_POOL.slice(10).map((d) => d.id)).toEqual(['pottery30', 'gardens3', 'sell20', 'statue1', 'booth1']);
    expect([pool('pottery30').measure, pool('sell20').measure, pool('gardens3').n]).toEqual([{ kind: 'made', good: 'pottery' }, { kind: 'tally', key: 'sold' }, 3]);
    const w = town();
    w.milestone = 'village';
    expect(dailyOrder(w, '2026-10-11').length).toBe(10);                   // a village draws exactly as before
    w.milestone = 'town';
    const atTown = dailyOrder(w, '2026-10-11');
    expect(atTown.length).toBe(14);
    expect(atTown.includes('sell20')).toBe(false);
    w.trade.routes.memphis = { since: 0, gifted: false };
    expect(dailyOrder(w, '2026-10-11').length).toBe(15);
    w.tally.made.pottery = 42;
    w.tally.sold = 17;
    expect([dailyMeasure(w, pool('pottery30')), dailyMeasure(w, pool('sell20'))]).toEqual([42, 17]);
    for (const d of DAILY_POOL) if (d.measure.kind === 'made') expect(Boolean(GOODS[d.measure.good])).toBe(true);
  });
  it('adds tips for desirability, storehouse choices, trade and merges, each with its own trigger', () => {
    expect(TIPS.slice(10).map((t) => [t.id, t.trigger, t.priority])).toEqual([
      ['nicer_streets', 'desirabilityShown', false],
      ['storehouse_choices', 'storehousePlaced', false],
      ['trade_orders', 'tradingPostPlaced', false],
      ['merging_homes', 'townhouseSheet', false],
    ]);
  });
});
```


In `tests/all.js`, add it after the goals v2 tests:

```js
import './sim/goalsV2.test.js';
import './sim/goalsStage2.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "goals and rewards for Stage 2"
```

Expected: `0 passed, 7 failed`: the goal list stops at `town`, `goalById('trade_route')` is null, and the new firsts, achievements, daily goals and tips are not there yet.

- [ ] **Step 3: Implement**

**Data.** In `src/data/goals.js`:

Replace in `src/data/goals.js` (change 1 of 2):

```js
// Goals (spec 4.1, early-game pass 3.2 and 3.3): the opening chain in chapters, then the next milestone,
// and first-time troubles that become goals. Plain data: needs are declarative so missions can define
// goals the same way later; src/sim/goals.js evaluates them.
export const GOAL_REWARD = 25;
export const EVENT_REWARD = 10;    // a first-time trouble put right
export const GUIDE_REWARD = 50;    // paid once, when the guided start's goals are all done
```

with:

```js
// Goals (spec 4.1, early-game pass 3.2 and 3.3): the opening chain in chapters, then the economy's goals to
// the Capital, and first-time troubles that become goals. Plain data: needs are declarative so missions can
// define goals the same way later; src/sim/goals.js evaluates them. Need kinds: road, houses, building, people,
// tier, routes (open trade routes), noAlert, gold, all. A showMe target is startRoad, houses, focus, alert or
// rocky (any target the interface does not know points at the city's focus).
export const GOAL_REWARD = 25;
export const EVENT_REWARD = 10;    // a first-time trouble put right
export const GUIDE_REWARD = 50;    // paid once, when the guided start's goals are all done
```

Replace in `src/data/goals.js` (change 2 of 2):

```js
  { id: 'people100', chapter: 'grow', text: 'Reach 100 people', reward: GOAL_REWARD, need: { kind: 'people', n: 100 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'homes_house', chapter: 'grow', text: 'Grow 8 homes to House or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 4, n: 8 }, showMe: { category: 'services', item: 'temple', target: 'houses' } },
  { id: 'town', chapter: 'grow', text: 'Reach 150 people to become a Town', reward: GOAL_REWARD, need: { kind: 'people', n: 150 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
];

// The guided start (early-game pass 3.2) runs while any of these is open.
```

with:

```js
  { id: 'people100', chapter: 'grow', text: 'Reach 100 people', reward: GOAL_REWARD, need: { kind: 'people', n: 100 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'homes_house', chapter: 'grow', text: 'Grow 8 homes to House or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 4, n: 8 }, showMe: { category: 'services', item: 'temple', target: 'houses' } },
  { id: 'town', chapter: 'grow', text: 'Reach 150 people to become a Town', reward: GOAL_REWARD, need: { kind: 'people', n: 150 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  // From Town (spec 4.1, 4.6): each new need arrives with the goal that builds its chain, then a count of homes at
  // the tier that needs it, so one new demand comes at a time; the milestones and the trade route sit between.
  // Each text stays short enough for a two-line caption on a phone at 150% text (tests/ui/celebrate.test.js).
  { id: 'pottery', chapter: 'goods', text: 'Build a clay pit, storehouse and potter', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'clay_pit', n: 1 }, { kind: 'building', type: 'storehouse', n: 1 }, { kind: 'building', type: 'potter', n: 1 }] }, showMe: { category: 'industry', item: 'clay_pit', target: 'focus' } },
  { id: 'homes_townhouse', chapter: 'goods', text: 'Grow 8 homes to Townhouse or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 5, n: 8 }, showMe: { category: 'industry', item: 'potter', target: 'houses' } },
  { id: 'booth_gardens', chapter: 'goods', text: 'Build a booth and two gardens', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'booth', n: 1 }, { kind: 'building', type: 'garden', n: 2 }] }, showMe: { category: 'services', item: 'booth', target: 'houses' } },
  { id: 'manor', chapter: 'goods', text: 'Grow a Manor from four Townhouses', reward: GOAL_REWARD, need: { kind: 'tier', tier: 6, n: 1 }, showMe: { category: 'homes', item: 'garden', target: 'houses' } },
  { id: 'market_town', chapter: 'goods', text: 'Reach 250 people for a Market town', reward: GOAL_REWARD, need: { kind: 'people', n: 250 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'trade_route', chapter: 'goods', text: 'Build a trading post and open a route', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'trading_post', n: 1 }, { kind: 'routes', n: 1 }] }, showMe: { category: 'industry', item: 'trading_post', target: 'startRoad' } },
  { id: 'city', chapter: 'grand', text: 'Reach 400 people to become a City', reward: GOAL_REWARD, need: { kind: 'people', n: 400 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'beer', chapter: 'grand', text: 'Build a barley farm, brewery, orchard', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'farm_barley', n: 1 }, { kind: 'building', type: 'brewery', n: 1 }, { kind: 'building', type: 'farm_fig', n: 1 }] }, showMe: { category: 'industry', item: 'farm_barley', target: 'focus' } },
  { id: 'fine_manors', chapter: 'grand', text: 'Grow 2 homes to Fine manor or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 7, n: 2 }, showMe: { category: 'homes', item: 'statue', target: 'houses' } },
  { id: 'great_city', chapter: 'grand', text: 'Reach 650 people for a Great city', reward: GOAL_REWARD, need: { kind: 'people', n: 650 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'linen', chapter: 'grand', text: 'Build a flax farm and a weaver', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'farm_flax', n: 1 }, { kind: 'building', type: 'weaver', n: 1 }] }, showMe: { category: 'industry', item: 'farm_flax', target: 'focus' } },
  { id: 'villas', chapter: 'grand', text: 'Grow 2 homes to Villa or better', reward: GOAL_REWARD, need: { kind: 'tier', tier: 8, n: 2 }, showMe: { category: 'homes', item: 'statue', target: 'houses' } },
  { id: 'capital', chapter: 'grand', text: 'Reach 1,000 people for the Capital', reward: GOAL_REWARD, need: { kind: 'people', n: 1000 }, showMe: { category: 'homes', item: 'house', target: 'houses' } },
  { id: 'jewellery', chapter: 'grand', text: 'Build a gem mine and a jeweller', reward: GOAL_REWARD, need: { kind: 'all', of: [{ kind: 'building', type: 'gem_mine', n: 1 }, { kind: 'building', type: 'jeweller', n: 1 }] }, showMe: { category: 'industry', item: 'gem_mine', target: 'rocky' } },
  { id: 'estate', chapter: 'grand', text: 'Grow an Estate', reward: GOAL_REWARD, need: { kind: 'tier', tier: 9, n: 1 }, showMe: { category: 'homes', item: 'statue', target: 'houses' } },
];

// The guided start (early-game pass 3.2) runs while any of these is open.
```


In `src/data/firsts.js`:

Replace in `src/data/firsts.js` (change 1 of 2):

```js
// Firsts (spec 3.6): one small celebration per city for each of these, each paying FIRST_REWARD. Checks are
// declarative so later stages can add firsts for new goods and tiers; src/sim/firsts.js evaluates them.
// The words the player sees live in src/ui/text.js (FIRST_TEXT, keyed by id).
export const FIRST_REWARD = 10;

export const FIRSTS = [
```

with:

```js
// Firsts (spec 3.6): one small celebration per city for each of these, each paying FIRST_REWARD. Checks are
// declarative so later stages can add firsts for new goods and tiers; src/sim/firsts.js evaluates them.
// The words the player sees live in src/ui/text.js (FIRST_TEXT, keyed by id). Check kinds: people { n },
// fullHome, tier { tier }, tally { key, n }, made { good, n } (units of a good produced, world.tally.made).
export const FIRST_REWARD = 10;

export const FIRSTS = [
```

Replace in `src/data/firsts.js` (change 2 of 2):

```js
  { id: 'first_house', check: { kind: 'tier', tier: 4 } },
  { id: 'first_profit', check: { kind: 'tally', key: 'profitMonths', n: 1 } },
  { id: 'people_100', check: { kind: 'people', n: 100 } },
];
```

with:

```js
  { id: 'first_house', check: { kind: 'tier', tier: 4 } },
  { id: 'first_profit', check: { kind: 'tally', key: 'profitMonths', n: 1 } },
  { id: 'people_100', check: { kind: 'people', n: 100 } },
  { id: 'first_pottery', check: { kind: 'made', good: 'pottery', n: 1 } },
  { id: 'first_townhouse', check: { kind: 'tier', tier: 5 } },
  { id: 'first_manor', check: { kind: 'tier', tier: 6 } },
  { id: 'first_caravan', check: { kind: 'tally', key: 'caravans', n: 1 } },
  { id: 'first_fine_manor', check: { kind: 'tier', tier: 7 } },
  { id: 'first_villa', check: { kind: 'tier', tier: 8 } },
  { id: 'first_estate', check: { kind: 'tier', tier: 9 } },
];
```


In `src/data/achievements.js`:

Replace in `src/data/achievements.js` (change 1 of 2):

```js
//   tier       homes at that tier or above                           tier, n
//   people     the most people the city has had                      n
//   tally      a running tally in world.tally                        key, n
//   goals      goals completed (event goals included)                n
//   fedAll     every home at Cottage or above fed last month, in a city of at least `people` people
//   waterAll   every lived-in home reached by a working well, at least `homes` of them
```

with:

```js
//   tier       homes at that tier or above                           tier, n
//   people     the most people the city has had                      n
//   tally      a running tally in world.tally                        key, n
//   made       units of a good produced (world.tally.made)            good, n
//   goals      goals completed (event goals included)                n
//   fedAll     every home at Cottage or above fed last month, in a city of at least `people` people
//   waterAll   every lived-in home reached by a working well, at least `homes` of them
```

Replace in `src/data/achievements.js` (change 2 of 2):

```js
  { id: 'busy_hands', measure: { kind: 'jobs', people: 150, rate: 0.05 } },
  { id: 'on_course', measure: { kind: 'goals', n: 9 } },
  { id: 'day_by_day', measure: { kind: 'tally', key: 'dailyDone', n: 10 } },
];
```

with:

```js
  { id: 'busy_hands', measure: { kind: 'jobs', people: 150, rate: 0.05 } },
  { id: 'on_course', measure: { kind: 'goals', n: 9 } },
  { id: 'day_by_day', measure: { kind: 'tally', key: 'dailyDone', n: 10 } },
  { id: 'potters_wheel', measure: { kind: 'made', good: 'pottery', n: 500 } },
  { id: 'merchant_city', measure: { kind: 'tally', key: 'tradeIncome', n: 2000 } },
  { id: 'townhouse_terrace', measure: { kind: 'tier', tier: 5, n: 20 } },
  { id: 'manor_row', measure: { kind: 'tier', tier: 6, n: 5 } },
  { id: 'green_city', measure: { kind: 'buildings', type: 'garden', n: 20 } },
  { id: 'sculpture_garden', measure: { kind: 'buildings', type: 'statue', n: 10 } },
  { id: 'estate_life', measure: { kind: 'tier', tier: 9, n: 1 } },
  { id: 'thousand', measure: { kind: 'people', n: 1000 } },
];
```


In `src/data/daily.js`:

Replace in `src/data/daily.js` (change 1 of 2):

```js
export const DAILY_AFTER = 'temple';            // daily goals open once this goal is complete

// measure kinds: homes (housing plots), roads (tiles beyond the start road), buildings (of a type),
// people (the population now), tally (a running tally in world.tally).
export const DAILY_POOL = [
  { id: 'plots4', measure: { kind: 'homes' }, n: 4 },
  { id: 'roads10', measure: { kind: 'roads' }, n: 10 },
```

with:

```js
export const DAILY_AFTER = 'temple';            // daily goals open once this goal is complete

// measure kinds: homes (housing plots), roads (tiles beyond the start road), buildings (of a type),
// people (the population now), tally (a running tally in world.tally), made (units of a good produced).
// A goal is drawn only when the city can do it: its building unlocked, and, where given, the milestone `from`
// reached and at least `routes` trade routes open. The Stage 2 goals all wait for Town, so a village's days
// draw exactly as before.
export const DAILY_POOL = [
  { id: 'plots4', measure: { kind: 'homes' }, n: 4 },
  { id: 'roads10', measure: { kind: 'roads' }, n: 10 },
```

Replace in `src/data/daily.js` (change 2 of 2):

```js
  { id: 'people20', measure: { kind: 'people' }, n: 20 },
  { id: 'profit1', measure: { kind: 'tally', key: 'profitMonths' }, n: 1 },
  { id: 'harvest100', measure: { kind: 'tally', key: 'harvested' }, n: 100 },
];
```

with:

```js
  { id: 'people20', measure: { kind: 'people' }, n: 20 },
  { id: 'profit1', measure: { kind: 'tally', key: 'profitMonths' }, n: 1 },
  { id: 'harvest100', measure: { kind: 'tally', key: 'harvested' }, n: 100 },
  { id: 'pottery30', measure: { kind: 'made', good: 'pottery' }, n: 30, from: 'town' },
  { id: 'gardens3', measure: { kind: 'buildings', type: 'garden' }, n: 3, from: 'town' },
  { id: 'sell20', measure: { kind: 'tally', key: 'sold' }, n: 20, routes: 1 },
  { id: 'statue1', measure: { kind: 'buildings', type: 'statue' }, n: 1, from: 'town' },
  { id: 'booth1', measure: { kind: 'buildings', type: 'booth' }, n: 1, from: 'town' },
];
```


In `src/data/tips.js` (the triggers are fired by the interface in Tasks 12-14):

Replace in `src/data/tips.js` (change 1 of 2):

```js
// Tips (early-game pass 3.4): ten short lessons, each tied to one trigger the interface fires (src/ui/createUI.js).
// Each shows at most once per device. The priority tip (only Press Play) ignores the first delay, the gap
// and an active tool, and replaces a tip already showing. The words live in src/ui/text.js (TIP_TEXT).
export const TIPS = [
```

with:

```js
// Tips (early-game pass 3.4): fourteen short lessons, each tied to one trigger the interface fires (src/ui/createUI.js).
// Each shows at most once per device. The priority tip (only Press Play) ignores the first delay, the gap
// and an active tool, and replaces a tip already showing. The words live in src/ui/text.js (TIP_TEXT).
export const TIPS = [
```

Replace in `src/data/tips.js` (change 2 of 2):

```js
  { id: 'undo_demolish', trigger: 'demolished', priority: false },       // something was demolished
  { id: 'goals_list', trigger: 'goalDone', priority: false },            // a goal was done
  { id: 'overlay_keys', trigger: 'overlayOn', priority: false },         // an overlay turned on by hand
];

export const TIP_GAP_MS = 180000;          // at least 3 minutes between two tips
```

with:

```js
  { id: 'undo_demolish', trigger: 'demolished', priority: false },       // something was demolished
  { id: 'goals_list', trigger: 'goalDone', priority: false },            // a goal was done
  { id: 'overlay_keys', trigger: 'overlayOn', priority: false },         // an overlay turned on by hand
  { id: 'nicer_streets', trigger: 'desirabilityShown', priority: false },     // a sheet opened for a home whose next tier wants a pleasant street
  { id: 'storehouse_choices', trigger: 'storehousePlaced', priority: false },  // a storehouse placed
  { id: 'trade_orders', trigger: 'tradingPostPlaced', priority: false },       // a trading post placed
  { id: 'merging_homes', trigger: 'townhouseSheet', priority: false },         // a Townhouse's sheet opened
];

export const TIP_GAP_MS = 180000;          // at least 3 minutes between two tips
```


**Sim.** In `src/sim/goals.js`:

Replace in `src/sim/goals.js` (change 1 of 3):

```js
import { housesOf, population, allBuildings } from './world.js';
import { alertsFor } from './alerts.js';
import { idx } from './grid.js';

const SETTLE_MAX = 20;   // settleGoals stops after this many completions in one go

```

with:

```js
import { housesOf, population, allBuildings } from './world.js';
import { alertsFor } from './alerts.js';
import { idx } from './grid.js';
import { openRoutes } from './trade.js';

const SETTLE_MAX = 20;   // settleGoals stops after this many completions in one go

```

Replace in `src/sim/goals.js` (change 2 of 3):

```js
    case 'building': return countOf(world, need.type) >= (need.n || 1);
    case 'people': return population(world) >= need.n;
    case 'tier': return homesAtTier(world, need.tier) >= need.n;
    case 'noAlert': return !hasAlert(world, need.code);
    case 'gold': return world.gold >= need.n;
    case 'all': return need.of.every((x) => goalMet(world, x));
```

with:

```js
    case 'building': return countOf(world, need.type) >= (need.n || 1);
    case 'people': return population(world) >= need.n;
    case 'tier': return homesAtTier(world, need.tier) >= need.n;
    case 'routes': return openRoutes(world) >= need.n;
    case 'noAlert': return !hasAlert(world, need.code);
    case 'gold': return world.gold >= need.n;
    case 'all': return need.of.every((x) => goalMet(world, x));
```

Replace in `src/sim/goals.js` (change 3 of 3):

```js
    case 'building': { const of = need.n || 1; return { n: Math.min(countOf(world, need.type), of), of }; }
    case 'people': return { n: Math.min(population(world), need.n), of: need.n };
    case 'tier': return { n: Math.min(homesAtTier(world, need.tier), need.n), of: need.n };
    case 'all': return { n: need.of.filter((x) => goalMet(world, x)).length, of: need.of.length };
    default: return null;
  }
```

with:

```js
    case 'building': { const of = need.n || 1; return { n: Math.min(countOf(world, need.type), of), of }; }
    case 'people': return { n: Math.min(population(world), need.n), of: need.n };
    case 'tier': return { n: Math.min(homesAtTier(world, need.tier), need.n), of: need.n };
    case 'routes': return { n: Math.min(openRoutes(world), need.n), of: need.n };
    case 'all': return { n: need.of.filter((x) => goalMet(world, x)).length, of: need.of.length };
    default: return null;
  }
```


In `src/sim/firsts.js`:

Replace in `src/sim/firsts.js` (change 1 of 2):

```js
const centre = (b) => (b ? { x: b.x + b.w / 2, y: b.y + b.d / 2 } : { x: null, y: null });
const isFull = (h) => h.tier >= 1 && h.residents >= TIERS[h.tier].capacity;
const holdsFood = (b) => (BUILDINGS[b.type].stores || []).some((g) => FOOD_GOODS.includes(g) && (b.store[g] || 0) > 0);

// null when the first has not happened; otherwise where it happened: the centre of the building that shows
// it (the first lived-in home, the first full home, the first granary holding food, the first home at the
// tier), or { x: null, y: null } when nothing on the map shows it (a month in profit). def is a FIRSTS entry.
export function firstMet(world, def) {
  const c = def.check || def;
  switch (c.kind) {
```

with:

```js
const centre = (b) => (b ? { x: b.x + b.w / 2, y: b.y + b.d / 2 } : { x: null, y: null });
const isFull = (h) => h.tier >= 1 && h.residents >= TIERS[h.tier].capacity;
const holdsFood = (b) => (BUILDINGS[b.type].stores || []).some((g) => FOOD_GOODS.includes(g) && (b.store[g] || 0) > 0);
const holds = (good) => (b) => (BUILDINGS[b.type].stores || []).includes(good) && (b.store[good] || 0) > 0;
const makes = (good) => (b) => Boolean(BUILDINGS[b.type].produces && BUILDINGS[b.type].produces.good === good);
// The building a tally's first shows on: the first granary holding food for a harvest, the trading post for a caravan.
const TALLY_PLACE = { harvested: holdsFood, caravans: (b) => b.type === 'trading_post' };

// null when the first has not happened; otherwise where it happened: the centre of the building that shows
// it (the first lived-in home, the first full home, the first granary holding food, the first home at the
// tier, the first trading post for a caravan, the first store holding a good made, else the first building
// that makes it), or { x: null, y: null } when nothing on the map shows it (a month in profit). def is a
// FIRSTS entry.
export function firstMet(world, def) {
  const c = def.check || def;
  switch (c.kind) {
```

Replace in `src/sim/firsts.js` (change 2 of 2):

```js
    }
    case 'tally':
      if ((world.tally[c.key] || 0) < c.n) return null;
      return centre(c.key === 'harvested' ? allBuildings(world).find(holdsFood) : null);
    default:
      return null;
  }
```

with:

```js
    }
    case 'tally':
      if ((world.tally[c.key] || 0) < c.n) return null;
      return centre(TALLY_PLACE[c.key] ? allBuildings(world).find(TALLY_PLACE[c.key]) : null);
    case 'made': {
      if (((world.tally.made || {})[c.good] || 0) < c.n) return null;
      const all = allBuildings(world);
      return centre(all.find(holds(c.good)) || all.find(makes(c.good)));
    }
    default:
      return null;
  }
```


In `src/sim/achievements.js`:

Replace in `src/sim/achievements.js`:

```js
    case 'tier': return housesOf(world).filter((h) => h.tier >= m.tier).length;
    case 'people': return Math.max(world.tally.peakPeople, population(world));
    case 'tally': return world.tally[m.key] || 0;
    case 'goals': return world.goals.completed.length;
    default: return null;
  }
```

with:

```js
    case 'tier': return housesOf(world).filter((h) => h.tier >= m.tier).length;
    case 'people': return Math.max(world.tally.peakPeople, population(world));
    case 'tally': return world.tally[m.key] || 0;
    case 'made': return (world.tally.made || {})[m.good] || 0;
    case 'goals': return world.goals.completed.length;
    default: return null;
  }
```


In `src/sim/daily.js`:

Replace in `src/sim/daily.js` (change 1 of 2):

```js
// date as a 'YYYY-MM-DD' key. No streaks: a new key simply replaces yesterday's goals. Data in src/data/daily.js.
import { DAILY_POOL, DAILY_COUNT, DAILY_REWARD, DAILY_AFTER } from '../data/daily.js';
import { housesOf, population } from './world.js';
import { isUnlocked } from './progression.js';
import { createRng, hash2 } from './rng.js';
import { roadsLaid, countType } from './achievements.js';

const defOf = (id) => DAILY_POOL.find((d) => d.id === id) || null;
const isAvailable = (world, def) => !def.measure.type || isUnlocked(world, def.measure.type);

export const dailyAvailable = (world) => world.goals.completed.includes(DAILY_AFTER);

```

with:

```js
// date as a 'YYYY-MM-DD' key. No streaks: a new key simply replaces yesterday's goals. Data in src/data/daily.js.
import { DAILY_POOL, DAILY_COUNT, DAILY_REWARD, DAILY_AFTER } from '../data/daily.js';
import { housesOf, population } from './world.js';
import { isUnlocked, atLeast } from './progression.js';
import { openRoutes } from './trade.js';
import { createRng, hash2 } from './rng.js';
import { roadsLaid, countType } from './achievements.js';

const defOf = (id) => DAILY_POOL.find((d) => d.id === id) || null;
// What the city can do today: the goal's building unlocked, its milestone reached, enough trade routes open.
const isAvailable = (world, def) => (!def.measure.type || isUnlocked(world, def.measure.type))
  && (!def.from || atLeast(world, def.from)) && (!def.routes || openRoutes(world) >= def.routes);

export const dailyAvailable = (world) => world.goals.completed.includes(DAILY_AFTER);

```

Replace in `src/sim/daily.js` (change 2 of 2):

```js
    case 'buildings': return countType(world, m.type);
    case 'people': return population(world);
    case 'tally': return world.tally[m.key] || 0;
    default: return 0;
  }
}
```

with:

```js
    case 'buildings': return countType(world, m.type);
    case 'people': return population(world);
    case 'tally': return world.tally[m.key] || 0;
    case 'made': return (world.tally.made || {})[m.good] || 0;
    default: return 0;
  }
}
```


**Words.** In `src/ui/text.js` (every new first, achievement, daily goal, tip and chapter needs words for the existing tests; the wording follows Task 14's, and each line was measured by the caption and tip tests):

Replace in `src/ui/text.js` (change 1 of 7):

```js
import { TIERS } from '../data/housing.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { FIRSTS } from '../data/firsts.js';

export const CATEGORY_NAMES = { roads: 'Roads', homes: 'Homes', food: 'Food', industry: 'Industry', services: 'Services', defence: 'Defence', monuments: 'Monuments' };

```

with:

```js
import { TIERS } from '../data/housing.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { FIRSTS } from '../data/firsts.js';
import { GOODS } from '../data/goods.js';

export const CATEGORY_NAMES = { roads: 'Roads', homes: 'Homes', food: 'Food', industry: 'Industry', services: 'Services', defence: 'Defence', monuments: 'Monuments' };

```

Replace in `src/ui/text.js` (change 2 of 7):

```js
export const viewLabel = (what) => `${T.view}: ${what}`;         // a View names its alert or building, so several of them stay apart

// Goal chapters for the goals sheet (early-game pass 3.3); triggered first-time events come first.
export const CHAPTER_NAMES = { first_homes: 'First homes', feed: 'Feed the village', grow: 'Grow', event: 'Needs attention' };
// Daily goals (early-game pass 3.7), keyed by DAILY_POOL ids.
export const DAILY_TEXT = {
  plots4: 'Place 4 housing plots', roads10: 'Lay 10 road tiles', upgrades3: 'Grow 3 homes a tier', well1: 'Build a well',
  bazaar1: 'Build a bazaar', temple1: 'Build a temple', farm1: 'Build a grain farm', people20: 'Gain 20 people',
  profit1: 'Have a month in profit', harvest100: 'Harvest 100 grain',
};
export const milestoneText = (name) => `Your city is now a ${name}`;

```

with:

```js
export const viewLabel = (what) => `${T.view}: ${what}`;         // a View names its alert or building, so several of them stay apart

// Goal chapters for the goals sheet (early-game pass 3.3); triggered first-time events come first.
export const CHAPTER_NAMES = { first_homes: 'First homes', feed: 'Feed the village', grow: 'Grow', goods: 'Goods', grand: 'A grand city', event: 'Needs attention' };
// Daily goals (early-game pass 3.7), keyed by DAILY_POOL ids.
export const DAILY_TEXT = {
  plots4: 'Place 4 housing plots', roads10: 'Lay 10 road tiles', upgrades3: 'Grow 3 homes a tier', well1: 'Build a well',
  bazaar1: 'Build a bazaar', temple1: 'Build a temple', farm1: 'Build a grain farm', people20: 'Gain 20 people',
  profit1: 'Have a month in profit', harvest100: 'Harvest 100 grain',
  pottery30: 'Make 30 pottery', gardens3: 'Build 3 gardens', sell20: 'Sell 20 goods to caravans', statue1: 'Build a statue', booth1: 'Build a booth',
};
export const milestoneText = (name) => `Your city is now a ${name}`;

```

Replace in `src/ui/text.js` (change 3 of 7):

```js
  first_house: { head: `First ${TIERS[4].name}`, why: `A temple let a home grow. ${TIERS[4].name}s hold ${TIERS[4].capacity} people.` },
  first_profit: { head: 'First month in profit', why: 'Taxes covered wages and upkeep, with gold to spare.' },
  people_100: { head: `${PEOPLE_FIRST} people live here`, why: `At ${TOWN.population} people the city becomes a ${TOWN.name}.` },
};

export const ACHIEVEMENT_NAMES = {
```

with:

```js
  first_house: { head: `First ${TIERS[4].name}`, why: `A temple let a home grow. ${TIERS[4].name}s hold ${TIERS[4].capacity} people.` },
  first_profit: { head: 'First month in profit', why: 'Taxes covered wages and upkeep, with gold to spare.' },
  people_100: { head: `${PEOPLE_FIRST} people live here`, why: `At ${TOWN.population} people the city becomes a ${TOWN.name}.` },
  first_pottery: { head: 'First pottery', why: `A potter turned clay into pots. ${TIERS[5].name}s need pottery.` },
  first_townhouse: { head: `First ${TIERS[5].name}`, why: `Pottery let a home grow. ${TIERS[5].name}s hold ${TIERS[5].capacity} people.` },
  first_manor: { head: `First ${TIERS[6].name}`, why: `Four homes became one. ${TIERS[6].name}s hold ${TIERS[6].capacity} people.` },
  first_caravan: { head: 'First caravan', why: 'Traders came to the trading post. Set what they buy and sell there.' },
  first_fine_manor: { head: `First ${TIERS[7].name}`, why: `Beer and two kinds of food let a ${TIERS[6].name.toLowerCase()} grow.` },
  first_villa: { head: `First ${TIERS[8].name}`, why: `Linen let a home grow. ${TIERS[8].name}s hold ${TIERS[8].capacity} people.` },
  first_estate: { head: `First ${TIERS[9].name}`, why: 'Jewellery let a home grow into the finest home in the city.' },
};

export const ACHIEVEMENT_NAMES = {
```

Replace in `src/ui/text.js` (change 4 of 7):

```js
  steady_books: 'Steady books', prosperous: 'Prosperous',
  no_one_hungry: 'No one hungry', water_for_all: 'Water for all', busy_hands: 'Busy hands',
  on_course: 'On course', day_by_day: 'Day by day',
};

const BUILDING_PLURALS = { well: 'wells', farm_grain: 'grain farms', granary: 'granaries', bazaar: 'bazaars', temple: 'temples' };
```

with:

```js
  steady_books: 'Steady books', prosperous: 'Prosperous',
  no_one_hungry: 'No one hungry', water_for_all: 'Water for all', busy_hands: 'Busy hands',
  on_course: 'On course', day_by_day: 'Day by day',
  potters_wheel: "Potter's wheel", merchant_city: 'Merchant city', townhouse_terrace: 'Townhouse terrace', manor_row: 'Manor row',
  green_city: 'Green city', sculpture_garden: 'Sculpture garden', estate_life: 'Estate life', thousand: 'A thousand souls',
};

const BUILDING_PLURALS = { well: 'wells', farm_grain: 'grain farms', granary: 'granaries', bazaar: 'bazaars', temple: 'temples' };
```

Replace in `src/ui/text.js` (change 5 of 7):

```js
  profitMonths: (n) => `End ${n} months in profit`,
  upgrades: (n) => `Grow homes ${n} times`,
  dailyDone: (n) => `Finish ${n} daily goals`,
};

// An achievement's exact condition, from its declarative measure ("Have 25 homes").
```

with:

```js
  profitMonths: (n) => `End ${n} months in profit`,
  upgrades: (n) => `Grow homes ${n} times`,
  dailyDone: (n) => `Finish ${n} daily goals`,
  tradeIncome: (n) => `Earn ${n} gold from trade`,
  sold: (n) => `Sell ${n} goods to caravans`,
  bought: (n) => `Buy ${n} goods from caravans`,
  caravans: (n) => `Welcome ${n} caravans`,
};

// An achievement's exact condition, from its declarative measure ("Have 25 homes").
```

Replace in `src/ui/text.js` (change 6 of 7):

```js
      const one = buildingName(m.type).toLowerCase();
      return `Have ${plural(m.n, one, BUILDING_PLURALS[m.type] || `${one}s`)}`;
    }
    case 'tier': return `Have ${m.n} homes at ${tierName(m.tier)} or better`;
    case 'people': return `Reach ${m.n} people`;
    case 'tally': return TALLY_CONDITIONS[m.key] ? TALLY_CONDITIONS[m.key](m.n) : '';
    case 'goals': return `Finish ${m.n} goals`;
    case 'fedAll': return `Reach ${m.people} people with every ${tierName(3)} or better home fed`;
    case 'waterAll': return `Have ${m.homes} lived-in homes, all with water`;
```

with:

```js
      const one = buildingName(m.type).toLowerCase();
      return `Have ${plural(m.n, one, BUILDING_PLURALS[m.type] || `${one}s`)}`;
    }
    case 'tier': return `Have ${plural(m.n, 'home', 'homes')} at ${tierName(m.tier)} or better`;
    case 'people': return `Reach ${m.n} people`;
    case 'tally': return TALLY_CONDITIONS[m.key] ? TALLY_CONDITIONS[m.key](m.n) : '';
    case 'made': return `Make ${m.n} ${GOODS[m.good].name.toLowerCase()}`;
    case 'goals': return `Finish ${m.n} goals`;
    case 'fedAll': return `Reach ${m.people} people with every ${tierName(3)} or better home fed`;
    case 'waterAll': return `Have ${m.homes} lived-in homes, all with water`;
```

Replace in `src/ui/text.js` (change 7 of 7):

```js
  undo_demolish: 'Press Undo to bring back what you just removed, if you change your mind.',
  goals_list: 'Open Goals to see what comes next, your progress and the gold each pays.',
  overlay_keys: 'Read the overlay: a filled dot has it, a hollow ring lacks it. Tap ✕ to close.',
};

// Achievements on the summary and the Welcome back card (early-game pass 3.8, 3.9). Counts read as progressText does.
```

with:

```js
  undo_demolish: 'Press Undo to bring back what you just removed, if you change your mind.',
  goals_list: 'Open Goals to see what comes next, your progress and the gold each pays.',
  overlay_keys: 'Read the overlay: a filled dot has it, a hollow ring lacks it. Tap ✕ to close.',
  nicer_streets: 'Place gardens and statues near homes: Manors and up need a pleasant street.',
  storehouse_choices: 'Tap a storehouse to choose its goods: a refused good goes to other storage.',
  trade_orders: 'Tap the trading post, open a route, then pick what to buy, sell and keep.',
  merging_homes: 'Keep the plots beside a Townhouse free: four in a square become a Manor.',
};

// Achievements on the summary and the Welcome back card (early-game pass 3.8, 3.9). Counts read as progressText does.
```


- [ ] **Step 4: Run the tests to see them pass**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "goals and rewards for Stage 2"
```

Expected: `7 passed, 0 failed` and `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

Seven existing tests pin the Stage 1 lists or their sizes. Found with `Get-ChildItem tests -Recurse -Filter *.js | Select-String -Pattern "GOALS\.map|FIRSTS\.map|ACHIEVEMENTS\.map|DAILY_POOL\.map|TIPS\.length|ACHIEVEMENTS\.length - 3|items\.includes\(g\.showMe"`; each change keeps what the test meant for Stage 1 and lets the Stage 2 entries follow.

`tests/sim/goals.test.js`:

Replace in `tests/sim/goals.test.js`:

```js

describe('goals', () => {
  it('lists the opening chain in order and shows three at a time', () => {
    expect(GOALS.map((g) => g.id)).toEqual(['road', 'plots', 'well', 'food', 'temple', 'homes_cottage', 'people100', 'homes_house', 'town']);
    for (const g of GOALS) { expect(g.text.length).toBeGreaterThan(0); expect(g.reward).toBe(GOAL_REWARD); expect(typeof g.showMe.category).toBe('string'); }
    const w = createWorld({ seed: 2 });
    expect(openGoals(w).map((g) => g.id)).toEqual(['road', 'plots', 'well']);
```

with:

```js

describe('goals', () => {
  it('lists the opening chain in order and shows three at a time', () => {
    expect(GOALS.slice(0, 9).map((g) => g.id)).toEqual(['road', 'plots', 'well', 'food', 'temple', 'homes_cottage', 'people100', 'homes_house', 'town']);   // Stage 2's follow
    for (const g of GOALS) { expect(g.text.length).toBeGreaterThan(0); expect(g.reward).toBe(GOAL_REWARD); expect(typeof g.showMe.category).toBe('string'); }
    const w = createWorld({ seed: 2 });
    expect(openGoals(w).map((g) => g.id)).toEqual(['road', 'plots', 'well']);
```


`tests/sim/goalsV2.test.js` (the Show me check gets the contract's planned categories until Task 12 fills `CATEGORIES`):

Replace in `tests/sim/goalsV2.test.js` (change 1 of 2):

```js

describe('goals v2', () => {
  it('lists the chain in chapters, the guide goals and the event goals', () => {
    expect(ids(GOALS)).toEqual(['road', 'plots', 'well', 'food', 'temple', 'homes_cottage', 'people100', 'homes_house', 'town']);
    expect(GOALS.map((g) => g.chapter)).toEqual(['first_homes', 'first_homes', 'first_homes', 'feed', 'feed', 'grow', 'grow', 'grow', 'grow']);
    expect(goalById('homes_cottage').need).toEqual({ kind: 'tier', tier: 3, n: 8 });
    expect(goalById('homes_cottage').text).toBe('Grow 8 homes to Cottage or better');
    expect(goalById('homes_house').need).toEqual({ kind: 'tier', tier: 4, n: 8 });
```

with:

```js

describe('goals v2', () => {
  it('lists the chain in chapters, the guide goals and the event goals', () => {
    expect(ids(GOALS.slice(0, 9))).toEqual(['road', 'plots', 'well', 'food', 'temple', 'homes_cottage', 'people100', 'homes_house', 'town']);
    expect(GOALS.slice(0, 9).map((g) => g.chapter)).toEqual(['first_homes', 'first_homes', 'first_homes', 'feed', 'feed', 'grow', 'grow', 'grow', 'grow']);
    expect(goalById('homes_cottage').need).toEqual({ kind: 'tier', tier: 3, n: 8 });
    expect(goalById('homes_cottage').text).toBe('Grow 8 homes to Cottage or better');
    expect(goalById('homes_house').need).toEqual({ kind: 'tier', tier: 4, n: 8 });
```

Replace in `tests/sim/goalsV2.test.js` (change 2 of 2):

```js
    }
    expect(goalById('fix_bazaar').showMe).toEqual({ category: 'food', item: 'granary', target: 'alert', code: 'bazaar_empty' });
    expect(goalById('out_of_debt').showMe).toBe(null);
    for (const g of [...GOALS, ...EVENT_GOALS]) {
      if (g.showMe) expect([g.id, CATEGORIES.find((c) => c.id === g.showMe.category).items.includes(g.showMe.item)]).toEqual([g.id, true]);
    }
    const all = ids([...GOALS, ...EVENT_GOALS]);
    expect(new Set(all).size).toBe(all.length);
```

with:

```js
    }
    expect(goalById('fix_bazaar').showMe).toEqual({ category: 'food', item: 'granary', target: 'alert', code: 'bazaar_empty' });
    expect(goalById('out_of_debt').showMe).toBe(null);
    // Stage 2's buildings join their categories with the interface (Task 12); until then the planned lists stand in.
    const PLANNED = { homes: ['garden', 'statue'], food: ['farm_fig'], industry: ['clay_pit', 'potter', 'farm_barley', 'brewery', 'farm_flax', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post'], services: ['booth'] };
    for (const g of [...GOALS, ...EVENT_GOALS]) {
      if (!g.showMe) continue;
      const items = [...CATEGORIES.find((c) => c.id === g.showMe.category).items, ...(PLANNED[g.showMe.category] || [])];
      expect([g.id, items.includes(g.showMe.item)]).toEqual([g.id, true]);
    }
    const all = ids([...GOALS, ...EVENT_GOALS]);
    expect(new Set(all).size).toBe(all.length);
```


`tests/sim/firsts.test.js`:

Replace in `tests/sim/firsts.test.js`:

```js
describe('sim firsts', () => {
  it('lists the Stage 1 firsts in order, each paying 10 gold', () => {
    expect(FIRST_REWARD).toBe(10);
    expect(FIRSTS.map((f) => f.id)).toEqual([
      'first_family', 'first_full_home', 'first_harvest', 'first_shack', 'first_cottage', 'first_house', 'first_profit', 'people_100',
    ]);
    expect(first('first_full_home').check).toEqual({ kind: 'fullHome' });
```

with:

```js
describe('sim firsts', () => {
  it('lists the Stage 1 firsts in order, each paying 10 gold', () => {
    expect(FIRST_REWARD).toBe(10);
    expect(FIRSTS.slice(0, 8).map((f) => f.id)).toEqual([
      'first_family', 'first_full_home', 'first_harvest', 'first_shack', 'first_cottage', 'first_house', 'first_profit', 'people_100',
    ]);
    expect(first('first_full_home').check).toEqual({ kind: 'fullHome' });
```


`tests/sim/achievements.test.js`:

Replace in `tests/sim/achievements.test.js` (change 1 of 2):

```js
import { describe, it, expect } from '../harness.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { achievementProgress, checkAchievements, roadsLaid } from '../../src/sim/achievements.js';
import { advanceDays } from '../../src/sim/clock.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';
```

with:

```js
import { describe, it, expect } from '../harness.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { GOODS } from '../../src/data/goods.js';
import { achievementProgress, checkAchievements, roadsLaid } from '../../src/sim/achievements.js';
import { advanceDays } from '../../src/sim/clock.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';
```

Replace in `tests/sim/achievements.test.js` (change 2 of 2):

```js
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
```

with:

```js
const progress = (w, id) => achievementProgress(w, byId(id));

describe('sim achievements', () => {
  it('lists 32 achievements with unique ids and measures the sim can count', () => {
    expect(ACHIEVEMENTS.slice(0, 24).map((a) => a.id)).toEqual([
      'way_in', 'neighbours', 'street', 'busy_streets', 'water_bearer', 'breadbasket', 'plenty', 'market_day',
      'faithful', 'shack_row', 'cottage_lane', 'house_proud', 'hamlet', 'town', 'bustling', 'good_harvests',
      'granary_of_the_river', 'steady_books', 'prosperous', 'no_one_hungry', 'water_for_all', 'busy_hands',
      'on_course', 'day_by_day',
    ]);
    expect(ACHIEVEMENTS.length).toBe(32);                                  // Stage 2 adds eight (goalsStage2.test.js)
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(32);
    const kinds = ['roads', 'homes', 'buildings', 'tier', 'people', 'tally', 'made', 'goals', 'fedAll', 'waterAll', 'jobs'];
    const tallyKeys = Object.keys(makeTestWorld().tally);
    for (const a of ACHIEVEMENTS) {
      expect(kinds).toContain(a.measure.kind);
      if (a.measure.kind === 'buildings') expect(Object.keys(BUILDINGS)).toContain(a.measure.type);
      if (a.measure.kind === 'tally') expect(tallyKeys).toContain(a.measure.key);
      if (a.measure.kind === 'made') expect(Object.keys(GOODS)).toContain(a.measure.good);
    }
    expect(byId('cottage_lane').measure).toEqual({ kind: 'tier', tier: 3, n: 20 });
    expect(byId('no_one_hungry').measure).toEqual({ kind: 'fedAll', people: 100 });
```


`tests/sim/daily.test.js` (a village city still draws exactly the ten Stage 1 goals, so every pinned draw stays as it is):

Replace in `tests/sim/daily.test.js` (change 1 of 2):

```js
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
```

with:

```js
}

describe('sim daily goals', () => {
  it('offers fifteen small goals, three a day, 25 gold each, once the temple goal is done', () => {
    expect(DAILY_COUNT).toBe(3);
    expect(DAILY_REWARD).toBe(25);
    expect(DAILY_AFTER).toBe('temple');
    expect(DAILY_POOL.map((d) => d.id)).toEqual([
      'plots4', 'roads10', 'upgrades3', 'well1', 'bazaar1', 'temple1', 'farm1', 'people20', 'profit1', 'harvest100',
      'pottery30', 'gardens3', 'sell20', 'statue1', 'booth1',
    ]);
    const tallyKeys = Object.keys(makeTestWorld().tally);
    for (const d of DAILY_POOL) {
      expect(['homes', 'roads', 'buildings', 'people', 'tally', 'made']).toContain(d.measure.kind);
      if (d.measure.kind === 'buildings') expect(Object.keys(BUILDINGS)).toContain(d.measure.type);
      if (d.measure.kind === 'tally') expect(tallyKeys).toContain(d.measure.key);
      expect(d.n).toBeGreaterThan(0);
```

Replace in `tests/sim/daily.test.js` (change 2 of 2):

```js
    expect(pickDaily(readyCity(2), DAY)).toEqual(['people20', 'bazaar1', 'plots4']);
    const order = dailyOrder(a, DAY);
    expect(order.slice(0, DAILY_COUNT)).toEqual(pickDaily(a, DAY));
    expect(order.slice().sort()).toEqual(DAILY_POOL.map((d) => d.id).sort());
    addRaw(a, 'house', 3, 3, { tier: 1, residents: 5 });                     // the city's state does not move the draw
    a.tally.harvested = 99;
    const before = JSON.stringify(a);
```

with:

```js
    expect(pickDaily(readyCity(2), DAY)).toEqual(['people20', 'bazaar1', 'plots4']);
    const order = dailyOrder(a, DAY);
    expect(order.slice(0, DAILY_COUNT)).toEqual(pickDaily(a, DAY));
    expect(order.slice().sort()).toEqual(DAILY_POOL.slice(0, 10).map((d) => d.id).sort());   // the ten a village can do: Stage 2's wait for Town
    addRaw(a, 'house', 3, 3, { tier: 1, residents: 5 });                     // the city's state does not move the draw
    a.tally.harvested = 99;
    const before = JSON.stringify(a);
```


`tests/ui/tips.test.js`:

Replace in `tests/ui/tips.test.js`:

```js
  });
  it('keeps every tip short and unique, and lists them all in How to play', async () => {
    const ids = TIPS.map((t) => t.id), triggers = TIPS.map((t) => t.trigger);
    expect(TIPS.length).toBe(10);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(triggers).size).toBe(triggers.length);
    for (const t of TIPS) {
```

with:

```js
  });
  it('keeps every tip short and unique, and lists them all in How to play', async () => {
    const ids = TIPS.map((t) => t.id), triggers = TIPS.map((t) => t.trigger);
    expect(TIPS.length).toBe(14);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(triggers).size).toBe(triggers.length);
    for (const t of TIPS) {
```


`tests/ui/achievementsSheet.test.js` (an Estate counts to one, which the summary shows as yes or no, with no bar):

Replace in `tests/ui/achievementsSheet.test.js`:

```js
      setGuide(r.world, false);
      r.world.achievements = [];
      r.store.set(openSheet(r.store.get(), 'summary'));
      const counted = ACHIEVEMENTS.filter((a) => !['fedAll', 'waterAll', 'jobs'].includes(a.measure.kind));
      expect(counted.length).toBe(ACHIEVEMENTS.length - 3);
      for (const a of counted) {
        const p = achievementProgress(r.world, a);
        const row = rowOf(r, a.id);
```

with:

```js
      setGuide(r.world, false);
      r.world.achievements = [];
      r.store.set(openSheet(r.store.get(), 'summary'));
      const counted = ACHIEVEMENTS.filter((a) => !['fedAll', 'waterAll', 'jobs'].includes(a.measure.kind) && a.measure.n > 1);   // a count of one (an Estate) reads as yes or no
      expect(counted.length).toBe(ACHIEVEMENTS.length - 4);
      for (const a of counted) {
        const p = achievementProgress(r.world, a);
        const row = rowOf(r, a.id);
```


- [ ] **Step 6: Visual check**

None: no drawing or layout changes. The new words are measured by the existing caption and tip tests in Step 7 (two lines per caption, three per tip, at 125% and 150% text on phones).

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED` (809 tests on the verification base). If `ui celebrate > on a phone at larger text writes each caption as one flow of words, two lines at most` or `ui tips > in the game: on a phone at 125% and 150% text every tip is three lines or fewer` fails, a goal, first, achievement or tip text is too long: shorten that text, never the test.

- [ ] **Step 8: Commit**

```powershell
git add src/data/goals.js src/data/firsts.js src/data/achievements.js src/data/daily.js src/data/tips.js src/sim/goals.js src/sim/firsts.js src/sim/achievements.js src/sim/daily.js src/ui/text.js tests/sim/goalsStage2.test.js tests/sim/goals.test.js tests/sim/goalsV2.test.js tests/sim/firsts.test.js tests/sim/achievements.test.js tests/sim/daily.test.js tests/ui/tips.test.js tests/ui/achievementsSheet.test.js tests/all.js sw-files.js
git commit -m @'
Carry goals, firsts, achievements, daily goals and tips on to the Capital

Fifteen goals lead from Town to an Estate, one new need at a time, with a
trade route among them. Firsts for pottery, the first caravan and each new
tier; eight achievements; five daily goals that wait for Town; four tips for
pleasant streets, storehouses, trade and merges, all with their words.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 9: Art: housing tiers 5-9

**Files:**
- Modify: `src/render/art/housing.js` (H5, `big()` and H6-H9 ported from the mock-up, the roof tells, five registry slots)
- Create: `tests/render/housingTiersArt.test.js`
- Modify: `tests/all.js` (one import line)

**Interfaces:**
- Consumes: the house shape the sim gives (Task 2's `TIERS` sizes, Task 6's merged houses with `w: 2, d: 2`); `slotFor` already maps any house to `house.t${tier}`, so nothing in `registry.js` changes.
- Produces: art slots `house.t5` (1×1) and `house.t6` … `house.t9` (2×2), each `{ w, d, height, bounds: boundsFor(w, d, height), shadows, draw }`, with `height` the top of the tallest drawn thing (t5 23, t6 21, t7 22, t8 23, t9 32); exports `H5`, `H6`, `H7`, `H8`, `H9`, `big(g, x, y, O)`, `BIG` (the mock-up's four option sets keyed by tier), and the roof-tell patches `PERGOLA`, `ROOF_GARDEN`, `ROOF_POOL` (tile offsets from the footprint origin).

The look, per spec 4.6 ("Tiers 5-9 each add one roof tell"), read as cumulative, each tell on its own patch of roof so none hides another:
- 5 Townhouse: the mock-up's H5 as is: a tall banded block with a teal striped awning on its roof terrace. The big homes keep a striped awning on the annexe roof, in each tier's own colour (orange, green, teal, purple, the mock-up's).
- 6 Manor: a timber pergola over the main roof's mat, its slats striping the mat with shadow and a vine climbing one post.
- 7 Fine manor: a roof garden on the front half of the annexe roof (a planter of shrubs and flowers in front of the awning), plus the mock-up's columns.
- 8 Villa: the mock-up's painted parapet bands (red under teal), its pool and second palm.
- 9 Estate: the mock-up's flag, gold-teal-red bands, gold capitals and statue, plus a small pool on the main roof beside the flag. (The mock-up's courtyard pool already appears at tier 8, so the tier-9 "pool" is the roof pool.)

- [ ] **Step 1: Write the failing tests**

Create `tests/render/housingTiersArt.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { H1, H2, H3, H4, H5, H6, H7, H8, H9, BIG, PERGOLA, ROOF_GARDEN, ROOF_POOL } from '../../src/render/art/housing.js';
import { ART, boundsFor, slotFor } from '../../src/render/art/registry.js';
import { RED, GOLD, TEAL, ORANGE, GREEN, PURP } from '../../src/render/art/palette.js';
import { p, U } from '../../src/render/iso.js';
import { makeCanvas, pixelAt, canvasHash, nearColour, hexToRgb } from '../helpers/canvas.js';

// Drawn alone at scale 2 (zoom 1 on a 1x screen), the footprint origin at canvas (160, 110), as the other art tests do.
const OX = 160, OY = 110;
function drawAlone(fn) {
  const c = makeCanvas(320, 260);
  const ctx = c.getContext('2d');
  ctx.translate(OX, OY);
  fn(makeDraw(ctx, 2), 0, 0);
  return c;
}
const at = (c, q) => pixelAt(c, OX + q[0] * 2, OY + q[1] * 2);
const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 3) for (let y = 0; y < c.height; y += 3) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};
const greenish = (px) => px[3] > 0 && px[1] > px[0] + 15 && px[1] > px[2] + 15;
const DRAW = { 5: H5, 6: H6, 7: H7, 8: H8, 9: H9 };
// A point on the lit (+y) face of a big home's main block, u along it and s up it (the block's own face mapper).
const mainFace = (u, s) => U(p(0.1 + 1.2 * u, 0.92), s);

describe('house art, tiers 5 to 9', () => {
  it('draws every tier with ink and a look of its own', () => {
    const hashes = new Set();
    for (const fn of [H1, H2, H3, H4, H5, H6, H7, H8, H9]) {
      const c = drawAlone(fn);
      expect(inked(c)).toBeGreaterThan(100);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(9);
  });
  it('registers the Townhouse as 1x1 and Manor to Estate as 2x2, each taller than the tier below', () => {
    const e5 = ART['house.t5'];
    expect([e5.w, e5.d, e5.draw]).toEqual([1, 1, H5]);
    expect(e5.height).toBeGreaterThan(ART['house.t4'].height);
    for (const t of [6, 7, 8, 9]) {
      const e = ART[`house.t${t}`];
      expect([t, e.w, e.d]).toEqual([t, 2, 2]);
      expect(e.shadows).toEqual([[0.1, 0.1, 1.2, 0.82, BIG[t].hA + 3], [1.25, 0.1, 0.65, 1.25, BIG[t].hB + 3]]);
      expect(typeof e.draw).toBe('function');
    }
    for (const t of [5, 6, 7, 8, 9]) expect(ART[`house.t${t}`].bounds).toEqual(boundsFor(ART[`house.t${t}`].w, ART[`house.t${t}`].d, ART[`house.t${t}`].height));
    expect(ART['house.t6'].height).toBeLessThan(ART['house.t7'].height);
    expect(ART['house.t7'].height).toBeLessThan(ART['house.t8'].height);
    expect(ART['house.t8'].height).toBeLessThan(ART['house.t9'].height);
    expect([6, 7, 8, 9].map((t) => BIG[t].hA)).toEqual([13, 14, 15, 18]);   // the mock-up's main blocks rise tier by tier
  });
  it('names a slot for every tier and nothing past the top', () => {
    for (let t = 1; t <= 9; t++) {
      expect(slotFor({ type: 'house', tier: t })).toBe(`house.t${t}`);
      expect(typeof ART[`house.t${t}`].draw).toBe('function');
    }
    expect(ART['house.t10']).toBe(undefined);
  });
  it('keeps the striped awning on the Townhouse roof and on the annexe of every big home', () => {
    // the Townhouse awning's top: tb(x + 0.12, y + 0.12, 0.44, 0.42, 1.2, 21.2) seen at its middle
    const t5 = at(drawAlone(H5), U(p(0.34, 0.33), 22.4));
    expect(t5[1] > t5[0] && t5[2] > t5[0]).toBe(true);                    // teal, under a pale stripe wash
    // the big homes' annexe awning top, in each tier's own colour under the same pale stripe wash (a quarter strength)
    const washed = (hex) => { const [r, g, b] = hexToRgb(hex), [sr, sg, sb] = hexToRgb('#F6ECD6'); return [r * 0.75 + sr * 0.25, g * 0.75 + sg * 0.25, b * 0.75 + sb * 0.25]; };
    const colours = { 6: ORANGE, 7: GREEN, 8: TEAL, 9: PURP };
    for (const t of [6, 7, 8, 9]) {
      const px = at(drawAlone(DRAW[t]), U(p(1.57, 0.455), BIG[t].hB + 4.2 + 1.2));
      const want = washed(colours[t]);
      expect([t, Math.max(...[0, 1, 2].map((k) => Math.abs(px[k] - want[k]))) <= 12]).toEqual([t, true]);
    }
  });
  it('shows one more roof tell at each tier from 6, readable at zoom 1', () => {
    const c = {};
    for (const t of [6, 7, 8, 9]) c[t] = drawAlone(DRAW[t]);
    // 6: the pergola's slats, brown timber over the roof mat, from tier 6 up
    for (const t of [6, 7, 8, 9]) {
      const slat = at(c[t], U(p(PERGOLA.x + PERGOLA.w * 0.6, PERGOLA.y + PERGOLA.d * 0.5), BIG[t].hA + PERGOLA.h + 0.7));
      expect([t, nearColour(slat, '#A9805A', 30)]).toEqual([t, true]);
    }
    // 7: the roof garden on the front of the annexe roof: mostly green from 7 up, bare roof on a Manor
    const gardenGreen = (t, hB) => {
      let n = 0;
      for (const [u, v] of [[0.3, 0.3], [0.5, 0.45], [0.7, 0.4], [0.4, 0.7], [0.75, 0.75]]) {
        if (greenish(at(c[t], U(p(ROOF_GARDEN.x + ROOF_GARDEN.w * u, ROOF_GARDEN.y + ROOF_GARDEN.d * v), hB + 1.4)))) n++;
      }
      return n;
    };
    expect(gardenGreen(6, BIG[6].hB)).toBe(0);
    for (const t of [7, 8, 9]) expect([t, gardenGreen(t, BIG[t].hB) >= 4]).toEqual([t, true]);
    // 8: a red parapet band below the teal one, which a Fine manor does not have
    expect(nearColour(at(c[8], mainFace(0.85, 13.2)), RED, 12)).toBe(true);
    expect(nearColour(at(c[7], mainFace(0.85, 13.2)), RED, 60)).toBe(false);
    expect(nearColour(at(c[7], mainFace(0.85, 13.2)), TEAL, 12)).toBe(true);
    expect(nearColour(at(c[9], mainFace(0.85, 17.2)), GOLD, 12)).toBe(true);   // the Estate's top band is gold
    // 9: a pink flag above the roof, and a pool on it
    const q = U(p(1.1, 0.25), BIG[9].hA);
    const flag = [q[0] + 2.3, q[1] - 12.5];
    expect(nearColour(at(c[9], flag), '#D9667A', 12)).toBe(true);
    expect(at(c[8], flag)[3]).toBe(0);
    const water = U(p(ROOF_POOL.x + ROOF_POOL.w * 0.8, ROOF_POOL.y + ROOF_POOL.d * 0.5), BIG[9].hA + 0.2);
    expect(nearColour(at(c[9], water), '#4FB3B5', 30)).toBe(true);
    expect(nearColour(at(c[8], U(p(ROOF_POOL.x + ROOF_POOL.w * 0.8, ROOF_POOL.y + ROOF_POOL.d * 0.5), BIG[8].hA)), '#4FB3B5', 60)).toBe(false);
  });
});
```

In `tests/all.js`, add the import directly after `import './render/housingArt.test.js';`:

```js
import './render/housingTiersArt.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "house art"
```

Expected: the page reports `LOAD ERROR` with a SyntaxError that `src/render/art/housing.js` does not provide an export named `H5` (or another of the new names). Nothing runs until the module exists.

- [ ] **Step 3: Implement**

In `src/render/art/housing.js`, replace the header comment and the two imports.

Before:

```js
// Housing tiers 1-4, ported line for line from the approved mock-up (v4-new-era-style.html, H1-H4).
// Tiers 5-9 arrive in Stage 2 and follow the same pattern.
import { box, tb, qd, crs, door, win, parapet, mat, pots, fence, stairs, awn, p, U } from './primitives.js';
import { MUD, MUD2, WASH, WASH2, THATCH, BLUE, GOLD, RED, PINK, GREEN, GREEN_DARK, TEAL } from './palette.js';
```

After:

```js
// Housing tiers 1-9, ported line for line from the approved mock-up (v4-new-era-style.html, H1-H5 and big()).
// Tiers 6-9 are 2x2. Spec 4.6 gives tiers 5-9 one roof tell each, kept by the tiers above: the striped awning (5,
// on the annexe of the big homes), a vine pergola over the roof mat (6), a roof garden on the annexe (7), painted
// parapet bands (8) and a flag with a roof pool (9). The awning, bands and flag are the mock-up's own; big() adds
// the rest, each on its own patch of roof so none hides another.
import {
  box, tb, qd, crs, door, win, parapet, mat, rug, pots, fence, stairs, ladder, awn, col, bed, pool, statue, p, U, quad,
} from './primitives.js';
import { palmAt } from './nature.js';
import {
  MUD, MUD2, WASH, WASH2, STONE, THATCH, GOLDC, BLUE, GOLD, RED, RED_DARK, PINK, ORANGE, GREEN, GREEN_DARK, TEAL, TEAL_DARK,
  PURP, WOOD, LEAF, LEAF2, LEAF3, SHADOW,
} from './palette.js';
```

(`import { boundsFor } from '../iso.js';` stays as it is. `nature.js` imports only `primitives.js` and `palette.js`, so there is no import cycle.)

Then insert this block after the end of `H4` and before the line `// Shadow blocks are the mock-up's shd(...) calls, relative to the footprint origin.`:

```js
// Townhouse: a tall block banded in teal and red under its parapet, a teal striped awning on the roof terrace (the
// tier-5 tell), an outside staircase, a ladder up from the annexe roof and a pink-and-gold mat on the annexe.
export function H5(g, x, y) {
  const A = box(g, x + 0.08, y + 0.08, 0.6, 0.56, 17, 0, WASH);
  parapet(g, x + 0.08, y + 0.08, 0.6, 0.56, 17);
  qd(g, A.L, 0, 1, 15.6, 16.6, TEAL);
  qd(g, A.R, 0, 1, 15.6, 16.6, TEAL_DARK);
  qd(g, A.L, 0, 1, 14.8, 15.6, RED);
  qd(g, A.R, 0, 1, 14.8, 15.6, RED_DARK);
  win(g, A.L, 0.15, 0.3, 10, 12.5);
  win(g, A.L, 0.55, 0.7, 10, 12.5);
  win(g, A.R, 0.25, 0.42, 10, 12.5);
  win(g, A.R, 0.25, 0.42, 4, 6.5);
  awn(g, x + 0.12, y + 0.12, 0.44, 0.42, 21.2, TEAL, TEAL_DARK);
  pots(g, U(p(x + 0.58, y + 0.2), 17), 2);
  stairs(g, x + 0.1, y + 0.64, 0.36, 0.13, 9.5, 5, WASH2);
  const B = box(g, x + 0.52, y + 0.44, 0.4, 0.48, 10, 0, WASH2);
  parapet(g, x + 0.52, y + 0.44, 0.4, 0.48, 10);
  door(g, B, 0.3, 0.62, 5);
  mat(g, x + 0.57, y + 0.5, 0.3, 0.36, 10, PINK, GOLD);
  ladder(g, U(p(x + 0.6, y + 0.68), 10), U(p(x + 0.6, y + 0.64), 17.5));
}

// The roof tells the mock-up lacked. Each sits on its own patch of roof, so a tier keeps the tells below it.
const BEAM = '#8A6448', SLAT = '#A9805A';
const FLOWERS = [RED, GOLD, '#FFFFFF', PINK];
export const PERGOLA = { x: 0.2, y: 0.16, w: 0.52, d: 0.46, h: 5 };   // over the main roof's mat, relative to the footprint
export const ROOF_GARDEN = { x: 1.34, y: 0.8, w: 0.48, d: 0.46 };      // the front half of the annexe roof
export const ROOF_POOL = { x: 0.84, y: 0.5, w: 0.38, d: 0.32 };         // the main roof's front right corner

// Tier 6: a timber pergola over the roof mat: four posts, two beams, six slats whose shadows stripe the mat, and a
// vine climbing the front post into the back corner.
function pergola(g, x, y, z) {
  const { w, d, h } = PERGOLA, x0 = x + PERGOLA.x, y0 = y + PERGOLA.y;
  for (let i = 0; i <= 5; i++) {                                   // the slats' shadows fall on the roof
    const u = x0 + 0.06 + (w * i) / 5;
    g.line(U(p(u, y0 + 0.02), z), U(p(u, y0 + d - 0.02), z), SHADOW, 1.2, 0.18);
  }
  for (const [a, b] of [[x0, y0], [x0 + w, y0], [x0, y0 + d], [x0 + w, y0 + d]]) {
    const q = U(p(a, b), z);
    g.line(q, U(q, h), WOOD, 1);
  }
  for (const v of [0, d]) g.line(U(p(x0 - 0.05, y0 + v), z + h), U(p(x0 + w + 0.05, y0 + v), z + h), BEAM, 1.2);
  for (let i = 0; i <= 5; i++) {
    const u = x0 + (w * i) / 5;
    g.line(U(p(u, y0 - 0.06), z + h + 0.7), U(p(u, y0 + d + 0.06), z + h + 0.7), SLAT, 1);
  }
  const foot = U(p(x0, y0 + d), z);                                // the vine: up the front post, along the back beam
  g.stroke([['M', foot], ['Q', U(p(x0 + 0.03, y0 + d), z + h * 0.5), U(p(x0, y0 + d), z + h)]], LEAF3, 0.9);
  for (const [u, v, r, c] of [[0, 1, 1.3, LEAF], [0, 0.72, 1.1, LEAF2], [0, 0.4, 1.2, LEAF3], [0.04, 0, 1.4, LEAF], [0.24, 0, 1.2, LEAF2], [0.46, 0, 1.1, LEAF3]]) {
    g.circ(U(p(x0 + w * u, y0 + d * v), z + h + 0.9), r, c);
  }
  g.circ(U(p(x0 + w * 0.24, y0), z + h + 1.6), 0.6, PINK);
}

// Tier 7: a roof garden on the annexe, in front of its awning: a planter of dark soil with shrubs and flowers.
function roofGarden(g, x, y, z) {
  const { w, d } = ROOF_GARDEN, x0 = x + ROOF_GARDEN.x, y0 = y + ROOF_GARDEN.y;
  const P = box(g, x0, y0, w, d, 1.4, z, MUD2, 0);
  qd(g, P.L, 0, 1, 0.5, 0.9, GOLD, { alpha: 0.7 });
  g.poly(quad(x0 + 0.03, y0 + 0.03, w - 0.06, d - 0.06, z + 1.4), '#5A7A34');
  const spots = [[0.2, 0.25], [0.55, 0.2], [0.82, 0.3], [0.3, 0.6], [0.66, 0.58], [0.2, 0.85], [0.52, 0.86], [0.84, 0.78]];
  spots.forEach(([u, v], i) => {
    const q = U(p(x0 + w * u, y0 + d * v), z + 1.4);
    g.circ(U(q, 1.4), 1.8, [LEAF3, LEAF, LEAF2][i % 3], { outline: true });
    if (i % 2 === 0) g.circ(U(q, 2.4), 0.7, FLOWERS[(i / 2) % 4]);
  });
}

// Tier 9: a small pool on the main roof, beside the flag.
function roofPool(g, x, y, z) {
  const { w, d } = ROOF_POOL, x0 = x + ROOF_POOL.x, y0 = y + ROOF_POOL.y;
  g.poly(quad(x0 - 0.04, y0 - 0.04, w + 0.08, d + 0.08, z + 0.2), '#E4D6BC');
  g.poly(quad(x0, y0, w, d, z + 0.2), '#4FB3B5');
  g.poly(quad(x0 + 0.03, y0 + 0.03, w - 0.06, d * 0.35, z + 0.2), '#7FD0CC', { alpha: 0.6 });
  g.line(U(p(x0 + w * 0.25, y0 + d * 0.62), z + 0.2), U(p(x0 + w * 0.65, y0 + d * 0.62), z + 0.2), '#D7F0EE', 0.7);
}

// The 2x2 homes, Manor and up: a main block at the back with a roof mat and pots, a walled courtyard in front of
// it and an annexe down the right side with an awning on its roof. O picks each tier's look, as in the mock-up:
// the block heights hA and hB, painted bands, columns, a pool, a rug and a flower bed, a statue, palms, a flag,
// the annexe awning's colours and the courtyard floor. Every big home has the pergola (the tier-6 tell); O.tier
// adds the roof garden from 7 and the roof pool at 9 (the bands and the flag are the mock-up's own options).
export function big(g, x, y, O) {
  const tier = O.tier || 6;
  const A = box(g, x + 0.1, y + 0.1, 1.2, 0.82, O.hA, 0, WASH);
  parapet(g, x + 0.1, y + 0.1, 1.2, 0.82, O.hA);
  for (const [s0, s1, c] of O.bands || [[O.hA - 1.4, O.hA - 0.6, TEAL]]) {
    qd(g, A.L, 0, 1, s0, s1, c);
    qd(g, A.R, 0, 1, s0, s1, c, { alpha: 0.8 });
  }
  door(g, A, 0.42, 0.56, 7);
  for (const u of [0.1, 0.24, 0.72, 0.86]) win(g, A.L, u, u + 0.07, 4, 7);
  if (O.hA > 15) for (const u of [0.1, 0.24, 0.72, 0.86]) win(g, A.L, u, u + 0.07, 9.5, 12);
  win(g, A.R, 0.3, 0.5, 4, 7);
  mat(g, x + 0.25, y + 0.2, 0.4, 0.35, O.hA, BLUE, GOLD);
  if (tier >= 9) roofPool(g, x, y, O.hA);
  pots(g, U(p(x + 0.95, y + 0.3), O.hA), 2);
  pergola(g, x, y, O.hA);
  if (O.flag) {
    const q = U(p(x + 1.1, y + 0.25), O.hA);
    g.line(q, U(q, 14), WOOD, 0.7);
    g.poly([U(q, 14), [q[0] + 7, q[1] - 12.5], U(q, 11)], PINK);
  }
  g.poly(quad(x + 0.15, y + 0.95, 1.07, 0.91, 0), O.floor || '#EEE2CA');
  box(g, x + 0.1, y + 0.95, 0.08, 0.9, 3.5, 0, WASH, 0);
  if (O.cols) {
    for (const u of O.cols) col(g, x + u, y + 1.02, O.colH || 9, 0, O.cap);
    box(g, x + 0.18, y + 0.9, 1.08, 0.22, 1.2, (O.colH || 9) + 1.6, STONE, 0);
  }
  if (O.pool) pool(g, x + 0.32, y + 1.24, 0.6, 0.3);
  if (O.rug) rug(g, x + 0.28, y + 1.2, 0.5, 0.3, 0, RED, '#F2D7A8', GOLD);
  if (O.bed) bed(g, x + 0.3, y + 1.56, 0.55, 0.22);
  if (O.statue) statue(g, x + 0.28, y + 1.66);
  const B = box(g, x + 1.25, y + 0.1, 0.65, 1.25, O.hB, 0, WASH2);
  parapet(g, x + 1.25, y + 0.1, 0.65, 1.25, O.hB);
  door(g, B, 0.35, 0.65, 5.5);
  win(g, B.R, 0.2, 0.35, 4, 6.5);
  win(g, B.R, 0.6, 0.75, 4, 6.5);
  if (O.bands) {
    qd(g, B.L, 0, 1, O.hB - 1.4, O.hB - 0.6, TEAL);
    qd(g, B.R, 0, 1, O.hB - 1.4, O.hB - 0.6, TEAL, { alpha: 0.8 });
  }
  awn(g, x + 1.32, y + 0.18, 0.5, 0.55, O.hB + 4.2, O.awn || ORANGE, O.awn2 || '#B45F2A');
  if (tier >= 7) roofGarden(g, x, y, O.hB);
  for (const [u, v] of O.palms || []) palmAt(g, x + u, y + v, 0.72);
  box(g, x + 1.82, y + 1.35, 0.08, 0.5, 3.5, 0, WASH, 0);
  box(g, x + 0.1, y + 1.8, 0.72, 0.1, 3.5, 0, WASH, 0);
  box(g, x + 0.74, y + 1.76, 0.1, 0.18, 5.5, 0, WASH, 0);
  box(g, x + 1.16, y + 1.76, 0.1, 0.18, 5.5, 0, WASH, 0);
  box(g, x + 1.18, y + 1.8, 0.72, 0.1, 3.5, 0, WASH, 0);
}

// The mock-up's four variants (H6-H9), keyed by tier.
export const BIG = {
  6: { hA: 13, hB: 10, rug: 1, bed: 1, palms: [[1.02, 1.6]] },
  7: { hA: 14, hB: 11, cols: [0.35, 0.65, 0.95], rug: 1, bed: 1, palms: [[1.05, 1.62]], awn: GREEN, awn2: GREEN_DARK },
  8: {
    hA: 15, hB: 12, cols: [0.35, 0.65, 0.95], pool: 1, palms: [[0.22, 1.7], [1.05, 1.62]], awn: TEAL, awn2: TEAL_DARK,
    bands: [[13.6, 14.4, TEAL], [12.8, 13.6, RED]],
  },
  9: {
    hA: 18, hB: 14, cols: [0.3, 0.55, 0.8, 1.05], colH: 11, cap: GOLDC, pool: 1, statue: 1, palms: [[1.08, 1.62]],
    bands: [[16.6, 17.4, GOLD], [15.8, 16.6, TEAL], [15, 15.8, RED]], flag: 1, awn: PURP, awn2: '#563E78', floor: '#F2E8D2',
  },
};
export const H6 = (g, x, y) => big(g, x, y, { ...BIG[6], tier: 6 });
export const H7 = (g, x, y) => big(g, x, y, { ...BIG[7], tier: 7 });
export const H8 = (g, x, y) => big(g, x, y, { ...BIG[8], tier: 8 });
export const H9 = (g, x, y) => big(g, x, y, { ...BIG[9], tier: 9 });

// A 2x2 home's slot: the mock-up's two shadow blocks (its shd calls) for the variant. height is the top of the
// tallest thing on it: the pergola's vine (main block + 5 + 0.9 + its leaves), or the flag at 9.
const bigSlot = (t, height, draw) => ({
  w: 2, d: 2, height, bounds: boundsFor(2, 2, height),
  shadows: [[0.1, 0.1, 1.2, 0.82, BIG[t].hA + 3], [1.25, 0.1, 0.65, 1.25, BIG[t].hB + 3]], draw,
});

```

Finally, register the five slots in `HOUSE_ART`.

Before:

```js
  'house.t4': { w: 1, d: 1, height: 18, bounds: boundsFor(1, 1, 18), shadows: [[0.08, 0.08, 0.62, 0.58, 16], [0.55, 0.42, 0.38, 0.5, 9]], draw: H4 },
};
```

After:

```js
  'house.t4': { w: 1, d: 1, height: 18, bounds: boundsFor(1, 1, 18), shadows: [[0.08, 0.08, 0.62, 0.58, 16], [0.55, 0.42, 0.38, 0.5, 9]], draw: H4 },
  'house.t5': { w: 1, d: 1, height: 23, bounds: boundsFor(1, 1, 23), shadows: [[0.08, 0.08, 0.6, 0.56, 21], [0.52, 0.44, 0.4, 0.48, 13]], draw: H5 },
  'house.t6': bigSlot(6, 21, H6),
  'house.t7': bigSlot(7, 22, H7),
  'house.t8': bigSlot(8, 23, H8),
  'house.t9': bigSlot(9, 32, H9),
};
```

The heights are the top of the tallest drawn thing, in art px above the ground: the Townhouse awning at 21.2 + 1.2; on the big homes the pergola's vine at the main block's height + 7.3 (13, 14 and 15 give 21, 22 and 23); the Estate's flag at 18 + 14. `t5`'s two shadow blocks are the mock-up's `shd` calls for H5.

- [ ] **Step 4: Run the tests to see them pass**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "house art"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "art bounds"
```

Expected: `11 passed, 0 failed` (the six Stage 1 house tests and the five new ones), then the bounds test passes with the five new slots in it: every slot's ink stays inside its bounds. Both end `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

None. `grep -rn "house.t\|HOUSE_ART" tests/` finds `housingArt.test.js` (tiers 1-4 only, and `house.t0` still undefined), `lifeArt.test.js` and `problemMarkers.test.js` (`house.t2`, `house.t3` and heights read from `ART`), all unchanged by new slots. `artBounds.test.js` walks every slot and covers the new ones without a change. No renderer or picking code lists tiers: `slotFor`, `pick.js` (`heightOf`) and the problem markers read `ART[slotFor(b)]`, so a merged 2×2 house picks up its slot and height by itself.

- [ ] **Step 6: Visual check**

Run from `C:\dev\thebes` (the `raw` folder is gitignored). The `-Eval` strings use only backtick strings inside, so they pass through `powershell -File` intact. The first two draw the ladder on its own; the last two put a street of tiers 4 to 9 into a running game near the camera.

```powershell
$sheet = '(async () => { const { ART } = await import(`./src/render/art/registry.js`); const { makeDraw } = await import(`./src/render/art/ctx.js`); const { tileDiamond } = await import(`./src/render/iso.js`); const { groundShadow } = await import(`./src/render/art/primitives.js`); const c = document.createElement(`canvas`); c.width = innerWidth; c.height = innerHeight; c.style.cssText = `position:fixed;left:0;top:0;z-index:9999;background:#EBD6A8`; document.body.append(c); const ctx = c.getContext(`2d`); const S = window.__S; window.__ROWS.forEach((row, j) => row.forEach((slot, i) => { const d = ART[slot]; ctx.save(); ctx.translate(window.__X0 + i * window.__DX, window.__Y0 + j * window.__DY); const g = makeDraw(ctx, S); for (let x = 0; x < d.w; x++) for (let y = 0; y < d.d; y++) g.poly(tileDiamond(x, y), `#E3CFA0`); for (const [a, b, w, dd, h] of d.shadows) groundShadow(g, a, b, w, dd, h); d.draw(g, 0, 0); ctx.restore(); })); })()'
$ladder1 = 'window.__S = 2; window.__X0 = 60; window.__Y0 = 70; window.__DX = 130; window.__DY = 0; window.__ROWS = [[`house.t1`, `house.t2`, `house.t3`, `house.t4`, `house.t5`, `house.t6`, `house.t7`, `house.t8`, `house.t9`]]; ' + $sheet
$ladder2 = 'window.__S = 4; window.__X0 = 160; window.__Y0 = 170; window.__DX = 310; window.__DY = 0; window.__ROWS = [[`house.t6`, `house.t7`, `house.t8`, `house.t9`]]; ' + $sheet
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7' -Out docs/superpowers/notes/screenshots/raw/s2-t09-ladder-z1.png -Width 1280 -Height 200 -BudgetMs 300 -Eval $ladder1
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7' -Out docs/superpowers/notes/screenshots/raw/s2-t09-ladder-z2.png -Width 1280 -Height 420 -BudgetMs 300 -Eval $ladder2
$town = '(async () => { while (!window.__thebes) await new Promise((r) => setTimeout(r, 100)); const t = window.__thebes; const W = await import(`./src/sim/world.js`); const n = t.world.size; const free = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1) return false; const i = y * n + x; if (t.world.occ[i] || t.world.road[i]) return false; } return true; }; const cx = Math.round(t.cam.x), cy = Math.round(t.cam.y); let o = null; for (let r = 0; r < 20 && !o; r++) for (let dy = -r; dy <= r && !o; dy++) for (let dx = -r; dx <= r && !o; dx++) if (free(cx + dx - 6, cy + dy - 2, 12, 4)) o = { x: cx + dx - 6, y: cy + dy - 2 }; const put = (type, x, y, extra) => { const b = W.makeBuilding(t.world, type, o.x + x, o.y + y); Object.assign(b, extra); W.insertBuilding(t.world, b); }; put(`house`, 0, 0, { tier: 4, residents: 16 }); put(`house`, 1, 0, { tier: 5, residents: 22 }); put(`house`, 0, 1, { tier: 5, residents: 22 }); put(`house`, 1, 1, { tier: 5, residents: 22 }); [6, 7, 8, 9].forEach((tier, k) => put(`house`, 2 + 2 * k, 0, { tier, residents: 100, w: 2, d: 2 })); [9, 8, 7, 6].forEach((tier, k) => put(`house`, 2 + 2 * k, 2, { tier, residents: 100, w: 2, d: 2 })); put(`house`, 0, 2, { tier: 5, residents: 22 }); put(`house`, 1, 3, { tier: 5, residents: 22 }); t.cam.x = o.x + 6; t.cam.y = o.y + 2; t.cam.zoom = window.__Z; t.world.roadVersion++; })()'
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7' -Out docs/superpowers/notes/screenshots/raw/s2-t09-town-z1.png -Width 1280 -Height 800 -BudgetMs 1500 -Eval ('window.__Z = 1; ' + $town)
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7' -Out docs/superpowers/notes/screenshots/raw/s2-t09-town-z2.png -Width 1280 -Height 800 -BudgetMs 1500 -Eval ('window.__Z = 2; ' + $town)
```

What to look for:
- The ladder at zoom 1 (`s2-t09-ladder-z1.png`) reads left to right as nine distinct homes: the Townhouse is the tallest 1×1, a slim white tower with teal and red bands and a teal striped awning on top; Manor to Estate are wide 2×2 compounds that grow taller.
- Each big home shows its tell at zoom 1 without zooming: a brown timber pergola with a vine over the blue roof mat (all four), a green planter of shrubs and flowers on the annexe in front of its awning (Fine manor and up), red and teal bands under the parapet (Villa), gold, teal and red bands, a pink flag and a turquoise pool on the main roof (Estate). The annexe awnings run orange, green, teal, purple.
- At zoom 2 (`s2-t09-ladder-z2.png`) the pergola's six slats and their shadow stripes on the mat are distinct, the roof garden's flowers (red, gold, white, pink) show, nothing on one patch of roof hides another's tell, and the whitewash keeps its cool lavender shaded faces as in the mock-up.
- In the game (`s2-t09-town-*.png`), the street sorts correctly in depth: a nearer home's walls cover the one behind, the 2×2 homes' palms and courtyard walls sit inside their footprints, and the ground shadows fall to the right in two soft violet layers.

- [ ] **Step 7: Full suite**

```powershell
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED`.

- [ ] **Step 8: Commit**

```powershell
git add src/render/art/housing.js tests/render/housingTiersArt.test.js tests/all.js sw-files.js
git commit -m @'
Draw housing tiers 5 to 9, each with its own roof tell

The Townhouse and the four 2x2 homes are ported from the approved mock-up
(H5 and big), and each tier adds one tell readable at phone zoom: a striped
awning, a vine pergola, a roof garden, painted parapet bands, and a flag
with a roof pool.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 10: Art: farms, orchard, garden, statue, booth

**Files:**
- Modify: `src/render/art/services.js` (crop tiles for every crop, a shared fenced field and farmhouse, barley and flax farms, the fig orchard, garden, statue and booth, their slots and emblems)
- Modify: `src/render/art/palette.js` (`INDUSTRY_TINT`)
- Modify: `src/render/art/stages.js` (`FARM_TYPES`; `farmStage` serves every farm)
- Modify: `src/render/art/registry.js` (`slotFor` names stage slots for every farm)
- Create: `tests/render/farmsDecorArt.test.js`
- Modify: `tests/all.js`, `tests/render/servicesArt.test.js`, `tests/render/lifeArt.test.js`

**Interfaces:**
- Consumes: Task 2's `BUILDINGS.garden`, `statue`, `booth` (1×1) and `farm_fig`, `farm_barley`, `farm_flax` (2×2, `terrain: 'fertile'`); `CATEGORY_TINT.industry` from `src/data/ui.js` (only in a test).
- Produces: slots `garden`, `statue`, `booth`, and for each of `farm_fig`, `farm_barley`, `farm_flax` the plain slot plus `.g0` … `.g3` (the grain farm's slots unchanged); `FARM_TYPES = ['farm_grain', 'farm_fig', 'farm_barley', 'farm_flax']` in `stages.js`; `slotFor(b, world)` returns `${type}.g${farmStage(world, b)}` for every farm with a world and the plain type without one; `PLAIN_STAGE` gains `farm_barley: 3, farm_flax: 3, farm_fig: 3` (so cards show ripe barley, flax in flower and a fig orchard in fruit); `SERVICE_EMBLEM` gains `farm_fig` (the grain farm's green), `farm_barley` and `farm_flax` (`INDUSTRY_TINT`), `booth` (`PINK`); exports `cropTile(g, x, y, stage, crop = 'grain')`, `CROPS`, `farmField`, `farmBarley`, `farmFlax`, `figOrchard`, `figTree`, `garden`, `seatedStatue`, `booth`, `FARM_DRAW`; `palette.js` exports `INDUSTRY_TINT = '#8E7470'`.

The look (spec 5.1: "fields with distinct crops (green grain, golden barley, flax with blue flowers)"):
- Barley and flax farms are the grain farm's fenced field and thatched farmhouse with their own crop: fallow furrows (0), sprouts (1), growing barley blue-green with whiskered ears or green flax in bud (2), and the mock-up's golden barley or blue-flowered flax (3), the back row a stage ahead as on the grain farm. Their pennants fly the industry tint.
- The fig orchard: eight fig trees in rows on grassy loam inside the reed fence: bare branches when idle (0), young pale leaves (1), full green canopies (2), purple figs and two full baskets by the farmhouse (3).
- Garden (1×1): the mock-up's flower bed with a small pool in its front corner, two clipped shrubs and a young palm.
- Statue (1×1): a seated figure in warm sandstone on a whitewashed plinth banded in teal and gold, after the mock-up's colossus: a throne, a blue-striped headcloth, a gold collar and a gold crown.
- Booth (1×1): a timber stage with a teal band, an orange-and-gold backdrop under a red striped awning, a dancer and a drum on the open front, a rug for the crowd, a pink pennant.

The grain farm, granary, bazaar, well and temple draw pixel for pixel as before (checked by hashing both versions).

- [ ] **Step 1: Write the failing tests**

Create `tests/render/farmsDecorArt.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import {
  garden, seatedStatue, booth, figOrchard, farmBarley, farmFlax, farmGrain, cropTile, CROPS, FARM_DRAW, PLAIN_STAGE, SERVICE_EMBLEM,
} from '../../src/render/art/services.js';
import { farmStage, FARM_TYPES } from '../../src/render/art/stages.js';
import { ART, boundsFor, slotFor } from '../../src/render/art/registry.js';
import { INDUSTRY_TINT, GOLDC, PINK } from '../../src/render/art/palette.js';
import { CATEGORY_TINT } from '../../src/data/ui.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { drawThumb } from '../../src/ui/thumbs.js';
import { p, U } from '../../src/render/iso.js';
import { makeCanvas, pixelAt, canvasHash, nearColour } from '../helpers/canvas.js';

// Drawn alone at scale 2 (zoom 1 on a 1x screen), the footprint origin at canvas (160, 110), as the other art tests do.
const OX = 160, OY = 110;
function drawAlone(fn) {
  const c = makeCanvas(320, 260);
  const ctx = c.getContext('2d');
  ctx.translate(OX, OY);
  fn(makeDraw(ctx, 2), 0, 0);
  return c;
}
const at = (c, q) => pixelAt(c, OX + q[0] * 2, OY + q[1] * 2);
const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 3) for (let y = 0; y < c.height; y += 3) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};
// How many pixels pass a colour test, over the whole canvas.
const count = (c, test) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && test(d[i], d[i + 1], d[i + 2])) n++;
  return n;
};
// Mean colour over a 7 x 7 grid inside tile (tx, ty), clear of the fence along the field's back edges.
function tileMean(c, tx, ty) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let u = 0.2; u < 0.85; u += 0.1) {
    for (let v = 0.2; v < 0.85; v += 0.1) {
      const px = at(c, p(tx + u, ty + v));
      r += px[0]; g += px[1]; b += px[2]; n++;
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}
const NEW_TYPES = ['garden', 'statue', 'booth', 'farm_fig', 'farm_barley', 'farm_flax'];
const blue = (r, g, b) => b > r + 40 && b > g + 20;                   // flax flowers
const purple = (r, g, b) => r > 80 && b > 70 && g < r - 25 && g < b - 15;   // ripe figs
const leafy = (r, g, b) => g > r + 25 && g > b + 25;                  // fig leaves (and a few grass tufts)

describe('farms, orchard, garden, statue and booth art', () => {
  it('draws the garden, statue and booth with ink and a look of their own', () => {
    const hashes = new Set();
    for (const fn of [garden, seatedStatue, booth]) {
      const c = drawAlone(fn);
      expect(inked(c)).toBeGreaterThan(50);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(3);
  });
  it('registers every new type with its real footprint, bounds from its height and a pennant colour', () => {
    for (const type of NEW_TYPES) {
      const e = ART[type];
      expect([type, e.w, e.d]).toEqual([type, BUILDINGS[type].w, BUILDINGS[type].d]);
      expect([type, e.bounds]).toEqual([type, boundsFor(e.w, e.d, e.height)]);
      for (const s of e.shadows) expect(s.length).toBe(5);
      expect(typeof e.draw).toBe('function');
    }
    for (const type of ['farm_fig', 'farm_barley', 'farm_flax', 'booth']) expect(typeof SERVICE_EMBLEM[type]).toBe('string');
    expect(INDUSTRY_TINT).toBe(CATEGORY_TINT.industry);
    expect([SERVICE_EMBLEM.farm_barley, SERVICE_EMBLEM.farm_flax]).toEqual([INDUSTRY_TINT, INDUSTRY_TINT]);   // industry farms fly its tint
    expect(SERVICE_EMBLEM.farm_fig).toBe(SERVICE_EMBLEM.farm_grain);                                      // food farms fly the grain farm's green
  });
  it('grows every farm through four stages with the same slot shape, each stage drawn differently', () => {
    expect(FARM_TYPES).toEqual(['farm_grain', 'farm_fig', 'farm_barley', 'farm_flax']);
    expect(Object.keys(FARM_DRAW).sort()).toEqual([...FARM_TYPES].sort());
    for (const type of FARM_TYPES) {
      const plain = ART[type];
      const hashes = new Set();
      for (let s = 0; s < 4; s++) {
        const e = ART[`${type}.g${s}`];
        expect([type, s, e.w, e.d, e.height, e.bounds, e.shadows]).toEqual([type, s, plain.w, plain.d, plain.height, plain.bounds, plain.shadows]);
        hashes.add(canvasHash(drawAlone((g) => e.draw(g, 0, 0))));
      }
      expect([type, hashes.size]).toEqual([type, 4]);
      expect(canvasHash(drawAlone((g) => plain.draw(g, 0, 0)))).toBe(canvasHash(drawAlone((g) => ART[`${type}.g${PLAIN_STAGE[type]}`].draw(g, 0, 0))));
    }
    expect(PLAIN_STAGE).toEqual({ granary: 3, bazaar: 2, farm_grain: 2, farm_barley: 3, farm_flax: 3, farm_fig: 3 });
    // every fertile-land producer in the data is a farm with stage slots
    for (const [type, b] of Object.entries(BUILDINGS)) if (b.terrain === 'fertile') expect([type, FARM_TYPES.includes(type)]).toEqual([type, true]);
  });
  it('names a stage slot for every farm when the world is given, and its plain slot otherwise', () => {
    const world = { day: 3 };
    for (const type of FARM_TYPES) {
      const farm = { type, id: 1, staff: 8, paused: false, blocked: null };
      expect(slotFor(farm, world)).toBe(`${type}.g${farmStage(world, farm)}`);
      expect(slotFor(farm, world)).toBe(`${type}.g2`);                               // (3 + 17) % 60 = 20: growing
      expect(slotFor({ ...farm, staff: 0 }, world)).toBe(`${type}.g0`);              // idle: fallow, or bare trees
      expect(slotFor(farm)).toBe(type);
    }
    for (const type of ['garden', 'statue', 'booth']) expect(slotFor({ type })).toBe(type);
  });
  it('gives each crop its own look: golden barley, flax in blue flower, figs ripening on the trees', () => {
    expect(CROPS).toEqual(['grain', 'barley', 'flax']);
    // barley: blue-green while growing, golden when ripe (the front tiles show the stage itself)
    const barley = (s) => tileMean(drawAlone((g) => farmBarley(g, 0, 0, s)), 0, 1);
    expect(barley(2).g).toBeGreaterThan(barley(2).r);
    expect(barley(3).r).toBeGreaterThan(180);
    expect(barley(3).b).toBeLessThan(140);
    // flax: no flowers while sprouting, a few once the back row is in flower, the most when every tile is
    const flowers = (s) => count(drawAlone((g) => farmFlax(g, 0, 0, s)), blue);
    expect(flowers(1)).toBe(0);
    expect(flowers(2)).toBeGreaterThan(10);
    expect(flowers(3)).toBeGreaterThan(flowers(2));
    // grain keeps its Stage 1 look: green growing, golden ripe
    const grain = (s) => tileMean(drawAlone((g) => farmGrain(g, 0, 0, s)), 0, 1);
    expect(grain(2).g).toBeGreaterThan(grain(2).r);
    expect(grain(3).r).toBeGreaterThan(175);
    // a ripe field of each crop differs from the others
    expect(new Set(CROPS.map((k) => canvasHash(drawAlone((g) => cropTile(g, 0, 0, 3, k))))).size).toBe(3);
    // figs: bare branches when idle, leaves once growing, purple fruit when ripe (and full baskets at the farmhouse)
    const orchard = (s) => drawAlone((g) => figOrchard(g, 0, 0, s));
    expect(count(orchard(2), leafy)).toBeGreaterThan(5 * Math.max(1, count(orchard(0), leafy)));
    expect(count(orchard(1), purple)).toBe(0);
    expect(count(orchard(2), purple)).toBeGreaterThan(10);                    // the back row is a stage ahead
    expect(count(orchard(3), purple)).toBeGreaterThan(count(orchard(2), purple));
  });
  it('crowns the statue in gold and puts the booth under a red awning with a pink pennant', () => {
    const statue = drawAlone(seatedStatue);
    expect(nearColour(at(statue, U(p(0.5, 0.4725), 19.7)), GOLDC[1], 30)).toBe(true);
    const b = drawAlone(booth);
    const awning = at(b, U(p(0.5, 0.27), 14.8));
    expect(awning[0] > 180 && awning[1] < 120).toBe(true);
    const q = U(p(0.86, 0.12), 14.8);
    expect(nearColour(at(b, [q[0] + 2, q[1] - 4.5]), PINK, 12)).toBe(true);
  });
  it('draws a card picture for each new building', () => {
    for (const type of NEW_TYPES) {
      const c = drawThumb(document.createElement('canvas'), type, 1);
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      expect([type, n > 150]).toEqual([type, true]);
    }
  });
});
```

In `tests/all.js`, add this import directly after `import './render/servicesArt.test.js';`:

```js
import './render/farmsDecorArt.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "booth art"
```

Expected: `LOAD ERROR`: `src/render/art/services.js` does not provide an export named `garden` (or another of the new names), so nothing runs.

- [ ] **Step 3: Implement**

**`src/render/art/palette.js`**: add the industry tint after `LEAF3`.

Before:

```js
export const LEAF3 = '#3F7526';
```

After:

```js
export const LEAF3 = '#3F7526';
export const INDUSTRY_TINT = '#8E7470';   // the industry category's tint (CATEGORY_TINT.industry in data/ui.js), for its pennants
```

**`src/render/art/services.js`**, four edits.

(a) Replace the header comment and the imports.

Before:

```js
// Stage 1 service buildings, ported from the approved mock-up (well, granary, bazaar, temple, fieldTile).
// The grain farm is new: a fenced 2x2 field of grain rows with a small farmhouse in the near corner.
// Each service carries a small pennant in its emblem colour (spec 5.3) so it reads at phone zoom.
// Granaries and bazaars show their stock and farms their crop (early-game pass 2.2, 2.3): each draws a stage
// chosen by stages.js, and SERVICE_ART registers one slot per stage beside the plain type slot.
import { box, tb, qd, crs, door, fence, pots, awn, col, tile, p, U, quad, hs } from './primitives.js';
import {
  WASH, MUD2, STONE, THATCH, GOLDC, TEAL, TEAL_DARK, BLUE, RED, GOLD, PINK, ORANGE, GREEN, GREEN_DARK, LEAF2, WOOD, DOOR,
  SHADOW, TERRAIN,
} from './palette.js';
```

After:

```js
// Service buildings, farms and the Stage 2 homes' neighbours, ported from the approved mock-up where it has them
// (well, granary, bazaar, temple, fieldTile, gardenT, the colossus) and drawn in its style where it does not.
// Farms are a fenced 2x2 of crop tiles (grain, barley, flax) or fig trees with a small farmhouse in the near corner.
// Each service and farm carries a small pennant in its emblem colour (spec 5.3) so it reads at phone zoom.
// Granaries and bazaars show their stock and farms their crop (early-game pass 2.2, 2.3): each draws a stage
// chosen by stages.js, and SERVICE_ART registers one slot per stage beside the plain type slot.
import { box, tb, qd, crs, door, fence, pots, awn, col, rug, bed, pool, tile, p, U, quad, hs } from './primitives.js';
import { palmAt, tufts } from './nature.js';
import { fig } from './figures.js';
import {
  WASH, WASH2, MUD2, STONE, THATCH, GOLDC, TEAL, TEAL_DARK, BLUE, RED, RED_DARK, GOLD, PINK, ORANGE, GREEN, GREEN_DARK,
  LEAF, LEAF2, LEAF3, TRUNK, WOOD, DOOR, SHADOW, TERRAIN, INDUSTRY_TINT,
} from './palette.js';
```

(`nature.js` and `figures.js` import only `primitives.js` and `palette.js`: no cycle.)

(b) Give the new types their pennant colours.

Before:

```js
export const SERVICE_EMBLEM = { well: BLUE, farm_grain: LEAF2, granary: GREEN, bazaar: RED, temple: GOLD };
```

After:

```js
export const SERVICE_EMBLEM = {
  well: BLUE, farm_grain: LEAF2, granary: GREEN, bazaar: RED, temple: GOLD,
  farm_fig: LEAF2, farm_barley: INDUSTRY_TINT, farm_flax: INDUSTRY_TINT, booth: PINK,
};
```

(c) The field tile now serves every crop.

Before:

```js
// A field tile: crop colour with straight rows of stalks. Only 'grain' is used in Stage 1.
```

After:

```js
// A field tile: crop colour with straight rows of stalks: green grain, golden barley, or flax with blue flowers.
```

(d) Replace everything from the comment line `// One field tile of the grain farm at a growth stage: 0 fallow (ploughed furrows), 1 sprouting, 2 green` to the end of the file (the old `cropTile`, `farmGrain`, `PLAIN_STAGE`, the slot constants, `SERVICE_ART` and the three stage loops) with:

```js
// One field tile at a growth stage: 0 fallow (ploughed furrows), 1 sprouting, 2 growing, 3 ripe. Each crop has its
// own look (spec 5.1): grain grows green (fieldTile) and ripens golden; barley grows blue-green and ripens into the
// mock-up's golden barley; flax grows as green stalks and ripens into the mock-up's blue flowers (both fieldTile).
const LOAM = '#8A6A42', FURROW = '#6E5234', RIDGE = '#B49268', SPROUT = '#7FB04A', SPROUT_TIP = '#B4D86A';
const RIPE = '#D4AE4E', RIPE_STALK = '#A88E3A', RIPE_HEAD = '#F2DE90';
const GROWING = {
  barley: { tile: '#A4B85C', stalk: '#6E8A34', tip: '#D2DE8E' },
  flax: { tile: '#7FA850', stalk: '#4F7A2C', tip: '#B4D488' },
};
export const CROPS = ['grain', 'barley', 'flax'];
export function cropTile(g, x, y, stage, crop = 'grain') {
  if (crop === 'grain' && stage === 2) { fieldTile(g, x, y, 'grain'); return; }
  if (crop !== 'grain' && stage === 3) { fieldTile(g, x, y, crop); return; }
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
  if (stage === 2) {
    const look = GROWING[crop];
    tile(g, x, y, look.tile, edge);
    for (let v = 0.14; v < 0.95; v += 0.18) {
      for (let u = 0.08; u < 0.98; u += 0.11) {
        const q = p(x + u, y + v), hh = 2 + hs(x * 7 + u, y * 3 + v, 1) * 1.2;
        g.line(q, [q[0] + 0.1, q[1] - hh], look.stalk, 0.6);
        if (crop === 'barley') g.line([q[0] + 0.1, q[1] - hh], [q[0] + 1, q[1] - hh - 0.8], look.tip, 0.6);   // a whiskered ear
        else g.circ([q[0], q[1] - hh], 0.45, look.tip);                                                        // a closed bud
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

// The small thatched farmhouse every farm keeps in its near corner, its yard (pots by the door, unless `yard` draws
// something else) and its pennant.
function farmhouse(g, X, Y, emblem, yard = () => pots(g, p(X + 1.2, Y + 1.78), 2)) {
  const a = X + 1.4, b = Y + 1.4, w = 0.52;
  const F = box(g, a, b, w, w, 5, 0, MUD2);
  crs(g, F, 5, '#9C7A54', 2.2);
  door(g, F, 0.34, 0.6, 3.6);
  tb(g, a - 0.06, b - 0.06, w + 0.12, w + 0.12, 4.5, 5, 0.3, THATCH);
  yard();
  pennant(g, U(p(a + w, b + 0.06), 0), 9, emblem);
}

// A fenced 2x2 field of one crop with the farmhouse in the near corner. `stage` (farmStage): 0 fallow,
// 1 sprouting, 2 growing, 3 ripe; the back row (the two tiles at j = 0) runs one stage ahead, capped at ripe, so a
// working field shows two stages at once.
export function farmField(g, X, Y, stage, crop, emblem) {
  const back = stage === 0 ? 0 : Math.min(3, stage + 1);
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) cropTile(g, X + i, Y + j, j === 0 ? back : stage, crop);
  fence(g, X + 0.02, Y + 0.02, 1.96, 0.06);
  fence(g, X + 0.02, Y + 0.02, 0.06, 1.96);
  fence(g, X + 0.02, Y + 1.92, 1.3, 0.06);
  fence(g, X + 1.92, Y + 0.02, 0.06, 1.3);
  farmhouse(g, X, Y, emblem);
}

// Grain farm (Stage 1), barley farm and flax farm: the same fenced field with their own crop and pennant.
export function farmGrain(g, X, Y, stage = 2) { farmField(g, X, Y, stage, 'grain', SERVICE_EMBLEM.farm_grain); }
export function farmBarley(g, X, Y, stage = 3) { farmField(g, X, Y, stage, 'barley', SERVICE_EMBLEM.farm_barley); }
export function farmFlax(g, X, Y, stage = 3) { farmField(g, X, Y, stage, 'flax', SERVICE_EMBLEM.farm_flax); }

// Fig orchard: eight fig trees in rows on grassy loam inside the reed fence, and the farmhouse in the near corner.
// `stage` (farmStage): 0 bare branches (not working), 1 young leaves, 2 full green canopies, 3 ripe purple figs with
// full baskets by the farmhouse. The back row of trees runs a stage ahead, as on the fields.
const ORCHARD_FLOOR = '#9C8656';
const FIG = '#6B2F5E', FIG_LIGHT = '#A0588E', BARK = '#8A7058';
const ORCHARD_TREES = [[0.42, 0.4], [1.0, 0.36], [0.38, 1.0], [0.98, 0.98], [1.58, 0.42], [0.44, 1.6], [1.6, 0.92], [1.02, 1.58]];
export function figTree(g, gx, gy, stage) {
  const c = p(gx, gy), top = [c[0], c[1] - 4];
  g.ell([c[0] + 3, c[1] + 0.6], 6, 2, SHADOW, { alpha: 0.14 });
  g.line(c, top, TRUNK, 1.5);
  if (stage === 0) {
    for (const [dx, dy] of [[-3.6, -3.8], [3.2, -4.4], [0.4, -5.6], [-1.6, -2.8], [2, -2.2]]) g.line(top, [top[0] + dx, top[1] + dy], BARK, 0.8);
    return;
  }
  const r = stage === 1 ? 2.6 : 4.4, m = [top[0], top[1] - r * 0.6];
  const leaves = stage === 1 ? ['#8DBE4E', '#A6CC5E', '#B8D878', '#A6CC5E'] : [LEAF3, LEAF, LEAF2, '#86B64E'];
  [[-0.55, 0.15, 0.75], [0.55, 0.2, 0.75], [0, -0.3, 0.8], [-0.15, -0.45, 0.4]].forEach(([dx, dy, k], i) => {
    g.circ([m[0] + dx * r, m[1] + dy * r], r * k, leaves[i]);
  });
  if (stage === 3) {
    for (const [dx, dy] of [[-0.6, 0.3], [0.5, 0.45], [0.1, -0.1], [-0.25, -0.55], [0.7, -0.15], [-0.85, -0.2]]) {
      g.circ([m[0] + dx * r, m[1] + dy * r], 0.8, FIG);
      g.circ([m[0] + dx * r - 0.25, m[1] + dy * r - 0.25], 0.3, FIG_LIGHT);
    }
  }
}
export function figOrchard(g, X, Y, stage = 3) {
  const back = stage === 0 ? 0 : Math.min(3, stage + 1);
  const edge = { stroke: TERRAIN.fieldEdge, strokeWidth: 0.6, strokeAlpha: 0.35 };
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    tile(g, X + i, Y + j, ORCHARD_FLOOR, edge);
    tufts(g, X + i, Y + j, 5, 11);
  }
  fence(g, X + 0.02, Y + 0.02, 1.96, 0.06);
  fence(g, X + 0.02, Y + 0.02, 0.06, 1.96);
  for (const [u, v] of ORCHARD_TREES) figTree(g, X + u, Y + v, v < 0.5 ? back : stage);
  fence(g, X + 0.02, Y + 1.92, 1.3, 0.06);
  fence(g, X + 1.92, Y + 0.02, 0.06, 1.3);
  const baskets = () => { heapedBasket(g, p(X + 1.08, Y + 1.8), FIG); heapedBasket(g, p(X + 1.3, Y + 1.84), FIG_LIGHT); };
  farmhouse(g, X, Y, SERVICE_EMBLEM.farm_fig, stage === 3 ? baskets : undefined);
}

// Garden (1x1): a flower bed (the mock-up's gardenT) with a small pool in its front corner, two clipped shrubs and
// a young palm at the back.
export function garden(g, x, y) {
  bed(g, x + 0.1, y + 0.1, 0.8, 0.8);
  pool(g, x + 0.2, y + 0.56, 0.36, 0.28);
  palmAt(g, x + 0.66, y + 0.34, 0.6);
  for (const [u, v] of [[0.78, 0.74], [0.24, 0.3]]) {
    const q = p(x + u, y + v);
    g.ell([q[0] + 1.5, q[1] + 0.4], 2.6, 1, SHADOW, { alpha: 0.15 });
    g.circ(U(q, 2), 2.2, LEAF3, { outline: true });
    g.circ(U(q, 2.6), 1.4, LEAF2);
  }
}

// Statue (1x1): a seated figure in warm sandstone on a whitewashed plinth banded in teal, in the manner of the
// mock-up's colossus: a throne behind, knees and lap in front, arms on the knees, a head in a blue-striped
// headcloth, a gold collar and a gold crown.
const SANDSTONE = ['#E8CC94', '#D2AE72', '#A88E7E'];
export function seatedStatue(g, x, y) {
  const P = box(g, x + 0.2, y + 0.2, 0.6, 0.6, 4, 0, STONE);
  qd(g, P.L, 0, 1, 1.4, 2.4, TEAL);
  qd(g, P.R, 0, 1, 1.4, 2.4, TEAL_DARK);
  qd(g, P.L, 0, 1, 3.4, 4, GOLD);
  qd(g, P.R, 0, 1, 3.4, 4, GOLDC[2]);
  const Th = box(g, x + 0.3, y + 0.28, 0.4, 0.16, 9, 4, SANDSTONE);           // the throne's back
  qd(g, Th.R, 0, 1, 6.5, 7.5, BLUE, { alpha: 0.8 });
  const Lg = box(g, x + 0.36, y + 0.44, 0.28, 0.26, 4.4, 4, SANDSTONE);        // shins and lap
  qd(g, Lg.L, 0.48, 0.52, 0, 4.4, SANDSTONE[2], { alpha: 0.5 });
  const Tr = box(g, x + 0.38, y + 0.36, 0.24, 0.16, 6, 8.4, SANDSTONE);       // body
  qd(g, Tr.L, 0, 1, 4.6, 6, GOLD);                                             // the gold collar
  for (const u of [0.33, 0.6]) box(g, x + u, y + 0.44, 0.06, 0.24, 1.4, 8.4, SANDSTONE, 0);   // forearms on the knees
  const Hc = box(g, x + 0.4, y + 0.36, 0.2, 0.15, 4.2, 14, SANDSTONE);         // the headcloth, striped blue
  for (let s = 0.4; s < 4; s += 1.1) {
    qd(g, Hc.L, 0, 0.22, s, s + 0.55, BLUE);
    qd(g, Hc.L, 0.78, 1, s, s + 0.55, BLUE);
    qd(g, Hc.R, 0, 1, s, s + 0.55, BLUE, { alpha: 0.85 });
  }
  qd(g, Hc.L, 0.3, 0.7, 0.6, 3.4, SANDSTONE[1]);                               // the face
  qd(g, Hc.L, 0.36, 0.44, 2.2, 2.7, DOOR);
  qd(g, Hc.L, 0.56, 0.64, 2.2, 2.7, DOOR);
  box(g, x + 0.48, y + 0.5, 0.04, 0.04, 2, 12.4, SANDSTONE, 0);                // the beard
  tb(g, x + 0.43, y + 0.38, 0.14, 0.11, 3, 18.2, 0.035, GOLDC);                // the crown
}

// Booth (1x1): a low timber stage with a painted backdrop under a red-and-gold striped awning at the back, a dancer
// and a drum on the open front, a rug for the crowd and a pink pennant.
const PLANK = ['#D8B47A', '#C09A62', '#9C8072'];
export function booth(g, x, y) {
  rug(g, x + 0.1, y + 0.78, 0.5, 0.18, 0, RED, '#F2D7A8', GOLD);
  const F = box(g, x + 0.16, y + 0.14, 0.68, 0.6, 3, 0, PLANK);
  for (let u = 0.2; u < 1; u += 0.2) g.line(F.L(u, 0.4), F.L(u, 2.6), '#9C7A54', 0.4, 0.6);
  qd(g, F.L, 0, 1, 2.2, 2.8, TEAL);
  qd(g, F.R, 0, 1, 2.2, 2.8, TEAL_DARK);
  const B = box(g, x + 0.18, y + 0.16, 0.64, 0.08, 9, 3, WASH2);               // the backdrop, hung with cloth
  qd(g, B.L, 0.1, 0.9, 1, 8, ORANGE);
  for (const u of [0.25, 0.5, 0.75]) qd(g, B.L, u - 0.04, u + 0.04, 1, 8, GOLD);
  awn(g, x + 0.14, y + 0.12, 0.72, 0.3, 13.6, RED, RED_DARK, GOLD);
  g.ell(U(p(x + 0.72, y + 0.52), 4.4), 1.7, 1, '#B07A48', { outline: true });  // a drum
  g.ell(U(p(x + 0.72, y + 0.52), 5.4), 1.6, 0.75, '#F2E2BC');
  fig(g, x + 0.46, y + 0.56, 'woman', 3, 0.85);
  pennant(g, U(p(x + 0.86, y + 0.12), 14.8), 6, SERVICE_EMBLEM.booth);
}

// The plain type slots are what cards and assets show: a full granary, a piled bazaar, a green grain field, ripe
// barley, flax in flower and a fig orchard in fruit.
export const PLAIN_STAGE = { granary: 3, bazaar: 2, farm_grain: 2, farm_barley: 3, farm_flax: 3, farm_fig: 3 };

const FARM_SLOT = { w: 2, d: 2, height: 12, bounds: boundsFor(2, 2, 12), shadows: [[1.4, 1.4, 0.52, 0.52, 9]] };
const GRANARY_SLOT = { w: 2, d: 2, height: 22, bounds: boundsFor(2, 2, 22), shadows: [[0.1, 0.1, 1.8, 1.8, 16]] };
const BAZAAR_SLOT = {
  w: 2, d: 2, height: 16, bounds: boundsFor(2, 2, 16),
  shadows: [[0.12, 0.12, 0.76, 0.76, 9], [1.12, 0.12, 0.76, 0.76, 9], [0.12, 1.12, 0.76, 0.76, 9], [1.12, 1.12, 0.76, 0.76, 9]],
};
// Every farm's drawing by type, each taking (g, x, y, stage); slots are registered for each below.
export const FARM_DRAW = { farm_grain: farmGrain, farm_barley: farmBarley, farm_flax: farmFlax, farm_fig: figOrchard };

export const SERVICE_ART = {
  well: { w: 1, d: 1, height: 18, bounds: boundsFor(1, 1, 18), shadows: [[0.28, 0.28, 0.44, 0.44, 6]], draw: well },
  granary: { ...GRANARY_SLOT, draw: (g, x, y) => granary(g, x, y, PLAIN_STAGE.granary) },
  bazaar: { ...BAZAAR_SLOT, draw: (g, x, y) => bazaar(g, x, y, PLAIN_STAGE.bazaar) },
  temple: { w: 2, d: 2, height: 40, bounds: boundsFor(2, 2, 40), shadows: [[0.25, 0.2, 1.5, 1, 15], [0.1, 1.2, 1.8, 0.7, 23]], draw: temple },
  garden: { w: 1, d: 1, height: 16, bounds: boundsFor(1, 1, 16), shadows: [], draw: garden },
  statue: { w: 1, d: 1, height: 22, bounds: boundsFor(1, 1, 22), shadows: [[0.2, 0.2, 0.6, 0.6, 4], [0.3, 0.28, 0.4, 0.42, 16]], draw: seatedStatue },
  booth: { w: 1, d: 1, height: 21, bounds: boundsFor(1, 1, 21), shadows: [[0.16, 0.14, 0.68, 0.6, 3], [0.14, 0.12, 0.72, 0.3, 13]], draw: booth },
};
// One slot per stage, named as slotFor (registry.js) names them: granary.s0-s3, bazaar.s0-s2, and g0-g3 for every
// farm; each farm also keeps its plain type slot.
for (let s = 0; s < 4; s++) SERVICE_ART[`granary.s${s}`] = { ...GRANARY_SLOT, draw: (g, x, y) => granary(g, x, y, s) };
for (let s = 0; s < 3; s++) SERVICE_ART[`bazaar.s${s}`] = { ...BAZAAR_SLOT, draw: (g, x, y) => bazaar(g, x, y, s) };
for (const [type, draw] of Object.entries(FARM_DRAW)) {
  SERVICE_ART[type] = { ...FARM_SLOT, draw: (g, x, y) => draw(g, x, y, PLAIN_STAGE[type]) };
  for (let s = 0; s < 4; s++) SERVICE_ART[`${type}.g${s}`] = { ...FARM_SLOT, draw: (g, x, y) => draw(g, x, y, s) };
}
```

`farmGrain` keeps its name, signature and default stage, and its drawing order (crop tiles, fences, farmhouse, roof, pots, pennant) is unchanged, so its four stages hash exactly as before. `farmhouse`'s `yard` default draws the pots; the orchard passes its fig baskets instead at stage 3. `heapedBasket` is the bazaar's helper, defined higher up in the same file.

**`src/render/art/stages.js`**, two edits.

Before:

```js
// Which drawing a building shows (early-game pass 2.2 and 2.3): granaries and bazaars by how full they are,
// grain farms by how far the crop has grown. Pure functions of the building (and, for farms, the game day);
```

After:

```js
// Which drawing a building shows (early-game pass 2.2 and 2.3): granaries and bazaars by how full they are,
// farms by how far the crop has grown. Pure functions of the building (and, for farms, the game day);
```

Before:

```js
// 0 fallow when the farm is not working (paused, unstaffed or blocked); otherwise 1 sprouting, 2 green,
// 3 golden, cycling over FARM_CYCLE_DAYS. The look only: production stays daily.
export function farmStage(world, b) {
```

After:

```js
// Every farm grows the same way, whatever its crop: grain, figs, barley, flax.
export const FARM_TYPES = ['farm_grain', 'farm_fig', 'farm_barley', 'farm_flax'];

// 0 fallow (bare trees in an orchard) when the farm is not working (paused, unstaffed or blocked); otherwise
// 1 sprouting, 2 growing, 3 ripe, cycling over FARM_CYCLE_DAYS. The look only: production stays daily.
export function farmStage(world, b) {
```

(`farmStage`'s body is unchanged: it never looked at the type.)

**`src/render/art/registry.js`**, two edits.

Before:

```js
import { granaryStage, bazaarStage, farmStage } from './stages.js';
```

After:

```js
import { granaryStage, bazaarStage, farmStage, FARM_TYPES } from './stages.js';
```

Before:

```js
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

After:

```js
// The art slot a building shows: houses by tier, granaries and bazaars by how full they are (stages.js), and
// farms by their crop's growth, which runs on the game day, so a farm needs the world (without one, its plain
// type slot). Everything else is its type.
export function slotFor(b, world = null) {
  if (b.type === 'house') return `house.t${b.tier}`;
  if (b.type === 'granary') return `granary.s${granaryStage(b)}`;
  if (b.type === 'bazaar') return `bazaar.s${bazaarStage(b)}`;
  if (FARM_TYPES.includes(b.type)) return world ? `${b.type}.g${farmStage(world, b)}` : b.type;
  return b.type;
}
```

Heights in the new slots are the top of the tallest drawn thing: the garden's palm (0.6 of a palm's 25), the statue's crown (18.2 + 3), the booth's pennant (14.8 + 6); every farm, the orchard included, keeps the grain farm's 12 (the pennant at 9 and the trees' crowns at about 11.5).

- [ ] **Step 4: Run the tests to see them pass**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "booth art"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "art bounds"
```

Expected: `7 passed, 0 failed` and `ALL PASSED`, then the bounds test passes with the 18 new slots in it. (Two existing tests now fail until Step 5: the service-slot count and `PLAIN_STAGE`.)

- [ ] **Step 5: Update the existing tests this breaks**

`grep -rn "SERVICE_ART\|PLAIN_STAGE\|farm_grain\|farmStage\|slotFor" tests/` finds two assertions that pin Stage 1's lists.

`tests/render/servicesArt.test.js`, in "registers every Stage 1 building type with its real footprint":

Before:

```js
    expect(Object.keys(SERVICE_ART).length).toBe(16);   // the five types plus 4 granary, 3 bazaar and 4 farm stage slots
```

After:

```js
    // well, granary, bazaar, temple, garden, statue and booth; 4 granary and 3 bazaar stage slots; four farms with a plain slot and 4 stage slots each
    expect(Object.keys(SERVICE_ART).length).toBe(34);
```

`tests/render/lifeArt.test.js`, in "registers every stage slot with its building's footprint, height and shadows, each drawn differently":

Before:

```js
    expect(PLAIN_STAGE).toEqual({ granary: 3, bazaar: 2, farm_grain: 2 });
```

After:

```js
    expect(PLAIN_STAGE).toEqual({ granary: 3, bazaar: 2, farm_grain: 2, farm_barley: 3, farm_flax: 3, farm_fig: 3 });
```

Nothing else changes: `servicesArt.test.js` still imports `farmGrain`, `fieldTile` and `SERVICE_EMBLEM` (all still exported, the grain farm drawn as before); `lifeArt.test.js`'s grain-farm stages, slot names and the renderer's `farm_grain.g${farmStage(w, farm)}` request are unchanged because `farmStage` and the grain farm's slots are; `cardThumbs.test.js` lists only the categories Stage 1 shows (Task 12 changes those).

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "art"
```

Expected: `ALL PASSED`.

- [ ] **Step 6: Visual check**

Run from `C:\dev\thebes`. `$sheet` draws slots on their own (the same string as Task 9's); `$place` puts buildings into a running game on the nearest free, dry patch of ground near the camera, staffed so the farms grow (each farm's stage follows its id, so neighbours differ), and moves the camera there.

```powershell
$sheet = '(async () => { const { ART } = await import(`./src/render/art/registry.js`); const { makeDraw } = await import(`./src/render/art/ctx.js`); const { tileDiamond } = await import(`./src/render/iso.js`); const { groundShadow } = await import(`./src/render/art/primitives.js`); const c = document.createElement(`canvas`); c.width = innerWidth; c.height = innerHeight; c.style.cssText = `position:fixed;left:0;top:0;z-index:9999;background:#EBD6A8`; document.body.append(c); const ctx = c.getContext(`2d`); const S = window.__S; window.__ROWS.forEach((row, j) => row.forEach((slot, i) => { const d = ART[slot]; ctx.save(); ctx.translate(window.__X0 + i * window.__DX, window.__Y0 + j * window.__DY); const g = makeDraw(ctx, S); for (let x = 0; x < d.w; x++) for (let y = 0; y < d.d; y++) g.poly(tileDiamond(x, y), `#E3CFA0`); for (const [a, b, w, dd, h] of d.shadows) groundShadow(g, a, b, w, dd, h); d.draw(g, 0, 0); ctx.restore(); })); })()'
$place = '(async () => { while (!window.__thebes) await new Promise((r) => setTimeout(r, 100)); const t = window.__thebes; const W = await import(`./src/sim/world.js`); const { BUILDINGS } = await import(`./src/data/buildings.js`); const { T } = await import(`./src/sim/terrain.js`); const n = t.world.size; const [AW, AH] = window.__AREA; const free = (x0, y0) => { for (let y = y0; y < y0 + AH; y++) for (let x = x0; x < x0 + AW; x++) { if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1) return false; const i = y * n + x; if (t.world.occ[i] || t.world.road[i] || t.world.terrain[i] === T.WATER) return false; } return true; }; const cx = Math.round(t.cam.x), cy = Math.round(t.cam.y); let o = null; for (let r = 0; r < 30 && !o; r++) for (let dy = -r; dy <= r && !o; dy++) for (let dx = -r; dx <= r && !o; dx++) if (free(cx + dx - (AW >> 1), cy + dy - (AH >> 1))) o = { x: cx + dx - (AW >> 1), y: cy + dy - (AH >> 1) }; for (const [type, x, y, extra] of window.__PUT) { const b = W.makeBuilding(t.world, type, o.x + x, o.y + y); b.staff = BUILDINGS[type].workers; Object.assign(b, extra || {}); W.insertBuilding(t.world, b); } t.cam.x = o.x + AW / 2; t.cam.y = o.y + AH / 2; t.cam.zoom = window.__Z; t.world.roadVersion++; })()'
$farms = 'window.__S = 4; window.__X0 = 150; window.__Y0 = 80; window.__DX = 310; window.__DY = 230; window.__ROWS = [[`farm_fig.g0`, `farm_fig.g1`, `farm_fig.g2`, `farm_fig.g3`], [`farm_barley.g0`, `farm_barley.g1`, `farm_barley.g2`, `farm_barley.g3`], [`farm_flax.g0`, `farm_flax.g1`, `farm_flax.g2`, `farm_flax.g3`]]; ' + $sheet
$decor = 'window.__S = 6; window.__X0 = 130; window.__Y0 = 170; window.__DX = 240; window.__DY = 0; window.__ROWS = [[`garden`, `statue`, `booth`, `well`, `house.t5`]]; ' + $sheet
$t10 = 'window.__AREA = [12, 5]; window.__PUT = [[`farm_fig`, 0, 0], [`farm_barley`, 2, 0], [`farm_flax`, 4, 0], [`farm_grain`, 6, 0], [`farm_fig`, 8, 0, { staff: 0 }], [`garden`, 0, 3], [`statue`, 1, 3], [`booth`, 2, 3], [`garden`, 3, 3], [`statue`, 4, 3], [`house`, 5, 3, { tier: 5, residents: 22 }], [`booth`, 6, 3], [`garden`, 7, 4]]; '
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7' -Out docs/superpowers/notes/screenshots/raw/s2-t10-farms-z2.png -Width 1280 -Height 720 -BudgetMs 300 -Eval $farms
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7' -Out docs/superpowers/notes/screenshots/raw/s2-t10-decor-z3.png -Width 1280 -Height 360 -BudgetMs 300 -Eval $decor
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7' -Out docs/superpowers/notes/screenshots/raw/s2-t10-game-z1.png -Width 1280 -Height 800 -BudgetMs 1500 -Eval ($t10 + 'window.__Z = 1; ' + $place)
```

What to look for:
- `s2-t10-farms-z2.png`, three rows of four stages. Orchard: bare grey-brown branches (g0); pale young leaves with the back row already green (g1); full round green canopies with purple figs on the back row (g2); figs on every tree and two baskets of figs by the farmhouse (g3). Barley: ploughed furrows, sprouts, a blue-green crop under a golden back row, all gold. Flax: furrows, sprouts, green stalks under a back row in blue flower, blue flowers throughout. The barley and flax farmhouses fly a mauve-brown pennant; the orchard's is the grain farm's green.
- `s2-t10-decor-z3.png`: the garden (flower bed, turquoise pool, two round shrubs, a palm), the statue (a sandstone figure with a blue-striped headcloth and a gold crown on a white plinth with teal and gold bands), the booth (a timber stage with a teal band, an orange-and-gold backdrop under a red striped awning, a dancer in white and a drum, a rug in front, a pink pennant), each matching the well and Townhouse beside them in light and line.
- `s2-t10-game-z1.png`, in the game at zoom 1: the four farms side by side read as four different crops at a glance (orchard trees, gold, blue, green), the unstaffed orchard on the right shows bare trees, and the garden, statue and booth are each recognisable on a single tile.

- [ ] **Step 7: Full suite**

```powershell
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED`.

- [ ] **Step 8: Commit**

```powershell
git add src/render/art/services.js src/render/art/palette.js src/render/art/stages.js src/render/art/registry.js tests/render/farmsDecorArt.test.js tests/render/servicesArt.test.js tests/render/lifeArt.test.js tests/all.js sw-files.js
git commit -m @'
Draw the fig orchard, barley and flax farms, garden, statue and booth

Every farm grows through the same four stages: barley ripens gold, flax
flowers blue, and fig trees go from bare branches to purple fruit. The
garden, a seated statue and a small stage with a dancer fill a tile each,
and industry farms fly a pennant in the industry tint.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 11: Art: workshops, storehouse and trading post

**Files:**
- Create: `src/render/art/industry.js` (clay pit, potter, brewery, weaver, gem mine, jeweller, storehouse in four stock stages, trading post; `INDUSTRY_ART`)
- Modify: `src/render/art/stages.js` (`storehouseStage`)
- Modify: `src/render/art/registry.js` (merge `INDUSTRY_ART`; `slotFor` names storehouse stages)
- Create: `tests/render/industryArt.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: Task 2's `BUILDINGS.clay_pit`, `potter`, `brewery`, `weaver`, `gem_mine`, `jeweller`, `storehouse` (`capacity: 800`, storing every non-food good), `trading_post` (all 2×2); `pennant` from `services.js` and `INDUSTRY_TINT` from `palette.js` (Task 10).
- Produces: slots `clay_pit`, `potter`, `brewery`, `weaver`, `gem_mine`, `jeweller`, `trading_post`, `storehouse` (the full yard, for cards and assets) and `storehouse.s0` … `storehouse.s3`; `storehouseStage(b)` in `stages.js` (0 empty, 1 under a third of `BUILDINGS.storehouse.capacity`, 2 under two thirds, 3 the rest, counting every good in `b.store`); `slotFor` returns `storehouse.s${storehouseStage(b)}` for a storehouse (no world needed, like the granary); exports `clayPit`, `potter`, `brewery`, `weaver`, `gemMine`, `jeweller`, `storehouse(g, x, y, stage = 3)`, `tradingPost`, `INDUSTRY_ART`, `PLAIN_STORE_STAGE` (3).

The look (spec 5.1's whitewash, lavender shade, striped reed canopies, orange pots and painted bands; the brief's contents), each with a mauve-brown pennant in the industry tint:
- Clay pit: a pit sunk into the ground (clipped to its rim, so its floor never spills past the near edge) with wet clay, puddles, a digger and a ladder; rows of mud bricks drying along two edges, a stack of dry bricks, a green-and-teal reed shade, baskets of clay, a water jar.
- Potter: a whitewashed workshop with a teal band and an orange roof mat; a tapered mud kiln glowing orange and gold at its stoke hole, three soft smoke puffs drifting up and right; the wheel under a red striped awning with the potter at it; rows of small pots and big jars.
- Brewery: a whitewashed brewhouse with a gold band, barley sacks on its roof and a ladder; three open vats of dark beer with foam; a rack of sealed beer jars; a heap of barley sacks.
- Weaver: a workshop with a blue band and a rug on its roof; an upright loom with a cloth banded blue, gold and red; a teal reed canopy with lengths of white, teal, gold and red cloth drying on a line in front of it; a striped linen cloth pegged out on a ground loom with the weaver kneeling at it; bales of flax.
- Gem mine: a rocky outcrop in strata (the mock-up's outcrop style) behind a timber-framed shaft, a winch on two A-frames with its wheel, rope and bucket, broken rock, a basket of coloured gems and white glints, a porter.
- Jeweller: a small whitewashed shop with a purple band, a gold sign standing on its front parapet, a purple-and-gold striped awning over a table of gold pieces, a little furnace with a gold glow, a mosaic step with a red border, a noble customer.
- Storehouse: a long whitewashed shed with three dark doorways, a teal band and two roof rugs, a walled yard with a gate; the yard empty (s0), with four goods (s1), ten (s2), and crowded with crates stacked two high, jars, bales and sacks (s3).
- Trading post: two striped tents (red on white, teal on cream) with door flaps, a tall teal-and-gold flag, two donkeys with red and blue packs at a hitching rail, crates, jars, a bale, a rug and a porter.

- [ ] **Step 1: Write the failing tests**

Create `tests/render/industryArt.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { clayPit, potter, brewery, weaver, gemMine, jeweller, storehouse, tradingPost, INDUSTRY_ART, PLAIN_STORE_STAGE } from '../../src/render/art/industry.js';
import { storehouseStage } from '../../src/render/art/stages.js';
import { ART, boundsFor, slotFor } from '../../src/render/art/registry.js';
import { INDUSTRY_TINT } from '../../src/render/art/palette.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { drawThumb } from '../../src/ui/thumbs.js';
import { makeCanvas, canvasHash, hexToRgb } from '../helpers/canvas.js';

// A 2x2 building drawn alone at scale 2 (zoom 1 on a 1x screen) with its art origin at canvas (160, 110).
function drawAlone(fn) {
  const c = makeCanvas(320, 260);
  const ctx = c.getContext('2d');
  ctx.translate(160, 110);
  fn(makeDraw(ctx, 2), 0, 0);
  return c;
}
// How many solid pixels are within tol of any of the colours.
const countNear = (c, hexes, tol) => {
  const want = hexes.map(hexToRgb);
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 250) continue;
    if (want.some(([r, g, b]) => Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol && Math.abs(d[i + 2] - b) <= tol)) n++;
  }
  return n;
};
// How many solid pixels there are.
const solid = (c) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] >= 250) n++;
  return n;
};
const TYPES = ['clay_pit', 'potter', 'brewery', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post'];
const DRAW = [clayPit, potter, brewery, weaver, gemMine, jeweller, storehouse, tradingPost];

describe('industry art', () => {
  it('draws every workshop, the storehouse and the trading post with ink and a look of its own', () => {
    const hashes = new Set();
    for (const fn of DRAW) {
      const c = drawAlone(fn);
      expect(solid(c)).toBeGreaterThan(2000);                                  // solid ink across a good part of the 2x2
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(DRAW.length);
  });
  it('registers each with its real 2x2 footprint, bounds from its height, and ground shadows', () => {
    for (const type of TYPES) {
      const e = ART[type];
      expect([type, e.w, e.d]).toEqual([type, BUILDINGS[type].w, BUILDINGS[type].d]);
      expect([type, e.w, e.d]).toEqual([type, 2, 2]);
      expect([type, e.bounds]).toEqual([type, boundsFor(2, 2, e.height)]);
      expect([type, e.shadows.length > 0]).toEqual([type, true]);
      for (const s of e.shadows) expect(s.length).toBe(5);
      expect(slotFor({ type, store: {} }) === type || type === 'storehouse').toBe(true);
    }
    expect(ART.trading_post.height).toBeGreaterThan(ART.storehouse.height);   // its flag is the tallest thing in the yard
  });
  it('flies a pennant in the industry tint over every workshop, the storehouse, the trading post and the industry farms', () => {
    for (const type of [...TYPES, 'farm_barley', 'farm_flax']) {
      const c = drawAlone((g) => ART[type].draw(g, 0, 0));
      expect([type, countNear(c, [INDUSTRY_TINT], 6) > 15]).toEqual([type, true]);
    }
  });
  it('fills the storehouse yard in four stages by its share of capacity, counting every good', () => {
    const cap = BUILDINGS.storehouse.capacity;
    const stage = (n) => storehouseStage({ type: 'storehouse', store: { pottery: n } });
    expect(storehouseStage({ type: 'storehouse', store: {} })).toBe(0);
    expect([stage(0), stage(1), stage(cap / 3 - 1), stage(cap / 3), stage((2 * cap) / 3 - 1), stage((2 * cap) / 3), stage(cap)]).toEqual([0, 1, 1, 2, 2, 3, 3]);
    expect(storehouseStage({ type: 'storehouse', store: { pottery: cap / 3, clay: cap / 3 } })).toBe(3);
  });
  it('names the storehouse slot by its stock and registers each stage like the plain slot, each drawn differently', () => {
    const cap = BUILDINGS.storehouse.capacity;
    expect(slotFor({ type: 'storehouse', store: {} })).toBe('storehouse.s0');
    expect(slotFor({ type: 'storehouse', store: { clay: cap } }, { day: 3 })).toBe('storehouse.s3');
    const plain = ART.storehouse, hashes = new Set();
    for (let s = 0; s < 4; s++) {
      const e = INDUSTRY_ART[`storehouse.s${s}`];
      expect([s, e.w, e.d, e.height, e.bounds, e.shadows]).toEqual([s, plain.w, plain.d, plain.height, plain.bounds, plain.shadows]);
      hashes.add(canvasHash(drawAlone((g) => e.draw(g, 0, 0))));
    }
    expect(hashes.size).toBe(4);
    expect(PLAIN_STORE_STAGE).toBe(3);
    expect(canvasHash(drawAlone((g) => plain.draw(g, 0, 0)))).toBe(canvasHash(drawAlone((g) => ART['storehouse.s3'].draw(g, 0, 0))));
  });
  it('piles more crates, bales and jars in the yard at each stage', () => {
    const goods = (s) => countNear(drawAlone((g) => storehouse(g, 0, 0, s)), ['#C9A26A', '#A8814E', '#86705E', '#DCC27A', '#C4A85E', '#C9552F'], 8);
    const n = [0, 1, 2, 3].map(goods);
    expect(n[0]).toBe(0);
    expect(n[1]).toBeGreaterThan(n[0]);
    expect(n[2]).toBeGreaterThan(n[1]);
    expect(n[3]).toBeGreaterThan(n[2]);
  });
  it('draws a card picture for each', () => {
    for (const type of TYPES) {
      const c = drawThumb(document.createElement('canvas'), type, 1);
      expect([type, solid(c) > 150]).toEqual([type, true]);
    }
  });
});
```

In `tests/all.js`, add the import directly after `import './render/farmsDecorArt.test.js';`:

```js
import './render/industryArt.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "industry art"
```

Expected: `LOAD ERROR`: the module `src/render/art/industry.js` cannot be fetched (404), so nothing runs.

- [ ] **Step 3: Implement**

Create `src/render/art/industry.js`:

```js
// Stage 2 workshops, the storehouse and the trading post (spec 4.10, 4.15), drawn in the mock-up's style: smooth
// whitewash, cool lavender shaded faces, striped reed canopies, orange pots and painted bands. Each building carries
// a pennant in the industry tint (spec 5.3), so the category reads at phone zoom. Everything is 2x2 and is drawn
// back to front, so nearer things cover farther ones. The storehouse shows its stock in four stages (stages.js),
// and INDUSTRY_ART registers one slot per stage beside its plain slot.
import { box, tb, qd, door, win, parapet, mat, rug, pots, ladder, awn, p, U, quad, hs } from './primitives.js';
import { rock } from './nature.js';
import { fig } from './figures.js';
import { pennant } from './services.js';
import {
  WASH, WASH2, MUD, MUD2, ROCK, GOLDC, TEAL, TEAL_DARK, BLUE, RED, RED_DARK, GOLD, PINK, ORANGE, GREEN, GREEN_DARK,
  PURP, WOOD, POT, POT_LIGHT, SHADOW, DOOR, INDUSTRY_TINT,
} from './palette.js';
import { boundsFor } from '../iso.js';

const TIMBER = ['#C9A26A', '#A8814E', '#86705E'];          // crates and posts: lit top, lit side, shaded side
const BALE = ['#DCC27A', '#C4A85E', '#9C8A6E'];
const CLAY = '#9A6A48', CLAY_WET = '#7A5238', CLAY_LIGHT = '#B8865C';

// A wooden crate standing on tile point (gx, gy), s tiles across, h art px tall, raised by z.
function crate(g, gx, gy, s, h, z = 0) {
  const F = box(g, gx - s / 2, gy - s / 2, s, s, h, z, TIMBER);
  g.line(F.L(0.5, 0), F.L(0.5, h), '#86603E', 0.4, 0.7);
  g.line(F.R(0.5, 0), F.R(0.5, h), '#6E5A50', 0.4, 0.7);
}
// A bale of flax or straw, banded with twine.
function bale(g, gx, gy, w, d, z = 0) {
  const F = box(g, gx - w / 2, gy - d / 2, w, d, 2.4, z, BALE);
  qd(g, F.L, 0.3, 0.36, 0, 2.4, '#8C7240');
  qd(g, F.L, 0.64, 0.7, 0, 2.4, '#8C7240');
}
// A tall storage jar (an amphora) with a stopper, standing on art point q.
function jar(g, q, color = POT, h = 5) {
  g.ell([q[0] + 1, q[1] + 0.3], 2, 0.8, SHADOW, { alpha: 0.18 });
  g.path([['M', [q[0] - 0.8, q[1]]], ['Q', [q[0] - 2.4, q[1] - h * 0.55], [q[0] - 0.7, q[1] - h]], ['L', [q[0] + 0.7, q[1] - h]], ['Q', [q[0] + 2.4, q[1] - h * 0.55], [q[0] + 0.8, q[1]]], ['Z']], color, { outline: true });
  g.ell([q[0] - 0.6, q[1] - h * 0.55], 0.45, h * 0.18, POT_LIGHT, { alpha: 0.6 });
  g.ell([q[0], q[1] - h - 0.2], 0.9, 0.45, '#E9D8B4');
}
// A sack of grain or barley.
function sack(g, q, color = '#D8B47A') {
  g.ell(U(q, 1.4), 1.8, 1.5, color, { outline: true });
  g.ell(U(q, 3), 0.8, 0.45, '#9C7A54');
}
// A round vat or kiln drum: an upright cylinder on tile point (gx, gy), r art px across the middle, h tall.
function drum(g, gx, gy, r, h, side, shade, top) {
  const c = p(gx, gy), ry = r * 0.5;
  g.ell([c[0] + r * 0.4, c[1] + ry * 0.4], r * 1.1, ry * 1.1, SHADOW, { alpha: 0.16 });
  g.path([['M', [c[0] - r, c[1]]], ['L', [c[0] - r, c[1] - h]], ['L', [c[0] + r, c[1] - h]], ['L', [c[0] + r, c[1]]], ['Q', [c[0], c[1] + ry * 2], [c[0] - r, c[1]]], ['Z']], side, { outline: true });
  g.path([['M', [c[0], c[1] + ry]], ['Q', [c[0] + r, c[1] + ry], [c[0] + r, c[1]]], ['L', [c[0] + r, c[1] - h]], ['L', [c[0], c[1] - h + ry]], ['Z']], shade, { alpha: 0.55 });
  g.ell([c[0], c[1] - h], r, ry, top, { outline: true });
  return [c[0], c[1] - h];
}
// A soft puff of smoke centred on art point q.
const puff = (g, q, r, a) => g.radial(q, r, r * 0.8, '#F4F0F2', a);

// Clay pit: a dug pit of wet clay with puddles, a digger and a ladder, bricks drying in rows along the front, a
// green reed shade over the brick moulds and baskets of clay.
export function clayPit(g, X, Y) {
  const x0 = X + 0.14, y0 = Y + 0.14, w = 1.26, d = 1.12, deep = 3.2;
  g.poly(quad(x0 - 0.06, y0 - 0.06, w + 0.12, d + 0.12, 0), CLAY_LIGHT, { outline: true });   // the spoil rim
  g.save();
  g.clip(quad(x0, y0, w, d, 0));
  g.poly(quad(x0, y0, w, d, -deep), CLAY_WET);
  g.poly([p(x0, y0), p(x0 + w, y0), U(p(x0 + w, y0), -deep), U(p(x0, y0), -deep)], CLAY);           // the far walls
  g.poly([p(x0, y0), p(x0, y0 + d), U(p(x0, y0 + d), -deep), U(p(x0, y0), -deep)], '#86604A');
  for (const [u, v, rx] of [[0.3, 0.55, 4], [0.7, 0.35, 3], [0.62, 0.78, 2.6]]) {
    const q = U(p(x0 + w * u, y0 + d * v), -deep);
    g.ell(q, rx, rx * 0.45, '#6E8A84', { alpha: 0.85 });
    g.ell([q[0] - rx * 0.3, q[1] - rx * 0.1], rx * 0.4, rx * 0.15, '#B8E0DA', { alpha: 0.6 });
  }
  for (let i = 0; i < 9; i++) g.circ(U(p(x0 + w * hs(i, 3, 5), y0 + d * hs(i, 4, 5)), -deep + 0.6), 0.9, CLAY_LIGHT, { alpha: 0.8 });
  g.restore();
  ladder(g, U(p(x0 + 0.6, y0 + 0.04), -deep), U(p(x0 + 0.6, y0 + 0.04), 3));
  fig(g, x0 + 0.42, y0 + 0.62, 'farmer', -deep + 0.4, 0.9);
  // the brick yard: rows of mud bricks drying along the front and right edges
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) box(g, X + 0.18 + i * 0.2, Y + 1.5 + j * 0.2, 0.13, 0.09, 1.2, 0, MUD, 0);
  for (let j = 0; j < 4; j++) box(g, X + 1.56, Y + 0.3 + j * 0.2, 0.09, 0.13, 1.2, 0, MUD, 0);
  awn(g, X + 1.46, Y + 0.18, 0.42, 0.9, 6, GREEN, GREEN_DARK, TEAL);
  for (let k = 0; k < 3; k++) box(g, X + 1.5, Y + 1.32, 0.3, 0.2, 1.1, k * 1.1, MUD2, 0);                // a stack of dry bricks
  for (const [u, v] of [[1.72, 1.66], [1.3, 1.86]]) {
    const q = p(X + u, Y + v);
    g.ell(U(q, 0.9), 2.3, 1.35, '#B08436', { outline: true });
    g.ell(U(q, 1.9), 1.8, 1.05, CLAY, { outline: true });
  }
  jar(g, p(X + 1.88, Y + 1.36), POT, 4.4);
  pennant(g, U(p(X + 1.9, Y + 0.12), 0), 11, INDUSTRY_TINT);
}

// Potter: a whitewashed workshop with a striped awning over the wheel, a domed mud kiln glowing at its mouth with
// soft smoke rising, and rows of finished pots in the yard.
export function potter(g, X, Y) {
  const W = box(g, X + 0.12, Y + 0.12, 0.92, 0.66, 9, 0, WASH);
  parapet(g, X + 0.12, Y + 0.12, 0.92, 0.66, 9);
  qd(g, W.L, 0, 1, 7.4, 8.2, TEAL);
  qd(g, W.R, 0, 1, 7.4, 8.2, TEAL_DARK);
  door(g, W, 0.62, 0.8, 5.6);
  win(g, W.L, 0.18, 0.32, 4, 6);
  win(g, W.R, 0.3, 0.5, 4, 6);
  mat(g, X + 0.24, Y + 0.22, 0.4, 0.3, 9, ORANGE, GOLD);
  // the kiln: a tapered mud drum, its stoke hole glowing, smoke from the top
  const K = tb(g, X + 1.22, Y + 0.22, 0.6, 0.6, 9, 0, 0.14, MUD2);
  qd(g, K.L, 0.36, 0.64, 0.4, 3.6, '#3A2420');
  qd(g, K.L, 0.42, 0.58, 0.6, 2.4, ORANGE);
  qd(g, K.L, 0.46, 0.54, 0.6, 1.6, GOLD);
  g.poly(quad(X + 1.42, Y + 0.42, 0.2, 0.2, 9), '#4A3030');
  const top = U(p(X + 1.52, Y + 0.52), 9);
  puff(g, [top[0] + 1, top[1] - 4], 3, 0.55);
  puff(g, [top[0] + 3.5, top[1] - 8.5], 3.8, 0.42);
  puff(g, [top[0] + 6.5, top[1] - 13], 4.4, 0.3);
  // the wheel under its awning, the potter at work
  awn(g, X + 0.2, Y + 0.84, 0.66, 0.42, 6.4, RED, RED_DARK, GOLD);
  const wh = U(p(X + 0.54, Y + 1.04), 1.6);
  g.line(p(X + 0.54, Y + 1.04), wh, WOOD, 1);
  g.ell(wh, 2.4, 1.2, '#8A6448', { outline: true });
  g.ell(U(wh, 1.4), 1.2, 1.4, CLAY_LIGHT, { outline: true });
  fig(g, X + 0.36, Y + 1.12, 'citizen', 0, 0.85);
  // rows of finished pots, set out to sell
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) jar(g, p(X + 1.08 + i * 0.2, Y + 1.24 + r * 0.22), (i + r) % 3 ? POT : '#E9C08A', 3.4);
  for (const [u, v] of [[0.3, 1.62], [0.52, 1.7], [0.74, 1.78]]) jar(g, p(X + u, Y + v), POT);
  jar(g, p(X + 1.86, Y + 0.96), '#E9C08A', 4.4);
  pennant(g, U(p(X + 1.9, Y + 1.0), 0), 11, INDUSTRY_TINT);
}

// Brewery: a whitewashed brewhouse with barley sacks on its roof, three open vats of dark beer with foam in the
// yard, a rack of sealed beer jars and a heap of barley sacks.
export function brewery(g, X, Y) {
  const W = box(g, X + 0.12, Y + 0.12, 1.06, 0.72, 10, 0, WASH);
  parapet(g, X + 0.12, Y + 0.12, 1.06, 0.72, 10);
  qd(g, W.L, 0, 1, 8.4, 9.2, GOLD);
  qd(g, W.R, 0, 1, 8.4, 9.2, GOLDC[2]);
  door(g, W, 0.44, 0.6, 6);
  for (const u of [0.12, 0.26, 0.76]) win(g, W.L, u, u + 0.08, 4.2, 6.6);
  win(g, W.R, 0.35, 0.55, 4.2, 6.6);
  for (const [u, v] of [[0.35, 0.35], [0.55, 0.3], [0.45, 0.55]]) sack(g, U(p(X + u, Y + v), 10), '#E2C27E');
  ladder(g, U(p(X + 1.0, Y + 0.86), 0), U(p(X + 1.0, Y + 0.82), 10.5));
  for (const [u, v] of [[1.48, 0.42], [1.5, 0.98], [0.9, 1.22]]) {
    const t = drum(g, X + u, Y + v, 5.4, 6, '#B07E52', '#7A5848', '#5A3420');
    g.ell([t[0] - 0.4, t[1] - 0.2], 3.8, 1.6, '#3E2216');
    g.ell([t[0] - 1.6, t[1] - 0.6], 1.6, 0.6, '#F2E2BC', { alpha: 0.9 });
    g.line([t[0] - 5.4, t[1]], [t[0] + 5.4, t[1]], '#6E4A30', 0.6, 0.8);
  }
  box(g, X + 0.14, Y + 1.5, 0.92, 0.16, 1.6, 0, TIMBER, 0);                                              // the jar rack
  for (let i = 0; i < 4; i++) jar(g, U(p(X + 0.24 + i * 0.25, Y + 1.58), 1.6), i % 2 ? '#C9552F' : '#B8643A', 5.2);
  for (const [u, v] of [[1.5, 1.6], [1.66, 1.5], [1.6, 1.74], [1.78, 1.66]]) sack(g, p(X + u, Y + v), '#D8B47A');
  pennant(g, U(p(X + 1.9, Y + 0.12), 0), 11, INDUSTRY_TINT);
}

// Weaver: a whitewashed workshop, an upright loom with a banded cloth, a ground loom with a striped linen cloth
// and a weaver at it, lengths of coloured cloth drying on a line in front of a teal reed canopy, and bales of flax.
export function weaver(g, X, Y) {
  const W = box(g, X + 0.12, Y + 0.12, 0.8, 0.7, 9, 0, WASH);
  parapet(g, X + 0.12, Y + 0.12, 0.8, 0.7, 9);
  qd(g, W.L, 0, 1, 7.4, 8.2, BLUE);
  qd(g, W.R, 0, 1, 7.4, 8.2, '#245A88');
  door(g, W, 0.56, 0.74, 5.6);
  win(g, W.L, 0.16, 0.3, 4, 6);
  win(g, W.R, 0.3, 0.5, 4, 6);
  rug(g, X + 0.22, Y + 0.24, 0.5, 0.3, 9, PINK, '#F2D7A8', TEAL);
  // the upright loom, its cloth banded blue, gold and red
  const a = U(p(X + 1.12, Y + 0.3), 0), b = U(p(X + 1.62, Y + 0.3), 0);
  g.line(a, U(a, 11), WOOD, 1);
  g.line(b, U(b, 11), WOOD, 1);
  g.line(U(a, 11), U(b, 11), WOOD, 1.1);
  const cloth = (s0, s1, c) => g.poly([U(p(X + 1.16, Y + 0.3), s0), U(p(X + 1.58, Y + 0.3), s0), U(p(X + 1.58, Y + 0.3), s1), U(p(X + 1.16, Y + 0.3), s1)], c);
  cloth(3, 10.6, '#F4EEE2');
  cloth(8, 9.2, BLUE);
  cloth(6.4, 7.4, GOLD);
  cloth(4.8, 5.6, RED);
  g.line(U(p(X + 1.14, Y + 0.3), 2.6), U(p(X + 1.6, Y + 0.3), 2.6), WOOD, 0.9);
  // the canopy, and the drying line in front of it
  awn(g, X + 1.2, Y + 0.62, 0.66, 0.66, 8.4, TEAL, TEAL_DARK);
  const ly = Y + 1.42, l0 = p(X + 1.24, ly), l1 = p(X + 1.86, ly);
  g.line(l0, U(l0, 7), WOOD, 0.8);
  g.line(l1, U(l1, 7), WOOD, 0.8);
  g.line(U(l0, 6.6), U(l1, 6.6), '#8C7B5C', 0.5);
  [[0.06, '#F4EEE2'], [0.3, TEAL], [0.54, GOLD], [0.78, RED]].forEach(([u, c]) => {
    const l = p(X + 1.24 + 0.62 * u, ly), r = p(X + 1.24 + 0.62 * (u + 0.16), ly);
    g.poly([U(l, 6.6), U(r, 6.6), U(r, 2.4), U(l, 2.6)], c, { outline: true });
  });
  // the ground loom: a striped linen cloth pegged out, the weaver kneeling at its near end
  const gx = X + 0.2, gy = Y + 1.08;
  g.poly(quad(gx, gy, 0.86, 0.42, 0.4), '#F4EEE2', { outline: true });
  for (const v of [0.2, 0.5, 0.8]) g.line(U(p(gx + 0.04, gy + 0.42 * v), 0.4), U(p(gx + 0.82, gy + 0.42 * v), 0.4), v === 0.5 ? RED : TEAL, 0.8);
  for (const [u, v] of [[0, 0], [0.86, 0], [0, 0.42], [0.86, 0.42]]) { const q = p(gx + u, gy + v); g.line(q, U(q, 1.6), WOOD, 0.8); }
  g.line(U(p(gx + 0.6, gy - 0.02), 1.2), U(p(gx + 0.6, gy + 0.44), 1.2), WOOD, 1);
  fig(g, gx + 0.66, gy + 0.58, 'woman', 0, 0.85);
  for (const [u, v] of [[1.4, 1.7], [1.66, 1.66], [1.56, 1.86]]) bale(g, X + u, Y + v, 0.22, 0.16);
  pennant(g, U(p(X + 1.92, Y + 0.6), 0), 11, INDUSTRY_TINT);
}

// Gem mine: a rocky outcrop at the back, a timber-framed shaft in front of it under a winch with its wheel, rope
// and bucket, a heap of broken rock, and gems glinting in a basket and on the spoil.
const GEMS = [TEAL, RED, PURP, '#3FA0D8', GOLD];
function gem(g, q, c) {
  g.poly([[q[0], q[1] - 1.5], [q[0] + 1.1, q[1]], [q[0], q[1] + 1.1], [q[0] - 1.1, q[1]]], c, { outline: true });
  g.poly([[q[0], q[1] - 1.5], [q[0] + 1.1, q[1]], [q[0], q[1] - 0.2]], '#FFFFFF', { alpha: 0.45 });
}
function glint(g, q) {
  g.line([q[0] - 2, q[1]], [q[0] + 2, q[1]], '#FFFFFF', 0.5, 0.9);
  g.line([q[0], q[1] - 2], [q[0], q[1] + 2], '#FFFFFF', 0.5, 0.9);
}
export function gemMine(g, X, Y) {
  [[0.06, 0.08, 0.9, 0.72, 13, 0.16], [0.84, 0.1, 0.7, 0.62, 9, 0.14], [1.4, 0.2, 0.48, 0.5, 6, 0.12], [0.08, 0.76, 0.52, 0.5, 6, 0.12]].forEach(([dx, dy, w, d, h, i], k) => {
    const F = tb(g, X + dx, Y + dy, w, d, h, 0, i, ROCK);
    for (let s = 2; s < h - 1; s += 2.2) {
      g.line(F.L(0.05, s), F.L(0.95, s + hs(k, s, 1) * 1.2 - 0.6), '#8E6E4A', 0.5, 0.45);
      g.line(F.R(0.05, s), F.R(0.95, s), '#6E5A5E', 0.5, 0.4);
    }
  });
  // the shaft, framed in timber
  const sx = X + 0.86, sy = Y + 1.0, s = 0.42;
  g.poly(quad(sx - 0.05, sy - 0.05, s + 0.1, s + 0.1, 0), '#A8814E', { outline: true });
  g.poly(quad(sx, sy, s, s, 0), '#2E2430');
  g.poly([p(sx, sy), p(sx + s, sy), U(p(sx + s, sy), -3), U(p(sx, sy), -3)], '#4A3A40');
  // the winch: two A-frames, an axle with a wheel, the rope and a bucket
  for (const v of [sy - 0.02, sy + s + 0.02]) {
    const l = p(sx - 0.06, v), r = p(sx + s + 0.06, v), top = U(p(sx + s / 2, v), 10);
    g.line(l, top, WOOD, 1);
    g.line(r, top, WOOD, 1);
  }
  const ax0 = U(p(sx + s / 2, sy - 0.02), 10), ax1 = U(p(sx + s / 2, sy + s + 0.02), 10);
  g.line(ax0, ax1, '#5A3E2A', 1.1);
  g.ell([(ax0[0] + ax1[0]) / 2, (ax0[1] + ax1[1]) / 2], 2.6, 2.6, 'none', { stroke: WOOD, strokeWidth: 0.9 });
  const mid = [(ax0[0] + ax1[0]) / 2, (ax0[1] + ax1[1]) / 2];
  g.line(mid, [mid[0], mid[1] + 9], '#C8B48A', 0.5);
  g.poly([[mid[0] - 1.4, mid[1] + 9], [mid[0] + 1.4, mid[1] + 9], [mid[0] + 1.1, mid[1] + 11], [mid[0] - 1.1, mid[1] + 11]], '#8A6448', { outline: true });
  // spoil, a basket of gems, glints
  for (const [u, v] of [[1.52, 1.12], [1.7, 1.32], [1.46, 1.44], [1.76, 1.04]]) rock(g, p(X + u, Y + v));
  gem(g, U(p(X + 1.56, Y + 1.24), 3), GEMS[0]);
  gem(g, U(p(X + 1.7, Y + 1.12), 2.6), GEMS[1]);
  glint(g, U(p(X + 1.56, Y + 1.24), 5));
  const bq = p(X + 0.6, Y + 1.72);
  g.ell(U(bq, 0.9), 2.6, 1.5, '#B08436', { outline: true });
  for (let i = 0; i < 5; i++) gem(g, U([bq[0] - 1.6 + i * 0.8, bq[1] + (i % 2) * 0.4], 2.2), GEMS[i]);
  glint(g, U(bq, 4.8));
  fig(g, X + 1.4, Y + 1.66, 'porter', 0, 0.85);
  pennant(g, U(p(X + 1.9, Y + 1.0), 0), 11, INDUSTRY_TINT);
}

// Jeweller: a small whitewashed shop with a gold sign over its door, a purple-and-gold striped awning over a table
// of gold pieces, a little furnace with a gold glow, and a mosaic step in front.
export function jeweller(g, X, Y) {
  const W = box(g, X + 0.3, Y + 0.22, 1.2, 0.8, 12, 0, WASH);
  parapet(g, X + 0.3, Y + 0.22, 1.2, 0.8, 12);
  qd(g, W.L, 0, 1, 10.4, 11.2, PURP);
  qd(g, W.R, 0, 1, 10.4, 11.2, '#563E78');
  door(g, W, 0.44, 0.58, 6.4);
  for (const u of [0.12, 0.26, 0.72, 0.86]) win(g, W.L, u, u + 0.07, 4.4, 7);
  win(g, W.R, 0.3, 0.5, 4.4, 7);
  mat(g, X + 0.5, Y + 0.34, 0.5, 0.36, 12, BLUE, GOLD);
  pots(g, U(p(X + 1.3, Y + 0.4), 12), 2);
  // the gold sign, standing on the roof's front edge so it shows over the awning
  const s0 = p(X + 0.62, Y + 0.96), s1 = p(X + 1.18, Y + 0.96);
  g.line(U(s0, 12), U(s0, 15.6), WOOD, 0.8);
  g.line(U(s1, 12), U(s1, 15.6), WOOD, 0.8);
  g.poly([U(p(X + 0.66, Y + 0.96), 12.8), U(p(X + 1.14, Y + 0.96), 12.8), U(p(X + 1.14, Y + 0.96), 15.6), U(p(X + 0.66, Y + 0.96), 15.6)], GOLD, { stroke: GOLDC[2], strokeWidth: 0.6 });
  g.circ(U(p(X + 0.9, Y + 0.96), 14.2), 0.9, 'none', { stroke: '#FFF4C8', strokeWidth: 0.5 });
  // the furnace at the side: a small mud dome glowing gold
  const K = tb(g, X + 1.58, Y + 0.3, 0.32, 0.32, 5, 0, 0.1, MUD2);
  qd(g, K.L, 0.3, 0.7, 0.4, 2.4, ORANGE);
  qd(g, K.L, 0.38, 0.62, 0.4, 1.6, GOLD);
  puff(g, U(p(X + 1.74, Y + 0.46), 8), 2.4, 0.4);
  // the mosaic step and the awning over the table
  g.poly(quad(X + 0.36, Y + 1.12, 1.1, 0.7, 0), '#F3DDB2', { stroke: RED, strokeWidth: 0.8 });
  for (const [u, v, c] of [[0.2, 0.3, TEAL], [0.5, 0.5, RED], [0.8, 0.3, TEAL], [0.35, 0.75, GOLD], [0.65, 0.75, GOLD]]) g.circ(p(X + 0.36 + 1.1 * u, Y + 1.12 + 0.7 * v), 1, c);
  awn(g, X + 0.32, Y + 1.04, 1.16, 0.4, 7.4, PURP, '#563E78', GOLD);
  const T = box(g, X + 0.5, Y + 1.12, 0.6, 0.18, 2.6, 0, TIMBER);
  for (let i = 0; i < 5; i++) {
    const q = U(p(X + 0.56 + i * 0.12, Y + 1.21), 2.7);
    g.circ(q, 0.8, i % 2 ? GOLD : GOLDC[0], { outline: true });
    if (i % 2 === 0) g.circ([q[0] + 0.3, q[1] - 0.4], 0.35, [RED, TEAL, BLUE][i / 2]);
  }
  qd(g, T.L, 0, 1, 1.6, 2.2, RED);
  fig(g, X + 1.26, Y + 1.5, 'noble', 0, 0.85);
  pennant(g, U(p(X + 1.88, Y + 1.0), 0), 11, INDUSTRY_TINT);
}

// Storehouse: a whitewashed shed across the back with wide dark doors and a teal band, a low wall round a yard,
// and the yard's stock. `stage` (storehouseStage): 0 a bare yard; 1 a few crates and jars; 2 rows of crates, jars,
// bales and sacks; 3 crates stacked high and every spot full.
const STORE_SPOTS = [   // [kind, u, v, stage]: each spot shows from its stage on; crate2 and bale2 sit on the one below
  ['crate', 0.36, 0.98, 1], ['jar', 0.76, 0.96, 1], ['bale', 1.1, 1.0, 1], ['crate', 1.46, 0.98, 1],
  ['crate', 0.4, 1.34, 2], ['jar', 0.86, 1.3, 2], ['jar', 1.0, 1.4, 2], ['sack', 1.36, 1.36, 2], ['crate', 1.66, 1.24, 2], ['bale', 0.62, 1.62, 2],
  ['crate2', 0.36, 0.98, 3], ['crate2', 1.46, 0.98, 3], ['crate2', 0.4, 1.34, 3], ['bale2', 1.1, 1.0, 3], ['crate', 1.22, 1.64, 3],
  ['jar', 0.88, 1.62, 3], ['sack', 1.56, 1.6, 3], ['crate2', 1.66, 1.24, 3],
];
export function storehouse(g, X, Y, stage = 3) {
  g.poly(quad(X + 0.12, Y + 0.12, 1.76, 1.76, 0), '#E2CFA6');                                            // the yard floor
  const S = box(g, X + 0.12, Y + 0.12, 1.76, 0.6, 9, 0, WASH);
  parapet(g, X + 0.12, Y + 0.12, 1.76, 0.6, 9);
  qd(g, S.L, 0, 1, 7.4, 8.2, TEAL);
  qd(g, S.R, 0, 1, 7.4, 8.2, TEAL_DARK);
  for (const u of [0.16, 0.44, 0.72]) qd(g, S.L, u, u + 0.14, 0, 5.6, DOOR);
  win(g, S.R, 0.4, 0.6, 4, 6);
  for (const [u, c] of [[0.3, RED], [0.8, GREEN]]) mat(g, X + 0.12 + u - 0.12, Y + 0.24, 0.3, 0.3, 9, c, GOLD);
  box(g, X + 0.12, Y + 0.72, 0.08, 1.16, 3, 0, WASH2, 0);                                                    // the yard walls
  box(g, X + 1.8, Y + 0.72, 0.08, 1.16, 3, 0, WASH2, 0);
  const layers = STORE_SPOTS.filter((sp) => sp[3] <= stage);
  for (const [kind, u, v] of layers.sort((a, b) => a[1] + a[2] - (b[1] + b[2]))) {
    if (kind === 'crate') crate(g, X + u, Y + v, 0.22, 3.2);
    else if (kind === 'crate2') crate(g, X + u, Y + v, 0.2, 3, 3.2);
    else if (kind === 'bale') bale(g, X + u, Y + v, 0.26, 0.18);
    else if (kind === 'bale2') bale(g, X + u, Y + v, 0.24, 0.16, 2.4);
    else if (kind === 'sack') sack(g, p(X + u, Y + v));
    else jar(g, p(X + u, Y + v), POT, 5);
  }
  box(g, X + 0.12, Y + 1.8, 0.66, 0.08, 3, 0, WASH2, 0);                                                     // the front wall and gate
  box(g, X + 1.22, Y + 1.8, 0.66, 0.08, 3, 0, WASH2, 0);
  box(g, X + 0.72, Y + 1.76, 0.08, 0.16, 5, 0, WASH, 0);
  box(g, X + 1.2, Y + 1.76, 0.08, 0.16, 5, 0, WASH, 0);
  pennant(g, U(p(X + 1.88, Y + 0.14), 9), 7, INDUSTRY_TINT);
}

// Trading post: two striped tents, a tall flag in teal and gold, two donkeys with packs tethered at a rail, and
// traded goods (crates, jars, a bale, a rug) in front.
function tent(g, x, y, w, d, h, cloth, stripe) {
  const ridge0 = U(p(x, y + d / 2), h), ridge1 = U(p(x + w, y + d / 2), h);
  g.poly([p(x + w, y), p(x + w, y + d), ridge1], cloth[2], { outline: true });                           // the end, in shade
  g.poly([p(x + w, y + d * 0.3), p(x + w, y + d * 0.7), U(p(x + w, y + d / 2), h * 0.62)], DOOR, { alpha: 0.85 });   // its door flap
  g.poly([p(x, y + d), p(x + w, y + d), ridge1, ridge0], cloth[1], { outline: true });                    // the lit side
  for (let u = 0.1; u < 0.95; u += 0.2) {
    g.poly([p(x + w * u, y + d), p(x + w * (u + 0.09), y + d), U(p(x + w * (u + 0.09), y + d / 2), h), U(p(x + w * u, y + d / 2), h)], stripe, { alpha: 0.9 });
  }
  g.line(ridge0, ridge1, '#FFFFFF', 0.6, 0.6);
  g.line(ridge1, U(ridge1, 2.4), WOOD, 0.7);
}
function donkey(g, gx, gy, pack) {
  const c = p(gx, gy);
  g.ell([c[0] + 1.5, c[1] + 0.4], 5, 1.4, SHADOW, { alpha: 0.2 });
  for (const dx of [-2.6, -1.6, 1.8, 2.8]) g.line([c[0] + dx, c[1] - 3], [c[0] + dx, c[1]], '#6E625C', 0.8);
  g.ell([c[0], c[1] - 4.2], 4, 1.9, '#9A8C84', { outline: true });
  g.line([c[0] - 3.2, c[1] - 4.6], [c[0] - 4.6, c[1] - 7], '#9A8C84', 1.6);                                 // the neck
  g.ell([c[0] - 5.2, c[1] - 7.2], 1.6, 1.1, '#9A8C84', { outline: true });
  g.ell([c[0] - 6.3, c[1] - 6.9], 0.7, 0.6, '#E8E0D8');
  g.line([c[0] - 4.8, c[1] - 8], [c[0] - 4.4, c[1] - 10], '#8A7C74', 0.7);                                 // the ears
  g.line([c[0] - 5.4, c[1] - 8], [c[0] - 5.6, c[1] - 10], '#8A7C74', 0.7);
  g.line([c[0] + 3.8, c[1] - 4.6], [c[0] + 4.6, c[1] - 2.6], '#6E625C', 0.6);
  g.poly([[c[0] - 1.8, c[1] - 6], [c[0] + 1.8, c[1] - 6], [c[0] + 2.2, c[1] - 2.8], [c[0] - 2.2, c[1] - 2.8]], pack, { outline: true });
  g.line([c[0] - 1.8, c[1] - 5], [c[0] + 1.8, c[1] - 5], GOLD, 0.6);
}
export function tradingPost(g, X, Y) {
  rug(g, X + 0.9, Y + 1.0, 0.5, 0.34, 0, RED, '#F2D7A8', GOLD);
  tent(g, X + 0.14, Y + 0.16, 0.8, 0.62, 9, WASH, RED);
  tent(g, X + 1.0, Y + 0.2, 0.82, 0.6, 10, WASH2, TEAL);
  // the flag
  const f = p(X + 0.98, Y + 0.12);
  g.line(f, U(f, 22), WOOD, 0.9);
  g.poly([U(f, 22), [f[0] + 9, f[1] - 20.5], U(f, 17.5)], TEAL);
  g.poly([U(f, 20.6), [f[0] + 5.4, f[1] - 19.7], U(f, 18.9)], GOLD);
  // goods
  crate(g, X + 0.3, Y + 1.04, 0.22, 3.2);
  crate(g, X + 0.3, Y + 1.04, 0.18, 2.6, 3.2);
  jar(g, p(X + 0.58, Y + 1.0), POT, 5);
  bale(g, X + 0.62, Y + 1.3, 0.26, 0.18);
  for (const [u, v] of [[1.6, 0.96], [1.74, 1.08]]) jar(g, p(X + u, Y + v), u > 1.7 ? '#E9C08A' : POT, 4.6);
  // the hitching rail and the donkeys
  const r0 = p(X + 0.4, Y + 1.66), r1 = p(X + 1.6, Y + 1.66);
  g.line(r0, U(r0, 4), WOOD, 0.9);
  g.line(r1, U(r1, 4), WOOD, 0.9);
  g.line(U(r0, 4), U(r1, 4), WOOD, 0.9);
  donkey(g, X + 0.78, Y + 1.5, RED);
  donkey(g, X + 1.32, Y + 1.52, BLUE);
  fig(g, X + 1.62, Y + 1.36, 'porter', 0, 0.85);
  pennant(g, U(p(X + 1.86, Y + 0.24), 0), 12, INDUSTRY_TINT);
}

// The plain storehouse slot (cards and assets) is the full yard.
export const PLAIN_STORE_STAGE = 3;
const slot = (height, shadows, draw) => ({ w: 2, d: 2, height, bounds: boundsFor(2, 2, height), shadows, draw });
const STORE_SHADOWS = [[0.12, 0.12, 1.76, 0.6, 12]];
export const INDUSTRY_ART = {
  clay_pit: slot(12, [[1.46, 0.18, 0.42, 0.9, 6]], clayPit),
  potter: slot(26, [[0.12, 0.12, 0.92, 0.66, 12], [1.22, 0.22, 0.6, 0.6, 11]], potter),
  brewery: slot(14, [[0.12, 0.12, 1.06, 0.72, 13]], brewery),
  weaver: slot(12, [[0.12, 0.12, 0.8, 0.7, 12], [1.2, 0.62, 0.66, 0.66, 9]], weaver),
  gem_mine: slot(14, [[0.08, 0.1, 1.1, 0.8, 14], [1.0, 0.12, 0.86, 0.9, 10]], gemMine),
  jeweller: slot(16, [[0.3, 0.22, 1.2, 0.8, 15]], jeweller),
  storehouse: slot(16, STORE_SHADOWS, (g, x, y) => storehouse(g, x, y, PLAIN_STORE_STAGE)),
  trading_post: slot(23, [[0.14, 0.16, 0.8, 0.62, 7], [1.0, 0.2, 0.82, 0.6, 8]], tradingPost),
};
// One slot per stock stage, named as slotFor (registry.js) names them: storehouse.s0-s3.
for (let s = 0; s < 4; s++) INDUSTRY_ART[`storehouse.s${s}`] = slot(16, STORE_SHADOWS, (g, x, y) => storehouse(g, x, y, s));
```

Notes on `industry.js`: it imports `pennant` from `services.js`, and `services.js` never imports `industry.js`, so there is no cycle. Everything in a building is drawn back to front by hand (farther things first), because a sprite is one picture; the storehouse sorts its yard goods by `u + v` for the same reason, and a `crate2` or `bale2` spot is a second layer drawn on the first at the same place (the sort is stable). Heights are the tallest drawn thing: the potter's top smoke puff (kiln 9 + 13 + its 3.5 px soft edge, so 26), the brewery's roof sacks (about 13.5), the weaver's loom (11) and pennant, the gem mine's outcrop (14), the jeweller's roof sign (15.6), the storehouse's roof pennant (9 + 7), the trading post's flag (22).

**`src/render/art/stages.js`**, two edits (on top of Task 10's).

Before:

```js
// Which drawing a building shows (early-game pass 2.2 and 2.3): granaries and bazaars by how full they are,
// farms by how far the crop has grown. Pure functions of the building (and, for farms, the game day);
```

After:

```js
// Which drawing a building shows (early-game pass 2.2 and 2.3): granaries, storehouses and bazaars by how full they
// are, farms by how far the crop has grown. Pure functions of the building (and, for farms, the game day);
```

Insert `storehouseStage` between `granaryStage` and `bazaarStage`.

Before:

```js
// 0 empty stalls, 1 under half full, 2 piled.
export function bazaarStage(b) {
```

After:

```js
// The storehouse's yard (Stage 2), like the granary: 0 empty, 1 under a third full, 2 under two thirds, 3 the rest.
export function storehouseStage(b) {
  const n = stored(b), cap = BUILDINGS.storehouse.capacity;
  if (n <= 0) return 0;
  if (n * 3 < cap) return 1;
  if (n * 3 < cap * 2) return 2;
  return 3;
}

// 0 empty stalls, 1 under half full, 2 piled.
export function bazaarStage(b) {
```

(`stored` already sums every good in `b.store`, so clay, pottery and the rest all count toward the yard.)

**`src/render/art/registry.js`**, four edits (on top of Task 10's).

Before:

```js
import { SERVICE_ART } from './services.js';
```

After:

```js
import { SERVICE_ART } from './services.js';
import { INDUSTRY_ART } from './industry.js';
```

Before:

```js
import { granaryStage, bazaarStage, farmStage, FARM_TYPES } from './stages.js';
```

After:

```js
import { granaryStage, storehouseStage, bazaarStage, farmStage, FARM_TYPES } from './stages.js';
```

Before:

```js
export const ART = { ...HOUSE_ART, ...SERVICE_ART, ...NATURE_ART, ...FIGURE_ART };
```

After:

```js
export const ART = { ...HOUSE_ART, ...SERVICE_ART, ...INDUSTRY_ART, ...NATURE_ART, ...FIGURE_ART };
```

Before:

```js
// The art slot a building shows: houses by tier, granaries and bazaars by how full they are (stages.js), and
// farms by their crop's growth, which runs on the game day, so a farm needs the world (without one, its plain
// type slot). Everything else is its type.
export function slotFor(b, world = null) {
  if (b.type === 'house') return `house.t${b.tier}`;
  if (b.type === 'granary') return `granary.s${granaryStage(b)}`;
  if (b.type === 'bazaar') return `bazaar.s${bazaarStage(b)}`;
```

After:

```js
// The art slot a building shows: houses by tier, granaries, storehouses and bazaars by how full they are
// (stages.js), and farms by their crop's growth, which runs on the game day, so a farm needs the world (without
// one, its plain type slot). Everything else is its type.
export function slotFor(b, world = null) {
  if (b.type === 'house') return `house.t${b.tier}`;
  if (b.type === 'granary') return `granary.s${granaryStage(b)}`;
  if (b.type === 'storehouse') return `storehouse.s${storehouseStage(b)}`;
  if (b.type === 'bazaar') return `bazaar.s${bazaarStage(b)}`;
```

(The farm line and `return b.type;` stay as Task 10 left them.)

- [ ] **Step 4: Run the tests to see them pass**

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "industry art"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "art bounds"
```

Expected: `7 passed, 0 failed` and `ALL PASSED`, then the bounds test passes with the 12 new slots in it.

- [ ] **Step 5: Update the existing tests this breaks**

None. `grep -rn "slotFor\|Object.keys(ART\|SERVICE_ART\|storehouse" tests/` finds nothing that counts `ART`'s slots or lists every type: `servicesArt.test.js` counts `SERVICE_ART` only (unchanged here), `lifeArt.test.js`'s slot-name test covers granaries, bazaars, farms, houses and wells, and the renderer and picking read `ART[slotFor(b)]`, so a storehouse picks up its stage slot by itself. The overlay pass (`overlays.js`) calls `slotFor(b)` without a world, which for a storehouse still gives a stage slot of the same size and height.

- [ ] **Step 6: Visual check**

Run from `C:\dev\thebes`, with `$sheet` and `$place` defined as in Task 10's Step 6 (paste those two lines first).

```powershell
$ind = 'window.__S = 4; window.__X0 = 150; window.__Y0 = 110; window.__DX = 310; window.__DY = 260; window.__ROWS = [[`clay_pit`, `potter`, `brewery`, `weaver`], [`gem_mine`, `jeweller`, `trading_post`, `storehouse.s0`], [`storehouse.s1`, `storehouse.s2`, `storehouse.s3`]]; ' + $sheet
$t11 = 'window.__AREA = [16, 5]; window.__PUT = [[`clay_pit`, 0, 0], [`potter`, 2, 0], [`brewery`, 4, 0], [`weaver`, 6, 0], [`gem_mine`, 8, 0], [`jeweller`, 10, 0], [`trading_post`, 12, 0], [`storehouse`, 14, 0, { store: { pottery: 700 } }], [`storehouse`, 0, 3, { store: {} }], [`storehouse`, 2, 3, { store: { clay: 150 } }], [`storehouse`, 4, 3, { store: { clay: 400 } }], [`farm_barley`, 6, 3], [`farm_flax`, 8, 3]]; '
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7' -Out docs/superpowers/notes/screenshots/raw/s2-t11-industry-z2.png -Width 1280 -Height 800 -BudgetMs 300 -Eval $ind
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7' -Out docs/superpowers/notes/screenshots/raw/s2-t11-game-z1.png -Width 1280 -Height 800 -BudgetMs 1500 -Eval ($t11 + 'window.__Z = 1; ' + $place)
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?skipTitle=1&nosw=1&seed=7' -Out docs/superpowers/notes/screenshots/raw/s2-t11-game-z2.png -Width 1280 -Height 800 -BudgetMs 1500 -Eval ($t11 + 'window.__Z = 2; ' + $place)
```

What to look for:
- `s2-t11-industry-z2.png`: each of the eight reads as its trade without a label: a brown pit with a digger and rows of bricks; a white workshop, a glowing kiln with grey-white smoke and neat rows of orange pots; white brewhouse and three dark-topped vats; looms and coloured cloth; a stepped rock outcrop with a winch and white glints over coloured gems; a white shop with a gold sign on its roof and a purple striped awning; two striped tents, a tall teal flag and two donkeys. Every one flies the same mauve-brown pennant. The storehouse row goes from an empty yard to one crowded with crates stacked two high.
- Nothing reaches past its 2×2 footprint's walls except the smoke, the flag and the pennants, which rise above it; no part of a pit, a cloth or a crate shows through a wall in front of it.
- `s2-t11-game-z1.png` and `-z2.png`, in the game: the buildings sit in depth order with their ground shadows, the three storehouses on the second row show three different stock levels (empty, s1, s2) beside the full one on the first, and the barley and flax farms beside them fly the same pennant as the workshops.

- [ ] **Step 7: Full suite**

```powershell
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED`, with the 19 new tests of Tasks 9-11 counted.

- [ ] **Step 8: Commit**

```powershell
git add src/render/art/industry.js src/render/art/stages.js src/render/art/registry.js tests/render/industryArt.test.js tests/all.js sw-files.js
git commit -m @'
Draw the workshops, the storehouse and the trading post

A clay pit, potter, brewery, weaver, gem mine and jeweller, each showing its
trade at phone zoom, a storehouse whose yard fills in four steps, and a
trading post with striped tents, a flag and tethered donkeys. Every one
flies a pennant in the industry tint.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 12: Interface: categories, cards, New badges, workshop and storehouse sheets

> **Controller rulings (add to this task).** (1) `showMeTarget` in `src/ui/goalsList.js` learns the target `'rocky'` (Task 8's jewellery goal): the rocky tile nearest the city's focus (read rocky ground the way `canPlace` checks a gem mine's terrain); add a test. (2) Task 8 added a `PLANNED` category map to `tests/sim/goalsV2.test.js` until `CATEGORIES` held the Stage 2 buildings; remove `PLANNED` and check against `CATEGORIES`. (3) If `tests/ui/createUI.test.js` fails, fix first any failing assertion that sits outside `try/finally`: it leaves a page mounted and makes dozens of later interface tests fail.


**Files:**
- Modify: `src/data/ui.js` (`CATEGORIES`, the `visibleCategories` comment), `src/sim/progression.js` (`updateMilestone` fills `newItems`), `src/sim/commands.js` (`place` takes the type out of `newItems`)
- Modify: `src/ui/cards.js` (whole file), `src/ui/dock.js`, `src/ui/sidePanel.js`, `src/ui/rail.js` (category buttons from `shownCategories`, rebuilt on change)
- Modify: `src/ui/text.js` (goods names and lines, workshop status words, producer warnings, alert words for `no_input`, `no_storage`, `storage_full`, the booth's effect, card and storage strings, the storehouse tip), `src/ui/sheets.js` (workshop status line, stock rows by name, storage section with accept switches), `src/ui/placement.js` (warnings named by the building), `src/ui/nudge.js` (fix prices), `src/ui/createUI.js` (number keys, the storehouse tip), `css/ui.css`, `sw-files.js` (regenerated)
- Create tests: `tests/sim/newItems.test.js`, `tests/ui/stage2Cards.test.js`
- Modify tests: `tests/all.js`, `tests/ui/cards.test.js`, `tests/ui/cardThumbs.test.js`, `tests/ui/dock.test.js`, `tests/ui/panels.test.js`, `tests/ui/createUI.test.js`, `tests/ui/costsUi.test.js` (Task 1's)

**Interfaces:**
- Consumes: `BUILDINGS` (Task 2: the fourteen buildings, `produces`, `consumes`, `stores`, `producerReach`), `GOODS` with `name` and `kind`, `MILESTONES` with the Stage 2 unlocks, `PARTNERS` (`buys`, `sells`), `TIERS` 5-9; `costOf`, `roadCostOf` (Task 1); `world.newItems` (Task 1); `storeAccepts`, `storeTotal`, `setAccept`, `b.blocked === 'no_input'` and the `no_input` / store `storage_full` alerts (Task 3); `TIPS` trigger `storehousePlaced` (Task 8); art slots for every new type (Tasks 9-11, for card pictures).
- Produces: `CATEGORIES` per the contract; `updateMilestone` adds each passed milestone's unlocks to `world.newItems` (once, in data order) and `place` removes the placed type; `cardShown`, `shownItems`, `shownCategories`, `cardInfo(...).isNew` and the card's "New" badge; text helpers `goodName`, `goodLine`, `partnerName`, `PARTNER_NAMES`, `listText`, `makerOf`, `storeFor`, `workingText`, `waitingText`, `warningText(code, type)`; the building sheet's `.work-status` line and storage section (`.store-goods`, `.switch.accept[data-good]`).

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/newItems.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { MILESTONES } from '../../src/data/progression.js';
import { updateMilestone } from '../../src/sim/progression.js';
import { place } from '../../src/sim/commands.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

const unlocksOf = (...ids) => ids.flatMap((id) => MILESTONES.find((m) => m.id === id).unlocks);

describe('sim new items', () => {
  it("adds a milestone's unlocks to newItems once, in order, and placing one takes it out", () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(w.newItems).toEqual([]);
    const home = addRaw(w, 'house', 12, 9, { tier: 1, residents: 150 });
    expect(updateMilestone(w)).toBe(true);
    expect(w.newItems).toEqual(unlocksOf('town'));
    expect(updateMilestone(w)).toBe(false);
    expect(w.newItems).toEqual(unlocksOf('town'));                                   // never twice
    expect(place(w, 'clay_pit', 16, 11).ok).toBe(true);
    const left = unlocksOf('town').filter((t) => t !== 'clay_pit');
    expect(w.newItems).toEqual(left);
    expect(place(w, 'clay_pit', 20, 11).ok).toBe(true);                             // a second one changes nothing
    expect(w.newItems).toEqual(left);
    home.residents = MILESTONES.find((m) => m.id === 'city').population;           // straight past Market town to City
    expect(updateMilestone(w)).toBe(true);
    expect(w.milestone).toBe('city');
    expect(w.newItems).toEqual([...left, ...unlocksOf('market_town', 'city')]);
  });
  it('leaves newItems alone when a building that was never new is placed, or a placement fails', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    w.newItems = ['potter'];
    expect(place(w, 'well', 12, 11).ok).toBe(true);
    expect(place(w, 'potter', 12, 11).ok).toBe(false);                              // locked at Village, and the tile is taken
    expect(w.newItems).toEqual(['potter']);
  });
});
```

Create `tests/ui/stage2Cards.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { cardInfo, renderCards, cardShown, shownItems, shownCategories } from '../../src/ui/cards.js';
import { CATEGORIES } from '../../src/data/ui.js';
import { MILESTONES } from '../../src/data/progression.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { GOODS } from '../../src/data/goods.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
import { updateMilestone } from '../../src/sim/progression.js';
import { produceDay } from '../../src/sim/production.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { settle } from '../../src/sim/settle.js';
import { buildingAt } from '../../src/sim/world.js';
import { problemMarkers } from '../../src/render/overlays.js';
import { alertText, warningText, effectText, goodLine, goodName, workingText, waitingText, TIP_TEXT, T } from '../../src/ui/text.js';
import { select } from '../../src/ui/modes.js';
import { nudgeLineText } from '../../src/ui/nudge.js';
import { costOf } from '../../src/sim/costs.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { mount, fire, key } from '../helpers/dom.js';
import { rigUI, uiWorld } from '../helpers/uiWorld.js';

const ids = (list) => list.map((c) => c.id);
const catsOf = (r, sel) => [...r.root.querySelectorAll(sel)].map((b) => b.dataset.category);
const SHOWN = ['roads', 'homes', 'food', 'industry', 'services'];

describe('ui stage 2 cards', () => {
  it('shows what is unlocked and what the next milestone brings, locked, and hides the rest', () => {
    const w = makeTestWorld();
    expect(ids(shownCategories(w))).toEqual(SHOWN);                                 // Industry shows at Village: its Town cards, locked
    expect(shownItems(w, 'homes')).toEqual(['house', 'garden', 'statue']);
    expect(shownItems(w, 'food')).toEqual(['farm_grain', 'farm_fig', 'granary']);
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'storehouse']);
    expect(shownItems(w, 'services')).toEqual(['well', 'bazaar', 'temple', 'booth']);
    expect([cardInfo(w, 'garden').locked, cardInfo(w, 'statue').locked, cardInfo(w, 'potter').lockText]).toEqual([false, true, 'Unlocks at Town']);
    w.milestone = 'town';
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'storehouse', 'trading_post']);
    expect(cardInfo(w, 'trading_post').lockText).toBe('Unlocks at Market town');
    w.milestone = 'market_town';
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'farm_barley', 'brewery', 'storehouse', 'trading_post']);
    w.milestone = 'city';
    expect(shownItems(w, 'industry').filter((i) => cardInfo(w, i).locked)).toEqual(['farm_flax', 'weaver']);
    expect(shownItems(w, 'industry').includes('gem_mine')).toBe(false);              // Capital's cards stay hidden until Great city
    w.milestone = 'capital';
    for (const c of CATEGORIES) {
      expect([c.id, shownItems(w, c.id)]).toEqual([c.id, c.items]);
      for (const item of c.items) expect([item, cardInfo(w, item).locked]).toEqual([item, false]);
    }
    expect(cardShown(w, 'road') && cardShown(w, 'demolish')).toBe(true);
  });
  it('puts every building in exactly one category and unlocks each at a milestone', () => {
    for (const type of Object.keys(BUILDINGS)) {
      expect([type, CATEGORIES.filter((c) => c.items.includes(type)).length]).toEqual([type, 1]);
      expect([type, MILESTONES.some((m) => m.unlocks.includes(type))]).toEqual([type, true]);
    }
  });
  it('adds a category button in the dock, rail and panel when a milestone gives it a card, and its number key follows', async () => {
    const defence = CATEGORIES.find((c) => c.id === 'defence');
    const r = await rigUI({ width: 390, height: 844 });
    try {
      defence.items.push('trading_post');                                            // stands in for Stage 3: a defence card that comes with Market town
      r.ui.refresh();
      for (const sel of ['#dock .cat', '#rail .cat', '#panel .tab']) expect([sel, catsOf(r, sel)]).toEqual([sel, SHOWN]);
      key(r.root, '6');
      expect(r.store.get().category).toBe('roads');                                  // nothing to show there yet: ignored
      r.world.milestone = 'town';                                                    // Market town is next: its card shows, locked
      r.ui.refresh();
      for (const sel of ['#dock .cat', '#rail .cat', '#panel .tab']) expect([sel, catsOf(r, sel)]).toEqual([sel, [...SHOWN, 'defence']]);
      expect(r.root.querySelector('#rail .bottom').previousElementSibling.dataset.category).toBe('defence');   // the rail keeps x and tick below its categories
      key(r.root, '6');
      expect(r.store.get().category).toBe('defence');
      expect(r.root.querySelector('#dock .tray [data-item="trading_post"]').getAttribute('aria-disabled')).toBe('true');
    } finally { defence.items.pop(); r.cleanup(); }
  });
  it("marks a milestone's new buildings New, in words, until one is placed", async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      buildingAt(r.world, 12, 9).residents = MILESTONES.find((m) => m.id === 'town').population;
      updateMilestone(r.world);
      r.ui.refresh();
      fire(r.root.querySelector('#dock .cat[data-category="industry"]'), 'click');
      const card = (item) => r.root.querySelector(`#dock .tray [data-item="${item}"]`);
      expect(card('clay_pit').querySelector('.new-badge').textContent).toBe(T.newBadge);
      expect(card('clay_pit').textContent).toContain(T.newBadge);                    // part of the card's name, so not colour alone
      expect(card('trading_post').querySelector('.new-badge')).toBe(null);           // locked: next milestone, not new
      expect(cardInfo(r.world, 'potter').isNew).toBe(true);
      r.ui.placement.start({ kind: 'building', type: 'clay_pit' }, { x: 17, y: 11 });
      expect(r.ui.placement.confirm().ok).toBe(true);
      expect(r.world.newItems.includes('clay_pit')).toBe(false);
      expect(card('clay_pit').querySelector('.new-badge')).toBe(null);
      expect(card('potter').querySelector('.new-badge')).toBeTruthy();
    } finally { r.cleanup(); }
  });
  it('shows a New badge only on an unlocked card', () => {
    const { root, cleanup } = mount();
    try {
      const w = makeTestWorld();
      w.newItems = ['statue'];
      renderCards(root, { world: w, category: 'homes', onPick: () => {} });
      expect(root.querySelector('[data-item="statue"] .new-badge')).toBe(null);      // a Village city has not unlocked it
      w.milestone = 'town';
      renderCards(root, { world: w, category: 'homes', onPick: () => {} });
      expect(root.querySelector('[data-item="statue"]').classList.contains('new')).toBe(true);
      expect(root.querySelector('[data-item="garden"] .new-badge')).toBe(null);
    } finally { cleanup(); }
  });
  it('says what a workshop is doing, names its input when it waits, and flags it on the map', async () => {
    const w = makeTestWorld();
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    const store = addRaw(w, 'storehouse', 12, 11, { store: { clay: 3 } });
    const potter = addRaw(w, 'potter', 16, 11);
    staffAll(w);
    produceDay(w);
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), potter.id));
      expect(r.root.querySelector('#sheet .work-status').textContent).toBe('Making pottery from clay');
      store.store.clay = 0;
      produceDay(w);
      r.ui.refresh();
      expect(potter.blocked).toBe('no_input');
      expect(r.root.querySelector('#sheet .work-status').textContent).toBe(waitingText('clay'));
      const problem = r.root.querySelector('#sheet .problem');
      expect(problem.textContent).toContain('Potter has no clay in reach');
      expect(problem.textContent).toContain(`Store clay within ${BUILDINGS.potter.producerReach} road tiles: a clay pit fills a storehouse`);
      expect(problemMarkers(w, alertsFor(w)).some((m) => m.id === potter.id && m.kind === 'problem')).toBe(true);
      potter.paused = true;
      r.ui.refresh();
      expect(r.root.querySelector('#sheet .work-status').textContent).toBe(T.notWorking);
      r.store.set(select(r.store.get(), store.id));
      expect(r.root.querySelector('#sheet .work-status')).toBe(null);                // storage makes nothing
    } finally { r.cleanup(); }
  });
  it("lists a storehouse's goods as switches that accept or refuse each one through the sim, and a granary's as rows", async () => {
    const w = uiWorld();
    w.milestone = 'town';
    const sh = addRaw(w, 'storehouse', 17, 11, { store: { pottery: 12 } });
    staffAll(w);
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), sh.id));
      const switches = [...r.root.querySelectorAll('#sheet .store-goods .switch')];
      expect(switches.map((s) => s.dataset.good)).toEqual(BUILDINGS.storehouse.stores);
      const pottery = r.root.querySelector('#sheet .switch[data-good="pottery"]');
      expect([pottery.getAttribute('role'), pottery.getAttribute('aria-checked'), pottery.querySelector('.state').textContent]).toEqual(['switch', 'true', T.accepted]);
      expect(pottery.textContent.startsWith(`${goodName('pottery')} 12`)).toBe(true);
      expect(pottery.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(pottery.closest('li').querySelector('.good-line').textContent).toBe(goodLine('pottery'));
      expect([...r.root.querySelectorAll('#sheet .row')].some((row) => row.textContent === `${T.stored}12 of ${BUILDINGS.storehouse.capacity}`)).toBe(true);
      pottery.focus();
      fire(pottery, 'click');
      expect(sh.accepts.pottery).toBe(false);
      const again = r.root.querySelector('#sheet .switch[data-good="pottery"]');
      expect([again.getAttribute('aria-checked'), again.querySelector('.state').textContent]).toEqual(['false', T.refused]);
      expect(document.activeElement).toBe(again);                                    // the rebuilt sheet keeps keyboard focus
      fire(again, 'click');
      expect(sh.accepts.pottery).toBe(true);
      r.store.set(select(r.store.get(), buildingAt(w, 6, 11).id));                    // the granary
      expect(r.root.querySelectorAll('#sheet .store-goods .switch').length).toBe(0);
      expect([...r.root.querySelectorAll('#sheet .store-goods li')].map((li) => li.dataset.good)).toEqual(BUILDINGS.granary.stores);
    } finally { r.cleanup(); }
  });
  it("words storage and input problems, and a producer's warnings, by its own goods", () => {
    const w = makeTestWorld();
    const farm = addRaw(w, 'farm_grain', 0, 0), fig = addRaw(w, 'farm_fig', 0, 4), potter = addRaw(w, 'potter', 10, 0), sh = addRaw(w, 'storehouse', 14, 0);
    const reach = BUILDINGS.potter.producerReach;
    expect(alertText({ code: 'no_storage', id: farm.id }, w)).toEqual({ title: 'Grain farm has nowhere to store its grain', fix: `Build a granary within ${BUILDINGS.farm_grain.producerReach} road tiles` });
    expect(alertText({ code: 'no_storage', id: potter.id }, w)).toEqual({ title: 'Potter has nowhere to store its pottery', fix: `Build a storehouse within ${reach} road tiles` });
    expect(alertText({ code: 'no_storage', id: fig.id }, w).title).toBe('Fig orchard has nowhere to store its figs');
    expect(alertText({ code: 'storage_full', id: farm.id }, w).fix).toBe('Build another granary nearby');
    expect(alertText({ code: 'storage_full', id: potter.id }, w).fix).toBe('Build another storehouse nearby');
    expect(alertText({ code: 'storage_full', id: sh.id }, w)).toEqual({ title: 'Storehouse is full', fix: 'Build another storehouse nearby' });
    expect(alertText({ code: 'no_input', id: potter.id }, w)).toEqual({ title: 'Potter has no clay in reach', fix: `Store clay within ${reach} road tiles: a clay pit fills a storehouse` });
    for (const [type, title, maker] of [['brewery', 'Brewery has no barley in reach', 'a barley farm'], ['weaver', 'Weaver has no flax in reach', 'a flax farm'], ['jeweller', 'Jeweller has no gems in reach', 'a gem mine']]) {
      const b = addRaw(w, type, 20, 20);
      const t = alertText({ code: 'no_input', id: b.id }, w);
      expect([type, t.title, t.fix.includes(maker)]).toEqual([type, title, true]);
    }
    expect(warningText('no_storage', 'potter')).toBe('No storehouse within reach');
    expect(warningText('no_storage', 'farm_grain')).toBe('No granary within reach');
    expect(warningText('no_storage')).toBe('No granary within reach');
    expect(warningText('no_input', 'weaver')).toBe('No flax in reach yet');
    expect(effectText('booth', 3)).toBe('Entertains 3 homes');
  });
  it("prices the nudge's fix for a store or an input by the building that fixes it", () => {
    const w = makeTestWorld();
    w.milestone = 'town';
    const sh = addRaw(w, 'storehouse', 14, 0), potter = addRaw(w, 'potter', 10, 0), farm = addRaw(w, 'farm_grain', 0, 0);
    const line = (a) => nudgeLineText(w, [a], null);
    const said = (a) => { const t = alertText(a, w); return `${T.next}: ${t.title}. ${t.fix}`; };
    w.gold = costOf(w, 'storehouse');                                               // less than a granary costs
    expect(costOf(w, 'storehouse')).toBeLessThan(costOf(w, 'granary'));
    for (const a of [{ code: 'storage_full', id: sh.id }, { code: 'no_storage', id: potter.id }]) expect(line(a)).toBe(said(a));
    expect(line({ code: 'no_storage', id: farm.id })).toBe('');                      // a granary is out of reach
    w.gold = costOf(w, 'clay_pit') - 1;
    expect(line({ code: 'no_input', id: potter.id })).toBe('');
    w.gold = costOf(w, 'clay_pit');
    expect(line({ code: 'no_input', id: potter.id })).toBe(said({ code: 'no_input', id: potter.id }));
  });
  it('gives every good its name and a line saying what makes it, what uses it and who trades it', () => {
    expect(goodLine('pottery')).toBe('Pottery: made by potters from clay; used by Townhouses and up; sold to Memphis and Byblos');
    expect(goodLine('clay')).toBe('Clay: made by clay pits; used by potters; bought from Memphis');
    expect(goodLine('grain')).toBe('Grain: made by grain farms; used by Cottages and up; sold to Memphis');
    expect(goodLine('beer')).toBe('Beer: made by breweries from barley; used by Fine manors and up; sold to Memphis; bought from Byblos');
    for (const g of Object.keys(GOODS)) {
      expect([g, goodName(g)]).toEqual([g, GOODS[g].name]);
      expect([g, goodLine(g).startsWith(`${GOODS[g].name}: made by `), goodLine(g).includes('used by')]).toEqual([g, true, true]);
    }
    expect([workingText('farm_fig'), workingText('clay_pit'), workingText('gem_mine'), workingText('weaver')]).toEqual(['Growing figs', 'Digging clay', 'Mining gems', 'Making linen from flax']);
  });
  it('brings the storehouse tip once one is placed and the tool closes', async () => {
    let t = 0;
    const r = await rigUI({ now: () => t });
    try {
      settle(r.world, []);
      r.world.milestone = 'town';
      t = TIP_FIRST_DELAY_MS;
      r.ui.placement.start({ kind: 'building', type: 'storehouse' }, { x: 17, y: 11 });
      expect(r.ui.placement.confirm().ok).toBe(true);
      r.ui.placement.cancel();
      const tip = TIPS.find((x) => x.trigger === 'storehousePlaced');
      expect(r.ui.tips.current()).toBe(tip.id);
      expect(r.root.querySelector('#tip .text').textContent).toBe(TIP_TEXT[tip.id]);
    } finally { r.cleanup(); }
  });
});
```

Add to the end of `tests/all.js`:

```js
import './sim/newItems.test.js';
import './ui/stage2Cards.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "stage 2 cards"`
Expected: `LOAD ERROR` with `The requested module '../../src/ui/cards.js' does not provide an export named 'cardShown'` (the whole page fails to load until `cards.js` exports it). With only that export stubbed, the category, badge, workshop and storehouse tests fail on missing cards, badges, `.work-status` and switches.

- [ ] **Step 3: Implement**

**`src/data/ui.js`.** Replace the `CATEGORIES` block (whatever an earlier task left in it) and the comment above `visibleCategories`:

```js
export const CATEGORIES = [
  { id: 'roads', items: ['road', 'demolish'] },
  { id: 'homes', items: ['house', 'garden', 'statue'] },
  { id: 'food', items: ['farm_grain', 'farm_fig', 'granary'] },
  { id: 'industry', items: ['clay_pit', 'potter', 'farm_barley', 'brewery', 'farm_flax', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post'] },
  { id: 'services', items: ['well', 'bazaar', 'temple', 'booth'] },
  { id: 'defence', items: [] },
  { id: 'monuments', items: [] },
];
```

Replace:

```js
// Categories with nothing to build stay hidden until a stage fills them; the number keys keep their own mapping.
export const visibleCategories = () => CATEGORIES.filter((c) => c.items.length > 0);
```

with:

```js
// The categories a stage has filled. Which of them show in a city, and which of their cards, depends on its
// milestone (src/ui/cards.js: shownCategories, shownItems); the number keys keep their own mapping.
export const visibleCategories = () => CATEGORIES.filter((c) => c.items.length > 0);
```

**`src/sim/progression.js`.** Replace `updateMilestone`:

```js
// Reaching a milestone (spec 4.14) adds what it unlocks to world.newItems, once each and in the data's order, so
// their cards say "New" until one of them is placed (place in commands.js takes the type out). A city that passes
// two milestones in one month gets both lists.
export function updateMilestone(world) {
  const pop = population(world);
  const from = milestoneIndex(world.milestone);
  let i = from;
  while (i + 1 < MILESTONES.length && pop >= MILESTONES[i + 1].population) i++;
  const changed = MILESTONES[i].id !== world.milestone;
  for (let k = from + 1; k <= i; k++) {
    for (const type of MILESTONES[k].unlocks) if (!world.newItems.includes(type)) world.newItems.push(type);
  }
  world.milestone = MILESTONES[i].id;
  return changed;
}
```

**`src/sim/commands.js`.** In `place`, replace its last line:

```js
  return { ok: true, id: b.id, warnings: check.warnings };
```

with:

```js
  const fresh = world.newItems.indexOf(type);       // its card stops saying "New" (spec 4.14)
  if (fresh >= 0) world.newItems.splice(fresh, 1);
  return { ok: true, id: b.id, warnings: check.warnings };
```

**`src/ui/cards.js`.** Replace the whole file. `cardInfo`'s cost lines are Task 1's (`costOf`, `roadCostOf`); if Task 1 worded them differently, keep Task 1's cost lines and add the `isNew` line and field.

```js
// Building cards (spec 6.3, early-game pass 2.5): the building's picture, its name and its cost with a coin;
// coral with a coin-slash when unaffordable; a lock and the unlock condition when locked; a "New" badge while a
// milestone's new building waits to be placed (spec 4.14). Shared by the dock tray, the side panel grid and the
// rail drawer.
import { BUILDINGS } from '../data/buildings.js';
import { MILESTONES } from '../data/progression.js';
import { isUnlocked, milestoneIndex } from '../sim/progression.js';
import { canAfford } from '../sim/money.js';
import { costOf, roadCostOf } from '../sim/costs.js';
import { CATEGORIES } from '../data/ui.js';
import { buildingName, unlockText, T } from './text.js';
import { el, clear } from './components.js';
import { drawThumb } from './thumbs.js';

const deviceRatio = () => Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);

// Which cards a tray shows (spec 4.14): everything unlocked, and what the next milestone unlocks (locked, with its
// condition); buildings of later milestones stay hidden, so the tray never fills with grey. Roads and demolish
// always show.
export function cardShown(world, item) {
  if (!BUILDINGS[item] || isUnlocked(world, item)) return true;
  const next = MILESTONES[milestoneIndex(world.milestone) + 1];
  return Boolean(next && next.unlocks.includes(item));
}

export function shownItems(world, category) {
  const cat = CATEGORIES.find((c) => c.id === category);
  return cat ? cat.items.filter((item) => cardShown(world, item)) : [];
}

// A category shows when it has a card to show: one of its buildings is unlocked or comes with the next milestone.
export const shownCategories = (world) => CATEGORIES.filter((c) => shownItems(world, c.id).length > 0);

// Costs are this city's (difficulty included: spec 4.18), the same the commands charge.
export function cardInfo(world, item) {
  let cost = 0, suffix = '', costText;
  if (item === 'road') { cost = roadCostOf(world); suffix = ' per tile'; }
  else if (item === 'house') { cost = costOf(world, 'house'); suffix = ' per plot'; }
  else if (item !== 'demolish') cost = costOf(world, item);
  costText = item === 'demolish' ? 'Refunds a quarter' : `${cost} gold${suffix}`;
  const locked = Boolean(BUILDINGS[item]) && !isUnlocked(world, item);
  const isNew = !locked && (world.newItems || []).includes(item);
  return { item, name: buildingName(item), cost, costText, affordable: canAfford(world, cost), locked, lockText: locked ? unlockText(item) : '', isNew };
}

export function activeItemOf(tool) {
  if (!tool) return null;
  if (tool.kind === 'building') return tool.type;
  if (tool.kind === 'houses') return 'house';
  return tool.kind;   // 'road' or 'demolish'
}

// What a tray of cards shows: its category, the active card and each shown card's affordable, locked and new state.
// The dock, the side panel and the rail rebuild their cards (and so their pictures) only when this key changes, so
// a command that spends a little gold but leaves every card as it was rebuilds nothing.
export function cardsKey(world, category, activeItem) {
  const states = shownItems(world, category).map((item) => {
    const i = cardInfo(world, item);
    return `${item}:${i.affordable ? 'a' : 'u'}${i.locked ? 'l' : 'o'}${i.isNew ? 'n' : ''}`;
  });
  return `${category}|${activeItem}|${states.join(',')}`;
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
  const items = shownItems(world, category);
  if (!items.length) { container.append(el('p', { class: 'empty', text: T.comingLater })); return []; }
  const dpr = deviceRatio();
  const buttons = items.map((item) => {
    const info = cardInfo(world, item);
    const cls = ['card', info.affordable ? '' : 'unaffordable', info.locked ? 'locked' : '', info.isNew ? 'new' : ''].filter(Boolean).join(' ');
    const thumb = drawThumb(el('canvas', { class: 'thumb', 'aria-hidden': 'true' }), item, dpr);
    // The badge is a word, part of the card's name for screen readers, so the colour never says it alone.
    const badge = info.isNew ? el('span', { class: 'new-badge', text: T.newBadge }) : null;
    const b = el('button', { type: 'button', class: cls, dataset: { item }, 'aria-pressed': String(activeItem === item), 'aria-disabled': info.locked ? 'true' : null }, [
      thumb, el('span', { class: 'name', text: info.name }), el('span', { class: 'cost' }, costLine(info)), badge,
    ]);
    if (!info.locked) b.addEventListener('click', () => onPick(item));
    return b;
  });
  container.append(...buttons);
  if (focusedItem) { const again = buttons.find((b) => b.dataset.item === focusedItem); if (again) again.focus(); }
  return buttons;
}
```


**`src/ui/dock.js`.** Replace the imports:

```js
import { visibleCategories, CATEGORY_ICONS, CATEGORY_TINT } from '../data/ui.js';
import { pickCategory, setDock } from './modes.js';
import { renderCards, activeItemOf, cardsKey } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, button, icon } from './components.js';
```

with:

```js
import { CATEGORY_ICONS, CATEGORY_TINT } from '../data/ui.js';
import { pickCategory, setDock } from './modes.js';
import { renderCards, activeItemOf, cardsKey, shownCategories } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, button, icon, clear } from './components.js';
```

Replace:

```js
  const pill = button(T.build, { class: 'pill primary' });
  const shown = visibleCategories();            // empty categories stay hidden until a stage fills them (early-game pass 2.5)
  const catButtons = shown.map((c) => {
    const b = el('button', { type: 'button', class: 'cat', dataset: { category: c.id }, 'aria-pressed': 'false' }, [icon(CATEGORY_ICONS[c.id]), el('span', { text: CATEGORY_NAMES[c.id] })]);
    b.style.setProperty('--tint', CATEGORY_TINT[c.id]);
    b.addEventListener('click', () => {
      const s = store.get();
      if (s.dock === 'tray' && s.category === c.id) store.set(setDock(s, 'slim'));
      else store.set(pickCategory(s, c.id));
    });
    return b;
  });
  cats.append(...catButtons);
```

with:

```js
  const pill = button(T.build, { class: 'pill primary' });
  // Only categories with a card to show have a button (spec 4.14). The set can grow at a milestone, so it is
  // rebuilt when it changes, keeping keyboard focus on the same category.
  let shown = [], shownKey = null, catButtons = [];
  function buildCats() {
    const next = shownCategories(world);
    const key = next.map((c) => c.id).join(',');
    if (key === shownKey) return;
    const focused = cats.contains(document.activeElement) ? document.activeElement.dataset.category : null;
    shownKey = key;
    shown = next;
    catButtons = shown.map((c) => {
      const b = el('button', { type: 'button', class: 'cat', dataset: { category: c.id }, 'aria-pressed': 'false' }, [icon(CATEGORY_ICONS[c.id]), el('span', { text: CATEGORY_NAMES[c.id] })]);
      b.style.setProperty('--tint', CATEGORY_TINT[c.id]);
      b.addEventListener('click', () => {
        const s = store.get();
        if (s.dock === 'tray' && s.category === c.id) store.set(setDock(s, 'slim'));
        else store.set(pickCategory(s, c.id));
      });
      return b;
    });
    clear(cats);
    cats.append(...catButtons);
    const again = focused && catButtons.find((b) => b.dataset.category === focused);
    if (again) again.focus();
  }
```

and make `render` build them first; replace:

```js
  function render() {
    const s = store.get();
    container.dataset.height = s.dock;
```

with:

```js
  function render() {
    buildCats();
    const s = store.get();
    container.dataset.height = s.dock;
```

**`src/ui/sidePanel.js`.** Replace the imports:

```js
import { visibleCategories, CATEGORY_TINT } from '../data/ui.js';
import { renderCards, activeItemOf, cardsKey } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, button, iconButton } from './components.js';
```

with:

```js
import { CATEGORY_TINT } from '../data/ui.js';
import { renderCards, activeItemOf, cardsKey, shownCategories } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, button, iconButton, clear } from './components.js';
```

Replace:

```js
  const shown = visibleCategories();            // empty categories stay hidden until a stage fills them (early-game pass 2.5)
  const tabButtons = shown.map((c) => {
    const b = button(CATEGORY_NAMES[c.id], { class: 'tab', dataset: { category: c.id }, 'aria-pressed': 'false', onClick: () => store.set({ category: c.id }) });
    b.style.setProperty('--tint', CATEGORY_TINT[c.id]);
    return b;
  });
  const tabs = el('div', { class: 'tabs' }, tabButtons);
```

with:

```js
  const tabs = el('div', { class: 'tabs' });
  // A tab per category with a card to show (spec 4.14), rebuilt when that set changes at a milestone.
  let shown = [], shownKey = null, tabButtons = [];
  function buildTabs() {
    const next = shownCategories(world);
    const key = next.map((c) => c.id).join(',');
    if (key === shownKey) return;
    const focused = tabs.contains(document.activeElement) ? document.activeElement.dataset.category : null;
    shownKey = key;
    shown = next;
    tabButtons = shown.map((c) => {
      const b = button(CATEGORY_NAMES[c.id], { class: 'tab', dataset: { category: c.id }, 'aria-pressed': 'false', onClick: () => store.set({ category: c.id }) });
      b.style.setProperty('--tint', CATEGORY_TINT[c.id]);
      return b;
    });
    clear(tabs);
    tabs.append(...tabButtons);
    const again = focused && tabButtons.find((b) => b.dataset.category === focused);
    if (again) again.focus();
  }
```

Replace:

```js
  function render() {
    const s = store.get();
    document.body.classList.toggle('panel-folded', s.panelFolded);
```

with:

```js
  function render() {
    buildTabs();
    const s = store.get();
    document.body.classList.toggle('panel-folded', s.panelFolded);
```

**`src/ui/rail.js`.** Replace the first three imports:

```js
import { visibleCategories, CATEGORY_ICONS, CATEGORY_TINT } from '../data/ui.js';
import { setDock, isToolMode } from './modes.js';
import { renderCards, activeItemOf, cardsKey } from './cards.js';
```

with:

```js
import { CATEGORY_ICONS, CATEGORY_TINT } from '../data/ui.js';
import { setDock, isToolMode } from './modes.js';
import { renderCards, activeItemOf, cardsKey, shownCategories } from './cards.js';
```

Replace:

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
  const drawer = el('div', { class: 'drawer cards', hidden: true });
  const cancel = iconButton(T.cancel, '✕', { class: 'cancel', onClick: onCancel });
  const ok = iconButton(T.confirm, '✓', { class: 'ok primary', onClick: onConfirm });
  const bottom = el('div', { class: 'bottom', hidden: true }, [cancel, ok]);
  container.append(...catButtons, bottom, drawer);
```

with:

```js
  const drawer = el('div', { class: 'drawer cards', hidden: true });
  const cancel = iconButton(T.cancel, '✕', { class: 'cancel', onClick: onCancel });
  const ok = iconButton(T.confirm, '✓', { class: 'ok primary', onClick: onConfirm });
  const bottom = el('div', { class: 'bottom', hidden: true }, [cancel, ok]);
  container.append(bottom, drawer);
  // A button per category with a card to show (spec 4.14), above x and tick; rebuilt when that set changes.
  let shown = [], shownKey = null, catButtons = [];
  function buildCats() {
    const next = shownCategories(world);
    const key = next.map((c) => c.id).join(',');
    if (key === shownKey) return;
    const focused = catButtons.includes(document.activeElement) ? document.activeElement.dataset.category : null;
    shownKey = key;
    shown = next;
    for (const b of catButtons) b.remove();
    catButtons = shown.map((c) => {
      const b = iconButton(CATEGORY_NAMES[c.id], CATEGORY_ICONS[c.id], {
        class: 'cat', dataset: { category: c.id }, 'aria-pressed': 'false',
        onClick: () => {
          const s = store.get();
          if (s.dock === 'tray' && s.category === c.id) store.set(setDock(s, 'slim'));
          else store.set({ category: c.id, dock: 'tray' });
        },
      });
      b.style.setProperty('--tint', CATEGORY_TINT[c.id]);
      container.insertBefore(b, bottom);
      return b;
    });
    const again = focused && catButtons.find((b) => b.dataset.category === focused);
    if (again) again.focus();
  }
```

Replace:

```js
  function render() {
    const s = store.get();
    const open = s.dock === 'tray' && !isToolMode(s.mode) && !s.sheet;
```

with:

```js
  function render() {
    buildCats();
    const s = store.get();
    const open = s.dock === 'tray' && !isToolMode(s.mode) && !s.sheet;
```

**`src/ui/text.js`.** Add two imports after `import { FIRSTS } from '../data/firsts.js';`:

```js
import { GOODS } from '../data/goods.js';
import { PARTNERS } from '../data/trade.js';
```

Directly after the `NEED_NAMES` line, add:

```js

// Goods' names come from the data (GOODS[good].name), as buildings' do; inside a sentence they are lower case.
export const goodName = (good) => (GOODS[good] ? GOODS[good].name : good);
const goodWord = (good) => goodName(good).toLowerCase();

// Trade partners, keyed by the ids in src/data/trade.js.
export const PARTNER_NAMES = { memphis: 'Memphis', byblos: 'Byblos' };
export const partnerName = (id) => PARTNER_NAMES[id] || id;

// "a", "a and b", "a, b and c".
export function listText(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// The building that makes a good and the one that stores it, from the data (null when there is none).
export const makerOf = (good) => Object.keys(BUILDINGS).find((t) => BUILDINGS[t].produces && BUILDINGS[t].produces.good === good) || null;
export const storeFor = (good) => Object.keys(BUILDINGS).find((t) => (BUILDINGS[t].stores || []).includes(good)) || null;
const pluralName = (type) => BUILDING_PLURALS[type] || `${buildingName(type).toLowerCase()}s`;

// Every good's line (spec 4.10): what makes it, what uses it and who trades it, built from the data so it never
// drifts: "Pottery: made by potters from clay; used by Townhouses and up; sold to Memphis and Byblos".
export function goodLine(good) {
  const types = Object.keys(BUILDINGS);
  const makers = types.filter((t) => BUILDINGS[t].produces && BUILDINGS[t].produces.good === good);
  const users = types.filter((t) => BUILDINGS[t].consumes === good);
  const need = GOODS[good] && GOODS[good].kind === 'food' ? 'food' : good;
  const tier = TIERS.findIndex((t) => t && t.needs.includes(need));
  const parts = [];
  if (makers.length) {
    const from = BUILDINGS[makers[0]].consumes;
    parts.push(`made by ${listText(makers.map(pluralName))}${from ? ` from ${goodWord(from)}` : ''}`);
  }
  if (users.length) parts.push(`used by ${listText(users.map(pluralName))}`);
  else if (tier > 0) parts.push(`used by ${TIERS[tier].name}s and up`);
  const buyers = Object.keys(PARTNERS).filter((id) => PARTNERS[id].buys[good]).map(partnerName);
  const sellers = Object.keys(PARTNERS).filter((id) => PARTNERS[id].sells[good]).map(partnerName);
  if (buyers.length) parts.push(`sold to ${listText(buyers)}`);
  if (sellers.length) parts.push(`bought from ${listText(sellers)}`);
  return parts.length ? `${goodName(good)}: ${parts.join('; ')}` : goodName(good);
}

// A producer's status line on its sheet: "Making pottery from clay", "Growing figs", "Digging clay", or, when a
// workshop has nothing to work, "Waiting for clay".
const MAKE_VERBS = { clay: 'Digging', gems: 'Mining' };
export function workingText(type) {
  const def = BUILDINGS[type];
  const good = goodWord(def.produces.good);
  return def.consumes ? `Making ${good} from ${goodWord(def.consumes)}` : `${MAKE_VERBS[def.produces.good] || 'Growing'} ${good}`;
}
export const waitingText = (good) => `Waiting for ${goodWord(good)}`;
```

(`pluralName` reads `BUILDING_PLURALS`, declared further down; it only runs after the module has loaded.)

Replace:

```js
const WARNINGS = { needs_road: 'No road touches it yet', no_storage: 'No granary within reach', no_supply: 'No granary to supply it' };
export const warningText = (code) => WARNINGS[code] || "Won't work yet";
```

with:

```js
const WARNINGS = { needs_road: 'No road touches it yet', no_storage: 'No granary within reach', no_supply: 'No granary to supply it' };
// A producer's warnings name its own storage and input: a potter's ghost says "No storehouse within reach".
export function warningText(code, type = null) {
  const def = type ? BUILDINGS[type] : null;
  if (code === 'no_storage' && def && def.produces) return `No ${buildingName(storeFor(def.produces.good)).toLowerCase()} within reach`;
  if (code === 'no_input' && def && def.consumes) return `No ${goodWord(def.consumes)} in reach yet`;
  return WARNINGS[code] || "Won't work yet";
}
```

Replace the `EFFECTS` line:

```js
const EFFECTS = { well: (homes) => `Gives water to ${homes}`, bazaar: (homes) => `Feeds ${homes}`, temple: (homes) => `Serves ${homes}` };
```

with:

```js
const EFFECTS = { well: (homes) => `Gives water to ${homes}`, bazaar: (homes) => `Feeds ${homes}`, temple: (homes) => `Serves ${homes}`, booth: (homes) => `Entertains ${homes}` };
```

In `alertText`, replace the `no_storage` and `storage_full` cases:

```js
    case 'no_storage': return { title: `${name} has nowhere to store its grain`, fix: `Build a granary within ${b ? BUILDINGS[b.type].producerReach : 12} road tiles` };
    case 'storage_full': return { title: `${name} has no room left in storage`, fix: 'Build another granary nearby' };
```

with:

```js
    case 'no_storage': {
      const def = b ? BUILDINGS[b.type] : null;
      const good = def && def.produces ? def.produces.good : 'grain';
      return { title: `${name} has nowhere to store its ${goodWord(good)}`, fix: `Build a ${buildingName(storeFor(good)).toLowerCase()} within ${def ? def.producerReach : 12} road tiles` };
    }
    case 'storage_full': {
      // Raised on a producer whose stores filled up, and on a store that is full itself.
      const def = b ? BUILDINGS[b.type] : null;
      const store = def && def.stores ? b.type : storeFor(def && def.produces ? def.produces.good : 'grain');
      return { title: def && def.stores ? `${name} is full` : `${name} has no room left in storage`, fix: `Build another ${buildingName(store).toLowerCase()} nearby` };
    }
    case 'no_input': {
      const def = b ? BUILDINGS[b.type] : null;
      const input = def && def.consumes ? def.consumes : null;
      if (!input) return { title: `${name} has nothing to work`, fix: 'Bring what it needs within reach' };
      const maker = makerOf(input), store = storeFor(input);
      return {
        title: `${name} has no ${goodWord(input)} in reach`,
        fix: `Store ${goodWord(input)} within ${def.producerReach} road tiles: a ${buildingName(maker).toLowerCase()} fills a ${buildingName(store).toLowerCase()}`,
      };
    }
```

Replace:

```js
const BUILDING_PLURALS = { well: 'wells', farm_grain: 'grain farms', granary: 'granaries', bazaar: 'bazaars', temple: 'temples' };
```

with:

```js
const BUILDING_PLURALS = { well: 'wells', farm_grain: 'grain farms', granary: 'granaries', bazaar: 'bazaars', temple: 'temples', brewery: 'breweries' };
```

At the end of the `T` object, replace:

```js
  achievements: 'Achievements', achievementsLater: 'Achievements show here once the guide is done.', notYetMet: 'Not yet', closestAchievement: 'Closest achievement',
};
```

with:

```js
  achievements: 'Achievements', achievementsLater: 'Achievements show here once the guide is done.', notYetMet: 'Not yet', closestAchievement: 'Closest achievement',
  newBadge: 'New', stored: 'Stored', accepted: 'Accepted', refused: 'Refused', notWorking: 'Not working',
  acceptHelp: 'Tap a good to accept or refuse it here. A refused good goes to other storage.',
};
```

In `TIP_TEXT`, add this entry (replacing any placeholder Task 8 left for the id):

```js
  storehouse_choices: 'Tap a storehouse to choose its goods: a refused good goes to other storage.',
```


**`src/ui/sheets.js`.** Replace:

```js
import { houseStatus, needCause } from '../sim/housing.js';
import { setPaused } from '../sim/commands.js';
import { assignLabour } from '../sim/labour.js';
```

with:

```js
import { houseStatus, needCause } from '../sim/housing.js';
import { setPaused, setAccept } from '../sim/commands.js';
import { assignLabour, isWorking } from '../sim/labour.js';
import { storeTotal, storeAccepts } from '../sim/production.js';
```

In the `./text.js` import, add `goodName, goodLine, workingText, waitingText` before `T`:

```js
import { buildingName, tierName, NEED_NAMES, MOOD_NAMES, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, causeText, alertText, plural, progressText, achievementsHeading, achievementBarLabel, viewLabel, goodName, goodLine, workingText, waitingText, T } from './text.js';
```

Replace the start of `buildingSheet`:

```js
  function buildingSheet(b) {
    const def = BUILDINGS[b.type];
    const body = el('div', { class: 'body' });
    body.append(row(T.workers, def.workers ? `${b.staff} of ${def.workers}` : T.noWorkersNeeded));
    for (const [good, n] of Object.entries(b.store)) body.append(row(`${T.stock}: ${good}`, String(n)));
    const reach = def.reach || def.supplyReach || def.producerReach;
```

with:

```js
  // A producer says what it is doing in words: making, growing or digging its good, waiting for its input, or not
  // working (the problems below say why).
  function workLine(b) {
    const def = BUILDINGS[b.type];
    if (!def.produces) return null;
    let text = T.notWorking;
    if (isWorking(world, b) && b.blocked === 'no_input') text = waitingText(def.consumes);
    else if (isWorking(world, b) && !b.blocked) text = workingText(b.type);
    return el('p', { class: 'work-status', text });
  }

  // Storage (spec 4.10): how full it is, then a row per good it can hold with its count and the good's line (what
  // makes it, what uses it). A storehouse's rows are switches that accept or refuse the good (setAccept); the state
  // is a word beside the good, so the switch never relies on colour.
  function storeSection(b) {
    const def = BUILDINGS[b.type];
    const switches = b.type === 'storehouse';
    const out = [row(T.stored, progressText(storeTotal(b), def.capacity)), el('h3', { text: T.stock })];
    if (switches) out.push(el('p', { class: 'small muted', text: T.acceptHelp }));
    out.push(el('ul', { class: 'store-goods' }, def.stores.map((good) => {
      const n = String(b.store[good] || 0);
      const line = el('p', { class: 'good-line small muted', text: goodLine(good) });
      if (!switches) return el('li', { dataset: { good } }, [el('div', { class: 'row' }, [el('span', { text: goodName(good) }), el('span', { text: n })]), line]);
      const on = storeAccepts(b, good);
      const sw = el('button', { type: 'button', role: 'switch', class: 'switch accept', 'aria-checked': String(on), dataset: { good } }, [
        el('span', { class: 'good' }, [goodName(good), ' ', el('span', { class: 'count small muted', text: n })]),
        el('span', { class: 'state small', text: on ? T.accepted : T.refused }),
      ]);
      sw.addEventListener('click', () => {
        const r = setAccept(world, b.id, good, !on);
        if (r.ok) { afterCommand({ kind: 'accept', result: r, undoable: false }); render(); }
      });
      return el('li', { dataset: { good } }, [sw, line]);
    })));
    return out;
  }

  function buildingSheet(b) {
    const def = BUILDINGS[b.type];
    const body = el('div', { class: 'body' });
    const work = workLine(b);
    if (work) body.append(work);
    body.append(row(T.workers, def.workers ? `${b.staff} of ${def.workers}` : T.noWorkersNeeded));
    if (def.stores) body.append(...storeSection(b));
    else for (const [good, n] of Object.entries(b.store)) body.append(row(`${T.stock}: ${goodName(good)}`, String(n)));
    const reach = def.reach || def.supplyReach || def.producerReach;
```

The sheet's existing focus restore (same index, same class) keeps keyboard focus on a switch across the rebuild, because a switch keeps its class when its state flips.

**`src/ui/placement.js`.** In `toolPreview`'s building branch, replace `text: warn ? warningText(r.warnings[0]) : '', effect,` with:

```js
text: warn ? warningText(r.warnings[0], tool.type) : '', effect,
```

(only that one occurrence; the plots branch keeps `warningText(r.warnings[0])`).

**`src/ui/nudge.js`** (as Task 1 left it). Replace:

```js
import { costOf, roadCostOf } from '../sim/costs.js';
import { alertText, T } from './text.js';
```

with:

```js
import { BUILDINGS } from '../data/buildings.js';
import { costOf, roadCostOf } from '../sim/costs.js';
import { alertText, storeFor, makerOf, T } from './text.js';
```

Replace:

```js
// What each alert's cheapest fix costs in this city (difficulty included), for "an affordable fix". Alerts without an
// entry (a failing save) are skipped.
const FIX_COST = {
  no_road: (w) => roadCostOf(w),
  no_storage: (w) => costOf(w, 'granary'),
  storage_full: (w) => costOf(w, 'granary'),
```

with:

```js
// The store an alert's fix builds, as alertText words it: a full store's own kind, else the store for what the
// building makes (a granary for food, a storehouse for the rest).
function storeOf(w, a) {
  const b = a.id ? w.buildings[a.id] : null;
  const def = b ? BUILDINGS[b.type] : null;
  return def && def.stores ? b.type : storeFor(def && def.produces ? def.produces.good : 'grain');
}
// A workshop waiting for its input: the fix builds what makes that input (a clay pit for a potter).
function inputMakerCost(w, a) {
  const b = a.id ? w.buildings[a.id] : null;
  const input = b ? BUILDINGS[b.type].consumes : null;
  const maker = input ? makerOf(input) : null;
  return maker ? costOf(w, maker) : Infinity;
}

// What each alert's cheapest fix costs in this city (difficulty included), for "an affordable fix". Alerts without an
// entry (a failing save) are skipped.
const FIX_COST = {
  no_road: (w) => roadCostOf(w),
  no_storage: (w, a) => costOf(w, storeOf(w, a)),
  storage_full: (w, a) => costOf(w, storeOf(w, a)),
  no_input: (w, a) => inputMakerCost(w, a),
```

and in `nudgeLineText` replace `world.gold >= cost(world)` with `world.gold >= cost(world, a)`.

**`src/ui/createUI.js`.** Replace:

```js
import { cardInfo, activeItemOf } from './cards.js';
```

with:

```js
import { cardInfo, activeItemOf, shownItems } from './cards.js';
```

In `afterCommand`, after the line `if (e.undoable && e.kind === 'demolish') fireTip('demolished');`, add:

```js
    if (e.undoable && e.kind === 'building' && store.get().tool && store.get().tool.type === 'storehouse') fireTip('storehousePlaced');
```

In `keyActions`, replace:

```js
    category: (i) => {                                 // keys 1-7 keep their categories; a hidden one does nothing (early-game pass 2.5)
      const c = CATEGORIES[i];
      if (!c || !c.items.length) return;
```

with:

```js
    category: (i) => {                                 // keys 1-7 keep their categories; one with no card to show does nothing (early-game pass 2.5, spec 4.14)
      const c = CATEGORIES[i];
      if (!c || !shownItems(world, c.id).length) return;
```

**`css/ui.css`.** Append:

```css

/* Stage 2 cards and storage (spec 4.10, 4.14). A card whose building a milestone just unlocked wears a "New" badge: a
   word, ink on gold (8:1), top left, clear of the guide's Suggested tag on the right. A producer's sheet leads with
   what it is doing; a storehouse lists its goods as switches whose state is a word beside the good. */
.card .new-badge { position: absolute; top: 4px; left: 4px; background: var(--gold); color: var(--ink); border-radius: 8px; padding: 0 6px; font-size: calc(12px * var(--ui-scale)); line-height: 1.6; font-weight: 600; pointer-events: none; }
#sheet .work-status { margin: 4px 0 8px; font-weight: 600; }
#sheet .store-goods { list-style: none; padding-left: 0; }
.store-goods li { padding: 4px 0; border-bottom: 1px solid var(--parchment-2); }
.store-goods .row { border-bottom: none; padding: 2px 0; }
.store-goods .switch { margin: 2px 0; gap: 8px; }
.store-goods .switch .state { font-weight: 600; flex: none; }
.store-goods .switch[aria-checked="false"] .state { color: var(--coral-text); }
.store-goods .good-line { margin: 2px 0 0; }
```

(`.switch` is the settings sheet's full-width switch: 44 px tall from the base `button` rule.)

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "stage 2 cards"` then `-Grep "new items"`
Expected: `11 passed, 0 failed` and `2 passed, 0 failed`, each ending `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

Services now has four cards at Village (the booth, locked), Industry shows at Village with three locked Town cards, Food has three cards, and `cardInfo` gains `isNew`. Each change below was found by running the whole suite; nothing else breaks. (`tests/ui/createUI.test.js`'s first failure is not inside `try/finally`, so it leaves its shell mounted and dozens of later interface tests fail after it: fix that one first.)

`tests/ui/cards.test.js`: replace

```js
    expect(cardInfo(w, 'well')).toEqual({ item: 'well', name: 'Well', cost: BUILDINGS.well.cost, costText: `${BUILDINGS.well.cost} gold`, affordable: true, locked: false, lockText: '' });
```

with

```js
    expect(cardInfo(w, 'well')).toEqual({ item: 'well', name: 'Well', cost: BUILDINGS.well.cost, costText: `${BUILDINGS.well.cost} gold`, affordable: true, locked: false, lockText: '', isNew: false });
```

replace `    expect(buttons.length).toBe(3);` with

```js
    expect(buttons.length).toBe(4);                                  // the booth comes with Town: shown, locked
```

and replace `    renderCards(root, { world: w, category: 'industry', activeItem: null, onPick: () => {} });` with

```js
    renderCards(root, { world: w, category: 'defence', activeItem: null, onPick: () => {} });
```

`tests/ui/costsUi.test.js` (Task 1): in `cardInfo(hard, 'well')`'s `toEqual`, add `isNew: false` after `lockText: ''`.

`tests/ui/cardThumbs.test.js`: replace `const SHOWN = ['roads', 'homes', 'food', 'services'];` with

```js
const SHOWN = ['roads', 'homes', 'food', 'industry', 'services'];
```

replace

```js
  it('draws a picture for every Stage 1 card, sized for the screen', () => {
    const items = visibleCategories().flatMap((c) => c.items);
    expect(items).toEqual(['road', 'demolish', 'house', 'farm_grain', 'granary', 'well', 'bazaar', 'temple']);
```

with

```js
  it('draws a picture for every card, sized for the screen', () => {
    const items = visibleCategories().flatMap((c) => c.items);
    expect(items).toEqual(['road', 'demolish', 'house', 'garden', 'statue', 'farm_grain', 'farm_fig', 'granary', 'clay_pit', 'potter', 'farm_barley', 'brewery',
      'farm_flax', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post', 'well', 'bazaar', 'temple', 'booth']);
```

replace

```js
      key(r.root, '4');                                                           // Industry is hidden in Stage 1: ignored
      expect(r.store.get().category).toBe('food');
      key(r.root, '7');                                                           // Monuments too
      expect(r.store.get().category).toBe('food');
```

with

```js
      key(r.root, '4');                                                           // Industry shows at Village: its Town cards, locked
      expect(r.store.get().category).toBe('industry');
      key(r.root, '6');                                                           // Defence has nothing to show in Stage 2: ignored
      expect(r.store.get().category).toBe('industry');
      key(r.root, '7');                                                           // Monuments too
      expect(r.store.get().category).toBe('industry');
```

and replace `        expect([width, cards.length]).toEqual([width, 3]);` with

```js
        expect([width, cards.length]).toEqual([width, 4]);
```

`tests/ui/dock.test.js`: replace `    expect(root.querySelectorAll('.cat').length).toBe(4);          // empty categories are hidden` with

```js
    expect(root.querySelectorAll('.cat').length).toBe(5);          // categories with no card to show are hidden
```

and replace

```js
    expect(cards.length).toBe(2);
    fire(cards[1], 'click');
    expect(picked).toEqual(['granary']);
```

with

```js
    expect(cards.length).toBe(3);                                  // grain farm, fig orchard (locked until Town), granary
    fire(cards[1], 'click');                                       // a locked card does nothing
    fire(cards[2], 'click');
    expect(picked).toEqual(['granary']);
```

`tests/ui/panels.test.js`: replace

```js
    expect(tabs.length).toBe(4);                                   // empty categories are hidden
    fire(tabs[3], 'click');
    expect(store.get().category).toBe('services');
    expect(tabs[3].getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.cards .card').length).toBe(3);
```

with

```js
    expect(tabs.length).toBe(5);                                   // categories with no card to show are hidden
    fire(tabs[4], 'click');
    expect(store.get().category).toBe('services');
    expect(tabs[4].getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.cards .card').length).toBe(4);
```

and replace

```js
    expect(cats.length).toBe(4);
    expect(root.querySelector('.drawer').hidden).toBe(true);
    fire(cats[1], 'click');
    expect(root.querySelector('.drawer').hidden).toBe(false);
    expect(root.querySelectorAll('.drawer .card').length).toBe(1);
```

with

```js
    expect(cats.length).toBe(5);
    expect(root.querySelector('.drawer').hidden).toBe(true);
    fire(cats[1], 'click');
    expect(root.querySelector('.drawer').hidden).toBe(false);
    expect(root.querySelectorAll('.drawer .card').length).toBe(3);   // plots, garden, statue (locked until Town)
```

`tests/ui/createUI.test.js`: replace `    expect(r.root.querySelectorAll('#panel .cards .card').length).toBe(3);    // the services grid` with

```js
    expect(r.root.querySelectorAll('#panel .cards .card').length).toBe(4);    // the services grid, the booth locked until Town
```

- [ ] **Step 6: Visual check**

Run each from `C:\dev\thebes`:

```
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url "/index.html?skipTitle=1&sample=1" -Out screenshots/t12-cards-390.png -Width 390 -Height 844 -BudgetMs 2500 -Eval "(()=>{const t=window.__thebes;t.world.milestone='town';t.world.newItems=['clay_pit','potter','storehouse','booth','statue','farm_fig'];t.ui.refresh();t.ui.store.set({category:'industry',dock:'tray'});})()"
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url "/index.html?skipTitle=1&sample=1" -Out screenshots/t12-cards-1280.png -Width 1280 -Height 800 -BudgetMs 2500 -Eval "(()=>{const t=window.__thebes;t.world.milestone='town';t.world.newItems=['clay_pit','potter','storehouse'];t.ui.refresh();t.ui.store.set({category:'industry'});})()"
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url "/index.html?skipTitle=1&sample=1" -Out screenshots/t12-storehouse-390.png -Width 390 -Height 844 -BudgetMs 2500 -Eval "(async()=>{const t=window.__thebes;const {place}=await import('./src/sim/commands.js');t.world.milestone='town';t.world.gold=99999;let id=null;for(let y=20;y<50&&!id;y++)for(let x=20;x<50&&!id;x++){const r=place(t.world,'storehouse',x,y);if(r.ok)id=r.id;}const b=t.world.buildings[id];b.store={pottery:120,clay:40};b.accepts.beer=false;t.ui.refresh();t.ui.store.set({mode:'selected',selectedId:id,sheet:{kind:'info',id}});})()"
```

Expect: the portrait dock shows five categories (Roads, Homes, Food, Industry, Services) and the Industry tray's Clay pit, Potter and Storehouse cards each carry a gold "New" badge top left over the picture, names and costs unchanged; the wide panel shows the same three cards with badges and a fourth, the trading post, locked with "Unlocks at Market town" and no badge. The storehouse sheet reads "Workers", "Stored 160 of 800", a Stock heading, the accept help line, then one full-width switch per good: "Pottery 120 … Accepted" on teal-soft, "Beer 0 … Refused" in coral words on parchment, each with its grey good line beneath ("Pottery: made by potters from clay; used by Townhouses and up; sold to Memphis and Byblos"). Delete the PNGs afterwards (`screenshots/` holds only the wrap-up's set).

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED`.

- [ ] **Step 8: Commit**

```
git add src/data/ui.js src/sim/progression.js src/sim/commands.js src/ui/cards.js src/ui/dock.js src/ui/sidePanel.js src/ui/rail.js src/ui/text.js src/ui/sheets.js src/ui/placement.js src/ui/nudge.js src/ui/createUI.js css/ui.css sw-files.js tests/all.js tests/sim/newItems.test.js tests/ui/stage2Cards.test.js tests/ui/cards.test.js tests/ui/costsUi.test.js tests/ui/cardThumbs.test.js tests/ui/dock.test.js tests/ui/panels.test.js tests/ui/createUI.test.js
git commit -m @'
Show the Stage 2 buildings in the build tray, mark new ones, and explain workshops and storehouses

Each category shows what is unlocked and, locked, what the next milestone brings; a milestone's buildings say New
until one is placed. Producers say what they are doing, storage lists its goods with what makes and uses them, a
storehouse accepts or refuses each good, and workshop and storage problems name their own goods and fixes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```


### Task 13: Interface: the trading post sheet and caravans

**Files:**
- Create: `src/ui/tradeSheet.js` (the custom sheet `trade`)
- Modify: `src/data/ui.js` (`TRADE_KEEP_STEP`), `src/ui/text.js` (trade words, `caravanText`, the trade tip), `src/ui/sheets.js` (the Trade button), `src/ui/createUI.js` (register the sheet, caravan captions, the trade tip), `css/ui.css`, `sw-files.js` (regenerated)
- Create tests: `tests/ui/tradeSheet.test.js`
- Modify tests: `tests/all.js`

**Interfaces:**
- Consumes: `PARTNERS` (`{ name, milestone, routeCost, buys, sells, gift }`, ids `memphis`, `byblos`), `GOODS` (Task 2); `routeCostOf` (`src/sim/costs.js`); `openRoute`, `setTradeOrder`, `tradePrices`, `nextCaravanDay`, `postConnected` and the `{ type: 'caravan', partner, sold, bought, income }` event (Task 7); `world.trade` (Task 1); `dateParts` (`src/sim/clock.js`); `TIPS` trigger `tradingPostPlaced` (Task 8); Task 12's `partnerName`, `goodName`, `listText`, `goodWord` (module-private in text.js).
- Produces: `tradeSheet({ world, afterCommand, onShowMe, toast })` returning a custom-sheet renderer; `routeBlock(world, id)` (`'locked' | 'no_post' | 'no_gold' | null`), `tradedGoods(world)`, `orderOf(world, good)`; `TRADE_KEEP_STEP = 10`; `caravanText(event)` → `{ text, why }`; a Trade button (`.trade`) on the trading post's sheet that opens the sheet `{ kind: 'trade', id }`.

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/tradeSheet.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { PARTNERS } from '../../src/data/trade.js';
import { GOALS } from '../../src/data/goals.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
import { routeCostOf } from '../../src/sim/costs.js';
import { tradePrices, nextCaravanDay } from '../../src/sim/trade.js';
import { dateParts } from '../../src/sim/clock.js';
import { settle } from '../../src/sim/settle.js';
import { routeBlock, tradedGoods } from '../../src/ui/tradeSheet.js';
import { select } from '../../src/ui/modes.js';
import { T, TIP_TEXT, caravanText, dateText, partnerName } from '../../src/ui/text.js';
import { setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { fire, key } from '../helpers/dom.js';
import { rigUI, uiWorld } from '../helpers/uiWorld.js';

// The test city at Market town with a staffed trading post south of the road (uiWorld's road runs along y = 10).
function tradeWorld({ milestone = 'market_town', joined = true } = {}) {
  const w = uiWorld();
  w.milestone = milestone;
  const post = addRaw(w, 'trading_post', 17, 11);
  if (joined) setRoad(w, 31, 10, w.tradeEntry.x, w.tradeEntry.y);                // the road runs on to the trade entry
  staffAll(w);
  return { w, post };
}
const openTrade = (r, post) => {
  r.store.set(select(r.store.get(), post.id));
  fire(r.root.querySelector('#sheet .trade'), 'click');
};
const route = (r, id) => r.root.querySelector(`#sheet .route[data-partner="${id}"]`);
const good = (r, g) => r.root.querySelector(`#sheet .trade-good[data-good="${g}"]`);

describe('ui trade sheet', () => {
  it("opens from the trading post's sheet as one panel, and Back returns to the post", async () => {
    const { w, post } = tradeWorld();
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), post.id));
      const trade = r.root.querySelector('#sheet .trade');
      expect(trade.textContent).toBe(T.trade);
      expect(trade.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      fire(trade, 'click');
      expect(r.store.get().sheet).toEqual({ kind: 'trade', id: post.id });
      expect(r.root.querySelector('#sheet h2').textContent).toBe(T.trade);
      expect(r.root.querySelectorAll('#sheet').length).toBe(1);
      key(r.root, 'Escape');
      expect(r.store.get().sheet).toEqual({ kind: 'info', id: post.id });
      expect(r.root.querySelector('#sheet .trade')).toBeTruthy();
    } finally { r.cleanup(); }
  });
  it('says why a route cannot open, in words, and opens one through the sim at the scaled cost', async () => {
    const { w, post } = tradeWorld({ milestone: 'town' });
    settle(w, []);                                                                   // pay what the test city has already earned,
    w.goals.completed = GOALS.map((g) => g.id);                                      // and leave no goal (a trade route goal) to pay out,
    w.guide.on = false;                                                              // so only the route moves the gold
    const r = await rigUI({ world: w });
    try {
      openTrade(r, post);
      const memphis = () => route(r, 'memphis').querySelector('.open-route');
      expect(memphis().disabled).toBe(true);
      expect(route(r, 'memphis').querySelector('.reason').textContent).toBe('Opens at Market town');
      expect(route(r, 'byblos').querySelector('.reason').textContent).toBe('Opens at Great city');
      w.milestone = 'market_town';
      w.gold = routeCostOf(w, 'memphis') - 1;
      r.ui.refresh();
      expect(memphis().disabled).toBe(true);
      expect(route(r, 'memphis').querySelector('.reason').textContent).toBe(`Needs ${routeCostOf(w, 'memphis')} gold`);
      w.gold = 5000;
      w.difficulty = 'hard';
      r.ui.refresh();
      const cost = routeCostOf(w, 'memphis');
      expect(cost).toBe(Math.round(PARTNERS.memphis.routeCost * 1.25));
      expect([memphis().disabled, memphis().textContent, memphis().getAttribute('aria-label')]).toEqual([false, `Open route, ${cost} gold`, `Open route, ${cost} gold: Memphis`]);
      expect(route(r, 'memphis').querySelector('.reason')).toBe(null);
      expect(r.root.querySelector('#sheet .trade-goods')).toBe(null);                // one step at a time: no goods before a route
      expect(r.root.querySelector('#sheet').textContent).toContain(T.openRouteFirst);
      fire(memphis(), 'click');
      expect(Boolean(w.trade.routes.memphis)).toBe(true);
      expect(w.gold).toBe(5000 - cost);
      expect(route(r, 'memphis').textContent).toBe(`${partnerName('memphis')}${T.routeOpen}`);
      expect(routeBlock(w, 'byblos')).toBe('locked');
    } finally { r.cleanup(); }
  });
  it('lists a row per good an open partner trades, with its prices and only the choices that partner allows', async () => {
    const { w, post } = tradeWorld();
    w.trade.routes.memphis = { day: 0, gifted: true };
    addRaw(w, 'storehouse', 20, 11, { store: { pottery: 40 } });
    const r = await rigUI({ world: w });
    try {
      openTrade(r, post);
      const rows = [...r.root.querySelectorAll('#sheet .trade-good')].map((li) => li.dataset.good);
      expect(rows).toEqual(['grain', 'figs', 'pottery', 'beer', 'clay', 'barley']);
      expect(tradedGoods(w)).toEqual(rows);
      const prices = tradePrices(w, 'memphis');
      expect(good(r, 'pottery').querySelector('.prices').textContent).toBe(`Memphis pays ${prices.buys.pottery}`);
      expect(good(r, 'clay').querySelector('.prices').textContent).toBe(`Memphis asks ${prices.sells.clay}`);
      expect(good(r, 'pottery').textContent).toContain('40 in storage');
      const modes = (g) => [...good(r, g).querySelectorAll('.mode')].map((b) => b.dataset.mode);
      expect([modes('pottery'), modes('clay')]).toEqual([['sell', 'ignore'], ['buy', 'ignore']]);
      expect(good(r, 'pottery').querySelector('.mode.ignore').getAttribute('aria-pressed')).toBe('true');
      expect(good(r, 'pottery').querySelector('.choices').getAttribute('role')).toBe('group');
      expect(good(r, 'pottery').querySelector('.keep')).toBe(null);                    // nothing to keep while ignored
      w.milestone = 'great_city';
      w.trade.routes.byblos = { day: 0, gifted: true };
      r.ui.refresh();
      expect(modes('beer')).toEqual(['buy', 'sell', 'ignore']);                        // Memphis buys beer, Byblos sells it
      expect(good(r, 'pottery').querySelector('.prices').textContent).toBe(`Memphis pays ${prices.buys.pottery} · Byblos pays ${tradePrices(w, 'byblos').buys.pottery}`);
    } finally { r.cleanup(); }
  });
  it('sets what to do with a good and the level to keep through the sim, in steps of 10, with 44 px buttons', async () => {
    const { w, post } = tradeWorld();
    w.trade.routes.memphis = { day: 0, gifted: true };
    const r = await rigUI({ world: w });
    try {
      openTrade(r, post);
      fire(good(r, 'pottery').querySelector('.mode.sell'), 'click');
      expect(w.trade.orders.pottery).toEqual({ mode: 'sell', keep: 0 });
      expect(good(r, 'pottery').querySelector('.mode.sell').getAttribute('aria-pressed')).toBe('true');
      const less = () => good(r, 'pottery').querySelector('.keep-less'), more = () => good(r, 'pottery').querySelector('.keep-more');
      expect([less().textContent, more().textContent, less().disabled]).toEqual(['−10', '+10', true]);
      expect(more().getAttribute('aria-label')).toBe('+10: keep more pottery');
      for (const b of [less(), more()]) {
        const box = b.getBoundingClientRect();
        expect([box.width >= 44, box.height >= 44]).toEqual([true, true]);
      }
      more().focus();
      fire(more(), 'click');
      fire(more(), 'click');
      expect(w.trade.orders.pottery).toEqual({ mode: 'sell', keep: 20 });
      expect(document.activeElement).toBe(more());                                      // the rebuilt sheet keeps keyboard focus
      expect(good(r, 'pottery').querySelector('.keep-value').textContent).toBe('Keep 20');
      expect(good(r, 'pottery').querySelector('.keep-help').textContent).toBe('Sells what is over 20 in storage');
      fire(less(), 'click');
      expect(w.trade.orders.pottery.keep).toBe(10);
      fire(good(r, 'clay').querySelector('.mode.buy'), 'click');
      expect(good(r, 'clay').querySelector('.keep-help').textContent).toBe('Buys until 0 are in storage');
      fire(good(r, 'pottery').querySelector('.mode.ignore'), 'click');
      expect(w.trade.orders.pottery).toEqual({ mode: 'ignore', keep: 10 });             // the level is kept for next time
      expect(good(r, 'pottery').querySelector('.keep')).toBe(null);
    } finally { r.cleanup(); }
  });
  it("warns with Show me when no road joins the post to the trade entry, and shows the next caravan's date", async () => {
    const { w, post } = tradeWorld({ joined: false });
    w.trade.routes.memphis = { day: 0, gifted: false };
    const r = await rigUI({ world: w });
    try {
      openTrade(r, post);
      const warning = r.root.querySelector('#sheet .trade-warning');
      expect(warning.textContent).toContain(T.postNotJoined);
      fire(warning.querySelector('.show-me'), 'click');
      expect(r.store.get().tool).toEqual({ kind: 'road' });
      expect(r.store.get().sheet).toBe(null);
      setRoad(w, 31, 10, w.tradeEntry.x, w.tradeEntry.y);                           // joined: caravans can come
      openTrade(r, post);
      expect(r.root.querySelector('#sheet .trade-warning')).toBe(null);
      const day = nextCaravanDay(w);
      expect(Number.isFinite(day) && day > w.day).toBe(true);
      expect(r.root.querySelector('#sheet .next-caravan').textContent).toBe(`${T.nextCaravan}${dateText(dateParts({ day }))}`);
    } finally { r.cleanup(); }
  });
  it('tells the city about each caravan in a caption: what it bought and sold, any gift, and the gold', async () => {
    expect(caravanText({ partner: 'memphis', sold: { pottery: 30 }, bought: {}, income: 240 }).text).toBe('A caravan from Memphis bought 30 pottery: +240 gold');
    expect(caravanText({ partner: 'memphis', sold: {}, bought: { clay: 20 }, gift: { good: 'clay', n: 40 }, income: 0 }).text)
      .toBe('A caravan from Memphis sold you 20 clay and brought a gift of 40 clay');
    expect(caravanText({ partner: 'byblos', sold: { linen: 10, jewellery: 5 }, bought: { flax: 25 }, income: 240 }).text)
      .toBe('A caravan from Byblos bought 10 linen and 5 jewellery and sold you 25 flax: +240 gold');
    const idle = caravanText({ partner: 'memphis', sold: {}, bought: {}, income: 0 });
    expect([idle.text, idle.why]).toEqual(['A caravan from Memphis found nothing to trade', T.caravanIdleWhy]);
    const r = await rigUI();
    try {
      r.ui.celebrations.clear();
      r.ui.onEvents([{ type: 'caravan', partner: 'memphis', sold: { pottery: 30 }, bought: {}, income: 240 }]);
      expect(r.root.querySelector('#cheer .cheer .text').textContent).toBe('A caravan from Memphis bought 30 pottery: +240 gold');
    } finally { r.cleanup(); }
  });
  it('brings the trade tip once the first trading post is placed and the tool closes', async () => {
    let t = 0;
    const r = await rigUI({ now: () => t });
    try {
      settle(r.world, []);
      r.world.milestone = 'market_town';
      t = TIP_FIRST_DELAY_MS;
      r.ui.placement.start({ kind: 'building', type: 'trading_post' }, { x: 17, y: 11 });
      expect(r.ui.placement.confirm().ok).toBe(true);
      r.ui.placement.cancel();
      const tip = TIPS.find((x) => x.trigger === 'tradingPostPlaced');
      expect(r.ui.tips.current()).toBe(tip.id);
      expect(r.root.querySelector('#tip .text').textContent).toBe(TIP_TEXT[tip.id]);
    } finally { r.cleanup(); }
  });
});
```

Add to the end of `tests/all.js`:

```js
import './ui/tradeSheet.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "trade sheet"`
Expected: `LOAD ERROR`: `tests/all.js` cannot load, because `src/ui/tradeSheet.js` does not exist yet (and `text.js` has no `caravanText`).

- [ ] **Step 3: Implement**

**`src/data/ui.js`.** After the `NEAREST_FIT_RADIUS` line, add:

```js

// The trade sheet's level to keep moves in steps of this many units (spec 4.15).
export const TRADE_KEEP_STEP = 10;
```

**`src/ui/text.js`.** Add an import after `import { PARTNERS } from '../data/trade.js';`:

```js
import { TRADE_KEEP_STEP } from '../data/ui.js';
```

After the `milestoneText` line, add:

```js

// The trade sheet (spec 4.15): routes and why one cannot open yet, each good's prices, the three choices and the
// level to keep; then a caravan's caption.
export const TRADE_MODE_NAMES = { buy: 'Buy', sell: 'Sell', ignore: 'Ignore' };
export const openRouteText = (cost) => `Open route, ${cost} gold`;
export function routeBlockText(id, block, cost) {
  if (block === 'locked') {
    const m = MILESTONES.find((x) => x.id === PARTNERS[id].milestone);
    return `Opens at ${m ? m.name : PARTNERS[id].milestone}`;
  }
  if (block === 'no_post') return 'Needs a trading post';
  if (block === 'no_gold') return `Needs ${cost} gold`;
  return '';
}
export const paysText = (name, price) => `${name} pays ${price}`;
export const asksText = (name, price) => `${name} asks ${price}`;
export const inStorageText = (n) => `${n} in storage`;
export const keepText = (n) => `Keep ${n}`;
export const keepHelpText = (mode, n) => (mode === 'buy' ? `Buys until ${n} are in storage` : `Sells what is over ${n} in storage`);
export const keepStepText = (sign) => `${sign > 0 ? '+' : '−'}${TRADE_KEEP_STEP}`;
export const keepStepLabel = (sign, name) => `${keepStepText(sign)}: keep ${sign > 0 ? 'more' : 'less'} ${name.toLowerCase()}`;
export const tradeChoiceLabel = (name) => `${name}: buy, sell or ignore`;
const TRADE_REASONS = { no_post: 'Build a trading post first', already_open: 'That route is already open', locked: 'That partner trades with bigger cities', no_gold: 'Not enough gold' };
export const tradeReasonText = (code) => TRADE_REASONS[code] || "Can't do that yet";

// A caravan's caption (spec 4.15): what it bought from the city and sold it, any first-visit gift, and the gold it
// paid: "A caravan from Memphis bought 30 pottery: +240 gold". One that found nothing says so and why.
export function caravanText(e) {
  const goods = (m) => listText(Object.entries(m || {}).filter(([, n]) => n > 0).map(([g, n]) => `${n} ${goodWord(g)}`));
  const from = partnerName(e.partner);
  const sold = goods(e.sold), bought = goods(e.bought);
  const parts = [];
  if (sold) parts.push(`bought ${sold}`);
  if (bought) parts.push(`sold you ${bought}`);
  if (e.gift && e.gift.n > 0) parts.push(`brought a gift of ${e.gift.n} ${goodWord(e.gift.good)}`);
  if (!parts.length) return { text: `A caravan from ${from} found nothing to trade`, why: T.caravanIdleWhy };
  return { text: `A caravan from ${from} ${listText(parts)}${e.income > 0 ? `: ${rewardText(e.income)}` : ''}`, why: '' };
}
```

(The minus sign in `keepStepText` is U+2212, as the summary's wages row uses. `sold` and `bought` in the event are the city's side: what it sold and bought.)

At the end of `T`, replace (Task 12's last lines):

```js
  acceptHelp: 'Tap a good to accept or refuse it here. A refused good goes to other storage.',
};
```

with:

```js
  acceptHelp: 'Tap a good to accept or refuse it here. A refused good goes to other storage.',
  trade: 'Trade', routes: 'Trade routes', routeOpen: 'Route open', tradeGoods: 'Goods', nextCaravan: 'Next caravan', openRouteFirst: 'Open a route to trade goods.',
  tradeHelp: 'Choose what each caravan buys from you or sells you, and how many to keep in storage.',
  postNotJoined: "Caravans can't reach the trading post: no road joins it to the trade entry.", postNotJoinedFix: 'Lay a road from it to the trade entry',
  caravanIdleWhy: 'Set what to buy and sell at the trading post.',
};
```

(`T.trade` also titles the sheet: `sheets.js` heads a custom sheet with `T[kind]`.)

In `TIP_TEXT`, add (replacing any placeholder Task 8 left for the id):

```js
  trade_orders: 'Tap the trading post, open a route, then pick what to buy, sell and keep.',
```

**`src/ui/tradeSheet.js`.** Create:

```js
// The trading post's sheet (spec 4.15), one step at a time: first the routes, each with Open route and its cost or
// why it cannot open yet; once a route is open, a row per good an open partner trades (what they pay or ask, Buy,
// Sell or Ignore, and the level to keep, in steps of TRADE_KEEP_STEP), then the next caravan's date. It reads the
// world and changes it only through openRoute and setTradeOrder (src/sim/trade.js); createUI registers it as the
// custom sheet 'trade', opened by the Trade button on a trading post's sheet. A command re-renders it (afterCommand).
import { PARTNERS } from '../data/trade.js';
import { GOODS } from '../data/goods.js';
import { BUILDINGS } from '../data/buildings.js';
import { TRADE_KEEP_STEP } from '../data/ui.js';
import { openRoute, setTradeOrder, tradePrices, nextCaravanDay, postConnected } from '../sim/trade.js';
import { routeCostOf } from '../sim/costs.js';
import { atLeast } from '../sim/progression.js';
import { allBuildings } from '../sim/world.js';
import { dateParts } from '../sim/clock.js';
import { el, button } from './components.js';
import {
  T, TRADE_MODE_NAMES, partnerName, goodName, dateText, showMeLabel, openRouteText, routeBlockText, paysText, asksText,
  inStorageText, keepText, keepHelpText, keepStepText, keepStepLabel, tradeChoiceLabel, tradeReasonText,
} from './text.js';

const isOpen = (world, id) => Boolean(world.trade.routes[id]);
const hasPost = (world) => allBuildings(world).some((b) => b.type === 'trading_post');
const openPartners = (world) => Object.keys(PARTNERS).filter((id) => isOpen(world, id));

// Why a route cannot open now, or null, by openRoute's rules: the partner's milestone, a trading post, the gold.
export function routeBlock(world, id) {
  if (!atLeast(world, PARTNERS[id].milestone)) return 'locked';
  if (!hasPost(world)) return 'no_post';
  if (world.gold < routeCostOf(world, id)) return 'no_gold';
  return null;
}

// The goods any open partner buys or sells, in the data's order.
export function tradedGoods(world) {
  const traded = new Set(openPartners(world).flatMap((id) => [...Object.keys(PARTNERS[id].buys), ...Object.keys(PARTNERS[id].sells)]));
  return Object.keys(GOODS).filter((g) => traded.has(g));
}

export const orderOf = (world, good) => world.trade.orders[good] || { mode: 'ignore', keep: 0 };
const inStorage = (world, good) => allBuildings(world).reduce((n, b) => n + ((BUILDINGS[b.type].stores || []).includes(good) ? (b.store[good] || 0) : 0), 0);

export function tradeSheet({ world, afterCommand = () => {}, onShowMe = () => {}, toast = () => {} }) {
  const done = (r, kind) => {
    if (r.ok) afterCommand({ kind, result: r, undoable: false });
    else toast(tradeReasonText(r.reason));
  };

  function routeRow(id) {
    const name = el('span', { class: 'name', text: partnerName(id) });
    if (isOpen(world, id)) return el('li', { class: 'route open', dataset: { partner: id } }, [name, el('span', { class: 'status small', text: T.routeOpen })]);
    const block = routeBlock(world, id);
    const words = openRouteText(routeCostOf(world, id));
    const open = button(words, { class: 'open-route primary', 'aria-label': `${words}: ${partnerName(id)}`, disabled: Boolean(block), onClick: () => done(openRoute(world, id), 'route') });
    return el('li', { class: 'route', dataset: { partner: id } }, [
      el('div', { class: 'row' }, [name, open]),
      block ? el('p', { class: 'reason small muted', text: routeBlockText(id, block, routeCostOf(world, id)) }) : null,
    ]);
  }

  // One good: its name and stock, each open partner's price, the choices those partners allow, and the keep level.
  function goodRow(good) {
    const name = goodName(good);
    const order = orderOf(world, good);
    const prices = openPartners(world).map((id) => ({ id, p: tradePrices(world, id) }));
    const words = [];
    for (const { id, p } of prices) {
      if (p.buys[good] !== undefined) words.push(paysText(partnerName(id), p.buys[good]));
      if (p.sells[good] !== undefined) words.push(asksText(partnerName(id), p.sells[good]));
    }
    const modes = [
      prices.some(({ p }) => p.sells[good] !== undefined) ? 'buy' : null,
      prices.some(({ p }) => p.buys[good] !== undefined) ? 'sell' : null,
      'ignore',
    ].filter(Boolean);
    const set = (mode, keep) => done(setTradeOrder(world, good, mode, keep), 'trade');
    const choices = modes.map((m) => button(TRADE_MODE_NAMES[m], { class: `choice mode ${m}`, dataset: { mode: m }, 'aria-pressed': String(order.mode === m), onClick: () => set(m, order.keep) }));
    const li = el('li', { class: 'trade-good', dataset: { good } }, [
      el('div', { class: 'row' }, [el('strong', { text: name }), el('span', { class: 'small muted', text: inStorageText(inStorage(world, good)) })]),
      el('p', { class: 'prices small', text: words.join(' · ') }),
      el('span', { class: 'choices', role: 'group', 'aria-label': tradeChoiceLabel(name) }, choices),
    ]);
    if (order.mode !== 'ignore') {
      const less = button(keepStepText(-1), { class: 'keep-less', 'aria-label': keepStepLabel(-1, name), disabled: order.keep <= 0, onClick: () => set(order.mode, Math.max(0, order.keep - TRADE_KEEP_STEP)) });
      const more = button(keepStepText(1), { class: 'keep-more', 'aria-label': keepStepLabel(1, name), onClick: () => set(order.mode, order.keep + TRADE_KEEP_STEP) });
      li.append(
        el('div', { class: 'keep' }, [less, el('span', { class: 'keep-value', text: keepText(order.keep) }), more]),
        el('p', { class: 'keep-help small muted', text: keepHelpText(order.mode, order.keep) }),
      );
    }
    return li;
  }

  return function render(body) {
    body.append(el('h3', { text: T.routes }), el('ul', { class: 'routes' }, Object.keys(PARTNERS).map(routeRow)));
    if (hasPost(world) && !postConnected(world)) {
      const at = world.tradeEntry;
      body.append(el('div', { class: 'trade-warning' }, [
        el('p', { class: 'coral', text: T.postNotJoined }),
        el('div', { class: 'fix' }, [
          el('span', { class: 'small muted', text: T.postNotJoinedFix }),
          button(T.showMe, { class: 'show-me primary', 'aria-label': showMeLabel(T.postNotJoinedFix), onClick: () => onShowMe({ category: 'roads', item: 'road', x: at.x + 0.5, y: at.y + 0.5 }) }),
        ]),
      ]));
    }
    const goods = tradedGoods(world);
    if (!goods.length) { body.append(el('p', { class: 'muted', text: T.openRouteFirst })); return; }
    body.append(el('h3', { text: T.tradeGoods }), el('p', { class: 'small muted', text: T.tradeHelp }), el('ul', { class: 'trade-goods' }, goods.map(goodRow)));
    const day = nextCaravanDay(world);
    if (Number.isFinite(day)) body.append(el('div', { class: 'row next-caravan' }, [el('span', { class: 'muted', text: T.nextCaravan }), el('span', { text: dateText(dateParts({ day })) })]));
  };
}
```

**`src/ui/sheets.js`.** Replace `import { closeSheet } from './modes.js';` with:

```js
import { closeSheet, openSheet } from './modes.js';
```

In `buildingSheet`, replace:

```js
    const actions = el('div', { class: 'actions' });
    if (def.workers || def.upkeep) {
```

with:

```js
    const actions = el('div', { class: 'actions' });
    // The trading post's routes and orders live on their own sheet (spec 4.15); Back comes back here.
    if (b.type === 'trading_post') actions.append(button(T.trade, { class: 'trade primary', onClick: () => store.set(openSheet(store.get(), 'trade', b.id)) }));
    if (def.workers || def.upkeep) {
```

(`openSheet` for a kind other than `info` keeps `selectedId`, so Back, Esc and ✕ return to the post's own sheet: one panel at a time.)

**`src/ui/createUI.js`.** After `import { welcomeSheet } from './welcomeBack.js';`, add:

```js
import { tradeSheet } from './tradeSheet.js';
```

In the `./text.js` import, add `caravanText` after `milestoneText`:

```js
import { buildingName, reasonText, milestoneText, caravanText, FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, T } from './text.js';
```

Replace:

```js
  const customSheets = { ...menus, goals: goalsSheet(world, { onShowMe: showMe }) };
```

with:

```js
  const customSheets = {
    ...menus, goals: goalsSheet(world, { onShowMe: showMe }),
    trade: tradeSheet({ world, afterCommand, onShowMe: showMeAt, toast: (text) => toasts.show(text) }),
  };
```

In `afterCommand`, after Task 12's storehouse tip line, add:

```js
    if (e.undoable && e.kind === 'building' && store.get().tool && store.get().tool.type === 'trading_post') fireTip('tradingPostPlaced');
```

In `cheerFor`, after the `guide_done` line, add:

```js
    if (e.type === 'caravan') { const c = caravanText(e); return { tier: 'first', text: c.text, why: c.why, onShow: cheerSound }; }
```

**`css/ui.css`.** Append:

```css

/* The trade sheet (spec 4.15): routes first, then a row per good with its prices, the Buy, Sell or Ignore choice
   (the .choices group the settings use) and the level to keep between its 44 px -10 and +10 buttons. */
#sheet .routes, #sheet .trade-goods { list-style: none; padding-left: 0; }
.routes .route { padding: 6px 0; border-bottom: 1px solid var(--parchment-2); }
.routes .route.open { display: flex; justify-content: space-between; align-items: center; min-height: var(--tap); }
.routes .route .row { border-bottom: none; align-items: center; padding: 0; }
.routes .reason { margin: 2px 0 0; }
.trade-goods .trade-good { padding: 6px 0; border-bottom: 1px solid var(--parchment-2); }
.trade-goods .row { border-bottom: none; padding: 0; align-items: baseline; }
.trade-goods .prices { margin: 2px 0 4px; }
.trade-goods .keep { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.trade-goods .keep-value { min-width: 5em; text-align: center; }
.trade-goods .keep-help { margin: 2px 0 0; }
.trade-warning { margin: 8px 0; }
.trade-warning p { margin: 0 0 4px; }
.trade-warning .fix { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px 8px; }
#sheet .next-caravan { margin-top: 8px; }
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "trade sheet"`
Expected: `7 passed, 0 failed`, `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

None. A full run with this task applied (on top of Task 12) fails nothing new: the Trade button shows only on a trading post's sheet, the `trade` sheet is a new custom kind, and the caravan caption only handles a new event type. `grep -rn "customSheets\|cheerFor\|caravan" tests/` finds nothing that pins the old lists.

- [ ] **Step 6: Visual check**

```
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url "/index.html?skipTitle=1&sample=1" -Out screenshots/t13-trade-390.png -Width 390 -Height 844 -BudgetMs 2500 -Eval "(async()=>{const t=window.__thebes;const {place}=await import('./src/sim/commands.js');t.world.milestone='great_city';t.world.gold=99999;let id=null;for(let y=20;y<50&&!id;y++)for(let x=20;x<50&&!id;x++){const r=place(t.world,'trading_post',x,y);if(r.ok)id=r.id;}t.world.trade.routes.memphis={day:0};t.world.trade.orders.pottery={mode:'sell',keep:50};t.ui.refresh();t.ui.store.set({mode:'selected',selectedId:id,sheet:{kind:'trade',id}});})()"
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url "/index.html?skipTitle=1&sample=1" -Out screenshots/t13-trade-1280.png -Width 1280 -Height 800 -BudgetMs 2500 -Eval "(async()=>{const t=window.__thebes;const {place}=await import('./src/sim/commands.js');t.world.milestone='great_city';t.world.gold=99999;let id=null;for(let y=20;y<50&&!id;y++)for(let x=20;x<50&&!id;x++){const r=place(t.world,'trading_post',x,y);if(r.ok)id=r.id;}t.world.trade.routes.memphis={day:0};t.world.trade.orders.pottery={mode:'sell',keep:50};t.ui.refresh();t.ui.store.set({mode:'selected',selectedId:id,sheet:{kind:'trade',id}});})()"
```

Expect: a sheet titled "Trade" with "Trade routes": "Memphis … Route open" and "Byblos" with a teal "Open route, 600 gold" button; then "Goods", the help line, and rows for Grain ("Memphis pays 1", Sell / Ignore with Ignore filled), Figs ("Memphis asks 3", Buy / Ignore), Pottery (Sell filled, a −10 / "Keep 50" / +10 row and "Sells what is over 50 in storage"), Beer, Clay and Barley, each with "N in storage" on the right; at the bottom "Next caravan" with a date, and, if the sample city's post is not joined to the trade entry, the coral warning with Show me under the routes. Nothing overflows the 390 px sheet. Delete the PNGs afterwards.

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED`.

- [ ] **Step 8: Commit**

```
git add src/ui/tradeSheet.js src/data/ui.js src/ui/text.js src/ui/sheets.js src/ui/createUI.js css/ui.css sw-files.js tests/all.js tests/ui/tradeSheet.test.js
git commit -m @'
Add the trading post sheet: routes, orders, the keep level and the next caravan

The trading post's sheet has a Trade button that opens one panel: each partner's route with its cost or why it
cannot open yet, then a row per good an open partner trades with its prices, Buy, Sell or Ignore and the level to
keep in steps of 10, and the next caravan's date. Caravans become captions, and the first trading post brings a tip.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```


### Task 14: Interface: house sheet and summary for the economy

> **Controller ruling.** Task 8 already wrote the words for its firsts, achievements, daily goals, tips and chapters into `src/ui/text.js`. Where a step below adds the same keys (marked "STAND-IN Task 8" or not), keep Task 8's entries and skip the addition. The goods-cause words below match the ruled codes (see Task 6's ruling block).


**Files:**
- Create: `src/sim/goodsMonth.js` (the month's goods record)
- Modify: `src/sim/clock.js` (`runMonth` records it), `src/ui/hud.js` (`summaryData`), `src/ui/text.js` (need names, cause words, desirability words, difficulty names, summary strings, chapters, and the words for Task 8's firsts, achievements, daily goals and two tips), `src/ui/sheets.js` (`needRow`, `houseSheet`, `summarySheet`, `CAUSE_FIX`), `src/ui/createUI.js` (the desirability and merge tips), `css/ui.css`, `sw-files.js` (regenerated)
- Create tests: `tests/sim/goodsMonth.test.js`, `tests/ui/houseSheetEconomy.test.js`
- Modify tests: `tests/all.js`

**Interfaces:**
- Consumes: `houseStatus` with the new needs, the desirability row `{ need: 'desirability', met, value, target }`, `missingNow` (with `'desirability'` below keep), `downgradeIn` and `merge: { needed, ready }`; `needCause` with `no_good`, `good_unmade`, `next_delivery { good }`, `no_booth`, `booth_idle`, `booth_no_road`, `low_desirability`, and `no_square` for need `'merge'` (Task 6); `houseDesirability`, `desirabilityContributors` (Task 5); `tally.made`, `tally.tradeIncome` (Tasks 1, 3, 7); `world.difficulty` (Task 1); `isUnlocked`; Task 8's data (`FIRSTS`, `ACHIEVEMENTS` with measure kind `made` and tally keys, `DAILY_POOL`, `TIPS` triggers `desirabilityShown`, `townhouseSheet`); Task 12's `makerOf`, `storeFor`, `listText`, `goodName`.
- Produces: `goodsMonthStart(world)`, `homeGoodsHeld(world)`, `recordGoodsMonth(world, start, heldBefore, heldAfter)` and `stats.lastMonth.made`, `.used`, `.madeTotal`, `.tradeIncome`; `summaryData(world)` gains `tradeIncome`, `made`, `used`, `difficulty`, `foodByGood`; text `goodMakers`, `contributorText`, `desirabilityText`, `keepWarningText`, `DIFFICULTY_NAMES`, `madeUsedText`, `causeText(cause, world, need)` (returns `null` for a code with no words); checklist rows carry `data-need`, a desirability row `.desirability` line, a merge row for a Townhouse, a `.keep-warning` line.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/goodsMonth.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { runMonth } from '../../src/sim/clock.js';
import { goodsMonthStart, homeGoodsHeld, recordGoodsMonth } from '../../src/sim/goodsMonth.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

describe('sim goods month', () => {
  it("records each good made and used in the month, and the month's trade income", () => {
    const w = makeTestWorld();
    w.stats.lastMonth = { taxes: 0, wages: 0, upkeep: 0, net: 0, madeTotal: { pottery: 10, clay: 50 } };
    w.tally.made = { pottery: 40, clay: 90, grain: 30 };
    w.tally.tradeIncome = 500;
    const start = goodsMonthStart(w);
    expect(start).toEqual({ made: { pottery: 10, clay: 50 }, tradeIncome: 500 });
    w.tally.tradeIncome = 740;
    recordGoodsMonth(w, start, { grain: 20, figs: 0, pottery: 9, beer: 0, linen: 0, jewellery: 0 }, { grain: 14, figs: 0, pottery: 9, beer: 0, linen: 0, jewellery: 0 });
    const m = w.stats.lastMonth;
    expect(m.made).toEqual({ pottery: 30, clay: 40, grain: 30 });
    expect(m.used).toEqual({ grain: 6, clay: 30 });                   // homes ate 6 grain; potters turned 30 clay into their 30 pots
    expect(m.madeTotal).toEqual({ pottery: 40, clay: 90, grain: 30 });
    expect(m.tradeIncome).toBe(240);
    expect(m.taxes).toBe(0);                                          // the money record is kept
  });
  it('counts what homes and bazaars hold, and the monthly run records the month through the housing check', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const home = addRaw(w, 'house', 12, 9, { tier: 3, residents: 12, stock: { grain: 3, pottery: 1 } });
    addRaw(w, 'bazaar', 9, 11, { store: { grain: 40 } });
    staffAll(w);
    expect(homeGoodsHeld(w)).toEqual({ grain: 43, figs: 0, pottery: 1, beer: 0, linen: 0, jewellery: 0 });
    runMonth(w);
    const m = w.stats.lastMonth;
    expect(m.used.grain).toBe(3);                                     // 12 residents eat 3 grain a month
    expect(home.stock.grain).toBe(3);                                 // and the bazaar topped them up for the next
    expect(Object.keys(m.made)).toEqual([]);
    expect(m.tradeIncome).toBe(0);
    runMonth(w);
    expect(w.stats.lastMonth.used.grain).toBe(3);
  });
});
```

Create `tests/ui/houseSheetEconomy.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { TIERS } from '../../src/data/housing.js';
import { FIRSTS } from '../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { DAILY_POOL } from '../../src/data/daily.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
import { houseStatus } from '../../src/sim/housing.js';
import { desirabilityContributors } from '../../src/sim/desirability.js';
import { removeBuilding } from '../../src/sim/world.js';
import { select, openSheet } from '../../src/ui/modes.js';
import {
  T, NEED_NAMES, CAUSE_TEXT, FIRST_TEXT, ACHIEVEMENT_TEXT, DAILY_TEXT, CHAPTER_NAMES, TIP_TEXT,
  causeText, desirabilityText, contributorText, keepWarningText, goodName,
} from '../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

// A Town street along y = 10 with a home at (12, 9), a well, a temple and a bazaar in reach of it, and a granary.
function street({ tier = 4, residents = 16, stock = { grain: 10 } } = {}) {
  const w = makeTestWorld({ gold: 5000 });
  w.milestone = 'town';
  setRoad(w, 0, 10, 31, 10);
  const home = addRaw(w, 'house', 12, 9, { tier, residents, stock: { ...stock }, stockedFor: residents });
  addRaw(w, 'well', 12, 11);
  addRaw(w, 'temple', 14, 11);
  const bazaar = addRaw(w, 'bazaar', 17, 11);
  addRaw(w, 'granary', 3, 11, { store: { grain: 100 } });
  staffAll(w);
  return { w, home, bazaar };
}
const rowOf = (r, need) => r.root.querySelector(`#sheet .checklist li[data-need="${need}"]`);
const words = (li, sel) => (li.querySelector(sel) ? li.querySelector(sel).textContent : null);
// The house sheet never says something false (the pass's invariant, at the interface): a row shows a cause exactly
// when it is missing, and every cause it shows has words.
function sheetTellsTheTruth(r) {
  const rows = [...r.root.querySelectorAll('#sheet .checklist li')];
  expect(rows.length).toBeGreaterThan(0);
  for (const li of rows) {
    const cause = li.querySelector('.cause');
    expect([li.dataset.need, li.classList.contains('missing'), Boolean(cause && cause.textContent.length > 0)])
      .toEqual([li.dataset.need, li.classList.contains('missing'), li.classList.contains('missing')]);
  }
}

describe('ui house sheet for the economy', () => {
  it('follows a good from no store near the bazaar, to nothing making it, to on its way, to in the home, with Show me at each step', async () => {
    const { w, home } = street();
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), home.id));
      let pottery = rowOf(r, 'pottery');
      expect(pottery.querySelector('.name').textContent).toBe(NEED_NAMES.pottery);
      expect(words(pottery, '.cause')).toBe('The bazaar has no pottery');
      expect(words(pottery, '.fix span')).toBe('Build a storehouse within 16 road tiles of it');
      sheetTellsTheTruth(r);
      fire(pottery.querySelector('.show-me'), 'click');
      expect([r.store.get().category, r.store.get().tool]).toEqual(['industry', { kind: 'building', type: 'storehouse' }]);
      const store = addRaw(w, 'storehouse', 20, 11);
      staffAll(w);
      r.store.set(select(r.store.get(), home.id));
      pottery = rowOf(r, 'pottery');
      expect(words(pottery, '.cause')).toBe('Nothing makes pottery near the bazaar');
      expect(words(pottery, '.fix span')).toBe('Make pottery near it: a clay pit and a potter');
      fire(pottery.querySelector('.show-me'), 'click');                               // the first maker the city has none of
      expect(r.store.get().tool).toEqual({ kind: 'building', type: 'clay_pit' });
      store.store.pottery = 20;
      r.store.set(select(r.store.get(), home.id));
      pottery = rowOf(r, 'pottery');
      expect(words(pottery, '.cause')).toBe('The next delivery brings pottery');
      expect(pottery.querySelector('button')).toBe(null);                             // nothing to do: it comes by itself
      sheetTellsTheTruth(r);
      home.stock.pottery = 1;
      r.ui.refresh();
      expect(rowOf(r, 'pottery').classList.contains('met')).toBe(true);
      sheetTellsTheTruth(r);
    } finally { r.cleanup(); }
  });
  it('words makers or a store that are not unlocked yet by the milestone that brings them, and a food as grown', () => {
    const w = makeTestWorld();
    expect(causeText({ code: 'no_good', id: null, good: 'pottery' }, w, 'pottery')).toEqual({ cause: 'The bazaar has no pottery', fix: 'Storehouses come with Town' });
    w.milestone = 'town';
    expect(causeText({ code: 'good_unmade', id: null, good: 'beer' }, w, 'beer')).toEqual({ cause: 'Nothing makes beer near the bazaar', fix: 'Barley farms and breweries come with City' });
    w.milestone = 'city';
    expect(causeText({ code: 'good_unmade', id: null, good: 'beer' }, w, 'beer').fix).toBe('Make beer near it: a barley farm and a brewery');
    expect(causeText({ code: 'good_unmade', id: null, good: 'figs' }, w, 'twoFoods')).toEqual({ cause: 'Nothing grows figs near the bazaar', fix: 'Grow figs near it: a fig orchard' });
    expect(causeText({ code: 'no_good', id: null, good: 'figs' }, w, 'twoFoods').fix).toBe('Build a granary within 16 road tiles of it');
    expect(causeText({ code: 'next_delivery', id: null, good: 'figs' }, w, 'twoFoods').cause).toBe('The next delivery brings figs');
    expect(causeText({ code: 'next_delivery', id: null }, w, 'food')).toBe(CAUSE_TEXT.next_delivery);   // food keeps its words
    expect(causeText({ code: 'no_such_code', id: null }, w, 'water')).toBe(null);
  });
  it('names a missing booth, an idle one and one with no road, each with its fix', async () => {
    const { w, home } = street({ tier: 5, residents: 22, stock: { grain: 10, pottery: 5 } });
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), home.id));
      let fun = rowOf(r, 'entertainment');
      expect(words(fun, '.cause')).toBe(`No booth within 8 road tiles`);
      expect(words(fun, '.fix span')).toBe(CAUSE_TEXT.no_booth.fix);
      sheetTellsTheTruth(r);
      fire(fun.querySelector('.show-me'), 'click');
      expect(r.store.get().tool).toEqual({ kind: 'building', type: 'booth' });
      const booth = addRaw(w, 'booth', 16, 11, { paused: true });
      r.store.set(select(r.store.get(), home.id));
      fun = rowOf(r, 'entertainment');
      expect(words(fun, '.cause')).toBe('The booth is paused');
      fire(fun.querySelector('.view'), 'click');
      expect(r.store.get().selectedId).toBe(booth.id);
      removeBuilding(w, booth.id);
      addRaw(w, 'booth', 13, 7);                                                      // beside the home, but no road touches it
      r.store.set(select(r.store.get(), home.id));
      expect(words(rowOf(r, 'entertainment'), '.cause')).toBe('The booth has no road');
      sheetTellsTheTruth(r);
    } finally { r.cleanup(); }
  });
  it("shows the desirability score and its three biggest causes, with a garden's Show me while it falls short", async () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    const home = addRaw(w, 'house', 12, 9, { tier: 5, residents: 22, stock: { grain: 10, pottery: 5 }, stockedFor: 22 });
    addRaw(w, 'temple', 14, 11);                                                      // 2 tiles away: +6
    addRaw(w, 'garden', 12, 8);                                                       // touching: +3
    addRaw(w, 'potter', 8, 11);                                                       // 3 tiles away: -2
    staffAll(w);
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), home.id));
      let row = rowOf(r, 'desirability');
      expect(row.querySelector('.name').textContent).toBe(NEED_NAMES.desirability);
      expect(words(row, '.desirability')).toBe('7 of 20: +6 temple, +3 garden, −2 potter');        // spec 4.7's form
      expect(words(row, '.cause')).toBe(CAUSE_TEXT.low_desirability.cause);
      fire(row.querySelector('.show-me'), 'click');
      expect(r.store.get().tool).toEqual({ kind: 'building', type: 'garden' });
      addRaw(w, 'statue', 11, 9);
      addRaw(w, 'statue', 13, 9);
      r.store.set(select(r.store.get(), home.id));
      row = rowOf(r, 'desirability');
      expect(row.classList.contains('met')).toBe(true);
      expect(words(row, '.desirability')).toBe(desirabilityText(23, 20, desirabilityContributors(w, home, 3).map((d) => contributorText(d.value, d.type))));
      expect(words(row, '.desirability')).toBe('23 of 20: +8 statue, +8 statue, +6 temple');
      sheetTellsTheTruth(r);
    } finally { r.cleanup(); }
  });
  it('warns the month before a Manor drops for its street, in the words of spec 4.6', async () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    const manor = addRaw(w, 'house', 12, 8, { w: 2, d: 2, tier: 6, residents: 60, stock: { grain: 30, pottery: 10 }, stockedFor: 60, downTimer: 1 });
    addRaw(w, 'well', 12, 11);
    addRaw(w, 'temple', 14, 11);
    addRaw(w, 'booth', 16, 11);
    addRaw(w, 'bazaar', 17, 11);
    staffAll(w);
    expect(houseStatus(w, manor).missingNow.filter((n) => n !== 'desirability')).toEqual([]);   // every need met: only the street is short
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), manor.id));
      expect(r.root.querySelector('#sheet .keep-warning').textContent).toBe('Loses Manor in 1 month: the street is not pleasant enough');
      expect(keepWarningText('Manor', null)).toBe('The street is not pleasant enough to keep a Manor');
      sheetTellsTheTruth(r);
    } finally { r.cleanup(); }
  });
  it('asks a Townhouse for a 2×2 square of plots, with Show me on the plot tool, and says when the square is there', async () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    const home = addRaw(w, 'house', 12, 9, { tier: 5, residents: 22 });
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), home.id));
      let merge = rowOf(r, 'merge');
      expect(merge.querySelector('.name').textContent).toBe(`Room to become a ${TIERS[6].name}`);
      expect(words(merge, '.cause')).toBe(CAUSE_TEXT.no_square.cause);
      expect(words(merge, '.fix span')).toBe(`Make a square with three plots beside it, empty or ${TIERS[5].name}s`);
      sheetTellsTheTruth(r);
      fire(merge.querySelector('.show-me'), 'click');
      expect(r.store.get().tool).toEqual({ kind: 'houses' });
      for (const [x, y] of [[11, 8], [12, 8], [11, 9]]) addRaw(w, 'house', x, y);   // three empty plots: the north-west square
      r.store.set(select(r.store.get(), home.id));
      merge = rowOf(r, 'merge');
      expect([merge.classList.contains('met'), merge.querySelector('.status').textContent]).toEqual([true, T.hasIt]);
      sheetTellsTheTruth(r);
    } finally { r.cleanup(); }
  });
  it('sums up the economy: the difficulty, trade income, food by kind and each good made against used last month', async () => {
    const r = await rigUI();
    try {
      const rows = () => [...r.root.querySelectorAll('#sheet .row')].map((row) => [row.firstChild.textContent, row.lastChild.textContent]);
      r.world.difficulty = 'hard';
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(rows()[0]).toEqual([T.difficulty, 'Hard']);
      expect(r.root.querySelector('#sheet').textContent).toContain(T.noGoodsYet);
      r.store.set({ sheet: null });
      r.world.stats.lastMonth = { taxes: 10, wages: 4, upkeep: 2, net: 4, made: { pottery: 30, clay: 40, grain: 25 }, used: { pottery: 26, clay: 30, grain: 18 }, tradeIncome: 240 };
      r.world.buildings[Object.keys(r.world.buildings).find((id) => r.world.buildings[id].type === 'granary')].store = { grain: 50, figs: 12 };
      r.store.set(openSheet(r.store.get(), 'summary'));
      const all = rows();
      expect(all.some(([k, v]) => k === T.tradeIncome && v === '+240')).toBe(true);
      expect(all.some(([k, v]) => k === goodName('figs') && v === '12')).toBe(true);
      const head = [...r.root.querySelectorAll('#sheet h3')].find((h) => h.textContent === T.goodsLastMonth);
      const goods = [];
      for (let n = head.nextElementSibling; n && n.tagName !== 'H3'; n = n.nextElementSibling) goods.push([n.firstChild.textContent, n.lastChild.textContent]);
      expect(goods).toEqual([[goodName('grain'), '25 made, 18 used'], [goodName('pottery'), '30 made, 26 used'], [goodName('clay'), '40 made, 30 used']]);
    } finally { r.cleanup(); }
  });
  it('brings the desirability tip on a Townhouse sheet, and the merge tip once that one is seen', async () => {
    let t = 0;
    for (const seen of [[], ['desirability']]) {
      const r = await rigUI({ now: () => t });
      try {
        const des = TIPS.find((x) => x.trigger === 'desirabilityShown'), merge = TIPS.find((x) => x.trigger === 'townhouseSheet');
        const house = TIPS.find((x) => x.trigger === 'houseSheet');
        r.ui.settings.set({ seenTips: [house.id, ...(seen.length ? [des.id] : [])] });
        t = TIP_FIRST_DELAY_MS;
        const home = r.world.buildings[Object.keys(r.world.buildings).find((id) => r.world.buildings[id].type === 'house')];
        home.tier = 5;
        r.store.set(select(r.store.get(), home.id));
        const want = seen.length ? merge : des;
        expect(r.ui.tips.current()).toBe(want.id);
        expect(r.root.querySelector('#tip .text').textContent).toBe(TIP_TEXT[want.id]);
      } finally { r.cleanup(); t = 0; }
    }
  });
  it("has the words for Stage 2's firsts, achievements, daily goals and goal chapters, from the data", () => {
    for (const f of FIRSTS.filter((x) => x.check.kind === 'tier' && x.check.tier >= 5)) expect([f.id, FIRST_TEXT[f.id].head]).toEqual([f.id, `First ${TIERS[f.check.tier].name}`]);
    const madeFirst = FIRSTS.find((x) => x.check.kind === 'made');
    expect(FIRST_TEXT[madeFirst.id].head).toBe(`First ${goodName(madeFirst.check.good).toLowerCase()}`);
    const made = ACHIEVEMENTS.find((a) => a.measure.kind === 'made');
    expect(ACHIEVEMENT_TEXT[made.id]).toBe(`Make ${made.measure.n} ${goodName(made.measure.good).toLowerCase()}`);
    const trade = ACHIEVEMENTS.find((a) => a.measure.kind === 'tally' && a.measure.key === 'tradeIncome');
    expect(ACHIEVEMENT_TEXT[trade.id]).toBe(`Earn ${trade.measure.n} gold from trade`);
    const estate = ACHIEVEMENTS.find((a) => a.measure.kind === 'tier' && a.measure.n === 1);
    expect(ACHIEVEMENT_TEXT[estate.id]).toBe(`Have 1 home at ${TIERS[estate.measure.tier].name} or better`);
    for (const d of DAILY_POOL) expect([d.id, typeof DAILY_TEXT[d.id], DAILY_TEXT[d.id].length > 8]).toEqual([d.id, 'string', true]);
    const madeDaily = DAILY_POOL.find((d) => d.measure.kind === 'made');
    expect(DAILY_TEXT[madeDaily.id]).toBe(`Make ${madeDaily.n} ${goodName(madeDaily.measure.good).toLowerCase()}`);
    expect([CHAPTER_NAMES.goods, CHAPTER_NAMES.grand]).toEqual(['Goods', 'A grand city']);
  });
});
```

Add to the end of `tests/all.js`:

```js
import './sim/goodsMonth.test.js';
import './ui/houseSheetEconomy.test.js';
```

- [ ] **Step 2: Run them to see them fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "economy"` (it also matches the existing economy tests)
Expected: `LOAD ERROR`: `src/sim/goodsMonth.js` does not exist yet, and `text.js` does not export `desirabilityText`. (With those two stubbed, the house sheet tests fail on rows without causes, the missing `.desirability`, `.keep-warning` and merge rows, and the summary rows.)

- [ ] **Step 3: Implement**

**`src/sim/goodsMonth.js`.** Create:

```js
// The month's goods record for the city summary (spec 4.10: "each good as made against used last month"). Made is the
// month's rise in tally.made, against the totals kept at the last month end (stats.lastMonth.madeTotal). Used is what
// left homes' stock and the bazaars' stalls during the monthly housing check (homes eat and use their goods; a delivery
// only moves goods from a stall to a home), and, for a raw good, what the workshops took to make theirs, one for one.
// Trade income is the month's rise in tally.tradeIncome. runMonth (clock.js) stores it all in stats.lastMonth.
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS, HOUSEHOLD_GOODS } from '../data/goods.js';
import { allBuildings } from './world.js';

const HOME_GOODS = [...FOOD_GOODS, ...HOUSEHOLD_GOODS];

// What the record starts the month from: the made totals at the last month end, and trade income so far.
export function goodsMonthStart(world) {
  const last = world.stats.lastMonth;
  return { made: (last && last.madeTotal) || {}, tradeIncome: world.tally.tradeIncome || 0 };
}

// Food and household goods in homes' stock and on bazaar stalls, by good.
export function homeGoodsHeld(world) {
  const out = {};
  for (const g of HOME_GOODS) out[g] = 0;
  for (const b of allBuildings(world)) {
    const held = b.type === 'house' ? b.stock : BUILDINGS[b.type].sells ? b.store : null;
    if (held) for (const g of HOME_GOODS) out[g] += held[g] || 0;
  }
  return out;
}

// Writes made, used, madeTotal and tradeIncome into stats.lastMonth (set by monthlyEconomy earlier in the month's run).
export function recordGoodsMonth(world, start, heldBefore, heldAfter) {
  const totals = world.tally.made || {};
  const made = {};
  for (const [g, n] of Object.entries(totals)) if (n - (start.made[g] || 0) > 0) made[g] = n - (start.made[g] || 0);
  const used = {};
  for (const g of HOME_GOODS) if (heldBefore[g] - heldAfter[g] > 0) used[g] = heldBefore[g] - heldAfter[g];
  for (const def of Object.values(BUILDINGS)) {
    if (def.consumes && def.produces && made[def.produces.good]) used[def.consumes] = (used[def.consumes] || 0) + made[def.produces.good];
  }
  const record = world.stats.lastMonth || {};
  Object.assign(record, { made, used, madeTotal: { ...totals }, tradeIncome: (world.tally.tradeIncome || 0) - start.tradeIncome });
  world.stats.lastMonth = record;
}
```

**`src/sim/clock.js`.** After `import { population, HISTORY_MONTHS } from './world.js';`, add:

```js
import { goodsMonthStart, homeGoodsHeld, recordGoodsMonth } from './goodsMonth.js';
```

In `runMonth`, replace its first two lines:

```js
export function runMonth(world, events = null) {
  restockBazaars(world);
  monthlyHousing(world, events);
```

with:

```js
export function runMonth(world, events = null) {
  const goods = goodsMonthStart(world);               // the month's goods record for the summary (goodsMonth.js)
  restockBazaars(world);
  const held = homeGoodsHeld(world);
  monthlyHousing(world, events);
  const heldAfter = homeGoodsHeld(world);
```

and replace:

```js
  clearUndo(world);
  world.history.push(
```

with:

```js
  clearUndo(world);
  recordGoodsMonth(world, goods, held, heldAfter);   // after monthlyEconomy (it starts stats.lastMonth) and tradeMonth
  world.history.push(
```

(`recordGoodsMonth` must run after `monthlyEconomy`, which writes a fresh `stats.lastMonth`, and after Task 7's `tradeMonth`; if Task 7 put `tradeMonth` below `clearUndo`, put this line below `tradeMonth`.)

**`src/ui/hud.js`.** In `summaryData`, replace:

```js
  let foodStored = 0;
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (def.stores || def.sells) for (const g of FOOD_GOODS) foodStored += b.store[g] || 0;
  }
```

with:

```js
  let foodStored = 0;
  const foodByGood = Object.fromEntries(FOOD_GOODS.map((g) => [g, 0]));
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (def.stores || def.sells) for (const g of FOOD_GOODS) { foodStored += b.store[g] || 0; foodByGood[g] += b.store[g] || 0; }
  }
```

and replace:

```js
    taxes: last.taxes, wages: last.wages, upkeep: last.upkeep, net: last.net,
    foodStored, foodNeed,
```

with:

```js
    taxes: last.taxes, wages: last.wages, upkeep: last.upkeep, net: last.net,
    tradeIncome: last.tradeIncome || 0, made: last.made || {}, used: last.used || {}, difficulty: world.difficulty,   // the economy (spec 4.10, 4.18)
    foodStored, foodByGood, foodNeed,
```

**`src/ui/text.js`.** Replace the `NEED_NAMES` line:

```js
export const NEED_NAMES = { road: 'Road access', water: 'Water', food: 'Food', religion: 'Temple' };
```

with:

```js
export const NEED_NAMES = {
  road: 'Road access', water: 'Water', food: 'Food', religion: 'Temple',
  pottery: 'Pottery', entertainment: 'Entertainment', beer: 'Beer', twoFoods: 'Two kinds of food', linen: 'Linen', jewellery: 'Jewellery',
  desirability: 'Desirability', merge: `Room to become a ${TIERS[6].name}`,
};
```

At the end of `CAUSE_TEXT`, replace:

```js
  well_no_road: roadlessWords('well'),
  bazaar_no_road: roadlessWords('bazaar'),
  temple_no_road: roadlessWords('temple'),
};
```

with:

```js
  well_no_road: roadlessWords('well'),
  bazaar_no_road: roadlessWords('bazaar'),
  temple_no_road: roadlessWords('temple'),
  no_booth: { cause: `No booth within ${BUILDINGS.booth.reach} road tiles`, fix: 'Build a booth near it' },
  booth_idle: idleWords('booth'),
  booth_no_road: roadlessWords('booth'),
  low_desirability: { cause: 'The street is not pleasant enough', fix: 'Place gardens or statues near it, or move workshops away' },
  no_square: { cause: 'No 2×2 square of plots around it', fix: `Make a square with three plots beside it, empty or ${TIERS[5].name}s` },
};

// The buildings that make a good, in the order they are built: the raw producer, then the workshop ("clay pit,
// potter"; figs: "fig orchard").
export function goodMakers(good) {
  const maker = makerOf(good);
  if (!maker) return [];
  const input = BUILDINGS[maker].consumes;
  return [input ? makerOf(input) : null, maker].filter(Boolean);
}
const milestoneOf = (type) => MILESTONES.find((m) => m.unlocks.includes(type)) || null;
function unlockedIn(world, type) {
  const at = MILESTONES.findIndex((m) => m.id === world.milestone);
  return MILESTONES.slice(0, at + 1).some((m) => m.unlocks.includes(type));
}
const capitalised = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Words for the goods codes (spec 4.10), read as the food codes are: no_good, no store for the good within the
// bazaar's supply reach (like bazaar_empty), so the fix is that store; good_unmade, stores there but none holds any
// (like granary_empty), so the fix is what makes it. Buildings not unlocked yet are named with the milestone that
// brings them, so the fix is never a card the player cannot use.
const comeWith = (types) => `${capitalised(listText(types.map(pluralName)))} come with ${milestoneOf(types[0]).name}`;
function goodWords(code, good, world) {
  const name = goodWord(good);
  if (code === 'no_good') {
    const store = storeFor(good);
    return { cause: `The bazaar has no ${name}`, fix: unlockedIn(world, store) ? `Build a ${buildingName(store).toLowerCase()} within ${BUILDINGS.bazaar.supplyReach} road tiles of it` : comeWith([store]) };
  }
  const makers = goodMakers(good);
  const verb = makers.some((t) => BUILDINGS[t].consumes) ? 'Make' : 'Grow';
  const locked = makers.filter((t) => !unlockedIn(world, t));
  return {
    cause: `Nothing ${verb.toLowerCase()}s ${name} near the bazaar`,
    fix: locked.length ? comeWith(locked) : `${verb} ${name} near it: ${listText(makers.map((t) => `a ${buildingName(t).toLowerCase()}`))}`,
  };
}
```

Replace `causeText`:

```js
// The words for one needCause result: { cause, fix }. An idle provider reads its own building's state.
export function causeText(cause, world) {
  const t = CAUSE_TEXT[cause.code];
  if (!t.paused) return t;
  const b = world.buildings[cause.id];
  return b && b.paused ? t.paused : t.short;
}
```

with:

```js
// The words for one needCause result: { cause, fix }, or null for a code with no words. An idle provider reads its own
// building's state; the goods codes word themselves by the good (cause.good, else the need when it is a good), and a
// delivery on its way names the good it brings.
export function causeText(cause, world, need = null) {
  const good = cause.good || (need && GOODS[need] ? need : null);
  if (cause.code === 'next_delivery' && need !== 'food' && (good || need === 'twoFoods')) return { cause: good ? `The next delivery brings ${goodWord(good)}` : T.bothFoodsComing, fix: '' };
  if ((cause.code === 'no_good' || cause.code === 'good_unmade') && good) return goodWords(cause.code, good, world);
  const t = CAUSE_TEXT[cause.code];
  if (!t) return null;
  if (!t.paused) return t;
  const b = world.buildings[cause.id];
  return b && b.paused ? t.paused : t.short;
}

// The desirability row (spec 4.7): "14 of 20: +6 temple, +3 garden, −4 potter", and the warning before a home drops a
// tier for it (spec 4.6): "Loses Manor in 1 month: the street is not pleasant enough".
export const contributorText = (value, name) => `${value > 0 ? '+' : '−'}${Math.abs(value)} ${name}`;
export const desirabilityText = (value, target, parts = []) => `${progressText(Math.round(value), target)}${parts.length ? `: ${parts.join(', ')}` : ''}`;
export const keepWarningText = (tier, months) => (months === null || months === undefined
  ? `The street is not pleasant enough to keep a ${tier}`
  : `Loses ${tier} in ${plural(months, 'month', 'months')}: the street is not pleasant enough`);

// The city summary's economy (spec 4.10, 4.18): the difficulty, each good made against used last month.
export const DIFFICULTY_NAMES = { relaxed: 'Relaxed', normal: 'Normal', hard: 'Hard' };
export const madeUsedText = (made, used) => `${made} made, ${used} used`;
```

(The minus signs are U+2212; the multiplication sign in `no_square` is U+00D7. Food keeps its own `next_delivery` words, so the existing test that `causeText` returns `CAUSE_TEXT.no_road` itself still holds.)

Replace the `CHAPTER_NAMES` line with:

```js
export const CHAPTER_NAMES = { first_homes: 'First homes', feed: 'Feed the village', grow: 'Grow', goods: 'Goods', grand: 'A grand city', event: 'Needs attention' };
```

In `DAILY_TEXT`, add (replacing any entries Task 8 left for these ids):

```js
  pottery30: 'Make 30 pottery', gardens3: 'Build 3 gardens', sell20: 'Sell 20 goods to caravans', statue1: 'Build a statue', booth1: 'Build a booth',
```

At the end of `T`, replace (Task 13's last line):

```js
  caravanIdleWhy: 'Set what to buy and sell at the trading post.',
};
```

with:

```js
  caravanIdleWhy: 'Set what to buy and sell at the trading post.',
  difficulty: 'Difficulty', tradeIncome: 'Trade income', goodsLastMonth: 'Goods last month', noGoodsYet: 'Nothing made yet', bothFoodsComing: 'The next delivery brings both kinds of food',
};
```

In `FIRST_TEXT`, add (replacing any entries Task 8 left for these ids):

```js
  first_pottery: { head: 'First pottery', why: `A potter turned clay into pots. ${TIERS[5].name}s need pottery.` },
  first_townhouse: { head: `First ${TIERS[5].name}`, why: `Pottery let a home grow. ${TIERS[5].name}s hold ${TIERS[5].capacity} people.` },
  first_manor: { head: `First ${TIERS[6].name}`, why: `Four homes became one. ${TIERS[6].name}s hold ${TIERS[6].capacity} people.` },
  first_caravan: { head: 'First caravan', why: 'Traders came to the trading post. Set what they buy and sell there.' },
  first_fine_manor: { head: `First ${TIERS[7].name}`, why: `Beer and two kinds of food let a ${TIERS[6].name.toLowerCase()} grow.` },
  first_villa: { head: `First ${TIERS[8].name}`, why: `Linen let a home grow. ${TIERS[8].name}s hold ${TIERS[8].capacity} people.` },
  first_estate: { head: `First ${TIERS[9].name}`, why: 'Jewellery let a home grow into the finest home in the city.' },
```

In `ACHIEVEMENT_NAMES`, add (replacing any entries Task 8 left):

```js
  potters_wheel: "Potter's wheel", merchant_city: 'Merchant city', townhouse_terrace: 'Townhouse terrace', manor_row: 'Manor row',
  green_city: 'Green city', sculpture_garden: 'Sculpture garden', estate_life: 'Estate life', thousand: 'A thousand souls',
```

In `TALLY_CONDITIONS`, after the `harvested` line, add:

```js
  tradeIncome: (n) => `Earn ${n} gold from trade`,
  sold: (n) => `Sell ${n} goods to caravans`,
  bought: (n) => `Buy ${n} goods from caravans`,
  caravans: (n) => `Welcome ${n} caravans`,
```

In `achievementCondition`, replace the `tier` case:

```js
    case 'tier': return `Have ${m.n} homes at ${tierName(m.tier)} or better`;
```

with:

```js
    case 'tier': return `Have ${plural(m.n, 'home', 'homes')} at ${tierName(m.tier)} or better`;
```

and add, before `default:` (replacing any `made` case Task 8 added):

```js
    case 'made': return `Make ${m.n} ${goodWord(m.good)}`;
```

In `TIP_TEXT`, add (replacing any placeholders Task 8 left for the ids):

```js
  nicer_streets: 'Place gardens and statues near homes: Manors and up need a pleasant street.',
  merging_homes: 'Keep the plots beside a Townhouse free: four in a square become a Manor.',
```

(Every tip must fit three lines on a 360 px phone at 150% text; a longer merge tip measured four.)


**`src/ui/sheets.js`.** Replace:

```js
import { BUILDINGS } from '../data/buildings.js';
import { houseStatus, needCause } from '../sim/housing.js';
```

with:

```js
import { BUILDINGS } from '../data/buildings.js';
import { GOODS, FOOD_GOODS } from '../data/goods.js';
import { TIERS } from '../data/housing.js';
import { houseStatus, needCause } from '../sim/housing.js';
import { houseDesirability, desirabilityContributors } from '../sim/desirability.js';
import { isUnlocked } from '../sim/progression.js';
import { allBuildings } from '../sim/world.js';
```

Replace `import { ZOOM_STEP } from '../data/ui.js';` with:

```js
import { ZOOM_STEP, categoryOfItem } from '../data/ui.js';
```

Replace the `./text.js` import with:

```js
import { buildingName, tierName, NEED_NAMES, MOOD_NAMES, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, causeText, alertText, plural, progressText, achievementsHeading, achievementBarLabel, viewLabel, goodName, goodLine, workingText, waitingText,
  goodMakers, makerOf, storeFor, contributorText, desirabilityText, keepWarningText, madeUsedText, DIFFICULTY_NAMES, T } from './text.js';
```

At the end of `CAUSE_FIX`, replace:

```js
  well_no_road: { view: true },
  bazaar_no_road: { view: true },
  temple_no_road: { view: true },
};
```

with:

```js
  well_no_road: { view: true },
  bazaar_no_road: { view: true },
  temple_no_road: { view: true },
  no_booth: { category: 'services', item: 'booth', at: 'home' },
  booth_idle: { view: true },
  booth_no_road: { view: true },
  low_desirability: { category: 'homes', item: 'garden', at: 'home' },
  no_square: { category: 'homes', item: 'house', at: 'home' },
  // No store for the good near the bazaar: Show me that store beside the bazaar. Nothing makes it there: Show me the
  // first of its makers the city has none of (a clay pit, then a potter), else the workshop, beside the bazaar. Neither
  // while the building is not unlocked yet (the words then name the milestone).
  no_good: (cause, world) => {
    const item = storeFor(cause.good);
    return item && isUnlocked(world, item) ? { category: categoryOfItem(item), item, at: 'building' } : null;
  },
  good_unmade: (cause, world) => {
    const makers = goodMakers(cause.good);
    if (!makers.length || makers.some((t) => !isUnlocked(world, t))) return null;
    const item = makers.find((t) => !allBuildings(world).some((b) => b.type === t)) || makerOf(cause.good);
    return { category: categoryOfItem(item), item, at: 'building' };
  },
};
```

Replace the whole of `needRow` (from its comment through its closing brace) with:

```js
  // One row of the next-tier checklist: a mark, the need, a status in words (meaning never by colour alone);
  // a missing need adds its cause, then its fix: Show me when there is something to build, View when the
  // building that would serve it is already in reach and only needs resuming or workers. The desirability row
  // also shows its score and three biggest causes; the merge row (a Townhouse) asks for a 2x2 square.
  function needRow(h, c) {
    const li = el('li', { class: c.met ? 'met' : 'missing', dataset: { need: c.need } }, [el('div', { class: 'need' }, [
      el('span', { class: c.met ? 'tick' : 'cross', 'aria-hidden': 'true', text: c.met ? '✓' : '✕' }),
      el('span', { class: 'name', text: NEED_NAMES[c.need] }),
      el('span', { class: `status small ${c.met ? 'teal' : 'coral'}`, text: c.met ? T.hasIt : T.missing }),
    ])]);
    if (c.need === 'desirability') {
      const parts = desirabilityContributors(world, h, 3).map((d) => contributorText(d.value, contributorName(d)));
      li.append(el('p', { class: 'desirability small', text: desirabilityText(c.value, c.target, parts) }));
    }
    if (c.met) return li;
    const cause = c.need === 'merge' ? needCause(world, h, 'merge') || { code: 'no_square', id: null } : needCause(world, h, c.need);
    const words = cause ? causeText(cause, world, c.need) : null;
    if (!words) return li;
    li.append(el('p', { class: 'cause small', text: words.cause }));
    const fix = typeof CAUSE_FIX[cause.code] === 'function' ? CAUSE_FIX[cause.code](cause, world) : CAUSE_FIX[cause.code];
    // Nothing to build or view (goods on their way, a building not unlocked yet): the fix's words alone, when it has any.
    if (!fix) { if (words.fix) li.append(el('div', { class: 'fix' }, [el('span', { class: 'small muted', text: words.fix })])); return li; }
    const building = cause.id !== null ? world.buildings[cause.id] : null;
    let action;
    if (fix.view) {
      if (!building) return li;
      action = button(T.view, { class: 'view quiet', 'aria-label': viewLabel(buildingName(building.type)), onClick: () => onSelect(building.id) });
    } else {
      const at = centreOf(fix.at === 'building' && building ? building : h);
      const target = { category: fix.category, item: fix.item, x: at.x, y: at.y };
      action = button(T.showMe, { class: 'show-me primary', 'aria-label': `${T.showMe}: ${words.fix}`, onClick: () => onShowMe(target) });
    }
    li.append(el('div', { class: 'fix' }, [el('span', { class: 'small muted', text: words.fix }), action]));
    return li;
  }

  // A building that changes a home's desirability, by name: a home by its tier ("+2 manor"), anything else by its type.
  function contributorName(d) {
    const b = world.buildings[d.id];
    return (b && b.type === 'house' ? tierName(b.tier) : buildingName(d.type)).toLowerCase();
  }
```

(A merge row whose `needCause` returns nothing still says `no_square`: `merge.ready` false means no square can form, so the words are true by definition.)

In `houseSheet`, replace:

```js
    if (s.next) {
      body.append(el('h3', { text: `${T.nextTier} (${s.next.name})` }));
      body.append(el('ul', { class: 'checklist' }, s.checklist.map((c) => needRow(h, c))));
      if (s.tier >= 1 && s.checklist.every((c) => c.met)) body.append(el('p', { class: 'teal', text: T.upgradesAtMonthEnd }));
    }
    if (s.downgradeIn !== null && s.missingNow.length) body.append(el('p', { class: 'coral', text: `Loses ${NEED_NAMES[s.missingNow[0]].toLowerCase()} in ${plural(s.downgradeIn, 'month', 'months')}` }));
```

with:

```js
    if (s.next) {
      const merge = s.merge && s.merge.needed ? { need: 'merge', met: Boolean(s.merge.ready) } : null;
      const rows = [...s.checklist.filter((c) => c.need !== 'merge'), ...(merge ? [merge] : [])];
      body.append(el('h3', { text: `${T.nextTier} (${s.next.name})` }));
      body.append(el('ul', { class: 'checklist' }, rows.map((c) => needRow(h, c))));
      if (s.tier >= 1 && rows.every((c) => c.met)) body.append(el('p', { class: 'teal', text: T.upgradesAtMonthEnd }));
    }
    // The warning month (spec 4.6): a need running out names the need; a street below the tier's keep value names the tier.
    const lost = s.missingNow.find((n) => n !== 'desirability');
    const keep = s.tier >= 1 && TIERS[s.tier].desirability ? TIERS[s.tier].desirability.keep : null;
    if (s.downgradeIn !== null && lost) body.append(el('p', { class: 'coral', text: `Loses ${NEED_NAMES[lost].toLowerCase()} in ${plural(s.downgradeIn, 'month', 'months')}` }));
    else if (keep !== null && houseDesirability(world, h) < keep) body.append(el('p', { class: 'coral keep-warning', text: keepWarningText(tierName(s.tier), s.downgradeIn) }));
```

In `summarySheet`, replace:

```js
    const body = el('div', { class: 'body' });
    body.append(el('h3', { text: T.incomeVsSpending }), row(T.taxes, `+${d.taxes}`), row(T.wages, `−${d.wages}`), row(T.upkeep, `−${d.upkeep}`), row(T.net, (d.net >= 0 ? '+' : '') + d.net));
    body.append(el('h3', { text: T.foodInStore }), row(T.grain, `${d.foodStored}`), row(T.lasts, d.monthsOfFood === null ? '–' : plural(d.monthsOfFood, 'month', 'months')));
```

with:

```js
    const body = el('div', { class: 'body' });
    body.append(row(T.difficulty, DIFFICULTY_NAMES[d.difficulty] || d.difficulty));
    body.append(el('h3', { text: T.incomeVsSpending }), row(T.taxes, `+${d.taxes}`), row(T.wages, `−${d.wages}`), row(T.upkeep, `−${d.upkeep}`), row(T.net, (d.net >= 0 ? '+' : '') + d.net));
    body.append(row(T.tradeIncome, `+${d.tradeIncome}`));
    // Food in store by kind: grain always, other foods once there are some.
    body.append(el('h3', { text: T.foodInStore }), ...FOOD_GOODS.filter((g, i) => i === 0 || d.foodByGood[g] > 0).map((g) => row(goodName(g), `${d.foodByGood[g]}`)));
    body.append(row(T.lasts, d.monthsOfFood === null ? '–' : plural(d.monthsOfFood, 'month', 'months')));
    // Each good made against used last month (spec 4.10), in the data's order; only goods that moved.
    const moved = Object.keys(GOODS).filter((g) => d.made[g] || d.used[g]);
    body.append(el('h3', { text: T.goodsLastMonth }), ...(moved.length ? moved.map((g) => row(goodName(g), madeUsedText(d.made[g] || 0, d.used[g] || 0))) : [el('p', { class: 'muted', text: T.noGoodsYet })]));
```

(`goodName('grain')` reads "Grain", the word `T.grain` held, so the carry-over test that finds "Grain" in the summary still passes. Trade income stays its own row: `net` is the monthly economy's and does not include caravans.)

**`src/ui/createUI.js`.** In the store subscription that fires the house-sheet tip, replace:

```js
    if (opened && s.sheet.kind === 'info') { const b = world.buildings[s.sheet.id]; if (b && b.type === 'house') fireTip('houseSheet'); }
```

with:

```js
    if (opened && s.sheet.kind === 'info') {
      const b = world.buildings[s.sheet.id];
      if (b && b.type === 'house') {
        fireTip('houseSheet');
        if (b.tier >= 5) fireTip('desirabilityShown');   // its next tier needs a pleasant street (spec 4.7)
        if (b.tier === 5) fireTip('townhouseSheet');      // it grows by joining three plots beside it (spec 4.6)
      }
    }
```

(At most one tip shows at a time, so the first unseen one of the three wins and the others wait for a later sheet.)

**`css/ui.css`.** Append:

```css

/* The house sheet for the economy (spec 4.6, 4.7): the desirability row's score and causes sit under it, lined up with
   the cause and fix. */
.checklist .desirability { margin: 2px 0 0 calc(var(--mark-w) + 8px); }
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "house sheet for the economy"` then `-Grep "goods month"`
Expected: `9 passed, 0 failed` and `2 passed, 0 failed`, each ending `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

None in the existing suite (`tests/ui/houseSheetWhy.test.js`, `sheets.test.js`, `carryovers.test.js`, `hud.test.js`, `celebrate.test.js`, `tips.test.js` all pass: the house sheet keeps its classes and words for the Stage 1 codes, the summary still names "Grain", and `summaryData` only gains fields). If Task 8 changed `tests/ui/celebrate.test.js` or `tests/ui/tips.test.js` to tolerate missing words, restore their checks now that every first, achievement and tip has words: every `FIRSTS` entry has a head under 30 characters and a why over 20, `ACHIEVEMENT_NAMES` covers `ACHIEVEMENTS`, and every tip fits three lines.

- [ ] **Step 6: Visual check**

```
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url "/index.html?skipTitle=1&sample=1" -Out screenshots/t14-house-390.png -Width 390 -Height 844 -BudgetMs 2500 -Eval "(()=>{const t=window.__thebes;t.world.milestone='town';const h=Object.values(t.world.buildings).find(b=>b.type==='house'&&b.tier>=1);h.tier=5;h.residents=22;t.ui.refresh();t.ui.store.set({mode:'selected',selectedId:h.id,sheet:{kind:'info',id:h.id}});})()"
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url "/index.html?skipTitle=1&sample=1" -Out screenshots/t14-summary-390.png -Width 390 -Height 844 -BudgetMs 2500 -Eval "(()=>{const t=window.__thebes;t.world.difficulty='hard';t.world.stats.lastMonth={taxes:120,wages:40,upkeep:30,net:50,made:{grain:60,pottery:30,clay:40},used:{grain:52,pottery:26,clay:30},tradeIncome:240};t.ui.refresh();t.ui.store.set({sheet:{kind:'summary',id:null}});})()"
```

Expect: the Townhouse sheet ("To grow it needs (Manor)") lists Road access, Water, Food, Temple, Pottery, Entertainment, a Desirability row with its "N of 20: …" line, and "Room to become a Manor" last, each missing row with its cause, its fix and Show me or View; scroll the sheet to see the lower rows. The summary opens with "Difficulty Hard", then income with "Trade income +240", food in store, and "Goods last month" with "Grain 60 made, 52 used", "Pottery 30 made, 26 used", "Clay 40 made, 30 used". Delete the PNGs afterwards.

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED`.

- [ ] **Step 8: Commit**

```
git add src/sim/goodsMonth.js src/sim/clock.js src/ui/hud.js src/ui/text.js src/ui/sheets.js src/ui/createUI.js css/ui.css sw-files.js tests/all.js tests/sim/goodsMonth.test.js tests/ui/houseSheetEconomy.test.js
git commit -m @'
Explain the economy on the house sheet and the city summary

Every new need names its cause and fix with Show me: a missing store or maker near the bazaar, a booth, a pleasant
street with its score and three biggest causes, and the 2x2 square a Townhouse needs. The warning month names the
tier a street is about to lose. The summary shows the difficulty, trade income, food by kind and each good made
against used last month, kept in a small monthly record. Stage 2's firsts, achievements, daily goals and tips get
their words.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

### Task 15: Interface: overlays and the placement preview

**Files:**
- Modify: `src/data/ui.js` (`AUTO_OVERLAY` gains the booth, garden and statue; new `DESIRABILITY_STEPS`)
- Modify: `src/render/art/palette.js` (`UI.goods`, `UI.entertainment`, `UI.desirability`, `UI.nicer`)
- Modify: `src/render/art/ctx.js` (`g.polys`, `g.clipPolys`: many polygons as one path)
- Modify: `src/render/overlays.js` (seven `OVERLAYS`, `GRADED_OVERLAYS`, the goods mark, `desirabilityStep`, `desirabilityBands`, `DESIRABILITY_ALPHA`, `hatchTiles`, `drawDesirabilityTint`, the desirability branch of `drawOverlay`)
- Modify: `src/ui/text.js` (`OVERLAY_NAMES`, `OVERLAY_LEGEND`, `desirabilityBand`, `nicerText`)
- Modify: `src/ui/overlayUi.js` (the graded legend)
- Modify: `src/ui/placement.js` (`nicerFor`, `toolPreview`'s `nicer` and `nicerTone`, `placement.tint()`)
- Modify: `src/ui/confirmBar.js` (the "Makes 6 homes nicer" line, the `desire` class)
- Modify: `src/ui/createUI.js` (draws the tint under the ghost; the reach tip only for buildings with a reach)
- Modify: `css/ui.css` (the graded legend; room for the fourth confirm-bar line)
- Modify: `sw-files.js` (regenerated)
- Create test: `tests/ui/overlaysStage2.test.js`
- Modify tests: `tests/all.js`, `tests/render/overlays.test.js`, `tests/ui/overlayUi.test.js`, `tests/ui/placementFit.test.js`, `tests/ui/cornerWords.test.js`

**Interfaces:**
- Consumes: `desirabilityField(world)` (memoised on the buildings: the same `Float32Array` until a building is added, removed, moved, merged or changes tier) and `desirabilityPreview(world, type, x, y)` → `{ better, worse, tiles: [{ x, y, v }] }` (Task 5); `houseStatus(world, house).checklist` rows for `pottery`, `beer`, `linen`, `jewellery`, `entertainment` and `desirability` (Task 6); `coveredBy(world, house, 'entertainment')` behind them; `HOUSEHOLD_GOODS` (Task 2); `TIERS[t].desirability.rise` (Task 2); `costOf` in `toolPreview` (Task 1).
- Produces (contract): overlays `goods`, `entertainment`, `desirability` (graded) in the order water, food, religion, goods, entertainment, desirability, housing; `AUTO_OVERLAY` booth → entertainment, garden and statue → desirability; the placement tint (teal wash nicer, coral hatching worse) and the confirm-bar line "Makes N homes nicer" / "Makes N homes less pleasant". Also, for later tasks and tests: `GRADED_OVERLAYS`, `DESIRABILITY_STEPS`, `DESIRABILITY_ALPHA`, `desirabilityStep(v)`, `desirabilityBands(world, range)`, `hatchTiles(g, tiles, color, opts)`, `drawDesirabilityTint(g, tiles)`, `nicerFor(world, type, x, y)`, `desirabilityBand(k)`, `nicerText(better, worse)`.

How it reads: the desirability overlay takes `desirabilityField(world)` once per frame and walks the visible tiles (never `desirabilityAt` per tile), one filled path per band and one clip for all the hatched tiles, so a full screen of tiles is a handful of canvas calls. The preview is memoised per ghost tile on the identity of that field, so a frame that only redraws asks nothing and a ghost moved a tile asks once. The goods overlay marks a home on every household good its next tier needs (dot: all in stock, ring: one missing) over the bazaars' reach; entertainment does the same for the booth. Placing a garden or a statue turns the desirability overlay on (spec 4.5's rule, extended); the tint shows under the ghost whichever overlay is on.

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/overlaysStage2.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { OVERLAYS, OVERLAY_HUE, GRADED_OVERLAYS, DESIRABILITY_ALPHA, houseMark, drawOverlay, drawDesirabilityTint, desirabilityStep, desirabilityBands } from '../../src/render/overlays.js';
import { AUTO_OVERLAY, DESIRABILITY_STEPS } from '../../src/data/ui.js';
import { TIERS } from '../../src/data/housing.js';
import { createOverlayLegend } from '../../src/ui/overlayUi.js';
import { createPlacement, toolPreview, nicerFor } from '../../src/ui/placement.js';
import { createConfirmBar } from '../../src/ui/confirmBar.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, desirabilityBand, nicerText } from '../../src/ui/text.js';
import { place } from '../../src/sim/commands.js';
import { createWorld } from '../../src/sim/world.js';
import { buildStressCity } from '../../src/dev/sampleCity.js';
import { p, tileDiamond } from '../../src/render/iso.js';
import { makeDraw, rgba } from '../../src/render/art/ctx.js';
import { UI, TERRAIN } from '../../src/render/art/palette.js';
import { tileToScreen } from '../../src/render/camera.js';
import { T as TILE } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt, hexToRgb } from '../helpers/canvas.js';
import { uiWorld, rigUI } from '../helpers/uiWorld.js';
import { mount, fire } from '../helpers/dom.js';

const GARDEN = { kind: 'building', type: 'garden' };
const GRANARY = { kind: 'building', type: 'granary' };

// A canvas whose art origin sits at device (120, 60), drawn at 2 device px per art px, with tile (tx, ty) placed there.
function scene(tx = 0, ty = 0, background = null) {
  const c = makeCanvas(240, 200);
  const ctx = c.getContext('2d');
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, 240, 200); }
  const [ax, ay] = p(tx, ty);
  ctx.translate(120 - 2 * ax, 60 - 2 * ay);
  return { c, g: makeDraw(ctx, 2), at: (x, y) => { const q = p(x, y); return [120 + 2 * (q[0] - ax), 60 + 2 * (q[1] - ay)]; } };
}

// The device pixels along the middle row of tile (x, y), its centre 12 art px either side.
function rowAcross(s, x, y) {
  const [cx, cy] = s.at(x + 0.5, y + 0.5);
  const out = [];
  for (let dx = -20; dx <= 20; dx++) out.push(pixelAt(s.c, cx + dx, cy));
  return out;
}

const luminance = ([r, g, b]) => {
  const lin = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

// A road along y = 10 with a home of the given tier at (12, 11).
function street(tier, extra = {}) {
  const w = makeTestWorld({ gold: 5000 });
  setRoad(w, 0, 10, 31, 10);
  const h = addRaw(w, 'house', 12, 11, { tier, residents: TIERS[tier].capacity, ...extra });
  return { w, h };
}

describe('stage 2 overlays', () => {
  it('lists the seven overlays in order, with a name, a hue and a legend each, and shows the new ones on placing', () => {
    expect(OVERLAYS).toEqual(['water', 'food', 'religion', 'goods', 'entertainment', 'desirability', 'housing']);
    for (const o of OVERLAYS) {
      expect([o, typeof OVERLAY_NAMES[o], typeof OVERLAY_HUE[o]]).toEqual([o, 'string', 'string']);
      if (!GRADED_OVERLAYS.includes(o)) expect([o, OVERLAY_LEGEND[o].length]).toEqual([o, 2]);
    }
    expect(GRADED_OVERLAYS).toEqual(['desirability']);
    expect([AUTO_OVERLAY.booth, AUTO_OVERLAY.garden, AUTO_OVERLAY.statue, AUTO_OVERLAY.well]).toEqual(['entertainment', 'desirability', 'desirability', 'water']);
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world: uiWorld(), store });
    for (const [type, overlay] of [['booth', 'entertainment'], ['garden', 'desirability'], ['statue', 'desirability'], ['granary', null]]) {
      store.set({ overlay: null });
      pl.start({ kind: 'building', type }, { x: 20, y: 9 });
      expect([type, store.get().overlay]).toEqual([type, overlay]);
    }
  });
  it('marks the goods a home needs for its next tier, and entertainment from a booth in reach', () => {
    const plain = street(3);
    expect(houseMark(plain.w, plain.h, 'goods')).toBe(null);                  // a Cottage's next tier needs no household goods
    const house = street(4);
    expect(houseMark(house.w, house.h, 'goods')).toEqual({ has: false, need: 'pottery' });
    house.h.stock.pottery = 5;
    expect(houseMark(house.w, house.h, 'goods')).toEqual({ has: true, need: null });
    const town = street(5, { stock: { pottery: 5 } });
    expect(houseMark(town.w, town.h, 'entertainment')).toEqual({ has: false, need: 'entertainment' });
    addRaw(town.w, 'booth', 16, 9);
    staffAll(town.w);
    expect(houseMark(town.w, town.h, 'entertainment')).toEqual({ has: true, need: 'entertainment' });
    expect(houseMark(plain.w, plain.h, 'entertainment')).toBe(null);         // only homes on the way to a Manor want it
    const s = scene(12, 11);
    addRaw(house.w, 'bazaar', 14, 8);
    staffAll(house.w);
    drawOverlay(s.g, house.w, 'goods', { x0: 0, y0: 0, x1: 31, y1: 31 });
    let inked = 0;
    for (let x = 0; x < 240; x += 2) for (let y = 0; y < 200; y += 2) if (pixelAt(s.c, x, y)[3] > 0) inked++;
    expect(inked).toBeGreaterThan(10);                                         // the bazaar's reach and the home's mark
  });
  it('grades desirability in bands that start at each tier\'s "to rise" value, and words each band', () => {
    expect(DESIRABILITY_STEPS).toEqual([0, ...TIERS.filter((t) => t && t.desirability).map((t) => t.desirability.rise)]);
    expect(DESIRABILITY_STEPS).toEqual([0, 20, 35, 50, 65]);
    expect([-1, 0, 19, 20, 34, 35, 49, 50, 64, 65, 200].map(desirabilityStep)).toEqual([-1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect([-1, 0, 1, 2, 3, 4].map((k) => desirabilityBand(k).label)).toEqual(['<0', '0–19', '20–34', '35–49', '50–64', '65+']);
    expect(desirabilityBand(-1).words).toBe('Below 0: unpleasant');
    expect(desirabilityBand(1).words).toBe(`20 to 34: pleasant enough for a ${TIERS[6].name}`);
    expect(desirabilityBand(4).words).toBe(`65 or more: pleasant enough for a ${TIERS[9].name}`);
    // One hue, light to dark: over sand each band is darker than the one before by a clear step (spec 6.3, colour-blind safe).
    const sand = hexToRgb(TERRAIN.sand), hue = hexToRgb(OVERLAY_HUE.desirability);
    const lum = DESIRABILITY_ALPHA.map((a) => luminance(sand.map((v, i) => Math.round(v * (1 - a) + hue[i] * a))));
    for (let k = 1; k < lum.length; k++) expect([k, lum[k - 1] - lum[k] > 0.04]).toEqual([k, true]);
  });
  it('puts every tile in its band, leaves water and other buildings clear, and hatches below zero where the rest is a wash', () => {
    const w = makeTestWorld({ gold: 5000 });
    setRoad(w, 0, 10, 31, 10);
    w.terrain[idx(32, 20, 20)] = TILE.WATER;
    addRaw(w, 'garden', 5, 5);
    addRaw(w, 'granary', 20, 4);
    addRaw(w, 'house', 6, 5, { tier: 1, residents: 3 });
    const { below, steps } = desirabilityBands(w);
    const has = (list, x, y) => list.some(([a, b]) => a === x && b === y);
    expect(has(steps[0], 4, 4)).toBe(true);                                    // beside the garden: 3
    expect(has(steps[0], 6, 5)).toBe(true);                                    // the home's own tile counts
    expect(has(below, 19, 4)).toBe(true);                                      // beside the granary: -8
    expect([has(below, 20, 4), has(steps[0], 20, 4), has(below, 21, 5), has(steps[0], 21, 5)]).toEqual([false, false, false, false]);   // under the granary
    expect(steps.some((l) => has(l, 20, 20)) || has(below, 20, 20)).toBe(false); // water
    expect(steps[0].length + below.length + steps.slice(1).reduce((n, l) => n + l.length, 0)).toBe(32 * 32 - 1 - 4 - 1);   // all but water, the granary and the garden
    // Drawn on a clear canvas: the wash beside the garden is one even strength; the hatching beside the granary stripes.
    const s = scene(4, 4);
    drawOverlay(s.g, w, 'desirability', { x0: 0, y0: 0, x1: 31, y1: 31 });
    const wash = rowAcross(s, 4, 4).map((px) => px[3]);
    expect(Math.max(...wash) - Math.min(...wash)).toBeLessThanOrEqual(6);
    expect(Math.min(...wash)).toBeGreaterThan(0);
    const h = scene(18, 5);
    drawOverlay(h.g, w, 'desirability', { x0: 0, y0: 0, x1: 31, y1: 31 });
    const hatch = rowAcross(h, 18, 5).map((px) => px[3]);
    expect(Math.max(...hatch) - Math.min(...hatch)).toBeGreaterThan(100);
  });
  it('tints the ground a ghost would change: a teal wash where homes get nicer, coral hatching where they get worse', () => {
    const s = scene(0, 0);
    drawDesirabilityTint(s.g, [{ x: 0, y: 0, v: 3 }, { x: 3, y: 0, v: -4 }, { x: 0, y: 3, v: 0 }]);
    const wash = rowAcross(s, 0, 0);
    const alphas = wash.map((px) => px[3]);
    expect(Math.max(...alphas) - Math.min(...alphas)).toBeLessThanOrEqual(6);  // even: a wash
    const nicer = hexToRgb(UI.nicer);
    expect(wash.every((px) => Math.abs(px[0] - nicer[0]) <= 30 && Math.abs(px[1] - nicer[1]) <= 30 && Math.abs(px[2] - nicer[2]) <= 30)).toBe(true);
    const hatch = rowAcross(s, 3, 0).map((px) => px[3]);
    expect(Math.max(...hatch) - Math.min(...hatch)).toBeGreaterThan(100);     // stripes: a pattern, readable without colour
    expect(rowAcross(s, 0, 3).every((px) => px[3] === 0)).toBe(true);         // no change, no tint
  });
});

describe('stage 2 overlay legend', () => {
  it('shows the desirability scale as six bands with a label and words each, the first hatched, and cycles all seven overlays', () => {
    const { root, cleanup } = mount();
    try {
      const store = createStore(INITIAL_UI_STATE);
      const legend = createOverlayLegend({ container: root, store });
      store.set({ overlay: 'desirability' });
      const strip = root.querySelector('.strip');
      expect(strip.classList.contains('graded')).toBe(true);
      expect(strip.textContent).toContain(OVERLAY_NAMES.desirability);
      const bands = [...strip.querySelectorAll('.band')];
      expect(bands.map((b) => b.textContent)).toEqual(['<0', '0–19', '20–34', '35–49', '50–64', '65+']);
      expect(bands.map((b) => b.getAttribute('aria-label'))).toEqual([-1, 0, 1, 2, 3, 4].map((k) => desirabilityBand(k).words));
      expect(bands[0].querySelector('.swatch').classList.contains('hatch')).toBe(true);
      expect(bands[0].querySelector('.swatch').style.backgroundImage).toContain('repeating-linear-gradient');
      expect(bands[3].querySelector('.swatch').style.backgroundImage).toContain(rgba(OVERLAY_HUE.desirability, DESIRABILITY_ALPHA[2]).replace(/,/g, ', '));
      expect(strip.querySelector('.dot')).toBe(null);
      fire(strip.querySelector('.close'), 'click');
      expect(store.get().overlay).toBe(null);
      store.set({ overlay: 'goods' });
      expect(root.querySelector('.strip').textContent).toContain(OVERLAY_LEGEND.goods[1]);
      store.set({ overlay: null });
      const seen = [];
      for (let i = 0; i < 8; i++) { legend.cycle(); seen.push(store.get().overlay); }
      expect(seen).toEqual([...OVERLAYS, null]);
    } finally { cleanup(); }
  });
  it('keeps the scale on screen under the top bar on a phone at 150% text, with the close button 44 px', async () => {
    const r = await rigUI({ width: 360, height: 640 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.store.set({ overlay: 'desirability' });
      const strip = r.root.querySelector('#legend .strip').getBoundingClientRect();
      const shell = r.root.getBoundingClientRect();
      expect([strip.left >= shell.left, strip.right <= shell.right + 0.5]).toEqual([true, true]);
      expect(strip.bottom - shell.top).toBeLessThan(shell.height / 2);
      const close = r.root.querySelector('#legend .close').getBoundingClientRect();
      expect([close.width >= 44, close.height >= 44]).toEqual([true, true]);
      for (const b of r.root.querySelectorAll('#legend .band')) expect(b.getBoundingClientRect().right).toBeLessThanOrEqual(shell.right + 0.5);
    } finally { r.cleanup(); }
  });
});

describe('stage 2 placement preview', () => {
  it('says how many homes a building makes nicer or less pleasant, from the ghost\'s tile', () => {
    const world = uiWorld();                                                   // huts at (12, 9) and (13, 9), road along y = 10
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world, store });
    pl.start(GARDEN, { x: 12, y: 8 });
    expect(store.get().ghost).toEqual({ x: 12, y: 8 });
    expect([pl.preview().nicer, pl.preview().nicerTone]).toEqual(['Makes 2 homes nicer', 'better']);
    expect(pl.tint().length).toBeGreaterThan(0);
    expect(pl.tint().every((t) => t.v > 0)).toBe(true);
    pl.moveGhost(28, 2);                                                       // no homes anywhere near
    expect([pl.preview().state, pl.preview().nicer]).toEqual(['ok', '']);
    pl.start(GRANARY, { x: 14, y: 8 });
    expect([pl.preview().nicer, pl.preview().nicerTone]).toEqual(['Makes 2 homes less pleasant', 'worse']);
    pl.moveGhost(13, 9);                                                       // on a hut: blocked, so no line and no tint
    expect([pl.preview().state, pl.preview().nicer, pl.tint()]).toEqual(['bad', '', []]);
    pl.start({ kind: 'road' });
    expect([pl.preview().nicer, pl.tint()]).toEqual(['', []]);
    expect(nicerText(1, 0)).toBe('Makes 1 home nicer');
    expect(nicerText(3, 2)).toBe('Makes 3 homes nicer and 2 less pleasant');
    expect(nicerText(0, 0)).toBe('');
  });
  it('works the preview out once per ghost tile, and again only when the city changes', () => {
    const world = uiWorld();
    const a = nicerFor(world, 'garden', 12, 8);
    expect(nicerFor(world, 'garden', 12, 8) === a).toBe(true);                // a redraw asks nothing new
    expect(nicerFor(world, 'garden', 11, 8) === a).toBe(false);               // the next tile asks once
    const b = nicerFor(world, 'garden', 11, 8);
    expect(nicerFor(world, 'garden', 11, 8) === b).toBe(true);
    expect(place(world, 'garden', 20, 20).ok).toBe(true);
    expect(nicerFor(world, 'garden', 11, 8) === b).toBe(false);               // a new building: worked out afresh
    // A crowded 64 x 64 city: sweeping the ghost along a row of 40 tiles stays well inside a frame each, and a frame
    // that only redraws the same tile costs next to nothing.
    const big = buildStressCity(createWorld({ seed: 3 }), { days: 0 });
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world: big, store });
    pl.start(GARDEN, { x: 10, y: 4 });
    let started = performance.now();
    for (let x = 4; x < 44; x++) { pl.moveGhost(x, 4); pl.preview(); pl.tint(); }
    const sweep = performance.now() - started;
    expect(sweep).toBeLessThan(40 * 16);
    started = performance.now();
    for (let i = 0; i < 200; i++) nicerFor(big, 'garden', 43, 4);
    expect(performance.now() - started).toBeLessThan(20);
  });
  it('puts the line in the confirm bar in teal or coral, and keeps room for it', () => {
    const { root, cleanup } = mount();
    try {
      const world = uiWorld();
      const store = createStore(INITIAL_UI_STATE);
      const placement = createPlacement({ world, store });
      createConfirmBar({ container: root, store, placement, onCancel() {}, onConfirm() {}, onUndo() {} });
      placement.start(GARDEN, { x: 12, y: 8 });
      const line = root.querySelector('.confirm .nicer');
      expect(line.textContent).toBe('Makes 2 homes nicer');
      expect(line.classList.contains('teal')).toBe(true);
      expect(root.querySelector('.confirm').classList.contains('desire')).toBe(true);
      placement.moveGhost(28, 2);
      expect(root.querySelector('.confirm .nicer')).toBe(null);
      placement.start(GRANARY, { x: 14, y: 8 });
      expect(root.querySelector('.confirm .nicer').classList.contains('coral')).toBe(true);
      placement.start({ kind: 'road' });
      expect(root.querySelector('.confirm').classList.contains('desire')).toBe(false);
      placement.cancel();
    } finally { cleanup(); }
  });
  it('keeps the portrait confirm bar one height as the line comes and goes, and the corners on it', async () => {
    for (const size of [100, 150]) {
      const r = await rigUI({ width: 390, height: 844 });
      try {
        r.ui.settings.set({ textSize: size });
        const read = () => {
          const bar = r.root.querySelector('#confirm').getBoundingClientRect();
          const corner = r.root.querySelector('#corners .minimap-button').getBoundingClientRect().bottom;
          expect([size, corner <= bar.top + 0.5]).toEqual([size, true]);
          return bar.height;
        };
        r.ui.placement.start(GARDEN, { x: 28, y: 2 });
        expect(r.root.querySelector('#confirm .nicer')).toBe(null);
        const before = read();
        r.ui.placement.moveGhost(12, 8);
        expect(r.root.querySelector('#confirm .nicer').textContent).toBe('Makes 2 homes nicer');
        expect([size, read()]).toEqual([size, before]);
        r.ui.placement.cancel();
      } finally { r.cleanup(); }
    }
  });
  it('draws the tint on the map under the ghost while placing, and nothing once the tool is gone', async () => {
    const r = await rigUI({ width: 800, height: 600 });
    try {
      const at = () => { const [sx, sy] = tileToScreen(r.cam, { width: 800, height: 600 }, 11.5, 7.5); return pixelAt(r.canvas, sx, sy); };
      for (let i = 0; i < 8; i++) r.frame(i);                                  // every chunk in view baked
      const plain = at();
      r.ui.placement.start(GARDEN, { x: 12, y: 8 });
      r.store.set({ overlay: null });                                          // the tint alone, without the desirability overlay
      r.frame(16);
      const tinted = at();
      const nicer = hexToRgb(UI.nicer);
      const towards = (px) => Math.abs(px[0] - nicer[0]) + Math.abs(px[1] - nicer[1]) + Math.abs(px[2] - nicer[2]);
      expect(towards(tinted)).toBeLessThan(towards(plain) - 20);
      r.ui.placement.cancel();
      r.frame(32);
      expect(towards(at())).toBe(towards(plain));
    } finally { r.cleanup(); }
  });
});
```

In `tests/all.js`, replace:

```js
import './ui/overlayUi.test.js';
```

with:

```js
import './ui/overlayUi.test.js';
import './ui/overlaysStage2.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "stage 2 overlay"
```

Expected: the page reports `LOAD ERROR` with a `SyntaxError` that a module does not provide an export named one of the new names (`GRADED_OVERLAYS`, `DESIRABILITY_STEPS`, `nicerFor`, `desirabilityBand` ...), because none exists yet.

- [ ] **Step 3: Implement**

`src/data/ui.js`: the new automatic overlays and the desirability bands.

In `src/data/ui.js`, replace:

```js
// Interface data: what the build dock shows and in what order, key bindings, and gesture and timing tunables.
```

with:

```js
// Interface data: what the build dock shows and in what order, key bindings, and gesture and timing tunables.
import { TIERS } from './housing.js';
```

In `src/data/ui.js`, replace:

```js
export const AUTO_OVERLAY = { well: 'water', bazaar: 'food', temple: 'religion' };
```

with:

```js
export const AUTO_OVERLAY = { well: 'water', bazaar: 'food', temple: 'religion', booth: 'entertainment', garden: 'desirability', statue: 'desirability' };

// The desirability overlay's bands (spec 4.7, 6.3): where each starts. Below the first is unpleasant (hatched); the
// rest are the "to rise" values of the tiers that need desirability (Manor 20, Fine manor 35, Villa 50, Estate 65), so a
// band says which home a tile is pleasant enough for, and the overlay follows the data when those are tuned.
export const DESIRABILITY_STEPS = [0, ...TIERS.filter((t) => t && t.desirability).map((t) => t.desirability.rise)];
```
`src/render/art/palette.js`: three overlay hues and the preview's wash.

In `src/render/art/palette.js`, replace:

```js
  problem: '#A33624',   // the map's problem badge (early-game pass 2.8): white "!" on it reads at 6.8:1
};
```

with:

```js
  problem: '#A33624',   // the map's problem badge (early-game pass 2.8): white "!" on it reads at 6.8:1
  // Stage 2 overlays (spec 6.3): goods in kiln orange, entertainment in a deep rose, desirability as one indigo graded light
  // to dark; and the placement preview's wash where homes would get nicer (spec 4.7).
  goods: '#B5562A', entertainment: '#A8436B', desirability: '#3D3A8C', nicer: '#2E8C83',
};
```

`src/render/art/ctx.js`: many polygons in one path, so an overlay fills hundreds of tiles in one call with no seams between them.

In `src/render/art/ctx.js`, replace:

```js
  function tracePath(segs) {
```

with:

```js
  // Many polygons as one path (an overlay's tiles): one fill, and no seams where neighbours meet.
  function traceAll(list) {
    ctx.beginPath();
    for (const pts of list) {
      ctx.moveTo(s(pts[0][0]), s(pts[0][1]));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(s(pts[i][0]), s(pts[i][1]));
      ctx.closePath();
    }
  }

  function tracePath(segs) {
```

In `src/render/art/ctx.js`, replace:

```js
    poly(pts, fill, o = {}) { trace(pts); fillStroke(fill, o); },
```

with:

```js
    poly(pts, fill, o = {}) { trace(pts); fillStroke(fill, o); },
    polys(list, fill, o = {}) { if (list.length) { traceAll(list); fillStroke(fill, o); } },
```

In `src/render/art/ctx.js`, replace:

```js
    clip(pts) { trace(pts); ctx.clip(); },
```

with:

```js
    clip(pts) { trace(pts); ctx.clip(); },
    clipPolys(list) { traceAll(list); ctx.clip(); },
```

`src/render/overlays.js`: the three overlays, the graded desirability field, hatching and the placement tint.

In `src/render/overlays.js`, replace:

```js
// Overlays (spec 6.3): filled dot = has it, hollow ring = missing, one hue per overlay. Plus the reach
// highlight for a selected building and the placement ghost's three states (spec 6.5).
import { BUILDINGS } from '../data/buildings.js';
import { housesOf, allBuildings } from '../sim/world.js';
import { houseStatus } from '../sim/housing.js';
import { roadReach } from '../sim/reach.js';
import { isWorking } from '../sim/labour.js';
import { p, U, tileDiamond, quad } from './iso.js';
import { UI, INK, TEAL_DARK } from './art/palette.js';
import { ART, slotFor } from './art/registry.js';
import { GUIDE_PULSE_MS } from '../data/ui.js';

export const OVERLAYS = ['water', 'food', 'religion', 'housing'];
export const OVERLAY_HUE = { water: UI.water, food: UI.food, religion: UI.religion, housing: UI.housing };
export const SERVICE_TYPES = { water: ['well'], food: ['bazaar'], religion: ['temple'], housing: [] };

export function houseMark(world, house, kind) {
  const s = houseStatus(world, house);
  if (kind === 'housing') {
    const blocking = s.checklist.find((c) => !c.met);
    return { has: !blocking, need: blocking ? blocking.need : null };
  }
```

with:

```js
// Overlays (spec 6.3): filled dot = has it, hollow ring = missing, one hue per overlay; desirability is graded instead,
// one hue light to dark with hatching below zero. Plus the reach highlight for a selected building, the placement
// ghost's three states (spec 6.5) and the placement preview's desirability tint (spec 4.7).
import { BUILDINGS } from '../data/buildings.js';
import { HOUSEHOLD_GOODS } from '../data/goods.js';
import { housesOf, allBuildings } from '../sim/world.js';
import { houseStatus } from '../sim/housing.js';
import { roadReach } from '../sim/reach.js';
import { isWorking } from '../sim/labour.js';
import { desirabilityField } from '../sim/desirability.js';
import { T as TILE } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';
import { p, U, tileDiamond, quad } from './iso.js';
import { UI, INK, TEAL_DARK } from './art/palette.js';
import { ART, slotFor } from './art/registry.js';
import { GUIDE_PULSE_MS, DESIRABILITY_STEPS } from '../data/ui.js';

export const OVERLAYS = ['water', 'food', 'religion', 'goods', 'entertainment', 'desirability', 'housing'];
export const OVERLAY_HUE = {
  water: UI.water, food: UI.food, religion: UI.religion, goods: UI.goods, entertainment: UI.entertainment, desirability: UI.desirability, housing: UI.housing,
};
export const SERVICE_TYPES = { water: ['well'], food: ['bazaar'], religion: ['temple'], goods: ['bazaar'], entertainment: ['booth'], housing: [] };
// Overlays that draw a graded scale over the ground instead of dots and rings (spec 6.3); their legend is a scale too.
export const GRADED_OVERLAYS = ['desirability'];

export function houseMark(world, house, kind) {
  const s = houseStatus(world, house);
  if (kind === 'housing') {
    const blocking = s.checklist.find((c) => !c.met);
    return { has: !blocking, need: blocking ? blocking.need : null };
  }
  // Goods: every household good the home's next tier needs (pottery, beer, linen, jewellery); a home that needs none has no mark.
  if (kind === 'goods') {
    const rows = s.checklist.filter((c) => HOUSEHOLD_GOODS.includes(c.need));
    if (!rows.length) return null;
    const missing = rows.find((c) => !c.met);
    return { has: !missing, need: missing ? missing.need : null };
  }
```

In `src/render/overlays.js`, replace:

```js
export function drawOverlay(g, world, kind, range) {
  if (!SERVICE_TYPES[kind]) return;
```

with:

```js
export function drawOverlay(g, world, kind, range) {
  if (kind === 'desirability') { drawDesirability(g, world, range); return; }
  if (!SERVICE_TYPES[kind]) return;
```

In `src/render/overlays.js`, replace:

```js
export function drawReachHighlight(g, world, b) {
```

with:

```js
// Diagonal hatching over a set of tiles: one clip for all of them, then lines on a fixed art-px grid (x + y a multiple of
// HATCH_GAP), so the stripes stay put while the set changes under a moving ghost. Hatching, not a hue, is what says
// "worse" (spec 6.1), so it reads without colour.
const HATCH_GAP = 4;
export function hatchTiles(g, tiles, color, { fill = 0.12, line = 0.8, width = 1 } = {}) {
  if (!tiles.length) return;
  const polys = tiles.map(([x, y]) => tileDiamond(x, y));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of tiles) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); }
  const left = p(x0, y1)[0], right = p(x1, y0)[0], top = p(x0, y0)[1], bottom = p(x1, y1)[1];
  g.polys(polys, color, { alpha: fill });
  g.save();
  g.clipPolys(polys);
  const segs = [];
  for (let c = Math.floor((left + top) / HATCH_GAP) * HATCH_GAP; c <= right + bottom; c += HATCH_GAP) segs.push(['M', [c - bottom, bottom]], ['L', [c - top, top]]);
  g.stroke(segs, color, width, line);
  g.restore();
}

// The desirability overlay (spec 4.7, 6.3): each tile's score in one indigo, light to dark by the bands of
// DESIRABILITY_STEPS, and coral hatching below zero. Water and the tiles under other buildings stay clear: only open
// ground and homes have a use for the number. DESIRABILITY_ALPHA is each band's strength (the legend uses it too).
export const DESIRABILITY_ALPHA = [0.08, 0.2, 0.32, 0.44, 0.56];

// The band a score falls in: -1 below zero, else the index of the last step it reaches.
export function desirabilityStep(v) {
  if (v < 0) return -1;
  let k = 0;
  while (k + 1 < DESIRABILITY_STEPS.length && v >= DESIRABILITY_STEPS[k + 1]) k++;
  return k;
}

// The tiles in range by band: { below: [[x, y]...], steps: [[[x, y]...] per band] }. The draw and the tests share it.
export function desirabilityBands(world, range = null) {
  const field = desirabilityField(world);
  const r = range || { x0: 0, y0: 0, x1: world.size - 1, y1: world.size - 1 };
  const below = [];
  const steps = DESIRABILITY_STEPS.map(() => []);
  for (let y = Math.max(0, r.y0); y <= Math.min(world.size - 1, r.y1); y++) {
    for (let x = Math.max(0, r.x0); x <= Math.min(world.size - 1, r.x1); x++) {
      const i = idx(world.size, x, y);
      if (world.terrain[i] === TILE.WATER) continue;
      const id = world.occ[i];
      if (id && world.buildings[id].type !== 'house') continue;
      const v = field[i];
      if (v < 0) below.push([x, y]);
      else steps[desirabilityStep(v)].push([x, y]);
    }
  }
  return { below, steps };
}

function drawDesirability(g, world, range) {
  const { below, steps } = desirabilityBands(world, range);
  steps.forEach((tiles, k) => g.polys(tiles.map(([x, y]) => tileDiamond(x, y)), OVERLAY_HUE.desirability, { alpha: DESIRABILITY_ALPHA[k] }));
  hatchTiles(g, below, UI.bad, { fill: 0.1, line: 0.75 });
}

// The placement preview's tint (spec 4.7): a teal wash on the tiles a building would make nicer, coral hatching on
// those it would make worse. tiles = desirabilityPreview(...).tiles: [{ x, y, v }]. Wash against hatch, never colour alone.
export function drawDesirabilityTint(g, tiles) {
  const better = [], worse = [];
  for (const t of tiles || []) if (t.v > 0) better.push(tileDiamond(t.x, t.y)); else if (t.v < 0) worse.push([t.x, t.y]);
  g.polys(better, UI.nicer, { alpha: 0.28 });
  hatchTiles(g, worse, UI.bad, { fill: 0.1, line: 0.85 });
}

export function drawReachHighlight(g, world, b) {
```
`src/ui/text.js`: names, legends, the band words and the preview line.

In `src/ui/text.js`, replace:

```js
import { FIRSTS } from '../data/firsts.js';
```

with:

```js
import { FIRSTS } from '../data/firsts.js';
import { DESIRABILITY_STEPS } from '../data/ui.js';
```

In `src/ui/text.js`, replace:

```js
export const OVERLAY_NAMES = { water: 'Water', food: 'Food', religion: 'Religion', housing: 'Housing' };
```

with:

```js
export const OVERLAY_NAMES = { water: 'Water', food: 'Food', religion: 'Religion', goods: 'Goods', entertainment: 'Entertainment', desirability: 'Desirability', housing: 'Housing' };
```

In `src/ui/text.js`, replace:

```js
export const OVERLAY_LEGEND = {
  water: ['Has water', 'No water'], food: ['Has food', 'No food'], religion: ['Has a temple', 'No temple'], housing: ['Ready to grow', 'Next need missing'],
};
```

with:

```js
export const OVERLAY_LEGEND = {
  water: ['Has water', 'No water'], food: ['Has food', 'No food'], religion: ['Has a temple', 'No temple'],
  goods: ['Has its goods', 'Goods missing'], entertainment: ['Has entertainment', 'No entertainment'], housing: ['Ready to grow', 'Next need missing'],
};

// The desirability legend (spec 4.7, 6.3): a short label under each band's swatch, and words for screen readers that say
// what the band is pleasant enough for. Band -1 is below zero; the others follow DESIRABILITY_STEPS (src/data/ui.js).
const PLEASANT_TIERS = TIERS.filter((t) => t && t.desirability);
export function desirabilityBand(k) {
  const s = DESIRABILITY_STEPS;
  if (k < 0) return { label: `<${s[0]}`, words: `Below ${s[0]}: unpleasant` };
  const last = k + 1 >= s.length;
  const label = last ? `${s[k]}+` : `${s[k]}–${s[k + 1] - 1}`;
  const spoken = last ? `${s[k]} or more` : `${s[k]} to ${s[k + 1] - 1}`;
  return { label, words: k === 0 ? `${spoken}: plain` : `${spoken}: pleasant enough for a ${PLEASANT_TIERS[k - 1].name}` };
}

// What a building would do to the homes around it while it is placed (spec 4.7), from desirabilityPreview's counts.
export function nicerText(better, worse) {
  const homes = (n) => plural(n, 'home', 'homes');
  if (better && worse) return `Makes ${homes(better)} nicer and ${worse} less pleasant`;
  if (better) return `Makes ${homes(better)} nicer`;
  if (worse) return `Makes ${homes(worse)} less pleasant`;
  return '';
}
```
`src/ui/overlayUi.js`: a graded overlay shows its scale.

In `src/ui/overlayUi.js`, replace:

```js
// The overlay legend strip under the top bar (spec 6.3): name, filled dot = has it, hollow ring = missing,
// and a x that turns the overlay off. Overlays combine with browsing, so the strip never changes the mode.
import { OVERLAYS, OVERLAY_HUE } from '../render/overlays.js';
import { toggleOverlay, cycleOverlay } from './modes.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, T } from './text.js';
import { el, iconButton, clear } from './components.js';
```

with:

```js
// The overlay legend strip under the top bar (spec 6.3): name, filled dot = has it, hollow ring = missing,
// and a x that turns the overlay off. A graded overlay (desirability) shows its scale instead: a swatch and a label per
// band, hatched below zero as on the map. Overlays combine with browsing, so the strip never changes the mode.
import { OVERLAYS, OVERLAY_HUE, GRADED_OVERLAYS, DESIRABILITY_ALPHA } from '../render/overlays.js';
import { rgba } from '../render/art/ctx.js';
import { UI, TERRAIN } from '../render/art/palette.js';
import { DESIRABILITY_STEPS } from '../data/ui.js';
import { toggleOverlay, cycleOverlay } from './modes.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, desirabilityBand, T } from './text.js';
import { el, iconButton, clear } from './components.js';

// A band's swatch looks as the map does: the hue at the band's strength over sand, or coral hatching below zero.
function swatchStyle(kind, k) {
  if (k < 0) return { backgroundImage: `repeating-linear-gradient(135deg, ${UI.bad} 0 1.5px, ${TERRAIN.sand} 1.5px 4px)` };
  const c = rgba(OVERLAY_HUE[kind], DESIRABILITY_ALPHA[k]);
  return { backgroundImage: `linear-gradient(${c}, ${c})`, backgroundColor: TERRAIN.sand };
}

function scale(kind) {
  const bands = [-1, ...DESIRABILITY_STEPS.map((_, k) => k)];
  return el('span', { class: 'scale', role: 'list' }, bands.map((k) => {
    const b = desirabilityBand(k);
    return el('span', { class: 'band', role: 'listitem', 'aria-label': b.words, title: b.words, dataset: { band: String(k) } }, [
      el('span', { class: k < 0 ? 'swatch hatch' : 'swatch', style: swatchStyle(kind, k), 'aria-hidden': 'true' }),
      el('span', { class: 'text small', 'aria-hidden': 'true', text: b.label }),
    ]);
  }));
}
```

In `src/ui/overlayUi.js`, replace:

```js
    const [has, missing] = OVERLAY_LEGEND[kind];
    const colour = { color: OVERLAY_HUE[kind] };
    container.append(el('div', { class: 'strip', role: 'group', 'aria-label': `${OVERLAY_NAMES[kind]} ${T.overlay.toLowerCase()}` }, [
      el('strong', { class: 'text', text: OVERLAY_NAMES[kind] }),
      el('span', { class: 'key' }, [el('span', { class: 'dot', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: has })]),
      el('span', { class: 'key' }, [el('span', { class: 'ring', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: missing })]),
      iconButton(T.overlayOff, '✕', { class: 'close quiet', onClick: () => store.set(toggleOverlay(store.get(), kind)) }),
    ]));
```

with:

```js
    const graded = GRADED_OVERLAYS.includes(kind);
    const name = el('strong', { class: 'text', text: OVERLAY_NAMES[kind] });
    const close = iconButton(T.overlayOff, '✕', { class: 'close quiet', onClick: () => store.set(toggleOverlay(store.get(), kind)) });
    let keys;
    if (graded) keys = [scale(kind)];
    else {
      const [has, missing] = OVERLAY_LEGEND[kind];
      const colour = { color: OVERLAY_HUE[kind] };
      keys = [
        el('span', { class: 'key' }, [el('span', { class: 'dot', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: has })]),
        el('span', { class: 'key' }, [el('span', { class: 'ring', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: missing })]),
      ];
    }
    container.append(el('div', { class: graded ? 'strip graded' : 'strip', role: 'group', 'aria-label': `${OVERLAY_NAMES[kind]} ${T.overlay.toLowerCase()}` }, [name, ...keys, close]));
```
`src/ui/placement.js`: the memoised preview, the wrapped `toolPreview` (see the CONTRACT NOTE) and the tint for the frame.

In `src/ui/placement.js`, replace:

```js
import { homesServedFrom } from '../sim/housing.js';
```

with:

```js
import { homesServedFrom } from '../sim/housing.js';
import { desirabilityField, desirabilityPreview } from '../sim/desirability.js';
```

In `src/ui/placement.js`, replace:

```js
import { buildingName, reasonText, warningText, effectText, plural, T } from './text.js';
```

with:

```js
import { buildingName, reasonText, warningText, effectText, plural, nicerText, T } from './text.js';
```

In `src/ui/placement.js`, replace:

```js
export function toolPreview(world, state) {
```

with:

```js
// What a ghost would do to the desirability around it (spec 4.7), memoised per ghost tile: desirabilityField is memoised
// on the city's buildings, so while it hands back the same field nothing has changed and the last answer stands. A ghost
// moved a tile asks once; a frame that only redraws asks nothing.
const nicerMemo = new WeakMap();   // world -> { field, type, x, y, value }
export function nicerFor(world, type, x, y) {
  const field = desirabilityField(world);
  const m = nicerMemo.get(world);
  if (m && m.field === field && m.type === type && m.x === x && m.y === y) return m.value;
  const value = desirabilityPreview(world, type, x, y);
  nicerMemo.set(world, { field, type, x, y, value });
  return value;
}

function basePreview(world, state) {
```

In `src/ui/placement.js`, replace:

```js
// Ghost shapes for drawGhost. Demolish marks only the tiles that have something on them.
```

with:

```js
// The preview a tool shows. A building that can go where its ghost is also says what it would do to the homes around it
// (spec 4.7): nicer is "Makes 6 homes nicer" (or '') and nicerTone 'better', 'worse', 'mixed' or ''.
export function toolPreview(world, state) {
  const p = basePreview(world, state);
  if (!p) return p;
  p.nicer = '';
  p.nicerTone = '';
  if (state.tool.kind === 'building' && (p.state === 'ok' || p.state === 'warn')) {
    const d = nicerFor(world, state.tool.type, state.ghost.x, state.ghost.y);
    p.nicer = nicerText(d.better, d.worse);
    p.nicerTone = d.better && d.worse ? 'mixed' : d.better ? 'better' : d.worse ? 'worse' : '';
  }
  return p;
}

// Ghost shapes for drawGhost. Demolish marks only the tiles that have something on them.
```

In `src/ui/placement.js`, replace:

```js
    ghosts: () => ghostsFor(world, store.get()),
```

with:

```js
    ghosts: () => ghostsFor(world, store.get()),
    // The desirability tint under a building's ghost (spec 4.7): the tiles it would change, while it can go there.
    tint() {
      const s = store.get();
      if (!s.tool || s.tool.kind !== 'building' || !s.ghost) return [];
      const p = toolPreview(world, s);
      return p.state === 'ok' || p.state === 'warn' ? nicerFor(world, s.tool.type, s.ghost.x, s.ghost.y).tiles : [];
    },
```
`src/ui/confirmBar.js`: the fourth line, and the `desire` class that keeps room for it.

In `src/ui/confirmBar.js`, replace:

```js
import { BUILDINGS } from '../data/buildings.js';
```

with:

```js
import { BUILDINGS } from '../data/buildings.js';
import { DESIRABILITY } from '../data/desirability.js';
```

In `src/ui/confirmBar.js`, replace:

```js
      p.state === 'ok' && p.effect ? el('div', { class: `effect small ${p.effect === T.noHomesInReach ? 'muted' : 'teal'}`, text: p.effect }) : null,
    ]);
```

with:

```js
      p.state === 'ok' && p.effect ? el('div', { class: `effect small ${p.effect === T.noHomesInReach ? 'muted' : 'teal'}`, text: p.effect }) : null,
      // What it does to the homes around it (spec 4.7), in words; teal when nicer, coral when less pleasant, ink when both.
      p.nicer ? el('div', { class: `nicer small ${NICER_TONE[p.nicerTone]}`, text: p.nicer }) : null,
    ]);
```

In `src/ui/confirmBar.js`, replace:

```js
    const bar = el('div', { class: `confirm${demolish ? ' demolish' : ''}` }, [info, ...controls]);
```

with:

```js
    // A building that changes desirability keeps a line for it (css: .confirm.desire), so the bar never grows as the ghost moves.
    const desire = s.tool.kind === 'building' && (DESIRABILITY[s.tool.type] || []).length > 0;
    const bar = el('div', { class: `confirm${demolish ? ' demolish' : ''}${desire ? ' desire' : ''}` }, [info, ...controls]);
```

In `src/ui/confirmBar.js`, replace:

```js
const rotates = (tool) =>
```

with:

```js
const NICER_TONE = { better: 'teal', worse: 'coral', mixed: 'muted', '': 'muted' };
const rotates = (tool) =>
```
`src/ui/createUI.js`: the tint is worked out with the ghosts (on a UI state change or a command, not every frame) and drawn under the ghost; the "coloured tiles show reach" tip now fires only for a building that has a reach, since a garden or statue also turns an overlay on.

In `src/ui/createUI.js`, replace:

```js
import { drawOverlay, drawReachHighlight, drawGhost, drawProblemMarkers, drawGuideMarker } from '../render/overlays.js';
```

with:

```js
import { drawOverlay, drawReachHighlight, drawGhost, drawProblemMarkers, drawGuideMarker, drawDesirabilityTint } from '../render/overlays.js';
```

In `src/ui/createUI.js`, replace:

```js
  let lastDay = world.day, ghostsDirty = true, ghostState = null, ghostList = [];
```

with:

```js
  let lastDay = world.day, ghostsDirty = true, ghostState = null, ghostList = [], tintList = [];
```

In `src/ui/createUI.js`, replace:

```js
    if (s !== ghostState || ghostsDirty) { ghostState = s; ghostsDirty = false; ghostList = isToolMode(s.mode) ? placement.ghosts() : []; }
```

with:

```js
    if (s !== ghostState || ghostsDirty) {
      ghostState = s; ghostsDirty = false;
      ghostList = isToolMode(s.mode) ? placement.ghosts() : [];
      tintList = isToolMode(s.mode) ? placement.tint() : [];   // the desirability the ghost would change (spec 4.7)
    }
```

In `src/ui/createUI.js`, replace:

```js
        for (const ghost of ghosts()) drawGhost(g, ghost);
```

with:

```js
        const shapes = ghosts();                                                // refreshes the tint as well
        drawDesirabilityTint(g, tintList);                                     // spec 4.7: teal wash nicer, coral hatching worse, under the ghost
        for (const ghost of shapes) drawGhost(g, ghost);
```

In `src/ui/createUI.js`, replace:

```js
    if (e.undoable && e.kind === 'building' && store.get().tool && AUTO_OVERLAY[store.get().tool.type]) fireTip('servicePlaced');
```

with:

```js
    if (e.undoable && e.kind === 'building' && store.get().tool && AUTO_OVERLAY[store.get().tool.type] && BUILDINGS[store.get().tool.type].reach) fireTip('servicePlaced');   // a reach tip: a garden has none
```
`css/ui.css`: append at the end of the file:

```css

/* Stage 2 overlays and the placement preview (spec 4.7, 6.3). The desirability legend is a scale: a swatch over a short
   label per band, the first hatched as on the map. On a phone the scale takes a row of its own under the name and the x. */
#legend .strip.graded { flex-wrap: wrap; row-gap: 0; max-width: 100%; box-sizing: border-box; }
#legend .scale { display: inline-flex; flex-wrap: wrap; align-items: flex-start; gap: 2px 6px; }
#legend .band { display: inline-flex; flex-direction: column; align-items: center; min-width: 32px; }
#legend .swatch { display: block; width: 26px; height: 12px; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(43, 31, 14, 0.35); }
#legend .band .text { line-height: 1.25; white-space: nowrap; }
body:not([data-layout="wide"]) #legend .strip.graded .scale { order: 3; flex-basis: 100%; padding-bottom: 4px; }
body:not([data-layout="wide"]) #legend .strip.graded .close { margin-left: auto; }
/* A building that changes desirability has a fourth line in the confirm bar ("Makes 6 homes nicer"): in portrait the bar
   keeps room for it from the start (title 1.4em, three small lines of 1.05em; at 125% and 150% one of them may wrap). */
body[data-layout="portrait"] .confirm.desire .info { min-height: 4.55em; }
body[data-layout="portrait"]:is([data-text-size="125"], [data-text-size="150"]) .confirm.desire .info { min-height: 5.6em; }
```

(The `:is()` rule outranks the existing `body[data-layout="portrait"][data-text-size="125"] .confirm .info` rule by one class, `.desire`.)

- [ ] **Step 4: Run the tests to see them pass**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "stage 2 overlay"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "stage 2 placement preview"
```

Expected: `7 passed, 0 failed` and `5 passed, 0 failed`, each with `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

`grep -rn "OVERLAYS\|cycle()\|overlay: 'religion'\|well.height" tests` finds what the longer overlay list and the fourth confirm-bar line touch:
- `tests/render/overlays.test.js` counts four overlays; there are seven.
- `tests/ui/overlayUi.test.js` cycles through four.
- `tests/ui/placementFit.test.js` "keeps the portrait confirm bar one height..." starts a well beside the two huts and expects its bar to be no taller than the farm's far from them. A well beside homes now also says "Makes 1 home nicer", a line the far-off farm never shows, so at 390x844 and 150% the well's bar is taller (177 px against 151). The check is about a new tool starting afresh, so it starts the well away from the homes (no desirability line) and moves it beside them for the effect check after.
- `tests/ui/cornerWords.test.js` uses "the longest overlay word" (Religion) to prove the corner groups stay apart; Entertainment is now the longest. Both tests pass with it (run in the scratch copy), so they are pointed at it.
- `tests/ui/text.test.js` checks names and legends for the four Stage 1 overlays only; it still passes and needs no change (`overlaysStage2.test.js` checks all seven).

In `tests/render/overlays.test.js`, replace:

```js
    expect(OVERLAYS.length).toBe(4);
```

with:

```js
    expect(OVERLAYS.length).toBe(7);
```

In `tests/ui/overlayUi.test.js`, replace:

```js
  it('shows name, dot, ring and a close button for the current overlay, and cycles through all four', () => {
```

with:

```js
  it('shows name, dot, ring and a close button for the current overlay, and cycles through all seven', () => {
```

In `tests/ui/overlayUi.test.js`, replace:

```js
    for (let i = 0; i < 5; i++) { legend.cycle(); seen.push(store.get().overlay); }
    expect(seen).toEqual(['water', 'food', 'religion', 'housing', null]);
```

with:

```js
    for (let i = 0; i < 8; i++) { legend.cycle(); seen.push(store.get().overlay); }
    expect(seen).toEqual(['water', 'food', 'religion', 'goods', 'entertainment', 'desirability', 'housing', null]);
```

In `tests/ui/placementFit.test.js`, replace:

```js
          r.ui.placement.start(WELL, { x: 14, y: 9 });                                 // a new tool starts afresh
          expect(r.root.querySelector('#confirm .effect').textContent).toBe('Gives water to 2 homes');
          const well = read();
          expect([at, well.height <= tallest]).toEqual([at, true]);
```

with:

```js
          r.ui.placement.start(WELL, { x: 28, y: 9 });                                 // a new tool starts afresh (away from the homes, so
          const well = read();                                                         // no desirability line: Stage 2, spec 4.7)
          expect([at, well.height <= tallest]).toEqual([at, true]);
          r.ui.placement.moveGhost(14, 9);
          expect(r.root.querySelector('#confirm .effect').textContent).toBe('Gives water to 2 homes');
          read();
```

In `tests/ui/cornerWords.test.js`, replace:

```js
            r.store.set({ overlay: 'religion' });                                 // the longest overlay word
```

with:

```js
            r.store.set({ overlay: 'entertainment' });                            // the longest overlay word
```

In `tests/ui/cornerWords.test.js`, replace:

```js
            for (const [sel, word] of [['.minimap-button', T.mapButton], ['.overlay-button', OVERLAY_NAMES.religion]]) {
```

with:

```js
            for (const [sel, word] of [['.minimap-button', T.mapButton], ['.overlay-button', OVERLAY_NAMES.entertainment]]) {
```

In `tests/ui/cornerWords.test.js`, replace:

```js
      r.store.set({ overlay: 'religion' });                                       // the longest overlay word
```

with:

```js
      r.store.set({ overlay: 'entertainment' });                                  // the longest overlay word
```

Then:

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "overlay"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "placement fit"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "corner words"
```

Expected: each ends `ALL PASSED`.

- [ ] **Step 6: Visual check**

Save as `$env:TEMP\t15-shots.ps1` (the `-Eval` strings carry no spaces, which `powershell -File` would split) and run it from `C:\dev\thebes`:

```powershell
$O = "$env:TEMP\thebes-t15"
New-Item -ItemType Directory -Force $O | Out-Null
$url = '/index.html?skipTitle=1&sample=1&seed=11&nosw=1'
$desir = "(()=>{const t=window.__thebes;t.cam.x=22;t.cam.y=48;t.ui.store.set({overlay:'desirability'});})()"
$tint = "(()=>{const t=window.__thebes;t.cam.x=22;t.cam.y=48;t.ui.placement.start({kind:'building',type:'granary'},{x:24,y:47});t.ui.store.set({overlay:null});})()"
$garden = "(()=>{const t=window.__thebes;t.cam.x=22;t.cam.y=48;t.ui.placement.start({kind:'building',type:'garden'},{x:26,y:52});})()"
$goods = "(()=>{const t=window.__thebes;t.cam.x=22;t.cam.y=46;t.ui.store.set({overlay:'goods'});})()"
foreach ($shot in @(@('desir', $desir, 390, 844), @('desir', $desir, 1280, 800), @('tint', $tint, 390, 844), @('garden', $garden, 844, 390), @('goods', $goods, 768, 1024))) {
  $name = "$($shot[0])-$($shot[2])x$($shot[3]).png"
  powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url $url -Out "$O\$name" -Width $shot[2] -Height $shot[3] -Eval $shot[1] -BudgetMs 2500
}
```

(Task 17's sample city, seed 11, has the Stage 2 buildings and a Manor block at (21-24, 51-52); before Task 17 the shots still show the overlays over the Stage 1 village.) What should be visible:
- `desir-*`: the legend under the top bar, "Desirability" with six swatches (coral stripes, then five indigo steps light to dark) labelled `<0`, `0–19`, `20–34`, `35–49`, `50–64`, `65+`; on a phone the scale is a second row under the name and the x, the labels apart. On the map, coral hatching around huts, farms and the granary; a faint indigo on plain ground; darker indigo near the temples, the statues and gardens. The Layers corner button reads "Desirability". Water and the tiles under non-home buildings carry no tint (behind a tall building the tiles' hatching can show over its upper part, as the reach tint already does).
- `tint-390x844`: a granary ghost with coral hatching on the ground around it, and the confirm bar's fourth line "Makes N homes less pleasant" in coral under "80 gold".
- `garden-844x390` (compact): a garden ghost with a teal wash around it over the desirability overlay, "Makes N homes nicer" in teal in the bar's own text row.
- `goods-768x1024`: the bazaars' reach tinted orange, dots on homes stocked with pottery and rings on those lacking it; the legend "Goods: Has its goods / Goods missing".

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED` (12 tests more than after Task 14).

- [ ] **Step 8: Commit**

```powershell
git add src/data/ui.js src/render/art/palette.js src/render/art/ctx.js src/render/overlays.js src/ui/text.js src/ui/overlayUi.js src/ui/placement.js src/ui/confirmBar.js src/ui/createUI.js css/ui.css sw-files.js tests/all.js tests/ui/overlaysStage2.test.js tests/render/overlays.test.js tests/ui/overlayUi.test.js tests/ui/placementFit.test.js tests/ui/cornerWords.test.js
git commit -m @'
Add the goods, entertainment and desirability overlays, and show what a building does to the homes around it while placing

Desirability is one indigo graded light to dark in bands that start at each tier's rise value, with coral hatching below
zero; its legend is a six-band scale with words for screen readers. A ghost tints the ground it would change (teal wash
nicer, coral hatching worse) and the confirm bar says "Makes 6 homes nicer". Booths, gardens and statues turn their
overlay on when picked. The preview is memoised per ghost tile.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 16: Difficulty on the title card and in Settings

**Files:**
- Modify: `src/ui/text.js` (`difficultyHint`, `T.difficultyForNewCities`, `T.difficultyNote`)
- Modify: `src/ui/titleCard.js` (the Relaxed / Normal / Hard row under New city)
- Modify: `src/boot.js` (the title card starts on `settings.difficulty` and writes a new choice back)
- Modify: `src/ui/menu.js` (the Settings row "Difficulty for new cities")
- Modify: `css/ui.css` (the row; the card scrolls rather than clip)
- Modify: `sw-files.js` (regenerated)
- Create test: `tests/ui/difficultyChoice.test.js`
- Modify tests: `tests/all.js`, `tests/ui/installUi.test.js`

**Interfaces:**
- Consumes: `DIFFICULTIES`, `DIFFICULTY_ORDER` (Task 1, `src/data/difficulty.js`); `settings.difficulty` and `boot`'s `freshWorld`, which already creates every new city (title card, the confirmation over a saved city, the menu's New city, the development flags) with `createWorld({ seed, difficulty: settings.get().difficulty })` (Task 1); `DIFFICULTY_NAMES`, `T.difficulty` and the summary's difficulty row (Task 14, see the CONTRACT NOTE); `choiceRow` in `src/ui/menu.js`.
- Produces (contract): three choices under New city on the title card (`aria-pressed` buttons, 44 px), preselecting the setting (Normal the first time), a choice writing `settings.difficulty` so the last one used is chosen next time; a Settings row for new cities; the summary names the current city's level (Task 14's row, tested here). `createTitleCard` gains `difficulty` and `onDifficulty(level)` options; `difficultyHint(level)` in `src/ui/text.js`.

Nothing in the sim changes: the city's level is fixed when `freshWorld` creates it, and the setting only ever says what the next one will be. The hint under the title row is worked out from the cost multiplier ("Buildings, roads and trade routes cost 20% less"), so it follows the data; it promises nothing about fire or raids, which arrive in Stage 3.

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/difficultyChoice.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { createTitleCard } from '../../src/ui/titleCard.js';
import { createMenuSheets } from '../../src/ui/menu.js';
import { createSettings } from '../../src/ui/settings.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { openSheet } from '../../src/ui/modes.js';
import { boot, loadSave } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { packSave } from '../../src/save/serialize.js';
import { createWorld } from '../../src/sim/world.js';
import { DIFFICULTY_ORDER } from '../../src/data/difficulty.js';
import { T, DIFFICULTY_NAMES, difficultyHint } from '../../src/ui/text.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory, rigUI } from '../helpers/uiWorld.js';
import { mount, fire } from '../helpers/dom.js';

function storageWith(value) {
  const data = value ? { 'thebes.settings': JSON.stringify(value) } : {};
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}

// boot on the real page shell at a given size, with settings storage of our own (tests/ui/boot.test.js rigs it the same way).
async function bootAt({ width = 1280, height = 800, storage = storageWith(null), store = createSaveStore({ idb: fakeIndexedDB(), local: null }) } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const api = await boot(document, window, {
    root: document.body, store, params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const pressed = (root) => [...root.querySelectorAll('.choice.difficulty')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.value);

describe('ui difficulty choice', () => {
  it('puts Relaxed, Normal and Hard under New city, chooses the level it is given, and reports a new choice', () => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    try {
      const container = root.querySelector('#title');
      const chosen = [];
      const card = createTitleCard({ container, hasSave: false, difficulty: 'hard', onContinue() {}, onNewCity() {}, onSound() {}, onDifficulty: (d) => chosen.push(d) });
      const row = container.querySelector('.title-difficulty');
      expect(row.previousElementSibling.classList.contains('new-city')).toBe(true);   // directly under New city
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
      expect(document.activeElement).toBe(container.querySelector('.new-city'));     // focus still starts on the first button
      card.destroy();
      createTitleCard({ container, hasSave: true, difficulty: 'nonsense', onContinue() {}, onNewCity() {}, onSound() {} });
      expect(pressed(container)).toEqual(['normal']);                                  // anything else: Normal
      expect(document.activeElement).toBe(container.querySelector('.continue'));
    } finally { cleanup(); }
  });
  it('says what each level changes, from the data', () => {
    expect(difficultyHint('relaxed')).toBe('Buildings, roads and trade routes cost 20% less');
    expect(difficultyHint('normal')).toBe('Buildings, roads and trade routes at their usual cost');
    expect(difficultyHint('hard')).toBe('Buildings, roads and trade routes cost 25% more');
  });
  it('preselects the setting on the title card, keeps a new choice, and starts New city with it', async () => {
    const storage = storageWith({ difficulty: 'hard' });
    const r = await bootAt({ storage });
    try {
      const title = r.root.querySelector('#title');
      expect(pressed(title)).toEqual(['hard']);
      fire(title.querySelector('.choice.difficulty[data-value="relaxed"]'), 'click');
      expect(JSON.parse(storage.data['thebes.settings']).difficulty).toBe('relaxed');   // the last one used, next time
      fire(title.querySelector('.new-city'), 'click');
      expect(r.api.phase()).toBe('game');
      expect(r.api.game().world.difficulty).toBe('relaxed');
    } finally { r.cleanup(); }
  });
  it('starts the city with the chosen level through the confirmation over a saved city', async () => {
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    await store.save(packSave(createWorld({ seed: 4 }), { savedAt: 1760000000000 - 7200000, lastSpeed: 1 }));
    const storage = storageWith(null);
    const r = await bootAt({ store, storage });
    try {
      const title = r.root.querySelector('#title');
      expect(pressed(title)).toEqual(['normal']);                                      // the first time: Normal
      fire(title.querySelector('.choice.difficulty[data-value="hard"]'), 'click');
      fire(title.querySelector('.new-city'), 'click');
      expect(r.api.phase()).toBe('title');                                             // it asks first
      fire(title.querySelector('.start-new'), 'click');
      expect(r.api.game().world.difficulty).toBe('hard');
      await flush(); await flush();                                                    // the new city's first autosave
      expect((await loadSave(store)).world.difficulty).toBe('hard');
    } finally { r.cleanup(); }
  });
  it('keeps every title button and choice 44 px and the card on a small phone at 150% text', async () => {
    const r = await bootAt({ width: 360, height: 640, storage: storageWith({ textSize: 150 }) });
    try {
      const card = r.root.querySelector('.title-card');
      const shell = r.root.getBoundingClientRect();
      const box = card.getBoundingClientRect();
      expect([box.top >= shell.top - 0.5, box.bottom <= shell.bottom + 0.5, box.left >= shell.left, box.right <= shell.right + 0.5]).toEqual([true, true, true, true]);
      for (const b of card.querySelectorAll('button:not([hidden])')) {
        const rect = b.getBoundingClientRect();
        expect([b.textContent, rect.width >= 44, rect.height >= 44]).toEqual([b.textContent, true, true]);
      }
      expect(card.scrollHeight <= card.clientHeight + 1 || getComputedStyle(card).overflowY === 'auto').toBe(true);   // all of it can be reached
    } finally { r.cleanup(); }
  });
  it('holds the level for new cities in Settings, and leaves the city being played as it began', async () => {
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const settings = createSettings({ storage: storageWith(null), root, systemReducedMotion: () => false });
      const store = createStore(INITIAL_UI_STATE);
      const menus = createMenuSheets({ store, settings, toasts: { show() {} } });
      const body = root.querySelector('#body');
      menus.settings(body, { close() {} });
      const group = body.querySelector(`[role="group"][aria-label="${T.difficultyForNewCities}"]`);
      expect(group.closest('.row').textContent).toContain(T.difficultyForNewCities);
      expect([...group.querySelectorAll('.choice.difficulty')].map((b) => b.textContent)).toEqual(['Relaxed', 'Normal', 'Hard']);
      expect(pressed(group)).toEqual(['normal']);
      fire(group.querySelector('[data-value="hard"]'), 'click');
      expect([settings.get().difficulty, pressed(group)]).toEqual(['hard', ['hard']]);
      expect(body.querySelector('.difficulty-note').textContent).toBe(T.difficultyNote);
    } finally { cleanup(); }
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.difficulty = 'hard';
      r.store.set(openSheet(r.store.get(), 'summary'));
      const summary = () => r.root.querySelector('#sheet').textContent;
      expect(summary()).toContain(T.difficulty);
      expect(summary()).toContain(DIFFICULTY_NAMES.hard);
      r.ui.settings.set({ difficulty: 'relaxed' });                                     // the next city's level, not this one's
      r.ui.refresh();
      expect(r.world.difficulty).toBe('hard');
      expect(summary()).toContain(DIFFICULTY_NAMES.hard);
      expect(summary().includes(DIFFICULTY_NAMES.relaxed)).toBe(false);
    } finally { r.cleanup(); }
  });
});
```

In `tests/all.js`, replace:

```js
import './ui/titleCard.test.js';
```

with:

```js
import './ui/titleCard.test.js';
import './ui/difficultyChoice.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui difficulty choice"
```

Expected: `LOAD ERROR` with a `SyntaxError` that `src/ui/text.js` does not provide an export named `difficultyHint`.

- [ ] **Step 3: Implement**

`src/ui/text.js`: the hint and the two labels (`DIFFICULTY_NAMES` and `T.difficulty` are Task 14's).

In `src/ui/text.js`, replace:

```js
import { DESIRABILITY_STEPS } from '../data/ui.js';
```

with:

```js
import { DESIRABILITY_STEPS } from '../data/ui.js';
import { DIFFICULTIES } from '../data/difficulty.js';
```

In `src/ui/text.js`, replace:

```js
export const milestoneText = (name) => `Your city is now a ${name}`;
```

with:

```js
export const milestoneText = (name) => `Your city is now a ${name}`;

// Difficulty on the title card and in Settings (spec 4.18): one line saying what the chosen level changes, from its cost
// multiplier, so the words follow the data. Fire and raids (its risk multiplier) arrive in Stage 3 and are not promised.
export function difficultyHint(level) {
  const pct = Math.round((DIFFICULTIES[level].cost - 1) * 100);
  if (pct === 0) return 'Buildings, roads and trade routes at their usual cost';
  return `Buildings, roads and trade routes cost ${Math.abs(pct)}% ${pct < 0 ? 'less' : 'more'}`;
}
```

In `src/ui/text.js`, replace:

```js
  helpLevel: 'Help', suggested: 'Suggested', resumeGuide: 'Resume guide',
```

with:

```js
  helpLevel: 'Help', suggested: 'Suggested', resumeGuide: 'Resume guide',
  difficultyForNewCities: 'Difficulty for new cities', difficultyNote: 'A city keeps the level it started with. This one changes the next new city.',
```
`src/ui/titleCard.js`: the row sits directly under New city, so it hides with the other buttons while the install guide or the new-city confirmation shows, and the first button still takes focus.

In `src/ui/titleCard.js`, replace:

```js
// The title card (spec 4.1): Continue, New city, Play with sound / Play muted and Install over a paused,
// slowly drifting sample city. The backdrop only moves the camera; the sim behind it never ticks.
import { TITLE_DRIFT_MS } from '../data/ui.js';
import { el, button, clear } from './components.js';
import { T } from './text.js';

export function createTitleCard({ container, hasSave, canInstall = false, canBring = false, sound = false, message = null, onContinue, onNewCity, onSound, onInstall = () => {}, onBring = () => {} }) {
```

with:

```js
// The title card (spec 4.1): Continue, New city with its difficulty under it (spec 4.18), Play with sound / Play muted
// and Install over a paused, slowly drifting sample city. The backdrop only moves the camera; the sim behind it never ticks.
import { TITLE_DRIFT_MS } from '../data/ui.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
import { el, button, clear } from './components.js';
import { T, DIFFICULTY_NAMES, difficultyHint } from './text.js';

// Relaxed, Normal or Hard for the next new city: three pressed-state buttons with the chosen level's line under them.
// Choosing one tells onChoose (boot.js keeps it in settings.difficulty), so the last one used is chosen next time.
function difficultyRow(initial, onChoose) {
  let level = DIFFICULTY_ORDER.includes(initial) ? initial : 'normal';
  const hint = el('p', { class: 'difficulty-hint small muted', id: 'title-difficulty-hint' });
  const choices = DIFFICULTY_ORDER.map((d) => button(DIFFICULTY_NAMES[d], { class: 'choice difficulty', dataset: { value: d }, 'aria-describedby': 'title-difficulty-hint' }));
  const sync = () => { for (const b of choices) b.setAttribute('aria-pressed', String(b.dataset.value === level)); hint.textContent = difficultyHint(level); };
  for (const b of choices) b.addEventListener('click', () => { level = b.dataset.value; sync(); onChoose(level); });
  sync();
  return el('div', { class: 'title-difficulty' }, [
    el('span', { class: 'label small', 'aria-hidden': 'true', text: T.difficulty }),
    el('div', { class: 'choices', role: 'group', 'aria-label': T.difficultyForNewCities }, choices),
    hint,
  ]);
}

export function createTitleCard({ container, hasSave, canInstall = false, canBring = false, sound = false, difficulty = 'normal', message = null, onContinue, onNewCity, onSound, onDifficulty = () => {}, onInstall = () => {}, onBring = () => {} }) {
```

In `src/ui/titleCard.js`, replace:

```js
  const buttons = [];
  if (hasSave) buttons.push(button(T.continueGame, { class: 'continue primary', onClick: onContinue }));
  buttons.push(button(T.newCity, { class: hasSave ? 'new-city' : 'new-city primary', onClick: onNewCity }));
  if (canBring) buttons.push(button(T.bringCity, { class: 'bring', onClick: onBring }));
  buttons.push(soundButton, install);
  const buttonBox = el('div', { class: 'title-buttons' }, buttons);
```

with:

```js
  const newCity = button(T.newCity, { class: hasSave ? 'new-city' : 'new-city primary', onClick: onNewCity });
  const buttons = [];
  if (hasSave) buttons.push(button(T.continueGame, { class: 'continue primary', onClick: onContinue }));
  buttons.push(newCity);
  if (canBring) buttons.push(button(T.bringCity, { class: 'bring', onClick: onBring }));
  buttons.push(soundButton, install);
  const levels = difficultyRow(difficulty, onDifficulty);
  const buttonBox = el('div', { class: 'title-buttons' }, buttons.flatMap((b) => (b === newCity ? [b, levels] : [b])));   // the choice sits under New city
```
`src/boot.js`: the title card starts on the setting and keeps a new choice in it; `freshWorld` (Task 1) reads it whichever way New city is reached.

In `src/boot.js`, replace:

```js
      container: root.querySelector('#title'), hasSave: loaded.state === 'ok', canInstall: flow.canInstall(), canBring: flow.canBring(), sound: settings.get().sound, message,
```

with:

```js
      container: root.querySelector('#title'), hasSave: loaded.state === 'ok', canInstall: flow.canInstall(), canBring: flow.canBring(), sound: settings.get().sound, message,
      difficulty: settings.get().difficulty, onDifficulty: (level) => settings.set({ difficulty: level }),   // spec 4.18: freshWorld reads it
```
`src/ui/menu.js`: the Settings row, with a line saying it is for the next city.

In `src/ui/menu.js`, replace:

```js
import { KEYS, APP_VERSION } from '../data/ui.js';
```

with:

```js
import { KEYS, APP_VERSION } from '../data/ui.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
```

In `src/ui/menu.js`, replace:

```js
import { HELP_ROWS, HELP_NAMES, TIP_TEXT, T } from './text.js';
```

with:

```js
import { HELP_ROWS, HELP_NAMES, TIP_TEXT, DIFFICULTY_NAMES, T } from './text.js';
```

In `src/ui/menu.js`, replace:

```js
      choiceRow(T.helpLevel, 'help', [['full', HELP_NAMES.full], ['tips', HELP_NAMES.tips], ['off', HELP_NAMES.off]]),
    );
```

with:

```js
      choiceRow(T.helpLevel, 'help', [['full', HELP_NAMES.full], ['tips', HELP_NAMES.tips], ['off', HELP_NAMES.off]]),
      // Spec 4.18: the level the next new city starts at; the city being played keeps its own (the summary names it).
      choiceRow(T.difficultyForNewCities, 'difficulty', DIFFICULTY_ORDER.map((d) => [d, DIFFICULTY_NAMES[d]])),
      el('p', { class: 'difficulty-note small muted', text: T.difficultyNote }),
    );
```
`css/ui.css`: append at the end of the file:

```css

/* Difficulty under New city (spec 4.18): three choices on one row where they fit, the chosen level's line beneath. The
   card scrolls rather than clip if a small phone at 150% text cannot hold it all. */
.title-card { max-height: 100%; overflow-y: auto; }
.title-difficulty { display: flex; flex-direction: column; align-items: center; gap: 4px; margin: 0 0 4px; }
.title-difficulty .choices { justify-content: center; }
.title-difficulty .difficulty-hint { margin: 0; }
#sheet .difficulty-note { margin: 4px 0 0; }
```

The choices reuse the Settings sheet's `.choice` style (`min-height: var(--tap)`, the teal pressed state), so they are 44 px and say which is chosen by `aria-pressed` and a filled background, with the words on every button.

- [ ] **Step 4: Run the tests to see them pass**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui difficulty choice"
```

Expected: `6 passed, 0 failed`, `ALL PASSED`.

- [ ] **Step 5: Update the existing tests this breaks**

`grep -rn "previousElementSibling\|title-buttons" tests` finds one: `tests/ui/installUi.test.js` expects Bring a city to follow New city directly; the difficulty row now sits between them (spec 4.18 puts the choice under New city). `tests/ui/titleCard.test.js` and `tests/ui/boot.test.js` find their buttons by class and pass unchanged (run in the scratch copy).

In `tests/ui/installUi.test.js`, replace:

```js
    expect(bring.previousElementSibling.classList.contains('new-city')).toBe(true);
```

with:

```js
    expect(bring.previousElementSibling.classList.contains('title-difficulty')).toBe(true);                 // New city, its difficulty (spec 4.18), then Bring a city
    expect(bring.previousElementSibling.previousElementSibling.classList.contains('new-city')).toBe(true);
```

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "install guide"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui boot"
```

Expected: both `ALL PASSED`.

- [ ] **Step 6: Visual check**

Save as `$env:TEMP\t16-shots.ps1` and run it from `C:\dev\thebes`:

```powershell
$O = "$env:TEMP\thebes-t16"
New-Item -ItemType Directory -Force $O | Out-Null
$settings = "(()=>{const t=window.__thebes;t.ui.store.set({sheet:{kind:'settings',id:null}});})()"
$summary = "(()=>{const t=window.__thebes;t.world.difficulty='hard';t.ui.refresh();t.ui.store.set({sheet:{kind:'summary',id:null}});})()"
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/index.html?nosw=1' -Out "$O\title-390x844.png" -Width 390 -Height 844
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/index.html?nosw=1' -Out "$O\title-1280x800.png" -Width 1280 -Height 800
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/index.html?skipTitle=1&nosw=1' -Out "$O\settings-390x844.png" -Width 390 -Height 844 -Eval $settings
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/index.html?skipTitle=1&nosw=1' -Out "$O\summary-1280x800.png" -Width 1280 -Height 800 -Eval $summary
```

What should be visible: on the title card, under New city, the small word "Difficulty", three buttons Relaxed, Normal, Hard on one row with Normal filled teal (a fresh profile), and under them "Buildings, roads and trade routes at their usual cost"; then Play with sound. The card is still centred over the drifting city at both sizes. In Settings, a row "Difficulty for new cities" with the three choices and the note "A city keeps the level it started with. This one changes the next new city." In the summary, the row "Difficulty: Hard" (Task 14's).

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED` (6 tests more than after Task 15).

- [ ] **Step 8: Commit**

```powershell
git add src/ui/text.js src/ui/titleCard.js src/boot.js src/ui/menu.js css/ui.css sw-files.js tests/all.js tests/ui/difficultyChoice.test.js tests/ui/installUi.test.js
git commit -m @'
Choose Relaxed, Normal or Hard under New city, and for new cities in Settings

The title card's choice starts on the last level used (Normal the first time) and a new city, through the
confirmation over a saved one too, starts with it. A line under the choice says what it changes. The city being
played keeps its own level, which the summary names.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 17: Balance and the sample cities

> **Controller note.** This task's writer ran it with a stand-in for Task 6. If the long run's Manor checks or the sample city's Manor fail with the real merge and desirability rules, move the scripted statues, gardens or booth (script levers first, as the tuning table says) and record each change in the commit body.


**Files:**
- Create test: `tests/sim/capital.test.js` (the long run to Capital)
- Modify: `src/dev/sampleCity.js` (whole file: the title backdrop's Stage 2 phase and its fed, templed village; the stress city's Stage 2 buildings)
- Modify test: `tests/dev/sampleCity.test.js` (whole file)
- Modify: `tests/all.js`, `sw-files.js` (regenerated)
- Data (`src/data/*.js`): no change. The run below reached Capital with a positive treasury on Tasks 1-5's numbers as written; Step 4 says what to tune, in order, if the real Tasks 6-8 change that.

**Interfaces:**
- Consumes: the commands `drawRoad`, `paintHouses`, `place`, `canPlace`, `previewRoad`, `previewHouses` (`src/sim/commands.js`); `openRoute`, `setTradeOrder` (`src/sim/trade.js`, Task 7); `costOf`, `routeCostOf` (Tasks 1-2); `advanceDays`; `milestoneIndex`; `world.tally.made`, `.sold`, `.tradeIncome`, `.caravans` (Tasks 1, 3, 7); `house.met.food` and `house.met.pottery` from the monthly check (Task 4); Manors from merges (Task 6); `GOALS`, `EVENT_GOALS`, `GUIDE_REWARD`, `FIRSTS`, `FIRST_REWARD` for the reward allowance (Task 8 adds goals and firsts; the allowance is read from the data, so it follows).
- Produces: the long-run test; `buildSampleCity(world, { days = 360, stageTwoDays = 240 })` (a Stage 1 village, then, once it is a Town, a storehouse, a clay pit, a potter, a booth and a pleasant block that grows Townhouses and Manors); `buildStressCity` with every Stage 2 building and homes at tiers 1 to 5.

How the long run is built. A 48-tile map: a fertile band across the middle (rows 17-23) with a small rocky patch, desert elsewhere, the trade entry at the east end of the farm street. The script is a list of steps, each a public command with the milestone it waits for (and for some a population), run at each month end in order whenever the treasury can pay for the next one with 400 gold to spare, so the script never spends the city into debt and a failure to stay positive is the economy's. It lays a main street with homes both sides and two bazaars, two temples and four wells on its north side; a short works road down to a farm street with the granaries and, at its corner, the storehouse; at Town two clay pits and two potters (a third potter at Market town: raw-limited on purpose, see below), fig orchards, a booth and a block of paired plots with statues and gardens behind it where Manors form; at Market town the road to the trade entry, a trading post, the Memphis route and an order to sell pottery above 150; at City a barley farm, a brewery, an order to sell beer above 40, and three more grain farms for jobs. The checks: every step placed; Capital within 36 months; the lowest month-end treasury above zero; at least 1,000 people and mood 30 or more after six years; no money from nowhere (the final treasury is at most the starting gold plus every month's taxes, trade income and all the gold goals and firsts can pay); no stuck chain (in the final year clay and pottery at least 360 each, barley and beer at least 180, grain and figs together at least 3,000); the homes supplied at the last monthly check (95% of homes at Cottage and up fed, 90% of Townhouses and up with pottery); at least two Manors; at least four caravans and something sold; under 5 s.

What the run showed (scratch copy, Tasks 1-5 as planned, Task 7's trade, a Task 6 stand-in): Capital at month 17; lowest month-end gold 379 (in month 6, when the village's wages ran ahead of its Huts' taxes); 1,122 people and mood 46 at the end; in the last year 960 clay, 960 pottery, 360 barley, 300 beer, 3,497 food; every fed and pottery check at 100%; 4 Manors; 21 caravans, 170 beer sold; 539 ms for 72 months. Things the run taught, kept in the script and worth knowing for the follow-ups note:
- A raw good that outruns its workshop fills the shared storehouse, and then every chain that stores there stops. With 2 clay pits and 2 potters (80 clay against 60 pottery a month) the storehouse filled with clay and beer by year 3, pottery stopped and the Townhouses fell back. The script keeps chains raw-limited (2 pits feed 3 potters); a player meets the same trap.
- Homes eat grain before figs, so fig orchards beyond what two-food homes need fill the granaries with figs and the grain farms report "no storage". The script builds two orchards.
- The treasury reaches about 150,000 by year 6: unemployment sits near 50% (the script builds the jobs it needs, not the jobs the people want), so wages are low, and there is nothing to spend on until Stage 4. Not a money loop (the no-money-from-nowhere check holds with room to spare); worth a line in the follow-ups.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/capital.test.js`:

```js
import { describe, it, expect } from '../harness.js';
import { advanceDays } from '../../src/sim/clock.js';
import { place, drawRoad, paintHouses, canPlace, previewRoad, previewHouses } from '../../src/sim/commands.js';
import { openRoute, setTradeOrder } from '../../src/sim/trade.js';
import { createWorld, allBuildings, housesOf, population } from '../../src/sim/world.js';
import { milestoneIndex } from '../../src/sim/progression.js';
import { ECONOMY } from '../../src/data/economy.js';
import { GOALS, EVENT_GOALS, GUIDE_REWARD } from '../../src/data/goals.js';
import { FIRSTS, FIRST_REWARD } from '../../src/data/firsts.js';
import { costOf, routeCostOf } from '../../src/sim/costs.js';
import { T } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';

// The Stage 2 balance run (spec 9, 11): a city laid only through the public commands, the way a steady player would,
// grows from the starting treasury to Capital, then lives on for years. Each step waits for its milestone (and some for
// a population) and for the gold to pay for it with RESERVE to spare, so the script never spends the treasury below
// zero; whether it stays above zero after that is down to the economy. The chains are laid so their raw goods never
// outrun the workshops (two clay pits feed three potters), because a raw good that piles up fills the shared
// storehouse and stops every chain that uses it.
const SIZE = 48;
const RESERVE = 400;

// A band of fertile land south of the centre (farms) with a rocky patch in it at the west end (the gem mine), desert
// elsewhere. The trade entry is the east end of the farm street, which the script lays.
function capitalWorld() {
  const terrain = new Array(SIZE * SIZE).fill(T.DESERT);
  for (let y = 17; y < 24; y++) for (let x = 0; x < SIZE; x++) terrain[idx(SIZE, x, y)] = T.FERTILE;
  for (let y = 21; y < 23; y++) for (let x = 10; x < 14; x++) terrain[idx(SIZE, x, y)] = T.ROCKY;
  const map = { size: SIZE, terrain, tradeEntry: { x: 47, y: 20 }, startRoad: [], focus: { x: 24, y: 16 }, raiderEntries: [] };
  return createWorld({ seed: 5, size: SIZE, map });
}

// Each step: the milestone it waits for, what it costs now, and the command. A step that fails for any reason but gold
// is a broken script, so the run stops there.
const road = (x0, y0, x1, y1) => ({ cost: (w) => previewRoad(w, x0, y0, x1, y1).cost, run: (w) => drawRoad(w, x0, y0, x1, y1) });
const build = (type, x, y) => ({ cost: (w) => { const c = canPlace(w, type, x, y); return c.ok || c.reason === 'no_gold' ? costOf(w, type) : Infinity; }, run: (w) => place(w, type, x, y), type, x, y });
const plots = (x0, y0, x1, y1) => ({ cost: (w) => previewHouses(w, x0, y0, x1, y1).cost, run: (w) => paintHouses(w, x0, y0, x1, y1) });
const route = (partner) => ({ cost: (w) => routeCostOf(w, partner), run: (w) => openRoute(w, partner) });
const order = (good, mode, keep) => ({ cost: () => 0, run: (w) => setTradeOrder(w, good, mode, keep) });
const at = (milestone, ...steps) => steps.map((s) => ({ milestone, pop: 0, ...s }));
const once = (pop, ...steps) => steps.map((s) => ({ ...s, pop }));

// The main street (y 12) has homes on both sides and its services on the north side. A short works road (x 24) runs
// south past the granaries to the farm street (y 20) on the fertile band, where the storehouse sits at the corner with
// the workshops along the street. A block of paired plots (rows 13 and 14, east) with statues and gardens behind it is
// where Manors can form.
const CAPITAL_SCRIPT = [
  ...at('village',
    road(4, 12, 40, 12), road(24, 13, 24, 19), road(8, 20, 38, 20),
    build('farm_grain', 20, 18), build('granary', 25, 17),
    build('well', 17, 11), build('well', 25, 11), build('bazaar', 14, 10),
    plots(10, 13, 23, 13),
    ...once(40, build('temple', 19, 10), build('farm_grain', 27, 18)),
    ...once(80, build('well', 33, 11), build('well', 38, 11), plots(25, 13, 30, 13), plots(32, 13, 39, 13)),
    ...once(110, build('bazaar', 29, 10), build('temple', 34, 10), plots(10, 11, 39, 11), build('farm_grain', 18, 18)),
    ...once(140, build('farm_grain', 22, 21), build('farm_grain', 29, 18)),
  ),
  ...at('town',
    build('storehouse', 22, 18), build('clay_pit', 18, 21), build('potter', 20, 21),
    build('farm_fig', 16, 18), build('farm_fig', 31, 18),
    build('booth', 31, 13), plots(27, 14, 30, 14), plots(32, 14, 39, 14),
    build('statue', 29, 15), build('statue', 33, 15), build('statue', 37, 15),
    build('garden', 27, 15), build('garden', 31, 15), build('garden', 35, 15), build('garden', 39, 15),
    build('clay_pit', 14, 21), build('potter', 16, 21), build('granary', 25, 15), build('farm_grain', 24, 21),
  ),
  ...at('market_town',
    road(39, 20, 47, 20), build('trading_post', 36, 21), route('memphis'),
    order('pottery', 'sell', 150),
    build('farm_grain', 26, 21), build('farm_grain', 33, 18), build('potter', 12, 21),
  ),
  ...at('city',
    build('farm_barley', 28, 21), build('brewery', 30, 21), order('beer', 'sell', 40),
    build('farm_grain', 14, 18), build('farm_grain', 32, 21), build('farm_grain', 34, 21),
  ),
];

function sane(w) {
  expect(Number.isFinite(w.gold)).toBe(true);
  expect(w.mood >= 0 && w.mood <= 100).toBe(true);
  for (const b of allBuildings(w)) {
    for (const v of Object.values(b.store)) expect(v).toBeGreaterThanOrEqual(0);
    if (b.type === 'house') {
      expect(b.residents).toBeGreaterThanOrEqual(0);
      for (const v of Object.values(b.stock)) expect(v).toBeGreaterThanOrEqual(0);
    }
  }
}

// Runs the script month by month: each month end, the next steps whose milestone, population and price allow.
function runCapital(months) {
  const w = capitalWorld();
  let next = 0, lowestGold = w.gold, taxes = 0, capitalMonth = null;
  const made = [];                                   // tally.made at each month end
  const tryBuild = () => {
    while (next < CAPITAL_SCRIPT.length) {
      const s = CAPITAL_SCRIPT[next];
      if (milestoneIndex(w.milestone) < milestoneIndex(s.milestone) || population(w) < s.pop) return;
      const cost = s.cost(w);
      if (!Number.isFinite(cost)) throw new Error(`step ${next} (${s.type} at ${s.x}, ${s.y}) cannot go there: ${canPlace(w, s.type, s.x, s.y).reason}`);
      if (w.gold - cost < RESERVE) return;
      const r = s.run(w);
      if (!r.ok) throw new Error(`step ${next} failed: ${r.reason}`);
      next++;
    }
  };
  tryBuild();
  for (let m = 1; m <= months; m++) {
    advanceDays(w, 30);
    sane(w);
    lowestGold = Math.min(lowestGold, w.gold);
    taxes += w.stats.lastMonth.taxes;
    if (capitalMonth === null && w.milestone === 'capital') capitalMonth = m;
    made.push({ ...w.tally.made });
    tryBuild();
  }
  return { w, steps: next, lowestGold, taxes, capitalMonth, made };
}

const YEARS = 6;
const share = (list, test) => list.filter(test).length / Math.max(1, list.length);

describe('capital run', () => {
  it('grows from the starting treasury to Capital through the public commands, stays solvent, and keeps its chains and homes supplied', () => {
    const started = performance.now();
    const r = runCapital(YEARS * 12);
    const elapsed = performance.now() - started;
    const { w } = r;
    expect(r.steps).toBe(CAPITAL_SCRIPT.length);                               // every step found its place and its gold
    expect(w.milestone).toBe('capital');
    expect(r.capitalMonth).toBeLessThanOrEqual(36);                             // Capital within three game-years
    expect(r.lowestGold).toBeGreaterThan(0);                                    // never in debt at a month end
    expect(population(w)).toBeGreaterThanOrEqual(1000);
    expect(w.mood).toBeGreaterThanOrEqual(30);                                  // nobody is leaving
    // No money from nowhere: the treasury grows only by taxes, trade and the gold goals and firsts pay.
    const rewards = [...GOALS, ...EVENT_GOALS].reduce((n, g) => n + g.reward, 0) + GUIDE_REWARD + FIRSTS.length * FIRST_REWARD;
    expect(w.gold).toBeLessThanOrEqual(ECONOMY.startGold + r.taxes + w.tally.tradeIncome + rewards);
    // No stuck chain: in the last year every chain kept making its goods, at least a workshop's steady output.
    const yearAgo = r.made[r.made.length - 13];
    const lastYear = (good) => (w.tally.made[good] || 0) - (yearAgo[good] || 0);
    expect(lastYear('clay')).toBeGreaterThanOrEqual(12 * 30);
    expect(lastYear('pottery')).toBeGreaterThanOrEqual(12 * 30);
    expect(lastYear('barley')).toBeGreaterThanOrEqual(12 * 15);
    expect(lastYear('beer')).toBeGreaterThanOrEqual(12 * 15);
    expect(lastYear('grain') + lastYear('figs')).toBeGreaterThanOrEqual(12 * 250);
    // ...and the homes got them: the fed homes, and the Townhouses and up with their pottery, at the last monthly check.
    const homes = housesOf(w);
    expect(share(homes.filter((h) => h.tier >= 3), (h) => h.met.food)).toBeGreaterThanOrEqual(0.95);
    expect(share(homes.filter((h) => h.tier >= 5), (h) => h.met.pottery)).toBeGreaterThanOrEqual(0.9);
    expect(homes.filter((h) => h.tier >= 6).length).toBeGreaterThanOrEqual(2);   // Manors merged on the pleasant block
    expect(w.tally.caravans).toBeGreaterThanOrEqual(4);
    expect(w.tally.sold).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);
  });
});
```

Replace `tests/dev/sampleCity.test.js` with:

```js
import { describe, it, expect } from '../harness.js';
import { buildSampleCity, buildStressCity } from '../../src/dev/sampleCity.js';
import { createWorld, population, allBuildings, housesOf } from '../../src/sim/world.js';
import { serialize } from '../../src/save/serialize.js';
import { ECONOMY } from '../../src/data/economy.js';
import { TITLE_SEED } from '../../src/data/ui.js';

const countType = (w, type) => allBuildings(w).filter((b) => b.type === type).length;

describe('sample city', () => {
  it('builds a living village through the commands, deterministically', () => {
    const a = buildSampleCity(createWorld({ seed: 1 }));
    const b = buildSampleCity(createWorld({ seed: 1 }));
    expect(serialize(a)).toBe(serialize(b));
    expect(population(a)).toBeGreaterThan(150);
    expect(housesOf(a).length).toBeGreaterThan(40);
    for (const type of ['well', 'bazaar', 'temple', 'granary', 'farm_grain']) expect(countType(a, type)).toBeGreaterThan(0);
    expect(a.gold).toBeLessThan(ECONOMY.startGold + 10000);
    expect(Number.isFinite(a.gold)).toBe(true);
    expect(a.day).toBe(600);                                   // 360 days as a village, then 240 with its Stage 2 buildings
  });
  it('gives the title backdrop Stage 2 buildings, Townhouses and Manors', () => {
    for (const seed of [TITLE_SEED, 1]) {
      const w = buildSampleCity(createWorld({ seed }));
      for (const type of ['storehouse', 'clay_pit', 'potter', 'booth', 'statue', 'garden']) expect([seed, type, countType(w, type) > 0]).toEqual([seed, type, true]);
      expect([seed, w.tally.made.pottery > 0]).toEqual([seed, true]);
      expect([seed, housesOf(w).filter((h) => h.tier === 5).length >= 5]).toEqual([seed, true]);
      expect([seed, housesOf(w).filter((h) => h.tier >= 6).length >= 1]).toEqual([seed, true]);
    }
    const village = buildSampleCity(createWorld({ seed: 1 }), { stageTwoDays: 0 });
    expect([countType(village, 'storehouse'), village.day]).toEqual([0, 360]);   // without the second phase it stays a Stage 1 village
  });
  it('builds a full stress city on a 64x64 map', () => {
    const w = buildStressCity(createWorld({ seed: 2 }));
    expect(housesOf(w).length).toBeGreaterThan(1200);
    expect(allBuildings(w).length - housesOf(w).length).toBeGreaterThan(80);
    expect(population(w)).toBeGreaterThan(5000);
    expect(housesOf(w).every((h) => h.tier >= 1)).toBe(true);
    for (const type of ['storehouse', 'potter', 'booth', 'brewery', 'weaver', 'jeweller', 'trading_post', 'garden', 'statue']) expect([type, countType(w, type) > 0]).toEqual([type, true]);
    expect(w.day).toBe(60);
  });
});
```

In `tests/all.js`, replace:

```js
import './sim/longrun.test.js';
```

with:

```js
import './sim/longrun.test.js';
import './sim/capital.test.js';
```

- [ ] **Step 2: Run them to see them fail**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sample city"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "capital run"
```

Expected: `sample city` fails "builds a living village..." (`expected 360 to be 600`) and "gives the title backdrop Stage 2 buildings..." (`expected [11,"storehouse",false] to equal [11,"storehouse",true]`); with the old stress city "builds a full stress city..." fails too (`expected ["storehouse",false] to equal ["storehouse",true]`). The `capital run` exercises code Tasks 1-8 already built, so it is expected to pass at once (`1 passed`); if it does not, that is the balance work of Step 4, done before the commit.

- [ ] **Step 3: Implement**

Replace `src/dev/sampleCity.js` with:

```js
// Cities for the dev page and the title card, laid through the public commands so they are legal cities. Every call
// is deterministic for a seed: the commands are deterministic and so is the clock.
import { drawRoad, paintHouses, place } from '../sim/commands.js';
import { advanceDays } from '../sim/clock.js';
import { assignLabour } from '../sim/labour.js';
import { housesOf } from '../sim/world.js';
import { TIERS } from '../data/housing.js';
import { T } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';

const water = (world, x, y) => world.terrain[idx(world.size, x, y)] === T.WATER;

// Lays road west from (x0, y) one tile at a time until the river or the map edge stops it.
function roadWest(world, x0, y, minX) {
  for (let x = x0; x > minX; x--) {
    if (water(world, x - 1, y)) return x;
    if (!drawRoad(world, x, y, x - 1, y).ok) return x;
  }
  return minX;
}

// The first spot in the list where the building can go (the river can take any one of them on some maps).
function placeFirst(world, type, spots) {
  for (const [x, y] of spots) if (place(world, type, x, y).ok) return true;
  return false;
}

// Stage 2 on top of the village once it is a Town (spec 4.6, 4.7, 4.10): a storehouse, a clay pit and a potter on the
// north road between the streets, and on the first street, beside the start road, a pleasant block: a row of empty
// plots behind four homes, two statues and two gardens behind those, and a booth, so Townhouses there join into Manors.
function addStageTwo(world) {
  const ex = world.tradeEntry.x;
  const top = world.size - 10;
  placeFirst(world, 'storehouse', [[ex + 1, top - 13], [ex - 2, top - 13]]);
  placeFirst(world, 'clay_pit', [[ex - 2, top - 13], [ex + 1, top - 19], [ex - 2, top - 19]]);
  placeFirst(world, 'potter', [[ex + 1, top - 19], [ex - 2, top - 19], [ex + 1, top - 13]]);
  placeFirst(world, 'booth', [[ex - 1, top - 2], [ex - 1, top - 12]]);
  paintHouses(world, ex + 1, top - 2, ex + 4, top - 2);
  for (const x of [ex + 2, ex + 3]) place(world, 'statue', x, top - 1);
  for (const x of [ex + 1, ex + 4]) place(world, 'garden', x, top - 1);
}

export function buildSampleCity(world, { days = 360, stageTwoDays = 240 } = {}) {
  const gold = world.gold;
  world.gold = 1e9;
  const ex = world.tradeEntry.x;
  const top = world.size - 10;                      // the start road already runs up to y = size - 9
  drawRoad(world, ex, top, ex, top - 24);
  const streets = [top - 4, top - 10, top - 16, top - 22];
  for (const y of streets) {
    drawRoad(world, ex, y, ex + 9, y);
    roadWest(world, ex, y, ex - 9);   // tile by tile, so the river can cut a street short without losing it
  }
  for (const y of streets) {
    place(world, 'well', ex - 5, y + 1);
    place(world, 'well', ex + 5, y + 1);
  }
  place(world, 'bazaar', ex + 1, top - 9);
  place(world, 'temple', ex - 3, top - 15);
  place(world, 'granary', ex + 1, top - 21);
  // Farms need fertile land, which lies west towards the river: run the lowest street out and try spots.
  const westEnd = roadWest(world, ex - 9, top - 4, 1);
  let farms = 0;
  for (let x = ex - 4; x >= westEnd && farms < 3; x--) if (place(world, 'farm_grain', x, top - 6).ok) { farms++; x--; }
  // The farms' granary beside the north road (within their reach and the bazaar's), else past them on the lowest
  // street; and a second temple on the north road for the two lower streets.
  placeFirst(world, 'granary', [[ex - 2, top - 7], [ex - 12, top - 3]]);
  place(world, 'temple', ex + 1, top - 7);
  for (const y of streets) {
    paintHouses(world, ex - 9, y + 1, ex + 9, y + 1);
    paintHouses(world, ex - 9, y - 1, ex + 9, y - 1);
  }
  world.gold = gold;
  advanceDays(world, days);
  if (stageTwoDays > 0 && world.milestone !== 'village') {
    const spent = world.gold;
    world.gold = 1e9;
    addStageTwo(world);
    world.gold = spent;
    advanceDays(world, stageTwoDays);
  }
  assignLabour(world);
  return world;
}

// A road along row y, split wherever the river crosses it.
function roadRow(world, y) {
  let start = null;
  for (let x = 0; x <= world.size; x++) {
    const blocked = x === world.size || water(world, x, y);
    if (!blocked && start === null) start = x;
    if (blocked && start !== null) {
      if (x - 1 > start) drawRoad(world, start, y, x - 1, y);
      start = null;
    }
  }
}

// Every building the stress city cycles through, Stage 2's included, so the frame draws them all at once (a farm only
// takes where the land is fertile).
const STRESS_SERVICES = [
  'well', 'bazaar', 'temple', 'granary', 'farm_grain', 'well', 'granary', 'storehouse', 'potter', 'booth', 'clay_pit',
  'brewery', 'garden', 'weaver', 'statue', 'jeweller', 'trading_post', 'farm_fig', 'farm_barley', 'farm_flax',
];

export function buildStressCity(world, { days = 60 } = {}) {
  const gold = world.gold;
  world.gold = 1e9;
  world.milestone = 'capital';   // a fixture: every building unlocked, as the homes below are filled directly
  const size = world.size;
  const services = STRESS_SERVICES;
  for (let y = 2; y < size - 1; y += 4) roadRow(world, y);
  for (let y = 2; y < size - 3; y += 4) {
    for (let x = 1; x < size - 2; x += 7) place(world, services[(x / 7 + y / 4) % services.length | 0], x, y + 1);
  }
  for (let y = 2; y < size - 1; y += 4) {
    paintHouses(world, 0, y - 1, size - 1, y - 1);
    if (y + 1 < size) paintHouses(world, 0, y + 1, size - 1, y + 1);
  }
  // Fill the homes directly: a stress fixture needs a crowded frame now, not after years of arrivals. Tiers 1 to 5:
  // the one-tile tiers (Manors and up need merged squares, which this street pattern has no room for).
  for (const h of housesOf(world)) {
    h.tier = 1 + ((h.x * 7 + h.y * 13) % 5);
    h.residents = TIERS[h.tier].capacity;
  }
  world.gold = gold;
  advanceDays(world, days);
  assignLabour(world);
  return world;
}
```

What changed: `placeFirst` tries spots in order, because the river takes a different one on each map. The village's farm granary now tries a spot beside the north road first (on most maps the old spot, twelve tiles west, was in the river, so the farms had nowhere to put their grain and the homes stayed Shacks) and a second temple sits on the north road, so the two lower streets have a temple. Once the village is a Town (360 days in), `addStageTwo` places a storehouse, a clay pit and a potter on the north road between the streets and, on the first street beside the start road, a booth and a pleasant block (four homes with a row of empty plots behind them, two statues and two gardens behind those), then the city runs 240 more days. With `stageTwoDays: 0` it is the Stage 1 village. The stress city cycles through every Stage 2 building as well and marks the city a Capital first (a fixture, like its direct tier and resident writes), with homes at tiers 1 to 5. Building the title backdrop takes about 100-190 ms (seed 11), up from the 360-day village.

Sample cities in the scratch copy at day 600: seed 11 (the title) 524 people, 14 Townhouses and 2 Manors; seed 1, 422 people, 11 and 2; seeds 2 and 3 the same pattern. On a map whose fertile land is out of the farms' reach (seeds 7 and 19) the village still starves as before and stays at Shacks; the tests use seeds 11 and 1, and `?sample=1` without `seed=` can land on such a map.

- [ ] **Step 4: Run the tests to see them pass, and tune if the run fails**

```
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "sample city"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "capital run"
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "stress frame"
```

Expected: `3 passed`, `1 passed`, `1 passed`, each `ALL PASSED`.

If `capital run` fails, read the failing line and tune in this order, one change at a time, rerunning after each; record every change (old and new value, and why) in the commit body and in `docs/superpowers/notes/2026-10-11-early-game-pass-followups.md` or the Stage 2 follow-ups note Task 18 writes:

| Failing check | First lever (script, if the script is at fault) | Then data (`src/data/*.js`) |
|---|---|---|
| a step "cannot go there" | the step's coordinates (a building's footprint or terrain rule changed) | none: this is the script |
| lowest gold not above 0 (early months) | `RESERVE` 400 to 600, or a later `once(pop, ...)` gate for the second bazaar and temple | `ECONOMY.wagePerWorker` 4 to 3 (wages outrun Hut and Shack taxes, 1.6 against 1 gold per resident at full employment); else Shack tax 1 to 2 in `TIERS` (never lower a later tier's tax per tile) |
| Capital later than month 36 | more plots in the script (rows 11 and 13 run to x 39) | `MOOD.arrivalBase` 30 to 40 or `arrivalPerPop` 0.08 to 0.1; Town or later milestone thresholds in `MILESTONES` |
| clay, pottery, barley or beer below its floor | keep chains raw-limited: more potters than clay pits can feed, a second brewery | `clay_pit.produces.perMonth` 40 to 30 and `farm_barley` 30 to 25 (a raw producer matches one workshop), `storehouse.capacity` 800 to 1200 |
| fewer than 90% of Townhouses with pottery | a fourth potter and a third clay pit (keep the ratio) | `potter.produces.perMonth` 30 to 36 |
| fed share below 95% | another grain farm within 12 road tiles of a granary | `farm_grain.produces.perMonth` 30 to 36 |
| fewer than two Manors | a fourth statue at (35, 15), or the booth nearer the block | `DESIRABILITY.statue` [8, 6, 4, 2] to [10, 8, 5, 3], or Manor `rise` 20 to 18 (keep `keep` below `rise`) |
| mood below 30 | more workplaces (farms within reach are jobs whose surplus is harmless) | `MOOD.unemploymentWeight` 100 to 70 |
| caravans or sales at zero | the trade road reaches (47, 20); the beer order's `keep` | Memphis's `buys.beer` quota |
| final gold above the bound | never a tuning matter: money is coming from somewhere it should not (a refund, a trade sale or a reward counted twice); find it in the sim | none |
| over 5 s | — | a performance bug in the monthly or daily sim (the run took 0.5 s in the scratch copy) |

- [ ] **Step 5: Update the existing tests this breaks**

`grep -rn "buildSampleCity\|buildStressCity" tests src` finds the users:
- `tests/dev/sampleCity.test.js`: replaced in Step 1 (the day is 600, the treasury bound 10,000 over the start rather than 5,000 now that the village's homes are fed and grow, and the new Stage 2 checks).
- `tests/render/stress.test.js` and `tests/ui/overlaysStage2.test.js` use the stress city: both pass with the new buildings (run in the scratch copy; with Tasks 9-11's art the stress frame draws more sprites, still within its budget there).
- `tests/ui/boot.test.js`, `tests/ui/difficultyChoice.test.js` and every test that shows the title build the sample city; they pass unchanged (each title now builds 600 days instead of 360).
- `src/boot.js` uses both for the title and the `?sample=1` / `?stress=1` flags; no change needed.

- [ ] **Step 6: Visual check**

Save as `$env:TEMP\t17-shots.ps1` and run it from `C:\dev\thebes`:

```powershell
$O = "$env:TEMP\thebes-t17"
New-Item -ItemType Directory -Force $O | Out-Null
$city = "(()=>{const t=window.__thebes;t.cam.x=21;t.cam.y=47;})()"
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/index.html?nosw=1' -Out "$O\title-1280x800.png" -Width 1280 -Height 800
foreach ($size in @(@(390, 844), @(844, 390), @(768, 1024), @(1280, 800))) {
  powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/index.html?skipTitle=1&sample=1&seed=11&nosw=1' -Out "$O\city-$($size[0])x$($size[1]).png" -Width $size[0] -Height $size[1] -Eval $city
}
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/index.html?skipTitle=1&stress=1&nosw=1' -Out "$O\stress-1280x800.png" -Width 1280 -Height 800
```

What should be visible: the title backdrop and the `city-*` shots (seed 11, the title's city) show the Stage 1 village plus, along the north road, a storehouse yard, a clay pit and a potter with its kiln; on the first street beside the start road a booth, two statues and two gardens behind a row of homes, among them Townhouses (striped awnings) and at least one Manor (a 2x2 home with a pergola); the four sizes frame it in the portrait dock, the compact rail, the tablet and the side-panel layouts. The stress shot is crowded with every building type, Stage 2's included, and homes up to Townhouse. Keep these for Task 18's README shots; nothing here is committed.

- [ ] **Step 7: Full suite**

```
powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1
powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1
```

Expected: `ALL PASSED` (2 tests more than after Task 16: the capital run and the sample city's Stage 2 check).

- [ ] **Step 8: Commit**

```powershell
git add src/dev/sampleCity.js sw-files.js tests/all.js tests/sim/capital.test.js tests/dev/sampleCity.test.js
git commit -m @'
Run a scripted city to Capital as the Stage 2 balance test, and give the sample cities Stage 2

The run lays a city through the public commands from the starting treasury and checks it reaches Capital within three
years, never ends a month in debt, makes no money from nowhere, keeps its chains making goods and its homes supplied
for six years, and finishes in time. No data needed tuning. The title backdrop's village now feeds its homes and
grows Townhouses and Manors around a storehouse, a potter and a booth; the stress city carries every Stage 2 building.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

If Step 4 needed data changes, replace "No data needed tuning." with one line per change ("clay pit 40 to 30 a month: a pit now matches a potter") and add the changed `src/data/*.js` files to `git add`.

---

### Task 18: Wrap-up (done by the controller)

**Files:** Modify `README.md`; Create `docs/superpowers/notes/2026-10-11-stage-2-followups.md`, `docs/superpowers/notes/screenshots/stage-2-*.png`; Modify `tools/shots.ps1`, `tools/contact.py` (Stage 2 scenarios).

- [ ] **Step 1: Before shots.** Before Task 1 is dispatched, take the "before" set on `main` at the four sizes (390x844, 844x390, 1024x768, 1280x800) with `tools/shots.ps1 -Tag s2before` (title, a built city, placing, a house sheet, the summary).
- [ ] **Step 2: Stage 2 scenarios.** Teach `tools/shots.ps1` six Stage 2 scenes (keep the old ones): `title`; `city` (a Stage 2 city: `?sample=1` with a seed that shows Manors, or the scripted Capital city); `placing` (a workshop being placed, with the desirability tint and the confirm-bar line); `manor` (a Manor's house sheet with the desirability breakdown); `trade` (the trade sheet with a route open); `summary` (goods made against used, trade income, difficulty). Teach `tools/contact.py` the Stage 2 scenario list, behind a flag, so the early-game sheets can still be rebuilt.
- [ ] **Step 3: After shots and contact sheets.** `tools/shots.ps1 -Tag s2after`, then `python -I tools/contact.py docs/superpowers/notes/screenshots/raw docs/superpowers/notes/screenshots stage-2 s2before s2after` (with the Stage 2 flag). Look at every sheet at every size before going on: nothing over the middle of the map, one panel at a time, the top bar on one row at normal text, readable at 390 px.
- [ ] **Step 4: README.** Add a Stage 2 paragraph: the five chains, the storehouse, tiers 5-9 with merging, desirability, the booth, trade with Memphis and Byblos, milestones to Capital, the three overlays, difficulty.
- [ ] **Step 5: Follow-ups note.** `docs/superpowers/notes/2026-10-11-stage-2-followups.md`: every deferred minor and parked finding from the ledger, the balance findings from Task 17, the transient-state notes, and what is left for Josh.
- [ ] **Step 6: Full suite.** `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`, then the suite; `ALL PASSED`.
- [ ] **Step 7: Commit, then merge locally.** Commit the README, the note, the contact sheets and the tool changes. Then `git checkout main` and `git merge --no-ff stage-2-economy -m "Merge Stage 2: the economy"` (message ends with the trailer), run `tools/sw-files.ps1` and the full suite on `main` (`ALL PASSED`), and do not push.
