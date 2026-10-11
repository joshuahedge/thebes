// The idle nudge (early-game pass 3.5). After NUDGE_GLOW_MS of running play with no tool, sheet or dialog open, no
// meaningful action and no goal progress, Show me glows. NUDGE_LINE_MS later one "Next:" line appears. Then
// nothing more until the player acts or a goal moves. It is never a sound, a camera move or a panel. The state
// machine is pure: time comes from the injected clock, and paused or busy time never counts.
import { NUDGE_GLOW_MS, NUDGE_LINE_MS } from '../data/ui.js';
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { alertText, T } from './text.js';

export const NUDGE_MAX_STEP_MS = 1000;     // a stalled frame (a hidden tab, a long hitch) counts as one second at most

export function createNudge({ now = () => performance.now(), glowMs = NUDGE_GLOW_MS, lineMs = NUDGE_LINE_MS } = {}) {
  let idle = 0;              // ms of idle running play since the last action or progress
  let last = null;           // the previous tick's time
  let signature;             // the last goal-progress signature noted
  return {
    noteAction() { idle = 0; },
    noteProgress(sig) { if (sig !== signature) { signature = sig; idle = 0; } },
    tick({ running = false, busy = false } = {}) {
      const t = now();
      const dt = last === null ? 0 : Math.min(NUDGE_MAX_STEP_MS, Math.max(0, t - last));
      last = t;
      if (running && !busy) idle += dt;
      if (idle >= glowMs + lineMs) return 'line';
      if (idle >= glowMs) return 'glow';
      return 'none';
    },
  };
}

// What each alert's cheapest fix costs, for "an affordable fix". Alerts without an entry (a failing save) are skipped.
const FIX_COST = {
  no_road: () => ECONOMY.roadCost,
  no_storage: () => BUILDINGS.granary.cost,
  storage_full: () => BUILDINGS.granary.cost,
  bazaar_empty: () => BUILDINGS.granary.cost,
  understaffed: () => BUILDINGS.house.cost,
  labour_shortage: () => BUILDINGS.house.cost,
  unemployment: () => Math.min(BUILDINGS.farm_grain.cost, BUILDINGS.bazaar.cost),
  debt: () => -Infinity,   // getting out of debt costs nothing up front (pause what you don't need), so it is always worth naming, even in the red
};

// The nudge's one line: the first problem the treasury can pay to fix, else the open goal, else nothing.
export function nudgeLineText(world, alerts, goal) {
  for (const a of alerts) {
    const cost = FIX_COST[a.code];
    if (cost && world.gold >= cost()) { const t = alertText(a, world); return `${T.next}: ${t.title}. ${t.fix}`; }
  }
  return goal ? `${T.next}: ${goal.text}` : '';
}
