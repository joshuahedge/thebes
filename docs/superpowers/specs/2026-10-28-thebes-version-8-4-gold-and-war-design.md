# Thebes 8.4 "Gold and war": design (approved by Josh, 28 Oct)

**Josh's answers (28 Oct):** "All recommended". Every open question in section 6 takes its recommended answer, and the balance targets in section 7 stand as written.

**For Josh:** 8.4 is the second of v9's four releases (`2026-10-27-thebes-v9-roadmap-design.md`, section 3). It covers two of his notes:
- Raids take a long time to come.
- Manors make far more gold than there is any way to spend.

It also owns the balance 8.3 left: no balance run yet works a crew beyond 12 road tiles or sets up a workers' camp.

Every number below was checked against the code on `version-8-4` (main = 8.3). The roadmap's numbers are the start. Where the code argued otherwise, section 9 says so. The open questions (section 6) and the balance targets (section 7) are the calls for Josh.

## 1. The rules for this release

1. **Gold buys what is scarce:** time (Rush), people and mood (the tax rate), standing (luxuries).
2. **One rule, not two.** The tax rate works through mood, as everything else that draws people in does. A luxury is a need like any other. An elephant is a fifth row in the enemy table, read by the same code as the other four.
3. **Raids you can read.** Scouts come before the warning, and a beaten raid is a moment worth having.
4. **9.0 can bend every lever.** The tax rate's sizes, the first warning's day and soldiers' pay each live in one data number.

## 2. Gold's jobs

**Today:**
- **Taxes:** each home pays `residents x TIERS[tier].tax` a month (`src/sim/economy.js` `monthFigures`). An Estate pays 180 x 8 = 1,440 a month.
- **Where gold goes:** wages, upkeep, soldiers' pay, monument work gold (6.5 a unit, `workGoldPerUnit`), the court's due from year 8, and one-off prices.
- **What the runs show:**
  - The Stage 4 capital run holds 50,509 gold at year 6, against a bound of 60,000.
  - The late run holds about two years of profit (25,152 at year 15), because the court's due takes the rest.
  - So gold piles up most in years 3 to 8, and in any city with grand homes.

### 2a. The tax rate (on the palace)

- **The control:** the palace sheet gains **Taxes: Low · Normal · High**. Each choice says its effect before the tap, for example "Low: 2,310 gold a month less, mood +8".
  - **No palace:** the rate is Normal and there is no control. The palace comes with Town.
  - **Demolishing the palace** sets the rate back to Normal.
- **What it does** (Q1):
  - **Gold:** this month's taxes x 0.75 (Low), 1 (Normal) or 1.25 (High), rounded to whole gold once for the city.
  - **Mood:** a new **Taxes** row in the mood breakdown: +8 (Low), none (Normal), -8 (High).
  - **People:** no rule of its own. Arrivals already follow mood (`src/sim/immigration.js` `monthlyArrivals`: mood / 60), and people leave below mood 30.
- **When:** the rate in force at the month's end sets that month's taxes and its mood row.
- **The score:** the Prosperity taxes term reads the taxes at the Normal rate, so the rate never moves the score (Q2).
- **Where it lives:** `palace.tax` on the palace building (absent means Normal). `TAX_RATES` in `src/data/palace.js` gives each rate's factor and mood, for 9.0's traits.
- **For 9.0:** two new tallies, `taxLowMonths` and `taxHighMonths`, count the month ends spent at each rate. 9.0's "the Generous" reads them.
- **Code:**
  - `src/sim/economy.js` `monthFigures` (it gains `taxesNormal`);
  - `src/sim/palace.js` (`setTaxRate`, `taxRateOf`, `taxMood`);
  - `src/sim/mood.js` `updateMood` (the row);
  - `src/sim/score.js` (the taxes term);
  - `src/ui/monumentSheet.js` (the palace sheet).

### 2b. Rush a course

