# Version 9.3, Track M rulings (1930-1934)

- **1930** A look change raises poles for one game day only on a building drawn within the last game day (`watchLooks`, from the frame's visible objects). A building first seen, or scrolled to days after its front passed, shows none. No dust puff on a look change. Cost if wrong: a fast pan right after a front passes may miss a pole; a stricter rule would watch every building each frame.
- **1931** The sweep is one gold ring (a soft halo and a thin line) from `lookCentre` out to the farthest building (at least 6 tiles, plus 2) over 3 s, eased out, faded in and out smoothly. Cost if wrong: on a zoomed-in view the ring leaves the screen in about a second.
- **1932** Only Full motion sweeps (Gentle and Still skip it), and only for a rank that brings a new look (Town, City, Capital). Cost if wrong: a Gentle player gets the caption line but no ring.
- **1933** The sweep is shed before the 9.0 dropper sheds anything: it is not drawn while the effects' running average is over a quarter of their 2 ms budget. This avoids touching `AMBIENT.v90DropOrder` (older tests pin it). Cost if wrong: a slow phone never sees the ring.
- **1934** The rank-up caption's `why` is `M93_TEXT.rebuilds` for a rank that brings a new look. Cost if wrong: none beyond the wording.

Files touched outside ownership (one line each): `src/render/effects.js` (milestone event notes the sweep), `src/render/v90/effects.js` (draws it), `src/render/renderer.js` (watches looks, passes the range to `scaffoldsAt`), `src/ui/createUI.js` (the caption's why), `tests/v93/all.js` (one line).
