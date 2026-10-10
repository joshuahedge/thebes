# Pharaoh Heaven - Strategy section (design reference)

Source: https://pharaoh.heavengames.com/strategy/ and sub-pages, read 10 Oct 2026 via WebFetch.
Purpose: MECHANICS and NUMBERS as reference for an original city builder. No art or data files reused. Site content is (c) Heavengames; this file is a numeric/mechanical digest, not a reproduction.

## Reliability caveats (read first)
- WebFetch runs a small model over each page and returns a summary/transcription. Tables were flattened by the scraper; column labels were sometimes inferred. Where I could cross-check two pages (hous1 vs hous2 vs the entertainment article), I corrected labels below. Anything marked [UNVERIFIED] should be re-checked on the live page before it is built into game data.
- Difficulty columns everywhere: VH = Very Hard, H = Hard, N = Normal, E = Easy, VE = Very Easy.
- Money unit is the "deben" (Db). In the trade pages "Db" after a partner is a route cost/distance figure as the page lists it.
- Pages not fetched: Hotkeys, Rostja tips, Mission Creation Hints, How to get 6 monuments, Military Upper Hand (not mechanics-relevant). Three forum threads were only read to ~100k chars each (cut off by tool).
- The /strategy/ index lists also a "Walkthroughs" section (not in my scope).

---

## 0. Strategy index
URL: https://pharaoh.heavengames.com/strategy/
Contents: an article list plus pointers to Housing Blocks, Block Generator, Cheats, Walkthroughs, VitruviusAIA's Charts, Commodity Data Sheets, Trade Maps.

