# Thebes Version 9.0 "Dynasty" (plan)

Drafted 7 Nov 2026, after 8.4 went live (main 222cb61 "Version 8.4 Gold and war", `APP_VERSION` '8.4'). It is the third of v9's four releases. One release with three parts:
- **Dynasty:** Pass the throne, a title earned from the reign, the heir's trait.
- **The ruler list and rivals:** every ruler kept for good, its backup and the install ask, rivals via links, and the side by side.
- **Animations and visual effects:** Josh's ask during 8.4. The audit's ranked effects, within a frame budget.

**Design (authority, read it first):** `docs/superpowers/specs/2026-11-07-thebes-version-9-0-dynasty-design.md`, with Josh's answers recorded at its top once he gives them. Also read:
- the v9 roadmap `specs/2026-10-27-thebes-v9-roadmap-design.md`, sections 1, 4 and 5, for context only;
- this plan;
- the rulings in `notes/handoff-2026-10-11/rulings-so-far.md`. Append 9.0 as **Part 27** (8.4 is Part 26, ending at 1552).

**Out of scope:** everything in 9.1: the weekly decree, its seed, the second save slot, decree marks on the list (the ruler row only reserves `mark`).
- No new building kinds, no new trade partner, no new good.
- No score formula or score-version change. The trait never reaches the score.
- No city import (ruling 1146 stands for cities; Q8 brings back rulers only).
- No new art style; no particle systems, blur, glow or screen shake.

## What Josh asked for

1. **Dynasty** (roadmap section 4):
   - Pass the throne from City upward; it names what the ruler will be remembered as, then seals the score; a won reign can play on and pass later.
   - A title earned from how the reign was played, which the heir inherits as a trait: the whole legacy.
   - The ruler list: name, title, rank, years, score and map, and a replay of each map; kept for good; carried by the export; the install-to-home-screen ask.
   - Rivals via links: the ruler's name and trait on the link, rivals kept, compared at each rank and side by side at the end.
2. **Improve the animations and visual effects** (7 Nov, during 8.4): audit what moves and what it costs, then the effects that make the city feel most alive for the least cost, each with its phone frame cost, calm under reduced motion, in the art's look.
3. **Clean and simple on mobile and desktop** (his standing requirement), graded in the final review.

## Process (multi-agent; Josh runs the controller on Opus 5.5)

- **Branch and worktrees:** branch `version-9-0` (already cut from main at 8.4). Tracks run in sibling worktrees `C:\dev\thebes-v90-<track>`, cut from the branch after wave 0. The controller merges them back.
- **Models:**
  - Opus for Track D (dynasty), Track V (effects), any merge that is not trivial, the balance check and the final review.
  - Sonnet for Track L (the list and rivals), every reviewer, the fix wave, the re-review and the docs.
  - Opus is the escalation if a Sonnet fix round fails twice. No Fable.
- **Josh's split stands, with two small moves:**
  - **The records' new shape goes to wave 0,** not L: D's Pass writes a ruler row and reads the dynasty's heir, so both tracks need `rulers` and `dynasty` before L's UI exists.
  - **The side by side is L's component, drawn inside D's Pass sheet** through a wave-0 seam (`passSheetExtras`), so D never waits on L.
- **Per track:** the implementer, then a Sonnet reviewer with the diff, the track section, the rules and the UX rules. At most two fix rounds. A reviewer's minor findings go into the track's next commit.
- **The controller** reads reports, not diffs. It keeps a ledger at `.superpowers/sdd/2026-11-07-thebes-version-9-0/progress.md` and looks at two or three screenshots per track. The agents' shared rules are in the controller's scratch `rules90.md`; every brief points at it, and reports stay under 300 words.

### Waves

| Wave | Work | Depends on |
|---|---|---|
| 0 | The controller, no agent: the shared pieces below. One commit. | main |
| 1 | D: dynasty (Opus) · L: the list and rivals (Sonnet) · V: animations and effects (Opus), in parallel | wave 0 |
| 2 | Merge D → L → V. Balance check, traits and frames (Opus) → final review with the usability pass (Opus) → fix wave (Sonnet) → re-review (Sonnet) → docs, merge to main, suite on main | wave 1 |

