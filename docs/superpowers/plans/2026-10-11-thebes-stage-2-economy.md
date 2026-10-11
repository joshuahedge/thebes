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

