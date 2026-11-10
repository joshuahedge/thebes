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
6. **The looks, the rebuild, variety and working vs idle:** as presented.
7. **The performance section:** "I don't mind going above 16Mb". The caches are raised by measurement (section 7).
8. **Changes after the first draft:** "Can we do some more blending between tiles and make the existing sprites and visual assets better too?"
   - This adds blending (section 5) and a quality pass over all existing art (section 6).
   - The art target is a **richer flat style**: today's clean illustrated look with more depth, not a painterly or textured one.

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
- **No looks:** these do not change with rank, but every one gets section 6's quality pass:
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

## 5. Blending between tiles

**Today:**
- The edges of the green band, the floodplain soil, the rock belts and the river banks step along tile diagonals (`src/render/grass.js`, `terrainWater.js`, the ground masks in `terrainBaker.js`).
- Buildings stand straight on the sand, with no ground of their own.

**Terrain edges:**
- Every edge between two grounds is drawn as a soft, uneven curve, worked out below tile size from a fixed noise (seeded by the map, so the same map always looks the same). The staircase goes.
- A thin band of transition detail runs along each edge:
  - tufts at a grass edge;
  - a wet-sand strip and reeds at the water;
  - pebbles where rock meets sand.

**Buildings in the ground:**
- **The yard:** every building gets a trodden yard, a patch of packed earth a little larger than its footprint, blended into the terrain.
- **The path:** a worn path runs from the yard to the nearest road tile.
- **Blocks:** neighbouring homes share their trodden ground, so a block reads as one neighbourhood.
- **Contact shadow:** a soft shadow sits where the walls meet the ground.
- **By look:** packed earth in the Village look, swept and edged in the Town look, part-paved in the City look, a paved court in the Capital look.

**Road edges:** in the Village look roads fray into the sand with wheel dust; the later looks give them section 2's kerbs.

**Cost:**
- All of this is baked into the terrain chunks, so it costs nothing per frame.
- A chunk's signature gains its buildings' footprints and looks. It re-bakes when a building is placed or removed, or when the rebuild front crosses it; both already trigger bakes, within the existing two a frame.

**Not blended:** the river's flow, the flood's water and the night tint stay as drawn today; they are their own layers.

## 6. The quality pass over existing art

- **Every building drawing is redrawn once, at a richer flat bar,** in the same pass that gives it the four looks (section 2). The bar:
  - **Walls:** a soft shade from the top of the wall toward its base, and a dark contact line where the wall meets the ground.
  - **Doors and windows:** set in, with an inner shadow and a lintel.
  - **Silhouettes:** roofs gain parapets, steps and clutter (jars, linen, dovecotes) so the shapes stop being plain boxes.
  - **Outlines:** heavier on the silhouette, lighter inside (today it is one 0.6 px outline at 32%, `src/render/art/palette.js:31-33`).
  - **Style:** today's palette and flat illustrated style: warm lit faces against cool lavender shade. No textures, no painterly edges.
- **Art with no looks gets the same pass:**
  - the palace's five styles and the monuments;
  - farms, trees, palms, rocks and reeds;
  - the figures and animals, boats and ferries;
  - the river's banks.
- **The look sheet comes first.** Before the tracks draw the rest, one sheet shows a home of each tier, three landmarks, a tree and a figure, before and after, in all four looks. Josh approves it, and it sets the bar every track draws to.
- **New primitives:** the shared helpers in `src/render/art/primitives.js` gain the shade, the contact line, the inset opening and the parapet steps, so each drawing reaches the bar through them rather than by hand.

## 7. Performance

- **Far zoom (0.6 and under):** homes draw one plain drawing per tier and look, with no variants and no clutter. This is the first building LOD, and it also reads better at that distance.
- **Caches (Josh: above 16 MB is fine):**
  - The sprite cap is raised by measurement on the stress city in the Capital look and mid-rebuild.
  - **Proposed:** 32 MB on a desktop and 24 MB on a phone (by the device's memory where the browser reports it, else by screen width). The terrain-plus-sprite cap rises with it, so terrain is not starved.
  - The final numbers are rulings with their measurements.
  - The real-phone list gains: "does the tab reload on a Capital mid-rebuild?" (9.1 cut the caches for exactly that).
- **Street details** (trees, lamps, paving) are baked into the road chunks: no cost per frame.
- **Blending and the quality pass:**
  - The soft edges, yards, paths and contact shadows are baked into the terrain chunks.
  - The richer drawings are cached like today's, so the per-frame cost is unchanged.
  - Bake time per chunk rises; it is measured, and the two-a-frame limit holds.
- **Frame bounds:** none is loosened. The stress city (`tests/render/stress.test.js`) and the 112 map (`tests/v90/v/budget.test.js`) are measured again in the Capital look and mid-rebuild.

## 8. Testing

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
- **Blending:**
  - the same map draws the same edges twice (the noise is seeded);
  - no edge pixel follows a whole tile diagonal for more than one tile;
  - a building's yard and path appear on placing and go on removal (the chunk re-bakes);
  - neighbouring homes share one trodden patch.
- **Quality pass:** every drawing uses the new primitives (shade, contact line, inset opening). A contract test lists any building or asset drawing that does not, and must be empty.
- **The moment:** the notice line, one sweep, none under reduced motion, and the sweep shed first over budget.
- **Screenshots:**
  - each look at 390x844 and 1280x800, at 100% and 150% text;
  - a city mid-rebuild;
  - the far zoom;
  - a working and a shut workshop side by side.
  - Before and after, named `v93-<track>-<what>-<WxH>-t<text>.png`.
- **The final review** (Opus, as in 9.2) grades the look on a phone and a desktop.

## 9. What does not change

- **Game rules:** the sim, the balance, footprints, costs and the save format (`WORLD_VERSION` 12).
- **Art:** the interface; the palace's five styles, the monuments, farms and the river get no looks (section 6's quality pass still covers them).
- **Standing rules:**
  - no colour-blind patterns, tests or settings;
  - "Pharaoh" in no game text;
  - the sim stays deterministic.
- **Where the code lives:** `lookOf` lives in `src/render` (or a pure helper it imports) and reads the world; the sim never reads it.

## 10. Open questions for the 9.3 plan

- **Q1. Track split.** A first guess:
  - wave 0 builds `lookOf`, the materials table, the new primitives and the look sheet, then stops for Josh's approval;
  - then tracks for:
    - homes (looks, variants, far-zoom);
    - services and workshops (looks, states, landmarks);
    - streets, yards and terrain edges;
    - the other art's quality pass (palace, monuments, farms, nature, figures);
    - the moment.
  - They join the decree's tracks in one plan.
- **Q2. The cap numbers,** after measurement (section 7).
