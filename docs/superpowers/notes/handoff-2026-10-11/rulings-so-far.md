# Rulings made on Josh's behalf, 11-12 Oct 2026 (parts 1-9)

Josh asked for no questions; every call is listed here with what it costs if wrong. The final session report presents this list (plus any Stage 2 execution rulings added later).

## Process
1. Brainstorming answered from the spec and research, not asked. — Cost if wrong: later edits; nothing was pushed.
2. The screenshot tool gained `-Eval` (page JavaScript before capture) and `-Dpr`; `tools/shots.ps1` and `tools/contact.py` make before/after sheets. — Dev-only.
3. Raw before/after shots stay out of git (`docs/superpowers/notes/screenshots/raw/` is ignored); the repo keeps one contact sheet per size. — Re-add the raw files if wanted.
4. Notes dated 11 Oct to match the earlier notes. — None.
5. The pass ran on a branch in place (no worktree), merged locally to main as 9803214; nothing pushed. — None.

## Part 1: research
6. Keep the parchment chrome (the research suggested New Era's dark glass). — If the city's whitewash and the chrome merge, a stronger rim or dark top bar is a CSS change.
7. Fertile land as river loam, then one step lighter than first specified (#A8885C) after it read as mud. — Palette constants.

## Part 2: the visual, UX and early-game pass
8. The ten changes: calm land; granary/bazaar stock; growing fields; a work-gang "rise" on placing; cards with pictures (empty categories hidden); ghost on the nearest free tile plus "Gives water to N homes"; a goals strip with progress and a filled Show me; problem markers; labelled corner/speed buttons; a house sheet that names cause and fix. Left out: dark chrome, chimney smoke, boats, serif headings. — Each left-out item is a small later pass.
9. "Work gangs on monuments later" built now as the placement rise with two haulers, reused by Stage 4 crews. — One effect; can be switched off.
10. Farm growth is cosmetic (a 60-day cycle per farm, fallow when not working); production stays daily. — A field can look ripe while the granary is not filling.
11. The granary's stock drawn stronger than planned (gold heaps and caps) so it reads at phone zoom. — Art only.
12. Help setting with three values (Guide and tips / Tips only / Off) rather than four. — "Warnings only" players use Tips only.
13. Goals, firsts and achievements settle after every command, so guided steps finish while paused. — Rewards land a few days earlier.
14. Small gold rewards kept (firsts 10, goals 25, daily 25, guide 50) although the research preferred cosmetic rewards; achievements pay nothing. — A slightly richer early game.
15. Tips once per device, at most one per 3 minutes of play and five an hour; on phones at large text they are smaller and close themselves after 15 s. — A slow reader may miss one (all are listed in How to play).
16. Idle nudge: 45 s of running play without progress → Show me glows; 60 s more → one "Next:" line; then silence; silent once no goal is open. — One number each.
17. Daily goals start after the temple goal, three per local day, one free swap, no streaks, per city; the date is read once per session so nothing expires mid-session. — A session across midnight keeps yesterday's goals.
18. Achievements per city (saved and exported with it), 24 now, hidden while the guide runs. — A new city starts the list again.
19. Celebrations in a caption row below the goals strip (so Show me never jumps), one at a time; achievement captions quiet during the guide; a milestone's batch drops its achievement captions; Town replaces the old toast; on phones at large text only the caption's headline shows. — Captions sit slightly lower.
20. First-time events become goals for an empty bazaar, a labour shortage, unemployment and debt; no downgrade goal (the amber marker and a tip cover it). — None.
21. Bridging goals "Grow 8 homes to Cottage / House or better" and chapters; a met goal never waits behind event goals; "N of 9 done" counts the chain only. — Numbers in data.
22. World version 2 migration turns the guide off and marks existing firsts and achievements silently; an older city still sees "First harvest" and "First month in profit" once. — Two harmless extra captions.
23. Keys 1-7 keep their categories (Industry stays 4) as the spec says, rather than renumbering to visible ones. — In Stage 1, key 4 does nothing.
24. Card pictures fit their drawn pixels in a 104×52 box; housing plots show a hut. — A slightly taller tray.
25. The house sheet's causes include idle providers (paused / short of workers, with View), an idle or empty granary, and a provider with no road ("Lay a road beside it"), so it never advises building a second one. — More cause codes to maintain.
26. Show me and View always keep the ghost or building in view above the sheet; every Show me/View has a distinct accessible name. — None.
27. On the smallest phones at the largest text, the goals strip, a tip and a caption can briefly reach below the middle together (pinned in a test); captions wait while a tip shows in sideways and large-text phone layouts. — A brief overlap; a caption can wait for Got it.
28. The confirm bar keeps its tallest height while a tool is active; the speed button keeps one width; the top bar stays one row at normal text (short date under 1000 px on wide screens) and wraps only at large text. — None.
29. Resume guide is offered only under "Guide and tips"; a loaded city's guide follows the Help setting. — None.
30. Tasks 8-10 ran before 5-7 while the art tasks were still being written; one extra small follow-up round beyond the single fix wave fixed a top-bar regression found in the after screenshots. — None (all re-reviewed).

## Part 3: Stage 2 (spec revised on main, 733cecb)
31. Difficulty: yes — Relaxed / Normal / Hard chosen at New city, fixed for the city; costs ×0.8/1/1.25, risks ×0.5/1/1.5 (from Stage 3). — A small extra choice on the title card.
32. Entertainment gates tier 6 (with desirability), keeping tier 5 to one new need. — Tier 6 asks for two new things at once.
33. Scribes: not in Stage 2 (every tier works); a Stage 4 candidate. — The late game has one lever fewer.
34. Festivals: a Stage 3 candidate. — None now.
35. Desirability rise/keep values 20/15, 35/29, 50/43, 65/57 (hysteresis 5-8 points), the Pharaoh-calibrated table with houses contributing by tier, a house uses its best tile. — Tuning numbers in data.
36. Yields per month: grain 30, figs 24, clay 40, pottery 30, barley 30, beer 25, flax 24, linen 20, gems 15, jewellery 15; use per resident per month: food 0.25, pottery 0.05, beer 0.05, linen 0.04, jewellery 0.03. — Tuned by the Stage 2 long-run test.
37. Storehouse 2×2 with accept/refuse per good and no "get" orders; the granary holds grain and figs only. — Less control for experts.
38. Trade: Memphis (Market town, 300 gold) and Byblos (Great city, 600), yearly quotas, buy/sell/ignore with a level to keep, ±10% yearly drift, a 25% no-arbitrage margin, a 40-unit gift on the first caravan. — Prices and quotas in data.
39. Barley and flax farms sit in Industry next to their workshops; gardens and statues in Homes. — Category placement only.
40. Locked cards show only for the next milestone; later-stage buildings stay hidden. — Less "what's coming" for curious players.

## Part 4: Stage 2 built (plan, execution, final review)

### Process
41. All six plan writers were re-run in parallel (none of the first session's outputs existed), then resumed with their work intact after a usage-limit stop. — Cost if wrong: two writers could disagree at a seam; the controller ruled each one at assembly.
42. The previous session had kept running after its handoff and added two notes-only commits (3ffc09c, f4d30a0). They were kept, and that idle session was not messaged. — Cost if wrong: if that session is resumed, it must be told Stage 2 continues elsewhere.
43. Fable did the final whole-branch review and Opus the fix wave and the art tasks. Sonnet did the other tasks and reviews, and Opus also did the balance task. Every commit carries the Opus 5.5 trailer, as your rule says. — Cost if wrong: none.
44. The screenshot tool gained a `-Stage2` set of six scenes, and `-Only` lists now work. The Stage 2 contact sheets compare main's old six scenes with the new six. — Cost if wrong: none; dev only.

### Spec amendments
45. Bazaar stock per good is grain 300, figs 200, and 100 of each household good, not "up to 200 of each". Spec 4.10 was amended. — Cost if wrong: a big district's bazaar runs out of a household good sooner (one number per good in data).
46. The desirability legend has coral hatching below zero, then five steps of one colour starting at each tier's "to rise" value (20, 35, 50, 65). Spec 4.7 was amended. — Cost if wrong: one band merges with another.
47. Homes that want one food take first from whichever food their bazaars hold most of, with ties going to grain. Grain is no longer always first. This came from the long run, where spare figs filled the granaries and stopped the grain farms. Two-food homes still split half and half. — Cost if wrong: homes below tier 7 eat a different mix. Spec 4.10 was amended to say so.

### Rules and numbers the plan left open
48. The garden unlocks at Village, as the spec table says, although one task brief said nothing new comes before Town. — Cost if wrong: a Village player sees one more card.
49. The roof tells add up from tier to tier, each on its own patch of roof: awning, pergola, roof garden, painted bands, then a flag and a roof pool for the Estate. — Cost if wrong: art only, if you want one tell per tier.
50. Manor, Fine manor, Villa and Estate are each about 3 art pixels taller than the tier below, with their own wall tone (whitewash, cream, ochre, rose). At first they were only 1 pixel apart and the same white, and a Fine manor and a Villa looked alike in a street. — Cost if wrong: the big homes look less like the approved mock-up; art constants only.
51. Pennant colours: the fig orchard is green, the booth pink, and every industry building (barley and flax farms included) is the industry tint. The gem mine's flag moved to an open corner, because its rock is the same colour as the tint. — Cost if wrong: art constants.
52. Goal texts stay at about 36 characters so captions fit two lines on a small phone at large text. That is shorter than the spec's example sentence. — Cost if wrong: the goals read terser.
53. A goal appears only once its buildings can be built: each goal waits for its milestone, and the list stops at the first waiting goal. A city that has reached a milestone's people at any point becomes that milestone at the month's end, and the goals list uses the same measure, so a goal waits at most until the month's end and a dip in people no longer hides or strands it (fix wave). — Cost if wrong: the goals sheet previews less of what is coming (the next milestone's locked cards still show it).
54. The merge tip was reworded to be true: "Add three plots beside a Townhouse in a square: it can become a Manor." — Cost if wrong: none.
55. Show me on the "Open a trade route" goal opens the trade sheet once a trading post stands. Show me for the jewellery goal finds rocky ground. Show me for a fig orchard, barley farm, flax farm or gem mine on a house sheet finds ground of the right kind. — Cost if wrong: none.
56. A missing household good is explained the way food is: "next delivery" when the bazaar or a store near it has some, "nothing makes it" when stores are near but empty, and "build a store" when there is none. The fix names the milestone while the makers are still locked ("Barley farms and breweries come with City"). — Cost if wrong: two cause wordings swap.
57. A full storehouse that holds a workshop's input always takes the workshop's output, so a chain can never jam itself. — Cost if wrong: none (one more rule in production).
58. When a storehouse refuses a good, the ghost, alert and help text say so, and offer the switch as the fix. — Cost if wrong: none.
59. A split Manor keeps the month's "fed" record, so mood does not dip that month. A merged Manor's stock covers everyone who was there at the last delivery (fix wave). — Cost if wrong: none.
60. Trade:
    - One city-wide caravan calendar, every 3 months.
    - The level to keep counts stores within 16 road tiles of the post.
    - The first-caravan gift waits until there is room near the post instead of vanishing (fix wave).
    - The sheet's route button follows the game's own rule: you may go into debt down to −500 to open a route, as for buildings.
    - The next caravan's date shows only when one will really come.
    - The caption's gold is the net, and the summary shows purchases beside sales (fix wave).
    — Cost if wrong: none; each makes the sheet say what the game does.
61. The difficulty hint says buildings and trade routes cost "about" 20% less or 25% more, and gives the real road price. Rounding keeps a road at 2 gold on Relaxed and makes it 3 on Hard. — Cost if wrong: a slightly longer hint; or change road rounding later.
62. A bazaar that has run out of food raises "Bazaar has no food" (alert, marker and the "Get grain to the bazaar" goal) even while it still holds pottery (fix wave). — Cost if wrong: none.
63. A full granary raises its own "Granary is full" next to the farm's "no storage". Both are true, as the contract asks. — Cost if wrong: a Stage 1 village whose granary fills shows two markers where it had one.
64. Locked cards keep full-strength text and only fade their picture (4.5:1 contrast). The desirability legend keeps its words under a debt banner. On landscape phones the legend shares one row (with a banner up the goals strip still ends at about 55% of the height there; a layout change is a follow-up). The side-panel tabs keep one row, and no sheet cuts a tab (fix wave). — Cost if wrong: small layout shifts.
65. The desirability overlay draws its hatching as a pattern. It now costs less per frame than the water overlay, where it had cost about 8 times as much. Its five band strengths are evened out (0.14 to 0.58) so the lightest reads at zoom 1 (fix wave). — Cost if wrong: none.
66. The title backdrop simulates 600 days, so it shows Townhouses, Manors and a workshop chain. The sample city's Stage 1 layout was repaired so its granary is not aimed at the river. — Cost if wrong: the title card may appear about half a second to a second later on a slow phone; precomputing the backdrop is a follow-up.
67. The balance test grows a scripted city to Capital through the player's own commands (month 17, lowest gold 379). No data number needed tuning. Its money check now catches a leak of more than about 165 gold. — Cost if wrong: none; the late game is generous (see follow-ups).
68. Internal shapes, for later stages:
    - the goods record lives in the monthly stats, so there is no save change;
    - `routeCostOf` and `demolishRefundFor(world, b)` live in costs;
    - partners carry a `milestone`;
    - merge events come as merge then upgrade;
    - Task 8 owns the words for its own additions;
    - `DIFFICULTY_NAMES` lives with the summary.
    — Cost if wrong: none.

## Part 5: Stage 3 spec

The spec was revised in place (`specs/2026-10-09-thebes-design.md`) from the Stage 3 review (`notes/2026-10-11-stage-3-review.md`, its 12 proposals accepted) and the controller's decisions. Every number is a first value in `data/`.

### The review's twelve, as accepted
69. Fire burns 10-15 days and starts as a 3-day blaze that a staffed firehouse in reach puts out in 1-2 days. — Cost if wrong: fires feel less dramatic; the numbers live in `data/fire.js`.
70. The raid warning runs 3 months (90 days, 60 s at 1×) with a countdown chip, not 2 months. — Cost if wrong: a little less tension.
71. Raid size follows a capped curve of people and wealth (at most 12 raiders) and shrinks after a lost raid. — Cost if wrong: tuning.
72. Tribute is 0.8 × the price of the towers that would win, shown beside "or build N towers facing <dir>", and hidden for the first raid. — Cost if wrong: a cautious player can't buy off the first raid.
73. Peaceful for new cities: Relaxed costs (×0.8), fire risk ×0.5, no raids, score factor 0.7, its own bests. — Cost if wrong: one more choice on the title card.
74. Raiders burn and steal but never hurt citizens; the residents of a burned home leave the city. — Cost if wrong: less grim, and less weight to losing.
75. Score: four parts 0-100 (People, Prosperity, Culture, Safety), sum × difficulty factor, versioned as score v1; Monuments joins in Stage 4 as v2. — Cost if wrong: the weights need tuning.
76. Personal bests per seed and difficulty on the device; Seal this reign; bronze, silver and gold medals. — Cost if wrong: the medal thresholds are guesses at first.
77. Weekly seed, share link and picture card, labelled "friends' honour". — Cost if wrong: anyone can fake a link.
78. Early-game additions: Founded Thebes ticked, the next-threshold bar, "+N" previews, ten feats, stamps, citizen remarks, a coin tick and a water ripple. — Cost if wrong: a little more interface.
79. Ambient life as a light layer over the terrain chunks, with a Settings switch. — Cost if wrong: frame time on old phones.
80. Festivals small: 200 gold × difficulty cost, +6 mood for 3 months, a 12-month wait, from Town, at a working temple. — Cost if wrong: one more button.

### Fire
81. Firehouse 1×1 (like the well and booth): 50 gold, 4 upkeep, 4 workers, safety priority, Services card, Village; reach 8 road tiles (spec 4.5 said 10). — Cost if wrong: one number each.
82. Risk is points a day towards 100: potter and brewery 1.0; weaver, jeweller, granary, storehouse and trading post 0.5; hut and shack 0.3; cottage to townhouse 0.25; manor to estate 0.2; bazaar, booth and barracks 0.3; farms, clay pit and gem mine 0.15; temple and firehouse 0.1. An uncovered House reaches 100 in about 13 months. — Cost if wrong: fires too rare or too common; a table in data.
83. Never burn: roads, empty plots, gardens, statues, plazas, wells and water, walls, gates, towers, rubble. — Cost if wrong: towers can't be lost to fire.
84. Coverage is the best staffing ratio among firehouses reaching a building; it cuts build-up by 80% × coverage; "staffed", for putting fires out, means coverage of at least 0.5. — Cost if wrong: a half-staffed firehouse helps less than players expect.
85. A blaze's put-out time (1 or 2 days) is drawn at ignition and counts only days the building is covered and staffed; after three unfought days it grows. — Cost if wrong: none (a firehouse built during a blaze still saves it).
86. Spread is 6% a day to each burnable building sharing an edge (so a 2×2 has up to 8 neighbours), and a spread starts a blaze, so coverage applies again. — Cost if wrong: big buildings spread fire more.
87. A covered fire goes out at 25% × coverage a day; a firehouse built during a fire counts from the next day. — Cost if wrong: tuning.
88. A building in the fire stage stops working; a blaze does not. — Cost if wrong: production dips during long fires.
89. A burned non-home leaves 1×1 rubble on each footprint tile and loses its stock; rubble needs no road, never burns, has desirability −3, −1; clearing is 5 gold a tile × difficulty cost through Demolish (tap or drag), refused below −500. — Cost if wrong: tuning.
90. Only a blaze or fire that no staffed firehouse reaches is critical (banner, a pause the first time, the speed reaction later); a covered blaze is a warning row, plus a caption when it is out. — Cost if wrong: a covered blaze passes quietly. The brief's "later fires drop to 1×" now applies to uncovered fires only, to avoid alarm fatigue in a big covered city.
91. The "On a fire" setting defaults to Just tell me (1× plus banner); Go to it is the one opt-in exception to "the camera moves only on View", and an instant cut under reduced motion. — Cost if wrong: none.
92. Mood: a fire last month −4 (fire stage only; blazes put out don't count); buildings burned in 6 months −2 each, at most −10. — Cost if wrong: tuning in `data/mood.js`.
93. Fire-risk overlay bands Low 0-24, Rising 25-59, High 60-99 (light hatching) and Can catch fire 100+ (dense hatching), plus dot or ring for covered or not; problem markers on High and above where no staffed firehouse covers. — Cost if wrong: band edges in data.

### Raids and defence
94. Raid timing: the clock starts the day the city first has 250 people (and keeps running if people fall); the first warning comes exactly 720 days later; later warnings 720-1,440 days after the previous raid's (or cancelled raid's) arrival, seeded by raid index; a v3 city above 250 starts the clock at load. — Cost if wrong: raids feel regular.
95. Entry: one of the map's two raider entries, by `hash2(seed, raid index, salt)`, with the direction named by its edge. — Cost if wrong: none.
96. Size: raw = 1 + people ÷ 125 + clamp((wealth − 5,000) ÷ 5,000, 0, 4); wealth = positive treasury + base cost of standing buildings except roads and walls; raiders = clamp(round(raw × risk × adaptation), 2, 12); the first raid is always 3 at every difficulty. — Cost if wrong: tuning (Hard's first raid is no harder).
97. Adaptation: a lost raid sets it to 0.6; each later raid (beaten, lost or paid) adds 0.2, up to 1. — Cost if wrong: tuning.
98. Targets in the order trading post, storehouse, bazaar, temple, then any non-home building; the warning names the kind at warning time; raiders move as one band, strike at most 3 targets for 2 days each, then leave. — Cost if wrong: one band is less dramatic than raiders splitting up, but far easier to read.
99. A strike sets a blaze through the fire system (so a covered firehouse can still save the target), and each raider steals 1% of the treasury (5-50 gold), never below 0. — Cost if wrong: theft is small late on; tuning.
100. Outcome: beaten if half the raiders (rounded up) fall, so the rest retreat, or all fall; lost if the band leaves after its strikes. — Cost if wrong: none.
101. Units: raider 10 HP, 1 tile a day, 2 damage a day; soldier 12 HP, 2 tiles a day, 3 damage; tower 4 a day × staffing at the nearest raider within 4 tiles (straight line); towers needed = ceil(raiders ÷ 3). — Cost if wrong: combat tuning; a test pins "one tower beats the first raid".
102. Wall 8 gold a tile, 40 HP; gate (a wall on a road) 20 gold, 40 HP; tower 1×1, 150 gold, 8 upkeep, 4 workers, 80 HP on a wall; barracks 2×2, 200 gold, 12 upkeep, 6 workers; walls cost no upkeep; towers and barracks need a road, and a gate counts as one. — Cost if wrong: numbers in data.
103. Damaged wall tiles heal when the raid ends; broken ones stay gaps until redrawn at the normal price. — Cost if wrong: no repair chore after a raid.
104. Pathfinding: one flow field per band target; open tiles cost 1, buildings and water can't be crossed, a wall, gate or tower tile costs 1 + HP ÷ 2 (1 once broken); rebuilt on a wall, road or building change; the band waits while any member breaks a wall or fights. — Cost if wrong: raiders breach where towers aren't (a tower's 80 HP steers them away).
105. Barracks train 1 soldier per 30 days at full staff, up to 4; patrol radius 8 tiles; pay is 8 gold a month even in peace and even while the barracks is paused; a soldier at 0 HP is wounded and leaves service, and training replaces it. — Cost if wrong: tuning.
106. Mood: a raid in the last 6 months costs −3 if beaten and −8 if lost (the brief gave one term; the split shows defence's value). — Cost if wrong: winning still dents mood a little.
107. Raiders arriving drop the speed to 1× (never a pause), so a fight isn't watched at 3×. — Cost if wrong: one more speed drop.
108. The tribute hint's N is towers needed less working towers; at 0 it says "Your towers can beat this raid". Tribute is payable only during the warning. — Cost if wrong: none.
109. Desirability: firehouse −1; tower −2, −1; barracks −4, −2; walls and gates none (spec 4.7 had no values). — Cost if wrong: tuning.

### Alerts, difficulty, money
110. One banner slot, ranked active raid, raid warning, uncovered fire, debt, save failing; the rest wait in the minimap list behind "+N more"; the countdown chip is the raid warning's collapsed banner in the same slot, so a chip and a banner never stack. — Cost if wrong: a fire during a raid warning shows only as "+1 more" and a speed drop.
111. With a banner up, the legend shrinks to an icon so the goals strip ends above the middle at 375×667 and 844×390 at any text size. — Cost if wrong: the full legend is one tap away.
112. Peaceful keeps the Defence cards working but skips the defence goals, daily goals, raid feats and achievements, and counts Safety's defence term as full. — Cost if wrong: walls on Peaceful are decoration.
113. The difficulty's cost multiplier also covers walls, rubble clearing and festivals, and tribute through the tower price; soldiers' pay never changes. — Cost if wrong: none.
114. Balance: wages + upkeep + soldiers' pay at 60-70% of taxes at a steady tier-4 town is the band the long-run test asserts. — Cost if wrong: at Capital a full defence costs only about 5% of taxes, so the late game stays generous until Stage 4's monuments.

### Scoring and gamification
115. People = 60 × growth (milestone steps plus the fraction to the next, ÷ 5) + 40 × residents' average tier ((tier − 1) ÷ 8). — Cost if wrong: weights.
116. Prosperity = 30 × (tax per person ÷ 5) + 30 × jobs (full at 5% jobless or less, 0 at 30%) + 20 × treasury (0 at −500) + 20 × (open routes ÷ 2). — Cost if wrong: weights; trade counts routes, not volume.
117. Culture = 25 each for the share of homes reached by a working temple, booth and bazaar, + 25 × average home desirability ÷ 50. — Cost if wrong: weights.
118. Safety = 40 × firehouse coverage share (1 before Town) + 40 × defence ((working towers + soldiers ÷ 3) ÷ towers needed now; 1 before the raid clock and on Peaceful) + 20 × record (−0.2 per building burned and −0.5 per raid lost in the last 12 months). — Cost if wrong: weights.
119. The live total shows in the summary, on Welcome back, and as a small chip on the summary button; the top bar gets nothing new. — Cost if wrong: the score is one tap away, not always in view.
120. Medals are set on the parts' total before the difficulty factor, 160/240/320 of 400, and shown in city-score points (so Hard's gold is 400 and Peaceful's 224). — Cost if wrong: guesses; set on the raw parts so every level can earn gold.
121. The review's examples ("Best: 712", "Beat 701?") exceed the 500 the formula allows at most; the spec uses 312 and 301. — Cost if wrong: none.
122. Records in `localStorage` `thebes.records`: one row per city (an id the interface gives at creation) updated on every save, and one chronicle entry per seal, 200 of each (oldest first, never a best); bests = the highest month-end score and the earliest milestone days per seed and difficulty; older score versions are kept and labelled. — Cost if wrong: a cleared browser loses its records unless exported.
123. Seal this reign can be repeated at any time; each seal is a new entry and stamp; the title card shows the three highest bests. — Cost if wrong: a player can fill the chronicle with seals of one city.
124. Weekly seed = ISO week-year × 100 + ISO week, from the local date, read by the interface. — Cost if wrong: friends in far time zones can be a day apart at the week's turn.
125. Share link `#t1.<seed>.<p|r|n|h>.<parts joined by ->.<game-months to each milestone, x if not reached>.<4 base-36 check characters>`; the emoji row has one line per part and a square per 20 points; screenshot mode sits in the ☰ menu and beside Share score. — Cost if wrong: a format change needs t2.
126. Founded Thebes makes the opening chain ten goals, so the strip opens at "1 of 10", not the review's "1 of 9". — Cost if wrong: one number; drop a chain goal if "of 9" matters.
127. After Capital the next-threshold bar shows the next medal ("Silver: 38 points to go"). — Cost if wrong: none.
128. Ten feats (table in spec 4.19), per city, no gold, may be missed, never gate anything. "Town with only grain" became "Market town without a fig orchard", because figs unlock at Town. — Cost if wrong: the list is data.
129. Stage 3 goals and rewards: a "Danger" chapter; chain goals "Build a firehouse" (after Town) and "Build a tower and a barracks" (after the trade route); event goals for the first fire and first raid warning (each needs a building, not "no alert"); five firsts; four achievements; three daily goals; six tips. — Cost if wrong: data only.
130. Citizen remarks: a pool of at least 24; at most one per 3 game-months, when the caption row is free; by seed, month and season; only for buildings the city has; none when Help is Off. — Cost if wrong: remarks are rarer than "variety" suggests.
131. The coin tick is one note of at most 0.1 s at gain 0.15 or less; the horn is three low notes of at most 0.4 s each; about ten sounds in all. — Cost if wrong: none.

### Art and ambient
132. Raiders and soldiers are drawn 1.5× citizen size and told apart by shape (crested helmet and round shield, against white kilt, tall spear and teal shield); health bars show after the first hit; arrows are 0.3 s strokes. — Cost if wrong: art constants.
133. Ambient numbers: glints drift about 0.2 tiles a second over 4-7 s; reeds sway ±3° and trees ±2° over 3-6 s; a crop band every 6 s; smoke every 2-3 s; each kind of rare life at most one on screen, every 60-120 s; over 2 ms a frame, drop rare life, then smoke, then sway; paused and idle for 2 s, cap at 30 fps. — Cost if wrong: tuning.

## Part 6: Stage 3 built (plan, tracks, integration, final review)

### Process
134. Six track plan writers ran in parallel (opus) after an architect wrote the binding contract and Track 0, and each writer ran its own code on a scratch copy with Track 0 applied (A 1007, B 1019, C 1017, D 1018, E 1066, F 999 tests passing). — Cost if wrong: none; the tracks applied almost verbatim.
135. Track 0 was built while the writers wrote, and the plan was committed in two parts (header, contract and Track 0 first; Tracks A-F once written). — Cost if wrong: none; it saved about an hour.
136. Tracks A-E ran at the same time in sibling worktrees (`C:\dev\thebes-s3-<track>`), one agent per track, and skipped the plan's "catch up before the last task" merge: the controller merged them in order A-E and fixed cross-track breakage at integration. — Cost if wrong: cross-track bugs surface at the merge (one did: a Track D test written against B's stub, fixed in the merge).
137. On your "go for the above to save tokens": task reviewers were sonnet for every track (each still checked the words against the sim), fix rounds were capped at 3, and the final review used four sizes without a 150% text pass. — Cost if wrong: a few words-versus-sim or large-text bugs may reach the mobile UX step (which covers 150% text).
138. Models: fable for the final review; opus for the spec, the architect, the six writers, the art, interface and scoring tasks, the balance tasks and the fix wave; sonnet for the infrastructure, Track 0's and the fire and raid sim implementers, every task reviewer from Track A on, and the integration fixer. Every commit carries the Opus 5.5 trailer, as your rule says. — Cost if wrong: none.
139. A fixer committed the private progress ledger into the Track D merge; the unpushed merge was amended to drop it, and `.superpowers/` stays ignored. — Cost if wrong: none.

### Contract (plan section "The contract" and its notes)
140. Fire state lives on each building (`b.risk`, `b.fire`), not in a world map; walls are a tile layer (`world.wall`, −1 a breach) that is also listed in BUILDINGS (`tile: true`) so cards, prices and unlocks work; rubble costs 0 and is not buildable; roads never cross walls (a gate is wall drawn over a road); demolishing a wall refunds nothing and a gate keeps its road; only a tower may stand on a wall tile. — Cost if wrong: rework in the owning track.
141. The pure rules several tracks read (coverage, daily risk, raid size, tribute, festivals, medals, seals) were written complete in Track 0, so the interface and score could test real behaviour before the sims landed. — Cost if wrong: none.
142. Speed reactions are split: the sim makes the first-time pauses and the drops to 1× (saved, deterministic); the interface makes the On a fire reaction for later fires (a device setting). — Cost if wrong: none.
143. Records ride in the save envelope as an optional field (save version stays 1); every city gets a records id from the interface; a Stage 2 city's milestone days are unknown, so its share link shows `x` for them. — Cost if wrong: an older city has no "faster than your best" for milestones it passed before Stage 3.
144. A test-only calm switch kept the long runs and sample cities fire-free until Track F, which then removed it. — Cost if wrong: none (removed).

### Rulings on the writers' notes (plan section "Controller rulings")
145. A burning workplace is not also "short of workers"; palms and acacias sway through a renderer hook; the summary shows the score before the last raid report (Task 0.4). — Cost if wrong: none.
146. Every track namespaces its names inside the shared words file, and each track words only its own things: the interface words the fire row, directions, countdown, raid report, tribute and festival; the sims word only their alert codes, refusals and mood rows. — Cost if wrong: none.
147. A covered fire raises a warning ("X is burning: N days left"), not a critical banner; "a fire last month" counts every day a building is in the fire stage. — Cost if wrong: a covered fire passes quietly (intended: no alarm fatigue).
148. A tower's wall tile is raised to 80 when raiders arrive and healed when they leave (it may read 40 between raids); a tower on a broken wall tile falls without rubble. — Cost if wrong: a tower between raids looks like plain wall to code that reads the tile.
149. The banner keeps Stage 2's single live announcer, switched to assertive for a new critical; the fire legend says "a staffed firehouse reaches it"; on phones the legend becomes an icon under a banner (replacing ruling 64 there). — Cost if wrong: a screen reader may hear a critical slightly later than with a dedicated alert region.
150. An event goal whose need is already met is not added; Peaceful skips only the raid achievement, raid feats, the tower-and-barracks goal, the first-warning goal and the wall and tower daily goals; the summary shows Peaceful cities only achievements they can earn. — Cost if wrong: none.
151. The next-threshold bar steps aside on phones while a critical banner, a tip or a caption is up; the strip opens at "1 of 10". — Cost if wrong: the bar is hidden for a few seconds at a time.
152. The summary runs score, feats, last raid report, then achievements. — Cost if wrong: the feats sit one section above the achievements when a raid report exists.
153. Info captions (raid reports, blazes put out) stay 6 s. — Cost if wrong: none.

### Balance and integration (Track F)
154. No balance number needed tuning: the 10-year village (two firehouses, three towers) spends 65.3% of its taxes on wages, upkeep and soldiers' pay, inside the 60-70% band; 26 blazes, all put out; three raids, all beaten. The capital run (39%) is not held to the band (ruling 114). — Cost if wrong: the late game stays generous until Stage 4.
155. The sample cities place firehouses through the player's commands and defences only when they hold 1,000 gold spare; none of them burns or meets a raid in its 600 days, so the title backdrop still looks thriving. — Cost if wrong: none.
156. The long-run tests keep their Stage 2 names ("longrun", "capital run"). — Cost if wrong: `-Grep "s3 balance"` does not select them.
157. Homes with no road beside them can never be covered by a firehouse (coverage reads a building's own road tiles); a follow-up. — Cost if wrong: such a home's fire risk shows uncovered.

### Final review (fable), fix wave (opus), adjudication
158. The final review found no critical issues and 7 important ones (no arrival time on the open raid banner; a fire row saying "short of workers" for a burning firehouse; flames too small; walls drawn as separate blocks; an area demolish taking a gate's road; focus lost after Shrink; a firehouse offering View on itself), plus 10 minor; one fix wave fixed all 17 and a scoped re-review confirmed each. — Cost if wrong: none.
159. The open raid banner now says when the raiders arrive ("They arrive in 2 months 12 days"), and so does the tribute sheet. — Cost if wrong: the banner is one line taller.
160. Left open on purpose: with a raid warning up, the banner and goals strip end past the middle of the map at 375×667 at 150% text and at 844×390 at 125-150% (they already did before Stage 3's arrival line). The mobile UX pass you asked for takes this first, with the rest of the notification clutter. — Cost if wrong: until that pass, large-text phone players see the map's upper half covered during a raid warning.
161. The title card hides This week's hint line on landscape phones so the card fits 844×390 without scrolling. — Cost if wrong: the seed number is not shown there (the button still works).
162. The worktrees `C:\dev\thebes-s3-{fire,raids,art,ui,score}` and their branches are left in place after the merge (deleting them is your call; they are fully merged). — Cost if wrong: about 5 folders of disk.


## Part 7: the mobile UX pass (12 Oct 2026)

From `notes/2026-10-12-mobile-ux-review.md` (notifications first, as you asked), accepted as proposed.

163. On phones (portrait and compact) at most two rows sit under the top bar: one alert row and one guidance row. — Cost if wrong: a player sees the goal less often (a tip, caption or legend takes its place for a while).
164. The guidance row shows one thing, in this order: the overlay legend, a tip, a caption, the goal; the threshold bar only in calm portrait play outside the guide. — Cost if wrong: the goal is out of sight while an overlay is on; the "Town: 83 of 150" reminder shows less.
165. Captions last 4 s (goals, firsts, feats, remarks), 5 s (milestones), 6 s (info); at most two wait; every caption is copied to a Recent list of 10 in the Goals sheet; under a banner only info captions show. — Cost if wrong: some celebrations go straight to the list in a busy moment.
166. The banner ranks active raid, uncovered fire, raid warning, debt, save failing. — Cost if wrong: during a fire the raid countdown is in the badge for a few seconds.
167. On phones the banner is one line (icon, words, View); a raid warning shows as its countdown chip from the start, and its words open the raid sheet (the tribute sheet, with Pay tribute where offered); Shrink and "+N more" leave the phone banner, and the Map badge counts every alert the banner is not showing. Wide screens keep today's banner. — Cost if wrong: tribute is one tap deeper on a phone.
168. While a sheet is open on a phone, the guidance row hides and the alert row stays one line; the camera frames a selected building, the ghost and Show me in the map left free below the measured rows (not 48 px). — Cost if wrong: the goal is out of sight while a sheet is open.
169. On phones one toast shows at a time (the newest replaces the last) and it may use the screen's width up to 420 px. — Cost if wrong: an older Undo toast goes early (Undo still works from the confirm bar and Ctrl+Z).
170. The goals strip is one row on phones: count or label, words, progress, Show me; the words open the Goals sheet; Skip guide moves into the Goals sheet. — Cost if wrong: Skip guide is one tap deeper.
171. Tips on phones close after 20 s of unpaused play (replacing the 15 s rule at 125%+), on Got it, on Esc, or when their condition clears. — Cost if wrong: a slow reader loses a tip mid-read; How to play still lists it.
172. On a landscape phone at 125% or 150% text only one row sits under the top bar: the alert row when there is one, otherwise the guidance row. — Cost if wrong: in a raid the goal is out of sight on large-text landscape phones.
173. The corner buttons hide while the portrait tray is open if they would sit above half the screen; the rail's ✕ and ✓ hide while the confirm bar shows. — Cost if wrong: pausing with a tall tray open needs the tray closed first.
174. The speed chevron gets the word "Speed"; the countdown chip says "2 months" when the days are 0. — Cost if wrong: none.
175. Spec 6.3 and 4.1 are updated to match 163-174 (the "Small phones" paragraph, the rank, the threshold bar), and the height budget in section 3 becomes a test at four sizes and three text sizes. — Cost if wrong: none.
176. On phones, while the game is paused, an ordinary tip waits so a new player always sees the goal and Show me; the Play tip still shows; the guidance order of ruling 164 is unchanged. — Cost if wrong: tips arrive only once play starts.
177. The Update ready toast is exempt from the one-toast rule on phones and keeps its Restart button until used or dismissed. — Cost if wrong: two toasts can briefly show together.


## Part 8: the placement UX pass (12 Oct 2026, from your phone feedback)

From `notes/2026-10-12-placement-ux-review.md`, accepted as proposed. They are numbered P1-P16 because the Stage 4 review has already proposed 178-224. On point 5 this takes option D: a building that lacks only a road can be placed (amber, no upkeep, counts for nothing until a road reaches it); the "planned, unpaid" building state is a follow-up if you still want it after trying D.

- **P1.** A ninth overlay, **Ground**, shows free fertile land (green with dots) and free rocky ground (grey, hatched), with crisp tile edges and a legend in words. Picking a farm, orchard or gem mine turns it on, and while placing one the tiles with room for a whole footprint are brighter. — Cost if wrong: one more overlay to pass when cycling with O.
- **P2.** The Layers button opens a picker of all overlays plus Off on every layout (a corner popover on phones, a new button under the minimap on wide). O still cycles. — Cost if wrong: switching off from the picker is two taps (the legend's ✕ is still one).
- **P3.** On touch and pen, a one-finger drag in a drawing tool draws instead of panning; two fingers pan and zoom. Roads and walls follow the finger tile by tile; plots and demolish paint the rectangle from start to finger. A tap adds or removes one tile. Strokes add up into one plan until ✓. The mouse keeps click-start-click-end, drag and Flip. — Cost if wrong: one-finger panning is not available while a drawing tool is open.
- **P4.** Double-tap zoom is off while any tool is active. — Cost if wrong: zooming while placing needs a pinch.
- **P5.** A touch plan lays every tile it can and skips blocked ones, marking them coral with ✕ and counting them in the bar. — Cost if wrong: a road can have a gap where something stood.
- **P6.** After ✓ with touch or pen the tool ends: the map is in Browse, the dock returns as it was when the card was picked, a service's overlay stays on until closed, and the Undo toast stays 6 s above the dock that is showing. Mouse and keyboard keep placing repeatedly. — Cost if wrong: placing several of the same building takes one extra tap each (the card).
- **P7.** On phones the confirm bar's Undo is an icon button (↶, named Undo), shown only when there is something to undo. — Cost if wrong: Undo is less obvious in the bar; the toast keeps the word.
- **P8.** A cut goal, tip or caption shows "More ▾"; a tap opens it in place up to 40% of the screen height (scrolling inside beyond), stops its timer, and closes on a second tap, Back, Esc, a map tap, a sheet opening or a change of content. The open goal holds its reward, Show me, "All goals ›" and Skip guide. This replaces ruling 170's "the words open the Goals sheet". — Cost if wrong: the Goals sheet is two taps from the strip, not one.
- **P9.** The placing preview checks each condition on its own (ground or terrain, road, storage or supply, gold) and shows each as a chip in the confirm bar with a mark and words (✓ met, ! later, ✕ can't). Each footprint tile shows its own state on the map. — Cost if wrong: the bar is one row taller for buildings.
- **P10.** A building that fails only the road can be placed by the player, in amber ("won't work until a road touches it"), as housing plots already can; the ghost marks the free tiles where a road would join it. Fertile or rocky ground and gold still refuse. The sim's default and the sample city stay strict. — Cost if wrong: a player can spend gold on a building that does nothing until a road comes (Undo refunds it this month).
- **P11.** A building with no road beside it pays no upkeep and no wages, and does not count for "Build a …" goals until a road touches it. — Cost if wrong: an unconnected building costs nothing to keep (it already does nothing).
- **P12.** No "planned" building state for now (placed free, built and paid for by itself later). Revisit after Josh has played P10. — Cost if wrong: a farm's gold is spent when it is placed, not when its road arrives.
- **P13.** Ghost marks and problem markers are at least 20 px across at any zoom; a no-road problem shows the road mark "═", others "!". Road-less housing plots get a dashed amber outline and one warning in the list ("6 plots have no road", View). — Cost if wrong: a busier map while many plots lack a road.
- **P14.** Plots painted with no road never bring the Press Play tip; their toast says "· no road yet". — Cost if wrong: none.
- **P15.** Picking a farm, orchard or mine lands its ghost on the nearest free ground of its kind (a fit with only "later" conditions counts), and Show me for the farm goals aims at the nearest free fertile land. Terrain buildings' cards say "On fertile land" or "On rocky ground". — Cost if wrong: the ghost may land a few tiles further from the town than today.
- **P16.** Spec 4.4, 4.5, 6.3, 6.4, 6.5, 6.6 and 6.8 are updated to match P1-P15, and the mobile budget gains an "expanded" scene (an open tip, limit 40% at every size and text size) and a "farm" placing scene. — Cost if wrong: none.

### Part 8 as built (placement UX tasks 1-8, branch `placement-ux`)

P1-P16 keep their numbers for good (ruling 225); the Stage 4 rulings, 178 on, are in part 9. Where building a ruling left a choice open, this is what was done (the calls were made from the design note's rulings and section 2; every one is cheap to change).

- **P1 (Ground).** "Room for a farm" means the ground only (every footprint tile is the right kind and free), not road or gold, which fits P10 and P15. Ground is the last overlay when cycling with O, so the order of the first eight is unchanged. On a phone at 125% text or more the legend's third line ("Bright: room for a farm") is read by screen readers only, because it would not fit the 40% budget at large text; the bright tiles say it. The "Overlay on" tip is not shown for Ground (its words about dots and rings are false for it).
- **P2 (Layers).** The wide picker has two columns, not three (a third of the 320 px side panel is too narrow for "Entertainment"); each button shows its overlay's colour as an edge stripe. Opening the picker leaves an open guidance row open; Back closes the picker first.
- **P3-P5 (touch drawing).** A stroke a second finger interrupts is dropped (the player meant to pan); earlier strokes stay. A gap the finger skips is filled with an L along the axis moved most, then the other, not a staircase. Only a stroke's own last tiles come off when dragging back. A tap on an empty tile in demolish adds nothing. ✕ drops the whole plan. The bar's idle words follow the last press, and a fine pointer counts as a mouse until the first touch, so a wide screen with a mouse reads as before.
- **P6 (leave after ✓).** It applies to every tool kind (roads, walls, plots and demolish as well as buildings), by the input type of the ✓ press, so a touch tablet in the wide layout leaves the tool. Enter never leaves. The camera pans only for a building, keeping the whole drawn building clear of the legend and the toast; where nothing fits it puts the legend first (the toast goes in 6 s).
- **P8 (open in place).** The goal's words always toggle the row (the open goal holds more than the words), and the threshold bar steps aside while it is open. While another row (the Ground or service legend) has the guidance row, there is nothing to open. Captions and tips keep a div live region with a real More button beside it, rather than turning the caption into a button.
- **P9 (condition chips).** The "later" road chip says "No road yet" and the longer "draw one on a marked tile" sits in the bar's reason line while join tiles show, so the bar keeps one height. The gold chip shows only when paying would cross the debt floor. Road-join tiles show only while the ground is fine. A terrain building's chip row reserves two rows.
- **P11 (no road, no upkeep).** It also applies to a city whose road was demolished (the building stops paying), which is a small balance change; soldiers' pay is unchanged. A road-less building still fires its "first" caption when placed, while its goal waits for the road.
- **P13 (road signs).** The sample city's three empty reserve plots have no road, so its Map badge counts one warning and they get the dashed outline; that is true of the world.
- **P15 (landing).** A farm or mine looks up to three times as far (30 tiles) for its ground, so it may land far from the town; the existing bring-into-view keeps it on screen. The card line says "Fertile land" (the tooltip says "on fertile land"), because "On fertile land" wrapped to two lines on a 124 px card at 150% text. Show me aims at fertile or rocky ground only while the building the goal needs next is a terrain building, otherwise at the focus (which also fixes the jewellery goal aiming at rocky ground).
- **P16 (spec and scenes).** Spec 4.1 (goals strip), 4.4, 4.5, 4.11, 6.3, 6.4, 6.5, 6.6, 6.7 and 6.8 are updated. The mobile budget holds the "expanded", "farm" and "farm-raid" scenes. The before and after shots for the pass are in `docs/superpowers/notes/screenshots/` (`placement-*`).


## Part 9: Stage 4 (12 Oct 2026)

The spec was revised in place (`specs/2026-10-09-thebes-design.md`) from the Stage 4 review (`notes/2026-10-12-stage-4-review.md`), fitted to the placement UX pass (part 8), with the four requests you added the same day (picture cards before the first city, music, the palace, a more Egyptian interface). Every number is a first value in `data/`.

### The review's rulings, as accepted (178-224)

All accepted as proposed, except 197, which the placement pass overtook (its road rule is now "later", ruling 226).

178. Stage 4 is monuments and a grander city: seven monuments, the quarry, brickworks and builders' guild, prestige, score v2, processions, plazas and sphinxes, and the Motion setting (extended by ruling 260). — Cost if wrong: missions wait longer.
179. Monument times with the kind's most crews and full supply: 3 months, 9 months, 2, 3, 5, 8 and 15 years (great pyramid 60 min at 1×, 20 at 3×); fewer crews take longer in proportion. — Cost if wrong: a veteran may find the great pyramid quick; the numbers are data.
180. A site never advances while the game is closed; Welcome back shows each site's course and pace. — Cost if wrong: a returning player finds the pyramid where they left it, by design.
181. Courses (3 to 12); half the prestige course by course, half on completion. — Cost if wrong: little.
182. The course fills block by block (a block at least every 5 s at 1× while crews work), the ramp climbs, one sled and gang per crew, on game time, idle when stalled or paused. — Cost if wrong: art time and frame cost.
183. A finished pyramid gets white casing and a gold capstone, the large obelisk a gilded tip; a milestone caption, sparkle, one slow shine and a one-month dedication procession; no new sheet or pop-up. — Cost if wrong: a quieter finish than some would like.
184. One guild, one crew; the nearest unpaused, unfinished site within 12 road tiles with room; at most 1, 2, 2, 3, 4, 4 and 4 crews by kind. — Cost if wrong: no hand-assigning of crews (pausing moves them).
185. Quarry (2×2 rocky, 100 gold, 10 workers, 30 stone), brickworks (2×2, 90, 8 workers, clay to bricks, 30) and builders' guild (2×2, 150, 16 workers) at City. — Cost if wrong: quarries sit east, in the raiders' path.
186. Producers send to the nearest site in reach that needs it, else a storehouse; sites stockpile and draw from storehouses within 16; storehouses accept stone and bricks. — Cost if wrong: stone can crowd a shared storehouse (the accept switch and a tip are the levers).
187. Guilds, quarries and brickworks work last, and idle with no workers or wages when no site needs them (upkeep runs). — Cost if wrong: stone cannot be stockpiled ahead of a site.
188. No scribes. — Cost if wrong: no late labour trade-off; revisit after playtests.
189. Memphis sells stone at 6 gold, 200 a year; nobody buys it. — Cost if wrong: one more trade row.
190. Founding, then 100 gold a crew-month paid daily, plus 1,000 gilding and 5,000 capstone, all × difficulty cost. — Cost if wrong: the totals (about 171,000) need playtesting.
191. A crew never works a day that would take the treasury below 0, and the sheet says so. — Cost if wrong: no borrowing to finish a monument.
192. Monument work is a spending row and counts in the balance share. — Cost if wrong: none.
193. The 10-year village band is unchanged; the capital run gains a monument programme and its new assertions. — Cost if wrong: a longer script to maintain.
194. Monuments, sites and stockpiles never burn; quarry 0.15, brickworks 1.0, guild 0.3 a day. — Cost if wrong: monuments carry no fire risk.
195. Raiders never target monuments or sites; monuments are not wealth. — Cost if wrong: monuments are free of danger, and spending on them shrinks raids a little.
196. Desirability: a site −3, −2, −1; finished monuments and supply buildings as the review's table; the preview shows both states. — Cost if wrong: tuning.
197. (superseded by 226) Monuments need dry ground that is not fertile land, and a road.
198. Mastabas rotate two ways (⟳ or R); the sim stores it and swaps the footprint. — Cost if wrong: a small change to place and undo.
199. Prestige measured from state: per kind, the most advanced standing monument; a second adds desirability only. — Cost if wrong: an avenue of obelisks earns nothing extra.
200. Small pyramid: Capital and 100 prestige; great pyramid: 300; locked cards show condition and count. — Cost if wrong: the great pyramid needs most of the ladder first.
201. +1 mood per 70 prestige, at most +10, its own row. — Cost if wrong: tuning.
202. Score v2: Monuments = 100 × √(prestige ÷ 700); out of 500 × factor; medals 200, 300, 400. — Cost if wrong: a v1 gold city reads silver until it builds.
203. `SCORE_VERSION` 2, link `t2` (five parts, seven splits); `t1` opens as older scoring; Welcome back compares one version only. — Cost if wrong: some old bests look out of date.
204. Two new splits: pyramids unlocked, great pyramid finished. — Cost if wrong: a longer link.
205. Undo only before any work; demolish asks, refunds a quarter of the founding, and takes the prestige. — Cost if wrong: none.
206. Pausing stops work and gold, releases the guilds' workers, keeps stock and courses. — Cost if wrong: none.
207. The Monuments tab holds the guild, quarry, brickworks and seven monuments; plaza and sphinx in Homes. — Cost if wrong: a ten-card tray scrolls on phones.
208. Picking a monument zooms out once to fit; no camera moves while placing; nearest-fit radius 16 for 3×3 and up. — Cost if wrong: a small exception to "the camera stays still" (shaped by 231).
209. A monument fades to about 40% while placing near or selecting behind it. — Cost if wrong: render work.
210. The site sheet: progress, crews, materials, pace, last month's gold, prestige, Pause, Demolish, View; every stall with cause, fix and Show me; words checked against the sim. — Cost if wrong: none.
211. Stalls are warnings, never criticals. — Cost if wrong: none.
212. Captions for each course and each finish (milestone tier). — Cost if wrong: more captions in a busy month (Recent keeps them).
213. The Monuments chapter, first-stall goal, four firsts, five achievements, two feats, three daily goals, tips and remarks. — Cost if wrong: more text to keep true.
214. Festival processions, one more figure per temple, booth and finished monument, at most 12. — Cost if wrong: walker frame cost.
215. Plaza (1×1, City, 8 gold a tile, 2, 1, never burns) and sphinx (1×1, Great city, 150, 10, 8, 6, 4, 2). — Cost if wrong: two more cards.
216. One Motion setting (Full, Gentle, Still), following the device; a device asking for less gets Gentle; earlier explicit choices kept. — Cost if wrong: a player who wants nothing moving chooses Still once.
217. Gentle allows walkers, units, sleds, gangs, processions and fades in place; no sway, drift, rising, pulses, bursts, rare life, shine or camera moves. — Cost if wrong: some may prefer Still.
218. A one-time tip explains Gentle. — Cost if wrong: none.
219. Ambient a notch more visible under Full (a third more glints, larger puffs, rare life every 45-90 s), same 2 ms. — Cost if wrong: frame time on old phones.
220. Every Stage 4 visual review shoots Full and Gentle. — Cost if wrong: none.
221. Monuments drawn live, within 1 ms a frame for three sites. — Cost if wrong: per-frame cost.
222. The title backdrop and sample city get a finished small obelisk and a colossus under way (and a palace, ruling 275). — Cost if wrong: a slightly longer backdrop build.
223. World version 5 with a v4-to-v5 migration. — Cost if wrong: none.
224. Every monument number lives in `src/data/monuments.js`; your playtest sets the final values. — Cost if wrong: none.

### Monuments, fitted to the spec and the placement pass (225-259)

225. P1-P16 keep their P numbers for good (code comments, tests and the spec cite them); the main sequence carries on from 225. — Cost if wrong: two numbering schemes in one file.
226. (replaces 197) A monument needs dry ground that is not fertile land (desert, rocky, meadow and scrub all do); its road can come later, as for every building (P10): placed with no road it is amber, founded and paid for, and does nothing (no crew, deliveries, work gold, or dust and noise) until a road touches it, and a "Found a …" goal waits for the road. — Cost if wrong: a player can found a site and forget its road (the road badge, the site sheet and the chip say so).
227. Founding never takes the treasury below 0 (like work gold, gilding and the capstone), though other buildings may go to −500; the gold chip reads "Founding 1,000 gold: you have 640" and refuses. — Cost if wrong: a monument cannot be founded on credit.
228. A finished monument needs no road for its desirability or prestige (like gardens and statues); a site needs one. A second of a kind gives its desirability in full. — Cost if wrong: a monument cut off from the city still makes homes nicer.
229. Picking a monument turns the Ground overlay on; "room" is every tile in at least one free spot where the whole footprint, in its current rotation, sits on non-fertile dry ground, drawn as a pale gold wash with crisp edges (fertile and rocky at half strength), legend "Fertile: no monuments here · Gold: room for a small mastaba"; worked out at the pick and each rotation, then kept until roads or buildings change. The quarry uses the gem mine's rocky room. — Cost if wrong: one more look inside the Ground overlay.
230. A monument's chips are Ground, Road, Crew ("No builders' guild near"), Supply ("No stone near") and Gold; Crew and Supply show only once a road touches it (both come by road); no chip for a prestige lock, since a locked card cannot start the tool and already shows its count; two chip rows are reserved. — Cost if wrong: the bar is two chip rows tall for monuments.
231. The pick's one camera move (the pan every pick already makes) also zooms out, only as far as the footprint and silhouette need, never past the least zoom and never in; it eases under Full and cuts under Gentle and Still. Nothing moves while placing (no edge scroll, rotating does not move it); after a touch ✓, P6 applies unchanged and the camera never zooms back in. — Cost if wrong: the player pinches back in after placing a pyramid.
232. Nearest fit searches 16 tiles for 3×3 and up with road-later fits counting (P15's order: clean first, then fewest "later"); monuments do not get the terrain buildings' three-times reach; the quarry does. — Cost if wrong: a pyramid ghost may land on bare desert away from roads, in amber.
233. After a touch ✓ a monument ends the tool like any building (P6): the Monuments tray returns, the toast says "Small obelisk founded · Undo" (or "· needs a road"), and no sheet opens by itself. — Cost if wrong: the site sheet is one tap away.
234. Rotation is chosen only while placing: `place(world, type, x, y, { rot })` with rot 0 or 1 (1 swaps w and d), ignored by types that do not rotate; ⟳ and R turn the ghost about its centre tile; a placed building never turns, so the spec's "Rotate" sheet action and the `rotate` command are dropped. — Cost if wrong: turning a founded mastaba means demolishing it.
235. Pausing a site is the existing `setPaused(world, id, paused)`; there is no pauseSite or resumeSite. — Cost if wrong: none; one command fewer.
236. Once any work is done on a site, Undo refuses with "Work has begun on the small obelisk: demolish it instead" and drops that step (as an undo of a demolish that cannot go back already does); undoing a monument's demolish within the month restores its courses and stock and takes back the refund. — Cost if wrong: a misplaced site noticed after one block costs three quarters of its founding.
237. A quarry or brickworks is "needed" when an unpaused, unfinished, road-touching site that still needs its material and has room is in its producer reach, or within 16 road tiles of a storehouse in its producer reach that accepts the material and has room; otherwise it idles ("Idle: no monument site needs stone within reach"). — Cost if wrong: a bridging storehouse can fill with stone for one far site.
238. A site's stockpile holds at most 40 units per crew of its kind's most crews, of the materials its unfinished courses still need, never more of one than they need; material may arrive before any crew. — Cost if wrong: quarries can work (and pay wages) a little before any guild does.
239. A course whose recipe names two materials (pyramid blocks and ramp bricks) is laid in proportion, so it waits when either is missing, and the stall names that one. — Cost if wrong: a brickworks shortfall stops a pyramid course (the stockpile buffers about two months).
240. Work gold is 5 gold a unit laid (100 a full crew-month) × difficulty cost, paid daily in whole gold with the fraction carried on the site; crews pay in the order their sites were founded, and a crew whose day would cross 0 does not work. — Cost if wrong: in a nearly broke city the newest site waits first.
241. The gilding and the capstone are paid on the day the last course begins, and that course waits ("Waiting for 5,000 gold for the capstone") until paying keeps the treasury at 0 or above. — Cost if wrong: the last course can sit waiting for gold.
242. Course prestige is round down (half × courses done ÷ courses), so the halves add up exactly; each course caption names the real gain. — Cost if wrong: none.
243. The pyramids' prestige unlocks stay once reached, like milestones: the world records the day of each (the 100 day is also the "pyramids unlocked" split, counted when Capital and 100 both hold); a founded site always carries on. The small pyramid's card shows greyed from Great city, the great pyramid's once the small pyramid unlocks. — Cost if wrong: a player who demolishes back below 100 can still found a pyramid.
244. A site is stalled (a warning) after 3 days in a row without work (a number in data) while unpaused, unfinished and on a road; a road-less site shows the road warning instead and a paused one none. — Cost if wrong: a stall shows about 2 s late at 1×.
245. The stall's cause is the first that applies: no crew in reach; its guilds short of workers or burning; no gold; gilding or capstone gold; a named material; each with its fix (Show me or View). — Cost if wrong: one cause shows at a time (the sheet's rows still show every material).
246. Gangs and sleds are walkers, so they move under Full, Gentle and Still (on game time); only block fades, dust and shine differ by level. — Cost if wrong: Still is not wholly still at a site.
247. The interface's own transitions (rows opening, dock heights, sheets, the picture cards' slide) are instant under Gentle as under Still, so Gentle and Still differ only on the map; the title backdrop drifts only under Full; View, "Go to it" and the pick's fit cut under Gentle and Still. — Cost if wrong: a Gentle player sees no easing in the chrome.
248. Under Gentle, flames cross-fade between two still shapes at most once a second with no sway or embers, and the word "Burning" shows; upgrade and downgrade marks fade in place; the well's ripple is a ring fading in place; arrows are a still line. — Cost if wrong: fire looks calmer under Gentle.
249. The setting migrates as: reduced motion "on" or ambient "off" → Still; else reduced motion "off" → Full; else follow the device, read live (a change on the device moves the game between Full and Gentle at once). — Cost if wrong: none.
250. Plazas are a drawing tool painted like plots (touch plan, mouse rectangle, one ✓, one Undo step, `paintPlazaTiles`); gardens stay placed one at a time as the code has them (the spec's "gardens" in area painting is corrected); sphinxes are placed singly and never burn, like statues. — Cost if wrong: gardens still cannot be painted.
251. A monument's confirm-bar line runs "+N Monuments when finished · then 100 gold a crew a month · finished: N homes nicer · while building: N homes less pleasant", two lines at most on phones (the full words in the card's details and tooltip); a second of a kind says "One of each kind counts: no prestige". — Cost if wrong: the while-building line may be cut on small phones.
252. The phone height budget gains a "pyramid" placing scene (the great pyramid's ghost, the Ground legend and two chip rows) at 375×667 and 844×390 at 100-150% text, and every site-sheet row gets a words-against-sim test. — Cost if wrong: none.
253. A loaded v4 city gets "New" badges for the Stage 4 cards its milestone unlocks, its history rows marked score v1, and its device settings moved to Motion. — Cost if wrong: a burst of New badges on the first load.
254. Show me for a monument goal picks its card from the city's focus; the quarry goal aims at rocky ground; the guild and brickworks goals aim at the newest site. — Cost if wrong: the ghost may land some way from where the player looks.
255. Memphis lists stone only from City (before that nobody can use it). — Cost if wrong: none.
256. The review's demolish example was wrong: a quarter of the small pyramid's 3,000 founding is 750 gold, not 250; the spec says 750. — Cost if wrong: none.
257. Art details the review left open: a festival procession starts at four figures and grows to 12; a dedication walks from the nearest temple, or from the monument's own road when none is in reach; a sphinx faces the nearest road; an idle supply building shows its tools laid down; the brickworks' kiln smokes like the potter's; mastabas are stepped whitewashed benches. — Cost if wrong: art constants.
258. The finished monument's sheet shows its day, its prestige (or which other of its kind holds it) and the homes it makes nicer; guild sheets say "Crew at work on …" or "Idle: no monument site within 12 road tiles has room for a crew"; the summary's Monuments section shows from City. — Cost if wrong: more words to keep true.
259. The spec's score examples move to v2 ("Best: 412, gold", "score 347 (Silver)"); a `t1` link is compared only with your v1 best on that seed. — Cost if wrong: none.

### Your four added requests (260-279)

260. Stage 4 also holds the picture cards, the music, the palace and the new interface look; "music" leaves the out-of-scope list (recorded music stays out). — Cost if wrong: a bigger stage that ends later.
261. Six picture cards: roads first; homes on plots by a road with a well; farms on the fertile land by the river and Layers → Ground; food and workers; the goals strip and Show me; a glimpse of fires, raiders and monuments. Each is one screenshot with one ring or arrow, a title and one or two sentences. — Cost if wrong: a seventh topic (trade, desirability) waits for the goals.
262. They show once, the first time New city or This week's Nile is tapped on the device, before the city appears, and any time from a new How to play button on the title card and from the top of the ☰ How to play sheet. — Cost if wrong: a player who skips them sees them again only by asking.
263. Next, Back, swipe, arrow keys, tappable dots, Skip on every card, Back, Esc or ✕ to close, "Start building" on the last; a full-screen sheet on phones and a 560 px card on wide screens, a modal with alt text on every picture, game paused behind it; a slide under Full only. — Cost if wrong: none much.
264. The pictures are made by `tools/tutorial.ps1` from dev scenes as WebP, 600×600, at most 60 KB each, in `assets/tutorial/`, with a `cards.json` giving each mark's place read from the scene; the interface draws the ring or arrow live over the picture so it stays sharp and aligned; they are cached offline, remade after any art or look change, and a test checks each picture, mark and offline entry. — Cost if wrong: stale pictures if a visual change skips the step.
265. The opening goals say the rules: "Lay a road: buildings need one", "Place 6 housing plots by the road", "Build a well by the homes' road", "Farm on fertile land, granary, bazaar" (37 characters, one past ruling 52's guide), each with a one-sentence why shown when opened in place. The words call fertile land "the fertile land by the river" and say Ground shows it in green, which is true of the overlay (the terrain itself is loam). — Cost if wrong: slightly longer goal lines.
266. Music is original Web Audio in hijaz (Phrygian dominant) on D at 72 beats a minute: a slow drone on tonic and fifth, a plucked harp or oud-like voice, a ney-like flute about once a minute, a soft frame drum; bars are drawn from motifs by the city's seed and the bar number in the interface, never the sim's random numbers. — Cost if wrong: a taste call; every voice and number is data.
267. A tenser raid mood fades in over four bars during a raid warning and a raid (firmer, quicker drum, lower drone, no flute), and back after; no festival mood in Stage 4. — Cost if wrong: festivals sound like any other month.
268. Music starts on the first tap or key (autoplay rules), plays on the title card and while paused, stops when the page is hidden, and respects the iPhone silent switch. — Cost if wrong: a player who wants silence while paused turns it off.
269. Settings gain Music On / Off and a volume (0-100 in tens, 44 px buttons), separate from effects; music is on by default at 30, effects stay off by default; "Play muted" turns both off and is remembered. — Cost if wrong: a first-time player hears music before choosing (quietly).
270. The music schedules notes a little ahead on a light timer, at most eight voices, no audio worklet or convolution reverb, well under 1% of a mid-range phone's processor; it needs no visual twin since it carries no information. — Cost if wrong: a thinner sound than a reverb would give.
271. The palace: one per city, 3×3, from Town, 300 gold × difficulty, any free dry ground, needs a road (P10 amber rule applies), no workers or upkeep, last card in Services; while one stands its card selects it instead of starting a tool. — Cost if wrong: one more card in Services.
272. Five styles: courtyard house (as built), columned hall (Market town, 600), pylons and banners (City, 1,500), gilded with statues and obelisks (Great city, 4,000), lapis and gold (Capital, 10,000); works of 30, 60, 90 and 120 game days with scaffolding; 16,100 in all. — Cost if wrong: prices and days are data.
273. "Enlarge the palace" on its sheet pays the full price at once, never below 0, one style at a time, needs a road, is not undoable, and keeps the old style until the works end, then a caption (and a sparkle under Full). — Cost if wrong: no refund for an enlargement regretted.
274. The palace gives desirability by style (4, 3, 2, 1 up to 14, 12, 10, 8, 6, 4) and a Palace mood row of +1 per style above the first (at most +4), both only with a road; no prestige and no score part of its own (it counts through Culture and mood). — Cost if wrong: the palace's grandeur is invisible in the score except through homes.
275. The palace never burns, raiders never target it, it is not wealth; demolishing asks, refunds 75 gold (a quarter of 300) and loses the enlargements. The sample city and title backdrop show one in its third style. A first, an achievement ("Lapis and gold") and a tip come with it. — Cost if wrong: none.
276. The interface look: papyrus tones with a faint CSS fibre; a frieze of lapis, gold, terracotta and turquoise at most 4 px inside existing heights on the top bar and sheet heads; cartouche headings in the system serif stack (Palatino Linotype, Palatino, Book Antiqua, Georgia); gold on lapis (about 8:1) for each sheet's one main action only; at most one decorative glyph per sheet head, hidden from screen readers; category tints unchanged; CSS and inline SVG only, nothing downloaded, nothing moving. — Cost if wrong: a taste call, CSS-only to change.
277. The restyle ships with a contrast check of every text style and before-and-after shots at four sizes and 150% text, and the picture cards are remade after it. — Cost if wrong: none.
278. Spec sections: the picture cards in 4.1, music in 5.5, the palace as a new 4.20, the look as a new 6.9; section 2 and 3 updated (no more "no music"). — Cost if wrong: none.
279. Track owners for the four, so the review's section 10 plan holds at five agents: the palace's sim and `enlargePalace` to A, its five styles' art to B, its sheet to C; the picture cards' interface and the reworded goals to D; the music and the interface look to E; the pictures themselves to F, made last on the final art and look. — Cost if wrong: Track E grows (music plus look plus Motion), the likeliest to run long.

### Your playtest note on red warnings (280-281)

280. A problem marker is pinned to its own building: the badge stands on a short stem (at least 10 CSS px, ink with a white halo) rising from a dot on the building's own roof, the building's footprint gets a 2 px outline and faint wash in the marker's colour, and badges never overlap (the one further back gets a longer stem; more than three in one place merge into a count badge with a ring on each footprint). Nothing pulses, so it reads the same under every Motion level. Track B draws it (`drawProblemMarkers`), Track C owns the taps and View's outline. — Cost if wrong: a busier map where many buildings have problems (the rings add up).
281. Tapping a marker (a 44 px area round the badge and its stem) selects its building and opens its sheet, ahead of the building under the badge; a count badge zooms in one step on its buildings; while a tool is active markers only show. View from the alert list, a minimap pin or the banner outlines the building for 2.5 s, then fades over 0.5 s (no fade under Gentle and Still), and a selected building keeps its ring while its sheet is open. — Cost if wrong: a tap meant for the building behind a badge selects the badge's building instead.


## Part 10: Stage 4, the controller's rulings while planning (12 Oct 2026)

Made while the plan was written (`plans/2026-10-12-thebes-stage-4-monuments.md`, section "Controller rulings on the track writers' contract notes", which holds the detail).

282. Eight tracks instead of five: A monuments sim (and the palace sim), B art, C interface, D score and gamification, E motion and the moving city, G the picture cards and the music, H the interface look, then F balance; at most five agents at once; merge order A, B, C, D, E, G, H, then F. Supersedes the split in 279. — Cost if wrong: two more merges; H restyles shared CSS the other tracks' sections sit on.
283. The architect's 25 contract notes stand: score v2 is switched over in Track 0; the one new world field is `prestigeUnlocks`; the large mastaba's five courses are equal (3,840 bricks and 960 stone); the 16-tile nearest fit applies to footprints of area 9 or more (the 3×2 small mastaba keeps 10); a monument's missing crew or supply is a placing warning, so the ghost prefers a spot near a guild and a quarry; the reworded opening goals are Track D's; Track H works in CSS only. — Cost if wrong: small retunes.
284. Older score records keep their own version: a v1 best stays v1 with its v1 medal and the "older scoring" label, and is never compared with v2 bests (Track 0's review found it relabelled). — Cost if wrong: none.
285. A finished monument needs no road and raises no "no road" warning; enlarging the palace removes its placing from Undo, so its gold cannot be lost by undoing. — Cost if wrong: a palace placed by mistake and enlarged can only be demolished (75 back).
286. The Motion setting follows a change of the device's preference at once (not only at load). — Cost if wrong: none.
287. A turned mastaba is grabbed by its turned footprint, a monument's ghost also by its body above the footprint, and Show me for a monument zooms out to fit it as picking its card does. — Cost if wrong: none.
288. Monument events name the monument's type as `kind`; a course's prestige in its caption is what the city gained (0 for a second of a kind). — Cost if wrong: none.
289. An idle builders' guild, quarry or brickworks is not "short of workers": it employs nobody by design, and its sheet says why it is idle. — Cost if wrong: none.
290. A site's stockpile room is split by what its next work needs (a shared limit filled a mastaba's pile with stone while its brick courses waited, and nothing was laid). — Cost if wrong: a site holds a little less of a material it needs later.
291. Guilds take the nearest open site with room, nearest guild-and-site pairs first (ties to the older guild, then the older site). — Cost if wrong: you cannot pick which guild works where (pausing a site moves crews).
292. Festival processions are the last thing to drop when a frame runs slow, after all other ambient life, so a device that asks for less motion still sees its festival. — Cost if wrong: a little frame time on old phones during a festival (at most 12 figures, on screen only).
293. The interface's own transitions follow the Motion setting, not the device: Motion Full keeps them on a device that asks for less motion. — Cost if wrong: none.
294. Cartouches frame only a sheet's title and the title card, with the end bar joined to the oval; section titles get a quieter serif heading with a thin rule. — Cost if wrong: a taste call, CSS only.
295. Monument work costs 6.5 gold a unit (130 gold a crew-month), not 5 (100): with four crews the capital run then spends 68.4% of its taxes and holds 58,341 gold at year 6 (at 5 a unit, 64,909, over the 60,000 ceiling). Supersedes 190's "100 gold a crew". — Cost if wrong: monuments a fifth dearer than the review proposed; the value is data.
296. The capital run's monument programme builds two brickworks. — Cost if wrong: none.
297. A second request for the picture cards while they are open joins them, and the game pauses behind them. — Cost if wrong: none.

## Part 11: Stage 4, while building (12 Oct 2026)

298. A rotate-view option is not in Stage 4: it is a material build (every building, figure, shadow and facade is drawn from one viewing direction with light from one side, and the baked terrain, roads, walls, depth sort, markers, input and camera all assume one orientation, so four views mean redrawing or mirroring all the art and re-baking per view). Recorded as a follow-up. — Cost if wrong: none now.
299. A monument's ground words follow the sim, which refuses only the fields: the chip says "Dry ground, not the fields", the card "Not on the fields" and the tooltip "on dry ground, not the fields" (not "Desert", false on rocky, meadow or bank ground). — Cost if wrong: none.
300. From the phone play-test: picking a monument keeps its whole footprint and silhouette on screen, the supply chip names every missing material, and the build tray shows a scroll hint on phones. No gold chip while the founding is affordable, and founding a site that cannot work yet, are by design (its chips say so). The one-tile drag, auto-fit landing without a road and the More ▾ overlap go to the follow-ups. — Cost if wrong: small phone friction until a later pass.
301. The capital run checks unemployment as a 24-month mean of at most 15% with no month end over 20% (two months at 17.4%, when every quarry idles between monuments, is real play), rather than tuning the work gold to a knife edge. — Cost if wrong: a brief real labour problem could pass the test.
302. All remaining reviews run on Sonnet, and at most three tracks at once (your call, to save usage). — Cost if wrong: a cheaper reviewer can miss what a stronger one would catch, and the run takes longer.
303. The title backdrop shows its showcase (the finished obelisk, the colossus going up and the palace) at every size, and under Full holds on it about 8 s before it drifts. — Cost if wrong: a taste call.
304. The small obelisk's tip stays pale; a gilded tip is the large obelisk's paid extra. — Cost if wrong: none.
305. The picture card's "broken image" on an upright phone was a capture-timing artefact (the shot was taken before the picture loaded; the scene now waits for it), not a fault in the game. — Cost if wrong: a real loading fault would hide, but the phone play-test loaded all six pictures.
306. The scroll hint (an edge fade with a chevron over the tray's right end, gone at the end, no height of its own, still) shows on every build tray that scrolls on a phone, not only Monuments. — Cost if wrong: a taste call, one CSS rule.
307. A mastaba's supply chip warns about the stone for its top course even while bricks for the first courses are near ("No stone near", amber), so a player is not surprised by a stall later. — Cost if wrong: an amber chip on a spot where work can start.
308. The live-draw budget test hands each frame on once drawn, as the page does; a canvas that is never shown made one call pay to play back 30 frames (93 ms) and the mean read 3 ms. The 1 ms limit is unchanged (0.85-0.96 ms measured). — Cost if wrong: the budget's margin is thin on a busy laptop; if it flakes, cache the finished courses (spec 5.7).

## Part 12: Stage 4.5 (13 Oct 2026)

From the plan `plans/2026-10-13-thebes-stage-4-5-polish-and-pressure.md` (rulings 309 to 321, as adopted; 316 as you amended it with your picks on the economy page) and the calls made while building (322 to 330).

### The plan's rulings, as adopted (309-321)

309. Roads may cross walls: each wall or breach tile a road crosses becomes a gate at the gate price (20 gold on Normal), drawn as a small gatehouse, and the bar names the gates. A Gate card starts that mode. — Cost if wrong: walls are easier to pierce by accident (the bar names the gates).
310. Under Gentle, fires show flames changing shape at most once a second in place, plus a smoke column fading in place; scorch marks show under every level. — Cost if wrong: a motion-sensitive player who wants nothing moving chooses Still.
311. 1x is 30 seconds a month (it was 20); game-day timings stretch with it, real-time interface timings do not. — Cost if wrong: late-game monuments feel slower at 1x (3x is still there).
312. Clay is ground of its own along the river banks (40 to 90 tiles a map); a clay pit must stand on it; old maps gain clay on their free bank tiles and keep any pit already built. — Cost if wrong: fewer places for a clay pit.
313. New cities take one of six river layouts from the seed; tests, dev flags and the sample and stress cities stay classic (unless `?variant=` names one); old saves keep their maps. — Cost if wrong: some seeds are harder (a river down the middle splits the town).
314. Bridges: a road may cross water where the crossing is at most 4 tiles of water in a straight line, at 25 gold a tile; raiders use bridges like roads. — Cost if wrong: a wide river cannot be crossed (fords or wider bridges could come later).
315. World version 6 holds the map layout, clay on old maps, each home's health and crime risk and illness, and the new tallies. — Cost if wrong: none.
316. (As you amended it with your picks.) Debt is fixed by teaching and warning first: every card and the confirm bar say "Costs N a month" and what the monthly balance would become; the gold chip shows the month's forecast on phones too and turns amber only when the treasury would run out within 6 months; a one-time warning tip looks 3 months ahead and names the building that costs the most; a Gold picture card and an "End a month in profit" goal teach it. No softer first year, and the late-game treasury pile is left as it is. — Cost if wrong: players who never read still fall into debt (the floor at -500 stays).
317. Raids grow 10% a year up to 1.5 times, are capped at 18 raiders, come as two bands from two entries 35% of the time from the 4th raid, and also strike granaries and homes. — Cost if wrong: late raids hit hard; towers and walls are the levers.
318. Disease builds in homes with no well, crowded, or in poor surroundings; a physician covers it; illness costs residents gradually and spreads unless covered. — Cost if wrong: one more building type to place in every district.
319. Crime builds in poor homes when mood is low and jobs are short; a police post covers it; thefts skim gold or goods. — Cost if wrong: tuning; it mostly punishes unhappy cities.
320. Disease and crime follow the fire pattern (risk, cover, alerts, overlay, mood rows, goals) and are off on Peaceful. — Cost if wrong: Peaceful players never meet them.
321. No score change in Stage 4.5. — Cost if wrong: Safety ignores disease and crime until a later score version.

### While building (322-330)

322. A monument's block unit goes from 5 to 3 so that, with the slower month, a new block still lands every 5 seconds or less at 1x (drawing only). — Cost if wrong: about 1.7 times as many block draws per course.
323. Walkers, sleds and soldiers stay paced by game days, so with the slower month they move about a third slower on screen. — Cost if wrong: streets look calmer and slower; a drawing-only speed-up could follow later.
324. Classic maps keep their own rock count (52 to 172), outside the 90 to 150 band, so old seeds and fixtures do not move; the band binds the five new layouts. — Cost if wrong: some classic maps are rock-poor, as they are today.
325. The Town unemployment penalty to mood phases in over 6 months instead of arriving whole. — Cost if wrong: it softens a real consequence of building homes with no jobs.
326. The selling daily goal is dropped (it waited 8 to 10 minutes for the first caravan), and the daily goals' time wording is corrected to "a few minutes". — Cost if wrong: none.
327. New villagers are drawn walking from the trade entry's road to their door on arrival day (1 to 3 per arrival, at most 12 at once, none under Still), and leavers walk out at month end; the simulation does not see them. — Cost if wrong: none to the simulation.
328. A raiding band strikes wealth first, then on its 2nd strike a granary (food stolen) and on its 3rd a home (a quarter of its people flee), falling back to the usual targets when there is none; going strictly "after the wealth" would almost never reach them with 3 strikes. — Cost if wrong: raids hurt food and people sooner than temples.
329. The physician and the police post take 1 worker each (the plan said 4): with 4, the village run went to about 73% of taxes spent. — Cost if wrong: they are cheap to staff, so less is asked of the city for the same cover.
330. Disease builds 0.15 risk points a day at base (at 0.3 the capital run fell one script step short); crime builds 0.05 a day in low-tier homes, 0.3 more while mood is below 45 and 0.2 more while more than a tenth of the workforce has no job, with a 2% a day theft draw at the threshold. — Cost if wrong: tuning.

## Part 13: Stage 4.6 (13 Oct 2026)

From the plan `plans/2026-10-13-thebes-stage-4-6-land-court-armies.md` (rulings 331 to 344, as adopted, with later retunes noted), the contract note `notes/2026-10-13-stage-4-6-contract.md` (345 to 349), each track's own calls (Map 350-359, River 360-369, Court 370-379, Armies 380-389, Wonders 390-399, UX 400-409), and the controller's calls at integration, balance and the final review (410 on). Every ruling keeps the number it was first given.

**Number clashes.** In its fix round the Court track reused 380 to 385, which are the Armies track's numbers (the Armies track's came first, and its own sub-rulings already use the letter a), so the Court's later ones carry a c: 380c to 385c. The Court's code comments still cite them as plain 380 to 385, so read each by the file it is in. The Map track's fix round reused 352 for a different decision from the one its first report numbered 352; the later one is 352a here. The same happened to Map 353-355 (now 353a-355a), Court 375 and 376 (375a, 376a), Armies 383 and 386 (383a, 386a, 386b) and Wonders 396 (396a). The text of the rulings that the repo and the commit messages do not hold was recovered from the track reports; numbers that no report used are marked "number not used".

### The plan's rulings (331-344)

331. Clay draws as its own ground at every Ground setting; a clay pit fits where at least 2 of its 4 tiles are clay (was 4 of 4); clay patches are 2-3 tiles wide, so every map has at least 8 places a pit fits; the card, the guidance row and every refusal say where clay is, with Show me to the nearest fit, from one shared helper for every terrain-bound building. — Cost if wrong: clay pits are easier to place (pottery comes a little sooner).
332. Each river variant draws seeded shape choices (meander strength and length, 0-2 side channels or oxbows, 2-5 rock outcrops, dune fields, palm groves, 0-2 dry wadis) within ruling 313's invariants, tested over 50 seeds per size and layout; classic at 64 draws exactly as before. — Cost if wrong: some seeds look busier.
333. New city offers Small 48, Normal 64 and Large 80; rock, clay, raider entries and herds scale with area; the weekly seed stays Normal; share links add `&size=` for Small and Large, and records and stamps carry the size while Normal keeps every older link and key. — Cost if wrong: Large may run slower on an old phone (Track 0 measured it first: see 410).
334. The Nile floods every year in months 7-9 at a seeded level (Low 15%, Fair 35%, Good 35%, High 15%) that scales floodplain harvests 0.6, 0.9, 1.1 and 1.25; a Nilometer forecasts it 3 months ahead; no damage and no deaths. — Cost if wrong: a Low year pinches food (granaries and trade are the levers); see 435.
335. Herds of gazelle and ostrich (4-8 animals, home range 6) are sim entities that a hunting lodge thins and that regrow; a fishing wharf fishes the river (20 a month, 30 in flood months); game and fish are foods; birds, hippos, crocodiles and jumping fish are render-only, at most 40 drawn; a crocodile scare pauses a riverside building for a day, never on Peaceful. The lodge's crew was cut in 434 and its take reworked in 460. — Cost if wrong: one more food chain to balance.
336. Favour runs 0-100, starts at 50 and drifts 1 a month toward 50; at 70 or more a gift every 6 months and tribute 20% cheaper, at 30 or less raids one size step bigger and tribute 20% dearer; shown with an icon and a number, never in the top bar. — Cost if wrong: one more meter to watch.
337. Requests (goods, gold, food or soldiers) start in year 2 and come every 8-14 months, with 6-12 month deadlines; met gives favour +10 to +15 and a reward, missed or refused -10 to -20; the letter states the amount, deadline, reward and cost of refusing from the sim. — Cost if wrong: a busy player may miss one (the deadline sits in the alert row).
338. An event card every 12-18 months with two choices that each state their exact effect, built with eight cards (sickness, festival, caravan, deserters, temple gift, lost herd, craftsmen's dispute, flood omen); threat cards are off on Peaceful. — Cost if wrong: cards repeat in long games (more can come in Stage 5).
339. Letters arrive in the alert row (below a raid and uncovered fire, above debt), open as one sheet and queue; past letters are in Recent; the opening chapter gets one guided easy request after the trading goal. — Cost if wrong: none.
340. Three unit types (soldiers at barracks, archers at an archery range, chariots at stables) with a typed matchup table the combat reads; units guard on their own. The archery range's upkeep 8 and 4 workers and the archers' pay of 6 were set in balance (431, 432). — Cost if wrong: less control than a war game (by design).
341. Enemy archers from the 3rd raid, river boats from the 5th on maps whose river reaches an edge, enemy chariots from the 6th; a seeded mix by raid and difficulty; the warning and the raid sheet name the mix and the counters from the sim. — Cost if wrong: late raids need a planned defence.
342. Three new monument kinds (great sphinx, sun temple, step pyramid) in the 4.16 table pattern. The sphinx's id is `great_sphinx` (345). — Cost if wrong: more to build in a long game (that is the point).
343. Every monument offers Whitewashed, Painted or Gilded (+10% gold, +1 desirability); old monuments stay classic. — Cost if wrong: none.
344. World version 7 holds every new field; no score change in Stage 4.6 (favour, food and the soldiers' types are not scored yet; see 414). — Cost if wrong: the score ignores the court until a later score version.

### Track 0: the contract (345-349)

345. The new monuments' ids are `great_sphinx` ("Great sphinx"), `sun_temple` and `step_pyramid`: `sphinx` is already the 1x1 statue on the Homes card. — Cost if wrong: the card says "Great sphinx" where the plan said "Sphinx"; a rename is words only.
346. The flood stays in game months 7-9 and the season calendar moves to match: Akhet (the flood) is months 7-10, Peret 11-2, Shemu 3-6; remarks about the river rising only show in a year whose flood is Fair or better. The design spec says so too (it had Akhet on months 1-4). — Cost if wrong: remarks shift by half a year; nothing in the sim changes.
347. World version 7 holds one record per track (`flood`, `floodplain`, `wildlife`, `court`, `army`) plus `mapSize` and `mapParams`, each starting from its track's own function so new and migrated cities agree; `world.soldiers` keeps its name for every unit kind; every raid record carries `mix`, every monument `style`, and `mapSize` always equals `size`. — Cost if wrong: a field found after Stage 4.6 is on main needs a version 8.
348. Every terrain-bound building follows one helper, `src/sim/fit.js`, read from its `BUILDINGS` row (`terrain`, `terrainMin`, `water`); the Map track owns it and the River track only declares `water`. — Cost if wrong: a new kind of ground rule needs a row field in Map's file.
349. The court and the army meet only through two interfaces: favour's raid size and tribute come from `src/sim/court.js` and are called from `raids.js`, which draws the mix from the favour-adjusted size (the first raid ignores favour); soldiers requests use `src/sim/armies.js` (`unitsAtHome`, `unitsAway`, `sendUnits`, `armyDay`), and units away are unpaid and do not fight. — Cost if wrong: favour cannot tilt a raid toward one enemy kind (by design, it only grows or shrinks it).

### Track Map (350-359)

350. (Josh's ask mid-run.) A road that crosses water is called out as a bridge: the road card and the road bar say it, with the sim's price per tile; the first time a drawn road meets water a tip says it, with Show me to the nearest straight crossing; a road too wide or crooked to bridge offers the same Show me; How to play lists it. — Cost if wrong: one more tip.
351. Classic at Normal draws no shape choices, so its clay stays 1-wide. — Cost if wrong: one map in six keeps thin clay.
352. Side channels and oxbows are pools of their own, at least 4 tiles from any other water. — Cost if wrong: an oxbow can never join the river.
352a. (Map fix round 1; clash with 352.) A building bound to its ground (terrain or water) offers Show me for every refusal that is about the spot (taken, water, off the map), not only for the ones that quote the rule, and its confirm bar keeps the Show me row's room from the start so the bar does not change height. — Cost if wrong: an empty row of space on the bar of a terrain building.
353. Raider entries are 2, 2 and 3 (a third on Large). — Cost if wrong: none.
354. The size pick is not saved, so each session starts at Normal. — Cost if wrong: Large players re-pick each time.
355. Pick and Show me search the whole map for terrain-bound buildings. — Cost if wrong: a pit can land far off.
356. Month-end coverage is computed from the providers side (tested equal; see 410). — Cost if wrong: none.
357. Records and share links add the size only when it is not Normal. — Cost if wrong: none.
358-359. Number not used.
353a. (Map fix round 1; clash with 353.) The Ground room (the dimmed set) follows `terrainMin` through `fitOf`, so it cannot drift from the sim. — Cost if wrong: the dimmed set drifts from the sim again.
354a. (Map fix round 1; clash with 354.) The five non-classic layouts at 64 changed their maps in Stage 4.6, so an old `east`, `middle`, `wide-bends`, `island` or `oasis` share link or stamp redraws differently (see 415). — Cost if wrong: a stale stamp or share link, which is small since 4.5 had only just shipped.
355a. (Map fix round 1; clash with 355.) `cameraControl.centreTile()` was added in a shared file. — Cost if wrong: a merge conflict, which is trivial.

### Track River (360-369)

360. The floodplain is the fertile land within 3 tiles of water; a farm counts as on it when at least half its footprint is; a floodplain farm's harvest follows the last flood that rose and holds until the next one; farms off the floodplain are unaffected. — Cost if wrong: a farm half on the edge gets the flood's gain or loss.
361. The flood, the herds and the crocodile scare start at Town, and the Nilometer, hunting lodge and fishing wharf unlock at Town, not Village as the plan said (UX rule 5: nothing new in the first minutes). — Cost if wrong: a Village player waits for the new foods.
362. The water on screen spreads over the floodplain in month 7, stands through month 9 and drains in month 10, by level (1, 2, 3 and 3 tiles from the river); a still blue sheen under Gentle and Still, a slow shimmer under Full. — Cost if wrong: a taste call; render only.
363. Game and fish are foods: granaries store them, and any two of grain, figs, game and fish meet a home's "two foods" need (the housing words name the second food that is easiest to bring). — Cost if wrong: a home can meet its second-food need with fish alone.
364. Herds step a tile every 3 days within their home range, move off when a building comes within 3 tiles, and start at 6 on a Normal map (area scales it, at least 3, at most 12); a lodge's hunters take one animal at a time from the nearest herd within 12 tiles, at most 6 a month from a herd and 24 a month in all; a new herd may wander in from an edge once a year. Sustainable hunting replaced the take rate in 460. — Cost if wrong: herds are hunted out fast (437 found they were).
365. The hunting lodge and fishing wharf burn like a booth or bazaar (fire risk 0.3); the Nilometer is stone and takes none. — Cost if wrong: none.
366. The crocodile scare: a building within 2 tiles of a crocodile spot (5 spots on a Normal map) pauses for 1 day, at most once a month, with a 50% chance a month that one happens at all, and a caption; it is off on Peaceful and before Town, and never hurts anyone. — Cost if wrong: a riverside workplace loses a day now and then.
367. Wildlife on screen: at most 40 animals drawn at once, Gentle at half the drift and Still none; hunters walk out from a working lodge and a fishing boat works off a working wharf. Hunters walk straight across water (render only; see the follow-ups). — Cost if wrong: a hunter's path can look wrong.
368. The priests' forecast: the Court's Flood omen card buys the level of the next flood without a Nilometer, once; a working Nilometer reads it 3 months ahead (month 4). — Cost if wrong: none.
369. (Fix round 1.) The Nilometer row says "Next flood" with a level only before the rise ("The flood now", "Last flood" and "Known from month 4" otherwise); the summary's food forecast counts food farms (grain, figs) only; a staffed lodge that has had its herds' share or its month's most reads as resting with the sim's reason; the house remark about fields under water is only heard in a Fair or better year. — Cost if wrong: none.

### Track Court (370-379)

370. Low favour grows a raid by one step: a quarter of its size, at least one raider more, never past the 18-raider cap; the first raid ignores favour. — Cost if wrong: late raids at low favour are harder.
371. The court opens once the city is a Market town and has finished the trading goal (a City opens it anyway); the guided letter comes 10 days later, a small request (40% of a household or raw good in store, else of a food, else 40 to 100 gold) with a 12 month deadline; it joins the first-time goals. — Cost if wrong: a city that never opens a route meets the court at City.
372. The festival card's Hold choice is the temple's own festival (its price, mood and length), so it counts as the year's festival. — Cost if wrong: none.
373. A court alert is raised while a letter is unread, and again within 2 months of a deadline; the banner's View opens the letter; alert words are short ("Court: 145 pottery in 6 months") so the deadline survives at 150% text. — Cost if wrong: a terse alert row.
374. A city short of food is never asked for it: a food request never takes the last of the stock. — Cost if wrong: none.
375. Soldiers are lent for 6 months (a request needs at least 2 units and never takes all). — Cost if wrong: late-game asks may be small.
375a. (Fix round 2; clash with 375.) The gift clock starts the first time favour reaches 70 and keeps running; the gift comes at the first month's end on or after its day with favour at 70 or more, and the court sheet says exactly that. — Cost if wrong: a gift can be a few days late.
376. The Lost herd card needs both its choices to be possible. — Cost if wrong: it comes rarely.
376a. (Fix round 2; clash with 376.) A choice's favour line is the change that will really happen at either end of 0-100 ("+5" at 95, not "+11"). — Cost if wrong: none.
377. Card numbers (fees, favour amounts, caravan discount) live in `CARD_NUMBERS`. — Cost if wrong: retune only.
378. A gift is gold, or a household good if there is room. — Cost if wrong: none.
379. The words say "the court", never "Pharaoh", because the spec and `text.test.js` forbid the name. — Cost if wrong: none.
380c. (Fix round 1; clash with Armies 380.) The court's first-letter goal is an event goal, not an opening-chain goal, met when the letter is answered (sent, refused or missed), or when a card was answered first. — Cost if wrong: the guide's chain does not wait for the court.
381c. (Fix round 1; clash with 381.) An open letter is pinned: the daily rebuild keeps showing it until it is answered, put off or closed, so a new letter arriving mid-read never swaps the buttons under a finger. — Cost if wrong: a newer letter waits a little.
382c. (Fix round 1; clash with 382.) A quarantine or strike takes its pause back when the player pauses or resumes that building themselves, so it never undoes a pause the player set later. — Cost if wrong: none (the same idea as 423 for the scare).
383c. (Fix round 1; clash with 383.) A gold request never asks for more than half the treasury (reserve 0.5), and none is made when that is under 100. — Cost if wrong: a rich city is asked relatively little.
384c. (Fix round 1; clash with 384.) The low-favour rule's words are built from the favour numbers (the percentage and the one-raider minimum), tested against the sim with the step changed. — Cost if wrong: none.
385c. (Fix round 1; clash with 385.) A request's choices come before its figures on the letter sheet, so Send shows without scrolling at the largest text. — Cost if wrong: none.

### Track Armies (380-389)

380. Matchups are a typed table in `src/data/armies.js` (archers 2x against foot on or beside a wall or tower and 0.5x in melee; chariots 2x against archers and foot in the open and 0.5x within 3 tiles of a wall; soldiers 1.5x holding a gate or a breach); where more than one situation applies the multipliers multiply; an archer takes the nearest wall or tower post within its patrol. — Cost if wrong: an unusual stacking (an archer on a wall in melee hits at 2 x 0.5).
381. Units have hit points (archer 8, chariot 16, the soldier's as in Stage 3) and come back from the capital at full; units away at the capital count toward their building's cap on the sheet and in training, and the barracks counts its soldiers away too. — Cost if wrong: none.
382. A raid's mix is seeded: each kind but foot takes a share of the raid (archers 15% plus 3% a raid up to 35%, chariots 12% plus 3% a raid up to 25%, boats 25%), times the difficulty's factor (0.75, 1 or 1.25) and a jitter of 30%; foot keep at least 40%; a kind that may come brings at least 1 from a raid of 4; the first raid is always on foot. — Cost if wrong: a raid can bring several kinds at once.
383. A band with no wall-breaker left (foot and boat raiders break walls; archers and chariots do not) is turned by a wall, and chariots cannot cross rocky ground; a chariot's pace is its own, foot pace beside slower raiders. — Cost if wrong: a wall can turn a whole band.
383a. (Armies fix round 1; clash with 383.) The counters state each kind's pace from `ENEMY_TYPES`. — Cost if wrong: a two-sided raid could, rarely, give one band chariots alone, which ride faster than the line says.
384. River raiders by boat from the 5th raid, on a river that reaches an edge and only on a raid from one side: they land on a bank within 4 tiles of a building and fight as foot. — Cost if wrong: a boat raid on a quiet bank.
384a. (Fix round 2.) `sendUnits` takes every unit `unitsAtHome` counts, including units walking back after a raid; a raid under way still refuses. — Cost if wrong: none.
385. Chariots' horses eat 3 grain a chariot a month; a month without it halves the chariots' damage until they are fed. — Cost if wrong: a stables is a grain bill as well as a pay bill.
385a. (Fix round 2.) Horses eat from the buildings whose stores hold grain (the granary), and the words and the alert name them from the data, not storehouses. — Cost if wrong: none.
386. Pay: every unit at home is paid by its kind (soldier at the barracks' rate, archer 6, chariot 10) and units away are unpaid; the score's tower line counts army units (but see 414). — Cost if wrong: chariots are dear to keep.
386a. (Armies fix round 1; clash with 386.) The score's defence term counts every unit kind as a soldier does (a third of a tower each); a city of soldiers only scores the same as before.. — Cost if wrong: archers and chariots lift the defence score a little.
386b. (Armies fix round 2.) Amends 344 and 414 to add "except that the defence term counts every unit kind". — Cost if wrong: archers and chariots lift the score a little.
387. The archery range and the stables unlock with Market town, not Town: raids and walls start there, and a locked Defence tab would show from the first minutes. — Cost if wrong: archers arrive a little later than the plan.
388. A mixed raid's warning says how many come ("14 raiders from the east are after your storehouses") and keeps its banner to one line; the alert list and the raid sheet's first line name the kinds, above the counters. — Cost if wrong: none.
388a. (Fix round 2.) The tribute sheet names a mixed raid's kinds once, in its arrival line under the cost; the counters stay at the end. — Cost if wrong: none.
389. The range and the stables carry their own desirability rows in the data file (range -4, -2; stables -6, -4, -2). — Cost if wrong: a street with stables is less pleasant.
389a. (Fix round 2.) The raid under way names the units' reach as one range ("within 8 to 12 tiles"), never longer than the soldiers' line, so View stays beside the side panel at 1280x800. — Cost if wrong: none.

### Track Wonders (390-399)

390. The great sphinx (3x2) sits between the large obelisk and the colossus: stone only, 720 of it in six courses, 500 gold to found, 18 months with its two crews, prestige 20, a desirability profile like the colossus's, unlocked at Great city. — Cost if wrong: a number of the table; the sphinx may feel cheap.
391. The sun temple (3x3) sits between the large mastaba and the small pyramid: 3,000 bricks for the three core courses and 3,000 stone for the three facing courses, 2,500 to found, 75 months with its four crews, the widest desirability reach (6 tiles, all high), unlocked at Capital. — Cost if wrong: a number of the table.
392. The step pyramid (4x4) sits between the small and the great pyramid: ten courses of stone with the ramp's bricks (9,180 and 1,620), 4,500 to found, 135 months with four crews, no capstone; it comes with Capital and not by prestige (a prestige gate would put it out of reach of the monument that earns it). — Cost if wrong: a number of the table.
393. A monument with no word about style (a dev scene, a test, a monument from before Stage 4.6) is `'classic'` and is drawn exactly as before, checked pixel for pixel; a style the data does not know falls back to it. — Cost if wrong: none.
394. Gilded costs 10% more of all the gold a monument takes (founding, work gold, gilding and the capstone) and adds +1 desirability once finished (this states 343's "+10% gold" precisely). — Cost if wrong: a gilded site draws a little more gold from the treasury.
395. The style picker is a row of its own in the placing bar: three 44 px pressed buttons (the one in force teal with a tick) and one line saying what it costs and does from the sim; the price, the crew's monthly gold, the homes made nicer and the ghost follow the pick; the next monument starts on the last style chosen. — Cost if wrong: one more row on the confirm bar.
396. "Seven wonders" still asks for 7 kinds, now of ten, and its words say so (see 411). — Cost if wrong: an easier achievement.
396a. (Wonders fix round 1; clash with 396.) The style picker's height is accepted at 375x667 and 150% text (the bar is 54.7% of the screen, within the test's 0.58). The fix, if wanted, is to hide the picker's line there and keep it in the aria-label. — Cost if wrong: the map drops to about 45% on the smallest phones at large text.
397. (Wonders fix round 1.) The step pyramid opens at Capital with no prestige gate (as 392 says); the new kinds add prestige (40, 130 and 210), which lifts the Monuments part of the score, the prestige mood, Renowned and pyramid unlocking, against 344's "no score change". The fix, if wanted, is `step_pyramid: null` in the v6-to-v7 migration's `prestigeUnlocks`, which Track 0 owns. — Cost if wrong: earlier access and a score drift.
398-399. Number not used.

### Track UX (400-409)

400. (Josh's ask.) Enter lays a pending placement (a ghost, a drawn road, wall, plot or plaza) whatever has focus, and Esc takes it back; the bar's own buttons, the toast's Undo and open sheets keep their own Enter; the tick shows an Enter hint where there is a keyboard. — Cost if wrong: a focused card no longer takes Enter while a placement waits.
401. (Josh's ask.) The version follows the stages ("Version 4.6"), one constant in `src/data/ui.js`, shown small on the title card with the short build stamp. — Cost if wrong: one number to keep up each release.
402. A "What's new" button on the title card opens one panel of releases, newest first, each split into New and Fixed in plain words; a test fails when the newest entry differs from the version constant. — Cost if wrong: one more file to keep up each release.
403. (Josh's ask.) What's new lists every past build, not just the latest: version, date, build stamp and notes for 1.0, 1.1, 2.0, 3.0, 3.1, 3.2, 4.0, 4.5 and 4.6. Playable old builds (old copies hosted on the site) are not built: they cannot load newer saves, and every copy adds to the site and its offline cache. — Cost if wrong: Josh wanted to play old versions and asks again.
404. The wide top bar's Pause and the three speeds are one row of 44 px steps, each with a picture and a name that says what pressing it does; the pressed one is filled and alone carries its word (Paused or the speed). — Cost if wrong: the row is a little wider.
405. The cartouche heading's tie (a bar on one end of a loop) is reshaped so it no longer reads as a glitch. — Cost if wrong: a taste call (see 409).
406. Enemy chariots fly a banner on a pole behind the car, so they read apart from your own at phone zoom. — Cost if wrong: a taste call.
407. The legibility review's five findings: F1 the overlay legend keeps its words under an alert on a wide screen; F2 the bottom category row scrolls at 125% and 150% text; F3 the confirm bar's words get the full row on a wide screen; F4 the cartouche tie (405); F5 the score chip clears the frieze. — Cost if wrong: none.
408. (Fix round 1.) The banner is an addition: the raider keeps his head and spear and the car its shield. — Cost if wrong: none.
409. (Fix round 1.) The cartouche tie straddles the loop's end so it no longer reads as a text cursor; the phone's confirm bar drops the Enter hint so the bar keeps one height. — Cost if wrong: none.

### Controller rulings: integration and the final review (410-425)

410. The Map track adds a month-end road-reach cache: each working provider's road reach is merged once a month into one set of road tiles per need, and a home is covered when a road tile beside it is in the set (the `coveredBy` rule exactly, from the providers' side). Measured on the stress city: month end 1,269 to 100 ms at Large and 455 to 44 ms at Normal. — Cost if wrong: a little Map track time.
411. "Seven wonders" stays 7 kinds of the 10 (the name still fits and it is easier). — Cost if wrong: an easier achievement.
412. Wave 2 (River, Wonders, UX) cuts from `stage-4-6` after wave 1 is integrated, not from the contract commit: River needs Map's fit helper and seasons, and UX edits HUD files others touch. — Cost if wrong: none.
413. Court letters are not critical-rank for sound and announcements: no chime and a polite live region; the rank stays below a raid or uncovered fire and above debt (UX rule 9). — Cost if wrong: a player who listens for alerts hears nothing for a letter.
414. The score's defence term counts foot soldiers only, so archers and chariots change no score (ruling 344). — Cost if wrong: an army of archers adds no Safety.
415. Non-classic layouts at 64 draw new shapes against Stage 4.5 (332 is the point); a Stage 4.5 share link of a non-classic layout opens a different map. — Cost if wrong: an old link's map differs.
416. The archery range and the stables get fire risk: 0.3 and 0.5 (the range as the barracks, the stables higher for hay and straw). — Cost if wrong: a stables burns often.
417. The screenshot tool has a hard time limit (`-MaxSeconds`, 150 by default) with a reaper that kills the script, its Edge and its server, after three stalls on a lost DevTools reply. — Cost if wrong: a scene slower than 150 s needs `-MaxSeconds`.
418. New monument kinds add prestige (1,080 for all ten against 700 for the full score); the score's prestige term stays capped, so new kinds just reach it sooner. — Cost if wrong: a slightly easier full prestige score.
419. Play and pause are drawn: one SVG per step at the same height (pause as two solid bars with a clear gap, play a triangle); on a phone the corner button turns amber with a Paused tag on its top edge when paused and stays lapis when playing, with no extra height, and its description carries the state for a screen reader. — Cost if wrong: a taste call.
420. The style picker's buttons start at their names' width and share what is left, wrapping rather than clipping ("Whitewashe"); a test holds every name whole at 1280x800, 390x844 and 375x667, at 100% and 150% text. — Cost if wrong: a second row of buttons on a narrow panel.
421. The lodge's row says what game is left this month, not what was already taken ("Game this month: 5 more (4 taken); 6 a herd a month, at most 24"). — Cost if wrong: none.
422. Fishing has no reach: the wharf's boat works the water its pier stands on, so the "within 8 tiles" line and its field are gone; the line says the catch is the full crew's month, more in flood months, fewer with fewer hands. — Cost if wrong: none.
423. A player's own pause or resume takes a building back from a crocodile scare and from a court card's pause, so the scare's end never unpauses a workplace the player paused meanwhile (the same for a resume and a pause within one game day). — Cost if wrong: none.
424. `nearestFit` searches both turns of a building that turns; the other turn wins only with a better kind of fit (clean before warned, near before far, anything before none), so Show me lands a fishing wharf turned to a north-south river, and a mastaba is not turned under the player for a tile. — Cost if wrong: a wharf's Show me lands it turned.
425. The balance pass and the final review run in parallel (balance only touches Stage 4.6 numbers; the fix wave covers both). — Cost if wrong: the reviewer misses a bug that balance made (the re-review sees both).

### Balance (430-437)

From `notes/2026-10-13-economy-review.md`, "Stage 4.6 balance pass". The 10-year village now holds 68.2% (it was 71.9%).

430. The balance village swaps its third farm for the wharf and lodge and its third tower for the archery range: the longrun village already spends 68.2%, so three buildings costing 98 a month cannot sit on top of it inside 70%. — Cost if wrong: a village that builds all three on top of a full village runs at about 81% (still about +1,200 a year).
431. Archers are paid 6 (was 8). — Cost if wrong: archers are a little cheap to keep.
432. The archery range has upkeep 8 and 4 workers (were 10 and 6). — Cost if wrong: a range is cheap defence beside a barracks (48 a month against 68).
433. A gift at favour 70 or more is half a month to a month of taxes or output (was 1-2 months): 5,090 gold over 10 years (was 10,160, more than the village's own profit). — Cost if wrong: the court feels less generous.
434. The hunting lodge has 2 workers (was 3). — Cost if wrong: none worth naming.
435. Flood levels stay as in 334: a Low year leaves a granary village fed (the granary falls to 333 at the lowest), and two Low years running on the Stage 4.6 village empty the granary while homes stay fed. — Cost if wrong: two Low years running bite a village without a granary.
436. Request amounts stay: all 11 requests in the run were met within a month (gold 770-860 against 544 taxes a month, fish 40-60 against 20 a month). — Cost if wrong: a gold request takes about six months of a small village's profit.
437. (A finding, not tuned.) The lodge brought 11 game in 8 years, because the herds in its reach were hunted out within a month or two; sustainable hunting needed a sim change, which is 460. — Cost if wrong: the lodge stays a token building.

### The final review's call (460)

460. Sustainable hunting: a hunt takes 1 animal, which is 6 game, at most 1 animal from a herd a month, never below 2 animals in a herd; a herd regrows 1 a month; the lodge's cap stays 24 game a month. Built in the fix wave. — Cost if wrong: hunting is steadier than the plan pictured.

### The fix wave (440-459)

From the commits of the two fix-wave branches (A: `d5abda7`, B: `bef7513`), after the whole-branch review. The numbers were first used in the commit messages, so these are the first uses.

440. The month's gift is checked (and its clock started) with favour as the month ends, before the drift, so a city held at exactly 70 gets its gift, as every gift sentence says. — Cost if wrong: a gift a month later than the words promise at exactly 70.
441. The score's defence term reads `baseRaidSize` (the raid size before favour's step), so favour never moves the score (344); raids themselves still grow at low favour. — Cost if wrong: the score dips a few points at low favour.
442. Words true on every difficulty: the first letter's why and How to play's court line speak only of gifts (Peaceful has no raids or tribute); while a raid is warned, the court sheet says it keeps the size and tribute set at the warning. — Cost if wrong: How to play undersells favour's tribute effect on raid difficulties (the court sheet still states it).
443. Units away whose building is demolished or burned are marked on the court sheet ("will leave service: their barracks is gone"); `armyDay` pushes `units_lost` (captioned); Demolish asks first and the demolish tool's bar warns in amber; a soldiers request's consequence says a warned raid arrives in N days and these units will not fight it. — Cost if wrong: a question more on Demolish.
444. What a card applies is what it showed: the sheet passes its shown effects to `answerCard`, which refuses with `changed` (nothing happens, a caption, the sheet redraws) when the city changed since; a caravan's or deserters' body says the room when the choice is capped below the number drawn. — Cost if wrong: a second tap after a change.
445. The River hooks (lost herd, flood omen) are asked afresh on a copy of `world.wildlife` and `world.flood`, never cached for the day, so the interface asking before a tick cannot steer the sim's draws, and a Nilometer built today turns the omen off at once; `cardStale` drops a flood omen that can no longer be foretold and a lost herd that can neither come nor go; the dispute's workshop draws with `COURT_SALT.spare1`, not `issueCard`'s `cardPick`. — Cost if wrong: a little more work while such a letter waits.
446. `courtDay` and `courtMonth` fill a court record saved by a Track-0-only v7 build from `newCourtState`'s defaults (as River's tidy). — Cost if wrong: none for new cities.
447. A letter that closes while on show (a request past its deadline, a card dropped) shows "This letter is closed" with only the court and Close, instead of swapping another letter under the finger. — Cost if wrong: one more tap to reach the next letter.
448. Food requests size a hunting lodge by `huntingOutlook`'s month (not its 24 ceiling) and a wharf by its flood-month catch while the water is up, at their staffing, as production makes them. — Cost if wrong: requests for game ask less than before.
449. Boats whose bank was built on after the warning land on the new bank with its own mouth and edge; with no bank left they come with band 0 on foot (mix folded, one band). — Cost if wrong: a boat raid on a fully built river comes by land.
450. The cartouche tie is gone from the title and every sheet heading (it read as a text cursor); the round loop stays. Supersedes 405 and 409. — Cost if wrong: a taste call.
451. The crocodile line shows only where a scare can happen (Town on, threats on); a wave 1 save's sheet reads no scare before its first day. — Cost if wrong: none.
452. Food causes and fixes say food and name every food maker from the data (grain farms, fig orchards, hunting lodges, fishing wharves). — Cost if wrong: none.
453. River remarks need this year's water to have risen; the flood song, first rise and flood months wait for the city's first flood. — Cost if wrong: remarks come a little later in a first year.
454. The outlook says "(N without the flood)": no level gives 100%. — Cost if wrong: none.
455. Wildlife figures take three id ranges that never meet; `SEASONS` is built from `FLOOD`. — Cost if wrong: none.
456. The lodge and wharf sheets say "Stores within N road tiles" and "Hunting the herds" / "Fishing the river". — Cost if wrong: none.
457. Speed step titles name Space, + and - only with Keyboard shortcuts on. — Cost if wrong: none.
458. The map-wide fit search on Large with no fit takes 6 ms (clay pit) and 14 ms (wharf, both turns), so no cap is needed. — Cost if wrong: a slower search on a slower phone.
459. Every release has a build in its What's new heading (past: its merge commit on main; newest: the running stamp); the 4.6 notes are final. — Cost if wrong: one more thing to keep up each release.

## Part 14: Stage 4.7 (14-15 Oct 2026)

From the plan `plans/2026-10-14-thebes-stage-4-7-land-and-logistics.md` (rulings 461 to 473, as built, with the amendments noted), the contract note `notes/2026-10-14-stage-4-7-contract.md`, Task 7's rulings (474 to 477), Task 8 and the final review (478 to 481), and the implementers' calls the controller accepted along the way (482 on). Every ruling keeps the number it was first given; the plan's own 474 to 476 for Task 8 were renumbered 478 to 480 because Task 7 had already used 474 to 477.

**Josh's mid-run ask (15 Oct), Task 3b.** Looking at a whole Normal map he asked for green only round the river and the oases (random green in open desert is wrong; "Meadow is okay, but it has to be around the fringes of water"), rocky areas that run longer and read as distinct, and hills that look like hills. That reshaped 462, 463 and 464 on new maps (classic at Normal untouched); the research is `notes/2026-10-15-terrain-look-research.md`.

### The plan's rulings (461-473), as built

461. Every new map has, within `round(20 x size / 64)` tiles of the start area's centre, at least 2 clay-pit fits, 1 mine fit on rocky ground and 6 farm fits, repaired deterministically when a draw misses (200 seeds of every size and layout: 0 failures in all 18 cells). **Amended:** classic at Normal (64) gets the clay and farm repair only, no mine repair, so 7 classic seeds moved (32, 52, 89, 90, 105, 148, 173) and the other 193 of 200 draw exactly as before. — Cost if wrong: a few seeds look a little more alike near the start; a classic-64 player may find the nearest mine site 28 tiles out (median), up to 49.
462. Land greens from one moisture field (distance to water, pushed by noise, in `src/sim/moisture.js`, used by the generator and the picture alike); farms' fertile land does not move. **As reshaped by Task 3b:** meadow only where the field is 0.42 or more (about 5 tiles from the river, 3-4 from an oasis, channel or lake, never more than 9 tiles from water), no noise meadow, no groves and no outcrop patches on new land; the river bank is drawn greener than an oasis's halo; open desert gets drab dry shrubs only. — Cost if wrong: the green band is a look, so players may expect to farm all of it (the Ground overlay is the exact cue for farms).
463. Oases form in open desert on new maps (0-1 on Small, 0-2 on Normal, 1-3 on Large), each a pool of 3-8 water tiles with a bank, palms, a fertile ring and 3-7 clay tiles, at least 12 tiles from other water and 14 from another oasis; classic at Normal gets none. A pool is water to everything except the fishing wharf and the Nilometer, which say "Must touch the river"; herds favour oases; the first "An oasis in the desert". — Cost if wrong: classic Normal players see no oases.
464. Hills are impassable and unbuildable (`HILLS`, one `passable` and `buildable` rule in `src/sim/terrain.js`), and every map stays connected. **As reshaped by Task 3b:** hills are cliffed ridge spines 2-3 tiles wide on the middle of a long rock belt (about 2.5 houses tall in the picture), 1-3 / 2-5 / 3-8 by size, with the belt as their foot instead of a skirt; the rock belts themselves are 14-40 tiles long, 2-3 on Normal (a map always has one), and mines work on them as on any rock. The Ground overlay, the refusal "Hills: nothing can be built here" and How to play say so (mines "will come to the rocky ground around them later", no dates). — Cost if wrong: raiders take longer routes on hilly maps.
465. After a house is placed the house tool stays on (with a Done button) and empty plots beside a road show **Good** (water and a bazaar in reach) or **Fair** (one of them), from the sim's own coverage (`src/sim/spots.js`), each with an icon (drop, basket) and a legend in the guidance row. — Cost if wrong: one more tap (Done) to leave the house tool.
466. A storehouse or granary can **Fetch** a good up to an amount (default 100): one cart per store, 20 units a trip, 8 road tiles a game day each way, from the nearest other store linked by road that holds the good above its own order, at any distance. A cut road turns the cart back. — Cost if wrong: one more system to manage (optional, off by default).
467. Carts are drawn on the roads (at most 30; Gentle moves, Still stands), and the store sheet's Fetch panel holds the toggle, a stepper, the exact consequence before the tap, the live status and Show me. — Cost if wrong: none.
468. World version 8 holds every new field (`HILLS`, `world.oases`, `b.orders`, `world.carts`, `mapParams.land`, the tallies); old saves keep their maps and gain no hills, oases or green band. — Cost if wrong: old cities never see the new land.
469. From year 8 the capital asks a yearly goods quota sized to the city's output, warned a year ahead: 10% (Peaceful, Relaxed), 12.5% (Normal) or 15% (Hard) of last year's output of up to three goods, with a gift of 20% of its value; met +5 favour (+8 by month 6), missed -15 with the shortfall carried once; on in Peaceful. — Cost if wrong: a standing chore in long games.
470. From year 10 raid size gains a capped wealth term (+1 per 40,000 gold and per 500 people, cap 3 / 6 / 9 by level; the gold step was 10,000 until 478) and a raid from the 4th on is two-sided with chance 0.6 (was 0.35); the score ignores it (it reads the base size). Off on Peaceful. — Cost if wrong: rich late cities need real defences.
471. The Villa and the Estate ask for a third food and more household goods (use x1.5 and x2: a Villa of 150 takes 12 pottery, 12 beer and 9 linen a month; an Estate of 180 takes 18, 18, 15 and 11 jewellery), and devolve by the usual two-month countdown if supply breaks. — Cost if wrong: grand homes are harder to keep.
472. Hunters, foot soldiers and archers walk round water and hills by the shared `passable` rule (`src/sim/walk.js`); herds never stand on water or hills; newcomers already walk road tiles. — Cost if wrong: none (drawing and unit moves only).
473. A Fair flood gives x1.0 (was 0.9): Low 0.6, Fair 1.0, Good 1.1, High 1.25, so the average year is x1.0125 (a small gain); every word reads the data. — Cost if wrong: slightly more food than the 4.6 plan pictured.

### Task 7 (474-477)

474. The quota asks up to three goods from a fixed pool (pottery, beer, linen, jewellery, grain, figs, game, fish): those with a year's output of at least 40, ranked by output times value. — Cost if wrong: a city that makes many goods is asked for the three it values most, not the ones it would rather give.
475. A raid may pass 18 raiders by the wealth term (the size is favour's step plus the wealth term, so the total can pass the old top); the warning says "your wealth draws N more". — Cost if wrong: a very rich city meets a raid 3 to 9 bigger than 4.6's top.
476. The third kind of good the upper tiers ask for is a third food (any three of grain, figs, game and fish in stock), not a new good. — Cost if wrong: a Villa waits on a third food chain (a hunting lodge, a wharf or an orchard).
477. The quota has no alert row: it is a standing letter on the court sheet with a caption when asked, met or missed (and reminders, see 482). — Cost if wrong: a busy player may forget it (the court sheet and the captions are the cue).

### Task 8 and the final review (478-481)

478. The raids' wealth step is 40,000 gold (was 10,000): the capital run's treasury put the gold term at the cap from year 10 with the old step; now the term is 4 at year 11 and 5 at year 14 and reaches the Normal cap only in the last year. — Cost if wrong: a rich city meets smaller raids than the plan pictured.
479. A village with a second store (one Fetch order) spends 70-75% of its taxes (73.7% measured; 68.2% with no order): the second store's wages and upkeep cost 5.5 points. Replaces the plan's 60-70% for a city that fetches. — Cost if wrong: a fetching village runs close to its limit.
480. The quota asks only goods that rested in stores (`court.yearMade.kept`: the most each pool good's stores held at any month end this year), never more than that rounded down to 5; a good never held is not asked. Without it a food-only city that eats what it grows (farms fill the granary and the bazaars empty it) would be asked for grain it never held and lose 15 favour a year. — Cost if wrong: a city that sells everything it makes is never asked for it.
481. Hills, wealth raids and the new upper-tier needs arrive with a tip and words in How to play but no "first" celebration. — Cost if wrong: three fewer celebration moments.

### The implementers' calls the controller accepted (482 on)

482. The quota sends reminders (a caption at 3 months and at 1 month before the year ends) while it is open and unmet (the reviewer's fix to Task 7). — Cost if wrong: two more captions a year.
483. Classic Small (48) and Large (80) get the new land: only classic at 64 is pinned. — Cost if wrong: an old Classic Small or Large share link opens a different map.
484. Fits for 461 count non-overlapping footprints (a clay pit is 4 tiles and two fits must not share one). — Cost if wrong: none visible.
485. Large's terrain bake stays inside the Stage 4.6 budget: Large against Normal at zoom 0.5 within 1.6x (1.42x measured with hills and belts) and Large within 10% of its own earlier figure; a cold bake of all 25 chunks is 129-147 ms. — Cost if wrong: a slow Large map on an old phone.
486. Oasis shape: `r` is the farthest pool tile plus 0.5 (a "within 4 tiles" test measures to the nearest pool tile); 8 tiles from rock; a Small map may get none; the band tints loam. — Cost if wrong: on 0.8% of maps (26 of 3,400, all of them ones the mine repair mended) rock is closer than 8 tiles to a pool.
487. Hills keep 7 tiles from water (the plan said 6, to keep the old "no rock within 4 of water" rule), 9 from an oasis pool (11 before Task 3b), 13 from the start area; each hill tile lies in a 2 x 2 block; the connectivity rule is "every tile the start area reached before the hills is still reached" (some layouts, such as `middle`, start with only 47% of the land reachable). — Cost if wrong: a layout's cut-off land stays cut off.
488. The mine repair's rock is a tapered belt fragment about 9 tiles long drawn along the river's heading (the same radius-2 core, so the mine still fits); it keeps 8 (+3 for the blob) tiles from a pool when any site allows it. It still repairs about 43% of Normal maps (58% Small, 48% Large). — Cost if wrong: on those maps a short belt stands where the draw had none.
489. Every map has a belt, and rock per map is 120-430 tiles on Normal; the test floors are 0.45 of the rock the draw wants (0.25 on Small, by the implementer's call). — Cost if wrong: a Small map may have under a third of the rock the draw aims at.
490. Foot soldiers and archers no longer wade rivers: they go round water and hills, over a bridge, and do not move when there is no way. Chariots still drive straight. — Cost if wrong: a unit on an island stays put.
491. Hunters stand at their door when no walkable route to a herd exists; the sim's hunt still counts herds "within N tiles in a straight line", and the words say so. — Cost if wrong: the count and the walk can disagree across a lake or a ridge.
492. The house tool stays after a touch tick for houses only (replaces the placement-UX rule for houses; roads, walls, plazas, Demolish and buildings still end after a touch). Done shows only when nothing is waiting (the x takes waiting plots back); Undo is always there, greyed with nothing to undo; the spots hide under an overlay (the player's own lens) and the Play tip wins the guidance row; the legend says "bazaar", not "market". — Cost if wrong: one more tap to leave the house tool.
493. A store gives what it holds above its own order, so a store at or under its own order gives nothing and two stores that fetch one good never pass it back and forth (the plan's "not itself fetching it" and "never below its own fetch order" read as one rule); ties in road distance go to the lower store id (no salt draw). — Cost if wrong: a stocked store that also fetches can give away only its excess.
494. Fetch is on offer from the first store (the granary at Village; goods other than foods from the Town's storehouse); an order is refused, saying why, when no linked store has any to spare now. — Cost if wrong: a Fetch set before the goods exist is refused and must be set again.
495. The far-good tip fires only for household goods (pottery, beer, linen, jewellery), judged at the tier the home is growing into; foods are not looked at. — Cost if wrong: a far granary does not raise the tip.
496. The Fetch panel sits under "Stored" on the store sheet; its stepper moves by one cart load (20) up to 200, then by 100s, and the sheet shows the load on both legs of a trip; a cart whose road was just cut keeps its last drawn route (drawing only). — Cost if wrong: none.

## Part 15: Version 5.0 (15-16 Oct 2026)

Plan rulings 501-509 (see the plan) accepted as written. Task rulings below; "Cost if wrong" after the dash.

510. Advice is in points: a home weighs the tier it would rise to; weights in src/data/advice.js. — The order may feel off; all numbers are in one data file.
511. Homes are grouped by their next step, so each home counts once, under its first unmet need. — A later need looks smaller than it is.
512. "Running out" compares stores and bazaar stalls against last month's use minus production, under 3 months. — Ignores carts and trade; a one-month dip can trigger it.
513. A locked fix weighs half and offers nothing to build; an unaffordable fix is shown, marked. — An unaffordable fix can top the list.
514. One cause-to-fix table, kept in the sim. — None.
515. The next step skips rows that are waiting or locked. — It shows the next thing to build rather than "waiting".
516. The buildings version sits beside the world (not saved); the world stays at version 8. — Writing straight into world.buildings bypasses it (only old tests do).
517. The chunk index drives the renderer (Task 0) and tap-picking (Task 6). — None.
518. The advice "seen" marker is the settings key adviceSeen, per device. — Two cities on one device share the dot.
519. Each danger kind is one item, fixed by the first affected building's own cause (lowest burning id for fire). — One Show me for two districts.
520. The Advice button comes with the first house and stays for the session. — An empty city never sees it.
521. The sheet shows the top 5 with the sim's numbers, cause, fix words and price; unaffordable fixes are marked in words. — Show me can open a card the confirm bar then refuses.
522. The dot compares the top-five keys with adviceSeen; advice is read at commands and every 5th game day; opening the sheet refreshes the cache. — The dot can lag a daily danger by up to 4 days.
523. A Show me with no legal tile toasts why and starts no tool. — None.
524. A phone's top bar is tightened to fit the Advice button. — Slightly tighter numbers.
525. The advice tip fires after the spots tip, so it can wait up to 3 minutes. — A late tip; the dot still shows.
530. The house sheet's first line is labelled Next step, Waiting, Locked, Ready, Kept or Empty; the label word is the cue. — Wording only.
531. The line says "this home". — Counting homes with the same step would need advice-style grouping.
532. A fix needing several makers names and prices only the first one the city lacks; the advice sheet prices the sum. — Two places price differently.
533. Every build Show me (step line, checklist rows, advice) refuses with why when no tile fits. — Changes old silent-ghost behaviour.
534. An empty plot on a road shows Empty: and drops "Waiting for people to move in". — One line of text.
535. Opening the advice sheet refreshes the dot's cached keys. — None.
540. Home progress, Goods supply and Workers join OVERLAYS after Ground, read-only from the sim. — A rename or reorder.
541. Home progress comes with the first home; Goods supply and Workers at Town; goods chips as their makers unlock. — Constants in src/data/layers.js.
542. Home progress states: ready, one missing, two or more; the icon is the row nextStep names. — Icon tuning.
543. Goods supply marks homes that ask for the good and stores/bazaars holding it (0.5 or more); the pick is UI state, not saved. — None for saves.
544. Jobless are shared out over districts by residents (largest remainder); the legend says "shared out". — A district can show people who count elsewhere.
545. One cache signature covers all three lists. — A stock edited outside a day tick shows a day late.
546. New hues: cyan, umber, steel. — A palette change.
547. On phones the Goods supply legend drops its name and puts picker and x on one row. — CSS only.
548. Large draw cost measured (stress city, zoom 0.5). 548a: layer lists build in bounded slices (about 6 ms a frame) and the previous list is drawn until the new one is whole (worst frame 262 -> 39 ms). — A new home's mark can lag about a second on a huge city.
549. Show me for a good held only in a far store opens the store near the bazaar that should Fetch it. — Words and tests only.
550. Build another copies type, turn, style, a store's Fetch orders and refused goods (only those the new building accepts). — A copied order idles until a store near it holds the good.
551. Build another is refused by the placing rule (locked, only one, gold, no room) with the sim's numbers. — None.
552. The refusal shows on the sheet, with Show me where there is something to show. — None.
553. Farm areas pack whole footprints by rows or columns; skipped means ground the sim refuses. — Not perfectly packed.
554. Gardens and statues use spacing 1, 2 or 3 (default 2). — None.
555. An area is all or nothing against the treasury, as plots. — A player lays two smaller areas.
556. One building vs an area is a 44 px icon in the bar. — Less discoverable than a card.
557. The tool is {kind:'areas'}; at most 600 skipped tiles drawn, all counted. — None.
558. Tips: build_another on the first building sheet, drag_areas on the first farm/garden/statue. — Two more tips.
560. Route's price is previewRoadTiles' own answer for the chosen tiles. — A pricing change touches router and preview.
561. Straight is the default (finger-follow and the L unchanged); Route is remembered per device (roadMode) and introduced by a tip. — Players may not find Route.
562. A bridge is one move over 1 to BRIDGE_MAX water tiles, judged by bridges.js runReason. — None.
563. Step weights: gold, then existing road, then fewer bends; a route may cross your wall as a gate, and the bar says "1 gate in your wall (raiders still treat it as wall)". A gate keeps the wall's 40 HP. — Walled districts could get gates the player did not picture.
564. The search is capped at 60,000 states, then refuses "too far". — A future huge map needs a higher cap.
565. Refusals: too_wide, boxed_in, hemmed_in, no_way, too_far, each with a Show me place. — Words only.
566. In Route a tap or drag sets start and end; Flip is hidden. — Differs from Straight.
567. The Route tip fires on the first road, or when a straight road is refused by something in its way. — A late tip.
570. Fling: Full about 350 ms, Gentle about 110 ms, Still none; any touch stops it and that one tap does nothing else. — The stop tap is swallowed.
571. Show me glides (Full 380 ms, Gentle 170 ms, Still a jump) and comes in to zoom 0.75 when further out; any touch cancels a glide or zoom tween. — A zoomed-out player gets zoomed in.
572. Zoom steps keep the tile under the finger fixed. — None.
573. Two-finger double tap zooms out, also with a tool open. — An accidental zoom-out while drawing.
574. Hit-testing reads the chunk index, identical answers. — None.
575. The renderer skips what is off the canvas (pixel-identical, tested); the terrain ring round the view is baked ahead on idle frames. — A 48 px margin could miss an oversized shadow.
576. More than 150 roadless plots at zoom 0.6 or less show road badges without amber outlines; they return at 120 or fewer (601). — A crowded overview loses the amber wash.
577. Roadless plot lists are memoised on roads and buildings versions. — A direct world edit would show stale plots.
578. A dragged route is searched at most once a frame and always settles on lift. — The preview lags a fast drag.
579. Large/Normal frame mean at zoom 0.5: 1.77x before, 1.14x after (target 1.25x). — None.
580. A low street names the cheapest decoration that closes the gap alone, else the one that lifts most, at its tile, with the score before and after. — An early sphinx costs more than gardens would.
581. A stuck chain names its missing step from the sim's own blocks; paused, short-staffed or no-game makers are never answered with "another maker" (587). — Order may differ from a player's guess.
582. A workshop is named beside its input's store or the bazaar's store; a hunting lodge beside the nearest herd. — None.
583. New goals: third_food, villa_street (Fine manor's street to 50), estate_street (a Villa's street to 65). — Three more goals.
584. No balance data was tuned: supply chains and workers were the blocker, not desirability numbers. — The target is only reached with advice-following play.
585. A grand homes tip on the first Fine manor. — One more tip.
586. The grand balance run needs one piece of hand-play the advice never states (a workshop in the open with its own store that Fetches the input, when no room is left beside the store holding it). Without it: Villa month 92, no Estate in ten years. With it: Villa month 86, Estate month 97. — A real player without that trick may not get an Estate (follow-up).
587. See 581.
588. The third food goal counts food a home holds in stock, as the home check does. — It completes later than "build a lodge" suggests.
600. A warned raid weighs 3 per tower short (controller ruling, changed from the proposed 2), so the first warned raid (2 of 6 towers) ranks first. — A cheap booth fix shows second while a raid is 75 days out.
601. The crowd rule has hysteresis: hide above 150, show at 120 or fewer. — Outlines reappear a little late.
602. The terrain ring is baked one chunk per idle frame within the baker's capacity of 32. — The ring cannot cover a very wide view.

## Part 16: Version 6.0 (22-23 Oct 2026)

Plan rulings 610-619 (see the plan) accepted as written, except 619, which Josh changed mid-run (below). Track 0 made 620-630 (contract note), each track took its own range (A 640-679, B1 680-699, C 700-719, B2 720-739, D1 740-759, D2 760-779), the balance pass 780-785, the integrator 790-791, the final review's controller rulings 786-789, 792 and 793, and the fix wave 794-799. "Cost if wrong" after the dash; where a track did not state one it says "none stated" or names the data number to retune.

### Plan rulings

610. 6.0 is one release; the store builds are out of scope and nothing in 6.0 may need the network after load. — Store work later finds a web-only dependency.
611. Costs grow with rank above Town, and the late run banks at most about two years of profit. — The late game feels stingy; the numbers are data.
612. Court demands come about once a year from Town, each stating reward and failure cost before acceptance. — One more thing to track.
613. Two ranks beyond Capital and a final great work that wins the reign, then play on. — A long last stretch.
614. Raiders burn, wreck and loot; they do not take people. — Raids may still feel light in a rich city.
615. Plague, drought and low Nile, and locusts and blight arrive with warnings and counters, never in the first three game years, milder on Relaxed. — An early city never sees them.
616. Large plots replace merging for new grand homes; small plots stop at Townhouse; merged homes keep working. — Players who liked merging lose it.
617. The lesson is mandatory once per device for a player with no saved city, replayable from the menu. — An experienced player on a new device sits through 10-15 minutes.
618. Sound is on by default; "This week's Nile" is removed; Huge (112) joins the map sizes. — A muted-by-habit player hears music on the first tap.
619. Fable for the contract, Track A, hard merges and the final review; Sonnet for the rest. — SUPERSEDED: Josh said mid-run (22 Oct) to use no Fable and switch every Fable role to Opus 5.5 to save tokens. Track 0 (stopped before any edit), Track A, the hard merges and the final review all ran on Opus 5.5; the other tracks and the reviewers stayed on Sonnet. Cost if wrong: none found; the Sonnet fix waves still caught what the review found.

### Track 0: the contract (Opus 5.5, 4b58dc0)

620. World version 9 adds three records (`reign`, `demands`, `hazards`) and two optional per-building fields (`large`, `was`); the migration adds no building field. — A track that wanted every house flagged adds the flag in its own code path.
621. The ranks beyond Capital are `MILESTONES` rows, not a world field. — Track A needs a field after all, a v10 migration.
622. `costScale` is one stub in `costs.js`, already applied to wages, upkeep, monuments and the raid tribute. — Track A finds another place to scale and edits a shared file.
623. The grace is a day (`hazards.graceUntil`): three game years from day 0, or from the load day for a v8 city, whatever its year. — An old city's dangers start sooner or later than a player expects.
624. Difficulty factors: Relaxed and Peaceful chance and severity 0.5, Hard 1.25; Peaceful has no plague but does have drought and locusts. — A Peaceful player meets a lean year.
625. A raid strike is three hooks (burn, wreck, loot) run in that order; today's strike moved into them unchanged. — B1 reorders them in its own file.
626. The lesson's state is two settings keys, never the world's. — A lesson left part-way cannot rebuild its city exactly.
627. Wrecking and looting a storehouse are new dangers and wait out the grace; burning and a granary's food do not. — An old city's first raid after loading is as harsh as before, not harsher.
628. Huge (112) is in a size table but not offered until Track D1 turns it on. — None (one flag).
629. A Large plot is a `house` with `large: true`, not a new building type. — Code that keys on `w > 1` alone treats a Large plot as merged; use `isMergedHome`.
630. Demands live in `world.demands`, apart from the Stage 4.6 requests in `world.court`. — Track A folds requests into demands and clears the old record itself.

### Track A: a harder later game (Opus 5.5)

640. Costs grow little up to Capital (the capital run's band binds) and more beyond it; bills are rounded per building so the card's bill is what the building pays. — The mid-game stays easy.
641. Easier levels grow by the difficulty's cost (0.8 Relaxed and Peaceful, 1.25 Hard). — Hard players pay more and easy players less: one factor.
642. The court's due is the rank's share of the treasury or of a year's taxes, whichever is more, taken on the first day of each year from year 8, even into debt (the treasury share holds the late bank near two years of profit; the taxes floor puts a low-favour city in debt). — Saving feels taxed. Debt was later softened for the great work (788).
643. The due is doubled at low favour, cut to 0.75 at high favour and cut while the great temple rises (a quarter here; a tenth by 791; a twentieth by 795). — The multipliers are data in `src/data/reign.js`.
644-650. Demands: one at a time, from Town (before the court's letters open), separate from the Stage 4.6 requests; the first about 10 months after Town, then every 10-14 months; an offer waits 3 months and lapses as declined (-5 favour); deadlines goods 8-12 months, gold 4-6, a building 12-18, soldiers 4-6; amounts and rewards scale with the city's output, taxes, scale and difficulty; favour met +8-12, failed -15-20. — One more thing to track; every number is in `DEMANDS`.
651. Tips (progressive disclosure): the first demand offered, and the court's due a year before it starts. — A late tip.
652. The great temple is a monument kind, one per city, unlocked at the last rank; its art row lives in `render/art/monuments.js`. — None (a monument kind).
653. Great Capital needs 1,250 people and a Villa; the Seat of the Two Lands 1,400 people and an Estate. — The grand district never becomes the Seat on its own.
654-656. The great temple is 5x5, four crews, 300 crew-months in ten courses (540 stone and 60 bricks each), founding 8,000, with an offering as each stage begins: grain 400, clay 300, linen 200, flax 300, grain 500 (the fourth became beer 300 in 790). Goods that stay in a late city's stores, since homes eat pottery and jewellery as they are made. — The great work is too long or short; the numbers are data.
657. The great work finished seals the score once by itself. — None stated.
658. The closing scene is a sheet, never over the map, and reads under every Motion level. — None stated.
659. From Capital the threshold bar shows medals, since a rank beyond needs a grand home, not only people. — The bar is edited in the unowned `goalsList.js`.
660. The run drivers answer the court (accept what they can meet). — `grandRun.js` is shared with Track C: merge risk.

### Track B1: danger sim (Sonnet)

680. One new warning at a time, after the grace. — Dangers feel sparse or clustered.
681. A strike wrecks 35% x severity instead of burning; one tap rebuilds. — Fires matter less.
682. Storehouses lose 30% of each good. — Late raids too harsh or mild.
683. Bands of 8 or more get a chieftain (2x hit points, 1.5x blows; his fall turns the band); +1 raider a year, at most +4. — Late raids shift.
684. Plague reaches homes within 2 tiles, slowed by a physician, a well and room; mended homes are immune. — Too mild or deadly.
685. Quarantine: a 12-tile district, 25 gold a home (at least 100), 2 months; nothing crosses and work stops. The fee can be off. — The price or length is wrong.
686. Work stops near sick homes no physician reaches (producers only); services are unaffected. — Production stalls feel unfair.
687. A low Nile is warned 3-12 months ahead; that flood is Low and farms yield x0.5 for 12 months. — Too harsh for stocked cities.
688. Blight and locusts hit the 3-8 nearest farms; Harvest now takes 40% of a month's crop with a 15-day rest that starts the day after the strike (fix round 1: tapped early, it is a pure gain). — Harvest now is free or useless.
689. Older balance runs and rule tests run with the grace never ending (`tests/v60/b1/grace.js`); a `rebuilt` tally was added. — An older run's number silently excludes the dangers; wave 4 measures with them on (783).
690. Urgent dangers go first in Advice. — They crowd out ordinary worries.
691. The Health legend's words are unchanged (old tests pin them); plague is shown by rings and dashes. — Wording only.

### Track C: housing and loose ends (Sonnet)

700. The Large plot card is a BUILDINGS row `large_plot`, 20 gold; placing lays a house. — Generic data tests needed two exclusions.
701. The `manor` goal's words and Show me changed in `goals.js` (not on the track's list). — None stated.
702. A lot takes arrivals only as a stocked Manor once its Manor rows are met. — Fills slower than merging.
703. A Townhouse has no next tier; one advice item (weight 6) names a Large plot while none exists. — No later nudges.
704. A Large plot below Manor holds four plots' worth and never splits. — None stated.
705. The capital run lays four Large plots and a third tower (otherwise raid 2 is lost); balance records re-recorded (Villa month 89, Estate 98). — Wave 4 retunes.
706. Locked layers show greyed with "From Town" (reverses 541). — The picker is tight in landscape at 150% text.
707. Pausing bumps `layerVersion`, not `buildingsVersion`. — None stated.
708. Farm-area leftovers are marked and counted apart. — None stated.
709. Bridge tiles are drawn with planks and a wave mark. — None stated.
710. The Estate trick in Advice: a store in the open, then the workshop, then Fetch (words; there is no state for the Fetch step). — The advice cannot tell when the Fetch step is done.
711. A plain workshop fix aims at the `roomFor` spot. — None stated.

### Track B2: battles you can see (Sonnet)

720. Still holds a smoke column on burning buildings (the old Stage 4.5 ruling gave none); three older tests updated. — One constant to retune.
721. A company in the field is drawn spread by unit id; fights are judged on the sim's own spots. — Soldiers drawn up to 0.9 tile off.
722. A fight pose when a soldier and a raider are within 1.25 tiles: 450 ms Full, 1200 ms Gentle, Still holds the guard. — One constant to retune.
723. The chieftain is a live-drawn banner that lies where he fell for 9 s; his health bar reads his own hit points. — One constant to retune.
724. Shells come through `armySlot` (192 lazy slots, height table checked against the art). — Sprite memory.
725. Rubble smoulders 45 game days after a fire, 12 after a wreck. — One constant to retune.
726. Blows, falls and sacks are inferred from the sim state; no new sim events. — A drawn blow can differ from the sim's own moment.
727. The raid result is a row inside the alert banner. On a phone it takes the row from a court letter and waits for a fire, a raid warning or a debt; on a landscape phone it waits for the report caption; it clears after 6 game days. — One rule to retune.
728. The dev-scene "hold" hook is cleared on every new game and on destroy. — None.
729. B2 edited B1's `src/dev/v60/hazards.js` (raid-burn looks) and put a CSS block mid-file in `css/ui.css`, after the court rules. — Merge risk, low (bounded by an end marker).

### Track D1: title, Huge map, desktop keys, polish (Sonnet)

740. Huge is offered in the size picker; its three raid entries are as Large's. — Raids come from the same entries over longer walks.
741. The Huge zoom floor keeps its frame within 1.25x Large's: 0.5 up to 1920x1080 and higher on 4K. — A big monitor cannot zoom out as far.
742. The weekly seed code is removed. — A few lines to bring back.
743. A phone is a screen whose short side is under 600 px; it is told "Best on a tablet or computer", never blocked. — A small tablet gets the note.
744. + and - zoom; speed moves to ] and [ (also . and ,). — Players used to + for faster must relearn it.
745. View keys leave controls that need keys (`data-own-keys`, roles, text fields) and leave the arrows to scrolling panels. — How to play says "Arrows or WASD" slightly more than holds in a scrolling panel.
746. Sound is on by default; devices that stored a choice keep it, so a returning player with a stored false stays silent. — None.
747. The title's Lesson button waits for `hooks.lesson` (D2). — None.
748. No tips for keys or Huge. — A player may not find them.

### Track D2: guided first city and picture cards (Sonnet)

760. 14 steps on a fixed 48-tile Normal map; only the sim advances them; a step done is never re-asked. — An undone step is not revisited.
761. Three staged things (the Large plot card, a blaze in the bazaar, the Market town's tower and raid clock), each said in its words. — A player thinks raiders come at 60 people.
762. Never saved: two guards and a settings view that leaves the device's tips alone. — A new hook must check `current.lesson`.
763. A fresh device's title is the lesson alone, plus Settings, What's new, Install and Bring your city. — An expert sits 10-15 minutes or imports.
764. A part-way resume replays the scripted walk-through; the player's streets are not kept (words say so after the final review). — A player expects their streets.
765. The ending is a sheet, then the title with New city; no city is auto-started. — One more tap.
766. A lit target; a phone's row has no x (the menu leaves). — Players look in the menu.
767. Seven intro cards, six first-moment cards (once, on loop events, never mid-tool), 13 in How to play, no dots above 8 cards. — None stated.
768. The workers step asks for more homes (six cannot staff the bazaar). — None stated.

### Wave 4: balance pass (Sonnet)

780. Advice names a farm for Harvest now only when the sim takes it (`harvestQuote` ok); farms refused (idle, no room) are counted stuck, and the item has no fix when none can. — A warned band whose stores are full shows an item with no button.
781. No danger rate, severity, rank cost, due, demand reward or great-work number is changed: none of a dozen variants makes the scripted great-work player survive the dangers. — A real player meets the dangers at the numbers set before measuring.
782. Show me counts a tile that fits the ground and lacks only the gold (below the debt floor) as a fit, so the ghost lands there and the bar names the price. — A ghost can land on a tile a later change makes illegal; the bar says so.
783. The dangers-on measurements are two new runs (the late run from day 0 with a new city's grace, the grand district run to year 10); the older runs keep 689's endless grace. — An older run's number silently excludes the dangers.
784. Advice is judged at points on every run (words, a weight, a known kind, no fix the sim refuses) and the top item's kind is pinned. — A later tuning that reorders the list fails the pin and wants a re-record.
785. The great-work run's margin is pinned as measured: a win by day 7,100 of 7,200, never under 2,000 gold, with the dangers OFF. — A tuning that costs the lucky run a few days fails here first.

### Integrator and final review (Opus 5.5)

786. Advice names a waiting great-work offering (`great_offering`, kind demand, weight 20) from the course before the stage whenever the stores hold less than n; its fix selects the store holding most of the good, else the producer; the great-work sheet's waiting row has the same Show me. — One more Advice row late in the game.
787. Raid-tower Advice aims at the band's first strike (`firstRaidTarget`); Show me drops a tower spot with no road while one with a road is in reach (10 rings), else takes the nearest roadless one. — The tower guards the first target's road side, not the road in; the grand district still needs the run script's `defend`.
788. The court takes no due from a treasury below 0 while the great work rises (`COURT_DUE.inDebt: 0`). — A debt-ridden finale is slightly kinder, and it does not save it.
789. A v8 city's first due waits a year from its load (`dueFromDay`: load day + 360). — None for new cities.
790. The great temple's fourth offering is beer 300, not flax: merged stores held 0 flax from year 11 to 20. — A city with no brewery waits at stage 4; Advice names it (786).
791. The due while the great temple rises is a tenth, not a quarter (the Seat's books ran near even). — Little margin: won day 7,030, gold at least 2,313. Superseded by 795.
792. A burnt Large plot re-lays as one empty Large lot, not four 1x1 plots. — None.
793. A friend's share link plays the link's seed at the link's difficulty; on a device with no finished lesson the card adds one line saying the lesson is in the menu. — A newcomer from a share link skips the lesson.

### Fix wave

794. The next demand's clock stays at the offer, not the settlement; the words say so. — A demand can follow a late one at the next month end.
795. The due while the great temple rises is a twentieth (was a tenth, 791). — The Seat's court asks little while the temple rises (300-700 gold a year); the dangers-off pin needs it.
796. The guided first city (`world.lesson`) gets no court demand. — None.
797. In the fire, tower and raid steps of the lesson the row carries the alert, and the alert's own line (fire, raid warning, raid) is hidden on every screen. — One fewer banner in the lesson; the minimap and Advice still show it.
798. The lesson's camera reads the free map from the DOM, because `createUI`'s `sheetInsets` is private. — A layout whose panel width differs frames a ring slightly off.
799. The pan bound applies to every camera that knows its map size, not only Huge. — You cannot park the view past a map edge.

The balance pass's wave-4 doubt is not a ruling: see the follow-ups note, "Open balance decision".

### Edits outside a track's files

- Track A: `src/ui/goalsList.js` (the threshold bar), `src/render/art/monuments.js` (the great temple's art row) and `tests/v50/grand/grandRun.js` (shared with Track C, a merge risk).
- Track B1: the Health branch of `overlays.js` and `tests/v60/contract/seams.test.js` (one line, also edited by A and C).
- Track C: `src/data/goals.js` (the manor goal's words and Show me) and the same seams test line.
- Track B2: a block in `css/ui.css` and B1's `src/dev/v60/hazards.js` (raid-burn looks).
- Track D1: `src/data/ui.js` KEYS (the speed rebind), `speedStepTitle` in `src/ui/text.js`, and the old menu and river-UX tests (`tests/ui/menu.test.js`, `tests/stage46/final/riverux.test.js`) that pinned the old keys.
- Track D2: `titleCard.js`, `menu.js`, `css/ui.css`, `tutorial.js` and `boot.js`; about 16 older tests now give the device a finished lesson or count the seven intro cards.
- Balance pass: B1's `src/sim/hazards.js` and its section of `text.js`, C's `placement.js`, and the stage4, stage47, v50 and v60/a run scripts (optional parameters only; defaults unchanged).
- Fix wave: a comment in `src/data/map.js` (map.js:68) and `tests/sim/longrun.test.js`, which now runs with `noNewDangers` and says why.
- This docs pass: `tests/stage46/ux/releases.test.js`, `tests/stage46/final/riverux.test.js`, `tests/stage47/final/releases.test.js` and `tests/v50/docs/releases.test.js` moved to the 6.0 entry; new `tests/v60/docs/`.

## Part 17: Version 6.0.1 (23 Oct 2026)

Branch `gw-balance`, cut from main at 588116e. Josh's decision on the open balance call: the gentlest option, option 1 (the dangers ease while the great temple rises). Measurements: the balance note's "Version 6.0.1".

800. While the great temple rises (founded, not finished), plague, the low Nile, locusts and blight strike at `GREAT_WORK_EASE.severity` of their strength (`dangerDraws(world).harm`: the plague's spread and loss, the low Nile's cut, the swarm's or blight's loss); raids and fire keep the level's severity. Severity, not chance, was eased: it acts on the day it strikes, where a chance only moves the next draw. — Cost if wrong: the finale is a build and defend test, not a survival test.
801. The strength is stepped to none (0): no plague, low Nile, locusts or blight is drawn or warned while the temple rises, a warning given before the founding lapses the next day with a caption, and one already under way runs its course. Half was measured first: it won seed 10 (day 6,196) but not the tuned seed 5 (course 8 of 10 by day 7,200). — Cost if wrong: the last years of a reign have no famine or plague at all; a player can found the temple early to shelter the city.
802. The dangers-on great-work run's player has three test-script habits (`habits`; off for every run as tuned): a grand home's step short of workers pauses a monument under way, one at a time; while the temple's crews stand short, workplaces that stand idle with workers in them are paused (never one that makes a good the great work uses) and put back when the stores hold under six months of food; a "no stone" or "no bricks" stall with no maker in reach follows the site sheet's Show me. Script changes, not game changes. — Cost if wrong: the pinned win measures a more careful player than the tuned script.
803. The great-work script's temple: when something stands on its north road (the dangers-on player's towers or granaries), the temple is laid first and the works road taken down its west side (else round with Route); all undone if a road fails. The tuned run lays its roads as before. — Cost if wrong: none for the tuned run.
804. The capital, grand and great-work run scripts take a `seed` (5 as tuned). — Cost if wrong: none.
805. A waiting great-temple offering with no store holding the good names a producer that stands (View: "wait for N", or "not working: its sheet says why"); a new one is offered only while none stands. The sheet's Show me for a missing producer aims at its own ground nearest the temple (`nearestTerrainTile`), as no_stone and no_bricks do. — Cost if wrong: a player with one slow brewery is not told to build a second.
806. Version 6.0.1 "A fairer finale", build 'live'; 6.0 takes its merge commit 588116e; a version can have a third part (the release test compares three). Harvest now's words say the share locusts eat when it is not all. — Cost if wrong: none.
807. Two dangers-on pins (`great.test.js`): the tuned seed 5 with the habits wins by day 6,800 (measured 6,699), never under 20,000 gold from year 10, no raid lost; seed 10 with the script as it was wins by day 6,200 (measured 6,097), never under 4,000. No one script wins both: open for Josh. The dangers-off pin (785) is unchanged. — Cost if wrong: the dangers-on wins rest on two scripts, so a change to either habit set can flip one seed.
820. (6.0.1, the lesson's fire step.) The lesson's staged fire always goes out within one to two days, whatever becomes of the player's firehouse (undone, demolished or paused). — Cost if wrong: a player who removes the firehouse never sees a fire spread.
821. Each lesson step starts with any overlay turned off and, on a phone, the build tray folded when the step asks for no card, so at least half the map stays free (667x375 at 150% text). — Cost if wrong: an overlay the player wanted needs one more tap.
822. The fire, tower and raid alert rows lead with the instruction; the raid row names towers only when staffed ones stand. Clearing the raid result removes only that report's own caption, shown or queued. — Cost if wrong: none.
823. Every lesson step is tested for free map, pan, zoom, Play, the menu and Leave the lesson at 390x844 and 667x375 at 150% text. — Cost if wrong: a future panel under the top bar fails it.

## Part 18: Version 7.0 (23 Oct 2026)

Branch `version-7-0`, cut from main at fdc4708 (the rewritten history, 6.0.1 live) and built in four waves: Track 0 (the contract), wave 1 (T trade, E events, S seasons and sound), wave 2 (A Advice, P playtest fixes), wave 3 (balance, the final review, two fix batches); the branch stood at 07dd22c before the docs pass. Sources: the plan's proposed rulings 850-857 and each track's report, in number order. Numbers in a track's range that were never used are skipped (880-899, 907-912, 914-929, 941-959, 970-974, 982-984, 1004, 1006, 1007, 1012-1014). Where a later ruling replaced an earlier one, the earlier one says so. Measurements: the balance note `2026-10-23-version-7-0-balance.md`; the contract: `2026-10-23-version-7-0-contract.md`; what is still open: `2026-10-23-version-7-0-followups.md`.

### Plan rulings
850. 7.0 is one release built on 6.0.1 and the rewritten history; nothing in it needs the network after load. — Cost if wrong: store work later finds a web-only dependency.
851. Seasons change looks only; farms work as in 6.0. — Cost if wrong: the seasons feel cosmetic.
852. Day and night run on a six-minute real-time loop in the render layer, never in the sim or the save. — Cost if wrong: the light does not match the date.
853. Incense is a festival good only; no growth or rank needs it. — Cost if wrong: Punt feels optional.
854. Trade never sells below a floor, and offerings and accepted demands are held back automatically. — Cost if wrong: a player who wants to sell everything must lower floors first.
855. Events never push a city in debt deeper; a default never costs gold. — Cost if wrong: troublesome events feel soft for a broke city.
856. A v9 city sees no event for a year after load. — Cost if wrong: none for new cities.
857. Opus for Track 0, Track T, hard merges and the final review; Sonnet for the rest (Josh: no Fable). — Cost if wrong: a Sonnet track needs an Opus fix round.

### Track 0: the contract (Opus 5.5, a53ebc9)
858. The record is `world.cityEvents`, not the plan's `world.events`: `events` is every sim function's per-tick list, and an old test bans an "events" key in saves. — Cost if wrong: a name only.
859. The Quay's building row and incense's goods row belong to Track T; Track 0 reserves the ids and wires the joins (so the plan's "Quay as a building kind, and the incense good" were met by T, not literally by Track 0). — Cost if wrong: none.
860. A trade switch is stored only when off, per route and side; floors are per good. — Cost if wrong: T adds a field.
861. The caravan sells only above the larger of the order's keep and `heldBack.units`. — Cost if wrong: T changes it in its own files.
862. `cityEvents.nextDay` is 0 for a new city (a v9 city: load day + 360). — Cost if wrong: E changes the default.
863. Season ids are akhet, peret and shemu. — Cost if wrong: a rename.
864. The light pass draws under fire, effects and overlays. — Cost if wrong: one renderer line.
865. `dayNight` defaults to true and `effectsVolume` to 100. — Cost if wrong: none.
866. The waiting-event Advice item is Track E's (the plan gave it to A); kinds `event`, `quay` and `trade_floor` are reserved. — Cost if wrong: A rewords E's item.
867. Salts are 6101-6169, each inside its track's range. — Cost if wrong: none.
868. File ownership is as the contract note says. — Cost if wrong: a track asks the controller.
869. Merge order is T, then E, then S, then A. — Cost if wrong: a one-line conflict.

### Track T: trade and the Quay (Opus 5.5, 8b267c1)
870. Nubia (Capital, 800 gold) and Punt (Great Capital, 1,200 gold; the only seller of incense) trade by river. They come last in the partner list, so Memphis's and Byblos's price drift is drawn exactly as before. — Cost if wrong: retune prices.
871. The Quay is 2x1, needs river water along a long side and a road, costs 200 gold, needs 4 workers and unlocks at Capital. — Cost if wrong: one data row.
872. A river route needs a Quay, not a trading post. Boats land at the first working Quay with a road. — Cost if wrong: words and one check.
873. Trade holds back the floor, plus the great temple's whole owed offering, plus accepted court goods demands. — Cost if wrong: great-work trade sells less.
874. "Keep at least" is one number per good; the sheet writes it as both the floor and the order's keep. The ledger (last year's profit) starts at the first visit. — Cost if wrong: one more stepper.
875. Only switches turned off are stored. — Cost if wrong: none.
876. Arrivals (boats and caravans) are render only. Gentle moves as Full does; Still shows only the caravan or boat at rest. — Cost if wrong: one condition.
877. The seam re-registers the 'trade' sheet with no edit to `createUI`. On phones (portrait and compact) one route is open at a time; on wide screens every route is open. — Cost if wrong: tests.
878. `createTradeUi(null)` returns an empty seam, because a Track 0 contract test requires it. — Cost if wrong: none.
879. Incense is a raw good. Its line says "used by festivals" before Track E lands. — Cost if wrong: one sentence.

### Track E: city events (Sonnet, 6f4e593)
900. Events from Town: the first 6-10 months after the Town day, then 5-9 months after each offer; one at a time; none near a danger or a court deadline. — Cost if wrong: tune `CITY_EVENTS`.
901. Effects only through existing sim functions (court favour, goods and festival, `fallIll`, the thefts mood row, court pause); no output boost, so the craftsman settles people. — Cost if wrong: weaker than the design's example.
902. Defaults never cost gold, losses clamp, prices scale with taxes. — Cost if wrong: not recorded.
903. Stops live in `world.court.effects` (`event: true`); `eventDay` ends them. — Cost if wrong: not recorded.
904. The event is a warning-tier alert (list, caption, Advice, summary), opened by a root click, not the banner row (`CRITICAL_RANK` is not E's; three tests pin it). — Cost if wrong: on a phone it sits among the alerts; one line plus three pins.
905. The Advice fix opens summary section 'events'; its aria still said "See who works where" until Track A named it (ruling 966). — Cost if wrong: not recorded.
906. One line in `cardMoments.js` (not E's file) adds the 14th picture card; three older pins moved. — Cost if wrong: not recorded.
913. The old balance runs hold events off (`tests/v70/e/hold.js`). With events on, even the welcome kinds alone turned the seed-5 great-work run from a win (day 6,699) into no win. Wave 3 sets the hold off and retunes (replaced by 975 and 976). — Cost if wrong: not recorded.

### Track S: seasons, light and sound (Sonnet, e6f3a7d and 2b34e3f)
930. The season blend runs over a season's last month. — Cost if wrong: a jump at the boundaries.
931. Night is a soft-blue multiply; marks, labels and overlays draw after it. — Cost if wrong: the readability test fails.
932. Season looks: a land wash, a river tint, field slots and palm marks. — Cost if wrong: the looks are too subtle.
933. The season name is a zero-width second line under the date, hidden from the eye when the numbers wrap (the summary's Season row, ruling 995, covers it). — Cost if wrong: not visible on tight bars.
934. The 2 ms budget is measured on drawing time, plus a software-raster cap of 14 ms. — Cost if wrong: the cap is arbitrary.
935. Sound is the master of music and effects (tested all four ways with a stub `createMusic`). — Cost if wrong: a device with Sound off and Music on loses its music.
936. Season moods in the music. — Cost if wrong: not recorded.
937. A 'tense' mood below the raid threshold for plague, drought, locusts or fire. — Cost if wrong: not recorded.
938. Five oscillator-only effects with cooldowns. — Cost if wrong: not recorded.
939. The light clock runs only while the game runs, at most 250 ms a frame. — Cost if wrong: not recorded.
940. Far-zoom lamps are strided dots and the glow pools are capped at 260. — Cost if wrong: not recorded.

### Track A: Advice fixes and the words (Sonnet, 672d18a and b42ff32)
960. A warned raid's tower goes on a road-touching tile in range of the first-struck building, in Show me's own search order; else "Lay a road to here (N tiles), then build the tower" (the road tool's Route) with Show me at the road's end; else no fix. Unwarned and no-target raids are unchanged. — Cost if wrong: one Show me lands elsewhere (`ADVICE_FIX` numbers).
961. Stranded goods: a store by the bazaar only when none stands there and one cart brings under one Fetch order a month (about 25 or more road tiles); else Fetch as before. — Cost if wrong: the threshold (in data).
962. The 'quay' Advice item fires only with no Quay at all, weight 6. — Cost if wrong: not recorded (a roadless or paused Quay still gets no Advice item; deferred, see the follow-ups).
963. The 'trade_floor' item fires only while the treasury runs out; View opens Trade. — Cost if wrong: not recorded.
964. The Keep-at-least lines name where stock is counted ("near the trading post / the Quay"). — Cost if wrong: not recorded.
965. Opet's smaller festival reads "without favour"; Nubia's help is worded per good. — Cost if wrong: not recorded.
966. The event Advice item's View button is named for the event. — Cost if wrong: not recorded.
967. Tip triggers `quayPlaced` and `routeOpened`. — Cost if wrong: not recorded.
968. The seasons, events and trade How to play entries already exist from T, E and S; A adds the Quay, the fixes, trade and events in Advice. — Cost if wrong: not recorded.
969. The balance runs' driver keeps 6.0's tower hand by default (`setLegacyTowers`): the new spot moved the great-work runs (wins lost); wave 3 was to re-tune them (see 978). — Cost if wrong: not recorded (see 978).

### Wave 3: balance (Sonnet, 78ac720)
975. The late run (from year 6), the careless run (every event takes its default) and the great-work run (from year 10) play with the city events on; village, capital and the dangers-off grand run keep the hold. — Cost if wrong: those runs say nothing about events, and the capital's years 2 to 6 meet events only in the dangers-on late run.
976. In the dangers-on runs the late run has events from day 0, the grand-district run from year 7, and the great-work runs from year 10. Events from day 0 sink the seed-5 great-work run (third raid lost), seed 10 (never finishes) and the grand-district run's wreck and loot assertions. — Cost if wrong: the great-work runs' grand years (Estate, Seat) rest on the 6.0.1 coin.
977. The scripted player pays a price only when it is at most a tenth of the treasury beyond a spare of 800 (a quarter for a strike or a quarrel), keeps 15,000 from the great temple's founding until it is finished, and spends goods only above what trade holds back. — Cost if wrong: it pays less than a keen player, so the lean last years are measured with fewer paid answers.
978. The 6.0 tower hand (`setLegacyTowers`, ruling 969) stays for the grand and great-work runs. Four configurations of the real advice with extra habits sank; one great-work run and the grand run held. — Cost if wrong: the 7.0 tower advice is proven by `tests/v70/a` and the late run's raids, but no driver lives with it for ten years.
979. The great-work run keeps the offerings with the Trade sheet's Keep at least from the founding (`keepOfferings`); no run sells those goods, so a test puts them on sale both ways. — Cost if wrong: the floor never binds in the run itself.
980. Three Advice pins are re-recorded with reasons: careless y15 home_need, great work y14 and y16 home_need. — Cost if wrong: the pins say less about the 6.0 city and more about the 7.0 one.
981. No `src/data` number changed. — Cost if wrong: a keen player who answers everything meets the great-work run's thin treasury sooner than the script.

### Wave 3: the final review and fix batches (Opus 5.5 decisions; Sonnet fixes 454693a and 50ecab0)
985. Delete and Backspace act on what the player is looking at. Nothing happens over a dialog, the lesson card, a text field or screenshot mode. With a building's sheet open, Delete presses that sheet's Demolish (with its own question) even when an Undo toast is up. With no sheet open it takes the offered Undo of a placement. Behind any other sheet it does nothing. This replaces ruling 1001. — Cost if wrong: a player who wanted Undo behind a sheet presses the toast's Undo or Ctrl+Z.
986. Delete never undoes a demolish; Ctrl+Z and the toast's Undo still do, and the toast and the placing bar name Delete only after a placement. — Cost if wrong: one other key to undo a demolish.
987. Strike and quarrel holds hold: Resume is refused (`event_hold`) until they end, with words on the sheet ("Stopped by a quarrel until year Y, month N"; quarry: "On strike"). Ruling 423 still covers court cards and scares. — Cost if wrong: a player waits two months for a quarry; the fallback is rewording the cards and dropping the paid choice.
988. Opet offers the full festival only when incense can reach the city (`incenseReaches`: Punt's route is open or a store holds incense). — Cost if wrong: players never see the full festival before Great Capital.
989. Stranded advice with no maker in reach names the Fetch order and its real monthly amount (the step names the maker, the card says "a maker in reach"). — Cost if wrong: one longer line.
990. `heldBackSales` walks the partners in the caravans' order with one running pair of stocks (the post and the Quay share stores), sums the gold and names the largest partner ("Byblos and 1 other partner would pay..."). — Cost if wrong: none beyond code.
991. A pointer click on a speed step blurs it, so Space pauses afterwards; keyboard focus keeps Space. — Cost if wrong: mouse users lose an invisible focus.
992. While chips show, the placing bar's why line carries only what no chip says; the older `reason` line is hidden whenever why parts exist. — Cost if wrong: one rule is read in two places, as before.
993. While placing on a phone, the ghost is framed above the measured bar and the corner buttons (the larger of the two, not their sum, since the corner buttons stand on the bar; the free-map cap is the smaller of 120 px and the ghost's height). — Cost if wrong: the camera moves a little more for every portrait ghost.
994. A phone top bar whose numbers wrap or overflow uses the 150% icon labels (`.iconic`), after clearing a stale 'tight' before measuring. — Cost if wrong: icons instead of words when gold has five digits.
995. Track S's four-line Season row in `sheets.js` (cd8619e) is accepted after the fact. — Cost if wrong: none.
996. The waiting event's low Advice weight stays: its own alert row with View always shows it, and weights are balance's. — Cost if wrong: an event hidden in Advice only.
997. The event card may scroll at 375x667 at 150% text and at 667x375; the rule is no scroll at 390x844 at 100%, and that holds. — Cost if wrong: a scroll at large text.
998. Dimmed sound rows use ink-soft words at 4.5:1 or better, not opacity; Punt's disabled Open route takes the event card's disabled style. — Cost if wrong: none.
999. The score chip over the date at five-digit gold is fixed by 994, not deferred as 6.0 behaviour: a real player reaches five-digit gold. — Cost if wrong: one class and one CSS rule.

### Track P: Josh's playtest fixes (Sonnet, 1b778ba, 4125cb2, 9b66886)
Josh's 23 Oct playtest of 6.0.1 added this track in wave 2 (the plan's "Track P" section). Its numbers ran from 1000; 1004, 1006 and 1007 were not used.
1000. `V70_HELP` gains key `p` (after `a`); `p/all.js` is one line in `tests/v70/all.js`. — Cost if wrong: a rename.
1001. Delete or Backspace is Undo while its toast or a tool's Undo is offered, else presses the open sheet's Demolish (same confirm); never in a field, behind a dialog or card, or with single keys off. Superseded by 985 and 986 after the final review found it undid placements behind other sheets. — Cost if wrong: change one function.
1002. The lesson card (the one exception to "nothing over the map's middle") opens for every step, pauses the game and docks on Show me, Play, Got it, Enter, Space or Esc. 'card' steps replay at the prior speed on dismissal, 'act' steps replay once the player's part is done, 'warning' is the tower step. Placing and the build tray work while paused (tested). — Cost if wrong: data flags.
1003. After the card's Show me on a landscape phone at 125% text or more, the overlay goes off, so the map is not lost. — Cost if wrong: not recorded.
1005. While a sheet is open on a wide screen the build tray and Layers fold, and the sheet starts under the minimap. — Cost if wrong: not recorded.
1008. Placing: `conditionsFor` gains a separate `more` field (no existing shape changed) and `fit.js` gains `waterTilesOf`. The reason line is clamped to two lines (one at 125% text or more) on phones; the chips name the rest. At a compact layout and 125% text or more it is hidden and the drawer is capped to its column and scrolls from the top, so the name and cost stay on screen. — Cost if wrong: a refused drawer at large landscape text scrolls to reach Show me.
1009. P4 covers exactly two states: empty house plots and monument sites before work. It is render only and hooked in `drawMarkers`. — Cost if wrong: not recorded.
1010. Banks are hinted only for water-bound buildings; terrain-bound ones use the Ground overlay. — Cost if wrong: not recorded.
1011. Keys audit: nothing added beyond Delete and Backspace (Esc, Space, ] [ and + - already existed; number keys stay categories). — Cost if wrong: not recorded.

### Edits outside a track's files
- Track S edited `sheets.js` (the summary's Season row, ruling 995) and Track 0's `seams.test.js` and `scenes.test.js` (filling its stubs); Track E edited `cardMoments.js` (906); Track A's wave 1 minors touched T's `tradeSheet.js` and E's `cityEvents.js` files and tests; Track P edited E's `cityEvents.js` (one class for the 44 px Show me), `sheets.js`, Track 0's `seams.test.js` and `tests/v70/all.js` (1000). Each was minimal and reviewed.
- Wave 1 integration fixes (10ffdee): E's festival tests assumed incense was not yet in the game; they now check T's real incense and run the beer-only branch inside `withoutIncense`.
- Commit 2b34e3f (Track S) first carried a Sonnet trailer; every commit on the branch now ends with the one required Opus 5.5 line.
- Items the final review deferred or dropped, with one-line reasons, are in the follow-ups note (`2026-10-23-version-7-0-followups.md`).
- This docs pass: `tests/stage46/ux/releases.test.js`, `tests/stage46/final/riverux.test.js`, `tests/stage47/final/releases.test.js`, `tests/v50/docs/releases.test.js` and `tests/v60/docs/releases.test.js` moved to the 7.0 entry (6.0.1 takes its merge commit 4502f53); new `tests/v70/docs/releases.test.js`.

## Part 19: Version 7.1 (24 Oct 2026)

Branch `version-7-1`, cut from main at 16cda04 (7.0, live). Built in two parallel tracks, M (six new river layouts) and F (ferries), alongside a read-only bug review of 7.0 (logic and UX); then three fix batches, A (events and the lesson card), B (Trade sheet, Settings, How to play, sheets and keys) and C (maps and ferries follow-ups); the branch stood at 0cc83ee before the docs pass. Sources: Track M's and Track F's reports, the bug review's findings and each fix batch's report, in number order. Numbers in a track's range that were never used are skipped (1029-1039, 1049-1059, 1071-1073). The design: `docs/superpowers/specs/2026-10-24-thebes-version-7-1-design.md`; what is still open: `2026-10-24-version-7-1-followups.md`. The final fix batch's rulings (1080 onwards) follow below; the controller appends them.

### Track M: new river layouts (bfaee2d)
1020. About two in three 'auto' picks are a new layout (delta, confluence, twin, wide Nile, cataract, lake-fed). — Cost if wrong: fresh cities on 'auto' get a different layout than in 7.0 (saved cities, share links and records keep their own).
1021. The trade road stays on the south edge on every new layout. — Cost if wrong: no river ever comes in at the south edge.
1022. Raider entries for the new layouts sit on the start's own land, at least 0.4 of the map's side from the start. Relaxed in practice by 1076. — Cost if wrong: raids may arrive sooner than on Classic.
1023. Resources are counted and mended on the start's side of the river only. — Cost if wrong: more mending of the land.
1024. The new layouts' water is drawn the way the oasis pools are. — Cost if wrong: no flood-season wash or water glints on these maps.
1025. A delta's mouths are at least 3 tiles apart, and a Small map gets at most 2 arms. — Cost if wrong: less delta variety.
1026. The older map tests (variants, bridges, hills, rock belts, oases, the resource sweep) now cover only the 7.0 six; a new sweep in `tests/v71/m` covers the new ones. — Cost if wrong: the new layouts miss those checks.
1027. The wide Nile cannot be bridged; its far bank's farmland needs Track F's ferries. — Cost if wrong: not recorded.
1028. The Maps note is an import plus one line in `menu.js`, not a new key in the shared How to play list, because an existing test fixes that list's keys. — Cost if wrong: not recorded.

### Track F: ferries (a2db809)
1040. A ferry is two 1x1 landings (80 gold each, 4 upkeep, one ferryman each, "services" priority), not a card. — Cost if wrong: only if a later change needs world state beyond the optional field, which means a v11 migration.
1041. The two landings together are the price of a crossing. — Cost if wrong: retune `data/ferries.js`.
1042. Fire risk 0.2, desirability -1, shell class 1. — Cost if wrong: one-line data edits.
1043. The road tool says "Too wide for a bridge (N tiles of water): lay a ferry", and Show me picks the Ferry tool at the nearest fit. — Cost if wrong: some wording and Show me tests.
1044. A crossing counts as 3 + ceil(water/3) road tiles. — Cost if wrong: one constant.
1045. Whether a crossing runs is saved on the landings and settled after each labour step, which bumps roadVersion. — Cost if wrong: a stale cache for up to a day (closed for razing, undoing and burning by 1074).
1046. A landing needs any road beside it, and its own tile must be free of road. — Cost if wrong: the refusal wording.
1047. The Ferry card always shows, with no milestone gate. — Cost if wrong: add a gate in `cards.js`.
1048. Under Gentle the boat sits one tile off a bank; under Full it crosses. — Cost if wrong: render only.

### The bug review's fix batches (A, B, C)
The two review agents read the live 7.0 build in a browser: the logic review found one critical bug (the fever card's "Let him in" threw and left a card with dead buttons) and three important ones; the UX review found three important (the lesson card let keys through, Buy at Keep at least 0 bought nothing, the Keep at least line ignored route switches) and eleven minors. Their deferred 7.0 items were ruled in or out in the same pass.

#### Fix batch A: events and the lesson card (31bf467)
1060. The lesson card swallows every key except Ctrl, Cmd and Alt chords, so Ctrl+Z still undoes behind it. — Cost if wrong: undo can fire behind the card.
1061. Marker effects (empty ids, or n 0) refuse paid choices that spare nothing; the sandstorm sweep is also refused when it would save zero. — Cost if wrong: a rare legitimate paid choice is wrongly refused.
1062. `owned` is a new optional field on `court.effects` entries (a player's own pause during a hold), so no save version bump. — Cost if wrong: a later code path ignores it.
1063. The strike and quarrel hold wording says work starts again by itself. — Cost if wrong: only the text.
1064. A Show me is skipped only when no building of the kind stands at all. — Cost if wrong: not recorded.
1065. The event card's default line sits before the choices. At 375x667 and 150% text the test shell's sheet is 292 px, so the line sits 5 px short even on the shortest card; the test asserts it starts in view with at least 24 px under it, and it is fully visible on the real page and on desktop. — Cost if wrong: not recorded.
1066. Dismissing the lesson card resumes play when the step's part is already done. — Cost if wrong: the game plays on straight after dismissal.

#### Fix batch B: Trade sheet, Settings, How to play, sheets and keys (f7293b6)
1067. Buy at Keep at least 0 shows an amber line saying it buys nothing yet, and a route-less row wins over it. — Cost if wrong: a player sees the "no route" line where "raise Keep" would also apply.
1068. A sheet opened by key (a keydown, or a click with detail 0, within the same task) focuses its title, except from the guidance row. — Cost if wrong: a sheet opened by key stops its daily rebuild until a command.
1069. The Keep at least step is 50 from 100 up, and down steps are 50 above 100, so 100, 150, 100, 90. — Cost if wrong: an odd grid near 100.
1070. The "silenced" wording lives in `menu.js`, not `text.js`. — Cost if wrong: the word moves when `text.js` is reorganised.

#### Fix batch C: maps and ferries follow-ups (851a6e7)
1074. `world.js` is outside this batch's file list, but removing a building with a ferry now bumps roadVersion (one line in `removeBuilding`, the only place all removals pass through). — Cost if wrong: a reviewer asks to revert that line, and a `ferries.js` cache key on buildingsVersion would do the link part only.
1075. Delta mouths get 3.5 tiles of extra land between them (`MOUTH_SWAY` in `courses.js`), so new delta maps shift slightly. — Cost if wrong: delta layouts look different from the first 7.1 build, though no saved city changes.
1076. The raider distance is asserted as at least 0.25 for the first two entries, and 0.4 on over 95% of maps, not 0.4 everywhere. — Cost if wrong: ruling 1022 is not enforced as strictly as written.

### Edits outside a track's files
- Track F edited `buildings.js`, `tips.js`, `ui.js`, `createUI.js`, `menu.js`, `v70.js`, `overlays.js`, `thumbs.js`, `serialize.js`, `scenes.js` and the road card and bar code in `placement.js`; `#dock .tray` gained `scrollbar-width: none` so three Roads cards no longer push the tray over the corner buttons; the old "too wide" text, the card, fire and desirability lists, the scene list and the Show me tests moved to the new behaviour.
- Fix batch A changed `tests/v70/e/ui.test.js` and `tests/v70/e/review.test.js` (the quarry noun, the hold wording, Show me with no holder).
- Fix batch B changed `tests/ui/tradeSheet.test.js`, `tests/v70/a/sim.test.js`, `tests/v70/a/ui.test.js` and `tests/ui/createUI.test.js` (View is now a pointer click, because a keyboard open focuses the title); it also folded the key table, Touch, Goals and Tips into How to play sections, and left the Keyboard paragraph's repeated key list in batch A's part of `text.js`.
- Fix batch C added one line to `world.js` (ruling 1074).
- `tests/v71/all.js` takes one line from each track and fix batch.
- The commit trailers all carry the one required Opus 5.5 line.
- This docs pass: the 7.0 build in `src/data/releases.js` is its merge commit 16cda04; `tests/stage46/ux/releases.test.js`, `tests/stage46/final/riverux.test.js`, `tests/stage47/final/releases.test.js`, `tests/v50/docs/releases.test.js`, `tests/v60/docs/releases.test.js` and `tests/v70/docs/releases.test.js` moved to the 7.1 entry; new `tests/v71/docs/releases.test.js`.

The final fix batch's rulings (1080 onwards) follow below.

### Final fix batch (after the final review; 1082 and 1084 were not used)

1080. Ctrl/Cmd+Z and Ctrl+Y (and Shift+Z) stop at the lesson card, so nothing is undone behind it. This replaces the Ctrl+Z part of 1060. — Cost if wrong: a browser chord on those keys is blocked while the card is up.
1081. The Keyboard help says every game key waits while a lesson card is up (P_TEXT.lessonKeys), and the Ctrl+Z line says "except over a lesson card". — Cost if wrong: wording only.
1083. A too-wide refusal fires the ferries tip before the bridges tip. — Cost if wrong: the bridges tip is held back on a too-wide refusal.
1085. After a ferry_bridge refusal (4 tiles of water or fewer), Show me names a bridge (ferryText.js showFitWhat). — Cost if wrong: a label only.
1086. The ferry bar's summary, idle note and idle lines are short ("7 tiles of water · Costs 16 a month"), so the accepted bar is 151 px at 375x667 and 150% text (was 227). — Cost if wrong: less hint text before a line is drawn.

## Part 20: Version 7.1.1 (24 Oct 2026)

"Clearer first steps": a friend's first play on an iPhone (390x844) at "Lesson 11 of 14" (the firehouse card, which follows the large plot) showed the "Large plot placed · Undo" toast sitting on the card's words. Cause: a placement's command ran the lesson's seam first (the large plot finished step 10, so the next card came up) and createUI's afterCommand added the toast after that; the toast (z-index 13) stood above the card (12). The card was not up while the player was placing: the placement itself brought it up. Rulings 1100 to 1119 (1107 to 1109 and 1117 to 1119 not used).

1100. No toast stands over a lesson card. While a card is up, timed toasts are not shown at all (toasts.js `held`: show answers null), the timed ones that are up when a card comes up are dropped (`dropLoose`), and a kept toast (Update ready) is only hidden by CSS (`body.lesson-card-up #toasts { display: none }`) and is back when the card closes. Chosen over moving the toast, since a toast about a step already done adds nothing to a card that says what is next. — Cost if wrong: the "placed" line for the placement that ends a step is never seen; the next card is the only feedback.
1101. Every Undo toast has a close button (✕), 44x44, named "Close this message" (V711_TEXT.closeToast). It hides the toast and does not undo; Undo stays on the placing bar and Ctrl+Z. The timed toast option is `closable`. — Cost if wrong: a phone's Undo toast is 44 px wider, so its words wrap sooner.
1102. A lesson card never comes up while the player is in the middle of a step's action: a finger down on the map (pointerdown to pointerup on #map), or a road, plot or demolish stroke drawn and not yet laid (store line, area or plan). The row shows the step meanwhile; the card comes up when the action ends (the frame and the store's changes check). It comes up once, and not again. — Cost if wrong: a card can be a moment late when a day's tick finishes a step during a stroke.
1103. A placement that completes the lesson's own step offers no Undo: the next card is up, so 1100 holds its toast back, and Undo would only send the player back. A placement part-way through a step keeps its toast, its Undo and its ✕. — Cost if wrong: Undo for that placement is only on the placing bar (once the card is docked) and Ctrl+Z.
1105. Buttons in the middle. `.actions` rows (sheets, the title's panels, the lesson's end, Welcome back, the court, a seal, an event's Read, the picture cards' set), `#dialog .buttons` (Leave the lesson, demolish, Replace city) and the picture cards' Back and Next are centred; a wrapped row stays centred. The lesson card's Show me is full width, Skip and Leave the lesson centred. Left alone: sheet headers' close, the placing bar's icon buttons, the speed and corner buttons, rows of a label with its control. A building sheet's own action row (Another, Demolish) centres with the rest, since it uses the same class. — Cost if wrong: building sheets' buttons moved from the left edge.
1106. Josh's call: Back becomes Continue at the foot of a page read through and then left (What's new's foot button, the install guide's foot button; V711_TEXT.continueLabel). Back stays where it means a step back: the picture cards' Back, a page's top-left Back (What's new's top button), the title's Settings panel and the New city question. — Cost if wrong: the foot and top buttons of What's new say different words for the same action.
1110. The goal in one sentence from the data (V711_TEXT.goal: the first and last rank in MILESTONES and the great work in GREAT_WORK): "Grow a village on the Nile into the Seat of the Two Lands, and win your reign by finishing the great temple." It is the title card's line (under the tagline, above Start the lesson), the opening words of the lesson's first card, and How to play's first entry (open; with the ranks listed in order). — Cost if wrong: a game that grows a different end would show this until the data changes it (it follows the data).
1111. Josh's decision overrides ruling 617 (the lesson as the only way in on a fresh device): the title card keeps Start the lesson as its primary button and adds "Skip, I've played before" below it (a plain secondary button). It marks the lesson done as a finished lesson does (lessonDone, lessonStep at the end, cardsSeen) and shows the usual New city card with its level and size choices, with a note; it does not start a city at once, since the choices exist. No question is asked: the Lesson button plays it any time. — Cost if wrong: one more tap than a straight start.
1112. The lesson's first step card also offers "Skip, I've played before". It asks its own question (like Leave the lesson), No keeps the card with focus on Skip, Yes sets the same three keys and goes straight to a new city of the player's own (the device's level and size), or to the title when a saved city is there (a fresh city would take its place; the question says so). Tips are not marked seen (a finished lesson leaves them fresh too). — Cost if wrong: with a saved city a skip lands on the title, not a city.
1113. How to play's sections are all closed except the goal, which stands open (fix batch B's test now says so). — Cost if wrong: one section is open at first.
1114. The release: "Version 7.1.1" "Clearer first steps" (build 'live', 24 Oct 2026), 7.1's build is its merge commit e032f2c, APP_VERSION is '7.1.1'; the release tests that pin the newest entry moved down one (tests/stage46, stage47, v50, v60, v70, v71 docs) and tests/v711/docs pins the new one. — Cost if wrong: none beyond the tests.
1115. When a lesson card opens, a placing, road or demolish tool still on is put away as Cancel does (ctx.cancelPlacing), so the bar behind the card never shows a refusal for the plot just laid; Show me starts the step's tool afresh. — Cost if wrong: a player who was placing several of one thing has to pick the tool again after a card.
1116. The ferry help no longer promises the boat's motion by level: "a small boat carries people and carts across; with motion still it waits at a landing". — Cost if wrong: wording only.
1120. A cart on a ferry rides a boat of its own, drawn under Full and Gentle (Still keeps it at its door); the crossing's regular boat steps aside while it crosses. Carts and walkers are paced over the crossing's real cost (ruling 1044); rapids are drawn by the cataract's islands and gorge walls only; the 7.1 layouts' water takes the season wash and glints (replaces the render part of 1024). Render only. — Cost if wrong: one render file each.
