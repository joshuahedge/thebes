# Thebes economy review (Stage 4.5, Task 4a)

13 Oct 2026. Measured with the game's own simulation at **Normal** difficulty, 2,000 starting gold, the 30-second month. Every figure below is a real run; nothing is estimated. Words: *taxes* come in; *upkeep* (a fixed monthly bill per building) and *wages* (4 gold a month per employed worker) go out; *net* is taxes minus those. *Share* is spending divided by taxes (the design target is 60-70%).

The runs: the 10-year village test; the capital run (6 years in the test, 10 here); and three openings I scripted against the game's own commands, on a flat 48-tile map with a fertile strip.

1. **Sensible**: road, 6 plots and a well first; farms, granary, bazaar and temple as people arrive; more plots as homes fill; firehouses at Town; towers at Market town.
2. **Build everything you can afford**: road, 6 plots, then 14 services at once (3 wells, 3 temples, 2 bazaars, 2 granaries, 2 farms, 2 firehouses, about 950 gold). Homes added only when the existing ones are full. I also ran **2b**: the same, but the player stops adding homes at 18 plots.
3. **Roads and homes only**: no services at all; a block of plots whenever the homes fill.

## 1. The first two years

Gold at month end / people / net for the month.

| Mo | Sensible gold | ppl | net | Everything gold | ppl | net | Homes only gold | ppl | net |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2026 | 30 | +27 | 1123 | 30 | -91 | 2024 | 30 | +30 |
| 2 | 1641 | 54 | -60 | 1010 | 48 | -113 | 2054 | 60 | +60 |
| 3 | 1565 | 78 | -76 | 869 | 63 | -126 | 2114 | 90 | +90 |
| 4 | 1381 | 104 | -99 | 740 | 72 | -129 | 2239 | 120 | +120 |
| 5 | 1288 | 130 | -113 | 587 | 87 | -138 | 2384 | 150 | +150 |
| 6 | 1336 | 136 | +13 | 452 | 96 | -145 | 2534 | 180 | +180 |
| 7 | 1533 | 190 | +137 | 368 | 111 | -114 | 2680 | 176 | +176 |
| 8 | 1716 | 253 | +223 | 273 | 140 | -105 | 2852 | 172 | +172 |
| 9 | 1465 | 272 | +189 | 193 | 160 | -105 | 3020 | 168 | +168 |
| 10 | 1654 | 272 | +189 | 90 | 175 | -98 | 3184 | 164 | +164 |
| 11 | 1843 | 272 | +189 | 1 | 184 | -89 | 3344 | 160 | +160 |
| 12 | 2032 | 272 | +189 | **-88** | 199 | -74 | 3500 | 156 | +156 |
| 15 | 2599 | 272 | +189 | -229 | 228 | -21 | 3945 | 145 | +145 |
| 18 | 3166 | 272 | +189 | -194 | 256 | +15 | 4202 | 3 | +3 |
| 21 | 3733 | 272 | +189 | -149 | 256 | +15 | 4271 | 24 | +24 |
| 24 | 4300 | 272 | +189 | -104 | 256 | +15 | 4307 | 11 | +11 |

(Gold includes the goal rewards: 25 each, 50 for finishing the guided start.)

Year by year to 10, gold at year end (people):

| Yr | 10-yr village | Sensible | Everything | Everything, homes stop (2b) | Homes only | Capital run |
|---|---|---|---|---|---|---|
| 1 | 1,919 (272) | 2,032 (272) | -88 (199) | -88 (184) | 3,500 (156) | 1,026 (549) |
| 2 | 4,187 (272) | 4,300 (272) | -104 (256) | -986 (204) | 4,307 (11) | 5,751 (1,090) |
| 3 | 6,125 | 6,238 | 86 (256) | -1,192 (201) | 4,596 (30) | 18,809 |
| 4 | 8,393 | 8,506 | 231 (256) | -1,529 (204) | 4,870 (19) | 32,811 |
| 5 | 10,661 | 10,774 | 606 (260) | -1,899 (204) | 5,057 (25) | 47,973 |
| 6 | 12,929 | 13,042 | 908 (260) | -2,253 (200) | 5,255 (3) | 59,319 |
| 8 | 17,465 | 17,578 | 1,489 (260) | -2,946 (208) | 5,709 (21) | 88,086 |
| 10 | 22,001 (272) | 22,114 (272) | 1,981 (256) | -3,654 (201) | 6,191 (34) | 116,910 (1,090) |

