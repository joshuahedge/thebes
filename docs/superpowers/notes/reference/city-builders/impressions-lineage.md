# Impressions / Sierra lineage: design reference notes for Thebes

- **Scope:** Pharaoh (1999) and Pharaoh: A New Era (2023 remake), Caesar III (1998) plus its open-source engines Julius/Augustus, Caesar IV (2006), Zeus: Master of Olympus (2000), Emperor: Rise of the Middle Kingdom (2002). Children of the Nile is out of scope (another agent has it).
- **Date read:** all sources read 11 Oct 2026.
- **Method:** web search plus page fetches of reviews, fan wikis (HeavenGames, Caesar III Augustus Handbook), walkthroughs, Steam discussions, the Julius source code and wiki. No browser automation, no downloads.
- **Caveats:** IGN, Eurogamer, Rock Paper Shotgun, GameSpot review pages, StrategyWiki, MobyGames and the Impressions Fandom wiki all blocked the fetcher, so verdicts from those outlets come second-hand via Wikipedia's reception tables. Player-forum claims are labelled as such. Anything not confirmed by a source is marked UNVERIFIED.
- **Note:** one fetched page (tcrf.net "Pharaoh (Windows)") contained text aimed at AI agents instead of game content; it was ignored and nothing from it is used here.

---

## 1. Pharaoh (1999) and Pharaoh: A New Era (2023)

Pharaoh (Impressions Games / Sierra, 1999) is Caesar III's engine and rules moved to Egypt, with the Cleopatra expansion (BreakAway, 2000). Pharaoh: A New Era (Triskell Interactive / Dotemu, 15 Feb 2023, Windows only) is a full remake on a new codebase that bundles both, at 50+ missions (PCGamesN counted 53) and "100+ hours".

### 1.1 Visuals

- **Original art direction:** 2D fixed isometric, warm sand-and-stone palette, dense walker traffic. A finalist for Outstanding Achievement in Art Direction at the 3rd Interactive Achievement Awards (Wikipedia). One Caesar III fan review calls Pharaoh "cartoonish" next to Caesar III's red-roofed Roman houses (Dedoimedo).
- **Remake art:** every sprite was redrawn by hand at 4K. Buildings stay instantly recognisable to veterans, and painted frescoes are now visible on buildings. Animations have many more frames, so walkers move more smoothly, but at almost exactly the original speed (PCGamesN, Dec 2021). PCGamesN calls the result more readable than the original.
- **Reaction to the remake art was split.** Gaming Trend and Shacknews praised the detail and liveliness. NPR (via Wikipedia) and WayTooManyGames said it looks like a mobile game; WayTooManyGames compared it to The Simpsons: Tapped Out and scored graphics 6/10. Gamepressure's review roundup found the "cartoonish" look divisive.
- **Monuments as visible long projects:** monuments are huge (pyramids from 8x8 up to 24x24 tiles, the Mausoleum 8x22, the Sphinx 6x18) and need guilds of stonemasons, bricklayers and carpenters plus work camps (HeavenGames monuments page). A player review says a pyramid complex can take nearly two hours of play to finish. A design-student analysis (Krasnianski, Uppsala) notes he finished his city before the pyramids, so he built the city around them. Whether each construction stage is visibly drawn layer by layer is UNVERIFIED from sources (it is widely remembered that it is).
- **Remake monument change:** a Steam player notes stone-puller teams were replaced by carts that need a road to the monument site (player report, Mar 2023).
- **Visible stock and crops:** storage yards are 3x3 and granaries 4x4 (player report). That stored goods show as piles on the yard's tiles, and that floodplain crops show growth stages, is UNVERIFIED (consistent with Caesar III, where at least one source says farm growth is visible on the map).
- **Festival feedback:** Krasnianski points out that festivals grow visibly with the city. An early festival has a few priests and a juggler; later ones fill the square with entertainers, priests and scribes, one from each new temple, school or noble house. A nice "your city grew" signal that needs no numbers.
- **Remake readability gaps at launch:** fixed camera with no rotation, so small buildings can hide behind the Sphinx or pyramids (Shacknews). Zoom-out was too limited (Steam players); one viewing angle per sprite.

### 1.2 UX

- **Original HUD:** a right-hand control panel with build-category icons, a colour-coded "radar" minimap whose colours change with the active overlay, a messages scroll, an ankh icon that reopens the mission brief, undo, and a "cycle through trouble spots" button. Advisors are called **Overseers**, a set of panels by area (workers, religion, food, treasury and so on), and some city-wide commands live there (Wikipedia; TCRF demo-vs-final notes via search summary).
- **House info panel:** clicking or right-clicking a house tells you what is stopping it evolving: the next good, service or desirability level. Every walkthrough's first tip is to use it (Sierra Help walkthrough; KosGames remake guide).
- **Walker model:** two kinds of walker. *Random walkers* (fire marshals, architects, priests, bazaar sellers, doctors, police) follow a road and pick a random branch at each junction, then head home after a set distance. *Destination walkers* (cart pushers, immigrants, market buyers, entertainers going to venues) take the shortest path. Roadblocks were new to the series in Pharaoh and only stop random walkers. Houses must be within 2 tiles of a road (KosGames; Steam player explanation).
- **Remake layout:** building categories on the right, analytics (treasury, worker distribution) on the left. The Egyptian-style font was swapped for a plainer, more readable one, with fewer wasted clicks (MP1st).
- **New remake tools:** global labour pool, workers tooltip, copy-paste buildings, a Nilometer flood indicator, population-mood indicators (Steam store page). Service buildings show a green spawn square and a red return square on the road when placed. The Overseer of Workers has per-category hiring priorities (KosGames; Steam players).
- **Accessibility and options (EIP review):** resolution scaling, per-channel volume, full key rebinding, colourblind-friendly design, no flashing lights in the core loop, and mostly one-handed play. There is a difficulty slider (its effects were unexplained in the review build) plus toggles for recruiters, age simulation, dangerous wildlife, cheats and autosave frequency.
- **Launch UX complaints (Steam, Feb–Mar 2023):** no minimap even though the 1999 game had one; no rotation; mission objectives could be dismissed like ordinary notifications (reported since the demo); players kept clicking through categories to find a building; advisor screens and overlays felt barebones; "too many pop-up notifications". Vaporlens' aggregate of Steam reviews puts "clunky, unintuitive UI" as the second most common complaint after bugs.
- **Patch response:** about a month after launch, with Steam reviews down to ~62% positive, Triskell announced a clickable minimap, readability fixes and balance changes (GRY-Online, 9 Mar 2023). A developer reply around 21 Mar 2023 reportedly confirmed the minimap plus an unlimited-zoom option (seen via search summary, not read directly). A mission editor and "defensive zones" came later in 2023. The store page now reads Mostly Positive, 75% of 2,493 English reviews.
- **Ports:** no console, Switch or mobile version of A New Era was found; Wikipedia lists Windows only. Limited Run sold a physical PC edition in 2024. So there is no official touch or controller adaptation to learn from (see Julius under Caesar III for touch).

