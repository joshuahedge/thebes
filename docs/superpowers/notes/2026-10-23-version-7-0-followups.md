# Version 7.0 follow-ups

Carried forward from the track reviews, the balance pass, the final review and the fix wave (23 Oct 2026). Nothing below blocks the merge. The plan is `plans/2026-10-23-thebes-version-7-0-a-living-world.md`, the contract is `notes/2026-10-23-version-7-0-contract.md`, the balance record is `notes/2026-10-23-version-7-0-balance.md`, and every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, Part 18, rulings 850 on). The 6.0 items still open are in `notes/2026-10-22-version-6-0-followups.md`.

## For Josh to check on a real phone and keyboard
Nothing in 7.0 was tried on a real device; every screen was read in headless Edge at 375x667, 390x844, 667x375, 1280x800 and 1920x1080, at 100% and 150% text, under Gentle motion.
- **The Trade sheet, one-handed.** One route open at a time on a phone: check the switches (On or Off), the Keep at least steppers and the "held for the temple" line are reachable with a thumb, and that Open route on Punt reads as disabled but legible.
- **An event card, read and answered.** It fits without scrolling at 390x844 and 100% text; check every choice states its consequence before the tap, the disabled gold choice and its reason read, and the stated default feels fair when a card lapses.
- **Night on his phone.** The six-minute loop, the lamps, and that the top bar, labels and markers stay readable; Settings "Day and night" turns it off, and Motion Still keeps daylight.
- **Sound volumes.** Music and Effects steppers under the Sound master (Sound Off dims both rows and silences the music): check the new effects (place, road, fire, battle, caravan bells, boat oars) sit under the music at the default 100, and that the tense music reads as danger without being harsh.
- **The Quay and a river route.** Placing a Quay on a bank with a road, the boats sailing in and out, and a refusal's Show me; the oars cue needs Nubia's or Punt's boat, so check it plays on a real river map.
- **The lesson card's pause and auto-play.** Each step comes up in the middle of the screen and pauses the game; Show me, Got it, Enter, Space or Esc docks it; the game plays again by itself when the step is done. Check the card is easy to read and hard to ignore, Leave the lesson is always in reach, and the firehouse and workers steps do not ask for Play when the game is already playing.
- **Delete and Backspace on a real keyboard.** With a building's sheet open (demolish, with its own question), with no sheet open and an Undo toast up (takes back the placement), with an Undo toast and another sheet open (nothing, or Demolish of the building whose sheet is open), after a demolish (never undoes it), and with Settings or the event card open (nothing). Space after clicking a speed button should pause.
- **Placing a farm and reading the reason line.** Each square shows as right or wrong with a mark, the line says what is missing in plain words ("a road one tile away does not count"), and the banks hint for the Quay is clear; check on the smallest phone at 150% text, where only about 160 px of map is free above the bar.
- **House plots before settlers.** The pegged-out markers read at every zoom, including the Huge map's floor, and a monument site shows its marker before work starts.

## The final review's deferred items
The Opus decision pass ruled these not worth blocking 7.0 (rulings 995-997 cover three). Each has its one-line why.
- **Quay Advice item is silent once any Quay stands**, even roadless, paused or short of workers (`adviceFixes.js` `quayItem`): the Quay sheet and the route card already say why in coral.
- **Trade sheet: Keep at least help ignores route switches, and "held for the temple/court" shows in Ignore and Buy**: polish; no wrong action results.
- **The road fix's "here" has no lasting marker** (`advice.js`, the tower step "Lay a road to here"): needs a render marker; Show me's pulses exist.
- **Event card scrolls at 375x667 at 150% text and at 667x375, and its default line falls below the fold at 1280x800 at 150%** (ruling 997): the rule is no scroll at 390x844 at 100%, and that holds.
- **The Ground legend card could fold while placing at 125% text and above** (another 66 px of map on a small phone).
- **Compact 667x375: Show me sits below the placing drawer's fold**: move it into the button row beside the X and the check.
- **A two-row top bar overlaps the alert row by 4 px** (`--topbar-h` assumes 49 px): drive it from the measured height.
- **The placing bar covers the tray and half of Layers at 1280x800 at 150% text**: fold the tabs row while a tool bar is up, as sheets do.
- **Number keys change the build category while a sheet is open on a wide screen**, where the tray is folded (`createUI.js`): ignore them while a sheet is open there.
- **Picture cards opened from How to play also close How to play**, and a first-moment card closes the Trade sheet under it (`menu.js`): from before 7.0.
- **Opening a sheet does not move keyboard focus into it** (`sheets.js`): from before 7.0.
- **`aria-keyshortcuts` are missing on the zoom buttons, M and ?**: the speed steps already carry the keys in their titles.
- **The waiting event's Advice weight** (ruling 996): balance's call; its alert row with View always shows it.

