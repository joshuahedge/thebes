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
  it('counts a guidance row opened in place as a step: Back closes it, and one closed another way leaves a stale entry (P8)', () => {
    const store = createStore(INITIAL_UI_STATE);
    const h = fakeHistory();
    const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
    bs.start();
    store.set({ guidanceOpen: true });
    expect([h.length, bs.depth()]).toEqual([2, 1]);
    h.back();                                  // the phone's Back
    expect([store.get().guidanceOpen, bs.depth()]).toEqual([false, 0]);
    store.set({ guidanceOpen: true });
    store.set({ guidanceOpen: false });        // a second tap closed it
    expect(bs.depth()).toBe(0);
    h.back();                                  // the stale entry expires with nothing open
    expect([store.get().guidanceOpen, store.get().mode]).toEqual([false, 'browse']);
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
