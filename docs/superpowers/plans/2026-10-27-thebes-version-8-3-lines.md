# Thebes Version 8.3 "Lines" (plan)

Agreed with Josh on 27 Oct 2026, after 8.2.1 went live (main 8cd5b10 or later). It is the first of v9's four releases. One release with three parts:
- **Crossings:** the road tool lays a bridge or a ferry.
- **Supply lines:** Keep stocked from a chosen store, and a Supply lines layer.
- **Crews:** builders' guild crews at any distance, plus a workers' camp.

**Design (authority, read it first):** `docs/superpowers/specs/2026-10-27-thebes-version-8-3-lines-design.md`. Josh approved it with every recommended answer. Also read:
- the v9 roadmap `specs/2026-10-27-thebes-v9-roadmap-design.md`, for context only;
- this plan;
- the rulings in `notes/handoff-2026-10-11/rulings-so-far.md`. Append 8.3 as **Part 25** (8.2.1 is Part 24, ending at 1370).

**Out of scope:** everything in 8.4, 9.0 and 9.1 (tax rate, rushing, imports, raid pacing, elephants, the dynasty, decrees, save slots).
- No balance numbers change: costs, rates, the 4-tile bridge and 5-12 tile ferry limits, cart speed and trip size all stay.
- No new building kinds. The camp is a site feature, and the ferry landing is 7.1's.
- No world-version bump: every new field is optional and absent means today's behaviour.

## What Josh asked for (27 Oct)

1. **One way across water.**
   - The road tool lays a bridge over 1 to 4 tiles of straight water and a ferry over 5 to 12. Anything else is refused with the reason.
   - Live words and water tints while dragging.
   - The Ferry card becomes the Crossing card, showing both kinds.
   - The ferries tip becomes a crossings tip.
2. **Keep stocked and supply lines.**
   - "Fetch" becomes Keep stocked, and the store sheet splits into Takes in and Keeps stocked.
   - One readable row per order.
   - A **from** pick on the map chooses a source. A chosen source waits and asks when it runs dry; it never falls back by itself.
   - A Supply lines layer.
   - A tip, and two Advice fixes.
3. **Crews at any distance.**
   - A guild works any road-linked site, ferries included, nearest first.
   - Full speed within 12 road tiles, then 10% less per further 12, never below 50%.
   - A workers' camp on the site sheet costs 10% of the founding price, lifts every crew there to 100%, and clears when the monument is finished.
   - The site sheet's "no stone near" line points to a storehouse kept stocked beside the site.
4. **Clean and simple on mobile and desktop** (his standing requirement), graded in the final review.

## Process (multi-agent; Josh runs the controller on Opus 5.5)

- **Branch and worktrees:** branch `version-8-3` from main. Tracks run in sibling worktrees `C:\dev\thebes-v83-<track>`, cut from the branch after wave 0, and the controller merges them back.
- **Models:**
  - Opus for Track X (the road core, undo, placement), Track K (a new map mode and a render layer), any merge that is not trivial, and the final review.
  - Sonnet for Track C, every reviewer, the balance check, the fix wave, the re-review and the docs.
  - Opus is the escalation if a Sonnet fix round fails twice.
- **Per track:** the implementer, then a Sonnet reviewer with the diff, the track section, the rules and the UX rules. At most two fix rounds.
- **The controller** reads reports, not diffs. It keeps a ledger at `.superpowers/sdd/2026-10-27-thebes-version-8-3/progress.md` and looks at two or three screenshots per track.

### Waves

| Wave | Work | Depends on |
|---|---|---|
| 0 | The controller, no agent: the branch, the aggregators `tests/v83/all.js` and `tests/v83/{x,k,c,docs}/all.js` (each imported once), `tests/all.js` importing `./v83/all.js`, and the ledger. One commit. | main |
| 1 | X: crossings (Opus) · K: keep stocked and supply lines (Opus) · C: crews and the camp (Sonnet), in parallel | wave 0 |
| 2 | Merge X → K → C. Balance check (Sonnet) → final review with the usability pass (Opus) → fix wave (Sonnet) → re-review (Sonnet) → docs, merge to main, suite on main | wave 1 |

