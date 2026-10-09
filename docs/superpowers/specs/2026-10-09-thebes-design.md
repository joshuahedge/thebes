# Thebes: design spec

**Date:** 2026-10-09
**Status:** Approved in brainstorming, awaiting written-spec review
**Owner:** Joshua Hedge (personal project, not work)

## 1. Summary

Thebes is a city builder for mobile web browsers, inspired by Sierra/Impressions' *Pharaoh* (1999).
It aims to be simple to pick up, with real depth: lay out roads and housing, keep people supplied
with water, food, faith, goods and entertainment, and watch homes climb a nine-tier ladder from
mud hut to grand estate. Production chains, trade, raids with automatic defence, and multi-year
monuments (obelisks, mastabas, pyramids) give the city long-term goals.

It is a plain web page that installs to a phone's home screen, works offline, and saves on the
device. People play it from one link: `https://joshuahedge.github.io/thebes/`.

## 2. Decisions taken in brainstorming

| Topic | Decision |
|---|---|
| Persistence | **Save and resume.** The city is saved on the device and is frozen while the game is closed. No offline progress, no server. |
| Structure | **Endless city with unlocks first**, then a **mission campaign** later. Missions are data on top of the same engine. |
| Challenge | **City troubles plus automatic defence.** Raiders arrive; walls, towers and soldiers fight on their own. No direct unit control. |
| Core systems | Housing upgrades, production chains, trade. River flooding is deferred. |
| Service coverage | **Reach along roads** decides coverage. **Walkers are drawn for looks only.** |
| Theme and art | Ancient Egypt in an isometric view in the style of Pharaoh, **drawn in code, fully original**. No Pharaoh assets. |
| Phone layout | **Portrait, build dock at the bottom**, with collapsible states (see section 6). |
| Extra depth | Nine housing tiers with beer, linen and jewellery; monuments of several sizes. |
| Hosting | **Public repo `joshuahedge/thebes` + GitHub Pages.** |
| Separation | Personal GitHub account, personal commit identity, no work org, not a Claude artifact. |

## 3. Goals and non-goals

**Goals**
- Fun in five-minute phone sessions as well as longer ones.
- Depth from a few interlocking systems, not from a huge building list.
- One shareable link, no installs, no accounts, no ads, no tracking.
- Smooth on a mid-range phone with a full 64×64 city.
- Saves that survive updates and don't get lost.

**Non-goals for the first version** (each may come later)
- Mission campaign (stage 5, its own spec).
- River flooding seasons, disease and healers, crime, extra foods beyond grain and figs.
- Multiplayer, cloud saves, playing one city across several devices.
- Direct control of soldiers.
- Real-time progress while the game is closed.

## 4. Gameplay

### 4.1 Core loop

1. Lay roads and housing plots. People move into plots that touch a road.
2. Houses upgrade one tier at a time as each need is met. Unmet needs make them downgrade, and some residents leave.
3. Bigger houses hold more people and pay more tax.
4. Population milestones unlock new buildings. Money pays for production, services, defence and monuments.

### 4.2 Time

- The simulation advances one **game-day** per tick. There are 30 days to a month and 12 months to a year.
- Speeds are pause, 1×, 2× and 3×. At 1×, a month is 20 seconds and a year is 4 minutes.
- Economy steps (taxes, wages, consumption, upkeep, immigration) run monthly. Fire risk, production and movement run daily.
- When raiders appear, the game drops back to 1×.

### 4.3 Map

- Each endless city gets a **64×64 tile map generated from a seed**. The same seed always gives the same map.
- Terrain types are river (impassable water), riverbank, **fertile land** (needed for farms) near the river, plain desert, **rocky ground** (needed for the quarry and gem mine), and scrub and rocks as decoration.
- Each map has one or two **raider entry points** on its edges and one **trade entry point** on an edge road.
- Generation guarantees enough fertile land, at least one patch of rocky ground, and a buildable connected area.

