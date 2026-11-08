# Version 9.2, Track S: a fair score (rulings 1795-1814)

Track S's range. Each ruling is one line with its cost if wrong. Numbers are from the scripted runs of 8 November (the capital run, the great-work run, the dangers runs); the balance check after the merge re-pins and runs the heirs.

1795. Score v3: a term that has not started counts nothing and is out of its part's ceiling (fire safety until Town, defence until the raid clock starts, Peaceful's defence never); the growth term runs to the Seat (7 steps, `growthSteps` 7); the Monuments part divides by every kind's prestige, `PRESTIGE.scoreFull` 1,280, computed from `MONUMENTS`. Cost if wrong: the score reads lower than v2 for the same city (Capital 338 on the capital run against 360), so a Bronze is harder; the medals below were measured to absorb that.
1796. Medals 240, 320 and 400 of 500 (v2: 200, 300, 400; v1 and v2 keep theirs by version). Cost if wrong: Gold at 400 is out of reach of every scripted run (best 353); it needs a Monuments part above about 60.
1797. `SCORE_VERSION` 3 and the share link writes `t3`; `t2` and `t1` still open as "older scoring" (the label is `scoreVersion < SCORE_VERSION`, so a v2 best keeps its medal on v2's scale beside the first v3 best). Cost if wrong: a friend on 9.1 cannot open a `t3` link ("newer format"), which is the same as every format bump.
1798. Villa tax 6 to 7 (between the Fine manor's 5 and the Estate's 8). Cost if wrong: Villas pay 17% more, so a late city's treasury is a little easier.
1799. Peaceful's defence never starts, so Peaceful's ceiling is 460 raw (the chip says "Defence does not count on this level: no raids come"), and its medals are no longer free. Cost if wrong: Peaceful's Gold needs 87% of a lower ceiling; its factor 0.7 already puts its totals under Normal's.
1800. Small mastaba 108 to 72 crew-months (three brick courses and the stone course, 360 units each) and colossus 48 to 42 (six courses of 140), not the design's about 36: 36 would tie the great sphinx's 36 crew-months, 720 units and 18 months, and the data test that puts each new kind between its neighbours (and the order of the Monuments tab) would fail. Stone and bricks fall with the courses. Cost if wrong: the colossus is 12% cheaper than it was, not 25%.
1801. Great city goal "Open a route that sells a luxury" (`luxury_route`, after "Grow 2 homes to Villa"), met by `world.tally.luxuryBought` (a new need kind `tally`), Show me on the trading post. Cost if wrong: it is met only when a luxury has been bought, so a route with no Buy order leaves it open (the why line says to set one).
1802. The Unconquered's weakness: every raid warning 30 days sooner, the first after the clock and each later one (`laterWarnDay`, after the lean wait), where 9.0 took 100 days off the first only. Cost if wrong: later raids come 30 days sooner for the heir for the whole reign; a lean-wait raid can land in the lean window.
1803. The Generous's lasting cost: taxes x0.95 at every rate, kept beside High 1.15 (which a city that never sets High never paid). Cost if wrong: a 5% lower tax for the whole reign.
1804. The Builder's bar 4,600 to 8,000 units. Measured on the scripted runs (fit = measure over bar): great-work run Builder 1.71 against the Unconquered's 2.60 (it was 2.94 against 2.60), seed-5 dangers 1.28, seed-10 dangers 1.07, late dangers 1.52, capital 0.53. The Builder is now earned by no scripted run (the Unconquered or the Bountiful wins each); a fixture with 8,000 units earns it. Cost if wrong: the Builder is rare; 6,000 would give the seed-10 run its Builder.
1805. The Merchant's bar 0.40 to 0.25. The scripted runs measure 0.002 to 0.049 (the Merchant stays a fixture's title). Cost if wrong: a city that trades modestly now earns it.
1806. Peaceful's words: "No raids, sickness or thefts. Low Niles, locusts and fires still come, rarer." (`HAZARD_LEVELS` chance 0.5, severity 0.5; fire risk 0.5); Relaxed adds "Low Niles and locusts come 50% as often." from the same table. `difficulty.js`'s comment says risk scales fire, sickness, theft and raid size. Cost if wrong: none (words).
1807. A monument site whose sheet has not been opened for a game month gets one caption ("Small mastaba: 12% built, not looked at for a month"), once until the sheet is opened again; the counter lives in `createMonumentUi` and is never in the world. Cost if wrong: a site that is left alone on purpose gets one reminder a month after each look.
1808. The health "crowded" term is dropped from the daily risk. Measured (residents a tile over 20, the old rule): every Townhouse and up was crowded, 34 of 34 and 30 of 30 homes at the capital run's end and 38 of 38 at the great-work run's, so it was a flat +0.3 on the grand homes; a rescale to the tier's capacity (95% full) makes it true of every full home of every tier (100 of 100 in the great-work and seed-5 runs), which tells the player nothing. The plague's own use (where it starts, and a home with room) keeps `crowdedPerTile`; listed in the follow-ups. Cost if wrong: grand homes catch illness at 0.15 a day (with a well) where they caught 0.45, so late illness is rarer; the balance check measures it.
1809. The chip's explainer shows each part against its ceiling ("Safety: 20 of 20" in a Village) and one line for each term not started ("Fire safety counts from Town"); the "weakest" part is the one furthest under its ceiling. Cost if wrong: none; the summary sheet's part bars still run to 100.
1810. The stale prestige comment at `monuments.js` (one of each kind is 700) is corrected beside `PRESTIGE.scoreFull`. Cost if wrong: none.
1811. The scripted Capital's disaster numbers (mood 14, 207 people, from the dangers run) are what the dangers pins measure; noted, not changed. Cost if wrong: none.
1812. Deep review section 7's notes (the Manor's weak step, crime and health as alert-makers, the court's output ignoring the flood) are in the follow-ups, not changed (4.7). Cost if wrong: none.
1813. Wave-0 text: `V90_D_TEXT.weakness.unconquered` and `.generous` are reassigned in Track S's text section (the heir lines, the Pass card and the dynasty's How to play read the data).
1814. The old tests changed, by file, are listed in the report; no test was deleted.

