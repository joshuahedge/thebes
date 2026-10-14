# Thebes Stage 4.7: land and logistics (plan)

Agreed with Josh on 14 Oct 2026, after Stage 4.6 went live (main ed005c5, 2,373 tests, world version 7). A lean build, as Stage 4.5 was: one branch, sequential tasks. Stage 5 (missions) still comes after.

Authority: the spec `docs/superpowers/specs/2026-10-09-thebes-design.md`, this plan, and the rulings (461 on) appended to `docs/superpowers/notes/handoff-2026-10-11/rulings-so-far.md` as "Part 14: Stage 4.7". Background: `notes/2026-10-13-stage-4-6-followups.md`, the Stage 4.6 contract `notes/2026-10-13-stage-4-6-contract.md` (map generator, `src/sim/fit.js`, salts, size scaling).

## What Josh asked for

1. Once a house has been placed, show the spots that suit the next house.
2. A way to move goods across the city: storehouses far from the homes leave clay and pottery stranded, so homes cannot upgrade.
3. Some generated maps seem to lack clay or other resources. That must never happen.
4. Grass grows along the river and blends out slowly into desert.
5. Oases can form in the desert.
6. Impassable rocky hills, with mines placed around them in a later stage.
7. More late-game difficulty.

His choices (14 Oct): **good spots for the next house**; **storehouse orders with carts** (Pharaoh-style); **new hills terrain with rocky ground around it**; **lean process**. Folded in from the Stage 4.6 follow-ups: **hunters, herds and newcomers walk around water and hills**; **a Fair flood at 100%**; **clean up the old worktrees**. Late game: **a yearly tribute quota**, **raids that grow with the city's wealth**, **tougher upper housing tiers** (not chosen: pits and mines running out).

## Rules for every task

