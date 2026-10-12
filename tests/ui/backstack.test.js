import { describe, it, expect } from '../harness.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { select, deselect, startTool, openSheet, back } from '../../src/ui/modes.js';
import { createBackStack } from '../../src/ui/backstack.js';

function fakeHistory() {
  const entries = [{ state: null }];
  let index = 0;
  const listeners = [];
  return {
    entries,
    get length() { return entries.length; },
    get state() { return entries[index].state; },
    get index() { return index; },
    pushState(state) { entries.splice(index + 1); entries.push({ state }); index = entries.length - 1; },
    back() { if (index > 0) { index--; for (const fn of listeners) fn({ state: entries[index].state }); } },
    addListener(type, fn) { if (type === 'popstate') listeners.push(fn); },
    removeListener(type, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    listeners,
  };
}

describe('ui back stack', () => {
  it('pushes an entry for each open step and closes one per Back', () => {
    const store = createStore(INITIAL_UI_STATE);
    const h = fakeHistory();
    const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
    bs.start();
    store.set(select(store.get(), 1));
    expect(h.length).toBe(2);
    store.set(openSheet(store.get(), 'menu'));
    expect(h.length).toBe(3);
    h.back();
    expect(store.get().sheet).toEqual({ kind: 'info', id: 1 });   // the info sheet comes back under the closed panel
    expect(store.get().mode).toBe('selected');
    h.back();
    expect(store.get().mode).toBe('browse');
    expect(store.get().sheet).toBe(null);
    expect(bs.depth()).toBe(0);
  });
  it('counts a guidance row opened in place as a step: Back closes it, and one closed another way takes its entry back (P8)', () => {
    const store = createStore(INITIAL_UI_STATE);
    const h = fakeHistory();
    const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
    bs.start();
    store.set({ guidanceOpen: true });
    expect([h.length, bs.depth(), h.index]).toEqual([2, 1, 1]);
    h.back();                                  // the phone's Back
    expect([store.get().guidanceOpen, bs.depth(), h.index]).toEqual([false, 0, 0]);
    store.set({ guidanceOpen: true });
    store.set({ guidanceOpen: false });        // a second tap closed it: its entry goes with it
    expect([bs.depth(), h.index, store.get().guidanceOpen]).toEqual([0, 0, false]);
  });
  it('leaves no Back press that does nothing after many More, Less and Layers taps (final review 5)', () => {
    const store = createStore(INITIAL_UI_STATE);
    const h = fakeHistory();
    const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
    bs.start();
    store.set(select(store.get(), 1));         // a building selected: one step under the rest
    for (let i = 0; i < 3; i++) { store.set({ guidanceOpen: true }); store.set({ guidanceOpen: false }); }   // More, Less
    for (let i = 0; i < 2; i++) { store.set({ layersOpen: true }); store.set({ layersOpen: false }); }       // a Layers pick
    store.set({ guidanceOpen: true }); store.set({ guidanceOpen: false });   // a map tap closed the row
    expect([bs.depth(), h.index, store.get().mode]).toEqual([1, 1, 'selected']);
    h.back();                                  // the first Back closes the selection ...
    expect([store.get().mode, bs.depth(), h.index]).toEqual(['browse', 0, 0]);   // ... and the next one leaves the game
    store.set({ guidanceOpen: true });
    h.back();                                  // Back still closes an open row first
    expect([store.get().guidanceOpen, h.index]).toEqual([false, 0]);
  });
  it('does not push twice for the same step and absorbs steps left by other means', () => {
    const store = createStore(INITIAL_UI_STATE);
    const h = fakeHistory();
    const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
    bs.start();
    store.set(startTool(store.get(), { kind: 'road' }));
    store.set({ line: { x0: 1, y0: 1, x1: null, y1: null, flip: false } });
    expect(h.length).toBe(2);
    store.set(back(store.get()));            // left with Esc, not with Back
    expect(bs.depth()).toBe(0);
    h.back();                                // the stale entry pops: nothing to close, state untouched
    expect(store.get().mode).toBe('browse');
    bs.stop();
    expect(h.listeners.length).toBe(0);
  });
  it('closes the open step on Back even after an earlier step was closed by other means', () => {
    const store = createStore(INITIAL_UI_STATE);
    const h = fakeHistory();
    const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
    bs.start();
    store.set(select(store.get(), 1));
    store.set(deselect(store.get()));          // tapped empty ground: closed by other means
    store.set(select(store.get(), 2));
    expect(bs.depth()).toBe(1);
    h.back();                                  // the phone's Back closes the open selection, not the stale entry
    expect(store.get().mode).toBe('browse');
    expect(store.get().selectedId).toBe(null);
    h.back();                                  // now the stale entry expires with nothing open
    expect(store.get().mode).toBe('browse');
    expect(bs.depth()).toBe(0);
  });
});
