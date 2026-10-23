# Thebes Version 7.0: a living world (plan)

Agreed with Josh on 23 Oct 2026, after Version 6.0 went live and once 6.0.1 is merged (the great work winnable with the dangers on; the lesson's fire step) and main's history has been rewritten to drop the employer's name. Start from that main, whatever its sha. One release: trade by river with a Trade sheet, city events, seasons with day and night, sound polish, and the two Advice fixes left from 6.0.

**Design (authority, read it first):** `docs/superpowers/specs/2026-10-23-thebes-version-7-0-a-living-world-design.md`. Also: the original spec `specs/2026-10-09-thebes-design.md`, this plan, and the rulings (850 on) appended to `notes/handoff-2026-10-11/rulings-so-far.md` as "Part 18: Version 7.0" (6.0.1 is Part 17). Background: the 6.0 contract `notes/2026-10-22-version-6-0-contract.md` and the follow-ups `notes/2026-10-22-version-6-0-followups.md`.

**Out of scope (Josh, 23 Oct):** seasons that change farming, moving buildings, rotating the view, new monument kinds, and the Steam and Google Play builds (they come after 7.0; nothing may need the network after load).

## What Josh asked for (23 Oct)

1. **Trade, partners plus control, kept lean:** Nubia (from Capital) and Punt (from Great Capital, the only source of incense) by river through a new Quay; caravans and boats visibly arrive; a Trade sheet with per-good switches, last year's profit per route, and a city-wide "Keep at least" list; offerings and accepted demands held back automatically.
2. **City events, mixed good and bad:** one or two a year from Town, about 16 kinds, one card with at most three choices, each stating its exact consequence; a stated default on timeout; never deeper into debt.
3. **Seasons (looks only) and a gentle day and night:** flood, growing and harvest on the existing flood calendar; a six-minute real-time light loop with lamps at night, switchable off; Still keeps daylight.
4. **Sound polish:** season moods, a tense variant when danger is live, short code-made effects, separate Music and Effects volumes.
5. **Advice fixes from 6.0:** raid towers only where they truly defend the first target; stranded goods answered with a storehouse near the bazaar.
6. **Clean and simple UX on mobile and desktop** is a release requirement, graded by the final review.

## Process (multi-agent; Josh runs the controller on Opus 5.5)

- Branch `version-7-0` from main. Track work runs in sibling worktrees `C:\dev\thebes-v70-<track>` cut from the branch after Track 0, merged back by the controller between waves. At most three tracks at once.
- **Models (Josh, 22-23 Oct: no Fable):** Opus for Track 0, Track T (trade: sim, save and UI together), any integration that is not a trivial merge, and the final whole-branch review. Sonnet for every other implementer, every reviewer, the balance pass, the fix wave and the re-review. Opus as the escalation only if a Sonnet fix round fails twice.
- Per track: the implementer, then a Sonnet reviewer with the diff, the track section, the rules and the UX rules; at most two fix rounds. Fold a reviewer's minor findings into the track's next commit.
- The controller reads reports, not diffs; keeps a ledger at `.superpowers/sdd/2026-10-23-thebes-version-7-0/progress.md`; rules on what is left; looks at two or three screenshots per visual track.

### Waves

| Wave | Tracks (parallel) | Depends on |
|---|---|---|
| 0 | Track 0: contract (Opus) | main |
| 1 | T: trade and the Quay (Opus) · E: city events (Sonnet) · S: seasons, light and sound (Sonnet) | Track 0 |
| 2 | A: Advice fixes and the words (Sonnet) | wave 1 merged (Advice and How to play cover T and E) |
| 3 | Balance (Sonnet) → final review with the usability pass (Opus) → fix wave (Sonnet) → re-review (Sonnet) → docs, merge, suite on main | wave 2 merged |

## Rules for every track

- Commit identity: `git config --local user.email` must print `181878008+joshuahedge@users.noreply.github.com`. Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never write Josh's employer's name anywhere; the controller's guard script must print GUARD OK before every commit.
- After editing `src/`, `css/`, `index.html` or `assets/`, run `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1`; rerun it after the last edit, and in the very commit that ends a track (6.0's last D2 commit left a stale stamp). Never hand-edit `sw-files.js`; on a merge conflict in it, regenerate it.
- Before every commit: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 600` prints ALL PASSED (about 6 minutes). **Only one full suite runs on the machine at a time** (the controller's suite slot); iterate with `-Grep "v70 <track>"`. Timing tests can flake under load: rerun once.
- New tests go in `tests/v70/<track>/`, each track with its own aggregator `tests/v70/<track>/all.js` imported once from `tests/v70/all.js` (Track 0 creates them all). Describe names start with `v70 <track>`.
- Stage files by path; never stage `.superpowers/`. Never push. Never run `python -` or `python3 -` with a heredoc. Never write source files through a shell heredoc or echo (it strips `${...}` from JS template literals): use the edit tools.
- **Never block on an unbounded wait.** Every screenshot, server check and wait loop runs under `timeout` (shots 150 s). Stop any server or Edge you start.
- Words must match the sim: every number, rule or consequence on screen comes from the sim's own function or data, with a test that sets the world up both ways. Advice never recommends something the sim would refuse.
- The sim stays deterministic: no `Math.random`, `Date` or `performance.now` in `src/sim`; events draw from the world's seeded rng. **No memo in a sim function the UI also calls may outlive one tick unless its key covers every input it reads** (6.0's fix wave found two that let an open sheet change the next tick).
- Render-only state (boats, caravans, light, season blend, sounds) never enters the save or the sim; the light loop runs on the real clock in the render layer only.
- Motion: Gentle (reduced motion) is what headless Edge and Josh's devices show; every visual reads under Gentle, tests of Full force it, Still shows no new movement (and no light loop).
- Old saves load: world version 10 with `MIGRATIONS[9]` (Track 0). A v9 city gets every trade switch on, no floors, no waiting event, and its first event no sooner than a year (360 days) after load.
- Ruling numbers are given per track so two tracks never take the same number.

### UX rules (every UI change; reviewers check each)

The 6.0 UX rules apply unchanged: one panel at a time and nothing floating over the middle of the map; `tests/ui/mobileBudget.test.js` at 375x667 and 390x844, 100/125/150% text; 44x44 tap targets with accessible names; colour never the only cue; progressive disclosure (each new thing unlocks at a stated milestone with one first or tip and words in How to play); every refusal says why with Show me; every choice states its exact consequence before the tap; deadlines in game months; no dark patterns; the top bar fits at 375 px and 150% text; desktop checked at 1920x1080.

**Added for 7.0 (Josh: clean and simple on mobile and desktop):**
- Every new screen (the Trade sheet, the Quay sheet, the event card, the new Settings rows) is screenshotted at 375x667, 390x844, 667x375 (landscape), 1280x800 and 1920x1080, at 100% and 150% text, under Gentle, before review and again after the fix wave.
- A new screen shows one decision at a time: on a phone the Trade sheet opens one route at a time (an accordion), and the event card fits without scrolling at 390x844 and 100% text.
- No new top-bar button: trade is reached from the trading post, the Quay and a Trade row in the summary; events from the alert row.
- Each new interactive control gets a test for its accessible name and its 44x44 size, and a keyboard path on desktop (Tab order, Enter or Space, Esc closes).

## Tracks

### Track 0: contract (Opus; rulings 858-869)

- World version 10 and `MIGRATIONS[9]`: `world.trade.switches` and `world.trade.floors` (per good), `world.events` (`{ nextDay, cooldowns, waiting }`), the Quay as a building kind, and the incense good; each defaulted for v9 saves, with tests (a v9 fixture loads and plays a year).
- Seams as named functions with stubs and tests: `tradeAllowed(world, partner, good, side)` and `heldBack(world, good)` (T); `drawEvent(world)`, `eventChoices(world, event)` and `applyChoice(world, event, choiceId)` (E); `seasonAt(world)` returning `{ season, blend }` from the flood calendar, `lightAt(nowMs)` for render only (S); `towerSpotsFor(world, target)` and `strandedFix(world, good, bazaar)` (A).
- `tests/v70/all.js` and one aggregator per track (contract, t, e, s, a, balance, docs). Dev scenes: `v70-trade`, `v70-quay`, `v70-boat`, `v70-event`, `v70-festival`, `v70-season-flood`, `v70-season-growing`, `v70-season-harvest`, `v70-night`, `v70-advice-tower`, `v70-stranded`.
- A contract note `notes/2026-10-23-version-7-0-contract.md`: API shapes, file ownership per track, the shared files and who edits them (`text.js` sections per track, `tips.js`, How to play, `releases.js` only at the end), and the merge order (T → E → S, then A).
- Full suite; one commit.

### Track T: trade and the Quay (Opus; rulings 870-899)

- Partners Nubia (milestone Capital) and Punt (milestone Great Capital) in `src/data/trade.js` with `by: 'river'`; their goods, prices and quotas follow the existing rules (`ARBITRAGE_MARGIN`, `PRICE_DRIFT`, `CARAVAN_EVERY_MONTHS`); incense sold only by Punt, bought by nobody.
- The Quay: a 2x1 building on a riverbank tile with a road; river routes need one (a refusal says why with Show me). Boats sail the river to it and back; caravans walk the entry road to the trading post (render-only, sampled from trade's existing arrival schedule).
- Trade obeys the switches and `Keep at least` floors; offerings for the great temple's waiting stage and accepted court demands are held back automatically and labelled "held for the temple" or "held for the court".
- The Trade sheet (from the trading post, the Quay, and a Trade row in the summary) as the design describes, phone accordion and desktop side panel; last year's profit per route from the sim's own ledger.
- Balance: incense only feeds festivals, so no 6.0 run moves; prove it (every 6.0 balance assertion unchanged).

### Track E: city events (Sonnet; rulings 900-929)

- About 16 kinds in `src/data/events.js` (half welcome, half troublesome, gated by rank), each with at most three choices, a duration in months, a stated default, and its effects through existing sim functions (mood, favour, output, stores, police and health coverage).
- `drawEvent` rules: from Town, one or two a year, never during a strike of a danger, never when a court deadline is under 30 days, never two at once, per-kind cooldown, seeded rng. A choice that costs gold is disabled with its reason when the treasury cannot pay it; the default never costs gold.
- The event card: alert-row entry, bottom sheet on a phone, side panel on desktop; Advice item while waiting; Recent keeps the outcome; How to play entry; one first-moment picture card (remade with `tools/tutorial.ps1`, every wait under timeout).
- The Festival of Opet uses beer and incense; without incense it offers a smaller festival with beer alone (words say so).

### Track S: seasons, light and sound (Sonnet; rulings 930-959)

- Seasons: a render-side colour grade and field, palm and river states from `seasonAt`; a one-month blend; the top bar's date adds the season name (fits at 375 px and 150% text).
- Day and night: `lightAt` on the real clock (about six minutes a cycle, night short), a tint layer plus lamp glows on homes and street lamps; never below the readability bar (test the contrast of the top bar, labels and markers at night); holds while paused; Settings "Day and night" on/off; Still keeps daylight.
- Budget: lighting and season grading add at most 2 ms a frame at the Huge map's zoom floor in headless 1920x1080 (a test, as 6.0's battle layers).
- Sound: season moods and a tense variant in the existing Web Audio music; short code-made effects (place, road, market near the view, fire, battle, caravan bells, boat oars); Settings Music and Effects volumes under the existing Sound master; the first tap still starts audio.

### Track A: Advice fixes and the words (Sonnet; rulings 960-974)

- Raid towers: `towerSpotsFor(world, firstRaidTarget(...))` returns only spots with a road and within tower range of the target; when none exists the fix names the step ("Lay a road to here, then build the tower") with Show me at the road's end. Re-record the advice pins with reasons.
- Stranded goods: when a good is stored beyond a cart's sensible reach of the bazaar that needs it (a threshold from the cart's trip data, stated), Advice says "Build a storehouse near this bazaar" and Show me aims at a valid spot near it.
- Advice items for T and E (a waiting event; a route blocked by a floor that starves the city's income; a Quay missing for an open river partner) and their How to play entries; the tips for the Quay, the Trade sheet and events.

### Wave 3: balance, review, docs (rulings 975-999)

- **Balance (Sonnet):** every 6.0 and 6.0.1 run's assertions hold (village, capital, late, careless, grand with large plots, great work dangers off and on); events on in the late and great-work runs never sink them (record each event drawn and its default); trade floors protect the temple's offerings in the great-work run; record Advice's top item on each run.
- **Final review (Opus)** of the whole branch with the UX rules, the 7.0 usability pass at every listed size, the screenshots and the ledger; wait for its helper sub-reviews; one Sonnet fix wave split by file ownership; a Sonnet re-review.
- README, follow-ups note `notes/2026-10-23-version-7-0-followups.md` (Josh's real-phone checks: the Trade sheet one-handed, an event card, night on his phone, sound volumes, the Quay), rulings Part 18, a "Version 7.0" entry in `src/data/releases.js` (set 6.0.1's build to its merge commit), `APP_VERSION` to 7.0. Merge to main locally, rerun `tools/sw-files.ps1`, full suite on main. Ask Josh before pushing.

## Rulings (proposed; append as Part 18)

850. 7.0 is one release built on 6.0.1 and the rewritten history; nothing in it needs the network after load. — Cost if wrong: store work later finds a web-only dependency.
851. Seasons change looks only; farms work as in 6.0. — Cost if wrong: the seasons feel cosmetic.
852. Day and night run on a six-minute real-time loop in the render layer, never in the sim or the save. — Cost if wrong: the light does not match the date.
853. Incense is a festival good only; no growth or rank needs it. — Cost if wrong: Punt feels optional.
854. Trade never sells below a floor, and offerings and accepted demands are held back automatically. — Cost if wrong: a player who wants to sell everything must lower floors first.
855. Events never push a city in debt deeper; a default never costs gold. — Cost if wrong: troublesome events feel soft for a broke city.
856. A v9 city sees no event for a year after load. — Cost if wrong: none for new cities.
857. Opus for Track 0, Track T, hard merges and the final review; Sonnet for the rest (Josh: no Fable). — Cost if wrong: a Sonnet track needs an Opus fix round.
