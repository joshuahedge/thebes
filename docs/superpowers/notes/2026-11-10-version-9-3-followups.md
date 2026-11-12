# Version 9.3 follow-ups

Carried forward from wave 0, the tracks (H, B, G, N, M, P for "A city that grows"; D0, R, S, U, K for the decree), the final review and the fix wave (10 Nov 2026). Nothing below blocks the merge except the speed fix, which is not in this branch yet. The designs are `specs/2026-11-10-thebes-version-9-3-a-city-that-grows-design.md` and `specs/2026-11-10-thebes-version-9-3-the-weekly-decree-design.md`, and every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, Part 30). The live build is https://joshuahedge.github.io/thebes/.

## What shipped
- **A city that grows.** Town, City and Capital each bring a look, spreading from the palace over 4 months, with a gold ring under Full motion (rulings 1885 to 1889, 1930 to 1934). Homes in three shapes (1890 to 1899, 2010 to 2014), services and workshops by look and state (1900 to 1909, 2005 to 2009), ground, yards, roads and streets (1910 to 1919, 2012, 2013), the rest of the art in soft shadow (1920 to 1929), and the caches by device (1935 to 1939).
- **The weekly decree.** Nine decrees, six years, out of 600 with a bonus part (rulings 1950 to 1964), its own save slot, records and links (1965 to 1974), its screens (1975 to 1984, 1995 to 2004) and its bars and medals (1985 to 1994). It is named **The Vizier's Levy**, not the roadmap's "Pharaoh's levy".
- **No world-version bump.** WORLD_VERSION stays 12; `b.day`, `world.decree` and its `noted` are optional, and the two new tallies are kept out of `TALLY_KEYS`.

