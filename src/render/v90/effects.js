// Version 9.0 "Dynasty" (wave 0 seam, ruling 1563; Track V owns src/render/v90/): the new animations and visual effects. renderFrame
// (src/render/renderer.js) calls effectsV90 once a frame, right after the effects pass and before the overlays, in art px with the art origin
// set: g is the frame's draw helper (makeDraw), view the canvas's CSS size, and opts renderFrame's own options with the frame's tile range and
// camera added ({ ...opts, range, cam }). Drawing only: it never writes the world. Wave 0's body draws nothing.
export function effectsV90(g, view, world, opts) {}
