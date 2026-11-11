// Version 9.3.1, the phone check's two partly-fixed items: Back on the lesson's first chapter card (open before the back stack starts), and the
// City page on a phone opening with its tabs in view.
import { describe, it, expect } from '../../harness.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createBackStack } from '../../../src/ui/backstack.js';

function fakeHistory() {
  const entries = [{ state: null }];
  let index = 0;
  const listeners = [];
  return {
    get length() { return entries.length; },
    get state() { return entries[index].state; },
    pushState(state) { entries.splice(index + 1); entries.push({ state }); index = entries.length - 1; },
    back() { if (index > 0) { index--; for (const fn of listeners) fn({ state: entries[index].state }); } },
    addListener(type, fn) { if (type === 'popstate') listeners.push(fn); },
    removeListener(type, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
  };
}

describe('v931 x phone check: Back and the City page', () => {
  it('gives a step already open when the back stack starts its own entry, so Back closes it and stays in the game', () => {
    const store = createStore({ ...INITIAL_UI_STATE, lessonCardUp: true });   // the lesson's first chapter card, straight after Play
    const h = fakeHistory();
    const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
    bs.start();
    expect(h.length).toBe(2);
    expect(bs.depth()).toBe(1);
    h.back();
    expect(bs.depth()).toBe(0);
    expect(h.length).toBe(2);   // still on our page: the game's first entry is under it
  });
  it('pushes nothing at the start when nothing is open', () => {
    const store = createStore(INITIAL_UI_STATE);
    const h = fakeHistory();
    const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
    bs.start();
    expect(h.length).toBe(1);
    expect(bs.depth()).toBe(0);
  });
});