### Wave 0 (the controller, on `version-9-0`; rulings 1560-1564)

Only what two tracks would otherwise fight over. No behaviour changes: the full suite passes as on 8.4.

1. **Tests:**
   - the aggregators `tests/v90/all.js` and `tests/v90/{w0,d,l,v,balance,docs}/all.js`, each imported once;
   - `tests/all.js` imports `./v90/all.js` after `./v84/all.js`;
   - the ledger.
2. **World version 12** (`src/sim/world.js` `WORLD_VERSION`, `src/save/migrate.js` `v11ToV12`, `src/save/serialize.js`):
   - a new leaf `src/data/v90.js` with `V90_TALLY = ['townMonths', 'fedMonths', 'tradeGold', 'billsPaid']` and `HEIRS = ['builder', 'unconquered', 'bountiful', 'merchant', 'generous', 'steady']`;
   - `world.heir` (`'steady'` in a new and a migrated city), in `REQUIRED` and validated against `HEIRS`;
   - `createWorld({ ..., heir = 'steady' })`; `boot.js` `freshWorld` passes `records.dynasty().heir`, and the lesson passes `'steady'` always;
   - a test loads an 8.4 (v11) fixture and plays a year with today's behaviour.
3. **The records' new shape** (`src/save/records.js`, `RECORDS_VERSION` 2), fully written and tested, called by nothing yet:
   - `rulers` (never capped), `rivals` (at most 50, never one on the map being played), `dynasty` (`{ name, heir }`), each normalised like the others;
   - `addRuler(world, seal, title, now)`, `rulers()`, `dynasty()`, `setDynasty(patch)`, `addRival(link, now)`, `rivalsFor(seed, difficulty, variant, size)`;
   - `mergeRecords` merges rulers by id and rivals by name and map;
   - a version 1 blob reads with the three empty.
