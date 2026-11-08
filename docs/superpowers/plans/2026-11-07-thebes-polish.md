# Thebes 9.1 "First hours": the polish release (plan)

Drafted 7 Nov 2026, after 9.0 went live (main 1d937a4 "Version 9.0 Dynasty", `APP_VERSION` '9.0'). The working name assumes the design's Q1 (before the decree, as 9.1, the decree moving to 9.2); if Josh answers otherwise the controller renames the branch, the test folder and the rulings files, and nothing else changes. One release with five parts:
- **First hours:** the lesson, the hand-over and the first unguided hour.
- **Never stuck:** the error handler and its card, the loading screen, debt's way back.
- **Runs well:** the throttled profile, module preload, the caches by bytes.
- **Clear and trusted:** the About section. (Colour-blind safety dropped by Josh, 8 Nov 2026.)
- **The heirs:** adaptive scripted cities, then a data retune.

**Design (authority, read it first):** `docs/superpowers/specs/2026-11-07-thebes-polish-design.md`, with Josh's answers recorded at its top once he gives them. Also read:
- the 9.0 follow-ups `notes/2026-11-07-version-9-0-followups.md` (ruling 1640 and the two words left);
- this plan;
- the rulings in `notes/handoff-2026-10-11/rulings-so-far.md`. Append this release as **Part 28** (9.0 is Part 27, ending at 1641).

**Out of scope:** everything in the decree (now 9.2): the weekly seed, the decrees, the second save slot.
- No new building kinds, goods, effects or art style; no score formula or score-version change.
- No sim rule or number changes, except the lesson's own staging and layout (design 2a-2c) and the heirs' `TRAITS` data (design 7).
- No bundler and no build step (Q2); no server, no analytics, no sending of error reports (Q10).

## What Josh asked for

1. **Broad polish** after 9.0, from a review of the whole game.
2. **Fewer refunds in the first window** (about 2 hours of play within 14 days): the first screen, the lesson, the first hour, the first setbacks, how it runs, and whether a new player knows what to do and wants to keep going.
3. **Clean and simple on mobile and desktop** (his standing requirement), graded in the final review.

## Process (multi-agent; Josh runs the controller on Opus 5.5)

