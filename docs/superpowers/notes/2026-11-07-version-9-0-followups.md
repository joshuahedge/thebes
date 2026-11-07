# Version 9.0 follow-ups

Carried forward from wave 0, the three tracks, the balance check, the reviews and the fix wave (7 Nov 2026). Nothing below blocks the merge. The design is `specs/2026-11-07-thebes-version-9-0-dynasty-design.md`, and every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, Part 27).

## What shipped
- **Pass the throne and the titles (Track D).** From the City milestone the game menu offers Pass the throne: the best seal and the city's map become a ruler with a title (Unconquered, Builder, Merchant, Bountiful, Generous, or the Steady), and a new city starts for the heir. The score section says "Remembered as" with its why line and the runner-up (rulings 1565 to 1584).
- **The heirs' traits (Track D).** Each heir has a strength and a weakness, two numbers read through `heirFactor` in the lever's own function; a Steady city is 8.4's to the last bit. The lesson's city is always the Steady (rulings 1567, 1564).
- **The ruler list and rivals (Track L).** Rulers with regnal numbers and a map square, a side by side with a rival or the last reign, Play this map, rival links with a name and an heir, a toast at a new split, Bring rulers from a file (rulers and rivals only), the ruler's name field and the install ask (rulings 1585 to 1599).
- **Animations and effects (Track V).** DPR capped at 2 and a 60 frame cap, a two-pose walk and a glide to the sim's tile, the building's rise with scaffolds, workshop smoke, festival lamps, petals and pennants, fires fought, dust, weather, a ferry's wake, the beaten raid's moment and fading panels, all Full only and inside one 2 ms budget (rulings 1600 to 1614, 1637 to 1639).
- **The balance check and the fix wave.** The bars were set by measurement (Unconquered 5 raids, Builder 4,600 units), and every sentence that quotes a flood, pay or work-gold number reads the sim's own for this city (rulings 1620 to 1639).
- **World version 12, records version 2.** Old saves load as the Steady; a records version 1 blob reads with empty rulers, rivals and dynasty (rulings 1560, 1561).

## For Josh to check on a real phone
Nothing in 9.0 was tried on a real device; every screen was read in headless Edge at 375x667, 390x844, 667x375, 1280x800 and 1920x1080, at 100% and 150% text.
- **Pass the throne's sheet and the heir's first screen.** From a City-sized city open the game menu and Pass the throne: the sheet should say what is kept, what ends and which heir comes, with Not yet and Back changing nothing. Then read the heir's first screen: the caption (6 seconds) and the city summary should name the strength and the weakness.
- **The ruler list on the phone.** Open Rulers: rows read as "Name II the Builder", the map squares are visible, the rows are 44 px tall, and one panel is open at a time.
- **Play this map and Bring rulers in the installed app.** Play this map from a row should set the New city card to that map and give the choices back on Back; Bring rulers from a file should say "Adds N rulers and M rivals" before the tap and keep the device's dynasty when it already has rulers.
- **The install ask in Safari.** After the first ruler is kept, the first start of a city should offer the ask once, with the Safari line shown on iOS only (Share, Add to Home Screen, then export and bring the rulers across).
- **A friend's link opened.** Open a link with a name and an heir: the rival is kept on its map, and at a new split on that map the toast compares you with them; the side by side should read well at 375 wide and at 150% text.
- **The toast at a new rank.** Reach a new rank in a city with a rival on the map and read the toast's words and timing.
- **Each effect on a real phone.** Watch smoothness and battery warmth for: the walk and glide, the building's rise and scaffolds, workshop smoke, the festival's lamps and petals, fires fought, dust at monuments, weather, a ferry's wake, the beaten raid's moment and the panels' fade. Does the frame cap (60) and the DPR cap (2) keep a DPR-3 phone cool?
- **A heir playthrough.** Play each heir some hours: does each trait feel fair, and is the weakness something to play around rather than a punishment?

## What was cut or left
- **The heirs' balance is accepted as measured** (ruling 1640). The scripted cities, tuned to the Steady, lose raids with every heir on seed 5 and three heirs (Bountiful, Merchant, Generous) miss the great-work win; the Builder's great-work run is 260 days late and its gold 26% less. Retune against adaptive scripted cities in the next iteration. Heirs come only after a first Pass, hours in.
- **`court.js` `outputPerMonth` ignores the heir** (and the flood): the court's yearly due reads the plain figures.
- **The static `rvPrepRule`** ("60% becomes 73%") on the Nilometer's sheet and card is the Steady's number whatever the heir.
- **The heir's caption shows for 6 seconds** (ruling 1571), not for 10 game days; the city summary and the tip say it again.
- **No reduced motion** (Josh, ruling 1601): the device's setting is not read; production stays Full and 9.0's effects have no Gentle or Still forms.
- **No yearly snapshots** for a time-lapse: Play this map is the ruler list's replay (ruling 1585).

## For 10.0
- The records, the title bars and the traits are data (`TITLES`, `TRAITS` in `src/data/dynasty.js`), so a retune is a data change.
- The side by side and the map square are one component each and take any two scores.

## Process lessons
- **A new lever read in many places needs one function.** Every trait is read through `heirFactor` in its lever's one function, so a Steady city stays 8.4's to the last bit and the words and the sim agree.
- **The scripted players do not adapt.** A trait the script does not know about makes its city look broken in a balance run; adaptive scripted cities are the next test tool.
- **A wall-clock test can fail late in a long suite and pass alone.** The frame-budget timing tests are the usual ones; a fail under load that passes alone is the machine's, not the code's.