### 1.3 Game design

- **Ratings:** five mission targets: Population, Culture, Prosperity, Monument, Kingdom. Kingdom replaced Caesar III's Favor and Monument replaced Peace (Wikipedia). Culture is the one players find hardest to read; players say it counts venues relative to population (Steam players).
- **Housing ladder:** 20 levels from Crude Hut to Palatial Estate. Requirements stack: well, then market food, then one god, then a water supply, entertainment points, pottery, physician, beer, courthouse, scribal school, dentist and a second food, linen, a second god, luxuries, mortuary, library and a third god, and finally three foods and two luxuries. Footprints grow: 2x2 at Common Residence (level 11), 3x3 at Common Manor (15), 4x4 at Modest Estate (19) (HeavenGames housing levels). A beginner guide warns that houses "not in fours" will not grow because they need neighbouring huts to merge (Gamepressure guide).
- **Workforce trap:** from Common Manor up, residents become scribes and leave the labour pool, so a successful upgrade can starve your industry (HeavenGames). The remake's "Age Simulation" mode also withdraws scribal houses; its "Fixed Worker Ratio" mode simply makes 40% of the population workers (KosGames; MP1st).
- **Nile and farming:** farms must sit on dark floodplain, and the annual flood's quality (influenced by the god Osiris) sets fertility. Reviewers single this out as historically grounded and "legible" (EIP; Sierra Help walkthrough).
- **Gods:** five gods, each with a satisfaction bar. Neglected gods bring disasters; the city's patron god needs more shrines than any other (Gamepressure guide; Wikipedia).
- **Labour and recruiters (original):** a building sends a recruiter who must pass within 2 tiles of a house to find workers. The remake's optional **Global Labor Pool** removes this, so any road-connected building draws from the whole city. Players called it the most popular change because you no longer need slum housing next to industry (KosGames; Steam players; Wikipedia notes it mirrors Zeus).
- **Remake stability fixes players noticed:** houses no longer flip up and down a level because a bazaar seller happened to walk the other way (player claim). The guide confirms a grace period before devolution after a good or service is lost (KosGames).
- **Kept on purpose:** the developers kept "soft exploits" in walker routing that experts used: "there are ways to never have to use roadblocks" (Triskell developer via PCGamesN, Nov 2020).
- **Depth vs tedium:** depth comes from the stacked ladder, the river cycle, monuments and trade. Tedium comes from walker logistics: WayTooManyGames says weak patrol AI forces roadblocks just to get goods into storage. PC Gamer's 2017 revisit (author UNVERIFIED) called it brutal despite looking simple, a game that sits on the line between frustration and challenge.

### 1.4 How it teaches the early game

- **Structure:** the first historical period (Predynastic) is the tutorial. In later periods you pick a peaceful or a military mission and only need to finish one. Each mission starts a new map from scratch (Wikipedia; Gamepressure guide).
- **Mission 1, Nubt:** most building categories are locked. You lay houses (any more than 2 tiles from a road vanish) and give them water. Hunting unlocks once population reaches 150, which brings the hunting lodge, granary and bazaar. Then firehouses, or the town burns. Goal: population 300 and 6 Meager Shanties (Sierra Help walkthrough). Sources disagree: HeavenGames says population 150, and a remake player says there is no population goal at all, just six level-3 houses. The walkthrough's main diagnostic tip is to click the house; the most common stall is that early utility buildings (huts, granaries, bazaars, lodges) lower desirability.
- **Mission 2, Thinis:** population 500, Culture 10, 10 Ordinary Cottages. Introduces gold mining and deben (money), the palace, the first god (Bast) and juggler booths, which must sit on crossroads (Sierra Help).
- **Mission 3, Perwadjyt:** population 600, 10 Modest Homesteads. Introduces floodplain farms, work camps, clay pits and potters into a storage yard, gardens, statues and plazas, and later roadblocks (Sierra Help; HeavenGames).
- **Mission 4, Nekhen:** population 1,000, 10 Modest Apartments, on an arid map where water placement is the puzzle.
- **Remake teaching:** maps and missions are unchanged (Gaming Trend). Shacknews notes there is no separate tutorial: the campaign adds one tool at a time and a glossary is always available. EIP found the tutorial pop-ups funny, but trade setup badly explained. WayTooManyGames called the tutorial decent but never-ending. MP1st called mission goals vague.
- **What the first ten minutes ask:** zone houses, connect them to a road, get water to them, wait for 150 people, then add food. That is roughly three decisions, gated by a population threshold, with the house panel as the main feedback.

### 1.5 Reception

