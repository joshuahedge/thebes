import { describe, it, expect } from '../harness.js';
import { createOverlayLegend } from '../../src/ui/overlayUi.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND } from '../../src/ui/text.js';
import { mount, fire } from '../helpers/dom.js';

describe('ui overlay legend', () => {
  it('shows name, dot, ring and a close button for the current overlay, and cycles through all seven', () => {
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
    store.set({ dock: 'tray' });                              // an unrelated store write must not rebuild the strip
    expect(root.querySelector('.strip') === strip).toBe(true);
    fire(strip.querySelector('.close'), 'click');
    expect(store.get().overlay).toBe(null);
    expect(root.querySelector('.strip')).toBe(null);
    const seen = [];
    for (let i = 0; i < 8; i++) { legend.cycle(); seen.push(store.get().overlay); }
    expect(seen).toEqual(['water', 'food', 'religion', 'goods', 'entertainment', 'desirability', 'housing', null]);
    cleanup();
  });
});