### File ownership (who may edit what)

| Files | Owner |
|---|---|
| `src/sim/commands.js` road functions (`previewRoadTiles`, `drawRoadTiles`), `src/sim/bridges.js`, `src/sim/ferryFind.js`, `src/sim/ferryLay.js`, `src/sim/undo.js`, `src/ui/placement.js`, `src/ui/confirmBar.js`, `src/data/ferries.js`, `src/ui/v71/ferryText.js`, the `ferry` entry of `src/data/ui.js` | X |
| `src/sim/carts.js`, `src/data/s47.js` CARTS, `src/sim/another.js` settings, `src/ui/s47/carts.js`, the store sheet's Takes in switches, `src/ui/modes.js` (the new pick mode only), `src/data/layers.js`, `src/sim/layers.js`, `src/render/layers.js`, `src/ui/layersLegend.js`, `src/sim/advice.js` / `adviceFixes.js` / `bazaarFood.js` / `src/ui/threatFix.js` (the two Keep stocked fixes) | K |
| `src/sim/monuments.js`, `src/data/monuments.js` MONUMENT, `src/sim/goals.js` (`crewNear`), `src/ui/monumentSheet.js`, the site's placing chip, the camp's drawing in `src/render/` | C |
| `src/ui/text.js` | each track in its own section headed `// Version 8.3, Track <X/K/C>`, appended at the end of the file |
| `src/data/tips.js`, How to play | each track adds its own entries only |
| `src/data/releases.js`, `APP_VERSION`, README, rulings | the docs step at the end only |

Merge order X → K → C, then regenerate `sw-files.js`.

## Rules for every track

- **Commit identity:**
  - `git config --local user.email` prints `181878008+joshuahedge@users.noreply.github.com`.
  - Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Never write Josh's employer's name anywhere, including in briefs. The controller's guard script must print GUARD OK before every commit.
- **sw-files.js:** after editing `src/`, `css/`, `index.html` or `assets/`, regenerate it.
  - Run it in the **PowerShell tool** as `Set-Location <worktree>; & ./tools/sw-files.ps1`. The `powershell -ExecutionPolicy Bypass` form of this command is refused by the auto-mode check.
  - Rerun it after the last edit, and in the commit that ends a track.
  - Never hand-edit `sw-files.js`. On a merge conflict, take either side and regenerate.
- **Tests:**
  - **The full suite:** before every commit, `tests/run-tests.ps1 -WaitSeconds 600` prints ALL PASSED. Run it from Bash through the controller's scratch suite wrapper, which holds a one-at-a-time lock and calls `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`. **Only one full suite runs on the machine at a time.**
  - **Iterating:** use `-Grep "v83 <track>"`.
  - **The timing flake:** "stage 2 placement preview" (`tests/ui/overlaysStage2.test.js`) flakes under load. Rerun it alone before treating it as real.
- **New tests** go in `tests/v83/<track>/`, with describe names starting `v83 <track>` (x, k, c).
- **Git hygiene:**
  - Stage files by path; never stage `.superpowers/`.
  - Never push.
  - Never run `python -` with a heredoc.
  - Never write source files through a shell heredoc, echo or sed: use the edit tools.
- **Never block on an unbounded wait.** Every screenshot, server check and wait loop runs under `timeout` (shots 150 s). Stop any server or Edge you start.
- **Words match the sim.** Every number on screen comes from the sim's own function or data, with a test that sets the world up both ways. Advice never suggests what the sim would refuse.
- **The sim stays deterministic:**
  - No `Math.random`, `Date` or `performance.now` in `src/sim`.
  - No memo in a sim function the UI also calls may outlive one tick, unless its key covers every input it reads.
- **Old saves load:**
  - an 8.2.1 save fixture (orders without `from`, sites without `camp`) loads and plays a year with today's behaviour;
  - a test saves and reloads a city with a chosen source and a camp.
- **Ruling numbers** come from each track's range below, so two tracks never take the same number.

### UX rules (every UI change; reviewers check each)