4. **The seams** (each a stub with today's behaviour):
   - `src/sim/dynasty.js` with `heirFactor(world, lever) -> 1`, `titleOf(world) -> { id: 'steady', fit: 0 }` and `countDynastyMonth(world)` (no-op), called once at the month's end after `monthlyEconomy` (D fills all three);
   - `src/ui/v90/passSheet.js` with `passSheetExtras(body, world, ctx)` (no-op; L fills it with the side by side);
   - `src/ui/v90/rivalToast.js` with `onSplit(world, id, ctx)` (no-op), called by the interface once when a split's first day is recorded (L fills it);
   - the game menu's two rows, `hooks.passThrone` (from City, never in the lesson) and `hooks.rulers`, both absent until their hook exists (D and L add the hooks);
   - `src/render/v90/` with `effectsV90(ctx, view, world, opts) {}` called once in `renderFrame` after the effects pass (V fills it);
   - `css/v90.css` linked from `index.html` after the last stylesheet (V owns it).
5. **`src/ui/text.js`:** three empty sections appended in merge order, each headed `// Version 9.0, Track D`, `// Version 9.0, Track L`, `// Version 9.0, Track V`. Each track writes only under its own header. The menu rows' labels start there (`V90_D_TEXT.menuPass`, `V90_L_TEXT.menuRulers`).

### File ownership (who may edit what)

| Files | Owner |
|---|---|
| **The dynasty:** `src/data/dynasty.js` (`TITLES`, `TRAITS`, new); `src/sim/dynasty.js` after wave 0 (`titleOf`, `heirFactor`, `countDynastyMonth`, the `passThrone` command). **The levers, these functions only:** `src/sim/monuments.js` `baseDayUnits`; `src/sim/economy.js` `monthFigures`; `src/sim/costs.js` `soldiersPayOf`; `src/sim/raids.js` the line that sets the first `nextWarnDay`; `src/sim/production.js` the rate line and `harvestFactor` (with `harvestQuote`); `src/sim/flood.js` the low-flood cut, if the Bountiful's weakness lands there; `src/sim/trade.js` `tradePrices` (buys only); `src/sim/immigration.js` `monthlyArrivals`; `src/sim/palace.js` `taxRateOf`'s factor; `src/sim/feats.js` (exporting `fedNow` only). **The words that quote a lever:** the site sheet's days left, the farm and workshop rates, the Trade sheet's prices, the forecast, the palace's tax choices, the raid countdown, the arrivals line. **UI:** `src/ui/v90/passSheet.js` (the sheet, not `passSheetExtras`); the score sheet's "Remembered as" line and header in `src/ui/scoreUi.js` (`summary` side only); the heir's first-screen line; `boot.js` `hooks.passThrone`; the City caption; the `heir_trait` tip; How to play's Dynasty entry | D |
| **The list:** `src/save/records.js` after wave 0 (UI-driven additions only); `src/ui/v90/rulers.js` (new: the sheet, the row, Play this map); the title card's records box (`src/ui/scoreUi.js` title side, `src/ui/titleCard.js`). **Backup and install:** `src/save/exportImport.js` (the rulers-only read), Options > Saves' Bring rulers and the ruler name (`src/ui/menu.js` settings sheet), `src/save/installFlow.js`, `src/ui/installUi.js`, `boot.js` `hooks.rulers`, `hooks.bringRulers` and the install ask. **Rivals:** `src/ui/share.js` (`&name=`, `&heir=`, the parse), the title card's shared-score panel (`scoreUi.js` title side), `src/ui/v90/rivalToast.js`, `passSheetExtras` (the side by side) | L |
| **The frame:** `src/render/loop.js`; `src/render/ambient.js` (`createFrameGate`'s running cap, the dropper's second level); `src/render/renderer.js` (the DPR cap, the figure slot choice, the seam's call). **Motion:** `src/ui/settings.js` (`systemReducedMotion`, `watchSystem`: the live device read, Q18). **The effects:** `src/render/walkers.js`, `units.js`, `effects.js`, `fire.js`, `newcomers.js`, `procession.js`, `trade.js` (`drawTradeGround`), `ferries.js`, `monuments.js` (scaffold and dust only), `seasons.js` (weather), `src/render/v90/*` (new); `src/render/art/figures.js`, `art/armies.js` (the walk poses); `src/data/ambient.js` (`SMOKE_FROM`, the V budget); `src/ui/v60/battle.js` (the moment's map effect call only). **CSS:** `css/v90.css` | V |
| `src/ui/text.js` | each track only under its own wave-0 header. An older line is changed by reassigning it from the track's own section, never by editing the older section |
| `src/data/tips.js`, How to play | each track adds its own entries only |
| `src/sim/world.js`, `src/save/migrate.js`, `src/save/serialize.js`, `src/data/v90.js`, `index.html` | wave 0 only; a track that needs more asks the controller |
| `src/sim/lesson.js`, `src/data/lesson.js`, `src/ui/lesson.js`, `src/ui/v60/lesson.js`, `src/ui/v81/lessonLock.js` | no track. A lesson test that fails is reported to the controller, who rules |
| The balance runs' own files and pins (`tests/stage4/balance`, `tests/stage47`, `tests/v60/balance`, `tests/v60/a`, `tests/v70` balance, `tests/v50/grand`, `tests/v84/balance`) and every frame-budget test's bound | wave 2's balance check. A track only reports what it moved |
| `src/data/releases.js`, `APP_VERSION`, README, rulings Part 27 | the docs step at the end only |

**Where two tracks share a file,** they edit different functions: `scoreUi.js` (D the summary, L the title side), `boot.js` (D `passThrone`, L `rulers`, `bringRulers` and the ask), `menu.js` (wave 0's two rows; L the settings sheet). On a merge conflict, keep both sides.

Merge order D → L → V, then regenerate `sw-files.js`.

## Rules for every track

- **Commit identity:**
  - `git config --local user.email` prints `181878008+joshuahedge@users.noreply.github.com`, in the branch and in every worktree.
  - Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Never write Josh's employer's name anywhere, including in briefs. The controller's guard script (scratchpad, not the repo) must print GUARD OK before every commit.
  - Josh's friend is "a friend". A rival's example name in tests and words is a made-up one ("Ana").
- **sw-files.js:** after editing `src/`, `css/`, `index.html` or `assets/`, regenerate it.
  - Run it in the **PowerShell tool** as `Set-Location <worktree>; & ./tools/sw-files.ps1`. The `-ExecutionPolicy Bypass` form is refused.
  - Rerun it after the last edit, and in the commit that ends a track.
  - Never hand-edit `sw-files.js`. On a merge conflict, take either side and regenerate.
- **Long commands:** every grep batch, full suite and screenshot runs with `run_in_background` and waits for the notification. A silent foreground command over 600 s kills the agent's stream.
- **Tests:**
  - **The full suite:** before every commit, `tests/run-tests.ps1 -WaitSeconds 3600` prints ALL PASSED. Run it from Bash through the controller's scratch suite wrapper (a one-at-a-time lock, `timeout 7600`). **Only one full suite runs on the machine at a time.**
  - **Iterating:** use `-Grep "v90 <track>"`.
  - **No reruns in a loop:** a test that fails in the full run but passes alone is reported, not rerun again and again. The frame-budget timing tests and "stage 2 placement preview" are the usual ones (ruling 1445); a fail under load that passes alone counts as passed, reported.
  - **Balance pins:** a track whose change moves a balance run beyond an asserted bound does not re-pin it. It reports the measured value, before and after, and the controller rules.
  - **Frame bounds:** V never loosens a budget test's bound. It reports.
- **New tests** go in `tests/v90/<track>/`, with describe names starting `v90 <track>` (d, l, v). Never delete an older test; update it and say which in the report.
- **Git hygiene:** stage files by path; never stage `.superpowers/`; never push; never run `python -` with a heredoc; never write source files through a shell heredoc, echo or sed.
- **Never block on an unbounded wait.** Every screenshot, server check and wait loop runs under `timeout` (shots 150 s). Stop any server or Edge you start.
- **Words match the sim.** Every number on screen comes from the sim's own function or data, with a test that sets the world up both ways (Steady and the heir). The title's why line, the trait's lines, the sealed score, the rival's months ahead and every lever-quoting sheet each have such a test.
- **The sim stays deterministic:** no `Math.random`, `Date` or `performance.now` in `src/sim`. The ruler's id and date are the interface's (as `newCityId` is).
- **Old saves load:** the 8.4 (v11) fixture loads at version 12 as the Steady and plays a year as on 8.4; a records version 1 blob reads with empty rulers, rivals and dynasty; a city with each heir saves and reloads.
- **The lesson:** every new rule, button, cost and effect is checked against the lesson (design section 10). Nothing may leave a step waiting with no way on, and no effect may hide a pointer.
- **Ruling numbers** come from each track's range, so two tracks never take the same number. Each track writes its rulings to `docs/superpowers/notes/2026-11-07-version-9-0-rulings-<track>.md`, one line each with its cost if wrong.

### UX rules (every UI change; reviewers check each)

- **Layout:** one panel at a time; nothing floats over the middle of the map. The heir's first-screen line uses the goal strip's row; the rival toast uses the toast row; the install ask is the list's top line and one toast, never a modal.
- **Sizes:** `tests/ui/mobileBudget.test.js` passes at 375x667 and 390x844, at 100/125/150% text. The ruler list scrolls in its sheet; a row is one line at 375 wide (name and title wrap before the score, never under it).
- **Controls:** 44x44 tap targets with accessible names, and a keyboard path on desktop (Tab, Enter or Space, Esc closes). The ruler name field has a label and a 16-character limit that says so.
- **Not colour alone:** a title carries its word, the side by side has numbers beside both bars, a medal its name.
- **Reasons and consequences:** every choice states its consequence before the tap:
  - Pass the throne: the title, why, the heir's two lines, the sealed score, and that the city is replaced ("Export it first to keep a copy");
  - Play this map: the replace question, as New city;
  - Bring rulers: how many rulers and rivals the file adds, before Merge.

  Every refusal says why (a bad file, a newer file), with what to do.
- **Motion:** every effect has its Gentle and Still form, readable as a still picture; under reduced motion nothing slides, flashes or shakes.
- **Screenshots:** every new or changed screen at 375x667, 390x844, 667x375, 1280x800 and 1920x1080, at 100% and 150% text, before review and after the fix wave. Shots are named `v90-<track>-*.png` in `docs/superpowers/notes/screenshots/raw/v90/`, which is gitignored. The list:
  - **D:** Pass the throne with the title it will give; a new city's first screen with the heir's line; the score sheet's "Remembered as";
  - **L:** the ruler list on a phone; a row open; Play this map's question; a rival's link opened on the title; the rival toast at a new rank; the side by side in the Pass sheet; Bring rulers' question;
  - **V:** before and after of each effect (the same frame, Full and Gentle), and the frame-time table.

## Tracks

### Track D: dynasty (Opus; rulings 1565-1584)

- **The titles** (`src/data/dynasty.js` `TITLES`, `src/sim/dynasty.js` `titleOf`): design section 3's measures and order, the bars as first values (Unconquered 3 raids; Builder 2,000 units; Merchant 0.40; Bountiful 0.90 with 24 months; Generous 0.50 with 24 months and High ≤ 0.1). `titleOf(world)` returns `{ id, fit, measure, runnerUp }`; Peaceful never earns the Unconquered.
- **The month-end counts** (`countDynastyMonth`): `townMonths` (+1 at a month end at Town or above), `fedMonths` (+1 when every Cottage-or-better home is fed, from Town: `src/sim/feats.js` `fedNow(world, 0)`, exported for it), `tradeGold` (+ `stats.lastMonth.tradeIncome`) and `billsPaid` (+ wages + upkeep + soldiers), both from Market town.
- **The traits** (`TRAITS`, `heirFactor(world, lever)`): design section 4's table, each lever read in its one function. The Unconquered's pay is `x 0.8` before the spoils' `x 0.75`, rounded once. The Unconquered's first warning is `firstWarnAfter - TRAITS.unconquered.sooner` (100). The Generous's High is `TAX_RATES.high.factor` replaced by 1.15 through `taxRateOf`. The score's taxes term keeps reading `taxesNormal` untraited.
- **The Bountiful's weakness** lands as Josh answers Q6 (recommended: the flood's cut x1.5, in `harvestFactor`); if he keeps "granaries hold less", D raises it with the controller first, since it touches every capacity read.
- **Pass the throne:**
  - `passThrone(world, { title })` (the sim): `sealReign(world, { passed: true, title })` with the reign's best seal's score when higher (design Q3). Never refused from City; refused below City (`not_yet`, with the people still needed) and in the lesson.
  - The sheet (`src/ui/v90/passSheet.js`): design section 2's five parts, then `passSheetExtras` (L's side by side). Pass the throne opens 8.2's new-city card headed "Your heir's city" with the trait line; **Start** writes the ruler row (`records.addRuler`), sets `records.setDynasty({ heir: title })`, then starts the city (`hooks.passThrone`). **Back** changes nothing.
  - The first Pass asks the name (prefilled "Ramesses"), stored by `setDynasty({ name })`; the game adds the regnal number.
