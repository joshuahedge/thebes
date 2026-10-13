# Thebes Stage 4.5: polish and pressure (plan)

Agreed with Josh on 13 Oct 2026, after Stage 4 went live (main 7833292, 1,697 tests). This is a lean iteration: one branch, tasks one at a time, Sonnet doing most of the work. It is written as task briefs in prose with the decided numbers. It is not a code-complete plan, because there are no plan writers; implementers write the code and its tests.

Authority: the spec `docs/superpowers/specs/2026-10-09-thebes-design.md`, this plan and its rulings (309 on). The rulings list is `docs/superpowers/notes/handoff-2026-10-11/rulings-so-far.md`; append a "Part 12: Stage 4.5" as you go. Background: `notes/2026-10-12-stage-4-followups.md`.

## What Josh asked for

1. Flames or some visual on buildings that catch fire.
2. A gatehouse so roads can pass through walls.
3. The game feels a little too fast from the beginning.
4. Clay pits only on clay ground.
5. Trees do not disappear under walls or other buildings.
6. More varied maps, and a way to build across water.
7. Look again at early, mid and late game economics.
8. More risk from raids and other threats.
9. Some players do not understand early-game economics and end up in debt early.

His choices: the clock slows everywhere (not only the opening); roads cross water by **bridges**; maps vary by **river variations** (map types later); the new threats are **tougher raids, disease and crime/unrest** (not floods); debt is fixed by **teaching and warning first**, and softening the first year only if the numbers show it is too tight.

## Rules for every task

