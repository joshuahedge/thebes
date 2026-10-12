# Thebes: design spec

**Date:** 2026-10-09 (revised the same day after a three-reviewer pass covering game design, interface, and onboarding and accessibility)
**Status:** Approved 9 Oct 2026. Revised 11 Oct 2026 for Stage 2 (sections 4.1, 4.6-4.8, 4.10, 4.11, 4.14, 4.15, 4.18 and 10) from the Pharaoh Heaven review and the city-builder research; the calls made on Joshua's behalf are in that session's rulings list. Revised again 11 Oct 2026 for Stage 3 (sections 2, 3, 4.1, 4.3, 4.5, 4.7, 4.9, 4.11-4.14, 4.17, 4.18, 5.4, 5.5, 6.3, 6.4, 6.8, 7.2, 7.3, 9 and 10, and the new sections 4.19 Scoring and records and 5.6 Ambient life) from the Stage 3 review (`notes/2026-10-11-stage-3-review.md`); the calls made on Joshua's behalf are rulings 69 onward in `notes/handoff-2026-10-11/rulings-so-far.md`.
**Owner:** Joshua Hedge (personal project)

## 1. Summary

Thebes is a city builder for phone and desktop web browsers, inspired by Sierra/Impressions' *Pharaoh* (1999) and the look of *Pharaoh: A New Era* (2023). The aim is a game that's simple to pick up but has real depth. You lay out roads and housing and keep people supplied with water, food, faith, goods and entertainment, and their homes climb a nine-tier ladder from mud hut to grand estate. Production chains, trade, raids with automatic defence, and long-running monuments (obelisks, a colossus, mastabas, pyramids) give the city goals over many sessions.

It's a plain web page that installs to a phone's home screen, works offline, and saves on the device. People play it from one link: `https://joshuahedge.github.io/thebes/`.

## 2. Decisions

| Topic | Decision |
|---|---|
| Persistence | **Save and resume.** The city is saved on the device and is frozen while the game is closed. It always reopens paused. There's no server. |
| Structure | **Endless city with milestones** first, then a **mission campaign** built as data on the same engine. |
| Challenge | City troubles plus **automatic defence**. Fires start from Town and raiders come from Market town; walls, towers and soldiers fight on their own; players can pay **tribute** to avoid a raid (not the first). |
| Score | Four named parts out of 100, measured from the city's state, times a difficulty factor. Personal bests per seed and difficulty live on the device. No leaderboard (section 4.19). |
| Core systems | Housing upgrades, production chains, trade, desirability, monuments. River flooding is deferred. |
| Service coverage | **Reach along roads** decides coverage; **walkers are drawn for looks only**. |
| Housing | Nine tiers. Tiers 6–9 are 2×2 with **capacities 100 / 125 / 150 / 180**, so an upgrade never shrinks the city. |
| Art | An **original, code-drawn style inspired by Pharaoh: A New Era** (cool shadows, smooth whitewash, stacked houses, rugs, mosaics, painted monuments), with **blended, continuous terrain**. No Pharaoh assets. |
| Layouts | **Portrait phone**: build dock at the bottom. **Wide screens**: a Pharaoh-style side panel. **Short landscape screens**: a compact rail. |
| Input | Touch, mouse and keyboard are first-class. Controls follow the input in use, not the screen size. |
| Onboarding | A goals list with "Show me" replaces a tutorial. Houses explain why they won't upgrade. |
| Sound | About ten synthesised sound effects, **off by default**, no music. |
| Difficulty | **Peaceful, Relaxed, Normal, Hard**, chosen when a city starts: cost and risk multipliers, and Peaceful has no raids (section 4.18). |
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
- Global leaderboards and checked scores. A shared score is "friends' honour" (section 4.19).
- Streaks, daily locks, or anything that punishes leaving or not coming back.
- Screen-reader access to the map itself. The interface around it is accessible (section 6.8).

## 4. Gameplay

### 4.1 Opening and goals

- **Title card:**
  - Buttons: **Continue** (when a save exists), **New city** with the four difficulty choices (section 4.18), **This week's Nile** (the weekly seed, section 4.19), **Play with sound** / **Play muted**, and **Install** (where the platform allows).
  - Under Continue: up to three record lines, the device's three highest bests ("Best: 312, gold, seed 11"), and a row of stamps, one per sealed reign (section 4.19).
  - Opening a shared score link shows the friend's score beside your own best on that seed, with "Beat 301?" (section 4.19).
  - A paused, slowly drifting view of a sample city sits behind the buttons.
- **A new city starts:**
  - **paused**, with **2,000 gold**;
  - with the camera on fertile land;
  - with a **short road already running in from the trade edge** of the map.
- First arrivals walk in about 10 real seconds after the first housing plot is placed (at 1×).
- **Goals list:** shows up to **three goals at a time**.
  - Each goal has a **Show me** button. It opens the right build card and pulses the target area on the map.
  - Finishing a goal pays a small gold reward and reveals the next one.
  - The opening chain. Founded Thebes plus the nine goals up to Town (these six, then the Cottage, House and Town goals in `data/goals.js`) make ten, so the strip opens at "1 of 10":
    0. **Founded Thebes**, already ticked when the city starts (an endowed start; it pays no reward)
    1. Lay a road
    2. Place 6 housing plots
    3. Build a well so huts become shacks
    4. Farm, granary and bazaar
    5. Build a temple
    6. Reach 100 people
  - After the opening chain, goals come from the next milestone (for example "Reach 150 people to become a Town", "Build a booth so homes can grow into Manors").
  - From Town, goals introduce each new need when the tier below it is common ("Your homes now want pottery: build a clay pit and a potter"), then ask for a number of homes at the new tier, so one new demand arrives at a time.
  - Danger goals (chapter "Danger"): "Build a firehouse" right after the Town goal, and "Build a tower and a barracks" right after the trading-post goal (skipped on Peaceful).
  - The goal list is data (`data/goals.js`). Missions will reuse it later.
- **The goals strip on phones is one row** (portrait and compact): the count or label ("2 of 10"), the goal's words (two lines at most), a progress chip and **Show me**. The label and the words are one button that opens the **Goals sheet**, so there is no separate Goals button. **Skip guide** lives in the Goals sheet, one tap with no confirm. The Goals sheet also holds the reward and a **Recent** list of the last 10 captions (section 6.3). Wide screens keep their strip.
- **Next threshold bar:** a slim bar under the goals strip shows the next milestone ("Town: 83 of 150 people"). From Capital it shows the next medal instead ("Silver: 38 points to go"). A caption celebrates each step (section 6.3). On phones the bar shows only in **calm portrait play**: no banner, tip, caption, sheet or tool, never while the guide runs, and never on a landscape phone. The Goals sheet and the city summary always show it, and wide screens always show it under the strip.
- First-time events add one-off goals instead of a separate tutorial: the first fire ("Build a firehouse near the fire"), the first raid warning ("Build a tower facing the east"), the first labour shortage, the first empty bazaar.

### 4.2 Core loop

1. Lay roads and housing plots. People move into plots that touch a road.
2. Houses upgrade one tier at a time as their needs are met. Unmet needs make them downgrade.
3. Bigger houses hold more people and pay more tax.
4. Population milestones unlock buildings. Money pays for production, services, defence and monuments.

### 4.3 Time