- **Where the heir shows:** the new city's first-screen line for 10 days, the score sheet's header and "Remembered as" from City, the city summary, the `heir_trait` tip, How to play's Dynasty entry, the one-time City caption.
- **Balance:** D reruns the balance group with every city as the Steady (it must equal 8.4 exactly) and reports. The per-heir runs are wave 2's.
- **Tests:**
  - each title's rule at its bar, either side of it, ties, the runner-up, Peaceful;
  - each trait's lever on and off, and every sheet that quotes it (set up both ways);
  - the score is equal for two heirs in one state;
  - Pass: below City refused, the seal's score (with a won seal higher and lower), the ruler row's fields, the next city's heir, Back leaves the city unchanged;
  - the 8.4 fixture plays a year as the Steady with every number as on 8.4;
  - the lesson (design section 10, items 1, 2 and 5).

### Track L: the ruler list and rivals (Sonnet; rulings 1585-1599)

- **The list** (`src/ui/v90/rulers.js`): a sheet from the title card's records box and the game menu's Rulers. Rows newest first: "Ramesses II the Builder", rank, years (`day / 360`, one decimal), score and medal, the 32 x 32 map square (drawn from the row's `map` string). A row opens to its parts, feats, heir and, when kept, the rival side by side. **Play this map** opens the new-city card with the row's seed, level, layout and size, through New city's replace question.
- **The map square:** `addRuler` (wave 0) stores the string; L writes the encoder from `share.js` `drawMapSquare`'s colours (32 x 32, one base-36 character per cell) and the decoder that draws it.
- **The backup:**
  - the export already carries the records (check rulers and rivals are in it, with a test);
  - **Bring rulers from a file** (Options > Saves): picks a `.json`, reads its `records`, says "Adds 4 rulers and 2 rivals" before **Merge**, then `records.merge`. A save's world is never read. A bad or newer file says so.
- **The install ask:** after the first Pass on a device not installed (`installFlow` `canInstall()`), the list's top line and one toast: "Install Thebes to keep your rulers: Safari clears a site's data after 7 days without a visit", with Install. The iOS guide adds the export-then-bring line. `navigator.storage.persist()` is asked again at the first Pass.
- **Rivals:**
  - `shareLink` adds `&name=` and `&heir=` after the size (the dynasty's name and the city's heir); `parseShareLink` reads both, sanitising the name (16 characters, letters, digits, spaces and `'-.`); a link without them opens as today.
  - Opening a link with a name: `records.addRival(link, now)`; the title card's panel adds "Ana (heir of the Merchant): 412" and "Kept as your rival on this map".
  - **At a new split** (`onSplit`): on a city whose map has a rival, the newest one's toast, "Town: 2 months ahead of Ana" (`splitCompareText`'s words).
  - **The side by side** (`passSheetExtras` and the ruler row): two scores, the five parts as paired bars with numbers, each side's heir.
