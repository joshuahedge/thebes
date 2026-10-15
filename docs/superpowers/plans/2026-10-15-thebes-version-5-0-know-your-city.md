# Thebes Version 5.0: know your city (plan)

Agreed with Josh on 15 Oct 2026, after Version 4.7 went live (main 5227d8d, 2,643 tests, world version 8, build cf382a0). Josh chose to skip missions for now and make Version 5 an improved, polished game in two releases: **5.0 "Know your city"** (this plan) and **5.1 "A living world"** (trade routes, goals after Capital, city events, seasons and light, sound polish; planned later). A lean build, as 4.7 was: one branch, sequential tasks.

Authority: the spec `docs/superpowers/specs/2026-10-09-thebes-design.md`, this plan, and the rulings (501 on) appended to `docs/superpowers/notes/handoff-2026-10-11/rulings-so-far.md` as "Part 15: Version 5.0". Background: `notes/2026-10-14-stage-4-7-followups.md`, the 4.7 contract `notes/2026-10-14-stage-4-7-contract.md`.

## What Josh asked for

Improved functionality and UX polish in four themes, with these picks (15 Oct):
1. **Knowing what's wrong:** a city advice sheet ranking what holds the city back, with **its own top-bar button** (not inside the summary sheet); smarter advice (a single next step with its cost on each house sheet); new heat-map layers.
2. **Building feels smooth:** Build another (copy a building), drag areas for more things, roads that find their way. (Not chosen: moving buildings.)
3. **Mid and late game depth (5.0 part):** grand homes reachable in normal play. (Trade routes, goals after Capital and city events go to 5.1.)
4. **Look and feel (5.0 part):** a smoother camera and a faster large map. (Seasons and light and sound polish go to 5.1. Not chosen: rotate the view.)

## Rules for every task

