// Version 8.0 (Track N, rulings 1162-1164, 1167): placing. The bar leads with the icon and the name of what is in hand, large, and flashes when another item is picked; the chosen tray card stays lit;
// the tick is the only filled, coloured button in a bar; and one tap with the Housing plot tool lays one plot, as a one-tile drag does.
import { describe, it, expect } from '../../harness.js';
import { FLASH_MS } from '../../../src/ui/confirmBar.js';
import { buildingName, plotsPlacedText, PLACING_TEXT, T } from '../../../src/ui/text.js';
import { housesOf, buildingAt } from '../../../src/sim/world.js';
import { fire, key } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const titleOf = (r) => r.root.querySelector('#confirm .title');
const pickCard = (r, category, item) => {
  fire(r.root.querySelector(`#dock .cat[data-category="${category}"]`), 'click');
  fire(r.root.querySelector(`#dock .tray .card[data-item="${item}"]`), 'click');
  r.frame(0);
};
const rgb = (n, prop = 'backgroundColor') => getComputedStyle(n)[prop];
const PARCHMENT = 'rgb(243, 231, 203)';

describe('v80 n placing: the bar says what is in hand', () => {
  it('leads with the picture and the name, large, and the name follows the choice from a house to a well', async () => {
    const r = await rigUI();
    try {
      pickCard(r, 'homes', 'house');
      let t = titleOf(r);
      expect([t.querySelector('.name').textContent, t.textContent, Boolean(t.querySelector('canvas.thumb')), T.housingPlots]).toEqual([T.housingPlots, T.housingPlots, true, T.housingPlots]);
      expect(parseFloat(getComputedStyle(t).fontSize)).toBeGreaterThanOrEqual(19);        // large: 20 px at 100% text
      pickCard(r, 'services', 'well');
      t = titleOf(r);
      expect([t.querySelector('.name').textContent, buildingName('well'), r.root.querySelector('#confirm .info').getAttribute('aria-label')]).toEqual([buildingName('well'), buildingName('well'), PLACING_TEXT.lit(buildingName('well'))]);
      expect(Boolean(t.querySelector('canvas.thumb'))).toBe(true);
      const box = t.querySelector('canvas.thumb').getBoundingClientRect();
      expect([Math.round(box.width), Math.round(box.height)]).toEqual([60, 30]);
    } finally { r.cleanup(); }
  });

  it('picking a different item flashes the bar (a lit class and ring a timer takes off), and keeping the same item does not', async () => {
    const r = await rigUI();
    try {
      pickCard(r, 'homes', 'house');
      const bar = () => r.root.querySelector('#confirm .confirm');
      expect(bar().classList.contains('flash')).toBe(true);
      expect(rgb(bar(), 'boxShadow') === 'none').toBe(false);
      await wait(FLASH_MS + 150);
      expect(bar().classList.contains('flash')).toBe(false);
      r.ui.placement.moveGhost?.(3, 3);
      r.store.set({ overlay: null });                                                    // a store change that is not a new item: the bar is rebuilt but does not flash
      expect(bar().classList.contains('flash')).toBe(false);
      pickCard(r, 'services', 'well');
      expect(bar().classList.contains('flash')).toBe(true);
      r.store.set({ overlay: null });
      expect(bar().classList.contains('flash')).toBe(true);                              // a rebuild inside the flash keeps it
      await wait(FLASH_MS + 150);
      expect(bar().classList.contains('flash')).toBe(false);
    } finally { r.cleanup(); }
  });

  it('on a wide screen the chosen tray card stays lit (aria-pressed, a ring and a tick after its name) and only that card', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      fire(r.root.querySelector('#panel .tab[data-category="services"]'), 'click');
      fire(r.root.querySelector('#panel .cards .card[data-item="well"]'), 'click');
      r.frame(0);
      let lit = [...r.root.querySelectorAll('#panel .cards .card[aria-pressed="true"]')];
      expect(lit.map((c) => c.dataset.item)).toEqual(['well']);
      expect(getComputedStyle(lit[0].querySelector('.name'), '::after').content).toContain('✓');
      expect(rgb(lit[0], 'boxShadow') === 'none').toBe(false);
      fire(r.root.querySelector('#panel .cards .card:not([data-item="well"])'), 'click');
      r.frame(0);
      lit = [...r.root.querySelectorAll('#panel .cards .card[aria-pressed="true"]')];
      expect(lit.length).toBe(1);
      expect(lit[0].dataset.item === 'well').toBe(false);
    } finally { r.cleanup(); }
  });
});

