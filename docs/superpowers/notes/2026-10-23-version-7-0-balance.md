# Version 7.0 balance pass (wave 3)

Written 23 Oct 2026 on `v70-b` (from 9106ec7). Rulings 975-984 are this pass's (the controller appends them as Part 18). No game number (`src/data`) was changed: every run that holds does so with the 6.0 numbers and a steadier player.

## What was done

The 6.0 and 6.0.1 balance runs measured the game before the city events. Two shims kept them green: `tests/v70/e/hold.js` (no event is ever drawn) and `setLegacyTowers` (the scripted player keeps 6.0's tower hand). This pass turned the events **on** where they can honestly be, with a player of them (`tests/v70/balance/events.js`), and recorded each event drawn.

| run | events | how it ends (assertions unchanged) |
|---|---|---|
| village, capital, grand (dangers off) | held (ruling 975) | as 6.0: grand Villa month 89, Estate 98, no raid lost |
| late (to year 15) | on from year 6 | 3 raids beaten, lowest 20,666, year 15 25,152 (6.0: 24,307), every quota met |
| careless | on, every event takes its default | -11,012 at year 15 (6.0: -11,437), debt as before |
| great work, dangers off | on from year 10 | won day 7,021 (7,030), lowest 3,945 (2,171-2,313) |
| late, dangers on | on from day 0 | 5 raids beaten, lowest 17,238 (17,618), year 15 22,343 (21,067) |
| grand district, dangers on | on from year 7 | 3 raids beaten, lowest 20,039, people 1,165 |
| great work, dangers on, seed 5 (habits) | on from year 10 | won day 6,669 (6,699), lowest 23,030, 6 of 6 raids |
| great work, dangers on, seed 10 | on from year 10 | won day 6,084 (6,097), lowest 6,252, 5 of 5 raids |

### Events drawn (day offered, id, choice taken; `*` the stated default, `L` it lapsed to it)

| run | drawn | paid or non-default | the default chosen |
|---|---|---|---|
| late | 15 | 11 | 4 |
| careless | 16 | 0 | 15 lapsed, 1 still waiting at year 15 |
| great work (off) | 16 | 4 | 12 |
| late (dangers) | 20 | 14 | 6 |
| grand district (dangers) | 6 | 4 | 2 |
| great work, seed 5 | 15 | 9 | 6 |
| great work, seed 10 | 15 | 4 | 11 |

The headline: **no event drawn in any run sank it**, and every default was survivable with a thin treasury: the great-work run with every event left to its default won on day 7,013 with 7,436 the lowest. What sank it was paying for them (below).

```
late        2162 healer send_away*, 2342 fever gate, 2552 hoard keep*, 2702 sandstorm sweep, 3005 healer cure, 3245 thief watch, 3515 opet small, 3666 quarry_strike raise_wages,
            3846 healer cure, 4116 sandstorm sweep, 4356 envoy greet*, 4626 fever gate, 4866 opet small, 5076 quarry_strike raise_wages, 5256 scribes collect*
careless    2162 healer, 2342 fever let_in, 2552 bumper store, 2702 sandstorm weather, 3005 healer, 3245 thief let_run, 3515 opet decline, 3666 feud let_be, 3846 healer, 4148 rumour ignore,
            4328 hoard keep, 4598 quarry_strike strike, 4770 scribes collect, 4920 lost_caravan write_off, 5100 opet decline (all L); 5340 workshop_quarrel waiting
great (off) 3600 hoard keep*, 3780 lost_caravan write_off*, 3990 healer cure, 4153 feud send_watch, 4363 bumper store*, 4633 rumour ignore*, 4904 bumper store*, 5175 quarry_strike raise_wages,
            5359 opet small, 5640 sandstorm weather*, 5910 envoy greet*, 6150 workshop_quarrel quarrel*, 6416 hoard keep*, 6596 sandstorm weather*, 6806 craftsman pass*, 6987 workshop_quarrel quarrel*
late (dgr)  390 healer send_away*, 600 fever gate, 840 envoy greet*, 1029 workshop_quarrel settle_it, 1320 opet small, 1530 sandstorm sweep, 1770 bumper store*, 2341 quarry_strike raise_wages,
            2611 scribes collect*, 2761 rumour gift, 2997 bumper store*, 3270 sandstorm sweep, 3480 opet small, 3720 fever gate, 4140 hoard keep*, 4320 quarry_strike raise_wages,
            4560 healer cure, 4710 sandstorm sweep, 5051 opet small, 5201 workshop_quarrel settle_it
grand (dgr) 2341 bumper store*, 2551 sandstorm sweep, 2792 envoy feast, 2981 quarry_strike raise_wages, 3270 bumper store*, 3541 workshop_quarrel settle_it
great, s5   3600 scribes collect*, 4157 workshop_quarrel settle_it, 4320 craftsman pass*, 4500 quarry_strike raise_wages, 4770 bumper store*, 5097 lost_caravan search, 5367 pilgrims camp*,
            5517 fever gate, 5668 bumper store*, 5848 sandstorm sweep, 6058 envoy feast, 6333 lost_caravan search, 6543 bumper store*, 6803 fever gate, 6983 healer cure
great, s10  3600 hoard keep*, 3810 sandstorm weather*, 4020 bumper store*, 4290 lost_caravan write_off*, 4512 envoy greet*, 4692 sandstorm weather*, 4842 healer cure,
            5101 workshop_quarrel settle_it, 5400 bumper store*, 5610 feud send_watch, 5865 craftsman pass*, 6120 lost_caravan search, 6660 scribes collect*, 6870 sandstorm weather*, 7110 envoy greet*
```

### Advice's top item at checkpoints

| run | checkpoints (kind of the first item) |
|---|---|
| village | y3 y6 y10 home_need |
| capital | y6 raid_towers |
| late | y8 illness, y10 illness, y12 home_need, y15 illness |
| careless | y8 raid_towers, y12 raid_towers, **y15 home_need** (was raid_towers) |
| grand | y7 illness, y8 illness, y9 raid_towers, y10 illness |
| great work (off) | y12 home_need, **y14 home_need, y16 home_need** (were stranded), y18 stranded, y20 stranded |
| late (dangers) | y4 plague, y6 drought, y8 home_need, y10 home_need, y12 home_need, y15 plague |
| grand (dangers) | y4 plague, y6 drought, y8 illness, y10 home_need |
| great, seed 5 | y12 crime, y14 home_need, y16 home_need, y18 crime, y20 home_need |
| great, seed 10 | y12 crime, y14 home_need, y16 home_need, y18 drought, y20 stranded |

The three bold points moved with the city they read (ruling 980). Every top-three item at every point still has words and nothing the sim would refuse (`tests/v60/balance/advice.test.js`).

## What broke, and why

**The known break, found.** With the events on from day 0 the seed-5 dangers-on great-work run loses its third raid (year 9, 22 raiders: towers killed 4 of them, against 20 with the hold) and never reaches the Seat. Nothing about the events does it: the city has eight working towers either way, but seven stand 13 to 19 tiles from the band's first strike (the trading post), because the run builds them between raids from the un-warned advice, which aims at the city's start. Which towers a band meets is a coin; any perturbation flips it, and an event is a perturbation. The 6.0.1 run won on that coin. With the events starting at year 10 (the grand years keep the hold) the same run wins as it did.

**The same chaos, further down.** Once the towers were built only when a raid is warned (the item then aims at the first strike), the run still diverged: pottery stayed at 30 to 60 (no Advice item says the tribute needs pottery), so two yearly tributes were missed, favour fell and the court's due doubled. A player who reads the tribute card builds a potter; that habit, and taking down the road the tower advice laid across the temple's site, got the grand run (Villa 89, Estate 103) and the seed-5 great-work run (won 6,711) through. Four of the five other configurations sank (ruling 978).

**Paying sinks it, not the events.** The great-work run answered with a flat 800 spare paid about 10,000 of fees (a rumour's gift 2,350, a feud's watch 1,380, a caravan's search 1,180) and lost its win (lowest -3,680, no win by day 7,200); the same run with every event left to its default won on day 7,013. The player now pays only a price that is a tenth of the treasury beyond its spare (a quarter for a strike or a quarrel, which stop the quarries and the workshops), and keeps 15,000 for the crews while the great temple rises (ruling 977).

## Rulings

975. The late run (from year 6), the careless run (every event takes its default) and the great-work run (from year 10) play with the city events on; village, capital and the dangers-off grand run keep the hold. — Cost if wrong: those three runs say nothing about events, and the capital's years 2 to 6 (Town and Market town) meet events only in the dangers-on late run, where they are on from day 0.

976. In the dangers-on runs the late run has the events from day 0, the grand-district run from year 7, and the great-work runs from year 10 (their grand years keep the hold). Measured: events from day 0 sink the seed-5 great-work run (third raid lost, no Seat), sink seed 10 (never finishes), and the grand-district run meets no wreck and no looting (its `wrecked >= 1` and `looted >= 1` assertions). — Cost if wrong: the grand years of the great-work runs are never played with events; their Estate and Seat (months 74 to 127) rest on the 6.0.1 coin.

977. The scripted player pays a price only when it is at most a tenth of the treasury beyond a spare of 800 (a quarter for a strike or a quarrel), the spare is 15,000 from the great temple's founding until it is finished, and it spends goods only above what trade holds back. — Cost if wrong: it pays less than a keen player would, so the lean last years of the great work are measured with fewer paid answers than a real player gives.

978. The 6.0 tower hand (`setLegacyTowers`, ruling 969) stays for the grand and great-work runs. Tried and measured: the real hand with towers only once a raid is warned, a potter when the tribute asks for pottery and the road across the temple's site taken down held the grand run (Villa 89, Estate 103, none lost) and the seed-5 dangers-on run (won 6,711, lowest 23,030) and sank the dangers-off run (lowest -13,581), seed 10 (-52,640), and, without the tribute habit, the dangers-off run (-2,384 to -2,932), seed 5 (-26,349) and seed 10 (-4,803). The late run lays its own towers and never used the hand. — Cost if wrong: the 7.0 tower advice is proven by `tests/v70/a` and the late run's raids, but no driver lives with it for ten years.

979. The great-work run keeps the offerings with the Trade sheet's Keep at least from the founding (`keepOfferings`: each good the offerings still ask for at the most any stage to come needs, gone when the last is made). No run sells those goods (beer is on Ignore), so a test puts them on sale in the founding city both ways. — Cost if wrong: the floor never binds in the run itself; the test is what proves it.

980. Three Advice pins moved with the runs that now meet events and are re-recorded in `tests/v60/balance/advice.test.js` with their reasons: careless y15 home_need (was raid_towers), great work y14 and y16 home_need (were stranded); every other pin is unchanged and every item still has words and nothing the sim refuses. — Cost if wrong: the pins say less about the 6.0 city and more about the 7.0 one.

981. No `src/data` number changed: no real player hit a wall the events made (every default survives the thinnest margin the runs have, and the paid answers are a choice). — Cost if wrong: a keen player who answers everything meets the great-work run's thin treasury sooner than the script, which leaves it to the defaults.
