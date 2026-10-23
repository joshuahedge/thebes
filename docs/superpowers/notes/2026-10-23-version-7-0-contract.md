# Version 7.0 contract (Track 0)

Written 23 Oct 2026 on `version-7-0` (from fdc4708) for the tracks of `plans/2026-10-23-thebes-version-7-0-a-living-world.md`. Binding: later tracks use these names and shapes; a track that must change one says so in a ruling. Rulings 858-869 are Track 0's (listed at the end).

Every seam below is a named function whose stub keeps 6.0.1's game: a city plays, draws, trades and sounds exactly as on main until a track fills its seam. Tests: `tests/v70/contract/` (describe names `v70 contract`), including a version 9 city that loads and plays a year exactly as the city it was saved from.

## 1. World version 10 and `MIGRATIONS[9]`

`WORLD_VERSION` and `CURRENT_VERSION` are 10 (`src/sim/world.js`, `src/save/migrate.js`). Each record is built by its owner's data file (createWorld and `v9ToV10` call the same function) and checked in `src/save/serialize.js` by the owner's own `is...` function, so an owner tightens its own check:

| field | made by | shape | owner |
|---|---|---|---|
| `trade.switches` | `newTradeSettings()` (`src/data/trade.js`) | `{ partnerId: { buys: { good: false }, sells: { good: false } } }`: only a switch turned **off** is stored; absent = on. The sides are PARTNERS' own lists: `buys` (the partner buys: the city sells), `sells` (the partner sells: the city buys) | T |
| `trade.floors` | `newTradeSettings()` | `{ good: units }`, whole units ≥ 0, the city-wide "Keep at least"; absent = no floor | T |
| `cityEvents` (the plan's `world.events`: ruling 858) | `newEventState(nextDay = 0)` (`src/data/cityEvents.js`) | `{ nextDay: day, cooldowns: { kind: day }, waiting: null \| { kind, day, due, ... } }`; `nextDay` the first day the next event may be drawn; `cooldowns` the first day each kind may come again; `waiting` the one event waiting (never two) | E |

`isTradeSettings` and `isEventState` are the checks. A track may add fields inside its record, never remove these.

**`v9ToV10`** keeps every field as it was (routes, orders, drift, quota used, buildings, tallies) and adds `switches: {}`, `floors: {}` (every switch on, no floor), `cityEvents: newEventState(save's day + EVENT_V9_WAIT)` (360: no event for a game year after the load, ruling 856, whatever the city's year) and `V70_TALLY` at 0. A new city's `nextDay` is 0 (the Town gate and `drawEvent`'s rules decide the first). Older tests that pinned version 9 now pin 10; their chains end with `MIGRATIONS[9]`.

**Reserved ids (ruling 859):** the Quay is building type `QUAY_TYPE = 'quay'`, `QUAY_SIZE` 2x1; incense is good `INCENSE_GOOD = 'incense'` (`src/data/trade.js`). Their rows are Track T's: `TRADE_BUILDINGS` and `TRADE_GOODS` are already joined into `BUILDINGS` and `GOODS` (`src/data/v70.js`), so T adds each row once with everything else a row needs (section 9).

**Tallies:** `STAGE70_TALLY` = `V70_TALLY` = `TRADE_TALLY` + `CITY_EVENT_TALLY`, both empty; new and migrated cities start them at 0. A track may add a key to its own list until 7.0 is on main.

## 2. Track T seams: trade rules, the Quay, the boats

`src/sim/tradeRules.js` (pure, no memo):
- **`tradeAllowed(world, partnerId, good, side)`** → boolean; `side` is `'buys'` or `'sells'`; false only where the switch is off (anything else for side is false).
- **`heldBack(world, good)`** → `{ units, floor, temple, court }`: `units` is the level trade never sells below; `floor` the player's floor; `temple` what the great temple's waiting stage still needs; `court` what accepted court demands still need. Track 0's: `units = floor + temple + court` with temple and court 0. T fills temple and court and may change how they combine (ruling 861), and the words say "held for the temple" / "held for the court" from these fields.
- `tradeAlerts(world)` → [] (joined into `v70Alerts`).

**Already wired (ruling 861):** `src/sim/trade.js caravan` skips a good whose switch is off on that side, and sells only above `max(order.keep, heldBack(world, good).units)`. The Trade sheet must read these same two functions so its words match the caravan.

**Arrivals:** a caravan event stays `{ type: 'caravan', partner, sold, bought, income, spent, gift }`; a river partner is `PARTNERS[id].by === 'river'` (T adds `by`), which S reads for the boat's oars and the caravan's bells.

**Render (render only, never in the sim or the save):** `src/render/trade.js` `tradeWalkers(world, timeDays, range, motion)` → figures `{ id, kind, x, y }` with ids from `TRADE_ID_BASE` (4,000,000) and art slots `fig.<kind>` in `src/render/art/trade.js` `TRADE_ART`; `drawTradeGround(g, world, range, now, motion)` for a wake; `tradeSlot(b, world)` for the Quay's slot. Still: nothing moving.

**Interface:** `src/ui/v70/trade.js` `createTradeUi` (seam): the Trade sheet as its own sheet kind (from the trading post's and the Quay's `sheetParts.actions`, and a Trade row in `sheetParts.summary`), arrival captions in `onEvents`. `src/ui/tradeSheet.js` is T's; if the sheet needs more than createUI passes, T registers a new sheet kind in its seam, never editing createUI.

## 3. Track E seams: city events

`src/sim/cityEvents.js` (deterministic: draws from `EVENT_SALT` and the world's seed; no memo outliving a tick):
- **`drawEvent(world)`** → null, or `{ kind, day, due, ... }` to offer today (pure; `eventDay` stores it as `cityEvents.waiting`). Stub: null.
- **`eventChoices(world, event)`** → at most three, each at least `{ id, gold, ok, reason, default }`, exactly one `default` and it never costs gold; a choice the treasury cannot pay is `ok: false` with its reason. Stub: [].
- **`applyChoice(world, event, choiceId, events)`** → `{ ok, reason, warnings }`. Stub: `{ ok: false, reason: 'no_event', warnings: [] }`.
- Hooks: `eventDay`, `eventMonth`, `eventAlerts` (→ []), `eventItems(world, alerts, out)` (the waiting event's Advice item, kind `'event'`: ruling 866). All stubs.

`EVENT_KINDS` (`src/data/cityEvents.js`) is empty: E adds the ~16 kinds. Incense is read by id (`INCENSE_GOOD`); until T lands it is a good no store holds, so the Festival of Opet offers the smaller festival.

**Interface:** `src/ui/v70/cityEvents.js` `createCityEventsUi` (seam): the card as a sheet kind, opened by `onAlertAction` from the alert row's entry; outcome captions; the first-moment card.

## 4. Track S seams: seasons, light, sound

- **`seasonAt(world)`** (`src/sim/seasons.js`, pure, world.day alone) → `{ season, next, blend }` with SEASONS' ids (`src/data/tips.js`): `akhet` the flood (months 7-10), `peret` the growing (11-2), `shemu` the harvest (3-6) (ruling 863). Track 0's: the month's season, `next` the same, `blend` 0. S adds the one-month blend. Nothing in the sim reads it.
- **`lightAt(nowMs)`** (`src/render/light.js`) → `{ phase, dark, lamps }`, phase in `LIGHT_PHASES` (`dawn, day, dusk, night`), `LIGHT.cycleMs` 360,000 (`src/data/seasons.js`). Track 0's: always `{ phase: 'day', dark: 0, lamps: 0 }`.
- **`drawLight(g, world, range, frame, now, motion, settings)`**: the renderer's new light pass (ruling 864), after the sprites and before fire, units, effects and overlays; `frame` is `{ ctx, W, H, ox, oy, dpr }`. **`drawSeasonGround(g, world, range, now, motion)`** (`src/render/seasons.js`): over the terrain, under the shadows. `SEASON_ART` / `seasonSlot(b, world)` (`src/render/art/seasons.js`) for season states of buildings. All empty.
- **Settings** (`src/ui/settings.js`, ruling 865): `dayNight` (boolean, true) and `effectsVolume` (a `MUSIC_VOLUMES` step, 100 = today's loudness), validated like the others; nothing reads them yet.
- **Interface:** `src/ui/v70/seasons.js` `createSeasonsUi` (seam) for sound cues from the sim's events.

## 5. Track A seams (wave 2): the Advice fixes

`src/sim/adviceFixes.js`, not called yet (Advice is 6.0.1's): **`towerSpotsFor(world, target)`** → `[{ x, y }]` tower tiles a road reaches within `DEFENCE.towerRange` of the target, best first ([] when none); **`strandedFix(world, good, bazaar)`** → null or `{ item: 'storehouse', x, y }`; **`adviceFixItems(world, alerts, out)`** for the trade items (`'quay'`, `'trade_floor'`). A owns `src/sim/advice.js` and `src/data/advice.js` in wave 2 and wires them into `towerItem` and `homeItems` there.

## 6. Hooks wired once (no track edits these)

- **Sim** `src/sim/v70.js`: `v70Day` (after `v60Day`): `eventDay`; `v70Month` (after `v60Month`): `eventMonth`; `v70Alerts` (after `v60Alerts`): `tradeAlerts`, `eventAlerts`; `v70Advice` (after `v60Advice`, before ranking): `eventItems`, `adviceFixItems`. Trade keeps its own month step (`tradeMonth`, T's).
- **Advice kinds** (`ADVICE_KINDS`): `event`, `quay`, `trade_floor` reserved after `demand` (ruling 866); 6.0.1's kinds keep their order, and no item of theirs exists until a track pushes one.
- **Render** `src/render/v70.js` (called from createUI's frame): `v70Ground` (after Stage 4.6's flood: `drawSeasonGround` then `drawTradeGround`), `v70Walkers` (`tradeWalkers`), `v70Light` (`drawLight`, through `renderFrame`'s `opts.light`). **Art** `src/render/art/v70.js`: `V70_ART` (`TRADE_ART`, `SEASON_ART`) spread into `ART`; `v70Slot` (`tradeSlot`, then `seasonSlot`) asked after Stage 4.6's in `slotFor`.
- **Interface seams** `src/ui/v70/index.js` `createV70Seams` (after the 6.0 seams in createUI): `trade.js` (T), `cityEvents.js` (E), `seasons.js` (S), `adviceFixes.js` (A); each `seamBase()` (`src/ui/s46/seam.js`).
- **Lists** joined by `src/data/v70.js` from each track's data file (each a leaf, importing nothing): `V70_BUILDINGS` (end of `BUILDINGS`), `V70_GOODS` (end of `GOODS`), `V70_GOALS`, `V70_EVENT_GOALS`, `V70_FIRSTS`, `V70_ACHIEVEMENTS`, `V70_TIPS` (end of `TIPS`), `V70_TALLY`. T: `TRADE_*`; E: `CITY_EVENT_*` (tally, firsts, achievements, tips); S: `SEASON_TIPS`; A: `ADVICE_FIX_TIPS`.
- **Words** (`src/ui/text.js`, at the end): a `v70 contract` section with `V70_HELP` (`{ t, e, s, a }` lists of `{ head, text }`; How to play prints them after Version 6.0's, in that order: `src/ui/menu.js`) and `V70_ADVICE_WORDS` (kind → `(item, world) => { what, why, fix }`; `adviceWords`' default case asks it after `V60_ADVICE_WORDS`). Then one section per track (`── v70 t ──`, `e`, `s`, `a`), separated by stable separator lines.
- **Styles** (`css/ui.css`, at the end): a `v70 contract` section, then `v70 t`, `e`, `s`, `a` sections.

## 7. Salts (ruling 867)

`hash2(a, b, (world.seed + SALT.x) | 0)` or `createRng((seed ^ SALT.x) >>> 0)`; never the map generator's stream. T `TRADE_SALT` 6101-6119; E `EVENT_SALT` 6121-6149; S `SEASON_SALT` 6151-6159 (render only); A `ADVICE_FIX_SALT` 6161-6169. Rename spares, never reuse a number; the contract test keeps every salt in the game unique (trade's yearly drift keeps its own 7349).

## 8. Dev scenes

`src/dev/v70/index.js` `V70_SCENES` (joined in `src/dev/scenes.js`; `VERSION70_SCENES` lists them), each in its track's file and refined by it; open `/?skipTitle=1&nosw=1&seed=11&sample=1` first. Every scene takes `{ quick }`; helpers `sampleCity`, `look`, `wait`, `waterNear` in `src/dev/v70/base.js`. As Track 0 left them (each loads without error in a booted game: `tests/v70/contract/scenes.test.js`):
- T (`trade.js`): `v70-trade` (the sample Capital, its routes said), `v70-quay` and `v70-boat` (the camera on the river nearest the city).
- E (`cityEvents.js`): `v70-event`, `v70-festival` (the sample Capital, the record said).
- S (`seasons.js`): `v70-season-flood`, `-growing`, `-harvest` (the day moved on to that season), `v70-night` (the light said).
- A (`adviceFixes.js`): `v70-advice-tower`, `v70-stranded`.

## 9. Files: who owns what (ruling 868)

A track edits only files it owns; a **shared** file only in its own marked part. Wave 1 (T, E, S) runs in parallel worktrees, so the wave-1 split is strict.

| Track | Owns (edits freely) |
|---|---|
| **T** | `src/data/trade.js`, `src/sim/trade.js`, `src/sim/tradeRules.js`, `src/ui/tradeSheet.js`, `src/ui/v70/trade.js`, `src/render/trade.js`, `src/render/art/trade.js`, `src/dev/v70/trade.js`, `tests/v70/t/`; `src/sim/fit.js` (a riverbank fit for the Quay); `src/sim/reach.js` if the Quay's road rule needs it. **One row each for the Quay and incense** in a table keyed by building type or good that a test requires complete: `src/data/progression.js` (the Capital's `unlocks`), `src/data/ui.js` (a category's `items`), `src/data/fire.js`, `src/data/desirability.js`, `src/data/battle.js`, `src/data/court.js` (`GOOD_VALUE`), `src/data/raids.js`, `src/render/art/carts.js` (`CART_LOADS`), and the older tests that pin those lists (`tests/data/economyData.test.js` and the like, with the reason in the commit) |
| **E** | `src/data/cityEvents.js`, `src/sim/cityEvents.js`, `src/ui/v70/cityEvents.js`, `src/dev/v70/cityEvents.js`, `tests/v70/e/`; the first-moment picture card: its row in `src/data/tutorial.js`, its scene in `src/dev/tutorialScenes.js`, its picture under `assets/tutorial/` (remade with `tools/tutorial.ps1`, every wait under timeout) and any line `src/ui/tutorial.js` needs (no other wave-1 track touches these). E's effects go through existing sim functions (mood, favour, output, stores, coverage) by calling them, never by editing their files; a number E needs from another file it reads |
| **S** | `src/data/seasons.js`, `src/sim/seasons.js`, `src/render/seasons.js`, `src/render/light.js`, `src/render/art/seasons.js`, `src/ui/v70/seasons.js`, `src/dev/v70/seasons.js`, `tests/v70/s/`; `src/audio/*` (music moods, the tense variant, the effects); `src/ui/hud.js` (the season after the date); `src/ui/settings.js` (the `dayNight` and `effectsVolume` rows' behaviour); `src/ui/menu.js`'s Settings part (the rows); `src/boot.js`'s sound wiring (the volumes) |
| **A** (wave 2) | `src/data/adviceFixes.js`, `src/sim/adviceFixes.js`, `src/ui/v70/adviceFixes.js`, `src/dev/v70/adviceFixes.js`, `tests/v70/a/`; `src/sim/advice.js`, `src/data/advice.js`, `src/ui/adviceText.js`, `src/ui/nextStepText.js`; the advice pins it re-records (with reasons) |
| **Track 0** (nobody edits after) | `src/data/v70.js`, `src/sim/v70.js`, `src/render/v70.js`, `src/render/art/v70.js`, `src/ui/v70/index.js`, `src/dev/v70/index.js`, `src/dev/v70/base.js`, `tests/v70/all.js`, `tests/v70/contract/` |

**Shared files and who edits which part**
- `src/ui/text.js`: each track only in its own `── v70 <track> ──` section at the end (append above its end marker): its exported words object, `TIP_TEXT`/`TIP_HELP_TEXT`/`FIRST_TEXT`/`ALERT_TEXT` entries, `V70_HELP.<track>.push(...)`, `V70_ADVICE_WORDS.<kind>` (E: `event`; A: `quay`, `trade_floor`). Never another section or the contract section. A track that must change older words (an existing tip that would turn false) does so in its own section by reassignment, as 6.0's tracks did.
- `css/ui.css`: each track only in its own `v70 <track>` section at the end.
- `src/data/tips.js`: nobody; tips come from each track's own data list (`TRADE_TIPS`, `CITY_EVENT_TIPS`, `SEASON_TIPS`, `ADVICE_FIX_TIPS`), joined in `src/data/v70.js`.
- Firsts, achievements, goals, buildings, goods, tallies: only through the track's own data file lists. `firsts.js`, `achievements.js`, `goals.js`, `buildings.js`, `goods.js`, `world.js` are not edited.
- How to play: `V70_HELP.<track>` in the track's text section. What's new (`src/data/releases.js`), `README.md`, `APP_VERSION`: wave 3 only, at the end.
- `src/ui/createUI.js`, `src/sim/clock.js`, `src/sim/alerts.js`, `src/render/renderer.js`, `src/render/art/registry.js`, `src/save/migrate.js`, `src/save/serialize.js`, `src/dev/scenes.js`: nobody (the hooks are wired); a track that truly needs a line asks the controller and records a ruling.
- `src/ui/menu.js`: S only (the Settings rows); the How to play loop is wired. `src/ui/settings.js`: S only. `src/ui/hud.js`: S only. `src/ui/sheets.js`: nobody in wave 1 (seam parts instead).
- `sw-files.js`: regenerated (`tools/sw-files.ps1`), never merged by hand.
- Tests: each track only in `tests/v70/<track>/` and its `all.js`; it updates an older test only where its own change moves that test's number (with the reason in the commit).

## 10. Tests

`tests/all.js` imports `tests/v70/all.js` once; it imports `contract/all.js` then `t`, `e`, `s`, `a`, `balance`, `docs` (each `tests/v70/<track>/all.js`, owned by its track). Describe names start with `v70 <track>`; no track's prefix is a substring of another's.

## 11. Merge order (ruling 869)

Wave 1: **T, then E, then S** into `version-7-0`. T first: it adds rows to the most shared tables (goods, buildings, unlocks, the cart and court tables) and E's festival reads its incense; E next (the alert row and Advice); S last (render, sound and Settings, touching no sim). Regenerate `sw-files.js` after each merge, full suite after each. Wave 2: **A**. Wave 3: balance, the final review, fixes, docs and `releases.js`.

## Rulings (Track 0)

858. World version 10 adds one top-level record and two maps inside `world.trade` (`switches`, `floors`); the migration adds nothing to any building. The record is `world.cityEvents`, not the plan's `world.events`: `events` is every sim function's per-tick list (`events.push(...)`), and a Stage 2 test holds that no save has an `"events"` key. — Cost if wrong: a name only; a track that needs another field adds it inside its own record and its own check.
859. The Quay's `BUILDINGS` row and incense's `GOODS` row are Track T's; Track 0 reserves their ids and joins `TRADE_BUILDINGS` and `TRADE_GOODS`, because a row needs art, fire risk, desirability, hit points, a cart look, a court value and an unlock that arrive whole only with T. — Cost if wrong: none; T adds two rows.
860. Switches are stored only when off, per route and per side as PARTNERS lists it; floors are city-wide, per good; absent means on and no floor. — Cost if wrong: T needs a "never touched" state and adds it inside its record.
861. `tradeAllowed` and `heldBack` are wired into the caravan now: it sells only above the larger of the order's keep and `heldBack(...).units` (floor + temple + court). — Cost if wrong: T changes the combination in its own files (trade.js and tradeRules.js are T's).
862. `events.nextDay` is a whole day, 0 for a new city (the Town gate and `drawEvent` decide the first), the load day + 360 for a v9 city. — Cost if wrong: a new city's first event comes sooner than E wants; E changes `newEventState`'s default in its own file.
863. Seasons use SEASONS' ids (`akhet`, `peret`, `shemu`) on the flood calendar; `seasonAt` gives `{ season, next, blend }`, blend 0 until S. — Cost if wrong: a rename inside S's files.
864. The light pass draws after the sprites and before fire, units, effects and overlays, so nothing a player reads is tinted. — Cost if wrong: S wants the tint over the effects and asks the controller to move one line of `renderer.js`.
865. `dayNight` (on) and `effectsVolume` (100, today's loudness) are device settings added now; S owns their rows and what they do. — Cost if wrong: none.
866. The waiting event's Advice item is Track E's (`eventItems`, kind `event`), not A's: E lands first and its card and its Advice must agree; A words the two trade items (`quay`, `trade_floor`) and checks E's. The three kinds are reserved in `ADVICE_KINDS` after `demand`. — Cost if wrong: A rewords E's item in wave 2.
867. Salt ranges: T 6101-6119, E 6121-6149, S 6151-6159 (render only), A 6161-6169. — Cost if wrong: none.
868. File ownership as section 9: T owns trade and may add one row each for the Quay and incense to the shared type- and good-keyed tables; E owns only its new files and its text and style sections; S owns seasons, light, audio, the top bar and the Settings rows. — Cost if wrong: a track that needs a line elsewhere asks the controller.
869. Merge order T, then E, then S; then A. — Cost if wrong: a later merge meets a one-line conflict in a shared table.