- **The control:** a monument site's sheet gains **Rush this course**, with its quote: "About 112 days sooner, about 7,800 gold more (3x the work gold while rushed)".
- **What it does** (Q3):
  - Every crew at the site lays twice its day's units (`crewDayUnits` x `MONUMENT.rushPace` 2).
  - Each unit costs three times the work gold (`MONUMENT.rushGold` 3), paid day by day as work gold is today (`workPay`). A day that would take the treasury below 0 is not worked, as today.
  - Materials are still needed. A rushed site drains its stockpile twice as fast, and the sheet says "Rushed: waiting for stone" when supply cannot keep up. No gold is paid for units not laid.
- **Its limits:**
  - one course at a time: the course under way;
  - it ends by itself when that course is laid;
  - Cancel at any time; nothing is refunded and nothing is owed;
  - it does not skip the great temple's offerings, the gilding or the capstone (each still waits).
- **The price per day saved** is about `2 x (units a day) x (2 x work gold)`: about 70 gold a day for a four-crew site at Normal, more at higher ranks (`costScale` monuments).
- **The quote** comes from one sim function, `rushQuote(world, id)`. It assumes today's crews at full supply, and the sheet says so.
- **Where it lives:** `site.rush = true` (absent means not rushed), cleared when the course ends (`commitCrew`). Two new tallies: `coursesRushed` and `rushGold` (the premium paid).
- **Code:**
  - `src/sim/monuments.js` (`rushQuote`, `setRush`, `crewDayUnits`, `workPay`, `commitCrew`, `stallReason`);
  - `src/data/monuments.js` `MONUMENT`;
  - `src/sim/costs.js` (a new `rushGoldPerUnit`);
  - `src/ui/monumentSheet.js`.

### 2c. Luxury imports

- **The need:**
  - Villas (tier 8) and Estates (tier 9) gain a need, **luxury**: one imported luxury in stock, of any kind (Q4).
  - Needs are cumulative and a home stocks for the tier it grows into, so a Fine manor that wants to become a Villa stocks one too.
- **How much:** 0.01 per resident a month, times the tier's existing `use` (1.5 for a Villa, 2 for an Estate), rounded up per home (`monthlyNeed`).
  - A Villa uses 3 a month, about 135 gold, or 15% of its 900 in taxes.
  - An Estate uses 4 a month, about 180 gold, or 12.5% of its 1,440.
- **When it is missing:** the usual rule.
  - A Fine manor does not rise to a Villa.
  - A Villa or Estate that goes `DOWNGRADE_AFTER_MONTHS` (2) without one drops a tier.
- **The luxuries** (Q6): **cedar** (new), **ivory** (new) and **incense** (already in the game, from Punt).
  - Each is stored in storehouses and sold at bazaars. None is ever made.
  - Each carries `luxury: true` in `GOODS`; `LUXURY_GOODS` lists them.
- **Where they come from:**

  | Good | Who sells it | From | Price | A year | Who buys it |
  |---|---|---|---|---|---|
  | cedar | Byblos | Great city | 45 | 240 | none |
  | ivory | Nubia, and fallen elephants (section 4) | Capital | 60 | 80 | Byblos at 40 |
  | incense | Punt (as today) | Great Capital | 12 | 120 | none |

- **How they reach a home:** a caravan or boat lands them in the stores near the post or Quay, a bazaar draws them, and a home tops up, as with linen.
- **Saying it:** the house sheet's checklist gains a Luxury row. Its cause names the fix, for example "Open a route to Byblos and buy cedar", with Show me to the Trade sheet. Advice gains the same item.
- **Old cities:** a city loaded from an 8.3 save gets 12 months before the need counts (`world.luxuryFrom`), so its Villas do not fall the month after loading (Q5).
- **Code:**
  - `src/data/housing.js` `TIERS`;
  - `src/sim/housing.js` (`liveNeeds`, `monthlyHousing`, `needCause`);
  - `src/sim/distribution.js` (`topUpHouse`, `monthlyNeed`);
  - `src/data/buildings.js` (the bazaar's `sells` and `stock`, the storehouse's `stores`);
  - `src/data/goods.js`, `src/data/trade.js` `PARTNERS`, `src/data/court.js` `GOOD_VALUE`;
  - `src/sim/advice.js`, the house sheet, the Trade sheet.
