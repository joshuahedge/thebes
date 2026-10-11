import { describe, it, expect } from '../harness.js';
import { drawThumb, THUMB_W, THUMB_H } from '../../src/ui/thumbs.js';
import { renderCards } from '../../src/ui/cards.js';
import { CATEGORIES, CATEGORY_TINT, visibleCategories } from '../../src/data/ui.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { HELP_ROWS } from '../../src/ui/text.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { mount, fire, key } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';
import { canvasHash } from '../helpers/canvas.js';

const inked = (c) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
  return n;
};
const ids = (nodes) => [...nodes].map((n) => n.dataset.category);
const SHOWN = ['roads', 'homes', 'food', 'services'];

describe('ui card pictures', () => {
  it('draws a picture for every Stage 1 card, sized for the screen', () => {
    const items = visibleCategories().flatMap((c) => c.items);
    expect(items).toEqual(['road', 'demolish', 'house', 'farm_grain', 'granary', 'well', 'bazaar', 'temple']);
    for (const item of items) {
      const c = drawThumb(document.createElement('canvas'), item, 1);
      expect([item, c.width, c.height]).toEqual([item, THUMB_W, THUMB_H]);
      expect([item, inked(c) > 150]).toEqual([item, true]);
    }
    const sharp = drawThumb(document.createElement('canvas'), 'well', 2);
    expect([sharp.width, sharp.height]).toEqual([THUMB_W * 2, THUMB_H * 2]);
    const again = drawThumb(document.createElement('canvas'), 'well', 2);
    expect(canvasHash(again)).toBe(canvasHash(sharp));                           // painted once, copied after
    expect(inked(drawThumb(document.createElement('canvas'), 'nothing', 1))).toBe(0);
  });
  it('puts the picture, the name and the cost with a coin on each card', () => {
    const { root, cleanup } = mount();
    try {
      const w = makeTestWorld({ gold: -400 });                                    // a well fits the debt floor; a temple does not
      const cards = renderCards(root, { world: w, category: 'services', onPick: () => {} });
      const thumb = cards[0].firstElementChild;
      expect([thumb.tagName, thumb.classList.contains('thumb'), thumb.getAttribute('aria-hidden')]).toEqual(['CANVAS', true, 'true']);
      expect(cards[0].querySelector('.name').textContent).toBe('Well');
      expect(cards[0].querySelector('.cost').textContent).toBe(`${BUILDINGS.well.cost} gold`);
      expect(cards[0].querySelector('.cost .coin').getAttribute('aria-hidden')).toBe('true');
      expect(cards[2].querySelector('.cost').textContent).toBe(`⊘ ${BUILDINGS.temple.cost} gold`);   // unaffordable keeps its mark and words
      expect(cards[2].querySelector('.coin')).toBe(null);
      renderCards(root, { world: makeTestWorld(), category: 'roads', onPick: () => {} });
      expect(root.querySelector('[data-item="demolish"] .cost').textContent).toBe('Refunds a quarter');
      expect(root.querySelector('[data-item="demolish"] .coin')).toBe(null);
      expect(root.querySelector('[data-item="demolish"] canvas.thumb')).toBeTruthy();
    } finally { cleanup(); }
  });
  it('shows only the categories with something to build, each with its colour band', async () => {
    expect(visibleCategories().map((c) => c.id)).toEqual(SHOWN);
    expect(Object.keys(CATEGORY_TINT).sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
    expect(HELP_ROWS.find((row) => row[0] === 'category')[2]).toBe('1 to 7');
    const r = await rigUI({ width: 390, height: 844 });
    try {
      expect(ids(r.root.querySelectorAll('#dock .cat'))).toEqual(SHOWN);
      expect(ids(r.root.querySelectorAll('#rail .cat'))).toEqual(SHOWN);
      expect(ids(r.root.querySelectorAll('#panel .tab'))).toEqual(SHOWN);
      for (const sel of ['#dock .cat', '#rail .cat', '#panel .tab']) {
        for (const b of r.root.querySelectorAll(sel)) expect([sel, b.style.getPropertyValue('--tint').trim()]).toEqual([sel, CATEGORY_TINT[b.dataset.category]]);
      }
      expect(getComputedStyle(r.root.querySelector('#dock .cat[data-category="food"]')).backgroundImage).toContain('gradient');
    } finally { r.cleanup(); }
  });
  it('keeps the number keys on their categories and ignores the hidden ones', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      key(r.root, '5');
      expect(r.store.get().category).toBe('services');
      expect(r.store.get().dock).toBe('tray');
      key(r.root, '3');
      expect(r.store.get().category).toBe('food');
      key(r.root, '4');                                                           // Industry is hidden in Stage 1: ignored
      expect(r.store.get().category).toBe('food');
      key(r.root, '7');                                                           // Monuments too
      expect(r.store.get().category).toBe('food');
    } finally { r.cleanup(); }
  });
  it('fits a tray of picture cards under the corner buttons at 100% and 150% text', async () => {
    for (const size of [100, 150]) {
      for (const category of ['services', 'homes']) {                            // three short cards; one long name that wraps
        const r = await rigUI({ width: 390, height: 844 });
        try {
          r.ui.settings.set({ textSize: size });
          fire(r.root.querySelector(`#dock .cat[data-category="${category}"]`), 'click');
          expect(r.store.get().dock).toBe('tray');
          const dock = r.root.querySelector('#dock').getBoundingClientRect();
          const corners = r.root.querySelector('#corners').getBoundingClientRect();
          const card = r.root.querySelector('#dock .tray .card').getBoundingClientRect();
          expect([size, category, corners.bottom <= dock.top + 0.5, card.bottom <= dock.bottom + 0.5]).toEqual([size, category, true, true]);
        } finally { r.cleanup(); }
      }
    }
  });
});
