// Version 10.0, Track Q (ruling 2141, Task Q.2): the dock's and the panel's category icons are drawn images, not font glyphs.
import { describe, it, expect } from '../../harness.js';
import { CATEGORY_ICONS } from '../../../src/data/ui.js';
import { CATEGORY_ICON_DRAWS, categoryIconUrl } from '../../../src/render/art/icons.js';
import { createDock } from '../../../src/ui/dock.js';
import { createSidePanel } from '../../../src/ui/sidePanel.js';
import { createRail } from '../../../src/ui/rail.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { mount } from '../../helpers/dom.js';

const INK = '#2B1F0E';

describe('v100 q icons: drawn, cached, in the dock and the panel', () => {
  it('CATEGORY_ICONS holds only ASCII ids, one for each drawn icon', () => {
    for (const [cat, id] of Object.entries(CATEGORY_ICONS)) {
      expect([cat, /^[\x20-\x7e]+$/.test(id)]).toEqual([cat, true]);
      expect([cat, typeof CATEGORY_ICON_DRAWS[id]]).toEqual([cat, 'function']);
    }
    expect(Object.keys(CATEGORY_ICON_DRAWS)).toEqual(['roads', 'homes', 'food', 'industry', 'services', 'defence', 'monuments']);
  });
  it('categoryIconUrl gives a PNG data URL, the same string twice, and a different picture for each icon', () => {
    const urls = Object.keys(CATEGORY_ICON_DRAWS).map((id) => categoryIconUrl(id, 20, INK));
    for (const u of urls) expect(u.startsWith('data:image/png')).toBe(true);
    expect(categoryIconUrl('roads', 20, INK)).toBe(urls[0]);
    expect(new Set(urls).size).toBe(urls.length);
    expect(categoryIconUrl('roads', 20, '#1A5F57') === urls[0]).toBe(false);
    expect(categoryIconUrl('nothing', 20, INK)).toBe('');
  });
  it('each icon draws ink inside its square and leaves the corners clear', () => {
    for (const id of Object.keys(CATEGORY_ICON_DRAWS)) {
      const c = document.createElement('canvas');
      c.width = c.height = 80;
      const g = c.getContext('2d');
      g.scale(4, 4); g.strokeStyle = INK; g.lineWidth = 1.7; g.lineCap = 'round'; g.lineJoin = 'round';
      CATEGORY_ICON_DRAWS[id](g, 0, 0, 20);
      const d = g.getImageData(0, 0, 80, 80).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 24) n++;
      expect([id, n > 120]).toEqual([id, true]);
      expect([id, d[3] < 24 && d[(79 * 80 + 79) * 4 + 3] < 24]).toEqual([id, true]);
    }
  });
  it("the dock's buttons each hold an img with that icon's url, and no glyph text", () => {
    const m = mount('<div id="dock"></div>');
    try {
      const container = m.root.querySelector('#dock');
      const store = createStore({ ...INITIAL_UI_STATE, layout: 'portrait', category: 'roads', dock: 'tray' });
      createDock({ container, store, world: makeTestWorld(), onPick() {} });
      const cats = [...container.querySelectorAll('.cat')];
      expect(cats.length > 0).toBe(true);
      for (const b of cats) {
        const img = b.querySelector('img.cat-icon');
        const id = CATEGORY_ICONS[b.dataset.category];
        expect([b.dataset.category, !!img]).toEqual([b.dataset.category, true]);
        // the chosen category's is teal, the others ink
        const tone = b.getAttribute('aria-pressed') === 'true' ? '#1A5F57' : INK;
        expect(img.getAttribute('src')).toBe(categoryIconUrl(id, 20, tone));
        expect(/[^\x20-\x7e]/.test(b.textContent)).toBe(false);
      }
    } finally { m.cleanup(); }
  });
  it("the wide panel's tabs and the rail's buttons carry the same icons", () => {
    const m = mount('<div id="panel"></div><div id="rail"></div>');
    try {
      const world = makeTestWorld();
      const store = createStore({ ...INITIAL_UI_STATE, layout: 'wide', category: 'roads' });
      createSidePanel({ container: m.root.querySelector('#panel'), store, world, onPick() {} });
      const tabs = [...m.root.querySelectorAll('#panel .tab')];
      expect(tabs.length > 0).toBe(true);
      for (const t of tabs) expect([t.dataset.category, !!t.querySelector('img.cat-icon')]).toEqual([t.dataset.category, true]);
      createRail({ container: m.root.querySelector('#rail'), store, world, onPick() {} });
      const cats = [...m.root.querySelectorAll('#rail .cat')];
      expect(cats.length > 0).toBe(true);
      for (const b of cats) expect([b.dataset.category, !!b.querySelector('img.cat-icon')]).toEqual([b.dataset.category, true]);
    } finally { m.cleanup(); }
  });
});