- **A trap:** `drawDrift` (`src/sim/trade.js`) draws every partner's yearly price swing from one seeded stream, in `PARTNERS` order. A good added to Byblos's list would move Nubia's and Punt's prices on every saved city. New goods must draw after all the old ones.

## 3. Raids come sooner and mean more

**Today** (`src/data/raids.js` `RAIDS`, `src/sim/raids.js`):
- **The clock** starts at 250 people (never on Peaceful).
- **The first warning** comes 720 days later and pauses the game. Its raiders come 90 days after it.
- **Later warnings** come 720 to 1,440 days after the last raid's arrival (`laterWarnDay`, seeded).
- **The late run** meets 3 raids in years 7 to 15.
- **A beaten raid costs mood:** -3 for 180 days (`DANGER_MOOD.raidBeaten`). A lost one costs -8.

**8.4:**
- **The first warning** comes 300 days after the clock starts: about 5 minutes at 1x (Q10).
- **Later warnings** come 360 to 600 days after the last raid's arrival: 6 to 10 minutes at 1x (Q11).
- **Every difficulty** has the same timings, as today. A save's warning already scheduled keeps its day; the new gaps apply from the raid after it.
- **The low-Nile lean** (Q12):
  - It applies to later raids only. A raid that would arrive in the 60 days before Shemu (months 1 and 2) waits for Shemu's first day (month 3).
  - Shemu, months 3 to 6, is when the river is lowest (`SEASONS`, `src/data/tips.js`).
  - The result: about half of later raids arrive in Shemu, against a third today. A raid is never earlier, there is no new draw, and the gap is 360 to 660 days in all.
  - It lives in `laterWarnDay` and `RAIDS.leanDays`.
- **Scouts on the horizon** (Q13):
  - For the 30 days before every warning, two or three scouts stand at the map edge where the raid will enter. The first raid has them too.
  - A one-time caption says "Scouts on the eastern horizon: raiders may come within a month", with the side named.
  - Scouts are drawn from the state: `scoutsAt(world)` reads `raid.nextWarnDay` and the entry the warning will use (`nextRaidEntry`, below). They never move the warning.
  - The lesson's raid, staged with `nextWarnDay = today`, has none.
- **The reward for a beaten raid** (Q8, Q9):
  - **Captured weapons:** every unit's pay is 25% less for 360 days (`soldiersPayOf`). A later beaten raid restarts the year. It shows on the forecast's soldiers row: "Soldiers' pay 186 (captured weapons: 62 less, 140 days left)". It lives in `raid.spoils = { until }`.
  - **The celebration:** the alert row's "Raid beaten" moment (`MOMENT`, `src/ui/v60/battle.js`) gains a fanfare and the line "Captured weapons: soldiers' pay 25% less for a year". It is never a card in the middle of the screen.
  - **Mood:** the beaten raid's mood row becomes **Victory** +4 for 90 days, instead of -3 for 180.
- **For 9.0** ("the Unconquered"): `tally.raids` always equals `raidsBeaten + raidsLost`, plus 1 while a raid is under way. A tribute paid is counted apart (`tributes`). A stampeding elephant never makes a raid lost. Each is a test.
- **Code:**
  - `src/sim/raids.js` (`raidDay`, `laterWarnDay`, `raidMood`, `raidAlerts`);
  - a new `src/sim/scouts.js` and `src/sim/spoils.js`;
  - `src/sim/costs.js` `soldiersPayOf`;
  - `src/data/raids.js`, `src/data/mood.js` `DANGER_MOOD`;
  - a new `src/render/scouts.js`;
  - `src/ui/v60/battle.js`, `src/audio/sfx.js`.

## 4. War elephants and ivory

A fifth enemy kind, a row in `ENEMY_TYPES` (`src/data/armies.js`) beside foot, archer, chariot and boat.

