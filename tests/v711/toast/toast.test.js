// Version 7.1.1 (rulings 1100-1104). A friend on an iPhone (390x844) placed the lesson's large plot: the next step's card came up and the "Large plot placed · Undo" toast, added a moment
// later, sat on its words, with only an Undo (the step the lesson had just asked for) to press. Now: no toast stands over a card (ruling 1100), every Undo toast has a ✕ (1101), a card
// waits for a road or plots still being drawn (1102), and the placement that completes the lesson's step offers no Undo (1103).
import { describe, it, expect } from '../../harness.js';
import { createToasts } from '../../../src/ui/toasts.js';
import { LESSON_PLACES } from '../../../src/data/lesson.js';
import { LESSON_SCRIPT } from '../../../src/sim/lesson.js';
import { place } from '../../../src/sim/commands.js';
import { buildingAt } from '../../../src/sim/world.js';
import { V711_TEXT } from '../../../src/ui/text.js';
import { mount, fire, key } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { pageAt, cardOf, rect, overlaps, frame } from '../lessonPage.js';

const SIZES = [[390, 844, 100], [375, 667, 100], [390, 844, 150], [375, 667, 150]];

describe('v711 toast: the toasts module', () => {
  it('shows no timed toast while held, drops the timed ones on request and keeps a kept one, and a closable toast has a close button that hides it', () => {
    const { root, cleanup } = mount();
    let held = false;
    const toasts = createToasts({ container: root, setTimer: () => 1, clearTimer: () => {}, held: () => held });
    const a = toasts.show('Road laid', { action: 'Undo', closable: true, close: 'Close this message' });
    const keep = toasts.show('Update ready', { keep: true, close: 'Close', action: 'Restart' });
    expect(root.querySelectorAll('.toast').length).toBe(2);
    expect(a.querySelector('.close').getAttribute('aria-label')).toBe('Close this message');
    fire(a.querySelector('.close'), 'click');
    expect(root.querySelectorAll('.toast').length).toBe(1);
    toasts.show('Well placed');
    toasts.dropLoose();
    expect([...root.querySelectorAll('.toast')].map((n) => n.querySelector('.text').textContent)).toEqual(['Update ready']);
    held = true;
    expect(toasts.show('Hidden by a card')).toBe(null);
    expect(toasts.show('Update again', { keep: true, close: 'Close' })).toBeTruthy();   // a kept toast is only hidden by the page's CSS, never lost
    expect(root.querySelectorAll('.toast').length).toBe(2);
    expect(keep.isConnected).toBe(true);
    cleanup();
  });
  it('a toast without closable or keep has no close button', () => {
    const { root, cleanup } = mount();
    const toasts = createToasts({ container: root, setTimer: () => 1, clearTimer: () => {} });
    const t = toasts.show('Saved', { close: 'Close this message' });
    expect(t.querySelector('.close')).toBe(null);
    cleanup();
  });
});

describe('v711 toast: the Undo toast has a close button', () => {
  it('a placement\'s Undo toast has a close button, 44 by 44, named, that hides it; Undo stays on the bar and Ctrl+Z still takes the placement back', async () => {
    const r = await rigUI();
    try {
      fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');
      fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');
      r.frame(0);
      r.tap(5, 9);
      fire(r.root.querySelector('#confirm .ok'), 'click');
      expect(buildingAt(r.world, 5, 9).type).toBe('well');
      const toast = r.root.querySelector('#toasts .toast');
      const close = toast.querySelector('.close');
      expect(close.getAttribute('aria-label')).toBe(V711_TEXT.closeToast);
      const box = close.getBoundingClientRect();
      expect([Math.round(box.width) >= 44, Math.round(box.height) >= 44]).toEqual([true, true]);
      expect(toast.querySelector('.action').textContent).toBe('Undo');
      fire(close, 'click');
      expect(r.root.querySelector('#toasts .toast')).toBe(null);
      expect(buildingAt(r.world, 5, 9).type).toBe('well');                                  // closing the message does not undo the placement
      expect(Boolean(r.root.querySelector('#confirm .undo'))).toBe(true);                   // the placing bar still offers Undo
      key(r.root, 'z', { ctrlKey: true });
      expect(buildingAt(r.world, 5, 9)).toBe(null);                                         // and so does Ctrl+Z
    } finally { r.cleanup(); }
  });
});

