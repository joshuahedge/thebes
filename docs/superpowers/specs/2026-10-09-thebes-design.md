# Thebes: design spec

**Date:** 2026-10-09 (revised the same day after a three-reviewer pass covering game design, interface, and onboarding and accessibility)
**Status:** Approved 9 Oct 2026. Revised 11 Oct 2026 for Stage 2 (sections 4.1, 4.6-4.8, 4.10, 4.11, 4.14, 4.15, 4.18 and 10) from the Pharaoh Heaven review and the city-builder research; the calls made on Joshua's behalf are in that session's rulings list.
**Owner:** Joshua Hedge (personal project)

## 1. Summary

Thebes is a city builder for phone and desktop web browsers, inspired by Sierra/Impressions' *Pharaoh* (1999) and the look of *Pharaoh: A New Era* (2023). The aim is a game that's simple to pick up but has real depth. You lay out roads and housing and keep people supplied with water, food, faith, goods and entertainment, and their homes climb a nine-tier ladder from mud hut to grand estate. Production chains, trade, raids with automatic defence, and long-running monuments (obelisks, a colossus, mastabas, pyramids) give the city goals over many sessions.

It's a plain web page that installs to a phone's home screen, works offline, and saves on the device. People play it from one link: `https://joshuahedge.github.io/thebes/`.

## 2. Decisions

| Topic | Decision |
|---|---|
| Persistence | **Save and resume.** The city is saved on the device and is frozen while the game is closed. It always reopens paused. There's no server. |
| Structure | **Endless city with milestones** first, then a **mission campaign** built as data on the same engine. |
| Challenge | City troubles plus **automatic defence**. Raiders arrive; walls, towers and soldiers fight on their own; players can pay **tribute** to avoid a raid. |
| Core systems | Housing upgrades, production chains, trade, desirability, monuments. River flooding is deferred. |
| Service coverage | **Reach along roads** decides coverage; **walkers are drawn for looks only**. |
| Housing | Nine tiers. Tiers 6–9 are 2×2 with **capacities 100 / 125 / 150 / 180**, so an upgrade never shrinks the city. |
| Art | An **original, code-drawn style inspired by Pharaoh: A New Era** (cool shadows, smooth whitewash, stacked houses, rugs, mosaics, painted monuments), with **blended, continuous terrain**. No Pharaoh assets. |
| Layouts | **Portrait phone**: build dock at the bottom. **Wide screens**: a Pharaoh-style side panel. **Short landscape screens**: a compact rail. |
| Input | Touch, mouse and keyboard are first-class. Controls follow the input in use, not the screen size. |
| Onboarding | A goals list with "Show me" replaces a tutorial. Houses explain why they won't upgrade. |
| Sound | About eight synthesised sound effects, **off by default**, no music. |
| Difficulty | **Relaxed, Normal, Hard**, chosen when a city starts: cost and risk multipliers only (section 4.18). |
| Hosting | **Public repo `joshuahedge/thebes` + GitHub Pages**. |
| Separation | Personal GitHub account and commit identity; not hosted as a Claude artifact. |

## 3. Goals and non-goals

**Goals**
- Someone who has never played a city builder understands what to do within a minute of opening the link.
- Fun in five-minute phone sessions and in long desktop sessions.
- Depth from a few interlocking systems, not from a huge building list.
- One shareable link, with no installs, accounts, ads or tracking.
- Smooth on a mid-range phone with a full 64×64 city.
- Saves survive updates, reinstalls and switching between Safari and the home-screen app.
- WCAG 2.2 AA for all interface outside the map itself.

**Non-goals for now** (each may come later)
- Mission campaign (stage 5, its own spec).
- River flooding seasons, disease and healers, crime, foods beyond grain and figs.
- A tax-rate setting.
- Music.
- Multiplayer, cloud saves, and one city playable across devices (export and import covers moving a city).
- Direct control of soldiers.
- Progress while the game is closed.
- Screen-reader access to the map itself. The interface around it is accessible (section 6.8).

## 4. Gameplay

### 4.1 Opening and goals

- **Title card:**
  - Buttons: **Continue** (when a save exists), **New city**, **Play with sound** / **Play muted**, and **Install** (where the platform allows).
  - A paused, slowly drifting view of a sample city sits behind the buttons.
- **A new city starts:**
  - **paused**, with **2,000 gold**;
  - with the camera on fertile land;
  - with a **short road already running in from the trade edge** of the map.
- First arrivals walk in about 10 real seconds after the first housing plot is placed (at 1×).
- **Goals list:** shows up to **three goals at a time**.
  - Each goal has a **Show me** button. It opens the right build card and pulses the target area on the map.
  - Finishing a goal pays a small gold reward and reveals the next one.
  - The opening chain:
    1. Lay a road
    2. Place 6 housing plots
    3. Build a well so huts become shacks
    4. Farm, granary and bazaar
    5. Build a temple
    6. Reach 100 people
  - After the opening chain, goals come from the next milestone (for example "Reach 150 people to become a Town", "Build a booth so homes can grow into Manors").
  - From Town, goals introduce each new need when the tier below it is common ("Your homes now want pottery: build a clay pit and a potter"), then ask for a number of homes at the new tier, so one new demand arrives at a time.
  - The goal list is data (`data/goals.js`). Missions will reuse it later.
- First-time events add one-off goals instead of a separate tutorial: the first fire, the first raid warning, the first labour shortage, the first empty bazaar.

### 4.2 Core loop

1. Lay roads and housing plots. People move into plots that touch a road.
2. Houses upgrade one tier at a time as their needs are met. Unmet needs make them downgrade.
3. Bigger houses hold more people and pay more tax.
4. Population milestones unlock buildings. Money pays for production, services, defence and monuments.

### 4.3 Time

- The simulation advances one **game-day** per tick. There are 30 days to a month and 12 months to a year.
- Speeds are pause, 1×, 2× and 3×. At 1×, a month is 20 seconds and a year is 4 minutes.
- Economy steps (taxes, wages, consumption, upkeep, immigration, mood) run monthly. Production, movement and fire risk run daily.
- The game **pauses when the page is hidden** (another app or tab, or the phone is locked) and **always reopens paused** (section 4.17).
- A raid warning or a fire drops the speed to 1×. The first raid warning pauses the game.