- **Branch and worktrees:** branch `version-9-1`, cut from main at 1d937a4. Tracks run in sibling worktrees `C:\dev\thebes-v91-<track>`, cut from the branch after wave 0. The controller merges them back.
- **Models:**
  - Opus for Track F (first hours: the lesson's rules are the most delicate code in the game), Track P (performance and memory), Track H (heirs and adaptive scripts), any merge that is not trivial, the balance check and the final review.
  - Sonnet for Track R (never stuck), Track A (clear and trusted), every reviewer, the fix wave, the re-review and the docs.
  - Opus is the escalation if a Sonnet fix round fails twice. No Fable.
- **Per track:** the implementer, then a Sonnet reviewer with the diff, the track section, the rules and the UX rules. At most two fix rounds. A reviewer's minor findings go into the track's next commit.
- **The controller** reads reports, not diffs. It keeps a ledger at `.superpowers/sdd/2026-11-07-thebes-version-9-1/progress.md` and looks at two or three screenshots per track. The agents' shared rules are the controller's scratch `rules91.md` (9.0's `rules90.md` with the names, paths and ranges below); every brief points at it, and reports stay under 300 words.
- **Five tracks share one machine.** The full suite runs one at a time through the wrapper, and H's long runs are the heaviest: H starts first, and the controller staggers the others' full runs.

### Waves

| Wave | Work | Depends on |
|---|---|---|
| 0 | The controller, no agent: the shared pieces below. One commit. | main |
| 1 | F: first hours (Opus) · R: never stuck (Sonnet) · P: runs well (Opus) · A: clear and trusted (Sonnet) · H: heirs (Opus), in parallel | wave 0 |
| 2 | Merge F → R → A → P → H. Balance and targets check (Opus) → the new-player walk, the final review (Opus) → fix wave (Sonnet) → re-review (Sonnet) → docs, merge to main, suite on main | wave 1 |

### Wave 0 (the controller, on `version-9-1`; rulings 1650-1654)

Only what two tracks would otherwise fight over. No behaviour changes: the full suite passes as on 9.0.

1. **Tests:** the aggregators `tests/v91/all.js` and `tests/v91/{w0,f,r,p,a,h,balance,docs}/all.js`, each imported once; `tests/all.js` imports `./v91/all.js` after `./v90/all.js`; the ledger.
2. **`index.html`'s three marked blocks,** empty: `<!-- v91 loading -->` (R: the loading screen and its inline CSS, before the first stylesheet), `<!-- v91 early-error -->` (R: the inline classic script), `<!-- v91 preload -->` (P: the generated module preload). Each track writes only inside its block.
3. **The seams** (each a stub with today's behaviour):
   - `src/render/loop.js` `createGameLoop({ ..., onError = null })`: when given, a throw in a day's tick calls `onError({ where: 'tick', error })` and a throw in the render `onError({ where: 'render', error })`; with none, today's behaviour (R fills the caller);
   - `src/ui/v91/rescue.js` with `installRescue(ctx)` (no-op) called once by `boot.js` before the title (R fills it);
   - `createUI`'s `autosave` gains a `blocked()` check that returns false (R sets it for a tainted city);
   - `window.__thebes.caches()` returning `{ terrainBytes: 0, spriteBytes: 0 }` (P fills it);
   - `src/sim/progression.js` `isUnlocked` reads an optional `world.lessonCards` (absent: today's behaviour; F fills the hand-over that writes it).
4. **`src/ui/text.js`:** five empty sections appended in merge order, headed `// Version 9.1, Track F`, `R`, `A`, `P`, `H`. Each track writes only under its own header.
5. **`rules91.md`** in the controller's scratch, and the baseline: the 9.0 suite's frame and balance figures copied into the ledger as "before".

### File ownership (who may edit what)

| Files | Owner |
|---|---|
| **The lesson:** `src/sim/lesson.js`, `src/data/lesson.js`, `src/ui/lesson.js`, `src/ui/lessonCard.js`, `src/ui/v60/lesson.js`, `src/ui/v81/lessonLock.js` (no track owned them in 9.0; F owns them here). **The hand-over:** `boot.js` `adoptLesson` and `sayHandOver`; the first month's row rule (the tips' hold and the banner's one row, in their own modules' functions). **The road start:** the end-of-road marker's draw call, so it also draws in the lesson. **The first own city:** `src/ui/titleCard.js` (the new-city card's default layout, the chapter card's story, "I've played before"). **The tray:** `src/ui/tray.js` and the `record` option at `createUI.js` `createToasts`. **Words:** the Housing plot bar's line, the "Good plots" row's hold. **Title at 1920:** the title backdrop's framing | F |
| **Errors:** `src/ui/v91/rescue.js`, the `onError` caller in `boot.js`, the `blocked()` flag, `index.html`'s loading and early-error blocks and their CSS (`css/v91.css`, new, linked in wave 0). **Debt:** `src/ui/v91/debtSheet.js` (new), the debt alert's fix line and Show me (`text.js` under R, the alert's tap) | R |
| **The profile:** `tools/profile.ps1` (new), `tests/v91/p/*`. **The caches:** `src/render/terrainBaker.js` (the byte budget), `src/render/spriteCache.js` (bucket eviction), `src/render/renderer.js` (the baker's setup line and the counter only). **Preload:** `tools/sw-files.ps1` (writing the preload block) and `index.html`'s preload block | P |
| **About:** the Options sheet's About section (`src/ui/menu.js`, that section only), the no-other-origin `fetch` test | A |
| **Heirs:** the scripted players' habits (`tests/stage4/balance/capitalRun.js`, `tests/v50/grand/grandRun.js`, `tests/v60/balance/dangerRuns.js`: new heir-aware habits only, the Steady's path untouched); `src/data/dynasty.js` `TRAITS`; `src/sim/court.js` `outputPerMonth` (the heir); the Nilometer's `rvPrepRule` words; `tests/v90/balance/*` and `tests/v91/h/*` | H |
| `src/ui/text.js` | each track only under its own wave-0 header; an older line is changed by reassigning it from the track's own section |
| `src/data/tips.js`, How to play | each track adds its own entries only |
| `src/sim/world.js`, `src/save/*`, `src/render/loop.js`, `index.html` outside the blocks | wave 0 only; a track that needs more asks the controller |
| The balance runs' pins outside H's (`tests/stage4/balance`, `tests/stage47`, `tests/v60`, `tests/v70`, `tests/v50/grand`, `tests/v84/balance`), the lesson's day pins (9.0's T7) and every frame-budget bound | wave 2's balance check. A track only reports what it moved, marked `// WAVE2-PIN 9.1 Track <X> (ruling N): was <old>` |
| `src/data/releases.js`, `APP_VERSION`, README, rulings Part 28 | the docs step at the end only |

**Where two tracks share a file,** they edit different functions: `boot.js` (F `adoptLesson`, R the `onError` caller and `installRescue`), `createUI.js` (F the `record` option, R `blocked()`), `index.html` (R two blocks, P one). On a merge conflict, keep both sides. Merge order F → R → A → P → H, then regenerate `sw-files.js` (and with it P's preload block).

## Rules for every track

- **Commit identity:**
  - `git config --local user.email` prints `181878008+joshuahedge@users.noreply.github.com`, in the branch and in every worktree.
  - Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Never write Josh's employer's name anywhere, including in briefs. The controller's guard script must print GUARD OK before every commit.
  - Josh's friend is "a friend". A rival's example name is a made-up one ("Ana").
- **sw-files.js:** after editing `src/`, `css/`, `index.html` or `assets/`, regenerate it in the **PowerShell tool** as `Set-Location <worktree>; & ./tools/sw-files.ps1`. Rerun it after the last edit and in the commit that ends a track. Never hand-edit it; on a conflict, take either side and regenerate.
- **Long commands:** every grep batch, full suite, profile and screenshot runs with `run_in_background` and waits for the notification. A silent foreground command over 600 s kills the agent's stream.
- **Tests:**
  - **The full suite:** before every commit, through the controller's scratch suite wrapper (one at a time on the machine). It must end ALL PASSED.
  - **Iterating:** `-Grep "v91 <track>"`.
  - **No reruns in a loop:** a test that fails in the full run but passes alone is reported. The frame-budget timing tests and "stage 2 placement preview" are the usual ones (ruling 1445).
  - **Balance pins:** a track whose change moves a pin it does not own marks it WAVE2-PIN with the old value and reports it; never retune the game to hold a pin.
  - **Frame bounds:** never loosened by a track; P reports.
  - **New tests** go in `tests/v91/<track>/`, describe names starting `v91 <track>`. Never delete an older test; update it and say which.
- **The profile is a measure, not a test:** `tools/profile.ps1` runs outside the suite (it throttles Edge for minutes); its printed figures go in the report and the ledger. The suite gets only the in-page counters' bounds (P3's caches) and the lesson's waits (P5).
- **Git hygiene:** stage files by path; never stage `.superpowers/`; never push; never run `python -` with a heredoc; never write source files through a shell heredoc, echo or sed.
- **Never block on an unbounded wait.** Every screenshot, profile, server check and wait loop runs under `timeout` (shots 150 s, a profile run 600 s). Stop any server or Edge you start.
- **Words match the sim.** Every number on screen comes from the sim's own function or data, with a test that sets the world up both ways (the debt sheet with and without a palace and a trading post; the court and Nilometer words with the Steady and a heir; the lesson's countdown with the staged arrival).
- **The sim stays deterministic:** no `Math.random`, `Date` or `performance.now` in `src/sim`. The error handler lives in the interface; the sim never catches its own errors.
- **Old saves load:** an 8.4 (v11) and a 9.0 (v12) save load and play a year as before; a city without `lessonCards` behaves as today; an adopted lesson city from 9.0 (Market town at under 250 people) loads unchanged (no retro-fix).
- **The lesson:** every change is checked against the lesson (design section 2). Nothing may leave a step waiting with no way on (ruling 1453); no effect, card or row hides a pointer; the lesson city is always the Steady.
- **Ruling numbers** come from each track's range. Each track writes its rulings to `docs/superpowers/notes/2026-11-07-version-9-1-rulings-<track>.md`, one line each with its cost if wrong.

### UX rules (every UI change; reviewers check each)

- **Layout:** one panel at a time; nothing floats over the middle of the map. The error card is a sheet at the screen's edge (bottom on a phone, side on a wide screen); the loading screen is the only full-screen surface, and only before the title.
- **Sizes:** `tests/ui/mobileBudget.test.js` passes at 375x667 and 390x844, at 100/125/150% text. The debt sheet and About scroll in their sheet.
- **Controls:** 44x44 tap targets with accessible names; a keyboard path on desktop (Tab, Enter or Space, Esc closes, except the error card, whose Esc does nothing until a choice is made).
- **Not colour alone:** every new state carries a word, a number or a shape.
- **Reasons and consequences:** every choice states its consequence before the tap:
  - the error card: "Reload from the save: back to the start of this month" and what Export gives;
  - the debt sheet's Pause: the gold a month it saves and what stops working;
  - the lesson's 2x raid step: "The game runs at double speed until the raid is over".
  Every refusal says why, with what to do.
- **Noise:** what the player just did is never news; what needs a decision is never hidden (design section 4).
- **Motion:** no reduced motion (ruling 1601); no new effects. Nothing flashes fast or shakes the screen.
- **Screenshots:** every new or changed screen at 375x667, 390x844, 667x375, 1280x800 and 1920x1080 (and 1024x768 for the hand-over), at 100% and 150% text, before review and after the fix wave. Named `v91-<track>-<what>-<WxH>-t<text>.png` in `docs/superpowers/notes/screenshots/raw/v91/` (gitignored). The list:
  - **F:** each lesson step's ring with the new road marker; the month step's mood line; the raid step's 2x card; the hand-over (rank chip and rows); the first own city's card; the title at 1920x1080;
  - **R:** the loading screen and its slow line; the early error line; the error card (tainted and not); the debt sheet;
  - **A:** About;
  - **P:** none required (no UI), the profile's printed table instead.

## Tracks

### Track F: first hours (Opus; rulings 1655-1674)

- **The rank at the hand-over** (design 2a): `adoptLesson` sets the milestone to what `updateMilestone` gives for the people alone (from Village), clears the splits the staged raid wrote, sets `world.raid.clockDay = null` and `nextWarnDay` to none (as a real city before 250 people), and writes `world.lessonCards` with every type the lesson unlocked. Check the Town caption, the court (from Town) and the events (from Town) all arrive for real.
- **The firehouse** (2b): a new `LESSON_PLACES.firehouse` covering every lesson building (first candidate (17,40)); the step's `at`, the picture card's mark if any, and the words follow. A test: every lesson building within a staffed firehouse's reach at the hand-over; 18 idle months with no fire but the staged one.
- **The raid wait** (2c): once the staged warning exists, the lesson sets `warning.arrives = warning.day + LESSON_RAID_LEAD` (30) in `src/sim/lesson.js`, idempotent; the raid step's card plays at 2x and says so. Every word that quotes the arrival reads `warning.arrives`.
- **Mood and alerts** (2d): the month step's Ipi line on mood with the mood chip lit; the banner shows only the step's own alert in the lesson.
- **The road start** (2e): the end-of-road diamond drawn above the spotlight's dimming in the lesson, a dashed 9-tile ghost, and the words "Drag west from the end of the road (the diamond)".
- **The hand-over's first month** (2f): no tip while an alert and a goal are both up; one alert row with "+N".
- **The first own city** (3a): classic river at Normal size when the device has no city rows yet (the records store), Surprise me after.
- **Messages** (3b): a toast that echoes the player's own action is shown but not recorded; goal lines are recorded read during the lesson.
- **Small fixes** (2g): the story shown once; "I've played before" starts on one tap; the plot bar's line; the "Good plots" row held under a lesson card; the title at 1920x1080.
- **Tests:**
  - the hand-over: rank, splits, clock, `lessonCards`, Town at 150 with its caption, save and reload;
  - the lesson's waits (P5), every step reached with the 9.0 rules (the lesson's day pins move: WAVE2-PIN, wave 2 re-pins);
  - the banner's rows at every step; the ring and the diamond visible at the road step (375x667 screenshot test);
  - the first city's defaults with empty and non-empty records;
  - the tray: placed, laid, demolished and undone toasts not counted; arrivals, ranks, events and pinned alerts counted (P7's scripted 10 minutes).

### Track R: never stuck (Sonnet; rulings 1675-1684)

- **The loading screen** (design 5a.1): inside `index.html`'s loading block, inline CSS (the parchment colour, the name, a quiet line), removed by `boot.js` when the title shows; after 15 s "Still loading. Slow connection?" with Reload; a `nomodule` line.
- **The early error line** (5a.2): a small inline classic script in the early-error block that catches a module's load failure before `main.js` runs and puts the message and Reload on the loading screen.
- **The handler** (5b): `installRescue` adds the `error` and `unhandledrejection` listeners; `boot.js` passes `onError` to the loop. A tick throw: stop the loop, pause, set tainted (`blocked()` true), show the card with Reload from the save, Export this city and Copy the details. A render throw: count, and at three in a row stop and show the card (not tainted: save first). A UI throw: one toast, game goes on. One card a session.
- **The dev hook:** `?crash=tick` (and `render`, `ui`) throws once, for tests and Josh's real-phone check.
- **Debt's way back** (3c): `src/ui/v91/debtSheet.js` from the debt alert: this month's income and costs from `monthFigures`, the three biggest costs with Pause, the months to clear at this rate, what -500 stops, and the levers the city has, each with Show me; nothing the sim would refuse.
- **Tests:**
  - each throw kind: paused, the card, autosave blocked or done, the slot loads, nothing repeats per frame, one card a session (P10);
  - the loading screen present in `index.html`, gone once the title shows; the slow line after 15 s (a fake clock);
  - the debt sheet's numbers against `monthFigures`, set up with and without a palace and a trading post; Pause's saving equals the sim's.

### Track P: runs well (Opus; rulings 1685-1699)

P first measures **before** on 9.0 with the new profile, then changes, then measures after.
- **`tools/profile.ps1`:** the screenshot script's DevTools pattern, with `Network.emulateNetworkConditions` and `Emulation.setCPUThrottlingRate`, `-Load`, `-Frames [-Size huge]` and `-Session` modes, a hard `-MaxSeconds`, and a printed table. The page's `ready` mark is set when the title shows (one line in R's removal of the loading screen, agreed through the controller).
- **Module preload** (5a.3): `tools/sw-files.ps1` also writes the preload block (every module `main.js` imports, directly or not, in import order). P measures P1 with and without it and keeps it only if it helps.
- **The caches** (5c): the terrain baker evicts by a canvas-pixel budget (first value 48 MB at DPR 2; the count of 32 stays as an upper bound); the sprite cache drops buckets unused for a while, never the one in view; `window.__thebes.caches()` reports both. The stress and budget tests must hold (no extra bakes in view).
- **The session** (P3): `-Session` fast-forwards a Large map city for 2 hours of play at the speeds the profile assumes (40% 1x, 40% 2x, 20% 3x), panning the whole map at every zoom bucket each game year, and samples the heap and the caches.
- **Frames** (P2, P4): the stress city and a Huge map at 390x844, DPR 2, CPU 4x and 6x.
- **Tests:** the caches' byte bounds after a scripted pan over a Large map at every bucket (in the suite); a re-bake in view never evicts a visible chunk; the preload block lists only files that exist (the sw-files test pattern).
- **The report:** the profile's table, before and after, against P1 to P4, and each miss's biggest cost.

### Track A: clear and trusted (Sonnet; rulings 1700-1709)

- **No colour-blind work** (Josh, 8 Nov 2026): no colour test, patterns or hue changes. Track A is About only.
- **About** (6b): Options' new About section: version and build, who made it (Q8: the controller supplies Josh's words before the commit; until then a placeholder the docs step fills), the licence, "Art, music and sounds are made by the game itself", and the privacy line. A test fails on a `fetch` or `XMLHttpRequest` to another origin anywhere in `src/`.
- **Tests:** About's lines and its keyboard path; the network test.

### Track H: the heirs (Opus; rulings 1710-1724)

- **Adaptive habits** (design 7.1): each scripted run takes the heir and adds the habits for its weakness, reading the sheets a player reads (ruling 1540): the Builder back to Normal tax sooner when gold runs low; the Unconquered's towers by the earlier first warning; the Bountiful's granaries fuller before a low flood; the Merchant's farms and trade over workshops; the Generous's tax choice under the lower High. With the Steady each run does exactly what it does on 9.0 (a test compares the Steady's year-6 city to the last number).
- **Then the data** (7.2): only where an adaptive run still misses T1-T3, a `TRAITS` number, each with a ruling giving both values; no rule changes. Ruling 1626's `sooner` 100 → 15 is the first candidate for T3.
- **The two words** (7.3): `court.js` `outputPerMonth` reads the heir through `heirFactor` (and the flood, as the production line does); the Nilometer's `rvPrepRule` reads the city's own number. Each with a test both ways.
- **Tests:** in the suite, T1 for the Builder and T3 for the Unconquered with the adaptive habits (`tests/v90/balance/runs.test.js`'s pins re-set with WAVE2-PIN); the others as a reported probe (ruling 1620).
- **The report:** 9.0's heir table (Steady, B, U, F, M, G) with the adaptive scripts, before and after any data change.

### Wave 2: balance, the walk, review, docs (rulings 1725-1739)

- **Balance and targets check (Opus):**
  1. Every WAVE2-PIN (`git grep WAVE2-PIN`), each re-pinned with a ruling giving both numbers, or the change sent back.
  2. The lesson's day pins (9.0's T7) moved by F's layout and wait: re-pinned, the steps still all reached.
  3. Every 9.0 frame bound (T8-T11) after the merge, on a quiet machine.
  4. P1-P11 measured on the merged branch, in one table against the design's targets, each miss with its size and the one change that would meet it.
- **The new-player walk (Opus):** review A's walk again on the merged branch (the title, the lesson, the hand-over, 18 months unguided, a first own city), at the five sizes and 1024x768, with screenshots; then the final review of the whole branch with the UX rules. Then one Sonnet fix wave split by file ownership, and a Sonnet re-review.
- **Docs:**
  - README;
  - the follow-ups note `notes/2026-11-07-version-9-1-followups.md`, with Josh's real-phone checklist from the design's section 10, the profile's figures, and what was cut;
  - rulings Part 28;
  - a What's new entry for **9.1 "First hours"**, with 9.0's build set to its last commit on main before the merge, and the pinned release tests moved down one;
  - `APP_VERSION` set to 9.1;
  - the v9 roadmap's section 6 table gains this release and moves the decree to 9.2.
- **Merge** to main locally, rerun `tools/sw-files.ps1`, and run the full suite on main. Ask Josh before pushing.

## Rulings (proposed; append as Part 28)

1650. This release sits before the decree as 9.1 "First hours"; the decree becomes 9.2. — Cost if wrong: renames only.
1651. Wave 0 adds the seams (`onError` on the loop, `installRescue`, `autosave`'s `blocked()`, `window.__thebes.caches()`, `isUnlocked`'s `lessonCards`, the three `index.html` blocks, the five text.js headers). — Cost if wrong: none.
1652. `world.lessonCards` is optional (absent: none), so there is no world-version bump. — Cost if wrong: one migration later if it becomes required.
1653. The profile (`tools/profile.ps1`) measures outside the suite; only in-page counters and the lesson's waits are suite tests. — Cost if wrong: a throttled regression is seen only when the profile is run.
1654. A 9.0 lesson city already adopted at Market town is loaded unchanged. — Cost if wrong: a few players keep the old hand-over's rank.
1655. At the hand-over the rank returns to what the people earned, the staged splits are cleared, the raid clock stops until 250 people, and the lesson's cards stay unlocked. — Cost if wrong: a player who expected to keep Market town sees Village.
1656. The lesson's firehouse moves so its reach covers every building the lesson asks for. — Cost if wrong: the lesson's day pins move once.
1657. The lesson's staged warning arrives 30 days on, and the raid step plays at 2x, said on its card. — Cost if wrong: the lesson's raid feels quick.
1658. In the lesson the banner shows only the step's own alert. — Cost if wrong: a real problem in the lesson city waits for the hand-over.
1659. A toast that echoes the player's own action is shown but not kept in Messages. — Cost if wrong: a player looking for "Road laid" in Messages finds nothing.
1660. A device's first own city defaults to the classic river at Normal size; Surprise me from the second. — Cost if wrong: a first city is plainer than it could be.
1675. A throw in a day's tick taints the city: the game pauses, autosave is blocked for it, and the card offers Reload from the save, Export and Copy the details. — Cost if wrong: up to a game month lost after a crash.
1676. A throw in the render or the interface leaves the city sound: it saves, and only three render throws in a row stop the loop. — Cost if wrong: a render that throws now and then flickers instead of stopping.
1677. One error card a session; the details are copied, never sent. — Cost if wrong: Josh gets only the reports players paste.
1678. The loading screen lives in `index.html` with inline CSS, says so after 15 s, and the early error line catches a module that fails to load. — Cost if wrong: a few lines of inline CSS to keep in step with the palette.
1679. The debt sheet is built only from `monthFigures` and suggests only what the sim allows. — Cost if wrong: none to the sim.
1685. No bundler: the module preload block is generated by `tools/sw-files.ps1` and kept only if P1 improves. — Cost if wrong: a slow first load stays slow until a bundle is chosen.
1686. The caches budget by bytes: terrain chunks by a canvas-pixel budget (first value 48 MB at DPR 2), sprite buckets dropped when unused, never in view. — Cost if wrong: more re-bakes when a player zooms back and forth.
1700. No colour-blind work in this release (Josh, 8 Nov 2026): no colour test, patterns or hue changes. — Cost if wrong: about 4% of players still read the ground and fire layers by colour alone.
1701. About says who made it, the licence, that the art and sound are the game's own, and that nothing is sent anywhere, with a test that no other origin is fetched. — Cost if wrong: none.
1710. The scripted players learn a habit per heir's weakness, reading the sheets a player reads; the Steady's runs are unchanged. — Cost if wrong: the scripts play heirs better than a new player does.
1711. The heirs are retuned by `TRAITS` data only, where an adaptive run still misses T1-T3. — Cost if wrong: a trait felt less than designed.
1712. The court's yearly due and the Nilometer's line read the heir. — Cost if wrong: none; the words match the sim.
1725. The balance check owns every WAVE2-PIN and the lesson's day pins. — Cost if wrong: none.