describe('v711 toast: the lesson card and the placement toast never meet', () => {
  for (const [w, h, size] of SIZES) {
    it(`${w}x${h} at ${size}% text: laying the large plot opens the next chapter's card (Water: the well) with no toast over it and no Undo offered for the step's own placement`, async () => {
      const s = await pageAt('largeplot', { width: w, height: h, textSize: size });
      try {
        expect(Boolean(cardOf(s))).toBe(true);
        s.root.querySelector('.lesson-card .lc-go').click();                                  // the large-plot card docked: the player places
        await frame();
        place(s.g().world, 'large_plot', ...LESSON_PLACES.largePlot);
        s.g().ui.afterCommand({ kind: 'building', result: { ok: true }, text: 'Large plot placed', undoable: true });   // what the placing bar's Place does (src/ui/placement.js confirm)
        await frame();
        expect(s.root.querySelector('#lesson').dataset.step).toBe('well');                    // Version 8.1 (ruling 1202): the Large plot ends the Homes chapter
        const card = cardOf(s);
        expect(Boolean(card)).toBe(true);
        const toasts = [...s.root.querySelectorAll('#toasts .toast')];
        expect([toasts.length, s.root.querySelector('#toasts .toast .action')]).toEqual([0, null]);   // the toast is held back, and with it the Undo
        for (const t of toasts) expect(overlaps(rect(card), rect(t))).toBe(false);
        const stage = rect(s.root), c = rect(card);   // (the test shell is parked off-screen: positions are read from its own corner)
        expect([c.left >= stage.left, c.right <= stage.right, c.top >= stage.top, c.bottom <= stage.bottom]).toEqual([true, true, true, true]);
      } finally { s.cleanup(); }
    });
  }

  it('a timed toast that is up when a card comes up goes with it, and a toast asked for while the card is up is not shown', async () => {
    const s = await pageAt('largeplot');
    try {
      s.root.querySelector('.lesson-card .lc-go').click();
      await frame();
      s.g().ui.toasts.show('Road laid', { action: 'Undo' });
      expect(s.root.querySelectorAll('#toasts .toast').length).toBe(1);
      LESSON_SCRIPT.largeplot(s.g().world, s.io);                                           // the step is done: the next card comes up
      await frame();
      expect([Boolean(cardOf(s)), s.root.querySelectorAll('#toasts .toast').length]).toEqual([true, 0]);
      expect(s.g().ui.toasts.show('Well placed')).toBe(null);
      s.root.querySelector('.lesson-card .lc-go').click();                                  // the card closes: toasts show again
      expect(s.g().ui.toasts.show('Well placed')).toBeTruthy();
    } finally { s.cleanup(); }
  });

  it('a placement part-way through a step (not the one that finishes it) still offers its Undo and its close button', async () => {
    const s = await pageAt('workers');
    try {
      s.root.querySelector('.lesson-card .lc-go').click();
      await frame();
      s.g().ui.afterCommand({ kind: 'building', result: { ok: true }, text: 'Plots placed', undoable: true });
      const t = s.root.querySelector('#toasts .toast');
      expect([Boolean(t), t && t.querySelector('.action').textContent, Boolean(t && t.querySelector('.close'))]).toEqual([true, 'Undo', true]);
    } finally { s.cleanup(); }
  });
});

describe('v711 toast: a card waits while the player is in the middle of the step\'s action', () => {
  it('with a road or plot stroke drawn and not laid, the next card does not come up; it comes up when that ends, and not twice', async () => {
    const s = await pageAt('largeplot');
    try {
      s.root.querySelector('.lesson-card .lc-go').click();
      await frame();
      s.g().ui.store.set({ line: { x0: 15, y0: 36, x1: 16, y1: 36, flip: false } });          // a stroke drawn, not yet laid
      LESSON_SCRIPT.largeplot(s.g().world, s.io);                                           // the step is finished meanwhile
      await frame();
      expect([s.root.querySelector('#lesson').dataset.step, Boolean(cardOf(s))]).toEqual(['well', false]);   // the row shows the step; no card over the stroke
      s.g().ui.store.set({ line: null });
      await frame();
      expect(Boolean(cardOf(s))).toBe(true);
      s.root.querySelector('.lesson-card .lc-go').click();                                  // docked: it does not come back by itself
      await frame(); await frame();
      expect(Boolean(cardOf(s))).toBe(false);
    } finally { s.cleanup(); }
  });
  it('a finger down on the map holds the card until it is lifted', async () => {
    const s = await pageAt('largeplot');
    try {
      s.root.querySelector('.lesson-card .lc-go').click();
      await frame();
      const map = s.root.querySelector('#map');
      fire(map, 'pointerdown', { pointerId: 4, pointerType: 'touch' });
      LESSON_SCRIPT.largeplot(s.g().world, s.io);
      await frame();
      expect(Boolean(cardOf(s))).toBe(false);
      fire(map, 'pointerup', { pointerId: 4, pointerType: 'touch' });
      await frame();
      expect(Boolean(cardOf(s))).toBe(true);
    } finally { s.cleanup(); }
  });
});

describe('v711 toast: a lesson card puts the placing tool away', () => {
  it('after the large plot is laid (its Show me tool still on), the firehouse card opens with no tool mode and no confirm bar, so no refusal shows behind it', async () => {
    const s = await pageAt('largeplot');
    try {
      s.root.querySelector('.lesson-card .lc-go').click();                                  // Show me: the large plot tool comes on at its place
      await frame();
      expect(s.g().ui.store.get().mode).toBe('placing');
      place(s.g().world, 'large_plot', ...LESSON_PLACES.largePlot);
      s.g().ui.afterCommand({ kind: 'building', result: { ok: true }, text: 'Large plot placed', undoable: true });
      await frame();
      expect(Boolean(cardOf(s))).toBe(true);
      const st = s.g().ui.store.get();
      expect([st.mode, st.tool, st.ghost]).toEqual(['browse', null, null]);
      const bar = s.root.querySelector('#confirm');
      expect([bar.hidden || bar.offsetParent === null || bar.getClientRects().length === 0, /Can't place/.test(bar.textContent) && bar.getClientRects().length > 0]).toEqual([true, false]);
      s.root.querySelector('.lesson-card .lc-go').click();                                  // the next step's Show me starts its own tool afresh
      await frame();
      expect(s.g().ui.store.get().mode).toBe('placing');
    } finally { s.cleanup(); }
  });
});