## Medal table (raw score of 500, Normal, the scripted capital run, v3 formula)

| Stage | Month | People | Raw | Parts (people, prosperity, culture, safety, monuments) | Medal |
|---|---|---|---|---|---|
| Village | 1 | 32 | 80 | 4, 56, 0, 20, 0 | none |
| Village | 2 | 56 | 108 | 7, 56, 25, 20, 0 | none |
| Village | 3 | 80 | 90 | 11, 58, 1, 20, 0 | none |
| Town | 6 | 197 | 186 | 24, 60, 50, 52, 0 | none |
| Market town | 7 | 255 | 151 | 29, 61, 1, 60, 0 | none |
| City | 11 | 469 | 193 | 44, 37, 52, 60, 0 | none |
| Great city | 15 | 690 | 296 | 55, 78, 63, 100, 0 | Bronze |
| Capital | 20 | 1,038 | 306 | 65, 72, 64, 100, 5 | Bronze |
| Capital | 24 to 120 | 1,090 | 316 to 347 (338 at month 72) | 67, 55 to 80, 64, 98 to 100, 10 to 38 | Silver (a dip to 316 in a dangers year) |
| Great-work run, Seat | year 20 | 1,663 | 351 | 75, 84, 42, 96, 54 | Silver |
| Late dangers run | year 15 | 1,090 | 353 | 67, 80, 64, 100, 42 | Silver |
| Seed-5 dangers run | year 20 | 1,444 | 292 | 73, 81, 40, 56, 42 | Bronze |
| Seed-10 dangers run | year 20 | 1,431 | 318 | 75, 64, 41, 100, 38 | Bronze |