The village and the sensible opening end in the same place: 17 plots of Houses, 272 people, taxes 6,528 a year, wages 3,264, upkeep 996, net +2,268 (65% share, and 81% in year 1). Its workforce is 108 but it has only 68 jobs, so about a third of its workers are idle; mood stays 55-58. The capital run has 380 jobs for a workforce of 436.

**Sensible**: the treasury dips from 2,000 to 1,288 by month 5, because four months lose 60-113 each (-348 in all) while homes fill, then turns positive at month 6 and stays there. Lowest ever: 1,266. Nothing about this is tight.

**Homes only**: gold never falls, but the town does not survive. At 150 people it becomes a Town, and from then on jobless workers cost mood. With no jobs at all that is -85 at once: mood goes from 80 (month 5) to 0 (month 6), people leave and fires (no firehouse) burn 72 plots; 180 people become 3 by month 18. Gold ends year 10 at 6,191 with 34 people.

## 2. The debt trap (opening 2)

First below 0 on **day 331 (month 12)**, bottom -249 (month 16), back above 0 only around month 36. Three costs, with the numbers from the run:

| Mo | Taxes | Wages | Upkeep | Net | Gold |
|---|---|---|---|---|---|
| 1 | 30 | 32 | 89 | -91 | 1123 |
| 3 | 63 | 100 | 89 | -126 | 869 |
| 6 | 96 | 152 | 89 | -145 | 452 |
| 9 | 240 | 256 | 89 | -105 | 193 |
| 12 | 279 | 264 | 89 | -74 | -88 |
| 18 | 368 | 264 | 89 | +15 | -194 |

- **Upkeep starts on day 0.** 14 buildings cost 89 a month from the first day (a well 3, a farm 6, a temple 10).
- **Wages grow with the people.** Each of the 66 jobs pays 4 once there is a worker: 32 in month 1, 152 in month 6, 264 by month 10. A full farm is 10 jobs, so one farm costs 6 + 40 = **46 a month**; a temple 34; a bazaar 32; a granary 30.
- **The gap before tax.** Only 6 plots, so 30 people and 30 gold of tax in month 1. A hut pays 1 gold per person, a Shack 1, a Cottage 2, a House 2, a Townhouse 3. A full job costs 1.6 gold per resident (40% work, 4 each), so until homes reach Cottage, employing people loses money; the 14 buildings need roughly 175 House-tier people just to break even.
- The first month actually looks fine (gold 1,123), because day-0 purchases (950) are paid before any bill arrives and the goal rewards add about 250.

**It can be permanent.** In 2b (homes stop at 18 plots), net sits at -89 a month at 184 people, taxes 264 against 353 of bills, and gold reaches **-3,654 by year 10**. Below -500 the game refuses any new plot or road, so only pausing or demolishing buildings can fix it. (Not measured: how many players would stop adding homes. Debt also costs mood, 1 point per 25 gold, at most -20.)

## 3. What the player is told before this today

