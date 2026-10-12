import { describe, it, expect } from '../harness.js';
import { createOverlayLegend } from '../../src/ui/overlayUi.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND } from '../../src/ui/text.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

describe('ui overlay legend', () => {
  it('shows name, dot, ring and a close button for the current overlay, and cycles through all nine', () => {
    const { root, cleanup } = mount();
    const store = createStore(INITIAL_UI_STATE);
    const legend = createOverlayLegend({ container: root, store });
    expect(root.querySelector('.strip')).toBe(null);
    store.set({ overlay: 'water' });
    const strip = root.querySelector('.strip');
    expect(strip.textContent).toContain(OVERLAY_NAMES.water);
    expect(strip.textContent).toContain(OVERLAY_LEGEND.water[0]);
    expect(strip.textContent).toContain(OVERLAY_LEGEND.water[1]);
    expect(strip.querySelector('.dot')).toBeTruthy();
    expect(strip.querySelector('.ring')).toBeTruthy();
    expect([root.children.length, root.querySelector('.legend-icon')]).toEqual([1, null]);   // the strip alone: no icon stands in for it (ruling 164)
    store.set({ dock: 'tray' });                              // an unrelated store write must not rebuild the strip
    expect(root.querySelector('.strip') === strip).toBe(true);
    fire(strip.querySelector('.close'), 'click');
    expect(store.get().overlay).toBe(null);
    expect(root.querySelector('.strip')).toBe(null);
    const seen = [];
    for (let i = 0; i < 10; i++) { legend.cycle(); seen.push(store.get().overlay); }
    expect(seen).toEqual(['water', 'food', 'religion', 'goods', 'entertainment', 'desirability', 'fire', 'housing', 'ground', null]);
    cleanup();
  });
  it('shows the Ground overlay as two swatches with their words and no dot or ring, and says what the bright tiles are while a farm, orchard or mine is placed', () => {
    const { root, cleanup } = mount();
    const world = makeTestWorld({ size: 16, fertile: [[2, 2, 3, 3]] });
    const store = createStore(INITIAL_UI_STATE);
    const legend = createOverlayLegend({ container: root, store, world });
    store.set({ overlay: 'ground' });
    const strip = root.querySelector('.strip');
    expect(strip.textContent).toContain(OVERLAY_NAMES.ground);
    expect([...strip.querySelectorAll('.key')].map((k) => k.textContent.trim())).toEqual(OVERLAY_LEGEND.ground);
    expect([strip.querySelector('.dot'), strip.querySelector('.ring'), strip.querySelector('.room')]).toEqual([null, null, null]);
    store.set({ tool: { kind: 'building', type: 'farm_grain' }, mode: 'placing' });
    expect(root.querySelector('.strip .room').textContent).toBe('Bright: room for a farm');
    store.set({ tool: { kind: 'building', type: 'farm_fig' } });
    expect(root.querySelector('.strip .room').textContent).toBe('Bright: room for an orchard');
    store.set({ tool: { kind: 'building', type: 'gem_mine' } });
    expect(root.querySelector('.strip .room').textContent).toBe('No room left for a mine');           // the world has no rocky ground
    store.set({ tool: { kind: 'building', type: 'well' } });
    expect(root.querySelector('.strip .room')).toBe(null);                                           // a well has no ground of its own
    store.set({ tool: { kind: 'building', type: 'farm_grain' } });
    addRaw(world, 'house', 3, 3);                                                                     // the block's middle: every 2 x 2 in it needs that tile
    expect(root.querySelector('.strip .room').textContent).toBe('Bright: room for a farm');           // the strip is only checked when asked: no store write, no change
    legend.render();                                                                                  // createUI renders it after every command
    expect(root.querySelector('.strip .room').textContent).toBe('No room left for a farm');
    cleanup();
  });
});
