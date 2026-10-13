# Stage 4.6 follow-ups

Carried forward from the Stage 4.6 track reviews and fix rounds, the integration, the balance pass and the whole-branch review (13 Oct 2026). Nothing here blocks the merge. The plan is `plans/2026-10-13-thebes-stage-4-6-land-court-armies.md`, the contract is `notes/2026-10-13-stage-4-6-contract.md`, and every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, part 13, rulings 331 on).

## What changed, measured
- **The test suite** now has over 2,300 tests (2,336 at the balance commit, before the fix wave). Run it with `-WaitSeconds 180`: the default leaves no room. If a run times out, look for stray `msedge` and `python tests/serve.py` processes first.
- **Large (80x80) against Normal (64x64)**, measured by Track 0 on the busiest scene at 390x844, dpr 2: at the default zoom the frame costs the same (0.9x); zoomed all the way out it is 1.56x, just under the plan's 1.6x line. A fully built Large city's month end took 929 ms before ruling 410 and takes about 100 ms after it (Normal 455 to 44 ms). That is a laptop in headless Edge with a software canvas, not a phone.
- **The village balance run** holds 68.2% of taxes spent after the balance pass (it was 71.9% with the new buildings on); years 2 to 7 run at 69.1 to 69.3%. Rulings 430 to 437.

## For Josh to check on a real phone
- **Large map speed on an old phone.** Start a New city at Large and build up to a few hundred buildings, then zoom right out and pan: it should stay smooth, and a month turning should not hitch. If it does, the two measured fixes not built yet are an index of buildings by terrain chunk (so the zoomed-out frame stops scaling with the whole city) and fewer trees drawn at minimum zoom (see below).
- **The flood sheen and the wildlife under Gentle.** Settings, Motion on Gentle, on a Town with a river and farms: from month 7 a still blue sheen should lie over the floodplain, stay through month 9 and be gone in month 10, with nothing shimmering. Gazelles and ostriches should drift at half pace, birds and hippos should stay readable at phone zoom, and under Still nothing in the wildlife should move.
- **The court's letters at 150% text.** Let a request or an event card arrive with the text size at 150%: the letter should open as one sheet with Send (or the first choice) visible without scrolling, the deadline and what refusing costs in words, and the alert row should stay to one line.
- **Enter to confirm on a desktop.** Draw a road, a wall and a plot, and place a ghost: Enter should lay each one, even straight after clicking a card, and Esc should take it back. A phone should show no Enter hint on the confirm bar.
- **The Paused tag.** On a phone, pause: the corner button should turn amber and show a "Paused" tag on its top edge, and turn back to blue when playing; the pause bars should be as tall as the play triangle.

## Deferred from the reviews and reports
- **Hunters walk straight across water.** A hunter's walk from the lodge to a herd is a straight line on screen, so across a river it crosses the water. It is drawing only (the sim does not care); a path around water would fix it.
- **"Seven wonders" is now 7 of 10.** It still asks for seven kinds, now of ten, so it is easier than it was (ruling 411).
- **The average flood is x0.98, not richer.** The plan's Fair flood at x0.9 puts the average level at 0.98 (0.15 x 0.6 + 0.35 x 0.9 + 0.35 x 1.1 + 0.15 x 1.25), so the floodplain's average harvest is just under the year before it, not above. The 4.6 release note that said the fields grow richer is corrected in the fix wave. Raising Fair to 1.0 would make the average 1.01; it is not done because Josh asked for a rhythm, not a boost.
- **The balance margin under 70% is under a point.** The village that holds 60-70% sits at 69.1 to 69.3% in years 2 to 7, so a small cost added later tips it over. A village that builds the lodge, the wharf and the range on top of a full village runs at about 81% (still about +1,200 a year).
- **Playable old builds are not built (ruling 403).** What's new lists every past build with its notes, but the old builds themselves are not hosted: they cannot load newer saves, and every copy adds to the site and its offline cache. Ask again if you want them.
- **Old share links of non-classic layouts open a different map (ruling 415).** The five other layouts draw new shapes at 64 now, so a Stage 4.5 link to one of them lands on a different map from the one sent. Classic links and Normal-size keys are unchanged.
- **The two Large measures not built.** The index of buildings by terrain chunk and the cap on trees drawn at minimum zoom (contract note, section 9) are for a phone that shows it.
- **Ruling numbers whose text came from the track reports.** Rulings 351, 353-357, 373, 377-379 and 397 had no text in the repo and were recovered from the track reports; 358, 359, 398 and 399 were never used. Where a fix round reused a number, the later ruling carries a letter (352a to 355a, 375a, 376a, 380c to 385c, 383a, 386a, 386b, 396a). Part 13 lists them all.
- **More to come in Stage 5.** Missions will build on the court's letters, the armies' unit types and the new monuments; the court has eight cards (more can be added), and favour, food and the units' types are not scored yet (ruling 344).