- The simulation advances one **game-day** per tick. There are 30 days to a month and 12 months to a year.
- Speeds are pause, 1×, 2× and 3×. At 1×, a day is two-thirds of a second, a month is 20 seconds and a year is 4 minutes.
- Economy steps (taxes, wages, soldiers' pay, consumption, upkeep, immigration, mood, the score) run monthly. Production, movement, fire, raiders and combat run daily.
- The game **pauses when the page is hidden** (another app or tab, or the phone is locked) and **always reopens paused** (section 4.17). Nothing happens while the player is away.

**How long danger lasts** (all numbers in `data/fire.js` and `data/raids.js`):

| Event | Game time | At 1× |
|---|---|---|
| A blaze before it grows into a fire | 3 days | 2 s |
| A covered blaze being put out | 1 or 2 days (seeded) | under 1.5 s |
| A fire burning | 10-15 days (seeded) | 7-10 s |
| Raid warning to arrival | 3 months (90 days) | 60 s |
| First raid warning | 2 game-years after the city first has 250 people | 8 min |
| Later raid warnings | 2-4 game-years after the last raid (seeded) | 8-16 min |
| A festival's mood bonus, then the wait before the next | 3 months, 12 months | 1 min, 4 min |

**Speed reactions.** "Drop to 1×" turns 2× or 3× into 1× and leaves a paused game paused.

| Event | The first time in a city | After that |
|---|---|---|
| A fire no staffed firehouse reaches (blaze or fire, section 4.12) | Pause | The **On a fire** setting: Pause, Go to it (drop to 1× and move the camera there), or **Just tell me** (default: drop to 1× and show the banner) |
| A blaze a staffed firehouse reaches | No change (a warning row; a caption when it is out) | No change |
| A raid warning | Pause | Drop to 1× |
| Raiders arrive | Drop to 1× | Drop to 1× |

- The reaction goes through `setSpeed`, so it is saved with the city.
- Everything works while paused: building, drawing walls, paying tribute, opening sheets and moving the camera.

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
| Firehouse | 8 |
| Producer → storage | 12 |
| Bazaar ← storage (supply) | 16 |

Defence ranges are straight-line distances in tiles, not road reach: a **tower shoots 4 tiles**, and a **barracks' soldiers patrol 8 tiles** from its centre (section 4.13).

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
| Firehouse | −1 |
| Tower | −2, −1 |
| Barracks | −4, −2 |
| Rubble (each tile) | −3, −1 |
| Walls and gates | none |
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
  - **Raised by:** homes fed in full, employment, a festival (section 4.13), prestige (section 4.16).
  - **Lowered by:** unemployment above 15%, debt, a fire last month, buildings burned in the last six months, a raid in the last six months.
  - The danger terms (in `data/mood.js`; each shows as its own row in the summary's mood breakdown):

| Term | Mood | When it applies |
|---|---|---|
| A fire last month | −4 | Any building reached the fire stage last month (a blaze put out in time does not count) |
| Buildings burned in the last 6 months | −2 each, at most −10 | Every building that burned down, houses included, in the last 180 days |
| A raid in the last 6 months | −3 if beaten, −8 if lost | For 180 days after the raid ends. A raid cancelled by tribute never happened, so it costs nothing |
| A festival | +6 | For 3 months after it is held |

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
- **Spending:** building costs, monthly upkeep, wages per employed worker, soldiers' pay, trade purchases, rubble clearing, festivals, tribute, monument work. Raiders also steal gold (section 4.13).

| Stage 3 spending | Amount |
|---|---|
| Firehouse | 4 gold a month upkeep, plus 4 workers' wages |
| Tower | 8 gold a month upkeep, plus 4 workers' wages |
| Barracks | 12 gold a month upkeep, plus 6 workers' wages |
| Soldiers' pay | 8 gold per soldier per month, in peace as well as war |
| Walls and gates | no upkeep |
| Rubble clearing | 5 gold per tile × the difficulty's cost multiplier |
| A festival | 200 gold × the difficulty's cost multiplier |
| Tribute | about 0.8 × the price of the towers that would beat the raid (section 4.13) |

- **Balance target:** in a steady tier-4 town, wages plus upkeep plus soldiers' pay come to about 60–70% of tax income. Building costs and wages in `data/` are tuned to this, and the long-run test asserts the band. From Stage 3 the firehouses and defences a town needs are part of that spending, so they are the late-game gold sink until Stage 4's monuments.
- **Pausing a building** stops its wages and upkeep. A paused barracks still pays its soldiers.
- **Demolishing** refunds 25% of a building's cost. Roads and plots refund nothing. Clearing rubble costs gold instead (section 4.12). Undo (section 6.5) refunds in full.
- **Difficulty** multiplies building, road, wall, route, rubble-clearing and festival costs (section 4.18), and so tribute, which is priced from towers. Upkeep, wages and soldiers' pay do not change.
- **Debt.** The treasury can go down to −500. Any debt lowers mood, scaled with the debt. Below −500, nothing new can be built until it recovers.

### 4.12 Fire

Fire is the first danger. Every loss traces to a cause the player can see and fix: risk builds where no firehouse reaches, and the overlay, the building sheet and the problem markers all say so.

**Risk.**
- Fire risk only builds up once the city reaches **Town**. The firehouse is available from Village, so it can be built ahead.
- Each building that can burn keeps a risk value. Every day it adds its type's daily rate, times the difficulty's risk multiplier (section 4.18), times the firehouse cut below.
- **Ignition.** Once a building's risk reaches **100**, it has a **3%** chance each day of catching fire. The draw is stateless and seeded: `hash2(building id, day, seed + salt)`, as the daily goals draw theirs, so uncovered buildings don't all ignite at once and a reload changes nothing. Risk goes back to 0 when the building ignites.

| Building | Risk per day | Days from 0 to 100 with no firehouse (Normal) |
|---|---|---|
| Potter, brewery (kilns and vats) | 1.0 | 100 |
| Weaver, jeweller | 0.5 | 200 |
| Granary, storehouse, trading post | 0.5 | 200 |
| Hut, shack | 0.3 | 333 |
| Cottage, house, townhouse | 0.25 | 400 |
| Manor, fine manor, villa, estate | 0.2 | 500 |
| Bazaar, booth, barracks | 0.3 | 333 |
| Farms and orchards, clay pit, gem mine | 0.15 | 667 |
| Temple, firehouse | 0.1 | 1,000 |
| Never burn: roads, empty housing plots, gardens, statues, plazas, wells and water, walls, gates, towers, rubble | 0 | never |

**The firehouse.**

| Firehouse | Value |
|---|---|
| Size | 1×1 (like the well and the booth) |
| Cost | 50 gold (× difficulty cost) |
| Upkeep, workers | 4 gold a month, 4 workers |
| Priority, category | Safety (section 4.8), Services card, red emblem |
| Unlocks | Village |
| Reach | 8 road tiles (section 4.5) |

- **Coverage.** A building is covered when any road tile next to it lies within the reach of a working firehouse. Its coverage is the best staffing ratio (0 to 1) among the firehouses that reach it; a firehouse below 25% staff works not at all (section 4.8).
- **Cutting risk.** A covered building's daily risk is multiplied by `1 − 0.8 × coverage`. A fully staffed firehouse cuts build-up by 80%, so an uncovered House reaches 100 in about 13 months and a covered one in about 5.5 years.
- **Staffed**, for putting fires out, means coverage of at least 0.5.
- Coverage is computed from the firehouses' road reach and cached outside the world (keyed on the road and building versions), never by testing every pair of building and firehouse.

**Stages of a fire.**
1. **Blaze.** Every fire starts as a blaze lasting up to **3 days**. When it starts, the sim draws (seeded) whether it would take **1 or 2 days** to put out. Each blaze day on which the building is covered and staffed counts towards that number; when it is reached, the blaze is out. A blaze doesn't spread and the building keeps working.
2. **Fire.** A blaze that is not put out within its 3 days grows into a fire, which burns for **10-15 days** (seeded when it grows).
   - Each day it has a **6%** chance (seeded) of spreading to each neighbouring building that can burn. Neighbours are buildings that share an edge with its footprint, so a 1×1 building has at most 4 and a 2×2 at most 8. A spread starts a **blaze** in the neighbour, so coverage gets its chance there too.
   - Roads, gardens, statues, plazas, wells and walls never burn, so a road is a firebreak.
   - A building in the fire stage stops working (no production, service or storage use). Residents of a burning home stay until it burns.
   - Each day a covered fire has a **25% × coverage** chance of being put out. A firehouse built or staffed during the fire counts from the next day.
3. **Burned.** A fire that runs its days out burns the building down:
   - **Homes become empty housing plots** on the same tiles, so they refill. A 2×2 home becomes four empty plots. Its residents leave the city (nobody dies).
   - **Every other building becomes rubble**: one 1×1 rubble tile on each tile of its footprint. Any stock in it is lost.
   - The sim removes the building and inserts new ones under new ids; it never changes a building's type in place.
- A blaze or fire put out leaves the building as it was, with risk 0.

| Fire numbers (`data/fire.js`) | Value |
|---|---|
| Risk threshold | 100 |
| Ignition chance above it | 3% a day |
| Firehouse cut at full staff | 80% |
| Coverage that counts as staffed | 0.5 |
| Blaze length | 3 days |
| Days to put out a covered blaze | 1 or 2 (seeded) |
| Fire length | 10-15 days (seeded) |
| Spread chance to each neighbour | 6% a day |
| Chance a covered fire goes out | 25% a day × coverage |
| Rubble clearing | 5 gold per tile × difficulty cost |

**Rubble.**
- Rubble is a building type that can't be built (`buildable: false`, no card). It needs no road, costs no upkeep, never burns, and gives desirability −3, −1 (section 4.7).
- **Clearing** uses the Demolish tool: tap a rubble tile, or drag over an area to clear many in one go. The red bar shows the count and the total cost instead of a refund ("Clear 4 rubble: 20 gold"). Clearing is refused, with the reason, if it would take the treasury below −500.

**Seeing the cause.**
- **Fire-risk overlay** (graded, one hue, section 6.3): four bands by risk, with hatching on the top two, and a filled dot or hollow ring for "a firehouse reaches it" or "no firehouse reaches it". Buildings that never burn get no tint.

| Band | Risk | Look |
|---|---|---|
| Low | 0-24 | Lightest tint |
| Rising | 25-59 | Light tint |
| High | 60-99 | Strong tint, light diagonal hatching |
| Can catch fire | 100 and over | Strongest tint, dense cross-hatching |

- **The fire row** on every building sheet, from Town:

| Case | Row |
|---|---|
| Never burns | "Never catches fire" |
| Before Town | "Fire risk starts at Town" |
| Covered and staffed | "Fire risk: low, a firehouse reaches it" (band named as it is) |
| Covered, firehouse short of workers | "Fire risk: rising, the firehouse is short of workers", with View on the firehouse |
| Not covered | "Fire risk: high, no firehouse within 8 road tiles", with **Show me** (opens the firehouse card with its ghost next to the building) |
| Blaze, covered | "Blaze, the firehouse is putting it out" |
| Blaze or fire, not covered | "Burning, 9 days left, no firehouse reaches it", with Show me |

- **Problem markers** show on buildings in the High or Can-catch-fire band that no staffed firehouse covers.
- **Alerts:** a covered blaze is a warning (badge and list row), with a caption when it is out ("The firehouse put out a blaze at the potter"). A blaze or fire no staffed firehouse reaches is **critical** (the banner, section 6.3, and the speed reaction, section 4.3).
- The **first fire** adds the goal "Build a firehouse near the fire" (need: one more firehouse), with Show me placing the ghost near the burning building.
- **Firehouse placing** shows the fire-risk overlay with the reach preview, like every service.

**Tallies** (for the score, firsts, feats and the summary): fires started, blazes put out, fires put out, buildings burned (with the day of each, for mood and Safety), rubble tiles cleared.

### 4.13 Raids and defence

Raids are the second danger. They are telegraphed with a countdown, a direction and a target; the size is fixed when the warning appears; the first one is small enough for one tower; combat is automatic; and every raid ends with a report showing what the defences stopped. Peaceful cities have no raids (section 4.18).

**When raids come.**
- The raid clock starts on the day the city **first has 250 people** (it keeps running if people later fall). A Stage 2 city that already had 250 starts the clock on the day it is loaded.
- The **first warning** appears exactly **2 game-years** after that, and the raiders arrive **3 months (90 days)** after the warning.
- **Later warnings** come 720-1,440 days (2-4 years, seeded by `hash2(seed, raid index, salt)`) after the previous raid's arrival day, or after the day a cancelled raid would have arrived.
- **Entry and direction.** Each raid enters from one of the map's raider entry points (section 4.4), chosen by the same seeded draw. The direction is the entry's edge: "from the east", "from the north".

**How big.** The size is the number of raiders, fixed when the warning appears.

| Term | Value |
|---|---|
| People term | people now ÷ 125 (250 people → 2; 1,000 → 8) |
| Wealth | the treasury (if above 0) plus the base cost of every standing building except roads and walls |
| Wealth term | (wealth − 5,000) ÷ 5,000, at least 0 and at most 4 (10,000 → 1; 25,000 or more → 4) |
| Raw size | 1 + people term + wealth term |
| Raiders | round(raw size × the difficulty's risk multiplier × adaptation), at least 2 and at most **12** |
| First raid | always **3** raiders, at every difficulty (one staffed tower beats it) |
| Adaptation | starts at 1. A **lost** raid sets it to 0.6; every later raid (beaten, lost or paid off) then adds 0.2, up to 1. So after a lost raid the next one is ×0.6 and the one after ×0.8 |
| Towers needed | ceil(raiders ÷ 3): the staffed towers that would beat this raid |

Examples on Normal: 250 people and 6,000 wealth → 1 + 2 + 0.2 = 3.2 → 3 raiders. 600 people and 15,000 → 1 + 4.8 + 2 = 7.8 → 8. 1,000 people and a large treasury → 13 → 12 (on Relaxed, 6.5 → 7).

**What raiders want.** Raiders head for wealth, in this order: **trading post, storehouse, bazaar, temple**, then any other building that isn't a home. The warning names the kind at the top of the list that the city has ("Raiders from the east are after your storehouses"). When they arrive they go for the nearest building of that kind, or the next kind down if none stands.

**The warning.**
- It appears **3 game-months** ahead. The first warning pauses the game; later ones drop it to 1× (section 4.3). A short horn plays if sound is on (section 5.5).
- It shows as the critical banner. On wide screens that is the full banner, which can collapse to a one-line **countdown chip** under the top bar ("Raid from the east · 2 m 12 d"). On phones it is the one-line chip from the start, and its words open the **raid sheet** (below). The chip never times out (section 6.3).
- The entry point gets a **minimap pin with an arrow** pointing into the map.
- The wide banner names the direction and the target, and shows **Pay tribute** beside the defence it could buy: "or build 2 towers facing east (≈ 300 gold)". N there is the towers needed less the working towers the city already has; at 0 the line reads "Your towers can beat this raid". On phones the raid sheet carries these words.
- The first warning adds the goal "Build a tower facing the east" (need: one tower).

**Tribute.**
- **Price:** round(0.8 × towers needed × the price of a tower at this city's difficulty). For example 0.8 × 2 × 150 = 240 gold on Normal. It is fixed with the size.
- **Hidden for the very first raid**, so every player sees one fight.
- Payable any time during the warning, never once raiders have arrived.
- One **confirmation sheet** (`payTribute`): the cost, your gold afterwards, what it cancels and what it doesn't ("Cancels the raid from the east (8 raiders). The next raid still comes."), and two buttons named for the outcome, **"Pay 240 gold"** and **"Keep gold, defend"**, with no default.
- **The raid sheet.** On phones this same sheet is where the raid warning's details live: when the chip's words are tapped it shows when the raiders arrive, the defence line, and Pay tribute or Keep gold. On the first raid, where tribute is hidden, it is headed "Raid warning" and shows the arrival and the defence line only. It is the existing tribute sheet, not a new kind of sheet, and it adds no new mode (section 6.4).
- Paying **can't take the treasury below 0**. When it would, the pay button is disabled and says why in the words of the rule: "You have 180 gold. Tribute can't put the treasury below 0."
- A paid raid is cancelled: no raiders, no mood penalty. The next raid is scheduled as usual.

**Defences** (Defence category, all from Market town):

| Building | Size | Cost | Upkeep, workers | Hit points | What it does |
|---|---|---|---|---|---|
| Wall | one tile, drawn like a road | 8 gold per tile | none | 40 | Blocks raiders until broken |
| Gate | a wall tile drawn on a road | 20 gold | none | 40 | Citizens, walkers and road reach pass; raiders treat it as wall |
| Tower | 1×1, on open ground or on a wall tile | 150 gold | 8 gold, 4 workers (safety) | 80 when on a wall | Shoots the nearest raider within 4 tiles once a day |
| Barracks | 2×2 | 200 gold | 12 gold, 6 workers (safety) | — | Trains soldiers, up to 4 |

All costs are times the difficulty's cost multiplier. Towers and barracks need a road like any workplace; a gate counts as road.

- **Walls** are a tile layer (`world.wall`, hit points per tile), drawn with tap-start-tap-end or a drag, in an L that can be flipped, with the count and total cost before ✓ (Drawing mode, section 6.4). A wall can't go on water or a building. Drawing over a road makes a gate. A **tower on a wall tile** counts as part of the ring.
- **Damage and repair.** Wall, gate and tower tiles that were hit but not broken get their full hit points back when the raid ends. A broken tile (0 hit points) stays a gap, drawn as broken stone, until the player draws wall over it again at the normal price.
- **Barracks** train one soldier every 30 days at full staff (slower when short-staffed, none below 25%), up to 4 per barracks. Soldiers are paid 8 gold a month each, in peace too. They wait at the barracks, walk out to any raider within 8 tiles of it, and walk back when none is left.

**Raiders and combat** (daily steps; units are drawn moving smoothly between days):

| Unit | Hit points | Moves | Damage |
|---|---|---|---|
| Raider | 10 | 1 tile a day | 2 a day to the wall, gate or tower tile in its way, or to a soldier beside it |
| Soldier | 12 | 2 tiles a day | 3 a day to a raider beside it |
| Tower | — | — | 4 a day × staffing ratio, to the nearest raider within 4 tiles (straight line) |

- **Pathfinding.** Raiders move as **one band** along a flow field towards their current target, rebuilt when walls, roads or buildings change (cached outside the world). Open ground and roads cost 1 per tile; buildings and water can't be crossed; a wall, gate or tower tile costs 1 + its hit points ÷ 2 (the days one raider needs to break it), and 1 once broken. So a closed ring keeps raiders out until they breach it, and they breach where it is cheapest.
- **Breaching.** Raiders stop at a wall tile on their path and hit it until it breaks. Towers in range shoot them all the while. The band waits while any member is breaking a wall or fighting.
- **Strikes.** At a target the band stays 2 days. On the first day it sets the building on fire (a **blaze** through the fire system, section 4.12, so a covered firehouse can still save it), and each raider steals 1% of the treasury (at least 5, at most 50 gold), never taking it below 0. The band strikes at most **3 targets**, then walks back to its entry and leaves.
- **Soldiers** that reach a raider fight it until one falls. A soldier at 0 hit points is wounded and leaves service; the barracks trains a replacement. Citizens are never hurt.
- **Retreat.** When half the raiders (rounded up) have fallen, the rest turn back to their entry. Towers keep shooting as they go.
- **The end.** A raid ends when no raider is left on the map. It is **beaten** if the raiders retreated or all fell, and **lost** if the band left after its strikes.

**The report**, as a caption and as a line in the summary:
- Beaten: "Raid from the east beaten: 2 towers stopped 9 of 12, soldiers stopped 3; 1 storehouse burned, 40 gold stolen."
- Lost: "Raid from the east: raiders burned 3 buildings and took 120 gold. Towers stopped 1 of 6."

| Raid numbers (`data/raids.js`) | Value |
|---|---|
| People to start the raid clock | 250 (never on Peaceful) |
| First warning | 720 days after that |
| Warning length | 90 days |
| Later raids | 720-1,440 days apart (seeded) |
| Raiders | 3 the first time, then 2-12 by the size table |
| Raiders per tower (for towers needed) | 3 |
| Tribute | 0.8 × towers needed × tower price |
| Strikes per raid, days per strike | 3, 2 |
| Gold stolen per raider per strike | 1% of the treasury, 5-50 |
| Retreat after losing | half, rounded up |
| Soldiers per barracks, days to train one | 4, 30 |
| Soldiers' pay | 8 gold a month |
| Patrol radius, tower range | 8 tiles, 4 tiles |

**Festivals** (a small mood lever, for after a raid or any bad patch):
- The temple sheet has **Hold a festival** from Town, costing 200 gold (× difficulty cost), when the temple is working.
- It adds +6 mood for 3 months (section 4.9). The next one can be held 12 months later; until then the button shows "Next festival in 7 months".
- It is refused, with the reason, if it would take the treasury below −500.

**Tallies:** raids, raids beaten, raids lost, tributes paid, raiders stopped (by towers and by soldiers), soldiers wounded, gold stolen, festivals.

### 4.14 Progression

| Milestone | Population | Unlocks |
|---|---|---|
| Village | 0 | Roads, housing, well, grain farm, granary, bazaar, temple, garden, firehouse |
| Town | 150 | Figs, clay pit, potter, storehouse, booth, statue, festivals at the temple. Fire risk begins. |
| Market town | 250 | Trading post (first partner), walls, gate, tower, barracks. The raid clock starts (not on Peaceful). |
| City | 400 | Barley and brewery, quarry, brickworks, builders' guild, small and large obelisks |
| Great city | 650 | Flax and weaver, colossus, small mastaba, second trade partner |
| Capital | 1,000 | Gem mine and jeweller, large mastaba |
| Prestige | Prestige points | Small pyramid, great pyramid |

- Locked buildings show in the build tray only for the **next** milestone, greyed out with their unlock condition; later ones stay hidden until then, so the tray never fills with grey. Buildings of later stages (monuments) stay hidden until their stage ships. Rubble is never a card.
- A city saved before Stage 3 gets "New" badges for the firehouse, and for the defences if it is already a Market town.
- Reaching a milestone shows a caption ("Your village is now a Town"; 5 s, section 6.3), and newly unlocked build cards get "New" badges.
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
  - trends in population, treasury, mood and the city score (section 4.19)
  - open goals
  - alerts, each with **View**, including a raid countdown or a fire

  **Carry on** restores the last speed.
- **Export / import:**
  - Export produces a `.json` save through the share sheet (Web Share API with a file), falling back to a download.
  - Import accepts a file.
  - The export also carries the device's records (section 4.19). Importing merges them into the device's own, so moving to a new phone keeps the bests.
  - Starting a new city asks for confirmation and offers to export first.
- **Phones and saved data:**
  - **iOS keeps a home-screen app's storage separate from Safari's.** So the home-screen install guide appears **at first launch, before a city exists**.
  - If a city already exists in Safari when the player installs, the game exports it first. The installed app, finding no save, offers **"Bring a city from Safari"** (import).
  - Safari may delete website data that hasn't been visited for 7 days. The home-screen app is exempt. The game also requests persistent storage (`navigator.storage.persist()`) where supported.
  - In **in-app browsers** (Messenger, Instagram and the like), the game shows "Open in Safari/Chrome to keep your city", because those browsers can't install apps and keep separate storage.
  - If storage fails (private browsing, full storage), a persistent banner warns that progress won't be saved.

### 4.18 Difficulty

- Four levels, chosen when a city starts and fixed for its life. Danger is a dial the player sets, never a surprise.

| Level | Costs (buildings, roads, walls, routes, rubble, festivals) | Fire risk build-up | Raids | Score factor |
|---|---|---|---|---|
| **Peaceful** | ×0.8 | ×0.5 | None | 0.7 |
| **Relaxed** | ×0.8 | ×0.5 | Size ×0.5 | 0.8 |
| **Normal** | ×1 | ×1 | Size ×1 | 1 |
| **Hard** | ×1.25 | ×1.5 | Size ×1.5 | 1.25 |

- The risk multiplier scales fire risk build-up (section 4.12) and raid size (section 4.13). It never changes raid timing, the first raid's size, or upkeep and wages.
- **Peaceful** is a valid way to play. Its city never starts a raid clock; the Defence cards still work, but the defence goals, daily goals, feats and achievements are skipped; its Safety part counts defence as full (section 4.19); and its personal bests are its own, as every level's are.
- Peaceful is offered for new cities only. A Stage 2 city keeps its level.
- The title card shows the four as a choice under New city (the last one used is preselected, Normal the first time); the settings sheet holds the choice for the next city. The city summary names the level, and the hint under each choice says what it changes ("No raids. Fires half as often. Buildings cost about 20% less."). Goals, workers and desirability are the same at every level.

### 4.19 Scoring and records

A score says how well the city is doing, in a way you can compare between cities and days. It also tutors, because each part names its main reason. It is measured from the city's state, never from clicks, wall-clock time, pausing or undo, and it never gates anything.

**The parts.** Four parts, each 0-100, computed at every month's end (with mood). A fifth, **Monuments**, joins in Stage 4.

| Part | Formula (each term 0 to 1) | Main reason line, e.g. |
|---|---|---|
| **People** | 60 × growth + 40 × homes. **Growth** = (milestones reached after Village + the fraction of the way to the next, by people now) ÷ 5, and 1 at Capital. **Homes** = (average tier of lived-in homes, weighted by residents − 1) ÷ 8 | "Town: 83 of 150 people", "Most homes are Townhouses" |
| **Prosperity** | 30 × taxes + 30 × jobs + 20 × treasury + 20 × trade. **Taxes** = last month's tax per person ÷ 5, at most 1. **Jobs** = 1 − (unemployment − 5%) ÷ 25%, clamped (full at 5% or less, 0 at 30%). **Treasury** = 1 at 0 gold or more, falling to 0 at −500. **Trade** = open trade routes ÷ 2 | "12% of workers have no job", "No trade route yet" |
| **Culture** | 25 × temple + 25 × entertainment + 25 × bazaar + 25 × pleasant. The first three are the share of lived-in homes reached by a working temple, booth and bazaar. **Pleasant** = average desirability of lived-in homes ÷ 50, clamped | "4 homes have no entertainment" |
| **Safety** | 40 × fire + 40 × defence + 20 × record. **Fire** = the share of buildings that can burn covered by a staffed firehouse (1 before Town). **Defence** = (working towers + soldiers ÷ 3) ÷ towers needed for a raid sized now, at most 1 (1 before the raid clock starts, and always on Peaceful). **Record** = 1 − 0.2 × buildings burned in the last 12 months − 0.5 × raids lost in the last 12 months, at least 0 | "No firehouse covers the east streets", "A raid this size needs 3 towers; you have 1" |

- Each part rounds to a whole number. Its reason line names the term that lost it the most points. A city with no lived-in homes scores 0 on Homes and Culture.
- **City score** = (People + Prosperity + Culture + Safety) × the difficulty's score factor (section 4.18), rounded. Its most is 400 on Normal and 500 on Hard.
- **Versioned.** This is **score v1**. Records keep the version, and a best made with an older formula is kept but labelled "older scoring". Stage 4's Monuments part makes it v2.
- Each month-end row in `world.history` stores the score and its four parts.

**Where it shows.**
- **The summary sheet** has a score section: the city score, each part's bar with its number and reason line, the medal and the points to the next one, the milestone splits, and the **Seal this reign** and **Share score** buttons.
- **A small chip on the summary button** shows the live total ("Score 247"), once somebody lives in the city. The top bar is unchanged.
- **Welcome back** shows the score and its trend (section 4.17).
- **Previews while placing.** The confirm bar adds the parts the building would change, beside the reach lines: "Gives water to 6 homes · +3 Culture". It counts the building as staffed, and shows only changes of 1 point or more.

**Milestone splits.**
- The world records the game-day on which the city first became each milestone (Town, Market town, City, Great city, Capital).
- The summary shows each as a game date and compares it with your best for this seed and difficulty: "Town in year 2, month 3: 4 months faster than your best".

**Medals.**
- Bronze, silver and gold are set on the parts' total before the difficulty factor: **160, 240 and 320 of 400**. They are shown in city-score points, so they move with the factor:

| Medal | Parts' total | Peaceful | Relaxed | Normal | Hard |
|---|---|---|---|---|---|
| Bronze | 160 | 112 | 128 | 160 | 200 |
| Silver | 240 | 168 | 192 | 240 | 300 |
| Gold | 320 | 224 | 256 | 320 | 400 |

- These are first guesses, to be retuned from Joshua's and friends' playtests.
- The next threshold is always visible in the summary chip's sheet and, from Capital, in the next-threshold bar: "38 points to Silver".

**Seal this reign.**
- A button in the summary. Its confirmation sheet says what happens: "Seal this reign? Your chronicle gets score 247 (Silver) for this city. The city carries on." Buttons: **"Seal reign"** and **"Not yet"**.
- `sealReign` records the day and score in the world. The interface then writes a **chronicle entry**: score, parts, splits, seed, difficulty, the date on the device, medal, feats earned, and the score version.
- The city carries on. It can be sealed again later; each seal is a new entry and a new stamp.

**Records on the device.**
- `localStorage` key `thebes.records`, separate from the save, read and written inside try/catch (private browsing must not break the game).
- Each city gets an id when it is created, passed in by the interface (the sim never reads the clock). Records hold one **city row** per id (seed, difficulty, score version, best month-end score, splits), updated on every save, and one **chronicle entry** per seal. Each list keeps at most 200; the oldest go first, but never a best.
- **Personal bests** are per seed and difficulty: the highest month-end score of any city on that seed and difficulty, and the earliest day each milestone was reached.
- The title card lists the three highest bests ("Best: 312, gold, seed 11") and a **stamp** per sealed reign: the seed's map outline with its medal. Stamps are cosmetic.
- Export carries the records and import merges them by id (section 4.17).

**This week's Nile.**
- A weekly seed from the local date: seed = ISO week-year × 100 + ISO week number (week 41 of 2026 is seed 202641). The interface reads the date; the sim never does.
- The title card offers it as **This week's Nile**, with the usual difficulty choice. It plays offline, any number of times, and the best counts. Weekly, not daily, so there is no appointment to keep.

**Sharing** (opt-in only; nothing nags or rewards sharing):
- **Share score** makes a link: `https://joshuahedge.github.io/thebes/#t1.<seed>.<difficulty>.<parts>.<splits>.<check>`.

| Field | Form |
|---|---|
| `t1` | Link format 1, which carries score v1 |
| `<seed>` | The seed in decimal |
| `<difficulty>` | `p`, `r`, `n` or `h` |
| `<parts>` | People, Prosperity, Culture and Safety joined by `-` ("72-65-58-40") |
| `<splits>` | Game-months from the start to Town, Market town, City, Great city and Capital, joined by `-`, with `x` for not reached |
| `<check>` | 4 base-36 characters of a hash of the rest; it catches typos, not cheats |

- **Opening a link** validates it (a bad or newer link says so and opens the title card as usual). The title card then shows the friend's score and parts beside your best on that seed and difficulty, "Beat 301?", and **Start this seed** (which asks first if a city exists, as New city does).
- **Picture card.** A 1200×630 picture: the city, the four part bars, the medal, the seed and difficulty, labelled **"friends' honour"**. It goes through the share sheet (`navigator.share` with a file), falling back to a download. The picture is made before the tap, so the gesture doesn't lapse.
- **Emoji row** for chat apps, with no spoilers: one line per part, five squares for each 20 points ("People 🟩🟩🟩⬜⬜").
- Every shared score says **friends' honour**: a link can't be checked without a server.
- **Screenshot mode** (in the ☰ menu and beside Share score) hides the whole interface until the next tap, click, Esc or Back. Pinch and drag still move the camera; the speed doesn't change.

**Feats** (named, optional style bonuses; listed under achievements in their own group and shown when sealing; they pay nothing and never gate anything; per city):

| Feat | Condition |
|---|---|
| Debt-free founder | Reach Town without the treasury ever going below 0 |
| Well fed | Every home at Cottage or above fed for 12 months in a row, with at least 100 people |
| Grain alone | Reach Market town without building a fig orchard |
| Firewise | No building burned for 5 game-years after reaching Town |
| Untouched | Beat a raid with no building burned and no gold stolen |
| Never bowed | Reach Capital without paying tribute (not on Peaceful) |
| Garden city | 20 gardens and statues at once |
| Full hands | At least 400 people with unemployment at 5% or less |
| Merchant prince | Sell 1,000 goods to caravans |
| Swift Town | Become a Town before the start of game-year 3 |

**More for the early game** (each passes the test "skipping it costs you nothing"):
- The endowed start and the next-threshold bar (section 4.1), and the "+N" previews above.
- **Citizen remarks.** Short lines in the caption row ("The potters say the clay is good this year"), at most one every 3 game-months and only when the caption row is free (on phones, the guidance row, section 6.3). Each is chosen by `hash2(seed, month index)` from a pool of at least 24 in `text.js`, by season (Akhet: months 1-4, Peret: 5-8, Shemu: 9-12), and only from remarks whose building the city has. They follow the Help setting (none when Help is Off).
- **A soft coin tick** when the month's taxes arrive (if sound is on), and **a ripple** on each home that a newly placed well first waters (not under reduced motion). Section 5.4.

**Danger in the goals and rewards** (data plus words, as in Stage 2):

| Kind | Stage 3 additions |
|---|---|
| Chapter | "Danger" |
| Chain goals | "Build a firehouse" (after the Town goal); "Build a tower and a barracks" (after the trading-post goal; not on Peaceful) |
| Event goals | First fire: "Build a firehouse near the fire". First raid warning: "Build a tower facing the east" (the raid's direction) |
| Firsts (10 gold each) | First firehouse, first blaze or fire put out, first wall, first tower, first raid beaten |
| Achievements | Three firehouses; 500 people and no building burned for a year; 50 wall tiles; beat 3 raids |
| Daily goals | Build a firehouse (from Town); lay 10 wall tiles and build a tower (from Market town, not on Peaceful) |
| Tips | Fire risk and the firehouse's reach; roads as firebreaks; clearing rubble; what raiders want; tribute cancels one raid only; a closed wall ring with towers on it |

**Avoid** (as the Stage 2 rulings already do): streaks or daily locks; timers that run while away; global leaderboards; scoring wall-clock speed; penalising undo or pausing; fake near-misses; sharing nags or rewards; content gated by achievements or feats.

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
- **Milestones:** a caption, plus "New" badges on unlocked cards.
- **Taxes:** a soft coin tick when the month's taxes arrive (sound only). **Water:** a ripple ring (0.8 s) on each home a newly placed well first waters.
- Walkers, carts, boats and smoke animate gently. The ambient layer (section 5.6) adds water, sway, smoke and rare life.
- **Fire** is drawn from the world's fire state, so it survives a reload:
  - A blaze is one small flame on the roof; a fire is three larger flames and a column of the potter's soft smoke puffs.
  - Flames change **shape** (tip sway, embers rising) at 2 Hz or less. They never flash brightness and never use a saturated-red flash. Nothing pulses for longer than 5 s.
  - A burned home shows the empty-plot look; rubble has its own heap of broken mudbrick, distinct in shape from both.
- **Units:**
  - Raiders and soldiers are drawn 1.5× the size of citizen figures and are few (at most 12 raiders and 4 soldiers per barracks).
  - Raiders are dark silhouettes against the sand, with a crested helmet and a round shield. Soldiers wear white kilts and carry tall spears and teal shields. They differ by shape, not just colour.
  - A unit's health bar appears only once it has been hit.
  - Tower arrows are thin strokes that fly for 0.3 s.
  - Walls are a continuous mudbrick band along their tiles, with a gate arch on roads and broken stone at a breach.
- **The camera moves only when the player taps View** (or chose "Go to it" for fires, section 4.3).
- **Respects `prefers-reduced-motion`.** With it on: no puffs, pulses, ripples or ambient life; a burning building shows a still flame icon and the word "Burning"; arrows show as a still line for a moment; walkers and units move, but the camera never pans, and View is an instant cut.
- Every flicker or pulse stays under 3 flashes per second (WCAG 2.3.1).

### 5.5 Sound and haptics

- About ten **synthesised Web Audio** effects: place, road, demolish, upgrade, milestone, alert, goal complete, and from Stage 3 a **raid horn** and a **coin tick**. There's no music.
  - Like every effect, each is built from short notes of at most 0.4 s and gain at most 0.35. The horn is three low notes, played once when a raid warning appears; the coin tick is one high note of at most 0.1 s at gain 0.15 or less, played when taxes arrive.
  - Sound is never the only signal: every sound has a visual twin (the banner, the caption).
- **Off by default.** The title card offers "Play with sound", and the choice is remembered. It's also in settings.
- The game sets `navigator.audioSession.type = 'ambient'` where supported and never uses the silent-switch unlock hack, so the iPhone silent switch is respected.
- Short `navigator.vibrate` pulses on ✓ and milestones where supported (Android Chrome only; iOS web has none, so the visuals stand alone). There's a setting to turn them off.

### 5.6 Ambient life

The city breathes: slow, small, out-of-step motion over the landscape. Terrain is baked into cached chunks (section 5.2), so ambient motion is a light layer drawn over the chunks for visible tiles only; swaying trees are drawn in the depth-sorted pass.

| Element | Look | Motion |
|---|---|---|
| Water glints | Short pale strokes on the river, garden pools and Estate pools | Drift downstream at about 0.2 tiles a second, fading in and out over 4-7 s |
| Bank ripples | A faint line along each bank | Shifts about 1 px back and forth over 5 s |
| Reeds | A few blade tips along the banks, over the baked reeds | Sway ±3° over 3-6 s |
| Palms and acacias | The tree itself | Lean ±2° from the base over 4-6 s |
| Crops | Lighter stripes across a working farm | A band crosses the field in the wind direction every 6 s |
| Smoke | The potter's soft puffs | Rise about one tile and fade, one puff every 2-3 s, from the potter's kiln, the brewery, and the chimneys of Townhouses and up, while they work |
| Rare life | A bird crossing the screen; a felucca drifting on the river; ducks near the reeds | At most one of each on screen; each appears every 60-120 s |

- **Out of step.** Every phase comes from the tile's hash, so nothing moves together. The wind direction is fixed per seed.
- **Real clock.** Ambient motion runs on the real clock, so it carries on while the game is paused. It stops when the page is hidden.
- **Switchable.** It is off under reduced motion, and Settings has **Ambient motion: On / Off** (On by default; Off while reduced motion is on).
- **Calm.** No flashing, and nothing changes direction or brightness more than once a second (1 Hz).
- **Budget.** At most **2 ms a frame** on a mid-range phone, measured on the stress city. Over budget, it drops rare life first, then smoke, then sway, and keeps the water.
- **Idle frame rate.** When the game is paused and there has been no input for 2 s, the frame rate is capped at 30.

## 6. Interface

### 6.1 Principles

- **Things you read sit at the top, things you tap sit at the bottom** (or in the side panel on wide screens).
- **Nothing floats over the middle of the map.** Corner buttons are fine. On phones the middle third of the map never holds text (section 6.3, Small phones).
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
- **Compact landscape layout** (every other viewport: wider than tall, but under 900 × 520 px). Used on phones held sideways and small tablets: a slim **vertical rail on the right** with category icons, trays opening as a side drawer, ✕ and ✓ at the bottom of the rail (hidden while the confirm bar shows its own), and a condensed top bar.
- **Rotating** keeps the camera position and any placement in progress.

### 6.3 Screen elements

- **Top bar:** gold, population, mood, date and the ☰ menu. Tapping it opens the **city summary** sheet: income against spending (soldiers' pay on its own row), food in store, employment, the mood breakdown, goals, the score section (section 4.19) and the last raid's report. A small chip on the summary button shows the score ("Score 247") once somebody lives in the city; the top bar gets nothing new. On a landscape phone, and on a portrait phone at 150% text, the chip sits in the numbers' row right after the date. On a phone at 150% text each of the four numbers shows a small picture in place of its word (a coin, an ankh, a smile, the sun; the word stays for screen readers), so the numbers keep to one row.
- **Speed controls:**
  - Portrait: pause and speed sit in the **bottom-left corner button** (tap to pause or resume, long-press or tap the chevron, labelled **Speed**, for 1×, 2× or 3×).
  - Wide: the speed controls are in the top bar.
- **Build dock (portrait),** one panel with three heights:
  1. **Slim bar** (default): category icons with labels (Roads, Homes, Food, Industry, Services, Defence, Monuments).
  2. **Tray**: tapping a category or swiping up shows its buildings as cards with cost. Unaffordable costs show in coral with a coin-slash icon, and locked cards show a lock and their condition. The tray scrolls sideways and remembers the last category.
  3. **Tucked away**: swiping down or panning the map shrinks the dock to a single **Build** pill.
- **Corner buttons** show at **every dock height**, never in the middle (in portrait at 125% text or more they hide while the tray is open if they would sit above half the screen):
  - bottom-left: pause and speed
  - bottom-right: the **minimap** button with an **alert count badge**, and the **overlay** button
- **Alerts** come in three tiers, one channel each:

| Tier | Channel | Examples | Screen readers |
|---|---|---|---|
| Info | A caption (the caption row on wide screens, the guidance row on phones) | A blaze put out, a raid report, a citizen remark | Polite status |
| Warning | The count badge, a row in the minimap sheet's list, and a problem marker on the map | A covered blaze, high fire risk, labour shortage, an empty bazaar, no storage | Polite status |
| Critical | **The one banner** under the top bar (the alert row on phones) | See the ranking below | `role="alert"` |

  - **Only one banner ever shows.** It holds the highest-ranked critical, ranked by how soon harm lands: **an active raid, then a fire no staffed firehouse reaches, then a raid warning, then debt, then save failing**. A fire burns out in 7-10 s and a warning gives about 60 s, so a fire is never hidden behind a raid that is months away. The others wait in the minimap list. On wide screens the banner shows "+2 more", which opens it. On phones there is no "+N more": the Map badge counts every alert the banner is not showing, criticals included, and the minimap sheet, opened from the badge or from the banner, lists alerts first (criticals first) and the map second.
  - **Repeats roll into one line**: "3 buildings on fire", whose View steps through them in turn.
  - Banner words and buttons:

| Critical | Banner | Buttons |
|---|---|---|
| Active raid | "Raid from the east: 9 raiders left" | View |
| Raid warning | Wide: "Raiders from the east are after your storehouses. They arrive in 2 months 12 days." and "or build 2 towers facing east (≈ 300 gold)". Phones: the countdown chip (below) | Wide: View, Pay tribute (not on the first raid), Shrink. Phones: View, and the words open the raid sheet (section 4.13) |
| Fire | "Fire at the potter: no firehouse reaches it" or "3 buildings on fire" | View |
| Debt, save failing | As in Stage 2 | As in Stage 2 |

  - **The countdown chip.** A raid warning's banner is one line, "Raid from the east · 2 m 12 d" ("Raid from the east · 2 months" when the days are 0), with View. On wide screens the full banner collapses to it with Shrink; on phones it is the banner from the start, and its words open the raid sheet. It stays in the banner's place: it never times out and never stacks with another banner. When an active raid starts it becomes that raid's banner.
  - **Minimap pins** can mark a map point as well as a building: the raid entry gets a pin with an arrow pointing in.
  - Banners never time out. They clear when the trouble does.
  - **Small phones.** In the portrait and compact layouts everything that appears over the map is kept to a budget, at any text size, so the rows never reach the middle of a 375×667 portrait phone or an 844×390 landscape phone. Wide layouts keep what they have.
    - **At most two rows under the top bar:** an **alert row**, the one banner as one line (icon, words, View), and a **guidance row**. The guidance row shows one thing, in this order: the overlay legend (while an overlay is on), a tip, a caption, the goal (with the threshold bar in calm portrait play, section 4.1). Its words wrap to two lines at most; longer text is cut with "…", with the full words in the button's name and one tap away (the Goals sheet, the raid sheet, How to play).
    - **One row on a landscape phone at 125% or 150% text:** the alert row when there is a banner, otherwise the guidance row.
    - **A sheet open:** the guidance row hides, so tips and captions wait (a caption that waits more than 10 s goes to Recent), and the alert row stays one line. In compact the rows stop at the sheet's left edge. The camera frames a selected building, the placing ghost and Show me in the part of the map left free below the measured rows, not below a fixed 48 px bar.
    - **A tool active** (placing, drawing, demolishing): the guidance row shows the goal or a caption, and tips wait.
    - **Captions** show one at a time, 3 s apart: **4 s** for goals, firsts, feats and remarks, **5 s** for milestones and **6 s** for info. At most two wait; an older one goes straight to **Recent**. Every caption is also written to Recent, the last 10, in the Goals sheet. While a banner is up only info captions show; the rest go to Recent. A goal caption reads as the strip itself changing ("✓ Lay a road · +25 gold", then "2 of 10 Place 6 housing plots").
    - **Tips** show one at a time. A tip takes the guidance row in place of the goal, and closes on **Got it**, on Esc, when its condition clears, or after **20 s of unpaused play** (so a paused game keeps it). The caps stay: none in the first 10 s of a session, at least 3 min between two, at most 5 an hour. A tip whose words are about the sheet or overlay that brought it (the house sheet's needs, the overlay's dot and ring) never waits, since its words would be false once that has closed: while the sheet or the legend has the row it is dropped unseen, and it can come again the next time. Tips are always listed in How to play.
    - **Toasts** show one at a time (the newest replaces the last), as wide as the screen allows up to **420 px** with 16 px sides, above the corner buttons: 4 s, or 6 s with Undo. Undo always undoes the last action, and also works from the confirm bar and with Ctrl+Z.
    - **Height budget** (where the rows under the top bar end, as a share of the screen height; this is what the tests hold):

    | Screen | Text | Rows end by | With a sheet open |
    |---|---|---|---|
    | 375×667 and 390×844, portrait | 100% | 30% | 20% |
    | | 150% | 40% | 25% |
    | 844×390 and 667×375, landscape | 100% | 40% (two rows) | the rows stop at the sheet's edge |
    | | 125% and 150% | 40% (one row) | the rows stop at the sheet's edge |
- **Overlays:** water, food, religion, goods, entertainment, desirability, **fire risk** and **Housing**.
  - Housing shows each home's next blocking need.
  - Has-it versus missing is shown as a **filled dot versus a hollow ring**. Graded overlays (desirability, fire risk) use a single-hue light-to-dark scale with a legend.
  - The **fire-risk legend** reads, in words: "Low · Rising · High · Can catch fire", with the hatching drawn on the top two swatches, then "● a firehouse reaches it · ○ no firehouse reaches it" and "Roads, gardens, statues, wells and walls never burn" (bands in section 4.12). On a portrait phone that last line is kept for screen readers only, so the legend fits the guidance row.
  - The legend strip attaches under the top bar. On wide screens a critical banner shrinks a dot-and-ring legend to its marks (the words stay for screen readers). On phones the legend takes the guidance row while an overlay is on (the goal waits), so the full legend reads under a banner.
- **Minimap sheet:** the whole map, the current view outlined, and alert pins. Tapping the map jumps there. It also holds the alert list with View buttons (on phones the list comes first, criticals first, then the map) and **+/− zoom buttons**, the zoom alternative that doesn't need pinching.
- **Info sheets.** Selecting a building moves the camera so the building stays visible above the sheet and below the alert and guidance rows.
  - **Buildings:** name, reach (highlighted), staffing, stock, problems, and from Town the **fire row** (section 4.12: "Fire risk: high, no firehouse within 8 road tiles", with Show me). Every problem names the **cause and the fix** with **View** ("Bazaar empty: no granary within 16 road tiles").
  - **Houses:** a **next-tier checklist** with a tick or cross for each need, timers ("upgrades in 1 month", "loses water in 1 month"), the desirability breakdown, residents and the fire row.
  - **Temple:** also **Hold a festival** with its cost, or "Next festival in 7 months" (section 4.13).
  - **Tower and barracks:** staffing, range or patrol radius (highlighted), soldiers trained ("3 of 4 soldiers; next in 12 days"), and what it stopped in the last raid.
  - **Rubble:** "Rubble: clear it for 5 gold a tile", with Clear (the Demolish tool).
  - **Actions:** Pause, Demolish, and Rotate where it applies.
- **☰ menu:** Continue, New city, Export city, Import city, Settings, How to play (goal history and short explanations), **Screenshot mode** (section 4.19), About.
  - **Settings:** sound, vibration, text size, left-handed controls (mirrors ✕ and ✓ and the corner buttons), keyboard shortcuts on or off, reduced motion (follows the system by default), **On a fire: Pause / Go to it / Just tell me** (default Just tell me, section 4.3), and **Ambient motion: On / Off** (section 5.6).
- **"Update ready" toast:** appears only when no placement or raid is in progress. It saves first, then reloads.

### 6.4 Modes

| Mode | Bottom (portrait) / panel (wide) shows | A tap or click on the map | How to leave |
|---|---|---|---|
| Browse | Dock or panel | Selects a building or house → info sheet | n/a |
| Selected | Info sheet | Selects another; tapping empty ground closes | ✕, Back, Esc, tap empty |
| Placing | **Confirm bar**: name, cost, **reason if blocked**, ⟳ rotate, Undo, ✕, ✓ | Moves the ghost to the tapped tile | ✕, Back, Esc, right-click |
| Drawing (roads, walls, area paint) | Confirm bar with length or count and total cost | First tap sets the start, second sets the end | Same as Placing |
| Demolishing | Red **Demolish** bar with count and refund, or the clearing cost for rubble | Marks a building, rubble or an area | Same as Placing |
| Overlay (combines with Browse) | Legend strip at the top (the guidance row on phones) | As Browse | ✕ on the strip, O |
| Screenshot | Nothing: the whole interface is hidden | Restores the interface (pinch and drag still move the camera) | Tap, click, Esc, Back |

- The confirm bar never tucks away.
- Only one mode is active at a time, except overlays, which combine with Browse.
- Each open sheet or mode adds a browser-history entry, so the phone's Back gesture closes it instead of leaving the game.

### 6.5 Placing and tools

- **Touch placing:**
  - The ghost appears in the middle of the map left free (on phones, below the rows under the top bar), snapped to the nearest valid tile.
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
  - Undo sits in the confirm bar and in a toast after each action (one toast at a time on phones), and works with Ctrl+Z or Cmd+Z.

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
- Pausing is always available, with no forced timers, and everything (building, walls, tribute, the camera) works while paused. The first fire and the first raid warning pause the game automatically; later ones drop the speed to 1× (section 4.3, with the On a fire setting). Banners never time out.
- Critical alerts use `role="alert"`; everything else uses a polite status region (section 6.3).
- Flames never flash, nothing pulses longer than 5 s, and ambient motion stays under 1 Hz and can be switched off (sections 5.4 and 5.6).
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
      goals.js  trade.js  raids.js  fire.js  mood.js  score.js  feats.js  sounds.js
    sim/                      game rules; no DOM, no canvas
      rng.js  world.js  mapgen.js  reach.js  housing.js  labour.js  immigration.js
      production.js  distribution.js  economy.js  desirability.js  fire.js
      raids.js  combat.js  pathfinding.js  defence.js  trade.js  monuments.js
      progression.js  goals.js  score.js  feats.js  clock.js  commands.js  undo.js
    render/                   drawing only; reads sim state, never changes it
      iso.js  terrainBaker.js  spriteCache.js  renderer.js  walkers.js
      overlays.js  effects.js  fire.js  units.js  ambient.js
      art/  terrain.js  housing.js  services.js  industry.js  defence.js
            monuments.js  figures.js  decor.js
    ui/                       DOM interface and input
      layout.js  hud.js  dock.js  sidePanel.js  rail.js  sheets.js  minimap.js
      input.js  gestures.js  keyboard.js  placement.js  modes.js  alerts.js
      toasts.js  menu.js  settings.js  titleCard.js  welcomeBack.js  goalsList.js
      danger.js  scoreUi.js  share.js
    audio/
      sfx.js
    save/
      store.js  migrate.js  exportImport.js  installFlow.js  records.js
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
  - It is **deterministic**: all randomness (fire ignition, blaze and fire lengths, spread, raid timing, entry and size, price drift, map generation) comes from the seeded generator in `rng.js`, as stateless draws keyed by building id, day or raid index (`hash2`). Every fire, raider, soldier and wall state lives in the world, so saving and loading mid-raid changes nothing. Path and coverage caches live outside the world.
  - It **never reads the clock**. The weekly seed and each city's id come from the interface.
  - The UI changes the world only through **commands** (`place`, `paintArea`, `demolish`, `drawLine`, `rotate`, `undo`, `setTradeOrder`, `setSpeed`…). Each one validates and either applies or returns a **reason code**, which the UI turns into the blocked-placement text. Stage 3 adds:

| Command | Does | Refuses with a reason when |
|---|---|---|
| `payTribute` | Pays the warned raid's tribute and cancels the raid | No warning is up; it is the first raid; raiders have arrived; it would take the treasury below 0 |
| `drawWall` | Draws wall tiles along a line (a gate where it crosses a road), charging per tile | Not yet Market town; water or a building in the way; it would take the treasury below −500 |
| `clearRubble` | Clears rubble tiles (one or an area), charging per tile; the Demolish tool calls it for rubble | No rubble there; it would take the treasury below −500 |
| `holdFestival` | Holds a festival at a working temple | Before Town; no working temple; within 12 months of the last; it would take the treasury below −500 |
| `sealReign` | Records a seal (the day and the score) in the world; the interface then writes the chronicle entry | Never (it can be repeated) |

  - **Undo** never refunds a building that has since burned, and never puts a demolished building back onto tiles now used by something else.
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
  - **Fire:** no risk before Town; risk cut by coverage and staffing; seeded ignition above 100; a covered blaze put out in 1-2 days and an uncovered one growing into a fire; spread only to edge neighbours and never across a road; burned homes becoming empty plots and other buildings rubble; rubble clearing cost; the difficulty multiplier.
  - **Raids:** no raids on Peaceful; the 2-year grace and the 3-month warning; first-raid size 3; size fixed at the warning; the size table and adaptation; tribute price, hidden on the first raid, never below 0, cancels the raid.
  - **Defence:** a closed wall ring keeps raiders out until breached; towers on the ring hit raiders at the breach; gates pass road reach and stop raiders; one staffed tower beats the first raid; soldiers intercept within their radius and return; retreat at half; the report's numbers match what happened.
  - **Score and records:** each part's formula at its edges; the difficulty factor; the score version; splits; medals per difficulty; the share link round-trips and rejects a bad check; records merge on import.
  - **Trade:** caravan caps, and the no-arbitrage data check.
  - **Monuments:** speed scales with crews and supply, prestige per layer.
  - **Determinism:** the same seed gives the same map; the same seed and commands give the same world after N days, including a city that burns and is raided, and one saved and loaded mid-raid.
  - **Saving:** save then load gives an identical world; old versions migrate; a corrupt save falls back to the backup.
  - **Modes** (`ui/`): enter and exit transitions, and one mode at a time.
- **Long-run sanity test:** a scripted city simulated for 10 game-years, checking that there's no negative population or stock, no runaway treasury and no stuck supply chain, and that it runs within a time budget. From Stage 3 its script builds firehouses (and the capital run defences), and it asserts the balance band of section 4.11: at a steady tier-4 town, wages plus upkeep plus soldiers' pay are 60-70% of taxes.
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
3. **Danger, scoring and ambient life:**
   - fire with risk, blazes, seeded ignition and spreading, the firehouse, rubble and clearing, the fire-risk overlay and the sheet's fire row (4.12)
   - raids with the 3-month warning and countdown chip, sizing, targets, tribute and the first-raid goal, and the raid report (4.13)
   - walls, gates, towers, barracks, soldiers and combat; festivals
   - Peaceful mode (4.18); the danger mood terms (4.9); defence and fire costs brought into the 60-70% balance band (4.11)
   - three alert tiers with one ranked banner, rolled-up repeats and the banner-stacking fix on small phones; the speed reactions and the On a fire setting; the raid horn and coin tick (4.3, 5.5, 6.3)
   - flames, units and walls drawn readably, with reduced-motion versions (5.4)
   - the score and its parts, previews, splits, medals, Seal this reign, records, the weekly seed, the share link and card, and screenshot mode (4.19)
   - the early-game additions: Founded Thebes, the next-threshold bar, feats, stamps, citizen remarks, and the danger goals, firsts, achievements, daily goals and tips (4.1, 4.19)
   - ambient life (5.6)
   - world version 4 with its migration
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