### 4.4 Roads and reach

- Roads are drawn by dragging. Buildings work only if they touch a road.
- **Reach**: a service building covers every tile reachable within its reach distance by walking along connected roads, starting from the road tiles next to it. A house is covered if any road tile next to it is covered.
- Tapping a building shows its reach as highlighted roads and homes. The same highlight previews while placing.
- Walkers (priests, water carriers, porters, carts) move along roads inside the building's reach for atmosphere only. They never affect the simulation.

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

### 4.5 Housing ladder

| Tier | Name | Size | Needs (cumulative) | Starting max residents |
|---|---|---|---|---|
| 1 | Hut | 1×1 | Road access | 5 |
| 2 | Shack | 1×1 | Water | 8 |
| 3 | Cottage | 1×1 | Food | 12 |
| 4 | House | 1×1 | Temple | 16 |
| 5 | Townhouse | 1×1 | Pottery | 22 |
| 6 | Manor | 2×2 | Entertainment, desirability ≥ 20 | 60 |
| 7 | Fine manor | 2×2 | Beer, two kinds of food, desirability ≥ 35 | 75 |
| 8 | Villa | 2×2 | Linen, desirability ≥ 50 | 90 |
| 9 | Estate | 2×2 | Jewellery, desirability ≥ 65 | 110 |

- **Upgrading** is checked monthly. A house rises one tier when all needs for that tier have been met for a full month.
- **Downgrading** happens when a need has been unmet for two months in a row. Residents above the new maximum leave.
- **Merging to 2×2**: a tier-5 house becomes a Manor only if the three plots next to it (forming a 2×2 square) are housing plots at tier 5 or higher, or housing plots with no residents yet. If more than one 2×2 square qualifies, a fixed order (north-west square first, clockwise) picks one, so the result is deterministic. The merged house takes the combined residents, capped at the Manor maximum.
- **Splitting back**: a 2×2 house that drops below tier 6 splits into four tier-5 plots, with residents shared out evenly.
- Each tier has its own code-drawn look. Higher tiers get grander, with whitewash, then painted trim, columns, courtyards, a pool and statues.
- Tax per resident per month rises with tier (starting values: 1, 1, 2, 2, 3, 4, 5, 6, 8).

### 4.6 Desirability

- Every tile has a desirability score from nearby buildings, falling off with distance.
- **Positive sources:** gardens, statues, temples, monuments.
- **Negative sources:** workshops, clay pits, quarries, brickworks, barracks.
- Tiers 6 to 9 need minimum desirability (see the table in 4.5). This is what makes monuments and beautification worth building.
- **Gardens** (1×1) and **statues** (1×1) are cheap buildings that need no workers.

### 4.7 Workers

- About 40% of residents are workers (tunable).
- Each workplace needs a set number of workers. Available workers are shared out proportionally across all workplaces.
- An understaffed building works at a proportionally lower rate. Below 25% staffing, it stops.
- **Unemployment** above 15% and **labour shortage** both show as alerts. High unemployment drives people out.

### 4.8 Goods and production chains

| Chain | Steps | Used by |
|---|---|---|
| Grain | Grain farm (fertile) → granary | Homes from tier 3 |
| Figs | Fig orchard (fertile) → granary | Homes from tier 7 (second food) |
| Pottery | Clay pit → potter → storehouse | Homes from tier 5, trade |
| Beer | Barley farm (fertile) → brewery → storehouse | Homes from tier 7, trade |
| Linen | Flax farm (fertile) → weaver → storehouse | Homes from tier 8, trade (high price) |
| Jewellery | Gem mine (rocky) → jeweller → storehouse | Homes from tier 9, trade (highest price) |
| Stone | Quarry (rocky) → storehouse | Monuments |
| Bricks | Clay pit → brickworks → storehouse | Monuments |