Articles linked (all under https://pharaoh.heavengames.com/strategy/ unless noted):
| Article | Author | Slug | Topic |
|---|---|---|---|
| Work Camps | Angel Socrateius | workcamps/ | labour supply for farms and monuments |
| Entertainment: more than you may wish to know | Nerdicus ("Nero Would") | nerowouldentertainment/ | entertainment mechanics, numbers |
| Mission Creation Hints | Ken Parker (producer) | kenmissionediting/ | scenario design |
| The Gods in Pharaoh | Angel Reckless Rodent | gods/ , gods2/ | blessings and wrath |
| Hotkeys | MRed94 | hotkeys/ | - |
| Rostja tips | Cherub Baltic | balticrostja/ | scenario tips |
| Enemy Numbers | Angel Reckless Rodent | milnumbers/ | unit stats |
| Days, weeks, ticks, and production values | Nerdicus | numbers/ | timing and production rate engine |
| The Monuments | Angel Reckless Rodent | monuments/ | sizes and materials |
| Housing Levels | Angel Reckless Rodent | housinglevels/ | level requirements (links poptaxnumbers/) |
| How to get 6 monuments | Local_Yokel | sixmonuments/ | - |
| Gaining the Upper Hand on Military Campaigns | Vriesea | milupperhand/ | - |

Forum threads on housing blocks (on caesar3.heavengames.com, forum 25): "The Flexi-block" (Afterburner, f=25,3100), "More Housing Blocks" (VitruviusAIA, f=25,2237), "Housing Block Essay" (SenetEr, f=25,447).

---

## 1. Housing Blocks gallery
URL: https://pharaoh.heavengames.com/strategy/housing/ ("Housing Layouts")
The page is a gallery of ten block diagrams with one-line captions only (designer + type); no walker/roadblock reasoning text on the page itself. The reasoning is in the forum threads (section 1b).

Designs listed:
| # | Design | Note from caption |
|---|---|---|
| 1 | MRed94 - common block | standard housing block |
| 2 | MRed94 - palace block | palace-style |
| 3 | Buggi - estate block | estate (4x4) housing |
| 4 | Buggi - normal block | standard |
| 5 | Buggi - massive normal block | larger |
| 6 | Buggi - massive estate block | larger estate |
| 7 | Buggi - industry block | housing tied to industry |
| 8 | Khufuh - block | - |
| 9 | Simon Righarts - block | caption: holds 3000 people |
| 10 | Octavian II - tri-road block | three-road layout (by name) |

### 1a. One example I could actually see (a city layout, not a pure block)
I viewed mred-common.png (906x891 px; it was auto-saved by the fetch tool, I did not download others). It is a mini-city plan on a square grid, labelled boxes: 
- A housing block of about 10 columns x 5 rows of 1x1 houses ("H") ringed by a road loop; a rectangular garden occupies the middle of the block (about 6x2 tiles) so the houses wrap it.
- Services sit ON the loop corners: four Juggler Booths ("J. Booth") at the block's corners, Water Supply buildings on two sides, a Temple and two Juggler Schools adjacent, Bazaars outside the loop with a small "E / F / P" trio (E = architect, F = fire, P = police, as 1x1 posts) tucked beside them. Police posts ("P") sit at loop corners.
- Industry is separate: three Granaries, Farms in a cluster with three Work Camps, a Pavilion, a Small Palace, then a southern industrial cluster (4 Storage Yards, 3 Potters, 5 Clay Pits around a Small Lake) with its own tiny 2x3 house cluster for local labour.
- Design lesson visible in the plan: one compact housing block with a single ring road and all walker-service buildings touching the ring; a thin shared "spine" road connecting block, farms and industry; labour houses placed next to industry.

### 1b. Block reasoning from the forum threads
Source threads: caesar3.heavengames.com forum 25 (f=25,2237 VitruviusAIA; f=25,447 SenetEr; f=25,3100 Afterburner).

**SenetEr "Housing Block Essay" (2000)**
- Why blocks: (1) capacity planning, (2) shared bazaar/fire/police/water, (3) control of evolution.
- Block capacities by level for his 25x11 design: 336 (huts, with water supply), 624 (rough cottages, after food + priest), 720 (ordinary cottages, after entertainment), 864 (modest apartments, after pottery + beer), 1104 (fancy residences).
- Layout: minimum footprint 25x11 with space top/bottom for industry/granary; core is a 19x9 road RING with gardens in the corners and 3-tile gaps for later 3x3 buildings; entrance carries entertainers, delivery men, market ladies, and can later become a bandstand. Roadblocks sit on the inner road and at the entrance.
- Walker rule: "loop length must be less than double the walker's 'long walk'" so every walker completes the loop. One tile too long = short walkers return without finishing, so far-side houses starve. A pavilion "cross" road that connects to both sides of the ring lets walkers cut through and miss part of the loop, even with roadblocks at each end. If services do not reach the far side, check roadblocks first; a second bazaar fixes distribution; upgraded bazaars have two sellers.
- Labour: a recruiter only needs to pass within 2 squares of a house to draw workers, so a single "feeder" house outside the block can staff nearby industry. Recruiters can enter the block only if the roadblock is removed.
- Evolution control: food only after the first export industry runs; early on a temple plus shrine keeps gods happy; entertainment: bandstand + juggler school gets cottage level, or venues with perfect ratings. City-wide venue coverage gives 5 bonus points per venue type (3 types = 15, 20 with perfect senet house coverage) - enough for modest apartments without a school.
- Fancy Residence needs: entertainment, courthouse, school, second food, dentist, linen, second god's priest. Prefer 2x2 housing to 1x1; deleting a house lets 1x1 units merge/expand into 2x2s.
- "Scribe switches": a statue behind the central house of each quadrant keeps it from evolving into a manor; removing one lets that house evolve into a 3x3 manor. Remove one at a time to control unemployment (scribe-class residents stop working).
- Manors need mortician (linen), library, third temple/god, senet house; estates (4x4) need high desirability, second luxury, third food.

**VitruviusAIA "More Housing Blocks" (2000-2005)**
- Worker Housing Block: 52-tile inner loop (originally the largest stable); later revised to 50, and 44-tile intersection-free blocks recommended (a 44-tile version with pavilion intersection failed because walkers entered the intersection and reversed). Dead-end roads removed because they cause walker problems on harder difficulties.
- Targets Common Residence (max pop 2,800) / Spacious Residence (2,940) with a second food; taxes ~4,536 Db/year at 9%. Outer road lets recruiters pick up workers; Police Station first, Courthouse once beer is supplied; Fire House + Architect's Post cover storage yards/granary.
- Manor Block (Fancy Residences): 52-tile loop, 1,748 pop, ~3,775 Db/yr; small statues behind houses block premature evolution to manors; two bazaars so houses do not run short and devolve.
- Manor Block #1: 12 Stately Manors + Dynasty Mansion: 1,580 pop, ~10,643 Db/yr; Block #2 swaps Mansion for 6x6 City Palace (same numbers) or 4 more Stately Manors = 16 manors, 2,076 pop, ~14,125 Db/yr; large statues and gardens for desirability; keep forts, mines, docks, shipwrights away.
- Estate Block (Palatial): up to 1,200 pop, ~10,368 Db/yr; shrines + small statues decide where estates can evolve; 2-3 bazaars each set to specific goods; temple complex can replace large statues but needs workers from another block. Double Estate Block: 12 Palatial Estates.

**Afterburner "Flexi-block"**
- Design for Palatial Estate; a block that supports fancy housing supports all lower levels. Any 2x2/3x3/4x4 can be swapped for another of the same size within coverage/water/desirability limits.
- Layout: lengthwise roads 20 tiles long, 4 tiles between them; "tail" = entertainment, "head" = services. Palatial version needs one 4x4 Senet House, five 3x3, five to seven 2x2, three to five 1x1 services, plus 3 irregular entertainment venues.
- Roadblocks mark the inflexible core; mortuaries fill flexible slots. Pavilion interior road acts as a walker trap: worst-case loop 56 tiles (houses two squares off a service may never be reached). Tia's revision: worst-case 44 tiles, ~1,472 pop at fancy level, no longer flexible. Stable examples: 59 road squares (Ordinary Cottages), 54 (Common Residences). Problems arise mainly with 3x3 buildings on the exterior and walkers "short-circuited".

Images seen (full-size, all under https://pharaoh.heavengames.com/wp-content/uploads/sites/2/2021/02/):
mred-common.png (viewed), mred-palace.png, estatelayout.gif, citylayout.gif, massivelayout.gif, massiveestate.gif, industrylayout.gif, khufuh-block.png, simon-block.png, octavian-tri-road.png. Thumbnails add -300x295 etc. Only mred-common.png was actually viewed.

---

## 2. Block Generator ("Pharaoh Glyphy")
URL: https://pharaoh.heavengames.com/strategy/pharaohglyph/ ; legend https://pharaoh.heavengames.com/strategy/pharaohglyph/legend/
- Browser script adapted from "Glyphy 1.1" by Crassus Pauper. You type a text grid; it outputs HTML that places tile GIFs, for posting on the forum.
- Interface: Glyph-Directory (legend + image settings), Character-Input, Code-Output.
- Input is scanned top-left to bottom-right. Example: `HHHHHH=WW   HHHHHH=WW   =========` (H house, = road, W water supply?, space = blank). "." is a placeholder: `LLHHHHFHHHH   LLHHHHDHHHH   RRRRRRRRRRR` equals `L.H.H.FH.H.   ......D....   RRRRRRRRRRR`.
- Limit: 40 rows x 40 columns. Walls, towers, docks, fishyards and military glyphs not supported.
- Water-facing buildings (ferry, fishery, wharf) face South by default; last digit of the GIF filename sets facing: 1=S, 2=W, 3=N, 4=E.
- Output switch: "Local Dir" for local preview, "Forum-Dir" + "HTML-Code" to produce forum markup.
- What a block looks like in this tool: a flat grid of tile glyphs - houses (1x1, 2x2, 3x3 manor, 4x4 estate), roads, roadblocks, gardens, services.

Legend glyph catalogue (images at https://pharaoh.heavengames.com/strategy/tiles/): 
- Houses: house1/2/3/4.gif (1x1, 2x2, 3x3 manor, 4x4 estate).
- 1x1: apothecary, architect, dentist, firewarden, juggler platform, police, roadblock, shrine, well.
- 2x2: dance platform, music platform (h/v), ferry, fishery, juggler school, mortuary, physician, scribe school, water lift, water supply, work camp.
- 3x3: temples (Bast, Osiris, Ptah, Ra, Seth), barracks, conservatory, courthouse, dock, library, shipyard, storage yard, warship wharf.
- Larger: academy, chariotmaker, festival plaza, senet house, mansions (s/m/l), palaces (village/town/city), temple complex.
- Industry 2x2: brewery, brickmaker, jeweler, potter, weaver, weaponsmith, mines (copper/gem/gold), quarries (granite/limestone/plainstone/sandstone).
- Farms 3x3: cattle, barley, chickpeas, figs, flax, lettuce, pomegranates, wheat.
- Monuments: bricklayers, carpenter, mason, mastabas (s/m/l), obelisks (s/l), pyramids (s/m), mausoleum.
- Terrain: desert, floodplain, goldrock, grass, lush grass, meadows, reeds, rocks, trees. Storage-yard kit pieces per good (bricks, clay, granite, linen, limestone, plainstone, sandstone, straw, wood).

---

## 3. VitruviusAIA's Charts (index)
URL: https://pharaoh.heavengames.com/strategy/charts/ - two chart sets: Housing (hous1, hous2) and Structures (struct1-4).

### 3a. Housing Chart Page 1 - https://pharaoh.heavengames.com/strategy/charts/hous1/
Columns: Level | Size | Pop | Evolve (min desirability) | Entertainment | Services | Prosperity | Taxes | Desirability D1-D6. Credits Nero Would, Grumpus The Elder, VitruviusAIA.

**Level table** (Pop = max occupants: first value for a 1x1 house, second for 2x2 (x4); Evolve desirability listed VH/H/N/E/VE; Services = what must be present to reach this level, in addition to desirability and entertainment):
| # | Level | Size | Pop 1x1 / 2x2 | Evolve desirability VH/H/N/E/VE | Service gate |
|---|---|---|---|---|---|
| 1 | Crude Hut | 1x1,2x2 | 5 / 20 | -98 all | none |
| 2 | Sturdy Hut | 1x1,2x2 | 7 / 28 | -10 all | Well or Water Supply |
| 3 | Meager Shanty | 1x1,2x2 | 9 / 36 | -5/-5/-5/-6/-7 | 1 type of food |
| 4 | Common Shanty | 1x1,2x2 | 11 / 44 | 0/0/0/-1/-2 | access to 1 god |
| 5 | Rough Cottage | 1x1,2x2 | 13 / 52 | 4/4/4/3/2 | Water Supply |
| 6 | Ordinary Cottage | 1x1,2x2 | 15 / 60 | 9/8/8/7/6 | Entertainment |
| 7 | Modest Homestead | 1x1,2x2 | 16 / 64 | 13/12/12/11/10 | Pottery |
| 8 | Spacious Homestead | 1x1,2x2 | 17 / 68 | 17/16/16/15/14 | Physician or Mortician |
| 9 | Modest Apartment | 1x1,2x2 | 18 / 72 | 21/20/20/19/18 | Beer |
| 10 | Spacious Apartment | 1x1,2x2 | 19 / 76 | 26/25/25/23/22 | Courthouse |
| 11 | Common Residence | 2x2 | - / 80 | 33/32/32/30/29 | Scribe School or Library |
| 12 | Spacious Residence | 2x2 | - / 84 | 41/40/40/38/37 | Dentist + 2 food types |
| 13 | Elegant Residence | 2x2 | - / 88 | 50/48/48/46/45 | Linen |
| 14 | Fancy Residence | 2x2 | - / 92 | 55/53/53/51/50 | access to 2 gods |
| 15 | Common Manor | 3x3 | - / 100 | 60/58/58/56/55 | 1 luxury good |
| 16 | Spacious Manor | 3x3 | - / 108 | 65/63/63/61/60 | Physician AND Mortician |
| 17 | Elegant Manor | 3x3 | - / 116 | 70/68/68/66/64 | School AND Library, 3 gods (Easy: 3 gods not needed until Stately Manor) |
| 18 | Stately Manor | 3x3 | - / 124 | 76/74/74/72/70 | (footnote: senet-house entertainment requirement of Grumpus's older chart is replaced by the entertainment bonus on Normal, and on Hard without Cleopatra) |
| 19 | Modest Estate | 4x4 | - / 184 | 82/80/80/77/75 | 2 luxury goods |
| 20 | Palatial Estate | 4x4 | - / 200 | 92/90/90/87/85 | 3 food types (not required on Very Easy) |

Cross-check against the Housing Levels article (https://pharaoh.heavengames.com/strategy/housinglevels/): same gating; it adds gods accessible per level (1 from Common Shanty, 2 from Fancy Residence, 3 from Elegant Manor), food types (1 from Meager Shanty, 2 from Spacious Residence, 3 at Palatial Estate), "Well" first at Sturdy Hut, Market at Meager Shanty, Water Supply at Rough Cottage. Evolving to Common Manor makes residents scribes who STOP contributing to the workforce, so keep spare unemployment beforehand.

**Entertainment requirement per level and difficulty** (corrected: the "Prosperity" columns in the raw scrape are really the entertainment-point requirement; confirmed by the Nero Would entertainment article). Values VH/H/N/E/VE:
| Level | VH/H/N/E/VE |
|---|---|
| Rough Cottage and below | none |
| Ordinary Cottage | 10/10/10/10/10 |
| Modest Homestead | 20/15/13/13/12 |
| Spacious Homestead | 25/20/16/15/14 |
| Modest Apartment | 30/25/20/18/16 |
| Spacious Apartment | 35/30/25/22/18 |
| Common Residence | 40/35/30/25/20 |
| Spacious Residence | 45/40/35/30/25 |
| Elegant Residence | 50/45/40/35/30 |
| Fancy Residence | 55/50/45/40/35 |
| Common Manor | 60/55/50/45/40 |
| Spacious Manor | 65/60/55/50/45 |
| Elegant Manor | 70/65/60/55/50 |
| Stately Manor | 80/75/70/60/55 |
| Modest Estate | 90/85/80/72/65 |
| Palatial Estate | 100/95/90/83/75 |
(Housing Levels article lists Normal values as 10,13,16,20,25,30,35,40,45,50,55,60,70,80,90 from Ordinary Cottage upward, i.e. slightly different at upper levels vs. the chart's N column: chart says Stately 70, Modest Estate 80, Palatial 90; article says 70/80/90 for Stately/Modest Estate/Palatial. Consistent.)

**Unlabelled column** [UNVERIFIED]: the scrape shows another per-level VH/H/N/E/VE block (Crude Hut 5/5/5/10/15 ... Fancy Residence 75/80/90/100/120, Common Manor 450/450/500/600/650 ... Palatial Estate 1800/1900/1900/2200/2300). A second reading of the page called this "Prosperity". It is likely a prosperity-cap/rating-related value tied to the tax rating. The page's worked example: prosperity cap on Hard = (1300 x 25 + 1000 x 60) / 2300 = 40.

**Tax multiplier VH/H/N/E/VE and yearly tax at 10% tax rate for a full 2x2 (or bigger) house**:
Tax formula (page): tax per year = population x multiplier x tax-rate% x 6. Example: full Common Residence on Hard at default 9% = 80 x 3 x 9% x 6 = ~129 Db. Conversion factors: x0.7 for 7%, x1.5 for 15% relative to 10%.
| Level | Multiplier VH/H/N/E/VE | Tax at 10% (full house) VH/H/N/E/VE |
|---|---|---|
| Crude Hut | 1/1/1/1/2 | 12/12/12/12/24 |
| Sturdy Hut | 1/1/1/1/2 | 16/16/16/16/33 |
| Meager Shanty | 1/1/1/2/3 | 21/21/21/43/64 |
| Common Shanty | 1/1/1/2/3 | 26/26/26/52/79 |
| Rough Cottage | 1/2/2/2/3 | 31/62/62/62/93 |
| Ordinary Cottage | 2/2/2/2/3 | 72/72/72/72/108 |
| Modest Homestead | 2/2/2/3/4 | 76/76/76/115/153 |
| Spacious Homestead | 2/2/2/3/4 | 81/81/81/122/163 |
| Modest Apartment | 2/3/3/3/4 | 86/129/129/129/172 |
| Spacious Apartment | 2/3/3/3/4 | 91/136/136/136/182 |
| Common Residence | 3/3/3/4/5 | 144/144/144/192/240 |
| Spacious Residence | 3/3/3/4/5 | 151/151/151/201/252 |
| Elegant Residence | 3/4/4/5/6 | 158/211/211/264/316 |
| Fancy Residence | 4/4/4/5/6 | 220/220/220/276/331 |
| Common Manor | 11/10/10/12/13 | 660/600/600/720/780 |
| Spacious Manor | 11/10/11/13/14 | 712/648/712/842/907 |
| Elegant Manor | 12/12/12/14/15 | 835/835/835/974/1044 |
| Stately Manor | 12/12/13/15/16 | 892/892/967/1116/1190 |
| Modest Estate | 15/15/15/16/17 | 1656/1656/1656/1766/1876 |
| Palatial Estate | 15/16/16/17/18 | 1800/1920/1920/2040/2160 |
Note: the "tax" values at manor level jump ~4x vs. Fancy Residence - which is why the game's economy turns on manors/estates.

**Max annual tax per house at base rate** (from https://pharaoh.heavengames.com/strategy/poptaxnumbers/): Crude Hut 5 pop/2.5 Db; Sturdy 7/3.5; Meager 9/4.5; Common Shanty 11/5.5; Rough Cottage 13/13; Ordinary 15/15; Modest Homestead 16/16; Spacious Homestead 17/17; Modest Apt 18/27; Spacious Apt 19/28.5; Common Residence (2x2) 80/120; Spacious Res 84/126; Elegant Res 88/176; Fancy Res 92/184; Common Manor (3x3) 100/500; Spacious Manor 108/594; Elegant Manor 116/696; Stately Manor 124/806; Modest Estate (4x4) 184/1380; Palatial Estate 200/1600. 2x2 versions of 1x1 levels = 4x pop and 4x tax.

**Desirability effect each housing level exerts on neighbours (D1 = adjacent ... D6 = six tiles)**:
| Level | D1 | D2 | D3 | D4 | D5 | D6 |
|---|---|---|---|---|---|---|
| Crude Hut - Ordinary Cottage | -2 | -1 | 0 | 0 | 0 | 0 |
| Modest/Spacious Homestead | -1 | 0 | 0 | 0 | 0 | 0 |
| Modest Apt - Spacious Residence | 0 | 0 | 0 | 0 | 0 | 0 |
| Elegant Residence | 1 | 1 | 0 | 0 | 0 | 0 |
| Fancy Residence | 2 | 1 | 0 | 0 | 0 | 0 |
| Common/Spacious Manor | 3 | 2 | 1 | 0 | 0 | 0 |
| Elegant/Stately Manor | 4 | 4 | 3 | 3 | 2 | 2 |
| Modest/Palatial Estate | 5 | 5 | 4 | 4 | 3 | 3 |
Maximum desirability reach is 6 tiles for everything on the chart.

**Entertainment point values** (from the page's text): Juggler 10, Musician 20, Dancer 30, Senet House player 40; city-wide "entertainment bonus" up to 20 points. 

**Difficulty notes**: Easy - 3 gods not required until Stately Manor; Very Easy - 3 food types not required.

### 3b. Housing Chart Page 2 - https://pharaoh.heavengames.com/strategy/charts/hous2/
Columns: Evolve / Devolve | Fire Risk Increment | Crime Risk Base/Incr't | Disease Risk Increment | Malaria Risk Increment. Evolve values identical to the Evolve column above. A house DEVOLVES when desirability falls below the (lower) devolve number, giving hysteresis.

**Devolve desirability (VH/H/N/E/VE)**:
Crude -99 all; Sturdy -12 all; Meager -7/-7/-7/-8/-9; Common Shanty -2/-2/-2/-3/-4; Rough 2/2/2/1/0; Ordinary 7/6/6/6/4; Mod Homestead 11/10/10/9/8; Spac Homestead 15/14/14/13/12; Mod Apt 19/18/18/17/16; Spac Apt 23/22/22/20/19; Common Res 30/29/29/27/26; Spac Res 37/36/36/34/33; Elegant Res 45/43/43/41/40; Fancy Res 50/48/48/46/45; Common Manor 52/50/50/48/47; Spac Manor 55/53/53/51/50; Elegant Manor 62/60/60/57/55; Stately 70/68/68/66/64; Mod Estate 72/70/70/67/65; Palatial 87/85/85/82/80. (Gap evolve-devolve is typically 2-3 points at low levels, up to ~8 at manors.)

**Fire risk increment per house (VH/H/N/E/VE)**: Crude/Sturdy 22/18/15/12/3; Meager/Common Shanty 30/24/20/17/4; Rough/Ordinary Cottage 37/30/25/22/5; Homestead through Spacious Residence 30/24/20/17/4; Elegant/Fancy Residence 22/18/15/12/3; all Manors 15/12/10/7/2; Estates 7/6/5/2/1. (Fire risk peaks at cottage level and falls above.)

**Crime risk BASE (VH/H/N/E/VE)**: Crude/Sturdy 35/35/25/22/1; Meager/Shanty 30/30/22/20/1; Rough/Ordinary 30/30/20/17/1; Homestead 25/25/17/15/1; Apartments 20/20/15/12/1; Common/Spacious Residence 20/15/12/8/1; Elegant Res through Spacious Manor 15/10/8/5/1; Elegant/Stately Manor and Estates 10/5/5/1/1.

**Crime risk INCREMENT (per tick; VH/H/N/E/VE=-130 always)**: Crude 70/60/40/30; Sturdy 60/50/30/20; Meager 60/40/20/10; Common Shanty 50/30/10/8; Rough 40/20/5/5; Ordinary 30/10/0/3; Mod Homestead 20/10/0/0; Spac Homestead 10/0/0/-10; Mod Apt 10/0/-10/-20; Spac Apt 0/0/-20/-30; Common Res 0/-10/-30/-40; Spac Res 0/-20/-40/-50; Elegant Res -10/-30/-50/-60; Fancy Res -20/-40/-60/-70; Common Manor -30/-50/-70/-80; Spac Manor -40/-60/-80/-90; Elegant Manor -50/-70/-90/-100; Stately -60/-80/-100/-110; Mod Estate -70/-90/-110/-120; Palatial -80/-100/-120/-130. Interpretation: each tick a house adds its increment to a risk counter (VE column -130 = effectively no crime); rich housing drains the counter, poor housing fills it.

**Disease risk increment** (VH/H/N/E, VE -130): Crude 70/60/50/40; Sturdy 70/50/40/30; Meager 60/50/40/20; Common Shanty 60/50/30/20; Rough 30/20/0/10; Ordinary 30/20/0/5; Mod Homestead 20/20/0/0; Spac Homestead 20/0/0/-10; Mod Apt 10/0/-10/-20; Spac Apt 10/0/-20/-30; Common Res 0/-10/-30/-40; Spac Res 0/-20/-40/-50; then same as crime increments from Elegant Res downward (-10/-30/-50/-60 ... -80/-100/-120/-130).

**Malaria risk increment** (only on maps with reeds; VH/H/N/E/VE=0): Crude 50/40/30/20; Sturdy 45/36/27/19; Meager 40/32/24/18; Common Shanty 35/28/21/17; Rough 32/26/19/16; Ordinary 32/26/19/15; Mod Homestead 29/23/17/14; Spac Homestead 29/23/17/13; Mod Apt 27/21/15/12; Spac Apt 27/21/15/11; Common Res 25/19/13/10; Spac Res 25/19/13/9; Elegant Res 23/17/11/8; Fancy Res 23/17/11/7; Common Manor 21/15/8/6; Spac Manor 21/15/8/5; Elegant Manor 19/13/8/4; Stately 19/13/5/3; Mod Estate 18/12/4/2; Palatial 15/10/3/1.

### 3c. Structures Chart - struct1..struct4
URLs: https://pharaoh.heavengames.com/strategy/charts/struct1/ , struct2/ , struct3/ , struct4/
Employee counts and desirability values are the same on every difficulty; cost and fire/damage risk vary by difficulty. Costs in Db, VH/H/N/E/VE. * = Cleopatra expansion only; ** House cost is the vacant lot.

**Size, employees, cost (struct1 and struct2 combined)**
| Structure | Size | Emp | Cost VH/H/N/E/VE |
|---|---|---|---|
| Academy | 4x4 | 20 | 1500/1200/1000/800/200 |
| Apothecary | 1x1 | 5 | 45/36/30/24/6 |
| Architect's Post | 1x1 | 5 | 45/36/30/24/6 |
| Bandstand | 3x3 | 12 | 225/180/150/130/30 |
| Bazaar | 2x2 | 5 | 60/48/40/32/8 |
| Booth | 2x2 | 8 | 75/60/50/40/10 |
| Brewery | 2x2 | 12 | 112/90/75/60/15 |
| Brickworks | 2x2 | 12 | 90/72/60/48/12 |
| Bridge (per tile) | 1 | 0 | 60/48/40/32/8 |
| Cattle Ranch | 3x3 | 12 | 112/90/75/60/15 |
| Chariot Maker | 4x4 | 30 | 375/300/250/200/50 |
| Clay Pit | 2x2 | 8 | 60/48/40/32/8 |
| Conservatory | 3x3 | 8 | 150/120/100/80/20 |
| Courthouse | 3x3 | 10 | 225/180/150/120/30 |
| Dance School | 4x4 | 10 | 225/180/150/120/30 |
| Dentist | 1x1 | 2 | 75/60/50/40/10 |
| Dock | 3x3 | 12 | 150/120/100/80/20 |
| Farm, Floodplain | 3x3 | 0 | 60/48/40/32/8 |
| Farm, Meadow | 3x3 | 10 | 60/48/40/32/8 |
| Ferry Terminal | 2x2 | 5 | 60/48/40/32/8 |
| Festival Pavilion (plaza) | 5x5 | 0 | 750/600/500/400/100 |
| Firehouse | 1x1 | 6 | 45/36/30/24/6 |
| Fishing Wharf | 2x2 | 6 | 90/72/60/48/12 |
| Fort (Archers/Infantry) | 7x4 | 0 | 1500/1200/1000/800/200 |
| Fort (Charioteers) | 7x4 | 0 | 1500/1200/1000/800/500 |
| Garden | 1x1 | 0 | 18/14/12/10/3 |
| Gatehouse | 5x2 | 0 | 600/480/400/320/80 |
| Granary | 4x4 | 12 | 375/300/250/200/50 |
| Guild, Artisans* | 2x2 | 20 | 225/180/150/120/30 |
| Guild, Bricklayers | 2x2 | 10 | 150/120/100/80/20 |
| Guild, Carpenters | 2x2 | 8 | 75/60/50/40/10 |
| Guild, Stonemasons | 2x2 | 12 | 225/180/150/120/30 |
| House (vacant lot) | 1x1 | 0 | 15/12/10/8/2 |
| Hunting Lodge | 2x2 | 6 | 37/30/25/20/5 |
| Irrigation Ditch (tile) | 1 | 0 | 12/10/8/7/2 |
| Jeweler | 2x2 | 12 | 135/110/90/75/18 |
| Juggler School | 2x2 | 5 | 75/60/50/40/10 |
| Lamp Maker* | 2x2 | 12 | 150/120/100/80/20 |
| Library | 3x3 | 30 | 675/540/450/360/90 |
| Mansion, Personal | 3x3 | 0 | 225/180/150/120/30 |
| Mansion, Family | 4x4 | 0 | 600/480/400/320/80 |
| Mansion, Dynasty | 5x5 | 0 | 1050/840/700/560/140 |
| Mine, Copper | 2x2 | 10 | 225/180/150/120/30 |
| Mine, Gemstone | 2x2 | 8 | 600/480/400/320/80 |
| Mine, Gold | 2x2 | 12 | 375/300/250/200/50 |
| Mortuary | 2x2 | 8 | 150/120/100/80/20 |
| Paint Maker* | 2x2 | 12 | 150/120/100/80/20 |
| Palace, Village | 4x4 | 20 | 1350/1080/900/720/180 |
| Palace, Town | 5x5 | 25 | 1500/1200/1000/800/200 |
| Palace, City | 6x6 | 30 | 1800/1440/1200/950/240 |
| Papyrus Maker | 2x2 | 12 | 150/120/100/80/20 |
| Pavilion | 4x4 | 20 | 750/600/500/400/100 |
| Physician | 2x2 | 8 | 75/60/50/40/10 |
| Plaza (tile) | 1 | 0 | 22/18/15/12/3 |
| Police Station | 1x1 | 6 | 45/36/30/24/6 |
| Potter | 2x2 | 12 | 90/72/60/48/12 |
| Quarry, Granite | 2x2 | 12 | 150/120/100/80/20 |
| Quarry, Limestone / Plain Stone | 2x2 | 12 | 112/90/75/60/15 |
| Quarry, Sandstone | 2x2 | 12 | 75/60/50/40/10 |
| Recruiter | 3x3 | 10 | 225/180/150/120/30 |
| Reed Gatherer | 2x2 | 8 | 75/60/50/40/10 |
| Road (tile) | 1 | 0 | 6/5/4/3/1 |
| Roadblock | 1x1 | 0 | 6/5/4/4/1 |
| Scribe School | 2x2 | 10 | 225/180/150/120/30 |
| Senet House | 4x4 | 25 | 2250/1800/1500/1200/300 |
| Shipwright | 3x3 | 20 | 525/420/350/280/70 |
| Shrine | 1x1 | 0 | 150/120/100/80/20 |
| Statue, Small / Medium / Large | 1x1 / 2x2 / 3x3 | 0 | 18/14/12/10/3 ; 90/72/60/48/12 ; 225/180/150/120/30 |
| Storage Yard | 3x3 | 6 | 105/84/70/56/14 |
| Tax Collector | 2x2 | 6 | 112/90/75/60/15 |
| Temple | 3x3 | 8 | 225/180/150/120/30 |
| Temple Complex | 13x7 | 50 | 3000/2400/2000/1600/400 |
| Temple Complex Altar / Oracle | - | 0 | 1350/1080/900/720/180 |
| Tower | 2x2 | 6 | 525/420/350/270/70 |
| Transport Wharf | 2x2 | 5 | 300/240/200/160/40 |
| Wall (tile) | 1 | 0 | 52/42/35/28/7 |
| Warship Wharf | 3x3 | 15 | 900/720/600/480/120 |
| Water Lift | 2x2 | 5 | 45/36/30/24/6 |
| Water Supply | 2x2 | 5 | 75/60/50/40/10 |
| Weaponsmith | 2x2 | 12 | 180/145/120/100/24 |
| Weaver | 2x2 | 12 | 120/96/80/64/16 |
| Well | 1x1 | 0 | 7/6/5/4/1 |
| Wood Cutter | 2x2 | 8 | 75/60/50/40/10 |
| Work Camp | 2x2 | 20 | 90/72/60/48/12 |
| Zoo* | 6x6 | 30 | 2600/2200/2000/1500/500 |
| Clear / Demolish (tile) | - | - | 3/3/2/2/1 |
Costs scale ~0.8x per step down (H = 0.8 x VH) and E ~0.8 x N, VE ~0.2 x N; N is the base price.

**Desirability effect by distance D1..D6 (struct1/struct2/struct3)**
| Structure | D1 | D2 | D3 | D4 | D5 | D6 |
|---|---|---|---|---|---|---|
| Academy | -3 | -2 | -1 | 0 | 0 | 0 |
| Apothecary | 1 | 0 | 0 | 0 | 0 | 0 |
| Bazaar | -2 | -1 | 0 | 1 | 2 | 3 |
| Brewery | -5 | -4 | -3 | -2 | -1 | 0 |
| Brickworks | -4 | -3 | -2 | -1 | 0 | 0 |
| Cattle Ranch | -4 | -3 | -2 | -1 | 0 | 0 |
| Chariot Maker | -6 | -5 | -4 | -3 | -2 | -1 |
| Clay Pit | -3 | -2 | 0 | 0 | 0 | 0 |
| Conservatory / Dance School | -3 | -2 | -1 | 0 | 0 | 0 |
| Courthouse | 8 | 8 | 6 | 0 | 0 | 0 |
| Dentist | 2 | 1 | 0 | 0 | 0 | 0 |
| Dock | -12 | -12 | -10 | -10 | -8 | -8 |
| Farm (both) / Firehouse | -2 | -1 | 0 | 0 | 0 | 0 |
| Ferry Terminal | -5 | -5 | -3 | -3 | 0 | 0 |
| Festival Pavilion (5x5) | 16 | 16 | 13 | 13 | 10 | 0 |
| Fishing Wharf | -8 | -8 | -6 | -6 | 0 | 0 |
| Forts (all) | -20 | -20 | -18 | -18 | -16 | -16 |
| Garden | 3 | 2 | 1 | 0 | 0 | 0 |
| Gatehouse | -4 | -3 | -2 | -1 | 0 | 0 |
| Granary | -8 | -6 | -4 | -2 | 0 | 0 |
| Guilds (artisan/brick/carpenter/mason) | -6 | -5 | -4 | -3 | 0 | 0 |
| Hunting Lodge | -4 | -2 | 0 | +2 | 0 | 0 |
| Jeweler | -2 | -1 | 0 | 0 | 0 | 0 |
| Juggler School | 2 | 1 | 0 | 0 | 0 | 0 |
| Lamp Maker | -4 | -3 | -2 | -1 | 0 | 0 |
| Library | 8 | 8 | 6 | 6 | 4 | 4 |
| Mansion Personal | 12 | 12 | 10 | 10 | 0 | 0 |
| Mansion Family | 20 | 20 | 17 | 17 | 14 | 0 |
| Mansion Dynasty | 28 | 28 | 24 | 24 | 20 | 20 |
| Mine Copper / Gemstone | -12 | -12 | -10 | -10 | -8 | -8 |
| Mine Gold | -16 | -16 | -13 | -13 | -10 | -10 |
| Mortuary | -3 | -3 | 0 | 0 | 0 | 0 |
| Paint Maker / Papyrus / Potter | -4 | -3 | -2 | -1 | 0 | 0 |
| Palace Village | 20 | 20 | 16 | 16 | 0 | 0 |
| Palace Town | 22 | 22 | 17 | 17 | 12 | 0 |
| Palace City | 24 | 24 | 18 | 18 | 12 | 12 |
| Physician | 2 | 1 | 0 | 0 | 0 | 0 |
| Plaza | 4 | 2 | 0 | 0 | 0 | 0 |
| Police | -2 | -1 | 0 | 0 | 0 | 0 |
| Quarries (all four) | -6 | -5 | -4 | -3 | -2 | -1 |
| Recruiter | -6 | -5 | -4 | 0 | 0 | 0 |
| Reed Gatherer | -2 | -1 | 0 | 0 | 0 | 0 |
| Scribe School | 4 | 3 | 2 | 1 | 0 | 0 |
| Senet House | -6 | -4 | -2 | 0 | 0 | 0 |
| Shipwright | -12 | -12 | -10 | -10 | -8 | -8 |
| Shrine | 4 | 3 | 2 | 1 | 0 | 0 |
| Statue Small / Medium / Large | 3,2,1 / 10,8,6,4 / 14,14,12,12,10 | - | - | - | - | - |
| Tax Collector | 3 | 2 | 1 | 0 | 0 | 0 |
| Temple | 6 | 6 | 4 | 4 | 2 | 2 |
| Tower / Warship Wharf: Tower | -6 | -5 | -4 | -3 | -2 | -1 |
| Transport Wharf | -2 | -1 | 0 | 0 | 0 | 0 |
| Warship Wharf | -4 | -3 | -2 | -1 | 0 | 0 |
| Water Lift | -3 | -2 | -1 | 0 | 0 | 0 |
| Water Supply | 4 | 3 | 2 | 1 | 0 | 0 |
| Weaponsmith / Weaver | -3 | -2 | -1 | 0 | 0 | 0 |
| Well | 1 | 0 | 0 | 0 | 0 | 0 |
| Wood Cutter | -4 | -3 | -2 | 0 | 0 | 0 |
| Work Camp | -3 | -2 | -1 | 0 | 0 | 0 |
| Zoo | -6 | -4 | -2 | 0 | 0 | 0 |
| Burning structure / Rubble | -3 | -2 | -1 | 0 | 0 | 0 |
| Roads, Walls, Bridges, Ditches, Architect, House | 0 | 0 | 0 | 0 | 0 | 0 |
(Statues: Small 3/2/1; Medium 10/8/6/4; Large 14/14/12/12/10.)

**Fire risk and damage (collapse) risk per building, VH/H/N/E/VE** (a per-tick counter increment; "none" = building cannot burn/collapse):
- Fire: Academy 30/24/20/15/4; Apothecary/Bandstand/Booth/Conservatory/Dance School/Mortuary/Pavilion/Juggler School 30/24/20/17/4; Bazaar/Brewery/Chariot Maker/Dentist/Dock/Fishing Wharf/Granary/Jeweler/Lamp Maker/Carpenters/Mansions/Palaces/Papyrus/Potter/Recruiter/Shipwright/Tax Collector/Weaponsmith/Weaver/Wood Cutter/Work Camp 30/24/20/15/4; Brickworks/Bricklayers/Artisans/Police/Reed Gatherer 15/12/10/8/2; Cattle Ranch 7/6/5/4/1; Firehouse 3/2/2/1/0; Hunting Lodge 37/30/25/20/5; Library and Scribe School 45/36/30/25/6; Physician 22/18/15/10/3; Paint Maker 20/18/15/10/3; Senet House 7/6/5/3/1; Transport/Warship wharf 7/6/5/4/1; Zoo 7/5/5/5/5. Houses: see hous2.
- Fire none: Architect, Clay Pit, Courthouse, farms, ferry, pavilion plaza, forts, garden, gatehouse, stonemasons, mines, quarries, plazas, roads, statues, temples, shrines, tower, wall, water lift/supply, well.
- Damage: Architect's Post 3/2/2/1/0; most heavy buildings (Academy, Clay Pit, Courthouse, Dock, Fishing Wharf, Granary, Stonemasons, Library, Mansions, Palaces, Recruiter, Shipwright, Shrine, Storage Yard, Transport/Warship wharf, Quarries) 7/6/5/4/1 (Academy 7/6/5/4/1; Library 7/6/5/3/1); Bricklayers/Artisans/Mines/Temple/Temple Complex 15/12/10/8/2 (Bricklayers/Artisans/mines 15/12/10/8/2; Temple 15/12/10/8/2); Paint Maker 10/6/5/5/1; Zoo 7/5/5/5/5; Senet House 7/6/5/3/1.

**struct3 - special shaped desirability (diagram data)**
- Temple Complex: no single D1-D6; Brugle's finding: adjacent to one end +36, other end +12, along the sides peak +48; the Pharaoh_Model files state +20,+20,+16,+16,+12,+12 (Brugle disputes). Grid shows 12/24/36/48 steps as you approach the 13x7 footprint; sides peak 48, near the entrance 44/36/32/28/16.
- Storage Yard (3x3): -5/-5/-3 around the worker-corner side, -3 elsewhere (varies by which side the working corner faces; "N" marks the north corner where the worker stands).

**struct4 - entertainment venues' desirability (credit: Brugle; Jimhotep's "Puzzling Pavilions" thread)**
- Venue desirability comes from the PERFORMANCE STAGES, not the footprint: Pavilion 2x2 Dance Stage +6,+5,+4,+3,+2,+1; each tile of 1x2 Music Stage +4,+3,+2,+1; Juggler's Stage (1x1) +2,+1; Garden tile +3,+2,+1; roads 0. The Booth only emits from its single Juggler tile. Stacking creates a peaked field: e.g. the Pavilion's centre values reach 12-15 next to the dance/music stages and tail off 10,7,4,2,1 outward; Bandstand peak ~11 next to stage tiles (5,8,10,11,10,8,6,4,2,1 along a row).
- Pavilion layout key: D dance, M music, J juggler, G garden, R road. Bandstand key: M, J, G, R.

---

## 4. Commodity Data Sheets
URL: https://pharaoh.heavengames.com/strategy/sheets/ (compiled by Cherub Gustavia and Angel Jayhawk)
- The index contains no numbers; it lists 33 per-city sheets (Archaic: Timna, Behdet, Abedju (Men-nefer has no sheet); Old Kingdom: Selima Oasis, Abu, Saqqara, Serabit Khadim, Meidum, Buhen, South Dahshur, North Dahshur, Iunet, On, Rostja, Bahariya Oasis, Djedu, Dunqul Oasis, Dakhla Oasis; Middle Kingdom: Thinis, Waset, Kebet, Menat Khufu, Itjtawy, Iken, Sawu, Heh, Bubastis; New Kingdom: Khmun, Sauty, Byblos, Baki, Rowarty, Hetepsenusret). URL pattern https://pharaoh.heavengames.com/strategy/sheets/<city>/.
- Each sheet shows every commodity available locally or via trade so players need not hop between trade screen, navigation panel and world map; export/import columns by partner city, greyed text = not needed or not locally made, coloured dot = land or river route.
- Only Waset was read (sample): https://pharaoh.heavengames.com/strategy/sheets/waset/
  Commodities (type): Wheat, Figs, Lettuce, Fish, Meat (food); Straw, Clay, Barley, Flax, Gems, Reeds, Wood, Copper, Gold, Plainstone, Limestone, Granite, Sandstone (raw); Brick, Pottery, Beer, Linen, Luxury goods (jeweler), Papyrus, Weapons, Chariots (finished). Local makers there: Farm (wheat/figs), Wharf (fish), Claypit, Mine (gems/copper/gold), Quarry (plain/lime/granite), Brickmaker, Potter, Jeweler, Weaponsmith.
  Import quota per partner deal, e.g. 2500 of lettuce/barley/linen/papyrus/pottery/beer from Men-nefer (water), 2500 meat/bricks/papyrus/luxury goods/wood from Dakhla Oasis (land), 2500 clay/flax/gems/wood/beer/linen from Dunqul Oasis (land), 1500 gold/pottery from Thinis (land), 2500 copper/beer/luxury from Khmun (water), 25 plainstone Khmun, 40 granite/sandstone Dunqul. [import column mapping best-effort]
  PRICES (Db per unit - "full price" when sold as made vs "import raw price" when made from imported inputs): Weapons 325 / 85; Chariot 315 / 90; Papyrus 165 / 134; Luxury goods 160 / 40; Linen 150 / 96; Beer 140 / 92; Brick 120 / (112.5 if straw bought, 82 if clay bought, 74.5 both) - brick needs 100 clay + 25 straw; Pottery 105 / 68. Best raw exports: Copper 185, Wood 170, Granite 65.
  Image URLs: icons at https://pharaoh.heavengames.com/wp-content/uploads/sites/2/2021/02/c-<good>.gif (wheat, figs, lettuce, fish, meat, straw, clay, barley, flax, gems, reeds, wood, copper, gold, plainstone, limestone, granite, sandstone, brick, pottery, beer, linen, jewelry, papyrus, chariot, weapons), dot-water.gif, dot-land.gif.
- NOTE: The other 32 city sheets were not read.

---

## 5. Production/time engine ("Days, weeks, ticks, and production values")
URL: https://pharaoh.heavengames.com/strategy/numbers/ (Nerdicus)
| Item | Value |
|---|---|
| Days per game month | 16 (so a year = 12 x 16 = 192 days) |
| Raw material rate, per worker-complement per day | 0.5% of a unit |
| Manufactured product rate | 0.25% per day |
| Shipwright rate | 0.3125% per day |
| Animation steps per day | 51; 12 per walker-type cycle |
| Walker speed | 3.4 squares per day = 54.4 squares per month (4 x 51 / (5 x 12)); cart pusher also 3.4 sq/day, 17 squares in 5 days |
Productivity: output progress per day at FULL employment = rate x (some multiplier); building completes a unit when 100% reached:
| Building | Daily gain | Days per unit | Output per month |
|---|---|---|---|
| Carpenter's Guild | 2% | 50 | 32% |
| Brewery, Brickworks, Cattle Ranch, Jeweler, Papyrus Maker, Potter, Weaponsmith, Weaver | 3% | 34 | 47.06% (about 47 beers/month) |
| Clay Pit, Gemstone Mine | 4% | 25 | 64% |
| Copper Mine | 5% | 20 | 80% |
| Gold Mine, Granite/Limestone/Plainstone quarries | 6% | 17 | 94.12% |
| Shipwright | 6.25% | 16 | 100% |
| Recruiter (with Academy) | 12% | 9 | 177.8% |
With Ptah's Temple Complex (PTC) / Amon altar (PTC-A): Jeweler, Weaver (PTC) and Brickworks (PTC-A) 4.5% / 23 d / 69.57%; Clay Pit, Gem Mine (PTC) 6% / 17 d; Copper (PTC) 7.5% / 14 d / 114.3%; Gold (PTC), quarries (PTC-A) 9% / 12 d / 133.3%.
- Progress is stepped (granite example at 6%: 06,12,18...96, then 100% = cart pusher spawns, resets).
- Max cart-pusher delivery distance at full employment = days x 0.5? Listed: 2% 85 squares (wood to carpenter), 3% 57.8, 4% 42.5, 5% 34, 6% 28.9, 6.25% 27.2, 12% 15.3; with PTC: 39.1 / 28.9 / 23.8 / 20.4. (Production partial employment scales proportionally; "~12 steps before cart pusher spawns", "4-8 steps wait at destination".)
- Reading: production is a progress bar that grows daily by (rate x employment fraction). That is the "per month" yield for balancing.

---

## 6. Entertainment ("more than you may wish to know")
URL: https://pharaoh.heavengames.com/strategy/nerowouldentertainment/ (Nerdicus, "Nero Would")
**Performers**
| Item | Value |
|---|---|
| Juggler school / Conservatory output | 1 performer per 4/16 of a month => keeps 8 venues continuously supplied |
| Dance school output | 1 performer per 6/16 of a month => keeps 5.333 venues supplied |
| Max performer walk | 213 squares (~4 months) |
| Performance duration | 2 months (32 sixteenths of a month; shown as 64 "entertainment days"); counter drops 2 per sixteenth; resets to 64 when a new performer arrives |
| Random walkers | walk 10-14 sixteenths; recycle 8 (senet players) / 1 or 4 (performers), range 0-8; every 4th trip shorter pattern |
| Points granted to houses passed | Juggler 10, Musician 20, Dancer 30, Senet player 40; last 6 months; reset when a performer of same type passes |
**Senet House beer use per trip / avg monthly**: VH 60/42, H 40/28, N 20/14, E 10/7, VE 5/3.5 (return-trip length +/-17%).
**City-wide coverage**
- People served per stage: Juggler (booth, bandstand, pavilion) 400; Music (bandstand, pavilion) 700; Dance 1,200; Senet house 5,000.
- Coverage Index (per venue type) = 5 x (number of stages) x (stage coverage) / population, capped at 5.
- Overseer text bands: >=5 Perfect; 4.5-5 Excellent; 4-4.5 Very Good; 3.5-4 Good; 3-3.5 Above Average; 2-3 Average; 1.5-2 Below Average; 1-1.5 Poor; <1 Very Poor; 0 None.
- Max population per stage for each band (Juggler/Music/Dance/Senet): Perfect 400/700/1200/5000; Excellent 444/778/1333/5556; Very Good 500/875/1500/6250; Good 571/1000/1714/7143; Above Avg 667/1167/2000/8333; Average 800/1400/2400/10000; Below Avg 1000/1750/3000/12500; Poor 1333/2333/4000/16667; Very Poor 2000/3500/6000/25000.
- City-wide bonus points: each type's index rounded down to 2 decimals, summed, floored to whole number; bonus ~= sum of indices (max 20). This bonus is added to a house's entertainment total on top of the performer points it received; houses compare the total to the level requirement above.

---

## 7. Work Camps
URL: https://pharaoh.heavengames.com/strategy/workcamps/
- Only buildings that supply hard labour to farms (floodplain) and monuments; 2x2; each supplies jobs for 20 people (Structures chart: 20 employees, 90 Db Normal 60).
- Rule of thumb: ~1 work camp per 5 floodplain farms; too few = a 10-15 farm group takes 1-2 months to staff.
- Monuments: needs scale with number of storage yards filled and brick/stone supply; imported stockpile needs fewer camps; bigger pyramids need more camps (more workers per layer).
- Cheap unemployment valve: deleting one camp reduces worker shortage by 20.

---

## 8. Monuments
URL: https://pharaoh.heavengames.com/strategy/monuments/
| Monument | Variant | Footprint |
|---|---|---|
| Mastaba | small / medium / large | 4x10 / 6x14 / 8x18 |
| Mausoleum | - | 8x22 |
| Obelisk | small / large | 3x3 / 5x5 |
| Pyramid (stepped/brick core) | small / medium / large / complex / large complex | 8x8 / 12x12 / 16x16 / 20x20 / 24x24 |
| Bent pyramid | small / large | 8x8 / 12x12 |
| Sphinx | - | 6x18 |
| Sun Temple | main / path / entrance hall | 10x10 / 8x2 / 3x3 |
Materials: Mausoleum 240 sandstone to place + 220 to finish; Obelisk small 100 granite, large 300 granite. Brick/stone quantities and labour counts for the rest are NOT given on this page.

---

## 9. Gods
URLs: https://pharaoh.heavengames.com/strategy/gods/ and /gods2/ 
| God | Domain | Blessing | Wrath | Temple-complex bonus (sub-gods) |
|---|---|---|---|---|
| Osiris | Nile | better/more regular floods; floodplain farms yield 2x | destroys floodplain farms, worse floods | better flood odds; Sobek: residents eat less; Min: faster raw regrowth, better fishing/hunting |
| Ra | Kingdom | kingdom rating up; exports bought more for 1 year; exports sell +150% | rating -4 to -5 (and -10 to -20); traders buy less | rating up; less interest when in debt; Ma'at: lower crime; Horus: calmer city, lower wages/higher taxes |
| Ptah | Craftsmen | fills spare storage yard with clay/pottery/flax/linen/gems/jewelry; fully stocks shipwrights/weavers/jewelers | sets 1 storage yard on fire; destroys mines/manufacturers/quarries | faster mines/shipwrights/jewelers/weavers; Amon: faster quarries/woodcutters/brickworks; Thoth: better education |
| Seth | Destruction | protects troops at distant battles; kills some of next attackers | destroys fort of best company and navy | troop experience/protection; Anubis: mortuaries use less linen; Sekhmet: priests reduce crime/arrest criminals |
| Bast | Home | throws festival to all gods; stocks houses and bazaars with food | plague + fire in best housing district | slows consumer-goods consumption; entertainers/teachers/health last longer; Isis: priests cleanse plague, health; Hathor: city sentiment, immigrants |
No numeric mood thresholds are given on these pages.

---

## 10. Trade Maps
URL: https://pharaoh.heavengames.com/strategy/trade/ (by Angel Jayhawk). Four period pages; each has a trade-map image.
**What the numbers mean**: Each route lists a distance/cost in "Db", land or water, and what each city BUYS and SELLS in quota units: **15 / 25 / 40** (small stone/weapon quotas: e.g. granite, limestone, sandstone, weapons), **1,500 / 2,500 / 4,000** (bulk goods). A route's capacity is probably yearly quotas; Pharaoh has Ra-linked trade-bonus. Caravan/ship capacity and frequency are NOT stated on these pages.
Image URLs:
- https://pharaoh.heavengames.com/wp-content/uploads/sites/2/2021/02/TradeMapArchaic.jpg
- .../TradeMapOldKingdom.jpg
- .../TradeMapMiddleKingdom.jpg
- .../TradeMapNewKingdom.jpg
(each with -766x1024 thumbnail.)

### 10a. Archaic - https://pharaoh.heavengames.com/strategy/trade/archaic/
| From | To | Route | Buys | Sells |
|---|---|---|---|---|
| Behdet | Abedju | 400Db water | 4,000 linen; 2,500 bricks, gems, wood, luxury | 4,000 clay; 2,500 fish, pottery, beer, reeds, papyrus, granite |
| Byblos | Abedju | 1,000 water | 2,500 gems, luxury | 2,500 luxury, wood, copper |
| Byblos | Behdet | 1,800 water | same | same |
| Men-nefer | Abedju | 400 water | 2,500 bricks/gems/wood/luxury; 4,000 linen | 25 granite; 2,500 fish/pottery/beer/reeds/papyrus; 4,000 clay |
| Men-nefer | Behdet | 750 water | 2,500 lettuce/bricks/barley/beer/luxury | 2,500 chickpeas/pottery/papyrus |
| Men-nefer | Timna | land | 15 weapons; 1,500 lettuce/bricks/beer/luxury/barley | 1,500 papyrus/pottery; 2,500 chickpeas |
| Nekhen | Men-nefer | - | 2,500 papyrus | 1,500 pottery; 2,500 clay, beer |
| Nekhen | Timna | 1,020 land | 1,500 papyrus | 1,500 clay/beer/flax/linen; 2,500 pottery |
| Nubt | Abedju | 250 water | - | 2,500 game meat; 4,000 straw/clay/bricks |
| Nubt | Timna | 800 land | - | 4,000 game meat |
| Perwadjyt | Abedju | 900 water | - | 2,500 figs/pottery/reeds; 4,000 straw/bricks/clay |
| Perwadjyt | Behdet | 1,000 land | - | 2,500 figs/clay/pottery/reeds; 4,000 bricks |
| Perwadjyt | Men-nefer | - | - | 2,500 clay; 4,000 figs/bricks/reeds/pottery |
| Perwadjyt | Timna | 800 land | - | 4,000 game meat |
| Thinis | Timna | 800 land | 4,000 copper | 1,500 chickpeas/pottery/beer |
| Timna | Abedju | 400 water | 2,500 fish/beer/linen/papyrus | 25 weapons; 2,500 clay/pottery/copper; 4,000 clay |
| Timna | Behdet | 750 land | 2,500 fish/beer/linen/papyrus | 2,500 weapons/clay/pottery/copper |

### 10b. Old Kingdom - https://pharaoh.heavengames.com/strategy/trade/oldkingdom/ 
Per city partner (distance, route): buys / sells (key rows; page has many).
- Abedju: Abu 600 land - buys 2,500 game meat/clay/brick/wood/papyrus/granite/sandstone, sells 2,500 fish/barley/beer/linen/plain stone. Saqqara 350 water - buys 15 limestone/sandstone, 25 granite, 1,500 meat/clay/brick/wood, 2,500 papyrus; sells 25 plain stone, 1,500 beer, 2,500 fish/barley, 4,000 linen. Selima Oasis 500 land - similar to Abu.
- Abu: Bahariya 800 land; Buhen 600 land; Dashur North 900 water; Dashur South 650 water; Meidum 1,050 water; Saqqara 500 land; Serabit Khadim 540 land - sells 15-40 granite/limestone/sandstone, 1,500-2,500 flax/grain/straw/linen/gems; buys pottery/papyrus/clay/reeds.
- Behdet: Abu 250 water; Meidum 700 water; Saqqara 400 water; Selima 400 land; Serabit Khadim 500 land - buys 2,500 bricks/gems/wood/luxury/linen; sells 2,500 fish/pottery/beer/reeds/papyrus/clay/granite (4,000 fish to Serabit).
- Buhen: Dunqul - buys 25 granite, 2,500 wood/copper; sells 2,500 barley/beer.
- Byblos: Dashur North 1,200 water; Dunqul 1,500 land; Rostja 1,250 water - buys 1,500 gems/luxury; sells 1,500 luxury/copper (2,500 copper Rostja), 4,000 wood.
- Dahshur: On 200 water - buys 25 limestone, 2,500 bricks; sells 25 limestone, 2,500 barley/beer, 4,000 straw.
- Dunqul: Djedu 1,300 land - sells 15 sandstone, 25 granite, 1,500 game/gems, 2,500 wood.
- Enkomi: Behun 1,450 water - sells 1,500 pomegranates/fish/copper.
- Iunet: On 1,500 water; Bahariya 600 land - sells 25 granite/limestone (40 to Bahariya), meat, clay, pottery, copper (4,000 copper Bahariya).
- Kerma: Dunqul 375; Saqqara 780 water; Selima 450 - buys linen/luxury, sells luxury (2,500/4,000).
- Meidum: Behun 900; Dashur N 300; Dashur S 300; On 500 (all water) - buys barley/beer/linen/limestone; sells grain/clay/reeds/wood/pottery/papyrus/plain stone.
- Men-nefer: Abu 1,100 water; Behun 800 land; Dunqul 870; Saqqara 150 land; Selima 1,100; Serabit 350 - buys lettuce/bricks/barley/beer/luxury; sells chickpeas/pottery/papyrus (4,000 pottery Saqqara).
- Nekhen: Dakhla 600 land; Meidum 650 water; Serabit 400 land - buys papyrus; sells pottery/beer/flax/linen.
- Nubt: Abedju 450 water; Timna 800 land - sells game meat/straw/clay/bricks.
- On: Bahariya 400; Dakhla 1,070; Djedu 300 water; Dunqul 960 water; Rostja 500 water - buys granite/beer/linen/gems/luxury/wood; sells limestone/meat/clay/reeds.
- Perwadjyt; Thinis (Timna 800 land: buys 4,000 copper, sells chickpeas/pottery/beer); Timna (Abu 1,450 land, Selima 1,650 land: buys fish/beer/linen/papyrus, sells weapons/clay/pottery/copper); Saqqara (Dakhla 1,250 land; Meidum 200 land; On 400 water: buys limestone/clay/pottery/wood/reeds/papyrus, sells plain stone/luxury 2,500-4,000); Selima Oasis (Buhen 300; Dashur N 1,500; Dashur S 900; Dunqul 375; Saqqara 645; Serabit 1,100 - sells luxury/wood, buys pottery/beer/linen/papyrus/copper); Serabit Khadim (Bahariya 950; Behun 1,250; Dashur N 600; Dashur S 800; Meidum 350 - buys grain/clay, sells luxury/gems/copper).
- Quota structure repeats: 25/40/15 (stone), 1,500 / 2,500 / 4,000 (bulk). Longest route listed: Timna-Selima 1,650 land; Byblos-Dunqul 1,500 land; Iunet-On 1,500 water.

### 10c. Middle Kingdom - https://pharaoh.heavengames.com/strategy/trade/middlekingdom/ 
Selected routes: Buhen-Iken 100 water / -Heh 150 / -Kebet 520 / -Itjtawy 850 (buys 25 granite, 2,500 wood/copper; sells barley/beer 2,500-4,000); Byblos-Itjtawy 900 land (buys 4,000 gems/luxury; sells 1,500 copper, 4,000 luxury/wood); Dakhla-Iken 685 / Itjtawy 1,250 / Heh 500 / Menat Khufu 400 / Waset 800 land (buys 15-25 granite, 1,500-4,000 meat/linen/luxury/papyrus; sells 1,500-2,500 bricks/wood); Dunqul-Sawu 500 / Thinis 475 / Waset 400; Iken-Bubastis 1,750 water (buys 25 weapons, 4,000 wood; sells 4,000 beer); Heh-Bubastis 1,750 water (buys 40 weapons...; sells 1,500 gems/luxury); Kebet-Iken 675 water; Khmun-Thinis 180 / Waset 375 land (buys wood/papyrus/pottery; sells 25 plain stone, 2,500 linen); Men-nefer to Iken 1,335 / Itjtawy 300 / Menat Khufu 400 / Sawu 700 / Thinis 840 / Waset 400 (buys lettuce/bricks/barley/beer/luxury, sells chickpeas/pottery/papyrus); Waset-Bubastis 800 land (sells 15 granite, 1,500 copper), Waset-Sawu 300, Waset-Thinis 240, Waset-Menat Khufu 600 water; Pwenet-Bubastis 1,500 / Sawu 660 water; Sawu-Bubastis 500 land; Sauty-Thinis 140 land (buys chickpeas, sells pomegranates); Henen-nesw-Thinis 580 water; Nekhen-Thinis 280 land.

### 10d. New Kingdom - https://pharaoh.heavengames.com/strategy/trade/newkingdom/
Abu-Baki 200 land; Abu-Hetepsenusret 1,000 water; Abu-Rowarty 1,100 water; Baki-Hetepsenusret 1,000 water (sells 25 sandstone, 1,500 gems/copper); Bubastis-Sauty 450 water; Byblos-Rowarty 550 water (buys 1,500 gems/luxury; sells luxury/wood/copper 4,000); Itjtawy-Baki 1,015 water / Rowarty 175 land / Sauty 425 water (buys beer, sells meat/pottery/linen/papyrus/straw/brick/limestone 40); Khmun-Thinis 180 / Waset 375; Knossos-Hetepsenusret 2,000; Mycenae-Hetepsenusret 2,000 (sells 2,500 weapons/luxury, 1,500 pottery/copper); Menat Khufu-Sauty 150 land; Men-nefer-Baki 1,085 water / Sauty 350 water; Pwenet-Baki 300 land (2,500 luxury); Qadesh-Baki 1,845 water / Hetepsenusret 950 land (sells luxury/wood/copper); Rowarty-Baki 1,230 water / Hetepsenusret 275 land (sells beer/bricks/pottery/linen/papyrus 2,500, barley 4,000, straw/bricks 4,000); Sauty-Thinis 140 land; Sharuhen-Khmun 500 land; Tyre-Khmun 1,250 water (2,500 luxury/wood/copper); Waset-Baki 325 water / Hetepsenusret 750 water (15-40 stone, 1,500-2,500 clay/pottery/copper).
Note: page contains inconsistent spelling and some one-sided entries.

---

## 11. Cheats (hidden-mechanics extract)
URL: https://pharaoh.heavengames.com/strategy/cheats/
- Cheat box via Ctrl+Alt+C. Treasure Chest: +1,000 Db only if treasury < 15,000.
- Many cheats require the matching god to be worshipped: Osiris (floods/farms), Ra (exports, trade partners, kingdom rating), Ptah (storage yards, industry, craftsmen's raw materials), Seth (military), Bast (housing, bazaars, plague, festivals). These double as a map of what each god governs.
- Flood: Bounty / Mummy's Curse improve/worsen next flood; Life from Death doubles floodplain farm harvest after next flood; Underworld destroys floodplain farms.
- Trade: Birds of Prey reduces partners' trade for a year; Pharaoh's Glory raises export amounts by 50%.
- Stocking: Noble Djed fully stocks shipwrights/weavers/jewelers; Supreme Craftsman fills a storage yard with goods.
- Hippo-based "Side Show" needs hippos on map. Impressions said "Living Large" and "Help Homeless" are not real cheats.

---

## 12. Enemy numbers (bonus) - https://pharaoh.heavengames.com/strategy/milnumbers/
Unit: HP / melee atk / melee armour / missile armour / missile atk / rate of fire (higher RoF value = slower reload).
Egyptian: Archers 80/4/3/4/5/100; Chariots 200/15/8/6/10/120; Infantry 150/12/5/6/0/0; Transports 75; Warships 300 HP, melee 100. Canaanite: Archers 80/5/0/10/5/130; Infantry 80/6/4/6; Warship 80. Hittite: Archers 90, Chariots 220, Infantry 140, Warships 250. Hyksos: Archers 100, Chariots 250 (atk 17), Infantry 150 (atk 15), Warships 300. Kushite: Axemen 80/8/12, Javelins 60, Warships 200. Libyan: Archers 60, Swordsmen 80/4/10/10, Warships 150. Mitani: Archers 75 (missile armour 13), Swordsmen 100 (armour 15), Warships 250. Nubian: Archers 80, Spearmen 120, Warships 100. Sea People: Archers 100, Infantry 120, Warships 400 (atk 120).

---

## Images seen / referenced
- Navigation icons: https://pharaoh.heavengames.com/wp-content/themes/pharaoh/images/navigation/{court,forum,strategy,downloads,faqs,buildings,links,misc,sitemap}.png
- Housing block diagrams (wp-content/uploads/sites/2/2021/02/): mred-common.png (viewed), mred-palace.png, estatelayout.gif, citylayout.gif, massivelayout.gif, massiveestate.gif, industrylayout.gif, khufuh-block.png, simon-block.png, octavian-tri-road.png
- Trade maps: TradeMapArchaic.jpg, TradeMapOldKingdom.jpg, TradeMapMiddleKingdom.jpg, TradeMapNewKingdom.jpg (same folder) and -766x1024 thumbnails
- Commodity icons: c-*.gif and dot-water.gif / dot-land.gif (same folder)
- Block-generator tile GIFs: https://pharaoh.heavengames.com/strategy/tiles/*.gif (house1-4, roadblock, well, etc.)
- Charts pages have no images; the Pavilion/Bandstand/Booth/Temple Complex/Storage Yard desirability "diagrams" are text grids on struct3/struct4.

## Pages not reachable / not read
All requested pages were reachable. Not read: Walkthroughs, individual commodity sheets other than Waset, Housing forum threads beyond ~100k characters, Hotkeys/Rostja/Mission-creation/Six-monuments/Military articles.