### 4.4 Map

- Each endless city gets a **64×64 tile map from a seed**. The same seed always gives the same map.
- Terrain types are river (impassable), riverbank, **fertile land** (needed for farms), desert, **rocky ground** (needed for the quarry and gem mine), and meadow, scrub and rocks as decoration.
- Each map has one **trade entry** on an edge road and one or two **raider entry points** on other edges.
- Generation guarantees enough fertile land near the start, at least one rocky patch within reach, and a connected buildable area.

### 4.5 Roads and reach

- Roads are placed by **tapping a start and an end** (the game picks an L-shaped path, which the player can flip) or by dragging. Both show a preview and the total cost before ✓.
- Buildings work only if they touch a road.
- **Reach**: a service building covers every tile reachable within its reach distance by walking along connected roads, starting from the road tiles next to it. A house is covered if any road tile next to it is covered.
- Tapping a building highlights its reach. **Placing a service automatically shows the matching overlay** together with the reach preview.
- Walkers move along roads inside each building's reach, for atmosphere only.

Starting reach values, all tunable in data:

| Building | Reach (road tiles) |
|---|---|
| Well | 5 |
| Bazaar (serving homes) | 10 |
| Temple | 10 |
| Booth (entertainment) | 8 |
| Firehouse | 10 |
| Producer → storage | 12 |
| Bazaar ← storage (supply) | 16 |

### 4.6 Housing ladder

| Tier | Name | Size | Needs (cumulative) | Starting max residents | Tax per resident per month | Desirability to rise / to keep |
|---|---|---|---|---|---|---|
| 1 | Hut | 1×1 | Road access | 5 | 1 | – |
| 2 | Shack | 1×1 | Water | 8 | 1 | – |
| 3 | Cottage | 1×1 | Food | 12 | 2 | – |
| 4 | House | 1×1 | Temple | 16 | 2 | – |
| 5 | Townhouse | 1×1 | Pottery | 22 | 3 | – |
| 6 | Manor | 2×2 | Entertainment | 100 | 4 | 20 / 15 |
| 7 | Fine manor | 2×2 | Beer, two kinds of food | 125 | 5 | 35 / 29 |
| 8 | Villa | 2×2 | Linen | 150 | 6 | 50 / 43 |
| 9 | Estate | 2×2 | Jewellery | 180 | 8 | 65 / 57 |

**Rules:**
- **No upgrade lowers capacity or tax per tile.** A data test enforces this (section 9).
- **Household stock.** Each house holds up to **one month** of each good it uses: food, pottery, beer, linen, jewellery. A need counts as met while stock lasts. When a delivery is missed, stock is used up first.
- **Upgrading** is checked monthly. A house rises one tier when every need for the next tier has been met for a full month and, from tier 6, its desirability is at least the "to rise" value.
- **Downgrading** starts when a need's stock has run out, or, from tier 6, when desirability falls below the "to keep" value. If it's still short one month later, the house drops a tier. Between the two desirability values a house neither rises nor falls (hysteresis), so a city does not flicker when a statue moves.
- **Warnings come first.** The house sheet shows the countdown ("Loses Manor in 1 month: the street is not pleasant enough") and the map shows the amber marker the month before any drop.
- **Leaving.** At most a quarter of a house's residents can leave in one month, whatever the cause.
- **Merging to 2×2.** A tier-5 house becomes a Manor only if the three plots next to it, forming a 2×2 square, are housing plots at tier 5 or higher, or plots with no residents yet.
  - If more than one square qualifies, a fixed order picks one: north-west first, then clockwise.
  - The merged house takes the combined residents. Residents of tiers 6-9 keep working (no "scribes" in Stage 2; see 4.8).
- **Splitting back.** A 2×2 house that drops below tier 6 splits into four tier-5 plots, with residents shared out evenly.
- **Needs arrive one at a time.** Each new good is introduced by a goal when the tier below it is common ("Your homes now want pottery: build a clay pit and a potter"), so a player meets one new demand at a time.
- **Looks.** Each tier has its own silhouette, height and tone so tiers can be told apart at phone zoom (section 5.3). Tiers 5-9 each add one roof tell: a striped awning (5), a pergola (6), a roof garden (7), a painted parapet band (8), a flag and pool (9).

### 4.7 Desirability

- Every tile has a desirability score: the sum of the values of every building near it. Each building type has values by distance (1 = touching, up to 6 tiles), counted from the nearest tile of its footprint. Values add where they overlap. A 2×2 house uses its best tile.
- Starting values (in `data/desirability.js`, tunable):

| Source | By distance 1, 2, 3, 4, 5, 6 |
|---|---|
| Garden | 3, 2, 1 |
| Statue | 8, 6, 4, 2 |
| Temple | 6, 6, 4, 4, 2, 2 |
| Booth | 3, 2, 1 |
| Bazaar | −2, −1, 0, 1, 2, 3 |
| Well | 1 |
| Granary | −8, −6, −4, −2 |
| Storehouse | −6, −4, −2 |
| Farms and orchards | −2, −1 |
| Clay pit | −6, −5, −4, −3, −2, −1 |
| Potter, brewery, weaver, jeweller | −4, −3, −2, −1 |
| Gem mine | −8, −6, −4, −2 |
| Trading post | −3, −2, −1 |
| Homes, by tier | Hut −2, −1; Shack −1; Cottage 0; House 1; Townhouse 1, 1; Manor 2, 2; Fine manor 3, 2, 1; Villa 4, 3, 2; Estate 5, 4, 3, 2 |

- **Gardens** (1×1, Village) and **statues** (1×1, Town) are cheap and need no workers.
- Tiers 6-9 need minimum desirability (section 4.6), with a lower value to keep the tier.
- The house sheet shows the score and its three biggest causes, for example "14 of 20: +6 temple, +3 garden, −4 potter".
- **While placing** any building, the ground it would change is tinted (a teal wash where homes get nicer, coral hatching where they get worse) and the confirm bar says "Makes 6 homes nicer" or "Makes 4 homes less pleasant".
- The desirability overlay is a single-hue light-to-dark scale with a five-step legend whose steps start at the tiers' "to rise" values (20, 35, 50, 65), plus coral hatching below zero.

