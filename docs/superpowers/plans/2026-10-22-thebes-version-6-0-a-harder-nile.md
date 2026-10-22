# Thebes Version 6.0: a harder Nile (plan)

Agreed with Josh on 22 Oct 2026, after Version 5.0 went live (main 3d05e41, 2,958 tests, world version 8, build 5e85273e2708). One big release. It answers players' feedback: the later game is too easy (money never runs out), raids are too simple, reaching a manor is confusing, and the first hour must be as good as possible before a paid store release.

**Out of scope for 6.0 (Josh, 22 Oct):** the Steam and Google Play builds and store listings. They come later, built from 6.0: Steam (Windows first) as a bundled Electron app, Google Play as a bundled Capacitor app, a paid one-off price, and the web version stays free. 6.0 should not block that: keep store-only switches out, but make nothing depend on the web (no feature that needs the network after load). Also not in 6.0: trade routes, seasons and light, unrest, taking people in raids, a reign length goal.

Authority: the spec `docs/superpowers/specs/2026-10-09-thebes-design.md`, this plan, and the rulings (610 on) appended to `docs/superpowers/notes/handoff-2026-10-11/rulings-so-far.md` as "Part 16: Version 6.0". Background: `notes/2026-10-15-version-5-0-followups.md`, the 5.0 contract `notes/2026-10-15-version-5-0-contract.md`.

## What Josh asked for (22 Oct)

1. **A harder later game:** costs grow with the city; court demands with deadlines; ranks beyond Capital ending in a final great work that wins the reign (then play on).
2. **Bigger dangers:** raids that burn and wreck buildings and loot stores, with big battles you can see; plague; drought and low Nile; locusts and blight. Not chosen: unrest, raiders taking people.
3. **Clear housing:** a Large plot (2x2) card; small plots stop at Townhouse.
4. **New players and polish:** a mandatory guided first city plus improved picture cards; a tidier title screen; a Huge map size; no "This week's Nile"; sound on by default (no "Play with sound"); a release polish pass including desktop keyboard controls.
5. **5.0 loose ends** (from the 5.0 follow-ups note).

## Process (multi-agent; Josh runs the controller on Opus 5.5)

- Branch `version-6-0` from main. Track work runs in sibling worktrees `C:\dev\thebes-v60-<track>` cut from the branch after Track 0, merged back by the controller between waves. At most three tracks at once.
- **Models:** Fable for Track 0 (contract), Track A (economy and the final great work: balance-heavy), the integration of each wave when a merge is not trivial, and the final whole-branch review. Sonnet for every other implementer, every per-task reviewer, the balance pass, the fix wave and the re-review. Opus only where a Sonnet fix round fails twice.
- Per track: implementer, then a Sonnet reviewer with the diff, the track section, the rules and the UX rules; at most two fix rounds. Fold a reviewer's minor findings into the track's next commit.
- The controller reads reports, not diffs; keeps a ledger at `.superpowers/sdd/2026-10-22-thebes-version-6-0/progress.md`; rules on what is left; looks at two or three screenshots per visual track.

### Waves

| Wave | Tracks (parallel) | Depends on |
|---|---|---|
| 0 | Track 0: contract (Fable) | main |
| 1 | A: harder later game (Fable) · B1: danger sim (Sonnet) · C: housing and loose ends (Sonnet) | Track 0 |
| 2 | B2: battles you can see (Sonnet) · D1: title, Huge map, desktop keys, polish (Sonnet) | wave 1 merged |
| 3 | D2: guided first city and picture cards (Sonnet) | wave 2 merged (it teaches the finished game) |
| 4 | Balance (Sonnet) → final review (Fable) → fix wave (Sonnet) → re-review (Sonnet) → docs, merge, suite on main | wave 3 merged |

## Rules for every track

