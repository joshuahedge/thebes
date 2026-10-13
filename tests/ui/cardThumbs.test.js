import { describe, it, expect } from '../harness.js';
import { drawThumb, inkBounds, THUMB_W, THUMB_H } from '../../src/ui/thumbs.js';
import { ART } from '../../src/render/art/registry.js';
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
// The box of the clearly drawn pixels (alpha above 40), in canvas px; null when nothing is drawn.
const inkBox = (c) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1); }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
};
const ids = (nodes) => [...nodes].map((n) => n.dataset.category);
const SHOWN = ['roads', 'homes', 'food', 'industry', 'services'];

describe('ui card pictures', () => {
  it('draws a picture for every card, sized for the screen', () => {
    const items = visibleCategories().flatMap((c) => c.items);
    expect(items).toEqual(['road', 'demolish', 'house', 'garden', 'statue', 'plaza', 'sphinx', 'farm_grain', 'farm_fig', 'granary', 'clay_pit', 'potter', 'farm_barley', 'brewery',
      'farm_flax', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post', 'well', 'bazaar', 'temple', 'booth', 'firehouse', 'palace',
      'wall', 'gate', 'tower', 'barracks', 'builders_guild', 'quarry', 'brickworks', 'obelisk_small', 'obelisk_large', 'colossus', 'mastaba_small',
      'mastaba_large', 'pyramid_small', 'pyramid_great']);   // Stage 4: the plaza, sphinx, palace and the Monuments tab
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
  it('fits the art by its own bounds when the canvas reads back nothing, or ink everywhere (blocked or noised readback)', () => {
    const real = CanvasRenderingContext2D.prototype.getImageData;
    const readBack = (alpha) => function (x, y, w, h) { const img = new ImageData(w, h); if (alpha) img.data.fill(alpha); return img; };
    const measured = inkBounds(ART.well);                                       // a working canvas: the inked box, inside the bounds
    const [l, t, rr, b] = ART.well.bounds;
    expect(measured[0] >= l - 4 && measured[1] >= t - 4 && measured[2] <= rr + 4 && measured[3] <= b + 4).toBe(true);
    expect(measured).toEqual(inkBounds(ART.well));
    try {
      CanvasRenderingContext2D.prototype.getImageData = readBack(0);           // reads back nothing at all
      expect(inkBounds(ART.well)).toEqual(ART.well.bounds);
      const blank = drawThumb(document.createElement('canvas'), 'temple', 3);  // a pixel ratio no other test paints, so it is painted now
      CanvasRenderingContext2D.prototype.getImageData = readBack(255);         // ink everywhere (noise, or a filled canvas)
      expect(inkBounds(ART.well)).toEqual(ART.well.bounds);
      const filled = drawThumb(document.createElement('canvas'), 'bazaar', 3);
      CanvasRenderingContext2D.prototype.getImageData = real;
      for (const [item, c] of [['temple', blank], ['bazaar', filled]]) {
        const box = inkBox(c);
        const [W, H] = [THUMB_W * 3, THUMB_H * 3];
        expect([item, box !== null]).toEqual([item, true]);                     // a picture, not a blank card
        expect([item, box.w >= W * 0.4 || box.h >= H * 0.4]).toEqual([item, true]);   // and a card-sized one: the bounds are looser than the ink, so a little smaller
        expect([item, box.x0 >= 1, box.y0 >= 1, box.x1 <= W - 1, box.y1 <= H - 1]).toEqual([item, true, true, true, true]);
      }
    } finally { CanvasRenderingContext2D.prototype.getImageData = real; }
  });
  it('fills the picture box with the drawn art, centred, and shows a plot as a Hut', () => {
    expect([THUMB_W, THUMB_H]).toEqual([104, 52]);
    for (const item of ['road', 'demolish', 'house', 'farm_grain', 'granary', 'well', 'bazaar', 'temple']) {
      for (const dpr of [1, 2]) {
        const c = drawThumb(document.createElement('canvas'), item, dpr);
        const b = inkBox(c);
        const [W, H] = [THUMB_W * dpr, THUMB_H * dpr];
        // the long side spans the box, less a small inset; nothing touches the edge; the art sits in the middle
        expect([item, dpr, b.w >= W - 8 * dpr || b.h >= H - 8 * dpr]).toEqual([item, dpr, true]);
        expect([item, dpr, b.x0 >= 1, b.y0 >= 1, b.x1 <= W - 1, b.y1 <= H - 1]).toEqual([item, dpr, true, true, true, true]);
        expect([item, dpr, Math.abs((b.x0 + b.x1) / 2 - W / 2) <= 3 * dpr, Math.abs((b.y0 + b.y1) / 2 - H / 2) <= 3 * dpr]).toEqual([item, dpr, true, true]);
      }
    }
    const hash = (item) => canvasHash(drawThumb(document.createElement('canvas'), item, 1));
    expect(hash('house') === hash('house.t1')).toBe(true);                       // a plot's first home is a Hut
    expect(hash('house') === hash('house.t3')).toBe(false);
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
    expect(visibleCategories().map((c) => c.id)).toEqual([...SHOWN, 'defence', 'monuments']);   // Defence has cards from Stage 3, shown from Town (locked); Monuments from Stage 4, shown from Market town
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
      const pressed = r.root.querySelector('#panel .tab[aria-pressed="true"]');
      const idle = r.root.querySelector('#panel .tab[aria-pressed="false"]');
      expect(getComputedStyle(pressed).backgroundImage).toContain('rgb(255, 255, 255)');   // on the teal fill the band turns white, so it still shows
      expect(getComputedStyle(idle).backgroundImage).toContain('gradient');
      expect(getComputedStyle(idle).backgroundImage.includes('rgb(255, 255, 255)')).toBe(false);
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
      key(r.root, '4');                                                           // Industry shows at Village: its Town cards, locked
      expect(r.store.get().category).toBe('industry');
      key(r.root, '6');                                                           // Defence has nothing to show in Stage 2: ignored
      expect(r.store.get().category).toBe('industry');
      key(r.root, '7');                                                           // Monuments too
      expect(r.store.get().category).toBe('industry');
    } finally { r.cleanup(); }
  });
  it('fits every tray of picture cards under the corner buttons at 100% and 150% text', async () => {
    for (const size of [100, 150]) {
      for (const category of SHOWN) {                                             // short names, a long one that wraps, three cards in a row
        const r = await rigUI({ width: 390, height: 844 });
        try {
          r.ui.settings.set({ textSize: size });
          fire(r.root.querySelector(`#dock .cat[data-category="${category}"]`), 'click');
          expect(r.store.get().dock).toBe('tray');
          const dock = r.root.querySelector('#dock').getBoundingClientRect();
          const corners = r.root.querySelector('#corners').getBoundingClientRect();
          const cards = [...r.root.querySelectorAll('#dock .tray .card')];
          const lowest = Math.max(...cards.map((c) => c.getBoundingClientRect().bottom));
          const tallest = cards.reduce((a, c) => (c.getBoundingClientRect().height > a.getBoundingClientRect().height ? c : a));
          const t = tallest.getBoundingClientRect();
          const pic = tallest.querySelector('.thumb').getBoundingClientRect();
          expect([size, category, corners.bottom <= dock.top + 0.5, lowest <= dock.bottom + 0.5]).toEqual([size, category, true, true]);
          // the words stay inside their card, and the picture inside its card's edges
          expect([size, category, cards.every((c) => c.scrollHeight <= c.clientHeight + 1), pic.left >= t.left && pic.right <= t.right + 0.5]).toEqual([size, category, true, true]);
        } finally { r.cleanup(); }
      }
    }
  });
  it('keeps the first card off the screen edge when the tray snaps', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');
      const tray = r.root.querySelector('#dock .tray');
      expect([getComputedStyle(tray).scrollPaddingLeft, getComputedStyle(tray).scrollPaddingRight]).toEqual(['12px', '12px']);
    } finally { r.cleanup(); }
  });
  it('keeps each picture inside its card in the rail drawer and the side panel', async () => {
    for (const [width, height, host] of [[844, 390, '#rail .drawer'], [1280, 800, '#panel .cards']]) {
      const r = await rigUI({ width, height });
      try {
        fire(r.root.querySelector(`${width === 844 ? '#rail' : '#panel'} ${width === 844 ? '.cat' : '.tab'}[data-category="services"]`), 'click');
        const cards = [...r.root.querySelectorAll(`${host} .card`)];
        expect([width, cards.length]).toEqual([width, 6]);
        for (const c of cards) {
          const box = c.getBoundingClientRect();
          const pic = c.querySelector('.thumb').getBoundingClientRect();
          expect([width, c.dataset.item, pic.width > 40, pic.left >= box.left, pic.right <= box.right + 0.5, pic.bottom <= box.bottom]).toEqual([width, c.dataset.item, true, true, true, true]);
        }
      } finally { r.cleanup(); }
    }
  });
});