| | Foot (today) | Elephant |
|---|---|---|
| Hit points | 10 | **60** (6x) |
| Pace (tiles a day) | 1 | **1**, the slowest there is (Q15) |
| Damage to a wall | 2 a day | **6** a day (3x) |
| Damage to units | 2 to one beside it | **3 to every unit beside it** (trample) |
| Counts for towers and tribute as | 1 | **4** (Q17) |

- **Matchups** (Q16), in `MATCHUPS` and a new `TOWER_VS` row:
  - **Archers** deal 2x at range (open or near a wall) and half in melee.
  - **Towers** deal 1.5x (6 a day, not 4). Towers have no matchup row today, so this row is new.
  - **Soldiers** deal half in melee (0.75 holding a gate).
  - **Your chariots** never go out to an elephant: they take the nearest other raider, or wait.
- **Panic** (Q15):
  - The first time an arrow (a tower's or an archer's) takes an elephant below half its hit points, a seeded draw gives it a 1-in-2 chance to stampede.
  - A stampede deals its trample (3) to every raider of its own band and leaves the map the way it came. It is drawn running back.
  - It counts as fallen for the band's retreat. It drops no ivory, and it never makes the raid lost.
- **When they come** (Q14):
  - From the 8th raid, a seeded draw gives each raid a 1-in-2 chance of elephants: `floor(size / 8)` of them, 1 to 3, taken from the foot share.
  - A raid under 8 raiders brings none. With 8.4's timings, the 8th raid comes about 12 to 13 years after the clock starts.
- **Where they enter** (Q18):
  - An elephant raid's first band enters by the raider entry nearest the river's mouth on the south edge: upriver, as the Nile flows north.
  - On a map with no south-edge water, it is the entry nearest any mouth; with no river (the Great oasis), the raid's own entry.
  - `nextRaidEntry(world, index)` decides it from the index alone, so the scouts stand where the raid will come.
- **The warning:**
  - "War elephants!" leads the warning, with a trumpet in place of the horn.
  - The first elephant raid shows a picture card, as each new danger does.
  - The raid sheet's "What helps against them" lines come from `counterModel` (`src/sim/armies.js`), as today. They gain the tower row and the elephant's traits (tramples, may stampede, breaks walls 3x faster).
- **Ivory:**
  - A felled elephant (not a stampeded one) leaves 10 ivory in the nearest working storehouse with room. With none, it is lost, and the raid's report says so.
  - Ivory sells to Byblos at 40 a unit, or meets the luxury need (2c).
- **Peaceful** has no raids, so no elephants. Its Villas buy ivory from Nubia.
- **Code:**
  - `src/data/armies.js` (`ENEMY_TYPES`, a new `ELEPHANTS` row, `MATCHUPS`, `TOWER_VS`);
  - `src/sim/armies.js` (`drawMix`, `raiderKinds`, `counterModel`);
  - `src/sim/raids.js` (`raiseWarning`, `arrive`, `nextRaidEntry`, `tributeFor`, `tributeQuote`);
  - `src/sim/combat.js` (`combatDay`, `unitDamage`, the tower shot);
  - a new `src/sim/elephants.js` (panic, stampede, ivory);
  - `src/render/units.js`, `src/render/art/armies.js`, `src/render/effects.js`;
  - the raid sheet, `src/audio/sfx.js`.

## 5. Saves

- **World version 11** (Q22). One migration, v10 to v11:
  - The new tallies start at 0: `taxLowMonths`, `taxHighMonths`, `coursesRushed`, `rushGold`, `luxuryBought`, `elephantsMet`, `elephantsFelled`, `elephantsStampeded`, `ivoryTaken`, `spoilsGold`.
  - `world.luxuryFrom` = the load day + 360. A new city has 0.
- **Optional, absent means today's behaviour:** `palace.tax` (Normal), `site.rush` (not rushed), `raid.spoils` (none), `mix.elephant` (0), a raider's `panicked`, a report's `ivory` and `stampeded`.
- **Not moved:** a scheduled `raid.nextWarnDay` keeps its day.
- **Why a bump:** `TALLY_KEYS` are required by `validateWorld`, and 9.0 needs the tax months counted from 8.4 on.