Rules:
- A producer makes output daily, scaled by staffing. Output goes to the nearest storage with space within producer reach (granary for food, storehouse for everything else). If there is none, production stops and a "No storage nearby" alert appears.
- A workshop takes its raw material from storage within its producer reach.
- A bazaar restocks monthly from storage within its supply reach, up to its capacity.
- Each month, a home takes what it needs from the covering bazaar it can reach most quickly that has stock. Consumption per resident per month is set per good in data.
- Food: a home counts as fed if its full monthly food need was met, from any mix of foods. "Two kinds of food" also needs both grain and figs to be among what it received that month.

### 4.9 Money

- **Income:** taxes (section 4.5), trade sales.
- **Spending:** building costs, monthly upkeep per building, wages per employed worker, soldiers' pay, trade purchases, monument work.
- The treasury can go into debt down to −500. Below that, nothing new can be built until it recovers.

### 4.10 Fire

- Fire risk only starts building up once the city reaches Town tier. The firehouse unlocks at Village tier, so it can be built ahead of time.
- After that, every building except roads, gardens and statues builds up fire risk daily. The rate depends on building type.
- Firehouse coverage resets risk to zero for the buildings it reaches.
- When risk reaches its threshold, the building catches fire. It burns for a few game-days, turns to rubble, and has a set chance of spreading to each neighbouring building.
- Rubble is cleared for a small cost.

### 4.11 Raids and defence

- Raids start once the city reaches Town tier (section 4.12). Size grows with the treasury and population.
- **Warning**: two game-months before a raid, an alert names the direction it will come from. The entry point gets a marker on the minimap.
- Raiders are real simulation units. They move by A* pathfinding across walkable ground and roads towards the most valuable buildings nearby.
- **Walls** block raiders and must be broken through. **Gates** let citizens through and stop raiders.
- **Towers**, built on walls, shoot arrows automatically at raiders within 4 tiles.
- **Barracks** train soldiers (up to a cap per barracks). Soldiers intercept raiders within a patrol radius automatically and return when the raid ends.
- Raiders that reach a building set it on fire and steal gold from the treasury.
- A raid ends when every raider is killed or has retreated (after losing half their number).
- Soldiers and raiders are drawn as figures. Fights resolve by simple strength and health rules held in data.

### 4.12 Progression

| Tier | Population | Unlocks (summary) |
|---|---|---|
| Village | 0 | Roads, housing, well, grain farm, granary, bazaar, temple, garden, firehouse |
| Town | 150 | Figs, clay pit, potter, storehouse, booth, statue, trading post (first partner), walls, gate, tower, barracks |
| City | 400 | Barley and brewery, flax and weaver, gem mine and jeweller, quarry, brickworks, builders' guild, small monuments, second trade partner |
| Prestige | Monument prestige points | Large obelisk, large mastaba, small pyramid, great pyramid |

- Locked buildings show in the build tray, greyed out with their unlock condition (for example "150 pop").
- Exact thresholds are tuned during the build. These are the starting values.

### 4.13 Trade

- The **trading post** is built next to the trade entry road.
- For each good, the player sets **buy / sell / ignore** and a **stock level to keep**. The post only sells what's above that level, and only buys up to it.
- Each open partner sends a caravan every three game-months with fixed buy and sell prices per good (in data).
- Partners unlock at Town (first) and City (second). Opening a route has a one-off cost.

### 4.14 Monuments

- Monuments are **long-term construction projects**. The player places the footprint, then it rises **layer by layer** as the builders' guild delivers stone and bricks from storage and supplies labour. Gold is spent as work happens.
- Work can be paused and resumed.
- Finished monuments give **desirability** around them and **prestige** points. Prestige unlocks larger monuments and, later, serves as mission goals.