describe('v80 n placing: one primary in every bar', () => {
  // The tick is the one filled, coloured button: lapis (primary) or coral (a demolish's danger). Flip, Undo, Cancel, Done and the chosen one of a row of choices are neutral: the page's parchment.

  it('the road bar: the tick is primary and filled; Flip, Undo, Cancel and the chosen Straight are not', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      fire(r.root.querySelector('#panel .tab[data-category="roads"]'), 'click');
      fire(r.root.querySelector('#panel .cards .card[data-item="road"]'), 'click');
      r.ui.placement.setRoute?.(false);
      r.store.set({ line: { x0: 4, y0: 12, x1: 9, y1: 14, flip: false } });
      r.frame(0);
      const ok = r.root.querySelector('#confirm .ok');
      expect([ok.classList.contains('primary'), ok.classList.contains('danger')]).toEqual([true, false]);
      const lapis = rgb(ok);
      expect(lapis).toBe('rgb(28, 55, 104)');
      const neutral = ['.flip', '.undo', '.cancel', '.route-pick[aria-pressed="true"]'].map((sel) => r.root.querySelector(`#confirm ${sel}`));
      expect(neutral.every(Boolean)).toBe(true);
      for (const b of neutral) {
        expect([b.className, b.classList.contains('primary'), b.classList.contains('danger'), rgb(b) === lapis, rgb(b) === 'rgb(31, 111, 102)']).toEqual([b.className, false, false, false, false]);
      }
      const straight = r.root.querySelector('#confirm .route-pick[aria-pressed="true"]');
      expect([straight.dataset.shape, straight.textContent.startsWith('✓')]).toEqual(['straight', true]);   // the tick in its words and its outline: the cue is never colour alone
      expect([rgb(straight), parseFloat(getComputedStyle(straight).borderTopWidth) >= 2]).toEqual([PARCHMENT, true]);
      for (const b of [...neutral, ok]) { const q = b.getBoundingClientRect(); expect([b.className, q.width >= 44 - 0.5, q.height >= 44 - 0.5]).toEqual([b.className, true, true]); }
      expect(r.root.querySelector('#confirm .flip').getAttribute('aria-label')).toBe(T.flip);
    } finally { r.cleanup(); }
  });

  it('the monument style, the area spacing and the area toggle stay neutral when chosen; only the tick is filled', async () => {
    const r = await rigUI();
    try {
      r.ui.placement.start({ kind: 'building', type: 'statue' });
      r.frame(0);
      r.ui.placement.startArea?.('statue');
      r.frame(0);
      const picked = [...r.root.querySelectorAll('#confirm [aria-pressed="true"]')];
      expect(picked.length).toBeGreaterThan(0);
      for (const b of picked) expect([b.className, rgb(b) === 'rgb(31, 111, 102)']).toEqual([b.className, false]);
    } finally { r.cleanup(); }
  });

  it('a demolish keeps its tick as the one danger button', async () => {
    const r = await rigUI();
    try {
      r.ui.placement.start({ kind: 'demolish' });
      r.frame(0);
      const ok = r.root.querySelector('#confirm .ok');
      expect([ok.classList.contains('danger'), ok.classList.contains('primary')]).toEqual([true, false]);
      expect([rgb(r.root.querySelector('#confirm .cancel')), rgb(ok)]).toEqual([PARCHMENT, 'rgb(163, 54, 36)']);   // Cancel is neutral; the demolish tick is the coral one
    } finally { r.cleanup(); }
  });
});

