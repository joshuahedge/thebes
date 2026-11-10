# Thebes 9.3, the visual half: "A city that grows" (design, for Josh's review)

**Josh's ask (10 Nov 2026):** "think through how we can improve the graphics and visuals further. As part of this, consider how the buildings can change as the town grows and levels up." His answers, in the order asked:

1. **What drives the change:** the city's rank. At set ranks the whole city's materials step up.
2. **Also in this release:**
   - the streets grow too;
   - variety in homes;
   - working vs idle;
   - the level-up moment.
3. **How a new look arrives:** a gradual rebuild, from the centre outward over a few game months.
4. **Where it ships:** folded into the weekly decree, so it is the visual half of **9.3**. The decree keeps its own design (`specs/2026-10-27-thebes-v9-roadmap-design.md` section 5), and the 9.3 plan joins the two.
5. **The approach:** A. One drawing per building takes the era: the materials come from a shared table, and about eight landmarks also change shape.
6. **Sections 1 to 3:** as presented.
7. **Section 4:** "I don't mind going above 16Mb". The caches are raised by measurement (section 5).

## 1. What is true today (checked in the code at 853310a)

- **How buildings are drawn:**
  - Every building is drawn in code with canvas paths. There are no sprite images: the registry's `png:` hook is unused.
  - `slotFor(b, world)` (`src/render/art/registry.js:40-56`) picks a drawing per state. Each slot is drawn once per zoom bucket (0.5, 0.75, 1, 1.5, 2) and DPR into an LRU sprite cache. Its cap is `SPRITE_BUDGET_BYTES`, 16 MB (`src/render/spriteCache.js:38`).
  - Terrain, roads and plots are baked into 16x16-tile chunks. The terrain cap is 48 MB, and terrain and sprites together are capped at 64 MB (`src/render/terrainBaker.js:469-472`).
- **What already changes:**
  - Homes have 9 tiers, and all homes of a tier look identical.
  - Farm stages and seasons.
  - Fill levels for the granary, storehouse and bazaar.
  - Idle drawings for the builders' guild, quarry and brickworks only.
  - Five bought palace styles.
  - Monuments rising course by course.
  - Scaffolds for one game day (`src/render/v90/scaffold.js`, at most 8 sites).
  - Night lights and lamps.
- **Rank:** nothing in `src/render` reads it. A Capital's roads, ground, services and workshops look like a Village's.
- **Roads:** there is one road kind. Track V gave it a kerb shadow and a cart track in 9.2.
- **Far zoom:** there is no building LOD; the sprite is simply scaled down.
- **Rank days:** the world keeps the day each rank was first reached (`world.splits[id]`, `src/sim/progression.js:33`), and a rank never falls (`updateMilestone` only rises).

## 2. The four looks

The eight ranks fold into four looks:

