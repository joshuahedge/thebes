# Thebes Stage 4.6: living land, the court, armies and wonders (plan)

Agreed with Josh on 13 Oct 2026, after Stage 4.5 went live (main 87809a5, 1,918 tests). Three iterations built together, as parallel tracks: **1. Living land** (clarity, maps, the flood, wildlife), **2. Pharaoh's court** (favour, requests, event cards), **3. Armies and wonders** (unit types, enemy types, new monuments and styles). Stage 5 (missions) comes after and will be built from these parts.

This is a design plus task briefs in prose with decided numbers. It is not code-complete: an Opus architect writes the shared contract first (Track 0), and implementers write the code and tests. Where a number is given as "between X and Y", the track sets it from the data and records it as a ruling.

Authority: the spec `docs/superpowers/specs/2026-10-09-thebes-design.md`, this plan, and the rulings (331 on) appended to `docs/superpowers/notes/handoff-2026-10-11/rulings-so-far.md` as "Part 13: Stage 4.6". Background: `notes/2026-10-13-stage-4-5-followups.md`, `notes/2026-10-13-economy-review.md`.

## What Josh asked for

1. New players cannot tell where clay is, a clay pit will not fit, and nobody says a pit needs clay until it is refused.
2. Map generation with more randomness, and a choice of map size.
3. The Nile's yearly flood as a rhythm (not a disaster).
4. Wildlife for visual flavour and animation, which can also be hunted for food.
5. Requests from the capital and event cards with real choices.
6. More military variety: soldiers, archers, chariots, and the same for enemies.
7. More monument variety.
8. Clear, good UX throughout, following best practice.

His choices: map sizes **48 / 64 / 80**; requests feed a **favour meter**; **one building per unit type**; **new monument kinds plus styles**.

## Rules for every task

