# Version 9.2 follow-ups

Carried forward from wave 0, tracks L, Q, S, D, W, A and V, the balance check, the two reviews and the fix wave (8 to 10 Nov 2026). Nothing below blocks the merge. The design is `specs/2026-11-08-thebes-version-9-2-design.md`, and every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, Part 29). The live build is https://joshuahedge.github.io/thebes/.

## What shipped
- **The lesson (Track L and its fix wave).** The raid is in frame on a phone (it comes in by the south edge), a stray road in the lesson is refused with the reason, a road that joins nothing is outlined in amber in every city, the month step plays at double speed, and the end card (Keep building this city, Start my own city) ends both paths (rulings 1755 to 1772, 1870 to 1874).
- **A quiet city (Track Q).** Alerts roll up by cause, Fix these first, one court letter at a time, goals in the wide panel, markers at a distance, Screenshot mode in Options, the debt sheet's levers with their reasons (rulings 1775 to 1794).
- **A fair score (Track S).** Score v3, the Villa and the luxury goal, the titles and the heirs' traits retuned, a monthly caption for an unopened monument site (rulings 1795 to 1814, 1858, 1859).
- **The dynasty (Track D).** The sealed-ruler card, Best reign, no guide for an heir (rulings 1815 to 1820).
- **Reach (Track A) and words (Track W).** Focus, pinch zoom, the 200% step, words at large text, one name per thing (rulings 1825 to 1844, 1875 to 1884).
- **The look (Track V).** Far roads and plots, burnt rubble, the Health layer's edges, the score chip's medal, Fit the city (rulings 1845 to 1854, 1882).
- **The balance check.** Each court letter is worth twice the favour behind the one gate; the Steady's runs are back to 9.1's (rulings 1855 to 1869).
- **No world-version bump.** WORLD_VERSION stays 12; `letterGate`, `lessonMonth0` and the like are optional. A score-v2 best keeps its "older scoring" label.

## For Josh to check on a real phone
Nothing since 7.0 has been tried on a real device. The first group is carried from the 9.1 note (each still open); the second is 9.2's own.
- [ ] **The first two hours, start to finish,** on a phone over mobile data: cold load, the lesson, the hand-over, the first unguided half hour, the first real raid. (carried)
- [ ] **Warmth and battery** after 30 minutes at 1x and 3x. (carried)
- [ ] **An hour of zooming and panning on a Large and a Huge map:** does the tab ever reload? (carried)
- [ ] **Install, then launch offline** from the home screen; the install ask; Safari's 7-day rule with the rulers. (carried)
- [ ] **The lesson's road step by touch.** (carried)
- [ ] **Sound with the silent switch on and off;** 150% text; the phone held sideways. (carried)
- [ ] **The error card:** `?crash=tick`, `?crash=render` and `?crash=ui` show the three cards. (carried)
- [ ] **The lesson's raid framed on your phone:** the tower, the target and the raiders all in view from the first warning.
- [ ] **Pinch zoom** on the map and on a sheet, and that a two-finger touch on the bars does not zoom the page by accident.
- [ ] **200% text** on a phone: the top bar, the rail, a sheet, the lesson row.
- [ ] **Fit the city** from the Minimap's button on a phone.
- [ ] **The end card at 150% text:** both choices visible, Back and the row's What next? bring it back.
- [ ] **The Health layer's legend in sunlight:** the solid and dashed edges read at arm's length.
- [ ] **Day and night, and the music, on a phone in sunlight.**

## What 9.2 left
- **Targets missed, with their rulings.**
  - T5: the six-year Capital lists 13 alert rows against a bound of 12 (ruling 1868): a court letter and a demand both open past the gate's six months, and a low Nile.
  - T9: the heirs. The Generous's great work is not won (9.1 not won either), the Builder's is not won (9.1 won on day 6,235), the Merchant's and the Bountiful's are not won (rulings 1859, 1867). Their weaknesses rarely bite in the scripted runs, so a number would be a pin, not a balance.
  - T12: the middle monuments keep 9.1's durations (24 and 18 months not met; ruling 1810), so the design's "the middle of the Monuments tab is too long" is not answered. One kind at a time, re-measured, is the way.
  - B3: 1.64 years of profit at the spending run (the 1.5 target; 9.1 was 1.55, ruling 1866).
  - The late run holds 2.54 years of profit at year 15 (bound 2.5 and 2.3; ruling 1866).
  - The great work's lowest gold is 250 (the Steady, ruling 1866; the 2,000 floor is not met by 1,750). It is thin: a careful player at the Seat can owe the court for a month.
- **Track A's deviations.**
  - A sheet opened by a pointer does not take focus (ruling 1826): the daily refresh skips a sheet with focus inside, so a touch player's numbers would go stale.
  - The Ground legend's words stay hidden at large text (ruling 1827): with them the 40% budget and the ghost's frame fail.
  - The compact rail is 56 px, its words set slightly tight, so "Monuments" may clip a pixel on a wider font (ruling 1834).
- **The re-review's minors, left.**
  - The S6 test covers only the no-saved-city path of Start my own city (ruling 1871).
  - The lesson's `raid_warning` event still carries the map's east entry and its direction (ruling 1870): the raid walks in from the south, but that event's fields are the old ones.
- **The reviews' grades.** The final review gave the phone C+ before the fix wave (the lesson's raid, the end card at 150%, the dead double tap) and the desktop B+. The fix wave answered its blockers and should-fixes (rulings 1870 to 1879); the phone grade is for the real-phone pass to settle.
- **Also still open from 9.1:** the service worker's all-or-nothing `cache.addAll`, no bundle (first smaller JS, then a cheaper boot), and a 30 to 60 minute suite.

## Process
- **Rule slips by agents:** shell heredoc or sed on repo source, five times; each was content-checked against its diff.

## For 9.3
- The weekly decree is 9.3 (the roadmap's old 9.1 and 9.2); the roadmap's section 6 table has it so.
- The heirs' traits are data (`TRAITS` in `src/data/dynasty.js`) and measurable with `adapt`; retune only with a run in hand.
