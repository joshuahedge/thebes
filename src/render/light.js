// Version 7.0, Track S (rulings 930-959): day and night on a real-time loop of about six minutes (LIGHT in src/data/seasons.js), in the
// render layer only: never in the sim or the save (ruling 852); it holds while the game is paused; Still and the Settings switch "Day and
// night" off keep daylight. Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left full daylight; Track S owns
// this file (src/render/v70.js calls drawLight from createUI's frame).
//   lightAt(nowMs)   -> { phase, dark, lamps }: phase one of LIGHT_PHASES, dark the night tint's strength (0 daylight .. 1 the deepest the
//                       readability bar allows), lamps how lit the lamps are (0 .. 1). nowMs is the real clock (performance.now in the frame).
//   drawLight(g, world, range, frame, now, motion, settings)   after the sprites and before fire, units, effects and the overlays (so the
//                       marks a player reads are never dimmed): the tint and the lamps. frame is { ctx, W, H, ox, oy, dpr } (the canvas in
//                       device px, the art origin); the transform is the art origin's, as for the other layers.
export const lightAt = () => ({ phase: 'day', dark: 0, lamps: 0 });
export function drawLight() {}
