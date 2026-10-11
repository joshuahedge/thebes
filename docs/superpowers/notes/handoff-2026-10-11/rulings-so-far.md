# Rulings made on Josh's behalf, 11 Oct 2026 (parts 1-4)

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