| Monument | Footprint | Materials | Rough build time at 1× |
|---|---|---|---|
| Small obelisk | 1×1 | Stone | ~3 game-months (~1 min) |
| Large obelisk (gilded top) | 1×1 | Stone, extra gold | ~1 game-year (~4 min) |
| Small mastaba | 3×2 | Bricks, stone facing | ~15 game-years (~1 hour) |
| Large mastaba | 4×3 | Bricks, stone facing | ~25 game-years (~1 h 40) |
| Small pyramid | 4×4 | Stone | ~40 game-years (~2 h 40) |
| Great pyramid (gold capstone) | 7×7 | Stone, extra gold | ~100 game-years (~6–7 hours), the long-term goal |

These are build times with full materials and labour. Shortages slow them down.

### 4.15 Saving

- Saving is automatic every game-month and whenever the page is hidden (switching apps, locking the phone).
- There is **one city slot** plus the **previous autosave** as a backup.
- **Export / import**: the player can download the save as a `.json` file and load one back in.
- Starting a new city asks for confirmation and offers to export the current one first.

## 5. Art direction

- **An original, Pharaoh-inspired isometric style.** 2:1 diamond tiles, a warm sand and mudbrick palette, whitewashed homes, painted temple gateways (blue, red and gold bands), palms, a deep blue river, green and golden fields, and soft shadows cast to the right.
- **No Pharaoh assets, ever.** Pharaoh is owned by Activision and still sold. Its screenshots may be studied for reference only (proportions, palette, building types). Every pixel in Thebes is drawn by our own code.
- **Drawn in code.** Every building, tier, terrain tile and figure is drawn by a function from simple shapes: tapered blocks, faces with brick courses, domes, awnings, fronds. The mock-ups made in brainstorming are the baseline look.
- **Art slots.** Each visual is registered under a key (for example `house.t4`, `temple`, `monument.pyramid.small.stage12`). At run time, each key is drawn once into an off-screen image and reused. A key can later be pointed at a PNG instead, with no other code changes.
- Monuments are drawn per construction stage, so they visibly rise as work progresses.
- Overlay colours (blue = has it, coral = missing) are paired with a shape cue so they work for colour-blind players.

## 6. Interface (portrait, layout A)

### 6.1 Principles

- **Things you read sit at the top, things you tap sit at the bottom**, in thumb reach.
- **Nothing floats over the middle of the map.**
- **Only one panel is open at a time.** Opening one closes any other.
- Touch targets are at least 44 pt. Layouts respect the notch and the home-bar safe areas.
- Labels use sentence case and plain words.

### 6.2 Screen elements

- **Top bar**: gold, population, date and speed controls. Tapping it opens a **city summary sheet** with income against spending, food in store, unemployment and how happy people are.
- **Build dock** (bottom), one panel with three heights:
  1. **Slim bar** (default): category icons (Roads, Homes, Food, Industry, Services, Defence, Monuments). Labels appear when there is room.
  2. **Tray**: tapping a category or swiping up shows its buildings as cards with cost. Locked cards show their unlock condition. The tray scrolls sideways and remembers the last category.
  3. **Tucked away**: swiping down or starting to pan the map shrinks the dock to a single **Build** pill.
- **Bottom row when tucked away**: the overlay button (left), the Build pill (centre), and the minimap button (right). Alerts show as a red dot on the minimap button.
- **Overlays**: water, food, religion, goods, fire risk, desirability. While one is active, a slim legend strip attaches under the top bar with a close button. Homes show a has-it or missing marker.
- **Minimap sheet**: a bottom sheet with the whole map, the current view outlined and alert pins. Tapping the map jumps there. Below the map is the alert list with **View** buttons.
- **Building info sheet**: tapping a building opens a bottom sheet with its name, reach (highlighted on the map), staffing, stock, problems, and Pause and Demolish actions.

### 6.3 Placing things

- Choosing a building collapses the dock to a **confirm bar** (name, cost, preview of what it would reach, ✕ and ✓).
- A see-through version of the building follows the player's finger. The footprint shows green when valid and red when invalid, and the homes it would reach light up.
- **Nothing is built until ✓ is tapped.**
- Roads and walls are **dragged out as a line**, showing the total cost as the finger moves.
- **Undo**: for 5 seconds after any placement, an Undo toast gives a full refund.