- **1999 original:** GameRankings 82%. IGN 9/10, GameSpot 8.2, PC Gamer US 83%, Eurogamer and CNET 7/10, Computer Gaming World 4/5. NextGen praised the blend of pyramid building and floodplain management. Combined Caesar III + Pharaoh sales passed 1 million by July 2000 (all via Wikipedia).
- **Remake:** Metacritic 76 from 26 critics, but a user score of 4.0 (18 ratings); OpenCritic 69% recommend.
  - Rock Paper Shotgun (via Wikipedia): short on modern complexity, but "the definitive version of a stone-cold classic".
  - Shacknews 8/10: easy to grasp, hard to master, lots of ways to soften difficulty. But some old-fashioned parts, unclear placement rules (reed gatherers) and confusing import/export.
  - EIP 8/10: very hard; the UI is accessible but generic, more Civilization VI than Egypt; house-need messages sometimes wrong (claimed no religion access next to shrines).
  - MP1st 8/10: cleaner UI and fewer wasted clicks, but statistics overload and simplified battles.
  - Gaming Trend 100/100: improved UI that keeps the original's simple layout.
  - WayTooManyGames 7/10: much better UI and faster play, but mobile-looking art and heavy micromanagement.
  - NPR (via Wikipedia): buggy and mobile-looking, but still a rewarding city builder.
- **Players:** Steam reviews dipped to ~62% a month in, then recovered to ~75%. The top complaints are bugs, the UI, "too easy" (once the new difficulty options are used) and the stripped-down military.

### 1.6 For Thebes