- **Layout:** one panel at a time; nothing floats over the middle of the map. The one exception is the map pick mode, which is the map itself with a bar.
- **Sizes:** `tests/ui/mobileBudget.test.js` passes at 375x667 and 390x844, at 100/125/150% text.
- **Controls:** 44x44 tap targets with accessible names, and a keyboard path on desktop (Tab, Enter or Space, Esc cancels a pick).
- **Not colour alone:** the water tints carry a word on the bar, and stuck supply lines are dashed as well as amber.
- **Reasons and consequences:** every refusal says why, with Show me; every choice states its consequence before the tap, including the camp's price and the speed it gives.
- **Screenshots:** every new or changed screen at 375x667, 390x844, 667x375, 1280x800 and 1920x1080, at 100% and 150% text, before review and after the fix wave. Shots are named `v83-<track>-*.png` in `docs/superpowers/notes/screenshots/raw/v83/`, which is gitignored.

## Tracks

### Track X: crossings (Opus; rulings 1390-1409)

- **The road verdict.** `previewRoadTiles` judges each water run with `bridgeRuns`:
  - **1 to 4 tiles:** a bridge, as today.
  - **5 to `FERRY.max` tiles, straight, land at both ends:** a ferry. The run's two bank tiles become landings; they get no road and stay free land for the landings. The water gets no road. The verdict gains `ferries: [{ landings: [[x, y], [x, y]], water }]`, and its cost adds `2 x costOf(world, FERRY_LANDING)` per ferry.
  - **Wider, or bent:** refused as today, with `too_wide` now meaning more than `FERRY.max`. The words name both limits.
  - **A landing tile that is not free land** (a building, a road already there, a wall): refused, with the reason and Show me.
- **Laying.**
  - `drawRoadTiles` lays the road, then the landings, through a helper factored out of `layCrossing` (`layLandings(world, landings, water) -> ids`), so a road-laid ferry is exactly 8.2.1's pair with `ferry.mate` and `water`.
  - It pushes one undo entry for the whole stroke, `{ kind: 'road', tiles, cost, walls, ids }`; `undo.js` takes the landings away as a `place` entry does and refunds as today.
  - A test proves one Undo removes road and landings and refunds the right amount.
- **Live words.** While dragging, the bar names the crossing ("Bridge: 3 tiles of water", "Ferry: 7 tiles of water, walkers wait at the bank", "Too wide: 14 tiles (a ferry crosses up to 12)", "A crossing must go straight across"). The run's water tiles are tinted: teal for a bridge, blue for a ferry, coral for a refusal, each with its word on the bar.
- **The Crossing card.**
  - The tray item keeps the id `ferry` and tool kind `ferry`, so saves and keys stay the same. Its name and card become "Crossing", with the line "Cross water: bridges up to 4 tiles, ferries 5 to 12".
  - `crossingChoices(world, from)` returns bridge plans and ferry plans, ranked by 8.2.1's rules 1344-1345 (narrowest water first, then nearness in bands, at most 3, at least 4 tiles apart).
  - A bridge plan is `{ kind: 'bridge', tiles, roads, water }`, laid through `drawRoadTiles`. A ferry plan is 8.2.1's, laid through `buildCrossing`.
  - Picking, the bar's crossing row and the ghosts follow rulings 1347-1354, with a bridge's ghost drawn as a road over the water.
- **Show me and the tip.**
  - Show me from a too-wide road opens the Crossing card ranked from that point.
  - `FERRY_TIPS` becomes the crossings tip: it fires the first time a road meets water, says the two limits in one line, and its How to play entry is reworded.
- **Tests:**
  - widths 1 to 13, straight and bent, land and no land at the ends;
  - a busy bank;
  - one undo for the whole stroke;
  - a road-laid ferry runs, staffs and carries walkers and carts as a Ferry-tool one (`ferryEdges`, `crossingTiles`);
  - raiders still never use it;
  - the card ranks bridges and ferries;
  - the 8.2.1 ferry tests are updated to the new names, never deleted.

### Track K: keep stocked and supply lines (Opus; rulings 1410-1429)

