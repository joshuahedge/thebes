import { describe, it, expect } from '../harness.js';
import { createDock } from '../../src/ui/dock.js';
import { createSidePanel } from '../../src/ui/sidePanel.js';
import { createRail } from '../../src/ui/rail.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { ECONOMY } from '../../src/data/economy.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

describe('ui dock', () => {
  it('opens the tray for a category, shows its cards and remembers it', () => {
    const { root, cleanup } = mount();
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'portrait' });
    const picked = [];
    createDock({ container: root, store, world: makeTestWorld(), onPick: (i) => picked.push(i) });
    expect(root.dataset.height).toBe('slim');
    expect(root.querySelectorAll('.cat').length).toBe(5);          // categories with no card to show are hidden
    fire(root.querySelectorAll('.cat')[2], 'click');
    expect(store.get().dock).toBe('tray');
    expect(store.get().category).toBe('food');
    expect(root.dataset.height).toBe('tray');
    expect(document.body.dataset.dock).toBe('tray');
    const cards = root.querySelectorAll('.tray .card');
    expect(cards.length).toBe(5);                                  // Stage 4.6: the hunting lodge and fishing wharf too (locked until Town); grain farm, fig orchard (locked until Town), granary
    fire(cards[1], 'click');                                       // a locked card does nothing
    fire(cards[2], 'click');
    expect(picked).toEqual(['granary']);
    fire(root.querySelectorAll('.cat')[2], 'click');
    expect(store.get().dock).toBe('slim');
    expect(store.get().category).toBe('food');
    cleanup();
  });
  it('rebuilds its cards (and their pictures) only when a card changes, not whenever the gold does', () => {
    for (const make of ['dock', 'panel', 'rail']) {
      const { root, cleanup } = mount('<div id="c"></div>');
      try {
        const world = makeTestWorld({ gold: 1000 });
        const store = createStore({ ...INITIAL_UI_STATE, layout: make === 'dock' ? 'portrait' : make === 'panel' ? 'wide' : 'compact', category: 'food', dock: 'tray' });
        const container = root.querySelector('#c');
        const ui = make === 'dock' ? createDock({ container, store, world, onPick() {} })
          : make === 'panel' ? createSidePanel({ container, store, world, onPick() {} })
            : createRail({ container, store, world, onPick() {} });
        const card = () => container.querySelector('.card[data-item="granary"]');
        const first = card();
        expect([make, first !== null]).toEqual([make, true]);
        world.gold = 900;                                            // still enough for every card: nothing to redraw
        ui.render();
        expect([make, card() === first]).toEqual([make, true]);
        world.gold = BUILDINGS.granary.cost + ECONOMY.debtFloor - 1; // the granary is out of reach now (past the debt floor): its card changes
        ui.render();
        expect([make, card() === first, card().classList.contains('unaffordable')]).toEqual([make, false, true]);
        const second = card();
        world.gold = BUILDINGS.granary.cost + ECONOMY.debtFloor - 2;
        ui.render();
        expect([make, card() === second]).toEqual([make, true]);
      } finally { cleanup(); }
    }
  });
  it('changes height with the handle, swipes and the pill', () => {
    const { root, cleanup } = mount();
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'portrait' });
    createDock({ container: root, store, world: makeTestWorld(), onPick: () => {} });
    const handle = root.querySelector('.handle');
    fire(handle, 'click');
    expect(store.get().dock).toBe('tray');
    fire(handle, 'pointerdown', { clientX: 10, clientY: 300, pointerId: 1, pointerType: 'touch' });
    fire(handle, 'pointerup', { clientX: 10, clientY: 360, pointerId: 1, pointerType: 'touch' });
    expect(store.get().dock).toBe('slim');
    fire(handle, 'pointerdown', { clientX: 10, clientY: 300, pointerId: 2, pointerType: 'touch' });
    fire(handle, 'pointerup', { clientX: 10, clientY: 360, pointerId: 2, pointerType: 'touch' });
    expect(store.get().dock).toBe('tucked');
    expect(root.dataset.height).toBe('tucked');
    fire(root.querySelector('.pill'), 'click');
    expect(store.get().dock).toBe('slim');
    fire(handle, 'pointerdown', { clientX: 10, clientY: 300, pointerId: 3, pointerType: 'touch' });
    fire(handle, 'pointerup', { clientX: 10, clientY: 240, pointerId: 3, pointerType: 'touch' });
    expect(store.get().dock).toBe('tray');
    cleanup();
  });
  it('ignores a swipe that the browser cancels', () => {
    const { root, cleanup } = mount();
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'portrait' });
    createDock({ container: root, store, world: makeTestWorld(), onPick: () => {} });
    const handle = root.querySelector('.handle');
    fire(handle, 'pointerdown', { clientX: 10, clientY: 300, pointerId: 4, pointerType: 'touch' });
    fire(handle, 'pointercancel', { clientX: 10, clientY: 300, pointerId: 4, pointerType: 'touch' });
    fire(handle, 'pointerup', { clientX: 10, clientY: 360, pointerId: 4, pointerType: 'touch' });
    expect(store.get().dock).toBe('slim');
    cleanup();
  });
});
