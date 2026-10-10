# Art reference (approved in brainstorming)

These are the SVG mock-ups Joshua approved on 9 Oct 2026. They're the baseline look for the game's code-drawn art (spec section 5). Open either file in a browser to see it.

- `v4-new-era-style.html`: the fourth art pass, in the style of Pharaoh: A New Era.
  - A city close-up, the nine-tier housing ladder, and the monuments.
  - Lighting: cool lavender shadows, smooth whitewash, stacked houses.
  - Details: rugs, mosaics, teal-painted columns and painted temple gateways, a seated colossus, a block-built pyramid.
  - **The drawing functions in its `<script>` are the source to port** to canvas in `src/render/art/`: `tb`, `box`, `qd`, `door`, `win`, `parapet`, `mat`, `rug`, `pots`, `fence`, `stairs`, `ladder`, `awn`, `col`, `bed`, `pool`, `statue`, `palmAt`, `acacia`, `reeds`, `rock`, `scrub`, `dune`, `tufts`, `grassTile`, `mosaic`, `checker`, `H1`–`H9`, `big`, `temple`, `obelisk`, `sphinx`, `colossus`, `granary`, `bazaar`, `well`, `gardenT`, `outcrop`, `felucca`, `skiff`, `fig`, `fieldTile` and `roadTile`.
- `blending-before-after.html`: terrain blending, with a toggle between hard tile edges and blended ground. Joshua chose blended ("blended is great").
  - The SVG uses `feTurbulence`/`feDisplacementMap` filters to wobble edges.
  - On canvas, get the same look with noise-perturbed masks (spec 5.2): grass and soil edges that wander and fade over about a third of a tile, tufts scattered across borders, roads stroked as continuous paths with round joins, a smooth riverbank curve with foam and reeds, and plots that fade into the ground.

## Conventions used in the mock-ups

- **Isometric projection:** `p(x, y) = [(x - y) * 16, (x + y) * 8]`, so a tile is 32×16 px at mock-up scale. The game draws at 64 px wide at default zoom (spec 5.3), which is 2× this scale.
- **Faces:** the `+y` face is lit (the left face on screen, using palette index 1). The `+x` face is in shade (the right face, index 2, a cool lavender-grey). Top faces use index 0.
- **Shading and outlines:** a face gradient goes from white at about 14% at the top to `#3A2E5A` at about 16% at the bottom. A dark line marks where each wall meets the ground. Outlines are `#5A4A6A` at 32% opacity, 0.6 px wide.
- **Ground shadows:** two layers of `#3E3260`, offset to the right by `h × 0.45` at 12% opacity and `h × 0.85` at 8%.
- **Drawing order:** objects are sorted by footprint-centre `x + y`, ascending.