- Branch `stage-4-7` from main in `C:\dev\thebes`. No worktrees: tasks run one after another.
- Commit identity: `git config --local user.email` must print `181878008+joshuahedge@users.noreply.github.com`. Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never write Josh's employer's name anywhere; the controller's guard script (see the prompt) must print GUARD OK before every commit.
- After editing `src/`, `css/`, `index.html` or `assets/`, run `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`; rerun it after the last edit, before the final suite. Never hand-edit `sw-files.js`.
- Before every commit: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 180` prints ALL PASSED. Iterate with `-Grep "s47 <area>"`. Timing tests (`s4 balance live draw budget`, placement preview, ambient puff) can flake under load: rerun once.
- New tests go in `tests/stage47/<task>/`, imported from `tests/stage47/all.js`. Describe names start with `s47 `.
- Stage files by path; never stage `.superpowers/`. Never push. Never run `python -` or `python3 -` with a heredoc (it hangs this machine); write a script file.
- **Never block on an unbounded wait.** Every screenshot, server check and wait loop runs under `timeout` (shots 150 s; `tests/screenshot.ps1` also has a 150 s hard limit). Never write `until ...; do sleep` without a limit. Stop any server or Edge you start before you finish.
- Words must match the sim: every number, rule or consequence on screen comes from the sim's own function or data, with a test that sets the world up both ways.
- The sim stays deterministic: no `Math.random`, `Date` or `performance.now` in `src/sim`; draws are `hash2` with salts registered in the salt table.
- Motion: Gentle (reduced motion) is what headless Edge and Josh's devices show; every visual must read under Gentle, tests of Full force it, Still shows no new movement.
- **Old saves keep their maps.** Terrain changes (hills, oases, the grass band) apply to new maps only; saved cities never have terrain rewritten under them. Classic at Normal (64) keeps drawing exactly as today, as rulings 332 and 351 require (fixtures, the weekly seed and old share links stay put).

### UX rules (every UI change; reviewers check each)

The Stage 4.6 plan's nine UX rules apply unchanged: one panel at a time and nothing floating over the middle of the map; `tests/ui/mobileBudget.test.js` at 375x667 and 390x844, 100/125/150% text; 44x44 tap targets with accessible names; colour never the only cue; progressive disclosure (each new thing unlocks at a stated milestone with one first, one tip and words in How to play); every refusal says why with Show me; every choice states its exact consequence before the tap; deadlines in game months; no dark patterns.

## World version 8

Task 0 bumps `WORLD_VERSION` to 8 with `MIGRATIONS[7]`:
- terrain gains a `HILLS` value (old maps simply have none);
- `world.oases` (centres and radii, for display and herds) defaulting to `[]`;
- each storehouse and granary gets `orders` (`{ [good]: { fetch: number } }`, empty for old saves);
- `world.carts` (sim entities: id, from, to, good, amount, path length, day due) defaulting to `[]`;
- `world.mapParams` gains the new shape choices (hills, oases, grass band) for new maps;
- tallies for the new firsts.

## Tasks (sequential)

### Task 0: contract (Opus)

World version 8 and `MIGRATIONS[7]` as above, with migration tests; the `HILLS` terrain value with a single `passable(world, i)` and `buildable(world, i)` rule in the sim that every path user and placement check calls (raiders, herds, hunters, newcomers, carts, roads, buildings); salts for hills, oases, the grass band and carts; `tests/stage47/all.js`; dev-scene stubs (`s47-hills`, `s47-oasis`, `s47-grass`, `s47-house-spots`, `s47-carts`); a short contract note `notes/2026-10-14-stage-4-7-contract.md`. Full suite passes; one commit.

### Task 1: every map has its resources (ruling 461)

- **Measure first.** A diagnostic test sweeps 200 seeds for each size (48/64/80) and layout (all six). For each it records, from the start area's centre: the nearest clay-pit fit (Map's `fitOf`), the nearest mine fit on rocky ground, the number of farm fits on fertile ground, and the number of clay-pit fits on the whole map. Write the results (min, median, worst seeds) into the task report. This answers whether Josh's "no clay" maps are a generator gap, clay too far from the start, or an older save (4.5 maps kept 1-wide clay).
- **Guarantee.** Every new map has, within 20 tiles of the start area's centre (scaled with map size), at least 2 clay-pit fits, at least 1 mine fit on rocky ground, and at least 6 farm fits. When a draw misses, the generator repairs it deterministically (widen the nearest clay patch along the bank, grow a rocky skirt) rather than rejecting the seed.
- Classic at Normal is exempt only if it already meets the guarantee; if a classic seed fails, record it and repair it, accepting that this one seed moves (record the seed in the ruling).
- Tests over 200 seeds per size and layout. If Josh supplies a seed that "had no clay", add it as a fixture.

### Task 2: the green river band and desert oases (rulings 462, 463)

- **Grass band (462).** Land greens along the water and fades out through scrub into sand, with a soft, noisy edge, never a hard line. Drive it from one moisture field (distance to water, with value noise), used by both the terrain bake and the decor (grass tufts, reeds, palms near water, scrub further out). The sim's fertile land stays where it is (farms do not move); the band is how the ground is drawn, plus a wider meadow decor on new maps. Must read at phone zoom under Gentle, and on Small, Normal and Large. Check the terrain bake cost on Large stays within Track 0 of Stage 4.6's measured budget.
- **Oases (463).** On new maps, oases form in open desert: 0-1 on Small, 0-2 on Normal, 1-3 on Large (seeded), at least 12 tiles from the river and 8 from a map edge, never on the start area. Each is a small pool (3-8 water tiles) ringed by a bank, palms and a fertile ring with a little clay, inside its own small moisture field so it greens the sand around it. Herds favour oases (River's herd spawn may weight towards them). A pool too small for a fishing wharf says so through the shared refusal ("Must touch the river"). Classic at Normal gets none (unchanged map). New first: "An oasis in the desert" when the player first builds within 4 tiles of one.

### Task 3: hills (ruling 464)

- New `HILLS` terrain: impassable to roads, buildings, walkers, raiders, herds, hunters and carts; nothing is built on it. 2-5 clusters on Normal (scaled by area), each 4-14 tiles, at least 6 tiles from the river, kept off the start area and the raider entries.
- Each cluster gets a rocky skirt 1-2 tiles wide: today's rocky ground, where mines stand now and quarries come later. Mines keep working on rocky ground as today.
- **Connectivity invariant:** after hills are placed, every raider entry, the start area, the bridge spot (non-classic maps) and at least 90% of buildable land stay connected by passable tiles; tested over 200 seeds per size and layout. Raiders path around hills (their pathing must use `passable`).
- Words: the Ground overlay and its legend show hills ("Hills: nothing passes or builds here"), refusals say "Hills: nothing can be built here", and How to play mentions that mines will come to the rocky ground around them later (no promise of dates).
- Art: hills in the house style (sand-stone strata, lavender shadow, a few boulders), drawn at their real height, reading under Gentle and at phone zoom; they cast no light changes on the map.
- **Walkers round water and hills (472).** Hunters (today straight lines that cross the river), herds and newcomers path over passable land through the shared `passable` rule (render paths may be cached per road and terrain version); a herd never stands on water or hills. Tests on a river map and a hilly map.

### Task 4: good spots for the next house (ruling 465)

- After a house is placed (touch or mouse), the house tool stays active, and empty plots tint by what a house there would get, computed from the sim's own coverage functions: **Good** (road, water and a bazaar in reach), **Fair** (road and one of water or bazaar), unmarked otherwise. Each tint carries a small icon (drop, basket) so colour is never the only cue; a one-line legend arrives in the guidance row ("Bright plots have water and a market in reach").
- The tint appears only while the house tool is active, ends when the tool ends, and is part of the existing overlay layer (no new floating layer). It recomputes when roads or services change, cheaply on Large (cache by road and building version).
- Leaving the house tool after a touch tick (placement UX ruling) is replaced for houses only: the tool stays, with a clear Done button. Record the change.

### Task 5: storehouse orders and carts, in the sim (ruling 466)

- A storehouse or granary can be set to **Fetch** a good it may store, up to an amount (default 100). Its cart pusher (one cart per store; the store's existing workers staff it) hauls up to 20 units per trip from the nearest other store that holds the good and is not itself fetching it, along roads (bridges count), at any distance.
- A trip takes road distance / 8 tiles a game day each way (data, tunable). A cart is a sim entity with a due day; goods leave the source when the cart sets out and arrive when it returns. If the road breaks, the cart turns back and the goods return to the source.
- Fetching never pulls from a store below its own fetch order, so two stores fetching the same good do not ping-pong.
- Words from the sim: the store sheet shows each order with "Fetching pottery: 40 on the way, back in 3 days, from the storehouse 34 road tiles east"; a refused order says why ("No store with pottery is linked by road"). Houses whose upgrade waits on a good held only in a far store raise a tip with Show me to that far store and the words "Set a storehouse near these homes to Fetch pottery".
- Unlocks with Village (the first storehouse); arrives with a first, a tip and How to play words.
- Path cost on Large: road distances cached per road version; a balance check that a month-end on a fully built Large city stays under the Stage 4.6 figure.

### Task 6: carts on screen and the order UI (ruling 467)

- Carts walk the road path, drawn in the house style (a small cart, a pusher, the good's colour as a load with its icon), capped at 30 on screen; under Gentle they move as walkers do, under Still they stand at their store.
- The store sheet gets the Fetch control: per good, a toggle with a stepper (44px targets, accessible names), the exact consequence before the tap ("Fetch pottery up to 100: one cart, 20 a trip, from the nearest store with pottery, 34 road tiles"), and Show me to the source store.
- Mobile budget at 375x667 and 390x844 with the sheet open.

### Task 7: late-game pressure (Opus implementer; rulings 469-471)

Each starts no earlier than year 8, scales with difficulty, arrives with a warning a year ahead (a letter or a caption), and states its numbers from the sim.
- **Yearly tribute quota (469).** From year 8 the capital asks a yearly shipment of goods (a mix of goods the city makes or trades, e.g. pottery, linen, grain), sized to the city's own output (about 10-15% of a year's output of each, by difficulty). It is a standing letter in the court's sheet with a progress bar, the deadline (the year's end) and a Send button that ships from the stores as requests do. Met: favour +5 and a small gift; met by month 6: +8; missed: favour -15 and the shortfall carries into next year's quota once. It stays on in Peaceful (it is not a threat). Builds on the court (`src/sim/court.js`, ruling 349's ownership).
- **Raids grow with wealth (470).** From year 10, raid size gains a wealth term from the treasury and population (stated in the warning: "14 raiders: your wealth draws 4 more"), capped per difficulty, and two-sided raids become likelier (seeded, by raid index). Tribute prices the total, adjusted by favour as today. The score keeps `baseRaidSize` without wealth or favour (ruling 441's rule), so the score does not move. Off on Peaceful.
- **Tougher upper housing tiers (471).** The top two house tiers ask for a third kind of good and more of each (the task sets which from the goods the city can make by then, and records the numbers), and devolve slowly (the existing hysteresis) if supply breaks. Every house sheet line and How to play states the need from the housing data; the far-district fetch order (Task 5) is the intended remedy, and the house sheet's Show me points to the nearest store holding the missing good.
- A late-game balance run: the capital run reaches year 15 on Normal with quotas met and raids defended, keeping its assertions; recorded numbers.

### Task 8: balance, review, docs

- **Balance (Sonnet):** the 10-year village with one fetch order stays inside 60-70% (wages and upkeep over taxes); the capital run keeps its assertions; a far-district scene shows homes upgrading once a fetch order is set. **Fair flood to x1.0 (473):** set the Fair level's harvest factor to 1.0 (Low 0.6, Fair 1.0, Good 1.1, High 1.25), so the average flood is a small gain, and update every word, tip and release note that quotes it.
- **Final review (Opus)** of the whole branch with the UX rules, the screenshots and the ledger; wait for any helper sub-reviews it starts before acting; one Sonnet fix wave; a Sonnet re-review.
- README, follow-ups note `notes/2026-10-14-stage-4-7-followups.md`, rulings Part 14, a "Version 4.7" entry in `src/data/releases.js` (New and Fixed, with its build), `VERSION` to 4.7. Merge to main locally, rerun `tools/sw-files.ps1`, full suite on main. Ask Josh before pushing.

## Checkpoints with Josh

- After Task 3: shots at 390x844 under Gentle: the three map sizes on a new seed showing the grass band, an oasis, hills with their rocky skirt; plus Task 1's diagnostic numbers.
- Before any push.
- Usage guard: if weekly use passes the limit in the prompt, stop after the current task and ask.

## Rulings (proposed; append as Part 14)

461. Every new map has, near the start, at least 2 clay-pit fits, 1 mine fit on rocky ground and 6 farm fits, repaired deterministically when a draw misses. — Cost if wrong: a few seeds look a little more alike near the start.
462. Grass greens the land along water and fades through scrub into sand from one moisture field; farms' fertile land does not move. — Cost if wrong: the green band is look only, so players may expect to farm all of it.
463. Oases form in open desert on new maps (0-1 / 0-2 / 1-3 by size), each a small pool with palms, a fertile ring and a little clay; classic at Normal gets none. — Cost if wrong: classic Normal players see no oases.
464. Hills are impassable and unbuildable, with a 1-2 tile rocky skirt for later mines; every map stays connected. — Cost if wrong: raiders take longer routes on hilly maps.
465. After placing a house the tool stays and empty plots show Good / Fair by the sim's coverage, with icons and a legend. — Cost if wrong: one more tap (Done) to leave the house tool.
466. Storehouses and granaries can Fetch a good from other stores by road at any distance, by cart, 20 a trip, 8 road tiles a day each way; no ping-pong. — Cost if wrong: one more system to manage (optional, off by default).
467. Carts are drawn on the roads, capped at 30, and the store sheet holds the Fetch control with its consequence and Show me. — Cost if wrong: none.
468. World version 8 holds every new field; old saves keep their maps and gain no hills or oases. — Cost if wrong: old cities never see the new land.
469. From year 8 the capital asks a yearly goods quota sized to the city's output; met +5 (by month 6 +8), missed -15 with the shortfall carried once; on in Peaceful. — Cost if wrong: a standing chore in long games.
470. From year 10 raid size gains a capped wealth term and two-sided raids grow likelier; the score ignores it. — Cost if wrong: rich late cities need real defences.
471. The top two house tiers ask for a third good and more of each, devolving slowly if supply breaks. — Cost if wrong: grand homes are harder to keep.
472. Hunters, herds and newcomers path round water and hills by the shared passable rule. — Cost if wrong: none (render and herd moves only).
473. A Fair flood gives x1.0 (was x0.9), so the average flood is a small gain. — Cost if wrong: slightly more food than the 4.6 plan pictured.