- **Tests:**
  - the list's rows and order; never capped (250 rulers kept beside 200 capped cities);
  - the map square's round trip;
  - Play this map's seed, level, layout and size;
  - Bring rulers: counts, merge by id, a bad file, a newer file, a city never imported;
  - the link's round trip with and without the extras; an 8.4 parser reading a 9.0 link (the extras ignored); sanitising;
  - rivals: kept, replaced by the same name on the same map, the cap of 50, the toast's months and its silence in the lesson;
  - the install ask's once-only and its absence when installed.

### Track V: animations and visual effects (Opus; rulings 1600-1619)

V first measures **before** on 8.4 (every budget test's figure printed, and the stress city's frame at zoom 1 and 0.5), then builds in the design's rank order, measuring each effect as it lands. It stops adding once the next effect would break T8 or T9, and reports what was cut.

- **V0a. DPR cap:** `renderer.js` draws the canvas at `min(devicePixelRatio, 2)`; the UI is untouched. A test with a DPR-3 stand-in sees a 2x canvas.
- **V0b. Frame cap:** `createFrameGate` caps a running game at 60 frames a second (the paused 30 stays). A test at a 120 Hz stand-in sees half the frames.
- **Reduced motion (Q18):** `settings.js` reads the device's Reduce motion live again (`matchMedia('(prefers-reduced-motion: reduce)')` and its change event), mapping to Gentle; nothing is stored and no Motion row returns. The rig's switch stays.
- **V1. Walk cycle and facing:** two step poses and a mirrored copy for every figure kind (`art/figures.js`, `art/armies.js`), chosen in `renderer.js` from distance walked and `dir`. Gentle one pose; Still today's.
- **V2. Units in step:** `units.js` glides each unit between the sim's last two tiles on `timeDays`, so it is never a day behind.
- **V3. Building goes up:** a placed building rises behind scaffold poles over 1 game day with a dust puff; an upgrade shows the poles for half a day. Drawing only.
- **V4. Smoke from every workshop:** `SMOKE_FROM` gains every workshop and kiln, puffing only while staffed and working; inside ambient's dropper.
- **V5. The beaten raid on the map:** at the last fight's spot, for the moment's 6 game days: raised spears, a gold sparkle, the raiders' dust to their edge, the fallen banner. Called from `ui/v60/battle.js` when the moment starts.
- **V6. Dust on the move:** bands entering and leaving, carts on sand, sled gangs.
- **V7. Fire fought:** water arcs from a staffed firehouse that reaches the fire, and steam as it goes out.
- **V8. Wakes** behind trade boats, ferries and the felucca (`drawTradeGround`).
- **V9. Festivals and the Victory:** temple lamps at night and petals along the procession; pennants on the palace during 8.4's Victory.
- **V10. Weather:** cloud shadows; Shemu's sand gusts on the desert edge.
- **V11. The river flowing** (only if T8 and T9 hold with it).
- **V12. Panels slide** (`css/v90.css`): sheets and the side panel 160 ms on open, toasts 150 ms; off under Gentle and Still and in the lesson.
- **The dropper:** V's effects get their own running-average budget (`AMBIENT.v90BudgetMs` 2) and shed V11, V10, V6, V4 and V9 in that order, with ambient's hold and restore times.
- **The look:** palette colours and `primitives.js` shapes only; each effect's Full, Gentle and Still frames are screenshot side by side.
- **Tests:**
  - each effect's Full, Gentle and Still output (the drawing calls made, as the existing effect tests do);
  - the caps (no effect draws more than its cap);
  - the dropper's order, hold and restore;
  - `tests/v90/v/budget.test.js`: V's layers on the stress city at zoom 1 (1280x800) and at the zoom floor (1920x1080), median ≤ 2 and ≤ 4 ms, flushed ≤ 14 ms;
  - the lesson: a walk-through with every effect live, the ring visible at each step at 375x667 (design section 10, item 4).