- **The sim.**
  - An order becomes `{ fetch, from? }`. A new command `setSource(world, storeId, good, fromId | null)` refuses with:
    - `not_storage` (no such store, or it does not store the good);
    - `same_store`;
    - `not_holder` (the source cannot store the good);
    - `unlinked` (no road or ferry route).
  - `findSource` honours `from`: only that store, and when it can spare less than 1 the order is `dry`. The cart waits; it never falls back.
  - `fetchPreview` and `fetchStatus` gain `chosen` and the `dry` state.
  - A chosen source that is demolished clears `from`, and the row says once "The chosen store is gone: Nearest again".
  - Each order keeps `moved` (this month) and `lastMonth` (rolled at month end) for the layer. Both are optional and absent means 0.
  - `another.js` copies `from` with the order.
- **The sheet.**
  - "Fetch" becomes **Keep stocked** in every word: `S47_CARTS_TEXT`, the tip, How to play and Recent.
  - The sheet has two parts: **Takes in** (the storehouse's existing switches) and **Keeps stocked**, open near the top of every granary and storehouse sheet.
  - One row per order: icon · Keep stocked [on/off] · up to [− n +] · from [Nearest granary, 34 tiles ▸], with the existing live line under it.
  - A dry chosen source shows an amber line with **Nearest instead?**, which calls `setSource(..., null)`.
- **The pick mode** (`modes.js`).
  - Tapping **from** enters a mode with a bar ("Pick the store to bring <good> from", with Nearest and Cancel).
  - Every store that can hold the good is lit with its spare amount; one that cannot spare any is dimmed, with the reason.
  - The road route from each is drawn.
  - Tap or click one to set it; Esc or Cancel leaves. Pan and zoom still work.
- **The Supply lines layer.**
  - A new layer kind `lines`, named "Supply lines" in the picker and legend. It is distinct from the existing `supply` layer ("Goods supply"), which is untouched.
  - It unlocks with Town, like the other layers.
  - A sim function `supplyLines(world) -> [{ home, source, good, path, lastMonth, state }]` gives the route along the roads (the cart route walk). The render draws it with dashes moving towards the home, thickness from `lastMonth`, and amber with long dashes when `dry` or without a source.
  - Tapping a line opens its home store's sheet.
  - It fits the 6.0 frame budget at the Huge map's zoom floor (a test as for the other layers).
- **Finding it.**
  - A tip, `keep_stocked`, fires the first time the city has two stores.
  - Advice gains two fixes, each with Show me opening the store sheet at Keeps stocked:
    - a bazaar's `granary_low` when another store can spare food;
    - a monument site short of stone or bricks when a storehouse within `MONUMENT.supplyReach` of it could keep them stocked from a store that holds them. If no storehouse is in reach, the fix is "Build a storehouse near the site", aimed at a valid spot.
- **Tests:**
  - a chosen source beats a nearer one;
  - dry waits and says so;
  - Nearest restores today's rule;
  - demolishing the source;
  - copying with Build another;
  - every refusal;
  - the layer's lines and states;
  - the pick mode by touch and by keyboard;
  - the old-save fixture;
  - the words from the sim's numbers.

### Track C: crews and the camp (Sonnet; rulings 1430-1444)

- **Data.** In `MONUMENT`: `crewReach` (12) now means the full-speed distance. Add `crewStep: 12`, `crewLoss: 0.1`, `crewFloor: 0.5` and `campShare: 0.1`.
- **Crew assignment.**
  - `crewPlan` takes pairs from every guild to every open site linked by road (`buildingsInReach` with `Infinity`, which already crosses running ferries), nearest first, with the same tie rules.
  - `crewSpeed(dist, camp) -> 1 | 0.9 | ... | 0.5` (1 when `camp`).
  - `crewDayUnits` multiplies by it for the guild's site.
  - `guildsNear` returns `{ id, dist, speed }`.
  - `goals.js` `crewNear` uses the same rule.
- **The camp.**
  - The command `setCamp(world, siteId)` charges `round(campShare x the site's founding price as this city pays it)`, the same `costScale` path the founding uses, and sets `site.camp = true`.
  - It refuses with `not_site`, `finished`, `has_camp` and `no_gold` (below the debt floor).
  - It is not undoable: the sheet's button confirms first, stating the price and the effect.
  - `site.camp` is cleared when the site finishes.
  - Tents are drawn along the site's edge inside its footprint, render only, readable under Gentle and Still.
- **The site sheet.**
  - Each crew line says its distance and speed ("Crew from the guild 40 road tiles away: works at 80% (the walk)").
  - The camp button shows its price and effect, or "Workers' camp: crews at full speed" once set up.
  - The "no stone near" line adds "Keep a storehouse within 16 road tiles stocked with stone", with Show me (K's Advice fix aims at the same place; C writes only the sheet line and its Show me).
  - The placing chip reads "Builders' guild: 40 road tiles (80%)" or "No builders' guild yet".
- **Balance.** Far guilds that were idle may now work, so rerun the Stage 4 and 6.0 balance runs. Their assertions must hold; record any run that changes pace, with the numbers.
- **Tests:**
  - speed at 12, 13, 24, 25, 48, 60 and 100 tiles;
  - a ferry-linked site;
  - nearest first with full sites;
  - the camp's price at two difficulties and a later rank;
  - every refusal;
  - the camp clears on finish;
  - old saves;
  - the sheet's words from the sim.

### Wave 2: balance, review, docs (rulings 1445-1459)

- **Balance check (Sonnet):** every Stage 4, 6.0 and 7.0 balance assertion holds after the merge. Record the great-work run's day won, before and after.
- **Final review (Opus)** of the whole branch, with the UX rules, the usability pass at every size, the screenshots and the ledger. Wait for any helper sub-reviews it starts. Then one Sonnet fix wave split by file ownership, and a Sonnet re-review.
- **Docs:**
  - README;
  - the follow-ups note `notes/2026-10-27-version-8-3-followups.md`, with Josh's real-phone checks: a road dragged across a wide river, picking a source on a phone, the Supply lines layer, a far guild and a camp;
  - rulings Part 25;
  - a What's new entry for **8.3 "Lines"**, with 8.2.1's build set to its merge commit and the pinned release tests moved down one;
  - `APP_VERSION` set to 8.3.
- **Merge** to main locally, rerun `tools/sw-files.ps1`, and run the full suite on main. Ask Josh before pushing.

## Rulings (proposed; append as Part 25)

1380. 8.3 changes no balance number. The bridge (4) and ferry (5-12) limits, cart speed and trip size, crew output and every price stay. — Cost if wrong: none; 8.4 owns balance.
1381. The road tool lays a ferry inside a road stroke; the Ferry tool stays as the Crossing card. Both lay the same landings. — Cost if wrong: two ways to do one thing remain, but each is clear.
1382. A road stroke with a ferry is one undo step. — Cost if wrong: undo removes more than a player expects.
1383. "Fetch" is renamed Keep stocked everywhere; the delivery switches are named Takes in. — Cost if wrong: players who learned Fetch relearn one word.
1384. A chosen source never falls back by itself; it waits and asks (Josh, 27 Oct). — Cost if wrong: a dry line starves a store until the player looks.
1385. Supply lines is a new layer, beside the existing Goods supply layer. — Cost if wrong: two layers with "supply" in their names.
1386. Crews work any road-linked site: full within 12 road tiles, 10% less per further 12, never below 50% (Josh, 27 Oct, a first value). — Cost if wrong: a far guild is too good or too slow; one constant to retune.
1387. A workers' camp costs 10% of the site's founding price as the city pays it, is not undoable, and clears when the site finishes (Josh, 27 Oct). — Cost if wrong: a misclick costs 10% of a founding.
1388. No world-version bump: `order.from`, `order.moved`, `order.lastMonth` and `site.camp` are optional, and absent means today's behaviour. — Cost if wrong: a later release needs a migration anyway.
1389. Opus for X, K, hard merges and the final review; Sonnet for C and the rest. — Cost if wrong: a Sonnet track needs an Opus fix round.
