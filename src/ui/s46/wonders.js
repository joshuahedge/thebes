// Stage 4.6, the Wonders track's interface seam (Track 0 made it empty; the Wonders track owns this file). createUI makes it once a game
// with the seam context (src/ui/danger.js lists ctx) through src/ui/s46/index.js, and calls it only through the seam's shape
// (src/ui/s46/seam.js): its sheets, its rows on building, home and summary sheets, and the event, refresh and alert-action hooks.
import { seamBase } from './seam.js';

export function createWondersUi(ctx) {
  return { ...seamBase() };
}