## 6. Open questions (each with a recommendation; Josh took every recommendation, 28 Oct)

- **Q1. Tax rate sizes?** Recommended: Low x0.75 gold and +8 mood; High x1.25 and -8; people follow mood alone. Why: one lever, seen in the mood breakdown. Arrivals already follow mood.
- **Q2. Does the rate move the score?** Recommended: no. The taxes term reads Normal-rate taxes. Why: Low must not cost score, and no score-version bump is needed.
- **Q3. How is Rush priced, and what are its limits?** Recommended: 2x pace at 3x work gold a unit, about 70 gold a day saved on a four-crew site at Normal. It covers the course under way only, ends with it, can be cancelled at any time, is paid daily never below 0, still needs materials, and still waits for offerings, gilding and the capstone. Why: paying per unit wastes nothing when stone runs short.
- **Q4. Which homes want which luxury?** Recommended: Villas and Estates want one luxury of any kind, at 0.01 per resident a month times the tier's use. Missing it is like any missing need. Why: the same rule as linen; the Estate already uses 2x.
- **Q5. Old cities with Villas?** Recommended: 12 months' grace after loading. Why: a route takes time to open; nothing falls on load.
- **Q6. Which luxuries, and from where?** Recommended: cedar (Byblos, 45, 240 a year), ivory (Nubia, 60, 80 a year, plus elephants; Byblos buys it at 40), incense (Punt, as today). No lapis. Why: Punt opens at Great Capital, too late for a Villa in year 8. Two new goods, not three.
- **Q7. Is incense's price raised to match?** Recommended: no, it stays 12. Why: it is the late reward for reaching Punt, and 7.0's festival pricing stays.
- **Q8. How big is the captured-weapons discount, and for how long?** Recommended: 25% off every unit's pay for 360 days; the next beaten raid restarts it. Why: pay is a soldier's only running cost (training is free).
- **Q9. What form does the celebration take?** Recommended: the alert row's moment with a fanfare and the weapons line, plus a Victory mood row of +4 for 90 days (was -3 for 180). Never a modal. Why: winning should never cost mood, and the lesson's end card stays clear.
- **Q10. When is the first warning?** Recommended: 300 days after the clock starts, at every difficulty. Why: it is the roadmap's number, and one data number 9.0 can bend.
- **Q11. What are the later gaps?** Recommended: 360 to 600 days after the last arrival. A save's scheduled warning keeps its day. Why: twice as often, and loads change nothing.
- **Q12. Do raids lean on low Nile, and how strongly?** Recommended: yes, later raids only. An arrival in the 60 days before Shemu waits for Shemu. Why: about half of raids land in Shemu, with no new draw, never earlier.
- **Q13. How long before a warning do the scouts show?** Recommended: 30 days before every warning, the first included, at the raid's entry. Why: 30 s at 1x is enough to notice, and it never delays the raid.
- **Q14. How many elephants, and when?** Recommended: from the 8th raid, half of raids (seeded), `floor(size/8)` elephants, 1 to 3, none under 8 raiders. Why: rare, late and predictable for the scouts.
- **Q15. Elephant hit points, pace and panic?** Recommended: 60 hp, 1 tile a day, 6 a day to walls, trample 3. Panic: a 1-in-2 chance once below half from arrows; a stampede deals 3 to its own band and leaves. Why: a slower pace needs a new part-day step for every band, and gains little.
- **Q16. What are the matchups?** Recommended: archers 2x at range and half in melee; towers 1.5x; soldiers half in melee; your chariots never go out to one. Why: the roadmap's table, read by today's code.
- **Q17. Does an elephant count as more for towers and tribute?** Recommended: yes, as 4 raiders. Why: a tower needs 10 days to fell one, against 2.5 for a raider on foot.
- **Q18. Which is the upriver edge?** Recommended: the raider entry nearest the south-edge river mouth, else the nearest mouth, else the raid's own entry. Why: maps store no flow direction, and the Nile flows north.
- **Q19. How much ivory, and at what price?** Recommended: 10 per felled elephant, to the nearest storehouse with room; it sells at 40. Why: one elephant meets an Estate for two or three months.
- **Q20. Is the lesson's staged raid protected?** Recommended: yes. It keeps its own clock, comes on foot, and has no scouts and no lean. Each is a test (section 8).
- **Q21. How does Peaceful change?** Recommended: no raids, so no scouts, elephants, weapons or celebration. The tax rate, Rush and luxuries work as everywhere. Why: Peaceful is the gentle city, not a city without gold.
- **Q22. Does 8.4 need a world-version bump?** Recommended: yes, to 11 (section 5). Why: new tallies are required keys, and old Villas need their grace.
- **Q23. Do the raid-clock numbers land in Track R or in the balance check?** Recommended: in wave 2's balance check (Opus). Track R builds the rules with today's numbers. Why: those three numbers move every long balance run, and re-pinning them is the balance check's job.