### Wave 2: balance, review, docs (rulings 1620-1639)

- **Balance check (Opus):**
  1. **The probe first:** every balance run's five title measures at its end, and the Steady's numbers (which must equal 8.4's).
  2. **The bars:** set `TITLES`' bars so T6 holds, each with a ruling.
  3. **The heirs:** in the suite, T4, T5, T6 and T7, plus T1 for the Builder and T3 for the Unconquered (the two most likely to move them). The other heirs' long runs are a one-off probe in the scratchpad, reported, so the suite does not grow by about twenty long runs.
  4. **The frames:** every budget test's figure, before (V's own first measure) and after, and the new V budget.
  5. **The report.** It gives this table, every number Steady (8.4) and each heir, against the targets:

| Measure | Steady (8.4) | B | U | F | M | G | Target |
|---|---|---|---|---|---|---|---|
| Great-work run: day won | 6,380 | | | | | | T1: within ±200, by 7,200 |
| Capital run: day Capital / year-6 gold / lowest | | | | | | | T2: ±90 days, ±25%, never below 0 |
| Dangers seeds 5, 10 and late run: raids lost | 0 / (seed 10 accepted, ruling 1551) / 0 | | | | | | T3: none the Steady beats |
| Strength / weakness measured | | | | | | | T4: as the trait's table |
| Capital run: score at year 6 | | | | | | | T5: within ±8% |
| Title earned by each run | | | | | | | T6: at least 3 titles; great-work = Builder; late dangers = Unconquered |