| Look | Ranks | Walls and roofs | Streets | Extras |
|---|---|---|---|---|
| **Village** | Village | mud brick, reed and thatch roofs | dirt tracks (today's roads) | today's art, unchanged |
| **Town** | Town, Market town | whitewash over mud, painted door frames | gravel with a firm edge | reed awnings, pots and benches by doors |
| **City** | City, Great City | whitewash with painted bands (ochre, blue) | stone kerbs; paved where a road runs between buildings | street trees and lamps along built-up roads, timber balconies |
| **Capital** | Capital, Great Capital, Seat | dressed limestone, coloured cornices | paved avenues | palms and lamps in rows, small colonnades and porches, gilded caps on landmarks |

- **The look sets the materials, the tier sets the shape.** A home's tier still decides its shape and size. A tier-2 home in a Capital is a small stone house.
- **Materials come from a shared table** keyed by look. It is built from the existing palette (`src/render/art/palette.js`: MUD, WASH, STONE, SST, GOLDC, THATCH) and keeps the house style: warm lit faces against cool lavender shade, and colour that shows use. Shared add-ons (awning, cornice, band, porch, gilded cap) are new primitives beside `box`, `tb`, `win` and `parapet`.
- **Landmarks change shape as well as material,** at City and again at Capital:
  - the granary;
  - the bazaar (stalls, then a covered market, then a colonnaded one);
  - the temple;
  - the kiln, the brickworks and the weaver;
  - the water supply;
  - the firehouse.
- **Unchanged:**
  - the palace's five styles (the player buys those);
  - the monuments, farms, the river, ferries and boats.

## 3. The rebuild and the level-up moment

- **Where the front starts:** at the palace's tile if one stands, or the centroid of the built-up area if not. It is memoised on the buildings' version.
- **When each building changes:** a new look reaches a building at `rankDay + 4 months × (d / dMax)`:
  - `rankDay` is `world.splits` for the look's first rank;
  - `d` is the building's distance from the centre;
  - `dMax` is the farthest building's distance.
  - So the farthest building changes 4 game months after the rank-up.
- **The rule:** a building shows the newest look that has reached it. `lookOf(world, b)` is a pure function of the world, so it is the same after a reload.
- **Pausing and new buildings:** the rebuild runs on game days, so a paused city does not change. A building placed after the rank-up starts in the current look.
- **Roads:** each road tile follows the same rule by its own distance, so streets pave outward with the buildings. A road chunk's bake signature gains the looks of its tiles, and it re-bakes when the front crosses it, within the existing two bakes a frame.
- **Scaffolds:** a building that switches shows the existing scaffold for one game day. On-screen sites go first when more than 8 switch at once.
- **The moment:** the existing rank-up notice gains one line, "The city rebuilds in the new style over the next months." A soft gold ring sweeps once from the centre to the edge, over about 3 s:
  - the camera stays where the player put it;
  - nothing flashes;
  - the ring is skipped when motion is reduced;
  - it runs inside the 9.0 effects' 2 ms budget and is the first thing shed.
- **Saves:** there is no save change, and `WORLD_VERSION` stays 12.
  - A city loaded from 9.2 or earlier opens fully rebuilt in its rank's look.
  - A rank with no recorded day (a city from before Stage 3) counts as fully rebuilt.
  - An heir's city starts in the Village look like any new city, and the lesson city follows the same rules.

## 4. Variety in homes, and working vs idle

- **Homes:** every tier gets three variants in every look, chosen by a hash of the house's tile, so the same house always looks the same.
  - **What differs:** the door's face and place, the window pattern, and the roof clutter (water jars, drying linen, a dovecote from tier 3, a small palm in the yard).
  - **No mirroring:** it would put the lit face on the wrong side.
- **Services and workshops** (not homes) are drawn in three states. The sim already knows the staffing.
  - **Working:** an open door on a warm-lit doorway with a figure at it, and goods in a workshop's yard (pots by the kiln, bales by the weaver, bricks by the brickworks).
  - **Short of workers:** as working, with an empty yard.
  - **No workers or paused:** a shut plank door, closed shutters, no smoke, an empty yard.
  - **Told apart by shape** (the door, the shutters), not colour alone. The existing markers still say why.
  - **Cost:** a state change swaps to another cached drawing, so it costs nothing per frame. It extends the `.idle` slots the builders' guild, quarry and brickworks already have.

## 5. Performance

- **Far zoom (0.6 and under):** homes draw one plain drawing per tier and look, with no variants and no clutter. This is the first building LOD, and it also reads better at that distance.
- **Caches (Josh: above 16 MB is fine):**
  - The sprite cap is raised by measurement on the stress city in the Capital look and mid-rebuild.
  - **Proposed:** 32 MB on a desktop and 24 MB on a phone (by the device's memory where the browser reports it, else by screen width). The terrain-plus-sprite cap rises with it, so terrain is not starved.
  - The final numbers are rulings with their measurements.
  - The real-phone list gains: "does the tab reload on a Capital mid-rebuild?" (9.1 cut the caches for exactly that).
- **Street details** (trees, lamps, paving) are baked into the road chunks: no cost per frame.
- **Frame bounds:** none is loosened. The stress city (`tests/render/stress.test.js`) and the 112 map (`tests/v90/v/budget.test.js`) are measured again in the Capital look and mid-rebuild.

## 6. Testing

- **`lookOf`:**
  - by distance and by day, with the world set up both ways;
  - a paused city does not change;
  - a new building starts current;
  - older saves and a city with no recorded rank day open fully rebuilt;
  - an heir starts in the Village look.
- **Art contract:**
  - every building type has a drawing for each of the four looks;
  - every service and workshop has all three states;
  - each drawing stays inside its declared bounds (the existing art contract tests' pattern);
  - every home tier has three variants, and the far-zoom drawing is used at 0.6 and under.
- **Roads:** a chunk's signature changes when the front crosses it, and paving and trees appear only in the City and Capital looks.
- **The moment:** the notice line, one sweep, none under reduced motion, and the sweep shed first over budget.
- **Screenshots:**
  - each look at 390x844 and 1280x800, at 100% and 150% text;
  - a city mid-rebuild;
  - the far zoom;
  - a working and a shut workshop side by side.
  - Before and after, named `v93-<track>-<what>-<WxH>-t<text>.png`.
- **The final review** (Opus, as in 9.2) grades the look on a phone and a desktop.

## 7. What does not change

- **Game rules:** the sim, the balance, footprints, costs and the save format (`WORLD_VERSION` 12).
- **Art:** the palace's five styles, the monuments, farms, the river and the interface.
- **Standing rules:**
  - no colour-blind patterns, tests or settings;
  - "Pharaoh" in no game text;
  - the sim stays deterministic.
- **Where the code lives:** `lookOf` lives in `src/render` (or a pure helper it imports) and reads the world; the sim never reads it.

## 8. Open questions for the 9.3 plan

- **Q1. Track split.** A first guess:
  - one track for `lookOf`, the materials table and the primitives;
  - one for homes (looks, variants, far-zoom);
  - one for services and workshops (looks, states, landmarks);
  - one for streets and the moment.
  - They join the decree's tracks in one plan.
- **Q2. Art review.** The 9.2 reviews worked from screenshots. For new art at this scale, an early "look sheet" screenshot of every building in all four looks, for Josh to approve before the tracks draw the rest, may save a round.
- **Q3. The cap numbers,** after measurement (section 5).
