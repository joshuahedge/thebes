# Thebes "First hours": the polish release, design (approved)

**Josh's answers (8 Nov 2026): "All recommended".** Every open question in section 8 takes its recommendation: Q1 this is 9.1 "First hours" and the decree becomes 9.2; Q2 no bundle now; Q3 the lesson city goes back to Village with its cards kept and the raid clock stopped until 250 people; Q4 still the PWA, made store-ready; Q5 overridden: **no colour-blind work in this release** (Josh: "Don't do colour blind"; section 6a, target P9 and ruling 1700 are dropped); Q6 adaptive scripts first, then data only; Q7 a 30-day warning and the raid step at 2x; Q8 "Made by Josh", with the licence wording asked of Josh before the docs step; Q9 the classic river at Normal size for the first own city; Q10 copy only, never sent.

**Josh's ask (7 Nov 2026), after 9.0 "Dynasty" went live:** review the game and plan the next iteration for broad polish, and alongside it think about what to update, refine and polish to minimise the chance that people ask for a refund in their first short window (a store's window: about 2 hours of play within 14 days).

**For Josh:** the first session decides a refund. So this release is judged by one question: does a new player, on their own device, get through the first two hours without being stuck, confused, bored or let down, and want to keep going? Section 1 ranks what breaks that. Sections 2 to 7 are the changes, each with its why, where, size and the test or measurement that proves it. The calls for you are the open questions (section 8) and the targets (section 9). The plan is `plans/2026-11-07-thebes-polish.md`.