describe('v80 n placing: one tap, one plot', () => {
  it('on a phone one tap with the Housing plot tool lays one plot at once, with the usual toast and Undo, and the tool stays on with Done', async () => {
    const r = await rigUI();
    try {
      r.ui.placement.start({ kind: 'houses' });
      r.frame(0);
      const before = housesOf(r.world).length;
      r.tap(20, 9);
      expect([housesOf(r.world).length, Boolean(buildingAt(r.world, 20, 9)), r.store.get().plan]).toEqual([before + 1, true, null]);
      const toast = r.root.querySelector('#toasts .toast');
      expect([toast.querySelector('.text').textContent, toast.querySelector('.action').textContent]).toEqual([plotsPlacedText(1, 0), 'Undo']);
      expect([r.store.get().tool.kind, Boolean(r.root.querySelector('#confirm .done')), r.world.undo.length]).toEqual(['houses', true, 1]);
      fire(toast.querySelector('.action'), 'click');
      expect([housesOf(r.world).length, buildingAt(r.world, 20, 9)]).toEqual([before, null]);   // Undo takes that one plot back
    } finally { r.cleanup(); }
  });

  it('a click with a mouse is one plot too, and a second click beside it is the next', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.placement.start({ kind: 'houses' });
      r.frame(0);
      const before = housesOf(r.world).length;
      r.tap(20, 9, 'mouse');
      r.tap(22, 9, 'mouse');
      expect([housesOf(r.world).length, Boolean(buildingAt(r.world, 20, 9)), Boolean(buildingAt(r.world, 22, 9))]).toEqual([before + 2, true, true]);
    } finally { r.cleanup(); }
  });

  it('a one-tile drag is one plot, laid at once; a longer drag draws a rectangle that waits for the tick', async () => {
    const r = await rigUI();
    try {
      r.ui.placement.start({ kind: 'houses' });
      r.frame(0);
      const before = housesOf(r.world).length;
      const at = (x, y) => r.screenOf(x + 0.5, y + 0.5);
      const drag = (a, b) => { const p = at(...a), q = at(...b); r.ui.actions.strokeDrag({ ...p, phase: 'start' }); r.ui.actions.strokeDrag({ ...q, phase: 'move' }); r.ui.actions.strokeDrag({ ...q, phase: 'end' }); };
      drag([20, 9], [20, 9]);
      expect([housesOf(r.world).length, r.store.get().plan]).toEqual([before + 1, null]);
      drag([22, 9], [24, 9]);
      expect([housesOf(r.world).length, r.store.get().plan.tiles.length]).toEqual([before + 1, 3]);
      fire(r.root.querySelector('#confirm .ok'), 'click');
      expect(housesOf(r.world).length).toBe(before + 4);
    } finally { r.cleanup(); }
  });

  it('a tile the sim refuses is not laid: it stays drawn so the bar says why, and the next tap replaces it', async () => {
    const r = await rigUI();
    try {
      r.ui.placement.start({ kind: 'houses' });
      r.frame(0);
      const before = housesOf(r.world).length;
      r.tap(12, 10);                                                                     // a road tile
      expect([housesOf(r.world).length, r.ui.placement.preview().state, r.store.get().plan.tiles.length]).toEqual([before, 'bad', 1]);
      expect(r.root.querySelector('#confirm .reason, #confirm .why').textContent.length).toBeGreaterThan(0);
      r.tap(22, 9);
      expect([housesOf(r.world).length, r.store.get().plan]).toEqual([before + 1, null]);
    } finally { r.cleanup(); }
  });

  it('taps once a plan is drawn still add to it (nothing is laid until the tick)', async () => {
    const r = await rigUI();
    try {
      r.ui.placement.start({ kind: 'houses' });
      r.store.set({ plan: { tiles: [[20, 9], [21, 9]] } });
      r.frame(0);
      const before = housesOf(r.world).length;
      r.tap(22, 9);
      expect([housesOf(r.world).length, r.store.get().plan.tiles.length]).toEqual([before, 3]);
    } finally { r.cleanup(); }
  });
});