| Frame measure | 8.4 | 9.0 | Target |
|---|---|---|---|
| Stress city, zoom 1 / 0.5 (median ms) | | | T8: < 50 / < 120, and +2 / +4 at most |
| V's layers, zoom 1 / floor (median ms) | (new) | | T9: ≤ 2 / ≤ 4 |
| Three live sites ("s4") | 0.85-0.96 | | T10: < 1 |
| Seasons and light ("v70") | | | T11: 2 |
| Battle layers / frame over peace | ~0.9 / +2, +5-7 | | T11: < 3 / +6, +15 |
| Each effect: estimate / measured | | | design 7b |

  Every existing balance and frame assertion holds after the merge, or is re-pinned with a ruling that gives both numbers. A missed target says by how much and which one data number would meet it, and the controller rules.
- **Final review (Opus)** of the whole branch, with the UX rules, the usability pass at every size, the screenshots and the ledger. Then one Sonnet fix wave split by file ownership, and a Sonnet re-review.
- **Docs:**
  - README;
  - the follow-ups note `notes/2026-11-07-version-9-0-followups.md`, with Josh's real-phone checks:
    - Pass the throne's sheet and the heir's first screen;
    - the ruler list on the phone, Play this map, and Bring rulers in the installed app;
    - the install ask in Safari;
    - a friend's link opened, the toast at a new rank, the side by side;
    - each effect on a real phone: smoothness, battery warmth, and Reduce motion on;
  - rulings Part 27;
  - a What's new entry for **9.0 "Dynasty"**, with 8.4's build set to its last commit on main before 9.0's merge, and the pinned release tests moved down one;
  - `APP_VERSION` set to 9.0.
- **Merge** to main locally, rerun `tools/sw-files.ps1`, and run the full suite on main. Ask Josh before pushing.

