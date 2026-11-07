// Version 9.0, Track V (ruling 1602): the new effects' own frame budget, a second level beside ambient's (src/render/ambient.js). Each frame the
// effects add up what they spent (spend(ms), from the ground layer's wakes and flow as well as effectsV90's own layers), and effectsV90 accounts the
// total once, at its end. Over AMBIENT.v90BudgetMs on a running average, the next kind in AMBIENT.v90DropOrder goes (the river's flow, the weather,
// the dust, 9.0's workshop smoke, the festival's lamps and petals), at most one every LEVEL_HOLD_MS; one comes back only after RESTORE_AFTER_MS under
// half the budget, so nothing blinks in and out. A dropped effect never hides a sim fact: the alert row, the captions and the sheets say it all.
import { AMBIENT } from '../../data/ambient.js';

// ambient.js's hold and restore times (repeated here, as ambient.js imports this file)
export const V90_HOLD_MS = 2000;
export const V90_RESTORE_MS = 10000;

export function createDropper({ budgetMs = AMBIENT.v90BudgetMs, order = AMBIENT.v90DropOrder, holdMs = V90_HOLD_MS, restoreMs = V90_RESTORE_MS } = {}) {
  let level = 0, avg = null, lastChange = -Infinity, calmSince = null;
  const stats = { ms: 0, avg: 0, dropped: [], frames: 0 };
  return {
    stats,
    account(ms, now) {
      if (lastChange === -Infinity) lastChange = now;   // a cold first frame (caches warming) never drops a kind at once
      stats.ms = ms;
      stats.frames++;
      avg = avg === null ? ms : avg * 0.8 + ms * 0.2;
      if (avg > budgetMs) {
        calmSince = null;
        if (level < order.length && now - lastChange >= holdMs) { level++; lastChange = now; avg = budgetMs * 0.75; }
      } else if (avg < budgetMs / 2 && level > 0) {
        if (calmSince === null) calmSince = now;
        if (now - calmSince >= restoreMs && now - lastChange >= holdMs) { level--; lastChange = now; calmSince = now; }
      } else calmSince = null;
      stats.avg = avg;
      stats.dropped = order.slice(0, level);
    },
    off: (kind) => order.indexOf(kind) >= 0 && order.indexOf(kind) < level,
    reset() { level = 0; avg = null; lastChange = -Infinity; calmSince = null; stats.ms = 0; stats.avg = 0; stats.dropped = []; stats.frames = 0; },
  };
}

// The game's one dropper (the effects are module functions, as the battle's hooks are), and this frame's spending so far.
export const v90Dropper = createDropper();
// A dev switch for the before-and-after pictures (a screenshot's script imports this file and calls it; the game never does): 'all', or a list of
// kinds, to draw as 8.4 drew. The kinds beyond the drop order: 'walk', 'scaffold', 'moment', 'fire', 'wake'.
let forced = null;
export function forceV90Off(kinds = null) { forced = kinds; }
export const v90Off = (kind) => Boolean(forced && (forced === 'all' || forced.includes(kind))) || v90Dropper.off(kind);
let spent = 0, spentEver = 0;
export function spend(ms) { spent += ms; spentEver += ms; }
// V's spending so far, never reset: ambient reads it before and after its own layers to leave V's share out of its own budget (ruling 1638).
export const spentSoFar = () => spentEver;
export function takeSpent() { const s = spent; spent = 0; return s; }
export function resetV90Dropper() { v90Dropper.reset(); spent = 0; }
