# Thebes: design spec

**Date:** 2026-10-09 (revised the same day after a three-reviewer pass covering game design, interface, and onboarding and accessibility)
**Status:** Approved 9 Oct 2026. Revised 11 Oct 2026 for Stage 2 (sections 4.1, 4.6-4.8, 4.10, 4.11, 4.14, 4.15, 4.18 and 10) from the Pharaoh Heaven review and the city-builder research; the calls made on Joshua's behalf are in that session's rulings list. Revised again 11 Oct 2026 for Stage 3 (sections 2, 3, 4.1, 4.3, 4.5, 4.7, 4.9, 4.11-4.14, 4.17, 4.18, 5.4, 5.5, 6.3, 6.4, 6.8, 7.2, 7.3, 9 and 10, and the new sections 4.19 Scoring and records and 5.6 Ambient life) from the Stage 3 review (`notes/2026-10-11-stage-3-review.md`); the calls made on Joshua's behalf are rulings 69 onward in `notes/handoff-2026-10-11/rulings-so-far.md`. Revised again 12 Oct 2026 for Stage 4 (sections 2, 3, 4.1, 4.4, 4.5, 4.7-4.17, 4.19, 5.1, 5.4-5.6, 6.3-6.6, 6.8, 7.2, 7.3, 7.5, 9 and 10, and the new 4.20 The palace, 5.7 Monuments and the grand city and 6.9 The look of the interface) from the Stage 4 review (`notes/2026-10-12-stage-4-review.md`, rulings 178-224) fitted to the placement UX pass (`notes/2026-10-12-placement-ux-review.md`, rulings P1-P16), with four requests Joshua added the same day (picture cards before the first city, music, the palace, and a more Egyptian interface) and a playtest note on problem markers (section 6.3); the calls made on Joshua's behalf are rulings 225 onward (part 9 of the rulings list).
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
| Score | Five named parts, each out of 100 (score v2 from Stage 4: People, Prosperity, Culture, Safety and Monuments), measured from the city's state, times a difficulty factor. Personal bests per seed and difficulty live on the device. No leaderboard (section 4.19). |
| Core systems | Housing upgrades, production chains, trade, desirability, monuments. River flooding is deferred. |
| Monuments | Seven monuments that rise course by course on screen, from a minute-and-a-half obelisk to a great pyramid of about 90 minutes (at 1×), built by builders' guild crews from stone and bricks, paid for as the work happens, never into debt, and safe from fire and raiders (section 4.16). |
| Motion | One **Motion** setting, Full, Gentle or Still. A device that asks for less motion gets **Gentle**, where walkers, crews and processions still move and the city fades and glints in place (section 5.4). |
| Service coverage | **Reach along roads** decides coverage; **walkers are drawn for looks only**. |
| Housing | Nine tiers. Tiers 6–9 are 2×2 with **capacities 100 / 125 / 150 / 180**, so an upgrade never shrinks the city. |
| Art | An **original, code-drawn style inspired by Pharaoh: A New Era** (cool shadows, smooth whitewash, stacked houses, rugs, mosaics, painted monuments), with **blended, continuous terrain**. No Pharaoh assets. |
| Layouts | **Portrait phone**: build dock at the bottom. **Wide screens**: a Pharaoh-style side panel. **Short landscape screens**: a compact rail. |
| Input | Touch, mouse and keyboard are first-class. Controls follow the input in use, not the screen size. |
| Onboarding | **Six picture cards** before the first city (each a real game screenshot with one ring or arrow and two plain sentences: roads first, fertile land and the Ground layer, homes, a well and food, workers, goals and Show me, and a glimpse of what lies ahead), then a goals list with "Show me" in place of a playthrough tutorial. Houses explain why they won't upgrade. |
| Sound | About ten synthesised sound effects, **off by default**, and from Stage 4 a quiet **Egyptian-flavoured music** loop generated in the browser (no audio files), **on by default at a low volume**, with its own on/off and volume (section 5.5). |
| Palace | One **palace** per city (Town), a 3×3 civic building the player enlarges through five styles as the city grows, for rising prices: a modest gold sink and a growing source of desirability, never prestige (section 4.20). |
| Interface look | Papyrus-toned and lightly Egyptian (a banded frieze edge, cartouche headings, gold-on-lapis primary buttons, a serif display face from the system's fonts), with every rule of section 6.1 still binding (section 6.9). |
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
- Recorded music or music files (Stage 4's music is generated in the browser, section 5.5).
- Multiplayer, cloud saves, and one city playable across devices (export and import covers moving a city).
- Direct control of soldiers.
- Progress while the game is closed.
- Global leaderboards and checked scores. A shared score is "friends' honour" (section 4.19).
- Streaks, daily locks, or anything that punishes leaving or not coming back.
- Screen-reader access to the map itself. The interface around it is accessible (section 6.8).

## 4. Gameplay

### 4.1 Opening and goals

- **Title card:**
  - Buttons: **Continue** (when a save exists), **New city** with the four difficulty choices (section 4.18), **This week's Nile** (the weekly seed, section 4.19), **How to play** (the picture cards, below), **Play with sound** / **Play muted**, and **Install** (where the platform allows).
  - Under Continue: up to three record lines, the device's three highest bests ("Best: 412, gold, seed 11"), and a row of stamps, one per sealed reign (section 4.19).
  - Opening a shared score link shows the friend's score beside your own best on that seed, with "Beat 301?" (section 4.19).
  - A paused, slowly drifting view of a sample city sits behind the buttons. From Stage 4 it has a finished small obelisk and a colossus under way, so the payoff is on screen before the first tap. It drifts only under Full motion; under Gentle and Still it holds still (section 5.4).
- **The picture cards (Stage 4).** A short tutorial to read before playing, because the two rules new players miss are the road and fertile land.
  - **When:** once, the first time a player taps New city (or This week's Nile) on this device, before the city appears; and any time from **How to play** on the title card and at the top of the ☰ menu's How to play sheet ("Show the picture cards"). Seen or skipped, it never shows by itself again.
  - **Six cards**, each one real game screenshot with one **ring or arrow** drawn on it, a short title and one or two plain sentences:

  | Card | Picture (the mark) | Title | Words |
  |---|---|---|---|
  | 1 | A road with homes, a well and a farm along it (a ring on the road) | Everything needs a road | Homes and workplaces work only when they touch a road. Lay a road first, then build beside it. |
  | 2 | Housing plots on a road and a well beside them (a ring on the well) | Homes grow when served | Paint housing plots beside a road and people move in. A well near them, then food, lets them grow. |
  | 3 | The Ground layer on, fertile land green by the river, a farm on it (an arrow to the Layers button) | Farms need fertile land | Farms grow only on the fertile land by the river. Layers → Ground shows it in green. |
  | 4 | A granary and a bazaar by the homes, and a building sheet's workers row (a ring on the row) | Food and workers | A farm fills a granary; a bazaar near homes sells its food. About four in ten people work, and a building short of workers works slowly. |
  | 5 | The goals strip with Show me (a ring on Show me) | Follow the goals | The goal line shows what to do next. Show me opens the right card and puts it where it fits. |
  | 6 | A pyramid under way, a tower and a firehouse beyond (a ring on the pyramid) | What lies ahead | Later come fires and raiders to guard against, and monuments to raise. Pause any time: nothing happens while you plan. |

  - **Moving:** **Next** and **Back** buttons, a swipe left or right, the arrow keys, and a row of **dots** (the current one filled; each dot a button). **Skip** on every card; Back, Esc or ✕ closes it; the last card's Next reads **Start building**. Cards change with a short slide under Full motion and at once under Gentle and Still (section 5.4).
  - **On screen:** a full-screen sheet on phones and a centred card of at most 560 px on wide screens; the game behind it is paused. The picture keeps its shape and the words sit under it at the text size chosen; nothing scrolls at 100% text on a 375×667 phone, and at 150% only the words scroll.
  - **The pictures** are made by a tool from the dev scenes (`tools/tutorial.ps1`, through the screenshot tool), saved small under `assets/tutorial/` (WebP, 600×600 px, at most 60 KB each) with a `cards.json` that gives each mark's place in picture coordinates, read from the scene itself (a tile, a button's box). The ring or arrow is drawn by the interface over the picture, so it stays sharp and stays aligned when the pictures are made again. They are cached for offline play with every other file, and made again whenever the art or the interface's look changes (a step in every visual review's checklist; a test checks that every card's picture and mark exist and are in the offline list).
  - **Accessible:** each picture has alt text saying what it shows; the ring is a thick outline with a white halo, never colour alone; the cards are a modal dialog with focus kept inside and returned to the button that opened it. The words live in `text.js` and the cards in `data/tutorial.js`.
- **A new city starts:**
  - **paused**, with **2,000 gold**;
  - with the camera on fertile land;
  - with a **short road already running in from the trade edge** of the map.
- First arrivals walk in about 10 real seconds after the first housing plot is placed (at 1×).
- **Goals list:** shows up to **three goals at a time**.
  - Each goal has a **Show me** button. It opens the right build card and pulses the target area on the map.
  - Finishing a goal pays a small gold reward and reveals the next one.
  - The opening chain. Founded Thebes plus the nine goals up to Town (these six, then the Cottage, House and Town goals in `data/goals.js`) make ten, so the strip opens at "1 of 10". From Stage 4 the first four say the road rule and the fertile-land rule in their own words, and each carries a one-sentence **why**, shown when the goal is opened in place and in the Goals sheet:
    0. **Founded Thebes**, already ticked when the city starts (an endowed start; it pays no reward)
    1. "Lay a road: buildings need one" (why: "Homes and workplaces work only when they touch a road.")
    2. "Place 6 housing plots by the road" (why: "Plots off the road stay empty until a road reaches them.")
    3. "Build a well by the homes' road" (why: "A well gives water along the road for 5 tiles, so huts become shacks.")
    4. "Farm on fertile land, granary, bazaar" (why: "Farms need the fertile land by the river: Layers → Ground shows it. Each needs a road.")
    5. Build a temple
    6. Reach 100 people
  - After the opening chain, goals come from the next milestone (for example "Reach 150 people to become a Town", "Build a booth so homes can grow into Manors").
  - From Town, goals introduce each new need when the tier below it is common ("Your homes now want pottery: build a clay pit and a potter"), then ask for a number of homes at the new tier, so one new demand arrives at a time.
  - Danger goals (chapter "Danger"): "Build a firehouse" right after the Town goal, and "Build a tower and a barracks" right after the trading-post goal (skipped on Peaceful).
  - The goal list is data (`data/goals.js`). Missions will reuse it later.
- **The goals strip on phones is one row** (portrait and compact): the count or label ("2 of 10"), the goal's words (two lines at most), a progress chip and **Show me**. The label and the words are one button that **opens the goal in place** (section 6.3, "Open in place"), so there is no separate Goals button: the open goal shows its full words, its reward, Show me, **All goals ›** (which opens the **Goals sheet**) and, while the guide runs, **Skip guide** (one tap with no confirm; the Goals sheet has it too). The Goals sheet also holds the reward and a **Recent** list of the last 10 captions (section 6.3). Wide screens keep their strip.
- **Next threshold bar:** a slim bar under the goals strip shows the next milestone ("Town: 83 of 150 people"). From Capital it shows the next medal instead ("Silver: 38 points to go"). A caption celebrates each step (section 6.3). On phones the bar shows only in **calm portrait play**: no banner, tip, caption, sheet or tool, never while the guide runs, and never on a landscape phone. The Goals sheet and the city summary always show it, and wide screens always show it under the strip.
- First-time events add one-off goals instead of a separate tutorial: the first fire ("Build a firehouse near the fire"), the first raid warning ("Build a tower facing the east"), the first labour shortage, the first empty bazaar.

### 4.2 Core loop

1. Lay roads and housing plots. People move into plots that touch a road.
2. Houses upgrade one tier at a time as their needs are met. Unmet needs make them downgrade.
3. Bigger houses hold more people and pay more tax.
4. Population milestones unlock buildings. Money pays for production, services, defence and monuments.

### 4.3 Time

- The simulation advances one **game-day** per tick. There are 30 days to a month and 12 months to a year.
- Speeds are pause, 1×, 2× and 3×. At 1×, a day is a second, a month is 30 seconds and a year is 6 minutes.
- Economy steps (taxes, wages, soldiers' pay, consumption, upkeep, immigration, mood, the score) run monthly. Production, movement, fire, raiders and combat run daily.
- The game **pauses when the page is hidden** (another app or tab, or the phone is locked) and **always reopens paused** (section 4.17). Nothing happens while the player is away.

**How long danger lasts** (all numbers in `data/fire.js` and `data/raids.js`):

| Event | Game time | At 1× |
|---|---|---|
| A blaze before it grows into a fire | 3 days | 3 s |
| A covered blaze being put out | 1 or 2 days (seeded) | 1 or 2 s |
| A fire burning | 10-15 days (seeded) | 10-15 s |
| Raid warning to arrival | 3 months (90 days) | 90 s |
| First raid warning | 2 game-years after the city first has 250 people | 12 min |
| Later raid warnings | 2-4 game-years after the last raid (seeded) | 12-24 min |
| A festival's mood bonus, then the wait before the next | 3 months, 12 months | 1 min 30 s, 6 min |

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
- Generation guarantees enough fertile land near the start, at least one rocky patch within reach, and a connected buildable area. Rocky patches lie east of the river (every seed has 90-150 rocky tiles), so the quarries and gem mines sit there, and the desert between the homes and the quarries makes a natural monument district.
- **Fertile and rocky ground are shown by the Ground overlay** (section 6.3), never by the terrain art alone: the terrain is drawn feathered (section 5.2), but a farm, an orchard, a mine or a quarry needs every tile of its footprint to be of its kind, and a monument needs none of its tiles to be fertile, so the overlay draws free fertile land and free rocky ground with crisp tile edges. Picking a farm, an orchard, a gem mine, a quarry or a monument turns it on. The meadow's bright green tufts are decoration and never count.
- **Terrain buildings land on their ground.** Picking a farm, an orchard, a mine or a quarry puts its ghost on the nearest free ground of its kind (the nearest spot where the ground is right, even if its road or storage is still to come; section 6.5), up to three times the usual search distance away. The farm, beer, linen and "Make more jobs" goals' Show me aims at the nearest free fertile land, and the gem mine's and the quarry's at rocky ground, while that building is the next one the goal needs. Their cards say "Fertile land" or "Rocky ground", and their tooltips "on fertile land" or "on rocky ground". Monuments are not terrain buildings: they land on the nearest spot with room (section 6.5) and their cards say "Desert" (the tooltip "on the desert, not the fields").

### 4.5 Roads and reach

- Roads are placed with a mouse by **clicking a start and an end** (the game picks an L-shaped path, which the player can flip) or by dragging. Both show a preview and the total cost before ✓.
- **On touch and pen, a road is drawn with a finger** (section 6.5): a one-finger drag follows the finger tile by tile (a gap the finger skips is filled with a four-way step), a tap adds one tile or takes it off, and strokes add up into one plan with one ✓ and one Undo step. Walls, housing plots and demolition work the same way. A plan lays every tile it can and skips the blocked ones, which are drawn coral with ✕ and counted in the bar ("5 tiles · 4 skipped: something is in the way"). Two fingers always pan and zoom.
- Buildings work only if they touch a road. **The player may place a building that lacks only its road** (section 6.5), in amber: it is built and paid for, but it does nothing (no work, no service, no desirability), pays no upkeep or wages (section 4.11) and does not count for a "Build a …" goal, a first, an achievement or a daily goal until a road touches it. The ground (fertile, rocky, free) and the gold are never "later": they refuse. The sample cities and the balance runs place through the sim's strict default, which still refuses a building with no road.
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
| Builders' guild → monument site (its crew) | 12 |
| Quarry or brickworks → monument site | 12 (producer reach) |
| Monument site ← storage (supply) | 16 |

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
  - The merged house takes the combined residents. Residents of tiers 6-9 keep working (no "scribes"; see 4.8).
- **Splitting back.** A 2×2 house that drops below tier 6 splits into four tier-5 plots, with residents shared out evenly.
- **Needs arrive one at a time.** Each new good is introduced by a goal when the tier below it is common ("Your homes now want pottery: build a clay pit and a potter"), so a player meets one new demand at a time.
- **Looks.** Each tier has its own silhouette, height and tone so tiers can be told apart at phone zoom (section 5.3). Tiers 5-9 each add one roof tell: a striped awning (5), a pergola (6), a roof garden (7), a painted parapet band (8), a flag and pool (9).

### 4.7 Desirability

- Every tile has a desirability score: the sum of the values of every building near it. Each building type has values by distance (1 = touching, up to 6 tiles), counted from the nearest tile of its footprint. Values add where they overlap. A 2×2 house uses its best tile. A building that needs a road gives nothing, good or bad, until a road touches it (section 4.11); homes, gardens and statues need none.
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
| Plaza (each tile) | 2, 1 |
| Palace, by style | Courtyard house 4, 3, 2, 1; columned hall 6, 5, 4, 3, 2; pylons 8, 7, 6, 5, 4, 3; gilded 10, 9, 8, 6, 4, 2; lapis and gold 14, 12, 10, 8, 6, 4 |
| Sphinx | 10, 8, 6, 4, 2 |
| Quarry | −6, −5, −4, −3, −2, −1 (as the clay pit) |
| Brickworks, builders' guild | −4, −3, −2, −1 (as a workshop) |
| Any monument site under way (dust and noise) | −3, −2, −1 |
| Small obelisk | 6, 5, 4, 3, 2, 1 |
| Large obelisk | 10, 8, 6, 4, 2, 1 |
| Colossus | 12, 10, 8, 6, 4, 2 |
| Small mastaba | 10, 8, 6, 4, 2, 1 |
| Large mastaba | 14, 12, 10, 8, 6, 4 |
| Small pyramid | 16, 14, 12, 10, 8, 6 |
| Great pyramid | 24, 20, 16, 12, 10, 8 |

- **Gardens** (1×1, Village) and **statues** (1×1, Town) are cheap and need no workers. Stage 4 adds the **plaza** (a paved mosaic tile, City) and the **sphinx** (a lying lion statue, Great city) for grand approaches (section 4.14); neither needs workers or a road.
- **Monuments.** A site under way is a little unpleasant to live beside, once a road touches it (a road-less site gives nothing, as any building with no road). A **finished** monument gives its own values and needs no road for them, as gardens and statues need none: removing its road later takes nothing away. A second monument of a kind gives its desirability in full (only its prestige does not count, section 4.16). A grand monument beside the Estates is a real layout goal.
- Tiers 6-9 need minimum desirability (section 4.6), with a lower value to keep the tier.
- The house sheet shows the score and its three biggest causes, for example "14 of 20: +6 temple, +3 garden, −4 potter".
- **While placing** any building, the ground it would change is tinted (a teal wash where homes get nicer, coral hatching where they get worse) when a home or plot lies on that ground, and not at all when none does, and the confirm bar says "Makes 6 homes nicer" or "Makes 4 homes less pleasant". A monument's preview shows both states, by tint (the finished values) and in words: "finished: 9 homes nicer · while building: 4 homes less pleasant".
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
- **Every tier works.** Residents of tiers 6-9 keep working. There are no "scribes" (a top-tier rule that trades workers for tax): the late city has workers to spare (the capital run had 38% of its workers jobless before Stage 4), and scribes would feed the gold hoard that monuments are there to drain. Revisit if playtests show cities short of workers once monuments run.
- **Monuments come last.** Builders' guilds, quarries and brickworks work at the **monuments** priority, the lowest of the five, so a labour shortage names it ("Monuments short of 24 workers") and never starves food or services.
- **Idle means no jobs.** A guild with no site to work, and a quarry or brickworks that no site needs (section 4.16), employs nobody and pays no wages; its upkeep still runs. Pausing a site frees its workers at once. A four-crew project needs about 110 workers (64 crew, 30 at the quarries, 14 for bricks and clay), which soaks up most of a Capital's jobless.

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
| Monuments | +1 for every 70 prestige, at most +10 | Always, measured from the monuments standing (section 4.16); its row reads "Monuments +4" |
| Palace | +1 for each style above the courtyard house, at most +4 | While a palace stands with a road beside it (section 4.20); its row reads "Palace +2" |

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
| Stone | Quarry (rocky) → monument site, or → storehouse → site | Monuments | City |
| Bricks | Clay pit → storehouse → brickworks → monument site, or → storehouse → site | Monuments | City |

- **Stone and bricks are materials** (a fourth kind of good beside food, household goods and raw goods): only monument sites use them. Homes never want them and bazaars never sell them. How they move, and when their makers stand idle, is in section 4.16.
- **Producers** make output daily, scaled by staffing (below 25% staffing they stop). A raw producer makes its monthly yield at full staff; a **workshop** turns one unit of its raw material into one unit of its good, taking the raw material from storage within producer reach, and stops with "No clay in reach" when there is none. Output goes to the nearest storage with space within producer reach; if there is none, production stops and an alert says "No storage nearby".
- **Monthly yields at full staff** (in `data/buildings.js`, tunable; a 30-day month): grain 30, figs 24, clay 40, pottery 30, barley 30, beer 25, flax 24, linen 20, gems 15, jewellery 15, stone 30, bricks 30 (one clay makes one brick). A potter feeds about 13 Townhouses; three quarries, or two quarries and a brickworks, keep four monument crews busy.
- **Household use per resident per month:** food 0.25 (any mix of grain and figs), pottery 0.05, beer 0.05, linen 0.04, jewellery 0.03, rounded up per home.
- **Storage:** the granary holds grain and figs (600 units); the **storehouse** (2×2, Town) holds everything else (800 units in total), stone and bricks included, with **accept or refuse** per good. Both show their fill on the map in four steps. There are no "get" orders. A storehouse between the quarries and a monument bridges up to 28 road tiles (12 in from the quarry, 16 out to the site); stone can crowd a storehouse that a pottery chain also uses, so a tip says to refuse stone there.
- **Bazaars** sell every good homes use, restocking monthly from storage within supply reach (up to 300 grain, 200 figs and 100 of each household good). Each month, a home tops up its household stock from the covering bazaar it can reach most quickly that has stock.
- **Fed** means the home's full monthly food need was met from stock, from any mix of foods. "Two kinds of food" also needs both grain and figs in stock at the start of the month. A home that wants two foods tops up half of its need from each and fills any gap from whichever food is there; a home that wants one food takes first from the food its bazaars hold most of (ties go to grain), so a surplus of one food never fills the granaries.
- **The city summary** shows each good as made against used last month, and every good's sheet line says what makes it and what uses it ("Pottery: made by potters from clay; used by Townhouses and up; sold to Memphis").

### 4.11 Money

- **Income:** taxes (section 4.6), trade sales, goal rewards.
- **Spending:** building costs, monthly upkeep, wages per employed worker, soldiers' pay, trade purchases, rubble clearing, festivals, tribute, and monuments (founding, work, gilding and the capstone). Raiders also steal gold (section 4.13).

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

| Stage 4 spending | Amount (× the difficulty's cost multiplier) |
|---|---|
| Builders' guild, quarry, brickworks | 150, 100 and 90 gold to build; upkeep 10, 6 and 6 gold a month, plus 16, 10 and 8 workers' wages while they work (none while idle) |
| A monument's founding, when it is placed | Small obelisk 150, large obelisk 400, colossus 600, small mastaba 1,000, large mastaba 2,000, small pyramid 3,000, great pyramid 6,000 |
| Monument work | 130 gold a crew for each month of work (163 on Hard): 6.5 gold for each unit of stone or bricks laid, paid daily as the work is done (ruling 295; first written as 5 a unit, 100 a crew-month) |
| The large obelisk's gilding | 1,000 gold, when its last course begins |
| The great pyramid's capstone | 5,000 gold, when its last course begins |
| One of each monument, all told | about 217,000 gold (30,420 units of work at 6.5, 13,150 of founding, 6,000 of gilding and capstone) |
| Plaza, sphinx | 8 gold a tile, 150 gold; no upkeep |
| Palace | 300 gold to build, then 600, 1,500, 4,000 and 10,000 to enlarge it to each later style (16,100 all told); no upkeep or workers; enlarging never takes the treasury below 0 (section 4.20) |

- **Monuments never borrow.** Founding a monument, a crew's day of work, the gilding and the capstone never take the treasury below 0 (as tribute never does), although other buildings may go down to the −500 floor. A crew whose day would cross 0 does not work that day; a last course waits until its gilding or capstone can be paid. The site sheet says so in those words (section 6.3).
- **The bill is visible.** The city summary has a **Monuments** row under spending (last month's work, gilding and capstone gold; founding counts with building costs), and each site sheet says what it cost last month.
- **Balance target:** in a steady tier-4 town, wages plus upkeep plus soldiers' pay come to about 60–70% of tax income. Building costs and wages in `data/` are tuned to this, and the long-run test (the 10-year village) asserts the band; monuments unlock at City, so they never touch it, and **that band is unchanged**. From Stage 3 the firehouses and defences a town needs are part of that spending.
- **The late game's sink** is the monuments. Before Stage 4 a Capital spent 39% of its taxes and held about 126,000 gold by year 6. With four crews at work (four guilds, three quarries, two brickworks and their clay pits) wages, upkeep, soldiers' pay and monument work come to about 68% (the capital run measures 67.5% over its last 24 months, and holds 59,319 gold at year 6):

| Monthly spending at Capital (the capital run) | Before Stage 4 | With four crews |
|---|---|---|
| Wages | 1,080 | about 1,510 (about 108 more workers) |
| Upkeep | 265 | about 335 |
| Soldiers' pay | 64 | 64 |
| Monument work | 0 | about 520 |
| Share of taxes (3,610) | 39% | about 68% |

  The capital run asserts 60-70% while four crews work (section 9); the work gold (130 a crew a month, 6.5 a unit) is the lever that tunes it.
- **Pausing a building** stops its wages and upkeep. A paused barracks still pays its soldiers.
- **A building that needs a road and has none beside it** (one the player placed before its road, or whose road was demolished) pays no upkeep and no wages, since it has no workers and does nothing: it serves no home, gives no desirability (section 4.7) and counts for nothing. A "Build a …" goal, a first, an achievement and a daily goal count only buildings that touch a road, or that need none (gardens, statues). It still stands: it can catch fire as any building of its type can, and its price counts in the city's wealth for a raid's size (section 4.13). The gold for a building is spent when it is placed, not when its road arrives; Undo refunds it until the month ends (section 6.5).
- **Demolishing** refunds 25% of a building's cost (a monument's: a quarter of its founding; its work gold is gone). Roads and plots refund nothing. Clearing rubble costs gold instead (section 4.12). Undo (section 6.5) refunds in full.
- **Difficulty** multiplies building, road, wall, route, rubble-clearing and festival costs (section 4.18), and so tribute, which is priced from towers, and a monument's founding, work gold, gilding and capstone. Upkeep, wages and soldiers' pay do not change.
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
| Farms and orchards, clay pit, gem mine, quarry | 0.15 | 667 |
| Brickworks (a kiln) | 1.0 | 100 |
| Builders' guild (timber and rope) | 0.3 | 333 |
| Temple, firehouse | 0.1 | 1,000 |
| Never burn: roads, empty housing plots, gardens, statues, plazas, sphinxes, the palace, wells and water, walls, gates, towers, rubble, and monuments, their sites and their stockpiles | 0 | never |

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
   - Roads, gardens, statues, plazas, sphinxes, wells, walls and monuments never burn, so a road or a monument is a firebreak.
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
| Wealth | the treasury (if above 0) plus the base cost of every standing building except roads, walls, the palace, monuments and monument sites (so gold spent on a monument instead of hoarded makes raids a little smaller) |
| Wealth term | (wealth − 5,000) ÷ 5,000, at least 0 and at most 4 (10,000 → 1; 25,000 or more → 4) |
| Raw size | 1 + people term + wealth term |
| Raiders | round(raw size × the difficulty's risk multiplier × adaptation), at least 2 and at most **18** (Stage 4.5, ruling 317: it was 12; the size also grows 10% a year up to 1.5x, and a two-sided raid totals one more, split between its two bands) |
| First raid | always **3** raiders, at every difficulty (one staffed tower beats it) |
| Adaptation | starts at 1. A **lost** raid sets it to 0.6; every later raid (beaten, lost or paid off) then adds 0.2, up to 1. So after a lost raid the next one is ×0.6 and the one after ×0.8 |
| Towers needed | ceil(raiders ÷ 3): the staffed towers that would beat this raid |

Examples on Normal: 250 people and 6,000 wealth → 1 + 2 + 0.2 = 3.2 → 3 raiders. 600 people and 15,000 → 1 + 4.8 + 2 = 7.8 → 8. 1,000 people and a large treasury → 13 (the cap is 18; on Relaxed, 6.5 → 7).

**What raiders want.** Raiders head for wealth, in this order: **trading post, storehouse, bazaar, temple**, then any other building that isn't a home, the palace, a monument or a monument site. Raiders are after what they can carry, so they **never target a monument, a site or the palace**; one blocks their path like any building. A raid can still slow a monument: it can set a guild, quarry or brickworks alight, and its crew or deliveries stop until the fire is out. The warning names the kind at the top of the list that the city has ("Raiders from the east are after your storehouses"). When they arrive they go for the nearest building of that kind, or the next kind down if none stands.

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
- While it lasts, a **procession** walks the roads within the temple's reach, and it grows with the city (section 5.7).
- It is refused, with the reason, if it would take the treasury below −500.

**Tallies:** raids, raids beaten, raids lost, tributes paid, raiders stopped (by towers and by soldiers), soldiers wounded, gold stolen, festivals.

### 4.14 Progression

| Milestone | Population | Unlocks |
|---|---|---|
| Village | 0 | Roads, housing, well, grain farm, granary, bazaar, temple, garden, firehouse |
| Town | 150 | Figs, clay pit, potter, storehouse, booth, statue, the palace, festivals at the temple. Fire risk begins. |
| Market town | 250 | Trading post (first partner), walls, gate, tower, barracks. The raid clock starts (not on Peaceful). |
| City | 400 | Barley and brewery, builders' guild, quarry, brickworks, small and large obelisks, plaza |
| Great city | 650 | Flax and weaver, colossus, small mastaba, sphinx, second trade partner |
| Capital | 1,000 | Gem mine and jeweller, large mastaba |
| Capital and 100 prestige | — | Small pyramid |
| Capital and 300 prestige | — | Great pyramid |

- Locked buildings show in the build tray only for the **next** milestone, greyed out with their unlock condition; later ones stay hidden until then, so the tray never fills with grey. Rubble is never a card.
- **The prestige unlocks** (section 4.16) are steps of their own. The small pyramid's card shows, greyed, from Great city (its milestone is next), and the great pyramid's once the small pyramid has unlocked. A locked card shows the condition and the count: "Needs 100 prestige (you have 60)", or "Needs Capital and 100 prestige". Once reached, a prestige unlock stays, as a milestone does: the world records the day the city first had each (the small pyramid's day is also the "pyramids unlocked" split, section 4.19), so demolishing a monument later never locks a card again, and a site already founded always carries on.
- **The Monuments tab** (key 7, the gold ▲ tint) holds everything a monument needs, in this order: builders' guild, quarry, brickworks, then the seven monuments from the small obelisk to the great pyramid. Before City it shows only once City is the next milestone, with its City cards greyed. The plaza and the sphinx sit in **Homes**, beside the garden and the statue; the palace sits last in **Services**.
- A city saved before Stage 3 gets "New" badges for the firehouse, and for the defences if it is already a Market town. A city saved before Stage 4 gets "New" badges for the Stage 4 cards its milestone already unlocks.
- Reaching a milestone shows a caption ("Your village is now a Town"; 5 s, section 6.3), and newly unlocked build cards get "New" badges.
- The thresholds are starting values for tuning.

### 4.15 Trade

- The **trading post** (2×2, Market town) is built on a road connected to the trade entry.
- **Partners** (in `data/trade.js`): **Memphis** opens at Market town for 300 gold; **Byblos** opens at Great city for 600 gold. Each partner buys and sells a fixed list of goods with a **yearly quota** per good; its caravan comes every three game-months and carries a quarter of each quota.

| Partner | Buys (price paid, yearly quota) | Sells (price asked, yearly quota) |
|---|---|---|
| Memphis | Grain 1 (300), pottery 8 (200), beer 10 (160) | Clay 2 (300), figs 3 (200), barley 3 (200), stone 6 (200, from City) |
| Byblos | Pottery 8 (120), linen 14 (120), jewellery 20 (80) | Flax 3 (160), gems 9 (100), beer 14 (100) |

- For each good the player sets **buy, sell or ignore** and a **level to keep**: a caravan sells the player its goods only up to that level, and buys the player's goods only above it. Purchases never take the treasury below zero. Goods move to and from storage within the trading post's supply reach (16 road tiles).
- **No arbitrage:** a data check ensures no partner sells a good for less than another pays for it, with a margin of at least 25% so that drift can never cross it. Prices **drift by up to ±10% a year** (seeded). Memphis sells stone so a map whose rocky land is awkward can still build monuments; no partner buys stone or bricks, so the check is untouched.
- The first caravan from a new route brings a gift: 40 units of the first good on its sale list.
- The trading post's sheet is one step at a time: open the route, then a row per good with its price, the buy/sell/ignore choice and the level to keep, and the next caravan's date.

### 4.16 Monuments

Monuments are the late game: long projects the player founds, supplies and watches rise course by course, paid for as the work happens. They give the city its skyline (section 5.7), its last score part (section 4.19) and its gold sink (section 4.11).

- **The loop.** Place a footprint (rotating a mastaba), build builders' guilds for crews and quarries and brickworks for material, and the monument rises one course at a time. Gold is spent as the work is done. Work can be paused at will.
- **Speed** scales with the crews at work (each guild gives one crew) and with how steadily stone and bricks arrive.
- **Nothing advances while the game is closed** (section 3). Welcome back shows each site's course and its pace instead.
- **Every stall says why.** A site that is not progressing always names its cause and its fix, on the map, in the alert list and on its sheet (section 6.3). A monument never sits at 99% with no word.
- **Safe from danger.** Monuments, their sites and stockpiles never burn (section 4.12), and raiders never target them (section 4.13).
- Every number here lives in `data/monuments.js` and is a first value; Joshua's playtest sets the final ones.

**The seven.** Times are game time with the kind's most crews and full supply. Fewer crews take longer in proportion: two crews on the great pyramid take 30 years.

| Monument | Footprint | Courses | Most crews | Work (crew-months) | Time | At 1× | At 3× | One course at 1× | Unlocks |
|---|---|---|---|---|---|---|---|---|---|
| Small obelisk | 1×1 | 3 | 1 | 3 | 3 months | 1 min 30 s | 30 s | 30 s | City |
| Large obelisk (gilded tip) | 1×1 | 4 | 2 | 18 | 9 months | 4 min 30 s | 1 min 30 s | about 1 min 8 s | City |
| Colossus (seated statue) | 2×2 | 6 | 2 | 48 | 2 years | 12 min | 4 min | 2 min | Great city |
| Small mastaba | 3×2, rotates | 4 | 3 | 108 | 3 years | 18 min | 6 min | 4 min 30 s | Great city |
| Large mastaba | 4×3, rotates | 5 | 4 | 240 | 5 years | 30 min | 10 min | 6 min | Capital |
| Small pyramid | 4×4 | 8 | 4 | 384 | 8 years | 48 min | 16 min | 6 min | Capital and 100 prestige |
| Great pyramid (gold capstone) | 7×7 | 12 | 4 | 720 | 15 years | 90 min | 30 min | 7 min 30 s | Capital and 300 prestige |

The target feel: a small monument is a reward inside one phone session, a mastaba spans one or two, and the great pyramid is an evening or two of play (three or four sessions at 3×). It stays an achievement because it needs Capital, 300 prestige, four guilds and three or four quarries first. A 15-year build sees four to seven raids and many fires: the city carries on around the project.

**Placing.**
- **Ground:** any dry ground that is not fertile land (desert, rocky ground, meadow and scrub all do). A tile of fields refuses with "Monuments stand on the desert, not the fields". The Ground overlay shows where the whole footprint has room (section 6.3).
- **Road:** a site needs a road for its crews and its stone, but, as for every building (section 4.5), the road can come later: a site placed with no road is amber, founded and paid for, and does nothing (no crew, no deliveries, no work gold, no dust and noise) until a road touches it. A "Found a …" goal counts it only once a road touches it.
- **Rotation:** the two mastabas (3×2 and 4×3) turn a quarter with ⟳ or R while placing; the sim stores the rotation and swaps the footprint. A founded monument does not turn.
- **Founding** is paid when the site is placed and never takes the treasury below 0 (section 4.11); a pyramid's card stays locked until its prestige unlock (section 4.14).
- How a big footprint is placed on a phone (the camera fitting it at the pick, the nearest spot with room, seeing behind other monuments) is in section 6.5.

**Crews.**
- **One guild, one crew.** A working builders' guild sends its crew to the nearest unpaused, unfinished site within **12 road tiles** that touches a road and has crew room. A site takes at most its kind's crews (1, 2, 2, 3, 4, 4 and 4, small obelisk to great pyramid). There is no picking which guild works where: to move crews, pause a site, and its guilds go to the next site in reach.
- **A crew's speed** is its guild's staffing, as any producer's: a full crew lays **20 units a month** (two-thirds of a unit a day); below 25% staff it stops.
- Guilds come last for workers and employ nobody while they have no site (section 4.8).

**Materials and supply.**
- Each course has a **recipe** of stone and bricks; a crew lays the course's materials in the course's proportion, so a course that needs both waits when either is missing (and the stall names it):

| Monument | Material at full work |
|---|---|
| Small obelisk, large obelisk, colossus | Stone: 60, 360 and 960 |
| Small mastaba | Bricks for the core courses, stone for the top (facing) course: about 1,600 bricks and 550 stone |
| Large mastaba | About 3,600 bricks and 1,200 stone |
| Small pyramid | Stone for the courses, bricks for the ramp (about 15% of each course): about 6,500 stone and 1,150 bricks |
| Great pyramid | About 12,200 stone and 2,200 bricks |

- **A site keeps its own stockpile**: at most 40 units for each of its kind's most crews (two months of their work), of the materials its unfinished courses still need, and never more of one than they still need. Material can arrive before the crews do.
- **Delivery.** A quarry or brickworks sends each unit to the **nearest site within its producer reach (12 road tiles) that needs that material and has stockpile room**; if none does, to the nearest storehouse in reach that accepts it (section 4.10). A site also draws from storehouses within its **supply reach (16 road tiles)**, as a bazaar does. Memphis's stone arrives through the trading post's storehouses (section 4.15).
- **Idling.** A quarry or brickworks works only while it is **needed**: some unpaused, unfinished site on a road still needs its material and has stockpile room, and lies within its producer reach, or within 16 road tiles of a storehouse in its producer reach that accepts that material and has room. Otherwise it idles: no production, no workers, no wages (upkeep still runs), and its sheet says "Idle: no monument site needs stone within reach". So stone is never stockpiled with no site under way, and never crowds a storehouse the household chains use for nothing. The brickworks takes its clay from storage in producer reach, as the potter does.

**Work, courses and gold.**
- Each day each working crew lays its share of the course under way from the site's stockpile. Blocks appear on the course as it fills (section 5.7). When a course's recipe is laid, the course is done (`course_done`: a caption, section 6.3), and the next begins.
- **Work gold** is paid daily as work is done: 6.5 gold for each unit laid (130 gold a full crew-month, 163 on Hard), times the difficulty's cost, in whole gold with the fraction carried on the site, so a month adds up exactly. Crews pay in the order their sites were founded; a crew whose day would take the treasury below 0 does not work that day.
- **The large obelisk's gilding** (1,000 gold) and **the great pyramid's capstone** (5,000 gold) are paid on the day the last course begins; that course waits ("Waiting for 1,000 gold for the gilding") until paying keeps the treasury at 0 or above.
- When the last course is laid the monument is **finished** (`monument_done`): the ramp and stakes go, a pyramid gets its white casing and gold capstone, the large obelisk its gilded tip, and a dedication procession walks to it (section 5.7). There is no new sheet or pop-up.

**Stalls.** A site that is unpaused, unfinished and on a road, and that has done no work for **3 days in a row** (a number in data, so a one-day gap in deliveries does not flicker), is **stalled** (`site_stalled`). It is a **warning**, never a critical: a badge, a row in the alert list and a problem marker on the map. The idle gangs sit by their sled, so a stall shows on the map too. Its cause is the first that applies:

| Cause | Words (sheet and list) | Fix |
|---|---|---|
| No crew in reach | "No crew: build a builders' guild within 12 road tiles" | Show me (guild card, ghost near the site) |
| Its guilds short of workers or burning | "The builders' guild is short of workers" / "The builders' guild is on fire" | View |
| No gold | "No gold for the crews: work waits until the treasury is above 0" | — |
| Gilding or capstone gold | "Waiting for 5,000 gold for the capstone" | — |
| A material | "Waiting for bricks: no brickworks or storehouse with bricks within reach" | Show me (brickworks or quarry card, ghost in reach) |

A site with no road shows the road warning instead (section 6.3), and a paused site shows no warning (its sheet says Paused).

**Pausing, undo and demolishing.**
- **Pause** (on the site sheet, the same pause as any building's) stops work and work gold. Its guilds send their crews to another site in reach, or idle and release their workers to the rest of the city; quarries and brickworks with nothing else to serve idle. Stock and finished courses stay.
- **Undo** removes a site with a full refund of its founding only **before any work** has been done on it (and, as for any action, within the month). Once a block is laid the work is real: Undo refuses, and drops that step from the history, with "Work has begun on the small obelisk: demolish it instead". Undoing a monument's demolish within the month puts it back with its courses and stock and takes back the refund.
- **Demolish** asks first, with the loss in words: "Tear down the small pyramid? 7 of 8 courses and their prestige are lost. Refunds 750 gold (a quarter of its founding)." Its prestige goes with it.

**Prestige.**

| Monument | Prestige | From its courses | On completion |
|---|---|---|---|
| Small obelisk | 10 | 5 | 5 |
| Large obelisk | 30 | 15 | 15 |
| Colossus | 50 | 25 | 25 |
| Small mastaba | 70 | 35 | 35 |
| Large mastaba | 110 | 55 | 55 |
| Small pyramid | 160 | 80 | 80 |
| Great pyramid | 270 | 135 | 135 |
| One of each | 700 | | |

- **Measured from state.** The city's prestige is the sum, over the seven kinds, of the most advanced monument of that kind still standing: round down (its course share × courses done ÷ courses), plus the completion share once it is finished. Nothing is stored that the world cannot recompute.
- **One of each kind counts.** A second obelisk adds desirability, not prestige, so an avenue of cheap obelisks cannot farm the score. Its confirm bar says so ("One of each kind counts: no prestige").
- **What it does:** it unlocks the small pyramid at 100 and the great pyramid at 300 (with Capital; section 4.14); it adds **+1 mood for every 70**, at most +10, as its own mood row (section 4.9); it is the **Monuments** part of the score (section 4.19); and missions can ask for it later (Stage 5).
- With these numbers, 100 means the colossus and the small mastaba finished, or most of the ladder below them; 300 means the large mastaba finished and a good start on the small pyramid.

**The supply buildings** (Monuments tab, all from City; costs × the difficulty's cost):

| Building | Size | Cost | Upkeep, workers | Makes |
|---|---|---|---|---|
| Builders' guild | 2×2 | 150 | 10 gold, 16 workers | One crew for one site within 12 road tiles |
| Quarry | 2×2, on rocky ground | 100 | 6 gold, 10 workers | 30 stone a month |
| Brickworks | 2×2 | 90 | 6 gold, 8 workers | One brick from one clay, 30 a month |

They burn like their neighbours (section 4.12), give desirability as industry does (section 4.7), and need a road like any workplace (a road-less one does nothing and pays nothing, section 4.11).

### 4.17 Saving and returning

- **Autosave** runs every game-month and whenever the page is hidden. There's one city slot plus the previous autosave as a backup.
- **Returning:** the game always reopens **paused**, with a **Welcome back** card showing:
  - the date and how long ago the last session was
  - trends in population, treasury, mood and the city score (section 4.19; the score trend compares only month-end rows of the same score version, so a city does not seem to drop overnight when the formula changes)
  - each monument site's course and its pace: "Small pyramid: course 6 of 8, about 3 years left at last month's pace" (or "not progressing: no stone", or "paused")
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

**The parts.** Five parts, each 0-100, computed at every month's end (with mood). This is **score v2**: Stage 4 added the fifth part, Monuments (score v1, Stage 3, had the first four).

| Part | Formula (each term 0 to 1) | Main reason line, e.g. |
|---|---|---|
| **People** | 60 × growth + 40 × homes. **Growth** = (milestones reached after Village + the fraction of the way to the next, by people now) ÷ 5, and 1 at Capital. **Homes** = (average tier of lived-in homes, weighted by residents − 1) ÷ 8 | "Town: 83 of 150 people", "Most homes are Townhouses" |
| **Prosperity** | 30 × taxes + 30 × jobs + 20 × treasury + 20 × trade. **Taxes** = last month's tax per person ÷ 5, at most 1. **Jobs** = 1 − (unemployment − 5%) ÷ 25%, clamped (full at 5% or less, 0 at 30%). **Treasury** = 1 at 0 gold or more, falling to 0 at −500. **Trade** = open trade routes ÷ 2 | "12% of workers have no job", "No trade route yet" |
| **Culture** | 25 × temple + 25 × entertainment + 25 × bazaar + 25 × pleasant. The first three are the share of lived-in homes reached by a working temple, booth and bazaar. **Pleasant** = average desirability of lived-in homes ÷ 50, clamped | "4 homes have no entertainment" |
| **Safety** | 40 × fire + 40 × defence + 20 × record. **Fire** = the share of buildings that can burn covered by a staffed firehouse (1 before Town). **Defence** = (working towers + soldiers ÷ 3) ÷ towers needed for a raid sized now, at most 1 (1 before the raid clock starts, and always on Peaceful). **Record** = 1 − 0.2 × buildings burned in the last 12 months − 0.5 × raids lost in the last 12 months, at least 0 | "No firehouse covers the east streets", "A raid this size needs 3 towers; you have 1" |
| **Monuments** | 100 × √(prestige ÷ 700), at most 100 (prestige as section 4.16 measures it, one of each kind) | "No monument yet: found a small obelisk (City)", "Finish the colossus: +25 prestige", "Monuments come with City" |

- Each part rounds to a whole number. Its reason line names the term that lost it the most points (for Monuments, the next step: found the next kind, or finish the most advanced site). A city with no lived-in homes scores 0 on Homes and Culture.
- **The Monuments curve.** The square root makes the first monuments count: the small obelisk alone scores 12, both obelisks and the colossus 36, with the small mastaba 48, the large mastaba 62, the small pyramid 78, and all seven 100. A Village scores 0 there, as its Growth term is low; a part that started at 100 and fell at City would be a cliff.
- **City score** = (People + Prosperity + Culture + Safety + Monuments) × the difficulty's score factor (section 4.18), rounded. Its most is 500 on Normal (350 Peaceful, 400 Relaxed, 625 Hard).
- **Versioned.** This is **score v2** (`SCORE_VERSION` 2). Records keep each row's version, and a best made with an older formula is kept but labelled "older scoring".
- Each month-end row in `world.history` stores the score, its parts and its score version. Rows from before Stage 4 are marked v1 when the city is loaded (section 7.5), and the score trend (Welcome back, the summary) compares only rows of the same version.

**Where it shows.**
- **The summary sheet** has a score section: the city score, each part's bar with its number and reason line, the medal and the points to the next one, the milestone splits, and the **Seal this reign** and **Share score** buttons.
- **A small chip on the summary button** shows the live total ("Score 247"), once somebody lives in the city. The top bar is unchanged.
- **Welcome back** shows the score and its trend (section 4.17).
- **Previews while placing.** The confirm bar adds the parts the building would change, beside the reach lines: "Gives water to 6 homes · +3 Culture". It counts the building as staffed, and shows only changes of 1 point or more. A monument's preview is the Monuments part once it is finished: "+32 Monuments when finished" (nothing for a second of a kind).

**Milestone splits.**
- The world records the game-day on which the city first became each milestone (Town, Market town, City, Great city, Capital), and from Stage 4 two more: the day **the pyramids unlocked** (Capital and 100 prestige both held) and the day **the great pyramid was finished**.
- The summary shows each as a game date and compares it with your best for this seed and difficulty: "Town in year 2, month 3: 4 months faster than your best".

**Medals.**
- Bronze, silver and gold are set on the parts' total before the difficulty factor: **200, 300 and 400 of 500** (the same 40%, 60% and 80% as score v1's 160, 240 and 320 of 400). They are shown in city-score points, so they move with the factor:

| Medal | Parts' total | Peaceful | Relaxed | Normal | Hard |
|---|---|---|---|---|---|
| Bronze | 200 | 140 | 160 | 200 | 250 |
| Silver | 300 | 210 | 240 | 300 | 375 |
| Gold | 400 | 280 | 320 | 400 | 500 |

- A city that was gold under v1 without monuments reads silver under v2. That is intended: gold now asks for a pyramid.
- These are first guesses, to be retuned from Joshua's and friends' playtests.
- The next threshold is always visible in the summary chip's sheet and, from Capital, in the next-threshold bar: "38 points to Silver".

**Seal this reign.**
- A button in the summary. Its confirmation sheet says what happens: "Seal this reign? Your chronicle gets score 347 (Silver) for this city. The city carries on." Buttons: **"Seal reign"** and **"Not yet"**.
- `sealReign` records the day and score in the world. The interface then writes a **chronicle entry**: score, parts, splits, seed, difficulty, the date on the device, medal, feats earned, and the score version.
- The city carries on. It can be sealed again later; each seal is a new entry and a new stamp.

**Records on the device.**
- `localStorage` key `thebes.records`, separate from the save, read and written inside try/catch (private browsing must not break the game).
- Each city gets an id when it is created, passed in by the interface (the sim never reads the clock). Records hold one **city row** per id (seed, difficulty, score version, best month-end score, splits), updated on every save, and one **chronicle entry** per seal. Each list keeps at most 200; the oldest go first, but never a best.
- **Personal bests** are per seed and difficulty: the highest month-end score of any city on that seed and difficulty, and the earliest day each milestone was reached.
- The title card lists the three highest bests ("Best: 412, gold, seed 11") and a **stamp** per sealed reign: the seed's map outline with its medal, and from Stage 4 a small glyph for each mastaba or pyramid finished. Stamps are cosmetic.
- Export carries the records and import merges them by id (section 4.17).

**This week's Nile.**
- A weekly seed from the local date: seed = ISO week-year × 100 + ISO week number (week 41 of 2026 is seed 202641). The interface reads the date; the sim never does.
- The title card offers it as **This week's Nile**, with the usual difficulty choice. It plays offline, any number of times, and the best counts. Weekly, not daily, so there is no appointment to keep.

**Sharing** (opt-in only; nothing nags or rewards sharing):
- **Share score** makes a link: `https://joshuahedge.github.io/thebes/#t2.<seed>.<difficulty>.<parts>.<splits>.<check>`.

| Field | Form |
|---|---|
| `t2` | Link format 2, which carries score v2 |
| `<seed>` | The seed in decimal |
| `<difficulty>` | `p`, `r`, `n` or `h` |
| `<parts>` | People, Prosperity, Culture, Safety and Monuments joined by `-` ("72-65-58-40-36") |
| `<splits>` | Game-months from the start to Town, Market town, City, Great city, Capital, the pyramids unlocked and the great pyramid finished, joined by `-`, with `x` for not reached (seven in all) |
| `<check>` | 4 base-36 characters of a hash of the rest; it catches typos, not cheats |

- **Older links.** A `t1` link (four parts, five splits) still opens; its score shows labelled "older scoring" and is compared only with your v1 best on that seed, if any.
- **Opening a link** validates it (a bad or newer link says so and opens the title card as usual). The title card then shows the friend's score and parts beside your best on that seed and difficulty, "Beat 301?", and **Start this seed** (which asks first if a city exists, as New city does).
- **Picture card.** A 1200×630 picture: the city, the five part bars, the medal, the seed and difficulty, labelled **"friends' honour"**. It goes through the share sheet (`navigator.share` with a file), falling back to a download. The picture is made before the tap, so the gesture doesn't lapse.
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
| Steady hands | Finish a mastaba or pyramid with no month in which its crews stood idle for lack of material |
| Swift pyramid | Finish the great pyramid before the start of game-year 25 |

**More for the early game** (each passes the test "skipping it costs you nothing"):
- The endowed start and the next-threshold bar (section 4.1), and the "+N" previews above.
- **Citizen remarks.** Short lines in the caption row ("The potters say the clay is good this year"), at most one every 3 game-months and only when the caption row is free (on phones, the guidance row, section 6.3). Each is chosen by `hash2(seed, month index)` from a pool of at least 24 in `text.js`, by season (Akhet: months 1-4, Peret: 5-8, Shemu: 9-12), and only from remarks whose building the city has. They follow the Help setting (none when Help is Off).
- **A soft coin tick** when the month's taxes arrive (if sound is on), and **a ripple** on each home that a newly placed well first waters (a ring fading in place under Gentle motion, none under Still). Section 5.4.

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

**Monuments in the goals and rewards** (Stage 4; each passes "skipping it costs you nothing"):

| Kind | Stage 4 additions |
|---|---|
| Chapter | "Monuments" |
| Chain goals | City: "Found a small obelisk", "Build a builders' guild near it", "Build a quarry on rocky ground", "Finish the small obelisk". Great city: "Found a colossus or a small mastaba", then "Build a brickworks" once a mastaba is founded. Capital: "Reach 100 prestige to unlock the pyramids", then "Found the small pyramid" and, at 300 prestige, "Found the great pyramid" |
| Event goal | The first stall: "Get stone to the obelisk" (or bricks, or a crew, by its cause), with Show me |
| Firsts (10 gold each) | First builders' guild, first course laid, first monument finished, the pyramids unlocked |
| Achievements | Three monuments finished; prestige 300; all seven kinds finished ("Seven wonders"); 5,000 stone laid; the large obelisk gilded |
| Feats | Steady hands; Swift pyramid (table above) |
| Daily goals (from City, while a site is under way) | Lay a course on any monument; build a quarry; bring 100 stone to a site |
| Tips | Monuments come last for workers; quarries and brickworks deliver straight to the site; a storehouse bridges a long way; refuse stone at the potters' storehouse; pause a site to free its crews; one of each kind counts for prestige; why the city moves gently (section 5.4) |
| Citizen remarks | Three or four for the masons, the brickmakers and the haulers, by season, once the city has their building |

- Show me for a monument goal opens the Monuments tab and picks the card from the city's focus (its ghost lands on the nearest spot with room, section 6.5); the quarry goal's Show me aims at rocky ground, as the gem mine's does; the guild and brickworks goals aim at the newest site.

**Avoid** (as the Stage 2 rulings already do): streaks or daily locks; timers that run while away; global leaderboards; scoring wall-clock speed; penalising undo or pausing; fake near-misses; sharing nags or rewards; content gated by achievements or feats.

### 4.20 The palace

The city's own seat, which grows grander as the city does. It is a civic building, not a monument: it gives no prestige and has no score part, so "one of each monument" stays the only prestige rule.

- **One per city.** A 3×3 building from **Town**, 300 gold (× the difficulty's cost), on any free dry ground, needing a road like any building (placed without one it is amber and does nothing until a road touches it, section 4.5). No workers and no upkeep. While a palace stands its card reads "Your palace stands: tap to visit it", and picking it selects the palace instead of starting a tool.
- **Five styles**, each a new look on the same footprint:

| Style | Look | Can be enlarged to it from | Price to enlarge (× difficulty cost) | Works (game days, at 1×) | Desirability (by distance 1-6) | Mood |
|---|---|---|---|---|---|---|
| 1. Courtyard house | A mudbrick house round a courtyard with a palm | (as built, Town) | — | — | 4, 3, 2, 1 | — |
| 2. Columned hall | Whitewashed walls, a hall of painted columns | Market town | 600 | 30 (30 s) | 6, 5, 4, 3, 2 | +1 |
| 3. Pylons and banners | Painted pylon gate with flagpoles and banners | City | 1,500 | 60 (1 min) | 8, 7, 6, 5, 4, 3 | +2 |
| 4. Gilded | Gilded cornices, a pair of statues and two small obelisks at the gate | Great city | 4,000 | 90 (1 min 30 s) | 10, 9, 8, 6, 4, 2 | +3 |
| 5. Lapis and gold | A grand palace in lapis and gold with a pool court | Capital | 10,000 | 120 (2 min) | 14, 12, 10, 8, 6, 4 | +4 |

- **Enlarging** is the player's choice: **Enlarge the palace** on its sheet, one style at a time, once the city has reached that style's milestone. The button names the next style and its price ("Enlarge to a columned hall: 600 gold"), or why it waits ("Painted pylons come with City", "You have 900 gold: enlarging can't put the treasury below 0", "The palace needs a road first"). A confirmation names the price; the gold is paid in full at once, and it is not undone by Undo.
- **The works.** Scaffolding and a few workers stand round the palace for the works' days (game time, so nothing happens while paused or closed); the old style and its desirability hold until they end, then the new style shows with a caption ("The palace is now a columned hall") and a small sparkle under Full motion. One enlargement at a time.
- **Effects:** desirability by style (above) and a small **Palace** mood row (section 4.9), both only while a road touches it. It counts for the score only through what it does (pleasant homes in Culture, mood): no prestige, no part of its own.
- **Safe:** it never burns, raiders never target it and it is not wealth for a raid's size (sections 4.12, 4.13).
- **Demolishing** asks first ("Tear down the palace? Its 3 enlargements are lost. Refunds 75 gold."), refunds a quarter of the 300 to build it, and a new palace starts again as a courtyard house.
- **Rewards:** a first ("First palace", 10 gold), an achievement for the fifth style ("Lapis and gold"), and a tip when the city first could enlarge it ("Your palace can grow: enlarge it on its sheet").
- **Total:** 16,100 gold of enlargements on Normal: a modest sink beside the monuments' 217,000, reached at a pace the player chooses.

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
- **Monuments:** the pyramid under construction shows **individual blocks**, a mudbrick ramp, sleds and workers. The finished pyramid has a white casing and a gold capstone. Finished monuments are the city's skyline: tall, simple, bright shapes against the sand (section 5.7).
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
  - Raiders and soldiers are drawn 1.5× the size of citizen figures and are few (at most 18 raiders in a raid, which a two-sided raid brings as 19 in two bands, and 4 soldiers per barracks).
  - Raiders are dark silhouettes against the sand, with a crested helmet and a round shield. Soldiers wear white kilts and carry tall spears and teal shields. They differ by shape, not just colour.
  - A unit's health bar appears only once it has been hit.
  - Tower arrows are thin strokes that fly for 0.3 s.
  - Walls are a continuous mudbrick band along their tiles, with a gate arch on roads and broken stone at a breach.
- **The camera moves only when the player taps View** (or chose "Go to it" for fires, section 4.3), and once when a monument card is picked, to fit its footprint (section 6.5).
- Every flicker or pulse stays under 3 flashes per second (WCAG 2.3.1).

**The Motion setting.** One setting, **Motion: Full, Gentle or Still**, replaces Stage 3's "Reduced motion" and "Ambient motion". What reduced motion guards against is large or vestibular motion: camera pans and zooms, parallax, things sweeping across the view, bouncing and spinning. Small, slow change in place (a fade, a figure walking along a road) is not that, so a device that asks for less motion gets **Gentle**, not a still city.

| Level | What moves | Default when |
|---|---|---|
| **Full** | Everything in this section, 5.6 and 5.7 | The device does not ask for less motion |
| **Gentle** | Walkers, units, sleds, work gangs and processions move along their paths as walkers do. Water glints fade in and out in place (no drift). Smoke fades in place, rising at most 4 px. A monument's new blocks fade in over 200 ms; a course done or a monument finished shows a still outline for a moment. Upgrade and downgrade labels and glows fade in place without rising or pulsing; the well's ripple is a ring fading in place. Flames cross-fade between two still shapes at most once a second, with no sway or embers, and the word "Burning". No sway, drift, crop bands, rising build, pulses, dust puffs, sparkle bursts, rare life, capstone shine or camera moves | **The device asks for less motion** |
| **Still** | Walkers, units, sleds, work gangs and processions only; everything else is still: a still flame icon and the word "Burning", arrows as a still line for a moment, new blocks appearing at once | Chosen in Settings |

- **Following the device** is the default, read live: changing the device's setting moves the game between Full and Gentle at once. The Settings row says what it is doing: "Motion: Gentle (your device asks for less motion)".
- **An earlier explicit choice is kept** when a Stage 3 setting is loaded: reduced motion "on" or ambient motion "off" becomes Still; otherwise reduced motion "off" becomes Full; otherwise it follows the device.
- **A one-time tip**, the first time a city opens on a device that asks for less motion: "Your device asks for less motion, so the city moves gently. Settings → Motion changes it."
- **The camera** never eases under Gentle or Still: View, "Go to it" and the monument pick's fit are instant cuts, and the title backdrop holds still.
- **The interface's own transitions** (a row opening in place, the dock's heights, sheets) are instant under Gentle as under Still; Gentle and Still differ only on the map.
- **Screenshots in both.** Every visual review takes shots under Full and under Gentle, so a change that only shows under Full is caught.

### 5.5 Sound and haptics

- About ten **synthesised Web Audio** effects: place, road, demolish, upgrade, milestone, alert, goal complete, and from Stage 3 a **raid horn** and a **coin tick**.
  - Like every effect, each is built from short notes of at most 0.4 s and gain at most 0.35. The horn is three low notes, played once when a raid warning appears; the coin tick is one high note of at most 0.1 s at gain 0.15 or less, played when taxes arrive.
  - Sound is never the only signal: every sound has a visual twin (the banner, the caption).
- **Effects are off by default.** The title card offers "Play with sound", and the choice is remembered. It's also in settings.
- **Music (Stage 4).** A quiet, original loop generated in the browser with Web Audio: no audio files and no third-party code.
  - **The sound:** an Egyptian-flavoured mode (hijaz, the Phrygian dominant scale: on D, D E♭ F♯ G A B♭ C) at a calm 72 beats a minute; a soft **drone** on the tonic and fifth that swells slowly; a **plucked harp or oud-like voice** (a short decaying pluck, filtered) playing phrases from the mode; an occasional **ney-like flute** line (a breathy sine with gentle vibrato) about once a minute; and a soft **frame drum** (low dum and light tek) on a simple pattern.
  - **No audible loop:** phrases are built bar by bar from a small set of motifs by a seeded draw (the city's seed and the bar number, in the interface, never touching the sim's own random numbers), so it varies without repeating the same minute.
  - **Moods:** calm by default; while a raid warning or a raid is on, a tenser mood fades in over four bars (a quicker, firmer drum, a lower drone, the flute silent, the pluck sparser), and fades back after.
  - **When it plays:** it starts on the first tap or key press (the browser's autoplay rule) and plays on the title card and in the game, paused or not. It stops when the page is hidden and resumes when it shows again. It respects the iPhone's silent switch, as the effects do.
  - **Settings:** **Music: On / Off** and a **music volume** (0-100 in steps of 10, buttons 44 px), separate from sound effects. Music is **on by default at volume 30**; "Play muted" on the title card turns both music and effects off, and is remembered.
  - **Cost:** notes are scheduled a little ahead by a light timer (no audio worklet, no reverb convolution, a short feedback delay for space), at most eight voices sound at once, and the music costs well under 1% of a mid-range phone's processor.
  - Music carries no information, so it needs no visual twin; nothing in the game depends on hearing it.
- The game sets `navigator.audioSession.type = 'ambient'` where supported and never uses the silent-switch unlock hack, so the iPhone silent switch is respected.
- Short `navigator.vibrate` pulses on ✓ and milestones where supported (Android Chrome only; iOS web has none, so the visuals stand alone). There's a setting to turn them off.

### 5.6 Ambient life

The city breathes: slow, small, out-of-step motion over the landscape. Terrain is baked into cached chunks (section 5.2), so ambient motion is a light layer drawn over the chunks for visible tiles only; swaying trees are drawn in the depth-sorted pass.

| Element | Look | Motion |
|---|---|---|
| Water glints | Short pale strokes on the river, garden pools and Estate pools; about a third more of them, and a third brighter, from Stage 4 | Drift downstream at about 0.2 tiles a second, fading in and out over 4-7 s |
| Bank ripples | A faint line along each bank | Shifts about 1 px back and forth over 5 s |
| Reeds | A few blade tips along the banks, over the baked reeds | Sway ±3° over 3-6 s |
| Palms and acacias | The tree itself | Lean ±2° from the base over 4-6 s |
| Crops | Lighter stripes across a working farm | A band crosses the field in the wind direction every 6 s |
| Smoke | The potter's soft puffs, a little larger and longer-lived from Stage 4 | Rise about one tile and fade, one puff every 2-3 s, from the potter's kiln, the brewery, the brickworks' kiln, and the chimneys of Townhouses and up, while they work |
| Rare life | A bird crossing the screen; a felucca drifting on the river; ducks near the reeds | At most one of each on screen; each appears every 45-90 s |

- **Out of step.** Every phase comes from the tile's hash, so nothing moves together. The wind direction is fixed per seed.
- **Real clock.** Ambient motion runs on the real clock, so it carries on while the game is paused. It stops when the page is hidden.
- **A notch more visible from Stage 4.** Stage 3's ambient life was tuned so subtly that it was hard to see; the glints, smoke and rare life above are raised a notch, within the same budget. A check: a 390×844 shot of the river shows at least six glints, and a working potter always has a puff in the air.
- **By Motion level** (section 5.4): all of it under Full; under Gentle the glints fade in place without drifting and smoke fades in place (rising at most 4 px), with no ripple shift, sway, crop bands or rare life; none under Still.
- **Calm.** No flashing, and nothing changes direction or brightness more than once a second (1 Hz).
- **Budget.** At most **2 ms a frame** on a mid-range phone, measured on the stress city. Over budget, it drops rare life first, then smoke, then sway, and keeps the water.
- **Idle frame rate.** When the game is paused and there has been no input for 2 s, the frame rate is capped at 30.

### 5.7 Monuments and the grand city

Stage 4 is where the city becomes a place worth looking at. A grown city used to read as a flat carpet of one- and two-storey roofs whose tallest things were palms; monuments give it a skyline, and festivals and dedications give it life. In order of payoff for the cost, all in the art direction of 5.1 and within the phone budget:

**1. Construction scenes.** The stage's showpiece: something changes on screen every few seconds at 1×.

| Stage | What shows |
|---|---|
| Founded | Surveyor's cords and stakes on the footprint, a paved apron, a stockpile corner |
| Stockpile | Stacked blocks or brick piles on the apron in four steps, like the storehouse yard |
| Each course | Blocks appear one at a time along the course; at least one new block every 5 s at 1× while crews work |
| Ramp | A mudbrick ramp on the side facing the viewer, climbing with the courses |
| Crews | One sled and a gang of four or five haulers per working crew, dragging a block up the ramp, plus a few masons on the top course (the early-game pass's work-gang figures) |
| A course done | A short dust puff along the course (a still outline for a moment under Gentle) and a caption: "The small mastaba's third course is laid · +9 prestige" |
| Finished | The ramp and stakes go; a pyramid gets smooth white casing and a gold capstone, the large obelisk a gilded tip; one slow shine crosses the gold (Full only); a milestone caption, a sparkle (Full only) and a dedication procession for one game-month |

- **Game time.** Gangs and sleds move on game time: they work while the game runs, hold still while it is paused, and sit idle by the sled while the site stalls, so a stall shows on the map, not only on the sheet. They are walkers, so they move under every Motion level.
- **Drawn from the world.** The scene reads the world (courses done, progress in the course, stock, crews at work), so a reload shows the same scene.

**2. Finished monuments as the skyline.** Tall, simple, bright shapes against the sand: white casing and a gold capstone, a painted seated colossus, banded obelisks with gilded tips, mastabas as stepped whitewashed benches. A minimap glyph marks each.

**3. Festival processions.** While a festival lasts (3 months), a procession walks the roads within the temple's reach: priests with a carried shrine, musicians and dancers, and streamers on the temple. It starts with four figures and gains one for each temple, booth and finished monument, up to 12, so a later festival is visibly bigger: the city has grown without a number saying so.

**4. Dedication.** When a monument is finished, a shorter procession walks from the nearest temple to it for one game-month (from the monument's own road tiles when no temple is in reach). It reuses the festival's figures.

**5. Plazas and sphinxes** for grand approaches. The **plaza** is a 1×1 paved mosaic tile (blue-and-white checks, crisp edges, section 5.2), painted like housing plots; the **sphinx** is a 1×1 lying lion statue facing the nearest road. A sphinx-lined plaza leading to a pyramid is the classic look at almost no cost.

**6. Supply buildings with visible work.** The quarry with cut faces, stacked blocks and men splitting stone; the brickworks with rows of drying bricks that show its stock, and a kiln that smokes; the guild yard with sleds, ropes and a stone template. An idle one shows its tools laid down and nobody at work.

**7. The title backdrop and the sample city** get a finished small obelisk, a colossus under way and a palace in its third style (section 4.1).

**8. The palace's five styles** (section 4.20), each clearly grander than the last at phone zoom: a mudbrick courtyard house with a palm; a whitewashed columned hall; painted pylons with flagpoles and banners; gilded cornices with statues and two small obelisks; a lapis-and-gold palace with a pool court. While it is enlarged, timber scaffolding and a few workers stand round it. A 3×3 building is small enough to be cached as a sprite per style, like the homes.

**Not in Stage 4:** a quay or river trade, temple complexes, pleasure gardens, a day-night cycle. Each is a new system, not a visual.

**Seeing behind a monument.** While the player places a building whose ghost lies behind a monument, or selects something behind one, that monument fades to about 40%, so nothing is lost behind it.

**The phone budget.**
- **Monuments are drawn live as shapes, not cached sprites.** A finished pyramid is a few faces and some joint lines; a site is a stack of course blocks, a ramp and a few figures. A 7×7 pyramid cached at zoom 2 on a 2× screen would be a canvas of about 1,800 × 1,600 px (over 10 MB) per zoom step. Live drawing costs at most **1 ms a frame for three sites** on the stress city; if it does not, only the finished courses are cached, at the current zoom step.
- **Depth sorting.** The renderer sorts by one depth key per building, which holds for big convex footprints beside 1×1 and 2×2 neighbours; the paved apron inside each footprint keeps neighbours' drawings off the monument's body. Tests cover neighbours at all four corners and walkers on all four sides.
- **Processions** are walkers, at most 12 figures each, drawn only on screen; over budget they drop with rare life.

## 6. Interface

### 6.1 Principles

- **Things you read sit at the top, things you tap sit at the bottom** (or in the side panel on wide screens).
- **Nothing floats over the middle of the map.** Corner buttons are fine. On phones the rows of text under the top bar never reach the middle of the screen: they end by 40% of its height (section 6.3, Small phones).
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
- **Compact landscape layout** (every other viewport: wider than tall, but under 900 × 520 px). Used on phones held sideways and small tablets: a slim **vertical rail on the right** with category icons, trays opening as a side drawer (while a tool is active the confirm bar beside the rail holds ✕ and ✓; the rail has none of its own), and a condensed top bar.
- **Rotating** keeps the camera position and any placement in progress.

### 6.3 Screen elements

- **Top bar:** gold, population, mood, date and the ☰ menu. Tapping it opens the **city summary** sheet: income against spending (soldiers' pay on its own row), food in store, employment, the mood breakdown, goals, the score section (section 4.19) and the last raid's report. A small chip on the summary button shows the score ("Score 247") once somebody lives in the city; the top bar gets nothing new. On a landscape phone, and on a portrait phone at 150% text, the chip sits in the numbers' row right after the date. On a phone at 150% text each of the four numbers shows a small picture in place of its word (a coin, an ankh, a smile, the sun; the word stays for screen readers), so the numbers keep to one row.
- **Speed controls:**
  - Portrait: pause and speed sit in the **bottom-left corner button** (tap to pause or resume, long-press or tap the chevron, labelled **Speed**, for 1×, 2× or 3×).
  - Wide: the speed controls are in the top bar.
- **Build dock (portrait),** one panel with three heights:
  1. **Slim bar** (default): category icons with labels (Roads, Homes, Food, Industry, Services, Defence, Monuments).
  2. **Tray**: tapping a category or swiping up shows its buildings as cards with cost. Unaffordable costs show in coral with a coin-slash icon, and locked cards show a lock and their condition. The tray scrolls sideways and remembers the last category. The **Monuments** tray (section 4.14) holds up to ten cards and scrolls on phones; a monument's card shows its founding cost and its ground ("Desert"), and a prestige-locked one its count ("Needs 100 prestige (you have 60)").
  3. **Tucked away**: swiping down or panning the map shrinks the dock to a single **Build** pill.
- **Corner buttons** show at **every dock height**, never in the middle (in portrait at 125% text or more they hide while the tray is open if they would sit above half the screen):
  - bottom-left: pause and speed
  - bottom-right: the **minimap** button with an **alert count badge**, and the **Layers** button (opens the picker, below)
- **Alerts** come in three tiers, one channel each:

| Tier | Channel | Examples | Screen readers |
|---|---|---|---|
| Info | A caption (the caption row on wide screens, the guidance row on phones) | A blaze put out, a raid report, a citizen remark | Polite status |
| Warning | The count badge, a row in the minimap sheet's list, and a problem marker on the map | A covered blaze, high fire risk, labour shortage, an empty bazaar, no storage, plots with no road, a stalled monument site | Polite status |
| Critical | **The one banner** under the top bar (the alert row on phones) | See the ranking below | `role="alert"` |

  - **Only one banner ever shows.** It holds the highest-ranked critical, ranked by how soon harm lands: **an active raid, then a fire no staffed firehouse reaches, then a raid warning, then debt, then save failing**. A fire burns out in 10-15 s and a warning gives about 90 s, so a fire is never hidden behind a raid that is months away. The others wait in the minimap list. On wide screens the banner shows "+2 more", which opens it. On phones there is no "+N more": the Map badge counts every alert the banner is not showing, criticals included, and the minimap sheet, opened from the badge or from the banner, lists alerts first (criticals first) and the map second.
  - **Repeats roll into one line**: "3 buildings on fire", whose View steps through them in turn.
  - **Problem markers** on the map are at least 20 px across at any zoom, with a mark by cause: a road mark (two bars) for a building no road touches, "!" for the rest, and the down arrow for a home losing a tier. **Plots and homes with no road** also get a dashed amber outline on their tile, one road-mark badge (the same 20 px badge a building with no road gets) over each group of them whose tiles touch along an edge, set over the plot nearest the group's middle, and one aggregate warning in the list, "6 plots have no road" ("N homes have no road" once any has people), with View and Show me (which opens the road tool aimed at the one nearest the middle of the screen). It counts in the Map badge and never takes the banner. The Press Play tip does not fire for plots when none of those just painted touches a road.
  - **Which building a marker belongs to** (Stage 4, from Joshua's playtest: a red badge floating between buildings was hard to place). Every marker is tied to its own building in three ways, at every zoom and every Motion level, with nothing pulsing:
    - **A pin, not a float.** The badge stands on a short **stem** (an ink line with a white halo, at least 10 CSS px long) whose foot is a small dot on the building's own roof: the top of its drawn sprite, straight above its footprint's middle (a monument site's top course, a road-less plot group's chosen plot). The badge is never drawn over another building's roof.
    - **A ring on the ground.** The building's footprint gets an outline in the marker's colour (coral for a problem, amber for a home about to drop a tier), 2 CSS px with a white halo, and a faint wash of the same colour inside it, so the eye follows badge, stem and ring to one footprint. The glyph in the badge still says what is wrong (colour is never the only signal).
    - **No overlaps.** Badges are laid out on screen after the camera moves: when two would overlap, the one further back gets a longer stem (in steps of one badge height) so they stack, never covering each other. When more than three would stack in one place (far zoomed out), they merge into one badge showing the count ("4") on the front building's stem, with a ring on each of their footprints.
  - **Tapping a marker selects its building** and opens its sheet, ahead of whatever building lies under the badge. The badge's tap area is 44 px across (the stem's too). A count badge zooms in one step, centred on its buildings (a cut under Gentle and Still). While a tool is active, taps go to the tool and markers only show.
  - **View** from the alert list, the minimap pins or the banner frames the building and outlines its footprint in the marker's colour, with a white halo, for 2.5 s, then fades out over 0.5 s (under Gentle and Still it holds still for 2.5 s and then goes, with no fade). Selecting a building that has a marker keeps its ring on while its sheet is open.
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
    - **At most two rows under the top bar:** an **alert row**, the one banner as one line (icon, words, View), and a **guidance row**. The guidance row shows one thing, in this order: the overlay legend (while an overlay is on), a tip, a caption, the goal (with the threshold bar in calm portrait play, section 4.1). Its words wrap to two lines at most; longer text is cut with "…", shows **More ▾** and opens in place with a tap (below), with the full words also in the button's name and one tap away (the Goals sheet, the raid sheet, How to play).
    - **One row on a landscape phone at 125% or 150% text:** the alert row when there is a banner, otherwise the guidance row.
    - **A sheet open:** the guidance row hides, so tips and captions wait (a caption that waits more than 10 s goes to Recent), and the alert row stays one line. In compact the rows stop at the sheet's left edge. The camera frames a selected building, the placing ghost and Show me in the part of the map left free below the measured rows, not below a fixed 48 px bar.
    - **A tool active** (placing, drawing, demolishing): the guidance row shows the goal or a caption, and tips wait.
    - **Open in place.** A goal, tip or caption whose words are cut shows **More ▾** at its end. It shows only when the text is really cut (measured after the row is drawn, and again when the text size or the screen size changes). A tap on it, or on the cut words, opens the row where it is: every word shows, up to **40% of the screen's height** (longer text scrolls inside the row), easing open over 150 ms (at once under Gentle and Still motion). The goal's words are always the toggle, because the open goal holds more than its words: its reward, Show me, **All goals ›** (opens the Goals sheet) and, while the guide runs, Skip guide; the threshold bar steps aside. While a row is open a caption's timer stops (it stays at least 2 s after closing) and a tip's 20 s does not run. It closes on a second tap (**Less ▴**), Back, Esc, a tap on the map (the tap still does its own work), a sheet, a tool or an overlay starting, or the row's content changing. Captions and tips keep their polite live region; the **More** and **Less** controls are real buttons with `aria-expanded`. Wide screens keep their rows as they are.
    - **Captions** show one at a time, 3 s apart: **4 s** for goals, firsts, feats and remarks, **5 s** for milestones and **6 s** for info. At most two wait; an older one goes straight to **Recent**. Every caption is also written to Recent, the last 10, in the Goals sheet. While a banner is up only info captions show; the rest go to Recent. A goal caption reads as the strip itself changing ("✓ Lay a road · +25 gold", then "2 of 10 Place 6 housing plots").
    - **Tips** show one at a time. A tip takes the guidance row in place of the goal, and closes on **Got it**, on Esc, when its condition clears, or after **20 s of unpaused play** (so a paused game keeps it). While the game is paused a tip other than the Play tip waits, so a new player laying the first road while paused keeps the goal and Show me in sight; it shows once Play is pressed (a tip already up stays). The caps stay: none in the first 10 s of a session, at least 3 min between two, at most 5 an hour. A tip whose words are about the sheet or overlay that brought it (the house sheet's needs, the overlay's dot and ring) never waits, since its words would be false once that has closed: while the sheet or the legend has the row it is dropped unseen, and it can come again the next time. Tips are always listed in How to play.
    - **Toasts** show one at a time (the newest replaces the last), as wide as the screen allows up to **420 px** with 16 px sides, above the corner buttons: 4 s, or 6 s with Undo. Undo always undoes the last action, and also works from the confirm bar and with Ctrl+Z. Only the toast takes taps; the map beside it still does. The **Update ready** toast is the exception: it stays beside the newest toast, with its Restart, until Restart is used or its ✕ closes it.
    - **Height budget** (where the rows under the top bar end, as a share of the screen height; this is what the tests hold):

    | Screen | Text | Rows end by | With a sheet open |
    |---|---|---|---|
    | 375×667 and 390×844, portrait | 100% | 30% | 20% |
    | | 150% | 40% | 25% |
    | 844×390 and 667×375, landscape | 100% | 40% (two rows) | the rows stop at the sheet's edge |
    | | 125% and 150% | 40% (one row) | the rows stop at the sheet's edge |

    The tests also hold two scenes from the placement review: a **tip opened in place** ("expanded", rows end by 40% at every size and text size, since an open row may reach 40%), and a **grain farm being placed** ("farm" with a calm city, where the Ground legend alone has the guidance row, and "farm-raid", where a raid warning's alert row sits above it), whose Ground legend and chips keep to the table's limits. On phones at 125% text or more the Ground legend's room line is kept for screen readers for that reason.
- **Overlays:** water, food, religion, goods, entertainment, desirability, **fire risk**, **Housing** and **Ground**.
  - Housing shows each home's next blocking need.
  - **Ground** shows where farms, orchards and mines can stand (section 4.4): free fertile land in leaf green with two dots a tile, free rocky ground in grey with diagonal hatching, tile edges crisp (not feathered), tiles with a building, a road or a wall left plain. Its legend reads "Ground · Fertile: farms and orchards · Rocky: mines". While a farm, orchard or mine is being placed, tiles that belong to at least one free spot where the whole footprint fits are drawn at full strength and the rest at half, and the legend adds "Bright: room for a farm" (or "No room left for a farm"); on a phone at 125% text or more that third line is kept for screen readers, since the bright tiles say it and the legend must fit the guidance row. Ground is not about road or gold, so "room" means the ground only. Picking a farm, an orchard, a gem mine, a quarry or a monument turns it on, and like the service overlays it stays on until its ✕ or another overlay.
  - **Ground for a quarry** works as for the gem mine: "Bright: room for a quarry" over rocky ground.
  - **Ground for a monument.** A monument's room is the opposite case: tiles that belong to at least one free spot where the whole footprint, in its current rotation, sits on dry ground that is not fertile land. Plain desert has no Ground tint, so those tiles get a pale gold wash (the Monuments tint) with crisp edges, while fertile land (where it cannot stand) and rocky ground are drawn at half strength. The legend reads "Ground · Fertile: no monuments here · Gold: room for a small mastaba" (the third line kept for screen readers on a phone at 125% text or more, as for farms). The room is worked out once when the card is picked and again on each rotation, and kept until the roads or buildings change, so a 7×7 search never runs per frame. Room is about ground only, not road or gold.
  - **The Layers picker** chooses an overlay on every layout. The Layers button (the bottom-right corner on phones, a new Layers button under the minimap in the wide side panel, labelled "Layers: Water" when one is on) opens a small popover of the nine overlays and **Off**, each a 44 px button with its colour on the edge, the current one marked pressed: three columns on a phone at 100% text, two at 125% and more and in the side panel (a third of its width is too narrow for "Entertainment"). One tap picks and closes; tapping the current one turns it off; Off turns it off. Back, Esc, a tap outside, or a sheet opening closes it, and focus returns to the button. It is a popover, not a sheet, so it never cancels a tool or a selection. O still cycles through the nine. Held sideways at 125% or more the popover is shortened to what the top bar and corner row leave, with Off beside Ground, and scrolls the current choice into view.
  - Has-it versus missing is shown as a **filled dot versus a hollow ring**. Graded overlays (desirability, fire risk) use a single-hue light-to-dark scale with a legend.
  - The **fire-risk legend** reads, in words: "Low · Rising · High · Can catch fire", with the hatching drawn on the top two swatches, then "● a firehouse reaches it · ○ no firehouse reaches it" and "Roads, gardens, statues, wells, walls and monuments never burn" (bands in section 4.12). On a portrait phone that last line is kept for screen readers only, so the legend fits the guidance row.
  - The legend strip attaches under the top bar. On wide screens a critical banner shrinks a dot-and-ring legend to its marks (the words stay for screen readers). On phones the legend takes the guidance row while an overlay is on (the goal waits), so the full legend reads under a banner.
- **Minimap sheet:** the whole map, the current view outlined, and alert pins. Tapping the map jumps there. It also holds the alert list with View buttons (on phones the list comes first, criticals first, then the map) and **+/− zoom buttons**, the zoom alternative that doesn't need pinching.
- **Info sheets.** Selecting a building moves the camera so the building stays visible above the sheet and below the alert and guidance rows.
  - **Buildings:** name, reach (highlighted), staffing, stock, problems, and from Town the **fire row** (section 4.12: "Fire risk: high, no firehouse within 8 road tiles", with Show me). Every problem names the **cause and the fix** with **View** ("Bazaar empty: no granary within 16 road tiles").
  - **Houses:** a **next-tier checklist** with a tick or cross for each need, timers ("upgrades in 1 month", "loses water in 1 month"), the desirability breakdown, residents and the fire row.
  - **Temple:** also **Hold a festival** with its cost, or "Next festival in 7 months" (section 4.13).
  - **Tower and barracks:** staffing, range or patrol radius (highlighted), soldiers trained ("3 of 4 soldiers; next in 12 days"), and what it stopped in the last raid.
  - **Rubble:** "Rubble: clear it for 5 gold a tile", with Clear (the Demolish tool).
  - **Monument site** (section 4.16). Every line is computed from the sim's own rules (`siteStatus`, `crewsFor`, `paceOf`), as the danger sheets are, and reviewers check each against the sim:

  | Row | Example | When it changes |
  |---|---|---|
  | Progress | "Course 4 of 8 · 46% done", with a bar | Daily |
  | Crews | "Crews: 2 of 4. 2 builders' guilds work here." | When guilds come, go or idle |
  | No crew | "No crew: build a builders' guild within 12 road tiles", with Show me | |
  | Each material | "Stone: 46 on site. 2 quarries and 1 storehouse reach this site." | Daily |
  | Waiting | "Waiting for bricks: no brickworks or storehouse with bricks within reach", with Show me | |
  | Pace | "At last month's pace, about 3 years 4 months to finish"; "Not progressing: no stone" when last month did nothing; "Pace shows after a month of work" at first | Month end |
  | Gold | "Last month: 300 gold for 3 crews. Work stops if gold would go below 0." | Month end |
  | Stopped for gold | "No gold for the crews: work waits until the treasury is above 0", or "Waiting for 5,000 gold for the capstone" | |
  | No road | "No road yet: crews and stone come by road", with Show me (the road tool) | |
  | Prestige | "Prestige 35 so far; +35 when finished", or for a second of a kind "One of each kind counts: the other small obelisk holds its prestige" | Each course |
  | Actions | Pause or Resume, Demolish, View | |

  - Selecting a site highlights its **reach**: the 12 road tiles in which guilds, quarries and brickworks serve it, and the 16 road tiles in which it draws from storehouses, as other buildings show theirs.
  - A finished monument's sheet shows its name, the day it was finished, its prestige ("Counts for prestige: 110", or that another of its kind does), the homes it makes nicer and Demolish.
  - **Builders' guild, quarry and brickworks** sheets say which site they serve and why they are idle: "Crew at work on the small mastaba", "Idle: no monument site within 12 road tiles has room for a crew", "Idle: no monument site needs stone within reach".
  - **Palace** (section 4.20): its style, its desirability and mood, the works' days left while enlarging, and **Enlarge the palace** with the next style's price or why it waits.
  - **Actions:** Pause and Demolish. Rotation is chosen while placing (section 6.5); a building never turns once placed.
- **The city summary** also has, from City: a **Monuments** section (each site with its course and bar, each finished monument, and the total prestige with what it unlocks next), a **Monuments** row under spending, and the "Monuments +N" row in the mood breakdown.
- **☰ menu:** Continue, New city, Export city, Import city, Settings, How to play (the picture cards at its top, section 4.1, then goal history and short explanations), **Screenshot mode** (section 4.19), About.
  - **Settings:** sound effects, **Music: On / Off** and its **volume** (section 5.5), vibration, text size, left-handed controls (mirrors ✕ and ✓ and the corner buttons), keyboard shortcuts on or off, **Motion: Follow the device / Full / Gentle / Still** (section 5.4; the row names the level it is using: "Motion: Gentle (your device asks for less motion)"), and **On a fire: Pause / Go to it / Just tell me** (default Just tell me, section 4.3).
- **"Update ready" toast:** appears only when no placement or raid is in progress. It saves first, then reloads. On a wide screen it lasts 20 s; on a phone it stays until Restart or ✕ (section 6.3, Small phones). Either way, an update not taken is offered again the next time the game opens.

### 6.4 Modes

| Mode | Bottom (portrait) / panel (wide) shows | A tap or click on the map | How to leave |
|---|---|---|---|
| Browse | Dock or panel | Selects a building or house → info sheet | n/a |
| Selected | Info sheet | Selects another; tapping empty ground closes | ✕, Back, Esc, tap empty |
| Placing | **Confirm bar**: name, cost, a row of **condition chips** (section 6.5), **reason if blocked**, ⟳ rotate, Undo, ✕, ✓ | Moves the ghost to the tapped tile | ✓ with touch or pen (below), ✕, Back, Esc, right-click |
| Drawing (roads, walls, plots, plazas, area paint) | Confirm bar with length or count and total cost. Touch and pen: "Drag or tap tiles · two fingers move the map" until something is drawn | Touch and pen: **adds or takes off one tile**, and a one-finger drag draws (section 6.5). Mouse: first click sets the start, second sets the end | Same as Placing |
| Demolishing | Red **Demolish** bar with count and refund, or the clearing cost for rubble | Touch and pen: adds or takes off a tile with something on it, and a drag marks a rectangle. Mouse: marks a building, rubble or an area | Same as Placing |
| Overlay (combines with Browse) | Legend strip at the top (the guidance row on phones) | As Browse | ✕ on the strip, O |
| Screenshot | Nothing: the whole interface is hidden | Restores the interface (pinch and drag still move the camera) | Tap, click, Esc, Back |

- The confirm bar never tucks away.
- **On touch and pen, ✓ ends the tool.** When a building, a road, a wall, plots or a demolition has been laid with a ✓ press by finger or pen, the mode goes back to Browse and the dock comes back as it was when the card was picked (usually the tray, on the same category, so the same card is one tap away). A service's overlay stays on, with its ✕, so the player can see its reach. For a building the camera moves the least that keeps the whole new building in view, above the dock, clear of the toast and below the rows under the top bar. When the band between the rows above and the toast is too short for the whole building (the smallest phones at large text, for example 375×667 at 150%), the toast drops into the free map between the corner buttons and the tray when it fits there, and the building goes in the band between the rows above and the corner buttons; failing that, the building goes in the free map between the corner buttons and the dock when that alone holds it; failing that, the map zooms out just enough (never past the least zoom) for the building to fit above the toast. The toast, "Well placed · Undo", stays 6 s and sits above the confirm bar while a tool is on (portrait) and above the dock after (on the corner buttons, or in the free map under them as above, until it goes or the dock changes). The rule follows the **input type of the ✓ press** (section 6.7), so a touch tablet in the wide layout leaves the tool and a mouse click does not. **A mouse click, Enter and the keyboard keep placing repeatedly**, as before; a ✓ the game refuses keeps the tool.
- **On phones the confirm bar's Undo is an icon button** (↶, 44×44 px, named "Undo" for screen readers), shown only when there is something to undo. The wide layout keeps the word button, disabled when there is nothing to undo.
- Only one mode is active at a time, except overlays, which combine with Browse.
- Each open sheet or mode adds a browser-history entry, so the phone's Back gesture closes it instead of leaving the game.

### 6.5 Placing and tools

- **Touch placing:**
  - The ghost appears in the middle of the map left free (on phones, below the rows under the top bar), snapped to the nearest **fit**: the nearest spot where every condition holds, or failing that the one with the fewest conditions that are only "later" (below). A farm, orchard or mine looks up to three times as far for its ground (section 4.4).
  - **Tapping** a tile moves it there. A **drag that starts on the ghost** moves it, drawn just above the finger so it isn't hidden. Every other one-finger drag pans, and **two fingers always pan or zoom**.
  - Nothing is built until ✓.
- **Mouse placing:**
  - The ghost follows the cursor and **a click places it**. The game stays in placing mode so the player can place repeatedly, and Esc or right-click stops. (With touch or pen, ✓ ends the tool: section 6.4.)
  - Hovering a card or building shows a tooltip with cost, needs and reach.
- **Validity is judged one condition at a time, and shown three ways.** A building's placing preview checks each condition on its own and shows it as a **chip** in the confirm bar, full width under the name and buttons, each with a mark and words, never colour alone:
  - **Conditions:** **Ground** ("Free ground", or "Fertile land" / "Rocky ground" for a terrain building, with a count when part right: "Fertile land: 2 of 4 tiles"); **Road** (for buildings that need one, and for housing plots: "Road beside it" or "No road yet"); **Works** (a store in reach for a producer, supply for a bazaar: "No granary near"); **Gold** (shown only when paying would take the treasury below the −500 debt floor, section 4.11 Debt; with less gold than the cost but above the floor the building still places and the treasury goes into debt, so the chip can only read, for example, "Not enough gold: 60 needed, you have −470").
  - **✓ met** (teal): the condition holds. **! later** (amber): placing is allowed, but it will not work until this is met. **✕ can't** (coral): it cannot be placed. The ghost takes the worst state, drawn as a blue outline and ✓ (can place), an amber outline and "!" (**"Won't work yet"**: placing is allowed, with a warning) or coral hatching and ✕ (can't place, with the **reason** in the confirm bar: "Needs fertile land", "Not enough gold", "Must touch a road"). The mark is a badge at least 20 px across at any zoom, at the footprint's centre.
  - **Each footprint tile shows its own state** when the footprint is part right and part wrong: on the edge of the loam the two fertile tiles are blue and the two sand tiles coral with ✕, with a coral outline round all four.
  - **Road is "later" for a building too.** For every building that needs a road, the player's ✓ places it without one: **it is amber, built and paid for, and does nothing until a road touches it** (section 4.5; the price and Undo are as for any building). Ground and gold never wait: they refuse. The toast says "Grain farm placed · needs a road". While the road is the missing condition and the ground is fine, the **free tiles where a road could join the footprint** get a dashed amber outline, a faint amber wash and a road mark (═), and the bar says "No road yet: draw one on a marked tile". The sim's own default is strict: `canPlace` refuses with the single reason unless it is called with `roadLater`, and only the interface (the player's commands) passes it, so the sample cities and the balance runs never place a road-less building.
  - The chip row is reserved for every building tool (and a terrain building's and a monument's have room for two chip rows from the start), so the bar keeps one height as the ghost moves.
- **Placing a monument** (section 4.16) uses the same ghost, chips, road-later rule and ✓ as any building, with these additions for big footprints (at zoom 1 the 7×7 great pyramid is 448 px wide, wider than a 390 px phone):
  - **One camera move, at the pick.** Picking a monument card lands its ghost on the nearest fit, then the pick's one camera move (the pan every pick already makes to keep the ghost in view) also zooms out, only as far as needed for the footprint and the finished monument's silhouette to fit the free map, never past the least zoom and never zooming in. It eases under Full and is an instant cut under Gentle and Still. After that nothing moves while placing: dragging the ghost to the edge does not scroll, rotating does not move the camera, and two fingers pan. After a touch ✓ the rule of section 6.4 applies unchanged (usually no move, since the site is already in view), and the camera does not zoom back in: a pinch does that.
  - **Nearest fit.** The search reaches 16 tiles for footprints of 3×3 and up (10 below), with road-later fits counting as for any building: a clean fit first, else the fit with the fewest "later" conditions. Monuments do not get the terrain buildings' three-times reach; the quarry does, as the gem mine. With no fit at all the ghost stays where the pick put it and the chips say why.
  - **Drag by the body.** The ghost draws the footprint, its paved apron and a 35% silhouette of the finished monument, so the player sees the eventual size; a drag that starts anywhere on the footprint or the silhouette moves it.
  - **Rotate.** For the mastabas the confirm bar's ⟳ (and R) turns the ghost a quarter about its centre tile, swapping its footprint; the room on the Ground overlay is worked out again. Other monuments have no ⟳.
  - **Ground overlay.** Picking a monument turns Ground on, with the gold "room" wash of section 6.3.
  - **Chips:** **Ground** ("Desert ground", or "Not on the fields: 3 of 12 tiles are fertile" with those tiles coral); **Road** ("Road beside it", or "! No road yet: crews and stone come by road", with the road-join tiles marked); **Crew** ("✓ Crew: 1 builders' guild near", or "! No builders' guild near" when no guild within 12 road tiles has room for a crew); **Supply** ("✓ Stone near", or "! No stone near" when no quarry, brickworks or storehouse with the first course's material is in reach); and **Gold** ("Founding 1,000 gold: you have 640" when founding would take the treasury below 0, which refuses). Crew and Supply show only once the road is met, since both arrive by road. There is no chip for a prestige lock: a locked card cannot start the tool, and the card already says "Needs 100 prestige (you have 60)".
  - **The confirm bar's line** says what the monument will cost and do, all from the data, most important first: "+32 Monuments when finished · then 130 gold a crew a month · finished: 9 homes nicer · while building: 4 homes less pleasant". On phones it is two lines at most; the full words are in the card's details (long-press) and its tooltip. A second of a kind says "One of each kind counts: no prestige".
  - **Seeing behind.** A monument the ghost passes behind fades to about 40% (section 5.7).
  - **After ✓** the toast says "Small obelisk founded · Undo" ("· needs a road" with none), and on touch the tool ends as for any building, with the Monuments tray back; no sheet opens by itself.
- **Area painting:** housing plots, plazas and demolition are painted as a rectangle with a count and total cost and **one ✓** (gardens, statues and sphinxes are placed one at a time). With a **mouse**, click the start and the end, or drag. Demolishing occupied homes at tier 5 or above asks first. Plots painted with no road say "6 plots placed · no road yet" ("· 2 with no road yet" when only some lack one) and are drawn amber.
- **Drawing on touch and pen** (roads, walls, plots, plazas, demolition) builds one **plan** of tiles that grows until ✓ and is laid as one action with one Undo step:
  - A one-finger **drag** draws. **Roads and walls follow the finger** tile by tile; when the finger skips tiles, the gap is filled with a four-way step, along the axis it moved most first. Dragging back over the last tiles of the stroke takes them off again. **Plots and demolition paint a rectangle** from where the finger went down to where it is.
  - A **tap** adds one tile, or takes it off if it is already in the plan (demolition adds only a tile with something on it). There is no L and no Flip on touch.
  - **Strokes add up.** Between strokes the player can pan with two fingers and carry on; a stroke interrupted by a second finger is dropped (earlier strokes stay). ✕ ends the tool and drops the whole plan. The bar counts tiles and gold as the plan grows.
  - **A plan lays every tile it can and skips blocked ones.** Skipped tiles are drawn coral with ✕ and counted in the bar's amber reason line: "5 tiles · 4 skipped: something is in the way" (one reason's words when they all share it, "blocked" otherwise). A plan with nothing left to lay refuses with the reason; a plan whose cost would take the treasury below the −500 debt floor refuses with "Not enough gold". The sim cores take any list of tiles (`previewRoadTiles`/`drawRoadTiles`, the wall, plot and demolish equivalents, each with `skipBlocked` where blocked tiles are skipped); the L and rectangle commands are thin wrappers that stay strict, so a mouse L across a building still fails whole.
- **Rotate** (⟳ in the confirm bar, or R) for non-square footprints such as mastabas, while placing only.
- **Undo:**
  - The last **10 actions** (placing, drawing, painting, demolishing) can be undone with a full refund, **until the current game-month ends**. The monthly tick clears the undo history, which closes the refund loophole at high speed.
  - Undo sits in the confirm bar (an icon on phones, shown only when there is something to undo) and in a toast after each action (one toast at a time on phones), and works with Ctrl+Z or Cmd+Z. A road-less building's gold comes back with Undo like any other.
  - A monument site can be undone only before any work is done on it; after that Undo refuses with "Work has begun on the small obelisk: demolish it instead" and drops that step (section 4.16).

### 6.6 Gestures (touch)

| Gesture | Effect |
|---|---|
| One-finger drag | Pans, except a drag that starts on the ghost while placing (for a monument, anywhere on its footprint or silhouette), and **in a drawing tool** (road, wall, plots, plazas, demolish), where it draws (section 6.5) |
| Two-finger drag or pinch | Pans or zooms, always (also in a drawing tool) |
| Tap | Selects, or moves the ghost; in a drawing tool adds or takes off one tile |
| Double-tap | Zooms in, **except while a tool is active**, where two quick taps are two taps (pinch and +/− still zoom) |
| Long-press a build card | Shows building details |
| Swipe on the dock handle | Changes the dock height |

- Every pinch and drag action also has a **single-tap alternative** (WCAG 2.5.1 and 2.5.7): +/− zoom, and tapping the tiles one at a time for lines and areas.
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
  - Enter confirms (and keeps placing: only a ✓ press by finger or pen ends the tool); Esc goes back one step (an open row or the Layers picker closes first; on a phone layout a tip on screen closes next, never ahead of an open sheet); Ctrl+Z or Cmd+Z undoes; ? lists shortcuts.
  - Focus is visible and the tab order follows the screen layout. On a phone layout, when the guidance row changes what it shows, focus in it moves to what comes in (Got it, the legend's ✕, Show me; for a caption the banner's button or the map; for a sheet into the sheet), and comes back to the row once it has a button again.
  - Single-key shortcuts switch off while a text field has focus, and can be turned off in settings (WCAG 2.1.4).
- **Switching between inputs:**
  - The input type is decided **when each press starts** (pointer type), never partway through an action. A ✓ press decides whether the tool ends (touch and pen) or stays (mouse), and the drawing words in the bar ("Drag or tap tiles" or "Tap where it starts") follow the last press, a fine pointer counting as a mouse until the first touch.
  - On any device with a touchscreen, buttons keep touch sizes even when a mouse is in use.
  - Pens behave like a mouse for hover and like touch for confirming.

### 6.8 Accessibility summary

- Interface elements are real DOM buttons with labels, so the menus, sheets, dock and panel all work with screen readers and keyboards. The map canvas has a text summary (city stats and alerts) instead of tile-by-tile access.
- Colour is never the only signal: dots versus rings, ✓ and ✕ marks, hatching, icons. Each placing condition has its own mark and words (✓ met, ! later, ✕ can't); the Ground overlay uses dots against hatching; a no-road problem has its road mark.
- Rows that open in place use real buttons with `aria-expanded` (More and Less, the goal's words), and a goal's accessible name keeps its whole words even when they are cut. The Layers picker's buttons are named and `aria-pressed`, with Off. Undo on phones is an icon button named "Undo".
- Contrast and text size follow section 6.1. Motion follows section 5.4.
- Pausing is always available, with no forced timers, and everything (building, walls, tribute, the camera) works while paused. The first fire and the first raid warning pause the game automatically; later ones drop the speed to 1× (section 4.3, with the On a fire setting). Banners never time out.
- Critical alerts use `role="alert"`; everything else uses a polite status region (section 6.3).
- Flames never flash, nothing pulses longer than 5 s, and ambient motion stays under 1 Hz. The **Motion** setting (Full, Gentle, Still; section 5.4) follows the device's request for less motion by default with Gentle, which keeps camera moves, sway, drift and bursts off while walkers, crews and fades go on, and Still turns everything but walkers and units off.
- A monument's progress, crews, materials and stalls are all in words on its sheet (section 6.3), never only in the construction scene.
- Left-handed controls are in settings.

### 6.9 The look of the interface

From Stage 4 the chrome is papyrus-toned and lightly Egyptian, so it belongs to the game, while staying as clear and simple as before. Every rule of section 6.1 still binds: text at 4.5:1 or better, 44 px targets, nothing over the middle of the map, the phone height budget (section 6.3), and the Motion setting.

| Element | Look |
|---|---|
| Sheets, dock, panel, rail | Papyrus tones (the parchment colours, warmed slightly, with a faint fibre texture drawn in CSS), dark ink text |
| The frieze | A thin banded edge, a repeating band of **lapis, gold, terracotta and turquoise** blocks, along the top bar's lower edge and each sheet's head; at most 4 px and drawn inside the existing heights, so no row grows |
| Headings | Sheet and section titles in a **cartouche**: a rounded-end outline in soft ink with a short bar at its end, in a **serif display face from the system's fonts** (Palatino Linotype, Palatino, Book Antiqua, Georgia, serif); body text stays the system sans at 16 px |
| Primary buttons | **Gold on lapis** (light gold text on deep lapis, about 8:1) for the one main action of a sheet or bar (✓, Start building, Pay, Enlarge); other buttons stay papyrus with an ink outline |
| Glyphs | Small decorative signs (an ankh, the eye, a lotus, a scarab) used sparingly: at most one in a sheet's head and one on the title card, hidden from screen readers, never in place of a word or an icon that means something |
| Category tints | Unchanged (they carry meaning: section 6.3) |

- Nothing is downloaded for it: no images or fonts, only CSS and inline SVG.
- Nothing in it moves, so it is the same under every Motion level.
- Before and after screenshots at the four sizes and at 150% text, and a contrast check of every text style on its new background, come with the change; the picture cards (section 4.1) are made again after it.

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
  assets/tutorial/            the picture cards' pictures and cards.json (made by tools/tutorial.ps1)
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
      overlays.js  effects.js  fire.js  units.js  ambient.js  monuments.js
      art/  terrain.js  housing.js  services.js  industry.js  defence.js
            monuments.js  plaza.js  figures.js  decor.js
    ui/                       DOM interface and input
      layout.js  hud.js  dock.js  sidePanel.js  rail.js  sheets.js  minimap.js
      input.js  gestures.js  keyboard.js  placement.js  modes.js  alerts.js
      toasts.js  menu.js  settings.js  titleCard.js  welcomeBack.js  goalsList.js
      danger.js  scoreUi.js  share.js  monumentSheet.js  tutorial.js
    audio/
      sfx.js  music.js
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
  - It is **deterministic**: all randomness (fire ignition, blaze and fire lengths, spread, raid timing, entry and size, price drift, map generation) comes from the seeded generator in `rng.js`, as stateless draws keyed by building id, day or raid index (`hash2`). Every fire, raider, soldier and wall state lives in the world, so saving and loading mid-raid changes nothing. Every monument site's state (courses done, progress in the course, stockpile, the carried fraction of work gold, the days without work, last month's work and gold) lives on its building, so saving and loading mid-course changes nothing either. Path and coverage caches live outside the world.
  - It **never reads the clock**. The weekly seed and each city's id come from the interface.
  - The UI changes the world only through **commands** (`place`, with a rotation where the building turns, `paintArea`, `demolish`, `drawLine`, `undo`, `setTradeOrder`, `setSpeed`…). Each one validates and either applies or returns a **reason code**, which the UI turns into the blocked-placement text. Stage 3 adds:

| Command | Does | Refuses with a reason when |
|---|---|---|
| `payTribute` | Pays the warned raid's tribute and cancels the raid | No warning is up; it is the first raid; raiders have arrived; it would take the treasury below 0 |
| `drawWall` | Draws wall tiles along a line (a gate where it crosses a road), charging per tile | Not yet Market town; water or a building in the way; it would take the treasury below −500 |
| `clearRubble` | Clears rubble tiles (one or an area), charging per tile; the Demolish tool calls it for rubble | No rubble there; it would take the treasury below −500 |
| `holdFestival` | Holds a festival at a working temple | Before Town; no working temple; within 12 months of the last; it would take the treasury below −500 |
| `sealReign` | Records a seal (the day and the score) in the world; the interface then writes the chronicle entry | Never (it can be repeated) |

  Stage 4 adds no new kind of command for monuments: a site is a building, so the existing commands carry it, with these additions.

| Command | Stage 4 change | Refuses with a reason when |
|---|---|---|
| `place(world, type, x, y, { rot, roadLater })` | `rot` is 0 (the footprint as the data draws it) or 1 (turned a quarter: `w` and `d` swapped); a type without `rotates` ignores it and stores 0. The building keeps `rot`. A monument is founded as a **site**: its founding is paid, and its courses, stockpile and work state start empty | As before (`roadLater` as in section 6.5), plus for a monument: a fertile tile in the footprint (`not_on_fields`); prestige not yet reached (`locked`, with the count in the words); founding would take the treasury below 0 (`no_gold`) |
| `canPlace`, `conditionsFor` (same options) | A monument's conditions are `ground`, `road`, `crew`, `supply` and `gold` (section 6.5); `crew` and `supply` are judged from the road tiles beside the footprint, and left out while there are none | — |
| `setPaused(world, id, paused)` | Pauses or resumes a site, as any building (section 4.16 Pausing); there is no separate pause for sites | As before, plus a finished monument (there is nothing to pause) |
| `demolishAt`, `demolishTiles` | Demolishing a monument or site refunds a quarter of its founding; the interface asks first with the loss in words | As before |
| `undo` | A site's placing is undone only before any work is done on it | `work_begun` (the step is dropped, as an undo of a demolish that cannot go back already is) |
| `previewPlazaTiles`, `paintPlazaTiles(world, list)` | Paint plaza tiles from a list, skipping taken tiles, as plots do (section 6.5); one Undo step | Not yet City; nothing left to lay; it would take the treasury below −500 |
| `place` for the palace | As any building | A palace already stands (`one_only`) |
| `enlargePalace(world, id)` | Pays for the next style and starts its works (section 4.20); not undoable | Not the palace; works already under way; already the fifth style; the next style's milestone not reached; no road beside it; it would take the treasury below 0 |

  The rules the interface and the score read, in `sim/monuments.js` (no command; they never change the world):

| Function | Gives |
|---|---|
| `monumentDay(world, events)` | The daily step, run in the tick after production: crews to sites, deliveries counted, work laid and paid, courses and monuments finished, stalls counted. It pushes `course_done` `{ id, type, course, prestige }`, `monument_done` `{ id, type, prestige }` and `site_stalled` `{ id, type, reason }` events |
| `prestigeOf(world)`, `prestigeByKind(world)` | The city's prestige, and each kind's share, measured from the monuments standing (section 4.16) |
| `monumentMood(world)` | The mood term: +1 for every 70 prestige, at most +10 |
| `siteStatus(world, b)` | The site sheet's facts: course and progress, crews, each material on site and what reaches it, last month's work and gold, prestige so far, and the stall reason code (`no_road`, `paused`, `no_crew`, `crew_short`, `crew_burning`, `no_gold`, `waiting_gilding`, `waiting_capstone`, `no_stone`, `no_bricks`) or none |
| `crewsFor(world, b)` | The guilds whose crews work the site, and the most it takes |
| `paceOf(world, b)` | The game-days left at last month's pace, or null when last month did nothing or no month has passed |

  The month-end stats carry `stats.lastMonth.monuments` (work and gilding or capstone gold, for the summary's spending row), and the world records the prestige unlock days (section 4.14) and the two new splits (section 4.19).

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
- **World version 5** (Stage 4): the v4-to-v5 step adds the monument state (no sites, no prestige unlock days, the two new splits not reached), marks every month-end history row as score v1, and keeps every Stage 3 field. The device's settings move from Reduced motion and Ambient motion to Motion as section 5.4 says.
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
  - **Palace:** one per city; each style waits for its milestone and its price; the works take their days and hold the old style until they end; desirability and mood follow the style and need a road; it never burns, raiders ignore it, and it is not wealth.
  - **Picture cards:** they show once before the first city and again from How to play; Next, Back, swipe, dots, Skip, Esc and Back work; every card's picture and mark exist and are in the offline file list; the opening goals' words say the road and fertile-land rules.
  - **Music:** the same seed gives the same bars; the raid mood starts with a raid warning and ends after the raid; it stops when the page is hidden; Music off and the volume are kept; it never starts before the first tap.
  - **Interface look:** every text style keeps 4.5:1 on its new background, and the phone height budget still holds.
  - **Motion:** the old settings migrate to the right level; Gentle and Still each allow only what section 5.4 lists; the device's request moves "follow" between Full and Gentle.
  - **Fire:** no risk before Town; risk cut by coverage and staffing; seeded ignition above 100; a covered blaze put out in 1-2 days and an uncovered one growing into a fire; spread only to edge neighbours and never across a road; burned homes becoming empty plots and other buildings rubble; rubble clearing cost; the difficulty multiplier.
  - **Raids:** no raids on Peaceful; the 2-year grace and the 3-month warning; first-raid size 3; size fixed at the warning; the size table and adaptation; tribute price, hidden on the first raid, never below 0, cancels the raid.
  - **Defence:** a closed wall ring keeps raiders out until breached; towers on the ring hit raiders at the breach; gates pass road reach and stop raiders; one staffed tower beats the first raid; soldiers intercept within their radius and return; retreat at half; the report's numbers match what happened.
  - **Score and records:** each part's formula at its edges (Monuments at 0, 10, 700 and above 700 prestige); the difficulty factor; the score version; the seven splits; medals per difficulty (200, 300 and 400 of 500); the `t2` link round-trips and rejects a bad check, and a `t1` link still opens as older scoring; the score trend compares rows of one version only; records merge on import.
  - **Trade:** caravan caps, and the no-arbitrage data check.
  - **Monuments:**
    - each kind's time with its most crews and full supply matches section 4.16, and fewer crews take longer in proportion
    - a guild works the nearest unpaused, unfinished site in reach with room; a site takes no more than its kind's crews; pausing moves the crews and idles their guild
    - quarries and brickworks deliver to a site in reach first, then to a storehouse; a site draws from storehouses within 16 road tiles; they idle with no workers and no wages when no site needs their material, directly or through a storehouse
    - a course that needs two materials waits for either; the stockpile never holds more than its limit or than the courses still need
    - work gold is 5 a unit laid, exact over a month; no crew, founding, gilding or capstone takes the treasury below 0
    - prestige is measured from state: per kind the most advanced standing monument, half by courses (rounded down) and half on completion; a second of a kind adds none; demolishing takes it away; the pyramids' unlocks stay once reached
    - a site stalls after 3 days without work with the right reason for each missing piece (road, crew, gold, gilding, each material), and a paused site does not stall
    - monuments, sites and stockpiles never burn; raiders never target them; they do not count as wealth
    - a road-less site does nothing; undo refuses once work has begun; demolish refunds a quarter of the founding; a rotated mastaba keeps its swapped footprint through save and load
    - the same seed and commands give the same world with a monument under way, and a world saved and loaded mid-course is identical
    - every site-sheet row's words match the sim (`siteStatus`)
  - **Determinism:** the same seed gives the same map; the same seed and commands give the same world after N days, including a city that burns and is raided, and one saved and loaded mid-raid.
  - **Saving:** save then load gives an identical world; old versions migrate; a corrupt save falls back to the backup.
  - **Modes** (`ui/`): enter and exit transitions, and one mode at a time.
- **Long-run sanity test:** a scripted city simulated for 10 game-years, checking that there's no negative population or stock, no runaway treasury and no stuck supply chain, and that it runs within a time budget. From Stage 3 its script builds firehouses (and the capital run defences), and it asserts the balance band of section 4.11: at a steady tier-4 town, wages plus upkeep plus soldiers' pay are 60-70% of taxes. That band is unchanged in Stage 4.
- **The capital run** (the scripted city grown to Capital through the player's commands) gains a monument programme from Stage 4: at City a guild, a quarry and a small obelisk; at Great city a second guild, a brickworks with its clay pit, the colossus and the small mastaba; at Capital two more guilds, a third quarry and a second brickworks with its clay pit (with one, the small mastaba's brick courses take twice as long), the large mastaba, then the small pyramid once prestige reaches 100. It keeps its reserve rule (never spend below 400). It asserts:
  - every month-end treasury is 0 or above;
  - over the last 24 months, while four crews work, wages, upkeep, soldiers' pay and monument work are 60-70% of taxes;
  - the treasury at year 6 is at most 60,000;
  - unemployment while crews work averages at most 15% over the last 24 months, with no month end over 20% (ruling 301: two months at 17.4%, when every quarry idles between monuments, is real play);
  - the small obelisk, the colossus and the small mastaba are finished by year 6;
  - the household chains still meet their existing floors (monuments must not starve pottery or beer);
  - it still runs in under 5 s.
- **The phone height budget** (section 6.3) gains a **pyramid** placing scene: the great pyramid's ghost with the Ground legend and two chip rows, at 375×667 and 844×390 and at 100%, 125% and 150% text, within the table's limits.
- **Play-testing in the built-in browser** at:
  - iPhone portrait
  - iPhone landscape (compact rail)
  - tablet
  - laptop (side panel)

  It covers every mode in section 6.4, mouse and keyboard on the laptop size, and the first-session flow from the title card to the first goals.
- **Accessibility checks:** contrast on every text style, a colour-blind simulation of overlays and placement states, each Motion level (Full, Gentle and Still), keyboard-only play of the interface, and screen-reader labels.
- **Performance budget:** a smooth frame rate while panning and zooming a crowded 64×64 stress city on a mid-range phone, with terrain re-baking off the critical path; ambient life within 2 ms a frame and three monument sites within 1 ms a frame (section 5.7).
- **Screenshots** for every visual review are taken under Full and under Gentle motion (section 5.4).
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
4. **Monuments and a grander city:**
   - the seven monuments rising course by course: blocks, ramp, sleds and work gangs, casing, the gilded tip and the gold capstone, with the times of 4.16 (a minute and a half for the small obelisk, 90 minutes at 1× for the great pyramid with four crews)
   - the builders' guild, quarry and brickworks; crews; stone and bricks delivered to sites and bridged by storehouses; idling with no wages; Memphis's stone (4.10, 4.15, 4.16)
   - monuments as the late-game gold sink: founding, work gold, gilding and capstone, never below 0, the Monuments spending row, and the capital run's band (4.11, 9)
   - prestige measured from state, the pyramids' prestige unlocks, the mood term (4.9, 4.14, 4.16)
   - score v2 with the Monuments part, medals at 200, 300 and 400, the two new splits, the `t2` link and version-aware history (4.19)
   - the Monuments tab, the honest site sheet, the guild, quarry and brickworks sheets, the summary's Monuments section and Welcome back's site lines (6.3, 4.17)
   - placing big footprints on phones: the camera fit at the pick, the Ground overlay's room, monument chips, rotation, seeing behind (6.5)
   - the Monuments goals, firsts, achievements, feats, daily goals, tips and remarks (4.19)
   - the grand city: festival and dedication processions, plazas and sphinxes, supply buildings with visible work, and a title backdrop with a monument going up (5.7)
   - the Motion setting (Full, Gentle, Still) in place of Reduced motion and Ambient motion, the Gentle tip, and ambient life a notch more visible (5.4, 5.6)
   - the picture cards before the first city and from How to play, made from dev scenes by a tool, and opening goals that say the road and fertile-land rules (4.1)
   - Egyptian-flavoured background music generated in the browser, with its raid mood and its own setting and volume (5.5)
   - the palace, enlarged through five styles (4.20)
   - the papyrus-and-lapis interface look (6.9)
   - problem markers pinned to their own buildings, with a ring on the footprint, no overlaps, a tap that selects, and View's outline (6.3)
   - world version 5 with its migration
   - **Out of Stage 4** (Stage 5 or later): missions, ruler requests and grave goods; progress while the game is closed; separate stonemasons', bricklayers' and carpenters' guilds and work camps; the sphinx, sun temple and mausoleum as monument kinds (the sphinx comes only as a 1×1 statue), bent pyramids, pyramid complexes and burial chambers; collapse and architects; plague, floods and river seasons; scribes; temple complexes, pleasure gardens, a quay and river trade, a day-night cycle; recorded music; choosing which guild works which site; global leaderboards and checked scores
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