### 4.8 Workers

- About **40%** of residents are workers (tunable).
- Workers fill workplaces in **priority order**:
  1. water and food
  2. safety (firehouse, defence)
  3. services (temple, bazaar, booth)
  4. industry and trade
  5. monuments
- Within a priority level, workers are shared proportionally.
- An understaffed building works at a proportionally lower rate. Below 25% staffing it stops.
- Labour shortage and unemployment above 15% show as alerts. The alert names which priority level is short.
- **Every tier works.** Residents of tiers 6-9 keep working. A top-tier rule that trades workers for tax (the "scribes" idea) is a candidate for Stage 4, where monuments put pressure on labour.

### 4.9 Immigration, emigration and mood

- **Mood** is one city-wide value from 0 to 100, recalculated monthly and shown in the top bar and the city summary.
  - **Raised by:** homes fed in full, employment, prestige (section 4.16).
  - **Lowered by:** unemployment above 15%, debt, a raid in the last six months (paying tribute avoids this), buildings burned in the last six months.
- **Arrivals per month** = the smaller of the empty housing capacity and `round((6 + 0.05 × population) × mood / 60)`. There are no arrivals while mood is below 30.
- **Departures.** While mood is below 30, up to 2% of the population leaves each month, starting from the lowest tiers. The per-house cap in section 4.6 still applies.
- Unemployment does not drive emigration before Town.
- All constants live in `data/` and are tuned during stage 1.

### 4.10 Goods and production chains

| Chain | Steps | Used by | Unlocks |
|---|---|---|---|
| Grain | Grain farm (fertile) → granary | Homes from tier 3 | Village |
| Figs | Fig orchard (fertile) → granary | Homes from tier 7 (second food) | Town |
| Pottery | Clay pit → storehouse → potter → storehouse | Homes from tier 5, trade | Town |
| Beer | Barley farm (fertile) → storehouse → brewery → storehouse | Homes from tier 7, trade | City |
| Linen | Flax farm (fertile) → storehouse → weaver → storehouse | Homes from tier 8, trade (high price) | Great city |
| Jewellery | Gem mine (rocky) → storehouse → jeweller → storehouse | Homes from tier 9, trade (highest price) | Capital |
| Stone | Quarry (rocky) → storehouse | Monuments | City (Stage 4) |
| Bricks | Clay pit → brickworks → storehouse | Monuments | City (Stage 4) |

- **Producers** make output daily, scaled by staffing (below 25% staffing they stop). A raw producer makes its monthly yield at full staff; a **workshop** turns one unit of its raw material into one unit of its good, taking the raw material from storage within producer reach, and stops with "No clay in reach" when there is none. Output goes to the nearest storage with space within producer reach; if there is none, production stops and an alert says "No storage nearby".
- **Monthly yields at full staff** (in `data/buildings.js`, tunable; a 30-day month): grain 30, figs 24, clay 40, pottery 30, barley 30, beer 25, flax 24, linen 20, gems 15, jewellery 15. A potter feeds about 13 Townhouses.
- **Household use per resident per month:** food 0.25 (any mix of grain and figs), pottery 0.05, beer 0.05, linen 0.04, jewellery 0.03, rounded up per home.
- **Storage:** the granary holds grain and figs (600 units); the **storehouse** (2×2, Town) holds everything else (800 units in total), with **accept or refuse** per good. Both show their fill on the map in four steps. There are no "get" orders.
- **Bazaars** sell every good homes use, restocking monthly from storage within supply reach (up to 300 grain, 200 figs and 100 of each household good). Each month, a home tops up its household stock from the covering bazaar it can reach most quickly that has stock.
- **Fed** means the home's full monthly food need was met from stock, from any mix of foods. "Two kinds of food" also needs both grain and figs in stock at the start of the month. A home that wants two foods tops up half of its need from each and fills any gap from whichever food is there; a home that wants one food takes first from the food its bazaars hold most of (ties go to grain), so a surplus of one food never fills the granaries.
- **The city summary** shows each good as made against used last month, and every good's sheet line says what makes it and what uses it ("Pottery: made by potters from clay; used by Townhouses and up; sold to Memphis").

### 4.11 Money

- **Income:** taxes (section 4.6), trade sales, goal rewards.
- **Spending:** building costs, monthly upkeep, wages per employed worker, soldiers' pay, trade purchases, monument work, tribute.
- **Balance target:** in a steady tier-4 town, wages plus upkeep come to about 60–70% of tax income. Building costs and wages in `data/` are tuned to this.
- **Pausing a building** stops its wages and upkeep.
- **Demolishing** refunds 25% of a building's cost. Roads and plots refund nothing. Undo (section 6.5) refunds in full.
- **Difficulty** multiplies building, road and route costs (section 4.18). Upkeep and wages do not change.
- **Debt.** The treasury can go down to −500. Any debt lowers mood, scaled with the debt. Below −500, nothing new can be built until it recovers.

### 4.12 Fire

- Fire risk only builds up once the city reaches **Town**. The firehouse is available from Village tier, so it can be built ahead.
- Every building except roads, gardens, statues and plazas builds up risk daily, at a rate that depends on its type.
- A **firehouse lowers risk** daily for the buildings it reaches, by an amount scaled with its staffing.
- **Above the risk threshold,** a building has a seeded daily chance of catching fire (starting value 3%). That way uncovered buildings don't all ignite at once.
- A fire burns for a few game-days and has a set chance of spreading to each neighbour.
  - Burned houses become empty housing plots.
  - Other burned buildings become rubble, which costs a little to clear.
- The **first fire** adds a goal: "Build a firehouse near …", with Show me.

### 4.13 Raids and defence

