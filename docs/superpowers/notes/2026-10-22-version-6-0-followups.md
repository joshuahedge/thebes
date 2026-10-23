# Version 6.0 follow-ups

Carried forward from the task reviews, the balance pass and the final review (22-23 Oct 2026). One item below is a decision for Josh and comes first; the rest does not block the merge. The plan is `plans/2026-10-22-thebes-version-6-0-a-harder-nile.md`, the contract is `notes/2026-10-22-version-6-0-contract.md`, and every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, part 16, rulings 610 on). The balance record is `notes/2026-10-22-v60-a-balance.md`.

## Open balance decision: the great work with the dangers on
**Outcome (Version 6.0.1, rulings 800-807, branch `gw-balance`):** Josh chose option 1. Half strength won seed 10 but not the tuned seed 5 (course 8 of 10), so it is stepped to none: while the great temple rises no plague, low Nile, locusts or blight is drawn or warned, one warned before the founding lapses, raids and fire are unchanged. With the dangers on from day 0 the tuned seed 5 wins on day 6,699 (lowest gold 23,030 from year 10, no raid lost) and seed 10 on day 6,097 (lowest 4,490, no raid lost), but with two scripts: seed 5 needs the player's habits for finding workers (802), and with them seed 10 never reaches the Seat. Still open for Josh: whether that is enough, or whether the way to the Seat (workers at Capital with the dangers on) needs its own look. Seeds 6-9 do not reach the Seat with the dangers on with any script tried. Detail: the balance note's "Version 6.0.1".

The text below is the decision as it was put to Josh.

**The great work can be won with the dangers off, but not with them on.** The scripted great-work run wins with the dangers off (day 7,030 of 7,200, lowest gold 2,171, 7 of 7 raids beaten; the margin is pinned, ruling 785). With the dangers on it never wins, in any of the four variants tried after the fix wave: from day 0 the city never reaches the Seat (lowest gold -21,163 and -19,130); a year after the Seat the temple stops at course 5 of 10 (lowest -9,251); from the Seat it reaches course 9 of 10 with 5 offerings in (lowest -5,463, 2 raids lost). A crew works a day only while the treasury is at 0 or more, so once the dangers push the city into debt the temple stalls and the debt grows. Twelve data variants in the balance pass (gentler dangers, cheaper ranks and dues, a lighter temple, smaller offerings, a bigger cushion) moved nothing useful, and the one winning dangers-off seed flips with any change. The scripted player is a steady one, so a real player may do better or worse; nobody has measured one.

Josh needs to pick one (each is a rule, not a number hunt):
1. **Soften the dangers while the great work rises**: for example no new plague, low Nile, locusts or blight strike while the temple is under way, or half strength. The finale becomes a build and defend test; the dangers stay for the rest of the game.
2. **Let crews work into a small debt**: for example down to a floor of a few thousand gold below 0, as the building tool already allows a debt floor. The temple no longer stalls, but a city can win while broke.
3. **A lighter temple**: fewer courses or smaller offerings. The balance pass tried smaller offerings and the winning seed turned into a debt, so this needs the dangers handled too, or a cheaper founding.

Related, already done (ruling 788): the court takes no due from a treasury below 0 while the great work rises. It did not save the run. Ruling 786 added the Advice item for a waiting offering (beer 300 against 250-300 held).

## For Josh to check on a real phone
Nothing in 6.0 was tried on a real phone; every screen was read in headless Edge at 390x844, 1280x800 and (for the title, Huge and the polish pass) 1920x1080.
- **The lesson end to end**, in portrait and landscape: 14 steps from the first road to the fire and the raid warning. Check the lit ring is not cut at an edge, the one guidance row reads (landscape cuts the tower row at two lines), and the end sheet leads to the title.
- **A raid battle on Gentle and on Full.** Poses, arcing arrows, the chieftain's banner and the result row in the alert row; check it reads without being busy and the raid result does not hide a fire or a warning.
- **A Large plot from lay to Manor.** The card, the marked lot with its checklist, people moving in as a stocked Manor, and the climb.
- **A court demand, accepted and failed.** The sheet states reward and failure before Accept; check the deadline in months reads, Decline costs what it says, and a failed one lowers favour as stated.
- **Plague and quarantine.** The rings on the Health layer, the quarantine button's price and what stops; check the quarantine group is easy to find on a long home sheet.
- **Huge map frame rate.** It draws at about 29 ms a frame at its zoom floor in headless 1920x1080 (11 ms for the 64 map); check a mid-range tablet and a phone's note.
- **Sound on the first tap.** It is on by default; check the first tap starts it on iPhone and Android and that Settings turns it off.
- **The title's Settings scroll** at 390 wide and at 150% text: the last row sits clear above Back (the final bar tweak was not re-shot).
- **A v5 save loading** with its three-year grace: merged homes kept, rank and treasury kept, no new danger for three game years from the load day, and its first court due a year after the load.