## 7. Balance targets

The bar: **late gold is spent, not piled up.** The existing runs keep today's habits (Normal taxes, no Rush). Two new **spending** variants add a player who uses gold's new jobs:
- Taxes are set Low once the treasury holds 12 months of Normal-rate taxes, and back to Normal below 6 months.
- The site under way with the most crews is rushed while the treasury stays above 6 months of taxes plus 30 days of the rush.
- Luxuries are bought wherever a Villa or Estate wants one.

Today's numbers are from the 8.3 probe (scratchpad `probe-balafter.txt`) and the asserted bounds. Each target is an assertion:

- **B1. Capital run, today's habits:**
  - holds at most 60,000 gold at year 6 (today 50,509);
  - spends 60-70% of its taxes over the last 24 months (today 69.5%);
  - every other s4 assertion holds with 8.4's raid clock.
- **B2. Capital run, spending:**
  - holds at most 30,000 gold at year 6;
  - never goes below 0;
  - spends at least 15% of its Normal-rate taxes on the new jobs (taxes given up + Rush premium + luxuries) over the last 24 months;
  - spends at least 80% of them in all.
- **B3. Late run, spending:**
  - holds at most 1.5 years of profit at year 15 (today 2.23, bound 2.3);
  - meets every quota and beats every raid.
- **B4. First warning, Normal:** comes on day `clockDay + 300` exactly in the capital run (today `+ 720`).
- **B5. The raid interval:**
  - every later warning comes 360-660 days after the last arrival;
  - over 1,000 seeded draws, 45-55% of arrivals fall in Shemu (today about 33%).
- **B6. Raids in the late run:**
  - years 7-15 meet 5 to 8 raids (today 3), all beaten;
  - `tally.raids` equals `raidsBeaten + raidsLost` at every year's end.