**Where it comes from:**
- Review A walked the first two hours as a new player at 399e1c8 with screenshots (the controller's scratchpad, `polish/findings-a.md` and `polish/a/`).
- Review B, the broad audit, left no findings file. Its topics (errors, memory, colour, credits and privacy, debt, load, devices) were checked directly against the code for this design instead.
- The 9.0, 8.4 and 8.3 follow-ups notes: what was left, and the real-phone checks undone since 7.0.

Every finding below was checked against the code at 1d937a4 (9.0 live). Two did not hold as written and are corrected: **the cloud shadows** (review A's item 6) were already softened and taken out of the lesson in 493dec1, so they are dropped; **the terrain cache** does not grow without end (it keeps the 32 most recent chunks), but at DPR 2 each chunk is baked at 3 device pixels per art pixel, so the cache's ceiling is large for a phone (section 5c).

## 1. The refund lens: what makes a player quit in the first two hours, ranked

Ranked by how bad it feels times how many players meet it. "Every lesson player" means every new player who takes the lesson, which the title offers first.

| # | What the player feels | Who meets it | Today | Section |
|---|---|---|---|---|
| 1 | **"It doesn't work."** A blank screen on a slow first load; a game that stops with no word; a phone tab that reloads after an hour | unknown: never measured on a real device or a throttled profile | no loading screen; no error handler (an exception in a day's tick repeats every frame, silently, and the next hidden-tab autosave can write the half-ticked city); a terrain cache that can hold about 160 MB of canvas at DPR 2 | 5 |
| 2 | **"I don't know what to do."** The lesson's road step hides where the road begins; mood falls and alerts pile up with no word on why | every lesson player | the road's end is dimmed with no marker; mood 60 to 40 unexplained; 4 worker alerts during the raid step | 2 |
| 3 | **"This is boring."** About two minutes of nothing at the lesson's end | every lesson player | the staged raid's 90-day warning plus a ~45-day march: ~134 s at 1x with nothing to do | 2 |
| 4 | **"That's unfair."** The lesson's own layout burns the granary; the first own city is a surprise map; debt with no way out | every lesson player (the fire); many (the map, debt) | the firehouse is 11 road tiles from the granary against a reach of 8; the first new city defaults to Surprise me; the debt alert says "Pause buildings you don't need" | 2, 3, 6 |
| 5 | **"Where did my progress go?"** The handed-over city reads "City: 94 of 400 people": no Town, no Market town, the next rank four times away | every lesson player | the staged raid sets the rank to Market town; the hand-over keeps it | 2 |
| 6 | **"It's noisy."** "5 new messages" in month 1, all things the player just did; four rows stacked over a desktop map after the hand-over | everyone | every toast goes to the Messages tray and its count | 3 |
| 7 | **"Can I trust it?"** No credits, no licence, no word on what the game keeps or sends | store reviewers, careful players | nothing in the app; it sends nothing anywhere | 6 |
| 8 | **"I can't read it."** Colour-blind players (about 1 man in 12) on the ground and overlay colours | about 4% of players | no colour-vision check since the first design asked for one (dropped by Josh, 8 Nov 2026) | 6 |
| 9 | **The heirs feel harsh** | players hours in, after a first Pass (outside the window) | ruling 1640: the heirs measured against scripts that do not adapt | 7 |

Rows 1 and 2 matter most: a crash or a stuck step ends the session, and a store review that says "froze" or "confusing" costs every later sale. Row 9 matters least for the window, since heirs come only after a first Pass.

## 2. The lesson and the hand-over

The lesson is 14 steps in 7 chapters on seed 7 (`src/data/lesson.js`). These files had no owner in 9.0; here one track owns them all (the plan's Track F). Ruling 1453 stands: nothing may leave a step waiting with no way on.

**2a. The rank at the hand-over** (High, every lesson player, M).
- **Today:** `STAGES.raid` (`src/sim/lesson.js:216`) sets `world.milestone = 'market_town'`, writes the Town and Market town splits on that day (about day 63), and starts the raid clock, so the tower card exists for the raid. The hand-over (`boot.js` `adoptLesson`, ruling 1208) keeps all three. The player at 94 people never sees Town (150) or Market town (250) arrive, their best splits for seed 7 are a lesson's, and a later raid is drawn 360 to 600 days after the lesson's.
- **The change:** at the hand-over, the rank goes back to what the people have earned (Village at 94), the two staged splits are cleared, and the raid clock is stopped, as a real city's is until 250 people. The cards the lesson showed stay unlocked through a new optional `world.lessonCards` list (absent means none, so no world-version bump) that `isUnlocked` reads, so the tower the player just built is never a locked card. Town and Market town then arrive for real, with their captions, unlocks and splits.
- **Proof:** a test plays the lesson to the hand-over and checks the rank (Village), the splits (none past Village), the clock (null), every lesson card still unlocked, and that Town arrives at 150 people with its caption. The adopted city saves and reloads.

**2b. The first fire comes from the lesson's own layout** (High, every lesson player, S).
- **Today:** `LESSON_PLACES` puts the firehouse at (21,45) and the granary at (14,40): about 11 road tiles apart against `FIRE.reach` 8. Left alone the granary burned on day 294, then the farm; the hand-over's alerts already say "Granary has a high fire risk".
- **The change:** move the firehouse to where its reach covers every building the lesson asks for (a first candidate is (17,40), south of the new road: 7 tiles to the bazaar, 2 to the granary, 5 to the farm), with the step's ring and words following it.
- **Proof:** a test: every building in the lesson's layout is within a staffed firehouse's reach at the hand-over, and the scripted lesson plus 18 idle months has no fire outside the staged blaze.

**2c. The dead wait at the end** (High, every lesson player, S).
- **Today:** the tower step raises the warning the day after the clock starts; the raiders arrive `RAIDS.warningDays` (90) later and then march about 45 days. At the lesson's 1x that is about 134 seconds of waiting with the game paused only at the start.
- **The change:** the lesson's staged warning sets its own arrival 30 days on (`warning.arrives`, set by the lesson only, so the countdown chip and every word that reads it agree), and the raid step's card plays at 2x and says so. The other waits (families, workers, month) stay at 1x.
- **Proof:** the lesson's waits are measured from `LESSON_SCRIPT` with a counting `io` (days waited per step ÷ the speed the step plays at); target P5 (section 9).

**2d. Mood and alerts explained in the lesson** (Medium, every lesson player, S).
- **The change:** one Ipi line at the month step on mood ("Mood falls when homes lack food or work; the gold chip and mood chip say why"), with the mood chip lit. During the lesson the alert banner shows only the step's own problem (the fire at the fire step, the raid at the defence chapter); the rest wait for the hand-over.
- **Proof:** a test counts the banner's rows at each step: at most one, and only the step's own.

**2e. Where the road begins** (Medium, every lesson player, S).
- **Today:** the road step's spotlight dims the gate road, and nothing marks its end (compare `polish/a/l-road-390x844.png` with the real game's teal diamond at the end, `polish/a/11-fresh-390x844.png`). The words say "west from the gate"; the road bar says "Tap where it starts".
- **The change:** the real game's end-of-road diamond in the lesson too, above the dimming, plus a dashed ghost of the 9 tiles to lay; the words "Drag west from the end of the road (the diamond)".
- **Proof:** a screenshot test at 375x667 finds the diamond and the ring both visible at the road step; Josh's stuck road (ruling 1210, cause never proven) is on the real-phone list.

**2f. The hand-over's first minute on a big screen** (Medium, S).
- **Today:** after the hand-over on desktop the alert banner, the goals strip, the rank chip and an Ipi tip stack top-left (about a third of a 1024x768 map). The phone's hand-over is clean.
- **The change:** for the first game month after the hand-over no tip shows while an alert and a goal are both up, and only one alert row shows (the rest under "+N").
- **Proof:** screenshots at 1024x768, 1280x800 and 1920x1080 just after the hand-over; a test counts the rows under the bar (at most two).

**2g. Small first-screen fixes** (Low, S each): the title's story paragraph repeated on the first chapter card (keep it on one); "I've played before" needing a second Play tap (it starts the game); the Housing plot bar's "Tap where it starts" when one tap lays a plot ("Tap a spot, or drag for a row"); the "Good plots" hint row talking over Ipi in the lesson (hidden while a lesson card is up); at 1920x1080 the title card is small over empty desert with the city in a corner (the title's backdrop centres the sample city and the card grows with the screen, as the 1280 one does).

## 3. The first unguided hour

**3a. The first own city's defaults** (Medium, S).
- **Today:** the new-city card preselects Normal and Surprise me (`titleCard.js` `layout = 'auto'`), so a first city can be Cataract or Delta.
- **The change:** a device's first city after the lesson (or its first city at all) defaults to the classic river at Normal size; Surprise me is the default from the second city on. The choice stays the player's.
- **Proof:** a test on the card with an empty and a non-empty records store.

**3b. Messages count news, not the player's own taps** (Medium, everyone, S).
- **Today:** `createToasts`' `record` sends every toast to the tray (`createUI.js:153`): "Road laid", "1 plot placed", "5 plots placed" and goal lines make "5 new messages" in month 1.
- **The change:** a toast that only echoes the player's own action (placed, laid, demolished, undone) still shows but is not recorded; goal lines are kept but read (no count) while the lesson runs. The tray keeps arrivals, ranks, events, warnings and everything pinned.
- **Proof:** target P7: a scripted first 10 minutes after the hand-over counts the badge.

**3c. Debt and the way back** (Medium, many, M).
- **Today:** below 0 the mood falls (`mood.js` debt term); below -500 nothing can be bought (`ECONOMY.debtFloor`); the alert's fix is one generic line, "Pause buildings you don't need; taxes rise as homes grow".
- **The change:** the debt alert opens a short "Back to gold" sheet built from the sim's own month figures (`monthFigures`): this month's income and costs, the three biggest costs with their Pause buttons, the months to clear the debt at this rate, what -500 will stop, and the levers the city has (the tax rate from Town, selling a surplus from Market town), each line a Show me. Nothing is suggested that the sim would refuse.
- **Proof:** tests set a city in debt both ways (with and without a palace and a trading post) and check every number against `monthFigures` and every suggestion against what the sim allows.

## 4. Noise and calm

Folded into 2d (lesson alerts), 2f (the hand-over's rows) and 3b (Messages). One rule for all three: **what the player just did is never news, and what needs a decision is never hidden**. The pinned alerts (raid, fire, warning, court letter, debt, save failed, city event) are untouched.

## 5. Runs well: never a silent freeze

**5a. First load and a loading screen** (High where networks are slow, S for the screen, M to measure).
- **Today:** `index.html` has no loading screen: the page is blank until 377 modules (about 3.2 MB, 250 requests on the first screen) have loaded. Localhost loads in 650-950 ms; a phone on 4G is unknown, and a failed module leaves the page blank for good. The service worker precaches all 411 files after boot, so a second visit is fast.
- **The change:**
  1. **A loading screen in `index.html` itself:** inline CSS before the stylesheets, the game's name and a quiet line, removed when the title card shows. After 15 s still loading it says "Still loading. Slow connection?" with Reload; a `nomodule` line for browsers too old to run it.
  2. **An early error line:** a small inline classic script that catches a module that fails to load and says so on the loading screen with Reload, instead of a blank page.
  3. **Module preload:** a generated `<link rel="modulepreload">` block (written by `tools/sw-files.ps1`, which already lists every file) so the browser fetches the import tree at once instead of level by level. No bundler, no build step.
  4. **Measure:** a new `tools/profile.ps1` (the screenshot script's DevTools pattern) loads the game cold with network and CPU throttled and prints the times (target P1).
- **A bundled release build** is not proposed now (Q2): measure 1 to 3 first, and bundle only if P1 still misses. In a store wrapper the files are local, so bundling would buy nothing there.

**5b. A global error and unhandled-rejection handler** (High, unknown how many, M).
- **Today:** no `error` or `unhandledrejection` handler anywhere. The loop queues its next frame before ticking (`render/loop.js:15`), so an exception in `tickDay` or the render repeats every frame: the city stops or half-runs with no word, and the next `visibilitychange` autosave can write a half-ticked city over the good one (it validates the shape, not the sense).
- **The change:**
  - **Where it threw decides what is safe.** The loop catches its own: a throw inside a day's tick marks the city **tainted** (it may be half-changed); a throw in the render counts, and three in a row stop the loop. A global `error` and `unhandledrejection` handler catches the rest (a button's handler, a promise).
  - **Tainted (the sim threw):** the game pauses at once, the loop stops, and autosave is blocked for this city, so the slot keeps the last month-end save and the backup. A card (not over the map's middle) says: "Something went wrong and the game has paused. Your city was saved at the start of this month." With **Reload from the save** (at most one game month lost), **Export this city** (the tainted city as a file, for a bug report) and **Copy the details** (version, build, the error's first lines; nothing personal).
  - **Not tainted (the render or the UI threw):** the city is sound, so it saves now. A render failure shows the same card with Reload; a UI handler's failure shows one toast, "That didn't work; your city is safe", and the game goes on.
  - **Never a loop of cards:** one card a session; later errors only add to its details.
- **Proof:** tests inject a throw into a day's tick, into the render and into a button's handler, and check: paused, the card, autosave blocked (tainted) or done (not), the slot still loads, and nothing repeats per frame. Target P10.

**5c. Memory over a long session** (unknown, M).
- **Today:** the terrain baker keeps the 32 most recent chunks (`terrainBaker.js:463`, `maxChunks = 32`), but at DPR 2 and zoom 1 each chunk bakes at scale 3 (`chunkScaleFor`), about 1,560 x 800 device pixels, about 5 MB: a full cache is about 160 MB of canvas. The sprite cache (`spriteCache.js`) never evicts: every slot at every zoom bucket and DPR it has drawn stays, now three poses a figure since 9.0. iOS Safari is known to drop canvases or reload a tab well short of that.
- **The change:** both caches budget by bytes, not count: the terrain cache by a canvas-pixel budget (a first value of 48 MB at DPR 2, measured), evicting the least recently used; the sprite cache drops the zoom buckets not used for a while, never the bucket in view. A dev counter (`window.__thebes`) reports both caches' bytes for the profile.
- **Proof:** target P3: a simulated 2-hour session (section 9) on a Large map, panning the whole map at every zoom bucket, holds the canvas bytes under the budget and the JS heap flat in its second hour.

**5d. Frames on a low-end phone** (unknown, S to measure).
- **Today:** every frame number is headless desktop Edge (the stress city 2.8 ms steady at zoom 1); no phone has been measured since 7.0, and the Huge map on a phone never.
- **The change:** `tools/profile.ps1` runs the stress city and a Huge map at 390x844 and DPR 2 under a 4x and a 6x CPU throttle and prints p50, p95 and the worst frame (targets P2 and P4). It changes no game code; a miss is reported with the frame's biggest layers, and the controller rules.

## 6. Clear and trustworthy

**6a. Colour-blind safety: dropped by Josh (8 Nov 2026), "Don't do colour blind".** No colour test, no patterns, no hue changes in this release. (What review B found, for the record: the ground layer's fertile green against clay red, `GROUND_HUE` `#27934A` / `#C2552B`, and the fire and health layers' amber and olive are the pairs at risk.)

**6b. Credits, licences and a privacy line** (Low for players, High for a store, S).
- **Today:** the game has no About: no credits, no licence, no word on data. It is all its own work (the art is drawn in code, the picture cards are made from the game's own scenes, the sounds and music are synthesised, the fonts are the system's), and it sends nothing anywhere: no analytics, no server; a share link is a URL the player sends.
- **The change:** an **About** section in Options: the version and build, who made it (Josh's words; Q8), the game's licence, "Art, music and sounds are made by the game itself", and the privacy line: "Thebes keeps your cities on this device. It sends nothing anywhere; a share link carries only what it shows." A test fails if a `fetch` to another origin appears in `src/`.
- **Proof:** the test; screenshots of the section.

## 7. The heirs retuned against scripted cities that adapt

- **Today:** ruling 1640 accepted the heirs as measured: the scripted cities, tuned to the Steady, do not answer to a trait. The Builder wins the great work 260 days late with 26% less gold; every heir loses seed-5 raids (B2, U7, F6, M6, G2); the Bountiful, the Merchant and the Generous miss the great-work win. Two words are also left: `court.js` `outputPerMonth` ignores the heir (and the flood), and the Nilometer's static `rvPrepRule` quotes the Steady's number whatever the heir.
- **The change:**
  1. **Scripts that adapt,** reading the same sheets a player reads (the 8.4 rule, ruling 1540): a habit per weakness, for example taxes set back to Normal sooner when the Builder's 5% bites, towers one band earlier when the Unconquered's warning comes 100 days sooner, granaries kept fuller ahead of a low flood for the Bountiful, more farms or trade over workshops for the Merchant. A Steady city's script does exactly what it does today, so every older pin holds.
  2. **Then the data, only where adaptive runs still miss:** `TRAITS` numbers, each with a ruling and both values. No rule change. Ruling 1626's measure (the Unconquered's `sooner` 100 to 15) is the first candidate if T3 still fails.
  3. **The two words:** the court's yearly due and the Nilometer line read the heir through `heirFactor`, with a test both ways.
- **Proof:** target P8: 9.0's T1 to T3 met by every heir with the adaptive scripts, in the suite for the Builder and the Unconquered and a reported probe for the rest (ruling 1620's split).
- **Why it is last in the lens:** a heir comes only after a first Pass, hours in; it is polish for the players who stay.

## 8. Open questions (each with a recommendation)

- **Q1. Where does this sit against 9.1 "Weekly decree"?** Recommended: **before it, as its own release, 9.1 "First hours", with the decree moving to 9.2.** Why: the refund window is about new players and the decree is for returning ones; the decree adds a second save slot and a new mode, which is safer on a game that already never freezes silently. (A patch number, 9.0.1, undersells a release of this size.)
- **Q2. A bundled release build?** Recommended: **not now.** Loading screen, early error line and generated module preload first, measured by P1; bundle only if P1 still misses. Why: no build step is how the game is made, and a store wrapper serves local files, where bundling buys nothing.
- **Q3. The lesson city's rank at the hand-over?** Recommended: **back to what the people earned (Village), the staged splits cleared, the raid clock stopped until 250 people, the lesson's cards kept unlocked.** Why: Town and Market town are the first two rewards a new player can earn, and the raid clock should start where a real city's does.
- **Q4. A store build, or still the PWA?** Recommended: **still the PWA for this release, made store-ready** (the About section, the error handler, the loading screen, the measured load and memory), with the store question decided after Josh's real-phone pass. Why: a store build needs real-device testing that has never been done, and everything here helps both.
- **Q5. Colour-blind safety as a setting or as default shapes?** Recommended: **default shapes and checked colours for everyone, no setting.** Why: Josh's clean Options, and a pattern that helps 4% of players costs the rest nothing. **Josh: dropped, no colour-blind work.**
- **Q6. How far to retune the heirs?** Recommended: **adaptive scripts first, then data numbers only where they still miss; no rule changes.** Why: ruling 1640's misses are mostly the scripts', and heirs sit outside the refund window.
- **Q7. The lesson's raid wait?** Recommended: **a 30-day staged warning and the raid step at 2x, said on the card.** Why: about 25 s of waiting instead of 134, and the countdown still reads the warning's own day.
- **Q8. What does the About section say about who made it?** Recommended: **"Made by Josh" (or the name Josh gives) and the game's licence as Josh picks it; the controller asks before the docs step.** Why: it is Josh's name and Josh's licence to choose.
- **Q9. The first own city's map?** Recommended: **the classic river at Normal size for the first city, Surprise me from the second.** Why: the first city should teach the game, not the map.
- **Q10. The error card's Copy the details?** Recommended: **yes, copy only (no sending).** Why: the game sends nothing anywhere (6b), and a copied report is the only bug report a player can give.

## 9. The targets

Each is measured by a check named in the plan. "Throttled" means `tools/profile.ps1` in headless Edge at 390x844, DPR 2: network at 1.6 Mbps down, 750 kbps up and 150 ms round trip ("slow 4G"), CPU 4x slower. Headless Edge is not a phone; these bound the obvious and leave the real-phone pass to Josh. A missed target says by how much and what one change would meet it, and the controller rules.

| # | Measure | Target | How |
|---|---|---|---|
| P1 | First load, cold (no cache), throttled | the loading screen paints within 1.0 s; the title card is ready within 5.0 s; a warm load (service worker) within 1.5 s | `tools/profile.ps1 -Load` (DevTools timing, a `ready` mark when the title shows) |
| P2 | The stress city's frame at a 4x CPU throttle, 390x844, DPR 2, after warm-up | median ≤ 16.7 ms, p95 ≤ 33 ms (6x: printed, no bar) | `tools/profile.ps1 -Frames` |
| P3 | Memory after a simulated 2-hour session (a Large map, 2 hours at the speeds a player uses, the camera over the whole map at every zoom bucket) | canvas held by caches ≤ 64 MB at DPR 2; JS heap ≤ 150 MB; the heap in the second hour grows ≤ 10% | `tools/profile.ps1 -Session` and the caches' byte counters |
| P4 | A Huge map at 390x844, DPR 2, 4x CPU | median ≤ 33 ms; no frame over 250 ms after warm-up | `tools/profile.ps1 -Frames -Size huge` |
| P5 | The lesson's longest wait at the speed the step plays at | ≤ 30 s (today about 134 s); all waits together ≤ 150 s | a test over `LESSON_SCRIPT` counting days ÷ speed |
| P6 | The handed-over city's rank | the rank its people earned (Village at about 94), next rank ≤ 2x away (Town at 150) | a test at the hand-over |
| P7 | Noise in the first 10 game minutes after the hand-over (a scripted player) | the Messages badge counts nothing the player did, ≤ 5 in all; at most 2 rows under the top bar at once; no fire-risk alert on a lesson building | a scripted test |
| P8 | The heirs against adaptive scripts | 9.0's T1 (great work ±200 days), T2 (Capital ±90 days, year-6 gold ±25%, never below 0) and T3 (no raid lost that the Steady beats, seeds 5 and 10) for every heir | the balance check (suite: Builder T1, Unconquered T3; probe: the rest) |
| P9 | Colour pairs under simulated colour-blindness | dropped by Josh (8 Nov 2026) | none |
| P10 | A thrown error | the loop stops within one frame; the card shows; a tainted city's slot is never written; the save loads after Reload | tests that inject a throw in the tick, the render and a handler |
| P11 | No regressions | every 9.0 frame bound (T8-T11) and balance pin holds, or is re-pinned with a ruling; `mobileBudget` at 375x667 and 390x844, 100/125/150% text | the suite |

## 10. The real-device gap: what Josh must check on a real phone

Nothing since 7.0 has been tried on a real device. This release measures what it can (P1 to P4), but these need a hand and a phone; the follow-ups note will carry them as a checklist:
- **The first two hours, start to finish,** on a phone over mobile data: cold load, the lesson, the hand-over, the first unguided half hour, the first real raid.
- **Warmth and battery** after 30 minutes at 1x and 3x (9.0's frame and DPR caps were meant to keep a DPR-3 phone cool).
- **An hour of zooming and panning on a Large and a Huge map:** does the tab ever reload (Safari's memory limit)?
- **Install, then launch offline** from the home screen; the install ask; Safari's 7-day rule with the rulers.
- **The lesson's road step by touch** (Josh's stuck road, ruling 1210, never proven).
- **Sound with the silent switch on and off;** 150% text; the phone held sideways.
- **The error card:** a dev hook (`?crash=tick`) throws once so Josh can see the card and Reload on the phone.

## 11. What does not change

- **The score's formula and version (2),** the medals and every best's key.
- **The sim's rules and numbers,** except the lesson's own staging (2a, 2c), the lesson's firehouse spot (2b) and the heirs' `TRAITS` data if P8 needs it.
- **No reduced motion** (ruling 1601); no new effects; the art's look.
- **One city at a time and one save slot;** the share link's format; old saves load (an 8.4 or 9.0 save, with or without a lesson city).
- **No server and no analytics.**