## Accepted minors (left as they are)
- **great_offering words.** When the producer exists but has made nothing yet, the fix says to build one; it could say "or wait for it".
- **A waiting offering's Show me** on the great-work site sheet aims at the site centre, where the sibling rows aim at the nearest terrain tile for a terrain-bound maker.
- **`lotReady` is uncached** (the right trade for ruling 445): `vacancies()` walks `lotNeeds` once per empty Large lot per arrivals batch and per court `room()` call. Watch a late city with many lots.
- **The court's "due now" line** says what today's treasury would pay; it can be stale by the due day.
- **`dropReportCaption`** clears the whole caption queue, not just the report caption, so a caption waiting behind it is lost.
- **Landscape phone, lesson tower row**: the row that carries the raid warning is cut at two lines, so "build a tower near the bazaar" sits behind More.
- **The lesson's start failure toast** (`startLesson` and `replayTo` in `boot.js`) is untested; and "Continue the lesson shows for good" was reviewed but could not be reproduced (open and leave at step 0 gives Start the lesson; Continue appears only after a step is done, tested both ways).
- **The Settings Back bar's final tweak** (a top border) was not re-shot.
- **`dueFromDay` infers the load day** from `graceUntil - GRACE_DAYS`; it holds for v8 loads, new cities and tests, but is a coupling if `graceUntil` is ever set another way (the dev scene does, harmlessly).
- **Wall-clock test limits** (`tests/v60/b2/budget.test.js`, the dangers run's 60 s bound, 3 ms layer cost) could flake on a loaded machine: rerun once before treating one as real.
- **Huge is sampled in the size sweeps** (25 seeds a layout, and 12 in the start-guarantee test, against 200 at other sizes), so the suite stays inside its time.
- **The advice tower fix on the grand district** still puts the tower where the nearest road spot is 13 tiles from the first target; the grand dangers-on run survives only through the run script's own `defend` spots.
- **Raid picture cards** `homes.webp` and `ahead.webp` came out byte-identical when remade; the raid card was remade.
- **How to play says "Arrows or WASD"** while a scrolling panel owns the arrows; WASD still pans.
- **The Large plot card's Manor goal** and the Home progress tick for a small-plot Townhouse were reworded in the fix wave; both are worth a read in play.

## Carried from 5.0, still open
- **`Zoom 1`, Large against Normal, is about 1.27x**, and Home progress costs about 25 ms a frame at 1,720 homes (zoom 0.5). No suite assertion pins the draw-cost figures.
- **Ruling 600**: confirm in play that the first warned raid ranking first feels right, now with six more danger kinds in the list (ruling 690 puts urgent dangers first).
- **Ruling 586** was addressed in words only (ruling 710): the advice names the Estate trick but cannot tell when its Fetch step is done.

## Store plan (after 6.0, not started)
Ruling 610 keeps the stores out of 6.0 and says nothing in 6.0 may need the network after load; nothing does (the game is plain files, saved on the device, with sound and music made in the browser).
- **Steam, via Electron, Windows first.** Wrap the site in an Electron shell; the desktop keys and the 1920x1080 layout are already in.
- **Google Play, via Capacitor.** The same site in a Capacitor shell for Android; the phone layout and tap sizes are already held by the mobile budget tests.
- **A paid one-off price** on the stores.
- **The web version stays free** at the GitHub Pages address.
- Before either: the real-phone checks above.

## Process lessons
- **Josh's mid-run switch from Fable to Opus 5.5 (22 Oct) cost nothing visible.** Track 0, Track A, the hard merges and the final review ran on Opus 5.5; the Sonnet tracks needed one fix round at most.
- **The final review found twelve must-fixes in words against the sim** (drought share, quarantine price, give-up words, lesson raid timing, grace words) and two in determinism. Words-match-the-sim stays the rule that finds the most.
- **A memo that outlives a call breaks determinism**: day-long caches in `lotReady` and `plagueHalted` made a sheet open change the tick. Ruling 445 (ask the same question the tick asks) is the rule; re-read it before caching anything in the sim.
- **Run the balance pass with the dangers on, as a separate step.** Ruling 689 kept the older runs' grace endless so their asserts held; only the new dangers-on runs (783) found that the finale falls into debt.
- **Only one full suite at a time**: a loaded machine timed full runs out several times (each rerun passed). The suite is about 3,380 tests and takes about 6 minutes alone.