- **B7. Great-work run:**
  - won between day 6,900 and 7,100 (today 7,021; the margin test needs 100 of 7,200 days spare);
  - never below 2,000 gold from the Seat on (today's lowest overall: 3,945);
  - the dangers-on seeds 5 and 10 are still won by day 7,200, with no raid lost (today 6,669 and 6,084).
- **B8. Elephants:**
  - the great-work run (dangers off, or on with seed 5) meets at least one elephant raid and beats it;
  - at least one elephant is felled;
  - at least 10 ivory lands in a store;
  - the report gives elephants met, felled and stampeded.
- **B9. The far guild and the camp** (a new far-site run, from the capital run's year-6 city):
  - it founds a great sphinx whose two guilds are 36-47 road tiles away;
  - it keeps the site fully stocked from a storehouse;
  - with full staff, each crew lays 16 units a month (80%) without a camp and 20 after the camp is set up;
  - the camp's price is `round(0.1 x the founding as paid)`;
  - rushed, each crew lays 40 a month and pays 3x the work gold a unit.
- **B10. Grand run:**
  - a Villa and an Estate by year 9 with the luxury need on, buying what the advice names;
  - an Estate stands at year 10 with its luxury met.
- **B11. Tax:**
  - Low and High give exactly the factors and mood rows of Q1;
  - a city's score at Low, Normal and High is the same in the same month.

**Probes the balance check runs first** (these numbers are printed nowhere yet):
- the capital run's clock day and first warning day;
- mood at years 6 and 15 in the capital and late runs (if it sits at 100, Low taxes buy nothing, and Q1 needs a bigger lever);
- Normal-rate taxes a month at years 6 and 15;
- Villas and Estates at years 10, 15 and 20 in the great-work run;
- the raid indexes each long run reaches under 8.4's clock, and which of them draw elephants.

## 8. The lesson

The lesson is a Normal city on seed 7. Its tower step stages the raid clock with `nextWarnDay = today` (`src/sim/lesson.js` `STAGES.raid`), and its lock leaves only the step's category live. Each of these is a test in `tests/v84/`:

1. **The staged raid does not move.** With 8.4's raid numbers, the warning is raised the day after the tower step begins, exactly as in 8.3. The walk-through's day per step matches 8.3's (pinned).
2. **No elephants, no scouts, no lean.** The lesson's raid is index 0: all on foot, size 3. `scoutsAt` is null on every day of the walk-through. The first raid takes no lean.
3. **The words still match.** The tower step's "why" names the first warning's delay from `RAIDS.firstWarnAfter` ("10 months"; `tests/v60/d2/cards.test.js` pins it). The days left equal the warning's `arrives - day`.
4. **The tax rate changes no step's need.** The lesson's city has no palace. A walk-through with the rate forced Low or High reaches every step on the same day.
5. **Nothing new can leave a step waiting.** Tax, Rush, luxury and the camp sit only on sheets the lesson never opens (palace, site, Villa). The celebration after the lesson's beaten raid is non-modal, never pauses, and never covers "Your first city stands". Captured weapons change nothing a step reads.

## 9. What the code says that the roadmap does not

- **Few grand homes in the runs.** The balance runs have few Estates. The capital run has 4 Manors and 30 Townhouses, and the late run's Manors never reach a Fine manor. The court's due already holds the late treasury at about two years of profit. Gold piles up in years 3 to 8 (50,509 at year 6) and in grand-home cities.
- **Ten Estates out-earn the dearest founding every month,** not every few months: 14,400 a month against 8,000 (9,200 at the Seat's costs).
- **A beaten raid costs mood today** (-3 for 180 days). A celebration has to flip it.
- **Training is free.** "Cheaper soldiers" can only mean cheaper pay.
- **Towers have no matchup row.** "Towers strong against elephants" needs a new one.
- **Foot's 1 tile a day is already the slowest pace.** Slower needs a new part-day rule.
- **Maps do not store which way the river flows,** and `src/sim/courses.js`'s comments disagree.
- **Incense already exists**, from Punt at Great Capital, used only by festivals. It is too late on its own for a Villa in year 8.
- **Low taxes would lower the score** through the Prosperity taxes term, unless that term reads the Normal rate.
- **A new good on a partner's list moves every later seeded price** (`drawDrift`), unless it draws last.

## 10. What does not change

- **Prices and pay:** building, road and wall prices, wages and upkeep, and every unit's base pay.
- **Crews:** 8.3's rule (full speed within 12 road tiles, 10% less per further 12, never below 50%) and the camp at 10% of the founding stay. B9 measures them.
- **Raids:** the raid size formula, the first raid's size (3) and that it cannot be paid off, towers per 3 raiders (for a raid without elephants), the wealth and favour terms, and two-sided raids and boats.
- **Difficulty:** what each level means. Raid timing is never scaled by difficulty, and Peaceful has no raids.
- **No new building kinds and no new partner.** Every existing good keeps its price and its yearly drift.
- **The score's formula and version (2).**
- **The lesson's steps, map and words.** Only the words that read `RAIDS` follow the data.
- **The crossing limits** (bridges up to 4 tiles, ferries 5 to 12) and supply lines.