### 6.4 Gestures

One finger pans, pinch zooms (0.5× to 2×), a tap selects, a long-press on a build card shows its details, and dragging places roads and walls.

## 7. Technical architecture

### 7.1 Platform

- Plain **HTML, CSS and JavaScript (ES modules)**. No build step, no frameworks, nothing to install.
- Drawn on an HTML **canvas**, sharp on high-resolution screens.
- Runs as an **installable, offline-capable web app** (PWA): a manifest, icons, and a service worker that caches all files. When a new version is cached, an "Update ready, tap to reload" toast appears.
- Target browsers: iOS Safari 16+, current Android Chrome, current desktop Chrome, Edge, Firefox and Safari.

### 7.2 Folder layout

```
thebes/
  index.html                  page shell and UI containers
  manifest.webmanifest        home-screen install data
  sw.js                       service worker (offline cache, updates)
  icons/                      app icons
  src/
    main.js                   start-up, game loop, wiring
    data/                     everything numeric or descriptive
      buildings.js  goods.js  housing.js  monuments.js  progression.js  trade.js  raids.js
    sim/                      game rules; no DOM, no canvas
      rng.js  world.js  mapgen.js  reach.js  housing.js  labour.js  production.js
      distribution.js  economy.js  desirability.js  fire.js  raids.js  combat.js
      pathfinding.js  trade.js  monuments.js  progression.js  clock.js  commands.js
    render/                   drawing only; reads sim state, never changes it
      iso.js  spriteCache.js  renderer.js  walkers.js  overlays.js
      art/  terrain.js  housing.js  services.js  industry.js  defence.js  monuments.js  figures.js
    ui/                       DOM interface and input
      hud.js  dock.js  sheets.js  minimap.js  input.js  placement.js  alerts.js  toasts.js
    save/
      store.js  migrate.js  exportImport.js
  tests/
    index.html                test runner page
    harness.js                tiny test helper (describe/it/expect)
    sim/*.test.js  save/*.test.js
  docs/superpowers/specs/     this spec
  README.md
```

### 7.3 Boundaries

- **`data/`** holds plain objects: costs, workers, reach, needs, consumption, prices, unlocks and art keys. Balancing means editing these. Missions will add data, not code.
- **`sim/`** owns the world state and the rules. It is **deterministic**: all randomness comes from a seeded generator in `rng.js`, and nothing reads the clock or `Math.random`. The UI changes the world only through **commands** (`place`, `demolish`, `drawRoad`, `setTradeOrder`, `pause`…), which check that they're valid and either apply or return a reason they can't.
- **`render/`** reads the world state and draws it. Cosmetic walkers live here, outside the simulation.
- **`ui/`** turns touches into commands and shows state. It never changes the world directly.
- **`save/`** turns the world into a versioned JSON document and back, and migrates older versions.

### 7.4 Game loop

- `requestAnimationFrame` drives drawing.
- The simulation runs on a **fixed timestep**: it advances whole game-days according to speed and elapsed time, catching up at most a capped number of days per frame. That way the rules behave the same on any device.
- Drawing covers only tiles inside the camera view, depth-sorted. Building and terrain images come from the sprite cache. Figures are drawn each frame.

### 7.5 Saves and storage

- Saves are stored in **IndexedDB**, with a `localStorage` fallback.
- **Safe writes:** the new save goes into a staging record, is checked, then replaces the current slot. The current slot first moves to the backup slot.
- **Loading:** if the current slot fails to read or validate, the game offers the backup.
- Every save holds a `version` number. `migrate.js` upgrades older saves step by step. Saves from a newer version than the game are refused politely instead of corrupted.
- **iOS 7-day storage limit:** Safari can delete the stored data of a website that isn't visited for 7 days, unless the site was added to the home screen. On iOS Safari outside home-screen mode, the game shows a one-time **"Add to Home Screen to keep your city safe"** guide, and export stays available.
- If storage fails (private browsing, full storage), a persistent banner warns that progress won't be saved.