- Raids become possible at **250 population**.
- The **first raid** comes no sooner than **two game-years** after that. It's sized so one staffed tower can beat it, and its warning pauses the game and adds the goal "Build a tower facing <direction>".
- Later raids come every two to four game-years (seeded).
- **Raid size** depends on population and prestige. It's fixed when the warning appears, so spending or saving gold during the warning doesn't change it.
- **Warning:** two game-months ahead. An alert banner names the direction, and the entry point gets a minimap pin.
- **Tribute:** the warning offers **"Pay tribute"**, costing gold in proportion to the raid's size, which cancels the raid.
- Raiders are real simulation units. They move by A* pathfinding over walkable ground and roads towards the most valuable buildings nearby.
- **Defences:**
  - **Walls** block raiders and must be broken through.
  - **Gates** let citizens through and stop raiders.
  - **Towers** on walls shoot raiders within 4 tiles automatically.
  - **Barracks** train soldiers, up to a cap per barracks. Soldiers intercept raiders within a patrol radius and come back afterwards.
- Raiders that reach a building set it on fire and steal gold.
- A raid ends when all raiders are dead or have retreated after losing half their number. Combat strength and health values live in data.

### 4.14 Progression

| Milestone | Population | Unlocks |
|---|---|---|
| Village | 0 | Roads, housing, well, grain farm, granary, bazaar, temple, garden, firehouse |
| Town | 150 | Figs, clay pit, potter, storehouse, booth, statue. Fire risk begins. |
| Market town | 250 | Trading post (first partner), walls, gate, tower, barracks. Raids become possible. |
| City | 400 | Barley and brewery, quarry, brickworks, builders' guild, small and large obelisks |
| Great city | 650 | Flax and weaver, colossus, small mastaba, second trade partner |
| Capital | 1,000 | Gem mine and jeweller, large mastaba |
| Prestige | Prestige points | Small pyramid, great pyramid |

- Locked buildings show in the build tray only for the **next** milestone, greyed out with their unlock condition; later ones stay hidden until then, so the tray never fills with grey. Buildings of later stages (defence, monuments) stay hidden until their stage ships.
- Reaching a milestone shows a banner ("Your village is now a Town"), and newly unlocked build cards get "New" badges.
- The thresholds are starting values for tuning.

### 4.15 Trade

- The **trading post** (2×2, Market town) is built on a road connected to the trade entry.
- **Partners** (in `data/trade.js`): **Memphis** opens at Market town for 300 gold; **Byblos** opens at Great city for 600 gold. Each partner buys and sells a fixed list of goods with a **yearly quota** per good; its caravan comes every three game-months and carries a quarter of each quota.

| Partner | Buys (price paid, yearly quota) | Sells (price asked, yearly quota) |
|---|---|---|
| Memphis | Grain 1 (300), pottery 8 (200), beer 10 (160) | Clay 2 (300), figs 3 (200), barley 3 (200) |
| Byblos | Pottery 8 (120), linen 14 (120), jewellery 20 (80) | Flax 3 (160), gems 9 (100), beer 14 (100) |

- For each good the player sets **buy, sell or ignore** and a **level to keep**: a caravan sells the player its goods only up to that level, and buys the player's goods only above it. Purchases never take the treasury below zero. Goods move to and from storage within the trading post's supply reach (16 road tiles).
- **No arbitrage:** a data check ensures no partner sells a good for less than another pays for it, with a margin of at least 25% so that drift can never cross it. Prices **drift by up to ±10% a year** (seeded).
- The first caravan from a new route brings a gift: 40 units of the first good on its sale list.
- The trading post's sheet is one step at a time: open the route, then a row per good with its price, the buy/sell/ignore choice and the level to keep, and the next caravan's date.

### 4.16 Monuments

- Monuments are **long-term construction projects**:
  - The player places the footprint, rotating it if it isn't square.
  - The monument rises **layer by layer** as builders' guild crews deliver stone and bricks from storage.
  - Gold is spent as work happens.
  - Work can be paused.
- **Build speed scales** with the number of guild crews assigned (each guild supplies one crew, up to four per site) and with how steadily materials arrive. The times below are for **one crew with full supply**.
- **Prestige** is awarded for each finished layer and in full on completion. It unlocks the pyramids, adds to mood and serves as a mission goal later.
- Finished monuments give **desirability** around them.

| Monument | Footprint | Materials | Time with one crew at 1× |
|---|---|---|---|
| Small obelisk | 1×1 | Stone | ~3 game-months (~1 min) |
| Large obelisk (gilded top) | 1×1 | Stone, extra gold | ~1 game-year (~4 min) |
| Colossus (seated statue) | 2×2 | Stone | ~4 game-years (~15 min) |
| Small mastaba | 3×2 | Bricks, stone facing | ~15 game-years (~1 hour) |
| Large mastaba | 4×3 | Bricks, stone facing | ~25 game-years (~1 h 40) |
| Small pyramid | 4×4 | Stone | ~40 game-years (~2 h 40) |
| Great pyramid (gold capstone) | 7×7 | Stone, extra gold | ~100 game-years (~6–7 h; ~2 h with four crews) |

### 4.17 Saving and returning

- **Autosave** runs every game-month and whenever the page is hidden. There's one city slot plus the previous autosave as a backup.
- **Returning:** the game always reopens **paused**, with a **Welcome back** card showing:
  - the date and how long ago the last session was
  - trends in population, treasury and mood
  - open goals
  - alerts, each with **View**

  **Carry on** restores the last speed.
- **Export / import:**
  - Export produces a `.json` save through the share sheet (Web Share API with a file), falling back to a download.
  - Import accepts a file.
  - Starting a new city asks for confirmation and offers to export first.
- **Phones and saved data:**
  - **iOS keeps a home-screen app's storage separate from Safari's.** So the home-screen install guide appears **at first launch, before a city exists**.
  - If a city already exists in Safari when the player installs, the game exports it first. The installed app, finding no save, offers **"Bring a city from Safari"** (import).
  - Safari may delete website data that hasn't been visited for 7 days. The home-screen app is exempt. The game also requests persistent storage (`navigator.storage.persist()`) where supported.
  - In **in-app browsers** (Messenger, Instagram and the like), the game shows "Open in Safari/Chrome to keep your city", because those browsers can't install apps and keep separate storage.
  - If storage fails (private browsing, full storage), a persistent banner warns that progress won't be saved.

### 4.18 Difficulty