- **Cards and the confirm bar** show only the price ("60 gold"). Upkeep and workers are not on either. The building sheet shows workers "6 of 10" but no upkeep.
- **Top bar**: gold, people, mood, date. The "Income" chip (last month's net) is *wide screens only* (hidden on phones and in portrait). It is 0 until month 1 ends and is last month's figure, not a forecast.
- **City summary** (tap the numbers) lists last month's taxes, wages, upkeep and net. The month-summary tip says "Tap the numbers in the top bar to see this month's taxes, wages and food", after the first month, subject to the 3-minute tip gap.
- **Alerts**: the Debt alert fires only once gold is below 0 ("Pause buildings you don't need; taxes rise as homes grow"). A "Get out of debt" goal then pays 10. Purchases are refused only at -500.
- **Goals and picture cards**: none mention upkeep, wages or taxes. The only celebration is "First month in profit", after the fact.

In opening 2 the first signal a player gets is on day 331, with the damage done.

## 4. Mid and late game (capital run)

| Stage (month) | Net a month | Note |
|---|---|---|
| Village (1-5) | -26 to -55 | same early gap |
| Town / Market town (6-9) | -35, -37, -131, -59 | towers and barracks: upkeep 92 to 128, wages 284 to 488 |
| City (11-13) | +456 to +583 | |
| Great city (15-18) | +719 to +1,413 | |
| Capital (19 on) | +1,564 to +1,684 | taxes 3,610 from 1,090 people |

| Year | Taxes | Wages | Upkeep + soldiers | Monuments | Net (excl. monuments) | Share | Share without monuments | Gold at year end |
|---|---|---|---|---|---|---|---|---|
| 1 | 5,606 | 3,820 | 1,097 | 0 | +689 | 88% | 88% | 1,026 |
| 2 | 34,756 | 15,760 | 4,273 | 3,280 | +14,723 | 67% | 58% | 5,751 |
| 3 | 43,320 | 19,488 | 5,064 | 6,240 | +18,768 | 71% | 57% | 18,809 |
| 4 | 43,320 | 18,408 | 5,064 | 6,211 | +19,848 | 69% | 54% | 32,811 |
| 6 | 43,320 | 18,536 | 5,000 | 6,143 | +19,784 | 69% | 54% | 59,319 |
| 8 | 43,320 | 18,240 | 5,064 | 6,240 | +20,016 | 68% | 54% | 88,086 |
| 10 | 43,320 | 18,240 | 5,064 | 6,240 | +20,016 | 68% | 54% | 116,910 |

- **The band holds**: the steady 10-year village is 65% from year 2 (81% in year 1); the capital run is 67-71% (71% in year 3 while crews ramp, a touch over). It reaches the band only because of the monuments' work gold: without it the share is 54-58%, and the village needs its firehouses and towers (without them under 50%).
- **The monuments' sink is limited by workers, not gold.** Four crews cost 520 a month (6,240 a year), so the treasury still gains about 13,800 a year and holds **117k at year 10**. All seven monuments together cost 216,880 gold (the great pyramid alone 104,600) and 1,521 crew-months, which is 32 years with four crews. Only about 56 of 436 workers are spare (380 employed), so more guilds (16 jobs each) are not staffable. The palace's four upgrades add 16,100; a festival costs 200. No change recommended here: a pile at Capital reads as a reward; the numbers to watch are the 60,000 test cap at year 6 and unemployment (13% at year 10).

## 5. Proposals

**1. Show the price of a purchase: "Upkeep N a month · N workers" on every card, and "Monthly balance becomes +X/-X" on the confirm bar (plan 4b item 1).** The numbers a player would see: well 3; grain farm 46 (upkeep 6 + 10 workers x 4); granary 30; bazaar 32; temple 34; firehouse 20; tower 24; barracks 36 plus 8 a soldier. Against: a full Cottage pays 24 a month, a House 32, a Townhouse 66. In opening 2 the 14th building's bar would read -89 at purchase on day 0. Effect: the cost is visible at the moment of choice; no sim change.

**2. A forecast in the top bar, shown on phones too, with an earlier warning (plan 4b items 2 and 3, amended).** Two changes to the plan's rule, both from the numbers:
- *Amber only when the treasury would run out within 6 months*, not whenever the forecast is below 0. The sensible opening forecasts -60 to -113 for months 2-5 with 1,300-1,600 in the bank, so the plan's rule would show amber for 4 months to the best player. Treasury over bill: opening 2 goes amber at month 4 (740 / 129 = 5.7 months), eight months before debt.
- *The one-time tip looks 3 months ahead*, not 1. The plan's "next month would take it below 0" fires in opening 2 at month 11 (one month before debt); a 3-month look fires at month 8 (273 less 3 x 105 is below 0), with Show me on the biggest cost.

**3. A seventh picture card, "Gold", and an opening goal that teaches it (plan 4b item 4).** Card words from the data: homes pay taxes (Hut 5, Cottage 24, House 32 a month when full); every building has a monthly bill; homes before luxuries. Goal: **"End a month in profit"** (the game already counts it): it completes at month 6 in the sensible opening (net +13, about 3 minutes at 1x), right after the guided start, which is exactly when a player first sees tax catch up. 25 gold.

**4. Daily goals "about five minutes" (src/data/daily.js) is not true for one goal and loosely true for the rest.** Measured in game days from when the goal is drawn (1 day = 1 s at 1x now; 3x is a third; the old 1.5 days a second was two-thirds):

| Goal | Days | At 1x |
|---|---|---|
| people20 | 10-28 | under 0.5 min |
| upgrades3 | 30-58 | 0.5-1 min |
| harvest100 | 16-63 | 0.3-1 min |
| profit1 | 30-148 | 0.5-2.5 min |
| pottery30 | 30-86 | 0.5-1.5 min |
| course1 / stone100 | 167-321 | 3-5.5 min |
| sell20 | 480-600 | 8-10 min (2.7-3.3 min at 3x) |

Selling 10 takes the same 480-600 days: the wait is for the first caravan, not the amount. Propose: drop sell20 from the pool (or draw it only when a caravan has already come), and reword the comment and spec 3.7 to "a few minutes at 1x, under two at 3x". Everything else already fits.

**5. Soften the unemployment cliff at Town.** The mood penalty is 100 per share of jobless workers above 15%, from the moment the city is a Town. A city of homes with no work goes from mood 80 to 0 in one month (-85). Proposal: phase it in over 6 months after Town (-14 a month, so full only after six months). The existing Jobs alert and "Make more jobs" goal would then have time to work. Affects only cities that grow past 150 with under 15% employment.

## 6. A softer first year: not warranted

Tested on each opening (wages cost 2 instead of 4 for the first months, or 2,500 to start):

| Change | Sensible: lowest gold | Everything: lowest gold | Everything, homes stop (2b): first debt, gold at year 10 |
|---|---|---|---|
| none | 1,266 | -249 | day 360, -3,654 |
| half wages, first 6 months | 1,537 | +53 | day 450, -3,352 |
| half wages, first 12 months | 1,537 | +739 | day 900, -2,632 |
| start with 2,500 | 1,766 | +251 | day 510, -3,154 |

The sensible opening never gets near 0 (lowest 1,266 of 2,000), so it needs no help. The greedy opening dips only to -249 and recovers by itself if homes keep coming. A softer year removes that mild dip but only *delays* the permanent trap in 2b by 3 to 18 months, and it hands a sensible player 360 to 1,110 more gold (year-1 gold +18% to +55%). The cure is teaching (proposals 1-3), not money. If Josh wants a cushion anyway, the cheapest is **half wages for the first 6 months**: it exactly covers opening 2 (lowest +53) and is easy to explain ("first-season workers are cheap").

## Picks for Josh

1. Show upkeep and workers on cards, and the monthly balance on the confirm bar (proposal 1): yes / no.
2. Forecast chip on phones, amber only when the treasury runs out within 6 months (not whenever negative): yes / the plan's literal rule / no.
3. The warning tip looks 3 months ahead (month 8 in the greedy opening) instead of 1 (month 11): yes / no.
4. A "Gold" picture card plus the "End a month in profit" goal after the guided start: yes / card only / no.
5. Softer first year: none (recommended) / half wages for 6 months / start with 2,500.
6. Daily goals: drop the selling goal and reword "about five minutes": yes / no.
7. Phase in the Town unemployment penalty over 6 months: yes / leave it.
8. Late-game treasury pile (117k at year 10): leave as is / ask for a gold sink.
