# Thebes 7.1 "Rivers of the world": design

Josh's asks (23 Oct 2026, after 7.0 went live):
1. A further detailed review of 7.0 for bugs and minor improvements.
2. More variety in maps: different river placements, multiple rivers, wider estuaries. "Be more creative while ensuring the map is playable."
3. Where a river is too wide to bridge, ferries as an option.

The design below was sent to Josh in chat on 23 Oct. Usage is tight (his stop line is 99% of the weekly limit), so if budget runs short the order of cuts is: the cataract and lake-fed layouts first, then ferry extras. A half-working ferry never ships.

## Rules that do not move
- A saved city keeps its own terrain and mapVariant. No current game changes.
- The six existing layouts ('classic', 'east', 'middle', 'wide-bends', 'island', 'oasis') draw exactly as in 7.0 for the same seed and size. Fixtures, dev scenes, records, share links and the balance runs depend on them.
- Share links already carry the resolved layout (`&variant=`; classic omitted), so 'auto' may change what a fresh seed picks without breaking any link.
- The map is a function of (seed, size, layout) alone.

## Track M: new layouts (Opus; rulings 1020-1039)
Six new layouts, appended to MAP_VARIANTS. Each new layout also draws its own orientation from the seed: the river may enter from any edge and run east-west as well as north-south. Its width may vary along its length.
1. **delta**: the river fans out towards one edge into 2-3 mouths, 6-10 tiles wide, with sandbar islands and marshy fertile ground between the arms.
2. **confluence**: two rivers meet in a Y, and the start sits in the fork.
3. **twin**: the main river plus a second, smaller river across the map, never joining it.
4. **wide-nile**: a river 6-8 tiles wide down the whole map, too wide to bridge. Some of the stone, gems or fertile land worth having lies on the far bank.
5. **cataract**: the river narrows through a rocky gorge with a chain of small islands and rapids.
6. **lake-fed**: the river flows out of a large lake at one edge of the map.

'auto' (a new city with no layout chosen) draws from all twelve, weighted so the new ones come up about two times in three. If the title or new-city screen lists layouts by name, add the new names with one plain line each.

**Playability**, enforced by a test of 200 seeds per new layout at each map size:
- The start area, the trade road's entry and every raider entry lie on one connected piece of land, with no water crossing. Raids and the first caravan work as before.
- The resource guarantee (src/sim/resources.js) holds within reach of the start: 2 clay-pit fits, a gem-mine fit and 6 grain-farm fits.
- A Quay site exists on water that boats can reach from the map edge, so 7.0's river trade works.
- Water never covers more than a set share of the map (about 22%).
- The minimap and render handle every layout.

Words: How to play gets a short "Maps" note. Screenshots: one 390x844 overview (the map zoomed out) of each new layout.

## Track F: ferries (Sonnet; rulings 1040-1059)
- Bridges keep their rule: a straight run of water of at most MAP.bridgeMax (4) tiles.
- **A ferry is laid like a road.** The player drags from one bank straight across 5 to FERRY_MAX (12) tiles of water to the other bank, along a row or a column, with free dry land at each end. It builds a landing at each end, linked as one crossing. Each landing touches a road, or the drag continues into road.
- The ferry has a cost per crossing, plus upkeep and one ferryman a landing. Without its workers it does not run, and the landing's sheet says why.
- Walkers and carts treat a working crossing as a road link that takes as long as a few road tiles plus a wait. Raiders and armies never use it, and boats are not blocked by it.
- **Words:** the road tool's refusal for too-wide water now says "Too wide for a bridge (N tiles of water): lay a ferry". Its Show me picks the ferry tool. The ferry tool lives in the Roads tray. The landing's sheet says where it goes and how long the crossing takes. How to play gets a "Ferries" entry.
- **Render:** the landings, and the crossing as a dashed line over the water. A small boat moves on it under Full motion; under Gentle it sits at a landing.
- **Saves:** if a crossing needs state the world lacks, add it as world v11 with MIGRATIONS[10] and test that a v10 save loads.
- **Tests:** both ways for each rule (4 vs 5 tiles, 12 vs 13, bent, no land at the far end, no workers), a cart route that uses the ferry, and a raid path that ignores it.
- **Screenshots:** laying a ferry and a working crossing at 390x844 and 1280x800.

## Track R: review of the live 7.0 (Sonnet, read-only; then fix batches, rulings 1060-1079)
- A bug review of the 7.0 sim and UI, plus the deferred items in docs/superpowers/notes/2026-10-23-version-7-0-followups.md.
- Fixes ship in disjoint batches after M and F merge.

## Close (rulings 1080-1099)
- A short final review.
- "Version 7.1" in What's new, and APP_VERSION 7.1.
- Rulings Part 19 and a followups note.
- Then merge to main, run the full suite, and push. Josh gave the go on 23 Oct.