## Process lessons
- **The screenshot tool needed a hard time limit.** On a loaded machine headless Edge sometimes never answered, and a caller waited forever, spinning a core. After three stalls (a stray measurement script, a hung shot from the Wonders worktree, an unbounded wait loop on 24 shots) `tests/screenshot.ps1` gained `-MaxSeconds` (150 by default) and a reaper that stops the script, its Edge and its server (ruling 417).
- **A watchdog was needed in the meantime.** A background watchdog killed shot scripts over 6 minutes, bash wait loops over 10, suite runs over 20 and the game's headless Edge over 25. It is stopped at the end of the run.
- **Agents wrote unbounded wait loops.** Every later prompt asked for a `timeout` on every wait and for the agent's own servers and Edge windows to be stopped before finishing.
- **Four suites at once look like a stall.** When agents ran their full suites in parallel the machine slowed and every agent went quiet for minutes; that was load, not a hang. Check for strays (`Get-Process python*`, `msedge`) before killing anything.
- **Ruling numbers clashed.** The Map and Court tracks reused numbers in their fix rounds (Court took 380 to 385, which were the Armies track's). Give each track a range and tell fix rounds to use letters, and check the report against the range before merging.

## The fix wave (rulings 440-460)

Two rounds after the whole-branch review (wave A: the court, armies and raids; wave B: river words, the cartouche, release notes, hunting). What changed:

- **Court gift at 70.** The gift is checked with favour as the month ends, before the drift, so a city held at exactly 70 gets it (440).
- **The score ignores favour.** The defence term reads the raid size before favour's step, so low favour no longer dents the score (441).
- **Peaceful words.** The first letter and How to play speak only of gifts, and the court sheet says a warned raid keeps the size and tribute set at its warning (442).
- **Units lost when their building goes.** Units away whose barracks, range or stables is demolished or burned leave service: the court sheet says so, they are captioned, and Demolish asks first (443).
- **Card numbers locked to what was shown.** A card applies the effects its sheet showed, or refuses with a caption if the city changed since; a closed letter on show says so instead of swapping (444, 447). River hooks are asked on copies so the interface cannot steer the sim (445).
- **Soldiers request in a raid warning.** The consequence line says a warned raid arrives in N days and the lent units will not fight it (443); food requests size the lodge and wharf as production makes them (448).
- **River words and remarks.** The crocodile line, food causes, the flood outlook and the river remarks now match the sim, and wait for the city's first flood (451-455). Boat raiders land on a new bank if the old one was built on (449).
- **Cartouche tie gone.** The tie is removed from the title and every sheet heading; the round loop stays (450).
- **Release notes with builds.** Every release in What's new shows its build, and the 4.6 notes are final, with the flood average corrected (459).
- **Sustainable hunting (460).** A hunt takes one animal (6 game), one a herd a month, never below 2 in a herd; herds regrow 1 a month; two herds keep a lodge at 10 or more a month.
- **Wharf and lodge sheet labels.** "Stores within N road tiles", "Hunting the herds" and "Fishing the river" (456); speed step titles name keys only with Keyboard shortcuts on (457).

Open items from the fix wave:

- **Re-check the 10-year village ratio under ruling 460.** The balance run (68.2%) was taken before the sustainable hunting rule; if a later change alters food (herds, lodge take, flood levels), run the 10-year village again.
- **The balance margin under 70% is under a point** (69.1 to 69.3% in years 2 to 7), so a small cost added later tips it over.