## 8. Hosting, sharing and separation from work

- Repo: **`C:\dev\thebes`** (outside OneDrive), git branch `main`.
- Commit identity **for this repo only**: `Joshua Hedge <181878008+joshuahedge@users.noreply.github.com>`. The global identity (work email) is unchanged.
- Remote: **public** repo `joshuahedge/thebes` on the personal account, not the work organisation. It gets created when stage 1 is ready to publish.
- Hosting: **GitHub Pages** from `main` → `https://joshuahedge.github.io/thebes/`.
- Not hosted as a Claude artifact, because those belong to the work Claude account.
- Local running: Python's built-in web server (`python -m http.server`) from the repo folder, since browsers block ES modules opened straight from disk.

## 9. Testing and quality

- **Unit tests for `sim/` and `save/`**, run from `tests/index.html` in a browser. Required cases include:
  - Reach: coverage follows connected roads only and respects the distance.
  - Housing: upgrades after a full month of met needs, downgrades after two months unmet, and merges to 2×2 only when the three neighbouring plots qualify.
  - Production and distribution: no storage means no production; bazaars only restock from storage in reach; homes take from the reachable bazaar that has stock.
  - Labour: proportional sharing, slowdown when short-staffed, stop below 25%.
  - Determinism: the same seed gives the same map, and the same seed plus the same commands give the same world after N days.
  - Saving: save then load gives an identical world; old versions migrate; corrupt saves fall back to the backup.
  - Fire, raids, pathfinding, trade and monuments each get rule tests as their stage lands.
- **Long-run sanity test:** a scripted city simulated for 10 game-years at full speed. It asserts there's no negative population or stock, no runaway treasury, no stuck supply chain, and that run time stays under budget.
- **Play-test at phone size** in the built-in browser at an iPhone-sized viewport, checking every screen state in section 6.
- **Performance budget:** a smooth frame rate while panning and zooming a crowded 64×64 stress city on a mid-range phone.
- **Real-device check:** Joshua plays each stage on his phone before it's published.

## 10. Delivery stages

Each stage ends playable and shareable at the link, and each gets its own step-by-step implementation plan.

1. **Core city.** Map generation, camera and gestures, roads, housing tiers 1–4, well, grain farm, granary, bazaar, temple, workers, money, time controls, the full build dock (all three heights, placing, undo), info sheet, minimap sheet, overlays (water, food, religion), autosave with backup, export and import, the PWA install and the iOS guide, and the first GitHub Pages publish.
2. **Economy.** Figs, pottery, beer, linen and jewellery chains, storehouse, housing tiers 5–9 with 2×2 merging, desirability with gardens and statues, booth, trading post and partners, and the Town and City unlocks.
3. **Danger.** Fire with spreading, firehouse and rubble (the firehouse appears in the build tray from this stage on); raids with warnings; walls, gates, towers, barracks and soldiers; combat; alerts.
4. **Monuments.** Quarry, brickworks, builders' guild, staged construction of all six monuments, prestige and the prestige unlocks.
5. **Missions.** A separate spec: hand-made maps, starting conditions, limited building sets and goals, all as data.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Scope keeps growing | Fixed stages; anything new goes to a later stage unless it replaces something. |
| Slow on older phones | Sprite cache, drawing only what's on screen, fixed-timestep simulation, stress-city test from stage 1. |
| Saves lost on iPhone | Home-screen install guide, export and import, backup slot. |
| Balance feels off | All numbers in `data/`, long-run sanity test, quick tuning between stages. |
| Code-drawn art looks flat | Shading, brick courses, shadows and per-tier detail from the mock-ups; art slots allow upgrading to PNGs later. |
| Accidental copyright exposure | Original art only; Pharaoh used as visual reference, never as a source of files. The name "Pharaoh" isn't used in the game or the repo. |