- Three levels, chosen when a city starts and fixed for its life: **Relaxed** (building, road and route costs ×0.8; risks ×0.5), **Normal** (×1, ×1), **Hard** (costs ×1.25; risks ×1.5). Risks (fire and raids) arrive in Stage 3; Stage 2 stores the multiplier.
- The title card shows the three as a choice under New city (the last one used is preselected, Normal the first time); the settings sheet holds the choice for the next city. The city summary names the level. Goals, workers and desirability are the same at every level.

## 5. Art and feel

### 5.1 Style

- **Original and code-drawn, in the spirit of Pharaoh: A New Era.** Every building, tier, terrain type and figure is drawn by a function from simple shapes. Pharaoh and New Era screenshots are visual reference only. No files from either game are ever used.
- **Light:** warm sunlit faces against **cool lavender-grey shaded faces**. Ground shadows are a soft violet, in two layers. There's a faint highlight on top edges and a darker line where walls meet the ground.
- **Whitewash:** smooth plaster with no brick courses. Houses are **stacked uneven blocks** with outside staircases, ladders and roof terraces.
- **Colour comes from use:**
  - coloured roof mats and rugs, orange pots, green and teal striped reed canopies, woven reed fences;
  - patterned **mosaic** plazas, with blue-and-white checks for temple courts;
  - painted **teal columns** and **painted figures** on temple gateways, with banded cornices in teal, red and gold;
  - flags.
