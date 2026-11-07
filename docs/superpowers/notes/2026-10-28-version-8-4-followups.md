# Version 8.4 follow-ups

Carried forward from the three tracks, the balance check, the escalation and retune, the reviews and the fix waves (7 Nov 2026). Nothing below blocks the merge. The design is `specs/2026-10-28-thebes-version-8-4-gold-and-war-design.md`, and every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, Part 26).

## What shipped
- **Gold (Track G).** The palace sets the tax rate (Low, Normal, High: taxes 25% less or more, mood +8 or -8). A monument site can be rushed a course at a time: twice the work a day for three times the work gold. Villas and Estates need an imported luxury (cedar, ivory or incense); the Trade sheet buys it, City advice says when gold is spare, and a loaded city gets a year's grace (rulings 1460, 1465 to 1484).
- **War (Tracks R and E).** The first warning comes 300 days after the raid clock starts, later ones 360 to 600 days apart; scouts show where the raiders will come in for 30 days before the warning; a beaten raid leaves captured weapons (soldiers' pay a quarter less for a year) and a Victory in the mood; war elephants join the raids about twelve years in (rulings 1485 to 1514).
- **Raids grow by the years, not by their number (Josh's choice).** The mix's growth, the adaptation and the elephants' start follow the raid clock's stage, so twice the raids are not twice as hard (rulings 1530 to 1534).
- **The test cities were retuned to 8.4's raid pace.** No number in `src/` moved for it (rulings 1540 to 1549).
- **World version 11.** Old saves load as they were, with the luxury need starting a year after the load (ruling 1460).

## For Josh to check on a real phone
Nothing in 8.4 was tried on a real device; every screen was read in headless Edge at 375x667, 390x844, 667x375, 1280x800 and 1920x1080, at 100% and 150% text.
- **The tax rate on the palace.** Open the palace's sheet: Low, Normal and High each say their gold and mood before the tap; the choice you make shows in the mood list as a Taxes row.
- **Rush and its price.** On a monument site, read the Rush button's days and gold, tap it, and check the confirm says what it costs; a rushed site with no crew says "Rushed: no crew today".
- **A Villa's luxury need.** Open a Villa's sheet with no luxury in the stores: it should say it needs one and Show me should open the Trade sheet at a route that sells it.
- **Scouts before a warning.** In the 30 days before a warning, look for the scouts at the raiders' entry (both entries for a raid of two bands) and read the caption and alert.
- **A beaten raid's fanfare and the Victory.** Beat a raid: one fanfare, the "Captured weapons" line in the alert row and caption, and the soldiers' row of the forecast with its note.
- **The elephant trumpet and a band at a wall.** Hear the trumpet in place of the horn on an elephant raid; watch a band come to a wall and an elephant break it.
- **The countdown chip.** On a phone, the chip's "· 2 m 10 d" must never start a line, at 100% and 150% text.
- **The elephant warning banner on a tablet.** It should wrap clear of the open panel in both orientations.
- **Haptics.** The fanfare and the trumpet on a phone that buzzes: are they welcome or too much?

## What was cut or left
- **Seed 10's script runs out of money in year 12.** It beats all 11 raids and reaches Great Capital, but its treasury is gone before the great work's habits apply (the lowest -36,172). It is accepted (ruling 1551); a re-tune of its script is the follow-up.
- **A luxury Buy order can spend the treasury down to 0** (`src/sim/trade.js:322`). Add a floor, or a Trade-sheet warning that says what the order leaves.
- **A boat raid's landing gets no scouts** (ruling 1538). The scouts show the first entry only, since the landing is chosen at the warning.
- **The `elephantsMet` guard has no test.** It does nothing wrong today; a test would pin it.
- **The B7 run is sensitive to the keep** (ruling 1543): the great-work script lands on day 6,520 with a Keep of 300, and is not won at 400, 600 or 800 (a debt of 3,000 to 7,000), so no keep is chosen to land in the band.
- **Accepted as measured** (ruling 1551): the great-work run wins on day 6,380, before the 6,900 to 7,100 band; B3 sits at 1.55 years of profit (target 1.5, swinging 1.42 to 1.62); seed 5 is inside B7 but outside 6.0.1's tighter bounds; seed 10 is not won.
- **The incense reserve** keeps up to 10 incense back while a temple stands, even if the festival is never held (ruling 1552).

## For 9.0
- **Josh asked that 9.0 also improve the game's animations and visual effects.**
- The tax rate's sizes, the first warning's day and soldiers' pay each live in one data number (`TAX_RATES`, `RAIDS.firstWarnAfter`, `SPOILS`), and `taxLowMonths`, `taxHighMonths` and the raid tallies are kept for the traits.

## Process lessons
- **Raid-indexed growth and a faster clock compound.** The balance check found that every escalation counted by the raid came in half the time at 8.4's pace; reading growth from the clock's stage settled it (ruling 1530).
- **Scripted players are part of the balance.** The retune changed what the test cities do (towers by each band's first strike, the surplus sold, a stand-down habit), reading the same sheets a player reads, not the game's numbers (ruling 1540).
- **A wall-clock test can fail late in a long suite and pass alone.** The frame-budget timing tests are the usual ones; a fail under load that passes alone is the machine's, not the code's.