Dropped as not real: the Advice top-5 cap hiding the event item (it has its own alert row), boat mooring in the render (slots and paths are correct), `openRoute` returning no warning for a river partner (the route card shows the coral reason), "Delete works with single keys off" (it does not; only the lesson card's Space is outside the single-keys switch), and "a blue square is right" (the met square does draw blue, faintly over fertile green).

## Accepted minors (left as they are)
- **Three pick-path ghost tests in `tests/v70/p/review.test.js` pass with or without the fix**, because the test page's geometry never puts the ghost behind the corner buttons; the Show me and `placingInsets` tests do fail without it.
- **The farm-warn ghost at 375x667 and 150% text** sits a few pixels under the Paused badge on Play; the badge is decoration.
- **The Keyboard entry in How to play says Space closes a lesson card twice**; `REASONS.event_hold` is used only by `reasonText` (the sheet shows the more specific `CITY_EVENT_TEXT.hold`).
- **The desktop season line is 12 px soft-ink text** under the date, faint but legible; the `hud.js` ResizeObserver is never disconnected (page lifetime).
- **The Opet "smaller" festival** gives the same mood as the full one (it differs by no favour and no incense); the card says so honestly.
- **The lesson card's Space** works even with Settings "Keyboard shortcuts" off (How to play now says so: Esc, Enter and Ctrl+Z always work, and Space closes a lesson card); Delete does not.
- **Wall-clock tests can flake on a loaded machine**: the stage 2 placement preview (22.9 ms against a 20 ms budget once) and Track S's frame budget; rerun once before treating one as real. On mains power the full suite passes in about 9 minutes; on battery it ran past 20.
- **Dev scene oddity**: the `v70-trade` scene opens a "Large plots" picture card over the sheet unless every card is marked seen.
- **The v9 fixture is synthetic** (a v10 save of the sample city with the new fields removed), enough for a migration that only adds fields.

## Balance (carried)
- **`setLegacyTowers` is still kept for the grand and great-work runs** (ruling 978): the real advice with extra habits held the grand run and one great-work run and sank four configurations, so no driver lives with the 7.0 tower advice for ten years; it is proven by `tests/v70/a` and the late run's raids.
- **The village and capital runs have no events** (ruling 975): the capital's years 2 to 6 meet events only in the dangers-on late run, where they are on from day 0.
- **The great-work run's grand years keep the hold on events in the dangers-on runs** (ruling 976): their Estate and Seat rest on the 6.0.1 coin.
- **The 6.0.1 open question stands: dangers on at the Seat.** With the dangers on from day 0 the seed-5 run needs the player's habits for finding workers and with them seed 10 never reaches the Seat; seeds 6-9 do not reach it with any script tried. 7.0 events on from year 10 left the two pinned wins as they were (seed 5 won day 6,669, seed 10 day 6,084). Still for Josh: whether that is enough, or whether the way to the Seat (workers at Capital with the dangers on) needs its own look.
- **No `src/data` number changed** (ruling 981): a keen player who pays for every event meets the thin great-work treasury sooner than the script, which pays at most a tenth of the treasury beyond a spare.

## 6.1 carry-overs, already agreed
- **"Skip, I've played before" on the lesson.** Josh's call after the 23 Oct playtest; it contradicts ruling 617 (the lesson is mandatory once per device for a player with no saved city), so 6.1 must reverse that ruling and say so.
- **The Huge map on a mid-range phone is untested** (carried from 6.0: about 29 ms a frame at its zoom floor in headless 1920x1080); seasons and the light pass add at most 2 ms a frame there (test), but nobody has measured a real tablet or phone.

## 7.1, already asked by Josh
- **A further bug review** of the whole game, as the 7.0 final review found two critical bugs (Delete misfiring, strike cards that lied) a track review missed.
- **More map variety**: more river placements, multiple rivers, wider estuaries, and ferries where rivers are wide. The Quay's rule (ruling 871: river water along a long side, and a road) and the boats' paths are what these would touch.

## Store plan (after 7.0, not started)
Unchanged from 6.0: Steam via Electron (Windows first), Google Play via Capacitor, a paid one-off price on the stores, the web version staying free. Ruling 850 keeps 7.0 free of anything that needs the network after load. Before either: the real-phone checks above.

## Process lessons
- **Opus reviewed twice and found what Sonnet reviews missed.** The final review's critical findings (Delete undoing behind other sheets and undoing a demolish, and the strike and quarrel cards promising a stop that one free Resume ended) were found by reproducing in a browser and reading the sim, not from screenshots alone.
- **Words against the sim stayed the rule that finds most.** Opet's full festival was always offered and always refused (incense only comes from Punt), and the stranded-store advice promised stock only a slow Fetch order brings.
- **A shim hides a break until it is removed.** The event hold and `setLegacyTowers` kept the 6.0 runs green; removing them showed the great-work seed-5 win had been a coin on the towers, not on the events.
- **One full suite at a time**, and it took 20-30 minutes on a loaded or battery-powered machine; batch work so the branch needs few full runs.