- **Landscape:** textured grass meadows, a teal river with depth shading, dark mud flats on the floodplain, palms and acacias, fields with distinct crops (green grain, golden barley, flax with blue flowers).
- **People:** small figures in kilts and dresses with coloured collars and role props (water jar, basket, hoe, fishing pole, priest's sash, spear and shield).
- **Monuments:** the pyramid under construction shows **individual blocks**, a mudbrick ramp, sleds and workers. The finished pyramid has a white casing and a gold capstone.
- The mock-ups made during brainstorming (art passes 3 and 4) are the baseline look.

### 5.2 Blended, continuous terrain

The ground reads as one painted landscape, not a grid of diamonds. Gameplay still uses the tile grid; only the visuals blend.

- **Terrain layers** (sand, meadow, fertile soil, mud flats, rocky ground) are blended with **noise-perturbed masks** built from per-corner terrain weights. Edges wander and fade over about a third of a tile, and grass tufts, pebbles and scrub are scattered across the borders.
- **Roads** are drawn as **continuous paths** through tile centres, with rounded joins and ends, soft worn edges, wheel ruts and pebbles. Plazas and mosaics stay crisp, because they're built surfaces.
- The **river** is a smooth curve with depth shading, a foam line, a wet-sand fringe and reeds.
- **Building plots** fade into the ground around them. **Fields** keep straight furrows with slightly irregular edges.
- **While placing,** a faint tile grid fades in around the cursor for precision, then fades out.
- **Implementation:** terrain is baked into chunk images (16×16 tiles each) and re-baked only when something under that chunk changes.

### 5.3 Readability at phone zoom

- At default zoom on phones, a 1×1 tile is at least **64 CSS px wide**. A building's tap area covers its footprint plus its drawn height, so even a hut is at least 44 pt tall to tap. Taps between buildings, and every tap at minimum zoom, go to the nearest building's centre.
- Each housing tier has a distinct **height, roof shape and tone**, not just finer detail.
- Each service carries a small **coloured banner or emblem matching its build-dock icon** (for example the well is blue, the temple gold, the firehouse red).

### 5.4 Feedback and motion

- **Placing:** a dust puff on ✓.
- **Upgrading:** a short glow and a rising "+Shack" label.
- **Downgrading:** a coral pulse and "−Cottage".
- **Milestones:** a banner, plus "New" badges on unlocked cards.
- Walkers, carts, boats and smoke animate gently.
- **Respects `prefers-reduced-motion`.** With it on, there are no puffs or pulses, and walkers move but the camera never auto-pans.
- Fire flicker stays under 3 flashes per second (WCAG 2.3.1).

### 5.5 Sound and haptics

- About eight **synthesised Web Audio** effects: place, road, demolish, upgrade, milestone, alert, goal complete, and (from stage 3) a raid horn. There's no music.
- **Off by default.** The title card offers "Play with sound", and the choice is remembered. It's also in settings.
- The game sets `navigator.audioSession.type = 'ambient'` where supported and never uses the silent-switch unlock hack, so the iPhone silent switch is respected.
- Short `navigator.vibrate` pulses on ✓ and milestones where supported (Android). There's a setting to turn them off.

## 6. Interface

### 6.1 Principles

- **Things you read sit at the top, things you tap sit at the bottom** (or in the side panel on wide screens).
- **Nothing floats over the middle of the map.** Corner buttons are fine.
- **One panel open at a time.**
- **Every mode has a visible exit.** ✕, Back, Esc and right-click all go back one step.
- **Meaning is never carried by colour alone.**
- **Text** uses dark ink on parchment at 4.5:1 contrast or better. Body text is 16 px and nothing is below 12 px. There's a text-size setting (100%, 125% or 150%).
- **Touch targets** are at least 44 × 44 pt, and layouts respect safe areas (notch, home bar).

### 6.2 Layouts

The layout depends on the available space; controls depend on the input in use (section 6.7).

- **Portrait layout** (viewport taller than it is wide, and under 900 px wide). Used on phones held upright: a top bar, a **build dock at the bottom**, and corner buttons just above the dock.
- **Wide layout** (viewport at least **900 × 520 px**). Used on laptops, desktops and tablets: a full-width top bar and a **Pharaoh-style right-hand panel**. The panel holds:
  - the minimap
  - category tabs
  - the building grid
  - a details card for the selected or hovered item, with ✕ and ✓ when placing on touch

  It can fold to a thin strip. The top bar shows more: income per month, jobless, months of food, mood, full date and speed buttons.
- **Compact landscape layout** (every other viewport: wider than tall, but under 900 × 520 px). Used on phones held sideways and small tablets: a slim **vertical rail on the right** with category icons, trays opening as a side drawer, ✕ and ✓ at the bottom of the rail, and a condensed top bar.
- **Rotating** keeps the camera position and any placement in progress.

### 6.3 Screen elements

- **Top bar:** gold, population, mood, date and the ☰ menu. Tapping it opens the **city summary** sheet: income against spending, food in store, employment, the mood breakdown and goals.
- **Speed controls:**
  - Portrait: pause and speed sit in the **bottom-left corner button** (tap to pause or resume, long-press or tap the chevron for 1×, 2× or 3×).
  - Wide: the speed controls are in the top bar.
- **Build dock (portrait),** one panel with three heights:
  1. **Slim bar** (default): category icons with labels (Roads, Homes, Food, Industry, Services, Defence, Monuments).
  2. **Tray**: tapping a category or swiping up shows its buildings as cards with cost. Unaffordable costs show in coral with a coin-slash icon, and locked cards show a lock and their condition. The tray scrolls sideways and remembers the last category.
  3. **Tucked away**: swiping down or panning the map shrinks the dock to a single **Build** pill.
- **Corner buttons** show at **every dock height**, never in the middle:
  - bottom-left: pause and speed
  - bottom-right: the **minimap** button with an **alert count badge**, and the **overlay** button
- **Alerts:**
  - Ordinary alerts (labour shortage, an empty bazaar, no storage) go into the count badge and the minimap sheet's list.
  - **Critical alerts** (raid warning, fire, debt, save failing) appear as a **banner under the top bar**, with **View** and, for raids, **Pay tribute**.
  - Alerts are also announced to screen readers through an `aria-live` region.
- **Overlays:** water, food, religion, goods, entertainment, desirability, fire risk and **Housing**.
  - Housing shows each home's next blocking need.
  - Has-it versus missing is shown as a **filled dot versus a hollow ring**. Graded overlays (desirability, fire risk) use a single-hue light-to-dark scale with a legend.
  - The legend strip attaches under the top bar. A critical alert banner takes priority and shrinks the legend to an icon.
- **Minimap sheet:** the whole map, the current view outlined, and alert pins. Tapping the map jumps there. It also holds the alert list with View buttons and **+/− zoom buttons**, the zoom alternative that doesn't need pinching.
- **Info sheets.** Selecting a building moves the camera so the building stays visible above the sheet.
  - **Buildings:** name, reach (highlighted), staffing, stock, and problems. Every problem names the **cause and the fix** with **View** ("Bazaar empty: no granary within 16 road tiles").
  - **Houses:** a **next-tier checklist** with a tick or cross for each need, timers ("upgrades in 1 month", "loses water in 1 month"), the desirability breakdown and residents.
  - **Actions:** Pause, Demolish, and Rotate where it applies.
- **☰ menu:** Continue, New city, Export city, Import city, Settings, How to play (goal history and short explanations), About.
  - **Settings:** sound, vibration, text size, left-handed controls (mirrors ✕ and ✓ and the corner buttons), keyboard shortcuts on or off, and reduced motion (follows the system by default).
- **"Update ready" toast:** appears only when no placement or raid is in progress. It saves first, then reloads.

### 6.4 Modes

| Mode | Bottom (portrait) / panel (wide) shows | A tap or click on the map | How to leave |
|---|---|---|---|
| Browse | Dock or panel | Selects a building or house → info sheet | n/a |
| Selected | Info sheet | Selects another; tapping empty ground closes | ✕, Back, Esc, tap empty |
| Placing | **Confirm bar**: name, cost, **reason if blocked**, ⟳ rotate, Undo, ✕, ✓ | Moves the ghost to the tapped tile | ✕, Back, Esc, right-click |
| Drawing (roads, walls, area paint) | Confirm bar with length or count and total cost | First tap sets the start, second sets the end | Same as Placing |
| Demolishing | Red **Demolish** bar with count and refund | Marks a building or an area | Same as Placing |
| Overlay (combines with Browse) | Legend strip at the top | As Browse | ✕ on the strip, O |

- The confirm bar never tucks away.
- Only one mode is active at a time, except overlays, which combine with Browse.
- Each open sheet or mode adds a browser-history entry, so the phone's Back gesture closes it instead of leaving the game.

### 6.5 Placing and tools

- **Touch placing:**
  - The ghost appears mid-screen, snapped to the nearest valid tile.
  - **Tapping** a tile moves it there. A **drag that starts on the ghost** moves it, drawn just above the finger so it isn't hidden. Every other one-finger drag pans, and **two fingers always pan or zoom**.
  - Nothing is built until ✓.
- **Mouse placing:**
  - The ghost follows the cursor and **a click places it**. The game stays in placing mode so the player can place repeatedly, and Esc or right-click stops.
  - Hovering a card or building shows a tooltip with cost, needs and reach.
- **Validity shown three ways:**
  - **Can place:** a blue outline and a ✓ mark.
  - **Can't place:** coral hatching with a ✕ and a **reason** in the confirm bar ("Needs fertile land", "Not enough gold", "Must touch a road").
  - **"Won't work yet":** an amber state, for example no storage in reach. Placing is allowed, with a warning.
- **Area painting:** housing plots, gardens and demolition are painted as a rectangle (tap the start and end, or drag), with a count and total cost and **one ✓**. Demolishing occupied homes at tier 5 or above asks first.
- **Rotate** (⟳ in the confirm bar, or R) for non-square footprints such as mastabas.
- **Undo:**
  - The last **10 actions** (placing, drawing, painting, demolishing) can be undone with a full refund, **until the current game-month ends**. The monthly tick clears the undo history, which closes the refund loophole at high speed.
  - Undo sits in the confirm bar and in a toast after each action, and works with Ctrl+Z or Cmd+Z.

### 6.6 Gestures (touch)

| Gesture | Effect |
|---|---|
| One-finger drag | Pans (except a drag that starts on the ghost while placing) |
| Two-finger drag or pinch | Pans or zooms, always |
| Tap | Selects, or moves the ghost / sets a start or end point |
| Double-tap | Zooms in |
| Long-press a build card | Shows building details |
| Swipe on the dock handle | Changes the dock height |

- Every pinch and drag action also has a **single-tap alternative** (WCAG 2.5.1 and 2.5.7): +/− zoom, tap start then tap end for lines and areas.
- The canvas uses `touch-action: none` and the page uses `overscroll-behavior: none`, so pull-to-refresh and overscroll can't fire. The dock's grab handle sits above the home-bar safe area.

### 6.7 Mouse, keyboard and switching between inputs

- **Mouse:**
  - The wheel zooms towards the cursor.
  - Dragging empty ground pans; while drawing, right-drag or middle-drag pans.
  - Hover shows tooltips and reach.
- **Keyboard:**
  - Space pauses or resumes; + and − change speed; 1–7 pick a category.
  - Arrow keys or WASD pan.
  - R rotates; M opens the minimap; O cycles overlays.
  - Enter confirms; Esc goes back one step; Ctrl+Z or Cmd+Z undoes; ? lists shortcuts.
  - Focus is visible and the tab order follows the screen layout.
  - Single-key shortcuts switch off while a text field has focus, and can be turned off in settings (WCAG 2.1.4).
- **Switching between inputs:**
  - The input type is decided **when each press starts** (pointer type), never partway through an action.
  - On any device with a touchscreen, buttons keep touch sizes even when a mouse is in use.
  - Pens behave like a mouse for hover and like touch for confirming.

### 6.8 Accessibility summary

- Interface elements are real DOM buttons with labels, so the menus, sheets, dock and panel all work with screen readers and keyboards. The map canvas has a text summary (city stats and alerts) instead of tile-by-tile access.
- Colour is never the only signal: dots versus rings, ✓ and ✕ marks, hatching, icons.
- Contrast and text size follow section 6.1. Motion follows section 5.4.
- Pausing is always available, with no forced timers. The first raid warning pauses the game automatically.
- Left-handed controls are in settings.

## 7. Technical architecture

### 7.1 Platform

- Plain **HTML, CSS and JavaScript (ES modules)**. No build step, no frameworks, nothing to install.
- Drawn on an HTML **canvas**, sharp on high-resolution screens.
- An **installable, offline-capable web app** (PWA):
  - a manifest, icons including `apple-touch-icon`, and `theme-color`;
  - a service worker that caches all files.
- **Link preview:** `og:title`, `og:description` and a **1200×630 `og:image`**, a city scene rendered once by the art code and committed as a PNG.
- Target browsers: iOS Safari 16+, current Android Chrome, current desktop Chrome, Edge, Firefox and Safari.

### 7.2 Folder layout

```
thebes/
  index.html                  page shell, UI containers, OG tags
  manifest.webmanifest        home-screen install data
  sw.js                       service worker (offline cache, updates)
  icons/  og-image.png
  src/
    main.js                   start-up, game loop, wiring
    data/                     everything numeric or descriptive
      buildings.js  goods.js  housing.js  monuments.js  progression.js
      goals.js  trade.js  raids.js  mood.js  sounds.js
    sim/                      game rules; no DOM, no canvas
      rng.js  world.js  mapgen.js  reach.js  housing.js  labour.js  immigration.js
      production.js  distribution.js  economy.js  desirability.js  fire.js
      raids.js  combat.js  pathfinding.js  trade.js  monuments.js
      progression.js  goals.js  clock.js  commands.js  undo.js
    render/                   drawing only; reads sim state, never changes it
      iso.js  terrainBaker.js  spriteCache.js  renderer.js  walkers.js
      overlays.js  effects.js
      art/  terrain.js  housing.js  services.js  industry.js  defence.js
            monuments.js  figures.js  decor.js
    ui/                       DOM interface and input
      layout.js  hud.js  dock.js  sidePanel.js  rail.js  sheets.js  minimap.js
      input.js  gestures.js  keyboard.js  placement.js  modes.js  alerts.js
      toasts.js  menu.js  settings.js  titleCard.js  welcomeBack.js  goalsList.js
    audio/
      sfx.js
    save/
      store.js  migrate.js  exportImport.js  installFlow.js
  tests/
    index.html                test runner page
    harness.js                small test helper (describe/it/expect)
    sim/*.test.js  save/*.test.js  data/*.test.js  ui/*.test.js
  docs/superpowers/specs/     this spec
  README.md
```

### 7.3 Boundaries

- **`data/`** holds plain objects: costs, workers, reach, needs, consumption, prices, unlocks, goals, sounds and art keys. Balancing means editing these.
- **`sim/`** owns the world state and the rules.
  - It is **deterministic**: all randomness (fire ignition, raid timing, price drift, map generation) comes from the seeded generator in `rng.js`.
  - The UI changes the world only through **commands** (`place`, `paintArea`, `demolish`, `drawLine`, `rotate`, `undo`, `setTradeOrder`, `payTribute`, `setSpeed`…). Each one validates and either applies or returns a **reason code**, which the UI turns into the blocked-placement text.
- **`render/`** reads the world and draws it, including the blended terrain chunks and cosmetic walkers.
- **`ui/`** turns input into commands, manages the modes and layouts, and never changes the world directly.
- **`save/`** turns the world into versioned JSON and back, migrates old versions, and runs the install and import flow.

### 7.4 Game loop and rendering

- `requestAnimationFrame` drives drawing.
- The simulation runs on a **fixed timestep** of whole game-days, capped per frame, so the rules behave the same on every device.
- Each frame draws:
  1. the baked terrain chunks in view
  2. depth-sorted buildings from the sprite cache
  3. animated figures and effects
  4. the overlays
- A terrain chunk is re-baked when a road, plot or building changes under it.

### 7.5 Saves and storage

- Saves are stored in **IndexedDB**, with a `localStorage` fallback.
- **Safe writes:** the new save goes to a staging record, is validated, then replaces the current slot. The previous one moves to the backup slot.
- **Loading:** if the current slot fails, the game offers the backup.
- Every save carries a `version`. `migrate.js` upgrades older saves step by step. A save from a newer version is refused politely.
- The install and import flow follows section 4.17.

## 8. Hosting and sharing

- **Repo:** `C:\dev\thebes` (outside OneDrive), branch `main`.
- **Commit identity for this repo only:** `Joshua Hedge <181878008+joshuahedge@users.noreply.github.com>`. The global git identity is unchanged.
- **Remote:** a **public** repo, `joshuahedge/thebes`, on the personal account, created when stage 1 is ready to publish.
- **Hosting:** **GitHub Pages** from `main` → `https://joshuahedge.github.io/thebes/`.
- It isn't hosted as a Claude artifact.
- **Local running:** `python -m http.server` from the repo folder.

## 9. Testing and quality

- **Unit tests** run from `tests/index.html` in a browser. Required cases include:
  - **Reach:** follows connected roads only and respects the distance.
  - **Housing:**
    - upgrades after a full month of met needs
    - household stock delays downgrades
    - downgrades one month after stock runs out
    - leavers are capped
    - merge and split rules work
    - **no upgrade lowers capacity or tax per tile** (data check)
  - **Labour:** workplaces fill in priority order and share proportionally within a level; slowdown when short-staffed; a building stops below 25%.
  - **Immigration and mood:** arrivals formula, no arrivals below mood 30, departures, and no unemployment-driven emigration before Town.
  - **Production and distribution:** no storage means no production; bazaars restock only from storage in reach; homes top up their stock from the nearest stocked bazaar.
  - **Undo:** 10-action history, full refund, cleared at the monthly tick.
  - **Fire:** risk lowered by staffing, seeded ignition, spread, burned houses becoming empty plots.
  - **Raids:** grace period, first-raid size, size fixed at the warning, tribute cancels the raid.
  - **Trade:** caravan caps, and the no-arbitrage data check.
  - **Monuments:** speed scales with crews and supply, prestige per layer.
  - **Determinism:** the same seed gives the same map; the same seed and commands give the same world after N days.
  - **Saving:** save then load gives an identical world; old versions migrate; a corrupt save falls back to the backup.
  - **Modes** (`ui/`): enter and exit transitions, and one mode at a time.
- **Long-run sanity test:** a scripted city simulated for 10 game-years, checking that there's no negative population or stock, no runaway treasury and no stuck supply chain, and that it runs within a time budget.
- **Play-testing in the built-in browser** at:
  - iPhone portrait
  - iPhone landscape (compact rail)
  - tablet
  - laptop (side panel)

  It covers every mode in section 6.4, mouse and keyboard on the laptop size, and the first-session flow from the title card to the first goals.
- **Accessibility checks:** contrast on every text style, a colour-blind simulation of overlays and placement states, reduced motion, keyboard-only play of the interface, and screen-reader labels.
- **Performance budget:** a smooth frame rate while panning and zooming a crowded 64×64 stress city on a mid-range phone, with terrain re-baking off the critical path.
- **Real-device checks by Joshua before each publish:**
  - iPhone Safari → install → import flow
  - Android Chrome install
  - opening the link from a chat app's in-app browser
  - the link preview in a messaging app

## 10. Delivery stages

Each stage ends playable and shareable at the link, and each gets its own step-by-step implementation plan.

1. **Core city:**
   - title card, opening, goals list and welcome-back card
   - map generation with **blended terrain**; camera, gestures, mouse and keyboard
   - roads (tap or drag) and area painting; housing tiers 1–4 with household stock and the house checklist
   - well, grain farm, granary, bazaar, temple (the firehouse arrives with fire in stage 3)
   - workers with priorities; immigration and mood; money
   - time controls with pause-on-hide
   - all three layouts with the modes table, placing, demolishing, undo, info sheets, minimap and alerts
   - overlays for water, food, religion and housing
   - the ☰ menu and settings, sound and haptics, feedback effects
   - autosave with a backup, export and import, the iOS and Android install flow, the in-app browser notice, link preview tags
   - the first GitHub Pages publish
2. **Economy:**
   - figs, pottery, beer, linen and jewellery chains; workshops with inputs; the storehouse with accept or refuse and stock shown on the map
   - housing tiers 5-9 with 2×2 merging and splitting, hysteresis, the warning month, and a roof tell per tier
   - desirability with gardens and statues, the placement preview and the house-sheet breakdown; the booth and entertainment
   - goods, entertainment and desirability overlays
   - the trading post and two partners with yearly quotas, a level to keep, drift and the first-caravan gift
   - milestones up to Capital (defences still locked until stage 3), "New" badges on unlocked cards, locked cards shown only for the next milestone
   - the early-game mechanics extended: goals that introduce each need, firsts and achievements for the new tiers and goods, new daily goals, tips for desirability, storage and trade, problem markers for the new alerts
   - difficulty (Relaxed, Normal, Hard)
3. **Danger:**
   - fire with seeded ignition and spreading, the firehouse, rubble
   - raids with warnings, tribute and the first-raid goal
   - walls, gates, towers, barracks, soldiers and combat
   - critical alert banners, the fire-risk overlay, the raid horn
4. **Monuments:**
   - quarry, brickworks, builders' guild and crews
   - staged construction with rotation
   - obelisks, colossus, mastabas and pyramids
   - prestige and its effects
5. **Missions:** a separate spec covering hand-made maps, starting conditions, limited building sets and goals, all as data.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Stage 1 is large (onboarding, three layouts, gestures) | Build the interface in thin, tested slices. Modes and layouts share one command layer, so each new layout is mostly arrangement. |
| Scope keeps growing | Fixed stages: anything new goes to a later stage unless it replaces something. |
| Slow on older phones | Baked terrain chunks, a sprite cache, drawing only what's on screen, a fixed-timestep simulation, the stress-city test from stage 1. |
| Saves lost on iPhone | Install guide before the first city, export and import with "Bring a city from Safari", persistent storage, a backup slot, the in-app browser notice. |
| Balance feels off | All numbers in `data/`, data checks (capacity, arbitrage), the long-run test, goal rewards as an easy tuning lever. |
| New players bounce | Goals list with Show me, house checklist, blocked-placement reasons, the paused start and welcome back. |
| Art looks flat or tiled | New Era-inspired lighting and detail, blended terrain, art slots that can take PNGs later. |
| Accidental copyright exposure | Original art only; Pharaoh and New Era used as visual reference, never as file sources. The name "Pharaoh" isn't used in the game or the repo. |
