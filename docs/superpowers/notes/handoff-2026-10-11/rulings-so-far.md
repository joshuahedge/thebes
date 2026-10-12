# Rulings made on Josh's behalf, 11-12 Oct 2026 (parts 1-8)

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

The Stage 4 rulings (178 on) are not recorded in this file yet, so P1-P16 keep their numbers; renumber them when those are added. Where building a ruling left a choice open, this is what was done (the calls were made from the design note's rulings and section 2; every one is cheap to change).

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