## Rulings (proposed; append as Part 27)

1560. World version 12: `world.heir` (`'steady'` for new and migrated cities) and four month-end tallies (`townMonths`, `fedMonths`, `tradeGold`, `billsPaid`) starting at 0. — Cost if wrong: one more migration to keep.
1561. Records version 2: `rulers` never capped, `rivals` at most 50, `dynasty` `{ name, heir }`; a version 1 blob reads with the three empty. — Cost if wrong: a big dynasty's list grows `localStorage` by about 1.3 KB a ruler.
1562. The records' new shape lands in wave 0, fully tested, so D's Pass and L's list share one API. — Cost if wrong: none.
1563. Wave 0 adds the seams (`heirFactor`, `titleOf`, `countDynastyMonth`, `passSheetExtras`, `onSplit`, the menu's two rows, `effectsV90`, `css/v90.css`, the three text.js headers). — Cost if wrong: none.
1564. The lesson's world is always the Steady, whatever the device's dynasty holds. — Cost if wrong: none.
1565. A title is the highest fit (measure ÷ bar) among the titles whose bar is met, ties by the table's order; none met is the Steady. — Cost if wrong: a title a player did not expect; the score sheet shows it as they play.
1566. The bars start at Unconquered 3 raids (none lost, no tribute), Builder 2,000 units, Merchant 0.40 of the bills, Bountiful 0.90 of month ends fed, Generous 0.50 of month ends at Low (High ≤ 0.1), the share titles needing 24 counted months; the balance check sets them. — Cost if wrong: one title dominates; data retunes.
1567. Each trait is two numbers read through `heirFactor` in the lever's one function; the score never reads it. — Cost if wrong: a trait felt too little or too much; data retunes.
1568. The Unconquered's pay discount stacks with the captured weapons' (0.8 x 0.75), rounded once. — Cost if wrong: a winning Unconquered pays 40% less for a year.
1569. Pass the throne seals the best of the reign's seals and today's score; Start in the heir's new-city card does the seal, the ruler row and the new city at once, and Back changes nothing. — Cost if wrong: none to the sim.
1570. New city without passing keeps the current heir trait, and the abandoned city joins no list. — Cost if wrong: a player who never passes keeps one trait.
1585. The ruler list's "replay" is Play this map: a new city on the same seed, level, layout and size, through New city's question. — Cost if wrong: no time-lapse; a later release can add yearly snapshots.
1586. Bring rulers from a file merges rulers and rivals only; cities stay un-importable (ruling 1146). — Cost if wrong: a player expects their city back from the file.
1587. The install ask comes once, after the first Pass, on a device not installed; the iOS guide adds the export-then-bring line. — Cost if wrong: a Safari player loses rulers in the first week.
1588. A rival link adds `&name=` and `&heir=` outside the check and stays `t2`; older games ignore them. — Cost if wrong: a name can be edited in the link (friends' honour, as the score).
1589. A rival is kept per map; the same name on the same map replaces the older row; at most 50. — Cost if wrong: a friend with two names counts twice.
1590. At a new split, the newest rival on the map is compared in a toast. — Cost if wrong: a player with many rivals sees one.
1600. The canvas draws at most at DPR 2, and a running game at most 60 frames a second. — Cost if wrong: a DPR-3 phone's map is a little softer.
1601. The device's Reduce motion is read live again, mapping to Gentle; nothing is stored and no Motion row returns (amends ruling 1147). — Cost if wrong: a player with Reduce motion on sees the calmer forms.
1602. V's effects share a 2 ms budget on the stress city with their own dropper (V11, V10, V6, V4, V9 shed in that order); an effect that would break T8 or T9 is cut and reported. — Cost if wrong: a slow phone sees fewer effects.
1603. Every effect is drawing only: a building's rise, the scaffold and the beaten raid's moment never change what the sim does or when. — Cost if wrong: none to the sim.
1604. Panels slide only outside the lesson and under Full. — Cost if wrong: the lesson's panels snap open.
1620. The balance check owns every balance and frame pin; the suite runs T1 for the Builder and T3 for the Unconquered, and the other heirs' long runs are a reported probe. — Cost if wrong: a heir's long-run drift is caught only by the next balance check.
