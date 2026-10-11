// The idle nudge (early-game pass 3.5). After NUDGE_GLOW_MS of running play with no tool, sheet or dialog open, no
// meaningful action and no goal progress, Show me glows. NUDGE_LINE_MS later one "Next:" line appears. Then
// nothing more until the player acts or a goal moves. It is never a sound, a camera move or a panel. The state
// machine is pure: time comes from the injected clock, and paused or busy time never counts.
import { NUDGE_GLOW_MS, NUDGE_LINE_MS } from '../data/ui.js';
import { BUILDINGS } from '../data/buildings.js';
import { costOf, roadCostOf } from '../sim/costs.js';
import { producerRefused } from '../sim/production.js';
import { alertText, storeFor, makerOf, T } from './text.js';

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

// The store an alert's fix builds, as alertText words it: a full store's own kind, else the store for what the
// building makes (a granary for food, a storehouse for the rest).
function storeOf(w, a) {
  const b = a.id ? w.buildings[a.id] : null;
  const def = b ? BUILDINGS[b.type] : null;
  return def && def.stores ? b.type : storeFor(def && def.produces ? def.produces.good : 'grain');
}
// A producer stopped only because a store in its reach refuses its good: the fix is letting that store accept it, which costs nothing.
const refusedByStore = (w, a) => Boolean(a.id && w.buildings[a.id] && producerRefused(w, w.buildings[a.id]));
// A workshop waiting for its input: the fix builds what makes that input (a clay pit for a potter).
function inputMakerCost(w, a) {
  const b = a.id ? w.buildings[a.id] : null;
  const input = b ? BUILDINGS[b.type].consumes : null;
  const maker = input ? makerOf(input) : null;
  return maker ? costOf(w, maker) : Infinity;
}

// What each alert's cheapest fix costs in this city (difficulty included), for "an affordable fix". Alerts without an
// entry (a failing save) are skipped.
const FIX_COST = {
  no_road: (w) => roadCostOf(w),
  no_storage: (w, a) => (refusedByStore(w, a) ? -Infinity : costOf(w, storeOf(w, a))),
  storage_full: (w, a) => costOf(w, storeOf(w, a)),
  no_input: (w, a) => inputMakerCost(w, a),
  bazaar_empty: (w) => costOf(w, 'granary'),
  understaffed: (w) => costOf(w, 'house'),
  labour_shortage: (w) => costOf(w, 'house'),
  unemployment: (w) => Math.min(costOf(w, 'farm_grain'), costOf(w, 'bazaar')),
  debt: () => -Infinity,   // getting out of debt costs nothing up front (pause what you don't need), so it is always worth naming, even in the red
};

// The nudge's one line: the first problem the treasury can pay to fix, else the open goal, else nothing.
export function nudgeLineText(world, alerts, goal) {
  for (const a of alerts) {
    const cost = FIX_COST[a.code];
    if (cost && world.gold >= cost(world, a)) { const t = alertText(a, world); return `${T.next}: ${t.title}. ${t.fix}`; }
  }
  return goal ? `${T.next}: ${goal.text}` : '';
}