A new bare village scores 70 (people 0, prosperity 50, culture 0, safety 20). The Market town's culture of 1 at month 7 is the script (a bazaar has no road yet), not the formula; the scripted Town's score does not fall on the day fire starts or the raid clock starts (the safety part cannot fall when a term starts counting).

## Pins moved (each marked WAVE2-PIN 9.2 Track S in its test; the balance check re-pins)

The cause is ruling 1800 (the shorter small mastaba and colossus), bisected on the great-work run: with both old the run is won on day 6,038 (11,454 the lowest); with either one new it never reaches the Seat. Every scripted run builds both at Great city, so the long runs move: they are chaotic, as the 6.0 and 8.4 notes say.

| Pin | Was | Now |
|---|---|---|
| Capital run score at year 6 (T5, habits) | 360; Capital day 600, 50,457 gold | 341; day 570, 49,907 gold (255 lowest, as before) |
| Capital run spend share of taxes | at most 0.70 | 0.7156 (bound 0.72) |
| Great-work run (greatWorkRun) | Seat 3,690, won 6,380, 8,866 lowest | Great Capital 3,660, no Seat, no temple, not won, -13,758 lowest, 13 raids none lost |
| Seed-5 dangers run, habits | Seat 3,720, won 6,927, 7,732 lowest | Seat 3,690, won 6,017, 16,741 lowest, 13 raids none lost |
| Seed-10 dangers run | Great Capital 3,660, no Seat, -36,172 | Seat 3,690, not won, -2,974, 11 raids none lost |
| Late dangers run, year-15 gold against the dangers-off run | at least 0.5 (8,740) | 5,400 against 17,481 (0.31; bound 0.3) |
| Grand run | Estate by year 9 | Villa, no Estate in 10 years (B10 likewise) |
| Spending run, B3 | 1.55 years of profit | 1.45 (under the target's 1.5: B3 now met) |
| Titles (T6) | great-work and late dangers: Builder; three titles | all five scripted runs Unconquered or Bountiful; two titles; Builder fit 1.71 (great), 1.28 (seed 5), 1.07 (seed 10), 1.52 (late dangers) |
| Heirs T1 (Builder, great-work run) | won 6,235, 713 lowest | not won, -11,027 lowest, habit never sets High |
| Heirs T3 (Unconquered) | warned clock + 200; seed 5 beat all 13 | warned clock + 270; late dangers 10 beaten, seed 10 meets 12 (was 11), seed 5 meets 14 and loses the last two (-28,288) |
| Advice runs' top items | late: illness 8, 10, 15; grand 7 stranded; great 12 home_need | late: crime 8, 10, 12, illness 15; grand 7 home_need, 8 stranded; great 12 and 14 stranded; the warned-danger ranks shuffle |
| v70 events | great-work run won, floors empty; two offering tests | not won; the two offering tests return early (no temple is ever founded: no `foundedSave`) |
| Rush tests (v84 g) | colossus, 160 stone a course | the fixture's default site is the great sphinx (120 a course): 45 days sooner for 1,560 gold (the colossus's 140 is not a whole number of rushed days) |

Not pinned but changed by ruling 1808: grand homes' daily illness risk (0.45 to 0.15 with a well); the advice runs' illness and crime weights above move with it.

## Old tests changed (none deleted)

Villa tax and goal lists (economyData, goalsStage2, v50 grand sim, sim goals clock row); score numbers (stage3 score, contract, earlyGame, scoreUi, sealShare, share, titleDecor, records; stage4 recordsV2, scoreV2, scoreV2Ui, monumentData, simSeams, build, stock; stage45 clock, health, variantLinks; stage46 sizes, wondersData); difficulty words (difficultyHint, difficultyChoice); titles and traits (v90 d titles, traits, ui, pass, fixwave; v90 balance heirs, runs, titles; v91 habits, w0 seams; v92 w0 seams); the balance pins above (v60 great, a/balance, dangers, advice; v70 events; v84 targets and the rush fixture; v50 grand balance and advice; stage4 capital).