- Branch `version-5-0` from main in `C:\dev\thebes`. No worktrees: tasks run one after another.
- Commit identity: `git config --local user.email` must print `181878008+joshuahedge@users.noreply.github.com`. Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never write Josh's employer's name anywhere; the controller's guard script must print GUARD OK before every commit.
- After editing `src/`, `css/`, `index.html` or `assets/`, run `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`; rerun it after the last edit, before the final suite. Never hand-edit `sw-files.js`.
- Before every commit: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 600` prints ALL PASSED (about 6 minutes; run it alone, never beside another suite). Iterate with `-Grep "v50 <area>"`. Timing tests can flake under load: rerun once.
- New tests go in `tests/v50/<task>/`, imported from `tests/v50/all.js`. Describe names start with `v50 `.
- Stage files by path; never stage `.superpowers/`. Never push. Never run `python -` or `python3 -` with a heredoc (it hangs this machine); write a script file.
- **Never block on an unbounded wait.** Every screenshot, server check and wait loop runs under `timeout` (shots 150 s). Stop any server or Edge you start.
- Words must match the sim: every number, rule or consequence on screen comes from the sim's own function or data, with a test that sets the world up both ways. Advice never recommends something the sim would refuse.
- The sim stays deterministic: no `Math.random`, `Date` or `performance.now` in `src/sim`.
- Motion: Gentle (reduced motion) is what headless Edge and Josh's devices show; every visual must read under Gentle, tests of Full force it, Still shows no new movement.
- Old saves load unchanged; classic at Normal draws exactly as today. 5.0 adds no terrain.
- **Ruling numbers are given per task** (see each task) so two tasks never take the same number.

### UX rules (every UI change; reviewers check each)

The nine UX rules apply unchanged: one panel at a time and nothing floating over the middle of the map; `tests/ui/mobileBudget.test.js` at 375x667 and 390x844, 100/125/150% text; 44x44 tap targets with accessible names; colour never the only cue; progressive disclosure (each new thing unlocks at a stated milestone with one first or tip and words in How to play); every refusal says why with Show me; every choice states its exact consequence before the tap; deadlines in game months; no dark patterns. Add: **the top bar must still fit** at 375 px wide and 150% text with the new advice button.

## World version

5.0 needs no new world fields unless Task 0 finds one (for example the advice "seen" marker, which should live in settings, not the world). If a field is needed, Task 0 bumps `WORLD_VERSION` to 9 with `MIGRATIONS[8]` and tests; otherwise the world stays at 8.

## Tasks (sequential)

### Task 0: contract (Opus; rulings 510-519)

- `src/sim/advice.js`: `cityAdvice(world)` returns the ranked problems the city faces, each `{ kind, weight, count, words data, fix: { item | select | view, target }, cost }`, built only from the sim's own functions (`houseStatus`, `needCause`, `alertsFor`, `monthForecast`, stock and staffing). Weight = homes held back (by tier gained) plus gold at risk plus danger uncovered; deterministic order with stable tie-breaks. Kinds at least: homes held back by a need (grouped by need and cause), a good running out within N months, workers short, jobless, treasury runs out, danger uncovered (fire, raid towers, health, crime), stranded goods (a far store; Fetch is the remedy).
- `nextStep(world, house)`: the single first unmet need's fix with its `costOf`, or the reason there is none (top tier kept, waiting on a delivery).
- A per-chunk index of buildings for render (`render/chunkIndex.js` or similar), invalidated by building version, so drawing and hit-testing look only at buildings near the view.
- `tests/v50/all.js`, dev scenes `v50-advice`, `v50-house-step`, `v50-layers`, `v50-areas`, `v50-roads`, `v50-grand`; contract note `notes/2026-10-15-version-5-0-contract.md`; full suite; one commit.

### Task 1: city advice (rulings 520-529)

- A top-bar **Advice** button (a scroll icon, 44 px, accessible name "City advice"), with a dot when an item appeared since the player last opened it (seen state in settings). It opens one sheet: the top five items of `cityAdvice`, each a sentence with its numbers, its cost when building fixes it, and Show me. "All is well" when there is nothing, with the next milestone instead.
- Unlocks with the first house placed; a tip and How to play words. The summary sheet keeps its figures and links to Advice.
- Mobile budget: the top bar fits at 375x667 and 390x844 at 100/125/150% text with the button; the sheet passes the budget.

### Task 2: next step on house sheets (rulings 530-539)

- A line at the top of every house sheet from `nextStep`: "Next step: a weaver near here (110 gold) gives these homes linen", with one Show me; or "Kept: nothing more to do" at the top tier with all needs met; or "Waiting: pottery on its way (2 days)". The full checklist stays below.
- Tested both ways for every cause code.

### Task 3: three new layers (rulings 540-549)

- **Home progress:** each home tinted by how close it is to its next tier (all needs met / one missing / two or more), with the blocking need's icon; colour is never the only cue.
- **Goods supply:** a good picker in the legend row (pottery, beer, linen, jewellery, foods); homes lacking it marked, stores holding it marked with the amount.
- **Workers:** buildings short of staff marked with how many; districts with jobless people shaded.
- Through the existing `OVERLAYS` table, picker and legend; cached by building and road version; Large draw cost within budget.

### Task 4: Build another and drag areas (rulings 550-559)

- **Build another** on every building sheet (and palace/monument styles where they apply): picks up the same type, style and settings (a store's Fetch orders), ready to place. Refused with why and Show me when it cannot be built (locked, unaffordable).
- **Drag areas** for farms (packs as many as fit the rectangle, each on valid ground, with "6 farms · 240 gold" before confirm and skipped tiles shown) and for gardens and statues (fills the rectangle at the chosen spacing). Reuses the plots tool's `plan`/`area` state and `preview*`/`paint*` pattern; one undo step per area.

### Task 5: roads that find their way (rulings 560-569)

- A routed road: choose a start and an end (tap, tap on touch; drag on mouse) and the road takes the cheapest path over buildable land around buildings, hills and water, crossing water only where a bridge is allowed (straight, up to `BRIDGE_MAX`, land at both ends), preferring existing roads, with the cost and bridge count shown before confirm. Finger-follow and the L with Flip stay as they are; a toggle on the road bar picks Route or Straight.
- Refusals say why ("No way across: the river is too wide here") with Show me. Deterministic routing (`src/sim` A* reuse: `pathfinding.js`/`walk.js`), cost tested against the preview.

### Task 6: smoother camera (rulings 570-579)

- Fling: a quick swipe keeps panning and slows to a stop (Full), shorter under Gentle, none under Still. Any touch stops it.
- Show me glides to the target and frames it (Gentle: a short glide, Still: a jump).
- Pinch stays anchored under the fingers; double tap zooms in a step; two-finger double tap zooms out.
- Render and hit-testing use Task 0's chunk index: on Large at zoom 0.5 the frame mean is at most 1.25x Normal (4.6 measured 1.56x; the limit was 1.6x); record before and after.

### Task 7: grand homes you can reach (Opus; rulings 580-599)

- Goals lead there: once Fine manors are common, goals bring in each need one at a time (flax and a weaver, a third food, "raise this street's desirability to 50" with gardens and statues, then jewellery). Data in `data/goals.js`.
- A **grand district** balance test on Normal reaches a Villa by about year 8 and an Estate by about year 10 with sensible play (a driver that builds what Advice and the next step say). If it cannot, tune the data (desirability values and radii of gardens, statues, temples, workshops and farms; tier thresholds) until it can, keeping the village and capital runs inside their assertions. Record every changed number with its reason.
- Advice and the next step name these remedies; How to play words for grand homes.

### Task 8: balance, review, docs (rulings 600-619)

- **Balance (Sonnet):** the 10-year village (68-75%), the capital run and the late run keep their assertions; the grand district reaches Villa and Estate; Advice's top item on each run is sensible (record them).
- **Final review (Opus)** of the whole branch with the UX rules, the screenshots and the ledger; wait for any helper sub-reviews before acting; one Sonnet fix wave; a Sonnet re-review.
- README, follow-ups note `notes/2026-10-15-version-5-0-followups.md`, rulings Part 15, a "Version 5.0" entry in `src/data/releases.js` (New and Fixed, `build: 'live'`; set 4.7's build to its merge commit, the 4.6 method), `APP_VERSION` to 5.0. Merge to main locally, rerun `tools/sw-files.ps1`, full suite on main. Ask Josh before pushing.

## Checkpoints with Josh

None during the run (Josh, 4.7: "just carry on to the end"); he may drop in with asks, which the controller folds in as tasks. Ask before any push.

## Rulings (proposed; append as Part 15)

501. City advice is computed in the sim from the sim's own functions and ranks by homes held back, gold at risk and danger uncovered. — Cost if wrong: the order may not match what a player feels is most urgent.
502. Advice has its own top-bar button with a dot for new items; the summary sheet keeps the figures. — Cost if wrong: one more button in a tight bar.
503. Every house sheet opens with one next step and its cost; the checklist stays below. — Cost if wrong: one more line on the sheet.
504. Three new layers: home progress, goods supply, workers. — Cost if wrong: a longer layers list.
505. Build another copies type, style and settings. — Cost if wrong: a copied Fetch order a player did not want (it shows before confirm).
506. Drag areas place farms, gardens and statues, with the total before confirm and one undo step. — Cost if wrong: none.
507. Routed roads take the cheapest legal path and cross water only where a bridge is allowed; straight drawing stays. — Cost if wrong: a route that is legal but not the one the player pictured (Straight is one tap away).
508. The camera flings and glides under Full, shortens under Gentle, never under Still; a large map costs at most 1.25x a normal one zoomed out. — Cost if wrong: none.
509. A Villa is reachable by about year 8 and an Estate by about year 10 with sensible play on Normal, tuned by data and proven by a balance run. — Cost if wrong: grand homes come a little too easily.