- Branch `stage-4-6` from main in `C:\dev\thebes`. Tracks work in sibling worktrees `C:\dev\thebes-s46-<track>` on branches `s46-<track>` cut from the contract commit.
- Commit identity: `git config --local user.email` must print `181878008+joshuahedge@users.noreply.github.com` (check in every worktree). Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never write Josh's employer's name anywhere; a case-insensitive `git grep -n -i` for it must print nothing before every commit.
- After editing `src/`, `css/`, `index.html` or `assets/`, run `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`. Never hand-edit `sw-files.js`; on merge conflicts in it, regenerate. Rerun it last, after the final edit, before the final suite.
- Before every commit: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 180` prints ALL PASSED. Iterate with `-Grep "s46 <area>"`.
- New tests go in `tests/stage46/<track>/`, imported from `tests/stage46/all.js` (one import per track file, created by Track 0). Describe names start with `s46 `.
- Stage files by path; never stage `.superpowers/`. Never push. Never run `python -` or `python3 -` with a heredoc (it hangs this machine); write a script file. Plain `python` has Pillow.
- Words must match the sim: every sentence that states a rule, a number or a consequence is computed from the sim's own function or data, with a test that sets the world up both ways.
- The sim stays deterministic: no `Math.random`, `Date` or `performance.now` in `src/sim`; draws are `hash2` keyed by id, day and seed, with a salt registered in the contract's salt table.
- Motion: headless Edge and Josh's devices report reduced motion (Gentle). Every visual must read under Gentle; tests of Full force it; Still shows no new movement.
- Peaceful: no raids, no crocodile scares, no threat event cards. Requests and other cards stay.

### UX rules (every UI change; reviewers check each)

1. One panel at a time; nothing floats over the middle of the map. New things arrive through the existing alert row and guidance row (rulings 163-177), never a new floating layer.
2. `tests/ui/mobileBudget.test.js` passes at 375x667 and 390x844, at 100%, 125% and 150% text.
3. Tap targets at least 44x44 CSS px; buttons have accessible names.
4. Colour is never the only cue: overlays, unit types, favour and flood levels carry a label or icon too. Text contrast meets WCAG AA on the Egyptian look.
5. Progressive disclosure: each new building or system unlocks at a stated milestone and arrives with one first, one tip and words in How to play. Nothing new appears in the first 10 minutes except the clarity fixes.
6. Every refusal says why in one line from the sim, and terrain-bound buildings offer Show me to the nearest spot that fits.
7. Every choice states its exact consequence before the tap ("Favour +10, 300 pottery leave the storehouse"), from the sim.
8. Time-limited things show their deadline in game months and never pause the game on their own; reading a letter can pause, as sheets do today.
9. No dark patterns: no fake urgency, no punishing a player for closing a panel.

## Process

- **Track 0, contract (Opus, sequential, on `stage-4-6`).** World version 7 and `MIGRATIONS[6]` with every new field (below); map size plumbing; shared data shapes and empty registries for each track; the salt table; file ownership per track (which files each track may edit, and the few shared files with the exact hooks each track adds); `tests/stage46/all.js`; dev-scene stubs. It also measures Large (80x80) on the busiest scene at 390x844, dpr 2, against the current 64x64 frame time: if Large costs more than 1.6x the frame time or breaks the mobile budget, it records that and proposes the fix (cap decor, cheaper terrain bake) before the tracks start. Full suite passes; one commit.
- **Tracks (parallel, at most 3 at once), via one Workflow.** Wave 1: **Map**, **Court**, **Armies** (the longest). Wave 2 as slots free: **River**, **Wonders**. Per track: an implementer (Sonnet; **Opus for Armies**), then a Sonnet reviewer with the diff, the track section, the rules and the UX rules. At most two fix rounds; Opus for a second round only if the first did not converge. Visual tracks take screenshots at 390x844 and 1280x800 under Gentle and Full; the reviewer opens them.
- **Integration (controller).** Merge tracks into `stage-4-6` in the order Map, River, Court, Armies, Wonders; regenerate `sw-files.js` on conflict; full suite after each merge.
- **Balance (Sonnet).** The 10-year village stays inside 60-70% (wages and upkeep over taxes) with one hunting lodge, one fishing wharf, one archery range and the court on; the capital run keeps its assertions. Retune only Stage 4.6 numbers and record them.
- **Final review (Opus)** of the whole branch, with the ledger, the screenshots and the UX rules; one Sonnet fix wave; a Sonnet re-review of the fixes. Then README, follow-ups note `notes/2026-10-13-stage-4-6-followups.md`, rulings Part 13; merge to main locally; rerun `tools/sw-files.ps1`; full suite on main. Ask Josh before pushing.
- **Controller** keeps a ledger at `.superpowers/sdd/2026-10-13-thebes-stage-4-6/progress.md` and reads reports, not diffs.
- **Checkpoints with Josh:** after wave 1 (shots: the three map sizes, a clay pit landing on clay, a court letter, a mixed raid against archers and chariots) and before any push. Usage guard: check plan usage at each checkpoint and at each wave; if weekly use passes the limit in the prompt, stop after the current track and ask.
- **Hazards:** if a suite run times out, check `Get-Process python*` for CPU-heavy strays (idle `http.server` processes from other sessions stay). A Workflow resumed by run id caches by call order: after changing concurrency, restart from saved state instead. Retake screenshots at HEAD before judging art.

## World version 7

Track 0 bumps `WORLD_VERSION` to 7 with `MIGRATIONS[6]`. Every Stage 4.6 field lands there and nowhere else. Old saves keep their maps and play on.

- `mapSize` (48, 64 or 80; 64 for migrated cities) and the generator's `mapParams` (the seeded shape choices, for display and replays).
- Flood: `flood` state (this year's level, the forecast if known, the season's day range), and a `floodplain` mask derived from terrain.
- Wildlife: herds (`id`, kind, centre, size, regrowth) and the hunted tally. Birds, fish and river animals are render-only, apart from crocodile spots (seeded tiles) used by the scare rule.
- Court: `favour` (50 for migrated cities), the letters queue, the active request, the card history, and the next-letter day.
- Armies: per-building trained units by type, the raid's composition by enemy type.
- Monuments: `style` on each monument site and finished monument (`'classic'` for migrated ones).
- Tallies for every new first and achievement.

## Iteration 1: Living land

### Track Map: clarity, generation, sizes (rulings 331-333)

**Clay you can find (331).**
- Clay draws as its own ground at every Ground setting: warm terracotta with fine cracks and small dug hollows, distinct from sand, fertile land and rock at phone zoom under Gentle. The Ground overlay keeps its clay tint and legend.
- A clay pit fits when **at least 2 of its 4 tiles** are clay (was 4 of 4); the card and the bar say "Needs 2 of 4 tiles on clay" from the rule. Clay patches become 2-3 tiles wide along the banks, so every map has at least 8 places a pit fits (tested over 50 seeds per size and variant).
- The clay pit's card says where clay lies ("Clay ground, along the riverbanks"). Picking it turns Ground on, pans to and lands the ghost on the nearest spot that fits, and the guidance row says "Clay pits stand on clay: the reddish ground by the river".
- A refused spot says "Needs 2 of 4 tiles on clay (this spot has 1)" with Show me to the nearest fit.
- The pottery chapter's goal Show me points at the nearest fit, not merely at clay.
- **Why not here, everywhere:** every terrain-bound building (farms, orchards, mines, clay pits, and the River track's wharf and lodge) uses one shared refusal-and-nearest-fit helper, so all refusals read the same way.

**Varied maps (332).** Inside each of the six river variants, the generator draws seeded shape choices:
- meander strength and length;
- 0-2 side channels or oxbow lakes;
- 2-5 rocky outcrop clusters;
- dune fields (decor on buildable desert);
- palm groves near water;
- 0-2 dry wadis (buildable, decor).

The variant invariants from ruling 313 still hold at every size, tested over 50 seeds per size and variant: fertile banks, rock away from the river (scaled by area), raider entries on land edges, a buildable start area near the river, and a bridge spot on non-classic maps. `classic` at 64 draws exactly as today, so fixtures and old seeds do not move.

**Map sizes (333).**
- New city offers Small 48, Normal 64 and Large 80, default Normal, with one line each ("Small: a quick city", "Large: room for every monument").
- Counts that are per map today (rock, clay, raider entries, herds) scale with area.
- The weekly seed stays Normal.
- Share links and personal bests carry the size; Normal keeps today's keys, as ruling 324's classic keys did.
- The title, sample and stress cities and the test fixtures stay 64.

### Track River: the flood, wildlife, hunting and fishing (rulings 334-335)

**The flood (334).**
- Each year the river floods across months 7-9 (game months). Its level is a seeded draw per year: Low 15%, Fair 35%, Good 35%, High 15%.
- The floodplain is the fertile land within 3 tiles of water.
- The year's harvest on floodplain farms is multiplied by the level: 0.6 / 0.9 / 1.1 / 1.25. Farms off the floodplain are unaffected.
- No damage, no deaths: the flood is a rhythm, not a disaster (Josh turned floods down as a threat).
- The **Nilometer** (1x1, 80 gold, upkeep 3, 2 workers, must touch water, Services, unlocks with Village) forecasts the next level 3 months before the season. Without one, the level is known when the water rises.
- Words: a caption when the forecast or the flood arrives ("The flood will be Low: farms on the floodplain grow 60%"); a farm sheet row "Floodplain: this year's flood gives 110%"; the summary's food forecast uses it.
- Art: water spreads over the floodplain's low tiles during the season, render-only, readable under Gentle (a still blue sheen), and drains after.

**Wildlife (335).**
- Gazelle herds (desert and rocky) and ostriches (desert) are sim entities: herds of 4-8 with a home range of 6 tiles, which move away from buildings.
- Ibis and herons on the banks, hippos and crocodiles in the water, and jumping fish are render-only ambient life.
- Cap: 40 animals drawn at once. Under Gentle they move slowly, as walkers do; under Still they stand.
- **Hunting lodge** (2x2, 70 gold, upkeep 4, 3 workers, Food, unlocks with Village): hunters walk to herds within 12 tiles and bring back **game**, up to 6 a month per herd in reach, at most 24 a month. Each hunt takes 1 from a herd; a herd regrows 1 every 2 months up to its size; a herd at 0 is gone. A new herd may wander in from a map edge each year (seeded).
- **Fishing wharf** (2x1, must touch water on its long side, 80 gold, upkeep 4, 3 workers, Food, unlocks with Village): a boat works the water within 8 tiles for **fish**, 20 a month, 30 in flood months.
- Game and fish are new foods. They count toward food variety where houses ask for it; the River track adds them to the housing food rules and every word that lists foods.
- **Crocodile scare:** a building within 2 tiles of a crocodile spot pauses for 1 day, at most once a month, with a caption. It is off on Peaceful and never hurts anyone.

## Iteration 2: Pharaoh's court

### Track Court (rulings 336-339)

**Favour (336).**
- Favour runs 0-100, starts at 50, and drifts 1 a month toward 50.
- At 70 or more: a gift every 6 months (gold or goods, seeded, sized to the city), and tribute costs 20% less.
- At 30 or less: raids grow one size step and tribute costs 20% more.
- Favour shows on the court sheet and in the summary, with a small icon and the number (never colour alone). It is not in the top bar (mobile budget).
- No score change (ruling 344).

**Requests (337).**
- The first request comes in year 2; then one every 8-14 months (seeded).
- Kinds:
  - **goods:** an amount of a good the city makes or can trade for;
  - **gold;**
  - **food;**
  - **soldiers:** a number of trained units leave for 6 months, then return. This kind comes from the Armies track.
- Deadline 6-12 months. Fulfilling is a Send button that is live when the storehouses and treasury hold enough.
- Met: favour +10 to +15 and a reward. Missed or refused: favour -10 to -20.
- Amounts scale with the city's output and with difficulty. The letter states the amount, the deadline, the reward and the cost of refusing, from the sim.

**Event cards (338).**
- One every 12-18 months (seeded), not during an active raid. Each card has two choices, and each choice states its exact effect.
- At least 8 cards, built with the other tracks' hooks:
  - **Sickness in a district:** quarantine (its workers stay home 1 month) or pay physicians (gold).
  - **Festival:** spend gold for mood for 6 months, or decline (small favour cost).
  - **Merchant caravan:** buy a rare good cheaply, or pass.
  - **Deserters:** let a small band settle as workers, or drive them off.
  - **Temple gift:** donate goods for favour, or keep them.
  - **Lost herd:** a herd wanders in, or out (River).
  - **Craftsmen dispute:** raise wages for a year, or lose a workshop's output for a month.
  - **Flood omen:** pay priests for a forecast without a Nilometer (River).
- Threat cards are off on Peaceful.

**Letters UX (339).**
- Requests and cards arrive as "A letter from the court" in the alert row, ranked below an active raid and uncovered fire, and above debt.
- A letter opens as a sheet (one panel at a time) with its choices, the deadline and Show me for anything it names. Letters queue; one is open at a time.
- Past letters are in the Recent list.
- The opening chapter gets one guided letter (a small, easy request) after the trading-post goal, so players meet the court with something they can meet.

## Iteration 3: Armies and wonders

### Track Armies (Opus implementer; rulings 340-342)

**Your units (340).**
- **Soldiers:** barracks, as today.
- **Archers:** archery range, 2x2, 180 gold, upkeep 10, 6 workers, unlocks with Town.
- **Chariots:** stables, 2x3, 300 gold, upkeep 14, 6 workers, unlocks with Market town; chariot strength needs horses fed (grain per month, stated on the sheet).
- Each building trains up to its capacity, and units guard the nearest threatened entry on their own. No unit micromanagement.
- Matchups: a typed table in the data file, used by `combat.js`. Names below are sim-side.
  - Archers deal 2x against foot when on or next to a wall or tower, and 0.5x in melee.
  - Chariots deal 2x against archers and foot in the open (no wall within 3 tiles), 0.5x within 3 tiles of a wall, and cannot pass a gate.
  - Soldiers deal 1.5x when holding a gate or a breach.

**Enemies (341).**
- Foot raiders, as today.
- Enemy archers from the 3rd raid: they strike towers from range.
- Enemy chariots from the 6th raid: fast, they cannot cross walls or rocky ground, and walls turn them.
- River raiders by boat from the 5th raid, on maps whose river reaches a map edge: they land on banks within 4 tiles of the city.
- Composition is a seeded mix by raid index and difficulty. The warning names it from the sim ("14 raiders from the east: 8 on foot, 4 archers, 2 chariots"). Tribute prices the total, adjusted by favour.
- The raid sheet lists what helps against each enemy type, from the matchup table ("Chariots: walls stop them; archers on walls hit them").

**Wonders (342, built in the Wonders track below).**

### Track Wonders (rulings 342-343)

**New kinds (342).**
- **Sphinx** (3x2): between the large obelisk and the colossus in cost and time; desirability like the colossus.
- **Sun temple** (3x3): between the large mastaba and the small pyramid; a mood bonus in reach.
- **Step pyramid** (4x4): between the small and the great pyramid.

Each kind uses the 4.16 table pattern (gold, materials, crews, game time, 1x and 3x real times), unlocks with a stated milestone, and is drawn in the house art style: teal-painted accents, lavender shadows, and stages of building that read under Gentle.

**Styles (343).** Every monument kind (the seven existing and the three new) offers 3 styles at placement: Whitewashed, Painted (teal and ochre) and Gilded. Gilded costs +10% gold and adds +1 desirability. The style picker reuses the palace's. Old monuments are `'classic'`, drawn as today.

## Rulings (proposed; append to the rulings file as Part 13)

331. Clay draws as its own ground; a clay pit needs 2 of its 4 tiles on clay; clay patches are 2-3 wide; the card, the guidance row and every refusal say where clay is, with Show me to the nearest fit. — Cost if wrong: clay pits are easier to place (pottery comes a little sooner).
332. Each river variant draws seeded shape choices (meanders, side channels, outcrops, dunes, groves, wadis) within ruling 313's invariants; classic at 64 is unchanged. — Cost if wrong: some seeds look busier.
333. New city offers Small 48, Normal 64 and Large 80; per-map counts scale with area; the weekly seed stays Normal; links and bests carry the size. — Cost if wrong: Large may run slower on old phones (Track 0 measures it first).
334. The flood comes every year in months 7-9 at a seeded level (Low 15%, Fair 35%, Good 35%, High 15%), scaling floodplain harvests by 0.6/0.9/1.1/1.25; a Nilometer forecasts it 3 months ahead; no damage. — Cost if wrong: a Low year can pinch food (granaries and trade are the levers).
335. Herds of gazelle and ostrich are sim entities that hunting lodges thin and that regrow slowly; fishing wharves fish the river; game and fish are new foods; birds, hippos, crocodiles and fish are ambient, capped at 40; a crocodile scare pauses a riverside building for a day, never on Peaceful. — Cost if wrong: one more food chain to balance.
336. Favour 0-100 starts at 50 and drifts to 50; 70+ brings gifts and cheaper tribute, 30- brings bigger raids and dearer tribute; it is shown with a number and icon, not in the top bar. — Cost if wrong: one more meter to watch.
337. Requests come from year 2 every 8-14 months, for goods, gold, food or soldiers, with 6-12 month deadlines; met +10..+15 favour and a reward, missed -10..-20. — Cost if wrong: a busy player may miss one (the deadline sits in the alert row).
338. An event card every 12-18 months offers two choices with stated effects; threat cards are off on Peaceful. — Cost if wrong: cards repeat in long games (8+ cards; more can come in Stage 5).
339. Letters arrive in the alert row and open as one sheet; they queue; the opening chapter has one guided easy request. — Cost if wrong: none.
340. Three unit types (soldiers, archers, chariots), one building each, with a typed matchup table; units guard on their own. — Cost if wrong: less control than a war game (by design).
341. Enemy archers from the 3rd raid, chariots from the 6th and river boats from the 5th on edge-reaching rivers; the warning and raid sheet name the mix and the counters from the sim. — Cost if wrong: late raids need a planned defence.
342. Three new monument kinds (sphinx, sun temple, step pyramid) in the 4.16 pattern. — Cost if wrong: more to build in a long game (that is the point).
343. Every monument offers Whitewashed, Painted or Gilded (+10% gold, +1 desirability); old ones stay classic. — Cost if wrong: none.
344. World version 7 holds every new field; no score change in Stage 4.6 (favour, food and armies are not scored yet). — Cost if wrong: the score ignores the court until a later score version.
