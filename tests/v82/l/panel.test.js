// Version 8.2, Track L (ruling 1325): the wide (desktop) side panel lists every unlocked card of the category and scrolls, with no More or Fewer; the minimap, Layers and the category
// buttons stay fixed above the list; the suggested card comes first. The phone's tray keeps 8.1's layered More (tests/v81/d/layers.test.js).
import { describe, it, expect } from '../../harness.js';
import { layerPlan } from '../../../src/ui/v81/trayLayers.js';
import { unlockedItems } from '../../../src/ui/cards.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';

const capital = () => { const w = uiWorld(); w.milestone = 'capital'; return w; };
const itemsOf = (r) => [...r.root.querySelectorAll('#panel .cards .card[data-item]')].map((c) => c.dataset.item);

describe('v82 l panel: the wide panel lists every card and scrolls', () => {
  it('on 1280x800 every unlocked item of every category is in the list, there is no More, and the list scrolls while the category row stays put', async () => {
    const w = capital();
    const r = await rigUI({ world: w, width: 1280, height: 800, hooks: { flatTray: false } });
    try {
      const tabs = r.root.querySelector('#panel .tabs'), grid = r.root.querySelector('#panel .cards');
      let scrolled = 0;
      for (const c of CATEGORIES) {
        const all = unlockedItems(w, c.id);
        if (!all.length) continue;
        r.store.set({ category: c.id });
        r.frame();
        expect([c.id, itemsOf(r).slice().sort()]).toEqual([c.id, all.slice().sort()]);
        expect([c.id, r.root.querySelectorAll('#panel .more-card').length]).toEqual([c.id, 0]);
        if (grid.scrollHeight > grid.clientHeight) {
          const before = tabs.getBoundingClientRect().top, gridTop = grid.getBoundingClientRect().top;
          grid.scrollTop = 60;
          r.frame();
          expect([c.id, grid.scrollTop > 0, tabs.getBoundingClientRect().top, grid.getBoundingClientRect().top]).toEqual([c.id, true, before, gridTop]);
          grid.scrollTop = 0;
          scrolled += 1;
        }
      }
      expect(scrolled).toBeGreaterThan(0);                                                // at least one category is long enough to need the scroll
    } finally { r.cleanup(); }
  });

  it('puts the suggested card first and the rest in the category\'s own order; the plan with no suggestion is the category\'s order', () => {
    const w = capital();
    const cat = CATEGORIES.find((c) => unlockedItems(w, c.id).length > 5).id, all = unlockedItems(w, cat);
    const pick = all[all.length - 1];
    expect(layerPlan(w, cat, { advised: pick, all: true, advisedFirst: true }).items).toEqual([pick, ...all.filter((i) => i !== pick)]);
    expect(layerPlan(w, cat, { advised: pick, all: true }).items).toEqual(all);            // the lesson's tray: the category's own order
    expect(layerPlan(w, cat, { all: true, advisedFirst: true }).items).toEqual(all);
  });
});