## For Josh to check on a real phone
Nothing since 7.0 has been tried on a real device. The first group is carried from the 9.2 note (each still open); the second is 9.3's own.
- [ ] **The first two hours, start to finish,** on a phone over mobile data: cold load, the lesson, the hand-over, the first unguided half hour, the first real raid. (carried)
- [ ] **Warmth and battery** after 30 minutes at 1x and 3x. (carried)
- [ ] **An hour of zooming and panning on a Large and a Huge map:** does the tab ever reload? (carried)
- [ ] **Install, then launch offline** from the home screen; the install ask; Safari's 7-day rule with the rulers. (carried)
- [ ] **The lesson's road step by touch.** (carried)
- [ ] **Sound with the silent switch on and off;** 150% text; the phone held sideways. (carried)
- [ ] **The error card:** `?crash=tick`, `?crash=render` and `?crash=ui` show the three cards. (carried)
- [ ] **The lesson's raid framed on your phone:** the tower, the target and the raiders all in view from the first warning. (carried from 9.2)
- [ ] **Pinch zoom** on the map and on a sheet, and that a two-finger touch on the bars does not zoom the page by accident. (carried from 9.2)
- [ ] **200% text** on a phone: the top bar, the rail, a sheet, the lesson row. (carried from 9.2)
- [ ] **Fit the city** from the Minimap's button on a phone. (carried from 9.2)
- [ ] **The end card at 150% text** (the lesson's): both choices visible, Back and the row's What next? bring it back. (carried from 9.2)
- [ ] **The Health layer's legend in sunlight:** the solid and dashed edges read at arm's length. (carried from 9.2)
- [ ] **Day and night, and the music, on a phone in sunlight.** (carried from 9.2)
- [ ] **Does the tab reload on a Capital mid-rebuild?** A phone, a Large map, the Capital rank just reached, panning and zooming while the front crosses the city (ruling 1936: 24 MB of sprites and 72 MB with terrain on a phone).
- [ ] **An iPad on a Capital mid-rebuild.** Safari reports no `deviceMemory`, and an iPad's short side is 768 px or more, so it would have had the desktop's budgets; ruling 1944 gives a touch device with no `deviceMemory` the phone's (24 MB and 72 MB). Check that no tab reloads.
- [ ] **A decree run on a real phone, start to finish:** the title card, Start and Begin, the chip, 150% text, a forbidden card in the tray, the end card with Share, Try again and Back to your city, and Continue after leaving mid-run.
- [ ] **A decree link from a friend** opened on the phone, and sharing your own: the picture and the `#d1` link.
- [ ] **A look change seen on a phone:** the ring under Full motion, the front crossing homes, no flicker or stutter, and the Capital's street at play zoom.

## What 9.3 left
- **Speed on the 112 map (known item 1).** Before the fix it was slower than 9.2 at p50 (20 to 37 ms desktop, 33 to 50 ms phone). Rulings 1940 to 1942 cache each building's slot and look. After the fix, on a quiet machine (600 frames, moving camera, lower of three):
  - **Phone, DPR 2:** p50 8 to 11% above 9.2, p95 11 to 12% above.
  - **Desktop, DPR 1:** p50 +29 to 41% (17.7 to 25.0 ms on the Capital), p95 within 5 to 14%.
  - **Desktop, DPR 2:** level or faster.

  A still camera costs only 0.5 ms more than 9.2, so what remains is sprites drawn fresh as the camera moves (more slots a building: variants, looks, states). Next: warm the sprites of the buildings just outside the view in idle time, or draw a building's far sprite while its near one is drawn. Check it on a real phone first (headless Edge draws without a graphics card).
- **Ruling 1989 (known item 11), settled.** Josh: "Sea Peoples cannot be on Oasis". `decreeMapOf` gives a Sea Peoples week the classic river on the same seed, so the launch week, 2026-W47, has a river and its boats.
- **Ruling 1988, the script or the game (known item 12).** The scripted six-year city declines in its last year (drought from month 61, mood 14, culture to 1), so a bronze is 210 on Plague and 410 on the Host. The review's collapsed city scored 108, which says it is the game with no play, not the script; the medals were left as measured.
- **The 13 known items.** 1 (speed) by 1940 to 1942; 2 (the bar) is paid by 2005 to 2009; 3 and 4 (big homes, the Capital's street) by 2010 to 2013; 5 to 10 and 12's evidence by 1993 to 2004; 11 and 12 as above; 13 (U's sed edit of `src/ui/s47/carts.js`) was reviewed and is correct.
- **The review's findings left.**
  - **M1 and P1** are fixed by rulings 1943 and 1944.
  - **X1 (could), `tests/screenshot.ps1`:** the page domain was not enabled, so injected scripts did not run. A commit on the fix wave (e18f608) answers it; the 8.0 "shots under Gentle" rig has been off since 8.0, so old shots labelled 150% may be at 100%.
- **Left by the tracks, by ruling.**
  - 1929: the raider chariot, elephant and raider boat shadows, the ibis, heron and hippo shadows, the fishing wharf and the charred stump have no foot shadow.
  - 1919: a chunk bakes about half as long again; two bakes a frame is still the limit, and a slow phone takes about 1.5 times as long on two (a cap for the phone is open).
  - 1937: at DPR 2 a desktop on the 112 map's far view holds about 130 MB of canvas, because a frame's own need is never evicted.
  - 1991: a small city still avoids sickness, so The Plague's bonus asks for 15 Cottage homes; and 1990: Fire season's bar is a cap of 60 months.
  - 1986, 1992 and 1994: a bar from a player the decree does not assume (the Levy's, the Host's) may be easy or hard for those two; no one has played one.
  - 1898: `HOUSE_TODAY` and the older drawings stay as dead code for the look sheet.
  - 1993: the decree-ended scan reads source text, so a command that answers in another shape slips past it.
- **Also still open from 9.1 and 9.2:** the service worker's all-or-nothing `cache.addAll`, no bundle, a 30 to 60 minute suite, and the 9.2 list (T5, the heirs' great works, the middle monuments, B3).

## Process
- **Rule slips by agents:** the fix wave's sed edit of `src/ui/s47/carts.js` (reviewed); this docs pass used a short script to write the What's new entry and `perl` to move the old release tests' indexes by one, and each was checked against its diff.

## For 9.4
- The decree's numbers are data (`src/data/decrees.js`) and measurable (`tests/run-tests.ps1 -Grep "v93 k balance"`); retune only with a run in hand.
- The look tables are per type; a new building type needs a `*_LOOKS` entry and a place in the bar test's exempt list or a draw that calls the bar.

## 9.3.1 (11 Nov 2026)

A patch of mobile fixes on 9.3 (rulings 2015 to 2040, Part 30 of the rulings file; the group notes are `2026-11-11-version-9-3-1-rulings-{l,t,n,g,c}.md`). The source is `2026-11-11-mobile-ux-review.md` (3 must, 15 should, 14 could, all from emulation). Every must and should item is fixed or ruled; Josh's three asks (the title logo stays put, the placing outline under the houses in front, a straight bridge or ferry) are in.

### What the review's could items still hold
None of the 14 was touched. Each is small; do them together as a polish pass.
- **C1** "Show me" comes in three looks on one sheet: one outlined style for row actions, filled only for the sheet's single next step.
- **C2** On a phone, How to play leads with Keyboard shortcuts; put Touch second and the keys near the end.
- **C3** A building's "Pause" reads like the game's Play and Paused; Demolish is the strongest button in the row and has no question.
- **C4** Layers: "Off" is drawn as the filled, chosen button.
- **C5** The Menu's first item is a filled "Continue", the third meaning of that word. **Done in 10.0 (Track M, ruling 2308): outlined.**
- **C6** The Undo toast sits on the Paused tag at 150% (add the tag's height to `--toast-lift` while paused). **Done in 10.0 (Track M, ruling 2309).**
- **C7** The lesson's first tool bar talks about bridges and ferries before the one instruction; with 9.3.1's straight crossings, hide the water line in the lesson. **Done in 10.0 (Track M, ruling 2300).**
- **C8** A new map opens with a wedge of plain tan past its corner.
- **C9** The decree card says the decree's name three times.
- **C10** After a decree, the title says "Rulers (1)" for a decree row.
- **C11** The date explainer's action is a two-line sentence-button.
- **C12** In a built-up city a double tap selects a building before it zooms. **Done in 10.0 (Track M, ruling 2301).**
- **C13** The New city card at 150% on an SE hides Hard and the map choices (drop the Thebes cartouche on short screens). **Done in 10.0 (Track M, ruling 2304): Hard is whole above Start; the map choices are one scroll down.**
- **C14** Placing at 150% on a 360 phone leaves about 40% of the screen for the map. **Done in 10.0 (Track M, ruling 2302) for phones under 700 px tall.**

### What the groups left
- **S8, sticky tabs (ruling 2024).** The City page folds into rows on a phone, but its Messages and City tabs are not sticky and the two sheet titles ("Messages and advice", "City summary") are unchanged. Only the folding was done. **Done in 10.0 (Track M, ruling 2307): sticky tabs, one title ("Your city").**
- **S14, the iOS zoom cap (ruling 2019).** **Done in 10.0 (Track M, ruling 2305): the bars lose pinch-zoom and a two-finger touch that starts on a bar is cancelled; only a real iPhone can confirm.** `maximum-scale=2` closes the case on Chrome; iOS Safari ignores it by design, so an iPhone can still pinch the page past 200% from a bar. The review's other fix (reset the page zoom when the map takes a pinch while `visualViewport.scale > 1`) is not done.
- **The landscape lesson row clamp.** Sideways (844x390) the lesson row is still line-clamped; ruling 2015 un-clamped the words on a portrait phone only. Check it at 150% sideways. **Checked in 10.0 (Track M, ruling 2306): not clamped at 844x390, 100% or 150%.**
- **The Ground legend's words at large text** (9.2 ruling 1827) **Done in 10.0 (Track M, ruling 2303): the room key is drawn at 125% and above on phones at least 700 px tall; on a short phone (375x667 at 150%, or sideways) it stays for screen readers, which Josh accepted on 12 Nov, decision 2).**
- **The 375 lesson ring.** At 375 px wide the road step's long ring is still about 20 px off the screen's far side, the cost of ruling 2026 (the marked end 56 px from the edge; it amends 1674's and 821's whole-ring rule). The drag is still along the line. **Done in 10.0 (Track M, ruling 2306): the ring's middle is clamped at least its radius inside the screen.**

### For Josh to check on a real phone
Emulation could not show any of these (the review's closing list, plus the straight crossing).
- [ ] **Edge-swipe zones.** The lesson's road step (the marked end now 56 px from the side) on an Android with gesture navigation: does the first drag start without being taken as Back? Does iOS's edge swipe in Safari interfere?
- [ ] **The keyboard over the name fields.** Pass the throne's name field (y 722 to 766 on an 844 px screen) and Options' ruler-name field: do iOS and Android keep them visible above the keyboard?
- [ ] **Safari's address bar.** On an iPhone, with the bottom bar showing and hiding, does the dock stay in place and the sheets keep their height (`100dvh`)?
- [ ] **A straight crossing drag by finger.** Drag the road tool and the Crossing card across water (a bridge up to 4 tiles, a ferry 5 to 12) with a finger: does the line follow the finger's furthest axis, does a drag that starts or ends in the water land on the banks, and does a short finger lift on the road tool read "drag on to the far bank" (rulings 2035 to 2038)?
- [ ] **Back from each of the five surfaces** (explainer, Speed popup, tray, title panels, lesson card) on a real Android, in the installed app.
- [ ] **Pinch on a bar** on an iPhone: how far the page zooms (ruling 2019).

### Process
This docs pass shifted the old release tests' `RELEASES[n]` indexes by one with a short `perl` command (as 9.3's docs did), checked against the diff.
