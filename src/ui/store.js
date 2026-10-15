// The one UI state object. Components read it and subscribe; writes go through modes.js patches or a
// component's own set(). Nothing from the world lives here: the world is read through the sim's functions.
export const INITIAL_UI_STATE = {
  layout: 'portrait',
  inputType: 'touch',
  mode: 'browse',
  selectedId: null,
  hoverId: null,
  tool: null,
  ghost: null,
  line: null,
  area: null,
  plan: null,            // a touch plan in a drawing tool (placement review P3): { tiles: [[x, y], ...] }, strokes and taps added up until the tick
  overlay: null,
  supplyGood: null,      // Version 5.0 (Task 3): the good the Goods supply layer shows (null: the first the picker offers; src/sim/layers.js resolveSupplyGood)
  sheet: null,
  dock: 'slim',
  category: 'roads',
  panelFolded: false,
  lastSpeed: 1,
  confirmDialog: null,
  screenshot: false,     // Stage 3: screenshot mode hides the whole interface until the next tap, click, Esc or Back
  layersOpen: false,     // the Layers picker popover is open (placement review P2, ui/layersPicker.js); Back, Esc, a tap outside or a sheet closes it
  guidanceOpen: false,   // a phone's goal, tip or caption is open in place (placement review P8); Back, Esc, a map tap or a sheet closes it
};

export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      if (!p) return state;
      let changed = false;
      for (const k of Object.keys(p)) if (p[k] !== state[k]) { changed = true; break; }
      if (!changed) return state;
      state = { ...state, ...p };
      for (const fn of [...subs]) fn(state);
      return state;
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    // Drops every subscriber: the interface that owns this store is gone, so a late set() (a stray callback) changes
    // nothing on a page the next interface now owns.
    dispose() { subs.clear(); },
    subscribers: () => subs.size,
  };
}
