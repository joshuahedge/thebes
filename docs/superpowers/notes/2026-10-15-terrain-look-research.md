# Terrain look research: green from water, rock as ridges (2026-10-15)

Feedback to answer: (1) green must hug the river and oases, never appear as random desert patches; (2) rocky ground and hills should read as distinct, continuous features, not a brown smudge and small pyramids.

## Sources, and how much they gave
Honest caveat: no developer art-direction post for Pharaoh, Zeus, Caesar III, Banished, Manor Lords or Timberborn turned up. The findings below mix what the sources do say with standard cartography and game-art practice, marked "(practice)".

- Pharaoh: A New Era mission editor guide, https://steamah.com/pharaoh-a-new-era-mission-editor-guide/ . Water tiles auto-generate grass on the ground around them; floodplain fertility is computed from distance to water (the editor even previews the Nile flood over it); meadow is a separate paint whose fertility is also computed; cliffs are brushed in 3x3 blocks with smooth transitions; rock comes in 2x2 and 3x3 block variants (plain rock for stone and gems, ore rock for copper and gold); dunes are non-buildable.
- Pharaoh: A New Era reviews (Shacknews, GamingTrend, LadiesGamers): map layouts are unchanged from 1999; the look is dusty browns and yellows, becoming more colourful as the city grows. This confirms desert-dominant maps where colour is concentrated in the settled strip.
- Nile valley geography (NASA Earth Observatory "Nile bend", https://science.nasa.gov/earth/earth-observatory/nile-bend-egypt-8770/, and floodplain-margin descriptions): farmland ends abruptly at the desert; cliffs/escarpments line the valley; dry wadis cut down from the plateau; the green strip narrows to almost nothing where cliffs meet the river.
- Caesar III map write-up, https://habr.com/en/articles/230829 : rock formations ringed by trees on green ground (a temperate setting; our desert version is the inverse: rock ringed by scree on sand).
- Mobius Digital, "Taking on Timber Hearth", https://www.mobiusdigitalgames.com/news/taking-on-timber-hearth : rounded low-poly rock gave visual noise; switching to hard-edged facets made cliffs and paths readable; simple rock sits in the background, detail marks points of interest.
- Fantastic Maps, "How to draw isometric cliffs", https://www.fantasticmaps.com/2012/04/how-to-draw-isometric-cliffs/ : ragged top contour, vertical faces of varied length, debris lines at the foot, soft blending at the top.
- Imhof / Swiss-style relief shading (Jenny & Hurni, https://mail.colororacle.org/berniejenny/pdf/2006_JennyHurni_SwissStyleShading.pdf ): one light direction, brighten the lit face and darken the other to separate the two sides of a ridge; nearer/higher features get higher contrast, far ones lower; rock drawn by ridges and crevices only, faces left plain.
- Anno 117 devblog, https://www.anno-union.com/devblog-island-creation-in-anno-117-pax-romana : ground texture is splatted from erosion-style generated maps rather than hand-painted, i.e. ground type follows a field (slope, wear), not scattered noise.

## Findings
**Green and water.** In both the Pharaoh editor and the real Nile, greenness is a function of distance to water, not independent noise. Edge of the green is sharp-ish (the real floodplain ends abruptly), not a 14-tile fade. Green narrows where cliffs press on the river. Oases are small, round, dense halos.

**Rock at a distance (practice, backed by Imhof/Mobius).** Rock reads when it is (a) a clearly different value from the ground, (b) long and continuous so it forms a landmark, (c) lit on top edge and dark at the toe, and (d) has few, big facets rather than many small ones. Blobs of a ground colour only 10% darker than sand read as stains.

## Recipe 1: green only from water
Use the existing moisture field (`moistureOf`, src/render/grass.js) as the single source of truth in the generator too.
- Delete the free noise meadow (mapgen.js line ~144, `meadowNoiseScale 9 / meadowThreshold 0.72`). Meadow is allowed only where moisture >= 0.35: roughly <= 8 tiles from the river, <= 3 tiles from an oasis pool (oasis halo radius 4 incl. fertile ring).
- Stray meadow elsewhere becomes scrub (sand with tufts, palm-free); palm groves must also satisfy moisture >= 0.30 (today 3-7 tiles from water is fine only if that holds).
- Reach: shrink `GRASS.river` from 14 to about 10 and make the faint outer tiers (0.06, 0.18) carry only scrub tint and dots, no green wash. Real green (tiers >= 0.30) stays within about 6-7 tiles of the river; the final edge uses the existing noise at +/-2 tiles, not +/-6, so the green/sand boundary reads as a line.
- Gradient order outward from water: shallows, bank, dark loam, saturated meadow, olive scrub, sand. Saturation, not hue, should fall off.
- Narrowing: where a rock belt (below) touches the river valley, cut the band to 1-2 tiles. This reproduces the Nile look and ties rock to the water story.

## Recipe 2: rocky ground as belts
Generation:
- Replace round rocky patches with 2-3 **rock belts** per map: a polyline following a noise-bent direction (preferably parallel-ish to the river, 14-30 tiles away, as the desert plateau does), 18-40 tiles long, 3-6 wide, width pulsing +/-1 by noise. Reuse the existing `rockTarget` budget (90-130 tiles on Normal) as belt area.
- Hills are the **spine** of a belt: the 2-5 highest stretches (4-10 tiles long, 2-3 wide), not separate clusters. Keep existing exclusions (water, start, entries, reachability check).
- Taper at both ends over 4-6 tiles: spine to plain rocky ground to scree (sparse rock-tinted tiles, 30% then 10% density) to sand. Mines/quarries keep sitting on plain rocky ground along the belt.

Drawing (relative to sand #EBD6A8):
- Rocky ground ~22-28% darker than sand with a slight cool/grey shift (today #D3B582 is only ~10% darker, same hue). Shadow side takes our lavender tint. Never as dark as hills.
- Three-value ladder along each belt: scree/edge (sand -12%), body (sand -25%), spine/hill (sand -40%, greyer).
- 1px lighter top edge on the NW-lit boundary of the belt, 2-3px darker toe shadow on the SE edge where it meets sand (cast onto sand in lavender), and a ragged debris line of 2-4px pebbles along the toe.
- Strata: 2-3 horizontal bands per tile run (alternate +/-6% value), only on faces; flat tops stay plain.
- Boulders: density 1 per 3 tiles in the body, 1 per 8 in the edge band, none beyond; sizes vary 3:1; fewer, larger, faceted (hard-edged), each with its own toe shadow.
- Phone-zoom rule: distinct from sand by value (about 25%), from fertile/clay by hue (clay is saturated terracotta, loam dark olive; rock is desaturated grey-beige). Test by desaturating the screenshot; the belt must still read.

## Recipe 3: hills as mesas and ridges
- Shape: elongated ridges 6-10 tiles by 2-3, or flat-topped mesas with 2-tile cliff faces; stepped (a lower terrace on one side) rather than a pyramid. Cut diagonal corners so the silhouette has 4-6 big facets.
- Height: ridge top about 2.5-3 house heights (a house is about 1 tile tall), mesa 1.5-2; so a belt spine overlooks the city without blocking roofs behind it more than 3 tiles back. Keep faces on the south/east (toward the viewer) so tall mounds do not hide buildings north-west.
- Face = 2 value steps (lit NW face -0, shaded SE face -15%) plus top plane at +8% with the highlight edge; toe shadow and scree skirt at the foot.
- Skirts: replace the uniform 1-2 tile skirt with scree whose width follows the belt taper.

## Order of work
1. Meadow gating + `GRASS` retune (small, fixes feedback 1 immediately). 2. Rock palette/edge drawing on current patches (cheap proof of the look). 3. Belt generator and hills-as-spines. 4. Mesa/ridge hill sprites.