- Commit identity: `git config --local user.email` must print `181878008+joshuahedge@users.noreply.github.com`. Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never write Josh's employer's name anywhere; the controller's guard script must print GUARD OK before every commit.
- After editing `src/`, `css/`, `index.html` or `assets/`, run `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`; rerun it after the last edit. Never hand-edit `sw-files.js`; on a merge conflict in it, regenerate it.
- Before every commit: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 600` prints ALL PASSED (about 6 minutes). **Only one full suite runs on the machine at a time** (the controller hands out a suite slot; with three tracks, iterate with `-Grep "v60 <track>"` and queue full suites). Timing tests can flake under load: rerun once.
- New tests go in `tests/v60/<track>/`, each track with its own aggregator `tests/v60/<track>/all.js` imported once from `tests/v60/all.js` (Track 0 creates all of them, so merges never collide). Describe names start with `v60 <track>`.
- Stage files by path; never stage `.superpowers/`. Never push. Never run `python -` or `python3 -` with a heredoc. Never write source files through a shell heredoc or echo (it strips `${...}` from JS template literals): use the edit tools.
- **Never block on an unbounded wait.** Every screenshot, server check and wait loop runs under `timeout` (shots 150 s). Stop any server or Edge you start.
- Words must match the sim: every number, rule or consequence on screen comes from the sim's own function or data, with a test that sets the world up both ways. Advice never recommends something the sim would refuse.
- The sim stays deterministic: no `Math.random`, `Date` or `performance.now` in `src/sim`; dangers draw from the world's seeded rng.
- Motion: Gentle (reduced motion) is what headless Edge and Josh's devices show; every visual must read under Gentle, tests of Full force it, Still shows no new movement.
- Old saves load: world version 9 with `MIGRATIONS[8]` (Track 0); a v8 city keeps its merged homes, its rank and its treasury, and new dangers wait three game years from the load. Classic at Normal draws as today until a new system acts.
- Ruling numbers are given per track so two tracks never take the same number.

### UX rules (every UI change; reviewers check each)

The nine UX rules apply unchanged: one panel at a time and nothing floating over the middle of the map; `tests/ui/mobileBudget.test.js` at 375x667 and 390x844, 100/125/150% text; 44x44 tap targets with accessible names; colour never the only cue; progressive disclosure (each new thing unlocks at a stated milestone with one first or tip and words in How to play); every refusal says why with Show me; every choice states its exact consequence before the tap; deadlines in game months; no dark patterns. Add: the top bar still fits at 375 px and 150% text; desktop screens are checked at 1920x1080 as well; every danger shows its warning, its counter and its Advice item before it strikes.

## Tracks

### Track 0: contract (Fable; rulings 620-639)

- World version 9 and `MIGRATIONS[8]`: the new fields every track needs (rank beyond Capital and the great work's state; demands; plague, drought, blight and rubble state; large plots; the danger grace from load), each defaulted for v8 saves, with tests.
- The seams each track builds on, as named functions with stubs and tests: `costScale(world)` (A), `courtDemands` (A), `dangerDraws(world)` with the three-year grace and difficulty factors (B1), the raid strike hooks for burn, wreck and loot (B1, drawn by B2), `isLargePlot`/large-plot placement rules (C), the lesson state in settings (D2), the map size table (D1).
- `tests/v60/all.js` and one aggregator per track; dev scenes `v60-demand`, `v60-greatwork`, `v60-plague`, `v60-drought`, `v60-locusts`, `v60-raid-burn`, `v60-battle`, `v60-largeplot`, `v60-title`, `v60-huge`, `v60-lesson`.
- A contract note `notes/2026-10-22-version-6-0-contract.md`: the API shapes, which files each track owns, the shared files and who edits them (data tables, `tips.js`, How to play, `releases.js` only at the end), and the merge order.
- Full suite; one commit.

### Track A: a harder later game (Fable; rulings 640-679)

- **Costs grow with the city:** wages and building upkeep rise with each rank above Town; monuments and the court cost more as the city grows (data in `src/data/economy.js`, through `costScale`). Easier difficulties keep their lower cost multiplier.
- **Court demands with deadlines:** from Town, about once a game year: goods ("400 linen within 12 months"), gold, a building, or soldiers. Each states its reward and its failure cost before it is accepted; met raises favour and pays; failed lowers favour, and low favour raises the yearly tribute and the raids. Through the existing court sheet and favour meter; in Advice while open.
- **Beyond Capital:** two ranks, Great Capital and Seat of the Two Lands, with their needs; then the final great work, a temple built in stages over several years with stone, goods and crews (reuse the monument machinery). Finishing it wins the reign: a closing scene (in a sheet, not over the map), a sealed score, then play on.
- **Balance targets:** the late run (year 15) ends with at most about two years of profit banked (today 166,748 gold); a careless run (the existing late script with its defence and stock policies switched off) falls into debt; the 10-year village stays in 68-75%; the capital run keeps its assertions; a great-work run on Normal finishes the great work by about year 18-20. Record every changed number with its reason.

### Track B1: danger sim (Sonnet; rulings 680-699)

- **Raids:** bands grow larger late, led by a chieftain; raiders who get through set buildings alight (the fire rules spread it), wreck some to rubble (clear and rebuild), and loot goods and food from storehouses and granaries. The raid report lists burned, wrecked and taken.
- **Plague:** starts in a crowded, poorly served home; spreads to neighbouring homes day by day; physicians, wells and space slow it; quarantine a district for a fee to stop it there; unchecked homes lose residents and work stops. Shown on the Health layer.
- **Drought and low Nile:** the Nile reading warns months ahead of a low flood; farms yield about half that year; full granaries carry the city.
- **Locusts and blight:** a warning a month ahead names a band of farms; a farm's sheet has "Harvest now" (part of the crop early).
- Every danger: warning time, its counter, an Advice item, a first or tip, How to play words; none in the first three game years; Relaxed milder and rarer; Peaceful keeps raids off.

### Track C: housing and loose ends (Sonnet; rulings 700-719)

- **Large plot:** a 2x2 housing card, unlocked when the city first has Townhouses. An empty marked lot whose sheet shows the Manor checklist ("Opens when: ...") until the needs are met nearby; then people move in as a Manor and it climbs to Estate in place. Small plots stop at Townhouse; homes merged under the old rule keep working. Home progress and the house sheet explain it; Advice and the next step name a Large plot where a grand home is the remedy. Rerun the grand district run with large plots.
- **5.0 loose ends:** Advice names the Estate trick (ruling 586); the Route preview draws bridge tiles differently; locked layers show greyed with the rank that unlocks them; pausing stops rebuilding the chunk index and roadless plots; farm-area leftovers are marked.

### Track B2: battles you can see (Sonnet; rulings 720-739)

- Soldiers and raiders clash with visible fighting; arrows arc from towers; fire and smoke rise from struck buildings; the chieftain's banner moves with the band; rubble and burnt-out shells read clearly. A victory or defeat moment in the alert row, never over the middle of the map.
- Gentle: everything reads with short, calm motion; Still: poses and smoke columns hold without movement. Draw cost within the existing budgets on Large and Huge.

### Track D1: title, Huge map, desktop keys, polish (Sonnet; rulings 740-759)

- **Title screen:** Continue, New city (difficulty and map size under it), Lesson, Settings, What's new. "This week's Nile" (the weekly seed) and "Play with sound / Play muted" go; sound is on by default with mute in Settings (audio starts on the first tap, as browsers require).
- **Huge map, 112 tiles:** a new size after Large; phones show "best on a tablet or computer"; zoom 0.5 frame at most 1.25x Large; terrain and the start guarantees hold.
- **Desktop controls:** arrows or WASD pan, + and − zoom, Esc closes, number keys pick categories, right-click cancels; listed in How to play.
- **Polish pass:** every screen at 390x844, 1280x800 and 1920x1080: spacing, clipped text, tap targets, consistent headings. Record what changed.

### Track D2: guided first city and picture cards (Sonnet; rulings 760-779)

- **Guided first city:** on a device with no completed lesson and no saved city, the title offers only "Start the lesson". A small fixed map; 12-15 steps (road, homes, well, farm, bazaar, workers, a Large plot, a small staged fire, a raid warning with towers); each step lights its target, dims the rest, gives one instruction in the guidance row and advances when the sim sees it done; about 10-15 minutes; ends "Your first city stands" and opens New city. Replay from the menu. Settings key, not world.
- **Picture cards:** remade from the 6.0 game (`tools/tutorial.ps1`), new cards for large plots, demands and the new dangers, each shown at its first moment and all kept in How to play.

### Wave 4: balance, review, docs (rulings 780-799)

- **Balance (Sonnet):** every run's assertions (village, capital, late, careless, grand district with large plots, great work); each danger fires at least once in the late run and none before year 3; Advice's top item on each run is sensible (record them).
- **Final review (Fable)** of the whole branch with the UX rules, the screenshots and the ledger; wait for its helper sub-reviews; one Sonnet fix wave; a Sonnet re-review.
- README, follow-ups note `notes/2026-10-22-version-6-0-followups.md` (with Josh's real-phone checks and the store plan), rulings Part 16, a "Version 6.0" entry in `src/data/releases.js` (set 5.0's build to its merge commit, 2653e92), `APP_VERSION` to 6.0. Merge to main locally, rerun `tools/sw-files.ps1`, full suite on main. Ask Josh before pushing.

## Rulings (proposed; append as Part 16)

610. 6.0 is one release; the store builds are out of scope and nothing in 6.0 may need the network after load. — Cost if wrong: store work later finds a web-only dependency.
611. Costs grow with rank above Town, and the late run banks at most about two years of profit. — Cost if wrong: the late game feels stingy; the numbers are data.
612. Court demands come about once a year from Town, each stating reward and failure cost before acceptance. — Cost if wrong: one more thing to track.
613. Two ranks beyond Capital and a final great work that wins the reign, then play on. — Cost if wrong: a long last stretch.
614. Raiders burn, wreck and loot; they do not take people. — Cost if wrong: raids may still feel light in a rich city.
615. Plague, drought and low Nile, and locusts and blight arrive with warnings and counters, never in the first three game years, milder on Relaxed. — Cost if wrong: an early city never sees them.
616. Large plots replace merging for new grand homes; small plots stop at Townhouse; merged homes keep working. — Cost if wrong: players who liked merging lose it.
617. The lesson is mandatory once per device for a player with no saved city, replayable from the menu. — Cost if wrong: an experienced player on a new device sits through 10-15 minutes.
618. Sound is on by default; "This week's Nile" is removed; Huge (112) joins the map sizes. — Cost if wrong: a muted-by-habit player hears music on the first tap.
619. Fable for the contract, Track A, hard merges and the final review; Sonnet for the rest. — Cost if wrong: a Sonnet track needs a Fable fix round.