- **Borrow: the "what is stopping this house" panel.** It is the lineage's single most-recommended tool; Thebes's next-tier checklist is the same idea and should stay one tap away.
- **Borrow: population-gated unlocks in the first session** (Nubt unlocks food at 150 people). It shrinks the first build menu to a handful of items without a separate tutorial mode.
- **Borrow: a global labour pool.** It was the remake's best-liked change and it matches "reach along roads"; never make the player build slums next to workshops.
- **Borrow: a grace period before a house drops a tier.** It stops flicker and the panic notifications that come with it.
- **Adapt: visible project progress on monuments.** Show stages and delivered materials on the map, not just a percentage, but keep footprints phone-sized; a 24x24 pyramid that hides buildings behind it breaks "nothing over the middle of the map".
- **Adapt: festivals or celebrations that visibly grow with the city.** A cheap, number-free milestone signal that would pair with Village/Town banners.
- **Adapt: a "cycle through trouble spots" button.** The phone version is a "Show me the problem" chip that pans to the next unhappy house or idle workshop.
- **Skip: random-walker routing and roadblocks.** Even the remake's developers concede experts route around it; it is the root of most stall-and-flicker complaints.
- **Skip: dismissable objectives.** Goals must never live in the notification stream (the remake's launch mistake); Thebes's goals strip already avoids this.
- **Skip: a generic modern UI skin.** Reviewers punished the remake for losing its Egyptian identity; plain English, yes, but keep visual character in the frames and icons.

---

## 2. Caesar III (1998)

Impressions Games / Sierra, 1998. This is the template the later games copy.

### 2.1 Visuals

- 2D isometric, Mediterranean palette with red-tiled roofs. Reviewers praised buildings as lovingly detailed and animated, with streets busy with 22 kinds of Romans (Well.com review). Dedoimedo found the red-roofed houses "just look so right".
- Farms visibly grow their crops, and a cart worker hauls the harvest to a warehouse or granary (search summary of a Caesar III guide; partly UNVERIFIED). Warehouse contents shown as stacks per tile: UNVERIFIED.
- Housing reads by size and material: tents, then shacks, hovels, casas, insulae, villas, palaces, with larger footprints at the top (Large Insula needs a 2x2 plot, per a guide snippet).

### 2.2 UX

- **12 advisors** plus overlays. While an overlay is active you cannot see the buildings it refers to, so you keep flipping views (Well.com).
- **Right-click everything:** buildings give a status summary, and citizens say what they are doing, often complaining about you. The developers' demo readme says players should learn by reading on-screen messages and right-clicking (Caesar III demo readme via search; Caesar III Augustus Handbook).
- **Walker frustrations:** Caesar III had no roadblocks. People starve next to food, and entertainers wander off down winding roads, so players learn to build only straight roads (Well.com; Dedoimedo; GOG players call walkers the game's biggest weakness).
- **Julius / Augustus (open-source engines that need the original data files):**
  - Julius keeps the original rules but adds widescreen, configurable hotkeys, building while paused, "go to problem" buttons on more message types, a monthly autosave, tooltips (religion overlay shows which gods a house reaches; the Senate shows unemployed and needed workers), and a fountain placement preview that shows reservoir access (Julius wiki).
  - Julius runs on Windows, Linux, macOS, Android, Switch, PS Vita and in the browser.
  - Augustus adds gameplay changes: a global labour pool, roadblocks, market special orders, partial warehouse storage, higher limits and zoom (Augustus README).
- **Julius touch controls, the best concrete phone reference in this lineage (Julius "Touch support" wiki):**
  - One-finger drag pans the map. During construction normal panning is off, and pressing near the screen edge scrolls, faster the closer you are to the edge.
  - Tapping a simple building shows a ghost; tap the ghost to confirm, tap elsewhere to move it, or drag it.
  - Roads, walls and housing zones work as press for the start point, then drag or tap an end point, then tap the end tile to confirm. Either end can be adjusted.
  - A **Cancel build** button appears whenever something is selected. For drag-builds the first press clears the pending range and the second leaves build mode.
  - Press-and-hold shows a tooltip. Tap a tile for info; double-tap to close windows.
  - Gaps: no pinch-zoom and no right-click equivalent are documented. Julius 1.7 added an on-screen pause button for touch devices, and tablets got a display-scale setting in 2025 (GamingOnLinux).

### 2.3 Game design

- **Ratings:** Culture, Prosperity, Peace, Favor, plus a population target. Favor depends on meeting Caesar's tribute and gift requests on time (Wikipedia).
- **Career:** 15 ranks from Citizen to Caesar. After the first two assignments, each rank offers a peaceful map (stricter targets plus earthquakes, fires and similar hazards) or a military map (invasion risk) (Caesar III Augustus Handbook; Wikipedia).
- **Housing:** 20 levels from small tent to luxury palace. Requirements stack: water, then food, then a temple, basic education, fountains and entertainment for casas, then pottery and baths, then furniture and oil for insulae, then wine. Villas house far fewer people, so upgrading can make people homeless; patricians stop working but pay more tax. The full level list is UNVERIFIED in sources; the tiers named here are confirmed.
- **Services:** prefects stop fires, engineers stop collapses, plus markets, temples (five gods), schools, theatres and baths. Every building except water structures, parks and statues needs road access, and most need workers recruited from nearby housing.
- **Difficulty:** five levels, very easy to very hard, confirmed in the Julius source (difficulty.c), which reimplements the original rules.

  | Level | Money | Enemy strength | Starting favour | Sentiment |
  |---|---|---|---|---|
  | Very easy | 300% | 40% | 70 | 80 |
  | Easy | 200% | 60% | 60 | 70 |
  | Normal | 150% | 80% | 50 | 60 |
  | Hard | 100% | 100% | 50 | 50 |
  | Very hard | 75% | 120% | 40 | 40 |

  "Hard" is the unscaled design baseline. Note that two fan reviews (Well.com, Dedoimedo) claim there is no difficulty setting; the code says otherwise, so they probably missed the options menu.
- **Depth vs tedium:** depth comes from supply chains, mixed housing and ratings. Tedium comes from road-layout puzzles forced by walker randomness, and from expensive, weak combat (GameSpot called combat the weakest point, via Wikipedia).

### 2.4 How it teaches the early game

- **Tutorial 1, "A Village is Born" (Citizen rank):** the only goal is population 150. You build houses near the red entry post, then a prefecture, an engineer's post and a senate (HeavenGames walkthrough). Most build options are locked for the first two cities. Population stays near 100 until a scripted trigger brings a wave of settlers (player Let's Play via search).
- **Tutorial 2, Brundisium (Clerk rank):** population 650, and the opening task is a granary and wheat. Buildings unlock in order as you go: reservoirs and fountains (needed to evolve housing), then schools, theatres, gardens and baths, then clay pits and potters (HeavenGames).
- **Design stance:** the 1998 demo readme says the career introduces elements step by step instead of forcing a separate tutorial.
- **Learning curve:** a forum thread says many players quit around the third mission, the first peaceful/military choice. Dedoimedo quit the campaign after three or four of its ten missions. The Well.com reviewer said you start in at the deep end.

### 2.5 Reception

- Computer Gaming World 4.5/5, IGN 8.7, GameSpot 7.9, PC Zone 92. Praise went to visuals and supply-chain depth; criticism to the military. Sold 400,000 by January 1999; designer David Lester later estimated ~2.5 million lifetime (Wikipedia).
- Fan retrospectives call it addictive and well paced, but the "only hard" feel and road-layout fragility drive people off (Dedoimedo; Well.com).

### 2.6 For Thebes

- **Borrow: the first mission is one number.** "Reach 150 people" with a tiny build menu is the cleanest opener in the lineage.
- **Borrow: unlock order as curriculum** (water before schools before baths before pottery), revealed as you need it.
- **Borrow: Julius's touch grammar.** Ghost, then tap to confirm; drag-to-range with an adjustable end; an always-visible Cancel; edge-scroll while placing. These are directly usable for phone placement.
- **Adapt: talking citizens.** A tapped resident giving one plain-English line ("No bread at the market this week") is cheap diagnosis with character; keep it in the single info panel, not as floating speech over the map.
- **Adapt: difficulty as money and threat multipliers** (300%..75% money, 40%..120% enemies). It is simple to implement and explain.
- **Skip: overlays that replace the city view.** If Thebes uses overlays, tint over the real buildings.
- **Skip: peaceful-vs-military branching.** It roughly doubles content and is where players drop off; one continuous city fits Thebes better.

---

## 3. Caesar IV (2006)

Tilted Mill Entertainment / Sierra (Vivendi), Sept 2006. The lineage's move to 3D, by many of the same people (Chris Beatrice designed it).

### 3.1 Visuals

- Free 3D camera instead of fixed isometric. GOG players note you can zoom from a single citizen out to the whole city. Roads and buildings can run at 45 degrees as well as on the grid (Wikipedia).
- GamesFirst called it the best-looking entry: bright, animated buildings, day/night shading and weather. Worthplaying found worker animations limited (many workers repeat one animation). Both flagged heavy performance demands.
- The fine placement grid is invisible, and few buildings are smaller than 6x6, so players discover years later that a district is packed too tight (GOG players).

### 3.2 UX

- The UI is "ridiculously huge" (GamesFirst), and the build menu stays open after you pick a building, which shrinks the view while laying roads and walls.
- Service buildings have a working radius you cannot see until after placing; you place, check the overlay, and undo, and undo sometimes failed (GamesFirst; Worthplaying).
- Advisors give plenty of figures and controls (GamesFirst), but a GOG reviewer says they miss crucial facts.
- Clicking citizens gives dialogue that hints at problems such as hunger (GamesFirst).
- GOG players add: awkward interface proportions, no "continue" save button, blurry 2D interface art.

### 3.3 Game design

- **Three social classes with separate housing:** plebeians (labour; basic food and goods), equites (skilled workers who staff markets, clinics and services, and leave if their jobs go unfilled), and patricians (no work, most tax, want luxuries and entertainment) (Worthplaying; bit-tech via search).
- **Coverage model:** range-based instead of roaming walkers. Amenities and utilities have a radius, and GOG players describe residents walking out to markets, theatres and the Colosseum within range. Housing no longer needs to be near its employers. Players saw both as fixing Caesar III's biggest frustration. Cart pushers still haul goods between camps, warehouses and depots.
- **Content:** ~100 buildings, 30+ tradable goods, 10 industries, 4 markets, 75+ character types (GOG store).
- **Problems:** a single disconnected road tile counts as road access; full warehouses silently block new goods; objectives repeat a few archetypes (Worthplaying). Maps feel cramped, which turns layout into a Tetris-like puzzle (GOG players).

### 3.4 How it teaches the early game

- Three chapters named after Roman eras: **Kingdom** is the tutorial; **Republic** and **Empire** are the campaign, with peaceful or military assignments (Wikipedia). Worthplaying describes tutorial, normal and hard campaigns.
- Reviews say the tutorial helps series fans but does little for newcomers (Worthplaying). GOG players call the tutorial maps cramped and the tutorial inadequate.
- The specific content of the Kingdom missions is UNVERIFIED (no walkthrough reachable).

### 3.5 Reception

- Metacritic 74 ("mixed"). PC Zone 73, Computer Games Magazine 4/5, Good Game 6/10 and 8/10 (Wikipedia). Worthplaying 7.7. GamesFirst 3/5. GOG players 4/5 from 106 reviews.
- **Praise:** deep economy, 3D city life, music, lots of content.
- **Criticism:** crashes, lag, the bulky UI, repetitive scenarios, weak combat.

### 3.6 For Thebes

- **Borrow: coverage by range plus residents walking to services.** It is the closest ancestor of Thebes's "reach along roads" and was received as the fix for walker pain.
- **Borrow (critical): show the reach before you place.** Caesar IV's biggest UX miss was hiding service radius until after placement; Thebes's placement ghost should paint reached houses live.
- **Adapt: separate worker and non-worker classes.** Useful depth, but make the trade-off visible (Thebes tiers 6-9 merges should say "these residents stop working" before the merge, not after).
- **Skip: a free 3D camera and fine invisible grids.** Bad for a five-minute phone session; a fixed isometric grid with chunky footprints reads better on a small screen.
- **Skip: build menus that stay open over the map.** Thebes's "one panel open, nothing over the middle" pillar is exactly the fix reviewers asked for.

---

## 4. Zeus: Master of Olympus (2000)

Impressions Games / Sierra, Nov 2000, lead designer Chris Beatrice. The Poseidon expansion followed in 2001.

### 4.1 Visuals

- 2D isometric, deliberately lighter and more cartoonish than Pharaoh; GameRevolution enjoyed the "cool little cartoon Greeks". RPS's Alice Bell (via Wikipedia) praised its "perfect balance of beauty, difficulty, detail, and puns".
- Gods physically walk into the city, and heroes and monsters roam the map, so the mythology is shown on the map rather than in menus (Beatrice interview, HeavenGames).
- Water carriers and agora peddlers visibly deliver goods to doors (GameRevolution).

### 4.2 UX

- Side panel plus menus for taxes and wages, with micro-management of government settings (Wikipedia).
- The housing-block culture continued: HeavenGames hosts 35+ community block layouts and a block generator. This is a sign that players still had to engineer around walker coverage.
- Walkers still pick random directions on leaving their building and return by the shortest route, ignoring roadblocks on the way back (GOG forum explanation).

### 4.3 Game design

- **Setting shift:** you rule an independent city-state, not an imperial servant. Other cities are living actors: colonies, allies, rivals, tribute, gifts and demands. Trade depends on your standing with a city rather than paying to open a route (Beatrice interview).
- **Housing simplified hard:** two separately zoned tracks. Common housing has 7 levels (Hut 8 people, Shack 16, Hovel 24, Homestead 32, Tenement 40, Apartment 48, Townhouse 60); needs are food, then water and culture, fleece, olive oil, and appeal. Elite housing has 4 levels (Residence 6, Mansion 10, Manor 16, Estate 20) and needs wine, armour, horses, all culture and high appeal. Elite plots cost food, fleece and oil to found. Common can never become elite (HeavenGames housing levels; GiantBomb via search). That is 11 levels against Pharaoh's 20.
- **Labour pool:** no recruiting walkers. The share of citizens who work is set by difficulty and wage rate, from 27% (Olympian, no wages) to 57% (Beginner, very high wages) (HeavenGames worker percentages). Elite residents do not work.
- **Difficulty:** five named levels, Beginner, Mortal, Hero, Titan, Olympian. They also scale building costs (an agora costs 25/40/50/60/75 from Beginner to Olympian) (HeavenGames).
- **Distribution:** the agora is a roadside market whose shops are stocked from storehouses and granaries; a peddler then roams the streets. Agoras add +12 desirability, granaries −12 (HeavenGames distribution).
- **Gods, heroes, monsters, quests:** gods compete for worship and can bless buildings or attack you. Monsters work like disasters you solve by hiring the right hero, and some goals are hero quests.
- **Combat** was again the weak spot (Wikipedia).

### 4.4 How it teaches the early game

- **Adventures, not one-off maps:** an adventure is a chain of episodes in the same city, with colony side-maps. The first adventure, *Zeus and Europa*, is set in **Thebes**:
  - Thebes 1: population 1,000.
  - Thebes 2: produce 48 marble a year.
  - Thebes 3: an Ares sanctuary, 50 people in elite Residences, and food and oil shipped to a colony.
  - Thebes 7: 11 trading partners and 2,000 drachmas yearly profit.
  - Thebes 8: rule three cities, 4 sanctuaries, and 100 people in Estates (HeavenGames walkthrough).
  - GameRevolution confirms you keep growing the same Thebes through the campaign.
- **Tutorial:** whether Zeus has a separate tutorial scenario is UNVERIFIED. HeavenGames lists only "The Demo" before Zeus and Europa, and GameRevolution mentions no tutorial.
- GameRevolution found it complicated, the manual fanciful but unhelpful, and the whole thing "more work than fun" at times.

### 4.5 Reception

- Metacritic 87, the lineage's best. IGN 9.1, GameSpot 8.6, Eurogamer 9/10, GameSpy 90%, Game Informer 8.5, PC Gamer US 68% (Wikipedia). GameRevolution was lukewarm (convoluted, unhelpful manual).
- NextGen: finely tuned and, above all, fun (via Wikipedia). Combat was criticised. The game was later recommended by Poland's education ministry as a history teaching aid.

### 4.6 For Thebes

- **Borrow: one persistent city across "episodes".** Zeus's Thebes 1 to 8 is a direct precedent for Thebes's single city with milestone banners and goals; each new goal set feels like a chapter.
- **Borrow: a shorter ladder per track.** Zeus cut 20 levels to 7+4 and is the best-reviewed game here; Thebes's 9 tiers is in that zone.
- **Borrow: a labour pool as a single percentage.** "About 4 in 10 people work" is explainable in plain English; wages as a lever is a nice later-game dial.
- **Adapt: separate elite plots that must be founded with goods.** It maps to Thebes's 2x2 merges at tiers 6-9 (a merge could cost a delivery of figs, linen and pottery, shown in the checklist).
- **Adapt: trade gated by standing, not just a fee.** It gives caravans a relationship arc instead of a menu toggle.
- **Skip: roaming peddlers as the distribution channel.** Keep markets as reach-along-roads.
- **Note:** Zeus's first adventure city is also called Thebes. It is not a conflict, but worth knowing when people search for the name.

---

## 5. Emperor: Rise of the Middle Kingdom (2002)

BreakAway Games with Impressions / Sierra, 2002. The last 2D-sprite game in the series and the first with multiplayer.

### 5.1 Visuals

- Vivid, colourful sprites, with buildings about 25% larger than earlier entries and almost every building animated (GameWatcher). Nine animal types roam (one tiger seemed to ski when attacking).
- Monuments (Grand Pagoda, Grand Canal, Great Wall and others) need full material chains (GameWatcher).

### 5.2 UX

- **Feng shui placement feedback:** while placing, the building footprint turns green for harmonious or yellow for inauspicious terrain. A city-wide Aesthetics rating runs from "Perfect Harmony" down to "China shamed" (HeavenGames feng shui).
- A folded reference card for newcomers; Open Play settings for disasters, density, difficulty and random seed (GameWatcher).
- **Multiplayer:** up to 8 players, co-op or competitive. It autosaves every six in-game months, and AI takes over a dropped player's city (GameWatcher). Dark chat text was hard to read.
- GameSpot (via search excerpt): aimless walker wandering felt less tolerable by 2002.

### 5.3 Game design

- Seven campaigns spanning ~3,300 years (Xia to Song/Jin), playable in any order with difficulty rising chronologically (Wikipedia).
- **Housing:** common and elite blocks, each served by market squares with shops (common squares reportedly hold 4 shops and grand ones 6: UNVERIFIED snippet). Elite housing supports the army (GameWatcher). Tier names include Plain Cottage (22 people), Attractive Cottage (31), Spacious Dwelling (41) and Elegant Dwelling (HeavenGames walkthroughs).
- **Feng shui:** every building has one of five elements (earth, metal, water, wood, fire), each mapped to terrain (rock, ore, grass and water table, trees, arid land). Harmony depends on the terrain under and around the building. A design student called it the most engaging addition because it made him care about layout (Krasnianski).
- **Heroes and deities** can be ordered to bless specific buildings instead of wandering at random (Krasnianski). Spies sabotage and are caught by spotting walkers that are out of place.
- **Farming:** larger farms grow several crops for year-round food (GameWatcher). Crops follow the seasons (ITWeb).

### 5.4 How it teaches the early game

- **Xia campaign = six tutorial missions, in one continuing town (Banpo)**, each named for its lesson (HeavenGames, GillB walkthroughs):
  1. *Shelter and Sustenance*: 150 people in Plain Cottages or better (about 7 houses). On-screen instructions cover water, bland food and ancestor worship. Starting cash is 3,000 on very easy, 2,000 on easy to hard, and 1,600 on very hard.
  2. *Seeds of Civilization*: 250 people in Attractive Cottages. Adds millet farms (a second food) and hemp (clothing).
  3. *The Good Things*: 400 people in Spacious Dwellings plus two months of hero homage. Adds herbalists, musicians, kilns (clay to ceramics) and watchtowers.
  4. *Trading and Commerce*: 500 people in Elegant Dwellings, 1 trading partner, and 4 jade carvings made in one calendar year from imported jade. A gift of jade arrives mid-mission to prime the chain.
  5. *Erlitou's Elite* (elite housing). 6. *Men of Arms* (military).
- Goals are identical at every difficulty; only starting money changes (GillB). ITWeb said the six missions cover all the essentials. A community FAQ calls the tutorial useful but incomplete.

### 5.5 Reception

- Metacritic 77. IGN 8.8, GameSpot 7.7, Game Informer 9.25, GameZone 9.3, PC Gamer US 72% (Wikipedia). GameWatcher 8.0.
- The common criticism was lack of originality versus earlier Impressions games. ITWeb found the music repetitive and later missions a steep jump, sometimes forcing a fresh city.

### 5.6 For Thebes

- **Borrow: lesson-named chapters in one continuing town.** Shelter, then a second food, then goods, then trade, then elite housing is almost exactly Thebes's grain, figs, pottery, beer, linen, caravans arc, and each Thebes goal set could carry a plain-English chapter name.
- **Borrow: goals as "N people in tier X or better".** It ties population and quality into one number and maps onto Thebes's tier ladder.
- **Borrow: priming a chain with a gift.** Free jade arrives so the player sees the workshop run before trade is needed; Thebes could gift a first caravan load.
- **Adapt: green/yellow placement tint as the only placement feedback.** Thebes can use the same tint for desirability or reach while placing, which costs no extra panel.
- **Skip: feng shui as a full extra rating.** Charming, but another invisible score; Thebes's desirability already covers "nice neighbourhood".
- **Skip: multiplayer.**

---

## 6. Early-game teaching patterns in this lineage

1. **No separate tutorial mode; the first campaign chapter is the tutorial.** Caesar III (two tutorial cities), Pharaoh (Predynastic period), Caesar IV (Kingdom chapter) and Emperor (six Xia missions) all teach through real missions with real goals. The Caesar III readme says this was deliberate.
2. **Locked build menus that open by threshold.** Pharaoh unlocks food at 150 people; Caesar III's Brundisium unlocks fountains, then schools, theatres, gardens, baths, then pottery. The player never sees a full menu in hour one.
3. **First goal is a single, countable target.** 150 people (Caesar III); 300 people and 6 Meager Shanties (Pharaoh); 150 people in Plain Cottages (Emperor). Quality-qualified population ("N people in tier X or better") is the lineage's favourite goal shape.
4. **One new system per mission, named for it.** Emperor does this most explicitly (Shelter and Sustenance, Seeds of Civilization, The Good Things, Trading and Commerce). Pharaoh does the same implicitly (money and gods, then farms and industry, then water scarcity).
5. **The continuing city wins.** Emperor's Banpo and Zeus's Thebes carry one city through several goal sets. Pharaoh and Caesar III restart on new maps, and players report dropping off around mission three, when a fresh city meets a branching choice.
6. **Diagnosis by asking the thing.** House panels list the blocker; citizens talk (Caesar III, Caesar IV); advisors and messages carry "go to problem" buttons (Julius added more). Every successful player tip starts with "click the house".
7. **Disasters as lessons.** Fire is how Caesar III and Pharaoh teach prefects and firehouses: the town burns, then you learn. This is effective but punishing, and probably wrong for a five-minute phone session unless the first fire is scripted and harmless.
8. **Difficulty changes money, threat and labour, not goals.** Emperor keeps goals identical and scales cash. Caesar III scales money 300% to 75% and enemies 40% to 120%. Zeus scales building costs and the working share of the population.
9. **Gifts prime chains.** Emperor gives you jade before you can import it; Caesar III's first mission sends wheat from Rome so early houses evolve before farms exist (Caesar III player bug-report note). The player sees the output before building the input.
10. **The remake's lesson: the old teaching still works, but only if objectives stay visible.** Pharaoh: A New Era kept 1999's missions and was criticised mainly where goals were vague or could be dismissed, and where trade and import/export were never explained.

## 7. Recurring complaints worth designing out

- **Random walker coverage.** Houses evolve and devolve because a seller turned left. This is the root complaint from 1998 to 2023, and the remake's grace period and global labour pool were its two best-liked fixes. Thebes's reach-along-roads plus a devolve grace period addresses both.
- **Coverage you cannot see until after placing.** Caesar IV's service radius was the most-cited UX fault. Show reach live on the ghost.
- **Overlays that hide the city.** Caesar III overlays replaced the buildings. Tint instead.
- **Over-upgrading costs workers.** Caesar III villas cause homelessness; Pharaoh's manors turn workers into scribes. This is real depth, but the warning must come before the upgrade.
- **Wrong or vague diagnostic messages.** The remake's house panel claimed no temple access beside shrines (EIP). If Thebes's checklist is ever wrong, players stop trusting it; test it against the simulation.
- **Unexplained trade and import/export.** Flagged in the Pharaoh remake (EIP, Shacknews) and Emperor. Give caravans their own goal and a primed first trade.
- **Objectives in the notification stream.** Pharaoh: A New Era let mission goals be dismissed like toasts. Thebes's persistent goals strip is right.
- **Statistics overload and many advisor screens.** MP1st and Steam players complained about charts and pop-ups. One-panel-at-a-time plus plain-English summaries is the counter.
- **Huge or persistent UI covering the map.** Caesar IV's build menu stayed open; the remake had too many pop-ups. Keep the map centre clear.
- **Missing navigation basics.** The remake shipped without a minimap, rotation or enough zoom-out and patched a minimap in within weeks. On a phone, a "jump to" list (problems, goals, monuments) may serve better than a tiny minimap, but some overview is expected.
- **Large monuments hiding buildings on a fixed camera** (Shacknews). Keep monument footprints moderate, or fade them while the player is placing nearby.
- **Placement rules you cannot discover.** Reed gatherers in the remake (Shacknews); Caesar IV's invisible grid blocks. Every placement rule should show as a tint or a one-line reason on the ghost.
- **Combat bolted on.** It was the weakest part of every game here. Keep Thebes's raids simple and city-side (walls and guards), not unit micro.
- **Instant-loss cliffs.** One remake player reports debt beyond 5,000 deben as an instant loss (player claim). A phone game should warn several turns ahead and offer recovery.
- **Grind in long missions.** Pyramids taking about 2 hours and "never-ending" tutorials work against five-minute sessions. Long projects should progress while away and surface on the Welcome back card.

---

## Sources (all read 11 Oct 2026)

**Pharaoh / Pharaoh: A New Era**
- Wikipedia, Pharaoh (video game): https://en.wikipedia.org/wiki/Pharaoh_(video_game)
- Wikipedia, Pharaoh: A New Era: https://en.wikipedia.org/wiki/Pharaoh:_A_New_Era
- Steam store page, Pharaoh: A New Era: https://store.steampowered.com/app/1351080/Pharaoh_A_New_Era/
- Cosmocover / Dotemu launch press release: https://cosmocover.com/newsroom/full-remake-of-genre-defining-classic-city-builder-pharaoh-a-new-era-begins-its-rule-on-pc-today-welcomes-veteran-and-novice-leaders-alike-with-overview-trailer
- Gaming Trend review (Holly Hudspeth): https://gamingtrend.com/reviews/pharaoh-a-new-era-review-all-of-the-gods-have-blessed-you/
- EIP review (Malcolm Schmitz): https://eip.gg/reviews/pharaoh-a-new-era/
- Shacknews review: https://shacknews.com/article/134182/pharaoh-a-new-era-review-score
- MP1st review (Vitor Braz): https://mp1st.com/reviews/pharaoh-a-new-era-review-build-like-an-egyptian
- WayTooManyGames review: https://waytoomany.games/2023/02/14/review-pharaoh-a-new-era/
- GRY-Online minimap patch news (9 Mar 2023): https://www.gry-online.pl/newsroom/pharaoh-a-new-era-dostanie-patch-z-wazna-funkcja-o-ktora-zabiegal/z924568
- PCGamesN graphics comparison (Dec 2021): https://www.pcgamesn.com/pharaoh-a-new-era/new-graphics-side-by-side
- PCGamesN reveal / walker exploits (Nov 2020): https://www.pcgamesn.com/pharaoh-a-new-era/reveal-trailer
- Vaporlens Steam review aggregate: https://vaporlens.app/app/1351080/pharaoh™_a_new_era.md
- Steam discussion "is it really worth buying?" (Feb 2023): https://steamcommunity.com/app/1351080/discussions/0/3777993814844867270
- Steam discussion "What is different than the original" (Mar–Apr 2023): https://steamcommunity.com/app/1351080/discussions/0/5769714637079292585
- KosGames mechanics and troubleshooting guide: https://kosgames.com/pharaoh-a-new-era-mechanics-troubleshooting-guide-and-faq-39718/
- Gamepressure beginner's guide: https://www.gamepressure.com/newsroom/pharaoh-a-new-era-beginners-guide-tips-and-tricks/zd50e3
- Sierra Help Pharaoh walkthrough: https://sierrahelp.com/Walkthroughs/PharaohWalkthrough.html
- HeavenGames Pharaoh Predynastic walkthrough: https://pharaoh.heavengames.com/walkthroughs/predynastic/
- HeavenGames Pharaoh housing levels: https://pharaoh.heavengames.com/strategy/housinglevels/
- HeavenGames Pharaoh monuments: https://pharaoh.heavengames.com/strategy/monuments/
- HeavenGames Pharaoh strategy and housing-block index: https://pharaoh.heavengames.com/strategy/ and https://pharaoh.heavengames.com/strategy/housing/
- Babel (Uppsala game design), "City builders: Pharaoh/Cleopatra" (Gleb Krasnianski): https://babel.speldesign.uu.se/?p=1823613
- Search-result summaries only (page not readable): PC Gamer "Revisiting Pharaoh" https://www.pcgamer.com/revisiting-pharaoh-the-complex-city-builder-that-rewards-meticulous-planning/ ; Gamepressure first-reviews roundup https://www.gamepressure.com/S013-amp.asp?ID=20727 ; Steam developer reply on minimap (thread https://steamcommunity.com/app/1351080/discussions/0/3777993814842999134)

**Caesar III, Julius, Augustus**
- Wikipedia, Caesar III: https://en.wikipedia.org/wiki/Caesar_III
- Caesar III Augustus Handbook: https://www.caesar3augustus.com/book/intro/welcome , https://www.caesar3augustus.com/book/gettingstarted/yourcareer , https://www.caesar3augustus.com/book/housingdesirability/start
- HeavenGames Caesar III walkthroughs (Tutorials 1–2): https://caesar3.heavengames.com/strategy/walkthroughs/ and https://caesar3.heavengames.com/strategy/walkthroughs/brundisium/
- Well.com Caesar III review (author and date not shown): https://people.well.com/user/derb/reviews/caesariii.htm
- Dedoimedo Caesar III review: https://www.dedoimedo.com/games/caesar_review.html
- Julius README: https://github.com/bvschaik/julius
- Julius wiki, Improvements from Caesar 3: https://github.com/bvschaik/julius/wiki/Improvements-from-Caesar-3
- Julius wiki, Touch support: https://github.com/bvschaik/julius/wiki/Touch-support
- Julius source, difficulty.c: https://raw.githubusercontent.com/bvschaik/julius/master/src/game/difficulty.c
- Augustus README: https://github.com/Keriew/augustus
- GamingOnLinux, Julius release (Aug 2025): https://www.gamingonlinux.com/2025/08/open-source-re-implementation-of-caesar-iii-levels-up-in-the-new-release

**Caesar IV**
- Wikipedia, Caesar IV: https://en.wikipedia.org/wiki/Caesar_IV
- Worthplaying review (James King, Dec 2006): https://worthplaying.com/article/2006/12/11/reviews/38350-pc-review-caesar-iv/
- GamesFirst review (George Holomshek, Oct 2006): https://gamesfirst.com/articles/2006/caesar-iv-review/
- GOG store page and user reviews: https://www.gog.com/en/game/caesar_iv
- Search-result summary only: bit-tech review https://bit-tech.net/reviews/gaming/Caesar_IV_Review/1/

**Zeus: Master of Olympus**
- Wikipedia, Zeus: Master of Olympus: https://en.wikipedia.org/wiki/Zeus:_Master_of_Olympus
- GameRevolution review: https://www.gamerevolution.com/review/33315-zeus-master-of-olympus-review
- HeavenGames Chris Beatrice interview: https://zeus.heavengames.com/interview-chris-beatrice/
- HeavenGames Zeus housing levels: https://zeus.heavengames.com/gameinfo/housinglevels/
- HeavenGames Zeus worker percentages / difficulty: https://zeus.heavengames.com/gameinfo/worker-percentages/
- HeavenGames Zeus distribution buildings: https://zeus.heavengames.com/buildings/distribution/
- HeavenGames Zeus walkthroughs and Zeus and Europa: https://zeus.heavengames.com/walkthroughs/ and https://zeus.heavengames.com/walkthroughs/zeus-and-europa/
- HeavenGames Zeus housing blocks index: https://zeus.heavengames.com/gameinfo/blocks/
- Search-result summaries only: GiantBomb Zeus page https://www.giantbomb.com/games/3030-3769/ ; GOG forum "how to control worker roaming area" https://gog.com/forum/zeus_poseidon_acropolis/how_to_control_worker_roaming_area

**Emperor: Rise of the Middle Kingdom**
- Wikipedia, Emperor: Rise of the Middle Kingdom: https://en.wikipedia.org/wiki/Emperor:_Rise_of_the_Middle_Kingdom
- GameWatcher review (Anthony Theodorakakos, 2003): https://www.gamewatcher.com/emperor-rise-of-the-middle-kingdom/review
- ITWeb review (Iwan Pienaar, 11 Oct 2002): https://itweb.co.za/article/emperor-score-one-for-the-city-builders/mYZRXv9PrnoqOgA8
- Babel (Uppsala), "City builders: Emperor" (Gleb Krasnianski, Jan 2018): https://babel.speldesign.uu.se/?p=1871146
- HeavenGames Emperor feng shui: https://emperor.heavengames.com/strategy/fengshui/
- HeavenGames Emperor Xia tutorial walkthroughs (GillB): https://emperor.heavengames.com/strategy/walkthru/xia/gill_index_html , .../gill_xia1/ , .../gill_xia2/ , .../gill_xia3/ , .../gill_xia4/
- Search-result summary only: GameSpot review https://www.gamespot.com/reviews/emperor-rise-of-the-middle-kingdom-review/1900-2879794/