- Branch `stage-4-5` from main, in `C:\dev\thebes`. No worktrees, no parallel tracks.
- Commit identity: `git config --local user.email` must print `181878008+joshuahedge@users.noreply.github.com`. Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never write Josh's employer's name anywhere; a case-insensitive `git grep -n -i` for that name must print nothing before every commit.
- After editing `src/`, `css/`, `index.html` or `assets/`, run `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`. Never hand-edit `sw-files.js`.
- Before every commit: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 150` prints ALL PASSED. While iterating, use `-Grep "s45 <area>"`. `tests/ui/mobileBudget.test.js` must keep passing.
- New tests go in `tests/stage45/` and are imported from one aggregator, `tests/stage45/all.js`, which `tests/all.js` imports once. Describe names start with `s45 `.
- Stage files by path; never stage `.superpowers/`.
- Words must match the sim: every sentence that states a rule is computed from the sim's own function, with a test that sets the world up both ways.
- Motion: headless Edge and Josh's devices report reduced motion (Motion Gentle). Tests of Full force it. Every visual change must read under Gentle.
- The sim stays deterministic: no `Math.random` or wall clock in `src/sim`; draws are `hash2` keyed by id, day and seed, with a salt.
- Never push. Merge to main locally at the end and ask Josh.

## Process (token-efficient)

- **Per task:** one **Sonnet** implementer, given the task's section below plus the rules. Then one **Sonnet** reviewer, given the diff (`git diff BASE..HEAD` to a file) and the task section; it checks spec compliance, words-against-sim, and the tests.
- **Fix rounds:** at most two. The second goes to **Opus** only if the first did not converge. Then rule on anything left and record it.
- **Screenshots** only for visual tasks (1, 3, 5): `tests/screenshot.ps1` at **390x844** and **1280x800**, under Gentle (the default headless) and Full. The reviewer opens them; the controller looks at two or three.
- **Controller:** keeps a ledger at `.superpowers/sdd/2026-10-13-thebes-stage-4-5/progress.md` (one line per task, fix round and ruling) and reads reports, not diffs.
- **Checkpoints with Josh:** after Task 3 (show map variants and bridges: four small shots) and after Task 4a (the economy page). Wait for his reply at 4a.
- **End:** one Sonnet whole-branch review, one fix round, merge locally, full suite on main. Then ask Josh to push.
- **Usage guard:** check plan usage at each checkpoint. If the weekly limit passes 62%, stop after the current task and ask.
- **Hazards:** if a suite run times out, check `Get-Process python*` for CPU-heavy strays (idle `http.server` on ports 8731/8765 belong to other sessions; leave them). Never `python3 - <<EOF`; use plain `python` (Pillow is in the user site). After a context compaction, trust the ledger and `git log`.

## World version 6

Task 3 bumps `WORLD_VERSION` to 6 with `MIGRATIONS[5]`. Tasks 3 and 5 add their fields there and nowhere else.

- `mapVariant` (string, `'classic'` for migrated cities).
- Clay terrain on old maps (below).
- Per-home `health` and `crime` risk points, starting at 0.
- `illness: null` on homes.
- Tallies.

Old saves keep their maps.

## Task 1: Quick fixes (trees, gatehouse, fire you can see)

**1a. Trees.** `decorAt` in `src/render/renderer.js` hides a tree only where `world.occ` or `world.road` is set; walls (`world.wall[i] !== 0`) must hide it too. Check every other way a tile can be used (plots, rubble, plazas, sites, bridges from Task 3) and any cached tree list. Test: a wall, a plot and a 2x2 building on tree tiles show no tree.

**1b. Gatehouse (ruling 309).** Roads may be drawn across walls. Each wall tile the road tool crosses becomes a gate at the gate price (`costOf(world, 'gate')`, 20 a tile on Normal); a breach tile becomes a gate the same way. The road tool's bar says "Gate through the wall: 20 gold" (from the price function), and the plan's total includes it. Undo restores the wall.

Add a **Gate** card in Defence after Wall (unlocks with the wall). It starts the road tool in a mode that only accepts wall tiles. Drawing it on a wall tile with no road also lays the road tile.

Art: a gate tile draws as a small gatehouse (two squat towers and a lintel over the road) in `src/render/terrainWalls.js` and the art registry. It reads under Gentle.

The raiders' flow field already treats a gate as wall with HP 40. Keep that.

**1c. Fire you can see (ruling 310).** Under Gentle, flames change shape at most 1 Hz in place: no flashing, no rising, the same silhouette family as Full. Today Gentle shows a still flame and a "Burning" label.

Both levels get:
- a smoke column that fades in place;
- a scorched-ground decal under a burning building, and on rubble until it is cleared.

Fix the reviewer minors from Stage 4: Gentle smoke hidden behind the "Burning" label, and pills of neighbouring fires overlapping. Under Still: a still flame and the label, as today.

File: `src/render/fire.js` (and `effects.js` if needed). Screenshot a fire scene (`devScene('fire')`) at 390x844 under Gentle and Full.

## Task 2: A slower clock (ruling 311)

1× becomes **30 s a month** (was 20 s). `DAYS_PER_SECOND` in `src/sim/time.js` goes from 1.5 to 1.0; 2× and 3× scale from it.

Everything counted in game days stretches with it. That includes raid warnings (now ~90 s at 1×) and the monuments' times (the great pyramid is ~90 min at 1×, 30 min at 3×).

Real-time things do not change: captions, tips, toasts, the idle frame cap.

Update every test that pins seconds or frames per day, and the spec (3, 4.3 and 4.16's "at 1×" columns) and README. The monument data stays in game time. The review's 1× minutes become the new values; recompute them in the spec table.

## Task 3: Land and water (rulings 312-315)

**3a. Clay (ruling 312).** Add a terrain `CLAY` (`src/data/map.js`). Clay is laid along river banks as patches: a 1-2 tile band between the water's edge and the fertile land, in stretches of 4-10 tiles, roughly 40-90 clay tiles a map. The oasis edge (3b) gets some too. Clay is not fertile, but it is buildable dry ground.

The clay pit gets `terrain: 'clay'`. Its card says "Clay ground". The Ground overlay gains a third kind, clay, in a terracotta tint with its legend line. Picking a clay pit turns Ground on and lands the ghost on the nearest free clay (the P1/P15 rules).

Migration: on old maps, free bank tiles become clay by the same rule (seeded). Existing clay pits stay where they stand ("an older pit"; no refund needed).

**3b. River variations (ruling 313).** `src/sim/mapgen.js` picks a variant from `hash2(seed, salt)` and stores it in `world.mapVariant`.

| Variant | Description |
|---|---|
| `classic` | today's: river down the west side |
| `east` | mirrored: river down the east side, rocky ground on the far side |
| `middle` | river down the middle, desert both sides, rocky patches on both |
| `wide-bends` | stronger meanders |
| `island` | the river splits around a 4-8 tile island for part of its length |
| `oasis` | classic plus a lake with fertile and clay rings in the desert |

Every variant must keep:
- fertile banks;
- 90-150 rocky tiles away from the river;
- raider entries at land edges (`raiderEntries` still works);
- a buildable start area near the river.

Variants other than `classic` must have at least one spot where the river is 3 tiles wide or narrower, for bridges.

`createWorld({ mapVariant })`: the UI's New city and This week's Nile pass `'auto'` (from the seed). Every test fixture, the sample, stress and title cities, and seeds 7 and 11 in dev flags keep `'classic'` unless they ask otherwise, so existing tests and shots do not move. Add a dev scene that shows each variant, and a test over 30 seeds that every variant meets the bullets above.

**3c. Bridges (ruling 314).** The road tool may cross water only where the crossing is at most **4 tiles** of water in a straight line, along one axis.

- **Cost:** a bridge tile costs 25 a tile × difficulty cost (`costOf(world, 'bridge')`).
- **What it is:** a bridge tile is a road tile on water (`world.road[i]` set on a `WATER` tile). Walkers, caravans, raiders and the flow field use it like a road.
- **Refusals:** the bar says "Bridge: 4 tiles, 100 gold" or refuses "Too wide to bridge here (6 tiles of water)" from the rule's own function.
- **Fire and raids:** bridges never burn and are not raid targets.
- **Art:** a mudbrick and timber deck with low parapets, drawn in the terrain layer. It reads at phone zoom.
- **Demolish:** removes a bridge tile for no refund.

Undo works as for roads.

**3d. Checkpoint.** Shots for Josh at 390x844: an `east` map, a `middle` map, an `island` map, and a bridge.

## Task 4a: The economy page (no code; checkpoint)

Measure with the sim's own runs (the 10-year village, the capital run, and three scripted openings), all at Normal:

1. A sensible opening.
2. "Build everything you can afford" (services and workshops before enough homes).
3. "Roads and homes only."

Report, as one page `docs/superpowers/notes/2026-10-13-economy-review.md`:

- **Gold, people, jobs, taxes and spending** by month for years 1-2, and by year to 10.
- **The debt trap:** when and why the second opening goes below 0. Name the costs: upkeep, wages, the gap before tax.
- **What the interface tells a player before** that happens (today: almost nothing).
- **Mid and late game:** income, the 60-70% band and the monuments' sink.
- **3-5 proposals** with their numbers, including the teaching set below.

Stop and show Josh. He picks.

## Task 4b: Teach and warn (ruling 316; adjust to Josh's picks)

Default set if he agrees:

1. **Cards and the confirm bar** show "Upkeep N a month · N workers" next to the price. The bar adds "Monthly balance becomes +X" (or "−X") from the sim's month forecast.
2. **A forecast in the top bar's gold chip:** "+120 a month". When the forecast is below 0 it turns amber and its tap opens the summary at "Spending more than taxes bring in".
3. **A one-time warning tip** the first time next month's forecast would take the treasury below 0, with Show me pointing at the biggest cost.
4. **A seventh picture card, "Gold":** homes pay taxes; buildings cost upkeep and wages; build homes before luxuries. Rerun `tools/tutorial.ps1`. Add an opening goal that teaches it.

A softer first year only if Josh asks after the page.

The forecast function lives in `src/sim/economy.js` (pure, from state). Every word comes from it.

## Task 5: Threats (rulings 317-321)

**5a. Tougher raids (ruling 317).**
- **Size grows over the game:** × (1 + 0.1 per year since the raid clock started, at most 1.5). `RAIDS.maxSize` goes from 12 to 18.
- **Two-sided raids:** from the 4th raid, a seeded 35% chance that the raid comes as two bands from two entries. Sizes are split, rounding up, so the total is the size + 1. Both are warned on one warning, and the banner and countdown name both directions.
- **Targets:** after the wealth targets, raiders also strike granaries (stealing food) and homes (residents flee, 25% of them).
- **Tribute:** prices the total size. The first raid stays 3 and cannot be paid off.
- **Peaceful:** no raids, as today.

**5b. Disease (ruling 318).**
- **Risk:** each home builds health risk daily, faster when:
  - no well reaches it;
  - it is crowded (more than 20 residents per tile: Townhouses and every 2x2 home);
  - nearby desirability is below 0.
- **Cover:** a new **Physician** (1x1, 60 gold, upkeep 4, 4 workers, reach 8, Services, unlocks with Town) covers homes like a firehouse does.
- **Falling ill:** at the threshold, a seeded draw (2% a day) makes the home fall ill for 20-40 days. It loses 1 resident a day, at most 25% of its people. It spreads at 4% a day to edge neighbours unless covered. A covered illness ends twice as fast.
- **Effects:** a mood row "Illness −2 per ill home, at most −8"; a warning alert (never critical) "Sickness in a House: build a physician nearby" with Show me; a Health overlay (bands, as fire risk).
- **Art:** a small green-grey cloth over the door of an ill home, readable under Gentle.

**5c. Crime and unrest (ruling 319).**
- **Risk:** each home builds crime risk daily when:
  - its tier is low (Hut to House);
  - city mood is below 45;
  - unemployment is above 10%.
- **Cover:** a new **Police post** (1x1, 50 gold, upkeep 4, 4 workers, reach 8, Services, unlocks with Market town) covers homes.
- **Theft:** at the threshold, a seeded draw causes a theft (the home's risk resets). It skims 2% of the treasury (5-100 gold) or takes goods from the nearest storehouse or bazaar (5-20 units).
- **Effects:** a caption ("A thief took 40 gold from the treasury near the bazaar"); a warning alert per district with Show me; a Crime overlay. Mood row "Thefts −1 each in the last 90 days, at most −5".

**5d. Rules for both (ruling 320).**
- Coverage and daily risk are pure functions from state (the fire pattern in `src/sim/fire.js` is the model). Mirror its data file, alerts, mood terms, sheet rows ("Health: covered by the physician", "Crime risk: High") and overlays.
- Peaceful: disease and crime are off, like raids.
- Goals: "Build a physician" (Town chapter) and "Build a police post" (Market town chapter), as Stage 3's danger goals were added. Also one tip each, one first each, and words in the How to play list.
- No score change (ruling 321): Safety's terms stay as they are.

The 10-year village must stay inside its 60-70% band with one physician and one police post added. The capital run keeps its assertions. Retune only the new numbers if needed, and record it.

## Task 6: Final check and push

1. One Sonnet whole-branch review: the diff since main, with the ledger and minors. It looks for false words, determinism, migration v5→v6, Peaceful, the mobile budget, and Gentle visuals. Give it the screenshots of Tasks 1, 3 and 5.
2. One fix round.
3. Update README (new sections), the follow-ups note `notes/2026-10-13-stage-4-5-followups.md`, and the rulings Part 12.
4. Merge to main locally; full suite on main; ask Josh to push.

## Rulings (proposed; append to the rulings file as Part 12)

309. Roads may cross walls: each crossed wall or breach tile becomes a gate at the gate price, drawn as a small gatehouse. A Gate card starts that mode. — Cost if wrong: walls are easier to pierce by accident (the bar names the gates).
310. Under Gentle, fires show flames changing shape at most 1 Hz in place, plus a smoke column fading in place. Scorch marks show under every level. — Cost if wrong: a motion-sensitive player who wants nothing moving chooses Still.
311. 1× is 30 s a month (was 20 s); game-day timings stretch with it, real-time UI timings do not. — Cost if wrong: late-game monuments feel slower at 1× (3× is still there).
312. Clay ground lies along the banks (40-90 tiles a map); clay pits must stand on it; old maps gain clay on free bank tiles and keep existing pits. — Cost if wrong: fewer places for a clay pit.
313. Maps pick one of six river variants from the seed for new cities; tests, dev and sample cities stay classic; old saves keep their maps. — Cost if wrong: some seeds are harder (a river down the middle splits the town).
314. Bridges: a road may cross at most 4 tiles of water in a straight line, at 25 gold a tile; raiders use bridges like roads. — Cost if wrong: a wide river cannot be crossed (fords or wider bridges could come later).
315. World version 6 holds the map variant, clay on old maps, health and crime risk on homes, illness, and the new tallies. — Cost if wrong: none.
316. Debt is fixed by teaching and warning first: upkeep and the monthly balance on cards and the bar, a forecast on the gold chip, a one-time warning tip, and a "Gold" picture card. A softer first year only if Josh asks. — Cost if wrong: players who never read still fall into debt (the floor at -500 stays).
317. Raids grow 10% a year up to 1.5×, cap at 18 raiders, come from two sides 35% of the time from the 4th raid, and also strike granaries and homes. — Cost if wrong: late raids hit hard; towers and walls are the levers.
318. Disease builds in homes without water, crowded or in poor surroundings; a physician covers it; illness costs residents gradually and spreads unless covered. — Cost if wrong: one more building type to place in every district.
319. Crime builds in poor homes when mood is low and jobs are short; a police post covers it; thefts skim gold or goods. — Cost if wrong: tuning; it mostly punishes unhappy cities.
320. Disease and crime follow the fire pattern (risk, cover, alerts, overlay, mood rows, goals) and are off on Peaceful. — Cost if wrong: Peaceful players never meet them.
321. No score change in Stage 4.5. — Cost if wrong: Safety ignores disease and crime until a later score version.
